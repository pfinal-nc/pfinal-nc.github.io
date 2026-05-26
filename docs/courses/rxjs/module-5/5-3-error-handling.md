---
title: "Lesson 5.3: 错误处理"
description: "catchError、retry、retryWhen"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [course, rxjs, error-handling, retry, lesson]
---

# Lesson 5.3: 错误处理

## 学习目标

- 掌握 RxJS 的错误处理策略

---

## 1. 错误处理操作符

```typescript
import { catchError, retry, retryWhen, delay, take } from 'rxjs/operators';

// catchError：捕获错误，返回备用 Observable
http$.pipe(
    catchError(err => {
        console.error('Request failed:', err);
        return of(defaultData); // 降级数据
    })
);

// retry：失败后重试 N 次
http$.pipe(
    retry(3) // 最多重试 3 次
);

// retryWhen：自定义重试策略
http$.pipe(
    retryWhen(errors =>
        errors.pipe(
            delay(1000),      // 每次重试等待 1s
            take(3)           // 最多重试 3 次
        )
    )
);
```

## 2. 策略选择

| 场景 | 推荐策略 | 说明 |
|------|----------|------|
| 网络抖动 | `retry(3)` | 简单重试 |
| 表单提交 | `retryWhen + delay` | 指数退避 |
| 数据降级 | `catchError` | 使用缓存/默认值 |
| 致命错误 | 不捕获 | 向上传播错误 |
