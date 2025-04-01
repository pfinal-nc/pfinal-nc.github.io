import{_ as a,c as i,o as n,a6 as p}from"./chunks/framework.B5rgnJXo.js";const d=JSON.parse('{"title":"Create Go App CLI 一款快速创建golang项目的工具","description":"介绍一款快速创建golang项目的工具","frontmatter":{"title":"Create Go App CLI 一款快速创建golang项目的工具","date":"2024-08-20T17:15:27.000Z","tags":["golang"],"description":"介绍一款快速创建golang项目的工具","author":"PFinal南丞","keywords":"Create Go App CLI, golang, 项目创建, 快速创建, 工具, 项目, 快速, 工具","head":[["meta",{"name":"keywords","content":"Create Go App CLI, golang, 项目创建, 快速创建, 工具, 项目, 快速, 工具,pfinalclub, git, gitsite, javascript, node, jquery, python, php, laravel, sql, database, linux, operating system, os, cpu, verilog, risc-v, bitcoin, ethereum, ai, 教程, 软件, 编程, 开发, 运维, 云计算, 网络, 互联网, 比特币, 以太坊, 操作系统, 智能合约, 数字货币, 爬虫, 逆向"}]]},"headers":[],"relativePath":"golang/Create Go App CLI 一款快速创建golang项目的工具.md","filePath":"golang/Create Go App CLI 一款快速创建golang项目的工具.md","lastUpdated":1742291207000}'),l={name:"golang/Create Go App CLI 一款快速创建golang项目的工具.md"};function h(t,s,e,k,F,r){return n(),i("div",{"data-pagefind-body":!0},s[0]||(s[0]=[p(`<h1 id="create-go-app-cli-一款快速创建golang项目的工具" tabindex="-1">Create Go App CLI 一款快速创建golang项目的工具 <a class="header-anchor" href="#create-go-app-cli-一款快速创建golang项目的工具" aria-label="Permalink to &quot;Create Go App CLI 一款快速创建golang项目的工具&quot;">​</a></h1><h3 id="背景" tabindex="-1">背景 <a class="header-anchor" href="#背景" aria-label="Permalink to &quot;背景&quot;">​</a></h3><p>如果你和我一样有丰富的 PHP 项目经验，可能已经习惯了使用命令行工具来快速创建项目，比如用 laravel new example-app 这个命令几秒钟就能生成一个完整的 Laravel 项目。然而，当你转向 golang 开发时，可能会觉得起步稍显繁琐，需要自己手动整理目录结构和配置文件。这种时候，我会想：要是 golang 也有类似的工具该多好啊！于是，我翻遍了 GitHub，最终找到了一个可以解决这个问题的工具，它就是——Create Go App CLI。</p><h3 id="工具介绍" tabindex="-1">工具介绍 <a class="header-anchor" href="#工具介绍" aria-label="Permalink to &quot;工具介绍&quot;">​</a></h3><p>Create Go App CLI 是一个极其方便的工具，只需要运行一个简单的命令，就可以生成一个包括后端（golang）、前端（JavaScript、TypeScript）以及自动化部署（Ansible、Docker）配置的生产就绪项目。你不再需要为设置项目基础架构而发愁，Create Go App CLI 已经为你做好了这一切。</p><h4 id="创建项目的效果展示" tabindex="-1">创建项目的效果展示 <a class="header-anchor" href="#创建项目的效果展示" aria-label="Permalink to &quot;创建项目的效果展示&quot;">​</a></h4><p>选择后端框架时，你可以看到类似下图的选项界面：</p><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202408201333737.png" alt=""></p><p>接着，你可以选择前端框架或库的扩展：</p><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202408201333650.png" alt=""></p><p>最后，还可以选择 Web 服务器或代理服务器：</p><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202408201335809.png" alt=""></p><h4 id="项目结构" tabindex="-1">项目结构: <a class="header-anchor" href="#项目结构" aria-label="Permalink to &quot;项目结构:&quot;">​</a></h4><p>假设我们选择了 chi 作为后端框架，生成的项目目录结构大致如下：</p><div class="language-shell vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">shell</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> Makefile</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> backend</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> Dockerfile</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> LICENSE</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> Makefile</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> README.md</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> api_test.http</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> cmd</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> └──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> run.go</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> go.mod</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> go.sum</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> internal</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> config</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> └──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> config.go</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> └──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> router</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">     ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> healthcheck</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">     │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> handlers.go</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">     │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> └──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> routes.go</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">     └──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> router.go</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> └──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> main.go</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> frontend</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> README.md</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> index.html</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> package.json</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> public</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> └──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> vite.svg</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> src</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> App.vue</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> assets</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> └──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> vue.svg</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> components</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> └──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> HelloWorld.vue</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> main.js</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> └──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> style.css</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">│  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> └──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> vite.config.js</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> hosts.ini</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> playbook.yml</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">└──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> roles</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">    ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> backend</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">    │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> └──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> tasks</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">    │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">     └──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> main.yml</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">    ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> docker</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">    │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> └──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> tasks</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">    │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">     └──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> main.yml</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">    ├──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> postgres</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">    │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> └──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> tasks</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">    │  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">     └──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> main.yml</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">    └──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> redis</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">        └──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> tasks</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">            └──</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> main.yml</span></span></code></pre></div><p>可以看到，生成的项目不仅包含了后端的 golang 代码，还集成了前端框架的配置文件和自动化部署的脚本，几乎涵盖了一个生产环境中所需的所有内容。</p><h3 id="安装方法" tabindex="-1">安装方法 <a class="header-anchor" href="#安装方法" aria-label="Permalink to &quot;安装方法&quot;">​</a></h3><ul><li>go install 安装</li></ul><div class="language-shell vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">shell</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">go</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> install</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> github.com/create-go-app/cli/v4/cmd/cgapp@latest</span></span></code></pre></div><ul><li>homebrew 安装:</li></ul><div class="language-shell vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">shell</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># Tap a new formula:</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">brew</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> tap</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> create-go-app/tap</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># Installation:</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">brew</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> install</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> create-go-app/tap/cgapp</span></span></code></pre></div><h3 id="使用指南" tabindex="-1">使用指南 <a class="header-anchor" href="#使用指南" aria-label="Permalink to &quot;使用指南&quot;">​</a></h3><p>安装完成后，你就可以在命令行里直接创建项目了。以下是一个简单的使用示例：</p><div class="language-shell vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">shell</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">mkdir</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> web</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"> # 创建一个项目的目录</span></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">cd</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> web</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> </span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">cgapp</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> create</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">  # 就可以在web目录夏创建了</span></span></code></pre></div><p>在生成的项目目录中，你会发现一个 hosts.ini 文件，稍作修改后，你就可以直接将项目部署到服务器上了。</p><h4 id="支持的后端框架" tabindex="-1">支持的后端框架 <a class="header-anchor" href="#支持的后端框架" aria-label="Permalink to &quot;支持的后端框架&quot;">​</a></h4><p>Create Go App CLI 提供了三种 golang 后端框架的支持：</p><ul><li><p>net/http: 使用 golang 内置的 net/http 包创建的后端模板，适合简单的 REST API 项目，支持 CRUD 和 JWT 身份验证 (<a href="https://github.com/create-go-app/net_http-go-template" target="_blank" rel="noreferrer">https://github.com/create-go-app/net_http-go-template</a>)</p></li><li><p>fiber: 功能更为强大的框架，支持 CRUD、JWT 身份验证、令牌刷新、数据库和缓存操作等复杂功能 (<a href="https://gofiber.io" target="_blank" rel="noreferrer">https://gofiber.io</a>)</p></li><li><p>chi: 支持几乎所有的 Web 开发需求，是一个功能全面的 Go Web 框架 (<a href="https://go-chi.io/#/" target="_blank" rel="noreferrer">https://go-chi.io/#/</a>)</p></li></ul><h4 id="支持的前端框架" tabindex="-1">支持的前端框架 <a class="header-anchor" href="#支持的前端框架" aria-label="Permalink to &quot;支持的前端框架&quot;">​</a></h4><p>CLI 工具支持多种前端框架或库，如下所示:</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>[?] Choose a frontend framework/library:  [Use arrows to move, type to filter, ? for more help]</span></span>
<span class="line"><span>&gt; none</span></span>
<span class="line"><span>  vanilla</span></span>
<span class="line"><span>  vanilla-ts</span></span>
<span class="line"><span>  react</span></span>
<span class="line"><span>  react-ts</span></span>
<span class="line"><span>  react-swc</span></span>
<span class="line"><span>  react-swc-ts</span></span>
<span class="line"><span>  preact</span></span>
<span class="line"><span>  preact-ts</span></span>
<span class="line"><span>  next</span></span>
<span class="line"><span>  next-ts</span></span>
<span class="line"><span>  nuxt</span></span>
<span class="line"><span>  vue</span></span>
<span class="line"><span>  vue-ts</span></span>
<span class="line"><span>  svelte</span></span>
<span class="line"><span>  svelte-ts</span></span>
<span class="line"><span>  solid</span></span>
<span class="line"><span>  solid-ts</span></span>
<span class="line"><span>  lit</span></span>
<span class="line"><span>  lit-ts</span></span>
<span class="line"><span>  qwik</span></span></code></pre></div><p>个人建议：Vue 是个不错的选择，尤其适合构建现代化的 Web 应用。</p><h3 id="项目配置" tabindex="-1">项目配置 <a class="header-anchor" href="#项目配置" aria-label="Permalink to &quot;项目配置&quot;">​</a></h3><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202408201428436.png" alt=""></p><p>生成的项目自带 .env.example 配置文件。你只需要把这个文件复制并重命名为 .env，然后稍作配置就可以直接运行项目了。</p><h3 id="总结" tabindex="-1">总结 <a class="header-anchor" href="#总结" aria-label="Permalink to &quot;总结&quot;">​</a></h3><p>Create Go App CLI 是一个为 golang 项目开发者量身定制的利器，不仅简化了项目的创建过程，还提供了多种选择和配置，使得从后端到前端、从开发到部署都变得更加高效。如果你希望快速构建一个功能全面的 golang 项目，这个工具绝对值得一试。</p><p>更多功能和详细使用说明，可以参考官方的 Wiki，里面有更丰富的内容供你探索。</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>wiki 地址:</span></span>
<span class="line"><span></span></span>
<span class="line"><span>https://github.com/create-go-app/cli</span></span></code></pre></div>`,39)]))}const o=a(l,[["render",h]]);export{d as __pageData,o as default};
