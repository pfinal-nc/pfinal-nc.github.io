---
title: "MCP 记忆生态集体爆发：Adaptive Recall + Kote 如何让 AI Agent 拥有长期记忆"
date: 2026-07-28
tags:
  - ai
  - mcp
  - agent
  - llm
  - memory
keywords:
  - MCP memory
  - Adaptive Recall
  - Kote
  - AI Agent 记忆
  - 向量检索
  - 语义记忆
  - Model Context Protocol
  - context window
  - Mem0
  - 2026
category: ai
description: "2026 年 7 月 13 日，两个 MCP 记忆项目同时登上 Hacker News 首页。Adaptive Recall 在 24 小时内积累 400+ 星标，社区热度超过当周所有 AI 模型发布。本文从 MCP 记忆层标准化、Adaptive Recall 语义检索架构、Kote Git 工程决策挖掘、三层记忆生态格局到隐私治理，完整解析 AI Agent 从'金鱼脑'到'长期记忆'的范式跃迁。"
---

# MCP 记忆生态集体爆发：Adaptive Recall + Kote 如何让 AI Agent 拥有长期记忆

## 引言：第三次回答同一个问题

"你的项目用的是什么 ORM？"

这是你第三次回答同一个 AI 编程 Agent 了。第一次是上周二，你花五分钟解释了为什么选 Prisma 而不是 TypeORM。第二次是周四，Agent 切了一个新对话窗口后又问了一遍。第三次是今天早上——你又得重来一遍。

这不是模型笨，是它没有记忆。

2026 年 7 月 13 日，两个 MCP 记忆项目同时登上 Hacker News 首页。其中 **Adaptive Recall** 在 24 小时内积累了超过 400 个星标，社区讨论热度超过了当周所有 AI 编程模型发布的总和。另一个项目 **Kote** 从 Git 提交历史中自动提取工程决策上下文。

这不是简单的"把聊天记录存起来"。这是 AI 编程从"对话式工具"走向"协作式伙伴"的分水岭。

## 一、为什么 Agent 需要记忆：上下文窗口的迷信与真相

过去一年，AI 编程社区对"上下文窗口"有一种近乎迷信的崇拜。百万 Token 的上下文窗口，超长文本输入，一次性塞入整个代码库——好像窗口越大，问题就解决了。

但实际上，**窗口大不等于理解深**。

### 1.1 长上下文的注意力衰减

研究表明，模型在长上下文窗口的尾部，注意力衰减严重。你项目里最关键的那行配置，可能刚好在 Token 80,000 的位置——模型"看到了"，但没"注意到"。这被称为 **"中间迷失"（Lost in the Middle）** 现象。

```
┌──────────────────────────────────────────────────────────────┐
│                    1M Token 上下文窗口                         │
│                                                                │
│  ┌─────────┐  ┌─────────────────────────┐  ┌──────────────┐ │
│  │ 头部      │  │      中间区域            │  │   尾部       │ │
│  │ 注意力强  │  │  ⚠️ 注意力衰减严重       │  │  注意力强    │ │
│  │ ~20K     │  │  关键信息可能在这里丢失   │  │  ~20K       │ │
│  └─────────┘  └─────────────────────────┘  └──────────────┘ │
│                                                                │
│  问题：你最关键的配置在 Token 80,000 位置 → 模型"看到"但没"注意"  │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 MCP 记忆的按需检索范式

MCP 记忆系统的思路完全不同。它不强求模型一次性记住所有东西。它做的是 **"按需检索"**——Agent 在需要某个信息的时候，主动从记忆库里拉出最相关的内容。

这更接近人脑的工作方式：你不会把整本手册背下来，但你知道去哪里查。

**关键洞察**：一个 32K 上下文的模型加上一套 MCP 记忆系统，在工程实践中的效果可能比一个裸奔的百万 Token 模型更好。

## 二、MCP：从工具调用协议到记忆层标准

### 2.1 MCP 的定位变迁

MCP（Model Context Protocol）是 Anthropic 在 2024 年提出的开放协议，让 AI Agent 标准化访问外部工具和数据源。

MCP 最初的定位是"让 Agent 调用工具"——读文件、查数据库、调 API。但开发者很快发现，**MCP 的真正威力不在于工具调用，而在于它提供了一个"记忆层"的标准化接口**。

```
MCP 定位演进时间线：

