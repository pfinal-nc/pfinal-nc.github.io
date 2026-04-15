---
title: "RAG 系统架构设计与实现 | 从原理到生产落地"
description: "深入解析 RAG（检索增强生成）系统架构设计，涵盖文档处理、向量化、检索策略、重排序、评估优化等核心环节。提供完整的 Python 实现代码和生产环境最佳实践。"
date: 2026-04-15 14:00:00
tags:
  - AI
  - RAG
  - LLM
  - 向量数据库
  - 检索系统
  - 知识库
author: PFinal南丞
keywords:
  - RAG 架构设计
  - 检索增强生成
  - 向量数据库选型
  - 混合检索
  - RAG 评估指标
---

# RAG 系统架构设计与实现

> **目标读者**: 有 LLM 基础，希望构建生产级 RAG 系统的工程师  
> **阅读时间**: 约 30 分钟  
> **配套代码**: 完整可运行的 Python 示例

---

## 一、RAG 概述

### 1.1 什么是 RAG？

**RAG（Retrieval-Augmented Generation，检索增强生成）** 是一种将外部知识检索与大语言模型生成能力结合的技术架构。它通过动态检索相关文档，为 LLM 提供上下文支持，从而生成更准确、更可靠的回答。

```
传统 LLM:  用户提问 → LLM → 回答（基于训练数据，可能过时/幻觉）
RAG 系统:  用户提问 → 检索相关知识 → LLM + 上下文 → 回答（基于最新知识）
```

### 1.2 为什么需要 RAG？

| 问题 | 传统 LLM | RAG 解决方案 |
|------|----------|--------------|
| **知识时效性** | 训练数据有截止日期 | 动态检索最新文档 |
| **幻觉问题** | 可能生成虚假内容 | 基于检索事实生成 |
| **领域知识** | 通用知识，缺乏专业深度 | 接入领域知识库 |
| **数据隐私** | 需上传数据到第三方 | 本地知识库，数据可控 |
| **成本** | 长上下文费用高 | 精准检索降低 Token 消耗 |

### 1.3 RAG 典型应用场景

- **企业知识库问答**: 内部文档、规章制度、产品手册
- **客服系统**: 基于历史工单和 FAQ 的智能回复
- **代码助手**: 检索项目代码和文档辅助编程
- **法律/医疗咨询**: 基于专业文献的精准问答
- **研报分析**: 快速检索和分析大量研究报告

---

## 二、RAG 系统架构

### 2.1 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                        RAG 系统架构                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   文档加载    │───▶│   文档处理    │───▶│   文本分块    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                                           │       │
│         ▼                                           ▼       │
│  ┌──────────────┐                          ┌──────────────┐│
│  │  数据源      │                          │   向量化     ││
│  │ PDF/Word/   │                          │  Embedding  ││
│  │ Web/DB/API  │                          │   Model     ││
│  └──────────────┘                          └──────┬───────┘│
│                                                   │        │
│                                                   ▼        │
│                                          ┌──────────────┐ │
│                                          │  向量数据库   │ │
│                                          └──────┬───────┘ │
│                                                 │         │
│  ┌──────────────┐    ┌──────────────┐          │         │
│  │   用户查询    │───▶│   查询向量化  │──────────┘         │
│  └──────────────┘    └──────────────┘                    │
│                              │                            │
│                              ▼                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   重排序     │◀───│   向量检索    │    │   混合检索    │ │
│  └──────┬───────┘    └──────────────┘    └──────────────┘ │
│         │                                                 │
│         ▼                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   上下文     │───▶│    LLM       │───▶│   生成回答    │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 数据流详解

**索引阶段（离线）**:
1. 加载多源文档（PDF、Word、网页、数据库）
2. 文档清洗和预处理（去噪、格式化）
3. 文本分块（Chunking）策略
4. 向量化（Embedding）存储到向量数据库

