---
title: "RxJS 测试 - 高级主题"
date: 2025-03-09 00:00:00
author: PFinal南丞
description: RxJS 测试，详解如何使用 TestScheduler 和 marble diagrams 进行测试。
keywords:
  - RxJS
  - 测试
  - TestScheduler
  - marble
tags:
  - Frontend
  - JavaScript
  - RxJS
  - Testing
  - Tools
---

# RxJS 测试

RxJS 提供了强大的测试工具来验证 Observable 的行为。

## 使用 TestScheduler

```typescript
import { TestScheduler } from 'rxjs/testing';

const scheduler = new TestScheduler((actual, expected) => {
  expect(actual).toEqual(expected);
});

scheduler.run(({ cold, expectObservable }) => {
  const source$ = cold('-a--b--c|');
  const expected = '-a--b--c|';
  
  expectObservable(source$).toBe(expected);
});
```

## Marble Diagrams 测试

使用 marble 语法表示时间：

```
-  时间（10ms 帧）
|  完成
#  错误
a-z  发出的值
()   同步发出
```

## 测试示例

```typescript
it('should filter even numbers', () => {
  const source$ = cold('-1-2-3-4-|');
  const expected = '--2--4-|';
  
  expectObservable(source$.pipe(filter(x => x % 2 === 0))).toBe(expected);
});
```
