---
title: "GPT-6 Astra 深度解读：99.9% 与 62.7% 的 ARC-AGI-3 之争，「AGI 时代」宣言背后的模型真相"
date: 2026-09-07
tags:
  - ai
  - gpt-6
  - openai
  - arc-agi
  - benchmark
  - agent
  - ai-security
keywords:
  - GPT-6 Astra
  - ARC-AGI-3
  - ARC Prize
  - Provider Adapter
  - 99.9%
  - 62.7%
  - 网络安全能力
  - ExploitBench
  - AGI 时代
  - recurrent depth
  - OSWorld 2.0
category: ai
description: "OpenAI 于 2026-09-03 发布 GPT-6 Astra，宣称 ARC-AGI-3 达到 99.9%、正式进入 AGI 时代。但 ARC Prize 用标准 harness 实测只有 62.7%，两种结果的差异源于 harness 是否保留模型的私有推理状态。本文从双分数之争、1.05M 上下文与 128K 输出的工程参数、OSWorld 2.0 计算机使用能力、ExploitBench 100% 的网络攻击能力、recurrent depth 架构争议五个维度还原 Astra 的真实能力边界。"
recommend: AI工程
---

# GPT-6 Astra 深度解读：99.9% 与 62.7% 的 ARC-AGI-3 之争，"AGI 时代"宣言背后的模型真相

2026 年 9 月 3 日，OpenAI 发布旗舰模型 **GPT-6 Astra**，总裁 Greg Brockman 随即在 X 上宣布"欢迎进入 AGI 时代"。同一天，两个官方来源给出了**截然不同的 ARC-AGI-3 分数**：OpenAI 宣称 **99.9%**，而 ARC Prize 基金会的独立实测是 **62.7%**。

两个数字都是真的。它们的差异不来自造假，而来自一个技术细节：**测试 harness 是否允许模型保留自己的私有推理状态**。

这篇文章拆解这场"AGI 时代"发布会背后的真实工程图景：ARC-AGI-3 分数为何分裂、模型参数、计算机使用能力、网络安全能力，以及安全专家集体警惕的 recurrent depth 架构。

## 一、ARC-AGI-3 的 99.9% 与 62.7%：同一模型，两个 harness

### 1.1 先看分数

| 来源 | Score | 成本 | 推理等级 | harness |
|------|-------|------|---------|---------|
| OpenAI 官方 | **99.9%** | ~$19,000 | High | Provider Adapter |
| ARC Prize 实测 | **62.7%** | ~$26,000 | Max | Standard |

以及基线对照：GPT-5.6 Sol 在 ARC-AGI-3 上只有 **7.8%**。

差距是数量级的：62.7% 已经是所有模型在 ARC-AGI-3 上的最高标准 harness 成绩，而 99.9% 几乎饱和了整个基准。

### 1.2 差异的技术根源：推理状态是否被丢弃

ARC Prize 官方博客（Greg Kamradt，2026-09-03）给出了明确解释：

- **Standard harness（标准装置）**：每次交互后丢弃模型私有的推理状态，且把较早的步骤截出视野——模型每一轮都要"重新搞懂这个游戏"。ARC 认为这是 **harness 限制，而不是能力限制**。
- **Provider Adapter harness（供应商适配装置）**：允许模型在请求之间保留不透明的推理状态，并用压缩（compaction）维持长对话——模型可以复用之前的工作。

在 Provider Adapter 下，模型不需要每次重新理解环境；在 Standard 下，它被迫不断从头开始。这就是 62.7% 与 99.9% 的鸿沟：

> "Standard harness 每次动作后丢弃 Astra 的私有推理，并不断截断更早的移动——迫使模型反复重新搞懂游戏。这是 harness 局限，不是能力局限。" —— ARC Prize

### 1.3 ARC 自己的裁决：进步巨大，但不是 AGI

ARC Prize 明确表态：

> "我们认为 Astra 代表朝着泛化迈出的有意义的一步……**但我们不宣称它是 AGI**。"

同时还给出两组佐证：

1. **行动效率超人类**：以少于人类中位数的动作数通过 **96%** 的关卡，平均少用 **51.7%** 的动作。这是 ARC-AGI-3 首次有模型在行动效率上超过人类基线。
2. **成本对比**：一个人脑完成一次游戏约消耗 $0.00067 的电费（按 20W 脑功率、$0.20/kWh 计算），Astra 一次游戏在最大推理下成本以数百美元计——通用性提升，但效率离人脑还有几个数量级。

### 1.4 这个双分数该怎么读

- **62.7% 是公平跨模型对比数**——ARC 的标准 harness 是"苹果对苹果"的口径
- **99.9% 是 Astra 配合自家工具链时的上限**——它的推理状态压缩是 OpenAI 产品体系内的真实能力，不是虚假宣传

