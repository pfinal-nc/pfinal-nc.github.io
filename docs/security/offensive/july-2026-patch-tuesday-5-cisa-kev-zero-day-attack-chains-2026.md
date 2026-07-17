---
title: "2026 年 7 月 Patch Tuesday 5 个 CISA KEV 0-day 全景：SonicWall SMA1000 / ADFS / SharePoint / BitLocker / Langflow 攻击链复盘与企业应急手册"
date: 2026-07-17
tags:
  - security
  - cve
  - cisa-kev
  - patch-tuesday
  - sonywall
  - adfs
  - sharepoint
  - bitlocker
  - langflow
  - zero-day
keywords:
  - CVE-2026-15409
  - CVE-2026-15410
  - CVE-2026-56155
  - CVE-2026-56164
  - CVE-2026-50661
  - CVE-2026-55255
  - CVE-2026-33017
  - SonicWall SMA1000
  - ADFS
  - SharePoint
  - BitLocker
  - Langflow
  - JADEPUFFER
  - 0-day
  - Patch Tuesday
category: security/offensive
description: "2026 年 7 月 Patch Tuesday 共修复 622 个 CVE，5 个被 CISA 加入 KEV 目录并标记在野利用：SonicWall SMA1000 双 0-day 链（CVSS 10.0+7.2）、ADFS EoP（CVE-2026-56155）、SharePoint EoP（CVE-2026-56164）、BitLocker 绕过（CVE-2026-50661）、Langflow IDOR+RCE 双联（CVE-2026-55255+33017）。本文从攻击链复盘到企业级应急清单完整拆解。"
---

# 2026 年 7 月 Patch Tuesday 5 个 CISA KEV 0-day 全景：SonicWall SMA1000 / ADFS / SharePoint / BitLocker / Langflow 攻击链复盘与企业应急手册

2026 年 7 月 14 日，微软发布了史上最大规模的 Patch Tuesday：622 个 CVE，分布在 Windows 内核、Active Directory、SharePoint、Exchange、Office、Azure OpenAI、Minecraft Bedrock 等 60+ 产品线。其中 3 个 zero-day 已经被确认在野利用：

- **CVE-2026-56155** — Active Directory Federation Services 本地提权（CVSS 7.8）
- **CVE-2026-56164** — SharePoint Server 远程提权（CVSS 5.3）
- **CVE-2026-50661** — Windows BitLocker 物理访问绕过（CVSS 6.1）

同一天，CISA 还把另外两个 zero-day 加进了 KEV 目录，**联邦机构必须 7 月 17 日前修完，否则设备必须下线**：

- **CVE-2026-15409** — SonicWall SMA1000 WorkPlace 接口未授权 SSRF（CVSS 10.0）
- **CVE-2026-15410** — SonicWall SMA1000 Appliance Management Console 代码注入（CVSS 7.2）

加上 CISA 在 7 月 8 日加进 KEV 的 **CVE-2026-55255**（Langflow IDOR，CVSS 6.1，Sysdig 关联 JADEPUFFER 勒索软件运营者），5 个 0-day 在 9 天内被批量披露，**全部面向企业核心基础设施**：身份、协作、远程访问、加密、AI 编排平台。

这不是巧合。**身份和访问基础设施（Identity & Access Infrastructure）** 是 2026 年下半年勒索软件和国家级 APT 攻击的绝对首选。Mandiant M-Trends 2026 报告指出，勒索软件攻击的平均"从初次入侵到勒索行为"时间是 22 秒——攻击者用远程访问设备的零日漏洞打穿边界之后，立即从 Active Directory 的 EoP 漏洞获取域管理员权限。从 SonicWall SSRF 到 ADFS EoP 再到 SharePoint EoP，这条攻击链在 7 月已经走通。

这篇文章要做三件事：

1. **5 个 0-day 完整攻击链复盘**（SonicWall 0-credential 接管、ADFS token 伪造、SharePoint 远程提权、BitLocker 冷启动攻击、Langflow AI 凭证窃取）
2. **企业级应急清单**（0-72 小时怎么分阶段打补丁、怎么验证、怎么止损）
3. **2026 下半年的攻防趋势**（为什么身份基础设施成为主战场、为什么 AI 编排平台成为新攻击面）

## 一、SonicWall SMA1000：CVE-2026-15409 + CVE-2026-15410 双 0-day 链

### 1.1 漏洞时间线

| 时间 | 事件 |
|---|---|
| 2026-06-22 | Rapid7 MDR 团队在客户事故响应中**首次发现**在野利用 |
| 2026-07-09 | Rapid7 内部确认这是 SonicWall SMA1000 的 zero-day 链 |
| 2026-07-14 | SonicWall 发布 hotfix：12.4.3-03453 / 12.5.0-02835 |
| 2026-07-14 | CISA 把 CVE-2026-15409 和 CVE-2026-15410 加入 KEV |
| 2026-07-17 | 联邦机构 remediation deadline（已过） |

