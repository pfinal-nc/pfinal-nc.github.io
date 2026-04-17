---
title: "Kubernetes 入门：架构与核心概念全解析"
description: "深入理解 Kubernetes 架构设计，掌握 Pod、Node、Namespace、控制平面等核心概念，以及 kubectl 常用命令，从零开始入门 K8s。"
date: 2026-04-17 09:00:00
keywords:
  - Kubernetes 入门
  - K8s 架构
  - Pod 详解
  - Namespace
  - kubectl 命令
  - 控制平面
  - 容器编排
  - k8s 教程
author: PFinal 南丞
category: DevOps
tags:
  - kubernetes
  - k8s
  - devops
  - 容器编排
  - 入门教程
---

# Kubernetes 入门：架构与核心概念全解析

> Kubernetes 是目前最主流的容器编排平台，掌握它是每一个后端工程师进阶 DevOps 的必经之路。本文从架构设计讲起，带你彻底搞懂 K8s 的核心概念。

---

## 为什么需要 Kubernetes？

在讲架构之前，先回答一个问题：**Docker 不够用吗？**

单机跑几个容器，Docker + Docker Compose 完全够用。但生产环境往往面对：

| 问题 | Docker 的局限 |
|------|--------------|
| 容器崩溃 | 需要手动重启 |
| 服务扩容 | 手动复制容器 |
| 负载均衡 | 需要额外配置 Nginx |
| 多机部署 | Docker Compose 不跨机器 |
| 滚动升级 | 手动操作，容易中断服务 |
| 配置管理 | 环境变量分散，难以统一 |

Kubernetes 解决的正是这些问题——**自动调度、自愈、扩缩容、服务发现**，一套平台搞定。

---

## Kubernetes 架构总览

K8s 采用 **Master-Worker** 架构，整体分为两个平面：

```
┌──────────────────────────────────────────────────────────────┐
│                    控制平面（Control Plane）                   │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  API Server  │  │  etcd 存储   │  │  Controller Manager │  │
│  │  (入口网关)  │  │ (集群状态DB)  │  │  (控制器集合)       │  │
│  └─────────────┘  └──────────────┘  └────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │             Scheduler (调度器)                        │   │
│  │             决定 Pod 运行在哪个 Node 上                │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                          │ API 调用
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                   工作节点（Worker Node）                      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  kubelet (节点代理)  │  kube-proxy (网络代理)           │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │    Pod A      │  │    Pod B      │  │     Pod C        │   │
│  │ [容器1][容器2]│  │  [容器1]     │  │   [容器1]        │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 控制平面组件详解

**1. kube-apiserver（API 服务器）**

所有操作的统一入口，`kubectl` 命令、其他组件通信都走 API Server。

- 负责认证、鉴权、准入控制
- 唯一读写 etcd 的组件
- 无状态，可水平扩展

**2. etcd（分布式键值存储）**

K8s 的"数据库"，存储整个集群的状态：

```
/registry/pods/default/nginx-abc123       → Pod 定义
/registry/services/default/my-service    → Service 定义
/registry/deployments/default/app        → Deployment 定义
```

etcd 使用 Raft 协议保证一致性，**生产环境必须做高可用部署（3 节点或 5 节点）**。

**3. kube-scheduler（调度器）**

决定新建的 Pod 应该运行在哪个 Node 上，考虑因素包括：

- Node 资源（CPU/内存）是否充足
- 节点亲和性/反亲和性规则
- 污点（Taint）与容忍（Toleration）
- 数据本地性（Topology）

**4. kube-controller-manager（控制器管理器）**

内置了几十个控制器，每个负责一类资源的"期望状态 → 实际状态"的协调：

| 控制器 | 职责 |
|-------|-----|
| Deployment Controller | 维护 Pod 副本数，滚动更新 |
| ReplicaSet Controller | 确保指定数量的 Pod 运行 |
| Node Controller | 监控节点健康状态 |
| Service Account Controller | 自动创建 ServiceAccount |
| Namespace Controller | 清理已删除 Namespace 的资源 |

### 工作节点组件详解

**1. kubelet（节点代理）**

每个 Worker Node 上运行的代理，负责：

- 接收 Pod 规格，驱动容器运行时（containerd/Docker）创建容器
- 周期性上报节点状态和 Pod 状态给 API Server
- 执行存活探针（Liveness Probe）和就绪探针（Readiness Probe）

**2. kube-proxy（网络代理）**

实现 K8s Service 的网络代理，维护 iptables/IPVS 规则，让流量正确路由到 Pod。

**3. 容器运行时（Container Runtime）**

真正运行容器的组件：

- **containerd**（主流选择，K8s 1.24 后默认）
- **CRI-O**（轻量级，OpenShift 用）
- **Docker**（K8s 1.24 已弃用，但 containerd 仍在底层）

---

## 核心概念详解

### Pod：K8s 最小调度单位

Pod 是 K8s 里**最小的部署单元**，一个 Pod 可以包含一个或多个容器。

**为什么不直接用容器，而要用 Pod？**

同一个 Pod 内的容器：
- 共享同一个网络命名空间（同一个 IP）
- 共享存储卷（Volume）
- 总是被调度到同一个 Node 上

这解决了紧密协作容器的通信问题，比如一个主应用容器 + 一个日志收集 Sidecar 容器。

```yaml
# 最基本的 Pod 定义
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  labels:
    app: nginx
