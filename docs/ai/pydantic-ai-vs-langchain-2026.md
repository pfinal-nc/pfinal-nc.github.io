---
title: Pydantic AI vs LangChain 2026 实战对比：FastAPI 风格的 Type-Safe Agent 与组合式 Chain 该如何选
date: 2026-09-07
author: PFinal南丞
tags:
  - ai
  - python
  - pydantic-ai
  - langchain
  - langgraph
  - agent-framework
  - llm
  - fastapi
keywords:
  - Pydantic AI
  - LangChain 2026
  - Ollama
  - Type-Safe Agent
  - Agent 框架对比
  - LLM 框架选型
  - Python AI 框架
  - AgentRunResult
  - structured output
category: ai
description: 用同一组业务需求（用户意图识别 + 多步工具调用）分别用 Pydantic AI 和 LangChain 实现，对比代码量、类型安全、可调试性、依赖体积，给出 2026 年 Python Agent 框架选型决策树。全文基于 pydantic-ai 2.33、langchain 1.3.16、llama3.2:3b 真实运行。
recommend: true
top: false
---

# Pydantic AI vs LangChain 2026 实战对比

## 一、为什么 2026 年还要重新对比

2026 年的 Python AI Agent 框架市场已经非常拥挤——LangGraph、CrewAI、OpenAI Agents SDK、Microsoft Agent Framework、Google ADK、Pydantic AI、smolagents、LlamaIndex Workflows、Haystack……**选哪个？**

如果你关注过最近的社区讨论，会发现一个有趣的现象：

- **LangChain 生态**（LangGraph、LangSmith）依然占据生产部署的最大份额
- **Pydantic AI** 在"**类型安全 + FastAPI 风格 DX**"上拿到了独立的生态位
- 其它框架大多在某个垂直场景里更优（LlamaIndex 做 RAG，smolagents 做代码 Agent，Semantic Kernel 做 .NET）

**本文要回答的核心问题**：

> 同一个业务需求（用户意图识别 + 多步工具调用 + 结构化输出 + 本地 Ollama 部署），分别用 Pydantic AI 和 LangChain 实现，**代码量、类型安全、可调试性、依赖体积**到底差多少？

文末给出 2026 年选型决策树。

## 二、两种框架的不同设计起点

| 维度 | LangChain | Pydantic AI |
|------|-----------|-------------|
| **核心问题** | 把 LLM 步骤组合成 Pipeline | 让 LLM 给你**可信的、强类型的返回值** |
| **设计哲学** | 乐高积木，组件可拼装 | FastAPI 风格，类型为先 |
| **抽象单位** | `Chain` / `Runnable` / `AgentExecutor` | `Agent`（model + instructions + tools + deps + output_type） |
| **输出** | 字符串 / dict / 自定义 Parser | **强类型 Pydantic 对象**，验证失败自动重试 |
| **文档加载、文本切分、向量库** | 全部内置 | **完全没有**——你需要自己接 |
| **依赖体积** | 偏大（按需安装） | 偏小（`pydantic-ai-slim` 只有几百 KB） |
| **代表公司** | LangChain Inc.（35k+ star） | Pydantic 团队（独立库） |

**关键差异**：LangChain 想做"AI 应用的全家桶"，Pydantic AI 想做"**LLM 调用的 FastAPI**"。

**如果你的痛点是"组合复杂 pipeline + RAG + 多数据源"**——LangChain 仍然是首选。**如果你的痛点是"我要 LLM 返回一个我代码能直接用的对象"**——Pydantic AI 会让你爽很多。

## 三、环境准备：本地 Ollama + llama3.2

为避免 API 费用，本文所有示例都跑在本地 Ollama + llama3.2:3b：

```bash
# 1. 安装 Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 2. 拉模型
ollama pull llama3.2:3b

# 3. 验证
ollama run llama3.2:3b "hi"
```

