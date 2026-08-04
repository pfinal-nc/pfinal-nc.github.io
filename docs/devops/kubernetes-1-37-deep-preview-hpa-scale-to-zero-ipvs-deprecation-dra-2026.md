---
title: Kubernetes 1.37 深度预览：HPA 原生缩零、IPVS 退场倒计时、DRA 设备污点毕业
date: 2026-08-04
tags:
  - kubernetes
  - devops
  - cloud-native
  - container
keywords:
  - Kubernetes 1.37
  - HPA Scale-to-Zero
  - kube-proxy IPVS 废弃
  - DRA 设备污点
  - cgroup v1 强制迁移
  - Kubelet Rootless
  - nftables
  - K8s 2026年8月
category: devops
description: Kubernetes 1.37 计划于 2026 年 8 月 26 日 GA，包含 86 项增强。本文聚焦四个最具实操影响力的变化：HPA Scale-to-Zero 原生支持（无需 KEDA）、kube-proxy IPVS 三年退场路线图、DRA 设备污点与动态资源分配毕业、cgroup v1 强制迁移。提供迁移检查清单和实战配置。
---

# Kubernetes 1.37 深度预览：HPA 原生缩零、IPVS 退场倒计时、DRA 设备污点毕业

> 计划 2026-08-26 GA | 86 项增强 | 16 项毕业至 Stable | 22 项首次 Alpha

Kubernetes 1.37 的发布周期已经进入最后阶段：v1.37.0-rc.0 已于 8 月 5 日发布，Docs Freeze 在同日完成，距 8 月 26 日的正式 GA 不到三周。

这不是一个小版本——86 项增强（不含已推迟或移出里程碑的条目）的体量在 Kubernetes 发布历史中属于偏大的一批。但比起数量，更重要的是其中几个变化的**实操紧迫性**：如果你的集群还在用 cgroup v1 或 kube-proxy IPVS 模式，1.37 就是你需要开始行动的那个版本。

本文按"对运维团队的实际影响"排序，逐一拆解最关键的四个变化。

## 一、HPA Scale-to-Zero 原生支持：队列型工作负载的零成本空闲

### 过去：你需要 KEDA 或 Knative

在 1.37 之前，Kubernetes 原生的 Horizontal Pod Autoscaler (HPA) 有一个硬性限制：`minReplicas` 最小只能设为 **1**。

如果你的工作负载是一个队列消费者——比如从 RabbitMQ / Kafka 消费消息的 worker——在队列为空的时间段里，它仍然至少有一个 Pod 在运行，消耗 CPU、内存和节点资源。

这催生了 KEDA（Kubernetes Event-Driven Autoscaling）的流行——它通过自定义 metrics adapter 实现了真正的 scale-to-zero。但现在，它不再是唯一的选择。

### 1.37：HPAScaleToZero 进入 Beta

`HPAScaleToZero` 特性门控在 1.37 中进入 Beta，这意味着 HPA 可以直接将 Deployment 缩放到 0 个副本。

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: queue-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: queue-worker
  minReplicas: 0          # ← 1.37 起允许设为 0
  maxReplicas: 10
  metrics:
  - type: External
    external:
      metric:
        name: queue_messages_visible
      target:
        type: Value
        value: "0"        # 队列为空 → 缩到 0
```

### 工作原理

当 HPA 控制器检测到外部指标（如队列深度）为 0 时：

```
1. HPA 评估指标 → queue_messages_visible = 0
2. 判断当前副本数 > minReplicas(0) → 触发缩减
3. 默认 5 分钟稳定窗口防止抖动
4. Deployment replicas 设为 0
5. 所有 Pod 终止，释放节点资源

6. 当新消息到达 → queue_messages_visible > 0
7. HPA 检测到指标变化 → 触发扩容
8. Deployment replicas 从 0 恢复到 ≥1
9. 新 Pod 启动并开始消费消息
```

### 重要限制

Scale-to-zero **仅支持 External 和 Object 指标**，不支持 CPU 和 Memory：

```yaml
# ❌ 不能用于 CPU/内存指标
metrics:
- type: Resource
  resource:
    name: cpu
    target:
      type: Utilization
      averageUtilization: 50
