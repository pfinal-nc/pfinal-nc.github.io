---
title: "Sextant：一个 100% 由 AI 生成的 Kubernetes 客户端，如何一周做到比 Lens 快 4–7 倍、省一半内存"
date: 2026-10-19 10:30:00
tags:
  - ai
  - kubernetes
  - rust
  - tauri
  - mcp
keywords:
  - Sextant
  - Kubernetes 客户端
  - Lens
  - Freelens
  - Rust
  - Tauri 2
  - kube-rs
  - MCP
  - Claude Code
  - AI 生成代码
  - Tauri Channel
  - ADR
category: ai
description: "2026 年 10 月，REES46 的 CTO 用 Claude Code 让 AI 写出了一个完整的 Kubernetes 桌面客户端 Sextant：约 16.5 万行 Rust + TypeScript，一周 184 次提交、10 个版本。本文拆解它的三层架构、Tauri 性能调优、29 工具的 MCP 安全模型，以及它为什么能比 Lens 快 4–7 倍、省一半内存，还诚实列出哪里没赢。"
author: PFinal南丞
recommend: AI工程
---

# Sextant：一个 100% 由 AI 生成的 Kubernetes 客户端，如何一周做到比 Lens 快 4–7 倍、省一半内存

2026 年 10 月 18 日，REES46 的 CTO **Yuri Potemkin** 在 Habr 发了一篇不太一样的"项目介绍"：他的 **Sextant**——一个用 Rust + Tauri 2 写的 Kubernetes 桌面客户端——**第一行代码都不是人写的**。约 **16.5 万行** Rust 与 TypeScript（含测试），全部由 **Claude Code** 生成。

更夸张的是节奏：**第一个 commit 是 2026 年 10 月 11 日，0.10 版本 10 月 18 日发布**——一周之内，184 次提交、10 个发布。

而它要解决的问题很具体：作者用了很多年 Lens，然后受够了——**Electron 的内存、专有化、以及"给 AI agent 一把管理员 kubeconfig"的安全隐患**。

本文不复述营销话术，而是把这篇 Habr 里真正的工程内容拆开：三层架构、Tauri 性能调优、MCP 安全模型，以及那张把 Lens 按在地上摩擦的实测表——包括**它自己承认没赢的地方**。

---

## 一、先看结果：一周、184 次提交、10 个版本

| 维度 | 数据 |
|------|------|
| 首 commit | 2026-10-11 |
| 0.10 发布 | 2026-10-18（一周内） |
| 提交数 / 发布数 | 184 commits / 10 releases |
| 代码量 | 约 165,000 行（Rust + TypeScript，含测试） |
| 作者 | Yuri Potemkin（REES46 CTO，25 年 IT） |
| 许可证 | MIT 或 Apache-2.0 |
| 平台 | Linux / macOS / Windows |
| 归属 | `FriendsOfKubernetes/sextant`（非 Lens / Freelens 官方） |

作者很克制地强调了两点：**Sextant 永久免费**（无付费档、无账号、无 pro 功能）；**全部代码由 AI 生成**，但人是"产品负责人"——**提需求、做架构决策、做评审**。

---

## 二、为什么"给 AI agent 连生产集群"是个真问题

在聊架构之前，先聊动机，因为它决定了 Sextant 的形态。

作者想要三件事同时成立：

1. **原生应用、不要 Electron**——在十几个集群上不把内存吃干；
2. **无账号、无遥测**——kubeconfig 永远留在本机；
3. **一种安全的方式，把集群交给 AI agent**（Claude Code、Cursor）——**按集群授权、每次变更都要确认、并且留审计日志**，而不是把管理员 kubeconfig 塞进 agent 的沙箱里。

第三点最要命。作者一句话点破了行业现状：

> 通常的做法是把 `kubectl` 和你的 kubeconfig 一起交给 agent——这意味着**它能做你能做的一切，而你往往是事后才知道**。

Sextant 的答案是：**agent 拿到的不是 kubeconfig，而是 29 个受管控的工具**，每一次调用都要过"权限规则 → 窗口确认 → 审计日志"三道关。这条设计主线，后面会展开。

---

## 三、架构：三层，Rust 干活，React 只负责画

Sextant 的架构分层非常清晰，也解释了为什么它能又快又稳：

