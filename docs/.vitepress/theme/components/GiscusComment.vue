<template>
  <div class="giscus-comment">
    <Giscus
      :id="id"
      :repo="repo"
      :repo-id="repoId"
      :category="category"
      :category-id="categoryId"
      :mapping="mapping"
      :term="term"
      :strict="strict"
      :reactions-enabled="reactionsEnabled"
      :emit-metadata="emitMetadata"
      :input-position="inputPosition"
      :theme="theme"
      :lang="lang"
      :loading="loading"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useData, useRoute } from 'vitepress'
import Giscus from '@giscus/vue'

// Giscus配置
// 请访问 https://giscus.app/zh-CN 获取你的配置
const props = defineProps({
  // GitHub仓库（格式：owner/repo）
  repo: {
    type: String,
    default: 'pfinal-nc/pfinal-nc.github.io'
  },
  // 仓库ID（从giscus.app获取）
  repoId: {
    type: String,
    default: 'R_kgDOHk9--A'
  },
  // 分类名称
  category: {
    type: String,
    default: 'Announcements'
  },
  // 分类ID（从giscus.app获取）
  categoryId: {
    type: String,
    default: 'DIC_kwDOHk9--M4Cy_PT'
  },
  // 页面 ↔️ discussion 映射关系
  mapping: {
    type: String,
    default: 'pathname'
  },
  // discussion term
  term: {
    type: String,
    default: ''
  },
  // 严格标题匹配
  strict: {
    type: String,
    default: '0'
  },
  // 启用反应
  reactionsEnabled: {
    type: String,
    default: '1'
  },
  // 发送元数据
  emitMetadata: {
    type: String,
    default: '0'
  },
  // 输入框位置
  inputPosition: {
    type: String,
    default: 'top'
  },
  // 加载方式
  loading: {
    type: String,
    default: 'lazy'
  },
  // 语言
  lang: {
    type: String,
    default: ''
  }
})

const route = useRoute()
const { isDark, lang: viteLang } = useData()

// 动态ID，确保每个页面独立
const id = computed(() => route.path)

// 根据VitePress语言设置自动切换
const lang = computed(() => {
  if (props.lang) return props.lang
  return viteLang.value === 'zh-CN' ? 'zh-CN' : 'en'
})

// 主题跟随VitePress暗色模式
const theme = computed(() => {
  return isDark.value ? 'dark' : 'light'
})

// 监听路由变化，刷新评论
watch(() => route.path, () => {
  // Giscus会自动处理路由变化
})
</script>

<style scoped>
.giscus-comment {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--vp-c-divider);
}

@media (max-width: 768px) {
  .giscus-comment {
    margin-top: 2rem;
    padding-top: 1.5rem;
  }
}
</style>

