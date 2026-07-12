---
title: "YellowKey 与 GreenPlasma：Windows 安全防线组合突破深度分析"
date: 2026-07-13
tags:
  - security
  - windows
  - vulnerability
  - CVE
  - offensive-security
  - bitlocker
keywords:
  - YellowKey
  - GreenPlasma
  - BitLocker
  - Windows Defender
  - CVE-2026
  - 本地提权
  - 加密绕过
  - TOCTOU
  - CTFMON
  - 漏洞分析
category: security/offensive
description: "2026年5月12日，匿名研究员 ChaoticEclipse 公开两枚 Windows 零日漏洞：YellowKey 物理接触绕过 BitLocker 加密，GreenPlasma 利用 CTFMON 实现本地提权至 SYSTEM。本文深度分析技术路径、攻击链组合与防御策略。"
---

# YellowKey 与 GreenPlasma：Windows 安全防线组合突破深度分析

2026 年 5 月 12 日，一个被微软「补丁星期二」逼到墙角的匿名研究员 **ChaoticEclipse**（亦用名 Nightmare-Eclipse）在 GitHub 上公开了第四、第五枚 Windows 零日漏洞利用代码：**YellowKey** 与 **GreenPlasma**。这是自 2026 年 3 月底以来，该研究员对微软发起的**第三轮报复性公开披露**。

前两轮披露的 **BlueHammer**、**RedSun**、**UnDefend** 已被实战利用——其中 BlueHammer 被纳入美国 CISA「已知被利用漏洞」目录，要求联邦机构限期修补。Huntress 安全团队的事件复盘显示，这些漏洞已被通过 FortiGate SSL VPN 入侵的攻击者作为后渗透工具实际部署，攻击者使用了 Go 语言编译的隧道工具 **BeigeBurrow**。

本轮披露的 YellowKey 与 GreenPlasma 则代表了另一种威胁模型：**从物理接触到完整系统控制的组合突破**。

## 五枚漏洞全景：三轮披露的完整时间线

```
2026-04-02 ~ 04-16  第一轮：Defender 三件套
├── BlueHammer (CVE-2026-33825, CVSS 7.8)  → TOCTOU 本地提权，已修复，CISA KEV
├── RedSun                                 → 同攻击面写入 System32，截至发稿未修复
└── UnDefend                               → 阻断 Defender 签名更新，截至发稿未修复

2026-05-12          第二轮：补丁日特别表演
├── YellowKey                              → 物理接触绕过 BitLocker，未修复
└── GreenPlasma                            → CTFMON 本地提权，PoC 不完整（夺旗赛挑战）
```

| 漏洞 | 类型 | CVSS | 状态 | 核心威胁 |
|------|------|------|------|---------|
| BlueHammer | TOCTOU 本地提权 | 7.8 | 🟡 已修复 | 修复流程竞争条件 |
| RedSun | 任意文件写入 System32 | 7.8 | 🔴 未修复 | 替换 SYSTEM 二进制 |
| UnDefend | 安全功能禁用 | 7.8 | 🔴 未修复 | 切断 Defender 更新 |
| **YellowKey** | **BitLocker 加密绕过** | **7.8** | **🔴 未修复** | **物理接触即数据泄露** |
| **GreenPlasma** | **本地提权至 SYSTEM** | **7.8** | **🔴 未修复** | **标准用户→SYSTEM** |

## YellowKey：跨过 BitLocker 这道「最后防线」

### 漏洞概述

YellowKey 的杀伤力在于：**仅需对目标设备的物理接触，即可绕过 BitLocker 完整磁盘加密**。这意味着"丢失的笔记本电脑"从一桩硬件资产事件直接升格为**数据泄露通报事件**——无需密码、无需 TPM 破解、无需冷启动攻击。

> 研究员声称该漏洞「躲过了所有内部审查」，并暗示可能是微软主动注入的后门。即使 BitLocker 配置为 **TPM+PIN 模式**（被普遍视为最强配置），漏洞依然存在。

### 影响范围

- **受影响**：Windows 11、Windows Server 2022/2025
- **不受影响**：Windows 10（攻击路径在该版本上不存在）

### 技术路径：USB 攻击面

YellowKey 的核心攻击路径利用了 Windows 恢复环境（WinRE）的启动流程：