**查询阶段（在线）**:
1. 用户查询语义理解
2. 查询向量化
3. 向量检索（相似度搜索）
4. 重排序优化（Reranking）
5. 上下文组装
6. LLM 生成回答

---

## 三、文档处理与向量化

### 3.1 文档加载

```python
from langchain.document_loaders import PyPDFLoader, TextLoader
from langchain.schema import Document
from typing import List

class DocumentLoader:
    """多源文档加载器"""
    
    @staticmethod
    def load_pdf(file_path: str) -> List[Document]:
        loader = PyPDFLoader(file_path)
        return loader.load()
    
    @staticmethod
    def load_directory(dir_path: str) -> List[Document]:
        from langchain.document_loaders import DirectoryLoader
        loader = DirectoryLoader(
            dir_path,
            glob="**/*.{pdf,docx,txt,md}",
            loader_cls=TextLoader
        )
        return loader.load()

# 使用示例
docs = DocumentLoader.load_pdf("./docs/handbook.pdf")
print(f"加载了 {len(docs)} 页文档")
```

### 3.2 文本分块策略

分块是 RAG 的关键环节，直接影响检索质量：

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

# 递归字符分割 - 推荐用于一般文本
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,        # 每块大小
    chunk_overlap=50,      # 重叠大小（保持上下文连贯）
    length_function=len,
    separators=["\n\n", "\n", "。", " ", ""]  # 优先级分割符
)

chunks = text_splitter.split_documents(docs)
print(f"分块后: {len(chunks)} 个片段")
```

**分块策略选择指南**:

| 策略 | 适用场景 | 优点 | 缺点 |
|------|----------|------|------|
| **固定大小** | 通用场景 | 简单可控 | 可能切断语义 |
| **递归字符** | 结构化文档 | 保持段落完整 | 块大小不均 |
| **语义分块** | 高质量要求 | 语义完整 | 计算成本高 |
| **Agentic** | 复杂文档 | 智能决策 | 实现复杂 |

### 3.3 向量化模型选择

```python
from langchain.embeddings import OpenAIEmbeddings, HuggingFaceEmbeddings

# OpenAI 嵌入（高质量，需 API Key）
openai_embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small",  # 或 3-large
    openai_api_key="your-api-key"
)

# 开源嵌入模型（本地运行，免费）
hf_embeddings = HuggingFaceEmbeddings(
    model_name="BAAI/bge-large-zh-v1.5",  # 中文推荐
    model_kwargs={'device': 'cuda'}
)

# 生成向量
embeddings = hf_embeddings.embed_documents([chunk.page_content for chunk in chunks])
print(f"向量维度: {len(embeddings[0])}")
```

**嵌入模型对比**:

| 模型 | 维度 | 语言 | 特点 | 适用场景 |
|------|------|------|------|----------|
| text-embedding-3-small | 1536 | 多语言 | 性价比高 | 通用场景 |
| text-embedding-3-large | 3072 | 多语言 | 质量最高 | 高精度要求 |
| BGE-large-zh | 1024 | 中文 | 中文优化 | 中文知识库 |
| m3e-base | 768 | 中文 | 轻量快速 | 资源受限环境 |

---

## 四、向量数据库选型

### 4.1 主流向量数据库对比

| 特性 | Milvus | Pinecone | Qdrant | Chroma | Weaviate |
|------|--------|----------|--------|--------|----------|
| **部署方式** | 自托管/云 | 纯云服务 | 自托管/云 | 嵌入式 | 自托管/云 |
| **开源** | ✅ | ❌ | ✅ | ✅ | ✅ |
| **性能** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **功能丰富度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **学习曲线** | 陡峭 | 平缓 | 平缓 | 平缓 | 中等 |
| **适用规模** | 企业级 | 全规模 | 中小规模 | 原型/小项目 | 中小规模 |

### 4.2 Chroma 快速入门（推荐原型阶段）

```python
import chromadb
from chromadb.config import Settings

