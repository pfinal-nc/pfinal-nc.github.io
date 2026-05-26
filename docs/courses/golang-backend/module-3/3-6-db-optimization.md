---
title: "Lesson 3.6: 数据库优化实战"
description: "慢查询分析、执行计划、索引优化、分库分表"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, database, sql, optimization, lesson]
---

# Lesson 3.6: 数据库优化实战

## 学习目标

- 使用 EXPLAIN 分析慢查询
- 掌握常见 SQL 优化技巧

---

## 1. 慢查询分析

```sql
-- 启用慢查询日志（MySQL）
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- 超过 1 秒

-- 分析执行计划
EXPLAIN SELECT * FROM users WHERE email = 'alice@example.com';

-- 关键指标
-- type: ALL（全表扫描）→ index（索引扫描）→ ref（非唯一索引）→ const（唯一索引）
-- rows: 扫描行数
-- Extra: Using filesort（需要优化）
```

## 2. 优化原则

| 问题 | 表现 | 解决方案 |
|------|------|----------|
| 全表扫描 | type=ALL | 添加合适的索引 |
| 排序慢 | Using filesort | 索引排序 |
| 临时表 | Using temporary | 优化 GROUP BY |
| 回表多 | Using index condition | 覆盖索引 |

```go
// Go 中的数据库性能监控
func DBMetrics(db *sql.DB) {
    stats := db.Stats()
    fmt.Printf("Open: %d, InUse: %d, Idle: %d, Wait: %d\n",
        stats.OpenConnections,
        stats.InUse,
        stats.Idle,
        stats.WaitCount,
    )
}
```

## 练习

捕获一个生产环境慢查询，用 EXPLAIN 分析原因并优化。
