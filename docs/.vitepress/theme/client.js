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

        // 智能重定向规则（基于 GSC 发现的 404 错误）
        const redirectRules = [
          // GSC 发现的 404 错误（7个）
          { from: '/爬虫JS逆向Webpack技巧记录.html', to: '/python/Reverse-Engineering-JS-Webpack-Tips-for-Crawlers' },
          { from: '/%E7%88%AC%E8%99%ABJS%E9%80%86%E5%90%91Webpack%E6%8A%80%E5%B7%A7%E8%AE%B0%E5%BD%95.html', to: '/python/Reverse-Engineering-JS-Webpack-Tips-for-Crawlers' },
          { from: '/categories/工具/', to: '/zh/' },
          { from: '/categories/%E5%B7%A5%E5%85%B7/', to: '/zh/' },
          { from: '/categories/经验/', to: '/zh/' },
          { from: '/categories/%E7%BB%8F%E9%AA%8C/', to: '/zh/' },
          { from: '/categories/golang/index.html', to: '/golang/' },
          { from: '/categories/golang/', to: '/golang/' },
          { from: '/archives/', to: '/zh/' },
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