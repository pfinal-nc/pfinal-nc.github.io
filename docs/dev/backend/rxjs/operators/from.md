---
title: "from 创建操作符 - RxJS"
date: 2025-03-09 00:00:00
author: PFinal南丞
description: RxJS from 操作符，从数组、Promise、迭代器等创建 Observable。
keywords:
  - RxJS
  - from
  - 操作符
  - 创建Observable
  - Promise
tags:
  - Frontend
  - JavaScript
  - Operators
  - RxJS
---

# from

`from` 操作符可以从一个数组、类数组对象、Promise、迭代器或 Observable-like 对象创建一个 Observable。

## 示例

### 从数组创建

```typescript
import { from } from 'rxjs';

from([1, 2, 3])
  .subscribe(x => console.log(x));
```

输出结果：

```
1
2
3
```

### 从 Promise 创建

```typescript
import { from } from 'rxjs';

const promise = new Promise(resolve => resolve('Hello World!'));

from(promise)
  .subscribe(x => console.log(x));
```

输出结果：

```
Hello World!
```

### 从字符串创建

```typescript
import { from } from 'rxjs';

from('Hello World')
  .subscribe(x => console.log(x));
```

输出结果：

```
H
e
l
l
o
 
W
o
r
l
d
```
