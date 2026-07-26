---
title: "Codex CLI 0.145 深度解析：/import 迁移战争、Multi-Agent V2 与透明度争议"
date: 2026-07-27 10:00:00
tags:
  - ai
  - codex
  - agent
  - mcp
  - ai-coding-tools
keywords:
  - Codex CLI
  - OpenAI Codex
  - /import
  - Multi-Agent V2
  - Cursor
  - Claude Code
  - 迁移成本
  - AI 编程工具
  - 可观测性
  - 透明度争议
category: ai
description: "2026 年 7 月 21 日，OpenAI 发布 Codex CLI 0.145。/import 一键迁移 Cursor 和 Claude Code 全部配置，Multi-Agent V2 转正，但父子 Agent 间加密指令传输引发透明度争议。本文从工程、商业、安全三个维度，拆解这次更新的真实含义。"
---

# Codex CLI 0.145 深度解析：/import 迁移战争、Multi-Agent V2 与透明度争议

2026 年 7 月 21 日，OpenAI 推送了 Codex CLI 0.145 版本。这次更新日志很长，但有三条真正改变了 AI 编程工具的竞争格局：

1. **`/import` 命令支持一键迁移 Cursor 和 Claude Code 的全量配置**——MCP 服务器、插件、会话记录、自定义命令、项目级记忆。
2. **Multi-Agent V2 从实验版转正**——子 Agent 可配置模型和推理级别，角色系统恢复，导航改进。
3. **父子 Agent 之间的指令改为加密传输**——开发者无法直接查看委派内容，引发可观测性争议。

这三条加在一起，不是一次普通的功能更新。它是 OpenAI 对 AI 编程工具市场的重新定义：从“比谁更好用”，转向“让换工具变得无摩擦”。

本文从工程实现、商业策略、安全与可观测性三个维度，拆解 0.145 的真实含义。

---

## 一、/import：把迁移成本归零的“携号转网”

过去半年，AI 编程工具的市场格局大致是：

- **Claude Code**：占约 53% 份额，复杂任务能力强。
- **Cursor**：用体验和快捷键锁定忠实用户。
- **Codex CLI**：背靠 OpenAI 生态，但一直追赶。

0.145 之前，Codex 的打法是“比功能”——我比你多一个 agent，我比你快 10%。但用户切换工具的最大阻力从来不是功能差异，而是**沉没成本**。

你花了几十个小时调出来的 `.cursorrules`、为 Claude Code 维护的 MCP 服务器列表、项目里积累的几百轮会话上下文。换一次工具，全部归零。

`/import` 的作用就是把这个成本归零。

### 1.1 迁移了什么？

| 配置项 | 说明 |
|--------|------|
| `.cursorrules` / `.claude` 项目规则 | 编码风格、禁止项、架构约定 |
| MCP 服务器配置 | 工具协议接入点，包括本地和远程 server |
| 插件/扩展 | 自定义命令和工具链扩展 |
| 会话记录 | 历史上下文、项目记忆 |
| 项目级记忆 | 对代码库的长期理解 |

这意味着：一个 Cursor 用户执行一条命令，十分钟后就能在 Codex 里获得“像用了三年”的熟悉感。

### 1.2 为什么这在工程上不难，但战略上很狠？

从工程角度看，`/import` 本质上是一组配置文件的解析和映射：

```text
.cursorrules        → codex rules 文件格式
Claude Code config  → codex config JSON
MCP server list     → 直接复用，协议层相同
chat history      → 向量存储或摘要迁移
```

真正的难点不是解析，而是**不同工具对同一配置的语义差异**。例如：

- Cursor 的 rules 是“提示词模板”风格。
- Claude Code 的 `.claude` 更偏向“系统指令 + 工具调用策略”。
- Codex 需要把这些差异映射到自己的 agent 规划层。

OpenAI 的策略价值在于：它把竞争对手的“锁定资产”变成了可迁移的“标准数据”。一旦用户认为配置是“自己的”，而不是“某个工具私有的”，品牌忠诚度就会大幅下降。

### 1.3 迁移脚本示例：理解 /import 背后的配置结构

虽然 Codex 的 `/import` 是内置命令，但我们可以用一个 Python 脚本来理解它到底在做什么。下面是一个简化示例，模拟从 Cursor 和 Claude Code 配置生成 Codex 兼容配置的流程。

