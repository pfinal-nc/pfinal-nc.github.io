---
title: Rust Polonius Alpha 深度解析：下一代借用检查器的流敏感革命
date: 2026-08-14 00:00:00
tags:
  - rust
  - borrow-checker
  - polonius
  - compiler
keywords:
  - Rust Polonius
  - 借用检查器
  - flow-sensitive
  - NLL
  - lifetime
  - rustc
  - 编译器
  - 流敏感分析
category: 编程语言
description: '深度解析 Rust 下一代借用检查器 Polonius Alpha：流敏感借用检查如何让 get_mut_or_default 模式通过编译，nightly 启用细节、性能数据与 opt-out 方式。'
---

# Rust Polonius Alpha 深度解析：下一代借用检查器的流敏感革命

## 导语

2026 年 8 月 4 日，Rust 团队在官方博客宣布：**下一代借用检查器 Polonius Alpha 正式在 nightly 通道启用**，目标是在年底前稳定。

这可能是 Rust 自 2019 年 NLL（Non-Lexical Lifetimes）落地以来，借用检查器最重要的一次升级。它的核心是一个看似微小的分析能力变化——从**流不敏感（flow-insensitive）**升级为**流敏感（flow-sensitive）**——却能让一大批今天写不出来的代码通过编译，其中就包括每个 Rust 后端开发者都遇到过的经典痛点：`HashMap` 的 `get_mut_or_default` 模式。

本文将拆解 Polonius 的来龙去脉：为什么 NLL 不够、Polonius Alpha 解决了什么、还差什么、性能代价几何、以及你现在就能怎么用。

---

## 一、借用检查器的演进史

要理解 Polonius，先看 Rust 借用检查器的三代演进：

```
AST borrowck (2015)  →  NLL (2019)  →  Polonius Alpha (2026)
   词法级检查          非词法生命周期      流敏感生命周期
```

### 1.1 第一代：AST borrowck（2015）

Rust 1.0 时代的借用检查器基于**词法作用域**判断借用是否存活：一个借用"活着"的范围，就是它所在代码块的词法生命周期。这种分析非常保守，大量安全代码被误报拒绝。

最经典的例子——NLL 要解决的第一个痛点：

```rust
// Rust 1.0 时代：这段代码无法编译
fn main() {
    let mut x = 5;
    let y = &mut x;      // 借用开始
    println!("{}", y);   // 借用最后一次使用
    x += 1;              // ❌ 词法上 y 还"活着"，报错
}
```

词法分析下，`y` 的借用范围是整个代码块，尽管它在 `println!` 之后就没再用过。**变量的使用范围被词法作用域高估了。**

### 1.2 第二代：NLL（2019）

NLL（RFC 2094）把借用的存活范围从"词法块"细化为"最后一次使用点"：

```rust
// NLL 时代：这段代码可以编译
fn main() {
    let mut x = 5;
    let y = &mut x;
    println!("{}", y);   // y 的最后一次使用
    x += 1;              // ✅ NLL 知道 y 已死，允许
}
```

NLL 于 2019 年 11 月成为硬错误（彻底替换 AST borrowck），其"迁移模式"于 2022 年 8 月最终移除。自此 NLL 成为 Rust 借用检查的唯一实现。

但 NLL 有一个根本限制：**它的分析是流不敏感的**。

### 1.3 流不敏感 vs 流敏感

这两个术语决定了借用检查器的能力上限：

- **流不敏感（flow-insensitive）**：分析时不考虑程序的执行路径。一个借用只要在**任何**路径上存活，就认为它在**所有**路径上存活。
- **流敏感（flow-sensitive）**：分析时跟踪每条执行路径，知道借用只在特定分支中存活。

NLL 的"最后一次使用"已经是流敏感的雏形，但它对**生命周期 outlives 关系**（借用值必须存活超过某个生命周期）的分析仍是流不敏感的。这正是 Polonius 要突破的。

---

## 二、Polonius 的诞生：八年磨一剑

### 2.1 出身

Polonius 于 2018 年从 NLL 项目中独立出来，命名源自《爱的徒劳》中的人物（NLL 项目成员爱用莎剧人物命名）。最初的公式化模型（alias-based formulation）通过了 NLL 的全部测试，并且能接受一些 NLL 拒绝的（但确实是安全的）代码。

**但性能是致命伤**：普遍比 NLL 慢，某些程序慢到完全不可用。随后的多年里，多个重写尝试（如 `polonius.next`）都未能解决核心性能问题。

### 2.2 2023 年的转折

2023 年，nikomatsakis 提出了**新公式化（revisited formulation）**：不需要对现有 NLL 实现做大规模重构，就能扩展能力、让更多代码通过编译。团队曾希望 2024 年稳定，但各种问题导致延期。

直到 2026 年 8 月，Polonius Alpha 终于达到稳定门槛：

> At this point, there are no known remaining issues with the subset coined Polonius Alpha that we intend to stabilize. And, performance is generally acceptable for stabilization.

