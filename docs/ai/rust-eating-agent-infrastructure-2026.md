---
title: "Rust 正在接管 Agent 基础设施：从 Codex CLI 到 Kitesurf 的 substrate shift"
date: 2026-09-23 10:30:00
tags:
  - ai
  - agent
  - rust
  - infrastructure
  - performance
keywords:
  - Rust
  - AI Agent
  - Codex CLI
  - Cloudflare Kitesurf
  - Vercel agent-browser
  - Zerostack
  - Microsoft Tier-1 Rust
  - Agent Runtime
  - 内存安全
  - 沙箱
category: ai
description: "2026 年，Microsoft、OpenAI、Cloudflare、Vercel 不约而同把 Agent 基础设施押注在 Rust 上。本文解析这一 substrate shift 背后的技术原因：内存压力、沙箱安全、供应链攻击面，以及 Agent 协议栈三层中 Rust 正在接管 runtime infrastructure 层的具体证据。"
author: PFinal南丞
recommend: AI工程
---

# Rust 正在接管 Agent 基础设施：从 Codex CLI 到 Kitesurf 的 substrate shift

2026 年，AI Agent 的竞争已经从 "哪个模型更聪明" 下沉到 "哪个 runtime 能撑得住 Agent 的大规模执行"。一个越来越明显的信号是：**Agent 基础设施的底层正在被 Rust 重写**。

- **Microsoft** 把 Rust 提升为 Tier-1 语言，与 C++、C# 并列，用于新项目；
- **OpenAI** 把 Codex CLI 从 TypeScript/Node.js 重写成 Rust，冷启动从数秒降到约 180ms；
- **Cloudflare** 从头用 Rust + WebAssembly 写了面向 Agent 的浏览器引擎 **Kitesurf**；
- **Vercel** 发布了 Rust 核心的 **agent-browser**，数周内获得 26,000+ stars。

四家公司、四个产品、没有互相协调，却做出了同一种技术选择。这不是 "rewrite it in Rust" 的梗，而是一种 **substrate shift**——当 Agent workload 对沙箱、runtime、CLI 工具的性能 floor 提出要求时，解释型语言开始hold不住。

---

## 一、数字：Rust AI Agent 仓库的爆发

根据 OSS Insight 的分析，Rust AI agent 相关仓库的受欢迎程度在 2026 年出现跃升：

| 时间段 | 平均 stars/天 |
|--------|--------------|
| 2023–2024  cohort | 25 |
| 2026  wave | 404 |
| 增长倍数 | ~16x |

2026 年涌现的部分项目：

| 项目 | Stars | Stars/天 | 定位 |
|------|-------|---------|------|
| Zeroclaw | ~29,000 | 597 | Agent framework |
| Vercel agent-browser | ~26,000 | 321 | 浏览器自动化 CLI |
| Google Workspace CLI | ~23,000 | 738 | Workspace agent 工具 |
| LLMfit | ~20,000 | 444 | 模型集成 |
| OpenFANG | ~16,000 | 425 | Agent 编排 |
| IronClaw | ~11,000 | 192 | Agent runtime |

更重要的是 fork 比例：Zeroclaw 14.2%、OpenFANG 12.5%、IronClaw 11.4%。高 fork 比说明这些项目不只是 "收藏即学会"，而是有真实团队在上面构建生产系统。

---

## 二、Agent 协议栈的三层：Rust 没有吃掉全部

Rust 不是万能药。Agent 协议栈大致可以分为三层，Rust 的渗透程度并不相同：

```text
┌─────────────────────────────────────┐
│  Layer 3: Orchestration Logic       │  ← Python / TypeScript 仍是主流
│  模型路由、提示工程、状态机、工作流编排   │
├─────────────────────────────────────┤
│  Layer 2: Agent Frameworks          │  ← Rust 开始渗透（OpenFANG、Pie）
│  多 Agent 通信、状态管理、工具发现       │
├─────────────────────────────────────┤
│  Layer 1: Runtime Infrastructure    │  ← Rust 主导
│  沙箱、执行环境、浏览器引擎、CLI 分发    │
└─────────────────────────────────────┘
```

### Layer 3：编排逻辑，Python/TypeScript 仍是王者

