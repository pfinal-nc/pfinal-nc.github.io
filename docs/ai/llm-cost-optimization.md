---
title: "LLM API 成本优化实战：从 Token 管理到模型分级"
description: "深入 LLM 成本控制策略：Token 压缩、缓存、模型分级、调用策略优化"
date: 2026-05-26
author: PFinal南丞
category: AI工程
tags: [ai, llm, cost-optimization, token, caching]
keywords:
  - LLM 成本控制
  - Token 管理
  - AI API 费用优化
  - 模型分级策略
  - 语义缓存
---

# LLM API 成本优化实战

## 为什么成本很重要？

调用 GPT-4 处理 10 万篇文档，仅 Token 费用就可能超过 $1000。对于生产系统，成本控制是 LLM 应用能否持续运行的关键。

## 四大优化策略

### 1. Token 压缩

```go
// 对话历史压缩
func CompressMessages(messages []Message, maxTokens int) []Message {
    var totalTokens int
    var kept []Message

    // 始终保留系统提示和最新的用户消息
    if len(messages) > 0 {
        kept = append(kept, messages[0]) // 系统提示
        totalTokens += CountTokens(messages[0])
    }

    // 从最新的消息开始反向保留
    for i := len(messages) - 1; i >= 1; i-- {
        tokens := CountTokens(messages[i])
        if totalTokens+tokens > maxTokens {
            // 用摘要替代旧消息
            summary := Summarize(messages[1 : i+1])
            kept = append([]Message{{Role: "system", Content: summary}}, kept...)
            break
        }
        kept = append([]Message{messages[i]}, kept...)
        totalTokens += tokens
    }

    return kept
}
```

### 2. 语义缓存

相同或相似的问题直接返回缓存结果：

```go
type CacheConfig struct {
    MaxSize     int     // 最大缓存条目
    Similarity  float64 // 语义相似度阈值(0.85-0.95)
    TTL         time.Duration
}

// 实测数据：缓存命中率通常 30-60%
// GPT-4 pricing: $0.03/1K input, 假设缓存命中 50%
// 10M tokens/day → 节省 $150/天
```

### 3. 模型分级

不同类型的问题用不同级别的模型处理：

```go
type ModelTier int

const (
    TierCheap ModelTier = iota // 简单任务
    TierStandard               // 常规任务
    TierPremium                // 复杂任务
)

type Router struct {
    cheap   LLMClient  // 如 GPT-4o-mini
    standard LLMClient // 如 GPT-4o
    premium LLMClient  // 如 o3 / Claude Opus
}

func (r *Router) SelectModel(task Task) LLMClient {
    switch {
    case task.Difficulty == "simple":
        return r.cheap   // 翻译、分类、格式化 → $0.15/1M tokens
    case task.RequiresReasoning:
        return r.premium // 多步推理、代码生成 → $15/1M tokens
    default:
        return r.standard // 一般问答、内容生成 → $2.5/1M tokens
    }
}
```

### 4. 调用策略优化

```go
// 批量处理（减少 API 调用次数）
type BatchProcessor struct {
    batchSize int
    interval  time.Duration
    buffer    []Request
    mu        sync.Mutex
}

func (b *BatchProcessor) Add(req Request) <-chan Response {
    ch := make(chan Response, 1)
    b.mu.Lock()
    req.ch = ch
    b.buffer = append(b.buffer, req)
    b.mu.Unlock()
    return ch
}

func (b *BatchProcessor) flush() {
    b.mu.Lock()
    batch := b.buffer
    b.buffer = nil
    b.mu.Unlock()

    if len(batch) == 0 {
        return
    }

    // 批量发送给 LLM
    combinedPrompt := buildBatchPrompt(batch)
    responses := callLLMBatch(combinedPrompt)

    for i, resp := range responses {
        batch[i].ch <- resp
    }
}
```

## 成本估算模型

| 模型 | 输入价格 (/1M tokens) | 输出价格 (/1M tokens) | 适用场景 |
|------|----------------------|----------------------|----------|
| GPT-4o-mini | $0.15 | $0.60 | 分类、提取、格式化 |
| GPT-4o | $2.50 | $10.00 | 一般问答、内容生成 |
| GPT-4-turbo | $10.00 | $30.00 | 复杂推理（已降级） |
| o3-mini | $1.10 | $4.40 | 推理任务替代方案 |
| Claude 3.5 Sonnet | $3.00 | $15.00 | 代码生成 |

## 实战案例：客服系统优化

```
优化前：全部使用 GPT-4，日均 $120
优化后：
  40% 请求 → GPT-4o-mini（简单问答）： $5
  40% 请求 → 语义缓存命中（重复问题）： $0
  15% 请求 → GPT-4o（一般问题）：  $15
   5% 请求 → Claude 3.5（复杂投诉）： $4
                              合计：$24/天

节省：80%
```

## 监控与告警

```go
type CostMonitor struct {
    dailyCost    float64
    monthlyLimit float64
    alertWebhook string
}

func (m *CostMonitor) Record(request Request, response Response) {
    cost := calculateCost(request.Model, request.Tokens, response.Tokens)
    m.dailyCost += cost

    if m.dailyCost > m.monthlyLimit/30.0*0.8 {
        // 当日消费超过月预算的 80% → 发送告警
        m.sendAlert(fmt.Sprintf("Daily cost $%.2f exceeded 80%% of daily budget", m.dailyCost))
    }
}
```

## 推荐阅读

- [LLM 应用架构设计](/ai/llm-application-architecture)
- [Prompt Engineering 优化指南](/ai/prompt-engineering-guide)
