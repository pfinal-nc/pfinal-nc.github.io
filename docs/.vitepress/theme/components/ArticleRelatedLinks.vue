<template>
  <section v-if="show" class="article-related-links" data-pagefind-ignore>
    <h3 class="related-links-title">延伸阅读</h3>
    <p class="related-links-desc">更多技术专题与实战文章，可从以下入口浏览。</p>
    <ul class="related-links-list">
      <li v-for="item in links" :key="item.url">
        <a :href="item.url" class="related-link">{{ item.title }}</a>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()

// 在深度 ≥ 3 的页面展示（文章页及部分专题页），增加内链
const show = computed(() => {
  const path = route.path.replace(/\/$/, '') || '/'
  if (path === '/' || path === '') return false
  const parts = path.split('/').filter(Boolean)
  return parts.length >= 3
})

// 核心内链：提高内链密度，便于爬虫与用户发现内容
const links = computed(() => {
  const base = [
    { title: '开发与系统', url: '/dev/' },
    { title: '安全工程', url: '/security/engineering/' },
    { title: '攻防研究', url: '/security/offensive/' },
    { title: '数据与自动化', url: '/data/automation/' },
    { title: '思考 / 方法论', url: '/thinking/method/' },
    { title: '在线工具', url: '/Tools/online-tools' }
  ]
  const path = route.path
  // 根据当前路径补充同领域入口，避免重复
  if (path.startsWith('/security/')) return base.filter(l => !l.url.startsWith('/security/'))
  if (path.startsWith('/dev/')) return base.filter(l => l.url !== '/dev/')
  if (path.startsWith('/data/')) return base.filter(l => l.url !== '/data/automation/')
  if (path.startsWith('/thinking/')) return base.filter(l => l.url !== '/thinking/method/')
  if (path.startsWith('/tools') || path.startsWith('/Tools')) return base.filter(l => l.url !== '/Tools/online-tools')
  return base
})
</script>

<style scoped>
.article-related-links {
  margin-top: 2rem;
  padding: 1.25rem 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
}

.related-links-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  color: var(--vp-c-text-1);
}

.related-links-desc {
  font-size: 0.8125rem;
  color: var(--vp-c-text-2);
  margin: 0 0 0.75rem 0;
}

.related-links-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}

.related-link {
  font-size: 0.875rem;
  color: var(--vp-c-brand);
  text-decoration: none;
}

.related-link:hover {
  text-decoration: underline;
  color: var(--vp-c-brand-dark);
}
</style>
