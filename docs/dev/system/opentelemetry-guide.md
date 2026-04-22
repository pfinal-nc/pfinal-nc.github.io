---
title: "OpenTelemetry 实战指南"
date: 2026-04-22 00:00:00
author: PFinal南丞
description: "深入学习 OpenTelemetry 可观测性框架，掌握分布式追踪、指标收集、日志关联等核心功能，构建现代化的可观测性体系。"
keywords:
  - OpenTelemetry
  - 分布式追踪
  - 可观测性
  - Tracing
  - Metrics
  - Jaeger
tags:
  - opentelemetry
  - observability
  - tracing
  - devops
---

# OpenTelemetry 实战指南

OpenTelemetry 是一个开源的可观测性框架，提供标准化的 API、库和工具来收集分布式追踪、指标和日志数据。本文将带你深入了解 OpenTelemetry 的核心概念和实战应用。

## 什么是 OpenTelemetry

OpenTelemetry 是 CNCF 的毕业项目，合并了 OpenTracing 和 OpenCensus，提供：

- **统一的 API 和 SDK**：跨语言的标准化接口
- **自动埋点**：自动收集框架和库的遥测数据
- **数据导出**：支持多种后端（Jaeger、Zipkin、Prometheus 等）
- **上下文传播**：跨服务的追踪上下文传递

## 核心概念

### 1. Trace（追踪）

Trace 表示一个完整的请求链路，由多个 Span 组成：

```
Trace
├── Span A (服务 A)
│   ├── Span B (服务 B)
│   │   └── Span D (数据库)
│   └── Span C (服务 C)
```

### 2. Span（跨度）

Span 是追踪的基本单元，表示一个操作：

```go
// 创建 Span
ctx, span := tracer.Start(ctx, "operation-name")
defer span.End()

// 添加属性
span.SetAttributes(
    attribute.String("user.id", "12345"),
    attribute.Int("order.amount", 100),
)

// 记录事件
span.AddEvent("payment-processed", trace.WithAttributes(
    attribute.String("payment.method", "credit_card"),
))
```

### 3. Metrics（指标）

OpenTelemetry 支持多种指标类型：

| 类型 | 说明 | 示例 |
|------|------|------|
| Counter | 单调递增的计数器 | 请求总数 |
| UpDownCounter | 可增可减的计数器 | 连接数 |
| Histogram | 直方图 | 请求延迟分布 |
| Gauge | 瞬时值 | 当前温度 |
| ObservableCounter | 可观察计数器 | 系统指标 |

## Go 语言实战

### 基础配置

```go
package main

import (
    "context"
    "log"
    "time"
    
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/exporters/jaeger"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
    "go.opentelemetry.io/otel/trace"
)

func initTracer() (*sdktrace.TracerProvider, error) {
    // 创建 Jaeger 导出器
    exp, err := jaeger.New(jaeger.WithCollectorEndpoint(
        jaeger.WithEndpoint("http://localhost:14268/api/traces"),
    ))
    if err != nil {
        return nil, err
    }
    
    // 创建 TracerProvider
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exp),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceNameKey.String("my-service"),
            attribute.String("environment", "production"),
            attribute.String("version", "1.0.0"),
        )),
    )
    
    // 设置为全局 Provider
    otel.SetTracerProvider(tp)
    return tp, nil
}

func main() {
    tp, err := initTracer()
    if err != nil {
        log.Fatal(err)
    }
    defer func() {
        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer cancel()
        if err := tp.Shutdown(ctx); err != nil {
            log.Printf("Error shutting down tracer provider: %v", err)
        }
    }()
    
    tracer := otel.Tracer("example-tracer")
    ctx, span := tracer.Start(context.Background(), "main")
    defer span.End()
    
    // 执行业务逻辑
    doWork(ctx)
}

func doWork(ctx context.Context) {
    tracer := otel.Tracer("example-tracer")
    ctx, span := tracer.Start(ctx, "doWork")
    defer span.End()
    
    span.SetAttributes(attribute.String("work.type", "processing"))
    
    // 模拟工作
    time.Sleep(100 * time.Millisecond)
}
```

### HTTP 服务埋点

```go
package main

import (
    "context"
    "fmt"
    "net/http"
    "time"
    
    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/exporters/jaeger"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

func main() {
    // 初始化 Tracer
    tp := initTracer()
    defer tp.Shutdown(context.Background())
    
    // 创建带追踪的 Handler
    handler := otelhttp.NewHandler(
        http.HandlerFunc(handleRequest),
        "http-server",
        otelhttp.WithMessageEvents(otelhttp.ReadEvents, otelhttp.WriteEvents),
    )
    
    http.Handle("/api/users", handler)
    http.ListenAndServe(":8080", nil)
}

func handleRequest(w http.ResponseWriter, r *http.Request) {
    // 从请求上下文中获取 Span
    span := trace.SpanFromContext(r.Context())
    span.SetAttributes(
        attribute.String("http.method", r.Method),
        attribute.String("http.path", r.URL.Path),
    )
    
    // 处理请求
    users := getUsers(r.Context())
    
    w.Header().Set("Content-Type", "application/json")
    fmt.Fprintf(w, `{"users": %d}`, len(users))
}

func getUsers(ctx context.Context) []User {
    tracer := otel.Tracer("user-service")
    ctx, span := tracer.Start(ctx, "getUsers")
    defer span.End()
    
    span.SetAttributes(attribute.String("db.table", "users"))
    
    // 模拟数据库查询
    time.Sleep(50 * time.Millisecond)
    
    return []User{{ID: 1, Name: "Alice"}}
}
```

### gRPC 服务埋点

