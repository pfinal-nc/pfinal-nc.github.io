---
title: Context Engineering 上下文工程实战：从 Prompt Engineering 到 AI Agent 信息架构的范式跃迁
date: 2026-07-09
tags:
  - ai
  - context-engineering
  - prompt-engineering
  - AI-Agent
  - LLM
  - MCP
keywords:
  - Context Engineering
  - 上下文工程
  - 提示词工程
  - AI Agent
  - LLM
  - 上下文管理
  - 信息架构
category: ai
description: 深度解析 Context Engineering（上下文工程）——2026 年 AI Agent 领域的重大范式跃迁，从 Prompt Engineering 的"写好指令"到上下文工程的"设计信息架构"，包含 Write/Select/Compress/Isolate 四大核心策略与生产实战。
---

# Context Engineering 上下文工程实战：从 Prompt Engineering 到 AI Agent 信息架构的范式跃迁

> 当你的 AI Agent 在第 15 步开始"忘事"、调用无关工具、输出质量骤降——问题不在模型能力，而在于**模型看到了什么**。Context Engineering（上下文工程）正是 2026 年 AI Agent 领域最重要的范式跃迁：从"写好指令"到"设计信息架构"。

## 为什么需要 Context Engineering？

### Prompt Engineering 的瓶颈

Prompt Engineering 的核心技能是写好指令——清晰表达、提供示例、设定角色。这套方法论在 ChatGPT 场景下运转良好：一问一答，上下文始终可控。

但当你从聊天机器人升级到 **Agent** 时，Prompt Engineering 远远不够。原因很简单：

```
聊天机器人: 用户提问 → 模型回答 → 结束
            上下文长度: 几千 token

AI Agent:  用户提问 → Agent 规划 → 调用工具 A → 调用工具 B → 
           分析结果 → 调用工具 C → 发现错误 → 回退 → 重新规划 →
           调用工具 D → ... → 最终输出
            上下文长度: 几万到几十万 token
```

Agent 不只是回答一个问题——它自主浏览网页、调用 API、写代码、运行命令，一步步推进，有时几十步。每一步的输出都被加入上下文。而上下文是**有限的**。

### 上下文衰减：模型为什么会"忘事"

Chroma 在 2026 年发表了一项重要研究，评估了 18 个前沿模型（GPT-4.1、Claude 4、Gemini 2.5、Qwen3 等）。结果令人震惊：

**每个模型的性能都随输入长度增加而下降**，远在官方上下文窗口限制之前就开始退化。一个名义支持 200K token 的模型，可能在 50K token 时就表现出显著的性能下降。

这就是著名的 **"Lost in the Middle"** 现象。Liu 团队的研究发现 LLM 呈 U 型注意力曲线：

```
注意力分布:

开头 ████████████████████  很好
中间 ░░░░░░░░░░░░░░░░░░░  被忽略
结尾 ████████████████████  很好

当关键信息从开头移到中间位置：
准确率下降 > 30 个百分点
```

这意味着一件事：如果你的初始指令被 50,000 token 的工具输出淹没，那些指令实际上**丢失了**。

Claude Code 用户观察到的一个经验法则：**上下文窗口使用到 40%-60% 时，输出质量就开始明显下降**——远未触及硬限制。

### 七种信息在上下文中的竞争

一个 Agent 的上下文中同时存在 7 类信息，它们争夺有限的 token 空间：

| 信息类型 | 示例 | Token 占用 |
|----------|------|------------|
| 系统提示 | Agent 身份与行为规则 | 数百~数千 |
| 工具定义 | 每个工具的 schema | 数千~上万 |
| 工具调用结果 | 每次调用的输出 | 数百~上万/次 |
| 知识检索 | RAG 拉取的文档 | 数千~数万 |
| 对话历史 | 全部对话记录 | 累积增长 |
| 记忆 | 短期+长期记忆 | 数百~数千 |
| Agent 状态 | 当前计划、待办、进度 | 数百~数千 |

当工具调用结果和对话历史累积到数万 token 时，系统提示和关键状态信息被挤到"中间位置"，模型开始忽略它们。

## Anthropic 的定义

Anthropic 工程团队对上下文工程给出了精确定义：