```python
#!/usr/bin/env python3
"""
模拟 Codex /import 背后的配置迁移逻辑。
实际 /import 由 OpenAI 官方实现，这里仅用于理解配置结构。
"""

import json
from pathlib import Path
from typing import Any


def load_cursor_rules(path: Path) -> str:
    """读取 .cursorrules 文件"""
    return path.read_text(encoding="utf-8") if path.exists() else ""


def load_claude_config(path: Path) -> dict[str, Any]:
    """读取 Claude Code 配置文件（假设为 JSON）"""
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def migrate_to_codex(cursor_dir: Path, claude_dir: Path) -> dict[str, Any]:
    """把 Cursor + Claude Code 配置迁移到 Codex 格式"""
    rules = load_cursor_rules(cursor_dir / ".cursorrules")
    claude_config = load_claude_config(claude_dir / ".claude" / "config.json")

    codex_config = {
        "version": "0.145",
        "rules": {
            # Cursor 的规则转为 Codex 顶层 rules
            "prompt_rules": rules.splitlines(),
            # Claude Code 的指令注入为系统提示
            "system_prompt": claude_config.get("system_prompt", ""),
        },
        "mcp_servers": claude_config.get("mcp_servers", []),
        "memory": {
            "project_notes": claude_config.get("project_memory", []),
        },
    }
    return codex_config


def main() -> None:
    cursor_dir = Path.home() / ".cursor"
    claude_dir = Path.home() / ".claude"

    codex_config = migrate_to_codex(cursor_dir, claude_dir)
    print(json.dumps(codex_config, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
```

这个脚本展示了迁移的核心逻辑：把不同工具的私有格式，映射到一个以 Codex 为中心的通用结构。真正的 `/import` 会更复杂，但思想相同。

---

## 二、Multi-Agent V2 转正：从“五个不沟通的承包商”到 AI 小队

多 Agent 协作是 2026 年 AI 编程最热的概念，但早期版本的问题也很真实：

- 子 Agent 互相覆盖对方的修改。
- 上下文在 Agent 之间丢失。
- 并行任务产生合并冲突。

用户形容：“像同时雇了五个不沟通的承包商。”

0.145 做了三件关键改进：

1. **可配置的子 Agent 模型和推理级别**：简单任务用便宜模型，复杂架构决策用强模型，安全审查用专用模型。
2. **角色系统恢复**：每个 Agent 有明确分工边界，比如 planner、coder、reviewer、tester。
3. **Agent 导航改进**：减少重复执行和相互干扰，自动合并结果。

### 2.1 架构示意图

```text
User Request
    │
    ▼
┌─────────────────┐
│  Parent Agent   │  ←  orchestrator，决定任务拆分
│  (reasoning=high) │
└────────┬────────┘
         │
    ┌────┼────┐
    ▼    ▼    ▼
┌──────┐┌──────┐┌──────┐
│Coder ││Test  ││Review│
│(fast)││(mid) ││(safe)│
└──┬───┘└──┬───┘└──┬───┘
   │       │       │
   └───────┼───────┘
           ▼
    ┌──────────────┐
    │ Merge Agent  │  ← 合并结果，解决冲突
    │ (reasoning=high)│
    └──────┬───────┘
           ▼
    User-facing result
```

这个架构最大的工程意义是：把“多 Agent 协作”从一个 demo 功能，变成了一个**可预算、可审计、可扩展**的生产模式。

### 2.2 Codex 配置中的多 Agent 定义示例

```json
{
  "version": "0.145",
  "agents": {
    "parent": {
      "model": "gpt-5.5-codex",
      "reasoning": "high",
      "role": "orchestrator"
    },
    "coder": {
      "model": "gpt-5.5-codex-mini",
      "reasoning": "low",
      "role": "implementer"
    },
    "reviewer": {
      "model": "gpt-5.5-codex",
      "reasoning": "medium",
      "role": "security_reviewer",
      "constraints": ["no_secrets_in_logs", "check_sql_injection"]
    }
  }
}
```

通过为不同子 Agent 分配不同模型，Codex 把“按任务分配算力”做进了架构。这不仅是功能创新，更是成本效率的竞争壁垒。

---

## 三、透明度争议：加密指令与可观测性的冲突

0.145 最受争议的一点是：

> **父子 Agent 之间的指令改为加密传输，开发者无法直接查看委派内容。**

### 3.1 为什么 OpenAI 要加密？

官方理由可能包括：

- **保护模型推理过程**：子 Agent 接收的指令可能包含模型内部的“思考链”或私有策略。
- **防止提示词注入**：如果中间指令可被篡改，攻击者可能劫持子 Agent 的行为。
- **商业护城河**：让竞争对手难以逆向 Codex 的 Agent 编排策略。

### 3.2 为什么开发者反对？

从工程和安全角度看，这带来三个问题：

1. **可观测性下降**：你无法知道父 Agent 到底把什么任务派给了子 Agent，调试困难。
2. **审计缺失**：如果子 Agent 写了有问题的代码或访问了敏感资源，你无法回溯指令链。
3. **安全不可验证**：如果 Agent 执行了危险操作，安全团队无法确认是否是提示词注入导致。

Zolvat 的 CTO 已经在 GitHub 提交了一个修复请求，要求增加**非加密审计字段**（audit-only fields），即：加密传输保留，但允许开发者在本地启用明文审计日志，用于调试和合规。

### 3.3 一个可观测性折中方案

在官方解决方案出来之前，团队可以在 Codex 外层做一层审计：

