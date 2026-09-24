---
title: "Rust Miri 缓存泄密事件：你的 CI 缓存正在替 PR 偷 secrets"
date: 2026-09-24
tags:
  - security
  - rust
  - devops
keywords:
  - Miri
  - cargo miri
  - GitHub Actions 缓存
  - target 目录缓存
  - secrets 泄漏
  - Rust 安全响应
  - CI 供应链安全
category: security
description: "Rust 安全响应团队 9 月 21 日披露 Miri 将全部环境变量写入 target/，配合 GitHub Actions 缓存的读权限模型，PR 可读取 main 分支 CI 中的 secrets。拆解攻击链、官方修复方案与四条快速止血路径。"
author: PFinal南丞
recommend: true
---

# Rust Miri 缓存泄密事件：你的 CI 缓存正在替 PR 偷 secrets

> 2026 年 9 月 21 日，Rust 安全响应团队（由 Manish Goregaokar 署名）在官方博客披露了一个罕见的工具链安全问题：Miri——Rust 官方用来检测未定义行为的解释器——会把**全部环境变量**写入 `target/` 目录。单看这是"不太好的实现"，但当 `target/` 被 GitHub Actions 缓存、且缓存对 PR 可读时，它就变成了一条让 PR 偷走 main 分支 CI secrets 的通道。本文拆解攻击链、官方修复与止血方案，并延伸讨论 CI 缓存的信任模型。

## 一、发生了什么

Miri 是一个在解释执行中检测未定义行为的 Rust 工具（`cargo miri`），Rust 项目常用它在 CI 里验证 unsafe 代码。问题出在一个很工程化的细节上：

```
cargo miri 运行
  │
  ├─ 需要在多次运行间保留"构建相关的环境变量"
  │
  └─ 当前实现：把【所有】环境变量整个写入 target/ 目录
         │
         └─ target/ 被 actions/cache 或 swatinem/rust-cache 缓存
                │
                └─ PR 的 CI 运行可以【读取】该缓存
                       │
                       └─ PR 从缓存的 target/ 中读出 main 分支 CI 的 secrets
```

官方博客的原话很克制："这本身未必是一个漏洞，但当它和 GitHub Actions 的缓存行为配对时，就可能把 secrets 暴露给 PR。"

Rust 官方博客披露的是 Rust 官方博客（blog.rust-lang.org）2026-09-21 的安全公告，报告者是 OpenAI 的 Predrag Gruevski——他正是给 Rust 生态做 MIR 形式验证研究的工程师，对 Miri 内部再熟悉不过。

## 二、攻击链：为什么 GitHub 的缓存模型防不住它

先看 GitHub Actions 缓存的信任模型——它设计上是有防线的：

- **main（和其他分支）的 CI 可以写缓存**；
- **PR 的 CI 只能读缓存，不能写**——这是为了防止缓存投毒。

问题在于：读权限本身已经足够。攻击路径如下：

1. **攻击者向仓库提 PR**。GitHub 要求首个 PR 需要维护者批准才跑 CI，但只要攻击者曾经有过一个被合并的 PR，后续 PR 的 CI 就会在每次 push 时自动运行；
2. PR 的 CI 运行命中缓存，从缓存的 `target/` 里读出此前 main 分支 CI 写入的环境变量快照——里面可能带着发布 token、crate 签名密钥、部署凭据；
3. **提取 + 掩盖**：攻击者从 CI 输出中提取 secrets 后，再 push 第二个 commit 覆盖掉带有提取逻辑的那一版。

官方特别指出了两处让这件事更难被发现的细节：

- GitHub 的 UI 有时会**隐藏被覆盖的 commit**，审计时看不到第一版；
- CI 运行日志和被覆盖的 commit **几个月后自动删除**，事后取证窗口有限。

一句话总结：GitHub 防住了"PR 写缓存"（投毒），没防住"缓存内容本身被污染"（工具把 secrets 写进去）。

## 三、谁受影响：四个条件

官方给出了明确的受影响判定，四个条件**全部满足**才算中招：

| # | 条件 | 常见程度 |
| --- | --- | --- |
| 1 | CI 中运行 `cargo miri` | Rust 项目中常见（unsafe 代码验证） |
| 2 | 运行 Miri 的 step 能访问 secrets 环境变量 | 常见——secrets 常被设在 job 级 |
| 3 | 缓存了 `target/` 目录（`actions/cache` 或 `swatinem/rust-cache`） | 非常常见——Rust CI 加速标配 |
| 4 | 缓存对 PR 可读 | 常见且通常是"预期行为" |

官方还做了一次生态扫描（算力来自 OpenAI 捐赠的 Codex 额度）：确认 **1 个仓库存在问题**，另有 **7 个仓库不确认受影响但建议谨慎**，均已私下通知维护者。比例看似很低，但扫描只覆盖公开仓库——私有仓库里 `cargo miri` + 全局 secrets + 全量缓存这套组合的真实数量无从统计。

自查你的 workflow 是否中招，看这个反例即可：

```yaml
# 高危配置示例（四条件全中）
# 注意：示例中 GH_SECRETS_REF 代表 GitHub Actions 的 secrets 引用语法
# （双花括号形式，为避免模板解析此处不直接展示字面量）
jobs:
  miri:
    runs-on: ubuntu-latest
    env:
      CRATES_IO_TOKEN: GH_SECRETS_REF_CRATES_IO_TOKEN   # 条件 2：job 级 secrets
    steps:
      - uses: actions/checkout@v4
      - uses: Swatinem/rust-cache@v2                     # 条件 3+4：缓存 target/，PR 可读
      - run: cargo +nightly miri test                    # 条件 1：Miri 运行
```

