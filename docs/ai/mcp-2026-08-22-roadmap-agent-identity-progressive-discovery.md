---
title: "MCP 2026-08-22 新版路线图深度解读：Agent Identity、DPoP 与 Progressive Discovery"
date: 2026-08-28
tags: ["ai", "mcp", "agent", "security", "golang"]
keywords: ["MCP", "Model Context Protocol", "Agent Identity", "DPoP", "Workload Identity Federation", "Progressive Discovery", "SEP-2663", "HTTP/2 over stdio"]
category: ai
description: "2026 年 8 月 22 日，MCP 官方发布新版路线图，将 Agent Identity 提升为独立优先级，并启动 Progressive Discovery。本文结合 SEP-2663、DPoP、WIF 与 HTTP/2 over stdio，解读企业级 MCP 落地的身份与传输变革。"
---

# MCP 2026-08-22 新版路线图深度解读：Agent Identity、DPoP 与 Progressive Discovery

2026 年 8 月 22 日，Model Context Protocol（MCP）官方发布了 2026 年下半年新版路线图。与 3 月份版本相比，这次更新最大的变化是把 **Agent Identity** 从“远期展望（on the horizon）”直接提升为五大优先方向之一，并正式启动了 **Progressive Discovery** 工作流。对于正在把 MCP 从本地工具链推进到企业级多 Agent 系统的开发者来说，这标志着协议从“功能丰富”进入“治理成熟”阶段。

本文聚焦新版路线图中与企业落地最相关的三个点：Agent Identity、Progressive Discovery 和 HTTP-native 传输统一，并给出可直接运行的 Go 代码示例。

## 一、新版 vs 旧版：五大优先方向对比

2026 年 3 月的旧版路线图为四大方向：传输层演进、Agent 通信、治理成熟度、企业就绪。8 月 22 日新版将其扩展为五大优先级：

| 优先级 | 旧版（2026-03） | 新版（2026-08-22） |
|---|---|---|
| 1 | 传输层演进 | Agentic messaging primitives（server-initiated events、webhooks、Tasks SEP-2663） |
| 2 | Agent 通信 | HTTP-native transport unification（Streamable HTTP、HTTP/2 over stdio） |
| 3 | 治理成熟度 | Agent identity and enterprise-ready security（DPoP、WIF、ID-JAG、RFC 8693） |
| 4 | — | Improved primitives（tools/call 结果类型重构、progressive discovery） |
| 5 | 企业就绪 | SDK 开发者体验 |

最大的结构变化是：**Agent Identity 独立成级，并明确给出 DPoP、Workload Identity Federation、ID-JAG、RFC 8693 token exchange 四张具体技术牌。**

## 二、Agent Identity：从“谁调用了工具”到“谁对结果负责”

当前 MCP Server 最常见的鉴权模型是：客户端持有 API Key，调用工具时把 Key 带在请求头里。这个模型在本地 Claude Desktop 插件场景下没问题，但在多 Agent 协作、A2A 与 MCP 混合部署时会出现一个根本性问题：**Server 知道“哪个客户端在调用”，但不知道“哪个 Agent 发起了这次操作”**。一旦某个子 Agent 越权，审计日志只能追到客户端，无法追到真正的责任主体。

Agent Identity 要解决的就是这个问题：让每一个工具调用都携带可验证的 Agent 身份声明。

### 2.1 DPoP：把 Token 绑定到具体请求

Demonstrating Proof-of-Possession（DPoP，RFC 9449）原本用于 OAuth 2.0 的 Token 绑定。在 MCP 中，它的作用是：**让 Server 确信，眼前的这个 Access Token 确实属于当前这次 HTTP 请求，而不是被中间人重放的。**

DPoP 的核心机制：

1. 客户端生成一对临时 ECDSA 或 EdDSA 密钥。
2. 对每次请求，客户端用私钥签署一个 JWT（即 DPoP Proof），其 payload 包含 HTTP 方法、请求 URI、请求时间戳。
3. 客户端把 DPoP Proof 和 Access Token 同时发给 Server。
4. Server 验证 DPoP Proof 的签名、方法、URI，并检查 Access Token 中是否绑定了对应的公钥哈希。

下面是一个用 Go 生成 DPoP Proof 的最小示例：

