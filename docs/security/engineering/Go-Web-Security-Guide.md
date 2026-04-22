---
title: "Golang Web 应用完整安全指南"
description: "全面讲解 Go Web 应用的安全防护策略，包括认证授权、输入验证、CSRF 防护、安全头等核心安全措施。"
keywords:
  - Go Web 安全
  - 认证授权
  - CSRF 防护
  - XSS 防护
  - 安全头
author: PFinal南丞
date: 2026-04-22
tags:
  - golang
  - web-security
  - authentication
  - authorization
---

# Golang Web 应用完整安全指南

> Web 应用面临各种安全威胁。本文提供 Go Web 应用的完整安全防护方案。

## 一、认证与授权

### 1.1 JWT 认证

```go
package auth

import (
    "time"
    "github.com/golang-jwt/jwt/v5"
)

type Claims struct {
    UserID   int64  `json:"user_id"`
    Username string `json:"username"`
    Role     string `json:"role"`
    jwt.RegisteredClaims
}

func GenerateToken(userID int64, username, role string, secret []byte) (string, error) {
    claims := Claims{
        UserID:   userID,
        Username: username,
        Role:     role,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            NotBefore: jwt.NewNumericDate(time.Now()),
        },
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(secret)
}

func ParseToken(tokenString string, secret []byte) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
        }
        return secret, nil
    })
    
    if err != nil {
        return nil, err
    }
    
    if claims, ok := token.Claims.(*Claims); ok && token.Valid {
        return claims, nil
    }
    
    return nil, fmt.Errorf("invalid token")
}
```

### 1.2 RBAC 授权

```go
package auth

type Permission string

const (
    PermUserRead   Permission = "user:read"
    PermUserWrite  Permission = "user:write"
    PermAdmin      Permission = "admin"
)

type Role struct {
    Name        string
    Permissions []Permission
}

var roles = map[string]Role{
    "user": {
        Name:        "user",
        Permissions: []Permission{PermUserRead},
    },
    "admin": {
        Name:        "admin",
        Permissions: []Permission{PermUserRead, PermUserWrite, PermAdmin},
    },
}

func HasPermission(role string, permission Permission) bool {
    r, ok := roles[role]
    if !ok {
        return false
    }
    
    for _, p := range r.Permissions {
        if p == permission {
            return true
        }
    }
    return false
}

// Gin 中间件
func AuthMiddleware(secret []byte) gin.HandlerFunc {
    return func(c *gin.Context) {
        tokenString := c.GetHeader("Authorization")
        if tokenString == "" {
            c.AbortWithStatusJSON(401, gin.H{"error": "missing token"})
            return
        }
        
        // 移除 "Bearer " 前缀
        tokenString = strings.TrimPrefix(tokenString, "Bearer ")
        
        claims, err := ParseToken(tokenString, secret)
        if err != nil {
            c.AbortWithStatusJSON(401, gin.H{"error": "invalid token"})
            return
        }
        
        // 将用户信息存入 context
        c.Set("user_id", claims.UserID)
        c.Set("username", claims.Username)
        c.Set("role", claims.Role)
        
        c.Next()
    }
}

func RequirePermission(permission Permission) gin.HandlerFunc {
    return func(c *gin.Context) {
        role, _ := c.Get("role")
        if !HasPermission(role.(string), permission) {
            c.AbortWithStatusJSON(403, gin.H{"error": "forbidden"})
            return
        }
        c.Next()
    }
}
```

## 二、输入验证