# 创建客户端
client = chromadb.Client(Settings(
    chroma_db_impl="duckdb+parquet",
    persist_directory="./chroma_db"  # 数据持久化目录
))

# 创建集合（相当于表）
collection = client.create_collection(
    name="knowledge_base",
    metadata={"hnsw:space": "cosine"}  # 使用余弦相似度
)

# 添加文档
collection.add(
    documents=[chunk.page_content for chunk in chunks],
    metadatas=[{"source": chunk.metadata.get("source", "")} for chunk in chunks],
    ids=[f"chunk_{i}" for i in range(len(chunks))]
)

# 持久化
client.persist()

# 相似度搜索
results = collection.query(
    query_texts=["如何配置 SSH 密钥认证？"],
    n_results=5  # 返回 Top-5
)

for doc, score in zip(results['documents'][0], results['distances'][0]):
    print(f"相似度: {1-score:.3f}, 内容: {doc[:100]}...")
```

### 4.3 生产环境推荐：Qdrant

```python
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

# 连接 Qdrant（Docker 部署）
client = QdrantClient(host="localhost", port=6333)

# 创建集合
client.create_collection(
    collection_name="docs",
    vectors_config=VectorParams(size=1024, distance=Distance.COSINE)
)

# 批量插入
points = [
    PointStruct(
        id=i,
        vector=embedding,
        payload={"text": chunk.page_content, "source": chunk.metadata}
    )
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
]

client.upsert(collection_name="docs", points=points)

# 搜索
search_result = client.search(
    collection_name="docs",
    query_vector=query_embedding,
    limit=5,
    with_payload=True
)
```

---

## 五、检索策略优化

### 5.1 混合检索：BM25 + 向量

纯向量检索可能遗漏关键词匹配，混合检索结合两者优势：

```python
from rank_bm25 import BM25Okapi
import numpy as np

class HybridRetriever:
    """混合检索：BM25 + 向量相似度"""
    
    def __init__(self, chunks, embeddings, alpha=0.5):
        """
        alpha: 向量检索权重 (0-1)，0.5 表示各占一半
        """
        self.chunks = chunks
        self.embeddings = np.array(embeddings)
        self.alpha = alpha
        
        # 初始化 BM25
        tokenized_corpus = [chunk.page_content.split() for chunk in chunks]
        self.bm25 = BM25Okapi(tokenized_corpus)
    
    def retrieve(self, query, query_embedding, top_k=5):
        # BM25 分数
        bm25_scores = self.bm25.get_scores(query.split())
        bm25_scores = (bm25_scores - np.min(bm25_scores)) / (np.max(bm25_scores) - np.min(bm25_scores) + 1e-10)
        
        # 向量相似度（余弦）
        similarities = np.dot(self.embeddings, query_embedding) / (
            np.linalg.norm(self.embeddings, axis=1) * np.linalg.norm(query_embedding)
        )
        similarities = (similarities - np.min(similarities)) / (np.max(similarities) - np.min(similarities) + 1e-10)
        
        # 融合分数
        hybrid_scores = self.alpha * similarities + (1 - self.alpha) * bm25_scores
        
        # 返回 Top-K
        top_indices = np.argsort(hybrid_scores)[::-1][:top_k]
        return [(self.chunks[i], hybrid_scores[i]) for i in top_indices]

# 使用
retriever = HybridRetriever(chunks, embeddings, alpha=0.7)
results = retriever.retrieve("SSH 安全配置", query_embedding, top_k=5)
```

### 5.2 查询重写与扩展

```python
from langchain.llms import OpenAI

class QueryEnhancer:
    """查询增强：重写 + 扩展"""
    
    def __init__(self, llm):
        self.llm = llm
    
    def rewrite(self, query: str) -> str:
        """重写查询，使其更适合检索"""
        prompt = f"""将以下用户查询改写为更适合文档检索的形式，保持原意但更加明确：

用户查询: {query}
改写后:"""
        return self.llm.predict(prompt).strip()
    
    def expand(self, query: str, num_expansions=3) -> list:
        """生成查询的多个变体"""
        prompt = f"""基于以下查询，生成 {num_expansions} 个语义相似但表达方式不同的查询：

查询: {query}

用编号列出："""
        response = self.llm.predict(prompt)
        expansions = [line.strip().split('. ', 1)[1] for line in response.split('\n') if '. ' in line]
        return [query] + expansions[:num_expansions]

