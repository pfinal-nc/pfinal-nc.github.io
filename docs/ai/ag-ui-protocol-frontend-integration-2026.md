---
title: "AG-UI 协议实战：让 AI Agent 与前端无缝对话的完整指南"
date: 2026-06-15
tags:
  - ai
  - mcp
  - ag-ui
  - agent
  - frontend
keywords:
  - ai
  - AG-UI
  - MCP
  - A2A
  - Agent前端交互
  - 流式事件
category: ai
description: "从零到一实战 AG-UI 协议，打通 AI Agent 与前端的最后一公里。涵盖协议原理、事件类型、React/Vue 集成、与 MCP/A2A 协作，以及生产级架构设计。"
---

# AG-UI 协议实战：让 AI Agent 与前端无缝对话的完整指南

## 引言

2026 年的 AI Agent 生态已经有了三把钥匙：**MCP** 连接 Agent 与工具，**A2A** 连接 Agent 与 Agent，但 Agent 与用户界面的交互一直缺少一个标准。每个框架各搞一套 SSE/WebSocket 格式，前端开发者苦不堪言。

**AG-UI（Agent-User Interaction Protocol）** 正是为解决这个问题而生的开放标准。由 CopilotKit 团队发起，它定义了 Agent 与前端应用之间基于事件的流式通信协议。本文将从原理到实战，带你构建一个完整的 AG-UI 应用。

## 1. AI Agent 协议三件套

### 1.1 定位对比

```
┌───────────────────────────────────────────────┐
│           AI Agent 完整交互架构                 │
│                                               │
│   [用户界面] ←── AG-UI ──→ [AI Agent]         │
│                               ↕               │
│   [AI Agent] ←── A2A ──→ [其他 Agent]         │
│                               ↕               │
│   [AI Agent] ←── MCP ──→ [外部工具/数据]       │
│                                               │
│   AG-UI：Agent ↔ 前端（用户交互层）            │
│   A2A：Agent ↔ Agent（协作层）                 │
│   MCP：Agent ↔ 工具（能力层）                  │
└───────────────────────────────────────────────┘
```

| 协议 | 连接对象 | 传输方式 | 核心职责 |
|------|---------|---------|---------|
| MCP | Agent ↔ 工具/数据源 | JSON-RPC | 调用外部工具、访问数据 |
| A2A | Agent ↔ Agent | HTTP + JSON | Agent 间协作、任务委派 |
| AG-UI | Agent ↔ 前端 | SSE/WebSocket 事件流 | 流式展示、状态同步、用户交互 |

### 1.2 为什么不用 SSE/WebSocket 直接对接？

传统方式下，前端与 Agent 的通信面临三个核心问题：

1. **格式不统一**：LangChain 输出 JSON，AutoGen 用 protobuf，CrewAI 又是自定义格式
2. **状态不同步**：Agent 内部有"思考中"、"调用工具"、"生成回复"等多种状态，前端无法感知
3. **交互不支持**：Agent 执行中途需要用户确认、选择，传统 SSE 是单向的

AG-UI 通过标准化事件类型解决这三个问题。

## 2. AG-UI 协议核心

### 2.1 事件驱动架构

AG-UI 的核心是一个**有限事件集合**，所有 Agent-前端交互都通过这些事件表达：

