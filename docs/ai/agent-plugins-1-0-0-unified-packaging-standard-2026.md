---
title: "Agent Plugins 1.0.0 深度解析：六大巨头如何用一个目录结构统一 AI 代理插件生态"
date: 2026-08-27
tags:
  - ai
  - agent
  - mcp
  - plugins
  - openai
  - cursor
  - vscode
  - interoperability
keywords:
  - Agent Plugins
  - plugin.json
  - Agent Skills
  - MCP server
  - 互操作性
  - 插件标准
  - vendor-neutral
  - ChatGPT
  - Cursor
  - GitHub Copilot
category: AI系列
description: "2026 年 8 月 6 日，OpenAI、Microsoft、Amazon、Cursor、Vercel 联合发布 Agent Plugins 1.0.0 规范，Google 同日加入。本文深度解析插件目录结构、manifest 规范、跨客户端兼容性、Anthropic 缺席背后的生态分裂及开发者实践方案。"
---

# Agent Plugins 1.0.0 深度解析：六大巨头如何用一个目录结构统一 AI 代理插件生态

## 概述

2026 年 8 月 6 日，五家在几乎所有领域都在竞争的公司就一件事情达成了一致：一个文件夹布局。

**Agent Plugins 1.0.0** 正式发布——一个开放的、厂商中立的规范，用于将 Agent Skills 和 MCP 服务器打包为单一可移植插件，使任何兼容客户端都能发现和加载。核心维护者包括 AWS、Cursor、Microsoft、OpenAI 和 Vercel，Google 在发布当天作为第六位核心维护者加入。

> **一句话总结**：Agent Plugins 不是一个新协议，而是一个"信封"——它打包了已有的 Agent Skills 和 MCP 服务器，让同一个插件跨 ChatGPT、Cursor、GitHub Copilot、VS Code 等客户端运行。

### 关键数据

| 维度 | 数据 |
|------|------|
| 发布日期 | 2026-08-06 |
| 核心维护者 | 6 家（AWS / Cursor / Microsoft / OpenAI / Vercel / Google） |
| 兼容客户端 | 6+（ChatGPT / Codex / Cursor / GitHub Copilot / Kiro / VS Code） |
| 必填字段 | 2 个（`$schema` + `name`） |
| 组件类型 | 2 种（Agent Skills + MCP servers） |
| MCP Registry 服务器 | 9,652+ |
| MCP 生产采用率 | 41% 软件组织 |

## 规范核心：一个目录和两个必填字段

### 2.1 设计哲学：克制即设计

Agent Plugins 规范的精妙之处在于它**不做什么**。以下内容被明确排除在范围之外：

- 安装与分发机制
- 权限和审批流程
- 沙箱和运行时环境
- 市场和信任体系
- 发布者身份和签名
- 命令、钩子、子代理等扩展类型

Google 工程师直言："Agent Plugins v1 是一个包格式，仅此而已。一个插件就是一个目录。这就是全部想法，克制才是重点。"

### 2.2 目录结构

```
my-plugin/
├── plugin.json                    # 最小 manifest（必须）
├── skills/                        # Agent Skills 目录
│   └── summarize/
│       ├── SKILL.md              # 技能指令和知识
│       ├── scripts/              # 可执行代码
│       └── references/           # 参考资料
├── mcp.json                      # MCP 服务器配置（可选）
└── com.example.client/           # 客户端专属命名空间（可选）
    └── client-specific-config.json
```

### 2.3 plugin.json：最小 manifest

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "name": "hello-plugin"
}
```

仅此两个字段是必填的。`$schema` 指向 JSON Schema 验证文档，`name` 是插件的唯一标识。所有其他元数据都是可选的——版本、描述、作者等都有标准位置，但不是必须的。

### 2.4 mcp.json：MCP 服务器声明

```json
{
  "servers": {
    "database": {
      "transport": "stdio",
      "command": "node",
      "args": ["./server.js"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    },
    "api-server": {
      "transport": "streamable-http",
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${API_TOKEN}"
      }
    }
  }
}
```

每个 MCP 服务器条目必须显式声明传输类型：`stdio`、`streamable-http` 或遗留的 `sse`。

### 2.5 SKILL.md：技能定义

```markdown
---
name: summarize
description: "Summarize long documents into concise key points"
version: "1.0.0"
---

# Summarize Skill

## Instructions

When asked to summarize a document:
1. Read the full content
2. Identify the 3-5 key themes
3. Extract supporting evidence for each theme
4. Produce a structured summary with:
   - Executive summary (2-3 sentences)
   - Key points (bullet list)
   - Supporting details (optional)

## Context

