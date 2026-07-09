---
title: "X MCP Server 实战：零配置接入 150+ API 端点的托管服务集成"
date: 2026-07-09
tags:
  - ai
  - MCP
  - agent
  - API
  - Python
keywords:
  - X MCP Server
  - MCP托管服务
  - AI Agent
  - API集成
  - 零配置接入
  - Twitter API
  - xAI
  - Grok
category: ai
description: "X（Twitter）推出官方托管 MCP Server，支持 150+ API 端点零配置接入 AI Agent。本文从实战角度详解 SDK 配置、认证流程、端点分类、Python/TypeScript 代码示例及生产部署注意事项。"
---

# X MCP Server 实战：零配置接入 150+ API 端点的托管服务集成

## 引言

2026 年 6 月 30 日，X（原 Twitter）宣布推出官方托管 MCP Server，让 AI 工具可以直接通过 Model Context Protocol（MCP）接入 X 平台的 150+ API 端点。这是继 Anthropic、OpenAI 之后，又一大型平台将 MCP 作为 AI Agent 生态的标准接口层——标志着 MCP 从"协议提案"正式走向"平台级生产部署"。

对于独立开发者、AI Agent 构建者和数据分析师而言，这意味着**不再需要手动对接 OAuth 2.0 + REST API 的繁琐流程**，只需一条 MCP 连接配置，即可让 Agent 读写推文、搜索趋势、管理列表、分析互动数据。

本文将从实战角度拆解 X MCP Server 的架构、SDK 使用、认证机制和部署注意事项。

---

## 一、MCP 协议回顾与托管服务模式

### 1.1 MCP 是什么？

Model Context Protocol（MCP）是 Anthropic 于 2024 年底提出的开放协议，定义了 AI 模型与外部工具/数据源之间的标准交互方式：

```
┌─────────────┐     MCP JSON-RPC      ┌─────────────┐
│  AI Client  │ ◄──────────────────► │  MCP Server  │
│  (Claude/   │   tools/list          │  (X API /    │
│   GPT/      │   tools/call          │   DB /       │
│   Cursor)   │   resources/read      │   Search)    │
└─────────────┘                        └─────────────┘
```

核心概念：
- **Tools**：可调用的函数（如 `post_tweet`、`search_tweets`）
- **Resources**：可读取的数据（如用户时间线、趋势列表）
- **Prompts**：预定义的提示模板（如"分析这条推文的情感倾向"）

### 1.2 自托管 vs 托管 MCP

之前的 MCP 集成需要开发者**自己部署 MCP Server**：

```python
# 自托管模式（传统方式）
from mcp.server import Server

server = Server("my-custom-x-server")

@server.tool()
async def search_tweets(query: str) -> dict:
    # 自己处理 OAuth、HTTP 调用、错误重试
    token = await get_oauth_token()
    resp = await httpx.get(f"https://api.x.com/2/tweets/search/recent?query={query}",
                           headers={"Authorization": f"Bearer {token}"})
    return resp.json()

# 需要自己运行 stdio/SSE 传输层
async def main():
    await server.run()
```

**托管 MCP Server** 模式下，X 已经把这一切做好了——Server 运行在 X 的基础设施上，开发者只需配置连接参数：

```json
// 托管模式（零配置）
{
  "mcpServers": {
    "x-server": {
      "url": "https://mcp.x.com/sse",
      "headers": {
        "Authorization": "Bearer <your-api-key>"
      }
    }
  }
}
```

**关键差异对比**：

| 维度 | 自托管 MCP | 托管 MCP |
|------|-----------|----------|
| 部署 | 需要 Docker/云服务器 | 零部署，X 基础设施托管 |
| 认证 | 自己实现 OAuth 2.0 流程 | API Key 直通，X 处理 OAuth |
| 维护 | 自己更新 API 变更 | X 自动同步 API 更新 |
| 传输层 | stdio / SSE 自选 | SSE（Server-Sent Events） |
| 扩展性 | 自定义端点 | 150+ 端点全覆盖 |
| 费用 | 服务器 + API 调用费 | 仅 API 按量付费 |

---

## 二、X MCP Server 架构解析

