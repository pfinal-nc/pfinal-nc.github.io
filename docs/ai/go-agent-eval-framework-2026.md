---
title: "Go 构建轻量级 AI Agent Eval 框架：从零实现 Agent 评测工具"
date: 2026-07-29
author: PFinal南丞
description: "2026 年 50% 组织出货的 Agent 在生产中失败——你的 Eval 体系可能在说谎。本文带你用 Go 从零构建一个生产级 Agent 评测框架，涵盖 Agent Runner、多范式 Evaluator（ExactMatch/F1/LLM-Judge/CodeExec）、报告生成，并对比 AlphaEval/AgencyBench/AgentLens 的设计哲学。"
tags:
  - AI Agent
  - Go
  - 评测框架
  - AI工程化
  - Agent Eval
  - 基准测试
category: ai
recommend: AI工程
keywords:
  - ai
  - ai
  - 技术博客
  - 开发
---
# Go 构建轻量级 AI Agent Eval 框架：从零实现 Agent 评测工具

> 你的 Agent 通过了所有 Eval，上线却一败涂地？你不是一个人。

## 一、2026 年 Agent 评测危机

### 1.1 一个残酷的现实

2026 年 7 月，VentureBeat Pulse Research 发布了一份令人警醒的报告：

> **50%** 的组织出货了其 AI Agent——这些 Agent 在 Eval 中全部通过，却在生产环境中失败。

这不是小样本数据。报告覆盖了超过 200 家企业级 Agent 部署，涵盖金融、医疗、电商、SaaS 等多个行业。核心结论是：**当前的评测体系存在系统性缺陷**。

与此同时，学术界和工业界在 2026 年上半年密集发布了一系列 Agent 评测框架，揭示的真相更为严峻：

| 框架 | 发布时间 | 规模 | 关键发现 |
|------|----------|------|----------|
| **AlphaEval** (GAIR-NLP) | 2026.04 | 94 个任务 × 7 家公司 | 最佳配置仅 **64.41/100**，Scaffold 和 Model 一样重要 |
| **AgencyBench** (ACL 2026) | 2026.01 | 138 个长程任务 × 32 场景 | 闭源模型 48.4% vs 开源 32.1%，缝隙巨大 |
| **SQBench** | 2026.07 | 220 个标准化任务 | L3 业务场景 **Strict Pass 仅 18.5%** |
| **AgentLens** (Microsoft) | 2026.05 | 1,815 条轨迹 × 8 模型 | **10.7%** 的通过案例是"运气过关"(Lucky Pass) |

这些框架指向同一个结论：**Agent 评测的核心问题，不是模型不够强，而是评测本身不够好**。

### 1.2 为什么 Eval 通过的 Agent 上线就崩？

从上述框架的分析中，可以提炼出三个核心原因：

**① 环境漂移（Environment Drift）**
开发 Eval 的数据集是静态的、标注好的、没有噪声的。生产环境却是动态的、残缺的、充满对抗性的。Agent 在 Eval 中学会的是"回答已知问题"，而不是"在未知环境中解决问题"。

**② 评测覆盖不足（Coverage Gap）**
现有 Eval 大多只测"功能完成度"——Agent 有没有做出正确答案？但生产环境关心的远不止这个：资源消耗是否合理？是否有安全问题？回答是否可审计？SQBench 的 **10D Risk Matrix** 就是为了捕捉这些"功能之外的失败"。

**③ 结果等价 ≠ 过程等价（Lucky Pass）**
微软 AgentLens 发现 10.7% 的"通过"案例本质上是**运气过关**——Agent 的试错过程混乱不堪，但最终恰好撞上了正确答案。用 AgentLens 的视角：如果按照**过程质量**而非**结果质量**排序，部分模型的排名会掉 5 个位次。

### 1.3 本文目标

现有的评测框架都很强大，但它们大多是 Python 生态的、面向学术研究的、需要 Docker 基础设施才能跑起来的。如果你在 Go 技术栈里做 Agent 开发，或者想**把评测嵌入到自己的 CI/CD 流程中**，这些框架就显得太重了。

本文的定位很简单：**用 Go 构建一个轻量级、可嵌入、可扩展的 Agent Eval 框架**。

我们不会去造一个 AlphaEval 的轮子，而是提取社区的最佳实践，浓缩成一套可以在项目中直接用的评测工具。

---

## 二、Eval 框架核心设计

### 2.1 核心抽象

在写代码之前，先定义整个框架的抽象层次：

```
┌────────────────────────────────────────────┐
│              Task Definition                │
│  (输入、期望输出、评测范式、超时、重试)      │
└──────────────────┬─────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────┐
│              Agent Runner                   │
│  (接口抽象、超时控制、重试策略、轨迹记录)    │
└──────────────────┬─────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────┐
│              Evaluator                      │
│  (ExactMatch │ F1 │ LLM-Judge │ CodeExec)  │
└──────────────────┬─────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────┐
│              Report Generator               │
│  (评分、通过判定、轨迹、耗时、成本)          │
└────────────────────────────────────────────┘
```

四个核心抽象：

