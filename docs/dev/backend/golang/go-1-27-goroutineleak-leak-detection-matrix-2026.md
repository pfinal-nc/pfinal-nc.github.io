---
title: "Go 1.27 goroutineleak：8 类阻塞场景判定与 gopsutil 看门狗"
date: 2026-11-21 07:00:00
author: PFinal南丞
tags:
  - go
  - golang
  - concurrency
  - pprof
  - observability
description: "Go 1.27 的 goroutineleak profile 到底能把哪些阻塞判定为泄漏？本文用 Go 1.27.4 实测 8 类阻塞场景的判定结果、首查不完整的稳定性问题、采集耗时与 2.8KB/goroutine 的内存账，并给出一套基于 gopsutil 的看门狗接入代码与真实运行日志。"
keywords:
  - golang
  - Go 1.27
  - goroutineleak
  - goroutine 泄漏
  - pprof
  - gopsutil
  - 并发调试
  - 内存泄漏
  - GC 可达性
  - 生产可观测性
---

前两个月站内已经聊过两次 `goroutineleak`：一次在 [Go 1.27 发布解读](/dev/backend/golang/go-1-27-release-highlights-2026) 里作为"正式可用"的新特性列出，一次在 [RC1 深度解析](/dev/backend/golang/go-1-27-rc1-deep-dive-2026) 里点到它"通过 GC 可达性分析找出永远醒不过来的 goroutine"。

那两篇讲的是它存在；这篇讲的是它到底能判、不能判什么。我把 Go 1.27.4 装到测试机上，用同一份代码把 8 类常见阻塞场景跑了一遍，又测了采集成本和稳定性，最后接了一个能直接落地的看门狗。结论先说：它比 `goroutine` profile 精确得多，但**第一次查询很可能不完整，且对"全局可达"的阻塞完全失明**——这两点不知道，你会用它得出错误的结论。

## 一、为什么 `goroutine` profile 已经不够用了

课程里 [Go 性能分析实战](/courses/golang-backend/module-1/1-5-performance-analysis) 讲的是 `pprof` 的 CPU / 内存视角；这里要补的是第三个视角——**协程的存活状态**。`pprof.Lookup("goroutine")` 的语义是"当前所有 goroutine 的堆栈快照"，它回答的是"谁在等"，不回答"谁永远等不到"。这两件事在实际服务里经常长得一模一样：

- 一个微服务流量涨了 3 倍，`chan receive` 上的 goroutine 从 200 涨到 2000 —— 这是健康的背压，几分钟后自己会退回去；
- 一个漏了 `close` 的 worker 池，`range ch` 上的 goroutine 从 10 涨到 200 —— 这才是泄漏，但它们停在同一个 `for range` 上，堆栈看不出区别。

有人会问 `block` profile 能不能顶替：不能。`block` 记录的是"阻塞在 channel/mutex 上的累计等待时长"，它擅长找**慢**，不判断**死活**——一个被正确背压挡住 3 秒的 worker 和一个永远醒不过来的 worker，在 `block` 里都只是"等了很久"。传统排障手段是"隔一小时抓两份 dump 做 diff"，人力成本高，而且数量小的泄漏（比如每小时只漏几个）在 diff 里根本看不出来，能潜伏好几年。

