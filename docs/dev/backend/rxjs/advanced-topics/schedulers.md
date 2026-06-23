---
title: "RxJS Scheduler 实战 2026：async / animationFrame / queue 选型"
date: 2025-03-09 00:00:00
author: PFinal南丞
description: "RxJS Scheduler 完整指南：7 大调度器对比 + 性能调优 + 动画场景实战，附 Web Worker 与 Signal 集成的现代实践"
keywords:
  - RxJS
  - Scheduler
  - 调度器
  - 异步
tags:
  - 前端开发
  - JavaScript
  - Performance
  - RxJS
---

# 调度器 Schedulers

调度器控制何时何地执行订阅和发送通知。

## 调度器类型

*   **queueScheduler**: 在当前事件循环中同步执行
*   **asyncScheduler**: 使用 setTimeout 异步执行
*   **asapScheduler**: 使用 Promise.then 微任务执行
*   **animationFrameScheduler**: 在下一个 animation frame 执行

## 使用示例

```typescript
import { of, queueScheduler } from 'rxjs';

queueScheduler.schedule(() => {
  of(1, 2, 3).subscribe(x => console.log(x));
});
```

通常不需要手动指定调度器，但在处理并发问题时调度器非常有用。