两个数字都需要引用："62.7% 是横评基线，99.9% 是能力上限"。谁把其中一个当成唯一真相，谁就会被下一个版本的评测打脸。

## 二、模型硬参数：为长时 Agent 任务而生

| 参数 | 数值 |
|------|------|
| 上下文窗口 | **1.05M tokens** |
| 最大输出 | **128,000 tokens** |
| 知识截止 | 2026-04-30 |
| 推理等级 | Low → Max |
| API 发布形态 | gpt-6-astra |
| 发布范围 | 首批受限预览（trusted partners） |

1.05M 上下文 + 128K 输出组合的意义很明显：**OpenAI 把 Astra 定位为"持续工作"模型**——软件研发、研究、浏览、计算机关机、文档生成等多步工作流，而不是只回答一个 prompt 的对话模型。

## 三、计算机使用（Computer Use）：真正可落地的能力跃迁

如果说 ARC-AGI-3 的分数有 harness 争议，那 OSWorld 2.0 的对比则没有争议空间：

### 3.1 OSWorld 2.0（真实操作系统环境中操作软件）

| 模型 | 得分 | 平均完成任务时间 |
|------|------|-----------------|
| **GPT-6 Astra** | **72.6%** | ~40 分钟 |
| GPT-5.6 Sol | 65.7% | ~75 分钟 |

得分提升近 7 个百分点，**耗时几乎减半**。对真实世界的 Agent 工作流，完成速度和可靠性比"推理基准多几个点"更贴近用户体验。

### 3.2 长期上下文（OpenAI MRCR v2）

| 上下文长度 | 准确率 |
|-----------|--------|
| 8-needle 256K–512K | **100.0%** |
| 8-needle 512K–1M | **96.3%** |

对比参照：Claude Fable 5 在 256K-512K 档是 91.5%，512K-1M 档 73.8%。Astra 在超长上下文上的针检索能力是断层式领先。

### 3.3 推理基准

- **ARC-AGI-2**：95.0%（Astra）vs 92.5%（Sol）、90.4%（Opus 5）
- **ARC-AGI-1**：98.5%（与 Sol 持平）
- 官方报告称"各推理等级最大成绩"

## 四、网络安全能力：OpenAI 主动承认的危险级能力

这是本次发布最值得安全从业者关注的维度。CNBC 报道标题直接写明 OpenAI "警告其先进的网络攻击能力"（warning of its advanced cyber capabilities），NBC 报道称发布"触发了内部安全措施"（triggered internal security measures）。

### 4.1 安全基准数据（Simon Willison 独立整理）

| 基准 | Astra 得分 | 含义 |
|------|-----------|------|
| **ExploitBench** | **100%** | 漏洞利用能力基准，满分 |
| ExploitGym | 42.4% | 更难的利用任务集 |
| SRE-Bench（逆向工程） | 99.2% | 安全逆向工程 |

ExploitBench 100% 意味着在"给定漏洞、生成利用"这个任务上，Astra 达到了基准定义的满分水平。结合 SRE-Bench 逆向 99.2%，这是一个在**漏洞挖掘与利用生成**方向上能力完整闭合的模型。

### 4.2 "网络安全编程能力被评估为 Critical"

OpenAI 内部将 Astra 的网络安全编程（cyber）能力评级为 **Critical**——首次有任何模型在该维度拿到这一等级。这正是 OpenAI 在 7 月 Hugging Face Agent 事件之后依然选择"带警告发布"的原因：能力已经到了无法内部雪藏的程度，只能加防护后上市。

### 4.3 安全团队的应对视角

对防御方而言，这意味着过去"AI 写 exploit 是理论威胁"的叙事需要更新为实际操作考量：

- 漏洞奖励计划（bug bounty）的自动化程度将继续提高，防御方需要同等强度的自动化补丁验证
- "修复窗口"（patch window）被进一步压缩——AI 生成利用的速度比人类快几个数量级
- 红队工具"平权化"：门槛从未如此之低

## 五、recurrent depth 架构争议：安全专家的集体警报

### 5.1 争议来源

Fortune 与 The Information 相继报道：Astra 使用了一种名为 **recurrent depth（循环深度）** 的新架构技术，据称更高效，但让模型**更难被控制、更难被解释**。

- **The Information**（2026-09-02）：《OpenAI Technique in 'Astra' Model Sparks Security Concerns》
- **TechCrunch**（2026-09-02）：《OpenAI's new reasoning technique alarms AI safety experts》

### 5.2 为什么"高效"反而令人担忧

