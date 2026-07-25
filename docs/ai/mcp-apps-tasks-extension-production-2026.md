---
title: "MCP 2026-07-28 Apps 与 Tasks 扩展实战：让 Agent 长出界面与长任务能力"
date: 2026-07-26
tags:
  - ai
  - mcp
  - agent
  - llm
keywords:
  - MCP
  - Model Context Protocol
  - MCP Apps
  - Tasks extension
  - AI Agent
  - 2026
  - stateless
  - server-rendered UI
category: ai
description: "MCP 2026-07-28 规范把 server-rendered UI（MCP Apps）和长时异步任务（Tasks）拆分为独立扩展。本文用 TypeScript 示例演示如何为 MCP Server 返回可交互组件、如何启动一个可轮询的长任务，以及这两个扩展对企业级 Agent 架构的影响。"
---

# MCP 2026-07-28 Apps 与 Tasks 扩展实战：让 Agent 长出界面与长任务能力

MCP（Model Context Protocol）正在从"工具调用协议"升级为"Agent 运行时协议"。2026-07-28 修订版的最大变化之一，是把两大高阶能力从核心规范里拆出来，变成独立扩展：

- **MCP Apps**：服务器端渲染 UI 组件，让 Agent 不再只能返回 JSON，而是返回可交互的图表、表单、看板。
- **Tasks**：标准化长时任务，让 Agent 可以启动一个可能需要几分钟甚至几小时的作业，并通过轮询或订阅获取结果。

这两个扩展加上已经落地的 stateless 核心和企业授权（EMA），使 MCP 第一次能够同时覆盖"笔记本本地工具服务器"和"全球负载均衡背后的容器集群"。

## 一、MCP 从工具协议到运行时协议

在 2025-11-25 版规范里，MCP Server 的能力被表达为 `tools/list` 返回的 JSON Schema。客户端拿到 Schema，拼进 prompt，模型决定调用哪个工具，服务器执行后返回 `content` 数组。

这个模型对"读取文件、查数据库、跑 shell"足够好，但对两类场景很别扭：

1. **需要人类确认或交互的复杂结果**：比如一个数据分析工具返回一张需要用户下钻的图表，或者一个审批工具返回一个需要人点"同意/驳回"的表单。
2. **耗时超过单次请求生命周期的任务**：比如"扫描整个代码库的安全问题"、"对 10 万条记录做批量 ETL"、"触发一个 CI pipeline 并等待完成"。

2026-07-28 版的解法不是把 UI 渲染或任务状态机硬塞进核心，而是把它们定义为**扩展（extensions）**：核心保持最小化，扩展按自己的节奏迭代。这与浏览器把 HTML/CSS/JS 从 HTTP 核心拆出来的思路一致。

## 二、MCP Apps：服务器端渲染 UI

### 2.1 为什么需要 Apps 扩展

传统流程：

```text
Agent ──► tool/search_sales ──► {"summary": "Q2 营收 1200 万"}
```

用户只能看到一段文本摘要。如果他想按区域下钻，需要再问一次 Agent，再来一轮调用。

Apps 扩展允许 Server 返回一个渲染指令，客户端在本地渲染成组件：

```text
Agent ──► tool/analyze_sales ──► MCP App: <SalesDashboard data={...} />
```

### 2.2 协议层面长什么样

在 `tools/list` 里，Server 声明自己支持 `mcp-apps/v1` 能力：

```json
{
  "tools": [
    {
      "name": "analyze_sales",
      "description": "生成可交互的销售数据看板",
      "inputSchema": {
        "type": "object",
        "properties": {
          "quarter": { "type": "string" }
        }
      },
      "outputSchema": {
        "$ref": "#/components/schemas/McpAppRender"
      }
    }
  ],
  "capabilities": {
    "mcpApps": {
      "version": "mcp-apps/v1"
    }
  }
}
```

Server 返回的结果不再是纯文本，而是一个 `application/vnd.mcp.app+json` 载荷：

```json
{
  "type": "app",
  "app": {
    "component": "sales-dashboard",
    "version": "1.0.0",
    "props": {
      "quarter": "Q2",
      "regions": ["华东", "华北", "华南"],
      "total": 12000000,
      "drillDownEndpoint": "tool/analyze_sales_region"
    },
    "actions": [
      {
        "id": "export-csv",
        "label": "导出 CSV",
        "tool": "tool/export_sales_csv"
      }
    ]
  }
}
```

