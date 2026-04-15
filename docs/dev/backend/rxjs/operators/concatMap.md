---
title: "concatMap 串联映射 - RxJS 操作符"
date: 2025-03-09 00:00:00
author: PFinal南丞
description: 详解 RxJS concatMap 操作符，与 mergeMap、switchMap 的对比，以及顺序执行的使用场景。
keywords:
  - RxJS
  - concatMap
  - 操作符
  - 顺序执行
  - HTTP请求
---

# concatMap

`concatMap` 是另一个高阶映射操作符。它将源 Observable 发出的每个值映射成一个新的内部 Observable，然后按顺序**连接**（concat）这些内部 Observable。它会等待前一个内部 Observable **完成**后，才订阅并执行下一个。

**核心行为：排队处理**

`concatMap` 就像一个纪律严明的任务队列。它严格按照源值发出的顺序来处理任务，一次只处理一个，前一个不完成，后一个绝不开始。这保证了操作的顺序性。

## 弹珠图

```
source:      --a----b----c--|
            map(v => --v1--v2|)

// a 对应的内部 Observable 执行完后，才开始执行 b 对应的

result:      ----a1--a2--b1--b2--c1--c2|
```

## 示例：顺序保存用户设置

假设用户在界面上快速地进行了一系列设置更改，每次更改都需要调用一个 API 来保存。为了保证后端数据的最终一致性，我们希望这些保存请求是按顺序执行的，即使用户的操作非常快。

```typescript
import { fromEvent } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';
import { ajax } from 'rxjs/ajax';

const saveButton = document.getElementById('save');

// 假设 setting$ 是一个发出用户设置对象的流
const setting$ = fromEvent(saveButton, 'click').pipe(map(() => getSettingsFromUI()));

setting$.pipe(
  concatMap(settings => ajax.post('/api/settings', settings))
).subscribe(
  () => console.log('Settings saved successfully'),
  err => console.error('Save failed:', err)
);
```

在这个例子中，即使用户在第一个保存请求完成前连续点击了多次"保存"，`concatMap` 也会将这些请求放入一个队列中，确保它们一个接一个地被发送和处理，从而避免了潜在的竞态条件（race conditions）。

## 何时使用？

当你需要保证异步操作的**顺序性**时，`concatMap` 是你的首选。

*   **顺序执行写操作**：对于 POST, PUT, DELETE 等需要保证顺序的 HTTP 请求。
*   **任务队列**：处理需要按顺序完成的一系列任务。
*   **依赖性操作**：当下一个操作依赖于上一个操作的完成时（虽然 `concatMap` 不直接传递结果，但保证了执行时机）。

## concatMap vs mergeMap vs switchMap

*   `mergeMap`: **并发**执行，不保证顺序。
*   `concatMap`: **顺序**执行，排队处理。
*   `switchMap`: **只关心最新**的，取消之前的。

选择哪个操作符，取决于你希望如何处理当源 Observable 发出新值时，内部 Observable 的行为。
