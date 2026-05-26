---
title: "LLM 应用架构设计：从 RAG 到 Agent 的实战指南"
description: "系统梳理 LLM 应用架构模式，从基础 RAG 到复杂 Agent 系统，包含 Go 实现示例"
date: 2026-05-26
author: PFinal南丞
category: AI工程
tags: [ai, llm, architecture, rag, agent, golang]
keywords:
  - LLM 应用架构
  - RAG 系统设计
  - AI Agent
  - Go AI 开发
  - 大模型应用
---

# LLM 应用架构设计：从 RAG 到 Agent 的实战指南

## 为什么需要分层架构

LLM 应用与传统软件最大的区别在于：**LLM 的输出不是确定性的**。这意味着我们需要在架构中加入更多的容错、验证和兜底机制。

## 架构层级

```
┌─────────────────────────────────────────┐
│           用户界面层 (UI)                  │
│    Web / 桌面 / 即时通讯 / API 网关        │
├─────────────────────────────────────────┤
│           交互管理层 (Orchestration)       │
│    对话管理 / 工具路由 / 上下文维护 / 重试    │
├─────────────────────────────────────────┤
│           LLM 编排层 (Reasoning)           │
│    Prompt 模板 / Chain / Agent / Function │
├─────────────────────────────────────────┤
│           数据服务层 (Knowledge)            │
│    向量数据库 / 全文检索 / RAG / 缓存       │
├─────────────────────────────────────────┤
│           基础设施层 (Infra)                │
│    LLM API / Embedding / 模型服务 / 监控    │
└─────────────────────────────────────────┘
```

### 1. 数据服务层（RAG 架构）

RAG（Retrieval-Augmented Generation）是目前最成熟的 LLM 应用架构：

```go
// Go 实现 RAG 查询
type RAGService struct {
    embedder  Embedder       // 文本向量化
    vectorDB  VectorStore    // 向量数据库
    llm       LLMClient      // LLM 客户端
    prompt    PromptTemplate
}

func (s *RAGService) Query(ctx context.Context, question string) (*Answer, error) {
    // 1. 向量化用户问题
    queryVec, err := s.embedder.Embed(ctx, question)

    // 2. 检索相关文档
    docs, err := s.vectorDB.SimilaritySearch(ctx, queryVec, 5)

    // 3. 构建 Prompt
    prompt := s.prompt.Format(question, docs)

    // 4. LLM 生成答案
    answer, err := s.llm.Generate(ctx, prompt)

    // 5. 返回结果（附引用来源）
    return &Answer{Content: answer, Sources: docs}, nil
}
```

**关键设计决策：**

| 决策 | 选项 | 推荐 |
|------|------|------|
| 向量数据库 | Milvus / Qdrant / PGVector | PGVector（小规模），Milvus（大规模）|
| 分块策略 | 固定大小 / 语义分块 / 递归分块 | 语义分块 + 重叠窗口 |
| 检索策略 | 向量检索 / 关键词检索 / 混合检索 | 混合检索（HyDE + BM25）|
| 重排序 | Cohere Rerank / BGE Reranker | 检索后 top-30 → 重排取 top-5 |

### 2. LLM 编排层（Agent 架构）

Agent 的核心是 **ReAct（Reasoning + Acting）模式**：

```go
type Agent struct {
    llm   LLMClient
    tools map[string]Tool
}

type Tool struct {
    Name        string
    Description string
    Execute     func(ctx context.Context, args string) (string, error)
}

func (a *Agent) Run(ctx context.Context, task string) (string, error) {
    maxIterations := 10
    messages := []Message{{Role: "user", Content: task}}

    for i := 0; i < maxIterations; i++ {
        // 1. LLM 思考（选择工具或直接回答）
        resp, err := a.llm.Chat(ctx, messages)

        if resp.Finished { // LLM 认为任务完成
            return resp.Content, nil
        }

        // 2. 执行工具调用
        result, err := a.tools[resp.ToolName].Execute(ctx, resp.ToolArgs)

        // 3. 将结果加入对话
        messages = append(messages,
            Message{Role: "assistant", Content: resp.Thought},
            Message{Role: "tool", Content: result},
        )
    }

    return "", fmt.Errorf("max iterations exceeded")
}
```

### 3. 交互管理层

该层解决的是工程化问题：

- **对话管理**：维护上下文窗口，防止 Token 溢出
- **工具路由**：根据用户意图选择合适的工具链
- **重试与降级**：API 调用失败时自动重试或降级服务
- **缓存策略**：相同问题的答案缓存，减少 API 调用

```go
// 基于 LRU 的语义缓存
type SemanticCache struct {
    cache     *lru.Cache
    threshold float64 // 语义相似度阈值
    embedder  Embedder
}

func (c *SemanticCache) Get(ctx context.Context, query string) (string, bool) {
    qVec, _ := c.embedder.Embed(ctx, query)
    for _, entry := range c.cache.Values() {
        sim := cosineSimilarity(qVec, entry.Vector)
        if sim > c.threshold {
            return entry.Answer, true
        }
    }
    return "", false
}
```

## 架构选型指南

| 场景 | 推荐架构 | 复杂度 |
|------|----------|--------|
| 文档问答 | RAG（基础） | ⭐⭐ |
| 代码生成 | RAG + Code Retrieval | ⭐⭐⭐ |
| 自动化任务 | Agent + Tool | ⭐⭐⭐⭐ |
| 多步推理 | Agent + RAG + Memory | ⭐⭐⭐⭐⭐ |
| 客服系统 | RAG + Agent + 人机协作 | ⭐⭐⭐⭐ |

## 生产环境注意事项

1. **监控三大指标**：成功率、延迟、Token 消耗
2. **成本控制**：设置单次请求 Token 上限、使用模型分级（简单问题用小模型）
3. **安全性**：Prompt 注入防护、输出内容过滤、敏感信息脱敏
4. **A/B 测试**：同时运行多个 Prompt 版本，对比效果

## 推荐阅读

- [RAG 系统架构设计与实现](/ai/rag-system-architecture)
- [Go 语言开发 AI 智能体：从 Function Calling 到 Agent 框架](/dev/backend/golang/Go语言开发AI智能体：从Function-Calling到Agent框架)
- [Golang 实现 RAG 系统 - 从 OpenAI 到向量数据库](/dev/backend/golang/Golang实现RAG系统-从OpenAI到向量数据库)
