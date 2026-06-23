---
title: "Go 1.24 range over func 迭代器：7 种生产级模式完全指南"
date: 2026-06-19
tags:
  - golang
  - generics
  - iterator
  - performance
keywords:
  - Go 1.24 range over func
  - Go 迭代器模式
  - iter 包
  - yield 函数
  - Go 数据处理
  - 函数式迭代
category: dev/backend/golang
description: "Go 1.24 正式稳定 range over func 与 iter 包，本文通过 7 种生产级迭代器模式，展示如何构建零分配、可组合的数据管道，彻底终结手写 for 循环的历史。"
---

# Go 1.24 range over func 迭代器：7 种生产级模式完全指南

Go 1.24 将 `range over func` 与 `iter` 包正式稳定（GA），这是 Go 语言十年来最重要的语法演进之一。它不是语法糖，而是重新定义了 Go 中的数据处理范式——零分配、可组合、与 `range` 关键字深度集成。

## 为什么需要 range over func？

在此之前，Go 没有统一的迭代器协议。每个库都发明自己的迭代方式：

```go
// 旧方式：各自为政
rows.Next()           // database/sql
scanner.Scan()        // bufio.Scanner
tree.Each(func(v T){}) // 自定义回调
```

`range over func` 统一了这一切：

```go
// 新方式：统一协议
for v := range myIterator {
    // ...
}
```

## iter 包核心类型

```go
package iter

// Seq 是单值迭代器
type Seq[V any] func(yield func(V) bool)

// Seq2 是键值对迭代器
type Seq2[K, V any] func(yield func(K, V) bool)
```

`yield` 函数返回 `false` 时停止迭代，这是 `break` 的底层机制。

## 7 种生产级迭代器模式

### 模式 1：切片迭代器（基础）

```go
import "iter"

// 枚举切片，同时产出索引和值
func Enumerate[T any](s []T) iter.Seq2[int, T] {
    return func(yield func(int, T) bool) {
        for i, v := range s {
            if !yield(i, v) {
                return
            }
        }
    }
}

// 使用
for i, v := range Enumerate([]string{"a", "b", "c"}) {
    fmt.Printf("%d: %s\n", i, v)
}
```

### 模式 2：数据库结果集迭代器

```go
func QueryRows[T any](db *sql.DB, query string, scan func(*sql.Row) (T, error)) iter.Seq2[T, error] {
    return func(yield func(T, error) bool) {
        rows, err := db.Query(query)
        if err != nil {
            var zero T
            yield(zero, err)
            return
        }
        defer rows.Close()
        
        for rows.Next() {
            var dest T
            if err := rows.Scan(&dest); err != nil {
                var zero T
                if !yield(zero, err) {
                    return
                }
                continue
            }
            if !yield(dest, nil) {
                return
            }
        }
    }
}

// 使用
for user, err := range QueryRows[User](db, "SELECT * FROM users", scanUser) {
    if err != nil {
        log.Printf("scan error: %v", err)
        continue
    }
    process(user)
}
```

**零分配优势**：相比将全部结果装入 `[]User`，迭代器方式在处理百万行时内存占用恒定。

### 模式 3：Filter + Map 管道

```go
// Filter 过滤迭代器
func Filter[V any](seq iter.Seq[V], predicate func(V) bool) iter.Seq[V] {
    return func(yield func(V) bool) {
        for v := range seq {
            if predicate(v) {
                if !yield(v) {
                    return
                }
            }
        }
    }
}

// Map 转换迭代器
func Map[In, Out any](seq iter.Seq[In], transform func(In) Out) iter.Seq[Out] {
    return func(yield func(Out) bool) {
        for v := range seq {
            if !yield(transform(v)) {
                return
            }
        }
    }
}

// 组合使用
users := slices.Values(allUsers)
admins := Filter(users, func(u User) bool { return u.Role == "admin" })
names := Map(admins, func(u User) string { return u.Name })

for name := range names {
    fmt.Println(name)
}
```

### 模式 4：文件行读取迭代器

```go
func Lines(r io.Reader) iter.Seq2[string, error] {
    return func(yield func(string, error) bool) {
        scanner := bufio.NewScanner(r)
        for scanner.Scan() {
            if !yield(scanner.Text(), nil) {
                return
            }
        }
        if err := scanner.Err(); err != nil {
            yield("", err)
        }
    }
}

// 处理 1GB 日志文件，内存占用仅 scanner buffer 大小
f, _ := os.Open("access.log")
defer f.Close()

for line, err := range Lines(f) {
    if err != nil {
        break
    }
    if strings.Contains(line, "ERROR") {
        process(line)
    }
}
```

