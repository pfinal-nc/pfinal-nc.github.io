---
title: "Wails Mac 桌面应用开发 - 实战指南"
date: 2023-10-18 11:06:22
tags:
  - golang
  - Wails
description: 基于Wails的Mac桌面应用开发
author: PFinal南丞
keywords:
  - Wails
  - Golang
  - Go
  - GUI
  - 桌面应用
  - Mac
  - macOS
  - 跨平台
  - Wails教程
  - Wails指南
  - Wails安装
  - Wails初始化
  - Wails开发
  - Wails构建
  - Go GUI
  - Golang GUI
  - Go桌面开发
  - Golang桌面开发
  - Wails for Mac
  - WebView2
  - WebKit
  - React
  - Vue
  - Svelte
  - Go-JavaScript绑定
  - IPC
  - wails v2
  - wails v3
recommend: 后端工程
---
# 基于Wails的Mac桌面应用开发

> 在Go语言生态中，Wails是一个优秀的跨平台桌面应用开发框架。本文将详细介绍如何使用Wails开发Mac桌面应用，包括项目创建、架构设计、前后端通信等核心内容。

最近在学习Wails开发，基于Wails和Web技术栈开发了一个Mac桌面小应用。在这个过程中，我深入了解了Wails的架构设计和开发流程，现在将整个开发过程记录下来，希望能为其他开发者提供参考。



## 🎯 Wails框架介绍

### 什么是Wails？

> Wails是一个可让您使用Go和Web技术编写桌面应用的项目。将它看作为Go的快并且轻量的Electron替代品。Wails带有许多预配置的模板，可让您快速启动和运行应用程序。有以下框架的模板：Svelte、React、Vue、Preact、Lit和Vanilla。每个模板都有JavaScript和TypeScript版本。

### Wails的核心优势

1. **轻量级**：相比Electron，Wails更加轻量，不需要打包整个Chromium
2. **高性能**：使用系统原生WebView，性能表现优异
3. **跨平台**：支持Windows、macOS、Linux三大主流平台
4. **开发效率**：支持热重载，开发体验良好
5. **技术栈灵活**：支持多种前端框架和语言

### 技术架构

Wails采用了前后端分离的架构设计：
- **后端**：Go语言提供业务逻辑和系统API访问
- **前端**：Web技术栈（HTML/CSS/JavaScript）提供用户界面
- **通信**：通过Wails提供的API进行前后端数据交互

[Wails官方文档](https://wails.io/)





## 📱 项目效果展示

### 应用界面

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202310181123657.png)

这是一个系统监控工具，主要功能包括：
- **CPU使用率监控**：实时显示CPU使用情况
- **内存使用监控**：显示内存占用状态
- **系统信息展示**：显示CPU核心数等系统信息
- **实时数据更新**：通过WebSocket实现数据实时刷新

### 技术特点

- **轻量级设计**：应用体积小，启动速度快
- **实时监控**：支持系统资源的实时监控
- **美观界面**：采用现代化UI设计
- **跨平台支持**：基于Wails实现跨平台兼容

## 🚀 项目创建与初始化

### 环境准备

在开始开发之前，请确保满足以下先决条件：

*   **Go**: Wails 需要 Go 1.18 或更高版本。
*   **NPM**: 大多数模板都需要 NPM。
*   **平台特定依赖**:
    *   **macOS**: Xcode 命令行工具。你可以通过运行 `xcode-select --install` 来安装。

安装完先决条件后，你可以安装 Wails CLI：

```bash
# 安装 Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

安装后，运行 `wails doctor` 来检查你的系统是否准备好进行 Wails 开发。此命令将检查所有必需的依赖项，并在缺少依赖项时提供如何安装它们的说明。

```bash
# 验证安装并检查依赖项
wails doctor
```

### 创建项目

使用 `wails init` 命令来创建一个新项目。你可以指定一个项目名称和一个前端模板。

要使用特定的模板创建项目，你可以使用 `-t` 标志。Wails 为流行的前端框架提供了模板：

```bash
# 使用默认的 Svelte 模板创建一个新项目
wails init -n my-project

