---
title: Rust never type 稳定化：一个没有值的类型，为何等了 11 年
date: 2026-09-01
tags:
  - rust
  - 类型系统
  - 编译器
  - 语言特性
keywords: Rust, never type, never type fallback, Infallible, RFC 1216, PR #155499, Rust 1.100, 类型系统, 错误处理
category: 编程语言
description: Rust never type（!）的稳定化 PR #155499 于 2026 年 8 月 24 日合并，历经 11 年长跑即将随 Rust 1.100 正式落地。本文深度解析 ! 的类型系统原理、Infallible 统一、fallback 破坏性变化及迁移策略。
---

# Rust never type 稳定化：一个没有值的类型，为何等了 11 年

## 11 年的终点

2026 年 8 月 24 日，Rust 编译器仓库的一个 PR 被合并了：`rust-lang/rust#155499`，标题很简单——"stabilize never type"。从 RFC 1216（2015 年 7 月 19 日提交）到 PR 合并，这条路走了 11 年零 1 个月。

never type（写作 `!`）不是一个新概念。如果你写过 Rust，你大概率已经用过它：

```rust
fn bail(msg: &str) -> ! {
    eprintln!("{msg}");
    std::process::exit(1);
}
```

返回类型位置的 `!` 表示这个函数永远不会正常返回——要么 panic，要么无限循环，要么直接退出进程。这在 stable Rust 中一直可用。

但那只是 `!` 的一小部分能力。把它用在类型位置——`let x: !`、`Result<T, !>`、作为泛型参数——一直是 nightly only。直到现在。

## never type 是什么

### 空洞类型

类型系统里，每个类型对应一个值的集合：

- `bool` → 2 个值（true, false）
- `u8` → 256 个值
- `()` → 1 个值（单元值）
- `!` → **0 个值**

`!` 是一个没有任何合法值的类型。你无法构造出 `!` 的实例。正因如此，返回 `!` 的函数永远不会正常返回——它没有值可以返回。

### 万物之子类型

因为没有值存在，`!` 可以被强制转换为任何其他类型。这不是语法糖，而是类型系统的核心特性：

```rust
// panic! 返回 !，自动 coerce 到 u32
let x: u32 = panic!("这不返回 u32");

// loop {} 返回 !，可以赋值给任何类型
let y: String = loop {
    std::process::exit(0);
};
```

这个特性让控制流中的不可达分支可以自然地与任何类型对齐，不需要显式转换。

## 稳定化做了什么

PR #155499 一次处理了四件事：

### 1. `!` 作为完整的一等类型

稳定后，`!` 不再局限于返回类型位置，可以作为泛型参数、关联类型、变量类型使用：

```rust
// 稳定前：nightly only
#![feature(never_type)]

// 稳定后：无需 feature gate
fn forever() -> ! {
    loop {}
}

// ! 作为泛型参数
fn map_infallible<T>(result: Result<T, !>) -> T {
    match result {
        Ok(val) => val,
        Err(e) => match e {}, // 穷尽匹配，不需要处理
    }
}

// ! 作为关联类型
trait Processor {
    type Error;
    fn process(&self, input: &[u8]) -> Result<Vec<u8>, Self::Error>;
}

struct NoFailProcessor;

impl Processor for NoFailProcessor {
    type Error = !;  // 这个处理器不会失败
    fn process(&self, input: &[u8]) -> Result<Vec<u8>, !> {
        Ok(input.to_vec())
    }
}
```

### 2. Infallible 成为 ! 的类型别名

标准库中的 `std::convert::Infallible` 一直是一个没有变体的枚举，语义上等价于 `!`：

```rust
// 稳定前：Infallible 是独立的枚举
pub enum Infallible {}

// 稳定后：Infallible 是 ! 的类型别名
pub type Infallible = !;
```

这解决了 Rust 类型系统中长期存在的"双重定义"问题。所有使用 `Infallible` 的 API（如 `TryFrom`、`str::parse`）将自动获得 `!` 的全部能力。

### 3. 所有 Edition 的 fallback 改为 !

这是最核心的破坏性变化。当编译器无法通过上下文推断一个发散表达式（如 `loop {}`、`panic!()`）的具体类型时，需要使用 fallback：

```rust
// Rust 2015/2018/2021 Edition:
let x = loop { break; };
// 稳定前：x 的类型推断为 ()
// 稳定后：x 的类型推断为 !（然后 coerce 到 () 时不报错）

// 但如果后续代码依赖了 () 的特定行为:
let x = loop { break; };
let _ = x.something();  // () 的方法 vs ! 的方法
```

