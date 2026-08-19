---
title: Rust 1.98 新标准库 API 深度解析：Atomic::from_mut、strip_circumfix 与无分配格式化
date: 2026-08-19 00:00:00
tags:
  - rust
  - standard-library
  - atomic
  - concurrency
  - string
keywords:
  - Rust 1.98
  - Atomic::from_mut
  - strip_circumfix
  - format_into
  - NumBuffer
  - from_utf16le
  - NonZero
  - 无分配格式化
category: 编程语言
description: '深度解析 Rust 1.98.0 新稳定标准库 API：Atomic::from_mut 家族消除无锁并发的 unsafe 样板、strip_circumfix 对称去包裹、format_into + NumBuffer 无分配整数格式化，附源码级签名核验与完整代码示例。'
---

# Rust 1.98 新标准库 API 深度解析：Atomic::from_mut、strip_circumfix 与无分配格式化

## 导语

2026 年 8 月 20 日，Rust 团队发布 **1.98.0** 稳定版。上一篇文章我们聚焦了本版本最"显眼"的浮点变更——`algebraic_add` 等代数浮点运算符；而这次，我们把目光转向标准库里**另一批悄悄落地的实用 API**：它们没有 SIMD 加速那么轰动，却在日常并发、字符串处理和性能敏感代码中反复出现：

- **`Atomic::from_mut` / `from_mut_slice` / `get_mut_slice`**：把普通可变引用无损转换为原子引用，无锁并发的经典写法从此无需 `unsafe`；
- **`str::strip_circumfix` / `[T]::strip_circumfix`**：一次性剥离"成对"的前后缀，告别嵌套的 `strip_prefix` + `strip_suffix`；
- **`{integer}::format_into` + `core::fmt::NumBuffer`**：**零堆分配**的整数格式化，配合栈上缓冲一次写入；
- **`String::from_utf16le` / `from_utf16be`**：字节序感知的 UTF-16 转换，FFI 场景友好；
- **`NonZero::from_str_radix`**：解析即校验非零，配合编译期优化。
- **`derive(PartialOrd)` 快速路径**：修复了自 **2018 年** 就存在的 issue #49505，派生的比较代码更小更快。

此外，本文将纠正一个在多个媒体间流传的**误报**：`c_variadic`（C 变参函数定义）**并不在 1.98 中**——它的稳定化 PR 挂的是 1.99.0 里程碑。下文所有 API 签名均核验自 rust-lang/rust 主分支源码。

---

## 一、Atomic::from_mut 家族：无锁并发的零 unsafe 入口

### 1.1 从"经典痛点"说起

在 Rust 中，无锁并发最常见的模式是：多个线程通过 `AtomicUsize` / `AtomicBool` 共享一个计数器或标志位。但很多场景下，数据本身**先以普通类型存在**（比如一个 `bool` 或一个 `Vec<usize>`），只有到了需要并发访问的临界点，才想把它"当成原子用"。

1.98 之前，这需要 `unsafe`：

```rust
use std::sync::atomic::{AtomicBool, Ordering};

let mut some_bool = true;
// 旧写法：unsafe 指针转换
let ptr = &mut some_bool as *mut bool as *mut AtomicBool;
let a = unsafe { &mut *ptr };
a.store(false, Ordering::Relaxed);
assert_eq!(some_bool, false);
```

这段代码依赖两条"恰好成立"的事实：`bool` 与 `AtomicBool` 内存布局相同、对齐相同。编译器无从验证，一旦某个平台不满足，就是未定义行为。

### 1.2 新 API：编译期保证的安全转换

1.98 稳定了三个新方法（源码见 `library/core/src/sync/atomic.rs`，均标注 `#[stable(feature = "atomic_from_mut", since = "1.98.0")]`）：

