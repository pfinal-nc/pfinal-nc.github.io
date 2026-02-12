---
title: PHP $_SERVER 完全指南 - 超全局变量详解与实战
date: 2022-04-09T11:31:32.000Z
tags:
  - php
  - 服务器变量
  - 安全
description: PHP $_SERVER 超全局变量完全指南，包含所有变量详解、实际应用场景、安全注意事项和最佳实践
author: PFinal南丞
keywords: 'PHP, $_SERVER, PHP服务器变量, PHP环境变量, PHP请求信息, PHP服务器信息, PHP安全, PHP最佳实践'
recommend: 后端工程
---

# PHP $_SERVER 超全局变量完全指南

`$_SERVER` 是 PHP 中最重要的超全局变量之一，它包含了服务器和请求环境的各种信息。理解和正确使用 `$_SERVER` 对于开发安全、高效的 Web 应用至关重要。

## 什么是 $_SERVER

`$_SERVER` 是一个包含了诸如头信息(header)、路径(path)、以及脚本位置(script locations)等信息的关联数组。这个数组中的项目由 Web 服务器创建，但不能保证每个服务器都提供全部项目。

**重要提示**：
- 不同服务器（Apache、Nginx、IIS）可能提供不同的 `$_SERVER` 变量
- 某些变量只在特定条件下存在（如 HTTPS 相关变量）
- 来自用户的数据（如 HTTP_REFERER）不可信，需要验证

## $_SERVER 变量详解

### 1. 服务器基本信息

#### PHP_SELF
当前执行脚本的文件名，与 document root 有关。

```php
// URL: https://example.com/user/profile.php
echo $_SERVER['PHP_SELF']; // 输出: /user/profile.php

// 注意：PHP_SELF 存在 XSS 风险，使用时需要转义
echo htmlspecialchars($_SERVER['PHP_SELF'], ENT_QUOTES, 'UTF-8');
```

**安全风险示例**：
```php
// 危险用法 - 存在 XSS 风险
<form action="<?php echo $_SERVER['PHP_SELF']; ?>" method="post">

// 安全用法
<form action="<?php echo htmlspecialchars($_SERVER['PHP_SELF'], ENT_QUOTES, 'UTF-8'); ?>" method="post">
```

#### SERVER_NAME
当前运行脚本所在服务器的主机名。

```php
echo $_SERVER['SERVER_NAME']; // 输出: example.com
```

#### SERVER_ADDR
服务器的 IP 地址。

```php
echo $_SERVER['SERVER_ADDR']; // 输出: 192.168.1.100
```

#### SERVER_PORT
Web 服务器使用的端口，默认为 80，HTTPS 默认为 443。

```php
if ($_SERVER['SERVER_PORT'] == 443) {
    echo "使用 HTTPS 连接";
} else {
    echo "使用 HTTP 连接";
}
```

#### SERVER_SOFTWARE
服务器标识字符串。

```php
echo $_SERVER['SERVER_SOFTWARE']; 
// 输出示例: Apache/2.4.41 (Unix) PHP/7.4.3
// 或: nginx/1.18.0
```

#### SERVER_PROTOCOL
请求页面时使用的协议名称和版本。

```php
echo $_SERVER['SERVER_PROTOCOL']; // 输出: HTTP/1.1
```

### 2. 请求相关信息

#### REQUEST_METHOD
访问页面使用的请求方法（GET、POST、PUT、DELETE等）。

```php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 处理 POST 请求
    $data = $_POST;
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // 处理 GET 请求
    $data = $_GET;
}

// RESTful API 路由示例
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        handleGet();
        break;
    case 'POST':
        handlePost();
        break;
    case 'PUT':
        handlePut();
        break;
    case 'DELETE':
        handleDelete();
        break;
    default:
        http_response_code(405); // Method Not Allowed
        break;
}
```

#### REQUEST_URI
用来访问此页面的 URI，包括查询字符串。