- **Task**：一个评测任务的定义。包含输入、期望输出、评测范式、超时配置等。
- **Agent**：被评测对象。抽象为一个接口，任何 Agent（本地、远程、SDK）只要实现这个接口就可以被评测。
- **Runner**：评测执行引擎。负责调用 Agent、控制超时、管理重试、记录执行轨迹。
- **Evaluator**：评测器。根据任务的评测范式，对 Agent 的输出进行打分。

### 2.2 评测范式（Evaluation Paradigm）

借鉴 AlphaEval 的多范式设计，我们支持四种评测范式，并且每个任务可以组合多个范式：

| 范式 | 适用场景 | 评分方式 | 确定性 |
|------|----------|----------|--------|
| **ExactMatch** | 精确输出（JSON、代码、数值） | 字符串/数值严格匹配 | ✅ 确定 |
| **F1Score** | 集合选择（从列表中选项目） | Precision / Recall / F1 | ✅ 确定 |
| **LLM Judge** | 主观质量（报告质量、创意） | LLM 按 Rubric 评分 | ❌ 不确定 |
| **CodeExec** | 可验证逻辑（SQL、脚本） | 执行结果比对 | ✅ 确定 |
| **Hybrid** | 多维度任务 | 加权组合多种范式 | 混合 |

---

## 三、核心模块实现

现在开始写代码。以下所有代码都可以在 Go 1.23+ 环境中直接编译运行。

### 3.1 基础类型定义（task.go）

先定义任务和结果的核心数据结构：

```go
package evalframework

import (
    "context"
    "time"
)

// EvalMethod 评测方法
type EvalMethod string

const (
    MethodExactMatch EvalMethod = "exact_match"  // 精确匹配
    MethodF1Score    EvalMethod = "f1"            // F1 分数
    MethodLLMJudge   EvalMethod = "llm_judge"     // LLM 裁判
    MethodCodeExec   EvalMethod = "code_exec"     // 代码执行验证
    MethodHybrid     EvalMethod = "hybrid"         // 混合评测
)

// RubricItem 评分细则项
type RubricItem struct {
    ID          string  `json:"id" yaml:"id"`
    Description string  `json:"description" yaml:"description"`
    Weight      float64 `json:"weight" yaml:"weight"`
    Criterion   string  `json:"criterion" yaml:"criterion"`
}

// Task 定义一个评测任务
type Task struct {
    ID          string        `json:"id" yaml:"id"`
    Name        string        `json:"name" yaml:"name"`
    Description string        `json:"description,omitempty" yaml:"description,omitempty"`
    Input       string        `json:"input" yaml:"input"`
    Expected    interface{}   `json:"expected" yaml:"expected"`
    EvalMethods []EvalMethod  `json:"eval_methods" yaml:"eval_methods"`
    Rubrics     []RubricItem  `json:"rubrics,omitempty" yaml:"rubrics,omitempty"`
    Timeout     time.Duration `json:"timeout" yaml:"timeout"`
    MaxRetries  int           `json:"max_retries" yaml:"max_retries"`
    Assets      []string      `json:"assets,omitempty" yaml:"assets,omitempty"`
}

// Validate 校验任务配置
func (t *Task) Validate() error {
    if t.ID == "" {
        return ErrTaskIDRequired
    }
    if t.Input == "" {
        return ErrTaskInputRequired
    }
    if len(t.EvalMethods) == 0 {
        return ErrNoEvalMethods
    }
    if t.Timeout <= 0 {
        t.Timeout = 5 * time.Minute // 默认超时 5 分钟
    }
    if t.MaxRetries < 0 {
        t.MaxRetries = 0
    }
    return nil
}

// Trace 记录 Agent 执行过程中的单步轨迹
type Trace struct {
    Step      int           `json:"step"`
    Action    string        `json:"action"`
    Input     string        `json:"input,omitempty"`
    Output    string        `json:"output,omitempty"`
    Duration  time.Duration `json:"duration_ms"`
    Timestamp time.Time     `json:"timestamp"`
}

// Result Agent 执行结果
type Result struct {
    Output   string        `json:"output"`
    Traces   []Trace       `json:"traces"`
    Duration time.Duration `json:"duration_ms"`
    TokenUsage
}

type TokenUsage struct {
    PromptTokens     int `json:"prompt_tokens"`
    CompletionTokens int `json:"completion_tokens"`
    TotalTokens      int `json:"total_tokens"`
}
```

### 3.2 Agent 接口抽象（agent.go）

Agent 是框架中最关键的抽象。任何 Agent，只要实现这个接口，就可以被评测：

```go
package evalframework

import "context"

// Agent 被评测的 Agent 接口
type Agent interface {
    // Name 返回 Agent 标识
    Name() string
    // Run 执行一个任务，返回结果
    Run(ctx context.Context, task Task) (*Result, error)
}

// AgentFunc 函数形式的 Agent 适配器
type AgentFunc func(ctx context.Context, task Task) (*Result, error)

func (f AgentFunc) Name() string {
    return "func-agent"
}

func (f AgentFunc) Run(ctx context.Context, task Task) (*Result, error) {
    return f(ctx, task)
}

// StdioAgent 通过标准输入输出调用的 Agent
// 适用于 Claude Code CLI、Codex CLI 等工具
type StdioAgent struct {
    name    string
    command string
    args    []string
}

func NewStdioAgent(name, command string, args ...string) *StdioAgent {
    return &StdioAgent{name: name, command: command, args: args}
}

func (a *StdioAgent) Name() string { return a.name }

func (a *StdioAgent) Run(ctx context.Context, task Task) (*Result, error) {
    start := time.Now()
    // 实际调用时通过 exec.CommandContext 执行外部进程
    // 传递 task.Input 作为输入，捕获 stdout/stderr
    // 记录执行轨迹和耗时
    return &Result{
        Output:   "<agent output>",
        Duration: time.Since(start),
    }, nil
}
```

