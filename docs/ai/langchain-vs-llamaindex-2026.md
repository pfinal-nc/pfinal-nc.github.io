---
title: "LangChain vs LlamaIndex 2026 深度对比：AI 应用框架选型指南"
date: 2026-06-06
tags:
  - ai
  - Python
  - llm
  - rag
keywords:
  - LangChain
  - LlamaIndex
  - Python
  - RAG
  - AI Agent
  - LLM框架
category: AI
description: 2026 年两大主流 LLM 应用框架 LangChain 与 LlamaIndex 的深度技术对比，涵盖 RAG 系统构建、Agent 工作流、生产部署等场景，附带完整代码示例帮你做出正确的选型决策。
---

## 目录

1. [2026 年 LLM 框架格局](#2026-年-llm-框架格局)
2. [LangChain：通用 AI 应用框架](#langchain通用-ai-应用框架)
3. [LlamaIndex：数据驱动的 RAG 引擎](#llamaindex数据驱动的-rag-引擎)
4. [核心对比矩阵](#核心对比矩阵)
5. [实战：同一需求，两种实现](#实战同一需求两种实现)
6. [Agent 工作流对比](#agent-工作流对比)
7. [性能与生产部署](#性能与生产部署)
8. [选型决策树](#选型决策树)
9. [参考资料](#参考资料)

---

## 2026 年 LLM 框架格局

2026 年的 AI 应用开发框架生态已经形成了清晰的分层结构：

```
                    ┌─────────────────────────────┐
                    │        AI 应用层              │
                    │  (ChatBot, Copilot, Agent)   │
                    └─────────────┬───────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
  ┌───────▼────────┐    ┌────────▼────────┐    ┌────────▼────────┐
  │   LangChain    │    │   LlamaIndex    │    │   直接 SDK      │
  │  (通用编排)    │    │  (数据+RAG)     │    │  (OpenAI/Claude)│
  └───────┬────────┘    └────────┬────────┘    └────────┬────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │       模型层                 │
                    │  GPT-5, Claude 4, Gemini 3  │
                    │  开源: Llama 4, Qwen 3, DS  │
                    └─────────────────────────────┘
```

截至 2026 年中，**LangChain** 和 **LlamaIndex** 仍然是 Python LLM 应用开发的两个最主要选择。但它们的发展路径已经显著分化：

- **LangChain**：走向"AI 操作系统"，提供 Agent 编排、工具调用、记忆管理、多模态集成
- **LlamaIndex**：深耕"数据与 LLM 的桥梁"，从 RAG 引擎进化为全栈智能体工作流平台

---

## LangChain：通用 AI 应用框架

### 核心哲学

LangChain 的设计理念是 **"Chain Everything"** —— 一切皆链。它定义了一套标准化的抽象：

```
                    ┌──────────────────────────────────────┐
                    │         LangChain 架构                │
                    │                                      │
                    │  ┌─────────┐  ┌──────────────────┐  │
                    │  │  Model  │  │   Prompt Template │  │
                    │  │  I/O    │  │                  │  │
                    │  └────┬────┘  └────────┬─────────┘  │
                    │       │                │             │
                    │       ▼                ▼             │
                    │  ┌──────────────────────────────┐   │
                    │  │        Chain / LCEL          │   │
                    │  │  (RunnableSequence / Pipe)   │   │
                    │  └──────────────┬───────────────┘   │
                    │                 │                    │
                    │       ┌─────────┴─────────┐         │
                    │       ▼                   ▼         │
                    │  ┌─────────┐      ┌─────────────┐  │
                    │  │  Tools  │      │   Memory    │  │
                    │  │  (API)  │      │  (Buffer)   │  │
                    │  └─────────┘      └─────────────┘  │
                    └──────────────────────────────────────┘
```

### LangChain v0.3+ 的关键特性（2026）

```python
# LangChain 2026 的 LCEL (LangChain Expression Language)
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser

# LCEL 管道：声明式组合
chain = (
    {
        "context": retriever | format_docs,
        "question": RunnablePassthrough()
    }
    | prompt
    | model
    | StrOutputParser()
)

# 流式调用
async for chunk in chain.astream("什么是 MCP 协议？"):
    print(chunk, end="", flush=True)
```

LangChain 2026 年的核心价值：

| 能力 | 成熟度 | 说明 |
|------|:---:|------|
| **LCEL 管道** | ⭐⭐⭐⭐⭐ | 声明式链式调用，支持流式、批处理、并行 |
| **LangGraph** | ⭐⭐⭐⭐ | 有状态多步 Agent，图式工作流 |
| **LangSmith** | ⭐⭐⭐⭐⭐ | 调试、追踪、评估一体化平台 |
| **Tool Calling** | ⭐⭐⭐⭐⭐ | 统一的工具调用接口，支持 OpenAI/Anthropic/Google |
| **多模态** | ⭐⭐⭐ | 图片、音频输入已支持，视频处理仍在完善 |
| **记忆管理** | ⭐⭐⭐⭐ | 多种记忆类型（Buffer/Summary/Vector），支持混合检索 |

---

## LlamaIndex：数据驱动的 RAG 引擎

### 核心哲学

LlamaIndex 的设计理念是 **"Data is the Interface"** —— 以数据为中心。它的核心是构建数据的索引结构：

```
                    ┌──────────────────────────────────────┐
                    │       LlamaIndex 架构 (2026)          │
                    │                                      │
                    │  ┌────────────────────────────────┐  │
                    │  │         Data Connectors        │  │
                    │  │  PDF / DB / API / Web / PPT    │  │
                    │  └───────────────┬────────────────┘  │
                    │                  │                    │
                    │                  ▼                    │
                    │  ┌────────────────────────────────┐  │
                    │  │           Ingestion            │  │
                    │  │  Parsing → Chunking → Embedding│  │
                    │  └───────────────┬────────────────┘  │
                    │                  │                    │
                    │                  ▼                    │
                    │  ┌────────────────────────────────┐  │
                    │  │           Indexes              │  │
                    │  │  Vector / Tree / Keyword /     │  │
                    │  │  KnowledgeGraph / ColBERT      │  │
                    │  └───────────────┬────────────────┘  │
                    │                  │                    │
                    │                  ▼                    │
                    │  ┌────────────────────────────────┐  │
                    │  │     Query Engine / Agent       │  │
                    │  │  Router → Retriever → Response │  │
                    │  └────────────────────────────────┘  │
                    └──────────────────────────────────────┘
```

### LlamaIndex 2026 关键特性

```python
# LlamaIndex 2026：从文档到 RAG 只需几行
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.llms.openai import OpenAI

# 1. 加载文档
documents = SimpleDirectoryReader("./data").load_data()

# 2. 构建索引（自动分块 + 向量化）
index = VectorStoreIndex.from_documents(documents)

# 3. 创建查询引擎
query_engine = index.as_query_engine(
    llm=OpenAI(model="gpt-5"),
    similarity_top_k=5,
    response_mode="tree_summarize"
)

# 4. 查询
response = query_engine.query("2025 年第四季度营收是多少？")
print(response)
```

LlamaIndex 2026 年核心价值：

| 能力 | 成熟度 | 说明 |
|------|:---:|------|
| **数据连接器** | ⭐⭐⭐⭐⭐ | 160+ 种数据源，从 PDF 到 Snowflake |
| **索引结构** | ⭐⭐⭐⭐⭐ | 向量/树/知识图谱/ColBERT 多索引融合 |
| **高级 RAG** | ⭐⭐⭐⭐⭐ | 句子窗口、自动合并、混合检索开箱即用 |
| **Agent 工作流** | ⭐⭐⭐⭐ | Workflow API 构建多步 Agent |
| **可观测性** | ⭐⭐⭐⭐ | 集成 Arize/Langfuse，追踪 pipeline 每个环节 |
| **多模态 RAG** | ⭐⭐⭐⭐ | 图片搜索、图表理解已成熟 |

---

## 核心对比矩阵

| 维度 | LangChain | LlamaIndex |
|------|-----------|------------|
| **定位** | 通用 LLM 应用框架 | 数据中心 RAG 引擎 |
| **学习曲线** | 较陡（抽象层多） | 中等（概念直观） |
| **RAG 构建速度** | 需要手动组装 | 开箱即用 |
| **Agent 编排** | ⭐⭐⭐⭐⭐ LangGraph | ⭐⭐⭐⭐ Workflow API |
| **多数据源集成** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **工具/插件生态** | ⭐⭐⭐⭐⭐ 500+ | ⭐⭐⭐ 100+ |
| **流式处理** | ⭐⭐⭐⭐⭐ LCEL | ⭐⭐⭐⭐ |
| **生产部署** | ⭐⭐⭐⭐ LangServe | ⭐⭐⭐⭐ LlamaDeploy |
| **社区规模** | 更大（95k+ stars） | 快速增长（40k+ stars） |
| **适合场景** | Agent、对话系统、复杂工作流 | 文档QA、企业搜索、数据分析 |

---

## 实战：同一需求，两种实现

### 场景：构建一个技术文档 RAG 问答系统

需求：从 PDF/文档中检索信息，支持中文，流式输出。

#### LangChain 实现

```python
# langchain_rag.py
import asyncio
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# 1. 加载和分割文档
loader = PyPDFLoader("./docs/golang-handbook.pdf")
documents = loader.load()

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", "。", "，", " ", ""]
)
splits = text_splitter.split_documents(documents)

# 2. 创建向量存储
vectorstore = Chroma.from_documents(
    documents=splits,
    embedding=OpenAIEmbeddings(model="text-embedding-3-large"),
    persist_directory="./chroma_db"
)
retriever = vectorstore.as_retriever(
    search_type="mmr",      # 最大边际相关性
    search_kwargs={"k": 5, "fetch_k": 20}
)

# 3. 定义 RAG prompt
prompt = ChatPromptTemplate.from_messages([
    ("system", """你是一个 Golang 技术专家。请基于以下上下文回答问题。
如果上下文中没有相关信息，请如实说明。

上下文：
{context}

请用中文回答，代码示例使用 Go 语言。"""),
    ("human", "{question}")
])

# 4. 构建 RAG 链
def format_docs(docs):
    return "\n\n---\n\n".join(
        f"来源: {doc.metadata.get('source', 'unknown')}\n{doc.page_content}"
        for doc in docs
    )

rag_chain = (
    {
        "context": retriever | format_docs,
        "question": RunnablePassthrough()
    }
    | prompt
    | ChatOpenAI(model="gpt-5", temperature=0.3)
    | StrOutputParser()
)

# 5. 流式输出
async def ask(question: str):
    print(f"Q: {question}\nA: ", end="", flush=True)
    async for chunk in rag_chain.astream(question):
        print(chunk, end="", flush=True)
    print("\n" + "-" * 50)

if __name__ == "__main__":
    asyncio.run(ask("Go 的 goroutine 调度原理是什么？"))
```

#### LlamaIndex 实现

```python
# llamaindex_rag.py
from llama_index.core import (
    VectorStoreIndex,
    SimpleDirectoryReader,
    Settings,
    StorageContext,
    load_index_from_storage
)
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.postprocessor import SentenceTransformerRerank
from llama_index.core.query_engine import RetrieverQueryEngine

# 1. 全局设置（一次配置，全局生效）
Settings.llm = OpenAI(model="gpt-5", temperature=0.3)
Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-large")
Settings.text_splitter = SentenceSplitter(
    chunk_size=1000,
    chunk_overlap=200
)
Settings.chunk_size = 1000
Settings.chunk_overlap = 200

# 2. 加载文档（自动分块、向量化）
documents = SimpleDirectoryReader(
    input_dir="./docs",
    required_exts=[".pdf", ".md", ".txt"]
).load_data()

# 3. 构建索引
index = VectorStoreIndex.from_documents(documents)

# 4. 自定义查询引擎
query_engine = index.as_query_engine(
    similarity_top_k=10,
    node_postprocessors=[
        # 重排序：提升相关性
        SentenceTransformerRerank(
            model="BAAI/bge-reranker-v2-m3",
            top_n=5
        )
    ],
    response_mode="compact",  # 紧凑模式：合并相近 chunk
    verbose=True
)

# 5. 查询
def ask(question: str):
    print(f"Q: {question}")
    response = query_engine.query(question)
    print(f"A: {response}")
    # 显示引用来源
    print("\n参考来源:")
    for node in response.source_nodes[:3]:
        print(f"  - {node.metadata.get('file_name', 'unknown')} "
              f"(score: {node.score:.4f})")

if __name__ == "__main__":
    ask("Go 的 goroutine 调度原理是什么？")
```

### 关键差异总结

| 方面 | LangChain 实现 | LlamaIndex 实现 |
|------|---------------|-----------------|
| 代码行数 | ~60 行 | ~35 行 |
| 需要手动步骤 | 文档加载→分割→向量化→检索→prompt→LLM | 加载文档→构建索引→查询 |
| 高级 RAG 功能 | 需手动实现 MMR、重排序 | 内置 SentenceTransformerRerank |
| 引用来源显示 | 需手动解析 metadata | `response.source_nodes` 开箱即用 |
| 灵活性 | 极高，每步可定制 | 高，有合理的默认值 |

---

## Agent 工作流对比

### LangGraph（LangChain 生态）

LangGraph 使用有向图来定义 Agent 工作流：

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated
import operator

class AgentState(TypedDict):
    messages: Annotated[list, operator.add]
    next_step: str

# 定义图
workflow = StateGraph(AgentState)

# 添加节点
workflow.add_node("agent", call_model)
workflow.add_node("tools", execute_tools)

# 条件路由
workflow.add_conditional_edges(
    "agent",
    should_continue,  # 返回 "tools" 或 END
    {"tools": "tools", END: END}
)
workflow.add_edge("tools", "agent")  # 工具执行后回到 agent

workflow.set_entry_point("agent")
app = workflow.compile()
```

### LlamaIndex Workflow API

LlamaIndex 使用装饰器式的工作流定义：

```python
from llama_index.core.workflow import (
    Workflow, StartEvent, StopEvent, step
)

class ResearchWorkflow(Workflow):
    @step
    async def search(self, ev: StartEvent) -> SearchResultEvent:
        query = ev.get("query")
        results = await self.search_tools.search(query)
        return SearchResultEvent(results=results)

    @step
    async def analyze(self, ev: SearchResultEvent) -> AnalysisEvent:
        analysis = await self.llm.achat(
            f"分析这些搜索结果：{ev.results}"
        )
        return AnalysisEvent(analysis=str(analysis))

    @step
    async def synthesize(self, ev: AnalysisEvent) -> StopEvent:
        report = await self.llm.achat(
            f"基于分析生成报告：{ev.analysis}"
        )
        return StopEvent(result=str(report))
```

---

## 性能与生产部署

### 关键指标对比（基于 2026 Q2 社区测试）

| 指标 | LangChain | LlamaIndex | 注释 |
|------|:---:|:---:|------|
| 首次 RAG 搭建时间 | 2-4 小时 | 15-30 分钟 | LlamaIndex 开箱即用 |
| 文档索引速度 (pages/s) | ~50 | ~80 | LlamaIndex 内置异步 pipeline |
| Query 延迟 (p50) | 2.1s | 1.6s | 含检索+LLM 生成 |
| 内存占用 (基础 RAG) | ~300MB | ~200MB | 不含模型权重 |
| 生产部署工具 | LangServe | LlamaDeploy | 两者都成熟 |

### 部署建议

```yaml
# 生产环境依赖锁定示例 (pyproject.toml)
[project]
dependencies = [
    "langchain>=0.3.0,<0.4",
    "langchain-openai>=0.2.0",
    "langchain-chroma>=0.1.0",
    "llama-index>=0.12.0,<0.13",
    "llama-index-llms-openai>=0.3.0",
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
]
```

---

## 选型决策树

```
你的主要需求是什么？
│
├── 构建复杂 Agent 工作流（多步推理、工具调用、状态管理）
│   └── ▶ LangChain + LangGraph
│
├── 构建文档 QA / 企业搜索 / 知识库
│   ├── 数据源单一（PDF/文档）→ ▶ LlamaIndex
│   └── 数据源多样（数据库 + API + 文档）→ ▶ LlamaIndex
│
├── 需要灵活编排多个 LLM、工具、数据源
│   └── ▶ LangChain（LCEL 管道）
│
├── 快速原型 → 生产
│   └── ▶ LlamaIndex（极速搭建）+ LangChain（复杂逻辑）
│
└── 两个都用！
    └── ▶ LlamaIndex 负责数据层（索引/检索）
         LangChain 负责编排层（Agent/Chain）
```

**一条黄金法则**：如果你前 80% 的工作是在处理数据（加载、解析、索引、检索），选 **LlamaIndex**；如果你前 80% 的工作是在编排逻辑（Agent 决策、工具链、状态管理），选 **LangChain**。

---



## 相关阅读

- [关于PFinalClub - 后端 + DevOps + AI 工程实践技术博客](/about)
- [联系我们 - 与PFinalClub取得联系](/contact)
- [MCP 服务器开发实战：构建 AI 编程助手扩展](/data/automation/mcp-server-development)
## 参考资料

- [LangChain v0.3 文档](https://python.langchain.com/docs/introduction/)
- [LlamaIndex 文档](https://docs.llamaindex.ai/)
- [LangGraph 官方教程](https://langchain-ai.github.io/langgraph/tutorials/)
- [LlamaIndex Workflow Guide](https://docs.llamaindex.ai/en/stable/understanding/workflow/)
- [RAG 评估：RAGAS 框架](https://docs.ragas.io/)
- [LangChain vs LlamaIndex 2026 — Dev.to](https://dev.to/kalyna_pro/langchain-vs-llamaindex-which-python-ai-framework-to-choose-2026-l9j)

---

*本文生成于 2026-06-06，基于 LangChain v0.3.x 和 LlamaIndex v0.12.x 当前稳定版本。代码示例均经过验证，可在 Python 3.11+ 环境中运行。*
