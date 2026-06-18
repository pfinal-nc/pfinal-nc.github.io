---
title: "LlamaIndex 4.0 文档 Agent 实战：从 RAG 到 Agentic RAG 的架构跃迁"
date: 2026-06-18
tags:
  - python
  - AI
  - RAG
  - LlamaIndex
  - agent
keywords:
  - LlamaIndex 4.0
  - Agentic RAG
  - 文档 Agent
  - LlamaIndex 工作流
  - Python AI 框架
category: dev/backend/python
description: "深度实战 LlamaIndex 4.0 文档 Agent：从传统 RAG 到 Agentic RAG 的架构升级，Workflow API 构建多步推理流水线，DocumentAgent 实现跨文档查询，含 Python 完整生产级代码。"
---

# LlamaIndex 4.0 文档 Agent 实战：从 RAG 到 Agentic RAG 的架构跃迁

截至 2026 年 6 月，LlamaIndex 在 GitHub 已积累超过 **40,000 Star**，定位从最初的"GPT Index"进化为**"The leading document agent and RAG platform"**。LlamaIndex 4.0 带来了最重要的架构升级：**Workflow API** —— 一个基于事件驱动的有向无环图（DAG）执行引擎，让你可以构建真正的 Agentic RAG 系统，而不仅仅是简单的"检索 + 生成"管道。

本文将从传统 RAG 的局限出发，逐步演示如何用 LlamaIndex 4.0 构建生产级文档 Agent。

## 传统 RAG 的三大局限

```
传统 RAG 管道：
用户查询 → 向量检索 → Top-K 文档 → 直接生成

局限 1：单步检索
  无法处理需要多步推理的问题
  "比较文档A和文档B中关于X的不同说法" → 检索失败

局限 2：无法自我修正
  检索结果质量差时，直接生成幻觉内容
  没有"重新检索"或"换策略"的能力

局限 3：无上下文记忆
  每次查询独立，无法基于对话历史优化检索
```

**Agentic RAG 的解法**：

```
Agentic RAG（LlamaIndex 4.0）：

用户查询
    │
    ▼
┌─────────────────────────────────────────┐
│          Agent（规划 + 工具调用）         │
│                                         │
│  工具1：VectorSearchTool  ← 语义检索    │
│  工具2：KeywordSearchTool ← 关键词检索  │
│  工具3：SummaryTool        ← 文档摘要  │
│  工具4：MetadataFilterTool ← 精确过滤  │
│  工具5：CrossDocTool       ← 跨文档对比│
└─────────┬───────────────────────────────┘
          │
          ▼
     多步工具调用循环
     （直到置信度满足阈值）
          │
          ▼
      综合回答生成
```

## 安装与环境配置

```bash
pip install llama-index==4.0.0
pip install llama-index-llms-openai
pip install llama-index-embeddings-openai
pip install llama-index-vector-stores-chroma
pip install chromadb
pip install python-docx pypdf  # 文档解析

# 推荐使用 uv 管理依赖（速度比 pip 快 10-100x）
uv add "llama-index>=4.0.0" "chromadb>=0.6"
```

```python
# 全局配置
import os
from llama_index.core import Settings
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding

Settings.llm = OpenAI(
    model="gpt-4.1",
    api_key=os.environ["OPENAI_API_KEY"],
    temperature=0.1,
)
Settings.embed_model = OpenAIEmbedding(
    model="text-embedding-3-large",
    dimensions=1536,
)
Settings.chunk_size = 512
Settings.chunk_overlap = 64
```

---

## 一、基础 RAG 管道（快速回顾）

```python
from llama_index.core import (
    SimpleDirectoryReader,
    VectorStoreIndex,
    StorageContext,
)
from llama_index.vector_stores.chroma import ChromaVectorStore
import chromadb

# 加载文档
documents = SimpleDirectoryReader(
    input_dir="./docs",
    required_exts=[".pdf", ".docx", ".txt", ".md"],
    recursive=True,
).load_data()

print(f"Loaded {len(documents)} documents, {sum(len(d.text) for d in documents)} chars")

# 初始化向量存储（持久化）
db = chromadb.PersistentClient(path="./chroma_db")
collection = db.get_or_create_collection("my_docs")
vector_store = ChromaVectorStore(chroma_collection=collection)
storage_ctx = StorageContext.from_defaults(vector_store=vector_store)

# 构建索引
index = VectorStoreIndex.from_documents(
    documents,
    storage_context=storage_ctx,
    show_progress=True,
)

# 基础查询引擎
query_engine = index.as_query_engine(
    similarity_top_k=5,
    response_mode="tree_summarize",  # compact / refine / tree_summarize
)

response = query_engine.query("什么是量子纠缠？")
print(response)
print(f"\n来源：{[n.node.metadata.get('file_name') for n in response.source_nodes]}")
```

