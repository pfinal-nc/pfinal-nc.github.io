---
title: "Lesson 4.7: API 网关"
description: "Kong、Traefik、自研网关的设计与实践"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, microservices, api-gateway, kong, traefik, lesson]
---

# Lesson 4.7: API 网关

## 学习目标

- 理解 API 网关的核心功能

---

## 1. 网关职责

| 功能 | 说明 |
|------|------|
| 路由转发 | 按路径分发到后端服务 |
| 认证鉴权 | 统一处理 Token 验证 |
| 限流熔断 | 全局流量控制 |
| 协议转换 | REST ↔ gRPC |
| 日志监控 | 全链路请求记录 |

## 2. 方案对比

| 方案 | 性能 | 配置复杂度 | 适用场景 |
|------|------|-----------|----------|
| Kong | 中 | 中 | 企业级 |
| Traefik | 高 | 低 | K8s 原生 |
| 自研 (Go) | 最高 | 高 | 定制化需求 |

### 简易 Go 网关

```go
// 反向代理
func reverseProxy(target string) http.Handler {
    return httputil.NewSingleHostReverseProxy(&url.URL{
        Scheme: "http",
        Host:   target,
    })
}

http.HandleFunc("/api/users/", func(w http.ResponseWriter, r *http.Request) {
    reverseProxy("user-service:8080").ServeHTTP(w, r)
})
```
