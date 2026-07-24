---
title: Rust 异步运行时七年战争：从 Tokio 垄断到 io_uring 破局，Apache Iggy 迁移实战与生态分裂深度解析
date: 2026-07-24
tags:
  - Rust
  - async
  - io_uring
  - Tokio
  - DevOps
  - performance
keywords:
  - Rust async
  - io_uring
  - Tokio
  - monoio
  - glommio
  - compio
  - thread-per-core
  - Apache Iggy
  - Async Working Group
category: DevOps
description: Rust 异步生态七年来被 Tokio 事实垄断，但 io_uring 的崛起、Apache Iggy 从 Tokio 迁移到 thread-per-core 架构的实战、以及 Async Working Group 的回归正在改写格局。本文从 epoll vs io_uring、work-stealing vs thread-per-core、三个运行时评估到迁移成本全面解析。
---

# Rust 异步运行时七年战争：从 Tokio 垄断到 io_uring 破局，Apache Iggy 迁移实战与生态分裂深度解析

## 引言：极强语言 + 极强社区 + 极弱的标准化决心

2026 年 6 月，Rust 历史性地攀升至 TIOBE 第 12 位。Stack Overflow 连续多年将其评为"最受喜爱语言"。然而在异步编程领域，Rust 生态却背负着七年的工程债务。

Rust 的 async/await 语法是向高性能网络服务转型的关键里程碑，但与 Go 的 goroutine 不同，Rust 选择了"零成本抽象"的理想主义路径——语言只提供 `Future` trait 和 `async/await` 语法，运行时留给社区实现。结果是：Tokio 事实垄断了 90% 的网络库，任何"异构运行时"的努力都在生态层面失败了。

直到 io_uring 的出现和 Apache Iggy 的迁移实战，才真正撼动了这个格局。本文从技术原理、实战案例到生态趋势，全面解析 Rust 异步运行时的七年战争。

## 一、 epoll vs io_uring：两种 I/O 模型的根本分歧

### 1.1 就绪模型 vs 完成模型

```
┌─────────────────────────────────────────────────────────┐
│              epoll (就绪模型 / Readiness)                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  用户空间: "这个 fd 准备好了吗?"                           │
│      │                                                   │
│      ▼                                                   │
│  内核: "准备好了, 你现在可以读/写了"                        │
│      │                                                   │
│      ▼                                                   │
│  用户空间: 执行 read()/write()                             │
│      │                                                   │
│      ▼                                                   │
│  内核: 执行实际 I/O (可能阻塞!)                            │
│                                                         │
│  问题: 对普通文件, 内核永远返回 "就绪"                      │
│        → read() 仍然阻塞在 page-cache 锁上                │
│        → Tokio 的解决方案: 扔到 blocking 线程池             │
│        → 默认最多 512 个线程!                              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│           io_uring (完成模型 / Completion)                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  用户空间: "帮我读这个文件, 结果放到 CQ 里"                 │
│      │                                                   │
│      ▼                                                   │
│  提交到 Submission Queue (SQ)                             │
│      │                                                   │
│      ▼                                                   │
│  内核: 异步执行 I/O, 完成后放到 Completion Queue (CQ)      │
│      │                                                   │
│      ▼                                                   │
│  用户空间: 从 CQ 读取结果 (不阻塞!)                        │
│                                                         │
│  优势:                                                   │
│  - 真正异步, 无需 blocking 线程池                         │
│  - 文件 I/O 也是异步完成                                  │
│  - SQ/CQ 是 lock-free 环形缓冲区, 用户态和内核共享          │
│  - 支持 batch 提交, 减少系统调用                          │
└─────────────────────────────────────────────────────────┘
```

### 1.2 为什么 Tokio 不能直接用 io_uring？

Rust 的 `Future` 是 **poll-based** 的：`Future::poll(&mut self, cx: &mut Context<'_>) -> Poll<Self::Output>`。每次 poll 时，Future 检查自身状态——如果就绪就返回 `Ready`，否则注册 waker 等待唤醒。

