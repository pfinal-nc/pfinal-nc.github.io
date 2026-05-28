// 客户端增强文件
export default {
  enhanceApp({ app, router }) {
    // 在客户端环境中执行
    if (typeof window !== 'undefined') {
      // 404 页面智能重定向（基于 Google Search Console 发现的 404 错误）
      const handle404Redirect = () => {
        // 检查是否是 404 页面
        const is404Page = window.location.pathname === '/404' || 
                          window.location.pathname === '/404.html' ||
                          document.title.includes('404') ||
                          document.body.innerText.includes('PAGE NOT FOUND');
        
        if (!is404Page) return;

        // 智能重定向规则（基于 GSC 发现的 404 错误 - 2025-12-17 更新）
        const redirectRules = [
          { from: '/wails-tutorial-series', to: '/dev/backend/golang/wails/' },
          { from: '/wails-tutorial-series/', to: '/dev/backend/golang/wails/' },
          { from: '/爬虫JS逆向Webpack技巧记录.html', to: '/data/automation/爬虫JS逆向Webpack技巧记录' },
          { from: '/爬虫JS逆向Webpack技巧记录', to: '/data/automation/爬虫JS逆向Webpack技巧记录' },
          { from: '/categories/工具/', to: '/Tools/' },
          { from: '/categories/工具', to: '/Tools/' },
          { from: '/categories/tools/', to: '/Tools/' },
          { from: '/categories/tools', to: '/Tools/' },
          { from: '/工具/', to: '/Tools/' },
          { from: '/工具', to: '/Tools/' },
          { from: '/categories/golang/index.html', to: '/dev/backend/golang/' },
          { from: '/categories/golang/', to: '/dev/backend/golang/' },
          { from: '/categories/golang', to: '/dev/backend/golang/' },
          { from: '/categories/php/', to: '/dev/backend/php/' },
          { from: '/categories/php', to: '/dev/backend/php/' },
          { from: '/categories/python/', to: '/dev/backend/python/' },
          { from: '/categories/python', to: '/dev/backend/python/' },
          { from: '/categories/经验/', to: '/' },
          { from: '/categories/经验', to: '/' },
          { from: '/archives/', to: '/' },
          { from: '/archives', to: '/' },
          { from: '/archive/', to: '/' },
          { from: '/archive', to: '/' },
          { from: '/links/', to: '/contact' },
          { from: '/links', to: '/contact' },
          { from: '/golang/', to: '/dev/backend/golang/' },
          { from: '/golang', to: '/dev/backend/golang/' },
          { from: '/php/', to: '/dev/backend/php/' },
          { from: '/php', to: '/dev/backend/php/' },
          { from: '/python/', to: '/dev/backend/python/' },
          { from: '/python', to: '/dev/backend/python/' },
          { from: '/zh/php/ThinkPHP-20-Years-of-Chinese-Web-Development', to: '/dev/backend/php/ThinkPHP近20年-中国Web开发的时代印记' },
          { from: '/zh/数据库/PostgreSQL-10个鲜为人知的强大功能', to: '/dev/system/database/PostgreSQL-10个鲜为人知的强大功能' },
          { from: '/zh/wails-tutorial-series/02-first-app.html', to: '/dev/backend/golang/wails/02-first-app' },
          { from: '/zh/wails-tutorial-series/00-webkit-and-lifecycle.html', to: '/dev/backend/golang/wails/00-webkit-and-lifecycle' },
          { from: '/php/Laravel-Manual-Build', to: '/dev/backend/php/' },
          { from: '/Tools/Make-CLI-Tools-Brand-New-with-Golang-and-Color', to: '/Tools/让CLI工具焕然一新！用golang与Color库打造多彩命令行体验' },
          { from: '/Tools/Composer-Configuration-File-Explanation', to: '/Tools/Composer配置文件说明' },
          { from: '/工具/Arc 浏览器更符合开发者', to: '/Tools/Arc 浏览器更符合开发者' },
          { from: '/工具/Arc浏览器更符合开发者', to: '/Tools/Arc 浏览器更符合开发者' },
          { from: '/categories/', to: '/' },
          { from: '/category/', to: '/' },
          { from: '/tag/', to: '/' },
          { from: '/tags/', to: '/' },
          { from: '/golang/Golang中国地址生成扩展包', to: '/dev/backend/golang/Golang中国地址生成扩展包' },
          { from: '/golang/go-database-sql', to: '/dev/backend/golang/go-database-sql' },
          { from: '/golang/circuit-breaker-rate-limiting', to: '/dev/backend/golang/circuit-breaker-rate-limiting' },
          { from: '/golang/使用-Go-systray-构建智能系统托盘应用-Wails-v2-集成实战', to: '/dev/backend/golang/wails/使用-Go-systray-构建智能系统托盘应用-Wails-v2-集成实战' },
          { from: '/golang/Go-Terminal-Tool-Advanced', to: '/dev/backend/golang/Go-Terminal-Tool-Advanced' },
          { from: '/golang/go-slice-map', to: '/dev/backend/golang/go-slice-map' },
          { from: '/golang/golang 脱敏扩展包：简化敏感信息处理的利器', to: '/dev/backend/golang/golang 脱敏扩展包：简化敏感信息处理的利器' },
          { from: '/golang/2025年将改变我们软件构建方式的6个Go库', to: '/dev/backend/golang/2025年将改变我们软件构建方式的6个Go库' },
          { from: '/golang/Go 1.26 SIMD编程实战：从入门到高性能优化', to: '/dev/backend/golang/Go 1.26 SIMD编程实战：从入门到高性能优化' },
          { from: '/golang/Go-1.22新特性实战指南-路由升级与循环变量修复', to: '/dev/backend/golang/Go-1.22新特性实战指南-路由升级与循环变量修复' },
          { from: '/golang/用 Go 构建一个类 kubectl 的命令行工具', to: '/dev/backend/golang/用 Go 构建一个类 kubectl 的命令行工具' },
          { from: '/golang/ClickHouse-OLAP-Guide', to: '/dev/backend/golang/ClickHouse-OLAP-Guide' },
          { from: '/golang/VS Code 中 MCP 服务器的开发者快速入门', to: '/dev/backend/golang/VS Code 中 MCP 服务器的开发者快速入门' },
          { from: '/golang/2025年最佳Go技术博客推荐：资深开发者的学习宝库', to: '/dev/backend/golang/2025年最佳Go技术博客推荐：资深开发者的学习宝库' },
          { from: '/golang/go-concurrency-patterns-advanced', to: '/dev/backend/golang/go-concurrency-patterns-advanced' },
          { from: '/golang/go-distributed-tracing', to: '/dev/backend/golang/go-distributed-tracing' },
          { from: '/golang/Go-Channel-Batch-Read', to: '/dev/backend/golang/Go-Channel-Batch-Read' },
          { from: '/golang/go-prometheus-monitoring', to: '/dev/backend/golang/go-prometheus-monitoring' },
          { from: '/golang/Go 开发终端小工具', to: '/dev/backend/golang/Go 开发终端小工具' },
          { from: '/golang/go-testing-guide', to: '/dev/backend/golang/go-testing-guide' },
          { from: '/golang/go-context-guide', to: '/dev/backend/golang/go-context-guide' },
          { from: '/golang/Wails-Vue-Desktop-App', to: '/dev/backend/golang/Wails-Vue-Desktop-App' },
          { from: '/golang/go-middleware-patterns', to: '/dev/backend/golang/go-middleware-patterns' },
          { from: '/golang/提升生产力的 Golang 实用工具推荐让开发更轻松', to: '/dev/backend/golang/提升生产力的 Golang 实用工具推荐让开发更轻松' },
          { from: '/golang/基于Wails的Mac桌面应用开发', to: '/dev/backend/golang/wails/基于Wails的Mac桌面应用开发' },
          { from: '/golang/golang系统库之gopsutil', to: '/dev/backend/golang/golang系统库之gopsutil' },
          { from: '/golang/Go-WASM构建WebAssembly应用的全新尝试', to: '/dev/backend/golang/Go-WASM构建WebAssembly应用的全新尝试' },
          { from: '/golang/go-restful-api-best-practices', to: '/dev/backend/golang/go-restful-api-best-practices' },
          { from: '/golang/基于wails和Tailwindcss的应用开发', to: '/dev/backend/golang/wails/基于wails和Tailwindcss的应用开发' },
          { from: '/golang/加快开发速度的十大必备Go库', to: '/dev/backend/golang/加快开发速度的十大必备Go库' },
          { from: '/golang/go-goroutine-intro', to: '/dev/backend/golang/go-goroutine-intro' },
          { from: '/golang/microservices-architecture', to: '/dev/backend/golang/microservices-architecture' },
          { from: '/golang/使用Go实现服务端事件推送SSE', to: '/dev/backend/golang/使用Go实现服务端事件推送SSE' },
          { from: '/golang/go-error-handling', to: '/dev/backend/golang/go-error-handling' },
          { from: '/golang/大模型边缘部署实战：基于Go语言的轻量级推理引擎', to: '/dev/backend/golang/大模型边缘部署实战：基于Go语言的轻量级推理引擎' },
          { from: '/golang/基于Wails和Vue.js打造跨平台桌面应用', to: '/dev/backend/golang/wails/基于Wails和Vue.js打造跨平台桌面应用' },
          { from: '/golang/ClickHouse实战：从入门到高性能OLAP查询', to: '/dev/backend/golang/ClickHouse实战：从入门到高性能OLAP查询' },
          { from: '/golang/go-1-24-new-features', to: '/dev/backend/golang/go-1-24-new-features' },
          { from: '/golang/Go-SIMD-Programming', to: '/dev/backend/golang/Go-SIMD-Programming' },
          { from: '/golang/grpc-in-go', to: '/dev/backend/golang/grpc-in-go' },
          { from: '/golang/Gomail邮件发送包', to: '/dev/backend/golang/Gomail邮件发送包' },
          { from: '/golang/go:embed 在 Go 开发中的应用与最佳实践', to: '/dev/backend/golang/go:embed 在 Go 开发中的应用与最佳实践' },
          { from: '/golang/2025年更清洁的Go代码：紧凑的错误管理', to: '/dev/backend/golang/2025年更清洁的Go代码：紧凑的错误管理' },
          { from: '/golang/Golang实现RAG系统-从OpenAI到向量数据库', to: '/dev/backend/golang/Golang实现RAG系统-从OpenAI到向量数据库' },
          { from: '/golang/Go-Interface-Parameter-Design', to: '/dev/backend/golang/Go-Interface-Parameter-Design' },
          { from: '/golang/基于Wails的抖音直播工具', to: '/dev/backend/golang/wails/基于Wails的抖音直播工具' },
          { from: '/golang/让CLI工具焕然一新！用golang与Color库打造多彩命令行体验', to: '/dev/backend/golang/让CLI工具焕然一新！用golang与Color库打造多彩命令行体验' },
          { from: '/golang/Go语言开发AI智能体：从Function Calling到Agent框架', to: '/dev/backend/golang/Go语言开发AI智能体：从Function Calling到Agent框架' },
          { from: '/golang/深入理解Go Channel 批量读取与实际应用', to: '/dev/backend/golang/深入理解Go Channel 批量读取与实际应用' },
          { from: '/golang/go-waitgroup-mutex', to: '/dev/backend/golang/go-waitgroup-mutex' },
          { from: '/golang/Wails-Mac-Development', to: '/dev/backend/golang/Wails-Mac-Development' },
          { from: '/golang/Create Go App CLI 一款快速创建golang项目的工具', to: '/dev/backend/golang/Create Go App CLI 一款快速创建golang项目的工具' },
          { from: '/golang/Go 语言的高性能 User-Agent 解析库', to: '/dev/backend/golang/Go 语言的高性能 User-Agent 解析库' },
          { from: '/golang/Go-STW-Truth', to: '/dev/backend/golang/Go-STW-Truth' },
          { from: '/golang/Go 开发IP过滤小脚本', to: '/dev/backend/golang/Go 开发IP过滤小脚本' },
          { from: '/golang/golang提升效率的小工具', to: '/dev/backend/golang/golang提升效率的小工具' },
          { from: '/golang/如何实现 RESTful API 版本控制', to: '/dev/backend/golang/如何实现 RESTful API 版本控制' },
          { from: '/golang/go-jwt-auth', to: '/dev/backend/golang/go-jwt-auth' },
          { from: '/golang/AutoCorrent专有名词大小写扩展包', to: '/dev/backend/golang/AutoCorrent专有名词大小写扩展包' },
          { from: '/golang/Go-Zero-Copy-Reader', to: '/dev/backend/golang/Go-Zero-Copy-Reader' },
          { from: '/golang/golang 实现协程池', to: '/dev/backend/golang/golang 实现协程池' },
          { from: '/golang/Wails-Go-Cache-Performance', to: '/dev/backend/golang/Wails-Go-Cache-Performance' },
          { from: '/golang/Meilisearch：比Elasticsearch更简单的开源搜索引擎', to: '/dev/backend/golang/Meilisearch：比Elasticsearch更简单的开源搜索引擎' },
          { from: '/golang/Speed-Boost-Static-API-with-Go', to: '/dev/backend/golang/Speed-Boost-Static-API-with-Go' },
          { from: '/golang/go-channel-guide', to: '/dev/backend/golang/go-channel-guide' },
          { from: '/golang/RAG落地实战：从0到1构建企业级知识库问答系统', to: '/dev/backend/golang/RAG落地实战：从0到1构建企业级知识库问答系统' },
          { from: '/golang/GitOps实战：从应用部署到全生命周期管理', to: '/dev/backend/golang/GitOps实战：从应用部署到全生命周期管理' },
          { from: '/golang/go-basic-syntax', to: '/dev/backend/golang/go-basic-syntax' },
          { from: '/golang/沃尔玛AI购物、自动化购买决策  的技术原理', to: '/dev/backend/golang/沃尔玛AI购物、自动化购买决策  的技术原理' },
          { from: '/golang/go-performance-optimization', to: '/dev/backend/golang/go-performance-optimization' },
          { from: '/golang/Go-RESTful-API-Versioning', to: '/dev/backend/golang/Go-RESTful-API-Versioning' },
          { from: '/golang/Stop-The-World-其实没停下-Go-GC-的微暂停真相', to: '/dev/backend/golang/Stop-The-World-其实没停下-Go-GC-的微暂停真相' },
          { from: '/golang/gorm-tutorial', to: '/dev/backend/golang/gorm-tutorial' },
          { from: '/golang/提升Wails应用性能：探索Go-Cache的高效内存缓存方案', to: '/dev/backend/golang/wails/提升Wails应用性能：探索Go-Cache的高效内存缓存方案' },
          { from: '/golang/每个-Golang-程序员都需要这个', to: '/dev/backend/golang/每个-Golang-程序员都需要这个' },
          { from: '/golang/go-workspace-modules', to: '/dev/backend/golang/go-workspace-modules' },
          { from: '/golang/go-memory-management-gc', to: '/dev/backend/golang/go-memory-management-gc' },
          { from: '/golang/Go-testing-synctest-深度解析与实战指南', to: '/dev/backend/golang/Go-testing-synctest-深度解析与实战指南' },
          { from: '/golang/Wails-Douyin-Live-Tool', to: '/dev/backend/golang/Wails-Douyin-Live-Tool' },
          { from: '/golang/go-redis-practice', to: '/dev/backend/golang/go-redis-practice' },
          { from: '/golang/Wails-Tailwind-Development', to: '/dev/backend/golang/Wails-Tailwind-Development' },
          { from: '/golang/go-production-logging-healthcheck', to: '/dev/backend/golang/go-production-logging-healthcheck' },
          { from: '/golang/Go 零拷贝读取器实战与原理解析', to: '/dev/backend/golang/Go 零拷贝读取器实战与原理解析' },
          { from: '/golang/GO语言开发终端小工具后续', to: '/dev/backend/golang/GO语言开发终端小工具后续' },
          { from: '/golang/grpc-protobuf-guide', to: '/dev/backend/golang/grpc-protobuf-guide' },
          { from: '/golang/接口参数设计-多场景复用的优雅之道', to: '/dev/backend/golang/接口参数设计-多场景复用的优雅之道' },
          { from: '/golang/runtime.free 打破Go GC性能瓶颈的秘密武器', to: '/dev/backend/golang/runtime.free 打破Go GC性能瓶颈的秘密武器' },
          { from: '/golang/9个没有竞争但需求巨大的微型SaaS理念', to: '/dev/backend/golang/9个没有竞争但需求巨大的微型SaaS理念' },
          { from: '/golang/gin-framework-guide', to: '/dev/backend/golang/gin-framework-guide' },
          { from: '/golang/Go-runtime-free-GC-Optimization', to: '/dev/backend/golang/Go-runtime-free-GC-Optimization' },
          { from: '/golang/go-generics-guide', to: '/dev/backend/golang/go-generics-guide' },
          { from: '/golang/Deep-Dive-Go-Memory-Allocation', to: '/dev/backend/golang/Deep-Dive-Go-Memory-Allocation' },
          { from: '/golang/00-webkit-and-lifecycle', to: '/dev/backend/golang/wails/00-webkit-and-lifecycle' },
          { from: '/golang/04-frontend-development', to: '/dev/backend/golang/wails/04-frontend-development' },
          { from: '/golang/01-installation', to: '/dev/backend/golang/wails/01-installation' },
          { from: '/golang/wails-gonavi-practice', to: '/dev/backend/golang/wails/wails-gonavi-practice' },
          { from: '/golang/02-first-app', to: '/dev/backend/golang/wails/02-first-app' },
          { from: '/golang/README', to: '/dev/backend/golang/wails/README' },
          { from: '/golang/Fyne与Wails深度对比-选择最适合你的Go桌面应用框架', to: '/dev/backend/golang/wails/Fyne与Wails深度对比-选择最适合你的Go桌面应用框架' },
          { from: '/golang/03-core-concepts', to: '/dev/backend/golang/wails/03-core-concepts' },
          { from: '/golang/05-backend-development', to: '/dev/backend/golang/wails/05-backend-development' },
          { from: '/Tools/Composer配置文件说明', to: '/Tools/Composer配置文件说明' },
          { from: '/Tools/服务器进程日志分析：从头皮发麻到AI解救', to: '/Tools/服务器进程日志分析：从头皮发麻到AI解救' },
          { from: '/Tools/程序员必备神器：PF-password密码管理器', to: '/Tools/程序员必备神器：PF-password密码管理器' },
          { from: '/Tools/Arc 浏览器更符合开发者', to: '/Tools/Arc 浏览器更符合开发者' },
          { from: '/Tools/IDE偷懒小工具', to: '/Tools/IDE偷懒小工具' },
          { from: '/Tools/Git高级命令教程', to: '/Tools/Git高级命令教程' },
          { from: '/Tools/单文件代码部署工具', to: '/Tools/单文件代码部署工具' },
          { from: '/Tools/PHPStorm快捷键', to: '/Tools/PHPStorm快捷键' },
          { from: '/Tools/浏览器小技巧', to: '/Tools/浏览器小技巧' },
          { from: '/Tools/Tmux 常用快捷键', to: '/Tools/Tmux 常用快捷键' },
          { from: '/Tools/PF-Password-Manager', to: '/Tools/PF-Password-Manager' },
          { from: '/Tools/开源开发者必备-toilet终端ASCII艺术字工具', to: '/Tools/开源开发者必备-toilet终端ASCII艺术字工具' },
          { from: '/Tools/Nginx配置文件详解', to: '/Tools/Nginx配置文件详解' },
          { from: '/Tools/使用Devslog结构化日志处理', to: '/Tools/使用Devslog结构化日志处理' },
          { from: '/Tools/Docker部署Go项目实践指南', to: '/Tools/Docker部署Go项目实践指南' },
          { from: '/Tools/使用Homebrew Tap发布个人工具', to: '/Tools/使用Homebrew Tap发布个人工具' },
          { from: '/Tools/Git 基本操作', to: '/Tools/Git 基本操作' },
          { from: '/Tools/online-tools', to: '/Tools/online-tools' },
          { from: '/Tools/VSCode快捷键', to: '/Tools/VSCode快捷键' },
          { from: '/Tools/Devslog-Structured-Logging', to: '/Tools/Devslog-Structured-Logging' },
          { from: '/Tools/Docker-Go-Deployment', to: '/Tools/Docker-Go-Deployment' },
          { from: '/Tools/Broot-高效的命令行文件管理器', to: '/Tools/Broot-高效的命令行文件管理器' },
          { from: '/php/Redis-Configuration-Guide', to: '/dev/backend/php/Redis-Configuration-Guide' },
          { from: '/php/PHP配置文件详解', to: '/dev/backend/php/PHP配置文件详解' },
          { from: '/php/PHP $_SESSION 引发的Bug', to: '/dev/backend/php/PHP $_SESSION 引发的Bug' },
          { from: '/php/构建可维护的正则表达式系统-pfinal-regex-center设计与实现', to: '/dev/backend/php/构建可维护的正则表达式系统-pfinal-regex-center设计与实现' },
          { from: '/php/Coze 扩展包 PHP 版本', to: '/dev/backend/php/Coze 扩展包 PHP 版本' },
          { from: '/php/PHP MCP 扩展', to: '/dev/backend/php/PHP MCP 扩展' },
          { from: '/php/Redis基本知识总结', to: '/dev/backend/php/Redis基本知识总结' },
          { from: '/php/PHP的协程池', to: '/dev/backend/php/PHP的协程池' },
          { from: '/php/Laravel 手工构建', to: '/dev/backend/php/Laravel 手工构建' },
          { from: '/php/TCP-IP-HTTP学习', to: '/dev/backend/php/TCP-IP-HTTP学习' },
          { from: '/php/PHP钩子的应用', to: '/dev/backend/php/PHP钩子的应用' },
          { from: '/php/Go协程与PHP-Fibers并发编程对比', to: '/dev/backend/php/Go协程与PHP-Fibers并发编程对比' },
          { from: '/php/PHP旧项目重构实战：从单体到微服务', to: '/dev/backend/php/PHP旧项目重构实战：从单体到微服务' },
          { from: '/php/PHP-Process-Thread-Analysis', to: '/dev/backend/php/PHP-Process-Thread-Analysis' },
          { from: '/php/ThinkPHP近20年-中国Web开发的时代印记', to: '/dev/backend/php/ThinkPHP近20年-中国Web开发的时代印记' },
          { from: '/php/现代PHP开发实战', to: '/dev/backend/php/现代PHP开发实战' },
          { from: '/php/让 Qwen3 和 Deepseek 懂 Function Calling-PHP篇-opt', to: '/dev/backend/php/让 Qwen3 和 Deepseek 懂 Function Calling-PHP篇-opt' },
          { from: '/php/PHP之异步处理', to: '/dev/backend/php/PHP之异步处理' },
          { from: '/php/PHP-FPM配置文件详解', to: '/dev/backend/php/PHP-FPM配置文件详解' },
          { from: '/php/PHP $_SERVER详解', to: '/dev/backend/php/PHP $_SERVER详解' },
          { from: '/php/Laravel-Carbon-Class-Usage', to: '/dev/backend/php/Laravel-Carbon-Class-Usage' },
          { from: '/php/PHP 错误与异常处理', to: '/dev/backend/php/PHP 错误与异常处理' },
          { from: '/php/Laravel-Admin-Special-Routes', to: '/dev/backend/php/Laravel-Admin-Special-Routes' },
          { from: '/php/PHP 大杀器之生成器', to: '/dev/backend/php/PHP 大杀器之生成器' },
          { from: '/php/php-8-4-new-features', to: '/dev/backend/php/php-8-4-new-features' },
          { from: '/php/PHP-8.5-NoDiscard-属性详解', to: '/dev/backend/php/PHP-8.5-NoDiscard-属性详解' },
          { from: '/python/Python-时间序列分析-从基础到实战', to: '/dev/backend/python/Python-时间序列分析-从基础到实战' },
          { from: '/python/Python-Asyncio-Advanced-Patterns', to: '/dev/backend/python/Python-Asyncio-Advanced-Patterns' },
          { from: '/python/Scrapy爬虫框架实战 - 分布式爬虫、反爬虫对策', to: '/dev/backend/python/Scrapy爬虫框架实战 - 分布式爬虫、反爬虫对策' },
          { from: '/python/Python-自然语言处理-NLP实战指南', to: '/dev/backend/python/Python-自然语言处理-NLP实战指南' },
          { from: '/python/Flask轻量级应用构建 - 扩展开发、蓝图设计', to: '/dev/backend/python/Flask轻量级应用构建 - 扩展开发、蓝图设计' },
          { from: '/python/Python-Web爬虫实战-从入门到精通', to: '/dev/backend/python/Python-Web爬虫实战-从入门到精通' },
          { from: '/python/Python-Faker库常用函数', to: '/dev/backend/python/Python-Faker库常用函数' },
          { from: '/python/Python常用网站搜集', to: '/dev/backend/python/Python常用网站搜集' },
          { from: '/python/Python-数据可视化实战-Matplotlib-Seaborn-Plotly完全指南', to: '/dev/backend/python/Python-数据可视化实战-Matplotlib-Seaborn-Plotly完全指南' },
          { from: '/python/python-automation-scripts', to: '/dev/backend/python/python-automation-scripts' },
          { from: '/python/Python-Data-Visualization-Guide', to: '/dev/backend/python/Python-Data-Visualization-Guide' },
          { from: '/python/FastAPI测试与部署-生产环境最佳实践', to: '/dev/backend/python/FastAPI测试与部署-生产环境最佳实践' },
          { from: '/python/Python-数据分析入门-Pandas与NumPy基础', to: '/dev/backend/python/Python-数据分析入门-Pandas与NumPy基础' },
          { from: '/python/Python-机器学习入门-Scikit-learn实战指南', to: '/dev/backend/python/Python-机器学习入门-Scikit-learn实战指南' },
          { from: '/python/Python版本管理神器之pyenv', to: '/dev/backend/python/Python版本管理神器之pyenv' },
          { from: '/python/FastAPI中间件与依赖注入-构建可扩展的API架构', to: '/dev/backend/python/FastAPI中间件与依赖注入-构建可扩展的API架构' },
          { from: '/python/FastAPI现代化Web开发 - 异步开发、自动API文档生成', to: '/dev/backend/python/FastAPI现代化Web开发 - 异步开发、自动API文档生成' },
          { from: '/python/FastAPI-从零开始构建高性能API-快速入门指南', to: '/dev/backend/python/FastAPI-从零开始构建高性能API-快速入门指南' },
          { from: '/python/Python-推荐系统实战-从算法到应用', to: '/dev/backend/python/Python-推荐系统实战-从算法到应用' },
          { from: '/python/Python-深度学习入门-PyTorch实战指南', to: '/dev/backend/python/Python-深度学习入门-PyTorch实战指南' },
          { from: '/python/FastAPI异步编程与性能优化-打造高并发API', to: '/dev/backend/python/FastAPI异步编程与性能优化-打造高并发API' },
          { from: '/python/FastAPI实战案例-从零构建企业级API', to: '/dev/backend/python/FastAPI实战案例-从零构建企业级API' },
          { from: '/python/Python-TensorFlow实战-Keras入门到精通', to: '/dev/backend/python/Python-TensorFlow实战-Keras入门到精通' },
        ];

        const currentPath = window.location.pathname;
        const decodedPath = decodeURIComponent(currentPath);
        
        const normalizePath = (path) => {
          if (path === '/') return '/';
          return path.replace(/\/$/, '');
        };

        // 检查是否需要重定向
        for (const rule of redirectRules) {
          const normalizedCurrent = normalizePath(currentPath);
          const normalizedDecoded = normalizePath(decodedPath);
          const normalizedFrom = normalizePath(rule.from);
          
          if (currentPath === rule.from || 
              decodedPath === rule.from ||
              normalizedCurrent === normalizedFrom ||
              normalizedDecoded === normalizedFrom ||
              currentPath.startsWith(rule.from) ||
              decodedPath.startsWith(rule.from)) {
            console.log('Redirecting from', currentPath, 'to', rule.to);
            setTimeout(() => {
              window.location.replace(rule.to);
            }, 500);
            return;
          }
        }
        
        // ========== 通用路径模式重定向 ==========
        // 处理 /golang/xxx 格式
        if (currentPath.startsWith('/golang/') || decodedPath.startsWith('/golang/')) {
          console.log('Golang path redirect to golang index');
          setTimeout(() => {
            window.location.replace('/dev/backend/golang/');
          }, 500);
          return;
        }
        
        // 处理 /zh/xxx 格式（移除 /zh 前缀）
        if (currentPath.startsWith('/zh/') || decodedPath.startsWith('/zh/')) {
          const newPath = (decodedPath.startsWith('/zh/') ? decodedPath : currentPath).replace(/^\/zh/, '');
          console.log('Removing /zh/ prefix, redirect to', newPath);
          setTimeout(() => {
            window.location.replace(newPath || '/');
          }, 500);
          return;
        }
        
        // 处理 /categories/xxx 格式
        if (currentPath.startsWith('/categories/') || decodedPath.startsWith('/categories/')) {
          console.log('Categories redirect to home');
          setTimeout(() => {
            window.location.replace('/');
          }, 500);
          return;
        }
        
        // 处理 /工具/xxx 格式
        if (currentPath.startsWith('/工具/') || decodedPath.startsWith('/工具/') ||
            currentPath.startsWith('/%E5%B7%A5%E5%85%B7/')) {
          console.log('工具 path redirect to Tools');
          setTimeout(() => {
            window.location.replace('/Tools/');
          }, 500);
          return;
        }
        
        // 处理 .html 后缀
        if (currentPath.endsWith('.html')) {
          const cleanPath = currentPath.replace(/\.html$/, '');
          console.log('HTML suffix redirect to clean URL:', cleanPath);
          setTimeout(() => {
            window.location.replace(cleanPath);
          }, 500);
          return;
        }
      };

      // 隐藏首页标签区域
      const hideHomeTags = () => {
        // 只在首页隐藏标签
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
          const tagCard = document.querySelector('.card.tags');
          if (tagCard) {
            tagCard.style.display = 'none';
            tagCard.style.visibility = 'hidden';
            tagCard.style.height = '0';
            tagCard.style.overflow = 'hidden';
            tagCard.style.margin = '0';
            tagCard.style.padding = '0';
          }
        }
      };

      // 等待 DOM 加载完成
      router.onAfterRouteChanged = (to) => {
        // 先检查 404 重定向
        handle404Redirect();
        
        // 延迟执行，确保 DOM 已更新
        setTimeout(() => {
          hideHomeTags();
          trackInternalLinks()
          trackSearchEvents()
          trackShareEvents()
        }, 100)
        
        // Monetag 广告脚本已在 config.mts head 中加载，无需额外操作
      }

      // 页面加载时也执行一次
      if (document.readyState === 'complete') {
        handle404Redirect();
        setTimeout(() => {
          hideHomeTags();
          trackInternalLinks()
          trackSearchEvents()
          trackShareEvents()
        }, 100)
      } else {
        window.addEventListener('load', () => {
          handle404Redirect();
          setTimeout(() => {
            hideHomeTags();
            trackInternalLinks()
            trackSearchEvents()
            trackShareEvents()
          }, 100)
        })
      }

      // 延迟加载 GA4，不阻塞首屏，提升 LCP/FCP
      function loadDeferredAnalytics() {
        if (window.__deferredAnalyticsLoaded) return
        window.__deferredAnalyticsLoaded = true
        const ga = document.createElement('script')
        ga.async = true
        ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-EVR51H8CSN'
        document.head.appendChild(ga)
        const gaInline = document.createElement('script')
        gaInline.textContent = `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-EVR51H8CSN');`
        document.head.appendChild(gaInline)
      }
      
      // Monetag 广告脚本已在 config.mts head 中动态加载 (zone 9114325)
      // inpage-push 类型不需要手动创建容器，脚本会自动处理
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => loadDeferredAnalytics(), { timeout: 3000 })
      } else {
        window.addEventListener('load', () => setTimeout(loadDeferredAnalytics, 100))
      }
      
      // 使用 MutationObserver 监听 DOM 变化，确保标签区域被隐藏
      if (typeof window !== 'undefined' && window.MutationObserver) {
        const observer = new MutationObserver(() => {
          if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            const tagCard = document.querySelector('.card.tags');
            if (tagCard && tagCard.style.display !== 'none') {
              tagCard.style.display = 'none';
              tagCard.style.visibility = 'hidden';
              tagCard.style.height = '0';
              tagCard.style.overflow = 'hidden';
            }
          }
        });
        
        // 开始观察
        if (document.body) {
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        } else {
          document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, {
              childList: true,
              subtree: true
            });
          });
        }
      }
    }
  }
}

