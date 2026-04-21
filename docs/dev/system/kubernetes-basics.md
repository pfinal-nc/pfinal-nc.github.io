---
title: "Kubernetes 基础入门：从容器编排到生产实践"
date: 2026-04-21 10:00:00
author: PFinal南丞
description: "全面讲解 Kubernetes 核心概念、资源对象、部署策略和实战技巧，帮助开发者快速掌握 K8s 容器编排技术"
keywords:
  - Kubernetes
  - K8s
  - 容器编排
  - Docker
  - DevOps
  - 云原生
tags:
  - kubernetes
  - docker
  - devops
  - cloud-native
---

# Kubernetes 基础入门：从容器编排到生产实践

Kubernetes（简称 K8s）已成为云原生时代的操作系统，它自动化了容器的部署、扩展和管理，让开发者可以专注于业务逻辑而非基础设施。

**相关文章推荐：**
- [Docker 基础入门](./docker-basics.md) - 容器化技术基础
- [GitOps 实战：从应用部署到全生命周期管理](../backend/golang/GitOps实战：从应用部署到全生命周期管理.md) - 现代化部署流程
- [Go 微服务治理：熔断、限流与降级](../backend/golang/circuit-breaker-rate-limiting.md) - 微服务架构设计
- [SSH 安全加固指南 2025](../../security/engineering/SSH-Security-Hardening-Guide-2025.md) - 服务器安全加固

## 为什么选择 Kubernetes？

### 核心能力

| 能力 | 说明 |
|------|------|
| **服务发现与负载均衡** | 自动分配容器 IP，提供统一访问入口 |
| **存储编排** | 自动挂载本地、云存储或网络存储 |
| **自动部署与回滚** | 声明式配置，自动完成滚动更新和回滚 |
| **自动扩缩容** | 基于 CPU/内存/自定义指标自动扩缩 |
| **自我修复** | 自动重启、替换、杀死不健康容器 |
| **密钥与配置管理** | 安全地管理敏感信息和应用配置 |

### 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      Kubernetes Cluster                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Control Plane                        │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐  │   │
│  │  │ API     │  │ etcd    │  │ Controller Manager  │  │   │
│  │  │ Server  │  │ (存储)  │  │ (控制器管理器)       │  │   │
│  │  └─────────┘  └─────────┘  └─────────────────────┘  │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │         Scheduler (调度器)                   │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Worker Nodes                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │ kubelet     │  │ kube-proxy  │  │ Container   │  │   │
│  │  │ (节点代理)   │  │ (网络代理)   │  │ Runtime     │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │         Pods (容器组)                        │    │   │
│  │  │  ┌─────┐ ┌─────┐ ┌─────┐                   │    │   │
│  │  │  │App  │ │Side │ │Init │                   │    │   │
│  │  │  │容器 │ │car  │ │容器 │                   │    │   │
│  │  │  └─────┘ └─────┘ └─────┘                   │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 核心概念

### 1. Pod - 最小的部署单元

```yaml
# pod-example.yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  labels:
    app: nginx
    tier: frontend
spec:
  containers:
  - name: nginx
    image: nginx:1.25-alpine
    ports:
    - containerPort: 80
      name: http
    resources:
      requests:
        memory: "64Mi"
        cpu: "100m"
      limits:
        memory: "128Mi"
        cpu: "200m"
    livenessProbe:
      httpGet:
        path: /health
        port: 80
      initialDelaySeconds: 10
      periodSeconds: 5
    readinessProbe:
      httpGet:
        path: /ready
        port: 80
      initialDelaySeconds: 5
      periodSeconds: 3
```

### 2. Deployment - 无状态应用部署

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  labels:
    app: web
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
        version: v1
    spec:
      containers:
      - name: web
        image: myapp:v1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: log.level
        volumeMounts:
        - name: cache
          mountPath: /cache
        - name: config
          mountPath: /config
          readOnly: true
      volumes:
      - name: cache
        emptyDir: {}
      - name: config
        configMap:
          name: app-config
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - web
              topologyKey: kubernetes.io/hostname
