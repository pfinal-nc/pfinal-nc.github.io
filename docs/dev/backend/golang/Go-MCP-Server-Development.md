---
title: 用 Go 开发 MCP Server：让你的工具成为 AI Agent 的能力
date: 2026-06-05
tags: [golang, AI, MCP, Agent]
description: 手把手教你用 Go 语言（mcp-go 库）开发一个生产级 MCP Server，涵盖 Tools、Resources、Prompts 三大原语，stdio 与 SSE 双传输模式，并接入 Claude Desktop 实战演示。
---

# 用 Go 开发 MCP Server：让你的工具成为 AI Agent 的能力

2026 年，MCP（Model Context Protocol，模型上下文协议）已成为 AI Agent 生态的事实标准。Anthropic 将其捐赠给 Linux Foundation 旗下的 **Agentic AI Foundation** 后，Claude、GPT、Gemini 等主流模型客户端均已原生支持 MCP。

**简单说：你用 Go 写一个 MCP Server，AI 就能调用你的任何能力。**

本文带你从零开始，用 Go 开发一个完整的 MCP Server，并接入 Claude Desktop 实战演示。

## 一、MCP 是什么？为什么用 Go？

### 1.1 MCP 解决的问题

在 MCP 之前，每个 AI 应用都要自己实现工具调用（Function Calling）的对接逻辑，N 个客户端 × M 个工具 = N×M 的集成工作量。

MCP 定义了一套统一的 **Client-Server 协议**：

```
┌─────────────────┐     MCP 协议      ┌─────────────────┐
│   AI 客户端      │ ←──────────────→ │    MCP Server   │
│ (Claude/GPT 等) │    stdio / SSE   │   (你写的 Go 程序) │
└─────────────────┘                  └─────────────────┘
```

- **Client**：AI 模型客户端（Claude Desktop、Cursor、VSCode 等）
- **Server**：提供具体能力的服务（你写的程序）
- **传输层**：stdio（本地进程）或 SSE（HTTP 远程）

### 1.2 为什么选 Go？

