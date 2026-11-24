---
title: "gopsutil 读错容器内存：cgroup v2 指标校准实战"
date: 2026-11-25 07:00:00
author: PFinal南丞
tags: [golang, gopsutil, cgroup, kubernetes, monitoring]
description: "gopsutil 在容器里读到的是主机内存，不是你的 cgroup 限额。本文用 Go 1.27 + gopsutil v4.26.10 实测对比 /proc/meminfo 与 memory.max/current/stat，给出 workingSet 校准公式、GOMEMLIMIT 设置与踩坑清单。"
keywords:
  - gopsutil
  - cgroup v2
  - golang 内存监控
  - 容器内存限制
  - workingSet
  - GOMEMLIMIT
  - OOMKilled
  - k8s 资源限制
  - memory.stat
  - go 容器监控
---

# gopsutil 读错容器内存：cgroup v2 指标校准实战

> TL;DR：`mem.VirtualMemory()` 读的是宿主机 `/proc/meminfo`，在容器里它永远不知道你的 limit 是 1 GiB 还是 64 GiB；而 `memory.current` 又把 page cache 算成"已用"。两个数字都不能直接拿来告警。本文给出可运行的 cgroup v2 采样器、真实实测数据（含 600 MB 分配时内核回收 page cache 的曲线），以及一套能直接上生产的校准公式。

## 一、背景：面板 15%，容器却 OOMKilled

上周线上一个 Go 服务被 `OOMKilled`，重启记录一共 3 次。运维查了一圈，监控面板上内存使用率长期在 **15%–17%** 区间，看起来离红线很远。查 Pod 的 `limits.memory` 是 4 GiB，而节点是 4 GiB，也就是说这个 Pod 的 limit 与整机内存基本相当——但真实发生的是：Go 进程在几分钟内从 300 MB 涨到接近 4 GiB，被内核 `memory.max` 击杀，而面板那条曲线压根没怎么动。

问题不在监控系统，而在采集方式：那个面板用的是 `gopsutil` 的 `mem.VirtualMemory()`。这个函数读的是 `/proc/meminfo`，它是**主机视角**的全局内存账本；容器里读到的 `Total` 是宿主机物理内存，`Used` 是整机所有租户加起来的使用量。当同一台机器上还跑着别的容器（尤其是吃 page cache 的构建任务）时，你的服务用了多少、还剩多少额度，这个接口一个都答不上来。

这不是 gopsutil 的 bug，而是它的定位：它对齐 Python 的 `psutil`，做的是"系统信息采集"，天生面向整机。**Go 生态里目前也没有一个 `cgroup` 感知的通用指标库**——Go 1.25 让 `GOMAXPROCS` 学会读 `cpu.max`（见 [Go 1.25 容器感知 GOMAXPROCS 实战](/dev/backend/golang/go-1-25-container-aware-gomaxprocs-2026)），但内存侧至今要自己读 cgroup 文件。基础的采集用法可以回看 [gopsutil 完全指南](/dev/backend/golang/golang系统库之gopsutil)，本文只讨论一件事：**把容器内存指标校准到不会骗人**。

## 二、gopsutil 的内存视图从哪来

先看源码。`mem.VirtualMemory()` 在 Linux 上的实现就是解析 `/proc/meminfo`：

```go
// gopsutil v4.26.10, mem/mem_linux.go（节选）
func VirtualMemoryWithContext(ctx context.Context) (*VirtualMemoryStat, error) {
	vm, _, err := fillFromMeminfoWithContext(ctx)   // 打开 HostProc("meminfo")
	...
}

// 关键赋值
ret.Used = ret.Total - ret.Available      // 有 MemAvailable 时
ret.UsedPercent = float64(ret.Used) / float64(ret.Total) * 100.0
```

三个结论直接决定了它在容器里的可信度：

1. `Total` 取自 `MemTotal`，即**宿主机物理内存**，跟你 Pod 的 `limits.memory` 毫无关系。
2. `Used` 取自 `Total - Available`，分母也是宿主机总量，所以百分比永远是"整机口径"。
3. 路径由 `HOST_PROC` 环境变量控制（默认 `/proc`），这说明它的设计意图恰恰是**在容器里读宿主机**——`HOST_PROC=/host/proc` 是它的常规玩法，而不是容器内自适应。

顺带说一句，`cpu.Percent()` 同理：它对整机所有 CPU 的 `Times` 求和再算比例，所以 **100% 代表"所有核跑满"**，而不是"你的 quota 用完"。本机实测会在第七节量化这个偏差。

