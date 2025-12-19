---
title: 让本地大模型像 OpenAI 一样支持 Function Calling PHP 异步实现实战
date: 2025-11-19 15:30:00
author: PFinal南丞
tags:
    - php
    - AI
    - Function Calling
    - 异步编程
    - 大语言模型
    - Qwen3
    - Deepseek
    - GLM4
keywords: PHP异步编程, Function Calling, Tool Calls, pfinal-asyncio, Qwen3, Deepseek, GLM4, OpenAI兼容, AI Agent, 本地大模型, PHP协程, 异步并发, Ollama, 工具调用, PHP AI开发
description: 实战教程：如何让本地运行的 Qwen3、Deepseek-Coder-V3、GLM4-Chat 等模型像 OpenAI GPT-4 一样支持原生 Function Calling。通过 pfinal-asyncio 异步框架实现完全兼容 OpenAI 接口规范的工具调用，并发执行性能提升 200%-500%，零 API 费用，数据完全本地化。
---

# 让本地大模型像 OpenAI 一样支持 Function Calling：PHP 异步实现实战

> **核心价值**：让本地运行的 **Qwen3、Deepseek-Coder-V3、GLM4-Chat** 等模型，像 OpenAI GPT-4 一样支持原生的 **Function Calling / Tool Calls** 能力。通过 `pfinal-asyncio` 异步框架，实现完全兼容 OpenAI 接口规范的工具调用，并发执行性能提升 200%-500%，**零 API 费用，数据完全本地化**。

---

## 为什么需要本地模型的 Function Calling？

OpenAI 的 GPT-4 原生支持 Function Calling，你只需要在 API 请求中传入 `tools` 参数，模型就能自动识别何时调用工具、如何解析参数。但对于很多场景来说，使用 OpenAI API 存在以下问题：

- 💰 **成本问题**：API 调用费用不菲，高频使用成本高
- 🔒 **数据隐私**：敏感数据需要上传到云端，存在泄露风险
- 🌐 **网络依赖**：需要稳定的网络连接，离线场景无法使用
- ⚡ **响应延迟**：网络往返增加延迟，影响用户体验

**本地模型的优势**：
- ✅ **零成本**：完全本地运行，无 API 费用
- ✅ **数据安全**：数据不出本地，隐私完全可控
- ✅ **离线可用**：无需网络连接，随时随地可用
- ✅ **低延迟**：本地推理，响应速度快

但问题是：本地模型（如 Qwen3、Deepseek、GLM4）虽然能力很强，却不一定完全兼容 OpenAI 的 Function Calling 协议。

**好消息是**：通过 Ollama 这类本地部署工具，配合正确的协议实现，我们可以让这些本地模型**完全像 OpenAI 一样工作**。这就是本文要解决的问题。

---

## Function Calling 工作原理

Function Calling 的核心流程是：
1. 你定义一组工具（Tools Definition），用 JSON Schema 描述每个工具的功能和参数
2. 模型在推理时判断是否需要调用工具，如果需要，返回结构化的 `tool_calls` 数组
3. 你的代码执行这些工具调用（这里是性能优化的关键点）
4. 把执行结果回传给模型
5. 模型基于工具结果生成最终答案

听起来简单，但有两个技术难点：
1. **协议兼容性**：如何让本地模型理解并返回符合 OpenAI 规范的 `tool_calls`
2. **性能优化**：如何高效并发执行多个工具调用

---

## 为什么需要异步？

当模型一次性要调用多个工具时，传统的 PHP 同步模式会串行执行：

```php
// 传统同步模式
$weather1 = get_weather('北京');  // 等待 1 秒
$weather2 = get_weather('上海');  // 再等 1 秒  
$price = get_stock('600519');     // 再等 1 秒
// 总共 3 秒！
```

这三个请求明明可以同时发出去，为什么要排队？这就是异步的价值。用 `pfinal-asyncio` 之后：

```php
// 异步并发模式
$results = gather(
    async(fn() => get_weather('北京')),
    async(fn() => get_weather('上海')),
    async(fn() => get_stock('600519'))
);
// 总共 1 秒（取决于最慢的那个）
```

性能提升很明显，特别是工具数量多的时候。但更重要的是，**异步执行让整个 Function Calling 流程更加高效，接近 OpenAI 的体验**。

---

## 环境准备

先说下技术栈：

*   PHP 8.1+（需要 Fiber 支持）
*   `pfinal/asyncio`（PHP 的异步协程库，类似 Node.js 的 Promise）
*   Ollama（本地部署大模型，兼容 OpenAI API 格式）

安装依赖：
```bash
composer require pfinal/asyncio
```

然后确保 Ollama 在本地运行，并下载支持 Function Calling 的模型：
```bash
ollama serve

# 支持的模型（任选其一或多个）
ollama pull qwen3:32b          # 通义千问
ollama pull deepseek-coder-v3     # Deepseek 代码模型
ollama pull glm-4-chat            # GLM4 对话模型
```