```
攻击准备                          目标设备
──────────                        ──────────
1. 准备 FsTx 目录
   └── 研究员提供的特殊文件结构
   
2. 拷贝到 USB 盘
   └── System Volume Information/
       └── 特定路径下
              
3. 插入目标设备                    USB 设备接入
                                  
4. 按住 Shift + 重启               进入 WinRE 启动流程
   
5. 松开 Shift，按住 CTRL           在特定时机拦截启动流程
   
6. 系统弹出命令行                    🚨 获得 BitLocker 受保护卷的
                                     无限制访问权限
```

**关键时机**：WinRE 启动过程中存在一个不安全的过渡窗口。在「按住 Shift 点重启」进入 Windows 恢复环境后，松开 Shift 并立即按住 CTRL，若时机正确，系统会弹出对 BitLocker 受保护卷的无限制访问命令行。

这一时序攻击的精妙之处在于：**它不需要破解加密算法，而是绕过了解密流程的 UI 控制层**。

### 替代路径：EFI 分区写入

研究员同时说明了另一条攻击路径：

> 若能短暂从目标机取出磁盘，把 FsTx 文件直接写入 EFI 系统分区，再装回机器，攻击同样成立。

这条路径虽然需要物理拆机，但绕过了 USB 设备的检测门槛，适用于对 USB 端口有物理管控（如禁用 USB、使用端口锁）的高安全环境。

### 独立验证

| 验证者 | 身份 | USB 路径 | EFI 路径 |
|--------|------|---------|---------|
| Kevin Beaumont | 独立研究员 | ✅ 确认有效 | 未测试 |
| Will Dormann | Tharros Labs 分析师 | ✅ 验证成功 | ❌ 无法复现 |

> **注意**：TPM+PIN 版本的 PoC 未公开，研究员仅声称该配置下漏洞依然存在。企业环境应假设所有 BitLocker 配置均受影响，直到微软发布官方补丁。

## GreenPlasma：CTFMON 的 SYSTEM 级滥用

### 漏洞概述

GreenPlasma 是一个**本地权限提升**漏洞，允许标准用户通过滥用 **CTFMON（`ctfmon.exe`）** 获取 SYSTEM 权限。CTFMON 是 Windows 的文本输入服务监控程序，在每个交互会话中以 SYSTEM 权限运行，负责管理键盘布局、语音识别和输入法。

> 概念验证不完整——研究员**故意留下最后一步**让攻击者自行补完，类似夺旗赛题目。但这并不意味着漏洞不存在，而是研究员在披露与攻击者之间设置了一道"技术门槛"。

### 技术路径：内存节注入

GreenPlasma 的攻击路径可以概括为：

```
标准用户进程
    │
    ├── 1. 注册表操控
    │   └── 修改 CTFMON 相关的注册表项
    │
    ├── 2. 权限操控
    │   └── 在 SYSTEM 可写的目录对象中创建内存节对象
    │
    ├── 3. 内存节构造
    │   └── 创建攻击者控制的内存节（Section Object）
    │
    └── 4. 与 CTFMON 交互
        └── 让 SYSTEM 运行的 CTFMON 加载攻击者构造的内存节
            └── 注入 shellcode 或伪造 DLL
                └── 🚨 SYSTEM 权限执行
```

**核心机制**：CTFMON 作为 SYSTEM 进程，需要与每个用户的桌面会话交互。Windows 的会话隔离机制在此存在一个设计上的张力：CTFMON 必须跨越会话边界提供服务，而这个跨越的通道成为了攻击面。

### 利用难度与实战风险

Forescout 安全情报副总裁 **Rik Ferguson** 指出：

> 当前形态在默认 Windows 配置下会触发**用户账户控制（UAC）同意提示**，要实现静默利用仍需额外工程。

Bridewell 网络威胁情报首席分析师 **Gavin Knapp** 警告：

> 此类提权漏洞「常被攻击者用于初始立足之后，便于发现并采集凭据与数据、横向移动至其他系统，最终走向数据窃取或勒索软件部署」。

这意味着 GreenPlasma 的实战价值不在于「从 0 到 SYSTEM」，而在于**「从用户到 SYSTEM」的横向移动加速器**：

```
初始入侵（钓鱼/漏洞）→ 标准用户权限
                              ↓
                    GreenPlasma 提权
                              ↓
                    SYSTEM 权限
                              ↓
                    凭据采集（LSASS/NTDS）
                              ↓
                    横向移动 → 域控
                              ↓
                    勒索软件部署 / 数据窃取
```

