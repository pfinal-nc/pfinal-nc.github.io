---
title: "FrankenPHP + Laravel Octane：PHP 终于有了原生 Worker 模式 2025 实战"
description: "PHP 8.2+ + FrankenPHP 带来 Go 级并发能力，详解 Worker 模式架构、Octane 集成、性能调优，附从 FPM 迁移的完整实战指南"
date: 2025-12-20
tags: [PHP, FrankenPHP, Laravel, Octane, Worker, 并发, PHP84]
category: [PHP, 并发编程]
---

# FrankenPHP + Laravel Octane：PHP 终于有了原生 Worker 模式 2025 实战

## PHP 的并发困境：从 FPM 到 Worker 模式的 20 年

PHP-FPM 的模型很直白：每个 HTTP 请求进来，FPM 从进程池里取一个 worker 进程处理，处理完销毁。这意味着：

- 每个请求都要初始化 PHP 运行时（加载 ini、加载扩展、编译 opcode）
- 每个请求都要初始化框架（Laravel 的 Service Container、路由注册、中间件）
- 每个请求都要建立数据库/Redis 连接

一个典型的 Laravel 请求生命周期里，真正的业务逻辑可能只占 10%，剩下 90% 都是初始化开销。在高并发场景下，这个开销是致命的。

PHP 社区尝试过很多方案：

- **Swoole**：协程 + 事件循环，性能好但改变了 PHP 编程模型，调试困难
- **RoadRunner**：Go 进程管理 + PHP Worker，需要 `.rr.yaml` 配置，生态封闭
- **Swoft**：类似 Swoole 的框架，但框架绑定太深

这些方案有一个共同问题：它们不是 PHP 官方的运行时改进，而是社区的 hack。FrankenPHP 不同——它直接在 Go 的 HTTP 服务器里嵌入了 PHP 运行时，让你用标准的 PHP 代码获得 Worker 模式的能力。

## FrankenPHP 架构解剖

FrankenPHP 的核心思想：**用 Go 管理进程生命周期，用 PHP 处理业务逻辑**。

```
┌─────────────────────────────────────────┐
│              Caddy / Go net/http         │
│  ┌─────────────────────────────────────┐ │
│  │         FrankenPHP Engine           │ │
│  │  ┌─────────┐  ┌─────────┐          │ │
│  │  │ Worker 1│  │ Worker 2│  ...     │ │
│  │  │ (PHP)   │  │ (PHP)   │          │ │
│  │  └─────────┘  └─────────┘          │ │
│  └─────────────────────────────────────┘ │
│         请求分发 + 进程管理               │
└─────────────────────────────────────────┘
```

关键特性：

- **Worker 模式**：PHP 进程常驻内存，处理多个请求，不随请求销毁
- **热重载**：代码修改后自动重启 Worker，无需手动 reload
- **WebSocket 原生支持**：不是模拟的，是 Go 层面的原生支持
- **静态文件服务**：Caddy 直接服务静态文件，PHP 只处理动态请求
- **自动 HTTPS**：Caddy 内置 Let's Encrypt

## FrankenPHP 快速上手

### Docker 一键启动

```dockerfile
# Dockerfile
FROM dunglas/frankenphp:latest-php8.4

# 复制你的 Laravel 项目
COPY . /app

# 设置工作目录
WORKDIR /app

# 安装依赖
RUN composer install --no-dev --optimize-autoloader

# 设置权限
RUN chown -R www-data:www-data /app/storage /app/bootstrap/cache

# FrankenPHP 默认使用 worker 模式
# Caddyfile 由镜像内置
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - .:/app
    environment:
      - APP_ENV=production
      - APP_DEBUG=false
```

```bash
# 启动
docker compose up -d

# 查看日志
docker compose logs -f app
```

### 两种 Worker 模式，别混用

FrankenPHP 的 Worker 模式有**两条路**，对应不同项目：

1. **非 Octane 项目**：在 Caddyfile 里用 `worker` 指令 + 自建 `worker.php`，由 FrankenPHP 直接管理 worker 进程
2. **Laravel + Octane（推荐**）：跑 `php artisan octane:start --server=frankenphp`，由 **Octane 自己管理 worker**，这时**不要在 Caddyfile 里再加 worker 指令**（否则两者抢 worker 进程，会踩坑）

下面分别看两条路。

#### 路径 A：非 Octane，直接用 Caddyfile worker

```caddyfile
# Caddyfile
{
    order php_server before file_server
}

:80 {
    root * /app/public
    php_server {
        root /app/public
        worker /app/worker.php  # 指向 worker 入口（不用花括号嵌套）
    }
    file_server
}
```

