<template>
  <div v-if="enabled" :id="`ezoic-pub-ad-placeholder-${placementId}`" class="ezoic-ad"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

interface Props {
  placementId: string | number
  enabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  enabled: true
})

// 声明全局类型
declare global {
  interface Window {
    ezstandalone?: {
      cmd?: Array<(...args: any[]) => void>
      showAds?: (...placementIds: (string | number)[]) => void
    }
  }
}

const showAd = () => {
  if (!props.enabled || !props.placementId) {
    return
  }

  try {
    // 确保 ezstandalone 已初始化
    if (!window.ezstandalone) {
      window.ezstandalone = {}
    }
    if (!window.ezstandalone.cmd) {
      window.ezstandalone.cmd = []
    }

    // 使用 cmd.push 确保在 Ezoic SDK 加载后执行
    window.ezstandalone.cmd.push(function () {
      if (window.ezstandalone && window.ezstandalone.showAds) {
        window.ezstandalone.showAds(Number(props.placementId))
        console.debug(`EzoicAd: Placement ${props.placementId} initialized.`)
      } else {
        // 如果 showAds 还未可用，稍后重试
        setTimeout(showAd, 100)
      }
    })
  } catch (error) {
    console.warn(`EzoicAd: Error initializing placement ${props.placementId}:`, error)
  }
}

onMounted(() => {
  // 确保 DOM 已加载，然后初始化广告
  // 延迟一点时间，确保 Ezoic SDK 已加载
  if (document.readyState === 'complete') {
    // 如果页面已加载完成，稍微延迟以确保 Ezoic SDK 已初始化
    setTimeout(showAd, 100)
  } else {
    window.addEventListener('load', () => {
      setTimeout(showAd, 100)
    }, { once: true })
  }
})

onUnmounted(() => {
  // 清理工作（如果需要）
})
</script>

<style scoped>
.ezoic-ad {
  width: 100%;
  min-height: 1px; /* 最小高度，避免布局问题 */
}
</style>

