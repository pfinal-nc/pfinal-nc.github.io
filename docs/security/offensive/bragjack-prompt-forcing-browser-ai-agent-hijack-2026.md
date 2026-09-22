---
title: "BragJack：一个广告拦截级权限的扩展，劫持了五大浏览器的 AI Agent——Prompt Forcing 为什么比提示注入更可怕"
date: 2026-09-22
tags: [security, ai, browser, agent-security, cve]
keywords: [BragJack, Prompt Forcing, declarativeNetRequest, DNR, GlicJack, CVE-2026-0628, CVE-2026-55945, Gemini Live, Perplexity Comet, Copilot, Claude in Chrome, 浏览器 AI Agent 安全]
category: security/offensive
description: "Forever Security 研究员 Gal Weizman 披露 BragJack：仅凭 declarativeNetRequest 这一个广告拦截器最常用的权限，同一份 manifest 劫持了 Chrome Gemini Live、Perplexity Comet、Edge Copilot、Opera Neon、Claude in Chrome 五个浏览器 AI Agent。核心是 DiNneR Serving——DNR 削弱 CSP 头 + 重定向 JS 资源，把代码送进特权上下文；再配合 Prompt Forcing 直接接管 Agent 输入通道。累计赏金约 2 万美元，2 个 CVE。EDR 检测不了用英文写的攻击。"
author: PFinal南丞
recommend: true
---

> 过去两年安全圈都在研究提示注入——把恶意指令藏进网页内容里骗 AI。研究员 Gal Weizman 说他发现了"更糟糕的东西"：根本不用骗 AI，直接接管它的输入通道。

# BragJack：一个扩展劫持五大浏览器 AI Agent

## 一、发生了什么

2026 年 9 月 16 日，Forever Security 的 Gal Weizman 发布 BragJack 研究成果：**同一份浏览器扩展 manifest，劫持了五个主流浏览器 AI Agent**——

| 目标 | 载体 | CVE | 赏金 | 状态 |
| --- | --- | --- | --- | --- |
| Chrome Gemini Live | `chrome://glic` 内嵌 gemini.google.com | CVE-2026-0628（8.8） | $7,000 | Chrome 143.0.7499.192/.193 修复（2026-01） |
| Perplexity Comet | 内置 agent 扩展 | 无 CVE | $7,000 | 已修复 |
| Edge Copilot (Actions) | 营销页特权 API | CVE-2026-55945（4.2） | $5,000 | 已修复 |
| Opera Neon | 内置 agent 扩展 | 无 CVE | $900 | 已修复 |
| Claude in Chrome | Anthropic 浏览器扩展 | 无 CVE | $600 | 已修复（Anthropic 确认为首次报告） |

总赏金约 **20,500 美元**，分配 CVE 的只有两个。五家厂商（Google、Microsoft、Opera、Perplexity、Anthropic）各自独立开发的 Agent，被同一个技术打穿——这不是某家的实现 bug，而是**架构级共同缺陷**。CSA（云安全联盟）的分析把这一点挑明了：这是继 2026 年 3 月 GlicJack 之后，第二次观察到"同一手法泛化到整个 agentic browser 物种"。

## 二、前提：Agent 的"大脑-身体"模型

要理解 BragJack，先要看懂现代浏览器 AI Agent 的架构。Weizman 把它拆成两半：

```
文字版架构：浏览器 AI Agent 的信任模型
────────────────────────────────────────────────────────
  [大脑 Brain]                          [身体 Body]
  厂商的 Web 应用                       特权浏览器组件
  gemini.google.com                     chrome://glic
  perplexity.ai                         内置扩展 (Comet)
  claude.ai                             Edge 内部页面
       │                                     ▲
       │   指令经此通道下发                   │
       └─────────────────────────────────────┘
             身体无条件信任大脑的指令

  身体的权限（以用户身份）：
  · 读写任意标签页内容      · 截屏
  · 打开本地文件 (file://)  · 摄像头 / 麦克风（Chrome）
  · 模拟用户操作            · 代发邮件、执行工具调用
────────────────────────────────────────────────────────
```

关键问题：**身体如何区分"厂商服务器发来的指令"和"其他东西发来的指令"？**

