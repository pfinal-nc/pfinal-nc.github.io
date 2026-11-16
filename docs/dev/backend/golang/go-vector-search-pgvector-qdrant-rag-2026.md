---
title: Go 向量检索实战：pgvector、VectorChord、Qdrant 三方对比与 RAG 接入
date: 2026-11-17 07:30:00
author: PFinal南丞
tags:
  - golang
  - 向量数据库
  - rag
  - pgvector
  - qdrant
description: 这周向量层又热了——VectorChord 分叉、对象存储内嵌向量库、记忆层讨论接连出现，而 Go 侧的实战资料最少。本文用 2 核实测精确扫描的崩塌曲线，给出 pgvector/VectorChord 与 Qdrant 两套可直接跑的 Go 接入代码、HNSW 参数调法与六个生产踩坑。
keywords:
  - golang vector database
  - qdrant golang
  - rag in golang
  - pgvector
  - VectorChord
  - HNSW
  - 向量检索
  - Go RAG
  - 近似最近邻
  - 混合检索
---

> TL;DR：768 维、top-10 的精确扫描，在 2 核机器上 1 万条还能跑 107 QPS，到 10 万条就掉到 11 QPS，50 万条只剩 2.2 QPS——**数据量翻 10 倍，延迟涨 10 倍，这就是必须上 ANN 索引的全部理由**。本文给你两套 Go 侧可跑的接入代码（pgx + pgvector/VectorChord，net/http + Qdrant REST），以及参数怎么调、坑在哪。

## 一、背景：RAG 正在从"检索文档"转向"检索记忆"

这一周向量层的话题密度明显回来了：有人公开撰文解释为什么要自己维护一份 VectorChord 分叉（11-15），有人在 HN 上发布以对象存储为底座的嵌入式向量库 Itzma（11-16），mem0 这类"记忆层"的讨论也重新热了起来。

三个信号指向同一件事：**向量检索的战场，从"给文档建个索引"转到了"给会话建记忆"**。文档检索是一次性的批处理，记忆检索是每个用户每轮对话都要打的在线请求——对延迟、对过滤、对增量写入的要求完全是另一个量级。

而 Go 侧的现状很尴尬：生态里 Go 客户端成熟度普遍低于 Python，很多教程直接假设你用 Python 起服务、Go 只做 API 网关。这恰恰是机会——如果你的服务本身就是 Go 写的，让 Go 直接连向量库，能省掉一跳网络和一层序列化，也省掉了 Python 那套依赖地狱（onnx、torch、grpc 版本互相打架）。

## 二、先算一笔账：为什么不能"直接暴力扫"

在讲索引之前，得先知道不建索引的代价。我在 2 核 4 G 的机器上用纯 Go 做了一次精确扫描实测：768 维、top-10、向量已归一化（余弦相似度退化为点积），每次查询跑 5 遍取平均。

| 数据量 | 平均延迟 | 单查询吞吐 | 常驻内存 | 相对 1 万条 |
|---|---|---|---|---|
| 1 万 | 9.28 ms | 107.7 QPS | 29 MB | 1× |
| 10 万 | 88.09 ms | 11.4 QPS | 292 MB | 9.5× |
| 50 万 | 446.80 ms | 2.2 QPS | 1,464 MB | 48× |

```go
// 精确扫描的核心就三行：归一化、点积、排序
func normalize(v []float32) { /* 除以 L2 范数 */ }

func dot(a, b []float32) float32 {
	var s float32
	for i := range a {
		s += a[i] * b[i] // 已归一化，点积即余弦
	}
	return s
}

// 查询：对全量算分再排序，复杂度 O(N·d)
func search(q []float32, vecs [][]float32, k int) []int { /* 全量打分 + 排序取前 k */ }
```

结论很直白：**延迟随数据量线性增长，吞吐随数据量线性下跌**。而且这还只是"一个人的查询"——并发 10 个请求打进来，单核每秒要看 5 亿次浮点运算，CPU 直接饱和。这就引出了 ANN（近似最近邻）：用一点点召回率，换一到两个数量级的延迟。

## 三、三条路线：谁适合放进你的 Go 服务

| 维度 | pgvector | VectorChord | Qdrant |
|---|---|---|---|
| 部署形态 | Postgres 扩展 | Postgres 扩展（pgvector 的高性能替代） | 独立服务（Rust） |
| 索引算法 | HNSW、IVFFlat | IVF + RaBitQ 量化 | HNSW（可配量化） |
| 元数据过滤 | SQL `WHERE`，与业务表天然同库 | 同左 | payload filter，支持嵌套与 range |
| 事务一致性 | 与业务数据同事务，强一致 | 同左 | 最终一致，需自己补偿 |
| Go 接入 | pgx（成熟） | pgx（同 pgvector 协议） | REST/gRPC（自己有客户端，REST 更稳） |
| 运维成本 | 零新增组件 | 零新增组件 | 多一个服务、多一份备份 |
| 合适规模 | 百万级以内、过滤条件简单 | 千万级、内存敏感 | 千万级以上、过滤复杂 |