```rust
// 单个值：&mut T -> &mut Atomic<T>
pub const fn from_mut(v: &mut bool) -> &mut Self;

// 切片反向：&mut [AtomicBool] -> &mut [bool]（拿回非原子视图）
pub const fn get_mut_slice(this: &mut [Self]) -> &mut [bool];

// 切片正向：&mut [bool] -> &mut [AtomicBool]（整个数组获得原子能力）
pub const fn from_mut_slice(v: &mut [bool]) -> &mut [Self];
```

关键点：`from_mut` 只对**布局与对齐完全兼容**的类型提供——比如 `AtomicBool` 只接收 `&mut bool`，`AtomicUsize` 只接收 `&mut usize`（`#[cfg(target_has_atomic_primitive_alignment = "8")]` 等条件确保平台支持）。类型系统层面就杜绝了不兼容转换。

官方示例——把整个数组提升为原子数组，交给线程并发写：

```rust
use std::sync::atomic::{AtomicBool, Ordering};

let mut some_bools = [false; 10];
let a = &*AtomicBool::from_mut_slice(&mut some_bools);
std::thread::scope(|s| {
    for i in 0..a.len() {
        s.spawn(move || a[i].store(true, Ordering::Relaxed));
    }
});
assert_eq!(some_bools, [true; 10]);
```

而 `get_mut_slice` 是逆操作：当所有线程都退出后，拿回 `&mut [bool]` 做非原子批量操作（比如 `copy_from_slice`），彻底摆脱逐个 `load` 的开销：

```rust
let mut some_bools = [const { AtomicBool::new(false) }; 10];
let view: &mut [bool] = AtomicBool::get_mut_slice(&mut some_bools);
view[..5].copy_from_slice(&[true; 5]); // 批量写入，无原子开销
```

### 1.3 为什么安全？

原理写在源码注释里：**可变引用保证了唯一所有权**（exclusive ownership）。持有 `&mut [bool]` 时，不存在其他线程的并发访问——所以把它"重新解释"为 `&mut [AtomicBool]` 不破坏内存安全；而原子类型布局兼容性由类型签名保证。这是典型的"用借用检查器换掉 `unsafe`"——**每个 `from_mut` 都是一段被语言机制取代的 `unsafe` 块**。

---

## 二、strip_circumfix：成对去包裹，一步到位

### 2.1 经典困境：strip_prefix + strip_suffix 的组合

处理带成对定界符的文本/数据（括号、引号、数组字面量、Markdown 代码围栏……）是再常见不过的需求。1.98 之前你得写：

```rust
let s = "[1, 2, 3]";
let inner = s.strip_prefix('[').and_then(|s| s.strip_suffix(']'));
assert_eq!(inner, Some("1, 2, 3"));

// 但"只剥掉一半"也是合法的：
let dangling = s.strip_prefix('['); // Some("1, 2, 3]") —— 并没有真正"去包裹"
```

问题在于：`strip_prefix` 与 `strip_suffix` 是两步独立操作，组合时语义松散，且可读性一般。

### 2.2 新 API：同时要求前后缀匹配

1.98 为 `str` 和 `[T]` 同时稳定了 `strip_circumfix`（circumfix = 环缀，指包裹在词干两侧的词缀）：

```rust
// str 版本（library/core/src/str/mod.rs，since 1.98.0）
pub fn strip_circumfix<P: Pattern, S: Pattern>(
    &self, prefix: P, suffix: S,
) -> Option<&str>
where
    for<'a> S::Searcher<'a>: ReverseSearcher<'a>;

// 切片版本（library/core/src/slice/mod.rs，since 1.98.0）
pub fn strip_circumfix<S, P>(&self, prefix: &P, suffix: &S) -> Option<&[T]>
where
    T: PartialEq,
    S: SlicePattern<Item = T> + ?Sized,
    P: SlicePattern<Item = T> + ?Sized;
```

语义：**前缀必须在开头匹配、后缀必须在结尾匹配，二者同时成立才返回中间部分**；任何一侧不匹配都返回 `None`。它的实现本身就是组合：

```rust
// str 版本的实际实现（1 行）
self.strip_prefix(prefix)?.strip_suffix(suffix)
```

