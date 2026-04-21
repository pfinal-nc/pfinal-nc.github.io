---
title: "向量数据库实战：从 Embedding 到 RAG 应用"
date: 2026-04-21 10:00:00
author: PFinal南丞
description: "深入讲解向量数据库原理、Embedding 技术、相似度搜索算法，以及基于向量数据库的 RAG 系统构建实战"
keywords:
  - 向量数据库
  - Vector Database
  - Embedding
  - RAG
  - 相似度搜索
  - Chroma
  - Milvus
  - Pinecone
tags:
  - ai
  - vector-database
  - embedding
  - rag
  - llm
---

# 向量数据库实战：从 Embedding 到 RAG 应用

在大模型时代，向量数据库成为连接非结构化数据与 AI 的关键基础设施。它让机器能够"理解"文本、图像、音频的语义，实现真正的智能检索。

## 为什么需要向量数据库？

### 传统数据库的局限

```
传统数据库：精确匹配
- "苹果" ≠ "Apple" ≠ "apple"
- "机器学习" 找不到 "深度学习"
- 无法理解语义相似性

向量数据库：语义匹配
- "苹果" ≈ "Apple" ≈ "水果"
- "机器学习" ≈ "深度学习" ≈ "AI"
- 基于语义相似度搜索
```

### 核心应用场景

| 场景 | 说明 |
|------|------|
| **RAG 检索增强** | 为大模型提供外部知识库 |
| **语义搜索** | 理解用户意图的智能搜索 |
| **推荐系统** | 基于内容相似度的推荐 |
| **图像检索** | 以图搜图、相似图片查找 |
| **异常检测** | 识别与正常模式偏离的数据 |

## Embedding 技术基础

### 什么是 Embedding？

Embedding 是将高维离散数据（文本、图像）映射到低维连续向量空间的技术。语义相近的数据在向量空间中距离更近。

```
文本 → Embedding 模型 → 向量

"机器学习" → [0.12, -0.34, 0.56, ..., 0.89]  (1536维)
"深度学习" → [0.15, -0.31, 0.52, ..., 0.85]  (相似度高)
"苹果"     → [0.88, 0.23, -0.12, ..., 0.34]  (相似度低)
```

### 主流 Embedding 模型

```python
# OpenAI Embedding
from openai import OpenAI

client = OpenAI()

def get_embedding(text, model="text-embedding-3-small"):
    response = client.embeddings.create(
        input=text,
        model=model
    )
    return response.data[0].embedding

# 使用示例
text = "机器学习是人工智能的一个分支"
embedding = get_embedding(text)
print(f"维度: {len(embedding)}")  # 1536
print(f"前5个值: {embedding[:5]}")
```

```python
# 开源 Embedding 模型 (Sentence-Transformers)
from sentence_transformers import SentenceTransformer

# 加载模型
model = SentenceTransformer('BAAI/bge-large-zh-v1.5')

# 编码文本
texts = [
    "机器学习是人工智能的核心技术",
    "深度学习是机器学习的一个子集",
    "苹果是一种美味的水果"
]

embeddings = model.encode(texts)

# 计算相似度
from sklearn.metrics.pairwise import cosine_similarity

similarity_matrix = cosine_similarity(embeddings)
print("相似度矩阵:")
print(similarity_matrix)
```

### 多模态 Embedding

```python
# CLIP - 图文对齐模型
import torch
import clip
from PIL import Image

# 加载模型
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

# 处理图像
image = preprocess(Image.open("cat.jpg")).unsqueeze(0).to(device)

# 处理文本
texts = ["a cat", "a dog", "a car"]
text_tokens = clip.tokenize(texts).to(device)

# 获取 Embedding
with torch.no_grad():
    image_features = model.encode_image(image)
    text_features = model.encode_text(text_tokens)
    
    # 计算相似度
    logits_per_image, _ = model(image, text_tokens)
    probs = logits_per_image.softmax(dim=-1).cpu().numpy()

print("图文匹配概率:", probs)
```

## 相似度搜索算法

### 1. 暴力搜索 (Flat Index)

