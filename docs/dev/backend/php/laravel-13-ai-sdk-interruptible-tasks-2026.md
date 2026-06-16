---
title: "Laravel 13 AI SDK 实战：从官方 AI 集成到可中断任务的全栈开发"
date: 2026-06-16
tags:
  - php
  - laravel
  - AI
  - framework
  - backend
keywords:
  - Laravel 13
  - Laravel AI SDK
  - PHP AI
  - 可中断任务
  - Interruptible Tasks
category: dev/backend/php
description: "深度实战 Laravel 13 AI SDK：统一 AI Provider 接口、Tool Calling、流式输出、可中断任务（Interruptible Tasks）、PHP 8.5 Pipe Operator，从零构建 AI 驱动的 Laravel 应用。"
---

# Laravel 13 AI SDK 实战：从官方 AI 集成到可中断任务的全栈开发

Laravel 13 于 2026 年 3 月正式发布，代号为 **"专为工匠与智能体打造的纯净栈"（The clean stack for Artisans and agents）**。这不是一句口号——Laravel 13 引入了**官方 Laravel AI SDK**，首次为 PHP 生态提供了一等公民的 AI 集成能力。同时，13.7.0 版本新增的**可中断任务（Interruptible Tasks）**，让长时间运行的 AI 工作流有了优雅的退出机制。

本文将从 AI SDK 基础到生产级实践，完整演示如何在 Laravel 13 中构建 AI 驱动的应用。

## Laravel 13 核心变化一览

| 特性 | 说明 | 版本 |
|------|------|------|
| Laravel AI SDK | 统一 AI Provider 接口（OpenAI/Anthropic/Gemini） | 13.0 |
| 原生 PHP Attributes | 替代部分注解，性能提升 | 13.0 |
| Interruptible Tasks | 长时间运行任务可安全中断 | 13.7 |
| PHP 8.3 最低要求 | 类型化类常量、改进的 readonly | 13.0 |
| Octane + FrankenPHP | 深度优化，JIT 加速 | 13.0 |
| 并发 HTTP 请求 | `Http::pool()` 原生支持 | 13.0 |

## 一、Laravel AI SDK 架构

### 统一 Provider 接口

```
┌──────────────────────────────────────────┐
│              Laravel AI SDK              │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │       Primitives (核心原语)        │  │
│  │  - Chat                            │  │
│  │  - Completion                      │  │
│  │  - Embeddings                      │  │
│  │  - Structured Output               │  │
│  └───────────────┬────────────────────┘  │
│                  │                        │
│  ┌───────────────▼────────────────────┐  │
│  │       Provider Interface           │  │
│  │  chat() / complete() / embed()     │  │
│  └───────┬──────┬──────┬──────┬──────┘  │
│          │      │      │      │          │
│    ┌─────▼─┐┌───▼──┐┌──▼───┐┌▼─────┐   │
│    │OpenAI ││Anthro││Gemini││Ollama│   │
│    │       ││ pic  ││      ││      │   │
│    └───────┘└──────┘└──────┘└──────┘   │
└──────────────────────────────────────────┘
```

### 安装配置

```bash
composer require laravel/ai
```

```php
// config/ai.php
return [
    'default' => env('AI_PROVIDER', 'openai'),

    'providers' => [
        'openai' => [
            'driver' => 'openai',
            'api_key' => env('OPENAI_API_KEY'),
            'model' => env('OPENAI_MODEL', 'gpt-4.1'),
            'max_tokens' => 4096,
            'temperature' => 0.7,
        ],

        'anthropic' => [
            'driver' => 'anthropic',
            'api_key' => env('ANTHROPIC_API_KEY'),
            'model' => env('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514'),
            'max_tokens' => 4096,
        ],

        'gemini' => [
            'driver' => 'gemini',
            'api_key' => env('GEMINI_API_KEY'),
            'model' => env('GEMINI_MODEL', 'gemini-2.5-pro'),
        ],
    ],
];
```

## 二、Chat 对话实战

### 基础对话