> **上下文（Context）**：LLM 采样时包含的 token 集合。
> **上下文工程（Context Engineering）**：优化这些 token 的效用，以持续达成预期结果。

LangChain 用了一个绝佳类比：

```
┌─────────────────────────────────────┐
│  LLM 系统类比                        │
│                                       │
│  模型本身 = CPU（负责思考）            │
│  上下文窗口 = RAM（工作记忆）          │
│  外部存储 = 硬盘（RAG、文件系统）      │
│                                       │
│  RAM 塞满 → 系统变慢 → 程序崩溃       │
│  上下文塞满 → Agent 变蠢 → 任务失败   │
└─────────────────────────────────────┘
```

就像计算机在 RAM 满载时变慢一样，Agent 的推理能力在上下文窗口拥挤时退化。

## 四大核心策略：Write / Select / Compress / Isolate

LangChain 发布了一个被广泛引用的框架，将所有上下文工程技术归纳为四类：

### 1. Write（写入）——持久化关键信息

问题：Agent 会忘记信息。上下文被压缩时，信息就丢失了。

Write 策略提供 Agent **在上下文窗口之外持久化信息**的方式。三种形式：

#### Scratchpad（记事本）

给 Agent 一个"记事本"工具，让它在任务过程中记下重要信息：

```python
# Python 实现 - Scratchpad 工具
from typing import Annotated
from pydantic import BaseModel, Field

class ScratchpadEntry(BaseModel):
    """记事本条目"""
    content: Annotated[str, Field(description="要记录的内容")]
    category: Annotated[str, Field(description="分类：plan/finding/decision")]

scratchpad_store = {}

def scratchpad_write(entry: ScratchpadEntry) -> str:
    """将重要信息写入记事本"""
    key = f"{entry.category}:{len(scratchpad_store)}"
    scratchpad_store[key] = entry.content
    return f"已记录到 {key}"

def scratchpad_read(category: str = None) -> str:
    """从记事本读取信息"""
    if category:
        items = {k: v for k, v in scratchpad_store.items()
                 if k.startswith(category)}
    else:
        items = scratchpad_store
    return "\n".join(f"- {k}: {v}" for k, v in items.items())
```

Anthropic 的实验数据：在 tau-bench 评测中，"think" 记事本工具将性能提升了 **54%**。

#### Rule Files（规则文件）

Claude Code 的 `CLAUDE.md` 是典型例子——持久化指令文件，每次 Agent 启动时自动加载：

```markdown
# CLAUDE.md - 项目上下文规则

## 项目结构
- docs/ 下按分类存放文章
- 构建命令: vitepress build docs
- 提交格式: feat: [描述]

## 编码规范
- 中文写作，面向程序员读者
- Markdown 代码块必须正确配对 ```
- tags 使用已规范化标签

## 已知约束
- 本地 pnpm dev 有 ls.getItem 错误，不影响部署
- 目录大小写敏感: 用 /Tools/ 不是 /tools/
```

#### Memory Retrieval（记忆检索）

跨会话保存事实、偏好和学习模式：

```python
# 跨会话记忆系统
class AgentMemory:
    """Agent 持久化记忆"""

    def __init__(self, storage_path: str):
        self.storage = self._load_memory(storage_path)

    def save_fact(self, key: str, value: str):
        """保存事实性知识"""
        self.storage["facts"][key] = value

    def save_preference(self, key: str, value: str):
        """保存用户偏好"""
        self.storage["preferences"][key] = value

    def save_pattern(self, pattern_name: str, steps: list):
        """保存成功的行为模式"""
        self.storage["patterns"][pattern_name] = steps

    def retrieve_relevant(self, query: str, top_k: int = 5) -> list:
        """检索与当前任务相关的记忆"""
        # 语义检索相关记忆
        results = self._semantic_search(query, top_k)
        return results
```

### 2. Select（选择）——只给当前步骤需要的信息

核心思想：**不要把所有信息都塞给 Agent，只给当前步骤需要的**。

#### 从静态 RAG 到 Agentic RAG

```
传统 RAG（系统做选择）:
  用户提问 → 检索文档 → 喂入 prompt → 模型回答
  一次性管线，系统决定看什么

Agentic RAG（Agent 做选择）:
  Agent 规划 → 决定需要什么 → 搜索 → 判断是否够 → 继续或再搜
  迭代检索，每步需求不同
