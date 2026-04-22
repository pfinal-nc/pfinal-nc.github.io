---
title: "Loki 日志系统实战指南"
date: 2026-04-22 00:00:00
author: PFinal南丞
description: "深入学习 Grafana Loki 日志聚合系统，掌握与 Prometheus 类似的标签索引机制，实现轻量级、低成本的日志收集和查询。"
keywords:
  - Loki
  - Grafana
  - 日志聚合
  - LogQL
  - Promtail
  - 轻量级日志
tags:
  - loki
  - logging
  - grafana
  - devops
---

# Loki 日志系统实战指南

Loki 是 Grafana Labs 开发的一款水平可扩展、高可用性的日志聚合系统，专为与 Grafana 配合使用而设计。与 ELK 相比，Loki 更加轻量，成本更低。

## Loki vs ELK

### 对比

| 特性 | Loki | ELK |
|------|------|-----|
| 索引方式 | 仅索引标签 | 全文索引 |
| 存储成本 | 低（约为 ELK 的 1/10） | 高 |
| 查询语言 | LogQL | Lucene |
| 资源占用 | 低 | 高 |
| 与 Grafana 集成 | 原生支持 | 需配置 |
| 全文搜索 | 支持（较慢） | 支持（快速） |

### 架构

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ App Logs │───▶│ Promtail │───▶│   Loki   │───▶│ Grafana  │
│  Docker  │    │  (Agent) │    │ (Server) │    │   (UI)   │
│  Syslog  │    └──────────┘    └────┬─────┘    └──────────┘
└──────────┘                         │
                                     ▼
                              ┌──────────────┐
                              │ Object Store │
                              │(S3/GCS/MinIO)│
                              └──────────────┘
```

## 快速部署

### Docker Compose

```yaml
version: '3.8'

services:
  loki:
    image: grafana/loki:latest
    container_name: loki
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yml:/etc/loki/local-config.yaml
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - loki

  promtail:
    image: grafana/promtail:latest
    container_name: promtail
    volumes:
      - ./promtail-config.yml:/etc/promtail/config.yml
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    command: -config.file=/etc/promtail/config.yml
    networks:
      - loki
    depends_on:
      - loki

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - loki
    depends_on:
      - loki

volumes:
  loki-data:
  grafana-data:

networks:
  loki:
    driver: bridge
```

### Loki 配置

```yaml
# loki-config.yml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

query_range:
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 100

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

ruler:
  alertmanager_url: http://localhost:9093

# 限流配置
limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  ingestion_rate_mb: 10
  ingestion_burst_size_mb: 20
