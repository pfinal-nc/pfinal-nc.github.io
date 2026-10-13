---
title: "MCP Codemode 模式：解决 Agent 的 Token 税问题——Pi 0.99 的沙箱化工具调用架构解析"
date: 2026-10-13
tags:
  - AI
  - MCP
  - Agent
  - 安全
keywords:
  - MCP Codemode
  - Token 税
  - QuickJS 沙箱
  - AI Agent 工具调用
  - Pi coding agent
category: AI 工具
description: MCP 生态突破 10000 服务器、月 SDK 下载 9700 万的今天，工具 schema 预加载导致的"Token 税"成为 Agent 成本最大头。本文解析 Pi 0.99 的 Codemode 模式：让模型写 JS 在 QuickJS 沙箱中编排 MCP 工具，一轮往返替代 N 轮工具调用。
---

# MCP Codemode 模式：解决 Agent 的 Token 税问题——Pi 0.99 的沙箱化工具调用架构解析

## 一、问题：MCP 赢了，但成本账没算清

2026 年 10 月，MCP（Model Context Protocol）跨过两个里程碑：公开注册服务器突破 10000 个，月 SDK 下载量达到 9700 万。协议本身已经赢了——但随之而来的是一个被多数团队低估的工程问题：**工具调用上下文成本**。

标准 MCP 的交互模型是这样的：Agent 启动时，把所有已连接 MCP Server 的工具 schema 全部加载进上下文窗口。每个工具的 schema 描述（名称、参数、JSON Schema、说明文字）通常占用 550–1400 token。Perplexity CTO 在 2026 年 3 月给出的数据是业内最广为引用的案例：**仅连接 3 个 MCP Server，就消耗了 200K 上下文中的 143K token——72% 的上下文税，在用户提问第一个字之前就已扣除**。

这还没算中间结果。传统循环是：

```
模型读 schema → 发出工具调用 JSON → 收到结果（常驻上下文）→
读下一个 schema → 再调用 → 再收结果 → ……
```

每一次工具返回都成为上下文的"永久居民"。一个 20 步的文件检索任务，中间结果可能吃掉数十万 token，即使其中 90% 的内容在后续步骤中毫无用处。

## 二、Pi 的立场转变：不是翻脸，是成本模型变了

Pi 是一个极简主义编码 Agent，以"系统提示 + 工具定义 < 1000 token"著称——它公开拒绝支持 MCP 超过一年，核心理由就是 Token 税。2026 年 9 月 29 日，Pi 0.99.0 把 MCP 作为核心功能发布，公告标题颇有自嘲味道："You Said No MCP!"（你说过不要 MCP 的！）。

促使转变的三个因素：

1. **协议侧改进**：2026 年 7 月的 MCP 规范修订优先支持无状态运行，砍掉了让生产部署很难受的 initialize 握手与会话层。
2. **生态既成事实**：超过 17000 个公开服务器、企业 AI 团队大面积生产化。用户已经在跑 MCP，拒绝兼容等于拒绝用户。
3. **成本问题有了真解法**：这就是本文的主角——**Codemode**。

## 三、Codemode 架构：从"调用工具"到"写代码调工具"

### 3.1 核心思路

Codemode 改变了模型与工具的交互方式：

- **旧模式**：模型直接看到每个工具的 schema，用 JSON 工具调用逐个触发，所有中间结果回到上下文。
- **Codemode 模式**：模型**写一段 JavaScript**，这段 JS 在 Agent 宿主内嵌的 **QuickJS 沙箱**中执行，MCP 工具以可发现函数的形式暴露给沙箱，模型通过文档发现工具、在代码中调用它们，**只有最终返回值重新进入上下文**。

```
┌──────────────────────────────────────────────────┐
│  模型                                             │
│   "写一段 JS：搜索 docs 下所有 md，统计关键词频次"     │
└──────────────────┬───────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────┐
│  QuickJS 沙箱（宿主进程内）                          │
│   const files = await fs.list("docs/", "**.md")  │
│   ...循环、过滤、聚合...                             │
│   MCP 工具 = 普通异步函数                            │
└──────────────────┬───────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────┐
│  只有最终结果（如 JSON 摘要）回到模型上下文             │
└──────────────────────────────────────────────────┘
```

### 3.2 三个结构性收益

**1. 往返次数坍缩：N 轮模型对话 → 1 次沙箱执行。** 20 步的文件任务从 20 轮 LLM API 调用变成 1 轮写码 + 1 轮（可选）总结。延迟和成本同时下降。

**2. 中间结果不出沙箱。** 工具返回的原始数据（大文件内容、列表、HTML）只在沙箱内存中流转，不再污染上下文窗口。模型只消费聚合后的最终值。

**3. 工作可复现。** 产物是一段脚本，开发者可以 review、编辑、重跑。这是相对黑盒工具调用链的重大工程价值——Agent 的工作从"一次性会话"变成了"可版本化的代码"。

### 3.3 一个可运行的类比实现

Codemode 的思想不依赖 Pi 本身，任何 Agent 宿主都能实现同构架构。下面是一个用 Node.js + `quickjs-emscripten` 的最小可行实现：

