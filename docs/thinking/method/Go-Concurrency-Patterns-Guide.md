---
title: "Go 语言并发模式实战指南"
description: "深入讲解 Go 语言并发编程模式，包括 Worker 池、Pipeline、Fan-in/Fan-out 等实战技巧，帮助你掌握高性能并发程序设计。"
keywords:
  - Go 并发模式
  - Worker Pool
  - Pipeline
  - Fan-in
  - Fan-out
  - 并发编程
author: PFinal南丞
date: 2026-04-22
tags:
  - golang
  - concurrency
  - patterns
---

# Go 语言并发模式实战指南

> 并发编程是 Go 语言的核心优势之一。掌握并发模式，能让你的程序性能提升数倍。

## 一、并发基础回顾

### 1.1 Goroutine 与 Channel

```go
// 基础并发示例
func main() {
    ch := make(chan int)
    
    go func() {
        ch <- 42
    }()
    
    value := <-ch
    fmt.Println(value) // 42
}
```

### 1.2 select 多路复用

```go
select {
case v1 := <-ch1:
    fmt.Println("ch1:", v1)
case v2 := <-ch2:
    fmt.Println("ch2:", v2)
case <-time.After(1 * time.Second):
    fmt.Println("timeout")
default:
    fmt.Println("no channel ready")
}
```

## 二、Worker Pool 模式

### 2.1 基础实现

```go
type Task struct {
    ID   int
    Data interface{}
}

type WorkerPool struct {
    workers  int
    taskChan chan Task
    wg       sync.WaitGroup
}

func NewWorkerPool(workers int) *WorkerPool {
    return &WorkerPool{
        workers:  workers,
        taskChan: make(chan Task, 100),
    }
}

func (wp *WorkerPool) Start() {
    for i := 0; i < wp.workers; i++ {
        wp.wg.Add(1)
        go wp.worker(i)
    }
}

func (wp *WorkerPool) worker(id int) {
    defer wp.wg.Done()
    
    for task := range wp.taskChan {
        fmt.Printf("Worker %d processing task %d\n", id, task.ID)
        // 处理任务
        process(task)
    }
}

func (wp *WorkerPool) Submit(task Task) {
    wp.taskChan <- task
}

func (wp *WorkerPool) Stop() {
    close(wp.taskChan)
    wp.wg.Wait()
}
```

### 2.2 使用示例

```go
func main() {
    pool := NewWorkerPool(5)
    pool.Start()
    
    // 提交任务
    for i := 0; i < 20; i++ {
        pool.Submit(Task{ID: i, Data: fmt.Sprintf("task-%d", i)})
    }
    
    pool.Stop()
}
```

## 三、Pipeline 模式

### 3.1 三阶段 Pipeline

```go
// Stage 1: 生成数据
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

// Stage 2: 处理数据
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

// Stage 3: 合并结果
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
```

### 3.2 使用 Pipeline

```go
func main() {
    // 创建 Pipeline
    in := generator(1, 2, 3, 4, 5)
    
    // 分发到多个处理通道
    c1 := square(in)
    c2 := square(in)
    
    // 合并结果
    for n := range merge(c1, c2) {
        fmt.Println(n)
    }
}
```

## 四、Fan-out/Fan-in 模式

### 4.1 Fan-out（分发）

```go
func fanOut(input <-chan int, n int) []<-chan int {
    outputs := make([]<-chan int, n)
    
    for i := 0; i < n; i++ {
        ch := make(chan int)
        outputs[i] = ch
        
        go func(out chan<- int) {
            defer close(out)
            for v := range input {
                out <- v
            }
        }(ch)
    }
    
    return outputs
}
```

### 4.2 Fan-in（汇聚）

```go
func fanIn(inputs ...<-chan int) <-chan int {
    var wg sync.WaitGroup
    out := make(chan int)
    
    collect := func(in <-chan int) {
        defer wg.Done()
        for v := range in {
            out <- v
        }
    }
    
    wg.Add(len(inputs))
    for _, in := range inputs {
        go collect(in)
    }
    
    go func() {
        wg.Wait()
        close(out)
    }()
    
    return out
}
```

## 五、Context 控制

### 5.1 超时控制

```go
func workerWithTimeout(ctx context.Context, tasks <-chan Task) error {
    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case task, ok := <-tasks:
            if !ok {
                return nil
            }
            if err := processWithContext(ctx, task); err != nil {
                return err
            }
        }
    }
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    
    tasks := make(chan Task)
    go generateTasks(tasks)
    
    if err := workerWithTimeout(ctx, tasks); err != nil {
        log.Printf("Worker stopped: %v", err)
    }
}
```