# 使用
enhancer = QueryEnhancer(OpenAI())
rewritten = enhancer.rewrite("怎么配 SSH？")
expanded = enhancer.expand("SSH 安全配置", num_expansions=3)
# 结果: ["SSH 安全配置", "如何配置 SSH 安全", "SSH 安全设置指南", ...]
```

### 5.3 重排序（Reranking）

```python
from sentence_transformers import CrossEncoder

class Reranker:
    """交叉编码器重排序"""
    
    def __init__(self, model_name="BAAI/bge-reranker-base"):
        self.model = CrossEncoder(model_name)
    
    def rerank(self, query: str, documents: list, top_k: int = 3) -> list:
        """对检索结果重排序"""
        pairs = [[query, doc.page_content] for doc in documents]
        scores = self.model.predict(pairs)
        
        # 按分数排序
        scored_docs = list(zip(documents, scores))
        scored_docs.sort(key=lambda x: x[1], reverse=True)
        
        return scored_docs[:top_k]

# 使用流程
retriever = HybridRetriever(chunks, embeddings)
initial_results = retriever.retrieve(query, query_embedding, top_k=10)

reranker = Reranker()
final_results = reranker.rerank(query, [r[0] for r in initial_results], top_k=3)
```

---

## 六、完整 RAG 系统实现

### 6.1 核心类封装

```python
from dataclasses import dataclass
from typing import List, Optional, Callable
import openai

@dataclass
class RAGConfig:
    """RAG 配置"""
    embedding_model: str = "BAAI/bge-large-zh-v1.5"
    llm_model: str = "gpt-3.5-turbo"
    chunk_size: int = 500
    chunk_overlap: int = 50
    top_k: int = 5
    rerank_top_k: int = 3
    temperature: float = 0.7
    use_hybrid: bool = True
    use_rerank: bool = True

class RAGSystem:
    """生产级 RAG 系统"""
    
    def __init__(self, config: RAGConfig = None):
        self.config = config or RAGConfig()
        self.embeddings = HuggingFaceEmbeddings(model_name=self.config.embedding_model)
        self.llm = openai.OpenAI()
        self.vector_store = None
        self.retriever = None
        self.reranker = Reranker() if self.config.use_rerank else None
    
    def ingest(self, documents: List[Document]):
        """文档入库"""
        # 分块
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.config.chunk_size,
            chunk_overlap=self.config.chunk_overlap
        )
        chunks = splitter.split_documents(documents)
        
        # 向量化并存储
        from langchain.vectorstores import Chroma
        self.vector_store = Chroma.from_documents(
            documents=chunks,
            embedding=self.embeddings,
            persist_directory="./rag_db"
        )
        
        print(f"✅ 已索引 {len(chunks)} 个文档块")
    
    def retrieve(self, query: str) -> List[tuple]:
        """检索相关文档"""
        # 向量检索
        docs_with_scores = self.vector_store.similarity_search_with_score(
            query, k=self.config.top_k
        )
        
        # 重排序
        if self.reranker:
            docs = [d for d, _ in docs_with_scores]
            reranked = self.reranker.rerank(query, docs, self.config.rerank_top_k)
            return reranked
        
        return docs_with_scores[:self.config.rerank_top_k]
    
    def generate(self, query: str, context: List[Document]) -> str:
        """生成回答"""
        context_text = "\n\n".join([f"[文档 {i+1}]\n{doc.page_content}" 
                                   for i, doc in enumerate(context)])
        
        prompt = f"""基于以下参考文档回答问题。如果文档中没有相关信息，请明确说明。

参考文档：
{context_text}

用户问题：{query}

请提供准确、简洁的回答："""
        
        response = self.llm.chat.completions.create(
            model=self.config.llm_model,
            messages=[
                {"role": "system", "content": "你是一个专业的知识库助手，基于提供的文档回答问题。"},
                {"role": "user", "content": prompt}
            ],
            temperature=self.config.temperature
        )
        
        return response.choices[0].message.content
    
    def query(self, question: str) -> dict:
        """完整查询流程"""
        # 检索
        retrieved = self.retrieve(question)
        
        # 生成
        context = [doc for doc, _ in retrieved]
        answer = self.generate(question, context)
        
        return {
            "question": question,
            "answer": answer,
            "sources": [
                {
                    "content": doc.page_content[:200] + "...",
                    "score": float(score),
                    "metadata": doc.metadata
                }
                for doc, score in retrieved
            ]
        }

