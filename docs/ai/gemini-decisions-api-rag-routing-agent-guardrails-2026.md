---
title: Gemini Decisions API 实战：打分替代生成，重构 RAG 路由与 Agent 护栏
date: 2026-11-14 07:30:00
author: PFinal南丞
tags:
  - ai
  - rag
  - agent
  - gemini
description: 2026-11-11 Google 发布 Gemini Decisions API：一次前向打分就能回答最多 1000 个是非题、选择题与评分题，输出不计费。本文拆解它的三种题型与校准机制，给出 RAG 前置路由、Agent 工具选择、输出护栏三条落地路径，附可运行的阈值封装与 ECE 校准脚本。
keywords:
  - Gemini Decisions API
  - Gemini Decision 1
  - RAG 路由
  - AI Agent 工具选择
  - LLM 分类器
  - 置信度校准
  - LLM 护栏
  - 多模态评测
  - google-genai SDK
  - LLM 成本优化
---

> TL;DR：2026-11-11，Google 发布 **Gemini Decisions API**（模型 `gemini-decision-1`）。它不生成文字，而是对一段共享的多模态输入，一次前向就给出最多 **1000 个问题**的概率答案——是非题、选择题、有序评分三种。端到端 150–250 ms、输入 $0.10/1M tokens、**输出零计费**。对 RAG 路由、Agent 工具选择、内容护栏这类"闭集判断"，它比让 LLM 逐 token 吐 JSON 便宜且稳。

## 一、为什么"分类"不该让 LLM 写字

过去两年，我们做路由和打标的默认姿势是这样的：给模型一段 prompt，要求"只输出 JSON，label 从这三个里选"，然后 `json.loads`。这套做法在工程上有三个结构性缺陷，而且都不是调参能解决的：

| 缺陷 | 表现 | 根因 |
|---|---|---|
| 延迟不可控 | 首 token 之后还要解码到 `}`，P99 抖到秒级 | 生成是自回归的，逐 token 计费也逐 token 耗时 |
| 成本被输出吃掉 | 分类只需 1 个 token，却要付整段 JSON 的输出费 | 按输出 token 计费 |
| 置信度不可信 | 模型自称 0.95，实际准确率只有 0.7 | 生成式模型没有校准（calibration）机制 |

第三点最要命。你要用它做"低置信度转人工"，可它给的概率是编出来的——本质上是"看起来像概率的文字"，而不是概率。拿这种数字定阈值，等于用假秤称重。

Decisions API 的思路是把这个任务从"生成"搬回"判别"：**不解码、不打字，一次前向直接把候选答案的分数算出来**。官方给出的口径是：单次请求可评估最多 1000 个问题，端到端 150–250 ms（其中模型计算 50–100 ms），输入 $0.10/1M tokens、输出 $0、无 thinking token 与单独 OCR/转写费用；问题数量从 1 增加到 100，延迟近乎平坦，因为所有问题在同一次前向里并行打分。

## 二、协议长什么样：共享输入 + 问题集

请求结构只有两块，理解这两块就理解了这个 API 的全部：

- `input`：一段共享的多模态内容，格式与 Interactions API 的 `Content` block 一致，支持 text / image / audio / video / PDF，可混排。**这部分每次请求只计费一次**，不管你问 1 个还是 1000 个问题。
- `questions`：一个字典，键是你自己起的名字，值是一个题型定义。每个问题的 instruction 与 criteria 才单独计 token。

三种题型是它的全部表达力：

| 题型 | 语义 | 返回 | 适用场景 |
|---|---|---|---|
| `noul`（是非） | 判断某个条件是否成立，可给 true/false 的判定标准 | 概率 0–1 + 置信度 | 政策校验、敏感内容判定、要不要检索 |
| `choice`（选择） | 从 2–255 个候选里选一个 | 胜出项 + 每个候选的归一化概率 | 工具选择、意图路由、模型分档 |
| `score`（评分） | 按有序 rubric（从 0 开始）打分 | 连续加权分 + 每个档位的概率 | 质量评级、严重度、风险分级 |

注意 `score` 返回的是**连续分**而不是离散档位，这让你可以定"≥1.5 转人工"这种细粒度阈值，而不是被三档卡死。

## 三、跑起来：从最小调用到生产封装

