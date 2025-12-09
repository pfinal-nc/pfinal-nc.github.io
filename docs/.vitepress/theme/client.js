// 客户端增强文件
export default {
  enhanceApp({ app, router }) {
    // 在客户端环境中执行
    if (typeof window !== 'undefined') {
      // 等待 DOM 加载完成
      router.onAfterRouteChanged = (to) => {
        // 延迟执行，确保 DOM 已更新
        setTimeout(() => {
          trackInternalLinks()
          trackSearchEvents()
          trackShareEvents()
        }, 100)
      }
      
      // 页面加载时也执行一次
      if (document.readyState === 'complete') {
        setTimeout(() => {
          trackInternalLinks()
          trackSearchEvents()
          trackShareEvents()
        }, 100)
      } else {
        window.addEventListener('load', () => {
          setTimeout(() => {
            trackInternalLinks()
            trackSearchEvents()
            trackShareEvents()
          }, 100)
        })
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