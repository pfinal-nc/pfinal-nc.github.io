---
title: "如何掌握PHP-FPM配置文件解析 - PHP 开发完整指南"
date: 2023-04-27 22:10:20
author: PFinal南丞
tags:
    - php
keywords: PHP-FPM配置文件解析, php, 工具, php-fpm配置文件, php-fpm配置文件解析, php-fpm配置文件详解, PHP-FPM配置文件详解, PHP-FPM配置优化, PHP-FPM进程管理, PHP-FPM性能调优, PHP-FPM日志配置, PHP-FPM安全配置, PHP-FPM服务器配置, PHP-FPM最佳实践, PHP-FPM配置教程, PHP-FPM高并发配置, PHP-FPM监控配置
description: 详细介绍PHP-FPM配置文件解析，包括配置文件的基本结构、常用配置项、进程管理、日志记录等内容，帮助开发者更好地配置和管理PHP-FPM服务。
---

# PHP-FPM配置文件详解

```
[www]
; It only applies on the following directives:
; - 'access.log'
; - 'slowlog'
; - 'listen' (unixsocket)
; - 'chroot'
; - 'chdir'
; - 'php_values'
; - 'php_admin_values'

;prefix = /path/to/pools/$pool   如果没有制定，将使用全局prefix替代
user = nobody　　　　　　　　　　　　 进程的发起用户和用户组，用户user是必须设置，group不是
group = nobody
listen = 127.0.0.1:9000　　　　　　 监听ip和端口
;listen.backlog = 65535　　　　　　 设置listen(2)函数backlog
;listen.owner = nobody
;listen.group = nobody
;listen.mode = 0660
;listen.acl_users =
;listen.acl_groups =
;listen.allowed_clients = 127.0.0.1 允许FastCGI客户端连接的IPv4地址，多个地址用','分隔，为空则允许任何地址发来链接请求
; process.priority = -19
pm = dynamic　　　　　　　　　　　　　 选择进程池管理器如何控制子进程的数量
　　static：　　对于子进程的开启数路给定一个锁定的值(pm.max_children)
　　dynamic:　 子进程的数目为动态的，它的数目基于下面的指令的值(以下为dynamic适用参数)
　　　　pm.max_children：  同一时刻能够存货的最大子进程的数量
　　　　pm.start_servers： 在启动时启动的子进程数量
　　　　pm.min_spare_servers： 处于空闲"idle"状态的最小子进程，如果空闲进程数量小于这个值，那么相应的子进程会被创建
　　　　pm.max_spare_servers： 最大空闲子进程数量，空闲子进程数量超过这个值，那么相应的子进程会被杀掉。
　　ondemand： 在启动时不会创建，只有当发起请求链接时才会创建(pm.max_children, pm.process_idle_timeout)

pm.max_children = 5
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3
;pm.process_idle_timeout = 10s;　　空闲进程超时时间
;pm.max_requests = 500　　　　　　　 在派生新的子进程前，每一个子进程应该处理的请求数目，在第三方库中解决内存溢出很有用，设置为0则不会限制
;pm.status_path = /status　　　     配置一个URI，以便查看fpm状态页
状态页描述：
　　accepted conn: 该进程池接受的请求数量
　　pool: 进程池的名字
　　process manager: 进程管理，就是配置中pm指令，可以选择值static，dynamic，ondemand
　　idle processes: 空闲进程数量
　　active processes: 当前活跃的进程数量
　　total processes: 总的进程数量=idle+active
　　max children reached: 达到最大子进程的次数，达到进程的限制，当pm试图开启更多的子进程的时候(仅当pm工作在dynamic时)
;ping.path = /ping　　　　该ping URI将会去调用fpm监控页面，如果这个没有设置，那么不会有URI被做为ping页
;ping.response = pong　　用于定制平请求的响应，响应的格式text/plain(对200响应代码)
;access.log = log/$pool.access.log
;access.format = "%R - %u %t \"%m %r%Q%q\" %s %f %{mili}d %{kilo}M %C%%"
　　; The following syntax is allowed
　　;  %%: the '%' character
　　;  %C: %CPU used by the request
　　;      it can accept the following format:
　　;      - %{user}C for user CPU only
　　;      - %{system}C for system CPU only
　　;      - %{total}C  for user + system CPU (default)
　　;  %d: time taken to serve the request
　　;      it can accept the following format:
　　;      - %{seconds}d (default)
　　;      - %{miliseconds}d
　　;      - %{mili}d
　　;      - %{microseconds}d
　　;      - %{micro}d
　　;  %e: an environment variable (same as $_ENV or $_SERVER)
　　;      it must be associated with embraces to specify the name of the env
　　;      variable. Some exemples:
　　;      - server specifics like: %{REQUEST_METHOD}e or %{SERVER_PROTOCOL}e
　　;      - HTTP headers like: %{HTTP_HOST}e or %{HTTP_USER_AGENT}e
　　;  %f: script filename
　　;  %l: content-length of the request (for POST request only)
　　;  %m: request method
　　;  %M: peak of memory allocated by PHP
　　;      it can accept the following format:
　　;      - %{bytes}M (default)
　　;      - %{kilobytes}M
　　;      - %{kilo}M
　　;      - %{megabytes}M
　　;      - %{mega}M
　　;  %n: pool name
　　;  %o: output header
　　;      it must be associated with embraces to specify the name of the header:
　　;      - %{Content-Type}o
　　;      - %{X-Powered-By}o
　　;      - %{Transfert-Encoding}o
　　;      - ....
　　;  %p: PID of the child that serviced the request
　　;  %P: PID of the parent of the child that serviced the request
　　;  %q: the query string
　　;  %Q: the '?' character if query string exists
　　;  %r: the request URI (without the query string, see %q and %Q)
　　;  %R: remote IP address
　　;  %s: status (response code)
　　;  %t: server time the request was received
　　;      it can accept a strftime(3) format:
　　;      %d/%b/%Y:%H:%M:%S %z (default)
　　;  %T: time the log has been written (the request has finished)
　　;      it can accept a strftime(3) format:
　　;      %d/%b/%Y:%H:%M:%S %z (default)
　　;  %u: remote user
;slowlog = log/$pool.log.slow　　 用于记录慢请求
;request_slowlog_timeout = 0　　  慢日志请求超时时间，对一个php程序进行跟踪。
;request_terminate_timeout = 0　　终止请求超时时间，在worker进程被杀掉之后，提供单个请求的超时间隔。由于某种原因不停止脚本执行时，应该使用该选项，0表示关闭不启用
　　(在php.ini中，max_execution_time 一般设置为30，表示每一个脚本的最大执行时间)
;rlimit_files = 1024　　　　　　　　设置打开文件描述符的限制
;rlimit_core = 0　　　　　　　　　　 设置内核对资源的使用限制，用于内核转储
;chroot =　　　　　　　　　　　　　　　设置chroot路径，程序一启动就将其chroot放置到指定的目录下，该指令值必须是一个绝对路径
;chdir = /var/www　　　　　　　　　　在程序启动时将会改变到指定的位置(这个是相对路径，相对当前路径或chroot后的“/”目录)　　　　
;catch_workers_output = yes　　　　将worker的标准输出和错误输出重定向到主要的错误日志记录中，如果没有设置，根据FastCGI的指定，将会被重定向到/dev/null上
;clear_env = no　　　　　　　　　　  清理环境
;security.limit_extensions = .php .php3 .php4 .php5　　限制FPM执行解析的扩展名
;env[HOSTNAME] = $HOSTNAME
;env[PATH] = /usr/local/bin:/usr/bin:/bin
;env[TMP] = /tmp
;env[TMPDIR] = /tmp
;env[TEMP] = /tmp

; Additional php.ini defines, specific to this pool of workers. These settings
; overwrite the values previously defined in the php.ini. The directives are the
; same as the PHP SAPI:
;   php_value/php_flag             - you can set classic ini defines which can
;                                    be overwritten from PHP call 'ini_set'.
;   php_admin_value/php_admin_flag - these directives won't be overwritten by
;                                     PHP call 'ini_set'
; For php_*flag, valid values are on, off, 1, 0, true, false, yes or no.

; Defining 'extension' will load the corresponding shared extension from
; extension_dir. Defining 'disable_functions' or 'disable_classes' will not
; overwrite previously defined php.ini values, but will append the new value
; instead.

;php_admin_value[sendmail_path] = /usr/sbin/sendmail -t -i -f www@my.domain.com
;php_flag[display_errors] = off
;php_admin_value[error_log] = /var/log/fpm-php.www.log
;php_admin_flag[log_errors] = on
;php_admin_value[memory_limit] = 32M

```