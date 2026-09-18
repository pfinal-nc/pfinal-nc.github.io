---
title: "Laravel 13.32 Mercure 广播驱动上线：SSE 取代 WebSocket 的实时推送方案，FrankenPHP 下零配置"
date: 2026-09-18
tags: [php, laravel, realtime, sse, frankenphp]
keywords: [Laravel 13.32, Mercure broadcast driver, SSE, Server-Sent Events, FrankenPHP Mercure hub, Laravel Echo, presence channel, 实时推送]
category: php
description: "Laravel 13.32（2026-09-16）带来由 Kévin Dunglas 贡献的原生 Mercure 广播驱动：基于 SSE 的实时推送、FrankenPHP 内置 hub 零配置、presence 与端到端加密频道开箱即用。本文拆解 Mercure vs WebSocket 的架构差异、完整落地代码与选型决策。"
author: PFinal南丞
recommend: true
---

> 实时推送的默认答案正在改变：不再起 WebSocket 服务器，一个 SSE hub 搞定——而且它现在是一等公民。

# Laravel 13.32 Mercure 广播驱动上线：SSE 取代 WebSocket 的实时推送方案

## TL;DR

- Laravel 13.32（2026-09-16 发布）合入**原生 Mercure 广播驱动**，贡献者是 FrankenPHP 与 Mercure 协议的作者 Kévin Dunglas 本人。
- Mercure 基于 **Server-Sent Events（SSE）** 而非 WebSocket：单向推送、复用 HTTP/2、无需额外协议升级，浏览器原生 `EventSource` 直连。
- 在 **FrankenPHP** 上运行时，内置 Mercure hub **连 URL 和 secret 都不用配**；独立部署也只需填 `MERCURE_URL` 和 JWT secret 两个环境变量。
- 支持 **presence channels**（在线成员感知）和 **`private-encrypted-*` 端到端加密频道**；配套 Laravel Echo 补丁提供客户端支持；`broadcasting:install` 脚手架同步支持。
- 同版还有 `copyToDisk()`/`moveToDisk()` 文件系统方法与队列 pause/resume 的枚举支持。

## 一、Mercure 是什么：给"实时"降维

过去在 Laravel 里做实时推送，路径是：起 Pusher/Ably（花钱）或 laravel-echo-server / Soketi（自运维 WebSocket 服务器）。WebSocket 虽然强大，但对"服务器 → 浏览器"这个最常见的推送场景来说，有一堆用不上的复杂度：

| 维度 | WebSocket | Mercure (SSE) |
|---|---|---|
| 方向 | 双向 | 单向（服务端→客户端）|
| 协议 | 独立协议，需 Upgrade 握手 | 纯 HTTP/2，过现成 CDN/代理 |
| 断线重连 | 框架自己实现 | 浏览器 `EventSource` 原生自动重连 |
| 代理/负载均衡 | 常见坑（sticky session、超时）| 普通 HTTP 语义 |
| 授权 | 自定义握手期认证 | 标准 JWT + 频道订阅声明 |
| 反向场景（客户端→服务端）| 强项 | 走普通 HTTP POST（Laravel 本来就这么干）|

关键洞察：**Web 应用里"客户端到服务端"本来就是普通 HTTP 请求（AJAX/表单），WebSocket 的双向能力九成场景只用了一半**。Mercure 把"推送"这一半剥离成标准化的 SSE hub，其余交给 HTTP。

```text
WebSocket 方案                          Mercure 方案
┌────────┐   ws://   ┌──────────────┐    ┌────────┐   SSE    ┌──────────┐
│ 浏览器  │ ◄───────► │ WS 服务器     │    │ 浏览器  │ ◄─────── │ Mercure  │
└────────┘           │ (Soketi 等)  │    └───┬────┘          │ hub      │
                     └──────┬───────┘        │ POST          └────▲─────┘
                            │ webhook        ▼                    │ 发布(JWT)
                     ┌──────▼───────┐  ┌──────────┐              │
                     │ Laravel      │  │ Laravel  │──────────────┘
                     └──────────────┘  └──────────┘
```

## 二、Laravel 13.32 落地：三步接入

### 2.1 配置

`config/broadcasting.php` 新增驱动：

```php
'mercure' => [
    'driver' => 'mercure',
    'url' => env('MERCURE_URL'),
    'public_url' => env('MERCURE_PUBLIC_URL'),
    'secret' => env('MERCURE_JWT_SECRET'),
    'encryption_key' => env('MERCURE_ENCRYPTION_KEY'),
],
```

### 2.2 独立 hub 部署

用官方 Mercure hub 镜像（Caddy 模块）：

```yaml
# docker-compose.yml
services:
  mercure:
    image: dunglas/mercure
    environment:
      SERVER_NAME: ':80'
      MERCURE_PUBLISHER_JWT_KEY: '${MERCURE_JWT_SECRET}'
      MERCURE_SUBSCRIBER_JWT_KEY: '${MERCURE_JWT_SECRET}'
    ports:
      - "3000:80"
```

### 2.3 FrankenPHP：零配置的杀手锏

**如果应用跑在 FrankenPHP 上，内置的 Mercure hub 不需要配置 `url` 和 `secret`**——驱动直接使用内置 hub。这是本驱动最务实的设计：FrankenPHP 同样出自 Kévin Dunglas，Mercure 是它的编译内置模块。

