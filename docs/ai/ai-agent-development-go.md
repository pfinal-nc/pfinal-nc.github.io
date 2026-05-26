---
title: "Go 语言 AI Agent 开发实战：从 Function Calling 到多工具编排"
description: "用 Go 构建 AI Agent 系统，实现 Function Calling、工具编排、记忆管理"
date: 2026-05-26
author: PFinal南丞
category: AI工程
tags: [ai, golang, agent, function-calling, llm]
keywords:
  - Go AI Agent
  - Function Calling 实现
  - AI 工具编排
  - Go LLM 应用
  - Agent 框架
---

# Go 语言 AI Agent 开发实战

## 为什么要用 Go 写 Agent？

大部分 AI Agent 框架（LangChain、LlamaIndex）都用 Python 实现。但 Go 在后端领域有独特优势：

- **性能**：高并发场景下比 Python 快 10-100 倍
- **部署**：单二进制部署，无运行时依赖
- **类型安全**：减少运行时错误
- **适合后端集成**：无缝接入现有 Go 微服务体系

## 从 Function Calling 开始

OpenAI 的 Function Calling 是 Agent 的基础能力——让 LLM 决定调用哪个函数：

```go
type FunctionDefinition struct {
    Name        string     `json:"name"`
    Description string     `json:"description"`
    Parameters  any        `json:"parameters"` // JSON Schema
    Function    func(args string) (string, error)
}

type LLMClient struct {
    apiKey  string
    model   string
    tools   []FunctionDefinition
}

func (c *LLMClient) Chat(ctx context.Context, messages []Message) (*Response, error) {
    payload := ChatRequest{
        Model:    c.model,
        Messages: messages,
        Tools:    c.toToolDefinitions(),
    }

    body, _ := json.Marshal(payload)
    req, _ := http.NewRequestWithContext(ctx, "POST",
        "https://api.openai.com/v1/chat/completions",
        bytes.NewReader(body),
    )
    req.Header.Set("Authorization", "Bearer "+c.apiKey)

    resp, err := http.DefaultClient.Do(req)
    // ... 解析响应
}
```

## 工具编排模式

### 顺序编排（Pipeline）

适合有明确先后依赖的任务：

```go
func (a *Agent) ExecutePipeline(ctx context.Context, task string) (string, error) {
    // 每个步骤的输出作为下一步的输入
    steps := []string{"planner", "coder", "reviewer"}

    var lastResult string
    for _, step := range steps {
        prompt := fmt.Sprintf("As %s, continue the task.\nContext: %s", step, lastResult)
        result, err := a.runWithTools(ctx, prompt)
        if err != nil {
            return "", err
        }
        lastResult = result
    }
    return lastResult, nil
}
```

### 并行编排（Fan-Out）

适合独立子任务并行执行：

```go
type ParallelAgent struct {
    llm    LLMClient
    worker int
}

func (a *ParallelAgent) ExecuteParallel(ctx context.Context, subTasks []string) []string {
    results := make([]string, len(subTasks))
    var wg sync.WaitGroup

    for i, task := range subTasks {
        wg.Add(1)
        go func(idx int, t string) {
            defer wg.Done()
            result, _ := a.llm.Chat(ctx, []Message{
                {Role: "user", Content: t},
            })
            results[idx] = result
        }(i, task)
    }

    wg.Wait()
    return results
}
```

### 动态编排（ReAct）

LLM 自行决定下一步调用什么工具：

```go
type ReActAgent struct {
    llm        LLMClient
    tools      map[string]Tool
    maxIter    int
}

func (a *ReActAgent) Run(ctx context.Context, goal string) (string, error) {
    var thoughts []string

    for i := 0; i < a.maxIter; i++ {
        // LLM 输出 Thought/Action/Observation 循环
        decision, _ := a.llm.Think(ctx, a.buildPrompt(goal, thoughts))

        if decision.IsFinal {
            return decision.Answer, nil
        }

        // 执行工具
        result, err := a.tools[decision.ToolName].Execute(ctx, decision.Args)
        if err != nil {
            return "", fmt.Errorf("tool %s failed: %w", decision.ToolName, err)
        }

        thoughts = append(thoughts, fmt.Sprintf(
            "Thought: %s\nAction: %s\nObservation: %s",
            decision.Thought, decision.ToolName, result,
        ))
    }

    return "", fmt.Errorf("max iterations reached without final answer")
}
```

## 记忆管理

Agent 需要记忆来维持上下文：

| 记忆类型 | 实现 | 用途 |
|----------|------|------|
| 短期记忆 | 当前对话历史 | 维持当前对话理解 |
| 长期记忆 | 向量数据库 | 跨会话知识存储 |
| 工作记忆 | JSON 结构 | 当前任务状态跟踪 |

```go
type Memory struct {
    shortTerm []Message           // 滑动窗口
    longTerm  vectorStore         // 持久化
    working   map[string]any      // 任务状态
}

func (m *Memory) Add(ctx context.Context, msg Message) {
    m.shortTerm = append(m.shortTerm, msg)
    // 超出窗口时压缩或归档到长期记忆
    if len(m.shortTerm) > 20 {
        summary, _ := summarize(m.shortTerm)
        m.longTerm.Insert(ctx, summary)
        m.shortTerm = m.shortTerm[10:] // 保留最近 10 条
    }
}
```

## 完整示例：GitHub 智能助手

```go
func main() {
    agent := NewAgent(openaiKey)

    agent.RegisterTool(Tool{
        Name:        "search_repos",
        Description: "搜索 GitHub 仓库",
        Execute: func(ctx context.Context, args string) (string, error) {
            // 调用 GitHub API
        },
    })

    agent.RegisterTool(Tool{
        Name:        "get_readme",
        Description: "获取仓库 README",
        Execute: func(ctx context.Context, args string) (string, error) {
            // 获取 README 内容
        },
    })

    result, _ := agent.Run(ctx, "帮我找 Go 语言的 RAG 框架，对比它们的优缺点")
    fmt.Println(result)
}
```

## 总结

用 Go 构建 Agent 的优势在于：**高性能 + 类型安全 + 易于集成**。对于后端团队，Go 是比 Python 更合适的 AI Agent 开发语言。

## 推荐阅读

- [LLM 应用架构设计：从 RAG 到 Agent](/ai/llm-application-architecture)
- [Go 语言开发 AI 智能体](/dev/backend/golang/Go语言开发AI智能体：从Function-Calling到Agent框架)
- [RAG 系统架构设计与实现](/ai/rag-system-architecture)
