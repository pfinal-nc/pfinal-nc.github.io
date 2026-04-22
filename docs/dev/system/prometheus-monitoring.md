---
title: "Prometheus 监控实战：构建现代化的监控体系"
date: 2026-04-22
author: PFinal南丞
description: "深入讲解 Prometheus 监控系统的核心概念、架构设计、指标类型以及实战配置，帮助构建完整的应用监控解决方案。"
keywords:
  - Prometheus
  - 监控
  - Metrics
  - 可观测性
  - DevOps
  - Grafana
tags:
  - Prometheus
  - Monitoring
  - Observability
  - DevOps
---

# Prometheus 监控实战：构建现代化的监控体系

## Prometheus 简介

Prometheus 是由 SoundCloud 开源的监控告警系统，2016 年加入 CNCF，是云原生监控的事实标准。

### 核心特性

- **多维数据模型**：指标名称 + 标签（key/value）
- **灵活的查询语言**：PromQL
- **不依赖分布式存储**：单节点自治
- **HTTP 拉取模型**：主动抓取指标
- **支持推送网关**：用于短生命周期任务
- **多种可视化方案**：Grafana、内置表达式浏览器
- **高效存储**：自定义的时序数据库

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      Prometheus Server                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Retrieval  │  │    TSDB     │  │     HTTP Server     │ │
│  │   (抓取)     │  │  (时序数据库) │  │    (API/UI)        │ │
│  └──────┬──────┘  └─────────────┘  └─────────────────────┘ │
│         │                                                    │
│  ┌──────┴──────────────────────────────────────────────┐  │
│  │                    PromQL Engine                     │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Exporters    │   │  Pushgateway  │   │  Service      │
│  (Node/Blackbox│   │  (短任务推送)  │   │  Discovery    │
│   /MySQL等)   │   │               │   │  (服务发现)    │
└───────────────┘   └───────────────┘   └───────────────┘
        │
        ↓
┌─────────────────────────────────────────────────────────────┐
│                      AlertManager                            │
│              (告警分组、抑制、静默、路由)                      │
└─────────────────────────────────────────────────────────────┘
        │
        ↓
┌─────────────────────────────────────────────────────────────┐
│                      Grafana / UI                            │
│                   (可视化展示)                                │
└─────────────────────────────────────────────────────────────┘
```

## 核心概念

### 数据模型

```
指标名称{标签1="值1", 标签2="值2"} 样本值 时间戳

示例：
http_requests_total{method="GET", endpoint="/api/users", status="200"} 1027 1640000000000
```

### 指标类型

#### 1. Counter（计数器）

单调递增的累积值，适合记录请求数、错误数等。

```go
package main

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "net/http"
)

// 定义 Counter
var httpRequestsTotal = prometheus.NewCounterVec(
    prometheus.CounterOpts{
        Name: "http_requests_total",
        Help: "Total number of HTTP requests",
    },
    []string{"method", "endpoint", "status"},
)

func init() {
    prometheus.MustRegister(httpRequestsTotal)
}

func handler(w http.ResponseWriter, r *http.Request) {
    // 增加计数
    httpRequestsTotal.WithLabelValues(
        r.Method,
        r.URL.Path,
        "200",
    ).Inc()
    
    w.Write([]byte("Hello"))
}

func main() {
    http.HandleFunc("/", handler)
    http.Handle("/metrics", promhttp.Handler())
    http.ListenAndServe(":8080", nil)
}
```

#### 2. Gauge（仪表盘）

可增可减的瞬时值，适合记录温度、内存使用量、并发连接数等。

```go
// 定义 Gauge
var activeConnections = prometheus.NewGauge(
    prometheus.GaugeOpts{
        Name: "active_connections",
        Help: "Number of active connections",
    },
)

func handleConnection() {
    activeConnections.Inc()  // 连接建立
    defer activeConnections.Dec()  // 连接关闭
    // 处理连接...
}

// 设置特定值
var temperature = prometheus.NewGauge(
    prometheus.GaugeOpts{
        Name: "cpu_temperature_celsius",
        Help: "Current CPU temperature",
    },
)