```python
import numpy as np
from scipy.spatial.distance import cosine

class FlatIndex:
    def __init__(self, dimension):
        self.dimension = dimension
        self.vectors = []
        self.metadata = []
    
    def add(self, vector, metadata=None):
        self.vectors.append(vector)
        self.metadata.append(metadata)
    
    def search(self, query_vector, top_k=5):
        """暴力搜索 - 计算与所有向量的距离"""
        distances = []
        
        for i, vector in enumerate(self.vectors):
            # 余弦相似度
            similarity = 1 - cosine(query_vector, vector)
            distances.append((i, similarity))
        
        # 按相似度排序
        distances.sort(key=lambda x: x[1], reverse=True)
        
        results = []
        for i, score in distances[:top_k]:
            results.append({
                'id': i,
                'score': score,
                'metadata': self.metadata[i]
            })
        
        return results

# 使用示例
index = FlatIndex(dimension=384)

# 添加数据
for i, text in enumerate(corpus):
    embedding = model.encode(text)
    index.add(embedding, {'text': text, 'id': i})

# 搜索
query = "什么是深度学习？"
query_embedding = model.encode(query)
results = index.search(query_embedding, top_k=3)

for r in results:
    print(f"Score: {r['score']:.4f}, Text: {r['metadata']['text']}")
```

### 2. HNSW (Hierarchical Navigable Small World)

```python
import hnswlib

class HNSWIndex:
    def __init__(self, dimension, max_elements=10000, ef_construction=200, M=16):
        self.dimension = dimension
        self.index = hnswlib.Index(space='cosine', dim=dimension)
        self.index.init_index(
            max_elements=max_elements,
            ef_construction=ef_construction,
            M=M
        )
        self.metadata = []
        self.current_id = 0
    
    def add(self, vector, metadata=None):
        self.index.add_items(vector, self.current_id)
        self.metadata.append(metadata)
        self.current_id += 1
    
    def search(self, query_vector, top_k=5):
        labels, distances = self.index.knn_query(query_vector, k=top_k)
        
        results = []
        for label, distance in zip(labels[0], distances[0]):
            results.append({
                'id': label,
                'score': 1 - distance,  # 转换为相似度
                'metadata': self.metadata[label]
            })
        
        return results

# 使用示例
index = HNSWIndex(dimension=384)

# 批量添加
embeddings = model.encode(corpus)
for i, (emb, text) in enumerate(zip(embeddings, corpus)):
    index.add(emb, {'text': text})

# 搜索
results = index.search(query_embedding, top_k=5)
```

### 3. IVF (Inverted File Index)

```python
import faiss

class IVFIndex:
    def __init__(self, dimension, nlist=100):
        self.dimension = dimension
        self.nlist = nlist
        
        # 量化器
        quantizer = faiss.IndexFlatIP(dimension)
        
        # IVF 索引
        self.index = faiss.IndexIVFFlat(
            quantizer, 
            dimension, 
            nlist,
            faiss.METRIC_INNER_PRODUCT
        )
        self.metadata = []
    
    def add(self, vectors, metadata_list):
        """需要训练后添加"""
        if not self.index.is_trained:
            self.index.train(vectors)
        
        self.index.add(vectors)
        self.metadata.extend(metadata_list)
    
    def search(self, query_vector, top_k=5, nprobe=10):
        """nprobe: 搜索的聚类中心数"""
        self.index.nprobe = nprobe
        
        scores, indices = self.index.search(
            query_vector.reshape(1, -1), 
            top_k
        )
        
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx != -1:
                results.append({
                    'id': idx,
                    'score': score,
                    'metadata': self.metadata[idx]
                })
        
        return results
```

## 向量数据库选型

### 1. Chroma - 轻量级本地数据库

```python
import chromadb
from chromadb.config import Settings

# 创建客户端
client = chromadb.Client(Settings(
    chroma_db_impl="duckdb+parquet",
    persist_directory="./chroma_db"
))

# 创建集合
collection = client.create_collection(
    name="documents",
    metadata={"hnsw:space": "cosine"}
)

# 添加文档
documents = [
    "机器学习是人工智能的一个分支",
    "深度学习使用神经网络进行学习",
    "自然语言处理让计算机理解人类语言",
    "计算机视觉用于图像识别和分析"
]

metadatas = [
    {"source": "ml-intro", "category": "ai"},
    {"source": "dl-guide", "category": "ai"},
    {"source": "nlp-book", "category": "nlp"},
    {"source": "cv-tutorial", "category": "cv"}
]

ids = [f"doc_{i}" for i in range(len(documents))]

# 自动使用默认 embedding 或指定
from chromadb.utils import embedding_functions

ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="BAAI/bge-large-zh-v1.5"
)

collection.add(
    documents=documents,
    metadatas=metadatas,
    ids=ids,
    embedding_function=ef
)

# 查询
results = collection.query(
    query_texts=["神经网络如何工作？"],
    n_results=2,
    where={"category": "ai"}  # 元数据过滤
)

for doc, metadata, distance in zip(
    results['documents'][0],
    results['metadatas'][0],
    results['distances'][0]
):
    print(f"文档: {doc}")
    print(f"元数据: {metadata}")
    print(f"距离: {distance}")
```

