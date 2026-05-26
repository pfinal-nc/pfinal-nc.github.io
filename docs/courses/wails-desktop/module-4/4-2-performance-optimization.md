---
title: "Lesson 4.2: 性能优化"
description: "启动优化、内存管理、资源压缩"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [course, wails, desktop, performance, lesson]
---

# Lesson 4.2: 性能优化

## 学习目标

- 掌握 Wails 应用性能调优

---

## 1. 启动优化

| 优化项 | 方法 | 效果 |
|--------|------|------|
| 懒加载 | 延迟加载非核心模块 | 缩短首屏时间 |
| 预编译 | 减少运行时编译 | 减少启动延迟 |
| 资源压缩 | 压缩图片和 JS 资源 | 减少加载大小 |

## 2. Go Cache 使用

```go
import "github.com/patrickmn/go-cache"

// 内存缓存，减少重复计算
appCache := cache.New(5*time.Minute, 10*time.Minute)
appCache.Set("processed_data", data, cache.DefaultExpiration)
```

## 推荐阅读

- [提升 Wails 应用性能：探索 Go-Cache 的高效内存缓存方案](/dev/backend/golang/Wails-Go-Cache-Performance)
- [Wails-Tailwind-Development](/dev/backend/golang/Wails-Tailwind-Development)