This skill is designed for technical documents but works with any text.
```

## 架构设计：分层与组合

### 3.1 三层生态架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    兼容客户端层                                    │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│  │ChatGPT │ │ Codex  │ │ Cursor │ │Copilot │ │ VS Code│  ...   │
│  └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘        │
│      │          │          │          │          │               │
├──────┴──────────┴──────────┴──────────┴──────────┴───────────────┤
│                   Agent Plugins 1.0.0                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  plugin.json (manifest: $schema + name)                  │    │
│  │  ┌─────────────────┐  ┌─────────────────┐                │    │
│  │  │  skills/         │  │  mcp.json       │                │    │
│  │  │  (Agent Skills)  │  │  (MCP servers)  │                │    │
│  │  └─────────────────┘  └─────────────────┘                │    │
│  │  ┌─────────────────┐                                     │    │
│  │  │  com.client/     │  (命名空间扩展)                     │    │
│  │  └─────────────────┘                                     │    │
│  └──────────────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────────┤
│                    基础协议层                                      │
│  ┌──────────────────┐          ┌──────────────────┐             │
│  │ Agent Skills     │          │ MCP              │             │
│  │ (Anthropic 创建)  │          │ (Anthropic 创建)  │             │
│  │ 可复用指令和知识   │          │ 工具/数据连接协议  │             │
│  └──────────────────┘          └──────────────────┘             │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Agent Plugins 不重定义任何东西

Agent Plugins 不重新定义 Skills 或 MCP。它**打包**两个已有广泛采用的构建块：

- **MCP** 处理到数据库、API、文件存储的连接
- **Agent Skills** 提供指令：做什么、以什么顺序、用什么约定

插件只是说"这些东西属于一起"的信封。

### 3.3 客户端验证流程

```
插件加载流程:

1. 客户端发现插件目录
   └── 定位 plugin.json

2. 验证 manifest
   ├── 检查 $schema 字段
   ├── 检查 name 字段
   └── 验证 JSON 结构

3. 独立验证各组件
   ├── skills/
   │   └── 每个子目录的 SKILL.md
   └── mcp.json
       └── 每个服务器的 transport 声明

4. 加载到客户端运行时
   ├── 一个损坏的 skill 不会影响其他 skill
   ├── MCP 服务器按需启动
   └── 客户端专属配置从命名空间目录加载
```

## 生态格局：谁参与了，谁没有

### 4.1 六大核心维护者

| 公司 | 角色 | 发布产品 |
|------|------|---------|
| Vercel | 规范发起者 | 初始草案 |
| OpenAI | 核心维护者 | ChatGPT + Codex |
| Microsoft | 核心维护者 | VS Code + GitHub Copilot |
| AWS | 核心维护者 | Kiro |
| Cursor (Anysphere) | 核心维护者 | Cursor IDE |
| Google | 核心维护者（Day 1 加入） | Agents CLI + Data Agent Kit |

### 4.2 兼容客户端

| 客户端 | 状态 | 维护方 |
|--------|------|--------|
| ChatGPT | 发布即支持 | OpenAI |
| Codex | 发布即支持 | OpenAI |
| Cursor | 发布即支持（co-author） | Anysphere |
| GitHub Copilot | 发布即支持 | GitHub/Microsoft |
| VS Code | 发布即支持 | Microsoft |
| Kiro | 发布即支持 | AWS |
| Google Agents CLI | 发布日宣布支持 | Google |
| Google Data Agent Kit | 发布日宣布支持 | Google |

### 4.3 Anthropic 的缺席

Agent Plugins 生态中最引人注目的缺席者是 **Anthropic**——MCP 和 Agent Skills 两个底层协议的创建者。

Anthropic 的情况：
- 创建了 MCP 并将其捐赠给 Linux Foundation 的 Agentic AI Foundation
- 创建了 Agent Skills 格式
- 不在 Agent Plugins 核心维护者名单中
- Claude Code 不在兼容客户端列表中
- Claude Code 有自己的插件系统（官方 marketplace 收录 561 个插件，2026-07-24 快照）

```
生态分裂示意:

  Agent Plugins 联盟                     Anthropic 阵营
  ┌────────────────────┐               ┌────────────────────┐
  │  OpenAI            │               │  Anthropic          │
  │  Microsoft         │               │  Claude Code        │
  │  AWS               │               │  Cowork Desktop     │
  │  Cursor            │               │  自有插件系统        │
  │  Vercel            │               │  (官方市场 561+ 插件) │
  │  Google            │               │                     │
  │                    │               │                     │
  │  plugin.json 格式   │    vs        │  自有目录格式         │
  │  标准化打包          │               │  渐进式披露模型       │
  └────────────────────┘               └────────────────────┘
