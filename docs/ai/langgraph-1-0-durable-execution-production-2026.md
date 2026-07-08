---
title: "LangGraph 1.0 Durable Execution 实战：持久化 Agent 工作流引擎的生产级架构与 Human-in-the-Loop 模式"
date: 2026-07-08T09:00:00+08:00
tags: [Python, AI, Agent, LangGraph, LangChain, durable-execution, human-in-the-loop]
keywords: [LangGraph 1.0, Durable Execution, Checkpoint, PostgresSaver, Human-in-the-Loop, Pregel, StateGraph, Agent 持久化]
category: ai
description: "LangGraph 1.0（2025-10-22 GA）作为首个生产级持久化 Agent 框架，被 Uber、LinkedIn、Klarna、J.P. Morgan 等企业采用。本文从 Durable State 三种持久化模式（sync/async/exit）、Checkpointer 机制（PostgresSaver/RedisSaver/DynamoDBSaver）、Human-in-the-Loop 中断恢复、Pregel 图执行模型四个维度，配合生产级可运行代码，系统拆解 2026 年 Agent 框架的工程化标准。"
---

# LangGraph 1.0 Durable Execution 实战：持久化 Agent 工作流引擎的生产级架构与 Human-in-the-Loop 模式

2025 年 10 月 22 日，**LangGraph 1.0** 正式发布 GA（Generally Available），成为**首个面向生产环境的持久化 Agent 框架**。这一里程碑式发布的背后，是 AI Agent 从"实验性玩具"迈向"企业级基础设施"的关键拐点。截至 2026 年 7 月，LangGraph 的 GitHub Stars 已突破 **12 万**，月下载量超过 **1500 万次**，被 Uber、LinkedIn、Klarna、J.P. Morgan 等数十家世界 500 强企业用于生产环境。

如果你还在为以下问题头疼——**Agent 跑一半服务器崩溃了怎么办？长任务（跨小时/跨天）如何持久化？人工审批如何嵌入自动化流程？多 Agent 系统的状态如何协同？**——LangGraph 1.0 的 Durable Execution 机制给出了工业级答案。

本文将从 **Durable State 三种持久化模式**、**Checkpointer 后端选型**、**Human-in-the-Loop 中断恢复**、**Pregel 图执行模型** 四个维度，配合可运行代码，系统拆解 LangGraph 1.0 的工程化架构。

## 一、为什么需要 Durable Execution？

### 1.1 传统 Agent 的三大痛点

```text
传统 Agent 执行模型（无持久化）:
┌─────────┐     ┌─────────┐     ┌─────────┐
│  Step 1 │────►│  Step 2 │────►│  Step 3 │───► 服务器崩溃 / OOM
│ (内存中) │     │ (内存中) │     │ (内存中) │     状态全部丢失
└─────────┘     └─────────┘     └─────────┘
▲
│
无法恢复，只能从头开始
```

**痛点 1：崩溃即数据丢失**

LLM 调用一次成本 $0.01-$1，处理长任务（几十步）总成本可能高达 $50。崩溃后从头运行意味着**双倍 Token 消耗**和数十分钟的等待。

**痛点 2：跨会话无法恢复**

用户在 Web 端发起请求，5 分钟后在手机端继续，Agent 早已丢失上下文。

**痛点 3：人工审批难嵌入**

金融、医疗场景需要人类专家审批敏感操作，传统 Agent 只能"全跑完或全放弃"，无法在中间暂停。

### 1.2 LangGraph Durable Execution 模型

```text
LangGraph 1.0 Durable 执行模型:
┌─────────┐     ┌─────────┐     ┌─────────┐
│  Step 1 │────►│  Step 2 │────►│  Step 3 │───► 服务器崩溃
│    +    │     │    +    │     │    +    │
│Checkpoint│     │Checkpoint│     │Checkpoint│     从 Checkpoint 3
└────┬────┘     └────┬────┘     └────┬────┘     精确恢复
     │               │               │
     ▼               ▼               ▼
[Postgres]       [Postgres]      [Postgres]
(持久化)         (持久化)         (持久化)
```

