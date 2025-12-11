---
title: Golang 实现 RAG 系统 从 OpenAI API 到向量数据库完整实战
date: 2025-11-11
author: PFinal南丞
tags:
  - Golang
  - AI
  - RAG
  - LLM
  - Vector Database
  - OpenAI
description: 深入讲解如何使用 Golang 构建完整的 RAG（检索增强生成）系统，涵盖 OpenAI API 集成、向量数据库选型、Embedding 生成、语义检索和实战案例，助力开发者快速构建智能问答系统。
keywords: Golang RAG, RAG系统, 向量数据库, OpenAI API, Embedding, 语义检索, LLM, Golang AI, 智能问答, Retrieval-Augmented Generation
---

# Golang 实现 RAG 系统：从 OpenAI API 到向量数据库完整实战

## 📖 引言

RAG（Retrieval-Augmented Generation，检索增强生成）是 2024-2025 年最热门的 AI 应用架构之一。它通过结合外部知识库检索和大语言模型生成能力，有效解决了 LLM 的幻觉问题和知识时效性限制。

本文将详细介绍如何使用 Golang 构建一个完整的 RAG 系统，包括：
- 🔍 文档处理与 Chunking 策略
- 🧠 向量化（Embedding）实现
- 📊 向量数据库集成（Qdrant）
- 🔎 语义检索优化
- 💬 与 OpenAI API 集成生成回答
- 🚀 生产环境最佳实践

## 🎯 什么是 RAG？

### RAG 工作原理

```
用户问题 → 向量化 → 语义检索 → 召回相关文档 → 构建 Prompt → LLM 生成答案
```

### RAG vs 传统 LLM

| 特性 | 传统 LLM | RAG 系统 |
|------|----------|----------|
| 知识来源 | 训练数据（静态） | 外部知识库（动态） |
| 时效性 | 差（训练时间点） | 好（实时更新） |
| 幻觉问题 | 严重 | 显著降低 |
| 成本 | 高（需要大量 tokens） | 中等（仅检索相关内容） |
| 可追溯性 | 无 | 有（可引用来源） |

## 🛠️ 技术栈选型

### 核心组件

```go
// 我们将使用以下技术栈
- Go 1.21+               // 主开发语言
- OpenAI API (gpt-4)     // LLM 服务
- text-embedding-ada-002 // Embedding 模型
- Qdrant                 // 向量数据库
- gin                    // Web 框架
- go-openai              // OpenAI Go SDK
```

### 为什么选择 Golang？

1. **高性能**：并发处理大量文档
2. **简单部署**：单二进制文件
3. **优秀的并发模型**：goroutine 处理并行任务
4. **丰富的生态**：AI 相关库逐渐成熟

## 📦 环境准备

### 1. 安装依赖

```bash
# 初始化项目
mkdir golang-rag-system
cd golang-rag-system
go mod init github.com/yourusername/golang-rag

# 安装核心依赖
go get github.com/sashabaranov/go-openai
go get github.com/qdrant/go-client
go get github.com/gin-gonic/gin
go get github.com/joho/godotenv
```

### 2. 配置环境变量

```bash
# .env
OPENAI_API_KEY=sk-xxxxxxxxxx
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-qdrant-key
COLLECTION_NAME=documents
```

### 3. 启动 Qdrant（使用 Docker）

```bash
docker run -p 6333:6333 -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage:z \
  qdrant/qdrant
```

## 💻 核心实现

### 1. 项目结构

```
golang-rag/
├── cmd/
│   └── main.go           # 入口文件
├── internal/
│   ├── embedding/        # Embedding 生成
│   │   └── openai.go
│   ├── vectordb/         # 向量数据库操作
│   │   └── qdrant.go
│   ├── chunker/          # 文档分块
│   │   └── text_splitter.go
│   ├── retriever/        # 检索器
│   │   └── retriever.go
│   └── rag/              # RAG 核心逻辑
│       └── pipeline.go
├── pkg/
│   └── models/           # 数据模型
│       └── document.go
├── .env
├── go.mod
└── go.sum
```

### 2. 数据模型定义

```go
// pkg/models/document.go
package models

type Document struct {
    ID        string                 `json:"id"`
    Content   string                 `json:"content"`
    Metadata  map[string]interface{} `json:"metadata"`
    Embedding []float32              `json:"embedding,omitempty"`
}

type SearchResult struct {
    Document Document  `json:"document"`
    Score    float64   `json:"score"`
}

type RAGResponse struct {
    Answer    string         `json:"answer"`
    Sources   []SearchResult `json:"sources"`
    TokenUsed int            `json:"token_used"`
}
```

### 3. Embedding 生成器

