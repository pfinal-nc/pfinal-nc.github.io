---
title: "Go JWT 认证与授权实战"
date: 2026-04-22 00:00:00
author: PFinal南丞
description: "深入学习 Go 语言 JWT 认证实现，掌握 Token 生成、验证、刷新机制，以及 RBAC 权限控制，构建安全的 API 认证系统。"
keywords:
  - Go
  - JWT
  - 认证
  - 授权
  - RBAC
  - Token
  - 安全
tags:
  - golang
  - jwt
  - authentication
  - authorization
  - security
---

# Go JWT 认证与授权实战

JWT（JSON Web Token）是一种开放标准，用于在各方之间安全地传输信息。本文将介绍如何在 Go 项目中实现 JWT 认证和授权。

## JWT 基础

### JWT 结构

```
JWT = Header.Payload.Signature

示例：
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### 组成部分

| 部分 | 说明 | 示例 |
|------|------|------|
| Header | 算法和类型 | `{"alg":"HS256","typ":"JWT"}` |
| Payload | 声明数据 | `{"sub":"123","name":"John"}` |
| Signature | 签名 | HMACSHA256(base64Url(header) + "." + base64Url(payload), secret) |

## 基础实现

### 安装依赖

```bash
go get github.com/golang-jwt/jwt/v5
go get github.com/gin-gonic/gin
```

### JWT 工具类

```go
package auth

import (
    "errors"
    "time"
    
    "github.com/golang-jwt/jwt/v5"
)

// Claims 自定义声明
type Claims struct {
    UserID   uint   `json:"user_id"`
    Username string `json:"username"`
    Role     string `json:"role"`
    jwt.RegisteredClaims
}

// JWTConfig JWT 配置
type JWTConfig struct {
    SecretKey       string
    AccessTokenTTL  time.Duration
    RefreshTokenTTL time.Duration
    Issuer          string
}

// JWTManager JWT 管理器
type JWTManager struct {
    config *JWTConfig
}

// NewJWTManager 创建 JWT 管理器
func NewJWTManager(config *JWTConfig) *JWTManager {
    return &JWTManager{config: config}
}

// GenerateToken 生成访问令牌
func (m *JWTManager) GenerateToken(userID uint, username, role string) (string, error) {
    claims := Claims{
        UserID:   userID,
        Username: username,
        Role:     role,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(m.config.AccessTokenTTL)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            NotBefore: jwt.NewNumericDate(time.Now()),
            Issuer:    m.config.Issuer,
            Subject:   username,
        },
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(m.config.SecretKey))
}

// GenerateRefreshToken 生成刷新令牌
func (m *JWTManager) GenerateRefreshToken(userID uint) (string, error) {
    claims := jwt.RegisteredClaims{
        ExpiresAt: jwt.NewNumericDate(time.Now().Add(m.config.RefreshTokenTTL)),
        IssuedAt:  jwt.NewNumericDate(time.Now()),
        Subject:   string(rune(userID)),
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(m.config.SecretKey))
}

// ParseToken 解析令牌
func (m *JWTManager) ParseToken(tokenString string) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, errors.New("unexpected signing method")
        }
        return []byte(m.config.SecretKey), nil
    })
    
    if err != nil {
        return nil, err
    }
    
    if claims, ok := token.Claims.(*Claims); ok && token.Valid {
        return claims, nil
    }
    
    return nil, errors.New("invalid token")
}

// ValidateToken 验证令牌
func (m *JWTManager) ValidateToken(tokenString string) error {
    _, err := m.ParseToken(tokenString)
    return err
}
```

## Gin 中间件集成

### 认证中间件

```go
package middleware

import (
    "net/http"
    "strings"
    
    "github.com/gin-gonic/gin"
    "yourapp/auth"
)

// AuthMiddleware JWT 认证中间件
func AuthMiddleware(jwtManager *auth.JWTManager) gin.HandlerFunc {
    return func(c *gin.Context) {
        // 获取 Authorization 头
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
            c.Abort()
            return
        }
        
        // 提取 Bearer token
        parts := strings.SplitN(authHeader, " ", 2)
        if !(len(parts) == 2 && parts[0] == "Bearer") {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header format"})
            c.Abort()
            return
        }
        
        // 解析令牌
        claims, err := jwtManager.ParseToken(parts[1])
        if err != nil {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
            c.Abort()
            return
        }
        
        // 将用户信息存入上下文
        c.Set("userID", claims.UserID)
        c.Set("username", claims.Username)
        c.Set("role", claims.Role)
        
        c.Next()
    }
}
```

### 授权中间件

```go
package middleware