Agent 的编排层本质上是 I/O-bound：等模型 API 返回、等数据库查询、等工具执行。这层代码更看重生态、迭代速度和 JSON 处理能力。LangChain、CrewAI、OpenAI Agents SDK、Dify 仍然主要用 Python/TypeScript。

### Layer 2：Agent 框架，Rust 开始渗透

- **Rig**（6,700+ stars）：Rust LLM 集成层，抽象不同 provider 的 API、function calling、流式响应。
- **Pie**：Ed Huang 用 Rust 重写的 pi coding agent。
- **OpenFANG**（16,000+ stars）：Rust 多 Agent 编排框架。

### Layer 1：Runtime Infrastructure，Rust 优势明显

这是 Rust 接管最彻底的一层：

- **OpenAI Codex CLI**：Rust 核心，消除 Node.js runtime 依赖；
- **Cloudflare Kitesurf**：Rust + WebAssembly 浏览器引擎；
- **Vercel agent-browser**：Rust 核心 headless browser CLI；
- **Zerostack**：Rust 编码 Agent，8MB 基础内存占用、~90ms 启动；
- **Firecracker-style microVM**：底层隔离环境也越来越多使用 Rust。

为什么 runtime 层是 Rust 的主战场？因为这一层的执行频率最高。一个 Agent session 可能触发 **数千次沙箱执行、浏览器截图、文件系统操作**。200ms 和 5ms 的冷启动差距，在 10,000 次/小时的规模下，直接决定产品是 "能盈利" 还是 "算力黑洞"。

---

## 三、为什么是 Rust？不是 "编译型快" 这么简单

如果只是 "编译型比解释型快"，那 C++ 也应该在复兴。Rust 能在这波 Agent 基础设施浪潮中占据中心位置，是因为它的三个特性精准命中了 Agent runtime 的约束：

### 3.1 内存压力：没有 GC，就不会越跑越胖

Agent 是长时运行进程。一个 coding agent session 可能持续数小时，累积大量上下文、工具返回、diff 渲染结果。解释型 runtime 的 GC 会在长时间运行中把 heap 撑到数 GB，而 Rust 的确定性内存分配没有这个累积效应。

**Zerostack** 的案例最典型：

| 指标 | Claude Code / Copilot CLI | Zerostack |
|------|---------------------------|-----------|
| 基础内存占用 | 数 GB（长会话） | 8MB |
| 启动时间 | 数秒 | ~90ms |

Hacker News 上关于 Zerostack 的讨论中，多位开发者反馈现有 agent CLI 在长时间会话中吃掉 "tens of gigabytes" 内存。这不是边缘场景，而是 serious agent usage 的当前约束。

### 3.2 沙箱安全：内存安全是隔离边界的基础

Agent 执行的是不可信代码。Coding agent 每次运行 `npm install`、`go test`、`python script.py` 本质上都是在执行用户或模型生成的不可信内容。沙箱的隔离边界必须可信。

Rust 的所有权模型在编译期就消除了整类内存安全漏洞（use-after-free、double-free、buffer overflow 等）。相比 C/C++ runtime，Rust 写出的沙箱和隔离层有更小的可信计算基（TCB）。

**Cloudflare Kitesurf** 把 Rust 核心编译成 WebAssembly，运行在 Workers 的 V8 isolate 中。它通过了 215,000+ Web Platform Tests，并支持 Chrome DevTools Protocol，但资源消耗远低于 Chromium：

| 操作 | Kitesurf vs Chromium |
|------|---------------------|
| 截图 CPU | 3.1x 更低 |
| HTML 提取 CPU | 3.8x 更低 |
| 截图内存 | 4.7x 更低 |
| HTML 提取内存 | 7x 更低 |

代价是 wall-clock 时间：Kitesurf 截图慢 1.8x，HTML 提取慢 1.7x。但对并发运行数千浏览器实例的 Agent workload 来说，**内存和 CPU 效率比单次延迟更重要**。

### 3.3 供应链攻击面：单一二进制 vs 依赖树

Codex CLI 从 TypeScript 重写到 Rust 后，发布的是一个单一二进制，不再有 `node_modules` 这棵巨大的 transitive dependency 树。这对企业部署有两层意义：

1. **更小的攻击面**：没有成百上千个 npm 包及其历史漏洞。
2. **更容易通过企业 IT 审批**：Windows 企业环境往往对安装 Node.js 有审批门槛，而一个独立可执行文件 "copy and run" 的部署方式更容易被接受。