### 5.2 取消信号传播

```go
func pipelineWithCancel(ctx context.Context) {
    stage1 := make(chan int)
    stage2 := make(chan int)
    
    // Stage 1
    go func() {
        defer close(stage1)
        for i := 0; i < 100; i++ {
            select {
            case <-ctx.Done():
                return
            case stage1 <- i:
            }
        }
    }()
    
    // Stage 2
    go func() {
        defer close(stage2)
        for v := range stage1 {
            select {
            case <-ctx.Done():
                return
            case stage2 <- v * 2:
            }
        }
    }()
    
    // 消费
    for v := range stage2 {
        fmt.Println(v)
    }
}
```

## 六、错误处理模式

### 6.1 ErrGroup 模式

```go
import "golang.org/x/sync/errgroup"

func processBatch(items []Item) error {
    g, ctx := errgroup.WithContext(context.Background())
    
    for _, item := range items {
        item := item // 捕获循环变量
        g.Go(func() error {
            return processItem(ctx, item)
        })
    }
    
    return g.Wait()
}
```

### 6.2 错误通道模式

```go
type Result struct {
    Value int
    Error error
}

func workerWithError(input <-chan int) <-chan Result {
    out := make(chan Result)
    
    go func() {
        defer close(out)
        for v := range input {
            result, err := compute(v)
            out <- Result{Value: result, Error: err}
        }
    }()
    
    return out
}
```

## 七、性能优化技巧

### 7.1 避免 Goroutine 泄漏

```go
// ❌ 错误：可能泄漏
go func() {
    result := <-ch // 如果 ch 永远不关闭，goroutine 会永远阻塞
    process(result)
}()

// ✅ 正确：使用 select + done channel
done := make(chan struct{})
go func() {
    defer close(done)
    select {
    case result := <-ch:
        process(result)
    case <-time.After(5 * time.Second):
        return
    }
}()
```

### 7.2 控制并发数量

```go
func limitedConcurrency(items []Item, maxConcurrent int) error {
    sem := make(chan struct{}, maxConcurrent)
    var wg sync.WaitGroup
    
    for _, item := range items {
        wg.Add(1)
        sem <- struct{}{} // 获取信号量
        
        go func(i Item) {
            defer wg.Done()
            defer func() { <-sem }() // 释放信号量
            
            process(i)
        }(item)
    }
    
    wg.Wait()
    return nil
}
```

## 八、实战案例：并发爬虫

```go
type Crawler struct {
    maxDepth    int
    concurrency int
    visited     sync.Map
}

func (c *Crawler) Crawl(ctx context.Context, startURL string) {
    urls := make(chan string, 100)
    results := make(chan CrawlResult, 100)
    
    // 启动 Worker
    var wg sync.WaitGroup
    for i := 0; i < c.concurrency; i++ {
        wg.Add(1)
        go c.worker(ctx, &wg, urls, results)
    }
    
    // 发送起始 URL
    urls <- startURL
    
    // 收集结果并发现新 URL
    go func() {
        for result := range results {
            fmt.Printf("Crawled: %s (depth: %d)\n", result.URL, result.Depth)
            
            if result.Depth < c.maxDepth {
                for _, link := range result.Links {
                    if _, loaded := c.visited.LoadOrStore(link, true); !loaded {
                        select {
                        case urls <- link:
                        case <-ctx.Done():
                            return
                        }
                    }
                }
            }
        }
    }()
    
    // 等待完成
    wg.Wait()
    close(results)
}

func (c *Crawler) worker(ctx context.Context, wg *sync.WaitGroup, urls <-chan string, results chan<- CrawlResult) {
    defer wg.Done()
    
    for url := range urls {
        select {
        case <-ctx.Done():
            return
        default:
            result := c.fetch(url)
            results <- result
        }
    }
}
```

## 九、总结

| 模式 | 适用场景 | 核心要点 |
|------|----------|----------|
| Worker Pool | 大量任务需要并发处理 | 控制并发数，复用 goroutine |
| Pipeline | 数据需要多阶段处理 | 每个阶段独立，通过 channel 连接 |
| Fan-out/Fan-in | 任务分发和结果汇聚 | 动态扩展处理能力 |
| Context | 超时和取消控制 | 信号传播，优雅退出 |
| ErrGroup | 批量任务错误处理 | 任一错误立即返回 |

掌握这些并发模式，你就能写出高效、可靠的 Go 并发程序。
