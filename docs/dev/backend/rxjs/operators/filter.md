---
title: "filter 过滤操作符 - RxJS"
date: 2025-03-09 00:00:00
author: PFinal南丞
description: RxJS filter 操作符详解，只发出满足指定谓词函数的值。
keywords:
  - RxJS
  - filter
  - 操作符
  - 过滤
---

# filter

`filter` 操作符只发出源 Observable 中满足指定谓词函数的值。

## 示例

```typescript
import { from } from 'rxjs';
import { filter } from 'rxjs/operators';

from([1, 2, 3, 4, 5])
  .pipe(filter(x => x % 2 === 0))
  .subscribe(x => console.log(x));
```

输出结果：

```
2
4
```

## 使用场景

`filter` 用于从一个流中筛选出你感兴趣的值。例如，只处理有效的用户输入：

```typescript
import { fromEvent } from 'rxjs';
import { filter, map } from 'rxjs/operators';

const input = document.createElement('input');
document.body.appendChild(input);

fromEvent(input, 'input')
  .pipe(
    map(event => (event.target as HTMLInputElement).value),
    filter(value => value.length > 2)
  )
  .subscribe(value => console.log(value));
```