io_uring 是 **completion-based** 的：提交操作后，内核在完成时通知用户空间。

这两种模型之间存在"阻抗不匹配"：
- `Future` 的 poll 模型天然适配 epoll 的就绪通知
- io_uring 的完成模型更适合 callback 模式
- 可以在 poll 的第一次调用时提交 SQE，然后在后续 poll 中检查 CQ

虽然阻抗不匹配的开销可以忽略，但它意味着 **io_uring 运行时需要完全不同的 I/O driver 实现**，不能简单地在 Tokio 上"换一个后端"。

### 1.3 性能差距实测

根据 Apache Iggy 团队的基准测试（Linux 6.1 + Samsung 980 Pro NVMe）：

| 场景 | Tokio (epoll) | glommio (io_uring) | 提升倍数 |
|------|---------------|---------------------|----------|
| 随机读 4K (单核) | ~120k IOPS | ~350k IOPS | 2.9x |
| 顺序读 4K (单核) | ~800 MB/s | ~2.1 GB/s | 2.6x |
| 文件写入 4K (单核) | ~100k IOPS | ~300k IOPS | 3.0x |

对于 Apache Iggy 的顺序读吞吐：从 10-12 GB/s 提升到 **15+ GB/s**，幅度超过 25%。

## 二、Work-Stealing vs Thread-Per-Core：两种调度哲学

### 2.1 Tokio 的 Work-Stealing 模型

```
┌──────────────────────────────────────────────────┐
│          Tokio: 多线程 Work-Stealing 调度器        │
├──────────────────────────────────────────────────┤
│                                                  │
│  Core 0          Core 1          Core 2          │
│  ┌──────┐       ┌──────┐       ┌──────┐         │
│  │ Task │       │ Task │       │(空闲) │         │
│  │ Task │       │      │       │      │         │
│  │ Task │       │ Task │       │      │         │
│  └──┬───┘       └──────┘       └──▲───┘         │
│     │                              │              │
│     │    Work Stealing!            │              │
│     └──────────────────────────────┘              │
│                                                  │
│  优势: 自动负载均衡                                │
│  劣势:                                            │
│  - Task 可能在核心间迁移 → Cache 失效              │
│  - 调度路径不可预测                                │
│  - 共享状态需要锁/Send/Sync → 开销                  │
│  - 文件 I/O 扔到 blocking pool (最多 512 线程)     │
└──────────────────────────────────────────────────┘
```

### 2.2 Thread-Per-Core Shared-Nothing 模型

```
┌──────────────────────────────────────────────────┐
│     Thread-Per-Core: Shared-Nothing 架构          │
├──────────────────────────────────────────────────┤
│                                                  │
│  Core 0          Core 1          Core 2          │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐     │
│  │ Thread 0 │   │ Thread 1 │   │ Thread 2 │     │
│  │ ┌──────┐ │   │ ┌──────┐ │   │ ┌──────┐ │     │
│  │ │Task A│ │   │ │Task C│ │   │ │Task E│ │     │
│  │ │Task B│ │   │ │Task D│ │   │ │Task F│ │     │
│  │ └──────┘ │   │ └──────┘ │   │ └──────┘ │     │
│  │ io_uring │   │ io_uring │   │ io_uring │     │
│  │  实例 0  │   │  实例 1  │   │  实例 2  │     │
│  └──────────┘   └──────────┘   └──────────┘     │
│       ↕              ↕              ↕            │
│    消息传递 (channel) 连接各核心                    │
│                                                  │
│  优势:                                            │
│  - 无共享状态 → 无锁竞争                           │
│  - Task 不迁移 → Cache 友好                        │
│  - 真正异步文件 I/O → 无 blocking pool             │
│  - 执行路径可预测                                  │
│                                                  │
│  劣势:                                            │
│  - 手动负载均衡 (按 hash 分区)                     │
│  - 跨核通信需要消息传递                             │
│  - 生态支持少 (HTTP/gRPC 库少)                     │
└──────────────────────────────────────────────────┘
```

### 2.3 Apache Iggy 为什么放弃 Tokio？

