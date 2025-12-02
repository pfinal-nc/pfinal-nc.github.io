---
title: "Go Observability with OpenTelemetry 2025: From Data Collection to Actionable Insights"
date: 2025-10-29 10:00:00
tags:
  - golang
  - observability
  - OpenTelemetry
  - trace
  - metrics
  - logs
description: "Stop blindly integrating OTel. Learn how to turn traces, metrics, and logs into real insights that drive engineering decisions. A practical guide for Go teams running multiple services in production."
author: PFinal Nan Cheng
keywords:
  - go observability best practices
  - go opentelemetry guide
  - go distributed tracing
  - go metrics and logs
  - go slo alerting
  - opentelemetry go tutorial
  - observability for go microservices
  - production monitoring go services
  - go otel setup 2025
  - go service monitoring
---

# From Trace to Insight: A Closed-Loop Observability Practice for Go Projects

——Don't be an engineer who "sees but doesn't understand"

Last time I talked about "Stop blindly integrating OTel", and many people asked: Then what should we do?
We've integrated trace, metrics, and logs, but when problems arise, we still rely on grep + intuition (making guesses).

This article discusses: **How to move from "integration" to "insight" in observability closed-loop.**

This is for Go teams with multiple services that have already integrated OTel, aiming to transform these three components from "data reporting" to "decision driving".

---

## Quick Navigation

