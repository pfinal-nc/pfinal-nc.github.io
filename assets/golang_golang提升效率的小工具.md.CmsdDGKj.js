import{_ as s,c as n,o as p,a6 as t}from"./chunks/framework.B5rgnJXo.js";const d=JSON.parse('{"title":"Golang提升效率的小工具","description":"介绍一些可以提升Golang开发效率的小工具，包括gofumpt、goimports、gopls等，帮助开发者更好地编写高质量的Go代码。","frontmatter":{"title":"Golang提升效率的小工具","date":"2024-11-09T11:31:32.000Z","tags":["golang","工具"],"description":"介绍一些可以提升Golang开发效率的小工具，包括gofumpt、goimports、gopls等，帮助开发者更好地编写高质量的Go代码。","author":"PFinal南丞","keywords":"Golang, 工具, 效率, 提升, 小工具, 代码质量, 开发, 编程, 工具, 自动格式化, 自动导入, 代码补全","top":1,"sticky":true},"headers":[],"relativePath":"golang/golang提升效率的小工具.md","filePath":"golang/golang提升效率的小工具.md","lastUpdated":1741950068000}'),l={name:"golang/golang提升效率的小工具.md"};function e(i,a,o,r,c,h){return p(),n("div",{"data-pagefind-body":!0},a[0]||(a[0]=[t(`<h1 id="golang提升效率的小工具" tabindex="-1">Golang提升效率的小工具 <a class="header-anchor" href="#golang提升效率的小工具" aria-label="Permalink to &quot;Golang提升效率的小工具&quot;">​</a></h1><p>年底了,在急速的修复一些老项目的Bug, 更新迭代的次数较多, 由于之前的老项目没有使用 Git 来部署, 还是使用的 原始的 FTP拖追那一套, 由于本地开发使用的是 mac, 每次代码上线需要把更新的代码 打包成 .zip 发给运维, 由于每次发给运维的压缩文件中都有 .DS_Store 文件, 运维每次解压之后还要手动删除,被吐槽了N多次, 然后 每次发送之前都得 <em>ls -a</em> 然后手动删除 .DS_Store 文件有点麻烦, 于是 写了一个小工具, 用来删除 .DS_Store 文件, 提升效率.</p><h4 id="效果如下" tabindex="-1">效果如下 <a class="header-anchor" href="#效果如下" aria-label="Permalink to &quot;效果如下&quot;">​</a></h4><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202401250948067.png" alt=""></p><h4 id="实现思路" tabindex="-1">实现思路 <a class="header-anchor" href="#实现思路" aria-label="Permalink to &quot;实现思路&quot;">​</a></h4><p>实现思路很简单, 就是 变量项目下的所有目录, 找到 .DS_Store 文件, 然后删除</p><div class="language-golang vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">golang</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span></span></span>
<span class="line"><span>type ClearPath struct {</span></span>
<span class="line"><span>	Path string</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func (c *ClearPath) removeAllFilesWithFilename(dirPath, filename string) error {</span></span>
<span class="line"><span>	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {</span></span>
<span class="line"><span>		if err != nil {</span></span>
<span class="line"><span>			return err</span></span>
<span class="line"><span>		}</span></span>
<span class="line"><span>		if !info.IsDir() &amp;&amp; info.Name() == filename {</span></span>
<span class="line"><span>			err := os.Remove(path)</span></span>
<span class="line"><span>			if err != nil {</span></span>
<span class="line"><span>				return err</span></span>
<span class="line"><span>			}</span></span>
<span class="line"><span>			fmt.Println(&quot;Deleted:&quot;, path)</span></span>
<span class="line"><span>		}</span></span>
<span class="line"><span>		return nil</span></span>
<span class="line"><span>	})</span></span>
<span class="line"><span>	return err</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func (c *ClearPath) ClearDotDSStore() {</span></span>
<span class="line"><span>	filename := &quot;.DS_Store&quot;</span></span>
<span class="line"><span>	err := c.removeAllFilesWithFilename(c.Path, filename)</span></span>
<span class="line"><span>	if err != nil {</span></span>
<span class="line"><span>		fmt.Println(&quot;Error:&quot;, err)</span></span>
<span class="line"><span>		return</span></span>
<span class="line"><span>	}</span></span>
<span class="line"><span>}</span></span></code></pre></div><p>使用了 <em>filepath.Walk</em> 来遍历 指定的目录 然后 删除 .DS_Store 文件</p><p>前面也介绍了使用 <em>开发终端小工具</em> 这里就直接集成进去了</p><p>运行<em>cobra-cli add</em>:</p><div class="language-shell vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">shell</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">cobra-cli</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> add</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> pf_cd</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">  # 添加一个 pf_cd 命令进去</span></span></code></pre></div><p>生成指定的 <em>pfCd.go</em> 文件, 然后对文件进行修改:</p><div class="language-golang vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">golang</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>/*</span></span>
<span class="line"><span>Copyright © 2024 NAME HERE &lt;EMAIL ADDRESS&gt;</span></span>
<span class="line"><span>*/</span></span>
<span class="line"><span>package cmd</span></span>
<span class="line"><span></span></span>
<span class="line"><span>import (</span></span>
<span class="line"><span>	&quot;fmt&quot;</span></span>
<span class="line"><span>	&quot;github.com/pfinal/pf_tools/pak&quot;</span></span>
<span class="line"><span>	&quot;github.com/spf13/cobra&quot;</span></span>
<span class="line"><span>	&quot;os&quot;</span></span>
<span class="line"><span>)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>// pfCdCmd represents the pfCd command</span></span>
<span class="line"><span>var pfCdCmd = &amp;cobra.Command{</span></span>
<span class="line"><span>	Use:   &quot;pf_cd&quot;,</span></span>
<span class="line"><span>	Short: &quot;清除目录中的.DS_Store 文件&quot;,</span></span>
<span class="line"><span>	Long:  \`清除mac 目录中生成的.DS_Store 文件\`,</span></span>
<span class="line"><span>	Run: func(cmd *cobra.Command, args []string) {</span></span>
<span class="line"><span>		var path string</span></span>
<span class="line"><span>		if len(args) &gt; 0 {</span></span>
<span class="line"><span>			path = args[0]</span></span>
<span class="line"><span>		} else {</span></span>
<span class="line"><span>			path, _ = os.Getwd()</span></span>
<span class="line"><span>		}</span></span>
<span class="line"><span>		fmt.Printf(&quot;清除目录的.DS_Store 文件: %s\\n&quot;, path)</span></span>
<span class="line"><span>		clearPath := pak.ClearPath{Path: path}</span></span>
<span class="line"><span>		clearPath.ClearDotDSStore()</span></span>
<span class="line"><span>	},</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func init() {</span></span>
<span class="line"><span>	rootCmd.AddCommand(pfCdCmd)</span></span>
<span class="line"><span>}</span></span></code></pre></div><p><strong>Run</strong> 的时候判断了一下 是否指定 目录 如果没有指定 则使用当前目录, 这里没有做路径的判断, 需要根据实际情况进行修改</p><p>然后 整完这些以后 就可以运行:</p><div class="language-shell vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">shell</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">go</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> install</span></span></code></pre></div><p>安装到本地愉快的玩耍嘞, 顺带给工具 加上一个 help 的介绍,把 pf_cd 命令也添加到 pf_tools 的help 介绍里面去,如下:</p><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202401251059984.png" alt=""></p><h4 id="最后" tabindex="-1">最后 <a class="header-anchor" href="#最后" aria-label="Permalink to &quot;最后&quot;">​</a></h4><p>这里只是简单的介绍了一下 具体的实现可以查看源码:</p><p><a href="https://github.com/PFinal-tool/pf_tools" target="_blank" rel="noreferrer">https://github.com/PFinal-tool/pf_tools</a></p>`,21)]))}const m=s(l,[["render",e]]);export{d as __pageData,m as default};
