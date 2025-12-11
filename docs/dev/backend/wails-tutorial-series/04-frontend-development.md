---
title: Wails 教程系列 - 前端开发实战指南
date: 2025-01-15
author: PFinalClub
description: 手把手教你用最新的前端技术栈开发 Wails 应用，从入门到精通。
tags:
  - Wails
  - Vue3
  - TypeScript
  - 前端开发
  - 桌面应用
---

# Wails 教程系列 - 前端开发实战指南

> 💡 **适合人群**: 有一定前端基础的开发者，想学 Wails 桌面应用开发
> 
> 📖 **难度等级**: 
> - 🟢 新手: 会 Vue 3 基础语法就行
> - 🟡 进阶: 懂 TypeScript 和状态管理
> - 🔴 高手: 想搞架构设计和性能优化

前面几篇文章聊了 Wails 的环境搭建和项目创建，现在来聊聊前端开发这块。用户界面是应用的门面，做得好不好直接影响用户体验。

## 📋 目录
- [1. 快速开始](#1-快速开始)
- [2. 核心技术栈](#2-核心技术栈)
- [3. 现代化开发实践](#3-现代化开发实践)
- [4. 前后端通信](#4-前后端通信)
- [5. 性能优化](#5-性能优化)
- [6. 测试与质量保证](#6-测试与质量保证)
- [7. 安全性](#7-安全性)
- [8. 实战应用](#8-实战应用)

## 1. 快速上手 🚀

### 1.1 技术栈选择

现在 Wails 前端开发用的都是最新的技术栈，性能好、开发体验棒：

**主要技术**:
- **Vue 3.4+**: 最新的组合式 API，性能提升明显
- **TypeScript 5.3+**: 类型安全，减少 bug
- **Vite 5.0+**: 构建速度快得飞起
- **Pinia 2.1+**: 状态管理，比 Vuex 好用
- **VueUse**: 一堆实用的工具函数，不用重复造轮子

### 1.2 项目初始化

```bash
# 创建 Wails 项目
wails init -n my-app -t vue

# 进入项目目录
cd my-app

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 1.3 依赖配置

```json
// package.json - 当前最新版本
{
  "name": "wails-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview",
    "type-check": "vue-tsc --noEmit",
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.2.5",
    "pinia": "^2.1.7",
    "@vueuse/core": "^10.7.0",
    "element-plus": "^2.4.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "@wailsapp/vite-plugin": "^1.0.0",
    "vite": "^5.0.0",
    "typescript": "^5.3.0",
    "vue-tsc": "^1.8.25",
    "@types/node": "^20.10.0",
    "vitest": "^1.0.0",
    "@vue/test-utils": "^2.4.0",
    "jsdom": "^23.0.0"
  }
}
```
## 2. 技术栈详解 💻

### 2.1 设计理念

Wails 前端开发有自己的一套设计理念，理解这些很重要：

**核心原则**:
- **🔄 打包成一体**: 前端代码最终会打包到 Go 程序里，变成一个文件
- **⚡ 原生体验**: 用 WebKit 渲染，不用担心浏览器兼容问题
- **🚀 性能第一**: 轻量设计，启动快、响应快
- **🖥️ 桌面特性**: 充分利用桌面应用的优势
- **🛡️ 类型安全**: 用 TypeScript 减少 bug
- **🧪 好测试**: 支持完整的测试流程

### 2.2 技术选择建议

| 技术 | 适合什么项目 | 优点 | 需要注意什么 |
|------|-------------|------|-------------|
| **Vue 3.4+** | 渐进式开发、组件化项目 | 学习容易、生态丰富、性能好 | 要会 Composition API 和 `<script setup>` |
| **React 18+** | 大型应用、复杂状态管理 | 生态最全、并发特性强 | 关注 Suspense 和并发渲染 |
| **Svelte 5** | 对性能要求很高的应用 | 编译优化、体积小、响应快 | 社区小一点，资料相对少 |
| **原生 JS/TS** | 轻量应用、学习练手 | 完全控制、没有框架包袱 | 要自己处理状态管理和路由 |

## 3. 开发实践 🔧

### 3.1 项目结构

项目结构组织得好，开发起来会更顺畅，建议这样安排：

```
frontend/
├── src/
│   ├── components/          # 可复用的组件
│   │   ├── ui/             # 基础 UI 组件（按钮、输入框等）
│   │   └── business/       # 业务组件（用户列表、订单等）
│   ├── views/              # 页面组件
│   ├── stores/             # 状态管理
│   ├── composables/        # 组合式函数
│   ├── utils/              # 工具函数
│   ├── types/              # 类型定义
│   ├── assets/             # 静态资源（图片、字体等）
│   ├── styles/             # 样式文件
│   ├── wailsjs/            # Wails 自动生成的代码
│   │   ├── go/             # Go 方法绑定
│   │   └── runtime/        # 运行时 API
│   ├── main.ts             # 应用入口
│   └── App.vue             # 根组件
├── public/                 # 公共资源
├── dist/                   # 构建输出
├── tests/                  # 测试文件
├── package.json            # 依赖配置
├── vite.config.ts          # Vite 配置
├── tsconfig.json           # TypeScript 配置
├── vitest.config.ts        # 测试配置
└── index.html              # HTML 模板
```

### 3.2 配置文件

#### Vite 配置

```typescript
// vite.config.ts - 构建配置
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { WailsPlugin } from '@wailsapp/vite-plugin'

export default defineConfig({
  plugins: [
    vue({
      // 支持 Vue 3.4+ 的新特性
      script: {
        defineModel: true,
        propsDestructure: true
      }
    }),
    WailsPlugin()
  ],
  
  // 构建配置
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router'],
          'wails-runtime': ['../wailsjs/runtime/runtime'],
          'ui-vendor': ['element-plus'] // 如果用了 UI 框架
        }
      }
    }
  },
  
  // 开发服务器配置
  server: {
    port: 34115,
    strictPort: true,
    hmr: {
      port: 34115,
      overlay: false // 避免热重载错误弹窗
    }
  },
  
  // 路径别名
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'wailsjs': resolve(__dirname, './wailsjs')
    }
  },
  
  // 环境变量
  define: {
    __VUE_OPTIONS_API__: false, // 不用 Options API
    __VUE_PROD_DEVTOOLS__: false // 生产环境关掉 devtools
  }
})
```

#### TypeScript 配置

```json
// tsconfig.json - 类型检查配置
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    
    // 路径别名
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "wailsjs/*": ["wailsjs/*"]
    },
    
    // 类型定义
    "types": ["vite/client", "node"]
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.d.ts",
    "src/**/*.tsx",
    "src/**/*.vue",
    "wailsjs/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

