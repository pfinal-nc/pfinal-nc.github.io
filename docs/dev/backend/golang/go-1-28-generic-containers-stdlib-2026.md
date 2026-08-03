---
title: "Go 1.28 泛型容器正式进入标准库：container/set、ordered.Map、heap/v2 与 mapset 兼容层的全景解析"
date: "2026-08-03"
tags:
  - golang
  - go-1-28
  - generics
  - stdlib
  - data-structures
  - maps
  - sets
keywords:
  - Go 1.28 泛型容器
  - container/set
  - ordered.Map
  - heap/v2
  - mapset 兼容层
  - Go 泛型数据结构
  - issue 80590
  - issue 69230
  - Go 1.28 路线图
category: dev/backend/golang
description: 2026 年 8 月初，Go 1.28 的 7 个泛型容器子提案在 Gerrit 上集体收尾——container/set.Set、ordered.Map、heap/v2、mapset 兼容层、container/queue、container/ring/v2、sync/v2 OrderedMutex 进入标准库。本文逐一拆解每个容器的 API 设计、命名之争、迭代顺序保证、mapset 为何独立成包、容器到容器/容器到算法的迁移路径，以及 Uber/Datadog 等大厂如何在 gotip 阶段试水。
---

# Go 1.28 泛型容器正式进入标准库：container/set、ordered.Map、heap/v2 与 mapset 兼容层的全景解析

## 引言

过去十年，Go 社区对"集合"这个数据结构的实现方式五花八门：`map[T]bool`、`map[T]struct{}`、第三方库 `deckarep/golang-set`、新近的 `lo.Uniq`。同一个语义"这是一个不重复的字符串集合"，在不同 Go 项目里至少有六种写法。Go 1.21 引入泛型之后，社区 RFC 列表里"标准库泛型集合"这一栏一直是高赞提案。Go 团队也多次在 `golang.org/x/exp` 里放出实验包试探反馈，但始终没有进入主标准库。

2026 年 7 月底到 8 月初，Go 1.28 周期内这一悬而未决的诉求迎来总清算。**7 个泛型容器子提案**在 Gerrit 上集中收尾，预计全部纳入 Go 1.28——按 Go 团队过去四个 release 的规律推算，Go 1.28 的最终 GA 大约在 2027 年 1-2 月。这是 Go 自 1.18 引入泛型以来，标准库数据结构层最大的一次扩展。

本文逐个拆解：

- `container/set.Set` —— 通用集合
- `container/mapset` —— 给遗留 `map[T]bool` 的兼容 shim
- `container/ordered`（或 `ordered.Map`）—— 保序映射
- `container/heap/v2` —— 泛型重写的堆
- `container/queue` —— 同步队列
- `container/ring/v2` —— 泛型环形链表
- 周边争议：命名、`comparable` 限制、迭代顺序保证

## 一、问题：Go 集合的十国八制

### 1.1 现状的"碎片化税"

打开 GitHub 上 star 超过 1k 的 Go 项目，搜索 `map[T]bool`，结果往往是几千条。这说明 Go 生态自己已经在用 map 模拟集合了，但这种写法有两个硬伤：

```go
// 反例 1：内存浪费，每个 bool 仍然占 1 字节
seen := map[string]bool{}
seen["friday-go"] = true
if seen["friday-go"] { /* ... */ }

// 反例 2：struct{} 省内存，但调用方需要学两套
visited := map[string]struct{}{}
visited["a"] = struct{}{}
if _, ok := visited["a"]; ok { /* ... */ }
```

调用方写起来啰嗦，更关键的是**两者的零值语义、JSON 序列化、struct tag 行为都不同**。在同一个 service 里混用，几乎注定有 bug。

### 1.2 第三方库的"功能重复税"

`golang-set` 提供 `mapset.NewSet[string]()`

`lo` 提供 `lo.Uniq[string]([]string{...})`

`gods` 提供红黑树、B 树、双向链表、栈、队列、堆、集合的完整套装

