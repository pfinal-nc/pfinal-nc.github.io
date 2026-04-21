import{_ as a,o as n,c as p,ad as i}from"./chunks/framework.BWnoZFAA.js";const k=JSON.parse('{"title":"Prompt Engineering 实战：写出真正有效的 AI 提示词","description":"从零系统讲解 Prompt Engineering 核心技巧：角色设定、思维链、少样本学习、结构化输出、防止幻觉，以及与 GPT/Claude/DeepSeek 配合的最佳实践。","frontmatter":{"title":"Prompt Engineering 实战：写出真正有效的 AI 提示词","date":"2026-04-21T10:00:00.000Z","author":"PFinal南丞","description":"从零系统讲解 Prompt Engineering 核心技巧：角色设定、思维链、少样本学习、结构化输出、防止幻觉，以及与 GPT/Claude/DeepSeek 配合的最佳实践。","keywords":["Prompt Engineering","提示词工程","ChatGPT 提示词","AI 提示词技巧","LLM 优化"],"tags":["ai","prompt","llm","tutorial"],"head":[["link",{"rel":"canonical","href":"https://friday-go.icu/data/automation/prompt-engineering"}],["meta",{"name":"keywords","content":"Prompt Engineering,提示词工程,ChatGPT 提示词,AI 提示词技巧,LLM 优化, PFinalClub, Golang教程, Go后端开发, Go微服务, PHP, Python, 技术博客"}],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"TechArticle\\",\\"headline\\":\\"Prompt Engineering 实战：写出真正有效的 AI 提示词\\",\\"url\\":\\"https://friday-go.icu/data/automation/prompt-engineering\\",\\"datePublished\\":\\"2026-04-21T10:00:00.000Z\\",\\"dateModified\\":1776740017000,\\"author\\":{\\"@type\\":\\"Person\\",\\"name\\":\\"PFinal南丞\\",\\"url\\":\\"https://friday-go.icu/about\\"},\\"publisher\\":{\\"@type\\":\\"Organization\\",\\"name\\":\\"PFinalClub\\",\\"logo\\":{\\"@type\\":\\"ImageObject\\",\\"url\\":\\"https://friday-go.icu/logo.png\\"}},\\"description\\":\\"从零系统讲解 Prompt Engineering 核心技巧：角色设定、思维链、少样本学习、结构化输出、防止幻觉，以及与 GPT/Claude/DeepSeek 配合的最佳实践。\\",\\"inLanguage\\":\\"zh-CN\\",\\"mainEntityOfPage\\":{\\"@type\\":\\"WebPage\\",\\"@id\\":\\"https://friday-go.icu/data/automation/prompt-engineering\\"},\\"keywords\\":[\\"Prompt Engineering\\",\\"提示词工程\\",\\"ChatGPT 提示词\\",\\"AI 提示词技巧\\",\\"LLM 优化\\"]}"],["script",{"type":"application/ld+json"},"{\\"@context\\":\\"https://schema.org\\",\\"@type\\":\\"BreadcrumbList\\",\\"itemListElement\\":[{\\"@type\\":\\"ListItem\\",\\"position\\":1,\\"name\\":\\"首页\\",\\"item\\":{\\"@id\\":\\"https://friday-go.icu\\",\\"@type\\":\\"WebPage\\"}},{\\"@type\\":\\"ListItem\\",\\"position\\":2,\\"name\\":\\"数据与自动化\\",\\"item\\":{\\"@id\\":\\"https://friday-go.icu/data\\",\\"@type\\":\\"WebPage\\"}},{\\"@type\\":\\"ListItem\\",\\"position\\":3,\\"name\\":\\"自动化\\",\\"item\\":{\\"@id\\":\\"https://friday-go.icu/data/automation\\",\\"@type\\":\\"WebPage\\"}},{\\"@type\\":\\"ListItem\\",\\"position\\":4,\\"name\\":\\"Prompt Engineering 实战：写出真正有效的 AI 提示词\\",\\"item\\":{\\"@id\\":\\"https://friday-go.icu/data/automation/prompt-engineering\\",\\"@type\\":\\"Article\\"}}]}"]]},"headers":[],"relativePath":"data/automation/prompt-engineering.md","filePath":"data/automation/prompt-engineering.md","lastUpdated":1776740017000}'),e={name:"data/automation/prompt-engineering.md"};function t(l,s,o,h,r,c){return n(),p("div",{"data-pagefind-body":!0,"data-pagefind-meta":"date:1776765600000"},s[0]||(s[0]=[i(`<h1 id="prompt-engineering-实战-写出真正有效的-ai-提示词" tabindex="-1">Prompt Engineering 实战：写出真正有效的 AI 提示词 <a class="header-anchor" href="#prompt-engineering-实战-写出真正有效的-ai-提示词" aria-label="Permalink to &quot;Prompt Engineering 实战：写出真正有效的 AI 提示词&quot;">​</a></h1><blockquote><p>同样的 AI 模型，不同的提示词可以产生天壤之别的结果。Prompt Engineering 不是玄学，而是有迹可循的工程学。</p></blockquote><h2 id="一、为什么需要-prompt-engineering" tabindex="-1">一、为什么需要 Prompt Engineering？ <a class="header-anchor" href="#一、为什么需要-prompt-engineering" aria-label="Permalink to &quot;一、为什么需要 Prompt Engineering？&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>差的 Prompt：</span></span>
<span class="line"><span>用户：&quot;帮我写一段代码&quot;</span></span>
<span class="line"><span>AI：不知道写什么语言、什么功能、什么风格...</span></span>
<span class="line"><span></span></span>
<span class="line"><span>好的 Prompt：</span></span>
<span class="line"><span>用户：&quot;你是一个资深 Go 后端工程师。帮我用 Go + Gin + GORM 写一个用户注册接口，</span></span>
<span class="line"><span>       要求：参数校验、密码加密存储、返回 JWT Token，代码要有注释。&quot;</span></span>
<span class="line"><span>AI：输出完整、可运行、符合生产标准的代码</span></span></code></pre></div><hr><h2 id="二、核心技巧" tabindex="-1">二、核心技巧 <a class="header-anchor" href="#二、核心技巧" aria-label="Permalink to &quot;二、核心技巧&quot;">​</a></h2><h3 id="_2-1-角色设定-role-prompting" tabindex="-1">2.1 角色设定（Role Prompting） <a class="header-anchor" href="#_2-1-角色设定-role-prompting" aria-label="Permalink to &quot;2.1 角色设定（Role Prompting）&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># 通用模板</span></span>
<span class="line"><span>你是一个[角色]，你具备[专业技能]，你的目标是[目标]。</span></span>
<span class="line"><span></span></span>
<span class="line"><span># 实例</span></span>
<span class="line"><span>你是一位拥有 15 年经验的 Go 后端架构师，精通微服务、分布式系统和性能优化。</span></span>
<span class="line"><span>请用严格的生产级标准审查以下代码，找出潜在的性能问题和安全漏洞。</span></span>
<span class="line"><span></span></span>
<span class="line"><span>你是一位专注于 SEO 的技术博客作者，文章风格：技术准确但通俗易懂，</span></span>
<span class="line"><span>善用代码示例和对比表格。请用 Markdown 格式写一篇关于...的文章。</span></span></code></pre></div><h3 id="_2-2-思维链-chain-of-thought" tabindex="-1">2.2 思维链（Chain of Thought） <a class="header-anchor" href="#_2-2-思维链-chain-of-thought" aria-label="Permalink to &quot;2.2 思维链（Chain of Thought）&quot;">​</a></h3><p>不直接要答案，让 AI 一步步推理：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># 普通问法</span></span>
<span class="line"><span>&quot;这段代码有什么问题？&quot;</span></span>
<span class="line"><span></span></span>
<span class="line"><span># 思维链写法</span></span>
<span class="line"><span>&quot;分析这段代码，请按以下步骤：</span></span>
<span class="line"><span>1. 首先读懂代码的整体功能</span></span>
<span class="line"><span>2. 逐行检查可能的 bug 和安全问题</span></span>
<span class="line"><span>3. 分析性能瓶颈</span></span>
<span class="line"><span>4. 最后给出具体的修复建议和重构后的代码</span></span>
<span class="line"><span></span></span>
<span class="line"><span>代码如下：</span></span>
<span class="line"><span>[代码内容]&quot;</span></span></code></pre></div><h3 id="_2-3-少样本学习-few-shot-learning" tabindex="-1">2.3 少样本学习（Few-Shot Learning） <a class="header-anchor" href="#_2-3-少样本学习-few-shot-learning" aria-label="Permalink to &quot;2.3 少样本学习（Few-Shot Learning）&quot;">​</a></h3><p>给 AI 提供示例，让它学习你期望的格式：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>我需要将 API 错误码映射为中文提示。格式如下：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>输入：404</span></span>
<span class="line"><span>输出：{&quot;code&quot;: 404, &quot;message&quot;: &quot;资源不存在，请检查 URL 是否正确&quot;, &quot;action&quot;: &quot;检查请求路径&quot;}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>输入：401</span></span>
<span class="line"><span>输出：{&quot;code&quot;: 401, &quot;message&quot;: &quot;身份认证失败，请重新登录&quot;, &quot;action&quot;: &quot;清除 Cookie 并重新登录&quot;}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>输入：500</span></span>
<span class="line"><span>输出：{&quot;code&quot;: 500, &quot;message&quot;: &quot;服务器内部错误，请稍后重试&quot;, &quot;action&quot;: &quot;联系技术支持并提供请求 ID&quot;}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>现在请处理：</span></span>
<span class="line"><span>输入：429</span></span>
<span class="line"><span>输出：</span></span></code></pre></div><h3 id="_2-4-结构化输出" tabindex="-1">2.4 结构化输出 <a class="header-anchor" href="#_2-4-结构化输出" aria-label="Permalink to &quot;2.4 结构化输出&quot;">​</a></h3><p>明确指定输出格式，方便程序处理：</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>请分析以下 Go 代码的质量，输出 JSON 格式：</span></span>
<span class="line"><span>{</span></span>
<span class="line"><span>  &quot;score&quot;: 0-100的评分,</span></span>
<span class="line"><span>  &quot;issues&quot;: [</span></span>
<span class="line"><span>    {&quot;type&quot;: &quot;bug|security|performance|style&quot;, &quot;line&quot;: 行号, &quot;description&quot;: &quot;问题描述&quot;, &quot;fix&quot;: &quot;修复建议&quot;}</span></span>
<span class="line"><span>  ],</span></span>
<span class="line"><span>  &quot;summary&quot;: &quot;总体评价&quot;</span></span>
<span class="line"><span>}</span></span>
<span class="line"><span></span></span>
<span class="line"><span>代码：</span></span>
<span class="line"><span>[代码内容]</span></span></code></pre></div><h3 id="_2-5-约束条件" tabindex="-1">2.5 约束条件 <a class="header-anchor" href="#_2-5-约束条件" aria-label="Permalink to &quot;2.5 约束条件&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>写一篇 Go 协程的技术文章，要求：</span></span>
<span class="line"><span>- 字数：1500-2000字</span></span>
<span class="line"><span>- 风格：技术博客，有代码示例</span></span>
<span class="line"><span>- 包含：概念解释、代码示例、常见错误、最佳实践</span></span>
<span class="line"><span>- 不包含：过于基础的 Hello World 内容</span></span>
<span class="line"><span>- 格式：使用 Markdown，包含二级标题</span></span>
<span class="line"><span>- 受众：有一年 Go 经验的开发者</span></span></code></pre></div><hr><h2 id="三、高级技巧" tabindex="-1">三、高级技巧 <a class="header-anchor" href="#三、高级技巧" aria-label="Permalink to &quot;三、高级技巧&quot;">​</a></h2><h3 id="_3-1-react-模式-思考-行动循环" tabindex="-1">3.1 ReAct 模式（思考-行动循环） <a class="header-anchor" href="#_3-1-react-模式-思考-行动循环" aria-label="Permalink to &quot;3.1 ReAct 模式（思考-行动循环）&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>你是一个数据库优化专家。分析用户提出的 SQL 查询慢的问题时，请按照：</span></span>
<span class="line"><span>Thought（分析原因）→ Action（提出方案）→ Observation（预期效果）</span></span>
<span class="line"><span>的格式来回答。</span></span>
<span class="line"><span></span></span>
<span class="line"><span>问题：查询 1000 万条用户订单，每次都要 5 秒以上。</span></span>
<span class="line"><span>查询语句：SELECT * FROM orders WHERE user_id = 123 AND status = &#39;paid&#39; ORDER BY created_at DESC LIMIT 20</span></span></code></pre></div><h3 id="_3-2-迭代优化" tabindex="-1">3.2 迭代优化 <a class="header-anchor" href="#_3-2-迭代优化" aria-label="Permalink to &quot;3.2 迭代优化&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># 第一步：生成初稿</span></span>
<span class="line"><span>写一个 Go 中间件处理接口限流</span></span>
<span class="line"><span></span></span>
<span class="line"><span># 第二步：针对性改进</span></span>
<span class="line"><span>上面的代码很好，但请改进以下方面：</span></span>
<span class="line"><span>1. 支持按 IP + 接口路径组合限流</span></span>
<span class="line"><span>2. 限流时返回剩余等待时间</span></span>
<span class="line"><span>3. 添加 Redis 后端支持分布式限流</span></span>
<span class="line"><span></span></span>
<span class="line"><span># 第三步：代码审查</span></span>
<span class="line"><span>现在作为一个安全专家，审查上面的代码，找出可能的安全漏洞</span></span></code></pre></div><h3 id="_3-3-防止幻觉" tabindex="-1">3.3 防止幻觉 <a class="header-anchor" href="#_3-3-防止幻觉" aria-label="Permalink to &quot;3.3 防止幻觉&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># 技术问题的防幻觉 Prompt</span></span>
<span class="line"><span>回答以下技术问题时，请遵守规则：</span></span>
<span class="line"><span>1. 如果你不确定，明确说&quot;我不确定&quot;，不要猜测</span></span>
<span class="line"><span>2. 涉及版本特定特性时，说明对应的版本号</span></span>
<span class="line"><span>3. 代码必须是可以实际运行的，不要用伪代码代替</span></span>
<span class="line"><span>4. 引用官方文档时，提供文档链接（如果你知道的话）</span></span>
<span class="line"><span></span></span>
<span class="line"><span>问题：Go 1.24 中的 weak 包如何使用？</span></span></code></pre></div><hr><h2 id="四、实战-prompt-模板库" tabindex="-1">四、实战 Prompt 模板库 <a class="header-anchor" href="#四、实战-prompt-模板库" aria-label="Permalink to &quot;四、实战 Prompt 模板库&quot;">​</a></h2><h3 id="代码生成" tabindex="-1">代码生成 <a class="header-anchor" href="#代码生成" aria-label="Permalink to &quot;代码生成&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>你是一个[语言]专家。</span></span>
<span class="line"><span>需求：[功能描述]</span></span>
<span class="line"><span>约束：</span></span>
<span class="line"><span>- 语言/框架版本：[版本]</span></span>
<span class="line"><span>- 性能要求：[要求]</span></span>
<span class="line"><span>- 错误处理：必须处理所有可能的错误</span></span>
<span class="line"><span>- 代码风格：[规范]</span></span>
<span class="line"><span>输出：完整可运行的代码，包含注释</span></span></code></pre></div><h3 id="代码审查" tabindex="-1">代码审查 <a class="header-anchor" href="#代码审查" aria-label="Permalink to &quot;代码审查&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>你是一个资深工程师，请对以下代码进行全面 Code Review：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>重点关注：</span></span>
<span class="line"><span>□ 正确性：逻辑是否正确，有无 bug</span></span>
<span class="line"><span>□ 安全性：有无 SQL 注入、XSS、权限问题</span></span>
<span class="line"><span>□ 性能：有无 N+1 查询、不必要的内存分配</span></span>
<span class="line"><span>□ 可读性：命名是否清晰，代码是否易懂</span></span>
<span class="line"><span>□ 可维护性：是否方便扩展和测试</span></span>
<span class="line"><span></span></span>
<span class="line"><span>代码语言：[语言]</span></span>
<span class="line"><span>代码：</span></span>
<span class="line"><span>\`\`\`[代码]\`\`\`</span></span>
<span class="line"><span></span></span>
<span class="line"><span>输出格式：</span></span>
<span class="line"><span>1. 总体评分（1-10）</span></span>
<span class="line"><span>2. 按严重程度列出问题（严重/警告/建议）</span></span>
<span class="line"><span>3. 改进后的代码</span></span></code></pre></div><h3 id="技术文章写作" tabindex="-1">技术文章写作 <a class="header-anchor" href="#技术文章写作" aria-label="Permalink to &quot;技术文章写作&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>你是一位技术博主，专注于[领域]，文章风格[风格特点]。</span></span>
<span class="line"><span></span></span>
<span class="line"><span>请写一篇关于「[主题]」的技术文章：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>目标读者：[读者画像]</span></span>
<span class="line"><span>文章目标：读完后能[具体收获]</span></span>
<span class="line"><span>字数要求：[字数]</span></span>
<span class="line"><span></span></span>
<span class="line"><span>结构建议：</span></span>
<span class="line"><span>1. 引言：为什么这个主题重要</span></span>
<span class="line"><span>2. 核心概念解释</span></span>
<span class="line"><span>3. 实战示例（含代码）</span></span>
<span class="line"><span>4. 常见错误和避坑指南</span></span>
<span class="line"><span>5. 总结和最佳实践</span></span>
<span class="line"><span></span></span>
<span class="line"><span>格式：Markdown，代码块要指定语言</span></span></code></pre></div><h3 id="sql-数据分析" tabindex="-1">SQL/数据分析 <a class="header-anchor" href="#sql-数据分析" aria-label="Permalink to &quot;SQL/数据分析&quot;">​</a></h3><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>你是一个数据分析师。基于以下表结构，回答问题：</span></span>
<span class="line"><span></span></span>
<span class="line"><span>表结构：</span></span>
<span class="line"><span>users: id, name, email, created_at, country</span></span>
<span class="line"><span>orders: id, user_id, amount, status, created_at</span></span>
<span class="line"><span>products: id, name, category, price</span></span>
<span class="line"><span></span></span>
<span class="line"><span>问题：[分析需求]</span></span>
<span class="line"><span></span></span>
<span class="line"><span>要求：</span></span>
<span class="line"><span>- 输出标准 SQL（兼容 MySQL 8.0）</span></span>
<span class="line"><span>- 考虑查询性能，提示是否需要索引</span></span>
<span class="line"><span>- 对复杂逻辑添加注释</span></span></code></pre></div><hr><h2 id="五、system-prompt-vs-user-prompt" tabindex="-1">五、System Prompt vs User Prompt <a class="header-anchor" href="#五、system-prompt-vs-user-prompt" aria-label="Permalink to &quot;五、System Prompt vs User Prompt&quot;">​</a></h2><div class="language-python vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">python</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># OpenAI API 使用示例</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">import</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> openai</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">client </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> openai.OpenAI(</span><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">api_key</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;your-key&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">response </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> client.chat.completions.create(</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">    model</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;gpt-4o&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">    messages</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        {</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">            &quot;role&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;system&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">            # System Prompt：定义 AI 的身份和行为准则（持久生效）</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">            &quot;content&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;&quot;&quot;你是 PFinalClub 技术博客的智能助手。</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">你的职责：</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">1. 回答技术问题（Go、PHP、Python、DevOps）</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">2. 代码审查和优化建议</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">3. 技术选型建议</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">行为准则：</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">- 回答简洁准确，不废话</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">- 不确定时说不确定，不编造</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">- 代码示例使用最新稳定版本</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">- 中文回答，技术术语保留英文&quot;&quot;&quot;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        },</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        {</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">            &quot;role&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;user&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">            # User Prompt：具体的用户请求</span></span>
<span class="line"><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">            &quot;content&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">: </span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;Go 语言中 channel 和 mutex 分别适合什么场景？&quot;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        }</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    ],</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">    temperature</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0.3</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">,  </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"># 技术问题用较低的温度，更准确</span></span>
<span class="line"><span style="--shiki-light:#E36209;--shiki-dark:#FFAB70;">    max_tokens</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">2000</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">print</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(response.choices[</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">].message.content)</span></span></code></pre></div><hr><h2 id="六、评估-prompt-质量" tabindex="-1">六、评估 Prompt 质量 <a class="header-anchor" href="#六、评估-prompt-质量" aria-label="Permalink to &quot;六、评估 Prompt 质量&quot;">​</a></h2><table tabindex="0"><thead><tr><th>维度</th><th>好的 Prompt</th><th>差的 Prompt</th></tr></thead><tbody><tr><td>角色</td><td>明确角色和专业背景</td><td>无角色</td></tr><tr><td>任务</td><td>具体明确</td><td>模糊宽泛</td></tr><tr><td>约束</td><td>有格式/长度/风格要求</td><td>无约束</td></tr><tr><td>上下文</td><td>提供必要背景</td><td>无背景</td></tr><tr><td>示例</td><td>有输入/输出示例</td><td>无示例</td></tr><tr><td>验证</td><td>可以验证结果是否正确</td><td>无法验证</td></tr></tbody></table><hr><h2 id="总结" tabindex="-1">总结 <a class="header-anchor" href="#总结" aria-label="Permalink to &quot;总结&quot;">​</a></h2><p>Prompt Engineering 的核心是<strong>明确表达你的期望</strong>。掌握这些技巧后：</p><ol><li><strong>角色设定</strong>：给 AI 一个专家身份</li><li><strong>思维链</strong>：让 AI 一步步推理</li><li><strong>结构化输出</strong>：指定格式方便处理</li><li><strong>约束条件</strong>：限定范围避免跑偏</li><li><strong>迭代优化</strong>：多轮对话逐步完善</li></ol><p>最终，好的 Prompt 是<strong>对话设计</strong>，而不仅仅是一个句子。</p><hr><p><em>作者：PFinal南丞 | 更新时间：2026-04-21</em></p>`,50)]))}const g=a(e,[["render",t]]);export{k as __pageData,g as default};
