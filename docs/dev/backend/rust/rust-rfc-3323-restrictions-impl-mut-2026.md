---
title: Rust RFC 3323 Restrictions 深度解析：impl/mut 限制让 Sealed trait 成为历史
date: 2026-08-17 00:00:00
tags:
  - rust
  - rfc
  - sealed-trait
  - language-design
keywords:
  - Rust RFC 3323
  - impl_restriction
  - mut_restriction
  - Sealed trait
  - 只读字段
  - nightly
  - GSoC
  - 语言特性
category: 编程语言
description: '深度解析 Rust RFC 3323 Restrictions：impl(crate) 让 Sealed trait 模式成为历史，mut(crate) 为 Rust 带来真正的只读字段，nightly 已可测试。'
---

# Rust RFC 3323 Restrictions 深度解析：impl/mut 限制让 Sealed trait 成为历史

## 导语

2026 年 8 月 10 日，Rust 编译器团队宣布 **RFC 3323 "Restrictions" 已可在 nightly 上测试**。这个提案源自 2022 年，经过近四年的打磨，终于以 GSoC（Google Summer of Code）2026 项目的形式落地。

它带来两个全新的语言特性：

- **`impl_restriction`**：直接用 `impl(crate)` 限制 trait 的实现范围——让流行了近十年的 **Sealed trait 黑魔法**成为历史
- **`mut_restriction`**：用 `mut(crate)` 限制字段的修改范围——为 Rust 带来**真正的只读字段**，还顺带改善了借用检查体验

这两个特性看似简单，却触及 Rust 类型系统设计中两个长期痛点。本文将拆解它们解决什么问题、语法长什么样、有哪些边界与未解争议。

---

## 一、背景：两个被"模拟"了十年的能力

### 1.1 可读不可改：Rust 没有只读字段

C++、C#、Java、TypeScript、Kotlin、Swift 都有某种形式的只读字段。而 Rust 的字段可见性只有 `pub`/私有两档：

```rust
pub struct Time {
    pub hour: u8,      // 公开可读，但也公开可改
    // 想只读？只能私有 + getter
    minute: u8,
}
```

要保证 `Time` 的小时数永远是 0-23，作者只能把字段私有，然后写 getter：

```rust
impl Time {
    pub fn minute(&self) -> u8 { self.minute }
}
```

getter 的问题不只是样板代码，更在于**它切断了借用检查器的字段级分析**——编译器知道 `a.field1` 和 `a.field2` 的借用不会重叠，但从 getter 的函数签名里看不出来。

### 1.2 可调用不可实现：Sealed trait 的民间方案

另一个痛点：想让用户**调用** trait 的方法，但不允许用户**实现**这个 trait。比如标准库的 `Iterator` 不希望外部实现，或者某个内部协议只允许库自身实现。

官方 API 指南（C-SEALED）给出了经典方案——**Sealed trait 模式**：

```rust
/// 这个 trait 是 sealed 的，外部 crate 无法实现
pub trait Foo: private::Sealed {
    fn bar();
}

// 只给特定类型实现
impl Foo for usize {
    fn bar() {}
}

mod private {
    pub trait Sealed {}

    // 只为相同类型实现 Sealed
    impl Sealed for usize {}
}
```

它利用了一个语言特性：**公开项可以放在私有模块里**。外部 crate 能调用 `Foo` 的方法，但无法命名 `private::Sealed`，所以无法实现 `Foo`。

这套模式工作得很好，但代价明显：

- 需要额外定义一个 `Sealed` trait 和一个 `private` 模块
- 容易出错：给类型实现了 `Foo` 却忘了实现 `Sealed`（或反之），编译失败且报错信息难懂
- 报错信息对下游用户极不友好

RFC 3323 的目标，就是让这两件事变成**语言内置的、直接表达意图的**能力。

---

## 二、Restrictions：把"限制"变成一等公民

RFC 3323 的核心思想很简洁：**可见性（visibility）本质上就是一种限制**——编译器阻止你使用私有类型。`#[non_exhaustive]` 也是一种限制——要求 match 必须有通配分支。那么，为什么不能把"限制"扩展成更通用的语法？

