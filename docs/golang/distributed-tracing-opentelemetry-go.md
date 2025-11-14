---
title: Distributed Tracing in Go Microservices with OpenTelemetry
date: 2025-08-18
tags:
  - golang
  - distributed tracing
  - opentelemetry
  - microservices
  - observability
  - jaeger
  - metrics
  - logging
author: PFinal南丞
keywords: golang, distributed tracing, opentelemetry, microservices, observability, jaeger, prometheus, logging, span, trace, context propagation
description: A comprehensive guide to implementing distributed tracing in Go microservices using OpenTelemetry, covering setup, instrumentation, context propagation, integration with Jaeger and Prometheus, and best practices for observability.
---

# Distributed Tracing in Go Microservices with OpenTelemetry

In today's complex distributed systems, understanding how requests flow through multiple services is crucial for debugging, performance optimization, and maintaining system reliability. Distributed tracing provides visibility into these interactions by tracking requests as they propagate across service boundaries. OpenTelemetry, the industry-standard observability framework, offers powerful tools for implementing distributed tracing in Go applications.

This article explores how to implement distributed tracing in Go microservices using OpenTelemetry, covering everything from basic setup to advanced features like context propagation, integration with monitoring systems, and best practices.

## 1. Introduction to Distributed Tracing and OpenTelemetry

### 1.1. What is Distributed Tracing?

Distributed tracing is a method used to profile and monitor applications, especially those built using microservices architectures. It tracks the journey of a request as it flows through various services, providing insights into:

-   **Latency Analysis**: Identify performance bottlenecks in the request path.
-   **Error Diagnosis**: Quickly locate the source of failures.
-   **Service Dependencies**: Understand the relationships and dependencies between services.
-   **System Behavior**: Gain insights into the overall health and behavior of the system.

### 1.2. Key Concepts

-   **Trace**: A representation of a single request's journey through a distributed system.
-   **Span**: A named, timed operation representing a piece of work in a trace. Spans can have relationships with other spans (parent-child).
-   **Context Propagation**: The mechanism by which trace context is passed between services to maintain trace continuity.

### 1.3. What is OpenTelemetry?

OpenTelemetry is a vendor-neutral, open-source observability framework that provides a single set of APIs, libraries, agents, and collector services to capture distributed traces and metrics from your application. It offers:

-   **Unified Instrumentation**: Single set of APIs for metrics, traces, and logs.
-   **Vendor Neutrality**: Works with multiple backends (Jaeger, Zipkin, Prometheus, etc.).
-   **Automatic Instrumentation**: Reduces manual instrumentation effort.
-   **Context Propagation**: Built-in support for propagating context across services.

## 2. Setting Up OpenTelemetry in Go

### 2.1. Prerequisites