厂商的答案是：只信任来自自家域名的内容。Chrome 阻止扩展向 `chrome://glic` 注入 content script；Comet 只接受来自 perplexity.ai 域系的消息。**防线全部建在"域名信任"上**。

而 Weizman 发现的缺口是：控制域名信任的是浏览器网络栈——**而网络栈可以被扩展用 DNR 改写**。

## 三、核心技术：DiNneR Serving

### 3.1 DNR 是什么，为什么它是完美载体

`declarativeNetRequest`（DNR）是 Chrome 84 引入的声明式网络请求 API，设计初衷是替代老的全量监听 API（`webRequest`），让广告拦截器不必读取请求内容就能改写流量。它的权限请求温和到几乎没人警惕——**每一家广告拦截器都要这个权限**。

DNR 能做两件事，恰好构成一条注入链：

1. **改响应头**（`modifyHeaders`）——可以移除 `Content-Security-Policy`、`X-Frame-Options`、`cross-origin-embedder-policy` 等安全头；
2. **重定向资源**（`redirect`）——把页面要加载的 `good.com/a.js` 改道到 `bad.com/b.js`。

### 3.2 DiNneR Serving 三步走

Weizman 把"DNR 削弱 + 重定向"的组合技命名为 **DiNneR Serving**，并在原文中称其为一种新颖的 Web 攻击（novel web attack）；他也提到此前曾协助多家厂商修复过同类实例：

```
文字版攻击链
──────────────────────────────────────────────────────
[Weaken] DNR 规则：移除目标特权页面的 CSP 等安全头
         → 页面处于"无脚本限制"状态
[Execute] DNR 规则：劫持页面本来就要加载的一个 JS 资源
         → 重定向到攻击者服务器上的 execute.js
[Result] 攻击者代码在特权上下文内运行
         → 与"身体"（特权 Agent 组件）同源、同上下文
         → 直接调用身体暴露的内部 API
──────────────────────────────────────────────────────
```

厂商防的是"扩展向特权页面注入脚本"（content script blocklist），没防的是"扩展改写特权页面的**网络流量**"。脚本注入被禁，流量改写畅通——**同一枚硬币的两面，只封了一面**。

## 四、五个目标，五条路径

### 4.1 Chrome Gemini Live（GlicJack 的泛化起点）

**架构**：`chrome://glic` 是特权主体，通过 WebView 嵌入 `gemini.google.com`（大脑）。Chromium 把内容脚本屏蔽列表做成了域名清单，但 Weizman 发现 Chromium 错误地**允许扩展对 WebView 内的 https 页面应用 DNR 规则**。

**利用**：
- Weaken：DNR 移除 CSP，并把 `document-isolation-policy` 改为 `isolate-and-credentialless`（允许跨域脚本与 SharedArrayBuffer 共存）；
- Execute：把页面加载的 `https://www.gstatic.com/feedback/js/help/prod/service/lazy.min.js` 重定向到攻击者的 `execute.js`。

**效果**：代码以 gemini.google.com 源运行在 `chrome://glic` 特权上下文中，可调用 `glicBrowserCreateTab`、`glicBrowserGetContextFromFocusedTab` 等内部命令——读任意网站、读 `file://` 本地文件和 PDF、截屏、读取用户 Profile，Chrome 的媒体能力甚至允许**静默开启摄像头和麦克风**。这就是 CVE-2026-0628 拿到 8.8 分的原因（NVD 描述为 "insufficient policy enforcement in the WebView tag"）。修复（Chromium Issue 463155954，P1/S1）在 2026 年 1 月的 Chrome 143.0.7499.192/.193 落地——Weizman 于 2025 年 11 月 23 日报告，到修复约六周。

### 4.2 Perplexity Comet：信任清单里的一颗雷

**架构**：Comet 的"身体"是内置扩展，通过 `externally_connectable` 声明信任域——这个清单里混进了 `testing.perplexity.com` 这样的测试域名，而测试域唯一的防护是 302 重定向到主域。

**利用**：
- Weaken：DNR 移除 302 响应的 `location` 头，重定向失效；
- Execute：向 testing 域注入 content script，获得向内置扩展发消息的能力。

