---
title: "Go 1.28 泛型容器伞形提案 #80590 深度解读：6 个子提案、binary method problem 与工程取舍"
date: "2026-08-03"
tags:
  - golang
  - go-1-28
  - generics
  - stdlib
  - collections
  - proposal
keywords:
  - Go 1.28 泛型容器
  - issue 80590
  - Go Collections working group
  - container/set
  - container/hash
  - container/ordered
  - container/heap/v2
  - container/mapset
  - binary method problem
  - F-bounded polymorphism
category: dev/backend/golang
description: 2026-07-28，Go Collections working group 7 位核心贡献者在 GitHub issue #80590 抛出泛型容器伞形提案，目标 Go 1.28。本文基于 issue 原文与社区解读，逐一拆解 6 个新子提案（hash.Map/hash.Set/set.Set/ordered.Map/heap/v2/mapset）、binary method problem 与 F-bounded polymorphism 抽象接口设计、set.Set 透明表示为 map[T]struct{} 的工程取舍、heap/v2 重命名与索引追踪机制，以及 #80194 insertion-ordered hash map 与 Stack 的 future 计划。所有提案目前均为 Open 状态，尚未接受。
---

# Go 1.28 泛型容器伞形提案 #80590 深度解读：6 个子提案、binary method problem 与工程取舍

## 引言：一份"伞形提案"，不是一份"已发布特性"