### 3.3 Vue 3.4+ 实践

#### 组件示例

```vue
<!-- components/UserProfile.vue - 用 Vue 3.4+ 新特性 -->
<template>
  <div class="user-profile">
    <div v-if="loading" class="loading">
      <LoadingSpinner />
    </div>
    
    <div v-else-if="error" class="error">
      <ErrorMessage :message="error" @retry="loadUser" />
    </div>
    
    <div v-else-if="user" class="user-info">
      <h2>{{ user.name }}</h2>
      <p>{{ user.email }}</p>
      
      <!-- 用 defineModel (Vue 3.4+ 新特性) -->
      <input 
        v-model="editableName" 
        @blur="updateUserName"
        placeholder="输入姓名"
      />
      
      <!-- 用 Teleport 把模态框渲染到 body -->
      <Teleport to="body">
        <UserEditModal 
          v-if="showEditModal"
          :user="user"
          @close="showEditModal = false"
          @save="handleSave"
        />
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWailsApi } from '@/composables/useWailsApi'
import { GetUserInfo, UpdateUser } from '@/wailsjs/go/main/App'
import type { User } from '@/types/user'

// Props 和 Emits
interface Props {
  userId: string
}

interface Emits {
  (e: 'user-updated', user: User): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 状态管理
const { data: user, loading, error, execute: loadUser } = useWailsApi(GetUserInfo)
const { execute: updateUser } = useWailsApi(UpdateUser)

const showEditModal = ref(false)
const editableName = ref('')

// 计算属性
const userName = computed(() => user.value?.name || '')

// 方法
const updateUserName = async () => {
  if (!user.value || editableName.value === user.value.name) return
  
  const result = await updateUser({
    ...user.value,
    name: editableName.value
  })
  
  if (result.success) {
    emit('user-updated', result.data!)
  }
}

const handleSave = (updatedUser: User) => {
  user.value = updatedUser
  showEditModal.value = false
  emit('user-updated', updatedUser)
}

// 生命周期
loadUser(props.userId)
</script>
```

## 4. 前后端通信 🔄

### 4.1 API 封装

#### 类型安全的 API 封装

