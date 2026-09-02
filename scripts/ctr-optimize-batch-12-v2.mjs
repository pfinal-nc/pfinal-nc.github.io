#!/usr/bin/env node
/**
 * P2-2 CTR 优化第 12 批 — 批量更新 10 篇 Rust/DevOps 系列文章的 description
 * 策略：保留原有 title（信息密度已高），仅强化 description 加上 2026 关键字 + 量化收益 + 完全指南定位
 * 重点：Rust 1.98 / 2026 Edition / Tokio 战争 / OTel CNCF / Topcoat / K8s 1.36
 */

import { readFileSync, writeFileSync } from 'fs';

const patches = [
  {
    file: 'docs/devops/rust-async-runtime-tokio-vs-io-uring-seven-year-war-2026.md',
    oldDesc: 'Rust 异步生态七年来被 Tokio 事实垄断，但 io_uring 的崛起、Apache Iggy 从 Tokio 迁移到 thread-per-core 架构的实战、以及 Async Working Group 的回归正在改写格局。本文从 epoll vs io_uring、work-stealing vs thread-per-core、三个运行时评估到迁移成本全面解析。',
    newDesc: 'Rust 异步生态 7 年 Tokio 垄断格局正在被 io_uring + thread-per-core 架构打破。本文 2026 实战完全指南：从 epoll vs io_uring 内核原理、work-stealing vs thread-per-core 调度模型，到 Apache Iggy 迁移实战、monio/Tokio/async-std 三运行时 Benchmark 对比，深度解析下一代 Rust 异步运行时选型与迁移成本。',
  },
  {
    file: 'docs/devops/topcoat-rust-fullstack-reactive-web-framework-2026.md',
    oldDesc: '"2026 年 7 月 22 日，Tokio 团队发布 Topcoat——一个模块化、电池齐全的 Rust 全栈响应式 Web 框架。它完全服务端渲染，通过将 Rust 表达式交叉编译为 JavaScript 实现响应式，无需 WebAssembly。本文从架构设计、响应式原理、与 Leptos/Dioxus 对比、Toasty ORM 集成到生产实践，完整解析这一 Rust Web 生态的新基建。"',
    newDesc: 'Topcoat 实战 2026 完全指南：Tokio 团队 7 月 22 日发布的 Rust 全栈响应式 Web 框架，无需 WebAssembly 即可实现服务端渲染 + 跨端响应式。本文深度解析模块化架构、Rust 表达式交叉编译为 JavaScript 原理、Toasty ORM 集成、与 Leptos/Dioxus/Yew 全方位对比，以及生产级 SSR 与渐进式增强实战。',
  },
  {
    file: 'docs/devops/opentelemetry-cncf-graduation-replace-vendor-stack-2026.md',
    oldDesc: '"2026 年 5 月 21 日，OpenTelemetry 在 CNCF Observability Summit 正式毕业，成为继 Kubernetes、Prometheus、Envoy 之后第 7 个顶级 CNCF 项目。本文从\'为什么退休老 vendor agent\'到\'90 天迁移清单\'，完整拆解可观测性栈替换实操。"',
    newDesc: 'OpenTelemetry CNCF 毕业实战 2026 完全指南：从 2026 年 5 月 21 日成为 CNCF 第 7 个顶级项目讲起，深度解析退休 Datadog/NewRelic/Splunk 老 vendor agent 的 5 大理由、OTel Collector + eBPF 自动注入、生产环境 90 天迁移清单，以及替代 3 类商业可观测性栈的实操路径与成本对比。',
  },
  {
    file: 'docs/devops/kubernetes-v1-36-haru-deep-dive-2026.md',
    oldDesc: '"深度解读 Kubernetes v1.36 Haru 的 70 项增强：User Namespaces GA 安全隔离、MutatingAdmissionPolicy GA 声明式变更、DRA 增强、AI/ML 工作负载支持，含完整实战配置。"',
    newDesc: 'Kubernetes v1.36 Haru 实战 2026 完全指南：深度拆解 70 项增强中的 16 项关键 GA/Alpha，含 User Namespaces 容器级安全隔离、MutatingAdmissionPolicy 声明式变更、DRA 动态资源分配、AI/ML 工作负载支持，全部附带生产级 YAML 配置与从 1.35 平滑升级清单。',
  },
  {
    file: 'docs/dev/backend/rust/rust-2026-edition-deep-dive.md',
    oldDesc: "'深度解析Rust 2026 Edition五大核心特性：Async Closures稳定、原生异步Trait、Field Projection、SIMD标准库与生命周期省略优化，附完整代码示例与迁移指南。'",
    newDesc: 'Rust 2026 Edition 实战完全指南：Async Closures 稳定、原生异步 Trait、Field Projection 字段投影、SIMD 标准库、生命周期省略规则 5 大核心特性逐项解析，附带跨 Edition 迁移检查表、完整可运行代码示例与生态 crate 兼容性清单。',
  },
  {
    file: 'docs/dev/backend/rust/rust-1-98-algebraic-float-operators-2026.md',
    oldDesc: "'深度解析 Rust 1.98 新特性：algebraic_add/algebraic_mul 等代数浮点运算符如何解锁 SIMD 向量化与运算重排，实测 4 倍求和加速、2 倍 SSD 加速，附完整代码示例与精度权衡指南。'",
    newDesc: 'Rust 1.98 代数浮点运算符实战 2026 完全指南：从 algebraic_add/algebraic_mul 等 11 个新运算符入手，深度解析编译器如何借 SIMD 向量化与运算重排解锁数值代码性能，实测 4 倍求和 + 2 倍 SSD 处理加速，附完整代码示例与 IEEE-754 精度损失权衡。',
  },
  {
    file: 'docs/dev/backend/rust/rust-rfc-3323-restrictions-impl-mut-2026.md',
    oldDesc: "'深度解析 Rust RFC 3323 Restrictions：impl(crate) 让 Sealed trait 模式成为历史，mut(crate) 为 Rust 带来真正的只读字段，nightly 已可测试。'",
    newDesc: 'Rust RFC 3323 Restrictions 实战完全指南：impl(crate) 让 Sealed trait 私有实现模式成为历史，mut(crate) 携带只读字段语义，nightly 已可启用。本文从 RFC 设计动机、迁移 Sealed trait crate 实战、与 pub(crate) 区别到生产代码适配与 opt-in 风险，全程附可运行示例。',
  },
  {
    file: 'docs/dev/backend/rust/rust-polonius-alpha-borrow-checker-2026.md',
    oldDesc: "'深度解析 Rust 下一代借用检查器 Polonius Alpha：流敏感借用检查如何让 get_mut_or_default 模式通过编译，nightly 启用细节、性能数据与 opt-out 方式。'",
    newDesc: 'Rust Polonius Alpha 借用检查器实战完全指南：流敏感数据流分析让 get_mut_or_default 模式最终通过编译，nightly 启用 + 完整 Benchmark。本文深度对比 NLL vs Polonius 编译速度、内存占用、与 Tree Borrows 重叠规则改进，附 opt-out 策略与生态 crate 兼容性预测。',
  },
  {
    file: 'docs/dev/backend/rust/Rust异步编程从基础到实战.md',
    oldDesc: '"系统讲解 Rust async/await 异步编程模型，从 Future trait 原理到 Tokio 运行时实战。涵盖异步 I/O、任务调度、异步同步原语、性能调优，以及与 Go goroutine 的对比分析，适合有 Go/Node.js 经验的开发者快速掌握 Rust 异步开发。"',
    newDesc: 'Rust 异步编程实战 2026 完全指南：系统拆解 async/await 模型、Future trait 状态机原理、Tokio 运行时任务调度机制，覆盖异步 I/O、Pin/Unpin、async Mutex/Semaphore、join!/select! 宏组合器，并深度对比 Go goroutine/Node.js libuv 模型，附 5 个生产项目完整代码示例。',
  },
  {
    file: 'docs/dev/backend/rust/rust-1-98-release-highlights-2026.md',
    oldDesc: '"Rust 1.98.0 于 2026 年 8 月 20 日正式发布。本文聚焦本版最易被忽略但影响面极广的改动：不变位置下的 &mut 生命周期缩短、deny-by-default 的 invalid_runtime_symbol_definitions lint、c_void_returns lint、thumbv7/thumbv8 系列晋级 Tier 2，以及一批需要重点关注的兼容性变更与升级建议。"',
    newDesc: 'Rust 1.98.0 发布解读实战完全指南（2026 年 8 月 20 日）：从不变位置下的 &mut 生命周期缩短规则讲起，覆盖 deny-by-default 的 invalid_runtime_symbol_definitions/c_void_returns 两个新 lint、thumbv7/thumbv8 晋级 Tier 2 嵌入式影响、Edition 2024 兼容性矩阵与升级风险排查清单。',
  },
];

