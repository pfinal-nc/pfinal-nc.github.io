import{_ as i,c as a,o as n,a6 as t}from"./chunks/framework.B5rgnJXo.js";const g=JSON.parse('{"title":"基于Wails的抖音直播工具","description":"基于Wails的抖音直播工具","frontmatter":{"title":"基于Wails的抖音直播工具","date":"2024-10-18T11:06:22.000Z","tags":["golang","Wails"],"description":"基于Wails的抖音直播工具","author":"PFinal南丞","keywords":"基于Wails的抖音直播工具, golang, Wails, 抖音, 直播, 工具, 桌面应用,golang, 游戏开发, 接口设计, 高性能, 高并发, 游戏服务器, 游戏接口, 游戏框架,Wails, 应用, 开发, 尝试, 桌面应用, Go, Web开发, Tailwindcss, sqlite,Go-Cache, Wails, 内存缓存, 性能优化, 缓存策略, 内存管理, 应用程序性能,golang, 工具, 提升生产力, 开发, golang, Go开发, Go工具, Go扩展包,提速利器：使用Go语言实现静态化API, golang, 项目创建, 快速创建, 工具, 项目, 快速, 工具,深入Go内存分配, golang, 内存分配,Go Channel, 批量读取, 实际应用,Laravel, 构建, 手工, 框架, 手工构建, PHP,Laravel, Carbon, 类, 使用, Laravel-Carbon-类使用, Laravel-Carbon-类使用解析,Golang, Web应用, 安全指南, 输入验证, 输出编码, 会话管理, 文件上传, 跨站脚本攻击, SQL注入, 密码存储, 身份验证, 授权, 安全配置, 日志记录, 错误处理, 性能优化, 安全审计,golang, TLS, SSL, 网络安全, 传输层安全协议, 安全套接层, 加密, 数据传输, 网络通信,Golang, 协程池, 实现, 方法, 协程, 池, 概念, 应用, 场景, 实现方式, 协程池功能, 性能, 响应速度,golang, 脱敏扩展包：简化敏感信息处理的利器, 工具, golang扩展包, golang脱敏, golang脱敏工具,Golang, 工具, 效率, 提升, 小工具, 代码质量, 开发, 编程, 工具, 自动格式化, 自动导入, 代码补全,undefined,AutoCorrent专有名词大小写扩展包, golang, 项目创建, 快速创建, 工具, 项目, 快速, 工具,Create Go App CLI, golang, 项目创建, 快速创建, 工具, 项目, 快速, 工具,Go语言开发终端小工具后续, Go, 工具, 终端, 小工具, 开发, 编程, 命令, 工具开发, 代码实现, 运行命令,GO开发IP过滤小脚本, go, 工具, go开发ip过滤, go ip过滤脚本, go ip过滤,Go 开发终端小工具, golang, 工具, 开发, 编程, 终端, 天气查询, 手机归属地查询, cobra库, 命令行小工具,Go语言的高性能User-Agent解析库, golang, 工具, User-Agent解析, 性能测试, 解析库,golang, 地址生成, 扩展包, 地理位置, 中国地址, 地址生成工具, 地址数据, 地址库,Gomail邮件发送包, golang, 工具, 邮件发送, 邮件接收, 邮件发送包, 邮件发送工具,Go语言安全库使用指南, Go语言, 安全库, 使用指南, crypto, encoding, hash, math, rand, strconv, time,Go, URL检测, 工具, 编程, 终端命令, 开发, 检测, 小工具, 终端命令小工具, Go终端命令小工具,Go语言实现守护进程, 守护进程, 技术详解, Go语言, 进程管理, 关键技术点,Go, 并发, 模式, 编程, 并发编程, Go语言, 并发模式, 并发实战, 并发指南,go:embed 在 Go 开发中的应用与最佳实践, golang, 项目创建, 快速创建, 工具, 项目, 快速, 工具,pfinalclub, git, gitsite, javascript, node, jquery, python, php, laravel, sql, database, linux, operating system, os, cpu, verilog, risc-v, bitcoin, ethereum, ai, 教程, 软件, 编程, 开发, 运维, 云计算, 网络, 互联网, 比特币, 以太坊, 操作系统, 智能合约, 数字货币, 爬虫, 逆向"},"headers":[],"relativePath":"golang/基于Wails的抖音直播工具.md","filePath":"golang/基于Wails的抖音直播工具.md","lastUpdated":1742433506000}'),h={name:"golang/基于Wails的抖音直播工具.md"};function l(k,s,p,e,r,E){return n(),a("div",{"data-pagefind-body":!0},s[0]||(s[0]=[t(`<h1 id="基于wails的抖音直播工具" tabindex="-1">基于Wails的抖音直播工具 <a class="header-anchor" href="#基于wails的抖音直播工具" aria-label="Permalink to &quot;基于Wails的抖音直播工具&quot;">​</a></h1><p>​ 最近在刷抖音的时候, 发现有很多的 无人直播的直播间, 但是 经常有 发弹幕 没有人回应,或者 进入没有欢迎语, 于是尝试着做一个小工具,来辅助直播.</p><h2 id="项目介绍" tabindex="-1">项目介绍 <a class="header-anchor" href="#项目介绍" aria-label="Permalink to &quot;项目介绍&quot;">​</a></h2><p>​ 基于Wails 框架, 开发的一个抖音直播工具, 主要功能是</p><ul><li>进入直播间</li><li>自动监听人员的进入</li><li>自动监听弹幕</li><li>自动监听礼物</li><li>自动监听关注</li></ul><h2 id="项目结构" tabindex="-1">项目结构 <a class="header-anchor" href="#项目结构" aria-label="Permalink to &quot;项目结构&quot;">​</a></h2><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202402221811105.png" alt=""></p><h2 id="项目原理" tabindex="-1">项目原理 <a class="header-anchor" href="#项目原理" aria-label="Permalink to &quot;项目原理&quot;">​</a></h2><p>通过抖音网页版弹幕数据抓取 , 然后通过Wails 框架将数据渲染到前端, 实现自动监听弹幕, 礼物, 关注等功能.</p><p>核心代码如下:</p><div class="language-go vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">go</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">func</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> (</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">d </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">*</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">DouyinLiveWebFetcher</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) </span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">connectWebSocket</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">() {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	d.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">RoomID</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">()</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	wss </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;wss://webcast3-ws-web-lq.douyin.com/webcast/im/push/v2/?&quot;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">		&quot;app_name=douyin_web&amp;version_code=180800&amp;webcast_sdk_version=1.3.0&amp;update_version_code=1.3.0&quot;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">		&quot;&amp;compress=gzip&quot;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">		&quot;&amp;internal_ext=internal_src:dim|wss_push_room_id:&quot;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> d.roomID </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">+</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">		&quot;|wss_push_did:&quot;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> d.roomID </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">+</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">		&quot;|dim_log_id:202302171547011A160A7BAA76660E13ED|fetch_time:1676620021641|seq:1|wss_info:0-1676&quot;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">		&quot;620021641-0-0|wrds_kvs:WebcastRoomStatsMessage-1676620020691146024_WebcastRoomRankMessage-167661&quot;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">		&quot;9972726895075_AudienceGiftSyncData-1676619980834317696_HighlightContainerSyncData-2&amp;cursor=t-1676&quot;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">		&quot;620021641_r-1_d-1_u-1_h-1&quot;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">		&quot;&amp;host=https://live.douyin.com&amp;aid=6383&amp;live_id=1&quot;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">		&quot;&amp;did_rule=3&amp;debug=false&amp;endpoint=live_pc&amp;support_wrds=1&amp;&quot;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">		&quot;im_path=/webcast/im/fetch/&amp;user_unique_id=&quot;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> d.roomID </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">+</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">		&quot;&amp;device_platform=web&amp;cookie_enabled=true&amp;screen_width=1440&amp;screen_height=900&amp;browser_language=zh&amp;&quot;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">		&quot;browser_platform=MacIntel&amp;browser_name=Mozilla&amp;&quot;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">		&quot;browser_version=5.0%20(Macintosh;%20Intel%20Mac%20OS</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">%20X</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">%2010_15_7)%20AppleWebKit/537.36%20(KHTML,%20&quot;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">		&quot;like</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">%20G</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">ecko)%20Chrome/110.0.0.0%20Safari/537.36&amp;&quot;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">		&quot;browser_online=true&amp;tz_name=Asia/Shanghai&amp;identity=audience&amp;room_id=&quot;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> d.roomID </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">+</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">		&quot;&amp;heartbeatDuration=0&amp;signature=00000000&quot;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	dialer </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> websocket.DefaultDialer</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	header </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:=</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> http</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">Header</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">{</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;Cookie&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: []</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">string</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">{fmt.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">Sprintf</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;ttwid=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">%s</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, d.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">Ttwid</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">())}, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;User-Agent&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: []</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">string</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">{d.userAgent}}</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	c, _, err </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> dialer.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">Dial</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(wss, header)</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">	if</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> err </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">!=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> nil</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">		log.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">Fatal</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;WebSocket connection error: &quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, err)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	}</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">	defer</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> func</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">c</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> *</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">websocket</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">Conn</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">		_ </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> c.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">Close</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">()</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	}(c)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	d.ws </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> c</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	d.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">wsOnOpen</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">()</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	d.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">wsLoop</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">()</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><p>由于网页直播间使用的 是 connectWebSocket 进行通信的 所以 用 go 构造了一个 socket 服务用来连接 直播间的 socket 通信, 并且解析消息, 消息的结构做了一个 <strong>protobuf</strong> 文件</p><div class="language-proto vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">proto</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">syntax</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;proto3&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">package</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> lib</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">option</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> go_package</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;../lib&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">message</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> Response</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  repeated</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> Message</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> messagesList </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 1</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  string</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> cursor </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 2</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  uint64</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> fetchInterval </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 3</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  uint64</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> now </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 4</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  string</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> internalExt </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 5</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  uint32</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> fetchType </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 6</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  map</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&lt;</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">string</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">string</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&gt; routeParams </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 7</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  uint64</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> heartbeatDuration </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 8</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  bool</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> needAck </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 9</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  string</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> pushServer </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 10</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  string</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> liveCursor </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 11</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  bool</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> historyNoMore </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 12</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">message</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> Message</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">{</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  string</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> method </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 1</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  bytes</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> payload </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 2</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  int64</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> msgId </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 3</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  int32</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> msgType </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 4</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  int64</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> offset </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 5</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  bool</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> needWrdsStore </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 6</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  int64</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> wrdsVersion </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 7</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  string</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> wrdsSubKey </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 8</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><p>然后生成成 消息结构体 来进行消息的解析</p><h2 id="项目截图" tabindex="-1">项目截图 <a class="header-anchor" href="#项目截图" aria-label="Permalink to &quot;项目截图&quot;">​</a></h2><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202402221614497.png" alt=""></p><p>效果如上图所示</p><h2 id="后续" tabindex="-1">后续 <a class="header-anchor" href="#后续" aria-label="Permalink to &quot;后续&quot;">​</a></h2><p>目前项目只是实现了 基本的监听, 后续会继续完善下面的功能</p><ul class="task-list"><li class="task-list-item"><input type="checkbox" id="cbx_0" disabled="true"><label for="cbx_0"> 弹幕发送</label></li><li class="task-list-item"><input type="checkbox" id="cbx_1" disabled="true"><label for="cbx_1"> 入场欢迎的语音</label></li><li class="task-list-item"><input type="checkbox" id="cbx_2" disabled="true"><label for="cbx_2"> 直播间的礼物感谢功能</label></li></ul><h3 id="项目地址" tabindex="-1">项目地址 <a class="header-anchor" href="#项目地址" aria-label="Permalink to &quot;项目地址&quot;">​</a></h3><p><a href="https://github.com/pfinal-nc/pf_douying/tree/master" target="_blank" rel="noreferrer">https://github.com/pfinal-nc/pf_douying/tree/master</a></p>`,22)]))}const o=i(h,[["render",l]]);export{g as __pageData,o as default};