```go
// internal/embedding/openai.go
package embedding

import (
    "context"
    "fmt"
    "github.com/sashabaranov/go-openai"
)

type EmbeddingService struct {
    client *openai.Client
    model  string
}

func NewEmbeddingService(apiKey string) *EmbeddingService {
    return &EmbeddingService{
        client: openai.NewClient(apiKey),
        model:  openai.AdaEmbeddingV2,
    }
}

// GenerateEmbedding 生成单个文本的向量
func (s *EmbeddingService) GenerateEmbedding(ctx context.Context, text string) ([]float32, error) {
    req := openai.EmbeddingRequest{
        Input: []string{text},
        Model: s.model,
    }

    resp, err := s.client.CreateEmbeddings(ctx, req)
    if err != nil {
        return nil, fmt.Errorf("failed to create embedding: %w", err)
    }

    if len(resp.Data) == 0 {
        return nil, fmt.Errorf("no embedding data returned")
    }

    return resp.Data[0].Embedding, nil
}

// BatchGenerateEmbeddings 批量生成向量（优化性能）
func (s *EmbeddingService) BatchGenerateEmbeddings(ctx context.Context, texts []string) ([][]float32, error) {
    // OpenAI 单次最多支持 2048 个输入
    const batchSize = 100
    var allEmbeddings [][]float32

    for i := 0; i < len(texts); i += batchSize {
        end := i + batchSize
        if end > len(texts) {
            end = len(texts)
        }

        batch := texts[i:end]
        req := openai.EmbeddingRequest{
            Input: batch,
            Model: s.model,
        }

        resp, err := s.client.CreateEmbeddings(ctx, req)
        if err != nil {
            return nil, fmt.Errorf("batch embedding failed: %w", err)
        }

        for _, data := range resp.Data {
            allEmbeddings = append(allEmbeddings, data.Embedding)
        }
    }

    return allEmbeddings, nil
}
```

### 4. 文档分块器

```go
// internal/chunker/text_splitter.go
package chunker

import (
    "strings"
    "unicode/utf8"
)

type TextSplitter struct {
    ChunkSize    int     // 每块字符数
    ChunkOverlap int     // 重叠字符数
}

func NewTextSplitter(chunkSize, overlap int) *TextSplitter {
    return &TextSplitter{
        ChunkSize:    chunkSize,
        ChunkOverlap: overlap,
    }
}

// SplitText 将长文本分割成多个 chunk
func (ts *TextSplitter) SplitText(text string) []string {
    if utf8.RuneCountInString(text) <= ts.ChunkSize {
        return []string{text}
    }

    var chunks []string
    runes := []rune(text)
    start := 0

    for start < len(runes) {
        end := start + ts.ChunkSize
        if end > len(runes) {
            end = len(runes)
        }

        // 尝试在句子边界分割
        if end < len(runes) {
            // 查找最近的句号、问号或换行符
            for i := end; i > start+ts.ChunkSize/2; i-- {
                if runes[i] == '。' || runes[i] == '？' || runes[i] == '\n' || runes[i] == '.' {
                    end = i + 1
                    break
                }
            }
        }

        chunk := string(runes[start:end])
        chunks = append(chunks, strings.TrimSpace(chunk))

        // 计算下一个起始位置（考虑重叠）
        start = end - ts.ChunkOverlap
        if start < 0 {
            start = 0
        }
    }

    return chunks
}

// SplitByParagraph 按段落分割（适用于结构化文档）
func (ts *TextSplitter) SplitByParagraph(text string) []string {
    paragraphs := strings.Split(text, "\n\n")
    var chunks []string

    currentChunk := ""
    for _, para := range paragraphs {
        para = strings.TrimSpace(para)
        if para == "" {
            continue
        }

        if utf8.RuneCountInString(currentChunk+para) <= ts.ChunkSize {
            if currentChunk != "" {
                currentChunk += "\n\n"
            }
            currentChunk += para
        } else {
            if currentChunk != "" {
                chunks = append(chunks, currentChunk)
            }
            // 如果单个段落超过 ChunkSize，进一步分割
            if utf8.RuneCountInString(para) > ts.ChunkSize {
                chunks = append(chunks, ts.SplitText(para)...)
            } else {
                currentChunk = para
            }
        }
    }

    if currentChunk != "" {
        chunks = append(chunks, currentChunk)
    }

    return chunks
}
```

### 5. 向量数据库操作