**Core Concepts**:
- [Closed-Loop Overview](#closed-loop-overview-the-interconnected-path-of-three-signals) - Understanding the overall architecture
- [Trace Best Practices](#step-1-making-traces-actually-readable) - Naming conventions, sampling strategies, Baggage
- [Metrics System](#step-2-metrics-is-not-just-a-collector-but-a-signaling-system) - RED/USE methodology, SLO alerting
- [Logs Normalization](#step-3-logs-should-be-normalized-not-just-accumulated) - Unified fields, automatic correlation, sampling strategies

**Implementation Guidance**:
- [Engineering Examples](#step-6-engineering-implementation-minimal-running-examples) - Ready-to-use complete code
- [Common Pitfalls Checklist](#step-7-common-pitfalls-checklist) - Avoiding 23 common issues
- [Alert Configuration](#24-sli-slo-and-burn-rate-alerts) - Prometheus alert rules
- [Docker Environment](#63-recommended-local-observability-stack) - One-click deployment of complete observability stack

**Advanced Scenarios**:
- [Baggage Propagation](#15-baggage-cross-service-transmission-of-business-context) - Multi-tenant business context
- [Message Queue Context](#16-message-queue-context-propagation) - Kafka/RabbitMQ tracing
- [Log Sampling](#35-log-sampling-to-control-hot-path-noise) - Controlling noise in high QPS paths

---

## Closed-Loop Overview: The Interconnected Path of Three Signals

A complete observability closed-loop should flow like this:

```
[Collection] Standardized collection of Trace/Metrics/Logs
   ↓
[Correlation] Connecting the three signals through trace_id/span_id
   ↓
[Alerting] Metrics triggering SLO/SLI alerts
   ↓
[Retrospection] Automatically aggregating relevant Traces + correlated Logs context
   ↓
[Review] Generating improvement items → code/configuration changes
   ↓
[Verification] Rechecking metrics/alerts to ensure resolution → forming evidence chain
```

**Key Integration Points**:
- Metrics alerts → automatic retrieval of traces for the corresponding time period
- Trace details → one-click navigation to correlated logs
- Logs aggregation → reverse location to spans
- Alert cards → automatically attached with runbooks, responsible personnel, and SLAs

Only when you form this kind of "data → reasoning → action → verification" cycle can you truly enter the observability closed-loop.

---

## Step 1: Making Traces Actually Readable

Most Go service traces look like a plate of spaghetti: hundreds of spans with no hierarchy or business meaning.
This is because tracing is too "technical", focusing on functions rather than business processes.

**Bad Example**:

```go
span := tracer.Start(ctx, "ProcessRequest")
```

**Good Example**:

```go
span := tracer.Start(ctx, "OrderService.PlaceOrder")
```

The difference: the first tells you which function was called, the second tells you what the system is doing.

### 1.1 Resource and Semantic Standards

All trace data must carry standard resource attributes for cross-service aggregation and filtering:

```go
import (
    "context"
    "fmt"
    
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/sdk/resource"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

res, err := resource.New(context.Background(),
    resource.WithAttributes(
        semconv.ServiceName("order-svc"),
        semconv.ServiceVersion("1.2.3"),
        semconv.DeploymentEnvironment("prod"),
        attribute.String("team", "payments"),
    ),
)
if err != nil {
    return fmt.Errorf("failed to create resource: %w", err)
}
```

### 1.2 Span Naming and Error Recording Standards

**Naming Convention**: Use `<Domain>.<Service>.<Action>` format, keep consistent within the team.

```go
// Recommended format examples
span := tracer.Start(ctx, "Payment.OrderService.CreateOrder")
span := tracer.Start(ctx, "Inventory.StockService.ReserveItem")
```

**Error Recording Standards**: Use `RecordError` + `SetStatus`, distinguishing between business validation failures and system errors.

```go
import "go.opentelemetry.io/otel/codes"

defer func() {
    if err != nil {
        span.RecordError(err)
        if errors.Is(err, ErrBusinessValidation) {
            span.SetStatus(codes.Error, "business_validation_failed")
        } else {
            span.SetStatus(codes.Error, "system_error")
        }
    } else {
        span.SetStatus(codes.Ok, "")
    }
}()
```

### 1.3 Propagation and Middleware

**HTTP and gRPC Automatic Injection**:

```go
import (
    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
    "go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
)

// HTTP Server
mux := http.NewServeMux()
handler := otelhttp.NewHandler(mux, "http.server")

// gRPC Server
grpcServer := grpc.NewServer(
    grpc.UnaryInterceptor(otelgrpc.UnaryServerInterceptor()),
)
```

**Cross-Goroutine Propagation**: Always explicitly pass `context`, otherwise traces will be broken.

```go
// Wrong: context not passed
go func() {
    span := tracer.Start(context.Background(), "async.task") // ❌ Broken trace
}()

// Correct: explicitly pass context
go func(ctx context.Context) {
    span := tracer.Start(ctx, "async.task") // ✅ Maintains trace
    defer span.End()
}(ctx)
```

**Common Edge Cases**:

```go
// 1. HTTP Client calls (common oversight)
req, err := http.NewRequestWithContext(ctx, "GET", url, nil) // ✅
// Instead of http.NewRequest(), which cannot propagate trace context

// 2. Scheduled task scenarios
ticker := time.NewTicker(5 * time.Second)
for range ticker.C {
    // ❌ Creating new context every time, breaking traces
    // ctx := context.Background()
    
    // ✅ Derive a context with timeout from the root context
    taskCtx, cancel := context.WithTimeout(rootCtx, 30*time.Second)
    go processTask(taskCtx)
    cancel()
}

// 3. Database queries
// ✅ Use context-aware methods
rows, err := db.QueryContext(ctx, query, args...)
// Instead of db.Query()
```

### 1.4 Sampling Strategies: From Static to Dynamic

**Static Sampling** (simple scenarios):

```go
import "go.opentelemetry.io/otel/sdk/trace"

tp := trace.NewTracerProvider(
    trace.WithSampler(trace.TraceIDRatioBased(0.1)), // 10% sampling rate
)
```

**Dynamic Sampling** (advanced):
- **Tail-based sampling**: Collect all first, then decide to keep based on latency/errors
- **Route-based sampling**: Low sampling for health checks, high sampling for core business paths
- **Error full sampling**: 100% retention for any traces containing Error status

```go
// Pseudocode example: Custom sampler
type SmartSampler struct{}

func (s *SmartSampler) ShouldSample(p trace.SamplingParameters) trace.SamplingResult {
    // Full retention for error spans
    if hasError(p.Attributes) {
        return trace.SamplingResult{Decision: trace.RecordAndSample}
    }
    // Low sampling for health checks
    if isHealthCheck(p.Name) {
        return trace.SamplingResult{Decision: trace.Drop}
    }
    // Proportional sampling for other paths
    return trace.TraceIDRatioBased(0.1).ShouldSample(p)
}
```

### 1.5 Baggage: Cross-Service Transmission of Business Context

In microservice architectures, besides trace_id, we often need to transmit business identifiers (such as tenant_id, user_id). Baggage is OTel's standard solution.

```go
import "go.opentelemetry.io/otel/baggage"

// Upstream service: Inject business context
member, _ := baggage.NewMember("tenant.id", tenantID)
bag, _ := baggage.New(member)
ctx = baggage.ContextWithBaggage(ctx, bag)

// Downstream service: Extract business context
bag := baggage.FromContext(ctx)
tenantID := bag.Member("tenant.id").Value()

// Practical scenario: Multi-tenant SaaS
func (s *OrderService) CreateOrder(ctx context.Context, req *OrderRequest) error {
    // Extract tenant information from baggage
    tenantID := baggage.FromContext(ctx).Member("tenant.id").Value()
    
    // Record to span attributes (for easy querying)
    span := trace.SpanFromContext(ctx)
    span.SetAttributes(attribute.String("tenant.id", tenantID))
    
    // Record to logs (for correlation analysis)
    logger.Ctx(ctx).Info("creating order", zap.String("tenant_id", tenantID))
    
    // Business logic...
    return s.repo.Create(ctx, tenantID, req)
}
```

**Notes**:
- Baggage is propagated through HTTP headers, be mindful of size limitations (recommended < 1KB)
- Sensitive information (such as user phone numbers) is prohibited from being placed in Baggage; it should be placed in Span attributes
- Baggage keys should follow team-wide unified standards (e.g., `tenant.id` instead of `tenantId`)

### 1.6 Message Queue Context Propagation

In asynchronous message scenarios (Kafka, RabbitMQ, NATS, etc.), trace context needs to be propagated through message headers.

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/propagation"
    "github.com/segmentio/kafka-go"
)

// Kafka Producer: Inject trace context
// writer is an initialized *kafka.Writer, injected according to your project's actual setup
func PublishEvent(ctx context.Context, topic string, event []byte) error {
    tracer := otel.Tracer("kafka-producer")
    ctx, span := tracer.Start(ctx, "kafka.publish")
    defer span.End()
    
    // Create Kafka message
    msg := kafka.Message{
        Topic: topic,
        Value: event,
    }
    
    // Inject trace context into message headers
    propagator := otel.GetTextMapPropagator()
    carrier := propagation.MapCarrier{}
    propagator.Inject(ctx, carrier)
    
    // Convert carrier to Kafka Headers
    for k, v := range carrier {
        msg.Headers = append(msg.Headers, kafka.Header{
            Key:   k,
            Value: []byte(v),
        })
    }
    
    // Send message
    return writer.WriteMessages(ctx, msg)
}

// Kafka Consumer: Extract trace context
func ConsumeEvent(msg kafka.Message) error {
    // Extract trace context from message headers
    carrier := propagation.MapCarrier{}
    for _, h := range msg.Headers {
        carrier.Set(h.Key, string(h.Value))
    }
    
    propagator := otel.GetTextMapPropagator()
    ctx := propagator.Extract(context.Background(), carrier)
    
    // Create new span (inherits upstream trace)
    tracer := otel.Tracer("kafka-consumer")
    ctx, span := tracer.Start(ctx, "kafka.consume")
    defer span.End()
    
    span.SetAttributes(
        attribute.String("messaging.system", "kafka"),
        attribute.String("messaging.destination", msg.Topic),
        attribute.Int("messaging.partition", msg.Partition),
    )
    
    // Process business logic (pass ctx)
    return handleEvent(ctx, msg.Value)
}
```

**RabbitMQ Scenario**:

```go
import (
    "github.com/streadway/amqp"
    "go.opentelemetry.io/otel/propagation"
)

// RabbitMQ Producer
// channel is an initialized *amqp.Channel, injected according to your project's actual setup
func PublishToQueue(ctx context.Context, exchange, routingKey string, body []byte) error {
    propagator := otel.GetTextMapPropagator()
    carrier := propagation.MapCarrier{}
    propagator.Inject(ctx, carrier)
    
    // Convert to AMQP Headers
    headers := amqp.Table{}
    for k, v := range carrier {
        headers[k] = v
    }
    
    return channel.Publish(exchange, routingKey, false, false, amqp.Publishing{
        Headers: headers,
        Body:    body,
    })
}

// RabbitMQ Consumer
func HandleDelivery(d amqp.Delivery) error {
    carrier := propagation.MapCarrier{}
    for k, v := range d.Headers {
        if str, ok := v.(string); ok {
            carrier.Set(k, str)
        }
    }
    
    propagator := otel.GetTextMapPropagator()
    ctx := propagator.Extract(context.Background(), carrier)
    
    // Process message
    return processMessage(ctx, d.Body)
}
```

Common pitfalls to avoid:

- Make span names close to business semantics, not just function names
- Control trace depth within 8 layers; anything more becomes noise
- Add business attributes to critical paths, such as `span.SetAttributes(attribute.String("order.id", id))`
- Use `otelhttp`/`otelgrpc` for automatic injection, reduce manual instrumentation
- Explicitly pass `context` across goroutines to avoid broken traces
- Full sampling for error paths, low sampling for health checks

---

## Step 2: Metrics is Not Just a Collector, But a Signaling System

Many teams have an overwhelming amount of metrics but lack **decision value**.
A truly mature metrics system should have three layers of meaning:

1. **Infrastructure Layer**: CPU, memory, goroutine, GC statistics.

2. **Application Layer**: Request rates, error rates, latency distribution.

3. **Business Layer**: Order creation rate, active device count, task latency.

The most critical is the third layer.
**Business metrics are the bridge for teams to understand their systems.**
Relying solely on technical metrics, you'll never know whether "slow user checkout" is due to Redis issues or inefficient code logic.

### 2.1 Metric Type Selection: RED/USE Methodology

**RED Method** (for request-oriented services):
- **R**ate: Request rate → Counter
- **E**rrors: Error rate → Counter
- **D**uration: Latency distribution → Histogram

**USE Method** (for resource-oriented services):
- **U**tilization: Resource utilization → Gauge
- **S**aturation: Resource saturation → Gauge
- **E**rrors: Error count → Counter

### 2.2 Latency Histograms + Exemplars (Correlated with Traces)

Meters (Counter/Histogram/Gauge) should be created once during initialization, not repeatedly in requests.

```go
import (
    "go.opentelemetry.io/otel/metric"
)

lat := meter.Float64Histogram(
    "http.server.duration",
    metric.WithUnit("s"),
    metric.WithDescription("HTTP request duration"),
)

start := time.Now()
// ... process request ...
lat.Record(ctx, time.Since(start).Seconds(),
    metric.WithAttributes(
        attribute.String("route", "/orders"),
        attribute.String("method", "POST"),
        attribute.Int("status", 200),
    ),
)
```

**Enabling Exemplars**: In Prometheus/Grafana, clicking on a histogram bucket can directly jump to the corresponding trace, achieving "metrics → trace" one-click navigation.

### 2.3 Label Governance: Controlling Cardinality

**Bad Example** (high cardinality labels):

```go
// ❌ user_id/request_id will cause metrics explosion
metric.WithAttributes(
    attribute.String("user_id", uid),        // Million-level cardinality
    attribute.String("request_id", reqID),   // Infinite cardinality
)
```

**Correct Approach**:

```go
// ✅ Only retain low cardinality dimensions
metric.WithAttributes(
    attribute.String("route", "/orders"),    // Limited routes
    attribute.String("method", "POST"),      // Limited methods
    attribute.Int("status_class", 2),        // 2xx/4xx/5xx
)
// user_id/request_id should be recorded in Trace attributes or Logs
```

### 2.4 SLI/SLO and Burn Rate Alerts

**Define SLO**: 99.9% of requests have latency < 500ms (30-day window)

**Burn Rate Alerts** (multi-window):
- **Quick response** (1-hour window): Error rate > 14.4x budget consumption rate → immediate alert
- **Slow response** (6-hour window): Error rate > 6x budget consumption rate → secondary alert

This allows detecting anomalies before SLOs are fully depleted, avoiding alert storms.

**Prometheus Alert Rules Example**:

```yaml
# prometheus/alerts/slo.yml
groups:
  - name: slo_burn_rate_alerts
    interval: 30s
    rules:
      # Quick burn rate alert (1-hour window)
      - alert: HighErrorBurnRate_1h
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[1h]))
            /
            sum(rate(http_requests_total[1h]))
          ) > 0.0144
        for: 2m
        labels:
          severity: critical
          slo: availability
        annotations:
          summary: "SLO Quick Burn (1-hour window)"
          description: "Error rate {{ $value | humanizePercentage }}, exceeding 14.4x budget consumption"
          runbook_url: "https://wiki.company.com/runbook/high-error-rate"
          
      # Slow burn rate alert (6-hour window)
      - alert: MediumErrorBurnRate_6h
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[6h]))
            /
            sum(rate(http_requests_total[6h]))
          ) > 0.006
        for: 15m
        labels:
          severity: warning
          slo: availability
        annotations:
          summary: "SLO Continuous Burn (6-hour window)"
          description: "Error rate {{ $value | humanizePercentage }}, exceeding 6x budget consumption"
          
      # P99 latency SLO alert
      - alert: HighLatencyBurnRate
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_server_duration_bucket[5m])) by (le, route)
          ) > 0.5
        for: 5m
        labels:
          severity: warning
          slo: latency
        annotations:
          summary: "P99 Latency Exceeds SLO (500ms)"
          description: "P99 latency for route {{ $labels.route }}: {{ $value }}s"
```

Note the metric name mapping: `http.server.duration` in Prometheus becomes `http_server_duration_seconds_bucket` (dots become underscores, unit suffix added).

Key practical points:

- Define triggering conditions for each metric, such as error rate > 1% within 5 minutes
- Don't call directly for alerts; first push traces to locate root causes
- Don't misuse Counter/Histogram/Gauge types
- Enable Exemplars for latency metrics for one-click trace navigation
- Limit label cardinality: user_id/request_id should go to logs, not metrics
- Use burn rate alerts (fast/slow double window) for SLOs, don't wait for complete failure

---

## Step 3: Logs Should Be Normalized, Not Just Accumulated

Go developers often make the mistake of "logging everything": mixing `fmt.Println`, `log.Printf`, and `zap.Sugar()`. 
Once OTel + Loki is integrated, the result is an explosion of log noise.

What you need is not **more logs**, but **integrated context**:

1. Logs should carry trace_id.

2. Traces should allow backtracking to logs when expanded.

3. When alerts occur, automatically aggregate related log contexts.

### 3.1 Unified Log Field Standards

All logs must contain the following standard fields:

| Field | Type | Required | Description |
|------|------|------|------|
| `trace_id` | string | ✅ | Correlated Trace |
| `span_id` | string | ✅ | Correlated Span |
| `service.name` | string | ✅ | Service name |
| `env` | string | ✅ | Environment (prod/staging) |
| `version` | string | ✅ | Service version |
| `level` | string | ✅ | Log level |
| `message` | string | ✅ | Log content |
| `tenant_id` | string | ❌ | Tenant identifier (multi-tenant scenarios) |
| `user_id` | string | ❌ | User identifier (needs masking/hashing) |

### 3.2 Context-Based Logger

**Not Recommended** (manually concatenating trace fields):

```go
logger := zap.L().With(
    zap.String("trace_id", trace.SpanContextFromContext(ctx).TraceID().String()),
    zap.String("span_id", trace.SpanContextFromContext(ctx).SpanID().String()),
)
logger.Info("user payment timeout", zap.String("order_id", oid))
```

**Recommended** (using `otelzap` or similar libraries):

```go
import "github.com/uptrace/opentelemetry-go-extra/otelzap"

// Initialization (once)
logger := otelzap.New(zap.L())

// Usage (automatically injects trace_id/span_id)
logger.Ctx(ctx).Info("user payment timeout",
    zap.String("order_id", oid),
    zap.String("amount", "99.99"),
)
```

### 3.3 Privacy and Compliance: PII Masking

**Sensitive fields must be masked or hashed**:

```go
// ❌ Plaintext recording of sensitive information
logger.Info("user login", zap.String("phone", "13800138000"))

// ✅ Hashing or partial masking
logger.Info("user login", zap.String("phone_hash", hashPhone("13800138000")))
logger.Info("user login", zap.String("phone_masked", "138****8000"))
```

**Whitelist Mechanism**: Only record predefined business fields, prohibit directly printing complete request/response bodies.

### 3.4 Automatic Correlation Views Between Logs and Traces

Configure in Grafana/Tempo:
- From Trace details page → automatically query logs with corresponding `trace_id` (Loki)
- From Loki log entries → one-click navigation to corresponding Trace (Tempo)

**Grafana Configuration Example** (datasource correlation):

```yaml
# grafana datasources
- name: Tempo
  type: tempo
  uid: tempo
  jsonData:
    tracesToLogs:
      datasourceUid: 'loki'
      tags: ['trace_id']
```

### 3.5 Log Sampling: Controlling Hot-Path Noise

Production environment log volume can be very large, especially for high QPS hot paths. Reasonable log sampling strategies are crucial.

```go
import (
    "go.uber.org/zap/zapcore"
    "github.com/uptrace/opentelemetry-go-extra/otelzap"
)

// Zap dynamic sampling configuration
core := zapcore.NewSamplerWithOptions(
    zapcore.NewCore(encoder, writer, zapcore.InfoLevel),
    time.Second,    // Sampling time window
    100,            // Initial allowed log count in window
    10,             // Allowed log count per second afterward
)

base := zap.New(core)
logger := otelzap.New(base)

// Practical scenario: Hot path noise reduction
func (h *HealthHandler) Check(ctx context.Context) error {
    // ✅ Health checks only log errors
    if err := h.checkDatabase(ctx); err != nil {
        logger.Ctx(ctx).Error("health check failed", zap.Error(err))
        return err
    }
    // Successful health checks don't log (to avoid noise)
    return nil
}

// Core business path: Full logging
func (s *OrderService) CreateOrder(ctx context.Context, req *OrderRequest) error {
    logger.Ctx(ctx).Info("order creation started", zap.String("order_id", req.ID))
    // ... business logic
    logger.Ctx(ctx).Info("order creation completed")
    return nil
}
```

**Sampling Strategy Recommendations**:
- **Health checks**: Only log failures, silence success
- **High-frequency queries**: Sample at 1:100 or 1:1000
- **Write operations**: Full recording (create, update, delete)
- **Error paths**: 100% full recording

Key implementation points:

- Use a unified logging library, recommended `zap` + `otelzap`
- Logs should automatically carry `trace_id`/`span_id`, no manual concatenation
- Define field whitelists, don't log entire request bodies
- Sensitive fields (phone numbers/card numbers/passwords) must be masked
- Configure bidirectional navigation between Trace ↔ Logs in Grafana
- Sample hot paths, only log errors for health checks

---

## Step 4: Observability ≠ Three Things

Many people think "trace + metrics + logs = observability".
Wrong.
These three are just "input signals"; true observability comes from "feedback".

That means:

1. Alerts should trigger reverse data retrieval (e.g., trace retrospection).

2. Trace analysis should guide metrics optimization.

3. Metrics anomalies should drive log aggregation.

Only when this kind of "data → reasoning → adjustment" cycle is formed can a team truly enter a "observability culture".

### 4.1 Automated Feedback Action List

When an alert is triggered, the system should automatically perform the following actions:

1. **Automatically aggregate relevant data**
   - Retrieve traces from 10 minutes before and after the alert time (including error spans)
   - Aggregate log contexts from related services (correlated via `trace_id`)
   - Obtain Metrics trends from upstream/downstream dependencies (Redis/DB/external APIs)

2. **Alert Card Enhancement**
   - **Runbook**: Predefined troubleshooting manual links
   - **Responsible Person**: Automatically @ on-duty engineer
   - **SLA**: Response time limits (P0:15min/P1:1h)
   - **One-click Incident Creation**: Automatically generate incidents and associate Traces/Logs

3. **Review Closed-Loop**
   ```
   Incident Occurs → Root Cause Analysis (Trace+Logs)
      ↓
   Improvement Items (Action Items)
      ↓
   Code/Configuration Changes (PR/Config)
      ↓
   Regression Verification (Check if metrics/alerts have disappeared)
      ↓
   Evidence Chain Formation (Post-Mortem document)
   ```

### 4.2 Three-Signal Collaboration Scenario Example

**Scenario**: Order service P99 latency spikes

1. **Metrics Alert**: `http.server.duration` P99 increases from 200ms to 2s
2. **Automatic Trace Retrospection**: Discover `OrderService.QueryInventory` span with 1.8s latency
3. **Correlated Logs**: Aggregate logs for this span,发现大量 `inventory service timeout`
4. **Root Cause Identification**: Inventory service database slow query
5. **Improvement Item**: Add index + set query timeout
6. **Verification**: After release, P99 latency returns to 180ms, alert disappears

Here's how to make it work:

- Alert rules should link to runbooks and on-duty personnel
- Alert triggering should automatically pull Traces + Logs
- Write reviews for each failure (screenshots + improvement items)
- Check metrics recovery after changes
- Solidify "alert → analysis → improvement → verification" into SOP

---

## Step 5: Transition from Engineering to Culture

Ultimately, a project's observability doesn't depend on frameworks, but on culture.
You need to ensure every engineer can answer three questions:

1. Can my code be observed?

2. When anomalies are observed, can I know the reason?

3. Can I turn this insight into action?

These three questions are more valuable than any exporter or dashboard.

### 5.1 Team Capability Self-Assessment Checklist

**Level 1: Integration Phase**
- All services have integrated Trace/Metrics/Logs
- Unified Exporter configuration
- Basic Dashboard visualization

**Level 2: Correlation Phase**
- Trace/Logs automatically correlated through `trace_id`
- Metrics alerts can jump to corresponding Traces
- Team can quickly locate "which service has issues"

**Level 3: Closed-Loop Phase**
- Alerts automatically aggregate context (Trace+Logs+dependency Metrics)
- Each incident has review + improvement items + regression verification
- Team evolves from "passive response" to "proactive prediction"

### 5.2 Three Pillars of Observability Culture

1. **Transparency**: Health status and SLO achievement rates of all services are publicly visible
2. **Collaboration**: Alerts trigger cross-team collaboration rather than "blame games"
3. **Iteration**: Weekly reviews of observability improvement items (e.g., reducing false positives, optimizing sampling)

---

## Step 6: Engineering Implementation: Minimal Running Examples

The following is a minimal configuration skeleton for integrating OpenTelemetry into Go projects, ready for direct copying and use.

### 6.1 Initializing TracerProvider + MeterProvider

```go
package observability

import (
    "context"
    "fmt"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
    "go.opentelemetry.io/otel/sdk/metric"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

// InitObservability initializes Tracer and Meter (production-ready complete example)
func InitObservability(ctx context.Context, serviceName, version, env string) (func(), error) {
    // 1. Create resource (note error handling)
    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName(serviceName),
            semconv.ServiceVersion(version),
            semconv.DeploymentEnvironment(env),
        ),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create resource: %w", err)
    }

    // 2. Initialize TracerProvider
    traceExporter, err := otlptracehttp.New(ctx,
        otlptracehttp.WithEndpoint("localhost:4318"),
        otlptracehttp.WithInsecure(),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create trace exporter: %w", err)
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(traceExporter),
        sdktrace.WithResource(res),
        sdktrace.WithSampler(sdktrace.TraceIDRatioBased(0.1)), // 10% sampling
    )
    otel.SetTracerProvider(tp)

    // 3. Initialize MeterProvider
    metricExporter, err := otlpmetrichttp.New(ctx,
        otlpmetrichttp.WithEndpoint("localhost:4318"),
        otlpmetrichttp.WithInsecure(),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create metric exporter: %w", err)
    }

    mp := metric.NewMeterProvider(
        metric.WithReader(
            metric.NewPeriodicReader(metricExporter,
                metric.WithInterval(10*time.Second), // Export every 10 seconds
            ),
        ),
        metric.WithResource(res),
    )
    otel.SetMeterProvider(mp)

    // 4. Return cleanup function (must be called, otherwise data loss)
    return func() {
        shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer cancel()
        
        // Shut down TracerProvider first
        if err := tp.Shutdown(shutdownCtx); err != nil {
            fmt.Printf("Error shutting down tracer provider: %v\n", err)
        }
        
        // Then shut down MeterProvider
        if err := mp.Shutdown(shutdownCtx); err != nil {
            fmt.Printf("Error shutting down meter provider: %v\n", err)
        }
    }, nil
}
```

### 6.2 HTTP/gRPC Middleware Integration

```go
package main