```php
use Laravel\AI\Chat\Message;
use Laravel\AI\Facades\AI;

// 简单对话
$response = AI::chat('解释 PHP 8.5 的 Pipe Operator 用法');

echo $response->content();
// "PHP 8.5 的管道操作符 |> 允许你将表达式的结果作为参数传递给下一个函数..."
```

### 多轮对话

```php
use Laravel\AI\Chat\ChatMessage;
use Laravel\AI\Chat\Role;

$messages = collect([
    ChatMessage::make(Role::System, '你是一个 Laravel 专家，回答简洁专业'),
    ChatMessage::make(Role::User, 'Laravel 13 的新特性有哪些？'),
]);

$response = AI::chat($messages);

// 追加回复，继续对话
$messages->push(ChatMessage::make(Role::Assistant, $response->content()));
$messages->push(ChatMessage::make(Role::User, 'AI SDK 支持哪些 Provider？'));

$followUp = AI::chat($messages);
```

### 系统提示词与参数控制

```php
$response = AI::withProvider('anthropic')
    ->withSystemPrompt(<<<'PROMPT'
        你是一个代码审查助手。对于提交的代码，你需要：
        1. 找出潜在的安全漏洞
        2. 检查性能问题
        3. 提出改进建议
        以 Markdown 格式输出。
    PROMPT)
    ->withOptions([
        'temperature' => 0.3,  // 低温度 = 更确定性输出
        'max_tokens' => 2048,
    ])
    ->chat($codeToReview);
```

## 三、Tool Calling：让 AI 调用你的代码

Tool Calling（工具调用）是 AI Agent 的核心能力——模型可以决定何时调用你的函数，并传入正确的参数。

### 定义工具

```php
use Laravel\AI\Tool;
use Laravel\AI\ToolParameter;

// 定义一个查询用户订单的工具
$getOrders = Tool::make('get_user_orders')
    ->description('查询指定用户的订单列表')
    ->addParameter(ToolParameter::make('user_id')
        ->type('integer')
        ->description('用户 ID')
        ->required()
    )
    ->addParameter(ToolParameter::make('status')
        ->type('string')
        ->description('订单状态筛选：pending/completed/cancelled')
        ->enum(['pending', 'completed', 'cancelled'])
    )
    ->using(function (array $args): array {
        $query = Order::where('user_id', $args['user_id']);

        if (isset($args['status'])) {
            $query->where('status', $args['status']);
        }

        return $query->latest()
            ->take(10)
            ->get(['id', 'total', 'status', 'created_at'])
            ->toArray();
    });

// 定义一个查库存的工具
$checkStock = Tool::make('check_stock')
    ->description('查询商品库存数量')
    ->addParameter(ToolParameter::make('sku')
        ->type('string')
        ->description('商品 SKU 编码')
        ->required()
    )
    ->using(function (array $args): array {
        $inventory = Inventory::where('sku', $args['sku'])->first();
        return $inventory
            ? ['sku' => $inventory->sku, 'quantity' => $inventory->quantity]
            : ['error' => 'SKU not found'];
    });
```

### 在对话中使用工具

```php
$response = AI::withTools([$getOrders, $checkStock])
    ->withSystemPrompt('你是电商客服助手，可以查询订单和库存信息。')
    ->chat('用户 12345 的待处理订单有哪些？SKU-001 还有货吗？');

// AI 会自动判断需要调用哪些工具
// 1. 调用 get_user_orders({user_id: 12345, status: "pending"})
// 2. 调用 check_stock({sku: "SKU-001"})
// 3. 综合结果回复用户
echo $response->content();
```

### 多步工具调用循环