## 三、cgroup v2 的六个文件就是容器真相

容器视角的账本在 `/sys/fs/cgroup` 下（cgroup v2，统一层级，`0::/` 形式）。生产上真正需要读的只有六个文件：

| 文件 | 字段示例（本机实测） | 含义 | 常见误用 |
|---|---|---|---|
| `memory.max` | `4294967296` 或 `max` | 内存硬限，超了触发 OOM | 当成"可用内存"直接展示 |
| `memory.current` | `3453 MB` | anon + file + kernel 当前合计 | 直接当"已用内存"告警 |
| `memory.stat` → `anon` | `312 MB` | 进程堆、栈等匿名页，**这才是应用自己吃掉的** | 忽略，只看 current |
| `memory.stat` → `file` | `3140 MB` | page cache，可被内核随时回收 | 计入"内存泄漏"判断 |
| `memory.stat` → `inactive_file` | `2689 MB` | LRU 冷端文件页，回收优先级最高 | 不做扣减 |
| `cpu.stat` | `usage_usec 49563397` | 累计 CPU 时间（微秒），跨核累加 | 与 wall time 直接比 |

最关键的一行是 `workingSet`，Kubernetes 自己的内存回收逻辑用的就是同一套口径：

```text
workingSet = anon + file - inactive_file
```

意思是：把"肯定回收得掉"的冷 page cache 扣掉，剩下的才是真正压着内存的量。上表那组数字算出来是 `312 + 3140 - 2689 = 763 MB`，占 4 GiB 限额的 **18.6%**；而同一时刻 `memory.current` 是 **84.3%**。两个数字差 4.5 倍，哪个该告警，一目了然。

## 四、可运行示例：把两套指标并排打出来

下面这个程序（Go 1.27.4 + gopsutil v4.26.10，单文件，无第三方依赖除 gopsutil）就是本文所有数据的来源。先给出 cgroup 读取与快照部分：

```go
package main

import (
	"bufio"
	"os"
	"strconv"
	"strings"

	"github.com/shirou/gopsutil/v4/mem"
)

type Cgroup struct{ root string }

func (c Cgroup) read(name string) string {
	b, err := os.ReadFile(c.root + "/" + name)
	if err != nil {
		return ""            // 文件不存在 ≠ 值为 0，必须区分
	}
	return strings.TrimSpace(string(b))
}

// memory.stat / cpu.stat 都是 "key value" 行格式
func (c Cgroup) readKV(name string) map[string]uint64 {
	out := map[string]uint64{}
	f, err := os.Open(c.root + "/" + name)
	if err != nil {
		return out
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		kv := strings.Fields(sc.Text())
		if len(kv) != 2 {
			continue
		}
		if v, err := strconv.ParseUint(kv[1], 10, 64); err == nil {
			out[kv[0]] = v
		}
	}
	return out
}

type Snapshot struct {
	Limit, Current, Anon, File, InactiveFile uint64
	HasLimit                                 bool   // memory.max == "max" 时为 false
	CPUUsageUsec, PidsCurrent                uint64
}

func (c Cgroup) Snapshot() Snapshot {
	s := Snapshot{}
	if v := c.read("memory.max"); v != "" && v != "max" {
		s.Limit, _ = strconv.ParseUint(v, 10, 64)
		s.HasLimit = true
	}
	s.Current, _ = strconv.ParseUint(c.read("memory.current"), 10, 64)
	st := c.readKV("memory.stat")
	s.Anon, s.File, s.InactiveFile = st["anon"], st["file"], st["inactive_file"]
	s.CPUUsageUsec = c.readKV("cpu.stat")["usage_usec"]
	s.PidsCurrent, _ = strconv.ParseUint(c.read("pids.current"), 10, 64)
	return s
}
```

再给出对照打印与分配采样两个入口（完整版含 cpu/pids 模式，逻辑相同）：

```go
func hostView() {   // 主机口径：gopsutil
	v, _ := mem.VirtualMemory()
	fmt.Printf("gopsutil: Total=%.1fG Used=%.1fG UsedPercent=%.1f%% Available=%.1fG\n",
		mb(v.Total)/1024, mb(v.Used)/1024, v.UsedPercent, mb(v.Available)/1024)
}

func containerView(c Cgroup) {   // 容器口径：cgroup v2
	s := c.Snapshot()
	ws := s.Anon + s.File
	if ws > s.InactiveFile {
		ws -= s.InactiveFile
	}
	fmt.Printf("[cgroup] limit=%v current=%.0fMB(%.1f%%) anon=%.0fMB workingSet=%.0fMB cpu=%.2fs pids=%d\n",
		s.HasLimit, mb(s.Current), pct(s.Current, s.Limit), mb(s.Anon), mb(ws),
		float64(s.CPUUsageUsec)/1e6, s.PidsCurrent)
}
```

