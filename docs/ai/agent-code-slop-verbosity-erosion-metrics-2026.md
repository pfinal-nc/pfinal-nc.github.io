---
title: "AI 代码 Slop 终于有了数字：Earendil 的 Verbosity 与 Erosion 指标，Agent 写的代码比人类啰嗦一倍、腐化一倍"
date: "2026-09-21"
tags:
  - ai
  - agent
  - code-quality
  - benchmark
  - slopcodebench
  - ast
  - engineering
keywords:
  - AI 代码质量
  - code slop
  - SlopCodeBench
  - verbosity 指标
  - erosion 指标
  - AST-Grep
  - cyclomatic complexity
  - Agent 编码
  - 技术债
  - Earendil
  - LLM 评测
category: ai
description: "Earendil 9 月 10 日发布量化指标：Agent 生成代码的 verbosity（0.33 vs 0.15）与 erosion（0.68 vs 0.31）均为人类仓库两倍。SlopCodeBench 多轮上下文擦除评测下，SOTA 模型严格通过率为 0%。本文拆解两个指标的数学定义、AST-Grep 实现、为什么 LLM-as-judge 行不通，以及 Anthropic Boris Cherny 的生产级应对清单。"
recommend: AI工程
---

# AI 代码 Slop 终于有了数字：Agent 写的代码比人类啰嗦一倍、腐化一倍

## "代码生成已被解决"之后的真问题

Agent 一天能写几万行代码、单轮测试通过率屡创新高——这些数字你已经看腻了。但每个维护过 AI 重度参与项目的人都有同一种体感：**代码能跑，但越来越看不懂**。重复逻辑堆叠、防御性抽象层越包越厚、几千行的"上帝函数"开始出现。