### 模式 5：分页 API 迭代器

```go
func PaginatedAPI[T any](fetch func(page int) ([]T, bool, error)) iter.Seq2[T, error] {
    return func(yield func(T, error) bool) {
        page := 1
        for {
            items, hasMore, err := fetch(page)
            if err != nil {
                var zero T
                yield(zero, err)
                return
            }
            for _, item := range items {
                if !yield(item, nil) {
                    return
                }
            }
            if !hasMore {
                return
            }
            page++
        }
    }
}

// 自动翻页，调用方无感知
for order, err := range PaginatedAPI(fetchOrders) {
    if err != nil {
        break
    }
    processOrder(order)
}
```

### 模式 6：并发迭代器（有序输出）

```go
func Parallel[In, Out any](
    seq iter.Seq[In],
    workers int,
    process func(In) Out,
) iter.Seq[Out] {
    return func(yield func(Out) bool) {
        type indexed struct {
            idx int
            val Out
        }
        
        // 使用有序 channel 保证输出顺序
        ch := make(chan indexed, workers*2)
        var wg sync.WaitGroup
        
        inputCh := make(chan struct{ idx int; val In }, workers)
        
        for i := 0; i < workers; i++ {
            wg.Add(1)
            go func() {
                defer wg.Done()
                for item := range inputCh {
                    ch <- indexed{item.idx, process(item.val)}
                }
            }()
        }
        
        go func() {
            idx := 0
            for v := range seq {
                inputCh <- struct{ idx int; val In }{idx, v}
                idx++
            }
            close(inputCh)
            wg.Wait()
            close(ch)
        }()
        
        // 按序收集并 yield
        buf := make(map[int]Out)
        next := 0
        for item := range ch {
            buf[item.idx] = item.val
            for {
                if v, ok := buf[next]; ok {
                    if !yield(v) {
                        return
                    }
                    delete(buf, next)
                    next++
                } else {
                    break
                }
            }
        }
    }
}
```

### 模式 7：带取消的上下文迭代器

```go
func WithContext[V any](ctx context.Context, seq iter.Seq[V]) iter.Seq2[V, error] {
    return func(yield func(V, error) bool) {
        for v := range seq {
            select {
            case <-ctx.Done():
                var zero V
                yield(zero, ctx.Err())
                return
            default:
                if !yield(v, nil) {
                    return
                }
            }
        }
    }
}

// 支持超时取消的迭代
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

for item, err := range WithContext(ctx, expensiveIter) {
    if err != nil {
        log.Printf("cancelled: %v", err)
        break
    }
    process(item)
}
```

## 性能对比

| 方式 | 100 万条记录内存 | 代码行数 |
|------|----------------|---------|
| 全量装入 `[]T` | ~200MB | 少 |
| 手写 for + 回调 | 恒定 | 多且混乱 |
| range over func | 恒定 | 少且清晰 |

## 避坑指南

**1. yield 不能并发调用**

```go
// ❌ 错误：并发调用 yield
go func() { yield(v) }()

// ✅ 正确：yield 始终在同一 goroutine 中调用
```

**2. break 通过 yield 返回 false 实现**

```go
for v := range myIter {
    if condition {
        break // 这会让 yield 下次返回 false，迭代器应检查并 return
    }
}
```

**3. 迭代器不是 goroutine**

迭代器函数在调用者的 goroutine 中同步执行，没有额外调度开销，这正是零分配的原因。

## 与 slices/maps 标准库集成

Go 1.24 的 `slices` 和 `maps` 包已全面支持迭代器：

```go
import "slices"

// 收集迭代器结果到切片
result := slices.Collect(Filter(users, isAdmin))

// 排序迭代器
sorted := slices.SortedFunc(allUsers, func(a, b User) int {
    return strings.Compare(a.Name, b.Name)
})
```

## 总结

`range over func` 让 Go 拥有了原生、零分配、可组合的迭代器协议。这 7 种模式覆盖了生产中 90% 的数据处理场景——从数据库查询到文件处理，从 API 翻页到并发流水线。

**相关阅读**：
- [Go 1.26 工具链深度实战](/dev/backend/golang/go-1-26-toolchain-new-expr-generics-cgo-2026)
- [Go WebSocket 高并发实时通信实战](/dev/backend/golang/go-websocket-high-concurrency-2026)
- [Go 后端现代工程 7 大原则](/thinking/method/Modern-Go-Backend-Engineering)
