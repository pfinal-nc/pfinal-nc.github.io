import { defineConfig } from 'vitepress'
// 导入主题的配置
import { blogTheme } from './blog-theme'

// 核心品牌关键词（站点级关键词金字塔的顶层）
// 说明：文章页请优先在 frontmatter.keywords 中设置更具体的长尾关键词
let BASE_KEYWORDS = 'PFinalClub, Golang tutorial, Go backend development, Go microservices, PHP, Python, 技术博客, Tech Blog'


export default defineConfig({
  ignoreDeadLinks: true, // 完全禁用死链接检查，允许部署通过
  title: 'PFinalClub',
  description: 'PFinalClub是一个以后端 + DevOps + AI 工程实践为核心的小众高质量技术博客。提供原创技术文章、实战教程、架构设计、性能优化等专业内容，专注于Go、PHP、Python后端开发、容器化部署、CI/CD和AI工程化应用。',
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
      { text: '首页', link: '/' },
      { text: '攻防研究', link: '/security/offensive/' },
      { text: '安全工程', link: '/security/engineering/' },
      { text: '开发与系统', link: '/dev/' },
      { text: '数据与自动化', link: '/data/automation/' },
      { text: '独立开发', link: '/indie/' },
      { text: '思考/方法论', link: '/thinking/method/' },
      { text: '在线工具', link: '/Tools/online-tools' },
      { text: '关于作者', link: '/about' },
      { text: '联系我们', link: '/contact' },
      { text: '隐私政策', link: '/privacy-policy' }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/pfinal-nc' },
      { icon: 'twitter', link: 'https://x.com/NPfinal' }
    ],
    footer: {
      message: '<a href="/about">关于作者</a> | <a href="/contact">联系我们</a> | <a href="/privacy-policy">隐私政策</a>',
      copyright: 'MIT License | PFinalClub'
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

        // 排除旧的英文分类URL路径，避免在sitemap中包含
        if (url.includes('/golang/') ||
            url.includes('/PHP/') ||
            url.includes('/python/') ||
            url.includes('/Tools/') ||
            url.includes('/database/')) {
          return false
        }

        // 排除中文分类的重复内容（因为现在是主要分类）
        if (url.includes('/zh/security/') ||
            url.includes('/zh/dev/') ||
            url.includes('/zh/data/') ||
            url.includes('/zh/thinking/')) {
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
  lang: 'zh-CN',
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
    ['meta', { name: 'keywords', content: 'PFinalClub, 后端开发, DevOps, AI工程实践, Golang教程, PHP开发, Python爬虫, 微服务架构, 容器化部署' }],
    ['meta', { property: 'og:title', content: 'PFinalClub' }],
    ['meta', { property: 'og:description', content: 'PFinalClub是一个以后端 + DevOps + AI 工程实践为核心的小众高质量技术博客。提供原创技术文章、实战教程、架构设计、性能优化等专业内容，专注于Go、PHP、Python后端开发、容器化部署、CI/CD和AI工程化应用。' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: 'https://friday-go.icu' }],
    ['meta', { property: 'og:site_name', content: 'PFinalClub' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'PFinalClub' }],
    ['meta', { name: 'twitter:description', content: 'PFinalClub是一个以后端 + DevOps + AI 工程实践为核心的小众高质量技术博客。提供原创技术文章、实战教程、架构设计、性能优化等专业内容，专注于Go、PHP、Python后端开发、容器化部署、CI/CD和AI工程化应用。' }],
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
      "description": "以后端 + DevOps + AI 工程实践为核心的小众高质量技术博客，专注工程化落地与实战经验分享",
      "inLanguage": "zh-CN",
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
      "description": "以后端 + DevOps + AI 工程实践为核心的技术博客，提供工程化落地与实战经验",
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
      "name": "PFinalClub 技术博客",
      "url": "https://friday-go.icu",
      "description": "专业技术博客，涵盖Golang、PHP、Python、微服务、AI、RAG系统、云原生技术和软件工程最佳实践",
      "inLanguage": "zh-CN",
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
      }
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

    // 判断是否为文章详情页（这里假设详情页没有设置 layout）
    // 注意：主题中心页使用 layout: page，所以要先检查 layout === 'page'
    if (pageData.frontmatter.layout === 'page') {
      // 为主题中心页（Topic Hub）添加 CollectionPage 类型的 Schema.org 结构化数据
      // 检查是否是主题中心页（路径匹配主题目录的 index 页面）
      // 检查是否是工具页面
      if (/^tools\/online-tools\/?$/.test(currentPath)) {
        // 为工具集合页面添加 ItemList 类型的 Schema.org 结构化数据
        const itemList = {
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "PFinalClub 在线工具集合",
          "url": canonicalUrl,
          "description": pageData.frontmatter.description || pageData.description,
          "inLanguage": "zh-CN",
          "numberOfItems": 8,
          "itemListElement": [
            {
              "@type": "SoftwareApplication",
              "name": "密码生成器",
              "url": "https://pwd.friday-go.icu/",
              "applicationCategory": "UtilityApplication",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "CNY"
              }
            },
            {
              "@type": "WebApplication",
              "name": "AI工具导航",
              "url": "https://nav.friday-go.icu/",
              "applicationCategory": "ReferenceApplication"
            },
            {
              "@type": "WebApplication",
              "name": "在线游戏中心",
              "url": "https://game.friday-go.icu/",
              "applicationCategory": "GameApplication"
            },
            {
              "@type": "WebApplication",
              "name": "节日营销日历",
              "url": "https://miao.friday-go.icu/",
              "applicationCategory": "BusinessApplication"
            },
            {
              "@type": "SoftwareApplication",
              "name": "AI Prompts导航",
              "url": "https://pnav.friday-go.icu/",
              "applicationCategory": "ReferenceApplication"
            },
            {
              "@type": "SoftwareApplication",
              "name": "BMI计算器",
              "url": "https://bmicalculator.friday-go.icu/",
              "applicationCategory": "HealthApplication"
            },
            {
              "@type": "SoftwareApplication",
              "name": "WordPress MBTI插件",
              "url": "https://plugin.friday-go.icu/",
              "applicationCategory": "PluginApplication"
            },
            {
              "@type": "WebPage",
              "name": "团队成员",
              "url": "https://member.friday-go.icu/",
              "about": "PFinalClub团队成员介绍"
            }
          ],
          "publisher": {
            "@type": "Organization",
            "name": "PFinalClub",
            "logo": {
              "@type": "ImageObject",
              "url": `${baseUrl}/logo.png`
            }
          }
        };

        if (pageData.frontmatter.keywords) {
          const keywords = Array.isArray(pageData.frontmatter.keywords)
            ? pageData.frontmatter.keywords.join(', ')
            : pageData.frontmatter.keywords;
          (itemList as any).keywords = keywords;
        }

        pageData.frontmatter.head.push([
          'script',
          { type: 'application/ld+json' },
          JSON.stringify(itemList)
        ]);
      }

      const topicHubPatterns = [
        /^security\/engineering\/?$/,
        /^security\/offensive\/?$/,
        /^dev\/systems\/?$/,
        /^data\/automation\/?$/,
        /^thinking\/method\/?$/,
        /^thinking\/notes\/?$/
      ];
      const isTopicHub = topicHubPatterns.some(pattern => pattern.test(currentPath));

      if (isTopicHub && pageData.frontmatter.title) {
        // 确定主题名称（基于路径匹配）
        let topicName = '';
        let topicCategory = '';
        const isZh = currentPath.startsWith('zh/');

        if (/^security\/engineering\/?$/.test(currentPath)) {
          topicName = '安全工程专题';
          topicCategory = '安全工程';
        } else if (/^security\/offensive\/?$/.test(currentPath)) {
          topicName = '攻防研究专题';
          topicCategory = '攻防研究';
        } else if (/^dev\/systems\/?$/.test(currentPath)) {
          topicName = '开发系统专题';
          topicCategory = '开发系统';
        } else if (/^data\/automation\/?$/.test(currentPath)) {
          topicName = '数据自动化专题';
          topicCategory = '数据自动化';
        } else if (/^thinking\/method\/?$/.test(currentPath)) {
          topicName = '思考方法专题';
          topicCategory = '思考方法';
        } else if (/^thinking\/notes\/?$/.test(currentPath)) {
          topicName = '随笔杂谈专题';
          topicCategory = '随笔杂谈';
        }

        if (topicName) {
          const collectionPage = {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": topicName,
            "url": canonicalUrl,
            "description": pageData.frontmatter.description || pageData.description,
            "inLanguage": "zh-CN",
            "about": {
              "@type": "Thing",
              "name": topicCategory
            },
            "mainEntity": {
              "@type": "ItemList",
              "name": `${topicName} - 文章集合`,
              "description": `关于${topicCategory}的文章集合`
            },
            "publisher": {
              "@type": "Organization",
              "name": "PFinalClub",
              "logo": {
                "@type": "ImageObject",
                "url": `${baseUrl}/logo.png`
              }
            }
          };

          if (pageData.frontmatter.keywords) {
            const keywords = Array.isArray(pageData.frontmatter.keywords)
              ? pageData.frontmatter.keywords.join(', ')
              : pageData.frontmatter.keywords;
            (collectionPage as any).keywords = keywords;
          }

          pageData.frontmatter.head.push([
            'script',
            { type: 'application/ld+json' },
            JSON.stringify(collectionPage)
          ]);
        }
      }
    } else if (!pageData.frontmatter.layout) {
      const articleKeywords = pageData.frontmatter.keywords;
      // 只使用文章自定义关键词或核心品牌词
      const coreKeywords = 'PFinalClub, Golang教程, Go后端开发, Go微服务, PHP, Python, 技术博客';
      const newKeywords = articleKeywords
        ? `${articleKeywords}, ${coreKeywords}`
        : coreKeywords;
      // 添加或覆盖 meta keywords 标签
      pageData.frontmatter.head.push([
        'meta',
        { name: 'keywords', content: newKeywords }
      ]);

      // 为文章页面添加 Schema.org Article 结构化数据
      // 即使没有 date，只要有 title 就添加结构化数据（使用 lastUpdated 或当前时间作为 datePublished）
      if (pageData.frontmatter.title) {
        const article = {
          "@context": "https://schema.org",
          "@type": "TechArticle",
          "headline": pageData.frontmatter.title,
          "url": canonicalUrl,
          "datePublished": pageData.frontmatter.date || pageData.lastUpdated || new Date().toISOString(),
          "dateModified": pageData.lastUpdated || pageData.frontmatter.date || new Date().toISOString(),
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
          "inLanguage": "zh-CN",
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": canonicalUrl
          }
        };

        // 添加关键词
        if (articleKeywords) {
          (article as any).keywords = articleKeywords;
        }

        // 添加文章部分/分类
        if (pageData.frontmatter.category) {
          (article as any).articleSection = pageData.frontmatter.category;
        } else if (currentPath.toLowerCase().includes('/security/engineering/')) {
          (article as any).articleSection = '安全工程';
        } else if (currentPath.toLowerCase().includes('/security/offensive/')) {
          (article as any).articleSection = '攻防研究';
        } else if (currentPath.toLowerCase().includes('/dev/systems/')) {
          (article as any).articleSection = '开发系统';
        } else if (currentPath.toLowerCase().includes('/data/automation/')) {
          (article as any).articleSection = '数据自动化';
        } else if (currentPath.toLowerCase().includes('/thinking/method/')) {
          (article as any).articleSection = '思考方法';
        } else if (currentPath.toLowerCase().includes('/thinking/notes/')) {
          (article as any).articleSection = '随笔杂谈';
        }

        // 添加图片（如果有）
        if (pageData.frontmatter.image) {
          (article as any).image = {
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
