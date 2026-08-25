---
title: Coldcard 硬件钱包 RNG 漏洞解剖：Yasmarang 确定性回退如何让 1,367 BTC 无声蒸发
date: 2026-08-04
tags:
  - security
  - hardware-wallet
  - coldcard
  - rng
  - bitcoin
  - firmware
  - crypto
  - prompt
  - supply-chain
keywords:
  - Coldcard RNG 漏洞
  - Yasmarang
  - STM32 硬件随机数
  - 比特币硬件钱包
  - 1,367 BTC 被盗
  - Coinkite
  - Block 工程团队
  - MicroPython 随机数回退
  - 熵估算
  - BIP-39 助记词
  - Claude Code 漏洞发现
category: security/offensive
description: 2026 年 7 月末，比特币硬件钱包 Coldcard 曝出历史上规模最大的 RNG 漏洞：固件集成错误导致 ngu.random 调用了 MicroPython 的确定性 Yasmarang 软件生成器，而非 STM32 硬件随机数，攻击者离线枚举即可还原私钥，约 1,367 BTC（价值超 8800 万美元）被盗。本文完整复盘 Block 工程团队的根因分析、受影响设备范围、熵退化估算与防护方案，并探讨 Claude Code 8 分钟复现漏洞的 AI 审计意义。
recommend: 安全工程
---
# Coldcard 硬件钱包 RNG 漏洞解剖：Yasmarang 确定性回退如何让 1,367 BTC 无声蒸发

> Block 工程团队根因分析 | 2026-07-30 披露 | 硬件钱包史上最大规模 RNG 漏洞

## 引言

2026 年 7 月 30 日，比特币硬件钱包 **Coldcard** 用户发现大量资金在毫无征兆的情况下被盗。仅仅 41 分钟内，攻击者从 1,196 个地址榨干了约 **1,082 BTC**；随后数日内，Galaxy Research 追踪到第二、第三波攻击，最终确认**被盗总量升至约 1,367 BTC，价值约 8,860 万美元**（不同来源估算区间在 7,000 万~1 亿美元+）。

这不是传统意义上的"黑客入侵设备"。攻击者在**零破解的情况下离线重建了受害者的私钥**。

根因是一枚隐藏在固件深处的 RNG（随机数生成器）集成错误：Coldcard 的固件本应调用 **STM32 硬件随机数**，却因一处宏检查错误，静默回退到了 **MicroPython 的确定性软件生成器 Yasmarang**。这个生成器的"随机性"来源于设备 UID 和定时器状态——对一个能猜测 UID 和调用历史的攻击者来说，私钥熵可能从理论上的 128 位暴跌到约 40 位（部分设备）。

本文基于 **Block 工程与安全团队发布的根因分析**（engineering.block.xyz）、BleepingComputer 与 Coinkite 公告，完整解剖这条受害链，并探讨一个耐人寻味的信号：**Anthropic 的 Claude Code 仅用 8 分钟就独立发现了这个漏洞。**

## 漏洞速览

| 项目 | 详情 |
|------|------|
| 受影响设备 | Coldcard Mk2/Mk3（v4.0.0~v4.1.9）、Mk4/Q/Mk5（生产固件） |
| 根因 | `ngu.random` 使用 MicroPython 确定性 Yasmarang 回退，而非 STM32 硬件 RNG |
| 熵退化 | Mk2/Mk3 v4：至约 2^40 候选；Mk4/Q/Mk5：至多 2^32（再演时更少） |
| 被盗规模 | 约 1,367 BTC（约 8,860 万美元），4,585+ 地址（截至 8 月 1 日） |
| 攻击方式 | 离线穷举重建私钥 → 生成地址 → 与链上地址比对，命中即转走 |
| 发现者 | Block 工程团队 + Coinkite + 社区研究者（多团队 2026-07-30 联合披露） |
| 修复固件 | Mk2/Mk3 ≥4.2.0、Mk4/Mk5 ≥5.6.0、Q ≥1.5.0Q（Edge ≥6.6.0X/QX） |

## 根因：一行宏检查错误导致的 RNG 静默降级

Block 工程团队将漏洞定位到 Coldcard 固件的 **libngu 库**中。问题出在随机数的集成方式：

```
正确路径（应有行为）：
  libngu → STM32 硬件 RNG（真正不可预测的随机源）

实际路径（漏洞行为）：
  libngu → MicroPython 的 rng_get() → Yasmarang（确定性软件生成器）
```

