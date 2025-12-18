<script setup>
import { onMounted } from 'vue'

// 重定向规则（基于 GSC 发现的 404 错误 - 2025-12-17 更新）
const redirectRules = [
  // Wails 教程系列
  { from: '/wails-tutorial-series', to: '/dev/backend/wails-tutorial-series/' },
  
  // Golang RAG 系统文章
  { from: '/golang/Golang实现RAG系统-从OpenAI到向量数据库', to: '/dev/backend/golang/Golang实现RAG系统-从OpenAI到向量数据库' },
  
  // Arc 浏览器文章
  { from: '/工具/Arc 浏览器更符合开发者', to: '/tools/Arc 浏览器更符合开发者' },
  { from: '/工具/Arc浏览器更符合开发者', to: '/tools/Arc 浏览器更符合开发者' },
  
  // ThinkPHP 文章
  { from: '/zh/php/ThinkPHP-20-Years-of-Chinese-Web-Development', to: '/dev/backend/php/ThinkPHP近20年-中国Web开发的时代印记' },
  
  // Golang 文章重定向
  { from: '/golang/Go-CLI-Utility-Development-Practice', to: '/dev/backend/golang/Create Go App CLI 一款快速创建golang项目的工具' },
  { from: '/golang/mastering-go-testing-advanced-techniques', to: '/dev/backend/golang/Go-testing-synctest-深度解析与实战指南' },
  { from: '/golang/high-performance-websockets-go', to: '/dev/backend/golang/' },
  { from: '/golang/Quick-Start-to-MCP-Server-Development-in-VSCode', to: '/dev/backend/golang/VS Code 中 MCP 服务器的开发者快速入门' },
  { from: '/golang/Go-Develop-Terminal-Tools', to: '/dev/backend/golang/Go 开发终端小工具' },
  
  // Tools 文章重定向
  { from: '/Tools/Make-CLI-Tools-Brand-New-with-Golang-and-Color', to: '/tools/让CLI工具焕然一新！用golang与Color库打造多彩命令行体验' },
  { from: '/Tools/Composer-Configuration-File-Explanation', to: '/tools/Composer配置文件说明' },
  
  // 多语言路径重定向
  { from: '/zh/数据库/PostgreSQL-10个鲜为人知的强大功能', to: '/dev/system/database/PostgreSQL-10个鲜为人知的强大功能' },
  { from: '/zh/wails-tutorial-series/', to: '/dev/backend/wails-tutorial-series/' },
  
  // 爬虫文章
  { from: '/爬虫JS逆向Webpack技巧记录', to: '/data/automation/爬虫JS逆向Webpack技巧记录' },
  
  // 分类页重定向
  { from: '/categories/工具', to: '/Tools/' },
  { from: '/categories/经验', to: '/' },
  { from: '/categories/golang', to: '/dev/backend/golang/' },
  { from: '/工具/', to: '/Tools/' },
  { from: '/archives/', to: '/' },
  { from: '/links/', to: '/contact' },
]

onMounted(() => {
  if (typeof window === 'undefined') return
  
  const currentPath = window.location.pathname
  const decodedPath = decodeURIComponent(currentPath)
  
  console.log('[404 Handler] Current path:', currentPath)
  console.log('[404 Handler] Decoded path:', decodedPath)
  
  // 规范化路径（去除尾部斜杠和 .html 后缀）
  const normalizePath = (path) => {
    if (path === '/') return '/'
    return path.replace(/\/$/, '').replace(/\.html?$/, '')
  }
  
  // 检查精确匹配
  for (const rule of redirectRules) {
    const normalizedCurrent = normalizePath(currentPath)
    const normalizedDecoded = normalizePath(decodedPath)
    const normalizedFrom = normalizePath(rule.from)
    
    if (normalizedCurrent === normalizedFrom || 
        normalizedDecoded === normalizedFrom ||
        currentPath.startsWith(rule.from) ||
        decodedPath.startsWith(rule.from)) {
      console.log('[404 Handler] Match found! Redirecting to:', rule.to)
      window.location.replace(rule.to)
      return
    }
  }
  
  // 通用模式匹配
  // 处理 /golang/xxx 格式
  if (currentPath.startsWith('/golang/') || decodedPath.startsWith('/golang/')) {
    console.log('[404 Handler] Golang path, redirect to golang index')
    window.location.replace('/dev/backend/golang/')
    return
  }
  
  // 处理 /zh/xxx 格式
  if (currentPath.startsWith('/zh/') || decodedPath.startsWith('/zh/')) {
    const newPath = decodedPath.replace(/^\/zh/, '') || '/'
    console.log('[404 Handler] Removing /zh/ prefix, redirect to:', newPath)
    window.location.replace(newPath)
    return
  }
  
  // 处理 /categories/xxx 格式
  if (currentPath.startsWith('/categories/') || decodedPath.startsWith('/categories/')) {
    console.log('[404 Handler] Categories path, redirect to home')
    window.location.replace('/')
    return
  }
  
  // 处理 /工具/xxx 格式
  if (currentPath.startsWith('/工具/') || decodedPath.startsWith('/工具/')) {
    console.log('[404 Handler] 工具 path, redirect to Tools')
    window.location.replace('/Tools/')
    return
  }
  
  // 处理 .html 后缀
  if (currentPath.endsWith('.html')) {
    const cleanPath = currentPath.replace(/\.html$/, '')
    console.log('[404 Handler] HTML suffix, redirect to clean URL:', cleanPath)
    window.location.replace(cleanPath)
    return
  }
  
  console.log('[404 Handler] No redirect rule found')
})
</script>

<template>
  <div class="not-found-wrapper">
    <p class="code">404</p>
    <h1 class="title">页面未找到</h1>
    <div class="divider" />
    <blockquote class="quote">
      正在检查是否可以为您重定向到正确的页面...
    </blockquote>
    <div class="action">
      <a class="link" href="/">返回首页</a>
    </div>
  </div>
</template>

<style scoped>
.not-found-wrapper {
  padding: 64px 24px;
  text-align: center;
}

.code {
  font-size: 64px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title {
  font-size: 20px;
  font-weight: 700;
  margin: 12px 0 0;
}

.divider {
  margin: 24px auto 18px;
  width: 64px;
  height: 1px;
  background-color: var(--vp-c-divider);
}

.quote {
  margin: 0 auto;
  max-width: 256px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.action {
  padding-top: 20px;
}

.link {
  display: inline-block;
  border: 1px solid var(--vp-c-brand);
  border-radius: 16px;
  padding: 3px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-brand);
  transition: border-color 0.25s, color 0.25s;
}

.link:hover {
  border-color: var(--vp-c-brand-dark);
  color: var(--vp-c-brand-dark);
}
</style>