## 组合攻击：YellowKey + GreenPlasma 的完整杀伤链

单看 YellowKey 或 GreenPlasma，各自都有明显的限制：

- **YellowKey**：需要物理接触，但获得的是对加密卷的完整访问
- **GreenPlasma**：需要已有一个用户会话，但获得的是 SYSTEM 权限

两者的组合则构成了一条**从物理接触到完全控制**的完整杀伤链：

```
场景：攻击者获得一台「丢失的」企业笔记本

步骤 1：YellowKey 物理接触
    ├── 插入 USB 盘
    ├── Shift + 重启 + CTRL 时机
    └── 获得 BitLocker 卷的明文访问
        └── 读取硬盘上的所有数据：文档、代码、配置文件、数据库

步骤 2：植入持久化后门
    ├── 在系统分区植入修改过的系统文件
    └── 或添加新的启动项/服务

步骤 3：归还设备（或等待目标开机）
    └── 用户正常登录，完全不知情

步骤 4：GreenPlasma 提权
    └── 后门以标准用户权限运行
    └── 触发 GreenPlasma 提权至 SYSTEM
    └── 完全控制目标系统

步骤 5：横向移动
    └── 从笔记本窃取的企业凭据
    └── 访问 VPN、邮箱、云存储
    └── 向企业内网横向渗透
```

**关键洞察**：BitLocker 的设计假设是「物理安全 = 数据安全」。YellowKey 打破了这个假设——物理接触不再只是硬件损失，而是数据泄露的起点。

## 防御策略：多层缓解方案

### 针对 YellowKey 的缓解

| 层级 | 措施 | 有效性 | 实施难度 |
|------|------|--------|---------|
| **物理** | 禁用 USB 端口（物理锁/胶水） | ⭐⭐⭐⭐⭐ | 低 |
| **物理** | 使用机箱入侵检测（Chassis Intrusion） | ⭐⭐⭐⭐ | 中 |
| **系统** | 禁用 WinRE 启动（组策略） | ⭐⭐⭐ | 低 |
| **加密** | 启用 TPM+PIN（研究员声称仍受影响） | ⭐⭐ | 低 |
| **网络** | 设备丢失后立即撤销所有凭据 | ⭐⭐⭐⭐ | 中 |
| **监控** | 部署 DLP 和数据分类，限制敏感数据驻留本地 | ⭐⭐⭐⭐ | 高 |

**紧急缓解脚本**（通过组策略禁用 WinRE 启动）：

```powershell
# 以管理员运行
# 禁用通过 Shift+重启 进入 WinRE
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" `
    /v "HideRecoveryEnvironment" /t REG_DWORD /d 1 /f

# 禁用高级启动选项菜单
bcdedit /set {default} bootmenupolicy standard

# 验证
reagentc /info
```

### 针对 GreenPlasma 的缓解

| 层级 | 措施 | 有效性 |
|------|------|--------|
| **UAC** | 确保 UAC 设置为最高级别（始终通知） | ⭐⭐⭐⭐ |
| **CTFMON** | 在非多语言环境禁用 CTFMON（谨慎） | ⭐⭐⭐ |
| **EDR** | 监控 CTFMON 的异常子进程和内存操作 | ⭐⭐⭐⭐ |
| **注册表** | 监控 CTFMON 相关注册表项的修改 | ⭐⭐⭐⭐ |

**PowerShell 监控脚本**（检测 CTFMON 异常行为）：

```powershell
# 检测 CTFMON 是否加载了非标准 DLL
$ctfmon = Get-Process ctfmon -ErrorAction SilentlyContinue
if ($ctfmon) {
    $modules = $ctfmon.Modules | Where-Object { 
        $_.FileName -notmatch "C:\\Windows\\System32|C:\\Windows\\SysWOW64" 
    }
    if ($modules) {
        Write-Warning "CTFMON 加载了非标准模块:"
        $modules | Select-Object ModuleName, FileName
    }
}