### 2.3 用 TypeScript 写一个支持 Apps 的 Server

下面是一个基于 `@modelcontextprotocol/sdk` 的简化示例：

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "sales-mcp-server", version: "1.0.0" },
  {
    capabilities: {
      tools: {},
      mcpApps: { version: "mcp-apps/v1" },
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "analyze_sales",
      description: "生成可交互的销售数据看板",
      inputSchema: {
        type: "object",
        properties: { quarter: { type: "string" } },
        required: ["quarter"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "analyze_sales") {
    throw new Error("Unknown tool");
  }
  const { quarter } = request.params.arguments as { quarter: string };

  return {
    content: [
      {
        type: "app",
        app: {
          component: "sales-dashboard",
          version: "1.0.0",
          props: {
            quarter,
            regions: ["华东", "华北", "华南"],
            total: 12000000,
            drillDownEndpoint: "tool/analyze_sales_region",
          },
          actions: [
            { id: "export-csv", label: "导出 CSV", tool: "tool/export_sales_csv" },
          ],
        },
      },
    ],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
main();
```

客户端渲染组件时，只需要识别 `type: "app"` 的 content，并把 `props` 传给对应的 React/Vue/Svelte 组件。当用户点击"导出 CSV"时，客户端再发起一次标准 MCP 工具调用。

## 三、Tasks 扩展：标准化长时任务

### 3.1 长任务的痛点

在旧版 MCP 里，如果一个工具执行 3 分钟，连接通常会超时，或者模型以为调用失败而重复发起请求。一些实现用 SSE 流式输出中间状态，但那是传输层行为，不是协议行为。

Tasks 扩展把"启动任务—轮询进度—获取结果"变成协议一等公民。

### 3.2 协议流程

```text
Client                          Server
  |   tasks/create (async)        |
  | ─────────────────────────────>|
  |<───────────────────────────── |  taskId: "task_abc", status: "running"
  |                               |
  |   tasks/get (poll / subscribe)|
  | ─────────────────────────────>|
  |<───────────────────────────── |  status: "running", progress: 45%
  |                               |
  |   tasks/get                   |
  | ─────────────────────────────>|
  |<───────────────────────────── |  status: "completed", result: {...}
```

Tasks 扩展同时支持**轮询**和**订阅**两种模式。stateless 核心下，每个请求自包含，因此订阅通常通过 Server-Sent Events 或 webhook 实现。

### 3.3 一个支持 Tasks 的 Server 示例

```typescript
import { randomUUID } from "crypto";

const tasks = new Map<string, { status: string; progress: number; result?: any }>();

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "scan_codebase_security",
      description: "扫描代码库安全漏洞，可能需要数分钟",
      inputSchema: { type: "object", properties: { repo: { type: "string" } } },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "scan_codebase_security") {
    const taskId = randomUUID();
    tasks.set(taskId, { status: "running", progress: 0 });

    // 模拟后台任务
    simulateScan(taskId);

    return {
      content: [
        {
          type: "text",
          text: `扫描任务已启动，任务 ID: ${taskId}`,
        },
      ],
      task: { id: taskId, status: "running" },
    };
  }
  throw new Error("Unknown tool");
});

// 处理 tasks/get 请求（示意，实际需对接 SDK 的 Tasks 扩展 handler）
async function handleTaskGet(taskId: string) {
  const task = tasks.get(taskId);
  if (!task) return { status: "not_found" };
  return {
    status: task.status,
    progress: task.progress,
    result: task.result,
  };
}

function simulateScan(taskId: string) {
  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    tasks.set(taskId, { status: progress < 100 ? "running" : "completed", progress });
    if (progress >= 100) {
      tasks.set(taskId, {
        status: "completed",
        progress: 100,
        result: { findings: [{ severity: "high", file: "auth.go" }] },
      });
      clearInterval(interval);
    }
  }, 1000);
}
```

### 3.4 客户端怎么消费 Task

在 Claude Code、Cursor 或自定义 Agent 客户端里，收到 `task` 字段后，应该：

1. 立即把任务 ID 展示给用户，避免重复调用。
2. 以指数退避轮询 `tasks/get`，或使用 SSE 订阅。
3. 任务完成后，把 `result` 拼回上下文。

```typescript
async function pollTask(taskId: string, server: McpClient) {
  while (true) {
    const state = await server.call("tasks/get", { id: taskId });
    if (state.status === "completed") return state.result;
    if (state.status === "failed") throw new Error(state.error);
    console.log(`进度: ${state.progress}%`);
    await new Promise((r) => setTimeout(r, 2000));
  }
}
```

## 四、架构图：MCP 扩展栈

```text
┌─────────────────────────────────────────────┐
│              MCP Client (Agent)              │
│  ┌─────────────┐  ┌─────────────┐          │
│  │ Tool Caller │  │ App Renderer│          │
│  └──────┬──────┘  └──────┬──────┘          │
│         └─────────────────┘                 │
│              Task Poller / Subscriber        │
└─────────────────────┬───────────────────────┘
                      │ HTTP / SSE / stdio