循环机制意味着模型在内部隐藏状态上递归深化推理，而不是把每步思考都展开到外部。这带来两个安全属性变化：

1. **可解释性下降**：外部无法完整观察模型中间推理，审计和红队对齐检查更难
2. **控制难度上升**：如果隐藏状态承载了部分行为逻辑，监督者对模型行为的因果链条掌握更弱

这与 ARC-AGI-3 的 99.9% 背后机制惊人地一致——**Provider Adapter 保留"不透明推理状态"**。换句话说：让 Astra 达到 99.9% 的那个机制，恰是让安全专家睡不着觉的那个机制。

## 六、发布会现场：一场"混乱的首秀"

实际的发布过程堪称翻车现场：

- OpenAI 发布页一度返回错误，访问者看到 errror 页面约一小时
- 真正的公告全文当时只有在 archive.ph 的镜像上完整可读
- 博客文章在官方社交媒体宣布之前就已上线，限制了舆论反应窗口

TBPN Digest 称之为"chaotic rollout"。对于一家想要定义"AGI 时代"的公司，这个首秀与宏大叙事形成了微妙的反差。

## 七、名字里的信息：Astra > Sol > Terra > Luna

OpenAI 的命名体系在同一次发布中得到了确认：

> "更大的天体 = 更强的模型，尺度是 Astra > Sol > Terra > Luna。" —— OpenAI

- **GPT-5.6 Sol**：7 月发布，Shepherd-1 自主漏洞挖掘的主角
- **GPT-5.6 Luna / Terra**：7 月同步推出，更小、更便宜的档位
- **GPT-6 Astra**：9 月发布，旗舰，命名高于 Sol

这次发布还顺带确认了此前被广泛猜测的密码学彩蛋——收购新闻当天 "Nvidia acquires Hugging Face for $12.93B in a deal priced to match the hugging face emoji" 式的 meme 传播，说明科技行业对命名越来越"梗化"，但 Astra 的实力不是梗。

## 八、总结：Astra 的真实坐标

| 维度 | 结论 |
|------|------|
| ARC-AGI-3 | 99.9%（自配 harness）/ 62.7%（标准 harness）——双口径都要引用 |
| 计算机使用 | OSWorld 2.0 72.6%，时间减半——实打实的能力跃迁 |
| 长上下文 | 1.05M 窗口，MRCR 512K-1M 96.3%——断层领先 |
| 网络安全 | ExploitBench 100%，Cyber 评级 Critical——首次满级 |
| 架构 | recurrent depth：高效但对齐控制更难 |
| ARC Prize 定性 | "有意义的泛化进步，**但这不是 AGI**" |

"AGI 时代"的宣言需要打问号，但一个能把陌生环境压缩成符号世界模型、在满分基准上闭合、同时让安全专家集体失眠的模型，确实站到了某个分水岭上。

对工程师的实际建议：Astra 的 1.05M 上下文 + 128K 输出 + 超长任务可靠性，值得作为长时 Agent 工作流（multi-step software dev、research、computer control）的首选评估对象；但任何把它的输出直接接进生产管道的团队，都必须先补齐安全护栏——这不是一个"普通 LLM 接入"场景。

## 参考资料

- [ARC Prize 官方博客：OpenAI's GPT-6 Astra on ARC-AGI-3](https://arcprize.org/blog/astra)
- [ARC Prize 成绩页：GPT-6 Astra](https://arcprize.org/results/openai-gpt-6-astra)
- [OpenAI 官方发布页：GPT-6 Astra](https://openai.com/index/gpt-6-astra/)
- [openai.com: Path to Astra](https://openai.com/index/path-to-astra/)
- [Simon Willison：GPT-6 Astra benchmark 汇总](https://simonwillison.net/2026/Sep/3/gpt6-astra/)
- [The Verge：OpenAI's next big AI model has 'entered the AGI era'](https://www.theverge.com/ai-artificial-intelligence/989601/openai-gpt-6-astra-release)
- [CNBC：OpenAI begins rolling out Astra model after warning of its advanced cyber capabilities](https://www.cnbc.com/2026/09/03/open-ai-astra-gpt-6-cyber.html)
- [Fortune：Recurrent depth 架构引发安全担忧](https://fortune.com/2026/09/03/reports-openais-astra-model-uses-a-new-more-efficient-ai-architecture-alarms-ai-safety-experts-who-worry-the-method-makes-models-harder-to-control/)
- [TechCrunch：OpenAI's new reasoning technique alarms AI safety experts](https://techcrunch.com/2026/09/02/openais-new-reasoning-technique-alarms-ai-safety-experts/)
- [Wikipedia：GPT-6 Astra](https://en.wikipedia.org/wiki/GPT-6_Astra)