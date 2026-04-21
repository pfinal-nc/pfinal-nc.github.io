---
title: "Go 基础语法速通：从零开始掌握 Go 语言"
date: 2026-04-21 09:00:00
author: PFinal南丞
description: "全面覆盖 Go 语言基础语法，包括变量声明、控制流程、函数、指针等核心概念，附带大量实战示例，帮助你快速上手 Go 语言开发。"
keywords:
  - Go 基础语法
  - Golang 入门
  - Go 变量
  - Go 函数
  - Go 指针
tags:
  - golang
  - tutorial
  - backend
---

# Go 基础语法速通：从零开始掌握 Go 语言

> Go（Golang）是 Google 开发的静态强类型、编译型语言。它语法简洁、并发能力强、编译速度快，是现代后端开发的热门选择。

**学习路径推荐：**
- [Go 数组、切片、Map、结构体、接口深度解析](./go-slice-map.md) - 数据结构进阶
- [Go 并发：WaitGroup、Mutex、RWMutex 深度解析](./go-waitgroup-mutex.md) - 并发编程入门
- [Gin 框架实战指南](./gin-framework-guide.md) - Web 开发实战
- [GORM 实战教程](./gorm-tutorial.md) - 数据库操作

## 一、Hello World

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
```

运行方式：
```bash
go run main.go
# 或者编译后运行
go build -o hello main.go
./hello
```

---

## 二、变量与常量

### 2.1 变量声明

Go 支持三种变量声明方式：

```go
// 方式1：var 显式声明
var name string = "PFinal"
var age int = 25

// 方式2：类型推断
var city = "Beijing"

// 方式3：短变量声明（函数内部使用）
score := 100
isActive := true
```

### 2.2 多变量声明

```go
// 同时声明多个变量
var (
    host string = "localhost"
    port int    = 8080
    debug bool  = false
)

// 短声明多变量
x, y, z := 1, 2, 3
```

### 2.3 常量

```go
const Pi = 3.14159
const MaxRetry = 3

// iota 枚举
type Weekday int
const (
    Sunday Weekday = iota  // 0
    Monday                  // 1
    Tuesday                 // 2
    Wednesday               // 3
    Thursday                // 4
    Friday                  // 5
    Saturday                // 6
)

// iota 位运算
const (
    Read    = 1 << iota // 1
    Write               // 2
    Execute             // 4
)
```

---

## 三、基础数据类型

```go
// 整数类型
var i8  int8   = 127          // -128 ~ 127
var i16 int16  = 32767
var i32 int32  = 2147483647
var i64 int64  = 9223372036854775807
var i   int    = 100          // 平台相关，64位系统下为64位

// 无符号整数
var u8  uint8  = 255          // 0 ~ 255
var u16 uint16 = 65535

// 浮点数
var f32 float32 = 3.14
var f64 float64 = 3.141592653589793

// 复数
var c complex128 = 3 + 4i

// 布尔
var b bool = true

// 字符串（UTF-8 编码）
var s string = "你好，Go！"

// 字节与 rune
var by byte = 'A'    // uint8
var r  rune = '中'   // int32，代表 Unicode 码点
```

### 类型转换（显式转换）

```go
var i int = 42
var f float64 = float64(i)
var u uint = uint(f)

// 字符串与 byte 切片互转
s := "hello"
b := []byte(s)     // string → []byte
s2 := string(b)    // []byte → string
```

---

## 四、控制流程

### 4.1 if-else

```go
func classify(score int) string {
    if score >= 90 {
        return "优秀"
    } else if score >= 70 {
        return "良好"
    } else if score >= 60 {
        return "及格"
    } else {
        return "不及格"
    }
}

// if 初始化语句（作用域限定）
if err := doSomething(); err != nil {
    fmt.Println("错误:", err)
}
```

### 4.2 for 循环

Go 只有 `for`，但可以模拟 while 和 do-while：

```go
// 标准 for
for i := 0; i < 5; i++ {
    fmt.Println(i)
}

// 类 while
n := 10
for n > 0 {
    fmt.Println(n)
    n--
}

// 无限循环
for {
    // break 跳出
    break
}

// range 遍历
nums := []int{1, 2, 3, 4, 5}
for i, v := range nums {
    fmt.Printf("索引: %d, 值: %d\n", i, v)
}

// 遍历字符串（按 rune）
for i, c := range "你好Go" {
    fmt.Printf("%d: %c\n", i, c)
}
```

### 4.3 switch

```go
func dayName(d Weekday) string {
    switch d {
    case Sunday:
        return "星期日"
    case Monday:
        return "星期一"
    case Saturday:
        return "星期六"
    default:
        return "工作日"
    }
}

// 无条件 switch（类 if-else）
score := 85
switch {
case score >= 90:
    fmt.Println("优秀")
case score >= 70:
    fmt.Println("良好")
default:
    fmt.Println("及格")
}
```

### 4.4 defer

```go
func readFile(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer f.Close() // 函数返回前执行，LIFO 顺序

    // 读取文件内容...
    return nil
}

// 多个 defer 按 LIFO 顺序执行
func example() {
    defer fmt.Println("第三个执行")
    defer fmt.Println("第二个执行")
    defer fmt.Println("第一个执行")
    fmt.Println("函数体执行")
}
// 输出：
// 函数体执行
// 第一个执行
// 第二个执行
// 第三个执行
```

---

## 五、函数

### 5.1 基础函数

```go
// 单返回值
func add(a, b int) int {
    return a + b
}