# 使用示例
rag = RAGSystem(RAGConfig(
    embedding_model="BAAI/bge-large-zh-v1.5",
    llm_model="gpt-3.5-turbo",
    use_rerank=True
))

# 加载文档
docs = DocumentLoader.load_directory("./knowledge_base")
rag.ingest(docs)

# 查询
result = rag.query("如何配置 SSH 免密登录？")
print(result["answer"])
```

---

## 七、RAG 系统评估

### 7.1 评估指标

```python
class RAGEvaluator:
    """RAG 系统评估器"""
    
    @staticmethod
    def calculate_relevance(query: str, retrieved_docs: List[Document]) -> float:
        """计算检索相关性（需人工标注或使用 LLM 评估）"""
        # 简化版：使用向量相似度平均
        scores = [score for _, score in retrieved_docs]
        return sum(scores) / len(scores) if scores else 0
    
    @staticmethod
    def faithfulness(answer: str, context: List[Document]) -> float:
        """评估回答的事实忠实度"""
        # 使用 LLM 判断回答是否基于上下文
        prompt = f"""判断以下回答是否完全基于提供的上下文，没有添加外部信息。

上下文：
{[doc.page_content for doc in context]}

回答：{answer}

是否忠实于上下文？只回答"是"或"否"。"""
        
        response = openai.OpenAI().chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}]
        )
        return 1.0 if "是" in response.choices[0].message.content else 0.0
    
    @staticmethod
    def answer_relevance(query: str, answer: str) -> float:
        """评估回答与问题的相关性"""
        # 使用嵌入向量计算语义相似度
        embeddings = HuggingFaceEmbeddings()
        query_vec = embeddings.embed_query(query)
        answer_vec = embeddings.embed_query(answer)
        
        similarity = np.dot(query_vec, answer_vec) / (
            np.linalg.norm(query_vec) * np.linalg.norm(answer_vec)
        )
        return float(similarity)

# 评估示例
evaluator = RAGEvaluator()
test_queries = [
    {"query": "SSH 端口修改方法", "expected": "修改 /etc/ssh/sshd_config"},
    {"query": "fail2ban 配置", "expected": "/etc/fail2ban/jail.local"},
]

for test in test_queries:
    result = rag.query(test["query"])
    faith = evaluator.faithfulness(result["answer"], 
                                   [doc for doc, _ in rag.retrieve(test["query"])])
    print(f"查询: {test['query']}\n忠实度: {faith:.2f}\n")
```

### 7.2 评估数据集构建

```python
# 构建评估数据集
import json

evaluation_data = [
    {
        "question": "如何禁用 SSH root 登录？",
        "ground_truth": "在 /etc/ssh/sshd_config 中设置 PermitRootLogin no",
        "retrieval_context": ["ssh config", "root login"],
        "answer_criteria": "必须提到 PermitRootLogin 和配置文件路径"
    },
    # ... 更多测试用例
]

