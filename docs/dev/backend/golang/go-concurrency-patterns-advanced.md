---
title: "Go 并发模式进阶：高级并发编程技巧"
date: 2026-04-22
author: PFinal南丞
description: "深入讲解 Go 语言的高级并发编程模式，包括 Pipeline、Fan-out/Fan-in、Context 控制、错误处理等实战技巧。"
keywords:
  - Go
  - 并发模式
  - Pipeline
  - Fan-out
  - Context
  - 高级并发
tags:
  - Go
  - Concurrency
  - Patterns
  - Advanced
---

# Go 并发模式进阶：高级并发编程技巧

## 概述

Go 语言的并发模型基于 CSP（Communicating Sequential Processes），通过 Goroutine 和 Channel 提供了强大的并发编程能力。本文将介绍一些高级并发模式，帮助你编写更高效、更健壮的并发程序。

## Pipeline 模式

Pipeline（管道）模式将数据处理分解为多个阶段，每个阶段由一组 Goroutine 执行，数据通过 Channel 在阶段之间传递。

### 基本 Pipeline

```go
package main

import "fmt"

// 阶段 1：生成数据
func generator(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        for _, n := range nums {
            out <- n
        }
        close(out)
    }()
    return out
}

// 阶段 2：平方
func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            out <- n * n
        }
        close(out)
    }()
    return out
}

// 阶段 3：打印
func print(in <-chan int) {
    for n := range in {
        fmt.Println(n)
    }
}

func main() {
    // 连接各个阶段
    c := generator(1, 2, 3, 4, 5)
    c = square(c)
    print(c)
}
```

### 带缓冲的 Pipeline

```go
package main

import (
    "fmt"
    "time"
)

// 带缓冲的生成器
func bufferedGenerator(nums ...int) <-chan int {
    out := make(chan int, len(nums)) // 缓冲
    go func() {
        for _, n := range nums {
            out <- n
        }
        close(out)
    }()
    return out
}

// 带延迟的处理
func slowProcessor(in <-chan int) <-chan int {
    out := make(chan int, 10) // 缓冲解耦
    go func() {
        for n := range in {
            time.Sleep(100 * time.Millisecond) // 模拟慢速处理
            out <- n * 2
        }
        close(out)
    }()
    return out
}

func main() {
    nums := make([]int, 100)
    for i := range nums {
        nums[i] = i
    }
    
    start := time.Now()
    c := bufferedGenerator(nums...)
    c = slowProcessor(c)
    
    count := 0
    for range c {
        count++
    }
    
    fmt.Printf("Processed %d items in %v\n", count, time.Since(start))
}
```

## Fan-out / Fan-in 模式

Fan-out（扇出）将工作分发给多个 Goroutine 并行处理，Fan-in（扇入）将多个 Channel 的结果合并到一个 Channel。

### 基本 Fan-out/Fan-in

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

// 生成器
func producer(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        for _, n := range nums {
            out <- n
        }
        close(out)
    }()
    return out
}

// 处理器
func worker(id int, in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            // 模拟耗时操作
            time.Sleep(time.Duration(n) * time.Millisecond)
            out <- n * n
        }
        close(out)
    }()
    return out
}

// Fan-in：合并多个 Channel
func merge(cs ...<-chan int) <-chan int {
    var wg sync.WaitGroup
    out := make(chan int)
    
    output := func(c <-chan int) {
        defer wg.Done()
        for n := range c {
            out <- n
        }
    }
    
    wg.Add(len(cs))
    for _, c := range cs {
        go output(c)
    }
    
    go func() {
        wg.Wait()
        close(out)
    }()
    
    return out
}

func main() {
    in := producer(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
    
    // Fan-out：启动 3 个 worker
    c1 := worker(1, in)
    c2 := worker(2, in)
    c3 := worker(3, in)
    
    // Fan-in：合并结果
    for n := range merge(c1, c2, c3) {
        fmt.Println(n)
    }
}
```

### 动态 Fan-out

```go
package main

import (
    "context"
    "fmt"
    "runtime"
    "sync"
)

// 动态启动 worker
func dynamicFanOut(ctx context.Context, in <-chan int, fn func(int) int) <-chan int {
    var wg sync.WaitGroup
    out := make(chan int)
    
    // 根据 CPU 核心数决定 worker 数量
    numWorkers := runtime.NumCPU()
    
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for {
                select {
                case n, ok := <-in:
                    if !ok {
                        return
                    }
                    out <- fn(n)
                case <-ctx.Done():
                    return
                }
            }
        }()
    }
    
    go func() {
        wg.Wait()
        close(out)
    }()
    
    return out
}

