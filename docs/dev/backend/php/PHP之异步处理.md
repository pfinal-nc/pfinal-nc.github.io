---
title: 如何掌握PHP之异步处理 - PHP 开发完整指南
date: 2022-04-27T22:10:20.000Z
tags:
  - php
keywords: >-
  PHP异步处理, php, 工具, php异步处理, php协程, php异步协程, PHP之异步处理, PHP异步编程, PHP消息队列, PHP
  Redis队列, PHP异步请求, PHP fsockopen, PHP curl异步, PHP popen异步, PHP守护进程,
  PHP异步处理最佳实践, PHP异步编程教程, PHP高并发处理, PHP异步技术
description: 详细介绍PHP异步处理的相关知识，包括异步处理的概念、应用场景、实现方式等，帮助开发者更好地利用PHP的异步处理能力，提高程序的性能和响应速度。
author: PFinal南丞
recommend: 后端工程
---

# PHP之异步处理

个人理解在项目中使用消息队列一般是有如下几个原因：

> 1.把瞬间服务器的请求处理换成异步处理，缓解服务器的压力

> 2.实现数据顺序排列获取

- ### redis 队列 实现 异步处理的效果

```php
<?php
/**
 * 请求过来以后,如果数据过大,导致响应速度过慢,则可以先把要处理的数据保存到redis中, 然后直接去响应
 */
//redis数据入队操作
    $redis = new Redis();
    $redis->connect('127.0.0.1',6379);
    for($i=0;$i<50;$i++){
        try{
            $redis->LPUSH('click',rand(1000,5000));
        }catch(Exception $e){
            echo $e->getMessage();
    }
}

```

> 在后台进行数据处理   守护进程 去处理数据

```php
<?php
//redis数据出队操作,从redis中将请求取出
    $redis = new Redis();
    $redis->pconnect('127.0.0.1',6379);
    while(true){
        try{
            $value = $redis->LPOP('click');
            if(!$value){
                break;
            }
            var_dump($value)."\n";
        /*
        * 利用$value进行逻辑和数据处理
        */
        }catch(Exception $e){
            echo $e->getMessage();
        }
}

```

- ### 使用ajax 去处理  

```javascript
// 使用ajax 去请求另外一个方法
$.get("doAsync.php", { name: 'raykaeso',job:'PHP    Programmer'});

```

- ### 使用popen，执行本地文件

```php
<?php
    pclose(popen('php /var/www/doAsync.php &', 'r'));

```

- ### 使用curl    

> 设置curl的超时时间 CURLOPT_TIMEOUT 为1 （最小为1），因此客户端需要等待1秒，curl请求地址必须为绝对路径

```php
<?php

$param = array(
    'name'=>'raykaeso',
    'job'=>'PHP Programmer'
    );
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL,"http://www.example.com/doAsync.php");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($param)); //将数组转换为URL请求字符串
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_HEADER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 1);
curl_exec($ch);
curl_close($ch);


```

- ### 使用fsockopen,需要自己拼接header部分

```php
<?php
function doRequest($url, $param=array(),$timeout =10){
    $urlParmas = parse_url($url);
    $host = $urlParmas['host'];
    $path = $urlParmas['path'];
    $port = isset($urlParmas['port'])? $urlParmas['port'] :80;
    $errno = 0;
    $errstr = '';

    $fp = fsockopen($host, $port, $errno, $errstr, $timeout);
    $query = isset($param)? http_build_query($param) : '';
    $out = "POST ".$path." HTTP/1.1\r\n";
    $out .= "host:".$host."\r\n";
    $out .= "content-length:".strlen($query)."\r\n";
    $out .= "content-type:application/x-www-form-urlencoded\r\n";
    $out .= "connection:close\r\n\r\n";
    $out .= $query;

    fputs($fp, $out);
    fclose($fp);
    }
    $url = 'http://www.example.com/doAsync.php';
    $param = array(
    'name'=>'raykaeso',
    'job'=>'PHP Programmer'
    );
doRequest($url, $param);

```
**注意：**

> 1、如果使用Apache作为Web服务器，让PHP支持异步首先必须得在Apache配置文件httpd.conf配置enablesendfile on。

> 2、在异步执行的PHP文件中建议加上一下两个配置：

```php

ignore_user_abort(true); // 忽略客户端断开
set_time_limit(0); // 设置执行不超时

```

最后,引入 鸟哥 的 经典  fsockopen 分装 代码:

```php
<?php

function triggerRequest($url, $post_data = array(), $cookie = array()){
        $method = "GET";  //可以通过POST或者GET传递一些参数给要触发的脚本
        $url_array = parse_url($url); //获取URL信息，以便平凑HTTP HEADER
        $port = isset($url_array['port'])? $url_array['port'] : 80; 
      
        $fp = fsockopen($url_array['host'], $port, $errno, $errstr, 30); 
        if (!$fp) …{
                return FALSE;
        }
        $getPath = $url_array['path'] ."?". $url_array['query'];
        if(!empty($post_data))…{
                $method = "POST";
        }
        $header = $method . " " . $getPath;
        $header .= " HTTP/1.1\r\n";
        $header .= "Host: ". $url_array['host'] . "\r\n "; //HTTP 1.1 Host域不能省略
        /**//*以下头信息域可以省略
        $header .= "User-Agent: Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13 \r\n";
        $header .= "Accept: text/xml,application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,q=0.5 \r\n";
        $header .= "Accept-Language: en-us,en;q=0.5 ";
        $header .= "Accept-Encoding: gzip,deflate\r\n";
         */

        $header .= "Connection:Close\r\n";
        if(!empty($cookie))…{
                $_cookie = strval(NULL);
                foreach($cookie as $k => $v){
                        $_cookie .= $k."=".$v."; ";
                }
                $cookie_str =  "Cookie: " . base64_encode($_cookie) ." \r\n";//传递Cookie
                $header .= $cookie_str;
        }
        if(!empty($post_data)){
                $_post = strval(NULL);
                foreach($post_data as $k => $v)…{
                        $_post .= $k."=".$v."&";
                }
                $post_str  = "Content-Type: application/x-www-form-urlencoded\r\n";//POST数据
                $post_str .= "Content-Length: ". strlen($_post) ." \r\n";//POST数据的长度
                $post_str .= $_post."\r\n\r\n "; //传递POST数据
                $header .= $post_str;
        }
        fwrite($fp, $header);
        //echo fread($fp, 1024); //我们不关心服务器返回
        fclose($fp);
        return true;
}

```
