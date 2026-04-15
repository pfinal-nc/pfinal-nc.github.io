---
title: Subject 主体 - RxJS 核心概念
date: 2025-03-09 00:00:00
author: PFinal南丞
description: 详解 RxJS Subject，BehaviorSubject，ReplaySubject，AsyncSubject 的区别和使用场景。
keywords:
  - RxJS
  - Subject
  - BehaviorSubject
  - ReplaySubject
  - AsyncSubject
  - 多播
  - 状态管理
course:
  name: RxJS 响应式编程实战手册
  module: 1
  lesson: 1.5
tags:
  - Frontend
  - JavaScript
  - Performance
  - Reactive
  - RxJS
---

# Subject 主体

Subject 是一种特殊的 Observable，它可以向多个 Observer 多播值。从技术上讲，**Subject 是一个同时实现了 Observer 和 Observable 接口的对象**。

这意味着 Subject 既可以像 Observer 一样接收值（通过 `next()`, `error()`, `complete()` 方法），也可以像 Observable 一样被订阅。

## Subject 的核心价值：多播

```typescript
import { Subject, from } from 'rxjs';

const subject = new Subject<number>();

subject.subscribe({ next: (v) => console.log(`observerA: ${v}`) });
subject.subscribe({ next: (v) => console.log(`observerB: ${v}`) });

const observable = from([1, 2, 3]);

observable.subscribe(subject); // 你可以将一个单播的 Observable 通过 subject 转换为多播
```

**输出:**

```
observerA: 1
observerB: 1
observerA: 2
observerB: 2
observerA: 3
observerB: 3
```

## 特殊的 Subject 及其应用场景

### 1. BehaviorSubject

*   **核心特性**: 需要一个初始值，并会保存最新的值。当有新的 Observer 订阅时，它会立即收到最新的值。
*   **实战场景**: **状态管理**。`BehaviorSubject` 非常适合用于管理应用中的状态。例如，你可以用它来保存当前登录的用户信息、购物车内容、UI 主题等。

**示例：简单的状态管理**

```typescript
import { BehaviorSubject } from 'rxjs';

// 创建一个初始值为 null 的用户状态
const currentUser$ = new BehaviorSubject<User | null>(null);

// 模拟用户登录
function login(user: User) {
  currentUser$.next(user);
}

// 在应用的任何地方，你都可以订阅 currentUser$ 来获取当前用户状态
currentUser$.subscribe(user => {
  console.log('User changed:', user);
});

// 即使在 login 之后订阅，也能立即获取到最新的用户状态
setTimeout(() => {
  currentUser$.subscribe(user => {
    console.log('Late subscriber:', user);
  });
}, 2000);

login({ name: 'Alice' });
```

### 2. ReplaySubject

*   **核心特性**: 会记录 Observable 执行过程中的多个值，并把它们"重放"给新的订阅者。你可以指定重放多少个值，或者在多长时间内的值。
*   **实战场景**: **缓存**。当你需要缓存一系列事件（例如，最近的几次 WebSocket 消息、用户的操作历史）并提供给后来的订阅者时，`ReplaySubject` 非常有用。

**示例：缓存最近的 3 条消息**

```typescript
import { ReplaySubject } from 'rxjs';

const message$ = new ReplaySubject<string>(3); // 缓存最近的3个值

message$.next('message 1');
message$.next('message 2');
message$.next('message 3');
message$.next('message 4');

// 新的订阅者会收到最近的3条消息
message$.subscribe(msg => {
  console.log(msg);
});

// 输出: message 2, message 3, message 4
```

### 3. AsyncSubject

*   **核心特性**: 只有当 Observable 执行完成 (`complete()`) 时，它才会发出最后一个值给所有的订阅者。
*   **实战场景**: **等待异步操作完成**。当一个操作的结果只有在操作完成时才有意义时，`AsyncSubject` 非常有用。它的行为类似于 Promise，在 `complete()` 时 `resolve` 最后一个值。

**示例：等待异步计算完成**

```typescript
import { AsyncSubject } from 'rxjs';

const result$ = new AsyncSubject<number>();

result$.subscribe(v => console.log(`Subscriber A: ${v}`));

result$.next(1);
result$.next(2);
result$.next(3);

result$.subscribe(v => console.log(`Subscriber B: ${v}`));

result$.next(4);
result$.complete(); // 只有在 complete 后才会发出最后一个值 4

// 输出:
// Subscriber A: 4
// Subscriber B: 4
```
