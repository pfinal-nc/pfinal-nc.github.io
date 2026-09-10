---
title: Kubernetes Agent Sandbox 深度实战：用 Sandbox CRD 给 AI Agent 造一个「轻量单容器虚拟机」
date: 2026-09-10
author: PFinal南丞
tags:
  - devops
  - kubernetes
  - ai-agent
  - sandbox
  - gvisor
  - kata-containers
  - cloud-native
keywords:
  - Agent Sandbox
  - Kubernetes Sandbox CRD
  - agents.x-k8s.io
  - SandboxWarmPool
  - SandboxClaim
  - gVisor
  - Kata Containers
  - microVM
  - RuntimeClass
  - AI Agent 隔离
  - 不可信代码执行
category: devops
description: 每个编码 Agent 在内核眼里都是"打字极快的不受信用户"。Kubernetes SIG Apps 的 Agent Sandbox 项目给出了上游答案：一个 Sandbox CRD，把有状态、单例、带稳定身份和持久存储的隔离 Pod 封装成一个声明式 API，并用 SandboxTemplate / SandboxClaim / SandboxWarmPool 三件套解决模板复用、按需领取与冷启动问题。本文拆解四个 API 对象、gVisor 与 Kata 的选型数字、pause/resume 缩零的生命周期设计，以及落地时必须自己扛的那部分平台工作。
recommend: true
top: false
---

# Kubernetes Agent Sandbox 深度实战

## TL;DR

- **问题**：AI Agent 会拉依赖、执行生成的代码、开 socket、写文件——**在内核眼里就是"打字极快的不受信用户"**。普通容器隔离（共享宿主机内核）不足以承载它。
- **上游答案**：Kubernetes SIG Apps 的 **Agent Sandbox** 项目（`kubernetes-sigs/agent-sandbox`），提供一个 **Sandbox CRD**：有状态、单例、稳定身份、持久存储的隔离 Pod，用声明式 API 管理。
- **四个 API 对象**：`Sandbox`（核心）、`SandboxTemplate`（可复用蓝图）、`SandboxClaim`（按需领取，形似 PVC→PV）、`SandboxWarmPool`（预热池）。
- **关键设计**：**Sandbox 是编排器，不是隔离实现**——它把真正的隔离边界委托给 `RuntimeClass` 指定的 gVisor / Kata Containers。选型因此变成"每个模板一个字段"，而不是"整个集群重建一次"。
- **收益**：暂停即缩零、恢复保留状态；配合预热池 + GKE Pod Snapshots，冷启动可降约 90%。

## 一、为什么 Agent 需要"沙箱"而不是"StatefulSet"

先看清楚威胁模型的差异。

普通微服务的代码是你写的、你审的、你部署的。Agent 的代码是**模型在运行时生成的**——同一任务每次路径都可能不同，出问题的那个会话到排查时可能早就没了。Docker 在 2026 年 8 月 31 日的一篇博文里把这件事说得很直白：Agent 是**非确定性的、短暂的（ephemeral）**，而围绕"有持久身份、节奏可预测的人类工作者"设计的安全控件，和这个运行模型根本不匹配。

**答案不是"每个动作都弹窗要授权"**——那等于放弃了 Agent 的自主性。更实际的做法是：**给 Agent 一个受限环境，让它在里面自由活动**。而这个"环境"的底座，正在重新变成 VM。

### 1.1 microVM 已经把"重"的问题解决了

容器当年崛起，部分原因就是 VM 太慢太重。但现在选项不再只有"重量级 VM"和"共享内核的轻量容器"两极，中间被 microVM 填满了：

| 指标 | Firecracker microVM（AWS 为 Lambda 打造） |
|------|-------------------------------------------|
| 启动时间 | **< 125 ms** |
| 内存开销 | **< 5 MiB** |
| 创建速率 | 单主机可达 **150 个/秒** |
| 隔离强度 | 硬件强制虚拟化边界 |

Firecracker 靠砍掉传统 VM 里大量硬件模拟和通用功能实现这些数字，同时保留硬件强制的虚拟化边界。于是 Agent 时代的技术栈形态不是"容器 vs VM"，而是**"容器跑在轻量 VM 隔离里"**——容器负责打包代码，microVM 负责限制代码能干什么。