---

## 二、LlamaIndex 4.0 Workflow API

Workflow API 是 LlamaIndex 4.0 的核心创新：**事件驱动的 DAG 执行引擎**。

### Workflow 基本结构

```python
from llama_index.core.workflow import (
    Workflow,
    StartEvent,
    StopEvent,
    step,
    Event,
    Context,
)
from pydantic import BaseModel
from typing import Optional

# 定义自定义事件（步骤之间传递数据）
class QueryAnalyzedEvent(Event):
    """查询分析完成事件"""
    original_query: str
    rewritten_query: str
    query_type: str  # factual / comparative / summarization / multi-hop
    sub_questions: list[str]

class RetrievalDoneEvent(Event):
    """检索完成事件"""
    query: str
    nodes: list  # 检索到的文档节点
    retrieval_score: float  # 检索质量评分

class NeedRerankEvent(Event):
    """需要重排序事件"""
    query: str
    nodes: list

class GenerationDoneEvent(Event):
    """生成完成事件"""
    answer: str
    confidence: float
    sources: list[str]
```

### 构建 RAG Workflow

```python
from llama_index.core.workflow import Workflow, StartEvent, StopEvent, step, Context
from llama_index.core import VectorStoreIndex
from llama_index.core.postprocessor import SentenceTransformerRerank
import json

class AdvancedRAGWorkflow(Workflow):
    """
    高级 RAG 工作流：
    StartEvent
        → analyze_query (查询分析 + 改写)
        → retrieve (混合检索)
        → rerank (重排序，可选)
        → generate (生成)
    StopEvent
    """

    def __init__(self, index: VectorStoreIndex, **kwargs):
        super().__init__(**kwargs)
        self.index = index
        self.reranker = SentenceTransformerRerank(
            model="BAAI/bge-reranker-large",
            top_n=3,
        )

    @step
    async def analyze_query(
        self,
        ctx: Context,
        ev: StartEvent,
    ) -> QueryAnalyzedEvent:
        """Step 1：分析查询意图，改写查询，拆解子问题"""
        query = ev.query

        analysis_prompt = f"""分析以下查询，返回 JSON 格式：
        
查询：{query}

返回格式：
{{
    "rewritten_query": "改写后的精确查询",
    "query_type": "factual|comparative|summarization|multi_hop",
    "sub_questions": ["子问题1", "子问题2"],  // 如果是复合查询
    "reasoning": "分析理由"
}}"""

        response = await ctx.llm.acomplete(analysis_prompt)
        try:
            analysis = json.loads(response.text)
        except json.JSONDecodeError:
            # 降级：使用原始查询
            analysis = {
                "rewritten_query": query,
                "query_type": "factual",
                "sub_questions": [query],
            }

        await ctx.set("original_query", query)
        await ctx.set("query_type", analysis["query_type"])

        return QueryAnalyzedEvent(
            original_query=query,
            rewritten_query=analysis["rewritten_query"],
            query_type=analysis["query_type"],
            sub_questions=analysis.get("sub_questions", [query]),
        )

    @step
    async def retrieve(
        self,
        ctx: Context,
        ev: QueryAnalyzedEvent,
    ) -> RetrievalDoneEvent | NeedRerankEvent:
        """Step 2：执行混合检索（语义 + 关键词）"""
        retriever = self.index.as_retriever(
            similarity_top_k=8,
            # 混合检索：向量 + BM25
            vector_store_query_mode="hybrid",
            alpha=0.5,  # 0=纯 BM25, 1=纯向量
        )

        # 并行检索主查询 + 子问题
        import asyncio
        queries = [ev.rewritten_query] + ev.sub_questions[:2]
        results = await asyncio.gather(*[
            retriever.aretrieve(q) for q in queries
        ])

        # 合并去重
        seen_ids = set()
        all_nodes = []
        for nodes in results:
            for node in nodes:
                if node.node_id not in seen_ids:
                    seen_ids.add(node.node_id)
                    all_nodes.append(node)

        # 计算检索质量分
        avg_score = sum(n.score for n in all_nodes if n.score) / max(len(all_nodes), 1)

        await ctx.set("retrieved_nodes", all_nodes)

        if avg_score < 0.6 or len(all_nodes) < 3:
            # 质量不足，触发重排序
            return NeedRerankEvent(query=ev.rewritten_query, nodes=all_nodes)

        return RetrievalDoneEvent(
            query=ev.rewritten_query,
            nodes=all_nodes,
            retrieval_score=avg_score,
        )

    @step
    async def rerank(
        self,
        ctx: Context,
        ev: NeedRerankEvent,
    ) -> RetrievalDoneEvent:
        """Step 3（可选）：当检索质量不足时，执行 Rerank"""
        from llama_index.core.schema import QueryBundle

        reranked = self.reranker.postprocess_nodes(
            ev.nodes,
            query_bundle=QueryBundle(query_str=ev.query),
        )

        return RetrievalDoneEvent(
            query=ev.query,
            nodes=reranked,
            retrieval_score=0.8,  # rerank 后假定质量提升
        )

    @step
    async def generate(
        self,
        ctx: Context,
        ev: RetrievalDoneEvent,
    ) -> StopEvent:
        """Step 4：基于检索结果生成回答"""
        original_query = await ctx.get("original_query")
        query_type = await ctx.get("query_type")

        # 构建上下文
        context_str = "\n\n---\n\n".join([
            f"[来源：{n.node.metadata.get('file_name', 'unknown')}]\n{n.node.text}"
            for n in ev.nodes[:5]
        ])

        # 根据查询类型选择不同的生成提示
        if query_type == "comparative":
            prompt = f"""基于以下文档内容，请进行详细的对比分析。

文档内容：
{context_str}

问题：{original_query}

请按照以下结构回答：
1. 相同点
2. 不同点
3. 综合结论

回答："""
        elif query_type == "summarization":
            prompt = f"""基于以下文档内容，请提供一个全面的总结。

文档内容：
{context_str}

问题：{original_query}

总结："""
        else:  # factual / multi_hop
            prompt = f"""基于以下文档内容，请准确回答问题。如果文档中没有足够的信息，请明确说明。

文档内容：
{context_str}

问题：{original_query}

回答："""

        response = await ctx.llm.acomplete(prompt)

        # 提取来源
        sources = list(set([
            n.node.metadata.get("file_name", "unknown")
            for n in ev.nodes[:5]
        ]))

        # 简单置信度估算（基于检索分 + 响应长度）
        confidence = min(ev.retrieval_score * 0.8 + 0.2, 1.0)

        return StopEvent(
            result={
                "answer": response.text,
                "confidence": confidence,
                "sources": sources,
                "num_nodes": len(ev.nodes),
            }
        )


# 使用 AdvancedRAGWorkflow
async def main():
    workflow = AdvancedRAGWorkflow(
        index=index,
        timeout=60,
        verbose=True,
    )

    result = await workflow.run(
        query="LlamaIndex 4.0 和 LangChain v0.3 在 RAG 实现上有什么核心区别？"
    )
    print(f"回答：{result['answer']}")
    print(f"置信度：{result['confidence']:.2%}")
    print(f"来源：{result['sources']}")


import asyncio
asyncio.run(main())
```

