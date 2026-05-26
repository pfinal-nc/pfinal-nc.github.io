---
title: "Lesson 4.4: 负载均衡"
description: "客户端负载均衡 vs 服务端负载均衡"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, microservices, load-balancing, lesson]
---

# Lesson 4.4: 负载均衡

## 学习目标

- 理解不同层次的负载均衡策略

---

## 1. 负载均衡层次

| 层次 | 实现 | 算法 |
|------|------|------|
| DNS 层 | DNS 轮询 | 简单轮询 |
| 网络层 4 | Nginx (stream) | least_conn, hash |
| 应用层 7 | Nginx (http) | 加权轮询, IP hash |
| 客户端 | gRPC pick_first | 轮询, 权重 |

### Go gRPC 客户端负载均衡

```go
// gRPC 客户端负载均衡
conn, _ := grpc.Dial(
    "dns:///user-service:8080",
    grpc.WithDefaultServiceConfig(`{
        "loadBalancingConfig": [{"round_robin": {}}]
    }`),
)
```

### Nginx 配置

```nginx
upstream user_service {
    least_conn;
    server 10.0.0.1:8080 weight=3;
    server 10.0.0.2:8080 weight=2;
    server 10.0.0.3:8080 backup;
}
```
