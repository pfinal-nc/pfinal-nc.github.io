---
title: MCP 2.0 无状态重构：移除 Session 后 Agent 协议层发生了什么
date: 2026-08-07
tags:
  - ai
  - mcp
  - architecture
keywords:
  - MCP 2.0
  - stateless protocol
  - Model Context Protocol
  - session removal
  - AI Agent
  - protocol migration
category: ai
description: 2026 年 7 月 28 日，MCP 发布自诞生以来最大规模的架构重构：移除协议层 Session，改为无状态请求/响应模型。本文从协议变更、Header 路由、MRTR、Extensions 框架等维度深度解析这次重构的技术细节与工程影响。
recommend: AI工程
---
# MCP 2.0 无状态重构：移除 Session 后 Agent 协议层发生了什么

## MCP 协议的 "Kubernetes 时刻"

2026 年 7 月 28 日，Model Context Protocol（MCP）发布了自 2024 年 11 月诞生以来最大规模的架构重构——2026-07-28 规范。

这次重构的核心变化是：**MCP 从双向有状态协议转变为无状态请求/响应协议**。同一周，A2A 协议宣布 150+ 组织生产部署，中国发布 GB/Z 185-2026《智能体互联互通》国标，29 国在上海签署 WAICO 创始文件。这一周被称为 Agent 协议层的"Kubernetes 时刻"。

MCP 工程负责人 Mazin Gilbert 的话直击要害："有状态 Session 是企业从试点走向数万 Agent 规模部署的首要障碍。"

## 为什么需要移除 Session

### 旧版 MCP 的有状态模型

在 2025-11-25 版规范中，通过 Streamable HTTP 调用工具需要先建立会话：

```http
POST /mcp HTTP/1.1
Content-Type: application/json

{"jsonrpc":"2.0","id":1,"method":"initialize",
 "params":{"protocolVersion":"2025-11-25","capabilities":{},
 "clientInfo":{"name":"my-app","version":"1.0"}}}
```

服务端返回 `Mcp-Session-Id`，后续每次请求都必须携带该头。客户端因此被"钉"在签发 Session 的那台实例上：

```http
POST /mcp HTTP/1.1
Mcp-Session-Id: 1868a90c-3a3f-4f5b
Content-Type: application/json

{"jsonrpc":"2.0","id":2,"method":"tools/call",
 "params":{"name":"search","arguments":{"q":"otters"}}}
```

### 有状态模型的三大生产问题

这个模型在单机调试时毫无问题，搬进生产环境就会连环触发三件事：

1. **Pod 重启即会话丢失**：Kubernetes Pod 一重启，整个会话丢失，客户端必须重新建立连接
2. **被迫粘性路由**：为了不让请求跑到别的实例上，负载均衡被迫做粘性路由（sticky session）
3. **水平扩缩容形同虚设**：粘性路由一开，K8s 的水平扩缩容失去意义——加了十个副本，流量还是黏在原来那一个上

用一个更直观的对照：旧版像去银行必须先开一个房间，办事期间房间一直占着，柜员换班就得从头再来一遍，而且下次来还必须找同一个柜员。新版是每次办业务自带全套证件，任何一个窗口都能接单，人多了就多开窗口。

## 2026-07-28 规范：无状态核心

### 单次自描述请求

新规范将同一次工具调用压缩为单个自描述请求，任意实例均可处理：

```http
POST /mcp HTTP/1.1
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: search
Content-Type: application/json

{"jsonrpc":"2.0","id":1,"method":"tools/call",
 "params":{"name":"search","arguments":{"q":"otters"},
 "_meta":{"io.modelcontextprotocol/clientInfo":
   {"name":"my-app","version":"1.0"}}}}
```

变化可以概括为三点：

- **握手消失**：不再要求 `initialize`/`initialized` 交换；协议版本、客户端身份与能力改由每次请求的 `_meta` 字段携带
- **Session 头移除**：`Mcp-Session-Id` 从规范中删除，协议层不再维护会话生命周期
- **可选发现**：客户端若需提前了解服务端能力，可调用新的 `server/discover` RPC；不调用也不影响后续请求

### 六个 SEP 协同工作

这次无状态化不是单个提案完成的，而是六个规范增强提案（SEP）协同工作的结果：

