---
title: "Lesson 1.1: 为什么需要 RxJS"
description: "异步编程演进、回调地狱、Promise 局限"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [course, rxjs, reactive-programming, async, lesson]
---

# Lesson 1.1: 为什么需要 RxJS

## 学习目标

- 理解响应式编程解决的问题
- 知道何时使用 RxJS

---

## 异步编程演进

```
回调 (Callback)      →   Promise        →   RxJS（Observable）
   回调地狱           .then 链式调用        Pipe 操作符链
   错误处理混乱         .catch 统一处理       retry/catchError
   无法取消            无法取消              unsubscribe()
   单值返回            单值返回              多值流
```

## 什么时候用 RxJS

| 场景 | 适合 RxJS | 替代方案 |
|------|-----------|----------|
| 单次 HTTP 请求 | ❌ | Promise / async-await |
| 搜索输入防抖 | ✅ | 原生也需要复杂逻辑 |
| WebSocket 数据流 | ✅ | RxJS 天然适合 |
| 多事件源合并 | ✅ | 原生事件处理复杂 |
| 简单定时器 | ❌ | setInterval |

## 推荐阅读

- [RxJS 实战手册：简介](/dev/backend/rxjs/introduction/introduction)
