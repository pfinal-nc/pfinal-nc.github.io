---
title: "Go 协程（Goroutine）入门"
description: "全面讲解 Go 语言协程（Goroutine）的概念、使用方法和最佳实践，帮助你掌握 Go 并发编程的基础。"
keywords:
  - Go 协程
  - Goroutine
  - Go 并发编程
  - Go 并发基础
  - Go 轻量级线程
author: PFinal南丞
date: 2026-04-23
category: 开发
tags:
  - golang
  - goroutine
  - concurrency
  - beginner
readingTime: 12
---

# Go 协程（Goroutine）入门

> 掌握 Go 语言最核心的并发特性，轻松编写高性能并发程序

## 什么是 Goroutine

### 概念介绍

Goroutine 是 Go 语言中的轻量级线程，由 Go 运行时（runtime）管理。与传统线程相比，Goroutine 具有以下特点：

- **极低的创建成本**：只需几 KB 的栈空间
- **高效的调度**：Go 运行时调度器管理，比 OS 线程更高效
- **简洁的语法**：使用 `go` 关键字即可启动
- **自动扩缩容**：栈空间会根据需要自动增长和收缩

### Goroutine vs OS 线程

| 特性 | Goroutine | OS 线程 |
|------|-----------|---------|
| 内存占用 | ~2KB 初始栈 | ~1-8MB 栈空间 |
| 创建速度 | 微秒级 | 毫秒级 |
| 切换开销 | 很小 | 较大（需要内核态切换）|
| 调度方式 | Go 运行时调度 | 操作系统调度 |
| 创建方式 | `go` 关键字 | 系统调用 |

## 基础用法

### 启动 Goroutine

使用 `go` 关键字即可启动一个新的 Goroutine：

```go
package main

import (
    "fmt"
    "time"
)

func sayHello() {
    for i := 0; i < 5; i++ {
        fmt.Println("Hello from Goroutine!")
        time.Sleep(100 * time.Millisecond)
    }
}

func main() {
    // 启动 Goroutine
    go sayHello()
    
    // 主函数继续执行
    for i := 0; i < 5; i++ {
        fmt.Println("Hello from Main!")
        time.Sleep(100 * time.Millisecond)
    }
    
    // 等待 Goroutine 完成
    time.Sleep(1 * time.Second)
}
```

输出结果（顺序可能不同）：
```
Hello from Main!
Hello from Goroutine!
Hello from Goroutine!
Hello from Main!
...
```

### 使用匿名函数

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    // 使用匿名函数启动 Goroutine
    go func() {
        fmt.Println("Goroutine with anonymous function")
    }()
    
    // 带参数的匿名函数
    go func(msg string) {
        fmt.Println("Message:", msg)
    }("Hello from Goroutine")
    
    time.Sleep(100 * time.Millisecond)
}
```

### 闭包与 Goroutine

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    // ⚠️ 错误示例：闭包捕获循环变量
    for i := 0; i < 5; i++ {
        go func() {
            fmt.Println(i) // 可能输出相同的值
        }()
    }
    
    time.Sleep(100 * time.Millisecond)
    
    fmt.Println("---")
    
    // ✅ 正确做法：将变量作为参数传递
    for i := 0; i < 5; i++ {
        go func(n int) {
            fmt.Println(n) // 输出 0, 1, 2, 3, 4
        }(i)
    }
    
    time.Sleep(100 * time.Millisecond)
}
```

## Goroutine 的生命周期

### 主 Goroutine

`main` 函数在特殊的 Goroutine 中运行，称为主 Goroutine：

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    // 这是主 Goroutine
    fmt.Println("Main Goroutine started")
    
    go func() {
        fmt.Println("Child Goroutine started")
        time.Sleep(2 * time.Second)
        fmt.Println("Child Goroutine finished")
    }()
    
    fmt.Println("Main Goroutine finished")
    // 主 Goroutine 结束后，程序会立即退出
    // 子 Goroutine 可能来不及执行
}
```

### 等待 Goroutine 完成

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

func main() {
    var wg sync.WaitGroup
    
    for i := 1; i <= 3; i++ {
        wg.Add(1) // 增加计数器
        
        go func(id int) {
            defer wg.Done() // 减少计数器
            
            fmt.Printf("Worker %d starting\n", id)
            time.Sleep(time.Second)
            fmt.Printf("Worker %d done\n", id)
        }(i)
    }
    
    wg.Wait() // 等待所有 Goroutine 完成
    fmt.Println("All workers completed")
}
```

## 实战示例

### 并发下载器

