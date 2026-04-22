---
title: "Go 集成 Prometheus 监控"
date: 2026-04-22 00:00:00
author: PFinal南丞
description: "深入学习 Go 语言集成 Prometheus 监控系统，掌握指标类型、自定义指标、Grafana 可视化等核心技能，构建完整的应用监控体系。"
keywords:
  - Go
  - Prometheus
  - 监控
  - Metrics
  - Grafana
  - Observability
tags:
  - golang
  - prometheus
  - monitoring
  - observability
---

# Go 集成 Prometheus 监控

Prometheus 是一个开源的系统监控和告警工具包，广泛应用于云原生应用的监控。本文将介绍如何在 Go 应用中集成 Prometheus 监控。

## Prometheus 基础

### 核心概念

| 概念 | 说明 |
|------|------|
| Metric（指标） | 被测量的数值 |
| Target（目标） | 被监控的对象 |
| Exporter（导出器） | 将指标暴露给 Prometheus |
| Alert（告警） | 基于规则的告警通知 |

### 指标类型

| 类型 | 说明 | 适用场景 |
|------|------|----------|
| Counter | 单调递增的计数器 | 请求数、错误数 |
| Gauge | 可增可减的瞬时值 | 温度、内存使用 |
| Histogram | 采样分布 | 请求延迟 |
| Summary | 类似 Histogram，但计算分位数 | 请求延迟 |

## 快速开始

### 安装依赖

```bash
go get github.com/prometheus/client_golang/prometheus
go get github.com/prometheus/client_golang/prometheus/promhttp
```

### 基础示例

```go
package main

import (
	"net/http"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// 定义指标
var (
	// Counter: 请求总数
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "endpoint", "status"},
	)

	// Gauge: 当前在线用户数
	activeUsers = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "active_users",
			Help: "Number of active users",
		},
	)

	// Histogram: 请求延迟
	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint"},
	)

	// Summary: 请求延迟分位数
	httpRequestSummary = promauto.NewSummaryVec(
		prometheus.SummaryOpts{
			Name:       "http_request_summary_seconds",
			Help:       "HTTP request latency summary",
			Objectives: map[float64]float64{0.5: 0.05, 0.9: 0.01, 0.99: 0.001},
		},
		[]string{"method", "endpoint"},
	)
)

func main() {
	// 注册指标
	prometheus.MustRegister(httpRequestsTotal)
	prometheus.MustRegister(activeUsers)
	prometheus.MustRegister(httpRequestDuration)
	prometheus.MustRegister(httpRequestSummary)

	// 暴露指标端点
	http.Handle("/metrics", promhttp.Handler())

	// 业务端点
	http.HandleFunc("/api/users", func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// 模拟业务处理
		time.Sleep(100 * time.Millisecond)

		// 记录指标
		duration := time.Since(start).Seconds()
		httpRequestsTotal.WithLabelValues(r.Method, "/api/users", "200").Inc()
		httpRequestDuration.WithLabelValues(r.Method, "/api/users").Observe(duration)
		httpRequestSummary.WithLabelValues(r.Method, "/api/users").Observe(duration)

		w.Write([]byte(`{"users": []}`))
	})

	http.ListenAndServe(":8080", nil)
}
```

## Gin 框架集成

### 中间件实现

```go
package middleware

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
)

// PrometheusMiddleware Prometheus 监控中间件
func PrometheusMiddleware() gin.HandlerFunc {
	// 定义指标
	requestsTotal := prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "path", "status"},
	)

	requestDuration := prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
		},
		[]string{"method", "path"},
	)

	requestSize := prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_size_bytes",
			Help:    "HTTP request size in bytes",
			Buckets: prometheus.ExponentialBuckets(100, 10, 8),
		},
		[]string{"method", "path"},
	)

	responseSize := prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_response_size_bytes",
			Help:    "HTTP response size in bytes",
			Buckets: prometheus.ExponentialBuckets(100, 10, 8),
		},
		[]string{"method", "path"},
	)

	// 注册指标
	prometheus.MustRegister(requestsTotal, requestDuration, requestSize, responseSize)

	return func(c *gin.Context) {
		start := time.Now()

		// 获取请求大小
		requestSizeBytes := float64(c.Request.ContentLength)

		c.Next()

		// 计算延迟
		duration := time.Since(start).Seconds()
		status := strconv.Itoa(c.Writer.Status())

		// 记录指标
		requestsTotal.WithLabelValues(c.Request.Method, c.FullPath(), status).Inc()
		requestDuration.WithLabelValues(c.Request.Method, c.FullPath()).Observe(duration)
		requestSize.WithLabelValues(c.Request.Method, c.FullPath()).Observe(requestSizeBytes)
		responseSize.WithLabelValues(c.Request.Method, c.FullPath()).Observe(float64(c.Writer.Size()))
	}
}
```

### 使用示例

```go
package main

import (
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"yourapp/middleware"
)

func main() {
	r := gin.New()

	// 使用 Prometheus 中间件
	r.Use(middleware.PrometheusMiddleware())

	// 暴露指标端点
	r.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// 业务路由
	r.GET("/api/users", func(c *gin.Context) {
		c.JSON(200, gin.H{"users": []})
	})

	r.Run(":8080")
}
```