```

### 3. Service - 服务发现与负载均衡

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  type: ClusterIP  # 可选: ClusterIP, NodePort, LoadBalancer, ExternalName
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
    name: http
  - port: 443
    targetPort: 8443
    protocol: TCP
    name: https
  sessionAffinity: ClientIP  # 会话保持
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800

---
# NodePort 类型
apiVersion: v1
kind: Service
metadata:
  name: web-nodeport
spec:
  type: NodePort
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
    nodePort: 30080  # 范围: 30000-32767

---
# LoadBalancer 类型 (云平台)
apiVersion: v1
kind: Service
metadata:
  name: web-lb
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
```

### 4. ConfigMap & Secret - 配置管理

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  # 简单键值对
  database.host: "postgres"
  database.port: "5432"
  log.level: "info"
  
  # 配置文件
  app.properties: |
    server.port=8080
    spring.profiles.active=prod
    cache.enabled=true
  
  nginx.conf: |
    server {
      listen 80;
      location / {
        proxy_pass http://backend;
      }
    }

---
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
data:
  # echo -n 'postgres://user:pass@db:5432/app' | base64
  url: cG9zdGdyZXM6Ly91c2VyOnBhc3NAZGI6NTQzMi9hcHA=
  username: dXNlcg==
  password: cGFzcw==

---
# 使用 stringData (自动 base64 编码)
apiVersion: v1
kind: Secret
metadata:
  name: api-keys
type: Opaque
stringData:
  api.key: "sk-1234567890abcdef"
  jwt.secret: "my-super-secret-key"
```

### 5. Ingress - HTTP 路由

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.example.com
    - www.example.com
    secretName: example-tls
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /v1
        pathType: Prefix
        backend:
          service:
            name: api-v1
            port:
              number: 80
      - path: /v2
        pathType: Prefix
        backend:
          service:
            name: api-v2
            port:
              number: 80
  - host: www.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

## 存储管理

### 1. PersistentVolume & PersistentVolumeClaim

```yaml
# pv.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: nfs
  nfs:
    path: /data/k8s
    server: 192.168.1.100

---
# pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-pvc
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: nfs
  resources:
    requests:
      storage: 5Gi

---
# 使用 PVC
apiVersion: apps/v1
kind: Deployment
metadata:
  name: db
spec:
  replicas: 1
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      containers:
      - name: postgres
        image: postgres:15
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: app-pvc
```

### 2. StorageClass - 动态供给

```yaml
# storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iops: "10000"
  throughput: "500"
  encrypted: "true"
reclaimPolicy: Delete
allowVolumeExpansion: true
mountOptions:
  - debug
volumeBindingMode: WaitForFirstConsumer
```

## 高级资源

### 1. StatefulSet - 有状态应用

```yaml
# statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  serviceName: redis-headless
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
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        command:
        - redis-server
        - --appendonly
        - "yes"
        volumeMounts:
        - name: data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 10Gi

---
# Headless Service
apiVersion: v1
kind: Service
metadata:
  name: redis-headless
spec:
  clusterIP: None  # Headless
  selector:
    app: redis
  ports:
  - port: 6379
