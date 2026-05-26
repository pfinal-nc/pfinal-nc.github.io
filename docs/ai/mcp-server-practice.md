---
title: "MCP 服务器开发实战：用 Go 构建 AI 工具协议"
description: "深入 MCP（Model Context Protocol）协议，用 Go 实现自定义 MCP 服务器"
date: 2026-05-26
author: PFinal南丞
category: AI工程
tags: [ai, mcp, golang, protocol, llm, tool]
keywords:
  - MCP 协议
  - Model Context Protocol
  - Go MCP 服务器
  - AI 工具协议
  - LLM 工具集成
---

# MCP 服务器开发实战

## 什么是 MCP？

MCP（Model Context Protocol）是 Anthropic 提出的开放协议，定义了 AI 模型与外部工具/数据源之间的标准通信方式。简单说，MCP 就是 **AI 应用的 USB-C 接口**——统一了工具接入标准。

### 核心概念

```
┌─────────────┐    MCP 协议    ┌──────────────┐
│   AI 客户端  │ ◄──────────► │  MCP 服务器   │
│  (Claude/    │               │  (工具提供方)  │
│   Cursor/    │               ├──────────────┤
│   VS Code)   │               │  • 文件系统   │
└─────────────┘               │  • 数据库     │
                              │  • API 网关   │
                              │  • 自定义工具  │
                              └──────────────┘
```

## Go 实现 MCP 服务器

### 基本架构

```go
// 工具定义
type Tool struct {
    Name        string          `json:"name"`
    Description string          `json:"description"`
    InputSchema json.RawMessage `json:"inputSchema"`
    Handler     func(ctx context.Context, args json.RawMessage) (string, error)
}

// MCP 服务器
type MCPServer struct {
    tools map[string]Tool
    transport Transport // 传输层（stdio / HTTP / WebSocket）
}

func (s *MCPServer) RegisterTool(t Tool) {
    s.tools[t.Name] = t
}

func (s *MCPServer) HandleToolCall(ctx context.Context, name string, args json.RawMessage) (string, error) {
    tool, ok := s.tools[name]
    if !ok {
        return "", fmt.Errorf("unknown tool: %s", name)
    }
    return tool.Handler(ctx, args)
}
```

### 完整示例：文件搜索工具

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "os"
    "path/filepath"
    "strings"
)

type SearchFilesArgs struct {
    Path  string `json:"path"`
    Query string `json:"query"`
}

func main() {
    server := NewMCPServer(WithStdioTransport())

    server.RegisterTool(Tool{
        Name:        "search_files",
        Description: "在指定目录中搜索匹配关键字的文件",
        InputSchema: json.RawMessage(`{
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "搜索目录路径"},
                "query": {"type": "string", "description": "搜索关键字"}
            },
            "required": ["path", "query"]
        }`),
        Handler: func(ctx context.Context, args json.RawMessage) (string, error) {
            var req SearchFilesArgs
            if err := json.Unmarshal(args, &req); err != nil {
                return "", err
            }

            var results []string
            filepath.Walk(req.Path, func(path string, info os.FileInfo, err error) error {
                if err != nil || info.IsDir() {
                    return nil
                }
                if strings.Contains(strings.ToLower(info.Name()), strings.ToLower(req.Query)) {
                    results = append(results, path)
                }
                return nil
            })

            data, _ := json.Marshal(results)
            return string(data), nil
        },
    })

    fmt.Println("MCP Server starting...")
    server.Run()
}
```

## MCP 协议消息格式

```json
// 工具列表请求（客户端 → 服务器）
{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
}

// 工具列表响应（服务器 → 客户端）
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "tools": [{
            "name": "search_files",
            "description": "搜索文件",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "query": {"type": "string"}
                }
            }
        }]
    }
}

// 工具调用请求
{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
        "name": "search_files",
        "arguments": {
            "path": "/home/user",
            "query": "config"
        }
    }
}
```

## 传输层选项

| 传输方式 | 适用场景 | 优势 |
|----------|----------|------|
| **stdio** | 本地调用（CLI 工具） | 零配置、最安全 |
| **HTTP SSE** | 远程服务 | 支持多客户端 |
| **WebSocket** | 双向通信 | 低延迟 |

```go
// stdio 传输（最简单）
func WithStdioTransport() Transport {
    return &stdioTransport{
        reader: os.Stdin,
        writer: os.Stdout,
    }
}

// HTTP SSE 传输
func WithHTTPTransport(addr string) Transport {
    return &httpTransport{addr: addr}
}
```

## 实战场景

### 1. 数据库查询 MCP

```go
server.RegisterTool(Tool{
    Name:        "query_database",
    Description: "执行 SQL 查询（只读）",
    Handler: func(ctx context.Context, args json.RawMessage) (string, error) {
        // 限制为 SELECT 查询，防止写操作
        var rows []map[string]any
        db.Raw(query).Scan(&rows)
        data, _ := json.Marshal(rows)
        return string(data), nil
    },
})
```

### 2. 系统监控 MCP

```go
server.RegisterTool(Tool{
    Name:        "get_system_status",
    Description: "获取服务器系统状态",
    Handler: func(ctx context.Context, args json.RawMessage) (string, error) {
        status := map[string]any{
            "cpu":    getCPUUsage(),
            "memory": getMemoryUsage(),
            "disk":   getDiskUsage(),
            "uptime": getUptime(),
        }
        data, _ := json.Marshal(status)
        return string(data), nil
    },
})
```

## 最佳实践

1. **工具设计原则**：每个工具只做一件事，做好
2. **输入验证**：始终验证参数，防止注入攻击
3. **错误处理**：返回有意义的错误信息，帮助 LLM 理解失败原因
4. **幂等设计**：同参数多次调用应返回一致结果
5. **超时控制**：使用 `context.WithTimeout` 防止工具卡死

## 推荐阅读

- [Go 构建远程存储 MCP 服务器实战](/data/automation/Go%20构建远程存储MCP服务器实战)
- [MCP 提示语管理工具](/data/automation/MCP%20提示语管理工具)
- [MCP 服务器精选：提升 AI 编程效率的 5 大神器](/data/automation/MCP服务器精选：提升AI编程效率的5大神器)
- [mcp-server-development](/data/automation/mcp-server-development)
