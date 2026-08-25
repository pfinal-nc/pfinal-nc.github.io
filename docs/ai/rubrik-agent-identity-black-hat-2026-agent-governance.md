---
title: Rubrik Agent Identity 深度解析：Black Hat 2026 的 AI Agent 身份治理范式
date: 2026-08-05
tags:
  - AI
  - security
  - MCP
keywords:
  - Rubrik
  - Agent Identity
  - Black Hat 2026
  - MCP Gateway
  - AI Agent 安全
category: ai
description: Black Hat 2026 上 Rubrik 发布 Agent Identity，通过 per-tool-call JIT Token、MCP Gateway 三重检查和 Agent Rewind 实现 AI Agent 身份治理。本文深度解析其架构设计与生产实践。
recommend: AI工程
---
# Rubrik Agent Identity 深度解析：Black Hat 2026 的 AI Agent 身份治理范式

## 背景：AI Agent 的身份危机

2026 年 8 月 4 日，Rubrik 在 Black Hat USA 2026 大会上发布 Agent Identity 解决方案。这不是又一个 AI 安全工具——它瞄准的是一个被整个行业忽视的结构性缺陷：**AI Agent 正在使用为人类设计的访问模型**。

Rubrik Zero Labs 的数据揭示了这个问题的严重性：

- **86%** 的 IT 和安全负责人预计 AI Agent 将在未来一年内超越组织的安全防护能力
- **仅 23%** 的组织对其环境中运行的 Agent 有完整可见性
- **88%** 的领导者担心在 Agent 威胁规模扩大时无法满足恢复时间目标

问题的本质是：当一个 Agent 被部署时，它通常获得一个为人类员工设计的凭据——一个宽泛的、长期有效的、静态的 OAuth Token 或 API Key。但 Agent 不是人类。它会在几秒内执行数十次工具调用，横跨 SaaS 应用、数据库和 API，且没有人类操作者的"直觉刹车"。

```
┌─────────────────────────────────────────────────────────────────┐
│            传统身份模型 vs Agent 身份模型                        │
│                                                                 │
│  传统模型（为人类设计）           Agent 模型（Rubrik 提出）       │
│  ┌──────────────┐                ┌──────────────────────┐       │
│  │ 静态 Token    │                │ Per-Tool-Call Token   │       │
│  │ (长期有效)    │     →          │ (单次调用，短时有效)   │       │
│  └──────────────┘                └──────────────────────┘       │
│  ┌──────────────┐                ┌──────────────────────┐       │
│  │ 宽泛权限      │                │ 最小权限              │       │
│  │ (全部 API)    │     →          │ (仅当前操作所需)       │       │
│  └──────────────┘                └──────────────────────┘       │
│  ┌──────────────┐                ┌──────────────────────┐       │
│  │ 无行为分析    │                │ SAGE 语义评估         │       │
│  │ (只看 Token)  │     →          │ (意图+风险+上下文)    │       │
│  └──────────────┘                └──────────────────────┘       │
│  ┌──────────────┐                ┌──────────────────────┐       │
│  │ 无回滚机制    │                │ Agent Rewind          │       │
│  │ (操作不可逆)  │     →          │ (精确撤销错误操作)    │       │
│  └──────────────┘                └──────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Agent Identity 架构解析

### 四大支柱

Rubrik Agent Cloud 平台围绕 Agent 生命周期建立了四大支柱，Agent Identity 是其中"控制"环节的核心：

| 支柱 | 职责 | 对应传统安全概念 |
|------|------|------------------|
| Agent Observability | 运行时监控所有 Agent 和 MCP 服务器 | SIEM / EDR |
| **Agent Identity** | 每次工具调用的即时权限控制 | IAM / PAM |
| Agent Runtime Security | SAGE 意图驱动策略执行 | WAF / DLP |
| Agent Rewind | 撤销 Agent 的破坏性操作 | 备份恢复 |

### MCP Gateway 三重检查点

Agent Identity 的核心是 MCP Gateway——每个工具调用在执行前必须通过三个检查点：

```
Agent 请求调用工具 listAccounts
         │
         ▼