```go
package validator

import (
    "github.com/go-playground/validator/v10"
)

var validate = validator.New()

type LoginRequest struct {
    Email    string `json:"email" validate:"required,email"`
    Password string `json:"password" validate:"required,min=8"`
}

type RegisterRequest struct {
    Username string `json:"username" validate:"required,min=3,max=20,alphanum"`
    Email    string `json:"email" validate:"required,email"`
    Password string `json:"password" validate:"required,min=8,containsany=ABCDEFGHIJKLMNOPQRSTUVWXYZ,containsany=abcdefghijklmnopqrstuvwxyz,containsany=0123456789"`
    Age      int    `json:"age" validate:"gte=13,lte=120"`
}

func ValidateStruct(s interface{}) error {
    return validate.Struct(s)
}

// 自定义验证器
func init() {
    validate.RegisterValidation("strong_password", validateStrongPassword)
}

func validateStrongPassword(fl validator.FieldLevel) bool {
    password := fl.Field().String()
    
    hasUpper := false
    hasLower := false
    hasNumber := false
    hasSpecial := false
    
    for _, char := range password {
        switch {
        case 'A' <= char && char <= 'Z':
            hasUpper = true
        case 'a' <= char && char <= 'z':
            hasLower = true
        case '0' <= char && char <= '9':
            hasNumber = true
        default:
            hasSpecial = true
        }
    }
    
    return hasUpper && hasLower && hasNumber && hasSpecial
}
```

## 三、CSRF 防护

```go
package middleware

import (
    "crypto/rand"
    "encoding/base64"
    "github.com/gin-gonic/gin"
)

func CSRFMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 生成 CSRF Token
        if c.Request.Method == "GET" {
            token := generateCSRFToken()
            c.SetCookie("csrf_token", token, 3600, "/", "", true, true)
            c.Set("csrf_token", token)
            c.Next()
            return
        }
        
        // 验证 CSRF Token
        if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "DELETE" {
            cookieToken, _ := c.Cookie("csrf_token")
            headerToken := c.GetHeader("X-CSRF-Token")
            
            if cookieToken == "" || headerToken == "" || cookieToken != headerToken {
                c.AbortWithStatusJSON(403, gin.H{"error": "invalid csrf token"})
                return
            }
        }
        
        c.Next()
    }
}

func generateCSRFToken() string {
    b := make([]byte, 32)
    rand.Read(b)
    return base64.URLEncoding.EncodeToString(b)
}
```

## 四、安全头设置

```go
package middleware

func SecurityHeaders() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Header("X-Content-Type-Options", "nosniff")
        c.Header("X-Frame-Options", "DENY")
        c.Header("X-XSS-Protection", "1; mode=block")
        c.Header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'")
        c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
        c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        
        c.Next()
    }
}
```

## 五、速率限制

```go
package middleware

import (
    "sync"
    "time"
    "golang.org/x/time/rate"
)

type IPRateLimiter struct {
    visitors map[string]*rate.Limiter
    mu       sync.RWMutex
    rate     rate.Limit
    burst    int
}

func NewIPRateLimiter(r rate.Limit, b int) *IPRateLimiter {
    return &IPRateLimiter{
        visitors: make(map[string]*rate.Limiter),
        rate:     r,
        burst:    b,
    }
}

func (i *IPRateLimiter) GetLimiter(ip string) *rate.Limiter {
    i.mu.Lock()
    defer i.mu.Unlock()
    
    limiter, exists := i.visitors[ip]
    if !exists {
        limiter = rate.NewLimiter(i.rate, i.burst)
        i.visitors[ip] = limiter
    }
    
    return limiter
}

func RateLimiterMiddleware() gin.HandlerFunc {
    limiter := NewIPRateLimiter(1, 5) // 每秒 1 个请求，突发 5 个
    
    return func(c *gin.Context) {
        ip := c.ClientIP()
        l := limiter.GetLimiter(ip)
        
        if !l.Allow() {
            c.AbortWithStatusJSON(429, gin.H{"error": "too many requests"})
            return
        }
        
        c.Next()
    }
}
```

## 六、总结

| 安全措施 | 实现方式 | 重要性 |
|----------|----------|--------|
| JWT 认证 | jwt-go | 高 |
| RBAC 授权 | 自定义中间件 | 高 |
| 输入验证 | go-playground/validator | 高 |
| CSRF 防护 | Token 验证 | 中 |
| 安全头 | 中间件 | 中 |
| 速率限制 | golang.org/x/time/rate | 中 |

构建安全的 Web 应用需要多层防护，不能只依赖单一措施。
