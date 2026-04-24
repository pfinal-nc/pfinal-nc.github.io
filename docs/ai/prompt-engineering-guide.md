---
title: AI 提示词工程实战：从入门到精通
date: 2026-04-24
category: ai
tags:
  - AI
  - 提示词工程
  - LLM
  - ChatGPT
description: 系统讲解 AI 提示词工程的核心技巧，包括零样本、少样本、思维链等高级技术，以及在实际项目中的应用案例。
---

# AI 提示词工程实战：从入门到精通

提示词工程（Prompt Engineering）是高效使用大语言模型的核心技能。好的提示词能让 AI 输出质量提升数倍。

## 提示词基础结构

一个高质量的提示词通常包含以下元素：

```
[角色设定] 你是一位...
[背景信息] 当前场景是...
[任务描述] 请你...
[格式要求] 输出格式为...
[示例] 例如：...
[约束条件] 注意：...
```

### 示例：代码审查助手

```text
你是一位资深 Go 后端工程师，专注于代码质量和安全性。

请审查以下 Go 代码，重点关注：
1. 潜在的 bug 和逻辑错误
2. 性能问题（内存分配、goroutine 泄漏等）
3. 安全漏洞（SQL 注入、XSS 等）
4. 代码可维护性

输出格式：
- ## 严重问题（必须修复）→ [问题描述]: [修复建议]
- ## 一般建议 → [建议内容]
- ## 优点 → [值得保留的好实践]

代码如下：（在此粘贴 Go 代码）
```

## 核心技术

### 零样本提示（Zero-shot）

直接描述任务，不提供示例：

```text
将以下 JSON 数据转换为 Markdown 表格：

{"name": "Alice", "age": 30, "city": "上海"}
{"name": "Bob", "age": 25, "city": "北京"}
```

### 少样本提示（Few-shot）

提供 2-5 个示例，让模型学习模式：

```text
将英文技术术语翻译为中文，保持专业性：

英文：goroutine → 中文：协程
英文：middleware → 中文：中间件
英文：garbage collection → 中文：垃圾回收
英文：channel → 中文：
```

### 思维链提示（Chain of Thought）

要求模型展示推理过程：

```text
分析这段代码是否有竞态条件，请一步步推理：

var counter int

func increment() {
    counter++
}

func main() {
    for i := 0; i < 1000; i++ {
        go increment()
    }
}

请分析：
1. 并发访问的变量是什么？
2. 是否有同步机制？
3. 可能出现什么问题？
4. 如何修复？
```

### 自我反思提示（Self-reflection）

让模型检查自己的输出：

```text
请完成以下任务，然后检查你的答案：

任务：写一个 Go 函数，安全地从 map 中读取值

[第一步] 给出你的实现
[第二步] 检查：
- 是否处理了 key 不存在的情况？
- 是否有并发安全问题？
- 是否有更简洁的写法？
[第三步] 如有问题，给出改进版本
```

## 实际应用场景

### 代码生成

```text
## 任务
用 Go 实现一个并发安全的缓存，要求：

## 功能规格
- 支持 Set(key, value, ttl) 设置带过期时间的缓存
- 支持 Get(key) 获取缓存，返回值和是否存在
- 支持 Delete(key) 删除缓存
- 自动清理过期条目（后台 goroutine）
- 并发安全

## 技术要求
- 使用 sync.RWMutex 实现并发控制
- 过期检查使用 time.Time
- 提供 Close() 方法优雅停止后台清理

## 输出要求
- 完整可运行的代码
- 关键逻辑注释
- 简单的使用示例
```

### 文档生成

```text
为以下 Go 函数生成 godoc 风格的注释：

func (c *Cache) Set(key string, value interface{}, ttl time.Duration) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.items[key] = &item{
        value:     value,
        expiresAt: time.Now().Add(ttl),
    }
}

要求：
- 描述函数功能
- 说明每个参数的含义
- 说明边界条件（如 ttl = 0 时的行为）
- 给出使用示例
- 格式符合 godoc 规范
```

### 错误排查

```text
我遇到了以下错误，请帮我排查原因并给出解决方案：

错误信息：

panic: runtime error: invalid memory address or nil pointer dereference
goroutine 1 [running]:
main.main()
    /tmp/main.go:15 +0x1d

代码（第 13-17 行）：

resp, _ := http.Get("https://api.example.com/data")
body, _ := io.ReadAll(resp.Body)
defer resp.Body.Close()

请分析：
1. 错误的根本原因
2. 为什么会出现 nil 指针
3. 如何正确处理这段代码
4. 如何避免类似问题
```

### 代码重构

```text
请重构以下代码，使其更符合 Go 最佳实践：

[粘贴你的代码]

重构目标：
- 提高可读性（合理的变量命名、函数拆分）
- 减少嵌套层次
- 优化错误处理
- 消除重复代码
- 添加必要的注释

要求：
- 保持功能不变
- 解释每个重构点及其原因
- 如有性能改进，请注明
```

## 高级技巧

### 角色链（Role Chaining）

用多轮对话模拟专家评审：

```text
轮次 1 - 初稿：
作为架构师，请设计一个短链接服务的系统架构...

轮次 2 - 审查：
作为安全工程师，请审查上面的架构，重点关注安全漏洞...

轮次 3 - 优化：
综合以上建议，给出最终的优化架构方案...
```

### 结构化输出

```text
请分析以下代码的质量，以 JSON 格式输出：

{
  "overall_score": 1-10,
  "issues": [
    {
      "type": "bug|performance|security|style",
      "severity": "critical|high|medium|low",
      "line": 行号,
      "description": "问题描述",
      "fix": "修复建议"
    }
  ],
  "summary": "总体评价"
}

代码：
[你的代码]
```

### 提示词模板化

```python
# Python 提示词模板示例
from string import Template

CODE_REVIEW_TEMPLATE = Template("""\
你是一位资深 $language 工程师。

请审查以下代码，关注：$focus_areas

输出严重问题（必须修复）和一般建议。""")

prompt = CODE_REVIEW_TEMPLATE.substitute(
    language="Go",
    focus_areas="并发安全、内存泄漏、错误处理",
    code=my_code,
)
```

## 避坑指南

### 常见错误

| 错误 | 示例 | 改进 |
|------|------|------|
| 提示词过于模糊 | "帮我改一下代码" | "重构这段 Go 代码，提高可读性，拆分超过 50 行的函数" |
| 没有格式要求 | "分析一下" | "用 Markdown 列表格式，分别列出优点和缺点" |
| 缺少上下文 | "这个报错怎么解决" | "在 Go 1.21 中，使用 goroutine 时遇到以下报错..." |
| 任务太复杂 | 一个提示做所有事 | 拆分为多个步骤，分轮次对话 |

### 迭代优化

好的提示词需要迭代：

1. **初版**：描述基本需求
2. **测试**：观察输出质量
3. **补充**：添加缺少的约束
4. **精炼**：去掉多余信息
5. **固化**：保存有效模板

## 总结

提示词工程的核心原则：

1. **清晰具体** - 明确说明你要什么
2. **提供上下文** - 背景信息帮助模型理解场景
3. **指定格式** - 告诉模型如何组织输出
4. **少样本示例** - 通过示例展示期望的风格
5. **迭代优化** - 不断测试和改进
6. **分解复杂任务** - 复杂问题拆成多步骤

> 记住：AI 是工具，提示词是接口。掌握提示词工程，你就掌握了与 AI 高效协作的能力。
