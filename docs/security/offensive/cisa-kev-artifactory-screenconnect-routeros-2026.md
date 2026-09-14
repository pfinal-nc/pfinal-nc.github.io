---
title: "CISA KEV 9/12 五漏洞批量入目录：JFrog Artifactory 链式管理员接管、ConnectWise ScreenConnect 9.9 与 MikroTik RouterOS 在野利用全景"
date: 2026-09-14
tags:
  - security
  - vulnerability
  - cisa-kev
  - jfrog
  - artifactory
  - screenconnect
  - connectwise
  - mikrotik
  - routeros
  - zero-day
  - supply-chain
keywords:
  - CISA KEV 2026
  - CVE-2026-42016
  - CVE-2026-42018
  - CVE-2026-84869
  - JFrog Artifactory
  - ConnectWise ScreenConnect
  - CVE-2026-82329
  - 联邦截止日期
  - BOD 26-04
  - 恶意 Groovy 插件
  - Rust 植入物
  - VBScript Loader
category: security/offensive
description: "CISA 于 2026 年 9 月 12 日将五个在野利用漏洞批量纳入 KEV 目录：JFrog Artifactory 的 CVE-2026-42016（CVSS 8.1 授权缺陷）与 CVE-2026-42018（CVSS 7.5 认证缺陷）可链上 CVE-2026-82329（CVSS 9.8）实现自托管实例管理员完全接管并植入恶意 Groovy 插件与 Rust 后门；ConnectWise ScreenConnect 的 CVE-2026-84869（CVSS 9.9）可在活动远程会话中未授权文件传输与执行；MikroTik RouterOS 的 CVE-2026-67277/CVE-2026-86060 为 MikroTrick 链。联邦机构截止日期：RouterOS 9/13、ScreenConnect 9/14、Artifactory 9/25。"
recommend: 安全工程
---

# CISA KEV 批量新增五漏洞：JFrog Artifactory 管理员接管、ConnectWise ScreenConnect 9.9 与 MikroTik RouterOS 在野利用全景

## 导语

2026 年 9 月 12 日，CISA 将 **五个正在被积极利用** 的漏洞一次性纳入已知被利用漏洞目录（KEV），覆盖三个关键供应商产品：

- **JFrog Artifactory**（2 个）：可链上已入目录的 CVE-2026-82329，实现自托管实例的**管理员完全接管**，实测攻击已植入恶意 Groovy 插件与 Rust 持久化后门
- **ConnectWise ScreenConnect**（1 个，**CVSS 9.9**）：在活动远程会话中未授权文件传输与执行
- **MikroTik RouterOS**（2 个）：即昨日深度拆解的 [MikroTrick 链](mikrotrick-routeros-ssh-auth-bypass-chain-2026) 核心漏洞

对联邦文职行政机构（FCEB）而言，这是 **BOD 26-04** 下的新一批强制修补任务——所有机构须在指定截止日期前完成修复。

| CVE | 产品 | CVSS | 类型 | FCEB 截止 |
|---|---|---|---|---|
| CVE-2026-42016 | JFrog Artifactory | 8.1 | 授权缺陷（CWE-863） | 2026-09-25 |
| CVE-2026-42018 | JFrog Artifactory | 7.5 | 认证缺陷（CWE-287） | 2026-09-25 |
| CVE-2026-84869 | ConnectWise ScreenConnect | **9.9** | 权限管理缺陷 + 缺失授权 | 2026-09-14 |
| CVE-2026-67277 | MikroTik RouterOS | 8.8 | btest 缺失认证 → 内存泄露/崩溃 | 2026-09-13 |
| CVE-2026-86060 | MikroTik RouterOS | 9.2 | 用户名参数注入 → 提权 | 2026-09-13 |

## 一、JFrog Artifactory：从认证虫洞到管理员接管

### 三个漏洞的完整链条

这次入目录的**两个 Artifactory 漏洞孤立的危害有限，但它们与 9 月 2 日已入目录的 CVE-2026-82329（CVSS 9.8 认证绕过）链式组合后，构成完整的未认证接管路径**：