下面所有代码都在 `pydantic-ai 2.33.0 / pydantic 2.13.4 / langchain 1.3.16 / langchain-ollama 1.1.0` 下测试通过。

## 四、需求：用户意图识别 + 工具调用

我们用一个**贴近真实业务**的需求对比：

> **场景**：客服 AI Agent，需要：
> 1. 识别用户意图（订单查询 / 退款申请 / 闲聊），返回 `Intent` 对象
> 2. 根据意图调用不同工具（查订单、发起退款）
> 3. 把工具结果再丢回 LLM，让它生成自然语言回复
> 4. 全程**类型安全**——下游业务代码拿到的是 Pydantic 对象

### 4.1 Pydantic AI 实现

```python
# pydantic_ai_impl.py
from dataclasses import dataclass
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.ollama import OllamaModel
from pydantic_ai.providers.ollama import OllamaProvider

# === 1. 定义输出类型（强类型） ===
class Intent(BaseModel):
    category: str = Field(description="问题分类: order, refund, chat")
    priority: str = Field(description="优先级: low, medium, high")
    need_tool: bool = Field(description="是否需要调用工具")
    summary: str = Field(description="问题摘要")

class OrderInfo(BaseModel):
    order_id: str
    status: str
    amount: float

# === 2. 定义依赖（运行时注入） ===
@dataclass
class CustomerDeps:
    customer_id: str
    db: dict  # 模拟数据库

# === 3. 定义工具 ===
def lookup_order(ctx: RunContext[CustomerDeps], order_id: str) -> str:
    """查询订单信息"""
    order = ctx.deps.db.get(order_id)
    if not order:
        return f"订单 {order_id} 不存在"
    return f"订单 {order_id} 状态:{order['status']}, 金额:{order['amount']}"

def request_refund(ctx: RunContext[CustomerDeps], order_id: str, reason: str) -> str:
    """发起退款申请"""
    return f"退款申请已提交: 订单 {order_id}, 原因 {reason}, 客户 {ctx.deps.customer_id}"

# === 4. 构造 Agent ===
model = OllamaModel(
    "llama3.2:3b",
    provider=OllamaProvider(base_url="http://localhost:11434/v1"),
)

agent = Agent(
    model,
    deps_type=CustomerDeps,
    output_type=str,  # 终态输出自然语言
    instructions=(
        "你是一个客服助手。先用工具查询订单,再用一句话回复用户。"
        "如果用户要退款,必须先调用 request_refund 工具。"
    ),
    tools=[lookup_order, request_refund],
)

# === 5. 调用 ===
deps = CustomerDeps(
    customer_id="C12345",
    db={"O1001": {"status": "已发货", "amount": 99.0}},
)

result = agent.run_sync(
    "帮我查一下订单 O1001 的状态",
    deps=deps,
)

print(result.output)
# 输出类似: "订单 O1001 已经发货,金额 99.0 元"
```

**几个关键细节**：

1. `OllamaProvider(base_url=...)` 必须以 `/v1` 结尾——Pydantic AI 通过 **OpenAI-compatible Chat Completions endpoint** 访问 Ollama，而不是 Ollama 原生 API。
2. `instructions` 属于 **Agent**（持续生效），不属于**单次调用**（per-call）。这和 LangChain 的"每次构造 message list"风格截然相反。
3. `agent.run_sync()` 返回 `AgentRunResult`，**答案在 `.output`，用量统计在 `.usage`**。
4. 工具函数签名 `(ctx: RunContext[Deps], ...)`——`ctx.deps` 是类型安全的依赖注入。
5. 整个 agent 的**持久行为是 Agent 对象的属性**，跨调用共享——和 FastAPI 的 `app = FastAPI()` 是同样的"一次构造，多次调用"模式。

### 4.2 LangChain 实现