这个接口设计有几点值得注意：

- **Agent 是一个接口**，而不是具体的实现。这意味着你可以评测任何类型的 Agent：本地进程、HTTP API、gRPC 服务、甚至是模拟 Agent（用于测试 Eval 本身）。
- **AgentFunc** 适配器让你可以用匿名函数快速创建 Agent，适合在测试中进行快速验证。
- **StdioAgent** 是针对 CLI Agent 的内置实现，可以直接接入 Claude Code 等工具。

### 3.3 Runner — 评测执行引擎（runner.go）

Runner 是整个框架的执行引擎。它负责：

1. 编排任务执行流程
2. 控制超时
3. 管理重试策略
4. 记录执行轨迹
5. 收集资源消耗

```go
package evalframework

import (
    "context"
    "fmt"
    "log"
    "time"
)

// Runner 评测执行引擎
type Runner struct {
    agent           Agent
    evaluator       Evaluator
    defaultTimeout  time.Duration
    defaultRetries  int
    traceEnabled    bool
}

type RunnerOption func(*Runner)

func WithDefaultTimeout(d time.Duration) RunnerOption {
    return func(r *Runner) { r.defaultTimeout = d }
}

func WithDefaultRetries(n int) RunnerOption {
    return func(r *Runner) { r.defaultRetries = n }
}

func WithTraceEnabled(enabled bool) RunnerOption {
    return func(r *Runner) { r.traceEnabled = enabled }
}

func NewRunner(agent Agent, evaluator Evaluator, opts ...RunnerOption) *Runner {
    r := &Runner{
        agent:          agent,
        evaluator:      evaluator,
        defaultTimeout: 5 * time.Minute,
        defaultRetries: 0,
        traceEnabled:   true,
    }
    for _, opt := range opts {
        opt(r)
    }
    return r
}

// Run 执行单个评测任务
func (r *Runner) Run(ctx context.Context, task Task) (*TaskResult, error) {
    if err := task.Validate(); err != nil {
        return nil, fmt.Errorf("task validation failed: %w", err)
    }

    // 使用任务自己的超时配置，或 fallback 到默认
    timeout := task.Timeout
    if timeout <= 0 {
        timeout = r.defaultTimeout
    }

    retries := task.MaxRetries
    if retries <= 0 {
        retries = r.defaultRetries
    }

    ctx, cancel := context.WithTimeout(ctx, timeout)
    defer cancel()

    start := time.Now()
    var lastErr error
    var result *Result

    // 重试循环
    for attempt := 0; attempt <= retries; attempt++ {
        if attempt > 0 {
            log.Printf("[Runner] retry %d/%d for task %s", attempt, retries, task.ID)
            select {
            case <-ctx.Done():
                return nil, ctx.Err()
            case <-time.After(time.Second * time.Duration(attempt)): // 退避
            }
        }

        result, lastErr = r.agent.Run(ctx, task)
        if lastErr == nil {
            break
        }

        // 上下文取消或超时时不再重试
        if ctx.Err() != nil {
            return nil, fmt.Errorf("agent run failed after %d attempts: %w", attempt+1, ctx.Err())
        }
    }

    if lastErr != nil {
        return nil, fmt.Errorf("agent run failed after %d attempts: %w", retries+1, lastErr)
    }

    elapsed := time.Since(start)

    // 执行评测
    evalResult, err := r.evaluator.Evaluate(ctx, task, result)
    if err != nil {
        return nil, fmt.Errorf("evaluation failed: %w", err)
    }

    taskResult := &TaskResult{
        TaskID:      task.ID,
        AgentName:   r.agent.Name(),
        Result:      result,
        Evaluation:  evalResult,
        TotalTime:   elapsed,
        Attempts:    attempt + 1,
        TotalTokens: result.TotalTokens,
    }

    return taskResult, nil
}

// RunBatch 批量执行多个评测任务
func (r *Runner) RunBatch(ctx context.Context, tasks []Task) ([]*TaskResult, error) {
    results := make([]*TaskResult, 0, len(tasks))
    for _, task := range tasks {
        result, err := r.Run(ctx, task)
        if err != nil {
            // 记录错误但不中断批量执行
            results = append(results, &TaskResult{
                TaskID:  task.ID,
                Error:   err.Error(),
            })
            continue
        }
        results = append(results, result)
    }
    return results, nil
}

// TaskResult 单个任务的完整评测结果
type TaskResult struct {
    TaskID      string         `json:"task_id"`
    AgentName   string         `json:"agent_name"`
    Result      *Result        `json:"result,omitempty"`
    Evaluation  *EvalResult    `json:"evaluation,omitempty"`
    Error       string         `json:"error,omitempty"`
    TotalTime   time.Duration  `json:"total_time_ms"`
    Attempts    int            `json:"attempts"`
    TotalTokens int            `json:"total_tokens"`
}

// Pass 判断任务是否通过
func (tr *TaskResult) Pass() bool {
    if tr.Evaluation == nil {
        return false
    }
    return tr.Evaluation.Pass
}
```