```typescript
// composables/useWailsApi.ts - 类型安全的 API 封装
import { ref, computed } from 'vue'
import type { Ref } from 'vue'

// 类型定义
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

interface ApiState<T> {
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<string | null>
}

// API 状态管理
export function useApiState<T>() {
  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(false)
  const error = ref<string | null>(null)

  return {
    data,
    loading,
    error,
    reset: () => {
      data.value = null
      loading.value = false
      error.value = null
    }
  }
}

// 安全的 API 调用
export async function safeApiCall<T>(
  apiFunction: (...args: any[]) => Promise<T>,
  ...args: any[]
): Promise<ApiResponse<T>> {
  try {
    const result = await apiFunction(...args)
    return { success: true, data: result }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    return { 
      success: false, 
      error: errorMessage,
      code: (error as any)?.code || 'UNKNOWN_ERROR'
    }
  }
}

// Wails API 组合式函数
export function useWailsApi<T>(apiFunction: (...args: any[]) => Promise<T>) {
  const state = useApiState<T>()

  const execute = async (...args: any[]) => {
    state.loading.value = true
    state.error.value = null

    const result = await safeApiCall(apiFunction, ...args)
    
    if (result.success && result.data) {
      state.data.value = result.data
    } else {
      state.error.value = result.error || '操作失败'
    }
    
    state.loading.value = false
    return result
  }

  return {
    ...state,
    execute
  }
}

// 具体 API 实现
export function useUserApi() {
  const { GetUserInfo, ProcessLargeFile, BatchProcess } = await import('@/wailsjs/go/main/App')
  
  const userInfo = useWailsApi(GetUserInfo)
  const fileProcessor = useWailsApi(ProcessLargeFile)
  const batchProcessor = useWailsApi(BatchProcess)

  return {
    userInfo,
    fileProcessor,
    batchProcessor
  }
}
```

### 4.2 事件管理

#### 事件管理器

```typescript
// utils/eventManager.ts - 事件管理器
import { EventsOn, EventsOff, EventsEmit } from '@/wailsjs/runtime/runtime'

class EventManager {
  private handlers = new Map<string, Set<Function>>()
  private onceHandlers = new Map<Function, Function>()

  // 注册事件监听
  on(eventName: string, handler: Function) {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set())
    }
    this.handlers.get(eventName)!.add(handler)
    EventsOn(eventName, handler)
  }

  // 注册一次性事件监听
  once(eventName: string, handler: Function) {
    const wrappedHandler = (...args: any[]) => {
      handler(...args)
      this.off(eventName, wrappedHandler)
    }
    this.onceHandlers.set(handler, wrappedHandler)
    this.on(eventName, wrappedHandler)
  }

  // 移除事件监听
  off(eventName: string, handler: Function) {
    const handlers = this.handlers.get(eventName)
    if (handlers) {
      handlers.delete(handler)
      EventsOff(eventName, handler)
    }
    
    // 清理一次性处理器
    const wrappedHandler = this.onceHandlers.get(handler)
    if (wrappedHandler) {
      EventsOff(eventName, wrappedHandler)
      this.onceHandlers.delete(handler)
    }
  }

  // 移除所有事件监听
  offAll(eventName: string) {
    const handlers = this.handlers.get(eventName)
    if (handlers) {
      handlers.forEach(handler => {
        EventsOff(eventName, handler)
      })
      handlers.clear()
    }
  }

  // 发送事件到后端
  emit(eventName: string, data: any) {
    EventsEmit(eventName, data)
  }
}

export const eventManager = new EventManager()
```

## 5. 性能优化 ⚡

### 5.1 虚拟滚动