于是有了两个新关键字用法，**语法上与 `pub` 完全对称**：

```
pub impl(crate) trait Foo {}     // 谁可以实现
pub mut(crate) foo: u8           // 谁可以修改
```

正如 `pub` 接受模块路径（`pub(crate)`、`pub(super)`、`pub(in path)`），`impl` 和 `mut` 也接受同样的路径。`pub` 控制"谁能看到"，`impl` 控制"谁能实现"，`mut` 控制"谁能修改"——三者平行。

> 注：关键词必须带路径使用，`impl` / `mut` 裸用是不允许的。

---

## 三、impl_restriction：内置的 Sealed trait

### 3.1 基本用法

```rust
#![feature(impl_restriction)]

pub impl(crate) trait Foo {
    fn method();
}

impl Foo for usize {
    fn method() {}
}
```

`impl(crate)` 限制 `Foo` **只能在本 crate 内被实现**。外部 crate 可以调用 `Foo::method()`，但尝试实现就会得到直接、清晰的错误。

### 3.2 更精确的范围

和 `pub` 一样，路径可以细化：

```rust
#![feature(impl_restriction)]

pub mod foo {
    pub mod bar {
        pub(crate) impl(super) trait Foo {}
    }

    // ✅ Foo 可以在 foo 模块内实现
    impl bar::Foo for i8 {}
}

// ❌ 错误：Foo 不能在 crate 根实现
impl foo::bar::Foo for u8 {}
```

编译器的报错直接指出限制位置：

```text
error: trait cannot be implemented outside `crate::foo`
  --> src/lib.rs:12:1
   |
12 | impl foo::bar::Foo for u8 {}
   | ^^^^^^^^^^^^^^^^^^^^^^^^^
   |
note: trait restricted here
  --> src/lib.rs:5:20
   |
 5 |         pub(crate) impl(super) trait Foo {}
   |                    ^^^^^^^^^^^
```

### 3.3 相比 Sealed trait 的三个优势

1. **少一个 trait**：不需要额外定义 `Sealed` 和 `private` 模块
2. **不会"漏实现"**：Sealed 模式中给类型实现了 `Foo` 却忘实现 `Sealed` 是常见错误，现在只有一个 trait 要操心
3. **文档与诊断更好**：限制是语言内建语义，文档可以自动展示，编译器报错也直达问题本身

---

## 四、mut_restriction：真正的只读字段

### 4.1 基本用法

```rust
#![feature(mut_restriction)]

pub struct Bar {
    pub mut(crate) alpha: u8,
}
```

字段 `alpha` 对所有 crate **可读**，但**只有本 crate 内可修改**。外部代码尝试修改会得到：

```text
error: field `alpha` cannot be mutated outside `crate::foo`
```

### 4.2 适用所有字段形式

不只 struct，enum 变体、union、元组 struct 全支持：

```rust
pub enum Foo {
    Alpha { mut(crate) x: u8 },
    Beta(mut(crate) u8),   // 元组风格也可以
}

pub union Bar {
    pub mut(crate) i: i32,
    pub f: f32,
}

pub struct Baz(pub mut(crate) u8); // 元组结构体也可以
```

### 4.3 对借用检查的意外好处

只读字段不仅是语法糖。官方博客特别指出：**它比 getter 更有利于借用检查**。

编译器能够识别**字段级借用**——`a.x` 和 `a.y` 是互不相交的内存位置，可以独立借用。但这一能力只能作用于直接的字段访问，一旦经过 `a.get_x()` 这样的函数调用，借用分析就退化为函数级别的保守判断。

```rust
pub struct Time {
    pub mut(crate) hour: u8,
    pub mut(crate) minute: u8,
}

// 直接字段访问：借用检查器知道两个字段不相交
fn update(t: &mut Time) {
    let h = &mut t.hour;
    let m = &t.minute;   // ✅ 与 h 不冲突
    // ...
}
```

如果用 getter 版本，第二行 `&t.minute()` 会与 `&mut t.hour` 冲突，因为编译器无法从函数签名推断它们不相交。

### 4.4 语义细节：什么算"修改"？

一个微妙问题：**什么算修改？** 考虑：