# 使用 React 模板创建一个新项目
wails init -n my-react-app -t react

# 使用 Vue 模板创建一个新项目
wails init -n my-vue-app -t vue

# 使用 Vanilla JavaScript 模板创建一个新项目
wails init -n my-vanilla-app -t vanilla
```

在本教程中，我们将使用一个纯 HTML/JS 模板来保持简单：

```bash
wails init -n wails_demo -t https://github.com/KiddoV/wails-pure-js-template
```

### 模板选择

Wails提供了多种前端模板选择：

| 模板类型 | 适用场景 | 复杂度 |
|----------|----------|--------|
| **Vue** | 现代化SPA应用 | 中等 |
| **React** | 复杂交互应用 | 中等 |
| **Svelte** | 轻量级应用 | 简单 |
| **Vanilla JS** | 简单应用 | 简单 |
| **Lit** | Web组件应用 | 中等 |

本项目选择纯HTML/JS模板，适合快速原型开发和简单应用。



#### 项目结构

```shell
├── README.md
├── app.go
├── build
│   ├── README.md
│   ├── appicon.png
│   ├── bin
│   │   └── pf_tools.app
│   │       └── Contents
│   │           ├── Info.plist
│   │           ├── MacOS
│   │           └── Resources
│   │               └── iconfile.icns
│   ├── darwin
│   │   ├── Info.dev.plist
│   │   └── Info.plist
│   └── windows
│       ├── icon.ico
│       ├── info.json
│       ├── installer
│       │   ├── project.nsi
│       │   └── wails_tools.nsh
│       └── wails.exe.manifest
├── frontend
│   ├── src
│   │   ├── assets
│   │   │   ├── fonts
│   │   │   │   ├── OFL.txt
│   │   │   │   └── nunito-v16-latin-regular.woff2
│   │   │   └── images
│   │   │       ├── 066-disk.png
│   │   │       ├── CPU.png
│   │   │       ├── host.png
│   │   │       └── memory.png
│   │   ├── index.html
│   │   ├── libs
│   │   │   ├── echarts
│   │   │   │   └── echarts.min.js
│   │   │   ├── jquery-3.4.1
│   │   │   │   └── jquery-3.4.1.min.js
│   │   │   ├── layui
│   │   │   │   ├── css
│   │   │   │   │   └── layui.css
│   │   │   │   ├── font
│   │   │   │   │   ├── iconfont.eot
│   │   │   │   │   ├── iconfont.svg
│   │   │   │   │   ├── iconfont.ttf
│   │   │   │   │   ├── iconfont.woff
│   │   │   │   │   └── iconfont.woff2
│   │   │   │   └── layui.js
│   │   │   └── live2d
│   │   │       ├── LICENSE
│   │   │       ├── README.md
│   │   │       ├── assets
│   │   │       │   ├── autoload.js
│   │   │       │   ├── flat-ui-icons-regular.eot
│   │   │       │   ├── flat-ui-icons-regular.svg
│   │   │       │   ├── flat-ui-icons-regular.ttf
│   │   │       │   ├── flat-ui-icons-regular.woff
│   │   │       │   ├── live2d.js
│   │   │       │   ├── waifu-tips.js
│   │   │       │   ├── waifu-tips.json
│   │   │       │   └── waifu.css
│   │   │       ├── demo1-default.html
│   │   │       ├── demo2-autoload.html
│   │   │       └── demo3-waifu-tips.html
│   │   ├── main.css
│   │   └── main.js
│   └── wailsjs
│       ├── go
│       │   ├── main
│       │   │   ├── App.d.ts
│       │   │   └── App.js
│       │   └── models.ts
│       └── runtime
│           ├── package.json
│           ├── runtime.d.ts
│           └── runtime.js
├── go.mod
├── go.sum
├── main.go
├── pkg
│   └── sys
│       └── sys.go
├── test
│   └── sys_test.go
└── wails.json
```



**main.go**   入口文件

**app.go** 	项目初始化文件

**pkg/sys.go**	项目文件

**frontend**  主要是前台的一些展示 文件 





## 🎨 前端布局与配置

### 窗口配置设计

最初的设计目标是创建一个适合8.8寸副屏的系统监控工具，因此窗口配置采用了固定尺寸设计：

```go
// main.go - 窗口配置
err := wails.Run(&options.App{
    Title:             "PF_tools",           // 应用标题
    Width:             1280,                 // 窗口宽度（适合副屏）
    Height:            320,                  // 窗口高度（紧凑设计）
    MinWidth:          1280,                 // 最小宽度（固定尺寸）
    MinHeight:         320,                  // 最小高度（固定尺寸）
    DisableResize:     true,                 // 禁用窗口大小调整
    Fullscreen:        false,                // 非全屏模式
    Frameless:         false,                // 保留窗口边框
    StartHidden:       false,                // 启动时显示
    HideWindowOnClose: true,                 // 关闭时隐藏而非退出
    BackgroundColour:  &options.RGBA{R: 16, G: 12, B: 42, A: 255}, // 深色背景
    AlwaysOnTop:       true,                 // 窗口置顶显示
    Menu:              nil,                  // 无菜单栏
    Logger:            nil,                  // 默认日志配置
    LogLevel:          logger.DEBUG,         // 调试日志级别
    OnStartup:         app.startup,          // 启动回调函数
    OnDomReady:        app.domReady,         // DOM就绪回调
    OnBeforeClose:     app.beforeClose,      // 关闭前回调
    OnShutdown:        app.shutdown,         // 关闭回调
    WindowStartState:  options.Normal,       // 正常窗口状态
    Bind: []interface{}{
        app,                                 // 绑定应用实例到前端
    },
})
```

**设计考虑：**
- **固定尺寸**：1280x320适合副屏显示，避免用户误操作改变窗口大小
- **窗口置顶**：确保监控信息始终可见
- **深色主题**：减少视觉疲劳，适合长时间显示
- **隐藏而非退出**：保持应用在后台运行，便于快速恢复



### HTML页面结构

```html
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <meta http-equiv="X-UA-Compatible" content="IE=Edge, Chrome=1">
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <link rel="icon" type="image/png" href="data:image/png;base64,iVBORw0KGgo=">
    
    <!-- 样式文件引入 -->
    <link rel="stylesheet" href="../libs/layui/css/layui.css"/>
    <link rel="stylesheet" href="../libs/live2d/assets/waifu.css"/>
    <link rel="stylesheet" href="main.css"/>
    
    <!-- JavaScript库引入 -->
    <script src="../libs/jquery-3.4.1/jquery-3.4.1.min.js"></script>
    <script src="../libs/echarts/echarts.min.js"></script>
    <script src="../libs/layui/layui.js"></script>
    <script src="../libs/live2d/assets/waifu-tips.js"></script>
    <script src="../libs/live2d/assets/live2d.js"></script>
    <script src="main.js"></script>