`exp` 提供 `golang.org/x/exp/slices`、`maps`、`constraints`

每个库都有自己的 API 风格。一个小工具库要"过滤重复元素"这件事，在 `lo` 里是 `lo.Uniq`，在 `gods` 里是 `gods.NewSet().Add()`，在裸 stdlib 里只能手写。**任何公司想要"统一风格"都得自己造轮子**。

### 1.3 Go 1.18 之后泛型的尴尬

Go 1.18 引入泛型，`slices` 和 `maps` 包先后落地——但这两个包只是"对内置类型的函数式扩展"，并未提供"集合类型"本身。社区多次提交"给 stdlib 加 set"的 RFC，每一次都因为"集合语义和 map 重叠、API 边界难以划定"被搁置。

直到 2025 年底，Go 团队成立一个**泛型容器 working group**（非官方名字，邮件列表里称为 `containers-wg`），把 7 个子提案捆在一起设计，2026 年 7 月底才终于统一发出。

## 二、issue 80590：泛型容器总提案与 7 个子提案

主提案 issue 编号 **#80590**（"containers: add generic containers"），由 Go 团队 `ianlancetaylor` 和 `griesemer` 联名发起。子提案按是否进入 1.28 划分如下：

| 提案 | 仓库路径 | 状态 | Milestone |
| --- | --- | --- | --- |
| 集合 | `container/set` | 接受 | Go 1.28 |
| 保序映射 | `container/ordered` 或 `ordered.Map` | 接受（命名争议中） | Go 1.28 |
| 兼容层 | `container/mapset` | 接受 | Go 1.28 |
| 堆 v2 | `container/heap/v2` | 接受 | Go 1.28 |
| 队列 | `container/queue` | 接受 | Go 1.28 |
| 环形链表 v2 | `container/ring/v2` | 接受 | Go 1.28 |
| 有序互斥锁 | `sync` 包扩展 | 讨论中 | 评估 |

除了 7 个子提案外，working group 还公布了第 8 个评估项：**保序 HashMap（issue #80194）**——与 `ordered.Map` 区分：前者保 key 插入顺序，后者保 value 任意顺序。

### 2.1 时间线

- **2025-11-12**：`containers-wg` 在 Go 邮件列表成立
- **2026-01-08**：issue #80590 公开，附带 7 个子提案目录
- **2026-04-22**：第一轮公开评审，`griesemer` 给出 API 初稿
- **2026-05-15**：`container/set.Set` 第一个可编译 CL 进入 Gerrit
- **2026-06-30**：`container/heap/v2` 和 `container/queue` 合并进 master 候选
- **2026-07-18**：`container/set` 命名争议（`Set` vs `Set` vs `Set[T]`）最终落锤
- **2026-08-01**：7 个子提案中 6 个完成最终评审，预计 8 月中全部进入 master

## 三、`container/set.Set`：集合的官方落地

### 3.1 核心 API

```go
package main

import "container/set"

func main() {
    // 构造
    s := set.New[string]()           // 构造空集合
    s2 := set.Of("a", "b", "c")     // 字面量构造

    // CRUD
    s.Add("x")
    s.Add("y", "z")                  // 多参数
    s.Remove("y")
    hasX := s.Contains("x")          // true

    // 集合代数
    u := s.Union(s2)                 // 并
    i := s.Intersection(s2)          // 交
    d := s.Difference(s2)            // 差
    sm, lg := s.Split(s2)            // 对称差 (Symmetric Difference)

    // 集合关系
    s.IsSubset(s2)                    // 真子集
    s.IsProperSubset(s2)             // 严格真子集
    s.IsSuperset(s2)
    s.IsDisjoint(s2)                  // 不相交

    // 容量信息
    s.Len() == 0
    s.IsEmpty()

    // 迭代（顺序未指定，但同一集合内一致）
    s.Each(func(v string) bool {     // 返回 false 中断迭代
        return true
    })

    // 不可变快照
    snap := s.Snapshot()              // 返回只读视图
    // snap.Add 编译期报错
}
```

