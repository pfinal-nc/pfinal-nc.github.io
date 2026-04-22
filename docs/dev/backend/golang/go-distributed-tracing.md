---
title: "Go 分布式追踪实战"
date: 2026-04-22 00:00:00
author: PFinal南丞
description: "深入学习 Go 语言分布式追踪实现，掌握 OpenTelemetry、Jaeger、Zipkin 等工具的使用，构建完整的分布式链路追踪系统。"
keywords:
  - Go
  - 分布式追踪
  - Distributed Tracing
  - OpenTelemetry
  - Jaeger
  - Zipkin
tags:
  - golang
  - distributed-tracing
  - observability
  - microservices
---

# Go 分布式追踪实战

分布式追踪是微服务架构中不可或缺的观测工具，它帮助我们理解请求在分布式系统中的完整路径。本文将介绍如何在 Go 应用中实现分布式追踪。

## 分布式追踪基础

### 核心概念

| 概念 | 说明 |
|------|------|
| Trace | 完整的请求链路 |
| Span | 追踪的基本单元，表示一个操作 |
| Span Context | 跨服务传递的上下文信息 |
| Baggage | 随 Span 传递的额外数据 |

### 追踪数据流

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ Service │────▶│ Service │────▶│ Service │────▶│  DB     │
│   A     │     │   B     │     │   C     │     │         │
└────┬────┘     └────┬────┘     └────┬────┘     └─────────┘
     │               │               │
     │               │               │
     ▼               ▼               ▼
  Span A          Span B          Span C
     │               │               │
     └───────────────┴───────────────┘
                    │
                    ▼
                 Trace
```

## OpenTelemetry 实现

### 基础配置

```go
package tracing

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

// InitTracer 初始化追踪器
func InitTracer(serviceName string) (*sdktrace.TracerProvider, error) {
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
			semconv.ServiceNameKey.String(serviceName),
			attribute.String("environment", "production"),
			attribute.String("version", "1.0.0"),
		)),
		sdktrace.WithSampler(sdktrace.TraceIDRatioBased(0.1)), // 10% 采样
	)

	// 设置为全局 Provider
	otel.SetTracerProvider(tp)

	return tp, nil
}

// Tracer 获取追踪器
func Tracer(name string) trace.Tracer {
	return otel.Tracer(name)
}

// Shutdown 关闭追踪器
func Shutdown(ctx context.Context, tp *sdktrace.TracerProvider) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := tp.Shutdown(ctx); err != nil {
		log.Printf("Error shutting down tracer provider: %v", err)
	}
}
```

### HTTP 服务追踪

```go
package main

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
	"yourapp/tracing"
)

func main() {
	// 初始化追踪
	tp, err := tracing.InitTracer("api-gateway")
	if err != nil {
		panic(err)
	}
	defer tracing.Shutdown(context.Background(), tp)

	r := gin.Default()

	// 使用 OpenTelemetry 中间件
	r.Use(otelgin.Middleware("api-gateway"))

	// 路由
	r.GET("/api/users/:id", getUser)
	r.GET("/api/orders", getOrders)

	r.Run(":8080")
}