temperature.Set(45.2)
```

#### 3. Histogram（直方图）

采样观测值并分桶计数，适合记录请求延迟、响应大小等。

```go
// 定义 Histogram
var requestDuration = prometheus.NewHistogramVec(
    prometheus.HistogramOpts{
        Name:    "http_request_duration_seconds",
        Help:    "HTTP request duration",
        Buckets: prometheus.DefBuckets, // 默认桶: .005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10
    },
    []string{"method", "endpoint"},
)

func handler(w http.ResponseWriter, r *http.Request) {
    start := time.Now()
    defer func() {
        requestDuration.WithLabelValues(
            r.Method,
            r.URL.Path,
        ).Observe(time.Since(start).Seconds())
    }()
    
    // 处理请求...
}
```

#### 4. Summary（摘要）

类似 Histogram，但计算滑动时间窗口内的分位数。

```go
// 定义 Summary
var requestLatency = prometheus.NewSummaryVec(
    prometheus.SummaryOpts{
        Name:       "http_request_latency_seconds",
        Help:       "HTTP request latency",
        Objectives: map[float64]float64{
            0.5:  0.05,  // 中位数，误差 5%
            0.9:  0.01,  // P90，误差 1%
            0.99: 0.001, // P99，误差 0.1%
        },
    },
    []string{"method", "endpoint"},
)
```

## 部署配置

### Docker 部署

```yaml
# docker-compose.yml
version: '3'
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
      - '--web.enable-lifecycle'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
```

### 配置文件

```yaml
# prometheus.yml
global:
  scrape_interval: 15s      # 默认抓取间隔
  evaluation_interval: 15s  # 规则评估间隔
  external_labels:
    cluster: 'production'
    replica: '{{.ExternalURL}}'