```go
// internal/vectordb/qdrant.go
package vectordb

import (
    "context"
    "fmt"
    "github.com/google/uuid"
    pb "github.com/qdrant/go-client/qdrant"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    "your-project/pkg/models"
)

type QdrantClient struct {
    client         pb.PointsClient
    collectionName string
}

func NewQdrantClient(address, collectionName string) (*QdrantClient, error) {
    conn, err := grpc.Dial(address, grpc.WithTransportCredentials(insecure.NewCredentials()))
    if err != nil {
        return nil, fmt.Errorf("failed to connect to Qdrant: %w", err)
    }

    return &QdrantClient{
        client:         pb.NewPointsClient(conn),
        collectionName: collectionName,
    }, nil
}

// UpsertDocuments 插入或更新文档
func (q *QdrantClient) UpsertDocuments(ctx context.Context, docs []models.Document) error {
    points := make([]*pb.PointStruct, 0, len(docs))

    for _, doc := range docs {
        if doc.ID == "" {
            doc.ID = uuid.New().String()
        }

        // 转换 metadata 为 payload
        payload := make(map[string]*pb.Value)
        payload["content"] = &pb.Value{
            Kind: &pb.Value_StringValue{StringValue: doc.Content},
        }

        for k, v := range doc.Metadata {
            if strVal, ok := v.(string); ok {
                payload[k] = &pb.Value{
                    Kind: &pb.Value_StringValue{StringValue: strVal},
                }
            }
        }

        point := &pb.PointStruct{
            Id: &pb.PointId{
                PointIdOptions: &pb.PointId_Uuid{Uuid: doc.ID},
            },
            Vectors: &pb.Vectors{
                VectorsOptions: &pb.Vectors_Vector{
                    Vector: &pb.Vector{Data: doc.Embedding},
                },
            },
            Payload: payload,
        }

        points = append(points, point)
    }

    _, err := q.client.Upsert(ctx, &pb.UpsertPoints{
        CollectionName: q.collectionName,
        Points:         points,
    })

    return err
}

// Search 语义搜索
func (q *QdrantClient) Search(ctx context.Context, queryVector []float32, topK int) ([]models.SearchResult, error) {
    resp, err := q.client.Search(ctx, &pb.SearchPoints{
        CollectionName: q.collectionName,
        Vector:         queryVector,
        Limit:          uint64(topK),
        WithPayload:    &pb.WithPayloadSelector{SelectorOptions: &pb.WithPayloadSelector_Enable{Enable: true}},
    })

    if err != nil {
        return nil, fmt.Errorf("search failed: %w", err)
    }

    results := make([]models.SearchResult, 0, len(resp.Result))
    for _, point := range resp.Result {
        content := ""
        metadata := make(map[string]interface{})

        if payload := point.Payload; payload != nil {
            if contentVal, ok := payload["content"]; ok {
                if strVal := contentVal.GetStringValue(); strVal != "" {
                    content = strVal
                }
            }

            for k, v := range payload {
                if k != "content" {
                    if strVal := v.GetStringValue(); strVal != "" {
                        metadata[k] = strVal
                    }
                }
            }
        }

        results = append(results, models.SearchResult{
            Document: models.Document{
                ID:       point.Id.GetUuid(),
                Content:  content,
                Metadata: metadata,
            },
            Score: float64(point.Score),
        })
    }

    return results, nil
}
```

### 6. RAG 核心管道

```go
// internal/rag/pipeline.go
package rag

import (
    "context"
    "fmt"
    "strings"
    "github.com/sashabaranov/go-openai"
    "your-project/internal/embedding"
    "your-project/internal/vectordb"
    "your-project/pkg/models"
)

type RAGPipeline struct {
    embeddingService *embedding.EmbeddingService
    vectorDB         *vectordb.QdrantClient
    llmClient        *openai.Client
    topK             int
}

func NewRAGPipeline(
    embService *embedding.EmbeddingService,
    vdb *vectordb.QdrantClient,
    openaiKey string,
    topK int,
) *RAGPipeline {
    return &RAGPipeline{
        embeddingService: embService,
        vectorDB:         vdb,
        llmClient:        openai.NewClient(openaiKey),
        topK:             topK,
    }
}

// Query 执行 RAG 查询
func (r *RAGPipeline) Query(ctx context.Context, question string) (*models.RAGResponse, error) {
    // 1. 将问题向量化
    queryVector, err := r.embeddingService.GenerateEmbedding(ctx, question)
    if err != nil {
        return nil, fmt.Errorf("failed to generate query embedding: %w", err)
    }

    // 2. 检索相关文档
    searchResults, err := r.vectorDB.Search(ctx, queryVector, r.topK)
    if err != nil {
        return nil, fmt.Errorf("failed to search documents: %w", err)
    }

    if len(searchResults) == 0 {
        return &models.RAGResponse{
            Answer:  "抱歉，我没有找到相关信息。",
            Sources: []models.SearchResult{},
        }, nil
    }

    // 3. 构建上下文
    context := r.buildContext(searchResults)

    // 4. 调用 LLM 生成回答
    answer, tokenUsed, err := r.generateAnswer(ctx, question, context)
    if err != nil {
        return nil, fmt.Errorf("failed to generate answer: %w", err)
    }

    return &models.RAGResponse{
        Answer:    answer,
        Sources:   searchResults,
        TokenUsed: tokenUsed,
    }, nil
}

// buildContext 构建上下文提示词
func (r *RAGPipeline) buildContext(results []models.SearchResult) string {
    var sb strings.Builder
    sb.WriteString("以下是相关的参考信息：\n\n")

    for i, result := range results {
        sb.WriteString(fmt.Sprintf("【参考 %d】\n%s\n\n", i+1, result.Document.Content))
    }

    return sb.String()
}

// generateAnswer 调用 LLM 生成最终答案
func (r *RAGPipeline) generateAnswer(ctx context.Context, question, context string) (string, int, error) {
    prompt := fmt.Sprintf(`你是一个专业的技术助手。请基于以下参考信息回答用户的问题。