# 原因：0 个副本时无法计算利用率百分比
```

这个设计很合理——CPU/内存利用率是"百分比"概念，分子是 Pod 的资源使用量，分母是 Pod 的资源请求量。当 Pod 数量为 0 时，分子分母都是 0，无法计算。

### 与 KEDA 的定位关系

KEDA 并不会因此被淘汰。两者的关系更像是：

| 场景 | 推荐方案 |
|------|---------|
| 单一消息队列（RabbitMQ 一个队列） | HPA Scale-to-Zero |
| 多种事件源（Kafka + Azure Queue + Cron） | KEDA |
| Cron 定时扩缩 | KEDA |
| 复杂扩缩策略（多条件 AND/OR） | KEDA |
| 追求零外部依赖 | HPA Scale-to-Zero |

KEDA 的价值在于它丰富的 **ScaledObject 事件源连接器**（50+ 种），而 HPA Scale-to-Zero 的价值在于**零额外组件、原生集成**。

### 实战配置：带冷启动优化的队列 Worker

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: queue-worker
spec:
  replicas: 0  # 初始 0，由 HPA 管理
  template:
    spec:
      containers:
      - name: worker
        image: my-queue-worker:v2
        # 冷启动优化：设置合理的 startupProbe
        startupProbe:
          httpGet:
            path: /healthz
            port: 8080
          failureThreshold: 30
          periodSeconds: 2
        # 优雅停机：确保处理中的消息不会丢失
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
        env:
        - name: QUEUE_NAME
          value: "orders"
        - name: BATCH_SIZE
          value: "10"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: queue-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: queue-worker
  minReplicas: 0
  maxReplicas: 10
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # 5 分钟稳定窗口
      policies:
      - type: Pods
        value: 1
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0    # 扩容立即执行
      policies:
      - type: Pods
        value: 2
        periodSeconds: 15
  metrics:
  - type: External
    external:
      metric:
        name: queue_messages_visible
      target:
        type: Value
        value: "0"
```

## 二、kube-proxy IPVS 正式退场：三年倒计时开始

### 发生了什么

Kubernetes 1.37 中，kube-proxy 在 IPVS 模式下启动时，会输出一个**废弃警告**：

```
W0826 10:00:00.123456   1 server.go:xxx] 
kube-proxy IPVS mode is deprecated in v1.37 and will be removed in v1.43.
Please migrate to nftables mode. 
See https://kubernetes.io/docs/tasks/administer-cluster/migrate-from-ipvs/
```

这不是轻描淡写的警告——这是**三次发布后退场倒计时**的开始：

| 版本 | 预计日期 | IPVS 状态 |
|------|---------|----------|
| v1.37 | 2026-08-26 | 废弃警告，功能正常 |
| v1.40 | 2027-04 | 默认禁用，需手动启用 |
| v1.43 | 2028-04 | 完全移除 |

### 为什么移除 IPVS？

IPVS（IP Virtual Server）曾经被视为 iptables 模式的性能救星——在大规模集群中，iptables 的 O(n) 规则匹配成为瓶颈，而 IPVS 的哈希表查找提供 O(1) 性能。

但 nftables 改变了游戏规则：
- nftables 也提供了 O(1) 的查找性能
- nftables 是 iptables 的继任者，得到了 Linux 内核的持续投入
- IPVS 需要额外的内核模块（`ip_vs`、`ip_vs_rr` 等），维护成本高
- IPVS 的功能实现与 Service 语义有微妙的不一致（如 session affinity）

### 迁移步骤：IPVS → nftables

```bash
# 1. 检查当前模式
kubectl -n kube-system get configmap kube-proxy -o jsonpath='{.data.config\.conf}' | grep 'mode:'

# 如果输出是 mode: ipvs，继续

# 2. 修改 ConfigMap
kubectl edit configmap -n kube-system kube-proxy

# 将 mode: ipvs 改为 mode: nftables
# 从：
#   mode: ipvs
# 改为：
#   mode: nftables

# 3. 滚动重启 kube-proxy（逐节点，不需要排空节点）
kubectl rollout restart daemonset kube-proxy -n kube-system

# 4. 验证迁移结果
kubectl -n kube-system logs -l k8s-app=kube-proxy | grep "Using nftables"

# 5. 验证 Service 连通性
kubectl get svc --all-namespaces
# 检查关键 Service 的端点是否正常
kubectl get endpoints -n kube-system
```

### 迁移中的潜在问题

**session affinity 行为变化**：IPVS 和 nftables 在 `sessionAffinity: ClientIP` 的实现上有微妙差异。如果你的服务依赖精确的会话亲和性，迁移后务必验证：

```bash
# 测试会话亲和性
for i in $(seq 1 20); do
  curl -s -H "Host: myapp.example.com" http://$NODE_IP:30080/hostname
  echo ""
done
# 检查所有请求是否路由到同一个 Pod
```

**自定义 IPVS 调度算法**：IPVS 支持多种调度算法（rr、wrr、lc、wlc、sh、dh 等），但 nftables 使用内核原生的随机选择。如果你的服务配置了非默认调度算法，迁移后 Service 负载分布会改变。

