---
title: "Karmada 从 CNCF 毕业：多集群编排走向 AI 算力调度，v1.19 直击 GPU 训练痛点"
date: 2026-09-16
tags:
  - karmada
  - kubernetes
  - 多集群
  - cloud-native
  - AI 基础设施
keywords:
  - Karmada 毕业
  - CNCF Graduated
  - 多集群编排
  - AI 训练调度
  - DRA GPU
category: devops
description: "9 月 8 日 KubeCon China 2026 现场官宣：Karmada 正式从 CNCF 毕业，成为毕业级多云容器编排引擎。v1.19 同步发布：分布式 AI 训练多组件调度 + 基于优先级的调度 Beta 默认开启。1,214 名贡献者、292 家组织，Bloomberg/Trip.com/阿里云/华为等生产用户。附毕业条件、v1.19 特性与 2026 路线图。"
recommend: 云原生
---
# Karmada 从 CNCF 毕业：多集群编排走向 AI 算力调度，v1.19 直击 GPU 训练痛点

> TL;DR：9 月 8 日，KubeCon + CloudNativeCon + OpenInfra Summit + PyTorch Conference China 2026 上海现场，CNCF 正式宣布 **Karmada 毕业（Graduated）**。从 2021 年 9 月进入 Sandbox、2023 年 12 月晋升 Incubating 到今天毕业，这个华为云联合多行业头部企业发起的多集群编排项目走完了 CNCF 成熟度体系主要阶段。同步发布的 **v1.19** 把重心押向 AI：分布式 AI 训练任务的**多组件调度**、基于优先级的调度升到 **Beta 默认开启**。1,214 名贡献者、292 家组织、5,600+ Star，生产用户横跨 Bloomberg、Trip.com、阿里云、华为、B 站、快手、商汤、vivo 等。

## 一、毕业意味着什么：不只是里程碑

CNCF 毕业不是"星够多就行"。Karmada 为此完成了毕业的全部硬性条件：

- **第三方安全审计**通过
- 正式成立 steering committee（指导委员会）
- 采用 CNCF Code of Conduct
- 维护 CII（Core Infrastructure Initiative）Best Practices Badge

CNCF CTO Chris Aniszczyk 的评价：毕业证明项目"达成了企业部署所需的技术成熟度、治理和安全工作"——尤其当组织把 Kubernetes 扩展到 GPU 受限的 AI 环境时。

对企业用户的实际含义：**可以放心把它放进合规审计的生产架构里**，而不用担心"沙箱项目哪天弃坑"的治理风险。

## 二、项目画像：Kubernetes Armada 的五年

Karmada（Kubernetes Armada）解决的是 Kubernetes 从单集群扩展到多集群、多云、多区域之后的编排问题：在**不要求应用修改原有 K8s 资源定义**的前提下，提供集中部署、资源分发、故障转移、多集群自动伸缩。企业可以把散在不同数据中心、公有云、地域的集群组成统一资源池，在上层做调度和资源管理。

关键数据：

| 维度 | 数据 |
|------|------|
| 首次提交 | 2020 年 11 月 |
| 加入 CNCF Sandbox | 2021 年 9 月 |
| 晋升 Incubating | 2023 年 12 月 |
| 毕业 | 2026 年 9 月 8 日 |
| 贡献者 | 1,214+ 名，来自 292 家组织 |
| GitHub Stars | 5,600+ |
| 控制平面 | 自带 etcd 实例，全组件导出 Prometheus 指标，提供 Helm Chart |

生产用户名单能看出它的定位：**Bloomberg**（流媒体平台工程负责人 Michas Szacillo：自动化灾难恢复、简化集群管理）、**Trip.com**（Honghui Yue：多集群统一资源池、跨集群弹性与故障转移、大规模工作负载迁移）、**DaoCloud**（首席架构师 Kay Yan：把 Karmada 扩展进 AI Token Factory 架构，支撑跨数据中心多集群推理）。国内用户覆盖阿里云、华为、B 站、科大讯飞、京东云、快手、RedNote、商汤、vivo、WPS、中通。

## 三、v1.19：为 AI 训练而生的调度能力

毕业与 v1.19 同步发布，两个核心特性都指向同一个场景——**GPU 受限环境下的分布式 AI 训练**：

### 3.1 多组件调度（Multi-component Scheduling）

分布式训练任务不是单个 Pod，而是一组必须协同放置的组件（driver + workers + 参数服务器等）。多组件调度让 Karmada 把 AI 训练任务作为整体进行跨集群协调放置，避免"8 个 worker 分散到 6 个集群、带宽打不满、训练实际跑不动"的经典失败模式。

### 3.2 基于优先级的调度（Beta，默认开启）

GPU 等稀缺资源竞争激烈时，平台按任务优先级决定谁先拿到资源——关键训练任务优先放置，保障 SLO。**默认开启**意味着升级即生效，不需要额外配置。

这两个能力与 [Kubernetes 1.37 的调度演进](/devops/kubernetes-1-37-release-highlights-2026)方向完全一致：K8s 本体在推 workload-aware scheduling 和 DRA（Dynamic Resource Allocation），Karmada 把同样的思路抬到多集群层。

## 四、2026 路线图：从"工作负载分发"到"资源感知控制平面"

社区给 Karmada 的下一步定位很清晰——从基础的多集群工作负载传播，走向**资源感知的多集群控制平面**：

1. **基于优先级的抢占（priority-based preemption）**：低优先级任务为高优先级任务让路，且是跨集群粒度
2. **多集群排队（multi-cluster queuing）**：面向 AI 训练和批处理任务的队列管理
3. **多集群 DRA 支持**：跨集群、跨加速器（GPU）的 Dynamic Resource Allocation——这是把 K8s 1.36/1.37 的 DRA 生态延伸到 fleet 级别

华为云研发总裁王洪利在毕业现场表态的落点也是这里：面向 Agent 场景解决"跨云大规模通智融合算力调度"，把多云多集群管理做成 AI 时代的算力底座。

## 五、给你的选型建议

什么场景值得认真评估 Karmada：

- **混合云/多云容量扩展**：把多个云的集群当统一资源池用，应用零改动
- **多区域容灾**：跨地域的故障转移与流量调度是内置策略（Active-active、Remote DR、Geo Redundant）
- **AI 训练/推理基础设施**：GPU 资源散在多区域多云，需要 fleet 级调度和排队

什么场景不需要：单集群或 2-3 个同构集群用原生 K8s + 简单脚本就够的场景，引入多集群控制平面是负资产。编排层的复杂度永远要和集群数量、异构程度成正比——先有真实的跨集群痛点，再上 Karmada。

对云原生基础设施团队，这个毕业事件还有一个信号意义：**CNCF 正式把"多集群 + AI 算力调度"盖章为毕业级成熟赛道**，和 [Cilium 1.20](/cloud-native/cilium-1-20-gateway-api-tcp-udp-route-eni-ipv6-2026) 代表的网络演进、K8s 1.37 的 DRA 一起，2026 年云原生的主线叙事已经完全转向 AI Infra。

## 六、参考

- CNCF 官方毕业公告（KubeCon + CloudNativeCon + OpenInfra Summit + PyTorch Conference China 2026，2026-09-08）
- Karmada 官网：karmada.io
- InfoQ《Karmada 正式从 CNCF 毕业，已用于多集群 AI 训练与 GPU 调度》
