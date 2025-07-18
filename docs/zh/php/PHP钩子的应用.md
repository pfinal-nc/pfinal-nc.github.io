---
title: PHP钩子的应用
date: 2022-08-22 21:31:32
tags:
    - PHP
description: 详细介绍PHP钩子的应用，包括钩子的概念、应用场景、实现方式等，帮助开发者更好地利用PHP的钩子功能，提高程序的性能和响应速度。
author: PFinal南丞
keywords: PHP钩子, php, 工具, php钩子, php钩子应用, php钩子的实现, PHP钩子的应用, PHP插件机制, PHP钩子编程, PHP事件驱动, PHP插件开发, PHP钩子实现, PHP扩展开发, PHP钩子最佳实践, PHP钩子教程, PHP插件架构, PHP钩子设计模式, PHP钩子技术
---

# PHP钩子的应用

产品汪搞出了一堆需求；

当用户注册成功后需要发送短信、发送邮件等等；

然后聪明机智勇敢的程序猿们就一扑而上；

把这些需求转换成代码扔在 用户注册成功 和 跳转到首页 之间；


没有什么能够阻挡；充满创造力的猿们；

```php
<?php
class Test{
    public function index(){
        // 用户注册成功
            /*
              此处是一堆发送短信的代码
            */

           /*
              此处是一堆发送邮件的代码
            */

           /*
              此处是一堆其他功能的代码
            */
        // 前往网站首页
    }
}
$test=new Test();
$test->index();
```

PHPCopy

如果每个功能都由不同的猿完成的话；

首先面临的就是代码会很杂乱；配合起来会比较麻烦；

那封装成函数吧；一方面会规范整洁写；另外方便重复调用；


没有什么能够阻挡；充满创造力的猿们；

```php
<?php
class Test{
    public function index(){
        // 用户注册成功
        // 发送短信
        sendSms($phone);
        // 发送邮件
        sendSms($email);
        // 其他操作...

        // 前往网站首页
    }
}
/**
 * 发送短信通知
 * @param  integer $phone 手机号
 */
function sendSMS($phone){
    // 此处是发送短信的代码
}
/**
 * 发送邮件通知
 * @param  string $email 邮箱地址
 */
function sendEmail($email){
    // 此处是发送邮件的代码
}

```

PHPCopy

这时候运营喵表示；

如果能在后台点点按钮就能设置是发邮件还是发短信；那想必是极好的；

没有什么能够阻挡；充满创造力的猿们；

```php
<?php
class Test{
    public function index(){
        // 用户注册成功
        if ('如果设置了发送短信') {
            // 发送短信
            sendSms($phone);
        }

        if ('如果设置了发送邮件') {
            // 发送邮件
            sendSms($email);
        }

        // 其他操作...

        // 前往网站首页
    }
}

/**
 * 发送短信通知
 * @param  integer $phone 手机号
 */
function sendSMS($phone){
    // 此处是发送短信的代码
}
/**
 * 发送邮件通知
 * @param  string $email 邮箱地址
 */
function sendEmail($email){
    // 此处是发送邮件的代码
}
```

PHPCopy

在一个封闭企业环境下这样搞是没有问题的；

然鹅；我们还有一位开放无私的猿领导要把程序开源出去造福其他猿类；

希望有更多的猿类来参与这个项目；共同开发功能；

如果大家都去改动这套程序；把自己的代码扔在 用户注册成功 和 跳转到首页 之间；

这显然是不靠谱的；想想都混乱的一塌糊涂；

那可不可以大家把自己写的代码放到某个目录下；

然后系统自动的根据配置项把这些代码加载到 用户注册成功 和 跳转到首页 之间呢？

好先定义如下目录

```

├─plugin // 插件目录

│  ├─plugin1 // 插件1

│  │  ├─config.php // 插件1的配置项

│  │  ├─index.php // 插件1的程序处理内容

│  ├─plugin2

│  │  ├─config.php

│  │  ├─index.php

│  ├─plugin3

│  │  ├─config.php

│  │  ├─index.php

│  ├─...

├─index.php // 业务逻辑

```
PHPCopy
业务逻辑的代码：

```php
<?php
class Test{
    public function index(){
        // 用户注册成功

        // 获取全部插件
        $pluginList=scandir('./plugin/');
        // 循环插件 // 排除. ..
        foreach ($pluginList as $k => $v) {

            if ($v=='.' || $v=='..') {
                unset($pluginList[$k]);
            }
        }
        echo "简易后台管理<hr>";
        // 插件管理
        foreach ($pluginList as $k => $v) {
            // 获取配置项
            $config=include './plugin/'.$v.'/config.php';
            $word=$config['status']==1 ? '点击关闭' : '点击开启';
            echo $config['title'].'<a href="./index.php?change='.$v.'">'.$word.'</a><br />';
        }
        echo '<hr>';
        // 输出插件内容
        foreach ($pluginList as $k => $v) {
            // 获取配置项
            $config=include './plugin/'.$v.'/config.php';
            if ($config['status']==1) {
                include './plugin/'.$v.'/index.php';
                // 运行插件
                Hook::run($v);
            }
        }
        // 前往网站首页
    }
}

// 插件类
    class Hook{
    // 注册添加插件
    public static function add($name,$func){
        $GLOBALS['hookList'][$name][]=$func;
    }
    // 执行插件
    public static function run($name,$params=null){
        foreach ($GLOBALS['hookList'][$name] as $k => $v) {
            call_user_func($v,$params);
        }
    }
}

// 更改插件状态
if (isset($_GET['change'])) {
    // 获取到配置项
    $config=include './plugin/plugin'.substr($_GET['change'],-1).'/config.php';
    // 如果是开启 那就关闭 如果是关闭 则开启
    $config['status']=$config['status']==1 ? 0: 1;
    // 将更改后的配置项写入到文件中
    $str="<?php \\r\\n return ".var_export($config,true).';';
    file_put_contents('./plugin/'.$_GET['change'].'/config.php', $str);
    header('Location:./');
}

$test=new Test();
$test->index();
```


PHPCopy
插件配置项代码：
```php
<?php
 return array (
  'status' => 1, // 定义状态 1表示开启  0表示关闭
  'title' => '发送短信', // 插件的名称
);

```


PHPCopy
插件的内容：

```php
<?php

Hook::add('plugin1',function(){
    echo '发送短信的内容<br />';
});



```
没错；这就是插件的思想；

当然这只是一个超级简单的示例；

完整的插件机制要包括插件的类型、数据库、审核等等；
