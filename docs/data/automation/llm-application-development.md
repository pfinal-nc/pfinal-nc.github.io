---
title: "大模型应用开发指南"
date: 2026-04-22 00:00:00
author: PFinal南丞
description: "系统学习大模型应用开发，掌握 Prompt Engineering、RAG、Function Calling、Agent 等核心技术，构建生产级 AI 应用。"
keywords:
  - 大模型
  - LLM
  - AI应用开发
  - Prompt Engineering
  - RAG
  - Function Calling
  - Agent
tags:
  - llm
  - ai-development
  - rag
  - agent
  - openai
---

# 大模型应用开发指南

大语言模型（LLM）正在改变软件开发的方式。本文将系统介绍大模型应用开发的核心技术和最佳实践。

## 大模型基础

### 主流模型对比

| 模型 | 提供商 | 上下文长度 | 特点 |
|------|--------|------------|------|
| GPT-4 | OpenAI | 128K | 强大的推理能力 |
| GPT-3.5 | OpenAI | 16K | 性价比高 |
| Claude 3 | Anthropic | 200K | 长文本处理 |
| Gemini Pro | Google | 1M | 多模态能力 |
| Llama 3 | Meta | 8K | 开源可部署 |
| Qwen | 阿里云 | 128K | 中文优化 |

### API 调用基础

```python
import openai

# OpenAI API
client = openai.OpenAI(api_key="your-api-key")

response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "你是一个专业的编程助手。"},
        {"role": "user", "content": "解释什么是递归。"}
    ],
    temperature=0.7,
    max_tokens=500
)

print(response.choices[0].message.content)
```

## Prompt Engineering

### 基础技巧

```python
# 1. 明确指令
prompt = """
请将以下英文翻译成中文：
英文：Hello, how are you?
中文：
"""

# 2. 提供上下文
prompt = """
背景：你是一个专业的 Python 开发者。
任务：解释以下代码的作用。
代码：
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
"""

# 3. 示例引导（Few-shot）
prompt = """
将自然语言转换为 SQL 查询：

示例 1：
查询：显示所有年龄大于 25 岁的用户
SQL：SELECT * FROM users WHERE age > 25;

示例 2：
查询：统计每个部门的员工数量
SQL：SELECT department, COUNT(*) FROM employees GROUP BY department;

现在转换：
查询：找出订单金额最高的前 10 个客户
SQL：
"""
```

### 高级技巧

#### Chain of Thought

```python
prompt = """
问题：一个农场有鸡和兔，头共 35 个，脚共 94 只。鸡兔各几只？

请按以下步骤思考：
1. 设鸡有 x 只，兔有 y 只
2. 根据头的数量列出方程
3. 根据脚的数量列出方程
4. 解方程组
5. 验证答案

详细解答：
"""
```

#### ReAct 模式

```python
prompt = """
你可以使用以下工具：
- search(query): 搜索信息
- calculator(expression): 计算表达式

问题：2023 年诺贝尔物理学奖得主是谁？他/她的主要贡献是什么？

请按以下格式回答：
思考：我需要搜索 2023 年诺贝尔物理学奖的信息
行动：search("2023 年诺贝尔物理学奖得主")
观察：[搜索结果]
思考：...
"""
```

## RAG 系统开发

### 架构设计

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  文档    │───▶│  分块    │───▶│ Embedding│───▶│ 向量库   │
│  数据    │    │  处理    │    │   模型   │    │          │
└──────────┘    └──────────┘    └──────────┘    └────┬─────┘
                                                      │
┌──────────┐    ┌──────────┐    ┌──────────┐         │
│   用户   │───▶│  Query   │───▶│  相似度  │◀────────┘
│   问题   │    │ Embedding│    │  搜索    │
└──────────┘    └──────────┘    └────┬─────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │  LLM 生成    │
                              │ (上下文+问题)│
                              └──────────────┘
```

### 完整实现

```python
from langchain import OpenAIEmbeddings, FAISS, OpenAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import RetrievalQA
import os

# 1. 文档加载和分块
def load_and_split_documents(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
    )
    
    chunks = text_splitter.split_text(text)
    return chunks

# 2. 创建向量库
def create_vector_store(chunks):
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",
        api_key=os.getenv("OPENAI_API_KEY")
    )
    
    vector_store = FAISS.from_texts(
        texts=chunks,
        embedding=embeddings
    )
    
    return vector_store

# 3. 构建 RAG 链
def create_rag_chain(vector_store):
    llm = OpenAI(
        model="gpt-4",
        temperature=0.7,
        api_key=os.getenv("OPENAI_API_KEY")
    )
    
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=vector_store.as_retriever(
            search_kwargs={"k": 3}
        ),
        return_source_documents=True
    )
    
    return qa_chain

# 4. 使用
chunks = load_and_split_documents("document.txt")
vector_store = create_vector_store(chunks)
qa_chain = create_rag_chain(vector_store)

result = qa_chain({"query": "文档的主要内容是什么？"})
print(result["result"])
print("来源：", [doc.page_content[:100] for doc in result["source_documents"]])
```

### 高级 RAG 技术

#### 混合检索

```python
from langchain.retrievers import BM25Retriever, EnsembleRetriever

# 创建 BM25 检索器
bm25_retriever = BM25Retriever.from_texts(chunks)
bm25_retriever.k = 3

# 创建向量检索器
vector_retriever = vector_store.as_retriever(search_kwargs={"k": 3})

# 组合检索器
ensemble_retriever = EnsembleRetriever(
    retrievers=[bm25_retriever, vector_retriever],
    weights=[0.5, 0.5]
)

