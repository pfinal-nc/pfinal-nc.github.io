---
title: Go 错误处理最佳实践：从 error 到 wrapping
date: 2026-04-27
tags: [Golang, 错误处理, 最佳实践]
description: 深入讲解 Go 错误处理的正确姿势：sentinel error、自定义错误类型、errors.Is/As、error wrapping、以及生产级错误处理模式。
---

# Go 错误处理最佳实践：从 error 到 wrapping

Go 的错误处理是语言设计中最具争议性的部分，也是最能体现 Go 哲学的地方。本文从基础到生产实践，系统梳理 Go 错误处理的正确姿势。

## 一、Go 错误处理的哲学

Go 通过多返回值显式返回错误，而不是异常机制：

```go
f, err := os.Open("file.txt")
if err != nil {
    return err
}
defer f.Close()
```

这种设计让错误处理**可见、可控**，但也要求开发者认真对待每一个错误。

## 二、error 接口

`error` 是一个简单接口：

```go
type error interface {
    Error() string
}
```

标准库的 `errors.New` 和 `fmt.Errorf` 是最常用的创建方式：

```go
import "errors"

var ErrNotFound = errors.New("record not found")

func findUser(id int) (*User, error) {
    if id <= 0 {
        return nil, fmt.Errorf("invalid id: %d", id)
    }
    // ...
}
```

## 三、Sentinel Error（哨兵错误）

Sentinel error 是预定义的、可被比较的错误变量，适用于表达特定的错误条件：

```go
package main

import (
    "errors"
    "fmt"
)

// 定义哨兵错误（包级变量）
var (
    ErrNotFound   = errors.New("not found")
    ErrPermission = errors.New("permission denied")
    ErrTimeout    = errors.New("operation timeout")
)

func getResource(id int) (string, error) {
    if id == 0 {
        return "", ErrNotFound
    }
    if id < 0 {
        return "", ErrPermission
    }
    return "resource", nil
}

func main() {
    _, err := getResource(0)
    
    // 使用 errors.Is 比较（推荐，支持 wrapping）
    if errors.Is(err, ErrNotFound) {
        fmt.Println("资源不存在，执行创建逻辑")
    }
}
```

**命名规范**：Sentinel error 以 `Err` 前缀命名，如 `ErrNotFound`、`ErrInvalidInput`。

## 四、自定义错误类型

当需要携带额外上下文信息时，自定义错误类型更合适：

```go
// 自定义错误结构体
type ValidationError struct {
    Field   string
    Message string
    Code    int
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed for field '%s': %s (code: %d)",
        e.Field, e.Message, e.Code)
}

// 使用 errors.As 提取具体类型
func processInput(name string) error {
    if len(name) == 0 {
        return &ValidationError{
            Field:   "name",
            Message: "不能为空",
            Code:    400,
        }
    }
    if len(name) > 50 {
        return &ValidationError{
            Field:   "name",
            Message: "长度不能超过 50",
            Code:    400,
        }
    }
    return nil
}

func main() {
    err := processInput("")
    
    var valErr *ValidationError
    if errors.As(err, &valErr) {
        fmt.Printf("字段: %s, 错误码: %d\n", valErr.Field, valErr.Code)
        // 可以访问具体字段，做针对性处理
    }
}
```

## 五、Error Wrapping（错误包装）

Go 1.13 引入了错误包装机制，让错误可以形成链式结构：

```go
import (
    "errors"
    "fmt"
)

var ErrDatabase = errors.New("database error")

func queryUser(id int) (*User, error) {
    err := db.QueryRow("SELECT * FROM users WHERE id = ?", id).Scan(&user)
    if err != nil {
        // 使用 %w 包装原始错误（保留错误链）
        return nil, fmt.Errorf("queryUser id=%d: %w", id, ErrDatabase)
    }
    return &user, nil
}

func getUser(id int) (*User, error) {
    user, err := queryUser(id)
    if err != nil {
        // 继续向上包装
        return nil, fmt.Errorf("getUser: %w", err)
    }
    return user, nil
}

func main() {
    _, err := getUser(42)
    
    // errors.Is 会递归检查整个错误链
    if errors.Is(err, ErrDatabase) {
        fmt.Println("是数据库错误")
    }
    
    // 打印完整错误链
    fmt.Println(err)
    // 输出: getUser: queryUser id=42: database error
}
```