**核心承诺**：
- 任意节点崩溃后可从最近 Checkpoint 精确恢复
- 跨小时/跨天/跨会话的状态连续性
- 人工审批可插入任意节点

## 二、核心概念 1：StateGraph 状态图

### 2.1 第一个 Durable Agent

```bash
# 安装 LangGraph 1.0+
pip install "langgraph>=1.0.0" "langgraph-checkpoint-postgres>=2.0" psycopg2-binary
```

```python
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.checkpoint.memory import InMemorySaver
from typing import Annotated
import operator

# 1. 定义状态（支持持久化）
class AgentState(MessagesState):
    """继承 MessagesState 自动获得 messages 字段"""
    step_count: Annotated[int, operator.add]  # reducer 自动累加

# 2. 定义节点（Node）函数
def process_node(state: AgentState):
    print(f"Processing step {state.get('step_count', 0)}")
    return {
        "messages": [{"role": "ai", "content": f"Step {state.get('step_count', 0)} processed"}],
        "step_count": 1,  # 累加
    }

def end_node(state: AgentState):
    return {
        "messages": [{"role": "ai", "content": "Workflow finished!"}]
    }

# 3. 构建 StateGraph
builder = StateGraph(AgentState)
builder.add_node("process", process_node)
builder.add_node("end", end_node)

builder.add_edge(START, "process")
builder.add_edge("process", "end")
builder.add_edge("end", END)

# 4. 配置持久化（开发环境用内存，生产用 Postgres）
checkpointer = InMemorySaver()
graph = builder.compile(checkpointer=checkpointer)

# 5. 执行（必须传 thread_id 作为会话标识）
config = {"configurable": {"thread_id": "hello-world-001"}}
result = graph.invoke(
    {"messages": [{"role": "user", "content": "Start"}], "step_count": 0},
    config=config
)
print(result["messages"][-1].content)  # "Workflow finished!"

# 6. 模拟崩溃恢复：使用相同 thread_id
result2 = graph.invoke(
    None,  # None 表示从最新 Checkpoint 恢复
    config=config
)
print(result2["messages"][-1].content)
```

**关键 API 说明**：

| API | 作用 |
|-----|------|
| `StateGraph(StateClass)` | 创建状态图 |
| `add_node(name, fn)` | 注册节点 |
| `add_edge(from, to)` | 简单边 |
| `add_conditional_edges(from, router, path_map)` | 条件分支 |
| `compile(checkpointer=...)` | 编译并附加 Checkpointer |
| `invoke(input, config)` | 同步执行 |
| `stream(input, config)` | 流式执行 |
| `get_state(config)` | 获取当前 Checkpoint |

### 2.2 三种持久化模式（Durability Modes）

LangGraph 1.0 引入了**三级持久化粒度**，开发者可以根据业务需求在性能与一致性之间权衡：

| 模式 | 同步策略 | 适用场景 | 性能开销 |
|------|----------|----------|----------|
| **`sync`** | 每步同步写入 Checkpoint | 金融交易、合规审批 | 高（强一致性） |
| **`async`** | 异步后台批量写入 | 常规对话、非关键任务 | 中（最终一致性） |
| **`exit`** | 退出时一次性写入 | 开发调试、可重试任务 | 低（性能优先） |

**配置示例**：

```python
from langgraph.graph import StateGraph
from langgraph.checkpoint.postgres import PostgresSaver

# 同步模式（默认）：每步 fsync
checkpointer = PostgresSaver.from_conn_string(
    "postgresql://user:pass@host:5432/langgraph",
    sync_frequency="sync"  # 强一致
)

# 异步模式：批量 flush
checkpointer_async = PostgresSaver.from_conn_string(
    "postgresql://user:pass@host:5432/langgraph",
    sync_frequency="async"
)

graph = builder.compile(
    checkpointer=checkpointer,
    durability="sync"  # Node 级别配置
)
```