```

#### 三种记忆类型

LangChain 和 Pinecone 区分了 Agent 可以调用的三种记忆：

| 记忆类型 | 作用 | 实现方式 |
|----------|------|----------|
| **情景记忆** | Few-shot 示例 | 保存成功的任务执行模式 |
| **语义记忆** | 事实仓库 | 向量数据库检索 |
| **程序性记忆** | 行为规则 | CLAUDE.md / 系统提示 |

#### 工具选择的陷阱

如果 Agent 有 40+ 个工具，工具定义可能占用上万 token。RAG-MCP 论文测试了语义检索工具描述：

```
46 个工具全部暴露:
  工具选择准确率: 14%
  prompt token: ~10,000

19 个工具按需暴露:
  工具选择准确率: 正常
  prompt token: ~5,000

语义检索预选择:
  工具选择准确率: 43%（提升 3 倍）
  prompt token: 减半
```

Anthropic 的混合策略：前置加载基础信息（如 CLAUDE.md），其余按需检索。

### 3. Compress（压缩）——减少 token 保留关键信息

即使选择做得很好，上下文还是会累积。压缩是**减少 token 数量同时保留关键信息**。

三个压缩节点：

```
压缩时机图:

  信息进入上下文前     Agent 工作中      Agent 完成动作后
  ┌─────────┐       ┌─────────┐       ┌─────────┐
  │ 文档分块 │       │ 对话总结 │       │ 结果清理 │
  │ 重排序   │       │ 硬裁剪   │       │ 一行摘要 │
  │ 预总结   │       │ 自动压缩 │       │ 替换完整 │
  └─────────┘       └─────────┘       └─────────┘
       │                  │                  │
       ▼                  ▼                  ▼
  减少进入量         减少累积量          减少遗留量
```

Claude Code 的生产级压缩实现：

- **95% 容量时自动压缩**：保留架构决策和最近 5 个文件
- **对话历史总结**：保留最后 10 条原文，旧的全部总结
- **工具结果裁剪**：用一行摘要替换完整的网页内容

```python
# 对话历史压缩实现
class ConversationCompressor:
    """对话历史智能压缩"""

    def compress_history(self, messages: list, keep_recent: int = 10) -> list:
        """保留最近 N 条原文，其余总结"""
        if len(messages) <= keep_recent:
            return messages

        # 旧消息总结
        old_messages = messages[:-keep_recent]
        summary = self._summarize(old_messages)

        # 最近消息保留原文
        recent_messages = messages[-keep_recent:]

        # 组合: 总结 + 最近原文
        compressed = [
            {"role": "system", "content": f"[历史总结] {summary}"},
        ] + recent_messages

        return compressed

    def _summarize(self, messages: list) -> str:
        """使用 LLM 总结旧消息"""
        # 调用小模型（如 GPT-4.1-mini）进行低成本总结
        prompt = "将以下对话历史压缩为关键决策和发现的摘要：\n"
        for msg in messages:
            prompt += f"{msg['role']}: {msg['content'][:200]}\n"

        # 返回总结
        return self._call_llm(prompt)
```

### 4. Isolate（隔离）——多 Agent 系统的基础

隔离策略让多 Agent 系统成为可能。

如果一个 Agent 尝试在同一长对话中做所有事——研究、规划、编码、测试、调试——上下文必然填满。更深层的问题不是空间不足，而是**污染**：

```
单 Agent 长对话的问题:

  研究阶段 → 详细文件搜索结果留在上下文
  规划阶段 → 研究结果成为噪音
  实现阶段 → 规划细节被研究噪音淹没
  测试阶段 → 实现代码被旧噪音干扰

  每阶段都在前阶段的垃圾上工作
```

解决方案是**上下文隔离**：

```
多 Agent 上下文隔离:

  父 Agent
    │
    ├── 子 Agent A（研究）  ← 独立上下文窗口
    │   └── 返回: 研究摘要.md
    │
    ├── 子 Agent B（规划）  ← 新上下文，只含研究摘要
    │   └── 返回: 实现计划.md
    │
    └── 子 Agent C（实现）  ← 新上下文，只含计划
        └── 返回: 代码变更
```

LangGraph 的 **状态 Schema 隔离** 是另一种形式：

```python
from langgraph.graph import StateGraph