**根因**：生产板卡配置定义 `MICROPY_HW_ENABLE_RNG` 为 0（因为 Coldcard 提供了独立的硬件 RNG 封装，标记无需重复启用）。但 **libngu 错误地检查了"该宏是否被定义"而非"是否被启用"**。构建因此成功，libngu 绑定到了 MicroPython 的 `rng_get()`——而宏值为 0 时，该函数使用的是 **Yasmarang 软件生成器**，其种子来自 MCU UID 与定时器寄存器。

### Yasmarang 是什么？

Yasmarang 是 MicroPython 内置的一个**确定性伪随机数生成器**，并非加密安全随机源。它的输出由内部状态（p、r、h、s 等变量）通过固定位运算递推产生。一旦初始种子已知，整个输出序列完全确定。

在 Coldcard 的场景中，初始种子取决于：

| 输入 | 特征 | 安全后果 |
|------|------|----------|
| MCU UID | 固定 96 位芯片标识（仅低 32 位使用） | 设备身份，**非新鲜熵** |
| SysTick | 可预测的周期递减计数器 | 最多 80,000（Mk2/Mk3）或 120,000（当前设备）个取值 |
| RTC->TR | 时间寄存器 | 与启动时间相关，可能静态 |
| RTC->SSR | RTC 亚秒计数器 | 与 RTC->TR 和执行时序相关 |

对整个可预测输入的攻击者而言，**流序列可以离线完整重建**。

## 受影响设备的细分（熵退化程度）

Block 报告的"回归"（regression）在不同设备代际呈现不同程度：

| 设备 | 固件（生成密钥时） | 评估 |
|------|--------------------|------|
| Mk1 | 全部发布版至 v3.0.6 | **不在本次退化范围** |
| Mk2 | 至 v3.2.2 | 使用直接 STM32 硬件 RNG |
| Mk2 | v4.0.0~v4.1.9 | **确认受影响**；无安全再演（reseed） |
| Mk3 | 至 v3.2.2 | 使用直接 STM32 硬件 RNG |
| Mk3 | v4.0.0~v4.1.9 | **确认受影响**；无安全再演 |
| Mk4 | 生产 v5.0.0 起 | **回退仍在**；安全再演仅限 32 位 |
| Q | 全部生产固件 | 同 Mk4 的回退与再演结构 |
| Mk5 | 全部生产固件 | 同当前 Mk 固件构造 |

### 熵究竟退化到多少？

- **Mk2/Mk3 v4.0.0~v4.1.9**：无任何密码学输入。若攻击者已知 UID 与调用历史，候选空间上界约 **2^40.7**；若 RTC 在冷启动时稳定，仅按 SysTick 计算则窄至约 **2^16.3**
- **Mk4/Q/Mk5（成功再演）**：安全元件熵被哈希后仅保留 4 字节注入 `reseed()`，再用它替换一个 32 位 Yasmarang 状态字。对于固定的回退状态与调用历史，可区分的输出流最多 **2^32** 种，平均约 2^31 次候选

换句话说：**"128 位熵"的保护承诺，在特定设备上实质退化到 40 位甚至 16 位——现代计算力下完全可以并行穷举。**

## 攻击者如何离线盗走资产

一次典型攻击的完整逻辑链：

```
1. 攻击者掌握受影响固件的 RNG 实现细节（开源 firmware）
2. 对某个 UID / 定时器状态组合，离线枚举可能的种子
3. 复现 Yasmarang 序列 → 生成候选私钥 → 导出对应比特币地址
4. 遍历链上所有地址，寻找与候选地址的匹配
5. 命中即：这枚私钥属于某人 → 签名转账 → 资金归并到攻击者钱包
6. 等待受害者补仓 / 新设备上线 → 重复匹配
```

这就是为什么攻击可以"无声"完成：受害者无需被"攻破"设备，私钥在他人手中被离线重建。Coinpedia 报道指出，攻击者**提前生成了数百万个候选钱包密钥并等待匹配地址出现在链上**。

### Coinkite 的受影响范围清单

Coinkite 公告定义的受影响种子包括：

- **Mk2 与 Mk3**：固件 4.0.1 至 4.1.9 生成的种子
- **Mk4 与 Mk5**：标准版 5.6.0 之前、Edge 版 6.6.0X 之前的设备
- **Q**：标准版 1.5.0Q 之前、Edge 版 6.6.0QX 之前的设备

## 修复与处置

Coinkite 发布了修复固件，并销毁了所有出厂预装受影响固件的在途设备：

