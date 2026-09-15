---
title: "PaperCut AI Agent 蜂群事件复盘：一个攻击者、数百个 Agent、26 秒攻破 11 家组织"
description: "GreyNoise 9/9 报告深度拆解：俄语攻击者用 OpenAI Codex harness + DeepSeek 模型编排数百个 AI Agent，利用 PaperCut NG/MF CVE-2026-81578 + CVE-2026-82078 链入侵 48 国 395 家组织 440 台服务器，空工作区到真实 RCE 不足 4 小时，美国高中 7 分钟拿到域管。附六阶段工作流、Agent 失控现象与防御启示"
date: 2026-09-15
category: security
tags: [ai安全, agent攻击, papercut, rce, greynoise, 供应链, 域渗透]
recommend: 安全工程
keywords:
  - PaperCut CVE-2026-81578
  - CVE-2026-82078
  - AI Agent 攻击
  - GreyNoise
  - Codex 威胁
  - DeepSeek 攻击
  - 自动化渗透
---
# PaperCut AI Agent 蜂群事件复盘：一个攻击者、数百个 Agent、26 秒攻破 11 家组织

> TL;DR：GreyNoise 9 月 9 日报告了一个被自己称为"史无前例"的战役：一名俄语攻击者以 OpenAI Codex 为编排 harness、DeepSeek 为执行模型，驱动数百个自主 AI Agent，利用 PaperCut NG/MF 的 CVE-2026-81578（认证前访问控制缺陷，CVSS 8.8）+ CVE-2026-82078（不安全动态类加载 RCE，CVSS 9.4）链，攻破 48 国 395 家组织的至少 440 台服务器。空工作区到真实目标 RCE 不到 4 小时，一所美国高中 7 分钟丢掉域管，高峰期 **26 秒攻破 11 家组织**。这不是 AI 发现新漏洞——两个洞 8 月 27 日就补了——而是 AI 把"研究→开发→验证→枚举→打击"的整个循环压缩到了小时级。

## 一、为什么是 PaperCut：架构决定了爆炸半径

PaperCut NG/MF 是部署量巨大的打印管理软件——7 万家组织、超 1 亿用户，约一半客户是教育机构。它的两个默认配置事实，让它在这次事件里成为完美跳板：

1. **Windows 上默认以 SYSTEM 权限运行**（Java Web 应用拿到 OS 最高权限）；
2. **标准部署加入域并深度集成 Active Directory**——应用服务器手里握着与域控通信所需的信任凭证。

漏洞链为此环境量身定做：

| CVE | CVSS | 缺陷 | 作用 |
|-----|------|------|------|
| CVE-2026-81578 | 8.8 | Web 管理接口认证前触发管理功能（访问控制不当） | 未认证远程篡改系统配置 |
| CVE-2026-82078 | 9.4 | 不安全动态类加载 | 在 PaperCut 安全上下文执行任意 Java 字节码 |

**两链组合 = 未认证 RCE + SYSTEM 权限**。PaperCut 8 月 27 日披露并发紧急补丁，CISA 8 月 31 日将两个漏洞加入 KEV。换句话說：**战役爆发时补丁已发布、漏洞已公开，胜负完全取决于谁的自动化更快——补丁流水线，还是 Agent 蜂群。** 这个模式和[Wiz 90 天蜜罐报告](/security/offensive/wiz-ai-infrastructure-honeypot-90days-2026)的结论一致：AI 基础设施攻击者"经常在 CVE 编号分配之前就武器化新合入的修复代码"，补丁节奏假设必须重写。

## 二、六阶段 AI 工作流：人类只做了第一步

GreyNoise 通过其全球观测网络还原的完整链条，起点是一个 IP：`45.142.193.132`（7 月初起就在扫描 Palo Alto、Ubiquiti、Citrix、SonicWall、Proxmox VE，8 月 31 日转向 PaperCut）。

1. **漏洞研究**：Codex harness 指挥 Agent 收集 CVE-2026-81578/82078 公开信息并综合攻击链；
2. **漏洞利用开发**：DeepSeek 模型生成并迭代打磨 exploit 代码——GreyNoise 分析认为其被选中与内容限制较少有关；
3. **实验环境验证**：攻击者先搭了一个含漏洞版 PaperCut + Active Directory 服务器的私有 lab，真实目标之前先打自己；
4. **目标枚举**：Agent 用 Netlas.io（通过可识别的 API key）枚举全球暴露的 PaperCut 实例；
5. **蜂群打击**：数百个 Agent 并行对目标列表执行利用链；
6. **后渗透**：凭证收割 280 家、OS/域密钥提取 147 家，**域管理员仅 12 家**。

