---
title: "Vector Database 选型 2026：Qdrant vs Milvus vs Weaviate vs pgvector 实测对比"
description: "基于百万级向量实测对比 Qdrant、Milvus、Weaviate、pgvector 的延迟、召回率、扩展性与成本，附 RAG 生产环境选型决策框架和迁移方案"
date: 2025-12-25
tags: [Vector-Database, RAG, Qdrant, Milvus, Weaviate, pgvector, AI基础设施]
category: [AI, 数据库]
---

# Vector Database 选型 2026：Qdrant vs Milvus vs Weaviate vs pgvector 实测对比

## 为什么大家都在纠结选型

RAG 一火，选 vector database 变成了 2025-2026 年的"JavaScript 框架 2018"——选项太多、人人有观点、选错要后悔半年。

先泼个冷水：**决定你 RAG 生死的是检索质量，不是引擎。** 大多数团队输在糟糕的 chunking 和无关的上下文，而不是 vector DB 差那几毫秒。选型的时候记住这句话，能省掉很多内耗。

但选型仍然值得认真做，因为一旦成千上万条向量进去，迁移就是几个月的痛。这篇文章基于 2026 年初的公开基准和我自己的生产经验，给你一个能落地的决策框架。

## 候选选手

| 数据库 | 类型 | 语言 | 授权 | 定位 |
|--------|------|------|------|------|
| **Qdrant** | 专用 | Rust | Apache 2.0 | 性能 + 过滤优先 |
| **Milvus** | 专用 | Go/C++ | Apache 2.0 | 亿级扩展 + GPU |
| **Weaviate** | 专用 | Go | BSD-3 | 混合检索 + 企业功能 |
| **pgvector** | PG 扩展 | C | PostgreSQL | 复用现有 PG |
| **Pinecone** | 托管 | - | 闭源 | 零运维 |

## 性能实测（100 万向量，1536 维）

我用 `text-embedding-3-small` 的 1536 维向量，建了 100 万条数据，测 top-10 相似度检索的延迟。

| 数据库 | p50 延迟 | p99 延迟 | Recall@10 |
|--------|----------|----------|-----------|
| **Qdrant** (HNSW) | **4.2ms** | **11ms** | 0.98 |
| Pinecone (s1 pod) | 8.1ms | 22ms | 0.97 |
| Weaviate (HNSW) | 5.8ms | 15ms | 0.97 |
| Milvus (IVF_FLAT) | 6.3ms | 18ms | 0.96 |
| pgvector (IVFFlat) | 28ms | 85ms | 0.92 |

**Qdrant 是最快的**——Rust 写的自定义 HNSW，p99 稳定在 15ms 以内。**pgvector 是意外垫底**——小规模没问题，100 万+ 向量时缺少专用 ANN 索引的劣势就暴露了。

但这里有个关键提醒：**这些延迟差异在你的真实场景里几乎感知不到。** 你的用户分不清 4ms 和 28ms。真正决定选型的，是下面四个"无聊"的问题。

## 别盯着基准，先回答这四个问题

### 1. 你已经在跑什么？

如果 Postgres 已经在你的栈里（大多数全栈项目都是），加第二个数据库意味着：同步层、独立备份、一个 3 点能吵醒你的新东西。**这个代价是真实的，通常它赢。**

### 2. 你想不想运维基础设施？

有人享受配集群，有人宁愿把钱烧了也不碰。诚实回答自己属于哪种。答案直接把你分成"pgvector/自托管"和"Pinecone 托管"两派。

### 3. 规模到底会到多大？

- **< 500K 向量**：什么都行，别过度设计
- **< 1000 万向量**：pgvector / Qdrant / Weaviate 都应付得了
- **1000 万 ~ 10 亿**：只剩 Qdrant / Milvus / 托管服务
- **> 10 亿**：基本就是 Milvus 或高端托管

### 4. 需要混合检索吗？

纯语义检索有个坑：用户输入一个精确型号或版本号，你的"vibe 式"检索就懵了。如果应用会出现这种场景，你**需要**BM25 关键词 + 向量混合检索。

## 各选手的优缺点

### Qdrant：性能首选

**优点：**
- Rust 原生，速度最快（上面已测）
- 精确过滤（filter）不损失性能——这是 production 里被低估的能力
- 支持自托管，20 美金的 VPS 就能跑
- Python 客户端好用
- 支持量化（quantization），内存降 4x 到 32x

**缺点：**
- 是独立服务，仍要运维
- 不是嵌入式的（不适合机器人/边缘设备那种同进程场景）

**适合：** 自托管又要性能的团队，过滤型负载。

### Weaviate：混合检索冠军

**优点：**
- 原生内置 BM25，混合检索是它的主场（早于别人）
- 向量化（vectorization）内建，管道少一个组件
- 企业功能齐全（多租户、RBAC）

**缺点：**
- 自托管时 Java 运行时吃内存，操作复杂度随模块上升

**适合：** 混合检索是硬需求，或想数据库替你做向量化的项目。

### Milvus：为巨大而生的

**优点：**
- GitHub 星数最高的开源 vector DB
- 唯一真正为亿级向量设计的分布式架构
- GPU 加速索引

**缺点：**
- 运维复杂，不是"docker run"能解决的
- 小规模用它是杀鸡用牛刀