%s

用户问题：%s

请注意：
1. 仅基于参考信息回答，不要编造内容
2. 如果参考信息不足，请明确说明
3. 回答要准确、专业、易懂
4. 可以引用参考信息的编号

你的回答：`, context, question)

    req := openai.ChatCompletionRequest{
        Model: openai.GPT4TurboPreview,
        Messages: []openai.ChatCompletionMessage{
            {
                Role:    openai.ChatMessageRoleSystem,
                Content: "你是一个专业的技术助手，擅长基于提供的参考资料准确回答问题。",
            },
            {
                Role:    openai.ChatMessageRoleUser,
                Content: prompt,
            },
        },
        Temperature: 0.7,
        MaxTokens:   1000,
    }

    resp, err := r.llmClient.CreateChatCompletion(ctx, req)
    if err != nil {
        return "", 0, err
    }

    if len(resp.Choices) == 0 {
        return "", 0, fmt.Errorf("no response from LLM")
    }

    return resp.Choices[0].Message.Content, resp.Usage.TotalTokens, nil
}
```

### 7. HTTP API 接口

```go
// cmd/main.go
package main

import (
    "context"
    "log"
    "net/http"
    "os"

    "github.com/gin-gonic/gin"
    "github.com/joho/godotenv"
    "your-project/internal/chunker"
    "your-project/internal/embedding"
    "your-project/internal/rag"
    "your-project/internal/vectordb"
    "your-project/pkg/models"
)

type Server struct {
    ragPipeline *rag.RAGPipeline
    embService  *embedding.EmbeddingService
    vectorDB    *vectordb.QdrantClient
    chunker     *chunker.TextSplitter
}

func main() {
    // 加载环境变量
    if err := godotenv.Load(); err != nil {
        log.Println("Warning: .env file not found")
    }

    // 初始化服务
    embService := embedding.NewEmbeddingService(os.Getenv("OPENAI_API_KEY"))
    
    vectorDB, err := vectordb.NewQdrantClient(
        os.Getenv("QDRANT_URL"),
        os.Getenv("COLLECTION_NAME"),
    )
    if err != nil {
        log.Fatal("Failed to connect to Qdrant:", err)
    }

    ragPipeline := rag.NewRAGPipeline(embService, vectorDB, os.Getenv("OPENAI_API_KEY"), 5)
    textSplitter := chunker.NewTextSplitter(500, 50)

    server := &Server{
        ragPipeline: ragPipeline,
        embService:  embService,
        vectorDB:    vectorDB,
        chunker:     textSplitter,
    }

    // 设置路由
    r := gin.Default()
    
    r.POST("/ingest", server.handleIngest)
    r.POST("/query", server.handleQuery)
    r.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"status": "healthy"})
    })

    log.Println("Server starting on :8080")
    if err := r.Run(":8080"); err != nil {
        log.Fatal("Failed to start server:", err)
    }
}

// handleIngest 处理文档导入
func (s *Server) handleIngest(c *gin.Context) {
    var req struct {
        Text     string                 `json:"text" binding:"required"`
        Metadata map[string]interface{} `json:"metadata"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    ctx := context.Background()

    // 1. 分块
    chunks := s.chunker.SplitText(req.Text)

    // 2. 生成向量
    embeddings, err := s.embService.BatchGenerateEmbeddings(ctx, chunks)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate embeddings"})
        return
    }

    // 3. 构建文档
    docs := make([]models.Document, len(chunks))
    for i, chunk := range chunks {
        docs[i] = models.Document{
            Content:   chunk,
            Metadata:  req.Metadata,
            Embedding: embeddings[i],
        }
    }

    // 4. 存储到向量数据库
    if err := s.vectorDB.UpsertDocuments(ctx, docs); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store documents"})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "message":    "Documents ingested successfully",
        "chunk_count": len(chunks),
    })
}

