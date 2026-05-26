---
title: "Lesson 5.5: Go 可观测性实战"
description: "埋点、上下文传播、性能分析"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, observability, opentelemetry, lesson]
---

# Lesson 5.5: Go 可观测性实战

## 学习目标

- 在 Go 应用中实现全链路可观测性

---

## 1. 三层埋点

```go
func handleRequest(ctx context.Context, req *Request) {
    // 1. 链路追踪
    ctx, span := tracer.Start(ctx, "handleRequest")
    defer span.End()

    // 2. 业务日志
    log.InfoContext(ctx, "processing request",
        "user_id", req.UserID,
        "action", req.Action,
    )

    // 3. 性能指标
    timer := prometheus.NewTimer(httpRequestDuration.WithLabelValues(req.Action))
    defer timer.ObserveDuration()
}
```

## 关键点

- **上下文传播**：通过 `context.Context` 传递 Trace 信息
- **自动埋点**：使用 Middleware/Interceptor 自动采集
- **不要过度埋点**：聚焦关键路径（外部调用、数据库、缓存）

## 推荐阅读

- [从 trace 到洞察：Go 项目的可观测性闭环实践](/thinking/method/Go-Observability-Practice)
- [别再盲接 OTel：Go 可观察性接入的 8 个大坑](/thinking/method/Go-OTel-Pitfalls)