import (
    "context"
    "log"
    "net/http"

    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
    "go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
    "google.golang.org/grpc"
)

func main() {
    ctx := context.Background()
    
    // Initialize observability (proper error handling)
    cleanup, err := observability.InitObservability(ctx, "order-service", "1.0.0", "prod")
    if err != nil {
        log.Fatalf("Failed to initialize observability: %v", err)
    }
    defer cleanup() // Ensure resources are cleaned up when program exits

    // HTTP Server
    mux := http.NewServeMux()
    mux.HandleFunc("/orders", handleOrders)
    mux.HandleFunc("/health", handleHealth)
    
    // Wrap with OTel middleware
    handler := otelhttp.NewHandler(mux, "http.server")
    
    log.Println("Starting HTTP server on :8080")
    if err := http.ListenAndServe(":8080", handler); err != nil {
        log.Fatalf("HTTP server failed: %v", err)
    }

    // gRPC Server (if needed)
    grpcServer := grpc.NewServer(
        grpc.UnaryInterceptor(otelgrpc.UnaryServerInterceptor()),
        grpc.StreamInterceptor(otelgrpc.StreamServerInterceptor()),
    )
    // ... register services ...
}
```

### 6.3 Recommended Local Observability Stack

**Option 1: Grafana Stack (production-ready docker-compose)**

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Tempo - Distributed tracing
  tempo:
    image: grafana/tempo:latest
    command: ["-config.file=/etc/tempo.yaml"]
    volumes:
      - ./config/tempo.yaml:/etc/tempo.yaml
      - tempo-data:/tmp/tempo
    ports:
      - "4318:4318"   # OTLP HTTP
      - "4317:4317"   # OTLP gRPC
      - "3200:3200"   # Tempo UI
    networks:
      - observability

  # Prometheus - Metrics storage
  prometheus:
    image: prom/prometheus:latest
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./config/alerts:/etc/prometheus/alerts
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - observability

  # Loki - Log aggregation
  loki:
    image: grafana/loki:latest
    command: ["-config.file=/etc/loki/config.yaml"]
    volumes:
      - ./config/loki.yaml:/etc/loki/config.yaml
      - loki-data:/loki
    ports:
      - "3100:3100"
    networks:
      - observability

  # Grafana - Visualization
  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - ./config/grafana/datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml
      - grafana-data:/var/lib/grafana
    ports:
      - "3000:3000"
    networks:
      - observability
    depends_on:
      - tempo
      - prometheus
      - loki

volumes:
  tempo-data:
  prometheus-data:
  loki-data:
  grafana-data:

networks:
  observability:
    driver: bridge
```

