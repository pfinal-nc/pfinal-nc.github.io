import { defineConfig } from 'vitepress'

// 导入主题的配置
import { blogTheme } from './blog-theme'

// 全局基础关键词
let BASE_KEYWORDS = 'pfinalclub, git, gitsite, javascript, node, jquery, python, php, laravel, sql, database, linux, operating system, os, cpu, verilog, risc-v, bitcoin, ethereum, ai, 教程, 软件, 编程, 开发, 运维, 云计算, 网络, 互联网, 比特币, 以太坊, 操作系统, 智能合约, 数字货币, 爬虫, 逆向'


export default defineConfig({
  sitemap: {
    hostname:'https://friday-go.icu'
  },
  extends: blogTheme,
  lang: 'zh-cn',
  title: 'PFinalClub',
  description: 'PFinalClub是一个专注于PHP、Golang、Python、微服务、云原生等技术的开发者社区。提供原创技术文章、实战教程、架构设计、性能优化、DevOps等专业内容，助力开发者提升全方位技术能力。',
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'keywords', content: BASE_KEYWORDS }],
    ['meta', { name: 'author', content: 'PFinal南丞' }],
    ['meta', { name: 'robots', content: 'index,follow' }],
    ['meta', { property: 'og:title', content: 'PFinalClub' }],
    ['meta', { property: 'og:description', content: 'PFinalClub是一个专注于PHP、Golang、Python、微服务、云原生等技术的开发者社区。提供原创技术文章、实战教程、架构设计、性能优化、DevOps等专业内容，助力开发者提升全方位技术能力。' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: 'https://friday-go.icu' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'PFinalClub' }],
    ['meta', { name: 'twitter:description', content: 'PFinalClub是一个专注于PHP、Golang、Python、微服务、云原生等技术的开发者社区。提供原创技术文章、实战教程、架构设计、性能优化、DevOps等专业内容，助力开发者提升全方位技术能力。' }],
    ['meta', {name:'360-site-verification', content:'bafd565a2170482bd9ff0c063ba5a41a'}],
    ['meta', {name:'baidu-site-verification', content:'codeva-TJ3TmwLlMS'}],
    ['script', {}, `(function(d,z,s){s.src='https://'+d+'/400/'+z;try{(document.body||document.documentElement).appendChild(s)}catch(e){}})('vemtoutcheeg.com',9114535,document.createElement('script'))`],
    ['script', {}, `(function(d,z,s){s.src='https://'+d+'/401/'+z;try{(document.body||document.documentElement).appendChild(s)}catch(e){}})('groleegni.net',9154483,document.createElement('script'))`],
  ],
  transformPageData(pageData,ctx) {
    // 判断是否为文章详情页（这里假设详情页没有设置 layout）
  if (!pageData.frontmatter.layout) {
    const articleKeywords = pageData.frontmatter.keywords;
    // 拼接动态关键词
    const newKeywords = articleKeywords 
      ? `${articleKeywords},${BASE_KEYWORDS}` 
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
      { text: '关于作者', link: '/about' }
    ],
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/pfinal-nc'
      },
      {
        icon: 'twitter',
        link: 'https://x.com/NPfinal'
      }
    ]
  }
})
