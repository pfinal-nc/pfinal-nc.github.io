---
title: "mergeMap 并发映射 - RxJS 操作符"
date: 2025-03-09 00:00:00
author: PFinal南丞
description: 详解 RxJS mergeMap 操作符，包含弹珠图、并发请求示例以及并发控制。
keywords:
  - RxJS
  - mergeMap
  - flatMap
  - 操作符
  - 并发
  - HTTP请求
---

# mergeMap (又名 flatMap)

`mergeMap` 是一个高阶映射操作符，它将源 Observable 发出的每个值映射成一个新的 Observable（所谓的"内部 Observable"），然后将所有这些内部 Observable **并发地**合并到输出 Observable 中。

**核心行为：并发处理**

`mergeMap` 会立即订阅所有由它创建的内部 Observable，并将它们的值按照到达的顺序合并到输出流中。它不关心值的顺序，只关心尽快完成所有工作。

可以把它想象成一个任务分发中心，每来一个任务（源值），就立即派一个新的工人（内部 Observable）去处理，所有工人同时工作，谁先完成谁就先汇报结果（输出值）。

## 弹珠图

```
source:      --a---------b---------c--|
            map(v => ----v1---v2|)

result:      ----a1---a2--b1---b2--c1---c2|
```

## 示例：并发处理多个请求

假设你有一个 ID 列表，你需要为每个 ID 调用一个 API 来获取详细信息。

```typescript
import { from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { ajax } from 'rxjs/ajax';

const userIds$ = from([1, 2, 3]);

const users$ = userIds$.pipe(
  mergeMap(id => ajax.getJSON(`https://api.example.com/users/${id}`))
);

// 所有请求会并发进行
// 最终的结果顺序是不确定的，取决于哪个请求先返回
users$.subscribe(user => console.log(user));
```

## 何时使用？

当你需要对流中的每个值进行一个异步操作，并且这些操作可以**并发执行**，且不关心它们的完成顺序时，`mergeMap` 是最佳选择。

*   处理多个并发的上传或下载任务。
*   对一个事件流（如点击）触发一个或多个独立的异步操作。

## 注意：并发控制

`mergeMap` 默认是完全并发的，这可能会导致问题（例如，同时向上百个 ID 发起请求，导致服务器过载）。它有一个可选的第二个参数 `concurrent`，可以用来限制同时活动的内部 Observable 的数量。

```typescript
// 最多同时处理 5 个请求
userIds$.pipe(
  mergeMap(id => ajax.getJSON(`.../${id}`), 5)
).subscribe(...);
```