- **单二进制部署**：打包成一个可执行文件，Claude Desktop 直接调用，无需 Python 虚拟环境
- **启动极快**：毫秒级启动，对 stdio 模式尤为重要
- **并发处理**：goroutine 天然适合 MCP 的多工具并发调用
- **`mcp-go` 库**：[github.com/mark3labs/mcp-go](https://github.com/mark3labs/mcp-go) 是社区最活跃的 Go MCP 实现

---

## 二、MCP 三大核心原语

开发 MCP Server 前，需要理解三个核心概念：

| 原语 | 作用 | 类比 |
|------|------|------|
| **Tools** | LLM 可调用的函数 | REST API 的 POST 接口 |
| **Resources** | LLM 可读取的数据源 | REST API 的 GET 接口 |
| **Prompts** | 预定义的提示模板 | 可复用的 Prompt 库 |

**AI 客户端工作流**：
1. 用户提问 → AI 列出可用 Tools/Resources
2. AI 决定调用哪个 Tool，发送参数
3. MCP Server 执行，返回结果
4. AI 将结果整合进回答

---

## 三、环境准备

```bash
# 初始化项目
mkdir go-mcp-demo && cd go-mcp-demo
go mod init github.com/yourname/go-mcp-demo

# 安装 mcp-go
go get github.com/mark3labs/mcp-go@latest
```

---

## 四、开发一个实用的 MCP Server

我们来开发一个**开发者工具箱** MCP Server，提供以下能力：

1. `run_go_code`：执行 Go 代码片段
2. `search_docs`：搜索 Go 官方文档
3. `get_system_info`：获取系统信息
4. 资源：提供常用代码模板

### 4.1 基础结构

```go
// main.go
package main

import (
    "context"
    "fmt"
    "log"
    "os"
    "os/exec"
    "runtime"
    "strings"

    "github.com/mark3labs/mcp-go/mcp"
    "github.com/mark3labs/mcp-go/server"
)

func main() {
    // 1. 创建 MCP Server
    s := server.NewMCPServer(
        "Go Developer Toolkit",
        "1.0.0",
        server.WithToolCapabilities(true),
        server.WithResourceCapabilities(true, false),
        server.WithPromptCapabilities(true),
    )

    // 2. 注册各种能力
    registerTools(s)
    registerResources(s)
    registerPrompts(s)

    // 3. 根据环境选择传输方式
    if os.Getenv("MCP_SSE_MODE") == "1" {
        startSSEServer(s)
    } else {
        // 默认 stdio 模式（供 Claude Desktop 使用）
        if err := server.ServeStdio(s); err != nil {
            log.Fatalf("Server error: %v", err)
        }
    }
}
```

### 4.2 注册 Tools

```go
func registerTools(s *server.MCPServer) {
    // Tool 1: 获取系统信息
    sysInfoTool := mcp.NewTool("get_system_info",
        mcp.WithDescription("获取当前系统的 Go 版本、OS、CPU 等信息"),
    )
    s.AddTool(sysInfoTool, handleGetSystemInfo)

    // Tool 2: 执行 shell 命令（受限）
    shellTool := mcp.NewTool("run_command",
        mcp.WithDescription("执行一条安全的 shell 命令（仅支持 go/git/ls/cat）"),
        mcp.WithString("command",
            mcp.Required(),
            mcp.Description("要执行的命令，如 'go version'、'git log --oneline -5'"),
        ),
    )
    s.AddTool(shellTool, handleRunCommand)

    // Tool 3: 格式化 Go 代码
    fmtTool := mcp.NewTool("format_go_code",
        mcp.WithDescription("使用 gofmt 格式化 Go 代码片段"),
        mcp.WithString("code",
            mcp.Required(),
            mcp.Description("需要格式化的 Go 代码"),
        ),
    )
    s.AddTool(fmtTool, handleFormatGoCode)

    // Tool 4: 查询 Go 包信息
    pkgTool := mcp.NewTool("go_pkg_info",
        mcp.WithDescription("获取指定 Go 包的信息（文档摘要、导出符号列表）"),
        mcp.WithString("package",
            mcp.Required(),
            mcp.Description("包名，如 'fmt'、'net/http'、'sync'"),
        ),
    )
    s.AddTool(pkgTool, handleGoPkgInfo)
}
```

### 4.3 实现 Tool 处理函数

```go
// 获取系统信息
func handleGetSystemInfo(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
    info := fmt.Sprintf(`系统信息:
- Go 版本: %s
- 操作系统: %s
- CPU 架构: %s
- CPU 核心数: %d
- GOPATH: %s
- GOROOT: %s`,
        runtime.Version(),
        runtime.GOOS,
        runtime.GOARCH,
        runtime.NumCPU(),
        os.Getenv("GOPATH"),
        runtime.GOROOT(),
    )
    return mcp.NewToolResultText(info), nil
}

// 执行受限命令
func handleRunCommand(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
    cmdStr, ok := req.Params.Arguments["command"].(string)
    if !ok {
        return mcp.NewToolResultError("参数类型错误"), nil
    }

    // 安全检查：只允许特定命令前缀
    allowedPrefixes := []string{"go ", "git ", "ls ", "cat ", "pwd"}
    allowed := false
    for _, prefix := range allowedPrefixes {
        if strings.HasPrefix(cmdStr, prefix) {
            allowed = true
            break
        }
    }
    if !allowed {
        return mcp.NewToolResultError(fmt.Sprintf("不允许执行命令: %s", cmdStr)), nil
    }

    parts := strings.Fields(cmdStr)
    cmd := exec.CommandContext(ctx, parts[0], parts[1:]...)
    out, err := cmd.CombinedOutput()
    if err != nil {
        return mcp.NewToolResultError(fmt.Sprintf("命令执行失败: %v\n%s", err, string(out))), nil
    }

    return mcp.NewToolResultText(string(out)), nil
}

// 格式化 Go 代码
func handleFormatGoCode(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
    code, ok := req.Params.Arguments["code"].(string)
    if !ok {
        return mcp.NewToolResultError("参数类型错误"), nil
    }

    // 写入临时文件
    tmpFile, err := os.CreateTemp("", "gofmt_*.go")
    if err != nil {
        return mcp.NewToolResultError(fmt.Sprintf("创建临时文件失败: %v", err)), nil
    }
    defer os.Remove(tmpFile.Name())

    tmpFile.WriteString(code)
    tmpFile.Close()

    // 执行 gofmt
    out, err := exec.CommandContext(ctx, "gofmt", tmpFile.Name()).Output()
    if err != nil {
        return mcp.NewToolResultError(fmt.Sprintf("gofmt 失败，可能有语法错误: %v", err)), nil
    }

    return mcp.NewToolResultText(string(out)), nil
}

// 查询 Go 包信息
func handleGoPkgInfo(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
    pkg, ok := req.Params.Arguments["package"].(string)
    if !ok {
        return mcp.NewToolResultError("参数类型错误"), nil
    }

    out, err := exec.CommandContext(ctx, "go", "doc", pkg).Output()
    if err != nil {
        return mcp.NewToolResultError(fmt.Sprintf("包 %s 不存在或无法访问: %v", pkg, err)), nil
    }

    return mcp.NewToolResultText(string(out)), nil
}
```

### 4.4 注册 Resources

```go
func registerResources(s *server.MCPServer) {
    // 提供 Go 代码模板
    templates := map[string]string{
        "http-server": `package main

import (
    "fmt"
    "net/http"
)

func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Hello, World!")
    })
    http.ListenAndServe(":8080", nil)
}`,
        "goroutine-pool": `package main