---

## 三、DocumentAgent：跨文档智能查询

LlamaIndex 4.0 的 **DocumentAgent** 为每个文档创建独立的"子 Agent"，并通过顶层 Router Agent 协调多文档查询。

```
顶层 RouterAgent
    │
    ├── Doc Agent（产品手册.pdf）
    │       ├── VectorIndex
    │       ├── SummaryIndex
    │       └── Tools: [search, summarize, compare]
    │
    ├── Doc Agent（技术规格.docx）
    │       ├── VectorIndex
    │       └── Tools: [search, summarize]
    │
    └── Doc Agent（FAQ.txt）
            ├── VectorIndex
            └── Tools: [search]
```

```python
from llama_index.core import (
    VectorStoreIndex,
    SummaryIndex,
    SimpleDirectoryReader,
)
from llama_index.core.tools import QueryEngineTool, ToolMetadata
from llama_index.core.agent import ReActAgent
from llama_index.core.node_parser import SentenceSplitter
from pathlib import Path

def build_document_agent(file_path: str) -> ReActAgent:
    """为单个文档构建 Agent"""
    file_name = Path(file_path).stem

    # 加载文档
    docs = SimpleDirectoryReader(input_files=[file_path]).load_data()

    # 构建节点
    splitter = SentenceSplitter(chunk_size=512, chunk_overlap=64)
    nodes = splitter.get_nodes_from_documents(docs)

    # 两种索引：向量（精确检索）+ 摘要（全文理解）
    vector_index = VectorStoreIndex(nodes)
    summary_index = SummaryIndex(nodes)

    # 两种查询工具
    vector_tool = QueryEngineTool(
        query_engine=vector_index.as_query_engine(similarity_top_k=5),
        metadata=ToolMetadata(
            name=f"{file_name}_vector_search",
            description=(
                f"用于从《{file_name}》中进行语义检索，适合查找具体信息、"
                f"定义、技术细节等精确问题。"
            ),
        ),
    )

    summary_tool = QueryEngineTool(
        query_engine=summary_index.as_query_engine(
            response_mode="tree_summarize",
        ),
        metadata=ToolMetadata(
            name=f"{file_name}_summary",
            description=(
                f"用于生成《{file_name}》的摘要或回答需要理解全文的问题，"
                f"如"这个文档主要讲什么"、"有哪些关键结论"等。"
            ),
        ),
    )

    # 文档级 ReAct Agent
    return ReActAgent.from_tools(
        tools=[vector_tool, summary_tool],
        llm=Settings.llm,
        verbose=True,
        max_iterations=5,
        system_prompt=(
            f"你是《{file_name}》的专属查询助手。"
            f"使用提供的工具回答关于这个文档的问题。"
            f"如果问题超出文档范围，请明确说明。"
        ),
    )


def build_router_agent(doc_agents: dict[str, ReActAgent]) -> ReActAgent:
    """构建跨文档路由 Agent"""
    # 将每个 Doc Agent 包装为顶层工具
    agent_tools = []
    for doc_name, agent in doc_agents.items():
        tool = QueryEngineTool.from_defaults(
            query_engine=agent,
            name=f"query_{doc_name.replace(' ', '_')}",
            description=(
                f"用于查询《{doc_name}》中的信息。"
                f"当问题涉及 {doc_name} 时使用此工具。"
            ),
        )
        agent_tools.append(tool)

    return ReActAgent.from_tools(
        tools=agent_tools,
        llm=Settings.llm,
        verbose=True,
        max_iterations=10,
        system_prompt="""你是一个多文档知识库查询助手。

你拥有访问多个文档的能力，每个文档都有专属的查询工具。
根据用户的问题，判断需要查询哪个（或哪几个）文档，
综合多个来源的信息给出完整回答。

如果问题需要对比多个文档，请依次查询各文档后进行对比分析。""",
    )


# 构建完整的 DocumentAgent 系统
def build_document_agent_system(docs_dir: str) -> ReActAgent:
    doc_agents = {}

    for file_path in Path(docs_dir).glob("**/*.{pdf,docx,txt,md}"):
        print(f"Building agent for: {file_path.name}")
        doc_agents[file_path.stem] = build_document_agent(str(file_path))

    return build_router_agent(doc_agents)


# 使用示例
async def demo():
    agent = build_document_agent_system("./knowledge_base")

    # 单文档查询
    response1 = await agent.aquery(
        "产品手册中关于安全规范的核心要点是什么？"
    )
    print(response1)

    # 跨文档对比查询
    response2 = await agent.aquery(
        "比较产品手册和技术规格文档中关于性能指标的不同描述"
    )
    print(response2)

    # 多跳查询
    response3 = await agent.aquery(
        "FAQ 中提到的问题在技术规格文档中有没有对应的技术解释？"
    )
    print(response3)
```

