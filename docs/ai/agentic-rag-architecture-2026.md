---
title: "Agentic RAG 架构 2026：从 Naive RAG 到自我纠错检索循环的自适应演进"
description: "深入解析 Agentic RAG 的五大模式（Self-RAG、CRAG、Adaptive RAG、ReAct、Multi-Hop）、检索即决策的控制循环、LlamaIndex + LangGraph 生产栈与可观测性评估框架"
date: 2026-07-01
tags: [RAG, AI Agent, LLM, LangGraph, LlamaIndex, 检索增强生成, 自适应检索]
category: [AI]
---

# Agentic RAG 架构 2026：从 Naive RAG 到自我纠错检索循环的自适应演进

## 为什么 Naive RAG 到头了

经典 RAG 是个**固定的一次性流水线**：检索一次 → 注入上下文 → 生成。不管检索结果相关不相关、完整不完整、甚至根不需要，都硬着头皮生成。

这个模式有几个硬伤：

1. **一次检索注定不够**——复杂问题要拆成多个子查询，查多个数据源
2. **没评估就生成**——检索回来的垃圾也直接喂给模型
3. **过度检索**——简单问题也跑完整流程，烧钱且慢

Agentic RAG 打破这个约束：把"检索"从一个固定流水线，变成一个**LLM 主导的控制循环**——让模型决定"要不要检索、检索什么、检索够不够好、不够就重写重试"。

代价是每次跳（hop）都要额外的 LLM 调用 + 检索 + 重排。Agentic RAG 比 Naive RAG 的**每次查询成本高一个数量级**——所以第一步永远是"简单查询别进循环"。

## 三大代际：Naive → Advanced → Agentic

| 范式 | 怎么检索 | 精度 | 成本/查询 | 延迟 |
|---|---|---|---|---|
| **Naive RAG** | 固定一次，全量嵌入 | 低 | 基准 | 低 |
| **Advanced RAG** | 混合检索 + 重排 + 查询改写 | 中 | + | 中 |
| **Agentic RAG** | 控制循环，LLM 决定检索策略 | 高 | 高（约 10 倍） | 高 |

## Agentic RAG 的五个核心模式

