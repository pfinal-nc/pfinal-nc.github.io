---
title: "接口参数设计 - 多场景复用的优雅之道"
description: "深入讲解 Go 语言接口参数设计的高级技巧，包括泛型、可选参数、Builder 模式等，帮助你设计可复用、易维护的 API 接口。"
keywords:
  - Go 接口设计
  - 参数设计
  - 泛型
  - Builder 模式
  - 可选参数
author: PFinal南丞
date: 2026-04-22
tags:
  - golang
  - api-design
  - interface
  - generics
---

# 接口参数设计 - 多场景复用的优雅之道

> 好的接口设计能让代码更易用、易维护。本文介绍 Go 语言中接口参数设计的最佳实践。

## 一、基础参数设计

### 1.1 函数选项模式（Functional Options）

```go
// 定义选项类型
type ServerOption func(*Server)

// Server 结构体
type Server struct {
    host     string
    port     int
    timeout  time.Duration
    maxConns int
    tls      *tls.Config
}

// 选项函数
func WithHost(host string) ServerOption {
    return func(s *Server) {
        s.host = host
    }
}

func WithPort(port int) ServerOption {
    return func(s *Server) {
        s.port = port
    }
}

func WithTimeout(timeout time.Duration) ServerOption {
    return func(s *Server) {
        s.timeout = timeout
    }
}

func WithTLS(config *tls.Config) ServerOption {
    return func(s *Server) {
        s.tls = config
    }
}

// 构造函数
func NewServer(opts ...ServerOption) *Server {
    s := &Server{
        host:     "0.0.0.0",
        port:     8080,
        timeout:  30 * time.Second,
        maxConns: 100,
    }
    
    for _, opt := range opts {
        opt(s)
    }
    
    return s
}

// 使用示例
server := NewServer(
    WithHost("localhost"),
    WithPort(9090),
    WithTimeout(60*time.Second),
)
```

### 1.2 Builder 模式

```go
type QueryBuilder struct {
    table   string
    select_ []string
    where   []Condition
    orderBy []string
    limit   int
    offset  int
}

func NewQueryBuilder(table string) *QueryBuilder {
    return &QueryBuilder{
        table:   table,
        select_: []string{"*"},
        where:   make([]Condition, 0),
        orderBy: make([]string, 0),
    }
}

func (qb *QueryBuilder) Select(columns ...string) *QueryBuilder {
    qb.select_ = columns
    return qb
}

func (qb *QueryBuilder) Where(column string, operator string, value interface{}) *QueryBuilder {
    qb.where = append(qb.where, Condition{column, operator, value})
    return qb
}

func (qb *QueryBuilder) OrderBy(column string, desc bool) *QueryBuilder {
    direction := "ASC"
    if desc {
        direction = "DESC"
    }
    qb.orderBy = append(qb.orderBy, fmt.Sprintf("%s %s", column, direction))
    return qb
}

func (qb *QueryBuilder) Limit(limit int) *QueryBuilder {
    qb.limit = limit
    return qb
}

func (qb *QueryBuilder) Build() (string, []interface{}) {
    // 构建 SQL 查询
    return qb.buildQuery()
}

// 使用示例
query, args := NewQueryBuilder("users").
    Select("id", "name", "email").
    Where("age", ">", 18).
    Where("status", "=", "active").
    OrderBy("created_at", true).
    Limit(10).
    Build()
```

## 二、泛型参数设计

### 2.1 泛型函数

```go
// 通用过滤函数
func Filter[T any](slice []T, predicate func(T) bool) []T {
    result := make([]T, 0)
    for _, item := range slice {
        if predicate(item) {
            result = append(result, item)
        }
    }
    return result
}

// 通用映射函数
func Map[T, R any](slice []T, transform func(T) R) []R {
    result := make([]R, len(slice))
    for i, item := range slice {
        result[i] = transform(item)
    }
    return result
}

// 使用示例
numbers := []int{1, 2, 3, 4, 5}

// 过滤偶数
evens := Filter(numbers, func(n int) bool {
    return n%2 == 0
})

// 映射为字符串
strings := Map(numbers, func(n int) string {
    return fmt.Sprintf("number-%d", n)
})
```

### 2.2 泛型接口

```go
// 定义泛型存储接口
type Store[T any] interface {
    Get(id string) (T, error)
    Set(id string, value T) error
    Delete(id string) error
    List() ([]T, error)
}

// 实现
type MemoryStore[T any] struct {
    data map[string]T
    mu   sync.RWMutex
}

func NewMemoryStore[T any]() *MemoryStore[T] {
    return &MemoryStore[T]{
        data: make(map[string]T),
    }
}

func (s *MemoryStore[T]) Get(id string) (T, error) {
    s.mu.RLock()
    defer s.mu.RUnlock()
    
    value, ok := s.data[id]
    if !ok {
        var zero T
        return zero, fmt.Errorf("not found")
    }
    return value, nil
}

func (s *MemoryStore[T]) Set(id string, value T) error {
    s.mu.Lock()
    defer s.mu.Unlock()
    
    s.data[id] = value
    return nil
}

// 使用示例
userStore := NewMemoryStore[User]()
productStore := NewMemoryStore[Product]()
```