import (
    "fmt"
    "sync"
)

func workerPool(numWorkers int, jobs <-chan int, results chan<- int) {
    var wg sync.WaitGroup
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for j := range jobs {
                results <- j * 2
            }
        }()
    }
    wg.Wait()
    close(results)
}`,
    }

    for name, content := range templates {
        templateContent := content
        templateName := name

        resource := mcp.NewResource(
            fmt.Sprintf("template://go/%s", templateName),
            fmt.Sprintf("Go 代码模板：%s", templateName),
            mcp.WithResourceDescription(fmt.Sprintf("常用 Go 代码模板：%s", templateName)),
            mcp.WithMIMEType("text/x-go"),
        )

        s.AddResource(resource, func(ctx context.Context, req mcp.ReadResourceRequest) ([]mcp.ResourceContents, error) {
            return []mcp.ResourceContents{
                mcp.TextResourceContents{
                    URI:      req.Params.URI,
                    MIMEType: "text/x-go",
                    Text:     templateContent,
                },
            }, nil
        })
    }
}
```

### 4.5 注册 Prompts

```go
func registerPrompts(s *server.MCPServer) {
    // Code Review Prompt
    reviewPrompt := mcp.NewPrompt("go_code_review",
        mcp.WithPromptDescription("对 Go 代码进行专业 Code Review"),
        mcp.WithArgument("code",
            mcp.ArgumentDescription("需要 review 的 Go 代码"),
            mcp.RequiredArgument(),
        ),
        mcp.WithArgument("focus",
            mcp.ArgumentDescription("重点关注方向：performance/security/idiomatic/all"),
        ),
    )

    s.AddPrompt(reviewPrompt, func(ctx context.Context, req mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
        code := req.Params.Arguments["code"]
        focus := req.Params.Arguments["focus"]
        if focus == "" {
            focus = "all"
        }

        systemPrompt := `你是一位资深 Go 工程师，具有 10 年以上 Go 开发经验。
请对提供的代码进行专业的 Code Review，重点关注：
- 代码规范（是否符合 Go 惯用法）
- 错误处理（是否正确处理所有错误）
- 并发安全（goroutine 和 channel 的正确使用）
- 性能问题（不必要的内存分配、低效算法）
- 安全漏洞（SQL 注入、路径穿越等）`

        userPrompt := fmt.Sprintf("请对以下 Go 代码进行 Code Review（重点：%s）：\n\n```go\n%s\n```", focus, code)

        return mcp.NewGetPromptResult(
            "Go Code Review",
            []mcp.PromptMessage{
                mcp.NewPromptMessage(mcp.RoleUser, mcp.NewTextContent(systemPrompt+"\n\n"+userPrompt)),
            },
        ), nil
    })
}
```

