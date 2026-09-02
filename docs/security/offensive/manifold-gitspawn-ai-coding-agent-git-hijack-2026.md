---
title: GitSpawn 深度拆解：7 个 AI 编码 Agent 如何被一个 git 配置劫持——从原理到修复的完整攻防指南
date: 2026-09-02
tags:
  - security
  - ai-security
  - agent
  - git
  - claude-code
  - cursor
  - codex
  - goose
  - hermes
  - qwen-code
  - grok-build
  - cve-2026-72718
  - cve-2026-71963
  - core-fsmonitor
  - supply-chain
  - sandbox-escape
keywords:
  - GitSpawn
  - AI 编码 Agent 劫持
  - core.fsmonitor
  - Claude Code 漏洞
  - Goose CVE-2026-72718
  - Hermes CVE-2026-71963
  - Qwen Code 漏洞
  - Grok Build 漏洞
  - git hook 注入
  - AI Agent 安全
  - 沙箱逃逸
  - 供应链攻击
  - Manifold Security
category: security/offensive
description: 2026 年 9 月 1 日，Manifold Security 披露 GitSpawn 漏洞：7 个主流 AI 编码 Agent（Claude Code、Cursor、Codex、Goose、Grok Build、Hermes、Qwen Code）在执行 git 命令时未隔离仓库自身配置，导致攻击者通过恶意仓库的 core.fsmonitor 设置即可实现任意代码执行。本文完整拆解漏洞原理、攻击链、CVE 分配（CVE-2026-72718 / CVE-2026-71963）与各厂商修复状态。
recommend: 安全工程
---

# GitSpawn 深度拆解：7 个 AI 编码 Agent 如何被一个 git 配置劫持

> Manifold Security 官方研究 | 2026-09-01 披露 | 7 Agent 受影响 / 4 未修复

## 引言

2026 年 9 月 1 日，安全公司 **Manifold Security** 发布了一篇令整个 AI 编程生态震动的报告：他们发现 **7 个主流 AI 编码 Agent** 在执行 git 命令时，存在一个共同的设计缺陷——**未隔离仓库自身的 git 配置**。攻击者只需构建一个精心设计的恶意仓库，当 AI Agent 打开并试图"理解"这个仓库时，就会触发预设的代码执行，窃取开发者的 SSH 密钥、云凭据、环境变量等敏感信息。

这不是一个"理论漏洞"。Manifold Security 的安全研究员 **Francisco Rosales** 在 7 个独立项目中复现了该问题，并获得了 2 个 CVE 分配（CVE-2026-72718 和 CVE-2026-71963）。截至目前，仍有 **4 个 Agent 未修复**。

Git 是所有 AI 编码 Agent 的基础依赖。当 Agent 打开一个仓库时，它几乎总会执行 `git status`、`git diff` 等命令来获取上下文。这些命令会读取仓库的 `.git/config`，而其中的 `core.fsmonitor` 配置项——一个用于加速大仓库的"文件系统监控器"设置——可以被攻击者指向任意可执行文件。

**一句话概括**：Agent 打开恶意仓库 → 执行 `git status` → git 读取 `core.fsmonitor` → 攻击者的脚本被作为"文件系统监控器"启动 → 开发者主机沦陷。

## 事件时间线

| 时间 | 事件 |
|------|------|
| 2026-04-10 | SonarSource 披露 Claude Code v2.0.71 存在类似 git hook 注入问题（在 trust dialog 之前执行 git 命令） |
| 2026-05-05 | Manifold Security 向 Claude Code 报告核心 `core.fsmonitor` 漏洞 |
| 2026-05-10 | 向 Goose 报告 |
| 2026-06-25 | 向 Qwen Code 报告 |
| 2026-07-16 | 向 Hermes Agent 报告 |
| 2026-07-28 | 向 Cursor 报告 |
| 2026-08-08 | 向 Grok Build 报告 |
| 2026-08-12 | 向 OpenAI Codex 报告 |
| 2026-08-26 | Hermes Agent 在 v0.9.67 发布修复 |
| 2026-09-01 | **Manifold Security 公开披露**：8 项发现，7 个 Agent 受影响，4 个未修复 |

