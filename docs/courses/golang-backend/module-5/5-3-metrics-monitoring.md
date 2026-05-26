---
title: "Lesson 5.3: 指标监控"
description: "Prometheus、Grafana、告警规则"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, prometheus, grafana, monitoring, lesson]
---

# Lesson 5.3: 指标监控

## 学习目标

- 集成 Prometheus 指标到 Go 应用
- 掌握常见的 RED 指标

---

## 1. 四种核心指标类型

| 类型 | 说明 | 示例 |
|------|------|------|
| Counter | 只增不减 | 请求总数、错误总数 |
| Gauge | 可增可减 | 内存使用、在线用户数 |
| Histogram | 分布统计 | 请求延迟分布 |
| Summary | 分位数 | P99 延迟 |

## 2. Go 中集成 Prometheus

```go
import "github.com/prometheus/client_golang/prometheus"

var (
    httpRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total HTTP requests",
        },
        []string{"method", "path", "status"},
    )

    httpRequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request latency",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "path"},
    )
)

func init() {
    prometheus.MustRegister(httpRequestsTotal, httpRequestDuration)
}
```

### RED 指标（推荐监控方法）

| 指标 | 含义 | PromQL 查询 |
|------|------|-------------|
| Rate | 请求速率 | `rate(http_requests_total[5m])` |
| Errors | 错误率 | `rate(http_requests_total{status=~"5.."}[5m])` |
| Duration | 延迟分布 | `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))` |

## 推荐阅读

- [go-prometheus-monitoring](/dev/backend/golang/go-prometheus-monitoring)
- [prometheus-monitoring](/dev/system/prometheus-monitoring)
- [grafana-visualization](/dev/system/grafana-visualization)
