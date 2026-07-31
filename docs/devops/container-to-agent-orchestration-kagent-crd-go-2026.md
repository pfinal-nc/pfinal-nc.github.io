---
title: "从容器编排到智能体编排：Kagent CRD 让 Agent 成为云原生一等公民"
date: 2026-07-31
tags: ["devops", "kubernetes", "ai", "agent", "cloudnative", "golang"]
keywords: ["Agent编排", "Kagent", "CRD", "Kubernetes Operator", "A2A", "MCP", "AI Agent", "云原生", "Go Operator", "智能体"]
category: "devops"
description: "2026 年云原生最深刻的范式迁移：从编排容器到编排智能体。本文从 Go 开发者视角深度解析 Kagent——通过 CRD 让 Agent 成为 Kubernetes 一等公民的云原生智能体编排框架，覆盖 Agent CRD 声明式管理、Go Controller 实现、MCP ToolServer 工具层、A2A 跨智能体互操作与 OpenTelemetry AI Tracing 可观测性，并给出完整的落地路径。"
---

# 从容器编排到智能体编排：Kagent CRD 让 Agent 成为云原生一等公民

2026 年，云原生领域最深刻的范式迁移正在发生：**编排的对象从容器变成了智能体**。

KubeCon Europe 2026 告诉我们，82% 的 Kubernetes 采用率与 7% 的 AI 日常部署率之间横亘着一条执行鸿沟——基础设施已就绪，但 AI 的运营化还在挣扎。容器编排解决的是"进程如何运行"，而智能体编排要解决的是**"智能如何被管理"**：生命周期、工具权限、模型路由、跨智能体协作、可观测性。

这篇文章从一个 Go 开发者的视角，拆解 Kagent 如何用一套 CRD 让 Agent 成为 Kubernetes 的一等公民——像 `kubectl apply` 一个 Deployment 一样部署和管理智能体。

## 一、范式迁移：从容器到智能体的编排

### 1.1 为什么 Agent 需要"编排"而不是"部署"

单个 Agent 是一个程序——把它塞进 Pod 运行并不难。但当 Agent 开始调用工具、访问企业数据、与其他 Agent 协作、需要审计和回滚时，"部署"这个词就不够了，你需要的是**编排**：

```
容器时代的问题                 智能体时代的问题
────────────────────────      ────────────────────────
进程如何启动？           →    Agent 如何配置（system message + 工具 + 模型）？
进程崩溃怎么办？         →    Agent 幻觉/死循环/工具调用失败怎么办？
服务如何被发现？         →    其他 Agent 如何发现并信任这个 Agent？
配置如何注入？           →    工具凭证/模型密钥/权限如何安全注入？
如何水平扩展？           →    Agent 的并发会话如何调度？
如何观测？               →    LLM 调用链如何追踪、成本如何归属？
```

容器编排用"声明式期望状态 + 控制器调谐"解决了第一列；智能体编排用同样的模式解决第二列。

### 1.2 核心洞察：Agent 是新型态的工作负载

KubeCon 2026 传递的信号是 Kubernetes 正在成为 AI 操作系统。而这条路上的关键一步，是把 Agent 抽象成**一种可声明、可版本化、可回滚的负载类型**。

```
┌────────────────────────────────────────────────────┐
│ 第 4 层：跨智能体协作层（A2A 协议、Agent 发现）      │
├────────────────────────────────────────────────────┤
│ 第 3 层：智能体运行时层（Kagent Engine/Controller） │
│   Agent 生命周期、会话调度、模型路由                 │
├────────────────────────────────────────────────────┤
│ 第 2 层：工具与权限层（MCP ToolServer、凭证注入）    │
├────────────────────────────────────────────────────┤
│ 第 1 层：基础设施层（Kubernetes：Pod/GPU/网络）      │  ← 已解决
└────────────────────────────────────────────────────┘

容器编排解决了第 1 层；智能体编排 = 第 2-4 层
```

## 二、Kagent：Agent 即 CRD

### 2.1 Kagent 是什么

Kagent 是 Istio 创始团队成员发起、已进入 CNCF 沙箱的 Kubernetes 原生智能体框架，核心哲学与 Kubernetes 一脉相承：

> **Agent 是声明式资源，Kubernetes 控制平面负责让现实收敛到期望状态。**

Kagent 提供了一组 CRD，让智能体及其依赖被声明为集群内的资源：

