---
title: "从原始镜像里挖出被删的 Windows 事件日志：Go 取证库 go-evtx-carver 的 carving 技术拆解"
date: 2026-10-19 11:00:00
tags:
  - security
  - forensics
  - golang
  - evtx
  - incident-response
keywords:
  - EVTX
  - carving
  - 数字取证
  - Windows 事件日志
  - go-evtx-carver
  - BinXML
  - LZNT1
  - NTFS 压缩
  - MFT
  - 勒索软件
  - 事件响应
  - Positive Technologies
category: security/offensive
description: "勒索软件越来越倾向于直接加密整块虚拟磁盘，日志没了、MFT 被毁、分区表丢失——常规解析器直接崩溃或 OOM。本文拆解 Positive Technologies 用 Go 写的 go-evtx-carver：EVTX 的 file→chunk→record 三层结构、'字段名在 chunk 缓存里、值在记录里'这一让 carving 成立的核心原理，以及 chunk/record/LZNT1 三种 carving 策略。"
author: PFinal南丞
recommend: 安全攻防
---

# 从原始镜像里挖出被删的 Windows 事件日志：Go 取证库 go-evtx-carver 的 carving 技术拆解

事件响应（IR）里，Windows 的 **EVTX 事件日志**往往是最关键的证据来源：账号被盗、横向移动、持久化，都可能在日志里留下痕迹。所以攻击者也很清楚——**先把日志毁掉**。

`wevtutil cl` 清日志是老套路；而现在越来越多的勒索软件直接盯上**整块虚拟磁盘镜像**（VDI、VMDK、VHDX）。当 **MFT（主文件表）被毁、分区表丢失**，卷的文件系统可能根本挂载不起来。此时你手里只有一坨**原始字节**。

Positive Technologies 的事件响应团队（PT ESC IR）在 2026 年 10 月公开了他们为此写的 **Go 库 `go-evtx-carver`**：它不依赖文件系统，直接在原始字节流里按签名 **carving（雕复）** 出残存的 EVTX 记录。

这篇文章把 Habr 上那篇 18 分钟的技术说明拆开讲清楚——尤其是**为什么有些方法能还原完整字段名，而有些只能还原一堆"没有名字的值"**。答案藏在 EVTX 的格式设计里。

---

## 一、背景：为什么"日志没了"反而要去挖磁盘

作者先从威胁模型讲起。EVTX 通常是攻击者**首要清除目标**：

- 用 `wevtutil cl` 直接清；
- 加密日志文件；
- 擦盘；
- 或者——越来越常见——**加密整台虚拟机的磁盘镜像**。

一旦文件系统被破坏到标准工具无法挂载（MFT 被毁、分区表缺失），常规做法是**手工重建文件系统**：找丢失的分区、恢复被删文件。但这很慢，而且**仍可能留下事件历史的空档或严重损坏的 EVTX 文件**。

于是就有了 carving：

> **carving = 在原始数据里按字节搜索特征签名**——数据可以来自磁盘/卷镜像、内存转储（memory dump）、pagefile、或 VSS 快照。它**不依赖文件系统**，因此能捞回常规解析拿不到的证据。

PT ESC IR 的流水线主要用 Go 写。他们找了一圈，**没有一个开源库能同时满足"EVTX 解析 + carving"**：现有的解析器**要么经常崩，要么吃内存太多**，没法做自动化。于是自己写了一个——既能解析完好的 EVTX，也能在**校验和不匹配或文件损坏**时恢复数据，还能从比特级镜像、内存转储、虚拟磁盘镜像里做 carving。

---

## 二、EVTX 格式：file → chunk → record 三层

要理解 carving 能还原什么，必须先看格式。EVTX 是三个嵌套层级：

