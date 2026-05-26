---
title: "Lesson 5.2: 日志系统设计"
description: "结构化日志、日志收集（Loki/ELK）"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, logging, loki, elk, lesson]
---

# Lesson 5.2: 日志系统设计

## 学习目标

- 实现结构化日志
- 了解日志收集架构

---

## 1. 结构化日志

```go
import "log/slog"

// Go 1.21+ 标准库结构化日志
logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
    Level: slog.LevelInfo,
}))

logger.Info("user login",
    "user_id", "123",
    "ip", "192.168.1.1",
    "duration_ms", 42,
)
```

## 2. 日志收集架构

```
App → stdout → Filebeat/Promtail → Loki/Elasticsearch → Grafana/Kibana
```

## 推荐阅读

- [使用 Devslog 结构化日志处理](/Tools/Devslog-Structured-Logging)
- [elk-stack-guide](/dev/system/elk-stack-guide)
- [loki-logging](/dev/system/loki-logging)
