---
title: "Lesson 3.2: PostgreSQL 实战"
description: "高级特性、JSONB、全文检索、性能调优"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, postgresql, database, lesson]
---

# Lesson 3.2: PostgreSQL 实战

## 学习目标

- 掌握 PostgreSQL 的核心高级特性
- 了解 Go 中的 PostgreSQL 最佳实践

---

## 1. PostgreSQL 核心优势

| 特性 | 说明 |
|------|------|
| **JSONB** | 二进制 JSON 存储，支持索引和查询 |
| **全文检索 (TSVector)** | 内置全文搜索，无需 Elasticsearch |
| **数组/范围类型** | 原生支持，避免关联表开销 |
| **CTE (WITH 查询)** | 递归查询，适用于树形结构 |
| **并行查询** | 自动利用多核 CPU |
| **逻辑复制** | 数据同步、实时迁移 |

```go
// Go 中使用 pgx（推荐替代 database/sql）
import "github.com/jackc/pgx/v5/pgxpool"

pool, _ := pgxpool.New(ctx, "postgres://user:pass@localhost:5432/db")
defer pool.Close()

// JSONB 查询
rows, _ := pool.Query(ctx, "SELECT data->>'name' FROM items WHERE data @> '{\"type\": \"article\"}'::jsonb")
```

## 推荐阅读

- [PostgreSQL Performance Optimization Guide](/dev/system/database/PostgreSQL-Performance-Optimization-Guide)
- [PostgreSQL Security Best Practices 2025](/dev/system/database/PostgreSQL-Security-Best-Practices-2025)
