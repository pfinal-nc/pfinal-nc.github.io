---
title: WebMCP 深度解析：让网页向 AI Agent 暴露「可调用工具」的新标准，为什么 OpenAI/Shopify/Cloudflare 一周内全部入局
date: 2026-09-04
tags:
  - ai
  - webmcp
  - agent
  - browser-api
  - ai-coding
  - mcp
  - llms-txt
keywords:
  - WebMCP
  - AI Agent 浏览器
  - navigator.modelContext
  - Site Tools
  - MCP
  - agent-native web
  - registerTool
  - Cloudflare WebMCP
  - Shopify WebMCP
  - OpenAI WebMCP Challenge
  - 人机协作网页
category: ai
description: 2026 年 8 月底，OpenAI 发布 Site Tools、发起 10 天 WebMCP Challenge，Cloudflare 提供边缘一键注入、Shopify 为所有店铺默认开启——一个由 W3C Web Machine Learning Community Group 孵化的浏览器 API 草案，突然成为 AI Agent 生态的行业共识。本文从协议原理、registerTool 代码实战、三家落地架构、与 MCP 的关系，到安全风险与开发建议，完整拆解 WebMCP。
recommend: AI工程
---

# WebMCP 深度解析：让网页向 AI Agent 暴露「可调用工具」的新标准

> W3C Web Machine Learning Community Group 草案 | Google/Microsoft 工程师主导 | OpenAI 8/25 发起 Challenge | 论文实测 token 减少 89%

## 一句话概括

**WebMCP 让网页主动告诉 AI Agent：「我能做这些事，你直接调工具就行，别瞎点我的按钮。」** 网站用一行 `registerTool()` 注册带名字、描述、JSON Schema 参数定义的 JS 函数，Agent 访问页面时发现并直接调用——不再靠截图 + 视觉模型猜测哪个按钮是干什么的。它把 Agent 操作网页的可靠性，从「大概能点对」提升到「精确函数调用」。

## 为什么它突然火了：web 的「第三层机器可读性」

过去三十年的 Web，为两种消费者设计了两种界面：

| 层 | 标准 | 服务对象 | 表达内容 |
|---|------|---------|---------|
| L1 爬取索引 | `robots.txt` | 搜索引擎爬虫 | 哪些页面可以抓 |
| L2 内容语义 | `schema.org` / OpenGraph | 搜索引擎 | 页面内容「是什么」 |
| **L3 可调用函数** | **WebMCP** | **AI Agent** | 页面「能做什么」 |

`robots.txt` 告诉爬虫哪些页面能索引，`schema.org` 告诉搜索引擎内容代表什么——但两者都只解决「读」。当 Agent 要「做」——搜索商品、改图表、加购物车、下单——它只能退化成模拟人类：读 DOM、找按钮、点击、等渲染、再检查。慢、贵、错。

WebMCP 补上第三层：**让网站注册 Agent 可以直接调用的、结构化的命名函数**。这个「数据已变成代码」的叙事在 2026 年 8 月底集中引爆：

- **2026-02**：Chrome 开放早期预览，W3C 社区组草案进入浏览器
- **08-06**：Cloudflare 发布开发者预览——仪表盘一键开启，边缘注入 WebMCP bridge
- **08 月中**：Shopify 在开发者 changelog 低调宣布所有 Liquid 主题店铺默认开启
- **08-25**：OpenAI 在 ChatGPT 桌面浏览器落地 **Site Tools**，同时发起 10 天 **WebMCP Challenge**（与 Chromium/Cloudflare/Shopify/Vercel/Netlify/Render 联合）

一条 W3C 社区组草案，从提案到 OpenAI/Shopify/Cloudflare 三大平台生产落地，只用了不到六个月。

## WebMCP 核心机制

### 1. 工具注册：一个 JS 调用

WebMCP 是浏览器 API，目前主流实现挂在 `navigator.modelContext`（早期草案叫 `navigator.webmcp`，部分实现叫 `document.modelContext`——API 挂载点仍在演进）：

```js
// 复用你现有的业务函数，包一层即可
await navigator.modelContext.registerTool({
  name: 'search_products',
  description: '按关键词搜索商品目录',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '搜索关键词' },
      limit: { type: 'number', description: '最多返回条数', default: 10 }
    },
    required: ['query']
  },
  execute: async ({ query, limit }) => {
    return searchProducts(query, limit); // 复用现有逻辑
  }
});
```

四个设计要点：

