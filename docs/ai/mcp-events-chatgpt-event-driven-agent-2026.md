---
title: "MCP Events in ChatGPT 实战：让 Agent 从‘人找它’变成‘事件推它’"
date: 2026-10-14
tags:
  - ai
  - mcp
  - agent
  - chatgpt
  - events
  - webhook
keywords:
  - MCP Events
  - ChatGPT
  - 事件驱动 Agent
  - webhook
  - Standard Webhooks
  - MCP 2.0
  - events/subscribe
category: ai
description: "OpenAI DevDay 2026 后，ChatGPT 支持 MCP Events。本文用可运行的 Go 示例实现一个支持 events/list、events/subscribe、签名回调的事件驱动 MCP Server，演示 Agent 如何被外部事件唤醒。"
---

# MCP Events in ChatGPT 实战：让 Agent 从“人找它”变成“事件推它”

2026 年 9 月 29 日 OpenAI DevDay 之后，ChatGPT 的 MCP 支持从“用户发消息 → Agent 响应”的被动模式，升级到了**事件驱动**：外部系统发生变更时，MCP Server 可以通过签名 webhook 主动唤醒 ChatGPT 里的 Agent。

这意味着 Agent 的触发源从两个变成了三个：

1. 定时（cron）
2. 人类消息
3. **外部事件** ✅

典型场景：GitHub Issue 被标记为 bug → Agent 自动拉取上下文并提交 PR 初稿；文档收到 review comment → Agent 直接应用修改；Slack 频道出现特定关键词 → Agent 汇总并创建任务。

## 一、协议核心：三个 JSON-RPC 方法

MCP Events 基于协议版本 `2026-07-28`（MCP 2.0），Server 需要在 `server/discover` 中声明 `events` capability，并实现：

| 方法 | 作用 |
|------|------|
| `events/list` | 列出 Server 支持的事件、过滤参数与 payload schema |
| `events/subscribe` | 接收回调 URL 和签名密钥，建立订阅 |
| `events/unsubscribe` | 终止订阅 |

事件投递采用 **Standard Webhooks** 签名格式，头部包括 `webhook-id`、`webhook-timestamp`、`webhook-signature` 与 `X-MCP-Subscription-Id`。

## 二、事件驱动架构

```text
外部系统（GitHub/Slack/CRM）
        |
        v
   MCP Server
        |
   events/list  <----  ChatGPT 连接时发现事件
   events/subscribe <--- 用户说“监控这个仓库的新 issue”
        |
   回调验证挑战（challenge）
        |
   事件触发 -> 签名 webhook POST
        |
   ChatGPT 接收事件 -> 按用户指令执行工具调用
```

## 三、可运行示例：Go 实现的 MCP Events Server

下面是一个最小可运行实现。它暴露 `/mcp` 处理 JSON-RPC，暴露 `/trigger` 模拟外部事件触发投递。

```go
package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

type Subscription struct {
	ID     string
	Event  string
	URL    string
	Secret string
	Args   json.RawMessage
}

var subs sync.Map // id -> Subscription

func randomHex(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// sign 生成 Standard Webhooks 签名字段。
func sign(secret string, payload []byte, ts int64) (id, timestamp, signature string) {
	id = "evt_" + randomHex(12)
	timestamp = strconv.FormatInt(ts, 10)
	toSign := []byte(fmt.Sprintf("%s.%s", timestamp, payload))
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(toSign)
	signature = "v1," + base64.StdEncoding.EncodeToString(mac.Sum(nil))
	return
}

// postWebhook 向回调 URL 发送签名 POST。
func postWebhook(url, secret string, body []byte) error {
	id, ts, sig := sign(secret, body, time.Now().Unix())
	req, _ := http.NewRequest("POST", url, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("webhook-id", id)
	req.Header.Set("webhook-timestamp", ts)
	req.Header.Set("webhook-signature", sig)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("callback returned %d", resp.StatusCode)
	}
	return nil
}

// verifyCallback 在激活订阅前发送 challenge 验证回调地址。
func verifyCallback(url, secret string) error {
	challenge := randomHex(16)
	payload, _ := json.Marshal(map[string]string{
		"type":      "verification",
		"challenge": challenge,
	})
	req, _ := http.NewRequest("POST", url, bytes.NewReader(payload))
	id, ts, sig := sign(secret, payload, time.Now().Unix())
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("webhook-id", id)
	req.Header.Set("webhook-timestamp", ts)
	req.Header.Set("webhook-signature", sig)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	got, _ := io.ReadAll(resp.Body)
	if !hmac.Equal([]byte(strings.TrimSpace(string(got))), []byte(challenge)) {
		return fmt.Errorf("challenge mismatch")
	}
	return nil
}

func handleMCP(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ID     int             `json:"id"`
		Method string          `json:"method"`
		Params json.RawMessage `json:"params"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	var result any
	switch req.Method {
	case "server/discover":
		result = map[string]any{
			"resultType":       "complete",
			"supportedVersions": []string{"2026-07-28"},
			"capabilities": map[string]any{
				"tools":  map[string]any{},
				"events": map[string]any{},
			},
		}
	case "events/list":
		result = map[string]any{
			"events": []map[string]any{
				{
					"name":        "comment.created",
					"description": "文档收到新评论",
					"delivery":    []string{"webhook"},
					"inputSchema": map[string]any{
						"type":       "object",
						"properties": map[string]any{"document_id": map[string]any{"type": "string"}},
						"required":   []string{"document_id"},
					},
					"payloadSchema": map[string]any{
						"type":       "object",
						"properties": map[string]any{"comment_id": map[string]any{"type": "string"}, "text": map[string]any{"type": "string"}},
					},
				},
			},
		}
	case "events/subscribe":
		var p struct {
			Name     string `json:"name"`
			Arguments struct {
				DocumentID string `json:"document_id"`
			} `json:"arguments"`
			Delivery struct {
				URL    string `json:"url"`
				Secret string `json:"secret"`
			} `json:"delivery"`
		}
		json.Unmarshal(req.Params, &p)
		if err := verifyCallback(p.Delivery.URL, p.Delivery.Secret); err != nil {
			w.WriteHeader(400)
			result = map[string]any{"error": map[string]any{"code": -32015, "message": "CallbackEndpointError", "data": map[string]string{"reason": err.Error()}}}
			break
		}
		id := "sub_" + randomHex(8)
		subs.Store(id, Subscription{ID: id, Event: p.Name, URL: p.Delivery.URL, Secret: p.Delivery.Secret, Args: []byte{}})
		result = map[string]any{
			"id":            id,
			"refreshBefore": time.Now().Add(15 * time.Minute).UTC().Format(time.RFC3339),
		}
	case "events/unsubscribe":
		var p struct{ ID string `json:"id"` }
		json.Unmarshal(req.Params, &p)
		subs.Delete(p.ID)
		result = map[string]any{"success": true}
	default:
		w.WriteHeader(400)
		result = map[string]any{"error": map[string]any{"code": -32601, "message": "method not found"}}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"jsonrpc": "2.0", "id": req.ID, "result": result})
}

