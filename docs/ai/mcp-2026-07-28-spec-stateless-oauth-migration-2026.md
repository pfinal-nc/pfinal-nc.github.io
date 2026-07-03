---
title: "MCP 2026-07-28 Spec RC 迁移实战：无状态架构、OAuth 2.1 与七大 Breaking Changes 全解析"
date: 2026-07-03
tags: ["ai", "mcp", "oauth", "security", "agent"]
keywords: ["MCP", "Model Context Protocol", "2026-07-28", "无状态架构", "OAuth 2.1", "Breaking Changes", "MCP迁移", "AI Agent"]
category: "ai"
description: "MCP 2026-07-28 Spec RC 是自发布以来最大规模的修订：会话移除、初始化握手消失、OAuth 2.1 强制接入。本文深度解析七大破坏性变更，提供从有状态到无状态的完整迁移代码示例与检查清单。"
---

# MCP 2026-07-28 Spec RC 迁移实战：无状态架构、OAuth 2.1 与七大 Breaking Changes 全解析

2026 年 5 月 21 日，Model Context Protocol（MCP）核心维护团队锁定了 `2026-07-28` 规范的 Release Candidate。官方称这是"自 MCP 发布以来最大规模的修订"——这不是营销话术。协议层会话被彻底移除，初始化握手消失，三个核心功能被废弃，OAuth 要求显著收紧。

最终规范将于 **2026 年 7 月 28 日** 正式发布。如果你运行着远程 MCP Server 或维护着 MCP Client，你依赖的某些东西即将消失。

## 为什么这次更新如此重要

MCP 早期设计采用了有状态会话模型：客户端先发送 `initialize` 请求建立会话，服务端返回 `session_id`，后续所有请求都携带这个 ID。这个设计在本地开发场景下工作良好，但在生产环境暴露了严重问题：

1. **扩展困难**：有状态会话意味着请求必须路由到同一台服务器，无法水平扩展
2. **基础设施要求高**：需要 sticky session、会话存储等额外组件
3. **认证混乱**：旧规范对认证几乎没有要求，各实现各自为政

`2026-07-28` 规范从根本上解决了这些问题，代价是——破坏性变更。

## 七大破坏性变更详解

### 1. 会话移除（Session Removal）—— 最核心的变化

协议层不再维护任何会话概念。这是整个修订的基石。

**旧规范：**

```json
// 初始化阶段
→ {"jsonrpc": "2.0", "method": "initialize", "id": 1, "params": {...}}
← {"jsonrpc": "2.0", "result": {"sessionId": "abc-123", ...}, "id": 1}

// 后续请求携带 sessionId
→ {"jsonrpc": "2.0", "method": "tools/call", "params": {"_sessionId": "abc-123", ...}}
```

**新规范：**

```json
// 没有初始化握手，直接调用
→ {"jsonrpc": "2.0", "method": "tools/call", "id": 1, "params": {...}}
← {"jsonrpc": "2.0", "result": {...}, "id": 1}
```

**迁移要点**：如果你的服务端依赖 `session_id` 做路由或状态管理，需要改用**显式状态句柄（Explicit State Handles）**。服务端可以返回一个 `state_token`，客户端在后续请求中携带它，但这不再是协议层的责任。

```python
# 迁移后的状态管理模式
class StatelessMCPServer:
    async def handle_tool_call(self, request):
        # 从请求中提取显式状态句柄
        state_token = request.params.get("state_token")

        if state_token:
            state = await self.restore_state(state_token)
        else:
            state = self.create_new_state()

        # 执行工具调用
        result = await self.execute_tool(request.params, state)

        # 返回新的状态句柄（如果需要）
        if state.is_modified():
            new_token = await self.save_state(state)
            return {"result": result, "state_token": new_token}

        return {"result": result}
```

显式状态句柄的设计哲学：状态不再由协议层隐式维护，而是由应用层显式传递。这带来三个好处：

- **水平扩展**：任何实例都可以处理任何请求，不再需要 sticky session
- **可审计**：状态句柄是可见的，可以追踪和调试
- **安全**：状态句柄可以加密签名，防止篡改

