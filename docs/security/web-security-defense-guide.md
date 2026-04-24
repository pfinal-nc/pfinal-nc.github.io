---
title: Web 安全实战：常见漏洞防御指南
date: 2026-04-24
category: security
tags:
  - 安全
  - OWASP
  - SQL 注入
  - XSS
  - CSRF
description: 系统讲解 Web 安全常见漏洞的原理、检测与防御方法，包括 SQL 注入、XSS、CSRF、越权、SSRF 等 OWASP Top 10 漏洞。
---

# Web 安全实战：常见漏洞防御指南

Web 安全是每个后端开发者必须掌握的知识。本文系统讲解 OWASP Top 10 中的常见漏洞及其防御方案。

## SQL 注入

### 漏洞原理

```go
// ❌ 漏洞代码：直接拼接 SQL
func getUserByNameUnsafe(db *sql.DB, name string) (*User, error) {
    query := "SELECT * FROM users WHERE name = '" + name + "'"
    // 攻击者输入：' OR '1'='1
    // 实际 SQL：SELECT * FROM users WHERE name = '' OR '1'='1'
    row := db.QueryRow(query)
    // ...
}
```

### 防御方案

```go
// ✅ 使用参数化查询
func getUserByName(db *sql.DB, name string) (*User, error) {
    query := "SELECT id, name, email FROM users WHERE name = ?"
    row := db.QueryRow(query, name) // name 作为参数传入，不会被解释为 SQL
    
    var user User
    if err := row.Scan(&user.ID, &user.Name, &user.Email); err != nil {
        return nil, err
    }
    return &user, nil
}

// ✅ 使用 ORM（GORM 自动参数化）
func getUserByNameGORM(db *gorm.DB, name string) (*User, error) {
    var user User
    result := db.Where("name = ?", name).First(&user)
    return &user, result.Error
}
```

### 防御清单

- ✅ 永远使用参数化查询或预处理语句
- ✅ 使用 ORM 框架，避免手写 SQL
- ✅ 最小化数据库账户权限（只给查询权限的账户不能 DROP TABLE）
- ✅ 对错误信息脱敏，不暴露数据库结构
- ✅ 使用 WAF 进行额外防护

## XSS（跨站脚本攻击）

### 漏洞类型

```
存储型 XSS：攻击脚本存入数据库，用户访问时执行
反射型 XSS：脚本在 URL 参数中，通过链接触发
DOM 型 XSS：前端 JavaScript 直接操作 DOM
```

### 防御方案

**后端输出转义：**

```go
import "html/template"

// ✅ 使用 html/template 自动转义
func renderPage(w http.ResponseWriter, userInput string) {
    tmpl := template.Must(template.New("page").Parse(`
        <html><body>
            <p>用户输入：{{.}}</p>
        </body></html>
    `))
    // template 自动将 <script> 转义为 &lt;script&gt;
    tmpl.Execute(w, userInput)
}

// ❌ 危险：不要使用 text/template
import "text/template"
// text/template 不做 HTML 转义！
```

**前端防御：**

```javascript
// ❌ 危险：直接设置 innerHTML
element.innerHTML = userInput;

// ✅ 安全：使用 textContent
element.textContent = userInput;

// ✅ 必须插入 HTML 时，使用 DOMPurify 消毒
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);
```

**Content Security Policy（CSP）：**

```go
// 设置 CSP 响应头
func setSecurityHeaders(w http.ResponseWriter) {
    w.Header().Set("Content-Security-Policy",
        "default-src 'self'; "+
        "script-src 'self' 'nonce-{随机值}'; "+
        "style-src 'self' 'unsafe-inline'; "+
        "img-src 'self' data: https:; "+
        "frame-ancestors 'none'")
    
    w.Header().Set("X-XSS-Protection", "1; mode=block")
    w.Header().Set("X-Content-Type-Options", "nosniff")
}
```

## CSRF（跨站请求伪造）

### 漏洞原理

```
用户登录了 bank.com
攻击者在 evil.com 放了隐藏表单
用户访问 evil.com 时，表单自动提交到 bank.com
浏览器携带 bank.com 的 Cookie，转账请求成功
```

### 防御方案

```go
package middleware

import (
    "crypto/rand"
    "encoding/hex"
    "net/http"
)

// CSRF Token 验证中间件
func CSRFMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // GET 请求不需要 CSRF 保护
        if r.Method == "GET" || r.Method == "HEAD" || r.Method == "OPTIONS" {
            // 生成并设置 CSRF token
            token := generateCSRFToken()
            http.SetCookie(w, &http.Cookie{
                Name:     "csrf_token",
                Value:    token,
                HttpOnly: false, // 前端 JS 需要读取
                Secure:   true,
                SameSite: http.SameSiteStrictMode,
            })
            next.ServeHTTP(w, r)
            return
        }

        // POST/PUT/DELETE：验证 CSRF token
        cookieToken, err := r.Cookie("csrf_token")
        if err != nil {
            http.Error(w, "Missing CSRF token", http.StatusForbidden)
            return
        }

        // 从请求头或表单中获取 token
        headerToken := r.Header.Get("X-CSRF-Token")
        if headerToken == "" {
            headerToken = r.FormValue("csrf_token")
        }

        if cookieToken.Value != headerToken {
            http.Error(w, "Invalid CSRF token", http.StatusForbidden)
            return
        }

        next.ServeHTTP(w, r)
    })
}

func generateCSRFToken() string {
    bytes := make([]byte, 32)
    rand.Read(bytes)
    return hex.EncodeToString(bytes)
}
```