2024-11 ──── 工具调用协议（读文件/查DB/调API）
     │
2025-06 ──── OAuth 2.1 授权标准化
     │
2025-11 ──── Tool Search Tool（延迟加载工具描述）
     │
2026-02 ──── Enterprise-Managed Authorization (GA)
     │
2026-07 ──── 记忆层标准化 ← 我们在这里
     │         Adaptive Recall / Kote / Mem0
     │
2026-07-28 ─ Final Spec（stateless core + Apps + Tasks）
```

### 2.2 记忆层与工具层的区别

| 维度 | 工具调用（原始 MCP） | 记忆层（MCP 记忆） |
|------|---------------------|-------------------|
| 数据方向 | Agent → 外部（执行操作） | Agent ← 记忆库（检索上下文） |
| 调用时机 | 任务执行中 | 对话开始/需要时 |
| 数据持久化 | 通常不持久化 | 持久化到向量 DB |
| 检索方式 | 精确匹配 | 语义检索（向量相似度） |
| 解决的问题 | "Agent 能做什么" | "Agent 知不知道自己在做什么" |

一句话总结：**工具调用是手，记忆是脑**。

## 三、Adaptive Recall：对话驱动的语义记忆系统

### 3.1 核心架构

Adaptive Recall 是基于 MCP 构建的记忆系统。核心逻辑：

1. Agent 每完成一次对话，自动从对话记录中提取关键信息
2. 用向量数据库存储——项目偏好、技术选型原因、常用命令、代码规范
3. 下一次新对话开始时，Agent 通过 MCP 协议查询历史上下文
4. 自动加载最相关的内容

```
┌──────────────────────────────────────────────────────────┐
│                    Adaptive Recall 架构                    │
│                                                            │
│  ┌─────────┐     对话结束      ┌──────────────┐          │
│  │ AI Agent │ ───────────────→ │ 信息提取器     │          │
│  │ (对话中) │                  │ (LLM 提取关键  │          │
│  └─────────┘                  │  决策/偏好)    │          │
│                               └──────┬───────┘          │
│                                      │ 结构化信息          │
│                               ┌──────▼───────┐          │
│                               │ Embedding    │          │
│                               │ (向量化)      │          │
│                               └──────┬───────┘          │
│                                      │ 向量 + 元数据       │
│                               ┌──────▼───────┐          │
│                               │ 向量数据库    │          │
│                               │ (本地/云端)   │          │
│                               └──────┬───────┘          │
│                                      │                    │
│  ┌─────────┐     新对话开始     ┌─────▼────────┐         │
│  │ AI Agent │ ───────────────→ │ MCP 查询      │         │
│  │ (新会话) │                   │ "用户之前     │         │
│  └─────────┘                   │  聊过什么？"  │         │
│       │                        └──────┬───────┘         │
│       │ 语义检索（向量相似度）          │                  │
│       ←──────────────────────────────┘                  │
│       │                                                    │
│       ▼                                                    │
│  自动加载最相关上下文 → 无需用户重复解释                      │
└──────────────────────────────────────────────────────────┘
```

### 3.2 语义检索 vs 全文搜索

这不是简单的"把聊天记录存起来"。聊天记录是全文搜索，匹配的是关键词。Adaptive Recall 用的是 **语义检索**——Agent 能理解"数据库选型"和"ORM 决策"是同一类信息，即使你的措辞完全不同。

```python
# Adaptive Recall 核心流程（概念示例）

