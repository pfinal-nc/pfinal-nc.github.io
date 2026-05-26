---
title: "Lesson 4.2: 服务通信"
description: "gRPC、REST、消息队列的选择与实践"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, microservices, grpc, message-queue, lesson]
---

# Lesson 4.2: 服务通信

## 学习目标

- 理解同步通信 vs 异步通信的取舍

---

## 1. 通信方式对比

| 方式 | 延迟 | 耦合度 | 适用场景 |
|------|------|--------|----------|
| REST | 中 | 中 | 对外 API |
| gRPC | 低 | 高 | 内部服务间 |
| Kafka | 中 | 低 | 事件驱动、解耦 |
| RabbitMQ | 低 | 低 | 任务队列 |

## 2. 选择建议

- **请求-响应**：gRPC（高性能）或 REST（兼容性）
- **事件通知**：Kafka（高吞吐）或 RabbitMQ（低延迟）
- **流式处理**：gRPC streaming

```go
// Go 中 Kafka 生产者
import "github.com/segmentio/kafka-go"

writer := &kafka.Writer{
    Addr:     kafka.TCP("localhost:9092"),
    Topic:    "user-events",
    Balancer: &kafka.LeastBytes{},
}
writer.WriteMessages(ctx, kafka.Message{
    Key:   []byte(user.ID),
    Value: []byte(eventJSON),
})
```