```
┌──────────────────────────────────────────┐
│           AG-UI 事件类型                   │
├──────────────────────────────────────────┤
│                                          │
│  生命周期事件                             │
│    ├─ RUN_STARTED      运行开始          │
│    ├─ RUN_FINISHED     运行完成          │
│    └─ RUN_ERROR        运行出错          │
│                                          │
│  文本生成事件                             │
│    ├─ TEXT_MESSAGE_START  文本开始       │
│    ├─ TEXT_MESSAGE_CONTENT 文本内容片段  │
│    └─ TEXT_MESSAGE_END    文本结束       │
│                                          │
│  工具调用事件                             │
│    ├─ TOOL_CALL_START   工具调用开始     │
│    ├─ TOOL_CALL_ARGS    工具参数片段     │
│    └─ TOOL_CALL_END     工具调用结束     │
│                                          │
│  状态管理事件                             │
│    ├─ STATE_SNAPSHOT    完整状态快照     │
│    └─ STATE_DELTA       状态增量更新     │
│                                          │
│  交互事件                                 │
│    └─ TOOL_CALL_END + awaiting_response  │
│       (需要用户确认的工具调用)             │
│                                          │
│  步骤事件                                 │
│    ├─ STEP_STARTED      步骤开始         │
│    └─ STEP_FINISHED     步骤完成         │
│                                          │
└──────────────────────────────────────────┘
```

### 2.2 事件传输格式

AG-UI 事件使用 SSE 传输，每个事件的格式如下：

```
event: <event_type>
data: <json_payload>
```

示例——文本生成流：

```
event: TEXT_MESSAGE_START
data: {"messageId": "msg-001", "role": "assistant"}

event: TEXT_MESSAGE_CONTENT
data: {"messageId": "msg-001", "content": "根据"}

event: TEXT_MESSAGE_CONTENT
data: {"messageId": "msg-001", "content": "您的需求"}

event: TEXT_MESSAGE_CONTENT
data: {"messageId": "msg-001", "content": "，我来查询..."}

event: TEXT_MESSAGE_END
data: {"messageId": "msg-001"}
```

工具调用流：

```
event: TOOL_CALL_START
data: {"toolCallId": "tc-001", "toolName": "search_database", "awaitingResponse": false}

event: TOOL_CALL_ARGS
data: {"toolCallId": "tc-001", "delta": "{\"query\":"}

event: TOOL_CALL_ARGS
data: {"toolCallId": "tc-001", "delta": "\"用户活跃度\"}"}

event: TOOL_CALL_END
data: {"toolCallId": "tc-001"}
```

### 2.3 需要用户确认的交互

AG-UI 最重要的创新是**双向交互**——Agent 可以在前端展示工具调用，并等待用户确认：

```
event: TOOL_CALL_START
data: {"toolCallId": "tc-002", "toolName": "send_email", "awaitingResponse": true}

event: TOOL_CALL_ARGS
data: {"toolCallId": "tc-002", "delta": "{\"to\":\"boss@company.com\",\"subject\":\"Report\"}"}

event: TOOL_CALL_END
data: {"toolCallId": "tc-002", "awaitingResponse": true}
```

前端收到 `awaitingResponse: true` 后，展示确认对话框，用户点击"确认"后发送：

```
POST /agents/{agentId}/tool-response
{
    "toolCallId": "tc-002",
    "approved": true
}
```

## 3. 后端实战：构建 AG-UI Agent Server

### 3.1 项目结构

```
ag-ui-demo/
├── server/
│   ├── main.go
│   ├── agent/
│   │   ├── handler.go      # AG-UI 事件处理器
│   │   ├── executor.go     # Agent 执行逻辑
│   │   └── tools.go        # MCP 工具集成
│   └── go.mod
├── frontend/
│   ├── src/
│   │   ├── App.vue
│   │   ├── composables/
│   │   │   └── useAgent.ts  # AG-UI Vue 组合式函数
│   │   └── components/
│   │       ├── ChatPanel.vue
│   │       └── ToolConfirm.vue
│   └── package.json
└── README.md
```

### 3.2 Go 后端实现