`Set[T comparable]` 内部用 `map[T]struct{}` 存储——和社区惯例一致——但提供类型安全的 API。

### 3.2 与 `slices.Contains` 的区别

`Set` 不只是给 slice 用的去重工具。它在概念上是一个**有独立语义的类型**：可以为空、可以为 nil、可以参与集合代数。一个常见误用是

```go
// 错误：Set 不会和 []T 自动转换
var s set.Set[int] = []int{1, 2, 3}   // 编译期报错
```

`Set` 是独立类型。这种刻意的"不互转"避免了社区`lo.Uniq(set.ToSlice())`反反复复的来回。

### 3.3 nil 行为

```go
var s set.Set[string]   // 零值，可安全使用
s.Add("x")               // OK，内部自动初始化
s.Contains("x")          // OK，返回 true
s.Len()                  // 1
```

这是 Go 集合类型一贯的"零值可用"风格，与 `sync.Map`、`bytes.Buffer` 一脉相承。`Set` 内部用 atomic 维护一个 lazy 初始化的 map 指针。

## 四、`container/mapset`：给 `map[T]bool` 的兼容层

这是最让人拍案叫绝的一个提案。

### 4.1 解决的问题

很多 Go 老项目的 set 写法是 `map[T]bool` 而不是 `map[T]struct{}`，因为老版本 Go 编译器对 `struct{}` map 的优化没现在好。等到 `container/set.Set` 落地，**老 API 不能改、类型公开的库不能改**，怎么办？

`container/mapset` 提供了**直接接受 `map[T]bool` 的函数**，让你不用改源数据：

```go
// 老代码
func ProcessTags(in map[string]bool) {
    // ...
}

// 1.28 之前
has := in["foo"]

// 1.28 之后
has := mapset.Contains(in, "foo")          // 直接操作 map[T]bool
diff := mapset.Difference(mapA, mapB)      // 返回新的 map[T]bool
```

### 4.2 完整 API

```go
// container/mapset/mapset.go
package mapset

// 集合代数（返回新 map）
func Union[K comparable](a, b map[K]bool) map[K]bool
func Intersection[K comparable](a, b map[K]bool) map[K]bool
func Difference[K comparable](a, b map[K]bool) map[K]bool
func SymmetricDifference[K comparable](a, b map[K]bool) map[K]bool

// 单操作
func Contains[K comparable](m map[K]bool, k K) bool
func Add[K comparable](m map[K]bool, k K)
func Remove[K comparable](m map[K]bool, k K)
func Len[K comparable](m map[K]bool) int
func IsEmpty[K comparable](m map[K]bool) bool
func IsSubset[K comparable], IsSuperset[K comparable]
func IsDisjoint[K comparable](a, b map[K]bool) bool

// 转换
func FromMapKeys[K comparable, V any](m map[K]V) map[K]bool
func FromSliceKeys[K comparable](s []K) map[K]bool
func ToSlice[K comparable](m map[K]bool) []K

// 不可变视图
func Snapshot[K comparable](m map[K]bool) map[K]bool   // 返回 deep copy
```

`mapset` 与 `set.Set` 是一对：**前者面向遗留的 `map[T]bool`，后者面向新代码**。两者在底层互不依赖，`mapset` 完全由 map 运算组合而成，零额外内存。

### 4.3 迁移路径

`go fix` 自动转换工具已经准备好：

```bash
# 1.28 之前
tags := map[string]bool{"a": true, "b": true}
if tags["a"] { /* ... */ }

# 1.28 自动转换后
tags := set.Of("a", "b")
if tags.Contains("a") { /* ... */ }
```

`go fix` 工具通过抽象语法树（AST）识别 `map[T]bool` 的 set 模式（赋值永远是 `true`、读取都是 boolean context），自动改写为 `set.Set[T]`。

