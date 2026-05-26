---
title: "Lesson 2.5: 中间件开发"
description: "日志、CORS、限流、熔断、链路追踪中间件的实现"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, middleware, gin, lesson]
---

# Lesson 2.5: 中间件开发

## 学习目标

- 掌握常见中间件的实现模式
- 理解中间件链的执行流程

---

## 1. 日志中间件

```go
func Logger() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        path := c.Request.URL.Path

        // 处理请求
        c.Next()

        // 请求结束后记录
        latency := time.Since(start)
        status := c.Writer.Status()

        log.Printf("[%d] %s %s %v",
            status,
            c.Request.Method,
            path,
            latency,
        )
    }
}
```

## 2. CORS 中间件

```go
func CORS(allowedOrigins []string) gin.HandlerFunc {
    return func(c *gin.Context) {
        origin := c.Request.Header.Get("Origin")

        for _, allowed := range allowedOrigins {
            if origin == allowed || allowed == "*" {
                c.Header("Access-Control-Allow-Origin", origin)
                break
            }
        }

        c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        c.Header("Access-Control-Max-Age", "86400")

        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }

        c.Next()
    }
}
```

## 3. 限流中间件

```go
func RateLimit(rate int, burst int) gin.HandlerFunc {
    limiter := rate.NewLimiter(rate.Limit(rate), burst)
    return func(c *gin.Context) {
        if !limiter.Allow() {
            c.AbortWithStatusJSON(429, gin.H{
                "error": "too many requests",
            })
            return
        }
        c.Next()
    }
}
```

## 推荐阅读

- [go-middleware-patterns](/dev/backend/golang/go-middleware-patterns)
- [circuit-breaker-rate-limiting](/dev/backend/golang/circuit-breaker-rate-limiting)
