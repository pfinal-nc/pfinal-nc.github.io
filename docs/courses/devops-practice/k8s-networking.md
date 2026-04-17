---
title: "Kubernetes 服务发现与网络：Service、Ingress、DNS 全解析"
description: "深入理解 Kubernetes 网络模型，掌握 ClusterIP/NodePort/LoadBalancer/ExternalName 四种 Service 类型，以及 Ingress 配置实战、CoreDNS 解析原理，含 Nginx Ingress 完整配置示例。"
date: 2026-04-17 11:00:00
keywords:
  - Kubernetes Service
  - Kubernetes Ingress
  - K8s 网络
  - ClusterIP
  - NodePort
  - LoadBalancer
  - CoreDNS
  - Nginx Ingress
  - 服务发现
author: PFinal 南丞
category: DevOps
tags:
  - kubernetes
  - k8s
  - devops
  - service
  - ingress
  - 网络
  - 服务发现
---

# Kubernetes 服务发现与网络：Service、Ingress、DNS 全解析

> K8s 网络是大多数初学者的噩梦，本文把 Service 的四种类型、Ingress 配置、DNS 解析原理一次说清楚，从原理到实战。

---

## K8s 网络模型基础

在深入 Service 之前，先理解 K8s 的网络设计原则：

**三个基本要求（K8s 网络规范）：**

1. **Pod 与 Pod 之间**：任意 Pod 可以直接用 IP 通信，不需要 NAT
2. **Node 与 Pod 之间**：Node 可以直接访问 Pod IP
3. **每个 Pod 有唯一 IP**：不同 Node 上的 Pod IP 不重叠

但 Pod 的 IP 是**不稳定的**——Pod 重建后 IP 会变。这就是为什么需要 Service。

```
问题：Pod IP 不稳定，服务间如何通信？
解决：Service 提供稳定的虚拟 IP（ClusterIP）和 DNS 名称
```

---

## Service：稳定的服务入口

Service 是 K8s 中为 Pod 提供**稳定网络端点**的资源，背后通过 kube-proxy 维护 iptables/IPVS 规则实现流量转发。

### ClusterIP：集群内部访问（默认）

```yaml
apiVersion: v1
kind: Service
metadata:
  name: go-api-svc
  namespace: production
spec:
  type: ClusterIP                  # 默认类型，可以省略
  selector:
    app: go-api                    # 匹配 Pod 的 Label
  ports:
    - name: http
      port: 80                     # Service 对外暴露的端口
      targetPort: 8080             # 转发到 Pod 的端口
      protocol: TCP
```

**特点：**
- 分配一个集群内部 VIP（如 `10.96.0.1`）
- 只在集群内部可访问
- 适用于微服务间通信

```bash
# 查看 Service 详情
kubectl get svc go-api-svc -n production
kubectl describe svc go-api-svc -n production

# 验证 Endpoints（检查 Selector 是否匹配到 Pod）
kubectl get endpoints go-api-svc -n production
```

**常见问题：Service 无法访问**

```bash
# 第一步：检查 Endpoints 是否为空
kubectl get endpoints <service-name>
# 若为空：说明 selector 没有匹配到任何 Pod

# 第二步：检查 Pod Label 是否与 Service selector 一致
kubectl get pods --show-labels
```

### NodePort：通过节点端口暴露

```yaml
apiVersion: v1
kind: Service
metadata:
  name: go-api-nodeport
spec:
  type: NodePort
  selector:
    app: go-api
  ports:
    - port: 80
      targetPort: 8080
      nodePort: 30080              # 节点端口，范围 30000-32767（可不指定，自动分配）
```

访问方式：`http://<任意Node的IP>:30080`

**适用场景：**
- 本地开发测试
- 裸金属（Bare Metal）集群无法用 LoadBalancer 时
- 临时暴露服务调试

**不适合生产的原因：**
- 端口范围限制（30000-32767）
- 每个服务需要一个独立节点端口
- 直接暴露节点 IP，安全性差

### LoadBalancer：云厂商负载均衡器

```yaml
apiVersion: v1
kind: Service
metadata:
  name: go-api-lb
  annotations:
    # 阿里云 ACK 配置
    service.beta.kubernetes.io/alibaba-cloud-loadbalancer-spec: "slb.s2.small"
    # AWS EKS 配置
    service.beta.kubernetes.io/aws-load-balancer-type: "external"
spec:
  type: LoadBalancer
  selector:
    app: go-api
  ports:
    - port: 80
      targetPort: 8080
```

**工作原理：**
- 云厂商控制器自动创建云负载均衡器（SLB/ELB/CLB）
- 分配公网 IP，流量：公网 → LoadBalancer → NodePort → Pod

**缺点：**
- 每个 Service 创建一个 LB，成本高
- 不适合有很多对外服务的场景（用 Ingress 代替）

### ExternalName：外部服务映射

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql-external
  namespace: production
