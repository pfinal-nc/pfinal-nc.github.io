---
title: "forkJoin 并行等待 - RxJS 操作符"
date: 2025-03-09 00:00:00
author: PFinal南丞
description: RxJS forkJoin 操作符，类似于 Promise.all，等待所有 Observable 完成后发出最后的一个值。
keywords:
  - RxJS
  - forkJoin
  - 操作符
  - Promise.all
  - 并行
tags:
  - Frontend
  - HTTP
  - JavaScript
  - Operators
  - RxJS
---

# forkJoin

`forkJoin` 操作符组合多个 Observable，类似于 `Promise.all`。它等待所有 Observable 完成后，发出所有 Observable 的最后一个值的组合。

## 示例

```typescript
import { forkJoin, of, interval } from 'rxjs';
import { take, delay } from 'rxjs/operators';

const request1$ = of('Response 1').pipe(delay(1000));
const request2$ = of('Response 2').pipe(delay(500));

forkJoin([request1$, request2$]).subscribe(([res1, res2]) => {
  console.log(res1, res2); // 等所有请求完成后输出
});
```

## 使用场景

用于并行执行多个 HTTP 请求，等待所有请求完成后统一处理结果。