```go
package main

import (
    "fmt"
    "io"
    "net/http"
    "os"
    "path/filepath"
    "sync"
    "time"
)

type DownloadResult struct {
    URL      string
    FilePath string
    Size     int64
    Error    error
}

// ConcurrentDownloader 并发下载器
type ConcurrentDownloader struct {
    maxConcurrent int
    client        *http.Client
}

func NewConcurrentDownloader(maxConcurrent int) *ConcurrentDownloader {
    return &ConcurrentDownloader{
        maxConcurrent: maxConcurrent,
        client: &http.Client{
            Timeout: 30 * time.Second,
        },
    }
}

func (d *ConcurrentDownloader) Download(urls []string, outputDir string) []DownloadResult {
    var wg sync.WaitGroup
    semaphore := make(chan struct{}, d.maxConcurrent) // 限制并发数
    
    results := make([]DownloadResult, len(urls))
    var mu sync.Mutex
    
    for i, url := range urls {
        wg.Add(1)
        
        go func(index int, fileURL string) {
            defer wg.Done()
            
            semaphore <- struct{}{}        // 获取信号量
            defer func() { <-semaphore }() // 释放信号量
            
            result := d.downloadFile(fileURL, outputDir)
            
            mu.Lock()
            results[index] = result
            mu.Unlock()
        }(i, url)
    }
    
    wg.Wait()
    return results
}

func (d *ConcurrentDownloader) downloadFile(url, outputDir string) DownloadResult {
    resp, err := d.client.Get(url)
    if err != nil {
        return DownloadResult{URL: url, Error: err}
    }
    defer resp.Body.Close()
    
    if resp.StatusCode != http.StatusOK {
        return DownloadResult{
            URL:   url,
            Error: fmt.Errorf("bad status: %s", resp.Status),
        }
    }
    
    // 从 URL 提取文件名
    fileName := filepath.Base(url)
    if fileName == "" || fileName == "." || fileName == "/" {
        fileName = "download"
    }
    
    filePath := filepath.Join(outputDir, fileName)
    file, err := os.Create(filePath)
    if err != nil {
        return DownloadResult{URL: url, Error: err}
    }
    defer file.Close()
    
    size, err := io.Copy(file, resp.Body)
    if err != nil {
        return DownloadResult{URL: url, Error: err}
    }
    
    return DownloadResult{
        URL:      url,
        FilePath: filePath,
        Size:     size,
    }
}

func main() {
    urls := []string{
        "https://example.com/file1.pdf",
        "https://example.com/file2.pdf",
        "https://example.com/file3.pdf",
    }
    
    downloader := NewConcurrentDownloader(3) // 最多3个并发下载
    results := downloader.Download(urls, "./downloads")
    
    for _, result := range results {
        if result.Error != nil {
            fmt.Printf("❌ Failed to download %s: %v\n", result.URL, result.Error)
        } else {
            fmt.Printf("✅ Downloaded %s -> %s (%d bytes)\n", 
                result.URL, result.FilePath, result.Size)
        }
    }
}
```

### 并发爬虫

```go
package main

import (
    "fmt"
    "net/http"
    "strings"
    "sync"

    "github.com/PuerkitoBio/goquery"
)

type Crawler struct {
    maxDepth      int
    maxConcurrent int
    visited       map[string]bool
    mu            sync.RWMutex
}

func NewCrawler(maxDepth, maxConcurrent int) *Crawler {
    return &Crawler{
        maxDepth:      maxDepth,
        maxConcurrent: maxConcurrent,
        visited:       make(map[string]bool),
    }
}

func (c *Crawler) Crawl(startURL string) {
    var wg sync.WaitGroup
    semaphore := make(chan struct{}, c.maxConcurrent)
    
    c.crawlRecursive(startURL, 0, &wg, semaphore)
    wg.Wait()
}

func (c *Crawler) crawlRecursive(url string, depth int, wg *sync.WaitGroup, semaphore chan struct{}) {
    if depth > c.maxDepth {
        return
    }
    
    // 检查是否已访问
    c.mu.Lock()
    if c.visited[url] {
        c.mu.Unlock()
        return
    }
    c.visited[url] = true
    c.mu.Unlock()
    
    wg.Add(1)
    go func() {
        defer wg.Done()
        
        semaphore <- struct{}{}
        defer func() { <-semaphore }()
        
        links := c.fetchAndParse(url)
        fmt.Printf("[Depth %d] %s - Found %d links\n", depth, url, len(links))
        
        // 递归爬取链接
        for _, link := range links {
            c.crawlRecursive(link, depth+1, wg, semaphore)
        }
    }()
}

func (c *Crawler) fetchAndParse(url string) []string {
    resp, err := http.Get(url)
    if err != nil {
        return nil
    }
    defer resp.Body.Close()
    
    doc, err := goquery.NewDocumentFromReader(resp.Body)
    if err != nil {
        return nil
    }
    
    var links []string
    doc.Find("a[href]").Each(func(i int, s *goquery.Selection) {
        href, exists := s.Attr("href")
        if exists && strings.HasPrefix(href, "http") {
            links = append(links, href)
        }
    })
    
    return links
}
```