### 2. 初始化握手移除（Initialize Handshake Removal）

旧规范要求客户端首先调用 `initialize` 方法，交换协议版本和能力信息。新规范将这些信息移入 HTTP 头部。

```python
# 旧方式：JSON-RPC 初始化
await client.initialize({
    "protocolVersion": "2025-03-26",
    "capabilities": {"tools": {"listChanged": True}}
})

# 新方式：HTTP 头部协商
headers = {
    "MCP-Protocol-Version": "2026-07-28",
    "MCP-Capabilities": "tools,listChanged"
}
response = await client.call_tool(name="query", headers=headers)
```

这意味着每个请求都自带协商信息，服务端不需要记住"这个客户端支持什么"。无状态的代价是每个请求稍微大一点，但换来了完全的水平扩展能力。

### 3. 三个核心功能废弃

| 废弃功能 | 替代方案 | 废弃原因 |
|-----------|----------|----------|
| `resources/list` | `tools/list` 中的资源工具 | 统一工具接口，减少概念复杂度 |
| `prompts/list` | 扩展机制（Extensions） | prompts 作为核心功能使用率低 |
| `sampling` | 扩展机制 | 采样应由客户端决定，不属于协议层 |

这不是简单的替换——这是协议设计哲学的转变。MCP 团队认为核心规范应该尽可能薄，只保留必要的通信原语。其他功能通过扩展机制按需加载。

```python
# 旧方式：直接调用 resources/list
resources = await client.list_resources()

# 新方式：通过 tools/list 获取资源工具
tools = await client.list_tools()
resource_tools = [t for t in tools if t.category == "resource"]
```

### 4. OAuth 2.1 全面接入

新规范将 MCP Server 明确定义为 OAuth 2.1 资源服务器，MCP Client 作为 OAuth 2.1 客户端。这是安全模型的根本升级。

```typescript
// 新的 MCP 认证流程
interface MCPOAuthConfig {
  // MCP Server 必须提供 OAuth 元数据端点
  authorizationEndpoint: string;  // /.well-known/oauth-authorization-server
  tokenEndpoint: string;
  // PKCE 是强制要求
  requirePKCE: true;
  // 支持 OpenID Connect
  supportedScopes: string[];
}

// MCP Client 初始化认证
async function authenticateWithMCP(serverUrl: string): Promise<string> {
  // 1. 发现 OAuth 端点
  const metadata = await fetch(
    `${serverUrl}/.well-known/oauth-authorization-server`
  ).then(r => r.json());

  // 2. 生成 PKCE 挑战
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // 3. 重定向到授权端点
  const authUrl = new URL(metadata.authorization_endpoint);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", "your-client-id");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  // 4. 交换 token
  const tokenResponse = await fetch(metadata.token_endpoint, {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: authorizationCode,
      code_verifier: codeVerifier
    })
  });

  return tokenResponse.json().access_token;
}
```

**关键变化**：

- **PKCE（Proof Key for Code Exchange）成为强制要求**：防止授权码拦截攻击
- **MCP Server 必须提供 `/.well-known/oauth-authorization-server` 端点**：标准化发现机制
- **支持 OpenID Connect 的身份验证**：企业 SSO 接入变得简单

对于已经在使用 OAuth 的企业，这是一个低成本的升级。但对于本地开发的 MCP Server，这意味着你需要引入认证机制——即使是简单的自签名 token。

### 5. 传输层标准化

新规范明确了两种传输方式：

| 传输方式 | 场景 | 特点 |
|----------|------|------|
| Streamable HTTP | 远程服务 | 无状态，可水平扩展 |
| stdio | 本地进程 | 保持向后兼容 |

Streamable HTTP 取代了旧的 SSE（Server-Sent Events）传输方式：

```python
# Streamable HTTP 传输（新规范）
import httpx

class StreamableHTTPTransport:
    def __init__(self, server_url: str, token: str):
        self.server_url = server_url
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "MCP-Protocol-Version": "2026-07-28"
        }

    async def send_request(self, method: str, params: dict) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.server_url,
                json={"jsonrpc": "2.0", "method": method, "params": params},
                headers=self.headers
            )
            return response.json()
```

