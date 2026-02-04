<template>
  <div v-if="AD_ENABLED || EZOIC_ENABLED" class="article-ads">
    <!-- 文章中间广告 -->
    <template v-if="isArticlePage">
      <!-- Ezoic 广告（优先） -->
      <EzoicAd
        v-if="adConfig.articleMiddle.ezoic?.enabled"
        :placement-id="adConfig.articleMiddle.ezoic.placementId"
        :enabled="adConfig.articleMiddle.ezoic.enabled"
      />
      <!-- Monetag 广告（备用） -->
      <MonetagAd
        v-else-if="adConfig.articleMiddle.monetag?.enabled"
        position="article-middle"
        :zone-id="adConfig.articleMiddle.monetag.zoneId"
        :ad-type="adConfig.articleMiddle.monetag.adType"
        :enabled="adConfig.articleMiddle.monetag.enabled"
      />
    </template>
    
    <!-- 文章底部广告 -->
    <template v-if="isArticlePage">
      <!-- Ezoic 广告（优先） -->
      <EzoicAd
        v-if="adConfig.articleBottom.ezoic?.enabled"
        :placement-id="adConfig.articleBottom.ezoic.placementId"
        :enabled="adConfig.articleBottom.ezoic.enabled"
      />
      <!-- Monetag 广告（备用） -->
      <MonetagAd
        v-else-if="adConfig.articleBottom.monetag?.enabled"
        position="article-bottom"
        :zone-id="adConfig.articleBottom.monetag.zoneId"
        :ad-type="adConfig.articleBottom.monetag.adType"
        :enabled="adConfig.articleBottom.monetag.enabled"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vitepress'
import MonetagAd from './MonetagAd.vue'
import EzoicAd from './EzoicAd.vue'
import adConfig, { AD_ENABLED, EZOIC_ENABLED } from '../config/ad-config'

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

