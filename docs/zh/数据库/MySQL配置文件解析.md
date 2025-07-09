---
title: MySQL配置文件解析
date: 2022-04-09 11:31:32
tags:
    - MySQL
description: 详细介绍MySQL配置文件的解析，包括配置文件的位置、常用配置项、优化建议等，帮助开发者更好地管理和优化MySQL数据库。
author: PFinal南丞
keywords: MySQL, 配置文件, 解析, 优化, 数据库, 配置, 管理, 优化建议, 配置文件解析, MySQL配置文件, MySQL配置
---


# Mysql配置文件解析

```
[client]    
port = 3309   
socket = /home/mysql/mysql/tmp/mysql.sock    
[mysqld]    
!include /home/mysql/mysql/etc/mysqld.cnf #包含的配置文件 ，把用户名，密码文件单独存放    
port = 3309   
socket = /home/mysql/mysql/tmp/mysql.sock    
pid-file = /longxibendi/mysql/mysql/var/mysql.pid    
basedir = /home/mysql/mysql/    
datadir = /longxibendi/mysql/mysql/var/    
# tmp dir settings    
tmpdir = /home/mysql/mysql/tmp/    
slave-load-tmpdir = /home/mysql/mysql/tmp/    
#当slave 执行 load data infile 时用    
#language = /home/mysql/mysql/share/mysql/english/    
character-sets-dir = /home/mysql/mysql/share/mysql/charsets/    
# skip options    
skip-name-resolve #grant 时，必须使用ip不能使用主机名    
skip-symbolic-links #不能使用连接文件    
skip-external-locking #不使用系统锁定，要使用myisamchk,必须关闭服务器    
skip-slave-start #启动mysql,不启动复制    
#sysdate-is-now    
# res settings    
back_log = 50 #接受队列，对于没建立tcp连接的请求队列放入缓存中，队列大小为back_log，受限制与OS参数    
max_connections = 1000 #最大并发连接数 ，增大该值需要相应增加允许打开的文件描述符数    
max_connect_errors = 10000 #如果某个用户发起的连接error超过该数值，则该用户的下次连接将被阻塞，直到管理员执行flush hosts ; 命令；防止黑客    
#open_files_limit = 10240   
connect-timeout = 10 #连接超时之前的最大秒数,在Linux平台上，该超时也用作等待服务器首次回应的时间    
wait-timeout = 28800 #等待关闭连接的时间    
interactive-timeout = 28800 #关闭连接之前，允许interactive_timeout（取代了wait_timeout）秒的不活动时间。客户端的会话wait_timeout变量被设为会话interactive_timeout变量的值。    
slave-net-timeout = 600 #从服务器也能够处理网络连接中断。但是，只有从服务器超过slave_net_timeout秒没有从主服务器收到数据才通知网络中断    
net_read_timeout = 30 #从服务器读取信息的超时    
net_write_timeout = 60 #从服务器写入信息的超时    
net_retry_count = 10 #如果某个通信端口的读操作中断了，在放弃前重试多次    
net_buffer_length = 16384 #包消息缓冲区初始化为net_buffer_length字节，但需要时可以增长到max_allowed_packet字节    
max_allowed_packet = 64M #    
#table_cache = 512 #所有线程打开的表的数目。增大该值可以增加mysqld需要的文件描述符的数量    
thread_stack = 192K #每个线程的堆栈大小    
thread_cache_size = 20 #线程缓存    
thread_concurrency = 8 #同时运行的线程的数据 此处最好为CPU个数两倍。本机配置为CPU的个数    
# qcache settings    
query_cache_size = 256M #查询缓存大小    
query_cache_limit = 2M #不缓存查询大于该值的结果    
query_cache_min_res_unit = 2K #查询缓存分配的最小块大小    
# default settings    
# time zone    
default-time-zone = system #服务器时区    
character-set-server = utf8 #server级别字符集    
default-storage-engine = InnoDB #默认存储    
# tmp & heap    
tmp_table_size = 512M #临时表大小，如果超过该值，则结果放到磁盘中    
max_heap_table_size = 512M #该变量设置MEMORY (HEAP)表可以增长到的最大空间大小    
log-bin = mysql-bin #这些路径相对于datadir    
log-bin-index = mysql-bin.index    
relayrelay-log = relay-log    
relayrelay_log_index = relay-log.index    
# warning & error log    
log-warnings = 1   
log-error = /home/mysql/mysql/log/mysql.err    
log_output = FILE #参数log_output指定了慢查询输出的格式，默认为FILE，你可以将它设为TABLE，然后就可以查询mysql架构下的slow_log表了    
# slow query log    
slow_query_log = 1   
long-query-time = 1 #慢查询时间 超过1秒则为慢查询    
slow_query_log_file = /home/mysql/mysql/log/slow.log    
#log-queries-not-using-indexes    
#log-slow-slave-statements    
general_log = 1   
general_log_file = /home/mysql/mysql/log/mysql.log    
max_binlog_size = 1G   
max_relay_log_size = 1G   
# if use auto-ex, set to 0    
relay-log-purge = 1 #当不用中继日志时，删除他们。这个操作有SQL线程完成    
# max binlog keeps days    
expire_logs_days = 30 #超过30天的binlog删除    
binlog_cache_size = 1M #session级别    
# replication    
replicate-wild-ignore-table = mysql.% #复制时忽略数据库及表    
replicate-wild-ignore-table = test.% #复制时忽略数据库及表    
# slave_skip_errors=all   
key_buffer_size = 256M #myisam索引buffer,只有key没有data    
sort_buffer_size = 2M #排序buffer大小；线程级别    
read_buffer_size = 2M #以全表扫描(Sequential Scan)方式扫描数据的buffer大小 ；线程级别    
join_buffer_size = 8M # join buffer 大小;线程级别    
read_rnd_buffer_size = 8M #MyISAM以索引扫描(Random Scan)方式扫描数据的buffer大小 ；线程级别    
bulk_insert_buffer_size = 64M #MyISAM 用在块插入优化中的树缓冲区的大小。注释：这是一个per thread的限制    
myisam_sort_buffer_size = 64M #MyISAM 设置恢复表之时使用的缓冲区的尺寸,当在REPAIR TABLE或用CREATE INDEX创建索引或ALTER TABLE过程中排序 MyISAM索引分配的缓冲区    
myisam_max_sort_file_size = 10G #MyISAM 如果临时文件会变得超过索引，不要使用快速排序索引方法来创建一个索引。注释：这个参数以字节的形式给出.重建MyISAM索引(在REPAIR TABLE、ALTER TABLE或LOAD DATA INFILE过程中)时，允许MySQL使用的临时文件的最大空间大小。如果文件的大小超过该值，则使用键值缓存创建索引，要慢得多。该值的单位为字节    
myisam_repair_threads = 1 #如果该值大于1，在Repair by sorting过程中并行创建MyISAM表索引(每个索引在自己的线程内)    
myisam_recover = 64K#允许的GROUP_CONCAT()函数结果的最大长度    
transaction_isolation = REPEATABLE-READ    
innodb_file_per_table    
#innodb_status_file = 1   
#innodb_open_files = 2048   
innodb_additional_mem_pool_size = 100M #帧缓存的控制对象需要从此处申请缓存，所以该值与innodb_buffer_pool对应    
innodb_buffer_pool_size = 2G #包括数据页、索引页、插入缓存、锁信息、自适应哈希所以、数据字典信息    
innodb_data_home_dir = /longxibendi/mysql/mysql/var/    
#innodb_data_file_path = ibdata1:1G:autoextend    
innodb_data_file_path = ibdata1:500M;ibdata2:2210M:autoextend #表空间    
innodb_file_io_threads = 4 #io线程数    
innodb_thread_concurrency = 16 #InnoDB试着在InnoDB内保持操作系统线程的数量少于或等于这个参数给出的限制    
innodb_flush_log_at_trx_commit = 1 #每次commit 日志缓存中的数据刷到磁盘中    
innodb_log_buffer_size = 8M #事物日志缓存    
innodb_log_file_size = 500M #事物日志大小    
#innodb_log_file_size =100M   
innodb_log_files_in_group = 2 #两组事物日志    
innodb_log_group_home_dir = /longxibendi/mysql/mysql/var/#日志组    
innodb_max_dirty_pages_pct = 90 #innodb主线程刷新缓存池中的数据，使脏数据比例小于90%    
innodb_lock_wait_timeout = 50 #InnoDB事务在被回滚之前可以等待一个锁定的超时秒数。InnoDB在它自己的 锁定表中自动检测事务死锁并且回滚事务。InnoDB用LOCK TABLES语句注意到锁定设置。默认值是50秒    
#innodb_flush_method = O_DSYNC   
[mysqldump]    
quick    
max_allowed_packet = 64M   
[mysql]    
disable-auto-rehash #允许通过TAB键提示    
default-character-set = utf8   
connect-timeout = 3   
```