| 设备 | 修复版本 |
|------|----------|
| Mk2 / Mk3 | 4.2.0 及以上 |
| Mk4 / Mk5（标准） | 5.6.0 及以上 |
| Q（标准） | 1.5.0Q 及以上 |
| Edge 版 | 6.6.0X / 6.6.0QX |

### 受影响用户的迁移步骤

```
1. 验证现有备份（勿在未备份前升级）
2. 安装修复固件
3. 生成并稳妥记录新的助记词种子
4. 在设备上核对新钱包地址
5. 先发一笔小额测试交易确认到账
6. 将剩余全部资金迁移到新钱包
```

**特别提示**：使用额外 BIP-39 口令（passphrase）的用户风险显著较低——因为口令在种子之外提供了额外的一层安全，即使种子熵退化，攻击者还原出基础种子也无法直接动用资产。但这不等同于"安全"，仍建议迁移。

## Claude Code 8 分钟复现漏洞：AI 审计的意义

本事件最耐人寻味的支线：根据 U.Today、36Crypto 等报道，安全研究员 Medusa 在 X 上称 **Anthropic 的 Claude Code 仅用一次提示、8 分钟思考，就从 Coldcard 源码中独立定位了这枚漏洞**——与攻击者利用的完全相同。

> "Claude Code 只用一次提示就找到了 Coldcard 钱包漏洞。它思考了 8 分钟，而我们还没有准备好面对接下来会发生什么。" —— 研究员 Medusa

这个事件承载了双重含义：

1. **正向**：AI 代码审计能够以极低成本发现真实世界中正在被攻击利用的漏洞。若此类审计在资产上线前被常规执行，部分被盗资金或可避免
2. **反向**：同一个 AI 能力，被攻击者用于审计目标固件后，同样可以加速漏洞武器化。**AI 审计是双刃剑**——谁先用，谁掌握不对称优势

对此安全界的反思是：硬件钱包等高风险资产的安全验证，**不能只依赖人类审计员的抽样检查**，而应把 AI 驱动的全量源码审计纳入出厂前的强制环节。

## 防御启示总结

```
1. 硬件钱包用户：
   - 立即核查受影响固件版本
   - 无论是在受影响设备上生成过的种子，一律迁移
   - 若含 BIP-39 口令，风险降低但不豁免迁移

2. 硬件钱包厂商：
   - RNG 采用必须做"启用"检查而非"定义"检查（本漏洞直接教训）
   - 出厂前引入 AI 全量源码审计 + 熵健康度自动验证
   - 安全元件熵注入必须做全宽注入，不可折叠到 32 位

3. 整个加密生态：
   - RNG 是硬件钱包的信任锚点，任何"确定性回退"都应是红线
   - 供应链安全不仅要防后门，更要防"看似正常的功能回归"
```

## 结语

Coldcard 事件暴露了一个残酷的现实：**硬件钱包的安全承诺，可能因为一处宏检查错误而整体坍塌，而其代价以数千万美元计。** 当"128 位熵"的保护在面对可预测的 UID 和定时器时退化到 40 位、16 位甚至 0 位（已确认可复现）时，纸上参数与真实安全之间的距离，被 Communities 用真金白银重新丈量了一次。

而 Claude Code 8 分钟复现漏洞，则是一个明确的信号：**AI 时代的漏洞发现速度即将超过人类防御响应速度。** 对于手中握着私钥的人来说，尽早迁移、远离确定性随机源，永远不是坏选择。

## 参考来源

- Block 工程博客：[Predictable RNG Fallback and 32-Bit Reseed in COLDCARD Firmware](https://engineering.block.xyz/blog/predictable-rng-fallback-and-32-bit-reseed-in-coldcard-firmware) (2026-07-30)
- BleepingComputer: [COLDCARD wallet RNG flaw likely linked to $88 million Bitcoin theft](https://www.bleepingcomputer.com/news/security/coldcard-wallet-rng-flaw-likely-linked-to-88-million-bitcoin-theft/) (2026-08-02)
- U.Today: [Claude identifies $100 million bitcoin vulnerability in eight minutes](https://u.today/claude-identifies-100-million-bitcoin-vulnerability-in-eight-minutes) (2026-08-03)
- Coinpedia: [Coldcard Wallet Flaw Exposed? Hacker Quietly Drains 1,082 BTC](https://coinpedia.org/news/coldcard-wallet-flaw-exposed-hacker-quietly-drains-1082-btc-before-security-warning/) (2026-08-01)