### 2.1 整体架构

```
┌──────────────────────────────────────────────────┐
│                   AI Client                       │
│  (Claude Desktop / Cursor / OpenCode / 自建Agent) │
└──────────────────────┬───────────────────────────┘
                       │ MCP JSON-RPC over SSE
                       │ (HTTPS + Server-Sent Events)
                       ▼
┌──────────────────────────────────────────────────┐
│            X Managed MCP Server                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────────────┐  │
│  │ Tool     │  │Resource │  │ Prompt           │  │
│  │ Registry │  │ Catalog │  │ Templates        │  │
│  │ (150+)   │  │ (30+)   │  │ (10+)            │  │
│  └─────────┘  └─────────┘  └─────────────────┘  │
│  ┌─────────────────────────────────────────────┐ │
│  │  Auth Layer (API Key → OAuth 2.0 internal)  │ │
│  │  Rate Limit / Quota / Billing               │ │
│  └─────────────────────────────────────────────┘ │
└──────────────────────┬───────────────────────────┘
                       │ Internal API Calls
                       ▼
┌──────────────────────────────────────────────────┐
│                X Platform APIs                    │
│  Tweets / Users / Search / Spaces / Lists /      │
│  Media / Trends / Bookmarks / Direct Messages    │
└──────────────────────────────────────────────────┘
```

### 2.2 端点分类

X MCP Server 暴露的 150+ 端点按功能域分类：

| 功能域 | 端点数量 | 代表性工具 | 用途 |
|--------|---------|-----------|------|
| **推文管理** | ~25 | `post_tweet`, `delete_tweet`, `get_tweet` | 发布/删除/读取推文 |
| **搜索** | ~15 | `search_recent`, `search_full_archive` | 实时/全量搜索 |
| **用户** | ~20 | `get_user_by_id`, `get_user_by_username` | 用户信息查询 |
| **时间线** | ~15 | `get_user_timeline`, `get_home_timeline` | 时间线获取 |
| **互动** | ~20 | `like_tweet`, `retweet`, `reply_to_tweet` | 点赞/转发/回复 |
| **列表** | ~10 | `create_list`, `add_list_member` | 列表管理 |
| **Spaces** | ~10 | `search_spaces`, `get_space_by_id` | 空间搜索 |
| **媒体** | ~15 | `upload_media`, `get_media_info` | 图片/视频上传 |
| **趋势** | ~5 | `get_trends_by_woeid` | 地区趋势 |
| **书签/私信** | ~10 | `bookmark_tweet`, `send_dm` | 书签/私信 |
| **分析** | ~15 | `get_tweet_metrics`, `get_user_metrics` | 互动数据分析 |

---

## 三、实战集成：SDK 配置与代码示例

### 3.1 获取 API Key

在 X Developer Portal 注册应用后，获取以下凭证：

1. **API Key**（`x-api-key`）：用于 MCP Server 认证
2. **API Key Secret**：可选，用于 OAuth 2.0 with PKCE 流程
3. **Bearer Token**：用于只读端点的 App-level 认证

按量付费模式（Pay-as-you-go）：
- **Free Tier**：1,500 条推文/月（只读）
- **Basic Tier**：$100/月，10,000 条推文 + 3,000 搜索请求
- **Pro Tier**：$5,000/月，1M 条推文 + 全量搜索 + Spaces

### 3.2 Claude Desktop 配置

在 `claude_desktop_config.json` 中添加：

```json
{
  "mcpServers": {
    "x-server": {
      "url": "https://mcp.x.com/sse",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY_HERE"
      }
    }
  }
}
```

启动 Claude Desktop 后，在对话中直接使用：

```
User: 搜索最近关于 Golang 1.27 的推文，按互动量排序

Claude: 我将调用 X MCP Server 的 search_recent 工具...
[调用 tools/call: search_recent, query="Golang 1.27", sort_order="relevancy"]
找到 47 条相关推文，按互动量排序的前 5 条：
1. @golang_official: "Go 1.27 RC2 发布..." (2,345 likes)
2. ...
```

### 3.3 Python SDK 集成

X 提供了官方 Python SDK `x-mcp-sdk`：

