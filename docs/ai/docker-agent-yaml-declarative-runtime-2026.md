---
title: "Docker Agent 实战：用 YAML 和 OCI Registry 构建、分发、运行你的 AI Agent 团队"
date: 2026-10-09
tags:
  - ai
  - agent
  - mcp
  - docker
  - devops
keywords:
  - Docker Agent
  - AI Agent
  - MCP
  - YAML 声明式 Agent
  - OCI Registry
  - 多智能体编排
  - Docker Model Runner
category: ai
description: "Docker 官方推出 docker-agent CLI 插件：像写 Dockerfile 一样用 YAML 声明 AI Agent，像拉镜像一样从 OCI Registry 运行 Agent，原生集成 MCP 与多智能体委派。本文覆盖安装、YAML 编写、多 Agent 团队编排、工具集配置与生产化考量，全部附可运行配置。"
recommend: AI工程
---

> 容器改变了软件分发，Docker 现在想把同一套打法复制到 AI Agent 上：Agent 就是一个 YAML 文件，可以进 Git、过 Code Review、推到 OCI Registry，然后在任何机器上 `docker agent run` 一键运行。2026 年 10 月，Docker Agent（前身 cagent）更新到 v1.149，支持从 GitHub 仓库直接加载 Skills，并加入了独立的 Evaluator 后端——本文带你从零跑通这条"Agent 即制品"的工作流。

## 一、Docker Agent 是什么：一句话定位

**用声明式 YAML 定义 AI Agent，用容器工程的基础设施分发和运行它们。**

它是一个 `docker` CLI 插件（Docker Desktop 4.63+ 已预装），核心能力：

- **YAML 声明式配置**：模型、指令、工具集全部写在一个 `agent.yaml` 里，无需写编排代码
- **多智能体架构**：一个文件描述一个团队，root agent 自动把子任务委派给专业化 sub-agent
- **工具生态**：内置十几种工具（filesystem、git、shell、think、todo、memory、fetch、RAG、LSP……），并能挂任意 MCP server——本地进程、远程 HTTP、或 Docker 容器形态
- **模型无关**：OpenAI、Anthropic、Gemini、AWS Bedrock、Mistral、xAI，以及通过 Docker Model Runner 跑本地模型
- **OCI 分发**：`docker agent push` / `docker agent run myorg/agent:tag`，复用你现有的镜像仓库

用一张文字架构图理解它的分层：

```
┌─────────────────────────────────────────────────┐
│                docker agent run                  │
├─────────────────────────────────────────────────┤
│  agent.yaml（声明层）                             │
│  ┌───────────┐   委派    ┌───────────┐          │
│  │ root agent │ ───────→ │ sub-agent │ ...      │
│  │ gpt-5-mini │          │ claude-sonnet │       │
│  └─────┬─────┘          └─────┬─────┘          │
├────────┼──────────────────────┼────────────────┤
│  工具层 │                      │                │
│  内置: filesystem / git / shell / think /       │
│        todo / memory / fetch / rag / lsp        │
│  MCP:  docker:duckduckgo / stdio / remote /     │
│        Docker MCP Catalog（网关隔离）            │
├─────────────────────────────────────────────────┤
│  模型层（可插拔）                                 │
│  OpenAI / Anthropic / Gemini / Bedrock /        │
│  Mistral / xAI / Docker Model Runner（本地）     │
├─────────────────────────────────────────────────┤
│  分发层                                          │
│  Git 版本化 → OCI Registry → docker agent run    │
└─────────────────────────────────────────────────┘
```

## 二、五分钟上手

### 2.1 安装

```bash
# 方式一：Docker Desktop 4.63+ 已内置，直接用
docker agent --help

# 方式二：Homebrew 安装独立插件
brew install docker-agent

# 方式三：手动——下载二进制后软链到 CLI 插件目录
ln -s /path/to/docker-agent ~/.docker/cli-plugins/docker-agent
```

### 2.2 配置模型

至少要有一个模型来源。两条路：

```bash
# 路线 A：云端 API（任选一家）
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...

# 路线 B：本地模型（无需 API key，走 Docker Model Runner）
# docker model pull ai/qwen3 之类，详见 Docker Model Runner 文档
```

### 2.3 第一个 Agent

```bash
# 交互式生成一个新 agent 配置
docker agent new

# 或者直接体验默认 agent
docker agent run
```

一个最小可用的 `agent.yaml` 长这样：

```yaml
agents:
  root:
    model: openai/gpt-5-mini
    description: 一个懂技术资讯的助手
    instruction: |
      你是一个严谨的技术助手。回答要准确、简洁，
      涉及事实时优先用搜索工具核实，不要编造。
    toolsets:
      - type: mcp
        ref: docker:duckduckgo   # 通过 Docker MCP Gateway 获得搜索能力
```

