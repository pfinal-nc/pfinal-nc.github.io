---
title: Go 泛型实战：从入门到泛型容器设计
date: 2026-04-27
tags: [Golang, 泛型, Generics]
description: 全面讲解 Go 1.18 引入的泛型特性：类型参数、约束、泛型函数、泛型类型，以及泛型容器（栈、队列、Map）的实战设计。
---

# Go 泛型实战：从入门到泛型容器设计

Go 1.18 正式引入泛型（Generics），这是 Go 语言十余年来最重要的语法特性更新。本文从语法入门到工程实践，带你系统掌握 Go 泛型。

## 一、为什么需要泛型

在泛型出现之前，Go 开发者通常用以下方式处理"通用"逻辑：

```go
// 方式 1：为每个类型写重复代码
func SumInt(nums []int) int {
    total := 0
    for _, n := range nums {
        total += n
    }
    return total
}

func SumFloat64(nums []float64) float64 {
    total := 0.0
    for _, n := range nums {
        total += n
    }
    return total
}

// 方式 2：interface{} 万能但丢失类型安全
func Sum(nums []interface{}) interface{} {
    // 需要类型断言，运行时才能发现类型错误
}
```

泛型的出现让我们可以：**编写一次，适用多种类型，编译期保证类型安全**。

## 二、泛型基础语法

### 2.1 泛型函数

```go
// 语法：函数名[类型参数列表](参数列表) 返回值
func Map[T, U any](slice []T, f func(T) U) []U {
    result := make([]U, len(slice))
    for i, v := range slice {
        result[i] = f(v)
    }
    return result
}

func Filter[T any](slice []T, pred func(T) bool) []T {
    var result []T
    for _, v := range slice {
        if pred(v) {
            result = append(result, v)
        }
    }
    return result
}

func Reduce[T, U any](slice []T, init U, f func(U, T) U) U {
    result := init
    for _, v := range slice {
        result = f(result, v)
    }
    return result
}

// 调用时类型可以自动推断
nums := []int{1, 2, 3, 4, 5}

doubled := Map(nums, func(n int) int { return n * 2 })
// doubled = [2, 4, 6, 8, 10]

evens := Filter(nums, func(n int) bool { return n%2 == 0 })
// evens = [2, 4]

sum := Reduce(nums, 0, func(acc, n int) int { return acc + n })
// sum = 15
```

### 2.2 类型约束（Constraints）

`any` 等价于 `interface{}`，是最宽泛的约束。更严格的约束用接口定义：

```go
// 自定义约束：限制只能是数字类型
type Number interface {
    int | int8 | int16 | int32 | int64 |
        uint | uint8 | uint16 | uint32 | uint64 |
        float32 | float64
}

func Sum[T Number](nums []T) T {
    var total T
    for _, n := range nums {
        total += n
    }
    return total
}

// 可以用 ~ 表示底层类型（包含类型别名）
type Ordered interface {
    ~int | ~float64 | ~string
}

func Min[T Ordered](a, b T) T {
    if a < b {
        return a
    }
    return b
}

// 测试
fmt.Println(Sum([]int{1, 2, 3}))         // 6
fmt.Println(Sum([]float64{1.1, 2.2}))    // 3.3
fmt.Println(Min(3, 5))                   // 3
fmt.Println(Min("apple", "banana"))      // apple
```

### 2.3 golang.org/x/exp/constraints 包

官方实验包提供了常用约束：

```go
import "golang.org/x/exp/constraints"

// constraints.Ordered - 支持比较运算符的类型
// constraints.Integer - 整数类型
// constraints.Float   - 浮点类型
// constraints.Signed  - 有符号整数
// constraints.Unsigned - 无符号整数

func Max[T constraints.Ordered](a, b T) T {
    if a > b {
        return a
    }
    return b
}
```

## 三、泛型类型

```go
// 泛型结构体
type Pair[T, U any] struct {
    First  T
    Second U
}

p := Pair[string, int]{First: "age", Second: 25}
fmt.Println(p.First, p.Second) // age 25

// 泛型方法（注意：方法的接收者不能新增类型参数）
func (p Pair[T, U]) Swap() Pair[U, T] {
    return Pair[U, T]{First: p.Second, Second: p.First}
}

swapped := p.Swap()
// swapped = Pair{First: 25, Second: "age"}
```