2026 年 7 月 28 日，Alan Donovan（`@adonovan`）在 `golang/go` 仓库打开了 [issue #80590](https://github.com/golang/go/issues/80590)——**proposal: container/...: generic collection types**。这份 issue 不是单一提案，而是一份**伞形提案（umbrella proposal）**：它把一组相互关联的子提案汇总在一个 issue 下讨论，每个子 proposal 仍然各自走标准的 Go 提案评审流程。

issue 头部列出的 **Go Collections working group** 七位成员（按姓氏字母序）：

- Jonathan Amsterdam（`@jba`）
- Alan Donovan（`@adonovan`，issue 作者）
- Robert Griesemer（`@griesemer`）
- Daniel Martí（`@mvdan`）
- Roger Peppe（`@rogpeppe`）
- Keith Randall（`@khr`）
- Ian Lance Taylor（`@ianlancetaylor`）

working group 在 2025 年底成立，目标是"以 Go 一贯的务实与简洁风格，把常见的集合数据结构带进标准库"。经过约 8 个月内部讨论，2026-07-28 把成果公开。

**关键事实先讲清楚**：

- 这是**提案**，不是**已发布特性**。所有子 proposal 目前**全部 Open，尚未接受**。
- issue milestone 标的是 **Go 1.28**——这是**目标**，不是承诺。Go 1.28 按半年节奏预计 2027 年初 GA，期间任何子 proposal 都可能在 review 中被修改、推迟或拒绝。
- 真正已经在稳定 release 里的是 **`hash/maphash.Hasher`**（issue #70471，CL 657296），它随 **Go 1.27** 发布，是后面 1.28 容器家族的基础设施。
- 1.28 周期内**新增**的子 proposal 共 **6 个**（不是 7 个，也不是 8 个）。

本文基于 #80590 issue 原文、TonyBai 的两篇深度解读（[2026-07-29 伞形提案](https://tonybai.com/2026/07/29/go-1-28-generic-collections-proposal)、[2026-02-04 heap/v2 解析](https://tonybai.com/2026/02/04/goodbye-container-heap-go-generic-heap-heap-v2-proposal/)）以及 [PeopleAreGeek](https://peoplearegeek.com/articles/go-container-generic-collections-1-28) 的英文分析整理。任何与 issue 原文不一致的描述，以 issue 原文为准。

## 一、问题背景：Go 集合的"十国八制"

Go 标准库历史上几乎不提供集合类型。除了内置的 slice 和 map，正式的容器包只有 `container/heap`、`container/list`、`container/ring` 三个，全部基于 `interface{}`，泛型化迟迟未做。

最典型的痛点是**集合（Set）**。Go 社区写 set 至少有三种主流写法：

```go
// 写法 A：map[T]bool
seen := map[string]bool{}
seen["friday-go"] = true
if seen["friday-go"] { /* ... */ }

// 写法 B：map[T]struct{}
visited := map[string]struct{}{}
visited["a"] = struct{}{}
if _, ok := visited["a"]; ok { /* ... */ }

// 写法 C：第三方库
import "github.com/deckarep/golang-set"
s := mapset.NewSet[string]()
```

A 和 B 的零值语义、JSON 序列化、`struct` tag 行为都不一样，混用必出 bug。A 还有更隐蔽的陷阱：`map[T]bool` 里一个 key 的 value 是 `false` 时，与"key 不存在"在 `if m[k]` 这种 boolean context 下会被误判——这就是 #69230 提案里强调的"avoid ambiguity about potential false values in a `map[T]bool`"。

**有序映射（ordered map）** 同样缺位。Go 内置 map 的迭代顺序**故意随机化**（从 Go 1.0 起），目的是防止开发者依赖顺序。但有些场景确实需要按插入顺序或按键排序迭代：LRU 缓存、配置项顺序保留、消息流记录。社区的做法是"先建 `map[K]V`，再 `sort.Slice(keys)`"——这在大多数场景够用，但**范围查询**（如"取 ID 在 1000-2000 之间的所有用户"）必须遍历整个 map，性能退化到 O(n)。

**堆（heap）** 的痛点更直接。`container/heap` 要求用户实现 5 个方法的 `heap.Interface`（`Len`、`Less`、`Swap`、`Push`、`Pop`），而且 `Push(any)` / `Pop() any` 强制装箱——向堆里插一个 `int` 都要在堆上分配内存。TonyBai 在 [heap/v2 解析](https://tonybai.com/2026/02/04/goodbye-container-heap-go-generic-heap-heap-v2-proposal/) 里贴的 benchmark 显示，泛型版相比老版**分配次数减少约 99%**。

Go 1.18 引入泛型、1.23 引入迭代器（`iter.Seq` / `iter.Seq2`）之后，库定义的类型在人体工学上已经可以与内置 slice/map 媲美。working group 的判断是：**基础设施已经就位，可以系统补课了**。

## 二、#80590 的 6 个新子提案 + 1 个已发布基础设施

issue 原文列出的"proposed additions"如下表。**只有前 1 个已发布**，后 6 个才是 1.28 周期内新增的 proposal。

| Issue | CL | 包路径 | 状态 | 说明 |
| --- | --- | --- | --- | --- |
| [#70471](https://github.com/golang/go/issues/70471) | CL 657296 | `hash/maphash.Hasher` | **已发布（Go 1.27）** | 自定义哈希与等价关系的标准接口，1.28 容器家族的基础设施 |
| [#69559](https://github.com/golang/go/issues/69559) | CL 612217 | `container/hash.Map[K,V]` | Open | 用 `Hasher` 的哈希 Map，支持非 comparable key |
| [#80584](https://github.com/golang/go/issues/80584) | CL 741160 | `container/hash.Set[T]` | Open | 用 `Hasher` 的哈希 Set |
| [#69230](https://github.com/golang/go/issues/69230) | CL 745441 | `container/set.Set[T]` | Open | canonical set，透明表示为 `map[T]struct{}` |
| [#77052](https://github.com/golang/go/issues/77052) | CL 724420 | `container/mapset` | Open | 给 legacy `map[T]bool` 的函数式兼容 shim |
| [#60630](https://github.com/golang/go/issues/60630) | — | `container/ordered.Map[K,V]` | Open | 平衡二叉树实现的有序映射 |
| [#77397](https://github.com/golang/go/issues/77397) | — | `container/heap/v2.Heap` | Open | 泛型堆，替代老 `container/heap` |

issue 原文还提到 working group **未来计划**评估的两项（**不在 1.28 这批里**）：

- [#80194](https://github.com/golang/go/issues/80194) — **insertion-ordered hash maps**：在 `container/hash` 同一个包上增加一个"按插入顺序迭代"的选项，**不是独立新包**。jba 在 issue 评论里明确说"stdlib 不会变成 Java 那样一坨 map 变体"。
- **Stack** — 泛型栈，尚未提交 issue。

下面逐个拆 6 个新子提案。

## 三、`hash/maphash.Hasher`：基础设施（已在 1.27）

这一项严格说不属于"1.28 新增"，但它是 1.28 容器家族的地基，必须先讲。

`Hasher[T]` 是一个标准接口，让集合类型可以接受**自定义哈希函数和等价关系**——这与 `map[K]V` 编译器内置的哈希不同。两个核心场景：

1. **key 类型不可比较**：比如 key 是 `[]byte` 或 `map[string]int`，无法直接用作 `map[K]V` 的 key。
2. **默认比较语义不对**：比如 `go/types.Type` 的 `==` 是指针比较，但实际需要的是 `types.Identical` 深比较。

接口形状（来自 issue 原文）：

```go
type Hasher[T any] interface {
    Hash(hash *maphash.Hash, value T)
    Equal(T, T) bool
}

type ComparableHasher[T comparable] interface {
    Hasher[T]
}
```

经典用例：**大小写不敏感的字符串集合**。你的 `Hash` 实现里先把字符串小写化再写入哈希，`Equal` 里两边都小写化再比较——`container/hash` 就能基于这套语义建 set/map，**集合类型本身不需要知道你的语义规则**。

issue 文档里附了一个 Bloom filter 的示例。Go 1.27 已经可用，`go.mod` 指向 1.27+ 即可直接 `import "hash/maphash"`。**这是整套 1.28 容器提案能现在抛出来的前提**——没有 `Hasher`，`container/hash.Map` 和 `container/hash.Set` 都得各自重新发明哈希约定。

## 四、`container/hash.Map` 与 `container/hash.Set`：自定义哈希的集合

[#69559](https://github.com/golang/go/issues/69559) 的 `container/hash.Map[K,V]` 和 [#80584](https://github.com/golang/go/issues/80584) 的 `container/hash.Set[T]` 是一对孪生提案。两者都用 `maphash.Hasher` 替代编译器内置的哈希，从而支持：

- key 类型为 `[]byte`、`map[string]int` 等非 comparable 类型
- 自定义等价关系（大小写不敏感、深比较、跨字段 hash 等）

**关键设计取舍**：`hash.Map` 不是 `map[K]V` 的替代品，而是补充。issue 原文明确："For the purposes of the original proposal, `hash.Map[K, V]` is expected to be used only when `map[K]V` is impossible due to K not being usefully comparable." 通用库函数应该优先用 `map[K]V`，**只有当 key 类型无法比较时才用 `hash.Map`**。这个规则简单清晰，避免社区陷入"两种 map 该用哪个"的纠结。

#80194 的讨论里进一步强化了这个立场：jba 在评论中说"I don't see the stdlib containing a lot of variants of maps—it won't become like Java"。**stdlib 不会变成 Java Collections Framework 那样 50+ 子接口**。

## 五、`container/set.Set[T]`：canonical set

[#69230](https://github.com/golang/go/issues/69230) 是整套提案里最受关注的一个。核心设计有三点：

### 5.1 透明表示为 `map[T]struct{}`

`set.Set[T]` 的底层类型**就是 `map[T]struct{}`**，且这个事实**公开透明**。这意味着：

```go
var s set.Set[string] = set.Set[string]{"a": {}, "b": {}}

// 直接用内置语法
len(s)              // 2
for v := range s {  // 内置 range 迭代
    fmt.Println(v)
}
_, ok := s["a"]     // 直接元素访问
```

不需要 `s.Len()`、`s.Each()`、`s.Contains()` 这种方法——内置 `len`、`range`、map access 全部可用。这是 working group 刻意的取舍：**透明表示换来了与内置 map 一致的人体工学**，代价是底层实现**永远不能换**（一旦发布，`map[T]struct{}` 就是 ABI 的一部分）。

PeopleAreGeek 的分析说得很到位："A set that is defined as `map[E]struct{}` supports `len(set)`, direct element access and range iteration using the built in syntax, rather than requiring a method for each. That is the ergonomic gap generics alone did not close."

### 5.2 set 操作：functional + mutating 双 API

`set.Set` 同时提供两种风格的集合代数 API：

- **functional**：`Union(other) Set`、`Intersection(other) Set`、`Difference(other) Set` 返回新集合
- **mutating**：`UnionWith(other)`、`IntersectionWith(other)`、`DifferenceWith(other)` 修改 receiver，无返回值

这个双 API 模式参考了 `math/big.Int`——避免调用方被迫为了一个 union 多分配一次内存。issue 原文："Pure-functional collection operations return new collections, while their in-place variants modify the left operand and return no value. This mirrors the approach taken in `math/big.Int` to prevent accidental misuse."

### 5.3 mutation 方法返回 "是否改变 size"

`Add`、`Delete` 等方法**返回 `bool`**，表示是否真的改变了集合大小。这样调用方可以直接写：

```go
if s.Add(x) {
    // 第一次插入，做后续逻辑
}
```

避免"先 `Contains` 再 `Add`"的双查询模式。besthub.dev 的总结："Mutation methods report whether they changed the size of the collection. That is the difference between `s.Add(x)` as a statement and `if s.Add(x) { ... }` as a deduplication check."

### 5.4 不在核心接口里的操作

- **`Subset`** 不在核心 Set 接口里——因为它是 O(n) 操作，没有渐近优势，用户可以用现有原语组合。
- **`Map.Equal`** 不存在——因为 map 的 value 可能 incomparable。但 `Set.Equal` 存在（set 的元素一定 comparable）。
- **`DeleteFunc`** 保留给 `ordered.Map`，因为有序 map 的条件删除期望保持 O(log n)。

## 六、`container/mapset`：给 `map[T]bool` 的兼容 shim

[#77052](https://github.com/golang/go/issues/77052) 解决的是**存量代码的迁移问题**。很多老 Go 项目的 set 写法是 `map[T]bool`，公开 API 已经固化、无法改类型。`container/mapset` 提供一组**函数式 helper**，直接操作 `map[T]bool`，语义与 `set.Set` 的方法**完全平行**：

```go
// 老代码不动
tags := map[string]bool{"a": true, "b": true}

// 用 mapset 操作
if mapset.Contains(tags, "a") { /* ... */ }
diff := mapset.Difference(tagsA, tagsB)   // 返回新的 map[T]bool
```

issue 原文："a package of helper functions (Union, Intersection, and so on) for conveniently manipulating legacy sets as sets in existing code whose API cannot be changed. These functions are exactly parallel to the methods of `set.Set`."

**设计哲学**：`set.Set` 面向新代码，`mapset` 面向老代码。两者底层互不依赖，`mapset` 完全由 map 运算组合而成。**没有任何强制迁移路径**——working group 没有提及任何 `go fix` 自动转换工具（网络上流传的"`go fix` 自动改写"说法没有 issue 依据，不要轻信）。

## 七、`container/ordered.Map[K,V]`：平衡二叉树有序映射

[#60630](https://github.com/golang/go/issues/60630) 提供**按键排序**的有序映射。issue 原文明确："The current implementation uses a balanced binary tree, but nothing in the design requires that."

**与"建 map 再 sort keys"的区别**：常见的 Go 模式是 `m := map[K]V{}; keys := slices.Sorted(maps.Keys(m))`，这在大多数场景够用。但**范围查询**（"取 ID 在 [1000, 2000) 之间的所有 entry"）在普通 map 上必须遍历全部，O(n)。`ordered.Map` 基于平衡二叉树，范围查询是 O(log n + k)（k 是结果集大小），这是普通 map 做不到的。

**与 #80194 insertion-ordered hash map 的区别**：

| 维度 | `ordered.Map`（#60630） | `hash` insertion-ordered（#80194） |
| --- | --- | --- |
| 数据结构 | 平衡二叉树 | 哈希表 + 链表 |
| 排序语义 | 按 key 排序 | 按插入顺序 |
| 范围查询 | O(log n + k) | 不支持 |
| 单点查询 | O(log n) | O(1) 平均 |
| 状态 | 1.28 proposal | 评估中，不在 1.28 这批 |

**适用场景**：需要范围查询、按键有序迭代的代码。**不适用**：高频单点查询（用 `map[K]V`）、需要插入顺序（等 #80194 或用第三方 `orderedmap`）。

## 八、`container/heap/v2.Heap`：泛型堆的重写

[#77397](https://github.com/golang/go/issues/77397) 是这套提案里**已有独立深度解析**的一个——TonyBai 在 2026-02-04 就写过 [heap/v2 提案解析](https://tonybai.com/2026/02/04/goodbye-container-heap-go-generic-heap-heap-v2-proposal/)，比伞形提案早 5 个月。

### 8.1 核心 API

```go
package heap  // import "container/heap/v2"

type Heap[T any] struct { /* ... */ }

func New[T any](compare func(a, b T) int) *Heap[T]

func (h *Heap[T]) Min() T          // peek 最小值
func (h *Heap[T]) TakeMin() T      // 取出并删除最小值
func (h *Heap[T]) Insert(v T)      // 插入元素
func (h *Heap[T]) Len() int
func (h *Heap[T]) Clear()
func (h *Heap[T]) All() iter.Seq[T]  // Go 1.23+ 迭代器
```

### 8.2 命名重写：告别"猜谜游戏"

老 `container/heap` 的 `Push`/`Pop` 既是接口方法又是包函数，新手必糊涂。v2 的重命名：

| 老名字 | 新名字 | 改进点 |
| --- | --- | --- |
| `Push` | `Insert` | 语义明确，不和接口方法冲突 |
| `Pop` | `TakeMin` | 明确是"取最小值"，不是随便弹一个 |
| `Fix` | `Changed` | 表达"元素值变了，请重新调整" |
| `Remove` | `Delete` | 和内置 `delete` 风格一致 |

### 8.3 索引追踪：解决"动态优先级"难题

任务优先级变了，怎么快速调整它在堆中的位置？老方案要用户自己维护 `index` 字段并在 `Swap` 时同步更新——容易出 bug。v2 提供 `NewIndexed` + `SetIndex` 回调：

```go
type Task struct {
    priority int
    index    int  // 由堆自动维护
}

func (t *Task) SetIndex(i int) { t.index = i }

h := heap.NewIndexed(
    func(a, b *Task) int { return cmp.Compare(b.priority, a.priority) },
    (*Task).SetIndex,
)

// 优先级变化后，一行代码调整位置
task.priority++
h.Changed(task.index)  // 自动 sift-up/down
```

### 8.4 设计取舍：不提供 `Heap[cmp.Ordered]` 特化

working group 调研发现，生产代码中**自定义比较逻辑占绝大多数**，强制 `Ordered` 反而限制灵活性。而且编译器目前无法对泛型比较函数做 monomorphization 优化，"为优化而优化"得不偿失。最终只提供 `New(compare func)` 一种构造方式。

### 8.5 性能：boxing 削减约 99% 分配

老版 `Push(any)` 接受 `interface{}`，每次插入 `int` 都要装箱（在堆上分配小内存块）。泛型版编译期实例化，无装箱开销。TonyBai 引用的 benchmark 显示**分配次数减少约 99%**，对 GC 压力的改善在大规模数据场景非常显著。

## 九、binary method problem 与 F-bounded polymorphism

#80590 最有技术深度的一段是关于**抽象集合接口**的讨论。问题叫 **binary method problem**：

> 如果每个 set 类型 `S` 都有 `func (S) Union(S) S` 方法，那么不同 set 类型的 `Union` 方法签名互不兼容——它们没有共同的普通 interface。

解决方法是 **F-bounded polymorphism**（递归约束接口）。CL 761460 在 `container` 包里加了三个**非导出**的约束接口：

```go
// _AbstractCollection 模拟元素类型 E 的集合 C
type _AbstractCollection[E any, C _AbstractCollection[E, C]] interface {
    Clear()
    Clone() C
    Contains(E) bool
    ContainsAll(iter.Seq[E]) bool
    Len() int
    String() string
}

// _AbstractMap 模拟从 K 到 V 的映射 M
type _AbstractMap[K, V any, M _AbstractMap[K, V, M]] interface {
    _AbstractCollection[K, M]
    All() iter.Seq2[K, V]
    At(K) V
    Delete(K) (V, bool)
    DeleteAll(iter.Seq[K]) bool
    DeleteFunc(func(K, V) bool) bool
    Get(K) (V, bool)
    Keys() iter.Seq[K]
    Set(K, V) (V, bool)
    SetAll(iter.Seq2[K, V])
}
```

**为什么是非导出（`_` 前缀）？** working group 的态度是：先在内部用这套接口保证各容器实现的一致性、用测试覆盖，**但不急于公开**。issue 原文："The interfaces are deliberately unexported; they serve to guarantee conformance in tests." 这是非常 Go 风格的克制——**先观察真实使用模式，再决定哪些操作该进标准接口**。

issue 还给了一个"最小接口"示例，展示如何用更小的约束写通用算法：

```go
type _TakeSet[E any, S _TakeSet[E, S]] interface {
    All() iter.Seq[E]
    Delete(E) bool
}

func Take[S _TakeSet[E, S], E any](set S) (e E, found bool) {
    for e = range set.All() {
        found = true
        set.Delete(e)
        break
    }
    return
}
```

`Take` 函数能从任何满足 `_TakeSet` 约束的集合类型里取出任意一个元素——不管底层是 `set.Set`、`hash.Set` 还是未来的 `Stack`。这种"**操作外置 + 最小约束**"的范式，是 working group 给社区库作者的参考设计。

## 十、设计取舍背后的工程哲学

整套提案的取舍有几条主线，值得单独拎出来讲：

### 10.1 透明表示 vs 隐藏实现

`set.Set` 透明表示为 `map[T]struct{}`，换来内置 `len`/`range`/map-access 的人体工学，代价是底层实现永远不能换。working group 的判断：**可预测、熟悉的行为比"自由换实现"更重要**。这是非常 Go 风格的取舍——`slice`、`map`、`string` 都是透明表示，社区已经习惯。

### 10.2 functional vs mutating 双 API

不是二选一，而是**两者都提供**。functional 风格（返回新集合）适合链式组合、不可变数据流；mutating 风格（修改 receiver）适合性能敏感场景。参考 `math/big.Int` 的成熟模式。

### 10.3 不做"为优化而优化"

`heap/v2` 不提供 `Heap[cmp.Ordered]` 特化版本，因为编译器无法 monomorphization 优化、收益有限。working group 的原则："satisfy the API and the asymptotic performance expectations as simply as possible first"——**先满足 API 和渐近性能，常数级优化留给后续迭代**。

### 10.4 不会变成 Java Collections

jba 在 #80194 评论里明确："I don't see the stdlib containing a lot of variants of maps—it won't become like Java." 1.28 这批只提供**最小可用集**：一个 canonical set、一个哈希 Map/Set 家族、一个有序 Map、一个 heap。insertion-ordered、Stack 等留待观察真实需求。

## 十一、对 Go 开发者的实际影响

**今天能做的**：

- `hash/maphash.Hasher` 已在 Go 1.27 可用，可以直接 `import "hash/maphash"` 试用。Bloom filter、自定义 key 哈希等场景**现在就能上生产**。
- 阅读 [issue #80590](https://github.com/golang/go/issues/80590) 和各子 proposal，**趁 review 阶段提反馈**。working group 明确在征求社区意见，一旦发布就无法改 API。

**1.28 GA 之前不要做的**：

- 不要基于 gotip 的 API 写生产代码——子 proposal 仍在 review，方法签名、包名都可能变。
- 不要相信任何"`go fix` 自动迁移 `map[T]bool` 到 `set.Set`"的说法——issue 里没有任何此类工具的承诺。
- 不要把 `container/queue`、`container/ring/v2`、`sync/v2 OrderedMutex` 写进技术规划——**这些包在 #80590 里根本不存在**，是网络上一些二次解读文章的误传。

**1.28 GA 之后预计能做的**：

- 新代码用 `set.Set[T]` 替代 `map[T]struct{}`，获得类型安全和集合代数 API。
- 存量代码用 `container/mapset` 的函数式 helper，**无 API break** 地获得 set 操作语义。
- 范围查询场景用 `container/ordered.Map`，告别"建 map + sort keys"的 workaround。
- 优先队列、TopK 用 `container/heap/v2`，告别 5 方法样板代码和装箱开销。

## 十二、状态与时间预期

- **所有 6 个新子 proposal 当前 Open，未接受**。
- milestone Go 1.28 是**目标**，不是承诺。Go 提案的 milestone 意味着"希望在这个版本落地"，但 review 过程中任何子 proposal 都可能被修改、推迟或拒绝。
- Go 1.28 按半年节奏预计 **2027 年初 GA**。
- 子 proposal 各自走标准评审流程，最终能否进 1.28 取决于社区反馈和 Go 团队审议。

TonyBai 在 [2026-07-29 文章](https://tonybai.com/2026/07/29/go-1-28-generic-collections-proposal) 结尾的总结很到位："**提案尚未落地，值得持续关注**。" 这八个字是当前最准确的状态描述。

## 参考资料

- [proposal: container/...: generic collection types · Issue #80590 · golang/go](https://github.com/golang/go/issues/80590) — 伞形提案原文
- [proposal: container/set: a generic set type · Issue #69230](https://github.com/golang/go/issues/69230) — `set.Set` 子提案
- [proposal: container/hash.Map · Issue #69559](https://github.com/golang/go/issues/69559) — 哈希 Map 子提案
- [proposal: container/hash.Set · Issue #80584](https://github.com/golang/go/issues/80584) — 哈希 Set 子提案
- [proposal: container/mapset · Issue #77052](https://github.com/golang/go/issues/77052) — 兼容 shim 子提案
- [proposal: container/ordered.Map · Issue #60630](https://github.com/golang/go/issues/60630) — 有序映射子提案
- [proposal: container/heap/v2 · Issue #77397](https://github.com/golang/go/issues/77397) — 泛型堆子提案
- [proposal: container/hash: insertion-ordered maps · Issue #80194](https://github.com/golang/go/issues/80194) — 评估中的 future 项
- [hash/maphash.Hasher · Issue #70471](https://github.com/golang/go/issues/70471) — 已在 Go 1.27 发布的基础设施
- [Go 1.28 大动作：泛型集合终于要进标准库了 — TonyBai 2026-07-29](https://tonybai.com/2026/07/29/go-1-28-generic-collections-proposal)
- [再见，丑陋的 container/heap！Go 泛型堆 heap/v2 提案解析 — TonyBai 2026-02-04](https://tonybai.com/2026/02/04/goodbye-container-heap-go-generic-heap-heap-v2-proposal/)
- [Go Wants Sets and Ordered Maps in the Standard Library — PeopleAreGeek](https://peoplearegeek.com/articles/go-container-generic-collections-1-28)
- [Go 1.28 Introduces Generic Collections — BestHub](https://www.besthub.dev/articles/go-1-28-introduces-generic-collections-standardized-set-tree-map-and-heap-58dfd96c1851)
- [Go 1.28: container/set, ordered.Map y heap/v2 llegan a la stdlib — dev.to/lu1tr0n](https://dev.to/lu1tr0n/go-128-containerset-orderedmap-y-heapv2-llegan-a-la-stdlib-2jm0)
- [Go 1.28 路线图首度曝光 — TonyBai 2026-07-16](https://tonybai.com/2026/07/16/go-1-28-roadmap-compiler-and-runtime-features-preview)