```go
// server/agent/handler.go
package agent

import (
    "encoding/json"
    "fmt"
    "net/http"
)

// AG-UI 事件类型
const (
    EventRunStarted      = "RUN_STARTED"
    EventRunFinished     = "RUN_FINISHED"
    EventRunError        = "RUN_ERROR"
    EventTextStart       = "TEXT_MESSAGE_START"
    EventTextContent     = "TEXT_MESSAGE_CONTENT"
    EventTextEnd         = "TEXT_MESSAGE_END"
    EventToolCallStart   = "TOOL_CALL_START"
    EventToolCallArgs    = "TOOL_CALL_ARGS"
    EventToolCallEnd     = "TOOL_CALL_END"
    EventStateSnapshot   = "STATE_SNAPSHOT"
    EventStepStarted     = "STEP_STARTED"
    EventStepFinished    = "STEP_FINISHED"
)

// Event AG-UI 事件
type Event struct {
    Type    string          `json:"-"`
    Payload json.RawMessage `json:"-"`
}

// RunRequest 运行请求
type RunRequest struct {
    ThreadID  string            `json:"threadId"`
    RunID     string            `json:"runId"`
    Messages  []Message         `json:"messages"`
    Tools     []ToolDefinition  `json:"tools"`
    State     json.RawMessage   `json:"state,omitempty"`
}

// Message 消息
type Message struct {
    ID      string `json:"id"`
    Role    string `json:"role"`
    Content string `json:"content"`
}

// ToolDefinition 工具定义
type ToolDefinition struct {
    Name        string `json:"name"`
    Description string `json:"description"`
    Parameters  any    `json:"parameters"`
}

// SSEWriter SSE 写入器
type SSEWriter struct {
    w http.ResponseWriter
    f http.Flusher
}

func NewSSEWriter(w http.ResponseWriter) (*SSEWriter, error) {
    f, ok := w.(http.Flusher)
    if !ok {
        return nil, fmt.Errorf("streaming not supported")
    }

    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")
    w.Header().Set("X-Accel-Buffering", "no") // Nginx 兼容

    return &SSEWriter{w: w, f: f}, nil
}

// SendEvent 发送 AG-UI 事件
func (s *SSEWriter) SendEvent(eventType string, payload any) error {
    data, err := json.Marshal(payload)
    if err != nil {
        return fmt.Errorf("marshal payload: %w", err)
    }

    fmt.Fprintf(s.w, "event: %s\ndata: %s\n\n", eventType, data)
    s.f.Flush()
    return nil
}
```

### 3.3 Agent 执行器

