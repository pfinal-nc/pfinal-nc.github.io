---
title: "Lesson 1.2: 并发编程核心"
description: "掌握 Goroutine、Channel、select 和 Context 的核心机制与最佳实践"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, concurrency, goroutine, channel, lesson]
---

# Lesson 1.2: 并发编程核心

## 学习目标

- 理解 Goroutine 的调度机制（GMP 模型）
- 掌握 Channel 的使用模式与最佳实践
- 熟练使用 select 处理多路复用
- 正确使用 Context 进行取消和超时控制

---

## 1. Goroutine 与 GMP 模型

Go 的并发模型基于 **GMP**（Goroutine-Machine-Processor）调度器：

| 组件 | 说明 |
|------|------|
| **G (Goroutine)** | 轻量级线程，栈初始 4KB，可动态扩展 |
| **M (Machine)** | 操作系统线程，与内核线程 1:1 映射 |
| **P (Processor)** | 逻辑处理器，默认 `GOMAXPROCS` 个，运行队列 |

**调度机制：**

```
M1 (系统线程) ↔ P1 (逻辑处理器) ↔ [G1, G2, G3, ...] (运行队列)
                                   ↕ (全局队列)
M2 (系统线程) ↔ P2 (逻辑处理器) ↔ [G4, G5, ...]
```

- Goroutine 创建开销约 **4KB**（vs OS 线程 ~2MB）
- 创建 10 万个 Goroutine 完全可行
- 发生系统调用时，P 会自动转移给其他 M

```go
func main() {
    // 设置逻辑处理器数量
    runtime.GOMAXPROCS(runtime.NumCPU())

    // 启动 Goroutine
    go func() {
        fmt.Println("Hello from goroutine")
    }()

    time.Sleep(time.Millisecond) // 等待协程执行
}
```

---

## 2. Channel 使用模式

### 基本操作

```go
ch := make(chan int)       // 无缓冲 Channel（同步）
bufCh := make(chan int, 5) // 有缓冲 Channel（异步）

ch <- 42  // 发送
val := <-ch // 接收
close(ch)   // 关闭（由发送方关闭）
```

### 核心模式

**模式 1：生产者-消费者**

```go
func producer(ch chan<- int) {
    for i := 0; i < 10; i++ {
        ch <- i
    }
    close(ch)
}

func consumer(ch <-chan int) {
    for val := range ch {  // 自动处理关闭
        fmt.Println(val)
    }
}
```

**模式 2：工作池（Worker Pool）**

```go
func worker(id int, jobs <-chan int, results chan<- int) {
    for job := range jobs {
        results <- job * 2
    }
}

func main() {
    jobs := make(chan int, 100)
    results := make(chan int, 100)

    // 启动 3 个 worker
    for w := 1; w <= 3; w++ {
        go worker(w, jobs, results)
    }

    // 发送任务
    for j := 1; j <= 9; j++ {
        jobs <- j
    }
    close(jobs)
}
```

**模式 3：管道（Pipeline）**

```go
func gen(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        for _, n := range nums {
            out <- n
        }
        close(out)
    }()
    return out
}

func sq(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            out <- n * n
        }
        close(out)
    }()
    return out
}
```

---

## 3. select 多路复用

`select` 同时等待多个 Channel 操作：

```go
func main() {
    ch1 := make(chan string)
    ch2 := make(chan string)

    go func() {
        time.Sleep(1 * time.Second)
        ch1 <- "one"
    }()
    go func() {
        time.Sleep(2 * time.Second)
        ch2 <- "two"
    }()

    select {
    case msg := <-ch1:
        fmt.Println("Received from ch1:", msg)
    case msg := <-ch2:
        fmt.Println("Received from ch2:", msg)
    case <-time.After(3 * time.Second):
        fmt.Println("Timeout")
    }
}
```

**select 的常见用法：**

| 用法 | 代码 | 说明 |
|------|------|------|
| 非阻塞发送/接收 | `default:` 分支 | 尝试操作，失败不阻塞 |
| 超时控制 | `time.After` | 等待超时 |
| 取消等待 | `<-ctx.Done()` | 优先处理取消信号 |
| 随机选择 | 无特殊处理 | 多个 case 同时就绪时随机执行 |

---

## 4. Context

`context.Context` 是 Go 并发中的核心接口，用于传递取消信号和请求范围的值：

```go
type Context interface {
    Deadline() (deadline time.Time, ok bool)
    Done() <-chan struct{}
    Err() error
    Value(key any) any
}
```

### 创建 Context

```go
// 根 Context
ctx := context.Background()

// 可取消
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

// 超时
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

// 截止时间
ctx, cancel := context.WithDeadline(context.Background(), time.Now().Add(5*time.Second))
defer cancel()

// 传值
ctx := context.WithValue(context.Background(), "key", "value")
```

### 实战：带超时的 HTTP 请求

```go
func fetchWithTimeout(url string, timeout time.Duration) (*http.Response, error) {
    ctx, cancel := context.WithTimeout(context.Background(), timeout)
    defer cancel()

    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, err
    }

    return http.DefaultClient.Do(req)
}
```

---

## 5. 并发安全原则

### 不要通过共享内存来通信，而要通过通信来共享内存

```go
// ❌ 错误：共享内存 + 互斥锁
type Counter struct {
    mu    sync.Mutex
    value int
}

func (c *Counter) Incr() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.value++
}

// ✅ 正确：通过 Channel 通信
type Counter struct {
    value int
}

func (c *Counter) Run() <-chan int {
    out := make(chan int)
    go func() {
        for i := 0; i < 100; i++ {
            c.value++
            out <- c.value
        }
        close(out)
    }()
    return out
}
```

### 相关文章推荐

- [Go 语言并发模式实战指南](/thinking/method/Go-Concurrency-Patterns-Guide)
- [深入理解 Go Channel 批量读取与实际应用](/dev/backend/golang/Go-Channel-Batch-Read)
- [go-channel-guide](/dev/backend/golang/go-channel-guide)

---

## 练习

1. 用 select + context.WithTimeout 实现一个「超时优先」模式：两个 Goroutine 并发查询同一数据，使用最快的那个结果，另一个超时取消。

2. 实现一个简单的扇出（Fan-Out）模式：一个生产者向 3 个 worker 分发任务，每个 worker 处理完毕后将结果发送到同一个结果 Channel。

3. 阅读 [go-context-guide](/dev/backend/golang/go-context-guide) 和 [go-goroutine-intro](/dev/backend/golang/go-goroutine-intro) 加深理解。