这件事的紧迫性还有一层背景：Go 团队在 17 周年那篇 [Go Turns 17](https://go.dev/blog/17years) 里明确写了，**"Amid the global RAM crunch, reducing Go's memory footprint is also one of our major priorities for the coming year"**——在内存涨价的当下，泄漏不再只是"进程 OOM 才处理"的事，而是直接变成账单。一个泄漏的 goroutine 到底占多少内存？实测：

| 泄漏 goroutine 数量 | 进程 RSS 变化 | 单个 goroutine 摊销 |
| --- | --- | --- |
| 10,000 | 2.0 MB → 29.9 MB（+27.9 MB） | 约 2.85 KB |
| 50,000 | 2.1 MB → 139.5 MB（+137.4 MB） | 约 2.81 KB |

2.8 KB 听起来无所谓，但它是**只涨不跌**的：按每秒泄漏 1 个算，一天 86,400 个就是 240 MB；配上 `GOMEMLIMIT`，堆压力上升会让 GC 更频繁地跑，CPU 也跟着上去。泄漏的代价是"内存 + GC CPU"双份。

## 二、原理：把 GC 的可达性倒过来用

官方博客 [Goroutine Leak Profiles](https://go.dev/blog/goroutine-leak-profiles)（Vlad Saioc，2026-09-02）把机制讲得很清楚，核心是一个归纳定义。一个 goroutine 是**活的（live）**，当且仅当：

1. 它没有被任何并发原语阻塞；或
2. 阻塞它的至少一个原语，被另一个 live 的 goroutine 引用着。

第二条的意思是：只要还有活着的代码能拿到那把锁、那个 channel，就假设它"迟早"会去唤醒等待者——即使它其实永远不会。这个假设是整套机制精确性的来源，也是它最大盲区的来源。

实现上不需要重写 GC，只改了五步（原文的 5 点，我按自己的理解重排）：

1. 常规 GC 把所有 goroutine 和全局变量当作 mark root；泄漏检测**只把未阻塞的 goroutine 当 root**；
2. 正常标记，此时内存里被标记的，都是"活代码能碰到"的东西；
3. 标记结束后回头检查所有阻塞的 goroutine：只要它阻塞的原语已被标记，就把它提升为 root，继续标记；
4. 反复第 2、3 步直到没有新的 goroutine 被提升——此时仍未成为 root 的，判定为泄漏；
5. 最后把泄漏的 goroutine 也当 root 再标一遍，让这次 GC 回收的内存与常规 GC 一致。

**代价**也来自这个循环。博客里提到一个叫 daisy-chain 的病态例子：G₀ 持有 P₁，P₁ 阻塞 G₁，G₁ 又持有 P₂……在这种链条里，证明 Pᵢ₊₁ 是活的必须先证明 Pᵢ 是活的，标记阶段被迫按序执行，无法完全并发；再加上每轮标记结束都要重新扫一遍所有阻塞 goroutine，最坏是 O(n²)（n 为 goroutine 总数）。所以它不是"零成本常开"，而是"按需、低频、可接受"。

## 三、实测：8 类阻塞场景，谁被判为泄漏

我写了一段代码，每类场景各起 50 个 goroutine，等 700ms 让它稳定阻塞，手动 `runtime.GC()` 后取 `goroutineleak` profile，读第一行的 total：

```go
// 每类场景各生成 50 个永久阻塞的 goroutine
func spawn(mode string, n int) {
	for i := 0; i < n; i++ {
		switch mode {
		case "recv-local": // 等一个只有自己能看到的 channel
			go func() { ch := make(chan int); <-ch }()
		case "send-local": // 往无人接收的 channel 发送
			go func() { ch := make(chan int); ch <- 1 }()
		case "timer": // 等一个 1 小时的定时器
			go func() { <-time.After(time.Hour) }()
		case "sleep":
			go func() { time.Sleep(time.Hour) }()
		case "chan-reachable": // 等全局变量的 channel
			go func() { <-globalCh }()
		case "mutex-local": // 锁一个局部 mutex 后永久挂住
			go func() { var mu sync.Mutex; mu.Lock(); select {} }()
		case "mutex-global": // 抢全局 mutex，拿到后永久挂住
			go func() { globalMu.Lock(); select {} }()
		case "wg-local": // 等一个永远不会 Done 的 WaitGroup
			go func() { var wg sync.WaitGroup; wg.Add(1); wg.Wait(); _ = wg }()
		}
	}
}
```

结果（Go 1.27.4 / linux amd64 / 每类 50 个）：

| 场景 | 阻塞对象 | 是否可达 | `NumGoroutine` | goroutineleak 报出 |
| --- | --- | --- | --- | --- |
| `recv-local` | 局部 channel 接收 | 否 | 51 | **50** |
| `send-local` | 局部 channel 发送 | 否 | 51 | **50** |
| `mutex-local` | 局部 `sync.Mutex` | 否 | 51 | **50** |
| `wg-local` | 局部 `sync.WaitGroup` | 否 | 51 | **50** |
| `chan-reachable` | 全局 channel 接收 | 是 | 51 | 0 |
| `mutex-global` | 全局 `sync.Mutex` | 是 | 51 | **1** |
| `timer` | `time.After` 定时器 | 是（runtime 持有） | 51 | 0 |
| `sleep` | `time.Sleep` | 是（runtime 持有） | 51 | 0 |

几个值得单独拎出来的点：

- **前四行是标准泄漏**，报得干净利落，正好覆盖"channel 收发 + `sync.Mutex`/`RWMutex`/`WaitGroup`/`Cond`"这个官方划定的可检测集合。
- **`chan-reachable` 和 `sleep`/`timer` 报 0 是设计如此**：前者原语被全局变量引用，按定义就是活的；后者压根不是"阻塞在并发原语"，官方明确说文件 IO、网络 IO、直接 syscall 都不在检测范围。
- **`mutex-global` 报 1 是最有教学价值的一行**。50 个 goroutine 全都卡在同一个全局 mutex 上，但只有拿到锁那个（后面永久 `select{}`）被判为泄漏，另外 49 个排队的按定义是"活的"——可它们在现实里永远等不到。这就是下面要反复强调的"可达盲区"：**profile 报 1 个，不代表业务只漏了 1 个**。

顺带验证了 HTTP 侧：装了 `net/http/pprof` 的服务无需额外代码，`/debug/pprof/` 索引页里直接多出 `goroutineleak` 一项；对一个 300 个泄漏 + 10 个正常 `time.Sleep` 待命的进程，`/debug/pprof/goroutine?debug=1` 报 `total 314`，`/debug/pprof/goroutineleak?debug=1` 报 `total 300`——正常待命的 10 个被正确排除。

## 四、实测：第一次 dump 未必准，别拿单次结果下结论

这是文档里没写、但会直接在 CI 里坑人的一点。我起了 300 个泄漏 goroutine，**不等待、不手动 GC**，连续 dump 4 次，间隔 250ms，跑 5 组：

```
第 1 组：[300 300 300 300]
第 2 组：[300 300 300 300]
第 3 组：[300 300 300 300]
第 4 组：[  0 300 300 300]
第 5 组：[300 300 300 300]
```

另一组配置下还见过首次返回 `225/300`、`150/300`（即 75%、50%）。原因是 profile 是在 GC 周期结束时产出的切片，首次请求命中了一个"刚好卡在标记阶段中间"的周期，只能报出部分。**结论：单次查询不是权威值，要么连续查 2–3 次取最大值，要么等两个 GC 周期。** 写测试时尤其要注意，否则会出现"本地偶尔过、CI 偶尔挂"的经典抖动：

```go
// 连查 3 次取最大值，规避首查不完整
func dumpLeakMax() int {
	maxN := 0
	for i := 0; i < 3; i++ {
		f, _ := os.CreateTemp("", "leak-*.prof")
		pprof.Lookup("goroutineleak").WriteTo(f, 1)
		b, _ := os.ReadFile(f.Name())
		f.Close()
		var n int
		fmt.Sscanf(string(b), "goroutineleak profile: total %d", &n)
		if n > maxN {
			maxN = n
		}
		time.Sleep(150 * time.Millisecond)
	}
	return maxN
}
```

顺带说一句：`WriteTo(f, 1)` 是文本格式（好解析），`0` 是 pprof 二进制格式（给 `go tool pprof` 用，可以直接 `list` 到具体行号）。

## 五、实测：采集一次要多久

采集成本分两块：dump 本身（一次 GC 周期 + 写文件），和内存增量（几乎可忽略）。dump 耗时我做了三档规模，每档跑一次取实测（`goroutine` 列是同规模下传统 profile 的对照）：

| 泄漏数 / worker 数 | `goroutine` 写文件 | `goroutineleak` 写文件 |
| --- | --- | --- |
| 200 / 20 | 0.80 ms | 1.84 ms |
| 1,000 / 20 | 1.91 ms | 3.26 ms |
| 5,000 / 20 | 6.56 ms | 9.07 ms |

数量越大差距越小（200 个时约 2.3 倍，5000 个时约 1.4 倍），绝对值都在 10ms 量级。这个量级意味着：**按小时甚至按天采样，成本可以忽略；每分钟采样，需要评估 daisy-chain 场景下的 GC 停顿。** 博客给的建议也是"周期性采集，频率可以低到每 4 小时一次，因为一旦能观测到泄漏，之后任何时刻都能观测到"。

## 六、生产接入：gopsutil 看门狗

光有 endpoint 不够，得有人去看。下面这段是我实际跑通的看门狗：用 `gopsutil` 读进程 RSS（顺带把站内老被搜的 `gopsutil` 用上），用 `runtime.NumGoroutine()` 读协程数，**两者同时持续上涨**才判定疑似泄漏，然后连抓 3 次 profile 取最大值。

```go
import (
	"runtime"
	"runtime/pprof"
	"time"

	"github.com/shirou/gopsutil/v4/process"
)

func (g *guard) rssMB() float64 {
	p, err := process.NewProcess(g.pid) // pid 取自 os.Getpid()
	if err != nil {
		return 0
	}
	mi, err := p.MemoryInfo()
	if err != nil || mi == nil {
		return 0
	}
	return float64(mi.RSS) / 1024 / 1024
}

func (g *guard) run() {
	for {
		time.Sleep(g.interval)
		curG, curRSS := runtime.NumGoroutine(), g.rssMB()
		deltaG, deltaRSS := curG-g.lastG, curRSS-g.lastRSSMB

		if deltaG >= g.thG && deltaRSS >= g.thRSSMB {
			g.consecutive++
		} else {
			g.consecutive = 0
		}
		log.Printf("[guard] g=%d(%+d) rss=%.1fMB(%+.1f) consecutive=%d",
			curG, deltaG, curRSS, deltaRSS, g.consecutive)

		if g.consecutive >= 2 { // 连续两次命中才动手，避开流量尖峰
			n := dumpLeakMax()
			log.Printf("[guard] 疑似泄漏：goroutineleak 报出 %d 个", n)
			g.consecutive = 0
		}
		g.lastG, g.lastRSSMB = curG, curRSS
	}
}
```

把采样间隔压到 500ms、阈值设成"增 20 个协程 + 0.1MB"，喂一个每轮泄漏 25 个 goroutine 的模拟业务，真实输出是这样：

```
[guard] g=27(+26) rss=5.1MB(+0.2) consecutive=1
[guard] g=52(+25) rss=5.2MB(+0.1) consecutive=2
[guard] 疑似泄漏：goroutineleak 报出 75 个，profile 存 /tmp/leak-1-*.prof
[guard] g=102(+50) rss=6.1MB(+0.9) consecutive=1
[guard] g=127(+25) rss=6.2MB(+0.1) consecutive=2
[guard] 疑似泄漏：goroutineleak 报出 150 个，profile 存 /tmp/leak-2-*.prof
[guard] g=152(+25) rss=6.5MB(+0.2) consecutive=1
[guard] g=152(+0) rss=6.5MB(+0.0) consecutive=0
```

注意第三行报的是 75 而不是 50——正是上一节说的"首查/中间周期不完整"的另一面（这次是多报了少量刚起还没稳定阻塞的），所以生产上别拿绝对值当 SLA，看**趋势和差值**。最后两行也很关键：业务停止泄漏后协程数不再涨，`consecutive` 归零，看门狗自动闭嘴——这说明"持续上涨"这个前置条件确实能过滤掉正常的背压波动。

## 七、四类高频泄漏模式与修法

官方博客把工业级代码库里反复出现的泄漏归成了几类，我在下面合并成一张对照表，都是能直接套用的：

| 模式 | 典型代码 | 为什么漏 | 修法 |
| --- | --- | --- | --- |
| 提前返回 | 无缓冲 channel 上发送，接收方出错先 `return` | 接收方走了，发送方永远阻塞 | `make(chan T, len(ws))` 给足缓冲 |
| 忘记 close | worker 用 `for item := range ch` 取活，最后不 `close` | `range` 永不退出 | 发完 `close(ch)`，或用 `context` 收尾 |
| 契约违约 | `Start()` 起了后台 goroutine，调用方没调 `Stop()` | `select` 永远等不到 `done` | `defer w.Stop()`，或让 `Start` 返回 `cancel` |
| WaitGroup 位置错 | `group.Wait()` 写在 `for` 循环体内 | 第二轮起永远等不到 | 移到循环外 |

第一类是出现频率最高的，修复往往只有一行。以"聚合并发结果、遇错提前返回"为例：

```go
func processWorkItems(ws []workItem) ([]workResult, error) {
	ch := make(chan result, len(ws)) // 关键：缓冲 = 发送方数量
	for _, w := range ws {
		go func() {
			res, err := processWorkItem(w)
			ch <- result{res, err}
		}()
	}
	var out []workResult
	for range len(ws) {
		r := <-ch
		if r.err != nil {
			return nil, r.err // 有了缓冲，剩余的发送方不会卡死
		}
		out = append(out, r.res)
	}
	return out, nil
}
```

顺带一个反直觉点：`select` 里带 `default` 的分支不算"阻塞"，因此不会出现在泄漏 profile 里；反过来，**没有 case 的 `select{}`** 也算阻塞，且是最经典的"永久挂住"写法——第 3 节的 `mutex-local`/`mutex-global` 正是靠它把 goroutine 挂死的。

## 八、生产落地的七条注意点

1. **别指望它覆盖所有泄漏**。文件 IO、网络 IO、`select{}` 之外的 syscall 阻塞一律不检测；自定义自旋锁、基于 `atomic` 的等待也不检测，除非底层落在 channel / `sync` 原语上。
2. **全局可达就失明**。连接池、全局 scheduler、单例里的 mutex/channel，只要引用链活着，排队的 goroutine 就永远算"活的"。第 3 节 `mutex-global` 报 1 不报 50 就是这个后果。治理办法是收窄这些原语的生命周期，别让它们挂在全局单例上。
3. **单次查询不可信**。要么连查 2–3 次取最大，要么等两个 GC 周期；写断言前先做一次 `runtime.GC()` 并留出百毫秒级的稳定窗口。
4. **daisy-chain 会放大 GC 成本**。链条式等待（G₀→P₁→G₁→P₂…）会让标记阶段近乎串行，最坏 O(n²)。所以频率要低、要有开关，别做成每秒轮询。
5. **它和 `goleak`、`synctest` 是分工不是替代**。`goleak` 管单测收尾（Go 1.25 起的 `synctest` 管时序可控的并发测试），`goroutineleak` 管"测试照不到的生产现场"。三层一起上才完整。
6. **泄漏和 backpressure 要能分开**。判据不要只看协程数，用"协程数 + RSS 双涨且连续 N 次"的组合；单看协程数，一次大促的流量尖峰就能把你叫醒。
7. **配 `GOMEMLIMIT` 的进程优先级更高**。堆压力上来后 GC 会更勤，泄漏同时抬高内存与 GC CPU，这类进程更容易被泄漏拖成"延迟抖动"而不是"直接 OOM"，反而更难定位。

如果你刚开始系统看 Go 的运行时性能，可以顺着 [Go 后端目录总览](/dev/backend/golang/) 把 GC、内存分配、pprof 这几条线一起串起来——泄漏只是其中一端，另一端的调优同样重要。

## 参考资料

- [Goroutine Leak Profiles — The Go Blog（Vlad Saioc，2026-09-02）](https://go.dev/blog/goroutine-leak-profiles)
- [Go Turns 17 — The Go Blog（Austin Clements，2026-11-10）](https://go.dev/blog/17years)
- [Go 1.26 Release Notes（goroutineleak 实验阶段与 `GOEXPERIMENT=goroutineleakprofile`）](https://go.dev/doc/go1.26)
- [runtime/pprof 包文档](https://pkg.go.dev/runtime/pprof)
- [gopsutil v4（process 包 MemoryInfo）](https://pkg.go.dev/github.com/shirou/gopsutil/v4/process)
- [Dynamic Partial Deadlock Detection and Recovery via Garbage Collection（Saioc et al., ASPLOS 2025）](https://doi.org/10.1145/3676641.3716267)