**SameSite Cookie：**

```go
// 设置 SameSite Cookie（最简单的 CSRF 防御）
http.SetCookie(w, &http.Cookie{
    Name:     "session",
    Value:    sessionID,
    HttpOnly: true,
    Secure:   true,
    SameSite: http.SameSiteStrictMode, // 阻止跨站请求携带 Cookie
    Path:     "/",
})
```

## 越权访问

### 水平越权

```go
// ❌ 漏洞：只验证登录，没验证资源所有权
func getOrder(w http.ResponseWriter, r *http.Request) {
    orderID := r.URL.Query().Get("id")
    order, _ := db.GetOrder(orderID)  // 任何登录用户都能看到任意订单
    json.NewEncoder(w).Encode(order)
}

// ✅ 修复：验证资源属于当前用户
func getOrderSecure(w http.ResponseWriter, r *http.Request) {
    currentUserID := getAuthenticatedUserID(r) // 从 JWT/Session 获取
    orderID := r.URL.Query().Get("id")
    
    order, err := db.GetOrderByIDAndUserID(orderID, currentUserID)
    if err != nil || order == nil {
        http.Error(w, "Order not found", http.StatusNotFound)
        return
    }
    
    json.NewEncoder(w).Encode(order)
}
```

### 垂直越权

```go
// RBAC 权限控制中间件
func RequireRole(roles ...string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            user := getCurrentUser(r)
            
            for _, role := range roles {
                if user.HasRole(role) {
                    next.ServeHTTP(w, r)
                    return
                }
            }
            
            http.Error(w, "Forbidden", http.StatusForbidden)
        })
    }
}

// 使用
mux.Handle("/admin/users", RequireRole("admin")(adminUsersHandler))
mux.Handle("/api/orders", RequireRole("user", "admin")(ordersHandler))
```

## SSRF（服务端请求伪造）

### 漏洞原理

```go
// ❌ 漏洞：直接使用用户提供的 URL 发请求
func fetchURL(w http.ResponseWriter, r *http.Request) {
    url := r.URL.Query().Get("url")
    // 攻击者可以传入：http://169.254.169.254/latest/meta-data/
    // 从而获取 AWS EC2 实例的元数据（包含密钥）
    resp, _ := http.Get(url)
    // ...
}
```

### 防御方案

```go
import (
    "net"
    "net/url"
    "fmt"
)

// URL 白名单验证
var allowedHosts = map[string]bool{
    "api.github.com": true,
    "api.example.com": true,
}

func validateURL(rawURL string) error {
    u, err := url.Parse(rawURL)
    if err != nil {
        return fmt.Errorf("无效的 URL: %w", err)
    }
    
    // 只允许 HTTPS
    if u.Scheme != "https" {
        return fmt.Errorf("只允许 HTTPS 请求")
    }
    
    // 白名单验证
    host := u.Hostname()
    if !allowedHosts[host] {
        return fmt.Errorf("不允许访问: %s", host)
    }
    
    // 检查是否是内网 IP
    ip := net.ParseIP(host)
    if ip != nil && isPrivateIP(ip) {
        return fmt.Errorf("禁止访问内网地址")
    }
    
    return nil
}

func isPrivateIP(ip net.IP) bool {
    privateRanges := []string{
        "10.0.0.0/8",
        "172.16.0.0/12",
        "192.168.0.0/16",
        "127.0.0.0/8",
        "169.254.0.0/16", // AWS 元数据
        "::1/128",
    }
    
    for _, cidr := range privateRanges {
        _, network, _ := net.ParseCIDR(cidr)
        if network.Contains(ip) {
            return true
        }
    }
    return false
}
```

## 安全响应头

```go
func securityHeadersMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // 防止点击劫持
        w.Header().Set("X-Frame-Options", "DENY")
        
        // 防止 MIME 类型嗅探
        w.Header().Set("X-Content-Type-Options", "nosniff")
        
        // 强制 HTTPS（1年）
        w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        
        // 控制 Referrer 信息
        w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
        
        // 权限策略
        w.Header().Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        
        next.ServeHTTP(w, r)
    })
}
```

## 安全开发清单

| 类别 | 检查项 |
|------|--------|
| 输入验证 | 所有用户输入都经过验证和过滤 |
| 参数化查询 | 没有直接拼接 SQL |
| 输出转义 | HTML 输出使用模板引擎自动转义 |
| 认证 | 使用强密码哈希（bcrypt/argon2） |
| 授权 | 每个接口都检查权限 |
| Session | Cookie 设置 HttpOnly、Secure、SameSite |
| CSRF | 状态变更接口有 CSRF 保护 |
| 敏感数据 | 密码、密钥不写入日志 |
| 依赖安全 | 定期扫描依赖漏洞（go mod verify, npm audit）|
| 错误处理 | 不向用户暴露内部错误信息 |

## 总结

Web 安全的核心原则：

1. **永不信任用户输入** - 验证、过滤、转义所有外部数据
2. **最小权限原则** - 只给必要的权限
3. **纵深防御** - 多层防护，不依赖单一措施
4. **安全默认值** - 默认配置应该是安全的
5. **定期审计** - 代码审查、依赖扫描、渗透测试