func handleTrigger(w http.ResponseWriter, r *http.Request) {
	// 模拟外部事件：给所有 comment.created 订阅投递一条新评论。
	payload, _ := json.Marshal(map[string]any{
		"eventId":   "evt_" + randomHex(12),
		"name":      "comment.created",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"data": map[string]any{
			"comment_id": "c_" + randomHex(8),
			"text":       "这里需要更新一下示例代码",
		},
		"cursor": nil,
	})

	subs.Range(func(_, v any) bool {
		s := v.(Subscription)
		if s.Event == "comment.created" {
			if err := postWebhook(s.URL, s.Secret, payload); err != nil {
				fmt.Println("delivery failed:", err)
			}
		}
		return true
	})
	w.Write([]byte("triggered\n"))
}

func main() {
	http.HandleFunc("/mcp", handleMCP)
	http.HandleFunc("/trigger", handleTrigger)
	fmt.Println("MCP Events server listening on :3000")
	fmt.Println(http.ListenAndServe(":3000", nil))
}
```

运行与测试：

```bash
go run main.go

# 1. 用 ngrok 暴露本地服务
curl -X POST https://your-ngrok/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"server/discover"}'

# 2. 模拟 ChatGPT 订阅（callback URL 必须是公网 HTTPS）
curl -X POST https://your-ngrok/mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0","id":2,"method":"events/subscribe",
    "params":{"name":"comment.created","arguments":{"document_id":"doc_123"},
    "delivery":{"mode":"webhook","url":"https://your-receiver/cb","secret":"whsec_"}}
  }'

# 3. 触发事件投递
curl https://your-ngrok/trigger
```

## 四、安全红线

事件驱动的同时也把攻击面从“用户输入”扩展到了“外部系统推送”。必须守住几条线：

1. **回调地址必须是公网 HTTPS**，拒绝本地地址、内网 IP 与重定向。
2. **Challenge 验证必须在激活订阅前完成**，且用常数时间比较。
3. **Secret 长度合规**：OpenAI 要求 `whsec_` 前缀 + base64 解码后 24–64 字节。
4. **签名覆盖整个 body**，不要解析后再序列化，避免字段顺序差异导致验签失败。
5. **事件可能乱序到达**，所有写工具必须幂等（用 `eventId` 去重）。
6. **单条 payload 上限 256 KiB**，大图/长日志应该发摘要 + 只读工具链接。

## 五、与 polling/cron 的对比

| 维度 | 轮询 | cron | MCP Events |
|------|------|------|------------|
| 延迟 | 取决于轮询间隔 | 固定周期 | 近实时 |
| 无效请求 | 高 | 高 | 零（仅真实事件） |
| 实现复杂度 | 低 | 低 | 需要 webhook + 签名 |
| 适用场景 | 简单状态检查 | 定时报告 | 响应外部变更的自动化 |

## 六、总结

MCP Events 让 Agent 从“聊天挂件”真正进化为“事件响应器”。对开发者来说，核心工作没变：暴露清晰的 event schema、验证回调、签名投递、幂等处理。但产品形态上，它让 Agent 可以 7×24 地监听业务系统，而不需要用户一直守在聊天窗口里。

## 参考资料

- [MCP Events in ChatGPT: How Event-Driven Agents Actually Work - explainx.ai](https://explainx.ai/blog/mcp-events-chatgpt-webhooks-event-driven-agents-guide-2026)
- [MCP Events explained: build and test a webhook-emitting MCP server - Apidog](https://apidog.com/blog/mcp-events/)
- [hookdeck/mcp-events-outpost-demo - GitHub](https://github.com/hookdeck/mcp-events-outpost-demo)
- [OpenAI MCP Events Documentation](https://platform.openai.com/docs/mcp/events)
- [Standard Webhooks Specification](https://www.standardwebhooks.com/)
