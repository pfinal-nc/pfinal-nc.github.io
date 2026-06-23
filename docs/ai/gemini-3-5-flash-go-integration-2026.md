---
title: "Gemini 3.5 Flash + Go 集成实战：构建高性价比 AI 应用的完整指南"
date: 2026-06-19
tags:
  - AI
  - golang
  - gemini
  - LLM
  - google
keywords:
  - Gemini 3.5 Flash
  - Go AI SDK
  - Google genai
  - LLM Go 集成
  - AI 应用开发
  - Gemini API
category: ai
description: "Google I/O 2026 发布的 Gemini 3.5 Flash 速度提升 4 倍，价格降低 50%。本文用 Go 语言从零集成 Gemini API：流式响应、Function Calling、多模态输入、生产级并发控制，附完整代码。"
---

# Gemini 3.5 Flash + Go 集成实战：构建高性价比 AI 应用的完整指南

Google I/O 2026 发布的 Gemini 3.5 Flash 是目前**最具性价比的前沿 LLM**：相比 Gemini 2.5 Flash，推理速度提升 4 倍，价格降低 50%，同时在 MMLU、HumanEval 等基准上全面超越。本文展示如何用 Go 语言完整集成 Gemini 3.5 Flash，构建生产级 AI 应用。

## 为什么选择 Gemini 3.5 Flash？

| 模型 | 输入价格 | 输出价格 | 速度 | 上下文 |
|------|---------|---------|------|--------|
| GPT-4o | $2.5/M | $10/M | 中 | 128K |
| Claude 4 Sonnet | $3/M | $15/M | 中 | 200K |
| Gemini 3.5 Flash | **$0.3/M** | **$1.2/M** | **最快** | 1M |

对于高并发、大批量的 Go 后端场景，Gemini 3.5 Flash 的性价比优势非常突出。

## 环境准备

```bash
# 获取 API Key：https://ai.google.dev/
export GEMINI_API_KEY="your-api-key"

# 安装 Go SDK
go get google.golang.org/genai@latest
```

## 基础对话

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"

    "google.golang.org/genai"
)

func main() {
    ctx := context.Background()
    
    client, err := genai.NewClient(ctx, &genai.ClientConfig{
        APIKey:  os.Getenv("GEMINI_API_KEY"),
        Backend: genai.BackendGoogleAI,
    })
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    result, err := client.Models.GenerateContent(ctx,
        "gemini-3.5-flash",
        genai.Text("用 Go 解释 channel 的工作原理"),
        nil,
    )
    if err != nil {
        log.Fatal(err)
    }
    
    fmt.Println(result.Text())
}
```

## 流式响应（生产必备）

对于长文本生成场景，流式响应大幅降低用户等待感知：

```go
func StreamGenerate(ctx context.Context, client *genai.Client, prompt string) error {
    for chunk, err := range client.Models.GenerateContentStream(ctx,
        "gemini-3.5-flash",
        genai.Text(prompt),
        nil,
    ) {
        if err != nil {
            return fmt.Errorf("stream error: %w", err)
        }
        fmt.Print(chunk.Text())
    }
    fmt.Println()
    return nil
}
```

> 注意：`GenerateContentStream` 返回 `iter.Seq2`，完美配合 Go 1.24 的 `range over func` 特性！

## Function Calling（工具调用）

```go
// 定义工具
weatherTool := &genai.Tool{
    FunctionDeclarations: []*genai.FunctionDeclaration{
        {
            Name:        "get_weather",
            Description: "获取指定城市的当前天气",
            Parameters: &genai.Schema{
                Type: genai.TypeObject,
                Properties: map[string]*genai.Schema{
                    "city": {
                        Type:        genai.TypeString,
                        Description: "城市名称，如：北京、上海",
                    },
                },
                Required: []string{"city"},
            },
        },
    },
}

config := &genai.GenerateContentConfig{
    Tools: []*genai.Tool{weatherTool},
}

result, err := client.Models.GenerateContent(ctx,
    "gemini-3.5-flash",
    genai.Text("北京今天天气怎么样？"),
    config,
)