```

### 2. DaemonSet - 节点级部署

```yaml
# daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true
      hostPID: true
      containers:
      - name: node-exporter
        image: prom/node-exporter:latest
        ports:
        - containerPort: 9100
          hostPort: 9100
        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: sys
          mountPath: /host/sys
          readOnly: true
      volumes:
      - name: proc
        hostPath:
          path: /proc
      - name: sys
        hostPath:
          path: /sys
      tolerations:
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
```

### 3. Job & CronJob - 批处理任务

```yaml
# job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-migration
spec:
  ttlSecondsAfterFinished: 86400
  backoffLimit: 3
  activeDeadlineSeconds: 3600
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: migrator
        image: migrator:v1.0
        command: ["./migrate", "--up"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url

---
# cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-job
spec:
  schedule: "0 2 * * *"  # 每天凌晨2点
  concurrencyPolicy: Forbid
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
            command:
            - /bin/sh
            - -c
            - |
              pg_dump $DATABASE_URL > /backup/db-$(date +%Y%m%d).sql
            volumeMounts:
            - name: backup
              mountPath: /backup
          volumes:
          - name: backup
            persistentVolumeClaim:
              claimName: backup-pvc
```

## 自动扩缩容

### 1. HPA - 水平自动扩缩

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

### 2. VPA - 垂直自动扩缩

```yaml
# vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: web-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  updatePolicy:
    updateMode: "Auto"  # Auto, Recreate, Initial, Off
  resourcePolicy:
    containerPolicies:
    - containerName: web
      minAllowed:
        cpu: 50m
        memory: 100Mi
      maxAllowed:
        cpu: 1000m
        memory: 1Gi
      controlledResources: ["cpu", "memory"]
```

## 常用 kubectl 命令

```bash
# ========== 基础命令 ==========
# 查看集群信息
kubectl cluster-info
kubectl get nodes -o wide

# 查看资源
kubectl get pods,svc,deploy -n default
kubectl get all -n kube-system

# 查看详情
kubectl describe pod <pod-name>
kubectl describe node <node-name>

# 查看日志
kubectl logs <pod-name>
kubectl logs <pod-name> -f  # 实时
kubectl logs <pod-name> --tail=100
kubectl logs <pod-name> -c <container-name>  # 多容器

# 进入容器
kubectl exec -it <pod-name> -- /bin/sh
kubectl exec -it <pod-name> -c <container> -- /bin/bash

# ========== 部署管理 ==========
# 应用配置
kubectl apply -f deployment.yaml
kubectl apply -f k8s/  # 整个目录

# 删除资源
kubectl delete -f deployment.yaml
kubectl delete pod <pod-name> --force --grace-period=0

# 扩缩容
kubectl scale deployment web-app --replicas=5

# 滚动重启
kubectl rollout restart deployment web-app

# 查看部署历史
kubectl rollout history deployment web-app
kubectl rollout undo deployment web-app  # 回滚
kubectl rollout undo deployment web-app --to-revision=2

# ========== 调试命令 ==========
# 端口转发
kubectl port-forward pod/<pod-name> 8080:80
kubectl port-forward svc/web-service 8080:80

# 复制文件
kubectl cp <pod-name>:/path/to/file ./local-file
kubectl cp ./local-file <pod-name>:/path/to/file

# 查看事件
kubectl get events --sort-by='.lastTimestamp' | tail -20

# ========== 高级命令 ==========
# 标签操作
kubectl label pod <pod-name> env=prod
kubectl get pods -l app=web,tier=frontend

# 注解操作
kubectl annotate pod <pod-name> description="test pod"

# 资源配额
kubectl top pod
kubectl top node

# 上下文切换
kubectl config get-contexts
kubectl config use-context <context-name>
```

## 生产环境最佳实践

### 1. 资源限制

```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### 2. 健康检查

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

### 3. 安全策略

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 2000
  seccompProfile:
    type: RuntimeDefault
  capabilities:
    drop:
    - ALL
```

## 总结

Kubernetes 是云原生应用的基础设施，掌握它需要理解：

1. **核心资源**：Pod、Deployment、Service、ConfigMap、Secret
2. **存储管理**：PV、PVC、StorageClass
3. **高级资源**：StatefulSet、DaemonSet、Job、CronJob
4. **自动扩缩**：HPA、VPA
5. **网络**：Service、Ingress、NetworkPolicy
6. **安全**：RBAC、SecurityContext、NetworkPolicy

建议从 Minikube 或 Kind 开始本地实践，逐步过渡到生产环境。

---

**参考资源：**
- [Kubernetes 官方文档](https://kubernetes.io/docs/)
- [Kubernetes 中文社区](https://kubernetes.io/zh/)
- [kubectl 备忘单](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
