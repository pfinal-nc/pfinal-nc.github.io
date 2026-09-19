---
title: "Laravel AI SDK 0.11 实战：一次 Agent run 一条 correlation ID——让五轮工具调用在日志里现出原形"
date: 2026-09-19
tags: [php, laravel, ai, observability]
keywords: [Laravel AI SDK, v0.11, Agent Run Observability, correlation ID, lifecycle events, tool call, provider round-trip, 可观测性, cost tracking]
category: dev/backend/php
description: "Laravel AI SDK 0.11.0（2026-08-19，36 个 PR）为每次 Agent run 引入单一 correlation ID 与一组生命周期事件：每次 provider 往返、每次工具调用前后都有事件可挂。解决'五轮工具调用的 run 和单轮长得一样''死在网关的 run 无声无息'两大观测痛点，附日志聚合、成本核算、故障排查实战代码。"
author: PFinal南丞
recommend: true
---

> Agent 应用最难排查的不是代码 bug，而是"那次 run 到底发生了什么"。0.11 之前，Laravel AI SDK 的回答是：日志里一团雾。

# Laravel AI SDK 0.11 实战：一次 Agent run 一条 correlation ID

## TL;DR

- Laravel AI SDK **0.11.0**（2026-08-19 发布，36 个合并 PR、12 位首次贡献者）主打 **Agent Run Observability**：每次 Agent run 拥有**单一 correlation ID**，以及一组围绕**每次 provider 往返**和**每次工具调用**触发的**生命周期事件**。
- 修复的观测盲区很具体：**一个跑了五轮工具调用才收敛的 run，在日志里和一次单轮调用长得一模一样**；**一个死在网关（上游 5xx/超时）的 run，之前什么也不报告**。
- 实战价值三件套：按 correlation ID 聚合完整调用链、按 run 精确核算 token 成本、对"死于网关"的 run 做告警与重试归因。
- 与 13.7 的[可中断任务](/dev/backend/php/laravel-13-ai-sdk-interruptible-tasks-2026)是互补关系：一个管"跑的时候能不能优雅停下"，一个管"跑完/跑挂之后能不能看得清"。

## 一、痛点：Agent run 是天然的"观测黑洞"

先看一个最常见的 Laravel Agent 循环（简化版）：

```php
use Laravel\AI\Facades\AI;

$response = AI::agent('support-bot')
    ->withTools([SearchOrders::class, IssueRefund::class])
    ->run($userMessage);

// 用户视角：一次调用，一个结果
```

对业务代码来说这是"一次调用"。但对基础设施来说，这"一次"可能是：

```text
用户看到的一次 Agent run：

  run 开始
   ├── provider 往返 #1  → 模型决定调用 SearchOrders
   ├── 工具调用 #1       → SearchOrders（查询 DB，80ms）
   ├── provider 往返 #2  → 模型决定再调用 IssueRefund
   ├── 工具调用 #2       → IssueRefund（调支付网关，300ms）
   ├── provider 往返 #3  → 模型决定需要更多信息
   ├── 工具调用 #3       → SearchOrders（再查一次，120ms）
   ├── provider 往返 #4  → 模型生成最终回复
  run 结束
```

0.10 及之前的版本里，这四次往返、三次工具调用**在应用日志里没有共同的标识符**。你要回答"昨下午三点那位用户的支持请求为什么多扣了一次退款"，只能靠时间戳对齐 + 人肉拼接——在多 worker、多队列并发的生产环境里，这基本是刑侦工作。

更糟的是失败场景：如果 run 死在网关——上游 provider 返回 5xx、TLS 握手超时、连接被掐——0.10 之前**没有任何事件被触发**，日志里只有一行框架异常，run 级别的上下文（走到第几轮、工具调到哪一步）全部丢失。

## 二、0.11 的解法：correlation ID + 生命周期事件

### 2.1 模型

0.11.0 给观测模型加了两个原语：

