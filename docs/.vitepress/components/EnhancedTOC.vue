<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useData } from 'vitepress'

const { frontmatter, page } = useData()

const activeId = ref('')
const toc = computed(() => {
  const headers = page.value.headers
  return headers
})

const handleScroll = () => {
  const sections = document.querySelectorAll('h2, h3, h4')
  const scrollY = window.scrollY

  sections.forEach((section) => {
    const sectionTop = section.offsetTop
    const sectionHeight = section.offsetHeight
    if (scrollY >= sectionTop - 100 && scrollY < sectionTop + sectionHeight) {
      const id = section.getAttribute('id')
      if (id) activeId.value = id
    }
  })
}

const scrollTo = (id: string) => {
  const element = document.getElementById(id)
  if (element) {
    const offset = 80 // 导航栏高度
    const elementPosition = element.getBoundingClientRect().top + window.scrollY
    window.scrollTo({
      top: elementPosition - offset,
      behavior: 'smooth'
    })
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div v-if="toc && toc.length > 0" class="enhanced-toc">
    <div class="toc-header">
      <h3>目录</h3>
    </div>
    <div class="toc-content">
      <div
        v-for="header in toc"
        :key="header.slug"
        :class="['toc-item', `toc-${header.level}`, { active: activeId === header.slug }]"
        @click="scrollTo(header.slug)"
      >
        <span>{{ header.title }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.enhanced-toc {
  position: fixed;
  right: 20px;
  top: 100px;
  max-width: 300px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e1e4e8;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  z-index: 999;
  padding: 16px;
  backdrop-filter: blur(10px);
}

.toc-header h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 2px solid #42b883;
  padding-bottom: 8px;
}

.toc-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toc-item {
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: #5c6b7f;
  transition: all 0.2s ease;
  position: relative;
  line-height: 1.5;
}

.toc-item:hover {
  background: #f3f4f6;
  color: #2c3e50;
  transform: translateX(2px);
}

.toc-item.active {
  background: #e8f5e9;
  color: #42b883;
  font-weight: 600;
}

.toc-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  background: #42b883;
  border-radius: 2px;
}

.toc-2 {
  font-weight: 600;
}

.toc-3 {
  padding-left: 28px;
  font-weight: 400;
}

.toc-4 {
  padding-left: 44px;
  font-weight: 400;
  font-size: 12px;
}

@media (max-width: 1400px) {
  .enhanced-toc {
    max-width: 250px;
    right: 10px;
  }
}

@media (max-width: 1024px) {
  .enhanced-toc {
    display: none;
  }
}

/* 滚动条样式 */
.enhanced-toc::-webkit-scrollbar {
  width: 6px;
}

.enhanced-toc::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.enhanced-toc::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.enhanced-toc::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .enhanced-toc {
    background: rgba(30, 30, 30, 0.95);
    border-color: #4a4a4a;
  }

  .toc-header h3 {
    color: #e1e4e8;
  }

  .toc-item {
    color: #a0aec0;
  }

  .toc-item:hover {
    background: #2d3748;
    color: #e1e4e8;
  }

  .toc-item.active {
    background: #1a365d;
    color: #48bb78;
  }
}
</style>
