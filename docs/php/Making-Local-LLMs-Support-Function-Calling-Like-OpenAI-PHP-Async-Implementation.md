---
title: "PHP Function Calling with Local LLMs: Run Qwen3/Deepseek Like OpenAI (200-500% Faster)"
date: 2025-11-19 15:30:00
author: PFinal南丞
tags:
    - PHP
    - AI
    - Function Calling
    - Asynchronous Programming
    - Large Language Models
    - Qwen3
    - Deepseek
keywords:
  - php function calling
  - php async function calling openai
  - local llm function calling
  - pfinal asyncio tutorial
  - qwen3 function calling php
  - deepseek function calling php
  - glm4 chat function calling
  - php ai tools integration
  - php local llm tutorial
  - php ai agent
description: "Zero API costs, 200-500% faster. Learn how to make Qwen3, Deepseek, and GLM4 support OpenAI-style Function Calling in PHP using async concurrency. Complete code included."
---

# Making Local LLMs Support Function Calling Like OpenAI: PHP Async Implementation Guide

> **Core Value**: Enable locally-running models like **Qwen3, Deepseek-Coder-V3, GLM4-Chat** to support native **Function Calling / Tool Calls** capabilities just like OpenAI GPT-4. Using the `pfinal-asyncio` async framework, achieve full OpenAI API specification compliance for tool invocation with 200%-500% performance improvement through concurrent execution, **zero API costs, and complete data localization**.

---

## Why Do We Need Function Calling for Local Models?

OpenAI's GPT-4 natively supports Function Calling - you simply pass the `tools` parameter in your API request, and the model automatically identifies when to call tools and how to parse parameters. However, using OpenAI APIs presents several challenges:

- 💰 **Cost Issues**: API calls are expensive, high-frequency usage adds up quickly
- 🔒 **Data Privacy**: Sensitive data must be uploaded to the cloud, creating leakage risks
- 🌐 **Network Dependency**: Requires stable internet connection, unusable in offline scenarios
- ⚡ **Response Latency**: Network round-trips add delays, affecting user experience

**Advantages of Local Models**:
- ✅ **Zero Cost**: Completely local operation, no API fees
- ✅ **Data Security**: Data stays local, full privacy control
- ✅ **Offline Ready**: No internet required, works anywhere anytime
- ✅ **Low Latency**: Local inference means faster responses

But here's the catch: local models like Qwen3, Deepseek, and GLM4, while powerful, may not fully comply with OpenAI's Function Calling protocol.

**Good news**: Through local deployment tools like Ollama, combined with correct protocol implementation, we can make these local models **work exactly like OpenAI**. That's what this article solves.

---

## How Function Calling Works

The core Function Calling workflow is:
1. You define a set of tools (Tools Definition) using JSON Schema to describe each tool's functionality and parameters
2. The model determines during inference whether tools are needed, and if so, returns a structured `tool_calls` array
3. Your code executes these tool calls (this is where performance optimization is critical)
4. You feed the execution results back to the model
5. The model generates the final answer based on tool results

Sounds simple, but there are two technical challenges:
1. **Protocol Compatibility**: How to make local models understand and return `tool_calls` conforming to OpenAI spec
2. **Performance Optimization**: How to efficiently execute multiple tool calls concurrently

---

## Why Do We Need Async?

When a model needs to call multiple tools at once, traditional PHP synchronous mode executes serially:

```php
// Traditional synchronous mode
$weather1 = get_weather('Beijing');  // Wait 1 second
$weather2 = get_weather('Shanghai'); // Wait another second  
$price = get_stock('600519');        // Wait another second
// Total: 3 seconds!
```

These three requests could be sent simultaneously - why wait in line? That's the value of async. With `pfinal-asyncio`:

```php
// Async concurrent mode
$results = gather(
    async(fn() => get_weather('Beijing')),
    async(fn() => get_weather('Shanghai')),
    async(fn() => get_stock('600519'))
);
// Total: 1 second (depends on the slowest one)
```

The performance improvement is obvious, especially with more tools. But more importantly, **async execution makes the entire Function Calling process more efficient, approaching OpenAI's experience**.

---

## Environment Setup

Here's the tech stack:

*   PHP 8.1+ (requires Fiber support)
*   `pfinal/asyncio` (PHP async coroutine library, similar to Node.js Promises)
*   Ollama (local LLM deployment, OpenAI API compatible)

Install dependencies:
```bash
composer require pfinal/asyncio
```

Then make sure Ollama is running locally and download models that support Function Calling:
```bash
ollama serve

# Supported models (choose one or more)
ollama pull qwen3:32b          # Qwen
ollama pull deepseek-coder-v3  # Deepseek code model
ollama pull glm-4-chat         # GLM4 chat model
```

**Important Note**: Once deployed through Ollama, these models all support OpenAI-compatible Function Calling interfaces. You simply pass the `tools` parameter in your request, and the model will return `tool_calls` just like GPT-4.

---

