---
title: Go 官方为函数名吵了两个月：maps.Same 提案正式通过的背后
date: 2026-07-28
tags:
  - golang
  - maps
  - proposal
  - generics
  - standard-library
keywords:
  - maps.Same
  - Go proposal
  - map comparison
  - identity comparison
  - pointer comparison
  - Alan Donovan
  - unsafe.Pointer
  - generic signature
category: dev/backend/golang
description: Go 提案 #78456 正式通过：maps.Same 函数用一条 CMP 指令实现 map 引用同一性判断。从 Identical 到 Same 的两个月命名拉锯、nil 语义陷阱、NaN 边界警告、泛型签名三次收缩、slices.Same 为何被拒——一个三行函数背后的 Go 设计哲学。
recommend: 后端工程
---
# Go 官方为函数名吵了两个月：maps.Same 提案正式通过的背后

## 一个"不该存在的"限制

Go 里的 `map` 是引用类型——它本质上是指向底层哈希表的指针。两个 map 变量如果来自同一次 `make(M)` 调用或同一个字面量 `M{...}`，那么对其中一个的修改，另一个能立刻看到。

但 Go 语言规范偏偏不允许你用 `==` 判断这两个 map 变量是不是指向同一份数据：

```go
func union(x, y map[string]int) map[string]int {
    if x == y { // 编译错误！invalid operation: map can only be compared to nil
        return x
    }
    // ...
}
```

`map`（连同 `slice`、`func`）从一开始就被设计为**不可比较类型**，唯一允许的比较对象是 `nil`。这个限制是为了避免歧义——如果 `x == y` 能编译通过，有人会理解成"比较键值对内容是否相等"，也有人会理解成"比较是不是同一个引用"。Go 选择干脆不让你用 `==`，把混乱扼杀在语法层面。

问题是，**判断"是不是同一个引用"这件事本身是有实际价值的**。

提案作者、Go 团队资深工程师 **Alan Donovan**（《The Go Programming Language》作者）举了一个典型场景：实现 `union(x, y)` 求两个集合的并集时，如果能提前知道 `x` 和 `y` 是同一个 map，就可以直接短路返回，省掉一次深拷贝。

## 提案核心：三行代码，一条 CMP 指令