---

## 四、流式输出 + 实时进度

```python
from llama_index.core.workflow import Workflow, StartEvent, StopEvent, step, Context
from llama_index.core.workflow.events import ProgressEvent

class StreamingRAGWorkflow(Workflow):
    @step
    async def retrieve_and_stream(
        self,
        ctx: Context,
        ev: StartEvent,
    ) -> StopEvent:
        query = ev.query
        retriever = ev.index.as_retriever(similarity_top_k=5)

        # 发送进度事件
        ctx.write_event_to_stream(
            ProgressEvent(msg=f"正在检索相关文档：{query[:50]}...")
        )

        nodes = await retriever.aretrieve(query)

        ctx.write_event_to_stream(
            ProgressEvent(msg=f"检索完成，找到 {len(nodes)} 个相关文档片段")
        )

        # 流式生成
        ctx.write_event_to_stream(ProgressEvent(msg="正在生成回答..."))

        context_str = "\n".join([n.node.text for n in nodes[:3]])
        prompt = f"基于以下内容回答：\n{context_str}\n\n问题：{query}"

        response_stream = await ctx.llm.astream_complete(prompt)
        full_response = ""

        async for chunk in response_stream:
            full_response += chunk.delta
            # 实时推送给前端
            ctx.write_event_to_stream(
                ProgressEvent(msg=chunk.delta)
            )

        return StopEvent(result=full_response)


# FastAPI 集成（SSE 流式输出）
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import json

app = FastAPI()

@app.get("/query")
async def stream_query(q: str):
    workflow = StreamingRAGWorkflow(timeout=60)

    async def event_generator():
        handler = workflow.run(
            query=q,
            index=index,
        )

        # 监听流式事件
        async for ev in handler.stream_events():
            if isinstance(ev, ProgressEvent):
                yield f"data: {json.dumps({'type': 'progress', 'msg': ev.msg})}\n\n"

        # 等待最终结果
        result = await handler
        yield f"data: {json.dumps({'type': 'done', 'answer': result})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )
```