```python
# 安装
# pip install x-mcp-sdk

import asyncio
from x_mcp_sdk import XMCPClient

# 初始化客户端（SSE 传输层，零配置）
client = XMCPClient(
    api_key="YOUR_API_KEY",
    # 托管模式：直接连接 X 的 MCP Server
    server_url="https://mcp.x.com/sse",
    # 可选：自定义超时和重试
    timeout=30,
    max_retries=3
)

async def main():
    # 1. 发现可用工具
    tools = await client.list_tools()
    print(f"可用工具数量: {len(tools)}")
    
    # 输出前 10 个工具名称
    for tool in tools[:10]:
        print(f"  - {tool.name}: {tool.description[:60]}...")
    
    # 2. 搜索推文
    results = await client.call_tool(
        "search_recent",
        arguments={
            "query": "Golang MCP protocol",
            "max_results": 20,
            "sort_order": "relevancy",
            "tweet_fields": ["created_at", "public_metrics", "author_id"]
        }
    )
    
    for tweet in results["data"]:
        metrics = tweet["public_metrics"]
        print(f"@{tweet['author_id']}: {tweet['text'][:80]}...")
        print(f"  ❤️ {metrics['like_count']} | 🔁 {metrics['retweet_count']}")
    
    # 3. 发布推文
    post_result = await client.call_tool(
        "post_tweet",
        arguments={
            "text": "刚刚通过 X MCP Server 发布这条推文 🤖 #MCP #AI"
        }
    )
    print(f"发布成功！Tweet ID: {post_result['data']['id']}")
    
    # 4. 获取用户时间线
    timeline = await client.call_tool(
        "get_user_timeline",
        arguments={
            "username": "golang_official",
            "max_results": 10,
            "exclude": ["replies", "retweets"]
        }
    )
    
    # 5. 读取资源（用户信息）
    user_info = await client.read_resource(
        "x://user/golang_official/profile"
    )
    print(f"用户: {user_info['name']}, 粉丝: {user_info['followers_count']}")

asyncio.run(main())
```

### 3.4 TypeScript SDK 集成

```typescript
// 安装
// npm install @x/mcp-sdk

import { XMCPClient } from '@x/mcp-sdk';

const client = new XMCPClient({
  apiKey: process.env.X_API_KEY!,
  serverUrl: 'https://mcp.x.com/sse',
  timeout: 30000,
});

async function main() {
  // 1. 列出所有资源
  const resources = await client.listResources();
  console.log(`可用资源: ${resources.length} 个`);
  
  // 2. 搜索全量归档推文（Pro Tier）
  const archiveResults = await client.callTool('search_full_archive', {
    query: 'CVE-2026-48282 ColdFusion',
    max_results: 50,
    start_time: '2026-06-01T00:00:00Z',
    end_time: '2026-07-09T00:00:00Z',
    tweet_fields: ['created_at', 'public_metrics', 'entities'],
  });
  
  // 3. 分析推文互动趋势
  const metrics = archiveResults.data.map((t: any) => ({
    date: t.created_at,
    likes: t.public_metrics.like_count,
    retweets: t.public_metrics.retweet_count,
    replies: t.public_metrics.reply_count,
  }));
  
  // 计算日均互动量
  const avgLikes = metrics.reduce((s: number, m: any) => s + m.likes, 0) / metrics.length;
  console.log(`日均点赞: ${avgLikes.toFixed(1)}`);
  
  // 4. 上传媒体并发布带图推文
  const mediaResult = await client.callTool('upload_media', {
    media_type: 'image/png',
    media_category: 'tweet_image',
    media_data: Buffer.from('...').toString('base64'), // 图片 base64
  });
  
  await client.callTool('post_tweet', {
    text: '安全漏洞分析图解',
    media_ids: [mediaResult.data.media_id_string],
  });
  
  // 5. 使用预定义 Prompt 模板
  const prompts = await client.listPrompts();
  const sentimentPrompt = prompts.find((p: any) => p.name === 'analyze_tweet_sentiment');
  
  if (sentimentPrompt) {
    const result = await client.getPrompt(sentimentPrompt.name, {
      tweet_id: '1234567890',
    });
    console.log('Prompt 模板内容:', result.messages);
  }
}

main().catch(console.error);
```

