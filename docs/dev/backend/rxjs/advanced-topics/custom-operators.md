---
title: "RxJS 自定义操作符实战 2026：5 种模式彻底掌握冷热流转换"
date: 2025-03-09 00:00:00
author: PFinal南丞
description: "RxJS 自定义操作符 5 种生产模式完全指南：monoType / operatorFunction / pipe 组合 + Marble Testing，附 hot-cold 转换实战"
keywords:
  - RxJS
  - 自定义操作符
  - Operators
tags:
  - 前端开发
  - JavaScript
  - Operators
  - RxJS
---

# 自定义操作符

RxJS 允许你创建自定义操作符来封装可复用的逻辑。

## 使用 pipe 函数创建

```typescript
import { pipe } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export const myCustomOperator = pipe(
  filter(x => x > 0),
  map(x => x * 2)
);

// 使用
source$.pipe(myCustomOperator).subscribe();
```

## 使用函数创建操作符

```typescript
import { Observable } from 'rxjs';

export function myOperator() {
  return (source: Observable<any>) => new Observable(observer => {
    return source.subscribe({
      next(value) {
        // 处理 value
        observer.next(value);
      },
      error(err) {
        observer.error(err);
      },
      complete() {
        observer.complete();
      }
    });
  });
}
```