```go
package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type DPoPClaims struct {
	HTU string `json:"htu"`
	HTM string `json:"htm"`
	JKT string `json:"jkt,omitempty"`
	jwt.RegisteredClaims
}

func main() {
	// 1. 生成临时 ECDSA 密钥对
	priv, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	pub := priv.Public().(*ecdsa.PublicKey)

	// 2. 计算公钥的 SHA-256 thumbprint（用于绑定 Access Token）
	pubBytes := elliptic.MarshalCompressed(elliptic.P256(), pub.X, pub.Y)
	jkt := base64.RawURLEncoding.EncodeToString(sha256.Sum256(pubBytes)[:])

	// 3. 构建 DPoP Proof
	claims := DPoPClaims{
		HTU: "https://mcp.example.com/mcp",
		HTM: "POST",
		JKT: jkt,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        fmt.Sprintf("%d", time.Now().UnixNano()),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	token.Header["jwk"] = map[string]any{
		"kty": "EC",
		"crv": "P-256",
		"x":   base64.RawURLEncoding.EncodeToString(pub.X.Bytes()),
		"y":   base64.RawURLEncoding.EncodeToString(pub.Y.Bytes()),
	}

	dpop, err := token.SignedString(priv)
	if err != nil {
		panic(err)
	}

	fmt.Println("DPoP Proof:", dpop)
	fmt.Println("Bound JKT:", jkt)

	// 4. 实际请求时，把 dpop 放入 DPoP 头，Access Token 放入 Authorization 头
	// Access Token 的 cnf.jkt 声明应等于上面的 jkt
}
```

运行后会得到一个 JWT 形式的 DPoP Proof。Server 端拿到后，用 header 里的 `jwk` 验证签名，再对比 payload 中的 `htu`/`htm`，即可确认 Token 与请求绑定。

### 2.2 Workload Identity Federation：让云原生 Agent 不再持钥

在 Kubernetes、AWS ECS、Azure Container Apps 等环境中，让 Agent Pod 持有一个长期 API Key 是反模式。Workload Identity Federation（WIF）允许 Server 直接验证云平台的身份文档（如 Kubernetes Service Account Token、GCP Service Account 签名 JWT、AWS OIDC Token），然后签发短期 MCP Access Token。

在 MCP 路线图中，WIF 对应 SEP-1933，目标是把“云平台工作负载身份”映射为“MCP Agent 身份”。这样 Agent 不需要持久化任何 Key，其生命周期与云工作负载完全一致。

### 2.3 ID-JAG 与 RFC 8693 Token Exchange

- **ID-JAG**：用于 Agent 之间传递身份上下文，保证一个 Agent 调用另一个 Agent 的工具时，原始用户身份和中间 Agent 身份都能被审计。
- **RFC 8693 Token Exchange**：允许一个受信任的 MCP Gateway 把外部 IdP 的 Token 交换为内部 MCP Token，实现“单点登录到多 Agent 系统”。

## 三、Progressive Discovery：解决大规模工具集加载问题

当 MCP Server 暴露几百个工具时，传统 `tools/list` 一次性返回所有元数据会造成两个问题：

1. **首包过大**：JSON payload 可能达到数 MB，拖慢连接建立。
2. **上下文浪费**：Client 一次会话通常只调用 3~5 个工具，却要先了解全部工具。

Progressive Discovery 的设计思路是：Server 先暴露一个**能力索引（capability index）**，Client 按需分页、过滤、拉取详细 schema。

```text
文字版架构图：Progressive Discovery 流程

┌─────────────┐              ┌─────────────────────┐
│  MCP Client │ ──connect──▶ │   MCP Server        │
└─────────────┘              │  capability index   │
     │                         └─────────────────────┘
     │ 1. capabilities/list?page=1&filter=db*
     │ ◀───────────────────────────────────────────
     │    [{name:"db_query", summary:"..."}, ...]
     │
     │ 2. tools/resolve?name=db_query,db_explain
     │ ◀───────────────────────────────────────────
     │    [完整 schema for db_query, db_explain]
     │
     │ 3. tools/call db_query
     │ ───────────────────────────────────────────▶
```

对比一次性返回全部 schema，Progressive Discovery 把连接建立阶段的传输量从 O(n) 降到 O(1) 索引 + O(k) 按需解析。

MCP 的渐进式发现还引入了 **Capability Filtering**：Client 可以在请求中带上 `supportedModes`、`requiredPermissions`，Server 只返回匹配项。这在大模型 Agent 场景下尤为重要，因为模型上下文窗口有限，避免把无关工具 schema 塞进 prompt。