**效果**：直接发送 `CALL_TOOL`（读历史、开标签、截屏）和 `START_AGENT`（自然语言指挥 Agent 干活）。研究者的 PoC 是让 Agent"总结我最近的邮件并发到攻击者地址"。有个精妙的细节：Comet 曾修过 `file://` 访问，但只匹配小写——`FiLe:///etc/hosts` 大小写变体直接绕过。**大小写敏感的协议校验是个老坑，在 Agent 时代复活了**。

### 4.3 Edge Copilot：三重绕过 + TOCTOU 竞态

Edge 的攻击最体现工程功夫，因为它的防线最多：

1. **CSP 削弱**：Edge 营销页 `microsoft.com/en-us/edge` 被赋予 `edgeMarketingPagePrivate.sendCopilotQuery()` 特权 API。DNR 把营销页的 `frame-ancestors` 放宽为 `https://*.com`——任意网站都能 iframe 嵌入它；
2. **手势伪造**：Agent 要求"真实用户手势"。扩展利用 `debugger` 权限附着到标签页，分发合成点击事件，骗到有效的手势令牌；
3. **Prompt Forcing 竞态**：Edge 有 Think/Do 双模式（防止"一边被塞指令一边执行"）。攻击时序：`enableEdgeTools(false)` → 强制填入 prompt（此时动作被禁，可以塞）→ 立刻 `enableEdgeTools(true)` → Agent 执行前检查设置时看到"已启用"，直接动手。**检查与执行之间的窗口被精确踩点**——教科书级 TOCTOU。

这是 CVE-2026-55945（4.2 分）。评分争议很大：微软给的是 Medium，但效果是完整的 Agent 接管。PoC 还有个彩蛋——用 `bad at gmail.com` 绕过 `@` 符号过滤。

### 4.4 Opera Neon：忘了挂锁的门

与 Comet 同构，但更简单：`opera.com` 域**根本没有阻止 content script 附着**。攻击者在 opera.com 上下文运行代码后直接调用：

```js
// 基于 Forever Security 披露的消息格式改写（变量名已简化）
chrome.runtime.sendMessage(neon, {
  type: "neon:open",
  prompt: "{攻击者构造的完整提示词}",
  // ...
});
```

配合 DiNneR Serving 去 CSP 后藏在不可见 iframe 里，用户全程无感。赏金 $900——Opera 自称同期独立发现了问题，但依然发了赏金。

### 4.5 Claude in Chrome：DOM 属性信任的代价

Claude 的方案与前四者不同——它是普通扩展（不是浏览器内置）。它的 content script 只注入 `claude.ai`，监听 `#claude-onboarding-button` 的点击，把元素的 `data-task-prompt` 属性值转发给侧边栏。

**利用**：其他扩展在 claude.ai 页面上（DiNneR 或 debugger 辅助）设置 `document.body.id = 'claude-onboarding-button'` 和自己的 `data-task-prompt`，然后合成点击。Body 本身不验证点击的来源与元素完整性。赏金 $600，Anthropic 确认这是该缺陷的首次报告。

## 五、Prompt Forcing ≠ Prompt Injection

这是 BragJack 最值得记录的概念贡献：

```
┌─────────────────────────────────────────────────────────┐
│              Prompt Injection（提示注入）                │
│  攻击面：AI 正在读取的内容（网页/邮件/文档）             │
│  手段：把恶意指令藏在内容里，赌模型分不清谁在说话        │
│  对策：护栏、指令分层、工具白名单 —— 有对抗空间          │
├─────────────────────────────────────────────────────────┤
│              Prompt Forcing（提示强制）                  │
│  攻击面：Agent 的输入通道本身（特权组件的消息接口）      │
│  手段：架构漏洞 + 权限滥用，直接把整条 prompt 塞进通道  │
│  对策：无 —— 攻击者此刻就是"厂商服务器"                  │
└─────────────────────────────────────────────────────────┘
```

三个残酷推论：

