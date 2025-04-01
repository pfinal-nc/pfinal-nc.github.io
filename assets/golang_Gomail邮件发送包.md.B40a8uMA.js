import{_ as i,c as a,o as n,a6 as l}from"./chunks/framework.B5rgnJXo.js";const g=JSON.parse('{"title":"Gomail邮件发送包","description":"详细介绍Gomail邮件发送包，包括安装配置、邮件发送、邮件接收等核心功能，帮助开发者轻松管理多个Python版本。","frontmatter":{"title":"Gomail邮件发送包","date":"2024-05-02T22:10:20.000Z","tags":["golang"],"description":"详细介绍Gomail邮件发送包，包括安装配置、邮件发送、邮件接收等核心功能，帮助开发者轻松管理多个Python版本。","author":"PFinal南丞","keywords":"Gomail邮件发送包, golang, 工具, 邮件发送, 邮件接收, 邮件发送包, 邮件发送工具,Go, URL检测, 工具, 编程, 终端命令, 开发, 检测, 小工具, 终端命令小工具, Go终端命令小工具,Go语言安全库使用指南, Go语言, 安全库, 使用指南, crypto, encoding, hash, math, rand, strconv, time,Go语言实现守护进程, 守护进程, 技术详解, Go语言, 进程管理, 关键技术点,Go, 并发, 模式, 编程, 并发编程, Go语言, 并发模式, 并发实战, 并发指南,go:embed 在 Go 开发中的应用与最佳实践, golang, 项目创建, 快速创建, 工具, 项目, 快速, 工具,Golang, Web应用, 安全指南, 输入验证, 输出编码, 会话管理, 文件上传, 跨站脚本攻击, SQL注入, 密码存储, 身份验证, 授权, 安全配置, 日志记录, 错误处理, 性能优化, 安全审计,pfinalclub, git, gitsite, javascript, node, jquery, python, php, laravel, sql, database, linux, operating system, os, cpu, verilog, risc-v, bitcoin, ethereum, ai, 教程, 软件, 编程, 开发, 运维, 云计算, 网络, 互联网, 比特币, 以太坊, 操作系统, 智能合约, 数字货币, 爬虫, 逆向"},"headers":[],"relativePath":"golang/Gomail邮件发送包.md","filePath":"golang/Gomail邮件发送包.md","lastUpdated":1741950068000}'),t={name:"golang/Gomail邮件发送包.md"};function p(h,s,e,k,o,r){return n(),a("div",{"data-pagefind-body":!0},s[0]||(s[0]=[l(`<h1 id="gomail邮件发送包" tabindex="-1">Gomail邮件发送包 <a class="header-anchor" href="#gomail邮件发送包" aria-label="Permalink to &quot;Gomail邮件发送包&quot;">​</a></h1><p>在构建告警系统时，采用了 <code>golang</code> 作为主要的开发语言，并且为了方便通知系统的对接，最初集成了<code>飞书</code>和<code>企业微信</code>等常用的消息机器人。随着项目需求的不断演进，产品提出了新的要求，需要在告警系统中加入<code>邮件通知</code>功能。为此，选择了一个简单且易于使用的 golang 扩展包——<code>Gomail</code>。经过一段时间的使用，<code>Gomail</code> 表现出色，极大地简化了邮件发送的流程，是一个非常适合集成邮件服务的解决方案。</p><h2 id="为什么选择-gomail" tabindex="-1">为什么选择 Gomail <a class="header-anchor" href="#为什么选择-gomail" aria-label="Permalink to &quot;为什么选择 Gomail&quot;">​</a></h2><p><code>Gomail</code> 之所以成为我们的首选，主要有以下几个原因：</p><ol><li><strong>易于使用</strong>：它提供了简单直观的 API，开发者可以快速上手，无需耗费大量时间研究复杂的配置。</li><li><strong>文档丰富</strong>：官方文档详细而清晰，即便是第一次使用邮件发送功能的开发者，也能通过阅读文档快速掌握其用法。</li><li><strong>可靠性高</strong>：经过大量测试和社区的广泛应用，<code>Gomail</code> 的稳定性得到了保障，能够在生产环境中可靠地发送邮件。</li></ol><p>对于任何需要邮件通知功能的应用程序，比如用户验证、账单提醒、系统告警等，<code>Gomail</code> 都是一个值得推荐的 golang 扩展包。</p><h3 id="如何在-go-项目中使用-gomail" tabindex="-1">如何在 Go 项目中使用 Gomail <a class="header-anchor" href="#如何在-go-项目中使用-gomail" aria-label="Permalink to &quot;如何在 Go 项目中使用 Gomail&quot;">​</a></h3><p>在 Go 中集成 <code>Gomail</code> 的过程非常简单。首先，通过 Go 的包管理工具下载并安装这个扩展包。</p><p><strong>安装</strong></p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>go get gopkg.in/gomail.v2</span></span></code></pre></div><p>（<em>提示：Gomail 的官方仓库地址是 <code>https://github.com/go-gomail/gomail</code>，可以在这里找到更多资源和使用示例。</em>）</p><p>安装完成后，我们就可以在项目代码中导入并开始使用 <code>Gomail</code> 了。</p><p><strong>示例</strong></p><p>下面是一个简单的邮件发送示例，展示了如何使用 <code>Gomail</code> 发送一封包含 HTML 内容的邮件：</p><div class="language-go vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">go</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">package</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> main</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  </span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  </span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">import</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &quot;</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">gopkg.in/gomail.v2</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  </span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  </span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/**  </span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"> * @Author: PFinal南丞  </span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"> * @Author: lampxiezi@163.com </span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"> * @Date: 2024/9/23 </span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"> * @Desc: </span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"> * @Project: 2024 </span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"> * */</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  </span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">func</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> main</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">() {  </span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">    // 创建新的邮件消息  </span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    m </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> gomail.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">NewMessage</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">()  </span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    m.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">SetHeader</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;From&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;hello@example.com&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)  </span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    m.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">SetHeader</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;To&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;lampxiezi@gmail.com&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 接收方  </span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    m.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">SetHeader</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;Subject&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;Gomail测试&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)           </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 邮件主题  </span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    m.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">SetBody</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;text/html&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;&lt;h2&gt;PFinalClub&lt;/h2&gt;&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)  </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// 邮件内容，支持HTML格式  </span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  </span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">    // 设置邮件服务器信息  </span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    d </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> gomail.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">NewDialer</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(  </span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">       &quot;sandbox.smtp.mailtrap.io&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,  </span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">       2525</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,  </span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">       &quot;b69fa37a7153&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,  </span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">       &quot;ca7f825f204&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)  </span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  </span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">    // 发送邮件  </span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    if</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> err </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> d.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">DialAndSend</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(m); err </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">!=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> nil</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> {  </span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">       panic</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(err)  </span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    }}</span></span></code></pre></div><h4 id="代码解析" tabindex="-1">代码解析： <a class="header-anchor" href="#代码解析" aria-label="Permalink to &quot;代码解析：&quot;">​</a></h4><ol><li><strong>创建邮件对象</strong>：通过 <code>gomail.NewMessage()</code> 来实例化一个新的邮件对象 <code>m</code>。</li><li><strong>设置邮件头</strong>：我们使用 <code>SetHeader()</code> 方法来设置发件人、收件人、以及邮件的主题。</li><li><strong>邮件内容</strong>：通过 <code>SetBody()</code> 可以轻松设置邮件的正文内容，这里我们演示了如何发送包含 HTML 的邮件。</li><li><strong>SMTP 服务器配置</strong>：在发送邮件前，我们需要配置 SMTP 服务器的信息，包括服务器地址、端口、用户名和密码。</li><li><strong>发送邮件</strong>：最后，调用 <code>DialAndSend()</code> 方法建立与 SMTP 服务器的连接并发送邮件。如果发送过程中出现错误，程序会抛出异常。</li></ol><h4 id="运行代码" tabindex="-1">运行代码 <a class="header-anchor" href="#运行代码" aria-label="Permalink to &quot;运行代码&quot;">​</a></h4><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202409231410389.png" alt=""></p><h2 id="测试邮件发送服务-mailtrap" tabindex="-1">测试邮件发送服务：Mailtrap <a class="header-anchor" href="#测试邮件发送服务-mailtrap" aria-label="Permalink to &quot;测试邮件发送服务：Mailtrap&quot;">​</a></h2><p>在开发和测试过程中，配置真实的 <code>SMTP</code> 服务可能会有一定的复杂性，尤其是需要频繁进行测试时。为了简化这一流程，推荐使用一个非常好用的邮件测试服务——<code>Mailtrap</code>。它能够模拟真实的邮件发送场景，但邮件实际上并不会发到用户的收件箱，而是保存在 Mailtrap 平台上供开发者查看和验证。</p><p><strong>Mailtrap 介绍</strong></p><p>Mailtrap 提供了一个非常友好的用户界面和丰富的功能，适合开发人员用来测试邮件发送逻辑，而无需担心误发邮件到真实用户的邮箱。</p><p><strong>Mailtrap 地址</strong></p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>https://mailtrap.io/</span></span></code></pre></div><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202409231417476.png" alt=""></p><h4 id="使用-mailtrap-的步骤" tabindex="-1">使用 Mailtrap 的步骤 <a class="header-anchor" href="#使用-mailtrap-的步骤" aria-label="Permalink to &quot;使用 Mailtrap 的步骤&quot;">​</a></h4><ol><li>登录 Mailtrap 并添加一个测试邮箱。</li></ol><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202409231419476.png" alt=""></p><ol start="2"><li><p>点击邮箱详情页面，查看 SMTP 服务器的配置参数。 <img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202409231421341.png" alt=""></p></li><li><p>在你的应用中使用这些参数，进行邮件发送测试。</p></li></ol><div class="language-go vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">go</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">   // 设置邮件服务器信息  </span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    d </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">:=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> gomail.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">NewDialer</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(  </span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">       &quot;sandbox.smtp.mailtrap.io&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,  </span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">       2525</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,  </span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">       &quot;b69fa37a7153&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,  </span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">       &quot;ca7f825f204&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span></code></pre></div><p>通过以上简单的步骤，就可以愉快地测试邮件功能了。</p>`,32)]))}const E=i(t,[["render",p]]);export{g as __pageData,E as default};
