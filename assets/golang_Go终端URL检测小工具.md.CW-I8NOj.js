import{_ as a,c as n,o as i,a6 as p}from"./chunks/framework.B5rgnJXo.js";const d=JSON.parse('{"title":"Go终端URL检测小工具","description":"详细介绍Go终端URL检测小工具的开发过程，包括功能实现、代码实现、运行命令等方面，帮助开发者快速开发终端命令小工具。","frontmatter":{"title":"Go终端URL检测小工具","date":"2024-03-05T11:46:43.000Z","tags":["golang","工具"],"description":"详细介绍Go终端URL检测小工具的开发过程，包括功能实现、代码实现、运行命令等方面，帮助开发者快速开发终端命令小工具。","author":"PFinal南丞","keywords":"Go, URL检测, 工具, 编程, 终端命令, 开发, 检测, 小工具, 终端命令小工具, Go终端命令小工具","top":1,"sticky":true},"headers":[],"relativePath":"golang/Go终端URL检测小工具.md","filePath":"golang/Go终端URL检测小工具.md","lastUpdated":1741950068000}'),l={name:"golang/Go终端URL检测小工具.md"};function t(e,s,h,o,r,c){return i(),n("div",{"data-pagefind-body":!0},s[0]||(s[0]=[p(`<h1 id="go终端url检测小工具" tabindex="-1">Go终端URL检测小工具 <a class="header-anchor" href="#go终端url检测小工具" aria-label="Permalink to &quot;Go终端URL检测小工具&quot;">​</a></h1><h4 id="背景" tabindex="-1">背景 <a class="header-anchor" href="#背景" aria-label="Permalink to &quot;背景&quot;">​</a></h4><p>前面一直在折腾 Go 开发终端命令小工具,在开发的过程中使用效果还不错。</p><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202312150919993.png" alt=""></p><p>经常使用,被运营小姐姐看到, 然后问说有没有什么小工具,可以检测推广的URL 是否被微信给屏蔽了, 于是接着更新 终端命令小工具, 增加 URL 检测功能。</p><h4 id="效果如图" tabindex="-1">效果如图 <a class="header-anchor" href="#效果如图" aria-label="Permalink to &quot;效果如图&quot;">​</a></h4><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202403050921393.png" alt=""></p><h4 id="运行命令" tabindex="-1">运行命令 <a class="header-anchor" href="#运行命令" aria-label="Permalink to &quot;运行命令&quot;">​</a></h4><div class="language-shell vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">shell</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">pf_tools</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> pf_cwx</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> [urlstring]</span></span></code></pre></div><h4 id="代码实现" tabindex="-1">代码实现 <a class="header-anchor" href="#代码实现" aria-label="Permalink to &quot;代码实现&quot;">​</a></h4><div class="language-golang vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">golang</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>func GetWxUrlInfo(urlString string) {</span></span>
<span class="line"><span>	api := &quot;https://cgi.urlsec.qq.com/index.php?m=url&amp;a=validUrl&amp;url=&quot; + urlString</span></span>
<span class="line"><span>	resp, err := http.Get(api)</span></span>
<span class="line"><span>	if err != nil {</span></span>
<span class="line"><span>		fmt.Println(&quot;请求失败:&quot;, err)</span></span>
<span class="line"><span>		return</span></span>
<span class="line"><span>	}</span></span>
<span class="line"><span>	defer func(Body io.ReadCloser) {</span></span>
<span class="line"><span>		_ = Body.Close()</span></span>
<span class="line"><span>	}(resp.Body)</span></span>
<span class="line"><span></span></span>
<span class="line"><span>	out, _ := io.ReadAll(resp.Body)</span></span>
<span class="line"><span>	if err != nil {</span></span>
<span class="line"><span>		fmt.Println(&quot;读取响应失败:&quot;, err)</span></span>
<span class="line"><span>		return</span></span>
<span class="line"><span>	}</span></span>
<span class="line"><span>	if err := ui.Init(); err != nil {</span></span>
<span class="line"><span>		log.Fatalf(&quot;failed to initialize termui: %v&quot;, err)</span></span>
<span class="line"><span>	}</span></span>
<span class="line"><span>	defer ui.Close()</span></span>
<span class="line"><span>	table := widgets.NewTable()</span></span>
<span class="line"><span>	table.Title = &quot;微信URL安全检测&quot;</span></span>
<span class="line"><span>	// table.BorderStyle = ui.NewStyle(ui.ColorRed)</span></span>
<span class="line"><span>	table.Rows = [][]string{</span></span>
<span class="line"><span>		[]string{&quot;网址&quot;, &quot;检测结果      &quot;},</span></span>
<span class="line"><span>	}</span></span>
<span class="line"><span>	//fmt.Println(string(out))</span></span>
<span class="line"><span>	urlResponse := &amp;WxUrlInfo{}</span></span>
<span class="line"><span>	if err := json.Unmarshal(out, &amp;urlResponse); err != nil {</span></span>
<span class="line"><span>		fmt.Println(&quot;解析json失败:&quot;, err)</span></span>
<span class="line"><span>		return</span></span>
<span class="line"><span>	}</span></span>
<span class="line"><span>	enStr := &quot;网址未被微信屏蔽&quot;</span></span>
<span class="line"><span>	if urlResponse.ReCode == 0 {</span></span>
<span class="line"><span>		enStr = &quot;网址被微信屏蔽&quot;</span></span>
<span class="line"><span>	}</span></span>
<span class="line"><span>	table.Rows = append(table.Rows, []string{urlString, enStr})</span></span>
<span class="line"><span>	table.TextStyle = ui.NewStyle(ui.ColorGreen)</span></span>
<span class="line"><span>	table.TitleStyle = ui.NewStyle(ui.ColorGreen)</span></span>
<span class="line"><span>	table.SetRect(0, 0, 80, 5)</span></span>
<span class="line"><span>	ui.Render(table)</span></span>
<span class="line"><span>	uiEvents := ui.PollEvents()</span></span>
<span class="line"><span>	for {</span></span>
<span class="line"><span>		e := &lt;-uiEvents</span></span>
<span class="line"><span>		switch e.ID {</span></span>
<span class="line"><span>		case &quot;q&quot;:</span></span>
<span class="line"><span>			return</span></span>
<span class="line"><span>		}</span></span>
<span class="line"><span>	}</span></span>
<span class="line"><span>}</span></span></code></pre></div><p>核心 其实就是 使用 golang 调用 <a href="https://cgi.urlsec.qq.com/index.php" target="_blank" rel="noreferrer">https://cgi.urlsec.qq.com/index.php</a> 这个接口 用来检测 是否被 屏蔽, 目前来说 检测效果还不错. 至少满足 小姐姐的需求, 再啰嗦一下, golang 的 <strong>cobra</strong> 确实不错, 值得一试.</p><h4 id="开发过程" tabindex="-1">开发过程 <a class="header-anchor" href="#开发过程" aria-label="Permalink to &quot;开发过程&quot;">​</a></h4><p>因为前面已经,整好了 cobra-cli的环境, 所以在 小工具的开发过程中, 只需要 敲入</p><div class="language-shell vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">shell</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">cobra-cli</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> add</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> pf_cwx_url</span></span></code></pre></div><p>直接会在项目的 cmd 目录中 生成 文件 pfCwxUrl.go,代码如下:</p><div class="language-go vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">go</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">/*</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">Copyright 2024 NAME HERE EMAIL ADDRESS</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">*/</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">package</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> cmd</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">import</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> (</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">	&quot;</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">fmt</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">	&quot;</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">github.com/spf13/cobra</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">// pfTestCmd represents the pfTest command</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">var</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> pfCwxUrlCmd </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> &amp;</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">cobra</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">Command</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">{</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	Use:   </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;pfCwxUrlCmd&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	Short: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;A brief description of your command&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	Long: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">\`A longer description that spans multiple lines and likely contains examples</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">and usage of using your command. For example:</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">Cobra is a CLI library for Go that empowers applications.</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">This application is a tool to generate the needed files</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">to quickly create a Cobra application.\`</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	Run: </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">func</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">cmd</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> *</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">cobra</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">Command</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">args</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> []</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">string</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">		fmt.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">Println</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;pfCwxUrlCmd called&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	},</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">func</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> init</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">() {</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	rootCmd.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">AddCommand</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(pfCwxUrlCmd)</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">	// Here you will define your flags and configuration settings.</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">	// Cobra supports Persistent Flags which will work for this command</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">	// and all subcommands, e.g.:</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">	// pfTestCmd.PersistentFlags().String(&quot;foo&quot;, &quot;&quot;, &quot;A help for foo&quot;)</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">	// Cobra supports local flags which will only run when this command</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">	// is called directly, e.g.:</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">	// pfTestCmd.Flags().BoolP(&quot;toggle&quot;, &quot;t&quot;, false, &quot;Help message for toggle&quot;)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">}</span></span></code></pre></div><p>然后直接修改 代码中的:</p><div class="language-go vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">go</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	Use:   </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;pf_cwx&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	Short: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;微信域名拦截检测&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">	Long:  </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">\`检测域名是否被微信拦截\`</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span></code></pre></div><p>Run 方法下就是 应对的业务逻辑, 我这里的结构是如下:</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>├── LICENSE</span></span>
<span class="line"><span>├── README.md</span></span>
<span class="line"><span>├── cmd</span></span>
<span class="line"><span>│   ├── pfB64.go</span></span>
<span class="line"><span>│   ├── pfCd.go</span></span>
<span class="line"><span>│   ├── pfCwxUrl.go</span></span>
<span class="line"><span>│   ├── pfM.go</span></span>
<span class="line"><span>│   ├── pfMd5.go</span></span>
<span class="line"><span>│   ├── pfS.go</span></span>
<span class="line"><span>│   ├── pfT.go</span></span>
<span class="line"><span>│   ├── pfTest.go</span></span>
<span class="line"><span>│   ├── pfWt.go</span></span>
<span class="line"><span>│   └── root.go</span></span>
<span class="line"><span>├── go.mod</span></span>
<span class="line"><span>├── go.sum</span></span>
<span class="line"><span>├── main.go</span></span>
<span class="line"><span>├── pak</span></span>
<span class="line"><span>│   ├── base64_cry.go</span></span>
<span class="line"><span>│   ├── clear.go</span></span>
<span class="line"><span>│   ├── md5.go</span></span>
<span class="line"><span>│   ├── mobile.go</span></span>
<span class="line"><span>│   ├── phone.dat</span></span>
<span class="line"><span>│   ├── speak.go</span></span>
<span class="line"><span>│   ├── stime.go</span></span>
<span class="line"><span>│   ├── weather.go</span></span>
<span class="line"><span>│   └── wxurl.go</span></span></code></pre></div><p>所有的 业务流程代码是放在 pak 的 所以 Run的代码修改成了下面的:</p><div class="language-golang vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">golang</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span></span></span>
<span class="line"><span>	Run: func(cmd *cobra.Command, args []string) {</span></span>
<span class="line"><span>		if len(args) == 0 {</span></span>
<span class="line"><span>			_ = cmd.Help()</span></span>
<span class="line"><span>			return</span></span>
<span class="line"><span>		}</span></span>
<span class="line"><span>		if pak.CheckUrl(args[0]) == false {</span></span>
<span class="line"><span>			_ = cmd.Help()</span></span>
<span class="line"><span>			return</span></span>
<span class="line"><span>		}</span></span>
<span class="line"><span>		pak.GetWxUrlInfo(args[0])</span></span>
<span class="line"><span>	},</span></span></code></pre></div><p>然后 运行</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>go run main.go pf_cwx https://www.baidu.com</span></span></code></pre></div><p>测试没有问题以后直接</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>go install</span></span></code></pre></div><p>本地就可以用命令来愉快的玩耍了</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>pf_tools pf_cwx &quot;https://www.baidu.com&quot;</span></span></code></pre></div><h3 id="最后-附上-项目地址" tabindex="-1">最后,附上 项目地址: <a class="header-anchor" href="#最后-附上-项目地址" aria-label="Permalink to &quot;最后,附上 项目地址:&quot;">​</a></h3><p><a href="https://github.com/PFinal-tool/pf_tools" target="_blank" rel="noreferrer">https://github.com/PFinal-tool/pf_tools</a></p>`,31)]))}const g=a(l,[["render",t]]);export{d as __pageData,g as default};
