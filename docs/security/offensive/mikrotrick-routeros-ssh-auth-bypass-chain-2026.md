---
title: "MikroTrick 深度拆解：CERT Polska 曝光 MikroTik RouterOS 六漏洞，两条链无认证完全接管路由器"
date: 2026-09-14
tags:
  - security
  - vulnerability
  - mikrotik
  - routeros
  - ssh
  - auth-bypass
  - cisa-kev
  - zero-day
  - network-security
keywords:
  - MikroTrick
  - CVE-2026-67276
  - CVE-2026-86060
  - CVE-2026-67277
  - MikroTik RouterOS
  - CERT Polska
  - SSH 认证绕过
  - RSA 公钥指数
  - 参数注入
  - btest 带宽测试
  - CISA KEV
  - 122500 台暴露设备
  - 82.192.72.4
  - CWE-347
  - CWE-88
  - CWE-306
category: security/offensive
description: "CERT Polska 于 2026 年 9 月 5 日披露 MikroTik RouterOS 六个漏洞，其中 SSH 认证绕过（CVE-2026-67276，CVSS 9.2，RSA 公钥指数校验缺失）与 SSH 用户名参数注入（CVE-2026-86060，CVSS 9.2）组成的 MikroTrick 链可让未认证攻击者完全接管设备；btest 服务内存泄露（CVE-2026-67277，CVSS 8.8）可致内核内存泄露与拒绝服务。攻击自 9 月 2 日起在野利用，创建 ops 账号，来源 IP 82.192.72.4。全网约 12.25 万台 SSH 可及设备，修复版本 6.49.21/7.23.4/7.24.2。CISA 已将两 CVE 纳入 KEV。"
recommend: 安全工程
---

# MikroTrick 深度拆解：CERT Polska 曝光 MikroTik RouterOS 六漏洞，两条链无认证完全接管路由器

## 导语

2026 年 9 月 5 日，CERT Polska 发布安全通告，披露了由它协调发现的 **MikroTik RouterOS 六个安全漏洞**，其中两条组合攻击链被命名为 **MikroTrick**——攻击者无需任何认证，即可对 **SSH 服务可公网访问** 的 RouterOS 设备实现完全接管。

这不是理论风险。CERT Polska 已确认：**自 2026 年 9 月 2 日起**（比补丁发布早一天），就有真实攻击在互联网上利用该链夺取设备控制权——创建名为 `ops` 的特权账号，成功攻击流量可溯源至 IP `82.192.72.4`。

| 漏洞 | 组件 | CVSS | 本质 | 状态 |
|---|---|---|---|---|
| CVE-2026-67276 | SSH 认证 | **9.2** | RSA 公钥指数校验缺失（CWE-347） | 在野利用（链 A 入口） |
| CVE-2026-86060 | SSH 登录 | **9.2** | 用户名参数注入改策略掩码（CWE-88） | 在野利用（链 A 提权） |
| CVE-2026-67277 | btest 带宽测试 | **8.8** | 关键函数缺失认证 → 内存泄露+崩溃（CWE-306） | 未确认在野，已被 KEV 收录 |
| CVE-2026-67278 | TLS 证书 | 未公开 | TLS 服务器身份冒充 | 已随批次修复 |
| CVE-2026-67279 | 文件访问 | 未公开 | 未认证篡改文件（含配置） | 已随批次修复 |
| CVE-2026-67281 | 文件访问 | 未公开 | 泄露 root 属主文件（含配置库） | 已随批次修复 |

受影响面：Shadowserver 数据显示全网约 **122,500 台** MikroTik 设备的 SSH 服务暴露在公网（VulnCheck 扫描到约 70,000 台活跃 RouterOS SSH 服务），巴西（11,300）、美国与印尼（各 7,100）、捷克（6,300）、乌克兰（5,100）最为集中。

本文从漏洞技术原理、在野利用证据、IOC 狩猎到修复与防御，做系统性深度拆解。

## 一、漏洞链 A：MikroTrick 的两步接管

### Step 1：CVE-2026-67276 —— SSH 认证绕过

**根因**：RouterOS 在 SSH **公钥认证**流程中，只校验了 RSA 公钥的**类型与模数（modulus）**，**遗漏了对指数（exponent）的验证**。

RSA 公钥由 `(n, e)` 构成——模数与指数。正常的签名校验要求验证方持有完整的公钥参数。但 RouterOS 的实现只核对了 `n`：

```
攻击者视角：
已知目标用户 username + 该用户公钥的模数 n（可枚举/探测）
     ↓
构造 e = 1 的伪造公钥 (n, 1)
     ↓
由于校验逻辑只比对 key type + modulus（n 相同即通过）
     ↓
攻击者无需持有私钥，即可通过 SSH 公钥认证
```

`e = 1` 意味着签名验证退化：`s^1 ≡ m (mod n)`，攻击者可直接自造"签名"通过验证。这是 CWE-347（Improper Verification of Cryptographic Signature）的典型教科书案例——**验证了"是不是这把钥匙的锁"却没验证"这把钥匙能不能开锁"**。