Apache Iggy 是高性能消息流平台（Rust 实现的 Kafka 替代品），性能是核心卖点。他们放弃 Tokio 的决策路径：

1. **调度抖动**：Work-stealing 导致 Task 在核心间迁移，cache miss 影响延迟可预测性
2. **文件 I/O 瓶颈**：Tokio 对普通文件的 I/O 扔到 blocking 线程池（默认最多 512 线程），对于追求极限 I/O 性能的系统不可接受
3. **缺乏控制**：Tokio 的调度器决定 Future 在哪个 worker 上运行，应用层无法精确控制

## 三、三个 io_uring 运行时的评估与抉择

Apache Iggy 团队评估了三个 io_uring 运行时，它们的命运各不相同：

### 3.1 monoio（字节跳动）

```rust
// monoio 使用示例
use monoio::io::IntoHalvableAsyncRead;

#[monoio::main(threads = 4)]
async fn main() {
    // thread-per-core, 每个 thread 一个 io_uring 实例
    let file = monoio::fs::File::open("data.log").await.unwrap();
    let mut buf = vec![0u8; 4096];
    let n = file.read(&mut buf).await.unwrap();
    println!("读取 {} 字节", n);
}
```

- **来源**：字节跳动开源
- **架构**：thread-per-core + io_uring
- **优点**：在字节跳动内部验证过，初始 POC 性能良好
- **致命问题**：
  - io_uring 特性集支持不完整（很多高级操作无法使用）
  - 在字节跳动之外缺乏社区维护
  - PR 积压，issue 响应慢
- **Iggy 的结论**：不愿把核心架构押注在可能停止维护的依赖上

### 3.2 glommio（DataDog）

```rust
// glommio 使用示例
use glommio::LocalExecutor;

let executor = LocalExecutor::default();
executor.run(async {
    let file = glommio::io::DmaFile::open("data.log").await.unwrap();
    let mut buf = vec![0u8; 4096];
    let n = file.read_at(0, &mut buf).await.unwrap();
    println!("读取 {} 字节", n);
    file.close().await.unwrap();
});
```

- **来源**：DataDog 开源，作者 Glauber Costa（前 ScyllaDB，Seastar 框架贡献者）
- **架构**：thread-per-core + io_uring，受 Seastar 启发
- **优点**：
  - 技术上最成熟：任务优先级、共享内存池等生产级特性
  - 三个 io_uring 实例 per thread（不同延迟 profile）
  - 性能数据最好（见上表）
- **致命问题**：
  - Glauber Costa 离开 DataDog 加入 Turso 后，项目**事实停止维护**
  - PR 堆积，issue 无人响应
  - 2024 年底处于无人维护状态
- **Iggy 的结论**：技术最成熟但维护已停滞，无法依赖

### 3.3 compio（最终选择）

```rust
// compio 使用示例
use compio::io::AsyncReadExt;

#[compio::main]
async fn main() {
    let file = compio::fs::File::open("data.log").await.unwrap();
    let mut buf = vec![0u8; 4096];
    let n = file.read(&mut buf).await.unwrap();
    println!("读取 {} 字节", n);
    file.close().await;
}
```

- **来源**：社区驱动，2023 年开始
- **架构**：completion-based I/O + executor/I-O driver 解耦
- **优点**：
  - Linux 用 io_uring，Windows 用 IOCP，macOS 用 kqueue（降级兼容）
  - 执行器和 I/O 驱动解耦，可独立替换
  - **活跃维护**：有持续的贡献者和版本迭代
- **Iggy 的结论**：最终选择，活跃维护 + 架构解耦是关键

### 3.4 选择对比矩阵

| 维度 | monoio | glommio | compio |
|------|--------|---------|--------|
| 维护状态 | 低活跃 | 停滞 | **活跃** |
| io_uring 覆盖 | 不完整 | **最完整** | 良好 |
| 跨平台 | Linux only | Linux only | **Linux/Win/Mac** |
| 架构解耦 | 否 | 否 | **是** |
| 生产验证 | 字节跳动内部 | DataDog 内部 | Iggy 采用 |
| API 稳定性 | 0.x | 0.x | 0.x |
| 生态 | 小 | 小 | 小 |