spec:
  containers:
    - name: nginx
      image: nginx:1.25
      ports:
        - containerPort: 80
      resources:
        requests:
          memory: "64Mi"
          cpu: "250m"
        limits:
          memory: "128Mi"
          cpu: "500m"
```

**Pod 的生命周期阶段：**

```
Pending → Running → Succeeded/Failed
   │
   └── 调度中（Scheduler 选节点）
       └── 镜像拉取
           └── 容器启动
```

| 状态 | 说明 |
|------|------|
| `Pending` | Pod 已创建，等待调度或拉取镜像 |
| `Running` | 至少一个容器正在运行 |
| `Succeeded` | 所有容器正常退出（适用于 Job） |
| `Failed` | 至少一个容器异常退出 |
| `Unknown` | 无法获取 Pod 状态（节点通信异常） |
| `CrashLoopBackOff` | 容器反复崩溃，K8s 指数退避重启 |

**实用排障命令：**

```bash
# 查看 Pod 状态
kubectl get pod nginx-pod

# 查看 Pod 详细信息（含事件、IP、Node）
kubectl describe pod nginx-pod

# 查看容器日志
kubectl logs nginx-pod
kubectl logs nginx-pod -f       # 实时跟踪
kubectl logs nginx-pod --previous  # 上一次崩溃的日志

# 进入容器调试
kubectl exec -it nginx-pod -- /bin/sh
```

---

### Node：运行 Pod 的机器

Node 可以是物理机，也可以是虚拟机。每个 Node 上会运行 kubelet、kube-proxy 和容器运行时。

```bash
# 查看所有节点
kubectl get nodes
kubectl get nodes -o wide    # 含 IP、OS 信息

# 查看节点详情（含资源使用、污点、条件）
kubectl describe node worker-1

# 查看节点资源使用量（需要 metrics-server）
kubectl top node
```

**Node 条件（Conditions）：**

| 条件 | 含义 |
|------|------|
| `Ready` | 节点健康，可以调度 Pod |
| `MemoryPressure` | 节点内存不足 |
| `DiskPressure` | 节点磁盘空间不足 |
| `PIDPressure` | 节点进程数接近上限 |

---

### Namespace：逻辑隔离空间

Namespace 提供**逻辑上的资源隔离**，在同一个 K8s 集群中划分多个"虚拟集群"。

典型用途：
- 区分环境：`dev`、`staging`、`production`
- 区分团队：`team-frontend`、`team-backend`
- 区分业务：`order-service`、`payment-service`

```bash
# 查看所有 Namespace
kubectl get namespaces