func main() {
    ctx := context.Background()
    
    in := make(chan int)
    go func() {
        for i := 1; i <= 100; i++ {
            in <- i
        }
        close(in)
    }()
    
    out := dynamicFanOut(ctx, in, func(n int) int {
        return n * n
    })
    
    for result := range out {
        fmt.Println(result)
    }
}
```

## 使用 Context 控制并发

### 优雅退出

```go
package main

import (
    "context"
    "fmt"
    "time"
)

// 可取消的 worker
func worker(ctx context.Context, id int, in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer fmt.Printf("Worker %d exited\n", id)
        for {
            select {
            case n, ok := <-in:
                if !ok {
                    return
                }
                out <- n * 2
            case <-ctx.Done():
                return
            }
        }
    }()
    return out
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()
    
    in := make(chan int)
    go func() {
        for i := 1; ; i++ {
            select {
            case in <- i:
            case <-ctx.Done():
                close(in)
                return
            }
        }
    }()
    
    out := worker(ctx, 1, in)
    
    for result := range out {
        fmt.Println(result)
    }
}
```

### 传递元数据

```go
package main

import (
    "context"
    "fmt"
)

// 定义 key 类型，避免冲突
type contextKey string

const requestIDKey contextKey = "requestID"

func withRequestID(ctx context.Context, id string) context.Context {
    return context.WithValue(ctx, requestIDKey, id)
}

func getRequestID(ctx context.Context) string {
    if id, ok := ctx.Value(requestIDKey).(string); ok {
        return id
    }
    return "unknown"
}

func process(ctx context.Context, data int) {
    id := getRequestID(ctx)
    fmt.Printf("[%s] Processing %d\n", id, data)
}

func main() {
    ctx := withRequestID(context.Background(), "req-123")
    process(ctx, 42)
}
```

## 错误处理模式

### ErrGroup 模式

```go
package main

import (
    "context"
    "fmt"
    "golang.org/x/sync/errgroup"
    "time"
)

func main() {
    g, ctx := errgroup.WithContext(context.Background())
    
    // 启动多个任务
    for i := 0; i < 5; i++ {
        i := i // 捕获循环变量
        g.Go(func() error {
            if i == 3 {
                return fmt.Errorf("task %d failed", i)
            }
            select {
            case <-time.After(time.Duration(i) * time.Second):
                fmt.Printf("Task %d completed\n", i)
                return nil
            case <-ctx.Done():
                fmt.Printf("Task %d cancelled\n", i)
                return ctx.Err()
            }
        })
    }
    
    if err := g.Wait(); err != nil {
        fmt.Printf("Error: %v\n", err)
    }
}
```

### 错误聚合

```go
package main

import (
    "errors"
    "fmt"
    "sync"
)

type ErrorCollector struct {
    mu     sync.Mutex
    errors []error
}

func (ec *ErrorCollector) Add(err error) {
    if err == nil {
        return
    }
    ec.mu.Lock()
    defer ec.mu.Unlock()
    ec.errors = append(ec.errors, err)
}

func (ec *ErrorCollector) Error() error {
    ec.mu.Lock()
    defer ec.mu.Unlock()
    if len(ec.errors) == 0 {
        return nil
    }
    return errors.Join(ec.errors...)
}

func main() {
    ec := &ErrorCollector{}
    var wg sync.WaitGroup
    
    for i := 0; i < 5; i++ {
        wg.Add(1)
        go func(n int) {
            defer wg.Done()
            if n%2 == 0 {
                ec.Add(fmt.Errorf("error from %d", n))
            }
        }(i)
    }
    
    wg.Wait()
    if err := ec.Error(); err != nil {
        fmt.Println("Errors:", err)
    }
}
```

## 信号量模式

### 计数信号量

```go
package main

