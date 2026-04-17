---
title: "Kubernetes 工作负载深度解析：Deployment、StatefulSet、DaemonSet"
description: "掌握 Kubernetes 三大核心工作负载：Deployment 滚动更新与回滚、StatefulSet 有状态应用、DaemonSet 守护进程，以及 Job/CronJob 任务调度，含完整 YAML 示例。"
date: 2026-04-17 10:00:00
keywords:
  - Kubernetes Deployment
  - StatefulSet
  - DaemonSet
  - K8s 工作负载
  - 滚动更新
  - 蓝绿部署
  - 有状态应用
  - CronJob
author: PFinal 南丞
category: DevOps
tags:
  - kubernetes
  - k8s
  - devops
  - deployment
  - statefulset
  - 容器编排
---

# Kubernetes 工作负载深度解析：Deployment、StatefulSet、DaemonSet

> 工作负载（Workload）是 K8s 中管理 Pod 的高层抽象，实际生产中几乎不直接操作 Pod，而是通过工作负载来管理。本文深入讲解三大核心工作负载，以及日常最常遇到的坑。

---

## 工作负载类型一览

| 类型 | 适用场景 | 典型示例 |
|------|---------|---------|
| **Deployment** | 无状态应用，多副本，支持滚动更新 | Web API、前端应用 |
| **StatefulSet** | 有状态应用，需要稳定网络标识和持久存储 | MySQL、Redis、Kafka |
| **DaemonSet** | 每个 Node 都运行一个 Pod | 日志收集、节点监控、网络插件 |
| **Job** | 运行一次性任务，成功后退出 | 数据迁移、批处理 |
| **CronJob** | 定时运行任务 | 定期备份、报表生成 |
| **ReplicaSet** | 维护指定数量的 Pod 副本（通常由 Deployment 管理） | 被 Deployment 自动创建 |

---

## Deployment：无状态应用的标准选择

Deployment 是日常用得最多的工作负载，它在 ReplicaSet 之上提供了**声明式更新**能力。

### 基础结构

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: go-api
  namespace: production
  labels:
    app: go-api
spec:
  replicas: 3                    # 期望副本数
  selector:
    matchLabels:
      app: go-api                # 匹配 Pod 的 Label
  template:                      # Pod 模板
    metadata:
      labels:
        app: go-api
        version: v1.2.0
    spec:
      containers:
        - name: go-api
          image: registry.example.com/go-api:v1.2.0
          ports:
            - containerPort: 8080
          # 资源限制（生产必须设置）
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
          # 就绪探针：决定何时接入流量
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          # 存活探针：决定何时重启容器
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 20
            failureThreshold: 3
          # 环境变量
          env:
            - name: DB_HOST
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: host
            - name: APP_ENV
              value: "production"
```

### 滚动更新策略

```yaml
spec:
  strategy:
    type: RollingUpdate           # 默认策略，也可选 Recreate
    rollingUpdate:
      maxSurge: 1                 # 更新期间最多多出几个 Pod
      maxUnavailable: 0           # 更新期间最多允许几个 Pod 不可用
```

**理解这两个参数：**

假设 `replicas: 3`：

| 场景 | `maxSurge=1, maxUnavailable=0` | `maxSurge=0, maxUnavailable=1` |
|------|-------------------------------|-------------------------------|
| 流量影响 | 无（先增后减） | 有（先减后增） |
| 资源消耗 | 临时增加 1 个 Pod | 不增加额外资源 |
| 更新速度 | 稍慢 | 较快 |
| 生产推荐 | ✅ 服务类应用 | 资源受限场景 |

`Recreate` 策略会先删除所有旧 Pod，再创建新 Pod，**会有短暂的服务中断**，仅在开发或需要独占资源的场景使用。

### 发布与回滚

```bash
# 触发更新（修改镜像版本）
kubectl set image deployment/go-api go-api=go-api:v1.3.0 -n production

# 查看更新状态
kubectl rollout status deployment/go-api -n production