// 追踪内部链接点击
function trackInternalLinks() {
  if (typeof window === 'undefined' || typeof window.gtag === 'undefined') return
  
  // 查找所有内部链接（以 / 开头的链接，排除外部链接和锚点）
  const internalLinks = document.querySelectorAll('article a[href^="/"], .content a[href^="/"], main a[href^="/"]')
  
  internalLinks.forEach(link => {
    // 移除旧的事件监听器（避免重复绑定）
    const newLink = link.cloneNode(true)
    link.parentNode?.replaceChild(newLink, link)
    
    // 添加点击事件监听器
    newLink.addEventListener('click', function(e) {
      const linkText = this.textContent?.trim() || this.getAttribute('aria-label') || 'Unknown'
      const linkUrl = this.href || this.getAttribute('href') || ''
      const sourcePage = window.location.pathname
      
      // 排除锚点链接（以 # 开头）
      if (linkUrl.includes('#')) {
        const baseUrl = linkUrl.split('#')[0]
        if (baseUrl === window.location.href.split('#')[0]) {
          return // 跳过同页面的锚点链接
        }
      }
      
      // 发送 GA4 事件
      window.gtag('event', 'internal_link_click', {
        event_category: 'Navigation',
        event_label: linkText,
        link_text: linkText,
        link_url: linkUrl,
        source_page: sourcePage
      })
    })
  })
}