```

## 开发者实践：构建第一个 Agent Plugin

### 5.1 项目结构

```bash
# 创建插件项目
mkdir my-data-agent && cd my-data-agent

# 目录结构
my-data-agent/
├── plugin.json
├── skills/
│   └── query-database/
│       ├── SKILL.md
│       └── scripts/
│           └── validate_sql.py
├── mcp.json
└── com.cursor/
    └── cursor-settings.json
```

### 5.2 完整 plugin.json

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "name": "data-agent",
  "version": "1.0.0",
  "description": "Query and analyze databases using natural language",
  "author": {
    "name": "Data Team",
    "email": "data@example.com"
  },
  "license": "MIT",
  "homepage": "https://github.com/example/data-agent"
}
```

### 5.3 MCP 服务器实现

```python
# server.py — MCP 服务器实现
from mcp.server import Server
from mcp.types import Tool, TextContent
import asyncpg
import json

server = Server("database-tools")

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="execute_query",
            description="Execute a read-only SQL query",
            inputSchema={
                "type": "object",
                "properties": {
                    "sql": {
                        "type": "string",
                        "description": "SQL query (SELECT only)"
                    }
                },
                "required": ["sql"]
            }
        ),
        Tool(
            name="list_tables",
            description="List all tables in the database",
            inputSchema={"type": "object", "properties": {}}
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "execute_query":
        sql = arguments["sql"]
        # 安全检查：只允许 SELECT
        if not sql.strip().upper().startswith("SELECT"):
            return [TextContent(
                type="text",
                text="Error: Only SELECT queries are allowed"
            )]
        
        conn = await asyncpg.connect("postgresql://localhost/mydb")
        try:
            rows = await conn.fetch(sql)
            result = [dict(row) for row in rows]
            return [TextContent(
                type="text",
                text=json.dumps(result, default=str, indent=2)
            )]
        finally:
            await conn.close()
    
    elif name == "list_tables":
        conn = await asyncpg.connect("postgresql://localhost/mydb")
        try:
            rows = await conn.fetch("""
                SELECT tablename FROM pg_tables 
                WHERE schemaname = 'public'
            """)
            tables = [row["tablename"] for row in rows]
            return [TextContent(
                type="text",
                text=json.dumps(tables, indent=2)
            )]
        finally:
            await conn.close()

if __name__ == "__main__":
    import asyncio
    from mcp.server.stdio import stdio_server
    
    async def main():
        async with stdio_server() as (read, write):
            await server.run(read, write, server.create_initialization_options())
    
    asyncio.run(main())
```

### 5.4 mcp.json 配置

```json
{
  "servers": {
    "database": {
      "transport": "stdio",
      "command": "python",
      "args": ["./server.py"],
      "env": {
        "DATABASE_URL": "postgresql://localhost/mydb",
        "PYTHONPATH": "./src"
      }
    }
  }
}
```

### 5.5 SKILL.md 技能定义

```markdown
---
name: query-database
description: "Query and analyze data using natural language to SQL conversion"
version: "1.0.0"
---

# Database Query Skill

## Instructions

When the user asks to query or analyze data:

1. **Understand the request**: Identify what data the user wants
2. **List available tables**: Use the `list_tables` MCP tool to see schema
3. **Generate SQL**: Convert the natural language request to a SELECT query
4. **Validate safety**: Ensure the query is read-only (SELECT only)
5. **Execute**: Use the `execute_query` MCP tool
6. **Format results**: Present results in a readable format (table, chart, summary)

## Safety Rules

- NEVER generate INSERT, UPDATE, DELETE, DROP, or ALTER queries
- Always use LIMIT clause for exploratory queries (default: 100 rows)
- If the query involves JOINs, verify table relationships first
- Warn the user before executing queries that might return large result sets

## Example Interactions

**User**: "Show me the top 10 customers by order count"
**Action**: 
1. Call list_tables to confirm schema
2. Generate: SELECT customer_name, COUNT(*) as order_count 
   FROM orders JOIN customers ON ... 
   GROUP BY customer_name 
   ORDER BY order_count DESC 
   LIMIT 10
3. Execute and present as a formatted table
```

### 5.6 客户端专属配置

```json
// com.cursor/cursor-settings.json
{
  "autoActivate": true,
  "keyboardShortcut": "cmd+shift+d",
  "contextMenu": {
    "enableInEditor": true,
    "enableInTerminal": false
  }
}
```

命名空间目录（`com.cursor/`）让每个客户端存放自己的钩子、命令或代理配置，而其他客户端会直接忽略这些文件。

