---
title: Go Context 深度解析：超时、取消与值传递
date: 2026-04-27
tags: [Golang, Context, 并发]
description: 深入理解 Go context 包的设计原理与实战用法：WithCancel、WithTimeout、WithDeadline、WithValue，以及在 HTTP、gRPC、数据库等场景下的最佳实践。
---

# Go Context 深度解析：超时、取消与值传递

`context` 包是 Go 并发编程的核心基础设施。它解决了一个关键问题：**如何在 goroutine 树中传播取消信号、超时和请求级别的元数据**。

## 一、为什么需要 Context

考虑一个典型的 HTTP 请求处理链：

```
HTTP请求 → Handler → Service → Repository → 数据库/缓存/第三方API
                                    ↓（同时启动多个 goroutine）
                             goroutine A
                             goroutine B
                             goroutine C
```

**问题**：当客户端断开连接，所有下游的工作都应该立即停止。但这些 goroutine 分布在不同的层次，如何优雅地告知它们"该停了"？

Context 就是为此而生的。

## 二、Context 接口

```go
type Context interface {
    // 返回 Context 的截止时间（如果有）
    Deadline() (deadline time.Time, ok bool)
    
    // 返回一个 channel，当 Context 被取消时会关闭
    Done() <-chan struct{}
    
    // Context 被取消的原因
    // 未取消时返回 nil
    // 超时取消返回 context.DeadlineExceeded
    // 主动取消返回 context.Canceled
    Err() error
    
    // 获取 Context 中存储的值
    Value(key any) any
}
```

## 三、四种 Context 创建方式

### 3.1 context.Background() 和 context.TODO()

```go
// Background：程序入口、main 函数、测试函数使用
ctx := context.Background()

// TODO：临时占位，表示"还不确定用什么 context"
ctx := context.TODO()
```

这两者功能相同（都是空 Context，永不取消），语义上有区别：
- `Background`：明确的根 Context
- `TODO`：表示待完善的占位符

### 3.2 WithCancel — 手动取消

```go
func WithCancel(parent Context) (ctx Context, cancel CancelFunc)
```

```go
func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel() // 最佳实践：总是在调用栈中 defer cancel()
    
    go worker(ctx, "worker-1")
    go worker(ctx, "worker-2")
    
    time.Sleep(3 * time.Second)
    cancel() // 发送取消信号
    time.Sleep(1 * time.Second) // 等待 goroutine 退出
}

func worker(ctx context.Context, name string) {
    for {
        select {
        case <-ctx.Done():
            fmt.Printf("%s 收到取消信号，退出: %v\n", name, ctx.Err())
            return
        default:
            fmt.Printf("%s 工作中...\n", name)
            time.Sleep(1 * time.Second)
        }
    }
}
```

### 3.3 WithTimeout — 超时控制

```go
func WithTimeout(parent Context, timeout time.Duration) (Context, CancelFunc)
```

```go
func fetchData(url string) ([]byte, error) {
    // 设置 5 秒超时
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return nil, err
    }
    
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        // 超时时，err 会包含 "context deadline exceeded"
        if errors.Is(err, context.DeadlineExceeded) {
            return nil, fmt.Errorf("请求超时: %w", err)
        }
        return nil, err
    }
    defer resp.Body.Close()
    
    return io.ReadAll(resp.Body)
}
```

### 3.4 WithDeadline — 绝对截止时间

```go
func WithDeadline(parent Context, d time.Time) (Context, CancelFunc)
```

```go
// WithTimeout 是 WithDeadline 的语法糖
// context.WithTimeout(ctx, 5*time.Second)
// 等价于
// context.WithDeadline(ctx, time.Now().Add(5*time.Second))

// 适合在多个操作间分配固定预算
deadline := time.Now().Add(10 * time.Second)
ctx, cancel := context.WithDeadline(context.Background(), deadline)
defer cancel()

// 查询操作，在同一 deadline 下
result1, err := queryDB(ctx)
result2, err := queryCache(ctx)
```

### 3.5 WithValue — 传递元数据

```go
func WithValue(parent Context, key, val any) Context
```

