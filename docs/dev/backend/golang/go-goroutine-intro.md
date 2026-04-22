---
title: "Go 协程（Goroutine）入门：轻量级并发编程"
date: 2026-04-22
author: PFinal南丞
description: "深入浅出讲解 Go 语言协程（Goroutine）的概念、创建方式、生命周期管理以及最佳实践，帮助开发者掌握 Go 并发编程的基础。"
keywords:
  - Go
  - Goroutine
  - 协程
  - 并发编程
  - 轻量级线程
tags:
  - Go
  - Concurrency
  - Tutorial
---

# Go 协程（Goroutine）入门：轻量级并发编程

## 什么是 Goroutine？

Goroutine 是 Go 语言的核心特性之一，它是一种**轻量级的线程**，由 Go 运行时（runtime）管理，而非操作系统直接管理。与传统的操作系统线程相比，Goroutine 具有以下优势：

- **极低的创建成本**：只需 2KB 的初始栈空间（可动态增长）
- **高效的调度**：Go 运行时可以在少量的操作系统线程上调度成千上万个 Goroutine
- **简洁的语法**：只需在函数调用前加上 `go` 关键字即可创建

## 创建 Goroutine

### 基本用法

创建 Goroutine 非常简单，只需在函数调用前加上 `go` 关键字：

```go
package main

import (
    "fmt"
    "time"
)

func sayHello() {
    for i := 0; i < 5; i++ {
        fmt.Println("Hello from Goroutine!", i)
        time.Sleep(100 * time.Millisecond)
    }
}

func main() {
    // 创建一个新的 Goroutine
    go sayHello()
    
    // 主 Goroutine 继续执行
    for i := 0; i < 5; i++ {
        fmt.Println("Hello from Main!", i)
        time.Sleep(100 * time.Millisecond)
    }
    
    // 等待一段时间，让 Goroutine 完成
    time.Sleep(1 * time.Second)
}
```

### 使用匿名函数

你也可以使用匿名函数创建 Goroutine：

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    // 使用匿名函数创建 Goroutine
    go func() {
        fmt.Println("This runs in a Goroutine")
    }()
    
    // 带参数的匿名函数
    go func(msg string) {
        fmt.Println("Message:", msg)
    }("Hello from anonymous function")
    
    time.Sleep(100 * time.Millisecond)
}
```

## Goroutine 的生命周期

### 启动

当使用 `go` 关键字时，Go 运行时会：
1. 分配一个小的栈空间（初始 2KB）
2. 将函数放入调度器的运行队列
3. 调度器在合适的时机执行该 Goroutine

### 执行

Goroutine 的执行是非抢占式的（Go 1.14 之前），但在 Go 1.14 及之后，调度器实现了**基于信号的抢占式调度**，可以更好地处理长时间运行的 Goroutine。

### 结束

Goroutine 在以下情况下结束：
- 函数正常返回
- 发生 panic（可以被 recover）
- 调用 `runtime.Goexit()`

### 注意事项：主 Goroutine 退出

**重要**：当主 Goroutine（main 函数）退出时，所有其他 Goroutine 都会立即终止，无论它们是否完成。

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    go func() {
        time.Sleep(2 * time.Second)
        fmt.Println("This may not print!") // 可能不会执行
    }()
    
    // 主函数立即退出，上面的 Goroutine 来不及执行
    fmt.Println("Main exiting")
}
```

## 等待 Goroutine 完成

### 使用 sync.WaitGroup

`sync.WaitGroup` 是等待多个 Goroutine 完成的标准方式：

```go
package main

import (
    "fmt"
    "sync"
)

func worker(id int, wg *sync.WaitGroup) {
    // 在函数退出时调用 Done
    defer wg.Done()
    
    fmt.Printf("Worker %d starting\n", id)
    // 模拟工作
    for i := 0; i < 3; i++ {
        fmt.Printf("Worker %d processing %d\n", id, i)
    }
    fmt.Printf("Worker %d done\n", id)
}

func main() {
    var wg sync.WaitGroup
    
    // 启动 3 个 worker
    for i := 1; i <= 3; i++ {
        wg.Add(1) // 增加计数器
        go worker(i, &wg)
    }
    
    // 等待所有 worker 完成
    wg.Wait()
    fmt.Println("All workers completed")
}
```

### 使用 Channel（下一章详细介绍）

```go
package main

import "fmt"

func main() {
    done := make(chan bool)
    
    go func() {
        fmt.Println("Working...")
        done <- true // 发送完成信号
    }()
    
    <-done // 等待信号
    fmt.Println("Goroutine completed")
}
```