</head>

<body id="app" class="app" style="--wails-draggable:drag">
```

**关键配置说明：**

1. **资源路径**：使用相对路径 `../libs/` 引用第三方库，确保在Wails环境中正确加载
2. **窗口拖拽**：`style="--wails-draggable:drag"` 启用窗口拖拽功能，提升用户体验
3. **兼容性**：设置 `X-UA-Compatible` 确保在不同浏览器中一致显示
4. **响应式**：`viewport` 配置支持响应式布局

    

### JavaScript交互逻辑

```javascript
function event_cpu_on() {
    // 使用Layui框架
    layui.use(function () {
        // 监听CPU使用率事件
        runtime.EventsOn("cpu_usage", function (cpu_usage) {
            // 更新CPU使用率显示
            document.getElementById("used").textContent = cpu_usage.avg + '% '
        })
    })

    // 调用Go后端方法获取CPU信息
    window.go.main.App.CpuInfo().then(result => {
        // 解析返回的JSON数据
        res = JSON.parse(result)
        // 更新CPU核心数显示
        document.getElementById("cpu_num").textContent = res.cpu_number
    }).catch(err => {
        console.log(err);
    }).finally(() => {
        console.log("finished!")
    });
}
```

**通信机制详解：**

1. **事件监听**：`runtime.EventsOn("cpu_usage", callback)` 监听Go后端发送的CPU使用率事件
   - 后端通过 `runtime.EventsEmit(ctx, "cpu_usage", data)` 发送数据
   - 前端实时接收并更新UI显示

2. **方法调用**：`window.go.main.App.CpuInfo()` 直接调用Go后端方法
   - 通过Promise方式处理异步调用
   - 返回JSON格式数据，前端解析后更新界面

3. **错误处理**：使用 `.catch()` 和 `.finally()` 确保程序稳定性





## 📚 项目资源

### 完整代码

项目完整代码托管在GitHub：[https://github.com/pfinal-nc/wails_pf](https://github.com/pfinal-nc/wails_pf)

### 快速开始

```bash
# 克隆项目
git clone git@github.com:pfinal-nc/wails_pf.git