```dockerfile
FROM dunglas/frankenphp:php8.5
COPY . /app
# docker run -p 443:443 -p 80:80 …
# broadcasting.php 里 mercure 留空 url/secret 即可用
```

一个进程 = 静态资源 + PHP 运行时（worker mode）+ HTTP/3 + **Mercure hub**。传统 Nginx + PHP-FPM + 独立 WebSocket 服务的三件套，在这里是一行 `docker run`。

## 三、代码实战

### 3.1 事件广播

```php
<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class OrderShipped implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public int $orderId,
        public string $trackingNo,
    ) {}

    public function broadcastOn(): array
    {
        return [
            // 私有频道：按订单号隔离，授权走 Gate::define('view-order')
            new Channel("private-orders.{$this->orderId}"),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'order_id'   => $this->orderId,
            'tracking'   => $this->trackingNo,
            'shipped_at' => now()->toIso8601String(),
        ];
    }
}
```

```php
// 任意服务层触发——与现有 Broadcast 用法完全一致
broadcast(new OrderShipped($order->id, $order->tracking_no));
```

对既有 Laravel 项目而言，**业务代码零改动**：换的只是 `.env` 里的 `BROADCAST_CONNECTION=mercure`。

### 3.2 presence channels：在线状态

Mercure 驱动原生支持 presence channel（谁在线、加入/离开事件）——这在以前通常意味着自己维护 Redis 在线表：

```php
// 服务端
new PresenceChannel('private-room.42');
```

```javascript
// Echo 客户端（需升级配套 Echo 补丁版本）
window.Echo.join('room.42')
    .here((users) => console.log('当前在线', users))
    .joining((user) => console.log(user.name, '进入'))
    .leaving((user) => console.log(user.name, '离开'))
    .listen('OrderShipped', (e) => appendTimeline(e));
```

### 3.3 端到端加密频道

`private-encrypted-*` 前缀的频道启用 **端到端加密**：服务器 hub 只见密文，订阅端用 `MERCURE_ENCRYPTION_KEY` 解密。对聊天、协作编辑这类"不想让推送基础设施看见内容"的场景，这是标准库里少见的开箱即用能力。

### 3.4 脚手架

```bash
php artisan broadcasting:install mercure
```

安装命令直接生成 Mercure 配置（PR #61587），不再手抄文档。

## 四、同版其他值得升级的点

```php
// 1. 文件跨盘搬运不再需要读流写流（Jack Bayliss 贡献）
Storage::disk('local')->copyToDisk('s3', 'reports/q3.csv');
Storage::disk('local')->moveToDisk('backup', 'reports/q3.csv', '2026/q3.csv');
// 甚至直接传 filesystem 实例（PR #61519）
Storage::disk('local')->copyToDisk(Storage::disk('backup'), 'a.csv');

// 2. 队列 pause/resume 接受枚举，队列名常量化
Queue::pause(Queues::notifications, Connections::Redis);
Queue::pauseFor(Queues::notifications, Connections::Redis, 60);
```

顺带修复：Redis tagged cache 的 tag 过期同步、`Str::password()` 生成字符越界、`Str::camel()` 多字节首字符等——升级本身即收益。

## 五、选型决策：什么时候用 Mercure，什么时候仍然要 WebSocket

别把"SSE 更简单"读成"SSE 全面取代 WebSocket"：

- ✅ **Mercure 合适**：通知/状态推送、仪表盘实时刷新、协作光标（配合 E2E 加密）、订单/物流进度、管理后台事件流——即"服务端发生 → 客户端知道"的一切。
- ❌ **仍需 WebSocket**：双向高频（在线游戏、P2P 信令）、二进制流（音视频自研传输层）、客户端上行带宽敏感（此时上行走 HTTP POST 的成本才显现）。
- ⚠️ **迁移注意**：移动端弱网下 SSE 的长连接保活与 WebSocket 策略不同；老版代理对 SSE 缓冲有坑（需 `X-Accel-Buffering: no`），好在 HTTP/2 普及后此类问题已大幅减少。

我的判断：**对 80% 的业务系统，Mercure + FrankenPHP 是 2026 年实时推送的最短路径**——一个容器、零额外服务、标准 JWT 授权、浏览器原生重连。剩下的 20% 高频双向场景，Soketi/Pusher 依然在岗。

## 参考资料

- Laravel News: [Mercure Broadcasting in Laravel 13.32](https://laravel-news.com/)
- Mohamed Said: [What's New in Laravel 13.32](https://www.msaied.com/articles/mercure-broadcasting-in-laravel-1332)
- [Mercure 协议规范](https://mercure.rocks/)
- [FrankenPHP 文档](https://frankenphp.dev/)（内置 Mercure hub）
- [MDN: Server-Sent Events](https://developer.mozilla.org/docs/Web/API/Server-sent_events)

## 本站相关阅读

- [FrankenPHP CVE-2026-45062：Unicode 路径分割 RCE](/security/offensive/frankenphp-cve-2026-45062-unicode-path-split-rce)（FrankenPHP 运行时的另一面）
- [FrankenPHP 1.4 Laravel worker mode](/dev/backend/php/frankenphp-1-4-laravel-worker-mode-2026)
- [phargo：Rust PHP 引擎与 WordPress](/dev/backend/php/phargo-ai-rust-php-engine-wordpress-2026)
- [PHP 错误与异常处理](/dev/backend/php/PHP%20错误与异常处理)
