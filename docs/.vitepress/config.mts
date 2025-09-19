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
    ['script', {}, `(function(d,z,s){s.src='https://'+d+'/401/'+z;try{(document.body||document.documentElement).appendChild(s)}catch(e){}})('groleegni.net',9154483,document.createElement('script'))`],
    ['script', {}, `(function(s){s.dataset.zone='9154483',s.src='https://groleegni.net/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))` ],
    ['style', {}, `
      /* 广告框样式 */
      .pfinal-ad-container {
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        background-image: linear-gradient(to right, #f6d365 0%, #fda085 100%);
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
        z-index: 9999;
        text-align: center;
        padding: 10px 0;
      }
      .pfinal-ad-iframe {
        border: none;
        width: 100%;
        max-width: 728px;
        height: 90px;
        margin: 0 auto;
        display: block;
      }
      .pfinal-ad-close-btn {
        position: absolute;
        top: 5px;
        right: 5px;
        background: transparent;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #666;
      }
      @media (max-width: 768px) {
        .pfinal-ad-iframe {
          max-width: 100%;
          height: 60px;
        }
      }
    `],
    ['script', {}, `
      // 添加广告框函数
      function pfinalAddAdBanner() {
        try {
          // 检查cookie，如果用户已关闭广告，则不显示
          if (document.cookie.indexOf('pfinalAdClosed=true') !== -1) {
            return;
          }
          
          // 检查是否已存在广告框
          if (document.getElementById('pfinal-ad-container')) {
            return;
          }
          
          // 创建广告容器
          const adContainer = document.createElement('div');
          adContainer.id = 'pfinal-ad-container';
          adContainer.className = 'pfinal-ad-container';
          
          // 创建iframe元素
          const adFrame = document.createElement('iframe');
          adFrame.src = 'https://otieu.com/4/9894528';
          adFrame.className = 'pfinal-ad-iframe';
          
          // 创建关闭按钮
          const closeButton = document.createElement('button');
          closeButton.innerHTML = '×';
          closeButton.className = 'pfinal-ad-close-btn';
          closeButton.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            adContainer.style.display = 'none';
            // 设置cookie，24小时内不再显示
            document.cookie = 'pfinalAdClosed=true; max-age=86400; path=/';
          };
          
          // 添加元素到页面
          adContainer.appendChild(adFrame);
          adContainer.appendChild(closeButton);
          document.body.appendChild(adContainer);
        } catch (error) {
          console.error('PFinal ad banner error:', error);
        }
      }

      // 确保在所有页面上都添加广告框
      (function() {
        // 主函数，处理广告框的添加
        function initAdBanner() {
          // 立即尝试添加一次
          pfinalAddAdBanner();
          
          // 监听路由变化
          if (typeof window !== 'undefined') {
            // 监听页面加载完成事件
            window.addEventListener('load', function() {
              setTimeout(pfinalAddAdBanner, 500);
            });
            
            // 监听DOM内容加载完成事件
            document.addEventListener('DOMContentLoaded', function() {
              setTimeout(pfinalAddAdBanner, 500);
            });
            
            // 处理SPA导航
            if (window.history && window.history.pushState) {
              // 保存原始的pushState方法
              const originalPushState = window.history.pushState;
              
              // 重写pushState方法
              window.history.pushState = function() {
                // 调用原始方法
                originalPushState.apply(this, arguments);
                
                // 延迟添加广告框
                setTimeout(pfinalAddAdBanner, 500);
              };
              
              // 监听popstate事件（浏览器前进/后退）
              window.addEventListener('popstate', function() {
                setTimeout(pfinalAddAdBanner, 500);
              });
            }
            
            // 使用MutationObserver监听DOM变化
            if (window.MutationObserver) {
              const observer = new MutationObserver(function(mutations) {
                setTimeout(pfinalAddAdBanner, 500);
              });
              
              // 页面加载完成后开始监听
              window.addEventListener('load', function() {
                if (document.body) {
                  observer.observe(document.body, { 
                    childList: true, 
                    subtree: true 
                  });
                }
              });
            }
          }
        }
        
        // 延迟执行初始化，避免与其他脚本冲突
        setTimeout(initAdBanner, 1000);
      })();
    `]
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