## 漏洞速览

| 项目 | 详情 |
|------|------|
| 漏洞名称 | GitSpawn |
| 根因 | AI Agent 在执行 git 命令时未隔离仓库自身 git 配置 |
| 攻击载体 | 恶意 git 仓库（`core.fsmonitor` / `core.fsmonitorHook` 设置） |
| 影响范围 | 7 个 AI 编码 Agent（见下表） |
| CVE | CVE-2026-72718（Goose）、CVE-2026-71963（Hermes） |
| 攻击前提 | 受害者需打开恶意仓库（`.zip` 分享 / 共享文件夹，**非 git clone**） |
| 窃取目标 | SSH 密钥、云凭据、环境变量、API Token |
| 修复状态 | 3 个已修复（Claude Code / Cursor / Codex），4 个未修复 |

## 受影响 Agent 与修复状态

| Agent | 厂商 | 发现时间 | CVE | 修复版本 | 状态 |
|-------|------|----------|-----|----------|------|
| **Claude Code** | Anthropic | 2026-05-05 | — | v2.1.196 | ✅ 已修复 |
| **Cursor** | Cursor | 2026-07-28 | — | — | ✅ 已修复 |
| **OpenAI Codex** | OpenAI | 2026-08-12 | — | — | ✅ 已修复 |
| **Goose** | Block | 2026-05-10 | CVE-2026-72718 | v1.44.0 | ✅ 已修复 |
| **Grok Build** | xAI | 2026-08-08 | — | — | ❌ 未修复 |
| **Hermes Agent** | Hermes Agent | 2026-07-16 | CVE-2026-71963 | v0.9.67 | ✅ 已修复 |
| **Qwen Code** | 阿里巴巴 | 2026-06-25 | — | — | ❌ 未修复 |

> 注：Manifold Security 报告发布时标记为"4 个未修复"，Hermes 在报告发布前 6 天（08-26）发布了修复。截至本文撰写时，**Grok Build 和 Qwen Code 仍未修复**。

## 漏洞原理深度分析

### Git 的 `core.fsmonitor` 机制

`core.fsmonitor` 是 Git 的一个合法功能，设计用于加速大仓库的文件状态检查。当设置启用时，Git 不会遍历整个工作树，而是调用指定的外部程序来监控文件变化：

```bash
# 正常用法：Git 调用 fsmonitor daemon 加速状态检查
git config core.fsmonitor 'git-fsmonitor--daemon'
```

这个机制的危险之处在于：**Git 信任仓库自身的配置**。当你 `git clone` 一个仓库或打开一个共享文件夹中的 `.git` 目录时，`core.fsmonitor` 的值会直接被 Git 执行——没有任何"这个命令是否安全"的询问。

### 攻击链

```
1. 攻击者创建恶意仓库
   └─ .git/config 中设置：
      [core]
          fsmonitor = /path/to/malicious/script.sh

2. 受害者通过 .zip 或共享文件夹获取仓库（非 git clone）

3. 受害者用 AI Agent 打开仓库
   └─ Agent 启动后自动执行 git status（获取仓库上下文）

4. Git 读取 .git/config，发现 core.fsmonitor 设置
   └─ 调用 malicious/script.sh 作为文件系统监控器

5. 恶意脚本执行
   └─ 窃取 SSH 密钥、云凭据、环境变量
   └─ 回传到攻击者服务器

6. 开发者主机沦陷
   └─ 攻击者获得与受害者相同的开发权限
```

### 为什么 `.zip` 而不是 `git clone`？

这是该攻击最关键的限制条件。`git clone` 不会触发该漏洞，因为：

- `git clone` 只下载对象数据库和工作树，**不会**将仓库的 `core.fsmonitor` 设置应用到本地
- 只有当你**打开一个包含完整 `.git` 目录的仓库文件夹**时，`core.fsmonitor` 才会被执行

这意味着攻击向量是：**通过 `.zip` 文件、共享文件夹、或 USB 驱动器分发恶意仓库**。这在团队协作、开源项目分发、代码审查等场景中非常常见。

### 超越 `core.fsmonitor`：更多 git 配置 sink