┌─────────────────────┴───────────────────────┐
│              MCP Server                      │
│  ┌─────────────────────────────────────┐    │
│  │        Core (stateless)             │    │
│  │   tools/list, tools/call, errors    │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────┐  ┌─────────────────┐   │
│  │  MCP Apps 扩展   │  │  Tasks 扩展      │   │
│  │  server-rendered │  │  async jobs     │   │
│  │  UI components   │  │  progress/result│   │
│  └─────────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────┘
```

## 五、落地建议

1. **先支持核心再支持扩展**： Apps/Tasks 是可选扩展，客户端会通过 capabilities 协商。如果客户端不支持，Server 应降级为普通文本/JSON 输出。
2. **Tasks 必须幂等**：同一个 `taskId` 在重试时不能产生副作用。建议在创建任务时生成幂等 key，并把状态持久化到 Redis 或数据库。
3. **Apps 组件版本化**：客户端缓存组件实现时，要按 `version` 字段隔离，避免 Server 升级 props 结构后客户端渲染崩溃。
4. **错误状态也要标准化**：Tasks 扩展定义了 `failed`、`cancelled` 等状态，Server 应统一返回 `{status, error, retryable}` 结构。
5. **与 EMA 授权配合**：企业部署时，Apps 和 Tasks 的权限粒度应该通过 Enterprise-Managed Authorization 扩展集中管控，而不是每个 Server 自己维护 ACL。

## 六、完整可运行 Demo

下面把 Apps 和 Tasks 合到一个最小 Server 里：

```typescript
// apps-tasks-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "demo-apps-tasks", version: "1.0.0" },
  {
    capabilities: {
      tools: {},
      mcpApps: { version: "mcp-apps/v1" },
      tasks: { version: "tasks/v1" },
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "show_dashboard",
      description: "展示可交互看板",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "long_running_job",
      description: "启动一个长时任务",
      inputSchema: { type: "object", properties: { duration: { type: "number" } } },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const name = req.params.name;
  if (name === "show_dashboard") {
    return {
      content: [
        {
          type: "app",
          app: { component: "demo-dashboard", version: "1.0.0", props: { value: 42 } },
        },
      ],
    };
  }
  if (name === "long_running_job") {
    return {
      content: [{ type: "text", text: "任务已启动" }],
      task: { id: "task-001", status: "running" },
    };
  }
  throw new Error("Unknown tool");
});

async function main() {
  await server.connect(new StdioServerTransport());
}
main();
```

## 参考资料

- MCP 2026-07-28 Specification Draft — https://modelcontextprotocol.io/specification/2026-07-28
- Agentic coding agents: July 2026 and the MCP revision — https://radar.firstaimovers.com/agentic-coding-agents-july-2026-momentum-mcp-spec-revision
- AI Weekly: MCP Goes Stateless — https://dev.to/alexmercedcoder/ai-weekly-mcp-goes-stateless-kimi-k3-tsmc-records-3doo
- MCP TypeScript SDK — https://github.com/modelcontextprotocol/typescript-sdk
- MCP Enterprise-Managed Authorization — https://spec.modelcontextprotocol.io/specification/2026-07-28/basic/authorization
