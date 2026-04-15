---
title: "concat 串联流 - RxJS 操作符"
date: 2025-03-09 00:00:00
author: PFinal南丞
description: RxJS concat 操作符，按顺序依次执行多个 Observable，前一个完成才执行下一个。
keywords:
  - RxJS
  - concat
  - 操作符
  - 串联
---

# concat

`concat` 操作符按顺序依次执行多个 Observable，前一个 Observable 完成后才执行下一个。

## 示例

```typescript
import { concat, of, interval } from 'rxjs';
import { take } from 'rxjs/operators';

const stream1$ = of(1, 2, 3);
const stream2$ = of(4, 5, 6);

concat(stream1$, stream2$).subscribe(console.log);
// 输出: 1, 2, 3, 4, 5, 6
```

## 使用场景

按顺序执行多个任务，例如先登录再获取用户信息。
