---
title: "别再盲接 OTel：Go 可观察性接入的 8 个大坑"
description: "总结 Go 项目接入 OpenTelemetry 时常见的 8 个坑点，包括性能问题、上下文传播、采样策略等，帮助你少走弯路。"
keywords:
  - OpenTelemetry
  - Go OTel
  - 可观测性
  - 链路追踪
  - 最佳实践
author: PFinal南丞
date: 2026-04-22
tags:
  - golang
  - opentelemetry
  - observability
  - pitfalls
---

# 别再盲接 OTel：Go 可观察性接入的 8 个大坑

> OpenTelemetry 很强大，但使用不当会带来性能问题。本文总结了 8 个常见坑点，帮你避开这些陷阱。

## 坑 1：没有正确传播 Context

### ❌ 错误做法

```go
func handler(c *gin.Context) {
    // 丢失了上游的 trace context
    processOrder(c.Request.Context())
}

func processOrder(ctx context.Context) {
    // 创建新的 span，但没有关联父 span
    _, span := tracer.Start(context.Background(), "process_order")
    defer span.End()
}
```

### ✅ 正确做法

```go
func handler(c *gin.Context) {
    // 使用请求中的 context
    processOrder(c.Request.Context())
}

func processOrder(ctx context.Context) {
    // 正确传递 context，自动关联父 span
    ctx, span := tracer.Start(ctx, "process_order")
    defer span.End()
    
    // 后续调用继续传递 ctx
    validateOrder(ctx, order)
}
```

## 坑 2：创建太多 Span

### ❌ 错误做法

```go
func processOrder(ctx context.Context, order Order) error {
    for _, item := range order.Items {
        ctx, span := tracer.Start(ctx, "process_item")
        // 处理每个 item 都创建 span，数量太多
        span.End()
    }
}
```

### ✅ 正确做法

```go
func processOrder(ctx context.Context, order Order) error {
    ctx, span := tracer.Start(ctx, "process_order")
    defer span.End()
    
    span.SetAttributes(attribute.Int("item_count", len(order.Items)))
    
    for _, item := range order.Items {
        // 批量处理，不创建过多 span
        processItem(item)
    }
}
```

## 坑 3：没有设置采样策略

### ❌ 错误做法

```go
// 默认采样，高流量下数据量爆炸
provider := sdktrace.NewTracerProvider()
```

### ✅ 正确做法

```go
// 使用概率采样
provider := sdktrace.NewTracerProvider(
    sdktrace.WithSampler(sdktrace.TraceIDRatioBased(0.1)), // 10% 采样
)

// 或者使用 ParentBased 采样
provider := sdktrace.NewTracerProvider(
    sdktrace.WithSampler(sdktrace.ParentBased(
        sdktrace.TraceIDRatioBased(0.1),
    )),
)
```

## 坑 4：Span 没有正确结束

### ❌ 错误做法

```go
func processOrder(ctx context.Context) {
    _, span := tracer.Start(ctx, "process_order")
    
    if err := validateOrder(); err != nil {
        // 提前返回，span 没有结束
        return err
    }
    
    span.End() // 可能执行不到
}
```

### ✅ 正确做法

```go
func processOrder(ctx context.Context) error {
    ctx, span := tracer.Start(ctx, "process_order")
    defer span.End() // 确保 span 总是结束
    
    if err := validateOrder(); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return err
    }
    
    return nil
}
```

## 坑 5：在 Span 中记录敏感信息

### ❌ 错误做法

```go
span.SetAttributes(
    attribute.String("user.password", password),      // ❌ 敏感信息
    attribute.String("user.credit_card", cardNumber), // ❌ 敏感信息
    attribute.String("user.token", token),            // ❌ 敏感信息
)
```

### ✅ 正确做法

```go
span.SetAttributes(
    attribute.String("user.id", userID),
    attribute.String("user.email", maskEmail(email)), // 脱敏
    // 不记录敏感信息
)

func maskEmail(email string) string {
    parts := strings.Split(email, "@")
    if len(parts) != 2 {
        return "***"
    }
    return parts[0][:1] + "***@" + parts[1]
}
```

## 坑 6：没有处理 BatchSpanProcessor 错误

### ❌ 错误做法

```go
exp, _ := jaeger.New(jaeger.WithCollectorEndpoint(...))

// 忽略错误，可能导致数据丢失
```

### ✅ 正确做法

```go
exp, err := jaeger.New(jaeger.WithCollectorEndpoint(...))
if err != nil {
    log.Fatal("failed to create exporter:", err)
}

// 使用 BatchSpanProcessor 并设置超时
tp := sdktrace.NewTracerProvider(
    sdktrace.WithBatcher(exp,
        sdktrace.WithBatchTimeout(5*time.Second),
        sdktrace.WithExportTimeout(30*time.Second),
    ),
)
```

## 坑 7：在循环中创建 Tracer

### ❌ 错误做法

```go
for _, item := range items {
    tracer := otel.Tracer("my-service") // 每次都创建
    _, span := tracer.Start(ctx, "process")
    // ...
}
```

### ✅ 正确做法

```go
// 全局创建一次
var tracer = otel.Tracer("my-service")

func processItems(ctx context.Context, items []Item) {
    for _, item := range items {
        ctx, span := tracer.Start(ctx, "process")
        // ...
        span.End()
    }
}
```

## 坑 8：没有优雅关闭 TracerProvider

### ❌ 错误做法

```go
func main() {
    tp, _ := InitTracer()
    // 程序直接退出，可能导致数据丢失
}
```

### ✅ 正确做法

```go
func main() {
    tp, err := InitTracer()
    if err != nil {
        log.Fatal(err)
    }
    
    // 确保优雅关闭
    defer func() {
        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer cancel()
        
        if err := tp.Shutdown(ctx); err != nil {
            log.Printf("failed to shutdown tracer: %v", err)
        }
    }()
    
    // 运行应用
    run()
}
```

## 总结

| 坑点 | 解决方案 |
|------|----------|
| Context 传播 | 始终传递 context |
| Span 过多 | 控制粒度，批量处理 |
| 采样策略 | 配置合理的采样率 |
| Span 未结束 | 使用 defer |
| 敏感信息 | 脱敏处理 |
| 错误处理 | 检查 exporter 错误 |
| Tracer 创建 | 全局复用 |
| 优雅关闭 | 实现 Shutdown |

避开这些坑，让你的 OTel 接入更加顺畅。