生产里的 Agentic RAG 由五个命名模式构成（权威分类见 [Agentic RAG 综述论文 arXiv 2501.09136](https://arxiv.org/abs/2501.09136)）。大多数生产系统会**组合两到三个**，纯单模式部署很罕见且通常不对。

### 1. Self-RAG：模型自省

模型在生成时输出**反思 token**（reflection tokens），用结构化信号自我评估检索质量：这段检索相关吗（`IsRelevant`）？引用支持我的回答吗（`IsSupportive`）？不相关就丢弃，不支持就标记人工审查而不是静默返回。

```python
# Self-RAG 的评估门
review = critic.grade(draft, context)
# 返回结构化: {faithful: bool, confidence: float, gap: str}
if review.faithful and review.confidence >= CONF_TARGET:
    return draft
# 否则: 重写子查询 / 换数据源 / 升级
```

### 2. CRAG（Corrective RAG）：检索纠正器

在检索后放一个**相关性评估器**，根据结果路由：

- 检索质量好 → 直接用
- 检索质量差 → **重写查询再检索**，或升级到 web 搜索等外部源

### 3. Adaptive RAG：按查询难度自适应（2026 的 SOTA）

**在检索器前放一个小分类器**（T5-Large），预测查询难度：无需检索 / 单步检索 / 多步检索。

- 简单查询直接跳过 agent——**根本不进循环**
- 难查询才进多步循环
- 用一个小 T5-Large 做复杂度分类（论文 arXiv 2403.14403 已证明更小的分类器也能持平效果）

Adaptive-RAG 论文实测的三类查询时间分布（Table 3）印证了"按难度分流"的价值：

| 分类 | 每查询耗时 | 占比 |
|---|---|---|
| 无需检索 (No) | 0.35s | 8.6% |
| 单步检索 (Single) | 3.08s | 53.3% |
| 多步检索 (Multi) | 27.18s | 38.1% |

注意：即使论文里 Multi 查询占比高达 38%，分流仍然显著划算——因为它把 8.6% 的简单查询从 3~27 秒的延迟里捞出来直接答。综述报告 Adaptive 路由平均能**降低约 20-25% 的检索成本**，同时保住复杂查询的准确率。这就是 Agentic RAG 经济上成立的关键——前提是你的查询流确实有难度分层。

> 什么时候 Adaptive 不划算：查询流清一色困难。如果每个查询都要多跳推理，分类器就成纯税赋没收益。

### 4. ReAct over documents：检索工具的推理-行动循环

ReAct（reason-act loop）泛化到检索：agent 每步可以调用多个检索工具，边推理边检索。

### 5. Multi-Hop：多跳查询分解

把复杂问题**拆成子查询再重组**：

>"对比我们过去五个客户合同里的 SOC 2 条款，标出任何与新的 SOC 2 框架冲突的地方"

这种问题没有单次检索能答，必须分解成多次、跨源检索再融合。

## 把循环画出来

Agentic RAG 的架构不是线性流水线，而是**带反馈边、决策节点、显式循环条件的控制回路**：

```
        ┌─────────────────────────────────────────────┐
        │                                             │
        ▼                                             │
  [Planner 分解]──▶[Hybrid Search 混合检索]──▶[Rerank 重排]
        │                                             │
        │           (BM25 + dense + RRF)              │
        ▼                                             │
  [Generator 生成]──▶[Critic 评估]──▶ 通过? ──▶ 返回答案
                              │                      │
                              │ 不通过                │
                              ▼                      │
                      [Replan 重写子查询]─────────────┘
```

核心伪代码：

```python
def agentic_rag(query, max_hops=4, conf_target=0.8):
    plan = planner.decompose(query)      # 子查询 + 预算
    context, hops = [], 0
    while hops < max_hops:
        for sub_q in plan.pending():
            hits = hybrid_search(sub_q, k=50)   # BM25 + dense + RRF
            ranked = cross_encoder.rerank(hits)[:8]
            context += assemble(ranked)         # 去重 + 打包
        draft = generator.answer(query, context)
        review = critic.grade(draft, context)   # 忠实度 + 覆盖度
        if review.faithful and review.confidence >= conf_target:
            return draft
        plan = planner.replan(query, review)    # 重写失败的子查询
        hops += 1
    return abstain_or_escalate(query)   # 预算花完，承认或升级
```

## 2026 生产栈：LlamaIndex + LangGraph

2026 最常用的生产组合：

| 框架 | 定位 | 擅长 |
|---|---|---|
| **LlamaIndex** | 检索 + 摄取 | chunking、embedding、混合检索、重排、Self-RAG/Graph RAG、RAG 评估 |
| **LangGraph** | 编排 + 控制循环 | 状态机、checkpointing、条件分支、Adaptive RAG 路由 |
| **AutoGen** | 多 Agent 对话 | 多 agent 协作模式 |
| **CrewAI** | 快速原型 | 上手门槛最低 |

选型一句话：**检索是你的核心，选 LlamaIndex；编排是你的核心，选 LangGraph。** 两者组合是 2026 最普遍的进阶 Agentic RAG 生产栈。

工具协议也在标准化——从各家自定义 tool wrapper 走向 **MCP**（2025 年 12 月捐给 Linux Foundation），让 agent 的工具调用有了统一协议。

## 关键落地护栏：别让循环失控

Agentic RAG 买到了质量，也买到了一类**新故障**。没有护栏，循环会烧掉你的预算和延迟：

```
护栏清单:
[ ] 硬 hop 上限（如 4 跳）
[ ] token 上限
[ ] 墙上时钟上限
[ ] 置信度阈值
[ ] 评估门必须能"放弃"(abstain)——预算花完就承认答不了，别硬编
[ ] 每跳 trace（哪一跳检索失败，必须能回溯）
```

**放弃（abstain）是特性不是 bug。** 预算花完时，诚实的"信息不足"比自信的错误答案强得多。

### 两个隐蔽陷阱

- **检索漂移**（retriever drift）：激进的查询改写会一步步偏离用户真实意图，每次检索单独看都合理，合起来跑题。对策：把改写**钉回原始查询**，别让重排后的上下文太散。
- **评估作弊**（eval gaming）：只优化单一 LLM-judge 指标，系统会学着"应付裁判"——用几乎不claim 什么的骑墙答案刷高忠实度。用一篮子指标 + 定期人工抽查。**对可疑的完美忠实度分数保持警惕**，那是气味，不是胜利。

## 可观测性：四维评估框架

Agentic RAG 的失败点比静态 RAG 多得多。四个锚定指标（Ragas 定义）是评估程序的底线：

| 指标 | 定义 | 生产目标 | 抓什么 |
|---|---|---|---|
| **Faithfulness** | 回答的每个声称都被检索上下文支持 | ≥0.9 | 幻觉 |
| **Answer relevancy** | 回答是否对题 | ≥0.85 | 跑题生成 |
| **Context precision** | 检索的 chunk 是否相关且排名对 | ≥0.8 | 烂检索 |
| **Context recall** | 检索有没有漏掉必要段落 | ≥0.85 | 缺 chunk |

前两个诊断**生成器**，后两个诊断**检索器**——把它们分开，才能知道该修哪一半。忠实但低 recall 的回答 = 自信地不完整；高 recall 但低忠实 = 生成器没在听证据。

**评估纪律**：先离线在带标签的 golden set 上跑，发布前当门禁；上线后保留采样的在线评估（LLM-as-judge 用人工标签校准）。**没有每跳 trace，生产 agentic 系统就是黑盒**——你只看到 p95 延迟和一个答案，看不到哪一跳检索漏了。评估 + trace 从第一天就一起上。

## 什么时候真需要 Agentic RAG

不是所有 RAG 都要升级。诚实评估：

- **简单知识库问答**：别用。Naive/Advanced RAG 够用，便宜一个数量级
- **混合难度的产品聊天**：Adaptive RAG 最优——按难度分流能省约 20-25% 检索成本
- **多源、多跳、跨库聚合，且质量是硬需求**：上全套 Agentic RAG
- **实体关系驱动**：才考虑 Graph RAG（摄取贵，别投机式上）

记住：**先有能跑的 Naive RAG，再谈 Agentic。** 没把基础检索质量（chunking、hybrid、rerank）做对，Agentic 循环只会放大烂检索。

::: tip
给团队的第一条建议永远是：**先做 Adaptive 路由，让简单查询不盲目进循环**。这既保住 Agentic 在难查询上的质量优势，又让多跳带来的成本放大在整体上不至于失控——不然你优化的那点精度，全被账单吃回去了。
:::