### 2. Milvus - 企业级分布式向量数据库

```python
from pymilvus import connections, FieldSchema, CollectionSchema, DataType, Collection

# 连接 Milvus
connections.connect("default", host="localhost", port="19530")

# 定义字段
fields = [
    FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
    FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=65535),
    FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=384),
    FieldSchema(name="category", dtype=DataType.VARCHAR, max_length=64)
]

# 创建集合
schema = CollectionSchema(fields, "文档集合")
collection = Collection("documents", schema)

# 创建索引
index_params = {
    "metric_type": "COSINE",
    "index_type": "HNSW",
    "params": {"M": 16, "efConstruction": 200}
}
collection.create_index(field_name="embedding", index_params=index_params)

# 插入数据
import random

entities = [
    [f"文档内容 {i}" for i in range(100)],  # text
    [[random.random() for _ in range(384)] for _ in range(100)],  # embedding
    ["tech" if i % 2 == 0 else "science" for i in range(100)]  # category
]

insert_result = collection.insert(entities)
collection.flush()

# 加载集合并搜索
collection.load()

search_params = {
    "metric_type": "COSINE",
    "params": {"ef": 64}
}

results = collection.search(
    data=[[random.random() for _ in range(384)]],
    anns_field="embedding",
    param=search_params,
    limit=5,
    expr='category == "tech"',  # 过滤条件
    output_fields=["text", "category"]
)

for result in results:
    for hit in result:
        print(f"ID: {hit.id}, Score: {hit.score}, Text: {hit.entity.get('text')}")
```

### 3. Weaviate - 语义搜索引擎

```python
import weaviate

# 连接 Weaviate
client = weaviate.Client("http://localhost:8080")

# 定义 Schema
schema = {
    "class": "Document",
    "vectorizer": "text2vec-transformers",
    "moduleConfig": {
        "text2vec-transformers": {
            "vectorizeClassName": False
        }
    },
    "properties": [
        {
            "name": "title",
            "dataType": ["text"],
            "moduleConfig": {
                "text2vec-transformers": {"skip": False, "vectorizePropertyName": False}
            }
        },
        {
            "name": "content",
            "dataType": ["text"]
        },
        {
            "name": "category",
            "dataType": ["text"],
            "moduleConfig": {
                "text2vec-transformers": {"skip": True}  # 不向量化
            }
        }
    ]
}

# 创建 Class
client.schema.create_class(schema)

# 添加对象
data_obj = {
    "title": "机器学习入门",
    "content": "机器学习是人工智能的核心技术之一...",
    "category": "AI"
}

client.data_object.create(data_obj, "Document")

# 语义搜索
result = (
    client.query
    .get("Document", ["title", "content", "category"])
    .with_near_text({"concepts": ["神经网络"]})  # 语义搜索
    .with_limit(5)
    .do()
)

print(result)

# 混合搜索（BM25 + 向量）
result = (
    client.query
    .get("Document", ["title", "content"])
    .with_hybrid(query="深度学习", alpha=0.5)  # alpha=0 纯BM25, alpha=1 纯向量
    .with_limit(5)
    .do()
)
```

## RAG 系统实战

### 完整 RAG Pipeline

