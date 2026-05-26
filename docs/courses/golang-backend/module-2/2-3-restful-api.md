---
title: "Lesson 2.3: RESTful API 设计"
description: "资源命名、HTTP 方法、状态码、版本控制的最佳实践"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, restful, api-design, lesson]
---

# Lesson 2.3: RESTful API 设计

## 学习目标

- 掌握 RESTful API 的设计规范
- 理解 API 版本控制的策略

---

## 1. RESTful 设计原则

### 资源命名

```go
// ✅ 正确
GET    /api/v1/users          // 资源列表
GET    /api/v1/users/:id      // 单个资源
POST   /api/v1/users          // 创建资源
PUT    /api/v1/users/:id      // 全量更新
PATCH  /api/v1/users/:id      // 部分更新
DELETE /api/v1/users/:id      // 删除资源

// ❌ 错误（动词命名）
GET    /api/v1/getUsers
POST   /api/v1/createUser
DELETE /api/v1/deleteUser
```

### 状态码

| 方法 | 成功 | 失败 |
|------|------|------|
| GET | 200 OK | 404 Not Found |
| POST | 201 Created | 400 Bad Request |
| PUT | 200 OK | 404 Not Found |
| DELETE | 204 No Content | 404 Not Found |

---

## 2. 分页、过滤、排序

```go
type PaginationRequest struct {
    Page     int    `form:"page" binding:"min=1"`    // 默认 1
    PageSize int    `form:"page_size" binding:"min=1,max=100"` // 默认 20
    SortBy   string `form:"sort_by"`
    Order    string `form:"order" binding:"oneof=asc desc"`
}

type PaginatedResponse struct {
    Data       interface{} `json:"data"`
    Total      int64       `json:"total"`
    Page       int         `json:"page"`
    PageSize   int         `json:"page_size"`
    TotalPages int         `json:"total_pages"`
}
```

## 推荐阅读

- [如何实现 RESTful API 版本控制](/dev/backend/golang/Go-RESTful-API-Versioning)
- [接口参数设计 - 多场景复用的优雅之道](/dev/backend/golang/Go-Interface-Parameter-Design)