```
攻击者
  │
  │ ① CVE-2026-82329（CVSS 9.8，已入 KEV）
  │    认证绕过：绕过 Artifactory 的登录校验
  ▼
 ② CVE-2026-42016（CVSS 8.1）
    不正确的授权校验：
    仅验证 token 的签名与 issuer，
    未验证 token 的 scope（权限范围）
    → 低权限 token 可执行高权限操作
  ▼
 ③ CVE-2026-42018（CVSS 7.5）
    不正确的认证处理：
    当匿名访问被禁用时，
    API 仍向未认证调用方返回匿名用户 token
    → 泄露仅限匿名用户可读的敏感资源
  ▼
 管理员权限接管 → 植入恶意 Groovy 插件 / Rust 后门 / VBScript Loader
```

### 逐个拆解

**CVE-2026-42016（CVSS 8.1）—— 授权校验只看签名不看 scope**

Artifactory 在授权校验时犯了一个经典错误：**只验证了 token 的签名和 issuer，没有验证 token 允许的权限范围（scope）**。持有合法签名 token 的用户，无论 token 实际授权了什么，都可以执行超出其权限的操作——这是 CWE-863（Incorrect Authorization）的典型实现缺陷。

**CVE-2026-42018（CVSS 7.5）—— 匿名令牌的越权返回**

当管理员**显式禁用了匿名访问**时，Artifactory 的某些 API 端点仍会把**内部匿名用户 token** 返回给未认证的调用方。这个 token 本身以匿名权限运行，但其存在暴露了"匿名访问其实没有真正关闭"的矛盾——攻击者借此读取本应被匿名策略挡住的敏感资源。

**CVE-2026-82329（CVSS 9.8，9/2 已入 KEV）—— 认证绕过的钥匙**

三者中最致命的是 9 月 2 日就已被 CISA 收录的 CVE-2026-82329（Phantom Join Key）。它允许攻击者绕过 Artifactory 的认证机制——博客此前已有 [CVE-2026-82329 Phantom Join Key 认证绕过深度分析](cve-2026-82329-jfrog-artifactory-phantom-join-key-auth-bypass-2026)，本文不再展开。

### 观测到的真实攻击活动（8/15 – 9/8）

CISA 预警与 JFrog 安全团队披露显示，攻击者已在真实环境中执行完整链：

1. **链式利用三个漏洞**获取自托管 Artifactory 实例的管理员控制权
2. **部署持久化组件**：恶意 Groovy 插件（跟随 Artifactory 启动机制运行）、Rust 编写的持久化植入物、VBScript Loader 阶段载荷
3. **控制窗口**：观测活动横跨 **2026-08-15 至 2026-09-08**

这些恶意组件设计的共同点是**高隐蔽性**：Groovy 插件伪装成正常功能插件，Rust 植入物刻意与业务进程混叠，VBScript Loader 走 LOLBin 执行降低告警命中率。

## 二、ConnectWise ScreenConnect：CVSS 9.9 的远程会话劫持

**CVE-2026-84869（CVSS 9.9）** 是这批里评分最高的单点漏洞，瞄准的是 **ScreenConnect 的权限管理机制**。

**根因（两层缺陷叠加）**：

1. **不当的权限管理（Improper Privilege Management）**：ScreenConnect 对"谁能控制活动远程会话"的授权边界定义不严谨
2. **缺失授权检查（Missing Authorization）**：文件传输与会话执行通道缺少对操作方的授权与**主机端确认（host confirmation）**

**利用效果**：攻击者可以利用一个**活动中的远程会话**，进行文件传输和命令执行——既不需要自己的授权凭据，也无需获得被控主机端的人工确认。在 IT 支持场景中，这等于劫持了技术支持人员正在使用的会话通道，直接接管正在被维护的机器。

**结合 ScreenConnect 的历史**（2024 年 CVE-2024-1708/1709 事件曾导致超大规模勒索软件批量投放），此类远程支持工具一旦出现会话级漏洞，影响半径通常是企业级连锁事件。

**FCEB 截止：2026-09-14**。

## 三、MikroTik RouterOS：MikroTrick 链正式进入 KEV

CVE-2026-67277（CVSS 8.8）与 CVE-2026-86060（CVSS 9.2）是昨日文章的 [MikroTrick 攻击链](mikrotrick-routeros-ssh-auth-bypass-chain-2026) 组成部分——SSH 公钥认证绕过 + 用户名参数注入，自 **9 月 2 日**起在野利用，攻击者创建 `ops` 账号，来源 IP `82.192.72.4`。