# 定义隔离状态 Schema
class AgentState(TypedDict):
    # 模型可见的核心信息
    current_task: str
    plan: str
    recent_results: list[str]

    # 后台字段（模型不直接看到）
    _full_search_results: list[str]     # 完整搜索结果
    _all_tool_outputs: dict             # 所有工具输出
    _conversation_history: list[str]    # 完整对话历史

def should_show_results(state: AgentState) -> AgentState:
    """按需将后台字段选择性暴露给模型"""
    # 只把当前步骤需要的工具结果放入可见区域
    needed_keys = extract_needed_tools(state["current_task"])
    state["recent_results"] = [
        state["_all_tool_outputs"][k]
        for k in needed_keys
        if k in state["_all_tool_outputs"]
    ]
    return state
```

## Agent 的四种失败模式

Drew Breunig 识别了 Agent 在上下文增长时的四种失败模式：

### 1. 上下文中毒（Context Poisoning）

```
特征: 幻觉或错误进入上下文后被反复引用
      每次迭代都在错误基础上叠加

示例: Agent 在第 5 步产生幻觉"数据库端口是 3307"
      → 第 8 步基于 3307 写配置
      → 第 12 步基于错误配置写部署脚本
      → 错误层层放大

修复: 主动裁剪过时/冲突信息
      验证工具输出
      压缩失败尝试的历史
```

### 2. 上下文分心（Context Distraction）

```
特征: 上下文过长导致模型过度依赖最近历史
      不再独立思考

示例: 20 步对话后 Agent 忽略原始需求
      只根据最近 3 步的输出做决策

修复: 即使有大上下文窗口也要积极总结和修剪
      定期重注入核心任务描述
```

### 3. 上下文混乱（Context Confusion）

```
特征: 多余内容被模型捡起来导致低质量响应
      最典型: 工具混乱

数据: Llama 3.1 8B 模型
      46 个工具: 失败
      19 个工具: 正常工作

修复: 动态工具管理
      RAG-MCP 语义检索工具
      每步只暴露当前需要的工具
```

### 4. 上下文冲突（Context Conflict）

```
特征: 新信息与已有内容矛盾
      系统提示说一套，检索文档说另一套

示例: 系统提示: "使用 Go 1.27 新 API"
      检索文档: "Go 1.26 旧实现方式"
      → Agent 不知该听哪个

修复: 建立明确权威排序:
      系统提示 > 检索事实 > 对话历史
      使用结构化章节分隔不同来源
```

## 生产实战：三阶段方法论

Dex Horthy（HumanLayer CEO）在 AI Engineer Code Summit 上展示了一个方法论，他的团队用此方法在单个 7 小时会话中向大型 Rust 代码库交付了约 35,000 行代码。

核心思想：**主动将工作组织成阶段，每阶段产出紧凑产物，每个新阶段用全新上下文窗口开始**。

```
三阶段工作流:

阶段 1: 研究
┌──────────────────────────────────┐
│ 子 Agent 处理原始文件搜索和代码分析 │
│ 产出: research.md（结构化摘要）     │
│ 使用: 隔离 + 写入策略               │
│ 上下文容量: 可达 80%+               │
└──────────────────────────────────┘
        │ 返回摘要（~2000 token）
        ▼
阶段 2: 规划
┌──────────────────────────────────┐
│ 新上下文窗口                        │
│ 只含: research.md + 问题定义        │
│ 产出: implementation-plan.md       │
│ 上下文容量: ~30%（留足推理空间）     │
│ ← 人工审查的最佳节点                 │
└──────────────────────────────────┘
        │ 返回计划（~3000 token）
        ▼
阶段 3: 实现
┌──────────────────────────────────┐
│ 再次新上下文窗口                     │
│ 只含: implementation-plan.md       │
│ 用 progress.md 跟踪进度             │
│ 需要多次压缩时创建新窗口              │
│ 上下文容量: 始终 < 60%              │
└──────────────────────────────────┘
```

```python
# 三阶段 Agent 编排实现
from datetime import datetime

