---
title: "MCP 工具输出泄密：你的 settings 工具正在把密钥喂给模型"
date: 2026-09-24
tags:
  - ai
  - security
  - mcp
keywords:
  - MCP 工具输出
  - settings 泄密
  - CVE-2026-67357
  - ArcadeDB
  - Workloft Labs
  - OWASP MCP Top 10
  - MCP08
  - secrets 脱敏
category: ai
description: "没有攻击者、没有零日：工程师按文档连接 AI Agent，Agent 调用一次普通的 settings 工具，密钥就进了模型上下文。从 Workloft Labs 披露的厂商事件与 ArcadeDB CVE-2026-67357 出发，分析 MCP 工具输出泄密这一'类'问题，附服务端脱敏代码与五分钟自查清单。"
author: PFinal南丞
recommend: true
---

# MCP 工具输出泄密：你的 settings 工具正在把密钥喂给模型

> 2026 年 9 月 5 日，一家厂商给客户发了一封预防性邮件：在那之前，他们的 MCP 服务器会把每个插件的 settings 完整返回给任何连接的 AI Agent——密码字段、轮询 header、原始明文值，一个不落。没有攻击者，没有被利用的零日，一切只是因为一个工程师按文档把 Claude Code 连了上去。Workloft Labs 记录了这起事件并点出真正的问题：**几乎所有 MCP 服务器都能这么干，而大多数运维者从没检查过**。

## 一、这不是漏洞，是"类"

先讲清楚这起事件有多"无辜"：

1. 工程师按照官方文档，把 Claude Code 或 Cursor 连接到厂商的 MCP 服务器；
2. Agent 调用了一个完全正常的"show me the settings"工具；
3. 工具返回了全部配置——包括本该是密码的字段，**明文**。

没有越狱、没有提示注入、没有恶意服务器。工具做了它被造出来要做的事，失败发生在序列化默认上。几周前，ArcadeDB 用一个 CVE 把同一类问题钉在了案板上：

| 项目 | 内容 |
| --- | --- |
| CVE 编号 | CVE-2026-67357 |
| 组件 | ArcadeDB MCP settings 工具 |
| 行为 | 明文返回高可用集群 token |
| 后果 | 该 token 足以通过两个 header 冒充 root |
| CVSS | 7.7 |
| 修复版本 | 26.7.3 |

Workloft Labs 在分析中强调的关键区分是：**这不是"数据库漏洞恰好被 MCP 暴露"**——这个工具本来就是设计来返回 settings 的，只是没有任何人对输出做 secrets 过滤。单个 CVE 可以打补丁，而这类问题只能靠"类"层面的防御。

## 二、模型只知道工具返回了什么

理解这个问题的根源，要先接受 MCP 的一个基本事实：

> MCP 不会给语言模型一个"控制台"。它给模型的是工具：`list_resources`、`get_config`、`describe_cluster`……模型看不到你的管理界面，它只能看到**每次工具调用返回的 JSON 或文本**。

这意味着：从你上线第一个返回"当前配置是什么"的读工具开始，你就必须**逐字段决定模型能看到什么**。漏掉一个 secret 类型的字段，它就会像任何普通字段一样返回。藏在 URL 里的 key 算，轮询配置里的 Authorization header 算，settings blob 里叫 `clusterToken` 的集群 token 也算。

默认的序列化路径是什么？是把整个对象 dump 出来。UI 里的密码掩码只是一个**显示层提示**，不是访问控制边界。一旦这个值进了 tool result，它就进了模型上下文，然后可能流向：

- 用户从来不会回看滚动的聊天记录；
- MCP 客户端的会话日志；
- 模型提供商的请求 payload；
- Agent 接下来调用的任何下游工具——如果它"好心"地把配置传了下去。

## 三、和 tool poisoning 的区别

这个威胁模型值得和另外两类 MCP 攻击摆在一起对比，因为它们的防御位置完全不同：

| 威胁 | 谁是恶意的 | 失败点 | 防御位置 |
| --- | --- | --- | --- |
| Tool poisoning | 恶意服务器/工具描述 | 工具描述劫持 Agent 行为 | 审查工具、信任边界 |
| 服务器漏洞（路径遍历、命令注入） | 恶意调用者 | 服务器实现缺陷 | 输入校验、认证 |
| **工具输出泄密（本文）** | **没有恶意者** | **序列化默认** | **服务端输出脱敏** |

第三类的独特之处在于： benign server（无害服务器）+ benign tool（无害工具）+ benign read（无害读取），secret 照样没了。你没法靠"别装来路不明的服务器"防住它——因为服务器是你自己装的，工具是官方文档推荐的，读取操作是 Agent 日常会做的。

## 四、五分钟自查

Workloft Labs 对"我是不是受影响了"给出的诚实回答不是"去查日志"，而是——**假设是，然后轮换**。因为能证明清白的证据往往根本不存在：很多客户端的工具调用日志至今是可选功能，OWASP MCP Top 10 的 MCP08 说的就是"没有工具调用日志，事件响应无从谈起"。