在稳定化前，fallback 是 `()`。稳定化后，所有 Edition 的 fallback 改为 `!`。因为 `!` 可以 coerce 到 `()`，大部分代码不受影响。但如果代码依赖了 fallback 类型的特定 trait 实现或方法，就会产生编译错误。

### 4. 移除 dependency_on_unit_never_type_fallback lint

这个 lint 原本用于警告依赖 `()` fallback 的代码。既然 fallback 已改为 `!`，这个 lint 不再可能被触发，自然移除。

## 为什么等了 11 年

### 第一次稳定化与回退

`!` 并非第一次接近稳定。2019 年底，Rust 1.41 曾短暂在 stable 中包含了 `!` 类型，但很快因回归问题被撤回。

问题出在 never-to-any coercion fallback 机制上。当编译器无法确定 `!` 应该转换为什么类型时，它会 fallback 到一个默认类型。在当时的 Rust 中，这个 fallback 是 `()`。`!` 的稳定化改变了这个默认值，导致一些旧代码的类型推断突然失败。

### 渐进式推进

回退后，社区用了数年设计更稳妥的方案：

```
稳定化时间线：

2015-07-19  RFC 1216 提交（! 类型 / bang type）
    │
    │  [数年讨论与设计迭代]
    │
2019年底    Rust 1.41 短暂稳定 → 因回退问题撤回
    │
    │  [fallback 机制重新设计]
    │
2024        Rust 2024 Edition: 先将 fallback 与 Edition 绑定
    │        (Edition 2024 中 fallback 改为 !)
    │
2026-08-24  PR #155499 合并：全 Edition 统一 fallback 为 !
    │
2026-09-25  Rust 1.100 从 master 分支
    │
2026-11-12  Rust 1.100 正式发布到 stable
```

关键设计决策是将 fallback 变化与 Edition 绑定，让用户可以选择何时迁移。但最终方案更加激进——直接在所有 Edition 上统一，crater 测试表明影响可控。

## 实际影响

### 更精确的错误处理

最常见的收益场景是"理论上可能失败但实际上不会"的操作：

```rust
// 稳定前：使用 Infallible 表示不会失败
use std::convert::Infallible;

fn parse_hardcoded(s: &str) -> Result<u32, Infallible> {
    Ok(s.parse::<u32>().unwrap_or(0))
}

// 稳定后：直接使用 !，语义更清晰
fn parse_hardcoded(s: &str) -> Result<u32, !> {
    Ok(s.parse::<u32>().unwrap_or(0))
}

// ! 可以 coerce 到任何类型，unwrap 自然通过
let val: u32 = parse_hardcoded("42").unwrap();
// 不需要担心 Infallible 的 Debug 实现问题
```

### TryFrom / str::parse 的变化

标准库中大量 API 使用 `Result<T, Infallible>`。稳定后这些将变成 `Result<T, !>`：

```rust
// TryFrom 在错误类型为 Infallible 时，实际上是 "不会失败" 的转换
impl TryFrom<&str> for MyType {
    type Error = !;  // 稳定后可以直接用 !

    fn try_from(s: &str) -> Result<Self, !> {
        Ok(MyType(s.to_string()))
    }
}

// 调用时，? 操作符自然穿透，不需要错误处理
fn process(input: &str) -> MyType {
    let typed: MyType = input.try_into().unwrap();  // unwrap 不会 panic
    typed
}
```

### Agent 编排引擎中的应用

在 AI Agent 编排场景中，`!` 类型可以静态排除不可能的失败路径：

```rust
// Agent 编排管线中的 ! 类型应用
trait AgentStep {
    type Error;
    fn execute(&self, ctx: &mut Context) -> Result<Output, Self::Error>;
}

// 从内存读取配置——语义上不会失败
struct ReadConfig;
impl AgentStep for ReadConfig {
    type Error = !;  // 静态保证：这一步不会失败

    fn execute(&self, ctx: &mut Context) -> Result<Output, !> {
        Ok(ctx.config.clone().into())
    }
}

// 泛型编排函数：错误类型为 ! 的步骤可以自然融入任何管线
fn run_step<S: AgentStep>(step: &S, ctx: &mut Context) -> Result<Output, S::Error> {
    step.execute(ctx)
}

// 调用时不需要处理 ReadConfig 的错误分支
fn pipeline(ctx: &mut Context) -> Result<Output, PipelineError> {
    let config = run_step(&ReadConfig, ctx)?;  // ? 自然穿透
    let data = run_step(&FetchData, ctx)?;    // 真正可能失败的步骤
    Ok(transform(config, data))
}
```

## 破坏性变化

### anyhow 用户

约 20 个 crate 受影响。问题出在 `anyhow::anyhow!(e)` 宏的强制转换位置：