## 三、核心概念 2：Checkpointer 后端选型

### 3.1 三大 Checkpointer 后端对比

LangGraph 1.0 提供了 4 种官方 Checkpointer 实现：

| 后端 | 适用规模 | 延迟 | 持久性 | 成本 |
|------|----------|------|--------|------|
| **InMemorySaver** | 开发/测试 | < 1ms | 进程退出即丢失 | 0 |
| **PostgresSaver** | 中大型生产 | 5-20ms | 强（A 级） | $ |
| **RedisSaver** | 高吞吐生产 | 1-5ms | 中（依赖持久化配置） | $$ |
| **DynamoDBSaver** | AWS 无服务器 | 10-30ms | 强（11 个 9） | $$$ |

### 3.2 PostgresSaver 实战

```python
from langgraph.checkpoint.postgres import PostgresSaver
from psycopg_pool import ConnectionPool
import os

# 1. 初始化连接池
pool = ConnectionPool(
    conninfo=os.getenv("DATABASE_URL", "postgresql://langgraph:pass@db:5432/langgraph"),
    min_size=5,
    max_size=20,
    timeout=30,
)

# 2. 创建 PostgresSaver
checkpointer = PostgresSaver(pool)

# 3. 首次运行：自动建表
checkpointer.setup()

# 4. 编译图
graph = builder.compile(checkpointer=checkpointer)
```

**PostgresSaver 内部表结构**：

```sql
-- LangGraph 自动创建的表
CREATE TABLE checkpoints (
    thread_id TEXT,
    checkpoint_id TEXT,
    parent_checkpoint_id TEXT,
    type TEXT,
    checkpoint JSONB,
    metadata JSONB,
    PRIMARY KEY (thread_id, checkpoint_id)
);

CREATE TABLE checkpoint_blobs (
    thread_id TEXT,
    checkpoint_id TEXT,
    blob_path TEXT,
    blob BYTEA,
    PRIMARY KEY (thread_id, checkpoint_id, blob_path)
);

CREATE TABLE checkpoint_writes (
    thread_id TEXT,
    checkpoint_id TEXT,
    task_id TEXT,
    idx INTEGER,
    channel TEXT,
    value JSONB,
    PRIMARY KEY (thread_id, checkpoint_id, task_id, idx)
);
```

### 3.3 RedisSaver 实战（高吞吐场景）

```python
from langgraph.checkpoint.redis import RedisSaver
import redis

# 1. 创建 Redis 客户端
redis_client = redis.Redis(
    host="redis-cluster",
    port=6379,
    password=os.getenv("REDIS_PASSWORD"),
    ssl=True,
    decode_responses=False,  # 必须 False，二进制数据
)

# 2. 创建 RedisSaver
checkpointer = RedisSaver(redis_client)

# 3. 启用 AOF 持久化（避免 Redis 崩溃丢数据）
# redis.conf 配置：appendonly yes, appendfsync everysec

graph = builder.compile(checkpointer=checkpointer)
```

### 3.4 DynamoDBSaver 实战（AWS 无服务器）

```python
from langgraph.checkpoint.dynamodb import DynamoDBSaver
import boto3

# 1. 创建 DynamoDB 资源
dynamodb = boto3.resource("dynamodb", region_name="us-east-1")

# 2. 创建表（首次）
table = dynamodb.create_table(
    TableName="langgraph-checkpoints",
    KeySchema=[
        {"AttributeName": "thread_id", "KeyType": "HASH"},
        {"AttributeName": "checkpoint_id", "KeyType": "RANGE"},
    ],
    AttributeDefinitions=[
        {"AttributeName": "thread_id", "AttributeType": "S"},
        {"AttributeName": "checkpoint_id", "AttributeType": "S"},
    ],
    BillingMode="PAY_PER_REQUEST",  # 按需计费
)
table.wait_until_exists()

# 3. 编译
checkpointer = DynamoDBSaver(table)
graph = builder.compile(checkpointer=checkpointer)
```

