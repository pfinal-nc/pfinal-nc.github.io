---
title: "Kubernetes v1.36 Haru 深度实战：从安全隔离到 AI 工作负载的 70 项增强"
date: 2026-06-16
tags:
  - kubernetes
  - devops
  - cloud-native
  - security
  - AI
keywords:
  - Kubernetes v1.36
  - K8s 1.36 Haru
  - User Namespaces
  - MutatingAdmissionPolicy
  - AI工作负载
category: devops
description: "深度解读 Kubernetes v1.36 Haru 的 70 项增强：User Namespaces GA 安全隔离、MutatingAdmissionPolicy GA 声明式变更、DRA 增强、AI/ML 工作负载支持，含完整实战配置。"
---

# Kubernetes v1.36 Haru 深度实战：从安全隔离到 AI 工作负载的 70 项增强

2026 年 4 月 22 日，Kubernetes v1.36（代号 **Haru / 春**）正式发布。这是 2026 年的首个重要版本，包含 **70 项增强功能**：18 项进入 Stable（GA）、25 项进入 Beta、25 项进入 Alpha。重点聚焦三大方向——**安全加固、AI/ML 工作负载支持、大规模集群可扩展性**。

本文将深入解读最关键的 GA 特性，并通过实战配置演示如何在生产环境中落地。

## v1.36 三大核心方向

```
                    Kubernetes v1.36 "Haru"
                           │
           ┌───────────────┼───────────────┐
           │               │               │
     安全加固          AI/ML 支持       大规模扩展
           │               │               │
  ┌────────┼────────┐   ┌──┴──┐     ┌──────┼──────┐
  │        │        │   │     │     │      │      │
UserNS  Mutating  AppArmor  DRA  GPU   KEP-    结构化
  GA    Admission   GA    增强  分时   3017   日志
         GA                    调度   API优先级
```

| 方向 | GA 特性 | 影响 |
|------|---------|------|
| 安全加固 | User Namespaces、MutatingAdmissionPolicy、AppArmor | 容器安全默认配置质变 |
| AI/ML | DRA 增强、GPU 分时调度 | AI 工作负载原生支持 |
| 大规模 | Structured Authorization Logging、API Priority | 集群规模上限再突破 |

## 一、User Namespaces GA：容器安全隔离质变

### 问题背景

传统容器中，容器内的 UID 0（root）直接映射到宿主机 UID 0。即使使用 SecurityContext 的 `runAsNonRoot`，仍存在两类风险：

1. **内核漏洞提权**：容器内 root 可利用内核漏洞逃逸到宿主机
2. **文件权限泄漏**：挂载的卷文件所有权与容器内 UID 绑定

### User Namespaces 原理

User Namespaces 将容器内的 UID/GID 映射到宿主机上的非特权 UID/GID：

```
容器内                    宿主机
UID 0 (root)      →     UID 100000 (普通用户)
UID 1             →     UID 100001
UID 2             →     UID 100002
...               →     ...
UID 65535         →     UID 165535
```

**关键安全收益**：即使攻击者在容器内获得 root 权限，在宿主机上仍是普通用户，无法执行特权操作。

### 实战配置

**1. 节点配置**

```bash
# 检查节点是否支持 User Namespaces
# 需要 Linux 内核 >= 5.11，且 kubelet 启用特性门控
# v1.36 GA 后默认启用，无需手动配置
```

**2. Pod 配置**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: user-ns-demo
spec:
  hostUsers: false  # 关键：启用 User Namespace
  containers:
  - name: app
    image: nginx:1.27
    securityContext:
      # 容器内以 root 运行，但映射到宿主机非特权用户
      runAsUser: 0
      runAsGroup: 0
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    hostPath:
      path: /data/user-ns-demo
      type: DirectoryOrCreate
```

**3. 验证映射**

```bash
# 在容器内
kubectl exec user-ns-demo -- id
# uid=0(root) gid=0(root)

# 在宿主机上查看对应进程
kubectl get pod user-ns-demo -o jsonpath='{.status.containerStatuses[0].containerID}'
# 获取容器 ID 后
crictl inspect <container-id> | jq '.info.pid'
# 找到 PID 后
cat /proc/<pid>/uid_map
#         0     100000      65536
# 容器内 UID 0 → 宿主机 UID 100000
```

### 与 StorageClass 集成

v1.36 解决了 User Namespaces 与持久卷的权限映射问题。当 `hostUsers: false` 时，K8s 会自动处理卷挂载的 ID 映射：

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: user-ns-pvc
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
---
apiVersion: v1
kind: Pod
metadata:
  name: user-ns-with-pvc
spec:
  hostUsers: false
  containers:
  - name: app
    image: postgres:16
    volumeMounts:
    - name: pgdata
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: pgdata
    persistentVolumeClaim:
      claimName: user-ns-pvc
```