在收到下一封泄漏通知邮件之前，先花五分钟做一遍：

1. **列出你的 Agent 实际连接的所有 MCP 服务器**——IDE 插件、自建服务器、上周二有人加进 `.mcp.json` 的那个，都要；
2. **找出返回配置、settings 或状态的读工具**；
3. **亲手调用一次**，自己读输出；
4. **任何字段里出现 key、token、header、密码或埋在 URL 里的凭据，立即轮换**，并假设它已经进过模型上下文。

## 五、服务端脱敏：唯一正确的防御位置

Workloft 给出的方向很明确：**在服务器端脱敏。不要在客户端做，更不要指望 system prompt 里写一句"请不要回显 secrets"。**

一个最小可用的脱敏层，故意写得很无聊（这类代码越无聊越好）：

```javascript
// 服务端 MCP 工具输出脱敏层（Node.js 示例）
const SECRET_KEYS =
  /^(password|secret|token|api[-_]?key|authorization|auth[-_]?header|cluster[_-]?token)$/i;

// 值级启发式：即使字段名不像 secret，值本身长得像凭据也拦下
const SECRET_VALUE = [
  /^(sk|pk|rk)-[A-Za-z0-9]{16,}$/,       // sk-/pk- 前缀的 API key
  /^Bearer\s+[A-Za-z0-9._-]+$/i,          // Bearer token
  /^(ghp|gho|ghs|github_pat)_[A-Za-z0-9_]+$/, // GitHub PAT
  /^[A-Za-z0-9+/]{40,}={0,2}$/,           // 长base64，疑似token
];

function redact(value, key = "") {
  if (typeof value === "string") {
    if (SECRET_KEYS.test(key) || SECRET_VALUE.some((re) => re.test(value))) {
      return "[REDACTED]";
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => redact(v));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = redact(v, k);
    return out;
  }
  return value;
}

// 在 MCP 服务器返回 tool result 的统一出口处套一层
// server.setRequestHandler(CallToolRequestSchema, async (req) => {
//   const result = await handleToolCall(req);
//   return redact(result);  // ← 所有工具输出过一遍，而不是逐个工具记得做
// });
```

三个设计要点：

1. **在统一出口拦截**，而不是要求每个工具的实现者"记得"脱敏——遗忘是这种问题滋生的土壤；
2. **字段名 + 值形态双重匹配**，因为凭据经常埋在不叫 secret 的字段里（比如拼进 URL 的 `?api_key=`）；
3. **宁可误杀**：`[REDACTED]` 挡住一次正常的配置查看，代价可以接受；漏过一个集群 token，代价是 root 接管。

配套还要做两件事：轮换要便宜（假设已泄漏的轮换成本必须低，否则没人愿意做）；工具调用日志要打开（MCP08），否则下一次你依然只能"假设是"。

## 六、八月已经预警过

这不是孤例的第一次现身。2026 年 8 月的 Atlassian MCP CVE-2026-73498：认证客户端通过路径遍历读服务器进程能触及的任意文件，公告点名了凭据与环境变量。机制不同——那是输入侧的路径遍历，本文是输出侧的序列化默认——但结局一致：**MCP 暴露面能读到运维者从没打算放到模型面前的 secrets**。

两条防线因此都要有：输入侧（路径校验、认证，见本站 Atlassian MCP 与 GitLab MCP 分析）+ 输出侧（本文的脱敏层）。只做一半，secret 迟早走另一边。

## 七、结语

MCP 把"AI Agent 接入企业工具"的门槛降到了一个 script 配置，这是它三个月下载量破亿的原因。但门槛降低的代价是：**接入决策不再经过安全评审**，而协议本身不替你把关字段级的数据边界。

给所有 MCP 服务器作者的最后一句话：从你写出第一个 `get_config` 工具起，你就是在决定"模型可以看到组织里的什么"。逐字段过一遍，比事后给 82000 个公开配置文件里的泄漏 key 轮换要便宜得多。

## 参考资料

- [Your MCP Settings Tool Just Handed Your Secrets to the Model（API Stronghold / Workloft Labs 事件分析）](https://www.apistronghold.com/blog/mcp-tool-output-leaks-secrets)
- [CVE-2026-67357：ArcadeDB MCP settings 工具明文返回集群 token](https://www.cve.org)
- [OWASP MCP Top 10（MCP08：工具调用无日志）](https://owasp.org)
- [MCP 规范 2026-07-28 版安全控制](https://modelcontextprotocol.io)
- 本站相关文章：[Atlassian MCP 路径遍历 CVE-2026-73498](/security/offensive/mcp-atlassian-cve-2026-73498-confluence-upload-path-traversal-2026)、[CVE-2026-61560 GitLab MCP 接管链](/security/offensive/cve-2026-61560-gitlab-mcp-unauthenticated-sse-takeover-2026)、[MCP 治理面成型](/ai/mcp-governance-firewall-enterprise-enforcement-2026)、[MCP 企业托管授权 EMA](/ai/mcp-enterprise-managed-authorization-2026)