┌─────────────────────────────────────┐
│  Checkpoint 1: Behavioral Analysis   │
│                                     │
│  SAGE 引擎语义评估：                  │
│  - 工具调用意图                       │
│  - 输入参数                          │
│  - 上下文信息                        │
│  - 潜在操作影响                       │
│                                     │
│  判断: 允许 / 需要人工审批 / 阻止     │
└──────────────┬──────────────────────┘
               │ 通过
               ▼
┌─────────────────────────────────────┐
│  Checkpoint 2: Access Policy         │
│                                     │
│  基础设施层策略验证：                  │
│  - 用户/组权限                       │
│  - 资源访问策略                      │
│  - SAGE 上下文增强                    │
│                                     │
│  判断: 当前用户+Agent 组合是否有权    │
└──────────────┬──────────────────────┘
               │ 通过
               ▼
┌─────────────────────────────────────┐
│  Checkpoint 3: Identity Verification │
│                                     │
│  Agent 会话认证 + Token 铸造：        │
│  - 验证 Agent 身份                   │
│  - 铸造 scoped 短时 Token            │
│  - Token 仅限当前工具调用             │
│                                     │
│  Token → 执行工具调用                 │
└─────────────────────────────────────┘
```

**读写分离策略**：读操作（如 `listAccounts`、`getTransactions`）默认放行并配发 scoped Token；写操作和修改操作（如 `updateAccount`）需要显式策略授权，否则在执行前被直接阻断——不是事后告警，是事前阻断。

### On-Behalf-Of 联邦身份

Agent Identity 不创建新的身份目录，而是扩展现有 IAM 基础设施：

```
┌──────────────────────────────────────────────┐
│         On-Behalf-Of 身份联邦                │
│                                              │
│  ┌─────────┐    ┌──────────┐    ┌─────────┐  │
│  │  Okta   │    │ Entra ID │    │ 其他IdP │  │
│  └────┬────┘    └────┬─────┘    └────┬────┘  │
│       │              │               │       │
│       └──────────┬───┴───────────────┘       │
│                  │                           │
│                  ▼                           │
│         ┌────────────────┐                   │
│         │ Rubrik Agent    │                   │
│         │ Identity Gateway│                   │
│         └───────┬────────┘                   │
│                 │                            │
│        ┌────────┴────────┐                   │
│        ▼                 ▼                   │
│   ┌─────────┐      ┌──────────┐              │
│   │ Agent A  │      │ Agent B  │              │
│   │ 代用户X  │      │ 代用户Y  │              │
│   │ 执行读   │      │ 尝试写   │              │
│   └─────────┘      └──────────┘              │
│                     │                       │
│                     ▼                       │
│              写操作被阻断                    │
│              （无显式策略）                   │
└──────────────────────────────────────────────┘
```

设计原则：Agent 永远代表特定人类用户行动，使用 scoped、delegated access，**绝不使用共享账户或嵌入式密钥**。

## 生产级实现：基于 MCP Gateway 的访问控制

### 架构实现

以下是一个基于 MCP Gateway 模式的生产级访问控制实现，灵感来自 Rubrik Agent Identity 的设计理念：

```python
"""
MCP Gateway 访问控制中间件
灵感来源: Rubrik Agent Identity (Black Hat 2026)
功能: per-tool-call JIT Token + 行为分析 + 读写分离
"""

import time
import hashlib
import json
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable

from fastapi import Request, HTTPException
from pydantic import BaseModel


class ToolAction(str, Enum):
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    EXECUTE = "execute"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ToolDefinition:
    """MCP 工具定义"""
    name: str
    description: str
    action: ToolAction
    required_permissions: list[str]
    risk_level: RiskLevel = RiskLevel.LOW