在 Codex CLI 的 HN 讨论中，最高赞评论不是关于性能 benchmark，而是关于企业分发："Windows enterprises face IT approval barriers for Node installation, making a standalone executable significantly more viable for institutional adoption."

---

## 四、典型项目拆解

### 4.1 OpenAI Codex CLI：从 Node 到 Rust

原始 Codex CLI 基于 TypeScript/Node.js。2026 年的 Rust 重写不是简单优化，而是重新设计了执行层抽象：

| 组件 | 作用 |
|------|------|
| `codexd` | 常驻 daemon，管理沙箱容器、子 Agent 生命周期、MCP server 连接 |
| `sandboxd` | Rust 原生容器管理器，使用 Linux namespace，无需 Docker |
| `executor` | token 感知的命令调度器，批量处理工具调用并优化上下文窗口 |

核心收益：

| 指标 | TypeScript v1 | Rust v2 |
|------|---------------|---------|
| 冷启动 | ~1.2s | ~180ms |
| 空闲内存 | ~120MB | ~28MB |
| 单次沙箱开销 | ~400ms | ~90ms |
| 并发子 Agent | 4-6 个（内存限制） | 20+ 个 |

Rust 重写还让 Codex CLI 可以脱离 Node.js runtime，发布单一 ~8MB 可执行文件。

### 4.2 Cloudflare Kitesurf：为 Agent 而生的浏览器

Kitesurf 不是 "用 Rust 写个 headless Chrome wrapper"，而是从头写了一个面向 Agent 的浏览器引擎：

- Rust 核心编译为 WebAssembly；
- 运行在 Cloudflare Workers 的 V8 isolate 中；
- 支持 CDP，现有 Playwright/Puppeteer 代码可迁移；
- 砍掉人类浏览器的标签页、扩展、主题、60fps 滚动等非必要功能。

对 Agent 来说，浏览器不需要 "像人一样浏览网页"，只需要提取 HTML、执行 JS、截图、填表单。Kitesurf 把这个思路推到了极致。

### 4.3 Vercel agent-browser：Rust 核心的浏览器自动化

Vercel 的 agent-browser 是一个 headless browser 自动化 CLI，Rust 核心，数周内获得 26,000+ stars。它的定位是：**让 Agent 能够 cheaply 地 "看" 网页**。与 Kitesurf 类似，它也从资源效率出发，而不是功能完备性。

### 4.4 Zerostack：把资源消耗打下来

Zerostack 是一个 Unix-inspired coding agent，用 Rust 实现文件编辑、bash 执行、git 操作、LLM 交互。它的核心卖点不是功能多，而是 **8MB 基础内存 + ~90ms 启动**。这证明了：对于 Agent harness 来说，资源效率本身就是产品能力。

---

## 五、代码示例：Rust Agent Runtime 的最小沙箱骨架

下面是一个高度简化的 Rust Agent runtime 骨架，展示如何用 `tokio` + `nix` 命名空间实现一个最小沙箱。生产环境请勿直接使用，但它能帮助理解 Rust runtime 层的典型结构。

```rust
use std::process::Stdio;
use tokio::process::Command;

/// 在最小隔离环境中执行一条 Agent 工具调用
pub async fn run_in_sandbox(cmd: &str, args: &[&str]) -> anyhow::Result<String> {
    let output = Command::new(cmd)
        .args(args)
        // 标准输入关闭，防止交互式工具挂起
        .stdin(Stdio::null())
        // 限制输出大小，避免上下文窗口被撑爆
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        // 实际生产环境会在这里加入 namespace/cgroup/seccomp 限制
        .kill_on_drop(true)
        .output()
        .await?;

    if !output.status.success() {
        anyhow::bail!(
            "sandbox command failed: {}\nstderr: {}",
            output.status,
            String::from_utf8_lossy(&output.stderr)
        );
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout.to_string())
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 示例：在沙箱中运行 git status
    let out = run_in_sandbox("git", &["status", "--short"]).await?;
    println!("{}", out);
    Ok(())
}
```

真实 Agent runtime 还需要处理：