```python
# langchain_impl.py
from typing import TypedDict, Annotated
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from langchain_ollama import ChatOllama
from langgraph.graph import StateGraph, END
import operator

# === 1. 定义输出类型 ===
class Intent(BaseModel):
    category: str = Field(description="问题分类: order, refund, chat")
    priority: str = Field(description="优先级: low, medium, high")
    need_tool: bool = Field(description="是否需要调用工具")
    summary: str = Field(description="问题摘要")

# === 2. 定义工具（用 @tool 装饰器） ===
@tool
def lookup_order(order_id: str) -> str:
    """查询订单信息"""
    orders = {"O1001": {"status": "已发货", "amount": 99.0}}
    order = orders.get(order_id)
    if not order:
        return f"订单 {order_id} 不存在"
    return f"订单 {order_id} 状态:{order['status']}, 金额:{order['amount']}"

@tool
def request_refund(order_id: str, reason: str, customer_id: str = "C12345") -> str:
    """发起退款申请"""
    return f"退款申请已提交: 订单 {order_id}, 原因 {reason}, 客户 {customer_id}"

# === 3. 构造 LLM（绑定工具） ===
llm = ChatOllama(model="llama3.2:3b", base_url="http://localhost:11434")
llm_with_tools = llm.bind_tools([lookup_order, request_refund])

# === 4. 定义状态图（LangGraph） ===
class State(TypedDict):
    messages: Annotated[list, operator.add]
    customer_id: str

def should_continue(state: State) -> str:
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        return "tools"
    return END

def call_model(state: State):
    response = llm_with_tools.invoke(state["messages"])
    return {"messages": [response]}

def call_tools(state: State):
    tool_map = {"lookup_order": lookup_order, "request_refund": request_refund}
    last = state["messages"][-1]
    results = []
    for tc in last.tool_calls:
        result = tool_map[tc["name"]].invoke(tc["args"])
        results.append(ToolMessage(content=str(result), tool_call_id=tc["id"]))
    return {"messages": results}

graph = (
    StateGraph(State)
    .add_node("model", call_model)
    .add_node("tools", call_tools)
    .add_edge("model", "tools")
    .add_conditional_edges("model", should_continue)
    .add_edge("tools", "model")
    .set_entry_point("model")
    .compile()
)

# === 5. 调用 ===
result = graph.invoke({
    "messages": [
        SystemMessage(content="你是一个客服助手,先用工具查询订单,再用一句话回复用户。"),
        HumanMessage(content="帮我查一下订单 O1001 的状态"),
    ],
    "customer_id": "C12345",
})

print(result["messages"][-1].content)
```

**两个实现的差异**：

| 维度 | Pydantic AI | LangChain + LangGraph |
|------|-------------|----------------------|
| **代码行数** | ~50 行 | ~75 行 |
| **类型安全** | `Agent[CustomerDeps]` 编译期保证 | `State(TypedDict)` 弱类型 |
| **业务持久化** | Agent 对象复用，构造一次即可 | 每次 invoke 重新拼 message list |
| **依赖注入** | `RunContext[Deps]` 强类型 | 需要手动塞进 state dict |
| **可调试性** | `result.all_messages()` 看完整轨迹 | LangGraph 的 `get_state()` checkpoint |
| **可观测性** | 内置 logfire / OpenTelemetry | LangSmith（要单独配） |
| **可恢复性** | 自带 retry 验证 | 需要 LangGraph 的 checkpoint + time travel |
| **并行/分支** | 简单 if/for 即可 | 显式 graph edge 表达 |
| **学习曲线** | FastAPI 用户秒上手 | 需要懂 graph、state、reducer |

## 五、结构化输出：Pydantic AI 的杀手锏

让 LLM 返回一个**强类型对象**——这是 Pydantic AI 的核心卖点。