## 四、核心概念 3：Pregel 图执行模型

LangGraph 的运行时基于 **Google Pregel 图计算模型**，采用**超步（Super-step）** 并行执行。

### 4.1 Pregel Super-step 执行循环

```text
Pregel Super-step 执行循环:
┌─────────────────────────────────────────────────────────────┐
│                    Super-step N                             │
├─────────────────────────────────────────────────────────────┤
│  Phase 1: Plan（规划）                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 确定本步骤可执行的 Nodes（基于通道状态与依赖关系）        │   │
│  └─────────────────────────────────────────────────────┘   │
│                         │                                   │
│                         ▼                                   │
│  Phase 2: Execution（执行）                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Node 1     │  │   Node 2     │  │   Node 3     │      │
│  │ (并行执行)    │  │ (并行执行)    │  │ (并行执行)    │      │
│  │              │  │              │  │              │      │
│  │ 读取输入通道  │  │ 读取输入通道  │  │ 读取输入通道  │      │
│  │ 执行计算     │  │ 执行计算     │  │ 执行计算     │      │
│  │ 写入输出通道  │  │ 写入输出通道  │  │ 写入输出通道  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         └─────────────────┼─────────────────┘              │
│                           ▼                                │
│  Phase 3: Update（更新）                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 聚合所有 Nodes 的输出，更新 Channels（状态）           │   │
│  │ Checkpoint 持久化（如配置）                            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
│
▼
判断还有可执行 Nodes？
│
├── 是 ──► 进入 Super-step N+1
└── 否 ──► 执行结束
```

### 4.2 Channels：节点间的状态传递

LangGraph 的状态通过 **Channels** 在节点间传递，支持多种内置 Channel：

```python
from langgraph.graph import StateGraph
from langgraph.channels import LastValue, Topic, BinaryOperatorAggregate

class ResearchState(TypedDict):
    # LastValue：仅保留最新值
    current_query: LastValue[str]
    # Topic：广播（一个输入触发多个订阅者）
    search_results: Topic[dict]
    # BinaryOperatorAggregate：聚合（如加法）
    total_cost: BinaryOperatorAggregate[float, float]
    # Annotated Reducer：自定义聚合逻辑
    messages: Annotated[list, operator.add]
```

**自定义 Reducer 实战**：

```python
def deduplicate_messages(left: list, right: list) -> list:
    """去重合并：基于 message id 去重"""
    seen = {m["id"] for m in left}
    return left + [m for m in right if m["id"] not in seen]

class State(TypedDict):
    messages: Annotated[list, deduplicate_messages]
```

### 4.3 条件分支与路由

```python
from langgraph.graph import StateGraph, START, END
from typing import Literal

def should_continue(state: AgentState) -> Literal["tool_node", "end_node"]:
    """Router 函数：决定下一步执行哪个节点"""
    last_msg = state["messages"][-1]
    if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
        return "tool_node"
    return "end_node"

builder = StateGraph(AgentState)
builder.add_node("agent", call_llm)
builder.add_node("tool_node", execute_tools)
builder.add_node("end_node", lambda s: {"messages": []})

builder.add_edge(START, "agent")
builder.add_conditional_edges(
    "agent",
    should_continue,
    {
        "tool_node": "tool_node",
        "end_node": "end_node"
    }
)
builder.add_edge("tool_node", "agent")  # 工具执行后回到 Agent
builder.add_edge("end_node", END)
```

## 五、核心概念 4：Human-in-the-Loop 模式

Human-in-the-Loop（HITL）是 LangGraph 1.0 的另一大核心能力——在 Agent 执行任意节点暂停，等待人工审批、修改状态或继续执行。

### 5.1 三种 HITL 实现方式

**方式 1：`interrupt_before` 在节点前中断**

