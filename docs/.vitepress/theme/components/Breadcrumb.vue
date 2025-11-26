<template>
  <nav v-if="breadcrumbs.length > 1" class="breadcrumb" aria-label="Breadcrumb">
    <ol itemscope itemtype="https://schema.org/BreadcrumbList">
      <li 
        v-for="(crumb, index) in breadcrumbs" 
        :key="index"
        itemprop="itemListElement" 
        itemscope 
        itemtype="https://schema.org/ListItem"
      >
        <a 
          v-if="index < breadcrumbs.length - 1" 
          :href="crumb.link"
          itemprop="item"
        >
          <span itemprop="name">{{ crumb.text }}</span>
        </a>
        <span v-else itemprop="name">{{ crumb.text }}</span>
        <meta itemprop="position" :content="String(index + 1)" />
        <span v-if="index < breadcrumbs.length - 1" class="separator">/</span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useData, useRoute } from 'vitepress'

const { page } = useData()
const route = useRoute()

const breadcrumbs = computed(() => {
  const path = route.path
  const parts = path.split('/').filter(Boolean)
  
  // 如果是首页，不显示面包屑
  if (parts.length === 0) {
    return []
  }
  
  const crumbs = [{ text: 'Home', link: '/' }]
  
  let currentPath = ''
  parts.forEach((part, index) => {
    currentPath += '/' + part
    
    // 最后一个是当前页面
    if (index === parts.length - 1) {
      crumbs.push({
        text: page.value.title || formatCategoryName(part),
        link: currentPath
      })
    } else {
      // 分类页面
      crumbs.push({
        text: formatCategoryName(part),
        link: currentPath
      })
    }
  })
  
  return crumbs
})

// 格式化分类名称
function formatCategoryName(name: string): string {
  // 特殊处理中文目录
  const categoryMap: Record<string, string> = {
    'golang': 'Golang',
    'php': 'PHP',
    'python': 'Python',
    'tools': 'Tools',
    'zh': '中文',
    '工具': '工具',
    '数据库': '数据库',
    'wails-tutorial-series': 'Wails 教程系列'
  }
  
  return categoryMap[name] || name.charAt(0).toUpperCase() + name.slice(1)
}
</script>

<style scoped>
.breadcrumb {
  padding: 1rem 0 0.5rem 0;
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
  margin-bottom: 1rem;
}

.breadcrumb ol {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.breadcrumb li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.breadcrumb a {
  color: var(--vp-c-brand);
  text-decoration: none;
  transition: all 0.2s ease;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.breadcrumb a:hover {
  color: var(--vp-c-brand-dark);
  background-color: var(--vp-c-bg-soft);
  text-decoration: none;
}

.breadcrumb span[itemprop="name"] {
  display: inline-block;
}

.breadcrumb .separator {
  color: var(--vp-c-text-3);
  user-select: none;
  font-weight: 300;
}

/* 暗黑模式适配 */
.dark .breadcrumb a:hover {
  background-color: var(--vp-c-bg-mute);
}

/* 移动端优化 */
@media (max-width: 768px) {
  .breadcrumb {
    font-size: 0.8125rem;
    padding: 0.75rem 0 0.5rem 0;
  }
  
  .breadcrumb a {
    padding: 0.2rem 0.4rem;
  }
}

/* SEO 优化：确保面包屑在打印时也可见 */
@media print {
  .breadcrumb {
    display: block !important;
  }
}
</style>