```python
from typing import List, Dict
import openai
import chromadb
from langchain.text_splitter import RecursiveCharacterTextSplitter

class RAGSystem:
    def __init__(self, collection_name="rag_docs"):
        # 初始化 Chroma
        self.client = chromadb.Client()
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )
        
        # 文本分割器
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            separators=["\n\n", "\n", "。", "，", " ", ""]
        )
        
        # OpenAI 客户端
        self.openai_client = openai.OpenAI()
    
    def add_documents(self, documents: List[Dict[str, str]]):
        """添加文档到知识库"""
        all_chunks = []
        all_metadatas = []
        all_ids = []
        
        for doc_idx, doc in enumerate(documents):
            # 分割文档
            chunks = self.text_splitter.split_text(doc['content'])
            
            for chunk_idx, chunk in enumerate(chunks):
                all_chunks.append(chunk)
                all_metadatas.append({
                    'source': doc.get('source', f'doc_{doc_idx}'),
                    'title': doc.get('title', ''),
                    'chunk_index': chunk_idx,
                    'total_chunks': len(chunks)
                })
                all_ids.append(f"{doc_idx}_{chunk_idx}")
        
        # 生成 embeddings 并存储
        embeddings = self._get_embeddings(all_chunks)
        
        self.collection.add(
            embeddings=embeddings,
            documents=all_chunks,
            metadatas=all_metadatas,
            ids=all_ids
        )
        
        print(f"添加了 {len(all_chunks)} 个文档块")
    
    def _get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """获取文本的 embedding"""
        response = self.openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=texts
        )
        return [item.embedding for item in response.data]
    
    def query(self, question: str, top_k: int = 5) -> Dict:
        """RAG 查询"""
        # 1. 检索相关文档
        query_embedding = self._get_embeddings([question])[0]
        
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )
        
        # 2. 构建上下文
        contexts = []
        for doc, metadata, distance in zip(
            results['documents'][0],
            results['metadatas'][0],
            results['distances'][0]
        ):
            contexts.append({
                'content': doc,
                'source': metadata['source'],
                'relevance': 1 - distance
            })
        
        # 3. 生成回答
        answer = self._generate_answer(question, contexts)
        
        return {
            'question': question,
            'answer': answer,
            'sources': contexts
        }
    
    def _generate_answer(self, question: str, contexts: List[Dict]) -> str:
        """使用 LLM 生成回答"""
        # 构建提示
        context_text = "\n\n".join([
            f"[相关度: {c['relevance']:.2f}] {c['content']}"
            for c in contexts
        ])
        
        prompt = f"""基于以下参考信息回答问题。如果参考信息不足以回答问题，请明确说明。

参考信息：
{context_text}

问题：{question}

请提供准确、简洁的回答，并注明信息来源。"""
        
        # 调用 LLM
        response = self.openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "你是一个专业的问答助手，基于提供的参考资料回答问题。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        
        return response.choices[0].message.content

# 使用示例
rag = RAGSystem()

# 添加文档
documents = [
    {
        'title': 'Go 语言简介',
        'content': 'Go 语言是由 Google 开发的开源编程语言...',
        'source': 'go-intro.md'
    },
    {
        'title': 'Go 并发编程',
        'content': 'Go 语言通过 goroutine 和 channel 实现并发...',
        'source': 'go-concurrency.md'
    }
]

rag.add_documents(documents)

# 查询
result = rag.query("Go 语言如何实现并发？")
print(f"问题: {result['question']}")
print(f"回答: {result['answer']}")
print("\n参考来源:")
for source in result['sources']:
    print(f"  - {source['source']} (相关度: {source['relevance']:.2f})")
```

## 性能优化

### 1. 索引优化

```python
# HNSW 参数调优
# M: 每个节点的连接数，越大精度越高，内存占用越大
# ef_construction: 构建时的搜索范围
# ef: 查询时的搜索范围

index = hnswlib.Index(space='cosine', dim=384)
index.init_index(
    max_elements=1000000,
    ef_construction=400,  # 高精度
    M=64  # 高连通性
)

# 查询时调整 ef
index.set_ef(200)  # 越大精度越高，速度越慢
```

### 2. 量化压缩

```python
import faiss

# PQ (Product Quantization) 压缩
# 将向量压缩到 1/10 大小，精度损失 < 5%
d = 384
m = 32  # 子向量数
dim_per_subvector = d // m

pq_index = faiss.IndexPQ(d, m, 8)  # 8 bits per subvector
pq_index.train(training_vectors)
pq_index.add(vectors_to_index)
```

### 3. 分片与分布式

```python
# Milvus 分片策略
from pymilvus import utility

# 创建分区
collection.create_partition("2024_Q1")
collection.create_partition("2024_Q2")

# 按时间分片插入
collection.insert(data, partition_name="2024_Q1")

# 分区搜索
results = collection.search(
    data=[query_vector],
    partition_names=["2024_Q1"],  # 只搜索指定分区
    limit=10
)
```

## 最佳实践总结

1. **Embedding 选择**：根据语言和场景选择合适的模型
2. **索引算法**：数据量 < 10万用 Flat，> 10万用 HNSW
3. **分块策略**：文档分块时保持语义完整性
4. **元数据过滤**：结合标量过滤减少搜索空间
5. **混合搜索**：向量 + 关键词，兼顾语义和精确匹配
6. **监控指标**：延迟、召回率、索引构建时间

## 总结

通过本文的实战示例，你已经掌握了：

- Embedding 技术原理与实现
- 相似度搜索算法（Flat、HNSW、IVF）
- 主流向量数据库的使用（Chroma、Milvus、Weaviate）
- 完整 RAG 系统的构建
- 性能优化策略

向量数据库是 AI 应用的基础设施，建议根据数据规模和查询需求选择合适的产品。

---

**参考资源：**
- [Chroma 文档](https://docs.trychroma.com/)
- [Milvus 文档](https://milvus.io/docs)
- [Weaviate 文档](https://weaviate.io/developers/weaviate)
- [MTEB Leaderboard](https://huggingface.co/spaces/mteb/leaderboard)
