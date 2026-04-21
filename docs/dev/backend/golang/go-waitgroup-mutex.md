---
title: "Go 并发模式：WaitGroup、Mutex 与 sync 包实战"
date: 2026-04-21 10:00:00
author: PFinal南丞
description: "深入讲解 Go 并发编程核心工具：sync.WaitGroup、sync.Mutex、sync.RWMutex、sync.Once、sync.Pool，以及 atomic 原子操作，带你掌握安全并发编程。"
keywords:
  - Go WaitGroup
  - Go Mutex
  - Golang 并发
  - sync 包
  - atomic 原子操作
tags:
  - golang
  - concurrency
  - tutorial
---

# Go 并发模式：WaitGroup、Mutex 与 sync 包实战

> Go 的并发是它最强大的特性之一。但并发编程也意味着数据竞争、死锁等风险。本文带你掌握 sync 包的核心工具，安全地驾驭并发。

**相关文章推荐：**
- [Go 基础语法速通](./go-basic-syntax.md) - 快速掌握 Go 语言基础
- [深入理解 Go Channel 批量读取与实际应用](./深入理解Go Channel 批量读取与实际应用.md) - 并发通信机制
- [Golang 协程池实现 - 实战指南](./golang 实现协程池.md) - 协程池模式详解
- [Go 微服务治理：熔断、限流与降级](./circuit-breaker-rate-limiting.md) - 生产级服务治理
- [Gin 框架实战指南](./gin-framework-guide.md) - 高性能 Web API 开发

## 一、为什么需要同步原语？

```go
// ❌ 数据竞争：不安全！
var counter int
var wg sync.WaitGroup

for i := 0; i < 1000; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
        counter++  // 多个 goroutine 同时读写！
    }()
}
wg.Wait()
fmt.Println(counter) // 结果不确定，可能远小于 1000
```

用 `go run -race main.go` 可以检测数据竞争。

---

## 二、sync.WaitGroup：等待一组 goroutine 完成

WaitGroup 是最常用的 goroutine 协调工具。

```go
var wg sync.WaitGroup

// 基础用法
for i := 0; i < 5; i++ {
    wg.Add(1)           // 计数器 +1
    go func(id int) {
        defer wg.Done() // 完成时计数器 -1
        fmt.Printf("Worker %d 开始\n", id)
        time.Sleep(time.Duration(id) * 100 * time.Millisecond)
        fmt.Printf("Worker %d 完成\n", id)
    }(i)
}

wg.Wait() // 阻塞，直到计数器归零
fmt.Println("所有 worker 完成")
```

### 并发采集数据

```go
type Result struct {
    URL  string
    Data string
    Err  error
}

func fetchAll(urls []string) []Result {
    results := make([]Result, len(urls))
    var wg sync.WaitGroup

    for i, url := range urls {
        wg.Add(1)
        go func(i int, url string) {
            defer wg.Done()
            data, err := fetch(url)
            results[i] = Result{URL: url, Data: data, Err: err}
        }(i, url)
    }

    wg.Wait()
    return results
}
```

### WaitGroup 使用注意事项

```go
// ❌ 错误：在 goroutine 内部调用 Add
go func() {
    wg.Add(1)  // 可能在 Wait 已经返回后才执行
    defer wg.Done()
}()

// ✅ 正确：在启动 goroutine 之前调用 Add
wg.Add(1)
go func() {
    defer wg.Done()
}()
```

---

## 三、sync.Mutex：互斥锁

Mutex 保证同一时刻只有一个 goroutine 访问临界区。

```go
// ✅ 安全的计数器
type SafeCounter struct {
    mu    sync.Mutex
    count int
}

func (c *SafeCounter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count++
}

func (c *SafeCounter) Value() int {
    c.mu.Lock()
    defer c.mu.Unlock()
    return c.count
}

// 使用
counter := &SafeCounter{}
var wg sync.WaitGroup

for i := 0; i < 1000; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
        counter.Increment()
    }()
}
wg.Wait()
fmt.Println(counter.Value()) // 精确输出 1000
```

### 避免死锁

