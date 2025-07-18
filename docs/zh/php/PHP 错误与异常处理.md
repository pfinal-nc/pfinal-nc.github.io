---
title: PHP 错误与异常处理
date: 2022-05-04 15:29:24
tags:
    - PHP
description: 详细介绍PHP错误与异常处理的概念、分类、处理方式等，帮助开发者更好地处理程序中的错误和异常，提高程序的健壮性和稳定性。
author: PFinal南丞
keywords: PHP, 错误与异常处理, 异常, 错误, 处理, 异常处理, 错误处理, 程序, 健壮性, 稳定性, PHP错误与异常处理, PHP错误处理机制, PHP异常处理教程, PHP错误级别, PHP错误日志, PHP异常捕获, PHP程序健壮性, PHP错误调试, PHP异常处理最佳实践, PHP错误处理技巧, PHP程序稳定性
---

# PHP 错误与异常处理

- php中的错误：
    
    php中大部分情况是由错误的语法，服务器环境导致，使得编译器无法通过检查，甚至无法运行的情况。warning、notice都是错误，只是他们的级别不同而已，并且错误是不能被try-catch捕获的。

- php中的异常： 

    程序在运行中出现不符合预期的情况，允许发生（你也不想让他出现不正常的情况）但他是一种不正常的情况，按照我们的正常逻辑本不该出的错误，但仍然会出现的错误，属于逻辑和业务流程的错误，而不是编译或者语法上的错误。这种我们把他称为异常。

以上是PHP中错误和异常的一个概念,PHP中任何自身的错误或者是非正常的代码都会当做错误对待，并不会以异常的形式抛出，但是也有一些情况会当做异常和错误同时抛出。也就是说，你想在数据库连接失败的时候自动捕获异常是行不通的，因为这就不是异常，是错误。    

- 错误等级

要做错误处理,必须得明细错误级别:

```
Fatal Error:致命错误（脚本终止运行）
        E_ERROR         // 致命的运行错误，错误无法恢复，暂停执行脚本
        E_CORE_ERROR    // PHP启动时初始化过程中的致命错误
        E_COMPILE_ERROR // 编译时致命性错，就像由Zend脚本引擎生成了一个E_ERROR
        E_USER_ERROR    // 自定义错误消息。像用PHP函数trigger_error（错误类型设置为：E_USER_ERROR）

    Parse Error：编译时解析错误，语法错误（脚本终止运行）
        E_PARSE  //编译时的语法解析错误

    Warning Error：警告错误（仅给出提示信息，脚本不终止运行）
        E_WARNING         // 运行时警告 (非致命错误)。
        E_CORE_WARNING    // PHP初始化启动过程中发生的警告 (非致命错误) 。
        E_COMPILE_WARNING // 编译警告
        E_USER_WARNING    // 用户产生的警告信息

    Notice Error：通知错误（仅给出通知信息，脚本不终止运行）
        E_NOTICE      // 运行时通知。表示脚本遇到可能会表现为错误的情况.
        E_USER_NOTICE // 用户产生的通知信息。
```

由此可知有5类是产生ERROR级别的错误，这种错误直接导致PHP程序退出。

- 简单的错误处理:

PHP代码在运行的过程中,一旦出现错误,就会触发系统的错误处理机制。如果我们配置了错误报告就回直接报告出错误。如图所示:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/pkg/20220704173139.png)

像这样的处理如果我们的代码在生产上运行,就会暴露很多信息(比如服务器的系统),所以我们会做简单的配置:

> 第一种: 修改php.ini 配置文件:

```
error_reporting = E_ALL //将向PHP发送每个错误
display_errors = Off //不显示错误报告
log_errors = On   //开启错误日志记录
log_errors_max_log = 1024 //每条日志的最大长度
error_log = G:/myerror.log //指定错误日志文件
```
*注意:由于我们关闭了错误报告,但是错误是存在的,为了排查错误,我们开启了错误日志.*

> 第二种: 不修改配置文件,在代码层处理

```php
error_reporting(E_ALL);  //将向PHP发送每个错误
ini_set('display_errors',0); //不显示错误报告
ini_set('log_errors',1);    //开启错误日志记录
ini_set('error_log','./error.log'); //指定错误日志文件
test();
```

运行以上代码,就会发现 当前目录下出现 error.log 的文件,内容如下:

```
[05-Jul-2018 03:37:38 UTC] PHP Fatal error:  Uncaught Error: Call to undefined function test() in D:\phpStudy\WWW\test.php:6
Stack trace:
#0 {main}
  thrown in D:\phpStudy\WWW\test.php on line 6

```

- 简单的PHP异常处理

```php
function checkNum($number)
{
 return 100/$number;
}
```
如上代码所示: 在调用 checkNum()函数的时候 如果在调用的时候 参数传递为0,就会出现异常,这个时候我们就会用到 异常处理操作:

```php
function checkNum($number)
{
    if($number==0) {
        throw new Exception("参数不能为0");
    }
    return 100/$number;
}
```
然后在调用的时候:

```php
<?php
try {
    checkNum(2);
    echo '成功了';
} //捕获异常
catch (Exception $e) {
    echo '错误信息: ' . $e->getMessage();
}
```
再比如如下的异常处理:

```php
<?php
$pdo = new PDO('mysql://host=wrong_host;dbname=wrong_name');
$count = $pdo->exec("DELETE FROM fruit WHERE colour = 'red'");
```
我们链接数据库执行删除操作的时候,我们无法确保数据库的地址和用户名输入都是正确的时候,就会使用异常处理操作,来优化我们的代码

```php
try {
    $pdo = new PDO('mysql://host=wrong_host;dbname=wrong_name');
    $count = $pdo->exec("DELETE FROM fruit WHERE colour = 'red'");
} catch (PDOException $e) {
    $code = $e->getCode();
    $message = $e->getMessage();
    echo '对不起,业务正忙,请稍后再试';
    exit;
}
```
Exception是所有异常的基类。他提供了一下方法给我们用来处理异常:
```
Exception::getMessage — 获取异常消息内容
Exception::getPrevious — 返回异常链中的前一个异常
Exception::getCode — 获取异常代码
Exception::getFile — 创建异常时的程序文件名称
Exception::getLine — 获取创建的异常所在文件中的行号
Exception::getTrace — 获取异常追踪信息
Exception::getTraceAsString — 获取字符串类型的异常追踪信息
Exception::__toString — 将异常对象转换为字符串
Exception::__clone — 异常克隆
```


