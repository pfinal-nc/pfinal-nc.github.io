---
title: "encoding/json/v2 到底是快了还是慢了：Lemire 基准、issue #81315 与 52% 序列化回退的完整复盘"
date: 2026-09-18
tags: [golang, performance, json, benchmark]
keywords: [encoding/json/v2, Go 1.27, jsontext, Marshal 性能回退, issue 81315, Daniel Lemire, benchstat, GOEXPERIMENT=nojsonv2]
category: golang
description: "Go 1.27 的 encoding/json/v2 宣称更快，但 Daniel Lemire 的基准显示：解析快 1.5-2.3 倍的同时，10k 结构体切片的 Marshal 慢了 1.5 倍。深拆 issue #81315 的 benchstat 数据、jsontext 逐 token 状态机的回退根因、GOEXPERIMENT=nojsonv2 逃生舱，以及不同负载下的正确选型。"
author: PFinal南丞
recommend: true
---

> "升级就更快"是标准库最大的谎言之一。encoding/json/v2 证明了：**性能不是标量，是你工作负载形状的函数**。

# encoding/json/v2 到底是快了还是慢了：Lemire 基准、issue #81315 与 52% 序列化回退的完整复盘

## TL;DR

- Go 1.27 引入 `encoding/json/v2`（官方 2025 提案 #71491 落地），`encoding/json` 底层默认换用新引擎。**反序列化全面提速**：`interface{}` 场景 1.5-2.3 倍，旧 API 不改代码也白拿 18-30%。
- 但 Daniel Lemire（simdjson 作者）8 月底的基准发现：**10,000 个小结构体的 Marshal 慢了约 1.5 倍**——与 release notes 宣称的"序列化大体持平"直接冲突。
- 该发现被复现为官方 issue **[#81315](https://github.com/golang/go/issues/81315)**：Linux x86 上最高 **+107% 回退**。根因是新引擎逐 token 的状态机开销（命名空间跟踪、深度校验、BeginObject/EndObject 转移）在密集结构体切片上被放大。
- Go 团队已在跟进修复：社区发现 json/v2 引擎 marshal 切片比 v1 慢后，Jake Bailey 提交的 CL 让 `encoding/json/v2` 序列化切片比 v1 快约 **4%**（针对 Lemire 指出的 1.5 倍差距的第一步收敛）。
- 你的正确姿势：**解析密集型服务放心升级；结构体序列化密集的热路径，先 benchstat 自己的真实负载再决定**。

## 一、背景：一次迟到了十年的 JSON 重写

Go 1.27 的 encoding/json/v2 不是简单加包，而是一套双层架构：

```text
┌─────────────────────────────────────────────────┐
│ encoding/json  (v1 API, 兼容层)                  │  ← 你现有的代码
├─────────────────────────────────────────────────┤
│ encoding/json/v2 (新语义 API: Marshal/Unmarshal  │
│   + Options、RejectUnknownMembers、大小写敏感等)   │  ← 新代码可选
├─────────────────────────────────────────────────┤
│ encoding/json/jsontext (纯语法层: Token/Value、   │
│   流式 Encoder/Decoder，不碰反射)                 │  ← 引擎
└─────────────────────────────────────────────────┘
```

三个"现实"并存：

| 形态 | 代码 | 引擎 | 说明 |
|---|---|---|---|
| 旧 API 旧引擎 | `encoding/json` + `GOEXPERIMENT=nojsonv2` | v1 | 逃生舱，未来版本移除 |
| 旧 API 新引擎 | `encoding/json`（Go 1.27 默认） | v2 | 零改动自动提速（大部分场景）|
| 新 API | `encoding/json/v2` | v2 | 严格语义 + Options 体系 |

严格语义是 v2 的卖点：默认拒绝重复键、拒绝无效 UTF-8、字段名大小写敏感、`RejectUnknownMembers` 在 API 边界拒绝未知字段。这些安全默认值对网关/解析不可信输入的服务是刚需。

## 二、Lemire 的基准：一半天堂，一半地狱

Lemire 用 simdjson 经典语料（twitter.json / canada.json / citm_catalog.json）+ 10k 小结构体切片，在 Apple M4 Max 和 Xeon Gold 6548N 上测三种形态。`Record` 结构 6 个字段：

```go
type Record struct {
    ID     int      `json:"id"`
    Name   string   `json:"name"`
    Email  string   `json:"email"`
    Active bool     `json:"active"`
    Score  float64  `json:"score"`
    Tags   []string `json:"tags"`
}
```

结果矩阵（相对 v1 原版引擎）：

| 场景 | Unmarshal | Marshal |
|---|---|---|
| `interface{}` / `any`（未知结构） | **1.5-2.3× 快** | 1.2-3× 快 |
| 旧 API 升 Go 1.27 不改代码 | twitter/citm 快 18-30% | twitter 198→374 MB/s（近 2×）|
| canada.json（大数值数组） | 128→106 MB/s（**-17%**）| — |
| **10k 类型化结构体切片** | 新 API 仍快 | **旧 API 反而最快，新引擎慢 ~1.5×** |

一句话总结：**解析赢了，序列化在结构体密集场景输了**。Go 1.27 release notes 里"marshal performance is broadly at parity"这句话被数据打脸。

## 三、issue #81315：52% 到 107% 的复现

9 月 2 日，Go 贡献者 Deleplace 把 Lemire 的推文复现成正式 issue，benchstat 数据跨三平台：

```text
goos: darwin (Apple M4 Max)
MarshalRecords (10k)  legacy 1.633ms  v1 2.477ms (+51.7%)  v2 2.486ms (+52.3%)

goos: linux (Xeon @ 2.20GHz VM)
MarshalRecords (10k)  legacy 5.826ms  v1 11.763ms (+101.9%)  v2 12.062ms (+107.0%)
```

注意两个细节：

1. **v1 API（新引擎）和 v2 API 一样慢**——回退来自引擎，不是新 API 的语义处理。
2. **Linux VM 上回退被放大到 2 倍**——虚拟化/低频环境对逐 token 开销更敏感，生产环境不少见。

### 3.1 根因：逐 token 状态机的常数开销

issue 分析点出了要害。新引擎序列化时走 `jsontext.Encoder` 的结构化 token 流，对每个 JSON 成员都要经过：

```text
每个 struct 字段 → BeginObject/WriteToken/EndObject 转移
                + 命名空间跟踪（重复键检测所需）
                + 深度校验
                + UTF-8 与格式校验
```

对 10,000 个 6 字段结构体的密集切片，这些**每个 token 的常数开销**累计起来盖过了新引擎在其他方面的优化。而旧 v1 引擎序列化结构体走的是编译期生成的字段编解码路径，没有状态机这层税。

这解释了结果矩阵的"分裂"：

- **解析 `any` 时**，旧引擎要为通用值装箱、分配 map/slice，新引擎的流式 + 更少的中间分配赢面大；
- **序列化类型化结构体时**，旧引擎的编译期快路径本来就没有多少多余动作，新引擎的状态机开销没有东西可以对冲。

**经典教训：重构引擎时，安全校验（重复键、UTF-8、深度）都是运行时税。解析路径的收益能覆盖税，序列化快路径覆盖不了。**

### 3.2 修复进展

Golang Weekly #617 报道：Jake Bailey 的 CL 已在 review 中，让 json/v2 marshal 切片比 v1 **快约 4%**——针对 Lemire 发现的差距迈出第一步（此前 Lemire 实测 v2 引擎慢 1.5 倍）。4% 距离追平密集结构体场景还有距离，但方向明确：**官方承认回退存在，且正在引擎层修**。

## 四、不同负载的选型决策树

```text
你的服务 JSON 是瓶颈吗？（pprof 看 CPU top）
│
├── 不是 → 直接升级 Go 1.27，什么都不用管（大多数服务）
│
└── 是 → 压力在哪一侧？
    ├── Unmarshal 为主（接入层/API 网关/消费消息队列）
    │     → 升级即赚：旧 API 白拿 18-30%，激进可切 v2 API + RejectUnknownMembers
    │
    └── Marshal 为主（出站响应/导出/缓存序列化）
          → 先 benchstat 真实负载！
          ├─ 密集结构体切片（报表、批量导出）→ 保守方案：GOEXPERIMENT=nojsonv2 压测对比
          └─ 稀疏/any/接口值 → 新引擎仍然赢
```

可复用的复现基准（Lemire 仓库 + benchstat）：

```bash
git clone https://github.com/lemire/Code-used-on-Daniel-Lemire-s-blog.git
cd Code-used-on-Daniel-Lemire-s-blog/2026/08/29
mkdir -p testdata
curl -fsSL -o testdata/twitter.json \
  "https://raw.githubusercontent.com/simdjson/simdjson/master/jsonexamples/twitter.json"
GOTOOLCHAIN=go1.27.0 ./run.sh   # 输出 benchstat 对比：legacy vs v1 vs v2
```

### 4.1 别忘了 v2 的行为差异是正确性问题，不只是性能

切 v2 API 前检查三件事：

1. **大小写匹配**：v1 大小写不敏感匹配字段，v2 默认敏感——依赖宽松匹配的老接口会静默丢字段。
2. **重复键**：v1 允许（后者覆盖），v2 默认报错——对接脏数据源的服务要先加宽容 Options。
3. **错误文案**：测试里如果 grep 错误字符串，v2 的错误结构变了。

官方提供了 `jsonsplit` 包检测行为差异，迁移路径建议从 `DefaultOptionsV1()` 开始逐项开启 v2 行为。

## 五、工程视角：标准库性能承诺怎么读

这个事件给 Go 工程师的三个持久教训：

1. **"broadly at parity"不是给你的负载的承诺**。标准库基准用的语料（twitter.json 这类嵌套文档）和你的负载（10k 结构体导出）形状可能完全不同。release notes 的性能声明一律当"待验证假设"。
2. **回退会被跨平台放大**。52%（M4 Max）和 107%（Xeon VM）的差异说明：**在你部署的硬件上测**，别只看开发机数据。
3. **生态洗牌在发生**。json-iterator 已于 2025-12 归档（性能优势也消失，1.3× 快到 1.5× 慢不等）；Sonic 有 JIT+SIMD 但带架构限制与 ABI 兼容窗口。标准库 v2 落地后，第三方 JSON 库的生存空间被重新划分——**2026 年做 JSON 库选型，默认答案是 encoding/json/v2，除非 pprof 证明它是瓶颈且你的负载恰好是它的弱项**。

## 参考资料

- [issue #81315: marshaling slices of typed structs is 1.5x–2x slower](https://github.com/golang/go/issues/81315)
- [Daniel Lemire: The new Go JSON API: twice as fast, or 1.5x slower?](https://lemire.me/blog/2026/08/29/the-new-go-json-api-twice-as-fast-or-1-5x-slower/)
- Go Blog: [The Go 1.27 release](https://blog.go.dev/)（encoding/json/v2 章节）
- [encoding/json/v2 提案 #71491](https://github.com/golang/go/issues/71491)
- Golang Weekly #617（json/v2 marshal slices 提速 CL 报道）

## 本站相关阅读

- [Go 1.27 encoding/json/v2 迁移实战](/dev/backend/golang/go-1-27-encoding-json-v2-migration-2026)（迁移路径与 breaking change 全景）
- [Go 1.27 正式发布深度解读](/dev/backend/golang/go-1-27-release-highlights-2026)（json/v2 特性总览）
- [Go 1.28 database/sql 快路径深拆](/dev/backend/golang/go-1-28-database-sql-scan-fast-path-2026)（同系列的标准库性能工程）
- [Go 1.27 SIMD 加速 ChaCha20 实战](/dev/backend/golang/go-1-27-simd-chacha20-encryption-acceleration-2026)（同系列性能优化方法论）