| SEP | 内容 | 影响 |
|-----|------|------|
| SEP-2575 | 移除 initialize/initialized 握手 | 客户端不再需要先建立连接 |
| SEP-2567 | 移除 Mcp-Session-Id | 请求不再绑定到特定实例 |
| SEP-2243 | Header 路由（Mcp-Method/Mcp-Name） | 网关可直接路由，无需解析 body |
| SEP-2322 | Multi Round-Trip Requests (MRTR) | 替代服务器发起的请求 |
| SEP-2549 | List 响应可缓存 | 工具目录可被中间层缓存 |
| SEP-2577 | 废弃 Roots/Sampling/Logging | 12 个月过渡期 |

## Header 路由：让网关回归本职

新规范要求每个 Streamable HTTP 请求必须包含 `Mcp-Method` 和 `Mcp-Name` 头：

```
Mcp-Method: tools/call
Mcp-Name: search
```

这个变更的目的很明确：让中间层（负载均衡器、网关、WAF、可观测性工具）能够直接在 HTTP 头上路由、限流和授权，而不需要解析 JSON body。

```nginx
# NGINX 配置：基于 Header 的路由（新版）
upstream mcp_backend {
    # 不再需要 ip_hash 或 sticky cookie
    server mcp1:8080;
    server mcp2:8080;
    server mcp3:8080;
}

server {
    location /mcp {
        # 基于 Header 限流
        limit_req_zone $http_mcp_method zone=mcp_methods:10m rate=100r/s;

        # 基于 Header 授权
        if ($http_mcp_method = "tools/call") {
            # 需要额外权限校验
            access_by_lua_block {
                check_tool_permission($http_mcp_name)
            }
        }

        proxy_pass http://mcp_backend;
    }
}
```

### 安全注意事项

当负载均衡器在 Header 上路由，而服务器在 body 上执行时，两者可能不一致——这是一种常见的请求走私方式。因此规范要求服务器**必须**验证 Header 与 body 是否匹配，不匹配时返回 `400 Bad Request` 和 JSON-RPC 错误码 `-32020`。

```python
# MCP Server 端 Header-Body 一致性校验
from fastapi import Request, HTTPException

async def validate_header_body_match(request: Request):
    header_method = request.headers.get("Mcp-Method")
    header_name = request.headers.get("Mcp-Name")

    body = await request.json()
    body_method = body.get("method", "")
    body_name = body.get("params", {}).get("name", "")

    # tools/call 需要匹配 method 和 name
    if header_method == "tools/call":
        if body_method != "tools/call" or body_name != header_name:
            raise HTTPException(
                status_code=400,
                detail={
                    "jsonrpc": "2.0",
                    "error": {
                        "code": -32020,
                        "message": "Header-Body mismatch: potential request smuggling"
                    }
                }
            )
```

## MRTR：无状态下的交互式对话

移除 Session 后，服务器如何在中途向客户端请求输入？例如，工具调用需要用户确认或缺少参数时。

旧版 MCP 通过服务器发起的 `elicitation/create`、`sampling/createMessage` 和 `roots/list` 请求实现，这需要持久连接。新规范用 **Multi Round-Trip Requests (MRTR)** 替代：

```json
// 第一轮：服务器返回需要输入的结果
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "input_required",
    "inputRequests": [
      {
        "id": "confirm-delete",
        "type": "confirmation",
        "message": "Are you sure you want to delete this resource?",
        "metadata": {"resource": "production-db"}
      }
    ]
  }
}

// 第二轮：客户端带着回答重试原始调用
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "delete_resource",
    "arguments": {"resource_id": "prod-db-01"},
    "inputResponses": [
      {
        "id": "confirm-delete",
        "response": true
      }
    ]
  }
}
```

这个模式的优雅之处在于：每次请求仍然是自描述的、无状态的。服务器不需要记住"我在等一个确认"——确认信息直接附在重试请求中。

## 无状态协议，有状态应用

移除协议层 Session 不意味着应用必须无状态。规范明确指出：需要跨调用维护状态的服务器，可以采用 **显式句柄模式**（explicit-handle pattern）：

```typescript
// MCP Server: 显式句柄模式
interface FileEditorServer {
  // 第一次调用：创建编辑会话，返回句柄
  open_file(path: string): {
    file_handle: string;  // 显式句柄，模型可见
    content: string;
  };

  // 后续调用：模型传递句柄
  edit_file(file_handle: string, changes: Edit[]): {
    file_handle: string;  // 同一个句柄
    status: "ok";
  };

  // 最终调用：关闭会话
  save_file(file_handle: string): { saved: boolean };
}
```