**利用前置条件**：攻击者需要知道一个目标用户名及其公钥的模数。MikroTik 默认存在 `admin` 账号；公钥模数可以通过观察目标设备的公钥指纹或历史认证记录获取——实践中攻击者用自动化扫描（Shodan/FOFA 等都索引了 MikroTik 的 SSH banner）批量收集。

### Step 2：CVE-2026-86060 —— SSH 会话提权

CVE-2026-67276 只解决了"我是谁"的认证问题。RouterOS 默认的 `admin` 账号已经拥有完整权限，但很多设备会配置受限用户或自定义策略。真正把"认证通过"变成"完全管理员"的，是第二个漏洞：

**根因**：RouterOS 的 SSH 登录机制**没有正确处理以非法字符开头的用户名**。攻击者使用以特定禁用字符开头（如 `-2`）的 crafted username 登录时，可修改 RouterOS 的**可信策略掩码（trusted policy mask）**，将当前会话提升到**完全管理员权限**。

这是 CWE-88（Improper Neutralization of Argument Delimiters in a Command，参数注入）：用户名被当作命令行参数拼接处理，特殊字符没有正确过滤。

```
main ssh login flow
┌──────────────┐   username = "-2..."   ┌──────────────────────┐
│  SSH 登录入口 │ ─────────────────────→ │ RouterOS login helper │
│              │                        │ ① 参数分隔符未净化     │
│              │                        │ ② 修改 trusted policy  │
│              │                        │     mask               │
└──────────────┘                        └───────────┬──────────┘
                                                    ▼
                                       会话权限 = 完全管理员
```

### 组合：全流程

```
攻击者                  互联网                  目标 RouterOS（SSH 暴露）
  │                        │                          │
  │ ① 扫描 banner/枚举     │  Shodan/FOFA 索引        │
  │────────────────────────│─────────────────────────→│
  │ ② 伪造 e=1 公钥        │  CVE-2026-67276          │
  │   （认证绕过）          │─────────────────────────→│ 认证通过（无密码）
  │ ③ crafted username     │  CVE-2026-86060          │
  │   （提权）              │─────────────────────────→│ trusted mask 被改写
  │ ④ 创建 ops 账号        │                          │ 完全管理员
  │ ⑤ 持久化/横向          │←─────────────────────────│ 写入配置等
```

## 二、CVE-2026-67277：btest 内存泄露与崩溃

独立于认证链，RouterOS 的 **bandwidth-test（btest）** 服务存在**关键函数缺失认证**漏洞（CWE-306）：

- 未认证攻击者可触发 **内核内存泄露**（kernel memory disclosure）
- 可强制设备**内核重启/崩溃**（denial-of-service）

btest 是 RouterOS 内置的带宽测试工具（支持 TCP/UDP 双向测速），默认监听在设备上。该漏洞使暴露了 btest 服务（或默认开启）的设备面临远程信息泄露与可用性攻击。

CERT Polska 披露时**未确认该漏洞的在野利用**，但由于其无认证、远程可及，CISA 已将其与 CVE-2026-86060 一同纳入 KEV 目录（详见 CISA KEV 五漏洞篇章）。

## 三、在野利用：时间线、IOC 与幕后 IP

### 攻击时间线（关键节点）

| 日期 | 事件 |
|---|---|
| 2026-09-02 | 攻击者开始利用 MikroTrick 链（早于补丁一天），成功创建 `ops` 账号 |
| 2026-09-03 | MikroTik 发布修复版本 6.49.21 / 7.23.4 / 7.24.2（及 7.25beta3），但**对外隐瞒细节**，只通过移动端 App 推送警报，为修复争取时间 |
| 2026-09-04 | 网络工程师 Nick Pratley 对 7.23.3 vs 7.24.2 做**二进制 diff**，逆向还原出三个修复并发布可用 PoC（被动打破信息控制期） |
| 2026-09-05 | CERT Polska 协调披露完成，公开六个漏洞与 MikroTrick 命名 |
| 2026-09-05 | BleepingComputer / The Cyber Express 等媒体公开报道 |
| 2026-09-07 | CCB Belgium 发布紧急警告 |
| 2026-09-10 | CISA 将 CVE-2026-67277 与 CVE-2026-86060 纳入 KEV（联邦截止 9/13） |
| 2026-09-12 | THN 报道 CISA 五漏洞批量入 KEV，MikroTrick 两 CVE 在列 |

### IOC（妥协指标）

CERT Polska 给出了明确的日志狩猎线索：

1. **`login failure for user -2`** —— CVE-2026-86060 提权尝试的典型日志模式
2. **系统历史记录中出现 `ssh:-2@`** —— crafted username 会话痕迹
3. **创建 `ops` 账号** —— 攻击链成功后的持久化信号
4. **设备启动时出现 "Flagged" 标记** —— 修复版本固件在启动时扫描配置，发现异常修改会写入关键告警日志并设置 Flagged 警告标记

**来源 IP**：

| IP | 角色 |
|---|---|
| `82.192.72.4` | 已确认的成功入侵来源（自 9/2 起持续活动） |
| `103.102.31.18` | 观察到的链式利用尝试来源 |

