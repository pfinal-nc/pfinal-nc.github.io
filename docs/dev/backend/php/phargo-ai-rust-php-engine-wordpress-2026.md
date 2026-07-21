---
title: "Phargo 深度解析：AI 用 Rust 重写 PHP 引擎，跑通 WordPress 的实验与启示"
date: "2026-07-21"
tags:
  - php
  - rust
  - ai
  - runtime
  - wordpress
  - language-engineering
keywords:
  - Phargo
  - Rust PHP engine
  - AI 编程
  - WordPress
  - Ekin Ertaç
  - PHP 运行时
  - Rust PHP 解释器
  - AI 代码生成
  - PHP-src 测试套件
category: php
description: "Phargo 是一位不懂 Rust 的开发者用 AI 代理在 Rust 中从头写出的 PHP 引擎，已能渲染 WordPress 并通过 17% 的 PHP-src 测试。本文拆解其工程方法、架构选择、局限与启示。"
---

# Phargo 深度解析：AI 用 Rust 重写 PHP 引擎，跑通 WordPress 的实验与启示

## 导语

2026 年 7 月，一个名叫 **Ekin Ertaç** 的 PHP 开发者发布了一个令人意外的项目：**Phargo**——一个用 Rust 从头写成的 PHP 运行时引擎。更意外的是，他公开承认自己完全不懂 Rust，也不会写词法分析器，整件事几乎由 AI 编码代理完成。截至目前，Phargo 已能渲染一个完整的 WordPress 首页，并在 PHP 官方测试套件（php-src）中通过了 3,844 / 22,037 个测试，约 17.4%。

这个数字看起来不高，但放在“AI 生成一个编译型语言运行时”的语境下，它提出了一个尖锐的问题：当 AI 能替人写出跨语言基础设施时，开发者的角色到底应该是什么？

本文将从技术路径、工程方法、局限、行业对比和未来可能性五个角度，全面拆解 Phargo。

## 一、背景：为什么做这件事？

Ertaç 的动机不是“用 Rust 重写 PHP 以取代 Zend Engine”。他在博客中反复强调的是：

> **测试一种工作流——一个人如何在不懂实现语言的情况下，用外部客观标准驱动 AI，完成一个复杂系统。**

这正是 2026 年 AI 编程领域最热的议题：当模型可以生成代码、修复编译错误、甚至迭代架构时，人类的角色从“写代码”变成“定目标、选指标、判结果”。Phargo 是这个思路的极端案例：

- 目标：跑通 PHP 官方测试套件（不可篡改的第三方裁判）
- 约束：Rust 语言、内存安全、WordPress 可运行
- 验证：公开 scoreboard，每次运行把通过率写入 `PROGRESS.md`

## 二、技术路径：AI 不是代码作者，而是实现者

### 2.1 核心工作流

```text
人类设定目标：通过 PHP-src 测试 N 个，渲染 WordPress 首页
        │
        ▼
AI 生成 Rust 代码（lexer / parser / evaluator / runtime）
        │
        ▼
运行官方 .phpt 测试套件
        │
        ▼
测试失败 → 人类选择下一个失败簇 → AI 修复 → 再次运行
        │
        ▼
通过数量上升，写入 PROGRESS.md 公开 scoreboard
```

这个循环的关键在于：**测试不是 AI 自己写的，而是 PHP 社区数十年积累的上游测试套件**。AI 不能通过“自评”作弊，失败就是失败。

### 2.2 架构选择（文字架构图）

Phargo 目前是一个解释型运行时，尚未引入 JIT 或字节码 VM。它的宏观结构大致如下：

```text
Phargo 运行时架构
│
├── Lexer（Rust 实现）
│   └── 将 PHP 源码 token 化
│
├── Parser（Rust 实现）
│   └── 生成 AST
│
├── Tree-walking Evaluator（Rust 实现）
│   └── 直接解释执行 AST
│
├── Built-in Functions（逐步补齐）
│   └── string、array、file、database 相关函数
│
├── Extension Bridge（长期目标）
│   └── 调用 C/Rust/Go 扩展或 WASM 模块
│
└── Runtime Harness
    └── 加载 .phpt 测试、运行、对比输出、生成 PROGRESS.md
```

作者表示正在开发字节码虚拟机，以解决当前解释执行过慢的问题。

### 2.3 一个有趣的工程教训：测量系统先于代码

Ertaç 提到，早期 Phargo 的测试 harness 比较输出时是字节级对比。结果大量测试因为 Windows CRLF 行尾问题而失败，而不是因为 PHP 行为不正确。一次行尾规范化修复就让几百个测试变绿。

这说明：在 AI 辅助工程中，**测量系统是否可靠，比代码是否正确更重要**。一个错误的测量系统会让 AI 在错误方向上无限优化。

## 三、当前成果：17% 意味着什么？

截至 2026 年 7 月初，Phargo 的状态：

| 指标 | 数值 |
|------|------|
| 通过 PHP-src 测试 | 3,844 / 22,037（约 17.4%）|
| 可运行 WordPress 前台 | 是 |
| 可运行 WordPress /wp-admin | 是（基础渲染）|
| 代码量 | 约 24,000 行 Rust |
| 手动 Rust 代码 | 接近 0 |
| 性能 | 远低于标准 PHP（解释执行，无 JIT）|

### 3.1 17% 是低还是高？