```bash
docker agent run agent.yaml
```

`ref: docker:duckduckgo` 是关键细节：这不是本地跑一个 npm 包，而是通过 **Docker MCP Catalog** 把搜索工具作为安全容器挂进来——和 `docker run` 拉镜像的信任模型一脉相承。

## 三、多智能体团队：一个 YAML 编排专业化分工

单 agent 的天花板很快会到。Docker Agent 的多智能体写法，本质是把"路由逻辑"交给模型 + 配置：root agent 根据任务自动 `transfer` 给合适的 sub-agent，不需要手写状态机。

下面是一个"技术博客写作流水线"配置（每一段都可运行）：

```yaml
agents:
  root:
    model: anthropic/claude-sonnet-5
    description: 任务调度与最终质检
    instruction: |
      你是写作团队负责人。分析用户需求后委派给合适的专家：
      - 资料检索 → researcher
      - 初稿撰写 → writer
      - 代码审查 → reviewer
      所有子任务完成后由你汇总并做最终一致性检查。
    toolsets:
      - type: todo        # 任务清单，跟踪委派进度
      - type: memory      # 跨会话记忆（SQLite 持久化）
        path: ./blog.db
    handoffs:
      - researcher
      - writer
      - reviewer

  researcher:
    model: openai/gpt-5-mini
    description: 资料检索员：搜索、核实、输出要点清单
    instruction: |
      你负责收集和核实资料。输出结构化的要点清单，
      每条标注来源 URL 与可信度。禁止改写或创作。
    toolsets:
      - type: mcp
        ref: docker:duckduckgo
      - type: fetch       # HTTP 抓取，输出 markdown

  writer:
    model: anthropic/claude-sonnet-5
    description: 技术写手：根据要点清单撰写文章
    instruction: |
      根据 researcher 提供的要点撰写中文技术文章，
      包含可运行代码示例，遵循团队的写作规范。
    toolsets:
      - type: filesystem
      - type: think       # 推理草稿纸

  reviewer:
    model: openai/gpt-5-mini
    description: 代码审查员：检查文章中的代码可运行性与事实准确性
    instruction: |
      审查文章中的每个代码块：语法、依赖、版本假设。
      对事实性陈述核对来源。输出问题清单，按严重度排序。
    toolsets:
      - type: filesystem
      - type: shell       # 真正把代码跑起来验证
      - type: lsp         # 语言服务器诊断（可选）
```

```bash
docker agent run team.yaml
```

几个值得注意的设计：

- **`handoffs` 显式声明可委派对象**，避免 root 乱指；委派动作是框架自动完成的
- **sub-agent 各自挂工具**：researcher 有搜索没有写权限，reviewer 有 shell——**权限随角色走**，这是声明式配置在安全上的天然优势
- **`think`/`todo`/`memory` 是内置工具**：think 是推理草稿纸，todo 是任务清单，memory 是 SQLite 持久化 KV。不用自己搭

## 四、工具集详解：内置工具 + 三种 MCP 接入方式

v1.149 的内置工具已经覆盖了绝大多数 agent 场景：

| 工具类型 | 用途 | 备注 |
|---------|------|------|
| `filesystem` | 读写/搜索/导航文件 | |
| `git` | 只读仓库检查（status/log/blame） | 注意是**只读** |
| `shell` | 同步执行 shell 命令 | |
| `background_jobs` | 长任务后台运行 | |
| `think` | 推理草稿纸 | 提升复杂推理质量 |
| `todo` | 任务清单管理 | |
| `memory` | 持久化 KV 存储（SQLite） | 跨会话 |
| `fetch` | HTTP 请求，输出 markdown | |
| `rag` | BM25 / embeddings / 混合检索 / rerank | 可插拔 |
| `lsp` | 语言服务器协议集成 | 代码诊断 |
| `api` / `openapi` | 自定义 HTTP API / 导入 OpenAPI 文档 | |
| `a2a` | A2A 远程 agent 连接 | 跨主机协作 |
| `webhook` | 通知到 Slack/Discord/Telegram 等 | 带重试 |
| `transfer_task` / `handoff` | 子代理委派 | 自动启用 |

MCP 接入有三种形态，按信任级别从高到低排：

```yaml
# 1. Docker MCP（推荐）：MCP Gateway 容器化隔离
toolsets:
  - type: mcp
    ref: docker:github-official
    tools: [create_issue, list_issues]   # 只暴露需要的工具，最小权限

# 2. 本地 stdio：子进程方式
toolsets:
  - type: mcp
    command: python
    args: ["-m", "mcp_server"]
    tools: ["search"]
    env:
      API_KEY: ${env.MY_API_KEY}

# 3. 远程 HTTP：Streamable HTTP / SSE
toolsets:
  - type: mcp
    remote:
      url: "https://mcp.example.com"
      transport_type: "streamable"
      headers:
        Authorization: "Bearer ${env.MCP_TOKEN}"
```

