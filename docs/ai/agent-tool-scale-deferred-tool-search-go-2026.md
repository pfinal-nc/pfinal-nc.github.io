---
title: Agent 工具规模化实战：3000 个工具 68 万 token，Go 实测检索降本
date: 2026-11-22 07:30:00
author: PFinal南丞
tags: [agent, mcp, go, llm, tooling]
description: HubSpot 用 20 行 Java 就能起一个 agent，但工具涨到 3000 个时上下文被 schema 撑爆。本文拿 Go 实测三笔账：工具注入从 680k token 压到 94k、纯 Go BM25 检索召回 34/40、transcript 跨 provider 重映射 20/20 修复。
keywords:
  - agent harness
  - tool search
  - mcp 工具检索
  - bm25
  - function calling
  - context window
  - token 成本
  - go 实现 agent
  - 工具调用
  - 上下文工程
---
# Agent 工具规模化实战：3000 个工具 68 万 token，Go 实测检索降本

## 一、背景：20 行就能写个 agent，然后就没有然后了

写一个 agentic loop 确实只需要几十行：拼 system prompt、带上工具列表、解析 tool call、把结果塞回消息，循环到模型不再调用工具。任何一篇入门文章都能给你这段代码，HubSpot 甚至把它做成了产品级承诺——**20 行 Java 起一个 agent**。