### 高可用高性能配置调优

```
[client]
default-character-set = utf8mb4

[mysqld]

### 基本属性配置
port = 3306
datadir=/data/mysql
# 禁用主机名解析
skip-name-resolve
# 默认的数据库引擎
default-storage-engine = InnoDB

### 字符集配置
character-set-client-handshake = FALSE
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
init_connect='SET NAMES utf8mb4'

### GTID
server_id = 59
# 为保证 GTID 复制的稳定, 行级日志
binlog_format = row
# 开启 gtid 功能
gtid_mode = on
# 保障 GTID 事务安全
# 当启用enforce_gtid_consistency功能的时候,
# MySQL只允许能够保障事务安全, 并且能够被日志记录的SQL语句被执行,
# 像create table ... select 和 create temporarytable语句, 
# 以及同时更新事务表和非事务表的SQL语句或事务都不允许执行
enforce-gtid-consistency = true
# 以下两条配置为主从切换, 数据库高可用的必须配置
# 开启 binlog 日志功能
log_bin = on
# 开启从库更新 binlog 日志
log-slave-updates = on

### 慢查询日志
# 打开慢查询日志功能
slow_query_log = 1
# 超过2秒的查询记录下来
long_query_time = 2
# 记录下没有使用索引的查询
log_queries_not_using_indexes = 1

### 自动修复
# 记录 relay.info 到数据表中
relay_log_info_repository = TABLE
# 记录 master.info 到数据表中 
master_info_repository = TABLE
# 启用 relaylog 的自动修复功能
relay_log_recovery = on
# 在 SQL 线程执行完一个 relaylog 后自动删除
relay_log_purge = 1


### 数据安全性配置
# 关闭 master 创建 function 的功能
log_bin_trust_function_creators = off
# 每执行一个事务都强制写入磁盘
sync_binlog = 1
# timestamp 列如果没有显式定义为 not null, 则支持null属性
# 设置 timestamp 的列值为 null, 不会被设置为 current timestamp
explicit_defaults_for_timestamp=true

### 优化配置
# 优化中文全文模糊索引
ft_min_word_len = 1
# 默认库名表名保存为小写, 不区分大小写
lower_case_table_names = 1
# 单条记录写入最大的大小限制
# 过小可能会导致写入(导入)数据失败
max_allowed_packet = 256M
# 半同步复制开启
rpl_semi_sync_master_enabled = 1
rpl_semi_sync_slave_enabled = 1
# 半同步复制超时时间设置
rpl_semi_sync_master_timeout = 1000
# 复制模式(保持系统默认)
rpl_semi_sync_master_wait_point = AFTER_SYNC
# 后端只要有一台收到日志并写入 relaylog 就算成功
rpl_semi_sync_master_wait_slave_count = 1
# 多线程复制
slave_parallel_type = logical_clock
slave_parallel_workers = 4

### 连接数限制
max_connections = 1500
# 验证密码超过20次拒绝连接
max_connect_errors = 20
# back_log值指出在mysql暂时停止回答新请求之前的短时间内多少个请求可以被存在堆栈中
# 也就是说，如果MySql的连接数达到max_connections时，新来的请求将会被存在堆栈中
# 以等待某一连接释放资源，该堆栈的数量即back_log，如果等待连接的数量超过back_log
# 将不被授予连接资源
back_log = 500
open_files_limit = 65535
# 服务器关闭交互式连接前等待活动的秒数
interactive_timeout = 3600
# 服务器关闭非交互连接之前等待活动的秒数
wait_timeout = 3600

### 内存分配
# 指定表高速缓存的大小。每当MySQL访问一个表时，如果在表缓冲区中还有空间
# 该表就被打开并放入其中，这样可以更快地访问表内容
table_open_cache = 1024
# 为每个session 分配的内存, 在事务过程中用来存储二进制日志的缓存
binlog_cache_size = 2M
# 在内存的临时表最大大小
tmp_table_size = 128M
# 创建内存表的最大大小(保持系统默认, 不允许创建过大的内存表)
# 如果有需求当做缓存来用, 可以适当调大此值
max_heap_table_size = 16M
# 顺序读, 读入缓冲区大小设置
# 全表扫描次数多的话, 可以调大此值
read_buffer_size = 1M
# 随机读, 读入缓冲区大小设置
read_rnd_buffer_size = 8M
# 高并发的情况下, 需要减小此值到64K-128K
sort_buffer_size = 1M
# 每个查询最大的缓存大小是1M, 最大缓存64M 数据
query_cache_size = 64M
query_cache_limit = 1M
# 提到 join 的效率
join_buffer_size = 16M
# 线程连接重复利用
thread_cache_size = 64

### InnoDB 优化
## 内存利用方面的设置
# 数据缓冲区
innodb_buffer_pool_size=2G
## 日志方面设置
# 事务日志大小
innodb_log_file_size = 256M
# 日志缓冲区大小
innodb_log_buffer_size = 4M
# 事务在内存中的缓冲
innodb_log_buffer_size = 3M
# 主库保持系统默认, 事务立即写入磁盘, 不会丢失任何一个事务
innodb_flush_log_at_trx_commit = 1
# mysql 的数据文件设置, 初始100, 以10M 自动扩展
innodb_data_file_path = ibdata1:100M:autoextend
# 为提高性能, MySQL可以以循环方式将日志文件写到多个文件
innodb_log_files_in_group = 3
##其他设置
# 如果库里的表特别多的情况，请增加此值
innodb_open_files = 800
# 为每个 InnoDB 表分配单独的表空间
innodb_file_per_table = 1
# InnoDB 使用后台线程处理数据页上写 I/O（输入）请求的数量
innodb_write_io_threads = 8
# InnoDB 使用后台线程处理数据页上读 I/O（输出）请求的数量
innodb_read_io_threads = 8
# 启用单独的线程来回收无用的数据
innodb_purge_threads = 1
# 脏数据刷入磁盘(先保持系统默认, swap 过多使用时, 调小此值, 调小后, 与磁盘交互增多, 性能降低)
# innodb_max_dirty_pages_pct = 90
# 事务等待获取资源等待的最长时间
innodb_lock_wait_timeout = 120
# 开启 InnoDB 严格检查模式, 不警告, 直接报错
innodb_strict_mode=1
# 允许列索引最大达到3072
 innodb_large_prefix = on

[mysqldump]
# 开启快速导出
quick
default-character-set = utf8mb4
max_allowed_packet = 256M

[mysql]
# 开启 tab 补全
auto-rehash
default-character-set = utf8mb4

```