**关键点**：漏洞在 7 月 14 日才被公开披露，但 Rapid7 早在 6 月 22 日就**在生产环境的真实攻击**中观察到。这意味着攻击者**至少 22 天的无窗口期**——如果你没打 hotfix，你的 SMA1000 可能已经被入侵。

### 1.2 CVE-2026-15409：未授权 SSRF（CVSS 10.0）

漏洞在 SMA1000 的 **WorkPlace 接口**。WorkPlace 是 SMA 的 Web 入口，部署在防火墙的 DMZ 区，**对公网开放**。

技术细节：WorkPlace 接口处理 `wspProxy` WebSocket 升级请求时，没有正确校验 `Host` 头。攻击者可以构造一个请求，让 SMA1000 自己向 `localhost:8188`（Appliance Management Console 的内部端口）发起 WebSocket 连接。

```http
GET /sslmgr/wsproxy HTTP/1.1
Host: localhost:8188
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
serviceType=SSH
```

注意两个细节：

1. `Host: localhost:8188` — 触发 SSRF，让 SMA 自己连 AMC
2. `serviceType=SSH` — 这个参数在 SonicWall 文档里**没记录**，是 Rapid7 通过逆向分析发现的

**AMC 内部监听 8188 端口**，设计意图是只允许 localhost 访问（绑定 127.0.0.1）。但通过 SSRF 漏洞，外部攻击者可以**通过 SMA 自己**访问到 AMC，**完全绕过认证**。

### 1.3 CVE-2026-15410：AMC 命令注入（CVSS 7.2）

AMC 是 SMA1000 的管理控制台，提供系统配置、日志查看、hotfix 管理等接口。`/usr/local/bin/remove_hotfix` 这个工具存在命令注入：

```bash
# 攻击者构造的请求
POST /__api__/v1/system/hotfix/remove HTTP/1.1
Cookie: session=...
Content-Type: application/json

{
  "path": "../../../../../../tmp/sma1000_5c47.sh"
}
```

`remove_hotfix` 没有校验 `path` 字段的目录遍历序列，攻击者可以传入相对路径，让工具执行任意位置的 shell 脚本。

### 1.4 完整 0-credential 攻击链

```text
外部攻击者
  │
  ├─→ 1. SSRF (CVE-2026-15409)
  │     POST /sslmgr/wsproxy
  │     Host: localhost:8188
  │     serviceType=SSH
  │     ↓
  │   SMA1000 WorkPlace → 本地 8188 端口 → AMC 无认证接口
  │
  ├─→ 2. 命令注入 (CVE-2026-15410)
  │     通过 AMC 调用 remove_hotfix
  │     path=../../../../../../tmp/payload.sh
  │     ↓
  │   SMA1000 以 root 身份执行 attacker 脚本
  │
  ├─→ 3. 凭据窃取
  │     读取 /tmp/temp.db* (session 存储)
  │     读取 TOTP secret (multi-factor seed)
  │     读取 LDAP service account 凭据
  │
  ├─→ 4. AD 横向移动
  │     用 LDAP service account 通过内部网络登录 DC
  │     提取域内所有用户 hash
  │     ↓
  │   域管理员权限
  │
  └─→ 5. 持久化
        注入 GPO、计划任务、DSRM 密码
        即使设备重置也不丢权限
```

### 1.5 Rapid7 公开的 IOC

```bash
# 网络侧 IOC
log entries containing:
  "GET" AND "wsproxy" AND "=-3389" AND " 101 "
host parameters: "0.0.0.0", "localhost", "::ffff:127.0.0.1"
serviceType=SSH or serviceType=TELNET

# 本地侧 IOC
ctrl-service.log:
  /usr/local/bin/remove_hotfix
  ../../../../../../tmp/sma1000_*.sh

extraweb_access.log:
  POST /__api__/login
  POST /__api__/logon//authenticate
  WebSocket /wsproxy with host=localhost/0.0.0.0 returning 101

# 配置侧 IOC
/var/lib/unit/conf.json 包含 /__api__/login 或 /__api__/logout 路由（正常配置没有）

# AD 侧 IOC
Windows Event ID 4624 (logon type 3) from SMA internal IP
workstation name = "kali" (或其他非标准名)
no corresponding VPN session
```

### 1.6 ASN F.N.S Holdings Limited 是攻击基础设施

Rapid7 报告里**特别点名** FNS Holdings Limited（ASN 206092）。这个 ASN 下的 IP 段被攻击者用作 VPN 出口：

```
45.131.194.0/24
45.146.54.0/24
63.135.161.0/24
173.239.211.0/24
193.37.32.179
193.37.32.214
216.73.163.151
216.73.163.158
```