```text
┌──────────────────────────────────────────────────────┐
│  第 3 层：React + TypeScript (UI)                      │
│  - features 自动注册（src/features/<name>/index.ts）   │
│  - 类型经 ts-rs 从 Rust 生成；CI 检查是否漂移           │
└───────────────▲──────────────────────┬────────────────┘
                │ Tauri commands       │ Tauri Channel / IPC
┌───────────────┴──────────────────────▼────────────────┐
│  第 2 层：Tauri 层                                     │
│  - commands / AppState / PTY（终端）/ MCP server       │
│  - 订阅·流·会话统一登记在 AppState，关窗即全关          │
└───────────────▲──────────────────────┬────────────────┘
                │                       │
┌───────────────┴──────────────────────▼────────────────┐
│  第 1 层：sextant-core（不依赖 Tauri 的库）            │
│  - kube-rs：kubeconfig / discovery / watch / 动作      │
│  - logs / exec / port-forward / metrics / Helm         │
│  - 外部进程(helm, aws/gcloud/az) 藏在 feature=desktop  │
└──────────────────────────────────────────────────────┘
        扩展(iframe) 与 AI agent  →  统一 Guard
        （权限校验 + 确认对话框 + 审计日志）
```

关键点：

- **核心与 Tauri 解耦**：`sextant-core` 是一个**独立的库**，CI 里有专门的脚本检查它"没有依赖 Tauri"。这意味着未来可以在同一套引擎上长出一个 TUI 或 CLI。
- **权威状态在 Rust**：所有集群数据、Secret、权限检查都在 Rust 侧，**不受 Web 层发生什么影响**。React 只是渲染层。
- **统一守卫（Guard）**：UI 通过 Tauri command 进核心；而**扩展和 AI agent 只能走同一个 Guard**——权限校验、确认、日志三件事在这一个地方发生。这是"没有别的入口"的设计。

---

## 四、性能：三个真实工程决策

Sextant 快，不是因为"Rust 语言天生快"这种空话，而是几个具体的、能指到代码的决策。

### 4.1 用 Tauri Channel，而不是 Event

这是最有意思的一条。作者的观察是：

> Tauri 的 event 是**通过执行脚本、内嵌 JSON** 来投递的。当成百上千个 pod 的数据**成批**送达时，WebKit 会把它**当成代码去解析**。

也就是说，批量数据走 event 会让 WebView 做一件很蠢的事。Sextant 改用 **Tauri `Channel`**：流 id 由前端选定，**在流启动前就为它创建好通道**，所以首帧不丢；大消息走 **IPC 并以 JSON 解析**。

效果：配合**限制分配器 arena**，500 个 pod 时的内存增长**减少了约五分之一**。另外：第一个 watch 快照立即下发，之后变更**最多每 250ms 批量一次**，日志**每 100ms 一次**。

### 4.2 每个集群只做一次 discovery

所有等待"资源类型列表"的调用，共享**同一个** discovery 结果。内置类型**完全不走 discovery**，CRD 的列则**按单个 CRD 懒加载**。CI 里有一条硬性测试：在 **150 个 CRD + 500 个 pod** 的夹具上，**首批数据必须在 2 秒内到达**。

### 4.3 写操作绝不重试

这条是分布式系统里的常识，但很多客户端做错了：

- 只对**读**操作在 `429 / 503 / 504` 时自动重试（最多 3 次、不超 5 秒）；
- **scale、delete、apply 永不发送两次**——理由很清醒：**写操作超时并不会让服务器端取消它**，与其盲目重放，不如如实报错。

（如果你在做后端，这里其实和 [幂等性](/dev/backend/database/postgresql-17-pgvector-rag-2026) 是同一类问题——"提交了但没收到确认"的窗口无法靠重试消除。）

---

## 五、数字：Sextant vs Freelens vs Lens

官方实测条件：**Linux，16 核，27 GB 内存，一个 kind 集群**，每个应用单独 profile，窗口 1280×800，未使用 swap，三个应用都打开"所有命名空间的 pod 列表"。

| 指标 | Sextant 0.11.1 | Freelens 1.10.3 | Lens 2026.10 |
|------|---------------|-----------------|--------------|
| 启动到出现窗口 (s) | **0.6–0.7** | 3.4–4.7 | 2.4 |
| 内存：44 个 pod (MB) | **326** | 649 | 862 |
| 内存：544 pod + 150 CRD (MB) | **376** | 672 | 877 |