```text
┌─────────────────────────────────────────────────┐
│  File                                            │
│  - 前 4,096 字节 (0x1000) 为文件头                │
│  - magic: "ElfFile\x00"                          │
│  ┌───────────────────────────────────────────┐  │
│  │  Chunk（固定 65,536 字节）                 │  │
│  │  - 前 512 字节为 chunk 头                  │  │
│  │  - magic: "ElfChnk\x00"                    │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  Record                             │  │  │
│  │  │  - 24 字节头（magic 2A 2A 00 00）    │  │  │
│  │  │  - BinXML 正文                       │  │  │
│  │  │  - 尾部 4 字节 = DataSize 的副本     │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 2.1 文件头（前 4,096 字节）

只有前 **128 字节**有数据，其余保留、通常为零。头 8 字节是 magic `ElfFile\x00`。

| 偏移 | 大小 | 字段 | 说明 |
|------|------|------|------|
| 0 | 8 | Magic | `ElfFile\x00` |
| 8 | 8 | FirstChunkNumber | 环形缓冲区里第一个 chunk 编号 |
| 16 | 8 | LastChunkNumber | 最后一个 chunk 编号 |
| 24 | 8 | NextRecordID | 下一条记录的 ID |
| 32 | 4 | HeaderSize | 结构化部分大小，通常 128 |
| 38 | 2 | MajorVersion | 主版本，通常 3 |
| 40 | 2 | HeaderBlockSize | 整个头块大小：4,096 |
| 42 | 2 | ChunkCount | 声明的 chunk 数 |
| 120 | 4 | Flags | 位标志 |
| 124 | 4 | Checksum | 字节 `[0:120]` 的 CRC32-IEEE |

`Flags` 有个实用价值：`DIRTY(0x1)` 表示日志**未干净关闭**，`FULL(0x2)` 表示日志**写满**，`NO_CRC32(0x4)` 表示应用**关闭了校验**。

**关键坑**：取证工具抓取 EVTX 时，日志服务往往**还没把元数据刷到磁盘**，所以**文件头的 `ChunkCount` 常常不可靠**——唯一可靠的算法是：`文件大小 = chunk 数 × 65,536 + 4,096`。

### 2.2 Chunk 头（前 512 字节）

每个 chunk 固定 **65,536 字节**，以 `ElfChnk\x00` 开头。

| 偏移 | 大小 | 字段 | 说明 |
|------|------|------|------|
| 0 | 8 | Magic | `ElfChnk\x00` |
| 8 | 8 | FirstEventRecordNumber | chunk 内首条记录号 |
| 24 | 8 | FirstEventRecordID | 全局首条记录 ID |
| 32 | 8 | LastEventRecordID | 全局末条记录 ID |
| 44 | 4 | LastEventRecordDataOffset | 最后一条记录的起始偏移 |
| 48 | 4 | FreeSpaceOffset | 空闲区起始偏移 |
| 52 | 4 | EventsChecksum | chunk 内所有记录数据的 CRC32 |
| 124 | 4 | HeaderChunkChecksum | chunk 头的 CRC32-IEEE |
| 128 | 256 | StringsOffsets[64] | 64 个 4 字节偏移，指向字符串缓存哈希桶头 |
| 384 | 128 | TemplateOffsets[32] | 32 个 4 字节偏移，指向模板缓存哈希桶头 |

**这里有一个对 carving 至关重要的设计**：chunk 头里有**两个独立的 CRC32**——一个校验头（字节 `[0:120]` 与 `[128:512]`），一个校验记录区（`[512:FreeSpaceOffset]`）。是**两个独立的 CRC 而不是一个全局 CRC**，意味着一个 chunk 可能**某段损坏、另一段完好**，你可以**分别验证**。这是后面"置信度"分级得以成立的基础。

### 2.3 事件记录

记录**连续**存放在 chunk 的数据区。每条记录 = **24 字节头 + BinXML 正文 + 4 字节尾**。

| 偏移 | 大小 | 字段 | 说明 |
|------|------|------|------|
| 0 | 4 | Magic | `2A 2A 00 00` |
| 4 | 4 | DataSize | 记录总大小（含头与尾部副本） |
| 8 | 8 | EventRecordID | 全局单调递增 ID |
| 16 | 8 | Timestamp | `FILETIME` 记录创建时间 |
| 24 | DataSize−28 | BinXML | 二进制 XML 正文 |
| DataSize−4 | 4 | DataSize (copy) | 头里 DataSize 的副本 |

两个细节很妙：

- **尾部复制了一份 `DataSize`**——解析器可以借此**校验完整性**（两个值比对），也可以**倒着扫描定位记录边界**（carving 时极有用）；
- **单条记录没有自己的 CRC**，只有 chunk 级的 `EventsChecksum` 覆盖全部记录——所以**校验只能在 chunk 层面做**（这解释了为什么 go-evtx-carver 用"置信度"而不是"通过/否决"）。

另外，`EventRecordID` 全局单调递增，所以**序列里出现断层，就可能意味着有记录被删除或丢失**。

### 2.4 BinXML：token + 模板

正文是最复杂的部分——**BinXML**：用单字节 token 构建的 XML 二进制表示。如果每条记录都把完整 XML（每个标签名、属性名都写全）存一遍，日志会爆炸式膨胀。同一个事件（比如 4624）可能重复上万次、字段相同、只是值不同，BinXML 用两层省空间：

**第 1 层：token 取代文本。** 正文是一串单字节 token：

| 字节 | token | 含义 |
|------|-------|------|
| 0x00 | EOF | 片段结束 |
| 0x01 | OpenStartElement | `<Tag` |
| 0x02 | CloseStartElement | `>`（属性之后） |
| 0x03 | CloseEmptyElement | `/>` |
| 0x04 | CloseElement | `</Tag>` |
| 0x05 | Value | 带类型的值 |
| 0x06 | Attribute | `name="value"` |
| 0x0c | TemplateInstance | 模板引用 + 替换值 |
| 0x0d/0x0e | Substitution / SubstitutionOptional | 替换槽（必需/可选） |
| 0x0f | FragmentHeader | BinXML 片段头 |

`Value` 不是纯文本，而是**带一个单字节类型标签**：各种大小/符号的整数、`HexInt32/64`（格式化为 `0x...`，`Keywords` 常用）、UTF-16 与单字节字符串、`GuidType`、`SidType`、`FileTimeType`、原始二进制、嵌套 BinXML 片段，以及上述类型的数组变体。

**第 2 层：模板。** 这一层**决定了 carving 能捞到什么**。在 BinXML 里，**标签名和属性名（`ProcessId`、`TargetUserName`…）几乎从不以明文出现**，而是被**4 字节指针**替换，指向 chunk 字符串缓存里的一条记录。某种事件类型**每个 chunk 只完整写一次结构**——这份结构里值的部分是**替换槽**（`Substitution` / `SubstitutionOptional`，带索引）。

这份树就是**模板**。之后所有**同结构**的事件，都不再是树，而是一个简短的 `TemplateInstance` token：**一个模板引用 + 一串有序的具体值**（类型 + 数据，按槽的索引排序）。

> 解析时：取出模板树，按索引把对应值插进每个槽；可选槽为空则该节点直接从树里删掉；数组值含多个元素则展开成多个重复元素。

字符串/模板缓存的桶头就是 chunk 头里的 `StringsOffsets[64]` 和 `TemplateOffsets[32]`——写文件时用来去重，**读的时候其实用不到**（名字是**直接按偏移查**，不是哈希遍历）。

---

## 三、carving 的核心原理：字段名在 chunk 里，值在记录里

**这是全文最关键的一段话。**

- **字段名**（`ProcessId`、`LogonId`…）是**指向 chunk 字符串缓存的引用**。**没有 chunk，字段名就不可恢复**。
- 但 `TemplateInstance` 里的**替换值本身是自包含的**，它就躺在记录正文里，**无论 chunk 是否完好都能读出来**——即使模板、字段名、整个 chunk 全丢了。

**这份"名称与值的分离"，正是 carving 能还原单条记录的唯一依据。** 两种 carving 方法的差别，也全在这里：

- 有 chunk → 拿到 chunk 自带的字符串/模板缓存 → **能还原带名字的完整字段和嵌套 JSON**；
- 没 chunk → 只按位置把值捞出来 → **一堆没有语义标签的有序值**，你只知道"这是第 N 个替换值"，但不知道它原本叫 `TargetUserName` 还是别的。

---

## 四、三种 carving 方法

### 4.1 Chunk carving（完整结构还原）

思路：**不依赖对齐边界**，直接在镜像里扫 `ElfChnk\x00`，然后评估有效性、恢复全部带字段名的记录。

```text
① 扫 ElfChnk\x00（任意偏移，不要求 64KB 对齐）→ 找到候选
② 读取最多 65536 字节（到镜像末尾则为截断）
③ 解析 chunk 头：magic / 版本 / 大小 / 校验（可选）
④ 打置信度：
     High   = 头 + 数据两个 CRC 都对
     Medium = 只有头 CRC 对（头完好、数据坏或截断）
     Low    = CRC 不匹配，但 magic 与头结构看起来合理