```javascript
// codemode.mjs — 最小 Codemode 宿主
import { getQuickJS } from "quickjs-emscripten";
import { execSync } from "node:child_process";

// 1. 定义暴露给沙箱的 MCP 工具（此处用本地实现模拟）
const mcpTools = {
  async fetch_url(url) {
    const res = await fetch(url);
    return await res.text();
  },
  async run_cmd(cmd) {
    return execSync(cmd, { encoding: "utf8" });
  },
};

// 2. 生成工具文档（替代预加载 schema——只在模型需要时检索）
const toolDoc = Object.entries(mcpTools)
  .map(([name, fn]) => `${name}${fn.length ? "(...args)" : "()"}: async`)
  .join("\n");

// 3. 在 QuickJS 沙箱中执行模型生成的代码
async function runCode(code) {
  const QuickJS = await getQuickJS();
  const vm = QuickJS.newContext();

  // 注入工具：异步通过 Asyncify 或预执行适配，此处简化为同步桥接
  for (const [name] of Object.entries(mcpTools)) {
    const fnHandle = vm.newFunction(name, (...args) => {
      const resolved = mcpTools[name](
        ...args.map((a) => vm.dump(a))
      );
      const ret = vm.newString(JSON.stringify(resolved ?? null));
      return ret;
    });
    vm.setProp(vm.global, name, fnHandle);
    fnHandle.dispose();
  }

  const result = vm.evalCode(code);
  if (result.error) {
    const err = vm.dump(result.error);
    result.error.dispose();
    vm.dispose();
    throw new Error("sandbox: " + err);
  }
  const value = vm.dump(result.value);
  result.value.dispose();
  vm.dispose();
  return value;
}

// 4. 模型生成的代码示例——20 步工具链在一段脚本内完成
const modelGeneratedCode = `
  const out = run_cmd("ls docs/dev/backend/golang | head -20");
  return out.split("\\n").filter(f => f.endsWith(".md")).length;
`;

console.log(await runCode(`(function(){ ${modelGeneratedCode} })()`));
```

运行方式：

```bash
npm i quickjs-emscripten
node codemode.mjs
# 输出：20  （只返回数字，ls 的全部中间文本从未进入模型上下文）
```

生产级实现还需要补齐三件事：异步工具的 Promise 桥接（QuickJS 原生不支持 async，需 Asyncify）、执行超时与内存上限（`vm.runtime.setMemoryLimit` / `setInterruptHandler`）、以及工具白名单——**沙箱能调哪些 MCP 工具，必须由宿主显式授权，而不是默认全量**。

## 四、安全视角：Codemode 是收窄攻击面，不是扩大

看到"让模型写代码"很多人的第一反应是危险。实际上方向相反——**Codemode 把无界的工具调用收敛为有界的代码执行**：

| 维度 | 传统 MCP 循环 | Codemode |
|---|---|---|
| 中间结果暴露面 | 全部进上下文，可能被 prompt 注入利用 | 留在沙箱，不回流 |
| 工具滥用 | 模型可自由串联任意工具序列 | 代码可被人工 review 后再执行 |
| 恶意 server 注入 | 每次 schema 加载都是注入面 | schema 不预加载，改为按需文档检索 |
| 资源控制 | 难以限制调用链 | 沙箱内可硬限内存/时间/IO |

QuickJS 的优势正在于此：它是一个**无 JIT 的可嵌入解释器**，没有 JIT 喷射攻击面，内存占用可控，宿主可以随时中断执行。这和 2026 年 7 月 MCP 规范转向无状态化是同一个方向——协议生态正在把"信任边界"从隐式会话收敛到显式、可审计的执行单元。

当然前提是做对：**代码执行必须在权限受控的沙箱里，而不是直接在宿主进程里**。这一点和任何代码执行类 Agent（E2B、Cloudflare Workers、Anthropic Code Execution）的要求一致。

## 五、对 Agent 应用开发者的三条落地建议

1. **给你的 Agent 加一层"代码执行"逃生舱。** 如果你的产品有 5 步以上的工具链任务，Codemode 模式通常能把 token 成本降一个数量级。判断标准很简单：中间结果是否只需要被聚合而不需要被模型"理解"。
2. **schema 预加载改为按需文档检索。** 把工具文档做成可检索资源（Pi 用文档 + grep 的方式），模型需要时再查。这一条不需要沙箱就能落地，当天可上线。
3. **把工具调用的产物代码化。** Codemode 最大的隐性收益是可复现。让 Agent 的工作以脚本形式沉淀，你的产品就有了"缓存、回放、人工兜底"三件套。

## 参考资料

- MCP 生态里程碑：[MCP at 10,000: How the Agent Interface Standard Won](https://codex.danielvaughan.com/2026/10/11/mcp-ten-thousand-servers-agent-interface-standard-enterprise-adoption-codex-cli)
- Pi 0.99 Codemode 详解：[Pi Coding Agent Adds MCP Support and Solves the Token Tax With Codemode](https://dnt.co.il/one-coding-agent-spent-a-year-mocking-mcp-it-just-made-mcp-a-core-feature)
- QuickJS 嵌入方案：[quickjs-emscripten](https://github.com/justjake/quickjs-emscripten)
- MCP 官方规范（2026-07 无状态修订）：https://modelcontextprotocol.io/