# 进入项目目录
cd wails_pf

# 构建应用
wails build
```

### 构建输出

构建完成后，可在 `build/bin/` 目录下找到打包好的应用文件：
- **macOS**：`pf_tools.app` (macOS应用包)
- **Windows**：`wails_tools.exe` (Windows可执行文件)
- **Linux**：`wails_tools` (Linux可执行文件)

### 运行应用

```bash
# macOS
open build/bin/pf_tools.app

# Windows
./build/bin/wails_tools.exe

# Linux
./build/bin/wails_tools
```

---

**标签：** #Go语言 #Wails #桌面应用 #系统监控 #跨平台开发 #macOS

## 🔧 技术实现详解

### 前后端通信机制

Wails提供了多种前后端通信方式，本项目主要使用了以下两种：

#### 1. 事件驱动通信

```go
// app.go - 后端事件发送
func (a *App) startup(ctx context.Context) {
    // 启动定时器，每秒发送CPU使用率
    go func() {
        ticker := time.NewTicker(time.Second)
        defer ticker.Stop()
        
        for {
            select {
            case <-ticker.C:
                cpuUsage := getCPUUsage()
                runtime.EventsEmit(ctx, "cpu_usage", cpuUsage)
            case <-ctx.Done():
                return
            }
        }
    }()
}
```

```javascript
// main.js - 前端事件监听
function event_cpu_on() {
    layui.use(function () {
        runtime.EventsOn("cpu_usage", function (cpu_usage) {
            document.getElementById("used").textContent = cpu_usage.avg + '% '
        })
    })
}
```

#### 2. 方法调用通信

```go
// app.go - 后端方法定义
func (a *App) CpuInfo() string {
    info := getCPUInfo()
    jsonData, _ := json.Marshal(info)
    return string(jsonData)
}
```

```javascript
// main.js - 前端方法调用
window.go.main.App.CpuInfo().then(result => {
    res = JSON.parse(result)
    document.getElementById("cpu_num").textContent = res.cpu_number
}).catch(err => {
    console.log(err);
});
```

### 系统监控实现

#### CPU使用率监控

```go
// pkg/sys/sys.go
func getCPUUsage() map[string]interface{} {
    var cpuUsage map[string]interface{}
    
    // 获取CPU统计信息
    cpuStats, err := cpu.Percent(time.Second, false)
    if err != nil {
        return map[string]interface{}{"avg": 0}
    }
    
    if len(cpuStats) > 0 {
        cpuUsage = map[string]interface{}{
            "avg": cpuStats[0],
            "timestamp": time.Now().Unix(),
        }
    }
    
    return cpuUsage
}
```

#### 内存使用监控

```go
// pkg/sys/sys.go
func getMemoryInfo() map[string]interface{} {
    vmstat, err := mem.VirtualMemory()
    if err != nil {
        return map[string]interface{}{}
    }
    
    return map[string]interface{}{
        "total": vmstat.Total,
        "used": vmstat.Used,
        "free": vmstat.Free,
        "percent": vmstat.UsedPercent,
    }
}
```

### 窗口配置详解

```go
// main.go - 窗口配置
err := wails.Run(&options.App{
    Title:             "PF_tools",           // 窗口标题
    Width:             1280,                 // 窗口宽度
    Height:            320,                  // 窗口高度
    MinWidth:          1280,                 // 最小宽度
    MinHeight:         320,                  // 最小高度
    DisableResize:     true,                 // 禁用窗口大小调整
    Fullscreen:        false,                // 全屏模式
    Frameless:         false,                // 无边框模式
    StartHidden:       false,                // 启动时隐藏
    HideWindowOnClose: true,                 // 关闭时隐藏而非退出
    BackgroundColour:  &options.RGBA{R: 16, G: 12, B: 42, A: 255}, // 背景色
    AlwaysOnTop:       true,                 // 窗口置顶
    Menu:              nil,                  // 菜单配置
    Logger:            nil,                  // 日志配置
    LogLevel:          logger.DEBUG,         // 日志级别
    OnStartup:         app.startup,          // 启动回调
    OnDomReady:        app.domReady,         // DOM就绪回调
    OnBeforeClose:     app.beforeClose,      // 关闭前回调
    OnShutdown:        app.shutdown,         // 关闭回调
    WindowStartState:  options.Normal,       // 窗口启动状态
    Bind: []interface{}{
        app,                                 // 绑定应用实例
    },
})
```

### 前端技术栈

#### 使用的库和框架

1. **Layui**：轻量级UI框架，提供丰富的组件
2. **ECharts**：数据可视化图表库
3. **jQuery**：DOM操作和AJAX请求
4. **Live2D**：2D动画效果

#### 关键配置

```html
<!-- index.html - 关键配置 -->
<body id="app" class="app" style="--wails-draggable:drag">
```

- `--wails-draggable:drag`：启用窗口拖拽功能
- 相对路径引用：`../libs/`确保资源正确加载

## 🚀 开发与构建

### 开发模式

```bash
# 启动开发模式（支持热重载）
wails dev

