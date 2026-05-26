---
title: "Lesson 5.1: 可观测性基础"
description: "日志、指标、Trace 三大支柱概述"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, observability, monitoring, logging, tracing, lesson]
---

# Lesson 5.1: 可观测性基础

## 学习目标

- 理解可观测性的三大支柱
- 知道什么时候用什么工具

---

## 1. 三大支柱

| 支柱 | 数据特征 | 工具 |
|------|----------|------|
| **日志 (Logs)** | 离散事件 | ELK, Loki, Devslog |
| **指标 (Metrics)** | 聚合数据 | Prometheus, Grafana |
| **链路追踪 (Traces)** | 请求生命周期 | Jaeger, OpenTelemetry |

### 三者的关系

```
用户请求
    ↓
[Trace: request-123]
    ├── Span: HTTP GET /api/users
    │   ├── Log: "query executed in 15ms"
    │   └── Metric: http_request_duration_ms{method="GET"} 15
    ├── Span: DB query
    │   ├── Log: "rows returned: 42"
    │   └── Metric: db_query_count{query="users"} +1
    └── Span: Cache lookup
```

## 2. Go 中的可观测性

```go
// OpenTelemetry SDK（统一标准）
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/trace"
)

tracer := otel.Tracer("user-service")

func GetUser(ctx context.Context, id string) (*User, error) {
    ctx, span := tracer.Start(ctx, "GetUser")
    defer span.End()

    span.SetAttributes(attribute.String("user.id", id))
    // ...业务逻辑
}
```

## 推荐阅读

- [从 trace 到洞察：Go 项目的可观测性闭环实践](/thinking/method/Go-Observability-Practice)
- [opentelemetry-guide](/dev/system/opentelemetry-guide)