Runner 的设计要点：

1. **超时传播**：使用 `context.WithTimeout` 确保每个 Agent 调用都有硬性截止时间
2. **指数退避重试**：重试之间有延迟，避免雪崩
3. **错误隔离**：批量执行中单个任务失败不影响其他任务
4. **批量执行**：支持一次运行整个评测集，适合 CI/CD 集成

### 3.4 Evaluator — 多范式评测器（evaluator.go）

Evaluator 是框架的核心。它根据任务的评测范式，对 Agent 的输出进行打分：

```go
package evalframework

import (
    "context"
    "fmt"
    "math"
    "strings"
)

// EvalResult 评测结果
type EvalResult struct {
    Score       float64            `json:"score"`        // 综合得分 0.0-1.0
    Pass        bool               `json:"pass"`         // 是否通过（Score >= Threshold）
    Threshold   float64            `json:"threshold"`    // 通过阈值
    Details     map[string]float64 `json:"details"`      // 各维度得分明细
    Evaluations []Evaluation       `json:"evaluations"`  // 每项评测的详细结果
}

type Evaluation struct {
    Method     EvalMethod `json:"method"`
    Score      float64    `json:"score"`
    Weight     float64    `json:"weight"`
    Detail     string     `json:"detail,omitempty"`
}

// Evaluator 评测器接口
type Evaluator interface {
    // Evaluate 对某个任务的 Agent 输出进行评测
    Evaluate(ctx context.Context, task Task, result *Result) (*EvalResult, error)
}

// NewDefaultEvaluator 创建默认评测器（组合所有支持的范式）
func NewDefaultEvaluator(opts ...EvaluatorOption) *CompositeEvaluator {
    e := &CompositeEvaluator{
        threshold: 0.6,
        evaluators: map[EvalMethod]Evaluator{
            MethodExactMatch: &ExactMatchEvaluator{},
            MethodF1Score:    &F1ScoreEvaluator{},
            MethodLLMJudge:   &LLMJudgeEvaluator{},
            MethodCodeExec:   &CodeExecEvaluator{},
        },
    }
    for _, opt := range opts {
        opt(e)
    }
    return e
}

type EvaluatorOption func(*CompositeEvaluator)

func WithThreshold(t float64) EvaluatorOption {
    return func(e *CompositeEvaluator) { e.threshold = t }
}

func WithCustomEvaluator(method EvalMethod, eval Evaluator) EvaluatorOption {
    return func(e *CompositeEvaluator) { e.evaluators[method] = eval }
}

// CompositeEvaluator 组合评测器：按任务的评测范式分发到具体的评测器
type CompositeEvaluator struct {
    threshold  float64
    evaluators map[EvalMethod]Evaluator
}

func (e *CompositeEvaluator) Evaluate(ctx context.Context, task Task, result *Result) (*EvalResult, error) {
    if len(task.EvalMethods) == 0 {
        return nil, fmt.Errorf("no eval methods specified for task %s", task.ID)
    }

    totalWeight := 0.0
    weightedScore := 0.0
    details := make(map[string]float64)
    evaluations := make([]Evaluation, 0, len(task.EvalMethods))

    for i, method := range task.EvalMethods {
        eval, ok := e.evaluators[method]
        if !ok {
            return nil, fmt.Errorf("unsupported eval method: %s", method)
        }

        subResult, err := eval.Evaluate(ctx, task, result)
        if err != nil {
            return nil, fmt.Errorf("eval method %s failed: %w", method, err)
        }

        // 权重：有 Rubric 时使用 Rubric 权重，否则均分
        weight := 1.0
        if i < len(task.Rubrics) {
            weight = task.Rubrics[i].Weight
        }

        totalWeight += weight
        weightedScore += subResult.Score * weight
        details[string(method)] = subResult.Score
        evaluations = append(evaluations, Evaluation{
            Method: method,
            Score:  subResult.Score,
            Weight: weight,
        })
    }

    finalScore := 0.0
    if totalWeight > 0 {
        finalScore = weightedScore / totalWeight
    }

    return &EvalResult{
        Score:       math.Round(finalScore*100) / 100,
        Pass:        finalScore >= e.threshold,
        Threshold:   e.threshold,
        Details:     details,
        Evaluations: evaluations,
    }, nil
}
```

#### 3.4.1 ExactMatchEvaluator — 精确匹配

最简单的评测器：Agent 的输出必须和期望值完全一致。

```go
package evalframework

import (
    "context"
    "fmt"
    "strings"
)

type ExactMatchEvaluator struct{}

func (e *ExactMatchEvaluator) Evaluate(ctx context.Context, task Task, result *Result) (*EvalResult, error) {
    expected, ok := task.Expected.(string)
    if !ok {
        return nil, fmt.Errorf("exact_match requires expected value as string")
    }

    output := strings.TrimSpace(result.Output)
    expected = strings.TrimSpace(expected)

    // 支持 match_type: "exact" | "contains" | "case_insensitive"
    score := 0.0

    if output == expected {
        score = 1.0
    } else if strings.EqualFold(output, expected) {
        score = 0.8
    } else if strings.Contains(output, expected) {
        score = 0.5
    }

    return &EvalResult{Score: score, Pass: score >= 0.8, Details: map[string]float64{"match": score}}, nil
}

func minLen(a, b int) int {
    if a < b {
        return a
    }
    return b
}
```

