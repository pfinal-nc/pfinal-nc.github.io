---
title: "Lesson 4.3: 服务发现与注册"
description: "Consul、etcd、Kubernetes Service"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, microservices, service-discovery, consul, kubernetes, lesson]
---

# Lesson 4.3: 服务发现与注册

## 学习目标

- 理解服务发现的核心机制

---

## 1. 服务发现模式

| 模式 | 代表 | 说明 |
|------|------|------|
| 客户端发现 | Consul | 客户端从注册中心获取地址 |
| 服务端发现 | K8s Service | 通过负载均衡器访问 |
| DNS 发现 | CoreDNS | DNS SRV 记录 |

### Consul 示例

```go
// 服务注册
import "github.com/hashicorp/consul/api"

client, _ := api.NewClient(api.DefaultConfig())
client.Agent().ServiceRegister(&api.AgentServiceRegistration{
    ID:   "user-service-1",
    Name: "user-service",
    Port: 8080,
    Check: &api.AgentServiceCheck{
        HTTP:     "http://localhost:8080/health",
        Interval: "10s",
    },
})

// 服务发现
services, _ := client.Agent().Services()
for _, svc := range services {
    fmt.Printf("Found: %s at %s:%d\n", svc.Service, svc.Address, svc.Port)
}
```