## 四、官方修复

修复 PR 的标题说明了全部思路：**"only preserve env vars cargo actually changes"**——只保留 cargo 实际会改动的环境变量，而不是全量快照。

- PR 于 2026-09-21 05:56 UTC 打开，07:00 UTC 合并，**一小时内落地**；
- 修复后 Miri 只保留 `CARGO_*` 环境变量（但排除 `CARGO_*_TOKEN`）和 `OUT_DIR`；
- **2026-09-22 的 nightly Miri 版本已包含修复**。

官方同时留了一句很值得记录的话，把问题从"Mir 的 bug"上升为"生态约定"：

> 我们认为，一个能轻易被 secrets 污染的缓存是坏实践。Cargo/Miri/Rust 不保证环境变量不会进入 target/——你不应该依赖这一点。

也就是说：即使你不用 Miri，**任何工具都可能往 `target/` 写东西**。把 secrets 从缓存路径中隔离出去，是使用者的责任。

## 五、止血方案：今天就能做的四件事

在 nightly 修复生效之前（或在你无法立即升级时），官方给出三条快速缓解：

### 方案 1：给 Miri 的 job 关缓存

```yaml
jobs:
  miri:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # 注意：不使用 rust-cache / actions/cache
      - run: cargo +nightly miri test
```

代价是 Miri job 每次全量编译，慢，但绝对干净。

### 方案 2：secrets 只授予不跑 Miri 的 step

```yaml
jobs:
  miri:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Swatinem/rust-cache@v2
      # Miri step 不设 env，继承不到 secrets
      - run: cargo +nightly miri test
```

把 `CRATES_IO_TOKEN` 这类 secrets 从 job 级 `env:` 下沉到具体 step 的 `env:`，且只给发布 job 用。

### 方案 3：暂时禁用 Miri

如果 Miri 不是关键门禁，先注释掉，等 nightly 更新后再恢复。

### 无论选哪个：清缓存 + 轮换

官方强调，缓解后还必须做两步：

1. **清除现有缓存**（GitHub 仓库 Actions 缓存页面或 `gh cache delete --all`）——污染的缓存不会自愈；
2. **轮换可能已泄漏的 secrets**——除非你能证明从未有过带 secrets 的缓存。

```bash
# 用 gh CLI 清空仓库全部 Actions 缓存
gh cache delete --all --repo your-org/your-repo
```

## 六、延伸：CI 缓存的信任模型课

这次事件值得每个写 CI 的人停下来想十分钟，因为它戳破了一个普遍的误解：**"缓存只是性能优化，不涉及安全"**。

把 GitHub Actions 的缓存规则抽象一下：

```
写权限：可信分支（main）
读权限：包括 PR 在内的所有运行
假设：缓存里只有"构建产物"，不含敏感数据
```

问题出在第三条假设上。缓存本质是一个**跨信任边界共享的文件系统快照**——main 分支的进程环境、工具的副产物、依赖编译的中间状态，全部打包在一起，交给"任何能开 PR 的人"读。一旦任何写入方（工具、脚本、依赖的 build.rs）把敏感数据放进缓存路径，信任边界就穿了。

类似的案例在 Git 历史上反复出现：`.env` 进了 git 历史、Docker 镜像层里躺着构建密钥、npm 包里带着 `.npmrc`。模式完全一致——**"写的时候没意识到这里会被别人读"**。

由此可以提炼三条 CI 缓存纪律：

1. **secrets 永远不进 job 级环境**：下沉到 step，让"能读到 secrets 的进程集合"尽可能小；
2. **缓存路径视为公开目录**：任何可能含敏感信息的目录（不只是 `target/`，还有 `~/.cargo/registry` 里的凭据缓存等）不要进缓存；
3. **把"谁能在 CI 里读到什么"画出来**：PR 运行、fork PR 运行、scheduled 运行各自的权限不同，审查 workflow 时逐个过。

## 七、结语

这次事件里最值得称道的是 Rust 安全响应团队的处置节奏：从报告（生态研究者）、到官方公告、到一小时合并修复、到次日 nightly 发布、再到主动生态扫描——工具链安全的响应速度已经卷到了这个水平。

而对我们这些使用者，教训朴素得多：**Miri 只是这次碰巧被发现的那个写入方**。你的 CI 缓存里现在躺着什么，取决于每一个会往构建目录写文件的工具。别赌它们全都干净。

## 参考资料

- [Rust 官方博客：Miri 环境变量持久化公告（2026-09-21）](https://blog.rust-lang.org/2026/09/21/miri-env-vars/)
- [修复 PR：only preserve env vars cargo actually changes（rust-lang/miri）](https://github.com/rust-lang/miri/pulls)
- [The Machine Herald 事件综述](https://machineherald.io/article/2026-09/21-rust-security-team-fixes-miri-bug-that-let-github-actions-caches-leak-secrets-to-pull-requests)
- [GitHub Actions 缓存文档](https://docs.github.com/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [Swatinem/rust-cache](https://github.com/Swatinem/rust-cache)
- 本站相关文章：[vm2 CVE-2026-92939 沙箱逃逸](/security/offensive/vm2-cve-2026-92939-crypto-setengine-sandbox-escape-2026)、[Kubernetes Agent Sandbox CRD](/devops/kubernetes-agent-sandbox-crd-2026)