### 安全增强效果对比

| 攻击场景 | 无 User NS | 有 User NS |
|----------|-----------|-----------|
| 容器内 root → 宿主机 root | 直接映射 | 映射到非特权用户 |
| CVE 内核漏洞利用 | 可获得宿主机 root | 仅获得普通用户权限 |
| 挂载卷文件操作 | 以原始 UID 操作 | ID 映射隔离 |
| 特权操作（mount、iptables） | 可能成功 | 被阻止 |

## 二、MutatingAdmissionPolicy GA：声明式变更准入

### 问题背景

传统 Mutating Webhook 需要额外部署服务，存在：
- **运维负担**：需维护 Webhook 服务的高可用
- **性能瓶颈**：每个请求都需 HTTP 往返
- **故障爆炸半径**：Webhook 服务故障可能阻塞所有写操作

### MutatingAdmissionPolicy 原理

**MutatingAdmissionPolicy（MAP）** 用 CEL 表达式在 API Server 内部执行变更，无需外部服务：

```
传统 Webhook 模式:
API Server → HTTP 调用 → Webhook 服务 → 修改 → 返回
                        (网络往返 ~10ms)

MAP 模式:
API Server → CEL 表达式求值 → 修改 (进程内 ~0.1ms)
```

### 实战：自动注入 Sidecar

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingAdmissionPolicy
metadata:
  name: inject-sidecar
spec:
  matchConstraints:
    objectSelectors:
    - matchLabels:
        sidecar-injection: enabled
    resourceRules:
    - apiGroups:   [""]
      apiVersions: ["v1"]
      operations:  ["CREATE"]
      resources:   ["pods"]
  mutations:
  - patchType: ApplyConfiguration
    applyConfiguration:
      expression: |
        Object {
          metadata: Object.metadata {
            annotations: {"sidecar-injected": "true"}
          },
          spec: Object.spec {
            containers: [
              Object.spec.containers[0],
              Container {
                name: "sidecar-proxy",
                image: "envoyproxy/envoy:v1.31",
                ports: [Port {containerPort: 15001}],
                resources: ResourceRequirements {
                  requests: {"cpu": "100m", "memory": "128Mi"},
                  limits: {"cpu": "500m", "memory": "512Mi"}
                }
              }
            ]
          }
        }
  failurePolicy: Fail
  reinvocationPolicy: IfNeeded
```

### 实战：强制资源限制

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingAdmissionPolicy
metadata:
  name: enforce-resource-limits
spec:
  matchConstraints:
    resourceRules:
    - apiGroups:   [""]
      apiVersions: ["v1"]
      operations:  ["CREATE", "UPDATE"]
      resources:   ["pods"]
    excludeResourceRules:
    - apiGroups: ["*"]
      namespaces: ["kube-system"]
  mutations:
  - patchType: ApplyConfiguration
    applyConfiguration:
      expression: |
        Object {
          spec: Object.spec {
            containers: Object.spec.containers.map(c,
              c.resources.limits == null ?
              Object.spec.containers[0].__union__({
                resources: ResourceRequirements {
                  limits: {"cpu": "2", "memory": "4Gi"},
                  requests: {"cpu": "100m", "memory": "256Mi"}
                }
              }) : c
            )
          }
        }
    }
  failurePolicy: Fail
```

### MutatingAdmissionPolicyBinding

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingAdmissionPolicyBinding
metadata:
  name: enforce-resource-limits-binding
spec:
  policyName: enforce-resource-limits
  matchResources:
    namespaceSelector:
      matchLabels:
        environment: production
  paramRef:
    name: resource-limits-params
    parameterNotFoundAction: Deny
```

### 性能对比

| 指标 | Mutating Webhook | MutatingAdmissionPolicy |
|------|------------------|------------------------|
| 请求延迟增加 | 5-20ms | < 0.5ms |
| 需要外部服务 | 是 | 否 |
| 高可用要求 | 需多副本 | API Server 内置 |
| 故障模式 | 服务宕机阻塞所有写操作 | CEL 编译错误可预检 |
| 配置复杂度 | 中-高 | 低 |

## 三、AppArmor GA：强制访问控制

v1.36 将 AppArmor 支持提升至 GA，提供内核级的强制访问控制：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: apparmor-demo
  annotations:
    # 指定 AppArmor Profile
    container.apparmor.security.beta.kubernetes.io/app: runtime/default
spec:
  containers:
  - name: app
    image: nginx:1.27
    securityContext:
      appArmorProfile:
        type: RuntimeDefault  # 使用容器运行时默认 Profile
        # type: Localhost     # 使用节点本地 Profile
        # localhostProfile: custom-profile
```