```vue
<!-- components/VirtualList.vue - 高性能虚拟滚动 -->
<template>
  <div 
    ref="containerRef" 
    class="virtual-list"
    :style="{ height: containerHeight + 'px' }"
    @scroll="handleScroll"
  >
    <div 
      class="virtual-list-content"
      :style="{ height: totalHeight + 'px' }"
    >
      <div 
        class="virtual-list-items"
        :style="{ transform: `translateY(${offsetY}px)` }"
      >
        <div 
          v-for="item in visibleItems" 
          :key="item.id"
          class="virtual-list-item"
          :style="{ height: itemHeight + 'px' }"
        >
          <slot :item="item" :index="getItemIndex(item)" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useThrottleFn } from '@vueuse/core'

interface Props {
  items: any[]
  itemHeight: number
  containerHeight: number
  overscan?: number // 预渲染的项目数量
}

const props = withDefaults(defineProps<Props>(), {
  overscan: 5
})

const containerRef = ref<HTMLElement>()
const scrollTop = ref(0)

// 计算属性
const totalHeight = computed(() => props.items.length * props.itemHeight)
const visibleCount = computed(() => 
  Math.ceil(props.containerHeight / props.itemHeight) + props.overscan * 2
)
const startIndex = computed(() => 
  Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.overscan)
)
const endIndex = computed(() => 
  Math.min(
    startIndex.value + visibleCount.value, 
    props.items.length
  )
)
const offsetY = computed(() => startIndex.value * props.itemHeight)

const visibleItems = computed(() => 
  props.items.slice(startIndex.value, endIndex.value)
)

// 防抖滚动处理
const handleScroll = useThrottleFn((event: Event) => {
  const target = event.target as HTMLElement
  scrollTop.value = target.scrollTop
}, 16) // 60fps

// 获取项目索引
const getItemIndex = (item: any) => {
  return props.items.findIndex(i => i.id === item.id)
}

// 滚动到指定项目
const scrollToItem = async (index: number) => {
  if (!containerRef.value) return
  
  const targetScrollTop = index * props.itemHeight
  containerRef.value.scrollTop = targetScrollTop
  
  await nextTick()
}

// 暴露方法
defineExpose({
  scrollToItem
})
</script>

<style scoped>
.virtual-list {
  overflow-y: auto;
  position: relative;
}

.virtual-list-content {
  position: relative;
}

.virtual-list-items {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.virtual-list-item {
  box-sizing: border-box;
}
</style>
```

### 5.2 内存管理

```typescript
// utils/memoryManager.ts - 内存管理器
class MemoryManager {
  private cache = new Map<string, any>()
  private maxCacheSize = 100
  private cleanupInterval = 5 * 60 * 1000 // 5分钟清理一次

  constructor() {
    this.startCleanup()
  }

  // 缓存数据
  set(key: string, value: any, ttl = 5 * 60 * 1000) { // 默认5分钟过期
    const item = {
      value,
      timestamp: Date.now(),
      ttl
    }
    
    this.cache.set(key, item)
    
    // 检查缓存大小
    if (this.cache.size > this.maxCacheSize) {
      this.cleanup()
    }
  }

  // 获取缓存数据
  get(key: string) {
    const item = this.cache.get(key)
    if (!item) return null
    
    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return item.value
  }

  // 清理过期数据
  cleanup() {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }

  // 启动定期清理
  private startCleanup() {
    setInterval(() => {
      this.cleanup()
    }, this.cleanupInterval)
  }

  // 清空所有缓存
  clear() {
    this.cache.clear()
  }
}

export const memoryManager = new MemoryManager()
```

## 6. 测试 🧪

### 6.1 测试配置

```typescript
// vitest.config.ts - 测试配置
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.d.ts',
        'wailsjs/'
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'wailsjs': resolve(__dirname, './wailsjs')
    }
  }
})
```

### 6.2 组件测试

```typescript
// tests/components/UserProfile.test.ts
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import UserProfile from '@/components/UserProfile.vue'
import { useAppStore } from '@/stores/app'

// Mock Wails 运行时
vi.mock('@/wailsjs/runtime/runtime', () => ({
  EventsOn: vi.fn(),
  EventsOff: vi.fn(),
  EventsEmit: vi.fn()
}))

// Mock Wails API
vi.mock('@/wailsjs/go/main/App', () => ({
  GetUserInfo: vi.fn(),
  UpdateUser: vi.fn()
}))

describe('UserProfile', () => {
  let pinia: any

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('初始显示加载状态', () => {
    const wrapper = mount(UserProfile, {
      props: { userId: 'test-user' },
      global: { plugins: [pinia] }
    })
    
    expect(wrapper.find('.loading').exists()).toBe(true)
  })

  it('加载完成后显示用户信息', async () => {
    const store = useAppStore()
    store.setUser({ id: '1', name: '张三', email: 'zhangsan@example.com' })
    
    const wrapper = mount(UserProfile, {
      props: { userId: '1' },
      global: { plugins: [pinia] }
    })
    
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.user-name').text()).toBe('张三')
    expect(wrapper.find('.user-email').text()).toBe('zhangsan@example.com')
  })

  it('用户更新时触发事件', async () => {
    const wrapper = mount(UserProfile, {
      props: { userId: '1' },
      global: { plugins: [pinia] }
    })
    
    const store = useAppStore()
    store.setUser({ id: '1', name: '张三', email: 'zhangsan@example.com' })
    
    await wrapper.vm.$nextTick()
    
    // 模拟用户更新
    await wrapper.vm.updateUserName()
    
    expect(wrapper.emitted('user-updated')).toBeTruthy()
  })
})
```