import (
    "net/http"
    
    "github.com/gin-gonic/gin"
)

// RoleAuthMiddleware 角色授权中间件
func RoleAuthMiddleware(allowedRoles ...string) gin.HandlerFunc {
    return func(c *gin.Context) {
        role, exists := c.Get("role")
        if !exists {
            c.JSON(http.StatusForbidden, gin.H{"error": "role not found"})
            c.Abort()
            return
        }
        
        userRole := role.(string)
        for _, allowedRole := range allowedRoles {
            if userRole == allowedRole {
                c.Next()
                return
            }
        }
        
        c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
        c.Abort()
    }
}
```

## 完整示例

### 用户服务

```go
package service

import (
    "errors"
    "time"
    
    "golang.org/x/crypto/bcrypt"
    "yourapp/auth"
    "yourapp/model"
)

// UserService 用户服务
type UserService struct {
    jwtManager *auth.JWTManager
    userRepo   *model.UserRepository
}

// NewUserService 创建用户服务
func NewUserService(jwtManager *auth.JWTManager, userRepo *model.UserRepository) *UserService {
    return &UserService{
        jwtManager: jwtManager,
        userRepo:   userRepo,
    }
}

// RegisterRequest 注册请求
type RegisterRequest struct {
    Username string `json:"username" binding:"required,min=3,max=32"`
    Password string `json:"password" binding:"required,min=6,max=128"`
    Email    string `json:"email" binding:"required,email"`
}

// LoginRequest 登录请求
type LoginRequest struct {
    Username string `json:"username" binding:"required"`
    Password string `json:"password" binding:"required"`
}

// LoginResponse 登录响应
type LoginResponse struct {
    AccessToken  string `json:"access_token"`
    RefreshToken string `json:"refresh_token"`
    ExpiresIn    int64  `json:"expires_in"`
    TokenType    string `json:"token_type"`
}

// Register 用户注册
func (s *UserService) Register(req *RegisterRequest) error {
    // 检查用户是否存在
    existingUser, _ := s.userRepo.FindByUsername(req.Username)
    if existingUser != nil {
        return errors.New("username already exists")
    }
    
    // 密码哈希
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        return err
    }
    
    // 创建用户
    user := &model.User{
        Username: req.Username,
        Password: string(hashedPassword),
        Email:    req.Email,
        Role:     "user",
    }
    
    return s.userRepo.Create(user)
}

// Login 用户登录
func (s *UserService) Login(req *LoginRequest) (*LoginResponse, error) {
    // 查找用户
    user, err := s.userRepo.FindByUsername(req.Username)
    if err != nil {
        return nil, errors.New("invalid credentials")
    }
    
    // 验证密码
    err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
    if err != nil {
        return nil, errors.New("invalid credentials")
    }
    
    // 生成令牌
    accessToken, err := s.jwtManager.GenerateToken(user.ID, user.Username, user.Role)
    if err != nil {
        return nil, err
    }
    
    refreshToken, err := s.jwtManager.GenerateRefreshToken(user.ID)
    if err != nil {
        return nil, err
    }
    
    return &LoginResponse{
        AccessToken:  accessToken,
        RefreshToken: refreshToken,
        ExpiresIn:    int64(2 * time.Hour.Seconds()),
        TokenType:    "Bearer",
    }, nil
}

// RefreshToken 刷新令牌
func (s *UserService) RefreshToken(refreshToken string) (*LoginResponse, error) {
    // 解析刷新令牌
    claims, err := s.jwtManager.ParseToken(refreshToken)
    if err != nil {
        return nil, errors.New("invalid refresh token")
    }
    
    // 查找用户
    user, err := s.userRepo.FindByID(claims.UserID)
    if err != nil {
        return nil, errors.New("user not found")
    }
    
    // 生成新令牌
    accessToken, err := s.jwtManager.GenerateToken(user.ID, user.Username, user.Role)
    if err != nil {
        return nil, err
    }
    
    newRefreshToken, err := s.jwtManager.GenerateRefreshToken(user.ID)
    if err != nil {
        return nil, err
    }
    
    return &LoginResponse{
        AccessToken:  accessToken,
        RefreshToken: newRefreshToken,
        ExpiresIn:    int64(2 * time.Hour.Seconds()),
        TokenType:    "Bearer",
    }, nil
}
```

### API 路由

```go
package main

