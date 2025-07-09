---
title: MySQL Configuration File Analysis
date: 2022-04-09 11:31:32
tags:
    - MySQL
description: A detailed introduction to MySQL configuration file analysis, including file locations, common configuration items, optimization suggestions, and more, to help developers better manage and optimize MySQL databases.
author: PFinal Nancheng
keywords: MySQL, configuration file, analysis, optimization, database, management, optimization suggestions, MySQL configuration file
---

# MySQL Configuration File Analysis

```
[client]    
port = 3309   
socket = /home/mysql/mysql/tmp/mysql.sock    
[mysqld]    
!include /home/mysql/mysql/etc/mysqld.cnf #Included configuration file, store username and password files separately    
port = 3309   
socket = /home/mysql/mysql/tmp/mysql.sock    
pid-file = /longxibendi/mysql/mysql/var/mysql.pid    
basedir = /home/mysql/mysql/    
datadir = /longxibendi/mysql/mysql/var/    
# tmp dir settings    
tmpdir = /home/mysql/mysql/tmp/    
slave-load-tmpdir = /home/mysql/mysql/tmp/    
#When slave executes load data infile    
#language = /home/mysql/mysql/share/mysql/english/    
character-sets-dir = /home/mysql/mysql/share/mysql/charsets/    
# skip options    
skip-name-resolve #When granting, must use IP instead of hostname    
skip-symbolic-links #Symbolic links not allowed    
skip-external-locking #No system locking, must shut down server to use myisamchk    
skip-slave-start #Do not start replication when MySQL starts    
#sysdate-is-now    
# res settings    
back_log = 50 #Accept queue, requests not yet connected are queued here, size limited by OS parameter    
max_connections = 1000 #Max concurrent connections, increasing this requires more file descriptors    
max_connect_errors = 10000 #If a user's connection errors exceed this, their next connection is blocked until admin runs flush hosts; prevents attacks    
#open_files_limit = 10240   
connect-timeout = 10 #Max seconds before connection times out, also used for server's first response on Linux    
wait-timeout = 28800 #Time to wait before closing connection    
interactive-timeout = 28800 #Allowed inactivity before closing interactive connection. Client session's wait_timeout is set to interactive_timeout.    
slave-net-timeout = 600 #Slave notifies network interruption if no data from master for this many seconds    
net_read_timeout = 30 #Timeout for slave reading info    
net_write_timeout = 60 #Timeout for slave writing info    
net_retry_count = 10 #Retries before giving up on interrupted read    
net_buffer_length = 16384 #Packet buffer initialized to this size, can grow to max_allowed_packet    
max_allowed_packet = 64M #    
#table_cache = 512 #Number of open tables for all threads. Increasing this increases needed file descriptors    
thread_stack = 192K #Stack size per thread    
thread_cache_size = 20 #Thread cache    
thread_concurrency = 8 #Number of threads running simultaneously, best set to twice the number of CPUs    
# qcache settings    
query_cache_size = 256M #Query cache size    
query_cache_limit = 2M #Do not cache results larger than this    
query_cache_min_res_unit = 2K #Minimum block size for query cache allocation    
# default settings    
# time zone    
default-time-zone = system #Server time zone    
character-set-server = utf8 #Server-level charset    
default-storage-engine = InnoDB #Default storage engine    
# tmp & heap    
tmp_table_size = 512M #Temp table size, results go to disk if exceeded    
max_heap_table_size = 512M #Max MEMORY (HEAP) table size    
log-bin = mysql-bin #Paths relative to datadir    
log-bin-index = mysql-bin.index    
relayrelay-log = relay-log    
relayrelay_log_index = relay-log.index    
# warning & error log    
log-warnings = 1   
log-error = /home/mysql/mysql/log/mysql.err    
log_output = FILE #Format for slow query output, default is FILE, can set to TABLE to query slow_log table    
# slow query log    
slow_query_log = 1   
long-query-time = 1 #Slow query threshold in seconds    
slow_query_log_file = /home/mysql/mysql/log/slow.log    
#log-queries-not-using-indexes    
#log-slow-slave-statements    
general_log = 1   
general_log_file = /home/mysql/mysql/log/mysql.log    
max_binlog_size = 1G   
max_relay_log_size = 1G   
# if use auto-ex, set to 0    
relay-log-purge = 1 #Delete relay logs when not used, done by SQL thread    
# max binlog keeps days    
expire_logs_days = 30 #Delete binlogs older than 30 days    
binlog_cache_size = 1M #Session level    
# replication    
replicate-wild-ignore-table = mysql.% #Ignore these dbs/tables during replication    
replicate-wild-ignore-table = test.% #Ignore these dbs/tables during replication    
# slave_skip_errors=all   
key_buffer_size = 256M #MyISAM index buffer, only key not data    
sort_buffer_size = 2M #Sort buffer size, per thread    
read_buffer_size = 2M #Buffer for full table scan, per thread    
join_buffer_size = 8M #Join buffer size, per thread    
read_rnd_buffer_size = 8M #MyISAM random scan buffer, per thread    
bulk_insert_buffer_size = 64M #MyISAM bulk insert buffer, per thread    
myisam_sort_buffer_size = 64M #MyISAM buffer for index creation or repair    
myisam_max_sort_file_size = 10G #Max temp file size for MyISAM index creation    
myisam_repair_threads = 1 #Parallel threads for MyISAM repair    
myisam_recover = 64K#Max length for GROUP_CONCAT() result    
transaction_isolation = REPEATABLE-READ    
innodb_file_per_table    
#innodb_status_file = 1   
#innodb_open_files = 2048   
innodb_additional_mem_pool_size = 100M #Memory pool for InnoDB control objects    
innodb_buffer_pool_size = 2G #Includes data pages, index pages, insert buffer, lock info, adaptive hash, data dictionary    
innodb_data_home_dir = /longxibendi/mysql/mysql/var/    
#innodb_data_file_path = ibdata1:1G:autoextend    
innodb_data_file_path = ibdata1:500M;ibdata2:2210M:autoextend #Tablespace    
innodb_file_io_threads = 4 #IO threads    
innodb_thread_concurrency = 16 #Try to keep OS threads in InnoDB below this limit    
innodb_flush_log_at_trx_commit = 1 #Flush log buffer to disk at every commit    
innodb_log_buffer_size = 8M #Transaction log buffer    
innodb_log_file_size = 500M #Transaction log size    
#innodb_log_file_size =100M   
innodb_log_files_in_group = 2 #Two log files in group    
innodb_log_group_home_dir = /longxibendi/mysql/mysql/var/#Log group    
innodb_max_dirty_pages_pct = 90 #Main thread flushes buffer pool to keep dirty pages below 90%    
innodb_lock_wait_timeout = 50 #Timeout in seconds before rolling back InnoDB transaction    
#innodb_flush_method = O_DSYNC   
[mysqldump]    
quick    
max_allowed_packet = 64M   
[mysql]    
disable-auto-rehash #Enable TAB completion    
default-character-set = utf8   
connect-timeout = 3   
```