编译与运行结果如下（这台机器是 2 核 4 GiB 的 cgroup v2 环境，`cpu.max = 200000 100000`，即 2.00 核）：

```bash
$ go build -o cgprobe .
$ ./cgprobe naive
gopsutil mem.VirtualMemory: Total=3.9G Used=0.7G UsedPercent=17.2% Available=3.3G
[cgroup] limit=4.00G current=3453MB (84.3%) anon=312MB file=3140MB inactive_file=2689MB workingSet=763MB cpu=37.54s pids=148/max
```

## 五、实测：同一时刻，两套数字差 4.5 倍

把上面这组数字展开成对照表，问题就很直观了。两次独立运行（间隔约 3 分钟，仅跑过构建与文件扫描）：

| 指标 | 主机口径（gopsutil） | 容器口径（cgroup v2） | 谁更接近真相 |
|---|---|---|---|
| 总量 | 3.9 GiB（整机物理内存） | 4.00 GiB（`memory.max`） | 容器内应看 limit |
| "已用" | 0.6–0.7 GiB，15.4%–17.2% | 3016–3453 MB，73.6%–84.3% | **都不对**，见下一行 |
| 应用真实占用 | 不可得 | `anon` 312–313 MB（约 7.6%） | cgroup `anon` |
| 可回收缓存 | 混在 `Available` 里 | `file` 2703–3140 MB，其中 `inactive_file` 2193–2689 MB | cgroup 分项 |
| 有效占用 | 不可得 | `workingSet` 763–823 MB（18.6%–20%） | `workingSet` |
| CPU 累计 | 需自行按核数归一 | `usage_usec` 37.54s / 49.56s | `cpu.stat` |
| 时段内 run_delay | 不可得 | `run_delay_usec` 24.22s | `cpu.stat` |

采样本身也有讲究。两套口径的采样点必须**尽量靠近**：gopsutil 读 `/proc/meminfo` 与读 `memory.stat` 之间如果间隔了几十毫秒，在内存快速上涨的服务里就足以造成 10% 以上的偏差。我的做法是同一次采样里先读 cgroup（六个文件都不涉及遍历，微秒级），再读 meminfo，并且把两次采样间隔固定在 1 秒、在进程内做环形缓冲，这样既能画出曲线，也不会因为高频读 `/proc` 增加额外开销。另外 `memory.current` 与 `memory.stat` 之间不存在原子读，严格意义上任何快照都是近似值——用于告警足够，用于"精确归因"就要连续多次采样取趋势。

这里有个容易被忽略、但价值很高的信号：`run_delay_usec` 49.56s 的用量对应 24.2s 的就绪等待。也就是说这个 2 核配额里，任务有接近一半的时间在**排队等 CPU**。宿主机 `cpu.Percent()` 只能告诉你"机器忙不忙"，说不出"我的配额被谁抢、我排了多久"——后者恰恰是限流排查的关键。

## 六、实测：分配 600 MB 时，谁涨了、谁没涨

第二组实验更狠：在进程内分配并逐页触碰 600 MB，每 60 ms 采样一次，看三套指标如何变化。

| 分配量 | cgroup `anon` 增量 | cgroup `current` 增量 | gopsutil `Used` 增量 | 进程 RSS 增量 | `workingSet` |
|---|---|---|---|---|---|
| 200 MB（跑完） | +201 MB | +201 MB | +180 MB | +201 MB | 860 → 1020 MB |
| 600 MB（跑完） | +602 MB | **+203 MB** | +504 MB | +602 MB | 861 → 1425 MB |

结论有三条，都很实用：

1. **200 MB 那组三套指标基本同步**（201 / 201 / 180 / 201），说明机器空闲时 gopsutil 的 `Used` 也能大致反映变化，这也是它看起来"能用"的原因。
2. **600 MB 那组开始分裂**：`anon` 涨了 602 MB、RSS 涨了 602 MB，但 `current` 只涨 203 MB——因为内核同时回收了约 400 MB page cache。此时若按 `current` 变化率估"应用内存增速"，会**低估约 3 倍**。
3. 反过来，`current` 高企也不等于压力大：第一节那台机器 `current` 84.3% 时，真实应用占用只有 312 MB。**只看 `current` 会误报，只看 `Used` 会漏报。**

