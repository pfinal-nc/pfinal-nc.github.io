---
title: "Lesson 5.6: 告警与值班"
description: "告警分级、降噪、On-call 流程"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, alerting, oncall, monitoring, lesson]
---

# Lesson 5.6: 告警与值班

## 学习目标

- 设计合理的告警体系

---

## 1. 告警分级

| 级别 | 响应时间 | 示例 |
|------|----------|------|
| P0 (Critical) | 立即 | 服务宕机、数据丢失 |
| P1 (High) | 15 min | P99 延迟 > 5s |
| P2 (Medium) | 1 hr | 错误率 > 1% |
| P3 (Low) | 1 day | 磁盘使用 > 80% |

## 2. 告警降噪原则

- 告警必须有行动项（否则是噪音）
- 用聚合代替逐条告警
- 设置告警静默期
- 告警要求确认（Acknowledge）

### Prometheus AlertManager 示例

```yaml
groups:
- name: go-services
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Error rate {{ $value | humanizePercentage }}"
```