-   Go 1.19 or later
-   A trace backend (we'll use Jaeger for this guide)

### 2.2. Installing Dependencies

```bash
go mod init tracing-demo
go get go.opentelemetry.io/otel
go get go.opentelemetry.io/otel/sdk
go get go.opentelemetry.io/otel/exporters/jaeger
go get go.opentelemetry.io/otel/exporters/stdout/stdouttrace
go get go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
go get go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
go get github.com/gin-gonic/gin
```

### 2.3. Basic OpenTelemetry Setup

Let's start with a basic setup that exports traces to both stdout and Jaeger.

```go
// tracing/tracer.go
package tracing

import (
	"context"
	"fmt"
	"log"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/jaeger"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
	"go.opentelemetry.io/otel/trace"
)

// InitTracer initializes the OpenTelemetry tracer
func InitTracer(serviceName string) (func(context.Context) error, error) {
	// Create a resource that identifies the service
	res, err := resource.New(
		context.Background(),
		resource.WithAttributes(
			semconv.ServiceNameKey.String(serviceName),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create resource: %w", err)
	}

	// Create stdout exporter for debugging
	stdoutExp, err := stdouttrace.New(stdouttrace.WithPrettyPrint())
	if err != nil {
		return nil, err
	}

	// Create Jaeger exporter
	jaegerExp, err := jaeger.New(
		jaeger.WithCollectorEndpoint(jaeger.WithEndpoint("http://localhost:14268/api/traces")),
	)
	if err != nil {
		return nil, err
	}

	// Create a batch span processor for each exporter
	stdoutProcessor := sdktrace.NewBatchSpanProcessor(stdoutExp)
	jaegerProcessor := sdktrace.NewBatchSpanProcessor(jaegerExp)

	// Create a trace provider with both processors
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithResource(res),
		sdktrace.WithSpanProcessor(stdoutProcessor),
		sdktrace.WithSpanProcessor(jaegerProcessor),
	)

	// Set the global tracer provider
	otel.SetTracerProvider(tp)

	// Set the context propagator
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	// Return a function to shutdown the tracer provider
	return tp.Shutdown, nil
}

// GetTracer returns a named tracer
func GetTracer(name string) trace.Tracer {
	return otel.Tracer(name)
}
```

## 3. Instrumenting a Simple HTTP Service

### 3.1. Creating a Basic HTTP Server

Let's create a simple HTTP server and instrument it with OpenTelemetry.

```go
// main.go
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"tracing-demo/tracing"
)

func main() {
	// Initialize the tracer
	shutdown, err := tracing.InitTracer("user-service")
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		if err := shutdown(context.Background()); err != nil {
			log.Printf("Error shutting down tracer provider: %v", err)
		}
	}()

	// Create a Gin router with OpenTelemetry middleware
	r := gin.Default()
	r.Use(otelgin.Middleware("user-service"))

	// Define routes
	r.GET("/users/:id", getUserHandler)
	r.POST("/users", createUserHandler)

	// Start the server
	log.Println("Starting server on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}

func getUserHandler(c *gin.Context) {
	// Get the tracer from the context
	ctx := c.Request.Context()
	tracer := tracing.GetTracer("user-service")

	// Start a span for this operation
	ctx, span := tracer.Start(ctx, "getUserHandler")
	defer span.End()

	// Extract the user ID from the URL
	userID := c.Param("id")
	span.SetAttributes(attribute.String("user.id", userID))

	// Simulate some work
	time.Sleep(100 * time.Millisecond)

	// Call a function that does more work
	user, err := fetchUserDetails(ctx, userID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(1, err.Error()) // 1 corresponds to codes.Error
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Return the user data
	c.JSON(http.StatusOK, user)
}

func fetchUserDetails(ctx context.Context, userID string) (map[string]interface{}, error) {
	// Get the tracer
	tracer := tracing.GetTracer("user-service")

	// Start a span for fetching user details
	_, span := tracer.Start(ctx, "fetchUserDetails")
	defer span.End()

	span.SetAttributes(attribute.String("db.query", "SELECT * FROM users WHERE id = ?"))
	span.SetAttributes(attribute.String("user.id", userID))

	// Simulate database query
	time.Sleep(50 * time.Millisecond)

	// Simulate a potential error
	if userID == "999" {
		err := fmt.Errorf("user not found")
		span.RecordError(err)
		return nil, err
	}

	// Return mock user data
	user := map[string]interface{}{
		"id":    userID,
		"name":  "John Doe",
		"email": "john.doe@example.com",
	}

	return user, nil
}

func createUserHandler(c *gin.Context) {
	// Get the tracer from the context
	ctx := c.Request.Context()
	tracer := tracing.GetTracer("user-service")

	// Start a span for this operation
	ctx, span := tracer.Start(ctx, "createUserHandler")
	defer span.End()

	// Simulate some work
	time.Sleep(200 * time.Millisecond)

	// Parse request body
	var input struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		span.RecordError(err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	span.SetAttributes(
		attribute.String("user.name", input.Name),
		attribute.String("user.email", input.Email),
	)

	// Simulate creating a user
	time.Sleep(100 * time.Millisecond)

	// Return success response
	c.JSON(http.StatusCreated, gin.H{
		"id":    "123",
		"name":  input.Name,
		"email": input.Email,
	})
}
```

## 4. Context Propagation Between Services

One of the key features of distributed tracing is context propagation between services. Let's create a second service that calls the first service to demonstrate this.

### 4.1. Creating a Second Service

```go
// order-service/main.go
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"tracing-demo/tracing"
)

func main() {
	// Initialize the tracer
	shutdown, err := tracing.InitTracer("order-service")
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		if err := shutdown(context.Background()); err != nil {
			log.Printf("Error shutting down tracer provider: %v", err)
		}
	}()

	// Create a Gin router with OpenTelemetry middleware
	r := gin.Default()
	r.Use(otelgin.Middleware("order-service"))

	// Define routes
	r.GET("/orders/:id", getOrderHandler)

	// Start the server
	log.Println("Starting order service on :8081")
	if err := r.Run(":8081"); err != nil {
		log.Fatal(err)
	}
}

func getOrderHandler(c *gin.Context) {
	// Get the tracer from the context
	ctx := c.Request.Context()
	tracer := tracing.GetTracer("order-service")

	// Start a span for this operation
	ctx, span := tracer.Start(ctx, "getOrderHandler")
	defer span.End()

	// Extract the order ID from the URL
	orderID := c.Param("id")
	span.SetAttributes(attribute.String("order.id", orderID))

	// Simulate some work
	time.Sleep(50 * time.Millisecond)

	// Call the user service to get user details
	user, err := getUserFromUserService(ctx, "123")
	if err != nil {
		span.RecordError(err)
		span.SetStatus(1, err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Create order data
	order := map[string]interface{}{
		"id":       orderID,
		"user":     user,
		"items":    []string{"item1", "item2"},
		"total":    99.99,
		"status":   "confirmed",
		"createdAt": time.Now().Format(time.RFC3339),
	}

	// Return the order data
	c.JSON(http.StatusOK, order)
}

func getUserFromUserService(ctx context.Context, userID string) (map[string]interface{}, error) {
	// Get the tracer
	tracer := tracing.GetTracer("order-service")

	// Start a span for calling the user service
	ctx, span := tracer.Start(ctx, "getUserFromUserService")
	defer span.End()

	span.SetAttributes(attribute.String("http.url", "http://localhost:8080/users/"+userID))

	// Create an HTTP client with OpenTelemetry instrumentation
	client := &http.Client{
		Transport: otelhttp.NewTransport(http.DefaultTransport),
		Timeout:   5 * time.Second,
	}

	// Make the HTTP request
	req, err := http.NewRequestWithContext(ctx, "GET", "http://localhost:8080/users/"+userID, nil)
	if err != nil {
		span.RecordError(err)
		return nil, err
	}

	// Inject the tracing context into the request headers
	otel.GetTextMapPropagator().Inject(ctx, propagation.HeaderCarrier(req.Header))

	resp, err := client.Do(req)
	if err != nil {
		span.RecordError(err)
		return nil, err
	}
	defer resp.Body.Close()

	// Check the response status
	if resp.StatusCode != http.StatusOK {
		err := fmt.Errorf("user service returned status %d", resp.StatusCode)
		span.RecordError(err)
		return nil, err
	}

	// Parse the response (simplified for example)
	user := map[string]interface{}{
		"id":   userID,
		"name": "John Doe",
	}

	return user, nil
}
```

## 5. Advanced Instrumentation Techniques

### 5.1. Manual Instrumentation with Spans

For more control over your traces, you can manually create and manage spans.

```go
// utils/database.go
package utils

import (
	"context"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

// Simulated database operations with manual tracing
type Database struct {
	tracer trace.Tracer
}

func NewDatabase(tracerProvider trace.TracerProvider) *Database {
	return &Database{
		tracer: tracerProvider.Tracer("database"),
	}
}

func (db *Database) GetUser(ctx context.Context, id string) (map[string]interface{}, error) {
	// Start a span for this database operation
	ctx, span := db.tracer.Start(ctx, "db.GetUser")
	defer span.End()

	// Add attributes to the span
	span.SetAttributes(
		attribute.String("db.system", "mysql"),
		attribute.String("db.statement", "SELECT * FROM users WHERE id = ?"),
		attribute.String("user.id", id),
	)

	// Simulate database query time
	time.Sleep(30 * time.Millisecond)

	// Simulate a potential error
	if id == "999" {
		err := otel.Error("user not found")
		span.RecordError(err)
		span.SetStatus(codes.Error, "user not found")
		return nil, err
	}

	// Return mock user data
	user := map[string]interface{}{
		"id":    id,
		"name":  "John Doe",
		"email": "john.doe@example.com",
	}

	return user, nil
}

func (db *Database) CreateUser(ctx context.Context, name, email string) (string, error) {
	// Start a span for this database operation
	ctx, span := db.tracer.Start(ctx, "db.CreateUser")
	defer span.End()

	// Add attributes to the span
	span.SetAttributes(
		attribute.String("db.system", "mysql"),
		attribute.String("db.statement", "INSERT INTO users (name, email) VALUES (?, ?)"),
		attribute.String("user.name", name),
		attribute.String("user.email", email),
	)

	// Simulate database insert time
	time.Sleep(50 * time.Millisecond)

	// Return mock user ID
	id := "123"
	span.SetAttributes(attribute.String("user.id", id))

	return id, nil
}
```

### 5.2. Using Baggage for Context Propagation

Baggage allows you to propagate key-value pairs across service boundaries.

```go
// order-service/main.go (updated getOrderHandler)
import (
	"go.opentelemetry.io/otel/baggage"
)

func getOrderHandler(c *gin.Context) {
	// Get the tracer from the context
	ctx := c.Request.Context()
	tracer := tracing.GetTracer("order-service")

	// Start a span for this operation
	ctx, span := tracer.Start(ctx, "getOrderHandler")
	defer span.End()

	// Extract the order ID from the URL
	orderID := c.Param("id")
	span.SetAttributes(attribute.String("order.id", orderID))

	// Add baggage to propagate additional context
	bag, _ := baggage.Parse("environment=production,version=1.0.0")
	ctx = baggage.ContextWithBaggage(ctx, bag)

	// Simulate some work
	time.Sleep(50 * time.Millisecond)

	// Call the user service to get user details
	user, err := getUserFromUserService(ctx, "123")
	if err != nil {
		span.RecordError(err)
		span.SetStatus(1, err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Create order data
	order := map[string]interface{}{
		"id":       orderID,
		"user":     user,
		"items":    []string{"item1", "item2"},
		"total":    99.99,
		"status":   "confirmed",
		"createdAt": time.Now().Format(time.RFC3339),
	}

	// Return the order data
	c.JSON(http.StatusOK, order)
}
```

## 6. Integrating with Monitoring Systems

### 6.1. Setting up Jaeger

To visualize traces, we'll use Jaeger. You can run Jaeger locally using Docker:

```bash
docker run -d --name jaeger \
  -e COLLECTOR_ZIPKIN_HOST_PORT=:9411 \
  -p 5775:5775/udp \
  -p 6831:6831/udp \
  -p 6832:6832/udp \
  -p 5778:5778 \
  -p 16686:16686 \
  -p 14250:14250 \
  -p 14268:14268 \
  -p 14269:14269 \
  -p 9411:9411 \
  jaegertracing/all-in-one:1.41
```

Access the Jaeger UI at `http://localhost:16686`.

### 6.2. Adding Metrics with Prometheus

OpenTelemetry also supports metrics. Let's add some basic metrics to our services.

```bash
go get go.opentelemetry.io/otel/metric
go get go.opentelemetry.io/otel/exporters/prometheus
```

```go
// metrics/metrics.go
package metrics

import (
	"context"
	"fmt"
	"log"

	"go.opentelemetry.io/otel/exporters/prometheus"
	"go.opentelemetry.io/otel/metric"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
)

// InitMetrics initializes the OpenTelemetry metrics provider
func InitMetrics() (metric.MeterProvider, error) {
	// Create the Prometheus exporter
	exporter, err := prometheus.New()
	if err != nil {
		return nil, fmt.Errorf("failed to create prometheus exporter: %w", err)
	}

	// Create a meter provider
	provider := sdkmetric.NewMeterProvider(
		sdkmetric.WithReader(exporter),
	)

	return provider, nil
}
```

Update the main function to include metrics:

```go
// main.go (updated)
import (
	"tracing-demo/metrics"
)

func main() {
	// Initialize the tracer
	shutdown, err := tracing.InitTracer("user-service")
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		if err := shutdown(context.Background()); err != nil {
			log.Printf("Error shutting down tracer provider: %v", err)
		}
	}()

	// Initialize metrics
	meterProvider, err := metrics.InitMetrics()
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		if err := meterProvider.Shutdown(context.Background()); err != nil {
			log.Printf("Error shutting down meter provider: %v", err)
		}
	}()

	// Expose metrics endpoint
	http.Handle("/metrics", promhttp.Handler())
	go func() {
		log.Println("Starting metrics server on :2112")
		if err := http.ListenAndServe(":2112", nil); err != nil {
			log.Printf("Error starting metrics server: %v", err)
		}
	}()

	// ... rest of the main function ...
}
```

## 7. Best Practices for Distributed Tracing

### 7.1. Instrumentation Guidelines

1.  **Trace All Services**: Instrument all services in your system to get complete visibility.
2.  **Name Spans Descriptively**: Use clear, consistent naming conventions for spans.
3.  **Add Relevant Attributes**: Include key-value pairs that provide context about the operation.
4.  **Handle Errors Properly**: Record errors and set appropriate status codes on spans.
5.  **Avoid Over-Instrumentation**: Too many spans can impact performance and make traces hard to analyze.

### 7.2. Sampling Strategies

In production, you typically don't want to trace every request due to performance and storage costs. OpenTelemetry supports various sampling strategies:

```go
// tracing/tracer.go (updated)
import (
	"go.opentelemetry.io/otel/sdk/trace"
)

func InitTracer(serviceName string) (func(context.Context) error, error) {
	// ... existing code ...

	// Create a trace provider with sampling
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithResource(res),
		sdktrace.WithSpanProcessor(stdoutProcessor),
		sdktrace.WithSpanProcessor(jaegerProcessor),
		sdktrace.WithSampler(sdktrace.ParentBased(sdktrace.TraceIDRatioBased(0.1))), // Sample 10% of traces
	)

	// ... rest of the function ...
}
```

### 7.3. Security Considerations

1.  **Sanitize Sensitive Data**: Never include sensitive information like passwords or personal data in spans or attributes.
2.  **Secure Transport**: Use TLS when sending traces to your backend.
3.  **Access Control**: Implement proper access controls for your tracing backend.

### 7.4. Performance Optimization

1.  **Batch Processing**: Use batch span processors to reduce the overhead of sending traces.
2.  **Asynchronous Export**: Export traces asynchronously to avoid blocking application threads.
3.  **Resource Management**: Properly shut down tracer providers to release resources.

## 8. Troubleshooting Common Issues

### 8.1. Missing Traces

If traces are not appearing in your backend:

1.  **Check Exporter Configuration**: Ensure your exporter is correctly configured and can connect to the backend.
2.  **Verify Context Propagation**: Make sure context is properly propagated between services.
3.  **Check Sampling**: Verify that your sampling configuration is not filtering out all traces.

### 8.2. Broken Trace Context

If traces are broken across service boundaries:

1.  **Verify Instrumentation**: Ensure HTTP clients and servers are properly instrumented.
2.  **Check Propagators**: Make sure the same propagators are used in all services.
3.  **Debug Headers**: Log HTTP headers to verify that trace context is being passed correctly.

## 9. Advanced Features

### 9.1. Custom Span Processors

You can create custom span processors for specialized handling:

```go
// tracing/custom_processor.go
package tracing

import (
	"context"
	"log"

	"go.opentelemetry.io/otel/sdk/trace"
)

type LoggingSpanProcessor struct{}

func (l LoggingSpanProcessor) OnStart(parent context.Context, s trace.ReadWriteSpan) {
	log.Printf("Span started: %s", s.Name())
}

func (l LoggingSpanProcessor) OnEnd(s trace.ReadOnlySpan) {
	log.Printf("Span ended: %s, Duration: %v", s.Name(), s.EndTime().Sub(s.StartTime()))
}

func (l LoggingSpanProcessor) Shutdown(ctx context.Context) error {
	log.Println("Logging span processor shutdown")
	return nil
}

func (l LoggingSpanProcessor) ForceFlush(ctx context.Context) error {
	log.Println("Logging span processor force flush")
	return nil
}
```

### 9.2. Resource Detection

Automatically detect and add resource attributes:

```bash
go get go.opentelemetry.io/otel/sdk/resource
```

```go
// tracing/tracer.go (updated)
import (
	"go.opentelemetry.io/otel/sdk/resource"
	semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
)

func InitTracer(serviceName string) (func(context.Context) error, error) {
	// Detect resources automatically
	res, err := resource.New(
		context.Background(),
		resource.WithDetectors(semconv.NewResourceDetector()),
		resource.WithAttributes(
			semconv.ServiceNameKey.String(serviceName),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create resource: %w", err)
	}

	// ... rest of the function ...
}
```

## Conclusion

Distributed tracing with OpenTelemetry provides powerful insights into the behavior of microservices applications. By implementing the techniques described in this guide, you can:

1.  **Gain Visibility**: Understand how requests flow through your distributed system.
2.  **Diagnose Issues**: Quickly identify and resolve performance bottlenecks and errors.
3.  **Optimize Performance**: Use trace data to optimize your application's performance.
4.  **Improve Reliability**: Build more reliable systems with better observability.

Key takeaways:

1.  **Start Simple**: Begin with basic instrumentation and gradually add more detailed tracing.
2.  **Context Propagation**: Ensure trace context is properly propagated between all services.
3.  **Sampling**: Implement appropriate sampling strategies for production environments.
4.  **Integration**: Combine tracing with metrics and logging for comprehensive observability.
5.  **Best Practices**: Follow established best practices for naming, attributes, and error handling.

As you implement distributed tracing in your Go microservices, remember that the goal is not just to collect data, but to use that data to build better, more reliable systems. With OpenTelemetry's vendor-neutral approach and rich ecosystem, you have the tools to achieve this goal effectively.

The examples provided in this guide offer a solid foundation for implementing distributed tracing in your own applications. As you become more familiar with these concepts, you can explore more advanced features like custom span processors, resource detection, and integration with other observability tools to further enhance your system's observability.

---

## Related Articles

- [From Trace to Insight: Closed-Loop Observability Practice](/golang/From-Trace-to-Insight-A-Closed-Loop-Observability-Practice-for-Go-Projects.html) - Advanced observability patterns and closed-loop practices
- [Building Scalable Microservices with gRPC](/golang/scalable-web-services-go-grpc.html) - Learn how to build microservices that benefit from distributed tracing
- [Go Containerization Best Practices](/golang/Go-Containerization-Best-Practices-Docker-Optimization.html) - Deploy your observability stack efficiently
- [Building Kubernetes Operators with Go](/golang/Building-Kubernetes-Operators-with-Go-Complete-Guide.html) - Automate observability tool deployment
- [Advanced Go Testing Techniques](/golang/mastering-go-testing-advanced-techniques.html) - Test your distributed systems effectively