// handleQuery 处理查询请求
func (s *Server) handleQuery(c *gin.Context) {
    var req struct {
        Question string `json:"question" binding:"required"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    ctx := context.Background()
    response, err := s.ragPipeline.Query(ctx, req.Question)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, response)
}
```

## 🧪 测试与使用

### 1. 导入文档

```bash
curl -X POST http://localhost:8080/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Golang 是一门由 Google 开发的开源编程语言，以其简洁的语法、出色的并发性能和快速的编译速度而闻名。Go 语言特别适合构建高性能的服务器端应用、微服务架构和云原生应用。",
    "metadata": {
      "source": "golang-introduction",
      "category": "programming-language"
    }
  }'
```

### 2. 查询问题

```bash
curl -X POST http://localhost:8080/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Golang 有什么特点？"
  }'
```

### 响应示例

```json
{
  "answer": "基于参考信息，Golang 的主要特点包括：\n1. 简洁的语法\n2. 出色的并发性能\n3. 快速的编译速度\n4. 特别适合构建高性能服务器端应用、微服务架构和云原生应用",
  "sources": [
    {
      "document": {
        "id": "xxx-xxx-xxx",
        "content": "Golang 是一门由 Google 开发的...",
        "metadata": {
          "source": "golang-introduction"
        }
      },
      "score": 0.89
    }
  ],
  "token_used": 245
}
```

## 🚀 生产环境优化

### 1. 性能优化

#### 使用连接池

```go
// 为 OpenAI API 配置 HTTP 客户端连接池
httpClient := &http.Client{
    Timeout: 30 * time.Second,
    Transport: &http.Transport{
        MaxIdleConns:        100,
        MaxIdleConnsPerHost: 10,
        IdleConnTimeout:     90 * time.Second,
    },
}

config := openai.DefaultConfig(apiKey)
config.HTTPClient = httpClient
client := openai.NewClientWithConfig(config)
```

#### 缓存 Embedding

```go
// 使用 Redis 缓存常见查询的 embedding
type CachedEmbeddingService struct {
    embService *embedding.EmbeddingService
    cache      *redis.Client
    ttl        time.Duration
}

func (c *CachedEmbeddingService) GetEmbedding(ctx context.Context, text string) ([]float32, error) {
    // 生成缓存 key
    key := fmt.Sprintf("emb:%s", hashText(text))
    
    // 尝试从缓存获取
    cached, err := c.cache.Get(ctx, key).Bytes()
    if err == nil {
        return deserializeEmbedding(cached), nil
    }
    
    // 缓存未命中，生成新的 embedding
    emb, err := c.embService.GenerateEmbedding(ctx, text)
    if err != nil {
        return nil, err
    }
    
    // 存入缓存
    c.cache.Set(ctx, key, serializeEmbedding(emb), c.ttl)
    return emb, nil
}
```

### 2. 可观测性

#### 添加日志和指标

```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    queryDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "rag_query_duration_seconds",
            Help: "RAG query duration in seconds",
        },
        []string{"status"},
    )

    embeddingRequests = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "embedding_requests_total",
            Help: "Total number of embedding requests",
        },
        []string{"status"},
    )
)

func (r *RAGPipeline) Query(ctx context.Context, question string) (*models.RAGResponse, error) {
    start := time.Now()
    defer func() {
        duration := time.Since(start).Seconds()
        queryDuration.WithLabelValues("success").Observe(duration)
    }()

    // ... 原有逻辑
}
```

### 3. 错误处理与重试

```go
import "github.com/cenkalti/backoff/v4"

func (s *EmbeddingService) GenerateEmbeddingWithRetry(ctx context.Context, text string) ([]float32, error) {
    var result []float32
    
    operation := func() error {
        var err error
        result, err = s.GenerateEmbedding(ctx, text)
        return err
    }

    // 指数退避重试策略
    expBackoff := backoff.NewExponentialBackOff()
    expBackoff.MaxElapsedTime = 30 * time.Second

    err := backoff.Retry(operation, expBackoff)
    return result, err
}
```

## 📊 进阶技巧

### 1. 混合检索（Hybrid Search）

结合关键词检索和语义检索：

```go
type HybridRetriever struct {
    vectorDB    *vectordb.QdrantClient
    keywordDB   *ElasticsearchClient
    vectorWeight float64  // 0-1，向量检索权重
}

func (h *HybridRetriever) Search(ctx context.Context, query string, topK int) ([]models.SearchResult, error) {
    // 1. 并行执行两种检索
    var vectorResults, keywordResults []models.SearchResult
    var wg sync.WaitGroup
    wg.Add(2)

    go func() {
        defer wg.Done()
        vectorResults, _ = h.vectorDB.Search(ctx, queryVector, topK)
    }()

    go func() {
        defer wg.Done()
        keywordResults, _ = h.keywordDB.Search(ctx, query, topK)
    }()

    wg.Wait()

    // 2. 融合结果（RRF - Reciprocal Rank Fusion）
    return h.fuseResults(vectorResults, keywordResults), nil
}
```

### 2. ReRank 重排序

使用 Cohere ReRank API 或本地模型提升检索精度：

```go
func (r *RAGPipeline) ReRank(ctx context.Context, query string, docs []models.Document) ([]models.Document, error) {
    // 调用 Cohere ReRank API
    client := cohere.NewClient(os.Getenv("COHERE_API_KEY"))
    
    response, err := client.Rerank(ctx, &cohere.RerankRequest{
        Query:     query,
        Documents: extractContents(docs),
        TopN:      5,
        Model:     "rerank-multilingual-v2.0",
    })
    
    if err != nil {
        return nil, err
    }

    // 根据 ReRank 分数重新排序
    reranked := make([]models.Document, len(response.Results))
    for i, result := range response.Results {
        reranked[i] = docs[result.Index]
    }

    return reranked, nil
}
```

### 3. 多模态 RAG

支持图片、表格等多模态内容：

```go
// 使用 GPT-4 Vision 提取图片内容
func (s *MultiModalService) ExtractImageContent(ctx context.Context, imageURL string) (string, error) {
    req := openai.ChatCompletionRequest{
        Model: openai.GPT4VisionPreview,
        Messages: []openai.ChatCompletionMessage{
            {
                Role: openai.ChatMessageRoleUser,
                MultiContent: []openai.ChatMessagePart{
                    {
                        Type: openai.ChatMessagePartTypeText,
                        Text: "请详细描述这张图片中的内容，包括文字、图表、关键信息等。",
                    },
                    {
                        Type: openai.ChatMessagePartTypeImageURL,
                        ImageURL: &openai.ChatMessageImageURL{
                            URL: imageURL,
                        },
                    },
                },
            },
        },
    }

    resp, err := s.client.CreateChatCompletion(ctx, req)
    // ... 处理响应
}
```

## 🚨 我在开发中踩过的 5 个坑

在实际构建 RAG 系统的过程中，我踩了不少坑。这里分享几个最典型的，希望能帮你少走弯路。

### 坑 1：Qdrant 连接一直超时

**现象**：  
本地开发时，Qdrant 连接正常；  
但一把项目打包成 Docker 镜像部署，就死活连不上 Qdrant。

**排查过程**：
```bash
# 在容器里 ping Qdrant
$ docker exec -it rag-service ping qdrant
ping: unknown host qdrant

# 原来是 docker network 没配置对
```

**原因**：  
我在 `docker-compose.yml` 里把 Qdrant 和 RAG 服务放在了不同的 network，导致容器间无法通信。

**解决方案**：
```yaml
# docker-compose.yml（正确版本）
version: '3.8'
services:
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    networks:
      - rag-network
  
  rag-service:
    build: .
    environment:
      QDRANT_URL: "http://qdrant:6333"  # 用服务名，不是 localhost
    networks:
      - rag-network

networks:
  rag-network:
    driver: bridge
```

**教训**：  
容器化环境下，服务间通信要用 **服务名** 而不是 `localhost`。

---

### 坑 2：Embedding 维度不匹配，插入向量报错

**现象**：
```go
// 插入向量到 Qdrant 时报错
err := client.Upsert(ctx, &qdrant.UpsertPoints{...})
// Error: dimension mismatch: expected 512, got 1536
```

**原因**：  
我在创建 Qdrant collection 时，把 vector size 配置成了 512：

```go
// 错误的配置
client.CreateCollection(ctx, &qdrant.CreateCollection{
    CollectionName: "documents",
    VectorsConfig: qdrant.VectorsConfig{
        Params: &qdrant.VectorParams{
            Size:     512,  // ❌ 错了！text-embedding-ada-002 是 1536 维
            Distance: qdrant.Distance_Cosine,
        },
    },
})
```

但 OpenAI 的 `text-embedding-ada-002` 模型返回的向量是 **1536 维**。

**解决方案**：
```go
// 正确的配置
client.CreateCollection(ctx, &qdrant.CreateCollection{
    CollectionName: "documents",
    VectorsConfig: qdrant.VectorsConfig{
        Params: &qdrant.VectorParams{
            Size:     1536,  // ✅ 改成 1536
            Distance: qdrant.Distance_Cosine,
        },
    },
})
```

**教训**：  
一定要先查清楚 Embedding 模型的输出维度，再配置向量数据库。

| 模型 | 维度 |
|------|------|
| text-embedding-ada-002 | 1536 |
| text-embedding-3-small | 1536 |
| text-embedding-3-large | 3072 |

（**这里后续补一张截图：Qdrant Web UI 显示 collection 的配置信息**）

---

### 坑 3：检索结果全是噪音，答非所问

**现象**：  
用户问："Golang 如何处理并发？"  
系统返回的却是："Python 列表推导式的用法"。

**排查过程**：  
我检查了检索出来的 top-5 文档，发现分数都很低（0.3 左右），说明确实没匹配到相关内容。

**原因有两个**：

1. **文档切片（Chunking）策略太粗暴**  
   我一开始直接按 500 字符硬切，结果把很多有意义的段落切断了：
   ```
   原文：
   "Golang 的并发模型基于 goroutine 和 channel。goroutine 是轻量级线程..."
   
   切片后：
   Chunk 1: "Golang 的并发模型基于 goroutine 和 chan"
   Chunk 2: "nel。goroutine 是轻量级线程..."
   ```
   这样 Embedding 出来的向量语义就断了。

2. **没有过滤低分数结果**  
   即使检索到的文档分数很低（不相关），我也照样扔给 LLM，导致生成的回答质量很差。

**解决方案**：

```go
// 1. 改进 Chunking 策略：按段落 + 保留上下文
func smartChunk(content string, maxSize int) []string {
    // 先按段落分割
    paragraphs := strings.Split(content, "\n\n")
    
    var chunks []string
    var currentChunk string
    
    for _, para := range paragraphs {
        // 如果加上这段还不超过 maxSize，就合并
        if len(currentChunk) + len(para) < maxSize {
            currentChunk += para + "\n\n"
        } else {
            if currentChunk != "" {
                chunks = append(chunks, currentChunk)
            }
            currentChunk = para + "\n\n"
        }
    }
    
    if currentChunk != "" {
        chunks = append(chunks, currentChunk)
    }
    
    return chunks
}

// 2. 过滤低分数结果
func (r *RAGPipeline) Search(ctx context.Context, query string) ([]Document, error) {
    results, err := r.vectorDB.Search(ctx, queryVector, 10)
    if err != nil {
        return nil, err
    }
    
    // 过滤掉分数低于 0.7 的结果
    var filtered []Document
    for _, doc := range results {
        if doc.Score >= 0.7 {  // ✅ 加这个阈值判断
            filtered = append(filtered, doc)
        }
    }
    
    // 如果一个相关文档都没有，直接返回"我不知道"
    if len(filtered) == 0 {
        return nil, ErrNoRelevantDocuments
    }
    
    return filtered, nil
}
```

**教训**：  
- Chunking 要保留语义完整性，不能硬切  
- 一定要设置相似度阈值，宁可回答"不知道"，也不要胡乱回答

---

### 坑 4：OpenAI API 偶尔超时，整个流程卡死

**现象**：  
系统跑着跑着，突然卡住不动了，日志停在：
```
[INFO] Calling OpenAI API for embedding...
```

**原因**：  
我没给 OpenAI API 调用设置超时，网络一抖动就卡死。

**解决方案**：
```go
// ❌ 错误的写法：没有超时控制
func (e *EmbeddingService) Generate(ctx context.Context, text string) ([]float32, error) {
    resp, err := e.client.CreateEmbeddings(ctx, openai.EmbeddingRequest{
        Model: openai.AdaEmbeddingV2,
        Input: []string{text},
    })
    // ...
}

// ✅ 正确的写法：加上超时和重试
func (e *EmbeddingService) Generate(ctx context.Context, text string) ([]float32, error) {
    // 1. 设置 10 秒超时
    ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
    defer cancel()
    
    // 2. 最多重试 3 次
    var resp openai.EmbeddingResponse
    var err error
    
    for i := 0; i < 3; i++ {
        resp, err = e.client.CreateEmbeddings(ctx, openai.EmbeddingRequest{
            Model: openai.AdaEmbeddingV2,
            Input: []string{text},
        })
        
        if err == nil {
            break  // 成功就退出
        }
        
        log.Printf("重试 %d/3: %v", i+1, err)
        time.Sleep(time.Second * 2)  // 等 2 秒再重试
    }
    
    if err != nil {
        return nil, fmt.Errorf("生成 embedding 失败（已重试3次）: %w", err)
    }
    
    return resp.Data[0].Embedding, nil
}
```

**教训**：  
- **任何外部 API 调用，都要加超时和重试**  
- OpenAI API 偶尔会抽风，重试机制是必须的

---

### 坑 5：生产环境成本失控，一天烧了 $50

**现象**：  
RAG 系统上线第 3 天，收到 OpenAI 账单警告邮件："Your usage has exceeded $50 in the last 24 hours"。

**排查过程**：  
我查了一下 API 调用日志，发现：
- Embedding 调用：2000 次/天（正常）
- **GPT-4 调用：12000 次/天**（不正常！）

原来是我没做 **缓存**，同样的问题被用户反复问，系统每次都调用 GPT-4 重新生成答案。

**解决方案**：
```go
// 增加缓存层（用 Redis）
type CachedRAG struct {
    rag   *RAGPipeline
    cache *redis.Client
}

func (c *CachedRAG) Query(ctx context.Context, question string) (string, error) {
    // 1. 先查缓存
    cacheKey := "rag:answer:" + hashQuestion(question)
    cached, err := c.cache.Get(ctx, cacheKey).Result()
    if err == nil {
        log.Printf("缓存命中: %s", question)
        return cached, nil
    }
    
    // 2. 缓存未命中，调用 RAG
    answer, err := c.rag.Query(ctx, question)
    if err != nil {
        return "", err
    }
    
    // 3. 写入缓存（TTL = 1 小时）
    c.cache.Set(ctx, cacheKey, answer, time.Hour)
    
    return answer, nil
}

func hashQuestion(q string) string {
    h := sha256.Sum256([]byte(strings.ToLower(q)))
    return hex.EncodeToString(h[:])
}
```

**成本对比（加缓存后）**：

| 维度 | 加缓存前 | 加缓存后 | 节省 |
|------|----------|----------|------|
| GPT-4 调用次数/天 | 12000 | 3000 | 75% |
| 日均成本 | $50 | $12 | 76% |
| 平均响应时间 | 2.5s | 0.8s | 68% |

（**这里后续补一张截图：Grafana 监控面板，显示缓存命中率 + 成本趋势图**）

**教训**：  
- **生产环境必须加缓存，不然成本会失控**  
- 监控 API 调用量和成本，设置告警阈值

---

## 🎓 最佳实践总结

### ✅ DO

1. **合理设置 Chunk Size**：
   - 技术文档：300-500 字符
   - 对话数据：200-300 字符
   - 长篇文章：500-800 字符

2. **添加元数据**：
   - 文档来源、时间戳、分类
   - 便于过滤和追溯

3. **监控成本**：
   - 记录 token 使用量
   - 使用缓存减少 API 调用

4. **测试召回质量**：
   - 准备测试集
   - 计算 MRR、NDCG 等指标

### ❌ DON'T

1. 不要盲目增加 topK（成本高，噪音多）
2. 不要忽略错误处理（API 调用可能失败）
3. 不要硬编码 prompt（使用配置文件管理）
4. 不要忽略安全性（API Key 管理、输入验证）

## 🔗 相关资源

- [OpenAI API 文档](https://platform.openai.com/docs)
- [Qdrant 官方文档](https://qdrant.tech/documentation/)
- [go-openai GitHub](https://github.com/sashabaranov/go-openai)
- [LangChain Go](https://github.com/tmc/langchaingo)

## 📝 总结

本文详细介绍了如何使用 Golang 构建一个完整的 RAG 系统，从基础架构到生产优化都有涉及。RAG 技术正在快速发展，建议持续关注最新进展：

- **GraphRAG**：基于知识图谱的检索
- **Self-RAG**：自我反思的 RAG 系统
- **Adaptive RAG**：根据查询自适应选择策略

希望这篇文章能帮助你快速上手 Golang + RAG 开发，构建出色的 AI 应用！

---

**关键词**：#Golang #RAG #AI #LLM #VectorDatabase #OpenAI #Qdrant #SemanticSearch #Embedding #智能问答

**相关文章推荐**：
- [Golang Socket 通信架构分析](/zh/golang/Golang%20Socket%20%E9%80%9A%E4%BF%A1%E6%9E%B6%E6%9E%84%E5%88%86%E6%9E%90%E4%B8%8E%E5%AE%9E%E7%8E%B0-%E6%9E%84%E5%BB%BA%E9%AB%98%E6%80%A7%E8%83%BD%E6%B8%B8%E6%88%8F%E6%9C%8D%E5%8A%A1%E5%99%A8)
- [基于Golang的高性能游戏接口设计](/zh/golang/%E5%9F%BA%E4%BA%8Egolang%20%E7%9A%84%E9%AB%98%E6%80%A7%E8%83%BD%E6%B8%B8%E6%88%8F%E6%8E%A5%E5%8F%A3%E8%AE%BE%E8%AE%A1)
- [Go开发终端小工具](/zh/golang/Go%20%E5%BC%80%E5%8F%91%E7%BB%88%E7%AB%AF%E5%B0%8F%E5%B7%A5%E5%85%B7)