```python
from langgraph.types import Command

# 配置在特定节点前中断
graph = builder.compile(
    checkpointer=checkpointer,
    interrupt_before=["human_review"]  # 在 human_review 节点前暂停
)

# 执行到中断点
config = {"configurable": {"thread_id": "hitl-001"}}
result = graph.invoke(
    {"messages": [{"role": "user", "content": "Transfer $10000"}]},
    config=config
)
# 此时执行暂停，等待人工决策

# 检查是否中断
state = graph.get_state(config)
if state.next == ("human_review",):
    print("Waiting for human review...")

# 人工决策后继续
graph.invoke(Command(resume="approve"), config=config)
```

**方式 2：节点内 `interrupt()` 动态中断**

```python
from langgraph.types import interrupt, Command

def human_review_node(state: AgentState):
    """高金额交易需要人工审批"""
    amount = state["amount"]

    if amount > 5000:
        # 触发中断，返回给调用方
        decision = interrupt({
            "type": "high_value_transaction",
            "amount": amount,
            "recipient": state["recipient"],
            "options": ["approve", "reject", "modify_amount"]
        })

        if decision == "approve":
            return {"status": "approved", "approved_by": "human"}
        elif decision == "reject":
            return {"status": "rejected"}
        elif decision == "modify_amount":
            new_amount = interrupt({
                "type": "enter_new_amount",
                "current": amount
            })
            return {"amount": new_amount, "status": "approved", "modified": True}

    return {"status": "auto_approved"}
```

**方式 3：动态中断 + 状态修改**

```python
# 人工可以在恢复时修改 State
def modify_state_node(state: AgentState):
    # 列出所有异常情况
    anomalies = detect_anomalies(state["transactions"])
    if anomalies:
        # 中断，让人工修改
        human_input = interrupt({
            "anomalies": anomalies,
            "instruction": "修正异常项或确认"
        })
        return {
            "transactions": human_input.get("transactions", state["transactions"]),
            "human_reviewed": True
        }
    return state
```

### 5.2 HITL 完整实战：转账审批系统

```python
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.types import interrupt, Command
from typing import TypedDict, Annotated
import operator

class TransferState(TypedDict):
    messages: Annotated[list, operator.add]
    amount: float
    recipient: str
    risk_score: float
    status: str

def analyze_risk_node(state: TransferState):
    """步骤 1：分析转账风险"""
    risk = 0.0
    if state["amount"] > 10000:
        risk += 0.5
    if "海外" in state["recipient"]:
        risk += 0.3
    return {"risk_score": risk, "messages": [{"role": "system", "content": f"风险评分: {risk}"}]}

def human_review_node(state: TransferState):
    """步骤 2：高风险转账需要人工审批"""
    if state["risk_score"] > 0.5:
        decision = interrupt({
            "type": "high_risk_transfer",
            "amount": state["amount"],
            "recipient": state["recipient"],
            "risk_score": state["risk_score"],
            "options": ["approve", "reject"]
        })
        if decision == "approve":
            return {"status": "human_approved"}
        else:
            return {"status": "rejected"}
    return {"status": "auto_approved"}

def execute_transfer_node(state: TransferState):
    """步骤 3：执行转账"""
    if state["status"] in ["human_approved", "auto_approved"]:
        # 真实业务：调用支付网关
        return {
            "messages": [{"role": "system", "content": f"已向 {state['recipient']} 转账 ${state['amount']}"}]
        }
    return {"messages": [{"role": "system", "content": "转账被拒绝"}]}

# 构建图
builder = StateGraph(TransferState)
builder.add_node("analyze", analyze_risk_node)
builder.add_node("review", human_review_node)
builder.add_node("execute", execute_transfer_node)

builder.add_edge(START, "analyze")
builder.add_edge("analyze", "review")
builder.add_edge("review", "execute")
builder.add_edge("execute", END)

# 配置持久化
checkpointer = PostgresSaver.from_conn_string("postgresql://...")
graph = builder.compile(checkpointer=checkpointer)

# 使用流程
config = {"configurable": {"thread_id": "transfer-001"}}

# 步骤 A：发起转账请求（可能中断在 review 节点）
result = graph.invoke(
    {"amount": 15000, "recipient": "海外供应商ABC", "messages": [], "risk_score": 0.0, "status": ""},
    config=config
)

# 步骤 B：检查是否中断
state = graph.get_state(config)
if state.next and "review" in state.next:
    print("Waiting for human approval...")

    # 步骤 C：人工审批后继续
    result = graph.invoke(Command(resume="approve"), config=config)
    print(result["messages"][-1]["content"])
    # "已向 海外供应商ABC 转账 $15000"
```