**Minimum Configuration Files**:

```yaml
# config/tempo.yaml
server:
  http_listen_port: 3200

distributor:
  receivers:
    otlp:
      protocols:
        http:
        grpc:

storage:
  trace:
    backend: local
    local:
      path: /tmp/tempo/blocks

# config/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

# Load alert rules
rule_files:
  - "/etc/prometheus/alerts/*.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

# config/loki.yaml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/index
    cache_location: /loki/cache
  filesystem:
    directory: /loki/chunks

# config/grafana/datasources.yml
apiVersion: 1

datasources:
  - name: Tempo
    type: tempo
    access: proxy
    url: http://tempo:3200
    uid: tempo
    jsonData:
      tracesToLogs:
        datasourceUid: loki
        tags: ['trace_id']
        
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    uid: prometheus
    isDefault: true
    
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    uid: loki
    jsonData:
      derivedFields:
        - datasourceUid: tempo
          # If logs are JSON, match fields like "trace_id":"<hex>"
          matcherRegex: '"trace_id":"([a-f0-9]+)"'
          name: TraceID
          url: '$${__value.raw}'
          # You can also store trace_id as a label and use labels in tracesToLogs configuration
```

**Start Commands**:

```bash
# Create configuration file directories
mkdir -p config/grafana config/alerts

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Access Grafana: http://localhost:3000
# Access Prometheus: http://localhost:9090
# Access Tempo: http://localhost:3200
```