一句话选型：**数据本来就在 Postgres 里、且过滤条件能用 SQL 表达 → 选扩展；检索是独立于业务库的重活、过滤条件复杂 → 选 Qdrant**。VectorChord 的位置在中间：它保留了 Postgres 的运维形态，用 IVF + 量化把内存压下来，代价是召回率需要靠参数补。换句话说，它是一个"用精度换内存"的折中方案：如果你的向量表已经涨到几千万行、内存成了硬约束，而召回损失又能接受（比如配合重排序补回来），它就是最省事的那条路；如果内存不吃紧、数据量也不大，直接用 pgvector 反而更稳，因为它的行为最可预测。

## 四、路线 A：pgx + pgvector / VectorChord

Postgres 这条路最省事，因为向量和业务数据在同一张表、同一个事务里。

```sql
-- 1. 扩展与表结构
create extension if not exists vector;

create table if not exists doc_chunks (
  id          bigserial primary key,
  doc_id      bigint not null,
  lang        text   not null,
  content     text   not null,
  embedding   vector(768) not null,
  created_at  timestamptz default now()
);

-- 2. HNSW 索引：m 控制每层邻居数，ef_construction 控制建索引时的候选池
create index if not exists idx_chunks_hnsw
  on doc_chunks using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- 3. 查询：按余弦距离取最近邻，<=> 是余弦距离算子
set local hnsw.ef_search = 80;   -- 查询时候选池，越大越准越慢
select id, doc_id, content, 1 - (embedding <=> $1) as score
from doc_chunks
where lang = 'zh'
order by embedding <=> $1
limit 10;
```

Go 侧用 pgx 批量写入 + 查询，注意两点：一是向量要以字符串形式传（`[0.1,0.2,...]`），二是批量插入要控制批大小。

```go
package vector

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func vecLiteral(v []float32) string {
	var b strings.Builder
	b.WriteByte('[')
	for i, x := range v {
		if i > 0 {
			b.WriteByte(',')
		}
		fmt.Fprintf(&b, "%.6f", x) // 6 位精度足够，体积还小一半
	}
	b.WriteByte(']')
	return b.String()
}

func InsertChunks(ctx context.Context, pool *pgxpool.Pool, rows [][]any) error {
	batch := &pgx.Batch{}
	for _, r := range rows {
		batch.Queue(
			`insert into doc_chunks (doc_id, lang, content, embedding)
			 values ($1,$2,$3,$4::vector)`,
			r[0], r[1], r[2], vecLiteral(r[3].([]float32)),
		)
	}
	br := pool.SendBatch(ctx, batch)
	defer br.Close()
	for range rows {
		if _, err := br.Exec(); err != nil {
			return err
		}
	}
	return nil
}

func Search(ctx context.Context, pool *pgxpool.Pool, q []float32, lang string, k int) ([]int64, error) {
	rows, err := pool.Query(ctx,
		`select id, 1 - (embedding <=> $1::vector) as score
		 from doc_chunks where lang = $2
		 order by embedding <=> $1::vector limit $3`,
		vecLiteral(q), lang, k)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []int64
	for rows.Next() {
		var id int64
		var score float32
		if err := rows.Scan(&id, &score); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}
```

三个必须知道的细节：

1. **建索引前调大 `maintenance_work_mem`**。HNSW 建索引是内存密集型，默认 64 MB 在百万级数据上会退化成磁盘临时文件，建索引时间能差十倍。
2. **`ef_search` 是运行时旋钮**。它不写在索引定义里，而是每次会话/事务设置。默认 40 在过滤很强的查询上召回会明显掉。
3. **过滤条件 + HNSW 会把召回打穿**。`where lang='zh'` 这类低选择性过滤，HNSW 会先在全局图里找候选再过滤，候选池不够时结果变少甚至变空。pgvector 0.8 起支持迭代索引扫描来缓解，但最稳的做法是**按过滤维度分表或建部分索引**。

## 五、路线 B：Qdrant REST + Go

Qdrant 的 Go 客户端是 gRPC 的，版本耦合比较紧；如果你不想为了查个向量引入一整套 proto 依赖，**直接用 REST 反而更省心**——Qdrant 的 REST 接口稳定，用 `net/http` 就够。