来看完整示例：

```rust
// 字符串
let s = "foo:bar:baz";
assert_eq!(s.strip_circumfix("foo", "baz"), Some(":bar:"));
// 前后缀重叠到"吃掉"整个字符串也是合法的
assert_eq!("[42]".strip_circumfix("[", "]"), Some("42"));

// 只有一侧匹配 -> None
assert_eq!("foo:bar:baz".strip_circumfix("foo:bar:", ":bar:baz"), None);
assert_eq!("[42]".strip_circumfix("[", ")"), None);

// 切片
let v = [10, 50, 40, 30];
assert_eq!(v.strip_circumfix(&[10], &[30]), Some(&[50, 40][..]));
// 空后缀是合法的（等价于仅 strip_prefix）
assert_eq!(v.strip_circumfix(&[10, 50], &[]), Some(&[40, 30][..]));
assert_eq!(v.strip_circumfix(&[10, 50, 40], &[50, 40, 30]), None);
```

注意 `str` 版本对 suffix 要求 `ReverseSearcher`（反向搜索能力），`char`/`&str`/字符串字面量等常用 `Pattern` 都满足。切片的 prefix/suffix 支持 `&[T]`、`&[T; N]` 数组以及 `&str` 字节切片等 `SlicePattern` 实现者——比如可以很方便地剥掉一个字节数组的两端标记。

---

## 三、format_into + NumBuffer：零堆分配的整数格式化

### 3.1 问题：to_string() 的隐藏分配

对大多数程序，`42.to_string()` 无足轻重。但在**每秒调用数百万次**的日志、序列化、指标上报路径上，每次 `to_string()` 都是一次堆分配——`format!` 宏甚至会分配两次。对性能敏感且禁用堆分配的 `no_std` 嵌入式环境，格式化数字更是一直没有标准库官方出路。

### 3.2 新 API：栈上缓冲 + 就地写入

1.98 稳定了 `core::fmt::NumBuffer<T>` 与所有整数类型上的 `format_into`（`int_format_into` feature，since 1.98.0）：

```rust
// library/core/src/fmt/num.rs
pub fn format_into(self, buf: &mut NumBuffer<Self>) -> &str;

// library/core/src/fmt/num_buffer.rs
pub struct NumBuffer<T: NumBufferTrait> { /* 内部是栈上的定长数组 */ }
impl<T: NumBufferTrait> NumBuffer<T> {
    pub fn new() -> Self;
}
```

`NumBuffer` 内部是**定长栈缓冲**（大小由类型决定，足以容纳该类型任意值 + 符号位），`format_into` 把数字格式化后写入缓冲并返回切片：

```rust
use core::fmt::NumBuffer;

// 有符号
let mut buf = NumBuffer::new();
let s = (-1972i32).format_into(&mut buf);
assert_eq!(s, "-1972");

// 无符号最大值
let mut buf = NumBuffer::new();
let s = u64::MAX.format_into(&mut buf);
assert_eq!(s, u64::MAX.to_string()); // "18446744073709551615"

// 16 进制/指针场景也适用：fmt::Write 风格可复用同一缓冲
```

**零堆分配**：整个过程没有一次 `malloc`。返回值 `&str` 借用 `NumBuffer`，因此 `NumBuffer` 必须存活到字符串消费完——这是与 `to_string()` 最显著的生命周期差异。对嵌入式与热路径代码，这是标准库首次提供官方的栈上整数格式化入口。

### 3.3 何时用它？

| 场景 | 建议 |
| --- | --- |
| no_std / 禁止堆分配 | ✅ `format_into` 是官方答案 |
| 热路径日志、指标采集 | ✅ 免分配，可复用同一 `NumBuffer` |
| 普通业务代码 | 保持 `to_string()`，可读性优先 |

---

## 四、String::from_utf16le / from_utf16be：字节序感知的 UTF-16

### 4.1 背景

