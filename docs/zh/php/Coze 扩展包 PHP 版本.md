---
title: Coze 扩展包 PHP 版本
date: 2025-07-28 10:00:02
author: PFinal南丞
tag:
    - PHP
    - Coze
    - Composer
description: Coze 官方提供了 Python,Node,Go 版本的 SDK 就是没有提供 PHP 版本的 于是自己动手搞了个 PHP 版本的
keywords: Coze, 构建, 手工
---

## 背景

最近在做项目的时候，想用 Coze 的 API，结果翻遍了官方文档，发现只有 Python、Node.js、Go 的 SDK，就是没有 PHP 的！

这让我有点郁闷，作为一个 PHP 开发者，总不能为了用个 API 就换语言吧？于是我就想，既然官方不给，那我自己搞一个呗！

## 安装

安装很简单，一行命令搞定：

```bash
composer require pfinalclub/coze_sdk
```

基本要求也不高：

```json
php: ^8.2
ext-http: *
ext-json: *
ext-openssl: *
firebase/php-jwt: ^6.10
psr/simple-cache: ^3.0
symfony/cache: ^7.1
symfony/http-client: ^7.1
```

目前版本是 v1.0.0，已经实现了这些功能：

## 功能展示

### 1. 聊天功能

这个是最基础的，用起来特别简单：

```php
use CozeSdk\Chat\Chat;
// 创建聊天实例
$chat = new Chat($app);
// 发送消息
$response = $chat->setUserId('user_123')->sendMessage('你好，请介绍一下PHP');
// 处理响应
foreach ($response['messages'] as $message) {
    echo $message['content'] . "\n";
}
```

就像跟朋友聊天一样，设置个用户ID，然后直接发消息就行！

### 2. 机器人管理

有时候需要管理多个机器人，这个功能就派上用场了：

```php
use CozeSdk\Bot\Bot;
// 创建机器人实例
$bot = new Bot($app);
// 获取机器人列表
$bots = $bot->getBots();
// 打印机器人列表
foreach ($bots as $bot) {
    echo $bot['name'] . "\n";
}
```

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202507281714275.png)

### 3. 基本流式传输

这个功能特别有意思，就像看直播一样，数据是实时流过来的：

```php
use CozeSdk\Chat\Chat;

$chat = new Chat($app);

// 创建流式聊天（兼容旧版本）
$streamCallback = $chat->setUserId('user_123')
    ->Query('请写一个PHP函数')
    ->Build(true);

// 执行流式响应
$streamCallback();
```

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202507281715585.png)

### 4. 高级流式传输（推荐）

这个是我最得意的功能，提供了好几种处理方式，想怎么用就怎么用：

```php
<?php

use CozeSdk\Chat\Chat;
use CozeSdk\Kernel\Support\{
    ConsoleStreamHandler,
    JsonStreamHandler,
    MemoryStreamHandler,
    CallbackStreamHandler
};

$chat = new Chat($app);

// 1. 控制台输出流式处理器 - 最简单，直接打印到控制台
$consoleHandler = new ConsoleStreamHandler();
$result = $chat->sendStreamMessage('你好，请介绍一下PHP', $consoleHandler);

// 2. JSON流式处理器 - 适合API接口，返回JSON格式
$jsonHandler = new JsonStreamHandler();
$result = $chat->sendStreamMessage('写一个简单的函数', $jsonHandler);

// 3. 内存流式处理器 - 把数据存在内存里，适合后续处理
$memoryHandler = new MemoryStreamHandler();
$result = $chat->sendStreamMessage('解释什么是OOP', $memoryHandler);

// 4. 回调流式处理器（最灵活）- 想怎么处理就怎么处理
$callbackHandler = new CallbackStreamHandler(
    function($chunk, $metadata) {
        // 处理每个数据块
        echo $chunk;
        flush();
        return true; // 继续处理
    },
    function($metadata) {
        // 流式传输开始
        echo "开始接收数据...\n";
    },
    function($metadata) {
        // 流式传输结束
        echo "\n接收完成\n";
    },
    function($error, $metadata) {
        // 错误处理
        echo "错误: " . $error->getMessage() . "\n";
    }
);

$result = $chat->sendStreamMessage('请写一个详细的教程', $callbackHandler);
```

## 使用心得

说实话，开发这个扩展包的过程还是挺有意思的。最开始只是想解决自己的需求，没想到越做越上瘾。

目前在项目中主要用流式传输功能来做客服机器人，效果还不错。用户问问题的时候，回答是实时流出来的，体验比传统的等待完整响应要好很多。

当然，这个版本可能还不够完善，毕竟是我一个人业余时间搞的。如果你在使用过程中遇到什么问题，或者有什么好的建议，欢迎提出来，我们一起完善它！

## 后续计划

接下来我打算：
1. 添加更多的错误处理机制
2. 优化性能，减少内存占用
3. 增加更多的示例代码
4. 完善文档

如果你觉得这个扩展包有用，记得给个 star 支持一下哦！

---

*作者：一个热爱PHP的程序员*
*GitHub：[pfinalclub/coze_sdk](https://github.com/pfinalclub/coze_sdk)* 