---
title: "Rust 1.98.0 发布解读：生命周期缩短、新 lint 与平台晋级"
date: 2026-08-25 09:30:00
author: PFinal南丞
description: "Rust 1.98.0 于 2026 年 8 月 20 日正式发布。本文聚焦本版最易被忽略但影响面极广的改动：不变位置下的 &mut 生命周期缩短、deny-by-default 的 invalid_runtime_symbol_definitions lint、c_void_returns lint、thumbv7/thumbv8 系列晋级 Tier 2，以及一批需要重点关注的兼容性变更与升级建议。"
keywords:
  - rust
  - Rust 1.98
  - 生命周期
  - unsize coercion
  - lint
  - 嵌入式
  - 标准库
  - 兼容性
  - 升级指南
tags:
  - rust
  - Rust 1.98
  - 语言特性
  - 标准库
  - 兼容性
recommend: 后端工程
---

## 引言：一次"静水流深"的发布

2026 年 8 月 20 日，Rust 团队发布了 **Rust 1.98.0**。和 Go 1.27 那种"补缺口 + 冲性能"的节奏不同，Rust 1.98 的 headline 改动更偏底层：它没有引入撼动日常写法的全新语法，而是在**类型系统边界、链接期符号、嵌入式平台支持**三处做了扎实的推进。

本站此前已经写过两篇 1.98 的深度拆解：

- [Rust 1.98 代数浮点运算符解读](/dev/backend/rust/rust-1-98-algebraic-float-operators-2026)：`f32`/`f64` 的 `algebraic_add/sub/mul/div/rem`
- [Rust 1.98 新标准库 API 解读](/dev/backend/rust/rust-1-98-new-stdlib-apis-2026)：`format_into`、`NumBuffer`、`substr_range` 等

本文则把镜头对准**上述两篇之外**、但同样会在你升级或写 `no_std`/嵌入式代码时撞上的改动，并给出一份可落地的升级清单。

---

## 一、不变位置下的 `&mut` 生命周期缩短

### 1.1 过去为什么不行

Rust 的类型系统对 `&mut T` 是**不变（invariant）**的：你不能把 `&'long mut T` 在"需要保持 `&'short mut T`"的位置上随意缩短生命周期。这保证了别名可变性（aliasable mutability）不变量不被破坏。

但在 **unsize coercion**（把具体类型强制转为 `dyn Trait` 或 `[T]`）场景下，这个限制过于严格。考虑下面的签名：

```rust
use std::cell::Cell;

// 'long 必须比 'short 长
fn shorten<'long: 'short, 'short>(
    input: Cell<&'long mut i32>,
) -> Cell<&'short mut dyn Send> {
    input // ✅ 1.98 起允许
}
```

在 Rust 1.98 之前，即便 `'long: 'short`，编译器也会拒绝这段——因为 `Cell<T>` 对内部 `T` 是不变的，`&'long mut i32` 到 `&'short mut dyn Send` 的缩短发生在"不变位置"上。1.98 放宽了规则：

> Allow shortening lifetime of `&mut` when unsize-coercing, even in an invariant position.

也就是说，**只要同时发生了 unsize coercion（裸指针/引用 → trait object 或切片），且源生命周期确实比目标长，缩短就合法**。

### 1.2 这解决了什么

这类代码在编写**跨层抽象**时非常常见，比如把持有长生命周期 `&mut` 的容器，传给一个只要求短生命周期 `dyn Trait` 的接口：

```rust
use std::cell::Cell;

trait Processor {
    fn process(&self);
}

impl Processor for i32 {
    fn process(&self) {
        println!("value = {self}");
    }
}

fn hand_off<'a>(c: Cell<&'a mut dyn Processor>) {
    // 调用方只需要在 'a 内使用
    c.get().process();
}

fn demo<'long: 'short, 'short>(buf: Cell<&'long mut i32>) {
    // 把长生命周期的具体类型，缩短并 unsize 成短生命周期 trait object
    let short: Cell<&'short mut dyn Processor> = buf;
    hand_off(short);
}
```