### 2.3 为什么叫 "Alpha"

Polonius Alpha 不是完整 Polonius，而是**准备稳定的子集**。有些程序在最初（慢速）Polonius 下能编译，在 Alpha 下却不能——这是它被冠以 Alpha 之名的原因（详见下文"还不完美"一节）。

---

## 三、核心能力：流敏感的 outlives 分析

### 3.1 最小示例

Polonius Alpha 相对 NLL 的核心提升：**对生命周期 outlives 关系做流敏感借用检查**。

最小的能通过 Polonius 但被 NLL 拒绝的例子：

```rust
fn reborrow(a: &mut u8) -> &mut u8 {
    let b = &mut *a;
    if true { b } else { a }
}
```

NLL 认为 `b` 和 `a` 的借用冲突；Polonius 知道两个分支互斥，`b` 分支里 `a` 的借用并未存活。

### 3.2 每个后端开发者都会遇到的例子

更常见、也更有实战价值的例子，是 `HashMap` 的"取或插默认值"模式：

```rust
use std::collections::HashMap;
use std::hash::Hash;

fn get_mut_or_default<'r, K: Hash + Eq + Copy, V: Default>(
    map: &'r mut HashMap<K, V>,
    key: K,
) -> &'r mut V {
    match map.get_mut(&key) {
        Some(value) => value,
        None => {
            map.insert(key, V::default());
            map.get_mut(&key).unwrap()
        }
    }
}
```

**这段代码在今天（NLL）编译不过。** 原因：

- 函数返回类型是 `&'r mut V`，要求 `get_mut` 返回的借用存活整个 `'r`
- 在 `Some(value) => value` 分支中，这个借用确实存活了
- **但 NLL 是流不敏感的**：它认为该借用在整个函数的所有路径上都存活
- 于是 `None` 分支里的 `map.insert(...)` 与"存活的借用"冲突 → 报错

而 Polonius Alpha 的流敏感分析知道：**在 `None` 分支里，`get_mut` 的借用从未产生**，`map.insert` 完全可以执行。

这是一个真实的模式：用 `match` 实现"存在则返回可变引用，不存在则插入默认值再返回"，是教科书推荐写法，却在 NLL 下被拒。开发者被迫用 `entry().or_insert_with()` 或 unsafe 绕过。

### 3.3 这意味着什么

Polonius Alpha 稳定后，一批"逻辑正确但借用检查过不去"的代码将直接通过编译：

- `match` 多分支中只在部分分支活用的借用
- 条件分支中重新借用（reborrow）的组合
- 类似 `get_mut_or_default` 的"读-改-返"复合操作

对后端开发者的直观影响：**更少的 `unsafe`、更少的 `entry()` 变通、更自然的函数签名**。

---

## 四、还不完美：Alpha 的边界

Polonius Alpha 不是全能的。官方明确承认：一些在**旧版 Polonius**（慢速完整版）下能编译的程序，在 Alpha 下不能。

例如：

```rust
struct X { next: Option<Box<X>> }

fn conditional() {
    let mut b = Some(Box::new(X { next: None }));
    let mut p = &mut b;
    while let Some(now) = p {
        if true {
            p = &mut now.next;
        }
    }
}
```

这段代码（循环 + 条件分支中的链式可变借用）在旧 Polonius 下可编译，Alpha 下不行。

不过官方也指出：**也有程序能通过 Alpha 但过不了旧 Polonius**——所以 Alpha 并非旧版的严格子集，而是一个不同的（更好的）折中点。这提醒我们：Polonius Alpha 稳定后，后续仍可能有进一步的能力扩展空间。

---

## 五、性能：多付出的代价

流敏感分析本质上**比流不敏感做更多工作**，性能回归是 Polonius 多年未能落地的核心原因。这次官方给出了详实的性能数据。

### 5.1 头部 crates 的表现

对 crates.io 下载量前一万的 crate 做基准测试：

- **绝大多数 crate 无显著回归**（低于 1% 阈值）
- 少数"显著回归"的 crate，回归幅度也相对较小
- 回归显著的 crate 分布：**编译时间越长（x 轴），回归比率越小**——大 crate 基本不受影响

### 5.2 最坏情况

在前一万名之外，团队重点测了**包含大量借用**的 crate，观察到的最坏情况是 **2-3 倍编译时间回归**。

### 5.3 团队的判断

> Overall we think these regressions are fairly reasonable even if we *can't* fix them, given how rare and relatively minimal they are compared to the additional power Polonius Alpha brings over NLL.

核心逻辑：**回归罕见且幅度小，相比带来的能力提升是值得的**。不过团队也承认已对回归原因做了初步排查，还在思考最优修复方案。

---

## 六、现在就能用：nightly 试用与 opt-out

### 6.1 启用状态

Polonius Alpha **只在 nightly 启用**。安装 nightly 工具链后，默认就会使用 Polonius Alpha 做借用检查：

