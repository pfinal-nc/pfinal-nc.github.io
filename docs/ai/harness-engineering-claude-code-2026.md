---
title: Harness Engineering 2026 实战：Claude Code 源码泄露后的 AI Agent 工程范式革命
date: 2026-07-01
tags:
  - ai
  - AI Agent
  - Claude Code
  - 工程化
  - 开发工具
keywords:
  - Harness Engineering
  - Claude Code
  - Vibe Coding
  - Spec Driven Development
  - AI Agent 架构
  - AI 编程工具
  - Agent Harness
  - 2026 AI 编程
category: ai
description: 2026 年 3 月 Claude Code 源码因 npm source map 意外泄露，社区基于 clean-room 重构的复刻项目让 Harness Engineering 这个概念从黑话变成显学。Vibe Coding 在 92% 美国开发者中普及但生产事故频发，Spec-Driven Development 接棒成为新范式。本文从 Claude Code 真实架构出发，构建可落地的 Harness 体系，包含完整 Go/Python 双语言代码示例。
---

# Harness Engineering 2026 实战：Claude Code 源码泄露后的 AI Agent 工程范式革命

## 引言：从 "Vibe Coding" 到 "Harness Engineering" 的必然跃迁

2025 年 2 月，Andrej Karpathy 创造 "Vibe Coding" 一词——以自然语言驱动 LLM 生成代码，"忘记代码存在"。到 2026 年 5 月，这个范式已渗透到 92% 的美国开发者工作流（[Builder.io 调研](https://www.buildercog.com/blog/spec-driven-development-vs-vibe-coding-2026)）。但硬币的另一面同样刺眼：

- **生产事故激增**：2026 Q1 GitHub 报告显示 AI 生成代码的 30% 在 6 个月内被 revert
- **可观测性缺失**：62% 的开发者无法回答"AI 这次为什么这么写"
- **上下文污染**：44% 的 LLM 应用故障源自上下文窗口污染

转折点出现在 2026 年 3 月底——Claude Code 的 npm 包因 source map 配置错误意外暴露源码，开发者社区在 72 小时内完成 clean-room 重构，**Harness Engineering 这个 AI Agent 圈子的"暗知识"被强制摆到台面**。Anthropic 官方在 4 月发布博文《The model is the agent. The code is the harness.》正式背书这个范式。

本文从 Claude Code 的真实架构出发，给出可落地的 Harness 体系设计与双语言代码示例。

## 一、什么是 Harness Engineering？

### 1.1 定义

**Harness（装备）** 是围绕 LLM 构建的结构化运行时环境，用于约束、引导和增强模型的能力。它不是 prompt engineering（单次输入优化），也不是 fine-tuning（模型权重调整），而是 **应用层的运行时基础设施**。

类比传统工程：

| 概念 | 传统软件 | AI Agent |
|------|----------|----------|
| 核心 | 函数/方法 | LLM call |
| 控制流 | if/else/for | 状态机 + prompt chain |
| 复用 | 类/包 | Harness 模块 |
| 测试 | 单元测试 | 行为评估 (eval) |
| 部署 | 二进制 | Harness bundle + 模型配置 |

### 1.2 Vibe Coding 为什么不够？

```text
Vibe Coding 循环:
  人类意图 → LLM 直出 → 复制粘贴 → 调试
       ↑                                    ↓
       └──────── 修 bug ←──────────────────┘

问题:
  - 每次 LLM 调用都是 stateless，无法累积上下文
  - 没有强制约束（如"必须写测试"），靠 prompt 软约束
  - 错误难以定位，因为"代码"和"意图"中间没有可追溯层
  - 团队协作困难，无法做 code review
```

### 1.3 Harness 范式的核心增量

```text
Harness 循环:
  人类意图 → Spec → Plan → LLM (受 Harness 约束) → Code → Eval → Git
       ↑                                                            ↓
       └──────────── 反馈进入 Context Store ←──────────────────────┘

新增能力:
  - Spec 层：人类意图结构化（参考 Kiro / Spec-Kit）
  - Plan 层：多步任务分解（Planner 模块）
  - Tools 层：受限工具集（不让 LLM 调 `rm -rf`）
  - Eval 层：每次输出自动评估（单元测试 + LLM-as-judge）
  - Memory 层：跨会话学习（错误模式、代码风格）
```

## 二、Claude Code 真实架构拆解

基于 2026 年 3 月泄露的源码与社区 clean-room 重构（[awesome-cc-harness](https://github.com/wanlanglin/-awesome-cc-harness)），Claude Code 的核心架构可以分为 5 层：

```
┌──────────────────────────────────────────────┐
│  CLI / TUI Layer (commands, slash, repl)     │  ← 用户交互
├──────────────────────────────────────────────┤
│  Agent Loop (think → act → observe)          │  ← ReAct 主循环
├──────────────────────────────────────────────┤
│  Tool Registry (Bash, Read, Edit, Glob, Grep)│  ← 受限工具
├──────────────────────────────────────────────┤
│  Context Builder (CLAUDE.md, history, tools) │  ← 上下文组装
├──────────────────────────────────────────────┤
│  LLM Client (Anthropic API, retry, stream)   │  ← 模型调用
└──────────────────────────────────────────────┘
```

### 2.1 Agent Loop 的核心实现（Go 复刻）

```go
// harness/agent.go
package harness

import (
    "context"
    "fmt"
    "strings"
)

type Agent struct {
    LLM       LLMClient
    Tools     []Tool
    MaxSteps  int
    OnObserve func(step Step) error
}

type Step struct {
    Thought string
    Action  string
    Args    map[string]any
    Result  string
}

func (a *Agent) Run(ctx context.Context, goal string) (string, error) {
    history := []Message{
        {Role: "user", Content: goal},
    }

    for i := 0; i < a.MaxSteps; i++ {
        // 1. Think: 让 LLM 决定下一步动作
        decision, err := a.LLM.Decide(ctx, history, a.Tools)
        if err != nil {
            return "", fmt.Errorf("decide step %d: %w", i, err)
        }

        // 2. 终止条件检查
        if decision.Action == "Final" {
            return decision.Result, nil
        }

        // 3. Act: 在沙箱中执行工具
        result, err := a.executeTool(ctx, decision)
        if err != nil {
            result = fmt.Sprintf("ERROR: %v", err)
        }

        // 4. Observe: 把结果追加到历史
        step := Step{
            Thought: decision.Thought,
            Action:  decision.Action,
            Args:    decision.Args,
            Result:  result,
        }
        history = append(history, step.ToMessages()...)

        // 5. 回调：让外部系统记录/评估
        if a.OnObserve != nil {
            if err := a.OnObserve(step); err != nil {
                return "", err
            }
        }
    }
    return "", fmt.Errorf("max steps %d reached", a.MaxSteps)
}
```

### 2.2 Tool Registry 的安全约束

```go
// harness/tools/registry.go
package tools

type Registry struct {
    allowed map[string]Tool
    denied  map[string]bool
}

func (r *Registry) Register(t Tool) error {
    name := t.Name()
    if r.denied[name] {
        return fmt.Errorf("tool %s is explicitly denied by security policy", name)
    }
    r.allowed[name] = t
    return nil
}

// 危险命令拦截
var dangerousBashPatterns = []string{
    `rm -rf /`,
    `rm -rf ~`,
    `:(){:|:&};:`,          // fork bomb
    `dd if=`,
    `mkfs`,
    `curl .* | sh`,
    `wget .* | sh`,
}

func (r *Registry) ValidateBash(cmd string) error {
    for _, p := range dangerousBashPatterns {
        if matched, _ := regexp.MatchString(p, cmd); matched {
            return fmt.Errorf("dangerous command blocked: %s", p)
        }
    }
    return nil
}
```

### 2.3 Context Builder：让 LLM 知道"工程上下文"

```go
// harness/context.go
type Context struct {
    WorkingDir  string
    Files       []FileSummary  // 自动扫描项目关键文件
    GitStatus   string         // git status --short
    RecentCommits []string     // git log -5 --oneline
    CLAUDEmd    string         // 项目级规范
    History     []Message      // 当前会话历史
}

func (c *Context) Build() string {
    var sb strings.Builder
    sb.WriteString("# Project Context\n\n")
    sb.WriteString(fmt.Sprintf("Working directory: %s\n\n", c.WorkingDir))
    sb.WriteString("## Recent commits\n")
    for _, cm := range c.RecentCommits {
        sb.WriteString("- " + cm + "\n")
    }
    sb.WriteString("\n## Project guidelines (CLAUDE.md)\n")
    sb.WriteString(c.CLAUDEmd)
    sb.WriteString("\n\n## Current git status\n```\n")
    sb.WriteString(c.GitStatus)
    sb.WriteString("\n```\n")
    return sb.String()
}
```

## 三、从 Vibe 到 Spec：5 个生产级 Harness 模式

### 3.1 模式 1：Spec-First（Kiro / Spec-Kit 风格）

```text
传统:
  "帮我写个 HTTP server" → LLM 直出代码

Spec-First:
  spec.md:
    - Goal: 返回 JSON {"status": "ok", "version": "1.0"}
    - Endpoints: GET /health, GET /metrics
    - Non-functional: < 50ms p99, < 50MB memory
    - Acceptance: 包含 5 个单元测试, 通过 go vet
  → Harness 把 spec 注入 LLM context → LLM 严格按 spec 生成
```

Python 实现（Spec-Kit 简化版）：

```python
# harness/spec.py
from dataclasses import dataclass
from pathlib import Path

@dataclass
class Spec:
    goal: str
    endpoints: list[dict]
    non_functional: dict
    acceptance: list[str]

    def to_prompt(self) -> str:
        """把 Spec 序列化为 LLM 友好的 prompt"""
        return f"""# Task Specification

## Goal
{self.goal}

## Endpoints
{chr(10).join(f'- {e["method"]} {e["path"]}: {e["desc"]}' for e in self.endpoints)}

## Non-Functional Requirements
{chr(10).join(f'- {k}: {v}' for k, v in self.non_functional.items())}

## Acceptance Criteria
{chr(10).join(f'- {a}' for a in self.acceptance)}

# Implementation Rules
1. Generate code that satisfies ALL acceptance criteria
2. Run `go test ./...` before declaring done
3. If tests fail, fix the code, not the test
4. Do not add features not specified above
"""

# 使用
spec = Spec(
    goal="Lightweight health check service",
    endpoints=[
        {"method": "GET", "path": "/health", "desc": "returns 200 if alive"},
        {"method": "GET", "path": "/metrics", "desc": "Prometheus format"},
    ],
    non_functional={
        "p99_latency": "< 50ms",
        "memory": "< 50MB",
    },
    acceptance=[
        "Includes 5 unit tests",
        "Passes go vet",
        "Uses net/http standard library only",
    ],
)
```

### 3.2 模式 2：Plan-Then-Act（Claude Code 真实使用模式）

```go
// harness/plan.go
type Plan struct {
    Steps []PlanStep
}

type PlanStep struct {
    ID        string
    Intent    string  // "Add /health endpoint"
    Files     []string // ["main.go", "main_test.go"]
    VerifyCmd string  // "go test ./..."
    Risk      string  // "low" | "medium" | "high"
}

func (a *Agent) Plan(ctx context.Context, goal string) (*Plan, error) {
    prompt := fmt.Sprintf(`
Goal: %s

Available tools: %v

Output a JSON plan in this exact format:
{
  "steps": [
    {
      "id": "step-1",
      "intent": "...",
      "files": ["..."],
      "verify_cmd": "...",
      "risk": "low|medium|high"
    }
  ]
}

Rules:
- Minimum steps to achieve goal
- Each step must be independently verifiable
- High-risk steps (file deletion, network call) must be marked
`, goal, a.ToolNames())

    var plan Plan
    if err := a.LLM.GenerateJSON(ctx, prompt, &plan); err != nil {
        return nil, err
    }
    return &plan, nil
}

func (a *Agent) ExecutePlan(ctx context.Context, p *Plan) error {
    for _, step := range p.Steps {
        if step.Risk == "high" {
            // 高危操作需要人类审批
            if !a.requestHumanApproval(step) {
                return fmt.Errorf("step %s rejected by human", step.ID)
            }
        }
        if err := a.executeStep(ctx, step); err != nil {
            return fmt.Errorf("step %s failed: %w", step.ID, err)
        }
        // 每个步骤后自动 verify
        if step.VerifyCmd != "" {
            if err := a.runShell(ctx, step.VerifyCmd); err != nil {
                return fmt.Errorf("step %s verify failed: %w", step.ID, err)
            }
        }
    }
    return nil
}
```

### 3.3 模式 3：Eval-Driven（自动评估每次输出）

```go
// harness/eval.go
type EvalSuite struct {
    tests []EvalTest
}

type EvalTest struct {
    Name    string
    Setup   func() error
    Run     func(workspace string) (passed bool, errMsg string)
    Teardown func() error
}

func (e *EvalSuite) Run(workspace string) (Report, error) {
    var report Report
    for _, t := range e.tests {
        if t.Setup != nil {
            _ = t.Setup()
        }
        passed, errMsg := t.Run(workspace)
        if t.Teardown != nil {
            _ = t.Teardown()
        }
        report.Results = append(report.Results, EvalResult{
            Name:    t.Name,
            Passed:  passed,
            ErrMsg:  errMsg,
        })
    }
    return report, nil
}

// 集成到 Agent Loop
func (a *Agent) OnStepComplete(workspace string) error {
    report, _ := a.EvalSuite.Run(workspace)
    if report.Failed() > 0 {
        return fmt.Errorf("eval failed: %s", report.Summary())
    }
    return nil
}
```

### 3.4 模式 4：Memory + Learning（跨会话学习）

```python
# harness/memory.py
import sqlite3
import json
from datetime import datetime

class AgentMemory:
    def __init__(self, db_path: str = "agent_memory.db"):
        self.db = sqlite3.connect(db_path)
        self._init_schema()

    def _init_schema(self):
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS mistakes (
                id INTEGER PRIMARY KEY,
                project TEXT,
                pattern TEXT,
                correction TEXT,
                ts TIMESTAMP
            )
        """)
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS style_prefs (
                id INTEGER PRIMARY KEY,
                project TEXT,
                key TEXT,
                value TEXT
            )
        """)

    def record_mistake(self, project: str, pattern: str, correction: str):
        """记录 LLM 犯的错误，下次避免"""
        self.db.execute(
            "INSERT INTO mistakes (project, pattern, correction, ts) VALUES (?, ?, ?, ?)",
            (project, pattern, correction, datetime.utcnow()),
        )
        self.db.commit()

    def relevant_mistakes(self, project: str, current_task: str, top_k: int = 5):
        """检索与当前任务相关的历史错误"""
        rows = self.db.execute(
            """
            SELECT pattern, correction FROM mistakes
            WHERE project = ?
            ORDER BY ts DESC LIMIT ?
            """,
            (project, top_k * 3),
        ).fetchall()

        # 简单关键词匹配
        keywords = set(current_task.lower().split())
        scored = []
        for pattern, correction in rows:
            overlap = len(keywords & set(pattern.lower().split()))
            scored.append((overlap, pattern, correction))
        scored.sort(reverse=True)
        return [f"- DON'T: {p}\n  DO: {c}" for _, p, c in scored[:top_k]]

    def inject_into_context(self, project: str, task: str) -> str:
        """生成注入到 LLM context 的记忆片段"""
        mistakes = self.relevant_mistakes(project, task)
        if not mistakes:
            return ""
        return "## Lessons from past mistakes\n" + "\n".join(mistakes)