### 3.5 命令行工具 XURL

X 还推出了命令行工具 `xurl`，可直接在终端调用 MCP 端点：

```bash
# 安装
# npm install -g @x/xurl

# 认证配置
xurl auth --api-key YOUR_API_KEY

# 搜索推文
xurl search-recent --query "Golang 1.27" --max-results 10 --sort relevancy

# 发布推文
xurl post-tweet --text "Hello from X MCP CLI! 🚀"

# 获取用户信息
xurl get-user --username golang_official

# 获取趋势
xurl get-trends --woeid 1  # 全球趋势

# 批量操作：搜索 + 分析
xurl search-recent --query "CVE 2026" --max-results 100 \
  | xurl analyze --metric public_metrics --aggregate avg
```

---

## 四、认证机制与安全设计

### 4.1 双层认证架构

X MCP Server 采用了**外部 API Key + 内部 OAuth 2.0** 的双层认证：

```
┌──────────────┐
│  AI Client   │
│  API Key     │  ← 开发者提供的凭证
│  (Bearer)    │
└──────┬───────┘
       │ HTTPS + SSE
       ▼
┌──────────────┐
│  MCP Server  │
│  ┌─────────┐ │
│  │Key →    │ │  ← X 内部自动映射到 OAuth 2.0 token
│  │OAuth 2.0│ │
│  │token    │ │
│  └─────────┘ │
│  ┌─────────┐ │
│  │Scope    │ │  ← 按 API Key tier 自动限定权限范围
│  │enforce  │ │
│  └─────────┘ │
└──────────────┘
```

**API Key 映射规则**：
- **Free Tier Key** → 只读 scope（`tweet.read`, `user.read`, `search.read`）
- **Basic Tier Key** → 读写 scope（+`tweet.write`, `like.write`, `bookmark.write`）
- **Pro Tier Key** → 全 scope（+`space.read`, `dm.read/write`, `media.write`）

### 4.2 权限校验流程

每次 `tools/call` 请求，MCP Server 都会执行：

```python
# X MCP Server 内部逻辑（伪代码）
async def validate_tool_call(api_key: str, tool_name: str, arguments: dict):
    # 1. 验证 API Key 有效性
    tier = await get_tier_from_key(api_key)
    if not tier:
        raise MCPError("INVALID_API_KEY", "API key not found or expired")
    
    # 2. 检查 tool 是否在 tier 的权限范围内
    tool_scope_map = {
        "post_tweet": "tweet.write",
        "search_full_archive": "search.full_archive",
        "send_dm": "dm.write",
        # ... 150+ mappings
    }
    required_scope = tool_scope_map.get(tool_name)
    if required_scope not in tier.allowed_scopes:
        raise MCPError("SCOPE_DENIED", f"Tool '{tool_name}' requires '{required_scope}' scope")
    
    # 3. 检查配额
    quota = await check_quota(api_key, tool_name)
    if quota.remaining <= 0:
        raise MCPError("QUOTA_EXCEEDED", f"Monthly quota for '{tool_name}' exhausted")
    
    # 4. 执行内部 OAuth token 获取
    oauth_token = await get_oauth_token(api_key)
    
    # 5. 调用 X Platform API
    return await call_x_api(oauth_token, tool_name, arguments)
```

### 4.3 Rate Limiting

MCP Server 在 HTTP 层和配额层双重限速：

| 层级 | 机制 | 细节 |
|------|------|------|
| HTTP | 429 Too Many Requests | 15-min 窗口，按端点分组 |
| 配额 | 月度 quota 消耗 | 按 tier 限定总量 |
| SSE | 连接数上限 | 每个 API Key 最多 5 个 SSE 连接 |

客户端应处理限速错误：

```python
from x_mcp_sdk import XMCPClient, MCPRateLimitError

client = XMCPClient(api_key="...", max_retries=3)

try:
    result = await client.call_tool("search_recent", {"query": "Golang"})
except MCPRateLimitError as e:
    retry_after = e.headers.get("retry-after", 60)
    print(f"限速了，等待 {retry_after} 秒后重试")
    await asyncio.sleep(int(retry_after))
    result = await client.call_tool("search_recent", {"query": "Golang"})
```