**应急建议**：在没有业务需求的前提下，**直接屏蔽整个 ASN 206092**。

## 二、CVE-2026-56155：ADFS 本地提权（CVSS 7.8）

### 2.1 漏洞原理

Active Directory Federation Services（ADFS）是微软的身份联邦服务，签发 SAML、OAuth、JWT 令牌，**整个企业的 SSO 都依赖它**。CVE-2026-56155 是 ADFS 的**权限提升**漏洞，CWE-1220（"权限粒度不足"）。

漏洞组件：ADFS 的 **Distributed Key Manager**（DKM）容器。ADFS 用 DKM 加密 token-signing 证书，容器的 ACL（访问控制列表）默认配置过宽。

```powershell
# 默认的 DKM 容器 ACL
Get-Acl "AD:DC=corp,DC=example,DC=com,CN=ADFS,CN=Microsoft,CN=Program Data" |
    Format-List

# 修复需要（KB5121391）：
# 移除 Authenticated Users 的 Read 权限
# 仅保留 ADFS Service Account 的 Full Control
```

### 2.2 攻击场景

```text
攻击者已经在 ADFS 服务器上有低权限 shell
  │
  ├─→ 1. 读取 DKM 容器
  │     利用默认 ACL 中的 Authenticated Users Read
  │     ↓
  │   获得 token-signing 证书的解密密钥
  │
  ├─→ 2. 伪造 SAML token
  │     用证书签发任意用户的 SAML assertion
  │     claim: UPN=admin@corp.example.com
  │     ↓
  │   任意用户身份
  │
  └─→ 3. 跨应用访问
        Office 365、SharePoint Online、Azure Portal
        AWS Federation、Salesforce、Workday
        所有依赖 ADFS SSO 的应用
```

### 2.3 关键点

- **漏洞发现者**：Jeremy Kingston 和 Scott Clark（Microsoft DART）——这意味着漏洞是在**真实的客户事故**中发现的
- **本地权限要求**：攻击者需要**已经在 ADFS 服务器上**有低权限 shell
- **真正的杀伤链**：这是 SonicWall 0-day 链的"第二阶段"——SonicWall 拿 LDAP service account 之后横向移动到 ADFS 服务器，再用这个漏洞获取域管理员令牌

### 2.4 修复复杂度

微软的修复**不是单一补丁**，而是**补丁 + 配置变更**：

1. 安装 7 月 Patch Tuesday 的累积更新
2. **手动调整 DKM 容器的 ACL**（参考 KB5121391）
3. **轮换 token-signing 证书**——即使修了 ACL，也建议轮换证书，避免之前的证书泄露被滥用
4. **审查 ADFS 日志**——查找异常的 token-signing 操作

## 三、CVE-2026-56164：SharePoint Server 远程提权（CVSS 5.3）

### 3.1 漏洞原理

CWE-306（"关键功能缺少身份验证"）。SharePoint Server 的某个 Web 端点在处理认证时**完全跳过了认证检查**，未认证的远程攻击者可以直接调用管理接口。

注意 CVSS 只有 5.3（被标为 Moderate），但**ZDI 强烈建议立刻修**：

> This is a missing-authentication flaw, meaning an unauthenticated attacker can hit it over the network with no user interaction required. When something this reachable is being actively abused, patch it now and worry about the score later.

### 3.2 攻击场景

```text
外部攻击者（公网）
  │
  ├─→ 1. 直接调用未授权的 SharePoint 管理端点
  │     POST /_api/web/...  (具体端点微软未披露)
  │     ↓
  │   SharePoint 接受请求并执行管理操作
  │
  ├─→ 2. 提升至 SharePoint Farm Admin
  │     在 SharePoint 配置数据库写入新管理员
  │     ↓
  │   域内所有 SharePoint 站点的完全控制
  │
  └─→ 3. 窃取 IIS Machine Key
        读取 SharePoint 的 machineKey 配置
        ↓
      伪造 ASP.NET 视图状态 (ViewState)
        ↓
      SharePoint Server 远程代码执行
```

### 3.3 关联漏洞：CVE-2026-55040

Rapid7 在 Pwn2Own Berlin 上展示了一个**未打补丁**的 SharePoint JWT 认证绕过漏洞（CVE-2026-55040），结合另一个 RCE 漏洞，可以从公网**未认证直接 RCE**。这个 RCE 组件的补丁**不在 7 月**，要等 8 月。

**关键点**：7 月的补丁**只修复了 56164 的提权部分**，**RCE 链没有完全封堵**。如果你 7 月只打了补丁但没做额外的加固，8 月份 RCE 补丁出来之前还有窗口期。

### 3.4 临时缓解（不打补丁的情况）

