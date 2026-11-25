---
title: "AI Agent 重复规划太贵：用 Go 编译轨迹成工作流实测"
date: 2026-11-26 07:00:00
author: PFinal南丞
tags: [ai, agent, golang, workflow, cost]
description: "Agent 每天做同一件事却每天重新规划一遍，钱都花在重复思考上。本文拆解 Hotpath 的轨迹编译思路，并用 Go 实现记录→编译→回放三段式：20 条轨迹编成 5 步工作流，模型调用 2→1、prompt 省 62.7%，6 类漂移全部拦截。"
keywords:
  - ai agent
  - 轨迹编译
  - 工作流回放
  - golang agent
  - llm 成本优化
  - 确定性重放
  - agent 幂等
  - 结构化漂移
  - hotpath
  - prompt 降本
---

# AI Agent 重复规划太贵：用 Go 编译轨迹成工作流实测

> TL;DR：一个每天早报的 agent，每天早上都要重新决定"先调哪个工具、再调哪个、结果怎么拼"。这部分思考占了账单的大头。Hotpath 的做法是：录制一次轨迹，用**确定性编译器**（不调模型）把它编成一份可读的工作流 JSON，之后按天回放，只在需要措辞的地方调一个便宜模型，数据不对就整单退回 agent。我用 Go 复刻了这条链路：20 条轨迹编成 5 步工作流（1,121 字节），模型调用 2→1，单次 prompt 727B→271B（−62.7%），6 类漂移场景全部拦截，幂等 journal 把重复副作用从 2 次压到 1 次。

## 一、问题：重复的不是任务，是"重新想一遍"

先看结构。一个成熟 agent 跑"每日晨报"这类任务的步骤基本固定：取邮件 → 取日程 → 汇总发票 → 写文案 → 发送。真正在变的是**数据**，不变的是**路径**。但多数 agent 的每一轮都把路径当新问题解一遍：把 4 个工具的 schema 塞进 context，让模型输出步骤，再逐步执行、再让模型写文案。

这带来三个可量化的浪费：

- **prompt 里重复的静态部分**：工具 schema、系统约束、"请按步骤执行"这类指令，每次都要付费传输。
- **两次模型调用的固定成本**：规划一次 + 收尾一次，即使第二步只是把已有的数字改成句子。
- **不确定性**：同一个任务两次运行可能走出不同路径，评测、缓存、幂等、审计全变得困难。

把这件事换算成规模就更直观：一个每天跑 1000 次的任务，规划开销被放大 1000 倍；官方按自己的基准把这件事折算成每月 $537（Sonnet agent）对 $18（回放，含十分之一回退），差了 30 倍。我不做等比外推——任务的结构、数据量、模型单价都会变——但结论方向是明确的：**重复执行的任务，钱应当花在数据上，而不是花在重新想路径上**。

第 11-22 那篇《Agent 工具规模化实战》解决的是"工具太多、schema 太贵"（用倒排检索把 3000 个工具的 68 万 token 砍到 13%），是**裁剪上下文**；今天这篇解决的是"路径重复、规划重复"，是**消灭规划这一步**。两者叠加才完整。

## 二、Hotpath 的四段式设计