⑤ 解析记录（即使 Low 也继续）：
     - 读 24 字节头拿 DataSize
     - 与尾部 4 字节的副本比对
     - 一致 → 有效，取 BinXML 用 chunk 自带缓存解码
     - 不一致 → resync：搜索下一条 2A 2A 00 00，而不是解析垃圾
⑥ 完整还原：chunk 自带模板/字符串缓存 → 每条记录都有命名字段与嵌套 JSON
⑦ 记元数据：镜像偏移、所属 chunk 偏移、置信度
```

恢复出来的样本（节选，事件 4624）：

```json
{
  "image_offset": 538784256,
  "chunk_offset": 538783744,
  "event_record_id": 138544,
  "timestamp": "2026-01-12T14:11:59.4098826Z",
  "confidence": "chunk-validated",
  "event": {
    "Event": {
      "System": {
        "Provider": { "#attributes": { "Name": "Microsoft-Windows-Security-Auditing" } },
        "EventID": 4624,
        "Computer": "[REDACTED]"
      },
      "EventData": {
        "TargetUserName": "[REDACTED]",
        "LogonType": 3,
        "LogonProcessName": "Kerberos",
        "IpPort": "56272"
      }
    }
  }
}
```

### 4.2 Record carving（没有模板，但能读出值）

当 chunk 无法恢复时，退而求其次，**按单条记录签名 `2A 2A 00 00` 扫描**：

1. 在原始镜像里按任意偏移扫 `2A 2A 00 00`；
2. 从后续 24 字节读出 `DataSize`、`EventRecordID`、`FILETIME` 等元数据；
3. 按 `DataSize` 取出 BinXML 正文；
4. **无名值抽取**：PIDs、SIDs、路径、IP、文本串自包含在正文里 → 抽成**有序列表**；
5. **极端损坏兜底**：若正文连结构都解不出，就**暴力扫可读的 UTF-16 文本**——最后的手段；
6. 记元数据（偏移、可识别的 chunk 偏移、置信度通常更低）。

### 4.3 LZNT1 压缩 chunk 的 carving

前两种方法有一个**致命盲区**：如果 EVTX 位于**启用 NTFS 透明压缩（LZNT1）** 的卷上，磁盘上物理存储的**不是 chunk 本身，而是 LZNT1 压缩流**。此时你直接扫 `ElfChnk\x00` 只会得到**随机误匹配**，根本恢复不出可读事件。

但这里有两个可以利用的巧妙事实：

1. **CU 尺寸正好等于 chunk 尺寸**：NTFS 以 16 个簇为一个 **压缩单元（Compression Unit, CU）**。按标准 **4KB 簇**算，一个 CU 恰好 **65,536 字节**——和 EVTX chunk 一模一样。CU 内部再切成 4,096 字节子块，每块各自压缩或原样存储、各带一个 2 字节头。由于 EVTX 文件头（4,096）和 chunk 大小（65,536）都是 4,096 的整数倍，**任何 EVTX chunk 的起点必然对齐到某个 CU 子块边界**。
2. **LZ77 流的前几个字节必然是字面量**：因为匹配窗口一开始是空的。对 EVTX chunk 来说，**前几个字节就是 `ElfChnk\x00`**。而 LZNT1 的滑动窗口上限是 4,096 字节，只能在该范围内找匹配。

于是工作流是：

```text
① 扫 ElfChnk\x00 → 候选
② 回退到压缩块头（2 字节小端）：
     - 低 12 位 = 负载长度，高 3 位 = 011 签名，最高位 = 是否压缩
     - 若该块被压缩，签名前还有一个 token 标志字节 → 块头在 offset -3
     - 若未压缩，则没有那个字节        → 块头在 offset -2
     因为事先不知道压没压，两个偏移都试：先 -3，再 -2
