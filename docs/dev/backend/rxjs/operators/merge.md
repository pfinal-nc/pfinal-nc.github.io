---
title: "merge 合并流 - RxJS 操作符"
date: 2025-03-09
author: PFinal南丞
description: RxJS merge 操作符，将多个 Observable 合并为一个，按时间顺序发出所有值。
keywords: RxJS, merge, 操作符, 合并
---

# merge

`merge` 操作符将多个 Observable 合并为一个，按时间顺序发出所有 Observable 的值。

## 示例

```typescript
import { merge, interval } from 'rxjs';
import { map, take } from 'rxjs/operators';

const timer1$ = interval(1000).pipe(take(3), map(x => `Timer1: ${x}`));
const timer2$ = interval(500).pipe(take(3), map(x => `Timer2: ${x}`));

merge(timer1$, timer2$).subscribe(console.log);
```

## 使用场景

合并多个数据源，例如同时监听多个事件流。