# 保存评估集
with open("rag_eval_dataset.json", "w", encoding="utf-8") as f:
    json.dump(evaluation_data, f, ensure_ascii=False, indent=2)
```

---

## 八、生产环境最佳实践

### 8.1 性能优化

```python
# 1. 异步处理
import asyncio
from concurrent.futures import ThreadPoolExecutor

class AsyncRAGSystem(RAGSystem):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    async def async_retrieve(self, query: str):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.executor, self.retrieve, query)

# 2. 缓存层
import redis
from functools import lru_cache

class CachedRAG(RAGSystem):
    def __init__(self, *args, redis_host="localhost", **kwargs):
        super().__init__(*args, **kwargs)
        self.cache = redis.Redis(host=redis_host, port=6379, db=0)
    
    def query(self, question: str) -> dict:
        # 检查缓存
        cache_key = f"rag:{hash(question)}"
        cached = self.cache.get(cache_key)
        if cached:
            return json.loads(cached)
        
        # 执行查询
        result = super().query(question)
        
        # 缓存结果（1小时）
        self.cache.setex(cache_key, 3600, json.dumps(result))
        return result

# 3. 批量处理
def batch_ingest(documents: List[Document], batch_size=100):
    """批量入库，减少 IO"""
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i+batch_size]
        rag.ingest(batch)
        print(f"已处理 {i+len(batch)}/{len(documents)}")
```

### 8.2 监控与日志

```python
import logging
from prometheus_client import Counter, Histogram

# 指标定义
rag_queries_total = Counter('rag_queries_total', 'Total RAG queries')
rag_latency_seconds = Histogram('rag_latency_seconds', 'RAG query latency')
rag_retrieval_score = Histogram('rag_retrieval_score', 'Retrieval relevance scores')

class MonitoredRAG(RAGSystem):
    @rag_latency_seconds.time()
    def query(self, question: str) -> dict:
        rag_queries_total.inc()
        
        start_time = time.time()
        result = super().query(question)
        latency = time.time() - start_time
        
        # 记录日志
        logging.info(f"RAG Query: {question[:50]}... | Latency: {latency:.2f}s")
        
        return result
```

### 8.3 部署架构

```yaml
# docker-compose.yml
version: '3.8'

services:
  rag-api:
    build: ./rag-service
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - EMBEDDING_MODEL=BAAI/bge-large-zh-v1.5
      - VECTOR_DB_URL=qdrant:6333
    depends_on:
      - qdrant
      - redis
    volumes:
      - ./knowledge_base:/app/data

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_storage:/qdrant/storage

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  qdrant_storage:
```

---

## 九、常见问题与解决方案

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| **检索不到相关内容** | 分块过大/过小、查询表达差异 | 调整 chunk_size、使用查询重写 |
| **回答包含幻觉** | 上下文不足、LLM 过度发挥 | 提高 top_k、添加忠实度检查 |
| **响应速度慢** | 向量检索慢、LLM 延迟 | 添加缓存、使用更快的嵌入模型 |
| **多跳推理失败** | 单轮检索无法覆盖复杂问题 | 实现多轮检索、查询分解 |
| **长文档处理差** | 超出上下文限制 | 使用 Map-Reduce、摘要链 |

---

## 十、总结

本文系统介绍了 RAG 的完整技术栈：

1. **文档处理**: 加载 → 清洗 → 分块 → 向量化
2. **存储检索**: 向量数据库选型、混合检索策略
3. **检索优化**: 查询重写、重排序、多路召回
4. **生成增强**: 上下文组装、Prompt 工程
5. **评估监控**: 相关性、忠实度、性能指标
6. **生产部署**: 异步、缓存、监控、容器化

**下一步建议**:
- 从 Chroma 开始快速原型验证
- 逐步引入混合检索和重排序优化
- 建立评估数据集持续迭代
- 生产环境迁移到 Qdrant/Milvus

---

*文章字数: 约 8000 字*  
*配套代码: 完整可运行*  
*最后更新: 2026-04-15*