**自定义 Profile 示例**（节点 `/etc/apparmor.d/k8s-custom`）：

```bash
#include <tunables/global>
profile k8s-custom flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>
  
  # 允许网络连接
  network inet tcp,
  network inet6 tcp,
  
  # 允许读写特定路径
  /var/log/app/** rw,
  /tmp/** rw,
  
  # 拒绝其他写操作
  deny /** w,
  
  # 允许读操作
  /** r,
}
```

## 四、DRA 增强：AI/ML 工作负载原生支持

### Dynamic Resource Allocation (DRA) 进展

v1.36 的 DRA 增强对 AI/ML 工作负载至关重要：

```
传统 GPU 调度:
  1 Pod = 1 GPU（独占，资源浪费）

DRA + GPU 分时调度:
  多 Pod 共享同一 GPU，按时间片或显存分区
```

### GPU 分时调度实战

```yaml
# ResourceClaimTemplate：定义 GPU 分时资源
apiVersion: resource.k8s.io/v1
kind: ResourceClaimTemplate
metadata:
  name: gpu-timeslice
spec:
  spec:
    resourceClassName: gpu.nvidia.com
    parametersRef:
      apiGroup: resource.k8s.io
      kind: ResourceClaimParameters
      name: gpu-timeslice-params
---
apiVersion: resource.k8s.io/v1
kind: ResourceClaimParameters
metadata:
  name: gpu-timeslice-params
spec:
  vendorParameters:
    driver: gpu.nvidia.com
    params:
      sharing:
        strategy: TimeSlicing
        timeSlicing:
          interval: 20ms  # 20ms 时间片
          resources:
          - name: nvidia.com/gpu
            replicas: 4   # 1 物理GPU虚拟为 4 个
---
# Pod 使用分时 GPU
apiVersion: v1
kind: Pod
metadata:
  name: ml-inference
spec:
  containers:
  - name: inference
    image: pytorch/pytorch:2.7-cuda12
    resources:
      claims:
      - name: gpu-claim
  resourceClaims:
  - name: gpu-claim
    template:
      spec:
        resourceClassName: gpu.nvidia.com
```

### NVIDIA MIG（Multi-Instance GPU）配置

```yaml
apiVersion: resource.k8s.io/v1
kind: ResourceClaimParameters
metadata:
  name: mig-partition
spec:
  vendorParameters:
    driver: gpu.nvidia.com
    params:
      sharing:
        strategy: MIG
        mig:
          devices:
          - profile: 1g.10gb  # 1/7 GPU 计算力 + 10GB 显存
            count: 3
```

## 五、安全加固最佳实践组合

将 User Namespaces + MutatingAdmissionPolicy + AppArmor 组合，构建纵深防御体系：

```yaml
# 集群级安全策略：自动为所有 Pod 注入安全配置
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingAdmissionPolicy
metadata:
  name: security-hardening
spec:
  matchConstraints:
    resourceRules:
    - apiGroups:   [""]
      apiVersions: ["v1"]
      operations:  ["CREATE"]
      resources:   ["pods"]
    excludeResourceRules:
    - apiGroups: ["*"]
      namespaces: ["kube-system", "kube-public"]
  mutations:
  - patchType: ApplyConfiguration
    applyConfiguration:
      expression: |
        Object {
          spec: Object.spec {
            hostUsers: false,
            securityContext: PodSecurityContext {
              runAsNonRoot: true,
              seccompProfile: SeccompProfile {
                type: "RuntimeDefault"
              }
            },
            containers: Object.spec.containers.map(c,
              Container {
                name: c.name,
                image: c.image,
                securityContext: SecurityContext {
                  allowPrivilegeEscalation: false,
                  readOnlyRootFilesystem: true,
                  capabilities: Capabilities {
                    drop: ["ALL"]
                  },
                  appArmorProfile: AppArmorProfile {
                    type: "RuntimeDefault"
                  }
                }
              }
            )
          }
        }
  failurePolicy: Fail
```

**防御层级**：

```
┌──────────────────────────────────────┐
│         MutatingAdmissionPolicy       │  第1层：自动注入安全配置
│  (强制 hostUsers:false, runAsNonRoot) │
├──────────────────────────────────────┤
│            AppArmor                  │  第2层：内核级访问控制
│  (限制文件/网络/能力访问)             │
├──────────────────────────────────────┤
│         User Namespaces              │  第3层：UID 隔离
│  (容器 root → 宿主机普通用户)         │
├──────────────────────────────────────┤
│          Seccomp                     │  第4层：系统调用过滤
│  (限制可用系统调用)                    │
├──────────────────────────────────────┤
│        Network Policy                │  第5层：网络隔离
│  (限制 Pod 间通信)                    │
└──────────────────────────────────────┘
```