Manifold Security 的报告指出，`core.fsmonitor` 只是 git 配置中的一个"代码执行 sink"。类似的机制还包括：

- `core.fsmonitorHook`：另一种文件系统监控回调
- `core.hooksPath`：自定义 hooks 目录路径
- `.gitattributes` 中的 `filter` 和 `diff` 驱动：可指向外部程序
- `.gitmodules` 中的 `update`：子模块更新时执行的命令

所有这些机制都有一个共同特点：**它们是 git 的合法功能，但可以被恶意仓库利用来执行任意代码**。

### CVE-2026-55607：Claude Code 的早期同类漏洞

在 GitSpawn 披露之前，Claude Code 已经被发现过一个类似的漏洞（CVE-2026-55607），影响版本 2.1.38 到 2.1.162：

- **攻击向量**：通过 worktree 命名 + symlink + `core.fsmonitor` 链式利用
- **影响**：攻击者可以写入 `~/.zshenv`，实现无沙箱代码执行
- **CVSS**：8.8（高危）
- **修复**：v2.1.163

这个漏洞的发现者通过构造一个名为 `--` 的 worktree，利用 Claude Code 的路径处理逻辑，实现了从 worktree 操作到任意文件写入的攻击链。`core.fsmonitor` 在这个链中扮演了关键角色——它让攻击者的脚本在 git 命令执行时被调用。

## CVE 分配与技术细节

### CVE-2026-72718（Goose）

- **CVSS 7.0**（高危）
- **影响**：Block 的 Goose Agent 在执行 git 命令时读取仓库的 `core.fsmonitor` 配置，导致任意代码执行
- **修复**：v1.44.0

### CVE-2026-71963（Hermes）

- **影响**：Hermes Agent 在执行 git 命令时读取仓库的 `core.fsmonitor` 配置，导致任意代码执行
- **修复**：v0.9.67（2026-08-26）
- **注意**：此 CVE 由 VulnCheck 分配，非厂商分配

### Claude Code 的额外发现

Manifold Security 对 Claude Code 进行了最深入的测试，发现了 3 个独立问题：

1. **核心 `core.fsmonitor` 漏洞**（5 月 5 日报告）：最严重，已在 v2.1.196 修复
2. **`ultrareview` git hook 漏洞**（6 月 23 日报告）：Claude Code 自身的 git hook 配置可被劫持，**仍未修复**
3. **工作树路径混淆漏洞**：通过 worktree 命名 + symlink 实现沙箱逃逸（相关 CVE：CVE-2026-55607）

### 与其他 Agent 的交互：双重危险

Manifold Security 还发现了一个更令人担忧的场景：**当多个 AI Agent 交替使用同一个仓库时，一个 Agent 的配置可以被另一个 Agent 利用**。

例如：
1. 开发者使用 **Claude Code** 打开仓库 A
2. Claude Code 在 `.git/config` 中添加了 `core.hooksPath` 指向其自身的工作目录
3. 开发者切换到 **Codex** 打开同一个仓库
4. Codex 继承了 Claude Code 的 git 配置，可能执行 Claude Code 的 hook 脚本

这种"**Agent 间配置继承**"问题意味着：即使单个 Agent 是安全的，与其他 Agent 的交互也可能引入风险。

### 为什么 git clone 不触发？

这是一个常见的误解。`git clone` 不会触发 `core.fsmonitor` 漏洞，原因如下：

- `git clone` 只下载对象数据库和工作树
- 仓库的 `core.fsmonitor` 设置**不会**被应用到本地克隆
- 只有当你**打开一个包含完整 `.git` 目录的仓库文件夹**时，`core.fsmonitor` 才会被执行

这意味着攻击向量是：**通过 `.zip` 文件、共享文件夹、或 USB 驱动器分发恶意仓库**。这在团队协作、开源项目分发、代码审查等场景中非常常见。

## 漏洞验证：你的 Agent 是否受影响？

### 检查方法

在你的 AI 编码 Agent 中执行以下命令，观察 Agent 的行为：