```go
package main

import (
    "context"
    "log"
    "net"
    
    "go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
    "google.golang.org/grpc"
    pb "example.com/proto"
)

func main() {
    // 创建 gRPC 服务器，添加拦截器
    server := grpc.NewServer(
        grpc.UnaryInterceptor(otelgrpc.UnaryServerInterceptor()),
        grpc.StreamInterceptor(otelgrpc.StreamServerInterceptor()),
    )
    
    pb.RegisterUserServiceServer(server, &userServer{})
    
    lis, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatalf("failed to listen: %v", err)
    }
    
    log.Println("gRPC server starting on :50051")
    if err := server.Serve(lis); err != nil {
        log.Fatalf("failed to serve: %v", err)
    }
}

type userServer struct {
    pb.UnimplementedUserServiceServer
}

func (s *userServer) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.User, error) {
    // 追踪上下文自动传递
    tracer := otel.Tracer("user-service")
    ctx, span := tracer.Start(ctx, "GetUser")
    defer span.End()
    
    span.SetAttributes(attribute.Int64("user.id", req.Id))
    
    // 查询数据库...
    
    return &pb.User{Id: req.Id, Name: "Alice"}, nil
}
```

### 指标收集

```go
package main

import (
    "context"
    "log"
    "net/http"
    "time"
    
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/exporters/prometheus"
    "go.opentelemetry.io/otel/metric"
    "go.opentelemetry.io/otel/sdk/metric/sdkmetric"
    
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    meter        metric.Meter
    requestCount metric.Int64Counter
    requestDuration metric.Float64Histogram
)

func initMetrics() {
    // 创建 Prometheus 导出器
    exporter, err := prometheus.New()
    if err != nil {
        log.Fatal(err)
    }
    
    // 创建 MeterProvider
    provider := sdkmetric.NewMeterProvider(
        sdkmetric.WithReader(exporter),
    )
    otel.SetMeterProvider(provider)
    
    meter = provider.Meter("my-service")
    
    // 创建指标
    requestCount, _ = meter.Int64Counter(
        "http_requests_total",
        metric.WithDescription("Total HTTP requests"),
    )
    
    requestDuration, _ = meter.Float64Histogram(
        "http_request_duration_seconds",
        metric.WithDescription("HTTP request duration"),
        metric.WithUnit("s"),
    )
}

func instrumentedHandler(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        
        // 记录请求数
        requestCount.Add(r.Context(), 1,
            metric.WithAttributes(
                attribute.String("method", r.Method),
                attribute.String("path", r.URL.Path),
            ),
        )
        
        next(w, r)
        
        // 记录请求耗时
        duration := time.Since(start).Seconds()
        requestDuration.Record(r.Context(), duration,
            metric.WithAttributes(
                attribute.String("method", r.Method),
                attribute.String("path", r.URL.Path),
            ),
        )
    }
}

func main() {
    initMetrics()
    
    // 暴露 Prometheus 指标
    http.Handle("/metrics", promhttp.Handler())
    
    // 业务接口
    http.HandleFunc("/api/users", instrumentedHandler(func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte(`{"users": []}`))
    }))
    
    log.Println("Server starting on :8080")
    http.ListenAndServe(":8080", nil)
}
```

## 部署架构

### Docker Compose 部署

```yaml
version: '3.8'

services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: jaeger
    ports:
      - "16686:16686"  # UI
      - "14268:14268"  # Collector HTTP
      - "14250:14250"  # Collector gRPC
      - "9411:9411"    # Zipkin
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    networks:
      - observability

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    container_name: otel-collector
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"    # OTLP gRPC
      - "4318:4318"    # OTLP HTTP
      - "8889:8889"    # Prometheus exporter
    networks:
      - observability
    depends_on:
      - jaeger

  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
    networks:
      - observability

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana
    networks:
      - observability
    depends_on:
      - prometheus

networks:
  observability:
    driver: bridge

volumes:
  grafana-storage:
```

### Collector 配置

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
  
  resource:
    attributes:
      - key: environment
        value: production
        action: upsert

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true
  
  prometheus:
    endpoint: 0.0.0.0:8889
  
  logging:
    loglevel: debug

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [jaeger, logging]
    
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus, logging]
```

## 最佳实践

### 1. 采样策略

```go
// 概率采样
sdktrace.WithSampler(sdktrace.TraceIDRatioBased(0.1))

// 父级采样
sdktrace.WithSampler(sdktrace.ParentBased(
    sdktrace.TraceIDRatioBased(0.1),
))

// 自定义采样
sdktrace.WithSampler(sdktrace.AlwaysSample())  // 开发环境
sdktrace.WithSampler(sdktrace.NeverSample())   // 禁用采样
```

### 2. 命名规范

```
Tracer Name: <service-name>.<component>
Span Name: <operation>.<resource>
Attribute: <domain>.<entity>.<attribute>

示例:
- Tracer: "user-service.database"
- Span: "SELECT users"
- Attribute: "http.method", "db.statement"
```

### 3. 错误处理

```go
func doWork(ctx context.Context) error {
    ctx, span := tracer.Start(ctx, "doWork")
    defer span.End()
    
    if err := someOperation(); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return err
    }
    
    span.SetStatus(codes.Ok, "success")
    return nil
}
```

## 总结

OpenTelemetry 提供了统一的可观测性解决方案，通过标准化的 API 和丰富的生态系统，帮助开发者构建现代化的可观测性体系。

---

**参考资源：**
- [OpenTelemetry 官方文档](https://opentelemetry.io/docs/)
- [OpenTelemetry Go SDK](https://github.com/open-telemetry/opentelemetry-go)
- [Jaeger 文档](https://www.jaegertracing.io/docs/)