**重要提示**：这些模型通过 Ollama 部署后，都支持 OpenAI 兼容的 Function Calling 接口。你只需要在请求中传入 `tools` 参数，模型就能像 GPT-4 一样返回 `tool_calls`。

---

## 核心实现

### 第一步：定义工具 Schema（OpenAI 兼容格式）

要让本地模型像 OpenAI 一样工作，第一步就是定义工具。这里**必须严格按照 OpenAI 的 JSON Schema 格式**来写，因为 Qwen3、Deepseek、GLM4 这些模型都是按照这个标准来理解工具的。

```php
use PfinalClub\Asyncio\Http\AsyncHttpClient;
use function PfinalClub\Asyncio\{run, async, await, gather};

// 工具定义（必须符合 OpenAI 规范）
const TOOLS_SCHEMA = [
    [
        "type" => "function",
        "function" => [
            "name" => "get_weather_metrics",
            "description" => "获取指定城市的天气信息（温度、天气状况）",
            "parameters" => [
                "type" => "object",
                "properties" => [
                    "location" => [
                        "type" => "string", 
                        "description" => "城市名称，如：北京、上海"
                    ]
                ],
                "required" => ["location"]
            ]
        ]
    ],
    [
        "type" => "function",
        "function" => [
            "name" => "fetch_market_data",
            "description" => "获取股票或加密货币的实时价格",
            "parameters" => [
                "type" => "object",
                "properties" => [
                    "symbol" => [
                        "type" => "string", 
                        "description" => "交易代码，如：600519.SH 或 BTC-USDT"
                    ],
                    "region" => [
                        "type" => "string", 
                        "enum" => ["CN", "US", "HK", "CRYPTO"],
                        "description" => "市场区域，默认 CN"
                    ]
                ],
                "required" => ["symbol"]
            ]
        ]
    ]
];
```

这里有个小技巧：`description` 字段一定要写清楚，模型就是靠这个来判断什么时候调用哪个工具的。我一开始写得比较模糊，结果模型经常调用错工具。

### 第二步：实现业务函数

这些就是真正干活的函数了。在实际项目中，这里应该是真实的 API 调用或数据库查询。

```php
/**
 * 获取天气数据（模拟）
 */
function get_weather_metrics(string $location): string {
    // 实际项目中这里应该是异步 HTTP 请求
    // $http = new AsyncHttpClient();
    // $response = await($http->get("https://api.weather.com/..."));
    
    // 模拟返回
    return json_encode([
        'location' => $location,
        'temperature' => 22.5,
        'condition' => '多云',
        'timestamp' => time()
    ], JSON_UNESCAPED_UNICODE);
}

/**
 * 获取行情数据（模拟）
 */
function fetch_market_data(string $symbol, string $region = 'CN'): string {
    $price = mt_rand(10000, 50000) / 100;
    return json_encode([
        'symbol' => $symbol,
        'region' => $region,
        'price' => $price,
        'currency' => $region === 'US' ? 'USD' : 'CNY'
    ], JSON_UNESCAPED_UNICODE);
}
```

### 第三步：核心调度器（重点）

这是最关键的部分。当模型返回 `tool_calls` 数组时，我们需要：
1. 解析每个工具调用的参数
2. 把它们包装成异步任务
3. 并发执行
4. 等待所有结果

```php
/**
 * 并发执行工具调用
 * 
 * @param array $toolCalls 模型返回的 tool_calls
 * @return array 执行结果，顺序与输入一致
 */
function dispatch_tool_calls(array $toolCalls): array {
    $tasks = [];
    
    echo "检测到 " . count($toolCalls) . " 个工具调用，开始并发执行...\n";

    foreach ($toolCalls as $call) {
        $functionName = $call['function']['name'];
        $arguments = json_decode($call['function']['arguments'], true);

        // JSON 解析失败的处理
        if (json_last_error() !== JSON_ERROR_NONE) {
            $tasks[] = async(fn() => json_encode(['error' => '参数解析失败']));
            continue;
        }

        // 把每个工具调用包装成异步任务
        $tasks[] = async(function() use ($functionName, $arguments) {
            try {
                return match ($functionName) {
                    'get_weather_metrics' => get_weather_metrics($arguments['location'] ?? ''),
                    'fetch_market_data'   => fetch_market_data(
                        $arguments['symbol'] ?? '', 
                        $arguments['region'] ?? 'CN'
                    ),
                    default => json_encode(['error' => "工具 {$functionName} 未实现"])
                };
            } catch (\Throwable $e) {
                // 单个工具失败不应该影响其他工具
                return json_encode(['error' => $e->getMessage()]);
            }
        });
    }

    // gather 会等待所有任务完成，类似 Promise.all
    return gather(...$tasks);
}
```