```php
// URL: https://example.com/user/profile.php?id=123
echo $_SERVER['REQUEST_URI']; // 输出: /user/profile.php?id=123

// 解析 URI
$uri = parse_url($_SERVER['REQUEST_URI']);
echo $uri['path'];  // /user/profile.php
echo $uri['query']; // id=123
```

#### QUERY_STRING
查询字符串（URL 中 ? 后面的部分）。

```php
// URL: https://example.com/search.php?q=php&page=1
echo $_SERVER['QUERY_STRING']; // 输出: q=php&page=1

// 解析查询字符串
parse_str($_SERVER['QUERY_STRING'], $params);
print_r($params); // Array(['q' => 'php', 'page' => '1'])
```

#### REQUEST_TIME & REQUEST_TIME_FLOAT
请求开始时的 Unix 时间戳。

```php
$start_time = $_SERVER['REQUEST_TIME_FLOAT'];

// 执行一些操作
sleep(2);

$end_time = microtime(true);
$execution_time = $end_time - $start_time;

echo "脚本执行时间: " . round($execution_time, 4) . " 秒";
```

### 3. 客户端信息

#### REMOTE_ADDR
客户端的 IP 地址。

```php
$client_ip = $_SERVER['REMOTE_ADDR'];
echo "访客 IP: " . $client_ip;

// 注意：通过代理/负载均衡器时，需要检查其他头信息
function getClientIP() {
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $ip = $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        // 可能包含多个 IP，取第一个
        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $ip = trim($ips[0]);
    } else {
        $ip = $_SERVER['REMOTE_ADDR'];
    }
    
    // 验证 IP 格式
    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '0.0.0.0';
}

echo "真实 IP: " . getClientIP();
```

#### REMOTE_PORT
客户端连接到服务器使用的端口号。

```php
echo $_SERVER['REMOTE_PORT']; // 输出示例: 53993
```

#### REMOTE_HOST
客户端的主机名（需要服务器开启反向 DNS 解析）。

```php
echo $_SERVER['REMOTE_HOST'] ?? 'Unknown';
```

### 4. HTTP 请求头信息

#### HTTP_HOST
请求头中的 Host 字段内容。

```php
echo $_SERVER['HTTP_HOST']; // 输出: example.com
```

#### HTTP_USER_AGENT
用户浏览器的用户代理字符串。

```php
$user_agent = $_SERVER['HTTP_USER_AGENT'];
echo $user_agent;

// 检测是否为移动设备
function isMobile() {
    return preg_match('/(android|iphone|ipad|mobile)/i', $_SERVER['HTTP_USER_AGENT']);
}

if (isMobile()) {
    echo "移动设备访问";
} else {
    echo "桌面设备访问";
}

// 检测浏览器类型
function getBrowser() {
    $ua = $_SERVER['HTTP_USER_AGENT'];
    
    if (strpos($ua, 'Firefox') !== false) {
        return 'Firefox';
    } elseif (strpos($ua, 'Chrome') !== false) {
        return 'Chrome';
    } elseif (strpos($ua, 'Safari') !== false) {
        return 'Safari';
    } elseif (strpos($ua, 'Edge') !== false) {
        return 'Edge';
    }
    
    return 'Unknown';
}
```

#### HTTP_REFERER
引导用户到当前页面的前一页地址。

```php
$referer = $_SERVER['HTTP_REFERER'] ?? 'Direct';
echo "来源: " . $referer;

// 验证来源域名
function isInternalReferer() {
    if (empty($_SERVER['HTTP_REFERER'])) {
        return false;
    }
    
    $referer_host = parse_url($_SERVER['HTTP_REFERER'], PHP_URL_HOST);
    $current_host = $_SERVER['HTTP_HOST'];
    
    return $referer_host === $current_host;
}

// 防止外站表单提交
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !isInternalReferer()) {
    die('非法请求');
}
```

