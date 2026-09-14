---
title: "Wiz 90 天 AI 蜜罐报告：攻击者如何把 LiteLLM 与 MCP 服务器变成提款机"
description: "Wiz Threat Research 90 天蜜罐遥测全景：CVE-2026-59822 单字符 Bearer 认证绕过、CVE-2026-42271 MCP 测试端点命令注入、Qilin 勒索组织关联攻击链、内存提取 master key、盲提示注入与 XMRig 挖矿载荷伪装，附完整 IoC 与防御清单"
date: 2026-09-14
category: security
tags: [litellm, mcp, ai安全, honeypot, qilin, xmrig, 威胁情报]
recommend: 安全工程
keywords:
  - Wiz 蜜罐
  - LiteLLM 攻击
  - MCP 安全
  - CVE-2026-59822
  - CVE-2026-42271
  - Qilin 勒索软件
  - AI 基础设施安全
---
# Wiz 90 天 AI 蜜罐报告：攻击者如何把 LiteLLM 与 MCP 服务器变成提款机

> TL;DR：Wiz Threat Research 将 LiteLLM、Flowise、LangChain、Langflow、ChromaDB、Ollama、Node-RED 等 AI 服务暴露在公网上当蜜罐，跑了 90 天。结论：这不是泛型扫描——攻击者带着对每个服务内部实现的精确了解而来，包括"哪个 Python 对象里存着 LiteLLM master key"。三条主线：MCP 服务器 RCE（CVE-2026-59822 + CVE-2026-42271 链，关联 Qilin 勒索组织）、盲提示注入转 Shell、AI 原生后渗透（内存提取密钥、`.claude/unicorn` 伪装）。防御核心一句话：**把 AI 网关当特权基础设施管，而不是当一个网页服务**。

## 一、为什么 AI 基础设施成了主流攻击面

Wiz《State of AI in the Cloud》的数据：**90% 的云环境运行自托管 AI 软件，81% 使用托管 AI 服务，63% 自托管 AI 模型**。蜜罐里跑的每个服务，都有大量真实企业在线上裸奔着同款部署。

攻击者盯着 AI 基础设施，看中的是两个特性：

1. **凭证集中**。一个 LiteLLM 代理可能持有它路由到的所有模型供应商的 key——OpenAI、Anthropic、Azure、Gemini——外加云 IAM 权限和通过 MCP tool server 连接的内部系统。攻破一个代理，拿到的是它下游的一切，而不只是代理本身。
2. **Agent 可达性**。AI Agent 的设计目标就是"接受外部输入并执行工具"。这个可达性天然给了攻击者注入指令的通道——输入直接驱动工具执行。

对应此前[MLflow/Rclone 攻击链分析](/security/offensive/ai-ml-infrastructure-attack-mlflow-rclone-cve-2026)的趋势判断：AI 基础设施已经从"顺带扫到"升级为"专门定制"的目标。

## 二、模式一：MCP 服务器 RCE

MCP 让 AI Agent 调用外部工具服务器——数据库、代码仓库、Slack、内部 API。暴露在公网的 MCP 服务器等于把内部系统的调用面直接挂在了互联网上。蜜罐观测到两个被真实利用的 LiteLLM MCP 漏洞。

### 2.1 CVE-2026-59822：一个字符的 Bearer Token

漏洞位于 LiteLLM MCP Gateway 的 OAuth2 header 处理：**token 校验失败时，服务器不是拒绝请求，而是返回一个没有任何限制的空 `UserAPIKeyAuth()` 对象**。结果就是任意 Bearer token 都能通过——哪怕只有一个字符：

```
GET /v1/models HTTP/1.1
Authorization: Bearer x
```

蜜罐里真实捕获到攻击者用单字符 token 探测模型枚举端点。该漏洞影响 1.84.0 之前版本，修复于 1.84.0+。

### 2.2 CVE-2026-42271：会执行任意命令的"测试连接"按钮