关键区别：Streamable HTTP 是普通的 HTTP POST 请求，不再依赖长连接。这意味着你的 MCP Server 可以像普通 REST API 一样部署在任何云基础设施上——Cloudflare Workers、AWS Lambda、Vercel Edge Functions 都可以。

### 6. 错误码标准化

新规范统一了错误码体系：

```python
# 标准 MCP 错误码
class MCPErrorCode:
    PARSE_ERROR = -32700
    INVALID_REQUEST = -32600
    METHOD_NOT_FOUND = -32601
    INVALID_PARAMS = -32602
    INTERNAL_ERROR = -32603
    # 新增：认证相关错误
    AUTHENTICATION_REQUIRED = -32000
    AUTHORIZATION_FAILED = -32001
    TOKEN_EXPIRED = -32002
```

新增的认证相关错误码让客户端可以区分"我没登录"和"我没权限"，而不是统一返回一个笼统的 403。

### 7. 扩展机制引入

新规范引入了正式的扩展机制，用于协议核心之外的功能：

```python
# 扩展声明
class MCPExtensions:
    # MCP Apps：服务端渲染 UI
    MCP_APPS = "mcp-apps/v1"

    # Tasks：长时间运行的工作
    TASKS = "tasks/v1"

    # Custom：自定义扩展
    CUSTOM = "custom/v1"

# 使用 Tasks 扩展处理长时间任务
async def long_running_task(client):
    task = await client.create_task(
        extension="tasks/v1",
        params={
            "type": "code_analysis",
            "repository": "https://github.com/example/repo",
            "timeout": 3600
        }
    )

    # 轮询任务状态
    while True:
        status = await client.get_task_status(task.id)
        if status.state == "completed":
            return status.result
        await asyncio.sleep(5)
```

**Tasks 扩展的设计精髓**：

```json
// 概念模型：tools/call 返回 task handle
client → tools/call          → server
server → { "task": "t_123" }   (立即返回 handle)
client → tasks/get  t_123    → "running"
client → tasks/get  t_123    → "completed" + result
// 可用 tasks/cancel t_123 取消
```

Tasks 最初是 2025-11-25 规范的核心功能，但在生产使用中发现设计不足，被重新定位为扩展。这是一个健康的反馈循环：核心功能在实际验证后被降级为扩展，确保协议核心保持精简。

**Extensions 框架的设计哲学**：新能力先作为可选扩展发布，在生产环境验证，只有经过充分验证后才可能进入核心规范。这避免了"功能膨胀"——MCP 团队从过往经验中认识到，过早将功能放入核心会导致难以修正的错误。

## 实际迁移示例：从有状态到无状态

假设你有一个 MCP Server 提供数据库查询工具：

```python
# ❌ 旧实现：有状态会话
class OldDatabaseMCPServer:
    def __init__(self):
        self.sessions = {}  # 存储会话状态

    async def initialize(self, params):
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = {
            "db_connection": create_connection(),
            "query_history": []
        }
        return {"sessionId": session_id}

    async def query(self, session_id, sql):
        session = self.sessions[session_id]
        result = await session["db_connection"].execute(sql)
        session["query_history"].append(sql)
        return result
```

新实现：