**注意**：KEV 收录的是 CVE-2026-86060（参数注入提权）与 CVE-2026-67277（btest 内存泄露），链式入口 CVE-2026-67276（SSH 认证绕过）**尚未单独入目录**——但它与已入目录漏洞同批修复，修复版本同为 6.49.21 / 7.23.4 / 7.24.2。

**FCEB 截止：2026-09-13**（本批最早截止的产品）。

## 四、KEV 目录机制与合规时间线解读

### 为什么 CISA 会在同一天批量收录

KEV 收录遵循"**已知被利用 + 存在明确修复**"双条件。9/12 这批集中出现，背后是各家厂商在 9 月上旬陆续确认在野利用并发布修复（Artifactory 攻击追溯窗 8/15–9/8、MikroTik 攻击自 9/2 起），CISA 在厂商确认后将其纳入强制执行轨道。

### BOD 26-04 的强制力

对 FCEB 机构：

- 必须在**截止日期前**完成受影响资产的修补
- 超过截止日期未修复 = 合规事件（需向 CISA 上报并接受监督）
- 截止日期设置存在差异是合理的：**RouterOS 9/13** 紧迫是因为暴露面巨大（12 万台公网 SSH）且在野利用已确认；**Artifactory 9/25** 相对靠后可能考虑了升级路径复杂度与攻击门槛

### 企业视角的行动映射

| 资产 | 响应动作 | 优先级 |
|---|---|---|
| MikroTik RouterOS | 升级 6.49.21/7.23.4/7.24.2，检查 `ops`/`-2` 账号与 Flagged 标记 | **立即** |
| ConnectWise ScreenConnect | 升级到修复版本，审计活动会话记录，收紧会话权限边界 | **立即** |
| JFrog Artifactory | 升级修复版，**排查恶意 Groovy 插件**（按插件启动时间/签名），杀毒扫描 Rust 植入物与 VBScript 载荷 | **紧急** |

### 排查 Artifactory 感染的三个抓手

1. **恶意 Groovy 插件**：列出自托管实例的全部插件，重点核对最近 2 周新增/变更的插件文件（`.groovy`），比对官方插件仓库校验和
2. **Rust 持久化植入物**：检查 Artifactory 进程树中的异常子进程、系统计划任务/服务中新增的 Rust 二进制
3. **VBScript Loader**：审计启动项与 WMI 事件订阅，搜索高危 VBS 载荷特征

## 五、本批启示

**供应链工具的信任半径被反复击穿**。Artifactory 是软件供应链的中枢（制品仓库），ScreenConnect 是运维通道，RouterOS 是网络咽喉——三个都是"**一个点失守、整条链沦陷**"的位置。攻击者 8/15-9/8 的真实操作证明，只要打穿 Artifactory 认证体系，恶意代码就能搭上企业的"官方发布管道"流向所有下游。

**防御建议**：制品仓库与远程支持工具应视为**最高信任级别资产**，部署专门监控（文件完整性 + 进程白名单 + 插件审计），而不能只依赖通用 EDR。

## 参考链接

1. [The Hacker News：CISA Adds 5 Actively Exploited Artifactory, ScreenConnect, and RouterOS Flaws to KEV](https://thehackernews.com/2026/09/cisa-adds-5-actively-exploited.html)
2. [CISA 已知被利用漏洞目录（KEV）](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)
3. [JFrog 安全公告：CVE-2026-42016 / CVE-2026-42018 / CVE-2026-82329](https://jfrog.com/help/r/jfrog-release-information/security)
4. [ConnectWise ScreenConnect 安全公告](https://www.connectwise.com/company/trust/security)
5. [CERT Polska：MikroTik RouterOS 漏洞专项](https://cert.pl/en/posts/2026/09/mikrotik-routeros-cve)
6. [SOC Defenders：CISA Alert AA26-254](https://www.socdefenders.com/2026/09/cisa-alert-aa26-254-actively-exploited.html)
7. [CISA：BOD 26-04 联邦机构漏洞修复指令](https://www.cisa.gov/news-events/directives/bod-26-04)