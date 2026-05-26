---
title: "Lesson 3.1: MySQL 基础与进阶"
description: "数据类型、索引、事务、锁机制完整指南"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, mysql, database, sql, lesson]
---

# Lesson 3.1: MySQL 基础与进阶

## 学习目标

- 理解 InnoDB 存储引擎的核心机制
- 掌握索引设计与 SQL 优化技巧

---

## 1. 索引设计

| 索引类型 | 使用场景 | 性能影响 |
|----------|----------|----------|
| B+Tree（聚簇索引） | 主键查询 | 最优 |
| 二级索引 | 非主键列查询 | 需要回表 |
| 联合索引 | 多条件查询 | 最左前缀原则 |
| 覆盖索引 | 索引包含所有查询列 | 无需回表 |

```sql
-- 联合索引最左前缀原则
CREATE INDEX idx_name_age ON users(name, age);

-- 生效的查询
WHERE name = 'Alice'
WHERE name = 'Alice' AND age = 25

-- 不生效的查询
WHERE age = 25
WHERE age = 25 AND name = 'Alice'  -- (优化器可重排)
```

## 2. 事务与锁

```sql
-- MVCC 机制：每行记录隐藏的 trx_id 和 roll_pointer
-- 事务隔离级别：
--   READ UNCOMMITTED
--   READ COMMITTED (默认)
--   REPEATABLE READ (MySQL 默认)
--   SERIALIZABLE

-- 行锁 vs 表锁
SELECT ... FOR UPDATE  -- 行级排他锁
SELECT ... LOCK IN SHARE MODE  -- 行级共享锁
```

## 推荐阅读

- [MySQL Production Security Hardening Guide 2025](/dev/system/database/MySQL-Production-Security-Hardening-Guide-2025)