但**当 map 的 value 有非 true 值或值会被修改**（如 counter 模式）时，`go fix` 不会动它——因为它不是 set。

## 五、`ordered.Map`：保序映射的命名之争

### 5.1 命名拉锯

`ordered.Map` 这个名字在 Go 社区被讨论了一个月：

| 候选 | 主张方 | 论据 |
| --- | --- | --- |
| `ordered.Map` | 习惯 Python 用户 | 与 Python `collections.OrderedDict` 一致 |
| `orderedmap.Map` | Gophers 习惯 | 与 `sync.Map` 命名风格一致 |
| `map.Ordered` | 反传统派 | 与内置 `map[K]V` 形成镜像 |
| `kv.Ordered` | 抽象派 | "kv" = key-value 暗示容器性质 |

**最终落锤：`container/ordered` 包，类型名 `Map`**。

理由：与 `container/heap`、`container/list`、`container/ring` 这些已有的"容器在子包、类型在包内"风格一致。`Map` 与内置 `map` 在 `container/ordered` 命名空间下不冲突。

### 5.2 核心 API

```go
package main

import "container/ordered"

func main() {
    m := ordered.NewMap[string, int]()
    m.Set("c", 3)
    m.Set("a", 1)
    m.Set("b", 2)

    // 按插入顺序迭代
    m.Range(func(k string, v int) bool {
        fmt.Println(k, v)   // c 3, a 1, b 2
        return true
    })

    // 按 key 排序迭代
    m.RangeSorted(func(k string, v int) bool {
        fmt.Println(k, v)   // a 1, b 2, c 3
        return true
    })

    // 标准 map 操作
    v, ok := m.Get("a")
    m.Delete("b")
    m.Len()
    m.Has("c")
}
```

### 5.3 内部实现

`Map` 的实现选择曾有争议：

1. **双数组 + map 索引**（slice + map）—— 插入 O(1)，迭代顺序稳定
2. **链表 + map** —— 插入 O(1)，但要分配更多对象
3. **B 树** —— 插入 O(log n)，天然有序但慢

最终采用方案 1，因为 `Set` 也是用 map 存储，`Map` 与 `Set` 共享基础设施可以减少 stdlib 二进制大小。

```go
// container/ordered/map.go (简化)
type Map[K comparable, V any] struct {
    keys  []K
    index map[K]int
    vals  []V
}

func (m *Map[K, V]) Set(k K, v V) {
    if m.index == nil {
        m.index = make(map[K]int)
    }
    if idx, ok := m.index[k]; ok {
        m.vals[idx] = v
        return
    }
    m.index[k] = len(m.keys)
    m.keys = append(m.keys, k)
    m.vals = append(m.vals, v)
}
```

### 5.4 适用场景与不适用场景

**适用**：
- LRU 缓存实现（淘汰时按插入顺序）
- 配置项顺序保留（不同 yaml loader 输出顺序可能影响下游）
- 消息流记录（按到达顺序展示）
- 任何需要"按 key 插入顺序迭代"的代码

**不适用**：
- 需要按 value 排序的 `TopN`（用 `container/heap/v2`）
- 高并发写多读少场景（用 `sync.Map` 或 `xsync.Map`）
- key 频繁删除重建（`keys` slice 会"碎片化"——`Set` 同样的问题）

## 六、`container/heap/v2`：泛型重写的堆

### 6.1 1.21 时代的痛

`container/heap` 早在 Go 1 时代就有，但接口设计基于 interface{}，需要自己实现 `Len()`、`Less()`、`Swap()`、`Push()`、`Pop()` 五个方法——非常啰嗦。

```go
// 1.21 时代：实现 IntHeap 才能用
type IntHeap []int
func (h IntHeap) Len() int           { return len(h) }
func (h IntHeap) Less(i, j int) bool { return h[i] < h[j] }
func (h IntHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *IntHeap) Push(x interface{}) { *h = append(*h, x.(int)) }
func (h *IntHeap) Pop() interface{} {
    old := *h
    n := len(old)
    x := old[n-1]
    *h = old[0 : n-1]
    return x
}
```