### High Availability and High Performance Tuning

```
[client]
default-character-set = utf8mb4

[mysqld]

### Basic Properties
port = 3306
datadir=/data/mysql
# Disable hostname resolution
skip-name-resolve
# Default storage engine
default-storage-engine = InnoDB

### Charset Settings
character-set-client-handshake = FALSE
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
init_connect='SET NAMES utf8mb4'

### GTID
server_id = 59
# For stable GTID replication, use row-based logging
binlog_format = row
# Enable GTID
gtid_mode = on
# Ensure GTID transaction safety
enforce-gtid-consistency = true
# The following two are required for master-slave switch and high availability
log_bin = on
log-slave-updates = on

### Slow Query Log
slow_query_log = 1
long_query_time = 2
log_queries_not_using_indexes = 1

### Auto Recovery
relay_log_info_repository = TABLE
master_info_repository = TABLE
relay_log_recovery = on
relay_log_purge = 1

### Data Security
log_bin_trust_function_creators = off
sync_binlog = 1
explicit_defaults_for_timestamp=true

### Optimization
ft_min_word_len = 1
lower_case_table_names = 1
max_allowed_packet = 256M
rpl_semi_sync_master_enabled = 1
rpl_semi_sync_slave_enabled = 1
rpl_semi_sync_master_timeout = 1000
rpl_semi_sync_master_wait_point = AFTER_SYNC
rpl_semi_sync_master_wait_slave_count = 1
slave_parallel_type = logical_clock
slave_parallel_workers = 4

### Connection Limits
max_connections = 1500
max_connect_errors = 20
back_log = 500
open_files_limit = 65535
interactive_timeout = 3600
wait_timeout = 3600

### Memory Allocation
table_open_cache = 1024
binlog_cache_size = 2M
tmp_table_size = 128M
max_heap_table_size = 16M
read_buffer_size = 1M
read_rnd_buffer_size = 8M
sort_buffer_size = 1M
query_cache_size = 64M
query_cache_limit = 1M
join_buffer_size = 16M
thread_cache_size = 64

### InnoDB Optimization
innodb_buffer_pool_size=2G
innodb_log_file_size = 256M
innodb_log_buffer_size = 4M
innodb_log_buffer_size = 3M
innodb_flush_log_at_trx_commit = 1
innodb_data_file_path = ibdata1:100M:autoextend
innodb_log_files_in_group = 3
innodb_open_files = 800
innodb_file_per_table = 1
innodb_write_io_threads = 8
innodb_read_io_threads = 8
innodb_purge_threads = 1
innodb_lock_wait_timeout = 120
innodb_strict_mode=1
 innodb_large_prefix = on

[mysqldump]
quick
default-character-set = utf8mb4
max_allowed_packet = 256M

[mysql]
auto-rehash
default-character-set = utf8mb4

``` 