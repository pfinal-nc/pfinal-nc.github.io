---
title: "Go 中间件设计模式"
date: 2026-04-22 00:00:00
author: PFinal南丞
description: "深入学习 Go 语言中间件设计模式，掌握洋葱模型、链式调用、AOP 编程等核心技术，构建可扩展的 HTTP 中间件系统。"
keywords:
  - Go
  - 中间件
  - Middleware
  - 洋葱模型
  - AOP
  - Gin
  - HTTP
tags:
  - golang
  - middleware
  - design-pattern
  - web-development
---

# Go 中间件设计模式

中间件是 Web 开发中的重要概念，它允许我们在请求处理流程中插入可复用的功能模块。本文将介绍 Go 语言中常用的中间件设计模式。

## 中间件基础

### 什么是中间件

中间件是位于请求和响应之间的处理函数，可以：

- 在请求到达处理器之前执行操作
- 在响应返回客户端之前执行操作
- 决定是否继续后续处理

### 洋葱模型

```
请求 → [中间件1] → [中间件2] → [中间件3] → [处理器]
响应 ← [中间件1] ← [中间件2] ← [中间件3] ← [处理器]

        请求流向
        ─────────▶
┌─────────────────────────────────────────┐
│  中间件1                                │
│  ┌───────────────────────────────────┐  │
│  │  中间件2                          │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  中间件3                    │  │  │
│  │  │  ┌───────────────────────┐  │  │  │
│  │  │  │       处理器          │  │  │  │
│  │  │  └───────────────────────┘  │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
        ◀─────────
        响应流向
```

## 基础实现

### 标准库实现

```go
package main

import (
    "fmt"
    "net/http"
    "time"
)

// Middleware 中间件类型
type Middleware func(http.Handler) http.Handler

// Chain 中间件链
func Chain(middlewares ...Middleware) Middleware {
    return func(final http.Handler) http.Handler {
        for i := len(middlewares) - 1; i >= 0; i-- {
            final = middlewares[i](final)
        }
        return final
    }
}

// LoggingMiddleware 日志中间件
func LoggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        
        // 包装 ResponseWriter 以获取状态码
        wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
        
        next.ServeHTTP(wrapped, r)
        
        duration := time.Since(start)
        fmt.Printf("[%s] %s %s %d %v\n", 
            time.Now().Format("2006-01-02 15:04:05"),
            r.Method, 
            r.URL.Path, 
            wrapped.statusCode,
            duration,
        )
    })
}

// responseWriter 包装 http.ResponseWriter
type responseWriter struct {
    http.ResponseWriter
    statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.statusCode = code
    rw.ResponseWriter.WriteHeader(code)
}

// RecoveryMiddleware 恢复中间件
func RecoveryMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                fmt.Printf("Panic recovered: %v\n", err)
                http.Error(w, "Internal Server Error", http.StatusInternalServerError)
            }
        }()
        next.ServeHTTP(w, r)
    })
}

// AuthMiddleware 认证中间件
func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")
        if token == "" {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }
        // 验证 token...
        next.ServeHTTP(w, r)
    })
}

func main() {
    // 处理器
    handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("Hello, World!"))
    })
    
    // 构建中间件链
    chain := Chain(
        RecoveryMiddleware,
        LoggingMiddleware,
        AuthMiddleware,
    )
    
    http.Handle("/", chain(handler))
    http.ListenAndServe(":8080", nil)
}
```

## Gin 中间件

### 基础中间件

```go
package main

import (
    "fmt"
    "time"
    
    "github.com/gin-gonic/gin"
)

// Logger 日志中间件
func Logger() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        path := c.Request.URL.Path
        
        // 继续处理请求
        c.Next()
        
        // 请求处理完成后
        latency := time.Since(start)
        status := c.Writer.Status()
        
        fmt.Printf("[%s] %s %s %d %v\n",
            time.Now().Format("2006-01-02 15:04:05"),
            c.Request.Method,
            path,
            status,
            latency,
        )
    }
}

// Recovery 恢复中间件
func Recovery() gin.HandlerFunc {
    return func(c *gin.Context) {
        defer func() {
            if err := recover(); err != nil {
                c.JSON(500, gin.H{
                    "error": "Internal Server Error",
                })
            }
        }()
        c.Next()
    }
}

// CORS 跨域中间件
func CORS() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
        c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        
        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }
        
        c.Next()
    }
}

// RateLimit 限流中间件
func RateLimit(maxRequests int, window time.Duration) gin.HandlerFunc {
    type client struct {
        count  int
        resetAt time.Time
    }
    
    clients := make(map[string]*client)
    
    return func(c *gin.Context) {
        ip := c.ClientIP()
        now := time.Now()
        
        cl, exists := clients[ip]
        if !exists || now.After(cl.resetAt) {
            clients[ip] = &client{
                count:   1,
                resetAt: now.Add(window),
            }
            c.Next()
            return
        }
        
        if cl.count >= maxRequests {
            c.JSON(429, gin.H{"error": "too many requests"})
            c.Abort()
            return
        }
        
        cl.count++
        c.Next()
    }
}

func main() {
    r := gin.New()
    
    // 全局中间件
    r.Use(Recovery())
    r.Use(Logger())
    r.Use(CORS())
    
    // 路由组中间件
    api := r.Group("/api")
    api.Use(RateLimit(100, time.Minute))
    {
        api.GET("/users", func(c *gin.Context) {
            c.JSON(200, gin.H{"users": []})
        })
    }
    
    r.Run(":8080")
}
```

### 高级中间件

