---
title: "MCP + A2A + A2UI：2026 多 Agent 系统完整协议栈实战"
date: "2026-06-07"
tags:
  - AI
  - golang
keywords:
  - MCP
  - A2A
  - A2UI
  - AI Agent
  - 多智能体
  - 协议栈
  - Agent-to-Agent
category:
  - AI
description: "深入解析 2026 年多 Agent 系统的三大核心协议：MCP（工具集成）、A2A（Agent 间通信）、A2UI（用户界面）。从原理到实战代码，掌握构建生产级 Agent 应用的完整架构。"
---

# MCP + A2A + A2UI：2026 多 Agent 系统完整协议栈实战

> 2026 年，AI Agent 从单点工具演化为多 Agent 协作系统。如何让不同厂商、不同框架构建的 Agent 互相发现、通信和协调？本文深入解析 MCP、A2A、A2UI 三大协议，带你构建完整的多 Agent 应用架构。

## 目录

- [一、为什么需要三协议栈](#一为什么需要三协议栈)
- [二、MCP：工具集成层](#二mcp工具集成层)
- [三、A2A：Agent 协调层](#三a2aagent-协调层)
- [四、A2UI：用户界面层](#四a2ui用户界面层)
- [五、三协议协同实战：多 Agent 餐厅预订系统](#五三协议协同实战多-agent-餐厅预订系统)
- [六、Go 语言实现 MCP Server](#六go-语言实现-mcp-server)
- [七、三种架构模式对比](#七三种架构模式对比)
- [八、渐进式采纳策略](#八渐进式采纳策略)
- [九、最佳实践与踩坑指南](#九最佳实践与踩坑指南)

---

## 一、为什么需要三协议栈

在 AI Agent 系统中，存在三种截然不同的通信边界，没有任何单一协议能同时解决：

```
┌──────────────────────────────────────────────────────┐
│                   多 Agent 系统架构                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│   用户界面（A2UI）                                    │
│   ┌─────────────────────────────────────┐            │
│   │  Agent A ←→ Agent B ←→ Agent C     │  (A2A)    │
│   │    │           │           │        │            │
│   │    ↓           ↓           ↓        │            │
│   │ [工具]     [工具]     [工具]         │  (MCP)    │
│   └─────────────────────────────────────┘            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

| 层级 | 协议 | 发起者 | 解决的问题 | 传输方式 |
|------|------|--------|-----------|---------|
| **工具层** | MCP | Anthropic | Agent 如何调用外部工具 | JSON-RPC 2.0 |
| **协调层** | A2A | Google | Agent 之间如何通信协调 | JSON-RPC 2.0 + SSE |
| **UI 层** | A2UI | Google | Agent 如何渲染富交互界面 | 声明式 JSON |

**核心原则：三者互补而非竞争。**

---

## 二、MCP：工具集成层

### 2.1 MCP 核心概念

MCP（Model Context Protocol）标准化了 Agent 与外部工具/数据源的交互方式，是协议栈的**底层基石**。

**三大核心原语：**

```go
// MCP 三大原语示意图
type MCPServer interface {
    // Tools：可执行的操作，带 JSON Schema 参数定义
    ListTools() []Tool
    CallTool(name string, args json.RawMessage) (*CallResult, error)

    // Resources：只读数据，使用 URI 寻址
    ListResources() []Resource
    ReadResource(uri string) (*ResourceContent, error)

    // Prompts：可复用的提示词模板
    ListPrompts() []Prompt
    GetPrompt(name string, args map[string]string) (*PromptResult, error)
}
```

### 2.2 MCP 通信流程

```
┌──────────┐     initialize      ┌──────────┐
│          │ ◄────────────────── │          │
│  Client  │     capabilities     │  Server  │
│          │ ──────────────────► │          │
│          │     tools/list      │          │
│          │ ◄────────────────── │          │
│          │     tools/call      │          │
│          │ ──────────────────► │          │
└──────────┘                     └──────────┘
```

### 2.3 Go 语言 MCP Server 实战

下面用 Go 实现一个完整的 MCP Server：

```go
// mcp-restaurant/main.go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
)

// ===== 数据模型 =====

type Restaurant struct {
    ID       string  `json:"id"`
    Name     string  `json:"name"`
    Cuisine  string  `json:"cuisine"`
    Rating   float64 `json:"rating"`
    Price    string  `json:"price"`
    Address  string  `json:"address"`
    Available bool   `json:"available"`
}

// ===== MCP 协议类型 =====

type JSONRPCRequest struct {
    JSONRPC string          `json:"jsonrpc"`
    ID      interface{}     `json:"id"`
    Method  string          `json:"method"`
    Params  json.RawMessage `json:"params,omitempty"`
}

type JSONRPCResponse struct {
    JSONRPC string          `json:"jsonrpc"`
    ID      interface{}     `json:"id"`
    Result  interface{}     `json:"result,omitempty"`
    Error   *RPCError       `json:"error,omitempty"`
}

type RPCError struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
}

type Tool struct {
    Name        string          `json:"name"`
    Description string          `json:"description"`
    InputSchema json.RawMessage `json:"inputSchema"`
}

// ===== MCP Server =====

type RestaurantMCPServer struct {
    restaurants []Restaurant
}

func NewRestaurantServer() *RestaurantMCPServer {
    return &RestaurantMCPServer{
        restaurants: []Restaurant{
            {ID: "1", Name: "Trattoria Roma", Cuisine: "Italian", Rating: 4.8, Price: "$$", Address: "123 Main St"},
            {ID: "2", Name: "Sakura Garden", Cuisine: "Japanese", Rating: 4.6, Price: "$$$", Address: "456 Oak Ave"},
            {ID: "3", Name: "El Fuego", Cuisine: "Mexican", Rating: 4.3, Price: "$", Address: "789 Pine Rd"},
        },
    }
}

func (s *RestaurantMCPServer) handleMCP(w http.ResponseWriter, r *http.Request) {
    var req JSONRPCRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    var result interface{}

    switch req.Method {
    case "initialize":
        result = map[string]interface{}{
            "protocolVersion": "2025-03-26",
            "capabilities": map[string]interface{}{
                "tools": map[string]interface{}{},
            },
            "serverInfo": map[string]string{
                "name":    "restaurant-mcp-server",
                "version": "1.0.0",
            },
        }

    case "tools/list":
        result = map[string]interface{}{
            "tools": []Tool{
                {
                    Name:        "search_restaurants",
                    Description: "搜索餐厅，支持按菜系、位置筛选",
                    InputSchema: json.RawMessage(`{
                        "type": "object",
                        "properties": {
                            "cuisine": {"type": "string", "description": "菜系类型"},
                            "min_rating": {"type": "number", "description": "最低评分"}
                        },
                        "required": []
                    }`),
                },
                {
                    Name:        "get_restaurant",
                    Description: "获取餐厅详细信息",
                    InputSchema: json.RawMessage(`{
                        "type": "object",
                        "properties": {
                            "id": {"type": "string", "description": "餐厅ID"}
                        },
                        "required": ["id"]
                    }`),
                },
                {
                    Name:        "book_table",
                    Description: "预订餐厅座位",
                    InputSchema: json.RawMessage(`{
                        "type": "object",
                        "properties": {
                            "restaurant_id": {"type": "string"},
                            "date": {"type": "string"},
                            "party_size": {"type": "integer"},
                            "time": {"type": "string"}
                        },
                        "required": ["restaurant_id", "date", "party_size"]
                    }`),
                },
            },
        }

    case "tools/call":
        var params struct {
            Name      string          `json:"name"`
            Arguments json.RawMessage `json:"arguments"`
        }
        json.Unmarshal(req.Params, &params)

        switch params.Name {
        case "search_restaurants":
            var args struct {
                Cuisine   string  `json:"cuisine"`
                MinRating float64 `json:"min_rating"`
            }
            json.Unmarshal(params.Arguments, &args)

            var filtered []Restaurant
            for _, r := range s.restaurants {
                if args.Cuisine != "" && r.Cuisine != args.Cuisine {
                    continue
                }
                if args.MinRating > 0 && r.Rating < args.MinRating {
                    continue
                }
                filtered = append(filtered, r)
            }

            data, _ := json.Marshal(filtered)
            result = map[string]interface{}{
                "content": []map[string]interface{}{
                    {"type": "text", "text": string(data)},
                },
            }

        case "get_restaurant":
            var args struct {
                ID string `json:"id"`
            }
            json.Unmarshal(params.Arguments, &args)

            for _, r := range s.restaurants {
                if r.ID == args.ID {
                    data, _ := json.Marshal(r)
                    result = map[string]interface{}{
                        "content": []map[string]interface{}{
                            {"type": "text", "text": string(data)},
                        },
                    }
                    break
                }
            }

        case "book_table":
            result = map[string]interface{}{
                "content": []map[string]interface{}{
                    {"type": "text", "text": `{"status":"confirmed","booking_id":"BK-20260607-001"}`},
                },
            }
        }
    }

    resp := JSONRPCResponse{
        JSONRPC: "2.0",
        ID:      req.ID,
        Result:  result,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
}

func main() {
    server := NewRestaurantServer()
    http.HandleFunc("/mcp", server.handleMCP)
    fmt.Println("MCP Server 运行在 :8080/mcp")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

---

## 三、A2A：Agent 协调层

### 3.1 A2A 核心设计

A2A（Agent-to-Agent）解决多 Agent 系统中的**发现、通信和任务委派**问题。

**Agent Card — Agent 的"身份证"：**

每个 A2A Agent 在 `/.well-known/agent.json` 发布机器可读的描述：

```json
{
  "name": "restaurant-booking-agent",
  "description": "餐厅搜索和预订智能体",
  "url": "https://agent.example.com/a2a",
  "version": "1.0.0",
  "capabilities": {
    "streaming": true,
    "pushNotifications": false,
    "stateTransitionHistory": true,
    "extensions": ["a2ui-0.2"]
  },
  "skills": [
    {
      "id": "search-restaurants",
      "name": "搜索餐厅",
      "description": "按菜系、位置、日期搜索可用餐厅",
      "tags": ["restaurants", "dining", "search"]
    },
    {
      "id": "book-table",
      "name": "预订座位",
      "description": "为指定餐厅预订座位",
      "tags": ["booking", "reservations"]
    }
  ],
  "defaultInputModes": ["text/plain", "application/json"],
  "defaultOutputModes": ["text/plain", "application/json", "application/json+a2ui"]
}
```

### 3.2 任务生命周期

A2A 定义了严格的状态机：

```
                    ┌─────────────┐
                    │  submitted   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   working    │
                    └──┬──┬──┬───┘
                       │  │  │
              ┌────────┘  │  └────────┐
              ▼           ▼           ▼
       ┌────────────┐ ┌────────┐ ┌──────────────┐
       │ completed  │ │ failed │ │input-required│
       └────────────┘ └────────┘ └──────┬───────┘
                                      │ (用户输入后)
                                      │
                                      ▼
                                 ┌─────────┐
                                 │ working │
                                 └─────────┘
```

### 3.3 Go 语言 A2A Client 实现

```go
// a2a-client/client.go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

// A2A 任务状态
type TaskState string

const (
    TaskSubmitted     TaskState = "submitted"
    TaskWorking       TaskState = "working"
    TaskCompleted     TaskState = "completed"
    TaskFailed        TaskState = "failed"
    TaskInputRequired TaskState = "input-required"
    TaskCanceled      TaskState = "canceled"
)

// A2A 任务
type Task struct {
    ID        string                 `json:"id"`
    Status    TaskStatus             `json:"status"`
    Artifacts []Artifact             `json:"artifacts,omitempty"`
    History   []Message              `json:"history,omitempty"`
    MetaData  map[string]interface{} `json:"metadata,omitempty"`
}

type TaskStatus struct {
    State TaskState `json:"state"`
}

type Artifact struct {
    Parts []Part `json:"parts"`
}

type Part struct {
    Type     string          `json:"type"`
    MimeType string          `json:"mimeType,omitempty"`
    Text     string          `json:"text,omitempty"`
    Data     json.RawMessage `json:"data,omitempty"`
}

type Message struct {
    Role      string     `json:"role"`
    Parts     []Part     `json:"parts"`
}

// A2A Client
type A2AClient struct {
    baseURL    string
    httpClient *http.Client
}

func NewA2AClient(baseURL string) *A2AClient {
    return &A2AClient{
        baseURL:    baseURL,
        httpClient: &http.Client{},
    }
}

// SendTask 发送任务给远程 Agent
func (c *A2AClient) SendTask(message string) (*Task, error) {
    reqBody := map[string]interface{}{
        "jsonrpc": "2.0",
        "id":      generateID(),
        "method":  "tasks/send",
        "params": map[string]interface{}{
            "id": generateID(),
            "message": map[string]interface{}{
                "role":  "user",
                "parts": []map[string]string{{"type": "text", "text": message}},
            },
        },
    }

    data, _ := json.Marshal(reqBody)
    resp, err := c.httpClient.Post(c.baseURL, "application/json", bytes.NewReader(data))
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result struct {
        Result Task `json:"result"`
    }
    json.NewDecoder(resp.Body).Decode(&result)
    return &result.Result, nil
}

// GetTaskStatus 查询任务状态
func (c *A2AClient) GetTaskStatus(taskID string) (*Task, error) {
    reqBody := map[string]interface{}{
        "jsonrpc": "2.0",
        "id":      generateID(),
        "method":  "tasks/get",
        "params": map[string]interface{}{
            "id": taskID,
        },
    }

    data, _ := json.Marshal(reqBody)
    resp, err := c.httpClient.Post(c.baseURL, "application/json", bytes.NewReader(data))
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result struct {
        Result Task `json:"result"`
    }
    json.NewDecoder(resp.Body).Decode(&result)
    return &result.Result, nil
}

// SendTaskStream 流式获取任务结果（SSE）
func (c *A2AClient) SendTaskStream(message string, callback func(*Task)) error {
    reqBody := map[string]interface{}{
        "jsonrpc": "2.0",
        "id":      generateID(),
        "method":  "tasks/sendSubscribe",
        "params": map[string]interface{}{
            "id": generateID(),
            "message": map[string]interface{}{
                "role":  "user",
                "parts": []map[string]string{{"type": "text", "text": message}},
            },
        },
    }

    data, _ := json.Marshal(reqBody)
    resp, err := c.httpClient.Post(c.baseURL, "application/json", bytes.NewReader(data))
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    // 解析 SSE 事件流
    decoder := json.NewDecoder(resp.Body)
    for {
        var event struct {
            Result Task `json:"result"`
        }
        if err := decoder.Decode(&event); err != nil {
            if err == io.EOF {
                break
            }
            return err
        }
        callback(&event.Result)

        // 终态时退出
        if event.Result.Status.State == TaskCompleted ||
           event.Result.Status.State == TaskFailed ||
           event.Result.Status.State == TaskCanceled {
            break
        }
    }
    return nil
}

func generateID() string {
    return fmt.Sprintf("task-%d", time.Now().UnixNano())
}
```

---

## 四、A2UI：用户界面层

### 4.1 A2UI 设计哲学

A2UI 解决前两个协议未触及的问题：Agent 如何通过**富交互界面**与用户通信，而非仅仅返回纯文本。

**核心特性：**

| 特性 | 说明 |
|------|------|
| 声明式 | Agent 描述"展示什么"，渲染由客户端决定 |
| 传输无关 | 可通过 WebSocket、SSE、A2A 任何方式传输 |
| 安全沙箱 | 不允许脚本和原始 HTML |
| 平台原生 | 同一份 JSON 在不同平台原生渲染 |

### 4.2 A2UI 组件示例

```json
{
  "type": "updateComponents",
  "components": [
    {
      "type": "form",
      "id": "search-form",
      "title": "搜索餐厅",
      "fields": [
        {
          "type": "select",
          "id": "cuisine",
          "label": "菜系",
          "options": ["意大利", "日本料理", "墨西哥", "泰国", "法国"],
          "required": true
        },
        {
          "type": "date",
          "id": "date",
          "label": "日期",
          "required": true
        },
        {
          "type": "number",
          "id": "partySize",
          "label": "人数",
          "min": 1,
          "max": 20,
          "defaultValue": 2
        }
      ],
      "submitLabel": "搜索"
    },
    {
      "type": "card",
      "id": "restaurant-result",
      "title": "Trattoria Roma",
      "subtitle": "评分 4.8 - 意大利 - $$",
      "body": "今晚 7:30 有 4 人位可用",
      "actions": [
        {
          "type": "button",
          "label": "立即预订",
          "id": "book-now",
          "style": "primary"
        }
      ]
    }
  ]
}
```

---

## 五、三协议协同实战：多 Agent 餐厅预订系统

### 5.1 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     用户浏览器（A2UI Client）                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  [搜索表单]  →  [餐厅列表]  →  [确认预订]  →  [成功]    │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ A2UI (声明式 JSON)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   编排 Agent（Orchestrator）                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  任务分发     │  │  结果聚合     │  │  A2UI 生成   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└──────┬──────────────────┬────────────────────┬──────────────┘
       │ A2A              │ A2A                │
       ▼                  ▼                    ▼
┌────────────┐   ┌────────────┐        ┌────────────┐
│ 餐厅 Agent  │   │ 预订 Agent  │        │ 评价 Agent  │
│            │   │            │        │            │
│  ┌──────┐  │   │  ┌──────┐  │        │  ┌──────┐  │
│  │ MCP  │  │   │  │ MCP  │  │        │  │ MCP  │  │
│  │Client│  │   │  │Client│  │        │  │Client│  │
│  └──┬───┘  │   │  └──┬───┘  │        │  └──┬───┘  │
└─────┼──────┘   └─────┼──────┘        └─────┼──────┘
      │                │                      │
      ▼                ▼                      ▼
┌───────────┐   ┌───────────┐         ┌───────────┐
│ MCP Server│   │ MCP Server│         │ MCP Server│
│ (餐厅DB)  │   │ (预订DB)  │         │ (评价API) │
└───────────┘   └───────────┘         └───────────┘
```

### 5.2 编排 Agent 核心逻辑

```go
// orchestrator/main.go
package main

import (
    "encoding/json"
    "fmt"
    "log"
)

type Orchestrator struct {
    restaurantClient *A2AClient
    bookingClient    *A2AClient
    reviewClient     *A2AClient
}

func NewOrchestrator() *Orchestrator {
    return &Orchestrator{
        restaurantClient: NewA2AClient("http://localhost:8081/a2a"),
        bookingClient:    NewA2AClient("http://localhost:8082/a2a"),
        reviewClient:     NewA2AClient("http://localhost:8083/a2a"),
    }
}

// HandleSearch 处理餐厅搜索请求
func (o *Orchestrator) HandleSearch(cuisine, date string, partySize int) (string, error) {
    // Step 1: 通过 A2A 委派给餐厅 Agent
    message := fmt.Sprintf(
        `搜索%s菜系的餐厅，日期%s，%d人用餐`,
        cuisine, date, partySize,
    )
    task, err := o.restaurantClient.SendTask(message)
    if err != nil {
        return "", fmt.Errorf("餐厅搜索失败: %w", err)
    }

    // Step 2: 如果有结果，同时查询评价
    if task.Status.State == TaskCompleted && len(task.Artifacts) > 0 {
        restaurants := parseRestaurants(task.Artifacts[0])
        for _, r := range restaurants {
            go func(id string) {
                reviewMsg := fmt.Sprintf("查询餐厅 %s 的最新评价", id)
                o.reviewClient.SendTask(reviewMsg)
            }(r.ID)
        }
    }

    // Step 3: 构建 A2UI 响应
    a2uiResponse := buildSearchResultUI(task)
    return a2uiResponse, nil
}

// HandleBooking 处理预订请求
func (o *Orchestrator) HandleBooking(restaurantID, date, time string, partySize int) (string, error) {
    // 通过 A2A 委派给预订 Agent
    message := fmt.Sprintf(
        `预订餐厅 %s，日期 %s 时间 %s，%d 人`,
        restaurantID, date, time, partySize,
    )

    // 使用流式获取预订进度
    var finalTask *Task
    err := o.bookingClient.SendTaskStream(message, func(task *Task) {
        // 实时推送进度给前端
        finalTask = task
        log.Printf("预订状态: %s", task.Status.State)
    })
    if err != nil {
        return "", fmt.Errorf("预订失败: %w", err)
    }

    return buildBookingConfirmationUI(finalTask), nil
}

func buildSearchResultUI(task *Task) string {
    ui := map[string]interface{}{
        "type": "updateComponents",
        "components": []map[string]interface{}{
            {
                "type":  "text",
                "id":    "status",
                "value": "找到以下餐厅：",
            },
            {
                "type":    "list",
                "id":      "results",
                "items":   extractRestaurants(task),
            },
        },
    }
    data, _ := json.Marshal(ui)
    return string(data)
}
```

---

## 六、Go 语言实现 MCP Server

### 6.1 使用官方 SDK

```go
// go get github.com/mark3labs/mcp-go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/mark3labs/mcp-go/mcp"
    "github.com/mark3labs/mcp-go/server"
)

func main() {
    // 创建 MCP Server
    s := server.NewMCPServer(
        "my-tools",
        "1.0.0",
        server.WithToolCapabilities(false),
    )

    // 注册工具：代码搜索
    searchTool := mcp.NewTool(
        "search_code",
        mcp.WithDescription("在代码库中搜索代码片段"),
        mcp.WithString("query",
            mcp.Required(),
            mcp.Description("搜索关键词"),
        ),
        mcp.WithString("language",
            mcp.Description("编程语言过滤"),
        ),
    )
    s.AddTool(searchTool, searchCodeHandler)

    // 注册工具：文件读取
    readTool := mcp.NewTool(
        "read_file",
        mcp.WithDescription("读取文件内容"),
        mcp.WithString("path",
            mcp.Required(),
            mcp.Description("文件路径"),
        ),
    )
    s.AddTool(readTool, readFileHandler)

    // 注册资源
    s.AddResource(
        mcp.NewResource(
            "config://app",
            "Application Config",
            mcp.WithMIMEType("application/json"),
        ),
        configResourceHandler,
    )

    // 启动 stdio 传输
    if err := server.ServeStdio(s); err != nil {
        log.Fatal(err)
    }
}

func searchCodeHandler(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
    query := request.Params.Arguments["query"].(string)
    lang, _ := request.Params.Arguments["language"].(string)

    // 实际搜索逻辑
    results := performCodeSearch(query, lang)

    return mcp.NewTextResult(fmt.Sprintf("找到 %d 个结果：\n%s", len(results), results)), nil
}

func readFileHandler(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
    path := request.Params.Arguments["path"].(string)
    content, err := readFileContent(path)
    if err != nil {
        return mcp.NewTextResult(fmt.Sprintf("错误: %v", err)), nil
    }
    return mcp.NewTextResult(content), nil
}
```

---

## 七、三种架构模式对比

| 特性 | 单 Agent + MCP | 多 Agent + A2A | 全栈三协议 |
|------|---------------|----------------|-----------|
| **复杂度** | 低 | 中 | 高 |
| **Agent 数量** | 1 | 2-N | 2-N |
| **UI 交互** | 纯文本 | 纯文本 | 富交互 |
| **工具集成** | MCP | 每个Agent各有MCP | 每个Agent各有MCP |
| **适用场景** | 聊天机器人 | 后端多Agent | 生产级应用 |
| **示例** | 编程助手 | 内容创作流水线 | 企业助手 |

**选型建议：**

```
问自己三个问题：

1. 需要多个专业 Agent 吗？
   └── 否 → 单 Agent + MCP 足够
   └── 是 ↓

2. 需要富交互界面吗？
   └── 否 → 多 Agent + MCP + A2A
   └── 是 → 全栈 MCP + A2A + A2UI
```

---

## 八、渐进式采纳策略

不需要一步到位采用全部三个协议，推荐**渐进式迁移**：

```
Stage 1: MCP Only（1-2 周）
├── 将现有工具函数包装为 MCP Server
├── Agent 通过 MCP 调用工具
└── 成本最低，收益最快

Stage 2: + A2A（2-4 周）
├── 拆分单体 Agent 为多个专业 Agent
├── 实现 Agent Card 发现机制
├── 实现任务委派和状态追踪
└── 适合团队协作场景

Stage 3: + A2UI（2-4 周）
├── Agent 生成声明式 UI 组件
├── 客户端实现组件渲染器
└── 适合需要表单、卡片等富交互的应用
```

---

## 九、最佳实践与踩坑指南

### 9.1 MCP 最佳实践

```go
// ✅ 正确：工具保持原子化
tool("search_restaurants", ...) // 只做搜索
tool("book_table", ...)         // 只做预订

// ❌ 错误：一个工具做太多事
tool("restaurant_ops", ...) // 搜索 + 预订 + 取消 + 评价
```

### 9.2 A2A 踩坑要点

```go
// ✅ 正确：实现超时和重试
func (c *A2AClient) SendTaskWithRetry(msg string, maxRetries int) (*Task, error) {
    var lastErr error
    for i := 0; i < maxRetries; i++ {
        task, err := c.SendTask(msg)
        if err == nil {
            return task, nil
        }
        lastErr = err
        time.Sleep(time.Duration(i+1) * time.Second) // 指数退避
    }
    return nil, fmt.Errorf("after %d retries: %w", maxRetries, lastErr)
}

// ✅ 正确：处理 input-required 状态
switch task.Status.State {
case TaskCompleted:
    return task, nil
case TaskInputRequired:
    // 向用户收集额外输入后重新提交
    return nil, ErrNeedsInput
case TaskFailed:
    return nil, fmt.Errorf("task failed")
}
```

### 9.3 A2UI 注意事项

- **绝不信任 Agent 返回的 UI**：始终在客户端做安全校验
- **提供降级方案**：如果客户端不支持某组件类型，显示文本摘要
- **限制组件嵌套深度**：防止 Agent 生成过深的 UI 树

### 9.4 性能参考

| 协议 | 额外开销 |
|------|---------|
| MCP 工具调用 | ~1-5ms |
| A2A 通信 | ~网络往返延迟 |
| A2UI 序列化 | ~1ms |

> Agent 系统的瓶颈永远是 **LLM 推理**（通常 500ms-5s），协议开销可忽略不计。



## 相关阅读

- [MCP 服务器开发实战：构建 AI 编程助手扩展](/data/automation/mcp-server-development)
- [关于PFinalClub - 后端 + DevOps + AI 工程实践技术博客](/about)
- [联系我们 - 与PFinalClub取得联系](/contact)
## 参考资料

- [MCP 官方规范](https://modelcontextprotocol.io/)
- [A2A 协议指南](https://a2a-protocol.org/)
- [A2UI 协议规范](https://github.com/nickarora/a2ui)
- [mcp-go SDK](https://github.com/mark3labs/mcp-go)
- [MCP 2026 Roadmap](https://a2a-mcp.org/blog/mcp-2026-roadmap)