// 多返回值（Go 特色）
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, fmt.Errorf("除数不能为零")
    }
    return a / b, nil
}

// 命名返回值
func minMax(arr []int) (min, max int) {
    min, max = arr[0], arr[0]
    for _, v := range arr[1:] {
        if v < min {
            min = v
        }
        if v > max {
            max = v
        }
    }
    return // 裸 return
}
```

### 5.2 可变参数

```go
func sum(nums ...int) int {
    total := 0
    for _, n := range nums {
        total += n
    }
    return total
}

fmt.Println(sum(1, 2, 3))         // 6
fmt.Println(sum(1, 2, 3, 4, 5))   // 15

// 切片展开
nums := []int{1, 2, 3}
fmt.Println(sum(nums...))  // 6
```

### 5.3 匿名函数与闭包

```go
// 匿名函数
greet := func(name string) string {
    return "Hello, " + name
}
fmt.Println(greet("Go"))

// 立即执行
result := func(a, b int) int {
    return a + b
}(3, 4)
fmt.Println(result) // 7

// 闭包
func makeCounter() func() int {
    count := 0
    return func() int {
        count++
        return count
    }
}

counter := makeCounter()
fmt.Println(counter()) // 1
fmt.Println(counter()) // 2
fmt.Println(counter()) // 3
```

### 5.4 函数作为参数（高阶函数）

```go
func filter(nums []int, predicate func(int) bool) []int {
    var result []int
    for _, n := range nums {
        if predicate(n) {
            result = append(result, n)
        }
    }
    return result
}

nums := []int{1, 2, 3, 4, 5, 6}
evens := filter(nums, func(n int) bool { return n%2 == 0 })
fmt.Println(evens) // [2 4 6]
```

---

## 六、指针

```go
// 指针基础
x := 42
p := &x           // p 是指向 x 的指针
fmt.Println(*p)   // 解引用，输出 42
*p = 100          // 通过指针修改 x
fmt.Println(x)    // 100

// new 分配内存
p2 := new(int)
*p2 = 200
fmt.Println(*p2)  // 200

// 函数中修改值
func increment(n *int) {
    *n++
}

count := 0
increment(&count)
fmt.Println(count) // 1
```

---

## 七、错误处理

Go 没有异常机制，用多返回值处理错误：

```go
// 标准错误模式
func parseAge(s string) (int, error) {
    age, err := strconv.Atoi(s)
    if err != nil {
        return 0, fmt.Errorf("解析年龄失败: %w", err)
    }
    if age < 0 || age > 150 {
        return 0, fmt.Errorf("年龄不合法: %d", age)
    }
    return age, nil
}

// 调用
age, err := parseAge("25")
if err != nil {
    log.Fatal(err)
}
fmt.Println(age) // 25

// 自定义错误类型
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("字段 %s 验证失败: %s", e.Field, e.Message)
}

// errors.Is 和 errors.As
var ErrNotFound = errors.New("记录不存在")

func findUser(id int) error {
    return fmt.Errorf("查询失败: %w", ErrNotFound)
}

err = findUser(1)
if errors.Is(err, ErrNotFound) {
    fmt.Println("用户不存在，可以去注册")
}
```

---

## 八、包管理

```bash
# 初始化模块
go mod init github.com/yourusername/project

# 添加依赖
go get github.com/gin-gonic/gin

# 整理依赖
go mod tidy

# 查看依赖树
go mod graph
```

```go
// 自定义包
// 文件: utils/math.go
package utils

// 首字母大写 = 导出
func Add(a, b int) int {
    return a + b
}

// 首字母小写 = 未导出（包内私有）
func multiply(a, b int) int {
    return a * b
}

// 使用包
import "github.com/yourusername/project/utils"

result := utils.Add(3, 4) // 7
```

---

## 九、init 函数

```go
package main

import "fmt"

var config map[string]string

// init 在 main 之前自动执行
func init() {
    config = map[string]string{
        "host": "localhost",
        "port": "8080",
    }
    fmt.Println("init 执行完毕")
}

func main() {
    fmt.Println("main 开始")
    fmt.Println("host:", config["host"])
}
```

---

## 十、实战小练习

### 斐波那契数列

```go
func fibonacci(n int) []int {
    if n <= 0 {
        return nil
    }
    result := make([]int, n)
    result[0] = 0
    if n > 1 {
        result[1] = 1
    }
    for i := 2; i < n; i++ {
        result[i] = result[i-1] + result[i-2]
    }
    return result
}

fmt.Println(fibonacci(10)) // [0 1 1 2 3 5 8 13 21 34]
```

### 单词计数

```go
func wordCount(s string) map[string]int {
    counts := make(map[string]int)
    words := strings.Fields(s)
    for _, w := range words {
        counts[strings.ToLower(w)]++
    }
    return counts
}
```

---

## 总结

| 特性 | Go | Java | Python |
|------|----|----|------|
| 变量声明 | `:=` 或 `var` | 类型在前 | 动态 |
| 错误处理 | 多返回值 | 异常 | 异常 |
| 并发 | goroutine/channel | 线程/Future | asyncio |
| 编译速度 | 极快 | 慢 | 解释执行 |

Go 的设计哲学是"少即是多"——语法规则极少，却能高效解决复杂问题。掌握这些基础语法后，下一步建议学习 [Go 数组与切片](/dev/backend/golang/go-slice-map.md) 和 [Go 并发编程](/dev/backend/golang/go-waitgroup-mutex.md)。

---

*作者：PFinal南丞 | 更新时间：2026-04-21*