# 查看历史版本（默认保留 10 个版本）
kubectl rollout history deployment/go-api -n production

# 查看某个版本的详情
kubectl rollout history deployment/go-api --revision=2 -n production

# 回滚到上一个版本
kubectl rollout undo deployment/go-api -n production

# 回滚到指定版本
kubectl rollout undo deployment/go-api --to-revision=2 -n production

# 暂停更新（灰度一半后验证）
kubectl rollout pause deployment/go-api -n production

# 继续更新
kubectl rollout resume deployment/go-api -n production
```

**注意**：`kubectl apply` 更新 YAML 时，如果内容没有变化（比如镜像 tag 没变），Deployment **不会**触发新的滚动更新。生产中建议使用带 git commit sha 的 tag（如 `v1.2.0-abc1234`）而非 `latest`。

### 金丝雀发布（Canary Release）

用 Label 实现简单的金丝雀：

```yaml
# stable 版本：9 个副本
apiVersion: apps/v1
kind: Deployment
metadata:
  name: go-api-stable
spec:
  replicas: 9
  selector:
    matchLabels:
      app: go-api
      track: stable
  template:
    metadata:
      labels:
        app: go-api
        track: stable
    spec:
      containers:
        - name: go-api
          image: go-api:v1.2.0
---
# canary 版本：1 个副本（10% 流量）
apiVersion: apps/v1
kind: Deployment
metadata:
  name: go-api-canary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: go-api
      track: canary
  template:
    metadata:
      labels:
        app: go-api
        track: canary
    spec:
      containers:
        - name: go-api
          image: go-api:v1.3.0
```

Service 只根据 `app: go-api` 选择，两个 Deployment 的 Pod 都会被纳入负载均衡，10:1 的比例近似 10% 流量走新版本。

---

## StatefulSet：有状态应用的正确姿势

StatefulSet 与 Deployment 最大的区别：

| 特性 | Deployment | StatefulSet |
|------|-----------|-------------|
| Pod 名称 | 随机（nginx-7d9b4-xkj9f） | 有序（mysql-0, mysql-1, mysql-2） |
| Pod 启动顺序 | 并行 | 顺序（0 → 1 → 2） |
| 删除顺序 | 随机 | 逆序（2 → 1 → 0） |
| 存储 | 共享（或无） | 每个 Pod 独立 PVC |
| DNS | Service 域名 | 每个 Pod 独立 DNS 记录 |

### StatefulSet 示例：Redis 集群

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: production
spec:
  serviceName: "redis"            # 必须关联一个 Headless Service
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7.2
          command: ["redis-server", "--appendonly", "yes"]
          ports:
            - containerPort: 6379
          volumeMounts:
            - name: redis-data
              mountPath: /data
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
  # 为每个 Pod 自动创建独立的 PVC
  volumeClaimTemplates:
    - metadata:
        name: redis-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: "standard"
        resources:
          requests:
            storage: 10Gi
---
# StatefulSet 必须配套一个 Headless Service
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: production
spec:
  clusterIP: None                 # Headless Service：clusterIP 设为 None
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
```

**Headless Service 的 DNS 记录：**

```
redis-0.redis.production.svc.cluster.local
redis-1.redis.production.svc.cluster.local
redis-2.redis.production.svc.cluster.local
```

应用程序可以直接通过域名访问特定节点，这对 Redis 主从复制、Kafka、Zookeeper 等集群配置至关重要。

### StatefulSet 更新策略

```yaml
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      partition: 2    # 只更新序号 >= 2 的 Pod（灰度单节点）
```

将 `partition` 设为 `replicas` 数量可以暂停更新，依次减小 `partition` 来逐步灰度。

---

## DaemonSet：每个节点一个 Pod

DaemonSet 确保集群中**每个（或特定）Node 上都运行一个 Pod**，新增 Node 时自动部署。

典型应用场景：
- **日志收集**：Fluentd、Promtail
- **节点监控**：node-exporter
- **网络插件**：Calico、Flannel
- **存储插件**：Ceph CSI

