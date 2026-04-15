---
title: Observer 观察者 - RxJS 核心概念
date: 2025-03-09 00:00:00
author: PFinal南丞
description: 详解 RxJS Observer 观察者模式，包含 next、error、complete 三个回调函数的使用方法。
keywords:
  - RxJS
  - Observer
  - 观察者模式
  - subscribe
course:
  name: RxJS 响应式编程实战手册
  module: 1
  lesson: 1.3
---

# Observer 观察者

Observer 是一个消费 Observable 发出的值的对象。它是一个包含三个可选方法（`next`、`error` 和 `complete`）的对象。

*   `next(value)`: 处理 Observable 发出的每个值。
*   `error(err)`: 处理 Observable 发出的错误。
*   `complete()`: 处理 Observable 完成的通知。

```typescript
const observer = {
  next: x => console.log('Observer got a next value: ' + x),
  error: err => console.error('Observer got an error: ' + err),
  complete: () => console.log('Observer got a complete notification'),
};

observable.subscribe(observer);
```

你也可以只传入 `next` 函数作为参数：

```typescript
observable.subscribe(x => console.log('Observer got a next value: ' + x));
```
