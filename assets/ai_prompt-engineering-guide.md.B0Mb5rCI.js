import{_ as a,o as n,c as p,ad as e}from"./chunks/framework.BWnoZFAA.js";const u=JSON.parse('{"title":"AI 提示词工程实战：从入门到精通","description":"系统讲解 AI 提示词工程的核心技巧，包括零样本、少样本、思维链等高级技术，以及在实际项目中的应用案例。","frontmatter":{"title":"AI 提示词工程实战：从入门到精通","date":"2026-04-24T00:00:00.000Z","category":"ai","tags":["AI","提示词工程","LLM","ChatGPT"],"description":"系统讲解 AI 提示词工程的核心技巧，包括零样本、少样本、思维链等高级技术，以及在实际项目中的应用案例。","head":[["link",{"rel":"canonical","href":"https://friday-go.icu/ai/prompt-engineering-guide"}],["meta",{"name":"keywords","content":"PFinalClub, Golang教程, Go后端开发, Go微服务, PHP, Python, 技术博客"}],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"TechArticle\\",\\"headline\\":\\"AI 提示词工程实战：从入门到精通\\",\\"url\\":\\"https://friday-go.icu/ai/prompt-engineering-guide\\",\\"datePublished\\":\\"2026-04-24T00:00:00.000Z\\",\\"dateModified\\":1777021489000,\\"author\\":{\\"@type\\":\\"Person\\",\\"name\\":\\"PFinal南丞\\",\\"url\\":\\"https://friday-go.icu/about\\"},\\"publisher\\":{\\"@type\\":\\"Organization\\",\\"name\\":\\"PFinalClub\\",\\"logo\\":{\\"@type\\":\\"ImageObject\\",\\"url\\":\\"https://friday-go.icu/logo.png\\"}},\\"description\\":\\"系统讲解 AI 提示词工程的核心技巧，包括零样本、少样本、思维链等高级技术，以及在实际项目中的应用案例。\\",\\"inLanguage\\":\\"zh-CN\\",\\"mainEntityOfPage\\":{\\"@type\\":\\"WebPage\\",\\"@id\\":\\"https://friday-go.icu/ai/prompt-engineering-guide\\"},\\"articleSection\\":\\"ai\\"}"],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"BreadcrumbList\\",\\"itemListElement\\":[{\\"@type\\":\\"ListItem\\",\\"position\\":1,\\"name\\":\\"首页\\",\\"item\\":{\\"@id\\":\\"https://friday-go.icu\\",\\"@type\\":\\"WebPage\\"}},{\\"@type\\":\\"ListItem\\",\\"position\\":2,\\"name\\":\\"ai\\",\\"item\\":{\\"@id\\":\\"https://friday-go.icu/ai\\",\\"@type\\":\\"WebPage\\"}},{\\"@type\\":\\"ListItem\\",\\"position\\":3,\\"name\\":\\"AI 提示词工程实战：从入门到精通\\",\\"item\\":{\\"@id\\":\\"https://friday-go.icu/ai/prompt-engineering-guide\\",\\"@type\\":\\"Article\\"}}]}"]]},"headers":[],"relativePath":"ai/prompt-engineering-guide.md","filePath":"ai/prompt-engineering-guide.md","lastUpdated":1777021489000}'),i={name:"ai/prompt-engineering-guide.md"};function t(l,s,o,c,h,r){return n(),p("div",{"data-pagefind-body":!0,"data-pagefind-meta":"date:1776988800000"},s[0]||(s[0]=[e(`<h1 id="ai-提示词工程实战-从入门到精通" tabindex="-1">AI 提示词工程实战：从入门到精通 <a class="header-anchor" href="#ai-提示词工程实战-从入门到精通" aria-label="Permalink to &quot;AI 提示词工程实战：从入门到精通&quot;">​</a></h1><p>提示词工程（Prompt Engineering）是高效使用大语言模型的核心技能。好的提示词能让 AI 输出质量提升数倍。</p><h2 id="提示词基础结构" tabindex="-1">提示词基础结构 <a class="header-anchor" href="#提示词基础结构" aria-label="Permalink to &quot;提示词基础结构&quot;">​</a></h2><p>一个高质量的提示词通常包含以下元素：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>[角色设定] 你是一位...</span></span>
<span class="line"><span>[背景信息] 当前场景是...</span></span>
<span class="line"><span>[任务描述] 请你...</span></span>
<span class="line"><span>[格式要求] 输出格式为...</span></span>
<span class="line"><span>[示例] 例如：...</span></span>
<span class="line"><span>[约束条件] 注意：...</span></span></code></pre></div><h3 id="示例-代码审查助手" tabindex="-1">示例：代码审查助手 <a class="header-anchor" href="#示例-代码审查助手" aria-label="Permalink to &quot;示例：代码审查助手&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>你是一位资深 Go 后端工程师，专注于代码质量和安全性。</span></span>
<span class="line"><span></span></span>
<span class="line"><span>请审查以下 Go 代码，重点关注：</span></span>
<span class="line"><span>1. 潜在的 bug 和逻辑错误</span></span>
<span class="line"><span>2. 性能问题（内存分配、goroutine 泄漏等）</span></span>
<span class="line"><span>3. 安全漏洞（SQL 注入、XSS 等）</span></span>
<span class="line"><span>4. 代码可维护性</span></span>
<span class="line"><span></span></span>
<span class="line"><span>输出格式：</span></span>
<span class="line"><span>- ## 严重问题（必须修复）→ [问题描述]: [修复建议]</span></span>
<span class="line"><span>- ## 一般建议 → [建议内容]</span></span>
<span class="line"><span>- ## 优点 → [值得保留的好实践]</span></span>
<span class="line"><span></span></span>
<span class="line"><span>代码如下：（在此粘贴 Go 代码）</span></span></code></pre></div><h2 id="核心技术" tabindex="-1">核心技术 <a class="header-anchor" href="#核心技术" aria-label="Permalink to &quot;核心技术&quot;">​</a></h2><h3 id="零样本提示-zero-shot" tabindex="-1">零样本提示（Zero-shot） <a class="header-anchor" href="#零样本提示-zero-shot" aria-label="Permalink to &quot;零样本提示（Zero-shot）&quot;">​</a></h3><p>直接描述任务，不提供示例：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>将以下 JSON 数据转换为 Markdown 表格：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>{&quot;name&quot;: &quot;Alice&quot;, &quot;age&quot;: 30, &quot;city&quot;: &quot;上海&quot;}</span></span>
<span class="line"><span>{&quot;name&quot;: &quot;Bob&quot;, &quot;age&quot;: 25, &quot;city&quot;: &quot;北京&quot;}</span></span></code></pre></div><h3 id="少样本提示-few-shot" tabindex="-1">少样本提示（Few-shot） <a class="header-anchor" href="#少样本提示-few-shot" aria-label="Permalink to &quot;少样本提示（Few-shot）&quot;">​</a></h3><p>提供 2-5 个示例，让模型学习模式：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>将英文技术术语翻译为中文，保持专业性：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>英文：goroutine → 中文：协程</span></span>
<span class="line"><span>英文：middleware → 中文：中间件</span></span>
<span class="line"><span>英文：garbage collection → 中文：垃圾回收</span></span>
<span class="line"><span>英文：channel → 中文：</span></span></code></pre></div><h3 id="思维链提示-chain-of-thought" tabindex="-1">思维链提示（Chain of Thought） <a class="header-anchor" href="#思维链提示-chain-of-thought" aria-label="Permalink to &quot;思维链提示（Chain of Thought）&quot;">​</a></h3><p>要求模型展示推理过程：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>分析这段代码是否有竞态条件，请一步步推理：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>var counter int</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func increment() {</span></span>
<span class="line"><span>    counter++</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func main() {</span></span>
<span class="line"><span>    for i := 0; i &lt; 1000; i++ {</span></span>
<span class="line"><span>        go increment()</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>请分析：</span></span>
<span class="line"><span>1. 并发访问的变量是什么？</span></span>
<span class="line"><span>2. 是否有同步机制？</span></span>
<span class="line"><span>3. 可能出现什么问题？</span></span>
<span class="line"><span>4. 如何修复？</span></span></code></pre></div><h3 id="自我反思提示-self-reflection" tabindex="-1">自我反思提示（Self-reflection） <a class="header-anchor" href="#自我反思提示-self-reflection" aria-label="Permalink to &quot;自我反思提示（Self-reflection）&quot;">​</a></h3><p>让模型检查自己的输出：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>请完成以下任务，然后检查你的答案：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>任务：写一个 Go 函数，安全地从 map 中读取值</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[第一步] 给出你的实现</span></span>
<span class="line"><span>[第二步] 检查：</span></span>
<span class="line"><span>- 是否处理了 key 不存在的情况？</span></span>
<span class="line"><span>- 是否有并发安全问题？</span></span>
<span class="line"><span>- 是否有更简洁的写法？</span></span>
<span class="line"><span>[第三步] 如有问题，给出改进版本</span></span></code></pre></div><h2 id="实际应用场景" tabindex="-1">实际应用场景 <a class="header-anchor" href="#实际应用场景" aria-label="Permalink to &quot;实际应用场景&quot;">​</a></h2><h3 id="代码生成" tabindex="-1">代码生成 <a class="header-anchor" href="#代码生成" aria-label="Permalink to &quot;代码生成&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>## 任务</span></span>
<span class="line"><span>用 Go 实现一个并发安全的缓存，要求：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>## 功能规格</span></span>
<span class="line"><span>- 支持 Set(key, value, ttl) 设置带过期时间的缓存</span></span>
<span class="line"><span>- 支持 Get(key) 获取缓存，返回值和是否存在</span></span>
<span class="line"><span>- 支持 Delete(key) 删除缓存</span></span>
<span class="line"><span>- 自动清理过期条目（后台 goroutine）</span></span>
<span class="line"><span>- 并发安全</span></span>
<span class="line"><span></span></span>
<span class="line"><span>## 技术要求</span></span>
<span class="line"><span>- 使用 sync.RWMutex 实现并发控制</span></span>
<span class="line"><span>- 过期检查使用 time.Time</span></span>
<span class="line"><span>- 提供 Close() 方法优雅停止后台清理</span></span>
<span class="line"><span></span></span>
<span class="line"><span>## 输出要求</span></span>
<span class="line"><span>- 完整可运行的代码</span></span>
<span class="line"><span>- 关键逻辑注释</span></span>
<span class="line"><span>- 简单的使用示例</span></span></code></pre></div><h3 id="文档生成" tabindex="-1">文档生成 <a class="header-anchor" href="#文档生成" aria-label="Permalink to &quot;文档生成&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>为以下 Go 函数生成 godoc 风格的注释：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>func (c *Cache) Set(key string, value interface{}, ttl time.Duration) {</span></span>
<span class="line"><span>    c.mu.Lock()</span></span>
<span class="line"><span>    defer c.mu.Unlock()</span></span>
<span class="line"><span>    c.items[key] = &amp;item{</span></span>
<span class="line"><span>        value:     value,</span></span>
<span class="line"><span>        expiresAt: time.Now().Add(ttl),</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>要求：</span></span>
<span class="line"><span>- 描述函数功能</span></span>
<span class="line"><span>- 说明每个参数的含义</span></span>
<span class="line"><span>- 说明边界条件（如 ttl = 0 时的行为）</span></span>
<span class="line"><span>- 给出使用示例</span></span>
<span class="line"><span>- 格式符合 godoc 规范</span></span></code></pre></div><h3 id="错误排查" tabindex="-1">错误排查 <a class="header-anchor" href="#错误排查" aria-label="Permalink to &quot;错误排查&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>我遇到了以下错误，请帮我排查原因并给出解决方案：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>错误信息：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>panic: runtime error: invalid memory address or nil pointer dereference</span></span>
<span class="line"><span>goroutine 1 [running]:</span></span>
<span class="line"><span>main.main()</span></span>
<span class="line"><span>    /tmp/main.go:15 +0x1d</span></span>
<span class="line"><span></span></span>
<span class="line"><span>代码（第 13-17 行）：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>resp, _ := http.Get(&quot;https://api.example.com/data&quot;)</span></span>
<span class="line"><span>body, _ := io.ReadAll(resp.Body)</span></span>
<span class="line"><span>defer resp.Body.Close()</span></span>
<span class="line"><span></span></span>
<span class="line"><span>请分析：</span></span>
<span class="line"><span>1. 错误的根本原因</span></span>
<span class="line"><span>2. 为什么会出现 nil 指针</span></span>
<span class="line"><span>3. 如何正确处理这段代码</span></span>
<span class="line"><span>4. 如何避免类似问题</span></span></code></pre></div><h3 id="代码重构" tabindex="-1">代码重构 <a class="header-anchor" href="#代码重构" aria-label="Permalink to &quot;代码重构&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>请重构以下代码，使其更符合 Go 最佳实践：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>[粘贴你的代码]</span></span>
<span class="line"><span></span></span>
<span class="line"><span>重构目标：</span></span>
<span class="line"><span>- 提高可读性（合理的变量命名、函数拆分）</span></span>
<span class="line"><span>- 减少嵌套层次</span></span>
<span class="line"><span>- 优化错误处理</span></span>
<span class="line"><span>- 消除重复代码</span></span>
<span class="line"><span>- 添加必要的注释</span></span>
<span class="line"><span></span></span>
<span class="line"><span>要求：</span></span>
<span class="line"><span>- 保持功能不变</span></span>
<span class="line"><span>- 解释每个重构点及其原因</span></span>
<span class="line"><span>- 如有性能改进，请注明</span></span></code></pre></div><h2 id="高级技巧" tabindex="-1">高级技巧 <a class="header-anchor" href="#高级技巧" aria-label="Permalink to &quot;高级技巧&quot;">​</a></h2><h3 id="角色链-role-chaining" tabindex="-1">角色链（Role Chaining） <a class="header-anchor" href="#角色链-role-chaining" aria-label="Permalink to &quot;角色链（Role Chaining）&quot;">​</a></h3><p>用多轮对话模拟专家评审：</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>轮次 1 - 初稿：</span></span>
<span class="line"><span>作为架构师，请设计一个短链接服务的系统架构...</span></span>
<span class="line"><span></span></span>
<span class="line"><span>轮次 2 - 审查：</span></span>
<span class="line"><span>作为安全工程师，请审查上面的架构，重点关注安全漏洞...</span></span>
<span class="line"><span></span></span>
<span class="line"><span>轮次 3 - 优化：</span></span>
<span class="line"><span>综合以上建议，给出最终的优化架构方案...</span></span></code></pre></div><h3 id="结构化输出" tabindex="-1">结构化输出 <a class="header-anchor" href="#结构化输出" aria-label="Permalink to &quot;结构化输出&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>请分析以下代码的质量，以 JSON 格式输出：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>  &quot;overall_score&quot;: 1-10,</span></span>
<span class="line"><span>  &quot;issues&quot;: [</span></span>
<span class="line"><span>    {</span></span>
<span class="line"><span>      &quot;type&quot;: &quot;bug|performance|security|style&quot;,</span></span>
<span class="line"><span>      &quot;severity&quot;: &quot;critical|high|medium|low&quot;,</span></span>
<span class="line"><span>      &quot;line&quot;: 行号,</span></span>
<span class="line"><span>      &quot;description&quot;: &quot;问题描述&quot;,</span></span>
<span class="line"><span>      &quot;fix&quot;: &quot;修复建议&quot;</span></span>
<span class="line"><span>    }</span></span>
<span class="line"><span>  ],</span></span>
<span class="line"><span>  &quot;summary&quot;: &quot;总体评价&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>代码：</span></span>
<span class="line"><span>[你的代码]</span></span></code></pre></div><h3 id="提示词模板化" tabindex="-1">提示词模板化 <a class="header-anchor" href="#提示词模板化" aria-label="Permalink to &quot;提示词模板化&quot;">​</a></h3><div class="language-python vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">python</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># Python 提示词模板示例</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">from</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> string </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">import</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Template</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">CODE_REVIEW_TEMPLATE</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> Template(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;&quot;&quot;</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">\\</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">你是一位资深 $language 工程师。</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">请审查以下代码，关注：$focus_areas</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">输出严重问题（必须修复）和一般建议。&quot;&quot;&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">prompt </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> CODE_REVIEW_TEMPLATE</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.substitute(</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">    language</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;Go&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">    focus_areas</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;并发安全、内存泄漏、错误处理&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">    code</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">my_code,</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span></code></pre></div><h2 id="避坑指南" tabindex="-1">避坑指南 <a class="header-anchor" href="#避坑指南" aria-label="Permalink to &quot;避坑指南&quot;">​</a></h2><h3 id="常见错误" tabindex="-1">常见错误 <a class="header-anchor" href="#常见错误" aria-label="Permalink to &quot;常见错误&quot;">​</a></h3><table tabindex="0"><thead><tr><th>错误</th><th>示例</th><th>改进</th></tr></thead><tbody><tr><td>提示词过于模糊</td><td>&quot;帮我改一下代码&quot;</td><td>&quot;重构这段 Go 代码，提高可读性，拆分超过 50 行的函数&quot;</td></tr><tr><td>没有格式要求</td><td>&quot;分析一下&quot;</td><td>&quot;用 Markdown 列表格式，分别列出优点和缺点&quot;</td></tr><tr><td>缺少上下文</td><td>&quot;这个报错怎么解决&quot;</td><td>&quot;在 Go 1.21 中，使用 goroutine 时遇到以下报错...&quot;</td></tr><tr><td>任务太复杂</td><td>一个提示做所有事</td><td>拆分为多个步骤，分轮次对话</td></tr></tbody></table><h3 id="迭代优化" tabindex="-1">迭代优化 <a class="header-anchor" href="#迭代优化" aria-label="Permalink to &quot;迭代优化&quot;">​</a></h3><p>好的提示词需要迭代：</p><ol><li><strong>初版</strong>：描述基本需求</li><li><strong>测试</strong>：观察输出质量</li><li><strong>补充</strong>：添加缺少的约束</li><li><strong>精炼</strong>：去掉多余信息</li><li><strong>固化</strong>：保存有效模板</li></ol><h2 id="总结" tabindex="-1">总结 <a class="header-anchor" href="#总结" aria-label="Permalink to &quot;总结&quot;">​</a></h2><p>提示词工程的核心原则：</p><ol><li><strong>清晰具体</strong> - 明确说明你要什么</li><li><strong>提供上下文</strong> - 背景信息帮助模型理解场景</li><li><strong>指定格式</strong> - 告诉模型如何组织输出</li><li><strong>少样本示例</strong> - 通过示例展示期望的风格</li><li><strong>迭代优化</strong> - 不断测试和改进</li><li><strong>分解复杂任务</strong> - 复杂问题拆成多步骤</li></ol><blockquote><p>记住：AI 是工具，提示词是接口。掌握提示词工程，你就掌握了与 AI 高效协作的能力。</p></blockquote>`,47)]))}const g=a(i,[["render",t]]);export{u as __pageData,g as default};