说明：内存是**所有进程的 PSS 之和**——Sextant 是 Rust 核心 + WebKit 进程，Freelens/Lens 是 Electron 进程。启动是"热启动到窗口出现"。

换成一句话：**启动快 4–7 倍，内存约为一半**（社区总结的原话也正是"4–7 倍"和"大约一半"）。

**但作者主动交代了没赢的地方**——这点非常值得尊重：

| 场景 | Sextant | Freelens | Lens |
|------|---------|----------|------|
| 500 个 pod 时的内存**增量** | +50 MB | +23 MB | +15 MB |

也就是**规模一上来，Sextant 反而涨得最多**。0.11.1 已经把这一增长压掉了约 1/5（0.11.0 时是 +63 MB），手段正是 4.1 里的 Channel + glibc 双子 arena。这个问题**公开挂在 issue #170 里**，没有藏。

---

## 六、MCP 服务器：29 个工具，四道防线

这是整篇文章最有参考价值的部分。Sextant 内置一个 MCP server，让 Claude Code / Claude Desktop / Cursor 能直接操作集群。

### 6.1 接入方式

Claude Code 一条命令（可从 Sextant 设置里复制）：

```sh
claude mcp add --transport http sextant http://127.0.0.1:47391/mcp \
  --header "Authorization: Bearer <token>"
```

Claude Desktop 走 stdio 桥 `sextant mcp`——**它自己去读端口和 token**，所以配置文件里根本不出现 token。

### 6.2 防护设计（这才是重点）

```text
agent 调用 tool
    │
    ▼
① 规则层：命名空间 × 资源种类 × 动作（读/改/删/日志/exec/port-forward）
    │         + "运行前是否询问"；未知字段一律视为 Off
    ▼
② 前置校验：不是"调用开始时"校验，而是"每个副作用之前"用最新配置校验
    │         多对象工具 → 第一个请求前先把所有对象校验完
    ▼
③ 窗口确认：显示 agent / 集群 / 动作 / 目标 / 细节
    │         120 秒无响应 = 拒绝；没有窗口 = 拒绝
    ▼
④ 审计日志：最近 2000 次调用（谁、什么、哪里、决定、结果）
              只记摘要，绝不记 Secret 值 / YAML / 命令输出
```

几个细节能看出作者的认真：

- **默认全关**：服务器不开启就不运行；每个集群初始为 `Off`，要手动选 `Read-only` / `Read + write(无删除)` / `Full` / `Custom`。
- **命名空间骗不了**：对**集群级资源**，命名空间**永远按空处理**——否则一条"team-a × 所有类型 × Delete"的规则就能删掉 Node。
- **apply 不做二次解析**：权限校验用的是**同一份已解析的 YAML**，即真正会被 apply 的那份——**不存在"用第二遍解析绕过检查"**的可能。
- **网络层**：只监听 `127.0.0.1`；带 `Origin` 头、`Host` 不匹配、Bearer 错误、或 body > 4 MB 的请求，在**进入 MCP 层之前**就被拒——防的是浏览器发起的请求和 **DNS rebinding**。token 存于 `0600` 文件，绝不写日志。
- **agent 完全碰不了的**：节点 shell、exec 与修改 `node-shell` 服务 pod、对 `hostNetwork` pod 的 port-forward。关服务器时，所有调用取消、agent 开的端口全部关闭。

一句话总结这套设计的目标：**agent 可以自己看日志、看事件、诊断挂掉的 deployment，但"重启"还是"扩容"的最终决定，交给人。**

---

## 七、100% AI 代码，为什么这次"看起来靠谱"

"AI 写的项目"很多，但 Sextant 展示了一套**可复现的工程流程**，而不是"让模型随便写"：

| 角色 | 职责 |
|------|------|
| 人 | 提需求、做架构决策、评审、决定发什么版 |
| 模型（Claude Code） | 写代码与测试、维护文档、跑检查、修自己弄坏的东西 |
| **项目记忆** | **一份给 agent 读的约定文件 + 78 份 ADR（架构决策记录）** |