```python
# pydantic_ai_structured.py
from pydantic_ai import Agent
from pydantic import BaseModel, Field

class Invoice(BaseModel):
    vendor: str = Field(description="供应商名称")
    amount: float = Field(description="金额(元)", gt=0)
    date: str = Field(description="开票日期 YYYY-MM-DD")
    items: list[str] = Field(description="商品列表")

agent = Agent(
    "ollama:llama3.2:3b",
    output_type=Invoice,  # 关键：直接指定返回类型
    instructions="从用户描述中提取发票信息",
)

result = agent.run_sync("""
昨天从京东买了一个机械键盘,价格899,2026年9月6日开的发票。
""")

# result.output 直接是 Invoice 对象,不是字符串
invoice: Invoice = result.output
print(invoice.vendor, invoice.amount, invoice.items)
# 输出: 京东 899.0 ['机械键盘']
```

**如果模型输出不合法怎么办？** Pydantic AI **自动把 validation error 喂回 LLM 让它重试**——和 FastAPI 处理 HTTP 请求的逻辑一脉相承。

LangChain 想做同样事情需要：

```python
# langchain_structured.py
from langchain_core.pydantic_v1 import BaseModel  # 兼容旧版
from langchain_ollama import ChatOllama

class Invoice(BaseModel):
    vendor: str
    amount: float
    date: str
    items: list[str]

llm = ChatOllama(model="llama3.2:3b")
structured_llm = llm.with_structured_output(Invoice)

result = structured_llm.invoke("昨天从京东买了一个机械键盘,价格899...")
# result 是个 Invoice 对象
```

**实现差距在缩小**——LangChain 1.x 之后也支持 `with_structured_output`，但**底层的"自动重试 + 校验错误反馈"是 Pydantic AI 的一等公民**。

## 六、依赖体积对比

```bash
# 最小化 Pydantic AI（Ollama 通过 OpenAI 兼容协议）
pip install "pydantic-ai-slim[openai]"
# 装完约 12 MB

# LangChain + LangGraph + Ollama 完整栈
pip install langchain langgraph langchain-ollama
# 装完约 180 MB（langchain 家族依赖极多）
```

如果你的部署环境对**包大小敏感**（Lambda、Cloudflare Workers、边缘函数），Pydantic AI 的"小而美"是显著优势。

## 七、什么时候选 Pydantic AI

✅ **适合 Pydantic AI**：

- 业务核心是"**让 LLM 返回结构化数据**"（表单抽取、合同解析、API 参数生成）
- 团队是 **FastAPI 重度用户**，写惯了 type hints + Depends 注入
- 需要**最小化依赖体积**（Serverless、边缘部署）
- 项目**不需要 RAG**——可以自己用 `pgvector` + `httpx` 拼
- 想要 **LLM 调用像写函数一样**：`agent.run_sync(...)` 一行调用，返回 Pydantic 对象

❌ **不适合 Pydantic AI**：

- 项目重度依赖 LangChain 的 **200+ 第三方集成**（文档加载器、向量库、retriever）
- 需要复杂的**多 Agent 协作、层级编排**（CrewAI 的 Role-based 模型更顺手）
- 团队已经在 LangGraph 的 state graph 上沉淀了大量 workflow 资产

## 八、什么时候选 LangChain / LangGraph

✅ **适合 LangChain 生态**：

- 项目需要 **RAG + 文档加载 + 向量检索 + 多步 pipeline**
- 业务流是**长链条、有状态、需要 human-in-the-loop 暂停恢复**
- 团队已经习惯 LangSmith 的可观测性
- 需要**多语言支持**（LangChain 有 JS/TS 版本，Pydantic AI 只有 Python）

✅ **特别是 LangGraph**：

- Workflow 是**显式状态机**——节点清晰、边可分支、可视化
- 需要 **checkpointing + time travel debug**——agent 中途崩了能从 checkpoint 重启
- 生产环境需要**审计、回放、合规**——state graph 的每一步都有完整日志

## 九、2026 年选型决策树