```php
use Laravel\AI\Chat\ChatMessage;
use Laravel\AI\Chat\Role;

class AiAgentService
{
    private array $messages = [];
    private int $maxSteps = 5;

    public function __construct(
        private readonly array $tools,
    ) {}

    public function run(string $userInput): string
    {
        $this->messages[] = ChatMessage::make(Role::User, $userInput);

        for ($step = 0; $step < $this->maxSteps; $step++) {
            $response = AI::withTools($this->tools)
                ->chat(collect($this->messages));

            // 如果模型没有调用工具，返回最终回复
            if (!$response->hasToolCalls()) {
                return $response->content();
            }

            // 处理工具调用
            foreach ($response->toolCalls() as $toolCall) {
                $result = $this->executeTool($toolCall);

                $this->messages[] = ChatMessage::make(Role::Assistant, $toolCall);
                $this->messages[] = ChatMessage::toolResult($toolCall->id, $result);
            }
        }

        return '达到最大调用步骤限制，请重新描述你的需求。';
    }

    private function executeTool($toolCall): mixed
    {
        $tool = collect($this->tools)->first(
            fn($t) => $t->name() === $toolCall->name
        );

        if (!$tool) {
            return ['error' => "Unknown tool: {$toolCall->name}"];
        }

        try {
            return ($tool->handler())($toolCall->arguments);
        } catch (\Throwable $e) {
            return ['error' => $e->getMessage()];
        }
    }
}
```

## 四、Structured Output：结构化输出

当你需要 AI 返回特定格式的数据（而非自由文本），使用结构化输出：

```php
use Laravel\AI\StructuredOutput;

// 定义输出 Schema
$schema = StructuredOutput::make()
    ->addString('summary', '文章摘要，不超过 200 字')
    ->addArray('keywords', '关键词列表', 3, 5)
    ->addEnum('sentiment', '情感倾向', ['positive', 'neutral', 'negative'])
    ->addNumber('confidence', '置信度', 0, 1);

$response = AI::withStructuredOutput($schema)
    ->chat('分析以下文章的情感倾向和关键词：' . $article);

$result = $response->parsed();

// $result = [
//     'summary' => '这篇文章讨论了...',
//     'keywords' => ['Laravel', 'AI SDK', 'PHP'],
//     'sentiment' => 'positive',
//     'confidence' => 0.92,
// ]
```

### 与 Eloquent 模型结合

```php
// 定义 ArticleAnalysis 模型
class ArticleAnalysis extends Model
{
    protected $fillable = [
        'summary', 'keywords', 'sentiment', 'confidence',
    ];

    protected $casts = [
        'keywords' => 'array',
        'confidence' => 'float',
    ];
}

// 使用模型类作为 Schema
$response = AI::withStructuredOutput(ArticleAnalysis::class)
    ->chat('分析：' . $article);

$analysis = $response->toModel(ArticleAnalysis::class);
$analysis->article_id = $article->id;
$analysis->save();
```

## 五、流式输出（Streaming）

对于长文本生成，流式输出显著改善用户体验：

```php
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\StreamedResponse;

Route::get('/ai/stream', function () {
    return new StreamedResponse(function () {
        $stream = AI::withProvider('openai')
            ->withOptions(['max_tokens' => 2048])
            ->chatStream('写一篇关于 Laravel 13 AI SDK 的技术博客');

        foreach ($stream as $chunk) {
            // SSE 格式输出
            echo "data: " . json_encode([
                'content' => $chunk->content(),
                'done' => $chunk->isLast(),
            ]) . "\n\n";

            if (ob_get_level() > 0) {
                ob_flush();
            }
            flush();

            if ($chunk->isLast()) {
                break;
            }
        }

        echo "data: [DONE]\n\n";
    }, 200, [
        'Content-Type' => 'text/event-stream',
        'Cache-Control' => 'no-cache',
        'X-Accel-Buffering' => 'no',
    ]);
});
```

### 前端接收（Alpine.js）