MCP 官方发现这个模式比隐藏在传输层的 session 状态更强大：模型可以看到句柄、跨工具组合使用、在步骤间传递——而 externally managed session state 从不允许这种灵活性。

## List 响应可缓存

`tools/list`、`prompts/list`、`resources/list` 和 `resources/read` 的响应现在携带 `ttlMs` 和 `cacheScope` 字段：

```json
{
  "result": {
    "tools": [...],
    "_meta": {
      "cache": {
        "ttlMs": 3600000,
        "cacheScope": "server"
      }
    }
  }
}
```

这意味着客户端可以缓存工具目录，跨重连保持上游 prompt cache 稳定。对于有数千个工具的大型 MCP 服务器，这显著减少了重复拉取的开销。

## 废弃清单：Roots、Sampling、Logging

新规范引入了 12 个月的最小废弃窗口。三个功能被标记为废弃：

| 废弃功能 | 替代方案 | 原因 |
|---------|---------|------|
| **Roots** | 作为工具参数、资源 URI 或服务器配置传递 | 复杂性高，使用率低 |
| **Sampling** | 直接集成 LLM 提供商 API | 间接调用不如直接调用清晰 |
| **Logging** | 写入 stderr（stdio）或使用 OpenTelemetry | 标准可观测性工具更好 |

```python
# Logging 迁移示例

# 旧版（废弃）
@server.logging(level="info")
async def log_to_client(message: str):
    await server.send_log({"level": "info", "message": message})

# 新版：使用 OpenTelemetry
from opentelemetry import trace

tracer = trace.get_tracer("my-mcp-server")

@tracer.start_as_current_span("tool_execution")
async def execute_tool(name: str, args: dict):
    span = trace.get_current_span()
    span.set_attribute("tool.name", name)
    span.add_event("Tool execution started")
    # ... 执行工具 ...
    span.add_event("Tool execution completed")
```

## Extensions 框架：Tasks、MCP Apps、EMA

新规范正式锁定了 Extensions 框架，三个扩展加入：

- **Tasks**：长时间运行的工作流，支持异步任务跟踪
- **MCP Apps**：服务器渲染的 UI 组件，允许 Agent 展示富交互界面
- **EMA（Enterprise Managed Authorization）**：企业管理授权，对接 OAuth/OIDC 部署

```typescript
// MCP Server: Tasks 扩展示例
const server = new McpServer({
  name: "data-pipeline",
  version: "1.0.0",
  extensions: ["tasks"]
});

server.tool("run_pipeline", {
  description: "Run a data pipeline that may take minutes",
  // 声明为长时间运行任务
  taskConfig: {
    estimatedDuration: "PT5M",
    progressReporting: true,
    cancellable: true
  }
}, async (args, ctx) => {
  // 返回 task_id 而非直接结果
  const taskId = await ctx.tasks.create({
    type: "data_pipeline",
    input: args
  });

  return {
    resultType: "task_started",
    taskId: taskId,
    statusUrl: `/tasks/${taskId}/status`
  };
});
```

## 授权加固

新规范在授权方面做了重大调整：

- **废弃 DCR（Dynamic Client Registration）**：转向客户端元数据文档（CIMD）
- **RFC 9207 issuer 验证**：标准 OAuth 2.0 issuer 验证
- **12 个月正式废弃策略**：让开发者可以规划升级而非被动应对

```python
# 授权迁移：DCR → CIMD

# 旧版（废弃）：动态客户端注册
import httpx

async def register_client_dcr():
    response = await httpx.post(
        "https://mcp-server.com/.well-known/oauth/registration",
        json={
            "client_name": "my-agent",
            "redirect_uris": ["http://localhost:3000/callback"]
        }
    )
    return response.json()["client_id"], response.json()["client_secret"]

# 新版：客户端元数据文档
async def use_cimd():
    # 预先注册的客户端元数据
    client_metadata = {
        "client_id": "my-agent-pre-registered",
        "client_name": "my-agent",
        "grant_types": ["authorization_code", "refresh_token"],
        "redirect_uris": ["http://localhost:3000/callback"],
        "scope": "tools/call resources/read"
    }

    # 获取 issuer 配置（RFC 9207）
    issuer_config = await httpx.get(
        "https://mcp-server.com/.well-known/oauth-authorization-server"
    )

    return client_metadata, issuer_config.json()
```

