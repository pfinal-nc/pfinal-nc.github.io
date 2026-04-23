---
title: "Go 并发模式：WaitGroup 与 Mutex"
description: "深入讲解 Go 语言中的同步原语 WaitGroup 和 Mutex，帮助你掌握 Goroutine 同步和共享资源保护的最佳实践。"
keywords:
  - Go WaitGroup
  - Go Mutex
  - Go 并发同步
  - Go 互斥锁
  - Go 并发安全
  - Go sync 包
author: PFinal南丞
date: 2026-04-23
category: 开发
tags:
  - golang
  - concurrency
  - sync
  - waitgroup
  - mutex
  - intermediate
readingTime: 12
---

# Go 并发模式：WaitGroup 与 Mutex

> 掌握 Go 语言同步原语，编写线程安全的并发程序

## sync.WaitGroup

### 什么是 WaitGroup

`WaitGroup` 用于等待一组 Goroutine 完成执行。它维护一个计数器，当计数器归零时，表示所有 Goroutine 已完成。

### 基本用法

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

### 常见模式

#### 1. 批量处理

```go
package main

import (
	"fmt"
	"sync"
)

func processItems(items []string) {
	var wg sync.WaitGroup
	
	for _, item := range items {
		wg.Add(1)
		go func(i string) {
			defer wg.Done()
			process(i)
		}(item)
	}
	
	wg.Wait()
}

func process(item string) {
	fmt.Printf("Processing: %s\n", item)
}

func main() {
	items := []string{"a", "b", "c", "d", "e"}
	processItems(items)
}
```

#### 2. 错误收集

```go
package main

import (
	"fmt"
	"sync"
)

type Result struct {
	Value string
	Error error
}

func processWithErrors(items []string) []Result {
	var wg sync.WaitGroup
	results := make([]Result, len(items))
	var mu sync.Mutex
	
	for i, item := range items {
		wg.Add(1)
		go func(index int, it string) {
			defer wg.Done()
			
			value, err := processItem(it)
			
			mu.Lock()
			results[index] = Result{Value: value, Error: err}
			mu.Unlock()
		}(i, item)
	}
	
	wg.Wait()
	return results
}

func processItem(item string) (string, error) {
	// 处理逻辑
	return "processed: " + item, nil
}
```

## sync.Mutex

### 什么是 Mutex

`Mutex`（互斥锁）用于保护共享资源，确保同一时间只有一个 Goroutine 可以访问临界区。

### 基本用法

```go
package main

import (
	"fmt"
	"sync"
)

type Counter struct {
	mu    sync.Mutex
	value int
}

func (c *Counter) Inc() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.value++
}

func (c *Counter) Value() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.value
}

func main() {
	var wg sync.WaitGroup
	counter := &Counter{}
	
	for i := 0; i < 1000; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			counter.Inc()
		}()
	}
	
	wg.Wait()
	fmt.Printf("Final counter: %d\n", counter.Value())
}
```

### RWMutex：读写锁

```go
package main

import (
	"fmt"
	"sync"
	"time"
)

type Cache struct {
	mu    sync.RWMutex
	data  map[string]string
}

func NewCache() *Cache {
	return &Cache{
		data: make(map[string]string),
	}
}

func (c *Cache) Get(key string) (string, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	val, ok := c.data[key]
	return val, ok
}

func (c *Cache) Set(key, value string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data[key] = value
}

func main() {
	cache := NewCache()
	
	// 写入
	go func() {
		for i := 0; i < 100; i++ {
			cache.Set(fmt.Sprintf("key%d", i), fmt.Sprintf("value%d", i))
			time.Sleep(10 * time.Millisecond)
		}
	}()
	
	// 多个读取者
	for i := 0; i < 3; i++ {
		go func(id int) {
			for j := 0; j < 100; j++ {
				if val, ok := cache.Get(fmt.Sprintf("key%d", j)); ok {
					fmt.Printf("Reader %d got: %s\n", id, val)
				}
				time.Sleep(5 * time.Millisecond)
			}
		}(i)
	}
	
	time.Sleep(2 * time.Second)
}
```

## 实战示例

### 连接池

```go
package main

import (
	"errors"
	"fmt"
	"sync"
	"time"
)

// Pool 连接池
type Pool struct {
	mu       sync.Mutex
	conns    chan *Connection
	factory  func() (*Connection, error)
	maxSize  int
}

type Connection struct {
	ID   int
	mu   sync.Mutex
	busy bool
}

func NewPool(maxSize int, factory func() (*Connection, error)) *Pool {
	return &Pool{
		conns:   make(chan *Connection, maxSize),
		factory: factory,
		maxSize: maxSize,
	}
}

func (p *Pool) Get() (*Connection, error) {
	select {
	case conn := <-p.conns:
		return conn, nil
	default:
		return p.factory()
	}
}

func (p *Pool) Put(conn *Connection) {
	select {
	case p.conns <- conn:
	default:
		// 池已满，关闭连接
		conn.Close()
	}
}

func (c *Connection) Close() {
	fmt.Printf("Connection %d closed\n", c.ID)
}

var connID int
var connMu sync.Mutex

func createConnection() (*Connection, error) {
	connMu.Lock()
	connID++
	id := connID
	connMu.Unlock()
	
	return &Connection{ID: id}, nil
}

func main() {
	pool := NewPool(5, createConnection)
	
	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			
			conn, err := pool.Get()
			if err != nil {
				fmt.Printf("Worker %d error: %v\n", id, err)
				return
			}
			
			fmt.Printf("Worker %d using connection %d\n", id, conn.ID)
			time.Sleep(100 * time.Millisecond)
			
			pool.Put(conn)
		}(i)
	}
	
	wg.Wait()
}
```

## 最佳实践

### 1. 锁粒度

```go
// ❌ 错误：锁粒度过大
func badPractice() {
	mu.Lock()
	defer mu.Unlock()
	
	// 大量与共享资源无关的操作
	data := fetchData()
	processed := processData(data)
	saveResult(processed)
}

// ✅ 正确：最小化临界区
func goodPractice() {
	data := fetchData()
	processed := processData(data)
	
	mu.Lock()
	saveResult(processed)
	mu.Unlock()
}
```

### 2. 避免死锁

```go
// ❌ 错误：嵌套锁可能导致死锁
func deadlockRisk() {
	mu1.Lock()
	mu2.Lock() // 可能死锁
	
	// ...
	
	mu2.Unlock()
	mu1.Unlock()
}

// ✅ 正确：统一锁顺序或使用 TryLock
func safeLock() {
	// 方法1：统一顺序
	if mu1.TryLock() {
		defer mu1.Unlock()
		if mu2.TryLock() {
			defer mu2.Unlock()
			// ...
		}
	}
}
```

### 3. 优先使用 Channel

```go
// ❌ 使用 Mutex 保护队列
queue := make([]Task, 0)
var mu sync.Mutex

mu.Lock()
queue = append(queue, task)
mu.Unlock()

// ✅ 使用 Channel
queue := make(chan Task, 100)
queue <- task
```

## 总结

- **WaitGroup**：等待一组 Goroutine 完成
- **Mutex**：保护共享资源
- **RWMutex**：读多写少场景
- **最佳实践**：最小化临界区、避免死锁、优先使用 Channel

---

**参考**：
- [Go sync 包文档](https://golang.org/pkg/sync/)
- [Go 内存模型](https://golang.org/ref/mem)