## 四、Tokio 的护城河与生态锁定

### 4.1 为什么 90% 的库绑定 Tokio？

```rust
// 典型的 Tokio 生态库代码
use tokio::net::TcpStream;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

pub async fn proxy_data(addr: &str) -> std::io::Result<()> {
    // 直接 hardcode tokio 的类型
    let mut stream = TcpStream::connect(addr).await?;
    let mut buf = [0u8; 1024];
    loop {
        let n = stream.read(&mut buf).await?;
        if n == 0 { break; }
        stream.write_all(&buf[..n]).await?;
    }
    Ok(())
}
```

问题在于 Tokio 的 `AsyncRead` / `AsyncWrite` trait 与标准库或其他运行时的 trait **不兼容**。一个使用 `tokio::io::AsyncReadExt` 的库，无法在 monoio/glommio/compio 上运行。

### 4.2 生态锁定的实际后果

- **HTTP 框架**：axum, actix-web, warp 全部绑定 Tokio
- **数据库驱动**：sqlx, diesel-async 绑定 Tokio
- **gRPC 库**：tonic 绑定 Tokio
- **消息队列客户端**：lapin (RabbitMQ), rdkafka 绑定 Tokio

任何想使用 io_uring 运行时的项目，要么自己重新实现整个网络栈，要么在 Tokio 和 io_uring 之间做混合架构。

### 4.3 混合架构方案

```rust
// Tokio + glommio 混合方案
use tokio::task;

async fn hybrid_approach() {
    // 网络处理: Tokio (生态丰富)
    let network_result = tokio::spawn(async {
        // HTTP 请求、gRPC 调用等
        reqwest::get("https://api.example.com/data").await
    });

    // 文件 I/O: glommio (高性能)
    let io_result = task::spawn_blocking(|| {
        let executor = glommio::LocalExecutor::default();
        executor.run(async {
            heavy_file_io().await
        })
    });

    let (net, io) = tokio::join!(network_result, io_result);
}
```

这种方案牺牲了纯 thread-per-core 的简洁性，但在实践中是一个务实的折中。

## 五、2026 转机：Async Working Group 的回归

### 5.1 标准库计划

2025 年下半年，Rust 项目重启了 Async Working Group，目标是 2026-2027 将以下特性塞进标准库：

```
┌─────────────────────────────────────────────────────┐
│        Rust Async WG 标准化路线图 (2026-2027)          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ✅ AsyncIterator                                    │
│     状态: 已进入 nightly                              │
│     意义: 标准化异步迭代器 trait                       │
│                                                     │
│  🔄 AsyncRead / AsyncWrite (标准化)                   │
│     状态: RFC 阶段                                    │
│     意义: 统一异步 I/O trait, 打破 Tokio 垄断          │
│     关键: 如果标准化, 90% 绑定 Tokio 的库可以迁移       │
│                                                     │
│  🔄 异步 Drop (async Drop)                           │
│     状态: 设计阶段                                    │
│     意义: 析构函数可以 .await                         │
│     关键: io_uring 风格的 RAII 资源管理需要这个          │
│     难度: 需要语言层改动                               │
│     预计: 2027 年稳定                                 │
│                                                     │
│  🔄 Send-bound 推断改进                              │
│     状态: 设计阶段                                    │
│     意义: 让 async fn in trait 不再痛苦                │
│                                                     │
│  目标: 标准库提供足够的 trait + minimal executor       │
│  让 Tokio 成为 "参考实现" 而非 "唯一选择"              │
└─────────────────────────────────────────────────────┘
```

### 5.2 为什么 AsyncRead/AsyncWrite 标准化是关键？

如果标准库定义了 `AsyncRead` / `AsyncWrite` trait，那么：
- HTTP 框架可以基于标准 trait 实现，不绑定任何运行时
- 数据库驱动可以跨运行时使用
- 用户可以在 Tokio 和 io_uring 运行时之间自由切换