import (
    "time"
    
    "github.com/gin-gonic/gin"
    "yourapp/auth"
    "yourapp/handler"
    "yourapp/middleware"
    "yourapp/service"
)

func main() {
    // JWT 配置
    jwtConfig := &auth.JWTConfig{
        SecretKey:       "your-secret-key-change-in-production",
        AccessTokenTTL:  2 * time.Hour,
        RefreshTokenTTL: 7 * 24 * time.Hour,
        Issuer:          "yourapp",
    }
    jwtManager := auth.NewJWTManager(jwtConfig)
    
    // 服务初始化
    userService := service.NewUserService(jwtManager, nil)
    userHandler := handler.NewUserHandler(userService)
    
    // 路由设置
    r := gin.Default()
    
    // 公开路由
    public := r.Group("/api/v1")
    {
        public.POST("/auth/register", userHandler.Register)
        public.POST("/auth/login", userHandler.Login)
        public.POST("/auth/refresh", userHandler.RefreshToken)
    }
    
    // 受保护路由
    protected := r.Group("/api/v1")
    protected.Use(middleware.AuthMiddleware(jwtManager))
    {
        protected.GET("/user/profile", userHandler.GetProfile)
        protected.PUT("/user/profile", userHandler.UpdateProfile)
    }
    
    // 管理员路由
    admin := r.Group("/api/v1/admin")
    admin.Use(middleware.AuthMiddleware(jwtManager))
    admin.Use(middleware.RoleAuthMiddleware("admin"))
    {
        admin.GET("/users", userHandler.ListUsers)
        admin.DELETE("/users/:id", userHandler.DeleteUser)
    }
    
    r.Run(":8080")
}
```

## RBAC 权限控制

### 权限模型

```go
package rbac

// Permission 权限
type Permission struct {
    ID   uint   `json:"id"`
    Name string `json:"name"`
    Code string `json:"code"`
}

// Role 角色
type Role struct {
    ID          uint          `json:"id"`
    Name        string        `json:"name"`
    Permissions []*Permission `json:"permissions"`
}

// RBACManager 权限管理器
type RBACManager struct {
    roles       map[string]*Role
    permissions map[string]*Permission
}

// NewRBACManager 创建权限管理器
func NewRBACManager() *RBACManager {
    return &RBACManager{
        roles:       make(map[string]*Role),
        permissions: make(map[string]*Permission),
    }
}

// AddRole 添加角色
func (r *RBACManager) AddRole(role *Role) {
    r.roles[role.Name] = role
}

// AddPermission 添加权限
func (r *RBACManager) AddPermission(perm *Permission) {
    r.permissions[perm.Code] = perm
}

// HasPermission 检查角色是否有权限
func (r *RBACManager) HasPermission(roleName, permCode string) bool {
    role, exists := r.roles[roleName]
    if !exists {
        return false
    }
    
    for _, perm := range role.Permissions {
        if perm.Code == permCode {
            return true
        }
    }
    return false
}

// 预定义权限
var (
    PermUserCreate = &Permission{ID: 1, Name: "创建用户", Code: "user:create"}
    PermUserRead   = &Permission{ID: 2, Name: "查看用户", Code: "user:read"}
    PermUserUpdate = &Permission{ID: 3, Name: "更新用户", Code: "user:update"}
    PermUserDelete = &Permission{ID: 4, Name: "删除用户", Code: "user:delete"}
)
```

## 安全最佳实践

1. **密钥管理**：使用环境变量或密钥管理服务存储密钥
2. **HTTPS**：生产环境必须使用 HTTPS
3. **令牌过期**：设置合理的过期时间
4. **刷新令牌**：使用刷新令牌机制避免频繁登录
5. **黑名单**：支持令牌黑名单实现登出功能
6. **密码安全**：使用 bcrypt 等强哈希算法

## 总结

JWT 是实现 API 认证的标准方案，通过合理的配置和最佳实践，可以构建安全可靠的认证系统。

---

**参考资源：**
- [JWT 官方文档](https://jwt.io/)
- [golang-jwt 库](https://github.com/golang-jwt/jwt)
