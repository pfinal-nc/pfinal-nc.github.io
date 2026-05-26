---
title: "Lesson 2.2: Gin 框架核心"
description: "Gin 框架路由、中间件、参数绑定、验证全面实战"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, gin, web, middleware, routing, lesson]
---

# Lesson 2.2: Gin 框架核心

## 学习目标

- 掌握 Gin 框架的路由定义与分组
- 理解中间件的执行顺序与作用域
- 熟练使用参数绑定和验证

---

## 1. 路由定义

```go
func main() {
    r := gin.Default()

    // 基本路由
    r.GET("/ping", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"message": "pong"})
    })

    // 路径参数
    r.GET("/users/:id", func(c *gin.Context) {
        id := c.Param("id")
        c.JSON(http.StatusOK, gin.H{"user_id": id})
    })

    // 查询参数
    r.GET("/search", func(c *gin.Context) {
        q := c.DefaultQuery("q", "")
        page := c.Query("page")
        c.JSON(http.StatusOK, gin.H{"query": q, "page": page})
    })

    // 路由分组
    api := r.Group("/api/v1")
    {
        api.GET("/users", listUsers)
        api.POST("/users", createUser)
        api.PUT("/users/:id", updateUser)
        api.DELETE("/users/:id", deleteUser)
    }

    r.Run(":8080") // 默认 0.0.0.0:8080
}
```

## 2. 中间件

```go
// 全局中间件
r.Use(gin.Logger())
r.Use(gin.Recovery())

// 自定义中间件
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        if token == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "missing authorization header",
            })
            return
        }
        // 验证 token...
        c.Set("user_id", "123") // 在上下文中设置值
        c.Next()
    }
}

// 路由组级别中间件
authorized := r.Group("/admin")
authorized.Use(AuthMiddleware())
{
    authorized.GET("/dashboard", adminDashboard)
}

// 路由级中间件
r.GET("/protected", AuthMiddleware(), protectedHandler)
```

## 3. 请求绑定与验证

```go
type CreateUserRequest struct {
    Name     string `json:"name" binding:"required,min=2,max=50"`
    Email    string `json:"email" binding:"required,email"`
    Age      int    `json:"age" binding:"gte=0,lte=150"`
    Password string `json:"password" binding:"required,min=8"`
}

func createUser(c *gin.Context) {
    var req CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": validationError(err),
        })
        return
    }
    // 业务逻辑...
    c.JSON(http.StatusCreated, gin.H{"message": "created"})
}

// 自定义验证错误消息
func validationError(err error) map[string]string {
    errors := make(map[string]string)
    var ve validator.ValidationErrors
    if errors.As(err, &ve) {
        for _, fe := range ve {
            errors[fe.Field()] = msgForTag(fe.Tag())
        }
    }
    return errors
}
```

## 4. 响应格式

```go
// 统一响应结构
type Response struct {
    Code    int         `json:"code"`
    Message string      `json:"message"`
    Data    interface{} `json:"data,omitempty"`
}

func Success(c *gin.Context, data interface{}) {
    c.JSON(http.StatusOK, Response{
        Code:    0,
        Message: "success",
        Data:    data,
    })
}

func Error(c *gin.Context, httpStatus int, message string) {
    c.JSON(httpStatus, Response{
        Code:    httpStatus,
        Message: message,
    })
}
```

## 练习

1. 用 Gin 实现一个 RESTful 用户管理 API（CRUD），包含参数验证和统一错误处理。

2. 编写一个 Rate Limit 中间件，用 `sync.Map` 存储每个 IP 的请求计数。