- 命名空间隔离（PID、mount、network、IPC）；
- cgroup 资源限制（CPU、内存、IO）；
- seccomp / Landlock 系统调用过滤；
- 文件系统只读或 overlay 视图；
- 工具输出 token 限制与上下文压缩；
- 多 Agent 并发调度与崩溃恢复。

这些正是 Rust 擅长的领域：没有 GC 暂停、精细的内存控制、与内核接口直接交互的能力。

---

## 六、企业应该怎么做？

Rust 接管 Agent runtime 的趋势已经很明显，但企业不需要把所有 Agent 代码都重写成 Rust。更务实的做法是识别哪些层已经低于性能 floor，然后把那一层迁到 Rust。

### 6.1 高 ROI 迁 Rust 的场景

- 代码执行沙箱；
- 浏览器自动化 runtime；
- CLI 工具分发（消除 Node.js/Python 依赖）；
- 文件系统 watcher / 索引器；
- 并发工具执行引擎。

### 6.2 继续留在 Python/TypeScript 的场景

- Agent 编排逻辑；
- 提示工程和模板系统；
- 模型路由与 fallback 链；
- 集成 API、webhook 处理；
- 快速原型与实验。

### 6.3 判断边界的一个简单问题

> 这个组件是 **每个 Agent session 运行一次**，还是 **每个 Agent action 运行数千次**？

如果是后者，编译型 runtime 的优势会随规模复利放大；如果是前者，开发速度更重要。

---

## 七、反方观点：TypeScript 没有输

Justin Schroeder 在 X 上提出过一个 contrarian 观点：*"Agents should be written in TypeScript. I know my last post said everything should be Rust... and it should. Except agents."*

他的论点是：Agent 本质上是 I/O-bound，等 API 调用的时间远多于本地计算时间。TypeScript 在 API 集成、JSON 处理、快速迭代上的生态优势，比 raw performance 对编排层更有价值。

这个观点部分正确，但它恰恰说明了 Rust 和 TypeScript/Python 的分工：

- **编排层**留在解释型语言，利用生态和迭代速度；
- **runtime 层**下沉到 Rust，利用内存安全和性能。

这不是零和博弈，而是 web 开发历史在 Agent 领域的重演：Ruby/Python 写应用，C/C++/Rust 写数据库、web server、操作系统。

---

## 八、未来 12 个月的三个预测

1. **"Rust runtime + Python/TS orchestration" 成为默认架构**。LangChain、CrewAI 等框架会越来越多地依赖 Rust runtime 层。
2. **Sandbox-as-a-Service 成为一个独立品类**。Cloudflare Kitesurf 只是开始，未来会出现专门面向 Agent 的隔离环境服务商。
3. **CLI Agent 战争围绕单一二进制收敛**。Codex CLI、Claude Code、Zerostack、Pie 等下一代 coding agent 都会以单一二进制分发，而不是 npm/pip 包。

---

## 九、总结

2026 年 Rust 在 Agent 基础设施中的崛起，不是语言信仰，而是工程现实的反映：

- Agent workload 对沙箱冷启动、内存占用、并发执行提出了更高要求；
- 解释型 runtime 的 GC 和依赖树在这些约束下开始成为瓶颈；
- Rust 的内存安全、零成本抽象、 fearless 并发，正好匹配 runtime 层的需求。

但Rust 不会吃掉所有层。Agent 的未来更可能是分层架构：**Python/TypeScript 负责编排和快速迭代，Rust 负责 runtime 和隔离**。对企业来说，与其盲目 "rewrite everything in Rust"，不如先识别哪一层已经低于性能 floor，然后精准迁移。

这场 substrate shift 刚刚开始，但方向已经明确。

---

## 参考资料

- [AgentConn: Rust Is Eating the Agent Stack](https://agentconn.com/blog/rust-agent-infrastructure-consolidation)
- [OpenAI Codex CLI GitHub](https://github.com/openai/codex)
- [Cloudflare Kitesurf 相关报道](https://agentconn.com/blog/rust-agent-infrastructure-consolidation)
- [Vercel agent-browser GitHub](https://github.com/vercel/agent-browser)
- [Zerostack Hacker News 讨论](https://news.ycombinator.com/)
- [Microsoft Rust Tier-1 Hacker News 讨论](https://news.ycombinator.com/)
- [OSS Insight: Rust AI Agent Repository Trends](https://ossinsight.io/)
