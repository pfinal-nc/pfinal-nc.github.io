import { defineConfig } from 'vitepress'
// 导入主题的配置
import { blogTheme } from './blog-theme'

// 核心品牌关键词（避免过度堆砌，保留最核心的品牌和技术栈）
// 注意：现代搜索引擎主要依赖文章内容和 frontmatter 中的精准关键词
let BASE_KEYWORDS = 'PFinalClub, Golang, PHP, Python, 技术博客, Tech Blog'


export default defineConfig({
  ignoreDeadLinks: false,  // 忽略死链接检查
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      title: 'PFinalClub',
      description: 'PFinalClub is a developer community focused on PHP, Golang, Python, microservices, and cloud-native technologies. We provide original tech articles, practical tutorials, architecture design, performance optimization, DevOps, and more to help developers improve their skills.',
      themeConfig: {
        outline: {
          level: [2, 3],
          label: 'Outline'
        },
        returnToTopLabel: 'Back to Top',
        sidebarMenuLabel: 'Related Articles',
        lastUpdatedText: 'Last updated',
        logo: '/logo.png',
        nav: [
          { text: 'Home', link: '/' },
          { text: 'About', link: '/about' },
          { text: 'Contact', link: '/contact' },
          { text: 'Privacy Policy', link: '/privacy-policy' }
        ],
        socialLinks: [
          { icon: 'github', link: 'https://github.com/pfinal-nc' },
          { icon: 'twitter', link: 'https://x.com/NPfinal' }
        ],
        footer: {
          message: '<a href="/about">About</a> | <a href="/contact">Contact</a> | <a href="/privacy-policy">Privacy Policy</a>',
          copyright: 'MIT License | PFinalClub'
        }
      }
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'PFinalClub',
      description: 'PFinalClub是一个专注于PHP、Golang、Python、微服务、云原生等技术的开发者社区。提供原创技术文章、实战教程、架构设计、性能优化、DevOps等专业内容，助力开发者提升全方位技术能力。',
      link: '/zh/',
      themeConfig: {
        outline: {
          level: [2, 3],
          label: '目录'
        },
        returnToTopLabel: '回到顶部',
        sidebarMenuLabel: '相关文章',
        lastUpdatedText: '上次更新于',
        logo: '/logo.png',
        nav: [
          { text: '首页', link: '/zh/' },
          { text: '关于作者', link: '/zh/about' },
          { text: '联系我们', link: '/zh/contact' },
          { text: '隐私政策', link: '/zh/privacy-policy' }
        ],
        socialLinks: [
          { icon: 'github', link: 'https://github.com/pfinal-nc' },
          { icon: 'twitter', link: 'https://x.com/NPfinal' }
        ],
        footer: {
          message: '<a href="/zh/about">关于作者</a> | <a href="/zh/contact">联系我们</a> | <a href="/zh/privacy-policy">隐私政策</a>',
          copyright: 'MIT License | PFinalClub'
        }
      }
    }
  },
  sitemap: {
    hostname: 'https://friday-go.icu',
    transformItems: (items) => {
      // 过滤掉不应该索引的页面
      const filtered = items.filter(item => {
        const url = item.url
        
        // 排除 404 页面 (更严格的匹配)
        if (url.includes('/404') || url.endsWith('/404') || url.includes('friday-go.icu/404')) {
          return false
        }
        
        // 排除 XML 文件（sitemap.xml 本身）
        if (url.endsWith('.xml')) {
          return false
        }
        
        // 排除带查询参数的URL
        if (url.includes('?tag=') || url.includes('?type=') || url.includes('?category=')) {
          return false
        }
        
        // 排除子域名 URL（如果意外包含）
        if (url.includes('nav.friday-go.icu') || 
            url.includes('game.friday-go.icu') || 
            url.includes('miao.friday-go.icu') || 
            url.includes('pnav.friday-go.icu')) {
          return false
        }
        
        return true
      })
      
      // 确保至少有一些 URL
      if (filtered.length === 0) {
        console.warn('⚠️ Warning: Sitemap is empty after filtering!')
      }
      
      return filtered.map(item => ({
        ...item,
        changefreq: 'weekly',
        priority: 0.8,
        // 保留 VitePress 原始的 lastmod（基于 Git 提交时间）
        // 如果没有 lastmod，才使用当前时间
        lastmod: item.lastmod || new Date().toISOString()
      }))
    }
  },
  extends: blogTheme,
  lang: 'en-US',
  title: 'PFinalClub',
  description: 'PFinalClub is a developer community focused on PHP, Golang, Python, microservices, and cloud-native technologies.',
  lastUpdated: true,
  cleanUrls: true, // 移除 .html 后缀，提升 SEO
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    // RSS/Atom/JSON Feeds
    ['link', { rel: 'alternate', type: 'application/rss+xml', title: 'PFinalClub RSS Feed', href: '/feed.xml' }],
    ['link', { rel: 'alternate', type: 'application/atom+xml', title: 'PFinalClub Atom Feed', href: '/feed.atom' }],
    ['link', { rel: 'alternate', type: 'application/json', title: 'PFinalClub JSON Feed', href: '/feed.json' }],
    // canonical 标签在 transformPageData 中动态添加，不在这里设置全局的
    ['meta', { name: 'author', content: 'PFinal南丞' }],
    ['meta', { name: 'robots', content: 'index,follow' }],
    ['meta', { name: 'googlebot', content: 'index,follow' }],
    ['meta', { name: 'keywords', content: 'Golang, Go, PHP, Python, Laravel, Microservices, Cloud Native, Web Development, Programming, Software Engineering' }],
    ['meta', { property: 'og:title', content: 'PFinalClub' }],
    ['meta', { property: 'og:description', content: 'PFinalClub is a developer community focused on PHP, Golang, Python, microservices, and cloud-native technologies.' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: 'https://friday-go.icu' }],
    ['meta', { property: 'og:site_name', content: 'PFinalClub' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'PFinalClub' }],
    ['meta', { name: 'twitter:description', content: 'PFinalClub is a developer community focused on PHP, Golang, Python, microservices, and cloud-native technologies.' }],
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }],
    ['meta', { 'http-equiv': 'Content-Security-Policy', content: "upgrade-insecure-requests" }],
    ['meta', {name:'google-site-verification', content:'K5jxzJ_KXsS0QhsQnBIuKyxt6BGlPD-w1URDWGTWHo8'}],
    ['meta', {name:'360-site-verification', content:'bafd565a2170482bd9ff0c063ba5a41a'}],
    ['meta', {name:'yandex-verification', content:'20badebe204f6b0b'}],
    // Google Analytics 4
    ['script', {
      async: 'true',
      src: 'https://www.googletagmanager.com/gtag/js?id=G-EVR51H8CSN'
    }],
    ['script', {}, `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-EVR51H8CSN');
    `],
    // Google AdSense
    ['script', {
      src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2154665617309406',
      async: 'true',
      crossorigin: 'anonymous'
    }],
    // Schema.org 结构化数据 - WebSite
    ['script', { type: 'application/ld+json' }, JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "PFinalClub",
      "alternateName": "PFinal南丞技术博客",
      "url": "https://friday-go.icu",
      "description": "专注于Golang、PHP、Python、微服务、云原生技术的开发者社区，提供高质量技术文章、实战教程和架构设计经验",
      "inLanguage": ["zh-CN", "en-US"],
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://friday-go.icu/?s={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      },
      "publisher": {
        "@type": "Organization",
        "name": "PFinalClub",
        "url": "https://friday-go.icu",
        "logo": {
          "@type": "ImageObject",
          "url": "https://friday-go.icu/logo.png"
        }
      }
    })],
    // Schema.org 结构化数据 - Organization & Person
    ['script', { type: 'application/ld+json' }, JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "PFinalClub",
      "url": "https://friday-go.icu",
      "logo": "https://friday-go.icu/logo.png",
      "description": "A developer community focused on Golang, PHP, Python, microservices, and cloud-native technologies",
      "founder": {
        "@type": "Person",
        "name": "PFinal南丞",
        "url": "https://friday-go.icu/about",
        "sameAs": [
          "https://github.com/pfinal-nc",
          "https://x.com/NPfinal"
        ]
      },
      "sameAs": [
        "https://github.com/pfinal-nc",
        "https://x.com/NPfinal"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "Technical Support",
        "url": "https://friday-go.icu/contact"
      }
    })],
    // Schema.org 结构化数据 - Blog
    ['script', { type: 'application/ld+json' }, JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Blog",
      "name": "PFinalClub Tech Blog",
      "url": "https://friday-go.icu",
      "description": "Professional technical blog covering Golang, PHP, Python, microservices, AI, RAG systems, cloud-native technologies, and software engineering best practices",
      "inLanguage": ["zh-CN", "en-US"],
      "author": {
        "@type": "Person",
        "name": "PFinal南丞",
        "url": "https://friday-go.icu/about"
      },
      "publisher": {
        "@type": "Organization",
        "name": "PFinalClub",
        "logo": {
          "@type": "ImageObject",
          "url": "https://friday-go.icu/logo.png"
        }
      },
      "blogPost": [
        {
          "@type": "BlogPosting",
          "headline": "Golang 实现 RAG 系统：从 OpenAI API 到向量数据库完整实战",
          "url": "https://friday-go.icu/zh/golang/Golang实现RAG系统-从OpenAI到向量数据库",
          "datePublished": "2025-11-11",
          "author": {
            "@type": "Person",
            "name": "PFinal南丞"
          },
          "keywords": "Golang RAG, RAG系统, 向量数据库, OpenAI API, LLM, AI",
          "articleSection": "Golang",
          "inLanguage": "zh-CN"
        },
        {
          "@type": "BlogPosting",
          "headline": "Advanced Go Concurrency Patterns for Scalable Applications",
          "url": "https://friday-go.icu/golang/advanced-go-concurrency-patterns",
          "datePublished": "2025-08-18",
          "author": {
            "@type": "Person",
            "name": "PFinal南丞"
          },
          "keywords": "Go concurrency, worker pools, fan-in fan-out, scalability",
          "articleSection": "Golang",
          "inLanguage": "en-US"
        }
      ]
    })]
    // ['script', {}, `
    //   // 重写 performance.measure 方法以避免错误
    //   (function() {
    //     if (typeof performance !== 'undefined') {
    //       // 保存原始的 measure 方法
    //       const originalMeasure = performance.measure;
          
    //       // 重写 measure 方法
    //       performance.measure = function(name, startMark, endMark) {
    //         try {
    //           // 如果开始标记不存在，创建一个
    //           if (startMark && !performance.getEntriesByName(startMark, 'mark').length) {
    //             performance.mark(startMark);
    //           }
    //           // 如果结束标记不存在，创建一个
    //           if (endMark && !performance.getEntriesByName(endMark, 'mark').length) {
    //             performance.mark(endMark);
    //           }
    //           // 调用原始方法
    //           return originalMeasure.apply(this, arguments);
    //         } catch (e) {
    //           // 如果仍然出错，静默处理
    //           console.warn('Performance measure error:', e);
    //           return null;
    //         }
    //       };
          
    //       // 预创建常用的性能标记
    //       const commonMarks = [
    //         'hints:start', 'hints:end',
    //         'hidden_iframe:start', 'hidden_iframe:end',
    //         'vignette:start', 'vignette:end',
    //         'ad:start', 'ad:end',
    //         'script:start', 'script:end'
    //       ];
          
    //       commonMarks.forEach(mark => {
    //         if (!performance.getEntriesByName(mark, 'mark').length) {
    //           performance.mark(mark);
    //         }
    //       });
    //     }
    //   })();
    // `],
    // ['script', {}, `
    //   // 延迟执行广告脚本，确保性能标记已设置
    //   setTimeout(function() {
    //     try {
    //       (function(d,z,s){s.src='https://'+d+'/401/'+z;try{(document.body||document.documentElement).appendChild(s)}catch(e){}})('groleegni.net',9154483,document.createElement('script'));
    //     } catch(e) {
    //       console.warn('Ad script error:', e);
    //     }
    //   }, 100);
    // `],
    // ['script', {}, `
    //   // 延迟执行 vignette 脚本
    //   setTimeout(function() {
    //     try {
    //       (function(s){s.dataset.zone='9154483',s.src='https://groleegni.net/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')));
    //     } catch(e) {
    //       console.warn('Vignette script error:', e);
    //     }
    //   }, 200);
    // `]
  ],
  
  transformPageData(pageData, ctx) {
    // 确保 head 数组存在
    pageData.frontmatter.head = pageData.frontmatter.head || [];
    
    const baseUrl = 'https://friday-go.icu';
    
    // 计算当前页面的规范 URL（不带 .html 后缀和 index.html）
    let currentPath = pageData.relativePath
      .replace(/\.md$/, '')
      .replace(/\/index$/, '')
      .replace(/^index$/, '');
    
    // 如果路径为空，说明是根页面
    const canonicalUrl = currentPath 
      ? `${baseUrl}/${currentPath}` 
      : baseUrl;
    
    // 添加 canonical 标签（最重要的 SEO 标签）
    pageData.frontmatter.head.push([
      'link',
      { rel: 'canonical', href: canonicalUrl }
    ]);
    
    // 添加 hreflang 标签支持多语言
    if (currentPath.startsWith('zh/')) {
      // 当前是中文页面
      const enPath = currentPath.replace(/^zh\//, '');
      pageData.frontmatter.head.push(
        ['link', { rel: 'alternate', hreflang: 'zh-CN', href: `${baseUrl}/${currentPath}` }],
        ['link', { rel: 'alternate', hreflang: 'en', href: `${baseUrl}/${enPath}` }],
        ['link', { rel: 'alternate', hreflang: 'x-default', href: `${baseUrl}/${enPath}` }]
      );
    } else {
      // 当前是英文页面
      const zhPath = `zh/${currentPath}`;
      pageData.frontmatter.head.push(
        ['link', { rel: 'alternate', hreflang: 'en', href: `${baseUrl}/${currentPath || ''}` }],
        ['link', { rel: 'alternate', hreflang: 'zh-CN', href: `${baseUrl}/${zhPath}` }],
        ['link', { rel: 'alternate', hreflang: 'x-default', href: `${baseUrl}/${currentPath || ''}` }]
      );
    }
    
    // 判断是否为文章详情页（这里假设详情页没有设置 layout）
    if (!pageData.frontmatter.layout) {
      const articleKeywords = pageData.frontmatter.keywords;
      // 只使用文章自定义关键词或核心品牌词
      const coreKeywords = 'PFinalClub, Golang, PHP, Python, 技术博客, Tech Blog';
      const newKeywords = articleKeywords 
        ? `${articleKeywords}, ${coreKeywords}` 
        : coreKeywords;
      // 添加或覆盖 meta keywords 标签
      pageData.frontmatter.head.push([
        'meta',
        { name: 'keywords', content: newKeywords }
      ]);
      
      // 为文章页面添加 Schema.org Article 结构化数据
      if (pageData.frontmatter.date && pageData.frontmatter.title) {
        const article = {
          "@context": "https://schema.org",
          "@type": "TechArticle",
          "headline": pageData.frontmatter.title,
          "url": canonicalUrl,
          "datePublished": pageData.frontmatter.date,
          "dateModified": pageData.lastUpdated || pageData.frontmatter.date,
          "author": {
            "@type": "Person",
            "name": pageData.frontmatter.author || "PFinal南丞",
            "url": `${baseUrl}/about`
          },
          "publisher": {
            "@type": "Organization",
            "name": "PFinalClub",
            "logo": {
              "@type": "ImageObject",
              "url": `${baseUrl}/logo.png`
            }
          },
          "description": pageData.frontmatter.description || pageData.description,
          "inLanguage": currentPath.startsWith('zh/') ? "zh-CN" : "en-US",
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": canonicalUrl
          }
        };
        
        // 添加关键词
        if (articleKeywords) {
          article.keywords = articleKeywords;
        }
        
        // 添加文章部分/分类
        if (pageData.frontmatter.category) {
          article.articleSection = pageData.frontmatter.category;
        } else if (currentPath.includes('/golang/')) {
          article.articleSection = 'Golang';
        } else if (currentPath.includes('/php/')) {
          article.articleSection = 'PHP';
        } else if (currentPath.includes('/python/')) {
          article.articleSection = 'Python';
        }
        
        // 添加图片（如果有）
        if (pageData.frontmatter.image) {
          article.image = {
            "@type": "ImageObject",
            "url": pageData.frontmatter.image.startsWith('http') 
              ? pageData.frontmatter.image 
              : `${baseUrl}${pageData.frontmatter.image}`
          };
        }
        
        pageData.frontmatter.head.push([
          'script',
          { type: 'application/ld+json' },
          JSON.stringify(article)
        ]);
      }
    }
  }, 
})