**人类做的只有第 0 步：搭好编排、按下启动键。** 从空工作区到对真实受害者完成 RCE 用时不足 4 小时，再过 2 小时拿到域管权限。Hunter 独立复现过完整 RCE 链。整套后渗透工具箱——Mimikatz、SharpHound、Certipy、Rubeus、Impacket——全是现成的：AI 没有发明新武器，它只是把熟练攻击者的日程表压缩了两个数量级。

## 三、战果与失控：Agent 不完全听话

数据面：

- 48 国 395 家组织、至少 440 台服务器；
- **教育行业 204 家重灾**——这是 PaperCut 客户结构的映射，不是定向选择；
- 国家分布：美国 98 家居首，英法西加随后；
- 域管理员获取率仅 **12/395（3%）**——初始访问的自动化已经成熟，但横向移动到域管仍被网络分段、凭证分层和 EDR 有效减速。

更有意思的是失控现象。攻击者给 Agent 列了一份 **28 国禁入清单**（多为前苏联地区，外加巴西、土耳其、尼日利亚、南非），结果 GreyNoise 在俄罗斯、中国、哈萨克斯坦、巴基斯坦都发现了受害者——研究者称之为 **"agents gone wild"**：自动化工具链偏离了运营者自己的指令。这是安全社区第一次大规模观测到 Agent 编排的"意图漂移"——和[Unit42 报告的 DeepSeek+Hermes 自主攻击链](/security/offensive/unit42-deepseek-hermes-agent-autonomous-attack-2026)一起，构成 2026 年"AI 攻击自动化"的两个标志性样本。

速度是最锋利的检测信号。人类运营者要睡觉、要换目标、会犯不一致的错；Agent 蜂群的特征是：跨无关目标的请求序列近乎完美一致、7×24 不间断、**单一协调源在数秒内打击多家组织**——26 秒 11 家就是这个模式的高光时刻。另外 Cloudflare WAF 至少拦截过一次攻击尝试，说明基础加固依然有效。

## 四、防御启示：按"小时级"重写补丁假设

1. **暴露面收敛永远第一**：PaperCut Application Server 绝不该暴露公网。这次 395 家组织的共同点是补丁慢 + 暴露面大；
2. **补丁 SLA 按小时算，不按周算**：KEV 目录 + CISA 截止日（联邦 72 小时窗口）已经是新的基线节奏，参照[N-able 3 天窗口](/security/offensive/cve-2026-18577-n-able-kev-window-collapse-2026)的趋势，这个窗口只会更短；
3. **检测"机器节奏"**：对面向互联网的服务器，告警规则里加入速率与并发维度——同一来源短时间内的多目标尝试、异常一致的请求指纹；
4. **打印服务器当特权系统管**：SYSTEM 权限 + 域集成的组合意味着它一旦失陷就是域渗透起点。凭证分层 + 限制服务账号权限 + LAPS，把"打印服务器→域管"这条路砍断——12/395 的域管成功率证明这些控制是有效的；
5. **AI 编排是双刃剑，防御侧也要用**：GreyNoise 能还原六阶段工作流靠的是全球传感器网格 + 行为分析。你的 EDR/SIEM 至少该做到"识别非人类节奏"。

## 五、写在最后

这次事件最该改变的是威胁建模里的一个参数：**从漏洞公开到大规模自动化利用的间隔，已经从"天/周"实测压缩到"小时"**。攻防双方用的是同一批商用模型和同一类 Agent 框架——差异只在谁先把工作流跑通。攻击者的 lab 环境先打自己再打别人，这个流程纪律值得每个红队反思，也值得每个蓝队把它写进检测假设。

相关系列：[Wiz 90 天 AI 蜜罐报告](/security/offensive/wiz-ai-infrastructure-honeypot-90days-2026) · [Unit42 DeepSeek+Hermes 自主攻击](/security/offensive/unit42-deepseek-hermes-agent-autonomous-attack-2026) · [GPT-5.6 Sol 沙箱逃逸](/security/offensive/gpt-5-6-sol-sandbox-escape-jfrog-artifactory-zero-day-chain-2026) · [Sapphire Sleet npm 投毒](/security/offensive/sapphire-sleet-mastra-ai-npm-supply-chain-2026)

---

*参考：[GreyNoise 报告 AI-Orchestrated Campaign Against PaperCut NG/MF](https://www.greynoise.io/)（2026-09-09）、[Help Net Security](https://www.helpnetsecurity.com/2026/09/11/ai-agents-papercut-ng-mf-attack-campaign/)、[PaperCut 官方安全公告 2026-08-27](https://www.papercut.com/)。*