## 六、LangGraph 1.0 vs 竞品对比

| 特性 | LangGraph 1.0 | Temporal | AWS Step Functions | Restate |
|------|---------------|----------|--------------------|---------|
| **核心定位** | Agent 编排 | 通用工作流 | 云工作流 | 持久化服务 |
| **AI 原生** | ✅ | ❌ | ❌ | ❌ |
| **Checkpoint 模型** | 内置 | Workflow 状态机 | State Language | Journal |
| **HITL 原生** | ✅ | 通过 Signal 实现 | 需配合 Lambda | 通过 Awaitable |
| **多 Agent** | ✅（Subgraph） | ❌ | ❌ | ❌ |
| **持久化后端** | PG/Redis/DDB | 自带 Cassandra | 自带 DDB | 自带 RoDB |
| **生态** | LangChain 全家桶 | 独立 | AWS 锁定 | 独立 |
| **学习曲线** | 中 | 陡 | 中 | 中 |

**经验法则**：
- **AI Agent 项目** → 首选 LangGraph
- **通用微服务编排** → Temporal
- **AWS 重度用户** → Step Functions
- **需要低延迟** → Restate

## 七、生产级最佳实践

### 7.1 性能优化

```python
# 1. 批量持久化（减少 DB IO）
graph = builder.compile(
    checkpointer=checkpointer,
    durability="async",  # 异步批量写入
    node_cache=LRUCache(maxsize=1000),  # 节点结果缓存
)

# 2. 限制 Checkpoint 历史（节省存储）
config = {
    "configurable": {
        "thread_id": "session-001",
        "checkpoint_ns": "default",
        "checkpoint_id": None,  # 最新
    }
}
# 只保留最近 10 个 Checkpoint
checkpointer.cleanup_thread(config["configurable"]["thread_id"], keep=10)
```

### 7.2 监控与可观测

```python
from langgraph.checkpoint.postgres import PostgresSaver
from langsmith import trace

# 1. 启用 LangSmith 追踪
import os
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = "lsv2_..."
os.environ["LANGCHAIN_PROJECT"] = "prod-langgraph"

# 2. 自定义 Metrics
from prometheus_client import Counter, Histogram

graph_invocations = Counter(
    "langgraph_invocations_total",
    "Total graph invocations",
    ["graph_name", "status"]
)

graph_latency = Histogram(
    "langgraph_invocation_duration_seconds",
    "Graph invocation latency",
    ["graph_name"]
)

@trace
def instrumented_invoke(graph, input, config):
    with graph_latency.labels(graph_name="transfer").time():
        try:
            result = graph.invoke(input, config)
            graph_invocations.labels(graph_name="transfer", status="success").inc()
            return result
        except Exception as e:
            graph_invocations.labels(graph_name="transfer", status="error").inc()
            raise
```

### 7.3 错误处理与重试

```python
from langgraph.graph import StateGraph
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10)
)
def llm_node(state):
    """LLM 调用节点带重试"""
    response = openai_client.chat.completions.create(
        model="gpt-4.1",
        messages=state["messages"]
    )
    return {"messages": [response.choices[0].message]}

# 在图中加入错误处理分支
def error_handler_node(state):
    """错误处理节点：记录失败并回退"""
    return {
        "messages": [{"role": "system", "content": "LLM 调用失败，已自动重试"}],
        "retry_count": state.get("retry_count", 0) + 1
    }

# 条件路由：失败时进入 error handler
def route_after_llm(state):
    if state.get("error"):
        return "error_handler"
    return "next_node"
```