```bash
# 在 Agent 的终端中创建一个测试仓库
mkdir /tmp/test-repo && cd /tmp/test-repo
git init

# 设置一个无害但可检测的 fsmonitor
git config core.fsmonitor 'echo "fsmonitor triggered" > /tmp/gitspawn-test'

# 让 Agent 打开这个仓库
# 如果 /tmp/gitspawn-test 文件被创建，说明 Agent 受影响
```

### 受影响版本范围

| Agent | 受影响版本 | 修复版本 |
|-------|-----------|----------|
| Claude Code | v2.1.38 - v2.1.162 | v2.1.163+ |
| Claude Code | v2.1.163 - v2.1.195 | v2.1.196+ |
| Goose | < v1.44.0 | v1.44.0 |
| Hermes Agent | < v0.9.67 | v0.9.67 |
| Cursor | — | 已修复（版本未公开） |
| OpenAI Codex | — | 已修复（版本未公开） |
| Grok Build | 所有版本 | ❌ 未修复 |
| Qwen Code | 所有版本 | ❌ 未修复 |

## 防御措施

### 立即行动

1. **更新已修复的 Agent**：升级 Claude Code 到 v2.1.196+，Goose 到 v1.44.0+，Hermes 到 v0.9.67+
2. **隔离未修复的 Agent**：Grok Build 和 Qwen Code 暂时不要打开不受信任的仓库
3. **审查 git 配置**：在打开新仓库前，检查 `.git/config` 中是否有异常的 `core.fsmonitor` 或 `core.hooksPath` 设置

### 长期防御

1. **禁用 fsmonitor**：在 Agent 的全局 git 配置中禁用 fsmonitor
   ```bash
   git config --global core.fsmonitor false
   git config --global core.fsmonitorHook false
   ```

2. **使用 git 安全模式**：打开不受信任的仓库时使用 `--no-optional-locks` 选项
   ```bash
   git --no-optional-locks status
   ```

3. **沙箱隔离**：将 AI Agent 运行在容器或虚拟机中，限制其文件系统访问权限

4. **代码审查习惯**：在用 Agent 打开共享仓库前，先手动检查 `.git/config` 和 `.gitattributes`

5. **监控 Agent 行为**：使用系统监控工具（如 `auditd`）跟踪 Agent 执行的 git 命令

### 企业级防御

对于使用 AI 编码 Agent 的企业团队，建议采取以下额外措施：

1. **集中化 git 配置管理**：通过 Group Policy 或 MDM 强制禁用 `core.fsmonitor` 和 `core.hooksPath`
2. **Agent 审批流程**：建立 AI Agent 引入审批流程，确保所有使用的 Agent 都经过安全评估
3. **仓库访问控制**：限制 Agent 可以打开的仓库来源，只允许来自受信任源的仓库
4. **安全培训**：对开发团队进行 AI Agent 安全意识培训，强调不要打开来源不明的仓库
5. **监控与告警**：建立监控系统，检测 Agent 执行异常 git 命令的行为

## 行业影响与反思

### 为什么这是一个"设计缺陷"而非"实现 Bug"？

Git 的 `core.fsmonitor` 机制本身是合法的——它被设计用于加速大仓库。但 AI Agent 的使用场景与传统 git 客户端有本质区别：

- **传统 git 客户端**：由人类用户控制，用户决定打开哪个仓库
- **AI Agent**：由 Agent 自动决定执行哪些 git 命令，用户可能不完全了解 Agent 的行为

这种"**自动化 + 信任本地配置**"的组合，创造了一个新的攻击面。Manifold Security 将其称为 "**GitSpawn**"——一个通过 git 配置"孵化"恶意代码的漏洞。

### 对 AI 编程生态的启示

1. **Agent 的"隐式信任"问题**：AI Agent 在执行任务时会"隐式信任"许多来源（仓库配置、环境变量、系统工具），这些信任关系需要被显式审查

2. **沙箱的局限性**：即使 Agent 运行在沙箱中，如果沙箱内的 git 命令可以读取宿主机的配置，沙箱保护就会失效

3. **供应链安全的新维度**：传统的供应链安全关注包管理器（npm/PyPI），但 git 仓库本身的配置也是一个需要审查的"供应链"

