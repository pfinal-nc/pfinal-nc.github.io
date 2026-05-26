---
title: "Project 2: 用户模块"
description: "注册、登录、JWT、权限管理"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, project, user, auth, jwt, lesson]
---

# Project 2: 用户模块

## 学习目标

- 实现用户注册和登录 API
- 集成 JWT 认证和 RBAC 权限

---

## 核心接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/v1/auth/register | 用户注册 | 公开 |
| POST | /api/v1/auth/login | 用户登录 | 公开 |
| GET | /api/v1/users/:id | 获取用户 | 登录用户 |
| PUT | /api/v1/users/:id | 更新用户 | 本人/管理员 |
| GET | /api/v1/admin/users | 用户列表 | 管理员 |

## 代码骨架

```go
// internal/handler/user.go
func (h *UserHandler) Register(c *gin.Context) {
    var req model.RegisterRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        response.Error(c, http.StatusBadRequest, err.Error())
        return
    }
    user, err := h.service.Register(c.Request.Context(), &req)
    if err != nil {
        response.Error(c, http.StatusConflict, err.Error())
        return
    }
    response.Success(c, user)
}
```
