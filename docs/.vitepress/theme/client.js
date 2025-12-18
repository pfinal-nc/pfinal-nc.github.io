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
          // ========== 2025-12-17 新增 - Search Console 404 修复 ==========
          // Wails 教程系列
          { from: '/wails-tutorial-series', to: '/dev/backend/wails-tutorial-series/' },
          
          // Golang RAG 系统文章
          { from: '/golang/Golang实现RAG系统-从OpenAI到向量数据库', to: '/dev/backend/golang/Golang实现RAG系统-从OpenAI到向量数据库' },
          { from: '/golang/Golang%E5%AE%9E%E7%8E%B0RAG%E7%B3%BB%E7%BB%9F-%E4%BB%8EOpenAI%E5%88%B0%E5%90%91%E9%87%8F%E6%95%B0%E6%8D%AE%E5%BA%93', to: '/dev/backend/golang/Golang实现RAG系统-从OpenAI到向量数据库' },
          
          // Arc 浏览器文章
          { from: '/工具/Arc 浏览器更符合开发者', to: '/tools/Arc 浏览器更符合开发者' },
          { from: '/%E5%B7%A5%E5%85%B7/Arc%20%E6%B5%8F%E8%A7%88%E5%99%A8%E6%9B%B4%E7%AC%A6%E5%90%88%E5%BC%80%E5%8F%91%E8%80%85', to: '/tools/Arc 浏览器更符合开发者' },
          
          // ThinkPHP 文章
          { from: '/zh/php/ThinkPHP-20-Years-of-Chinese-Web-Development', to: '/dev/backend/php/ThinkPHP近20年-中国Web开发的时代印记' },
          
          // Golang 文章重定向
          { from: '/golang/Go-CLI-Utility-Development-Practice.html', to: '/dev/backend/golang/Create Go App CLI 一款快速创建golang项目的工具' },
          { from: '/golang/Go-CLI-Utility-Development-Practice', to: '/dev/backend/golang/Create Go App CLI 一款快速创建golang项目的工具' },
          { from: '/golang/mastering-go-testing-advanced-techniques', to: '/dev/backend/golang/Go-testing-synctest-深度解析与实战指南' },
          { from: '/golang/high-performance-websockets-go', to: '/dev/backend/golang/' },
          { from: '/golang/Quick-Start-to-MCP-Server-Development-in-VSCode.html', to: '/dev/backend/golang/VS Code 中 MCP 服务器的开发者快速入门' },
          { from: '/golang/Quick-Start-to-MCP-Server-Development-in-VSCode', to: '/dev/backend/golang/VS Code 中 MCP 服务器的开发者快速入门' },
          { from: '/golang/Go-Develop-Terminal-Tools.html', to: '/dev/backend/golang/Go 开发终端小工具' },
          { from: '/golang/Go-Develop-Terminal-Tools', to: '/dev/backend/golang/Go 开发终端小工具' },
          
          // Tools 文章重定向
          { from: '/Tools/Make-CLI-Tools-Brand-New-with-Golang-and-Color', to: '/tools/让CLI工具焕然一新！用golang与Color库打造多彩命令行体验' },
          { from: '/Tools/Composer-Configuration-File-Explanation', to: '/tools/Composer配置文件说明' },
          
          // 多语言路径重定向
          { from: '/zh/数据库/PostgreSQL-10个鲜为人知的强大功能', to: '/dev/system/database/PostgreSQL-10个鲜为人知的强大功能' },
          { from: '/zh/wails-tutorial-series/02-first-app.html', to: '/dev/backend/wails-tutorial-series/02-first-app' },
          { from: '/zh/wails-tutorial-series/00-webkit-and-lifecycle.html', to: '/dev/backend/wails-tutorial-series/00-webkit-and-lifecycle' },
          
          // PHP 文章重定向
          { from: '/php/Laravel-Manual-Build', to: '/dev/backend/php/' },
          
          // ========== 旧规则（保留兼容） ==========
          // 爬虫文章
          { from: '/爬虫JS逆向Webpack技巧记录.html', to: '/data/automation/爬虫JS逆向Webpack技巧记录' },
          { from: '/%E7%88%AC%E8%99%ABJS%E9%80%86%E5%90%91Webpack%E6%8A%80%E5%B7%A7%E8%AE%B0%E5%BD%95.html', to: '/data/automation/爬虫JS逆向Webpack技巧记录' },
          
          // 分类页重定向
          { from: '/categories/工具/', to: '/Tools/' },
          { from: '/categories/%E5%B7%A5%E5%85%B7/', to: '/Tools/' },
          { from: '/categories/经验/', to: '/' },
          { from: '/categories/%E7%BB%8F%E9%AA%8C/', to: '/' },
          { from: '/categories/golang/index.html', to: '/dev/backend/golang/' },
          { from: '/categories/golang/', to: '/dev/backend/golang/' },
          { from: '/工具/', to: '/Tools/' },
          { from: '/%E5%B7%A5%E5%85%B7/', to: '/Tools/' },
          
          // 归档和其他
          { from: '/archives/', to: '/' },
          { from: '/links/', to: '/contact' },
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