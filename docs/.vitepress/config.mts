import { defineConfig } from 'vitepress'
import type { Plugin } from 'vite'
// 导入主题的配置
import { blogTheme } from './blog-theme'

// 全局基础关键词
let BASE_KEYWORDS = 'pfinalclub, git, gitsite, javascript, node, jquery, python, php, laravel, sql, database, linux, operating system, os, cpu, verilog, risc-v, bitcoin, ethereum, ai, 教程, 软件, 编程, 开发, 运维, 云计算, 网络, 互联网, 比特币, 以太坊, 操作系统, 智能合约, 数字货币, 爬虫, 逆向, usd php, wails golang'


export default defineConfig({
  ignoreDeadLinks: true,  // 忽略死链接检查
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
    transformItems: (items) => {
      return items.map(item => ({
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
    ['meta', { name: 'author', content: 'PFinal南丞' }],
    ['meta', { name: 'robots', content: 'index,follow' }],
    ['meta', { property: 'og:title', content: 'PFinalClub' }],
    ['meta', { property: 'og:description', content: 'PFinalClub is a developer community focused on PHP, Golang, Python, microservices, and cloud-native technologies.' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: 'https://friday-go.icu' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'PFinalClub' }],
    ['meta', { name: 'twitter:description', content: 'PFinalClub is a developer community focused on PHP, Golang, Python, microservices, and cloud-native technologies.' }],
    ['meta', {name:'360-site-verification', content:'bafd565a2170482bd9ff0c063ba5a41a'}],
    ['meta', {name:'yandex-verification', content:'20badebe204f6b0b'}],
    ['script', {
      src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2154665617309406',
      async: 'true',
      crossorigin: 'anonymous'
    }],
    ['script', {}, `
      // 添加性能标记以避免 vignette.min.js 错误
      if (typeof performance !== 'undefined' && performance.mark) {
        performance.mark('hints:start');
      }
    `],
    ['script', {}, `(function(d,z,s){s.src='https://'+d+'/401/'+z;try{(document.body||document.documentElement).appendChild(s)}catch(e){}})('groleegni.net',9154483,document.createElement('script'))`],
    ['script', {}, `(function(s){s.dataset.zone='9154483',s.src='https://groleegni.net/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))` ]
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