2026 年 9 月 10 日，Earendil 的 Sebastian Baye 发表了 [Measuring the sloppiness of code](https://earendil.com/posts/measuring-code-sloppiness/)，第一次把这种体感变成了两个可计算的数字：

- **人类成熟仓库**：verbosity 0.15 ± 0.06，erosion 0.31 ± 0.17
- **Agent 生成代码**：verbosity 0.33 ± 0.10，erosion 0.68 ± 0.20

**两个维度上，Agent 代码都是人类代码的整整两倍。** 更狠的是 SlopCodeBench 的多轮评测：模拟真实迭代开发（每轮之间擦除上下文），SOTA 模型（含 GPT-5.6 sol xhigh 等）的严格通过率是 **0%**——不是低分，是零。代码在单轮评测里完美通过测试，在多轮迭代里架构性崩塌。

## 为什么 LLM-as-judge 行不通

Baye 先排除了行业惯用的评测方式，理由值得每个做 eval 的人记住：

1. **标量打分噪声大**：让一个 LLM 给代码质量打 1-10 分，同一份代码两次打分可能差 3 分
2. **成对偏好会被表面因素翻转**：改改变量名、调调排版，pairwise 比较结果就反了——评测测的是文风不是质量
3. **Rubric 评分表仍然代替不了品味**：人类 code review 是可读性评估的金标准，但它无法规模化作为 benchmark——你不可能让评审员读几百万行代码来给模型厂商排名

结论：**放弃"judge 模型"，回到确定性结构指标**。AST 解析和圈复杂度虽然"无聊"，但不需要品味、不需要 judge 模型、能在 CI 里稳定运行。这正是这组指标比"AI 评 AI"可信的原因。

## 两个指标的定义

### Verbosity：重复与冗余占比

```
Verbosity = (克隆检测出的重复行数 + AST-Grep 规则标记的冗余行数) / 总代码行数
```

实现完全依赖两类确定性工具：

- **克隆检测**：找复制粘贴的重复逻辑块
- **AST-Grep 手写启发式规则**：匹配已知的冗余模式（不必要的包装函数、无意义的类型断言链、复制分叉的条件树等）

注意 Baye 自己的坦白：这套规则是**手工启发的**——again，人类品味被隐式编码进了规则集。指标不是完美的，但它确定、可复现、可对比。

### Erosion：复杂度堆积度

```
mass(f) = CC(f) × √SLOC(f)

Erosion = Σ mass(f),  f ∈ {CC(f) > 10}  /  Σ mass(f),  所有函数 f
```

其中 CC 是圈复杂度，SLOC 是源码行数。直觉解释：**给每个函数算"质量"（复杂度 × 规模的平方根加权），看这些质量有多大比例堆积在圈复杂度超过 10 的大函数里**。

- 健康代码库：复杂度分散在大量小函数中，erosion 低
- 腐化代码库：复杂度集中在少数巨型函数中，erosion 高

用平方根加权是为了防止单个超长函数直接碾压总数——它衡量的是"复杂度堆积的趋势"，不是"有没有一个烂函数"。

Baye 用这套指标扫描了自己的 vibe coding 项目：verbosity 最高到 0.4，erosion 最高到 **0.75**——比评测均值还糟，说明这不是评测设置的伪影，是真实工作流中的普遍现象。

## SlopCodeBench：多轮上下文擦除才是真实世界

SlopCodeBench 的设计和其他 coding benchmark 相反：

| | 传统 benchmark（SWE-bench 类） | SlopCodeBench |
|---|---|---|
| 指令 | 开头给全所有指令 | 多轮"新指令 → 测试 → 下一轮" |
| 上下文 | 全程保留 | **每个 checkpoint 之间擦除** |
| 通过标准 | 隐藏测试通过 | **所有 checkpoint 的所有测试全过** |

上下文擦除是关键设计——它模拟的是真实场景：三周后你带着全新会话回来继续开发，Agent 不记得当初为什么这样设计。在这个设定下：

- 每个单轮的代码都能编译、能过测试
- 但**糟糕的架构决策跨轮累积**：第 1 轮引入的不必要抽象，第 5 轮的 Agent 不理解它、只能在上面再包一层，第 10 轮就没人能动了
- 最终严格通过率：**SOTA 模型 0%**

Baye 点出的失败机制很精准：**Agent 看不到全系统，只能在局部自保**。它不懂现有的抽象，于是加一层防御性包装；40 个局部防御叠加起来，就是一个没人能在脑子里装下的代码库。这和 HN 上那条 906 分的玩笑——"spawn 了 23 个 Agent 就为了让一个按钮变蓝"——是同一个病灶，只是这次有了标准差。

## 业界响应：Anthropic 的应对清单

指标发布次日（9/11），Anthropic 的 Boris Cherny 回应：**Claude 为生产环境写的代码应该比人类代码执行更高的标准，而不是更低的**。Anthropic 内部维持这条线的手段：

1. 大量 lint 规则 + 测试
2. Claude 驱动的端到端测试
3. **每日运行的 fuzzer**
4. 自动化 code review、安全 review、重构

同期的产品细节佐证了这个方向：Claude Code 2.1.269 加入 `bashEditDiffEnabled` 设置，把 Bash 命令的修改 diff 附加到工具返回结果里——因为 Auto Mode 会让模型倾向用 `sed`/`cat`/heredoc 改文件，**留下完全不可 review 的修改记录**。工具链正在被迫适配"可审计性"这个 AI 时代的新需求。这与本站之前拆解的 [Claude Code 域级 Bash 沙箱](/ai/claude-code-2-1-271-bash-domain-sandboxing-2026) 和 [GitHub Spec Kit 规格驱动开发](/ai/github-spec-kit-spec-driven-development-2026) 是同一趋势：**Agent 时代的工程治理正在从"能不能跑"转向"能不能管"**。

## 落地：把这两个指标搬进你的 CI

两个指标都不需要任何 AI 参与，一条流水线就能跑起来：

```bash
# 1. 克隆检测（jscpd 示例，支持 150+ 语言）
npx jscpd src/ --min-tokens 50 --reporters json -o .slop/clone.json

# 2. 圈复杂度（lizard，多语言）
pip install lizard
lizard src/ -l cpp -l python -T ccn=10 -X > .slop/cc.json

# 3. AST-Grep 冗余规则（自己沉淀项目级规则库）
sg scan --json .slop/rules/ > .slop/ast.json

# 4. 汇总计算 verbosity / erosion，超过阈值则 CI 失败
node scripts/compute-slop.js --verbosity-max 0.25 --erosion-max 0.45
```

建议的初始阈值（参考人类仓库均值 + 一倍标准差）：

- verbosity 上限 0.25（人类均值 0.15 + 0.06×1.7）
- erosion 上限 0.45（人类均值 0.31 + 0.17×0.8）

比阈值更重要的是**使用姿势**：

1. **在 Agent 会话结束时跑，而不是每天定时跑**——slod 是会话级累积的，及时止损比月度复盘有用
2. **erosion 增量比绝对值更有信号**：一次大改动让 erosion 从 0.3 跳到 0.5，这次改动就该拆
3. **不要让 Agent 自己去"修复"指标**——它大概率会用合并函数、删注释这类取巧手段把数字压下去，同时让代码更难读。指标是给人看的告警，不是给模型优化的 reward

## 结语：稀缺技能的转移

Baye 文末引了那句老话："用代码行数衡量编程进度，就像用重量衡量飞机制造进度。"放在 2026 年，这句话有了新的确定性佐证——**当正确性被批量生产，可维护性就是新的稀缺资源**。

Agent 能优化任何有明确 reward 信号的东西：测试通过率、编译时间、基准性能。但"这个代码库六个月后人类还能不能驾驭"没有 reward 信号，于是它在每一轮局部决策里被静默牺牲。Verbosity 和 Erosion 的价值不在于两个数字本身，而在于它们把"品味"翻译成了 CI 里可以告警的信号——这是让人类保住架构掌控权的第一步工具化。

## 参考资料

- Earendil (Sebastian Baye): [Measuring the sloppiness of code](https://earendil.com/posts/measuring-code-sloppiness/)（2026-09-10，HN 221 分）
- Simon Willison: Boris Cherny 生产代码质量评论的整理
- SlopCodeBench 多 checkpoint 评测设定（论文/仓库见原文脚注）
- 本站相关文章：[GitHub Spec Kit 规格驱动开发](/ai/github-spec-kit-spec-driven-development-2026) · [Claude Code 2.1.271 域级 Bash 沙箱](/ai/claude-code-2-1-271-bash-domain-sandboxing-2026) · [Karpathy：Agent 评估的"生成与验证"不对称性](/ai/karpathy-opus-5-million-tokens-lotr-verification-asymmetry-2026) · [LangGraph 1.0 Durable Execution 实战](/ai/langgraph-1-0-durable-execution-production-2026)