@dataclass
class ScopedToken:
    """单次工具调用令牌"""
    token_id: str
    tool_name: str
    user_id: str
    agent_id: str
    expires_at: float
    action: ToolAction
    permissions: list[str]

    def is_valid(self) -> bool:
        return time.time() < self.expires_at

    def to_dict(self) -> dict:
        return {
            "token_id": self.token_id,
            "tool": self.tool_name,
            "user": self.user_id,
            "agent": self.agent_id,
            "action": self.action.value,
            "expires_at": self.expires_at,
            "permissions": self.permissions,
        }


class SAGEEngine:
    """
    语义分析与治理引擎
    对应 Rubrik SAGE: 意图驱动的策略评估
    """

    def __init__(self):
        self.policies: list[dict] = []
        self.risk_patterns = self._load_risk_patterns()

    def evaluate(
        self,
        tool: ToolDefinition,
        params: dict[str, Any],
        context: dict[str, Any],
    ) -> tuple[bool, RiskLevel, str]:
        """
        评估工具调用请求
        返回: (是否允许, 风险等级, 原因)
        """
        # 检查参数中是否包含敏感数据
        risk = self._assess_param_risk(params, tool)

        # 写操作需要更高审查
        if tool.action in (ToolAction.WRITE, ToolAction.DELETE):
            if tool.risk_level == RiskLevel.CRITICAL:
                return False, RiskLevel.CRITICAL, "关键写操作需人工审批"
            if risk == RiskLevel.HIGH:
                return False, RiskLevel.HIGH, "参数包含高风险模式"

        # 检查上下文中是否有异常
        if context.get("concurrent_calls", 0) > 100:
            return False, RiskLevel.HIGH, "并发调用超限，疑似自动化攻击"

        return True, risk, "评估通过"

    def _assess_param_risk(
        self, params: dict, tool: ToolDefinition
    ) -> RiskLevel:
        """评估参数风险"""
        param_str = json.dumps(params)

        high_risk_patterns = [
            "rm -rf", "DROP TABLE", "DELETE FROM",
            "sudo", "chmod 777", "curl ", "wget ",
            "../", "..\\", "/etc/passwd", "/etc/shadow",
        ]

        for pattern in high_risk_patterns:
            if pattern.lower() in param_str.lower():
                return RiskLevel.HIGH

        if tool.action == ToolAction.EXECUTE:
            return RiskLevel.MEDIUM

        return RiskLevel.LOW

    def _load_risk_patterns(self) -> list[str]:
        return [
            "command_injection",
            "path_traversal",
            "sql_injection",
            "ssrf",
            "data_exfiltration",
        ]