我们在[上一篇文章](/security/offensive/litellm-cve-2026-42271-mcp-injection-exploitation)里已完整复现过这个漏洞（CVSS 8.7，2026 年 6 月进入 CISA KEV）的利用细节，这里只讲 Wiz 蜜罐观测到的**真实载荷**：

LiteLLM 的 MCP server test endpoint 允许用户在保存前测试 MCP server 配置，但 `command` 字段**未经验证直接进入 subprocess 执行**。攻击者提交了一个假的 MCP stdio server 配置，`command` 字段是一段 Python 脚本：

1. 从 `http://185.62.1.8/mon/mon.zip` 下载压缩包；
2. 解压出 Monero 挖矿程序 `gmon` 到 `/tmp/.dbus-cache/`；
3. 以 `start_new_session=True` 脱离会话启动挖矿进程；
4. **删除暂存目录**——但运行中的进程保持着二进制文件的 inode，所以挖矿继续跑，磁盘上却几乎不留痕迹；
5. 返回一个合法的 MCP handshake，让"连接测试"看起来完全成功。

一个带验证功能的测试端点，本身就是危险设计：**任何"会运行你配置的命令来验证连接"的端点都是 RCE 面**。

### 2.3 链上 Starlette 绕过：完全未认证的 RCE

CVE-2026-42271 与 Starlette 的 Host header 校验绕过（[CVE-2026-48710](/security/offensive/cve-2026-48710-starlette-badhost-auth-bypass)）链接后，可以实现**完全未认证的远程代码执行**。外部研究人员将这条利用链与 **Qilin 勒索组织**关联起来——勒索软件开始从 AI 网关下手，这个信号值得所有运维团队警惕。

## 三、模式二：盲提示注入转 Shell

针对 LangChain、Flowise、OpenWebUI、Node-RED 等框架，蜜罐记录到大量**盲提示注入**：

- 攻击者在普通请求内容里嵌入指令覆盖（instruction-override）载荷，诱导 Agent 调用 shell 工具执行操作系统命令；
- 因为注入结果不直接可见，攻击者用**出带 DNS 回调**确认执行——命令的唯一可见效果就是对攻击者控制域名的一次 DNS 查询；
- 载荷托管在 Pastebin，base64 编码以躲避日志和简单过滤器；
- 成功会话最终部署 XMRig，路径选在 `/usr/src/node-red/xmrig`——故意藏在 Node.js 进程树里。

这个模式的技术本质和[SerenA MCP DNS rebinding RCE](/security/offensive/cve-2026-49471-serena-mcp-dns-rebinding-rce)如出一辙：**给 Agent shell 权限是一个高危设计决策**，提示注入只是让这个决策变现的催化剂。

## 四、模式三：AI 原生后渗透——从内存里捞 key

这是整份报告里最值得坐下来琢磨的部分。攻击者的后渗透动作完全围绕 AI 系统内部结构定制：

### 4.1 master key 不落盘，那就从进程内存里拿

LiteLLM 的 master key 从不写到文件系统。传统翻配置文件的思路失效，攻击者直接查询运行中的 Python 进程状态：

```python
import litellm
# 检查 litellm.proxy.proxy_server 的属性
# master_key、litellm_master_key_hash 就在内存里
```

这不是通用后渗透脚本改一改就能干的事——需要攻击者专门读过 LiteLLM 源码。蜜罐还观测到对 `/app/litellm_config.yaml`、`/etc/litellm/.env`、`~/.litellm/config.yaml` 等标准配置路径的枚举。

### 4.2 先指纹，再决定"偷 key"还是"蹭算力"

动手前，攻击者会先用默认凭证（比如大名鼎鼎的 `sk-1234`）通过 chat-completion 请求让模型自报家门，摸清后端有哪些模型，再决定是直接窃取 key，还是安静地烧别人额度（AI token jacking）。

### 4.3 `.claude/unicorn`：伪装成 AI 开发环境的一部分

Langflow 蜜罐里，攻击者把挖矿二进制放在 `/app/data/.claude/` 目录并命名为 `unicorn`——因为在一台跑着 AI 工具链的机器上，`.claude` 目录看起来就像 Claude Code 的合法配置目录，混在里面没人多看一眼。这和[AI 编码代理 .git 配置供应链攻击](/security/offensive/ai-coding-agent-git-config-supply-chain-attack-2026)是同一思路：**AI 工具链的"正常存在"正在被武器化**。

