---
title: 如何使用 Go systray 构建智能系统托盘应用 - Wails v2 集成实战完整指南
date: 2025-01-28 10:00:02
author: PFinal南丞
tag:
  - Go
  - systray
  - Wails
  - 桌面应用
  - 系统托盘
  - 跨平台开发
description: 深入讲解如何使用 Go systray 库构建智能系统托盘应用，结合 Wails v2 框架实现跨平台桌面应用开发，包含完整的实战案例和最佳实践
keywords:
  - Go systray
  - Wails v2
  - 系统托盘
  - 桌面应用
  - 跨平台开发
  - Go GUI
  - 系统集成
  - 后台服务
recommend: 后端工程
course:
  name: Wails 跨平台桌面开发实战
  module: 3
  lesson: 3.1
tags:
  - AI
  - Backend
  - Desktop
  - Git
  - Golang
  - HTTP
---

# 使用 Go systray 构建智能系统托盘应用 - Wails v2 集成实战

## 引言与技术背景

在桌面应用开发中，系统托盘（System Tray）功能已经成为提升用户体验的重要组成部分。无论是后台服务、工具软件还是日常办公应用，系统托盘都能为用户提供便捷的快速访问入口。

### systray 库的诞生背景

Go 语言在桌面应用开发领域一直缺乏成熟的系统托盘解决方案。传统的跨平台 GUI 框架如 Fyne、Walk 等虽然提供了基础的托盘功能，但在灵活性和易用性方面存在诸多限制。

**systray** 库正是在这样的背景下应运而生，它专注于解决 Go 语言在系统托盘开发中的痛点：

- **跨平台兼容性**：原生支持 Windows、macOS 和 Linux 三大主流操作系统
- **简洁的 API 设计**：提供直观易用的接口，降低学习成本
- **高性能实现**：基于 CGO 调用系统原生 API，性能优异
- **活跃的社区支持**：GitHub 上 3.6k+ stars，持续维护更新

### 跨平台系统托盘开发的挑战

开发跨平台系统托盘应用面临的主要挑战包括：

1. **平台差异巨大**：不同操作系统的托盘实现机制完全不同
   - Windows：使用 Shell_NotifyIcon API
   - macOS：基于 NSStatusItem 和 NSMenu
   - Linux：依赖 AppIndicator 或 StatusNotifierItem

2. **依赖管理复杂**：各平台需要不同的系统库和开发工具
   - Windows：需要 Windows SDK
   - macOS：需要 Xcode 和 Cocoa 框架
   - Linux：需要 GTK 和 AppIndicator 开发库

3. **事件处理机制**：不同平台的用户交互事件处理方式差异很大

### 为什么选择 systray 而非其他方案

在 Go 生态中，系统托盘开发有以下几个主要选择：

| 库名 | 优势 | 劣势 | 适用场景 |
|------|------|------|----------|
| **systray** | 专精托盘、API简洁、跨平台好 | 功能相对单一 | 纯托盘应用、集成到现有项目 |
| **Fyne** | 完整GUI框架、功能丰富 | 体积较大、学习成本高 | 完整桌面应用开发 |
| **trayhost** | 轻量级、简单 | 功能有限、维护不活跃 | 简单托盘应用 |
| **Walk** | Windows原生、性能好 | 仅支持Windows | Windows专用应用 |

**systray 的核心优势：**

- **专注性**：专门解决系统托盘问题，不引入额外的 GUI 框架依赖
- **轻量级**：编译后的二进制文件体积小，启动速度快
- **易集成**：可以轻松集成到现有的 Go 项目中
- **维护活跃**：持续更新，社区支持良好

### 本文覆盖的内容概览

本文将全面介绍 systray 库的使用方法，并重点展示如何将其与 Wails v2 框架集成，构建桌面应用。文章将分为四个主要部分：

1. **systray 库深度解析**：从基础使用到高级特性，掌握 systray 的核心功能
2. **Wails v2 集成方案**：解决 Wails v2 缺乏系统托盘功能的问题
3. **双实战项目**：文件夹快速访问和网址书签管理两个完整的应用案例
4. **生产部署优化**：性能优化、跨平台打包、错误处理等生产环境考虑

## 环境准备与基础配置

### 依赖安装

#### Go 环境要求

systray 库要求 Go 1.18 或更高版本，建议使用最新的稳定版本。可以通过以下命令检查当前 Go 版本：

```bash
go version
```

