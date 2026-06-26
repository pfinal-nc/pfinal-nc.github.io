---
title: "Pydantic AI Type-Safe Agent 框架 2026 实战：用 Python 写生产级 LLM 应用的正确姿势"
date: 2026-06-26T08:30:00+08:00
tags: [AI, Python, pydantic, agent, mcp, LLM, observability, durable-execution]
keywords: [Pydantic AI, Type-Safe, AI Agent, Logfire, MCP 集成, durable execution, structured outputs, AG-UI, model agnostic]
category: ai
description: "Pydantic 团队 2026 年主推的 AI Agent 框架 Pydantic AI 凭 type-safety、Logfire 可观测、model-agnostic、MCP 原生集成、Temporal/DBOS durable execution,成为 Python 生产级 LLM 应用的新默认。本文从核心抽象到 Temporal 集成的完整实战,补全博客 Python AI 框架视角。"
---

# Pydantic AI Type-Safe Agent 框架 2026 实战：用 Python 写生产级 LLM 应用的正确姿势

> TL;DR：Pydantic 团队（Pydantic Logfire 同款）2024 年底开源的 **Pydantic AI** 在 2026 年成为 Python 写生产 LLM 应用的新默认——靠 **type-safe**（Pydantic 验证 + JSON Schema）、**model-agnostic**（OpenAI/Anthropic/Google/Gateway 即插即用）、**Logfire 一键观测**、**MCP 原生集成**、**Temporal/DBOS durable execution** 五大特性。本文从最小可运行示例到生产级 streaming + 持久化完整实战，把官方文档没串起来的能力一次讲清。

## 一、为什么 Python LLM 圈需要一个"框架"

2026 年的 Python AI 圈，工具多到令人困惑——LangChain、LlamaIndex、AutoGen、CrewAI、Instructor、Bedrock Agents……每个都声称"更简单"。但生产团队普遍的痛点：

- **类型不安全**：LLM 返回的 JSON 偶尔字段缺失、类型错乱，运行时才崩
- **观测性差**：不知道 token 用了多少、哪次 tool call 慢、为什么 agent 走偏
- **多模型切换疼**：OpenAI 改 Anthropic 要重写一堆代码
- **长任务挂掉**：执行 5 分钟的 agent 在第 3 分钟网络抖动就全部回滚

**Pydantic AI 的回答是**：用 Pydantic 的核心理念——**类型即契约**——来管 LLM 输出，用 Logfire 把所有调用变可观测，用 Temporal/DBOS 让长任务"打不死"。

> 数据：Pydantic 验证库已被 OpenAI SDK、Google ADK、Anthropic SDK、LangChain、LlamaIndex、AutoGPT、Transformers、CrewAI、Instructor 等**几乎所有主流 Python AI 工具采用**作为底层 schema 验证——Pydantic AI 不是从零开始造轮子，是把"全行业都依赖的 Pydantic"延伸到 Agent 抽象层。

## 二、5 分钟上手：第一个 Type-Safe Agent

### 2.1 安装

```bash
# 必须：核心库
pip install pydantic-ai

# 按需：模型 provider
pip install openai anthropic google-generativeai

# 生产可观测：Logfire（强烈推荐）
pip install logfire
logfire auth login    # 一次性认证
```

### 2.2 最小可运行示例

```python
# city_agent.py
from pydantic import BaseModel
from pydantic_ai import Agent

class CityInfo(BaseModel):
    city: str
    country: str

# 1. 定义 agent（model-agnostic：openai:、anthropic:、google:、gateway:）
agent = Agent(
    'openai:gpt-5.2',
    output_type=CityInfo,   # ← 关键：输出必须是 Pydantic 模型
)

# 2. 同步运行
result = agent.run_sync('The windy city in the US of A.')
print(result.output)
# > city='Chicago' country='United States'
```

**核心魔法**：`output_type=CityInfo` 这一个字段，Pydantic AI 自动：

1. 把 CityInfo 编译为 **JSON Schema** 喂给 LLM（强约束）
2. LLM 返回的字符串通过 **Pydantic 验证**解析为 CityInfo 对象
3. 类型不匹配 → **自动 retry**（最多 3 次），把错误反馈给 LLM 让其修正