// 追踪搜索事件（如果网站有搜索功能）
function trackSearchEvents() {
  if (typeof window === 'undefined' || typeof window.gtag === 'undefined') return
  
  // 查找搜索表单
  const searchForms = document.querySelectorAll('form[action*="search"], form[role="search"]')
  
  searchForms.forEach(form => {
    form.addEventListener('submit', function(e) {
      const searchInput = this.querySelector('input[type="search"], input[name*="search"], input[placeholder*="搜索"]')
      if (searchInput) {
        const searchTerm = searchInput.value.trim()
        if (searchTerm) {
          window.gtag('event', 'search', {
            event_category: 'Site Search',
            event_label: searchTerm,
            search_term: searchTerm
          })
        }
      }
    })
  })
}

// 追踪分享事件
function trackShareEvents() {
  if (typeof window === 'undefined' || typeof window.gtag === 'undefined') return
  
  // 追踪 Twitter 分享
  const twitterLinks = document.querySelectorAll('a[href*="twitter.com/intent/tweet"], a[href*="x.com/intent/tweet"]')
  twitterLinks.forEach(link => {
    link.addEventListener('click', function() {
      const articleTitle = document.title || window.location.pathname
      window.gtag('event', 'share', {
        event_category: 'Social',
        event_label: articleTitle,
        share_method: 'twitter',
        article_title: articleTitle,
        article_url: window.location.pathname
      })
    })
  })
  
  // 追踪 GitHub 分享（如果有）
  const githubLinks = document.querySelectorAll('a[href*="github.com"]')
  githubLinks.forEach(link => {
    if (link.getAttribute('href')?.includes('share') || link.textContent?.includes('分享')) {
      link.addEventListener('click', function() {
        const articleTitle = document.title || window.location.pathname
        window.gtag('event', 'share', {
          event_category: 'Social',
          event_label: articleTitle,
          share_method: 'github',
          article_title: articleTitle,
          article_url: window.location.pathname
        })
      })
    }
  })
  
  // 追踪复制链接功能（如果存在）
  const copyButtons = document.querySelectorAll('[data-copy-link], .copy-link, button[aria-label*="复制"]')
  copyButtons.forEach(button => {
    button.addEventListener('click', function() {
      const articleTitle = document.title || window.location.pathname
      window.gtag('event', 'share', {
        event_category: 'Social',
        event_label: articleTitle,
        share_method: 'copy_link',
        article_title: articleTitle,
        article_url: window.location.pathname
      })
    })
  })
}