---

## 五、与自建 MCP Server 对比：什么时候用托管？

### 5.1 适用场景矩阵

| 场景 | 托管 MCP | 自建 MCP |
|------|---------|----------|
| **快速原型** | ✅ 零配置，5 分钟接入 | ❌ 需要部署+认证 |
| **数据分析 Agent** | ✅ 搜索+metrics 全覆盖 | ⚠️ 可定制但需维护 |
| **社交媒体管理** | ✅ 读写全覆盖 | ⚠️ 自建更灵活 |
| **合规审计** | ✅ 平台保证数据合规 | ❌ 需自己处理 |
| **自定义端点** | ❌ 仅 X 官方端点 | ✅ 完全自定义 |
| **混合数据源** | ⚠️ 仅 X 数据 | ✅ 可聚合多数据源 |
| **离线/内网部署** | ❌ 必须联网 | ✅ 完全自主 |

### 5.2 混合架构方案

实际生产中，推荐**托管 MCP + 自建 MCP 混合部署**：

```json
// Claude Desktop 配置：混合模式
{
  "mcpServers": {
    // 托管：X 平台 API
    "x-server": {
      "url": "https://mcp.x.com/sse",
      "headers": {
        "Authorization": "Bearer YOUR_X_API_KEY"
      }
    },
    // 自建：内部数据库 + 自定义逻辑
    "internal-db": {
      "command": "python",
      "args": ["-m", "my_db_mcp_server"],
      "env": {
        "DB_URL": "postgresql://..."
      }
    },
    // 自建：Sentiment Analysis 微服务
    "sentiment": {
      "command": "python",
      "args": ["-m", "sentiment_mcp_server"],
      "env": {
        "MODEL_PATH": "/models/sentiment-v3"
      }
    }
  }
}
```

这样 AI Client 可以同时调用：
1. `x-server.search_recent` → 获取推文
2. `sentiment.analyze_text` → 情感分析
3. `internal-db.store_analysis` → 存储结果

**Agent 协调流程**：

```python
# 多 MCP Server 协调示例
async def analyze_tweet_sentiment_trend(query: str):
    # Step 1: 从 X MCP 搜索推文
    tweets = await x_client.call_tool("search_recent", {
        "query": query,
        "max_results": 100,
        "tweet_fields": ["public_metrics", "created_at"]
    })
    
    # Step 2: 用自建 Sentiment MCP 分析情感
    sentiments = []
    for tweet in tweets["data"]:
        result = await sentiment_client.call_tool("analyze_text", {
            "text": tweet["text"],
            "language": "auto"
        })
        sentiments.append({
            "tweet_id": tweet["id"],
            "sentiment": result["label"],  # positive/negative/neutral
            "score": result["score"],
            "likes": tweet["public_metrics"]["like_count"]
        })
    
    # Step 3: 存入内部数据库
    await db_client.call_tool("insert_analysis_batch", {
        "table": "tweet_sentiment_analysis",
        "records": sentiments
    })
    
    # Step 4: 生成趋势报告
    positive_pct = sum(1 for s in sentiments if s["sentiment"] == "positive") / len(sentiments)
    avg_score = sum(s["score"] for s in sentiments) / len(sentiments)
    
    return {
        "query": query,
        "total_tweets": len(sentiments),
        "positive_pct": f"{positive_pct:.1%}",
        "avg_sentiment_score": f"{avg_score:.2f}",
        "top_positive": sorted(sentiments, key=lambda s: s["score"], reverse=True)[:5],
        "top_negative": sorted(sentiments, key=lambda s: s["score"])[:5]
    }
```

---

## 六、生产部署注意事项

### 6.1 SSE 连接管理

托管 MCP 使用 SSE 传输层，需注意：

