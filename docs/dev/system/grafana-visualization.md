---
title: "Grafana 可视化实战指南"
date: 2026-04-22 00:00:00
author: PFinal南丞
description: "深入学习 Grafana 可视化平台，掌握数据源配置、Dashboard 设计、告警规则设置、变量模板等核心功能，打造专业的监控可视化系统。"
keywords:
  - Grafana
  - 可视化
  - 监控
  - Dashboard
  - Prometheus
  - 告警
tags:
  - grafana
  - visualization
  - monitoring
  - devops
---

# Grafana 可视化实战指南

Grafana 是一个开源的数据可视化和监控平台，支持多种数据源，提供丰富的可视化选项。本文将带你深入了解 Grafana 的核心功能和实战技巧。

## 什么是 Grafana

Grafana 允许你：

- 查询、可视化、告警和探索指标
- 支持 100+ 数据源（Prometheus、InfluxDB、Elasticsearch、MySQL 等）
- 创建动态可重用的 Dashboard
- 设置告警规则并发送通知

## 安装与配置

### Docker 安装

```bash
# 快速启动
docker run -d -p 3000:3000 --name=grafana grafana/grafana:latest

# 带持久化存储
docker run -d \
  -p 3000:3000 \
  --name=grafana \
  -v grafana-storage:/var/lib/grafana \
  grafana/grafana:latest
```

### Docker Compose 配置

```yaml
version: '3.8'

services:
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-storage:/var/lib/grafana
      - ./provisioning:/etc/grafana/provisioning
    networks:
      - monitoring
    
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    networks:
      - monitoring

volumes:
  grafana-storage:
  prometheus-data:

networks:
  monitoring:
    driver: bridge
```

## 数据源配置

### Prometheus 数据源

1. 登录 Grafana（默认 admin/admin）
2. 进入 Configuration → Data Sources
3. 点击 "Add data source"
4. 选择 Prometheus
5. 配置 URL：`http://prometheus:9090`
6. 点击 "Save & Test"

### 配置文件方式

```yaml
# provisioning/datasources/prometheus.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

## Dashboard 设计

### 基础面板

```json
{
  "dashboard": {
    "title": "System Metrics",
    "panels": [
      {
        "title": "CPU Usage",
        "type": "stat",
        "targets": [
          {
            "expr": "100 - (avg(irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "CPU %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 70},
                {"color": "red", "value": 85}
              ]
            }
          }
        }
      }
    ]
  }
}
```

### 常用面板类型

| 类型 | 用途 | 适用场景 |
|------|------|----------|
| Time series | 时序图 | 指标趋势展示 |
| Stat | 统计值 | 当前值展示 |
| Gauge | 仪表盘 | 百分比/阈值 |
| Bar gauge | 条形图 | 多值比较 |
| Table | 表格 | 详细数据 |
| Pie chart | 饼图 | 占比分析 |
| Heatmap | 热力图 | 分布密度 |
| Logs | 日志 | 日志查看 |

### 变量模板

```json
{
  "templating": {
    "list": [
      {
        "name": "node",
        "type": "query",
        "query": "label_values(node_uname_info, nodename)",
        "refresh": 1,
        "includeAll": true,
        "multi": true
      },
      {
        "name": "interval",
        "type": "interval",
        "query": "1m,5m,10m,30m,1h,6h,12h,1d",
        "current": {"text": "5m", "value": "5m"}
      }
    ]
  }
}
```

## PromQL 查询示例

### 基础查询

```promql
# CPU 使用率
100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# 内存使用率
100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)

# 磁盘使用率
100 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} * 100)

# 网络流量
irate(node_network_receive_bytes_total[5m])
irate(node_network_transmit_bytes_total[5m])
```

### 高级查询

```promql
# Top 10 CPU 消耗进程
topk(10, sum by (process) (process_cpu_seconds_total))

# 请求速率
sum(rate(http_requests_total[5m])) by (status)

# 错误率
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# 95 分位延迟
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

## 告警配置

### 告警规则

```yaml
# provisioning/alerting/alert-rules.yml
groups:
  - name: system_alerts
    interval: 30s
    rules:
      - alert: HighCPUUsage
        expr: 100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is above 80% (current value: {{ $value }}%)"
      
      - alert: HighMemoryUsage
        expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 85
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is above 85% (current value: {{ $value }}%)"
      
      - alert: DiskSpaceLow
        expr: (1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space on {{ $labels.instance }}"
          description: "Disk usage is above 90% (current value: {{ $value }}%)"
```

### 通知渠道

```yaml
# provisioning/notifiers/notifiers.yml
notifiers:
  - name: email-notifier
    type: email
    settings:
      addresses: admin@example.com;ops@example.com
    
  - name: slack-notifier
    type: slack
    settings:
      url: $SLACK_WEBHOOK_URL
      title: '{{ template "default.title" . }}'
      text: '{{ template "default.message" . }}'
    
  - name: webhook-notifier
    type: webhook
    settings:
      url: https://api.example.com/alerts
      httpMethod: POST
```

## Dashboard 导入导出

### 导入官方 Dashboard

1. 访问 [Grafana Dashboards](https://grafana.com/grafana/dashboards/)
2. 搜索需要的 Dashboard（如 Node Exporter）
3. 复制 Dashboard ID
4. 在 Grafana 中点击 Import
5. 粘贴 ID 并导入

### 推荐 Dashboard

| Dashboard ID | 名称 | 用途 |
|-------------|------|------|
| 1860 | Node Exporter Full | 主机监控 |
| 6417 | Kubernetes Cluster | K8s 集群监控 |
| 315 | MySQL Overview | MySQL 监控 |
| 9628 | PostgreSQL Database | PostgreSQL 监控 |
| 10991 | Redis | Redis 监控 |

## 最佳实践

### 1. 命名规范

```
Dashboard: [Team] - [Service] - [Purpose]
Panel: [Metric] - [Aggregation]
Variable: [resource]_[attribute]
```

### 2. 颜色规范

| 颜色 | 含义 |
|------|------|
| Green | 正常/健康 |
| Yellow | 警告 |
| Red | 严重/错误 |
| Blue | 信息/中性 |

### 3. 刷新频率

- 实时监控：5s-10s
- 常规监控：30s-1m
- 历史趋势：5m-1h

### 4. 组织管理

```
Folders:
├── Infrastructure
│   ├── Nodes
│   ├── Containers
│   └── Network
├── Applications
│   ├── API Services
│   ├── Databases
│   └── Cache
└── Business
    ├── User Metrics
    └── Revenue
```

## 总结

Grafana 是构建监控可视化系统的强大工具。通过合理配置数据源、设计 Dashboard 和设置告警，可以构建完整的可观测性平台。

---

**参考资源：**
- [Grafana 官方文档](https://grafana.com/docs/)
- [Grafana Dashboards 市场](https://grafana.com/grafana/dashboards/)
- [PromQL 查询指南](https://prometheus.io/docs/prometheus/latest/querying/basics/)