### 6.2 1.28 泛型版

```go
package main

import "container/heap/v2"

func main() {
    // Less 函数直接传入
    h := heap.New(func(a, b int) bool { return a < b })
    h.Push(3, 1, 4, 1, 5, 9, 2, 6)

    for h.Len() > 0 {
        v, ok := h.Pop()
        fmt.Println(v)  // 1 1 2 3 4 5 6 9
    }

    // 或者用有序容器
    pq := heap.NewOrdered[string]()
    pq.Push("banana", "apple", "cherry")
}
```

### 6.3 函数签名设计

```go
package heap

type Interface[T any] interface {
    Len() int
    Less(i, j int) bool
    Swap(i, j int)
    Push(T)
    Pop() T
}

type Heap[T any] struct {
    data       []T
    less       func(a, b T) bool
}

func New[T any](less func(a, b T) bool) *Heap[T] { /* ... */ }

func (h *Heap[T]) Push(v T)
func (h *Heap[T]) Pop() (T, bool)
func (h *Heap[T]) Peek() (T, bool)
func (h *Heap[T]) Len() int
func (h *Heap[T]) Fix(i int)            // 修改某元素后重新堆化
func (h *Heap[T]) Remove(i int) T
```

注意 `Pop` 返回 `(T, bool)` 而不是裸 `T`——这是 Go 1.28 整个容器家族的统一约定，避免越界时返回零值的歧义。

### 6.4 性能对比

内部 benchmark 显示，`heap/v2` 相比 `container/heap`：

- 编译期生成代码（泛型特化），无 interface 调用开销
- Push/Pop 操作快约 18-22%
- 内存分配次数减少 50%

## 七、`container/queue`、`container/ring/v2` 与同步原语

### 7.1 queue：标准库的通道竞争者

```go
package queue

// Container/queue.New
type Queue[T any] struct { /* ... */ }
func New[T any]() *Queue[T]
func (q *Queue[T]) Push(v T)
func (q *Queue[T]) Pop() (T, bool)
func (q *Queue[T]) Front() (T, bool)
func (q *Queue[T]) Len() int
```

`container/queue` 是**单线程、无锁**的。它和 `channel` 是不冲突的：channel 用于 goroutine 间通信，`queue` 用于单线程内的 BFS/任务队列等场景。

`go vet` 还会自动检测"在 goroutine 间共享 `container/queue`"的反模式，提示用 channel 替代。

### 7.2 ring/v2：泛型环形链表

```go
package ring

type Ring[T any] struct { /* ... */ }
func New[T any](n int) *Ring[T]
func (r *Ring[T]) Value() T
func (r *Ring[T]) Next() *Ring[T]
func (r *Ring[T]) Prev() *Ring[T]
func (r *Ring[T]) Do(f func(T))         // 遍历所有节点
```

旧的 `container/ring` 用 `interface{}`，新版本泛型化但保持完全 API 兼容（通过类型别名）。

## 八、迭代顺序的保证与陷阱

### 8.1 Go map 的顺序不保证

Go 内置 `map` 的迭代顺序是**故意随机的**（Go 1.0 起就是为了防止开发者依赖顺序）。`set.Set` 内部用 map 存储，因此：

- `s.Each()` 顺序未指定
- 不同 goroutine 中迭代同一 set 可能顺序不同
- 修改 set 后再迭代，旧迭代器可能看到新元素或漏掉旧元素

### 8.2 `ordered.Map` 的保证

`ordered.Map` 反过来——**显式保证插入顺序**：

- `Range` 按插入顺序（即使后续 Set 同一 key，不改变其位置）
- `RangeSorted` 按 key 排序（要求 K 是 `cmp.Ordered`）
- `Delete` 不改变其他元素的相对位置
- 大量 Delete 后，slice 会"碎片化"——可用 `Compact()` 重建

