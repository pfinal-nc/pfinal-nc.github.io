---
title: "Go 1.28 database/sql 快路径深拆：int64→int 不再\"格式化成字符串再解析回来\""
date: 2026-09-17
tags:
  - golang
  - Go性能优化
  - database
  - 源码解析
keywords:
  - Go 1.28
  - database/sql
  - convertAssignRows
  - Scan 性能
  - 反射优化
category: golang
description: "Go 1.28 开发周期为 database/sql convertAssignRows 新增 int64/float64/bool 快路径：int64 扫描到 int 不再走十进制字符串往返，Int64ToInt 基准提升 95.7% 且零分配。本文拆解旧路径为何慢、新快路径的实现取舍与生产影响。"
author: PFinal南丞
recommend: golang
---

# Go 1.28 database/sql 快路径深拆：int64→int 不再"格式化成字符串再解析回来"

> 2026 年 8 月 19 日，CL 808780 合入 Go 主干（issue #80671，PR #80672）：`database/sql` 的 `convertAssignRows` 为 int64 和 float64 增加了精确类型快路径。这是 Go 1.28 开发周期里投入产出比最高的一个提交——改动只有几十行，却把 Go 服务端最常见的一类数据库扫描操作从 ~53ns/1 alloc 压到 ~2.3ns/0 alloc。本文拆解它为什么值得单独写一篇文章。

## 问题：最常见的扫描路径反而最慢

先看一段所有 Go 后端工程师都写过的代码：

```go
type User struct {
    ID   int
    Name string
    Age  int
}

rows, _ := db.Query("SELECT id, name, age FROM users")
for rows.Next() {
    var u User
    // 驱动返回的是 int64（canonical 类型），
    // Scan 需要把 int64 转成 User.ID 的 int
    rows.Scan(&u.ID, &u.Name, &u.Age)
}
```

注意一个容易被忽略的事实：**所有 SQL 驱动返回给 `database/sql` 的整数值都是 `int64`**。这是 `driver.Value` 的六个规范类型之一（int64、float64、bool、[]byte、string、time.Time）——驱动的职责就是把数据库自己的整数类型统一收敛到 int64。而业务代码里的结构体字段用的是 `int`、`int32` 甚至 `float64`。

于是每一次 `rows.Scan()` 都要完成一次 int64 → int 的类型转换。这个转换发生在 `database/sql/convert.go` 的 `convertAssignRows()` 里，它是 `Scan` 的核心转换函数。

在 Go 1.27 及之前，`convertAssignRows` 的源类型分派长这样（简化自当前源码）：

```go
func convertAssignRows(dest, src any, rows *Rows) error {
    // 常见情况：不走反射
    switch s := src.(type) {
    case string:  // string 快路径：*string/*[]byte/*RawBytes 直写
    case []byte:  // []byte 快路径
    case time.Time: // time.Time 快路径
    // ... decimal、nil、driver.Rows
    }
    // ↑ 注意：没有 int64、float64、bool！

    var sv reflect.Value
    switch d := dest.(type) {
    case *string: // 数字 → string 走 asString
    case *bool:   // 走 driver.Bool.ConvertValue
    // ...
    }
    // 兜底：完整的反射处理
    dpv := reflect.ValueOf(dest)
    // ... 反射逐 Kind 转换
}
```

源类型 type switch 里有 string、[]byte、time.Time 的快路径，但 `driver.Value` 六个规范类型中的另外三个——**int64、float64、bool——全部落到反射兜底**。issue #80671 给出了三个典型路径的真实开销（Apple M2 Pro / arm64）：

| 转换路径 | 旧行为 | 开销 |
| --- | --- | --- |
| int64 → *int64 | 反射逐 Kind 匹配 | ~17ns |
| int64 → *int | 反射兜底 → **十进制字符串往返** | ~52ns，16B，1 alloc |
| bool → *bool | `driver.Bool.ConvertValue` | ~4.7ns |
| NullInt64 等 | 经 `Scanner.Scan` 继承慢路径 | 同上 |

最扎眼的是第二行。int64 → int 的反射兜底居然走了一条**十进制字符串往返**：`strconv.FormatInt` 把数字格式化成字符串，再 `strconv.ParseInt` 解析回来。任何 ≥ 100 的值都会触发一次堆分配（16B，1 alloc）。

