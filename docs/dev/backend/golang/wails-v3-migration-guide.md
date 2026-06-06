---
title: "Go Wails v3 实战：从 v2 迁移到 v3 完整指南"
date: "2026-06-07"
tags:
  - golang
  - Go
  - Wails
keywords:
  - Wails v3
  - Wails
  - Go桌面应用
  - Go GUI
  - Electron替代
  - 跨平台桌面
category:
  - Golang
description: "Wails v3 正式发布，带来全新 API 设计、ESM 模块、Linux WebKit 升级等重大变化。本文从架构差异、迁移步骤、新特性实战到常见坑点，带你从 v2 平滑过渡到 v3。"
---

# Go Wails v3 实战：从 v2 迁移到 v3 完整指南

> Wails v3 于 2026 年 3 月正式发布，API 已趋于稳定。相比 v2，v3 带来了全新的项目结构、ESM 原生支持、改进的窗口管理和通知系统。本文帮你从 v2 平滑迁移到 v3。

## 目录

- [一、Wails v3 核心变化概览](#一wails-v3-核心变化概览)
- [二、v2 vs v3 架构对比](#二v2-vs-v3-架构对比)
- [三、环境准备与安装](#三环境准备与安装)
- [四、创建第一个 v3 应用](#四创建第一个-v3-应用)
- [五、前端绑定：ESM 模块](#五前端绑定esm-模块)
- [六、后端绑定：Go API](#六后端绑定go-api)
- [七、窗口管理新 API](#七窗口管理新-api)
- [八、系统通知](#八系统通知)
- [九、从 v2 迁移实战](#九从-v2-迁移实战)
- [十、常见问题与踩坑](#十常见问题与踩坑)
- [十一、性能与最佳实践](#十一性能与最佳实践)

---

## 一、Wails v3 核心变化概览

| 变化 | v2 | v3 |
|------|-----|-----|
| JS 运行时 | 全局 `window.wails` | ESM 模块导入 |
| script 标签 | 普通 `<script>` | 必须 `type="module"` |
| 前端框架 | Vue/React/Svelte/Preact | Vue/React/Svelte/Preact |
| 窗口 API | `wails.Window` | 全新 `Window` 接口 |
| 事件系统 | `wails.EventsEmit/On` | 全新事件 API |
| 通知 | 无内置支持 | 内置跨平台通知 |
| 自动更新 | 无 | 内置更新器 |
| Linux WebKit | webkitgtk 4.0 | webkit2gtk 4.1 |
| 应用生命周期 | `OnStartup/OnShutdown` | `OnStartup/OnShutdown/OnBeforeClose` |
| CLI 命令 | `wails dev/build` | `wails3 dev/build`（或 `wails`） |

---

## 二、v2 vs v3 架构对比

### 2.1 项目结构变化

```
# v2 项目结构
myapp/
├── main.go
├── app.go
├── frontend/
│   ├── index.html
│   ├── src/
│   └── wails.js          # 自动生成
├── build/
│   └── appicon.png
└── wails.json

# v3 项目结构
myapp/
├── main.go
├── app.go
├── frontend/
│   ├── index.html
│   └── src/
├── build/
│   └── appicon.png
├── wails.json
└── embed/
    └── frontend/          # 嵌入的前端资源
```

### 2.2 Go 代码结构对比

```go
// ===== v2 风格 =====
package main

import (
    "github.com/wailsapp/wails/v2"
    "github.com/wailsapp/wails/v2/pkg/options"
)

func main() {
    app := &App{}

    wails.Run(&options.App{
        Title:  "My App",
        Width:  1024,
        Height: 768,
        AssetServer: &assetserver.Options{
            Assets: http.Dir("./frontend/dist"),
        },
        OnStartup:  app.startup,
        OnShutdown: app.shutdown,
        Bind: []interface{}{
            app,
        },
    })
}

// ===== v3 风格 =====
package main

import (
    "embed"
    "net/http"

    "github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
    app := application.New(application.Options{
        Name:        "My App",
        Description: "A demo application",
        Assets: application.AssetOptions{
            Handler: http.FileServer(http.FS(assets)),
        },
        Width:  1024,
        Height: 768,
    })

    app.NewWebviewWindow()

    myApp := NewApp()
    app.Bind(myApp)

    err := app.Run()
    if err != nil {
        panic(err)
    }
}
```

---

## 三、环境准备与安装

### 3.1 安装 Wails CLI

```bash
# 安装 Wails v3 CLI
go install github.com/wailsapp/wails/v3/cmd/wails3@latest

# 验证安装
wails3 version
# 或
wails version

# 检查依赖
wails3 doctor
```

### 3.2 系统依赖

**macOS：**
```bash
# macOS 自带 Xcode 工具链，通常无需额外安装
xcode-select --install
```

**Linux (Ubuntu/Debian)：**
```bash
# Wails v3 需要 webkit2gtk 4.1（重要变化！）
sudo apt install -y libwebkit2gtk-4.1-dev \
    build-essential \
    pkg-config \
    libssl-dev

# 注意：v2 使用 webkitgtk 4.0
# sudo apt install libwebkit2gtk-4.0-dev  # ← v2 的依赖，v3 不再需要
```

**Windows：**
```powershell
# 需要 WebView2 Runtime（Windows 10/11 通常已预装）
# 需要 MSVC 构建工具
winget install Microsoft.VisualStudio.2022.BuildTools
```

---

## 四、创建第一个 v3 应用

### 4.1 使用模板创建

```bash
# 使用 Vue + TypeScript 模板
wails3 init -n myapp -t vue-ts

# 或使用 React 模板
wails3 init -n myapp -t react-ts

# 或使用纯 HTML 模板（无框架）
wails3 init -n myapp -t vanilla

# 进入项目目录
cd myapp

# 启动开发模式
wails3 dev
```

### 4.2 手动创建最小项目

**main.go：**

```go
package main

import (
    "embed"
    "fmt"
    "net/http"

    "github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

type App struct {
    ctx application.Context
}

func NewApp() *App {
    return &App{}
}

func (a *App) Greet(name string) string {
    return fmt.Sprintf("Hello, %s! Welcome to Wails v3!", name)
}

func main() {
    app := application.New(application.Options{
        Name:        "Hello Wails v3",
        Description: "A minimal Wails v3 application",
        Width:       800,
        Height:      600,
        Assets: application.AssetOptions{
            Handler: http.FileServer(http.FS(assets)),
        },
    })

    myApp := NewApp()
    app.Bind(myApp)

    app.NewWebviewWindow()
    app.Run()
}
```

**frontend/index.html：**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wails v3 App</title>
    <!-- v3 关键变化：script 必须是 type="module" -->
    <script type="module" src="/src/main.js"></script>
</head>
<body>
    <div id="app">
        <h1>Wails v3 Demo</h1>
        <input type="text" id="nameInput" placeholder="输入你的名字" />
        <button id="greetBtn">打招呼</button>
        <p id="result"></p>
    </div>
</body>
</html>
```

**frontend/src/main.js：**

```javascript
// v3 关键变化：使用 ESM 模块导入
// v2 方式（已废弃）: window.wails.CallByName(...)
// v3 方式：从 @wailsio/runtime 导入

import { CallByName } from '@wailsio/runtime';

const nameInput = document.getElementById('nameInput');
const greetBtn = document.getElementById('greetBtn');
const result = document.getElementById('result');

greetBtn.addEventListener('click', async () => {
    const name = nameInput.value || 'World';
    try {
        // v3 调用方式
        const response = await CallByName('App.Greet', name);
        result.textContent = response;
    } catch (err) {
        result.textContent = 'Error: ' + err.message;
    }
});
```

---

## 五、前端绑定：ESM 模块

### 5.1 v2 → v3 调用方式变化

```javascript
// ===== v2 调用方式（已废弃）=====

// 直接调用 Go 方法
const result = await window.wails.CallByName('App.Greet', 'World');

// 事件系统
window.wails.EventsOn('my-event', (data) => { ... });
window.wails.EventsEmit('my-event', { key: 'value' });

// 窗口操作
window.wails.WindowSetTitle('New Title');

// ===== v3 调用方式（推荐）=====

import { CallByName, EventsOn, EventsEmit, WindowSetTitle } from '@wailsio/runtime';

// 调用 Go 方法（方式不变，但通过 ESM 导入）
const result = await CallByName('App.Greet', 'World');

// 事件系统
EventsOn('my-event', (data) => { ... });
EventsEmit('my-event', { key: 'value' });

// 窗口操作
WindowSetTitle('New Title');
```

### 5.2 Vue 3 + v3 集成

```javascript
// frontend/src/services/wails.js

import { CallByName, EventsOn, EventsEmit } from '@wailsio/runtime';

export const wailsService = {
    async greet(name) {
        return await CallByName('App.Greet', name);
    },

    async getSystemInfo() {
        return await CallByName('System.GetInfo');
    },

    onFileDrop(callback) {
        return EventsOn('file-drop', callback);
    },

    onProgress(callback) {
        return EventsOn('task-progress', callback);
    },

    emitAction(action, payload) {
        EventsEmit('user-action', { action, payload });
    },
};
```

```vue
<!-- frontend/src/components/GreetForm.vue -->
<script setup>
import { ref } from 'vue';
import { wailsService } from '../services/wails';

const name = ref('');
const message = ref('');
const loading = ref(false);

async function handleGreet() {
    loading.value = true;
    try {
        message.value = await wailsService.greet(name.value);
    } catch (err) {
        message.value = 'Error: ' + err.message;
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="greet-form">
        <input v-model="name" placeholder="输入名字" @keyup.enter="handleGreet" />
        <button :disabled="loading" @click="handleGreet">
            {{ loading ? '处理中...' : '打招呼' }}
        </button>
        <p v-if="message">{{ message }}</p>
    </div>
</template>
```

---

## 六、后端绑定：Go API

### 6.1 绑定方法

```go
package main

import (
    "context"
    "fmt"
    "time"

    "github.com/wailsapp/wails/v3/pkg/application"
)

type App struct {
    ctx application.Context
}

// ===== 基础方法绑定 =====

// 无参数方法
func (a *App) GetVersion() string {
    return "1.0.0"
}

// 带参数方法
func (a *App) Add(x, y int) int {
    return x + y
}

// 多返回值（错误处理）
func (a *App) ReadFile(path string) (string, error) {
    if path == "" {
        return "", fmt.Errorf("路径不能为空")
    }
    data, err := os.ReadFile(path)
    if err != nil {
        return "", err
    }
    return string(data), nil
}

// ===== 结构体返回 =====

type UserInfo struct {
    Name      string    `json:"name"`
    Email     string    `json:"email"`
    CreatedAt time.Time `json:"created_at"`
}

func (a *App) GetUser(id int) (*UserInfo, error) {
    // 模拟数据库查询
    return &UserInfo{
        Name:      "Alice",
        Email:     "alice@example.com",
        CreatedAt: time.Now(),
    }, nil
}

// ===== 列表返回 =====

func (a *App) ListUsers() ([]UserInfo, error) {
    return []UserInfo{
        {Name: "Alice", Email: "alice@example.com", CreatedAt: time.Now()},
        {Name: "Bob", Email: "bob@example.com", CreatedAt: time.Now()},
    }, nil
}

// ===== 生命周期钩子 =====

func (a *App) startup(ctx context.Context) {
    a.ctx = ctx
    fmt.Println("应用启动")
}

func (a *App) shutdown(ctx context.Context) {
    fmt.Println("应用关闭")
}

// v3 新增：关闭前确认
func (a *App) OnBeforeClose(ctx context.Context) (bool, error) {
    // 返回 true 阻止关闭，false 允许关闭
    // 可用于提示用户保存未保存的数据
    hasUnsaved := checkUnsavedChanges()
    if hasUnsaved {
        // 显示保存提示（前端处理）
        EventsEmit(ctx, "before-close", map[string]interface{}{
            "hasUnsaved": true,
        })
        return true, nil // 阻止关闭，等待用户确认
    }
    return false, nil // 允许关闭
}
```

### 6.2 事件系统

```go
// Go 端发送事件
func (a *App) StartTask(taskID string) {
    go func() {
        // 模拟长时间任务
        steps := []string{"初始化", "处理数据", "生成报告", "完成"}
        for i, step := range steps {
            time.Sleep(2 * time.Second)

            // v3 发送事件
            application.EventsEmit(a.ctx, "task-progress", map[string]interface{}{
                "taskId": taskID,
                "step":   step,
                "percent": (i + 1) * 25,
            })
        }

        application.EventsEmit(a.ctx, "task-completed", map[string]interface{}{
            "taskId": taskID,
            "status": "success",
        })
    }()
}

// Go 端监听事件
func (a *App) OnUserAction(callback func(action string, payload map[string]interface{})) {
    application.EventsOn(a.ctx, "user-action", func(data ...interface{}) {
        if len(data) > 0 {
            if m, ok := data[0].(map[string]interface{}); ok {
                action, _ := m["action"].(string)
                callback(action, m)
            }
        }
    })
}
```

---

## 七、窗口管理新 API

### 7.1 窗口配置

```go
package main

import (
    "github.com/wailsapp/wails/v3/pkg/application"
)

func main() {
    app := application.New(application.Options{
        Name:  "Multi-Window App",
        Width: 1024,
        Height: 768,
    })

    // 主窗口
    mainWin := app.NewWebviewWindow(application.WebviewWindowOptions{
        Title:     "主窗口",
        Width:     1024,
        Height:    768,
        MinWidth:  800,
        MinHeight: 600,
        MaxWidth:  1920,
        MaxHeight: 1080,
        Center:    true,
        StartState: application.Normal, // Normal / Maximized / Minimized / Fullscreen
        AlwaysOnTop: false,
        Resizable:  true,
        DisableResize: false,
        Frameless:  false,
        FullscreenEnabled: true,
    })

    // v3 新增：可轻松创建多个窗口
    settingsWin := app.NewWebviewWindow(application.WebviewWindowOptions{
        Title:  "设置",
        Width:  600,
        Height: 400,
        URL:    "/settings.html",
    })

    app.Bind(&App{mainWindow: mainWin, settingsWindow: settingsWin})
    app.Run()
}
```

### 7.2 运行时窗口操作

```go
// Go 端控制窗口
func (a *App) MinimizeWindow() {
    a.mainWindow.Minimise()
}

func (a *App) MaximizeWindow() {
    a.mainWindow.Maximise()
}

func (a *App) SetFullscreen(fullscreen bool) {
    a.mainWindow.SetFullscreen(fullscreen)
}

func (a *App) CenterWindow() {
    a.mainWindow.Center()
}

// v3: Position() 方法（原 AbsolutePosition() 已重命名）
func (a *App) MoveWindow(x, y int) {
    a.mainWindow.Position(x, y) // v3 新方法名
}
```

```javascript
// 前端控制窗口
import { WindowMinimise, WindowMaximise, WindowSetFullscreen, WindowCenter } from '@wailsio/runtime';

// 最小化
WindowMinimise();

// 最大化/还原
WindowMaximise();

// 全屏切换
WindowSetFullscreen(true);

// 居中
WindowCenter();
```

---

## 八、系统通知

### 8.1 v3 内置通知 API

```go
package main

import (
    "time"

    "github.com/wailsapp/wails/v3/pkg/application"
    "github.com/wailsapp/wails/v3/pkg/notifications"
)

type App struct {
    ctx application.Context
}

// 简单通知
func (a *App) SendNotification(title, body string) error {
    return notifications.Notify(a.ctx, notifications.Notification{
        Title: title,
        Body:  body,
    })
}

// 带图标的通知
func (a *App) NotifyDownloadComplete(filename string) {
    notifications.Notify(a.ctx, notifications.Notification{
        Title:    "下载完成",
        Body:     fmt.Sprintf("%s 已下载完成", filename),
        IconPath: "build/appicon.png",
    })
}

// 定时提醒
func (a *App) ScheduleReminder(title, body string, delay time.Duration) {
    go func() {
        time.Sleep(delay)
        notifications.Notify(a.ctx, notifications.Notification{
            Title: title,
            Body:  body,
        })
    }()
}
```

```javascript
// 前端发送通知
import { Notify } from '@wailsio/runtime';

Notify({
    title: '操作成功',
    body: '文件已保存到本地',
});
```

---

## 九、从 v2 迁移实战

### 9.1 迁移步骤清单

```
迁移 Checklist：
├── 1. 升级 Wails CLI 到 v3
├── 2. 更新 go.mod 依赖
├── 3. 修改 main.go 应用初始化
├── 4. 更新前端 script 标签为 type="module"
├── 5. 替换 window.wails 调用为 ESM 导入
├── 6. 更新窗口 API 调用
├── 7. 更新事件系统 API
├── 8. 适配 embed.FS 资源嵌入
├── 9. 更新 wails.json 配置
└── 10. 测试构建与运行
```

### 9.2 依赖更新

```bash
# 1. 更新 go.mod
go get github.com/wailsapp/wails/v3@latest
go mod tidy

# 2. 如果使用 Go 前端框架绑定
# v2: github.com/wailsapp/wails/v2/pkg/binding
# v3: 使用 application.Bind() 替代
```

### 9.3 go.mod 变化

```go
// v2 依赖
// require github.com/wailsapp/wails/v2 v2.x.x

// v3 依赖
// require github.com/wailsapp/wails/v3 v3.x.x
```

### 9.4 常见迁移代码对照表

| 场景 | v2 代码 | v3 代码 |
|------|---------|---------|
| 初始化 | `wails.Run(&options.App{...})` | `app := application.New(...); app.Run()` |
| 资源嵌入 | `AssetServer: &assetserver.Options{Assets: ...}` | `Assets: application.AssetOptions{Handler: ...}` |
| 绑定方法 | `Bind: []interface{}{app}` | `app.Bind(myApp)` |
| 前端调用 | `window.wails.CallByName(...)` | `import { CallByName } from '@wailsio/runtime'` |
| 窗口标题 | `runtime.WindowSetTitle(...)` | `import { WindowSetTitle } from '@wailsio/runtime'` |
| 绝对定位 | `runtime.WindowSetPosition(x, y)` | `window.Position(x, y)` |
| 关闭确认 | 无 | `OnBeforeClose(ctx) (bool, error)` |

---

## 十、常见问题与踩坑

### 10.1 ESM 模块问题

**问题：** `Cannot use import statement outside a module`

**原因：** script 标签缺少 `type="module"`

```html
<!-- ❌ 错误 -->
<script src="/src/main.js"></script>

<!-- ✅ 正确 -->
<script type="module" src="/src/main.js"></script>
```

### 10.2 Linux WebKit 版本

**问题：** Linux 上编译失败或运行时崩溃

**原因：** v3 需要 `webkit2gtk-4.1`，但系统只有 `webkit2gtk-4.0`

```bash
# 检查已安装版本
dpkg -l | grep webkit2gtk

# 安装 v3 需要的版本
sudo apt install libwebkit2gtk-4.1-dev

# 移除旧的（可选）
sudo apt remove libwebkit2gtk-4.0-dev
```

### 10.3 嵌入目录结构

**问题：** `no embedded files matched` 错误

```go
// ❌ 错误：路径不匹配
//go:embed all:frontend/dist

// 确保目录结构正确
// frontend/dist/ 必须存在且包含 index.html
```

### 10.4 Window API 重命名

**问题：** `AbsolutePosition` 方法不存在

```go
// ❌ v2 方法名
window.AbsolutePosition(100, 200)

// ✅ v3 方法名
window.Position(100, 200)
```

### 10.5 运行时全局对象

**问题：** `window.wails is undefined`

```javascript
// v3: @wailsio/runtime 不再暴露到 window.wails
// 如果需要全局访问（不推荐），手动挂载
import * as Wails from '@wailsio/runtime';
window.wails = Wails;
```

---

## 十一、性能与最佳实践

### 11.1 打包体积优化

Wails v3 打包后体积通常在 8-15 MB（相比 Electron 的 80-150 MB）：

```
Wails v3:
├── macOS: ~12 MB
├── Windows: ~10 MB
└── Linux: ~15 MB

Electron:
├── macOS: ~130 MB
├── Windows: ~120 MB
└── Linux: ~140 MB
```

### 11.2 生产构建优化

```bash
# 构建生产版本
wails3 build

# 启用压缩
wails3 build -clean

# 指定输出平台
wails3 build -platform darwin/universal
wails3 build -platform windows/amd64
wails3 build -platform linux/amd64

# 跳过前端构建（使用已有构建产物）
wails3 build -nosyncfrontend
```

### 11.3 开发体验优化

```bash
# 使用 wails3 doctor 诊断环境
wails3 doctor

# 开发模式自动重载
wails3 dev -s  # 开启 Svelte 热更新
wails3 dev -r  # 开启 React 热更新

# 指定前端开发服务器端口
wails3 dev -frontenddevserverurl http://localhost:5173
```

### 11.4 性能最佳实践

```go
// ✅ 大数据传输使用流式处理
func (a *App) StreamLargeData(ctx context.Context) error {
    for i := 0; i < 10000; i++ {
        // 通过事件流式传输
        application.EventsEmit(ctx, "data-chunk", map[string]interface{}{
            "index": i,
            "data":  generateChunk(i),
        })
        time.Sleep(10 * time.Millisecond) // 避免阻塞 UI
    }
    application.EventsEmit(ctx, "data-complete", nil)
    return nil
}

// ❌ 避免：一次性返回大数据
func (a *App) GetAllData() ([]byte, error) {
    // 100MB+ 数据可能导致 UI 卡死
    return readHugeFile()
}
```

---

## 参考资料

- [Wails v3 官方文档](https://v3.wails.io/)
- [Wails v3 GitHub](https://github.com/wailsapp/wails/releases)
- [Wails v2 → v3 迁移指南](https://v3.wails.io/zh-cn/guides/migration/)
- [Wails v3 Go Package 文档](https://pkg.go.dev/github.com/wailsapp/wails/v3)
- [Wails Vue 模板](https://github.com/wailsapp/wails-templates)