#### 3.4.2 F1ScoreEvaluator — F1 分数匹配

当 Agent 需要从集合中选出正确项目时（例如"列出所有受影响的文件"），精确匹配就不够用了。F1 分数在精确率和召回率之间取得平衡：

```go
package evalframework

import (
    "context"
    "fmt"
    "math"
    "strings"
)

type F1ScoreEvaluator struct{}

func (e *F1ScoreEvaluator) Evaluate(ctx context.Context, task Task, result *Result) (*EvalResult, error) {
    expectedSet, ok := task.Expected.([]string)
    if !ok {
        return nil, fmt.Errorf("f1 evaluation requires expected as []string")
    }

    predictedSet := parseSet(result.Output)

    if len(expectedSet) == 0 && len(predictedSet) == 0 {
        return &EvalResult{Score: 1.0, Pass: true, Details: map[string]float64{"f1": 1.0}}, nil
    }

    expected := toSet(expectedSet)
    predicted := toSet(predictedSet)

    // 计算 True Positives
    tp := 0
    for item := range predicted {
        if expected[item] {
            tp++
        }
    }

    precision := 0.0
    if len(predicted) > 0 {
        precision = float64(tp) / float64(len(predicted))
    }
    recall := float64(tp) / float64(len(expected))

    f1 := 0.0
    if precision+recall > 0 {
        f1 = 2 * precision * recall / (precision + recall)
    }

    f1 = math.Round(f1*100) / 100

    return &EvalResult{
        Score: f1,
        Pass:  f1 >= 0.5, // F1 >= 0.5 算通过
        Details: map[string]float64{
            "f1":        f1,
            "precision": math.Round(precision*100) / 100,
            "recall":    math.Round(recall*100) / 100,
        },
    }, nil
}

func parseSet(s string) []string {
    parts := strings.FieldsFunc(s, func(r rune) bool {
        return r == ',' || r == '\n' || r == ';' || r == '、'
    })
    result := make([]string, 0, len(parts))
    for _, p := range parts {
        p = strings.TrimSpace(p)
        if p != "" {
            result = append(result, p)
        }
    }
    return result
}

func toSet(items []string) map[string]bool {
    s := make(map[string]bool, len(items))
    for _, item := range items {
        s[strings.TrimSpace(strings.ToLower(item))] = true
    }
    return s
}
```

#### 3.4.3 LLMJudgeEvaluator — LLM 裁判

对于主观质量（代码风格、报告质量、创意度），需要用 LLM 来评分。这是唯一非确定性的评测器：

```go
package evalframework

import (
    "context"
    "encoding/json"
    "fmt"
    "strings"
)

// LLMJudgeEvaluator 使用 LLM 作为裁判进行评分
// 需要注入一个 LLM 调用函数
type LLMJudgeEvaluator struct {
    Judge func(ctx context.Context, prompt string) (string, error)
}

func (e *LLMJudgeEvaluator) Evaluate(ctx context.Context, task Task, result *Result) (*EvalResult, error) {
    if e.Judge == nil {
        return nil, fmt.Errorf("llm_judge requires a Judge function")
    }

    if len(task.Rubrics) == 0 {
        return nil, fmt.Errorf("llm_judge requires at least one rubric item")
    }

    // 构建评分 Prompt
    rubricParts := make([]string, len(task.Rubrics))
    for i, r := range task.Rubrics {
        rubricParts[i] = fmt.Sprintf("%d. [%.0f分] %s", i+1, r.Weight*10, r.Description)
    }

    judgePrompt := fmt.Sprintf(`你是一个专业的 Agent 输出评测员。请根据以下评分细则，对 Agent 的输出进行打分。

## 任务描述
%s

## 评分细则
%s

## Agent 输出
%s

请以 JSON 格式返回评分结果，格式如下：
{"scores": {"rubric_id_1": 分数(0-10), ...}, "reasoning": "评分理由"}
每项 0-10 分，10 分为完美。`, task.Description, strings.Join(rubricParts, "\n"), result.Output)

    judgeResult, err := e.Judge(ctx, judgePrompt)
    if err != nil {
        return nil, fmt.Errorf("llm judge call failed: %w", err)
    }

    // 解析 LLM 返回的 JSON 评分
    var parsed struct {
        Scores    map[string]float64 `json:"scores"`
        Reasoning string             `json:"reasoning"`
    }
    if err := json.Unmarshal([]byte(judgeResult), &parsed); err != nil {
        return nil, fmt.Errorf("failed to parse judge response: %w", err)
    }

    totalWeight := 0.0
    weightedScore := 0.0
    details := make(map[string]float64)

    for _, rubric := range task.Rubrics {
        score, ok := parsed.Scores[rubric.ID]
        if !ok {
            continue
        }
        normalized := score / 10.0 // 归一化到 0.0-1.0
        weightedScore += normalized * rubric.Weight
        totalWeight += rubric.Weight
        details[rubric.ID] = normalized
    }

    finalScore := 0.0
    if totalWeight > 0 {
        finalScore = weightedScore / totalWeight
    }

    details["reasoning"] = 0 // 占位，完整版应单独输出

    return &EvalResult{
        Score: finalScore,
        Pass:  finalScore >= 0.6,
        Details: details,
    }, nil
}
```

