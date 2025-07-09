---
title: PHP $_SESSION 引发的Bug
date: 2023-11-09 11:31:32
tags:
    - PHP
description: PHP $_SESSION 引发的Bug
author: PFinal南丞
keywords: PHP, 会话, 引发, Bug, PHP_SESSION, $_SESSION, 会话管理
---

# PHP $_SESSION 引发的Bug

刚处理了一个 公司老系统的 BUG, 记录一下。

BUG:  老系统之前登录的时候正常, 昨天突然 登录不上去了

分析查找:

1. 尝试错误的账号 和 密码, 跳转正常, 弹出了账号密码错误

2. 使用正确的账号密码,登录不给任何提示直接跳回

3. 翻看源码 发现登录 代码如下:

```php

  // 省略前面的操作
  $data = check_user($user_name,$password);
  // ...
  @session_start();
  
  $_SESSION = $data; // 这里的写法 第一次碰到

  print "<script>window.location='index.php'</script>"

```

4. 查看 *index.php* 中的代码:

```php

    @session_start();
    $user_name = $_SESSION['user_name']
```

乍一看 上面的代码 没有任何的问题, 因为之前的代码 也是这种逻辑,是正常的在用，于是 在本地 测试了一下. 主要怀疑 *$_SESSIO* 写入的时候的问题

本地新建了一个  *test.php*, 代码如下:

```php

  @session_start();
  
  $_SESSION = [1,2,3,4]; // 这里的写法 第一次碰到

  print "<script>window.location='index.php'</script>"

```

新建了一个 *index.php*, 代码如下:

```php
 @session_start();
 var_dump($_SESSION);

```

运行以后跳转到 index.php 发现 获取到的 $_SESSION 是空的, 证明了猜想 $_SESSION 写入的时候没有写进去 或者 为空,于是 修改了一下 本地的测试代码:

```php
$_SESSION['user'] = [1,2,3,4];
```

然后：

```php
var_dump($_SESSION['user']);
```
这样一修改,就能正常写入,并且输出. 


#### 问题:

因为老系统 很多个 地方 *$_SESSION* 是直接赋值 并且获取 使用的 没法修改, 之前能用. 突然不能用了.怎么快速的解决呢？

1. 万能大法, 凡事不会找 谷歌, 搜了半天 告诉的是 上面的那种写法 $_SESSION 直接赋值会出现不稳定或者是 数据覆盖的可能, 建议直接使用 $_SESSION

2. Chatgpt 上搜一下 也是 $_SESSION 直接赋值会出现不稳定或者是 数据覆盖的可能


#### 解决:

如上,在不大规模的修改 代码的时候 怎么解决 这个问题, 于是一点点的翻, 最后想到的是 session 一般来说是存储的文件, 是不是 $data 太大,导致文件目录满了,于是 查看了一下 php.ini 中 session.save_path 的路径  **/tmp/session** 然后 查看了一下 /tmp 的大小.没满.

最后 迫不得已, 尝试把 **/tmp/session** 目录给删除,然后 新建了 **session**目录, 于是 就神奇的 $_SESSION=$data 存储可用了.于是这个 奇妙的 问题就解决了.


#### 最后的最后

**$_SESSION是一个特殊的超全局数组，用于在会话之间存储数据。直接给$_SESSION赋值可能会导致不稳定的行为和不一致性，因为它会覆盖会话中已有的数据。**