class MCPGateway:
    """
    MCP 网关: 三重检查点实现
    """

    def __init__(self, sage: SAGEEngine):
        self.sage = sage
        self.tool_registry: dict[str, ToolDefinition] = {}
        self.active_tokens: dict[str, ScopedToken] = {}
        self.audit_log: list[dict] = []

    def register_tool(self, tool: ToolDefinition):
        """注册 MCP 工具"""
        self.tool_registry[tool.name] = tool

    async def authorize_tool_call(
        self,
        request: Request,
        tool_name: str,
        params: dict[str, Any],
        agent_id: str,
        user_id: str,
    ) -> ScopedToken:
        """
        三重检查点授权流程
        """

        # 检查工具是否存在
        tool = self.tool_registry.get(tool_name)
        if not tool:
            raise HTTPException(404, f"未知工具: {tool_name}")

        context = {
            "agent_id": agent_id,
            "user_id": user_id,
            "client_ip": request.client.host if request.client else "unknown",
            "concurrent_calls": self._count_concurrent(agent_id),
            "timestamp": time.time(),
        }

        # === Checkpoint 1: 行为分析 ===
        allowed, risk, reason = self.sage.evaluate(tool, params, context)

        self._log_audit(
            agent_id, user_id, tool_name,
            "behavioral_analysis",
            allowed, reason, risk
        )

        if not allowed:
            raise HTTPException(403, f"行为分析未通过: {reason}")

        # === Checkpoint 2: 访问策略 ===
        if not self._check_access_policy(user_id, agent_id, tool, params):
            self._log_audit(
                agent_id, user_id, tool_name,
                "access_policy", False,
                "策略拒绝", risk
            )
            raise HTTPException(403, "访问策略拒绝")

        # === Checkpoint 3: 身份验证 + Token 铸造 ===
        token = self._mint_scoped_token(tool, user_id, agent_id)

        self._log_audit(
            agent_id, user_id, tool_name,
            "identity_verified", True,
            f"Token 铸造: {token.token_id[:16]}...", risk
        )

        return token

    def _check_access_policy(
        self,
        user_id: str,
        agent_id: str,
        tool: ToolDefinition,
        params: dict,
    ) -> bool:
        """
        访问策略检查
        读写分离: 读操作默认放行，写操作需显式策略
        """
        if tool.action == ToolAction.READ:
            return True  # 读操作默认放行

        # 写/删/执行操作需要显式策略
        policy_key = f"{user_id}:{agent_id}:{tool.name}:{tool.action.value}"
        return self._has_explicit_policy(policy_key)

    def _has_explicit_policy(self, key: str) -> bool:
        """检查是否存在显式授权策略"""
        return False  # 生产环境查询策略数据库

    def _mint_scoped_token(
        self,
        tool: ToolDefinition,
        user_id: str,
        agent_id: str,
    ) -> ScopedToken:
        """铸造单次使用的 scoped Token"""
        token_id = hashlib.sha256(
            f"{agent_id}:{tool.name}:{time.time()}".encode()
        ).hexdigest()

        token = ScopedToken(
            token_id=token_id,
            tool_name=tool.name,
            user_id=user_id,
            agent_id=agent_id,
            expires_at=time.time() + 30,  # 30 秒有效
            action=tool.action,
            permissions=tool.required_permissions,
        )

        self.active_tokens[token_id] = token
        return token

    def verify_token(self, token_id: str, tool_name: str) -> ScopedToken:
        """验证并消费 Token（一次性使用）"""
        token = self.active_tokens.get(token_id)
        if not token:
            raise HTTPException(401, "Token 不存在")

        if not token.is_valid():
            del self.active_tokens[token_id]
            raise HTTPException(401, "Token 已过期")

        if token.tool_name != tool_name:
            raise HTTPException(403, "Token 工具不匹配")

        # 消费 Token（一次性）
        del self.active_tokens[token_id]
        return token

    def _count_concurrent(self, agent_id: str) -> int:
        """统计 Agent 当前活跃调用数"""
        return sum(
            1 for t in self.active_tokens.values()
            if t.agent_id == agent_id and t.is_valid()
        )

    def _log_audit(self, *args):
        """审计日志"""
        entry = {
            "timestamp": time.time(),
            "agent_id": args[0],
            "user_id": args[1],
            "tool": args[2],
            "checkpoint": args[3],
            "result": args[4],
            "reason": args[5],
            "risk": args[6].value if isinstance(args[6], RiskLevel) else str(args[6]),
        }
        self.audit_log.append(entry)


# === 使用示例 ===

# 初始化
sage = SAGEEngine()
gateway = MCPGateway(sage)

# 注册 MCP 工具
gateway.register_tool(ToolDefinition(
    name="listAccounts",
    description="列出银行账户",
    action=ToolAction.READ,
    required_permissions=["accounts:read"],
    risk_level=RiskLevel.LOW,
))

gateway.register_tool(ToolDefinition(
    name="updateAccount",
    description="更新账户信息",
    action=ToolAction.WRITE,
    required_permissions=["accounts:write"],
    risk_level=RiskLevel.HIGH,
))

gateway.register_tool(ToolDefinition(
    name="executeTransfer",
    description="执行转账操作",
    action=ToolAction.EXECUTE,
    required_permissions=["transfers:execute"],
    risk_level=RiskLevel.CRITICAL,
))
```

### Agent Rewind 实现

Agent Rewind 是 Agent Identity 的差异化能力——不仅能阻止未授权操作，还能精确撤销已执行的错误操作：

```python
"""
Agent Rewind: 操作回滚引擎
记录 Agent 的每次操作，支持精确撤销
"""