# 指定端口启动
wails dev -port 8080

# 调试模式启动
wails dev -debug
```

### 构建应用

```bash
# 构建所有平台
wails build

# 构建特定平台
wails build -platform darwin/amd64
wails build -platform darwin/arm64
wails build -platform windows/amd64
wails build -platform linux/amd64

# 构建并打包
wails build -package
```

### 性能优化

1. **资源优化**：使用CDN或本地缓存第三方库
2. **代码分割**：按需加载JavaScript模块
3. **图片优化**：使用WebP格式和适当压缩
4. **内存管理**：及时清理事件监听器和定时器

## 📊 项目总结

### 技术亮点

1. **实时监控**：通过WebSocket实现系统资源实时监控
2. **跨平台兼容**：基于Wails实现Windows/macOS/Linux支持
3. **轻量级设计**：相比Electron，应用体积更小，启动更快
4. **现代化UI**：采用响应式设计，支持多种屏幕尺寸

### 开发经验

1. **前后端分离**：清晰的架构设计便于维护和扩展
2. **事件驱动**：合理使用事件机制实现实时数据更新
3. **错误处理**：完善的错误处理机制提升应用稳定性
4. **性能监控**：持续监控应用性能，及时优化

### 扩展建议

1. **添加更多监控指标**：磁盘使用率、网络状态等
2. **实现数据持久化**：保存历史监控数据
3. **增加告警功能**：资源使用超过阈值时发出提醒
4. **优化UI交互**：添加更多交互功能和动画效果

---

完整的项目代码：[https://github.com/pfinal-nc/wails_pf](https://github.com/pfinal-nc/wails_pf)

```bash
# 克隆项目
git clone git@github.com:pfinal-nc/wails_pf.git

# 进入项目目录
cd wails_pf

# 构建应用
wails build
```

构建完成后，可在 `build/bin/` 目录下找到打包好的应用文件。
