---
title: "Lesson 2.4: 认证与授权"
description: "JWT、OAuth2、RBAC 权限模型实战"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, auth, jwt, oauth2, rbac, lesson]
---

# Lesson 2.4: 认证与授权

## 学习目标

- 实现基于 JWT 的用户认证
- 理解 RBAC 权限模型的数据库设计

---

## 1. JWT 认证实现

```go
// JWT 中间件
func JWTAuth(secret string) gin.HandlerFunc {
    return func(c *gin.Context) {
        tokenString := c.GetHeader("Authorization")
        if tokenString == "" || !strings.HasPrefix(tokenString, "Bearer ") {
            c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})
            return
        }

        tokenString = strings.TrimPrefix(tokenString, "Bearer ")
        claims := &Claims{}
        token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
            return []byte(secret), nil
        })

        if err != nil || !token.Valid {
            c.AbortWithStatusJSON(401, gin.H{"error": "invalid token"})
            return
        }

        c.Set("user_id", claims.UserID)
        c.Set("role", claims.Role)
        c.Next()
    }
}
```

## 2. RBAC 权限模型

```go
// 数据库模型
type User struct {
    ID   uint   `gorm:"primaryKey"`
    Role string `gorm:"size:50;not null"` // admin, editor, viewer
}

// 权限检查
type Permission struct {
    Resource string   // "article", "user", "system"
    Actions  []string // "create", "read", "update", "delete"
}

var rolePermissions = map[string][]Permission{
    "admin": {
        {Resource: "article", Actions: []string{"create", "read", "update", "delete"}},
        {Resource: "user", Actions: []string{"create", "read", "update", "delete"}},
    },
    "editor": {
        {Resource: "article", Actions: []string{"create", "read", "update"}},
        {Resource: "user", Actions: []string{"read"}},
    },
    "viewer": {
        {Resource: "article", Actions: []string{"read"}},
    },
}

// 权限中间件
func RequirePermission(resource string, action string) gin.HandlerFunc {
    return func(c *gin.Context) {
        role := c.GetString("role")
        permissions := rolePermissions[role]

        for _, p := range permissions {
            if p.Resource == resource {
                for _, a := range p.Actions {
                    if a == action {
                        c.Next()
                        return
                    }
                }
            }
        }

        c.AbortWithStatusJSON(403, gin.H{"error": "forbidden"})
    }
}
```

## 练习

1. 实现 JWT 的 Access Token + Refresh Token 双 Token 机制。

2. 阅读 [go-jwt-auth](/dev/backend/golang/go-jwt-auth) 查看更多 JWT 实现细节。
