---
title: "基于 Wails 的 Mac 桌面应用开发"
description: "详细介绍如何使用 Wails 开发 macOS 原生风格的桌面应用，包括菜单栏、系统托盘、原生对话框等 Mac 特性集成。"
keywords:
  - Wails
  - macOS
  - 桌面应用
  - Mac 开发
  - 系统托盘
author: PFinal南丞
date: 2026-04-22
tags:
  - golang
  - wails
  - macos
  - desktop
---

# 基于 Wails 的 Mac 桌面应用开发

> Wails 不仅支持跨平台，还能充分利用 macOS 原生特性，打造真正的 Mac 应用体验。

## 一、Mac 特性集成

### 1.1 应用菜单

```go
package main

import (
    "github.com/wailsapp/wails/v2/pkg/menu"
    "github.com/wailsapp/wails/v2/pkg/menu/keys"
    "github.com/wailsapp/wails/v2/pkg/runtime"
)

func (a *App) createMenu() *menu.Menu {
    appMenu := menu.NewMenu()
    
    // 应用菜单
    fileMenu := appMenu.AddSubmenu("File")
    fileMenu.AddText("Open", keys.CmdOrCtrl("o"), func(_ *menu.CallbackData) {
        runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{})
    })
    fileMenu.AddSeparator()
    fileMenu.AddText("Quit", keys.CmdOrCtrl("q"), func(_ *menu.CallbackData) {
        runtime.Quit(a.ctx)
    })
    
    // 编辑菜单
    editMenu := appMenu.AddSubmenu("Edit")
    editMenu.AddText("Cut", keys.CmdOrCtrl("x"), nil)
    editMenu.AddText("Copy", keys.CmdOrCtrl("c"), nil)
    editMenu.AddText("Paste", keys.CmdOrCtrl("v"), nil)
    
    // 窗口菜单
    windowMenu := appMenu.AddSubmenu("Window")
    windowMenu.AddText("Minimize", keys.CmdOrCtrl("m"), func(_ *menu.CallbackData) {
        runtime.WindowMinimise(a.ctx)
    })
    
    return appMenu
}
```

### 1.2 系统托盘

```go
package main

import (
    "runtime"
    "github.com/wailsapp/wails/v2/pkg/menu"
    "github.com/wailsapp/wails/v2/pkg/options"
)

func (a *App) createTray() {
    trayMenu := menu.NewMenu()
    trayMenu.AddText("Show", nil, func(_ *menu.CallbackData) {
        runtime.WindowShow(a.ctx)
    })
    trayMenu.AddText("Hide", nil, func(_ *menu.CallbackData) {
        runtime.WindowHide(a.ctx)
    })
    trayMenu.AddSeparator()
    trayMenu.AddText("Quit", nil, func(_ *menu.CallbackData) {
        runtime.Quit(a.ctx)
    })
    
    // 设置系统托盘
    runtime.SetTrayMenu(a.ctx, trayMenu)
}
```

## 二、原生对话框

```go
// 文件选择对话框
func (a *App) SelectFile() (string, error) {
    return runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
        Title: "选择文件",
        Filters: []runtime.FileFilter{
            {DisplayName: "图片", Pattern: "*.png;*.jpg;*.jpeg"},
            {DisplayName: "文档", Pattern: "*.pdf;*.doc;*.docx"},
        },
        ShowHiddenFiles: false,
        CanCreateDirectories: false,
    })
}

// 保存对话框
func (a *App) SaveFileDialog() (string, error) {
    return runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
        Title:           "保存文件",
        DefaultFilename: "untitled.txt",
        Filters: []runtime.FileFilter{
            {DisplayName: "文本文件", Pattern: "*.txt"},
        },
    })
}

// 消息对话框
func (a *App) ShowMessage() {
    runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
        Type:          runtime.InfoDialog,
        Title:         "提示",
        Message:       "操作成功完成",
        Buttons:       []string{"确定"},
        DefaultButton: "确定",
    })
}

// 确认对话框
func (a *App) ShowConfirm() bool {
    selection, _ := runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
        Type:          runtime.QuestionDialog,
        Title:         "确认",
        Message:       "确定要删除吗？",
        Buttons:       []string{"取消", "删除"},
        DefaultButton: "取消",
        CancelButton:  "取消",
    })
    return selection == "删除"
}
```

## 三、窗口控制

```go
// 最小化到 Dock
func (a *App) Minimize() {
    runtime.WindowMinimise(a.ctx)
}

// 全屏
func (a *App) ToggleFullscreen() {
    runtime.WindowToggleFullscreen(a.ctx)
}

// 设置窗口大小
func (a *App) SetSize(width, height int) {
    runtime.WindowSetSize(a.ctx, width, height)
}

// 居中显示
func (a *App) Center() {
    runtime.WindowCenter(a.ctx)
}
```

## 四、Mac 特定配置

```go
func main() {
    app := NewApp()
    
    err := wails.Run(&options.App{
        Title:     "My Mac App",
        Width:     1024,
        Height:    768,
        MinWidth:  800,
        MinHeight: 600,
        
        // Mac 特定选项
        Mac: &mac.Options{
            // 启用标题栏
            TitleBar: &mac.TitleBar{
                TitlebarAppearsTransparent: false,
                HideTitle:                  false,
                HideTitleBar:               false,
                FullSizeContent:            false,
                UseToolbar:                 false,
                HideToolbarSeparator:       true,
            },
            
            // 外观
            Appearance:           mac.NSAppearanceNameAqua,
            WebviewIsTransparent: false,
            
            // 窗口按钮
            WindowCloseMac:  true,
            WindowMiniMac:   true,
            WindowFullMac:   true,
            
            // 关于对话框
            About: &mac.AboutInfo{
                Title:   "My Mac App",
                Message: "© 2024 PFinal. All rights reserved.",
                Icon:    icon,
            },
        },
        
        Bind: []interface{}{
            app,
        },
    })
    
    if err != nil {
        log.Fatal(err)
    }
}
```

## 五、打包发布

```bash
# 构建 Mac 应用
wails build -platform darwin

# 构建 Universal Binary (同时支持 Intel 和 Apple Silicon)
wails build -platform darwin/universal

# 签名和公证（需要 Apple Developer 账号）
codesign --deep --force --verify --verbose --sign "Developer ID" MyApp.app
```

## 六、总结

Wails 让 Mac 应用开发变得简单，同时保持原生体验。通过系统托盘、原生菜单等特性，可以打造真正的 Mac 原生应用。