生产环境建议：**优先 `docker:` 前缀的 MCP Catalog**。网关进程隔离 + 目录审核，避免了"为了一个搜索工具在主机上跑一个未知 stdio 进程"的风险。

## 五、Agent 即制品：Git → OCI Registry 的工作流

这是 Docker Agent 与其他 agent 框架最本质的差异。因为 agent 是纯配置文件，可以走完整的软件工程流程：

```bash
# 1. 版本化：agent.yaml 进 Git，改动可 Review
git add agent.yaml && git commit -m "feat: 上线代码审查 agent v1"

# 2. 推送到任意 OCI Registry（就是推镜像的仓库）
docker agent push myorg/code-reviewer:1.0.0

# 3. 任何机器上拉取运行——不需要装任何额外运行时
docker agent run myorg/code-reviewer:1.0.0
```

```
传统 agent 开发 vs Docker Agent 工作流（对比）

传统：Python/TS 代码 → 自建编排逻辑 → 自建部署脚本
      → 每个环境配置 API key → 运行时行为难追溯

Docker Agent：YAML 配置 → Git 版本化 + Code Review
      → push 到 OCI Registry（有 tag、有 digest）
      → docker agent run（和其他容器制品同一套基础设施）
      → 配置变更即制品变更，可审计、可回滚
```

Docker 自己就在用这套流程开发 Docker Agent——仓库里的 `golang_developer.yaml` 就是给贡献者用的开发 agent。

### Skills 与 Evals（v1.149 新能力）

```yaml
# 从公共 GitHub 仓库直接加载 Skills（2026-10-07 新增）
# Skills 是可复用的指令/工作流包，借鉴自 Claude Code 的 Skills 概念
agents:
  root:
    model: openai/gpt-5-mini
    skills:
      - github:org/repo/path/to/skill
```

同时加入的 Evaluator 后端让 agent 质量评估成为一等公民：LLM-as-judge 或专用评估后端，评估请求经模型网关路由，OpenAI Decisions 作为原生评估器。**把 agent 当制品，就要有 CI 测试；evals 就是 agent 的 CI**。

## 六、生产化考量：三个别忽视的点

**1. 遥测。** Docker Agent 默认收集匿名使用数据。企业环境先读官方 Telemetry 文档，按需关闭。

**2. API Key 管理。** YAML 里不要写死 key，用 `${env.VAR}` 占位符引用环境变量；CI 里用 OIDC 短时凭证。上一篇文章刚讲过凭证泄露的后果，不重复。

**3. shell 工具的权限边界。** `shell` 和 `filesystem` 是双刃剑。给 agent 配 shell 前，想清楚它该在哪跑：Docker Agent 本身可以整体跑在容器/VM 里，宿主机直跑时建议至少限制工作目录。

## 七、选型建议：什么时候用 Docker Agent

| 场景 | 建议 |
|------|------|
| 运维脚本 agent、代码审查 bot、内部工具胶水层 | **首选 Docker Agent**——声明式、可分发、权限清晰 |
| 复杂 RAG 系统、需要自定义 agent loop 的产品 | LangGraph / 自研框架更灵活 |
| 已有 MCP 工具生态，想快速组装 | **首选 Docker Agent**——MCP 一等公民 |
| 需要本地模型、离线环境 | **首选**——Docker Model Runner 无缝集成 |

一句话：**编排逻辑越接近"配置"而非"代码"，Docker Agent 的杠杆越大；一旦需要精细控制每一步的 agent loop，声明式的表达力就成为天花板。** 好消息是两者不冲突——YAML 负责骨架，复杂节点交给 MCP server 实现，各干各的。

## 八、参考资料

1. [GitHub: docker/docker-agent（Apache-2.0，Go 实现）](https://github.com/docker/docker-agent)
2. [Docker 官方文档：Docker Agent Toolsets Reference](https://docs.docker.com/ai/docker-agent/reference/toolsets/)
3. [AI/TLDR: Docker Agent 1.149 — Skills from GitHub, Evaluator backend](https://ai-tldr.dev/tools/docker-agent)（2026-10-07）
4. [AI Weekly: Docker Open-Sources YAML AI Agent Builder With MCP and RAG](https://aiweekly.co/alerts/docker-open-sources-yaml-ai-agent-builder-with-mcp-and-rag)
5. 本站相关文章：[MCP 2.0 无状态协议重写](/ai/mcp-2-0-stateless-protocol-rewrite-2026.html)、[Go MCP 2.0 无状态服务器实战](/dev/backend/golang/go-mcp-2-0-stateless-server-production-2026.html)、[Agent Plugins 1.0.0 统一打包标准](/ai/agent-plugins-1-0-0-unified-packaging-standard-2026.html)
