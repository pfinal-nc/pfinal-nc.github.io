---
title: "NVIDIA 以 129.3 亿美元收购 Hugging Face 深度解读：开放 AI 生态的终局博弈，从拒绝 5 亿美元到三大洲反垄断审查"
date: 2026-09-07
tags:
  - ai
  - nvidia
  - hugging-face
  - ai-ecosystem
  - acquisition
  - open-source
  - antitrust
keywords:
  - NVIDIA 收购 Hugging Face
  - 12.93B
  - Jensen Huang
  - Clem Delangue
  - 开放模型生态
  - 反垄断
  - Groq 收购
  - AI 基础设施
category: ai
description: "2026-09-03，NVIDIA 宣布以 129.3 亿美元收购 Hugging Face——这是继 200 亿美元收购 Groq 之后规模第二大的芯片行业并购。从 HF 去年拒绝 5 亿美元报价到如今 12.93B 成交，从 Jensen Huang 的开放叙事到美国欧盟英国反垄断审查，本文拆解这笔交易背后的平台经济学、NVIDIA 的生态控制战略，以及开放 AI 社区面对的两难。"
recommend: AI工程
---

# NVIDIA 以 129.3 亿美元收购 Hugging Face 深度解读：开放 AI 生态的终局博弈

2026 年 9 月 3 日，NVIDIA 官网发布 Jensen Huang 署名博客，宣布以 **129.3 亿美元（$12,930,300,000）** 收购 AI 开发者平台 Hugging Face——这是 NVIDIA 历史上第二大收购，仅次于 2025 年底以约 200 亿美元收购 AI 推理芯片公司 Groq。

这笔交易最值得玩味的不是金额，而是它同时踩中了两条叙事线：**开放 AI 生态的"瑞士中立国"被芯片巨头收编**，以及**"卖铲人"开始买矿**。

## 一、交易全景

### 1.1 核心信息速览

| 项目 | 内容 |
|------|------|
| 收购方 | NVIDIA |
| 被收购方 | Hugging Face |
| 交易金额 | **$12,930,300,000（129.3 亿美元）** |
| 宣布日期 | 2026-09-03 |
| 支付形式 | 未披露（市场普遍预期现金为主） |
| 反垄断审查 | 美国 FTC、欧盟委员会、英国 CMA |
| NVIDIA 史上排名 | 第二大收购（仅次于 ~$200 亿 Groq） |
| 交接预期 | 2026 年内完成 |

### 1.2 被收购对象：AI 生态的"基础设施层"

Hugging Face 不是模型公司，而是模型生态的平台公司：

- **18M+ 开发者** 注册用户
- **3M+ 模型** 托管
- **500K+ 数据集**
- **1M+ AI 应用**
- **200K+ 企业**（含 Fortune 500 中超过 80%）
- 行业默认的模型分发渠道：OpenAI 以外的开放权重模型，基本都在 HF 上首发

用 Jensen Huang 博客里的原话说，Hugging Face 是"AI 的 GitHub"。这个比喻的准确含义是：谁控制了模型的上传、下载、运行、分发渠道，谁就站在了 AI 产业链事实上的咽喉位置。

## 二、从拒绝 5 亿美元到 12.93B 成交：定价逻辑

### 2.1 一年之内的估值跳变

2025 年，Financial Times 报道称 Hugging Face 曾**拒绝了一笔 5 亿美元的收购报价**。那时 HF 的收入体量远不足以支撑这个估值，CEO Clem Delangue 的公开叙事是"保持独立、专注开放生态"。

一年后以 12.93B 成交，中间发生了什么：

1. **AI 基础设施化**：2026 年 AI 从"模型竞赛"转向"生态竞赛"，平台的价值锚点从收入换成了战略入口
2. **NVIDIA 的 Groq 收购（~$200 亿，2025 年底）**：NVIDIA 已经证明它愿意为"战略咽喉"支付天价，而且市场认可这套逻辑
3. **HF 的用户量级**：18M 开发者 × 200K 企业，在 AI 原生时代就是"数据 + 分发 + 信任"三位一体
4. **收入基础**：The Information 报道 HF 年化收入约 **1.5 亿美元**，以 12.93B 计算约 86x 收入——不是财务定价，是战略定价

