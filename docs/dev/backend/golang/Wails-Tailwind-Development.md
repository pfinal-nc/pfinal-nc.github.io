---
title: "基于 wails 和 Tailwindcss 的应用开发"
description: "介绍如何在使用 Wails 开发桌面应用时集成 Tailwind CSS，打造美观且响应式的用户界面。"
keywords:
  - Wails
  - Tailwind CSS
  - 桌面应用
  - UI 开发
  - Go
author: PFinal南丞
date: 2026-04-22
tags:
  - golang
  - wails
  - tailwindcss
  - ui
---

# 基于 wails 和 Tailwindcss 的应用开发

> Tailwind CSS 是原子化 CSS 框架的代表，与 Wails 结合可以快速构建美观的桌面应用界面。

## 一、环境搭建

### 1.1 创建 Wails 项目

```bash
wails init -n myapp -t vue-ts
cd myapp
```

### 1.2 安装 Tailwind CSS

```bash
cd frontend
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 1.3 配置 Tailwind

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
      },
    },
  },
  plugins: [],
}
```

```css
/* src/style.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## 二、界面开发

### 2.1 主窗口布局

```vue
<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 侧边栏 -->
    <aside class="fixed left-0 top-0 h-full w-64 bg-white shadow-lg">
      <div class="p-6">
        <h1 class="text-2xl font-bold text-gray-800">My App</h1>
      </div>
      
      <nav class="mt-6">
        <a v-for="item in menuItems" 
           :key="item.path"
           :class="[
             'flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50 hover:text-primary transition-colors',
             { 'bg-blue-50 text-primary border-r-4 border-primary': activeRoute === item.path }
           ]">
          <span class="mr-3">{{ item.icon }}</span>
          {{ item.name }}
        </a>
      </nav>
    </aside>
    
    <!-- 主内容区 -->
    <main class="ml-64 p-8">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const menuItems = [
  { name: 'Dashboard', path: '/', icon: '📊' },
  { name: 'Settings', path: '/settings', icon: '⚙️' },
  { name: 'About', path: '/about', icon: 'ℹ️' },
]

const activeRoute = ref('/')
</script>
```

### 2.2 组件开发

```vue
<!-- components/AppCard.vue -->
<template>
  <div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-800">{{ title }}</h3>
      <span class="text-2xl">{{ icon }}</span>
    </div>
    
    <p class="text-gray-600 mb-4">{{ description }}</p>
    
    <div class="flex space-x-2">
      <button 
        @click="$emit('primary-action')"
        class="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600 transition-colors">
        {{ primaryText }}
      </button>
      
      <button 
        @click="$emit('secondary-action')"
        class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
        {{ secondaryText }}
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  description: String,
  icon: String,
  primaryText: { type: String, default: '确认' },
  secondaryText: { type: String, default: '取消' }
})

defineEmits(['primary-action', 'secondary-action'])
</script>
```

## 三、与 Go 后端交互

```vue
<template>
  <div class="max-w-2xl mx-auto">
    <h2 class="text-2xl font-bold mb-6">系统信息</h2>
    
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-white p-4 rounded-lg shadow">
        <p class="text-sm text-gray-500">操作系统</p>
        <p class="text-lg font-semibold">{{ systemInfo.os }}</p>
      </div>
      
      <div class="bg-white p-4 rounded-lg shadow">
        <p class="text-sm text-gray-500">架构</p>
        <p class="text-lg font-semibold">{{ systemInfo.arch }}</p>
      </div>
      
      <div class="bg-white p-4 rounded-lg shadow">
        <p class="text-sm text-gray-500">CPU 核心数</p>
        <p class="text-lg font-semibold">{{ systemInfo.cpuCount }}</p>
      </div>
      
      <div class="bg-white p-4 rounded-lg shadow">
        <p class="text-sm text-gray-500">内存</p>
        <p class="text-lg font-semibold">{{ formatBytes(systemInfo.memory) }}</p>
      </div>
    </div>
    
    <button 
      @click="refreshInfo"
      :disabled="loading"
      class="mt-6 px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
      {{ loading ? '加载中...' : '刷新' }}
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const systemInfo = ref({})
const loading = ref(false)

const refreshInfo = async () => {
  loading.value = true
  try {
    systemInfo.value = await window.go.backend.App.GetSystemInfo()
  } finally {
    loading.value = false
  }
}

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

onMounted(refreshInfo)
</script>
```

## 四、最佳实践

### 4.1 暗色模式支持

```javascript
// 在 tailwind.config.js 中启用暗色模式
module.exports = {
  darkMode: 'class',
  // ...
}
```

```vue
<template>
  <div :class="{ 'dark': isDarkMode }">
    <div class="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
      <!-- 内容 -->
    </div>
  </div>
</template>
```

### 4.2 响应式设计

```vue
<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <!-- 卡片会自动响应不同屏幕尺寸 -->
    <div v-for="item in items" :key="item.id" class="p-4 bg-white rounded-lg shadow">
      {{ item.name }}
    </div>
  </div>
</template>
```

## 五、总结

Wails + Tailwind CSS 的组合让桌面应用开发变得高效且愉快。Tailwind 的原子化 CSS 方式非常适合快速迭代界面设计。