```powershell
# 1. 启用 AMSI Full Mode
# 微软建议 SharePoint + IIS worker process 集成 AMSI
# Request Body Scan mode = Full（这才能拦截 POST body 里的 payload）

# 2. 限制 SharePoint 的 Internet 暴露
# 如果 SharePoint 不需要公网访问，禁用 Internet-facing Web App
# 仅允许内部 VPN + ADFS 条件访问

# 3. 启用 WAF 规则
# 阻断异常 SharePoint 管理端点的访问
# Azure WAF / Cloudflare WAF 都有现成的 SharePoint 规则集
```

### 3.5 7 月也是 SharePoint 2016/2019 扩展支持终点

BleepingComputer 强调：2026 年 7 月是 **SharePoint Server 2016 和 2019 扩展支持的终点**。这意味着 7 月之后这些版本**不再有付费安全更新**。

如果你的企业还在用 SharePoint 2016/2019，**7 月这波 0-day 是最后一批"白嫖"补丁**。8 月开始，要么迁移到 SharePoint Subscription Edition（SE），要么付费 extended security update，否则就是裸奔。

## 四、CVE-2026-50661：Windows BitLocker 物理访问绕过（CVSS 6.1）

### 4.1 漏洞原理

CWE-693（"保护机制失败"）。BitLocker 设备加密依赖 TPM（Trusted Platform Module）存储密钥，CVE-2026-50661 允许物理访问的攻击者绕过 TPM 验证。

这个漏洞可能是 **GreatXML** 漏洞的官方补丁——Nightmare-Eclipse 公开的 BitLocker 绕过工具。但微软在 7 月的公告里**没有确认这个关联**。

### 4.2 攻击场景

```text
物理接触设备（被盗 / 没收 / 维修流程）
  │
  ├─→ 1. 启动到 WinRE（Windows Recovery Environment）
  │     通过 USB 启动盘 / 强制重启到恢复模式
  │     ↓
  │
  ├─→ 2. 利用 BitLocker 绕过
  │     通过 GreatXML 或类似工具
  │     绕过 TPM 验证
  │     ↓
  │   解密系统盘
  │
  └─→ 3. 数据提取
        离线读取 C:\Users\*
        离线读取 C:\Windows\NTDS.dit（如果设备是 DC）
        提取证书、VPN 配置、密码 hash
```

### 4.3 风险评估

物理访问要求让这个漏洞**对普通桌面用户风险较低**（除非笔记本被偷）。但**对以下场景风险极高**：

- 经常出差的高管笔记本
- 域控制器（DC）——BitLocker 绕过后可以提取 NTDS.dit
- 共享工作站
- 维修 / 回收流程中的设备

### 4.4 缓解措施

1. **打补丁**（7 月累积更新）
2. **加强物理安全**（USB 启动禁用、BIOS 密码、Secure Boot 强制）
3. **启用 BitLocker Network Unlock**（仅在企业环境）—— 设备连接到企业网络时自动解锁，断网不解锁
4. **TPM+PIN 模式**（比纯 TPM 更安全）
5. **设备自加密驱动器（SED）**—— 硬件级加密，不依赖软件 BitLocker

## 五、CVE-2026-55255 + CVE-2026-33017：Langflow IDOR + RCE 双联（JADEPUFFER）

### 5.1 背景：AI 编排平台成为新攻击面

Langflow 是低代码 AI 编排框架，基于 Python + FastAPI，2026 年 7 月 GitHub stars 35k+。它的设计是让开发者用拖拽方式构建 LLM workflow，背后调用 OpenAI / Anthropic / AWS Bedrock 等模型。

**AI 编排平台是新的"凭据金矿"**——它们需要存储用户的 LLM API key、AWS access key、Slack token、Notion API key。一旦被攻破，**所有租户的 key 全部泄露**。

### 5.2 CVE-2026-55255：跨租户 IDOR（CVSS 6.1）

CWE-639（"通过用户控制密钥绕过授权"）。Langflow 的 flow 详情接口通过 flow ID 标识资源，**没有校验当前用户是否有权访问这个 flow**。

```http
# 攻击者构造请求，直接访问其他租户的 flow
GET /api/v1/flows/12345 HTTP/1.1
Authorization: Bearer <attacker_token>
# 12345 是受害者用户的 flow ID
```

返回的数据里包含：
- LLM API key（OpenAI、Anthropic）
- AWS access key
- 其他集成凭据

### 5.3 CVE-2026-33017：未认证 RCE（前面已披露）

Langflow 的 RCE 漏洞，**未认证远程攻击者可以直接执行 Python 代码**。结合 CVE-2026-55255，攻击者先通过 IDOR 偷 LLM key，然后利用 RCE 在 Langflow 服务器上**运行任意代码**（部署 cryptominer 或者横向移动到内部网络）。