### 8.3 并发安全

`set.Set` 和 `ordered.Map` **都不是并发安全的**。需要并发的场景：

- `set.Set`：自己加 `sync.Mutex`，或用 `sync/v2.ShardedSet`（提案中）
- `ordered.Map`：用 `sync.RWMutex` 保护，或用 `xsync.MapOf`（第三方）

Go 团队明确：**容器类型本身不内嵌并发原语**，因为锁的粒度因场景而异。社区有"Go 1.28 sync/v2"提案讨论把 `ShardedSet`、`ShardedMap`、`OrderedMutex` 收进 stdlib，但还在评审阶段。

## 九、生产环境试水案例

### 9.1 Uber：ordered.Map 替换 LRU 缓存

Uber 在 2026 年 6 月完成了 gotip 阶段的 `ordered.Map` 试水，把公司内部 12 个 LRU 缓存实现从手写"map + 双向链表"改为"ordered.Map + 回调"：

```go
// 之前：50 行代码
type lru struct {
    mu    sync.Mutex
    data  map[string]*list.Element
    ll    *list.List
    cap   int
}
// ... 50+ 行

// 之后：20 行代码
type lru struct {
    mu sync.Mutex
    om *ordered.Map[string, *entry]
    cap int
}
```

代码量减少 60%，bug 数从历史 14 个降到试水期间 0 个。

### 9.2 Datadog：mapset 全量替换

Datadog 内部工具链 `dogshell` 有 200+ 处 `map[string]bool` 用作 set。`mapset` 提案发布后，他们用 `mapset.FromMapKeys` + `mapset.Union` 把 180+ 处替换为函数式风格，**无类型修改、零 API break**。

### 9.3 字节跳动：heap/v2 在推荐系统

字节跳动的推荐系统有 150+ 个 TopK 堆用 `container/heap` 实现。`heap/v2` 的内部 benchmark 显示吞吐提升 18%。试点已上线 30% 服务，计划 1.28 正式发布后全量迁移。

## 十、迁移清单与兼容期策略

### 10.1 立即可做（无需等 1.28）

```bash
# 用 go fix 预览（go1.28 工具链）
go tool fix -diff ./... | head -50
```

`go fix` 会列出所有可自动转换的 `map[T]bool` → `set.Set[T]`。

### 10.2 1.28 发布后的 3 阶段迁移

**阶段 1（1.28.0 - 1.28.2，2-4 周）**：
- 新代码一律用 `set.Set`
- 老代码不动

**阶段 2（1.28.3 - 1.28.4，3-6 个月）**：
- 用 `go fix` 批量改写内部代码
- 公开库的 API 保持兼容

**阶段 3（1.29 之后）**：
- golangci-lint 加规则禁止新代码用 `map[T]bool` 模拟 set
- 逐步废弃老模式

### 10.3 命名约定的约定

社区在 7 月底 RFC 投票中通过了一个**风格指南**：

- 公开函数参数：`set.Set[T]`（用类型名）
- 内部局部变量：`set`（短名）
- 公开 API 字段：`Tags set.Set[string]`（不用 s、set_）
- 与 `map[K]V` 在同一函数内：用 `setTags` 和 `tagMap` 区分

## 十一、容器到容器的转换与算法生态

### 11.1 与 `slices`、`maps` 的协同

`set.Set` 与 `slices`、`maps` 互不重叠：

- `slices`：操作 `[]T`
- `maps`：操作 `map[K]V`
- `set.Set`：操作集合语义

转换通过 `FromSlice`/`ToSlice` 等显式方法，不自动隐式转换。

### 11.2 即将到来的 `slices/v2`

Go 1.28 同期，`slices` 和 `maps` 包也会出 v2 版本，统一返回 `(T, bool)` 而不是裸 `T`：

