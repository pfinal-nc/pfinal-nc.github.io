---
title: "tap 副作用操作符 - RxJS"
date: 2025-03-09 00:00:00
author: PFinal南丞
description: RxJS tap 操作符，用于执行副作用（如日志），不影响流中的数据。
keywords:
  - RxJS
  - tap
  - 操作符
  - 副作用
  - 调试
---

# tap

`tap` 操作符用于执行副作用，例如打印日志或在不影响流的情况下执行其他操作。`tap` 不会修改流中的值。

## 示例

```typescript
import { from } from 'rxjs';
import { tap, map } from 'rxjs/operators';

from([1, 2, 3])
  .pipe(
    tap(x => console.log(`before map: ${x}`)),
    map(x => x * 10),
    tap(x => console.log(`after map: ${x}`))
  )
  .subscribe(x => console.log(`in subscribe: ${x}`));
```

输出结果：

```
before map: 1
after map: 10
in subscribe: 10
before map: 2
after map: 20
in subscribe: 20
before map: 3
after map: 30
in subscribe: 30
```

## 使用场景

`tap` 主要用于调试，你可以在流的任何位置插入 `tap` 来观察流经的数据。