### DaemonSet 示例：Prometheus Node Exporter

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      # 使用主机网络（直接采集宿主机指标）
      hostNetwork: true
      hostPID: true
      # 容忍控制平面节点上的污点，也在 Master 上部署
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
      containers:
        - name: node-exporter
          image: prom/node-exporter:v1.7.0
          args:
            - --path.procfs=/host/proc
            - --path.sysfs=/host/sys
            - --path.rootfs=/host
          ports:
            - containerPort: 9100
              hostPort: 9100       # 映射到宿主机端口
          volumeMounts:
            - name: proc
              mountPath: /host/proc
              readOnly: true
            - name: sys
              mountPath: /host/sys
              readOnly: true
            - name: root
              mountPath: /host
              readOnly: true
          resources:
            limits:
              memory: "128Mi"
              cpu: "250m"
      volumes:
        - name: proc
          hostPath:
            path: /proc
        - name: sys
          hostPath:
            path: /sys
        - name: root
          hostPath:
            path: /
```

### 节点选择：只在特定 Node 上运行

```yaml
spec:
  template:
    spec:
      # 方式一：nodeSelector（简单键值匹配）
      nodeSelector:
        disk: ssd
        
      # 方式二：nodeAffinity（更灵活的规则）
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: kubernetes.io/arch
                    operator: In
                    values: [amd64]
```

---

## Job 与 CronJob：任务调度

### Job：一次性任务

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
spec:
  # 任务成功完成的次数（并行完成）
  completions: 1
  # 并行运行的 Pod 数
  parallelism: 1
  # 失败时最多重试次数
  backoffLimit: 3
  # 任务完成后保留时间（秒），超时自动清理
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      restartPolicy: Never        # Job 必须设置，只能是 Never 或 OnFailure
      containers:
        - name: db-migration
          image: my-app:v1.3.0
          command: ["./migrate", "--up"]
          env:
            - name: DB_URL
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: url
```

```bash
# 查看 Job 状态
kubectl get job db-migration
kubectl describe job db-migration

# 查看 Job 创建的 Pod 日志
kubectl logs -l job-name=db-migration
```

### CronJob：定时任务

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-backup
spec:
  # Cron 表达式（与 Linux crontab 一致）
  schedule: "0 2 * * *"          # 每天凌晨 2 点
  # 并发策略：Forbid（跳过）、Allow（允许并发）、Replace（替换上一个）
  concurrencyPolicy: Forbid
  # 保留历史 Job 数量
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: backup-tool:latest
              command: ["/backup.sh"]
              env:
                - name: S3_BUCKET
                  value: my-backup-bucket
```

常用 Cron 表达式参考：

```
"*/5 * * * *"     每 5 分钟
"0 * * * *"       每小时整点
"0 9 * * 1-5"     工作日早 9 点
"0 0 1 * *"       每月 1 日凌晨
"@daily"          等同于 "0 0 * * *"
```

---

## 探针（Probe）详解

探针是 K8s 判断容器健康状态的机制，直接影响流量路由和自动重启。

### 三种探针

| 探针类型 | 作用 | 失败后行为 |
|---------|------|-----------|
| **livenessProbe** | 容器是否存活 | 重启容器 |
| **readinessProbe** | 容器是否就绪（可接受流量） | 从 Service 端点移除 |
| **startupProbe** | 容器是否启动完成 | 存活/就绪探针不会在此期间运行 |

### 探针实现方式

```yaml
# HTTP GET 探针（最常用）
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
    httpHeaders:
      - name: X-Custom-Header
        value: Awesome
  initialDelaySeconds: 10   # 容器启动后等待多久开始探测
  periodSeconds: 10          # 探测间隔
  timeoutSeconds: 5          # 超时时间
  successThreshold: 1        # 连续成功几次算健康
  failureThreshold: 3        # 连续失败几次触发行为

# TCP 端口探针
livenessProbe:
  tcpSocket:
    port: 3306

# 命令探针（在容器内执行命令）
livenessProbe:
  exec:
    command:
      - cat
      - /tmp/healthy