```python
# ✅ 新实现：无状态 + 显式状态句柄
import json
import base64
import hmac
import hashlib

class NewDatabaseMCPServer:
    def __init__(self):
        self.connection_pool = create_connection_pool()
        self.signing_key = "your-secret-key"

    def _create_state_token(self, data: dict) -> str:
        """创建签名状态句柄"""
        payload = json.dumps(data, sort_keys=True)
        signature = hmac.new(
            self.signing_key.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        token = base64.urlsafe_b64encode(
            json.dumps({"data": data, "sig": signature}).encode()
        ).decode()
        return token

    def _verify_state_token(self, token: str) -> dict:
        """验证并解码状态句柄"""
        decoded = json.loads(base64.urlsafe_b64decode(token.encode()))
        payload = json.dumps(decoded["data"], sort_keys=True)
        expected_sig = hmac.new(
            self.signing_key.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        if decoded["sig"] != expected_sig:
            raise ValueError("Invalid state token signature")
        return decoded["data"]

    async def query(self, sql: str, state_token: str = None):
        # 从状态句柄恢复连接信息
        if state_token:
            conn_info = self._verify_state_token(state_token)
            conn = await self.connection_pool.get_connection(conn_info["connection_id"])
        else:
            conn = await self.connection_pool.get_new_connection()

        result = await conn.execute(sql)

        # 返回新的状态句柄
        new_state_token = self._create_state_token({
            "connection_id": conn.id,
            "last_query": sql,
            "timestamp": datetime.now().isoformat()
        })

        return {
            "result": result,
            "state_token": new_state_token
        }
```

**迁移设计要点**：

1. **状态句柄必须签名**：防止客户端篡改状态数据
2. **连接池替代会话存储**：从内存中的 `sessions` dict 变为连接池，状态信息编码在 token 中
3. **无服务器兼容**：状态句柄可以存储在 Redis/数据库中，也可以直接编码在 token 中

## Go 语言 MCP Server 迁移实战

如果你的 MCP Server 是 Go 实现的，迁移工作量主要集中在三个方面：

```go
// 旧版 Go MCP Server（有状态）
type MCPServer struct {
    sessions map[string]*Session
    mu       sync.Mutex
}

func (s *MCPServer) HandleInitialize(req Request) Response {
    sessionID := uuid.New().String()
    s.mu.Lock()
    s.sessions[sessionID] = NewSession()
    s.mu.Unlock()
    return Response{SessionID: sessionID}
}

func (s *MCPServer) HandleToolCall(req Request) Response {
    session := s.sessions[req.SessionID]
    // ... 使用 session 处理请求
}
```

```go
// ✅ 新版 Go MCP Server（无状态）
type StatelessMCPServer struct {
    stateStore StateStore  // 可选：Redis/内存/无（纯 token 模式）
    signer     *StateSigner
}

func (s *StatelessMCPServer) HandleToolCall(req Request) Response {
    // 从 HTTP 头部获取协议版本
    protoVersion := req.Headers["MCP-Protocol-Version"]

    // 从请求参数获取状态句柄
    stateToken := req.Params["state_token"]

    var state *State
    if stateToken != "" {
        state, err := s.signer.VerifyAndDecode(stateToken)
        if err != nil {
            return ErrorResponse(MCPErrorCode.AUTHENTICATION_REQUIRED,
                "invalid state token")
        }
    } else {
        state = NewState()
    }

    result := s.executeTool(req.Params, state)

    // 生成新状态句柄
    if state.Modified {
        newToken := s.signer.SignAndEncode(state)
        return Response{
            Result:      result,
            StateToken:  newToken,
        }
    }

    return Response{Result: result}
}

// 状态签名器
type StateSigner struct {
    key []byte
}

func (s *StateSigner) SignAndEncode(state *State) string {
    data, _ := json.Marshal(state)
    mac := hmac.New(sha256.New, s.key)
    mac.Write(data)
    sig := mac.Sum(nil)

    payload := struct {
        Data []byte `json:"data"`
        Sig  []byte `json:"sig"`
    }{data, sig}

    encoded, _ := json.Marshal(payload)
    return base64.URLEncoding.EncodeToString(encoded)
}

func (s *StateSigner) VerifyAndDecode(token string) (*State, error) {
    decoded, err := base64.URLEncoding.DecodeString(token)
    if err != nil {
        return nil, err
    }

    var payload struct {
        Data []byte `json:"data"`
        Sig  []byte `json:"sig"`
    }
    json.Unmarshal(decoded, &payload)

    mac := hmac.New(sha256.New, s.key)
    mac.Write(payload.Data)
    expectedSig := mac.Sum(nil)

    if !hmac.Equal(payload.Sig, expectedSig) {
        return nil, errors.New("invalid signature")
    }

    var state State
    json.Unmarshal(payload.Data, &state)
    return &state, nil
}
```