## 与现有方案对比

| 机制 | 打包内容 | 分发/运行位置 |
|------|---------|-------------|
| Agent Plugins 1.0.0 | Agent Skills + MCP server config | 任意兼容客户端（分发不在范围内） |
| MCP（单独） | 一个 MCP 服务器的连接和工具定义 | 任意支持 MCP 的客户端 |
| Agent Skills（单独） | 一组 SKILL.md 指令文件 | Anthropic 客户端 |
| Claude Code 插件 | Skills + Agents + MCP + Hooks | 仅 Claude Code |
| VS Code 扩展 | 完整 IDE 扩展（命令、视图、语言服务） | 仅 VS Code |

关键区别：Agent Plugins 标准化了**打包和发现**层，而非运行时行为。

## 生态影响分析

### 7.1 对开发者的影响

**之前**：为 5 个客户端构建同一个能力需要维护 5 套目录结构、5 种 manifest 格式、5 个 MCP 配置变体。

**之后**：构建一次，在任何兼容客户端中加载。能力从一个客户端复制到另一个客户端，而非重写。

```python
# 旧方式：为每个客户端维护独立配置
client_configs = {
    "chatgpt": {"skills_dir": ".chatgpt/skills", "manifest": "config.json"},
    "cursor": {"skills_dir": ".cursor/rules", "manifest": ".cursorrules"},
    "copilot": {"skills_dir": ".github/copilot", "manifest": "copilot.json"},
    "vscode": {"skills_dir": ".vscode/agent", "manifest": "package.json"},
    "claude": {"skills_dir": ".claude/skills", "manifest": "CLAUDE.md"},
}

# 新方式：一个目录结构适配所有
plugin_config = {
    "manifest": "plugin.json",      # 2 fields required
    "skills": "skills/",            # standard location
    "mcp": "mcp.json",              # standard location
    "extensions": "com.client/",    # optional per-client
}
```

### 7.2 MCP 生态数据

| 指标 | 数据 | 来源 |
|------|------|------|
| MCP Registry 服务器 | 9,652+ | MCP Registry API (2026-05) |
| 组织生产采用 MCP | 41% | Stacklok 2026 报告 |
| MCP 月下载量 | 9,700 万+ | npm/PyPI 统计 |
| Agent Plugins 核心维护者 | 6 | 官方 TSC |

### 7.3 治理与未来方向

Agent Plugins 治理结构：
- 六大核心维护者组成 Technical Steering Committee
- 贡献流程和技术决策完全公开
- 规范在 GitHub 上开发：`agentplugins/agent-plugins-spec`
- 与 Linux Foundation 的 Agentic AI Foundation 并行

明确不在 1.0 范围内但可能在未来版本中出现的：
- 安装和分发标准
- 权限和审批流程
- 发布者身份和签名验证
- 命令、钩子、子代理的标准化

## 总结

Agent Plugins 1.0.0 的成就在于它**足够小**。五个直接竞争对手就一个文件夹布局达成一致，这本身就是一个信号：行业标准化的时机已经成熟。

规范的成功不在于它定义了什么，而在于它**拒绝定义什么**。所有被排除的部分——分发、权限、市场、信任——都是参与方仍需竞争的领域。标准化的只是"无聊的部分"：文件放在哪里。而正是这个层级，让可移植性得以实现，因为没有人的竞争优势被威胁。

对开发者而言，Agent Plugins 意味着一个新时代：为一个 AI 客户端构建的技能，可以在另一个客户端中直接使用。投资于 Agent 能力的组织不再被锁定在单一供应商的格式中。

唯一的悬而未决的问题是 Anthropic 的缺席。作为 MCP 和 Agent Skills 的创建者，Anthropic 选择不参与这一标准化努力，而是发展自己的并行插件系统。这种分裂是否会收敛，将决定未来几年 AI 代理生态的走向。

## 参考资料

- [Agent Plugins 1.0.0 Specification](https://agent-plugins.org) — 官方规范站点
- [GitHub: agentplugins/agent-plugins-spec](https://github.com/agentplugins/agent-plugins-spec) — 规范源码仓库
- [Vercel Blog: Agent Plugins 1.0 Announcement](https://vercel.com/blog) — Vercel 发布公告
- [Google Developers Blog: Agent Plugins Support](https://developers.google.com/blog) — Google 加入声明
- [GitHub Changelog: Agent Plugins Support](https://github.com/changelog) — GitHub 实现
- [InfoQ: Agent Plugins 1.0 Analysis](https://www.infoq.com/) — 技术分析
- [The Decoder: Open Standard for Agent Extensions](https://the-decoder.com/) — 生态分析
