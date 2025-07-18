---
title: PHP进程线程解析
date: 2022-07-04 15:29:24
tags:
    - PHP
description: PHP进程线程解析
author: PFinal南丞
keywords: PHP, 进程, 线程, 解析, PHP进程, PHP线程, PHP进程线程, PHP进程线程解析, PHP进程线程解析, PHP进程线程解析, PHP多进程编程, PHP进程管理, PHP线程处理, PHP并发编程, PHP进程通信, PHP信号处理, PHP进程控制, PHP多进程最佳实践, PHP进程线程教程, PHP并发技术
---

# PHP进程线程解析

php开发需要了解进程和线程，因为也会遇到多线程的开发。那什么是进程和线程呢？

### 进程

> 进程是程序执行是的一个实例，进程能够分配给cpu和内存等资源。进程一般包括指令集和系统资源，其中指令集就是你的代码，系统资源就是指cpu、内存以及I/O等。

### 线程

> 线程是进程的一个执行流，线程不能分配系统资源，它是进程的一部分，比进程更小的独立运行的单位。

### 进程和线程的关系

> 进程就像地主，有土地（系统资源），线程就像佃户（线程，执行种地流程）。每个地主（进程）只要有一个干活的佃户（线程）。进程-资源分配的最小单位，相对健壮，崩溃一般不影响其他进程，但是切换进程时耗费资源，效率差些。线程-程序执行的最小单位，没有独立的地址空间，一个线程死掉可能整个进程就死掉，但是节省资源，切换效率高。

### PHP 多进程

创建PHP子进程是多进程的开始，我们需要pcntl_fork()函数:

> pcntl_fork() — 在当前进程当前位置产生分支（子进程）。此函数创建了一个新的子进程后，子进程会继承父进程当前的上下文，和父进程一样从pcntl_fork()函数处继续向下执行，只是获取到的pcntl_fork()的返回值不同，我们便能从判断返回值来区分父进程和子进程，分配父进程和子进程去做不同的逻辑处理。

> pcntl_fork()函数成功执行时会在父进程返回子进程的进程id(pid)，因为系统的初始进程init进程的pid为1，后来产生进程的pid都会大于此进程，所以我们可以通过判断pcntl_fork()的返回值大于1来确实当前进程是父进程；而在子进程中，此函数的返回值会是固定值0，我们也可以通过判断pcntl_fork()的返回值为0来确定子进程；而pcntl_fork()函数在执行失败时，会在父进程返回-1,当然也不会有子进程产生。

*fork进程实例*

```php
<?php
  $ppid = posix_getpid(); //获取当前进程的pid;
  $pid = pcntl_fork();
    if ($pid == -1) {
        throw new Exception('fork子进程失败!');
    } elseif ($pid > 0) {
      //cli_set_process_title('响亮的名字')：为当前进程取一个响亮的名字。
        cli_set_process_title("我是父进程,我的进程id是{$ppid}.");
　　　　 sleep(30); // 保持30秒，确保能被ps查到
    } else {
        $cpid = posix_getpid();
        cli_set_process_title("我是{$ppid}的子进程,我的进程id是{$cpid}.");
        sleep(30);
    }
```

### 分发信号处理器

通过在父进程接收子进程传来的信号，判断子进程状态，来对子进程进行管理。

需要在父进程里使用*pcntl_signal()函数*和*pcntl_signal_dispatch()函数*来给各个子进程安装信号处理器。

```
pcntl_signal (int $signo , callback $handler) 安装一个信号处理器；
        $signo是待处理的信号常量，callback是其处理函数

pcntl_signal_dispatch () 调用每个等待信号通过pcntl_signal()安装的处理器
```

PHP内常见的信号常量有：

```
        SIGCHLD     子进程退出成为僵尸进程会向父进程发送此信号
        SIGHUP      进程挂起
        SIGTEM      进程终止
```

### 处理子进程

对子进程的处理方法有:

```
posix_kill()：此函数并不能顾名思义，它通过向子进程发送一个信号来操作子进程，在需要要时可以选择给子进程发送进程终止信号来终止子进程；

pcntl_waitpid()：等待或返回fork的子进程状态，如果指定的子进程在此函数调用时已经退出（俗称僵尸进程），此函数将立刻返回，并释放子进程的所有系统资源，此进程可以避免子进程变成僵尸进程，造成系统资源浪费；

```

#### 简单的实际例子

```php
<?php
/**
 * 写日志
 */
function worker()
{
    $pid = pcntl_fork();
    if ($pid == -1) {
        exit('创建紫子进程失败');
    }
    if ($pid == 0) {
        for ($i = 0; $i < 50; $i++) {
            file_put_contents("log", "hello {$i}\n", FILE_APPEND);
            sleep(1);
        }
    }
}

/**
 * 子进程
 */
function children()
{
    $sid = posix_setsid(); //获取子进程
    echo $sid;
    for ($i = 0; $i < 2; $i++) {
        worker();
    }
    //sleep(100);
    if ($sid == -1) {
        exit('创建子进程失败');
    }
    //sleep(100);
    pcntl_wait($status);
}

$pid = pcntl_fork();
if ($pid == -1) {
    exit('创建子进程失败');
}

if ($pid == 0) {
    children();
} else {
    exit('parent exit');
}
```