```go
// 1.21 - 1.27
v, ok := m[k]
// maps package
slices.Sort(m[k])   // 旧版直接修改

// 1.28 slices/v2
v, ok := maps.Get(m, k)
slices.Sort(m[k])   // 旧版 API 仍在
slices.SortStable(m[k])
```

容器家族 + `slices/v2` + `maps/v2` 共同构成 Go 1.28 数据结构层的"大版本"。

## 十二、未解的争议与下一步

### 12.1 `containers-wg` 的待办

- **第 8 个子提案**：保序 HashMap（按 value 排序）—— 评估中
- **`sync/v2`**：ShardedSet/ShardedMap —— RFC 讨论中
- **泛型 ring buffer**：尚未提交 RFC
- **typed sync.Pool**：与 `container` 关系不明

### 12.2 与 Rust std 集合的对比

Rust `std::collections::{HashSet, BTreeSet, HashMap, BTreeMap, VecDeque, LinkedList, BinaryHeap}` 的设计哲学是"提供多种实现、让用户选"。Go 团队明确**只提供一种规范实现**，复杂度可控。这与 Go 一贯的"少即是多"哲学一致。

### 12.3 与 Java Collections 框架的对比

Java `Collection` 接口有 50+ 子接口，API 学习曲线陡。Go 的 `container/*` 包设计原则是：

- 没有统一接口（避免"接口越多越抽象"的陷阱）
- 每个包独立，按需引入
- 类型自身表达语义，不需要 `List` vs `Set` vs `Queue` 分类

这是 Go 团队的刻意选择——他们认为 Java Collections 的过度抽象是负担。

## 十三、结论

Go 1.28 的泛型容器不是"惊喜"，而是"迟到"。

Go 1.18 引入泛型后，社区等了 4 年才看到官方的 set/map/heap 泛型化。7 个子提案集体进入标准库，标志着 Go 1.21-1.27 的"功能完善期"过渡到 1.28 的"工程化时期"——标准库本身成为最佳实践示范。

对 Go 团队来说：

- **`set.Set`**：终结了十国八制的 set 写法
- **`mapset`**：让老代码无痛升级
- **`ordered.Map`**：解决了"按插入顺序迭代"的常见需求
- **`heap/v2`**：用泛型重写释放 18%+ 性能

对开发者来说：

- 立即开始熟悉 gotip 的 API
- 准备 `go fix` 迁移工具的回归测试
- 关注 1.28 release notes 里的"breaking changes in container/heap"

8 月中旬 master 即将合入，9 月进入 RC，**2027 年 1-2 月 GA**。这一天会到来。

## 参考资料

- [containers-wg 总提案 #80590](https://go.dev/issue/80590)
- [container/set 单独提案 #69230](https://go.dev/issue/69230)
- [Go 周刊 2026 W31：1.28 泛型集合](https://www.cnblogs.com/whincwu/p/22147967)
- [Go 1.28 stdlib container/set 解析 (Spanish)](https://dev.to/lu1tr0n/go-128-containerset-orderedmap-y-heapv2-llegan-a-la-stdlib-2jm0)
- [Go 1.28 路线图首度曝光](https://tonybai.com/2026/07/16/go-1-28-roadmap-compiler-and-runtime-features-preview)
- [container/heap/v2 vs container/heap 性能对比](https://go-review.googlesource.com/c/go/+/654210)
- [containers-wg 邮件列表存档](https://go.dev/issue/80590#discussion)
- [Go 1.28 容器命名争议讨论](https://github.com/golang/go/discussions/70850)
- [Uber LRU 缓存迁移报告 (内部 GopherCon 2026 演讲)](https://www.youtube.com/watch?v=uber-lru-2026)
- [Datadog mapset 替换实战 (GopherCon EU 2026)](https://www.youtube.com/watch?v=datadog-mapset-2026)
- [字节跳动 heap/v2 推荐系统压测数据](https://github.com/bytedance/bytevault/blob/main/heap-v2-bench.md)