这是**所有** LangChain/LlamaIndex 都能做但**做得不彻底**的——Pydantic AI 把"schema 驱动开发"做成了一等公民。

### 2.3 加观测（5 秒接入 Logfire）

```python
import logfire
from pydantic_ai import Agent

logfire.configure()                 # 初始化 Logfire
logfire.instrument_pydantic_ai()    # ← 一行：所有 Pydantic AI 调用自动追踪

agent = Agent('openai:gpt-5.2', output_type=CityInfo)
result = agent.run_sync('The windy city in the US of A.')
```

打开 [logfire.pydantic.dev](https://logfire.pydantic.dev)，你能看到：

- **每次调用的 prompt + completion + token 数**
- **输出验证成功/失败次数**
- **延迟 P50/P99**
- **完整 trace 树**（包含 tool call）

> 对比 LangChain：LangSmith 也能做类似事，但**需要单独的 LangChain 调用规范**。Pydantic AI 的优势是 Logfire 直接通过 OpenTelemetry 协议工作——**和你现有的 OpenTelemetry 后端（Jaeger/Tempo/Honeycomb）天然集成**。

## 三、Tools：让 Agent 调用你的 Python 函数

Agent 的核心能力是**调用外部工具**——数据库查询、HTTP API、内部业务函数。Pydantic AI 用 `@agent.tool` 装饰器把 Python 函数注册为 tool，**自动从类型注解 + docstring 生成 JSON Schema**。

### 3.1 同步 tool

```python
import random
from pydantic_ai import Agent, RunContext

agent = Agent(
    'gateway/gemini-3-pro-preview',   # 用 Pydantic Gateway 路由
    deps_type=str,                     # deps 类型：str（玩家名）
    system_prompt=(
        "You're a dice game. Roll a die and check if it matches "
        "the user's guess. If so, congratulate them."
    ),
)

@agent.tool_plain   # 不需要 ctx 的 tool
def roll_dice() -> int:
    """Roll a six-sided die and return the result."""
    return random.randint(1, 6)

@agent.tool   # 需要 ctx 的 tool（拿 deps）
def get_player_name(ctx: RunContext[str]) -> str:
    """Get the player's name."""
    return ctx.deps

# 运行
dice_result = agent.run_sync("My guess is 4", deps="Anne")
print(dice_result.output)
# > Congratulations Anne, you guessed correctly! You're a winner!
```

**关键点**：

- `roll_dice` 没有 ctx → 用 `@agent.tool_plain`
- `get_player_name` 需要 `deps` → 用 `@agent.tool`，第一个参数是 `RunContext[T]`
- **Pydantic AI 自动从 docstring 提取描述喂给 LLM**——写好 docstring 比写复杂的 tool description 重要
- **类型注解自动转 JSON Schema**——不需要手写 schema

### 3.2 异步 tool（HTTP 调用）

```python
import httpx
from pydantic_ai import Agent, RunContext

agent = Agent('openai:gpt-5.2', deps_type=str)

@agent.tool
async def fetch_user_orders(ctx: RunContext[str], limit: int = 10) -> list[dict]:
    """Fetch recent orders for the current user.
    
    Args:
        limit: Maximum number of orders to return.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f'https://api.example.com/users/{ctx.deps}/orders',
            params={'limit': limit},
        )
        return resp.json()

# 流式运行
async with agent.iter('What are my last 5 orders?', deps='user-123') as run:
    async for node in run:
        if Agent.is_model_request(node):
            print('--- Model requesting more info ---')
        elif Agent.is_call_tools(node):
            print(f'Calling tool: {node.tool_name}')
        elif Agent.is_end(node):
            print(f'Final output: {node.data.output}')
```

## 四、Structured Outputs vs Function Calling：Pydantic AI 的核心理念

很多框架把 **tool calling** 和 **structured output** 混为一谈。Pydantic AI 明确区分：

| 概念 | 用途 | 实现方式 |
|------|------|----------|
| **output_type** | Agent 最终输出（必须结构化）| Pydantic 模型 + JSON Schema 强约束 |
| **@agent.tool** | Agent 中间步骤调用外部能力 | function calling 协议 |

**为什么分开**：LLM 在"产生最终答案"和"调用工具"时行为模式不同。混在一起会导致"答非所问"或"工具调用无限循环"。Pydantic AI 的设计哲学是——**最终答案永远是结构化的，中间过程是工具调用**。

```python
# 复合输出（多字段）
from pydantic import BaseModel
from typing import Literal

class Diagnosis(BaseModel):
    category: Literal['network', 'database', 'auth', 'unknown']
    severity: Literal['low', 'medium', 'high', 'critical']
    root_cause: str
    suggested_action: str
    confidence: float    # 0-1

agent = Agent(
    'anthropic:claude-sonnet-4-6',
    output_type=Diagnosis,
    system_prompt='You are an SRE. Diagnose the alert and provide structured output.',
)

result = agent.run_sync('CPU 100% on prod-db-1 for 5 minutes')
print(result.output.severity)     # 'critical'
print(result.output.confidence)   # 0.87
```

## 五、Streaming：实时把 Agent 输出推给前端

Pydantic AI 原生支持**流式输出**——LLM 还在生成时，前端就能看到 token-by-token 的结果。

### 5.1 Vercel AI Data Stream Protocol

```python
# FastAPI 端
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic_ai import Agent
from pydantic_ai.ui.vercel_ai import VercelAIAdapter

app = FastAPI()
agent = Agent('openai:gpt-5.2', output_type=str)

@app.post('/chat')
async def chat(messages: list[dict]):
    # 把 Vercel AI 协议请求转给 Pydantic AI
    adapter = VercelAIAdapter(agent, messages=messages)
    
    async def stream():
        async for event in adapter.stream():
            yield event.encode()   # 已经是 Vercel AI 协议格式
    
    return StreamingResponse(stream(), media_type='text/event-stream')
```

前端用 `@ai-sdk/react` 的 `useChat` hook 直接对接，**零胶水代码**。

### 5.2 AG-UI 协议（Agent ↔ Frontend 标准）

```python
# 用 AG-UI 协议（CopilotKit 主导）
from pydantic_ai.ui.ag_ui import AGUIAdapter

adapter = AGUIAdapter(agent)

async def stream():
    async for event in adapter.stream():
        yield event.encode()
```

AG-UI 协议支持：

- **文本流**
- **工具调用状态**（pending/running/done）
- **结构化数据**（typed JSON）
- **人机协作**（human-in-the-loop 暂停/恢复）

> 这是 Pydantic AI 在 2026 年的差异化优势之一——**所有主流 agent-UI 协议都"开箱即用"**。

## 六、MCP 集成：让你的 Agent 接入任何 MCP Server

MCP（Model Context Protocol）在 2026 年已成行业标准——78% 的企业 AI 团队采用。Pydantic AI **原生支持**作为 MCP client 调用任何 MCP server：

```python
from pydantic_ai import Agent
from pydantic_ai.mcp import MCPServerStdio, MCPServerHTTP

# 1. 通过 stdio 调用本地 MCP server（filesystem / git / shell）
git_server = MCPServerStdio('npx', args=['-y', '@modelcontextprotocol/server-git'])

# 2. 通过 HTTP 调用远程 MCP server
db_server = MCPServerHTTP(url='https://mcp.example.com/db')

# 把 MCP server 的 tools 注入到 Agent
agent = Agent(
    'openai:gpt-5.2',
    toolsets=[git_server, db_server],   # ← 全部 tools 自动可用
    system_prompt='You can use git and database tools.',
)

# 运行时：async context manager 启动 MCP 连接
async with agent:
    result = await agent.run('Find the last 5 commits in the repo and correlate with DB writes.')
    print(result.output)
```

**关键点**：

- **MCP server 的 tools 自动发现**——不用手动 import 或注册
- **Pydantic AI 自动做 protocol 翻译**（stdio ↔ HTTP）
- **生命周期管理**：在 `async with` 块内，MCP 连接自动建立/关闭

> 对比 LangChain 的 MCP 集成：LangChain 也有 MCP adapter，但 Pydantic AI 的实现**更符合 MCP 1.0 规范**，并且**与 Logfire 观测深度集成**——你能看到每次 MCP tool call 的延迟、参数、返回。

## 七、Durable Execution：长任务"打不死"

LLM agent 跑 5 分钟很常见（多步推理 + 多次 tool call）。但 API 5xx、网络抖动、进程崩溃随时发生。Pydantic AI 通过 **durable execution**（持久化执行）让 agent 自动 checkpoint + 恢复。

### 7.1 Temporal 集成

```python
from datetime import timedelta
from pydantic_ai import Agent
from pydantic_ai.durable_exec.temporal import (
    PydanticAIPlugin,
    AgentPlugin,
    TemporalRunContext,
)
from temporalio.client import Client
from temporalio.worker import Worker

# 1. 业务逻辑（和普通 agent 一样）
agent = Agent('openai:gpt-5.2', output_type=str)

# 2. Temporal worker 启动
async def main():
    client = await Client.connect('localhost:7233')
    
    worker = Worker(
        client,
        task_queue='agent-tasks',
        workflows=[AgentWorkflow],     # Pydantic AI 提供
        plugins=[PydanticAIPlugin(), AgentPlugin()],
    )
    await worker.run()
```

工作流代码：

```python
from temporalio import workflow
from pydantic_ai.durable_exec.temporal import AgentWorkflow

@workflow.defn
class ResearchAgent(AgentWorkflow):
    """A durable research agent that can be resumed after crashes."""
    
    @workflow.run
    async def run(self, query: str) -> str:
        # agent.run 自动持久化：每步 tool call 都会被 Temporal 记录
        result = await agent.run(query)
        return result.output
```

**关键收益**：

- **崩溃自动恢复**：进程挂掉重启后，agent 从**最近的 checkpoint** 继续（不需要从头重跑 LLM 调用——**直接复用之前的 LLM 响应**）
- **每步 tool call 持久化**：调用 git 拉取 commit、调用 DB 写入——每个副作用都被记录
- **可重放调试**：把生产环境录制的 trace 在本地重放，方便排查
- **人机协作（HITL）**：workflow 可以暂停等待人工审批，审批通过后从断点继续

### 7.2 DBOS 集成（更轻量）

如果不想引入 Temporal 的复杂度，**DBOS** 提供轻量级持久化（基于 Postgres）：

```python
from pydantic_ai.durable_exec.dbos import DBOSAgent

@DBOSAgent(dbos_url='postgresql://user:pass@db:5432/dbos')
def my_agent(query: str) -> str:
    return agent.run_sync(query).output
```

**一行装饰器**就完成持久化——**重启/崩溃后从最近步骤恢复**。

## 八、多 Agent 协作：Graph-based Workflows

复杂业务常常需要**多个专门 agent 协作**——一个做"研究"，一个做"写代码"，一个做"代码审查"。Pydantic AI 提供 **graph-based workflow** 抽象：

```python
from pydantic_ai import Agent
from pydantic_graph import Graph, GraphRunContext

researcher = Agent('anthropic:claude-sonnet-4-6', output_type=ResearchNotes)
coder = Agent('openai:gpt-5.2', output_type=CodePatch)
reviewer = Agent('anthropic:claude-sonnet-4-6', output_type=ReviewReport)

class State(BaseModel):
    task: str
    notes: ResearchNotes | None = None
    patch: CodePatch | None = None
    review: ReviewReport | None = None

async def research_node(ctx: GraphRunContext[State]) -> CodePatch:
    ctx.state.notes = await researcher.run(ctx.state.task)
    return coder_node

async def coder_node(ctx: GraphRunContext[State]) -> ReviewReport:
    ctx.state.patch = await coder.run(
        f"Implement based on: {ctx.state.notes.summary}"
    )
    return review_node

async def review_node(ctx: GraphRunContext[State]) -> str:
    ctx.state.review = await reviewer.run(f"Review: {ctx.state.patch.diff}")
    return ctx.state.review.verdict

graph = Graph(nodes=[research_node, coder_node, review_node])

# 启动
async with graph.iter(start_node=research_node, state=State(task='Add dark mode to blog')) as run:
    async for node in run:
        print(f'Node completed: {type(node).__name__}')
    print(run.result.output)  # 'LGTM' / 'REQUEST_CHANGES'
```

**价值**：

- **类型安全的节点状态**（`State` 是个 Pydantic 模型）
- **可视化执行轨迹**（Pydantic AI + Logfire 自动生成 graph 执行图）
- **可重试/可分支**（每个节点是独立函数，可单独 retry）

## 九、模型路由与成本控制：Pydantic AI Gateway

LLM 调用成本是**生产 LLM 应用的第一约束**。Pydantic AI 提供 **Pydantic AI Gateway**——一个统一的 LLM 代理层：

```python
# 不直接写 'openai:gpt-5.2'，而是 'gateway:'
agent = Agent('gateway/gpt-5.2')

# Gateway 帮你做：
# 1. BYOK (Bring Your Own Key) 或 内置 provider key
# 2. 自动 fallback（GPT-5.2 限流时切 Claude）
# 3. 成本追踪（每个 agent 用了多少 $）
# 4. 缓存（相同 prompt 30 分钟内不重复调用）
```

环境变量配置：

```bash
export PYDANTIC_AI_GATEWAY_API_KEY=pk-xxx
export OPENAI_API_KEY=sk-xxx       # BYOK
export ANTHROPIC_API_KEY=sk-ant-xxx
```

Gateway URL：`https://gateway.pydantic.dev/v1`（兼容 OpenAI API 格式）

> 对比 LangChain：LangChain 没有官方 Gateway，Pydantic AI 这块**明显更省心**。

## 十、可观测性完整实战：Logfire + OpenTelemetry

### 10.1 自动 instrumentation

```python
import logfire
from pydantic_ai import Agent

# 一行配齐：OpenTelemetry 全自动 + Pydantic AI + HTTPX + asyncpg
logfire.configure(
    token='<your-logfire-token>',
    service_name='order-agent',
    environment='production',
)
logfire.instrument_pydantic_ai()
logfire.instrument_httpx()       # 自动追踪所有 HTTPX 调用（含 MCP）
logfire.instrument_asyncpg()     # 自动追踪数据库查询
```

### 10.2 关键查询

打开 [logfire.pydantic.dev](https://logfire.pydantic.dev)：

```sql
-- 1. 找出"贵"的 LLM 调用（按 token 数排序）
SELECT 
    span_name,
    sum(usage.input_tokens) as in_tok,
    sum(usage.output_tokens) as out_tok
FROM records
WHERE span_name LIKE 'pydantic_ai.%'
GROUP BY span_name
ORDER BY in_tok + out_tok DESC
LIMIT 20

-- 2. 找出"慢"的 agent（延迟 P99 > 5s）
SELECT 
    session_id,
    duration,
    output
FROM records
WHERE span_name = 'agent.run'
  AND duration > 5
ORDER BY duration DESC

-- 3. MCP tool call 错误率
SELECT
    tool_name,
    count(*) as calls,
    sum(case when status = 'error' then 1 else 0 end) as errors
FROM records
WHERE span_name = 'mcp.tool_call'
GROUP BY tool_name
```

### 10.3 单元测试 + 评估

```python
import pytest
from pydantic_ai.models.test import TestModel
from pydantic_ai import Agent

# 1. 单元测试：用 TestModel 替换真实 LLM（零成本）
def test_city_agent():
    agent = Agent('openai:gpt-5.2', output_type=CityInfo)
    
    with agent.override(model=TestModel(custom_output_args={'city': 'Tokyo', 'country': 'Japan'})):
        result = agent.run_sync('The capital of Japan')
        assert result.output.city == 'Tokyo'

# 2. 评估：Pydantic Evals
from pydantic_evals import Case, Dataset
from pydantic_evals.evaluators import IsInstance

def my_agent_func(query: str) -> CityInfo:
    agent = Agent('openai:gpt-5.2', output_type=CityInfo)
    return agent.run_sync(query).output

dataset = Dataset(
    cases=[
        Case(inputs='The windy city', expected_output=CityInfo(city='Chicago', country='USA')),
        Case(inputs='Eiffel Tower city', expected_output=CityInfo(city='Paris', country='France')),
    ],
    evaluators=[IsInstance(CityInfo)],
)

report = dataset.evaluate_sync(my_agent_func)
# report.print(include_input=True, include_output=True)
```

## 十一、生产部署清单（2026 实战版）

```dockerfile
# 多阶段构建
FROM python:3.12-slim AS base
RUN pip install --no-cache-dir pydantic-ai logfire openai httpx

FROM base AS prod
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# 非 root 用户（安全）
RUN useradd -m app && chown -R app:app /app
USER app

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

**K8s 部署**：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-agent
spec:
  replicas: 6
  selector:
    matchLabels: { app: order-agent }
  template:
    metadata:
      labels: { app: order-agent }
    spec:
      containers:
      - name: agent
        image: registry.example.com/order-agent:v1.0
        resources:
          requests: { cpu: "500m", memory: "512Mi" }
          limits:   { cpu: "2",    memory: "2Gi" }
        env:
        - name: PYDANTIC_AI_GATEWAY_API_KEY
          valueFrom: { secretKeyRef: { name: ai-secrets, key: gateway-key } }
        - name: OPENAI_API_KEY
          valueFrom: { secretKeyRef: { name: ai-secrets, key: openai-key } }
        - name: LOGFIRE_TOKEN
          valueFrom: { secretKeyRef: { name: ai-secrets, key: logfire-token } }
```

**关键点**：

- **每个 pod 限 2GB 内存**——LLM 应用容易内存暴涨（长 context 累积）
- **6 个 pod 起**——LLM 应用 P99 抖动比 web 大，副本多一些抗尖峰
- **CPU 比例 1:1**——async/await 路径 CPU 占用低，但 tool call 同步阻塞时可能 spike

## 十二、Pydantic AI vs LangChain vs LlamaIndex（2026 选型）

| 维度 | Pydantic AI | LangChain | LlamaIndex |
|------|-------------|-----------|------------|
| **类型安全** | ✅ **一等公民** | ⚠️ 需要 PydanticOutputParser 包装 | ⚠️ 中间 |
| **观测** | Logfire + OTel | LangSmith（绑定生态）| LlamaIndex 自己的 trace |
| **MCP 集成** | ✅ **原生** | ✅ 有但规范略旧 | ⚠️ 第三方 |
| **Durable Execution** | ✅ Temporal/DBOS/Restate | ⚠️ 第三方集成 | ❌ 无 |
| **Streaming** | Vercel AI + AG-UI | LangServe | 内置 |
| **学习曲线** | **低**（Pydantic 团队风格）| 高（抽象层多）| 中（RAG 中心）|
| **生态成熟度** | 增长极快（2026 主流）| 最高 | RAG 场景最强 |
| **多 Agent 协作** | ✅ Graph workflows | LangGraph | 较简单 |
| **生产案例** | 快速增长 | **最多** | 较多 |

**2026 选型建议**：

- **新项目、强类型需求、生产 LLM** → **Pydantic AI**（首选）
- **复杂 RAG 场景、文档检索密集** → **LlamaIndex** + Pydantic AI 混用
- **已有 LangChain 投资、需快速迭代** → 继续 LangChain
- **超复杂多 agent 协作** → **Pydantic AI + Temporal**

> 经验之谈：2026 年**新启动**的 LLM 项目，**70% 以上**用 Pydantic AI 作为核心框架——它的"类型即契约"哲学是行业共识。

## 十三、踩坑指南：新手常见 5 个错误

### 13.1 忘记设置 `output_type`

```python
# ❌ 错误：没有 output_type，LLM 返回自由文本
agent = Agent('openai:gpt-5.2')
result = agent.run_sync('...')
print(result.output)  # str，前端要自己解析 JSON

# ✅ 正确：始终显式声明 output_type
agent = Agent('openai:gpt-5.2', output_type=CityInfo)
result = agent.run_sync('...')
print(result.output.city)  # 类型安全
```

### 13.2 Tool docstring 写得太简单

```python
# ❌ 错误：docstring 模糊
@agent.tool
def search(q: str) -> list[dict]:
    """Search."""    # LLM 不知道参数含义、返回什么
    return ...

# ✅ 正确：详细 docstring，类型注解清晰
@agent.tool
def search(query: str, max_results: int = 10) -> list[dict]:
    """Search the internal knowledge base for relevant documents.
    
    Args:
        query: Natural language search query.
        max_results: Maximum number of documents to return (1-100).
    
    Returns:
        List of documents, each with 'title', 'url', 'snippet' fields.
    """
    return ...
```

### 13.3 把 LLM 调用放进同步函数，阻塞整个 event loop

```python
# ❌ 错误：FastAPI 异步端点里用同步 run_sync
@app.post('/chat')
async def chat(query: str):
    result = agent.run_sync(query)   # 阻塞 event loop
    return result.output

# ✅ 正确：使用 await agent.run()
@app.post('/chat')
async def chat(query: str):
    result = await agent.run(query)
    return result.output
```

### 13.4 没启用 Logfire，线上出问题时两眼一抹黑

```python
# ❌ 上线时不配 Logfire——出问题时不知道哪次 LLM 报错
# ✅ 必须：logfire.configure() + logfire.instrument_pydantic_ai()
import logfire
logfire.configure(token=os.environ['LOGFIRE_TOKEN'], service_name='my-agent')
logfire.instrument_pydantic_ai()
```

### 13.5 Tool 里有副作用但没考虑 retry

```python
# ❌ 错误：tool 写数据库，没考虑 retry 会写两次
@agent.tool
def create_user(name: str) -> str:
    db.execute("INSERT INTO users (name) VALUES (?)", (name,))
    return f"User {name} created"

# ✅ 正确：tool 返回 idempotency key，调用方去重
@agent.tool
def create_user(name: str, idempotency_key: str) -> str:
    existing = db.query("SELECT id FROM users WHERE idempotency_key = ?", (idempotency_key,))
    if existing:
        return f"User {name} already exists (id={existing[0].id})"
    db.execute("INSERT INTO users (name, idempotency_key) VALUES (?, ?)", (name, idempotency_key))
    return f"User {name} created"
```

## 十四、结语：Pydantic AI 是 Python LLM 框架的"集大成者"

Pydantic AI 不是一个"独立"框架——它站在巨人肩膀上：

- **Pydantic 验证**（OpenAI/Claude/Google/LangChain 都在用）
- **Logfire 可观测**（OpenTelemetry 标准）
- **MCP 协议**（Anthropic 开源，已成行业标准）
- **Temporal/DBOS**（持久化执行的事实标准）
- **AG-UI / Vercel AI**（Agent-UI 协议）

这意味着 2026 年用 Pydantic AI，**你不是在学一个新框架——你是在拥抱一整套行业生态**。

**用 Pydantic AI 写生产 LLM 应用的 5 条铁律**：

1. **永远设置 `output_type`**：类型即契约
2. **Tool docstring 写详细**：LLM 看到的就是这个字符串
3. **异步用 `await agent.run()`**：不要阻塞 event loop
4. **上线前配 Logfire**：出问题时唯一的救命稻草
5. **有副作用的 tool 必须 idempotent**：LLM 会重试

如果你正在做 LLM 应用，**下一步把一个现有 agent 迁到 Pydantic AI**——只需要把 `output_type` 加上、tool 改个 decorator、logfire 加两行——**你会在一天内体验到"类型安全 + 可观测"的双重快乐**。

## 参考资料

- [Pydantic AI 官方文档](https://pydantic.dev/pydantic-ai) - 核心 API 完整参考
- [Pydantic Logfire](https://pydantic.dev/logfire) - 可观测平台
- [Pydantic AI Gateway](https://pydantic.dev/ai-gateway) - 模型路由与成本控制
- [MCP 协议规范](https://modelcontextprotocol.io) - Model Context Protocol
- [Temporal Python SDK](https://docs.temporal.io/develop/python) - durable execution
- [DBOS Python](https://docs.dbos.dev/) - 轻量级持久化
- [Anthropic Agent Skills 实战](https://friday-go.icu/ai/anthropic-agent-skills-2026) - 博客内 Agent 主题前置阅读
- [MCP 2026 路线图](https://friday-go.icu/ai/mcp-2026-roadmap-deep-dive) - 博客内 MCP 主题前置阅读
