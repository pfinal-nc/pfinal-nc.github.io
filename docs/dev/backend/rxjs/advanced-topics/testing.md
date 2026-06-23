---
title: "RxJS 单元测试实战 2026：Marble Testing 入门到精通"
date: 2025-03-09 00:00:00
author: PFinal南丞
description: "RxJS Marble Testing 完整指南：TestScheduler、cold/hot marble 区别、Vitest/Jest 集成、复杂场景 7 大模式，企业级 CI 集成"
keywords:
  - RxJS
  - 测试
  - TestScheduler
  - marble
tags:
  - 前端开发
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