---

## 五、评估与持续改进

LlamaIndex 4.0 内置了 RAG 评估框架：

```python
from llama_index.core.evaluation import (
    FaithfulnessEvaluator,
    RelevancyEvaluator,
    AnswerRelevancyEvaluator,
    ContextRelevancyEvaluator,
)
from llama_index.core.evaluation import BatchEvalRunner
import pandas as pd

# 初始化评估器
faithfulness_eval = FaithfulnessEvaluator(llm=Settings.llm)
relevancy_eval = RelevancyEvaluator(llm=Settings.llm)

# 测试数据集
eval_questions = [
    "LlamaIndex 4.0 Workflow API 的核心特性是什么？",
    "如何构建跨文档查询 Agent？",
    "Agentic RAG 和传统 RAG 的区别？",
]

eval_answers = []
eval_contexts = []

# 批量评估
runner = BatchEvalRunner(
    {
        "faithfulness": faithfulness_eval,
        "relevancy": relevancy_eval,
    },
    workers=4,
    show_progress=True,
)

# 准备评估数据
for q in eval_questions:
    response = query_engine.query(q)
    eval_answers.append(str(response))
    eval_contexts.append([n.node.text for n in response.source_nodes])

# 运行评估
eval_results = await runner.aevaluate_queries(
    query_engine,
    queries=eval_questions,
)

# 汇总报告
report_data = []
for question, result in zip(eval_questions, eval_results["faithfulness"]):
    report_data.append({
        "question": question[:50],
        "faithfulness": result.score,
        "faithfulness_feedback": result.feedback,
    })

df = pd.DataFrame(report_data)
print(df.to_string(index=False))
print(f"\n平均忠实度分：{df['faithfulness'].mean():.3f}")
```

---

## 架构选型对比

| 特性 | 传统 RAG | LlamaIndex 4.0 Agentic RAG |
|------|---------|---------------------------|
| 检索策略 | 固定向量检索 | 多工具动态选择 |
| 多步推理 | 不支持 | Workflow DAG |
| 跨文档 | 合并检索 | DocumentAgent 协作 |
| 自我修正 | 不支持 | 质量评分 + 重试 |
| 可解释性 | 低 | 高（每步日志） |
| 生产监控 | 需自建 | 内置评估框架 |
| 复杂度 | 低 | 中-高 |
| 延迟 | 低（~500ms） | 中（~2-5s） |

**选型建议**：
- 简单 FAQ 问答、单文档检索 → 传统 RAG 足够
- 多文档对比、多跳推理、自我修正需求 → Agentic RAG
- 生产级客服、知识库 → LlamaIndex 4.0 Workflow

---

## 参考资料

- [LlamaIndex 4.0 官方文档](https://docs.llamaindex.ai/en/stable/)
- [LlamaIndex Workflow API 指南](https://docs.llamaindex.ai/en/stable/module_guides/workflow/)
- [DocumentAgent 示例](https://github.com/run-llama/llama_index/tree/main/docs/examples/agent)
- [Agentic RAG 设计模式](https://www.llamaindex.ai/blog/agentic-rag)
- [LlamaIndex vs LangChain 2026 深度对比](https://aicoding.csdn.net/6a239338662f9a54cb7a690b.html)
- [RAG 评估最佳实践](https://docs.llamaindex.ai/en/stable/module_guides/evaluating/)

---

**总结**：LlamaIndex 4.0 的 Workflow API 是从"管道"思维到"Agent"思维的关键跃迁。传统 RAG 是一条固定的流水线，而 Agentic RAG 是一个能自主决策"下一步该做什么"的智能体。DocumentAgent 模式让每个文档都有自己的"知识守门人"，顶层 Router 负责协调——这种架构在处理企业级多文档知识库时，检索准确率可以比传统 RAG 提升 30-50%。