## OAuth 2.1 接入实战

对于远程 MCP Server，OAuth 2.1 是强制要求。以下是 Go 实现的 OAuth 元数据端点：

```go
// OAuth 元数据端点（必须实现）
func (s *StatelessMCPServer) HandleOAuthMetadata(w http.ResponseWriter, r *http.Request) {
    metadata := OAuthAuthorizationServerMetadata{
        Issuer:                                "https://your-mcp-server.com",
        AuthorizationEndpoint:                 "https://your-mcp-server.com/oauth/authorize",
        TokenEndpoint:                         "https://your-mcp-server.com/oauth/token",
        RegistrationEndpoint:                  "https://your-mcp-server.com/oauth/register",
        ScopesSupported:                       []string{"mcp:tools", "mcp:resources", "mcp:admin"},
        CodeChallengeMethodsSupported:         []string{"S256"},  // PKCE 强制
        GrantTypesSupported:                   []string{"authorization_code", "refresh_token"},
        TokenEndpointAuthMethodsSupported:     []string{"none"},  // 公共客户端
    }
    json.NewEncoder(w).Encode(metadata)
}

// PKCE 验证（Token 端点）
func (s *StatelessMCPServer) VerifyPKCE(codeVerifier, storedChallenge string) bool {
    // S256 方法：SHA256(codeVerifier) → Base64url
    hash := sha256.Sum256([]byte(codeVerifier))
    computedChallenge := base64.URLEncoding.EncodeToString(hash[:])
    // 去掉 padding
    computedChallenge = strings.TrimRight(computedChallenge, "=")
    return computedChallenge == storedChallenge
}
```

## 迁移检查清单

### 🔴 高优先级（必须完成）

| 检查项 | 操作 | 风险等级 |
|--------|------|----------|
| 移除 `initialize` 调用 | 改用 HTTP 头部协商 | P0 — 不迁移将完全无法工作 |
| 移除 `session_id` 依赖 | 改用显式状态句柄或无状态设计 | P0 — 旧会话机制将被移除 |
| 更新 OAuth 实现 | 接入 OAuth 2.1，支持 PKCE | P0 — 远程 Server 强制要求 |
| 替换废弃方法 | `resources/list` → `tools/list`，`prompts/list` → 扩展 | P1 — 有 12 个月过渡期 |

### 🟡 中优先级（建议完成）

| 检查项 | 操作 |
|--------|------|
| 迁移传输层 | 从 SSE 迁移到 Streamable HTTP |
| 更新错误处理 | 适配新的错误码体系 |
| 测试扩展机制 | 评估 MCP Apps 和 Tasks 扩展的适用性 |

### 🟢 低优先级（可选）

| 检查项 | 操作 |
|--------|------|
| 评估 MCP Apps | 如果需要服务端渲染 UI |
| 评估 Tasks 扩展 | 如果需要长时间运行的任务 |

## 对 AI 生态的影响

### 开发者工具

Cursor、Windsurf、Claude Code 等工具需要更新其 MCP Client 实现。好消息是，stdio 传输方式保持向后兼容，本地开发场景影响较小。但远程 MCP Server 连接需要全面更新。

### 远程 MCP Server

运行远程 MCP Server 的团队需要认真评估迁移成本。无状态架构虽然更易扩展，但需要重新设计状态管理策略。好消息是——Streamable HTTP 让 MCP Server 可以部署在任何 HTTP 基础设施上。

### 企业部署

OAuth 2.1 的强制接入对企业用户是重大利好。PKCE 要求和标准化的认证流程让 MCP 终于可以安全地暴露在公网上。已有 SSO（如 Okta、Azure AD）的企业可以直接接入，无需额外认证系统。

### 部署架构对比