关键在最后一行：**新会话不是从零开始，而是从"决策历史"开始**。这解决了 AI 编码最大的痛点——上下文丢失。ADR 把"为什么这么设计"结构化地留给下一个 agent session。

而信任来自测试量（0.11.1 版本）：

| 测试类型 | 数量/说明 |
|----------|-----------|
| Rust 单元测试 | 990（核心用**假 API server**，不依赖真集群） |
| vitest | 1630 |
| SDK 测试 | 226 |
| 集成测试 | 对**真实 kind 集群**（带 Prometheus / Flux / Argo CD） |
| E2E | WebdriverIO + tauri-driver 跑**真应用**（连接、日志、shell、port-forward、YAML 编辑、scale、Helm） |
| CI | Linux / macOS / Windows 三平台；**三平台全绿才发布**；更新包有签名 |

总数超过 2800。作者的态度也很实：

> 错误会发生——但它们是被**同一个流程**发现的：下一节里的内存问题，是**测量**发现的，不是用户发现的。

---

## 八、诚实的边界：还没做好的地方

一篇好的技术文，就看它敢不敢列"缺点"。Sextant 这篇列了：

- **大集群下内存增量偏高**（见第五节，issue #170 公开中）；
- **安装包尚未签名**（无 Apple / Microsoft 证书），macOS / Windows 首启会警告；
- **WebKit 在峰值负载后不把内存还给系统**——已知且公开；
- 路线图（`0.12`→`0.15`）里还有一堆：问题时间线、HPA/KEDA/Karpenter 自动扩缩、集群卫生、网络连通性检查、保存视图与工作区、kubeconfig 管理、基于集群 schema 的 YAML 编辑器、Velero、OpenCost 成本、service mesh、跨集群对象对比。

一个重要提醒：**Sextant 与 Mirantis Lens、Freelens 无任何官方关系**。它继承的是 Lens 曾经的"开源日常工具"定位，但底层是全新的 Rust 栈。

---

## 九、小结：这篇 Habr 真正的信息量在哪

抛开"AI 写代码"的噱头，Sextant 值得工程师记住的是三件事：

1. **性能来自具体决策，不是语言标签**。Tauri Channel 替代 Event、单次 discovery、写操作不重试——每一条都能指到代码，也都能迁移到别的前端/客户端项目。
2. **"把 AI 放进生产"必须靠架构约束，而不是靠提示词**。29 个工具、按集群的四档权限、副作用前校验、命名空间不可伪造、120 秒确认超时——这是**安全工程**，不是 prompt 技巧。
3. **AI 生成大项目的前提，是"决策留痕"**。78 份 ADR + 给 agent 读的约定文件，让"新会话"接得上历史。这可能是比"模型多强"更可复制的经验。

想深入的话：Sextant 的 [GitHub 仓库](https://github.com/FriendsOfKubernetes/sextant) 与 [wiki](https://github.com/FriendsOfKubernetes/sextant/wiki) 都开着，MCP 安全模型和扩展 SDK 有完整文档。它和站内讨论过的 [MCP 2026 路线图](/ai/mcp-2026-roadmap-deep-dive)、[Rust 接管 Agent 基础设施](/ai/rust-eating-agent-infrastructure-2026) 是同一条技术脉络——而它对 Gateway API 的支持，也能和 [Cilium 1.20 的 Gateway API 实战](/cloud-native/cilium-1-20-gateway-api-tcp-udp-route-eni-ipv6-2026) 对照着看。

---

## 参考资料

- [Замена Lens, которую целиком написала модель — Yuri Potemkin, Habr（2026-10-18）](https://habr.com/ru/articles/1095984/)
- [FriendsOfKubernetes/sextant — GitHub](https://github.com/FriendsOfKubernetes/sextant)
- [kube-rs：Rust 的 Kubernetes 客户端](https://kube.rs)
- [Tauri 2 官方文档](https://tauri.app)
- [Lens Pro 订阅模型的官方说明 — Mirantis Blog](https://www.mirantis.com/blog/lens-pro-vision-for-the-future-new-subscription-model-new-features-available/)
- [Model Context Protocol 规范](https://modelcontextprotocol.io)
- 站内相关：[MCP 2026 路线图深度解析](/ai/mcp-2026-roadmap-deep-dive)、[Rust 正在接管 Agent 基础设施](/ai/rust-eating-agent-infrastructure-2026)
