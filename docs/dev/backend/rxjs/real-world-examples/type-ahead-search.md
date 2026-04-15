---
title: "Type-Ahead 搜索实战 - RxJS 实战案例"
date: 2025-03-09 00:00:00
author: PFinal南丞
description: RxJS 实战案例，展示如何使用 debounceTime、distinctUntilChanged、switchMap 实现 Type-Ahead 搜索功能。
keywords:
  - RxJS
  - Type-Ahead
  - 搜索
  - debounce
  - switchMap
  - 实战
---

# Type-Ahead 搜索实战

这是一个非常经典的 RxJS 应用场景，它展示了如何使用多个操作符来优雅地处理用户输入。

## 场景

当用户在搜索框中输入时，我们会向服务器发送请求来获取搜索结果。为了避免发送不必要的请求，我们需要：

1.  **防抖 (Debounce)**：只在用户停止输入一段时间后才发送请求。
2.  **去重 (Distinct)**：只有在输入内容改变时才发送请求。
3.  **切换 (Switch)**：当有新的输入时，取消之前的请求，只处理最新的请求。

## 代码实现

```typescript
import { fromEvent } from 'rxjs';
import { ajax } from 'rxjs/ajax';
import { map, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

const input = document.createElement('input');
document.body.appendChild(input);

const search$ = fromEvent(input, 'input').pipe(
  map(event => (event.target as HTMLInputElement).value),
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(searchTerm => ajax.getJSON(`https://api.github.com/search/users?q=${searchTerm}`))
);

search$.subscribe(result => {
  // 处理搜索结果
  console.log(result);
});
```

## 操作符解析

*   `fromEvent`: 从 DOM 事件创建 Observable。
*   `map`: 提取输入框的值。
*   `debounceTime(300)`: 在 300ms 内没有新的输入时才发出值。
*   `distinctUntilChanged()`: 只有当值与上一个值不同时才发出。
*   `switchMap`: 将输入值映射到一个新的 Observable (HTTP 请求)，并取消之前的请求。