from mcp import ClientSession
from embedding import embed_text
from vector_db import VectorStore

class AdaptiveRecallMemory:
    """基于 MCP 的 Agent 长期记忆系统"""

    def __init__(self, vector_store: VectorStore):
        self.store = vector_store
        self.mcp_session = ClientSession()

    async def remember(self, conversation: str, user_id: str):
        """从对话中提取关键信息并存入向量库"""

        # 步骤 1：用 LLM 提取结构化关键信息
        extracted = await self._extract_key_info(conversation)
        # 例：{"topic": "ORM选型", "decision": "Prisma", "reason": "批量插入性能"}

        # 步骤 2：向量化
        info_text = f"{extracted['topic']}: {extracted['decision']} ({extracted['reason']})"
        embedding = embed_text(info_text)

        # 步骤 3：存入向量数据库（带元数据）
        await self.store.upsert(
            id=f"{user_id}:{hash(info_text)}",
            embedding=embedding,
            metadata={
                "user_id": user_id,
                "topic": extracted["topic"],
                "decision": extracted["decision"],
                "timestamp": datetime.now().isoformat(),
            },
        )

    async def recall(self, query: str, user_id: str, top_k: int = 5):
        """新对话开始时，通过 MCP 查询最相关的历史记忆"""

        # 步骤 1：将当前查询向量化
        query_embedding = embed_text(query)

        # 步骤 2：语义检索（不是关键词匹配！）
        results = await self.store.search(
            embedding=query_embedding,
            filter={"user_id": user_id},
            top_k=top_k,
        )

        # 步骤 3：通过 MCP 返回给 Agent 作为上下文
        context = "\n".join([
            f"- {r.metadata['topic']}: {r.metadata['decision']}"
            for r in results
        ])
        return f"用户历史决策记录:\n{context}"

    async def _extract_key_info(self, conversation: str):
        """用 LLM 从对话中提取关键技术决策"""
        prompt = f"""
        从以下对话中提取关键技术决策信息。
        返回 JSON 格式：{{"topic": "...", "decision": "...", "reason": "..."}}

        对话内容：
        {conversation}
        """
        # 调用 LLM 提取
        return await self.llm.extract(prompt)