### 4.6 SSE 模式（HTTP 远程部署）

```go
func startSSEServer(s *server.MCPServer) {
    sseServer := server.NewSSEServer(s,
        server.WithBaseURL("http://localhost:8080"),
    )

    fmt.Println("MCP SSE Server 启动在 :8080")
    if err := sseServer.Start(":8080"); err != nil {
        log.Fatalf("SSE 服务器启动失败: %v", err)
    }
}
```

---

## 五、构建与接入 Claude Desktop

### 5.1 构建二进制

```bash
go build -o go-mcp-server ./main.go
# macOS/Linux
chmod +x ./go-mcp-server
```

### 5.2 配置 Claude Desktop

编辑 Claude Desktop 配置文件：

- **macOS**：`~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**：`%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "go-developer-toolkit": {
      "command": "/path/to/go-mcp-server",
      "args": [],
      "env": {}
    }
  }
}
```

重启 Claude Desktop，在对话框左下角就能看到你的工具已接入。

### 5.3 实战演示

配置完成后，你可以对 Claude 说：

> "帮我看看当前 Go 环境信息"  
> → Claude 自动调用 `get_system_info` tool

> "把这段代码用 gofmt 格式化一下：`func main(){fmt.Println("hello")}`"  
> → Claude 自动调用 `format_go_code` tool

> "查一下 sync.WaitGroup 的用法"  
> → Claude 自动调用 `go_pkg_info` tool，参数 `package=sync`

---

## 六、进阶：生产级 MCP Server 实践

### 6.1 错误处理规范

```go
// 区分"工具错误"和"服务器错误"
func handleTool(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
    // 业务逻辑错误：用 NewToolResultError（告知 AI，让它调整策略）
    if someCondition {
        return mcp.NewToolResultError("文件不存在，请检查路径"), nil
    }

    // 系统级错误：返回 error（MCP 协议级别的错误，AI 无法处理）
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("读取文件失败: %w", err)
    }

    return mcp.NewToolResultText(string(data)), nil
}
```

### 6.2 并发与超时控制

```go
func handleLongRunningTask(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
    // 使用 ctx 控制超时，避免 MCP Server 被拖死
    cmd := exec.CommandContext(ctx, "go", "test", "./...")
    out, err := cmd.Output()
    if err != nil {
        if ctx.Err() == context.DeadlineExceeded {
            return mcp.NewToolResultError("执行超时（30s），测试可能有死锁"), nil
        }
        return mcp.NewToolResultError(fmt.Sprintf("测试失败: %v", err)), nil
    }
    return mcp.NewToolResultText(string(out)), nil
}
```

### 6.3 日志与调试

```go
// stdio 模式下，stdout 是 MCP 协议通信通道，日志必须写 stderr
log.SetOutput(os.Stderr)
log.Printf("[DEBUG] 收到 Tool 调用: %s", req.Params.Name)
```

---

## 七、完整项目结构

```
go-mcp-server/
├── main.go          # 入口，Server 初始化
├── tools.go         # Tools 注册与实现
├── resources.go     # Resources 注册与实现
├── prompts.go       # Prompts 注册与实现
├── config.go        # 配置（权限白名单等）
├── go.mod
└── go.sum
```

---

## 八、总结

MCP 的出现，让"工具即代码"成为现实——你写一个 Go 程序，AI 就能使用你的能力，无需任何中间层。

**Go 是构建 MCP Server 的绝佳选择**：
- 编译成单二进制，部署零依赖
- 启动时间毫秒级，适合 stdio 高频调用
- `mcp-go` 库 API 简洁，几十行代码搭出可用 Server

随着 MCP 成为标准，谁先把自己的工具接入 AI 生态，谁就在下一轮效率竞争中领先一步。

---

## 参考资料

- [mcp-go 官方仓库](https://github.com/mark3labs/mcp-go)
- [MCP 协议官方文档](https://modelcontextprotocol.io)
- [用 Go 语言构建 MCP 客户端与服务器 - 腾讯云](https://cloud.tencent.com/developer/article/2511525)
- [MCP 协议完全指南 2026 - CSDN](https://blog.csdn.net/ziwoods/article/details/161662819)
