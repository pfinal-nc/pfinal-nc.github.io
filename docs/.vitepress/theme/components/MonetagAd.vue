<template>
  <!--
    Direct Link 类型会在容器中显示广告
    In-Page Push 和 Native Banner 是弹窗/全屏类型，容器不显示
  -->
  <div
    v-if="enabled && adType !== 'onclick-popunder'"
    :class="['monetag-ad', `monetag-ad-${position}`]"
  >
    <div
      :id="containerId"
      class="monetag-ad-container"
      :data-zone="zoneId"
      :data-ad-type="adType"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 扩展 Window 接口
declare global {
  interface Window {
    __monetagErrorHandlerSet?: boolean
  }
}

const props = defineProps({
  // 广告位置：article-middle（文章中间）、article-bottom（文章底部）、sidebar（侧边栏）、header（页面头部）
  position: {
    type: String,
    default: 'article-bottom',
    validator: (value: string) =>
      ['article-middle', 'article-bottom', 'sidebar', 'header'].includes(value)
  },
  // Zone ID
  zoneId: {
    type: String,
    required: true
  },
  // 广告类型：inpage-push, native-banner, direct-link, onclick-popunder
  adType: {
    type: String,
    default: 'inpage-push',
    validator: (value: string) =>
      ['inpage-push', 'native-banner', 'direct-link', 'onclick-popunder'].includes(value)
  },
  // 是否启用
  enabled: {
    type: Boolean,
    default: true
  }
})

// 模块级 Set：记录已加载的 zoneId，避免多个组件实例重复注入 tag.min.js
const loadedZones = new Set<string>()

const containerId = ref(`monetag-${props.zoneId}-${Math.random().toString(36).slice(2, 8)}`)

// 注入一次性的全局错误抑制（Monetag 脚本会触发非致命的 unhandledrejection）
const setupErrorSuppression = () => {
  if (window.__monetagErrorHandlerSet) return
  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason: any = event.reason
      const message = String(reason?.message ?? reason ?? '')
      const stack = String(reason?.stack ?? '')
      if (
        message.includes('Performance') ||
        message.includes('blth:start') ||
        message.includes('hidden_iframe:start') ||
        message.includes('tag.min.js') ||
        message.includes('Failed to execute') ||
        stack.includes('tag.min.js') ||
        stack.includes('nap5k.com')
      ) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
      }
    },
    true
  )
  window.__monetagErrorHandlerSet = true
}

// 加载指定 zone 的 Monetag 脚本
const loadMonetagScript = (zoneId: string) => {
  if (loadedZones.has(zoneId)) return
  loadedZones.add(zoneId)
  setupErrorSuppression()

  const script = document.createElement('script')
  script.type = 'text/javascript'
  script.innerHTML = `
    (function(s){
      s.dataset.zone='${zoneId}';
      s.src='https://nap5k.com/tag.min.js';
    })([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))
  `
  const target = document.documentElement || document.body
  target?.appendChild(script)
}

const initAd = () => {
  if (!props.enabled || !props.zoneId) return
  if (document.readyState !== 'complete') {
    window.addEventListener('load', initAd, { once: true })
    return
  }
  loadMonetagScript(props.zoneId)
}

onMounted(() => {
  setTimeout(initAd, 300)
})

onUnmounted(() => {
  // 不移除已加载的脚本，其他广告位可能仍依赖它
})
</script>

<style scoped>
.monetag-ad {
  margin: 2rem 0;
  text-align: center;
}

/* 文章中间广告 */
.monetag-ad-article-middle {
  margin: 3rem 0;
  padding: 1.5rem 0;
  border-top: 1px solid var(--vp-c-divider);
  border-bottom: 1px solid var(--vp-c-divider);
}

/* 文章底部广告 */
.monetag-ad-article-bottom {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--vp-c-divider);
}

/* 侧边栏广告 */
.monetag-ad-sidebar {
  margin: 1.5rem 0;
  padding: 1rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
}

/* 头部广告 */
.monetag-ad-header {
  margin: 0;
  padding: 0.5rem 0;
}

.monetag-ad-container {
  min-height: 90px;
  width: 100%;
  display: block;
  position: relative;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .monetag-ad-article-middle,
  .monetag-ad-article-bottom {
    margin: 2rem 0;
    padding: 1rem 0;
  }

  .monetag-ad-container {
    min-height: 60px;
  }
}
</style>