### 5.4 Sysdig 观察到的 JADEPUFFER 攻击者

Sysdig 在 2026-06-22 到 2026-06-25 的 4 天里，**全程观察到一个 IP `45.207.216.55`** 的攻击活动：

```text
Day 1 (06-22)
  → 端口扫描：暴露的 Langflow 8443/443
  → 应用 / auth 侦察

Day 2 (06-23)
  → Flow 枚举：尝试各种 flow ID

Day 3 (06-24)
  → 利用 CVE-2026-55255 IDOR
  → 偷取其他租户的 LLM/AWS key

Day 4 (06-25)
  → 利用 CVE-2026-33017 RCE
  → 部署第二阶段下载器
  → 出站连接到 C2 服务器
```

这个攻击者**明显是有目标的、阶段化的**，最后投递的 payload 风格**和 botnet + cryptojacking 一致**。Sysdig 评估这是**机会主义但有商业动机的攻击者**。

### 5.5 CISA KEV 加入

CISA 在 2026-07-08 把 CVE-2026-55255 加进 KEV 目录，**联邦机构必须 7 月 18 日前修完**。CISA 还特别强调："AI 编排平台本身就是凭据金矿，攻击者明确知道这一点。"

### 5.6 关联事件：JADEPUFFER Agentic Ransomware

Sysdig 在 7 月初发布了**首次记录的 agentic ransomware** 报告，代号 **JADEPUFFER**。这个勒索软件家族的特征：

- 人类操作员**部署一个人工 Agent**（基于 Langflow CVE-2025-3248 漏洞）
- Agent 自动处理**从入侵到勒索**的整个流程
- 不需要人工持续干预

这是 2026 年**勒索软件自动化的转折点**——勒索软件即服务（RaaS）正式升级为 "RaaS + Agent"。

## 六、5 个 0-day 联合攻击链：完整推演

把 5 个 0-day 串成一条完整的攻击链，演示 2026 年下半年攻击者是怎么打穿一家企业的：

```text
[Stage 1: 边界突破]  2026-06-22 ~ 2026-07-09
  攻击者扫描公网暴露的 SonicWall SMA1000
  ↓
  利用 CVE-2026-15409 SSRF
  → 通过 WorkPlace 接口访问内部 AMC
  ↓
  利用 CVE-2026-15410 命令注入
  → 以 root 执行任意命令
  ↓
  窃取：
    - LDAP service account 凭据
    - Session DB（VPN session 凭据）
    - TOTP secret（多因子种子）

[Stage 2: 身份升级]  2026-07-09 ~ 2026-07-14
  用 LDAP service account 登录内网 DC
  ↓
  发现 ADFS 服务器
  横向移动到 ADFS（已有低权限 shell）
  ↓
  利用 CVE-2026-56155 EoP
  → 读取 DKM 容器
  → 拿到 token-signing 证书
  ↓
  伪造任意用户的 SAML token
  → 域管理员

[Stage 3: 协作平台控制]  2026-07-14 ~
  用域管理员访问 SharePoint Server
  ↓
  利用 CVE-2026-56164 未授权 EoP
  → SharePoint Farm Admin
  ↓
  窃取 IIS Machine Key
  → 伪造 ViewState
  → SharePoint RCE
  ↓
  SharePoint 上所有文档、列表、站点全部可读
  部署 Web Shell

[Stage 4: AI 凭证窃取]  2026-07-15 ~
  内网扫描发现 Langflow 实例
  ↓
  利用 CVE-2026-55255 IDOR
  → 读取其他租户的 LLM API key
  ↓
  利用 CVE-2026-33017 RCE
  → 在 Langflow 服务器上持久化
  ↓
  利用偷来的 OpenAI key 跑大量推理
  → 给攻击者赚 cryptomining 收入

[Stage 5: 物理层补刀]  2026-07-16 ~
  如果企业在边缘节点用了 BitLocker 加密
  ↓
  利用 CVE-2026-50661
  → 物理接触绕过 BitLocker
  → 提取离线数据

[Stage 6: 持久化 + 勒索]  2026-07-17 ~
  GPO 注入、计划任务、DSRM 密码
  ↓
  部署 JADEPUFFER 风格 agentic ransomware
  → Agent 自动加密文件 + 索要赎金
```

**完成时间**：从 Stage 1 到 Stage 6，**总耗时 25 天**。其中 22 天是攻击者的无窗口期（SonicWall 漏洞公开前的在野利用期）。

## 七、企业级应急清单（0-72 小时）

### 7.1 第 0-4 小时：止血

**SonicWall SMA1000**：