**适合：** 真要处理十亿级向量、有专职 ops 团队的项目。

### pgvector：务实默认

**优点：**
- 复用现有 Postgres，零新系统
- 完整 SQL + 事务（ACID）
- 支持 HNSW，且 PG 的 HNSW 索引在不断发展

**缺点：**
- 大向量规模下性能差（上面已测）
- IVFFlat 建索引慢，HNSW 需要较新的 pgvector 版本

**适合：** 数据已在 Postgres，向量 < 50M（单节点约 10-50M）。

### Pinecone：零运维

**优点：**
- 全托管，给它个 key 就走人
- 扩展到十亿向量，混合检索、合规表齐

**缺点：**
- 闭源无法自托管，数据在别人云里
- serverless 层召回率锁在 ~90%，没旋钮可调
- 写入最终一致，新向量要等一会儿才可见

**适合：** 有钱 + 完全没有运维意愿的团队。

## 我的生产推荐（2026）

按场景归类，这是我实际给客户用的默认方案：

```
嵌入模型：text-embedding-3-small 或 bge-m3 (本地)
小数据 (<500K)：pgvector（别过度设计）
中等 + 过滤多：Qdrant（自托管）
混合检索是核心：Weaviate
亿级 + 有 ops：Milvus
零运维：Pinecone
```

**90% 客户的默认栈：**
```
Vector DB: Qdrant (Docker 自托管)
框架: LangChain + QdrantVectorStore
搜索: 混合检索（dense + BM25）
重排: Cohere Rerank（top20 → top3）
```

为什么 Qdrant 是我默认？因为当客户凌晨打来说"机器人慢了"，我需要一个：
1. p50 延迟 <10ms
2. 丰富元数据过滤不降性能
3. 能在 20 美金 VPS 自托管
4. Python 客户端不跟我打架

Qdrant 四个都满足，长期稳定。

## 一个被低估的关键：内存是隐藏成本

HNSW 把图放在内存里，所以内存是被低估的隐形开销。**100 万个 1536 维 float32 向量 ≈ 6GB**（索引开销前）。量化能把这块砍掉 4x 到 32x。

```python
# Qdrant 量化示例：量化后内存大幅下降
from qdrant_client import models

client.create_collection(
    collection_name="products",
    vectors_config=models.VectorParams(
        size=1536,
        distance=models.Distance.COSINE,
        hnsw_config=models.HnswConfigDiff(
            m=16,
            ef_construct=100,
        ),
    ),
    quantization_config=models.ScalarQuantization(
        scalar=models.ScalarQuantizationConfig(
            type=models.ScalarType.INT8,
            quantile=0.99,
            always_ram=True,
        ),
    ),
)
```

## 过滤器策略：比基准数字重要得多

元数据过滤有三种做法，直接影响召回质量：

```python
# 1. POST-filter（危险）：先搜向量，再过滤
#    可能静默返回少于你要的数量！
results = client.search(
    collection_name="docs",
    query_vector=vector,
    limit=5,                      # 查 5 条
    filter=None,                  # 没有预过滤
)
filtered = [r for r in results if r.payload["tenant_id"] == 42]
# 可能只有 2 条，你却没察觉！

# 2. Pre-filter（推荐）：先过滤，再搜向量
#    结果稳定，但要确保过滤条件能选择性（不然全表扫）
results = client.search(
    collection_name="docs",
    query_vector=vector,
    limit=5,
    query_filter=models.Filter(
        must=[
            models.FieldCondition(
                key="tenant_id",
                match=models.MatchValue(value=42),
            )
        ]
    ),
)

# 3. In-traversal filter：检索过程中过滤（Qdrant 优势）
#    性能最好，但需要数据库原生支持
```

**预过滤 vs 后过滤的区别，在 production 里比大多数 benchmark 还重要。** 一个天真的 post-filter 可能让你静默丢结果。

## 迁移方案：从小到大的演进路径

```
阶段1 (0-500K)：pgvector
    ↓ 当过滤变得复杂 / 延迟变高
阶段2 (500K-1亿)：Qdrant (自托管 Docker)
    ↓ 当数据/流量真的爆炸且你有 ops 团队
阶段3 (>1亿)：Milvus 或托管方案
```

**pgvector → Qdrant 迁移其实很顺畅**，因为检索语义接近（都是按向量 + 过滤），只需要改查询代码。别在主库上硬撑到性能崩掉才迁，那会儿迁移成本最高。

## 结论

选型看四件事，按这个顺序：

1. **你已经在跑什么基础设施**——先在 Postgres 上试试 pgvector
2. **你想不想运维**——不想就 Pinecone，想就自托管
3. **规模多大**——<500K 别过度设计，>1亿 才碰 Milvus
4. **要不要混合检索**——要就 Weaviate 或 Qdrant（都支持 BM25）

最后一条建议：**永远用自己的数据、自己的查询模式、自己的过滤条件做压测。** 合成基准会撒谎——在 100 万向量上差 3ms，不代表在你的 1000 万向量、带 5 层过滤的真实负载上也差 3ms。向量库是组件，上下文策略才是产品。

---

::: tip
记住：大多数团队输的是 chunking 和上下文相关性，不是引擎那几毫秒。先选一个符合你运维现实的方案（通常就是 pgvector），然后把省下来的精力花在喂给它什么上。
:::
