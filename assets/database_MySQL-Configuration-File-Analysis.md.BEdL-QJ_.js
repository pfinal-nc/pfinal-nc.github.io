import{_ as s,c as a,o as e,a6 as p}from"./chunks/framework.DFafSIgU.js";const m=JSON.parse('{"title":"MySQL Configuration File Analysis","description":"A detailed introduction to MySQL configuration file analysis, including file locations, common configuration items, optimization suggestions, and more, to help developers better manage and optimize MySQL databases.","frontmatter":{"title":"MySQL Configuration File Analysis","date":"2022-04-09T11:31:32.000Z","tags":["MySQL"],"description":"A detailed introduction to MySQL configuration file analysis, including file locations, common configuration items, optimization suggestions, and more, to help developers better manage and optimize MySQL databases.","author":"PFinal Nancheng","keywords":"MySQL, configuration file, analysis, optimization, database, management, optimization suggestions, MySQL configuration file","head":[["link",{"rel":"alternate","hreflang":"en","href":"https://friday-go.icu/database/MySQL-Configuration-File-Analysis.html"}],["link",{"rel":"alternate","hreflang":"zh-CN","href":"https://friday-go.icu/zh/database/MySQL-Configuration-File-Analysis.html"}],["link",{"rel":"alternate","hreflang":"x-default","href":"https://friday-go.icu/database/MySQL-Configuration-File-Analysis.html"}],["meta",{"name":"keywords","content":"MySQL, configuration file, analysis, optimization, database, management, optimization suggestions, MySQL configuration file, PFinalClub, Golang, PHP, Python, 技术博客, Tech Blog"}]]},"headers":[],"relativePath":"database/MySQL-Configuration-File-Analysis.md","filePath":"database/MySQL-Configuration-File-Analysis.md","lastUpdated":1752052166000}'),l={name:"database/MySQL-Configuration-File-Analysis.md"};function i(t,n,o,c,r,_){return e(),a("div",{"data-pagefind-body":!0,"data-pagefind-meta":"date:1649503892000"},n[0]||(n[0]=[p(`<h1 id="mysql-configuration-file-analysis" tabindex="-1">MySQL Configuration File Analysis <a class="header-anchor" href="#mysql-configuration-file-analysis" aria-label="Permalink to &quot;MySQL Configuration File Analysis&quot;">​</a></h1><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>[client]    </span></span>
<span class="line"><span>port = 3309   </span></span>
<span class="line"><span>socket = /home/mysql/mysql/tmp/mysql.sock    </span></span>
<span class="line"><span>[mysqld]    </span></span>
<span class="line"><span>!include /home/mysql/mysql/etc/mysqld.cnf #Included configuration file, store username and password files separately    </span></span>
<span class="line"><span>port = 3309   </span></span>
<span class="line"><span>socket = /home/mysql/mysql/tmp/mysql.sock    </span></span>
<span class="line"><span>pid-file = /longxibendi/mysql/mysql/var/mysql.pid    </span></span>
<span class="line"><span>basedir = /home/mysql/mysql/    </span></span>
<span class="line"><span>datadir = /longxibendi/mysql/mysql/var/    </span></span>
<span class="line"><span># tmp dir settings    </span></span>
<span class="line"><span>tmpdir = /home/mysql/mysql/tmp/    </span></span>
<span class="line"><span>slave-load-tmpdir = /home/mysql/mysql/tmp/    </span></span>
<span class="line"><span>#When slave executes load data infile    </span></span>
<span class="line"><span>#language = /home/mysql/mysql/share/mysql/english/    </span></span>
<span class="line"><span>character-sets-dir = /home/mysql/mysql/share/mysql/charsets/    </span></span>
<span class="line"><span># skip options    </span></span>
<span class="line"><span>skip-name-resolve #When granting, must use IP instead of hostname    </span></span>
<span class="line"><span>skip-symbolic-links #Symbolic links not allowed    </span></span>
<span class="line"><span>skip-external-locking #No system locking, must shut down server to use myisamchk    </span></span>
<span class="line"><span>skip-slave-start #Do not start replication when MySQL starts    </span></span>
<span class="line"><span>#sysdate-is-now    </span></span>
<span class="line"><span># res settings    </span></span>
<span class="line"><span>back_log = 50 #Accept queue, requests not yet connected are queued here, size limited by OS parameter    </span></span>
<span class="line"><span>max_connections = 1000 #Max concurrent connections, increasing this requires more file descriptors    </span></span>
<span class="line"><span>max_connect_errors = 10000 #If a user&#39;s connection errors exceed this, their next connection is blocked until admin runs flush hosts; prevents attacks    </span></span>
<span class="line"><span>#open_files_limit = 10240   </span></span>
<span class="line"><span>connect-timeout = 10 #Max seconds before connection times out, also used for server&#39;s first response on Linux    </span></span>
<span class="line"><span>wait-timeout = 28800 #Time to wait before closing connection    </span></span>
<span class="line"><span>interactive-timeout = 28800 #Allowed inactivity before closing interactive connection. Client session&#39;s wait_timeout is set to interactive_timeout.    </span></span>
<span class="line"><span>slave-net-timeout = 600 #Slave notifies network interruption if no data from master for this many seconds    </span></span>
<span class="line"><span>net_read_timeout = 30 #Timeout for slave reading info    </span></span>
<span class="line"><span>net_write_timeout = 60 #Timeout for slave writing info    </span></span>
<span class="line"><span>net_retry_count = 10 #Retries before giving up on interrupted read    </span></span>
<span class="line"><span>net_buffer_length = 16384 #Packet buffer initialized to this size, can grow to max_allowed_packet    </span></span>
<span class="line"><span>max_allowed_packet = 64M #    </span></span>
<span class="line"><span>#table_cache = 512 #Number of open tables for all threads. Increasing this increases needed file descriptors    </span></span>
<span class="line"><span>thread_stack = 192K #Stack size per thread    </span></span>
<span class="line"><span>thread_cache_size = 20 #Thread cache    </span></span>
<span class="line"><span>thread_concurrency = 8 #Number of threads running simultaneously, best set to twice the number of CPUs    </span></span>
<span class="line"><span># qcache settings    </span></span>
<span class="line"><span>query_cache_size = 256M #Query cache size    </span></span>
<span class="line"><span>query_cache_limit = 2M #Do not cache results larger than this    </span></span>
<span class="line"><span>query_cache_min_res_unit = 2K #Minimum block size for query cache allocation    </span></span>
<span class="line"><span># default settings    </span></span>
<span class="line"><span># time zone    </span></span>
<span class="line"><span>default-time-zone = system #Server time zone    </span></span>
<span class="line"><span>character-set-server = utf8 #Server-level charset    </span></span>
<span class="line"><span>default-storage-engine = InnoDB #Default storage engine    </span></span>
<span class="line"><span># tmp &amp; heap    </span></span>
<span class="line"><span>tmp_table_size = 512M #Temp table size, results go to disk if exceeded    </span></span>
<span class="line"><span>max_heap_table_size = 512M #Max MEMORY (HEAP) table size    </span></span>
<span class="line"><span>log-bin = mysql-bin #Paths relative to datadir    </span></span>
<span class="line"><span>log-bin-index = mysql-bin.index    </span></span>
<span class="line"><span>relayrelay-log = relay-log    </span></span>
<span class="line"><span>relayrelay_log_index = relay-log.index    </span></span>
<span class="line"><span># warning &amp; error log    </span></span>
<span class="line"><span>log-warnings = 1   </span></span>
<span class="line"><span>log-error = /home/mysql/mysql/log/mysql.err    </span></span>
<span class="line"><span>log_output = FILE #Format for slow query output, default is FILE, can set to TABLE to query slow_log table    </span></span>
<span class="line"><span># slow query log    </span></span>
<span class="line"><span>slow_query_log = 1   </span></span>
<span class="line"><span>long-query-time = 1 #Slow query threshold in seconds    </span></span>
<span class="line"><span>slow_query_log_file = /home/mysql/mysql/log/slow.log    </span></span>
<span class="line"><span>#log-queries-not-using-indexes    </span></span>
<span class="line"><span>#log-slow-slave-statements    </span></span>
<span class="line"><span>general_log = 1   </span></span>
<span class="line"><span>general_log_file = /home/mysql/mysql/log/mysql.log    </span></span>
<span class="line"><span>max_binlog_size = 1G   </span></span>
<span class="line"><span>max_relay_log_size = 1G   </span></span>
<span class="line"><span># if use auto-ex, set to 0    </span></span>
<span class="line"><span>relay-log-purge = 1 #Delete relay logs when not used, done by SQL thread    </span></span>
<span class="line"><span># max binlog keeps days    </span></span>
<span class="line"><span>expire_logs_days = 30 #Delete binlogs older than 30 days    </span></span>
<span class="line"><span>binlog_cache_size = 1M #Session level    </span></span>
<span class="line"><span># replication    </span></span>
<span class="line"><span>replicate-wild-ignore-table = mysql.% #Ignore these dbs/tables during replication    </span></span>
<span class="line"><span>replicate-wild-ignore-table = test.% #Ignore these dbs/tables during replication    </span></span>
<span class="line"><span># slave_skip_errors=all   </span></span>
<span class="line"><span>key_buffer_size = 256M #MyISAM index buffer, only key not data    </span></span>
<span class="line"><span>sort_buffer_size = 2M #Sort buffer size, per thread    </span></span>
<span class="line"><span>read_buffer_size = 2M #Buffer for full table scan, per thread    </span></span>
<span class="line"><span>join_buffer_size = 8M #Join buffer size, per thread    </span></span>
<span class="line"><span>read_rnd_buffer_size = 8M #MyISAM random scan buffer, per thread    </span></span>
<span class="line"><span>bulk_insert_buffer_size = 64M #MyISAM bulk insert buffer, per thread    </span></span>
<span class="line"><span>myisam_sort_buffer_size = 64M #MyISAM buffer for index creation or repair    </span></span>
<span class="line"><span>myisam_max_sort_file_size = 10G #Max temp file size for MyISAM index creation    </span></span>
<span class="line"><span>myisam_repair_threads = 1 #Parallel threads for MyISAM repair    </span></span>
<span class="line"><span>myisam_recover = 64K#Max length for GROUP_CONCAT() result    </span></span>
<span class="line"><span>transaction_isolation = REPEATABLE-READ    </span></span>
<span class="line"><span>innodb_file_per_table    </span></span>
<span class="line"><span>#innodb_status_file = 1   </span></span>
<span class="line"><span>#innodb_open_files = 2048   </span></span>
<span class="line"><span>innodb_additional_mem_pool_size = 100M #Memory pool for InnoDB control objects    </span></span>
<span class="line"><span>innodb_buffer_pool_size = 2G #Includes data pages, index pages, insert buffer, lock info, adaptive hash, data dictionary    </span></span>
<span class="line"><span>innodb_data_home_dir = /longxibendi/mysql/mysql/var/    </span></span>
<span class="line"><span>#innodb_data_file_path = ibdata1:1G:autoextend    </span></span>
<span class="line"><span>innodb_data_file_path = ibdata1:500M;ibdata2:2210M:autoextend #Tablespace    </span></span>
<span class="line"><span>innodb_file_io_threads = 4 #IO threads    </span></span>
<span class="line"><span>innodb_thread_concurrency = 16 #Try to keep OS threads in InnoDB below this limit    </span></span>
<span class="line"><span>innodb_flush_log_at_trx_commit = 1 #Flush log buffer to disk at every commit    </span></span>
<span class="line"><span>innodb_log_buffer_size = 8M #Transaction log buffer    </span></span>
<span class="line"><span>innodb_log_file_size = 500M #Transaction log size    </span></span>
<span class="line"><span>#innodb_log_file_size =100M   </span></span>
<span class="line"><span>innodb_log_files_in_group = 2 #Two log files in group    </span></span>
<span class="line"><span>innodb_log_group_home_dir = /longxibendi/mysql/mysql/var/#Log group    </span></span>
<span class="line"><span>innodb_max_dirty_pages_pct = 90 #Main thread flushes buffer pool to keep dirty pages below 90%    </span></span>
<span class="line"><span>innodb_lock_wait_timeout = 50 #Timeout in seconds before rolling back InnoDB transaction    </span></span>
<span class="line"><span>#innodb_flush_method = O_DSYNC   </span></span>
<span class="line"><span>[mysqldump]    </span></span>
<span class="line"><span>quick    </span></span>
<span class="line"><span>max_allowed_packet = 64M   </span></span>
<span class="line"><span>[mysql]    </span></span>
<span class="line"><span>disable-auto-rehash #Enable TAB completion    </span></span>
<span class="line"><span>default-character-set = utf8   </span></span>
<span class="line"><span>connect-timeout = 3</span></span></code></pre></div><h3 id="high-availability-and-high-performance-tuning" tabindex="-1">High Availability and High Performance Tuning <a class="header-anchor" href="#high-availability-and-high-performance-tuning" aria-label="Permalink to &quot;High Availability and High Performance Tuning&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>[client]</span></span>
<span class="line"><span>default-character-set = utf8mb4</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[mysqld]</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### Basic Properties</span></span>
<span class="line"><span>port = 3306</span></span>
<span class="line"><span>datadir=/data/mysql</span></span>
<span class="line"><span># Disable hostname resolution</span></span>
<span class="line"><span>skip-name-resolve</span></span>
<span class="line"><span># Default storage engine</span></span>
<span class="line"><span>default-storage-engine = InnoDB</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### Charset Settings</span></span>
<span class="line"><span>character-set-client-handshake = FALSE</span></span>
<span class="line"><span>character-set-server = utf8mb4</span></span>
<span class="line"><span>collation-server = utf8mb4_unicode_ci</span></span>
<span class="line"><span>init_connect=&#39;SET NAMES utf8mb4&#39;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### GTID</span></span>
<span class="line"><span>server_id = 59</span></span>
<span class="line"><span># For stable GTID replication, use row-based logging</span></span>
<span class="line"><span>binlog_format = row</span></span>
<span class="line"><span># Enable GTID</span></span>
<span class="line"><span>gtid_mode = on</span></span>
<span class="line"><span># Ensure GTID transaction safety</span></span>
<span class="line"><span>enforce-gtid-consistency = true</span></span>
<span class="line"><span># The following two are required for master-slave switch and high availability</span></span>
<span class="line"><span>log_bin = on</span></span>
<span class="line"><span>log-slave-updates = on</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### Slow Query Log</span></span>
<span class="line"><span>slow_query_log = 1</span></span>
<span class="line"><span>long_query_time = 2</span></span>
<span class="line"><span>log_queries_not_using_indexes = 1</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### Auto Recovery</span></span>
<span class="line"><span>relay_log_info_repository = TABLE</span></span>
<span class="line"><span>master_info_repository = TABLE</span></span>
<span class="line"><span>relay_log_recovery = on</span></span>
<span class="line"><span>relay_log_purge = 1</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### Data Security</span></span>
<span class="line"><span>log_bin_trust_function_creators = off</span></span>
<span class="line"><span>sync_binlog = 1</span></span>
<span class="line"><span>explicit_defaults_for_timestamp=true</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### Optimization</span></span>
<span class="line"><span>ft_min_word_len = 1</span></span>
<span class="line"><span>lower_case_table_names = 1</span></span>
<span class="line"><span>max_allowed_packet = 256M</span></span>
<span class="line"><span>rpl_semi_sync_master_enabled = 1</span></span>
<span class="line"><span>rpl_semi_sync_slave_enabled = 1</span></span>
<span class="line"><span>rpl_semi_sync_master_timeout = 1000</span></span>
<span class="line"><span>rpl_semi_sync_master_wait_point = AFTER_SYNC</span></span>
<span class="line"><span>rpl_semi_sync_master_wait_slave_count = 1</span></span>
<span class="line"><span>slave_parallel_type = logical_clock</span></span>
<span class="line"><span>slave_parallel_workers = 4</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### Connection Limits</span></span>
<span class="line"><span>max_connections = 1500</span></span>
<span class="line"><span>max_connect_errors = 20</span></span>
<span class="line"><span>back_log = 500</span></span>
<span class="line"><span>open_files_limit = 65535</span></span>
<span class="line"><span>interactive_timeout = 3600</span></span>
<span class="line"><span>wait_timeout = 3600</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### Memory Allocation</span></span>
<span class="line"><span>table_open_cache = 1024</span></span>
<span class="line"><span>binlog_cache_size = 2M</span></span>
<span class="line"><span>tmp_table_size = 128M</span></span>
<span class="line"><span>max_heap_table_size = 16M</span></span>
<span class="line"><span>read_buffer_size = 1M</span></span>
<span class="line"><span>read_rnd_buffer_size = 8M</span></span>
<span class="line"><span>sort_buffer_size = 1M</span></span>
<span class="line"><span>query_cache_size = 64M</span></span>
<span class="line"><span>query_cache_limit = 1M</span></span>
<span class="line"><span>join_buffer_size = 16M</span></span>
<span class="line"><span>thread_cache_size = 64</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### InnoDB Optimization</span></span>
<span class="line"><span>innodb_buffer_pool_size=2G</span></span>
<span class="line"><span>innodb_log_file_size = 256M</span></span>
<span class="line"><span>innodb_log_buffer_size = 4M</span></span>
<span class="line"><span>innodb_log_buffer_size = 3M</span></span>
<span class="line"><span>innodb_flush_log_at_trx_commit = 1</span></span>
<span class="line"><span>innodb_data_file_path = ibdata1:100M:autoextend</span></span>
<span class="line"><span>innodb_log_files_in_group = 3</span></span>
<span class="line"><span>innodb_open_files = 800</span></span>
<span class="line"><span>innodb_file_per_table = 1</span></span>
<span class="line"><span>innodb_write_io_threads = 8</span></span>
<span class="line"><span>innodb_read_io_threads = 8</span></span>
<span class="line"><span>innodb_purge_threads = 1</span></span>
<span class="line"><span>innodb_lock_wait_timeout = 120</span></span>
<span class="line"><span>innodb_strict_mode=1</span></span>
<span class="line"><span> innodb_large_prefix = on</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[mysqldump]</span></span>
<span class="line"><span>quick</span></span>
<span class="line"><span>default-character-set = utf8mb4</span></span>
<span class="line"><span>max_allowed_packet = 256M</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[mysql]</span></span>
<span class="line"><span>auto-rehash</span></span>
<span class="line"><span>default-character-set = utf8mb4</span></span></code></pre></div>`,4)]))}const u=s(l,[["render",i]]);export{m as __pageData,u as default};