Windows API、Java 序列化、许多二进制协议都以 **UTF-16** 编码字符串，且字节序因平台/协议而异（`LE` = 小端，`BE` = 大端）。1.98 之前，标准库只有 `String::from_utf16(&[u16])`——它假定调用者已经按本机字节序拿到了 `u16` 序列，而 FFI 场景拿到的往往是**原始字节**（`&[u8]`），需要手动 `u16::from_le_bytes` 逐个转换，笨拙且易错。

### 4.2 新 API：直接吃字节

1.98 稳定了四个方法（`str_from_utf16_endian` feature，since 1.98.0）：

```rust
pub fn from_utf16le(v: &[u8]) -> Result<String, FromUtf16Error>;
pub fn from_utf16le_lossy(v: &[u8]) -> String;
pub fn from_utf16be(v: &[u8]) -> Result<String, FromUtf16Error>;
pub fn from_utf16be_lossy(v: &[u8]) -> String;
```

直接接受 `&[u8]` 字节序列，按指定字节序解析。实现上有两个值得注意的细节（源码见 `library/alloc/src/string.rs`）：

1. **奇数字节立即报错**：UTF-16 每个码元占 2 字节，长度必须是偶数——`from_utf16le` 对奇数长度直接返回 `FromUtf16Error`（`OddBytes`），不会读到悬空字节；
2. **LE 路径零拷贝快路径**：在小端机器上调用 `from_utf16le` 时，会先尝试 `align_to::<u16>()` 对齐转换，对齐成功则直接复用字节内存（零拷贝），仅在对齐失败时才逐个重排。

```rust
// Windows 记事本保存的 UTF-16LE 文本（含 BOM 场景可先剥离）
let bytes: &[u8] = &[0x4F, 0x00, 0x00, 0x00, 0x53, 0x00]; // "OS" (LE)
assert_eq!(String::from_utf16le(bytes).unwrap(), "OS");

// 大端网络字节序
let be: &[u8] = &[0x00, 0x4F, 0x00, 0x00]; // "O" (BE)
assert_eq!(String::from_utf16be(be).unwrap(), "O");

// 奇数长度 -> 报错
let odd: &[u8] = &[0x00, 0xD8, 0x69];
assert!(String::from_utf16le(odd).is_err());

// lossy 版本：无效序列替换为 U+FFFD，不失败
```

配合已有的 `str::encode_utf16`（编码方向），Rust 现在覆盖了 UTF-16 的**完整双向转换**，且字节序问题在 API 层面解决。

---

## 五、NonZero::from_str_radix：解析即保证非零

`NonZero<T>` 自 1.28 起就是性能与类型安全的双赢类型：它让 `Option<NonZero<T>>` 与裸 `T` 同尺寸（空指针优化），并把"非零"约束写进类型。但它的解析一直有个缺口——`FromStr` 只支持十进制，想要 `parse::<NonZero<u8>>()` 之外的能力（如十六进制解析）没有官方入口。

1.98 补上了 `from_str_radix`（since 1.98.0，且为 **const fn**）：

```rust
// library/core/src/num/nonzero.rs
pub const fn from_str_radix(src: &str, radix: u32) -> Result<Self, ParseIntError>;
```

```rust
use std::num::NonZero;

// 十六进制解析，非零在类型层面保证
assert_eq!(NonZero::<u16>::from_str_radix("A", 16), Ok(NonZero::new(10)?));
// 十进制解析失败（0 不合法）
assert!(NonZero::<u32>::from_str_radix("0", 10).is_err());
// 尾随空格报错（与 FromStr 语义一致）
assert!(NonZero::<u32>::from_str_radix("1 ", 10).is_err());
```

几个要点：

- **radix 范围 2~36**，越界会 panic（与 `u32::from_str_radix` 一致）；
- **`"0"` 一定报错**——非零约束在解析层完成，杜绝"解析成功后再检查"的样板；
- **const fn**：可在 `const` 上下文中使用，配合 `NonZero` 的编译期优化能力；
- 内部通过 `from_ascii_bytes_radix_impl` 实现，对 ASCII 字节直接处理。