# 默认有 4 个系统 Namespace：
# default         - 不指定时的默认 Namespace
# kube-system     - K8s 系统组件
# kube-public     - 公开可读的资源
# kube-node-lease - 节点心跳数据

# 创建 Namespace
kubectl create namespace production

# 在指定 Namespace 下操作
kubectl get pods -n production
kubectl get all -n kube-system
```

Namespace 资源定义：

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    env: production
```

> **注意**：并非所有资源都有 Namespace 隔离。Node、PersistentVolume、StorageClass 等是**集群级别**资源，不属于任何 Namespace。

---

### Label 与 Selector：K8s 的灵魂机制

K8s 里几乎所有的关联关系都靠 **Label + Selector** 实现。

**Label（标签）**：附加在资源上的键值对

```yaml
metadata:
  labels:
    app: frontend
    version: v2
    env: production
    tier: web
```

**Selector（选择器）**：根据 Label 筛选资源

```bash
# 查找 app=frontend 的 Pod
kubectl get pods -l app=frontend

# 查找 env=production 且 tier=web 的 Pod
kubectl get pods -l env=production,tier=web

# 查找有 app 标签（不限值）的 Pod
kubectl get pods -l app
```

Service 通过 Selector 找到它代理的 Pod：

```yaml
# Service 通过 selector 关联 Pod
apiVersion: v1
kind: Service
metadata:
  name: frontend-svc
spec:
  selector:
    app: frontend     # 匹配所有 app=frontend 的 Pod
  ports:
    - port: 80
      targetPort: 8080
```

---

### Annotation：携带元数据

与 Label 类似，但 Annotation（注解）不用于选择，而是携带工具和系统需要的元数据：

```yaml
metadata:
  annotations:
    # 构建信息
    build-number: "1234"
    git-commit: "abc123def456"
    # Ingress 配置
    nginx.ingress.kubernetes.io/rewrite-target: /
    # Prometheus 监控
    prometheus.io/scrape: "true"
    prometheus.io/port: "9090"
```

---

## kubectl：K8s 命令行工具

`kubectl` 是与 K8s 集群交互的主要工具，掌握常用命令是入门的第一步。

### 配置与上下文

```bash
# 查看当前配置
kubectl config view

# 查看所有上下文（集群）
kubectl config get-contexts

# 切换上下文（切换集群）
kubectl config use-context my-cluster

# 设置默认 Namespace（避免每次加 -n）
kubectl config set-context --current --namespace=production
```

### 资源查看

```bash
# 查看资源类型
kubectl api-resources

# 查看资源
kubectl get pods
kubectl get pods,services,deployments     # 同时查看多种资源
kubectl get all -n default               # 查看 default Namespace 所有资源

# 输出格式
kubectl get pods -o wide          # 宽输出（含 Node IP 等）
kubectl get pods -o yaml          # YAML 格式
kubectl get pods -o json          # JSON 格式
kubectl get pods -o jsonpath='{.items[*].metadata.name}'  # JSONPath 提取
```

### 资源管理

```bash
# 应用 YAML 文件（创建或更新）
kubectl apply -f deployment.yaml
kubectl apply -f ./k8s/              # 应用目录下所有文件

# 删除资源
kubectl delete pod nginx-pod
kubectl delete -f deployment.yaml
kubectl delete pods -l app=nginx      # 按 Label 删除

# 编辑运行中的资源
kubectl edit deployment my-app

# 强制替换（删除后重新创建）
kubectl replace --force -f deployment.yaml
```

### 调试排障

```bash
# 端口转发（本地访问集群内服务）
kubectl port-forward pod/nginx-pod 8080:80
kubectl port-forward svc/my-service 8080:80

# 复制文件
kubectl cp nginx-pod:/etc/nginx/nginx.conf ./nginx.conf
kubectl cp ./config.json nginx-pod:/app/config.json

# 查看资源使用（需要 metrics-server）
kubectl top pods
kubectl top nodes

# 滚动事件查看
kubectl get events --sort-by='.metadata.creationTimestamp'
kubectl get events -w              # 实时监听
```

---

## 在本地搭建 K8s 环境