```
旧架构（有状态）：
┌──────────┐     ┌──────────────────┐     ┌──────────────┐
│ MCP      │     │ Sticky Session LB│     │ MCP Server A │
│ Client   │────→│ (会话路由)        │────→│ (session X)  │
│          │     └──────────────────┘     │              │
│          │     ┌──────────────────┐     ├──────────────┤
│          │────→│ Session Store    │     │ MCP Server B │
│          │     │ (Redis/Memcached)│     │ (session Y)  │
└──────────┘     └──────────────────┘     └──────────────┘
                  ↑ 复杂、昂贵、脆弱

新架构（无状态）：
┌──────────┐     ┌──────────────────┐     ┌──────────────┐
│ MCP      │     │ 普通 HTTP LB     │     │ MCP Server 1 │
│ Client   │────→│ (无状态路由)      │────→│ (无 session) │
│          │     │                  │     ├──────────────┤
│          │     │                  │     │ MCP Server 2 │
│          │     │                  │────→│ (无 session) │
│          │     │                  │     ├──────────────┤
│          │     │                  │     │ MCP Server N │
│          │     │                  │     │ (无 session) │
└──────────┘     └──────────────────┘     └──────────────┘
                  ↑ 简单、弹性、可水平扩展
```

## 时间线与行动建议

| 日期 | 事件 | 行动 |
|------|------|------|
| 2026-05-21 | RC 发布 | 开始评估影响 |
| 2026-07-03 | 当前 | 开始迁移开发 |
| 2026-07-28 | 正式发布 | 完成迁移，上线测试 |
| 2026-08-28 | 30 天过渡期结束 | 旧规范废弃 |

**建议**：

1. **立即审计**：搜索代码中的 `initialize`、`session_id`、`resources/list`、`prompts/list` 或 `sampling`
2. **优先迁移传输层**：如果使用 SSE，迁移到 Streamable HTTP
3. **OAuth 改造**：接入 OAuth 2.1，实现 PKCE 和元数据端点
4. **测试覆盖**：确保迁移后有充分的测试覆盖

## 12 个月过渡期保障

新规范引入了正式的废弃策略：每个功能都有 **Active → Deprecated → Removed** 的生命周期，从废弃到移除至少 12 个月。这意味着：

- `initialize`、`session_id`、`resources/list` 等被废弃的功能不会在 7 月 28 日立即失效
- 你有 12 个月的时间完成迁移
- 但**新客户端将不再支持旧功能**，所以尽早迁移才能保持兼容性

## 总结

MCP 2026-07-28 规范是一次彻底的架构升级。核心变化可以概括为：

| 维度 | 旧规范 | 新规范 |
|------|--------|--------|
| 状态管理 | 有状态会话 | 无状态 + 显式句柄 |
| 初始化 | JSON-RPC initialize | HTTP 头部协商 |
| 认证 | 无标准 | OAuth 2.1 + PKCE |
| 功能集 | 大而全 | 薄核心 + 扩展 |
| 传输 | SSE + stdio | Streamable HTTP + stdio |
| 扩展性 | 无 | Extensions 框架 |

无状态设计让 MCP 服务可以像普通 HTTP API 一样水平扩展，OAuth 2.1 的接入让安全模型终于成熟，扩展机制让协议核心保持精简。虽然迁移有成本，但这些变化让 MCP 从"开发者玩具"变成了可以承载生产流量的协议。

距离最终规范发布还有 25 天。现在就打开你的 MCP 代码，搜索 `initialize` 和 `session_id`——开始行动吧。

## 参考资料

- [MCP 2026-07-28 Release Candidate 官方公告](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)
- [MCP 规范官方文档](https://modelcontextprotocol.io/specification/)
- [SEP-2567: Sessionless MCP via Explicit State Handles](https://modelcontextprotocol.io/seps/2567-sessionless-mcp)
- [MCP 2026 Roadmap](https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap)
- [MCP 与 OAuth 2.1 认证详解 - WorkOS](https://workos.com/blog/mcp-2026-spec-agent-authentication)
- [KanseiLink: MCP 2026-07-28 RC 分析](https://kansei-link.com/en/insights/mcp-spec-2026-07-28-release-candidate)