```bash
rustup install nightly
# 之后的 nightly 构建默认启用 Polonius Alpha
```

### 6.2 如何 opt-out

如果你在 nightly 上遇到问题，可以退回 NLL：

```bash
# 方式一：rustc 参数
rustc -Zpolonius=off ...

# 方式二：环境变量
RUSTFLAGS="-Zpolonius=off" cargo build

# 方式三：项目级配置（推荐）
# .cargo/config.toml
[target.x86_64-unknown-linux-gnu]
rustflags = ["-Zpolonius=off"]
```

官方明确请求：如果必须 opt-out，请在 [GitHub issue #160456](https://github.com/rust-lang/rust/issues/160456) 或 Zulip 上告知原因——这有助于他们定位真实世界的回归场景。

### 6.3 团队想发现什么

nightly 启用是为了收集三类反馈：

1. **未发现的严重性能回归**
2. **公式化中的 unsoundness（不安全漏洞）**
3. **诊断信息质量下降**——官方目前尚未观察到任何诊断变化

---

## 七、时间线与展望

### 7.1 接下来几个月

- 监控 GitHub 和 Zulip 上报告的问题
- 修复已知性能回归
- 完善实现相关的内部文档
- **目标：年底前稳定**

### 7.2 稳定之后

官方明确表示：Polonius Alpha 稳定后，**短期内没有继续做 Polonius 特性开发的计划**。因为 Alpha 已解决最常遇到的借用检查问题，团队将把精力转向其他高优先级工作。优化实现、修复回归仍会持续一段时间。

---

## 八、对 Rust 生态的意义

### 8.1 对库作者的利好

`get_mut_or_default` 这类模式是真实痛点。Polonius 稳定后：

- 标准库/第三方库可以**移除一批 unsafe 实现**（原本为绕过借用检查而写）
- API 设计可以更自然——不再为了满足借用检查器而扭曲签名
- 教育成本下降：新人遇到的"编译器不让我写正确代码"类报错减少

### 8.2 与 Rust 2026 Edition 的关系

回顾 [Rust 2026 Edition 的五大特性](/dev/backend/rust/rust-2026-edition-deep-dive)：Async Closures、原生异步 Trait、Field Projection、`std::simd`、生命周期省略优化。Polonius Alpha 与 Edition 机制正交——它不改变语法，只改变借用检查的**分析精度**，因此**不需要 Edition 迁移**，所有 Edition（2015/2018/2021/2026）的代码都会受益。

### 8.3 风险与应对

- **编译时间**：个别借用密集型 crate 可能慢 2-3 倍——先用 `-Zpolonius=off` 兜底，再反馈给团队
- **行为变化**：Polonius Alpha 会让原本报错的代码通过——理论上存在接受 unsound 代码的微小风险，这正是 nightly 大规模测试的目的
- **诊断**：新代码路径可能带来新的错误信息模式，需要时间沉淀

---

## 九、总结

Polonius Alpha 是 Rust 借用检查器的一次里程碑式升级：

- **能力**：从流不敏感升级为流敏感，让 `get_mut_or_default` 这类"读-改-返"模式通过编译
- **现状**：nightly 启用，目标年底稳定；绝大多数 crate 无性能回归，最坏 2-3 倍
- **使用**：nightly 默认开启，`-Zpolonius=off` 可退回 NLL
- **边界**：Alpha 非完整 Polonius，部分旧版可编译的程序仍需等待

**借用检查是 Rust 的灵魂。** 从 AST borrowck 到 NLL 用了四年，从 NLL 到 Polonius Alpha 用了七年。每一次升级都在逼近同一个目标：**让编译器的安全分析，追上人类对代码真实语义的理解。** 对每个 Rust 后端开发者来说，年底的稳定版值得期待——那意味着更多自然的代码、更少的 unsafe、更快的开发节奏。

---

## 参考来源

- [Enabling the next iteration of the borrow checker on nightly（Rust 官方博客，2026-08-04）](https://blog.rust-lang.org/2026/08/04/enabling-polonius-alpha-on-nightly/)
- [NLL RFC 2094](https://rust-lang.github.io/rfcs/2094-nll.html)
- [NLL Hard Errors（2019）](https://blog.rust-lang.org/2019/11/01/nll-hard-errors/)
- [NLL by Default（2022）](https://blog.rust-lang.org/2022/08/05/nll-by-default)
- [Polonius GitHub 仓库](https://github.com/rust-lang/polonius)
- [An alias-based formulation of the borrow checker（2018）](https://smallcultfollowing.com/babysteps/blog/2018/04/27/an-alias-based-formulation-of-the-borrow-checker/)
- [Polonius Revisited 系列](https://smallcultfollowing.com/babysteps/series/polonius-revisited/)
- [rust-lang/rust issue #160456：Polonius Alpha 反馈](https://github.com/rust-lang/rust/issues/160456)