```python
# SSE 连接生命周期管理
class XMCPSession:
    def __init__(self, api_key: str):
        self.client = XMCPClient(api_key=api_key)
        self._sse_connection = None
    
    async def connect(self):
        """建立 SSE 连接，设置自动重连"""
        self._sse_connection = await self.client.connect_sse(
            on_disconnect=self._on_disconnect,
            reconnect_interval=5,  # 5 秒自动重连
            max_reconnect_attempts=10
        )
    
    async def _on_disconnect(self, reason: str):
        """处理断连事件"""
        print(f"SSE 断连: {reason}")
        # 可选：通知监控系统
        await self._notify_monitor(reason)
    
    async def graceful_shutdown(self):
        """优雅关闭"""
        await self.client.disconnect()
        print("SSE 连接已关闭")
    
    async def _notify_monitor(self, event: str):
        """集成可观测性"""
        # 推送到 Prometheus / Datadog
        pass
```

### 6.2 错误处理最佳实践

```python
from x_mcp_sdk import (
    XMCPClient,
    MCPAuthError,        # 认证失败
    MCPRateLimitError,   # 限速
    MCPQuotaError,       # 配额耗尽
    MCPValidationError,  # 参数校验失败
    MCPServerError,      # 服务端错误
    MCPConnectionError,  # 连接失败
)

client = XMCPClient(api_key="...", timeout=30, max_retries=3)

async def safe_call_tool(tool_name: str, arguments: dict) -> dict:
    """带完整错误处理的 MCP 工具调用"""
    try:
        return await client.call_tool(tool_name, arguments)
    
    except MCPAuthError as e:
        # API Key 过期或无效，需要重新获取
        print(f"认证失败: {e.message}")
        # 刷新 API Key 或通知管理员
        raise
    
    except MCPRateLimitError as e:
        # 限速，需要等待
        retry_after = int(e.headers.get("retry-after", "60"))
        print(f"限速: 等待 {retry_after}s")
        await asyncio.sleep(retry_after)
        return await client.call_tool(tool_name, arguments)  # 重试
    
    except MCPQuotaError as e:
        # 月度配额耗尽，无法继续
        print(f"配额耗尽: {e.message}")
        # 切换到备用 API Key 或升级 tier
        raise
    
    except MCPValidationError as e:
        # 参数错误，检查输入
        print(f"参数错误: {e.message}")
        print(f"预期参数: {e.expected_schema}")
        raise
    
    except MCPServerError as e:
        # X 平台 5xx 错误
        print(f"服务端错误: {e.status_code} - {e.message}")
        # 可重试
        if e.status_code >= 500 and e.status_code < 600:
            await asyncio.sleep(2)
            return await client.call_tool(tool_name, arguments)
        raise
    
    except MCPConnectionError as e:
        # SSE 连接断开
        print(f"连接断开: {e.message}")
        await client.reconnect()
        return await client.call_tool(tool_name, arguments)
```

### 6.3 配额监控与成本控制

```python
# 配额监控装饰器
import time
from functools import wraps

class QuotaMonitor:
    """按月追踪 MCP API 配额消耗"""
    
    def __init__(self, monthly_budget: dict):
        # monthly_budget: {"search_recent": 3000, "post_tweet": 1500, ...}
        self.budget = monthly_budget
        self.usage = {k: 0 for k in monthly_budget}
        self._start_time = time.time()
    
    def track(self, tool_name: str):
        """装饰器：追踪每次调用"""
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                if tool_name not in self.budget:
                    raise ValueError(f"未配置配额: {tool_name}")
                
                if self.usage[tool_name] >= self.budget[tool_name]:
                    raise MCPQuotaError(
                        f"配额耗尽: {tool_name} 已用 {self.usage[tool_name]}/{self.budget[tool_name]}"
                    )
                
                result = await func(*args, **kwargs)
                self.usage[tool_name] += 1
                
                # 告警阈值：80%
                pct = self.usage[tool_name] / self.budget[tool_name]
                if pct >= 0.8:
                    print(f"⚠️ 配额告警: {tool_name} 已用 {pct:.0%}")
                
                return result
            return wrapper
        return decorator

# 使用
monitor = QuotaMonitor({
    "search_recent": 3000,
    "post_tweet": 1500,
    "get_user_timeline": 1000,
})

@monitor.track("search_recent")
async def search_tweets(query: str):
    return await client.call_tool("search_recent", {"query": query})
```

