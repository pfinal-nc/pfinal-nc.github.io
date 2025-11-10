import { defineConfig } from 'vitepress'
import type { Plugin } from 'vite'
import fs from 'fs'
import path from 'path'
// 导入主题的配置
import { blogTheme } from './blog-theme'

// 自定义 Sitemap 插件 - 生成简洁的 sitemap
function simpleSitemapPlugin(): Plugin {
  return {
    name: 'simple-sitemap',
    closeBundle() {
      const outDir = path.resolve(__dirname, '../.vitepress/dist')
      const sitemapPath = path.join(outDir, 'sitemap.xml')
      
      if (fs.existsSync(sitemapPath)) {
        const content = fs.readFileSync(sitemapPath, 'utf-8')
        
        // 将复杂的 sitemap 转换为简洁格式
        const urlRegex = /<url>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<lastmod>(.*?)<\/lastmod>[\s\S]*?<\/url>/g
        const urls: Array<{loc: string, lastmod: string}> = []
        
        let match
        while ((match = urlRegex.exec(content)) !== null) {
          const loc = match[1]
          const lastmod = match[2]
          
          // 跳过 404 页面和其他不需要的页面
          if (!loc.includes('/404.html')) {
            urls.push({ loc, lastmod })
          }
        }
        
        // 生成简洁的 sitemap XML
        const simpleSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `<url>
<loc>${url.loc}</loc>
<lastmod>${url.lastmod}</lastmod>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>`).join('\n')}
</urlset>
`
        
        // 写入新的 sitemap
        fs.writeFileSync(sitemapPath, simpleSitemap, 'utf-8')
        console.log(`✅ Generated simple sitemap with ${urls.length} URLs`)
      }
    }
  }
}

// 全局基础关键词
let BASE_KEYWORDS = 'pfinalclub, git, gitsite, javascript, node, jquery, python, php, laravel, sql, database, linux, operating system, os, cpu, verilog, risc-v, bitcoin, ethereum, ai, 教程, 软件, 编程, 开发, 运维, 云计算, 网络, 互联网, 比特币, 以太坊, 操作系统, 智能合约, 数字货币, 爬虫, 逆向, usd php, wails golang'


export default defineConfig({
  vite: {
    plugins: [simpleSitemapPlugin()]
  },
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
        ]
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
        ]
      }
    }
  },
  sitemap: {
    hostname: 'https://friday-go.icu',
    exclude: [
      // 排除系统文件
      '**/sitemap.xml',
      '**/*.xml',
      '**/favicon.ico',
      // 排除 404 页面
      '**/404.html',
      // 排除标签页面和查询参数页面
      '**/?tag=*',
      '**/?type=*',
      '**/?category=*',
      // 排除子域名相关（如果在主站点构建中）
      '**/pnav.friday-go.icu/**',
      '**/nav.friday-go.icu/**',
      '**/miao.friday-go.icu/**',
      '**/game.friday-go.icu/**'
    ],
    transformItems: (items) => {
      // 过滤掉包含查询参数的 URL 和不应该索引的页面
      const filtered = items.filter(item => {
        const url = item.url
        
        // 排除 404 页面
        if (url.includes('/404.html')) {
          return false
        }
        
        // 排除带查询参数的URL
        if (url.includes('?tag=') || url.includes('?type=') || url.includes('?category=')) {
          return false
        }
        
        // 排除 sitemap.xml 本身
        if (url.endsWith('/sitemap.xml') || url.endsWith('.xml')) {
          return false
        }
        
        return true
      })
      
      return filtered.map(item => ({
        ...item,
        changefreq: 'weekly',
        priority: 0.8,
        lastmod: new Date().toISOString()
      }))
    }
  },
  extends: blogTheme,
  lang: 'en-US',
  title: 'PFinalClub',
  description: 'PFinalClub is a developer community focused on PHP, Golang, Python, microservices, and cloud-native technologies.',
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['link', { rel: 'canonical', href: 'https://friday-go.icu/' }],
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
    ['meta', {name:'360-site-verification', content:'bafd565a2170482bd9ff0c063ba5a41a'}],
    ['meta', {name:'yandex-verification', content:'20badebe204f6b0b'}],
    ['script', {
      src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2154665617309406',
      async: 'true',
      crossorigin: 'anonymous'
    }]
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
    // 判断是否为文章详情页（这里假设详情页没有设置 layout）
  if (!pageData.frontmatter.layout) {
    const articleKeywords = pageData.frontmatter.keywords;
    // 拼接动态关键词
    const newKeywords = articleKeywords 
      ? `${articleKeywords}` 
      : BASE_KEYWORDS;
    // 确保 head 数组存在
    pageData.frontmatter.head = pageData.frontmatter.head || [];
    // 添加或覆盖 meta keywords 标签
    pageData.frontmatter.head.push([
      'meta',
      { name: 'keywords', content: newKeywords }
    ]);
  }
 }, 
})