```html
<div x-data="aiChat()">
    <div x-ref="messages" class="messages">
        <template x-for="msg in messages">
            <div :class="msg.role === 'user' ? 'user-msg' : 'ai-msg'">
                <span x-text="msg.content"></span>
            </div>
        </template>
        <div x-show="streaming" class="ai-msg">
            <span x-text="currentStream"></span>
            <span class="cursor">▊</span>
        </div>
    </div>

    <input x-model="input" @keydown.enter="send()" placeholder="输入消息..." />

    <script>
    function aiChat() {
        return {
            messages: [],
            input: '',
            currentStream: '',
            streaming: false,

            async send() {
                if (!this.input.trim()) return;

                this.messages.push({ role: 'user', content: this.input });
                const prompt = this.input;
                this.input = '';
                this.streaming = true;
                this.currentStream = '';

                const response = await fetch('/ai/stream?prompt=' + encodeURIComponent(prompt));
                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const text = decoder.decode(value);
                    const lines = text.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                            const data = JSON.parse(line.slice(6));
                            if (data.content) {
                                this.currentStream += data.content;
                            }
                            if (data.done) {
                                this.messages.push({ role: 'assistant', content: this.currentStream });
                                this.currentStream = '';
                                this.streaming = false;
                            }
                        }
                    }
                }
            }
        }
    }
    </script>
</div>
```

## 六、可中断任务（Interruptible Tasks）

Laravel 13.7 引入的**可中断任务**是 AI 工作流的关键基础设施——当 AI 生成耗时过长或用户取消操作时，需要安全地中断任务而不损坏数据。

### 基础用法

```php
use Laravel\Interruptible\InterruptibleTask;

// 创建可中断任务
$task = InterruptibleTask::define('ai-document-analysis')
    ->execute(function ($context) {
        $document = Document::find($context->document_id);
        $chunks = $document->chunkByParagraphs();

        $analysis = [];
        foreach ($chunks as $i => $chunk) {
            // 检查中断信号
            InterruptibleTask::checkInterruption();

            $result = AI::chat("分析以下段落：{$chunk}");
            $analysis[] = $result->content();

            // 更新进度
            $context->updateProgress(
                current: $i + 1,
                total: count($chunks),
            );
        }

        return $analysis;
    })
    ->onInterrupt(function ($context) {
        // 中断时的清理逻辑
        Log::info('Task interrupted', [
            'task' => 'ai-document-analysis',
            'document_id' => $context->document_id,
            'progress' => $context->progress,
        ]);

        // 保存已完成的部分结果
        if ($context->partialResult) {
            PartialAnalysis::create([
                'document_id' => $context->document_id,
                'result' => $context->partialResult,
                'status' => 'interrupted',
            ]);
        }
    })
    ->onTimeout(function ($context) {
        // 超时处理
        $context->markAsTimedOut();
    })
    ->timeout(300) // 5 分钟超时
    ->dispatch(['document_id' => $doc->id]);
```

### 与 AI Agent 循环结合

```php
class AiResearchAgent
{
    public function research(string $topic): ResearchReport
    {
        return InterruptibleTask::define('ai-research')
            ->execute(function ($context) use ($topic) {
                $findings = [];
                $maxIterations = 10;

                for ($i = 0; $i < $maxIterations; $i++) {
                    // 每次迭代都检查中断
                    InterruptibleTask::checkInterruption();

                    // AI 分析一步
                    $step = AI::withTools($this->researchTools())
                        ->withSystemPrompt($this->systemPrompt())
                        ->chat($this->buildPrompt($topic, $findings));

                    $findings[] = $step->content();
                    $context->updateProgress($i + 1, $maxIterations);

                    // 判断是否完成
                    if ($this->isResearchComplete($step)) {
                        break;
                    }
                }

                // 生成最终报告
                return $this->compileReport($topic, $findings);
            })
            ->onInterrupt(function ($context) {
                // 保存部分研究结果
                Cache::put(
                    "research:partial:{$context->id}",
                    $context->partialResult,
                    now()->addHours(24),
                );
            })
            ->timeout(600)
            ->run(['topic' => $topic]);
    }
}
```

### 用户触发中断

```php
// 前端发送中断请求
Route::post('/tasks/{task}/interrupt', function (InterruptibleTask $task) {
    $task->interrupt();

    return response()->json([
        'message' => '中断信号已发送',
        'task_id' => $task->id,
        'status' => 'interrupting',
    ]);
});
```

## 七、Embeddings 与语义搜索

### 生成向量嵌入