`worker.php` 是常驻入口，进程不随请求销毁：

```php
<?php
// worker.php
require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

// worker 进程常驻，每次请求复用同一个 $kernel
return function ($request) use ($kernel, $app) {
    return $kernel->handle($request);
};
```

::: tip
FrankenPHP 的 worker 进程默认数量等于当前机器的 CPU 核数，通常不需要手动指定 `num`。想限制的话用 `worker /app/worker.php` 后，在 `php_server` 里用 `num_workers` 控制。
:::

#### 路径 B：Laravel + Octane（推荐，不要配 worker 指令）

一旦用了 Octane，你就**只跑 `php artisan octane:start --server=frankenphp`**，真正到生产用 systemd/Supervisor/Docker 拉起这个进程即可，Caddyfile 只需要：

```caddyfile
# Caddyfile（Octane 模式：不写 worker 指令！）
{
    order php_server before file_server
}

:80 {
    root * /app/public
    try_files {path} /index.php
    php_server
    file_server
}
```

Octane 进程内部自己管理 4 个 worker（由 `config/octane.php` 的 `workers` 控制），转发到它即可。

## Laravel Octane 集成

Octane 是 Laravel 官方的高性能服务器，原生支持 Swoole、RoadRunner 和 FrankenPHP。

### 安装

```bash
composer require laravel/octane
php artisan octane:install --server=frankenphp
```

安装后会自动生成 `Octane.php` 配置：

```php
// config/octane.php
return [
    'server' => \Laravel\Octane\Drivers\FrankenPHP\Server::class,
    'max_requests' => 1000,  // Worker 处理多少请求后重启
    'warm_workers' => true,  // 启动时预热 Worker
    'workers' => env('OCTANE_WORKERS', 4),
    'task_workers' => env('OCTANE_TASK_WORKERS', 4),
];
```

### 启动

```bash
php artisan octane:start --server=frankenphp --host=0.0.0.0 --port=8000
```

### 状态管理陷阱

Worker 模式下，PHP 进程常驻内存。这意味着：

```php
// ❌ 危险：静态变量会在请求间残留
class UserService
{
    private static $cache = [];
    
    public function getUser(int $id)
    {
        if (!isset(self::$cache[$id])) {
            self::$cache[$id] = User::find($id);
        }
        return self::$cache[$id];
    }
}

// ✅ 安全：每次请求都是新的实例
class UserService
{
    public function __construct(
        private UserRepository $repository
    ) {}
    
    public function getUser(int $id)
    {
        return $this->repository->find($id);
    }
}
```

Octane 提供了 `OperationTerminated` 事件来清理：

```php
// App\Providers\OctaneServiceProvider
use Laravel\Octane\Events\OperationTerminated;

$server->onMessage(function ($request) {
    // 请求处理完成后清理
});

app('events')->listen(OperationTerminated::class, function () {
    // 清理静态变量、重置单例
    Session::flush();
    Cache::increment('request_count');
});
```

## 性能基准测试

::: warning
下面的数字是**示意性的数量级对比**，用来展示不同方案的相对差距，不是我在固定环境跑出的真实基准。FrankenPHP 社区和 Laravel 官方没有发布统一的官方基准表格，不同硬件、不同应用、不同压测工具（wrk/hey/ab）结果差异很大。要得到可信数字，请在你自己的服务器上、用你真实的应用跑一遍压测。
:::

### 测试环境（示意）

- 8 核 + 16GB RAM + NVMe SSD
- PHP 8.3+ / FrankenPHP + Laravel 11
- MySQL 8.0 + Redis 7
- 压测工具：`wrk -t12 -c400 -d30s`

### 结果对比（示意）

| 服务器 | QPS 量级 | P99 延迟 | 内存占用 | CPU 使用率 |
|--------|----------|----------|----------|------------|
| PHP-FPM (40 workers) | 1-3k | 40-50ms | 1GB+ | 80-90% |
| Swoole / RoadRunner (8 workers) | 5-6k | 12-15ms | 200-280MB | 60-65% |
| **FrankenPHP + Octane (4 workers)** | **6-7k** | **8-10ms** | **150-200MB** | **55-60%** |

FrankenPHP + Octane 通常表现最好的原因是：

1. Worker 进程由 Go 管理，进程切换开销更小
2. Caddy 直接服务静态文件，不经过 PHP
3. Octane 的预热机制减少了冷启动开销
4. 每个请求省掉框架引导（Laravel 的容器/路由/中间件初始化），这是 FPM 请求开销的大头

### 不同并发级别（示意）

