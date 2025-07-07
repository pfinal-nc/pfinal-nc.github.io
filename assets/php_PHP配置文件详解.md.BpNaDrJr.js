import{_ as n,c as a,o as p,a6 as e}from"./chunks/framework.CwlnujpX.js";const h=JSON.parse('{"title":"PHP配置文件详解","description":"PHP配置文件详解","frontmatter":{"title":"PHP配置文件详解","date":"2022-07-04T13:36:42.000Z","tags":["PHP"],"description":"PHP配置文件详解","author":"PFinal南丞","keywords":"PHP, 配置文件, 详解, 编程, web开发, 服务器配置","head":[["meta",{"name":"keywords","content":"PHP, 配置文件, 详解, 编程, web开发, 服务器配置,pfinalclub, git, gitsite, javascript, node, jquery, python, php, laravel, sql, database, linux, operating system, os, cpu, verilog, risc-v, bitcoin, ethereum, ai, 教程, 软件, 编程, 开发, 运维, 云计算, 网络, 互联网, 比特币, 以太坊, 操作系统, 智能合约, 数字货币, 爬虫, 逆向"}]]},"headers":[],"relativePath":"php/PHP配置文件详解.md","filePath":"php/PHP配置文件详解.md","lastUpdated":1741944848000}'),l={name:"php/PHP配置文件详解.md"};function i(c,s,o,t,r,_){return p(),a("div",{"data-pagefind-body":!0},s[0]||(s[0]=[e(`<h1 id="php配置文件详解" tabindex="-1">PHP配置文件详解 <a class="header-anchor" href="#php配置文件详解" aria-label="Permalink to &quot;PHP配置文件详解&quot;">​</a></h1><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>; 避免PHP信息暴露在http头中</span></span>
<span class="line"><span>expose_php = Off</span></span>
<span class="line"><span>; 避免暴露php调用mysql的错误信息</span></span>
<span class="line"><span>display_errors = Off</span></span>
<span class="line"><span>; 在关闭display_errors后开启PHP错误日志（路径在php-fpm.conf中配置）</span></span>
<span class="line"><span>log_errors = On</span></span>
<span class="line"><span>; 设置PHP的扩展库路径</span></span>
<span class="line"><span>extension_dir = &quot;/usr/local/php7/lib/php/extensions/no-debug-non-zts-20141001/&quot;</span></span>
<span class="line"><span>; 设置PHP的opcache和mysql动态库</span></span>
<span class="line"><span>zend_extension=opcache.so</span></span>
<span class="line"><span>extension=mysqli.so</span></span>
<span class="line"><span>extension=pdo_mysql.so</span></span>
<span class="line"><span>; 设置PHP的时区</span></span>
<span class="line"><span>date.timezone = PRC</span></span>
<span class="line"><span>; 开启opcache</span></span>
<span class="line"><span>[opcache]</span></span>
<span class="line"><span>; Determines if Zend OPCache is enabled</span></span>
<span class="line"><span>opcache.enable=1</span></span>
<span class="line"><span>;  设置PHP脚本允许访问的目录（需要根据实际情况配置）</span></span>
<span class="line"><span>;open_basedir = /usr/share/nginx/html;</span></span>
<span class="line"><span></span></span>
<span class="line"><span>;;;;;;;;;;;;;;;; </span></span>
<span class="line"><span>; File Uploads ; </span></span>
<span class="line"><span>;;;;;;;;;;;;;;;; </span></span>
<span class="line"><span>file_uploads = On ; 是否允许HTTP方式文件上载 </span></span>
<span class="line"><span>;upload_tmp_dir = ; 用于HTTP上载的文件的临时目录（未指定则使用系统默认） </span></span>
<span class="line"><span>upload_max_filesize = 2M ; 上载文件的最大许可大小</span></span>
<span class="line"><span>post_max_size = 128M</span></span>
<span class="line"><span>upload_max_filesize = 128M</span></span>
<span class="line"><span>; 这两个设置一样即可，可以更大但要注意超时</span></span>
<span class="line"><span>max_execution_time = 30</span></span>
<span class="line"><span>max_input_time = 600</span></span>
<span class="line"><span>memory_limit = 32M</span></span>
<span class="line"><span></span></span>
<span class="line"><span>; 上传大文件 </span></span>
<span class="line"><span></span></span>
<span class="line"><span>; Fopen wrappers ; </span></span>
<span class="line"><span>;;;;;;;;;;;;;;;;;; </span></span>
<span class="line"><span>allow_url_fopen = On ; 是否允许把URLs当作http:.. 或把文件当作ftp:...</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[Debugger] </span></span>
<span class="line"><span>debugger.host = localhost </span></span>
<span class="line"><span>debugger.port = 7869 </span></span>
<span class="line"><span>debugger.enabled = False</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[Session] </span></span>
<span class="line"><span>session.save_handler = files ; 用于保存/取回数据的控制方式 </span></span>
<span class="line"><span>session.save_path = C:\\win\\temp ; 在 save_handler 设为文件时传给控制器的参数， </span></span>
<span class="line"><span>; 这是数据文件将保存的路径。 </span></span>
<span class="line"><span>session.use_cookies = 1 ; 是否使用cookies </span></span>
<span class="line"><span>session.name = PHPSESSID </span></span>
<span class="line"><span>; 用在cookie里的session的名字 </span></span>
<span class="line"><span>session.auto_start = 0 ; 在请求启动时初始化session </span></span>
<span class="line"><span>session.cookie_lifetime = 0 ; 为按秒记的cookie的保存时间， </span></span>
<span class="line"><span>; 或为0时，直到浏览器被重启 </span></span>
<span class="line"><span>session.cookie_path = / ; cookie的有效路径 </span></span>
<span class="line"><span>session.cookie_domain = ; cookie的有效域 </span></span>
<span class="line"><span>session.serialize_handler = php ; 用于连接数据的控制器 </span></span>
<span class="line"><span>; php是 PHP 的标准控制器。 </span></span>
<span class="line"><span>session.gc_probability = 1 ; 按百分比的&#39;garbage collection（碎片整理）&#39;进程 </span></span>
<span class="line"><span>; 在每次 session 初始化的时候开始的可能性。 </span></span>
<span class="line"><span>session.gc_maxlifetime = 1440 ; 在这里数字所指的秒数后，保存的数据将被视为 </span></span>
<span class="line"><span>; &#39;碎片(garbage)&#39;并由gc 进程清理掉。 </span></span>
<span class="line"><span>session.referer_check = ; 检查 HTTP引用以使额外包含于URLs中的ids无效 </span></span>
<span class="line"><span>session.entropy_length = 0 ; 从文件中读取多少字节 </span></span>
<span class="line"><span>session.entropy_file = ; 指定这里建立 session id </span></span>
<span class="line"><span>; session.entropy_length = 16 </span></span>
<span class="line"><span>; session.entropy_file = /dev/urandom </span></span>
<span class="line"><span>session.cache_limiter = nocache ; 设为{nocache,private,public},以决定 HTTP 的 </span></span>
<span class="line"><span>; 缓存问题 </span></span>
<span class="line"><span>session.cache_expire = 180 ; 文档在 n 分钟后过时 </span></span>
<span class="line"><span>session.use_trans_sid = 1 ; 使用过渡性的 sid 支持，若编译时许可了 </span></span>
<span class="line"><span>; --enable-trans-sid </span></span>
<span class="line"><span>url_rewriter.tags = &quot; a=href,area=href,frame=src,input=src,form=fakeentry&quot;</span></span></code></pre></div>`,2)]))}const P=n(l,[["render",i]]);export{h as __pageData,P as default};