## 六、升级指南

### 前置检查

```bash
# 1. 检查 API 弃用
kubectl get --raw /metrics | grep apiserver_request_total | grep deprecated

# 2. 检查现有 Webhook 是否可迁移为 MAP
kubectl get mutatingwebhookconfigurations -o yaml | grep -A5 "rules:"

# 3. 检查节点内核版本（User Namespaces 需要 >= 5.11）
kubectl get nodes -o wide
```

### 升级步骤

```bash
# 1. 升级 kubeadm
sudo kubeadm upgrade plan
sudo kubeadm upgrade apply v1.36.0

# 2. 逐个升级工作节点
kubectl cordon <node>
kubectl drain <node> --ignore-daemonsets --delete-emptydir-data
sudo kubeadm upgrade node

# 升级 kubelet 和 kubectl
sudo apt-get update && sudo apt-get install -y kubelet=1.36.0-00 kubectl=1.36.0-00
sudo systemctl restart kubelet

kubectl uncordon <node>

# 3. 验证集群状态
kubectl get nodes
kubectl get cs
```

### 关键特性门控变化

v1.36 GA 的特性不再需要特性门控：

| 特性 | 之前门控 | v1.36 状态 |
|------|---------|-----------|
| UserNamespacesSupport | `--feature-gates=UserNamespacesSupport=true` | GA，默认启用 |
| MutatingAdmissionPolicy | `--feature-gates=MutatingAdmissionPolicy=true` | GA，默认启用 |
| AppArmor | `--feature-gates=AppArmor=true` | GA，默认启用 |
| DRA | `--feature-gates=DynamicResourceAllocation=true` | Beta，默认启用 |

## 七、可观测性增强

### Structured Authorization Logging

v1.36 引入结构化授权日志，便于审计和安全分析：

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: AuthorizationConfiguration
authorizers:
- type: Node
  name: node
- type: RBAC
  name: rbac
- type: Webhook
  name: webhook
  webhook:
    configuration:
      auditLogging:
        mode: "detailed"  # 详细授权日志
```

查询授权决策：

```bash
# 查看谁被拒绝访问了什么
kubectl get --raw /apis/authorization.k8s.io/v1?audit=true | \
  jq '.items[] | select(.decision == "Denied")'
```

### API Priority and Fairness 增强

```yaml
apiVersion: flowcontrol.apiserver.k8s.io/v1
kind: PriorityLevelConfiguration
metadata:
  name: ai-workload-high
spec:
  type: Limited
  limited:
    nominalConcurrencyShares: 50
    limitResponse:
      type: Queue
      queuing:
        queues: 64
        handSize: 6
        queueLengthLimit: 100
---
apiVersion: flowcontrol.apiserver.k8s.io/v1
kind: FlowSchema
metadata:
  name: ai-workload-schema
spec:
  priorityLevelConfiguration:
    name: ai-workload-high
  matchingPrecedence: 500
  distinguisherMethod:
    type: ByUser
  rules:
  - subjects:
    - kind: ServiceAccount
      serviceAccount:
        name: ai-controller
        namespace: ai-system
    resourceRules:
    - apiGroups: ["resource.k8s.io"]
      resources: ["resourceclaims", "resourceclaimtemplates"]
      verbs: ["*"]
```

## 参考资料

- [Kubernetes v1.36 Release Notes](https://kubernetes.io/blog/2026/04/22/kubernetes-v1-36-release/)
- [User Namespaces GA Blog](https://kubernetes.io/blog/2026/04/23/kubernetes-v1-36-userns-ga/)
- [MutatingAdmissionPolicy Documentation](https://kubernetes.ac.cn/docs/reference/access-authn-authz/mutating-admission-policy/)
- [DRA Enhancement Proposal](https://github.com/kubernetes/enhancements/issues/4381)
- [AppArmor in Kubernetes](https://kubernetes.io/docs/tutorials/security/apparmor/)
- [KEP-3017: API Priority and Fairness](https://github.com/kubernetes/enhancements/issues/3017)

---

**总结**：Kubernetes v1.36 Haru 是安全与 AI 双轮驱动的里程碑。User Namespaces GA 实现了容器安全隔离质变，MutatingAdmissionPolicy GA 让声明式变更准入不再依赖外部 Webhook，DRA 增强让 GPU 分时调度成为可能。三者组合构建的纵深防御体系，将 K8s 安全水位提升到新高度。