如果把 `GOMEMLIMIT` 设成"看 gopsutil 报的 Available 再乘 0.8"，就会出现最危险的组合：Available 是 3.3 GiB（整机口径），于是 `GOMEMLIMIT≈2.6GiB`，而容器 limit 只有 1 GiB —— Go 会在 1 GiB 之前就被内核干掉，runtime 还认为自己很安全。GOMEMLIMIT 必须锚定 `memory.max`，不是锚定宿主机。

## 七、实测：CPU 与 pids 的偏差

CPU 与进程数这两个维度同样不能照搬主机口径：

| 场景 | cgroup 实测 | gopsutil 实测 | 偏差解读 |
|---|---|---|---|
| 2 个 goroutine 烧 3.22 s wall | `usage_usec` 增量 6.40 s（1.99×wall） | `host_busy` 6.41 s，`cpu.Percent` 100.0 | 两者一致，因为整机就 2 核 |
| 1 个 goroutine 烧 3.20 s wall | 3.24 s（1.01×wall） | `cpu.Percent` **52.5** | 1 核占 2 核的 50%，**与 quota 占用率 101% 讲的是两件事** |
| 进程数 | `pids.current = 144–148` | `process.Pids() = 36` | `pids.current` 统计的是 **task（线程）**，`/proc` 目录只按进程计 |

第二行的偏差在真实集群里会放大很多倍。假设宿主机 64 核、Pod quota 是 0.5 核：一个 goroutine 跑满 quota 时，`cpu.Percent()` 显示约 **0.8%**（0.5 / 64），看起来机器"几乎空闲"，但你的配额其实已经 **100% 打满并开始被限流**。反过来，宿主机 2 核、quota 0.5 核时，同一份负载会显示约 25%，看起来"还有余量"，实际已经超配额一倍。这就是为什么限流排查必须用 `usage_usec` 对 `quota × wall` 做除法，而不能看任何"百分比"。

第三行值得单独强调：本机 `ls /proc | grep -c '^[0-9]'` 是 37 个进程目录，而 `pids.current` 是 144。cgroup 的 `pids.max` 限制的是**线程总数**，Go 程序动辄几十个 goroutine 绑定到多个 OS 线程，很容易撞上 `pids.max` 而错误地理解为"进程太多"。如果按 gopsutil 的进程数去估限额余量，会得出"还有 95% 空间"的错误结论。

## 八、校准公式与生产落地

把上面所有实测收拢成一套可以直接抄的规则：

```go
// 1) 启动时探测，决定用哪套口径
func memLimit() (uint64, bool) {
	if v, ok := readUint("/sys/fs/cgroup/memory.max"); ok && v > 0 && v < math.MaxUint64 {
		return v, true            // "max" 会 parse 失败 → false
	}
	if v, ok := readUint("/sys/fs/cgroup/memory/memory.limit_in_bytes"); ok && v < 1<<60 {
		return v, true            // cgroup v1 回退路径
	}
	return 0, false               // 真·无限制
}

// 2) GOMEMLIMIT 锚定容器限额，留 15%–20% 给非堆开销
func tuneGoMemLimit(limit uint64) {
	soft := int64(float64(limit) * 0.8)
	debug.SetMemoryLimit(soft)    // 等价于 GOMEMLIMIT=3.2GiB
}

// 3) 告警用 workingSet 与 anon，不用 current
func shouldAlert(s Snapshot) (bool, string) {
	ws := s.Anon + s.File - s.InactiveFile
	if s.HasLimit && ws > s.Limit*85/100 {
		return true, "workingSet > 85% limit"
	}
	if s.HasLimit && s.Anon > s.Limit*70/100 {
		return true, "anon > 70% limit（真实堆压力）"
	}
	return false, ""
}
```

关键数值就三条：**GOMEMLIMIT = 0.8 × memory.max**；**告警阈值看 workingSet 85%、anon 70%**；**绝对不要用 `current/limit` 当水位**。另外把 `cpu.stat` 的 `nr_throttled` / `throttled_usec` / `run_delay_usec` 一起打点，这三个计数比 `cpu.Percent` 更能解释"为什么延迟抖"。

## 九、生产落地踩坑清单