**Option 2**: Using commercial SaaS (Datadog/New Relic/Honeycomb)

Suitable for teams with >50 members or those who don't want to maintain infrastructure, pay-as-you-go, ready to use out of the box.

### 6.4 Environment Variable Configuration

Configure environment variables according to OTel standard specifications:

```bash
# .env - OpenTelemetry standard environment variables

# Service identification (set uniformly via OTEL_RESOURCE_ATTRIBUTES)
OTEL_RESOURCE_ATTRIBUTES=service.name=order-service,service.version=1.2.3,deployment.environment=prod,team=payments

# OTLP Exporter configuration (must be a complete URL)
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
# Or set Trace and Metric endpoints separately
# OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://tempo:4318
# OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://prometheus:4318

# Sampling configuration
OTEL_TRACES_SAMPLER=traceidratio        # Sampler type
OTEL_TRACES_SAMPLER_ARG=0.1             # 10% sampling rate

# Propagator configuration (W3C Trace Context by default)
OTEL_PROPAGATORS=tracecontext,baggage   # Support trace and baggage propagation

# SDK disable (for debugging)
# OTEL_SDK_DISABLED=false

# Log level
OTEL_LOG_LEVEL=info
```

**Using environment variables in code**:

```go
import (
    "os"
    
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
)

func InitFromEnv(ctx context.Context) (func(), error) {
    // 1. Read configuration from environment variables (agreement to fill host:port, without http://)
    endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    if endpoint == "" {
        endpoint = "localhost:4318" // Default value
    }
    
    // 2. Resource attributes automatically read from OTEL_RESOURCE_ATTRIBUTES
    res, err := resource.New(ctx,
        resource.WithFromEnv(),   // Automatically read environment variables
        resource.WithTelemetrySDK(), // Add SDK information
        resource.WithHost(),         // Add host information
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create resource: %w", err)
    }
    
    // 3. Exporter configuration
    exporter, err := otlptracehttp.New(ctx,
        otlptracehttp.WithEndpoint(endpoint), // Like "otel-collector:4318"
        otlptracehttp.WithInsecure(),
    )
    
    // ... other initialization logic
}
```