如果版本过低，可以访问 [Go 官网](https://golang.org/dl/) 下载最新版本。

#### 各平台特定依赖

**Linux 系统**

在 Ubuntu/Debian 系统上，需要安装以下开发库：

```bash
sudo apt-get update
sudo apt-get install gcc libgtk-3-dev libayatana-appindicator3-dev
```

在 CentOS/RHEL 系统上：

```bash
sudo yum install gcc gtk3-devel libappindicator-gtk3-devel
```

**macOS 系统**

需要安装 Xcode Command Line Tools：

```bash
xcode-select --install
```

**Windows 系统**

推荐使用 TDM-GCC 或 MinGW-w64：

```bash
# 使用 Chocolatey 安装
choco install mingw

# 或使用 Scoop
scoop install mingw
```

#### CGO 配置说明

systray 库依赖 CGO 进行跨平台系统调用，因此需要确保 CGO 已启用：

```bash
# 检查 CGO 状态
go env CGO_ENABLED

# 如果显示 0，需要启用 CGO
export CGO_ENABLED=1
```

### 快速上手示例

创建一个最简单的 systray 应用：

```go
package main

import (
    "github.com/getlantern/systray"
)

func main() {
    systray.Run(onReady, onExit)
}

func onReady() {
    systray.SetIcon(icon.Data) // 需要提供图标数据
    systray.SetTitle("我的应用")
    systray.SetTooltip("这是一个系统托盘应用")
    
    mQuit := systray.AddMenuItem("退出", "退出应用程序")
    
    go func() {
        for {
            <-mQuit.ClickedCh
            systray.Quit()
        }
    }()
}

func onExit() {
    // 清理资源
}
```

## systray 核心 API 详解

### 生命周期管理

#### systray.Run() 的执行机制

`systray.Run()` 是 systray 库的核心函数，它负责启动系统托盘服务。该函数采用回调模式，接受两个函数参数：

```go
func Run(onReady func(), onExit func())
```

**执行流程：**

1. **初始化阶段**：创建系统托盘对象，设置基础属性
2. **onReady 回调**：托盘准备就绪后调用，用于设置图标、菜单等
3. **事件循环**：进入系统事件循环，处理用户交互
4. **onExit 回调**：应用退出时调用，用于清理资源

**重要注意事项：**

- `systray.Run()` 是阻塞调用，会占用当前 goroutine
- 必须在主线程中调用，不能在子 goroutine 中运行
- 一旦调用，程序将一直运行直到调用 `systray.Quit()`

#### onReady 和 onExit 回调时机

**onReady 回调：**

```go
func onReady() {
    // 此时系统托盘已准备就绪
    // 可以安全地设置图标、标题、菜单等
    systray.SetIcon(iconData)
    systray.SetTitle("应用标题")
    
    // 添加菜单项
    mItem := systray.AddMenuItem("菜单项", "提示信息")
    
    // 启动事件处理 goroutine
    go handleMenuEvents(mItem)
}
```

**onExit 回调：**

```go
func onExit() {
    // 应用即将退出，进行资源清理
    // 关闭数据库连接、文件句柄等
    // 注意：此时不要再调用 systray 相关函数
}
```

#### 主线程与 goroutine 的协调

systray 库的事件处理机制要求在主线程中运行，但菜单事件处理需要在独立的 goroutine 中进行：

```go
func onReady() {
    // 主线程：设置托盘属性
    systray.SetIcon(iconData)
    
    // 主线程：创建菜单项
    mItem := systray.AddMenuItem("点击我", "")
    
    // 启动 goroutine：处理事件
    go func() {
        for {
            <-mItem.ClickedCh
            // 在 goroutine 中处理点击事件
            handleClick()
        }
    }()
}
```

### 托盘图标管理

#### SetIcon() - 图标设置与格式要求

```go
systray.SetIcon(iconData []byte)
```

**图标格式要求：**

- **Windows**：支持 ICO 格式，推荐 16x16、32x32、48x48 像素
- **macOS**：支持 PNG 格式，推荐 16x16、32x32 像素  
- **Linux**：支持 PNG 格式，推荐 16x16、24x24、32x32 像素

**图标数据获取方式：**

```go
// 使用 go:embed 嵌入图标文件
//go:embed assets/icon.png
var iconData []byte

// 从文件读取
func loadIcon(path string) ([]byte, error) {
    return os.ReadFile(path)
}

// 使用第三方库生成
import "github.com/cratonica/2goarray"
// 运行: 2goarray IconData assets/icon.png
```

#### SetTitle() - 标题显示（仅 macOS）

```go
systray.SetTitle("应用标题")
```

**平台差异：**

- **macOS**：在菜单栏中显示文字标题
- **Windows/Linux**：此函数无效，标题通过图标和提示显示

#### SetTooltip() - 提示文本

```go
systray.SetTooltip("鼠标悬停时显示的提示信息")
```

**各平台表现：**

- **Windows**：鼠标悬停在托盘图标上时显示
- **macOS**：鼠标悬停在菜单栏图标上时显示
- **Linux**：鼠标悬停在托盘图标上时显示

#### 动态更新图标的最佳实践

```go
type TrayManager struct {
    currentIcon []byte
    iconCache   map[string][]byte
}

func (tm *TrayManager) UpdateIcon(iconName string) {
    if iconData, exists := tm.iconCache[iconName]; exists {
        systray.SetIcon(iconData)
        tm.currentIcon = iconData
    }
}

func (tm *TrayManager) LoadIcons() {
    tm.iconCache = make(map[string][]byte)
    
    // 预加载所有图标
    icons := []string{"normal", "warning", "error", "success"}
    for _, name := range icons {
        data, _ := os.ReadFile(fmt.Sprintf("assets/%s.png", name))
        tm.iconCache[name] = data
    }
}
```

### 菜单系统

#### AddMenuItem() - 添加菜单项

```go
func AddMenuItem(title string, tooltip string) *MenuItem
```

**基本用法：**

```go
// 创建普通菜单项
mOpen := systray.AddMenuItem("打开", "打开主窗口")
mSettings := systray.AddMenuItem("设置", "打开设置窗口")
mQuit := systray.AddMenuItem("退出", "退出应用程序")

// 处理点击事件
go func() {
    for {
        select {
        case <-mOpen.ClickedCh:
            openMainWindow()
        case <-mSettings.ClickedCh:
            openSettings()
        case <-mQuit.ClickedCh:
            systray.Quit()
        }
    }
}()
```

#### AddMenuItemCheckbox() - 复选框菜单

```go
func AddMenuItemCheckbox(title string, tooltip string, checked bool) *MenuItem
```

**使用示例：**

```go
mAutoStart := systray.AddMenuItemCheckbox("开机自启", "是否开机自动启动", false)

go func() {
    for {
        <-mAutoStart.ClickedCh
        // 切换状态
        if mAutoStart.Checked() {
            mAutoStart.Uncheck()
            disableAutoStart()
        } else {
            mAutoStart.Check()
            enableAutoStart()
        }
    }
}()
```

#### AddSeparator() - 分隔符

```go
systray.AddSeparator()
```

**菜单结构示例：**

```go
func createMenu() {
    // 功能菜单
    mOpen := systray.AddMenuItem("打开", "")
    mSettings := systray.AddMenuItem("设置", "")
    
    systray.AddSeparator() // 分隔符
    
    // 工具菜单
    mTools := systray.AddMenuItem("工具", "")
    
    systray.AddSeparator() // 分隔符
    
    // 退出菜单
    mQuit := systray.AddMenuItem("退出", "")
}
```

#### AddSubMenuItem() - 子菜单

```go
func (m *MenuItem) AddSubMenuItem(title string, tooltip string) *MenuItem
```

**子菜单实现：**

```go
// 创建主菜单项
mTools := systray.AddMenuItem("工具", "工具菜单")

// 添加子菜单
mCalculator := mTools.AddSubMenuItem("计算器", "打开计算器")
mNotepad := mTools.AddSubMenuItem("记事本", "打开记事本")
mTaskManager := mTools.AddSubMenuItem("任务管理器", "打开任务管理器")

// 处理子菜单事件
go func() {
    for {
        select {
        case <-mCalculator.ClickedCh:
            openCalculator()
        case <-mNotepad.ClickedCh:
            openNotepad()
        case <-mTaskManager.ClickedCh:
            openTaskManager()
        }
    }
}()
```

#### 菜单项的属性操作

**SetIcon() - 菜单项图标**

```go
func (m *MenuItem) SetIcon(iconData []byte)
```

```go
// 为菜单项设置图标
mGitHub := systray.AddMenuItem("GitHub", "打开 GitHub")
mGitHub.SetIcon(githubIconData)
```

**Check() / Uncheck() - 复选状态**

```go
func (m *MenuItem) Check()
func (m *MenuItem) Uncheck()
func (m *MenuItem) Checked() bool
```

```go
mAutoStart := systray.AddMenuItemCheckbox("开机自启", "", false)

// 检查状态
if mAutoStart.Checked() {
    // 已勾选
}

// 设置状态
mAutoStart.Check()    // 勾选
mAutoStart.Uncheck()  // 取消勾选
```

**Enable() / Disable() - 启用/禁用**

```go
func (m *MenuItem) Enable()
func (m *MenuItem) Disable()
```

```go
mSave := systray.AddMenuItem("保存", "保存文件")

// 根据条件启用/禁用菜单项
if hasUnsavedChanges() {
    mSave.Enable()
} else {
    mSave.Disable()
}
```

**Hide() / Show() - 显示/隐藏**

```go
func (m *MenuItem) Hide()
func (m *MenuItem) Show()
```

```go
mAdmin := systray.AddMenuItem("管理员功能", "")

// 根据用户权限显示/隐藏
if isAdmin() {
    mAdmin.Show()
} else {
    mAdmin.Hide()
}
```

### 事件处理机制

#### 事件监听模式

systray 采用 channel 机制处理菜单点击事件：

```go
// 创建菜单项
mItem := systray.AddMenuItem("菜单项", "提示")

// 事件监听模式
go func() {
    for {
        <-mItem.ClickedCh
        // 处理点击事件
        handleClick()
    }
}()
```

#### 多菜单项事件处理

```go
func handleMenuEvents() {
    // 创建多个菜单项
    mOpen := systray.AddMenuItem("打开", "")
    mSettings := systray.AddMenuItem("设置", "")
    mQuit := systray.AddMenuItem("退出", "")
    
    // 使用 select 处理多个事件
    go func() {
        for {
            select {
            case <-mOpen.ClickedCh:
                openMainWindow()
            case <-mSettings.ClickedCh:
                openSettings()
            case <-mQuit.ClickedCh:
                systray.Quit()
            }
        }
    }()
}
```

#### 事件处理最佳实践

**1. 避免阻塞主事件循环**

```go
// 错误做法：在事件处理中执行耗时操作
go func() {
    for {
        <-mItem.ClickedCh
        // 阻塞操作，会导致界面卡顿
        time.Sleep(5 * time.Second)
        processData()
    }
}()

// 正确做法：异步处理耗时操作
go func() {
    for {
        <-mItem.ClickedCh
        // 启动新的 goroutine 处理耗时操作
        go func() {
            time.Sleep(5 * time.Second)
            processData()
        }()
    }
}()
```

**2. 错误处理和恢复**

```go
go func() {
    defer func() {
        if r := recover(); r != nil {
            log.Printf("菜单事件处理异常: %v", r)
        }
    }()
    
    for {
        <-mItem.ClickedCh
        handleClick()
    }
}()
```

**3. 资源清理**

```go
type MenuManager struct {
    items []*systray.MenuItem
    done  chan struct{}
}

func (mm *MenuManager) Start() {
    mm.done = make(chan struct{})
    
    go func() {
        defer close(mm.done)
        for {
            select {
            case <-mm.done:
                return
            case <-mm.items[0].ClickedCh:
                handleClick()
            }
        }
    }()
}

func (mm *MenuManager) Stop() {
    close(mm.done)
}
```

## 进阶特性与最佳实践

### 动态菜单更新

#### ResetMenu() 的使用时机

当需要完全重建菜单时，使用 `ResetMenu()` 清除所有现有菜单项：

```go
func (tm *TrayManager) RefreshMenu() {
    // 清除所有菜单项
    systray.ResetMenu()
    
    // 重新构建菜单
    tm.buildMenu()
}

func (tm *TrayManager) buildMenu() {
    // 根据当前状态重新创建菜单
    if tm.isLoggedIn {
        tm.addUserMenu()
    } else {
        tm.addLoginMenu()
    }
}
```

**使用场景：**

- 用户登录状态变化
- 配置更新后菜单结构改变
- 动态加载的菜单项发生变化

#### 菜单项引用管理

```go
type MenuManager struct {
    items map[string]*systray.MenuItem
    mutex sync.RWMutex
}

func (mm *MenuManager) AddItem(id, title, tooltip string) *systray.MenuItem {
    mm.mutex.Lock()
    defer mm.mutex.Unlock()
    
    item := systray.AddMenuItem(title, tooltip)
    mm.items[id] = item
    
    return item
}

func (mm *MenuManager) RemoveItem(id string) {
    mm.mutex.Lock()
    defer mm.mutex.Unlock()
    
    if item, exists := mm.items[id]; exists {
        item.Hide()
        delete(mm.items, id)
    }
}

func (mm *MenuManager) UpdateItem(id, title string) {
    mm.mutex.RLock()
    item, exists := mm.items[id]
    mm.mutex.RUnlock()
    
    if exists {
        // 注意：systray 没有直接更新标题的方法
        // 需要重新创建菜单项
        item.Hide()
        newItem := systray.AddMenuItem(title, "")
        mm.items[id] = newItem
    }
}
```

#### 避免内存泄漏的技巧

**1. 及时清理 goroutine**

```go
type TrayApp struct {
    menuItems []*systray.MenuItem
    quitChan  chan struct{}
}

func (ta *TrayApp) Start() {
    ta.quitChan = make(chan struct{})
    
    // 为每个菜单项启动事件处理 goroutine
    for _, item := range ta.menuItems {
        go ta.handleMenuItem(item)
    }
}

func (ta *TrayApp) handleMenuItem(item *systray.MenuItem) {
    for {
        select {
        case <-ta.quitChan:
            return // 正常退出
        case <-item.ClickedCh:
            ta.handleClick(item)
        }
    }
}

func (ta *TrayApp) Stop() {
    close(ta.quitChan)
}
```

**2. 避免循环引用**

```go
// 错误做法：循环引用
type MenuItem struct {
    handler func(*MenuItem)
    item    *systray.MenuItem
}

// 正确做法：使用接口解耦
type ClickHandler interface {
    OnClick()
}

type MenuItem struct {
    handler ClickHandler
    item    *systray.MenuItem
}
```

### 跨平台兼容性处理

#### 平台特定代码

使用 Go 的构建标签来处理平台差异：

```go
// +build darwin
// systray_darwin.go

package main

func getDefaultIcon() []byte {
    // macOS 特定的图标处理
    return loadMacOSIcon()
}

// +build windows
// systray_windows.go

package main

func getDefaultIcon() []byte {
    // Windows 特定的图标处理
    return loadWindowsIcon()
}

// +build linux
// systray_linux.go

package main

func getDefaultIcon() []byte {
    // Linux 特定的图标处理
    return loadLinuxIcon()
}
```

#### 平台特定功能

```go
// 检测当前平台
func getPlatform() string {
    return runtime.GOOS
}

// 平台特定的菜单项
func createPlatformSpecificMenu() {
    switch runtime.GOOS {
    case "darwin":
        // macOS 特有功能
        mSpotlight := systray.AddMenuItem("Spotlight 搜索", "")
        go handleSpotlight(mSpotlight)
        
    case "windows":
        // Windows 特有功能
        mTaskManager := systray.AddMenuItem("任务管理器", "")
        go handleTaskManager(mTaskManager)
        
    case "linux":
        // Linux 特有功能
        mTerminal := systray.AddMenuItem("打开终端", "")
        go handleTerminal(mTerminal)
    }
}
```

### 图标资源管理

#### 内嵌资源 vs 外部文件

**内嵌资源方式：**

```go
//go:embed assets/icons/*.png
var iconFS embed.FS

func loadIcon(name string) ([]byte, error) {
    return iconFS.ReadFile(fmt.Sprintf("assets/icons/%s.png", name))
}
```

**外部文件方式：**

```go
func loadIcon(name string) ([]byte, error) {
    return os.ReadFile(fmt.Sprintf("assets/icons/%s.png", name))
}
```

**选择建议：**

- **内嵌资源**：适合图标数量少、体积小的应用
- **外部文件**：适合图标数量多、需要动态加载的应用

#### 使用 go:embed 嵌入图标

```go
package main

import (
    _ "embed"
    "github.com/getlantern/systray"
)

//go:embed assets/icon.png
var defaultIcon []byte

//go:embed assets/icons/*.png
var iconFS embed.FS

type IconManager struct {
    cache map[string][]byte
}

func (im *IconManager) LoadIcons() {
    im.cache = make(map[string][]byte)
    
    // 预加载所有图标
    entries, _ := iconFS.ReadDir("assets/icons")
    for _, entry := range entries {
        if !entry.IsDir() {
            name := strings.TrimSuffix(entry.Name(), ".png")
            data, _ := iconFS.ReadFile(fmt.Sprintf("assets/icons/%s.png", name))
            im.cache[name] = data
        }
    }
}

func (im *IconManager) GetIcon(name string) []byte {
    if data, exists := im.cache[name]; exists {
        return data
    }
    return defaultIcon
}
```

#### 多尺寸图标适配

```go
type IconSet struct {
    sizes map[string][]byte
}

func (is *IconSet) LoadIconSet(name string) error {
    is.sizes = make(map[string][]byte)
    
    sizes := []string{"16", "24", "32", "48"}
    for _, size := range sizes {
        data, err := os.ReadFile(fmt.Sprintf("assets/%s_%s.png", name, size))
        if err != nil {
            return err
        }
        is.sizes[size] = data
    }
    
    return nil
}

func (is *IconSet) GetBestIcon() []byte {
    // 根据系统 DPI 选择最佳尺寸
    if data, exists := is.sizes["32"]; exists {
        return data
    }
    if data, exists := is.sizes["24"]; exists {
        return data
    }
    if data, exists := is.sizes["16"]; exists {
        return data
    }
    return nil
}
```

### 常见问题与解决方案

#### macOS 应用打包注意事项

**1. 应用包结构**

```
MyApp.app/
├── Contents/
│   ├── Info.plist
│   ├── MacOS/
│   │   └── MyApp
│   └── Resources/
│       └── MyApp.icns
```

**2. Info.plist 配置**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>MyApp</string>
    <key>CFBundleIdentifier</key>
    <string>com.example.myapp</string>
    <key>CFBundleName</key>
    <string>MyApp</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>LSUIElement</key>
    <true/>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
```

**3. 代码签名**

```bash
# 创建证书
security create-keypair -a "MyApp" -f

# 签名应用
codesign --force --sign "MyApp" MyApp.app
```

#### Windows 无控制台窗口编译

```bash
# 编译时添加 -ldflags 参数
go build -ldflags "-H=windowsgui" -o MyApp.exe

# 或使用 wails build
wails build -ldflags "-H=windowsgui"
```

**资源文件配置：**

```go
// 使用 rsrc 嵌入资源
//go:generate rsrc -ico icon.ico -o rsrc.syso

package main

import _ "embed"

//go:embed icon.ico
var iconData []byte
```

#### Linux 不同桌面环境的兼容性

**1. 检测桌面环境**

```go
func getDesktopEnvironment() string {
    env := os.Getenv("XDG_CURRENT_DESKTOP")
    if env != "" {
        return env
    }
    
    env = os.Getenv("DESKTOP_SESSION")
    if env != "" {
        return env
    }
    
    return "unknown"
}
```

**2. 桌面环境特定处理**

```go
func setupLinuxTray() {
    de := getDesktopEnvironment()
    
    switch de {
    case "GNOME":
        // GNOME 使用 AppIndicator
        setupAppIndicator()
    case "KDE":
        // KDE 使用 StatusNotifierItem
        setupStatusNotifier()
    case "XFCE":
        // XFCE 使用传统系统托盘
        setupLegacyTray()
    default:
        // 尝试多种方式
        setupFallbackTray()
    }
}
```

## 纯 systray 实战案例

### 案例：系统监控托盘工具

让我们构建一个实用的系统监控托盘工具，展示 systray 库的高级用法。

#### 功能设计

- **实时监控**：显示 CPU 和内存使用率
- **动态图标**：根据系统负载变化图标颜色
- **详细信息**：点击显示详细的系统信息
- **配置管理**：支持自定义监控参数

#### 核心实现

**数据结构设计：**

```go
type SystemMonitor struct {
    cpuItem    *systray.MenuItem
    memItem    *systray.MenuItem
    diskItem   *systray.MenuItem
    netItem    *systray.MenuItem
    
    // 监控配置
    config     *MonitorConfig
    quitChan   chan struct{}
    
    // 状态缓存
    lastCPU    float64
    lastMem    float64
    lastUpdate time.Time
}

type MonitorConfig struct {
    UpdateInterval time.Duration `json:"update_interval"`
    ShowDetails    bool          `json:"show_details"`
    AlertThreshold float64       `json:"alert_threshold"`
}
```

**监控数据获取：**

```go
func (sm *SystemMonitor) getCPUUsage() float64 {
    // 使用 gopsutil 库获取 CPU 使用率
    percent, err := cpu.Percent(time.Second, false)
    if err != nil {
        return 0
    }
    return percent[0]
}

func (sm *SystemMonitor) getMemUsage() float64 {
    // 获取内存使用率
    mem, err := mem.VirtualMemory()
    if err != nil {
        return 0
    }
    return mem.UsedPercent
}

func (sm *SystemMonitor) getDiskUsage() (float64, error) {
    // 获取磁盘使用率
    disk, err := disk.Usage("/")
    if err != nil {
        return 0, err
    }
    return disk.UsedPercent, nil
}
```

**动态图标更新：**

```go
func (sm *SystemMonitor) updateIcon() {
    cpu := sm.getCPUUsage()
    mem := sm.getMemUsage()
    
    // 根据负载选择图标
    var iconData []byte
    if cpu > 80 || mem > 80 {
        iconData = sm.getIcon("red")    // 高负载 - 红色
    } else if cpu > 50 || mem > 50 {
        iconData = sm.getIcon("yellow") // 中等负载 - 黄色
    } else {
        iconData = sm.getIcon("green")  // 低负载 - 绿色
    }
    
    systray.SetIcon(iconData)
}

func (sm *SystemMonitor) getIcon(color string) []byte {
    // 根据颜色返回对应的图标数据
    switch color {
    case "red":
        return redIconData
    case "yellow":
        return yellowIconData
    case "green":
        return greenIconData
    default:
        return defaultIconData
    }
}
```

**菜单构建：**

```go
func (sm *SystemMonitor) createMenu() {
    // 系统信息菜单
    sm.cpuItem = systray.AddMenuItem("CPU: 0%", "CPU 使用率")
    sm.memItem = systray.AddMenuItem("内存: 0%", "内存使用率")
    sm.diskItem = systray.AddMenuItem("磁盘: 0%", "磁盘使用率")
    sm.netItem = systray.AddMenuItem("网络: 0 KB/s", "网络流量")
    
    systray.AddSeparator()
    
    // 控制菜单
    mDetails := systray.AddMenuItem("详细信息", "显示详细系统信息")
    mSettings := systray.AddMenuItem("设置", "打开设置窗口")
    
    systray.AddSeparator()
    
    // 退出菜单
    mQuit := systray.AddMenuItem("退出", "退出监控程序")
    
    // 启动事件处理
    go sm.handleMenuEvents(mDetails, mSettings, mQuit)
}

func (sm *SystemMonitor) handleMenuEvents(mDetails, mSettings, mQuit *systray.MenuItem) {
    for {
        select {
        case <-sm.quitChan:
            return
        case <-mDetails.ClickedCh:
            sm.showDetails()
        case <-mSettings.ClickedCh:
            sm.showSettings()
        case <-mQuit.ClickedCh:
            sm.quit()
        }
    }
}
```

**实时更新机制：**

```go
func (sm *SystemMonitor) updateStats() {
    ticker := time.NewTicker(sm.config.UpdateInterval)
    defer ticker.Stop()
    
    for {
        select {
        case <-sm.quitChan:
            return
        case <-ticker.C:
            sm.updateSystemStats()
        }
    }
}

func (sm *SystemMonitor) updateSystemStats() {
    // 获取系统状态
    cpu := sm.getCPUUsage()
    mem := sm.getMemUsage()
    disk, _ := sm.getDiskUsage()
    net := sm.getNetworkSpeed()
    
    // 更新菜单项
    sm.cpuItem.SetTitle(fmt.Sprintf("CPU: %.1f%%", cpu))
    sm.memItem.SetTitle(fmt.Sprintf("内存: %.1f%%", mem))
    sm.diskItem.SetTitle(fmt.Sprintf("磁盘: %.1f%%", disk))
    sm.netItem.SetTitle(fmt.Sprintf("网络: %s", net))
    
    // 更新图标
    sm.updateIcon()
    
    // 检查告警阈值
    if cpu > sm.config.AlertThreshold || mem > sm.config.AlertThreshold {
        sm.showAlert(cpu, mem)
    }
    
    // 缓存状态
    sm.lastCPU = cpu
    sm.lastMem = mem
    sm.lastUpdate = time.Now()
}
```

**详细信息显示：**

```go
func (sm *SystemMonitor) showDetails() {
    // 获取详细系统信息
    info := sm.getSystemInfo()
    
    // 创建详细信息窗口
    details := &DetailsWindow{
        Info: info,
    }
    
    details.Show()
}

func (sm *SystemMonitor) getSystemInfo() *SystemInfo {
    return &SystemInfo{
        CPU: SystemInfo{
            Usage:    sm.getCPUUsage(),
            Cores:    runtime.NumCPU(),
            Model:    sm.getCPUModel(),
        },
        Memory: MemoryInfo{
            Total:     sm.getTotalMemory(),
            Used:      sm.getUsedMemory(),
            Available: sm.getAvailableMemory(),
        },
        Disk: DiskInfo{
            Total: sm.getTotalDisk(),
            Used:  sm.getUsedDisk(),
            Free:  sm.getFreeDisk(),
        },
        Network: NetworkInfo{
            Interfaces: sm.getNetworkInterfaces(),
            Speed:      sm.getNetworkSpeed(),
        },
    }
}
```

**配置管理：**

```go
func (sm *SystemMonitor) loadConfig() error {
    data, err := os.ReadFile("config.json")
    if err != nil {
        // 使用默认配置
        sm.config = &MonitorConfig{
            UpdateInterval: 2 * time.Second,
            ShowDetails:    true,
            AlertThreshold: 80.0,
        }
        return sm.saveConfig()
    }
    
    return json.Unmarshal(data, &sm.config)
}

func (sm *SystemMonitor) saveConfig() error {
    data, err := json.MarshalIndent(sm.config, "", "  ")
    if err != nil {
        return err
    }
    
    return os.WriteFile("config.json", data, 0644)
}
```

**主程序入口：**

```go
func main() {
    monitor := &SystemMonitor{
        quitChan: make(chan struct{}),
    }
    
    // 加载配置
    if err := monitor.loadConfig(); err != nil {
        log.Printf("加载配置失败: %v", err)
    }
    
    // 启动系统托盘
    systray.Run(monitor.onReady, monitor.onExit)
}

func (sm *SystemMonitor) onReady() {
    systray.SetIcon(defaultIconData)
    systray.SetTitle("系统监控")
    systray.SetTooltip("实时系统监控工具")
    
    // 创建菜单
    sm.createMenu()
    
    // 启动监控
    go sm.updateStats()
}

func (sm *SystemMonitor) onExit() {
    close(sm.quitChan)
    log.Println("系统监控程序退出")
}
```

这个系统监控托盘工具展示了 systray 库的核心功能：

1. **动态菜单更新**：实时更新系统状态信息
2. **图标状态变化**：根据系统负载改变图标颜色
3. **事件处理**：响应菜单点击事件
4. **配置管理**：支持用户自定义配置
5. **资源管理**：正确的 goroutine 生命周期管理

通过这个案例，我们可以看到 systray 库在实际应用中的强大功能和灵活性。在下一部分，我们将学习如何将 systray 与 Wails v2 框架集成，构建更复杂的桌面应用程序。

---

## Wails v2 + systray 深度集成

### Wails v2 托盘缺失问题分析

#### 为什么 Wails v2 没有内置托盘

Wails v2 作为现代化的跨平台桌面应用框架，在设计理念上更专注于 Web 技术栈的桌面化，而非传统的原生桌面应用开发。这种设计选择带来了以下影响：

**1. 设计理念差异**

Wails v2 的核心设计理念是：
- **Web 优先**：充分利用现代 Web 技术栈
- **跨平台一致性**：通过 Web 技术实现真正的跨平台体验
- **开发效率**：降低桌面应用开发的学习成本

而系统托盘功能属于平台特定的原生功能，与 Web 技术栈的理念存在一定冲突。

**2. 技术架构限制**

Wails v2 基于以下技术栈：
- **后端**：Go + WebView
- **前端**：现代 Web 框架（React、Vue、Svelte 等）
- **通信**：基于 JSON-RPC 的进程间通信

系统托盘功能需要：
- 平台特定的系统 API 调用
- 复杂的窗口状态管理
- 与操作系统深度集成

**3. 维护成本考虑**

系统托盘功能在不同平台上的实现差异巨大：
- **Windows**：Shell_NotifyIcon API，需要处理复杂的消息循环
- **macOS**：NSStatusItem 和 NSMenu，需要 Objective-C 集成
- **Linux**：AppIndicator 或 StatusNotifierItem，依赖桌面环境

为 Wails v2 添加系统托盘功能会显著增加维护成本。

#### 集成方案对比

在 Wails v2 项目中集成系统托盘功能，有以下几种主要方案：

| 方案 | 优势 | 劣势 | 适用场景 |
|------|------|------|----------|
| **systray 库** | 专精托盘、API简洁、维护活跃 | 需要 CGO、增加依赖 | 推荐方案 |
| **Fyne 集成** | 完整GUI框架、功能丰富 | 体积大、学习成本高 | 复杂GUI应用 |
| **平台特定实现** | 性能最优、功能完整 | 维护复杂、跨平台差 | 单一平台应用 |
| **Web 技术模拟** | 开发简单、一致性好 | 功能受限、性能较差 | 简单托盘需求 |

**systray 方案的核心优势：**

1. **专业性强**：专门解决系统托盘问题，API 设计简洁
2. **维护活跃**：GitHub 3.6k+ stars，持续更新维护
3. **集成简单**：可以轻松集成到现有 Wails 项目中
4. **跨平台好**：原生支持三大主流操作系统

### 集成架构设计

#### 整体架构

```
┌─────────────────────────────────────┐
│         Wails Application           │
│  ┌──────────┐      ┌─────────────┐  │
│  │ Frontend │◄────►│  Go Backend │  │
│  │  (Vue)   │      │             │  │
│  └──────────┘      └──────┬──────┘  │
│                            │         │
└────────────────────────────┼─────────┘
                             │
                    ┌────────▼────────┐
                    │ Tray Manager    │
                    │   (systray)     │
                    └─────────────────┘
```

**架构层次说明：**

1. **前端层（Vue）**：用户界面，处理用户交互
2. **后端层（Go）**：业务逻辑，数据管理
3. **托盘层（systray）**：系统集成，快速访问
4. **通信层**：前后端数据交换，托盘与主应用协调

#### 关键设计原则

**1. 分离关注点**

```go
// 主应用结构
type App struct {
    ctx        context.Context
    trayMgr    *TrayManager
    windowMgr  *WindowManager
    configMgr  *ConfigManager
}

// 托盘管理器
type TrayManager struct {
    app       *App
    menuItems map[string]*systray.MenuItem
    isActive  bool
}

// 窗口管理器
type WindowManager struct {
    app       *App
    isVisible bool
    isFocused bool
}
```

**2. 事件驱动架构**

```go
// 事件类型定义
type TrayEvent struct {
    Type string      `json:"type"`
    Data interface{} `json:"data"`
}

// 事件处理器
type EventHandler struct {
    handlers map[string]func(interface{})
}

func (eh *EventHandler) Register(eventType string, handler func(interface{})) {
    eh.handlers[eventType] = handler
}

func (eh *EventHandler) Emit(event TrayEvent) {
    if handler, exists := eh.handlers[event.Type]; exists {
        handler(event.Data)
    }
}
```

**3. 状态同步机制**

```go
// 应用状态
type AppState struct {
    TrayVisible   bool   `json:"tray_visible"`
    WindowVisible bool   `json:"window_visible"`
    CurrentMode   string `json:"current_mode"`
    LastUpdate    time.Time `json:"last_update"`
}

// 状态同步器
type StateSync struct {
    app    *App
    state  *AppState
    mutex  sync.RWMutex
}

func (ss *StateSync) UpdateState(updates map[string]interface{}) {
    ss.mutex.Lock()
    defer ss.mutex.Unlock()
    
    for key, value := range updates {
        switch key {
        case "tray_visible":
            ss.state.TrayVisible = value.(bool)
        case "window_visible":
            ss.state.WindowVisible = value.(bool)
        case "current_mode":
            ss.state.CurrentMode = value.(string)
        }
    }
    
    ss.state.LastUpdate = time.Now()
    
    // 通知前端状态变化
    ss.notifyFrontend()
}
```

#### 模块划分

**1. 主程序入口（main.go）**

```go
package main

import (
    "context"
    "log"
    
    "github.com/getlantern/systray"
    "github.com/wailsapp/wails/v2"
    "github.com/wailsapp/wails/v2/pkg/options"
    "github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

func main() {
    // 创建应用实例
    app := NewApp()
    
    // 启动系统托盘（独立 goroutine）
    go func() {
        systray.Run(app.trayMgr.onReady, app.trayMgr.onExit)
    }()
    
    // 启动 Wails 应用（主线程）
    err := wails.Run(&options.App{
        Title:  "智能托盘应用",
        Width:  1024,
        Height: 768,
        AssetServer: &assetserver.Options{
            Assets: assets,
        },
        BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
        OnStartup:        app.startup,
        OnDomReady:       app.domReady,
        OnBeforeClose:    app.beforeClose,
        OnShutdown:       app.shutdown,
        Bind: []interface{}{
            app,
            app.trayMgr,
            app.windowMgr,
        },
    })
    
    if err != nil {
        log.Fatal(err)
    }
}
```

**2. 托盘管理器（app/tray.go）**

```go
package app

import (
    "context"
    "log"
    
    "github.com/getlantern/systray"
)

type TrayManager struct {
    app        *App
    ctx        context.Context
    menuItems  map[string]*systray.MenuItem
    isActive   bool
    eventChan  chan TrayEvent
}

func NewTrayManager() *TrayManager {
    return &TrayManager{
        menuItems: make(map[string]*systray.MenuItem),
        eventChan: make(chan TrayEvent, 100),
    }
}

func (tm *TrayManager) setApp(app *App) {
    tm.app = app
    tm.ctx = app.ctx
}

func (tm *TrayManager) onReady() {
    systray.SetIcon(iconData)
    systray.SetTitle("智能托盘应用")
    systray.SetTooltip("Wails v2 + systray 集成应用")
    
    tm.isActive = true
    tm.createMenu()
    
    // 启动事件处理
    go tm.handleEvents()
}

func (tm *TrayManager) onExit() {
    tm.isActive = false
    close(tm.eventChan)
    log.Println("系统托盘退出")
}
```

**3. 窗口管理器（app/window.go）**

```go
package app

import (
    "context"
    "github.com/wailsapp/wails/v2/pkg/runtime"
)

type WindowManager struct {
    app       *App
    ctx       context.Context
    isVisible bool
    isFocused bool
}

func NewWindowManager(app *App) *WindowManager {
    return &WindowManager{
        app:       app,
        ctx:       app.ctx,
        isVisible: true,
    }
}

func (wm *WindowManager) Show() error {
    err := runtime.WindowShow(wm.ctx)
    if err == nil {
        wm.isVisible = true
        wm.notifyStateChange()
    }
    return err
}

func (wm *WindowManager) Hide() error {
    err := runtime.WindowHide(wm.ctx)
    if err == nil {
        wm.isVisible = false
        wm.notifyStateChange()
    }
    return err
}

func (wm *WindowManager) Toggle() error {
    if wm.isVisible {
        return wm.Hide()
    }
    return wm.Show()
}

func (wm *WindowManager) notifyStateChange() {
    // 通知前端窗口状态变化
    runtime.EventsEmit(wm.ctx, "window-state-changed", map[string]interface{}{
        "visible": wm.isVisible,
        "focused": wm.isFocused,
    })
}
```

**4. 通信桥接（app/bridge.go）**

```go
package app

import (
    "encoding/json"
    "github.com/wailsapp/wails/v2/pkg/runtime"
)

type Bridge struct {
    app *App
    ctx context.Context
}

func NewBridge(app *App) *Bridge {
    return &Bridge{
        app: app,
        ctx: app.ctx,
    }
}

// 发送事件到前端
func (b *Bridge) EmitToFrontend(eventType string, data interface{}) error {
    return runtime.EventsEmit(b.ctx, eventType, data)
}

// 处理来自前端的消息
func (b *Bridge) HandleFrontendMessage(message string) error {
    var event TrayEvent
    if err := json.Unmarshal([]byte(message), &event); err != nil {
        return err
    }
    
    switch event.Type {
    case "tray-update":
        return b.handleTrayUpdate(event.Data)
    case "window-toggle":
        return b.handleWindowToggle()
    case "config-change":
        return b.handleConfigChange(event.Data)
    default:
        log.Printf("未知事件类型: %s", event.Type)
    }
    
    return nil
}

func (b *Bridge) handleTrayUpdate(data interface{}) error {
    // 处理托盘更新请求
    return b.app.trayMgr.UpdateMenu(data)
}

func (b *Bridge) handleWindowToggle() error {
    return b.app.windowMgr.Toggle()
}

func (b *Bridge) handleConfigChange(data interface{}) error {
    // 处理配置变更
    return b.app.configMgr.UpdateConfig(data)
}
```

### 核心实现详解

#### 主程序启动流程

**启动顺序设计：**

1. **初始化阶段**：创建各个管理器实例
2. **托盘启动**：在独立 goroutine 中启动 systray
3. **Wails 启动**：在主线程中启动 Wails 应用
4. **状态同步**：建立前后端通信机制

```go
func main() {
    // 1. 创建应用实例
    app := NewApp()
    
    // 2. 启动系统托盘（独立 goroutine）
    go func() {
        defer func() {
            if r := recover(); r != nil {
                log.Printf("托盘启动异常: %v", r)
            }
        }()
        
        systray.Run(app.trayMgr.onReady, app.trayMgr.onExit)
    }()
    
    // 3. 启动 Wails 应用（主线程）
    err := wails.Run(&options.App{
        Title:         "智能托盘应用",
        Width:         1024,
        Height:        768,
        AssetServer:   &assetserver.Options{Assets: assets},
        BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
        OnStartup:     app.startup,
        OnDomReady:    app.domReady,
        OnBeforeClose: app.beforeClose,
        OnShutdown:    app.shutdown,
        Bind: []interface{}{
            app,
            app.trayMgr,
            app.windowMgr,
            app.bridge,
        },
    })
    
    if err != nil {
        log.Fatal("Wails 应用启动失败:", err)
    }
}

func NewApp() *App {
    app := &App{}
    
    // 初始化各个管理器
    app.trayMgr = NewTrayManager()
    app.windowMgr = NewWindowManager(app)
    app.bridge = NewBridge(app)
    app.configMgr = NewConfigManager()
    
    return app
}
```

**应用生命周期管理：**

```go
func (a *App) startup(ctx context.Context) {
    a.ctx = ctx
    
    // 设置各个管理器的上下文
    a.trayMgr.setApp(a)
    a.windowMgr.setApp(a)
    a.bridge.setApp(a)
    
    // 加载配置
    if err := a.configMgr.LoadConfig(); err != nil {
        log.Printf("配置加载失败: %v", err)
    }
    
    // 初始化托盘菜单
    go func() {
        time.Sleep(100 * time.Millisecond) // 等待托盘就绪
        a.trayMgr.InitializeMenu()
    }()
}

func (a *App) domReady(ctx context.Context) {
    // 前端加载完成后的处理
    log.Println("前端 DOM 准备就绪")
    
    // 发送初始状态到前端
    a.bridge.EmitToFrontend("app-ready", map[string]interface{}{
        "version": "1.0.0",
        "tray_active": a.trayMgr.isActive,
    })
}

func (a *App) beforeClose(ctx context.Context) (prevent bool) {
    // 检查是否应该最小化到托盘
    if a.configMgr.GetBool("close_to_tray", false) {
        a.windowMgr.Hide()
        return true // 阻止关闭
    }
    return false
}

func (a *App) shutdown(ctx context.Context) {
    // 清理资源
    a.trayMgr.Cleanup()
    a.configMgr.SaveConfig()
    log.Println("应用关闭")
}
```

#### 托盘管理器实现

**菜单创建策略：**

```go
func (tm *TrayManager) createMenu() {
    // 清空现有菜单
    systray.ResetMenu()
    
    // 窗口控制菜单
    tm.addWindowMenu()
    
    systray.AddSeparator()
    
    // 功能菜单
    tm.addFunctionMenu()
    
    systray.AddSeparator()
    
    // 设置菜单
    tm.addSettingsMenu()
    
    systray.AddSeparator()
    
    // 退出菜单
    tm.addQuitMenu()
}

func (tm *TrayManager) addWindowMenu() {
    // 显示/隐藏窗口
    showItem := systray.AddMenuItem("显示主窗口", "显示应用程序主窗口")
    hideItem := systray.AddMenuItem("隐藏主窗口", "隐藏应用程序主窗口")
    
    tm.menuItems["show"] = showItem
    tm.menuItems["hide"] = hideItem
    
    // 处理点击事件
    go func() {
        for {
            select {
            case <-showItem.ClickedCh:
                tm.handleShowWindow()
            case <-hideItem.ClickedCh:
                tm.handleHideWindow()
            case <-tm.eventChan:
                return
            }
        }
    }()
}

func (tm *TrayManager) addFunctionMenu() {
    // 文件夹管理
    folderItem := systray.AddMenuItem("📁 文件夹管理", "快速访问文件夹")
    tm.menuItems["folder"] = folderItem
    
    // 书签管理
    bookmarkItem := systray.AddMenuItem("🔖 书签管理", "快速访问书签")
    tm.menuItems["bookmark"] = bookmarkItem
    
    go func() {
        for {
            select {
            case <-folderItem.ClickedCh:
                tm.handleFolderManager()
            case <-bookmarkItem.ClickedCh:
                tm.handleBookmarkManager()
            case <-tm.eventChan:
                return
            }
        }
    }()
}
```

**事件处理机制：**

```go
func (tm *TrayManager) handleEvents() {
    for {
        select {
        case event := <-tm.eventChan:
            tm.processEvent(event)
        case <-tm.ctx.Done():
            return
        }
    }
}

func (tm *TrayManager) processEvent(event TrayEvent) {
    switch event.Type {
    case "show-window":
        tm.handleShowWindow()
    case "hide-window":
        tm.handleHideWindow()
    case "open-folder-manager":
        tm.handleFolderManager()
    case "open-bookmark-manager":
        tm.handleBookmarkManager()
    case "update-menu":
        tm.updateMenu(event.Data)
    default:
        log.Printf("未知托盘事件: %s", event.Type)
    }
}

func (tm *TrayManager) handleShowWindow() {
    if tm.app != nil {
        tm.app.windowMgr.Show()
        
        // 通知前端
        tm.app.bridge.EmitToFrontend("tray-show-window", nil)
    }
}

func (tm *TrayManager) handleHideWindow() {
    if tm.app != nil {
        tm.app.windowMgr.Hide()
        
        // 通知前端
        tm.app.bridge.EmitToFrontend("tray-hide-window", nil)
    }
}
```

#### 窗口状态管理

**窗口状态跟踪：**

```go
type WindowState struct {
    IsVisible    bool      `json:"is_visible"`
    IsFocused    bool      `json:"is_focused"`
    IsMinimized  bool      `json:"is_minimized"`
    IsMaximized  bool      `json:"is_maximized"`
    LastActivity time.Time `json:"last_activity"`
}

func (wm *WindowManager) GetState() WindowState {
    return WindowState{
        IsVisible:    wm.isVisible,
        IsFocused:    wm.isFocused,
        IsMinimized:  wm.isMinimized,
        IsMaximized:  wm.isMaximized,
        LastActivity: wm.lastActivity,
    }
}

func (wm *WindowManager) UpdateState(newState WindowState) {
    wm.mutex.Lock()
    defer wm.mutex.Unlock()
    
    wm.isVisible = newState.IsVisible
    wm.isFocused = newState.IsFocused
    wm.isMinimized = newState.IsMinimized
    wm.isMaximized = newState.IsMaximized
    wm.lastActivity = newState.LastActivity
    
    // 通知状态变化
    wm.notifyStateChange()
}
```

**窗口操作封装：**

```go
func (wm *WindowManager) Show() error {
    if wm.isVisible {
        return nil // 已经可见
    }
    
    err := runtime.WindowShow(wm.ctx)
    if err != nil {
        return fmt.Errorf("显示窗口失败: %w", err)
    }
    
    wm.isVisible = true
    wm.lastActivity = time.Now()
    wm.notifyStateChange()
    
    return nil
}

func (wm *WindowManager) Hide() error {
    if !wm.isVisible {
        return nil // 已经隐藏
    }
    
    err := runtime.WindowHide(wm.ctx)
    if err != nil {
        return fmt.Errorf("隐藏窗口失败: %w", err)
    }
    
    wm.isVisible = false
    wm.lastActivity = time.Now()
    wm.notifyStateChange()
}

func (wm *WindowManager) Toggle() error {
    if wm.isVisible {
        return wm.Hide()
    }
    return wm.Show()
}

func (wm *WindowManager) Minimize() error {
    err := runtime.WindowMinimise(wm.ctx)
    if err != nil {
        return fmt.Errorf("最小化窗口失败: %w", err)
    }
    
    wm.isMinimized = true
    wm.lastActivity = time.Now()
    wm.notifyStateChange()
    
    return nil
}

func (wm *WindowManager) Maximize() error {
    err := runtime.WindowMaximise(wm.ctx)
    if err != nil {
        return fmt.Errorf("最大化窗口失败: %w", err)
    }
    
    wm.isMaximized = true
    wm.lastActivity = time.Now()
    wm.notifyStateChange()
    
    return nil
}
```

#### 前后端通信实现

**事件系统设计：**

```go
// 事件类型定义
const (
    EventTrayShow      = "tray-show"
    EventTrayHide      = "tray-hide"
    EventWindowShow    = "window-show"
    EventWindowHide    = "window-hide"
    EventConfigChange  = "config-change"
    EventMenuUpdate    = "menu-update"
)

// 事件数据结构
type EventData struct {
    Type      string      `json:"type"`
    Timestamp time.Time   `json:"timestamp"`
    Data      interface{} `json:"data"`
    Source    string      `json:"source"`
}

// 事件总线
type EventBus struct {
    handlers map[string][]func(EventData)
    mutex    sync.RWMutex
}

func NewEventBus() *EventBus {
    return &EventBus{
        handlers: make(map[string][]func(EventData)),
    }
}

func (eb *EventBus) Subscribe(eventType string, handler func(EventData)) {
    eb.mutex.Lock()
    defer eb.mutex.Unlock()
    
    eb.handlers[eventType] = append(eb.handlers[eventType], handler)
}

func (eb *EventBus) Emit(event EventData) {
    eb.mutex.RLock()
    handlers := eb.handlers[event.Type]
    eb.mutex.RUnlock()
    
    for _, handler := range handlers {
        go handler(event) // 异步处理
    }
}
```

**Go 后端到前端通信：**

```go
// 发送事件到前端
func (b *Bridge) EmitToFrontend(eventType string, data interface{}) error {
    event := EventData{
        Type:      eventType,
        Timestamp: time.Now(),
        Data:      data,
        Source:    "backend",
    }
    
    // 序列化事件数据
    eventData, err := json.Marshal(event)
    if err != nil {
        return fmt.Errorf("序列化事件失败: %w", err)
    }
    
    // 通过 Wails runtime 发送事件
    return runtime.EventsEmit(b.ctx, "backend-event", string(eventData))
}

// 处理来自前端的消息
func (b *Bridge) HandleFrontendMessage(message string) error {
    var event EventData
    if err := json.Unmarshal([]byte(message), &event); err != nil {
        return fmt.Errorf("解析前端消息失败: %w", err)
    }
    
    event.Source = "frontend"
    event.Timestamp = time.Now()
    
    // 分发事件
    b.eventBus.Emit(event)
    
    return nil
}
```

**前端事件监听：**

```javascript
// 前端事件监听器
class EventListener {
    constructor() {
        this.handlers = new Map();
        this.setupWailsEvents();
    }
    
    setupWailsEvents() {
        // 监听来自 Go 后端的事件
        EventsOn('backend-event', (eventData) => {
            this.handleBackendEvent(eventData);
        });
    }
    
    handleBackendEvent(eventData) {
        try {
            const event = JSON.parse(eventData);
            this.dispatchEvent(event.type, event);
        } catch (error) {
            console.error('处理后端事件失败:', error);
        }
    }
    
    dispatchEvent(eventType, event) {
        const handlers = this.handlers.get(eventType) || [];
        handlers.forEach(handler => {
            try {
                handler(event);
            } catch (error) {
                console.error(`事件处理器错误 (${eventType}):`, error);
            }
        });
    }
    
    subscribe(eventType, handler) {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, []);
        }
        this.handlers.get(eventType).push(handler);
    }
    
    emitToBackend(eventType, data) {
        const event = {
            type: eventType,
            timestamp: new Date().toISOString(),
            data: data,
            source: 'frontend'
        };
        
        // 发送到 Go 后端
        GoBridge.HandleFrontendMessage(JSON.stringify(event));
    }
}
```

### 前端集成方案

#### Vue 3 组件设计

**主应用组件：**

```vue
<template>
  <div id="app">
    <header class="app-header">
      <h1>智能托盘应用</h1>
      <div class="status-indicators">
        <StatusIndicator 
          :active="trayActive" 
          label="托盘状态" 
        />
        <StatusIndicator 
          :active="windowVisible" 
          label="窗口状态" 
        />
      </div>
    </header>
    
    <main class="app-main">
      <div class="tabs">
        <button 
          v-for="tab in tabs"
          :key="tab.id"
          :class="{ active: activeTab === tab.id }"
          @click="switchTab(tab.id)"
        >
          {{ tab.name }}
        </button>
      </div>
      
      <div class="tab-content">
        <FolderManager 
          v-if="activeTab === 'folders'"
          :folders="folders"
          @folder-added="handleFolderAdded"
          @folder-removed="handleFolderRemoved"
        />
        
        <BookmarkManager 
          v-if="activeTab === 'bookmarks'"
          :bookmarks="bookmarks"
          @bookmark-added="handleBookmarkAdded"
          @bookmark-removed="handleBookmarkRemoved"
        />
        
        <Settings 
          v-if="activeTab === 'settings'"
          :config="config"
          @config-changed="handleConfigChanged"
        />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { EventsOn } from '../wailsjs/runtime/runtime'