## 7. 安全性 🛡️

### 7.1 内容安全策略

```html
<!-- index.html - 内容安全策略 -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" 
        content="default-src 'self'; 
                 script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
                 style-src 'self' 'unsafe-inline'; 
                 img-src 'self' data: https:; 
                 connect-src 'self' ws: wss:;">
  <title>Wails App</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

### 7.2 输入验证

```typescript
// utils/validation.ts - 输入验证工具
import { z } from 'zod'

// 用户输入验证
export const userSchema = z.object({
  name: z.string().min(1, '姓名不能为空').max(50, '姓名不能超过50个字符'),
  email: z.string().email('邮箱格式不正确'),
  age: z.number().min(0, '年龄不能为负数').max(150, '年龄不能超过150'),
  bio: z.string().max(500, '个人简介不能超过500个字符').optional()
})

// 文件上传验证
export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  maxSize: z.number().default(10 * 1024 * 1024), // 10MB
  allowedTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'image/gif'])
})

// 验证函数
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(error.errors.map(e => e.message).join(', '))
    }
    throw error
  }
}

// 数据清理
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // 移除 HTML 标签
    .trim()
    .slice(0, 1000) // 限制长度
}
```

## 8. 实战应用 🎯

### 8.1 完整项目示例

#### 状态管理 (Pinia)

```typescript
// stores/app.ts - 状态管理
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useWailsApi } from '@/composables/useWailsApi'
import { GetUserInfo, GetSettings } from '@/wailsjs/go/main/App'
import type { User, Settings } from '@/types'

export const useAppStore = defineStore('app', () => {
  // 状态
  const user = ref<User | null>(null)
  const settings = ref<Settings | null>(null)
  const theme = ref<'light' | 'dark'>('light')
  const sidebarCollapsed = ref(false)

  // API 状态
  const { loading: userLoading, error: userError, execute: loadUser } = useWailsApi(GetUserInfo)
  const { loading: settingsLoading, execute: loadSettings } = useWailsApi(GetSettings)

  // 计算属性
  const isAuthenticated = computed(() => user.value !== null)
  const userName = computed(() => user.value?.name || '访客')
  const isDarkMode = computed(() => theme.value === 'dark')

  // 动作
  const initializeApp = async () => {
    await Promise.all([
      loadUser(),
      loadSettings()
    ])
  }

  const setUser = (newUser: User) => {
    user.value = newUser
  }

  const clearUser = () => {
    user.value = null
  }

  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    // 保存到本地存储
    localStorage.setItem('theme', theme.value)
  }

  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  // 持久化
  const loadPersistedState = () => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark'
    if (savedTheme) {
      theme.value = savedTheme
    }
  }

  return {
    // 状态
    user,
    settings,
    theme,
    sidebarCollapsed,
    
    // 加载状态
    userLoading,
    userError,
    settingsLoading,
    
    // 计算属性
    isAuthenticated,
    userName,
    isDarkMode,
    
    // 动作
    initializeApp,
    setUser,
    clearUser,
    toggleTheme,
    toggleSidebar,
    loadPersistedState
  }
})
```

### 8.2 错误处理

```typescript
// utils/errorHandler.ts - 错误处理
import { systemIntegration } from './systemIntegration'

interface ErrorInfo {
  message: string
  stack?: string
  context: string
  timestamp: string
  userAgent: string
  url: string
  componentName?: string
  props?: Record<string, any>
}

class ErrorHandler {
  private errorQueue: ErrorInfo[] = []
  private maxQueueSize = 50
  private isReporting = false

  constructor() {
    this.setupGlobalHandlers()
  }