spec:
  type: ExternalName
  externalName: mysql.prod.example.com    # 映射到外部域名
```

将外部服务（RDS、第三方 API）映射为集群内 DNS，便于迁移和配置管理。集群内访问 `mysql-external` 会 CNAME 到 `mysql.prod.example.com`。

### Headless Service

`ClusterIP: None` 创建 Headless Service，不分配 VIP：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-headless
spec:
  clusterIP: None            # Headless
  selector:
    app: redis
  ports:
    - port: 6379
```

DNS 查询直接返回所有 Pod IP（而非 VIP），StatefulSet 用它实现每个 Pod 的独立 DNS：

```
redis-0.redis-headless.production.svc.cluster.local → 10.244.1.10
redis-1.redis-headless.production.svc.cluster.local → 10.244.2.11
```

---

## CoreDNS：K8s 内置 DNS

K8s 内置 CoreDNS 提供集群内 DNS 解析，每个 Pod 的 `/etc/resolv.conf` 都指向它。

### DNS 命名规则

```
<service-name>.<namespace>.svc.cluster.local
```

示例：
```
# production 命名空间下的 go-api 服务
go-api.production.svc.cluster.local

# 同 namespace 内可以简写
go-api.production    →  go-api.production.svc.cluster.local
go-api               →  go-api.production.svc.cluster.local（同 namespace）
```

StatefulSet Pod 的 DNS：
```
<pod-name>.<service-name>.<namespace>.svc.cluster.local
redis-0.redis.production.svc.cluster.local
```

### 调试 DNS

```bash
# 在临时 Pod 中测试 DNS 解析
kubectl run dns-debug --image=busybox:1.28 --rm -it -- nslookup go-api-svc

# 更完整的 DNS 调试工具
kubectl run dnsutils --image=registry.k8s.io/e2e-test-images/jessie-dnsutils:1.3 \
  --rm -it -- /bin/bash

# 进入后运行
nslookup go-api-svc.production.svc.cluster.local
dig go-api-svc.production.svc.cluster.local
```

### 自定义 DNS 配置

```yaml
spec:
  dnsConfig:
    options:
      - name: ndots
        value: "2"           # 减少 DNS 查询次数（默认 5，查询链路很长）
  dnsPolicy: ClusterFirst    # 默认，先查 CoreDNS 再查上游 DNS
```

---

## Ingress：HTTP/HTTPS 流量统一入口

**为什么需要 Ingress？**

每个 Service 用 LoadBalancer 类型代价太高（每个 LB 都要钱）。Ingress 让多个服务**共用一个入口**，通过域名/路径路由。

```
外部流量
    │
    ▼
 Ingress Controller（Nginx/Traefik/Gateway API）
    │
    ├── /api/*      → go-api-svc:80
    ├── /admin/*    → admin-svc:80
    └── /static/*   → frontend-svc:80
```

### 安装 Nginx Ingress Controller

```bash
# Minikube 开启 ingress 插件（最简单）
minikube addons enable ingress

# 生产环境 Helm 安装
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=2 \
  --set controller.nodeSelector."kubernetes\.io/os"=linux
```

### 基础 Ingress：路径路由

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2     # 路径重写
spec:
  ingressClassName: nginx
  rules:
    - host: api.friday-go.icu                           # 域名匹配
      http:
        paths:
          - path: /api(/|$)(.*)
            pathType: Prefix
            backend:
              service:
                name: go-api-svc
                port:
                  number: 80
          - path: /admin(/|$)(.*)
            pathType: Prefix
            backend:
              service:
                name: admin-svc
                port:
                  number: 80
```

**pathType 三种类型：**

| pathType | 匹配方式 | 示例 |
|---------|---------|------|
| `Exact` | 精确匹配 | `/api` 只匹配 `/api`，不匹配 `/api/users` |
| `Prefix` | 前缀匹配 | `/api` 匹配 `/api`、`/api/users`、`/api/v2/` |
| `ImplementationSpecific` | 由 Ingress Controller 决定 | Nginx 支持正则 |

### HTTPS 配置（TLS）

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress-tls
  annotations:
    # cert-manager 自动申请 Let's Encrypt 证书
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.friday-go.icu
      secretName: api-tls-cert       # 存放证书的 Secret
  rules:
    - host: api.friday-go.icu
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: go-api-svc
                port:
                  number: 80
```

### 常用 Nginx Ingress 注解