### %w vs %v 的区别

```go
// %w - 包装错误，errors.Is/As 可以解包
err1 := fmt.Errorf("操作失败: %w", ErrNotFound)
fmt.Println(errors.Is(err1, ErrNotFound)) // true

// %v - 仅格式化字符串，不保留错误链
err2 := fmt.Errorf("操作失败: %v", ErrNotFound)
fmt.Println(errors.Is(err2, ErrNotFound)) // false
```

## 六、errors.Is 与 errors.As 的使用

```go
// errors.Is：检查错误链中是否含有目标错误
func checkIs() {
    err := fmt.Errorf("layer 1: %w", fmt.Errorf("layer 2: %w", ErrNotFound))
    
    fmt.Println(errors.Is(err, ErrNotFound)) // true，会递归解包
}

// errors.As：提取错误链中特定类型的错误
func checkAs() {
    err := fmt.Errorf("wrap: %w", &ValidationError{Field: "email", Code: 400})
    
    var ve *ValidationError
    if errors.As(err, &ve) {
        fmt.Printf("Code: %d\n", ve.Code) // Code: 400
    }
}

// errors.Unwrap：手动获取包装的下层错误
func checkUnwrap() {
    inner := ErrNotFound
    outer := fmt.Errorf("outer: %w", inner)
    
    unwrapped := errors.Unwrap(outer)
    fmt.Println(unwrapped == inner) // true
}
```

## 七、生产级错误处理模式

### 7.1 错误添加堆栈信息

标准库的 error 不携带堆栈，推荐使用 `github.com/pkg/errors` 或手动记录：

```go
import pkgerrors "github.com/pkg/errors"

func readConfig(path string) error {
    f, err := os.Open(path)
    if err != nil {
        // WithStack 添加当前调用栈
        return pkgerrors.WithStack(err)
        // 或者 Wrap 同时添加消息和栈
        // return pkgerrors.Wrap(err, "read config failed")
    }
    defer f.Close()
    // ...
    return nil
}

func main() {
    err := readConfig("config.yaml")
    if err != nil {
        // 打印带堆栈的错误
        fmt.Printf("%+v\n", err)
    }
}
```

### 7.2 HTTP 层统一错误响应

```go
// 定义业务错误码
type AppError struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
    Err     error  `json:"-"` // 内部原始错误，不暴露给客户端
}

func (e *AppError) Error() string {
    if e.Err != nil {
        return fmt.Sprintf("AppError[%d]: %s: %v", e.Code, e.Message, e.Err)
    }
    return fmt.Sprintf("AppError[%d]: %s", e.Code, e.Message)
}

func (e *AppError) Unwrap() error {
    return e.Err
}

// 预定义常用错误
func NewNotFoundError(msg string, err error) *AppError {
    return &AppError{Code: 404, Message: msg, Err: err}
}

func NewInternalError(err error) *AppError {
    return &AppError{Code: 500, Message: "内部服务器错误", Err: err}
}

// Gin 中间件统一处理
func ErrorHandler() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Next()
        
        if len(c.Errors) == 0 {
            return
        }
        
        err := c.Errors.Last().Err
        var appErr *AppError
        if errors.As(err, &appErr) {
            c.JSON(appErr.Code, gin.H{
                "code":    appErr.Code,
                "message": appErr.Message,
            })
        } else {
            // 未知错误，返回 500
            c.JSON(500, gin.H{
                "code":    500,
                "message": "内部服务器错误",
            })
        }
    }
}

// 路由处理器
func getUserHandler(c *gin.Context) {
    id, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        c.Error(NewNotFoundError("用户不存在", err))
        return
    }
    
    user, err := userService.GetUser(id)
    if err != nil {
        if errors.Is(err, ErrNotFound) {
            c.Error(NewNotFoundError("用户不存在", err))
        } else {
            c.Error(NewInternalError(err))
        }
        return
    }
    
    c.JSON(200, user)
}
```

