---
title: "HTTP 请求处理实战 - RxJS 实战案例"
date: 2025-03-09 00:00:00
author: PFinal南丞
description: RxJS 实战案例，展示如何使用 ajax 处理 HTTP 请求，包含错误处理重试策略和请求依赖。
keywords:
  - RxJS
  - HTTP
  - ajax
  - retry
  - 请求处理
tags:
  - AI
  - Frontend
  - Git
  - HTTP
  - JavaScript
  - RxJS
---

# HTTP 请求处理实战

RxJS 的 `ajax` 模块可以让你以 Observable 的方式处理 HTTP 请求。这使得处理复杂的请求场景（如取消请求、重试）变得非常简单。

## 基本用法

```typescript
import { ajax } from 'rxjs/ajax';

const users$ = ajax.getJSON('https://api.github.com/users');

users$.subscribe(
  users => console.log(users),
  err => console.error(err)
);
```

## 高级错误处理：使用 `retryWhen` 实现指数退避

简单的 `retry(3)` 在很多场景下并不够用。如果一个服务暂时宕机，立即重试 3 次很可能会全部失败。更优雅的策略是"指数退避"：每次重试前等待更长的时间，给服务器恢复的机会。

`retryWhen` 是一个强大的操作符，它让你能够根据错误流来决定是否以及何时进行重试。

**示例：**

```typescript
import { ajax } from 'rxjs/ajax';
import { retryWhen, mergeMap, delay, tap } from 'rxjs/operators';
import { of, throwError, timer } from 'rxjs';

export const genericRetryStrategy = ({
  maxRetryAttempts = 3,
  scalingDuration = 1000,
  excludedStatusCodes = []
}: {
  maxRetryAttempts?: number,
  scalingDuration?: number,
  excludedStatusCodes?: number[]
} = {}) => (attempts: Observable<any>) => {
  return attempts.pipe(
    mergeMap((error, i) => {
      const retryAttempt = i + 1;
      if (
        retryAttempt > maxRetryAttempts ||
        excludedStatusCodes.find(e => e === error.status)
      ) {
        return throwError(error);
      }
      console.log(
        `Attempt ${retryAttempt}: retrying in ${retryAttempt * scalingDuration}ms`
      );
      return timer(retryAttempt * scalingDuration);
    }),
  );
};

// 使用
ajax.getJSON('/api/endpoint-that-fails').pipe(
  retryWhen(genericRetryStrategy({
    maxRetryAttempts: 4,
    scalingDuration: 2000,
    excludedStatusCodes: [400, 404]
  }))
).subscribe(
  result => console.log(result),
  error => console.error('Request ultimately failed:', error)
);
```

## 请求依赖

假设你需要先获取一个用户的 ID，然后再获取该用户的详细信息。

```typescript
import { ajax } from 'rxjs/ajax';
import { switchMap } from 'rxjs/operators';

const user$ = ajax.getJSON('https://api.github.com/users/1').pipe(
  switchMap(user => ajax.getJSON(`https://api.github.com/users/${user.id}/repos`))
);

user$.subscribe(repos => console.log(repos));
```