```go
// 定义类型安全的 key（避免用字符串）
type contextKey string

const (
    RequestIDKey contextKey = "requestID"
    UserIDKey    contextKey = "userID"
    TraceIDKey   contextKey = "traceID"
)

// 中间件：注入 Request ID
func RequestIDMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        requestID := r.Header.Get("X-Request-ID")
        if requestID == "" {
            requestID = uuid.New().String()
        }
        
        ctx := context.WithValue(r.Context(), RequestIDKey, requestID)
        w.Header().Set("X-Request-ID", requestID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// 在任意层级提取
func getRequestID(ctx context.Context) string {
    val := ctx.Value(RequestIDKey)
    if id, ok := val.(string); ok {
        return id
    }
    return ""
}

// 日志中携带 Request ID
func processRequest(ctx context.Context) {
    requestID := getRequestID(ctx)
    log.Printf("[%s] 开始处理请求", requestID)
}
```

## 四、Context 树结构

Context 形成一棵树，父节点取消会传播到所有子节点：

```
Background
    └── WithCancel(A)
            ├── WithTimeout(B, 5s)
            │       └── WithValue(C, userID=42)
            └── WithTimeout(D, 10s)
```

当 A 取消时，B、C、D 都会被取消；当 B 超时时，只有 C 被取消，D 不受影响。

```go
func contextTree() {
    rootCtx, rootCancel := context.WithCancel(context.Background())
    
    // 子 Context
    childCtx, childCancel := context.WithTimeout(rootCtx, 5*time.Second)
    defer childCancel()
    
    // 取消父节点 → 子节点自动取消
    go func() {
        time.Sleep(2 * time.Second)
        rootCancel() // 2 秒后取消根 Context
    }()
    
    select {
    case <-childCtx.Done():
        // 会在 2 秒后触发（根 Context 被取消），而不是 5 秒
        fmt.Println("child canceled:", childCtx.Err())
    }
}
```

## 五、生产实践：常见场景

### 5.1 HTTP Handler 中使用

```go
func userHandler(w http.ResponseWriter, r *http.Request) {
    // r.Context() 包含请求的生命周期
    ctx := r.Context()
    
    userID := chi.URLParam(r, "id")
    
    // 为数据库查询设置子超时（不超过请求整体超时）
    dbCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
    defer cancel()
    
    user, err := userService.GetUser(dbCtx, userID)
    if err != nil {
        if errors.Is(err, context.DeadlineExceeded) {
            http.Error(w, "数据库查询超时", http.StatusGatewayTimeout)
            return
        }
        http.Error(w, "服务内部错误", http.StatusInternalServerError)
        return
    }
    
    json.NewEncoder(w).Encode(user)
}
```

### 5.2 数据库操作

```go
// database/sql 原生支持 Context
func (r *UserRepo) GetUser(ctx context.Context, id int) (*User, error) {
    var user User
    
    err := r.db.QueryRowContext(ctx,
        "SELECT id, name, email FROM users WHERE id = ?", id,
    ).Scan(&user.ID, &user.Name, &user.Email)
    
    if err == sql.ErrNoRows {
        return nil, ErrNotFound
    }
    if err != nil {
        return nil, fmt.Errorf("GetUser: %w", err)
    }
    
    return &user, nil
}

// 事务中使用 Context
func (r *UserRepo) CreateWithProfile(ctx context.Context, user *User, profile *Profile) error {
    tx, err := r.db.BeginTx(ctx, nil)
    if err != nil {
        return fmt.Errorf("begin tx: %w", err)
    }
    defer tx.Rollback() // 如果 Commit 了，Rollback 是 no-op
    
    if _, err := tx.ExecContext(ctx,
        "INSERT INTO users(name, email) VALUES(?, ?)", user.Name, user.Email,
    ); err != nil {
        return fmt.Errorf("insert user: %w", err)
    }
    
    if _, err := tx.ExecContext(ctx,
        "INSERT INTO profiles(user_id, bio) VALUES(?, ?)", user.ID, profile.Bio,
    ); err != nil {
        return fmt.Errorf("insert profile: %w", err)
    }
    
    return tx.Commit()
}
```

### 5.3 并发任务的统一取消