```php
use Laravel\AI\Facades\AI;

// 单文本嵌入
$embedding = AI::embed('Laravel 13 引入了官方 AI SDK');
// $embedding->vector() = [0.0023, -0.0145, 0.0089, ...]  (1536 维)

// 批量嵌入
$embeddings = AI::embedBatch([
    'Laravel 13 引入了官方 AI SDK',
    'PHP 8.5 新增管道操作符',
    'Interruptible Tasks 支持安全中断',
]);
```

### 与数据库集成实现语义搜索

```php
// Migration：添加向量列
Schema::table('articles', function (Blueprint $table) {
    $table->vector('embedding', 1536)->nullable();
});

// 模型中自动生成嵌入
class Article extends Model
{
    protected $fillable = ['title', 'content', 'embedding'];

    protected static function booted(): void
    {
        static::saved(function (Article $article) {
            if ($article->isDirty('content')) {
                $article->embedding = AI::embed($article->content)->vector();
                $article->saveQuietly();
            }
        });
    }

    // 语义搜索
    public function scopeSemanticSearch($query, string $search, int $limit = 10)
    {
        $queryVector = AI::embed($search)->vector();

        return $query->selectRaw("
            *,
            embedding <=> ? AS distance
        ", [json_encode($queryVector)])
            ->orderBy('distance')
            ->limit($limit);
    }
}

// 使用
$articles = Article::semanticSearch('Laravel AI 开发', 5)->get();
```

> **注意**：向量搜索需要 PostgreSQL + `pgvector` 扩展或 MySQL 9.0+ 原生向量支持。

## 八、PHP 8.5 Pipe Operator 与 AI 链式调用

PHP 8.5 引入的管道操作符 `|>` 与 Laravel AI SDK 天然契合：

```php
// 传统写法
$result = AI::chat(
    AI::withTools($tools,
        AI::withSystemPrompt($prompt,
            AI::withProvider('anthropic')
        )
    )
);

// PHP 8.5 Pipe Operator
$result = AI::withProvider('anthropic')
    |> AI::withSystemPrompt($prompt, ...)
    |> AI::withTools($tools, ...)
    |> AI::chat('分析这段代码');

// 更实用的 AI 管道
$analysis = $articleText
    |> fn($text) => AI::withProvider('openai')->chat("提取关键词：{$text}")
    |> fn($response) => json_decode($response->content(), true)
    |> fn($keywords) => collect($keywords)
        ->map(fn($kw) => Keyword::firstOrCreate(['name' => $kw]))
        ->pluck('id')
        ->toArray();
```

### 自定义 AI 管道操作

```php
// 定义管道操作
function withProvider(string $provider) {
    return fn($input) => AI::withProvider($provider)->chat($input);
}

function extractJson() {
    return fn($response) => json_decode($response->content(), true);
}

function validateSchema(array $schema) {
    return fn($data) => validator($data, $schema)->validate();
}

// 使用管道组合
$result = $userQuery
    |> withProvider('anthropic')
    |> extractJson()
    |> validateSchema([
        'answer' => 'required|string',
        'confidence' => 'required|numeric|min:0|max:1',
        'sources' => 'required|array',
    ]);
```

## 九、生产级 AI 服务封装