### 6.4 数据合规要点

使用 X MCP Server 处理用户数据时需注意：

1. **GDPR/CCPA**：推文涉及用户内容，存储和分析需合规
2. **X Platform Terms**：不得长期存储推文全文（最多缓存 24 小时）
3. **数据最小化**：只请求需要的 `tweet_fields`，避免过度采集
4. **用户同意**：分析私人时间线需明确获得用户授权

```python
# 合规最佳实践：最小化数据请求
async def compliant_search(query: str):
    # 只请求必要字段，不采集多余用户数据
    results = await client.call_tool("search_recent", {
        "query": query,
        "max_results": 10,
        "tweet_fields": ["created_at", "public_metrics"],  # 不包含 author_id/entities
        "expansions": [],  # 不展开关联对象
    })
    
    # 不持久化推文全文，只提取聚合指标
    metrics_summary = {
        "total_tweets": len(results["data"]),
        "avg_likes": sum(t["public_metrics"]["like_count"] for t in results["data"]) / len(results["data"]),
        "timestamp": datetime.now().isoformat(),
    }
    
    # 推文原文 24 小时后自动删除
    return metrics_summary  # 只返回聚合数据
```

---

## 七、与其他平台 MCP Server 对比

| 平台 | MCP 模式 | 端点数量 | 认证方式 | 定价 |
|------|---------|---------|---------|------|
| **X (Twitter)** | 托管 SSE | 150+ | API Key | 按量付费 ($0→$5000) |
| **GitHub** | 自托管 stdio | ~50 | OAuth PAT | 免费 |
| **Slack** | 自托管 stdio | ~30 | Bot Token | 免费 |
| **Notion** | 自托管 stdio | ~20 | Integration Token | 免费 |
| **Google Drive** | 自托管 | ~15 | OAuth 2.0 | 免费 |
| **PostgreSQL** | 自托管 stdio | ~10 | 连接字符串 | 免费 |

**X 是第一个大规模部署托管 MCP 的商业平台**，这一模式的优势在于：
- 开发者零运维负担
- 平台保证 API 同步和兼容性
- 认证流程极大简化
- 但代价是丧失自定义能力和平台依赖

---

## 八、总结与展望

### 关键要点

1. **零配置接入**：X MCP Server 是首个大规模托管 MCP 服务，开发者只需 API Key 即可接入 150+ 端点
2. **双语言 SDK**：Python `x-mcp-sdk` + TypeScript `@x/mcp-sdk` 提供了完整工具链
3. **混合架构**：生产环境推荐托管 MCP + 自建 MCP 混合部署，兼顾便利性和灵活性
4. **配额与合规**：按量付费模式需要注意成本控制和数据合规，特别是 GDPR/CCPA

### 未来展望

X MCP Server 的推出标志着 MCP 协议进入**平台级生产部署阶段**：

- **更多平台跟进**：预计 LinkedIn、Reddit、Discord 等社区平台将推出托管 MCP
- **Agent 互操作性**：MCP 作为标准接口层，让 Agent 可以跨平台无缝操作
- **计费模型标准化**：按量付费将成为 MCP 托管服务的标准计费模式
- **安全合规框架**：MCP 协议将增加数据合规和安全审计的标准化组件

对于独立开发者和 AI Agent 构建者，现在正是拥抱 MCP 生态的最佳时机——从 X MCP Server 开始，零配置接入，5 分钟即可让 Agent 获得社交媒体的完整操作能力。

---

## 参考资料

- [X MCP Server 官方文档](https://docs.x.com/mcp)
- [Model Context Protocol 规范](https://spec.modelcontextprotocol.io/)
- [X Developer Portal](https://developer.x.com/)
- [x-mcp-sdk Python 包](https://pypi.org/project/x-mcp-sdk/)
- [@x/mcp-sdk TypeScript 包](https://www.npmjs.com/package/@x/mcp-sdk)
- [TechCrunch: X MCP Server 发布报道](https://techcrunch.com/2026/06/30/x-now-offers-an-mcp-server/)
- [Anthropic MCP 官方仓库](https://github.com/anthropics/mcp)