```bash
# 1. 立即打 hotfix
# hotfix 12.4.3-03453 (12.4.x) 或 12.5.0-02835 (12.5.x)
# 通过 SonicWall MySonicWall 账号下载

# 2. 临时禁用 WorkPlace 接口
# SMA 管理界面 → System → Administration → WorkPlace Settings
# Disable WorkPlace Access (or limit to management VLAN only)

# 3. 屏蔽 ASN 206092 的所有流量
iptables -A INPUT -s 45.131.194.0/24 -j DROP
iptables -A INPUT -s 45.146.54.0/24 -j DROP
iptables -A INPUT -s 63.135.161.0/24 -j DROP
iptables -A INPUT -s 173.239.211.0/24 -j DROP
iptables -A INPUT -s 193.37.32.179 -j DROP
iptables -A INPUT -s 193.37.32.214 -j DROP
iptables -A INPUT -s 216.73.163.151 -j DROP
iptables -A INPUT -s 216.73.163.158 -j DROP

# 4. 启用 hotfix 移除日志监控
tail -F /var/log/ctrl-service.log | grep "remove_hotfix"
```

**ADFS**：

```powershell
# 1. 备份 DKM 容器配置
# 2. 立即轮换 token-signing 证书
Set-AdfsProperties -AutoCertificateRollover $true
Update-AdfsCertificate -CertificateType Token-Signing -Urgent
# 3. 临时收紧 DKM 容器 ACL
# (按 KB5121391 操作)
# 4. 监控异常 ADFS token 签发
Get-WinEvent -LogName "AD FS/Admin" | Where-Object { $_.Message -like "*token*" }
```

**SharePoint**：

```powershell
# 1. 启用 AMSI Full Mode
# SharePoint Management Shell:
$farm = Get-SPFarm
$farm.Properties["AMSIIntegrationEnabled"] = $true
# Request Body Scan mode = Full
# 重启 SharePoint Timer Service

# 2. 临时禁用 Internet-facing Web App
# (如果不需要公网访问)
Set-SPWebApplication -Identity "https://sharepoint.example.com" \
    -Zone "Internet" -SecureSocketsLayer $true
# 改为内部 VPN + ADFS 条件访问

# 3. 监控 SharePoint 管理端点
Get-WinEvent -LogName "SharePoint Products-Shared" |
    Where-Object { $_.LevelDisplayName -eq "Error" -and $_.Message -like "*admin*" }
```

**BitLocker**：

```powershell
# 1. 监控所有 WinRE 启动事件
Get-WinEvent -LogName "Microsoft-Windows-BitLocker/BitLocker Management" |
    Where-Object { $_.Id -eq 795 -or $_.Id -eq 796 }
# Event 795 = recovery key use
# Event 796 = recovery password use

# 2. 强制 Secure Boot + TPM+PIN
# Group Policy: Computer Configuration → Administrative Templates
#   → Windows Components → BitLocker Drive Encryption
#   → Operating System Drives
#     - "Require additional authentication at startup" = Enabled
#     - "Configure TPM startup key" = Do not allow TPM

# 3. 物理安全审计
# 检查所有可移动设备、共享工作站的物理访问控制
```

**Langflow**：

```bash
# 1. 立即升级 Langflow 到最新版本
pip install --upgrade langflow

# 2. 轮换所有 LLM API key
# OpenAI dashboard
# Anthropic Console
# AWS IAM (Access Key rotation)
# Notion / Slack / 其他集成 token

# 3. 启用 WAF 限流
# 阻断异常的 flow ID 访问模式
# 监控跨租户访问日志
```

### 7.2 第 4-24 小时：全面排查

**威胁狩猎**：

```powershell
# 在所有 ADFS / DC / SharePoint 服务器上：

# 1. 查找异常 SAML token 签发
Get-WinEvent -LogName "AD FS/Admin" -FilterXPath "*[System[EventID=184]]*" |
    Where-Object { $_.TimeCreated -gt (Get-Date).AddDays(-30) } |
    Export-Csv adfs-token-history.csv

# 2. 查找异常 SharePoint 管理员操作
Get-SPLogEvent -StartTime (Get-Date).AddDays(-30) |
    Where-Object { $_.Category -eq "Administration" -and $_.User -notmatch "service" } |
    Export-Csv sharepoint-admin-audit.csv

# 3. 查找异常 LDAP 查询
Get-WinEvent -LogName "Security" -FilterXPath "*[System[EventID=1644]]*" |
    Where-Object { $_.TimeCreated -gt (Get-Date).AddDays(-30) }
```

**网络流量分析**：

```bash
# 1. 查找 SMA1000 → 内部 AMC 的 WebSocket 流量
# 在 SonicWall 上游抓包
tshark -i eth0 -Y 'tcp.port == 8188 && http.request.method == GET' -w suspicious.pcap

# 2. 查找 45.207.216.55 的所有流量
grep -r "45.207.216.55" /var/log/

# 3. 查找 ADFS → DC 的异常 LDAP 查询
# 监控 LDAP 查询中是否有 DKM 容器访问
```

