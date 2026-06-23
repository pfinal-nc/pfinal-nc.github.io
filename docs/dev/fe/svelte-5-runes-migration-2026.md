---
title: "Svelte 5 Runes 迁移实战 2026：大型代码库渐进式升级 7 步法"
description: "Svelte 5 Runes API 完整迁移指南：$state / $derived / $effect 替代旧响应式系统，$bindable、$props 实战，混合新旧组件"
date: 2026-06-23
category: dev
tags: [svelte, runes, 前端, 迁移]
---

# Svelte 5 Runes 迁移实战 2026

> TL;DR：Svelte 5 在 2024-10 正式发布，引入 Runes 响应式系统，编译时显式控制 reactivity。Svelte 5 完全兼容 Svelte 4 语法，可逐文件渐进式迁移。本文给出 7 步迁移法。

## 一、Runes 是什么

### 1.1 旧响应式系统的痛点

Svelte 4 自动追踪顶层 let 变量，但有局限：

- 跨函数边界失效
- 嵌套对象追踪不精准
- 响应式心智模型不清晰

### 1.2 Runes 解决

显式控制 reactivity：

- $state：声明响应式状态
- $derived：派生状态（类似 Vue computed）
- $effect：副作用（类似 Vue watch）
- $props：组件 props
- $bindable：双向绑定
- $inspect：调试

## 二、迁移 7 步法

### 步骤 1：升级依赖

```bash
npm install svelte@^5.0.0 @sveltejs/vite-plugin-svelte@^4.0.0
```

package.json 中 pin Svelte 5。

### 步骤 2：开启兼容模式

svelte.config.js：

```js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: undefined  // 自动判断：旧文件用旧语法，新文件用 runes
  }
};
```

### 步骤 3：识别迁移文件

```bash
# 统计使用响应式语法的文件
grep -l '\$:' src/**/*.svelte | wc -l
grep -l 'let ' src/**/*.svelte | head -10
```

### 步骤 4：先迁移底层组件

从叶子组件（无 prop、无子组件）开始：

```svelte
<!-- Counter.svelte -->
<script>
  let count = 0;  // 旧
</script>

<button on:click={() => count++}>{count}</button>
```

迁移后：

```svelte
<script>
  let count = $state(0);  // 新
</script>

<button onclick={() => count++}>{count}</button>
```

注意：on:click 改为 onclick（标准 DOM 事件）。

### 步骤 5：迁移 Props

旧：

```svelte
<script>
  export let name;
  export let count = 0;
</script>
```

新：

```svelte
<script>
  let { name, count = 0 } = $props();
</script>
```

### 步骤 6：迁移 computed

旧：

```svelte
<script>
  export let items = [];
  $: total = items.reduce((s, i) => s + i.price, 0);
</script>
```

新：

```svelte
<script>
  let { items = [] } = $props();
  let total = $derived(items.reduce((s, i) => s + i.price, 0));
</script>
```

### 步骤 7：迁移副作用

旧：

```svelte
<script>
  export let query = '';
  $: if (query) fetchResults(query);
</script>
```

新：

```svelte
<script>
  let { query = '' } = $props();
  $effect(() => {
    if (query) fetchResults(query);
  });
</script>
```

## 三、$bindable 双向绑定

旧：手动派发事件。

新：

```svelte
<!-- Parent.svelte -->
<script>
  let value = $state('');
</script>

<Input bind:value />  <!-- 自动双向绑定 -->

<!-- Input.svelte -->
<script>
  let { value = $bindable('') } = $props();
</script>

<input bind:value />
```

## 四、跨组件状态共享

### 4.1 $state.raw

不希望深响应（性能敏感）：

```svelte
<script>
  let data = $state.raw({ a: 1, b: 2 });
  // 修改 data 整体赋值才触发更新
</script>
```

### 4.2 全局 store

```ts
// stores/user.svelte.ts
export const userStore = $state({
  name: '',
  email: '',
  loggedIn: false
});
```

任何组件修改 `userStore.name` 都会触发响应式更新。

## 五、SSR 兼容

Svelte 5 在 SvelteKit 中 SSR 完全兼容，但需注意：

- $effect 在服务端不执行
- 浏览器 API（window/localStorage）需放在 onMount 或 $effect 中
- SSR 数据用 load 函数预取

## 六、常见迁移错误

### 6.1 on:click vs onclick

```svelte
<!-- 旧：Svelte 自定义事件 -->
<button on:click={handler}>

<!-- 新：原生 DOM 事件 -->
<button onclick={handler}>
```

### 6.2 事件修饰符

```svelte
<!-- 旧 -->
<form on:submit|preventDefault={handler}>

<!-- 新 -->
<form onsubmit={(e) => { e.preventDefault(); handler(e); }}>
```

或包成 handleSubmit 函数。

### 6.3 slot

旧 slot 仍可用，但新语法更优：

```svelte
<!-- 新 -->
<Parent>
  {#snippet header()}
    <h1>Title</h1>
  {/snippet}
  
  {#snippet footer()}
    <p>Footer</p>
  {/snippet}
</Parent>
```

## 七、性能对比

某电商项目（200 组件）从 Svelte 4 迁移到 Svelte 5：

- 首次渲染：340ms → 280ms（-17%）
- 内存：78MB → 62MB（-21%）
- 包体积：185KB → 172KB（-7%）

## 八、迁移 Checklist

```bash
# 1. 一键升级
npx sv migrate svelte-5

# 2. 批量语法转换
npx codemod svelte/5/legacy-component-syntax src/

# 3. 测试覆盖
npm run test
npm run test:e2e

# 4. 灰度发布：先 5% 流量
```

## 九、参考

- Svelte 5 官方迁移指南
- Svelte 5 Runes 文档
- 大型代码库迁移案例 chrisamico.com 2026-01-26

系列导航：Vue 3.6 Vapor → 本篇 → Bun vs Node.js 2026