#### HTTP_ACCEPT
客户端接受的内容类型。

```php
echo $_SERVER['HTTP_ACCEPT'];
// 输出: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
```

#### HTTP_ACCEPT_LANGUAGE
客户端接受的语言。

```php
$lang = $_SERVER['HTTP_ACCEPT_LANGUAGE'];

// 解析首选语言
function getPreferredLanguage() {
    $langs = explode(',', $_SERVER['HTTP_ACCEPT_LANGUAGE']);
    $preferred = explode(';', $langs[0])[0];
    
    return $preferred; // 例如: zh-CN
}

// 根据语言设置默认语言
$preferred_lang = getPreferredLanguage();
if (strpos($preferred_lang, 'zh') !== false) {
    $default_lang = 'zh-CN';
} else {
    $default_lang = 'en-US';
}
```

#### HTTP_ACCEPT_ENCODING
客户端支持的编码方式。

```php
echo $_SERVER['HTTP_ACCEPT_ENCODING']; // 输出: gzip, deflate, br
```

### 5. HTTPS 相关

#### HTTPS
如果通过 HTTPS 访问，此变量被设置为非空值。

```php
// 检测 HTTPS
function isHTTPS() {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || $_SERVER['SERVER_PORT'] == 443;
}

// 强制 HTTPS 重定向
if (!isHTTPS()) {
    $redirect_url = "https://" . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
    header("Location: " . $redirect_url, true, 301);
    exit;
}
```

### 6. 脚本路径信息

#### SCRIPT_FILENAME
当前执行脚本的绝对路径。

```php
echo $_SERVER['SCRIPT_FILENAME']; 
// 输出: /var/www/html/user/profile.php
```

#### SCRIPT_NAME
当前脚本的路径。

```php
echo $_SERVER['SCRIPT_NAME']; // 输出: /user/profile.php
```

#### DOCUMENT_ROOT
当前运行脚本所在的文档根目录。

```php
echo $_SERVER['DOCUMENT_ROOT']; // 输出: /var/www/html
```

## 实际应用场景

### 场景1：简易路由系统

```php
<?php
class SimpleRouter
{
    private $routes = [];
    
    public function add($method, $path, $handler)
    {
        $this->routes[] = [
            'method' => $method,
            'path' => $path,
            'handler' => $handler
        ];
    }
    
    public function dispatch()
    {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        
        foreach ($this->routes as $route) {
            if ($route['method'] === $method && $route['path'] === $path) {
                call_user_func($route['handler']);
                return;
            }
        }
        
        http_response_code(404);
        echo "404 Not Found";
    }
}

// 使用示例
$router = new SimpleRouter();

$router->add('GET', '/api/users', function() {
    echo json_encode(['users' => ['Alice', 'Bob']]);
});

$router->add('POST', '/api/users', function() {
    $data = json_decode(file_get_contents('php://input'), true);
    echo json_encode(['message' => 'User created', 'data' => $data]);
});

$router->dispatch();
```

### 场景2：请求日志记录

```php
<?php
class RequestLogger
{
    private $logFile;
    
    public function __construct($logFile = 'requests.log')
    {
        $this->logFile = $logFile;
    }
    
    public function log()
    {
        $logData = [
            'timestamp' => date('Y-m-d H:i:s'),
            'ip' => $_SERVER['REMOTE_ADDR'],
            'method' => $_SERVER['REQUEST_METHOD'],
            'uri' => $_SERVER['REQUEST_URI'],
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
            'referer' => $_SERVER['HTTP_REFERER'] ?? 'Direct',
            'status' => http_response_code()
        ];
        
        $logLine = json_encode($logData) . "\n";
        file_put_contents($this->logFile, $logLine, FILE_APPEND);
    }
}

// 使用示例
$logger = new RequestLogger();
$logger->log();
```

### 场景3：访问控制