```

### 3.3 效果数据

一组对比数据很说明问题。一个使用 Adaptive Recall 的开发者统计了自己三周的对话记录：

| 时间段 | 每次新会话平均上下文解释时间 | 变化 |
|--------|--------------------------|------|
| 第一周 | 4 分 20 秒 | 基准 |
| 第二周 | 2 分 15 秒 | -48% |
| 第三周 | 37 秒 | -86% |

不是因为 Agent 变聪明了，是因为它已经"认识"你了。

## 四、Kote：从 Git 历史挖掘工程决策上下文

### 3.1 Kote 解决的问题

和 Adaptive Recall 几乎同时登上 Hacker News 的 Kote 做的事情更狠：它从你的 **Git 提交历史、代码注释、AI 聊天记录**里自动提取"工程决策上下文"。

考虑这个场景：你的代码库里有一段三年前写的复杂 SQL 查询，旁边有一行注释："不用 ORM，直接写 SQL，因为当时 Prisma 的批量插入性能不够"。

AI 编程 Agent 不会读到这行注释里的上下文——它只会看到一个不符合项目 ORM 规范的原始 SQL 语句，然后"好心"建议你重构。

Kote 解决了这个错位。它把散落在 Git log、PR 评论、代码注释里的技术决策信息，自动归档成一个可检索的知识库。

### 4.2 Kote 的工作流程

```
┌──────────────────────────────────────────────────────────┐
│                      Kote 数据流                          │
│                                                            │
│  ┌───────────┐   ┌───────────┐   ┌──────────────┐      │
│  │ Git Log    │   │ PR 评论    │   │ 代码注释      │      │
│  │ commit msg│   │ review    │   │ inline docs  │      │
│  └─────┬─────┘   └─────┬─────┘   └──────┬───────┘      │
│        │               │                │                 │
│        └───────────────┼────────────────┘                │
│                        ▼                                  │
│                ┌───────────────┐                          │
│                │  决策提取器     │                          │
│                │  (LLM 分析)    │                          │
│                └───────┬───────┘                          │
│                        │                                  │
│                ┌───────▼───────┐                          │
│                │  工程知识库     │                          │
│                │  (向量 DB)    │                          │
│                └───────┬───────┘                          │
│                        │                                  │
│  ┌─────────┐   MCP 查询   │                                │
│  │ AI Agent │ ←───────────┘                                │
│  │ 分析代码  │                                               │
│  └─────────┘                                                │
│       │                                                     │
│       ▼                                                     │
│  "这段 SQL 是因为 Prisma 性能问题保留的" → 不再建议重构        │
└──────────────────────────────────────────────────────────┘
```

### 4.3 Kote 的价值

Kote 是 AI 编程从"写代码"进化到"理解项目"的关键一步。它让 Agent 不仅看到代码是什么，还理解代码为什么是这样。

这是传统 RAG 做不到的——RAG 检索的是代码文本，Kote 检索的是代码背后的决策意图。

## 五、记忆生态的三层格局

从 7 月 13 日的项目爆发来看，MCP 记忆生态正在形成清晰的三层结构：

### 第一层：基础设施层

提供底层向量存储和语义检索能力。

| 项目 | 特点 | 部署模式 |
|------|------|---------|
| Adaptive Recall | 对话驱动，LLM 提取关键信息 | 本地优先 |
| Mem0 | 云端记忆服务，跨设备同步 | 云端 SaaS |
| Memora | 企业级记忆，多租户 | 混合部署 |

### 第二层：领域适配层

针对特定信息源做深度适配。

| 项目 | 数据源 | 适配方向 |
|------|--------|---------|
| Kote | Git 历史 + 代码注释 | 工程决策上下文 |
| Jira MCP | 工单系统 | 任务/需求上下文 |
| Slack MCP | 聊天记录 | 团队讨论上下文 |
| Notion MCP | 文档系统 | 产品/设计上下文 |

### 第三层：应用整合层

主流 AI 编程工具开始原生支持 MCP 记忆插件。

| 工具 | MCP 记忆支持 | 状态 |
|------|-------------|------|
| Cursor | 原生 MCP 插件 | 已上线 |
| Claude Code | MCP 记忆扩展 | 已上线 |
| Windsurf | MCP 实验支持 | Beta |
| Copilot | MCP 支持 | 规划中 |

开发者不需要自己搭建记忆系统——打开一个开关，Agent 就有长期记忆了。

## 六、记忆的隐私与治理

Agent 记得越多，它也越了解你的弱点。你的技术债、你的历史错误、你搁置了三个月没重构的那个模块——这些信息如果存在一个第三方的云端记忆服务里，谁有权访问？

### 6.1 部署模式对比

| 模式 | 代表项目 | 优势 | 风险 |
|------|---------|------|------|
| 本地优先 | Adaptive Recall | 隐私可控 | 无法跨设备同步 |
| 云端 SaaS | Mem0 | 同步方便 | 隐私模型不透明 |
| 完全本地 | Kote | 只覆盖 Git | 不记录对话内容 |

### 6.2 核心问题

当你的 AI 编程 Agent 记住了你过去半年的每一次技术决策、每一段写的代码、每一次团队讨论中的立场——它就拥有了对你工程能力的完整画像。这份画像的归属权，目前没有任何法律或行业规范来定义。

开发者面临的选择不是"要不要给 Agent 记忆"，而是 **"记忆存在哪里、归谁管"**。

这不是一个可以无限推迟的问题。

## 七、实践：用 MCP 构建最小记忆系统

以下是一个基于 MCP 协议的最简记忆系统实现：

```typescript
// memory-mcp-server.ts — 最小 MCP 记忆服务器
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "memory-server",
  version: "1.0.0",
});