```go
// server/agent/executor.go
package agent

import (
    "context"
    "fmt"
    "math/rand"
    "strings"
    "time"
)

// Executor Agent 执行器
type Executor struct {
    tools map[string]ToolFunc
}

// ToolFunc 工具函数
type ToolFunc func(ctx context.Context, args json.RawMessage) (string, error)

// NewExecutor 创建执行器
func NewExecutor() *Executor {
    e := &Executor{
        tools: make(map[string]ToolFunc),
    }
    // 注册内置工具
    e.tools["search"] = e.searchTool
    e.tools["calculate"] = e.calculateTool
    e.tools["send_email"] = e.sendEmailTool
    return e
}

// Run 执行 Agent 运行
func (e *Executor) Run(ctx context.Context, req RunRequest, sse *SSEWriter) error {
    runID := fmt.Sprintf("run-%d", time.Now().UnixNano())

    // 1. 发送运行开始事件
    sse.SendEvent(EventRunStarted, map[string]any{
        "threadId": req.ThreadID,
        "runId":    runID,
    })

    // 2. 获取用户最后一条消息
    var userMsg string
    for i := len(req.Messages) - 1; i >= 0; i-- {
        if req.Messages[i].Role == "user" {
            userMsg = req.Messages[i].Content
            break
        }
    }

    // 3. 模拟 Agent 思考和工具调用
    // 步骤 1：理解意图
    sse.SendEvent(EventStepStarted, map[string]any{
        "stepName": "理解用户意图",
    })
    time.Sleep(100 * time.Millisecond)
    sse.SendEvent(EventStepFinished, map[string]any{
        "stepName": "理解用户意图",
    })

    // 步骤 2：调用搜索工具
    toolCallID := fmt.Sprintf("tc-%d", rand.Int63())
    sse.SendEvent(EventToolCallStart, map[string]any{
        "toolCallId":       toolCallID,
        "toolName":         "search",
        "awaitingResponse": false,
    })
    sse.SendEvent(EventToolCallArgs, map[string]any{
        "toolCallId": toolCallID,
        "delta":      `{"query":"` + userMsg + `"}`,
    })
    sse.SendEvent(EventToolCallEnd, map[string]any{
        "toolCallId": toolCallID,
    })

    // 步骤 3：生成回复文本
    msgID := fmt.Sprintf("msg-%d", rand.Int63())
    sse.SendEvent(EventTextStart, map[string]any{
        "messageId": msgID,
        "role":      "assistant",
    })

    reply := fmt.Sprintf("关于「%s」，我找到了以下信息：\n\n1. 根据搜索结果，这是一个常见的技术问题。\n2. 建议参考官方文档获取最新信息。\n3. 如需进一步操作，我可以帮您发送邮件确认。", userMsg)

    // 模拟流式输出
    words := strings.Split(reply, "")
    for i, word := range words {
        sse.SendEvent(EventTextContent, map[string]any{
            "messageId": msgID,
            "content":   word,
        })
        // 模拟打字效果
        if i%3 == 0 {
            time.Sleep(20 * time.Millisecond)
        }
    }

    sse.SendEvent(EventTextEnd, map[string]any{
        "messageId": msgID,
    })

    // 4. 发送运行完成事件
    sse.SendEvent(EventRunFinished, map[string]any{
        "threadId": req.ThreadID,
        "runId":    runID,
    })

    return nil
}

func (e *Executor) searchTool(ctx context.Context, args json.RawMessage) (string, error) {
    return `{"results": ["结果1", "结果2", "结果3"]}`, nil
}

func (e *Executor) calculateTool(ctx context.Context, args json.RawMessage) (string, error) {
    return `{"result": 42}`, nil
}

func (e *Executor) sendEmailTool(ctx context.Context, args json.RawMessage) (string, error) {
    return `{"sent": true, "messageId": "email-001"}`, nil
}
```

### 3.4 HTTP 路由

```go
// server/main.go
package main

import (
    "encoding/json"
    "log"
    "net/http"

    "ag-ui-demo/server/agent"
)

func main() {
    executor := agent.NewExecutor()

    // AG-UI 标准 endpoint
    http.HandleFunc("/agents/chat/run", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
            http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
            return
        }

        var req agent.RunRequest
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
            http.Error(w, err.Error(), http.StatusBadRequest)
            return
        }

        sse, err := agent.NewSSEWriter(w)
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }

        if err := executor.Run(r.Context(), req, sse); err != nil {
            log.Printf("Agent execution error: %v", err)
        }
    })

    // 工具确认 endpoint
    http.HandleFunc("/agents/chat/tool-response", func(w http.ResponseWriter, r *http.Request) {
        var resp struct {
            ToolCallID string `json:"toolCallId"`
            Approved   bool   `json:"approved"`
        }
        if err := json.NewDecoder(r.Body).Decode(&resp); err != nil {
            http.Error(w, err.Error(), http.StatusBadRequest)
            return
        }
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]bool{"ok": true})
    })

    log.Println("AG-UI Agent Server running on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

## 4. 前端实战：Vue 3 集成

### 4.1 AG-UI 组合式函数

```typescript
// frontend/src/composables/useAgent.ts
import { ref, reactive } from 'vue'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
}

interface ToolCall {
  id: string
  name: string
  args: string
  status: 'running' | 'completed' | 'awaiting_response'
  result?: string
}

interface AgentState {
  status: 'idle' | 'running' | 'error'
  currentStep: string | null
  messages: Message[]
}

