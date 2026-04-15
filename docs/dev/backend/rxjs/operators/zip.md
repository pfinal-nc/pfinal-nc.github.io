---
title: "zip 配对组合 - RxJS 操作符"
date: 2025-03-09 00:00:00
author: PFinal南丞
description: RxJS zip 操作符，将多个 Observable 的值按顺序配对组合。
keywords:
  - RxJS
  - zip
  - 操作符
  - 配对
tags:
  - Frontend
  - JavaScript
  - Operators
  - RxJS
---

# zip

`zip` 操作符将多个 Observable 的值按顺序配对组合。它会等待所有 Observable 都发出一个值后，将这些值作为一个数组发出。

## 示例

```typescript
import { zip, interval } from 'rxjs';
import { map, take } from 'rxjs/operators';

const timer1$ = interval(1000).pipe(take(3), map(x => x + 1));
const timer2$ = interval(1000).pipe(take(3), map(x => x + 'a'));

zip(timer1$, timer2$).subscribe(([num, letter]) => {
  console.log(num, letter);
});
// 输出: 1a, 2a, 3a
```

## 使用场景

按索引配对多个数据源，例如将用户名和头像URL配对。