## 八、典型企业实践案例

### 8.1 Uber：跨仓库代码迁移 Agent

- **场景**：跨数千个代码仓库的自动化重构
- **LangGraph 价值**：Durable Execution 让跨天任务从中断点恢复
- **关键配置**：`durability="sync"` 保证 100% 不丢状态

### 8.2 LinkedIn：内部 SQL Bot

- **场景**：自然语言生成 SQL 查询
- **LangGraph 价值**：StateGraph 管理多轮对话 + HITL 审批敏感查询
- **关键配置**：PostgresSaver + Human Review Node

### 8.3 Klarna：客户支持 Agent

- **场景**：高并发自动客服
- **LangGraph 价值**：跨渠道（Web/App/客服系统）Checkpoint 共享
- **关键配置**：RedisSaver 高吞吐 + 异步持久化

### 8.4 J.P. Morgan：合规工作流

- **场景**：金融交易审核
- **LangGraph 价值**：时间旅行（Time Travel）支持事后审计回溯
- **关键配置**：DynamoDBSaver 11 个 9 持久性

## 九、LangChain v1.0 协同关系

LangGraph 1.0 是 **LangChain v1.0 的默认运行时引擎**，两者形成高低搭配：

```text
应用架构层次:
┌─────────────────────────────────────────────────────┐
│             Application Layer                       │
│          (业务逻辑 / Agent 应用)                     │
├─────────────────────────────────────────────────────┤
│  LangChain v1.0 (High-level Abstraction)            │
│  ┌───────────────────────────────────────────────┐ │
│  │  create_agent()                               │ │
│  │  ├─ 预构建 Agent 架构                          │ │
│  │  ├─ 工具调用抽象                               │ │
│  │  └─ 对话管理                                  │ │
│  └───────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  LangGraph v1.0 (Low-level Runtime)                 │
│  ┌───────────────────────────────────────────────┐ │
│  │  StateGraph                                   │ │
│  │  ├─ Durable Execution                         │ │
│  │  ├─ Checkpointing                             │ │
│  │  ├─ Human-in-the-Loop                         │ │
│  │  └─ Pregel Execution Engine                   │ │
│  └───────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  Infrastructure Layer                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Postgres │  │  Redis   │  │LangSmith │          │
│  └──────────┘  └──────────┘  └──────────┘          │
└─────────────────────────────────────────────────────┘
```

**经验法则**：
- **快速原型 / 标准 Agent** → LangChain `create_agent`
- **复杂工作流 / 多 Agent / 严格持久化** → 直接用 LangGraph

## 十、参考资料

- [LangGraph 1.0 官方文档](https://langchain-ai.github.io/langgraph/)
- [LangGraph GitHub 仓库](https://github.com/langchain-ai/langgraph)
- [LangGraph v1.0 Release Notes](https://blog.langchain.com/langgraph-v1-0/)
- [PostgresSaver 源码](https://github.com/langchain-ai/langgraph/tree/main/libs/checkpoint-postgres)
- [Pregel：Google 原始论文](https://research.google/pubs/pub36756/)
- [LangChain v1.0 文档](https://docs.langchain.com/oss/python/langchain/overview)
- [Durable Execution 范式论文](https://arxiv.org/abs/2403.13757)
- [LangSmith 可观测性](https://docs.smith.langchain.com/)

---

**结语**：LangGraph 1.0 的 GA 不是终点，而是 AI Agent 工程化的起点。当"Agent 持久化"和"工作流引擎"这两个概念合二为一时，我们离真正的"AI 原生应用"又近了一步。如果你正在构建生产级 Agent 系统，建议从 LangGraph 1.0 开始——它已经成为事实标准。