官方 Python 示例用的是 `google-genai` SDK 的 `client.decisions.create`。下面把它换成一个更贴近业务的场景：电商客服工单的自动分流。

### 3.1 最小可用调用

```python
from google import genai

client = genai.Client(http_options={"api_version": "v1beta"})

resp = client.decisions.create(
    model="gemini-decision-1",
    input=[
        {"type": "text", "text": "用户留言：收到的耳机左耳没声音，包装已拆，要求退货。"},
        {"type": "image", "uri": "https://example.com/ticket-1024.jpg", "mime_type": "image/jpeg"},
    ],
    questions={
        "needs_refund": {
            "type": "noul",
            "instructions": "用户是否明确要求退款或退货？",
            "true_criteria": "出现退款、退货、退钱等明确诉求",
            "false_criteria": "仅咨询物流、保修政策或使用方法",
        },
        "route": {
            "type": "choice",
            "instructions": "这条工单应路由到哪个队列？",
            "criteria": {
                "refund_queue": "涉及退款退货，需人工审核凭证",
                "tech_queue": "功能故障排查，可自助解决",
                "logistics_queue": "物流时效、包裹丢失",
            },
        },
        "severity": {
            "type": "score",
            "instructions": "评估工单处理优先级。",
            "criteria": [
                "可自助解决，无情绪风险",
                "需人工介入，用户情绪平稳",
                "高价值商品或用户已表达强烈不满",
            ],
        },
    },
)
```

一个请求同时拿到"是否退款""路由到哪""优先级多高"三个答案，而共享的那段文字与图片只付一次输入费。

### 3.2 生产封装：阈值、回退与结构化

真实系统里，`choice` 的概率分布比"最高分"更有用——第二名的概率高说明模型在犹豫，这种样本应该进人工队列，而不是硬选一个。

```python
from dataclasses import dataclass

@dataclass
class Decision:
    route: str
    route_conf: float
    margin: float          # 第一名与第二名的概率差
    severity: float
    needs_refund: float

def decide(ticket_text: str, image_uri: str | None) -> Decision:
    inp = [{"type": "text", "text": ticket_text}]
    if image_uri:
        inp.append({"type": "image", "uri": image_uri, "mime_type": "image/jpeg"})

    r = client.decisions.create(
        model="gemini-decision-1",
        input=inp,
        questions={
            "needs_refund": {"type": "noul", "instructions": "用户是否明确要求退款或退货？"},
            "route": {
                "type": "choice",
                "instructions": "这条工单应路由到哪个队列？",
                "criteria": {
                    "refund_queue": "涉及退款退货",
                    "tech_queue": "功能故障排查",
                    "logistics_queue": "物流时效问题",
                },
            },
            "severity": {
                "type": "score",
                "instructions": "评估处理优先级。",
                "criteria": ["可自助", "需人工", "高价值或强不满"],
            },
        },
    )

    q = r.questions["route"]
    probs = sorted(q.probabilities.items(), key=lambda kv: kv[1], reverse=True)
    top, second = probs[0], (probs[1] if len(probs) > 1 else ("", 0.0))

    d = Decision(
        route=top[0],
        route_conf=top[1],
        margin=top[1] - second[1],
        severity=r.questions["severity"].score,
        needs_refund=r.questions["needs_refund"].probability,
    )

    # 双阈值：置信度低 或 与第二名拉不开差距 → 转人工
    if d.route_conf < 0.70 or d.margin < 0.15:
        d.route = "human_queue"
    # 高档位评分一律人工复核
    if d.severity >= 1.5:
        d.route = "human_queue"
    return d
```

这段代码里有两个工程决定值得解释：

1. **`margin` 比 `conf` 更可靠**。模型对"退款 vs 物流"这种互斥选项，两个都给 0.45 时，`conf` 看上去还过得去，但 `margin` 直接暴露了它在猜。用 `margin < 0.15` 兜底，比单纯调高 `conf` 阈值更能抓住边界样本。
2. **`score` 用连续分定阈值**。`severity >= 1.5` 这种写法，比"模型输出高危/中危标签"稳定得多——分数是算出来的，标签是写出来的。

### 3.3 校准验证：别信置信度，先测 ECE

用置信度做分流，前提是置信度真的校准过。标准做法是拿一批人工标注样本跑一遍，算 ECE（Expected Calibration Error）：把所有样本按置信度分桶，比较每桶的平均置信度与实际准确率。

