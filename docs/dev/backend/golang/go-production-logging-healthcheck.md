---
title: Go 生产级工程实践：slog 结构化日志与 health check 全解
date: 2026-05-06
tags: [Golang, 工程实践, 可观测性, slog, health check]
description: 深入讲解 Go 生产服务必备的两个基础组件：用 slog 实现带 TraceID 的结构化日志，以及实现 Kubernetes 就绪/存活探针标准的 health check 端点，附完整可运行代码。
---

# Go 生产级工程实践：slog 结构化日志与 health check 全解

一个服务能不能放心部署到生产，很大程度上取决于两件事：**出了问题能不能查到**，以及**平台知不知道服务是否健康**。

这两件事分别对应：结构化日志（Structured Logging）和 health check 端点。

本文基于 Go 1.21 引入的标准库 `log/slog`，结合 Kubernetes readiness/liveness 探针规范，给出可以直接落地的完整实现。

## 为什么要用 slog

Go 1.21 之前，标准库只有 `log` 包，输出纯文本，字段无结构，无法被日志系统解析。生产环境普遍需要第三方库（`zap`、`logrus`）。

Go 1.21 引入 `log/slog`，主要解决三个问题：

1. **结构化输出**：原生支持 JSON 格式，直接对接 ELK、Loki、Datadog
2. **高性能**：`slog.Logger` + `Handler` 设计，零反射，关键路径无堆分配
3. **标准化**：减少团队间的日志库碎片化，`context` 传递 logger 成为惯例

### slog 基础用法

```go
package main

import (
    "log/slog"
    "os"
)

func main() {
    // JSON 格式输出到 stdout（生产推荐）
    logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelInfo,
    }))
    slog.SetDefault(logger)

    slog.Info("服务启动",
        "port", 8080,
        "env", "production",
    )
    // 输出：{"time":"2026-05-06T09:00:00Z","level":"INFO","msg":"服务启动","port":8080,"env":"production"}
}
```

### 日志级别动态调整

生产环境不能默认开 Debug 日志，但排查问题时又需要临时提升级别，`slog.LevelVar` 解决这个问题：

```go
var logLevel = new(slog.LevelVar) // 默认 LevelInfo，线程安全

func initLogger() *slog.Logger {
    return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: logLevel,
    }))
}

// 通过内部接口动态切换级别，无需重启服务
func setLogLevel(level slog.Level) {
    logLevel.Set(level)
}
```

---

## 关键实践：TraceID 随请求传递

生产环境最头疼的问题是：一个请求跨了 5 个函数，日志散落各处，靠时间戳根本对不上。解决方案是把 `trace_id` 注入到 `context`，每一层日志自动携带。

### 第一步：定义 context key 和 logger 注入

```go
package log

import (
    "context"
    "log/slog"
)

type contextKey struct{}

// FromContext 从 context 取出 logger，取不到就用默认
func FromContext(ctx context.Context) *slog.Logger {
    if l, ok := ctx.Value(contextKey{}).(*slog.Logger); ok {
        return l
    }
    return slog.Default()
}

// WithContext 把 logger 放入 context
func WithContext(ctx context.Context, l *slog.Logger) context.Context {
    return context.WithValue(ctx, contextKey{}, l)
}
```

### 第二步：HTTP 中间件自动注入 TraceID

```go
package middleware

import (
    "context"
    "log/slog"
    "net/http"

    applog "myapp/internal/log"

    "github.com/google/uuid"
)

func TraceLogger(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // 优先取上游传入的 X-Trace-Id，没有则生成
        traceID := r.Header.Get("X-Trace-Id")
        if traceID == "" {
            traceID = uuid.NewString()
        }

        // 为本次请求创建携带 trace_id 的专属 logger
        reqLogger := slog.Default().With(
            "trace_id", traceID,
            "method", r.Method,
            "path", r.URL.Path,
        )

        ctx := applog.WithContext(r.Context(), reqLogger)
        w.Header().Set("X-Trace-Id", traceID) // 回传给调用方
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

### 第三步：业务逻辑直接用

```go
func (s *UserService) GetUser(ctx context.Context, id int64) (*User, error) {
    logger := log.FromContext(ctx)

    logger.Info("查询用户", "user_id", id)

    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        logger.Error("用户查询失败", "user_id", id, "error", err)
        return nil, fmt.Errorf("GetUser: %w", err)
    }

    logger.Debug("用户查询成功", "user_id", id, "username", user.Name)
    return user, nil
}
```

日志输出自动带上 `trace_id`，无论链路多深都能关联：

```json
{"time":"2026-05-06T09:01:23Z","level":"INFO","msg":"查询用户","trace_id":"a3f8-...","method":"GET","path":"/api/users/42","user_id":42}
{"time":"2026-05-06T09:01:23Z","level":"DEBUG","msg":"用户查询成功","trace_id":"a3f8-...","method":"GET","path":"/api/users/42","user_id":42,"username":"pfinal"}
```

---

## Health Check：让平台知道服务状态

Kubernetes 定义了两种探针：

| 探针 | 失败后果 | 用途 |
|------|----------|------|
| **Liveness**（存活） | 重启 Pod | 检查服务是否陷入死锁/崩溃 |
| **Readiness**（就绪） | 从负载均衡摘除 | 检查服务是否能正常处理请求 |

这两个探针逻辑不同，**必须实现两个独立接口**。

### 基础实现

```go
package health

import (
    "context"
    "encoding/json"
    "net/http"
    "sync/atomic"
    "time"
)

type Checker interface {
    Check(ctx context.Context) error
    Name() string
}

type Status struct {
    Status  string            `json:"status"`            // "ok" | "degraded" | "error"
    Uptime  string            `json:"uptime"`
    Checks  map[string]string `json:"checks,omitempty"` // 各依赖的检查结果
}