## 五、IoC 速查表

| 类型 | 指标 | 说明 |
|------|------|------|
| IP | `185.62.1[.]8` | LiteLLM/MCP 恶意载荷下载服务器 |
| IP | `94.26.106[.]29` | 二进制暂存 |
| IP | `185.84.98[.]85` | 挖矿程序 C2 |
| 域名 | `crazyeltonproxy[.]top` | Monero 挖矿代理 |
| 域名 | `pool.hashvault[.]pro` | Monero 矿池 |
| 文件 | `/tmp/.dbus-cache/gmon` | Monero 挖矿二进制 |
| 文件 | `/tmp/x86_64`、`/tmp/amd64` | dropper |
| 文件 | `/usr/src/node-red/xmrig` | 伪装进 Node.js 进程树的挖矿程序 |
| 文件 | `/app/data/.claude/unicorn` | 伪装成 Claude Code 配置的挖矿二进制 |

进程行为特征：AI 服务器进程异常 spawn shell、创建后立即删除的暂存目录、计划任务里出现 `authorized_keys` 变更、异常 DNS 出带。

## 六、防御清单

Wiz 的建议很直白：**大多数此类工具默认无认证，把"无认证暴露在互联网上"直接当"已被入侵"处理**。

1. **立即升级 LiteLLM ≥ 1.84.0**，并确认依赖没有锁死在受影响版本（42271 修复在 1.83.7+）；
2. **收敛 MCP 和管理端点**：禁用不用的路由，测试端点仅限可信用户，绝不公网暴露；
3. **网关后置**：反代、WAF、VPN 或内网负载均衡挡在前面，避免直连；
4. **最小权限 + 分段**：供应商 key、云角色、服务账号、MCP 工具权限全部收窄，AI 系统与敏感基础设施隔离；
5. **管控出站流量**：限制不必要的 DNS 和 HTTP 出带，对异常回调、载荷下载、模型枚举告警——盲提示注入依赖 DNS 出带确认，掐断它等于废掉整条利用链；
6. **按"凭证已泄露"标准响应**：一旦网关失陷，轮换的不仅是 LiteLLM 凭证，还包括它可达的每一个 MCP 连接、云凭证和下游服务——内存里的 master key 无法"删除"，只能轮换使其失效；
7. **修正补丁节奏**：开源 AI 基础设施的攻击者常常在 CVE 编号分配之前就武器化新合入的修复代码，"等维护窗口再打补丁"在这个领域是错误姿势。

## 七、写在最后

这份报告最有价值的不是某个 CVE，而是一个结构性判断：**AI 安全能做的最糟糕的事，就是让团队以为它和"普通基础设施安全"是两个科目**。AI 网关坐在用户、云账号、付费模型服务和内部工具之间，一个配置弱点就足以放大成企业级事件。

MCP 安全系列此前已覆盖 [LiteLLM CVE-2026-42271 利用实战](/security/offensive/litellm-cve-2026-42271-mcp-injection-exploitation)、[Starlette BadHost 绕过](/security/offensive/cve-2026-48710-starlette-badhost-auth-bypass)、[SerenA DNS rebinding](/security/offensive/cve-2026-49471-serena-mcp-dns-rebinding-rce)与 [MLflow/Rclone 攻击链](/security/offensive/ai-ml-infrastructure-attack-mlflow-rclone-cve-2026)。本文补上攻击者 TTP 全景这一块——后续如果 Wiz 公开更多遥测细节，会继续跟进。

---

*参考：[Wiz 博客原文 Inside 90 days of attacks on AI infrastructure](https://wiz.io/blog/ai-infrastructure-honeypot)（2026-08-27 发布，作者 Yaara Shriki）、[eSecurity Planet 报道](https://www.esecurityplanet.com/sites/esecurityplanet.com/news/news-litellm-mcp-server-attacks)。*