```go
// ❌ 死锁：锁嵌套
mu.Lock()
mu.Lock()  // 永远等待，死锁！

// ❌ 死锁：循环等待
var mu1, mu2 sync.Mutex

go func() {
    mu1.Lock()
    time.Sleep(1 * time.Millisecond)
    mu2.Lock()  // 等待 mu2
    // ...
}()

go func() {
    mu2.Lock()
    time.Sleep(1 * time.Millisecond)
    mu1.Lock()  // 等待 mu1，死锁！
    // ...
}()

// ✅ 解决：始终按固定顺序加锁
mu1.Lock()
mu2.Lock()
// 操作...
mu2.Unlock()
mu1.Unlock()
```

---

## 四、sync.RWMutex：读写锁

读写锁允许多个 goroutine 同时读，但写时独占。适合**读多写少**场景。

```go
type Cache struct {
    mu   sync.RWMutex
    data map[string]string
}

// 读操作：多个 goroutine 可以并发读
func (c *Cache) Get(key string) (string, bool) {
    c.mu.RLock()         // 获取读锁
    defer c.mu.RUnlock() // 释放读锁
    v, ok := c.data[key]
    return v, ok
}

// 写操作：独占
func (c *Cache) Set(key, value string) {
    c.mu.Lock()         // 获取写锁
    defer c.mu.Unlock() // 释放写锁
    c.data[key] = value
}

func NewCache() *Cache {
    return &Cache{data: make(map[string]string)}
}
```

### RWMutex vs Mutex 性能对比

```go
// 基准测试结果（读:写 = 9:1 场景）：
// Mutex:   ~150ns/op
// RWMutex: ~80ns/op  // 读多写少时快约 2倍
```

---

## 五、sync.Once：只执行一次

常用于**单例初始化**和**一次性操作**。

```go
// 单例模式
type DBPool struct {
    conn *sql.DB
}

var (
    instance *DBPool
    once     sync.Once
)

func GetDB() *DBPool {
    once.Do(func() {
        db, err := sql.Open("mysql", "dsn...")
        if err != nil {
            panic(err)
        }
        instance = &DBPool{conn: db}
        fmt.Println("数据库连接池已初始化")
    })
    return instance
}

// 多次调用只会初始化一次
db1 := GetDB()
db2 := GetDB()
fmt.Println(db1 == db2) // true，同一个实例
```

### once.Do 注意事项

```go
// ❌ 如果 Do 内发生 panic，once 状态仍然为"已执行"
// 后续调用 Do 不会重新执行！
var once sync.Once
once.Do(func() {
    panic("初始化失败")
})
// 再次调用不会执行
once.Do(func() {
    fmt.Println("这里不会执行")
})
```

---

## 六、sync.Pool：对象池

Pool 缓存临时对象，减少 GC 压力。适合**频繁创建销毁大对象**的场景。

```go
// 常见用法：bytes.Buffer 复用
var bufPool = sync.Pool{
    New: func() any {
        return new(bytes.Buffer)
    },
}

func formatJSON(data interface{}) string {
    buf := bufPool.Get().(*bytes.Buffer)
    buf.Reset()
    defer bufPool.Put(buf)  // 归还对象

    json.NewEncoder(buf).Encode(data)
    return buf.String()
}

// HTTP 处理器中复用 Buffer
func handler(w http.ResponseWriter, r *http.Request) {
    buf := bufPool.Get().(*bytes.Buffer)
    buf.Reset()
    defer bufPool.Put(buf)

    buf.WriteString("Hello, ")
    buf.WriteString(r.URL.Path)
    w.Write(buf.Bytes())
}
```

### Pool 的注意事项

```go
// Pool 中的对象可能随时被 GC 清除！
// 不能用 Pool 存储持久状态

// ✅ 适合：临时编解码 buffer、日志格式化对象
// ❌ 不适合：数据库连接（应用连接池库）、有状态的对象
```

---

## 七、atomic：原子操作

atomic 比 Mutex 更轻量，适合简单数值的原子更新。

```go
import "sync/atomic"

// 原子计数器
var counter int64

// 原子加法
atomic.AddInt64(&counter, 1)
atomic.AddInt64(&counter, -1)

// 原子读取
val := atomic.LoadInt64(&counter)

// 原子写入
atomic.StoreInt64(&counter, 0)

// CAS（Compare And Swap）
old := int64(100)
new := int64(200)
swapped := atomic.CompareAndSwapInt64(&counter, old, new)
fmt.Println(swapped) // true（如果 counter == 100）
```