```

### Go 应用健康检查示例

```go
// 在 Go 应用中实现健康检查端点
package main

import (
    "encoding/json"
    "net/http"
    "sync/atomic"
)

var isReady atomic.Bool

func main() {
    // 模拟启动耗时（初始化数据库连接等）
    go func() {
        initDB()
        isReady.Store(true)
    }()

    http.HandleFunc("/healthz", livenessHandler)
    http.HandleFunc("/readyz", readinessHandler)
    http.ListenAndServe(":8080", nil)
}

// 存活探针：只要进程还活着就返回 200
func livenessHandler(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"status": "alive"})
}

// 就绪探针：初始化完成后才返回 200
func readinessHandler(w http.ResponseWriter, r *http.Request) {
    if !isReady.Load() {
        w.WriteHeader(http.StatusServiceUnavailable)
        json.NewEncoder(w).Encode(map[string]string{"status": "not ready"})
        return
    }
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"status": "ready"})
}
```

---

## 优雅停机（Graceful Shutdown）

K8s 删除 Pod 时流程如下：

```
1. Pod 状态变为 Terminating
2. 从 Service Endpoints 移除（不再接收新流量）
3. 执行 preStop Hook（如果配置了）
4. 发送 SIGTERM 信号给容器
5. 等待 terminationGracePeriodSeconds（默认 30 秒）
6. 若超时，发送 SIGKILL 强制杀死
```

```yaml
spec:
  terminationGracePeriodSeconds: 60    # 给容器 60 秒处理完当前请求
  containers:
    - name: go-api
      lifecycle:
        preStop:
          exec:
            command: ["/bin/sh", "-c", "sleep 5"]   # 等 5 秒让 Endpoints 更新完成
```

Go 应用处理 SIGTERM：

```go
func main() {
    srv := &http.Server{Addr: ":8080"}

    go func() {
        if err := srv.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatal(err)
        }
    }()

    // 监听系统信号
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    // 优雅关闭，等待最多 30 秒
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    if err := srv.Shutdown(ctx); err != nil {
        log.Fatal("Server forced to shutdown:", err)
    }
    log.Println("Server exiting")
}
```

---

## 常见问题排查

### Pod 一直 Pending

```bash
kubectl describe pod <pod-name>
```

常见原因：
- **资源不足**：`Insufficient cpu` / `Insufficient memory` → 检查节点资源或降低 `requests`
- **节点选择失败**：`0/3 nodes are available` → 检查 `nodeSelector` / `affinity` 配置
- **PVC 未绑定**：`persistentvolumeclaim "xxx" not found` → 检查 StorageClass 和 PVC 状态

### Pod CrashLoopBackOff

```bash
# 查看退出原因
kubectl describe pod <pod-name>    # 看 Last State 和 Exit Code
kubectl logs <pod-name> --previous  # 查看崩溃前日志
```

常见退出码：
- `137`：OOM Kill（内存超限）→ 增加 `limits.memory`
- `1`：应用启动错误 → 查日志
- `139`：Segmentation fault

### Deployment 更新卡住

```bash
kubectl rollout status deployment/go-api
# 如果卡住，看新 Pod 为什么起不来
kubectl describe pod <new-pod-name>
```

---

## 小结

本文覆盖了 K8s 三大工作负载：

- **Deployment**：无状态应用首选，支持滚动更新、金丝雀、回滚
- **StatefulSet**：有状态应用，稳定网络标识 + 独立持久存储
- **DaemonSet**：基础设施级组件，节点级部署
- **Job / CronJob**：一次性和定时任务

配合探针和优雅停机，才能打造真正生产可用的 K8s 部署。

下一篇：**Kubernetes 服务发现与网络**——Service 类型详解、Ingress 配置、DNS 解析原理。

---

[← K8s 架构与核心概念](/courses/devops-practice/k8s-architecture) | [下一篇：K8s 服务发现与网络 →](/courses/devops-practice/k8s-networking)