```go
type Qdrant struct {
	Base string
	HTTP *http.Client
}

func (c *Qdrant) do(ctx context.Context, method, path string, body any, out any) error {
	var r io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		r = bytes.NewReader(b)
	}
	req, _ := http.NewRequestWithContext(ctx, method, c.Base+path, r)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("qdrant %s: %s", resp.StatusCode, b)
	}
	if out != nil {
		return json.NewDecoder(resp.Body).Decode(out)
	}
	return nil
}

// 建集合：768 维、余弦距离、HNSW 参数
func (c *Qdrant) Create(ctx context.Context, name string) error {
	return c.do(ctx, "PUT", "/collections/"+name, map[string]any{
		"vectors": map[string]any{"size": 768, "distance": "Cosine"},
		"hnsw_config": map[string]any{"m": 16, "ef_construct": 100},
	}, nil)
}

// 给 payload 字段建索引，否则过滤会走全表扫
func (c *Qdrant) IndexField(ctx context.Context, name, field, schema string) error {
	return c.do(ctx, "PUT", "/collections/"+name+"/index", map[string]any{
		"field_name": field, "field_schema": schema,
	}, nil)
}

// 带过滤的检索
func (c *Qdrant) Query(ctx context.Context, name string, vec []float32, lang string, k int) ([]uint64, error) {
	var out struct {
		Result struct {
			Points []struct {
				ID uint64 `json:"id"`
			} `json:"points"`
		} `json:"result"`
	}
	err := c.do(ctx, "POST", "/collections/"+name+"/points/query", map[string]any{
		"query": vec,
		"filter": map[string]any{
			"must": []any{map[string]any{"key": "lang", "match": map[string]any{"value": lang}}},
		},
		"limit": k, "with_payload": false,
	}, &out)
	if err != nil {
		return nil, err
	}
	ids := make([]uint64, 0, len(out.Result.Points))
	for _, p := range out.Result.Points {
		ids = append(ids, p.ID)
	}
	return ids, nil
}
```

### 5.1 Go 侧连接与超时：比参数更容易翻车的地方

向量检索的延迟分布是长尾的：平时 20 ms，遇到大候选集或 GC 抖动能到 300 ms。Go 服务里如果没有超时和重试，一个慢查询就能把整个 goroutine 池拖住。

```go
// 查询必须带超时；重试只对幂等查询做，且要限次
ctx, cancel := context.WithTimeout(r.Context(), 120*time.Millisecond)
defer cancel()

ids, err := Search(ctx, pool, q, "zh", 10)
if errors.Is(err, context.DeadlineExceeded) {
    // 降级：退回更小的 ef_search 或返回缓存结果
    ids, err = SearchFallback(r.Context(), pool, q, "zh", 10)
}
```

另外两个配置项容易被忽略：`pgxpool` 的 `MaxConns` 建议按 `核数*2 + 磁盘数` 起步，`MaxConnLifetime` 设 30 分钟，避免连接被中间件静默掐断后复用报错。Qdrant 侧则要给 `http.Client` 配 `Transport.MaxIdleConnsPerHost`，默认的 2 在高并发下会频繁建连。

三个关键点：

1. **`payload` 的过滤字段必须先建索引**（`/index` 接口，schema 用 `keyword`/`integer`），否则 Qdrant 会在候选集上做后过滤，延迟和召回都会变差。
2. **`ef_construct` 与 `m` 在建集合时就定下来**，事后改需要重建集合；把 `m` 调大能提升召回，代价是内存和建索引时间。
3. **混合检索（dense + sparse）用 `prefetch`**：把关键词检索和向量检索各自取候选，再用 RRF 融合，比单一向量的召回高不少，适合中文场景。

## 六、参数怎么调：别背文档，测自己的数据

HNSW 的调参其实只有三个旋钮，但每个都有明确的取舍：

| 参数 | 位置 | 调大后的效果 | 建议起点 |
|---|---|---|---|
| `m` | 建索引 | 召回↑、内存↑、建索引变慢 | 16（默认），高召回场景 32 |
| `ef_construction` | 建索引 | 图质量↑、建索引明显变慢 | 64–200 |
| `ef_search` / `ef` | 查询 | 召回↑、延迟线性上升 | 从 40 起，按 P99 调 |

调参不能靠感觉，得有个能同时测"召回"和"延迟"的小工具。思路很简单：用精确扫描的结果当标准答案，再看索引返回的 top-k 命中率。

