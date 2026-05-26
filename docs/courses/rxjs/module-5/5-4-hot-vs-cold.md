---
title: "Lesson 5.4: 热 Observable vs 冷 Observable"
description: "区别、转换、应用场景"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [course, rxjs, observable, hot-cold, lesson]
---

# Lesson 5.4: 热 Observable vs 冷 Observable

## 学习目标

- 理解热/冷 Observable 的核心区别

---

## 1. 核心区别

| 特性 | 冷 Observable | 热 Observable |
|------|---------------|---------------|
| 订阅时 | 每个订阅者独立获得数据流 | 共享现有数据流 |
| 类比 | YouTube 视频（每次从头播放） | 直播（从当前开始） |
| 创建时机 | 订阅时创建 | 订阅前已经存在 |
| 常用操作符 | `of`, `from`, `interval` | `fromEvent`, `Subject` |

```typescript
// 冷 Observable：每个订阅者独立
const cold$ = interval(1000);
cold$.subscribe(v => console.log('A:', v)); // 从 0 开始
setTimeout(() => cold$.subscribe(v => console.log('B:', v)), 3000); // 也从 0 开始

// 热 Observable：共享数据流
const hot$ = fromEvent(document, 'click'); // 点击事件是共享的
```

## 2. 热/冷转换

```typescript
// 冷 → 热：使用 share
const shared$ = cold$.pipe(share());
// 第一个订阅者触发数据流，后续订阅者共享

// 防止回溯：使用 shareReplay
const replayed$ = cold$.pipe(shareReplay(1));
// 后续订阅者立即获得最新值
```