③ 解压该 CU，重建满 65,536 字节
④ 校验解压结果前 8 字节是否 ElfChnk\x00（否则误报）
⑤ 把重建出的 chunk 喂进和未压缩 carving 相同的记录解析引擎
```

样本里还带了一条很有价值的注释：

```json
"note": "recovered by decoding LZNT1 (NTFS compression) starting at image offset 2395853161 (6699 compressed bytes -> 65536 bytes)",
"compressed_source_offset": 2395853161,
"compressed_source_bytes": 6699
```

注意 **6699 压缩字节 → 65536 字节**，压缩比约 10:1，说明透明压缩在小日志块上确实很有效——也正因如此，不处理 LZNT1 就会**完全漏掉**这类证据。

---

## 五、现有工具的空白

作者做了一张横向对比，结论很直白——**没有一个是"快 + 能 carving + Go 原生"**：

| 工具 | 语言 | 形态 | Carving |
|------|------|------|---------|
| evtx / evtx_dump (omerbenamram) | Rust | 库 + CLI | ❌ 只有基础恢复，标注为未完成 |
| pyevtx-rs | Rust 核 + Python 壳 | Python 包 | ❌ 基础恢复 |
| golang-evtx (0xrawsec) | Go | CLI | ⚠️ 能做但**一有结构偏差就 panic**，且函数无法从包里调用 |
| Velocidex/evtx | Go | 库 + CLI（Velociraptor 核心） | ❌ 稳定但**更慢、不支持 carving、重复解析模板** |
| libevtx (libyal) | C | 库 + CLI | ❌ |
| python-evtx | 纯 Python | 库 + CLI | ❌ 需要另一个项目 EVTXtract |
| EvtxECmd (Eric Zimmerman) | C#/.NET | CLI | ❌ 依赖 bulk_extractor，非嵌入式库 |

作者的评语很有信息量：

- **Rust 的 evtx/evtx_dump 最快**，但接进 Go 需要**独立进程或 cgo**，而且 carving 是"标注为未完成的基础特性"；
- **Velocidex/evtx 稳定但更慢**，不支持 carving，还重复解析模板；
- **golang-evtx 能做 carving，但稍有结构偏差就 `panic()`**——**连标准 Windows 日志都能复现崩溃**，这对"损坏文件"场景完全不可接受；
- **EvtxECmd 是 C#/.NET 界的行业标准**，Maps 系统很强，但**没有原生 carving**，且是 CLI 设计、非可嵌入库，从 Go 用它得再养一个 .NET 运行时进程。

---

## 六、go-evtx-carver 的 API

最终产出是一个**纯 Go、无 cgo** 的模块。关键包 `evtx` 与 `carve` **放在模块顶层**（不在 `internal/` 下），可被外部当作标准库导入。

### 6.1 解析：`Parse` 与流式 `ParseFileToJSONL`

```go
// 一次性解析整个文件（结果缓存在内存）
func Parse(path string, validateChecksums bool) ([]json.RawMessage, Stats, error)