```go
// recall@k：索引结果与精确结果的交集比例
func RecallAtK(exact, approx []int64) float64 {
	set := make(map[int64]struct{}, len(approx))
	for _, id := range approx {
		set[id] = struct{}{}
	}
	var hit int
	for _, id := range exact {
		if _, ok := set[id]; ok {
			hit++
		}
	}
	if len(exact) == 0 {
		return 1
	}
	return float64(hit) / float64(len(exact))
}
```

工程上的经验值：**RAG 场景 recall@10 ≥ 0.95、P99 延迟 < 100 ms** 是个合理目标。压测方法也有讲究。固定一批真实查询（推荐从线上日志里抽 200 条），先用精确扫描算出标准答案，再对每个 `ef_search` 取值跑一遍，记录召回率与 P99。只看平均延迟没有意义——ANN 的尾延迟往往是最差的那 1%，而 RAG 的用户体验恰恰由尾延迟决定。如果 `ef_search` 加到 200 召回还上不去，说明数据本身的向量质量有问题（切分粒度、归一化、embedding 模型不对），这时候继续调参数是白费力气。

## 七、六个生产环境的坑

| 坑 | 表现 | 对策 |
|---|---|---|
| 维度不匹配 | 建表 `vector(768)` 但模型吐 1024 维，插入报错 | 维度写进配置，启动时校验一次 |
| 忘记归一化 | 余弦距离结果飘忽，召回莫名偏低 | 入库和查询统一归一化，或统一用 L2 |
| 过滤把索引打穿 | 加 `where` 后结果变少甚至为空 | 建部分索引 / 分表 / 用迭代扫描 |
| 批量 upsert 过大 | 单次请求体 50 MB，网关 413 | 每批 200–500 条，按字节数截断 |
| 连接池打满 | 高峰期 `pool timeout` | pgxpool 按核数 ×2 配，查设 3 s 超时 |
| 内存被悄悄吃掉 | 向量常驻内存 1.4 G/50 万条 | 用 gopsutil 观测 RSS，量化索引压内存 |

最后两条值得展开。**内存**：向量是内存怪物。50 万条 768 维 float32 就是 1.4 GB，还不算索引结构本身。这也是量化索引存在的意义——把 float32 压成 int8 甚至二值，内存能降一个数量级，召回损失通常只有几个点。Qdrant 的标量量化、VectorChord 的 RaBitQ 都是这个思路。

**向量质量**：召回率上不去时，先怀疑数据而不是索引。常见三种病：切分粒度太细（一句话一个 chunk，语义碎片化）、query 与 document 用了不同的 embedding 模型（空间错位，距离失去意义）、中英文混排未做统一处理。这三种情况无论把 `ef_search` 调到多大都救不回来，因为**索引只能在给定向量空间里找最近邻，它不负责让这个空间变得有意义**。

## 八、结论

- 数据量到 10 万条就别再做精确扫描了，实测吞吐会掉到 11 QPS；
- Go 服务里接向量库，**pgvector 走 pgx、Qdrant 走 REST**，这两条路最少依赖、最不容易被版本卡住；
- 调参的唯一可信依据是你自己的召回率曲线，别信任何"开箱即用"的默认值；
- 过滤条件比索引算法更容易出问题，先想清楚过滤维度，再决定用哪个产品；
- 最后记住一点：索引只负责"在同一条曲线上的取舍"，向量质量才是天花板。

同方向的延伸：[Go 1.27 的 encoding/json/v2 迁移](/dev/backend/golang/go-1-27-encoding-json-v2-migration-2026) 正好能优化向量服务里最耗 CPU 的序列化环节；RAG 整体架构见 [Agentic RAG 架构](/ai/agentic-rag-architecture-2026)；数据库侧的加固思路见 [PostgreSQL 安全最佳实践](/dev/system/database/PostgreSQL-Security-Best-Practices-2025)。

## 参考资料

- [pgvector: HNSW 索引与参数说明](https://github.com/pgvector/pgvector) — 官方仓库，含 `m`/`ef_construction`/`ef_search` 与过滤行为
- [Qdrant Docs: Collections 与 HNSW 配置](https://qdrant.tech/documentation/concepts/collections/) — `hnsw_config` 字段定义
- [Qdrant Docs: Filtering 与 Payload Index](https://qdrant.tech/documentation/concepts/filtering/) — 过滤字段必须建索引的原因
- [Qdrant Docs: Hybrid Queries 与 RRF](https://qdrant.tech/documentation/concepts/hybrid-queries/) — prefetch 融合写法
- [Why I'm Maintaining a VectorChord Fork](https://vonng.com/en/pg/maintain-vchord/) — 2026-11-15 的社区讨论（分叉维护动因）
- [Itzma: an embedded vector database backed by object storage](https://github.com/sergiommarcial/itzma) — 2026-11-16 的项目发布