  private setupGlobalHandlers() {
    // 未处理的 Promise 错误
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, '未处理的 Promise 错误')
    })

    // 全局错误
    window.addEventListener('error', (event) => {
      this.handleError(event.error, '全局错误')
    })

    // Vue 错误处理
    if (window.Vue) {
      window.Vue.config.errorHandler = (error: Error, vm: any, info: string) => {
        this.handleError(error, `Vue 错误: ${info}`, {
          componentName: vm?.$options?.name,
          props: vm?.$props
        })
      }
    }
  }

  private handleError(error: Error | string, context: string, metadata?: any) {
    const errorInfo: ErrorInfo = {
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...metadata
    }

    // 记录错误
    systemIntegration.error(`[${context}] ${errorInfo.message}`)
    console.error('错误详情:', errorInfo)

    // 添加到队列
    this.addToQueue(errorInfo)

    // 显示用户友好的错误信息
    this.showUserFriendlyError(errorInfo)
  }

  private addToQueue(errorInfo: ErrorInfo) {
    this.errorQueue.push(errorInfo)
    
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift()
    }

    // 批量报告错误
    this.reportErrors()
  }

  private async reportErrors() {
    if (this.isReporting || this.errorQueue.length === 0) return

    this.isReporting = true
    
    try {
      const errorsToReport = [...this.errorQueue]
      this.errorQueue = []

      // 发送到后端
      await this.sendErrorsToBackend(errorsToReport)
    } catch (error) {
      console.error('报告错误失败:', error)
      // 将错误重新加入队列
      this.errorQueue.unshift(...this.errorQueue)
    } finally {
      this.isReporting = false
    }
  }

  private async sendErrorsToBackend(errors: ErrorInfo[]) {
    const { EventsEmit } = await import('@/wailsjs/runtime/runtime')
    EventsEmit('error-report', { errors, timestamp: new Date().toISOString() })
  }

  private showUserFriendlyError(errorInfo: ErrorInfo) {
    const message = this.getUserFriendlyMessage(errorInfo)
    
    // 显示错误通知
    this.showNotification('error', message)
  }

  private getUserFriendlyMessage(errorInfo: ErrorInfo): string {
    const { message } = errorInfo
    
    if (message.includes('network') || message.includes('fetch')) {
      return '网络连接失败，请检查网络设置后重试'
    }
    if (message.includes('permission') || message.includes('access')) {
      return '权限不足，请检查文件或目录权限'
    }
    if (message.includes('timeout')) {
      return '操作超时，请稍后重试'
    }
    
    return '操作失败，请稍后重试。如果问题持续存在，请联系技术支持。'
  }

  private showNotification(type: 'error' | 'warning' | 'info', message: string) {
    // 实现通知系统
    console.warn(`[${type.toUpperCase()}] ${message}`)
  }
}

export const errorHandler = new ErrorHandler()
```

## 总结 🎉

这篇文章介绍了 Wails 前端开发的主要内容：

### 🎯 重点内容

1. **技术栈**: 
   - Vue 3.4+ 新特性和性能提升
   - TypeScript 5.3+ 类型安全
   - Vite 5.0+ 快速构建
   - Pinia 2.1+ 状态管理

2. **开发技巧**: 
   - 组合式函数和 API 封装
   - 虚拟滚动和性能优化
   - 完整的测试方案
   - 安全性考虑

3. **架构设计**: 
   - 类型安全的通信
   - 清晰的项目结构
   - 错误处理和监控
   - 内存管理

### 🚀 实践要点

- **类型安全**: 用 TypeScript 减少 bug
- **性能优化**: 虚拟滚动、代码分割、内存管理
- **错误处理**: 统一的错误处理，用户友好的提示
- **测试覆盖**: 完整的单元测试和集成测试
- **安全性**: CSP 配置、输入验证、数据清理

### ⚠️ 常见问题和解决方案

根据最新的 Wails 版本和社区反馈：

#### Windows 平台
- **拖拽功能**: 正确配置 CSS 拖拽区域
- **窗口隐藏**: 用 `Minimised: true` 替代 `Hidden: true`
- **DPI 感知**: 检查 DPI 设置

#### macOS 平台
- **毛玻璃效果**: 用 `Backdrop: 'transparent'` 替代复杂配置
- **透明窗口**: 避免重复设置 `NSGlassEffectViewStyle`

#### Linux 平台
- **系统托盘**: 手动处理窗口显示
- **WebKit 检测**: 验证依赖状态


### 🔗 相关资源

- [Wails 官方文档](https://wails.io/docs/) - 完整开发指南
- [Vue 3.4 新特性](https://blog.vuejs.org/posts/vue-3-4.html) - 最新功能介绍
- [TypeScript 5.3 更新](https://devblogs.microsoft.com/typescript/announcing-typescript-5-3/) - 类型系统增强
- [Vite 5.0 发布](https://vitejs.dev/blog/announcing-vite5) - 构建工具升级

这些技术为构建高质量的 Wails 应用提供了完整的前端开发方案。下一篇文章我们会聊聊后端开发技术栈和系统集成。