let updated = 0;
const errors = [];
for (const p of patches) {
  const absPath = `/Users/pfinal/Documents/pfinal-vue-blog/${p.file}`;
  let content;
  try {
    content = readFileSync(absPath, 'utf-8');
  } catch (e) {
    console.error(`❌ Cannot read ${p.file}`);
    errors.push(p.file);
    continue;
  }

  // Replace description (匹配多种引号风格：'...' / "..." / 无引号)
  let descFound = false;
  // 多行 description 也支持
  const patterns = [
    new RegExp(`^description:\\s*['"\`]${escapeRegex(p.oldDesc.replace(/^['"]|['"]$/g, ''))}['"\`]\\s*$`, 'm'),
    new RegExp(`^description:\\s*${escapeRegex(p.oldDesc)}\\s*$`, 'm'),
  ];

  let newContent = content;
  for (const pat of patterns) {
    if (pat.test(content)) {
      descFound = true;
      // 检测原 quote 风格
      const m = content.match(/^description:\s*(['"`])(.+?)\1\s*$/m);
      const quote = m ? m[1] : '"';
      const newDescReplaced = content.replace(pat, `description: ${quote}${p.newDesc}${quote}`);
      newContent = newDescReplaced;
      break;
    }
  }

  if (!descFound) {
    console.error(`⚠️  Description not matched in ${p.file} (will keep original)`);
    errors.push(p.file);
    continue;
  }

  writeFileSync(absPath, newContent, 'utf-8');
  console.log(`✅ ${p.file}`);
  updated++;
}

console.log(`\n🎉 CTR-12 Batch: Updated ${updated}/${patches.length} descriptions`);
if (errors.length > 0) {
  console.log(`\n⚠️  Errors: ${errors.join(', ')}`);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