### atomic.Value：存储任意类型

```go
var config atomic.Value

// 写入（存储不可变的值）
cfg := map[string]string{"host": "localhost"}
config.Store(cfg)

// 读取
if c, ok := config.Load().(map[string]string); ok {
    fmt.Println(c["host"])
}

// 实现热更新配置
func watchConfig(path string, v *atomic.Value) {
    for range time.Tick(30 * time.Second) {
        newConfig := loadConfigFromFile(path)
        v.Store(newConfig)
        fmt.Println("配置已热更新")
    }
}
```

---

## 八、综合实战：并发任务池

```go
package main

import (
    "fmt"
    "sync"
    "sync/atomic"
    "time"
)

// WorkerPool 固定大小的工作池
type WorkerPool struct {
    workers   int
    taskQueue chan func()
    wg        sync.WaitGroup
    processed int64  // 原子计数器
}

func NewWorkerPool(workers int, queueSize int) *WorkerPool {
    pool := &WorkerPool{
        workers:   workers,
        taskQueue: make(chan func(), queueSize),
    }
    pool.start()
    return pool
}

func (p *WorkerPool) start() {
    for i := 0; i < p.workers; i++ {
        p.wg.Add(1)
        go func(id int) {
            defer p.wg.Done()
            for task := range p.taskQueue {
                task()
                atomic.AddInt64(&p.processed, 1)
            }
        }(i)
    }
}

func (p *WorkerPool) Submit(task func()) {
    p.taskQueue <- task
}

func (p *WorkerPool) Shutdown() {
    close(p.taskQueue)
    p.wg.Wait()
}

func (p *WorkerPool) ProcessedCount() int64 {
    return atomic.LoadInt64(&p.processed)
}

func main() {
    pool := NewWorkerPool(5, 100)

    // 提交 50 个任务
    for i := 0; i < 50; i++ {
        id := i
        pool.Submit(func() {
            time.Sleep(10 * time.Millisecond)
            fmt.Printf("任务 %d 完成\n", id)
        })
    }

    pool.Shutdown()
    fmt.Printf("共处理 %d 个任务\n", pool.ProcessedCount())
}
```

---

## 九、选择合适的同步工具

| 场景 | 推荐工具 |
|------|---------|
| 等待多个 goroutine 完成 | `sync.WaitGroup` |
| 保护共享数据 | `sync.Mutex` |
| 读多写少的共享数据 | `sync.RWMutex` |
| 单例/一次性初始化 | `sync.Once` |
| 复用临时对象降低 GC | `sync.Pool` |
| 简单整数的原子操作 | `sync/atomic` |
| goroutine 间通信 | `channel` |
| 定时通知/取消 | `context` |

---

## 十、常见陷阱总结

```go
// ❌ 陷阱1：复制 Mutex（必须传指针）
type Counter struct {
    mu sync.Mutex
    n  int
}
c := Counter{}
c2 := c  // 复制了 Mutex 的状态！
// 应该传 *Counter

// ❌ 陷阱2：defer 顺序错误
func badPattern() {
    mu.Lock()
    // 如果这里 panic，Lock 不会释放
    doSomething()
    mu.Unlock()
}

// ✅ 正确
func goodPattern() {
    mu.Lock()
    defer mu.Unlock()  // 无论如何都会释放
    doSomething()
}

// ❌ 陷阱3：WaitGroup 的 Add 和 goroutine 启动分离
for i := 0; i < n; i++ {
    go func() {
        wg.Add(1)  // 危险！
        defer wg.Done()
    }()
}

// ✅ 正确
for i := 0; i < n; i++ {
    wg.Add(1)  // 在 goroutine 外面 Add
    go func() {
        defer wg.Done()
    }()
}
```

---

## 总结

掌握这些同步原语，是写好 Go 并发程序的基础。核心原则：

1. **能用 channel 解决的，优先用 channel**（通信共享内存）
2. **共享状态必须用锁保护**，永远别裸露共享数据
3. **用 `-race` 标志检测数据竞争**，CI/CD 中应该常态化
4. **defer mu.Unlock() 是好习惯**，避免因为 panic 导致死锁

---

*作者：PFinal南丞 | 更新时间：2026-04-21*
