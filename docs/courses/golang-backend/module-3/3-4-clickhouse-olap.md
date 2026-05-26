---
title: "Lesson 3.4: ClickHouse OLAP"
description: "列式存储、物化视图、查询优化"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, clickhouse, olap, database, lesson]
---

# Lesson 3.4: ClickHouse OLAP

## 学习目标

- 理解列式存储与行式存储的区别
- 掌握 ClickHouse 的适用场景

---

## 1. 列式存储原理

行式存储（MySQL/PostgreSQL）vs 列式存储（ClickHouse）：

```
行存: 1: A, B, C | 2: D, E, F  → 适合 OLTP（增删改查）
列存: A: 1,2 | B: 3,4 | C: 5,6  → 适合 OLAP（聚合分析）
```

ClickHouse 的优势场景：
- 日志分析（每秒百万行写入）
- 时序数据（监控指标）
- BI 报表（大表聚合查询）

## 练习

阅读 [ClickHouse 实战：从入门到高性能 OLAP 查询](/dev/backend/golang/ClickHouse-OLAP-Guide)，回答：
- ClickHouse 的 MergeTree 表引擎如何工作？
- 物化视图与普通视图有什么区别？