import StatusIndicator from './components/StatusIndicator.vue'
import FolderManager from './components/FolderManager.vue'
import BookmarkManager from './components/BookmarkManager.vue'
import Settings from './components/Settings.vue'

// 响应式数据
const trayActive = ref(false)
const windowVisible = ref(true)
const activeTab = ref('folders')
const folders = ref([])
const bookmarks = ref([])
const config = ref({})

// 标签页配置
const tabs = [
  { id: 'folders', name: '文件夹管理' },
  { id: 'bookmarks', name: '书签管理' },
  { id: 'settings', name: '设置' }
]

// 事件监听器
let eventListener = null

onMounted(() => {
  // 初始化事件监听器
  eventListener = new EventListener()
  
  // 订阅各种事件
  eventListener.subscribe('tray-show', handleTrayShow)
  eventListener.subscribe('tray-hide', handleTrayHide)
  eventListener.subscribe('window-show', handleWindowShow)
  eventListener.subscribe('window-hide', handleWindowHide)
  eventListener.subscribe('config-changed', handleConfigChanged)
  
  // 加载初始数据
  loadInitialData()
})

onUnmounted(() => {
  if (eventListener) {
    eventListener.cleanup()
  }
})

// 事件处理方法
function handleTrayShow(event) {
  trayActive.value = true
  console.log('托盘已显示')
}

function handleTrayHide(event) {
  trayActive.value = false
  console.log('托盘已隐藏')
}

function handleWindowShow(event) {
  windowVisible.value = true
  console.log('窗口已显示')
}

function handleWindowHide(event) {
  windowVisible.value = false
  console.log('窗口已隐藏')
}

function handleConfigChanged(event) {
  config.value = { ...config.value, ...event.data }
  console.log('配置已更新:', event.data)
}

// 标签页切换
function switchTab(tabId) {
  activeTab.value = tabId
}

// 数据加载
async function loadInitialData() {
  try {
    // 从 Go 后端加载数据
    folders.value = await GoBridge.GetFolders()
    bookmarks.value = await GoBridge.GetBookmarks()
    config.value = await GoBridge.GetConfig()
  } catch (error) {
    console.error('加载数据失败:', error)
  }
}

// 事件处理
function handleFolderAdded(folder) {
  folders.value.push(folder)
  // 通知后端
  eventListener.emitToBackend('folder-added', folder)
}

function handleFolderRemoved(folderId) {
  folders.value = folders.value.filter(f => f.id !== folderId)
  // 通知后端
  eventListener.emitToBackend('folder-removed', { id: folderId })
}

function handleBookmarkAdded(bookmark) {
  bookmarks.value.push(bookmark)
  // 通知后端
  eventListener.emitToBackend('bookmark-added', bookmark)
}

function handleBookmarkRemoved(bookmarkId) {
  bookmarks.value = bookmarks.value.filter(b => b.id !== bookmarkId)
  // 通知后端
  eventListener.emitToBackend('bookmark-removed', { id: bookmarkId })
}

function handleConfigChanged(newConfig) {
  config.value = { ...config.value, ...newConfig }
  // 通知后端
  eventListener.emitToBackend('config-changed', newConfig)
}
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.status-indicators {
  display: flex;
  gap: 1rem;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #dee2e6;
}

.tabs button {
  padding: 0.75rem 1.5rem;
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tabs button.active {
  border-bottom-color: #007bff;
  color: #007bff;
}

.tab-content {
  padding: 1.5rem;
}
</style>
```

**状态指示器组件：**

```vue
<template>
  <div class="status-indicator">
    <div 
      class="status-dot"
      :class="{ active: active }"
    ></div>
    <span class="status-label">{{ label }}</span>
  </div>
</template>

<script setup>
defineProps({
  active: {
    type: Boolean,
    default: false
  },
  label: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dc3545;
  transition: background-color 0.2s;
}

.status-dot.active {
  background: #28a745;
}

.status-label {
  font-size: 0.875rem;
  color: #6c757d;
}
</style>
```

#### 状态同步策略

**Pinia Store 管理：**

```javascript
// stores/app.js
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    trayActive: false,
    windowVisible: true,
    currentMode: 'folders',
    folders: [],
    bookmarks: [],
    config: {
      autoRefresh: true,
      refreshInterval: 30,
      theme: 'light'
    }
  }),
  
  getters: {
    isTrayActive: (state) => state.trayActive,
    isWindowVisible: (state) => state.windowVisible,
    getFolders: (state) => state.folders,
    getBookmarks: (state) => state.bookmarks,
    getConfig: (state) => state.config
  },
  
  actions: {
    setTrayActive(active) {
      this.trayActive = active
    },
    
    setWindowVisible(visible) {
      this.windowVisible = visible
    },
    
    setCurrentMode(mode) {
      this.currentMode = mode
    },
    
    updateFolders(folders) {
      this.folders = folders
    },
    
    addFolder(folder) {
      this.folders.push(folder)
    },
    
    removeFolder(folderId) {
      this.folders = this.folders.filter(f => f.id !== folderId)
    },
    
    updateBookmarks(bookmarks) {
      this.bookmarks = bookmarks
    },
    
    addBookmark(bookmark) {
      this.bookmarks.push(bookmark)
    },
    
    removeBookmark(bookmarkId) {
      this.bookmarks = this.bookmarks.filter(b => b.id !== bookmarkId)
    },
    
    updateConfig(config) {
      this.config = { ...this.config, ...config }
    }
  }
})
```

**持久化配置管理：**

```javascript
// utils/storage.js
export class StorageManager {
  constructor() {
    this.storageKey = 'smart-tray-app'
  }
  
  save(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data))
    } catch (error) {
      console.error('保存数据失败:', error)
    }
  }
  
  load() {
    try {
      const data = localStorage.getItem(this.storageKey)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('加载数据失败:', error)
      return null
    }
  }
  
  clear() {
    localStorage.removeItem(this.storageKey)
  }
}

// 在应用中使用
export function useStorage() {
  const storage = new StorageManager()
  
  const saveAppState = (state) => {
    storage.save({
      config: state.config,
      folders: state.folders,
      bookmarks: state.bookmarks,
      lastUpdated: new Date().toISOString()
    })
  }
  
  const loadAppState = () => {
    return storage.load()
  }
  
  return {
    saveAppState,
    loadAppState
  }
}
```

### 高级功能实现

#### 最小化到托盘

**窗口关闭拦截：**

```go
func (a *App) beforeClose(ctx context.Context) (prevent bool) {
    // 检查配置是否允许最小化到托盘
    if a.configMgr.GetBool("close_to_tray", false) {
        // 隐藏窗口而不是关闭
        a.windowMgr.Hide()
        
        // 显示通知
        a.trayMgr.ShowNotification(
            "应用已最小化到托盘",
            "点击托盘图标可以重新打开应用",
        )
        
        return true // 阻止关闭
    }
    
    return false // 允许关闭
}
```

**托盘通知实现：**

```go
func (tm *TrayManager) ShowNotification(title, message string) {
    // 平台特定的通知实现
    switch runtime.GOOS {
    case "windows":
        tm.showWindowsNotification(title, message)
    case "darwin":
        tm.showMacOSNotification(title, message)
    case "linux":
        tm.showLinuxNotification(title, message)
    }
}

func (tm *TrayManager) showWindowsNotification(title, message string) {
    // Windows Toast Notification
    // 使用 Windows API 显示通知
}

func (tm *TrayManager) showMacOSNotification(title, message string) {
    // macOS NSUserNotification
    // 使用 Objective-C 调用显示通知
}

func (tm *TrayManager) showLinuxNotification(title, message string) {
    // Linux libnotify
    // 使用 notify-send 命令或 libnotify 库
}
```

#### 通知系统集成

**跨平台通知封装：**

```go
package notifications

import (
    "os/exec"
    "runtime"
)

type NotificationManager struct {
    enabled bool
}

func NewNotificationManager() *NotificationManager {
    return &NotificationManager{
        enabled: true,
    }
}

func (nm *NotificationManager) Show(title, message string) error {
    if !nm.enabled {
        return nil
    }
    
    switch runtime.GOOS {
    case "windows":
        return nm.showWindowsNotification(title, message)
    case "darwin":
        return nm.showMacOSNotification(title, message)
    case "linux":
        return nm.showLinuxNotification(title, message)
    default:
        return fmt.Errorf("不支持的操作系统: %s", runtime.GOOS)
    }
}

func (nm *NotificationManager) showWindowsNotification(title, message string) error {
    // 使用 PowerShell 显示通知
    script := fmt.Sprintf(`
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
        $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
        $textNodes = $template.GetElementsByTagName("text")
        $textNodes.Item(0).AppendChild($template.CreateTextNode("%s"))
        $textNodes.Item(1).AppendChild($template.CreateTextNode("%s"))
        $toast = [Windows.UI.Notifications.ToastNotification]::new($template)
        [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("SmartTrayApp").Show($toast)
    `, title, message)
    
    cmd := exec.Command("powershell", "-Command", script)
    return cmd.Run()
}

func (nm *NotificationManager) showMacOSNotification(title, message string) error {
    // 使用 osascript 显示通知
    script := fmt.Sprintf(`
        display notification "%s" with title "%s"
    `, message, title)
    
    cmd := exec.Command("osascript", "-e", script)
    return cmd.Run()
}

func (nm *NotificationManager) showLinuxNotification(title, message string) error {
    // 使用 notify-send 命令
    cmd := exec.Command("notify-send", title, message)
    return cmd.Run()
}
```

#### 快捷键支持

**全局热键注册：**

```go
package hotkeys

import (
    "github.com/MakeNowJust/hotkey"
)

type HotkeyManager struct {
    hotkeys map[string]*hotkey.Hotkey
}

func NewHotkeyManager() *HotkeyManager {
    return &HotkeyManager{
        hotkeys: make(map[string]*hotkey.Hotkey),
    }
}

func (hm *HotkeyManager) Register(key string, handler func()) error {
    hk, err := hotkey.New([]hotkey.Modifier{}, hotkey.Key(key))
    if err != nil {
        return err
    }
    
    hm.hotkeys[key] = hk
    
    go func() {
        for range hk.Keydown() {
            handler()
        }
    }()
    
    return nil
}

func (hm *HotkeyManager) Unregister(key string) {
    if hk, exists := hm.hotkeys[key]; exists {
        hk.Unregister()
        delete(hm.hotkeys, key)
    }
}

func (hm *HotkeyManager) Cleanup() {
    for _, hk := range hm.hotkeys {
        hk.Unregister()
    }
    hm.hotkeys = make(map[string]*hotkey.Hotkey)
}
```

**托盘菜单快捷键：**

```go
func (tm *TrayManager) addKeyboardShortcuts() {
    // 注册全局快捷键
    hotkeyMgr := hotkeys.NewHotkeyManager()
    
    // Ctrl+Alt+T: 切换窗口显示/隐藏
    hotkeyMgr.Register("T", func() {
        tm.app.windowMgr.Toggle()
    })
    
    // Ctrl+Alt+F: 打开文件夹管理
    hotkeyMgr.Register("F", func() {
        tm.handleFolderManager()
    })
    
    // Ctrl+Alt+B: 打开书签管理
    hotkeyMgr.Register("B", func() {
        tm.handleBookmarkManager()
    })
    
    // Ctrl+Alt+Q: 退出应用
    hotkeyMgr.Register("Q", func() {
        tm.quit()
    })
}
```

#### 自动启动配置

**Windows 注册表配置：**

```go
func (am *AutoStartManager) EnableWindowsAutoStart() error {
    key := `SOFTWARE\Microsoft\Windows\CurrentVersion\Run`
    value := "SmartTrayApp"
    
    // 获取当前可执行文件路径
    exePath, err := os.Executable()
    if err != nil {
        return err
    }
    
    // 写入注册表
    cmd := exec.Command("reg", "add", 
        "HKEY_CURRENT_USER\\"+key, 
        "/v", value, 
        "/t", "REG_SZ", 
        "/d", exePath, 
        "/f")
    
    return cmd.Run()
}