import copy
from dataclasses import dataclass, field
from typing import Any, Callable
from datetime import datetime


@dataclass
class OperationRecord:
    """操作记录"""
    op_id: str
    agent_id: str
    user_id: str
    tool_name: str
    params: dict[str, Any]
    result: Any
    timestamp: datetime
    undo_fn: Callable | None = None  # 可选的撤销函数
    state_snapshot: dict | None = None  # 操作前的状态快照


class AgentRewind:
    """操作回滚引擎"""

    def __init__(self, max_history: int = 10000):
        self.history: list[OperationRecord] = []
        self.max_history = max_history

    def record(
        self,
        op_id: str,
        agent_id: str,
        user_id: str,
        tool_name: str,
        params: dict,
        result: Any,
        undo_fn: Callable | None = None,
        state_snapshot: dict | None = None,
    ):
        """记录一次操作"""
        record = OperationRecord(
            op_id=op_id,
            agent_id=agent_id,
            user_id=user_id,
            tool_name=tool_name,
            params=copy.deepcopy(params),
            result=copy.deepcopy(result),
            timestamp=datetime.now(),
            undo_fn=undo_fn,
            state_snapshot=copy.deepcopy(state_snapshot) if state_snapshot else None,
        )
        self.history.append(record)

        # 保持历史长度
        if len(self.history) > self.max_history:
            self.history = self.history[-self.max_history:]

    def rewind(self, op_id: str) -> bool:
        """撤销指定操作"""
        record = self._find_record(op_id)
        if not record:
            return False

        if record.undo_fn:
            try:
                record.undo_fn(record.params, record.result)
                return True
            except Exception as e:
                print(f"撤销失败: {e}")
                return False

        if record.state_snapshot:
            # 恢复状态快照
            return self._restore_snapshot(record)

        return False

    def rewind_agent(self, agent_id: str, last_n: int = 10) -> int:
        """撤销 Agent 最近 N 次操作"""
        agent_ops = [
            r for r in reversed(self.history)
            if r.agent_id == agent_id
        ][:last_n]

        undone = 0
        for record in agent_ops:
            if self.rewind(record.op_id):
                undone += 1
        return undone

    def _find_record(self, op_id: str) -> OperationRecord | None:
        for r in self.history:
            if r.op_id == op_id:
                return r
        return None

    def _restore_snapshot(self, record: OperationRecord) -> bool:
        """恢复状态快照（具体实现取决于存储后端）"""
        # 生产环境: 恢复数据库行/对象存储文件/配置
        print(f"恢复状态快照: {record.state_snapshot}")
        return True
```

## Agent Identity vs 传统 IAM 对比

| 维度 | 传统 IAM | Rubrik Agent Identity |
|------|---------|----------------------|
| 授权粒度 | 会话级 / 部署级 | 单次工具调用级 |
| Token 有效期 | 长期（小时/天） | 单次调用（秒级） |
| 权限范围 | 宽泛（全部 API） | Scoped（仅当前操作） |
| 行为分析 | 无 | SAGE 语义评估 |
| 读写分离 | 通常无 | 读默认放行，写需显式策略 |
| 回滚能力 | 无 | Agent Rewind 精确撤销 |
| 身份联邦 | 人类用户 | On-Behalf-Of 扩展到 Agent |
| 审计粒度 | 会话级 | 工具调用级 |

## 对 MCP 生态的影响

### MCP Gateway 作为安全检查点

MCP（Model Context Protocol）2026 年 7 月 28 日发布无状态重构后，协议层不再管理会话状态，这意味着状态管理责任完全下沉到应用层。Rubrik 的 MCP Gateway 正是填补了这个空白——在"无状态协议"和"有状态应用"之间建立了一层安全控制。

```
MCP 客户端 → [无状态协议层] → MCP Gateway → [三重检查] → MCP 服务器 → 工具执行
                              ↑
                    Rubrik Agent Identity
                    在这里插入安全控制