```php
<?php
class AccessControl
{
    private $whitelist = ['192.168.1.0/24', '10.0.0.0/8'];
    private $blacklist = [];
    
    public function checkAccess()
    {
        $clientIP = $_SERVER['REMOTE_ADDR'];
        
        // 检查黑名单
        if ($this->isBlacklisted($clientIP)) {
            http_response_code(403);
            die('Access Denied: IP Blacklisted');
        }
        
        // 检查白名单
        if (!$this->isWhitelisted($clientIP)) {
            http_response_code(403);
            die('Access Denied: IP Not Whitelisted');
        }
        
        return true;
    }
    
    private function isWhitelisted($ip)
    {
        foreach ($this->whitelist as $range) {
            if ($this->ipInRange($ip, $range)) {
                return true;
            }
        }
        return false;
    }
    
    private function isBlacklisted($ip)
    {
        return in_array($ip, $this->blacklist);
    }
    
    private function ipInRange($ip, $range)
    {
        if (strpos($range, '/') === false) {
            return $ip === $range;
        }
        
        list($subnet, $mask) = explode('/', $range);
        $ip_long = ip2long($ip);
        $subnet_long = ip2long($subnet);
        $mask_long = -1 << (32 - (int)$mask);
        
        return ($ip_long & $mask_long) === ($subnet_long & $mask_long);
    }
}

// 使用示例
$ac = new AccessControl();
$ac->checkAccess();
```

## 安全注意事项

### 1. 永远不要直接信任用户输入

```php
// ❌ 危险
echo $_SERVER['PHP_SELF'];
echo $_SERVER['HTTP_REFERER'];

// ✅ 安全
echo htmlspecialchars($_SERVER['PHP_SELF'], ENT_QUOTES, 'UTF-8');
echo htmlspecialchars($_SERVER['HTTP_REFERER'], ENT_QUOTES, 'UTF-8');
```

### 2. 验证和过滤

```php
// 验证 IP 地址
function validateIP($ip) {
    return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
}

// 清理 URL
function sanitizeURL($url) {
    return filter_var($url, FILTER_SANITIZE_URL);
}
```

### 3. 防止信息泄露

```php
// ❌ 不要在生产环境暴露服务器信息
// echo $_SERVER['SERVER_SOFTWARE'];

// ✅ 隐藏服务器版本信息（在 php.ini 中设置）
// expose_php = Off
```

## 性能优化技巧

### 缓存常用变量

```php
class ServerInfo
{
    private static $cache = [];
    
    public static function get($key)
    {
        if (!isset(self::$cache[$key])) {
            self::$cache[$key] = $_SERVER[$key] ?? null;
        }
        
        return self::$cache[$key];
    }
}

// 使用缓存
$host = ServerInfo::get('HTTP_HOST');
```

## 调试技巧

### 打印所有 $_SERVER 变量

```php
echo "<pre>";
print_r($_SERVER);
echo "</pre>";

// 或格式化输出
function printServerInfo() {
    echo "<!DOCTYPE html>\n<html>\n<head><title>\$_SERVER Info</title></head>\n<body>\n";
    echo "<table border='1'>\n";
    echo "<tr><th>Key</th><th>Value</th></tr>\n";
    
    foreach ($_SERVER as $key => $value) {
        echo "<tr>";
        echo "<td>" . htmlspecialchars($key) . "</td>";
        echo "<td>" . htmlspecialchars(is_array($value) ? print_r($value, true) : $value) . "</td>";
        echo "</tr>\n";
    }
    
    echo "</table>\n</body>\n</html>";
}

// 仅在开发环境调用
if ($_SERVER['SERVER_NAME'] === 'localhost') {
    printServerInfo();
}
```

## 常见问题解答

### Q1: 为什么 HTTP_REFERER 有时为空？

**A**: 
- 用户直接在地址栏输入 URL
- 使用书签访问
- 浏览器隐私设置禁止发送 Referer
- 从 HTTPS 跳转到 HTTP
- 使用某些浏览器扩展