## 最佳实践

### 1. 避免 Goroutine 泄漏

```go
// ❌ 错误：Goroutine 可能永远阻塞
func leaky() {
    ch := make(chan int)
    go func() {
        ch <- 42 // 如果没有人接收，这里会永远阻塞
    }()
    // 函数返回，但 Goroutine 还在等待
}

// ✅ 正确：使用缓冲通道或确保有接收者
func notLeaky() {
    ch := make(chan int, 1) // 缓冲通道
    go func() {
        ch <- 42
    }()
}

// ✅ 或者使用 context 控制生命周期
func withContext(ctx context.Context) {
    ch := make(chan int)
    go func() {
        select {
        case ch <- 42:
        case <-ctx.Done():
            return // 及时退出
        }
    }()
}
```

### 2. 合理控制并发数

```go
// 使用信号量限制并发数
func limitedConcurrency(urls []string, maxConcurrent int) {
    semaphore := make(chan struct{}, maxConcurrent)
    var wg sync.WaitGroup
    
    for _, url := range urls {
        wg.Add(1)
        go func(u string) {
            defer wg.Done()
            
            semaphore <- struct{}{}        // 获取许可
            defer func() { <-semaphore }() // 释放许可
            
            // 处理 URL
            process(u)
        }(url)
    }
    
    wg.Wait()
}
```

### 3. 优雅处理错误

```go
type Result struct {
    Value interface{}
    Error error
}

func workerWithErrorHandling(jobs <-chan string, results chan<- Result) {
    for job := range jobs {
        value, err := processJob(job)
        results <- Result{Value: value, Error: err}
    }
}
```

### 4. 使用 sync.WaitGroup 等待完成

```go
func processItems(items []Item) {
    var wg sync.WaitGroup
    
    for _, item := range items {
        wg.Add(1)
        go func(i Item) {
            defer wg.Done()
            process(i)
        }(item)
    }
    
    wg.Wait() // 等待所有处理完成
}
```

## 常见陷阱

### 1. 循环变量捕获

```go
// ❌ 错误
for i := 0; i < 10; i++ {
    go func() {
        fmt.Println(i) // 可能都输出相同的值
    }()
}

// ✅ 正确
for i := 0; i < 10; i++ {
    go func(n int) {
        fmt.Println(n)
    }(i)
}
```

### 2. 主 Goroutine 提前退出

```go
// ❌ 错误：子 Goroutine 来不及执行
func main() {
    go func() {
        fmt.Println("This may not print")
    }()
    // main 立即结束
}

// ✅ 正确：使用 sync.WaitGroup 或 channel 等待
func main() {
    done := make(chan bool)
    go func() {
        fmt.Println("This will print")
        done <- true
    }()
    <-done // 等待完成
}
```

### 3. 竞态条件

```go
// ❌ 错误：多个 Goroutine 同时读写变量
var counter int

for i := 0; i < 1000; i++ {
    go func() {
        counter++ // 竞态条件！
    }()
}

// ✅ 正确：使用互斥锁
var (
    counter int
    mu      sync.Mutex
)

for i := 0; i < 1000; i++ {
    go func() {
        mu.Lock()
        counter++
        mu.Unlock()
    }()
}
```

## 性能优化

### 1. 使用 Goroutine 池

```go
type WorkerPool struct {
    workers   int
    jobQueue  chan func()
    wg        sync.WaitGroup
}

func NewWorkerPool(workers int) *WorkerPool {
    pool := &WorkerPool{
        workers:  workers,
        jobQueue: make(chan func(), 100),
    }
    
    for i := 0; i < workers; i++ {
        pool.wg.Add(1)
        go pool.worker()
    }
    
    return pool
}

func (p *WorkerPool) worker() {
    defer p.wg.Done()
    for job := range p.jobQueue {
        job()
    }
}

func (p *WorkerPool) Submit(job func()) {
    p.jobQueue <- job
}

func (p *WorkerPool) Shutdown() {
    close(p.jobQueue)
    p.wg.Wait()
}
```

### 2. 设置 GOMAXPROCS

```go
import "runtime"

func init() {
    // 设置使用的 CPU 核心数
    // 通常不需要手动设置，Go 会自动优化
    runtime.GOMAXPROCS(runtime.NumCPU())
}
```

## 总结

Goroutine 是 Go 语言并发编程的核心特性：

1. **轻量级**：创建和切换成本低
2. **简单易用**：`go` 关键字即可启动
3. **高效调度**：Go 运行时自动管理
4. **注意事项**：
   - 避免循环变量捕获
   - 等待 Goroutine 完成
   - 控制并发数量
   - 处理竞态条件

掌握 Goroutine 是成为 Go 并发编程高手的第一步！

---

**下一篇**：[Go 通道（Channel）详解](/dev/backend/golang/go-channel-guide)
