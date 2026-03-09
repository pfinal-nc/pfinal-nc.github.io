---
title: "switchMap 切换映射 - RxJS 操作符"
date: 2025-03-09
author: PFinal南丞
description: 详解 RxJS switchMap 操作符，包含弹珠图、Type-Ahead 搜索示例以及使用场景和注意事项。
keywords: RxJS, switchMap, 操作符, Type-Ahead, 搜索, 异步
---

# switchMap

`switchMap` 是另一个高阶映射操作符。它将源 Observable 发出的每个值映射成一个新的内部 Observable，但它只关心**最新**的那个。当源发出一个新值时，`switchMap` 会立即**取消**前一个内部 Observable 的订阅，并订阅新的内部 Observable。

**核心行为：切换并取消**

`switchMap` 的行为就像一个喜新厌旧的人。一旦有新的兴趣点（源值）出现，它会立即抛弃旧的（取消订阅），然后专注于新的。这使得它在处理那些"只关心最新结果"的场景中非常有用。

## 弹珠图

```
source:      --a----b----c--|
            map(v => --v1--v2|)

// a 对应的内部 Observable 在 b 出现时被取消
// b 对应的内部 Observable 在 c 出现时被取消

result:      ----a1--b1--c1--c2|
```

## 示例：Type-Ahead 搜索框

这是 `switchMap` 最经典的用例。当用户在搜索框中快速输入时，我们只关心最后一次输入对应的搜索结果，之前的搜索请求都应该被取消。

```typescript
import { fromEvent } from 'rxjs';
import { switchMap, debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { ajax } from 'rxjs/ajax';

const searchInput = document.getElementById('search');

const search$ = fromEvent(searchInput, 'input').pipe(
  map(event => (event.target as HTMLInputElement).value),
  debounceTime(300), // 防抖
  distinctUntilChanged(), // 去重
  switchMap(searchTerm => 
    ajax.getJSON(`https://api.github.com/search/users?q=${searchTerm}`)
  )
);

search$.subscribe(results => console.log(results));
```

在这个流程中，如果用户在 300ms 内输入了新的字符，`debounceTime` 会阻止流继续。当用户停止输入后，`switchMap` 会发起一个 HTTP 请求。如果在该请求完成前，用户又输入了新的内容，`switchMap` 会自动取消前一个未完成的请求，并发起一个新的请求。这完美地避免了网络资源的浪费和处理过期的搜索结果。

## 何时使用？

当你只关心源 Observable 最新值所对应的结果时，`switchMap` 是不二之选。

*   **Type-ahead 搜索**
*   **取消操作**：例如，一个"取消"按钮的点击流可以 `switchMap` 到一个空的 Observable 来中断一个正在进行的操作。
*   **UI 交互**：在一个可拖拽的元素上，`mousedown` 事件可以 `switchMap` 到 `mousemove` 事件流，并在 `mouseup` 时通过 `takeUntil` 停止。

## 警告

不要在那些**不能被取消**的写操作（如 POST, PUT, DELETE 请求）中使用 `switchMap`。因为如果源快速发出新值，`switchMap` 可能会取消一个已经发出去但尚未收到响应的写操作，导致你无法知道该操作是否在后端成功执行，从而造成数据不一致。在这种情况下，应该使用 `mergeMap` 或 `concatMap`。