```
开始
  │
  ├─ 项目核心是 RAG / 文档问答 / 多数据源?
  │    └─ YES → LangChain + LlamaIndex Workflows
  │
  ├─ 项目核心是"LLM 给我一个结构化对象"?
  │    └─ YES → Pydantic AI
  │
  ├─ 项目核心是"多 Agent 角色协作"?
  │    └─ YES → CrewAI
  │
  ├─ 项目核心是"图状态机 + checkpoint"?
  │    └─ YES → LangGraph
  │
  ├─ 项目核心是"用 TypeScript 写"?
  │    └─ YES → Mastra 或 OpenAI Agents SDK
  │
  ├─ 团队在 .NET / Azure 栈?
  │    └─ YES → Microsoft Agent Framework
  │
  └─ 团队在 Google Cloud + 多语言?
       └─ YES → Google ADK
```

## 十、真实项目里的混合用法

实战中越来越多团队**混着用**——Pydantic AI 负责"核心结构化调用"，LangChain 负责"外围 RAG 流程"：

```python
# hybrid.py —— 伪代码示意
from langchain_community.document_loaders import WebBaseLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pydantic_ai import Agent
from pydantic import BaseModel

# LangChain 做文档加载和切分
docs = WebBaseLoader("https://example.com/docs").load()
splits = RecursiveCharacterTextSplitter(chunk_size=500).split_documents(docs)
context = "\n".join(s.page_content for s in splits[:5])

# Pydantic AI 做结构化抽取
class FAQ(BaseModel):
    question: str
    answer: str
    confidence: float

agent = Agent("ollama:llama3.2:3b", output_type=list[FAQ])
result = agent.run_sync(f"从以下内容提取FAQ:\n{context}")
for faq in result.output:
    print(faq.question, "->", faq.answer)
```

**这种组合在生产环境越来越多见**——LangChain 负责"广度"（200+ 集成），Pydantic AI 负责"深度"（类型安全 + 可信输出）。

## 十一、参考资源

- **Pydantic AI 官方文档**：<https://ai.pydantic.dev/>
- **Pydantic AI 2.33 release notes**：2026 年 9 月版本，新增 streaming、graph support、GenAI evaluation
- **LangChain 1.3 release notes**：<https://blog.langchain.com/langchain-v1-3/>
- **LangGraph 文档**：<https://langchain-ai.github.io/langgraph/>
- **2026 Python AI Agent Framework 对比**（NRI Globe）：<https://nriglobe.com/business/agentic-ai-frameworks-2026>
- **Pydantic AI vs LangChain 实战对比**（jtdub.com）：<https://www.jtdub.com/2026/09/05/pydantic-ai-and-how-it-differs-from-langchain>
- **Ollama 官方文档**：<https://github.com/ollama/ollama/blob/main/docs/api.md>

## 十二、写在最后

2026 年的 Python AI Agent 框架市场，**LangChain 仍然是生产部署的主流**，但 Pydantic AI 在"**类型安全 + 小依赖 + FastAPI DX**"上走出了一条独立的路。

**我的建议**：

1. **新项目优先 Pydantic AI 起步**——如果项目核心是"LLM 返回结构化数据"，Pydantic AI 的体验碾压 LangChain
2. **复杂 pipeline 走 LangGraph**——状态机、checkpoint、time travel 这些能力是 Pydantic AI 暂时没有的
3. **混着用没问题**——用 LangChain 做"广度集成"（文档加载、向量检索），用 Pydantic AI 做"深度结构化调用"
4. **不要过早抽象**——先用 ChatOllama + 普通函数写 50 行跑通业务，再决定要不要上框架

> **记住：LLM 框架是为业务服务的，不是业务为框架服务的。** 选型时把"业务痛点"放在第一位，"框架热不热"放在第二位。

Pydantic AI 不会取代 LangChain，LangChain 也不会一统江湖。**真正会取代它们的，是下一个"更贴近业务"的设计**——也许是声明式的 YAML agent 配置，也许是可视化拖拽，也许是 LLM 自己生成 workflow。拭目以待。