这是打破 Tokio 生态锁定的**基础设施层面**的解决方案。

### 5.3 异步 Drop 的挑战

```rust
// 当前: Drop 是同步的
impl Drop for AsyncResource {
    fn drop(&mut self) {
        // 不能 .await!
        // io_uring 的资源释放需要异步完成
        // 只能用阻塞方式或泄漏资源
    }
}

// 期望: 异步 Drop
impl AsyncDrop for AsyncResource {
    async fn drop(&mut self) {
        // 可以 .await!
        self.io_uring_close().await; // 优雅关闭
    }
}
```

异步 Drop 是最难的特性，因为它涉及"析构函数能不能 .await"这个语言级问题。但它对 io_uring 风格的资源管理至关重要——io_uring 的 close 操作本身是异步的。

乐观估计 2027 年稳定，但可能更晚。

## 六、Apache Iggy 迁移实战：从 Tokio 到 compio + io_uring

### 6.1 迁移动机

Apache Iggy 是一个高性能消息流平台，目标是成为 Rust 原生的 Kafka 替代品。其核心卖点就是性能，因此当 Tokio 的架构限制成为性能瓶颈时，团队决定迁移。

### 6.2 迁移阶段

```
阶段 1 (初始): Tokio + epoll
  ├── 多线程 work-stealing
  ├── 文件 I/O 通过 blocking pool
  └── 顺序读吞吐: 10-12 GB/s

阶段 2 (POC): monoio + io_uring
  ├── thread-per-core
  ├── 真正异步文件 I/O
  ├── 顺序读吞吐: 15+ GB/s (+25%)
  └── 问题: monoio 维护风险

阶段 3 (评估): glommio
  ├── 技术最成熟
  ├── 但维护已停滞
  └── 放弃

阶段 4 (最终): compio + io_uring + thread-per-core
  ├── 活跃维护
  ├── 架构解耦 (executor 与 I/O driver 分离)
  ├── 跨平台 (Linux io_uring / Windows IOCP)
  └── 最终架构确定
```

### 6.3 迁移代价

迁移并非没有代价。Iggy 团队经历了：
- 多次死锁和 panic
- 架构重设计
- 部分功能在迁移后失败再修复
- 网络栈需要适配新的 I/O 模型
- 调试工具缺失（没有 tokio-console 的等价物）

### 6.4 迁移成果

| 指标 | Tokio | compio + io_uring | 提升 |
|------|-------|--------------------|------|
| 顺序读吞吐 | 10-12 GB/s | 15+ GB/s | +25% |
| 文件 I/O 线程数 | 最多 512 | 0 (真正异步) | -100% |
| 调度可预测性 | 低 (work-stealing) | 高 (thread-per-core) | 质变 |
| Cache 命中率 | 低 (Task 迁移) | 高 (核心绑定) | 质变 |

## 七、对 Go 开发者的启示

Rust 异步生态的困境对 Go 开发者也有重要启示：

### 7.1 Goroutine 的优势

Go 的 goroutine + runtime 调度器在语言层面解决了 Rust 苦苦挣扎的问题：
- **统一运行时**：不存在"选择哪个运行时"的问题
- **真正的异步 I/O**：Go 的 netpoller 统一处理网络和文件 I/O
- **work-stealing 的良好实现**：Go 调度器的 work-stealing 经过深度优化，延迟可预测
- **简单性**：`go func()` 比 `tokio::spawn` + `Send + 'static` 约束简单得多

### 7.2 Go 仍然可以借鉴的

- **io_uring 的潜力**：Go 的 netpoller 基于 epoll，理论上也可以利用 io_uring 提升 I/O 性能。社区已有 `golang.org/x/sys/unix` 对 io_uring 的封装，但标准库尚未集成
- **thread-per-core 的思路**：对于极致性能场景，Go 的 GOMAXPROCS 绑定和 `runtime.LockOSThread()` 可以实现类似的线程绑定效果
- **异步 Drop 的需求**：Go 的 `defer` 是同步的，但 Go 的 GC 解决了资源释放时序问题，不需要异步析构