Donovan 的提案（[issue #78456](https://github.com/golang/go/issues/78456)）非常简洁——在标准库 `maps` 包中加一个函数：

```go
package maps

// Same reports whether two maps refer to the same data structure.
func Same[MX, MY ~map[K]V, K comparable, V any](x MX, y MY) bool {
    type pointer = unsafe.Pointer
    return *(*pointer)(pointer(&x)) == *(*pointer)(pointer(&y))
}
```

原理很直白：把 map 变量的内存表示按指针读出来做比较。因为 map 在运行时本质上就是一个指向 `hmap` 结构体的指针，所以这个操作在编译后会被优化成**一条 `CMP` 指令**，几乎零开销。

虽然内部用了 `unsafe`，但这个函数对外暴露的是一个**完全类型安全、内存安全的接口**——用户不需要接触任何危险操作，标准库替你把"脏活"做了。

在提案之前，开发者被迫这样写：

```go
// 旧方式：笨重且性能差
reflect.ValueOf(x).UnsafePointer() == reflect.ValueOf(y).UnsafePointer()
```

这不仅丑陋，`reflect` 包的调用链还会带来不小的开销——而它做的本来只是一条机器指令的事。

## 四条战线上的拉锯

越是简单的提案，细节上的分歧往往越多。接下来的几个月里，这个函数在四条战线上被反复推敲。

### 战线一：命名之争——"Identical" 还是 "Same"？

第一个火药味十足的问题是命名。函数最初叫 `Identical`。

有社区成员立刻提出担忧：`Identical` 这个名字太容易让人联想到"相等"（Equal），而不是"同一个引用"。他随即抛出了备选方案 `IsAliased` / `Aliased`。

另一个开发者 `rittneje` 类比了标准库里已有的 `os.SameFile`，建议改名为 `maps.Same`。

提案委员会最终给出了详细的分析逻辑：

1. **"Identical" 不够普适**——在现实语言里，"identical twins"（同卵双胞胎）恰恰不是同一个个体
2. **与 `types.Identical` 冲突**——Go 自己的 `go/types` 包里已经有 `types.Identical` 函数，但它比较的是**类型理论意义上的等价性**（两个类型是否结构相同），而不是内存地址是否相同。两个"Identical"放在同一个语言生态里会互相打架
3. **"Same" 更朴素**——歧义更小，也能和已有的 `os.SameFile` 形成命名风格上的呼应

于是，函数正式改名为 `maps.Same`。

这件事让"计算机科学里真正难的只有两件事：缓存失效和给东西起名字"这句经典名言的含金量再次提升。

### 战线二：nil 和 NaN——两个语义陷阱

**nil map 的语义**

按照实现，两个 `nil` map 会被判定为"Same"——它们在内存表示上都是零值指针，指针比较自然相等。

有人质疑这是否合理。Donovan 的回应很干脆：map 本质上就是一种指针，`Same` 就是纯粹的指针比较，所以这个结果是自洽的。

`rittneje` 补充了一个有力的论据：Go 语言本身就允许 `m == nil` 这样的写法。如果 `m == nil` 为真，而 `maps.Same(m, nil)` 却给出相反结论，那才是真正的困惑。这场讨论最终没有推翻既有实现，反而巩固了"Same 就是指针语义"这一设计原则。

**NaN 的陷阱**

这是一个更隐蔽的坑。Donovan 在文档注释里专门加了一段警告：

```go
// Same reports whether two maps refer to the same data structure.
//
// Beware that some shortcuts based on Same(x, y) may have surprising
// behavior for maps containing floating-point NaNs, since NaN != NaN.
// For example, the early return in the union function below causes
// the result of union(s, s), where s is Set{NaN: {}}, to have only
// one element instead of two.
//
//	type Set = map[float64]struct{}
//
//	// union returns the union of two sets.
//	func union(x, y Set) Set {
//		if Same(x, y) {
//			return x
//		}
//		z := make(Set)
//		Copy(z, x)
//		Copy(z, y)
//		return z
//	}
func Same[MX, MY ~map[K]V, K comparable, V any](x MX, y MY) bool {
    type pointer = unsafe.Pointer
    return *(*pointer)(pointer(&x)) == *(*pointer)(pointer(&y))
}
```

问题的核心是：`NaN != NaN`。如果 `s` 是 `Set{NaN: {}}`，调用 `union(s, s)` 时，`Same(x, y)` 判断为真，函数直接返回 `x`——这在逻辑上没问题，因为两者本来就是同一个 map。

但如果开发者错误地把 `Same` 当成"内容相等"的快捷替代（认为"Same 为真就等价于 Equal 为真"），就可能在涉及 `NaN` 的场景里踩坑：两个内容相同但不是同一个引用的 map，即便逐元素比较看起来"相等"，也不能简单地互相替代做优化短路。

**任何基于"Same 蕴含 Equal"的代数捷径在 NaN 面前都是不安全的。**

这段警告的措辞本身也被反复打磨。有人建议删掉举例、只留第一句警告；也有人指出第一版表述不够直观。最终文档保留了完整的警告和例子——对于一个面向所有 Gopher 的标准库函数，宁可啰嗦一点。

### 战线三：泛型签名的三次收缩

签名演化经历了三个版本：

**v1（最初版本）**——两个类型参数，但共享 key 类型：

```go
func Identical[MX ~map[K]VX, MY ~map[K]VY, K comparable, VX, VY any](x MX, y MY) bool
```

**v2**——Donovan 简化为共享 `K` 和 `V`，理由是足以覆盖"调用方持有两个类型参数、但底层类型相同"的场景：

```go
func Same[MX, MY ~map[K]V, K comparable, V any](x MX, y MY) bool
```

**v3（有人提出的更激进版本）**——连 key 类型都不要求一致：

```go
func Same[M1 ~map[K1]V1, M2 ~map[K2]V2, K1, K2 comparable, V1, V2 any](x M1, y M2) bool
```

v3 能覆盖更极端的泛型场景——比如一个通用的 `SetIsEqual` 函数，接受 `map[K]bool` 或 `map[K]struct{}` 作为集合实现，内部想用 `Same` 做快速短路。

但 v3 被委员会明确按下了暂停键。三条理由：

1. **类型越自由，`Same` 和 `==` 的语义距离越远**，用户心智负担越重
2. **砍掉了一道编译期类型检查**——原本"类型不匹配"会在编译期直接报错，现在可能允许开发者不小心写出一个**永远返回 false 的 `Same` 调用**（因为类型压根对不上），这种错误在运行时才会暴露
3. **灵活性需求缺乏证据**——这种灵活性的真实需求来自另一个尚未定案的提案（#77052），在那个提案落地之前，"是否真的需要"本身就缺乏说服力

```go
// v3 的危险：以下代码能编译，但永远返回 false
var m1 map[string]int
var m2 map[int]string
_ = maps.Same(m1, m2) // 类型完全不同，但 v3 允许编译
```

这场讨论透露出 Go 团队一贯的设计取舍：**API 的"能力上限"从来不是越高越好，能在类型系统里做的检查，就不应该推给运行时。**

### 战线四：slices.Same——一个"合理但被拒绝"的跑题

讨论进行到一半，有人自然地联想：既然 map 能加 `Same`，`slices` 包是不是也该加一个？

有人给出了看似可行的实现：

```go
len(s) == len(s2) && &s[0] == &s2[0]
```

但这段代码有两个问题：

1. **空切片 panic**：如果两个切片都是空的，`&s[0]` 会直接越界 panic
2. **语义不确定**：考虑 `x := make([]int, 10); slices.Identical(x, x[:5])`——`x` 和 `x[:5]` 共享同一段底层数组的起始地址，但长度不同，它们算不算"相同"？

```go
x := make([]int, 10)
slices.Identical(x, x[:5])  // 这该返回什么？
```

这个问题没有唯一正确答案，取决于你关心的是"底层数组是否重叠"还是"长度和内容是否完全一致"。

Donovan 的态度很明确：**slice 的"引用相等"是一个复杂得多的问题，值得单独立项，而不是塞进这个提案里。**

原因在于，slice 同时具备值语义（`len`、`cap`）和引用语义（底层数组指针），这两种语义交织在一起会引出诸如"部分重叠算不算相同"、"空切片该怎么判断"等子问题。`slices` 包内部已有一个私有函数 `overlaps` 处理类似逻辑，但它为特定场景做了取舍（比如刻意拒绝把"长度为零但落在另一个切片内部的切片"算作重叠），未必适合抽象成通用 API。

最终，`slices` 相关的讨论被正式排除在本提案范围外——这也是 Go 提案流程的典型自我约束：**一个提案只解决一个明确的问题，哪怕相邻的问题看起来"顺手就能做"。**

## 实际用例

### 用例 1：集合操作短路

```go
package set

import "maps"

type Set[V any] map[string]V

// Union 返回两个集合的并集。
// 如果 x 和 y 是同一个 map，直接返回 x，避免无意义的深拷贝。
func Union[V any](x, y Set[V]) Set[V] {
    if maps.Same(x, y) {
        return x // 短路：同一引用，无需拷贝
    }
    z := make(Set[V], len(x)+len(y))
    maps.Copy(z, x)
    maps.Copy(z, y)
    return z
}
```

### 用例 2：缓存优化

```go
package cache

import "maps"

type Cache struct {
    data map[string][]byte
}

// MergeFrom 将 other 的数据合并到当前缓存。
// 如果两个缓存共享底层数据（例如从同一个缓存派生），跳过合并。
func (c *Cache) MergeFrom(other *Cache) {
    if maps.Same(c.data, other.data) {
        return // 同一底层数据，无需合并
    }
    maps.Copy(c.data, other.data)
}
```

### 用例 3：变更检测

```go
package diff

import "maps"

// Diff 检测两个 map 之间的变更。
// 如果是同一引用，直接返回空 diff。
func Diff[V comparable](old, new map[string]V) (added, removed, changed map[string]V) {
    if maps.Same(old, new) {
        return nil, nil, nil // 同一引用，无变更
    }
    added = make(map[string]V)
    removed = make(map[string]V)
    changed = make(map[string]V)

    for k, v := range new {
        if oldV, ok := old[k]; !ok {
            added[k] = v
        } else if oldV != v {
            changed[k] = v
        }
    }
    for k := range old {
        if _, ok := new[k]; !ok {
            removed[k] = old[k]
        }
    }
    return
}
```

### 用例 4：泛型函数优化

```go
package memo

import "maps"

// Memoize 为函数创建记忆化包装器。
// 利用 maps.Same 检测参数 map 是否同一引用，避免重复计算。
func Memoize[K comparable, V any](
    fn func(map[K]V) V,
) func(map[K]V) V {
    var lastArg map[K]V
    var lastResult V

    return func(arg map[K]V) V {
        if maps.Same(arg, lastArg) {
            return lastResult // 同一引用，返回缓存结果
        }
        lastArg = arg
        lastResult = fn(arg)
        return lastResult
    }
}
```

## 提案历程与最终版本

提案最终由 Go 提案审核组组长 `aclements` 正式宣布 **accepted**。对应的实现 [CL 794421](https://go.dev/cl/794421) 已经提交，进入实现阶段。

最终版本：

```go
// Same reports whether two maps refer to the same data structure.
//
// Beware that some shortcuts based on Same(x, y) may have surprising
// behavior for maps containing floating-point NaNs, since NaN != NaN.
// For example, the early return in the union function below causes
// the result of union(s, s), where s is Set{NaN: {}}, to have only
// one element instead of two.
//
//	type Set = map[float64]struct{}
//
//	// union returns the union of two sets.
//	func union(x, y Set) Set {
//		if Same(x, y) {
//			return x
//		}
//		z := make(Set)
//		Copy(z, x)
//		Copy(z, y)
//		return z
//	}
func Same[MX, MY ~map[K]V, K comparable, V any](x MX, y MY) bool {
    // Maps in Go are references yet the core language
    // provides no safe way to ask whether they alias.
    type pointer = unsafe.Pointer
    return *(*pointer)(pointer(&x)) == *(*pointer)(pointer(&y))
}
```

## 设计哲学的启示

一个函数体只有一行核心逻辑的提案，硬是花了几个月时间、40 多条评论，在命名、nil、NaN、泛型签名四条战线上被反复推敲。

这在一些人看来或许是"小题大做"，但恰恰是这种近乎苛刻的审慎，撑起了 Go 标准库一贯的稳定性口碑——**一旦某个函数、某个签名进了标准库，就意味着要向后兼容几十年。**

比起"先上线再迭代"，Go 团队显然更倾向于"想清楚了再落笔"。

### Go 提案流程的关键特征

| 特征 | 表现 |
|---|---|
| 公开讨论 | 所有提案在 GitHub issue 上公开讨论 |
| 委员会审查 | 每周提案审核会议 |
| 命名严格 | `Identical` vs `Same` 的争论持续数周 |
| 边界穷尽 | nil、NaN、空 map 全部考虑 |
| 范围克制 | slices.Same 被明确排除 |
| 签名保守 | v3 更灵活的版本被拒绝 |
| 向后兼容 | 一旦接受，几十年不变 |

### 对比其他语言的类似决策

| 语言 | 引用同一性判断方式 | 特点 |
|---|---|---|
| Go | `maps.Same`（提案中） | 标准库提供，类型安全，零开销 |
| Java | `==` 对引用类型直接比较 | 语言层面支持 |
| Python | `id(x) == id(y)` 或 `x is y` | 语言层面支持 |
| Rust | `ptr::eq(&x, &y)` 或 `Arc::ptr_eq` | unsafe 边界明确 |
| C++ | `&x == &y` | 直接指针比较 |

Go 的情况比较特殊：map 是引用类型但不允许 `==`，所以需要标准库提供一个"绕过语言限制"的安全出口。`maps.Same` 就是这个出口。

## 与 Go 1.28 的关系

`maps.Same` 的实现 CL 已提交但尚未指定目标版本。考虑到 Go 1.28 开发周期刚刚启动（2026 年 7 月底 tree reopen），如果合并顺利，`maps.Same` 有望在 Go 1.28 中首次发布。

这将为 Go 1.28 的标准库新增一个看似微小但影响深远的功能——过去需要 `reflect + unsafe` 才能实现的 map 引用同一性判断，终于有了一个安全、高效的标准库一等公民。

## 参考资料

- [提案原文: golang/go#78456](https://github.com/golang/go/issues/78456)
- [实现 CL 794421](https://go.dev/cl/794421)
- [Tony Bai: maps.Same 提案深度解读](https://tonybai.com/2026/07/17/go-maps-same-proposal-accepted)
- [Go 提案流程说明](https://go.dev/s/proposal-status)
- [Go 1.28 路线图预览](https://www.besthub.dev/articles/go-1-28-roadmap-revealed-will-cgo-drop-the-c-toolchain-are-generic-containers-joining-the-stdlib-ad20a8d686c0)