### 2.2 这笔钱的"战略对价"在哪

NVIDIA 用 12.93B 买到的核心资产是三样：

1. **分发入口**：任何开放权重模型发布、任何开发者寻找模型，都经过 HF
2. **开发者心智**：18M 开发者是训练数据、反馈回路、生态粘性的来源
3. **默认运行环境**：如果 HF 的"用起来最顺"的体验与 NVIDIA 硬件深度绑定，等于把模型生态和芯片生态焊死

## 三、Jensen Huang 的开放叙事：买下"中立国"的中立性悖论

### 3.1 官方口径：保持开放

Jensen Huang 的博客声明保持了教科书级的"收购后安抚"话术：

- HF 将继续作为一个**开放的、厂商中立的平台**运营
- 支持**所有框架、所有模型、所有云**（不仅是 NVIDIA 生态）
- Hugging Face 使命不变：让 AI 民主化

CEO Clem Delangue 也在 X 上发文安抚社区："我们依然致力于开放性，这笔交易让 HF 拥有更多资源、更快的迁移速度和更强大的合作伙伴。"

### 3.2 中立性的结构性崩塌

但社区和业内人士普遍看到的是结构性矛盾：**一个由芯片厂商全资拥有的"中立平台"，本质上不再中立**。

过去 HF 的价值主张是"和谁都合作"——Meta 的 Llama、Mistral、DeepSeek、Qwen 全都在 HF 上发布，与任何云厂商、任何芯片厂商都保持等距。现在：

- 最大的 GPU 厂商同时是最大模型平台的母公司
- 平台未来的功能优先级（推理算力集成、硬件加速路径）天然偏向自家芯片
- 竞品芯片生态的接入优先级在商业上与"母公司利益最大化"冲突

这不是阴谋论，是治理结构决定的激励错位。NVIDIA 不需要公开作恶，只需要在无数个"哪个优先做"的决策点上，让天平自然倾斜。

## 四、为什么是现在：NVIDIA 的"平台经济学"补课

### 4.1 NVIDIA 的营收结构危机

2026 年 NVIDIA 依然占据数据中心 GPU 70%+ 份额，但面临两个增长压力：

1. **AI 推理芯片竞争**：Groq、Cerebras、AMD 的 MI 系列、以及云厂商自研芯片（TPU、Trainium）持续蚕食增量市场
2. **模型层话语权旁落**：OpenAI 与微软深度绑定、Google 全栈自研，NVIDIA 的"卖铲人"模式在模型层没有抓手

### 4.2 HF = NVIDIA 缺失的"应用层入口"

收购 Groq 补的是**推理芯片**，收购 HF 补的是**开发者生态**。两个收购拼在一起，NVIDIA 的完整叙事变成了：

```
NVIDIA 芯片（训练 + 推理）
    │
    ▼
Groq: 推理加速层
    │
    ▼
Hugging Face: 模型分发 + 开发者生态
    │
    ▼
End-to-end AI 基础设施栈
```

从"卖铲子"到"修铁路 + 卖铲子 + 收过路费"。这是芯片公司向平台公司转型的标准路径。

## 五、反垄断：三大洲的灯塔同时亮起

### 5.1 审查状态

- **美国 FTC**：对 NVIDIA 与 HF 的垂直整合开启审查，关注重点是 HF 平台的"关键设施"（essential facility）属性——模型分发渠道是否会被杠杆化为 NVIDIA 排他性优势
- **欧盟委员会**：就交易对开放模型生态系统和欧洲 AI 创业公司接入公平性的影响展开初步询问，可能升级为深入调查（Phase 2）
- **英国 CMA**：同步启动合并评估

### 5.2 核心争议点：vertical foreclosure（垂直封锁）

反垄断的焦点不是"NVIDIA 会不会强迫用户只用 NVIDIA 芯片"，而是更微妙的**结构性歧视**：