```php
namespace App\Services\AI;

use Laravel\AI\Facades\AI;
use Laravel\AI\Tool;
use Laravel\Interruptible\InterruptibleTask;

class AiAssistantService
{
    public function __construct(
        private readonly array $tools = [],
        private readonly string $provider = 'openai',
        private readonly int $maxTokens = 4096,
        private readonly float $temperature = 0.7,
    ) {}

    public function chat(string $message, ?string $systemPrompt = null): AiResponse
    {
        $startTime = microtime(true);

        try {
            $builder = AI::withProvider($this->provider)
                ->withOptions([
                    'max_tokens' => $this->maxTokens,
                    'temperature' => $this->temperature,
                ]);

            if ($systemPrompt) {
                $builder = $builder->withSystemPrompt($systemPrompt);
            }

            if (!empty($this->tools)) {
                $builder = $builder->withTools($this->tools);
            }

            $response = $builder->chat($message);

            // 记录使用日志
            AiUsageLog::create([
                'provider' => $this->provider,
                'model' => $response->model(),
                'input_tokens' => $response->usage()->inputTokens,
                'output_tokens' => $response->usage()->outputTokens,
                'latency_ms' => (microtime(true) - $startTime) * 1000,
                'tool_calls' => $response->toolCalls()?->count() ?? 0,
            ]);

            return new AiResponse(
                content: $response->content(),
                model: $response->model(),
                tokens: $response->usage()->totalTokens,
                latencyMs: (microtime(true) - $startTime) * 1000,
            );
        } catch (\Throwable $e) {
            Log::error('AI chat failed', [
                'provider' => $this->provider,
                'error' => $e->getMessage(),
            ]);

            // Fallback 到备用 Provider
            if ($this->provider !== 'anthropic') {
                return (new self($this->tools, 'anthropic'))
                    ->chat($message, $systemPrompt);
            }

            throw new AiServiceException('AI 服务暂时不可用', 0, $e);
        }
    }
}

// 依赖注入使用
class ChatController extends Controller
{
    public function __construct(
        private readonly AiAssistantService $ai,
    ) {}

    public function __invoke(Request $request)
    {
        $request->validate([
            'message' => 'required|string|max:4096',
        ]);

        $response = $this->ai->chat(
            message: $request->input('message'),
            systemPrompt: '你是 Laravel 技术顾问',
        );

        return response()->json([
            'content' => $response->content,
            'model' => $response->model,
            'tokens' => $response->tokens,
        ]);
    }
}
```

## 十、测试策略

### Mock AI 响应

```php
use Laravel\AI\Testing\AiFake;

class AiServiceTest extends TestCase
{
    public function test_chat_returns_expected_response(): void
    {
        $fake = new AiFake();
        $fake->addResponse('Laravel 13 的 AI SDK 支持 OpenAI、Anthropic 和 Gemini 三个 Provider。');

        $this->app->instance('ai', $fake);

        $response = AI::chat('Laravel 13 AI SDK 支持哪些 Provider？');

        $this->assertStringContainsString('OpenAI', $response->content());
    }

    public function test_tool_calling_executes_handler(): void
    {
        $fake = new AiFake();
        $fake->shouldCallTool('get_user_orders', ['user_id' => 1]);

        $tool = Tool::make('get_user_orders')
            ->description('获取用户订单')
            ->addParameter(ToolParameter::make('user_id')->type('integer')->required())
            ->using(fn($args) => [['id' => 1, 'total' => 99.99]]);

        $response = $fake->withTools([$tool])->chat('查询用户1的订单');

        $fake->assertToolCalled('get_user_orders');
        $fake->assertToolCalledWith('get_user_orders', ['user_id' => 1]);
    }

    public function test_interruptible_task_handles_cancellation(): void
    {
        InterruptibleTask::fake();

        $task = InterruptibleTask::define('test-task')
            ->execute(fn() => 'result')
            ->onInterrupt(fn() => true)
            ->dispatch([]);

        InterruptibleTask::interrupt($task->id);

        $this->assertTrue($task->wasInterrupted());
    }
}
```

## 参考资料

- [Laravel 13 Release Notes](https://laravel.com/docs/13.x/releases)
- [Laravel AI SDK Documentation](https://laravel.com/docs/13.x/ai)
- [Laravel 13.7 Interruptible Tasks](https://laravel.com/docs/13.x/interruptible-tasks)
- [PHP 8.5 Pipe Operator RFC](https://wiki.php.net/rfc/pipe-operator)
- [Laravel AI SDK GitHub](https://github.com/laravel/ai)
- [Laravel Octane + FrankenPHP](https://laravel.com/docs/13.x/octane)

---

**总结**：Laravel 13 AI SDK 的发布标志着 PHP 生态正式迈入 AI 时代。统一的 Provider 接口让切换模型只需一行配置，Tool Calling 让 AI 能调用你的业务代码，Structured Output 确保输出格式可控，可中断任务保障了长时间 AI 工作流的安全性。配合 PHP 8.5 的 Pipe Operator，Laravel 开发者可以用最熟悉的语言构建生产级 AI 应用。