export function useAgent(agentUrl: string) {
  const state = reactive<AgentState>({
    status: 'idle',
    currentStep: null,
    messages: [],
  })

  const threadId = crypto.randomUUID()

  // 发送消息并接收 AG-UI 事件流
  async function sendMessage(content: string) {
    // 添加用户消息
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    }
    state.messages.push(userMsg)
    state.status = 'running'

    const response = await fetch(`${agentUrl}/agents/chat/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadId,
        runId: crypto.randomUUID(),
        messages: state.messages,
      }),
    })

    if (!response.ok || !response.body) {
      state.status = 'error'
      return
    }

    // 解析 SSE 事件流
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let currentMessage: Message | null = null
    let currentToolCall: ToolCall | null = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      let currentEventType = ''

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEventType = line.slice(7).trim()
        } else if (line.startsWith('data: ')) {
          const payload = JSON.parse(line.slice(6))

          switch (currentEventType) {
            case 'RUN_STARTED':
              state.status = 'running'
              break

            case 'TEXT_MESSAGE_START':
              currentMessage = {
                id: payload.messageId,
                role: payload.role,
                content: '',
              }
              state.messages.push(currentMessage)
              break

            case 'TEXT_MESSAGE_CONTENT':
              if (currentMessage) {
                currentMessage.content += payload.content
              }
              break

            case 'TEXT_MESSAGE_END':
              currentMessage = null
              break

            case 'TOOL_CALL_START':
              currentToolCall = {
                id: payload.toolCallId,
                name: payload.toolName,
                args: '',
                status: payload.awaitingResponse
                  ? 'awaiting_response'
                  : 'running',
              }
              // 添加到最后一条 assistant 消息
              const lastMsg = state.messages[state.messages.length - 1]
              if (lastMsg && lastMsg.role === 'assistant') {
                if (!lastMsg.toolCalls) lastMsg.toolCalls = []
                lastMsg.toolCalls.push(currentToolCall)
              }
              break

            case 'TOOL_CALL_ARGS':
              if (currentToolCall) {
                currentToolCall.args += payload.delta
              }
              break

            case 'TOOL_CALL_END':
              if (currentToolCall) {
                currentToolCall.status =
                  currentToolCall.status === 'awaiting_response'
                    ? 'awaiting_response'
                    : 'completed'
              }
              currentToolCall = null
              break

            case 'STEP_STARTED':
              state.currentStep = payload.stepName
              break

            case 'STEP_FINISHED':
              state.currentStep = null
              break

            case 'RUN_FINISHED':
              state.status = 'idle'
              break

            case 'RUN_ERROR':
              state.status = 'error'
              console.error('Agent error:', payload)
              break
          }
        }
      }
    }
  }

  // 确认工具调用
  async function confirmToolCall(toolCallId: string, approved: boolean) {
    await fetch(`${agentUrl}/agents/chat/tool-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolCallId, approved }),
    })

    // 更新本地状态
    for (const msg of state.messages) {
      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          if (tc.id === toolCallId) {
            tc.status = approved ? 'completed' : 'completed'
          }
        }
      }
    }
  }

  return {
    state,
    sendMessage,
    confirmToolCall,
  }
}
```

### 4.2 Vue 组件

```vue
<!-- frontend/src/components/ChatPanel.vue -->
<template>
  <div class="chat-panel">
    <div class="messages">
      <div
        v-for="msg in state.messages"
        :key="msg.id"
        :class="['message', msg.role]"
      >
        <div class="avatar">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
        <div class="content">
          <div class="text" v-html="renderMarkdown(msg.content)"></div>

          <!-- 工具调用展示 -->
          <div v-if="msg.toolCalls?.length" class="tool-calls">
            <div
              v-for="tc in msg.toolCalls"
              :key="tc.id"
              class="tool-call"
              :class="tc.status"
            >
              <div class="tool-header">
                <span class="tool-icon">🔧</span>
                <span class="tool-name">{{ tc.name }}</span>
                <span class="tool-status">
                  {{ statusLabel(tc.status) }}
                </span>
              </div>
              <div class="tool-args">
                <code>{{ formatArgs(tc.args) }}</code>
              </div>

              <!-- 确认对话框 -->
              <div v-if="tc.status === 'awaiting_response'" class="confirm">
                <p>Agent 请求执行此操作，是否确认？</p>
                <button @click="confirm(tc.id, true)" class="btn-approve">
                  确认执行
                </button>
                <button @click="confirm(tc.id, false)" class="btn-reject">
                  拒绝
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 状态指示器 -->
    <div v-if="state.status === 'running'" class="status-bar">
      <span class="spinner"></span>
      <span v-if="state.currentStep">
        {{ state.currentStep }}
      </span>
      <span v-else>Agent 思考中...</span>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <input
        v-model="inputText"
        @keyup.enter="send"
        :disabled="state.status === 'running'"
        placeholder="输入消息..."
      />
      <button @click="send" :disabled="state.status === 'running'">
        发送
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAgent } from '../composables/useAgent'