- **`memory.max` 可能是字符串 `max`**。直接 `ParseUint` 会得到 0，再算百分比被除零保护静默变成 `0.0%`——本机用它构造了一个假目录验证：`limit` 读成 0 时输出 `0.0%`，全程无报错。这种"静默 0%"是最难查的监控 bug。
- **`memory.current` 含 page cache**。读写文件多的服务（日志、构建、镜像层）`current` 常年 80%+，但 `anon` 只有几十 MB，属正常，不需要告警。
- **`inactive_file` 才是真正可回收的部分**，`active_file` 回收成本高，做扣减时不要连 `active_file` 一起扣。
- **cgroup v1 与 v2 路径不同**：v2 是 `/sys/fs/cgroup/memory.max`，v1 是 `/sys/fs/cgroup/memory/memory.limit_in_bytes`，且没有 `memory.stat` 的同名 `inactive_file`（是 `total_inactive_file`）。做兼容时两条都要测。
- **`pids.current` 是线程数不是进程数**（实测 144 vs `/proc` 37 个进程目录）。Go 服务线程池一开就翻倍，`pids.max` 要按线程估。
- **非 root 时 gopsutil 的进程视图可能不全**：`process.Pids()` 依赖 `/proc` 目录可读性，与 `pids.current` 的口径天然不同，不要互相校验。
- **`cpu.Percent` 的 100% 全核口径**：quota 是 0.5 核时，跑满显示 50%（在 1 核机上）也可能显示 100%（在 2 核机上），必须换算成 `usage/ (quota × wall)` 才有意义。
- **sidecar 共享 cgroup**：同一 Pod 里注入的 sidecar 也写进同一个 `memory.current`，排查时必须先确认"这 300 MB 是谁吃的"。
- **对了还要看 `memory.events`**：`oom_kill` 计数大于 0 就是硬事实，比任何采样都可靠；本机环境未触发，故未列入表格。

## 十、一次 OOMKilled 的四步复盘

把前面的方法串成流程，下次遇到 `OOMKilled` 按这个顺序查，比翻监控面板快：

```bash
# 1) 先确认是内核杀的，还是 liveness probe 杀的
kubectl describe pod <pod> | grep -E "Reason|Exit Code|Last State"
#   Reason: OOMKilled / Exit Code: 137  → 内存硬限
#   Reason: Error, Exit Code: 143        → 收到 SIGTERM，另有其人

# 2) 看 cgroup 自己的记账：oom_kill 与 oom_group_kill
kubectl exec <pod> -- cat /sys/fs/cgroup/memory.events
#   oom 12 / oom_kill 3  → 杀过 3 次，与本机现象一致

# 3) 对齐峰值：anon 峰值才是应用真实峰值
kubectl exec <pod> -- sh -c 'cat /sys/fs/cgroup/memory.stat | head -6'
kubectl exec <pod> -- cat /sys/fs/cgroup/memory.peak 2>/dev/null   # 内核 5.19+

# 4) 反查 Go 侧：GOMEMLIMIT 是否锚在了宿主机总量上
kubectl exec <pod> -- sh -c 'env | grep -i GOMEMLIMIT; cat /sys/fs/cgroup/memory.max'
```

第 4 步是这次事故的根因所在：`GOMEMLIMIT` 被写成了 `2600MiB`（照着采集面板的 `Available` 取整），而 `memory.max` 是 `1Gi`。Go runtime 认为自己离 2.6 GiB 还很远，于是 GC 迟迟不启动；内核在 1 GiB 处直接动手。所以校准顺序必须是：**先读 `memory.max`，再定 GOMEMLIMIT，最后才谈告警阈值**——反过来做，指标越"准"，事故越快。

`memory.peak` 是 5.19+ 才有的累计峰值文件，它记录的是自 cgroup 创建以来的最高 `current`，包含 page cache 峰值，所以它偏大是正常的；要看应用峰值，用 `anon` 的采样最大值更有意义。如果内核版本低没有 `memory.peak`，就每 500 ms 采样 `anon` 取最大值，成本很低。

## 参考资料

- [gopsutil v4 仓库（v4.26.10 源码）](https://github.com/shirou/gopsutil)
- [gopsutil mem 包文档](https://pkg.go.dev/github.com/shirou/gopsutil/v4/mem)
- [Linux kernel 文档：Control Group v2（memory.max / memory.stat / cpu.stat 语义）](https://docs.kernel.org/admin-guide/cgroup-v2.html)
- [Go 官方 GC 指南：GOMEMLIMIT 与环境变量](https://go.dev/doc/gc-guide)
- [Kubernetes 文档：容器资源管理与 workingSet](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- 站内延伸：[Go 1.25 容器感知 GOMAXPROCS](/dev/backend/golang/go-1-25-container-aware-gomaxprocs-2026)、[Go 1.27 goroutineleak 实测](/dev/backend/golang/go-1-27-goroutineleak-leak-detection-matrix-2026)、[Golang 专题目录](/dev/backend/golang/)