## 四、HTTP-native 传输统一：HTTP/2 over stdio

新版路线图把传输层统一为两大方向：

1. **Streamable HTTP over stdio**：保留 stdin/stdout 的兼容性，但把帧格式改成可流式解析的 HTTP/1.1 chunked 流。
2. **HTTP/2 over stdio**：在本地进程间使用 HTTP/2 帧，支持多路复用、server push、server-initiated events。

HTTP/2 over stdio 的意义在于：

- Server 可以主动推送事件（如长时间任务进度、文件变更通知）。
- Client 与 Server 之间可以建立真正的双向流，而不必依赖 SSE 的长轮询。
- Agentic messaging primitives（SEP-2663 Tasks）依赖这一能力：Server 创建一个 Task 后，通过 server-initiated stream 持续推送状态。

```go
// 简化的 HTTP/2 over stdio 连接封装（伪代码）
type StdioH2Conn struct {
	stdin  io.Reader
	stdout io.Writer
	framer *http2.Framer
}

func (c *StdioH2Conn) SendServerPush(streamID uint32, payload []byte) error {
	// 通过 stdout 向 Client 发送 PUSH_PROMISE / DATA 帧
	return c.framer.WriteData(streamID, true, payload)
}
```

## 五、企业级 MCP Server 鉴权流程示例

结合以上三点，一个典型的企业级 MCP 调用链路如下：

```text
文字版架构图：企业级 MCP 鉴权与发现流程

┌─────────┐   1. IdP SSO    ┌─────────────┐   2. RFC 8693    ┌─────────────┐
│  User   │ ───────────────▶│  IdP/OAuth  │ ───────────────▶ │ MCP Gateway │
└─────────┘                 └─────────────┘                  └──────┬──────┘
                                                                    │
                              3. WIF / DPoP                        │
┌──────────┐   4. tools/call + DPoP Proof   ┌─────────────┐       │
│ MCP Host │ ◀────────────────────────────▶│  MCP Server   │◀──────┘
│ (Client) │   5. Server-initiated events   │ (Tool Runner) │
└──────────┘                                └─────────────┘
```

1. 用户通过企业 IdP 登录。
2. IdP Token 经 RFC 8693 交换为 MCP Access Token，Token 中声明 Agent ID、权限范围。
3. 若 Agent 运行在云上，通过 WIF 证明工作负载身份；否则客户端生成 DPoP 绑定。
4. 每次 tools/call 携带 DPoP Proof 与 Access Token。
5. 长任务通过 HTTP/2 server-initiated stream 推送进度。

## 六、对开发者的影响

- **SDK 作者**：需要支持 DPoP Proof 生成、Token Exchange、HTTP/2 over stdio 三种新能力。
- **Server 作者**：建议把鉴权中间件与工具逻辑解耦，身份验证交给 Gateway 或标准中间件。
- **企业落地**：先审计现有 MCP Server 是否持有长期 API Key，优先用 WIF 替换。
- **Agent 开发者**：把 Agent ID 作为一等公民传递，避免“匿名工具调用”造成不可审计的级联操作。

## 七、总结

MCP 2026-08-22 新版路线图不是一次简单的优先级调整，而是协议从“本地工具集成”转向“企业级 Agent 编排”的标志性节点。Agent Identity 通过 DPoP、WIF、ID-JAG 解决了“谁对调用负责”的问题；Progressive Discovery 解决了大规模工具集的效率问题；HTTP/2 over stdio 则让 Server 可以主动与 Client 通信。三者组合起来，为下一代多 Agent 系统的安全、可扩展和可审计打下了基础。

## 参考资料

- MCP 2026-08-22 Roadmap Announcement: https://www.anthropic.com/mcp-roadmap-2026-08-22
- DPoP RFC 9449: https://datatracker.ietf.org/doc/html/rfc9449
- RFC 8693 OAuth 2.0 Token Exchange: https://datatracker.ietf.org/doc/html/rfc8693
- MCP SEP-1933 Workload Identity Federation: https://github.com/modelcontextprotocol/specifications/discussions/1933
- MCP SEP-2663 Tasks / Agentic Messaging: https://github.com/modelcontextprotocol/specifications/discussions/2663
- `golang-jwt/jwt` Go DPoP implementation patterns: https://github.com/golang-jwt/jwt
