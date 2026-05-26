---
title: "Project 1: 项目搭建"
description: "目录结构、依赖管理、配置加载、Gin 初始化"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, project, setup, gin, lesson]
---

# Project 1: 项目搭建

## 学习目标

- 建立规范的项目目录结构
- 完成 Gin 框架的初始化和基础配置

---

## 推荐项目结构

```
blog-api/
├── cmd/
│   └── server/
│       └── main.go        # 入口
├── internal/
│   ├── handler/            # HTTP 处理器
│   ├── service/            # 业务逻辑
│   ├── repository/         # 数据访问
│   ├── model/              # 数据模型
│   ├── middleware/          # 中间件
│   └── config/             # 配置
├── pkg/
│   └── response/           # 公共响应
├── config.yaml
├── go.mod
└── go.sum
```

## 初始化代码

```go
// cmd/server/main.go
func main() {
    cfg := config.Load("config.yaml")

    r := gin.New()
    r.Use(
        middleware.Logger(),
        middleware.CORS(),
        middleware.Recovery(),
        middleware.RateLimit(cfg.RateLimit),
    )

    // 注册路由
    api := r.Group("/api/v1")
    {
        handler.RegisterUserRoutes(api)
        handler.RegisterArticleRoutes(api)
    }

    r.Run(":" + cfg.Port)
}
```