records, stats, err := evtx.Parse("security.evtx", true)
if err != nil {
    log.Fatal(err) // 只有"文件打不开"才返回 error
}
fmt.Printf("parsed %d records, errors: %d\n", stats.RecordCount, stats.ErrorCount)
for _, r := range records {
    fmt.Println(string(r)) // 每条记录是 json.RawMessage
}
```

**单条记录解析失败不是致命错误**——它只计入 `Stats.ErrorCount`。再看流式版本：

```go
// 同一时刻只在内存里保留一个 64KB chunk
func ParseFileToJSONL(inputPath string, validateChecksums bool,
    warnOut io.Writer) (<-chan []byte, <-chan Stats, error)

lines, statsCh, err := evtx.ParseFileToJSONL("security.evtx", true, os.Stderr)
if err != nil {
    log.Fatal(err)
}
for line := range lines {
    // 立刻处理 line（[]byte，一条记录的 JSON），不缓冲进内存
}
stats := <-statsCh
```

这个设计直接针对"**现有解析器吃内存太多**"的痛点：**流式，一次一个 chunk**。

### 6.2 carving：`Carve` 调度器

从原始镜像恢复数据时用：

```go
func Carve(imagePath string, mode Mode) ([]CarvedRecord, error)

const (
    ModeChunks      Mode = "chunks"       // CarveChunks
    ModeRecords     Mode = "records"      // CarveRecordsByMagic
    ModeChunksLZNT1 Mode = "chunks-lznt1" // CarveChunksLZNT1
)