```

### 与其他 Agent 安全方案的对比

| 方案 | 定位 | 优势 | 局限 |
|------|------|------|------|
| Rubrik Agent Identity | 身份+访问控制+回滚 | 全生命周期治理 | 闭源商业方案 |
| OWASP ASI06 | 记忆与上下文投毒防御 | 标准化框架 | 仅覆盖记忆层 |
| Docker AI Governance | Agent 沙箱隔离 | 容器级隔离 | 不覆盖身份层 |
| MCP Enterprise Auth | OAuth 2.1 企业授权 | 协议级标准化 | 不覆盖行为分析 |

## 生产落地建议

### 三步快速加固

Rubrik 推荐的三步加固路径，即使是小型团队也能从第一天开始执行：

**Step 1：建立 Agent 身份清单**

```python
# 发现并编目所有活跃 Agent
def discover_agents():
    """扫描环境中所有活跃的 AI Agent"""
    agents = []
    # 扫描 MCP 服务器
    for mcp_server in scan_mcp_servers():
        agents.extend(extract_agents(mcp_server))
    # 扫描 API Key 使用
    for key in scan_api_keys():
        agents.extend(extract_agents_from_key(key))
    # 扫描 OAuth Token
    for token in scan_oauth_tokens():
        agents.extend(extract_agents_from_token(token))
    return agents

# 输出示例
# [
#   {"agent_id": "agent-001", "type": "claude-code", "tools": ["github", "slack"], "owner": "dev-team"},
#   {"agent_id": "agent-002", "type": "langflow", "tools": ["database", "email"], "owner": "marketing"},
# ]
```

**Step 2：委派最小权限访问**

- Agent 必须代表特定人类用户行动
- 使用 On-Behalf-Of 而非共享账户
- 永远不使用嵌入式 API Key

**Step 3：强制即时令牌**

- 消除所有长期有效的 Token
- 每次工具调用铸造 scoped Token
- 读写分离策略

## 总结

Rubrik Agent Identity 在 Black Hat 2026 上提出的不是另一个安全产品，而是一个范式转变：**AI Agent 需要为自主执行场景设计的身份模型**。

传统 IAM 为人类设计——人类操作有频率限制、有直觉刹车、有行为模式。Agent 没有这些。一个被攻陷的 Agent 可以在几秒内执行数百次工具调用，横跨企业所有 SaaS 应用，造成的破坏是人类攻击者的 10 倍，而检测时间仅为 1/10。

Agent Identity 的三个核心设计值得整个行业学习：
1. **Per-tool-call 授权**——从会话级降维到单次调用级
2. **读写分离**——读操作默认放行，写操作需显式策略
3. **Agent Rewind**——不只是阻止，还能撤销

在 MCP 无状态化、A2A 协议 150+ 生产部署、中国 GB/Z 185-2026 智能体互联互通国标发布的大背景下，Agent 身份治理将成为 2026 下半年 AI 基础设施安全的核心议题。

## 参考资料

- [Rubrik Agent Identity 官方博客](https://www.rubrik.com/blog/technology/26/8/introducing-rubrik-agent-identity-identity-for-agents-control-for-actions)
- [Rubrik Black Hat 2026 Press Release](https://ir.rubrik.com/news-events/press-releases/news-details/2026/Rubrik-Unveils-Agent-Identity-to-Secure-Agentic-Actions-in-Real-Time/default.aspx)
- [AiToolsObserver: Per-call AI Agent Governance](https://aitoolsobserver.com/hub/rubrik-launches-agent-identity-to-control-ai-agents-one-tool-call-at-a-time)
- [Rubrik Zero Labs 研究报告](https://rubrik.com/zero-labs)
- [MCP 2026-07-28 无状态规范](https://modelcontextprotocol.io/specification)