对解析网络协议、配置文件中的 ID/句柄（常见为十六进制且语义上不能为 0）的场景，这个 API 让"解析即校验"落到了类型系统里。

---

## 六、derive(PartialOrd) 快速路径：2018 年的老 issue 终章

### 6.1 背景

issue [#49505](https://github.com/rust-lang/rust/issues/49505) 打开于 2018 年：`#[derive(PartialOrd)]` 生成的比较逻辑非常啰嗦——大体是 `(a > b) || !(b > a) && true` 这种形式。对于字段多、嵌套深的类型，派生的 `partial_cmp` 生成的代码在每个二进制里都占据可观体积，且 LLVM 很难化简。

### 6.2 修复：Ord 存在时直接委托

1.98 实现了快速路径（PR #155598，Compatibility Notes 中收录）：当类型**同时 derive 了 `Ord` 和 `PartialOrd`**（绝大多数场景）时，`partial_cmp` 直接委托给 `cmp`：

```rust
// 1.98 之前：partial_cmp 生成 (a > b) || !(b > a) && true 式啰嗦比较
// 1.98 之后：partial_cmp 直接调用 cmp，干净、可优化、体积更小
#[derive(PartialOrd, Ord, PartialEq, Eq)]
struct Point { x: i32, y: i32 }
```

**无需任何代码改动**——重新编译即自动获益。

### 6.3 ⚠️ 兼容性警告：不一致的 Ord/PartialOrd 会"改序"

官方 release notes 明确提示一个反向影响：

> "This can break crates in practice where a type's PartialOrd and Ord impls were inconsistent with each other."

如果某个类型的手写 `PartialOrd` 与派生的 `Ord` 语义**不一致**（比如 `PartialOrd` 按字段 A 排、`Ord` 按字段 B 排），此前 `partial_cmp` 用的是自己的逻辑，排序结果是"PartialOrd 说了算"；1.98 之后 `partial_cmp` 委托 `cmp`，**排序顺序会悄悄变化**——不破坏编译，但 `sort` 结果可能不同。建议：检查依赖树中是否存在自定义 `PartialOrd` + 派生 `Ord` 混用的类型，确保二者语义一致。

---

## 七、其他值得关注的变化

### 7.1 平台支持

- **`thumbv7a-none-eabi` / `thumbv7a-none-eabihf` / `thumbv7r-none-eabi` / `thumbv7r-none-eabihf` / `thumbv8r-none-eabihf` 升 Tier 2**：ARM Cortex-A7/A7-R/A8-R 系列裸机目标获得官方保证的构建支持，嵌入式生态利好；
- **`powerpc64-unknown-linux-gnuelfv2` 新增 Tier 3**、`aarch64-unknown-linux-pauthtest` 新增 Tier 3；
- **riscv `d` / `e` / `f` target_features 在 `cfg(target_feature = "?")` 中稳定**——RV64 的 `D`（双精度浮点）/`E`（嵌入式）/`F`（单精度）指令集扩展现在可以条件编译。

### 7.2 标准库与工具链

- **`PanicHookInfo::location()` 生命周期改为 `'static`**：如果自定义 panic hook 存储了 location 引用并跨借用边界使用，需要重新编译检查（`Location<'static>` 意味着可长期持有）；
- **`std::process::CommandArgs` 实现 `Send`/`Sync`**；
- **`core::range::{legacy, RangeFull, RangeTo}` 稳定**：range 类型家族进一步补齐；
- **Windows 线程局部变量的析构改用 FLS**（Fiber Local Storage）；
- **`repr(transparent)` 规则收紧**：`repr(C)` 类型、含私有字段类型、`#[non_exhaustive]` 类型不再被视为 "trivial" 字段——涉及透明包装的场景需重新验证；
- **Emscripten 的 WASM 异常处理 ABI 无条件启用**：`-Zemscripten-wasm-eh=false` 选项被移除；
- **新增 deny-by-default `invalid_runtime_symbol_definitions` lint**（针对 `memcmp`、`memset` 等 core 运行时符号的自定义定义，后续版本会扩展检测范围）。

---

## 八、纠错：c_variadic 不在 1.98，它在 1.99

写这篇文章时，我们发现一个在多个技术媒体间流传的错误信息，值得单独澄清：

> **误报**：多家文章（如 byteiota 等）声称 "Rust 1.98 稳定了 `c_variadic`，允许在 Rust 中定义 C 风格的变参函数"。

**事实**：`c_variadic` 的稳定化 PR 挂的是 **1.99.0 里程碑**，并在 1.98 分支之后才合并。官方 1.98.0 草稿 release notes（rust-lang/rust issue #160700）的 Stabilized APIs 列表中**没有** `c_variadic`。我们核验 rust-lang/rust 主分支源码，`VaList` 的 stable 标注仍是 `since = "CURRENT_RUSTC_VERSION"`——一个未固化的占位符，说明该 feature 尚未在任何正式版本稳定。

**结论**：如果你在等 C 变参函数的稳定化，需要等到 **1.99**（预计 2026 年 10 月左右），1.98 里它仍只是 nightly feature。这也再次印证：技术新闻以官方 release notes 为准，比转载更可靠。

---

## 九、升级建议

```bash
rustup update stable   # 2026-08-20 之后
```

- **立即受益**：`derive(PartialOrd)` 快速路径无需改动自动生效；`strip_circumfix`、`from_utf16le/be`、`NonZero::from_str_radix` 可平滑替换手写代码；
- **审查项**：自定义 panic hook 中存储 `location()` 的代码（生命周期变 `'static`）、`repr(transparent)` 包装了 `repr(C)`/私有字段类型的代码、以及依赖树中 `PartialOrd`/`Ord` 语义不一致的类型；
- **性能改造**：热路径的数字格式化迁移到 `format_into + NumBuffer`；并发数据从 `unsafe` 指针转换迁移到 `Atomic::from_mut` 家族；
- **平台**：嵌入式团队可关注 `thumbv7a/r` 系列的 Tier 2 升级。

---

## 参考来源

- Rust 官方 1.98.0 草稿 release notes：[rust-lang/rust issue #160700](https://github.com/rust-lang/rust/issues/160700)
- `str::strip_circumfix` 源码：[library/core/src/str/mod.rs](https://github.com/rust-lang/rust/blob/main/library/core/src/str/mod.rs)
- `[T]::strip_circumfix` 源码：[library/core/src/slice/mod.rs](https://github.com/rust-lang/rust/blob/main/library/core/src/slice/mod.rs)
- `format_into` / `NumBuffer` 源码：[library/core/src/fmt/num.rs](https://github.com/rust-lang/rust/blob/main/library/core/src/fmt/num.rs)、[library/core/src/fmt/num_buffer.rs](https://github.com/rust-lang/rust/blob/main/library/core/src/fmt/num_buffer.rs)
- `Atomic::from_mut` 家族源码：[library/core/src/sync/atomic.rs](https://github.com/rust-lang/rust/blob/main/library/core/src/sync/atomic.rs)
- `String::from_utf16le/be` 源码：[library/alloc/src/string.rs](https://github.com/rust-lang/rust/blob/main/library/alloc/src/string.rs)
- `NonZero::from_str_radix` 源码：[library/core/src/num/nonzero.rs](https://github.com/rust-lang/rust/blob/main/library/core/src/num/nonzero.rs)
- issue #49505（derive(PartialOrd) 老 bug）：[rust-lang/rust#49505](https://github.com/rust-lang/rust/issues/49505)
- c_variadic 澄清参考：[dev.to: Five developer deadlines in August 2026](https://dev.to/akashdas/five-developer-deadlines-in-august-2026-copilot-credits-rust-198-typescript-7-1pbh)