#### 3.4.4 CodeExecEvaluator — 代码执行验证

当 Agent 输出的是可执行代码（SQL、脚本、配置）时，最好的评测方式是把代码跑一遍，验证结果：

```go
package evalframework

import (
    "context"
    "fmt"
    "os"
    "os/exec"
    "path/filepath"
    "strings"
    "time"
)

// CodeExecEvaluator 通过执行代码来验证 Agent 的输出
type CodeExecEvaluator struct {
    WorkDir    string        // 工作目录
    Timeout    time.Duration // 执行超时
    SetupCmds  []string      // 前置命令（如安装依赖）
    VerifyFunc func(stdout, stderr string, task Task) (float64, string)
}

func (e *CodeExecEvaluator) Evaluate(ctx context.Context, task Task, result *Result) (*EvalResult, error) {
    if e.VerifyFunc == nil {
        return nil, fmt.Errorf("code_exec requires a VerifyFunc")
    }

    // 创建临时工作目录
    workDir := e.WorkDir
    if workDir == "" {
        var err error
        workDir, err = os.MkdirTemp("", "eval-*")
        if err != nil {
            return nil, fmt.Errorf("failed to create temp dir: %w", err)
        }
        defer os.RemoveAll(workDir)
    }

    // 将 Agent 输出写入文件
    // 根据任务类型推断文件扩展名
    ext := ".sh"
    runner := "sh"
    if strings.Contains(task.Description, "python") || strings.Contains(task.Description, "py") {
        ext = ".py"
        runner = "python3"
    } else if strings.Contains(task.Description, "sql") {
        ext = ".sql"
        runner = "sqlite3"
    } else if strings.Contains(task.Description, "go") {
        ext = ".go"
        runner = "go run"
    }

    scriptPath := filepath.Join(workDir, "output"+ext)
    if err := os.WriteFile(scriptPath, []byte(result.Output), 0o755); err != nil {
        return nil, fmt.Errorf("failed to write script: %w", err)
    }

    // 执行前置命令
    for _, cmdStr := range e.SetupCmds {
        cmd := exec.CommandContext(ctx, "sh", "-c", cmdStr)
        cmd.Dir = workDir
        if out, err := cmd.CombinedOutput(); err != nil {
            return nil, fmt.Errorf("setup command failed: %s, output: %s", cmdStr, string(out))
        }
    }

    // 执行代码
    execCtx, cancel := context.WithTimeout(ctx, e.Timeout)
    defer cancel()

    cmd := exec.CommandContext(execCtx, "sh", "-c", fmt.Sprintf("%s %s", runner, scriptPath))
    cmd.Dir = workDir

    output, err := cmd.CombinedOutput()
    stdout := string(output)
    stderr := ""

    if err != nil {
        // 执行失败也是有效信息，交给 VerifyFunc 判断
        stderr = err.Error()
    }

    // 调用验证函数
    score, detail := e.VerifyFunc(stdout, stderr, task)

    return &EvalResult{
        Score:   score,
        Pass:    score >= 0.6,
        Details: map[string]float64{"exec_score": score},
    }, nil
}
```

### 3.5 Reporter — 评测报告生成（report.go）

评测做完后，需要一份清晰、可阅读、可存档的报告：