```rust
let mut x = 5;
let y = &mut x;   // 修改发生在哪里？这里！
*y = 6;
```

RFC 的答案是：**错误在"取可变引用"那一行产生**。因为修改发生在函数内部时无法在函数外得知（可能根本没改），唯一可靠的位置是创建 `&mut` 的地方。

那么内部可变性呢？

```rust
let x = Cell::new(5);
x.set(6);   // 内部可变性，不算"修改"
```

**内部可变性（interior mutability）不算修改**。理由很务实：如果算，那么对包含 mut-restricted 字段的类型的任何引用都无法创建（因为类型可能有内部可变字段），这会过度限制。想连内部可变性一起限制的 API，就不该公开这个字段。

### 4.5 struct 表达式限制：守住不变量

如果 mut-restricted 字段是为了维持不变量（比如 `Time.hour` 必须在 0-23），那么允许外部直接构造结构体会破坏它：

```rust
// 外部代码如果允许这样构造，不变量立刻被破坏
Time { hour: 32, minute: 0, ... }
```

所以 RFC 规定：**只要 struct 表达式涉及当前作用域不可变的 mut-restricted 字段，就禁止构造**——包括函数更新语法（`..` 语法），因为不变量可能依赖其他字段的值。

```rust
#![feature(mut_restriction)]

pub mod foo {
    pub struct Baz {
        pub alpha: u8,
        pub mut(self) beta: u8,
    }
}

fn main() {
    let bar = foo::Baz { alpha: 0, beta: 1 }; // ❌ 错误
}
```

报错：

```text
error: `Baz` cannot be constructed using a `struct` expression outside `crate::foo`
```

注意：这个限制是**逐变体**的。enum 中不受限的变体仍然可以正常构造：

```rust
pub enum Foo {
    Alpha { mut(crate) x: u8 },
    Beta { y: u8 },
}

// 外部 crate 可以构造 Beta，不能构造 Alpha
Foo::Beta { y: 5 };  // ✅
```

---

## 五、与现有方案对比

| 方案 | 解决的问题 | 局限 |
|------|-----------|------|
| **Sealed trait 模式** | 限制 trait 实现 | 需额外 trait + private 模块，诊断差，易漏实现 |
| **`readonly` crate** | 只读字段 | 类型不能实现 `Deref`；全有或全无（不能部分字段只读）；不能限制到模块级；无借用检查收益 |
| **derive-getters / getset** | getter 样板 | 本质还是函数调用，借用检查退化为函数级 |
| **RFC 3323（本提案）** | 两者都解决 | 尚在 nightly，语法未定 |

值得注意的对比细节：`readonly` crate 通过 `#[readonly::make]` 宏生成 `Deref` 实现，这要求类型不实现自己的 `Deref`，且是"全有或全无"。RFC 3323 的语言级方案没有这些限制，还能精确到 `mut(self)` 这种模块级精度。

---

## 六、尚未解决的问题

RFC 3323 虽是 2022 年就批准的，但语言团队在测试阶段仍留有几个**未决问题**：

1. **语法争议（最大）**：`impl(crate) trait Foo` 与 `impl Foo for Bar` 的相似性容易混淆。社区有声音主张改用 `#[restrict(impl(crate))]` 属性语法——它能分发到多个字段（`#[restrict(mut(crate))]` 作用于整个 struct），而关键字语法只能逐个写。**官方博客明确说这是主要开放问题。**

2. **`macro_rules!` 匹配器**：现有 `vis` 匹配器匹配不到限制语法，是否新增 `restriction` 匹配器尚未定论。

3. **无用限制 lint**：限制比可见性更严格时才需要；如果限制与可见性相同或更宽松，是否引入 lint 警告？

4. **`in` 语法**：`mut(in path)` / `impl(in path)` 是否保留？它很少被用到但很强大。

5. **更简洁的语法**：是否提供 `sealed` / `readonly` 之类的短关键字？

6. **struct 表达式是否该一刀切禁止**：有些场景希望"可构造但构造后不可修改"。

这些问题的答案，需要真实用户的反馈来驱动——这也是本次 call for testing 的目的。

---

## 七、如何试用与反馈

### 7.1 启用

```bash
rustup update nightly   # 确保是最新 nightly，特性很新
```