此前这种"缩短 + unsize"组合必须在调用方自己拆包装、重建，写起来很绕；1.98 让编译器替你完成。注意：缩短 **`&mut` → `&`** 或 **`&` → `&`** 在过去本就允许，本次扩展的是 "unsize + 缩短" 在不变位置上的合法化，影响面集中在泛型容器（`Cell`、`RefCell`、`MutexGuard` 等）与 FFI/trait 边界。

---

## 二、两个新的链接期 / FFI lint

### 2.1 `invalid_runtime_symbol_definitions`（deny-by-default）

1.98 新增了一条 **deny-by-default** 的 lint，专门盯防你"不小心"定义了与 `core` 运行时同名的全局符号：

- `memcmp`、`memset`、`memcpy`、`memmove`、`strlen` 等 C 运行时符号
- 在 `no_std`、裸机（bare-metal）或自定义链接脚本的场景里，开发者常会提供这些符号的实现

问题在于：一旦你定义的符号与编译器预期由 `core` 提供的运行时符号**重名且语义不符**，链接器可能选错实现，导致难以排查的静默错误。1.98 直接把它设为 deny：

```rust
// ❌ 1.98 起触发 invalid_runtime_symbol_definitions (deny)
#[no_mangle]
pub unsafe extern "C" fn memset(dest: *mut u8, ch: i32, n: usize) -> *mut u8 {
    let mut p = dest;
    for _ in 0..n {
        *p = ch as u8;
        p = p.add(1);
    }
    dest
}
```

配套还有一条 **warn-by-default** 的 `suspicious_runtime_symbol_definitions`，覆盖"可疑但暂不致命"的重名情形。官方说明该 lint 当前只覆盖少量 `core` 运行时符号，并计划在后续几个版本里逐步扩展覆盖范围。

> 实战建议：如果你在 `no_std` 固件里**确实需要**自定义这些符号（比如替换编译器内建实现），先确认它和 `core` 期望的 ABI/语义完全一致；若确认无误但仍被拦截，可在该模块用 `#[allow(invalid_runtime_symbol_definitions)]` 局部放行，并加注释说明原因。

### 2.2 `c_void_returns`（warn-by-default）

另一条新 lint 检查把 `core::ffi::c_void` 当作**返回值类型**的用法：

```rust
use std::ffi::c_void;

// ⚠️ 1.98 起触发 warn-by-default 的 c_void_returns
pub unsafe extern "C" fn create() -> *mut c_void {
    std::ptr::null_mut()
}
```

`c_void` 作为返回类型通常意味着接口设计含糊——调用方拿到一个"什么都不是"的指针，还丢失了大小信息。更地道的写法是用具体的 `*mut T`、或者返回封装好的句柄类型（newtype）。这条 lint 是 warn 而非 deny，属于"代码气味"提醒，不阻断编译。

---

## 三、平台支持：thumbv7/thumbv8 系列晋级 Tier 2

嵌入式是 Rust 的重点投入方向，1.98 在平台矩阵上有实打实的进展：

| 目标三元组 | 变更 |
|---|---|
| `thumbv7a-none-eabi` | 晋级 **Tier 2** |
| `thumbv7a-none-eabihf` | 晋级 **Tier 2** |
| `thumbv7r-none-eabi` | 晋级 **Tier 2** |
| `thumbv7r-none-eabihf` | 晋级 **Tier 2** |
| `thumbv8r-none-eabihf` | 晋级 **Tier 2** |
| `powerpc64-unknown-linux-gnuelfv2` | 新增 **Tier 3** |
| `aarch64-unknown-linux-pauthtest` | 新增 **Tier 3** |

**Tier 2 意味着什么？** 与 Tier 3（仅保证能编译、无官方 CI 验证）不同，Tier 2 目标由 CI 持续构建与测试保证，发布时随工具链一同提供预编译的 `std`（部分需 `-Z build-std` 的情况视具体目标而定）。对 Cortex-M / Cortex-R 开发者来说，`thumbv7*` 和 `thumbv8r` 晋级 Tier 2 后，交叉编译体验会明显更顺。

```bash
# 安装一个刚晋级 Tier 2 的嵌入式目标
rustup target add thumbv7em-none-eabihf
# 之后即可直接交叉编译
cargo build --target thumbv7em-none-eabihf --release
```