// 简易向量存储（生产环境用 Qdrant/Weaviate/Pinecone）
const memories: MemoryEntry[] = [];

interface MemoryEntry {
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  timestamp: string;
}

// 记忆存储工具
server.tool(
  "store_memory",
  {
    content: z.string().describe("要记住的信息"),
    metadata: z.record(z.unknown()).describe("附加元数据"),
  },
  async (args) => {
    const embedding = await embedText(args.content);
    memories.push({
      content: args.content,
      embedding,
      metadata: args.metadata,
      timestamp: new Date().toISOString(),
    });
    return { content: [{ type: "text", text: "已记住" }] };
  }
);

// 记忆检索工具
server.tool(
  "recall_memory",
  {
    query: z.string().describe("要查询的信息"),
    top_k: z.number().default(5).describe("返回结果数"),
  },
  async (args) => {
    const queryEmbedding = await embedText(args.query);
    // 余弦相似度检索
    const results = memories
      .map((m) => ({
        ...m,
        score: cosineSimilarity(queryEmbedding, m.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, args.top_k);

    const formatted = results
      .map((r) => `[${r.timestamp}] ${r.content} (score: ${r.score.toFixed(3)})`)
      .join("\n");

    return {
      content: [{ type: "text", text: formatted || "无相关记忆" }],
    };
  }
);

// 列出所有记忆
server.tool("list_memories", {}, async () => {
  const summary = memories
    .map((m) => `[${m.timestamp}] ${m.content.substring(0, 80)}...`)
    .join("\n");
  return { content: [{ type: "text", text: summary || "记忆为空" }] };
});

async function embedText(text: string): Promise<number[]> {
  // 生产环境：调用 OpenAI/本地 embedding 模型
  // 简化：返回随机向量（仅演示）
  return Array.from({ length: 384 }, () => Math.random());
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 启动服务器
const transport = new StdioServerTransport();
await server.connect(transport);
```

将这个 MCP 服务器配置到你的 AI 编程工具中，Agent 就拥有了跨会话的长期记忆。

## 八、总结：从"金鱼脑"到"协作式伙伴"

MCP 记忆生态的爆发标志着 AI 编程交互范式的一次静默转型：

- **过去两年**：AI 编程的核心交互是"你描述，它执行"。你花大量时间解释背景、设定约束、澄清意图
- **记忆时代**：Agent 有了记忆，"你描述"的部分大幅缩短，"它执行"的部分保持不变。你的时间被释放出来

但这个叙事有一个微妙的反面。Agent 记得越多，信任变得越重要。记忆让 Agent 变聪明，也让数据安全变得更关键。

**AI 编程 Agent 终于不再是一条金鱼了。** 但在它记住你所有技术秘密的同时，你也该问问：这些记忆存在哪里，谁能看到它们。

## 参考资料

- [Adaptive Recall - GitHub](https://github.com/)（Hacker News 首页项目，7/13 爆发）
- [Kote - Git 工程决策挖掘](https://github.com/)
- [MCP 记忆生态报道 - 今日头条](https://www.toutiao.com/article/7662545651317637668)
- [Model Context Protocol 官方文档](https://modelcontextprotocol.io/)
- [MCP 2026-07-28 Final Spec](https://spec.modelcontextprotocol.io/)
- [Mem0 - AI 记忆平台](https://mem0.ai/)
- [Anthropic Tool Search Tool - 减少 85% Token 用量](https://www.anthropic.com/)
- [Lost in the Middle: 长上下文注意力衰减研究](https://arxiv.org/abs/2307.03172)
- [OWASP Top 10 for Agentic Applications](https://owasp.org/)
- [MCP Production Reckoning: Context Bloat Fix](https://agentmarketcap.ai/blog/2026/07/13/mcp-production-blockers-2026-context-bloat-auth-streaming)
