import{_ as n,c as a,o as p,a6 as l}from"./chunks/framework.FE2Wsc0u.js";const d=JSON.parse('{"title":"MySQL配置文件解析","description":"详细介绍MySQL配置文件的解析，包括配置文件的位置、常用配置项、优化建议等，帮助开发者更好地管理和优化MySQL数据库。","frontmatter":{"title":"MySQL配置文件解析","date":"2022-04-09T11:31:32.000Z","tags":["MySQL"],"description":"详细介绍MySQL配置文件的解析，包括配置文件的位置、常用配置项、优化建议等，帮助开发者更好地管理和优化MySQL数据库。","author":"PFinal南丞","keywords":"MySQL, 配置文件, 解析, 优化, 数据库, 配置, 管理, 优化建议, 配置文件解析, MySQL配置文件, MySQL配置","head":[["meta",{"name":"keywords","content":"MySQL, 配置文件, 解析, 优化, 数据库, 配置, 管理, 优化建议, 配置文件解析, MySQL配置文件, MySQL配置"}]]},"headers":[],"relativePath":"zh/数据库/MySQL配置文件解析.md","filePath":"zh/数据库/MySQL配置文件解析.md","lastUpdated":1752052166000}'),e={name:"zh/数据库/MySQL配置文件解析.md"};function i(c,s,t,o,_,r){return p(),a("div",{"data-pagefind-body":!0},s[0]||(s[0]=[l(`<h1 id="mysql配置文件解析" tabindex="-1">Mysql配置文件解析 <a class="header-anchor" href="#mysql配置文件解析" aria-label="Permalink to &quot;Mysql配置文件解析&quot;">​</a></h1><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>[client]    </span></span>
<span class="line"><span>port = 3309   </span></span>
<span class="line"><span>socket = /home/mysql/mysql/tmp/mysql.sock    </span></span>
<span class="line"><span>[mysqld]    </span></span>
<span class="line"><span>!include /home/mysql/mysql/etc/mysqld.cnf #包含的配置文件 ，把用户名，密码文件单独存放    </span></span>
<span class="line"><span>port = 3309   </span></span>
<span class="line"><span>socket = /home/mysql/mysql/tmp/mysql.sock    </span></span>
<span class="line"><span>pid-file = /longxibendi/mysql/mysql/var/mysql.pid    </span></span>
<span class="line"><span>basedir = /home/mysql/mysql/    </span></span>
<span class="line"><span>datadir = /longxibendi/mysql/mysql/var/    </span></span>
<span class="line"><span># tmp dir settings    </span></span>
<span class="line"><span>tmpdir = /home/mysql/mysql/tmp/    </span></span>
<span class="line"><span>slave-load-tmpdir = /home/mysql/mysql/tmp/    </span></span>
<span class="line"><span>#当slave 执行 load data infile 时用    </span></span>
<span class="line"><span>#language = /home/mysql/mysql/share/mysql/english/    </span></span>
<span class="line"><span>character-sets-dir = /home/mysql/mysql/share/mysql/charsets/    </span></span>
<span class="line"><span># skip options    </span></span>
<span class="line"><span>skip-name-resolve #grant 时，必须使用ip不能使用主机名    </span></span>
<span class="line"><span>skip-symbolic-links #不能使用连接文件    </span></span>
<span class="line"><span>skip-external-locking #不使用系统锁定，要使用myisamchk,必须关闭服务器    </span></span>
<span class="line"><span>skip-slave-start #启动mysql,不启动复制    </span></span>
<span class="line"><span>#sysdate-is-now    </span></span>
<span class="line"><span># res settings    </span></span>
<span class="line"><span>back_log = 50 #接受队列，对于没建立tcp连接的请求队列放入缓存中，队列大小为back_log，受限制与OS参数    </span></span>
<span class="line"><span>max_connections = 1000 #最大并发连接数 ，增大该值需要相应增加允许打开的文件描述符数    </span></span>
<span class="line"><span>max_connect_errors = 10000 #如果某个用户发起的连接error超过该数值，则该用户的下次连接将被阻塞，直到管理员执行flush hosts ; 命令；防止黑客    </span></span>
<span class="line"><span>#open_files_limit = 10240   </span></span>
<span class="line"><span>connect-timeout = 10 #连接超时之前的最大秒数,在Linux平台上，该超时也用作等待服务器首次回应的时间    </span></span>
<span class="line"><span>wait-timeout = 28800 #等待关闭连接的时间    </span></span>
<span class="line"><span>interactive-timeout = 28800 #关闭连接之前，允许interactive_timeout（取代了wait_timeout）秒的不活动时间。客户端的会话wait_timeout变量被设为会话interactive_timeout变量的值。    </span></span>
<span class="line"><span>slave-net-timeout = 600 #从服务器也能够处理网络连接中断。但是，只有从服务器超过slave_net_timeout秒没有从主服务器收到数据才通知网络中断    </span></span>
<span class="line"><span>net_read_timeout = 30 #从服务器读取信息的超时    </span></span>
<span class="line"><span>net_write_timeout = 60 #从服务器写入信息的超时    </span></span>
<span class="line"><span>net_retry_count = 10 #如果某个通信端口的读操作中断了，在放弃前重试多次    </span></span>
<span class="line"><span>net_buffer_length = 16384 #包消息缓冲区初始化为net_buffer_length字节，但需要时可以增长到max_allowed_packet字节    </span></span>
<span class="line"><span>max_allowed_packet = 64M #    </span></span>
<span class="line"><span>#table_cache = 512 #所有线程打开的表的数目。增大该值可以增加mysqld需要的文件描述符的数量    </span></span>
<span class="line"><span>thread_stack = 192K #每个线程的堆栈大小    </span></span>
<span class="line"><span>thread_cache_size = 20 #线程缓存    </span></span>
<span class="line"><span>thread_concurrency = 8 #同时运行的线程的数据 此处最好为CPU个数两倍。本机配置为CPU的个数    </span></span>
<span class="line"><span># qcache settings    </span></span>
<span class="line"><span>query_cache_size = 256M #查询缓存大小    </span></span>
<span class="line"><span>query_cache_limit = 2M #不缓存查询大于该值的结果    </span></span>
<span class="line"><span>query_cache_min_res_unit = 2K #查询缓存分配的最小块大小    </span></span>
<span class="line"><span># default settings    </span></span>
<span class="line"><span># time zone    </span></span>
<span class="line"><span>default-time-zone = system #服务器时区    </span></span>
<span class="line"><span>character-set-server = utf8 #server级别字符集    </span></span>
<span class="line"><span>default-storage-engine = InnoDB #默认存储    </span></span>
<span class="line"><span># tmp &amp; heap    </span></span>
<span class="line"><span>tmp_table_size = 512M #临时表大小，如果超过该值，则结果放到磁盘中    </span></span>
<span class="line"><span>max_heap_table_size = 512M #该变量设置MEMORY (HEAP)表可以增长到的最大空间大小    </span></span>
<span class="line"><span>log-bin = mysql-bin #这些路径相对于datadir    </span></span>
<span class="line"><span>log-bin-index = mysql-bin.index    </span></span>
<span class="line"><span>relayrelay-log = relay-log    </span></span>
<span class="line"><span>relayrelay_log_index = relay-log.index    </span></span>
<span class="line"><span># warning &amp; error log    </span></span>
<span class="line"><span>log-warnings = 1   </span></span>
<span class="line"><span>log-error = /home/mysql/mysql/log/mysql.err    </span></span>
<span class="line"><span>log_output = FILE #参数log_output指定了慢查询输出的格式，默认为FILE，你可以将它设为TABLE，然后就可以查询mysql架构下的slow_log表了    </span></span>
<span class="line"><span># slow query log    </span></span>
<span class="line"><span>slow_query_log = 1   </span></span>
<span class="line"><span>long-query-time = 1 #慢查询时间 超过1秒则为慢查询    </span></span>
<span class="line"><span>slow_query_log_file = /home/mysql/mysql/log/slow.log    </span></span>
<span class="line"><span>#log-queries-not-using-indexes    </span></span>
<span class="line"><span>#log-slow-slave-statements    </span></span>
<span class="line"><span>general_log = 1   </span></span>
<span class="line"><span>general_log_file = /home/mysql/mysql/log/mysql.log    </span></span>
<span class="line"><span>max_binlog_size = 1G   </span></span>
<span class="line"><span>max_relay_log_size = 1G   </span></span>
<span class="line"><span># if use auto-ex, set to 0    </span></span>
<span class="line"><span>relay-log-purge = 1 #当不用中继日志时，删除他们。这个操作有SQL线程完成    </span></span>
<span class="line"><span># max binlog keeps days    </span></span>
<span class="line"><span>expire_logs_days = 30 #超过30天的binlog删除    </span></span>
<span class="line"><span>binlog_cache_size = 1M #session级别    </span></span>
<span class="line"><span># replication    </span></span>
<span class="line"><span>replicate-wild-ignore-table = mysql.% #复制时忽略数据库及表    </span></span>
<span class="line"><span>replicate-wild-ignore-table = test.% #复制时忽略数据库及表    </span></span>
<span class="line"><span># slave_skip_errors=all   </span></span>
<span class="line"><span>key_buffer_size = 256M #myisam索引buffer,只有key没有data    </span></span>
<span class="line"><span>sort_buffer_size = 2M #排序buffer大小；线程级别    </span></span>
<span class="line"><span>read_buffer_size = 2M #以全表扫描(Sequential Scan)方式扫描数据的buffer大小 ；线程级别    </span></span>
<span class="line"><span>join_buffer_size = 8M # join buffer 大小;线程级别    </span></span>
<span class="line"><span>read_rnd_buffer_size = 8M #MyISAM以索引扫描(Random Scan)方式扫描数据的buffer大小 ；线程级别    </span></span>
<span class="line"><span>bulk_insert_buffer_size = 64M #MyISAM 用在块插入优化中的树缓冲区的大小。注释：这是一个per thread的限制    </span></span>
<span class="line"><span>myisam_sort_buffer_size = 64M #MyISAM 设置恢复表之时使用的缓冲区的尺寸,当在REPAIR TABLE或用CREATE INDEX创建索引或ALTER TABLE过程中排序 MyISAM索引分配的缓冲区    </span></span>
<span class="line"><span>myisam_max_sort_file_size = 10G #MyISAM 如果临时文件会变得超过索引，不要使用快速排序索引方法来创建一个索引。注释：这个参数以字节的形式给出.重建MyISAM索引(在REPAIR TABLE、ALTER TABLE或LOAD DATA INFILE过程中)时，允许MySQL使用的临时文件的最大空间大小。如果文件的大小超过该值，则使用键值缓存创建索引，要慢得多。该值的单位为字节    </span></span>
<span class="line"><span>myisam_repair_threads = 1 #如果该值大于1，在Repair by sorting过程中并行创建MyISAM表索引(每个索引在自己的线程内)    </span></span>
<span class="line"><span>myisam_recover = 64K#允许的GROUP_CONCAT()函数结果的最大长度    </span></span>
<span class="line"><span>transaction_isolation = REPEATABLE-READ    </span></span>
<span class="line"><span>innodb_file_per_table    </span></span>
<span class="line"><span>#innodb_status_file = 1   </span></span>
<span class="line"><span>#innodb_open_files = 2048   </span></span>
<span class="line"><span>innodb_additional_mem_pool_size = 100M #帧缓存的控制对象需要从此处申请缓存，所以该值与innodb_buffer_pool对应    </span></span>
<span class="line"><span>innodb_buffer_pool_size = 2G #包括数据页、索引页、插入缓存、锁信息、自适应哈希所以、数据字典信息    </span></span>
<span class="line"><span>innodb_data_home_dir = /longxibendi/mysql/mysql/var/    </span></span>
<span class="line"><span>#innodb_data_file_path = ibdata1:1G:autoextend    </span></span>
<span class="line"><span>innodb_data_file_path = ibdata1:500M;ibdata2:2210M:autoextend #表空间    </span></span>
<span class="line"><span>innodb_file_io_threads = 4 #io线程数    </span></span>
<span class="line"><span>innodb_thread_concurrency = 16 #InnoDB试着在InnoDB内保持操作系统线程的数量少于或等于这个参数给出的限制    </span></span>
<span class="line"><span>innodb_flush_log_at_trx_commit = 1 #每次commit 日志缓存中的数据刷到磁盘中    </span></span>
<span class="line"><span>innodb_log_buffer_size = 8M #事物日志缓存    </span></span>
<span class="line"><span>innodb_log_file_size = 500M #事物日志大小    </span></span>
<span class="line"><span>#innodb_log_file_size =100M   </span></span>
<span class="line"><span>innodb_log_files_in_group = 2 #两组事物日志    </span></span>
<span class="line"><span>innodb_log_group_home_dir = /longxibendi/mysql/mysql/var/#日志组    </span></span>
<span class="line"><span>innodb_max_dirty_pages_pct = 90 #innodb主线程刷新缓存池中的数据，使脏数据比例小于90%    </span></span>
<span class="line"><span>innodb_lock_wait_timeout = 50 #InnoDB事务在被回滚之前可以等待一个锁定的超时秒数。InnoDB在它自己的 锁定表中自动检测事务死锁并且回滚事务。InnoDB用LOCK TABLES语句注意到锁定设置。默认值是50秒    </span></span>
<span class="line"><span>#innodb_flush_method = O_DSYNC   </span></span>
<span class="line"><span>[mysqldump]    </span></span>
<span class="line"><span>quick    </span></span>
<span class="line"><span>max_allowed_packet = 64M   </span></span>
<span class="line"><span>[mysql]    </span></span>
<span class="line"><span>disable-auto-rehash #允许通过TAB键提示    </span></span>
<span class="line"><span>default-character-set = utf8   </span></span>
<span class="line"><span>connect-timeout = 3</span></span></code></pre></div><h3 id="高可用高性能配置调优" tabindex="-1">高可用高性能配置调优 <a class="header-anchor" href="#高可用高性能配置调优" aria-label="Permalink to &quot;高可用高性能配置调优&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>[client]</span></span>
<span class="line"><span>default-character-set = utf8mb4</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[mysqld]</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### 基本属性配置</span></span>
<span class="line"><span>port = 3306</span></span>
<span class="line"><span>datadir=/data/mysql</span></span>
<span class="line"><span># 禁用主机名解析</span></span>
<span class="line"><span>skip-name-resolve</span></span>
<span class="line"><span># 默认的数据库引擎</span></span>
<span class="line"><span>default-storage-engine = InnoDB</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### 字符集配置</span></span>
<span class="line"><span>character-set-client-handshake = FALSE</span></span>
<span class="line"><span>character-set-server = utf8mb4</span></span>
<span class="line"><span>collation-server = utf8mb4_unicode_ci</span></span>
<span class="line"><span>init_connect=&#39;SET NAMES utf8mb4&#39;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### GTID</span></span>
<span class="line"><span>server_id = 59</span></span>
<span class="line"><span># 为保证 GTID 复制的稳定, 行级日志</span></span>
<span class="line"><span>binlog_format = row</span></span>
<span class="line"><span># 开启 gtid 功能</span></span>
<span class="line"><span>gtid_mode = on</span></span>
<span class="line"><span># 保障 GTID 事务安全</span></span>
<span class="line"><span># 当启用enforce_gtid_consistency功能的时候,</span></span>
<span class="line"><span># MySQL只允许能够保障事务安全, 并且能够被日志记录的SQL语句被执行,</span></span>
<span class="line"><span># 像create table ... select 和 create temporarytable语句, </span></span>
<span class="line"><span># 以及同时更新事务表和非事务表的SQL语句或事务都不允许执行</span></span>
<span class="line"><span>enforce-gtid-consistency = true</span></span>
<span class="line"><span># 以下两条配置为主从切换, 数据库高可用的必须配置</span></span>
<span class="line"><span># 开启 binlog 日志功能</span></span>
<span class="line"><span>log_bin = on</span></span>
<span class="line"><span># 开启从库更新 binlog 日志</span></span>
<span class="line"><span>log-slave-updates = on</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### 慢查询日志</span></span>
<span class="line"><span># 打开慢查询日志功能</span></span>
<span class="line"><span>slow_query_log = 1</span></span>
<span class="line"><span># 超过2秒的查询记录下来</span></span>
<span class="line"><span>long_query_time = 2</span></span>
<span class="line"><span># 记录下没有使用索引的查询</span></span>
<span class="line"><span>log_queries_not_using_indexes = 1</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### 自动修复</span></span>
<span class="line"><span># 记录 relay.info 到数据表中</span></span>
<span class="line"><span>relay_log_info_repository = TABLE</span></span>
<span class="line"><span># 记录 master.info 到数据表中 </span></span>
<span class="line"><span>master_info_repository = TABLE</span></span>
<span class="line"><span># 启用 relaylog 的自动修复功能</span></span>
<span class="line"><span>relay_log_recovery = on</span></span>
<span class="line"><span># 在 SQL 线程执行完一个 relaylog 后自动删除</span></span>
<span class="line"><span>relay_log_purge = 1</span></span>
<span class="line"><span></span></span>
<span class="line"><span></span></span>
<span class="line"><span>### 数据安全性配置</span></span>
<span class="line"><span># 关闭 master 创建 function 的功能</span></span>
<span class="line"><span>log_bin_trust_function_creators = off</span></span>
<span class="line"><span># 每执行一个事务都强制写入磁盘</span></span>
<span class="line"><span>sync_binlog = 1</span></span>
<span class="line"><span># timestamp 列如果没有显式定义为 not null, 则支持null属性</span></span>
<span class="line"><span># 设置 timestamp 的列值为 null, 不会被设置为 current timestamp</span></span>
<span class="line"><span>explicit_defaults_for_timestamp=true</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### 优化配置</span></span>
<span class="line"><span># 优化中文全文模糊索引</span></span>
<span class="line"><span>ft_min_word_len = 1</span></span>
<span class="line"><span># 默认库名表名保存为小写, 不区分大小写</span></span>
<span class="line"><span>lower_case_table_names = 1</span></span>
<span class="line"><span># 单条记录写入最大的大小限制</span></span>
<span class="line"><span># 过小可能会导致写入(导入)数据失败</span></span>
<span class="line"><span>max_allowed_packet = 256M</span></span>
<span class="line"><span># 半同步复制开启</span></span>
<span class="line"><span>rpl_semi_sync_master_enabled = 1</span></span>
<span class="line"><span>rpl_semi_sync_slave_enabled = 1</span></span>
<span class="line"><span># 半同步复制超时时间设置</span></span>
<span class="line"><span>rpl_semi_sync_master_timeout = 1000</span></span>
<span class="line"><span># 复制模式(保持系统默认)</span></span>
<span class="line"><span>rpl_semi_sync_master_wait_point = AFTER_SYNC</span></span>
<span class="line"><span># 后端只要有一台收到日志并写入 relaylog 就算成功</span></span>
<span class="line"><span>rpl_semi_sync_master_wait_slave_count = 1</span></span>
<span class="line"><span># 多线程复制</span></span>
<span class="line"><span>slave_parallel_type = logical_clock</span></span>
<span class="line"><span>slave_parallel_workers = 4</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### 连接数限制</span></span>
<span class="line"><span>max_connections = 1500</span></span>
<span class="line"><span># 验证密码超过20次拒绝连接</span></span>
<span class="line"><span>max_connect_errors = 20</span></span>
<span class="line"><span># back_log值指出在mysql暂时停止回答新请求之前的短时间内多少个请求可以被存在堆栈中</span></span>
<span class="line"><span># 也就是说，如果MySql的连接数达到max_connections时，新来的请求将会被存在堆栈中</span></span>
<span class="line"><span># 以等待某一连接释放资源，该堆栈的数量即back_log，如果等待连接的数量超过back_log</span></span>
<span class="line"><span># 将不被授予连接资源</span></span>
<span class="line"><span>back_log = 500</span></span>
<span class="line"><span>open_files_limit = 65535</span></span>
<span class="line"><span># 服务器关闭交互式连接前等待活动的秒数</span></span>
<span class="line"><span>interactive_timeout = 3600</span></span>
<span class="line"><span># 服务器关闭非交互连接之前等待活动的秒数</span></span>
<span class="line"><span>wait_timeout = 3600</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### 内存分配</span></span>
<span class="line"><span># 指定表高速缓存的大小。每当MySQL访问一个表时，如果在表缓冲区中还有空间</span></span>
<span class="line"><span># 该表就被打开并放入其中，这样可以更快地访问表内容</span></span>
<span class="line"><span>table_open_cache = 1024</span></span>
<span class="line"><span># 为每个session 分配的内存, 在事务过程中用来存储二进制日志的缓存</span></span>
<span class="line"><span>binlog_cache_size = 2M</span></span>
<span class="line"><span># 在内存的临时表最大大小</span></span>
<span class="line"><span>tmp_table_size = 128M</span></span>
<span class="line"><span># 创建内存表的最大大小(保持系统默认, 不允许创建过大的内存表)</span></span>
<span class="line"><span># 如果有需求当做缓存来用, 可以适当调大此值</span></span>
<span class="line"><span>max_heap_table_size = 16M</span></span>
<span class="line"><span># 顺序读, 读入缓冲区大小设置</span></span>
<span class="line"><span># 全表扫描次数多的话, 可以调大此值</span></span>
<span class="line"><span>read_buffer_size = 1M</span></span>
<span class="line"><span># 随机读, 读入缓冲区大小设置</span></span>
<span class="line"><span>read_rnd_buffer_size = 8M</span></span>
<span class="line"><span># 高并发的情况下, 需要减小此值到64K-128K</span></span>
<span class="line"><span>sort_buffer_size = 1M</span></span>
<span class="line"><span># 每个查询最大的缓存大小是1M, 最大缓存64M 数据</span></span>
<span class="line"><span>query_cache_size = 64M</span></span>
<span class="line"><span>query_cache_limit = 1M</span></span>
<span class="line"><span># 提到 join 的效率</span></span>
<span class="line"><span>join_buffer_size = 16M</span></span>
<span class="line"><span># 线程连接重复利用</span></span>
<span class="line"><span>thread_cache_size = 64</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### InnoDB 优化</span></span>
<span class="line"><span>## 内存利用方面的设置</span></span>
<span class="line"><span># 数据缓冲区</span></span>
<span class="line"><span>innodb_buffer_pool_size=2G</span></span>
<span class="line"><span>## 日志方面设置</span></span>
<span class="line"><span># 事务日志大小</span></span>
<span class="line"><span>innodb_log_file_size = 256M</span></span>
<span class="line"><span># 日志缓冲区大小</span></span>
<span class="line"><span>innodb_log_buffer_size = 4M</span></span>
<span class="line"><span># 事务在内存中的缓冲</span></span>
<span class="line"><span>innodb_log_buffer_size = 3M</span></span>
<span class="line"><span># 主库保持系统默认, 事务立即写入磁盘, 不会丢失任何一个事务</span></span>
<span class="line"><span>innodb_flush_log_at_trx_commit = 1</span></span>
<span class="line"><span># mysql 的数据文件设置, 初始100, 以10M 自动扩展</span></span>
<span class="line"><span>innodb_data_file_path = ibdata1:100M:autoextend</span></span>
<span class="line"><span># 为提高性能, MySQL可以以循环方式将日志文件写到多个文件</span></span>
<span class="line"><span>innodb_log_files_in_group = 3</span></span>
<span class="line"><span>##其他设置</span></span>
<span class="line"><span># 如果库里的表特别多的情况，请增加此值</span></span>
<span class="line"><span>innodb_open_files = 800</span></span>
<span class="line"><span># 为每个 InnoDB 表分配单独的表空间</span></span>
<span class="line"><span>innodb_file_per_table = 1</span></span>
<span class="line"><span># InnoDB 使用后台线程处理数据页上写 I/O（输入）请求的数量</span></span>
<span class="line"><span>innodb_write_io_threads = 8</span></span>
<span class="line"><span># InnoDB 使用后台线程处理数据页上读 I/O（输出）请求的数量</span></span>
<span class="line"><span>innodb_read_io_threads = 8</span></span>
<span class="line"><span># 启用单独的线程来回收无用的数据</span></span>
<span class="line"><span>innodb_purge_threads = 1</span></span>
<span class="line"><span># 脏数据刷入磁盘(先保持系统默认, swap 过多使用时, 调小此值, 调小后, 与磁盘交互增多, 性能降低)</span></span>
<span class="line"><span># innodb_max_dirty_pages_pct = 90</span></span>
<span class="line"><span># 事务等待获取资源等待的最长时间</span></span>
<span class="line"><span>innodb_lock_wait_timeout = 120</span></span>
<span class="line"><span># 开启 InnoDB 严格检查模式, 不警告, 直接报错</span></span>
<span class="line"><span>innodb_strict_mode=1</span></span>
<span class="line"><span># 允许列索引最大达到3072</span></span>
<span class="line"><span> innodb_large_prefix = on</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[mysqldump]</span></span>
<span class="line"><span># 开启快速导出</span></span>
<span class="line"><span>quick</span></span>
<span class="line"><span>default-character-set = utf8mb4</span></span>
<span class="line"><span>max_allowed_packet = 256M</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[mysql]</span></span>
<span class="line"><span># 开启 tab 补全</span></span>
<span class="line"><span>auto-rehash</span></span>
<span class="line"><span>default-character-set = utf8mb4</span></span></code></pre></div>`,4)]))}const y=n(e,[["render",i]]);export{d as __pageData,y as default};