**凭据轮换**：

```bash
# 1. 强制重置所有 ADFS 服务账户密码
# 2. 强制重置所有域管理员密码
# 3. 强制重置所有 SharePoint Farm 账户密码
# 4. 强制重置所有 LLM API key
# 5. 强制重置所有 Langflow 集成的第三方 token
```

### 7.3 第 24-72 小时：长期修复

**架构层加固**：

```text
1. SonicWall SMA 替换 / 升级
   - 考虑替换为更现代的 ZTNA 方案（如 Cloudflare Access, Zscaler ZIA）
   - 老的 SSL-VPN 设备是攻击首选面

2. ADFS 现代化
   - 评估迁移到 Entra ID (Azure AD) 的可能性
   - ADFS 4.0 (Windows Server 2016+) 已经接近 EOL
   - 云原生身份方案能减少本地 attack surface

3. SharePoint Server EOL 处理
   - SharePoint 2016/2019 = 7 月之后无安全更新
   - 必须迁移到 SharePoint Subscription Edition (SE)
   - 或迁移到 SharePoint Online (Microsoft 365)

4. BitLocker 架构强化
   - 部署 BitLocker Network Unlock
   - 启用 SED (Self-Encrypting Drive) 硬件加密
   - TPM+PIN 模式

5. Langflow / AI 编排安全
   - 部署在隔离的 VPC
   - 启用 mTLS 内部通信
   - LLM API key 存放在 HashiCorp Vault / AWS Secrets Manager
   - 不要在 Langflow flow 中明文存储凭据
```

**安全运营改进**：

```text
1. 减少本地账户的 blast radius
   - Tier 0 / Tier 1 / Tier 2 模型严格执行
   - ADFS 服务账户不能有 DC 权限
   - SharePoint Farm 账户不能有 ADFS 权限

2. 启用 Advanced Audit Policy
   - 监控所有 token-signing 操作
   - 监控所有 SharePoint 管理端点访问
   - 监控所有 LDAP DKM 容器访问

3. 部署 deception technology
   - 在 ADFS / SharePoint / Langflow 服务器上部署 honeypot
   - 用 honey token 监测攻击者的横向移动

4. 提升 Patch Tuesday 响应速度
   - Tier 0 系统（CISA KEV 加入）: 24 小时内
   - Tier 1 系统: 7 天内
   - Tier 2 系统: 30 天内
   - 通用补丁: 60 天内
```

## 八、2026 下半年的攻防趋势

### 8.1 身份基础设施成为主战场

2025 年的 0-day 主战场是**邮件网关**（Exchange、Proofpoint）。2026 年已经迁移到**身份基础设施**（ADFS、Entra ID、Okta、Ping）。

为什么？因为：

- **企业上云之后，邮件网关不再是边界**——攻击者绕过邮件直接打 Web 应用
- **身份是攻击 ROI 最高的入口**——一个 ADFS EoP 就能拿到整个企业的 SSO 令牌
- **AI 编排平台是新"凭据金矿"**——Langflow、Flowise、Dify 都在存 LLM API key

### 8.2 远程访问设备成为头号目标

SonicWall 不是个案。**所有 2024-2025 的 zero-day 大事件都涉及远程访问设备**：

- 2024-02 ConnectWise ScreenConnect RCE
- 2024-04 Fortinet FortiClient EMS SQL 注入
- 2024-05 Check Point Quantum 网关信息泄露
- 2025-01 Cisco ASA/FTD 任意文件读取
- 2025-03 FortiOS 认证绕过
- 2026-07 SonicWall SMA1000 0-day 链

**逻辑**：远程访问设备**被设计为对公网开放**，被设计为**绕过企业防火墙**，被设计为**处理高权限凭据**。这是攻击者 ROI 最高的攻击面。零信任（ZTNA）不是"未来趋势"，是"现在就必须做"。

### 8.3 AI 编排平台是新攻击面

Langflow 7 月的 IDOR + RCE 双联不是孤例。2026 年下半年预计会有更多 AI 编排平台的 0-day：

- Flowise（Node.js 写的 Langflow 替代品）
- Dify（Python + React）
- LangSmith / LangGraph Studio
- AutoGen Studio
- CrewAI Studio

**通用风险**：
- 凭据集中存储（所有用户的 LLM key 在一个地方）
- Python 沙箱逃逸（AutoGen / CrewAI 用 Python 执行工具）
- 跨租户数据泄露（IDOR 普遍）
- 提示词注入 → 工具调用 → RCE

### 8.4 Agentic Ransomware 时代

JADEPUFFER 是第一个被记录的 agentic ransomware，但不会是最后一个。**2026 年下半年到 2027 年**会出现：

