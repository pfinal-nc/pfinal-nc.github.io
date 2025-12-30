<template>
  <div v-if="AD_ENABLED" class="article-ads">
    <!-- 文章中间广告 - In-Page Push 是弹窗式，不会在容器中显示 -->
    <!-- 注意：In-Page Push 会在页面加载后自动弹出，不需要容器 -->
    <MonetagAd
      v-if="isArticlePage && adConfig.articleMiddle.enabled"
      position="article-middle"
      :zone-id="adConfig.articleMiddle.zoneId"
      :ad-type="adConfig.articleMiddle.adType"
      :enabled="adConfig.articleMiddle.enabled"
    />
    
    <!-- 文章底部广告 - Native Banner 是全屏式，也不会在容器中显示 -->
    <!-- 注意：Native Banner (Interstitial) 会在页面加载后全屏显示，不需要容器 -->
    <MonetagAd
      v-if="isArticlePage && adConfig.articleBottom.enabled"
      position="article-bottom"
      :zone-id="adConfig.articleBottom.zoneId"
      :ad-type="adConfig.articleBottom.adType"
      :enabled="adConfig.articleBottom.enabled"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vitepress'
import MonetagAd from './MonetagAd.vue'
import adConfig, { AD_ENABLED } from '../config/ad-config'

const route = useRoute()

// 判断是否是文章页面（排除首页、分类页等）
const isArticlePage = computed(() => {
  const path = route.path
  // 排除首页、分类页、关于页等
  const excludePaths = ['/', '/index', '/about', '/contact', '/privacy-policy']
  const isExcluded = excludePaths.some(exclude => path === exclude || path.startsWith(exclude + '/'))
  
  // 排除分类索引页（通常以 / 结尾且路径较短）
  const isCategoryIndex = path.match(/^\/[^\/]+\/$/) !== null
  
  return !isExcluded && !isCategoryIndex && path.length > 1
})
</script>

<style scoped>
.article-ads {
  width: 100%;
}
</style>