| 并发数 | PHP-FPM QPS | FrankenPHP QPS | 提升倍数 |
|--------|-------------|----------------|----------|
| 10 | ~900 | ~3.4k | ~3.8x |
| 50 | ~2.1k | ~5.8k | ~2.7x |
| 100 | ~2.8k | ~7.1k | ~2.5x |
| 500 | ~3.1k | ~7.9k | ~2.5x |
| 1000 | ~3.2k | ~8.0k | ~2.5x |

低并发下提升更明显（可到 3-4x），因为 FPM 的进程管理和框架引导开销在低并发时占比更大。已有的真实对比（如 RichDynamix 的生产实践）也印证了量级：Octane/FrankenPHP 的单请求开销从 FPM 的 40-60ms 降到 4-6ms。

## 迁移实战：从 FPM 到 FrankenPHP

### 第一步：兼容性检查

```bash
# 检查哪些代码会踩坑
grep -rn "static " app/ --include="*.php" | head -20
grep -rn "\$_SERVER" app/ --include="*.php" | head -20
grep -rn "register_shutdown_function" app/ --include="*.php" | head -20
```

常见的坑：

- **静态变量残留**：`private static $count = 0;` 会在请求间累加
- **`$_SERVER` 超全局**：Worker 模式下不会自动重置
- **`register_shutdown_function`**：在 Worker 模式下不会触发
- **连接池**：MySQL/Redis 连接在 Worker 间共享，需要手动管理

### 第二步：Dockerfile 改造

```dockerfile
# 从 PHP-FPM 迁移
# 旧：
FROM php:8.3-fpm
# ... FPM 配置 ...

# 新：
FROM dunglas/frankenphp:latest-php8.4
COPY . /app
WORKDIR /app
RUN composer install --no-dev --optimize-autoloader
```

改动只有 3 行：基础镜像、Caddyfile、worker.php。

### 第三步：Nginx 配置迁移

```nginx
# 旧：Nginx + PHP-FPM
location ~ \.php$ {
    fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include fastcgi_params;
}
```

```caddyfile
# 新：Caddyfile（Octane + FrankenPHP）
:80 {
    root * /app/public
    try_files {path} /index.php
    php_server
    file_server
}
```

配合 Octane 启动：

```bash
# 用 systemd / Supervisor / Docker 拉起的常驻进程
php artisan octane:start --server=frankenphp --host=127.0.0.1 --port=8000
```

### 第四步：队列适配

```php
// ❌ 队列 Worker 在 Octane 下会出问题
// 因为队列 Worker 也是常驻进程，需要特殊处理

// 在 config/queue.php 中设置
'connections' => [
    'redis' => [
        'driver' => 'redis',
        'connection' => 'default',
        'queue' => env('REDIS_QUEUE', 'default'),
        'retry_after' => 90,
        'block_for' => null,
    ],
],
```

Octane 提供了 `TaskWorker` 来处理队列：

```bash
php artisan octane:start --task-workers=4
```

### 常见坑与解决方案

**1. 单例污染**

```php
// ❌ Laravel 的 Service Container 是单例的
// 如果在 Worker 间共享，状态会残留
app()->singleton('some.service', function () {
    return new SomeService(); // 每个 Worker 共享同一个实例
});

// ✅ 重置单例
app()->forgetInstance('some.service');
```

**2. 文件句柄泄漏**

```php
// ❌ 打开文件但不关闭
$file = fopen('/tmp/log.txt', 'a');
fwrite($file, "request completed\n");
// Worker 模式下文件句柄不会自动关闭

// ✅ 显式关闭
$file = fopen('/tmp/log.txt', 'a');
fwrite($file, "request completed\n");
fclose($file);
```

**3. 数据库连接泄漏**

```php
// ❌ 每个请求都创建新连接
DB::connection()->select('SELECT 1');

// ✅ 使用连接池（Octane 内置）
// 在 config/octane.php 中配置
'hot_reload' => [
    'livewire' => false,
    'user_classes' => [],
],
```

## Worker 模式深度调优

### maxRequests vs maxWorkers

```php
// config/octane.php
return [
    // Worker 处理多少请求后重启（防内存泄漏）
    'max_requests' => 1000,
    
    // Worker 数量（建议 = CPU 核数）
    'workers' => env('OCTANE_WORKERS', 4),
    
    // 任务 Worker 数量（处理队列等）
    'task_workers' => env('OCTANE_TASK_WORKERS', 4),
];
```

**调优建议**：

- `max_requests`：设为 1000-5000，太高内存泄漏风险大，太低重启开销大
- `workers`：等于 CPU 核数，不要超过（每个 Worker 占 20-50MB 内存）
- `task_workers`：如果用队列，设为 4-8

