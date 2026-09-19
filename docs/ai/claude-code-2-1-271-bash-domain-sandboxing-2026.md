---
title: "Claude Code 2.1.271 域级 Bash 沙箱拆解：从会话级白名单到 per-command allowed_domains"
date: 2026-09-19
tags: [ai, security, claude, agent]
keywords: [Claude Code, 2.1.271, allowed_domains, Bash sandbox, auto mode, 沙箱, MCP OAuth, 权限模型, agentic coding, 域级沙箱]
category: ai
description: "Claude Code 2.1.271（9/14）把 Bash 沙箱从会话级网络白名单升级为 per-command allowed_domains：每个命令单独审查所需主机、单独放行，其余全部拒绝。深拆新权限模型的工作原理、同一版本修掉的 4 个 Bash permission-check 缺口、9 月 5 个版本的安全主线，以及企业落地配置。"
author: PFinal南丞
recommend: true
---

> 沙箱权限的最小粒度，决定了一次"批准"的最大爆炸半径。Claude Code 这版把粒度从"会话"切到了"单条命令"。

# Claude Code 2.1.271 域级 Bash 沙箱拆解

## TL;DR

- Claude Code **2.1.271**（2026-09-14）引入 **per-command `allowed_domains` 域级沙箱**：auto mode + sandboxing 下，Bash、PowerShell、Monitor 工具的每条命令单独审查所需主机域名，**只为这一条命令开洞**，其余主机一律拒绝。
- 这是权限模型的一次实质收紧：之前的网络白名单是**会话级**的——批准一次，整场会话里所有命令共享同一组可达主机；现在一条命令被批准能访问 `registry.npmjs.org`，不代表它还能顺带访问你的内部 API。
- 同版本修掉 **4 个 Bash permission-check 缺口**：`fmt` 读取的文件、未识别选项后的 column 类命令、模式/选项值内的通配符展开文件、可能改变实际执行命令的 shell 变量声明标志——都是"权限审查看到的命令"和"实际执行的命令"不一致的经典问题。
- 2.1.272（9/15）跟进修复。9 月主线（2.1.259 → 2.1.272）非常清晰：**企业级受管 Agent**——managedMcpServers、Containment Escape 规则、gateway 定价、域级沙箱，安全与成本双线收敛。

## 一、背景：AI 编码代理的权限问题已经走到这一步

Claude Code 在 2026 年的迭代节奏是 9 月的 2.1.25x-27x 系列里最密集的一段，安全相关的主线可以串成一条线：

| 版本 | 日期 | 安全/权限关键变化 |
|------|------|------------------|
| 2.1.259 | 9 月初 | `managedMcpServers`（组织级统一下发 MCP）、`--permission-prompts none`（无人值守模式）、auto-mode 新增 **Containment Escape 规则**（阻断越权读取云凭证） |
| 2.1.268 | 9/10 | Claude apps gateway 定价控制（`gateway.yaml`）、WebFetch 300 秒超时（修复挂死） |
| 2.1.269 | 9/11 | `claude plugin eval`（插件回归测试）、Bash 工具结果附带文件变更 diff、OTel 指标增加仓库属性 |
| **2.1.271** | **9/14** | **per-command `allowed_domains` 域级沙箱** + 4 个 Bash 权限检查修复 |
| 2.1.272 | 9/15 | 跟进 bug 修复 |

这条线的趋势和我们在 [Docker AI Agent 隔离治理](/devops/docker-ai-governance-agent-isolation-2026) 里讨论的一致：**Agent 的权限体系正从"个人工具的开/关"演进为"企业基础设施的权限矩阵"**。域级沙箱是这张矩阵里网络维度的一次细化。

## 二、核心特性：per-command allowed_domains 到底改变了什么

### 2.1 之前：会话级白名单的"批准一次、全程可达"

旧模型下，网络沙箱的白名单绑定在会话维度：

