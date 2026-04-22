---
title: "基于 Wails 和 Vue.js 打造跨平台桌面应用"
description: "详细介绍如何使用 Wails 框架结合 Vue.js 开发跨平台桌面应用，包括项目搭建、组件开发、后端通信等完整流程。"
keywords:
  - Wails
  - Vue.js
  - 桌面应用
  - 跨平台
  - Go
author: PFinal南丞
date: 2026-04-22
tags:
  - golang
  - wails
  - vue
  - desktop
---

# 基于 Wails 和 Vue.js 打造跨平台桌面应用

> Wails 让你可以使用 Go + Vue.js 构建轻量级、高性能的桌面应用。

## 一、项目初始化

### 1.1 安装 Wails

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### 1.2 创建项目

```bash
wails init -n mydesktopapp -t vue-ts
cd mydesktopapp
```

### 1.3 项目结构

```
mydesktopapp/
├── backend/           # Go 后端代码
│   └── app.go
├── frontend/          # Vue 前端代码
│   ├── src/
│   │   ├── App.vue
│   │   ├── main.ts
│   │   └── components/
│   └── package.json
├── wails.json        # Wails 配置
└── go.mod
```

## 二、后端开发

### 2.1 应用结构

```go
package backend

import (
    "context"
    "runtime"
)

// App 结构体
type App struct {
    ctx context.Context
}

// NewApp 创建应用实例
func NewApp() *App {
    return &App{}
}

// startup 在应用启动时调用
func (a *App) startup(ctx context.Context) {
    a.ctx = ctx
}

// GetSystemInfo 获取系统信息
func (a *App) GetSystemInfo() SystemInfo {
    return SystemInfo{
        OS:        runtime.GOOS,
        Arch:      runtime.GOARCH,
        CPUs:      runtime.NumCPU(),
        GoVersion: runtime.Version(),
    }
}

type SystemInfo struct {
    OS        string `json:"os"`
    Arch      string `json:"arch"`
    CPUs      int    `json:"cpus"`
    GoVersion string `json:"go_version"`
}
```

### 2.2 添加业务方法

```go
// FileService 文件服务
func (a *App) SelectFile() (string, error) {
    selection, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
        Title: "选择文件",
        Filters: []runtime.FileFilter{
            {
                DisplayName: "文本文件 (*.txt)",
                Pattern:     "*.txt",
            },
        },
    })
    return selection, err
}

// SaveFile 保存文件
func (a *App) SaveFile(content string) error {
    filename, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
        Title:           "保存文件",
        DefaultFilename: "document.txt",
    })
    if err != nil {
        return err
    }
    
    return os.WriteFile(filename, []byte(content), 0644)
}
```

## 三、前端开发

### 3.1 主应用组件

```vue
<template>
  <div id="app" class="app">
    <header class="app-header">
      <h1>My Desktop App</h1>
    </header>
    
    <main class="app-main">
      <SystemInfo />
      <FileManager />
    </main>
  </div>
</template>

<script setup>
import SystemInfo from './components/SystemInfo.vue'
import FileManager from './components/FileManager.vue'
</script>

<style>
.app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.app-header {
  background: #2c3e50;
  color: white;
  padding: 1rem;
  text-align: center;
}

.app-main {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
```

### 3.2 系统信息组件

```vue
<template>
  <div class="system-info">
    <h2>系统信息</h2>
    <div class="info-grid">
      <div class="info-item">
        <span class="label">操作系统:</span>
        <span class="value">{{ info.os }}</span>
      </div>
      <div class="info-item">
        <span class="label">架构:</span>
        <span class="value">{{ info.arch }}</span>
      </div>
      <div class="info-item">
        <span class="label">CPU 核心:</span>
        <span class="value">{{ info.cpus }}</span>
      </div>
      <div class="info-item">
        <span class="label">Go 版本:</span>
        <span class="value">{{ info.go_version }}</span>
      </div>
    </div>
    
    <button @click="refreshInfo" class="btn-primary">
      刷新
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const info = ref({})

const refreshInfo = async () => {
  info.value = await window.go.backend.App.GetSystemInfo()
}

onMounted(refreshInfo)
</script>

<style scoped>
.system-info {
  background: #f5f5f5;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin: 1rem 0;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  background: white;
  border-radius: 4px;
}

.btn-primary {
  background: #3498db;
  color: white;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary:hover {
  background: #2980b9;
}
</style>
```

### 3.3 文件管理组件

```vue
<template>
  <div class="file-manager">
    <h2>文件管理</h2>
    
    <div class="actions">
      <button @click="selectFile" class="btn-secondary">
        选择文件
      </button>
      <button @click="saveFile" class="btn-secondary">
        保存文件
      </button>
    </div>
    
    <textarea 
      v-model="content" 
      class="file-content"
      placeholder="文件内容..."
      rows="10"
    ></textarea>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const content = ref('')

const selectFile = async () => {
  const filename = await window.go.backend.App.SelectFile()
  if (filename) {
    // 读取文件内容
    const response = await fetch(`file://${filename}`)
    content.value = await response.text()
  }
}

const saveFile = async () => {
  await window.go.backend.App.SaveFile(content.value)
}
</script>

<style scoped>
.file-manager {
  background: #f5f5f5;
  padding: 1.5rem;
  border-radius: 8px;
}

.actions {
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
}

.file-content {
  width: 100%;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: monospace;
}
</style>
```

## 四、构建与发布

### 4.1 开发模式

```bash
wails dev
```

### 4.2 构建应用

```bash
# Windows
wails build -platform windows

# macOS
wails build -platform darwin

# Linux
wails build -platform linux
```

### 4.3 构建配置

```json
{
  "$schema": "https://wails.io/schemas/config.v2.json",
  "name": "mydesktopapp",
  "outputfilename": "MyDesktopApp",
  "frontend": {
    "dir": "./frontend",
    "install": "npm install",
    "build": "npm run build",
    "package": "npm"
  },
  "author": {
    "name": "PFinal",
    "email": "pfinal@example.com"
  }
}
```

## 五、总结

Wails + Vue.js 的组合让桌面应用开发变得简单高效。Go 处理底层逻辑，Vue 构建界面，各取所长。