```rust
// 问题模式：Infallible (即将变成 !) 经过 anyhow! 宏转换
result_with_infallible_error.map_err(|e| anyhow::anyhow!(e))

// 修复方案：在强制转换位置显式标注类型
// 方案 A：直接穷尽匹配（推荐）
result_with_infallible_error.map_err(|e| match e {} as anyhow::Error)

// 方案 B：显式标注
result_with_infallible_error.map_err(|e| -> anyhow::Error {
    match e {}
})
```

### From reservation impl 冲突

标准库中存在一个 `From<!>` 的预留实现（reservation impl），防止其他人手动实现 `From<!>`。当 `Infallible` 变成 `!` 后，14 个 crate 现有的 `From<Infallible>` 实现会与这个 reservation impl 冲突。

解决方案是移除 reservation impl。这对大多数用户无感知，但如果你有自定义的 `From<Infallible>` 实现，需要检查是否与标准库的 `From<!>` 冲突。

### 边缘强制转换差异

`Box::new(e)` 配合 `Box<dyn Error>` 的转型在 `!` 和 `Infallible` 上表现不一致，影响 sqlite-tiny 等少数 crate。

## 迁移策略

```rust
// 迁移清单：

// 1. 检查直接匹配 Infallible 枚举变体的代码
// 稳定前：
match error {
    // 如果有模式匹配 Infallible 的变体
}
// 稳定后：Infallible 是 !，没有变体可以匹配
// 改为：match error {} （穷尽匹配）

// 2. 将 Result<T, Infallible> 改为 Result<T, !>
// 可选但推荐，让语义更清晰
fn old_api() -> Result<String, Infallible> { Ok("hello".into()) }
fn new_api() -> Result<String, !> { Ok("hello".into()) }

// 3. 检查发散表达式的类型推断
let val = loop { break; };
// 如果后续代码依赖 val: () 的特定行为，添加显式标注
let val: () = loop { break; };  // 显式标注

// 4. 移除对第三方 never/void crate 的依赖
// Cargo.toml: 移除 never = "..." 或 void = "..."
// 代码中: 将第三方 Never/Void 类型替换为 !
```

## 与 Try trait 的协同

`!` 的稳定化与 `Try` trait 的稳定化是一枚硬币的两面：

- `!` 让类型系统能表达"不会失败"（`Result<T, !>`）
- `Try` trait 统一"可能会失败且需要传播"的模式（`?` 操作符的底层机制）

当错误类型为 `!` 时，`?` 操作符的行为变得非常自然——它根本不需要做任何转换，因为不存在需要传播的错误值。这让泛型错误处理管线的类型签名更加精确。

## 对 Rust 生态的长远意义

空洞类型的稳定化填补了 Rust 类型系统中的一个长期缺口：

1. **"不可能"成为可表达的类型**：不需要注释、约定或第三方 crate
2. **API 契约更精确**：`Result<T, !>` 静态保证不会失败，优于 `unwrap()` + 注释
3. **泛型设计简化**：不再需要区分 `Infallible` 和 `!` 的行为差异
4. **形式化基础补全**：空洞类型是类型理论的基本构造，Rust 长期缺少它

从更深层次看，`!` 的稳定意味着 Rust 的 never-to-any coercion 机制终于从实现细节变成了语言基础。这让 Rust 的类型推断在涉及发散路径时更加可预测、一致。

## 什么时候能用

| 时间点 | 事件 |
|--------|------|
| 2026-08-24 | PR #155499 合并到 master |
| 2026-09-25 | Rust 1.100 从 master 分支 |
| **2026-11-12** | **Rust 1.100 stable 发布** |

在 nightly 通道上，包含 PR #155499 之后的版本可以直接使用 `!` 类型，无需 feature gate。stable 用户需等到 2026 年 11 月 12 日 Rust 1.100 发布。

## 参考资料

- [PR #155499: stabilize never type](https://github.com/rust-lang/rust/pull/155499)
- [RFC 1216: bang type (!)](https://rust-lang.github.io/rfcs/1216-bang-type.html)
- [Tracking issue #35121: promoting ! to a type](https://github.com/rust-lang/rust/issues/35121)
- [Tracking issue #148922: never type fallback change](https://github.com/rust-lang/rust/issues/148922)
- [Edition 2024: Make ! fall back to ! (#123508)](https://github.com/rust-lang/rust/issues/123508)
- [BrainDetox: What Took Rust's never Type So Long](https://braindetox.kr/en/posts/rust_never_type_stabilization.html)
- [Rust 1.100 发布时间表](https://forge.rust-lang.org/)