```

### Promtail 配置

```yaml
# promtail-config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # 系统日志
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: system
          __path__: /var/log/*.log

  # Nginx 日志
  - job_name: nginx
    static_configs:
      - targets:
          - localhost
        labels:
          job: nginx
          __path__: /var/log/nginx/*.log
    pipeline_stages:
      - json:
          expressions:
            timestamp: time_local
            remote_addr: remote_addr
            request: request
            status: status
      - timestamp:
          source: timestamp
          format: "02/Jan/2006:15:04:05 -0700"
      - labels:
          status:
          remote_addr:

  # Docker 容器日志
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
      - source_labels: ['__meta_docker_container_log_stream']
        target_label: 'logstream'
      - source_labels: ['__meta_docker_container_label_service']
        target_label: 'service'

  # Kubernetes Pod 日志
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    pipeline_stages:
      - docker: {}
    relabel_configs:
      - source_labels:
          - __meta_kubernetes_pod_node_name
        target_label: __host__
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)
      - source_labels:
          - __meta_kubernetes_namespace
        target_label: namespace
      - source_labels:
          - __meta_kubernetes_pod_name
        target_label: pod
      - source_labels:
          - __meta_kubernetes_pod_container_name
        target_label: container
```

## LogQL 查询语言

### 基础查询

```logql
# 选择器
{job="nginx"}
{job="app", env="production"}
{container="api", namespace="default"}

# 行过滤
{job="nginx"} |= "error"
{job="nginx"} != "debug"
{job="nginx"} |~ "err.*"
{job="nginx"} !~ "info.*"

# 解析 JSON
{job="app"} 
  | json 
  | level="error"
  | line_format "{{.msg}}"

# 解析日志
{job="nginx"} 
  | regexp "^(?P<ip>\\S+) (?P<id>\\S+) (?P<user>\\S+) \\[(?P<ts>[^\\]]+)\\] \"(?P<method>\\S+) (?P<path>\\S+) (?P<proto>\\S+)\" (?P<status>\\d+) (?P<size>\\d+)"
  | status = "500"
```

### 聚合查询

```logql
# 计数
sum(rate({job="nginx"}[1m]))

# 按标签分组
sum by (status) (rate({job="nginx"}[1m]))

# 错误率
sum(rate({job="nginx"} |= "error" [5m])) 
  / sum(rate({job="nginx"}[5m]))

# Top 10 错误
 topk(10, sum by (path) (rate({job="nginx"} |= "error" [5m])))

# 直方图
sum by (le) (
  histogram_quantile(0.95,
    sum by (le) (
      rate({job="nginx"} 
        | regexp "response_time=(?P<rt>\\d+)"
        | unwrap rt [5m]
      )
    )
  )
)
```

## Grafana 集成

### 数据源配置

1. 进入 Grafana → Configuration → Data Sources
2. 点击 "Add data source"
3. 选择 "Loki"
4. 配置 URL：`http://loki:3100`
5. 点击 "Save & Test"

### Dashboard 示例

```json
{
  "dashboard": {
    "title": "Loki Logs Dashboard",
    "panels": [
      {
        "title": "Log Volume",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum(rate({job=~\"$job\"}[5m])) by (job)",
            "legendFormat": "{{job}}"
          }
        ]
      },
      {
        "title": "Error Logs",
        "type": "logs",
        "targets": [
          {
            "expr": "{job=~\"$job\"} |= \"error\"",
            "refId": "A"
          }
        ]
      },
      {
        "title": "Top 10 Paths",
        "type": "bargauge",
        "targets": [
          {
            "expr": "topk(10, sum by (path) (rate({job=\"nginx\"}[5m])))",
            "legendFormat": "{{path}}"
          }
        ]
      }
    ]
  }
}
```

## 告警配置

### Ruler 配置

```yaml
# rules.yml
groups:
  - name: application_alerts
    interval: 1m
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate({job="app"} |= "error" [5m])) 
            / sum(rate({job="app"}[5m])) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 5%"
      
      - alert: NoLogs
        expr: |
          sum(rate({job="app"}[5m])) == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "No logs received"
          description: "No logs from {{ $labels.job }} in the last 5 minutes"
```

### 录制规则

```yaml
groups:
  - name: log_aggregations
    interval: 1m
    rules:
      - record: job:log_error_rate_5m
        expr: |
          sum(rate({job=~".+"} |= "error" [5m])) by (job)
            / sum(rate({job=~".+"}[5m])) by (job)
      
      - record: job:log_volume_5m
        expr: sum(rate({job=~".+"}[5m])) by (job)
```

## 应用集成

### Go 应用日志

```go
package main

import (
    "encoding/json"
    "net/http"
    "os"
    "time"
)

type LokiEntry struct {
    Streams []Stream `json:"streams"`
}

type Stream struct {
    Stream map[string]string `json:"stream"`
    Values [][]string        `json:"values"`
}

func pushLog(labels map[string]string, message string) error {
    entry := LokiEntry{
        Streams: []Stream{
            {
                Stream: labels,
                Values: [][]string{
                    {
                        strconv.FormatInt(time.Now().UnixNano(), 10),
                        message,
                    },
                },
            },
        },
    }
    
    data, _ := json.Marshal(entry)
    resp, err := http.Post(
        "http://localhost:3100/loki/api/v1/push",
        "application/json",
        bytes.NewBuffer(data),
    )
    if err != nil {
        return err
    }
    defer resp.Body.Close()
    
    return nil
}

func main() {
    labels := map[string]string{
        "job":       "my-app",
        "env":       "production",
        "version":   "1.0.0",
    }
    
    pushLog(labels, "Application started")
}
```

### 使用日志库

```go
package main

import (
    "github.com/sirupsen/logrus"
    "gopkg.in/gemnasium/logrus-graylog-hook.v2"
)

func init() {
    log := logrus.New()
    
    // 添加 Loki Hook
    hook := loki.NewLokiHook(
        "http://localhost:3100",
        map[string]string{
            "job": "my-app",
        },
    )
    log.AddHook(hook)
    
    log.WithFields(logrus.Fields{
        "user_id": "12345",
        "action":  "login",
    }).Info("User logged in")
}
```

## 性能优化

### 1. 标签设计

```yaml
# 好的标签设计
labels:
  job: api
  env: production
  service: user-service
  version: v1.2.3

# 避免高基数标签
# ❌ 不要这样做
labels:
  user_id: "12345"  # 高基数
  request_id: "abc" # 高基数
```

### 2. 查询优化

```logql
# ✅ 好的查询：先过滤标签
{job="nginx", status="500"} 
  |~ ".*timeout.*"

# ❌ 差的查询：先过滤内容
{job="nginx"} 
  |~ ".*500.*timeout.*"
```

### 3. 存储优化

```yaml
# 使用对象存储
storage_config:
  aws:
    s3: s3://access_key:secret_key@region/bucket_name
    s3forcepathstyle: true

# 或 MinIO
  aws:
    s3: s3://minioadmin:minioadmin@localhost:9000/loki
    s3forcepathstyle: true
```

## 总结

Loki 是一个轻量级、低成本的日志聚合方案，特别适合与 Grafana 配合使用。通过合理的标签设计和查询优化，可以实现高效的日志收集和分析。

---

**参考资源：**
- [Loki 官方文档](https://grafana.com/docs/loki/latest/)
- [LogQL 查询指南](https://grafana.com/docs/loki/latest/logql/)
- [Promtail 文档](https://grafana.com/docs/loki/latest/clients/promtail/)
