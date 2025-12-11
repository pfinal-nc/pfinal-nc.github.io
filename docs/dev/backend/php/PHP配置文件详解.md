---
title: PHP配置文件详解
date: 2022-07-04 13:36:42
tags:
    - PHP
description: PHP配置文件详解
author: PFinal南丞
keywords: PHP, 配置文件, 详解, 编程, web开发, 服务器配置, PHP配置文件详解, PHP配置优化, PHP服务器配置, PHP性能配置, PHP安全配置, PHP文件上传配置, PHP会话配置, PHP调试配置, PHP配置最佳实践, PHP配置教程, PHP环境配置, PHP开发环境配置 
---

# PHP配置文件详解


```
; 避免PHP信息暴露在http头中
expose_php = Off
; 避免暴露php调用mysql的错误信息
display_errors = Off
; 在关闭display_errors后开启PHP错误日志（路径在php-fpm.conf中配置）
log_errors = On
; 设置PHP的扩展库路径
extension_dir = "/usr/local/php7/lib/php/extensions/no-debug-non-zts-20141001/"
; 设置PHP的opcache和mysql动态库
zend_extension=opcache.so
extension=mysqli.so
extension=pdo_mysql.so
; 设置PHP的时区
date.timezone = PRC
; 开启opcache
[opcache]
; Determines if Zend OPCache is enabled
opcache.enable=1
;  设置PHP脚本允许访问的目录（需要根据实际情况配置）
;open_basedir = /usr/share/nginx/html;

;;;;;;;;;;;;;;;; 
; File Uploads ; 
;;;;;;;;;;;;;;;; 
file_uploads = On ; 是否允许HTTP方式文件上载 
;upload_tmp_dir = ; 用于HTTP上载的文件的临时目录（未指定则使用系统默认） 
upload_max_filesize = 2M ; 上载文件的最大许可大小
post_max_size = 128M
upload_max_filesize = 128M
; 这两个设置一样即可，可以更大但要注意超时
max_execution_time = 30
max_input_time = 600
memory_limit = 32M

; 上传大文件 

; Fopen wrappers ; 
;;;;;;;;;;;;;;;;;; 
allow_url_fopen = On ; 是否允许把URLs当作http:.. 或把文件当作ftp:...

[Debugger] 
debugger.host = localhost 
debugger.port = 7869 
debugger.enabled = False

[Session] 
session.save_handler = files ; 用于保存/取回数据的控制方式 
session.save_path = C:\win\temp ; 在 save_handler 设为文件时传给控制器的参数， 
; 这是数据文件将保存的路径。 
session.use_cookies = 1 ; 是否使用cookies 
session.name = PHPSESSID 
; 用在cookie里的session的名字 
session.auto_start = 0 ; 在请求启动时初始化session 
session.cookie_lifetime = 0 ; 为按秒记的cookie的保存时间， 
; 或为0时，直到浏览器被重启 
session.cookie_path = / ; cookie的有效路径 
session.cookie_domain = ; cookie的有效域 
session.serialize_handler = php ; 用于连接数据的控制器 
; php是 PHP 的标准控制器。 
session.gc_probability = 1 ; 按百分比的'garbage collection（碎片整理）'进程 
; 在每次 session 初始化的时候开始的可能性。 
session.gc_maxlifetime = 1440 ; 在这里数字所指的秒数后，保存的数据将被视为 
; '碎片(garbage)'并由gc 进程清理掉。 
session.referer_check = ; 检查 HTTP引用以使额外包含于URLs中的ids无效 
session.entropy_length = 0 ; 从文件中读取多少字节 
session.entropy_file = ; 指定这里建立 session id 
; session.entropy_length = 16 
; session.entropy_file = /dev/urandom 
session.cache_limiter = nocache ; 设为{nocache,private,public},以决定 HTTP 的 
; 缓存问题 
session.cache_expire = 180 ; 文档在 n 分钟后过时 
session.use_trans_sid = 1 ; 使用过渡性的 sid 支持，若编译时许可了 
; --enable-trans-sid 
url_rewriter.tags = " a=href,area=href,frame=src,input=src,form=fakeentry"

```