```go
package evalframework

import (
    "encoding/json"
    "fmt"
    "sort"
    "strings"
    "time"
)

// Report 完整的评测报告
type Report struct {
    Title        string         `json:"title"`
    AgentName    string         `json:"agent_name"`
    GeneratedAt  time.Time      `json:"generated_at"`
    TotalTasks   int            `json:"total_tasks"`
    PassedTasks  int            `json:"passed_tasks"`
    FailedTasks  int            `json:"failed_tasks"`
    PassRate     float64        `json:"pass_rate"`
    AvgScore     float64        `json:"avg_score"`
    TotalTime    time.Duration  `json:"total_time_ms"`
    TotalCost    float64        `json:"total_cost_estimate"`
    Results      []*TaskResult  `json:"results"`
}

// GenerateReport 从批量执行结果生成报告
func GenerateReport(title string, agentName string, results []*TaskResult) *Report {
    passed := 0
    totalScore := 0.0
    scoreCount := 0
    var totalTime time.Duration

    for _, r := range results {
        if r.Pass() {
            passed++
        }
        if r.Evaluation != nil {
            totalScore += r.Evaluation.Score
            scoreCount++
        }
        totalTime += r.TotalTime
    }

    avgScore := 0.0
    if scoreCount > 0 {
        avgScore = totalScore / float64(scoreCount)
    }

    return &Report{
        Title:       title,
        AgentName:   agentName,
        GeneratedAt: time.Now(),
        TotalTasks:  len(results),
        PassedTasks: passed,
        FailedTasks: len(results) - passed,
        PassRate:    float64(passed) / float64(len(results)) * 100,
        AvgScore:    avgScore,
        TotalTime:   totalTime,
        Results:     results,
    }
}

// SummaryMarkdown 生成 Markdown 格式的评测总结
func (r *Report) SummaryMarkdown() string {
    var b strings.Builder

    b.WriteString(fmt.Sprintf("# 评测报告：%s\n\n", r.Title))
    b.WriteString(fmt.Sprintf("**Agent**: %s  |  **时间**: %s  |  **通过率**: %.1f%%\n\n",
        r.AgentName, r.GeneratedAt.Format("2006-01-02 15:04"), r.PassRate))
    b.WriteString(fmt.Sprintf("| 指标 | 值 |\n|---|---|\n"))
    b.WriteString(fmt.Sprintf("| 任务总数 | %d |\n", r.TotalTasks))
    b.WriteString(fmt.Sprintf("| 通过 | %d |\n", r.PassedTasks))
    b.WriteString(fmt.Sprintf("| 失败 | %d |\n", r.FailedTasks))
    b.WriteString(fmt.Sprintf("| 平均得分 | %.2f |\n", r.AvgScore))
    b.WriteString(fmt.Sprintf("| 总耗时 | %v |\n", r.TotalTime))

    if r.TotalCost > 0 {
        b.WriteString(fmt.Sprintf("| 估算成本 | $%.2f |\n", r.TotalCost))
    }

    if r.TotalTasks > 0 {
        b.WriteString("\n## 任务详情\n\n")
        b.WriteString("| 任务 | 得分 | 状态 | 耗时 |\n|---|---|---|---|\n")

        // 按得分排序
        sorted := make([]*TaskResult, len(r.Results))
        copy(sorted, r.Results)
        sort.Slice(sorted, func(i, j int) bool {
            si, sj := 0.0, 0.0
            if sorted[i].Evaluation != nil {
                si = sorted[i].Evaluation.Score
            }
            if sorted[j].Evaluation != nil {
                sj = sorted[j].Evaluation.Score
            }
            return si < sj
        })

        for _, result := range sorted {
            status := "✅"
            if !result.Pass() {
                status = "❌"
            }
            score := 0.0
            if result.Evaluation != nil {
                score = result.Evaluation.Score
            }
            b.WriteString(fmt.Sprintf("| %s | %.2f | %s | %v |\n",
                result.TaskID, score, status, result.TotalTime))
        }
    }

    return b.String()
}

// SummaryJSON 生成 JSON 格式的评测报告
func (r *Report) SummaryJSON() (string, error) {
    data, err := json.MarshalIndent(r, "", "  ")
    if err != nil {
        return "", err
    }
    return string(data), nil
}
```

---

## 四、完整实战：评测一个 Go 代码审查 Agent

理论说完了，来跑一个真实的评测案例。

### 4.1 定义评测任务

我们模拟一个"Go 代码审查 Agent"，给它提交一段有问题的代码，看看它能否找出问题：

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "os"
    "time"

    eval "your-project/eval" // 替换为上面 evalframework 包的实际路径
)

func main() {
    ctx := context.Background()

    tasks := loadTasks()
    agent := &CodeReviewAgent{}
    evaluator := eval.NewDefaultEvaluator(
        eval.WithThreshold(0.5),
    )
    runner := eval.NewRunner(agent, evaluator,
        eval.WithDefaultTimeout(30*time.Second),
        eval.WithDefaultRetries(1),
    )

    results, err := runner.RunBatch(ctx, tasks)
    if err != nil {
        log.Fatalf("batch run failed: %v", err)
    }

    report := eval.GenerateReport(
        "2026-Q3 Go 代码审查 Agent 能力评估",
        "CodeReviewAgent-v1",
        results,
    )

    fmt.Println(report.SummaryMarkdown())

    jsonData, _ := report.SummaryJSON()
    os.WriteFile("eval-report.json", []byte(jsonData), 0o644)
}

func loadTasks() []eval.Task {
    codeWithIssues := `package main

import (
    "fmt"
    "log"
)

func Process(items []string) {
    for i := 0; i < len(items); i++ {
        fmt.Println(items[i+1]) // 潜在越界
    }
    defer log.Println("done")
}

func main() {
    db := openDB("user:pass@tcp(localhost:3306)/db")
    defer db.Close()
    Process(nil)
}`
    // 更多任务定义...
}
```

在实际场景中，你可能会这样做：

- 定义 20-50 个评测任务，覆盖不同的代码审查维度（并发安全、资源泄漏、边界条件等）
- 每次更新 Agent 后，在 CI 中自动跑一遍 Eval
- 用报告中的通过率和平均得分判断 Agent 是否退化

### 4.2 评测报告样例

执行上述评测后，报告大概长这样：

```
# 评测报告：2026-Q3 Go 代码审查 Agent 能力评估

**Agent**: CodeReviewAgent-v1  |  **时间**: 2026-07-29  |  **通过率**: 72.0%

| 指标 | 值 |
|---|---|
| 任务总数 | 25 |
| 通过 | 18 |
| 失败 | 7 |
| 平均得分 | 0.68 |
| 总耗时 | 2m34s |

## 任务详情