**Docker Compose Environment Variable Example**:

```yaml
services:
  order-service:
    image: order-service:latest
    environment:
      - OTEL_RESOURCE_ATTRIBUTES=service.name=order-service,service.version=1.2.3,deployment.environment=prod
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
      - OTEL_TRACES_SAMPLER=traceidratio
      - OTEL_TRACES_SAMPLER_ARG=0.1
      - OTEL_PROPAGATORS=tracecontext,baggage
```

---

## Step 7: Common Pitfalls Checklist

During actual implementation, here are the most common pitfalls, please check them one by one:

### 7.1 Trace Related

- Forgetting to set `service.name` or `service.version` (making it impossible to distinguish services)
- Excessive span creation in library/utility functions (causing trace depth explosion)
- Hot path spans too deep (> 10 layers) or too many (> 100 spans)
- Not calling `span.End()` or `defer span.End()` (causing span leaks)
- Not calling `TracerProvider.Shutdown()` (causing data loss)
- Forgetting to pass `context` across goroutines (breaking trace links)

### 7.2 Metrics Related

- Using `user_id`/`request_id` as metric labels (causing cardinality explosion)
- Improper histogram bucket settings (e.g., only `[0.1, 1, 10]`, unable to distinguish between 10ms and 100ms)
- Using Counter as Gauge (e.g., "total requests" mistakenly using Gauge)
- Forgetting to add units to metrics (e.g., `http.duration` should specify `s` or `ms`)
- Not enabling Exemplars (missing "metrics → trace" one-click capability)