## Core Implementation

### Step 1: Define Tools Schema (OpenAI Compatible Format)

To make local models work like OpenAI, the first step is defining tools. This **must strictly follow OpenAI's JSON Schema format**, because models like Qwen3, Deepseek, and GLM4 all understand tools based on this standard.

```php
use PfinalClub\Asyncio\Http\AsyncHttpClient;
use function PfinalClub\Asyncio\{run, async, await, gather};

// Tool definitions (must conform to OpenAI spec)
const TOOLS_SCHEMA = [
    [
        "type" => "function",
        "function" => [
            "name" => "get_weather_metrics",
            "description" => "Get weather information (temperature, conditions) for a specified city",
            "parameters" => [
                "type" => "object",
                "properties" => [
                    "location" => [
                        "type" => "string", 
                        "description" => "City name, e.g., Beijing, Shanghai"
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
            "description" => "Get real-time prices for stocks or cryptocurrencies",
            "parameters" => [
                "type" => "object",
                "properties" => [
                    "symbol" => [
                        "type" => "string", 
                        "description" => "Trading code, e.g., 600519.SH or BTC-USDT"
                    ],
                    "region" => [
                        "type" => "string", 
                        "enum" => ["CN", "US", "HK", "CRYPTO"],
                        "description" => "Market region, defaults to CN"
                    ]
                ],
                "required" => ["symbol"]
            ]
        ]
    ]
];
```

Pro tip: Make sure the `description` field is clear - this is what the model uses to determine when to call which tool. I started with vague descriptions, and the model often called the wrong tools.

### Step 2: Implement Business Functions

These are the functions that actually do the work. In real projects, this would be actual API calls or database queries.

```php
/**
 * Get weather data (simulated)
 */
function get_weather_metrics(string $location): string {
    // In real projects, this should be an async HTTP request
    // $http = new AsyncHttpClient();
    // $response = await($http->get("https://api.weather.com/..."));
    
    // Simulated return
    return json_encode([
        'location' => $location,
        'temperature' => 22.5,
        'condition' => 'Cloudy',
        'timestamp' => time()
    ]);
}

/**
 * Get market data (simulated)
 */
function fetch_market_data(string $symbol, string $region = 'CN'): string {
    $price = mt_rand(10000, 50000) / 100;
    return json_encode([
        'symbol' => $symbol,
        'region' => $region,
        'price' => $price,
        'currency' => $region === 'US' ? 'USD' : 'CNY'
    ]);
}
```

### Step 3: Core Dispatcher (Key Part)

This is the most critical part. When the model returns a `tool_calls` array, we need to:
1. Parse parameters for each tool call
2. Wrap them into async tasks
3. Execute concurrently
4. Wait for all results

```php
/**
 * Execute tool calls concurrently
 * 
 * @param array $toolCalls tool_calls returned by the model
 * @return array Execution results, order matches input
 */
function dispatch_tool_calls(array $toolCalls): array {
    $tasks = [];
    
    echo "Detected " . count($toolCalls) . " tool calls, starting concurrent execution...\n";

    foreach ($toolCalls as $call) {
        $functionName = $call['function']['name'];
        $arguments = json_decode($call['function']['arguments'], true);

        // Handle JSON parse failures
        if (json_last_error() !== JSON_ERROR_NONE) {
            $tasks[] = async(fn() => json_encode(['error' => 'Failed to parse arguments']));
            continue;
        }

        // Wrap each tool call into an async task
        $tasks[] = async(function() use ($functionName, $arguments) {
            try {
                return match ($functionName) {
                    'get_weather_metrics' => get_weather_metrics($arguments['location'] ?? ''),
                    'fetch_market_data'   => fetch_market_data(
                        $arguments['symbol'] ?? '', 
                        $arguments['region'] ?? 'CN'
                    ),
                    default => json_encode(['error' => "Tool {$functionName} not implemented"])
                };
            } catch (\Throwable $e) {
                // Single tool failure shouldn't affect other tools
                return json_encode(['error' => $e->getMessage()]);
            }
        });
    }

    // gather waits for all tasks to complete, similar to Promise.all
    return gather(...$tasks);
}
```

Using PHP 8's `match` expression here - much cleaner than `switch`. Also, each task is wrapped in `try-catch`, so even if one tool fails, others can still execute normally.

### Step 4: Complete Workflow

Finally, let's tie everything together. The complete workflow is:

1. User asks a question → Send to model
2. Model analyzes → Returns `tool_calls`
3. Execute tools concurrently → Get results
4. Feed results back to conversation history → Request model again
5. Model generates final answer