### 7.3 何时选 Rust 异步，何时选 Go？

| 场景 | 推荐 | 原因 |
|------|------|------|
| Web API / 微服务 | Go | 生态成熟，开发效率高 |
| 高并发网络代理 | Go | goroutine 轻量，netpoller 高效 |
| 消息队列 / 流处理 | Rust (compio) | io_uring + thread-per-core 极致 I/O |
| 嵌入式 / 资源受限 | Rust (no_std) | 零成本抽象，无运行时开销 |
| 快速原型 / MVP | Go | 编译快，学习曲线平缓 |
| 系统底层 / 驱动 | Rust | 内存安全 + 零成本抽象 |
| 团队不熟悉 Rust | Go | 不要为了性能牺牲交付速度 |

## 八、生态展望：2027 年会怎样？

### 8.1 短期预测 (2026-2027)

1. **Tokio 不会被替代**：它的护城河在跨平台和生态广度，而非绝对性能
2. **monoio/glommio 逐渐让出**：高性能 Linux 服务器场景给 compio 或后继者
3. **标准库 AsyncRead/AsyncWrite** 落地后，新库将基于标准 trait 实现
4. **异步 Drop** 如果在 2027 年稳定，io_uring 风格的资源管理将真正优雅

### 8.2 长期趋势

- **2027 年出现"官方推荐运行时"**：不是钦定，而是标准库提供 trait + minimal executor，Tokio 成为参考实现
- **io_uring 成为 Linux 默认**：通用应用层 io_uring 取代 epoll 成为默认 I/O 模型
- **WASM 组件模型带来新分裂**：WASI Preview 3 的 async 能力进来后，Web 生态会有自己的 runtime 假设
- **Go 可能集成 io_uring**：如果 Go 标准库集成 io_uring 支持，将在 I/O 密集场景追上 Rust

## 总结

Rust 异步生态的故事是一个反例：极强的语言、极强的社区、极弱的标准化决心，结果是七年的工程债务。Tokio 用优秀的工程质量赢得了事实垄断，但垄断本身阻碍了创新——io_uring 运行时在生态层面举步维艰，不是因为技术不够好，而是因为 90% 的库无法使用它们。

Apache Iggy 的迁移实战证明了 io_uring + thread-per-core 架构的性能优势（25%+ 吞吐提升），但也暴露了迁移的巨大成本（多次重写、调试工具缺失、维护风险）。

Async Working Group 的回归带来了希望：如果标准库提供 AsyncRead/AsyncWrite trait 和异步 Drop，Rust 异步生态的碎片化问题将从基础设施层面得到解决。

正如一位 Rust 社区成员所说："语言设计不能只靠'零成本抽象'理想主义，I/O 模型这种事最终需要语言项目方下场拍板。Go 的 goroutine 早就赢了便利性，Rust 选择了正确的方向但走了最痛苦的路。希望 2027 是异步 Rust 终于能'开箱即用'的一年。"

## 参考资料

- [Apache Iggy: Thread-Per-Core io_uring 迁移博客](https://iggy.apache.org/blogs/2026/02/27/thread-per-core-io_uring/)
- [How Apache Iggy Ditched Tokio for Thread-Per-Core io_uring](https://dev.to/sospeter/how-apache-iggy-ditched-tokio-for-thread-per-core-iouring-and-what-it-cost-them-3m75)
- [Rust 异步生态的分裂与重聚](https://xiejiayun.github.io/post/rust-async-runtime-split-io-uring-2026)
- [Rust 2026 异步生态选型指南](http://tinyzzh.github.io/posts/rust-2026/2026-06-19-rust_2026_019_async_ecosystem)
- [Tokio 调度抖动与 io_uring：从 Iggy 到 RobustMQ](https://robustmq.com/zh/Blogs/57)
- [Rust 2026 深度解析：TIOBE 前 15 与 WASM 全栈](https://chenxutan.com/d/4203.html)
- [Rust Development Roadmap 2025-2026](https://progerlib.com/news-post232)