### 7.3 Logs Related

- Mixing logging libraries (`fmt.Println` + `log` + `zap`)
- Logs not automatically correlated with traces (manual concatenation of `trace_id` error-prone)
- Frequently constructing new Logger in hot paths (should reuse `logger.With()`)
- Sensitive information not masked (phone numbers/card numbers/passwords recorded in plaintext)
- Debug level logging enabled in production (causing log explosion)

### 7.4 Integration Related

- Using synchronous Exporters to block requests (should use `BatchSpanProcessor`)
- OTLP Exporter not setting timeout (network jitter causing service freeze)
- Not setting maximum queue length (risk of memory leaks)
- Forgetting to close Exporter during local development (resource leaks)

### 7.5 Performance Related

- Relying on traces for "performance analysis" (should supplement with `pprof`/eBPF profiling)
- 100% sampling in production (cost explosion + performance impact)
- Not setting sampling rate environment variables (mixing same configuration for development/production)

### 7.6 Concurrency Safety and Resource Management

Core components of the OTel SDK are concurrency-safe:

```go
// The following objects can be shared globally, create them during initialization
var (
    tracer = otel.Tracer("my-service")
    meter  = otel.Meter("my-service")

    requestsCounter metric.Int64Counter
)

func init() {
    var err error
    requestsCounter, err = meter.Int64Counter("http.server.requests")
    if err != nil { panic(err) }
}

// Direct use in high concurrency
type Handler struct{}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    ctx, span := tracer.Start(r.Context(), "handle_request")
    defer span.End()

    requestsCounter.Add(ctx, 1, metric.WithAttributes(attribute.String("route", "/orders")))
}
```