// 处理 Function Call
for _, part := range result.Candidates[0].Content.Parts {
    if fc, ok := part.(genai.FunctionCall); ok {
        fmt.Printf("调用函数：%s，参数：%v\n", fc.Name, fc.Args)
        
        // 执行实际函数
        weather := callWeatherAPI(fc.Args["city"].(string))
        
        // 将结果返回给模型
        // ... (继续对话)
    }
}
```

## 多模态：分析图片

```go
func AnalyzeImage(ctx context.Context, client *genai.Client, imagePath string) (string, error) {
    imageBytes, err := os.ReadFile(imagePath)
    if err != nil {
        return "", err
    }
    
    result, err := client.Models.GenerateContent(ctx,
        "gemini-3.5-flash",
        []*genai.Part{
            {Text: "描述这张图片中的内容，重点关注技术架构图的细节"},
            {
                InlineData: &genai.Blob{
                    MIMEType: "image/jpeg",
                    Data:     imageBytes,
                },
            },
        },
        nil,
    )
    if err != nil {
        return "", err
    }
    
    return result.Text(), nil
}
```

## 生产级：并发控制 + 重试

Go 后端往往需要并发调用 LLM，必须做好限流和重试：

```go
type GeminiClient struct {
    client    *genai.Client
    semaphore chan struct{}   // 并发限制
    model     string
}

func NewGeminiClient(apiKey string, maxConcurrency int) (*GeminiClient, error) {
    client, err := genai.NewClient(context.Background(), &genai.ClientConfig{
        APIKey:  apiKey,
        Backend: genai.BackendGoogleAI,
    })
    if err != nil {
        return nil, err
    }
    
    return &GeminiClient{
        client:    client,
        semaphore: make(chan struct{}, maxConcurrency),
        model:     "gemini-3.5-flash",
    }, nil
}

func (g *GeminiClient) Generate(ctx context.Context, prompt string) (string, error) {
    // 获取信号量
    select {
    case g.semaphore <- struct{}{}:
        defer func() { <-g.semaphore }()
    case <-ctx.Done():
        return "", ctx.Err()
    }
    
    // 指数退避重试
    var lastErr error
    for attempt := 0; attempt < 3; attempt++ {
        if attempt > 0 {
            backoff := time.Duration(1<<uint(attempt)) * time.Second
            select {
            case <-time.After(backoff):
            case <-ctx.Done():
                return "", ctx.Err()
            }
        }
        
        result, err := g.client.Models.GenerateContent(ctx, g.model, genai.Text(prompt), nil)
        if err == nil {
            return result.Text(), nil
        }
        
        // 429 Rate Limit 才重试
        if isRateLimitError(err) {
            lastErr = err
            continue
        }
        return "", err
    }
    return "", lastErr
}

func isRateLimitError(err error) bool {
    return strings.Contains(err.Error(), "429") || 
           strings.Contains(err.Error(), "RESOURCE_EXHAUSTED")
}
```

## 批量处理：1M Token 上下文的威力

Gemini 3.5 Flash 的 1M Token 上下文让批量文档处理成为可能：

```go
func BatchSummarize(ctx context.Context, client *GeminiClient, docs []string) ([]string, error) {
    // 将多个文档打包进一次请求（节省 API 调用次数）
    var sb strings.Builder
    sb.WriteString("请对以下每个文档分别生成一段摘要（JSON 格式输出）：\n\n")
    for i, doc := range docs {
        fmt.Fprintf(&sb, "=== 文档 %d ===\n%s\n\n", i+1, doc)
    }
    
    result, err := client.Generate(ctx, sb.String())
    if err != nil {
        return nil, err
    }
    
    // 解析 JSON 输出
    var summaries []string
    // ... json.Unmarshal([]byte(result), &summaries)
    return summaries, nil
}
```

## 费用估算

以一个日均 10 万次请求的 Go 服务为例：

| 场景 | 平均 Tokens | 日费用（Gemini 3.5 Flash） |
|------|------------|--------------------------|
| 简单问答 | 500 in + 200 out | **~$3** |
| 文档摘要 | 2000 in + 500 out | **~$8** |
| 代码审查 | 1000 in + 800 out | **~$6** |

相比 GPT-4o，**月节省 90%+ 费用**。

## 总结

Gemini 3.5 Flash 是 2026 年 Go 后端集成 LLM 的首选方案：原生 `iter.Seq2` 流式 API 与 Go 1.24 完美配合，1M Token 上下文支持大文档批处理，价格只有 GPT-4o 的 1/8。

**相关阅读**：
- [Go 1.24 range over func 迭代器](/dev/backend/golang/go-1-24-range-over-func-7-patterns-2026)
- [LlamaIndex 4.0 文档 Agent 实战](/dev/backend/python/llamaindex-4-agentic-rag-workflow-2026)
- [AI Agent 可观测性 2026](/ai/ai-agent-observability-2026)