## 四、实战：泛型数据结构

### 4.1 泛型栈（Stack）

```go
type Stack[T any] struct {
    items []T
}

func NewStack[T any]() *Stack[T] {
    return &Stack[T]{}
}

func (s *Stack[T]) Push(item T) {
    s.items = append(s.items, item)
}

func (s *Stack[T]) Pop() (T, bool) {
    var zero T
    if len(s.items) == 0 {
        return zero, false
    }
    item := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return item, true
}

func (s *Stack[T]) Peek() (T, bool) {
    var zero T
    if len(s.items) == 0 {
        return zero, false
    }
    return s.items[len(s.items)-1], true
}

func (s *Stack[T]) Len() int {
    return len(s.items)
}

func (s *Stack[T]) IsEmpty() bool {
    return len(s.items) == 0
}

// 使用
intStack := NewStack[int]()
intStack.Push(1)
intStack.Push(2)
intStack.Push(3)

val, ok := intStack.Pop()
fmt.Println(val, ok) // 3 true

strStack := NewStack[string]()
strStack.Push("hello")
strStack.Push("world")
```

### 4.2 泛型队列（Queue）

```go
type Queue[T any] struct {
    items []T
}

func (q *Queue[T]) Enqueue(item T) {
    q.items = append(q.items, item)
}

func (q *Queue[T]) Dequeue() (T, bool) {
    var zero T
    if len(q.items) == 0 {
        return zero, false
    }
    item := q.items[0]
    q.items = q.items[1:]
    return item, true
}

func (q *Queue[T]) Len() int {
    return len(q.items)
}
```

### 4.3 泛型 Set

```go
// comparable 约束：可以用作 map key（支持 == 和 !=）
type Set[T comparable] struct {
    m map[T]struct{}
}

func NewSet[T comparable]() *Set[T] {
    return &Set[T]{m: make(map[T]struct{})}
}

func (s *Set[T]) Add(item T) {
    s.m[item] = struct{}{}
}

func (s *Set[T]) Remove(item T) {
    delete(s.m, item)
}

func (s *Set[T]) Contains(item T) bool {
    _, ok := s.m[item]
    return ok
}

func (s *Set[T]) Len() int {
    return len(s.m)
}

func (s *Set[T]) ToSlice() []T {
    result := make([]T, 0, len(s.m))
    for k := range s.m {
        result = append(result, k)
    }
    return result
}

// 集合运算
func Union[T comparable](a, b *Set[T]) *Set[T] {
    result := NewSet[T]()
    for k := range a.m {
        result.Add(k)
    }
    for k := range b.m {
        result.Add(k)
    }
    return result
}

func Intersection[T comparable](a, b *Set[T]) *Set[T] {
    result := NewSet[T]()
    for k := range a.m {
        if b.Contains(k) {
            result.Add(k)
        }
    }
    return result
}

// 使用
s := NewSet[string]()
s.Add("go")
s.Add("python")
s.Add("rust")
fmt.Println(s.Contains("go"))   // true
fmt.Println(s.Contains("java")) // false
```

### 4.4 泛型 Result 类型

```go
// 函数式编程风格的 Result 类型
type Result[T any] struct {
    value T
    err   error
}

func Ok[T any](value T) Result[T] {
    return Result[T]{value: value}
}

func Err[T any](err error) Result[T] {
    return Result[T]{err: err}
}

func (r Result[T]) IsOk() bool {
    return r.err == nil
}

func (r Result[T]) Unwrap() T {
    if r.err != nil {
        panic(r.err)
    }
    return r.value
}

func (r Result[T]) UnwrapOr(defaultVal T) T {
    if r.err != nil {
        return defaultVal
    }
    return r.value
}

func (r Result[T]) Map(f func(T) T) Result[T] {
    if r.err != nil {
        return r
    }
    return Ok(f(r.value))
}

// 使用
func divide(a, b float64) Result[float64] {
    if b == 0 {
        return Err[float64](errors.New("除数不能为 0"))
    }
    return Ok(a / b)
}

result := divide(10, 2).Map(func(v float64) float64 { return v * 100 })
fmt.Println(result.Unwrap()) // 500

result2 := divide(10, 0)
fmt.Println(result2.UnwrapOr(-1)) // -1
```

## 五、泛型工具函数