11 月 12 日 HubSpot 工程博客放出 [Aviator](https://hubspot.engineering/blog/aviator-hubspots-agent-harness/)，把他们内部的 agent harness 讲透了：团队已有的 RPC 加两行注解就变成一个工具，`addChirpTool("DealTools#searchDeals")` 直接复用现成服务。落地效果也很夸张，Sidekick Code 每周合并 2,500 个 PR。

但同一篇里有个数字更值得抄下来：

> 在工具注册表的平均定义大小下，3,000 个工具大约是 **200 万 token**，是一百万上下文窗口的两倍。

这句话翻译成工程语言就是：**你的 agent 还没开始思考，上下文已经满了**。站内 [Harness Engineering 那篇](/ai/harness-engineering-claude-code-2026) 讲的是"什么样的循环算合格"，[生产工程化那篇](/ai/ai-agent-production-engineering-2026) 讲的是落地决策；今天这篇只算三笔账——工具注入账、检索账、状态账，每一笔都用 Go 真跑一遍。

## 二、原理：工具不是"多"，是上下文预算被静态占用

单轮对话里，工具 schema 是**每请求都全量重发**的。它不进模型权重，只进 prompt，所以工具数量直接换算成三件事：

| 代价 | 机制 | 表现 |
|---|---|---|
| 钱 | 输入 token 按量计费，全量 schema 每次重复 | 3000 工具的会话，一轮对话就可能烧掉一个月的额度 |
| 延迟 | 预填充阶段要处理全部 schema | 首 token 变慢，prefill 占比随工具数线性上升 |
| 注意力 | 模型要在上千个近似定义里挑一个 | 选错工具、参数拼错、反复试错 |

业界的解法是三段式的，本质都是"把工具从上下文里挪出去，只在需要时搬回来"：

1. **deferred 工具**：初始上下文只留工具名 + 一句话描述，完整 schema 不注入；
2. **tool search**：模型表达意图后，服务端检索命中若干工具，再按需注入全文；
3. **skill 打包**：把"什么时候用、先做什么后做什么"写成 `SKILL.md`，附 `load-tools` / `suggested-tools` 元数据，流程说明和工具一起按需加载。

Anthropic 的 [Agent Skills 规范](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview) 和站内 [Agent Skills 实战](/ai/anthropic-agent-skills-2026) 已经把第三段讲清楚了，MCP 侧的 [FastMCP 3.0](/ai/fastmcp-3-0-production-mcp-server-2026) 也在补工具注册与分发的工程细节。真正没被认真算过的是第一段和第二段——**deferred 到底省多少？检索到底准不准？** 下面用数据回答。

## 三、实测一：3000 个工具，上下文账单到底多长

我写了个生成器，按真实注册表的形状造工具：命名空间 + 驼峰动作名、80–150 字的自然语言描述、3–8 个参数（含数组嵌套）。参数名从业务词池里随机取，避免人为制造"好检索"的假数据。计量方式很直接：把整个工具数组 `json.Marshal` 一遍，看字节数，再按 4 字节/token 粗估。

```go
func toolSchema(t Tool, full bool) map[string]any {
    if !full { // deferred：只留名字和一句话
        return map[string]any{
            "name":        t.Namespace + "#" + t.Name,
            "description": truncate(t.Desc, 70),
        }
    }
    return map[string]any{
        "name":         t.Namespace + "#" + t.Name,
        "description":  t.Desc,
        "input_schema": t.schema(), // type/properties/required/items 全量
    }
}

func payloadBytes(ts []Tool, full bool) int {
    arr := make([]any, 0, len(ts))
    for _, t := range ts {
        arr = append(arr, toolSchema(t, full))
    }
    b, _ := json.Marshal(arr)
    return len(b)
}
```

```
$ go build -o bench . && GOMAXPROCS=2 ./bench
=== EXP1 工具定义上下文账单 ===
n=1000 full_bytes=918212    full_est_tokens=229553 lite_bytes=124323   lite_est_tokens=31080
n=3000 full_bytes=2719001   full_est_tokens=679750 lite_bytes=373073   lite_est_tokens=93268
n=10000 full_bytes=9077221  full_est_tokens=2269305 lite_bytes=1243535 lite_est_tokens=310883
```

整理成表：

| 工具数 | 全量 schema | 全量 token | deferred（名+70字） | deferred token | 占比 |
|---|---|---|---|---|---|
| 1,000 | 918 KB | 22.9 万 | 124 KB | 3.1 万 | 13.5% |
| 3,000 | 2.72 MB | 68.0 万 | 373 KB | 9.3 万 | 13.7% |
| 10,000 | 9.08 MB | 227 万 | 1.24 MB | 31.1 万 | 13.7% |

几个可以直接拿去用的结论：

- **我的 schema 平均 906 字节/工具**，比 HubSpot 的注册表瘦（他们有完整 description + 复杂嵌套）。906 B 对应 68 万 token，他们 2.7 KB/工具正好对得上 200 万 token——两边算的是同一件事，只是工具描述写得更啰嗦。
- **deferred 不是省一点，是省 86%**。名字 + 一句话只占 13.7%，而且这部分预算基本恒定：工具从 3,000 涨到 10,000，占比几乎不变（13.7%），因为"一行描述"的长度有上限。
- 10,000 工具全量注入 227 万 token，已经不是"贵"的问题，是**根本放不进任何窗口**。

但 deferred 只是把账推迟了：模型得先知道"有这么一个工具"，才谈得上去检索它。这就是第二笔账。

## 四、实测二：纯 Go BM25 检索，召回 34/40 与 0.37ms

检索层我故意不用向量库——站内 [Go 向量检索](/dev/backend/golang/go-vector-search-pgvector-qdrant-rag-2026) 已经测过 pgvector/Qdrant，这里是 3,000 条短文档的精确匹配场景，倒排 + BM25 足够，而且零依赖、可解释、能增量更新。

核心就三块：分词（含驼峰切分）、倒排表、BM25 打分。

```go
type posting struct{ doc, tf int }

func buildP(ts []Tool, useStem bool) *PIndex {
    ix := &PIndex{post: map[string][]posting{}, df: map[string]int{}}
    for i, t := range ts {
        toks := tokenize(t.Namespace + " " + t.Name + " " + t.Desc)
        for _, p := range t.Params { toks = append(toks, tokenize(p.Name)...) }
        m := map[string]int{}
        for _, w := range toks {
            if useStem { w = stem(w) }
            m[w]++
        }
        for w, f := range m {
            ix.df[w]++
            ix.post[w] = append(ix.post[w], posting{i, f})
        }
        ix.dl = append(ix.dl, len(toks))
    }
    return ix
}

func (ix *PIndex) search(q string, topK int, useStem bool) []Hit {
    scores := map[int]float64{}
    for _, term := range tokenize(q) {
        if useStem { term = stem(term) }
        pl := ix.post[term]
        if len(pl) == 0 { continue }
        idf := math.Log(1 + (float64(ix.N)-float64(len(pl))+0.5)/(float64(len(pl))+0.5))
        for _, po := range pl {
            f := float64(po.tf)
            scores[po.doc] += idf * f * (k1 + 1) / (f + k1*(1-b+b*float64(ix.dl[po.doc])/ix.avgdl))
        }
    }
    // 取 topK ...
}
```

查询集是我按"用户会怎么说"造的 40 条，不是从描述里抄词：形如 `find deals to search by owner last week`——对象用复数、动作用用户口语、再带一个该工具独有的参数名。两条基线对比：

| 方案 | p50 | p99 | 精确命中 top1 | 精确命中 top5 |
|---|---|---|---|---|
| 倒排 BM25（不做词形归一） | 0.32 ms | 1.0–1.4 ms | **1/40** | 9/40 |
| 倒排 BM25（加 4 行 stem） | 0.37 ms | 0.64–0.85 ms | **20/40** | **34/40** |
| 逐条 `strings.Contains` 扫描 | 2.8 ms | 5.0–5.3 ms | 0/40 | — |

（2 核云主机、Go 1.23、3,000 条文档、三轮取中位；索引构建 28–50 ms）

最刺眼的一行是 `1/40`。原因不是算法，是**词形**：工具名 `searchDeal` 被切成 `search` + `deal`，而用户写的是 `deals`；`invoice` 与 `invoices`、`company` 与 `companies` 同理，倒排表里根本是两个不同的 key。补一个 stem 函数就翻盘：

```go
func stem(w string) string {
    if len(w) > 4 && strings.HasSuffix(w, "ies") { return w[:len(w)-3] + "y" }
    if len(w) > 4 && strings.HasSuffix(w, "es")  { return w[:len(w)-2] }
    if len(w) > 3 && strings.HasSuffix(w, "s") && !strings.HasSuffix(w, "ss") { return w[:len(w)-1] }
    return w
}
```

`top1` 只有 20/40 也有讲究：我的生成器按"动作 + 对象"命名，3,000 个工具散在 10 个命名空间里，同一个 `searchDeal` 会存在 3–5 个副本。检索其实命中了正确的语义组，但 top-1 落在同组另一个命名空间的工具上。**这说明工具注册表有重复时，top-1 精度没有意义，要看 top-5 的命中集合**——实践里 k 取 5 不是浪费预算，是给重复工具留冗余。

第三个坑更硬：同义词。我把运营口语词直接喂给索引，倒排表里全是零：

| 用户口语 | df | 工具里的规范词 | df |
|---|---|---|---|
| customer | 0 | contact | 885 |
| case | 0 | ticket | 644 |
| bill | 0 | invoice | 715 |
| cost | 0 | amount | 521 |
| sale | 0 | deal | 869 |
| person | 0 | owner | 652 |
| group | 0 | team | 640 |
| file | 0 | document | 644 |

8 个口语词一个都检索不到。BM25 是**词汇匹配**，它不理解"客户"和"联系人"是一回事。生产上有三条路，成本递增：写 alias 表（一个 map，20 行，最便宜）、让工具描述里塞业务别名（污染 prompt，但简单）、上 embedding 混合检索（效果好，但要模型、要向量库、要延迟预算）。我的建议是先 alias，评测集证明不够再上向量——不要一上来就为检索引入一个服务。

## 五、实测三：transcript 跨 provider，透传能跑但会被 400

Aviator 另一个值得学的设计是**中立 transcript**：内部只维护一种消息格式，模型客户端负责跟各家 API 互转。好处是能中途换模型、能把对话当 durable log 存下来、能让不同 agent 交接同一段历史。

代价全在细节里。我用 Go 造了 20 轮工具对话（每轮一次调用 + 一次结果），分别转 OpenAI 风格和 Anthropic 风格，然后模拟 Anthropic 侧的校验规则：`tool_use.id` 必须带 `toolu_` 前缀，`tool_result.tool_use_id` 必须精确命中。

```go
// 正确做法：换 provider 时重写 ID，并同步所有引用
func toAnthropicRewrite(turns []Turn, prefix string) []AntItem {
    out := make([]AntItem, 0, len(turns))
    for _, t := range turns {
        nid := prefix + t.ToolID // toolu_ + call_0001
        if t.Role == "assistant" {
            out = append(out, AntItem{Type: "tool_use", ID: nid, Name: t.Name, Input: t.Input})
        } else {
            out = append(out, AntItem{Type: "tool_result", UseID: nid, Content: t.Output})
        }
    }
    return out
}
```

```
naive   bad_prefix=20 dangling=0
rewrite bad_prefix=0  dangling=0
openai_payload_bytes=5328 items=40
convert p50_us=12  p99_us=102
```

注意 `naive` 那一行的诡异之处：**引用悬空是 0**。因为原样透传时，`tool_use.id` 和 `tool_result.tool_use_id` 用的是同一个字符串，内部完全自洽——只是不符合目标 provider 的 ID 规范。这就是最典型的坑：自家校验能过，上线 400，日志里还看不出哪里不对。

转换本身的成本可以忽略：2,000 轮转换 p50 是 12 µs、p99 约 100 µs，20 轮 40 条 item 序列化后 5.3 KB。真正贵的是"语义漂移"——换模型时那些 provider 私有的 reasoning block、cache 标记不能原样搬运，得按目标模型的能力重建，否则历史会污染下一次推理。这部分没法用毫秒衡量，只能靠回放对比。

顺带一个容易被忽略的好处：transcript 就是完整的会话状态。40 条 item 序列化才 5.3 KB，把它存进对象存储当 checkpoint，成本几乎为零；agent 卡在等人工审批、等子 agent 返回时可以直接落盘，几分钟甚至几天后换台机器恢复，接着往下跑。这比"把上下文塞进数据库某张宽表"要干净得多——上下文是推导物，transcript 才是事实。真正贵的是"语义漂移"——换模型时那些 provider 私有的 reasoning block、cache 标记不能原样搬运，得按目标模型的能力重建，否则历史会污染下一次推理。这部分没法用毫秒衡量，只能靠回放对比。

## 六、生产落地：八条清单和四个坑

| 事项 | 建议做法 | 不做的后果 |
|---|---|---|
| 工具预算 | 给单请求 tool 注入设硬上限（如 15k token），超了强制 deferred | 一次加功能就把上下文挤爆 |
| 描述写法 | 只写"什么时候该用我"，不写"我是什么" | 描述变成噪声，检索和模型都更糊涂 |
| 命名 | 动词 + 单数对象，驼峰固定；禁复数、禁缩写混用 | 检索召回直接腰斩（1/40 那行就是代价） |
| alias | 维护业务口语 → 规范词的 map，随注册表重建 | 用户说"客户"就永远找不到 contact |
| top-k | 至少 5，按命中集合评估，不迷信 top-1 | 重复工具导致 top-1 随机落点 |
| 可发现性 | skill 里写 `suggested-tools`，deferred 工具也要能被"看见" | 模型不知道有工具，检索永远不发生 |
| 沙箱 | 按挂载点限权：scratch 可写，skills/context 只读 | agent 改坏自己的技能和上下文 |
| 观测 | transcript 当 trace，分开统计模型时间与工具时间 | 把优化力气花在 3 秒的工具上，而模型占了 30 秒 |

评测口径也要跟着改。工具规模化之后，"回答对不对"不足以描述问题，至少要四个指标：**recall@5**（标注的目标工具是否进前五）、**工具选择准确率**（模型实际调的是不是目标工具）、**平均轮数**（选错就要多绕一圈）、**每请求 tool token**（注入预算是否守住）。前三个靠标注集，最后一个靠计数器，四个一起看才知道检索改动是赚是亏。

HubSpot 那篇的 trace 图正好印证最后一条：一个完整回合 33 秒，其中四次工具批次加起来不到 2 秒，其余全是模型调用。**所以先改 prompt 和模型，再谈工具性能**。

四个坑单独说：

1. **deferred 之后"看不见就想不到"**。工具从上下文里消失，模型不会主动去找。必须在系统提示或 skill 里维护一份"能力索引"，否则检索层再快也没流量。
2. **检索是 IR，不是理解**。词形、同义词、缩写、命名不一致，四件事在真实注册表里同时发生，靠一个 stem 函数只解决第一件。
3. **工具数量会自我膨胀**。复用 RPC 让加工具变得太容易，半年就能从 50 涨到 3,000；把工具数当容量指标，像对待数据库连接数一样对待它。
4. **跨 provider 的历史不可无损搬运**。ID 前缀、reasoning block、cache 标记都是各家私货，中立格式只能保证"结构"中立，保证不了"语义"中立。

## 七、什么情况下别做这套

工具少于 50 个，全量注入就是最优解，deferred 和检索只会增加一个故障点。只有单一 provider、且上下文窗口足够大时，先算钱：如果全量 schema 只占窗口 10%，那省下来的 token 换不来检索错配的风险。没有评测集的团队更该先补评测——检索层一改，召回从 9/40 变成 34/40 这种幅度，没有标注集你根本判断不了是变好还是变坏。

反过来，如果已经出现"模型选错工具、参数乱填、同一个任务反复试"的症状，而且工具数上了三位数，那这套三段式就是必修课：**先把 schema 挪出上下文，再用可解释的检索把它按需搬回来**，剩下的交给评测集决定要不要上向量。

## 参考资料

- [Aviator: HubSpot's Agent Harness（2026-11-12）](https://hubspot.engineering/blog/aviator-hubspots-agent-harness/)
- [Anthropic Agent Skills 文档](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)
- [BM25 算法与参数详解（Elastic 官方博客）](https://www.elastic.co/blog/practical-bm25-part-2-the-bm25-algorithm-and-its-variables)
- 站内：[Harness Engineering 2026 实战](/ai/harness-engineering-claude-code-2026)、[AI Agent 工程化 10 个关键决策](/ai/ai-agent-production-engineering-2026)、[FastMCP 3.0 生产级 MCP Server](/ai/fastmcp-3-0-production-mcp-server-2026)、[AI 专栏总览](/ai/)