| CRD | 职责 | 类比 |
|-----|------|------|
| `Agent` | 智能体定义：system message + 工具引用 + 模型配置引用，自带 Deployment 配置（replicas/volumes/env） | Deployment + ConfigMap |
| `ToolServer` / `RemoteMCPServer` | MCP 工具服务器接入（内置工具 / 外部 MCP 服务） | Service + ConfigMap |
| `ModelConfig` | LLM 模型路由、鉴权配置 | RuntimeClass |

组件架构：

```
┌──────────────────────────────────────────────────────────┐
│                      Kagent Operator                      │
│  ┌────────────┐  ┌────────────┐  ┌───────────┐  ┌──────┐  │
│  │ Controller │  │   Engine   │  │    UI     │  │ CLI  │  │
│  │  调谐 CRD  │  │  执行逻辑  │  │ 管理界面  │  │ 命令行 │  │
│  └─────┬──────┘  └─────┬──────┘  └───────────┘  └──────┘  │
└────────┼───────────────┼──────────────────────────────────┘
         │               │
    ┌────▼────┐    ┌─────▼─────┐
    │ K8s API │    │ MCP 工具层 │
    │ 控制平面 │    │ (ToolServer)│
    └─────────┘    └───────────┘
```

### 2.2 安装与第一个 Agent

```bash
# 安装 Kagent（CRD + Controller，Helm OCI 仓库）
helm install kagent-crds oci://ghcr.io/kagent-dev/kagent/helm/kagent-crds \
  --namespace kagent --create-namespace
helm install kagent oci://ghcr.io/kagent-dev/kagent/helm/kagent \
  --namespace kagent \
  --set providers.default=openai   # 配置默认 LLM Provider（openai/anthropic/ollama 等）
```

一个最小 Agent 的声明（kagent.dev/v1alpha2，Declarative 模式）：

```yaml
apiVersion: kagent.dev/v1alpha2
kind: Agent
metadata:
  name: k8s-ops-assistant
  namespace: kagent
spec:
  type: Declarative          # Declarative（声明式）或 BYO（自带镜像）
  description: Kubernetes 运维专家助手
  declarative:
    systemMessage: |
      你是一位 Kubernetes 运维专家。当用户请求集群操作时，
      优先使用 Kubernetes 工具，执行前必须向用户确认影响范围。
    modelConfig: llm-default  # ← 引用同命名空间的 ModelConfig CRD
    stream: true
    tools:
    - type: McpServer
      mcpServer:
        apiGroup: kagent.dev
        kind: RemoteMCPServer  # 外部 MCP 服务；内置工具则用 ToolServer
        name: k8s-mcp-server
        toolNames: [get-pod-status]
```

LLM 模型与凭证单独声明为 `ModelConfig`，通过名字引用——凭证始终以 Secret 注入，而不是写在 Agent 里：

```yaml
apiVersion: kagent.dev/v1alpha2
kind: ModelConfig
metadata:
  name: llm-default
  namespace: kagent
spec:
  provider: OpenAI
  model: gpt-4.1
  apiKeySecret: llm-credentials   # Secret 名
  apiKeySecretKey: api-key        # Secret 内的键
```

然后：

```bash
kubectl apply -f agent.yaml
kubectl get agents
```

熟悉的操作模式，全新的工作负载。`Agent` 的 `.status` 会像 Pod 一样反映期望状态到现实状态的收敛过程。

### 2.3 Agent Controller 的调谐逻辑（Go）

Kagent 的 Controller 用 Go 编写，遵循标准 Operator 模式（controller-runtime）：

```go
// AgentController 调谐 Agent CRD
type AgentController struct {
	client.Client
	// ...
}

func (c *AgentController) Reconcile(
	ctx context.Context, req ctrl.Request,
) (ctrl.Result, error) {
	var agent kagentv1alpha2.Agent
	if err := c.Get(ctx, req.NamespacedName, &agent); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// 1. 校验 Agent 配置
	if err := validateAgent(&agent); err != nil {
		return c.recordCondition(ctx, &agent, ConditionInvalid, err)
	}

	// 2. 为 Agent 准备运行时（配置注入、工具装载）
	runtime, err := c.prepareRuntime(ctx, &agent)
	if err != nil {
		return ctrl.Result{RequeueAfter: 5 * time.Second}, err
	}

	// 3. 检查工具服务器可达性
	if err := c.checkToolServers(ctx, &agent); err != nil {
		return c.recordCondition(ctx, &agent, ConditionToolsUnreachable, err)
	}

	// 4. 收敛 status（kagent 用 conditions 表达 Accepted / Ready）
	meta.SetStatusCondition(&agent.Status.Conditions, metav1.Condition{
		Type:   "Ready",
		Status: metav1.ConditionTrue,
		Reason: "AgentReady",
	})
	agent.Status.ObservedGeneration = agent.Generation
	return ctrl.Result{}, c.Status().Update(ctx, &agent)
}
```