```text
┌──────────────────────────────────────────────────────────┐
│                     Agent Run（一次执行）                  │
│              correlation_id: 7f3a-…-e91c（贯穿全程）       │
│                                                          │
│   ┌────────────────────────────────────────────────┐     │
│   │  生命周期事件（lifecycle events）                │     │
│   │                                                │     │
│   │  run.started                                   │     │
│   │    ├── roundtrip.started   (provider 往返 #1)   │     │
│   │    ├── roundtrip.finished                       │     │
│   │    ├── toolcall.started    (SearchOrders)       │     │
│   │    ├── toolcall.finished                        │     │
│   │    ├── roundtrip.started   (#2)                 │     │
│   │    ├── toolcall.started    (IssueRefund)        │     │
│   │    ├── toolcall.failed    ← 工具失败也有事件     │     │
│   │    ├── roundtrip.failed    ← 网关死亡也有事件    │     │
│   │  run.finished / run.failed                      │     │
│   └────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

两个原语的分工：

1. **correlation ID**：run 级唯一标识，挂在所有事件、所有底层 HTTP 请求上。多 worker 并发时，按 ID 一捞就是完整调用链。
2. **lifecycle events**：环绕每次 provider 往返与每次工具调用成对触发（started/finished/failed）。"环绕"意味着你可以拿到每一段的耗时、输入摘要、输出摘要——分段观测，而不是只有总时长。

> 事件名与挂载点以 0.11.0 官方文档为准，不同 minor 版本可能有微调；本文代码按 0.11.x 的语义编写。

### 2.2 升级

```bash
composer update laravel/ai   # 确保 >= 0.11.0
```

0.11.0 是 2026-08-19 发布的，36 个合并 PR、12 位首次贡献者——除了可观测性主线，还包含一批稳定性修复，建议直接升到 0.11.x 最新补丁。

## 三、实战一：把完整调用链写进结构化日志

利用 Laravel 的事件监听，把 run 的每个片段落成 JSON 日志：

```php
// app/Providers/AIObservabilityServiceProvider.php
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AIObservabilityServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // 事件类名以 0.11 文档为准，这里演示语义
        Event::listen('laravel-ai.agent.run.started', function ($event) {
            Log::info('ai.agent.run.started', [
                'correlation_id' => $event->correlationId,
                'agent'          => $event->agentName,
                'model'          => $event->model,
                'user_id'        => auth()->id(),
            ]);
        });

        Event::listen('laravel-ai.agent.toolcall.finished', function ($event) {
            Log::info('ai.agent.toolcall.finished', [
                'correlation_id' => $event->correlationId,
                'tool'           => $event->toolName,
                'duration_ms'    => $event->durationMs,
                'ok'             => $event->succeeded,
            ]);
        });

        Event::listen('laravel-ai.agent.roundtrip.failed', function ($event) {
            // 网关死亡现在有事件了——0.10 之前这里是静默的
            Log::error('ai.agent.roundtrip.failed', [
                'correlation_id' => $event->correlationId,
                'roundtrip'      => $event->sequence,
                'error_class'    => $event->throwable::class,
                'message'        => $event->throwable->getMessage(),
            ]);
        });
    }
}
```

有了 correlation ID，排障查询从"刑侦"变成"检索"：

```bash
# 从一条用户报障的 trace 里捞出完整链路
grep "7f3a" storage/logs/ai-2026-09-19.log | jq -s '.' 
```

```json
[
  { "event": "ai.agent.run.started",      "agent": "support-bot",   "model": "gpt-6" },
  { "event": "ai.agent.toolcall.started", "tool": "SearchOrders" },
  { "event": "ai.agent.toolcall.finished","tool": "SearchOrders",   "duration_ms": 84,  "ok": true },
  { "event": "ai.agent.toolcall.started", "tool": "IssueRefund" },
  { "event": "ai.agent.toolcall.finished","tool": "IssueRefund",    "duration_ms": 312, "ok": false },
  { "event": "ai.agent.roundtrip.started","roundtrip": 3 },
  { "event": "ai.agent.roundtrip.failed", "roundtrip": 3, "error_class": "ConnectionException" }
]
```

一眼看清：退款工具失败 → 模型试图第二轮解释 → run 死在第三次往返的网关。0.10 之前，这个故事在日志里只剩最后一行 `ConnectionException`。

## 四、实战二：按 run 核算成本

Agent 应用做商业化，成本核算必须到 run 级——"平均一次客服会话花多少钱"是定价问题，不是技术债。roundtrip 事件的 usage 数据让这件事变成聚合查询：

```php
// 按 correlation_id 聚合 token 用量，落库
Event::listen('laravel-ai.agent.roundtrip.finished', function ($event) {
    DB::table('ai_run_usages')->insert([
        'correlation_id' => $event->correlationId,
        'input_tokens'   => $event->usage->inputTokens,
        'output_tokens'  => $event->usage->outputTokens,
        'model'          => $event->model,
        'created_at'     => now(),
    ]);
});