# 使用
results = ensemble_retriever.get_relevant_documents("查询问题")
```

#### 重排序

```python
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import LLMChainExtractor

# 创建压缩器
compressor = LLMChainExtractor.from_llm(llm)

# 创建压缩检索器
compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=vector_store.as_retriever()
)

# 使用
compressed_docs = compression_retriever.get_relevant_documents("查询问题")
```

## Function Calling

### 基础用法

```python
import json

def get_weather(location, unit="celsius"):
    """获取指定位置的天气信息"""
    # 实际实现会调用天气 API
    return {"temperature": 25, "condition": "sunny", "location": location}

def calculate(expression):
    """计算数学表达式"""
    try:
        result = eval(expression)
        return {"result": result}
    except:
        return {"error": "Invalid expression"}

# 定义函数工具
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "获取指定位置的天气信息",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "城市名称，如北京、上海"
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "温度单位"
                    }
                },
                "required": ["location"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculate",
            "description": "计算数学表达式",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "数学表达式，如 2 + 2"
                    }
                },
                "required": ["expression"]
            }
        }
    }
]

# 调用
response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "user", "content": "北京今天天气怎么样？然后计算 15 * 23"}
    ],
    tools=tools,
    tool_choice="auto"
)

# 处理函数调用
message = response.choices[0].message
if message.tool_calls:
    for tool_call in message.tool_calls:
        function_name = tool_call.function.name
        function_args = json.loads(tool_call.function.arguments)
        
        if function_name == "get_weather":
            result = get_weather(**function_args)
        elif function_name == "calculate":
            result = calculate(**function_args)
        
        print(f"函数 {function_name} 返回：{result}")
```

## Agent 开发

### ReAct Agent

```python
from langchain.agents import Tool, AgentExecutor, create_react_agent
from langchain import OpenAI
from langchain.prompts import PromptTemplate

# 定义工具
tools = [
    Tool(
        name="Search",
        func=lambda x: f"搜索 '{x}' 的结果",
        description="用于搜索信息"
    ),
    Tool(
        name="Calculator",
        func=lambda x: str(eval(x)),
        description="用于计算数学表达式"
    )
]

# 创建提示模板
template = """Answer the following questions as best you can. You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {input}
Thought:{agent_scratchpad}"""

prompt = PromptTemplate.from_template(template)

# 创建 Agent
llm = OpenAI(temperature=0)
agent = create_react_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

# 运行
result = agent_executor.invoke({"input": "计算 25 的平方，然后搜索 Python"})
print(result["output"])
```

### 自定义 Agent

```python
from typing import List, Dict, Any
import openai

class SimpleAgent:
    def __init__(self, tools: List[Dict], model: str = "gpt-4"):
        self.tools = {tool["function"]["name"]: tool for tool in tools}
        self.model = model
        self.client = openai.OpenAI()
    
    def execute_tool(self, tool_name: str, arguments: Dict) -> Any:
        """执行工具函数"""
        # 这里应该调用实际的工具实现
        return f"Executed {tool_name} with {arguments}"
    
    def run(self, query: str, max_iterations: int = 5) -> str:
        """运行 Agent"""
        messages = [
            {"role": "system", "content": "你是一个智能助手，可以使用工具来解决问题。"},
            {"role": "user", "content": query}
        ]
        
        for _ in range(max_iterations):
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=list(self.tools.values()),
                tool_choice="auto"
            )
            
            message = response.choices[0].message
            
            # 如果没有工具调用，直接返回结果
            if not message.tool_calls:
                return message.content
            
            # 执行工具调用
            messages.append(message)
            
            for tool_call in message.tool_calls:
                function_name = tool_call.function.name
                arguments = json.loads(tool_call.function.arguments)
                
                result = self.execute_tool(function_name, arguments)
                
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": str(result)
                })
        
        return "达到最大迭代次数"

# 使用
agent = SimpleAgent(tools=tools)
result = agent.run("北京天气怎么样？")
print(result)
```

## 生产部署

### 性能优化

```python
# 1. 使用缓存
from functools import lru_cache

@lru_cache(maxsize=1000)
def cached_embedding(text: str):
    return embeddings.embed_query(text)

# 2. 异步处理
import asyncio

async def async_llm_call(messages):
    return await client.chat.completions.create(
        model="gpt-4",
        messages=messages
    )

# 3. 流式输出
response = client.chat.completions.create(
    model="gpt-4",
    messages=messages,
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

### 安全考虑

```python
# 1. 输入验证
def sanitize_input(user_input: str) -> str:
    # 移除潜在的危险字符
    dangerous = ["<script>", "javascript:", "onerror="]
    for d in dangerous:
        user_input = user_input.replace(d, "")
    return user_input

# 2. 输出过滤
def filter_output(output: str) -> str:
    # 过滤敏感信息
    sensitive_patterns = [r"\b\d{16}\b", r"password[=:]\s*\S+"]
    for pattern in sensitive_patterns:
        output = re.sub(pattern, "[REDACTED]", output)
    return output

# 3. 速率限制
from ratelimit import limits, sleep_and_retry

@sleep_and_retry
@limits(calls=100, period=60)
def rate_limited_call():
    return client.chat.completions.create(...)
```

## 总结

大模型应用开发涉及多个技术领域，从 Prompt Engineering 到 RAG、Function Calling 和 Agent，每个环节都需要深入理解和实践。

---

**参考资源：**
- [OpenAI API 文档](https://platform.openai.com/docs)
- [LangChain 文档](https://python.langchain.com/)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