学习 K8s 最好有一个本地环境，推荐以下方案：

### 方案一：Minikube（推荐新手）

```bash
# macOS 安装
brew install minikube

# 启动集群（使用 Docker 驱动）
minikube start --driver=docker

# 启动指定版本 + 多节点
minikube start --kubernetes-version=v1.29.0 --nodes=2

# 访问 Dashboard
minikube dashboard

# 停止/删除
minikube stop
minikube delete
```

### 方案二：Kind（适合 CI 和测试）

Kind（Kubernetes in Docker）将 K8s 节点跑在 Docker 容器中：

```bash
# 安装
brew install kind

# 创建集群
kind create cluster --name local

# 多节点集群配置
cat <<EOF | kind create cluster --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
  - role: worker
EOF

# 加载本地镜像（避免 push 到远程仓库）
kind load docker-image my-app:latest --name local
```

### 方案三：Rancher Desktop（图形界面）

如果更喜欢 GUI，Rancher Desktop 提供了完整的 K8s 本地环境，内置 containerd 和 kubectl。

```bash
# macOS 通过 brew 安装
brew install --cask rancher
```

---

## 第一个实战：部署 Nginx

用一个完整例子把上面所有概念串起来：

```bash
# 1. 创建 Namespace
kubectl create namespace demo

# 2. 部署 Nginx（命令式）
kubectl create deployment nginx --image=nginx:1.25 -n demo

# 3. 查看 Deployment 和 Pod
kubectl get deployment -n demo
kubectl get pods -n demo

# 4. 暴露服务
kubectl expose deployment nginx --port=80 --type=NodePort -n demo

# 5. 查看服务
kubectl get svc -n demo

# 6. 访问（Minikube）
minikube service nginx -n demo

# 7. 扩容到 3 个副本
kubectl scale deployment nginx --replicas=3 -n demo

# 8. 查看 Pod 自动创建
kubectl get pods -n demo -w

# 9. 清理
kubectl delete namespace demo
```

---

## 理解声明式 vs 命令式

K8s 推崇**声明式（Declarative）**管理，而非命令式：

| 对比 | 命令式 | 声明式 |
|------|--------|--------|
| 写法 | `kubectl create deployment nginx --image=nginx` | 编写 YAML 文件 + `kubectl apply` |
| 关注点 | "怎么做"（操作步骤） | "要什么"（期望状态） |
| 幂等性 | 重复执行可能报错 | 重复执行安全 |
| 版本控制 | 无法 git 追踪 | YAML 文件可以 git 管理 |
| 生产推荐 | ❌ | ✅ |

生产环境所有资源都应该以 YAML 文件形式管理，存入 Git 仓库，配合 GitOps 工具（ArgoCD/Flux）做自动化部署。

---

## 小结

本文覆盖了 Kubernetes 的核心架构：

- **控制平面**：API Server（入口）、etcd（状态存储）、Scheduler（调度）、Controller Manager（协调）
- **工作节点**：kubelet（节点代理）、kube-proxy（网络）、容器运行时
- **核心概念**：Pod（最小单位）、Node（节点）、Namespace（隔离）、Label/Selector（关联机制）
- **工具**：kubectl 常用命令速查

下一篇我们进入 **Kubernetes 工作负载**，重点讲 Deployment 滚动更新、StatefulSet 有状态应用、DaemonSet 守护进程，这是生产实际使用最多的部分。

---

## 延伸阅读

- [Kubernetes 官方文档](https://kubernetes.io/docs/concepts/)
- [Interactive Tutorial](https://kubernetes.io/docs/tutorials/kubernetes-basics/)
- [用 Go 构建一个类 kubectl 的命令行工具](/dev/backend/golang/用 Go 构建一个类 kubectl 的命令行工具)
- [GitOps 实战：从应用部署到全生命周期管理](/dev/backend/golang/GitOps实战：从应用部署到全生命周期管理)

---

[← 返回 DevOps 课程](/courses/devops-practice/) | [下一篇：Kubernetes 工作负载 →](/courses/devops-practice/k8s-workloads)