### 1.2 Kubernetes 承认了沙箱这个抽象

这个架构正在进入 Kubernetes。SIG Apps 的 **Agent Sandbox** 项目，在自己的任务说明里把目标负载写得很清楚：

> isolated environments for executing untrusted, LLM-generated code
> （用于执行不可信的、LLM 生成代码的隔离环境）

项目在 2026 年 3 月由 Kubernetes 官方博客介绍，Red Hat 于同年 7 月发布受支持的构建版本——**已经过了纯实验阶段，进入"睁大眼睛采纳"的阶段**。

## 二、四个 API 对象：Sandbox 及三件套

Agent Sandbox 的 API 面很小，一共四个对象，分工明确。

### 2.1 Sandbox（核心）

`Sandbox` 是核心对象，一个 Agent 定义最多映射到一个运行中的 Pod：

- **稳定身份**：固定的 hostname 与网络身份，多 Agent 场景下可以互相发现；
- **持久存储**：可挂 PVC，状态能跨重启存活；
- **生命周期管理**：控制器负责创建、**定时删除（scheduled deletion）**、**暂停/恢复（pausing / resuming）**。

最小示例（来自官方 README）：

```yaml
apiVersion: agents.x-k8s.io/v1beta1
kind: Sandbox
metadata:
  name: my-sandbox
spec:
  podTemplate:
    spec:
      containers:
        - name: my-container
          image: ghcr.io/example/coding-agent:1.2.0
```

创建后即可通过稳定 hostname `my-sandbox` 访问它。

### 2.2 三件套（extensions 模块）

extensions 模块在核心 Sandbox API 之上提供更高级的能力：

| 对象 | 作用 | 类比 |
|------|------|------|
| `SandboxTemplate` | 可复用蓝图：镜像、资源、**隔离策略**集中定义 | PodTemplate |
| `SandboxClaim` | 面向用户的领取请求，从预热池拿一个沙箱，不关心背后是哪个节点 | **PVC → PV** 的关系 |
| `SandboxWarmPool` | 维持 N 个预热好的沙箱，让"领取"命中已运行的 Pod，而不是重新调度 | 连接池 / 对象池 |

架构关系（文字版）：

```
                        ┌──────────────────────────┐
   User ──── creates ──►│ Sandbox                  │  ← 核心 CRD
     │                  │  agents.x-k8s.io/v1beta1 │
     │                  │  ├ 稳定 hostname/网络身份  │
     │                  │  ├ PVC 持久存储            │
     │                  └──────────┬───────────────┘
     │                             │ creates
     │                  ┌──────────▼───────────────┐
     └── creates ──────►│ Pod                      │
        SandboxClaim    │  runtimeClassName: gvisor │  ← 隔离边界由 RuntimeClass 决定
                        └──────────┬───────────────┘
                                   │
                        ┌──────────▼───────────────┐
                        │ Sandbox Runtime           │
                        │  gVisor / Kata Containers │
                        └──────────────────────────┘

   Extensions 模块：
   SandboxWarmPool ──references──► SandboxTemplate
   SandboxClaim ────adopts───────► Sandbox（来自 WarmPool）
```

### 2.3 安装

推荐用包含 core + extensions 的单一资产，对 GitOps（Argo CD / Config Sync / kustomize）最友好：

```bash
# 把 vX.Y.Z 替换为 releases 页面里的具体版本号（例如 v0.1.0）
export VERSION="v0.1.0"
kubectl apply -f https://github.com/kubernetes-sigs/agent-sandbox/releases/download/${VERSION}/sandbox-with-extensions.yaml
```

也可以分开装：

```bash
# 仅核心
kubectl apply -f https://github.com/kubernetes-sigs/agent-sandbox/releases/download/${VERSION}/sandbox.yaml
# 扩展（可选）
kubectl apply -f https://github.com/kubernetes-sigs/agent-sandbox/releases/download/${VERSION}/extensions.yaml
```

### 2.4 编程接口