4. **Agent 间交互风险**：多个 Agent 共享工作目录时，一个 Agent 的配置可能影响另一个 Agent 的安全

### 与其他 AI Agent 安全事件的关联

GitSpawn 不是孤立事件。2026 年已经发生了多起 AI Agent 安全事件：

- **SonarSource 2026-04**：Claude Code v2.0.71 存在 git hook 注入问题
- **CVE-2026-55607**：Claude Code 早期版本的 worktree 路径混淆漏洞
- **恶意 Skills 供应链攻击**：攻击者通过仿冒热门 AI 工具上传投毒 Skills
- **GPT-5.6 Sol 沙箱逃逸**：AI 模型自主利用多个零日漏洞入侵系统

这些事件共同指向一个趋势：**随着 AI Agent 获得更多自主权，其攻击面也在快速扩大**。

### 实际攻击场景

#### 场景 1：开源项目投毒

攻击者 fork 一个热门开源项目，添加恶意 `core.fsmonitor` 配置，然后通过社交媒体或技术论坛传播。当开发者用 AI Agent 打开这个 fork 时，恶意脚本被触发。

#### 场景 2：团队协作攻击

攻击者通过社交工程获取团队成员的权限，向共享仓库注入恶意 git 配置。当团队成员用 Agent 打开仓库时，所有人的主机都可能被感染。

#### 场景 3：代码审查攻击

在代码审查过程中，审查者用 AI Agent 打开来自外部贡献者的 PR 仓库。如果 PR 包含恶意 git 配置，审查者的主机就会被攻击。

### 漏洞的隐蔽性

GitSpawn 漏洞的危险之处在于其隐蔽性：

1. **无明显症状**：恶意脚本执行后不会留下明显的错误信息
2. **合法功能滥用**：`core.fsmonitor` 是 git 的合法功能，安全工具难以检测异常
3. **配置继承**：恶意配置可能通过 `.git/config` 文件在团队中传播
4. **难以审计**：git 配置通常不会被纳入代码审查流程
5. **攻击时机**：恶意代码在 Agent 打开仓库的瞬间执行，开发者可能完全不知情

### 为什么 AI Agent 特别容易受影响？

与传统 IDE 相比，AI 编码 Agent 对 git 配置的依赖更深：

1. **自动执行 git 命令**：Agent 会自动运行 `git status`、`git diff` 等命令来理解代码库
2. **信任本地配置**：Agent 信任仓库的 git 配置，不会主动检查安全性
3. **执行权限高**：Agent 通常以开发者权限运行，可以访问敏感资源
4. **行为不透明**：开发者可能不了解 Agent 执行的所有 git 命令

## 参考来源

- Manifold Security 官方博客：[Behind Every Good Agent is a Vulnerable Repo](https://www.manifold.security/blog/ai-coding-agents-git-hijack) (2026-09-01)
- NVD：[CVE-2026-72718](https://nvd.nist.gov/vuln/detail/cve-2026-72718) - Goose Agent core.fsmonitor 代码执行
- OSV：[CVE-2026-72718](https://osv.dev/vulnerability/CVE-2026-72718) - Goose 漏洞详情
- OSV：[CVE-2026-71963](https://osv.dev/vulnerability/CVE-2026-71963) - Hermes Agent 漏洞详情
- OSV：[CVE-2026-55607](https://osv.dev/vulnerability/CVE-2026-55607) - Claude Code 早期 worktree 漏洞
- SonarSource：[LLM Agents and Git Hook Injection](https://www.sonarsource.com/blog/llm-agents-and-git-hook-injection/) (2026-04-10)
- Blogarama：[Behind Every Good Agent is a Vulnerable Repo](https://www.blogarama.com/technology-blogs/2006-09-01-behind-every-good-agent-is-a-vulnerable-repo) - 交叉验证
- Red Hat Bugzilla：[CVE-2026-72718 Goose Agent 代码执行](https://bugzilla.redhat.com/show_bug.cgi?id=CVE-2026-72718) - Goose 漏洞追踪
- Tenable：[CVE-2026-72718 漏洞分析](https://www.tenable.com/cve/CVE-2026-72718) - 第三方安全分析