## 三、参数验证

### 3.1 结构体验证

```go
type CreateUserRequest struct {
    Name     string `json:"name" validate:"required,min=2,max=50"`
    Email    string `json:"email" validate:"required,email"`
    Age      int    `json:"age" validate:"gte=0,lte=150"`
    Password string `json:"password" validate:"required,min=8"`
}

func (r *CreateUserRequest) Validate() error {
    validate := validator.New()
    return validate.Struct(r)
}

// 使用
func createUserHandler(c *gin.Context) {
    var req CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    
    if err := req.Validate(); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    
    // 处理请求
}
```

### 3.2 自定义验证器

```go
// 自定义验证标签
func init() {
    validate := validator.New()
    
    // 注册自定义验证器
    validate.RegisterValidation("phone", validatePhone)
    validate.RegisterValidation("strong_password", validateStrongPassword)
}

func validatePhone(fl validator.FieldLevel) bool {
    phone := fl.Field().String()
    // 验证手机号格式
    matched, _ := regexp.MatchString(`^1[3-9]\d{9}$`, phone)
    return matched
}

func validateStrongPassword(fl validator.FieldLevel) bool {
    password := fl.Field().String()
    // 至少包含一个大写字母、一个小写字母、一个数字
    hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
    hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
    hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)
    
    return hasUpper && hasLower && hasNumber
}
```

## 四、多场景复用设计

### 4.1 通用响应结构

```go
// 标准响应结构
type Response[T any] struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
    Data    T      `json:"data,omitempty"`
}

// 分页响应
type PaginatedResponse[T any] struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
    Data    struct {
        List     []T   `json:"list"`
        Total    int64 `json:"total"`
        Page     int   `json:"page"`
        PageSize int   `json:"page_size"`
    } `json:"data"`
}

// 成功响应
func Success[T any](data T) Response[T] {
    return Response[T]{
        Code:    0,
        Message: "success",
        Data:    data,
    }
}

// 错误响应
func Error(code int, message string) Response[any] {
    return Response[any]{
        Code:    code,
        Message: message,
    }
}

// 分页响应
func Paginated[T any](list []T, total int64, page, pageSize int) PaginatedResponse[T] {
    resp := PaginatedResponse[T]{}
    resp.Code = 0
    resp.Message = "success"
    resp.Data.List = list
    resp.Data.Total = total
    resp.Data.Page = page
    resp.Data.PageSize = pageSize
    return resp
}
```

### 4.2 通用分页参数

```go
// 分页请求参数
type PaginationParams struct {
    Page     int `form:"page" json:"page" binding:"min=1"`
    PageSize int `form:"page_size" json:"page_size" binding:"min=1,max=100"`
}

func (p *PaginationParams) Normalize() {
    if p.Page <= 0 {
        p.Page = 1
    }
    if p.PageSize <= 0 {
        p.PageSize = 10
    }
    if p.PageSize > 100 {
        p.PageSize = 100
    }
}

func (p *PaginationParams) Offset() int {
    return (p.Page - 1) * p.PageSize
}

func (p *PaginationParams) Limit() int {
    return p.PageSize
}

// 排序参数
type SortParams struct {
    SortBy string `form:"sort_by" json:"sort_by"`
    Order  string `form:"order" json:"order" binding:"omitempty,oneof=asc desc"`
}

func (s *SortParams) OrderBy() string {
    if s.SortBy == "" {
        return ""
    }
    
    order := "ASC"
    if s.Order == "desc" {
        order = "DESC"
    }
    
    return fmt.Sprintf("%s %s", s.SortBy, order)
}

// 组合使用
type ListUsersRequest struct {
    PaginationParams
    SortParams
    Name   string `form:"name" json:"name"`
    Status string `form:"status" json:"status"`
}
```

## 五、总结

| 设计模式 | 适用场景 | 优点 |
|----------|----------|------|
| 函数选项 | 配置类构造函数 | 灵活、可扩展 |
| Builder | 复杂对象构建 | 清晰、链式调用 |
| 泛型 | 通用算法/数据结构 | 类型安全、复用 |
| 结构体验证 | 请求参数验证 | 声明式、自动化 |

好的接口参数设计能让代码更易用、易维护、易测试。
