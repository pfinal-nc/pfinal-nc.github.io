---
title: "of 创建操作符 - RxJS"
date: 2025-03-09 00:00:00
author: PFinal南丞
description: RxJS of 操作符，依次发出任意数量的值然后完成。
keywords:
  - RxJS
  - of
  - 操作符
  - 创建Observable
---

# of

`of` 操作符创建一个 Observable，它会依次发出你提供的任意数量的值，然后完成。

## 示例

```typescript
import { of } from 'rxjs';

of(1, 2, 3, 4, 5)
  .subscribe(x => console.log(x));
```

输出结果：

```
1
2
3
4
5
```

## 使用场景

`of` 操作符通常用于创建简单的 Observable，用于测试或组合其他 Observable。