```yaml
annotations:
  # 超时设置
  nginx.ingress.kubernetes.io/proxy-connect-timeout: "60"
  nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
  nginx.ingress.kubernetes.io/proxy-send-timeout: "60"

  # 请求体大小限制
  nginx.ingress.kubernetes.io/proxy-body-size: "10m"

  # 速率限制
  nginx.ingress.kubernetes.io/limit-rps: "100"
  nginx.ingress.kubernetes.io/limit-connections: "20"

  # CORS 跨域
  nginx.ingress.kubernetes.io/enable-cors: "true"
  nginx.ingress.kubernetes.io/cors-allow-origin: "https://friday-go.icu"
  nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"

  # WebSocket 支持
  nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
  nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
  nginx.ingress.kubernetes.io/configuration-snippet: |
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

  # Basic Auth
  nginx.ingress.kubernetes.io/auth-type: basic
  nginx.ingress.kubernetes.io/auth-secret: basic-auth-secret
  nginx.ingress.kubernetes.io/auth-realm: "Authentication Required"
```

### 多域名路由

```yaml
spec:
  rules:
    # 前端
    - host: www.friday-go.icu
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-svc
                port:
                  number: 80
    # API
    - host: api.friday-go.icu
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: go-api-svc
                port:
                  number: 80
    # 管理后台
    - host: admin.friday-go.icu
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: admin-svc
                port:
                  number: 80
```

---

## NetworkPolicy：网络隔离

默认所有 Pod 之间可以互相通信，生产环境建议用 NetworkPolicy 做隔离。

```yaml
# 只允许来自同 namespace 且有 app=frontend 标签的 Pod 访问 go-api
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: go-api         # 保护的目标 Pod
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend    # 只允许来自 frontend Pod
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: mysql       # 只允许访问 mysql
      ports:
        - protocol: TCP
          port: 3306
    # 允许访问 CoreDNS（必须保留，否则 DNS 解析失败）
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
```

> **注意**：NetworkPolicy 需要 CNI 插件支持（Calico、Cilium、Weave），Flannel 默认不支持！

---

## 完整实战：多服务应用网络配置

以一个典型的"前端 + API + 数据库"架构为例：

```yaml
# 1. go-api Service（ClusterIP，仅内部访问）
apiVersion: v1
kind: Service
metadata:
  name: go-api-svc
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: go-api
  ports:
    - port: 80
      targetPort: 8080
---
# 2. frontend Service（ClusterIP，仅内部访问）
apiVersion: v1
kind: Service
metadata:
  name: frontend-svc
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: frontend
  ports:
    - port: 80
      targetPort: 3000
---
# 3. MySQL Service（Headless，StatefulSet 配套）
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: production
spec:
  clusterIP: None
  selector:
    app: mysql
  ports:
    - port: 3306
---
# 4. Ingress（统一入口，对外暴露）
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: main-ingress
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - friday-go.icu
        - api.friday-go.icu
      secretName: main-tls
  rules:
    - host: friday-go.icu
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-svc
                port:
                  number: 80
    - host: api.friday-go.icu
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: go-api-svc
                port:
                  number: 80
```

---

## 服务发现实战

Go 应用连接 K8s 内部服务只需使用 Service 的 DNS 名称：

```go
package config

import "fmt"

type Config struct {
    // 使用 K8s 内部 DNS，格式：<service>.<namespace>
    DBHost     string
    RedisHost  string
}

func Load() Config {
    return Config{
        // 同 namespace 可以简写
        DBHost:    getEnv("DB_HOST", "mysql.production:3306"),
        RedisHost: getEnv("REDIS_HOST", "redis-headless.production:6379"),
    }
}

func getEnv(key, defaultVal string) string {
    if v, ok := os.LookupEnv(key); ok {
        return v
    }
    return defaultVal
}
```

---

## 调试网络问题的标准流程

```bash
# Step 1: 确认 Pod 在运行
kubectl get pods -n <namespace>

# Step 2: 确认 Service 存在且有 Endpoints
kubectl get svc -n <namespace>
kubectl get endpoints <service-name> -n <namespace>
# 若 Endpoints 为空，检查 selector 和 Pod Labels

# Step 3: 在 Pod 内测试连通性
kubectl exec -it <pod-name> -n <namespace> -- wget -qO- http://go-api-svc/health

# Step 4: 测试 DNS 解析
kubectl exec -it <pod-name> -- nslookup go-api-svc.production.svc.cluster.local

# Step 5: 检查 Ingress
kubectl describe ingress <ingress-name> -n <namespace>
kubectl get events -n <namespace> | grep ingress
```

---

## 小结

K8s 网络的核心逻辑：

| 场景 | 方案 |
|------|------|
| 服务间内部通信 | ClusterIP Service + DNS 名称 |
| 暴露给外部（生产） | LoadBalancer + Ingress（节省 LB 费用） |
| 本地测试 | NodePort 或 `kubectl port-forward` |
| 有状态集群（Redis/MySQL） | Headless Service + StatefulSet |
| 外部服务集成 | ExternalName Service |
| 网络隔离 | NetworkPolicy |

下一篇：**Kubernetes 配置管理**——ConfigMap 与 Secret 的正确使用方式，以及如何安全地管理生产密钥。

---

[← K8s 工作负载](/courses/devops-practice/k8s-workloads) | [下一篇：K8s 配置管理 →](/courses/devops-practice/k8s-config)