type Handler struct {
    checkers []Checker
    startAt  time.Time
    ready    atomic.Bool   // 就绪状态，可在启动完成后设为 true
}

func New(checkers ...Checker) *Handler {
    return &Handler{
        checkers: checkers,
        startAt:  time.Now(),
    }
}

// SetReady 服务初始化完成后调用，标记为就绪
func (h *Handler) SetReady(v bool) {
    h.ready.Store(v)
}

// Liveness 存活检测：只要进程没死就返回 200
func (h *Handler) Liveness(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(Status{
        Status: "ok",
        Uptime: time.Since(h.startAt).Round(time.Second).String(),
    })
}

// Readiness 就绪检测：检查所有依赖（DB、缓存等）
func (h *Handler) Readiness(w http.ResponseWriter, r *http.Request) {
    if !h.ready.Load() {
        http.Error(w, `{"status":"starting"}`, http.StatusServiceUnavailable)
        return
    }

    ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
    defer cancel()

    checks := make(map[string]string, len(h.checkers))
    hasError := false

    for _, c := range h.checkers {
        if err := c.Check(ctx); err != nil {
            checks[c.Name()] = "error: " + err.Error()
            hasError = true
        } else {
            checks[c.Name()] = "ok"
        }
    }

    status := Status{
        Status:  "ok",
        Uptime:  time.Since(h.startAt).Round(time.Second).String(),
        Checks:  checks,
    }

    w.Header().Set("Content-Type", "application/json")
    if hasError {
        status.Status = "degraded"
        w.WriteHeader(http.StatusServiceUnavailable)
    } else {
        w.WriteHeader(http.StatusOK)
    }
    json.NewEncoder(w).Encode(status)
}
```

### 实现依赖检查器

```go
// DB 检查器
type DBChecker struct {
    db *sql.DB
}

func NewDBChecker(db *sql.DB) *DBChecker {
    return &DBChecker{db: db}
}

func (c *DBChecker) Name() string { return "database" }

func (c *DBChecker) Check(ctx context.Context) error {
    return c.db.PingContext(ctx)
}

// Redis 检查器
type RedisChecker struct {
    client *redis.Client
}

func NewRedisChecker(client *redis.Client) *RedisChecker {
    return &RedisChecker{client: client}
}

func (c *RedisChecker) Name() string { return "redis" }

func (c *RedisChecker) Check(ctx context.Context) error {
    return c.client.Ping(ctx).Err()
}
```

### 注册到路由

```go
func main() {
    db := initDB()
    redisClient := initRedis()

    h := health.New(
        health.NewDBChecker(db),
        health.NewRedisChecker(redisClient),
    )

    mux := http.NewServeMux()

    // 管理端点，建议用独立端口（如 :9090）
    mux.HandleFunc("GET /healthz/live", h.Liveness)
    mux.HandleFunc("GET /healthz/ready", h.Readiness)

    // 业务路由
    mux.Handle("/api/", middleware.TraceLogger(apiHandler()))

    // 服务启动完成后标记就绪
    go func() {
        if err := warmup(); err != nil {
            log.Fatal("服务预热失败", "error", err)
        }
        h.SetReady(true)
        slog.Info("服务就绪，开始接受流量")
    }()

    srv := &http.Server{Addr: ":8080", Handler: mux}
    srv.ListenAndServe()
}
```

就绪接口的响应示例：

```json
// 正常
{
  "status": "ok",
  "uptime": "2h34m15s",
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}

// 某个依赖故障时（返回 503）
{
  "status": "degraded",
  "uptime": "2h34m18s",
  "checks": {
    "database": "ok",
    "redis": "error: dial tcp: connection refused"
  }
}
```

### Kubernetes 配置

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: myapp
          image: myapp:latest
          ports:
            - containerPort: 8080
          livenessProbe:
            httpGet:
              path: /healthz/live
              port: 8080
            initialDelaySeconds: 5    # 服务启动预留时间
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /healthz/ready
              port: 8080
            initialDelaySeconds: 10   # 等待预热完成
            periodSeconds: 5
            failureThreshold: 2       # 更敏感，快速摘流量
```

> **Liveness 和 Readiness 的关键区别**：Liveness 失败 = 重启容器（谨慎，设 `failureThreshold` 宽松些）；Readiness 失败 = 从 Service 摘除（应当敏感，快速保护上游）。

---

## 完整项目结构

```
myapp/
├── cmd/server/
│   └── main.go          # 入口，组装依赖
├── internal/
│   ├── log/             # context logger 工具
│   │   └── logger.go
│   ├── health/          # health check handler
│   │   └── health.go
│   └── middleware/      # HTTP 中间件
│       └── trace.go
```

这种分层方式让 `health` 和 `log` 包互相独立，可单独测试，也方便后续替换实现。

---

## 小结

| 实践 | 核心价值 |
|------|----------|
| `slog` JSON 输出 | 日志可被 ELK/Loki 解析，结构化查询 |
| `LevelVar` 动态级别 | 不重启服务即可开启 Debug 日志 |
| `trace_id` 注入 context | 跨层日志自动关联，快速定位问题 |
| Liveness / Readiness 分离 | Liveness 保证进程健康，Readiness 保证流量正确路由 |
| `SetReady` 就绪标记 | 避免服务预热期间接到流量导致错误率飙升 |

这两个组件不是"锦上添花"，而是生产服务的**基础设施**。在服务上线之前把它们做对，能省下大量排查时间。

## 参考资料

- [Go log/slog 官方文档](https://pkg.go.dev/log/slog)
- [Kubernetes Liveness and Readiness Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Structured Logging with slog - Go Blog](https://go.dev/blog/slog)