CERT Polska 特别提醒：**没有发现上述痕迹 ≠ 没有入侵**——攻击者在未触发这些特征的情况下仍可能成功。

### MikroTik 补丁固件的自愈机制

在修复版本中，MikroTik 引入了一种主动检测机制：设备启动时扫描配置，寻找已知的未授权修改痕迹：

- 发现可疑配置项 → **自动禁用**（recognized suspicious configuration entries）
- 写入一条 **critical 日志**
- 设置 **Flagged** 警告标记

这使得已遭入侵的设备在重启/升级后可以自我暴露异常状态，但注意——**补丁只能阻止攻击，不能清除已经植入的后门**，受感染设备需要重刷镜像。

## 四、修复与防御

### 升级版本

| 分支 | 修复版本 |
|---|---|
| Long-term | **6.49.21** |
| Long-term | **7.23.4** |
| Stable | **7.24.2** |
| Development | 7.25beta3 |

CERT Polska 确认：**发布的补丁可以阻止观察到的攻击**。立即升级是最优先动作。

### 无法立即升级时的缓解

1. **限制 SSH 管理访问**：仅允许管理网段/IP 白名单访问 SSH，或改用带外（out-of-band / VPN）通路管理
2. **禁用/限制 btest 服务**：若不是业务必需，关闭 bandwidth-test 服务，或将其限制在可信网络
3. **暴露面收敛**：SSH、WWW/WWW-SSL 均只对管理网开放——这应当成为常态实践而非临时措施

### 受感染处置流程（升级之外）

1. **检查 `ops` / `-2` 账号**：发现即删除
2. **重刷/重镜像设备**：不能只依赖补丁，植入物可能已持久化
3. **轮换凭证**：所有通过该设备存储/可访问的账号口令全部更换
4. **检查策略掩码**：确认 trusted policy mask 未被改写
5. **日志审计**：按上述 IOC 搜索历史日志，判断入侵时间窗

## 五、为什么这件事值得警惕

**暴露面大**：12.25 万台 SSH 公网可达设备是"准确定位目标"——Shodan/FOFA 让批量扫描成本趋近于零。

**利用成本极低**：MikroTrick 不需要任何凭据，不需要用户交互，两步即达完全管理员。PoC 在披露后一天内公开。

**补丁信息被刻意隐瞒**：MikroTik 选择"静默修补"（silent patch）策略，意图为全球用户争取升级窗口，但 24 小时内就被二进制对比逆向破解——**"修补但不披露"在现代威胁情报面前撑不过一天**，行业已将此作为反面教材讨论（Nick Pratley 的文章标题即 The RouterOS 7.23.4 Fix They Wouldn't Explain）。

**路由器是网络咽喉**：被接管的 MikroTik 设备可被用于流量嗅探、DNS 劫持、中间人攻击、内网跳板——这对小 ISP/WISP、企业分支机构的杀伤力远大于被控一台服务器。

**历史上 RouterOS 是重灾区**：2020 年以来的多轮 RouterOS 漏洞（含 Meris 僵尸网络利用等）反复证明，边缘设备一旦失守，就是整个网络的入口。

## 参考链接

1. [CERT Polska：Critical vulnerabilities in MikroTik RouterOS are being actively exploited](https://cert.pl/en/posts/2026/09/vulnerabilities-in-mikrotik-routeros-actively-exploited/)
2. [CERT Polska：MikroTik RouterOS CVEs 专项页](https://cert.pl/en/posts/2026/09/mikrotik-routeros-cve)
3. [MikroTik 官方安全公告：September 2026 Vulnerability](https://mikrotik.com/supportsec/september-2026-vulnerability/)
4. [Tenable：CVE-2026-86060 详情](https://www.tenable.com/cve/CVE-2026-86060)
5. [BleepingComputer：Hackers exploit new MikroTik RouterOS flaws to hijack routers](https://www.bleepingcomputer.com/news/security/hackers-exploit-new-mikrotik-routeros-flaws-to-hijack-routers)
6. [SecurityWeek：MikroTik Patches Critical Flaws Chained to Hack Routers](https://www.securityweek.com/mikrotik-patches-critical-flaws-chained-to-hack-routers)
7. [CCB Belgium：Warning - Critical vulnerabilities in Mikrotik RouterOS](https://ccb.belgium.be/advisories/warning-critical-vulnerabilities-mikrotik-routeros-patch-immediately)
8. [Triskele Labs：Critical MikroTik RouterOS Vulnerabilities under Active Exploitation (MikroTrick)](https://www.triskelelabs.com/resources/critical-mikrotik-routeros-vulnerabilities-under-active-exploitation-mikrotrick)
9. [The Cyber Express：Attackers Exploited MikroTik RouterOS Flaws a Day Before Patches Shipped](https://thecyberexpress.com/mikrotik-routeros-exploited-before-patch)
10. [Nick Pratley：Reversing MikroTik's silent patch - the RouterOS 7.23.4 fix they wouldn't explain](https://npratley.net/reversing-mikrotiks-silent-patch-the-routeros-7-23-4-fix-they-wouldnt-explain/)