1. **没有恶意代码参与最终动作**。执行攻击的是浏览器自己的合法 Agent，用的是自己的合法高权限，遵循的是一句语法完美的英文。Weizman 的原话：**"EDRs are not built to detect attacks written in plain English."**
2. **模型护栏完全无关**。你把 Claude/Gemini/Copilot 的安全训练做得再好也没用——恶意指令走的是"厂商指令"通道，在 Agent 眼里它就是正版指令。
3. **Morphisec 分析师 Brad LaPorte 在 6 月的判断被验证**：AI 驱动的攻击速度超过检测速度——EDR 观察、解读、判定、响应的链条，跟不上"一次合成点击即完成"的攻击。

## 六、防御清单

按责任方分层：

**浏览器/Agent 厂商**（真正的根治层）：
1. 特权上下文（`chrome://` 页、内部 WebView）必须对扩展的 DNR、content script、debugger **全量免疫**——Chrome 对 glic 的修复就是这个思路；
2. `externally_connectable` 白名单最小化，且清单内所有域必须同等防护（Comet 的 testing 域教训）;
3. 营销页不该持有可触发 Agent 的特权 API（Edge 的 `sendCopilotQuery` 教训）；
4. 设置校验与动作执行之间做原子化，消灭 TOCTOU 窗口（Edge 竞态教训）；
5. 协议 scheme 校验大小写不敏感并标准化（Comet 的 `FiLe://` 教训）。

**企业 IT**：
1. 扩展准入清单：`declarativeNetRequest` + `https://*/*` + `debugger` 的组合是高危信号，应纳入扩展审计规则；
2. 高价值岗位考虑限制未上架商店扩展与开发者模式扩展的安装；
3. DLP 对 Agent 代发邮件等动作增加二次确认。

**个人用户**：
1. 及时更新浏览器（Chrome CVE-2026-0628 已在 143.0.7499.192/.193 修复）；
2. 审视扩展：一个广告拦截器级别的权限列表，理论上就是 BragJack 的入场券。**装扩展前问一句：我真的需要它吗？**
3. 截至 BragJack 公开时，暂无该技术在野利用的证据——它是责任披露下的研究，但架构缺陷的修复节奏（Comet/Neon/Claude 至今无公开 CVE 与明确修复时间线）提醒我们：同类问题不会一次修完。

## 七、写在最后

BragJack 真正可怕的不是 $20,500 赏金或 2 个 CVE，而是它的**泛化性**：五家互相竞争的厂商，在"Agent 如何信任输入"这个核心安全问题上，抄了同一份有缺陷的答卷。CSA 把这称为 agentic browser 的"单一文化"（monoculture）风险——**当整个物种共享同一个信任模型，一个漏洞类就是一个生态级事件**。

对正在给自家产品装 AI Agent 的开发者，这组案例给出一条铁律：**Agent 的每个输入通道都要当作攻击面对待，不管指令看起来有多"官方"。** 信任域清单里混进一个测试域名、一个营销页特权 API、一次非原子的设置检查，都足够攻击者把你的 Agent 变成他们的 Agent。

## 参考资料

1. Forever Security · BragJack: Hijacking every browser agent（技术概述）：<https://forever.security/blog/bragjack-attack-hijacks-every-browser-agent>
2. CSA Labs · Research Note: BragJack agentic browser monoculture：<https://labs.cloudsecurityalliance.org/research/csa-research-note-bragjack-agentic-browser-monoculture-20260>
3. NVD — CVE-2026-0628：<https://nvd.nist.gov/vuln/detail/CVE-2026-0628>
4. NVD — CVE-2026-55945：<https://nvd.nist.gov/vuln/detail/CVE-2026-55945>
5. Chrome Releases（143.0.7499.192 修复公告）：<https://chromereleases.googleblog.com/2026/01/stable-channel-update-for-desktop.html>
6. Tech Times · Single Extension Hijacks AI Agents in Five Browsers（2026-09-20）：<https://www.techtimes.com/articles/327778/20260920/single-extension-hijacks-ai-agents-five-browsers-without-any-user-clicks.htm>
7. 站内相关：[Claude Code 2.1.271 域级 Bash 沙箱](/ai/claude-code-2-1-271-bash-domain-sandboxing-2026) · [Go MCP SDK DNS rebinding（CVE-2026-34742）](/dev/backend/golang/go-mcp-sdk-dns-rebinding-cve-2026-34742-2026) · [MCP 治理面成型](/ai/mcp-governance-firewall-enterprise-enforcement-2026)