import (
    "context"
    "fmt"
    "time"
)

// Semaphore 信号量
type Semaphore struct {
    ch chan struct{}
}

func NewSemaphore(n int) *Semaphore {
    return &Semaphore{ch: make(chan struct{}, n)}
}

func (s *Semaphore) Acquire(ctx context.Context) error {
    select {
    case s.ch <- struct{}{}:
        return nil
    case <-ctx.Done():
        return ctx.Err()
    }
}

func (s *Semaphore) Release() {
    select {
    case <-s.ch:
    default:
    }
}

func main() {
    sem := NewSemaphore(3) // 最多 3 个并发
    ctx := context.Background()
    
    for i := 0; i < 10; i++ {
        go func(n int) {
            if err := sem.Acquire(ctx); err != nil {
                fmt.Printf("Task %d: %v\n", n, err)
                return
            }
            defer sem.Release()
            
            fmt.Printf("Task %d running\n", n)
            time.Sleep(time.Second)
            fmt.Printf("Task %d done\n", n)
        }(i)
    }
    
    time.Sleep(5 * time.Second)
}
```

## 速率限制

### 令牌桶算法

```go
package main

import (
    "context"
    "fmt"
    "time"
)

// TokenBucket 令牌桶
type TokenBucket struct {
    rate       int           // 每秒产生令牌数
    bucketSize int           // 桶容量
    tokens     int           // 当前令牌数
    lastUpdate time.Time     // 上次更新时间
    ch         chan struct{} // 请求队列
}

func NewTokenBucket(rate, bucketSize int) *TokenBucket {
    tb := &TokenBucket{
        rate:       rate,
        bucketSize: bucketSize,
        tokens:     bucketSize,
        lastUpdate: time.Now(),
        ch:         make(chan struct{}),
    }
    go tb.run()
    return tb
}

func (tb *TokenBucket) run() {
    ticker := time.NewTicker(time.Second / time.Duration(tb.rate))
    defer ticker.Stop()
    
    for range ticker.C {
        if tb.tokens < tb.bucketSize {
            tb.tokens++
            select {
            case tb.ch <- struct{}{}:
            default:
            }
        }
    }
}

func (tb *TokenBucket) Wait(ctx context.Context) error {
    for {
        if tb.tokens > 0 {
            tb.tokens--
            return nil
        }
        select {
        case <-tb.ch:
        case <-ctx.Done():
            return ctx.Err()
        }
    }
}

func main() {
    tb := NewTokenBucket(5, 10) // 每秒 5 个，桶容量 10
    ctx := context.Background()
    
    for i := 0; i < 20; i++ {
        start := time.Now()
        if err := tb.Wait(ctx); err != nil {
            fmt.Printf("Request %d: %v\n", i, err)
            continue
        }
        fmt.Printf("Request %d processed (waited %v)\n", i, time.Since(start))
    }
}
```

## 总结

高级并发模式是编写高效 Go 程序的关键：

| 模式 | 用途 | 关键点 |
|------|------|--------|
| Pipeline | 数据流处理 | 阶段解耦、缓冲优化 |
| Fan-out/Fan-in | 并行处理 | 动态 worker、结果合并 |
| Context | 生命周期控制 | 取消传播、超时控制 |
| ErrGroup | 错误处理 | 快速失败、错误聚合 |
| Semaphore | 并发控制 | 资源限制、优雅降级 |
| Rate Limit | 流量控制 | 令牌桶、漏桶算法 |

**最佳实践：**
1. 使用 Context 控制所有 Goroutine 的生命周期
2. 合理设置 Channel 缓冲，平衡内存和性能
3. 始终处理错误，避免静默失败
4. 限制并发数量，防止资源耗尽
5. 使用 pprof 监控 Goroutine 泄漏

---

**相关文章推荐：**
- [Go 协程（Goroutine）入门](/dev/backend/golang/go-goroutine-intro) - 并发基础
- [Go 通道（Channel）详解](/dev/backend/golang/go-channel-guide) - Channel 深入解析
- [Go 并发模式：WaitGroup 与 Mutex](/dev/backend/golang/go-waitgroup-mutex) - 同步原语