## 自定义指标

### 业务指标

```go
package metrics

import "github.com/prometheus/client_golang/prometheus"

// BusinessMetrics 业务指标
type BusinessMetrics struct {
	OrdersCreated   prometheus.Counter
	OrdersCompleted prometheus.Counter
	OrderAmount     prometheus.Histogram
	ActiveSessions  prometheus.Gauge
}

// NewBusinessMetrics 创建业务指标
func NewBusinessMetrics() *BusinessMetrics {
	m := &BusinessMetrics{
		OrdersCreated: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "orders_created_total",
			Help: "Total number of orders created",
		}),
		OrdersCompleted: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "orders_completed_total",
			Help: "Total number of orders completed",
		}),
		OrderAmount: prometheus.NewHistogram(prometheus.HistogramOpts{
			Name:    "order_amount_dollars",
			Help:    "Order amount distribution",
			Buckets: []float64{10, 50, 100, 500, 1000, 5000},
		}),
		ActiveSessions: prometheus.NewGauge(prometheus.GaugeOpts{
			Name: "active_sessions",
			Help: "Number of active user sessions",
		}),
	}

	prometheus.MustRegister(
		m.OrdersCreated,
		m.OrdersCompleted,
		m.OrderAmount,
		m.ActiveSessions,
	)

	return m
}

// RecordOrderCreated 记录订单创建
func (m *BusinessMetrics) RecordOrderCreated() {
	m.OrdersCreated.Inc()
}

// RecordOrderCompleted 记录订单完成
func (m *BusinessMetrics) RecordOrderCompleted(amount float64) {
	m.OrdersCompleted.Inc()
	m.OrderAmount.Observe(amount)
}

// SetActiveSessions 设置活跃会话数
func (m *BusinessMetrics) SetActiveSessions(count float64) {
	m.ActiveSessions.Set(count)
}
```

### 数据库指标

```go
package metrics

import (
	"context"
	"database/sql"
	"time"

	"github.com/prometheus/client_golang/prometheus"
)

// DBMetrics 数据库指标
type DBMetrics struct {
	QueryDuration *prometheus.HistogramVec
	QueryErrors   *prometheus.CounterVec
	OpenConns     prometheus.Gauge
	InUseConns    prometheus.Gauge
}

// NewDBMetrics 创建数据库指标
func NewDBMetrics() *DBMetrics {
	return &DBMetrics{
		QueryDuration: prometheus.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "db_query_duration_seconds",
				Help:    "Database query duration",
				Buckets: prometheus.DefBuckets,
			},
			[]string{"operation", "table"},
		),
		QueryErrors: prometheus.NewCounterVec(
			prometheus.CounterOpts{
				Name: "db_query_errors_total",
				Help: "Database query errors",
			},
			[]string{"operation", "table"},
		),
		OpenConns: prometheus.NewGauge(
			prometheus.GaugeOpts{
				Name: "db_connections_open",
				Help: "Number of open database connections",
			},
		),
		InUseConns: prometheus.NewGauge(
			prometheus.GaugeOpts{
				Name: "db_connections_in_use",
				Help: "Number of in-use database connections",
			},
		),
	}
}

// InstrumentDB 包装数据库连接
func InstrumentDB(db *sql.DB, metrics *DBMetrics) *sql.DB {
	// 定期更新连接数
	go func() {
		for {
			stats := db.Stats()
			metrics.OpenConns.Set(float64(stats.OpenConnections))
			metrics.InUseConns.Set(float64(stats.InUse))
			time.Sleep(10 * time.Second)
		}
	}()

	return db
}

// TimedQuery 带计时的查询
func TimedQuery(ctx context.Context, metrics *DBMetrics, operation, table string, fn func() error) error {
	start := time.Now()
	err := fn()
	duration := time.Since(start).Seconds()

	metrics.QueryDuration.WithLabelValues(operation, table).Observe(duration)
	if err != nil {
		metrics.QueryErrors.WithLabelValues(operation, table).Inc()
	}

	return err
}
```

## 告警配置

### Prometheus 告警规则

```yaml
# alert-rules.yml
groups:
  - name: application_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 5% for {{ $labels.service }}"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "95th percentile latency is above 1s"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"
```

### Alertmanager 配置

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alert@example.com'

route:
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
    - match:
        severity: warning
      receiver: 'slack'

receivers:
  - name: 'default'
    email_configs:
      - to: 'ops@example.com'

  - name: 'slack'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'
```

## 部署配置

### Docker Compose

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alert-rules.yml:/etc/prometheus/alert-rules.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana

  app:
    build: .
    ports:
      - "8080:8080"

volumes:
  prometheus-data:
  grafana-data:
```

### Prometheus 配置

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - "alert-rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'go-app'
    static_configs:
      - targets: ['app:8080']
    metrics_path: '/metrics'
```

## 总结

Prometheus 是云原生应用监控的标准选择，通过合理设计和使用指标，可以全面了解应用的运行状态。

---

**参考资源：**
- [Prometheus 官方文档](https://prometheus.io/docs/)
- [client_golang 文档](https://pkg.go.dev/github.com/prometheus/client_golang)