class ThreePhaseAgent:
    """三阶段上下文隔离 Agent"""

    def __init__(self, model_client):
        self.model = model_client
        self.workspace = "./workspace"

    def run(self, task_description: str) -> str:
        """执行三阶段任务"""

        # 阶段 1: 研究（子 Agent，独立上下文）
        research_md = self._research_phase(task_description)

        # 阶段 2: 规划（新上下文，只含研究摘要）
        plan_md = self._planning_phase(task_description, research_md)

        # 人工审查节点
        print(f"[审查] 请检查实现计划: {self.workspace}/plan.md")
        # input("确认继续? (y/n): ")  # 生产中可启用

        # 阶段 3: 实现（新上下文，只含计划）
        result = self._implementation_phase(plan_md)

        return result

    def _research_phase(self, task: str) -> str:
        """研究阶段 - 子 Agent 在独立上下文中工作"""
        research_prompt = f"""
你是研究 Agent。你的唯一任务是收集信息并产出结构化摘要。

任务: {task}

产出格式 (research.md):
## 相关文件
- [路径]: [关键函数/类/模式]

## 发现的模式
- [模式描述]: [影响]

## 需要注意的坑
- [坑描述]: [后果]

## 关键决策点
- [决策]: [原因]

不要写任何代码。只收集和总结信息。
"""
        # 子 Agent 在独立上下文中执行
        research_result = self.model.chat(research_prompt)

        # 持久化研究摘要
        with open(f"{self.workspace}/research.md", "w") as f:
            f.write(research_result)

        return research_result

    def _planning_phase(self, task: str, research: str) -> str:
        """规划阶段 - 新上下文只含研究摘要"""
        planning_prompt = f"""
你是规划 Agent。基于研究摘要制定详细实现计划。

任务: {task}

研究摘要:
{research}

产出格式 (plan.md):
## 实现步骤
1. [步骤]: [文件变更] [预期效果]
2. ...

## 测试策略
- [测试场景]: [验证方式]

## 风险评估
- [风险]: [缓解方案]

不要写任何代码。只制定计划。
"""
        plan_result = self.model.chat(planning_prompt)

        with open(f"{self.workspace}/plan.md", "w") as f:
            f.write(plan_result)

        return plan_result

    def _implementation_phase(self, plan: str) -> str:
        """实现阶段 - 新上下文只含计划"""
        impl_prompt = f"""
你是实现 Agent。严格按照计划执行代码变更。

实现计划:
{plan}

规则:
1. 每完成一个步骤，更新 progress.md
2. 如果上下文接近 60% 容量，总结已完成部分并重新开始
3. 遇到计划外问题时，记录到 issues.md 但继续执行计划
"""
        result = self.model.chat(impl_prompt)
        return result
```

## 主流平台的上下文工程实践

### Claude Code

Claude Code 是上下文工程最成熟的实践案例：

| 特性 | 实现方式 |
|------|----------|
| 前置加载 | CLAUDE.md 规则文件每次自动加载 |
| 按需检索 | glob/grep 工具按需导航代码库 |
| 自动压缩 | 95% 容量时触发，保留架构决策+最近 5 文件 |
| 子 Agent | 复杂任务拆分为子 Agent 独立上下文 |
| 跨会话记忆 | 记忆工具保存偏好和模式 |

Anthropic 的哲学："做最简单且最有效的解决方案。"

### Manus

面向数万用户的通用 Agent，效率至上：

| 特性 | 实现方式 |
|------|----------|
| KV-cache 感知 | 上下文排序最大化缓存复用 |
| 压缩管线 | 观察结果经过压缩管道 |
| 持久化待办 | Todo 列表作为任务锚点 |
| 文件溢出 | 文件系统作为上下文溢出存储 |

### ChatGPT Agent

Computer-Using Agent 模型驱动，GUI 优先：

| 特性 | 实现方式 |
|------|----------|
| 视觉上下文 | 截图作为视觉快照加入上下文 |
| 视觉压缩 | 视觉 token 昂贵，选择性保留 |
| RL 策略 | 强化学习发现最优工具使用策略 |

### Google ADK

最根本性的架构方法：

| 设计原则 | 说明 |
|----------|------|
| 存储与呈现分离 | 后台数据不全量暴露给模型 |
| 显式变换 | 命名、有序、可测试的处理器管线 |
| 默认范围限制 | 每次模型调用只看最小必要信息 |

所有平台最终遵循同一管线：

```
收集候选信息 → 选择当前步骤相关内容 → 压缩 → 
排列以最大化 KV-cache 复用 → 组装上下文 → API 调用
```

## 系统提示与工具定义的最佳实践

### Agent 系统提示 ≠ 聊天机器人系统提示

| 维度 | 聊天机器人 | Agent |
|------|-----------|-------|
| 目的 | 设定语气 | 定义架构 |
| 内容 | 角色扮演 | 控制流、工具规则、错误处理 |
| 长度 | 数百 token | 数千 token |
| 组织 | 线性文本 | XML/Markdown 结构化 |

Anthropic 提出"合适海拔高度"原则：

```
太具体: "如果用户提到账单且金额超过100美元，调用工具X"
         → 太脆弱，无法适应新场景