### 7.3 错误日志分级记录

```go
import "go.uber.org/zap"

type Service struct {
    logger *zap.Logger
}

func (s *Service) ProcessOrder(orderID string) error {
    order, err := s.repo.GetOrder(orderID)
    if err != nil {
        if errors.Is(err, ErrNotFound) {
            // 业务正常场景，Info 级别
            s.logger.Info("订单不存在", zap.String("orderID", orderID))
            return fmt.Errorf("ProcessOrder: %w", err)
        }
        // 意外错误，Error 级别
        s.logger.Error("查询订单失败",
            zap.String("orderID", orderID),
            zap.Error(err),
        )
        return fmt.Errorf("ProcessOrder: %w", err)
    }
    
    if err := s.payment.Charge(order); err != nil {
        s.logger.Error("支付失败",
            zap.String("orderID", orderID),
            zap.Float64("amount", order.Amount),
            zap.Error(err),
        )
        return fmt.Errorf("ProcessOrder charge: %w", err)
    }
    
    return nil
}
```

## 八、常见反模式

### ❌ 吞掉错误

```go
// 错误：忽略返回的 error
_ = os.Remove(tmpFile)  

// 正确：记录或处理
if err := os.Remove(tmpFile); err != nil {
    log.Printf("清理临时文件失败: %v", err)
}
```

### ❌ 重复打印错误

```go
// 错误：每一层都打印日志，导致日志重复
func service() error {
    err := repo.Query()
    if err != nil {
        log.Printf("repo error: %v", err) // 第一次打印
        return err
    }
    return nil
}

func handler() {
    err := service()
    if err != nil {
        log.Printf("service error: %v", err) // 第二次打印，重复！
    }
}

// 正确：只在最顶层（入口）打印日志，中间层只包装和传递
func service() error {
    err := repo.Query()
    if err != nil {
        return fmt.Errorf("service.Query: %w", err) // 只包装，不打印
    }
    return nil
}

func handler() {
    err := service()
    if err != nil {
        log.Printf("handler error: %v", err) // 只在顶层打印一次
    }
}
```

### ❌ 过于宽泛的错误信息

```go
// 错误：信息不足，无法定位问题
return errors.New("error occurred")

// 正确：包含操作、参数、原因
return fmt.Errorf("getUser(id=%d): %w", id, ErrNotFound)
```

### ❌ panic 代替 error

```go
// 错误：用 panic 处理可预期的业务错误
func divide(a, b int) int {
    if b == 0 {
        panic("division by zero") // 不应该
    }
    return a / b
}

// 正确：返回 error
func divide(a, b int) (int, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}
```

> **panic 的合理使用场景**：程序初始化时检测到无法恢复的配置错误（如数据库连接失败），或者明确的编程错误（如传入了 nil 的必须参数）。

## 九、errors 包完整 API

```go
import "errors"

// 创建简单错误
err := errors.New("something went wrong")

// 检查错误链（递归 Unwrap）
ok := errors.Is(err, target)

// 提取错误链中的特定类型
var target *MyError
ok := errors.As(err, &target)

// 手动解包一层
inner := errors.Unwrap(err)

// Go 1.20+：Join 多个错误
combined := errors.Join(err1, err2, err3)
// errors.Is(combined, err1) == true
```

## 十、总结

| 场景 | 推荐方案 |
|------|----------|
| 简单错误 | `errors.New` |
| 带格式的错误 | `fmt.Errorf("%w", err)` |
| 可比较的错误 | Sentinel error（`var ErrXxx = errors.New(...)`）|
| 需要额外字段 | 自定义错误类型（实现 `error` 接口）|
| 检查错误类型 | `errors.Is` / `errors.As` |
| HTTP 层统一响应 | 自定义 `AppError` + 中间件 |
| 错误日志 | 只在最顶层记录，中间层只包装 |

Go 的错误处理看似繁琐，但显式的错误传递让代码流程更透明、更健壮。掌握这些模式，你的 Go 代码将更加专业。