### 5.1 集合操作

```go
// Contains：检查元素是否存在
func Contains[T comparable](slice []T, target T) bool {
    for _, v := range slice {
        if v == target {
            return true
        }
    }
    return false
}

// Unique：去重
func Unique[T comparable](slice []T) []T {
    seen := make(map[T]struct{})
    result := make([]T, 0)
    for _, v := range slice {
        if _, ok := seen[v]; !ok {
            seen[v] = struct{}{}
            result = append(result, v)
        }
    }
    return result
}

// GroupBy：按 key 分组
func GroupBy[T any, K comparable](slice []T, keyFn func(T) K) map[K][]T {
    result := make(map[K][]T)
    for _, v := range slice {
        k := keyFn(v)
        result[k] = append(result[k], v)
    }
    return result
}

// 使用
nums := []int{1, 2, 2, 3, 3, 3}
fmt.Println(Unique(nums)) // [1 2 3]

type User struct {
    Name string
    Dept string
}

users := []User{
    {"Alice", "Engineering"},
    {"Bob", "Marketing"},
    {"Charlie", "Engineering"},
}

byDept := GroupBy(users, func(u User) string { return u.Dept })
// byDept["Engineering"] = [{Alice Engineering} {Charlie Engineering}]
```

### 5.2 Map 操作

```go
// Keys：获取 map 所有 key
func Keys[K comparable, V any](m map[K]V) []K {
    keys := make([]K, 0, len(m))
    for k := range m {
        keys = append(keys, k)
    }
    return keys
}

// Values：获取 map 所有 value
func Values[K comparable, V any](m map[K]V) []V {
    vals := make([]V, 0, len(m))
    for _, v := range m {
        vals = append(vals, v)
    }
    return vals
}

// MapKeys：转换 map 的 key
func MapKeys[K1 comparable, K2 comparable, V any](
    m map[K1]V,
    f func(K1) K2,
) map[K2]V {
    result := make(map[K2]V, len(m))
    for k, v := range m {
        result[f(k)] = v
    }
    return result
}
```

## 六、类型约束进阶

### 6.1 接口约束与方法约束结合

```go
// 约束：必须实现 String() 方法
type Stringer interface {
    String() string
}

func PrintAll[T Stringer](items []T) {
    for _, item := range items {
        fmt.Println(item.String())
    }
}

// 约束：既要有方法，又要是具体类型
type NumberStringer interface {
    ~int | ~float64
    String() string
}
```

### 6.2 类型推断

```go
// 大多数情况下，Go 可以自动推断类型参数
nums := []int{3, 1, 4, 1, 5, 9}

// 显式指定类型参数
sorted := Map[int, string](nums, strconv.Itoa)

// 自动推断（推荐）
sorted2 := Map(nums, strconv.Itoa)
```

## 七、泛型的局限性

```go
// ❌ 泛型类型的方法不能有额外的类型参数
type Container[T any] struct { val T }

// 错误！方法不能新增类型参数
// func (c Container[T]) Convert[U any]() U { ... }

// ✅ 改用函数
func Convert[T, U any](c Container[T], f func(T) U) U {
    return f(c.val)
}

// ❌ 不能用泛型类型做 switch 的类型断言
func printType[T any](v T) {
    // 错误：switch v.(type) 在泛型中不支持
}

// ✅ 使用 any 接收后再断言
func printType(v any) {
    switch v.(type) {
    case int:
        fmt.Println("int")
    case string:
        fmt.Println("string")
    }
}
```

## 八、总结

| 特性 | 语法 | 用途 |
|------|------|------|
| 泛型函数 | `func F[T any](...)` | 通用算法（Map/Filter/Reduce）|
| 泛型类型 | `type S[T any] struct{}` | 通用数据结构（Stack/Queue/Set）|
| 类型约束 | `interface{ int \| float64 }` | 限制类型参数范围 |
| `~` 运算符 | `~int` | 包含底层类型为 int 的自定义类型 |
| `comparable` | 内置约束 | 可用作 map key，支持 == |
| `any` | 内置约束 | 等价于 `interface{}`，最宽泛 |

Go 泛型遵循"够用即可"的原则：**优先使用接口，在接口无法满足类型安全时引入泛型**。不要过度泛化，简单明确的代码往往优于复杂的泛型设计。