需要程序化管理时，官方提供 SDK：

```bash
# Go SDK
go get sigs.k8s.io/agent-sandbox/clients/go/sandbox@latest
```

> 注意：Go SDK 当前从仓库根 Go module 发布，因此仓库的 release tag（如 `v0.1.0`）**同时就是 Go SDK 的版本号**。此外还有 Python SDK 可用。

## 三、隔离层选型：gVisor 还是 Kata

这是落地时最关键的决策，而且**选错了很难改**——所以 Agent Sandbox 把它设计成模板级字段。

### 3.1 两者的本质差异

| | gVisor | Kata Containers |
|---|--------|-----------------|
| 隔离机制 | **用户态应用内核**，拦截系统调用而非直通宿主内核 | **轻量 VM**，独立内核 + 硬件强制边界 |
| 需要 KVM | ❌ 不需要 | ✅ 需要 |
| 启动开销 | 约 **+150 ms** | **150–500 ms** 启动 |
| 资源模型 | 更接近进程模型 | 硬件虚拟化模型 |
| 强项 | CPU-only 的编码 Agent | **互相不可信的租户**、需要 **GPU**（VFIO 直通） |

两者安全架构不同，但方向一致：**普通容器隔离不再被自动视为自主代码的最终边界**——负载被放到另一个内核或硬件强制的 VM 屏障之后。

### 3.2 默认选择建议

| 场景 | 默认选择 | 换另一个的理由 |
|------|----------|----------------|
| 控制器 | **上游 Sandbox 控制器**：一个 CR 顶掉 StatefulSet + PVC + headless Service + 挂起恢复胶水 | 只有当今天就需要**每个 Agent 多容器 sidecar** 时手写——Sandbox 目前是单容器原语 |
| 隔离 | **CPU-only 编码 Agent → gVisor**：不需要 KVM，约 +150ms 启动，系统调用过滤 | **租户互不可信** 或 **需要 GPU** → Kata（硬件边界 + VFIO 直通，代价是 KVM 与 150–500ms 启动） |
| 预热池规模 | **按并发会话的 p95 设池**，其余休眠到 PVC 支撑的零 | 只有 Agent 能接受每次恢复 5–30 秒冷启动时才完全缩零 |

### 3.3 带 RuntimeClass 的模板示例

```yaml
apiVersion: extensions.agents.x-k8s.io/v1alpha1
kind: SandboxTemplate
metadata:
  name: coding-agent-gvisor
  namespace: agents
spec:
  # 隔离策略就在模板里 —— 换隔离 = 换模板字段，不是重建集群
  podTemplate:
    spec:
      runtimeClassName: gvisor          # 或 kata-qemu / kata-clh
      serviceAccountName: coding-agent  # 最小权限 SA，绝不是 cluster-admin
      containers:
        - name: agent
          image: ghcr.io/example/coding-agent:1.2.0
          resources:
            requests: { cpu: "500m", memory: "1Gi" }
            limits:   { cpu: "2",    memory: "4Gi" }
          volumeMounts:
            - name: workspace
              mountPath: /workspace
      volumes:
        - name: workspace
          persistentVolumeClaim:
            claimName: agent-workspace
```

> 字段名以你所用版本的官方 CRD 为准——Agent Sandbox 仍处于快速迭代期，`v1alpha1` / `v1beta1` 之间的字段可能调整。**上线前先用 `kubectl explain` 校验一遍。**

### 3.4 预热池与领取

```yaml
apiVersion: extensions.agents.x-k8s.io/v1alpha1
kind: SandboxWarmPool
metadata:
  name: coding-agent-warm
  namespace: agents
spec:
  replicas: 5                 # 按并发 p95 设，不是按峰值设
  templateRef:
    name: coding-agent-gvisor
---
apiVersion: extensions.agents.x-k8s.io/v1alpha1
kind: SandboxClaim
metadata:
  name: session-8f2c1a
  namespace: agents
spec:
  templateRef:
    name: coding-agent-gvisor
```

