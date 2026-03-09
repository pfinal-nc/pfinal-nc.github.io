---
title: "状态管理实战 - RxJS 实战案例"
date: 2025-03-09
author: PFinal南丞
description: RxJS 实战案例，展示如何使用 BehaviorSubject 实现简单的状态管理。
keywords: RxJS, 状态管理, BehaviorSubject, 实战
---

# 状态管理实战

使用 RxJS 可以实现简洁的状态管理。

## 使用 BehaviorSubject

```typescript
import { BehaviorSubject } from 'rxjs';

interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  notifications: Notification[];
}

const initialState: AppState = {
  user: null,
  theme: 'light',
  notifications: []
};

const state$ = new BehaviorSubject<AppState>(initialState);

// 获取当前状态
const currentState = state$.value;

// 更新状态
state$.next({
  ...currentState,
  theme: 'dark'
});

// 订阅状态变化
state$.subscribe(state => {
  console.log('State changed:', state);
});
```

## 在 React/Angular 中使用

可以在组件的 ngOnInit 中订阅状态，在 ngOnDestroy 中取消订阅（使用 takeUntil）。