recs, err := carve.Carve("disk.dd", carve.ModeChunks)
```

因为 EVTX **单条记录没有 CRC**，只有 chunk 级校验，所以结果带的是**置信度**而非"通过/否决"：

| 置信度 | 含义 |
|--------|------|
| `ConfidenceChunkValidated` | 头与记录数据两个 chunk 校验和都正确 |
| `ConfidenceChunkHeaderOnly` | 头校验和对、数据校验和不对（常见于尾部截断） |
| `ConfidenceChunkUnverified` | 认出了签名/头，但头校验失败 |
| `ConfidenceRecordEnvelope` | 仅按记录签名恢复（chunk 缺失） |

**校验和坏的 chunk 不会被丢弃**，只是置信度降低——因为 carving 现场本来就没有"完好"可言。

统一的返回结构：

```go
type CarvedRecord struct {
    ImageOffset int64 // 记录头在镜像里的偏移
    ChunkOffset int64 // 所属 chunk 偏移，或 -1（record carving）

    EventRecordID uint64
    Timestamp     time.Time

    JSON       []byte   // CarveChunks / CarveChunksLZNT1 填的完整记录 JSON
    Values     []string // 仅 CarveRecordsByMagic：按位置的替换值
    ValueTypes []string // 每个 Values[i] 的线格式类型（如 "UInt16"）
    RawStrings []string // 兜底原始文本（Values 为空时）

    CompressedSourceOffset int64
    CompressedSourceBytes  int

    Confidence Confidence
    Note       string // JSON 为空或置信度被下调时的解释
}
```

`ValueTypes` 是给分析师的一个**弱提示**：比如 `EventID` 几乎总是 `UInt16`，可以借此把某个位置猜成某个字段——但**这只是提示，不是保证**。

### 6.3 CLI

```sh
# 解析 EVTX 文件 / 目录下所有 EVTX → JSON Lines
./evtx -out ./output security.evtx
./evtx -validate-checksums -out ./output C:\logs

# 从原始镜像 carving
./evtx -mode chunks       -out result.jsonl disk.dd
./evtx -mode records      -out result.jsonl disk.dd
./evtx -mode chunks-lznt1 -out result.jsonl disk.dd   # NTFS 压缩卷
```

---

## 七、小结：carving 的价值与边界

把 EVTX carving 提炼成三句话：

1. **它是"文件系统已死"时的最后一根稻草**。当 MFT 被毁、分区表丢失、卷无法挂载，常规解析器无从下手——carving 直接在原始字节里按签名取数。
2. **能还原到什么程度，由格式设计决定**。chunk 在 → 完整命名字段；chunk 没了 → 只有无名的有序值；卷被 LZNT1 压缩 → 必须先做压缩流 carving。理解了 `ElfChnk\x00` / `2A 2A 00 00` / CU 对齐 / LZ77 首字节字面量这几个点，整套方法就顺理成章。
3. **它的工程重点其实是"抗损坏"**：不因单条记录崩溃、坏 chunk 也继续解析、用置信度替代二值判定、双 CRC 独立校验。这恰恰是现有开源工具的普遍短板——也是 `go-evtx-carver` 存在的理由。

对防守方来说，这也是一次提醒：**日志既要防"被清"，也要防"宿主机/镜像被整体加密"**——把关键日志实时外发，比事后 carving 靠谱得多。相关阅读可以对照站内的 [2026 H1 漏洞态势](/security/offensive/2026-h1-vulnerability-landscape)，以及同样是"Go + 安全工具链"的 [GoSentry：Go 模糊测试工具链](/security/offensive/gosentry-go-fuzzing-libafl-toolchain-2026)。

---

## 参考资料

- [Recovering EVTX records: carving techniques — Positive Technologies, Habr（2026-10-08）](https://habr.com/en/companies/pt/articles/1091918/)
- [go-evtx-carver — GitHub (@rayhunt454)](https://github.com/rayhunt454/go-evtx-carver)
- [Windows XML Event Log (EVTX) 格式文档 — libyal/libevtx](https://github.com/libyal/libevtx/blob/main/documentation/Windows%20XML%20Event%20Log%20(EVTX).asciidoc)
- [evtx / evtx_dump — omerbenamram（Rust）](https://github.com/omerbenamram/evtx)
- [Velocidex/evtx — GitHub（Go，Velociraptor 核心）](https://github.com/Velocidex/evtx)
- [EVTXtract — williballenthin（记录级 carving 的另一种思路）](https://github.com/williballenthin/EVTXtract)
- 站内相关：[GoSentry：Go 模糊测试工具链](/security/offensive/gosentry-go-fuzzing-libafl-toolchain-2026)、[2026 H1 漏洞态势](/security/offensive/2026-h1-vulnerability-landscape)