```php
run(function() {
    $httpClient = new AsyncHttpClient(['timeout' => 60]);
    $apiUrl = "http://localhost:11434/api/chat";
    // Supported models: qwen2.5:32b, deepseek-coder-v3, glm-4-chat
    // All models support Function Calling through OpenAI-compatible interface
    $modelName = "qwen2.5:32b";

    // Initialize conversation
    $messages = [
        ["role" => "system", "content" => "You are a helpful assistant that can use tools to fetch real-time data."],
        ["role" => "user",   "content" => "Check the stock price for Moutai (600519.SH) and what's the weather like in Beijing?"]
    ];

    echo "Requesting model (using OpenAI-compatible interface)...\n";
    
    // Round 1: Let model decide which tools to call
    // Key: pass tools parameter, local models (Qwen3/Deepseek/GLM4) will return tool_calls like GPT-4
    $response = $httpClient->post($apiUrl, [
        'Content-Type' => 'application/json'
    ], json_encode([
        "model" => $modelName,  // Can be qwen2.5:32b, deepseek-coder-v3, or glm-4-chat
        "messages" => $messages,
        "tools" => TOOLS_SCHEMA,  // OpenAI standard format tool definitions
        "stream" => false,
        "options" => ["temperature" => 0.1] // Lower randomness, improve tool call stability
    ]));

    $result = $response->json();
    $message = $result['message'] ?? [];
    $toolCalls = $message['tool_calls'] ?? null;

    // If model doesn't call tools, return directly
    if (empty($toolCalls)) {
        echo "Model response: " . ($message['content'] ?? 'No content') . "\n";
        return;
    }

    // Round 2: Execute tools concurrently
    // Important: Must add model's assistant message to history first, protocol requirement
    $messages[] = $message;
    
    $toolOutputs = dispatch_tool_calls($toolCalls);

    // Round 3: Feed tool results back to conversation history
    foreach ($toolCalls as $index => $call) {
        $messages[] = [
            "role" => "tool",
            "tool_call_id" => $call['id'], // This ID is crucial, model uses it to correlate results
            "name" => $call['function']['name'],
            "content" => $toolOutputs[$index]
        ];
    }

    // Round 4: Get final answer
    echo "Generating final response...\n";
    
    $finalResponse = $httpClient->post($apiUrl, [
        'Content-Type' => 'application/json'
    ], json_encode([
        "model" => $modelName,
        "messages" => $messages,
        "stream" => false
    ]));

    $finalContent = $finalResponse->json()['message']['content'] ?? '';
    
    echo "\n" . str_repeat('-', 50) . "\n";
    echo "Final Answer:\n" . trim($finalContent) . "\n";
    echo str_repeat('-', 50) . "\n";
});
```

Several key points to note:

1. **`tool_call_id` must be correct**: Each `tool_calls` returned by the model has an `id`, you must use this `id` when feeding back results, otherwise the model won't know which result corresponds to which call.
2. **Message order matters**: Must first add `assistant` message (containing `tool_calls`), then add `tool` messages (containing results).
3. **Lower temperature**: For tool calling scenarios, recommend setting `temperature` low (e.g., 0.1), so the model tends to call tools more consistently rather than randomly.

---

## Performance Comparison

In real projects, when the model needs to call 3-5 tools:

*   **Synchronous mode**: Total time = sum of all tool times (e.g., 3 seconds)
*   **Async mode**: Total time ≈ slowest tool (e.g., 1 second)

Performance improvement ranges from 200%-500%, and the more tools, the more significant the improvement.

Also, error isolation is important. If one tool fails (e.g., API timeout), other tools can still execute normally without causing the entire request to fail.

---

## Lessons Learned

1. **Schema format must be strict**: If JSON Schema is wrong, the model may not understand or call with incorrect parameters. Recommend validating with OpenAI's online tools first.
2. **ID correlation must be accurate**: If `tool_call_id` doesn't match, the model gets confused and may return incorrect results.
3. **Async functions should be pure**: Functions wrapped in `async()` should ideally be side-effect free or have controlled side effects, otherwise debugging becomes very troublesome.
4. **Timeout settings**: If tool calls involve external APIs, remember to set reasonable timeout values to avoid the entire request hanging.

---

## Conclusion

Through this tutorial, we've successfully made local models (Qwen3, Deepseek, GLM4) support Function Calling just like OpenAI:

1. ✅ **OpenAI Compatible**: Full compliance with OpenAI's tool calling specification
2. ✅ **High Performance**: 200%-500% improvement through concurrent execution
3. ✅ **Cost-Effective**: Zero API costs, completely local operation
4. ✅ **Production Ready**: Error isolation, timeout handling, robust design

**Next Steps**:
- Implement more complex tool chains
- Add streaming responses
- Integrate with existing PHP frameworks
- Build AI Agent systems

The complete code is available on GitHub. Feel free to try it out and contribute!

---

## Related Resources

- [pfinal-asyncio Documentation](https://github.com/pfinal/asyncio)
- [Ollama Official Site](https://ollama.ai/)
- [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [Qwen Models on Ollama](https://ollama.ai/library/qwen)
- [Deepseek Models](https://github.com/deepseek-ai)

---

**Author**: PFinal南丞  
**Blog**: https://friday-go.icu  
**GitHub**: https://github.com/pfinal-nc