太模糊: "使用合适的工具"
         → Agent 无法判断什么是"合适"

恰到好处: "处理支付相关请求时，先验证金额再调用支付工具"
         → 具体到能指导自主行为
         → 灵活到让模型运用判断力
```

### 工具定义的陷阱

MCP 让接入很多工具变得太容易——这正是陷阱。

两种扩展工具集的主流方法：

#### 方法一：工具屏蔽（Manus 推荐）

```python
# 工具屏蔽实现
TOOL_PHASES = {
    "research": ["web_search", "file_read", "code_analyze"],
    "planning": ["file_read", "plan_write"],
    "coding": ["file_read", "file_write", "shell_run"],
    "testing": ["shell_run", "file_read", "diff_check"],
}

def get_available_tools(current_phase: str) -> list:
    """根据当前阶段返回可用工具列表"""
    return TOOL_PHASES.get(current_phase, [])
```

关键：**保持所有工具定义在上下文中稳定**（利用 KV-cache），但标记某些工具在当前阶段不可用。不要动态增删工具定义——这会破坏 KV-cache，未缓存 token 的成本是缓存 token 的 **10 倍**。

#### 方法二：RAG 工具选择

```python
# 语义检索工具选择
from sentence_transformers import SentenceTransformer

class ToolSelector:
    """RAG-MCP 语义检索工具选择器"""

    def __init__(self, tool_descriptions: dict):
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        self.tool_embeddings = {}
        for name, desc in tool_descriptions.items():
            self.tool_embeddings[name] = self.encoder.encode(desc)

    def select_tools(self, current_task: str, top_k: int = 10) -> list:
        """根据当前任务语义检索最相关的工具"""
        task_embedding = self.encoder.encode(current_task)

        similarities = {}
        for name, emb in self.tool_embeddings.items():
            sim = cosine_similarity(task_embedding, emb)
            similarities[name] = sim

        # 返回最相关的 top_k 工具
        sorted_tools = sorted(similarities.items(),
                              key=lambda x: x[1], reverse=True)
        return [name for name, _ in sorted_tools[:top_k]]
```

## Go 语言上下文工程实践

对于 Go 开发者构建 Agent 系统，以下是一个完整的上下文管理框架：

```go
package contextengine

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// ContextManager 上下文工程管理器
type ContextManager struct {
	scratchpad   *ScratchpadStore
	memory       *MemoryStore
	toolSelector *ToolSelector
	compressor   *Compressor
	mu           sync.Mutex
}

// ScratchpadStore 记事本存储
type ScratchpadStore struct {
	entries map[string]string
	mu      sync.Mutex
}

func (s *ScratchpadStore) Write(key, content string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.entries[key] = content
}

func (s *ScratchpadStore) Read(category string) string {
	s.mu.Lock()
	defer s.mu.Unlock()
	var result string
	for k, v := range s.entries {
		if category == "" || filepath.HasPrefix(k, category) {
			result += fmt.Sprintf("- %s: %s\n", k, v)
		}
	}
	return result
}

// MemoryStore 持久化记忆
type MemoryStore struct {
	path string
	data map[string]interface{}
}

func (m *MemoryStore) SaveFact(key string, value interface{}) error {
	m.data[key] = value
	return m.persist()
}

func (m *MemoryStore) RetrieveFacts(query string) ([]string, error) {
	// 简化版：匹配关键词
	var results []string
	for k, v := range m.data {
		if containsKeyword(k, query) {
			jsonVal, _ := json.Marshal(v)
			results = append(results, fmt.Sprintf("%s: %s", k, jsonVal))
		}
	}
	return results, nil
}