[HOTPATH-EXPLAINED.md](https://github.com/hotpath-run/hotpath/blob/main/docs/HOTPATH-EXPLAINED.md) 把链路拆成四步，其中最关键的一句是"compiler is deterministic, no model involved"（编译器是确定性的，不涉及模型）：

| 阶段 | 输入 | 输出 | 是否用模型 |
|---|---|---|---|
| Record | agent 的一次真实运行 | 轨迹（每次工具调用 + 参数 + 结果） | 是（原本就在跑） |
| Compile | 多条重复轨迹 | 工作流 JSON（步骤、输入、规则、少量文本步骤） | **否** |
| Replay | 工作流 + 当天数据 | 结果 + 校验 | 仅在文本步骤用一个便宜/本地模型 |
| Drift | 结果形状不符 | 整单退回 agent，并录制新轨迹 | 是（退回即原流程） |

接入方式有三种：stdio MCP 代理（`hotpath record`）、模型代理（把 base URL 指向 `hotpath proxy`，支持 OpenAI Chat Completions 与 Anthropic Messages）、以及 SDK 录制自有函数。工作流本身是仓库里的 JSON，可 diff、可 review、可提交。官方自测（合成数据、样本很小）给出的数字是：晨报任务从 $0.0179/次（Sonnet）降到 $0.0006/次（Haiku），约 30–60 倍；11 个工作流的基准里，免费模型回放 44 次跑对 43 次，剩下 1 次主动退回 agent。它同时给了不好看的数据：用 1.7B 小模型连录制一起做，99 次里只有 54% 通过。这反而说明它的落点是"重复路径 + 有人审核"，不是"全自动替代"。

## 三、用 Go 复刻：先定数据结构

Go 里最容易实现的是"工具都是函数"的场景，所以我把三段式全部落在进程内，工具用确定性 mock（按日期 + 账号哈希出数据），这样能无凭证跑通、也能复现。

```go
type Step struct {
	Tool   string            `json:"tool"`
	Args   map[string]string `json:"args"`
	Result map[string]string `json:"result"`
	Kind   string            `json:"kind"` // "tool" 或 "model"
}

type Run struct {
	ID      string `json:"id"`
	Date    string `json:"date"`
	Account string `json:"account"`
	Steps   []Step `json:"steps"`
	Output  string `json:"output"`
}

// 编译产物：可以 diff、可以提交的工作流
type WStep struct {
	Tool    string            `json:"tool"`
	Kind    string            `json:"kind"`
	Fixed   map[string]string `json:"fixed,omitempty"`   // 跨轨迹完全不变的参数
	Inputs  []string          `json:"inputs,omitempty"`  // 每条轨迹都不同的参数 → 运行时输入
	Rule    string            `json:"rule,omitempty"`
	PromptB int               `json:"prompt_bytes,omitempty"`
}

type Workflow struct {
	Task     string              `json:"task"`
	Version  int                 `json:"version"`
	FromRuns int                 `json:"from_runs"`
	Steps    []WStep             `json:"steps"`
	Shape    map[string][]string `json:"shape"` // tool -> 录制到的 result 键集合
}
```

注意 `Fixed` / `Inputs` 这对字段：它把"参数里哪个每天变、哪个永远不变"显式化了。`account=ops@team` 是固定值，`date` 是输入——这正是编译能消掉规划的原因：**规划本质上就是在每次重新判断"哪些是常量、哪些是变量"**。

## 四、编译器：20 条轨迹 → 5 步

编译器做的事很朴素：取第一条轨迹当骨架，对同位置的每个参数做跨轨迹比对，全等进 `Fixed`，有差异进 `Inputs`，同时把 `result` 的键集合记进 `Shape` 供回放校验。规划步骤（`plan`）直接丢弃——它已经被步骤序列本身取代。

```go
func compile(runs []Run) Workflow {
	wf := Workflow{Task: "morning_brief", Version: 1, FromRuns: len(runs), Shape: map[string][]string{}}
	base := runs[0]
	for i, bs := range base.Steps {
		if bs.Tool == "plan" {
			continue // 编译后不再保留 planning
		}
		w := WStep{Tool: bs.Tool, Kind: bs.Kind}
		for k, v := range bs.Args {
			same := true
			for _, r := range runs[1:] {
				if r.Steps[i].Args[k] != v {
					same = false
				}
			}
			if same {
				if w.Fixed == nil { w.Fixed = map[string]string{} }
				w.Fixed[k] = v
			} else {
				w.Inputs = append(w.Inputs, k)
			}
		}
		keys := []string{}
		for k := range bs.Result { keys = append(keys, k) }
		sort.Strings(keys)
		wf.Shape[bs.Tool] = keys
		wf.Steps = append(wf.Steps, w)
	}
	return wf
}
```

实际跑出来的工作流（`compile` 输出）：

```text
compiled 5 steps from 20 runs (1121 bytes)
  step1 get_emails   kind=tool  inputs=[date]
  step2 get_calendar kind=tool  inputs=[date]
  step3 sum_invoices kind=tool  inputs=[date]
  step4 summary      kind=model inputs=[urgent] rule=facts-to-text
  step5 send_brief   kind=tool  inputs=[date]
```

20 条轨迹压成 1.1 KB、5 步，编译耗时 **0.02 ms**——因为没有模型参与，这就是纯字符串比对。

## 五、回放：三道 guard 决定成败

便宜可以，错不行。回放侧我实现了三道守卫，对应 Hotpath 说的 shape check / numbers computed / no double actions：

```go
// 1) 形状守卫：result 的键集合必须与录制时一致
func shapeOK(shape []string, res map[string]string) (bool, string) {
	got := []string{}
	for k := range res { got = append(got, k) }
	sort.Strings(got)
	if strings.Join(got, ",") != strings.Join(shape, ",") {
		return false, fmt.Sprintf("shape %v != recorded %v", got, shape)
	}
	return true, ""
}

// 2) 值与数值守卫：关键字段必须是可解析的正数/金额
if n, err := strconv.Atoi(res["count"]); err != nil || n <= 0 {
	return "", GuardErr{Step: s.Tool, Reason: "count not a positive int"}
}
if _, err := strconv.ParseFloat(res["total"], 64); err != nil {
	return "", GuardErr{Step: s.Tool, Reason: "total not numeric"}
}

// 3) 幂等守卫：副作用按 (tool, date, account) 记账
if rp.Journal[keyOf("send_brief", date, account)] {
	continue // 已发送则跳过
}
```

失败时不是"带病继续"，而是**整单退回**（返回 `GuardErr`，由上层转给 agent 重跑并录制新轨迹）。

## 六、实测：模型调用、prompt、延迟

100 个新日期（与录制数据不重叠）跑两套流程，工具与编排全在进程内，所以延迟只反映**编排开销**，不含网络与真实模型时延：

| 指标 | Agent 每次重规划 | 编译后回放 | 变化 |
|---|---|---|---|
| 模型调用次数 | 2（plan + summary） | **1**（summary） | −50% |
| 单次 prompt 字节 | 727 B | **271 B** | **−62.7%** |
| 100 次 prompt 估算 token（4 B/tok） | 18,175 | **6,775** | −62.7% |
| 编排 p50 | 0.063 ms | **0.056 ms** | −11% |
| 编排 p99 | **0.853 ms** | 0.144 ms | −83%（规划步骤的 JSON 往返消失） |
| 工具调用次数 | 4 类各 N 次 | 相同 | 不变（该做的活一样要做） |
| 成功 / 漂移 | — | 100 / 0 | 数据正常时全绿 |

测量方法说明：同一台 2 核 4 GiB 的机器，工具全部是进程内 mock（无网络、无真实模型），每套流程跑 100 个互不重叠的日期，用 `time.Since` 记录单次耗时后取分位；`p99` 取第 99 百分位。因此这些毫秒数只反映 **orchestration 开销**，真实线上还要叠加 HTTP 往返与模型时延——但正因如此，"少一次模型调用"在真实链路上放大得比这里更明显。

三点必须说清，否则数字会被误读：

1. **省的是"想"，不是"做"**。工具调用一次没少，省掉的是那次规划模型调用、以及规划 prompt 里的工具 schema。
2. **prompt 字节比不等于账单比**。真实成本还差输出 token、缓存命中价、模型单价；727B→271B 只是我这套流程里**输入侧静态开销**的变化，官方给的 30–60 倍是不同模型（Sonnet→Haiku）叠加后的结果。
3. **p99 才是收益**。p50 只差 7 µs，但 agent 模式 p99 是 0.853 ms（规划步骤序列化 + 分发），回放是 0.144 ms。线上这条链路后面还挂着网络与模型，规划步骤消失相当于所有长尾都少了一次跨服务往返。

## 七、实测：6 类漂移，全部拦截

漂移是这套方案唯一真正的风险点。我用包装后的工具箱注入 6 种异常，看守卫是否触发：

| 注入场景 | 拦截位置 | 守卫给出的原因 |
|---|---|---|
| 少一个字段（邮件缺 `unread`） | 形状守卫 | `shape [count items] != recorded [count items unread]` |
| 字段改名（日程 `events`→`events_moved`） | 形状守卫 | 键集合不一致 |
| 工具消失 | 调用守卫 | `tool "get_emails" not available` |
| 金额变成 `n/a` | 数值守卫 | `total not numeric` |
| 邮件列表为空 | 值守卫 | `empty items` |
| 日期越界 | 参数守卫 | `date "2026-12-01" out of range` |

**6/6 全部 fallback，没有一次"带病成功"**。这里有个容易做错的细节：如果只用形状守卫，`total: "n/a"` 是合法字符串，会直接漏过去；必须对"要参与计算和写入文案"的字段再做一次类型与业务校验——Hotpath 的说法是"numbers are computed, not guessed"。

## 八、实测：幂等是回放的生命线

回放比 agent 更容易踩重复副作用：agent 崩了通常是整轮重来，而回放可能"跑到第 4 步崩了"，重跑时前 3 步又执行一遍。两组对照：

| 场景 | 发送次数 | 说明 |
|---|---|---|
| 朴素重试（journal 随进程丢失） | **2** | 崩溃后重放，`send_brief` 又发了一次 |
| journal 记账重试 | **1** | 同一 `(date, account)` 的副作用被跳过 |

顺带一个真实观察：100 次回放实际只发送了 **28 次**，因为我刻意让日期在 28 天里循环——同一个 `(tool, date, account)` 第二次出现时被 journal 挡住。这既是幂等生效的证据，也是一个坑：**key 里必须包含业务幂等键**（这里是日期 + 账号），只按工具名记账会把不同日期的发送互相吃掉。

## 九、什么时候别用这套

- **任务每次都不同**：开放式调研、一次性排障、需要多轮试探的场景，编译出来的路径没有复用价值。
- **录制质量差**：官方数据已经很直白——用 1.7B 小模型连录制带回放，99 次只过 54%；换成好模型录制，通过率 87%。**录制用强模型、回放用弱模型**才是正解。
- **副作用不可逆且无幂等键**：发钱、下单、删数据，必须先在业务侧有幂等键，再谈回放。
- **需要严格合规审计**：工作流 JSON 要进仓库、走 review、带版本号，`Version` 字段不是装饰。

落地四件事：工作流落盘并纳入代码评审；每次回放的前 N 次先在 `--dry-run` 下跑；漂移回退后**立即重新编译**（新轨迹就是新版本）；把"回退次数 / 总运行次数"当核心指标监控，回退率超过 10% 说明任务本身不稳定，应回到 agent 模式。

## 十、把工作流接进现有 agent 的两种姿势

回放引擎不必自己造一套 agent 框架，接进现有链路有两条低成本路径：

```go
// 姿势 A：工具注册表复用——把 WStep 里的 tool 名映射到已有函数集合
reg := map[string]func(context.Context, map[string]string) (map[string]string, error){
	"get_emails": emails.List, "get_calendar": cal.Today,
	"sum_invoices": inv.Sum, "send_brief": brief.Send,
}

// 姿势 B：把回放挂在 MCP server 后面——agent 只看到一个 "morning_brief" 工具
// 内部：hit → 直接返回编译结果；drift → 透传给原 agent 并记录新轨迹
func (s *Server) CallTool(name string, args map[string]string) (map[string]string, error) {
	if out, err := s.replay(name, args); err == nil {
		return map[string]string{"result": out, "mode": "replay"}, nil
	}
	return s.forward(name, args) // 回退到真正的 agent
}
```

姿势 B 的好处是**零侵入**：agent 那边只是多了一个可调用工具，回退时行为与原来完全一致，不改变任何 prompt。代价是每次调用多一层胶水，需要把"回退率"打进日志，否则你永远不知道有多少请求其实还在走贵路径。

## 参考资料

- [Hotpath 官方说明：HOTPATH-EXPLAINED.md（设计、基准、接入方式）](https://github.com/hotpath-run/hotpath/blob/main/docs/HOTPATH-EXPLAINED.md)
- [Hotpath 项目主页与 CLI（Apache-2.0）](https://github.com/hotpath-run/hotpath)
- [Hotpath 定价与开源边界](https://hotpath.run/pricing/)
- 站内延伸：[Agent 工具规模化实战：3000 个工具 68 万 token](/ai/agent-tool-scale-deferred-tool-search-go-2026)、[LLM 成本优化](/ai/llm-cost-optimization)、[AI Agent 生产工程化](/ai/ai-agent-production-engineering-2026)、[AI 专栏目录](/ai/)