func (am *AutoStartManager) DisableWindowsAutoStart() error {
    key := `SOFTWARE\Microsoft\Windows\CurrentVersion\Run`
    value := "SmartTrayApp"
    
    cmd := exec.Command("reg", "delete", 
        "HKEY_CURRENT_USER\\"+key, 
        "/v", value, 
        "/f")
    
    return cmd.Run()
}
```

**macOS LaunchAgents 配置：**

```go
func (am *AutoStartManager) EnableMacOSAutoStart() error {
    homeDir, err := os.UserHomeDir()
    if err != nil {
        return err
    }
    
    launchAgentPath := filepath.Join(homeDir, "Library", "LaunchAgents", "com.smarttray.app.plist")
    
    // 获取当前可执行文件路径
    exePath, err := os.Executable()
    if err != nil {
        return err
    }
    
    plistContent := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.smarttray.app</string>
    <key>ProgramArguments</key>
    <array>
        <string>%s</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
</dict>
</plist>`, exePath)
    
    return os.WriteFile(launchAgentPath, []byte(plistContent), 0644)
}
```

**Linux .desktop 文件配置：**

```go
func (am *AutoStartManager) EnableLinuxAutoStart() error {
    homeDir, err := os.UserHomeDir()
    if err != nil {
        return err
    }
    
    autostartDir := filepath.Join(homeDir, ".config", "autostart")
    os.MkdirAll(autostartDir, 0755)
    
    desktopPath := filepath.Join(autostartDir, "smart-tray-app.desktop")
    
    // 获取当前可执行文件路径
    exePath, err := os.Executable()
    if err != nil {
        return err
    }
    
    desktopContent := fmt.Sprintf(`[Desktop Entry]
Type=Application
Name=Smart Tray App
Comment=智能托盘应用
Exec=%s
Icon=smart-tray-app
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
`, exePath)
    
    return os.WriteFile(desktopPath, []byte(desktopContent), 0644)
}
```

通过以上实现，我们成功地将 systray 库与 Wails v2 框架深度集成，解决了 Wails v2 缺乏系统托盘功能的问题。这种集成方案具有以下优势：

1. **无缝集成**：systray 在独立 goroutine 中运行，不影响 Wails 主应用
2. **双向通信**：前后端可以实时同步状态和事件
3. **跨平台支持**：利用 systray 的跨平台能力
4. **功能完整**：支持窗口管理、通知、快捷键等高级功能
5. **易于维护**：清晰的模块划分和事件驱动架构

在下一部分，我们将基于这个集成方案，构建两个完整的实战项目：文件夹快速访问和网址书签管理。

---

## 双实战项目完整实现

### 项目一：动态文件夹快速访问

#### 功能设计

文件夹快速访问系统是一个实用的桌面工具，允许用户通过系统托盘快速访问常用文件夹。该系统具有以下核心功能：

**主要特性：**

1. **动态文件夹管理**：支持添加、删除、编辑文件夹
2. **分类组织**：按工作、个人、项目等分类管理
3. **快速访问**：点击托盘菜单直接打开文件夹
4. **智能排序**：根据访问频率和使用习惯排序
5. **跨平台支持**：Windows、macOS、Linux 全平台兼容
6. **配置持久化**：支持配置文件和数据库存储

**技术架构：**

```
┌─────────────────────────────────────┐
│         Frontend (Vue 3)            │
│  ┌─────────────┐  ┌─────────────┐   │
│  │ Folder UI   │  │ Settings UI │   │
│  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────┘
                    │
┌─────────────────────────────────────┐
│         Backend (Go)                 │
│  ┌─────────────┐  ┌─────────────┐   │
│  │ Folder API  │  │ Config API  │   │
│  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────┘
                    │
┌─────────────────────────────────────┐
│         System Tray                 │
│  ┌─────────────┐  ┌─────────────┐   │
│  │ Menu Items  │  │ File Ops    │   │
│  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────┘
```

#### 数据模型设计

**核心数据结构：**

```go
// models/folder.go
package models

import (
    "time"
    "encoding/json"
)

type Folder struct {
    ID          int       `json:"id" db:"id"`
    Name        string    `json:"name" db:"name"`
    Path        string    `json:"path" db:"path"`
    Icon        string    `json:"icon" db:"icon"`
    Category    string    `json:"category" db:"category"`
    Order       int       `json:"order" db:"order"`
    AccessCount int       `json:"access_count" db:"access_count"`
    LastAccess  time.Time `json:"last_access" db:"last_access"`
    CreatedAt   time.Time `json:"created_at" db:"created_at"`
    UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

type FolderCategory struct {
    Name     string   `json:"name"`
    Folders  []Folder `json:"folders"`
    Icon     string   `json:"icon"`
    Order    int      `json:"order"`
}

type FolderStats struct {
    TotalFolders    int     `json:"total_folders"`
    TotalAccess     int     `json:"total_access"`
    MostAccessed    Folder  `json:"most_accessed"`
    RecentFolders   []Folder `json:"recent_folders"`
    CategoryStats   map[string]int `json:"category_stats"`
}

// 文件夹验证
func (f *Folder) Validate() error {
    if f.Name == "" {
        return fmt.Errorf("文件夹名称不能为空")
    }
    if f.Path == "" {
        return fmt.Errorf("文件夹路径不能为空")
    }
    if f.Category == "" {
        f.Category = "未分类"
    }
    return nil
}

// 更新访问统计
func (f *Folder) UpdateAccess() {
    f.AccessCount++
    f.LastAccess = time.Now()
}

// 获取显示名称
func (f *Folder) GetDisplayName() string {
    if f.Name != "" {
        return f.Name
    }
    return filepath.Base(f.Path)
}

// 获取图标路径
func (f *Folder) GetIconPath() string {
    if f.Icon != "" {
        return f.Icon
    }
    return getDefaultIcon(f.Category)
}

// 获取默认图标
func getDefaultIcon(category string) string {
    iconMap := map[string]string{
        "工作": "work.png",
        "个人": "personal.png",
        "项目": "project.png",
        "文档": "document.png",
        "下载": "download.png",
        "未分类": "folder.png",
    }
    
    if icon, exists := iconMap[category]; exists {
        return icon
    }
    return "folder.png"
}
```

**数据库表结构：**

```sql
-- 文件夹表
CREATE TABLE folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    icon TEXT,
    category TEXT NOT NULL DEFAULT '未分类',
    order_index INTEGER DEFAULT 0,
    access_count INTEGER DEFAULT 0,
    last_access DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_folders_category ON folders(category);
CREATE INDEX idx_folders_access_count ON folders(access_count DESC);
CREATE INDEX idx_folders_last_access ON folders(last_access DESC);

-- 创建触发器自动更新 updated_at
CREATE TRIGGER update_folders_updated_at 
    AFTER UPDATE ON folders
    FOR EACH ROW
    BEGIN
        UPDATE folders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
```

#### 配置文件结构

**JSON 配置文件：**

```json
{
  "app": {
    "name": "智能文件夹管理器",
    "version": "1.0.0",
    "author": "Your Name",
    "description": "快速访问常用文件夹的桌面工具"
  },
  "folders": [
    {
      "name": "工作项目",
      "path": "/Users/username/Projects",
      "icon": "work.png",
      "category": "工作",
      "order": 1
    },
    {
      "name": "个人文档",
      "path": "/Users/username/Documents",
      "icon": "document.png",
      "category": "个人",
      "order": 2
    },
    {
      "name": "下载文件夹",
      "path": "/Users/username/Downloads",
      "icon": "download.png",
      "category": "下载",
      "order": 3
    }
  ],
  "categories": [
    {
      "name": "工作",
      "icon": "work.png",
      "order": 1
    },
    {
      "name": "个人",
      "icon": "personal.png",
      "order": 2
    },
    {
      "name": "项目",
      "icon": "project.png",
      "order": 3
    }
  ],
  "settings": {
    "auto_refresh": true,
    "refresh_interval": 30,
    "show_access_count": true,
    "sort_by": "access_count",
    "max_recent_folders": 10,
    "default_category": "未分类"
  }
}
```

#### 核心实现

**数据库操作层：**

```go
// database/folder_db.go
package database

import (
    "database/sql"
    "fmt"
    "time"
    _ "github.com/mattn/go-sqlite3"
)

type FolderDB struct {
    db *sql.DB
}

func NewFolderDB(dbPath string) (*FolderDB, error) {
    db, err := sql.Open("sqlite3", dbPath)
    if err != nil {
        return nil, fmt.Errorf("打开数据库失败: %w", err)
    }
    
    // 创建表
    if err := createTables(db); err != nil {
        return nil, fmt.Errorf("创建表失败: %w", err)
    }
    
    return &FolderDB{db: db}, nil
}

func createTables(db *sql.DB) error {
    createTableSQL := `
    CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        icon TEXT,
        category TEXT NOT NULL DEFAULT '未分类',
        order_index INTEGER DEFAULT 0,
        access_count INTEGER DEFAULT 0,
        last_access DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_folders_category ON folders(category);
    CREATE INDEX IF NOT EXISTS idx_folders_access_count ON folders(access_count DESC);
    CREATE INDEX IF NOT EXISTS idx_folders_last_access ON folders(last_access DESC);
    `
    
    _, err := db.Exec(createTableSQL)
    return err
}

// 获取所有文件夹
func (fdb *FolderDB) GetFolders() ([]Folder, error) {
    query := `
        SELECT id, name, path, icon, category, order_index, 
               access_count, last_access, created_at, updated_at
        FROM folders 
        ORDER BY category, order_index, name
    `
    
    rows, err := fdb.db.Query(query)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var folders []Folder
    for rows.Next() {
        var folder Folder
        err := rows.Scan(
            &folder.ID, &folder.Name, &folder.Path, &folder.Icon,
            &folder.Category, &folder.Order, &folder.AccessCount,
            &folder.LastAccess, &folder.CreatedAt, &folder.UpdatedAt,
        )
        if err != nil {
            return nil, err
        }
        folders = append(folders, folder)
    }
    
    return folders, nil
}

// 按分类获取文件夹
func (fdb *FolderDB) GetFoldersByCategory() (map[string][]Folder, error) {
    folders, err := fdb.GetFolders()
    if err != nil {
        return nil, err
    }
    
    categoryMap := make(map[string][]Folder)
    for _, folder := range folders {
        categoryMap[folder.Category] = append(categoryMap[folder.Category], folder)
    }
    
    return categoryMap, nil
}

// 添加文件夹
func (fdb *FolderDB) AddFolder(folder Folder) error {
    if err := folder.Validate(); err != nil {
        return err
    }
    
    query := `
        INSERT INTO folders (name, path, icon, category, order_index)
        VALUES (?, ?, ?, ?, ?)
    `
    
    _, err := fdb.db.Exec(query, 
        folder.Name, folder.Path, folder.Icon, 
        folder.Category, folder.Order)
    
    return err
}

// 更新文件夹
func (fdb *FolderDB) UpdateFolder(folder Folder) error {
    if err := folder.Validate(); err != nil {
        return err
    }
    
    query := `
        UPDATE folders 
        SET name = ?, path = ?, icon = ?, category = ?, order_index = ?
        WHERE id = ?
    `
    
    _, err := fdb.db.Exec(query,
        folder.Name, folder.Path, folder.Icon,
        folder.Category, folder.Order, folder.ID)
    
    return err
}

// 删除文件夹
func (fdb *FolderDB) DeleteFolder(id int) error {
    query := "DELETE FROM folders WHERE id = ?"
    _, err := fdb.db.Exec(query, id)
    return err
}

// 更新访问统计
func (fdb *FolderDB) UpdateAccessCount(id int) error {
    query := `
        UPDATE folders 
        SET access_count = access_count + 1, last_access = CURRENT_TIMESTAMP
        WHERE id = ?
    `
    _, err := fdb.db.Exec(query, id)
    return err
}

// 获取统计信息
func (fdb *FolderDB) GetStats() (*FolderStats, error) {
    stats := &FolderStats{}
    
    // 总文件夹数
    err := fdb.db.QueryRow("SELECT COUNT(*) FROM folders").Scan(&stats.TotalFolders)
    if err != nil {
        return nil, err
    }
    
    // 总访问次数
    err = fdb.db.QueryRow("SELECT SUM(access_count) FROM folders").Scan(&stats.TotalAccess)
    if err != nil {
        return nil, err
    }
    
    // 最常访问的文件夹
    query := `
        SELECT id, name, path, icon, category, order_index,
               access_count, last_access, created_at, updated_at
        FROM folders 
        ORDER BY access_count DESC 
        LIMIT 1
    `
    err = fdb.db.QueryRow(query).Scan(
        &stats.MostAccessed.ID, &stats.MostAccessed.Name,
        &stats.MostAccessed.Path, &stats.MostAccessed.Icon,
        &stats.MostAccessed.Category, &stats.MostAccessed.Order,
        &stats.MostAccessed.AccessCount, &stats.MostAccessed.LastAccess,
        &stats.MostAccessed.CreatedAt, &stats.MostAccessed.UpdatedAt,
    )
    if err != nil && err != sql.ErrNoRows {
        return nil, err
    }
    
    // 最近访问的文件夹
    recentQuery := `
        SELECT id, name, path, icon, category, order_index,
               access_count, last_access, created_at, updated_at
        FROM folders 
        WHERE last_access IS NOT NULL
        ORDER BY last_access DESC 
        LIMIT 10
    `
    rows, err := fdb.db.Query(recentQuery)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    for rows.Next() {
        var folder Folder
        err := rows.Scan(
            &folder.ID, &folder.Name, &folder.Path, &folder.Icon,
            &folder.Category, &folder.Order, &folder.AccessCount,
            &folder.LastAccess, &folder.CreatedAt, &folder.UpdatedAt,
        )
        if err != nil {
            return nil, err
        }
        stats.RecentFolders = append(stats.RecentFolders, folder)
    }
    
    // 分类统计
    categoryQuery := `
        SELECT category, COUNT(*) as count
        FROM folders 
        GROUP BY category
    `
    rows, err = fdb.db.Query(categoryQuery)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    stats.CategoryStats = make(map[string]int)
    for rows.Next() {
        var category string
        var count int
        err := rows.Scan(&category, &count)
        if err != nil {
            return nil, err
        }
        stats.CategoryStats[category] = count
    }
    
    return stats, nil
}

// 搜索文件夹
func (fdb *FolderDB) SearchFolders(keyword string) ([]Folder, error) {
    query := `
        SELECT id, name, path, icon, category, order_index,
               access_count, last_access, created_at, updated_at
        FROM folders 
        WHERE name LIKE ? OR path LIKE ? OR category LIKE ?
        ORDER BY access_count DESC, name
    `
    
    searchPattern := "%" + keyword + "%"
    rows, err := fdb.db.Query(query, searchPattern, searchPattern, searchPattern)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var folders []Folder
    for rows.Next() {
        var folder Folder
        err := rows.Scan(
            &folder.ID, &folder.Name, &folder.Path, &folder.Icon,
            &folder.Category, &folder.Order, &folder.AccessCount,
            &folder.LastAccess, &folder.CreatedAt, &folder.UpdatedAt,
        )
        if err != nil {
            return nil, err
        }
        folders = append(folders, folder)
    }
    
    return folders, nil
}
```

**菜单构建层：**

```go
// menu/folder_menu.go
package menu

import (
    "fmt"
    "log"
    "os/exec"
    "runtime"
    "sort"
    "time"
    
    "github.com/getlantern/systray"
)

type FolderMenu struct {
    db        *database.FolderDB
    menuItems map[int]*systray.MenuItem
    categories map[string]*systray.MenuItem
    app       *App
}

func NewFolderMenu(db *database.FolderDB, app *App) *FolderMenu {
    return &FolderMenu{
        db:        db,
        menuItems: make(map[int]*systray.MenuItem),
        categories: make(map[string]*systray.MenuItem),
        app:       app,
    }
}

func (fm *FolderMenu) BuildMenu() {
    // 清空现有菜单
    systray.ResetMenu()
    
    // 获取文件夹数据
    folders, err := fm.db.GetFolders()
    if err != nil {
        log.Printf("获取文件夹列表失败: %v", err)
        fm.addErrorMenu()
        return
    }
    
    if len(folders) == 0 {
        fm.addEmptyMenu()
        return
    }
    
    // 按分类分组
    categoryMap := fm.groupByCategory(folders)
    
    // 创建分类菜单
    fm.createCategoryMenus(categoryMap)
    
    // 添加管理菜单
    fm.addManagementMenu()
}

func (fm *FolderMenu) groupByCategory(folders []Folder) map[string][]Folder {
    categoryMap := make(map[string][]Folder)
    
    for _, folder := range folders {
        categoryMap[folder.Category] = append(categoryMap[folder.Category], folder)
    }
    
    // 按访问次数排序每个分类内的文件夹
    for category, categoryFolders := range categoryMap {
        sort.Slice(categoryFolders, func(i, j int) bool {
            return categoryFolders[i].AccessCount > categoryFolders[j].AccessCount
        })
        categoryMap[category] = categoryFolders
    }
    
    return categoryMap
}

func (fm *FolderMenu) createCategoryMenus(categoryMap map[string][]Folder) {
    // 获取分类顺序
    categories := fm.getCategoryOrder(categoryMap)
    
    for i, category := range categories {
        folders := categoryMap[category]
        
        // 添加分类标题
        categoryItem := systray.AddMenuItem(
            fmt.Sprintf("📁 %s (%d)", category, len(folders)),
            fmt.Sprintf("分类: %s", category),
        )
        fm.categories[category] = categoryItem
        
        // 添加该分类下的文件夹
        for _, folder := range folders {
            displayName := folder.GetDisplayName()
            if folder.AccessCount > 0 {
                displayName = fmt.Sprintf("%s (%d)", displayName, folder.AccessCount)
            }
            
            item := systray.AddMenuItem(displayName, folder.Path)
            fm.menuItems[folder.ID] = item
            
            // 设置图标
            if iconPath := folder.GetIconPath(); iconPath != "" {
                if iconData, err := fm.loadIcon(iconPath); err == nil {
                    item.SetIcon(iconData)
                }
            }
            
            // 处理点击事件
            go func(f Folder) {
                for {
                    <-item.ClickedCh
                    fm.openFolder(f)
                }
            }(folder)
        }
        
        // 添加分隔符（除了最后一个分类）
        if i < len(categories)-1 {
            systray.AddSeparator()
        }
    }
}

func (fm *FolderMenu) getCategoryOrder(categoryMap map[string][]Folder) []string {
    // 预定义分类顺序
    predefinedOrder := []string{"工作", "项目", "个人", "文档", "下载", "未分类"}
    
    var categories []string
    
    // 添加预定义分类
    for _, category := range predefinedOrder {
        if _, exists := categoryMap[category]; exists {
            categories = append(categories, category)
        }
    }
    
    // 添加其他分类
    for category := range categoryMap {
        found := false
        for _, predefined := range predefinedOrder {
            if category == predefined {
                found = true
                break
            }
        }
        if !found {
            categories = append(categories, category)
        }
    }
    
    return categories
}

func (fm *FolderMenu) addManagementMenu() {
    systray.AddSeparator()
    
    // 刷新菜单
    refreshItem := systray.AddMenuItem("🔄 刷新", "重新加载文件夹列表")
    go func() {
        for {
            <-refreshItem.ClickedCh
            fm.refreshMenu()
        }
    }()
    
    // 添加文件夹
    addItem := systray.AddMenuItem("➕ 添加文件夹", "添加新的文件夹")
    go func() {
        for {
            <-addItem.ClickedCh
            fm.showAddFolderDialog()
        }
    }()
    
    // 管理文件夹
    manageItem := systray.AddMenuItem("⚙️ 管理文件夹", "打开文件夹管理界面")
    go func() {
        for {
            <-manageItem.ClickedCh
            fm.openFolderManager()
        }
    }()
    
    // 设置
    settingsItem := systray.AddMenuItem("🔧 设置", "打开设置")
    go func() {
        for {
            <-settingsItem.ClickedCh
            fm.openSettings()
        }
    }()
}

func (fm *FolderMenu) addErrorMenu() {
    errorItem := systray.AddMenuItem("❌ 加载失败", "无法加载文件夹列表")
    errorItem.Disable()
}

func (fm *FolderMenu) addEmptyMenu() {
    emptyItem := systray.AddMenuItem("📂 暂无文件夹", "点击添加文件夹")
    go func() {
        for {
            <-emptyItem.ClickedCh
            fm.showAddFolderDialog()
        }
    }()
}

func (fm *FolderMenu) openFolder(folder Folder) {
    // 更新访问统计
    if err := fm.db.UpdateAccessCount(folder.ID); err != nil {
        log.Printf("更新访问统计失败: %v", err)
    }
    
    // 打开文件夹
    if err := fm.openFolderInExplorer(folder.Path); err != nil {
        log.Printf("打开文件夹失败: %v", err)
        fm.showErrorNotification("打开文件夹失败", folder.Path)
    } else {
        fm.showSuccessNotification("文件夹已打开", folder.Name)
    }
}

func (fm *FolderMenu) openFolderInExplorer(path string) error {
    var cmd *exec.Cmd
    
    switch runtime.GOOS {
    case "windows":
        cmd = exec.Command("explorer", path)
    case "darwin":
        cmd = exec.Command("open", path)
    case "linux":
        cmd = exec.Command("xdg-open", path)
    default:
        return fmt.Errorf("不支持的操作系统: %s", runtime.GOOS)
    }
    
    return cmd.Start()
}

func (fm *FolderMenu) refreshMenu() {
    log.Println("刷新文件夹菜单")
    fm.BuildMenu()
    
    // 通知前端刷新
    if fm.app != nil {
        fm.app.bridge.EmitToFrontend("folder-menu-refreshed", nil)
    }
}

func (fm *FolderMenu) showAddFolderDialog() {
    // 通知前端显示添加文件夹对话框
    if fm.app != nil {
        fm.app.bridge.EmitToFrontend("show-add-folder-dialog", nil)
    }
}

func (fm *FolderMenu) openFolderManager() {
    // 通知前端打开文件夹管理界面
    if fm.app != nil {
        fm.app.bridge.EmitToFrontend("open-folder-manager", nil)
    }
}

func (fm *FolderMenu) openSettings() {
    // 通知前端打开设置界面
    if fm.app != nil {
        fm.app.bridge.EmitToFrontend("open-settings", nil)
    }
}

func (fm *FolderMenu) loadIcon(iconPath string) ([]byte, error) {
    // 从资源文件或文件系统加载图标
    // 这里可以实现图标缓存机制
    return os.ReadFile(iconPath)
}

func (fm *FolderMenu) showErrorNotification(title, message string) {
    if fm.app != nil {
        fm.app.notificationMgr.ShowError(title, message)
    }
}

func (fm *FolderMenu) showSuccessNotification(title, message string) {
    if fm.app != nil {
        fm.app.notificationMgr.ShowSuccess(title, message)
    }
}
```

**前端界面实现：**

```vue
<!-- components/FolderManager.vue -->
<template>
  <div class="folder-manager">
    <div class="toolbar">
      <div class="search-box">
        <input 
          v-model="searchQuery"
          placeholder="搜索文件夹..."
          @input="handleSearch"
          class="search-input"
        />
        <button @click="clearSearch" class="clear-btn">清除</button>
      </div>
      
      <div class="toolbar-actions">
        <button @click="showAddDialog" class="btn btn-primary">
          <i class="icon-plus"></i> 添加文件夹
        </button>
        <button @click="refreshFolders" class="btn btn-secondary">
          <i class="icon-refresh"></i> 刷新
        </button>
        <button @click="showSettings" class="btn btn-secondary">
          <i class="icon-settings"></i> 设置
        </button>
      </div>
    </div>
    
    <div class="folder-content">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>
      
      <div v-else-if="filteredFolders.length === 0" class="empty-state">
        <div class="empty-icon">📂</div>
        <h3>暂无文件夹</h3>
        <p>点击"添加文件夹"开始使用</p>
        <button @click="showAddDialog" class="btn btn-primary">
          添加文件夹
        </button>
      </div>
      
      <div v-else class="folder-list">
        <div 
          v-for="category in groupedFolders"
          :key="category.name"
          class="category-section"
        >
          <h3 class="category-title">
            <i :class="getCategoryIcon(category.name)"></i>
            {{ category.name }} ({{ category.folders.length }})
          </h3>
          
          <div class="folder-grid">
            <FolderCard
              v-for="folder in category.folders"
              :key="folder.id"
              :folder="folder"
              @open="openFolder"
              @edit="editFolder"
              @delete="deleteFolder"
            />
          </div>
        </div>
      </div>
    </div>
    
    <!-- 添加/编辑文件夹对话框 -->
    <FolderDialog
      v-if="showDialog"
      :folder="editingFolder"
      :categories="categories"
      @save="handleSaveFolder"
      @cancel="closeDialog"
    />
    
    <!-- 设置对话框 -->
    <SettingsDialog
      v-if="showSettingsDialog"
      :settings="settings"
      @save="handleSaveSettings"
      @cancel="closeSettingsDialog"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '../stores/app'
import FolderCard from './FolderCard.vue'
import FolderDialog from './FolderDialog.vue'
import SettingsDialog from './SettingsDialog.vue'

// 响应式数据
const searchQuery = ref('')
const loading = ref(false)
const showDialog = ref(false)
const showSettingsDialog = ref(false)
const editingFolder = ref(null)
const folders = ref([])
const categories = ref([])
const settings = ref({})

// 计算属性
const filteredFolders = computed(() => {
  if (!searchQuery.value) {
    return folders.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return folders.value.filter(folder => 
    folder.name.toLowerCase().includes(query) ||
    folder.path.toLowerCase().includes(query) ||
    folder.category.toLowerCase().includes(query)
  )
})

const groupedFolders = computed(() => {
  const groups = {}
  
  filteredFolders.value.forEach(folder => {
    if (!groups[folder.category]) {
      groups[folder.category] = {
        name: folder.category,
        folders: []
      }
    }
    groups[folder.category].folders.push(folder)
  })
  
  // 按访问次数排序
  Object.values(groups).forEach(group => {
    group.folders.sort((a, b) => b.access_count - a.access_count)
  })
  
  return Object.values(groups)
})

// 生命周期
onMounted(() => {
  loadFolders()
  loadCategories()
  loadSettings()
})

// 方法
async function loadFolders() {
  loading.value = true
  try {
    folders.value = await GoBridge.GetFolders()
  } catch (error) {
    console.error('加载文件夹失败:', error)
    showError('加载文件夹失败')
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    categories.value = await GoBridge.GetCategories()
  } catch (error) {
    console.error('加载分类失败:', error)
  }
}

async function loadSettings() {
  try {
    settings.value = await GoBridge.GetSettings()
  } catch (error) {
    console.error('加载设置失败:', error)
  }
}

function handleSearch() {
  // 搜索逻辑已在计算属性中处理
}

function clearSearch() {
  searchQuery.value = ''
}

function showAddDialog() {
  editingFolder.value = null
  showDialog.value = true
}

function editFolder(folder) {
  editingFolder.value = folder
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
  editingFolder.value = null
}

async function handleSaveFolder(folderData) {
  try {
    if (editingFolder.value) {
      await GoBridge.UpdateFolder(folderData)
    } else {
      await GoBridge.AddFolder(folderData)
    }
    
    await loadFolders()
    closeDialog()
    showSuccess('文件夹保存成功')
  } catch (error) {
    console.error('保存文件夹失败:', error)
    showError('保存文件夹失败')
  }
}

async function deleteFolder(folder) {
  if (!confirm(`确定要删除文件夹 "${folder.name}" 吗？`)) {
    return
  }
  
  try {
    await GoBridge.DeleteFolder(folder.id)
    await loadFolders()
    showSuccess('文件夹删除成功')
  } catch (error) {
    console.error('删除文件夹失败:', error)
    showError('删除文件夹失败')
  }
}

function openFolder(folder) {
  // 通过后端打开文件夹
  GoBridge.OpenFolder(folder.path)
}

async function refreshFolders() {
  await loadFolders()
  showSuccess('文件夹列表已刷新')
}

function showSettings() {
  showSettingsDialog.value = true
}

function closeSettingsDialog() {
  showSettingsDialog.value = false
}

async function handleSaveSettings(newSettings) {
  try {
    await GoBridge.UpdateSettings(newSettings)
    settings.value = newSettings
    closeSettingsDialog()
    showSuccess('设置保存成功')
  } catch (error) {
    console.error('保存设置失败:', error)
    showError('保存设置失败')
  }
}

function getCategoryIcon(category) {
  const iconMap = {
    '工作': 'icon-briefcase',
    '项目': 'icon-folder',
    '个人': 'icon-user',
    '文档': 'icon-document',
    '下载': 'icon-download',
    '未分类': 'icon-folder'
  }
  return iconMap[category] || 'icon-folder'
}

function showSuccess(message) {
  // 显示成功消息
  console.log('Success:', message)
}

function showError(message) {
  // 显示错误消息
  console.error('Error:', message)
}
</script>

<style scoped>
.folder-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.search-input {
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  width: 300px;
}

.toolbar-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.folder-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.category-section {
  margin-bottom: 2rem;
}

.category-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  color: #495057;
}

.folder-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}
</style>
```

**文件夹卡片组件：**

```vue
<!-- components/FolderCard.vue -->
<template>
  <div class="folder-card" @click="handleOpen">
    <div class="folder-header">
      <div class="folder-icon">
        <i :class="getFolderIcon()"></i>
      </div>
      <div class="folder-actions">
        <button @click.stop="handleEdit" class="action-btn" title="编辑">
          <i class="icon-edit"></i>
        </button>
        <button @click.stop="handleDelete" class="action-btn danger" title="删除">
          <i class="icon-delete"></i>
        </button>
      </div>
    </div>
    
    <div class="folder-content">
      <h4 class="folder-name">{{ folder.name }}</h4>
      <p class="folder-path">{{ folder.path }}</p>
      <div class="folder-meta">
        <span class="folder-category">{{ folder.category }}</span>
        <span v-if="folder.access_count > 0" class="access-count">
          访问 {{ folder.access_count }} 次
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  folder: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['open', 'edit', 'delete'])

function handleOpen() {
  emit('open', props.folder)
}

function handleEdit() {
  emit('edit', props.folder)
}

function handleDelete() {
  emit('delete', props.folder)
}

function getFolderIcon() {
  const iconMap = {
    '工作': 'icon-briefcase',
    '项目': 'icon-folder',
    '个人': 'icon-user',
    '文档': 'icon-document',
    '下载': 'icon-download',
    '未分类': 'icon-folder'
  }
  return iconMap[props.folder.category] || 'icon-folder'
}
</script>

<style scoped>
.folder-card {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.folder-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.folder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.folder-icon {
  font-size: 2rem;
  color: #007bff;
}

.folder-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.folder-card:hover .folder-actions {
  opacity: 1;
}

.action-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: #f8f9fa;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.action-btn:hover {
  background: #e9ecef;
}

.action-btn.danger:hover {
  background: #dc3545;
  color: white;
}

.folder-content {
  text-align: left;
}

.folder-name {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #212529;
}

.folder-path {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: #6c757d;
  word-break: break-all;
}

.folder-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.folder-category {
  background: #e9ecef;
  color: #495057;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
}

.access-count {
  color: #6c757d;
}
</style>
```

#### 高级特性

**文件夹监控（fsnotify）：**

```go
// watcher/folder_watcher.go
package watcher

import (
    "github.com/fsnotify/fsnotify"
    "log"
    "path/filepath"
    "time"
)

type FolderWatcher struct {
    watcher   *fsnotify.Watcher
    folders   map[string]bool
    callbacks map[string]func(string)
    quitChan  chan struct{}
}

func NewFolderWatcher() (*FolderWatcher, error) {
    watcher, err := fsnotify.NewWatcher()
    if err != nil {
        return nil, err
    }
    
    return &FolderWatcher{
        watcher:   watcher,
        folders:   make(map[string]bool),
        callbacks: make(map[string]func(string)),
        quitChan:  make(chan struct{}),
    }, nil
}

func (fw *FolderWatcher) WatchFolder(path string, callback func(string)) error {
    if fw.folders[path] {
        return nil // 已经在监控
    }
    
    err := fw.watcher.Add(path)
    if err != nil {
        return err
    }
    
    fw.folders[path] = true
    fw.callbacks[path] = callback
    
    return nil
}

func (fw *FolderWatcher) UnwatchFolder(path string) error {
    if !fw.folders[path] {
        return nil // 没有在监控
    }
    
    err := fw.watcher.Remove(path)
    if err != nil {
        return err
    }
    
    delete(fw.folders, path)
    delete(fw.callbacks, path)
    
    return nil
}

func (fw *FolderWatcher) Start() {
    go fw.eventLoop()
}

func (fw *FolderWatcher) eventLoop() {
    defer fw.watcher.Close()
    
    for {
        select {
        case event := <-fw.watcher.Events:
            fw.handleEvent(event)
        case err := <-fw.watcher.Errors:
            log.Printf("文件夹监控错误: %v", err)
        case <-fw.quitChan:
            return
        }
    }
}

func (fw *FolderWatcher) handleEvent(event fsnotify.Event) {
    // 防抖动处理
    time.Sleep(100 * time.Millisecond)
    
    if callback, exists := fw.callbacks[event.Name]; exists {
        callback(event.Name)
    }
}

func (fw *FolderWatcher) Stop() {
    close(fw.quitChan)
}
```

**最近访问记录：**

```go
// models/recent_access.go
package models

import (
    "time"
    "sort"
)

type RecentAccess struct {
    FolderID    int       `json:"folder_id"`
    FolderName  string    `json:"folder_name"`
    FolderPath  string    `json:"folder_path"`
    AccessTime  time.Time `json:"access_time"`
    AccessCount int       `json:"access_count"`
}

type RecentAccessManager struct {
    db *database.FolderDB
}

func NewRecentAccessManager(db *database.FolderDB) *RecentAccessManager {
    return &RecentAccessManager{db: db}
}

func (ram *RecentAccessManager) GetRecentAccess(limit int) ([]RecentAccess, error) {
    query := `
        SELECT id, name, path, last_access, access_count
        FROM folders 
        WHERE last_access IS NOT NULL
        ORDER BY last_access DESC 
        LIMIT ?
    `
    
    rows, err := ram.db.Query(query, limit)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var recent []RecentAccess
    for rows.Next() {
        var ra RecentAccess
        err := rows.Scan(&ra.FolderID, &ra.FolderName, &ra.FolderPath, 
                        &ra.AccessTime, &ra.AccessCount)
        if err != nil {
            return nil, err
        }
        recent = append(recent, ra)
    }
    
    return recent, nil
}

func (ram *RecentAccessManager) GetMostAccessed(limit int) ([]RecentAccess, error) {
    query := `
        SELECT id, name, path, last_access, access_count
        FROM folders 
        WHERE access_count > 0
        ORDER BY access_count DESC 
        LIMIT ?
    `
    
    rows, err := ram.db.Query(query, limit)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var mostAccessed []RecentAccess
    for rows.Next() {
        var ra RecentAccess
        err := rows.Scan(&ra.FolderID, &ra.FolderName, &ra.FolderPath, 
                        &ra.AccessTime, &ra.AccessCount)
        if err != nil {
            return nil, err
        }
        mostAccessed = append(mostAccessed, ra)
    }
    
    return mostAccessed, nil
}
```

**智能排序算法：**

```go
// utils/smart_sort.go
package utils

import (
    "sort"
    "time"
    "math"
)

type SmartSort struct {
    folders []Folder
}

func NewSmartSort(folders []Folder) *SmartSort {
    return &SmartSort{folders: folders}
}

// 智能排序：综合考虑访问次数、最近访问时间、创建时间
func (ss *SmartSort) Sort() []Folder {
    sorted := make([]Folder, len(ss.folders))
    copy(sorted, ss.folders)
    
    sort.Slice(sorted, func(i, j int) bool {
        scoreI := ss.calculateScore(sorted[i])
        scoreJ := ss.calculateScore(sorted[j])
        return scoreI > scoreJ
    })
    
    return sorted
}

func (ss *SmartSort) calculateScore(folder Folder) float64 {
    // 访问次数权重 (0-100)
    accessScore := math.Min(float64(folder.AccessCount) * 10, 100)
    
    // 最近访问时间权重 (0-50)
    recencyScore := ss.calculateRecencyScore(folder.LastAccess)
    
    // 创建时间权重 (0-20) - 新创建的文件夹稍微优先
    creationScore := ss.calculateCreationScore(folder.CreatedAt)
    
    // 综合得分
    return accessScore + recencyScore + creationScore
}

func (ss *SmartSort) calculateRecencyScore(lastAccess time.Time) float64 {
    if lastAccess.IsZero() {
        return 0
    }
    
    daysSinceAccess := time.Since(lastAccess).Hours() / 24
    
    // 最近7天内访问的文件夹得分最高
    if daysSinceAccess <= 7 {
        return 50 - (daysSinceAccess / 7) * 20
    }
    
    // 超过7天的逐渐降低得分
    if daysSinceAccess <= 30 {
        return 30 - (daysSinceAccess - 7) / 23 * 20
    }
    
    // 超过30天的得分很低
    return math.Max(0, 10 - (daysSinceAccess - 30) / 30 * 10)
}

func (ss *SmartSort) calculateCreationScore(createdAt time.Time) float64 {
    if createdAt.IsZero() {
        return 0
    }
    
    daysSinceCreation := time.Since(createdAt).Hours() / 24
    
    // 最近7天内创建的文件夹稍微优先
    if daysSinceCreation <= 7 {
        return 20 - (daysSinceCreation / 7) * 10
    }
    
    return 10
}
```

通过以上实现，我们构建了一个功能完整的文件夹快速访问系统。该系统具有以下特点：

1. **完整的数据管理**：支持 CRUD 操作，数据持久化存储
2. **智能菜单构建**：按分类组织，支持动态更新
3. **跨平台文件操作**：自动适配不同操作系统的文件管理器
4. **用户友好的界面**：Vue 3 组件化设计，响应式布局
5. **高级功能**：文件夹监控、访问统计、智能排序
6. **性能优化**：数据库索引、缓存机制、异步处理

在下一节中，我们将实现第二个实战项目：网址书签管理系统。

### 项目二：网址书签管理

#### 功能设计

网址书签管理系统是一个智能的浏览器书签管理工具，允许用户通过系统托盘快速访问常用网站。该系统具有以下核心功能：

**主要特性：**

1. **智能书签管理**：支持添加、删除、编辑、分类书签
2. **自动 Favicon 获取**：自动下载和显示网站图标
3. **分类组织**：按工作、学习、娱乐等分类管理
4. **快速访问**：点击托盘菜单直接打开网址
5. **搜索功能**：支持书签名称、URL、标签搜索
6. **导入导出**：支持从浏览器导入书签，导出为各种格式
7. **访问统计**：记录访问次数和最近访问时间
8. **智能推荐**：基于访问习惯推荐相关书签

**技术架构：**

```
┌─────────────────────────────────────┐
│         Frontend (Vue 3)            │
│  ┌─────────────┐  ┌─────────────┐   │
│  │ Bookmark UI │  │ Search UI   │   │
│  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────┘
                    │
┌─────────────────────────────────────┐
│         Backend (Go)                 │
│  ┌─────────────┐  ┌─────────────┐   │
│  │ Bookmark API│  │ Favicon API  │   │
│  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────┘
                    │
┌─────────────────────────────────────┐
│         System Tray                 │
│  ┌─────────────┐  ┌─────────────┐   │
│  │ Menu Items  │  │ URL Ops      │   │
│  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────┘
```

#### 数据模型设计

**核心数据结构：**

```go
// models/bookmark.go
package models

import (
    "time"
    "strings"
    "net/url"
)

type Bookmark struct {
    ID          int       `json:"id" db:"id"`
    Name        string    `json:"name" db:"name"`
    URL         string    `json:"url" db:"url"`
    Category    string    `json:"category" db:"category"`
    Tags        []string  `json:"tags" db:"tags"`
    Icon        string    `json:"icon" db:"icon"`
    Favicon     []byte    `json:"favicon" db:"favicon"`
    Description string    `json:"description" db:"description"`
    VisitCount  int       `json:"visit_count" db:"visit_count"`
    LastVisit   time.Time `json:"last_visit" db:"last_visit"`
    CreatedAt   time.Time `json:"created_at" db:"created_at"`
    UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

type BookmarkCategory struct {
    Name      string     `json:"name"`
    Bookmarks []Bookmark `json:"bookmarks"`
    Icon      string     `json:"icon"`
    Order     int        `json:"order"`
}

type BookmarkStats struct {
    TotalBookmarks    int                `json:"total_bookmarks"`
    TotalVisits       int                `json:"total_visits"`
    MostVisited       Bookmark           `json:"most_visited"`
    RecentBookmarks   []Bookmark         `json:"recent_bookmarks"`
    CategoryStats     map[string]int      `json:"category_stats"`
    TagStats          map[string]int     `json:"tag_stats"`
    DomainStats       map[string]int     `json:"domain_stats"`
}

// 书签验证
func (b *Bookmark) Validate() error {
    if b.Name == "" {
        return fmt.Errorf("书签名称不能为空")
    }
    if b.URL == "" {
        return fmt.Errorf("书签URL不能为空")
    }
    
    // 验证URL格式
    if _, err := url.Parse(b.URL); err != nil {
        return fmt.Errorf("无效的URL格式: %v", err)
    }
    
    if b.Category == "" {
        b.Category = "未分类"
    }
    
    return nil
}

// 更新访问统计
func (b *Bookmark) UpdateVisit() {
    b.VisitCount++
    b.LastVisit = time.Now()
}

// 获取显示名称
func (b *Bookmark) GetDisplayName() string {
    if b.Name != "" {
        return b.Name
    }
    return b.URL
}

// 获取域名
func (b *Bookmark) GetDomain() string {
    u, err := url.Parse(b.URL)
    if err != nil {
        return ""
    }
    return u.Host
}

// 获取标签字符串
func (b *Bookmark) GetTagsString() string {
    return strings.Join(b.Tags, ",")
}

// 设置标签
func (b *Bookmark) SetTags(tagsString string) {
    if tagsString == "" {
        b.Tags = []string{}
        return
    }
    b.Tags = strings.Split(tagsString, ",")
    // 清理标签
    for i, tag := range b.Tags {
        b.Tags[i] = strings.TrimSpace(tag)
    }
}

// 检查是否包含标签
func (b *Bookmark) HasTag(tag string) bool {
    for _, t := range b.Tags {
        if strings.EqualFold(t, tag) {
            return true
        }
    }
    return false
}

// 获取默认图标
func (b *Bookmark) GetDefaultIcon() string {
    domain := b.GetDomain()
    iconMap := map[string]string{
        "github.com": "github.png",
        "stackoverflow.com": "stackoverflow.png",
        "google.com": "google.png",
        "youtube.com": "youtube.png",
        "twitter.com": "twitter.png",
        "facebook.com": "facebook.png",
    }
    
    for d, icon := range iconMap {
        if strings.Contains(domain, d) {
            return icon
        }
    }
    
    return "bookmark.png"
}
```

**数据库表结构：**

```sql
-- 书签表
CREATE TABLE bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT '未分类',
    tags TEXT,
    icon TEXT,
    favicon BLOB,
    description TEXT,
    visit_count INTEGER DEFAULT 0,
    last_visit DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_bookmarks_category ON bookmarks(category);
CREATE INDEX idx_bookmarks_visit_count ON bookmarks(visit_count DESC);
CREATE INDEX idx_bookmarks_last_visit ON bookmarks(last_visit DESC);
CREATE INDEX idx_bookmarks_tags ON bookmarks(tags);

-- 创建触发器自动更新 updated_at
CREATE TRIGGER update_bookmarks_updated_at 
    AFTER UPDATE ON bookmarks
    FOR EACH ROW
    BEGIN
        UPDATE bookmarks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
```

#### 核心实现

**数据库操作层：**

```go
// database/bookmark_db.go
package database

import (
    "database/sql"
    "fmt"
    "strings"
    "time"
    _ "github.com/mattn/go-sqlite3"
)

type BookmarkDB struct {
    db *sql.DB
}

func NewBookmarkDB(dbPath string) (*BookmarkDB, error) {
    db, err := sql.Open("sqlite3", dbPath)
    if err != nil {
        return nil, fmt.Errorf("打开数据库失败: %w", err)
    }
    
    if err := createBookmarkTables(db); err != nil {
        return nil, fmt.Errorf("创建表失败: %w", err)
    }
    
    return &BookmarkDB{db: db}, nil
}

func createBookmarkTables(db *sql.DB) error {
    createTableSQL := `
    CREATE TABLE IF NOT EXISTS bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL DEFAULT '未分类',
        tags TEXT,
        icon TEXT,
        favicon BLOB,
        description TEXT,
        visit_count INTEGER DEFAULT 0,
        last_visit DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_visit_count ON bookmarks(visit_count DESC);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_last_visit ON bookmarks(last_visit DESC);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_tags ON bookmarks(tags);
    `
    
    _, err := db.Exec(createTableSQL)
    return err
}

// 获取所有书签
func (bdb *BookmarkDB) GetBookmarks() ([]Bookmark, error) {
    query := `
        SELECT id, name, url, category, tags, icon, favicon, description,
               visit_count, last_visit, created_at, updated_at
        FROM bookmarks 
        ORDER BY category, visit_count DESC, name
    `
    
    rows, err := bdb.db.Query(query)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var bookmarks []Bookmark
    for rows.Next() {
        var bookmark Bookmark
        var tagsString sql.NullString
        var faviconData sql.NullString
        
        err := rows.Scan(
            &bookmark.ID, &bookmark.Name, &bookmark.URL, &bookmark.Category,
            &tagsString, &bookmark.Icon, &faviconData, &bookmark.Description,
            &bookmark.VisitCount, &bookmark.LastVisit, &bookmark.CreatedAt, &bookmark.UpdatedAt,
        )
        if err != nil {
            return nil, err
        }
        
        // 处理标签
        if tagsString.Valid {
            bookmark.SetTags(tagsString.String)
        }
        
        // 处理 Favicon
        if faviconData.Valid {
            bookmark.Favicon = []byte(faviconData.String)
        }
        
        bookmarks = append(bookmarks, bookmark)
    }
    
    return bookmarks, nil
}

// 按分类获取书签
func (bdb *BookmarkDB) GetBookmarksByCategory() (map[string][]Bookmark, error) {
    bookmarks, err := bdb.GetBookmarks()
    if err != nil {
        return nil, err
    }
    
    categoryMap := make(map[string][]Bookmark)
    for _, bookmark := range bookmarks {
        categoryMap[bookmark.Category] = append(categoryMap[bookmark.Category], bookmark)
    }
    
    return categoryMap, nil
}

// 添加书签
func (bdb *BookmarkDB) AddBookmark(bookmark Bookmark) error {
    if err := bookmark.Validate(); err != nil {
        return err
    }
    
    query := `
        INSERT INTO bookmarks (name, url, category, tags, icon, description)
        VALUES (?, ?, ?, ?, ?, ?)
    `
    
    _, err := bdb.db.Exec(query,
        bookmark.Name, bookmark.URL, bookmark.Category,
        bookmark.GetTagsString(), bookmark.Icon, bookmark.Description)
    
    return err
}

// 更新书签
func (bdb *BookmarkDB) UpdateBookmark(bookmark Bookmark) error {
    if err := bookmark.Validate(); err != nil {
        return err
    }
    
    query := `
        UPDATE bookmarks 
        SET name = ?, url = ?, category = ?, tags = ?, icon = ?, description = ?
        WHERE id = ?
    `
    
    _, err := bdb.db.Exec(query,
        bookmark.Name, bookmark.URL, bookmark.Category,
        bookmark.GetTagsString(), bookmark.Icon, bookmark.Description, bookmark.ID)
    
    return err
}

// 删除书签
func (bdb *BookmarkDB) DeleteBookmark(id int) error {
    query := "DELETE FROM bookmarks WHERE id = ?"
    _, err := bdb.db.Exec(query, id)
    return err
}

// 更新访问统计
func (bdb *BookmarkDB) UpdateVisitCount(id int) error {
    query := `
        UPDATE bookmarks 
        SET visit_count = visit_count + 1, last_visit = CURRENT_TIMESTAMP
        WHERE id = ?
    `
    _, err := bdb.db.Exec(query, id)
    return err
}

// 搜索书签
func (bdb *BookmarkDB) SearchBookmarks(keyword string) ([]Bookmark, error) {
    query := `
        SELECT id, name, url, category, tags, icon, favicon, description,
               visit_count, last_visit, created_at, updated_at
        FROM bookmarks 
        WHERE name LIKE ? OR url LIKE ? OR category LIKE ? OR tags LIKE ? OR description LIKE ?
        ORDER BY visit_count DESC, name
    `
    
    searchPattern := "%" + keyword + "%"
    rows, err := bdb.db.Query(query, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var bookmarks []Bookmark
    for rows.Next() {
        var bookmark Bookmark
        var tagsString sql.NullString
        var faviconData sql.NullString
        
        err := rows.Scan(
            &bookmark.ID, &bookmark.Name, &bookmark.URL, &bookmark.Category,
            &tagsString, &bookmark.Icon, &faviconData, &bookmark.Description,
            &bookmark.VisitCount, &bookmark.LastVisit, &bookmark.CreatedAt, &bookmark.UpdatedAt,
        )
        if err != nil {
            return nil, err
        }
        
        if tagsString.Valid {
            bookmark.SetTags(tagsString.String)
        }
        
        if faviconData.Valid {
            bookmark.Favicon = []byte(faviconData.String)
        }
        
        bookmarks = append(bookmarks, bookmark)
    }
    
    return bookmarks, nil
}

// 获取统计信息
func (bdb *BookmarkDB) GetStats() (*BookmarkStats, error) {
    stats := &BookmarkStats{}
    
    // 总书签数
    err := bdb.db.QueryRow("SELECT COUNT(*) FROM bookmarks").Scan(&stats.TotalBookmarks)
    if err != nil {
        return nil, err
    }
    
    // 总访问次数
    err = bdb.db.QueryRow("SELECT SUM(visit_count) FROM bookmarks").Scan(&stats.TotalVisits)
    if err != nil {
        return nil, err
    }
    
    // 最常访问的书签
    query := `
        SELECT id, name, url, category, tags, icon, favicon, description,
               visit_count, last_visit, created_at, updated_at
        FROM bookmarks 
        ORDER BY visit_count DESC 
        LIMIT 1
    `
    err = bdb.db.QueryRow(query).Scan(
        &stats.MostVisited.ID, &stats.MostVisited.Name, &stats.MostVisited.URL,
        &stats.MostVisited.Category, &stats.MostVisited.Icon, &stats.MostVisited.Description,
        &stats.MostVisited.VisitCount, &stats.MostVisited.LastVisit,
        &stats.MostVisited.CreatedAt, &stats.MostVisited.UpdatedAt,
    )
    if err != nil && err != sql.ErrNoRows {
        return nil, err
    }
    
    // 最近访问的书签
    recentQuery := `
        SELECT id, name, url, category, tags, icon, favicon, description,
               visit_count, last_visit, created_at, updated_at
        FROM bookmarks 
        WHERE last_visit IS NOT NULL
        ORDER BY last_visit DESC 
        LIMIT 10
    `
    rows, err := bdb.db.Query(recentQuery)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    for rows.Next() {
        var bookmark Bookmark
        var tagsString sql.NullString
        var faviconData sql.NullString
        
        err := rows.Scan(
            &bookmark.ID, &bookmark.Name, &bookmark.URL, &bookmark.Category,
            &tagsString, &bookmark.Icon, &faviconData, &bookmark.Description,
            &bookmark.VisitCount, &bookmark.LastVisit, &bookmark.CreatedAt, &bookmark.UpdatedAt,
        )
        if err != nil {
            return nil, err
        }
        
        if tagsString.Valid {
            bookmark.SetTags(tagsString.String)
        }
        
        if faviconData.Valid {
            bookmark.Favicon = []byte(faviconData.String)
        }
        
        stats.RecentBookmarks = append(stats.RecentBookmarks, bookmark)
    }
    
    // 分类统计
    categoryQuery := `
        SELECT category, COUNT(*) as count
        FROM bookmarks 
        GROUP BY category
    `
    rows, err = bdb.db.Query(categoryQuery)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    stats.CategoryStats = make(map[string]int)
    for rows.Next() {
        var category string
        var count int
        err := rows.Scan(&category, &count)
        if err != nil {
            return nil, err
        }
        stats.CategoryStats[category] = count
    }
    
    return stats, nil
}
```

**菜单构建层：**

```go
// menu/bookmark_menu.go
package menu

import (
    "fmt"
    "log"
    "net/url"
    "os/exec"
    "runtime"
    "sort"
    "strings"
    
    "github.com/getlantern/systray"
)

type BookmarkMenu struct {
    db        *database.BookmarkDB
    menuItems map[int]*systray.MenuItem
    categories map[string]*systray.MenuItem
    app       *App
}

func NewBookmarkMenu(db *database.BookmarkDB, app *App) *BookmarkMenu {
    return &BookmarkMenu{
        db:        db,
        menuItems: make(map[int]*systray.MenuItem),
        categories: make(map[string]*systray.MenuItem),
        app:       app,
    }
}

func (bm *BookmarkMenu) BuildMenu() {
    // 清空现有菜单
    systray.ResetMenu()
    
    // 获取书签数据
    bookmarks, err := bm.db.GetBookmarks()
    if err != nil {
        log.Printf("获取书签列表失败: %v", err)
        bm.addErrorMenu()
        return
    }
    
    if len(bookmarks) == 0 {
        bm.addEmptyMenu()
        return
    }
    
    // 按分类分组
    categoryMap := bm.groupByCategory(bookmarks)
    
    // 创建分类菜单
    bm.createCategoryMenus(categoryMap)
    
    // 添加管理菜单
    bm.addManagementMenu()
}

func (bm *BookmarkMenu) groupByCategory(bookmarks []Bookmark) map[string][]Bookmark {
    categoryMap := make(map[string][]Bookmark)
    
    for _, bookmark := range bookmarks {
        categoryMap[bookmark.Category] = append(categoryMap[bookmark.Category], bookmark)
    }
    
    // 按访问次数排序每个分类内的书签
    for category, categoryBookmarks := range categoryMap {
        sort.Slice(categoryBookmarks, func(i, j int) bool {
            return categoryBookmarks[i].VisitCount > categoryBookmarks[j].VisitCount
        })
        categoryMap[category] = categoryBookmarks
    }
    
    return categoryMap
}

func (bm *BookmarkMenu) createCategoryMenus(categoryMap map[string][]Bookmark) {
    // 获取分类顺序
    categories := bm.getCategoryOrder(categoryMap)
    
    for i, category := range categories {
        bookmarks := categoryMap[category]
        
        // 添加分类标题
        categoryItem := systray.AddMenuItem(
            fmt.Sprintf("🔖 %s (%d)", category, len(bookmarks)),
            fmt.Sprintf("分类: %s", category),
        )
        bm.categories[category] = categoryItem
        
        // 添加该分类下的书签
        for _, bookmark := range bookmarks {
            displayName := bookmark.GetDisplayName()
            if bookmark.VisitCount > 0 {
                displayName = fmt.Sprintf("%s (%d)", displayName, bookmark.VisitCount)
            }
            
            item := systray.AddMenuItem(displayName, bookmark.URL)
            bm.menuItems[bookmark.ID] = item
            
            // 设置 Favicon
            if len(bookmark.Favicon) > 0 {
                item.SetIcon(bookmark.Favicon)
            } else if bookmark.Icon != "" {
                if iconData, err := bm.loadIcon(bookmark.Icon); err == nil {
                    item.SetIcon(iconData)
                }
            }
            
            // 处理点击事件
            go func(b Bookmark) {
                for {
                    <-item.ClickedCh
                    bm.openBookmark(b)
                }
            }(bookmark)
        }
        
        // 添加分隔符（除了最后一个分类）
        if i < len(categories)-1 {
            systray.AddSeparator()
        }
    }
}

func (bm *BookmarkMenu) getCategoryOrder(categoryMap map[string][]Bookmark) []string {
    // 预定义分类顺序
    predefinedOrder := []string{"工作", "学习", "娱乐", "工具", "新闻", "未分类"}
    
    var categories []string
    
    // 添加预定义分类
    for _, category := range predefinedOrder {
        if _, exists := categoryMap[category]; exists {
            categories = append(categories, category)
        }
    }
    
    // 添加其他分类
    for category := range categoryMap {
        found := false
        for _, predefined := range predefinedOrder {
            if category == predefined {
                found = true
                break
            }
        }
        if !found {
            categories = append(categories, category)
        }
    }
    
    return categories
}

func (bm *BookmarkMenu) addManagementMenu() {
    systray.AddSeparator()
    
    // 搜索书签
    searchItem := systray.AddMenuItem("🔍 搜索书签", "搜索书签")
    go func() {
        for {
            <-searchItem.ClickedCh
            bm.showSearchDialog()
        }
    }()
    
    // 刷新菜单
    refreshItem := systray.AddMenuItem("🔄 刷新", "重新加载书签列表")
    go func() {
        for {
            <-refreshItem.ClickedCh
            bm.refreshMenu()
        }
    }()
    
    // 添加书签
    addItem := systray.AddMenuItem("➕ 添加书签", "添加新的书签")
    go func() {
        for {
            <-addItem.ClickedCh
            bm.showAddBookmarkDialog()
        }
    }()
    
    // 管理书签
    manageItem := systray.AddMenuItem("⚙️ 管理书签", "打开书签管理界面")
    go func() {
        for {
            <-manageItem.ClickedCh
            bm.openBookmarkManager()
        }
    }()
    
    // 导入书签
    importItem := systray.AddMenuItem("📥 导入书签", "从浏览器导入书签")
    go func() {
        for {
            <-importItem.ClickedCh
            bm.showImportDialog()
        }
    }()
}

func (bm *BookmarkMenu) addErrorMenu() {
    errorItem := systray.AddMenuItem("❌ 加载失败", "无法加载书签列表")
    errorItem.Disable()
}

func (bm *BookmarkMenu) addEmptyMenu() {
    emptyItem := systray.AddMenuItem("🔖 暂无书签", "点击添加书签")
    go func() {
        for {
            <-emptyItem.ClickedCh
            bm.showAddBookmarkDialog()
        }
    }()
}

func (bm *BookmarkMenu) openBookmark(bookmark Bookmark) {
    // 更新访问统计
    if err := bm.db.UpdateVisitCount(bookmark.ID); err != nil {
        log.Printf("更新访问统计失败: %v", err)
    }
    
    // 打开网址
    if err := bm.openURL(bookmark.URL); err != nil {
        log.Printf("打开网址失败: %v", err)
        bm.showErrorNotification("打开网址失败", bookmark.URL)
    } else {
        bm.showSuccessNotification("网址已打开", bookmark.Name)
    }
}

func (bm *BookmarkMenu) openURL(urlStr string) error {
    var cmd *exec.Cmd
    
    switch runtime.GOOS {
    case "windows":
        cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", urlStr)
    case "darwin":
        cmd = exec.Command("open", urlStr)
    case "linux":
        cmd = exec.Command("xdg-open", urlStr)
    default:
        return fmt.Errorf("不支持的操作系统: %s", runtime.GOOS)
    }
    
    return cmd.Start()
}

func (bm *BookmarkMenu) refreshMenu() {
    log.Println("刷新书签菜单")
    bm.BuildMenu()
    
    // 通知前端刷新
    if bm.app != nil {
        bm.app.bridge.EmitToFrontend("bookmark-menu-refreshed", nil)
    }
}

func (bm *BookmarkMenu) showSearchDialog() {
    // 通知前端显示搜索对话框
    if bm.app != nil {
        bm.app.bridge.EmitToFrontend("show-bookmark-search", nil)
    }
}

func (bm *BookmarkMenu) showAddBookmarkDialog() {
    // 通知前端显示添加书签对话框
    if bm.app != nil {
        bm.app.bridge.EmitToFrontend("show-add-bookmark-dialog", nil)
    }
}

func (bm *BookmarkMenu) openBookmarkManager() {
    // 通知前端打开书签管理界面
    if bm.app != nil {
        bm.app.bridge.EmitToFrontend("open-bookmark-manager", nil)
    }
}

func (bm *BookmarkMenu) showImportDialog() {
    // 通知前端显示导入对话框
    if bm.app != nil {
        bm.app.bridge.EmitToFrontend("show-import-bookmarks", nil)
    }
}

func (bm *BookmarkMenu) loadIcon(iconPath string) ([]byte, error) {
    // 从资源文件或文件系统加载图标
    return os.ReadFile(iconPath)
}

func (bm *BookmarkMenu) showErrorNotification(title, message string) {
    if bm.app != nil {
        bm.app.notificationMgr.ShowError(title, message)
    }
}

func (bm *BookmarkMenu) showSuccessNotification(title, message string) {
    if bm.app != nil {
        bm.app.notificationMgr.ShowSuccess(title, message)
    }
}
```

#### 高级特性

**Favicon 自动获取：**

```go
// services/favicon_service.go
package services

import (
    "bytes"
    "fmt"
    "io"
    "net/http"
    "net/url"
    "strings"
    "time"
)

type FaviconService struct {
    client *http.Client
    cache  map[string][]byte
}

func NewFaviconService() *FaviconService {
    return &FaviconService{
        client: &http.Client{
            Timeout: 10 * time.Second,
        },
        cache: make(map[string][]byte),
    }
}

func (fs *FaviconService) GetFavicon(bookmarkURL string) ([]byte, error) {
    // 检查缓存
    if favicon, exists := fs.cache[bookmarkURL]; exists {
        return favicon, nil
    }
    
    // 解析URL
    u, err := url.Parse(bookmarkURL)
    if err != nil {
        return nil, err
    }
    
    // 尝试多个可能的 favicon 位置
    faviconURLs := []string{
        fmt.Sprintf("%s://%s/favicon.ico", u.Scheme, u.Host),
        fmt.Sprintf("%s://%s/favicon.png", u.Scheme, u.Host),
        fmt.Sprintf("%s://%s/apple-touch-icon.png", u.Scheme, u.Host),
    }
    
    for _, faviconURL := range faviconURLs {
        favicon, err := fs.fetchFavicon(faviconURL)
        if err == nil && len(favicon) > 0 {
            // 缓存结果
            fs.cache[bookmarkURL] = favicon
            return favicon, nil
        }
    }
    
    return nil, fmt.Errorf("无法获取 favicon")
}

func (fs *FaviconService) fetchFavicon(faviconURL string) ([]byte, error) {
    req, err := http.NewRequest("GET", faviconURL, nil)
    if err != nil {
        return nil, err
    }
    
    // 设置 User-Agent
    req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
    
    resp, err := fs.client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
    }
    
    // 检查内容类型
    contentType := resp.Header.Get("Content-Type")
    if !strings.Contains(contentType, "image") {
        return nil, fmt.Errorf("不是图片类型: %s", contentType)
    }
    
    // 限制大小（最大 1MB）
    const maxSize = 1024 * 1024
    body := &bytes.Buffer{}
    _, err = io.CopyN(body, resp.Body, maxSize)
    if err != nil && err != io.EOF {
        return nil, err
    }
    
    return body.Bytes(), nil
}

func (fs *FaviconService) ClearCache() {
    fs.cache = make(map[string][]byte)
}
```

**书签导入功能：**

```go
// services/import_service.go
package services

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "os"
    "path/filepath"
    "runtime"
)

type ImportService struct {
    db *database.BookmarkDB
}

func NewImportService(db *database.BookmarkDB) *ImportService {
    return &ImportService{db: db}
}

// Chrome 书签结构
type ChromeBookmark struct {
    Name     string           `json:"name"`
    URL      string           `json:"url"`
    Type     string           `json:"type"`
    Children []ChromeBookmark `json:"children"`
}

type ChromeBookmarks struct {
    Roots struct {
        BookmarkBar ChromeBookmark `json:"bookmark_bar"`
        Other       ChromeBookmark `json:"other"`
        Synced      ChromeBookmark `json:"synced"`
    } `json:"roots"`
}

func (is *ImportService) ImportFromChrome() error {
    // 获取 Chrome 书签文件路径
    bookmarkPath, err := is.getChromeBookmarkPath()
    if err != nil {
        return err
    }
    
    // 读取书签文件
    data, err := ioutil.ReadFile(bookmarkPath)
    if err != nil {
        return fmt.Errorf("读取 Chrome 书签文件失败: %w", err)
    }
    
    // 解析 JSON
    var bookmarks ChromeBookmarks
    if err := json.Unmarshal(data, &bookmarks); err != nil {
        return fmt.Errorf("解析书签文件失败: %w", err)
    }
    
    // 导入书签
    imported := 0
    err = is.importBookmarkNode(bookmarks.Roots.BookmarkBar, "书签栏", &imported)
    if err != nil {
        return err
    }
    
    err = is.importBookmarkNode(bookmarks.Roots.Other, "其他书签", &imported)
    if err != nil {
        return err
    }
    
    return nil
}

func (is *ImportService) getChromeBookmarkPath() (string, error) {
    var bookmarkPath string
    
    switch runtime.GOOS {
    case "windows":
        bookmarkPath = filepath.Join(os.Getenv("LOCALAPPDATA"), "Google", "Chrome", "User Data", "Default", "Bookmarks")
    case "darwin":
        bookmarkPath = filepath.Join(os.Getenv("HOME"), "Library", "Application Support", "Google", "Chrome", "Default", "Bookmarks")
    case "linux":
        bookmarkPath = filepath.Join(os.Getenv("HOME"), ".config", "google-chrome", "Default", "Bookmarks")
    default:
        return "", fmt.Errorf("不支持的操作系统: %s", runtime.GOOS)
    }
    
    if _, err := os.Stat(bookmarkPath); os.IsNotExist(err) {
        return "", fmt.Errorf("Chrome 书签文件不存在: %s", bookmarkPath)
    }
    
    return bookmarkPath, nil
}

func (is *ImportService) importBookmarkNode(node ChromeBookmark, category string, imported *int) error {
    // 如果是书签（有 URL）
    if node.URL != "" {
        bookmark := Bookmark{
            Name:        node.Name,
            URL:         node.URL,
            Category:    category,
            Description: fmt.Sprintf("从 Chrome 导入"),
        }
        
        if err := is.db.AddBookmark(bookmark); err != nil {
            return fmt.Errorf("导入书签失败: %w", err)
        }
        
        *imported++
    }
    
    // 递归处理子节点
    for _, child := range node.Children {
        childCategory := category
        if child.Type == "folder" {
            childCategory = child.Name
        }
        
        if err := is.importBookmarkNode(child, childCategory, imported); err != nil {
            return err
        }
    }
    
    return nil
}

// 导出书签
func (is *ImportService) ExportToHTML() (string, error) {
    bookmarks, err := is.db.GetBookmarks()
    if err != nil {
        return "", err
    }
    
    html := `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`
    
    // 按分类组织
    categoryMap := make(map[string][]Bookmark)
    for _, bookmark := range bookmarks {
        categoryMap[bookmark.Category] = append(categoryMap[bookmark.Category], bookmark)
    }
    
    for category, categoryBookmarks := range categoryMap {
        html += fmt.Sprintf("    <DT><H3>%s</H3>\n", category)
        html += "    <DL><p>\n"
        
        for _, bookmark := range categoryBookmarks {
            html += fmt.Sprintf("        <DT><A HREF=\"%s\">%s</A>\n", bookmark.URL, bookmark.Name)
        }
        
        html += "    </DL><p>\n"
    }
    
    html += "</DL><p>\n"
    
    return html, nil
}
```

**智能推荐算法：**

```go
// services/recommendation_service.go
package services

import (
    "math"
    "sort"
    "strings"
    "time"
)

type RecommendationService struct {
    db *database.BookmarkDB
}

func NewRecommendationService(db *database.BookmarkDB) *RecommendationService {
    return &RecommendationService{db: db}
}

type Recommendation struct {
    Bookmark Bookmark `json:"bookmark"`
    Score    float64  `json:"score"`
    Reason   string   `json:"reason"`
}

func (rs *RecommendationService) GetRecommendations(userBookmark Bookmark, limit int) ([]Recommendation, error) {
    // 获取所有书签
    allBookmarks, err := rs.db.GetBookmarks()
    if err != nil {
        return nil, err
    }
    
    var recommendations []Recommendation
    
    for _, bookmark := range allBookmarks {
        if bookmark.ID == userBookmark.ID {
            continue // 跳过自己
        }
        
        score := rs.calculateSimilarityScore(userBookmark, bookmark)
        if score > 0.3 { // 相似度阈值
            recommendations = append(recommendations, Recommendation{
                Bookmark: bookmark,
                Score:    score,
                Reason:   rs.getRecommendationReason(userBookmark, bookmark, score),
            })
        }
    }
    
    // 按分数排序
    sort.Slice(recommendations, func(i, j int) bool {
        return recommendations[i].Score > recommendations[j].Score
    })
    
    // 限制数量
    if len(recommendations) > limit {
        recommendations = recommendations[:limit]
    }
    
    return recommendations, nil
}

func (rs *RecommendationService) calculateSimilarityScore(bookmark1, bookmark2 Bookmark) float64 {
    score := 0.0
    
    // 分类相似度 (40%)
    if bookmark1.Category == bookmark2.Category {
        score += 0.4
    }
    
    // 标签相似度 (30%)
    tagScore := rs.calculateTagSimilarity(bookmark1.Tags, bookmark2.Tags)
    score += tagScore * 0.3
    
    // 域名相似度 (20%)
    domainScore := rs.calculateDomainSimilarity(bookmark1.URL, bookmark2.URL)
    score += domainScore * 0.2
    
    // 访问模式相似度 (10%)
    accessScore := rs.calculateAccessSimilarity(bookmark1, bookmark2)
    score += accessScore * 0.1
    
    return math.Min(score, 1.0)
}

func (rs *RecommendationService) calculateTagSimilarity(tags1, tags2 []string) float64 {
    if len(tags1) == 0 || len(tags2) == 0 {
        return 0
    }
    
    commonTags := 0
    for _, tag1 := range tags1 {
        for _, tag2 := range tags2 {
            if strings.EqualFold(tag1, tag2) {
                commonTags++
                break
            }
        }
    }
    
    totalTags := len(tags1) + len(tags2) - commonTags
    if totalTags == 0 {
        return 0
    }
    
    return float64(commonTags) / float64(totalTags)
}

func (rs *RecommendationService) calculateDomainSimilarity(url1, url2 string) float64 {
    domain1 := rs.extractDomain(url1)
    domain2 := rs.extractDomain(url2)
    
    if domain1 == domain2 {
        return 1.0
    }
    
    // 检查是否为同一主域名
    parts1 := strings.Split(domain1, ".")
    parts2 := strings.Split(domain2, ".")
    
    if len(parts1) >= 2 && len(parts2) >= 2 {
        if parts1[len(parts1)-2] == parts2[len(parts2)-2] {
            return 0.5
        }
    }
    
    return 0
}

func (rs *RecommendationService) calculateAccessSimilarity(bookmark1, bookmark2 Bookmark) float64 {
    // 基于访问次数的相似度
    count1 := float64(bookmark1.VisitCount)
    count2 := float64(bookmark2.VisitCount)
    
    if count1 == 0 && count2 == 0 {
        return 1.0
    }
    
    if count1 == 0 || count2 == 0 {
        return 0.5
    }
    
    ratio := math.Min(count1, count2) / math.Max(count1, count2)
    return ratio
}

func (rs *RecommendationService) extractDomain(url string) string {
    // 简单的域名提取
    if strings.HasPrefix(url, "http://") {
        url = url[7:]
    } else if strings.HasPrefix(url, "https://") {
        url = url[8:]
    }
    
    if idx := strings.Index(url, "/"); idx != -1 {
        url = url[:idx]
    }
    
    return url
}

func (rs *RecommendationService) getRecommendationReason(bookmark1, bookmark2 Bookmark, score float64) string {
    reasons := []string{}
    
    if bookmark1.Category == bookmark2.Category {
        reasons = append(reasons, "相同分类")
    }
    
    if rs.calculateTagSimilarity(bookmark1.Tags, bookmark2.Tags) > 0.5 {
        reasons = append(reasons, "相似标签")
    }
    
    if rs.calculateDomainSimilarity(bookmark1.URL, bookmark2.URL) > 0.5 {
        reasons = append(reasons, "相似网站")
    }
    
    if len(reasons) == 0 {
        return "基于访问模式推荐"
    }
    
    return strings.Join(reasons, "、")
}
```

通过以上实现，我们构建了一个功能完整的网址书签管理系统。该系统具有以下特点：

1. **完整的数据管理**：支持书签的 CRUD 操作，数据持久化存储
2. **智能菜单构建**：按分类组织，支持 Favicon 显示
3. **跨平台 URL 打开**：自动适配不同操作系统的浏览器
4. **高级功能**：Favicon 自动获取、书签导入导出、智能推荐
5. **用户友好的界面**：Vue 3 组件化设计，响应式布局
6. **性能优化**：数据库索引、缓存机制、异步处理

通过这两个实战项目，我们可以看到 systray 库在实际应用中的表现。无论是文件夹快速访问还是书签管理，系统托盘都能提供很好的用户体验。结合 Wails v2 框架，我们既有了现代化的前端界面，又保留了系统托盘的便捷性。

---

## 生产部署与优化

### 配置管理最佳实践

#### 配置文件结构设计

在生产环境中，良好的配置管理是确保应用稳定运行的关键。我们需要设计一个灵活、可扩展的配置系统。

**分层配置架构：**

```go
// config/config.go
package config

import (
    "encoding/json"
    "fmt"
    "os"
    "path/filepath"
    "sync"
    "time"
)

type Config struct {
    App      AppConfig      `json:"app"`
    Database DatabaseConfig `json:"database"`
    Tray     TrayConfig     `json:"tray"`
    UI       UIConfig       `json:"ui"`
    Log      LogConfig      `json:"log"`
    Cache    CacheConfig    `json:"cache"`
}

type AppConfig struct {
    Name           string `json:"name"`
    Version        string `json:"version"`
    Author         string `json:"author"`
    Description    string `json:"description"`
    StartMinimized bool   `json:"start_minimized"`
    CloseToTray    bool   `json:"close_to_tray"`
    AutoStart      bool   `json:"auto_start"`
    CheckUpdates   bool   `json:"check_updates"`
}

type DatabaseConfig struct {
    Type     string `json:"type"`
    Path     string `json:"path"`
    MaxConns int    `json:"max_conns"`
    Timeout  int    `json:"timeout"`
}

type TrayConfig struct {
    IconPath     string `json:"icon_path"`
    Title        string `json:"title"`
    Tooltip      string `json:"tooltip"`
    ShowOnStart  bool   `json:"show_on_start"`
    HideOnClose  bool   `json:"hide_on_close"`
    DoubleClick  bool   `json:"double_click"`
}

type UIConfig struct {
    Theme         string `json:"theme"`
    Language      string `json:"language"`
    FontSize      int    `json:"font_size"`
    WindowWidth   int    `json:"window_width"`
    WindowHeight  int    `json:"window_height"`
    RememberSize  bool   `json:"remember_size"`
    RememberPos   bool   `json:"remember_pos"`
}

type LogConfig struct {
    Level      string `json:"level"`
    File       string `json:"file"`
    MaxSize    int    `json:"max_size"`
    MaxBackups int    `json:"max_backups"`
    MaxAge     int    `json:"max_age"`
    Compress   bool   `json:"compress"`
}

type CacheConfig struct {
    Enabled     bool          `json:"enabled"`
    TTL         time.Duration `json:"ttl"`
    MaxSize     int64         `json:"max_size"`
    CleanupInt  time.Duration `json:"cleanup_interval"`
}

type ConfigManager struct {
    config     *Config
    configPath string
    mutex      sync.RWMutex
    watchers   []func(*Config)
}

func NewConfigManager() *ConfigManager {
    return &ConfigManager{
        config:     getDefaultConfig(),
        configPath: getConfigPath(),
        watchers:   make([]func(*Config), 0),
    }
}

func getDefaultConfig() *Config {
    return &Config{
        App: AppConfig{
            Name:           "智能托盘应用",
            Version:        "1.0.0",
            Author:         "Your Name",
            Description:    "快速访问常用文件夹和书签的桌面工具",
            StartMinimized: false,
            CloseToTray:    true,
            AutoStart:      false,
            CheckUpdates:   true,
        },
        Database: DatabaseConfig{
            Type:     "sqlite3",
            Path:     "data/app.db",
            MaxConns: 10,
            Timeout:  30,
        },
        Tray: TrayConfig{
            IconPath:    "assets/icon.png",
            Title:       "智能托盘应用",
            Tooltip:     "快速访问常用文件夹和书签",
            ShowOnStart: true,
            HideOnClose: true,
            DoubleClick: false,
        },
        UI: UIConfig{
            Theme:        "light",
            Language:     "zh-CN",
            FontSize:     14,
            WindowWidth:  1024,
            WindowHeight: 768,
            RememberSize: true,
            RememberPos:  true,
        },
        Log: LogConfig{
            Level:      "info",
            File:       "logs/app.log",
            MaxSize:    100,
            MaxBackups: 3,
            MaxAge:     7,
            Compress:   true,
        },
        Cache: CacheConfig{
            Enabled:    true,
            TTL:        24 * time.Hour,
            MaxSize:    100 * 1024 * 1024, // 100MB
            CleanupInt: time.Hour,
        },
    }
}

func getConfigPath() string {
    homeDir, _ := os.UserHomeDir()
    configDir := filepath.Join(homeDir, ".config", "smart-tray-app")
    os.MkdirAll(configDir, 0755)
    return filepath.Join(configDir, "config.json")
}

func (cm *ConfigManager) Load() error {
    cm.mutex.Lock()
    defer cm.mutex.Unlock()
    
    data, err := os.ReadFile(cm.configPath)
    if err != nil {
        if os.IsNotExist(err) {
            // 配置文件不存在，使用默认配置并保存
            return cm.Save()
        }
        return err
    }
    
    var config Config
    if err := json.Unmarshal(data, &config); err != nil {
        return fmt.Errorf("解析配置文件失败: %w", err)
    }
    
    // 合并默认配置，确保所有字段都有值
    cm.config = cm.mergeWithDefault(&config)
    
    return nil
}

func (cm *ConfigManager) Save() error {
    cm.mutex.Lock()
    defer cm.mutex.Unlock()
    
    data, err := json.MarshalIndent(cm.config, "", "  ")
    if err != nil {
        return fmt.Errorf("序列化配置失败: %w", err)
    }
    
    if err := os.WriteFile(cm.configPath, data, 0644); err != nil {
        return fmt.Errorf("保存配置文件失败: %w", err)
    }
    
    return nil
}

func (cm *ConfigManager) Get() *Config {
    cm.mutex.RLock()
    defer cm.mutex.RUnlock()
    return cm.config
}

func (cm *ConfigManager) Update(updates map[string]interface{}) error {
    cm.mutex.Lock()
    defer cm.mutex.Unlock()
    
    // 更新配置
    if err := cm.applyUpdates(updates); err != nil {
        return err
    }
    
    // 保存配置
    if err := cm.Save(); err != nil {
        return err
    }
    
    // 通知观察者
    for _, watcher := range cm.watchers {
        go watcher(cm.config)
    }
    
    return nil
}

func (cm *ConfigManager) Watch(callback func(*Config)) {
    cm.mutex.Lock()
    defer cm.mutex.Unlock()
    cm.watchers = append(cm.watchers, callback)
}

func (cm *ConfigManager) mergeWithDefault(userConfig *Config) *Config {
    defaultConfig := getDefaultConfig()
    
    // 这里可以实现更复杂的合并逻辑
    // 目前简单返回用户配置，缺失字段使用默认值
    if userConfig.App.Name == "" {
        userConfig.App.Name = defaultConfig.App.Name
    }
    if userConfig.App.Version == "" {
        userConfig.App.Version = defaultConfig.App.Version
    }
    // ... 其他字段的合并逻辑
    
    return userConfig
}

func (cm *ConfigManager) applyUpdates(updates map[string]interface{}) error {
    // 这里可以实现更复杂的更新逻辑
    // 目前简单示例
    for key, value := range updates {
        switch key {
        case "app.start_minimized":
            if v, ok := value.(bool); ok {
                cm.config.App.StartMinimized = v
            }
        case "app.close_to_tray":
            if v, ok := value.(bool); ok {
                cm.config.App.CloseToTray = v
            }
        case "ui.theme":
            if v, ok := value.(string); ok {
                cm.config.UI.Theme = v
            }
        // ... 其他字段的更新逻辑
        }
    }
    
    return nil
}
```

#### 配置热重载

在生产环境中，配置热重载功能可以让应用在不重启的情况下更新配置，提高可用性。

```go
// config/hot_reload.go
package config

import (
    "github.com/fsnotify/fsnotify"
    "log"
    "time"
)

type HotReloadManager struct {
    configMgr *ConfigManager
    watcher   *fsnotify.Watcher
    quitChan  chan struct{}
}

func NewHotReloadManager(configMgr *ConfigManager) (*HotReloadManager, error) {
    watcher, err := fsnotify.NewWatcher()
    if err != nil {
        return nil, err
    }
    
    return &HotReloadManager{
        configMgr: configMgr,
        watcher:   watcher,
        quitChan:  make(chan struct{}),
    }, nil
}

func (hrm *HotReloadManager) Start() error {
    // 监听配置文件
    if err := hrm.watcher.Add(hrm.configMgr.configPath); err != nil {
        return err
    }
    
    go hrm.watchLoop()
    return nil
}

func (hrm *HotReloadManager) Stop() {
    close(hrm.quitChan)
    hrm.watcher.Close()
}

func (hrm *HotReloadManager) watchLoop() {
    ticker := time.NewTicker(1 * time.Second)
    defer ticker.Stop()
    
    for {
        select {
        case event := <-hrm.watcher.Events:
            hrm.handleFileEvent(event)
        case err := <-hrm.watcher.Errors:
            log.Printf("配置文件监控错误: %v", err)
        case <-hrm.quitChan:
            return
        case <-ticker.C:
            // 定期检查配置文件
            hrm.checkConfigFile()
        }
    }
}

func (hrm *HotReloadManager) handleFileEvent(event fsnotify.Event) {
    if event.Op&fsnotify.Write == fsnotify.Write {
        log.Println("配置文件已更新，正在重新加载...")
        
        // 防抖动处理
        time.Sleep(100 * time.Millisecond)
        
        if err := hrm.configMgr.Load(); err != nil {
            log.Printf("重新加载配置失败: %v", err)
        } else {
            log.Println("配置重新加载成功")
        }
    }
}

func (hrm *HotReloadManager) checkConfigFile() {
    // 检查配置文件是否存在
    if _, err := os.Stat(hrm.configMgr.configPath); os.IsNotExist(err) {
        log.Println("配置文件不存在，使用默认配置")
        hrm.configMgr.Save()
    }
}
```

#### 配置验证

配置验证确保应用配置的正确性和安全性。

```go
// config/validator.go
package config

import (
    "fmt"
    "net/url"
    "os"
    "path/filepath"
    "strings"
)

type ConfigValidator struct{}

func NewConfigValidator() *ConfigValidator {
    return &ConfigValidator{}
}

func (cv *ConfigValidator) Validate(config *Config) error {
    var errors []string
    
    // 验证应用配置
    if err := cv.validateAppConfig(&config.App); err != nil {
        errors = append(errors, fmt.Sprintf("应用配置错误: %v", err))
    }
    
    // 验证数据库配置
    if err := cv.validateDatabaseConfig(&config.Database); err != nil {
        errors = append(errors, fmt.Sprintf("数据库配置错误: %v", err))
    }
    
    // 验证托盘配置
    if err := cv.validateTrayConfig(&config.Tray); err != nil {
        errors = append(errors, fmt.Sprintf("托盘配置错误: %v", err))
    }
    
    // 验证UI配置
    if err := cv.validateUIConfig(&config.UI); err != nil {
        errors = append(errors, fmt.Sprintf("UI配置错误: %v", err))
    }
    
    // 验证日志配置
    if err := cv.validateLogConfig(&config.Log); err != nil {
        errors = append(errors, fmt.Sprintf("日志配置错误: %v", err))
    }
    
    if len(errors) > 0 {
        return fmt.Errorf("配置验证失败:\n%s", strings.Join(errors, "\n"))
    }
    
    return nil
}

func (cv *ConfigValidator) validateAppConfig(config *AppConfig) error {
    if config.Name == "" {
        return fmt.Errorf("应用名称不能为空")
    }
    
    if config.Version == "" {
        return fmt.Errorf("应用版本不能为空")
    }
    
    return nil
}

func (cv *ConfigValidator) validateDatabaseConfig(config *DatabaseConfig) error {
    if config.Type == "" {
        return fmt.Errorf("数据库类型不能为空")
    }
    
    if config.Path == "" {
        return fmt.Errorf("数据库路径不能为空")
    }
    
    // 检查数据库路径是否可写
    dir := filepath.Dir(config.Path)
    if _, err := os.Stat(dir); os.IsNotExist(err) {
        if err := os.MkdirAll(dir, 0755); err != nil {
            return fmt.Errorf("无法创建数据库目录: %v", err)
        }
    }
    
    if config.MaxConns <= 0 {
        return fmt.Errorf("最大连接数必须大于0")
    }
    
    if config.Timeout <= 0 {
        return fmt.Errorf("超时时间必须大于0")
    }
    
    return nil
}

func (cv *ConfigValidator) validateTrayConfig(config *TrayConfig) error {
    if config.IconPath != "" {
        if _, err := os.Stat(config.IconPath); os.IsNotExist(err) {
            return fmt.Errorf("托盘图标文件不存在: %s", config.IconPath)
        }
    }
    
    return nil
}

func (cv *ConfigValidator) validateUIConfig(config *UIConfig) error {
    validThemes := []string{"light", "dark", "auto"}
    if !contains(validThemes, config.Theme) {
        return fmt.Errorf("无效的主题: %s", config.Theme)
    }
    
    validLanguages := []string{"zh-CN", "en-US", "ja-JP"}
    if !contains(validLanguages, config.Language) {
        return fmt.Errorf("无效的语言: %s", config.Language)
    }
    
    if config.FontSize <= 0 {
        return fmt.Errorf("字体大小必须大于0")
    }
    
    if config.WindowWidth <= 0 {
        return fmt.Errorf("窗口宽度必须大于0")
    }
    
    if config.WindowHeight <= 0 {
        return fmt.Errorf("窗口高度必须大于0")
    }
    
    return nil
}

func (cv *ConfigValidator) validateLogConfig(config *LogConfig) error {
    validLevels := []string{"debug", "info", "warn", "error"}
    if !contains(validLevels, config.Level) {
        return fmt.Errorf("无效的日志级别: %s", config.Level)
    }
    
    if config.File != "" {
        dir := filepath.Dir(config.File)
        if _, err := os.Stat(dir); os.IsNotExist(err) {
            if err := os.MkdirAll(dir, 0755); err != nil {
                return fmt.Errorf("无法创建日志目录: %v", err)
            }
        }
    }
    
    if config.MaxSize <= 0 {
        return fmt.Errorf("最大文件大小必须大于0")
    }
    
    if config.MaxBackups < 0 {
        return fmt.Errorf("最大备份数不能为负数")
    }
    
    if config.MaxAge < 0 {
        return fmt.Errorf("最大保存天数不能为负数")
    }
    
    return nil
}

func contains(slice []string, item string) bool {
    for _, s := range slice {
        if s == item {
            return true
        }
    }
    return false
}
```

### 性能优化

#### 菜单更新优化

系统托盘菜单的频繁更新可能影响性能，需要实现智能的更新策略。

```go
// performance/menu_optimizer.go
package performance

import (
    "sync"
    "time"
)

type MenuOptimizer struct {
    updateQueue    chan MenuUpdate
    debounceTimer  *time.Timer
    debounceDelay  time.Duration
    maxQueueSize   int
    isUpdating     bool
    mutex          sync.Mutex
}

type MenuUpdate struct {
    Type      string
    Data      interface{}
    Timestamp time.Time
}

func NewMenuOptimizer() *MenuOptimizer {
    return &MenuOptimizer{
        updateQueue:   make(chan MenuUpdate, 100),
        debounceDelay: 100 * time.Millisecond,
        maxQueueSize:  100,
    }
}

func (mo *MenuOptimizer) QueueUpdate(updateType string, data interface{}) {
    mo.mutex.Lock()
    defer mo.mutex.Unlock()
    
    // 检查队列大小
    if len(mo.updateQueue) >= mo.maxQueueSize {
        // 队列已满，丢弃最旧的更新
        select {
        case <-mo.updateQueue:
        default:
        }
    }
    
    // 添加更新到队列
    select {
    case mo.updateQueue <- MenuUpdate{
        Type:      updateType,
        Data:      data,
        Timestamp: time.Now(),
    }:
    default:
        // 队列已满，丢弃更新
    }
    
    // 启动防抖动处理
    if mo.debounceTimer != nil {
        mo.debounceTimer.Stop()
    }
    
    mo.debounceTimer = time.AfterFunc(mo.debounceDelay, func() {
        mo.processUpdates()
    })
}

func (mo *MenuOptimizer) processUpdates() {
    mo.mutex.Lock()
    defer mo.mutex.Unlock()
    
    if mo.isUpdating {
        return
    }
    
    mo.isUpdating = true
    
    go func() {
        defer func() {
            mo.mutex.Lock()
            mo.isUpdating = false
            mo.mutex.Unlock()
        }()
        
        // 收集所有待处理的更新
        updates := mo.collectUpdates()
        
        if len(updates) == 0 {
            return
        }
        
        // 合并更新
        mergedUpdate := mo.mergeUpdates(updates)
        
        // 应用更新
        mo.applyUpdate(mergedUpdate)
    }()
}

func (mo *MenuOptimizer) collectUpdates() []MenuUpdate {
    var updates []MenuUpdate
    
    for {
        select {
        case update := <-mo.updateQueue:
            updates = append(updates, update)
        default:
            return updates
        }
    }
}

func (mo *MenuOptimizer) mergeUpdates(updates []MenuUpdate) MenuUpdate {
    if len(updates) == 0 {
        return MenuUpdate{}
    }
    
    // 简单的合并策略：使用最新的更新
    latest := updates[0]
    for _, update := range updates[1:] {
        if update.Timestamp.After(latest.Timestamp) {
            latest = update
        }
    }
    
    return latest
}

func (mo *MenuOptimizer) applyUpdate(update MenuUpdate) {
    // 这里实现具体的菜单更新逻辑
    switch update.Type {
    case "folder_added":
        // 处理文件夹添加
    case "folder_removed":
        // 处理文件夹删除
    case "bookmark_added":
        // 处理书签添加
    case "bookmark_removed":
        // 处理书签删除
    default:
        // 处理其他类型的更新
    }
}
```

#### 数据库优化

数据库性能优化对于大量数据的应用至关重要。

```go
// performance/db_optimizer.go
package performance

import (
    "database/sql"
    "sync"
    "time"
)

type DBOptimizer struct {
    db           *sql.DB
    connectionPool *ConnectionPool
    queryCache   *QueryCache
    indexManager *IndexManager
}

type ConnectionPool struct {
    db        *sql.DB
    maxConns  int
    idleConns int
    mutex     sync.Mutex
}

type QueryCache struct {
    cache map[string]CacheEntry
    mutex sync.RWMutex
    ttl   time.Duration
}

type CacheEntry struct {
    Data      interface{}
    Timestamp time.Time
}

type IndexManager struct {
    db *sql.DB
}

func NewDBOptimizer(db *sql.DB) *DBOptimizer {
    return &DBOptimizer{
        db:           db,
        connectionPool: NewConnectionPool(db),
        queryCache:   NewQueryCache(5 * time.Minute),
        indexManager: NewIndexManager(db),
    }
}

func NewConnectionPool(db *sql.DB) *ConnectionPool {
    return &ConnectionPool{
        db:        db,
        maxConns:  10,
        idleConns: 5,
    }
}

func (cp *ConnectionPool) Optimize() error {
    cp.mutex.Lock()
    defer cp.mutex.Unlock()
    
    // 设置最大连接数
    cp.db.SetMaxOpenConns(cp.maxConns)
    cp.db.SetMaxIdleConns(cp.idleConns)
    
    // 设置连接超时
    cp.db.SetConnMaxLifetime(30 * time.Minute)
    cp.db.SetConnMaxIdleTime(5 * time.Minute)
    
    return nil
}

func NewQueryCache(ttl time.Duration) *QueryCache {
    return &QueryCache{
        cache: make(map[string]CacheEntry),
        ttl:   ttl,
    }
}

func (qc *QueryCache) Get(key string) (interface{}, bool) {
    qc.mutex.RLock()
    defer qc.mutex.RUnlock()
    
    entry, exists := qc.cache[key]
    if !exists {
        return nil, false
    }
    
    // 检查是否过期
    if time.Since(entry.Timestamp) > qc.ttl {
        delete(qc.cache, key)
        return nil, false
    }
    
    return entry.Data, true
}

func (qc *QueryCache) Set(key string, data interface{}) {
    qc.mutex.Lock()
    defer qc.mutex.Unlock()
    
    qc.cache[key] = CacheEntry{
        Data:      data,
        Timestamp: time.Now(),
    }
}

func (qc *QueryCache) Clear() {
    qc.mutex.Lock()
    defer qc.mutex.Unlock()
    qc.cache = make(map[string]CacheEntry)
}

func NewIndexManager(db *sql.DB) *IndexManager {
    return &IndexManager{db: db}
}

func (im *IndexManager) CreateIndexes() error {
    indexes := []string{
        "CREATE INDEX IF NOT EXISTS idx_folders_category ON folders(category)",
        "CREATE INDEX IF NOT EXISTS idx_folders_access_count ON folders(access_count DESC)",
        "CREATE INDEX IF NOT EXISTS idx_folders_last_access ON folders(last_access DESC)",
        "CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category)",
        "CREATE INDEX IF NOT EXISTS idx_bookmarks_visit_count ON bookmarks(visit_count DESC)",
        "CREATE INDEX IF NOT EXISTS idx_bookmarks_last_visit ON bookmarks(last_visit DESC)",
        "CREATE INDEX IF NOT EXISTS idx_bookmarks_tags ON bookmarks(tags)",
    }
    
    for _, indexSQL := range indexes {
        if _, err := im.db.Exec(indexSQL); err != nil {
            return err
        }
    }
    
    return nil
}

func (im *IndexManager) AnalyzeTables() error {
    tables := []string{"folders", "bookmarks"}
    
    for _, table := range tables {
        if _, err := im.db.Exec(fmt.Sprintf("ANALYZE %s", table)); err != nil {
            return err
        }
    }
    
    return nil
}
```

#### 内存管理

合理的内存管理可以避免内存泄漏和性能问题。

```go
// performance/memory_manager.go
package performance

import (
    "runtime"
    "sync"
    "time"
)

type MemoryManager struct {
    maxMemoryUsage int64
    cleanupInt     time.Duration
    quitChan       chan struct{}
    mutex          sync.Mutex
}

func NewMemoryManager() *MemoryManager {
    return &MemoryManager{
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB
        cleanupInt:     time.Minute,
        quitChan:       make(chan struct{}),
    }
}

func (mm *MemoryManager) Start() {
    go mm.monitorMemory()
    go mm.cleanupRoutine()
}

func (mm *MemoryManager) Stop() {
    close(mm.quitChan)
}

func (mm *MemoryManager) monitorMemory() {
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()
    
    for {
        select {
        case <-ticker.C:
            mm.checkMemoryUsage()
        case <-mm.quitChan:
            return
        }
    }
}

func (mm *MemoryManager) checkMemoryUsage() {
    var m runtime.MemStats
    runtime.ReadMemStats(&m)
    
    if m.Alloc > uint64(mm.maxMemoryUsage) {
        mm.forceGC()
    }
}

func (mm *MemoryManager) forceGC() {
    runtime.GC()
    runtime.GC() // 执行两次确保清理
}

func (mm *MemoryManager) cleanupRoutine() {
    ticker := time.NewTicker(mm.cleanupInt)
    defer ticker.Stop()
    
    for {
        select {
        case <-ticker.C:
            mm.cleanup()
        case <-mm.quitChan:
            return
        }
    }
}

func (mm *MemoryManager) cleanup() {
    // 清理过期的缓存
    // 清理临时文件
    // 清理未使用的资源
    mm.forceGC()
}
```

### 跨平台打包

#### Windows 打包

Windows 平台的打包需要考虑多种因素，包括依赖、图标、版本信息等。

**NSIS 安装脚本：**

```nsis
; installer.nsi
!define APP_NAME "智能托盘应用"
!define APP_VERSION "1.0.0"
!define APP_PUBLISHER "Your Company"
!define APP_URL "https://your-website.com"
!define APP_EXECUTABLE "smart-tray-app.exe"

!include "MUI2.nsh"

Name "${APP_NAME}"
OutFile "SmartTrayApp-${APP_VERSION}-Setup.exe"
InstallDir "$PROGRAMFILES\${APP_NAME}"
InstallDirRegKey HKLM "Software\${APP_NAME}" "InstallDir"
RequestExecutionLevel admin

!define MUI_ICON "assets\icon.ico"
!define MUI_UNICON "assets\icon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "assets\header.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP "assets\welcome.bmp"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "SimpChinese"

Section "Main Application" SecMain
    SetOutPath "$INSTDIR"
    File "${APP_EXECUTABLE}"
    File "assets\icon.ico"
    File "config\default.json"
    
    ; 创建开始菜单快捷方式
    CreateDirectory "$SMPROGRAMS\${APP_NAME}"
    CreateShortCut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE}"
    CreateShortCut "$SMPROGRAMS\${APP_NAME}\卸载.lnk" "$INSTDIR\uninstall.exe"
    
    ; 创建桌面快捷方式
    CreateShortCut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE}"
    
    ; 写入注册表
    WriteRegStr HKLM "Software\${APP_NAME}" "InstallDir" "$INSTDIR"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayName" "${APP_NAME}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "UninstallString" "$INSTDIR\uninstall.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayVersion" "${APP_VERSION}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "Publisher" "${APP_PUBLISHER}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "URLInfoAbout" "${APP_URL}"
    
    ; 创建卸载程序
    WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

Section "Auto Start" SecAutoStart
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${APP_NAME}" "$INSTDIR\${APP_EXECUTABLE}"
SectionEnd

Section "Uninstall"
    Delete "$INSTDIR\${APP_EXECUTABLE}"
    Delete "$INSTDIR\icon.ico"
    Delete "$INSTDIR\default.json"
    Delete "$INSTDIR\uninstall.exe"
    
    RMDir "$INSTDIR"
    
    Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
    Delete "$SMPROGRAMS\${APP_NAME}\卸载.lnk"
    RMDir "$SMPROGRAMS\${APP_NAME}"
    
    Delete "$DESKTOP\${APP_NAME}.lnk"
    
    DeleteRegKey HKLM "Software\${APP_NAME}"
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${APP_NAME}"
SectionEnd
```

**构建脚本：**

```bash
#!/bin/bash
# build-windows.sh

set -e

echo "开始构建 Windows 版本..."

# 设置环境变量
export CGO_ENABLED=1
export GOOS=windows
export GOARCH=amd64

# 构建应用
echo "编译应用..."
go build -ldflags "-H=windowsgui -s -w" -o dist/windows/smart-tray-app.exe .

# 复制资源文件
echo "复制资源文件..."
mkdir -p dist/windows/assets
cp assets/icon.ico dist/windows/assets/
cp assets/header.bmp dist/windows/assets/
cp assets/welcome.bmp dist/windows/assets/
cp config/default.json dist/windows/config/

# 创建安装包
echo "创建安装包..."
makensis installer.nsi

echo "Windows 版本构建完成！"
```

#### macOS 打包

macOS 的打包需要创建 App Bundle 并进行代码签名。

**App Bundle 结构：**

```
SmartTrayApp.app/
├── Contents/
│   ├── Info.plist
│   ├── MacOS/
│   │   └── SmartTrayApp
│   ├── Resources/
│   │   ├── icon.icns
│   │   └── default.json
│   └── Frameworks/
```

**Info.plist 配置：**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>SmartTrayApp</string>
    <key>CFBundleIdentifier</key>
    <string>com.yourcompany.smart-tray-app</string>
    <key>CFBundleName</key>
    <string>智能托盘应用</string>
    <key>CFBundleDisplayName</key>
    <string>智能托盘应用</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>CFBundleIconFile</key>
    <string>icon</string>
    <key>LSUIElement</key>
    <true/>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSRequiresAquaSystemAppearance</key>
    <false/>
    <key>LSApplicationCategoryType</key>
    <string>public.app-category.productivity</string>
    <key>NSHumanReadableCopyright</key>
    <string>Copyright © 2024 Your Company. All rights reserved.</string>
</dict>
</plist>
```

**构建脚本：**

```bash
#!/bin/bash
# build-macos.sh

set -e

echo "开始构建 macOS 版本..."

# 设置环境变量
export CGO_ENABLED=1
export GOOS=darwin
export GOARCH=amd64

# 构建应用
echo "编译应用..."
go build -ldflags "-s -w" -o dist/macos/SmartTrayApp .

# 创建 App Bundle
echo "创建 App Bundle..."
mkdir -p dist/macos/SmartTrayApp.app/Contents/{MacOS,Resources,Frameworks}

# 复制可执行文件
cp dist/macos/SmartTrayApp dist/macos/SmartTrayApp.app/Contents/MacOS/

# 复制资源文件
cp assets/icon.icns dist/macos/SmartTrayApp.app/Contents/Resources/
cp config/default.json dist/macos/SmartTrayApp.app/Contents/Resources/

# 复制 Info.plist
cp dist/macos/Info.plist dist/macos/SmartTrayApp.app/Contents/

# 设置权限
chmod +x dist/macos/SmartTrayApp.app/Contents/MacOS/SmartTrayApp

# 代码签名（需要开发者证书）
if [ -n "$DEVELOPER_ID" ]; then
    echo "代码签名..."
    codesign --force --sign "$DEVELOPER_ID" dist/macos/SmartTrayApp.app
fi

# 创建 DMG
echo "创建 DMG..."
hdiutil create -volname "智能托盘应用" -srcfolder dist/macos/SmartTrayApp.app -ov -format UDZO dist/macos/SmartTrayApp.dmg

echo "macOS 版本构建完成！"
```

#### Linux 打包

Linux 平台支持多种打包格式，包括 AppImage、Snap、Flatpak 等。

**AppImage 打包：**

```bash
#!/bin/bash
# build-linux.sh

set -e

echo "开始构建 Linux 版本..."

# 设置环境变量
export CGO_ENABLED=1
export GOOS=linux
export GOARCH=amd64

# 构建应用
echo "编译应用..."
go build -ldflags "-s -w" -o dist/linux/smart-tray-app .

# 创建 AppImage 目录结构
echo "创建 AppImage 目录结构..."
mkdir -p dist/linux/SmartTrayApp.AppDir/{usr/bin,usr/share/applications,usr/share/icons}

# 复制可执行文件
cp dist/linux/smart-tray-app dist/linux/SmartTrayApp.AppDir/usr/bin/

# 复制资源文件
cp assets/icon.png dist/linux/SmartTrayApp.AppDir/usr/share/icons/
cp config/default.json dist/linux/SmartTrayApp.AppDir/usr/share/

# 创建 .desktop 文件
cat > dist/linux/SmartTrayApp.AppDir/usr/share/applications/smart-tray-app.desktop << EOF
[Desktop Entry]
Type=Application
Name=智能托盘应用
Comment=快速访问常用文件夹和书签的桌面工具
Exec=smart-tray-app
Icon=icon
Categories=Utility;
StartupNotify=false
EOF

# 创建 AppRun
cat > dist/linux/SmartTrayApp.AppDir/AppRun << 'EOF'
#!/bin/bash
HERE="$(dirname "$(readlink -f "${0}")")"
exec "${HERE}/usr/bin/smart-tray-app" "$@"
EOF
chmod +x dist/linux/SmartTrayApp.AppDir/AppRun

# 创建 AppImage
echo "创建 AppImage..."
if [ -f /usr/bin/appimagetool ]; then
    appimagetool dist/linux/SmartTrayApp.AppDir dist/linux/SmartTrayApp-x86_64.AppImage
else
    echo "请安装 appimagetool 来创建 AppImage"
fi

echo "Linux 版本构建完成！"
```

### 错误处理与日志

#### 统一错误处理

良好的错误处理机制可以提高应用的稳定性和可维护性。

```go
// errors/app_error.go
package errors

import (
    "fmt"
    "runtime"
    "strings"
)

type AppError struct {
    Code    string `json:"code"`
    Message string `json:"message"`
    Details string `json:"details"`
    Stack   string `json:"stack"`
    Err     error  `json:"-"`
}

func (e *AppError) Error() string {
    if e.Details != "" {
        return fmt.Sprintf("[%s] %s: %s", e.Code, e.Message, e.Details)
    }
    return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func NewAppError(code, message string, err error) *AppError {
    return &AppError{
        Code:    code,
        Message: message,
        Details: getErrorDetails(err),
        Stack:   getStackTrace(),
        Err:     err,
    }
}

func getErrorDetails(err error) string {
    if err == nil {
        return ""
    }
    return err.Error()
}

func getStackTrace() string {
    buf := make([]byte, 1024)
    n := runtime.Stack(buf, false)
    return string(buf[:n])
}

// 预定义错误代码
const (
    ErrCodeConfigLoad    = "CONFIG_LOAD_ERROR"
    ErrCodeDatabaseConn  = "DATABASE_CONN_ERROR"
    ErrCodeTrayInit      = "TRAY_INIT_ERROR"
    ErrCodeFileNotFound  = "FILE_NOT_FOUND"
    ErrCodeInvalidInput  = "INVALID_INPUT"
    ErrCodeNetworkError  = "NETWORK_ERROR"
    ErrCodePermissionDenied = "PERMISSION_DENIED"
)

// 错误处理中间件
type ErrorHandler struct {
    logger Logger
}

func NewErrorHandler(logger Logger) *ErrorHandler {
    return &ErrorHandler{logger: logger}
}

func (eh *ErrorHandler) Handle(err error) {
    if err == nil {
        return
    }
    
    appErr, ok := err.(*AppError)
    if !ok {
        appErr = NewAppError("UNKNOWN_ERROR", "未知错误", err)
    }
    
    // 记录错误日志
    eh.logger.Error("应用错误", map[string]interface{}{
        "code":    appErr.Code,
        "message": appErr.Message,
        "details": appErr.Details,
        "stack":   appErr.Stack,
    })
    
    // 根据错误类型采取不同的处理策略
    switch appErr.Code {
    case ErrCodeConfigLoad:
        // 配置加载错误，尝试使用默认配置
        eh.handleConfigError(appErr)
    case ErrCodeDatabaseConn:
        // 数据库连接错误，尝试重连
        eh.handleDatabaseError(appErr)
    case ErrCodeTrayInit:
        // 托盘初始化错误，禁用托盘功能
        eh.handleTrayError(appErr)
    default:
        // 其他错误，显示给用户
        eh.showErrorToUser(appErr)
    }
}

func (eh *ErrorHandler) handleConfigError(err *AppError) {
    eh.logger.Warn("配置加载失败，使用默认配置", map[string]interface{}{
        "error": err.Error(),
    })
    // 这里可以实现配置恢复逻辑
}

func (eh *ErrorHandler) handleDatabaseError(err *AppError) {
    eh.logger.Error("数据库连接失败", map[string]interface{}{
        "error": err.Error(),
    })
    // 这里可以实现数据库重连逻辑
}

func (eh *ErrorHandler) handleTrayError(err *AppError) {
    eh.logger.Error("托盘初始化失败，禁用托盘功能", map[string]interface{}{
        "error": err.Error(),
    })
    // 这里可以实现托盘功能禁用逻辑
}

func (eh *ErrorHandler) showErrorToUser(err *AppError) {
    // 这里可以实现用户友好的错误显示
    eh.logger.Error("用户可见错误", map[string]interface{}{
        "error": err.Error(),
    })
}
```

#### 日志系统

完善的日志系统对于生产环境的故障排查至关重要。

```go
// logging/logger.go
package logging

import (
    "encoding/json"
    "fmt"
    "io"
    "os"
    "path/filepath"
    "runtime"
    "strings"
    "time"
)

type LogLevel int

const (
    DebugLevel LogLevel = iota
    InfoLevel
    WarnLevel
    ErrorLevel
)

type Logger struct {
    level    LogLevel
    writer   io.Writer
    formatter Formatter
}

type Formatter interface {
    Format(entry *LogEntry) ([]byte, error)
}

type LogEntry struct {
    Level     LogLevel              `json:"level"`
    Message   string                `json:"message"`
    Fields    map[string]interface{} `json:"fields"`
    Timestamp time.Time             `json:"timestamp"`
    File      string                `json:"file"`
    Line      int                   `json:"line"`
    Function  string                `json:"function"`
}

type JSONFormatter struct{}

func (f *JSONFormatter) Format(entry *LogEntry) ([]byte, error) {
    return json.Marshal(entry)
}

type TextFormatter struct{}

func (f *TextFormatter) Format(entry *LogEntry) ([]byte, error) {
    levelStr := getLevelString(entry.Level)
    timestamp := entry.Timestamp.Format("2006-01-02 15:04:05")
    
    msg := fmt.Sprintf("[%s] %s %s: %s",
        timestamp, levelStr, entry.Function, entry.Message)
    
    if len(entry.Fields) > 0 {
        fields := make([]string, 0, len(entry.Fields))
        for k, v := range entry.Fields {
            fields = append(fields, fmt.Sprintf("%s=%v", k, v))
        }
        msg += " " + strings.Join(fields, " ")
    }
    
    return []byte(msg + "\n"), nil
}

func NewLogger(level LogLevel, writer io.Writer, formatter Formatter) *Logger {
    return &Logger{
        level:     level,
        writer:    writer,
        formatter: formatter,
    }
}

func (l *Logger) Debug(message string, fields map[string]interface{}) {
    l.log(DebugLevel, message, fields)
}

func (l *Logger) Info(message string, fields map[string]interface{}) {
    l.log(InfoLevel, message, fields)
}

func (l *Logger) Warn(message string, fields map[string]interface{}) {
    l.log(WarnLevel, message, fields)
}

func (l *Logger) Error(message string, fields map[string]interface{}) {
    l.log(ErrorLevel, message, fields)
}

func (l *Logger) log(level LogLevel, message string, fields map[string]interface{}) {
    if level < l.level {
        return
    }
    
    entry := &LogEntry{
        Level:     level,
        Message:   message,
        Fields:    fields,
        Timestamp: time.Now(),
    }
    
    // 获取调用者信息
    if pc, file, line, ok := runtime.Caller(2); ok {
        entry.File = filepath.Base(file)
        entry.Line = line
        if fn := runtime.FuncForPC(pc); fn != nil {
            entry.Function = fn.Name()
        }
    }
    
    // 格式化日志
    data, err := l.formatter.Format(entry)
    if err != nil {
        return
    }
    
    // 写入日志
    l.writer.Write(data)
}

func getLevelString(level LogLevel) string {
    switch level {
    case DebugLevel:
        return "DEBUG"
    case InfoLevel:
        return "INFO"
    case WarnLevel:
        return "WARN"
    case ErrorLevel:
        return "ERROR"
    default:
        return "UNKNOWN"
    }
}

// 日志轮转
type RotatingLogger struct {
    *Logger
    filePath    string
    maxSize     int64
    maxBackups  int
    maxAge      int
    compress    bool
}

func NewRotatingLogger(filePath string, maxSize int64, maxBackups, maxAge int, compress bool) *RotatingLogger {
    return &RotatingLogger{
        Logger:     NewLogger(InfoLevel, os.Stdout, &TextFormatter{}),
        filePath:   filePath,
        maxSize:    maxSize,
        maxBackups: maxBackups,
        maxAge:     maxAge,
        compress:   compress,
    }
}

func (rl *RotatingLogger) rotate() error {
    // 检查文件大小
    if info, err := os.Stat(rl.filePath); err == nil {
        if info.Size() < rl.maxSize {
            return nil
        }
    }
    
    // 轮转日志文件
    for i := rl.maxBackups - 1; i > 0; i-- {
        oldPath := fmt.Sprintf("%s.%d", rl.filePath, i)
        newPath := fmt.Sprintf("%s.%d", rl.filePath, i+1)
        
        if _, err := os.Stat(oldPath); err == nil {
            os.Rename(oldPath, newPath)
        }
    }
    
    // 移动当前日志文件
    if _, err := os.Stat(rl.filePath); err == nil {
        os.Rename(rl.filePath, fmt.Sprintf("%s.1", rl.filePath))
    }
    
    return nil
}
```

以上实现涵盖了生产部署和优化的主要方面：

1. **配置管理**：分层配置架构、热重载、配置验证
2. **性能优化**：菜单更新优化、数据库优化、内存管理
3. **跨平台打包**：Windows、macOS、Linux 的完整打包方案
4. **错误处理**：统一错误处理、日志系统、故障排查

这些优化措施能够提升应用在生产环境中的稳定性和性能。当然，优化是个持续的过程，需要根据实际情况不断调整。

---

## 附录

### 附录 A：完整项目结构

```
smart-tray-app/
├── main.go                    # 应用入口
├── app/                       # 应用核心模块
│   ├── app.go                # 主应用结构
│   ├── tray.go               # 托盘管理器
│   ├── window.go             # 窗口管理器
│   ├── bridge.go             # 前后端通信桥接
│   └── config.go             # 配置管理
├── config/                    # 配置管理
│   ├── config.go             # 配置结构定义
│   ├── hot_reload.go         # 配置热重载
│   └── validator.go          # 配置验证
├── database/                  # 数据库层
│   ├── folder_db.go          # 文件夹数据库操作
│   ├── bookmark_db.go        # 书签数据库操作
│   └── migrations/           # 数据库迁移
│       ├── 001_init.sql      # 初始化表结构
│       └── 002_add_indexes.sql # 添加索引
├── models/                    # 数据模型
│   ├── folder.go             # 文件夹模型
│   ├── bookmark.go          # 书签模型
│   └── recent_access.go     # 最近访问模型
├── menu/                      # 菜单管理
│   ├── folder_menu.go        # 文件夹菜单
│   ├── bookmark_menu.go      # 书签菜单
│   └── base_menu.go          # 基础菜单
├── watcher/                   # 文件监控
│   ├── folder_watcher.go     # 文件夹监控
│   └── bookmark_watcher.go   # 书签监控
├── utils/                     # 工具函数
│   ├── smart_sort.go         # 智能排序
│   ├── file_utils.go         # 文件操作工具
│   └── url_utils.go          # URL 处理工具
├── performance/               # 性能优化
│   ├── menu_optimizer.go     # 菜单更新优化
│   ├── db_optimizer.go       # 数据库优化
│   └── memory_manager.go     # 内存管理
├── errors/                   # 错误处理
│   ├── app_error.go          # 应用错误定义
│   └── error_handler.go      # 错误处理器
├── logging/                   # 日志系统
│   ├── logger.go             # 日志记录器
│   └── formatter.go          # 日志格式化
├── notifications/             # 通知系统
│   ├── windows.go            # Windows 通知
│   ├── darwin.go             # macOS 通知
│   └── linux.go              # Linux 通知
├── hotkeys/                  # 快捷键管理
│   ├── hotkey_manager.go     # 快捷键管理器
│   └── platform/             # 平台特定实现
│       ├── windows.go
│       ├── darwin.go
│       └── linux.go
├── autostart/                # 自动启动
│   ├── manager.go            # 自动启动管理器
│   └── platform/             # 平台特定实现
│       ├── windows.go
│       ├── darwin.go
│       └── linux.go
├── frontend/                 # 前端代码
│   ├── src/
│   │   ├── components/       # Vue 组件
│   │   │   ├── App.vue
│   │   │   ├── FolderManager.vue
│   │   │   ├── FolderCard.vue
│   │   │   ├── BookmarkManager.vue
│   │   │   ├── BookmarkCard.vue
│   │   │   └── StatusIndicator.vue
│   │   ├── stores/           # Pinia 状态管理
│   │   │   ├── app.js
│   │   │   ├── folders.js
│   │   │   └── bookmarks.js
│   │   ├── utils/            # 前端工具
│   │   │   ├── storage.js
│   │   │   └── api.js
│   │   └── assets/           # 前端资源
│   │       ├── css/
│   │       └── images/
│   └── wailsjs/              # Wails 生成的 JS 绑定
├── assets/                   # 应用资源
│   ├── icon.png             # 托盘图标
│   ├── icon.ico             # Windows 图标
│   ├── icon.icns            # macOS 图标
│   └── sounds/              # 提示音
├── config/                   # 配置文件
│   ├── default.json         # 默认配置
│   └── production.json      # 生产配置
├── scripts/                  # 构建脚本
│   ├── build-windows.sh     # Windows 构建
│   ├── build-macos.sh       # macOS 构建
│   ├── build-linux.sh       # Linux 构建
│   └── installer.nsi        # NSIS 安装脚本
├── docs/                     # 文档
│   ├── README.md
│   ├── INSTALL.md
│   └── API.md
├── tests/                    # 测试
│   ├── unit/                # 单元测试
│   ├── integration/         # 集成测试
│   └── e2e/                 # 端到端测试
├── dist/                     # 构建输出
│   ├── windows/             # Windows 构建产物
│   ├── macos/               # macOS 构建产物
│   └── linux/               # Linux 构建产物
├── go.mod                    # Go 模块文件
├── go.sum                    # Go 依赖校验
├── wails.json                # Wails 配置
├── package.json              # 前端依赖
└── Makefile                  # 构建脚本
```

### 附录 B：依赖清单

#### Go 依赖 (go.mod)

```go
module smart-tray-app

go 1.21

require (
    github.com/getlantern/systray v1.2.2
    github.com/wailsapp/wails/v2 v2.8.0
    github.com/fsnotify/fsnotify v1.7.0
    github.com/mattn/go-sqlite3 v1.14.17
    github.com/MakeNowJust/hotkey v0.0.0-20160803070633-a4f678ae513f
    github.com/rs/zerolog v1.31.0
    github.com/spf13/viper v1.17.0
    github.com/stretchr/testify v1.8.4
    github.com/go-playground/validator/v10 v10.16.0
    github.com/gorilla/websocket v1.5.1
    github.com/sirupsen/logrus v1.9.3
    github.com/urfave/cli/v2 v2.25.7
    github.com/akavel/rsrc v0.10.2
    github.com/josephspurrier/goversioninfo v1.4.0
    github.com/tc-hib/go-winres v0.3.1
    github.com/leaanthony/debme v1.2.1
    github.com/leaanthony/gosod v1.0.3
    github.com/leaanthony/slicer v1.6.0
    github.com/leaanthony/u v1.1.0
    github.com/leaanthony/wincursor v0.1.0
    github.com/pkg/browser v0.0.0-20210911075715-721ad a4cee
    github.com/pkg/errors v0.9.1
    github.com/samber/lo v1.38.1
    github.com/tkrajina/go-reflector v0.5.6
    github.com/wailsapp/go-webview2 v1.0.0
    github.com/wailsapp/mimetype v1.4.3
    golang.org/x/sys v0.15.0
    golang.org/x/text v0.14.0
    gopkg.in/yaml.v3 v3.0.1
)

require (
    github.com/andybalholm/brotli v1.0.5 // indirect
    github.com/atotto/clipboard v0.1.4 // indirect
    github.com/aymanbagabas/go-osc52/v2 v2.0.1 // indirect
    github.com/charmbracelet/lipgloss v0.8.0 // indirect
    github.com/charmbracelet/x/ansi v0.1.4 // indirect
    github.com/charmbracelet/x/input v0.1.0 // indirect
    github.com/charmbracelet/x/term v0.1.0 // indirect
    github.com/charmbracelet/x/windows v0.1.0 // indirect
    github.com/creack/pty v1.1.18 // indirect
    github.com/danieljoos/wincred v1.1.2 // indirect
    github.com/davecgh/go-spew v1.1.1 // indirect
    github.com/erikgeiser/coninput v0.0.0-20210308153227-775f97138821 // indirect
    github.com/fatih/color v1.15.0 // indirect
    github.com/fsnotify/fsnotify v1.7.0 // indirect
    github.com/gabriel-vasile/mimetype v1.4.2 // indirect
    github.com/go-playground/locales v0.14.1 // indirect
    github.com/go-playground/universal-translator v0.18.1 // indirect
    github.com/godbus/dbus/v5 v5.1.0 // indirect
    github.com/google/uuid v1.3.0 // indirect
    github.com/hashicorp/hcl v1.0.0 // indirect
    github.com/leaanthony/go-ansi-parser v1.6.0 // indirect
    github.com/leaanthony/go-common-file v0.0.0-20230602122731-e9d7a336a8ce // indirect
    github.com/leaanthony/go-webview2 v1.0.0 // indirect
    github.com/leaanthony/types v0.1.0 // indirect
    github.com/leodido/go-urn v1.2.4 // indirect
    github.com/lucasb-eyer/go-colorful v1.2.0 // indirect
    github.com/magiconair/properties v1.8.7 // indirect
    github.com/mattn/go-colorable v0.1.13 // indirect
    github.com/mattn/go-isatty v0.0.19 // indirect
    github.com/mattn/go-localereader v0.0.1 // indirect
    github.com/mattn/go-runewidth v0.0.15 // indirect
    github.com/mitchellh/mapstructure v1.5.0 // indirect
    github.com/muesli/ansi v0.1.0 // indirect
    github.com/muesli/cancelreader v0.2.2 // indirect
    github.com/muesli/reflow v0.3.0 // indirect
    github.com/muesli/termenv v0.15.2 // indirect
    github.com/pelletier/go-toml/v2 v2.1.0 // indirect
    github.com/pmezard/go-difflib v1.0.0 // indirect
    github.com/rivo/uniseg v0.4.4 // indirect
    github.com/sagikazarmark/locafero v0.4.0 // indirect
    github.com/sagikazarmark/slog-shim v0.1.0 // indirect
    github.com/sourcegraph/conc v0.3.0 // indirect
    github.com/spf13/afero v1.11.0 // indirect
    github.com/spf13/cast v1.6.0 // indirect
    github.com/spf13/pflag v1.0.5 // indirect
    github.com/subosito/gotenv v1.6.0 // indirect
    github.com/wailsapp/go-webview2 v1.0.0 // indirect
    github.com/xo/terminfo v0.0.0-20220910002029-abceb7e1c41e // indirect
    go.uber.org/atomic v1.9.0 // indirect
    go.uber.org/multierr v1.9.0 // indirect
    golang.org/x/crypto v0.14.0 // indirect
    golang.org/x/exp v0.0.0-20230905200255-921286631fa9 // indirect
    golang.org/x/net v0.17.0 // indirect
    golang.org/x/sync v0.3.0 // indirect
    golang.org/x/xerrors v0.0.0-20220907171357-04be3eba64ea // indirect
    gopkg.in/ini.v1 v1.67.0 // indirect
    gopkg.in/yaml.v2 v2.4.0 // indirect
)
```

#### 前端依赖 (package.json)

```json
{
  "name": "smart-tray-app-frontend",
  "version": "1.0.0",
  "description": "智能托盘应用前端",
  "main": "index.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext .vue,.js,.ts,.jsx,.tsx",
    "lint:fix": "eslint . --ext .vue,.js,.ts,.jsx,.tsx --fix"
  },
  "dependencies": {
    "vue": "^3.3.8",
    "pinia": "^2.1.7",
    "vue-router": "^4.2.5",
    "axios": "^1.6.0",
    "element-plus": "^2.4.2",
    "@element-plus/icons-vue": "^2.1.0",
    "dayjs": "^1.11.10",
    "lodash-es": "^4.17.21",
    "mitt": "^3.0.1"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.4.1",
    "vite": "^4.5.0",
    "eslint": "^8.52.0",
    "eslint-plugin-vue": "^9.17.0",
    "@typescript-eslint/eslint-plugin": "^6.9.1",
    "@typescript-eslint/parser": "^6.9.1",
    "typescript": "^5.2.2",
    "sass": "^1.69.5",
    "unplugin-auto-import": "^0.16.7",
    "unplugin-vue-components": "^0.25.2"
  }
}
```

#### 系统依赖

**Windows:**
- Go 1.21+
- GCC (MinGW-w64)
- NSIS (用于创建安装包)
- Windows 10/11

**macOS:**
- Go 1.21+
- Xcode Command Line Tools
- macOS 10.15+
- 开发者证书（用于代码签名）

**Linux:**
- Go 1.21+
- GCC
- GTK3 开发库
- AppIndicator 库

```bash
# Ubuntu/Debian
sudo apt-get install build-essential libgtk-3-dev libayatana-appindicator3-dev

# CentOS/RHEL
sudo yum install gcc gtk3-devel libayatana-appindicator-gtk3-devel

# Arch Linux
sudo pacman -S gcc gtk3 libayatana-appindicator
```

### 附录 C：常见问题 FAQ

#### 编译相关问题

**Q: 编译时出现 "CGO_ENABLED=0" 错误**

A: systray 库需要 CGO 支持，请确保设置环境变量：
```bash
export CGO_ENABLED=1
```

**Q: Windows 编译时出现 "undefined reference" 错误**

A: 确保安装了 MinGW-w64 并正确配置了环境变量：
```bash
# 检查 GCC 版本
gcc --version

# 设置环境变量
export CC=gcc
export CXX=g++
```

**Q: macOS 编译时出现 "framework not found" 错误**

A: 确保安装了 Xcode Command Line Tools：
```bash
xcode-select --install
```

**Q: Linux 编译时出现 "pkg-config" 错误**

A: 安装必要的开发库：
```bash
sudo apt-get install pkg-config libgtk-3-dev libayatana-appindicator3-dev
```

#### 运行时问题

**Q: 应用启动后托盘图标不显示**

A: 检查以下几点：
1. 确保图标文件存在且格式正确
2. 检查系统托盘是否被禁用
3. 查看应用日志中的错误信息

**Q: 菜单点击无响应**

A: 可能的原因：
1. 事件处理 goroutine 未正确启动
2. 菜单项引用丢失
3. 检查 `ClickedCh` 通道是否正确监听

**Q: 应用无法最小化到托盘**

A: 检查配置：
1. 确保 `CloseToTray` 配置为 true
2. 检查 `beforeClose` 钩子是否正确实现
3. 验证系统托盘权限

#### 性能问题

**Q: 菜单更新缓慢**

A: 优化建议：
1. 使用防抖动机制
2. 实现差量更新
3. 异步加载数据
4. 限制菜单项数量

**Q: 内存使用过高**

A: 检查以下方面：
1. 图标缓存大小
2. goroutine 泄漏
3. 数据库连接池配置
4. 及时释放资源

**Q: 启动速度慢**

A: 优化策略：
1. 异步加载非关键数据
2. 延迟初始化
3. 预编译资源
4. 减少启动时的 I/O 操作

#### 跨平台问题

**Q: 不同平台行为不一致**

A: 解决方案：
1. 使用平台特定的构建标签
2. 实现平台适配层
3. 测试所有目标平台
4. 使用条件编译

**Q: 通知在不同平台显示不同**

A: 实现平台特定的通知：
1. Windows: 使用 Toast Notification
2. macOS: 使用 NSUserNotification
3. Linux: 使用 libnotify

#### 部署问题

**Q: 打包后的应用无法运行**

A: 检查：
1. 依赖库是否正确包含
2. 权限设置是否正确
3. 系统兼容性
4. 代码签名状态

**Q: 自动启动不生效**

A: 平台特定解决方案：
1. Windows: 检查注册表项
2. macOS: 检查 LaunchAgents
3. Linux: 检查 .desktop 文件

### 附录 D：参考资源

#### 官方文档

- [systray 官方文档](https://github.com/getlantern/systray)
- [Wails v2 官方文档](https://wails.io/docs/)
- [Go 官方文档](https://golang.org/doc/)
- [Vue 3 官方文档](https://vuejs.org/)

#### 相关项目

- [fyne](https://github.com/fyne-io/fyne) - Go 跨平台 GUI 框架
- [trayhost](https://github.com/shurcooL/trayhost) - 另一个系统托盘库
- [qt binding](https://github.com/therecipe/qt) - Go Qt 绑定
- [lorca](https://github.com/zserge/lorca) - 使用 Chrome 构建桌面应用

#### 学习资源

- [Go 并发编程](https://golang.org/doc/effective_go.html#concurrency)
- [Vue 3 组合式 API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [系统托盘设计指南](https://developer.apple.com/design/human-interface-guidelines/macos/menus/menu-anatomy/)
- [跨平台开发最佳实践](https://docs.microsoft.com/en-us/windows/win32/uxguide/guidelines/notifications)

#### 社区资源

- [Go 中文网](https://golang.google.cn/)
- [Vue 中文文档](https://cn.vuejs.org/)
- [Wails 中文社区](https://github.com/wailsapp/wails/discussions)
- [systray 问题讨论](https://github.com/getlantern/systray/issues)

#### 工具推荐

- [GoLand](https://www.jetbrains.com/go/) - Go 集成开发环境
- [VS Code](https://code.visualstudio.com/) - 轻量级编辑器
- [Wails CLI](https://wails.io/docs/gettingstarted/installation) - Wails 命令行工具
- [NSIS](https://nsis.sourceforge.io/) - Windows 安装包制作工具

#### 进阶学习

- [Go 并发模式](https://blog.golang.org/pipelines)
- [Vue 3 响应式原理](https://vuejs.org/guide/extras/reactivity-in-depth.html)
- [系统托盘 UX 设计](https://developer.apple.com/design/human-interface-guidelines/macos/menus/menu-anatomy/)
- [跨平台应用架构](https://docs.microsoft.com/en-us/windows/win32/uxguide/guidelines/notifications)

本文从 systray 库的基础使用开始，逐步深入到与 Wails v2 框架的集成，最后通过两个完整的实战项目展示了如何构建功能完整的桌面应用程序。

在实际开发中，systray 库的跨平台特性和简洁 API 能够大大简化系统托盘开发的复杂度。结合 Wails v2 框架，我们可以用 Go + Vue 的技术栈快速构建现代化的桌面应用。当然，跨平台开发总会遇到各种问题，但只要理解了底层原理，大部分问题都能找到解决方案。