## 三、DRA 设备污点毕业：GPU 集群管理的新原语

Dynamic Resource Allocation (DRA) 自 1.26 引入以来就是一个重要的方向，但在 1.37 中，它的几个关键子特性终于毕业为 Stable。

### Device Taints & Tolerations（设备污点与容忍）→ GA

这是 GPU 集群运维的一场小革命：在 1.37 之前，如果一块 GPU 开始出现 ECC 错误或温度异常，运维人员需要手动 cordon 节点，排空上面的所有工作负载，然后才能处理这块 GPU。

有了设备污点，你可以**精确地标记一块 GPU 为不可用，而不影响同节点上的其他 GPU**：

```yaml
apiVersion: resource.k8s.io/v1beta1
kind: DeviceTaintRule
metadata:
  name: gpu-ecc-errors
spec:
  deviceSelector:
    vendor: nvidia.com
    attributes:
    - name: ecc.errors.corrected
      operator: Gt
      value: "100"
  taint:
    key: gpu.nvidia.com/ecc-degraded
    effect: NoSchedule
    # 只有明确容忍这个污点的工作负载才能使用这块 GPU
```

```yaml
# 训练任务：不容忍 ECC 错误
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: training
    resources:
      requests:
        gpu: "1"
  # 没有 toleration → 不会被调度到 ECC 出错的 GPU

---
# 调试任务：允许在受损 GPU 上运行
apiVersion: v1
kind: Pod
spec:
  tolerations:
  - key: gpu.nvidia.com/ecc-degraded
    operator: Exists
  containers:
  - name: debug
    resources:
      requests:
        gpu: "1"
```

### DRA 其他关键毕业项

**扩展资源模型 → GA**：DRA 的资源请求现在完全兼容传统的 `resources.limits/requests` 系统，不再需要额外的 ResourceClaim 模板。

**Downward API 设备属性 → GA**：

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: nccl-training
    volumeMounts:
    - name: device-info
      mountPath: /etc/device
  volumes:
  - name: device-info
    downwardAPI:
      items:
      - path: "gpu"
        resourceClaims:
        - name: my-gpu
          # Pod 内可以直接读取 PCIe 地址、UUID、NUMA 节点
```

Pod 内的进程可以直接从 `/etc/device/gpu` 读取设备拓扑信息，而不需要调用 Kubernetes API。对于需要硬件拓扑感知的 NCCL 分布式训练，这极大地简化了启动流程。

### 新增的 DRA Alpha 特性

虽然不立即用于生产，但值得关注：

- **DRA Device Compatibility Groups**：防止 MIG 和 vGPU 在同块 GPU 上冲突
- **DRA Derived Attributes**：用 CEL 表达式统一跨厂商的设备属性
- **DRA Optional Node Preparation**：云/虚拟资源跳过本地 gRPC 驱动程序调用

## 四、cgroup v1 强制迁移：你的 kubelet 可能启动不了

### 这是 1.37 中最"硬"的变化

从 1.37 开始，kubelet 在检测到节点使用 cgroup v1 时**默认拒绝启动**：

```
E0826 10:00:00 kubelet.go:xxx] cgroup v1 detected. 
cgroup v1 support is deprecated and will be removed. 
Set failCgroupV1: false in KubeletConfiguration to override.
```

### 检查你的节点

```bash
# 检查每个节点
for node in $(kubectl get nodes -o name); do
  echo "=== $node ==="
  kubectl debug $node -it --image=busybox -- stat -f /sys/fs/cgroup -c %T
done

# 输出：
# cgroup2fs → cgroup v2，不受影响
# tmpfs     → cgroup v1，需要迁移！
```

### 迁移方案

cgroup v1 → v2 不是简单的配置变更，它涉及操作系统层面的改动：

```bash
# 在节点上执行（以 Ubuntu 24.04 为例）

# 1. 添加内核启动参数
sudo sed -i 's/GRUB_CMDLINE_LINUX=""/GRUB_CMDLINE_LINUX="systemd.unified_cgroup_hierarchy=1"/' /etc/default/grub
sudo update-grub

# 2. 重启节点
sudo reboot

# 3. 验证
stat -f /sys/fs/cgroup -c %T
# 应该输出: cgroup2fs