新增的两个 Tier 3 目标则带有明确探索色彩：`pauthtest` 用于测试 ARM 指针认证（PAC）特性，`gnuelfv2` 则是 PowerPC64 ELFv2 调用约定的补完。

---

## 四、库与稳定化 API 速览（本版其他亮点）

除代数浮点与 `format_into` 已在另两篇详解外，1.98 还稳定化/调整了以下值得关注的项：

### 4.1 `derive` 宏迁移到 `{core,std}::derive`

1.96 时 `derive` 宏被意外稳定化，1.98 正式**明确接受**它作为稳定 API，路径为 `{core,std}::derive`：

```rust
use core::derive;

#[derive(Clone, Copy, Debug)]
struct Point {
    x: i32,
    y: i32,
}
```

⚠️ **重要 MSRV 提醒**：`{core,std}::derive` 的最低支持版本是 **1.96 而非 1.98**。如果你锁定 MSRV 到 1.98，使用它不会有问题；但若你的 crate 声称支持更低的 MSRV，需要注意这个实际下限。

### 4.2 `ManuallyDrop` 与 `Box` 的交互被写入稳定保证

这是一次"把已有修复固化为契约"的改动。在 1.96 之前，下面这段代码是**未定义行为（UB）**：

```rust
let mut x = std::mem::ManuallyDrop::new(Box::new(1));
unsafe { std::mem::ManuallyDrop::drop(&mut x) };
let x = x; // 旧版：UB！移动一个已被释放的 Box
```

1.96 修复后这段代码不再是 UB，而 1.98 进一步在文档中明确：**未来版本将稳定保证它持续不是 UB**（关联 RFC 3336 `maybe-dangling`）。对写 unsafe 抽象（自引用结构、手写 arena）的同学，这是一颗定心丸。

### 4.3 字符串 / 切片 / 原子类的实用补全

```rust
// 去掉首尾定界符，避免手写切片
let s = "[important]";
assert_eq!(s.strip_circumfix("[", "]"), Some("important"));

// 从 UTF-16 LE/BE 字节直接构造 String（无需先转 Vec<u16>）
let le = [0x48u8, 0x00, 0x69, 0x00]; // "Hi"
assert_eq!(String::from_utf16le(&le).unwrap(), "Hi");

// 把可变切片整体视为原子数组，无锁并行改写
let mut data = [1u8, 2, 3, 4];
let atoms = std::sync::atomic::Atomic::<u8>::from_mut_slice(&mut data);
atoms[0].store(9, std::sync::atomic::Ordering::Relaxed);

// 在字符串/切片上拿到子区间的 Range，摆脱 &str 的生命周期纠缠
let s = String::from("the quick brown fox");
let word = &s[4..9];            // "quick"
let r = s.substr_range(word);   // 返回 4..9，之后可丢弃 word 的借用
assert_eq!(&s[r], "quick");
```

此外还有：`NonZero::from_str_radix`、`Send/Sync for std::process::CommandArgs`、`std::range::legacy`，以及 LoongArch CRC 内建指令的稳定化。

---

## 五、兼容性变更：升级前必须核查的清单

1.98 的修改说明（Compatibility Notes）里有一批**可能让你现有代码编译失败或行为变化**的改动。按"踩坑概率"排序：

1. **`repr(transparent)` 更严格**：`repr(C)` 类型、含私有字段的类型、`#[non_exhaustive]` 类型，不再被视为"平凡（trivial）"布局，因此不能再被 `repr(transparent)` 忽略。依赖透明包装布局假设的代码需复核。
2. **`derive(PartialOrd)` 在 `derive(Ord)` 时走快速路径**（PR #155598）：当某类型的 `PartialOrd` 与 `Ord` 实现彼此不一致时，这一优化会让结果偏离你"手写的"旧行为。如果你曾故意让两者不一致，需修正。
3. **`ambiguous_glob_imports` 部分情形升级为硬错误**（PR #149195）：此前仅警告的歧义 glob 导入，在特定情况下现在直接拒绝编译。
4. **`Type == Type` / `Type = Type` 形式的 where 约束不再被语法允许**（PR #153513）。
5. **Emscripten 目标无条件启用 WASM 异常处理 ABI**（PR #156928）：`-Zemscripten-wasm-eh=false` 开关已被移除，JS 异常回退路径消失。
6. **Windows-gnu 目标规定了基线工具链版本**（PR #158020）：CI 里用旧 binutils 的构建可能需升级工具链。
7. **完全省略的生命周期边界，在 trait object 类型上可能解析不同甚至被拒**（PR #129543）：极窄场景，但若你大量使用省生命周期的 trait object，建议跑一遍测试。
8. **`UNSAFE_CODE` lint 现在对全部 unsafe 属性一致触发**（PR #157201）。
9. **`Solaris` 移除 `File::lock`**（PR #157509）：返回 "unsupported" 而非旧语义。
10. **rustfmt 现在能发现 `cfg_select!` 中定义的模块文件**（PR #158372）：可能让以前被忽略的代码被纳入格式化。

