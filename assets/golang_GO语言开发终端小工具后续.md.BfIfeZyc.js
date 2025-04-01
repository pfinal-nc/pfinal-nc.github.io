import{_ as i,c as a,o as n,a6 as t}from"./chunks/framework.B5rgnJXo.js";const d=JSON.parse('{"title":"Go语言开发终端小工具后续","description":"详细介绍Go终端URL检测小工具的开发过程，包括功能实现、代码实现、运行命令等方面，帮助开发者快速开发终端命令小工具。","frontmatter":{"title":"Go语言开发终端小工具后续","date":"2024-03-05T11:46:43.000Z","tags":["golang","工具"],"description":"详细介绍Go终端URL检测小工具的开发过程，包括功能实现、代码实现、运行命令等方面，帮助开发者快速开发终端命令小工具。","author":"PFinal南丞","keywords":"Go语言开发终端小工具后续, Go, 工具, 终端, 小工具, 开发, 编程, 命令, 工具开发, 代码实现, 运行命令,GO开发IP过滤小脚本, go, 工具, go开发ip过滤, go ip过滤脚本, go ip过滤,Go 开发终端小工具, golang, 工具, 开发, 编程, 终端, 天气查询, 手机归属地查询, cobra库, 命令行小工具,Go语言的高性能User-Agent解析库, golang, 工具, User-Agent解析, 性能测试, 解析库,golang, 地址生成, 扩展包, 地理位置, 中国地址, 地址生成工具, 地址数据, 地址库,Gomail邮件发送包, golang, 工具, 邮件发送, 邮件接收, 邮件发送包, 邮件发送工具,Go, URL检测, 工具, 编程, 终端命令, 开发, 检测, 小工具, 终端命令小工具, Go终端命令小工具,Go语言安全库使用指南, Go语言, 安全库, 使用指南, crypto, encoding, hash, math, rand, strconv, time,Go语言实现守护进程, 守护进程, 技术详解, Go语言, 进程管理, 关键技术点,Go, 并发, 模式, 编程, 并发编程, Go语言, 并发模式, 并发实战, 并发指南,go:embed 在 Go 开发中的应用与最佳实践, golang, 项目创建, 快速创建, 工具, 项目, 快速, 工具,Golang, Web应用, 安全指南, 输入验证, 输出编码, 会话管理, 文件上传, 跨站脚本攻击, SQL注入, 密码存储, 身份验证, 授权, 安全配置, 日志记录, 错误处理, 性能优化, 安全审计,pfinalclub, git, gitsite, javascript, node, jquery, python, php, laravel, sql, database, linux, operating system, os, cpu, verilog, risc-v, bitcoin, ethereum, ai, 教程, 软件, 编程, 开发, 运维, 云计算, 网络, 互联网, 比特币, 以太坊, 操作系统, 智能合约, 数字货币, 爬虫, 逆向","top":1,"sticky":true},"headers":[],"relativePath":"golang/GO语言开发终端小工具后续.md","filePath":"golang/GO语言开发终端小工具后续.md","lastUpdated":1741950068000}'),h={name:"golang/GO语言开发终端小工具后续.md"};function l(p,s,k,e,r,E){return n(),a("div",{"data-pagefind-body":!0},s[0]||(s[0]=[t(`<h1 id="go语言开发终端小工具后续" tabindex="-1">Go语言开发终端小工具后续 <a class="header-anchor" href="#go语言开发终端小工具后续" aria-label="Permalink to &quot;Go语言开发终端小工具后续&quot;">​</a></h1><p>前面有一篇文章记录了使用 Go 的 <em>cobra/cobra</em> 库来开发 终端的小工具, 在前面的基础上又更新了一些小的工具.内容如下:</p><div class="language-shell vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">shell</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">   -</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> pf_tools</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> pf_wt</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> 查询天气</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">   -</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> pf_tools</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> pf_m</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> 手机归属地查询</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">   -</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> pf_tools</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> pf_md5</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> md5</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> 小工具</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">   -</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> pf_tools</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> pf_b64</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> base64</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> 小工具</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">   -</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> pf_tools</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> pf_s</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> 查询网络词汇</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">   -</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> pf_tools</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> pf_t</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">  获取当前时间戳</span></span></code></pre></div><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202312150919993.png" alt=""></p><p>其中 <strong>pf_wt</strong>, <strong>pf_s</strong> 使用了 网络的接口.其他的都是没有使用网络的接口.在更新迭代的过程中,遇到嘞些问题,这里记录一下.</p><h2 id="显示与复制的问题" tabindex="-1">显示与复制的问题 <a class="header-anchor" href="#显示与复制的问题" aria-label="Permalink to &quot;显示与复制的问题&quot;">​</a></h2><h4 id="_1-复制问题" tabindex="-1">1. 复制问题 <a class="header-anchor" href="#_1-复制问题" aria-label="Permalink to &quot;1. 复制问题&quot;">​</a></h4><p>在开发 <strong>pf_b64</strong>,<strong>pf_t</strong>,<strong>pf_md5</strong> 的时候, 显示都没啥问题, 但是在使用的过程中发现, 由于使用了 <strong>termui</strong> 终端 UI 库导致复制的时候, 复制的内容是乱的。 于是做了如下修改:</p><div class="language-go vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">go</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    uiEvents </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> ui.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">PollEvents</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">()</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">	for</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">		e </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:=</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> &lt;-</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">uiEvents</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">		switch</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> e.ID {</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">		case</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;q&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">			return</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">		case</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;c&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">			_ </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> clipboard.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">WriteAll</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(enStr)</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">			return</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">		}</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	}</span></span></code></pre></div><p>使用了<strong>github.com/atotto/clipboard</strong>库, 增加了 按键 <strong>c</strong> 的时候, 直接复制到 剪贴板。这样就方便多了。</p><h4 id="_2-显示问题" tabindex="-1">2. 显示问题 <a class="header-anchor" href="#_2-显示问题" aria-label="Permalink to &quot;2. 显示问题&quot;">​</a></h4><p><strong>pf_b64</strong> 终端显示的时候,由于前期测试的是比较短的内容, 后来加入比较长的内容的时候 导致显示的内容被截断, 于是做了如下修改:</p><div class="language-go vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">go</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    func</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> splitStringByLength</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(s </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">string</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, length </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">int</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) []</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">string</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">	var</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> result []</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">string</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">	for</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> i </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">; i </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">&lt;</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> len</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(s); i </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">+=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> length {</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">		if</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> i</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">+</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">length </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">&gt;</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> len</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(s) {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">			result </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> append</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(result, s[i:])</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">		} </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">else</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">			result </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> append</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(result, s[i:i</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">+</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">length])</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">		}</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	}</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">	return</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> result</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    sEncList </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:=</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> splitStringByLength</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(sprintf, </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">100</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">	// fmt.Println(strings.Join(sEncList, &quot;\\n&quot;))</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	p </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> widgets.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">NewParagraph</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">()</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	p.Title </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;加密结果&quot;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	p.Text </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> strings.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">Join</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(sEncList, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">\\n</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">	// p.Text = sprintf</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	p.TextStyle.Fg </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> ui.ColorGreen</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	p.TextStyle.Modifier </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> ui.ModifierBold</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	p.BorderStyle.Fg </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> ui.ColorGreen</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	p.WrapText </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> true</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	p.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">SetRect</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">105</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">len</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(sEncList)</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">+</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">2</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span></code></pre></div><p>对 结果 的长度进行了动态计算, 然后进行了动态的显示,出来的效果就是可以换行显示了,效果如下:</p><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202312150934936.png" alt=""></p><blockquote><p>注意: 这里按 c 复制</p></blockquote><h2 id="打包问题" tabindex="-1">打包问题 <a class="header-anchor" href="#打包问题" aria-label="Permalink to &quot;打包问题&quot;">​</a></h2><p>在 <strong>go build</strong> 以后丢到 linux 系统上 发现 无法运行, 因为 在 开发 <strong>pf_m</strong> 命令的时候使用了,第三方的库 <strong>github.com/zheng-ji/gophone</strong>, 这个库中有一个 <strong>.dat</strong>的静态文件, 在 <strong>go build</strong> 以后没有打包进程序中去, 于是 开启 google 大法, 发现还是没有啥好的解决办法.</p><p>最后, 翻了翻 <strong>github.com/zheng-ji/gophone</strong> 这个包中的源码, 发现代码不多, 直接复制过来, 然后吧 <strong>.bat</strong> 的数据库文件也复制过来, 然后去<strong>go build</strong> 发现还是没有打包进去, 于是 继续 google 大法, 最后修改了一下 包含文件的代码:</p><div class="language-go vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">go</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 修改前</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">func</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> init</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">() {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	_, fulleFilename, _, _ </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> runtime.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">Caller</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">	var</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> err </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">error</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	content, err </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> ioutil.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">ReadFile</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(path.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">Join</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(path.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">Dir</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(fulleFilename), PHONE_DAT))</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">	if</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> err </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">!=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> nil</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">		panic</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(err)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	}</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 修改后</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">//go:embed phone.dat</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">var</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> fsContent </span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">embed</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">FS</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">func</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> init</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">() {</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">	var</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> err </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">error</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	content, err </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> fsContent.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">ReadFile</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(PhoneDat)</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">	if</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> err </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">!=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> nil</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">		panic</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(err)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	}</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><p>使用了 <strong>embed</strong> 来进行导入. 然后顺利打包,在 linux 系统上 运行正常.</p><p><strong>上面这种 复制代码的解决办法,估计是个大坑,等后续看到解决办法,再来更新记录</strong></p><h2 id="windows-显示问题" tabindex="-1">Windows 显示问题 <a class="header-anchor" href="#windows-显示问题" aria-label="Permalink to &quot;Windows 显示问题&quot;">​</a></h2><p>由于解决了运行的问题, 以为万事大吉了 但是在 windows 系统上 发现 显示有问题 如下:</p><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202312150948727.png" alt=""></p><p>搜索发现 <strong>termui</strong> 在 windows 下不支持中文, 所以只能 放弃 win了</p><h2 id="最后" tabindex="-1">最后 <a class="header-anchor" href="#最后" aria-label="Permalink to &quot;最后&quot;">​</a></h2><p>小工具持续更新中...</p>`,28)]))}const o=i(h,[["render",l]]);export{d as __pageData,o as default};