```python
def expected_calibration_error(samples, n_bins=10):
    """samples: [(confidence, correct_bool), ...]"""
    bins = [[] for _ in range(n_bins)]
    for conf, ok in samples:
        idx = min(int(conf * n_bins), n_bins - 1)
        bins[idx].append((conf, ok))

    ece, total = 0.0, len(samples)
    for b in bins:
        if not b:
            continue
        acc = sum(1 for _, ok in b if ok) / len(b)
        avg_conf = sum(c for c, _ in b) / len(b)
        ece += (len(b) / total) * abs(acc - avg_conf)
    return ece
```

跑法很简单：取 500 条历史工单，人工标好正确路由，逐条调用 `decide()`，把 `(route_conf, route == 人工标注)` 喂进去。**ECE 小于 0.05 才算能用**——这个量级意味着"它说 0.8 的时候，实际对的比例大约就是 0.8"。官方在多个 benchmark 上报的 Top-1 ECE 是 0.0399，同场对标的通用模型是 0.0494 / 0.0791 / 0.2104，后两个基本不具备定阈值的能力。你自己业务上的 ECE 还得自己测，因为校准误差和输入分布强相关。

## 四、三条落地路径

Decisions API 的价值不在"能分类"，而在"能在一次请求里、以毫秒级、按你的标准分类"。落到具体系统上有三条路。

### 4.1 RAG 前置路由：先判断"要不要检索"

Naive RAG 最大的浪费是"每条问题都检索一遍，哪怕它根本不需要外部知识"。用 `noul` + `choice` 组合，可以在检索之前做闸门：

```python
questions = {
    "needs_retrieval": {
        "type": "noul",
        "instructions": "回答该问题是否需要检索内部知识库？",
        "true_criteria": "涉及内部制度、产品参数、历史工单等私有事实",
        "false_criteria": "闲聊、通用常识、纯格式转换",
    },
    "kb": {
        "type": "choice",
        "instructions": "命中哪个知识库？",
        "criteria": {
            "product_docs": "产品手册、参数、兼容性",
            "policy": "退换货、发票、合规制度",
            "none": "不需要检索",
        },
    },
}
```

判定 `needs_retrieval < 0.5` 就直接走轻量模型回答，省掉一次向量检索 + 一次长上下文生成；判定命中 `policy` 就去制度库。这套"先判后检"和 Agentic RAG 的自适应检索是同一思路，只是把判断环节从"让模型想一想"换成了"让模型打一次分"——延迟从几百毫秒到一两秒，压到 200 ms 量级。

### 4.2 Agent 工具选择：在 function calling 之前收窄候选

工具多起来之后，把几十个工具的 schema 全塞进 prompt 让模型选，既贵又不稳。两个阶段更划算：先用 `choice` 把 50 个工具收窄到 3 个（候选名 + 一句话说明放 criteria），再把这 3 个的完整 schema 交给生成模型做参数填充。

`choice` 上限 255 个候选，工具数量在这个量级内都不用改架构。而且它返回的是全候选的归一化概率，你可以把"前 3 名概率和 < 0.8"的请求直接判定为"意图不明"，走澄清话术，而不是让 Agent 拿着一个错工具硬跑。

### 4.3 输出护栏：把"审核"从生成改成打分

内容护栏最典型的需求是"这条回复有没有踩红线"。用生成式模型做审核，你会得到一个"是/否 + 理由"的文本，还要再解析；用 `noul` 一次拿到概率，用 `score` 拿到严重度，纯数值，直接进策略引擎。

| 任务 | 题型 | 建议阈值 | 兜底动作 |
|---|---|---|---|
| 是否需要检索 | `noul` | 0.5 | 低于阈值走轻量回答 |
| 工具/队列路由 | `choice` | conf 0.7 + margin 0.15 | 转人工或澄清 |
| 内容合规审核 | `noul` | 0.85（宁可误杀） | 拦截并记录 |
| 风险分级 | `score` | ≥1.5 | 人工复核 |

Google 自己在 Search 里就是用这套东西做 MCP 工具的对抗行为检测——工具调用的输入输出是"闭集判断"的典型场景，判断延迟必须落在用户可感知的预算内。

## 五、成本账怎么算

它的计价模型有两个反直觉的地方，算错了会得出完全相反的结论：