这些大多集中在 unsafe、嵌入式、跨平台与历史兼容边角，**纯业务代码基本无感**。但若是维护底层库 / 系统编程 crate 的作者，建议把上面 1–4 条作为升级前的重点回归项。

---

## 六、升级实操建议

### 6.1 本地升级

```bash
# 更新到 stable 工具链
rustup update stable

# 确认版本
rustc --version   # rustc 1.98.0 (...)

# 重新解析依赖并构建
cargo update -p <你的关键依赖>  # 视需要
cargo build
cargo test
```

### 6.2 CI 与发布策略

- **不要 blindly 升**：在 CI 矩阵里先用 1.98 跑一轮 `cargo test`，确认没有命中第五节里的兼容性变更。
- **关注 lint 噪声**：新引入的 `invalid_runtime_symbol_definitions` 是 deny，若你的 `no_std`/裸机 crate 确实重名自定义了运行时符号，升级会直接红。提前用 `#[allow(...)]` 收敛。
- **MSRV 声明**：若你的 crate 声明支持低于 1.98 的 MSRV，注意 `core::derive` 的实际下限是 1.96；在 `Cargo.toml` 的 `rust-version` 上保持一致，避免下游误用。
- **嵌入式目标**：`thumbv7*`/`thumbv8r` 已 Tier 2，可放心加入 `rustup target add` 与交叉编译流水线。

---

## 小结

Rust 1.98.0 没有喧哗的新语法，却在三件"底层但关键"的事上推进了体验：

1. **类型系统**：不变位置下的 `&mut` 生命周期缩短 + unsize，让跨层泛型抽象更顺；
2. **链接与 FFI 安全**：`invalid_runtime_symbol_definitions`（deny）+ `c_void_returns`（warn）提前拦住静默错误；
3. **嵌入式平台**：`thumbv7*`/`thumbv8r` 晋级 Tier 2，Cortex-M/R 开发者的工具链保障更稳。

配合代数浮点、缓冲整数格式化等新 API，1.98 是一次"把地基夯实"的版本。升级成本低、收益实，建议尽快在 CI 上验证一轮。更深入的浮点与标准库 API 拆解，可回顾本站的[代数浮点运算符解读](/dev/backend/rust/rust-1-98-algebraic-float-operators-2026)与[新标准库 API 解读](/dev/backend/rust/rust-1-98-new-stdlib-apis-2026)。

---

## 参考来源

- [Announcing Rust 1.98.0 — Rust Blog](https://blog.rust-lang.org/2026/08/20/Rust-1.98.0/)
- [Rust 1.98.0 Release Notes — GitHub](https://github.com/rust-lang/rust/releases/tag/1.98.0)
- [Rust 1.98.0 详细发布说明（releases.html）](https://doc.rust-lang.org/stable/releases.html#version-1980-2026-08-20)
- [RFC 3336: maybe-dangling](https://rust-lang.github.io/rfcs/3336-maybe-dangling.html)
- [Rust 平台支持层级说明](https://doc.rust-lang.org/rustc/platform-support.html)
- [Rust 1.98 代数浮点运算符解读（本站）](/dev/backend/rust/rust-1-98-algebraic-float-operators-2026)
- [Rust 1.98 新标准库 API 解读（本站）](/dev/backend/rust/rust-1-98-new-stdlib-apis-2026)
