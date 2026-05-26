---
title: "Lesson 1.3: 并发模式实战"
description: "掌握 Worker Pool、Pipeline、Fan-in/Fan-out 等经典并发模式"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, concurrency, patterns, lesson]
---

# Lesson 1.3: 并发模式实战

## 学习目标

- 掌握经典并发模式：Pipeline、Fan-in/Fan-out、Worker Pool
- 理解并发与并行的区别
- 能够根据场景选择适当的并发模式

---

## 1. Pipeline 模式

Pipeline 将数据处理流程组织为多个阶段（stage），每个阶段通过 Channel 连接：

```
stage1 → ch1 → stage2 → ch2 → stage3
```

```go
// 阶段 1：生成数字
func generate(nums ...int) <-chan int {
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

// 阶段 3：乘以 2
func multiply(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            out <- n * 2
        }
        close(out)
    }()
    return out
}

func main() {
    // 组装 Pipeline
    for result := range multiply(square(generate(1, 2, 3, 4))) {
        fmt.Println(result)  // 2, 8, 18, 32
    }
}
```

---

## 2. Fan-Out / Fan-In

**Fan-Out**：将一个输入 Channel 分发给多个 worker 并行处理。
**Fan-In**：将多个输出 Channel 合并为一个。

```go
// Fan-Out: 分发到多个 worker
func fanOut(input <-chan int, workers int) []<-chan int {
    channels := make([]<-chan int, workers)
    for i := 0; i < workers; i++ {
        channels[i] = worker(input)
    }
    return channels
}

func worker(input <-chan int) <-chan int {
    output := make(chan int)
    go func() {
        for n := range input {
            output <- n * n
        }
        close(output)
    }()
    return output
}

// Fan-In: 合并多个 Channel
func fanIn(channels ...<-chan int) <-chan int {
    var wg sync.WaitGroup
    out := make(chan int)

    multiplex := func(c <-chan int) {
        defer wg.Done()
        for n := range c {
            out <- n
        }
    }

    wg.Add(len(channels))
    for _, c := range channels {
        go multiplex(c)
    }

    // 等待所有 goroutine 完成然后关闭输出 Channel
    go func() {
        wg.Wait()
        close(out)
    }()

    return out
}
```

---

## 3. Worker Pool 模式

控制并发数的经典模式，避免资源耗尽：

```go
func workerPool(jobs <-chan Job, results chan<- Result, workerCount int) {
    var wg sync.WaitGroup
    wg.Add(workerCount)

    for i := 0; i < workerCount; i++ {
        go func(id int) {
            defer wg.Done()
            for job := range jobs {
                logger.Printf("worker %d processing job %d", id, job.ID)
                result := process(job)
                results <- result
            }
        }(i)
    }

    // 等待所有 worker 完成
    go func() {
        wg.Wait()
        close(results)
    }()
}
```

**Worker Pool 的选参策略：**

| 场景 | 推荐 Worker 数 |
|------|----------------|
| CPU 密集型 | `runtime.GOMAXPROCS(0)`（=CPU 核数） |
| I/O 密集型 | CPU 核数 × 2~10 |
| 外部 API 调用 | 根据 API 限流策略 |
| 数据库批量操作 | 根据连接池大小 |

---

## 4. 并发模式选择指南

| 场景 | 推荐模式 | 说明 |
|------|----------|------|
| 数据处理流水线 | Pipeline | 固定阶段的流式处理 |
| 批量任务处理 | Worker Pool | 控制最大并发数 |
| 多源数据聚合 | Fan-In | 合并多个结果流 |
| 并行计算再分发 | Fan-Out/Fan-In | 分治模式 |
| 生产者-消费者 | Channel + Goroutine | 最基础的解耦模式 |

---

## 5. 常见陷阱

```go
// ❌ 陷阱 1：向已关闭的 Channel 发送（panic）
ch := make(chan int)
close(ch)
ch <- 42 // panic: send on closed channel

// ✅ 正确：由发送方关闭，且只关闭一次

// ❌ 陷阱 2：忘记关闭 Channel（死锁）
func produces(ch chan int) {
    for i := 0; i < 10; i++ {
        ch <- i
    }
    // 忘记 close(ch) 会导致接收方死锁
}

// ✅ 正确：在发送完毕后 close

// ❌ 陷阱 3：Goroutine 泄漏
func leak() {
    ch := make(chan int)
    go func() {
        val := <-ch // 永远阻塞，没人发送
    }()
    // goroutine 泄漏！
}
```

---

## 推荐阅读

- [Go 语言并发模式实战指南](/thinking/method/Go-Concurrency-Patterns-Guide)
- [深入理解 Go Channel 批量读取与实际应用](/dev/backend/golang/Go-Channel-Batch-Read)

---

## 练习

1. 实现一个 Pipeline 处理日志文件：读取 → 解析 → 过滤 → 写入，每个阶段一个 Goroutine。

2. 结合 Context 给 Worker Pool 增加优雅关闭功能：收到退出信号后，等待当前任务完成再退出。

3. 阅读 [Go Concurrency Patterns Guide](/thinking/method/Go-Concurrency-Patterns-Guide) 了解更多高级模式。
