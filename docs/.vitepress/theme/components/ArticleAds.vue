<template>
  <div v-if="AD_ENABLED" class="article-ads">
    <!-- 文章中间广告 -->
    <template v-if="isArticlePage">
      <MonetagAd
        v-if="adConfig.articleMiddle.monetag?.enabled"
        position="article-middle"
        :zone-id="adConfig.articleMiddle.monetag.zoneId"
        :ad-type="adConfig.articleMiddle.monetag.adType"
        :enabled="adConfig.articleMiddle.monetag.enabled"
      />
    </template>

    <!-- 文章底部广告 -->
    <template v-if="isArticlePage">
      <MonetagAd
        v-if="adConfig.articleBottom.monetag?.enabled"
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