func getUser(c *gin.Context) {
	ctx := c.Request.Context()
	tracer := tracing.Tracer("user-service")

	// 创建子 Span
	ctx, span := tracer.Start(ctx, "getUser",
		trace.WithAttributes(
			attribute.String("user.id", c.Param("id")),
		),
	)
	defer span.End()

	// 查询数据库
	user, err := queryUser(ctx, c.Param("id"))
	if err != nil {
		span.RecordError(err)
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	span.SetAttributes(attribute.String("user.name", user.Name))
	c.JSON(200, user)
}

func queryUser(ctx context.Context, id string) (*User, error) {
	tracer := tracing.Tracer("user-service")
	ctx, span := tracer.Start(ctx, "queryUser",
		trace.WithAttributes(
			attribute.String("db.table", "users"),
			attribute.String("db.query", "SELECT * FROM users WHERE id = ?"),
		),
	)
	defer span.End()

	// 模拟数据库查询
	// ...

	return &User{ID: id, Name: "Alice"}, nil
}
```

### gRPC 服务追踪

```go
package main

import (
	"context"
	"log"
	"net"

	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"google.golang.org/grpc"
	pb "yourapp/proto"
)

func main() {
	// 初始化追踪
	tp, err := tracing.InitTracer("grpc-service")
	if err != nil {
		log.Fatal(err)
	}
	defer tracing.Shutdown(context.Background(), tp)

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
	tracer := tracing.Tracer("user-service")
	ctx, span := tracer.Start(ctx, "GetUser")
	defer span.End()

	span.SetAttributes(attribute.Int64("user.id", req.Id))

	// 查询数据库...

	return &pb.User{Id: req.Id, Name: "Alice"}, nil
}
```

## 自定义追踪

### 数据库追踪

```go
package tracing

import (
	"context"
	"database/sql"
	"time"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

// TracedDB 带追踪的数据库连接
type TracedDB struct {
	db     *sql.DB
	tracer trace.Tracer
}

// NewTracedDB 创建带追踪的数据库连接
func NewTracedDB(db *sql.DB) *TracedDB {
	return &TracedDB{
		db:     db,
		tracer: Tracer("database"),
	}
}

// QueryContext 带追踪的查询
func (t *TracedDB) QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
	ctx, span := t.tracer.Start(ctx, "db.query",
		trace.WithAttributes(
			attribute.String("db.system", "mysql"),
			attribute.String("db.statement", query),
		),
	)
	defer span.End()

	start := time.Now()
	rows, err := t.db.QueryContext(ctx, query, args...)
	duration := time.Since(start)

	span.SetAttributes(attribute.Int64("db.duration_ms", duration.Milliseconds()))

	if err != nil {
		span.RecordError(err)
		span.SetAttributes(attribute.Bool("error", true))
	}

	return rows, err
}

// ExecContext 带追踪的执行
func (t *TracedDB) ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
	ctx, span := t.tracer.Start(ctx, "db.exec",
		trace.WithAttributes(
			attribute.String("db.system", "mysql"),
			attribute.String("db.statement", query),
		),
	)
	defer span.End()

	return t.db.ExecContext(ctx, query, args...)
}
```

### HTTP 客户端追踪

```go
package tracing

import (
	"context"
	"net/http"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
)

// TracedHTTPClient 带追踪的 HTTP 客户端
type TracedHTTPClient struct {
	client *http.Client
	tracer trace.Tracer
}

// NewTracedHTTPClient 创建带追踪的 HTTP 客户端
func NewTracedHTTPClient() *TracedHTTPClient {
	return &TracedHTTPClient{
		client: &http.Client{},
		tracer: Tracer("http-client"),
	}
}

// Do 发送 HTTP 请求
func (t *TracedHTTPClient) Do(ctx context.Context, req *http.Request) (*http.Response, error) {
	ctx, span := t.tracer.Start(ctx, "HTTP "+req.Method,
		trace.WithAttributes(
			attribute.String("http.method", req.Method),
			attribute.String("http.url", req.URL.String()),
		),
	)
	defer span.End()

	// 注入追踪上下文到请求头
	otel.GetTextMapPropagator().Inject(ctx, propagation.HeaderCarrier(req.Header))

	resp, err := t.client.Do(req)
	if err != nil {
		span.RecordError(err)
		return nil, err
	}

	span.SetAttributes(attribute.Int("http.status_code", resp.StatusCode))

	return resp, nil
}
```

## 部署配置

### Docker Compose

```yaml
version: '3.8'

services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: jaeger
    ports:
      - "16686:16686"
      - "14268:14268"
      - "14250:14250"
      - "9411:9411"
    environment:
      - COLLECTOR_OTLP_ENABLED=true

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    container_name: otel-collector
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"
      - "4318:4318"

  service-a:
    build: ./service-a
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_SERVICE_NAME=service-a

  service-b:
    build: ./service-b
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_SERVICE_NAME=service-b
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

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true

  logging:
    loglevel: debug

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [jaeger, logging]
```

## 最佳实践

1. **合理命名**：使用清晰的 Span 名称
2. **添加属性**：记录有价值的上下文信息
3. **错误处理**：记录错误和异常
4. **采样策略**：生产环境使用概率采样
5. **性能考虑**：异步导出，批量处理

## 总结

分布式追踪是理解微服务系统的关键工具，通过 OpenTelemetry 可以方便地在 Go 应用中实现追踪功能。

---

**参考资源：**
- [OpenTelemetry Go](https://opentelemetry.io/docs/instrumentation/go/)
- [Jaeger 文档](https://www.jaegertracing.io/docs/)
