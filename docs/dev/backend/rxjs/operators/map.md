---
title: "map 转换操作符 - RxJS"
date: 2025-03-09
author: PFinal南丞
description: RxJS map 操作符详解，对源 Observable 发出的每个值应用投射函数进行转换。
keywords: RxJS, map, 操作符, 转换
---

# map

`map` 操作符对源 Observable 发出的每个值应用一个投射函数，并发出转换后的值。

## 示例

```typescript
import { from } from 'rxjs';
import { map } from 'rxjs/operators';

from([1, 2, 3])
  .pipe(map(x => x * 10))
  .subscribe(x => console.log(x));
```

输出结果：

```
10
20
30
```

## 使用场景

`map` 是最常用的操作符之一，用于转换数据。例如，从一个对象数组中提取一个属性：

```typescript
import { from } from 'rxjs';
import { map } from 'rxjs/operators';

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' },
];

from(users)
  .pipe(map(user => user.name))
  .subscribe(name => console.log(name));
```

输出结果：

```
Alice
Bob
Charlie
```