```text
旧模型（会话级）：

  会话开始 → 批准允许 example.com
       │
       ├── 命令 1: curl https://example.com/api     ✅ 放行（白名单命中）
       ├── 命令 2: curl https://evil.example.net    ❌ 拒绝（不在白名单）
       └── 命令 3: curl https://example.com/api     ✅ 放行（同一白名单）
                        ↑ 但注意：命令 3 的"上下文"可能已经被注入污染
```

问题在于**粒度错配**：你批准"这个会话可以访问 example.com"，实际上是批准了"这场会话里任何一条命令都能访问 example.com"。如果第 5 条命令被 prompt 注入或读到了恶意配置，它继承的出网能力和第 1 条一样宽。

### 2.2 现在：每条命令一个"临时洞"

2.1.271 的新模型：

```text
新模型（per-command）：

  auto mode + sandboxing
       │
       ├── 命令 1: curl https://example.com/api
       │      → 审查：本命令需要 example.com
       │      → 放行：仅 example.com，且仅本命令存活期      ✅
       │
       ├── 命令 2: curl https://evil.example.net
       │      → 审查：不在本命令 allowed_domains
       │      → 拒绝                                       ❌
       │
       └── 命令 3: npm install
              → 审查：需要 registry.npmjs.org
              → 放行：仅 npm registry，仅本命令             ✅
              （此时 example.com 对命令 3 不可达）
```

关键差异一句话：**"这条命令需要哪些主机"成为审查与放行的单位**。一个被批准的命令无法借用其他命令的网络授权；网络能力从"会话资产"变成了"命令资产"。适用工具覆盖 Bash、PowerShell 和 Monitor（监控类命令）。

### 2.3 工作原理（文字版架构）

```text
┌────────────────────────────────────────────────────────────┐
│                     Claude Code (auto mode)                │
│                                                            │
│  Bash 命令发出                                             │
│      │                                                     │
│      ▼                                                     │
│  ① 命令解析：抽取命令字符串、参数、引用文件                    │
│      │                                                     │
│      ▼                                                     │
│  ② 域名审查：这条命令需要访问哪些主机？                       │
│      │    （URL 参数、包管理器 registry、已知工具默认源…）     │
│      ▼                                                     │
│  ③ 沙箱执行：按命令隔离的进程容器 + 网络命名空间               │
│      │    allowed_domains = ② 的结果                        │
│      │    其余域名 → 拒绝（连接层阻断）                       │
│      ▼                                                     │
│  ④ 结果返回：stdout/stderr + 文件变更 diff（2.1.269 起）      │
└────────────────────────────────────────────────────────────┘
```

这套机制配合 2.1.269 的"Bash 结果附带文件 diff"形成闭环：**命令做了什么网络访问（域级审查）+ 改了什么文件（diff 可见）**，一次执行的副作用完整可见。

## 三、同版本修复的 4 个 Bash 权限检查缺口

比新特性更重要的是修复——这 4 个缺口都属于同一类根因：**权限审查阶段看到的命令 ≠ 实际执行的命令**。这类"审查盲区"是所有命令白名单系统的慢性病：

| 缺口 | 场景 | 危害 |
|------|------|------|
| `fmt` 读取的文件 | `fmt` 等格式化工具会读取参数之外的文件 | 绕过"这条命令只能碰这些文件"的检查读取其他文件 |
| 未识别选项后的 column 类命令 | `some-tool --unknown-flag column …` | 解析器在未知选项后误判子命令语义，放行了本不该放行的行为 |
| 模式/选项值内的通配符展开 | `grep foo *.txt` 中 `*.txt` 的展开发生在 shell 层 | 审查时看到的是字面量 `*.txt`，执行时展开成任意文件列表 |
| shell 变量声明标志 | `FOO=bar cmd` 这类前缀赋值 | 变量赋值可能改变最终执行的命令或其行为，审查阶段难以还原 |

第 3、4 个尤其值得普通用户警觉：**通配符和变量前缀是 shell 的基本语法，也是命令审查的经典盲区**。这也是为什么"让 Agent 自己跑 shell"的产品都在往"沙箱兜底 + 审查只做加速"的架构迁移——静态审查永远有盲区，隔离才是最终兜底。