`Reconcile` 的每次调用都对比**期望状态**（CRD spec）与**现实状态**（运行时实际），并不断收敛——这正是声明式编排的心脏。

## 三、工具层：MCP ToolServer

### 3.1 工具即服务

Kagent 复用 MCP 生态作为工具接入标准。外部 MCP Server 在集群中声明为 `RemoteMCPServer` 资源，Agent 通过 Tool 引用发现和调用工具：

```yaml
apiVersion: kagent.dev/v1alpha2
kind: RemoteMCPServer
metadata:
  name: k8s-mcp-server
  namespace: kagent
spec:
  description: Kubernetes 集群工具集
  protocol: STREAMABLE_HTTP          # SSE 或 STREAMABLE_HTTP
  url: http://mcp-k8s-tools:8080/mcp
  headersFrom:                       # ← 凭证通过 Secret/ConfigMap 注入
  - kind: Secret
    name: mcp-server-token
    key: token
```

Kagent 自带针对 K8s 生态的 MCP 工具集——Kubernetes、Istio、Helm、Argo、Prometheus、Grafana、Cilium，全部以 `ToolServer` 资源的形式声明（本地 stdio / SSE / Streamable HTTP 三种接入方式）。这意味着 Agent 可以用自然语言驱动你的整个集群工具链。

### 3.2 从 Go 视角理解 MCP 工具调用

一个 Go MCP Server 暴露工具的方式（与 `mcp-go` 一致）：

```go
package main

import (
	"context"
	"github.com/mark3labs/mcp-go/server"
	"github.com/mark3labs/mcp-go/mcp"
)

func main() {
	s := server.NewMCPServer(
		"k8s-tools",
		"1.0.0",
		server.WithToolCapabilities(true),
	)

	// 暴露 "get-pod-status" 工具
	s.AddTool(mcp.NewTool(
		"get-pod-status",
		mcp.WithDescription("获取指定命名空间的 Pod 状态"),
		mcp.WithString("namespace",
			mcp.Required(),
			mcp.Description("命名空间名称"),
		),
	), handleGetPodStatus)

	if err := server.ServeStdio(s); err != nil {
		panic(err)
	}
}

func handleGetPodStatus(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	ns := req.Params.Arguments["namespace"].(string)
	// ... 调用 client-go 查询 Pod ...
	return mcp.NewToolResultText("Pod 状态查询结果"), nil
}
```

**安全要点**：工具是 Agent 的能力边界，也是攻击面。MCP Server 层应当做最小权限控制——每个工具只暴露完成本职工作所需的最小操作，凭证走 K8s Secret 注入而不是明文配置。

## 四、跨智能体协作：A2A 协议

### 4.1 为什么需要 A2A

MCP 解决 **Agent → 工具**，A2A（Agent-to-Agent）解决 **Agent → Agent**。2026 年 A2A 协议 v1.0.0 正式发布，由 Linux Foundation 托管（Google 捐赠，AWS、Cisco、IBM、Microsoft、Salesforce、SAP、ServiceNow 等共同治理）。

在企业里，一个完整任务往往需要多个 Agent 协作：

```
┌──────────┐  A2A  ┌──────────┐  MCP  ┌──────────────┐
│ 编排 Agent │ ←──→ │ 安全 Agent │ ←──→ │ Vuln Scanner │
└──────────┘       └──────────┘       └──────────────┘
      │ A2A                │ MCP
┌──────▼──────┐    ┌───────▼──────┐
│ 成本优化 Agent │    │ FinOps 工具集 │
└─────────────┘    └──────────────┘
```

### 4.2 A2A 协议三层

A2A v1.0 的核心设计分三层：

| 层 | 内容 |
|----|------|
| **L1 数据模型** | `Task`、`Message`、`Part`、`Artifact`、`AgentCard`、`Extension` |
| **L2 操作** | `SendMessage`、`SendStreamingMessage`、`GetTask`、`ListTasks`、`CancelTask`、`SubscribeToTask`、`GetAgentCard`、`GetExtendedAgentCard` |
| **L3 绑定** | JSON-RPC 2.0、gRPC、HTTP+JSON/REST（Core 绑定；可扩展自定义绑定） |

其中 `AgentCard` 是 Agent 的"名片"——声明身份、能力、技能与安全要求，让其他 Agent 通过发现机制找到并信任它：