const AGENT_URL = 'http://localhost:8080'
const { state, sendMessage, confirmToolCall } = useAgent(AGENT_URL)

const inputText = ref('')

async function send() {
  const text = inputText.value.trim()
  if (!text) return
  inputText.value = ''
  await sendMessage(text)
}

function confirm(toolCallId: string, approved: boolean) {
  confirmToolCall(toolCallId, approved)
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    running: '执行中...',
    completed: '已完成',
    awaiting_response: '等待确认',
  }
  return labels[status] || status
}

function formatArgs(args: string) {
  try {
    return JSON.stringify(JSON.parse(args), null, 2)
  } catch {
    return args
  }
}

function renderMarkdown(text: string) {
  // 简单 Markdown 渲染（生产环境建议用 marked）
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}
</script>

<style scoped>
.chat-panel {
  max-width: 800px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.message.user {
  flex-direction: row-reverse;
}

.message.user .content {
  background: #2563eb;
  color: white;
  border-radius: 16px 16px 4px 16px;
}

.message.assistant .content {
  background: #f3f4f6;
  border-radius: 16px 16px 16px 4px;
}

.content {
  padding: 12px 16px;
  max-width: 70%;
}

.tool-calls {
  margin-top: 8px;
  border-top: 1px solid #e5e7eb;
  padding-top: 8px;
}

.tool-call {
  background: #fefce8;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 8px 12px;
  margin-top: 4px;
}

.tool-call.completed {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.tool-call.awaiting_response {
  background: #fef2f2;
  border-color: #fecaca;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.confirm {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-approve { background: #22c55e; color: white; }
.btn-reject { background: #ef4444; color: white; }

.status-bar {
  padding: 8px 16px;
  background: #f9fafb;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6b7280;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.input-area {
  display: flex;
  padding: 12px;
  border-top: 1px solid #e5e7eb;
}

.input-area input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
}

.input-area button {
  margin-left: 8px;
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
</style>
```

## 5. React 集成（对照实现）

```tsx
// frontend/src/hooks/useAgent.ts (React 版本)
import { useState, useCallback, useRef } from 'react'

interface UseAgentOptions {
  agentUrl: string
}

export function useAgent({ agentUrl }: UseAgentOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle')
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const threadIdRef = useRef(crypto.randomUUID())

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    }
    setMessages(prev => [...prev, userMsg])
    setStatus('running')

    try {
      const response = await fetch(`${agentUrl}/agents/chat/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: threadIdRef.current,
          runId: crypto.randomUUID(),
          messages: [...messages, userMsg],
        }),
      })

      if (!response.body) return

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        // ... SSE 解析逻辑与 Vue 版本一致
      }
    } catch (err) {
      setStatus('error')
    }
  }, [agentUrl, messages])

  return { messages, status, currentStep, sendMessage }
}
```

## 6. 生产级架构设计

### 6.1 完整架构

```
┌──────────────────────────────────────────────────┐
│                   前端应用                         │
│  ┌──────────────────────────────────────────┐    │
│  │   AG-UI Client SDK                       │    │
│  │   ├─ SSE 连接管理                        │    │
│  │   ├─ 事件解析器                          │    │
│  │   ├─ 状态管理                            │    │
│  │   └─ UI 组件（Chat/ToolConfirm/Step）    │    │
│  └──────────────────────────────────────────┘    │
│                       │ SSE                      │
└───────────────────────┼──────────────────────────┘
                        │
┌───────────────────────┼──────────────────────────┐
│              AG-UI Gateway                        │
│  ┌──────────────────────────────────────────┐    │
│  │   ├─ 认证 & 授权                         │    │
│  │   ├─ 限流                                │    │
│  │   ├─ 会话管理                            │    │
│  │   └─ 路由 → Agent 实例                   │    │
│  └──────────────────────────────────────────┘    │
└───────────────────────┼──────────────────────────┘
                        │
┌───────────────────────┼──────────────────────────┐
│              Agent Runtime                        │
│  ┌─────────────┐  ┌─────────────┐               │
│  │ Agent A     │  │ Agent B     │               │
│  │ (LLM+Logic)│  │ (LLM+Logic)│               │
│  └──────┬──────┘  └──────┬──────┘               │
│         │                │                       │
│    MCP Client       A2A Client                  │
│         │                │                       │
└─────────┼────────────────┼───────────────────────┘
          │                │
   ┌──────┴──────┐  ┌──────┴──────┐
   │  MCP Server │  │  Other      │
   │  (工具/数据) │  │  Agents     │
   └─────────────┘  └─────────────┘
```

### 6.2 关键设计决策

| 决策点 | 推荐方案 | 理由 |
|--------|---------|------|
| 传输协议 | SSE（优先）/ WebSocket | SSE 天然支持事件流，兼容 CDN |
| 状态管理 | STATE_SNAPSHOT + STATE_DELTA | 全量+增量结合，平衡性能与一致性 |
| 工具确认 | awaitingResponse + POST | 非阻塞式交互，不中断 Agent 运行 |
| 多 Agent | A2A 协议 + AG-UI Gateway | Gateway 路由到不同 Agent |
| 安全 | JWT + CORS + Rate Limit | 标准 Web 安全实践 |

### 6.3 可靠性保障

```go
// 连接断开重连 + 事件回放
type ReconnectManager struct {
    lastEventID string
    onReconnect func(lastEventID string)
}

func (r *ReconnectManager) Connect(url string) {
    for {
        req, _ := http.NewRequest("GET", url, nil)
        if r.lastEventID != "" {
            req.Header.Set("Last-Event-ID", r.lastEventID)
        }

        resp, err := http.DefaultClient.Do(req)
        if err != nil {
            time.Sleep(2 * time.Second)
            continue
        }

        // 解析 SSE 事件...
        // 记录 lastEventID
        // 如果断开，自动重连
    }
}
```

## 7. AG-UI 与 MCP/A2A 的协作实战

### 7.1 完整交互流程

```
用户: "帮我查一下最近7天的服务器日志，如果发现异常就发邮件通知运维团队"

[AG-UI] → 前端展示: Agent 开始思考
[MCP]  → Agent 调用: log_search 工具查询日志
[AG-UI] → 前端展示: 🔧 正在调用 log_search...
[AG-UI] → 前端展示: 发现 3 个异常事件
[A2A]  → Agent 委派: 通知运维 Agent 准备发送邮件
[AG-UI] → 前端展示: 🔧 准备发送邮件 (等待确认)
用户: [点击确认]
[AG-UI] → Agent 收到确认
[MCP]  → Agent 调用: send_email 工具
[AG-UI] → 前端展示: ✅ 邮件已发送
```

### 7.2 代码实现

```go
// 多协议协作的 Agent 执行逻辑
func (e *Executor) RunWithProtocols(ctx context.Context, req RunRequest, sse *SSEWriter) error {
    // ... 初始化

    // 步骤 1: 通过 MCP 查询日志
    sse.SendEvent(EventToolCallStart, map[string]any{
        "toolCallId":       "tc-search",
        "toolName":         "log_search",
        "awaitingResponse": false,
    })
    sse.SendEvent(EventToolCallArgs, map[string]any{
        "toolCallId": "tc-search",
        "delta":      `{"query":"异常错误","days":7}`,
    })

    // 调用 MCP Server
    searchResult, _ := e.mcpClient.CallTool(ctx, "log_search", map[string]any{
        "query": "异常错误",
        "days":  7,
    })

    sse.SendEvent(EventToolCallEnd, map[string]any{
        "toolCallId": "tc-search",
    })

    // 步骤 2: 如果发现异常，通过 A2A 委派运维 Agent
    if hasAnomalies(searchResult) {
        // A2A 通信
        opsResult, _ := e.a2aClient.SendMessage(ctx, A2AMessage{
            TargetAgent: "ops-agent",
            Task:        "prepare_email_notification",
            Data:        searchResult,
        })

        // 步骤 3: 通过 AG-UI 请求用户确认
        sse.SendEvent(EventToolCallStart, map[string]any{
            "toolCallId":       "tc-email",
            "toolName":         "send_email",
            "awaitingResponse": true, // 关键：需要用户确认
        })
        sse.SendEvent(EventToolCallArgs, map[string]any{
            "toolCallId": "tc-email",
            "delta":      `{"to":"ops@company.com","subject":"异常告警"}`,
        })
        sse.SendEvent(EventToolCallEnd, map[string]any{
            "toolCallId":       "tc-email",
            "awaitingResponse": true,
        })
    }

    // ... 生成回复文本
    return nil
}
```

## 8. 总结

| 维度 | 评估 |
|------|------|
| **必要性** | ★★★★★ Agent 前端集成的标准缺口终于被填补 |
| **简洁性** | ★★★★☆ 事件类型精炼，学习成本低 |
| **实用性** | ★★★★★ 支持 React/Vue/原生，工具确认是杀手特性 |
| **生态** | ★★★★☆ CopilotKit 已原生支持，LangChain 适配中 |
| **成熟度** | ★★★☆☆ 协议仍在快速迭代，部分细节未稳定 |

AG-UI 补全了 AI Agent 交互协议的最后一块拼图。MCP 赋予 Agent 工具能力，A2A 赋予 Agent 协作能力，AG-UI 赋予 Agent 与用户交互的能力。三者结合，AI Agent 才能真正成为一个完整的系统。

对于前端开发者而言，AG-UI 意味着再也不需要为每个 Agent 框架写适配代码。对于后端开发者而言，AG-UI 提供了一个标准化的 Agent 输出接口。这是 2026 年 AI 工程化的重要一步。

## 参考资料

- [AG-UI 协议完全指南：AI Agent 与用户界面的连接层 — 棱镜空间](https://pengjiyuan.github.io/articles/ag-ui-protocol-2026/)
- [AG-UI: The Agent-User Interaction Protocol — GitHub](https://github.com/ag-ui-protocol/ag-ui/)
- [AG-UI Overview — 官方文档](https://docs.ag-ui.com/introduction)
- [AG-UI 协议实战：标准化 Agent-Frontend 交互 — AWS Hands-on Lab](https://chaosreload.github.io/aws-hands-on-lab/ai-ml/agentcore-runtime-ag-ui/)
- [AI Agent 协议生态全景 2026：MCP、A2A、AG-UI](https://pengjiyuan.github.io/articles/agent-protocol-ecosystem-2026/)
- [AG-UI实战：5分钟构建React/Vue与AI Agent的无缝对话](https://blog.csdn.net/weixin_28327051/article/details/158986305)
