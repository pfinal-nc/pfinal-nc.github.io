import{_ as n,c as a,o as p,a6 as e}from"./chunks/framework.BNF8H_Cn.js";const h=JSON.parse('{"title":"如何掌握PHP-FPM配置文件解析 - PHP 开发完整指南","description":"详细介绍PHP-FPM配置文件解析，包括配置文件的基本结构、常用配置项、进程管理、日志记录等内容，帮助开发者更好地配置和管理PHP-FPM服务。","frontmatter":{"title":"如何掌握PHP-FPM配置文件解析 - PHP 开发完整指南","date":"2023-04-27T22:10:20.000Z","author":"PFinal南丞","tags":["php"],"keywords":"PHP-FPM配置文件解析, php, 工具, php-fpm配置文件, php-fpm配置文件解析, php-fpm配置文件详解, PHP-FPM配置文件详解, PHP-FPM配置优化, PHP-FPM进程管理, PHP-FPM性能调优, PHP-FPM日志配置, PHP-FPM安全配置, PHP-FPM服务器配置, PHP-FPM最佳实践, PHP-FPM配置教程, PHP-FPM高并发配置, PHP-FPM监控配置","description":"详细介绍PHP-FPM配置文件解析，包括配置文件的基本结构、常用配置项、进程管理、日志记录等内容，帮助开发者更好地配置和管理PHP-FPM服务。","recommend":"后端工程","head":[["link",{"rel":"canonical","href":"https://friday-go.icu/dev/backend/php/PHP-FPM配置文件详解"}],["meta",{"name":"keywords","content":"PHP-FPM配置文件解析, php, 工具, php-fpm配置文件, php-fpm配置文件解析, php-fpm配置文件详解, PHP-FPM配置文件详解, PHP-FPM配置优化, PHP-FPM进程管理, PHP-FPM性能调优, PHP-FPM日志配置, PHP-FPM安全配置, PHP-FPM服务器配置, PHP-FPM最佳实践, PHP-FPM配置教程, PHP-FPM高并发配置, PHP-FPM监控配置, PFinalClub, Golang教程, Go后端开发, Go微服务, PHP, Python, 技术博客"}],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"TechArticle\\",\\"headline\\":\\"如何掌握PHP-FPM配置文件解析 - PHP 开发完整指南\\",\\"url\\":\\"https://friday-go.icu/dev/backend/php/PHP-FPM配置文件详解\\",\\"datePublished\\":\\"2023-04-27T22:10:20.000Z\\",\\"dateModified\\":1766143110000,\\"author\\":{\\"@type\\":\\"Person\\",\\"name\\":\\"PFinal南丞\\",\\"url\\":\\"https://friday-go.icu/about\\"},\\"publisher\\":{\\"@type\\":\\"Organization\\",\\"name\\":\\"PFinalClub\\",\\"logo\\":{\\"@type\\":\\"ImageObject\\",\\"url\\":\\"https://friday-go.icu/logo.png\\"}},\\"description\\":\\"详细介绍PHP-FPM配置文件解析，包括配置文件的基本结构、常用配置项、进程管理、日志记录等内容，帮助开发者更好地配置和管理PHP-FPM服务。\\",\\"inLanguage\\":\\"zh-CN\\",\\"mainEntityOfPage\\":{\\"@type\\":\\"WebPage\\",\\"@id\\":\\"https://friday-go.icu/dev/backend/php/PHP-FPM配置文件详解\\"},\\"keywords\\":\\"PHP-FPM配置文件解析, php, 工具, php-fpm配置文件, php-fpm配置文件解析, php-fpm配置文件详解, PHP-FPM配置文件详解, PHP-FPM配置优化, PHP-FPM进程管理, PHP-FPM性能调优, PHP-FPM日志配置, PHP-FPM安全配置, PHP-FPM服务器配置, PHP-FPM最佳实践, PHP-FPM配置教程, PHP-FPM高并发配置, PHP-FPM监控配置\\"}"]]},"headers":[],"relativePath":"dev/backend/php/PHP-FPM配置文件详解.md","filePath":"dev/backend/php/PHP-FPM配置文件详解.md","lastUpdated":1766143110000}'),l={name:"dev/backend/php/PHP-FPM配置文件详解.md"};function i(t,s,c,o,r,P){return p(),a("div",{"data-pagefind-body":!0,"data-pagefind-meta":"date:1682633420000"},s[0]||(s[0]=[e(`<h1 id="php-fpm配置文件详解" tabindex="-1">PHP-FPM配置文件详解 <a class="header-anchor" href="#php-fpm配置文件详解" aria-label="Permalink to &quot;PHP-FPM配置文件详解&quot;">​</a></h1><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>[www]</span></span>
<span class="line"><span>; It only applies on the following directives:</span></span>
<span class="line"><span>; - &#39;access.log&#39;</span></span>
<span class="line"><span>; - &#39;slowlog&#39;</span></span>
<span class="line"><span>; - &#39;listen&#39; (unixsocket)</span></span>
<span class="line"><span>; - &#39;chroot&#39;</span></span>
<span class="line"><span>; - &#39;chdir&#39;</span></span>
<span class="line"><span>; - &#39;php_values&#39;</span></span>
<span class="line"><span>; - &#39;php_admin_values&#39;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>;prefix = /path/to/pools/$pool   如果没有制定，将使用全局prefix替代</span></span>
<span class="line"><span>user = nobody　　　　　　　　　　　　 进程的发起用户和用户组，用户user是必须设置，group不是</span></span>
<span class="line"><span>group = nobody</span></span>
<span class="line"><span>listen = 127.0.0.1:9000　　　　　　 监听ip和端口</span></span>
<span class="line"><span>;listen.backlog = 65535　　　　　　 设置listen(2)函数backlog</span></span>
<span class="line"><span>;listen.owner = nobody</span></span>
<span class="line"><span>;listen.group = nobody</span></span>
<span class="line"><span>;listen.mode = 0660</span></span>
<span class="line"><span>;listen.acl_users =</span></span>
<span class="line"><span>;listen.acl_groups =</span></span>
<span class="line"><span>;listen.allowed_clients = 127.0.0.1 允许FastCGI客户端连接的IPv4地址，多个地址用&#39;,&#39;分隔，为空则允许任何地址发来链接请求</span></span>
<span class="line"><span>; process.priority = -19</span></span>
<span class="line"><span>pm = dynamic　　　　　　　　　　　　　 选择进程池管理器如何控制子进程的数量</span></span>
<span class="line"><span>　　static：　　对于子进程的开启数路给定一个锁定的值(pm.max_children)</span></span>
<span class="line"><span>　　dynamic:　 子进程的数目为动态的，它的数目基于下面的指令的值(以下为dynamic适用参数)</span></span>
<span class="line"><span>　　　　pm.max_children：  同一时刻能够存货的最大子进程的数量</span></span>
<span class="line"><span>　　　　pm.start_servers： 在启动时启动的子进程数量</span></span>
<span class="line"><span>　　　　pm.min_spare_servers： 处于空闲&quot;idle&quot;状态的最小子进程，如果空闲进程数量小于这个值，那么相应的子进程会被创建</span></span>
<span class="line"><span>　　　　pm.max_spare_servers： 最大空闲子进程数量，空闲子进程数量超过这个值，那么相应的子进程会被杀掉。</span></span>
<span class="line"><span>　　ondemand： 在启动时不会创建，只有当发起请求链接时才会创建(pm.max_children, pm.process_idle_timeout)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>pm.max_children = 5</span></span>
<span class="line"><span>pm.start_servers = 2</span></span>
<span class="line"><span>pm.min_spare_servers = 1</span></span>
<span class="line"><span>pm.max_spare_servers = 3</span></span>
<span class="line"><span>;pm.process_idle_timeout = 10s;　　空闲进程超时时间</span></span>
<span class="line"><span>;pm.max_requests = 500　　　　　　　 在派生新的子进程前，每一个子进程应该处理的请求数目，在第三方库中解决内存溢出很有用，设置为0则不会限制</span></span>
<span class="line"><span>;pm.status_path = /status　　　     配置一个URI，以便查看fpm状态页</span></span>
<span class="line"><span>状态页描述：</span></span>
<span class="line"><span>　　accepted conn: 该进程池接受的请求数量</span></span>
<span class="line"><span>　　pool: 进程池的名字</span></span>
<span class="line"><span>　　process manager: 进程管理，就是配置中pm指令，可以选择值static，dynamic，ondemand</span></span>
<span class="line"><span>　　idle processes: 空闲进程数量</span></span>
<span class="line"><span>　　active processes: 当前活跃的进程数量</span></span>
<span class="line"><span>　　total processes: 总的进程数量=idle+active</span></span>
<span class="line"><span>　　max children reached: 达到最大子进程的次数，达到进程的限制，当pm试图开启更多的子进程的时候(仅当pm工作在dynamic时)</span></span>
<span class="line"><span>;ping.path = /ping　　　　该ping URI将会去调用fpm监控页面，如果这个没有设置，那么不会有URI被做为ping页</span></span>
<span class="line"><span>;ping.response = pong　　用于定制平请求的响应，响应的格式text/plain(对200响应代码)</span></span>
<span class="line"><span>;access.log = log/$pool.access.log</span></span>
<span class="line"><span>;access.format = &quot;%R - %u %t \\&quot;%m %r%Q%q\\&quot; %s %f %{mili}d %{kilo}M %C%%&quot;</span></span>
<span class="line"><span>　　; The following syntax is allowed</span></span>
<span class="line"><span>　　;  %%: the &#39;%&#39; character</span></span>
<span class="line"><span>　　;  %C: %CPU used by the request</span></span>
<span class="line"><span>　　;      it can accept the following format:</span></span>
<span class="line"><span>　　;      - %{user}C for user CPU only</span></span>
<span class="line"><span>　　;      - %{system}C for system CPU only</span></span>
<span class="line"><span>　　;      - %{total}C  for user + system CPU (default)</span></span>
<span class="line"><span>　　;  %d: time taken to serve the request</span></span>
<span class="line"><span>　　;      it can accept the following format:</span></span>
<span class="line"><span>　　;      - %{seconds}d (default)</span></span>
<span class="line"><span>　　;      - %{miliseconds}d</span></span>
<span class="line"><span>　　;      - %{mili}d</span></span>
<span class="line"><span>　　;      - %{microseconds}d</span></span>
<span class="line"><span>　　;      - %{micro}d</span></span>
<span class="line"><span>　　;  %e: an environment variable (same as $_ENV or $_SERVER)</span></span>
<span class="line"><span>　　;      it must be associated with embraces to specify the name of the env</span></span>
<span class="line"><span>　　;      variable. Some exemples:</span></span>
<span class="line"><span>　　;      - server specifics like: %{REQUEST_METHOD}e or %{SERVER_PROTOCOL}e</span></span>
<span class="line"><span>　　;      - HTTP headers like: %{HTTP_HOST}e or %{HTTP_USER_AGENT}e</span></span>
<span class="line"><span>　　;  %f: script filename</span></span>
<span class="line"><span>　　;  %l: content-length of the request (for POST request only)</span></span>
<span class="line"><span>　　;  %m: request method</span></span>
<span class="line"><span>　　;  %M: peak of memory allocated by PHP</span></span>
<span class="line"><span>　　;      it can accept the following format:</span></span>
<span class="line"><span>　　;      - %{bytes}M (default)</span></span>
<span class="line"><span>　　;      - %{kilobytes}M</span></span>
<span class="line"><span>　　;      - %{kilo}M</span></span>
<span class="line"><span>　　;      - %{megabytes}M</span></span>
<span class="line"><span>　　;      - %{mega}M</span></span>
<span class="line"><span>　　;  %n: pool name</span></span>
<span class="line"><span>　　;  %o: output header</span></span>
<span class="line"><span>　　;      it must be associated with embraces to specify the name of the header:</span></span>
<span class="line"><span>　　;      - %{Content-Type}o</span></span>
<span class="line"><span>　　;      - %{X-Powered-By}o</span></span>
<span class="line"><span>　　;      - %{Transfert-Encoding}o</span></span>
<span class="line"><span>　　;      - ....</span></span>
<span class="line"><span>　　;  %p: PID of the child that serviced the request</span></span>
<span class="line"><span>　　;  %P: PID of the parent of the child that serviced the request</span></span>
<span class="line"><span>　　;  %q: the query string</span></span>
<span class="line"><span>　　;  %Q: the &#39;?&#39; character if query string exists</span></span>
<span class="line"><span>　　;  %r: the request URI (without the query string, see %q and %Q)</span></span>
<span class="line"><span>　　;  %R: remote IP address</span></span>
<span class="line"><span>　　;  %s: status (response code)</span></span>
<span class="line"><span>　　;  %t: server time the request was received</span></span>
<span class="line"><span>　　;      it can accept a strftime(3) format:</span></span>
<span class="line"><span>　　;      %d/%b/%Y:%H:%M:%S %z (default)</span></span>
<span class="line"><span>　　;  %T: time the log has been written (the request has finished)</span></span>
<span class="line"><span>　　;      it can accept a strftime(3) format:</span></span>
<span class="line"><span>　　;      %d/%b/%Y:%H:%M:%S %z (default)</span></span>
<span class="line"><span>　　;  %u: remote user</span></span>
<span class="line"><span>;slowlog = log/$pool.log.slow　　 用于记录慢请求</span></span>
<span class="line"><span>;request_slowlog_timeout = 0　　  慢日志请求超时时间，对一个php程序进行跟踪。</span></span>
<span class="line"><span>;request_terminate_timeout = 0　　终止请求超时时间，在worker进程被杀掉之后，提供单个请求的超时间隔。由于某种原因不停止脚本执行时，应该使用该选项，0表示关闭不启用</span></span>
<span class="line"><span>　　(在php.ini中，max_execution_time 一般设置为30，表示每一个脚本的最大执行时间)</span></span>
<span class="line"><span>;rlimit_files = 1024　　　　　　　　设置打开文件描述符的限制</span></span>
<span class="line"><span>;rlimit_core = 0　　　　　　　　　　 设置内核对资源的使用限制，用于内核转储</span></span>
<span class="line"><span>;chroot =　　　　　　　　　　　　　　　设置chroot路径，程序一启动就将其chroot放置到指定的目录下，该指令值必须是一个绝对路径</span></span>
<span class="line"><span>;chdir = /var/www　　　　　　　　　　在程序启动时将会改变到指定的位置(这个是相对路径，相对当前路径或chroot后的“/”目录)　　　　</span></span>
<span class="line"><span>;catch_workers_output = yes　　　　将worker的标准输出和错误输出重定向到主要的错误日志记录中，如果没有设置，根据FastCGI的指定，将会被重定向到/dev/null上</span></span>
<span class="line"><span>;clear_env = no　　　　　　　　　　  清理环境</span></span>
<span class="line"><span>;security.limit_extensions = .php .php3 .php4 .php5　　限制FPM执行解析的扩展名</span></span>
<span class="line"><span>;env[HOSTNAME] = $HOSTNAME</span></span>
<span class="line"><span>;env[PATH] = /usr/local/bin:/usr/bin:/bin</span></span>
<span class="line"><span>;env[TMP] = /tmp</span></span>
<span class="line"><span>;env[TMPDIR] = /tmp</span></span>
<span class="line"><span>;env[TEMP] = /tmp</span></span>
<span class="line"><span></span></span>
<span class="line"><span>; Additional php.ini defines, specific to this pool of workers. These settings</span></span>
<span class="line"><span>; overwrite the values previously defined in the php.ini. The directives are the</span></span>
<span class="line"><span>; same as the PHP SAPI:</span></span>
<span class="line"><span>;   php_value/php_flag             - you can set classic ini defines which can</span></span>
<span class="line"><span>;                                    be overwritten from PHP call &#39;ini_set&#39;.</span></span>
<span class="line"><span>;   php_admin_value/php_admin_flag - these directives won&#39;t be overwritten by</span></span>
<span class="line"><span>;                                     PHP call &#39;ini_set&#39;</span></span>
<span class="line"><span>; For php_*flag, valid values are on, off, 1, 0, true, false, yes or no.</span></span>
<span class="line"><span></span></span>
<span class="line"><span>; Defining &#39;extension&#39; will load the corresponding shared extension from</span></span>
<span class="line"><span>; extension_dir. Defining &#39;disable_functions&#39; or &#39;disable_classes&#39; will not</span></span>
<span class="line"><span>; overwrite previously defined php.ini values, but will append the new value</span></span>
<span class="line"><span>; instead.</span></span>
<span class="line"><span></span></span>
<span class="line"><span>;php_admin_value[sendmail_path] = /usr/sbin/sendmail -t -i -f www@my.domain.com</span></span>
<span class="line"><span>;php_flag[display_errors] = off</span></span>
<span class="line"><span>;php_admin_value[error_log] = /var/log/fpm-php.www.log</span></span>
<span class="line"><span>;php_admin_flag[log_errors] = on</span></span>
<span class="line"><span>;php_admin_value[memory_limit] = 32M</span></span></code></pre></div>`,2)]))}const m=n(l,[["render",i]]);export{h as __pageData,m as default};