领取流程：`SandboxClaim` 从 `SandboxWarmPool` 里**收养**一个已运行的 Sandbox（命中则毫秒级可用），池子见底时控制器再补新的。这就是把"冷启动几十秒"变成"毫秒级领取"的关键。

## 四、生命周期：暂停即缩零，恢复保状态

Agent 的工作模式有个鲜明特征：**在工具调用之间几乎全是空闲**。传统模型里，这种"长期存在但大部分时间没事干"的负载最难安排——你不能删它（状态会丢），也不能一直养着（纯烧钱）。

Sandbox 用两个生命周期特性解决：

1. **空闲缩零**：`suspend` 让 Pod 直接消失，但 **PVC 保留工作区**；`resume` 把它拉回来，**状态完好**。空闲的 Agent 一旦安静下来就立刻停止消耗 CPU 和内存。
2. **定时删除**：会话结束按计划清理沙箱，不用自己写 operator 做 GC。

对比一下**引入前**手写方案要维护的东西：

```
手写方案（一个持久 Agent 环境）：
  StatefulSet（稳定 hostname、单副本）
+ PersistentVolumeClaim template（工作区存活）
+ headless Service（稳定网络身份）
+ NetworkPolicy（防止"吵闹邻居"外泄）
+ ⚠️ 没人演示的那部分：suspend/resume 机制
  （通常是 cronjob 或 operator 在空闲超时后缩零、按需拉起，
   外加"记住哪个 PVC 属于哪个 Agent"的簿记）

引入 Sandbox 后：
  Sandbox 控制器把 StatefulSet、PVC 接线、身份、挂起/恢复循环
  全部吸收进一个被 reconcile 的对象里。
```

**但有一半工作它不会替你扛**，这部分才是你自己的 runbook：

- 镜像拉取耗时（取决于你的 registry 本地化程度）；
- `NetworkPolicy` 仍需按租户等级自己写；
- 每租户的 CPU/RAM 配额仍在你自己定义的 `ResourceQuota` 里；
- "哪个租户可以领取哪个模板"的准入控制，仍是你的策略代理要执行的。

**一句话：采纳控制器是为了删掉生命周期胶水，不是删掉平台思考。**

## 五、配套控制：沙箱只是第一层

一个更硬的边界是必要的，但**不充分**。Anthropic 在审查了 **141,006 次网络安全评测运行**后发现，其中 3 次 Claude 模型获得了对真实系统的未授权访问——原因是与第三方评测伙伴的一次误解，留下了非预期的互联网访问。**边界之外还有身份、凭据、网络与可观测性。**

按重要性叠加，而不是二选一：

| 控制项 | 做法 | 为什么 |
|--------|------|--------|
| **内核级沙箱** | 只要 Agent 能生成或执行代码，就跑在 gVisor/Kata RuntimeClass | 隔离的是**系统调用面**，不只是容器文件系统 |
| **最小权限 SA** | 每个 Agent 一个只覆盖所需 namespace 与资源的 ServiceAccount | 默认 cluster-admin 是最常见的自毁操作 |
| **凭据隔离** | 用 sidecar 代理（Envoy 常见）注入 provider 凭据，Agent 进程看不到原始 API Key | 提示注入读不到密钥 |
| **网络策略** | `NetworkPolicy` + mTLS（如 Istio Ambient），**egress 默认拒绝**，只白名单模型端点与内部 API | 五分钟的改动，能拦住绝大多数凭据外泄尝试 |
| **可观测性** | OpenTelemetry 打底，Agent 与非 Agent 服务同等待遇 | 出事要能追溯 |

**egress 默认拒绝 + 白名单**这条尤其值得强调：它把"Agent 被攻陷"的爆炸半径从"整个内网"压缩到"它能调的那几个端点"。这也是 OWASP 在 LLM Top 10 里新增的 **"智能体工具交互操纵"（Agent Tool Interaction Manipulation）** 条目的核心防御建议——**在锁定环境中运行 Agent，对其可做的事做细粒度权限控制**。

### 5.1 规模化的两个成本杠杆

