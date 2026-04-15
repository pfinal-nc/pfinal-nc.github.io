---
title: "combineLatest 组合最新值 - RxJS 操作符"
date: 2025-03-09 00:00:00
author: PFinal南丞
description: RxJS combineLatest 操作符，当任意 Observable 发出新值时发出所有 Observable 的最新值组合。
keywords:
  - RxJS
  - combineLatest
  - 操作符
  - 组合
---

# combineLatest

`combineLatest` 操作符组合多个 Observable，当任意一个 Observable 发出新值时，发出所有 Observable 的最新值的组合。

## 示例

```typescript
import { combineLatest, interval } from 'rxjs';
import { map } from 'rxjs/operators';

const timer$ = interval(1000).pipe(map(x => `Timer: ${x}`));
const click$ = fromEvent(document, 'click').pipe(map(x => 'Click'));

combineLatest([timer$, click$]).subscribe(([timer, click]) => {
  console.log(timer, click);
});
```

## 使用场景

当需要根据多个数据源的最新状态来进行计算时非常有用，例如：根据搜索框输入和筛选条件同时过滤列表。
