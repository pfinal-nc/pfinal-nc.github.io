---
title: "从 trace 到洞察：Go 项目的可观测性闭环实践"
description: "全面讲解 Go 项目可观测性的三大支柱：日志、指标、追踪，以及如何构建完整的可观测性体系。"
keywords:
  - Go 可观测性
  - OpenTelemetry
  - 链路追踪
  - 指标监控
  - 日志分析
author: PFinal南丞
date: 2026-04-22
tags:
  - golang
  - observability
  - opentelemetry
  - tracing
  - monitoring
---

# 从 trace 到洞察：Go 项目的可观测性闭环实践

> 可观测性是现代应用的核心能力。本文带你构建完整的 Go 项目可观测性体系。

## 一、可观测性三大支柱

### 1.1 日志（Logging）

记录离散事件，用于问题排查。

```go
// 结构化日志
log.Info("user login",
    zap.String("user_id", userID),
    zap.String("ip", clientIP),
    zap.Duration("latency", latency),
)
```

### 1.2 指标（Metrics）

记录可聚合的数值，用于监控告警。

```go
// 计数器
requestCounter.WithLabelValues(path, status).Inc()

// 直方图
requestDuration.WithLabelValues(path).Observe(duration.Seconds())
```

### 1.3 追踪（Tracing）

记录请求链路，用于性能分析。

```go
// 创建 span
ctx, span := tracer.Start(ctx, "process_order")
defer span.End()

span.SetAttributes(attribute.String("order_id", orderID))
```

## 二、OpenTelemetry 集成

### 2.1 初始化

```go
package telemetry

import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/jaeger"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
)

func InitTracer(serviceName string) (*sdktrace.TracerProvider, error) {
    // 创建 Jaeger 导出器
    exp, err := jaeger.New(jaeger.WithCollectorEndpoint(
        jaeger.WithEndpoint("http://localhost:14268/api/traces"),
    ))
    if err != nil {
        return nil, err
    }
    
    // 创建资源
    res, err := resource.New(
        context.Background(),
        resource.WithAttributes(
            semconv.ServiceNameKey.String(serviceName),
            semconv.ServiceVersionKey.String("1.0.0"),
        ),
    )
    if err != nil {
        return nil, err
    }
    
    // 创建 TracerProvider
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exp),
        sdktrace.WithResource(res),
    )
    
    otel.SetTracerProvider(tp)
    return tp, nil
}
```

### 2.2 HTTP 中间件

```go
func TracingMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        tracer := otel.Tracer("http-server")
        
        // 从请求中提取 span context
        ctx := otel.GetTextMapPropagator().Extract(c.Request.Context(),
            propagation.HeaderCarrier(c.Request.Header),
        )
        
        // 创建 span
        ctx, span := tracer.Start(ctx, c.Request.Method+" "+c.FullPath())
        defer span.End()
        
        // 设置属性
        span.SetAttributes(
            attribute.String("http.method", c.Request.Method),
            attribute.String("http.url", c.Request.URL.String()),
            attribute.String("http.user_agent", c.Request.UserAgent()),
        )
        
        // 将 context 存入 gin
        c.Request = c.Request.WithContext(ctx)
        
        c.Next()
        
        // 记录响应状态
        span.SetAttributes(attribute.Int("http.status_code", c.Writer.Status()))
        if c.Writer.Status() >= 500 {
            span.SetStatus(codes.Error, "server error")
        }
    }
}
```

## 三、数据库追踪

```go
import (
    "github.com/XSAM/otelsql"
    semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
)

func InitDB(dsn string) (*sql.DB, error) {
    // 使用 otelsql 包装数据库驱动
    db, err := otelsql.Open("mysql", dsn,
        otelsql.WithAttributes(semconv.DBSystemMySQL),
    )
    if err != nil {
        return nil, err
    }
    
    return db, nil
}
```

## 四、指标收集

### 4.1 Prometheus 集成

```go
package metrics

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    RequestCounter = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "path", "status"},
    )
    
    RequestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "path"},
    )
    
    ActiveConnections = promauto.NewGauge(
        prometheus.GaugeOpts{
            Name: "active_connections",
            Help: "Number of active connections",
        },
    )
)
```

### 4.2 指标中间件

```go
func MetricsMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        
        metrics.ActiveConnections.Inc()
        defer metrics.ActiveConnections.Dec()
        
        c.Next()
        
        duration := time.Since(start)
        status := strconv.Itoa(c.Writer.Status())
        
        metrics.RequestCounter.WithLabelValues(
            c.Request.Method,
            c.FullPath(),
            status,
        ).Inc()
        
        metrics.RequestDuration.WithLabelValues(
            c.Request.Method,
            c.FullPath(),
        ).Observe(duration.Seconds())
    }
}
```

## 五、日志追踪关联

```go
func LoggerMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        
        // 生成 trace ID
        traceID := ""
        span := trace.SpanFromContext(c.Request.Context())
        if span.SpanContext().IsValid() {
            traceID = span.SpanContext().TraceID().String()
        }
        
        // 将 trace ID 存入 context
        ctx := context.WithValue(c.Request.Context(), "trace_id", traceID)
        c.Request = c.Request.WithContext(ctx)
        
        c.Next()
        
        // 记录访问日志
        logger.Info("http request",
            zap.String("trace_id", traceID),
            zap.String("method", c.Request.Method),
            zap.String("path", c.Request.URL.Path),
            zap.Int("status", c.Writer.Status()),
            zap.Duration("duration", time.Since(start)),
            zap.String("client_ip", c.ClientIP()),
        )
    }
}
```

## 六、告警配置

```yaml
# PrometheusRule
groups:
  - name: api-alerts
    rules:
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, 
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
          ) > 1.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
```

## 七、总结

| 组件 | 工具 | 用途 |
|------|------|------|
| 追踪 | OpenTelemetry + Jaeger | 链路分析 |
| 指标 | Prometheus | 监控告警 |
| 日志 | ELK / Loki | 日志分析 |
| 可视化 | Grafana | 统一展示 |

构建完整的可观测性体系，让问题无处遁形。