为什么是最常见的转换反而最慢？历史原因：string/[]byte/time.Time 的快路径是当年写 `convertAssignRows` 时顺手加上的（这三个恰好也是 dest 侧最常需要拷贝语义的类型），而 int64/float64/bool 的快路径提案（CL 622598，2024 年由 Charlie Vieth 提出）因为审查时被要求补充基准数据而搁置了两年——**没有 benchmark 的性能优化 PR 在 Go 标准库里活不下去**，这本身就是个值得记住的工程文化细节。

## 修复：精确类型匹配的快路径

CL 808780 的方案非常克制——在源类型 type switch 里补上 int64 和 float64 两个 case，目标类型精确匹配时直接赋值：

```go
case int64:
    switch d := dest.(type) {
    case *int64:
        if d == nil { return errNilPtr }
        *d = s          // 精确匹配：直接赋值
        return nil
    case *int:
        if d == nil { return errNilPtr }
        // 32 位平台可能溢出：溢出时回退到旧转换路径，
        // 保证错误信息（integer overflow）不变
        if !strconv.IntSize.is32() || s <= math.MaxInt32 && s >= math.MinInt32 {
            *d = int(s)
            return nil
        }
    case *NullInt64:
        // ... Null 类型同样直写
    }
case float64:
    switch d := dest.(type) {
    case *float64:
        *d = s
        return nil
    }
```

三个设计取舍值得注意：

1. **只匹配精确类型**。type switch 匹配的是 `*int64` 而不是 `~int64` 约束下的命名类型——`type UserID int64` 这类自定义类型不受影响，仍走原有路径。这保证了行为零变化，不会出现"命名类型的 Scan 突然语义不同"的坑；
2. **`*int` 分支处理 32 位溢出**。在 32 位平台上 int 是 32 位，int64 的值可能放不下。快路径先做范围检查，溢出则回退到旧转换，连错误文本都保持一致——性能优化不允许改变可观测行为；
3. **Scanner 目标不介入**。实现了 `sql.Scanner` 接口的目标类型继续走接口分发，快路径只接管纯数字赋值。

## 基准数据：-95.7% 是怎么来的

PR 附带的完整基准（goos: darwin / goarch: arm64 / Apple M2 Pro，n=25）：

| Benchmark | 旧 (ns/op) | 新 (ns/op) | 变化 |
| --- | --- | --- | --- |
| Int64ToInt64 | 16.87 | 2.415 | **-85.7%** |
| Int64ToInt | 52.99 | 2.268 | **-95.7%** |
| Int64ToNullInt64 | 24.15 | 7.815 | -67.6% |
| Float64ToFloat64 | 16.90 | 2.256 | **-86.7%** |
| BoolToBool | 4.82 | 2.260 | -53.1% |
| Int64ToAny（interface{} 目标） | 4.20 | 3.009 | -28.4% |
| Int64ToInt32 | 45.93 | 44.04 | -4.1%（未命中快路径） |
| **全部用例 geomean** | **11.03** | **5.837** | **-47.1%** |

分配维度上，唯一的变化是 Int64ToInt 从 16B/1alloc 降到 **0B/0alloc**，其余用例本就不分配。

两个细节解释数字背后的原理：