- **更多基于 LLM 的攻击自动化**——人类操作员定义目标，Agent 自动完成侦察 → 漏洞利用 → 持久化 → 加密
- **RaaS + Agent 商业模式**——勒索软件团伙卖"AI 攻击 Agent"给低水平攻击者
- **AI 防御 vs AI 攻击**——EDR / XDR 厂商会推出"AI 防御 Agent"，攻防会进入 AI vs AI 的军备竞赛

### 8.5 CISA KEV 强制执行加强

联邦机构在 CISA KEV deadline（这次是 7/17）之后**必须**修，否则 BOD 26-04 要求设备下线。**私营部门可以参考这个时间表**：

- KEV 加入 + 在野利用 = **24 小时内修**
- KEV 加入 + PoC 公开 = **72 小时内修**
- KEV 加入 + 修复可用 = **7 天内修**
- 关键基础设施（能源、金融、医疗）= **48 小时内修**

## 九、参考资料

### 9.1 SonicWall SMA1000

- [Rapid7 MDR ETR: SonicWall SMA1000 Zero Days — rapid7.com](https://www.rapid7.com/blog/post/etr-rapid7-mdr-team-discovers-new-sonicwall-sma1000-zero-days-being-actively-exploited-cve-2026-15409-cve-2026-15410/) — 7/15 公开，附完整 IOC
- [SonicWall SMA1000 CVSS 10.0 Chain — infosec.ge](https://www.infosec.ge/blog/sonicwall-sma1000-zero-day-chain-cve-2026-15409-15410) — 攻击链深度拆解
- [CVE-2026-15409 KEV — cisa.gov](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) — 联邦机构 7/17 deadline

### 9.2 Microsoft 7 月 Patch Tuesday

- [Microsoft 622 CVE Update — Hacker News AE](https://hackernews.ae/microsoft-releases-update-addressing-622-vulnerabilities-including-two-exploited-zero-days) — ADFS + SharePoint 详细分析
- [July 2026 Patch Tuesday — Data Security Wiki](https://datasecuritywiki.com/july-2026-patch-tuesday-updates-and-analysis) — 完整 CVE 表格
- [ZDI July 2026 Security Update Review — thezdi.com](https://www.thezdi.com/blog/2026/7/14/the-july-2026-security-update-review) — Top 5 关键 CVE 工程师视角
- [Microsoft 570-Fix Patch Tuesday — windowsnews.ai](https://www.windowsnews.ai/article/microsofts-570-fix-patch-tuesday-two-zero-days-exploited-bitlocker-bypass-disclosed.438195) — IT 管理员视角

### 9.3 Langflow / AI 安全

- [CISA Adds 4 Actively Exploited Flaws to KEV — thehackernews.com](https://thehackernews.com/2026/07/cisa-adds-4-actively-exploited-adobe.html) — Langflow CVE-2026-55255 详情
- [Sysdig JADEPUFFER Agentic Ransomware — sysdig.com](https://sysdig.com/blog/jadepuffer-agentic-ransomware/) — 首个 agentic ransomware 案例

### 9.4 其他 0-day

- [Daily Cybersecurity Briefing 2026-07-16 — cybersecbrief.com](https://www.cybersecbrief.com/news/cybersec/cybersec-2026-07-16) — 5 个 0-day 综合 IOC
- [CyberScoop SonicWall Coverage — cyberscoop.com](https://cyberscoop.com) — 持续更新

## 十、结语

2026 年 7 月的 5 个 CISA KEV 0-day 不是孤立的"事件"，是**攻防趋势的转折点**：

1. **SonicWall SMA1000** 证明"远程访问设备 = 头号目标"
2. **ADFS EoP** 证明"身份基础设施 = 主战场"
3. **SharePoint EoP** 证明"SharePoint 2016/2019 EOL = 高危群体"
4. **BitLocker 绕过** 证明"物理层 + 加密层 = 持续被低估的攻击面"
5. **Langflow IDOR+RCE** 证明"AI 编排平台 = 新的凭据金矿"

对工程团队来说，最重要的不是**知道这些 0-day**，而是**建立"24-72-7-30"分级响应机制**：

- KEV + 在野利用 → 24 小时内
- KEV 加入 → 72 小时内
- 关键 CVE → 7 天内
- 普通 CVE → 30 天内

零信任（ZTNA）不是"未来投资"，是"现在必须的修复"。把 SonicWall、Fortinet、Check Point 这些远程访问设备从公网撤下来，换成 Cloudflare Access / Zscaler ZIA / Tailscale 这类基于身份的网络方案，**比 Patch Tuesday 周期内修 5 个 0-day 更治本**。

最后一句话：**2026 年下半年，安全运营的核心 KPI 不再是"打了多少补丁"，而是"在野利用的 0-day 多久能修完"**。