如果把它当成“PHP 兼容度”，17% 显然很低。但如果把它当成“一个完全由 AI 生成、作者不懂实现语言的运行时，能在真实世界应用上跑起来”，这个数字已经相当惊人。要知道，HHVM 早期也花了大量人工调优才达到高通过率；PHP 官方测试套件覆盖了语言中大量边缘行为，包括类型强制转换、引用语义、异常处理、扩展 API 等。

剩余 83% 主要涉及：

- 未实现的 C 扩展（GD、XML、数据库驱动等）
- 字符串函数不完整
- 内存管理与引用语义差异
- 某些边缘的类型强制转换

## 四、Phargo 与其他 PHP 运行时的对比

```
┌─────────────┬──────────────┬────────────┬──────────────┬──────────────┐
│ 运行时       │ 实现语言      │ 执行模型      │ 目标场景       │ 当前状态      │
├─────────────┼──────────────┼────────────┼──────────────┼──────────────┤
│ Zend Engine │ C            │ 解释 + JIT   │ 通用 Web      │ 生产标准      │
│ HHVM        │ C++/Rust     │ JIT          │ 大型服务      │ 逐步淡出      │
│ FrankenPHP  │ Go/C         │ Worker 模式 │ 现代 PHP 部署 │ 生产可用      │
│ WordPress   │ C→WASM       │ 解释（WASM） │ 浏览器内运行  │ Playground   │
│ Playground  │              │              │              │              │
│ Phargo      │ Rust（AI 写）│ 解释（AST）   │ 实验/浏览器   │ 早期实验      │
└─────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

Phargo 的长期目标与 WordPress Playground 有重叠：将 PHP 引擎编译到 WASM，在浏览器中运行 WordPress。Playground 目前把 C 实现的 PHP 解释器通过 Emscripten 编译成 WASM，所有版本二进制一度达到 888 MB。Phargo 的 Rust 实现理论上可以产出更小、更安全的 WASM 二进制。

## 五、复现：如何跑 Phargo

虽然项目仍处于早期，但你可以克隆仓库并查看测试 scoreboard。

```bash
# 克隆仓库
git clone https://github.com/ekinertac/Phargo.git
cd Phargo

# 安装 Rust 工具链（如未安装）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 构建
cargo build --release

# 运行上游测试套件（需要本地 PHP 源码作为测试输入）
# 具体命令参考仓库 README，目前入口可能变化
cargo test --release -- --test-threads=1

# 查看 scoreboard
cat PROGRESS.md
```

> 注意：项目处于快速迭代期，构建命令和测试入口可能随时变化。建议直接阅读仓库最新 README。

## 六、开发者启示：AI 时代，人类的价值是什么？

Phargo 最大价值不是“Rust 写的 PHP 引擎”，而是它展示了一种新的开发模式：

1. **目标定义比代码更重要**：人类设定可验证的目标（WordPress 渲染、测试通过率），AI 负责实现路径。
2. **不可篡改的测试是裁判**：不能让 AI 给自己的输出打分。
3. **渐进式验证**：每个失败簇都是下一轮优化的输入。
4. **公开透明的 scoreboard**：把失败也公开，避免虚假进展。

这种模式对以下场景特别有用：

- 迁移到一门不熟悉的语言（如不会 Rust 却要 Rust 化）
- 复刻已有系统的兼容层（如实现一个协议、运行时）
- 构建有大量测试集的语言/工具（如 SQL 引擎、正则引擎、编译器）

但风险也明显：

- **可维护性**：AI 生成的 24,000 行代码，作者无法审计，后续维护人员需要极大的勇气。
- **安全性**：没有人类理解实现的内存模型，潜在漏洞难以发现。
- **法律/许可证**：AI 生成代码的版权与许可证边界仍有争议。

## 七、未来展望：Rust PHP 会取代 Zend 吗？

短期内不会。Phargo 离生产级别还有很长的距离：性能、扩展生态、兼容性都是巨大鸿沟。但它的意义在于探索第三条路：

- **第一条路**：继续优化 C 实现的 Zend Engine（PHP 8.x 路线）
- **第二条路**：用外部运行时解决部署问题（FrankenPHP、WordPress Playground）
- **第三条路**：用安全语言和 AI 辅助，重新实现一个现代化 PHP 运行时（Phargo、TypePHP 等）

如果 Phargo 能把 Rust→WASM 路径跑通，并在浏览器中稳定运行 WordPress，那它可能会成为 WordPress Playground 的一个有趣替代方案。更重要的是，它证明了：未来越来越多的基础设施，可能由“人类定目标 + AI 出实现 + 测试套件裁判”的方式生产出来。

## 参考资料

- [Phargo GitHub 仓库](https://github.com/ekinertac/Phargo)
- [I Don’t Know Rust. My AI Is Rewriting PHP in It.](https://ekinertac.com/blog/i-dont-know-rust-my-ai-is-rewriting-php-in-it/)
- [RuntimeWire: Ekin Ertac's AI-built PHP engine now renders WordPress](https://runtimewire.com/article/ekin-ertac-phargo-ai-php-rust-wordpress)
- [ClawdBytes: Developer with Zero Rust Experience Ships Working PHP Engine Using Only AI Agents](https://clawdbytes.com/article/2026-07-04-my-ai-built-php-engine-in-rust-passes-17-of-php-src-tests-renders-wordpress)
- [WordPress Playground: PHP WebAssembly binaries](https://developer.wordpress.org/playground/)