然后在代码顶部启用 feature gate：

```rust
#![feature(impl_restriction)]
#![feature(mut_restriction)]
```

两个特性是**独立的 feature gate**，可单独启用。

### 7.2 反馈渠道

- **反馈 issue**：[rust-lang/rust#160614](https://github.com/rust-lang/rust/issues/160614)（官方指定的专用反馈渠道）
- **追踪 issue**：[rust-lang/rust#105077](https://github.com/rust-lang/rust/issues/105077)
- **RFC 文档**：[rust-lang.github.io/rfcs/3323-restrictions.html](https://rust-lang.github.io/rfcs/3323-restrictions.html)

### 7.3 实现背景

这两个特性由 **GSoC 2026 项目**实现，mentor 是 Jacob Pratt（jhpratt）和 Urgau。编译器团队呼吁大家重点测试并反馈语法偏好——因为语法仍可讨论，现在是影响语言走向的最佳时机。

---

## 八、对 Rust 生态的意义

### 8.1 对库作者的直接影响

- **API 设计更诚实**：`pub mut(crate) field` 让"公开可读、内部可改"直接写在声明里，而不是藏在 getter 后面
- **删除样板代码**：大量只读字段的 getter 可以删除
- **更强的封装**：`impl(crate) trait` 让内部协议 trait 既能公开调用又能锁死实现权

### 8.2 与 Polonius 的协同

上一个热点（[Polonius Alpha](/dev/backend/rust/rust-polonius-alpha-borrow-checker-2026)）解决了借用检查的流敏感分析问题；RFC 3323 的 `mut_restriction` 则从**字段级借用**角度减少 getter 对借用分析的破坏。两者结合，Rust 的借用检查正变得越来越"懂"真实的代码结构。

### 8.3 前瞻

RFC 未来可能性中还提到：

- **真正 sealed/exhaustive trait**：一旦 impl 限制稳定，未来可支持依赖"实现列表完备"的编译期穷举
- **set-once 字段**：可构造但永不修改的"真只读"字段
- **trait 项可见性**：trait 内部方法也能有可见性/限制

这些都是更远的演进，但地基正是本次的 Restrictions。

---

## 九、总结

RFC 3323 Restrictions 是 Rust 类型系统的一次"补课"：

- **`impl_restriction`**：`impl(crate)` 让 Sealed trait 的民间黑魔法变成语言内建能力，诊断更好、更不容易出错
- **`mut_restriction`**：`mut(crate)` 为 Rust 带来真正精细的只读字段，同时利用字段级借用让借用检查更聪明
- **现状**：nightly 可测，语法未定，官方公开征集反馈
- **本质**：Rust 正在把"限制"从库层面的模拟，升级为类型系统的一等公民

**对开发者而言，这是影响语言走向的机会。** 语法到底用 `impl(crate) trait Foo` 还是 `#[restrict(impl(crate))]`，取决于真实世界的试用反馈。如果你维护的库用过 Sealed trait 或 getter，不妨在 nightly 上跑一遍，到 issue #160614 说说你的偏好——这可能是你参与 Rust 语言设计最直接的一次机会。

---

## 参考来源

- [Call for testing: Restricting trait implementability and field mutability（Inside Rust 官方博客，2026-08-10）](https://blog.rust-lang.org/inside-rust/2026/08/10/call-for-testing-impl-and-mut-restrictions/)
- [RFC 3323: Restrictions（Rust RFC Book 官方文档）](https://rust-lang.github.io/rfcs/3323-restrictions.html)
- [Rust API Guidelines: C-SEALED（Sealed trait 官方指南）](https://rust-lang.github.io/api-guidelines/future-proofing.html#sealed-traits-protect-against-downstream-implementations-c-sealed)
- [Tracking Issue for Restrictions（rust-lang/rust#105077）](https://github.com/rust-lang/rust/issues/105077)
- [Feedback on `impl` and `mut` restrictions（rust-lang/rust#160614）](https://github.com/rust-lang/rust/issues/160614)
- [GSoC 2026 项目页面（Restrictions）](https://summerofcode.withgoogle.com/programs/2026/projects/xFrskRCv)