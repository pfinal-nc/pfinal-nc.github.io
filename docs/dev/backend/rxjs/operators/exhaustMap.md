---
title: "exhaustMap 耗尽映射 - RxJS 操作符"
date: 2025-03-09 00:00:00
author: PFinal南丞
description: RxJS exhaustMap 操作符，当内部 Observable 执行完成前忽略所有新值，防止重复提交。
keywords:
  - RxJS
  - exhaustMap
  - 操作符
  - 防止重复提交
tags:
  - AI
  - Frontend
  - HTTP
  - JavaScript
  - Operators
  - Performance
---

# exhaustMap

`exhaustMap` 是这四个高阶映射操作符中比较特殊的一个。它将源 Observable 发出的每个值映射成一个新的内部 Observable，但**只有当上一个内部 Observable 完成后，它才会处理下一个源值**。如果在一个内部 Observable 正在执行时，源 Observable 发出了新的值，这些新值将被**忽略**。

**核心行为：忽略并等待**

`exhaustMap` 的行为就像一个忙碌的工人。当他正在处理一个任务时，他会完全忽略任何新来的任务。只有当他手头的工作完成后，他才会去接下一个新任务。

## 弹珠图

```
source:      --a----b----c--|
            map(v => --v1--v2|)

// a 对应的内部 Observable 正在执行时，b 被忽略了
// a 对应的内部 Observable 完成后，c 才被处理

result:      ----a1--a2----c1--c2|
```

## 示例：防止重复提交

这是一个 `exhaustMap` 的经典用例。想象一个登录按钮，我们希望在用户点击后，发起一个登录请求。在这个请求完成之前，我们希望忽略用户的任何后续点击，以防止重复提交表单。

```typescript
import { fromEvent } from 'rxjs';
import { exhaustMap, tap } from 'rxjs/operators';
import { ajax } from 'rxjs/ajax';

const loginButton = document.getElementById('login');

fromEvent(loginButton, 'click').pipe(
  tap(() => console.log('Button clicked, attempting to log in...')),
  exhaustMap(() => {
    const credentials = getCredentials(); 
    return ajax.post('/api/login', credentials);
  })
).subscribe(
  response => console.log('Login successful:', response),
  error => console.error('Login failed:', error)
);
```

在这个例子中，用户第一次点击按钮时，`exhaustMap` 会发起一个登录请求。在这个请求返回响应（成功或失败）之前，无论用户再点击多少次按钮，`tap` 会打印日志，但 `exhaustMap` 会忽略这些点击，不会发起新的登录请求。这是一种非常简单而有效的防止重复提交的方法。

## 何时使用？

当你希望在一个异步操作完成前，忽略所有来自源 Observable 的新值时，`exhaustMap` 是完美的选择。

*   **防止重复提交**：登录、保存、提交等按钮的点击事件。
*   **处理一次性触发的动画**：开始一个动画，在动画结束前忽略所有其他触发信号。

## 四大高阶操作符总结

| 操作符 | 行为 | 场景比喻 | 核心用途 |
| :--- | :--- | :--- | :--- |
| `mergeMap` | **并发**，来一个处理一个 | 任务分发中心 | 处理可以并发进行的异步任务 |
| `concatMap` | **排队**，按顺序处理 | 纪律严明的队列 | 保证异步任务的顺序性 |
| `switchMap` | **切换**，只关心最新的 | 喜新厌旧 | 处理只关心最新结果的场景（如搜索） |
| `exhaustMap` | **忽略**，直到当前任务完成 | 忙碌的工人 | 防止重复触发（如点击） |