```json
{
  "name": "security-agent",
  "description": "安全漏洞分析与修复建议",
  "version": "1.0.0",
  "supportedInterfaces": [
    { "url": "https://agents.example.com/security", "protocolBinding": "HTTP+JSON" }
  ],
  "capabilities": {
    "streaming": true,
    "pushNotifications": false
  },
  "defaultInputModes": ["text"],
  "defaultOutputModes": ["text"],
  "skills": [
    { "id": "vuln-scan", "name": "漏洞扫描", "description": "执行漏洞扫描", "tags": ["security"] },
    { "id": "patching", "name": "补丁建议", "description": "给出补丁建议", "tags": ["security"] }
  ]
}
```

### 4.3 Kagent 与 A2A 的整合

Kagent 生态中，`Agent` CRD 可以声明对其他 Agent 的引用（`tools[].type: Agent`），通过 A2A 协议协作；同时每个 Agent 可以通过 `a2aConfig.skills` 声明自己的技能清单，Kagent Controller 在其 A2A 端点（默认 `<controller-ip>:8083/api/a2a/<namespace>/<agent-name>`）上自动暴露对应的 `AgentCard`——**声明式资源同时是协议层的可发现实体**，这是"Agent 即一等公民"在互操作层的体现。

## 五、可观测性：OpenTelemetry AI Tracing

### 5.1 LLM 调用是不可观测的黑盒

容器编排时代我们用 Prometheus + OpenTelemetry 解决了可观测性；智能体编排时代，最大的可观测性挑战是 **LLM 调用链**：

- 一次用户请求 → 多次模型推理 → 多次工具调用 → 每次都可能失败/超时/高成本
- 需要回答：这次回答花了多少钱？用了哪个模型？为什么 Agent 走了这条路径？

2026 年，OpenTelemetry 社区推出 AI Tracing 规范（gen_ai 语义约定），为 LLM 调用链路提供标准化的追踪能力，覆盖模型调用、token 用量、工具调用、Agent 决策路径。

### 5.2 gen_ai 语义约定

```go
import (
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("agent-runtime")

func callLLM(ctx context.Context, model, prompt string) (string, error) {
	ctx, span := tracer.Start(ctx, "llm.generate",
		trace.WithAttributes(
			attribute.String("gen_ai.operation.name", "generate"),
			attribute.String("gen_ai.request.model", model),
			attribute.String("gen_ai.provider.name", "openai"),
		),
	)
	defer span.End()

	resp, usage, err := doCompletion(ctx, model, prompt)
	if err != nil {
		span.RecordError(err)
		return "", err
	}

	// 记录 token 用量 → 成本归属
	span.SetAttributes(
		attribute.Int("gen_ai.usage.input_tokens", usage.InputTokens),
		attribute.Int("gen_ai.usage.output_tokens", usage.OutputTokens),
	)
	return resp, nil
}
```

### 5.3 Agent 决策追踪：从指标到路径

容器编排追踪"请求走过了哪些服务"；智能体编排追踪"Agent 走过了哪些推理和工具步骤"：

```
用户提问
  └─ agent.run (span)
       ├─ llm.generate #1: 决定调用工具 get-pod-status
       ├─ tool.get_pod_status (span, 12ms)
       ├─ llm.generate #2: 分析结果 + 建议
       └─ [gen_ai.usage.input_tokens=2841, output_tokens=412]
```

这样的追踪直接回答 KubeCon 2026 的核心焦虑——**成本与可控性**：每一次推理都有 token 计数，每一个工具调用都有审计记录，模型的每次选择路径都可回放。

## 六、Go 开发者的位置：为什么是 Go

智能体编排这场变革里，Go 处于一个有趣的位置——**控制平面语言**：

| 层面 | 技术栈 | 语言 |
|------|--------|------|
| Agent 编排控制平面 | Kagent / controller-runtime | **Go** |
| MCP 工具服务 | mcp-go | **Go** |
| A2A 端点 | A2A Go SDK | **Go** |
| 可观测性 | OpenTelemetry Go SDK | **Go** |
| 基础设施 | Kubernetes / Istio / Cilium | **Go** |

对 Go 开发者的直接意义：

1. **Operator 技能直接迁移**：会写 Kubernetes Operator 的 Go 工程师，已经会写"智能体控制器"——调谐逻辑、期望状态、条件状态，全部复用。
2. **MCP Server 是新的 API 开发范式**：`mcp-go` 写工具服务的体验和写 gRPC 服务几乎一样，但消费方是"会推理的调用者"。
3. **协议实现是确定性工程**：LLM 行为不确定，但编排、协议、追踪这些外围是确定性代码——这正是 Go 的主场。

