<template>
  <!-- 
    Direct Link 类型可以在容器中显示广告
    In-Page Push 和 Native Banner 是弹窗/全屏类型，不会在容器中显示
  -->
  <div v-if="enabled && adType !== 'onclick-popunder'" :class="['monetag-ad', `monetag-ad-${position}`, { 'monetag-ad-hidden': !visible && (adType === 'inpage-push' || adType === 'native-banner') }]">
    <div 
      :id="containerId" 
      class="monetag-ad-container"
      :data-zone="zoneId"
      :data-ad-type="adType"
      :style="(adType === 'inpage-push' || adType === 'native-banner') ? 'display: none;' : ''"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

// 扩展 Window 接口
declare global {
  interface Window {
    __monetagErrorHandlerSet?: boolean
  }
}

// 广告配置
const props = defineProps({
  // 广告位置：article-middle（文章中间）、article-bottom（文章底部）、sidebar（侧边栏）
  position: {
    type: String,
    default: 'article-bottom',
    validator: (value: string) => ['article-middle', 'article-bottom', 'sidebar', 'header'].includes(value)
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
    validator: (value: string) => ['inpage-push', 'native-banner', 'direct-link', 'onclick-popunder'].includes(value)
  },
  // 是否启用
  enabled: {
    type: Boolean,
    default: true
  }
})

const visible = ref(false)
const containerId = ref(`monetag-${props.zoneId}-${Date.now()}`)
let isInitialized = false

// 全局标记，确保 Monetag 脚本只加载一次
let monetagScriptLoaded = false

// 使用 Monetag 的标准集成方式
// 所有类型（In-Page Push、Native Banner、OnClick Popunder）都使用相同的代码格式
const loadMonetagAd = () => {
  if (isInitialized) return
  
  // 确保页面已完全加载
  if (document.readyState !== 'complete') {
    window.addEventListener('load', loadMonetagAd, { once: true })
    return
  }
  
  // 确保容器元素存在
  const container = document.getElementById(containerId.value)
  if (!container) {
    setTimeout(loadMonetagAd, 100)
    return
  }
  
  // Monetag 的实际核心代码格式
  // 使用 Monetag 的标准集成方式，确保广告能正确显示在容器中
  try {
    // 在加载脚本前，再次确保错误处理已设置
    if (!window.__monetagErrorHandlerSet) {
      window.addEventListener('unhandledrejection', function(event) {
        const reason = event.reason
        const message = (reason && reason.message) ? String(reason.message) : String(reason || '')
        const stack = (reason && reason.stack) ? String(reason.stack) : ''
        if (message.indexOf('Performance') !== -1 || 
            message.indexOf('blth:start') !== -1 || 
            message.indexOf('hidden_iframe:start') !== -1 ||
            message.indexOf('tag.min.js') !== -1 ||
            message.indexOf('Failed to execute') !== -1 ||
            stack.indexOf('tag.min.js') !== -1 ||
            stack.indexOf('nap5k.com') !== -1) {
          event.preventDefault()
          event.stopPropagation()
          event.stopImmediatePropagation()
          return false
        }
      }, true)
      window.__monetagErrorHandlerSet = true
    }
    
    // 使用 Monetag 的标准代码格式
    // 注意：Monetag 会自动查找页面上的容器，容器需要有 data-zone 属性
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.innerHTML = `
      (function(s){
        s.dataset.zone='${props.zoneId}';
        s.src='https://nap5k.com/tag.min.js';
      })([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))
    `
    
    // 将脚本添加到页面
    const targetElement = document.documentElement || document.body
    if (targetElement) {
      targetElement.appendChild(script)
      visible.value = true
      isInitialized = true
      
      // 确保容器元素有正确的属性，Monetag 可能需要这些属性来识别容器
      setTimeout(() => {
        const adContainer = document.getElementById(containerId.value)
        if (adContainer) {
          // 确保容器有正确的属性
          adContainer.setAttribute('data-zone', props.zoneId)
          adContainer.setAttribute('data-ad-type', props.adType)
          adContainer.style.minHeight = '90px'
          adContainer.style.width = '100%'
          adContainer.style.display = 'block'
        }
      }, 500)
    }
  } catch (error) {
    // 静默处理错误
    visible.value = true // 即使出错也显示容器
    isInitialized = true
  }
}

// 加载 OnClick Popunder 广告（使用相同的代码格式）
const loadOnClickPopunder = () => {
  if (isInitialized) return
  
  // 确保页面已完全加载
  if (document.readyState !== 'complete') {
    window.addEventListener('load', loadOnClickPopunder, { once: true })
    return
  }
  
  try {
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.innerHTML = `
      (function(s){
        s.dataset.zone='${props.zoneId}';
        s.src='https://nap5k.com/tag.min.js';
      })([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))
    `
    
    const targetElement = document.documentElement || document.body
    if (targetElement) {
      targetElement.appendChild(script)
      isInitialized = true
    }
  } catch (error) {
    console.warn('Monetag OnClick Popunder 加载错误:', error)
    isInitialized = true
  }
}

// 初始化广告
const initAd = () => {
  if (!props.enabled || !props.zoneId || isInitialized) {
    return
  }

  // 延迟加载，确保 DOM 已完全渲染
  setTimeout(() => {
    if (props.adType === 'onclick-popunder') {
      loadOnClickPopunder()
    } else {
      loadMonetagAd()
    }
  }, 300) // 增加延迟，确保容器已渲染
}

// 清理
const cleanup = () => {
  isInitialized = false
  visible.value = false
  // 注意：Monetag 脚本一旦加载，通常不应该移除
  // 因为可能有多个广告区域共享同一个脚本
}

onMounted(() => {
  // 立即显示容器，然后加载广告
  visible.value = true
  
  // 等待页面完全加载后再初始化广告
  if (document.readyState === 'complete') {
    setTimeout(initAd, 500)
  } else {
    window.addEventListener('load', () => {
      setTimeout(initAd, 500)
    }, { once: true })
  }
})

onUnmounted(() => {
  cleanup()
})

// 监听配置变化
watch(() => [props.enabled, props.zoneId], () => {
  if (props.enabled && !isInitialized) {
    isInitialized = false
    initAd()
  } else if (!props.enabled) {
    cleanup()
  }
})
</script>

<style scoped>
.monetag-ad {
  margin: 2rem 0;
  text-align: center;
}

.monetag-ad-hidden {
  display: none;
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

/* 确保广告容器可见 */
.monetag-ad-container:empty::before {
  content: '';
  display: block;
  min-height: 90px;
  width: 100%;
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