- HF 未来会不会给 NVIDIA 芯片的推理路径提供更低延迟、更高优先级、更便宜的默认体验？
- 竞品芯片（AMD、Cerebras、TPU）在 HF 平台上的接入体验是否会"自然"落后？
- HF 的模型托管、微调、部署服务，是否会出现对 NVIDIA 生态的隐性绑定？

这三个问题的答案如果是"会"，那么 12.93B 买到的就不是平台，而是**整个开放模型生态的收费站**。FTC 和欧盟显然都看到了这一点——这也是为什么会同时启动审查。

## 六、行业连锁反应

### 6.1 竞品反应

- **AMD**：被普遍视为最大输家——此前 HF 是 AMD MI300/MI400 生态推广的重要中立渠道
- **云厂商**：微软/Google/亚马逊都依赖 HF 托管的开源模型构建服务层，平台易主后都需要重新评估依赖深度
- **Meta**：Llama 主要在 HF 分发，未来与 NVIDIA 的关系会出现"既是客户又是对手"的复杂性

### 6.2 社区与开发者

- 一部分 HF 资深用户开始观望"替代平台"（如 GitHub Models、ModelScope、Replicate）
- 开源社区对"平台集中于单一硬件厂商"的警惕上升
- 但也有务实派认为：NVIDIA 有钱，HF 有开发者，交易后平台基础设施投入会加大，短期体验可能更好

### 6.3 资本市场

交易宣布当天，市场情绪的写照：**Broadcom 股价下跌，Snowflake 上涨**——市场在定价"生成了 AI 应用的云厂商受益、GPU 竞品受损"的预期。CNBC 的 Jim Cramer 评论称 NVIDIA 这笔交易"有不对称优势"（asymmetric），因为如果这笔资产落在 AMD 或 Broadcom 手里，市场会立刻做空 NVIDIA。

## 七、总结：开放 AI 的成人礼

129.3 亿美元收购 HF 是一次教科书级的战略交易：买方用一年前 25 倍的价格买下一个"战略咽喉"，卖方用平台的独立性交换了永远追不上的资金与算力。

它同时也是开放 AI 生态的成人礼——**中立平台被单一厂商收购，意味着"开放"不再是免费的中立，而是需要被购买的、有价格的资产**。社区的悲观看不到"开源末日"，但一个基本事实已经改变：

> 过去，开放模型生态的中立性由"平台独立"保证；现在，它由"母公司的利益考量"保证。

这笔交易的最终走向，取决于三大洲反垄断机构对"垂直封锁"的裁定，以及 NVIDIA 是否真的能在商业利益与平台中立之间做到长期平衡。对开发者来说，短期什么都没变——模型照发、代码照跑；长期什么都可能变——你选择的平台，背后站着的股东名单上多了全球最大芯片公司的名字。

而这一切，发生在一个"AGI 时代"宣言的同一天。9 月 3 日，AI 行业同时完成了两件大事：模型能力越过一个新的分水岭，生态权力完成一次新的集中。

## 参考资料

- [NVIDIA 官方博客：NVIDIA to Acquire Hugging Face（Jensen Huang）](https://blogs.nvidia.com/blog/nvidia-to-acquire-hugging-face/)
- [Reuters：Nvidia to buy Hugging Face for $12.9 billion](https://www.reuters.com/technology/nvidia-buy-hugging-face-129-billion-2026-09-03/)
- [TechCrunch：Nvidia to acquire Hugging Face，the GitHub of AI](https://techcrunch.com/2026/09/03/nvidia-to-acquire-hugging-face/)
- [Financial Times：Hugging Face rejected $500M offer（2025）](https://www.ft.com/content/hugging-face-rejected-500m-offer)
- [The Information：Hugging Face annualised revenue ~$150M](https://www.theinformation.com/articles/hugging-face-revenue)
- [CNBC：Jim Cramer on Nvidia's Hugging Face deal](https://www.cnbc.com/2026/09/03/cramer-nvidia-hugging-face.html)