```python
#!/usr/bin/env python3
"""
Codex 外层审计包装器示例：记录用户输入、工具调用、输出结果，
但不尝试解密父子 Agent 间加密通信。
"""

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path


def run_codex(prompt: str) -> dict:
    """调用 codex CLI 并捕获外层输出"""
    result = subprocess.run(
        ["codex", "--json", prompt],
        capture_output=True,
        text=True,
        timeout=300,
    )
    return {
        "stdout": result.stdout,
        "stderr": result.stderr,
        "returncode": result.returncode,
    }


def audit(prompt: str) -> None:
    """记录一次 Codex 调用的输入输出"""
    output = run_codex(prompt)
    record = {
        "timestamp": datetime.utcnow().isoformat(),
        "prompt": prompt,
        "output": output,
    }
    log_path = Path("codex_audit.log")
    with log_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python codex_audit.py '<prompt>'")
        sys.exit(1)
    audit(sys.argv[1])
```

这个脚本不能恢复加密指令，但至少能保留用户输入、工具调用和最终输出，为后续审计提供基础数据。

---

## 四、音频输入与实时对话：交互范式的转移

0.145 还引入了音频输入和实时 V3 对话。这看起来是个“方便功能”，但它的战略意义被低估：

> **它降低了新用户的学习成本，绕过了 Cursor/Claude Code 用户多年积累的习惯成本。**

当新用户不需要学习快捷键、不需要重建“打字→等回复”的节奏，只需要像和人说话一样对 Codex 说需求时，切换工具的心理摩擦就大幅下降。

这也意味着：AI 编程工具的交互界面正在从**键盘优先**向**多模态**演进。对工具厂商来说，下一个竞争焦点不是“谁的模型更强”，而是“谁的交互更自然、更无缝”。

---

## 五、市场影响：当迁移成本降到零，忠诚度还剩什么？

0.145 的潜台词很清楚：

> **AI 编程工具的护城河，从“功能”转向“低迁移成本 + 高成本效率 + 新交互范式”。**

具体影响：

1. **Cursor 和 Claude Code 的锁定优势被削弱**：配置不再是私有资产，而是可迁移数据。
2. **多 Agent 成为标配**：单一 Agent 一对一的交互模式将迅速过时。
3. **成本效率成为新战场**：谁能按任务分配算力，谁就能在企业采购中胜出。
4. **透明度成为合规门槛**：加密指令可能会在企业环境中受到安全团队抵制，除非提供审计能力。

---

## 六、对开发团队的实际建议

### 6.1 如果你是 Cursor / Claude Code 用户

- **评估迁移成本**：用 `/import` 跑一次，看看 Codex 是否能复现你现有工作流的 80% 体验。
- **不要一次性迁移核心项目**：先选 1-2 个非关键项目试点，验证多 Agent 的实际效果。
- **保留原有配置备份**：迁移工具可能无法 100% 还原语义，保留原配置以便回滚。

### 6.2 如果你是团队负责人

- **统一 Agent 配置标准**：无论用哪个工具，把规则、MCP 服务器、安全约束放在版本控制中，避免被某一家工具绑定。
- **审计多 Agent 输出**：即使加密指令无法查看，也要至少记录输入、工具调用和最终输出。
- **制定成本预算**：多 Agent 会让 token 消耗呈非线性增长，为不同任务设置模型和推理级别上限。

### 6.3 如果你是安全团队

- **将 Codex 纳入影子 IT 清单**：跟踪谁在用 /import 迁移了哪些 MCP 服务器和项目记忆。
- **要求非加密审计字段**：在官方支持之前，用外层日志和 EDR 补充可观测性。
- **评估 MCP 服务器的权限范围**：迁移时很可能把高权限 MCP 服务器一并带入 Codex，需要重新做最小权限审查。

---

## 七、总结：一次版本更新，一场战争

Codex CLI 0.145 不是一次普通的功能更新。它同时做了三件事：

1. **拆墙**：`/import` 把迁移成本降到零，让用户可以像换笔一样换工具。
2. **扩军**：Multi-Agent V2 把一对一编程变成一支可调度、可预算的 AI 小队。
3. **蒙眼**：加密指令降低了透明度，给可观测性和合规带来新的争议。

对 OpenAI 来说，这是一次“基础设施级别的吞并”。对其他工具来说，这是一个危险信号：当用户配置不再被锁定，品牌忠诚度的天花板就会被击穿。

但这也留下了一个关键问题：

> 当用户可以一键迁移，真正留住他们的，不再是“习惯的绑定”，而是“每一次交互的信任”。

一旦 Codex 出现一次准确度翻车或安全事件，一键迁移走的就不只是配置，还有用户的好感。

---

## 参考资料

- [OpenAI Codex CLI 0.145 Release Notes](https://github.com/openai/codex) — 官方更新日志
- [今日头条：OpenAI 一键把你的 Cursor 和 Claude Code 全搬到 Codex](https://www.toutiao.com/article/7665188738812707370) — 2026-07-22
- [腾讯新闻：vibe coding 日报，Codex 透明度争议](https://new.qq.com/rain/a/20260722A0C9W700) — 2026-07-22
- [OpenAI Codex CLI GitHub Issues](https://github.com/openai/codex/issues) — 透明度审计字段讨论
- [MCP 协议规范](https://modelcontextprotocol.io/) — MCP 服务器配置通用标准