**But Spans themselves are not concurrency-safe**

```go
// Wrong: Multiple goroutines operating on the same span
ctx, span := tracer.Start(ctx, "parent")
go func() {
    span.SetAttributes(attribute.String("key", "value")) // Data race
}()
go func() {
    span.RecordError(err) // Data race
}()

// Correct: Each goroutine creates its own span
ctx, parentSpan := tracer.Start(ctx, "parent")
defer parentSpan.End()

go func(ctx context.Context) {
    _, childSpan := tracer.Start(ctx, "child1")
    defer childSpan.End()
    childSpan.SetAttributes(attribute.String("key", "value"))
}(ctx)

go func(ctx context.Context) {
    _, childSpan := tracer.Start(ctx, "child2")
    defer childSpan.End()
    childSpan.RecordError(err)
}(ctx)
```

**Resource Cleanup Best Practices**:

```go
func main() {
    ctx := context.Background()
    
    // Initialization
    cleanup, err := observability.InitObservability(ctx, "svc", "1.0", "prod")
    if err != nil {
        log.Fatal(err)
    }
    
    // Method 1: Defer cleanup (recommended for short-lived processes)
    defer cleanup()
    
    // Method 2: Signal capture cleanup (recommended for long-lived services)
    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
    
    go func() {
        <-sigCh
        log.Println("Shutting down gracefully...")
        cleanup() // Ensure data export is complete
        os.Exit(0)
    }()
    
    // Start service...
}
```

---

## In Conclusion

The end goal of observability closed-loop is not to make dashboards fancy, but to make team decision-making faster.
When trace, metrics, and logs work together, you can move from "emergency response" to "problem prediction".

**Remember three keywords**:
- **Standardization**: Unified resource attributes, field naming, error recording
- **Correlation**: Connecting the three signals through trace_id for one-click navigation
- **Closed-loop**: Alert → retrospection → improvement → verification, forming an evidence chain

Observability is not a "one-time project", but a continuously evolving engineering culture.
When every engineer can confidently answer "Can my code be observed?", you have succeeded.

---

## Related Articles

Explore more Go observability and development topics:

- [Distributed Tracing with OpenTelemetry](/golang/distributed-tracing-opentelemetry-go.html) - Deep dive into OpenTelemetry implementation
- [Building Scalable Web Services with Go and gRPC](/golang/scalable-web-services-go-grpc.html) - Add observability to gRPC services
- [Advanced Go Concurrency Patterns](/golang/advanced-go-concurrency-patterns) - Monitor concurrent operations and goroutines
- [Mastering Go Testing - Advanced Techniques](/golang/mastering-go-testing-advanced-techniques.html) - Test observability code and metrics
- [Building Kubernetes Operators with Go](/golang/Building-Kubernetes-Operators-with-Go-Complete-Guide.html) - Observability for Kubernetes workloads
- [Go Containerization Best Practices](/golang/Go-Containerization-Best-Practices-Docker-Optimization.html) - Monitor containerized Go applications
- [Building GraphQL APIs with Go](/golang/Building-GraphQL-APIs-with-Go-Complete-Guide-2025.html) - Add tracing to GraphQL resolvers