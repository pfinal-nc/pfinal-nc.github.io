---
title: "自定义操作符 - RxJS 高级主题"
date: 2025-03-09 00:00:00
author: PFinal南丞
description: RxJS 自定义操作符，详解如何创建可复用的管道操作符。
keywords:
  - RxJS
  - 自定义操作符
  - Operators
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