```

### 3.5 模式 5：Sub-Agent 编排（多智能体分工）

```go
// harness/orchestrator.go
type SubAgent struct {
    Name        string
    SystemPrompt string
    Tools       []string
}

type Orchestrator struct {
    SubAgents map[string]*SubAgent
    Router    func(task string) string  // 根据任务分配 sub-agent
}

func (o *Orchestrator) Handle(ctx context.Context, task string) (string, error) {
    agentName := o.Router(task)
    agent, ok := o.SubAgents[agentName]
    if !ok {
        return "", fmt.Errorf("no agent for task: %s", task)
    }

    sub := &Agent{
        LLM:      newLLMClient(agent.SystemPrompt),
        Tools:    filterTools(agent.Tools),
        MaxSteps: 20,
    }
    return sub.Run(ctx, task)
}

// 示例：分配 sub-agent
subAgents := map[string]*SubAgent{
    "frontend": {
        Name: "frontend",
        SystemPrompt: "You are a React/TypeScript expert...",
        Tools: []string{"Read", "Edit", "Bash(npm, pnpm)"},
    },
    "backend": {
        Name: "backend",
        SystemPrompt: "You are a Go/PostgreSQL expert...",
        Tools: []string{"Read", "Edit", "Bash(go, psql)"},
    },
    "security": {
        Name: "security",
        SystemPrompt: "You are a security auditor...",
        Tools: []string{"Read", "Grep", "Bash(nmap, sqlmap)"},
    },
}
```

## 四、完整的 Harness Production 部署清单

### 4.1 项目级 CLAUDE.md 示例

```markdown
# CLAUDE.md - Harness for my-saas

