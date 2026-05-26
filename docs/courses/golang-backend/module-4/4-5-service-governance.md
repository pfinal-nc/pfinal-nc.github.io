---
title: "Lesson 4.5: 服务治理"
description: "熔断、降级、限流、重试、超时控制"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, microservices, circuit-breaker, rate-limiting, lesson]
---

# Lesson 4.5: 服务治理

## 学习目标

- 掌握微服务治理的核心模式

---

## 1. 治理模式对比

| 模式 | 目的 | Go 常用库 |
|------|------|-----------|
| 熔断 | 防止级联故障 | `gobreaker` |
| 降级 | 提供降级响应 | 手动实现 |
| 限流 | 保护自身资源 | `rate` (golang.org/x/time) |
| 重试 | 容忍临时故障 | 手动 / `backoff` |
| 超时 | 避免等待堆积 | `context.WithTimeout` |

### 熔断器示例

```go
import "github.com/sony/gobreaker"

cb := gobreaker.NewCircuitBreaker(gobreaker.Settings{
    Name:        "user-service",
    MaxRequests: 3,          // 半开后最多放行 3 个请求
    Interval:    60 * time.Second,
    Timeout:     30 * time.Second,  // 半开等待时间
    ReadyToTrip: func(counts gobreaker.Counts) bool {
        failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
        return counts.Requests >= 3 && failureRatio >= 0.6
    },
})

body, err := cb.Execute(func() (interface{}, error) {
    return http.Get("http://user-service/api/users")
})
```

## 推荐阅读

- [circuit-breaker-rate-limiting](/dev/backend/golang/circuit-breaker-rate-limiting)
