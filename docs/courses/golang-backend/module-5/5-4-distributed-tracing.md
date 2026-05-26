---
title: "Lesson 5.4: 分布式追踪"
description: "OpenTelemetry、Jaeger、SkyWalking"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, tracing, opentelemetry, jaeger, lesson]
---

# Lesson 5.4: 分布式追踪

## 学习目标

- 理解 Trace 和 Span 的概念
- 集成 OpenTelemetry

---

## 1. 核心概念

```
Service A (API Gateway)
    │
    ├── Span: POST /api/order
    │   ├── Context Propagation (Trace-ID, Span-ID)
    │   │
    │   ├── Service B (Order Service)
    │   │   ├── Span: Validate Order
    │   │   ├── Span: Create Order (DB)
    │   │   └── Span: Publish Event (Kafka)
    │   │
    │   └── Service C (Payment Service)
    │       ├── Span: Process Payment
    │       └── Span: Update Balance
    │
    └── Response
```

## 2. OpenTelemetry 集成

```go
// 初始化 OTel
func initTracer() {
    exporter, _ := otlptracehttp.New(context.Background())
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName("user-service"),
        )),
    )
    otel.SetTracerProvider(tp)
}
```

## 推荐阅读

- [从 trace 到洞察：Go 项目的可观测性闭环实践](/thinking/method/Go-Observability-Practice)
- [别再盲接 OTel：Go 可观察性接入的 8 个大坑](/thinking/method/Go-OTel-Pitfalls)
- [go-distributed-tracing](/dev/backend/golang/go-distributed-tracing)