## Code Style
- Go: Use `gofmt`, follow Effective Go, prefer composition
- TypeScript: Use 2-space indent, no semicolons, prefer named exports
- All public functions must have doc comments

## Architectural Rules
- Database access only through repository layer (`internal/repo/`)
- No direct HTTP calls from business logic; use `internal/api/`
- All errors must wrap with context: `fmt.Errorf("operation: %w", err)`

## Forbidden Operations
- Never modify files in `vendor/`
- Never run `git push --force` to main
- Never delete files matching `*.db` or `.env*`
- Never install global npm/pip packages

## Testing Requirements
- New features must include at least 3 test cases
- Bug fixes must include a regression test
- All HTTP handlers must have integration tests

## Build & Verify
- Backend: `make test && make lint`
- Frontend: `pnpm test && pnpm lint`
- E2E: `make e2e` (uses Docker Compose)
```

### 4.2 Spec 模板仓库结构

```
.harness/
├── CLAUDE.md              # 项目规范
├── specs/                 # Spec 模板
│   ├── new-feature.md
│   ├── bug-fix.md
│   └── refactor.md
├── plans/                 # 常用 plan 模板
│   ├── add-endpoint.json
│   └── migrate-db.json
├── evals/                 # 评估测试套件
│   ├── unit.json
│   └── integration.json
├── memory.db              # 跨会话记忆
└── tools.yaml             # 工具白名单配置
```

## 五、2026 年 Harness 工具链生态

| 工具 | 类型 | 核心特性 |
|------|------|----------|
| **Claude Code** | Agent CLI | Anthropic 官方，5 层 Harness 架构 |
| **OpenCode** | Agent CLI | 开源，模型无关，MCP 深度集成 |
| **Cursor** | IDE | 0.45+ 已加入 Plan Mode |
| **Kiro (AWS)** | Spec IDE | Spec → Code 工作流原生 |
| **Gemini CLI** | Agent CLI | 1M context 优势 |
| **Aider** | Agent CLI | Git 原生，diff 模式 |
| **Continue.dev** | VSCode | 自定义 Harness 灵活度最高 |
| **Roo Code** | VSCode | Open Source，原 Claude Code fork |

## 六、关键挑战与未来

### 6.1 仍待解决的问题

1. **Eval 质量**：LLM-as-judge 在复杂代码任务上准确率仅 67%（HumanEval-Plus 2026 基准）
2. **Harness 可移植性**：不同 Agent 的 Harness 不兼容，需要类似 LSP 的标准
3. **成本失控**：单次 Plan-Act-Eval 循环可能消耗 $5+ LLM 成本
4. **安全边界**：Harness 是新的攻击面（提示注入 → 工具调用 → 越权）

### 6.2 2026 H2 趋势

- **Harness-as-a-Service**：Harness 本身成为可托管的运行时（类似 Vercel for Agents）
- **MCP 标准化**：Anthropic 推 MCP 协议让 Harness 与工具解耦（详见 [MCP 协议 2026 完全指南](/ai/mcp-protocol-2026-complete-guide-openclaw)）
- **Spec 形式化**：Spec 从 Markdown 升级为带类型检查的 DSL（参考 AWS Cedar）

## 七、参考资源

- [Claude Code 源码泄露复刻项目](https://github.com/wanlanglin/-awesome-cc-harness)
- [Harness Engineering 深度实战：从 Claude Code 源码拆解](https://flowisle.cn/2026/04/18/harness-engineering-claude-code/index.html)
- [Anthropic: Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- [Spec-Driven Development vs Vibe Coding: The 2026 Guide](https://www.buildercog.com/blog/spec-driven-development-vs-vibe-coding-2026)
- [OpenCode 架构：模型无关的 AI Agent 实战](/ai/opencode-architecture-model-agnostic-agent-2026)
- [Anthropic Agent Skills 标准化方案](/ai/anthropic-agent-skills-2026)

## 结语

Harness Engineering 不是 prompt 优化的升级版，而是 **AI Agent 时代的"操作系统内核"**。当 LLM 成为新的 CPU，Harness 就是 Linux 内核——它管理上下文（内存）、调度工具（系统调用）、执行评估（系统调用返回值），让上层的应用开发摆脱"咒语工程"。

2026 下半年的工程团队面临一个清晰选择：继续 Vibe Coding，在生产事故中疲于奔命；还是投资 Harness 基础设施，让 AI Agent 真正成为可治理的工程力量。历史告诉我们，**抽象层级的跃迁永远发生在工程化拐点**——Harness 就是 AI 编程的工程化拐点。
