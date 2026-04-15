---
title: Observable 可观察对象 - RxJS 核心概念
date: 2025-03-09 00:00:00
author: PFinal南丞
description: 深入理解 RxJS Observable，详解 Cold vs Hot Observables 的区别，以及如何将 Cold 转换为 Hot。
keywords:
  - RxJS
  - Observable
  - Cold Observable
  - Hot Observable
  - 响应式编程
course:
  name: RxJS 响应式编程实战手册
  module: 1
  lesson: 1.2
---

# Observable 可观察对象

Observable 是 RxJS 的基石。它代表了一个可被调用的未来值或事件的集合。对于资深开发者，可以将其理解为一个**惰性（lazy）的、可取消的、可以发出零个或多个值的异步数据流**。

## Cold vs. Hot Observables

这是 RxJS 中一个至关重要且经常被误解的概念。

### Cold Observables (冷的可观察对象)

**当数据源是在 Observable 内部创建时，这个 Observable 就是冷的。**

*   **懒执行 (Lazy)**: 直到有观察者订阅它，它才开始执行并发出值。
*   **单播 (Unicast)**: 每个订阅者都会收到一个独立的、从头开始的数据流。就像每个人看自己的 DVD 一样，播放进度互不影响。

**示例：**

```typescript
import { Observable } from 'rxjs';

// 数据源（Math.random()）在 Observable 内部
const cold = new Observable(subscriber => {
  subscriber.next(Math.random()));
});

cold.subscribe(a => console.log(`Subscriber A: ${a}`));
cold.subscribe(b => console.log(`Subscriber B: ${b}`));
```

**输出 (值会不同):**

```
Subscriber A: 0.12345
Subscriber B: 0.67890
```

常见的冷 Observable 包括 `of`, `from`, `interval`, `timer` 以及 `ajax` 请求等。

### Hot Observables (热的可观察对象)

**当数据源是在 Observable 外部创建时，这个 Observable 就是热的。**

*   **立即执行 (Eager)**: 无论有无订阅者，它都在持续地发出值。
*   **多播 (Multicast)**: 所有订阅者共享同一个数据源，它们会从订阅的那个时间点开始接收数据。就像收听广播一样，你只能听到你打开收音机之后的内容。

**示例：**

```typescript
import { fromEvent } from 'rxjs';

// 数据源（DOM 事件）在 Observable 外部
const hot = fromEvent(document, 'click');

hot.subscribe(e => console.log(`Subscriber A: ${(e as MouseEvent).clientX}`));

setTimeout(() => {
  hot.subscribe(e => console.log(`Subscriber B: ${(e as MouseEvent).clientX}`));
}, 2000);
```

在这个例子中，`Subscriber B` 在 2 秒后才订阅，它不会收到 2 秒前发生的点击事件。

常见的 Hot Observable 包括 `fromEvent`，以及通过 `Subject` 或 `share()` 操作符转换而来的 Observable。

## 从 Cold 转换为 Hot

使用 `share()` 或其他多播操作符（如 `shareReplay`, `publish`）可以将一个 Cold Observable 转换为 Hot Observable，这在需要多个订阅者共享同一个数据流以避免重复执行副作用（如 HTTP 请求）时非常有用。