- **为什么 Int64ToNullInt64 还有 7.8ns**：`NullInt64` 实现了 `Scanner` 接口，它的 `Scan` 方法内部要设置 `Valid` 字段并处理 nil 判断，快路径只能把控制权更快地交到它手上，不能替它完成工作；
- **为什么 Int64ToInt32 几乎没变**：`*int32` 不是精确匹配目标（PR 只加了 *int64/*int/*float64 三个 dest），仍走反射路径。这是有意的取舍——再扩 dest 类型列表就要开始权衡枚举爆炸和收益边际了。

## 对生产服务的实际影响

单次 50ns 看起来微不足道，但把这个数字放进真实负载里算一下：

```go
// 典型场景：每行 3 个整数列（ID、状态码、计数），
// QPS 10k、平均每查询 100 行
// 旧：100 行 × 3 列 × ~52ns ≈ 15.6μs 纯转换开销/查询
//     其中每行 3 次堆分配 → GC 压力随扫描量线性增长
// 新：100 行 × 3 列 × ~2.3ns ≈ 0.7μs，0 分配
```

转换开销本身降一个数量级，但更值钱的是**分配归零**：扫描密集型服务（分页列表、报表导出、ETL 拉取）的 GC 频率会随扫描行数线性下降。这类"隐藏在热路径上的小分配"正是 Go 服务 P99 抖动的常见来源——和之前写过的 [Go 1.28 PGO 默认开启](/dev/backend/golang/go-1-28-pgo-default-on-production-2026)、[分片计数器](/dev/backend/golang/go-1-28-sharded-counters-cache-line-contention-2026) 属于同一条主线：**运行时和标准库在把"你要靠自己在应用层绕过的坑"逐个填平**。

需要注意：这个优化对 ORM 用户（GORM、sqlx 的 struct 扫描）同样生效——它们最终都汇入 `rows.Scan` → `convertAssignRows`，但 ORM 自己还有一层反射开销，快路径只是消除了标准库这一段。

## 上手复测

升级到 Go 1.28 开发版（或发布后的 1.28.0）后，可以自己跑一遍官方基准验证：

```go
// convert_bench_test.go（节选自标准库测试）
package sql_test

import (
    "database/sql"
    "testing"
)

func BenchmarkConvertAssignRows(b *testing.B) {
    var i64 int64 = 42
    var i int
    b.Run("Int64ToInt", func(b *testing.B) {
        for b.Loop() {
            if err := sql.ConvertAssign(&i, i64); err != nil {
                b.Fatal(err)
            }
        }
    })
}
```

```bash
go test -bench ConvertAssignRows -benchmem ./database/sql/
```

顺便用 `-allocs` flag 确认 Int64ToInt 路径的 allocs 为 0。

## Go 1.28 开发周期其他值得关注的提交

同一批（8 月中旬，43 个提交横跨 5 个仓库）里还有几个和本文同主题（热路径打磨）的改动：

- **net/http 修复 1xx 与 100-Continue 竞态**：handler 并发写 1xx 状态码与读取 body 时，可能把 garbled 响应发给客户端。跑 HTTP/1 长连接服务的值得升级验证；
- **riscv64 获得 `sync/atomic` And/Or 内联规则**，削减函数调用开销——SIMD/原子操作跨平台补齐的延续（Go 1.26 的 AMD64 SIMD、1.27 的 ARM64/Wasm 之后，riscv64 也开始吃 intrinsic 红利）；
- **gomobile 直接调用 NDK Clang**，绕过 Windows 8191 字符命令行长度限制导致的 Android c-shared 链接失败；
- **encoding/json/v2 教程转正**为独立文档，json/v2 迁移资料链补齐。

## 小结

`convertAssignRows` 快路径是标准库性能工作的一个教科书案例：不新增 API、不改语义、只把"数据已经就在手边却还要绕路反射和字符串"的浪费消除掉。它的历史也很有启发——2024 年的 PR 因为缺 benchmark 停摆两年，最终靠 issue 补齐数据和基准才落地。**性能优化的可辩护性来自测量**，这句话对标准库贡献者和业务开发者同样成立。

## 参考资料

- [Issue #80671：scanning an int64 into an int converts through a decimal string](https://go.dev/issue/80671)
- [PR #80672：database/sql: add int64 and float64 fast paths to convertAssignRows](https://github.com/golang/go/pull/80672)
- [CL 808780（已合入）](https://go-review.googlesource.com/c/go/+/808780)
- [database/sql/convert.go 源码](https://cs.opensource.google/go/go/+/master:src/database/sql/convert.go)
- [Go 1.28 开发周期动态（RepoJournal）](https://repojournal.com/showcase/golang/2026-08-20/go-1-28-release-notes-go-live-as-database-sql-doubles-down-on-speed)
- 本站相关：[Go database/sql 实战：连接池与生产级最佳实践](/dev/backend/golang/go-database-sql)、[Go 性能优化实战：从 pprof 到内存管理](/dev/backend/golang/go-performance-optimization)