```go
// 并发抓取多个 URL，任意一个失败则取消其他
func fetchAll(ctx context.Context, urls []string) ([]string, error) {
    ctx, cancel := context.WithCancel(ctx)
    defer cancel()
    
    results := make([]string, len(urls))
    errCh := make(chan error, 1)
    
    var wg sync.WaitGroup
    for i, url := range urls {
        wg.Add(1)
        go func(i int, url string) {
            defer wg.Done()
            
            body, err := fetchURL(ctx, url)
            if err != nil {
                select {
                case errCh <- err:
                    cancel() // 取消其他 goroutine
                default:
                }
                return
            }
            results[i] = body
        }(i, url)
    }
    
    wg.Wait()
    
    select {
    case err := <-errCh:
        return nil, err
    default:
        return results, nil
    }
}
```

### 5.4 优雅退出

```go
func main() {
    ctx, stop := signal.NotifyContext(context.Background(),
        os.Interrupt, syscall.SIGTERM,
    )
    defer stop()
    
    server := &http.Server{Addr: ":8080", Handler: router}
    
    // 在后台运行服务器
    go func() {
        if err := server.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatalf("服务器启动失败: %v", err)
        }
    }()
    
    // 等待退出信号
    <-ctx.Done()
    log.Println("收到退出信号，开始优雅关闭...")
    
    // 给现有请求最多 30 秒完成
    shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    
    if err := server.Shutdown(shutdownCtx); err != nil {
        log.Fatalf("强制关闭服务器: %v", err)
    }
    
    log.Println("服务器已关闭")
}
```

## 六、Context 使用规范

### ✅ 正确做法

```go
// 1. Context 作为函数第一个参数
func DoSomething(ctx context.Context, arg int) error

// 2. 不要将 Context 存储在结构体中（测试和复用会变难）
// ❌
type Service struct {
    ctx context.Context  // 不推荐
}

// ✅ 通过函数参数传递
func (s *Service) Process(ctx context.Context) error

// 3. 总是 defer cancel()
ctx, cancel := context.WithTimeout(parent, time.Second)
defer cancel() // 即使提前返回也会调用，防止 goroutine 泄漏

// 4. 检查 ctx.Done() 在循环和长操作中
for {
    select {
    case <-ctx.Done():
        return ctx.Err()
    default:
        // 继续工作
    }
}
```

### ❌ 反模式

```go
// 1. 传入 nil Context（会 panic）
func bad(ctx context.Context) {
    doWork(nil) // ❌
    doWork(context.Background()) // ✅
}

// 2. WithValue 使用内置类型作 key（容易冲突）
ctx = context.WithValue(ctx, "userID", 42)  // ❌ 字符串 key
ctx = context.WithValue(ctx, userIDKey, 42) // ✅ 自定义类型 key

// 3. 在 WithValue 中存储大量数据（Context 不是缓存层）
ctx = context.WithValue(ctx, "user", largeUserObject) // ❌
// ✅ 只存元数据：RequestID、TraceID、UserID
```

## 七、常见错误判断

```go
// 超时 vs 主动取消
ctx, cancel := context.WithTimeout(context.Background(), time.Second)
defer cancel()

// 做一些耗时操作...
if ctx.Err() != nil {
    if errors.Is(ctx.Err(), context.DeadlineExceeded) {
        fmt.Println("超时了")
    } else if errors.Is(ctx.Err(), context.Canceled) {
        fmt.Println("被主动取消了")
    }
}
```

## 八、总结

| 函数 | 用途 | 何时使用 |
|------|------|----------|
| `Background()` | 根 Context | main、初始化 |
| `TODO()` | 占位 Context | 待完善的代码 |
| `WithCancel` | 手动取消 | 需要主动控制停止 |
| `WithTimeout` | 相对超时 | HTTP 请求、RPC 调用 |
| `WithDeadline` | 绝对截止时间 | 多操作共享时间预算 |
| `WithValue` | 传递元数据 | RequestID、TraceID、UserID |

**核心原则**：
1. Context 只传递请求级元数据，不存业务数据
2. 总是 `defer cancel()` 防止资源泄漏
3. 尊重上游传入的 Context，不要忽略它
4. 在所有阻塞操作（IO、Channel）中监听 `ctx.Done()`