```go
// 一个可观测的 Agent 调用入口（Go 伪代码）
func (s *AgentServer) HandleMessage(ctx context.Context, msg *a2a.Message) (*a2a.Message, error) {
	ctx, span := tracer.Start(ctx, "agent.handle_message")
	defer span.End()

	agent, err := s.getAgentConfig(ctx, msg.Recipient) // 从 CRD 读取
	if err != nil {
		return nil, err
	}

	// 注入工具与模型配置，执行一次带追踪的推理循环
	return s.runWithTracing(ctx, agent, msg)
}
```

## 七、落地路径：从演示到生产

参照 KubeCon 2026 总结的"执行差距"，智能体编排的落地同样要避免"演示即巅峰"。建议的渐进路径：

```
阶段 1：单 Agent + 只读工具
  一个 Agent 接入 Prometheus 查询，只读，无写操作。
  目标：打通 CRD 声明、凭证注入、追踪埋点。

阶段 2：生产工具 + 审批流
  接入写操作工具（部署、扩缩容），关键操作走人工确认。
  目标：建立工具权限边界与审计。

阶段 3：多 Agent + A2A 协作
  引入专业 Agent（安全、成本），编排 Agent 分发任务。
  目标：验证 Agent 发现与任务生命周期。

阶段 4：全链路治理
  成本归属（token 计量）、模型路由（ModelConfig）、
  失败回滚（Agent 版本化）。
  目标：让智能体负载享受和容器一样的治理成熟度。
```

## 八、总结：第二层编排的开始

| 维度 | 容器编排（2015→2025） | 智能体编排（2026→） |
|------|---------------------|-------------------|
| 编排对象 | Pod / Deployment | Agent / ToolServer |
| 声明方式 | YAML + CRD | YAML + CRD |
| 控制循环 | Reconcile | Reconcile |
| 工具接入 | Service / gRPC | MCP ToolServer |
| 互操作 | Service Discovery | A2A + AgentCard |
| 可观测性 | OTel + Prometheus | OTel gen_ai 语义约定 |
| 语言主场 | Go | Go |

Kubernetes 用了十年证明"声明式期望状态 + 控制器调谐"是最成功的运维模式。2026 年，这套模式被原封不动地搬到了智能体上——**不是因为 K8s 社区恋旧，而是因为智能体的复杂性和不可预测性，恰恰更需要确定性的控制平面**。

Kagent 的 CRD、A2A 的协议化协作、MCP 的工具标准化、OpenTelemetry AI Tracing 的可观测性——四者合起来，就是云原生对 AI 执行鸿沟的正面回答。对 Go 开发者来说，这不是需要重新学习的领域，而是**已经掌握的技能树长出了新分支**。

## 相关阅读

- [KubeCon Europe 2026 深度复盘：82% 采用率 vs 7% AI 部署率——云原生的第二次创始时刻](/devops/kubecon-europe-2026-ai-execution-gap-cloud-native-deep-dive)
- [Kubernetes v1.36 Haru 深度实战：70 项增强全解读](/devops/kubernetes-v1-36-haru-deep-dive-2026)
- [MCP + A2A + A2UI：2026 多 Agent 系统完整协议栈实战](/ai/mcp-a2a-a2ui-protocol-stack)
- [2026 AI Agent 工程化：从原型到生产的 10 个关键决策](/ai/ai-agent-production-engineering-2026)
- [MCP 2026 无状态协议革命与 OpenAI Secure Tunnel 实战](/ai/mcp-stateless-secure-tunnel-2026)
- [关于PFinalClub - 后端 + DevOps + AI 工程实践技术博客](/about)

## 参考资料

- [Kagent 官方文档与 CRD 定义](https://kagent.dev/)
- [kagent-dev/kagent GitHub 仓库](https://github.com/kagent-dev/kagent)
- [A2A 协议规范 v1.0](https://a2a-protocol.org/v1.0.0/specification)
- [MCP 官方规范](https://modelcontextprotocol.io/)
- [OpenTelemetry gen_ai 语义约定（semantic-conventions-genai）](https://github.com/open-telemetry/semantic-conventions-genai)
- [mcp-go SDK](https://github.com/mark3labs/mcp-go)
- [KubeCon Europe 2026 官方页面](https://events.linuxfoundation.org/kubecon-europe-2026/)
