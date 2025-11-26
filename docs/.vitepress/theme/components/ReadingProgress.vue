<template>
  <div v-if="isArticlePage" class="reading-progress-container">
    <div 
      class="reading-progress-bar" 
      :style="{ width: progress + '%' }"
      role="progressbar"
      :aria-valuenow="progress"
      aria-valuemin="0"
      aria-valuemax="100"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()
const progress = ref(0)

// 判断是否是文章页面（非首页、非特殊页面）
const isArticlePage = computed(() => {
  const path = route.path
  return (
    path !== '/' && 
    path !== '/zh/' &&
    !path.includes('/about') &&
    !path.includes('/contact') &&
    !path.includes('/privacy-policy') &&
    !path.includes('/404')
  )
})

const calculateProgress = () => {
  // 获取文档高度和窗口高度
  const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  
  // 计算阅读进度
  if (docHeight > 0) {
    const scrollProgress = (scrollTop / docHeight) * 100
    progress.value = Math.min(100, Math.max(0, scrollProgress))
  }
}

onMounted(() => {
  // 监听滚动事件
  window.addEventListener('scroll', calculateProgress, { passive: true })
  // 初始计算
  calculateProgress()
})

onUnmounted(() => {
  window.removeEventListener('scroll', calculateProgress)
})
</script>

<style scoped>
.reading-progress-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background-color: rgba(0, 0, 0, 0.05);
  z-index: 9999;
  pointer-events: none;
}

.reading-progress-bar {
  height: 100%;
  background: linear-gradient(
    90deg,
    #3eaf7c 0%,
    #2c8a5e 100%
  );
  transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(62, 175, 124, 0.4);
}

/* 暗黑模式适配 */
.dark .reading-progress-container {
  background-color: rgba(255, 255, 255, 0.08);
}

.dark .reading-progress-bar {
  background: linear-gradient(
    90deg,
    #42b883 0%,
    #35a372 100%
  );
  box-shadow: 0 1px 3px rgba(66, 184, 131, 0.5);
}

/* 动画效果 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

/* 当进度接近100%时添加脉冲效果 */
.reading-progress-bar[aria-valuenow="100"] {
  animation: pulse 1.5s infinite;
}
</style>