## 四、2.1.271/272 其余值得注意的变化

- **fast mode 进入 Remote 会话**：云端与自托管 runner 均可用。
- **self-hosted runner 优雅下线**：`--drain-marker-file` 让 runner 收到 SIGTERM 时向上报"正在排水"的遥测，避免任务被硬杀。
- **`omitClaudeMd`**：自定义子代理和插件子代理可以选择不加载用户/项目/本地 `CLAUDE.md`，但受管策略文件（managed policy）仍然生效——**企业策略优先于个人配置**，这个优先级设计是对的。
- **内部计费倍率**：`modelPricing` 受管设置与 gateway 定价块支持 1~10 倍率，方便组织内部转售用量（chargeback）。
- **MCP OAuth 客户端注册修复**（对 MCP 重度用户重要）：拒绝同意不再触发虚假的新注册；不再错误复用其他 redirect URI 的注册；并发写入不再误删有效注册或留下不匹配注册。MCP 的授权状态管理一直是实现细节重灾区，这轮集中清理值得升级。
- **Code Review 去重**：GitHub 上报错误时不再重复贴 2~3 条相同发现；后续 push 移动锚点行后不再重贴已人工 resolve 的安全发现。

## 五、企业落地：把域级沙箱用起来

结合 2.1.259 的 `managedMcpServers` 与受管策略文件，一个最小化的企业权限基线：

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run build:*)",
      "Bash(npm run test:*)"
    ],
    "deny": [
      "Bash(curl:*)",
      "Read(.env*)",
      "Read(secrets/**)"
    ]
  },
  "sandbox": {
    "enabled": true,
    "allowedDomains": ["registry.npmjs.org", "github.com"]
  }
}
```

要点：

1. **高危命令进 deny 而不是"不在 allow 里"**——显式拒绝优先级最高，防止 allow 规则的宽匹配意外放行。
2. **白名单按工作流切分**：构建命令只需要 registry 和 git host，不需要内部 API；数据导出命令只需要对象存储 host。让"命令组"和"域名组"对齐。
3. **`.env` 与 secrets 用路径规则兜底**，配合 auto-mode 的 Containment Escape 规则（阻断越权读取云凭证），凭证面基本封死。
4. CI 里**钉版本**：2.1.265 曾出现过 gateway 配置短暂破坏 API-key 认证的回归（一天内修复）。安全特性密集落地的窗口期，锁版本 + 灰度是基本功。

## 六、总结

2.1.271 的价值不在"多了个配置项"，而在权限模型的原语升级：**从"会话级的信任"到"命令级的信任"**。当 Agent 权限的最小授予单位不断变小时，一次错误批准的最大损失也在变小——这是所有 Agent 产品走向企业级的必经之路，Claude Code 这版给出的答卷（per-command 域沙箱 + 审查盲区集中修复 + 受管策略优先）值得同类产品抄作业。

下一步可以预期的方向：域级沙箱扩展到 MCP 工具调用的出网（目前 MCP server 本身就是"一个大权限包"），以及 per-command 的文件系统写入白名单。把 [Agent 隔离治理](/devops/docker-ai-governance-agent-isolation-2026) 的容器级方案和这类应用层细粒度控制叠起来，才是完整的纵深防御。

## 参考资料

- [AI Coding Roundup — September 15, 2026: Claude Code Sandboxes Bash by Domain](https://oday-bakkour.com/blog/ai-coding-roundup-september-15-2026)
- [AI Coding Roundup — September 12, 2026: Claude Code, Copilot & Codex Ship Major Updates](https://oday-bakkour.com/blog/ai-coding-roundup-september-12-2026)
- [Anthropic Claude Code Changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)
- 相关阅读：[Docker AI Agent 隔离治理](/devops/docker-ai-governance-agent-isolation-2026)、[Anthropic 工程团队的 Claude Code 实践](/ai/harness-engineering-claude-code-2026)