### Q2: 如何获取真实的客户端 IP？

**A**: 在使用负载均衡器或代理时，需要检查多个头信息：

```php
function getRealIP() {
    $headers = [
        'HTTP_CF_CONNECTING_IP', // Cloudflare
        'HTTP_X_REAL_IP',        // Nginx
        'HTTP_X_FORWARDED_FOR',  // 通用代理
        'HTTP_CLIENT_IP',        // Apache
        'REMOTE_ADDR'            // 默认
    ];
    
    foreach ($headers as $header) {
        if (!empty($_SERVER[$header])) {
            $ips = explode(',', $_SERVER[$header]);
            $ip = trim($ips[0]);
            
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    
    return $_SERVER['REMOTE_ADDR'];
}
```

### Q3: REQUEST_URI 和 SCRIPT_NAME 有什么区别？

**A**:
- `REQUEST_URI`: 完整的请求 URI，包括查询字符串
- `SCRIPT_NAME`: 当前脚本的路径，不包括查询字符串

```php
// URL: https://example.com/user/profile.php?id=123
echo $_SERVER['REQUEST_URI'];  // /user/profile.php?id=123
echo $_SERVER['SCRIPT_NAME'];  // /user/profile.php
```

## 最佳实践总结

1. **始终验证和清理来自 $_SERVER 的数据**
2. **不要依赖可伪造的值（如 HTTP_REFERER、HTTP_USER_AGENT）**
3. **使用 HTTPS 检测时考虑代理和负载均衡器**
4. **在生产环境隐藏服务器版本信息**
5. **记录关键的 $_SERVER 变量用于调试和审计**
6. **使用 filter_var() 进行输入验证**
7. **缓存频繁访问的 $_SERVER 变量**

## 实际输出示例

```php
Array
(
    [USER] => _www
    [HOME] => /Library/WebServer
    [HTTP_ACCEPT_LANGUAGE] => zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7
    [HTTP_ACCEPT_ENCODING] => gzip, deflate, br
    [HTTP_ACCEPT] => text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
    [HTTP_UPGRADE_INSECURE_REQUESTS] => 1
    [HTTP_USER_AGENT] => Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_1)
    [HTTP_CACHE_CONTROL] => max-age=0
    [HTTP_CONNECTION] => keep-alive
    [HTTP_HOST] => localhost
    [SERVER_NAME] => localhost
    [SERVER_PORT] => 80
    [SERVER_ADDR] => 127.0.0.1
    [REMOTE_PORT] => 53993
    [REMOTE_ADDR] => 127.0.0.1
    [SERVER_SOFTWARE] => nginx/1.10.3
    [GATEWAY_INTERFACE] => CGI/1.1
    [REQUEST_SCHEME] => http
    [SERVER_PROTOCOL] => HTTP/1.1
    [DOCUMENT_ROOT] => /Users/www
    [DOCUMENT_URI] => /index.php
    [REQUEST_URI] => /index.php
    [SCRIPT_NAME] => /index.php
    [REQUEST_METHOD] => GET
    [QUERY_STRING] => 
    [SCRIPT_FILENAME] => /Users/www/index.php
    [PHP_SELF] => /index.php
    [REQUEST_TIME_FLOAT] => 1513262160.1324
    [REQUEST_TIME] => 1513262160
)
```

## 总结

`$_SERVER` 超全局变量是 PHP Web 开发中不可或缺的工具，它提供了丰富的服务器和请求信息。掌握 `$_SERVER` 的正确使用方法，不仅能帮助你构建功能强大的应用，还能确保应用的安全性和可靠性。

记住：**永远不要盲目信任来自 $_SERVER 的数据，特别是那些可以被用户或中间人修改的值**。

---

*最后更新：2025-11-10*  
*作者：PFinal南丞*