// 单 run 成本 = Σ(每轮 input+output) × 单价
$cost = DB::table('ai_run_usages')
    ->where('correlation_id', $run->correlationId)
    ->get()
    ->sum(fn ($u) => ($u->input_tokens * $priceIn + $u->output_tokens * $priceOut) / 1_000_000);
```

顺带解决一个隐性收益问题：**多轮工具调用的 run 天然比单轮贵几倍**。有了分段数据，你能区分"模型话多"和"工具链设计有循环"——后者是架构问题，调价解决不了。

## 五、实战三：对"死在网关"的 run 告警

0.10 之前，网关死亡是静默的；0.11 里 `roundtrip.failed` / `run.failed` 让重试策略有了归因依据：

```php
Event::listen('laravel-ai.agent.run.failed', function ($event) {
    $isGatewayDeath = str_contains(
        $event->throwable::class,
        ['ConnectionException', 'RequestException']
    );

    if ($event->sequence >= 2 || $isGatewayDeath) {
        // 已发生多轮交互才挂掉：重试代价高，转人工兜底并告警
        Alert::send('ai-agent-run-lost', [
            'correlation_id' => $event->correlationId,
            'roundtrips'     => $event->sequence,
        ]);
        Handover::toHuman($event->correlationId);
    }
});
```

策略要点：**第 1 轮之前挂掉可以无脑重试（几乎无状态损失）；已经跑了几轮工具的 run 挂掉，重试可能重复执行副作用（比如再退一次款）**——这时应该转人工或走幂等恢复。这段逻辑的前提，正是 0.11 提供的 run 级上下文。

## 六、和 Interruptible Tasks 的分工

Laravel 13.7 的[可中断任务](/dev/backend/php/laravel-13-ai-sdk-interruptible-tasks-2026)解决的是"运行时控制"：长 Agent 任务可以被优雅暂停、恢复、终止。0.11 的 Run Observability 解决的是"运行后解释"：这段执行到底发生了什么、花了多少、挂在哪。

```text
Agent 生产化三件套：

  可控性   ← Interruptible Tasks（13.7）：能停、能续
  可观测   ← Run Observability（0.11）：能看、能算、能归因
  可隔离   ← 执行环境沙箱/进程隔离：防住不可信代码与副作用
```

三者齐了，Agent 功能才敢放到面向用户的路径上跑。

## 七、总结

0.11.0 的 36 个 PR 里，可观测性主线回答了一个朴素的问题：**"一次 Agent run 在基础设施眼里应该长什么样？"** 答案是：一条 correlation ID 串起来的、每段往返和工具调用都有 started/finished/failed 事件的时间线。这不是炫技——是 Agent 应用从 demo 走向 SLA 的门槛。PHP 生态在 AI 工程化上落后 Python 半个身位，但这类"工程基建先行"的发布节奏说明差距在缩小。

## 参考资料

- [PHP Weekly 2026-09-04：Agent Run Observability in Laravel AI SDK 0.11](https://www.phpweekly.com/archive/2026-09-04.html)
- [Laravel AI SDK 官方文档](https://laravel.com/docs/ai)
- [laravel/ai 仓库](https://github.com/laravel/ai)
- 相关阅读：[Laravel 13 AI SDK 实战：从官方 AI 集成到可中断任务](/dev/backend/php/laravel-13-ai-sdk-interruptible-tasks-2026)、[FrankenPHP 1.4 Worker 模式](/dev/backend/php/frankenphp-1-4-laravel-worker-mode-2026)