# 检测 CTFMON 的父进程异常
Get-WmiObject Win32_Process | Where-Object { 
    $_.Name -eq "ctfmon.exe" -and $_.ParentProcessId -ne 0 
} | ForEach-Object {
    $parent = Get-Process -Id $_.ParentProcessId -ErrorAction SilentlyContinue
    if ($parent -and $parent.Name -notin @("explorer", "userinit")) {
        Write-Warning "CTFMON 异常父进程: $($parent.Name) (PID: $($parent.Id))"
    }
}
```

### 组合防御架构

```
┌─────────────────────────────────────────────┐
│              企业终端防御架构                  │
│                                               │
│  ┌─────────────┐    ┌─────────────┐          │
│  │  物理层     │    │  系统层     │          │
│  │             │    │             │          │
│  │ • USB 端口锁 │    │ • WinRE 禁用│          │
│  │ • 机箱入侵检测│    │ • UAC 最高  │          │
│  │ • 资产追踪   │    │ • 安全启动   │          │
│  └─────────────┘    └─────────────┘          │
│         │                  │                  │
│         └────────┬─────────┘                  │
│                  │                            │
│         ┌────────▼─────────┐                 │
│         │     检测层        │                 │
│         │                  │                 │
│         │ • EDR 行为监控    │                 │
│         │ • 注册表变更检测  │                 │
│         │ • 异常进程树告警  │                 │
│         └──────────────────┘                 │
│                  │                            │
│         ┌────────▼─────────┐                 │
│         │     响应层        │                 │
│         │                  │                 │
│         │ • 设备丢失→立即撤销 │                │
│         │   所有凭据        │                 │
│         │ • 隔离可疑设备    │                 │
│         └──────────────────┘                 │
└─────────────────────────────────────────────┘
```

## 事件响应：发现设备丢失后的 72 小时

如果企业设备（笔记本、工作站）确认丢失或被盗，按以下时间线响应：

| 时间 | 动作 | 负责团队 |
|------|------|---------|
| **0~2 小时** | 确认设备状态、最后已知位置、BitLocker 配置 | 安全运营 + IT 资产 |
| **2~4 小时** | 撤销设备上所有缓存凭据（VPN、邮箱、云存储） | 身份与访问管理 |
| **4~24 小时** | 审计该设备最近访问的所有系统和数据 | 安全运营 + 数据 owner |
| **24~72 小时** | 假设数据已泄露，启动泄露评估和通报流程 | 法务 + 合规 + 安全 |
| **持续** | 监控该设备相关凭据的异常登录（攻击者可能已提取） | 安全运营 |

## 总结

YellowKey 与 GreenPlasma 的组合披露，揭示了 Windows 安全架构中两个深层的信任假设断裂：

1. **BitLocker 的物理安全假设**：物理接触不再只是硬件损失，而是数据泄露的直接通道。YellowKey 通过 WinRE 启动时序攻击，在不触碰加密算法的前提下，绕过了整个解密控制层。

2. **CTFMON 的会话隔离假设**：一个负责文本输入的 SYSTEM 进程，其跨会话服务机制成为了权限提升的踏板。GreenPlasma 展示了即使是"看似无害"的系统组件，也可能被转化为攻击武器。

**关键防御要点**：

- ✅ 立即禁用 WinRE 通过 Shift+重启 的启动入口（物理安全是最后的防线）
- ✅ 确保 UAC 设置为最高级别（GreenPlasma 在默认配置下会触发提示）
- ✅ 部署 EDR 监控 CTFMON 的异常行为（DLL 加载、内存操作、父进程异常）
- ✅ 建立设备丢失的 72 小时响应流程（假设 YellowKey 可成功，立即撤销所有凭据）
- ✅ 限制敏感数据驻留本地（DLP + 数据分类，减少物理接触后的泄露面）

截至发稿，微软尚未就 YellowKey 和 GreenPlasma 公开作出技术回应。在补丁发布前，上述缓解措施是降低风险的唯一手段。

## 参考资源

- [ZONE.CI 原文分析](https://security.zone.ci/secarticles/wx/540696.html) — YellowKey 与 GreenPlasma 技术细节
- [Huntress 事件复盘](https://www.huntress.com/blog/) — Defender 三件套实战利用分析
- [Microsoft Security Response Center](https://www.microsoft.com/en-us/msrc) — 官方补丁发布渠道
- [CISA KEV 目录](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) — BlueHammer 纳入情况
- [Kevin Beaumont 验证](https://doublepulsar.com/) — 独立研究员的 YellowKey 验证

---

> **免责声明**：本文仅用于安全研究和防御目的。未经授权利用上述漏洞攻击他人系统是违法行为。请在合法授权的环境中进行安全测试。