### 内存泄漏检测

```bash
# 监控 Worker 内存使用
while true; do
    ps aux | grep "php.*octane" | awk '{print $4, $5, $6}'
    sleep 10
done
```

```php
// 在 Worker 中记录内存使用
register_shutdown_function(function () {
    $usage = memory_get_usage(true) / 1024 / 1024;
    error_log("Memory usage: {$usage}MB");
});
```

### OPcache 在 Worker 模式下的行为

Worker 模式下，PHP 代码只在 Worker 启动时编译一次，OPcache 命中率接近 100%。

```ini
; php.ini 优化
opcache.enable=1
opcache.memory_consumption=256
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0  ; Worker 模式下不需要检查文件修改
```

### 连接池配置

```php
// config/database.php
'mysql' => [
    'driver' => 'mysql',
    'host' => env('DB_HOST', '127.0.0.1'),
    'port' => env('DB_PORT', '3306'),
    'database' => env('DB_DATABASE', 'forge'),
    'username' => env('DB_USERNAME', 'forge'),
    'password' => env('DB_PASSWORD', ''),
    'unix_socket' => env('DB_SOCKET', ''),
    'charset' => 'utf8mb4',
    'collation' => 'utf8mb4_unicode_ci',
    'prefix' => '',
    'prefix_indexes' => true,
    'strict' => true,
    'engine' => null,
    'options' => extension_loaded('pdo_mysql') ? array_filter([
        PDO::MYSQL_ATTR_SSL_CA => env('MYSQL_SSL_CA'),
    ]) : [],
],
```

Octane 会自动管理数据库连接池，但你需要注意：

- 连接超时：Worker 处理完请求后连接会保持，设置合理的超时时间
- 连接数：`workers × max_connections_per_worker` 不能超过 MySQL 的 `max_connections`

## 场景选型

### 适合 FrankenPHP + Octane

- **API 服务**：高并发 JSON API，响应时间敏感
- **实时通信**：WebSocket 聊天、通知推送
- **微服务**：需要快速启动、低内存占用
- **高并发 Web**：电商秒杀、抢购场景

### 不适合

- **传统 CMS**：WordPress、Drupal（插件兼容性问题）
- **低流量内部系统**：FPM 够用，迁移成本不值得
- **复杂定时任务**：Octane 的队列处理不如 Horizon 灵活

### 与 Go/Rust 服务混合架构

```
┌─────────────────────────────────────────┐
│              API Gateway (Nginx)        │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ FrankenPHP│ │ Go 服务  │ │Rust 服务│ │
│  │ (Laravel) │ │ (gRPC)   │ │(计算)   │ │
│  └──────────┘ └──────────┘ └─────────┘ │
└─────────────────────────────────────────┘
```

FrankenPHP 适合业务逻辑复杂的场景（Laravel 生态），Go/Rust 适合性能敏感的底层服务。

## 常见问题 FAQ

**Q: FrankenPHP 稳定吗？适合生产吗？**

FrankenPHP 由 [dunglas](https://github.com/dunglas)（Symfony 核心成员，Pioneer / Vulcain 作者）用 Go 编写，底层嵌入 PHP 8.2-8.5 运行时和 Caddy。它是 **Laravel 官方推荐的 Octane 运行时**（Laravel 文档和一作方博客都有专门集成说明），Docker 官方镜像 `dunglas/frankenphp` 维护活跃，社区已有多个生产部署案例（包括 standalone static binary 和 Kubernetes 部署）。但它的 Worker 模式和 Swoole/RoadRunner 一样，会改变 PHP 生命周期，建议先在测试环境充分验证再上生产。

**Q: 与现有 Composer 包兼容吗？**

大多数包兼容。不兼容的主要是那些依赖 FPM 特性的包（如 `php-fpm-status`），以及使用静态变量的包。Octane 提供了兼容性测试工具。

**Q: 需要重写代码吗？**

大部分不需要。主要检查：

- 静态变量（`static` 关键字）
- `$_SERVER` 超全局变量
- `register_shutdown_function`
- 文件操作（打开后未关闭）

**Q: 内存占用真的会降低吗？**

是的。FPM 模式下每个 worker 进程占用 20-50MB，40 个 worker 就是 800MB-2GB。FrankenPHP + Octane 只需要 4-8 个 Worker，每个 20-50MB，总计 80-400MB。

---

::: warning
迁移前务必在测试环境验证。重点检查：静态变量残留、数据库连接泄漏、队列 Worker 状态。生产环境建议先灰度发布，观察 24-48 小时再全量切换。
:::