- **网站选择工具**：Agent 不会自动获得页面上每个按钮/表单的权限，只有注册过的函数可调。
- **结构化契约**：`inputSchema` 是 JSON Schema，Agent 端据此生成参数，无需反向工程 UI。
- **浏览器内执行**：工具跑在页面 JS 上下文里，**共享用户当前会话、登录态与 DOM 状态**。
- **Agent 形态不限**：可以是浏览器内置助手、扩展，或页面内嵌的 copilot。

### 2. 一次完整的「人机协作」调用

以数据分析产品为例，用户对页面内嵌 copilot 说「把 404 错误按页面分组展示」。没有 WebMCP 时，Agent 要找到状态筛选器 → 打开 → 选 404 → 找分组控件 → 选 page → 改图表 → 核对结果。有 WebMCP 时，网站注册一个 `update-chart` 工具，Agent 直接发送：

```json
{ "status": 404, "groupBy": "page", "chart": "bar" }
```

网站验证输入、用自己的代码更新图表，用户在同一个界面看到变化，可以随时纠正。**工具的每一次调用都发生在用户可见的页面上**——这是 WebMCP 与后台 API 的本质区别：用户始终在环。

### 3. 声明式：HTML 注解形式

对不想写 JS 的场景，草案也支持在 HTML 中声明工具：

```html
<form id="product-search" data-agent-tool="search_products">
  <input name="query" type="search" data-agent-description="搜索关键词" required>
</form>
```

声明式优先是官方推荐路线：维护成本最低，页面加载即可发现。

## 三家平台的落地：谁在推，怎么推

### OpenAI：Site Tools + 10 天 Challenge

OpenAI 把 WebMCP 在自家产品里的实现叫 **Site Tools**：

- ChatGPT 桌面端内置浏览器**原生支持**，ChatGPT Work 与 Codex 用户可发现并调用页面上的 WebMCP 工具
- 需使用 GPT-5.6 Sol / Terra 模型（Luna 暂禁用）；企业版与教育版工作区暂不可用
- ChatGPT Sites 部署的应用同样支持——用 Codex 生成的网站可直接暴露工具，形成「生成即 Agent 可用」闭环

8 月 25 日，OpenAI 联合 Chromium、Cloudflare、Shopify、Vercel、Netlify、Render 发起 **10 天 WebMCP Challenge**（9/3 截止、9/23 公布结果）：$35,000 现金池，10 支获奖队各 $3,000 + Codex Micro + 1 年 ChatGPT Pro。与其说是黑客松，不如说是**用一笔小钱让几百个团队替行业探索「Agent-native Web」的真实用例**。

### Cloudflare：一个开关，边缘注入

Cloudflare 的切入角度最聪明——解决**采用率瓶颈**：

1. 仪表盘为域名开启 WebMCP 开关
2. 边缘节点用 HTMLRewriter 在返回的 HTML 中静默注入 `bridge.js`
3. 脚本注册工具到页面——**无需改源站代码，静态站和 SPA 都能用**

Cloudflare 把工具打包为 **Tool Packs**，预览版含两个：
- **Content Credentials**：让 Agent 读取页面图片的 C2PA 内容来源元数据
- **Site MCP Server**：把站点已有的后端 MCP 服务器（默认路径 `/mcp`）代理为浏览器内的 WebMCP 工具

如果边缘注入跑通，WebMCP 的采用曲线会陡峭得多。

### Shopify：百万商家静默上线

Shopify 的部署规模目前全球第一：**所有 Liquid 主题店铺与 Hydrogen 开发者预览默认开启**，每个店铺默认暴露约 10 个工具，商家零操作。架构细节很关键——Shopify 没有从零开发，而是复用了已有的后端 MCP 基础设施（每店 `/api/mcp`），把同样的能力从「后端 API 调用」搬进「购物者真实标签页内调用」，用购物者自己的会话与购物车。

| 类型 | 工具示例 |
|------|---------|
| Answer 类（只读查询） | `search_catalog`、`browse_store`、`get_product`、`show_variant`、`search_policies` |
| Act 类（操作状态） | `get_cart`、`update_cart`、`cancel_cart`、`proceed_to_checkout`、`manage_orders` |

## WebMCP vs MCP：互补，不是替代

名字相似，架构完全不同：