# 告警规则文件
rule_files:
  - /etc/prometheus/rules/*.yml

# 抓取配置
scrape_configs:
  # Prometheus 自身监控
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Node Exporter - 主机监控
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance

  # 应用监控
  - job_name: 'my-app'
    static_configs:
      - targets: ['app:8080']
    metrics_path: '/metrics'
    scrape_interval: 5s

  # Blackbox Exporter - 黑盒监控
  - job_name: 'blackbox-http'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
        - https://example.com
        - https://api.example.com
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115

# 远程存储（可选）
remote_write:
  - url: "http://cortex:9009/api/prom/push"
    queue_config:
      max_samples_per_send: 1000
      max_shards: 200

remote_read:
  - url: "http://cortex:9009/api/prom/api/v1/read"
```

## PromQL 查询语言

### 基础查询

```promql
# 查询指标
http_requests_total

# 带标签过滤
http_requests_total{method="GET", status="200"}

# 正则匹配
http_requests_total{status=~"2.."}

# 范围查询
http_requests_total[5m]  # 最近 5 分钟的数据

# 偏移查询
http_requests_total offset 1h  # 1 小时前的数据
```

### 聚合操作

```promql
# 求和
sum(http_requests_total)

# 按标签分组求和
sum by (method) (http_requests_total)

# 计算平均值
avg(http_request_duration_seconds)

# 计算分位数
histogram_quantile(0.95, 
  sum by (le) (
    rate(http_request_duration_seconds_bucket[5m])
  )
)

# 计数
count(up)

# 去重计数
count by (job) (up)
```

### 速率计算

```promql
# 每秒增长率（Counter 专用）
rate(http_requests_total[5m])

# 每秒增长率（处理计数器重置）
increase(http_requests_total[1h])

# 平滑速率
irate(http_requests_total[5m])  # 瞬时速率
```

### 数学运算

```promql
# 计算错误率
sum(rate(http_requests_total{status=~"5.."}[5m])) 
/ 
sum(rate(http_requests_total[5m]))

# 计算内存使用率
100 - (
  node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100
)

# 预测磁盘将在 4 小时后满
predict_linear(
  node_filesystem_avail_bytes{mountpoint="/"}[1h], 
  4 * 3600
) < 0
```

## 告警配置

### 告警规则

```yaml
# rules/alerts.yml
groups:
  - name: node_alerts
    rules:
      # 实例宕机
      - alert: InstanceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Instance {{ $labels.instance }} down"
          description: "{{ $labels.instance }} has been down for more than 1 minute."

      # 高 CPU 使用率
      - alert: HighCPUUsage
        expr: 100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is above 80% for more than 5 minutes."

      # 高内存使用率
      - alert: HighMemoryUsage
        expr: |
          (
            node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes
          ) / node_memory_MemTotal_bytes * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is above 85% for more than 5 minutes."

      # 磁盘即将满
      - alert: DiskWillFillIn4Hours
        expr: predict_linear(node_filesystem_avail_bytes[1h], 4 * 3600) < 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Disk on {{ $labels.instance }} will fill soon"
          description: "Disk is predicted to fill within 4 hours."

      # 应用错误率高
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) 
          / 
          sum(rate(http_requests_total[5m])) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate"
          description: "Error rate is above 5% for more than 2 minutes."

      # P99 延迟高
      - alert: HighLatency
        expr: |
          histogram_quantile(0.99, 
            sum by (le) (rate(http_request_duration_seconds_bucket[5m]))
          ) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High P99 latency"
          description: "P99 latency is above 1 second."
```

### AlertManager 配置

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alert@example.com'

templates:
- '/etc/alertmanager/templates/*.tmpl'

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 12h
  receiver: 'default'
  routes:
    # 严重告警立即通知
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true
    
    # 警告级别发送邮件
    - match:
        severity: warning
      receiver: 'email'

inhibit_rules:
  # 抑制规则：如果实例宕机，抑制该实例的其他告警
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['instance', 'cluster']

receivers:
  - name: 'default'
    slack_configs:
      - api_url: '{{ .SlackURL }}'
        channel: '#alerts'
        title: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'email'
    email_configs:
      - to: 'team@example.com'
        subject: 'Prometheus Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: '{{ .PagerDutyKey }}'
        description: '{{ .GroupLabels.alertname }}'
```

## 服务发现

### Kubernetes 服务发现

```yaml
scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - default
            - production
    relabel_configs:
      # 只抓取带注解的 Pod
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      
      # 获取端口
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
      
      # 设置指标路径
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)

  - job_name: 'kubernetes-services'
    kubernetes_sd_configs:
      - role: service
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

## 最佳实践

### 指标命名规范

```
# 格式：<namespace>_<subsystem>_<metric_name>_<unit>_<suffix>

# 好的命名
http_requests_total                    # 计数器
http_request_duration_seconds          # 直方图
http_request_duration_seconds_bucket   # 桶
http_request_duration_seconds_sum      # 总和
http_request_duration_seconds_count    # 计数

# 避免
num_requests                           # 缺少命名空间
request_time                           # 缺少单位
```

### 标签设计

```go
// 高基数标签（避免）
http_requests_total{user_id="12345"}  // 用户 ID 会导致标签爆炸

// 低基数标签（推荐）
http_requests_total{method="GET", status="200", endpoint="/api/users"}
```

### 性能优化

```yaml
# 抓取配置优化
scrape_configs:
  - job_name: 'my-app'
    scrape_interval: 15s      # 根据需求调整
    scrape_timeout: 10s       # 小于 scrape_interval
    sample_limit: 10000       # 限制样本数
    
    # 使用缓存
    metric_relabel_configs:
      - source_labels: [__name__]
        regex: 'go_memstats.*'
        action: drop           # 丢弃不需要的指标
```

## 总结

Prometheus 是构建现代化监控体系的强大工具：

| 组件 | 用途 |
|------|------|
| Prometheus Server | 指标抓取、存储、查询 |
| Exporters | 暴露系统/应用指标 |
| AlertManager | 告警管理 |
| Grafana | 可视化展示 |
| Pushgateway | 短任务指标推送 |

**关键要点：**
1. 合理设计指标和标签，避免高基数
2. 选择合适的指标类型（Counter/Gauge/Histogram/Summary）
3. 配置合理的抓取间隔和保留策略
4. 设置有效的告警规则，避免告警疲劳
5. 使用 Grafana 创建直观的监控大盘

---

**相关文章推荐：**
- [Grafana 可视化实战](/dev/system/grafana-visualization) - 监控可视化
- [CI/CD 最佳实践](/dev/system/cicd-best-practices) - 持续集成与交付
- [Go 集成 Prometheus 监控](/dev/backend/golang/go-prometheus-monitoring) - 应用监控接入
