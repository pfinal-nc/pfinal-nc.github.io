---
title: "Lesson 4.1: 应用打包与分发"
description: "Windows MSI、macOS DMG、Linux AppImage"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [course, wails, desktop, packaging, cross-platform, lesson]
---

# Lesson 4.1: 应用打包与分发

## 学习目标

- 掌握 Wails 应用的多平台打包

---

## 1. Wails 构建命令

```bash
# 开发模式
wails dev

# 生产构建
wails build

# 平台特定构建
wails build -platform windows/amd64
wails build -platform darwin/universal
wails build -platform linux/amd64
```

## 2. 打包格式

| 平台 | 格式 | 工具 |
|------|------|------|
| Windows | MSI | wails build + wix |
| macOS | DMG | hdiutil |
| Linux | AppImage | appimagetool |

## 推荐阅读

- [基于 Wails 的 Mac 桌面应用开发](/dev/backend/golang/Wails-Mac-Development)