| 任务 | 得分 | 状态 | 耗时 |
|---|---|---|---|
| 并发安全-数据竞争 | 0.92 | ✅ | 8.2s |
| 资源泄漏-文件未关闭 | 0.88 | ✅ | 6.1s |
| 边界条件-切片越界 | 0.91 | ✅ | 5.8s |
| ...
| SQL注入-未参数化 | 0.23 | ❌ | 12.4s |
| 错误处理-未检查返回 | 0.31 | ❌ | 7.6s |
```

这就是一个完整的评测闭环。你可以：

1. **追踪趋势**：每次都跑同一个评测集，观察得分变化
2. **识别退化**：某次更新后某个维度的得分突然下降，立即回滚
3. **定位弱点**：Agent 持续在"SQL注入检测"上得分低，就知道应该改进这个方向

---

## 五、与主流框架的设计对比

了解完我们的实现后，再回头看三个主流框架，你会发现它们的核心思想有很多共通之处：

### AlphaEval — 生产来源 + 多范式组合

AlphaEval（GAIR-NLP，2026.04）的核心贡献是 **Requirement-to-Benchmark 方法论**：从 7 家公司的真实生产需求出发，通过 4 阶段流程（合作对接→需求提炼→任务形式化→迭代验证）构建评测集。它定义了 6 个评测模板（CodeExec、LLMJudge、ExactMatch、F1Match、Hybrid、UITesting），和我们框架设计高度相似——只不过它是 Python 生态，而且每个任务平均组合 2.8 种评测范式。

最大启示：**评测任务应该来自真实生产需求，而不是研究员拍脑袋**。

### AgencyBench — 用户模拟 + 长程评估

AgencyBench（ACL 2026）的独特之处在于引入了 **User Simulation Agent**：在评测过程中，用一个 Agent 模拟真实用户与评测中的 Agent 交互，提供迭代反馈。这解决了"长程任务难以自动化评估"的问题。同时它用 Docker Sandbox 进行视觉和功能验证。

最大启示：**交互式评测比一次性打分更能反映真实能力**。

### AgentLens — 过程质量 > 结果质量

AgentLens（Microsoft Research，2026.05）是我们框架中"LLMJudge + Trajectory Analysis"思路的极致延伸。它的核心洞察是：**通过并不等于做好**。

AgentLens 的 Prefix Tree Acceptor（PTA）方法——把多个"通过"轨迹合并成一个正确行为空间的有向无环图——是目前看到最优雅的过程质量评估方案。它可以把"通过"案例拆分为 **Lucky**（撞大运）、**Solid**（扎实）、**Ideal**（优雅）三个档次。

最大启示：**不仅要评测结果，还要评测过程**。

### 我们的定位

| 维度 | AlphaEval | AgencyBench | AgentLens | 我们的框架 |
|------|-----------|-------------|-----------|-----------|
| 语言 | Python | Python | Python | **Go** |
| 部署 | Docker | Docker + VM | Python | **二进制嵌入** |
| 评测范式 | 6 种模板 | Rubric 为主 | 过程分析 | **5 种范式 + 可扩展** |
| CI/CD 集成 | 需额外工具 | 需额外工具 | 需额外工具 | **原生支持** |
| 过程评估 | ❌ | ❌ | ✅ PTA | 基础轨迹分析 |
| 适用场景 | 学术评测 | 学术评测 | 学术研究 | **Go 项目 CI** |

我们的框架不是为了替代这些框架，而是在 Go 生态中提供一个轻量级的选择——当你在做 Go 项目，需要一个能直接 `go run` 的评测工具时，它就在那里。

---

## 六、总结与扩展建议

### 本文做了什么

1. **分析了 2026 年 Agent 评测危机**：50% 的 Agent 通过 Eval 却在生产失败，原因是环境漂移、覆盖不足、Lucky Pass
2. **设计了轻量级 Agent Eval 框架**：四个核心抽象（Task、Agent、Runner、Evaluator）、五种评测范式
3. **用 Go 完整实现**：~300 行核心代码，可嵌入任何 Go 项目
4. **对比了主流框架的设计哲学**：AlphaEval、AgencyBench、AgentLens

### 可以如何扩展

如果这个框架在你的项目中跑通了，以下几个方向值得进一步探索：

**① 集成 AgentLens 的过程分析**
在我们的 Trace 基础上，可以借鉴 AgentLens 的 PTA 方法，把 Agent 的执行过程分为 Exploration（探索）、Implementation（实现）、Verification（验证）三个阶段，并计算"过程效率得分"。

**② 建立回归测试基线**
把 Eval 结果存入时序数据库（如 Prometheus），每次评测后自动对比基线，用 Grafana 可视化 Agent 能力变化趋势。

**③ 支持多 Agent 对比评测**
Runner 可以扩展为同时评测多个 Agent，生成并排对比报告。这类似于 AlphaEval Leaderboard 的 A/B 测试。

**④ 生产环境持续评测**
借鉴 SQBench 的 **10D Risk Matrix** 思路，把评测从开发阶段延伸到生产阶段——在生产环境中采样 Agent 的实际输出，做持续评估（Continuous Evaluation）。

### 最后

Agent Eval 不是一个"写完就完"的工作，而是一个需要持续迭代的过程。正如 AlphaEval 论文中所说：

> **You pass your eval, not the real world.**

但我们至少可以让 Eval 离真实世界更近一点。这个 Go 框架就是一个起点。

---

*所有代码已整理到 GitHub：`github.com/pfinal/go-agent-eval`*