func (m *MemoryStore) persist() error {
	data, err := json.Marshal(m.data)
	if err != nil {
		return err
	}
	return os.WriteFile(m.path, data, 0644)
}

// Compressor 上下文压缩器
type Compressor struct {
	maxMessages int       // 保留最近消息数
	llmClient   LLMClient // 用于总结的 LLM 客户端
}

type LLMClient interface {
	Summarize(text string) (string, error)
}

func (c *Compressor) CompressHistory(messages []Message) ([]Message, error) {
	if len(messages) <= c.maxMessages {
		return messages, nil
	}

	// 旧消息总结
	oldMessages := messages[:len(messages)-c.maxMessages]
	var oldText string
	for _, msg := range oldMessages {
		oldText += msg.Content + "\n"
	}

	summary, err := c.llmClient.Summarize(oldText)
	if err != nil {
		return nil, err
	}

	// 组合：总结 + 最近原文
	compressed := []Message{
		{Role: "system", Content: fmt.Sprintf("[历史总结] %s", summary)},
	}
	compressed = append(compressed, messages[len(messages)-c.maxMessages:]...)

	return compressed, nil
}

// ToolSelector 动态工具选择器
type ToolSelector struct {
	phases map[string][]string
}

func (t *ToolSelector) GetToolsForPhase(phase string) []string {
	return t.phases[phase]
}

// NewContextManager 创建上下文管理器
func NewContextManager(workspace string) *ContextManager {
	return &ContextManager{
		scratchpad: &ScratchpadStore{entries: make(map[string]string)},
		memory: &MemoryStore{
			path: filepath.Join(workspace, "memory.json"),
			data: make(map[string]interface{}),
		},
		toolSelector: &ToolSelector{
			phases: map[string][]string{
				"research": {"web_search", "file_read", "code_analyze"},
				"planning": {"file_read", "plan_write"},
				"coding":   {"file_read", "file_write", "shell_run"},
				"testing":  {"shell_run", "file_read", "diff_check"},
			},
		},
		compressor: &Compressor{
			maxMessages: 10,
		},
	}
}
```

## 总结：上下文工程核心原则

Gartner 预测到 2026 年底，40% 的企业应用将集成 Agent。只有掌握上下文工程的团队才能让 Agent 真正可靠地工作。

核心原则可以用四个词概括：

```
┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
│Write │  │Select│  │Compress│ │Isolate│
│写入  │  │选择  │  │ 压缩  │  │ 隔离  │
└──────┘  └──────┘  └──────┘  └──────┘
    │         │          │         │
    ▼         ▼          ▼         ▼
 持久化    按需供给    减少噪音    防止污染
 关键信息  当前步骤    保留要点    上下文隔离
```

每当 Agent 出现问题，首先判断它属于哪种失败模式：

| 失败模式 | 对应策略 |
|----------|----------|
| 上下文中毒 | Write（持久化正确信息） |
| 上下文分心 | Compress（压缩冗余） |
| 上下文混乱 | Select（选择当前需要） |
| 上下文冲突 | Isolate（隔离不同来源） |

**最好的学习方式是自己动手实践**——从 CLAUDE.md 规则文件开始，逐步加入记事本、压缩和子 Agent 隔离，你会真切感受到 Agent 性能的质的飞跃。

## 参考资料

- [Context Engineering: A Complete Guide (Marina Wyss)](https://www.wangjun.dev/2026/05/context-engineering-for-ai-agents/)
- [Anthropic: Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)
- [LangChain: Context Engineering for Agents](https://blog.langchain.dev/context-engineering-for-agents/)
- [Lost in the Middle: How Language Models Use Long Contexts (Liu et al.)](https://arxiv.org/abs/2307.03172)
- [RAG-MCP: Semantic Tool Retrieval](https://arxiv.org/abs/2605.xxxxx)
- [Drew Breunig: Four Failure Modes of Agents](https://drewbreunig.com/2025/06/failure-modes-of-ai-agents/)
- [Karpathy: Context Engineering Definition](https://x.com/karpathy/status/xxxxx)
- [Gartner: 40% Enterprise Apps Will Integrate Agents by 2026](https://www.gartner.com/en/newsroom/press-releases/2026-ai-agents)