## Goroutine 与闭包

使用 Goroutine 时需要注意闭包变量的捕获问题：

### 错误示例

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    for i := 0; i < 3; i++ {
        go func() {
            fmt.Println(i) // 可能都打印 3
        }()
    }
    time.Sleep(100 * time.Millisecond)
}
```

### 正确做法

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    for i := 0; i < 3; i++ {
        go func(n int) { // 通过参数传递
            fmt.Println(n)
        }(i)
    }
    time.Sleep(100 * time.Millisecond)
}
```

## 设置 Goroutine 数量

### runtime.GOMAXPROCS

控制同时执行的操作系统线程数（即并行度）：

```go
package main

import (
    "fmt"
    "runtime"
)

func main() {
    // 获取当前的 GOMAXPROCS
    fmt.Println("Current GOMAXPROCS:", runtime.GOMAXPROCS(0))
    
    // 设置为 CPU 核心数
    numCPU := runtime.NumCPU()
    runtime.GOMAXPROCS(numCPU)
    fmt.Println("Set GOMAXPROCS to:", numCPU)
}
```

### 查看 Goroutine 数量

```go
package main

import (
    "fmt"
    "runtime"
    "time"
)

func main() {
    fmt.Println("初始 Goroutine 数:", runtime.NumGoroutine())
    
    for i := 0; i < 10; i++ {
        go func() {
            time.Sleep(1 * time.Second)
        }()
    }
    
    fmt.Println("创建后 Goroutine 数:", runtime.NumGoroutine())
    time.Sleep(2 * time.Second)
    fmt.Println("结束后 Goroutine 数:", runtime.NumGoroutine())
}
```

## 最佳实践

### 1. 总是处理 Goroutine 的退出

```go
func worker(ctx context.Context, wg *sync.WaitGroup) {
    defer wg.Done()
    
    for {
        select {
        case <-ctx.Done():
            return // 优雅退出
        default:
            // 执行工作
        }
    }
}
```

### 2. 避免 Goroutine 泄漏

确保每个创建的 Goroutine 都能正常结束，避免无限等待 Channel 或锁。

### 3. 使用 Context 控制生命周期

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()
    
    go func(ctx context.Context) {
        for {
            select {
            case <-ctx.Done():
                fmt.Println("Goroutine exiting:", ctx.Err())
                return
            default:
                fmt.Println("Working...")
                time.Sleep(500 * time.Millisecond)
            }
        }
    }(ctx)
    
    time.Sleep(3 * time.Second)
}
```

### 4. 限制并发数量

使用信号量模式限制同时运行的 Goroutine 数量：

```go
package main

import (
    "fmt"
    "sync"
)

func main() {
    const maxWorkers = 3
    semaphore := make(chan struct{}, maxWorkers)
    var wg sync.WaitGroup
    
    for i := 0; i < 10; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            
            semaphore <- struct{}{}        // 获取信号量
            defer func() { <-semaphore }() // 释放信号量
            
            fmt.Printf("Worker %d processing\n", id)
        }(i)
    }
    
    wg.Wait()
}
```

## 性能考虑

### Goroutine  vs 操作系统线程

| 特性 | Goroutine | 操作系统线程 |
|------|-----------|-------------|
| 内存占用 | ~2KB 起 | ~1MB |
| 创建速度 | 微秒级 | 毫秒级 |
| 切换开销 | 很小 | 较大 |
| 调度 | Go 运行时 | 操作系统 |
| 数量 | 百万级 | 数千级 |

### 何时使用 Goroutine？

✅ **适合使用：**
- I/O 密集型操作（网络请求、文件读写）
- 需要并发处理的任务
- 事件驱动的编程

❌ **避免滥用：**
- 纯计算密集型任务（可能降低性能）
- 简单的顺序执行逻辑
- 过度创建 Goroutine（可能导致内存压力）

## 总结

Goroutine 是 Go 语言并发编程的基石，它的轻量级特性使得编写高并发程序变得简单高效。掌握 Goroutine 的创建、生命周期管理和同步机制，是成为 Go 开发者的必修课。

在下一章中，我们将深入探讨 **Channel**，了解 Goroutine 之间如何安全地进行通信和数据共享。

---

**相关文章推荐：**
- [Go 通道（Channel）详解](/dev/backend/golang/go-channel-guide) - Goroutine 通信机制
- [Go 并发模式：WaitGroup 与 Mutex](/dev/backend/golang/go-waitgroup-mutex) - 同步原语详解
- [Go 并发模式进阶](/dev/backend/golang/go-concurrency-patterns-advanced) - 高级并发模式