这里用了 PHP 8 的 `match` 表达式，比 `switch` 简洁很多。另外，每个任务都包了 `try-catch`，这样即使某个工具挂了，其他工具还能正常执行。

### 第四步：完整流程

最后，把所有环节串起来。整个流程是这样的：

1. 用户提问 → 发送给模型
2. 模型分析 → 返回 `tool_calls`
3. 并发执行工具 → 获取结果
4. 把结果塞回对话历史 → 再次请求模型
5. 模型生成最终答案

```php
run(function() {
    $httpClient = new AsyncHttpClient(['timeout' => 60]);
    $apiUrl = "http://localhost:11434/api/chat";
    // 支持的模型：qwen2.5:32b、deepseek-coder-v3、glm-4-chat
    // 所有模型都通过 OpenAI 兼容接口支持 Function Calling
    $modelName = "qwen2.5:32b";

    // 初始化对话
    $messages = [
        ["role" => "system", "content" => "你是一个有用的助手，可以使用工具获取实时数据。"],
        ["role" => "user",   "content" => "帮我查一下茅台(600519.SH)的股价，还有北京现在的天气怎么样？"]
    ];

    echo "正在请求模型（使用 OpenAI 兼容接口）...\n";
    
    // 第一轮：让模型决定调用哪些工具
    // 关键：传入 tools 参数，本地模型（Qwen3/Deepseek/GLM4）会像 GPT-4 一样返回 tool_calls
    $response = $httpClient->post($apiUrl, [
        'Content-Type' => 'application/json'
    ], json_encode([
        "model" => $modelName,  // 可以是 qwen2.5:32b、deepseek-coder-v3 或 glm-4-chat
        "messages" => $messages,
        "tools" => TOOLS_SCHEMA,  // OpenAI 标准格式的工具定义
        "stream" => false,
        "options" => ["temperature" => 0.1] // 降低随机性，提高工具调用的稳定性
    ]));

    $result = $response->json();
    $message = $result['message'] ?? [];
    $toolCalls = $message['tool_calls'] ?? null;

    // 如果模型不调用工具，直接返回
    if (empty($toolCalls)) {
        echo "模型回复：" . ($message['content'] ?? '无内容') . "\n";
        return;
    }

    // 第二轮：并发执行工具
    // 注意：必须先把模型的 assistant 消息加入历史，这是协议要求的
    $messages[] = $message;
    
    $toolOutputs = dispatch_tool_calls($toolCalls);

    // 第三轮：把工具结果塞回对话历史
    foreach ($toolCalls as $index => $call) {
        $messages[] = [
            "role" => "tool",
            "tool_call_id" => $call['id'], // 这个 ID 很重要，模型靠它关联结果
            "name" => $call['function']['name'],
            "content" => $toolOutputs[$index]
        ];
    }

    // 第四轮：获取最终答案
    echo "正在生成最终回复...\n";
    
    $finalResponse = $httpClient->post($apiUrl, [
        'Content-Type' => 'application/json'
    ], json_encode([
        "model" => $modelName,
        "messages" => $messages,
        "stream" => false
    ]));

    $finalContent = $finalResponse->json()['message']['content'] ?? '';
    
    echo "\n" . str_repeat('-', 50) . "\n";
    echo "最终答案：\n" . trim($finalContent) . "\n";
    echo str_repeat('-', 50) . "\n";
});
```

有几个关键点需要注意：

1. **`tool_call_id` 必须正确**：模型返回的每个 `tool_calls` 都有一个 `id`，你在回传结果时必须用这个 `id`，不然模型不知道哪个结果对应哪个调用。
2. **消息顺序很重要**：必须先加 `assistant` 消息（包含 `tool_calls`），再加 `tool` 消息（包含结果）。
3. **temperature 调低**：工具调用场景下，建议把 `temperature` 设低一点（比如 0.1），这样模型更倾向于稳定地调用工具，而不是随机发挥。

---

## 性能对比

我在实际项目中测试过，当模型需要调用 3-5 个工具时：

*   **同步模式**：总耗时 = 所有工具耗时之和（比如 3 秒）
*   **异步模式**：总耗时 ≈ 最慢的那个工具（比如 1 秒）

性能提升在 200%-500% 之间，工具越多，提升越明显。

另外，错误隔离也很重要。如果某个工具挂了（比如 API 超时），其他工具还能正常执行，不会导致整个请求失败。

---

## 踩坑经验

1. **Schema 格式要严格**：JSON Schema 写错了，模型可能理解不了，或者调用参数不对。建议先用 OpenAI 的在线工具验证一下。
2. **ID 关联要准确**：`tool_call_id` 如果对不上，模型会混乱，可能返回错误的结果。
3. **异步函数要纯函数**：`async()` 里包的函数最好是无副作用的，或者副作用可控的，不然调试起来很麻烦。
4. **超时设置**：如果工具调用涉及外部 API，记得设置合理的超时时间，避免整个请求卡死。

---