| 维度 | MCP（Model Context Protocol） | WebMCP |
|------|-------------------------------|--------|
| 工具位置 | 独立后端 MCP Server | 网站页面本身 |
| 连接方式 | AI 客户端直连服务器（stdio/HTTP/SSE） | Agent 访问页面时在浏览器内发现 |
| 会话上下文 | 服务器自己的认证与授权 | 复用用户的浏览器登录态 |
| 执行环境 | 服务端 | 页面 JS 上下文（浏览器） |
| 能力范围 | tools + resources + prompts + sampling | **目前仅 tools** |
| 提出方 | Anthropic（2024） | W3C WG（Google/Microsoft 工程师） |

一句话：**MCP 连接 AI 与后端服务，WebMCP 让网页本身成为 Agent 的工具面**。两者互补——Cloudflare 的 Site MCP Server Tool Pack 就是活生生的桥梁：把后端 MCP 服务器代理成浏览器内工具。

值得注意的一个空白：**Anthropic 是 MCP 的发明者，但在 WebMCP 上表态很少**。如果 Claude 走另一条路，市场可能短暂分裂——但对开发者而言，底层都是「结构化工具声明」，迁移成本不高。

## 效率数据：为什么 Agent 需要它

研究论文实测：Agent 调用结构化 WebMCP 工具 vs 解析渲染后的 HTML，**每次交互 token 消耗减少约 89%，成本降低约 53%**。逻辑很直白：Agent 读一页 HTML 推断函数，往往要消耗数万 token；调用命名操作只要几分之一。这让「比价购物、跨店凑单、库存监控」这类高频 agent 任务第一次在经济上可行。

## 风险与未定之数

WebMCP 声势很大，但仍有四个实打实的问号：

1. **规范仍在变**。API 挂载点从 `navigator.webmcp` 演进到 `navigator.modelContext`，早期适配者要预留重构预算。
2. **跨浏览器未定**。目前只有 Chromium 系在推（Chrome 146 flag、149 Origin Trial、Brave Leo 实验支持），Safari/Firefox 尚无公开表态。若变成 Chrome 专属，「Web 标准」就缩水成「Chrome 特性」。
3. **发现机制缺失**。Agent 必须先访问页面才能发现工具，全网级发现机制（类似 sitemap）尚不存在——早期 WebMCP 更多是增强已有流量，而非带来新流量。
4. **安全边界仍在摸索**。谁能看到注册的工具？权限粒度多细？破坏性操作如何确认？草案有讨论但无定论。OpenAI 的 Site Tools 要求**敏感操作（购买、发消息）仍需用户确认**，但实现由各 Agent 端自行决定，没有统一标准。

## 开发者现在该做什么

如果你想今天就用上 WebMCP，三条路径：

**路径 A：ChatGPT 桌面端**（最省事）——更新到最新版，直接打开带 WebMCP 的网站体验（OpenAI 自家的 ChatGPT Learn / Developers 站点已上线 Site Tools）。

**路径 B：Chrome 实验 flag**——地址栏输入 `chrome://flags/#enable-webmcp-testing` 开启；Chrome 149+ 可注册 Origin Trial 让真实用户免 flag 使用。

**路径 C：Cloudflare 一键注入**——网站在 Cloudflare 上的话，开个开关即可体验基础 Tool Pack。

动手建议（按风险排序）：

1. **从只读工具开始**：搜索、查询、数据展示类工具风险最小、最容易验证价值
2. **声明式优先**：能用 HTML 表单注解就别写 JS，维护成本最低
3. **复用现有逻辑**：不要为 WebMCP 重写业务代码，只是把已有函数包一层 `registerTool`
4. **保留破坏性操作的确认步骤**：任何 transactional 工具都建议保留人工确认
5. **关注 ChatGPT Sites**：新应用可直接部署到 ChatGPT Sites，天然获得 WebMCP + Agent 环境

## 参考与延伸阅读

- W3C Web Machine Learning Community Group WebMCP 提案（浏览器 API 草案）
- OpenAI：Site Tools 文档 / WebMCP Challenge 公告（2026-08-25）
- Cloudflare：WebMCP 开发者预览公告（2026-08-06）
- Shopify：开发者 changelog —— WebMCP 默认开启（2026-08）
- pixelhop.io：*What is WebMCP? Why it matters for websites and AI agents*
- 相关阅读：[llms.txt 供应链攻击深度拆解：数据已变成代码的攻防范式剧变](/security/offensive/llms-txt-supply-chain-2026)、[MCP 2026-08-22 新版路线图深度解读](/ai/mcp-2026-08-22-roadmap-agent-identity-progressive-discovery)、[MCP 2.0 无状态重构](/ai/mcp-2-0-stateless-protocol-rewrite-2026)