## 迁移实战：关键步骤

### 1. 基础设施变更

```yaml
# Kubernetes: 移除粘性路由
apiVersion: v1
kind: Service
metadata:
  name: mcp-server
spec:
  selector:
    app: mcp-server
  ports:
    - port: 8080
      targetPort: 8080
  # 新版：不再需要 sessionAffinity
  # sessionAffinity: ClientIP  # 删除这行
  sessionAffinity: None  # 无状态，任意 Pod 可处理
```

### 2. SDK 升级

四大 Tier 1 SDK（TypeScript、Python、Go、C#）均已更新。以 Python SDK 为例：

```python
# 旧版（2025-11-25）：有状态客户端
from mcp import ClientSession

async with ClientSession("http://mcp-server.com/mcp") as session:
    await session.initialize()  # 必须先握手
    tools = await session.list_tools()
    result = await session.call_tool("search", {"q": "test"})
    # session 在整个生命周期内必须保持
    await session.close()

# 新版（2026-07-28）：无状态客户端
from mcp import StatelessClient

client = StatelessClient("http://mcp-server.com/mcp")

# 每次调用都是独立的
result1 = await client.call_tool("search", {"q": "test"})
result2 = await client.call_tool("analyze", {"data": result1})

# 无需 close()，没有会话需要关闭
```

### 3. 状态管理迁移

```python
# 旧版：依赖 session 隐式传递状态
@server.tool("multi_step_operation")
async def multi_step(step: int, session: Session):
    # 从 session 中获取之前的上下文
    context = session.get("context")
    if step == 1:
        context = await initialize_context()
        session.set("context", context)
    elif step == 2:
        result = await process(context)
        return result

# 新版：显式句柄
@server.tool("start_operation")
async def start_operation():
    context = await initialize_context()
    return {"handle": context.id}  # 模型将传递此句柄

@server.tool("continue_operation")
async def continue_operation(handle: str):
    context = await load_context(handle)
    result = await process(context)
    return result
```

## 规模数据

截至 2026 年 8 月，MCP 的生态规模：

- **月下载量**：接近 5 亿次（TypeScript 和 Python SDK 均超过 10 亿次总下载）
- **官方注册表**：9,600+ MCP 服务器
- **SDK 支持**：TypeScript、Python、Go、C# 四大 Tier 1 SDK
- **采纳方**：OpenAI、Google、Microsoft 均已采纳
- **基金会归属**：2025 年 12 月捐赠给 Linux Foundation 的 Agentic AI Foundation

## 对开发者的实际影响

### 需要立即行动的

1. **如果你的 MCP 服务器使用粘性路由**：移除 `ip_hash` 或 sticky cookie 配置
2. **如果你的客户端依赖 `initialize` 握手**：迁移到 `_meta` 携带能力信息
3. **如果你使用 Roots/Sampling/Logging**：规划 12 个月内迁移到替代方案
4. **如果你的服务器使用 DCR**：迁移到 CIMD + RFC 9207

### 可以逐步迁移的

- 旧客户端和新服务器不兼容，新客户端和旧服务器也不兼容——双向不兼容
- 支持两个版本是唯一的迁移路径：通过 `protocolVersion` 协商
- 12 个月的废弃窗口给了充足的时间

### 招标与采购

企业采购文件需注明 MCP 版本：`MCP-Protocol-Version: 2026-07-28`。旧版 MCP 服务器在有状态部署上的局限性应作为技术评估的硬性指标。

## 结语

MCP 移除 Session 不是一次性能优化，而是一次产业分工的划界：协议层收缩到只管传输语义，状态存在哪、断线后怎么恢复，这些全部下沉为应用侧或云厂商的生意。

协议不再替你记事。这既是自由，也是责任。

## 参考资料

- [MCP 2026-07-28 规范官方公告](https://blog.modelcontextprotocol.io/posts/2026-07-28)
- [MCP 2026-07-28 Release Candidate 说明](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate)
- [MCP 无状态迁移指南](https://hashnode.com/blog/mcp-stateless-migration)
- [MCP 无状态协议迁移实战](https://therouter.ai/blog/mcp-stateless-protocol-migration-guide)
- [MCP 2026-07-28 规范中文解读](https://blog.yeyupiaoling.cn/article/1785600443255)
- [Agent Interface Tracker - 协议状态追踪](https://agentinterface.app/tracker)