```go
package middleware

import (
    "bytes"
    "io"
    "time"
    
    "github.com/gin-gonic/gin"
)

// RequestLogger 请求日志中间件
func RequestLogger() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 读取请求体
        body, _ := io.ReadAll(c.Request.Body)
        c.Request.Body = io.NopCloser(bytes.NewBuffer(body))
        
        // 包装 ResponseWriter
        blw := &bodyLogWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
        c.Writer = blw
        
        start := time.Now()
        c.Next()
        duration := time.Since(start)
        
        // 记录日志
        log.Info().
            Str("method", c.Request.Method).
            Str("path", c.Request.URL.Path).
            Int("status", c.Writer.Status()).
            Dur("duration", duration).
            Str("request_body", string(body)).
            Str("response_body", blw.body.String()).
            Msg("request completed")
    }
}

type bodyLogWriter struct {
    gin.ResponseWriter
    body *bytes.Buffer
}

func (w bodyLogWriter) Write(b []byte) (int, error) {
    w.body.Write(b)
    return w.ResponseWriter.Write(b)
}

// Timeout 超时中间件
func Timeout(duration time.Duration) gin.HandlerFunc {
    return func(c *gin.Context) {
        ctx, cancel := context.WithTimeout(c.Request.Context(), duration)
        defer cancel()
        
        c.Request = c.Request.WithContext(ctx)
        
        done := make(chan struct{})
        go func() {
            c.Next()
            close(done)
        }()
        
        select {
        case <-done:
            return
        case <-ctx.Done():
            c.JSON(504, gin.H{"error": "request timeout"})
            c.Abort()
        }
    }
}

// Cache 缓存中间件
func Cache(duration time.Duration) gin.HandlerFunc {
    cache := make(map[string]cacheEntry)
    
    return func(c *gin.Context) {
        if c.Request.Method != "GET" {
            c.Next()
            return
        }
        
        key := c.Request.URL.String()
        entry, exists := cache[key]
        
        if exists && time.Since(entry.created) < duration {
            c.Data(entry.status, entry.contentType, entry.data)
            c.Abort()
            return
        }
        
        // 包装 ResponseWriter
        blw := &bodyLogWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
        c.Writer = blw
        
        c.Next()
        
        // 缓存响应
        cache[key] = cacheEntry{
            status:      c.Writer.Status(),
            contentType: c.Writer.Header().Get("Content-Type"),
            data:        blw.body.Bytes(),
            created:     time.Now(),
        }
    }
}

type cacheEntry struct {
    status      int
    contentType string
    data        []byte
    created     time.Time
}
```

## 中间件组合

### 条件中间件

```go
// Conditional 条件中间件
func Conditional(condition func(*gin.Context) bool, middleware gin.HandlerFunc) gin.HandlerFunc {
    return func(c *gin.Context) {
        if condition(c) {
            middleware(c)
        } else {
            c.Next()
        }
    }
}

// 使用示例
r.Use(Conditional(
    func(c *gin.Context) bool {
        return c.Request.URL.Path != "/health"
    },
    AuthMiddleware(),
))
```

### 跳过中间件

```go
// Skipper 跳过函数类型
type Skipper func(*gin.Context) bool

// DefaultSkipper 默认跳过函数
func DefaultSkipper(c *gin.Context) bool {
    return false
}

// PathSkipper 路径跳过
func PathSkipper(paths ...string) Skipper {
    return func(c *gin.Context) bool {
        for _, path := range paths {
            if c.Request.URL.Path == path {
                return true
            }
        }
        return false
    }
}

// MiddlewareWithSkipper 带跳过功能的中间件
func MiddlewareWithSkipper(middleware gin.HandlerFunc, skipper Skipper) gin.HandlerFunc {
    if skipper == nil {
        skipper = DefaultSkipper
    }
    
    return func(c *gin.Context) {
        if skipper(c) {
            c.Next()
            return
        }
        middleware(c)
    }
}

// 使用示例
r.Use(MiddlewareWithSkipper(
    AuthMiddleware(),
    PathSkipper("/login", "/register", "/health"),
))
```

## 最佳实践

### 1. 中间件顺序

```go
// 推荐顺序
r.Use(
    Recovery(),      // 1. 恢复（最外层）
    Logger(),        // 2. 日志
    CORS(),          // 3. 跨域
    RateLimit(),     // 4. 限流
    Auth(),          // 5. 认证
    ACL(),           // 6. 授权
)
```

### 2. 错误处理

```go
// 统一错误处理中间件
func ErrorHandler() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Next()
        
        if len(c.Errors) > 0 {
            err := c.Errors.Last()
            
            // 根据错误类型返回不同响应
            switch err.Type {
            case gin.ErrorTypeBind:
                c.JSON(400, gin.H{"error": "invalid request"})
            case gin.ErrorTypeRender:
                c.JSON(500, gin.H{"error": "render error"})
            default:
                c.JSON(500, gin.H{"error": "internal error"})
            }
        }
    }
}
```

### 3. 上下文传递

```go
// 在上下文中存储数据
func SetUser() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := c.GetHeader("X-User-ID")
        c.Set("userID", userID)
        c.Next()
    }
}

// 在处理器中获取
func Handler(c *gin.Context) {
    userID, exists := c.Get("userID")
    if !exists {
        c.JSON(401, gin.H{"error": "unauthorized"})
        return
    }
    // 使用 userID...
}
```

## 总结

中间件是构建可扩展 Web 应用的核心模式，通过合理设计和组合中间件，可以实现代码复用和关注点分离。

---

**参考资源：**
- [Gin 中间件文档](https://gin-gonic.com/docs/examples/custom-middleware/)
- [Go 语言设计模式](https://refactoringguru.cn/design-patterns/go)