# 4. 如果是 Kubernetes 1.35+，还需要删除旧的 cgroup v1 控制器
# （通常重启后自动处理）
```

### 不能用 cgroup v2 的特性

cgroup v2 是某些 Kubernetes 特性的硬性要求。如果你的节点还在 cgroup v1，以下特性完全无法工作：

- **In-Place Pod Resizing**（原地 Pod 资源调整）
- **Tiered Memory Protection**（分层内存保护）
- **Memory QoS**（内存服务质量）

### 应急方案（不推荐长期使用）

```yaml
# /var/lib/kubelet/config.yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
failCgroupV1: false  # ← 仅作为迁移过渡
```

⚠️ 需要明确的是：这个开关被 Kubernetes 团队明确标记为"临时性"的。在未来的版本中，即使设置 `failCgroupV1: false`，kubelet 也可能拒绝启动。把这看作一个迁移截止日期，而不是永久解决方案。

## 其他值得关注的变化

### Kubelet Rootless（User Namespace）→ Beta

Kubelet 可以在用户命名空间中运行，以非 root 用户运行在宿主机上：

```yaml
# kubelet 配置
kind: KubeletConfiguration
apiVersion: kubelet.config.k8s.io/v1beta1
featureGates:
  KubeletInUserNamespace: true
userNamespace:
  enabled: true
```

### 废弃告警合集

| 废弃项 | 状态 | 移除计划 |
|--------|------|---------|
| kube-proxy IPVS 模式 | 废弃警告 | v1.43 (2028-04) |
| Static Pod 引用 Secret/ConfigMap | 已移除 | v1.37 立即生效 |
| `kubectl run --filename/-f` | 废弃 | 后续版本 |
| cgroup v1 支持 | 默认禁用 | 后续版本移除 |

### 已移除：Static Pod 不再支持 Secret/ConfigMap 引用

```yaml
# ❌ 这段配置在 1.37 中不再工作
apiVersion: v1
kind: Pod
metadata:
  name: static-web
spec:
  containers:
  - name: web
    image: nginx
    envFrom:
    - configMapRef:      # ← 已移除，Static Pod 不支持
        name: my-config
    - secretRef:         # ← 已移除，Static Pod 不支持
        name: my-secret
```

## 升级检查清单

在 8 月 26 日之前，每个平台团队应该完成的检查：

```markdown
## K8s 1.37 升级前检查清单

### 🔴 阻塞项（必须完成）
- [ ] 检查所有节点的 cgroup 版本 → 如果是 v1，制定迁移计划
- [ ] 检查 kube-proxy 模式 → 如果是 IPVS，迁移到 nftables
- [ ] 检查 Static Pod 清单 → 移除 Secret/ConfigMap 引用
- [ ] 检查 CNI 插件兼容性（Calico ≥ 3.28 / Cilium ≥ 1.17）

### 🟡 重要项
- [ ] 检查 DRA 使用情况 → 更新 ResourceClaim 以使用 GA API
- [ ] 评估 HPA Scale-to-Zero 的适用场景（队列 worker 等）
- [ ] 检查 kubectl run -f 的使用脚本 → 替换为 kubectl apply
- [ ] 更新集群自动扩缩器 (Cluster Autoscaler) 到兼容版本

### 🟢 建议项
- [ ] 测试 Kubelet Rootless 模式
- [ ] 检查 Volume Health Monitor 的新 API
- [ ] 更新监控系统以支持新的 metrics API (GA)
```

## 总结

Kubernetes 1.37 是一个"清算历史债 + 交付新能力"并重的版本。对运维团队来说：

1. **立即行动**：cgroup v1 和 kube-proxy IPVS 的倒计时已经开始。如果你的集群还依赖它们，现在就动手。
2. **评估机会**：HPA Scale-to-Zero 原生支持意味着可以去掉 KEDA 这个额外组件（如果你只用于简单的队列缩放）。DRA 设备污点让 GPU 集群的运维变得更细粒度。
3. **关注方向**：Kubelet Rootless 在 Beta 阶段值得在非生产环境测试——容器运行时的权限缩减是长期的安全趋势。

86 项增强的完整列表将在 8 月 26 日的官方 CHANGELOG 中发布。在此之前，建议使用 RC 镜像对关键工作负载进行预验证。

## 参考资料

- [Kubernetes v1.37 Sneak Peek (ChangeWatch)](https://changewatch.dev/explore/09b87bd7-592f-4f52-abfa-c321a498411d)
- [KEP-5495: kube-proxy IPVS deprecation](https://github.com/kubernetes/enhancements/tree/master/keps/sig-network/5495)
- [KEP-5055: DRA device taints and tolerations](https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/5055)
- [KEP-2033: Kubelet in User Namespace](https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/2033)
- [Kubernetes 1.37 Release Discussion](https://github.com/kubernetes/sig-release/discussions/3051)
- [Tigera IPVS to nftables Migration Guide](https://docs.tigera.io/calico/latest/operations/ebpf/)