- **预热池 + 快照**：据 Google Cloud 自家基准测试，把预热沙箱与 **GKE Pod Snapshots** 配合，可把冷启动延迟降低约 **90%**，把"多分钟恢复"变成"亚秒级"（CPU 与 GPU 负载都适用）。
- **调度与扩缩**：GPU 推理用 **Kueue** 做排队与公平分配，节点供应交给 Karpenter 或 Cluster Autoscaler；推理负载用 Deployment + Service 配 **KEDA / HPA**（按队列深度或并发会话数扩，而不是按裸 CPU），**不要用 DaemonSet**——DaemonSet 无法把副本数与节点数解耦。

## 六、上线前清单

在写第一个 manifest 之前，先把集群地基铺好——**跳过这步是 Agent 部署卡在 staging 的最常见原因**：

1. **命名空间与配额**：独立 namespace + `ResourceQuota`；
2. **密钥后端**：KMS 支撑的加密 Secrets，**不要明文 etcd**；
3. **节点池**：需要 GPU 就准备好带 GPU 标签的节点池；
4. **GitOps**：Argo CD 或 Flux 盯着仓库；
5. **模板**：`SandboxTemplate` 里显式写明镜像、资源请求（CPU/内存/GPU limits）、`runtimeClassName`；
6. **网络**：ClusterIP Service 提供稳定路由；`NetworkPolicy` egress 默认拒绝；
7. **存储**：只有当 Agent 需要本地持久 scratch 空间时才加 PVC；
8. **探针**：`startupProbe` 的 `failureThreshold` 要够覆盖模型加载；`readinessProbe` 打轻量健康端点；
9. **缩零策略**：先定义空闲缩零规则，再谈自动扩缩；
10. **灰度**：canary 上线，先看 Prometheus 的延迟与错误率，再切全量流量。

## 七、小结

Agent Sandbox 的意义，不在于它引入了多么新的技术——gVisor、Kata、microVM 都早就在了。它的意义是**把"沙箱"从一个运行时实现细节，提升为 Kubernetes 的一等工作负载抽象**。

对平台团队，判断标准很简单：

- **要不要沙箱**：只要 Agent 能执行模型生成的代码，答案是"要"，这不是选择题；
- **选哪个控制器**：默认上游 Sandbox 控制器，除非你今天就需要多容器 sidecar；
- **选哪个隔离**：CPU-only → gVisor；互不可信租户或有 GPU → Kata；
- **池子开多大**：按并发 p95 设预热池，其余休眠到零。

最后一句话值得记住：**容器把应用打包抬到了虚拟化之上，Agent 又把虚拟化层拉回了视野中心——因为底层边界的强度，重新变成了战略问题。**

## 参考资料

- [kubernetes-sigs/agent-sandbox（官方仓库与 README）](https://github.com/kubernetes-sigs/agent-sandbox)
- [Agent Sandbox 官方网站与文档](https://agent-sandbox.sigs.k8s.io/)
- [Cloud Native Now: Containers Became the Unit of Speed. AI Agents Are Making VMs the Unit of Trust](https://cloudnativenow.com/features/containers-became-the-unit-of-speed-ai-agents-are-making-vms-the-unit-of-trust)
- [Your Coding Agent Needs a Sandbox, Not a StatefulSet: gVisor vs Kata Under Kubernetes' New Sandbox Controller](https://bex.co/blog/2026/09/04/kubernetes-agent-sandbox-gvisor-kata)
- [Cut AI Agent Cold Starts Up to 90% with Agent Sandbox on Kubernetes](https://www.agent-swarm.dev/blog/kubernetes-for-ai-agents)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)（Agent Tool Interaction Manipulation 条目）

---

**相关阅读**

- [从容器编排到智能体编排：Kagent CRD 让 Agent 成为云原生一等公民](/devops/container-to-agent-orchestration-kagent-crd-go-2026)
- [Docker AI Governance 实战：让 AI Agent 在沙箱里自由探索](/devops/docker-ai-governance-agent-isolation-2026)
- [Kubernetes 1.37 深度预览：HPA 原生缩零、IPVS 退场倒计时、DRA 设备污点毕业](/devops/kubernetes-1-37-deep-preview-hpa-scale-to-zero-ipvs-deprecation-dra-2026)