1. **输出不计费**。传统生成式分类，输出 200 token 的 JSON 要按输出价付；这里有 0 输出 token。
2. **共享输入只算一次**。同一段 2K token 的文档，问 1 个问题和问 100 个问题，文档部分只计一次，只有每题的 instruction/criteria 递增。

按 $0.10/1M 输入 token 粗算三种典型负载：

| 场景 | 单次 token 估算 | 100 万次调用成本 |
|---|---|---|
| 单题路由（1.5K 输入 + 1 题） | ≈ 1.6K | ≈ $160 |
| 三题工单分流（2K 输入 + 3 题） | ≈ 2.3K | ≈ $230 |
| 50 题批量质检（8K 输入 + 50 题） | ≈ 13K | ≈ $1,300 |

对比官方给的对照：同样跑一套基准，几个通用模型走生成式接口的等效价格是 $0.48 / $0.93 / $4.14 每 1M token 量级，也就是说在分类任务上便宜了 5 倍以上——而且这个倍数是**在输出不计费的前提下**算出来的，实际业务里生成式方案还要额外付 JSON 输出的钱。

## 六、生产落地的六个坑

1. **把置信度当准确率**。必须先跑 3.3 的 ECE，再定阈值。官方基准的 0.0399 是在它的评测集上，不是在你的数据上。
2. **criteria 写得含糊**。`choice` 的候选描述就是判定标准，写"适合技术问题"这种话等于没写。要写成可判定的条件，最好带上反例。
3. **上下文长度预期错位**。输入上限能到 256K tokens，但官方公布的延迟与基准数据是在 16K 上下文内测的；把整本手册塞进去做判断，延迟和成本都会偏离预期。长文档先切片，再按需喂。
4. **多模态分辨率不设限**。图像/视频有分辨率参数，直接决定 token 消耗。做"有没有污渍"这种判断，低分辨率够用；做"票据金额是否一致"才需要高分辨率。
5. **把它当生成模型用**。它不产出文本，别指望它解释理由。要可解释性，就自己在 criteria 里编码理由维度，再配合日志。
6. **没有降级路径**。API 抖动或配额打满时，必须有本地兜底（规则引擎或小模型），并且这个兜底要能接受"分类质量下降"而不是直接 500。

## 七、结论

Gemini Decisions API 真正改变的不是"多了一个模型"，而是把一类任务从**生成**挪回了**判别**：

- 对 RAG，它提供了一个 200 ms 级的前置闸门，让"要不要检索"变成可算的概率题；
- 对 Agent，它把工具选择从"塞满 prompt 让模型挑"变成"打分收窄候选"，成本与稳定性同时改善；
- 对护栏，它给的是数值而不是文本，策略引擎可以直接消费。

用一句话概括取舍：**凡是"候选集有限、答案可枚举"的判断，都不该交给逐 token 解码的模型**。先算一遍 ECE，再定一个你愿意承担误判代价的阈值，这类任务就能从"玄学调 prompt"变成有 SLA 的工程件。

延伸阅读：RAG 的自适应检索循环可以看 [Agentic RAG 架构 2026](/ai/agentic-rag-architecture-2026)；如果你在用 Go 搭 MCP 服务，[MCP 2.0 无状态服务器实战](/dev/backend/golang/go-mcp-2-0-stateless-server-production-2026)里的工具注册模型正好可以和这里的工具收窄配合；工具链安全侧的新进展见上一篇 [Go 1.27.4 的 12 个 CVE 拆解](/dev/backend/golang/go-1-27-4-12-cve-build-time-rce-toolchain-hardening-2026)；更多 AI 工程文章在 [AI 专栏](/ai/)汇总。

## 参考资料

- [Gemini Decisions API: Fast, calibrated multimodal decisions](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-decisions-api/) — Google 官方发布文，2026-11-11，含 API 参数、计价与基准数据
- [Gemini API 文档：Decisions](https://ai.google.dev/gemini-api/docs/decisions) — 请求结构与题型定义
- [google-genai Python SDK](https://github.com/googleapis/python-genai) — `client.decisions.create` 的 SDK 实现
- [Google AI Studio](https://aistudio.google.com/) — 获取 API key 与无额度限制的原型试用
- [Gemini 4 Hydrogen 发布说明](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introduce-gemini-4-hydrogen/) — 同批次模型更新
