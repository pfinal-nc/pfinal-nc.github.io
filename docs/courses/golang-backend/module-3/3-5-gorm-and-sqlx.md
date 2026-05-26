---
title: "Lesson 3.5: GORM 与 sqlx"
description: "ORM 选型、性能对比、最佳实践"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, gorm, sqlx, orm, database, lesson]
---

# Lesson 3.5: GORM 与 sqlx

## 学习目标

- 掌握 GORM 的 CRUD 操作和关联查询
- 了解 sqlx 在复杂查询中的优势

---

## 1. GORM 基础

```go
type User struct {
    ID        uint      `gorm:"primaryKey"`
    Name      string    `gorm:"size:100;not null"`
    Email     string    `gorm:"uniqueIndex;size:255"`
    Age       int       `gorm:"default:18"`
    CreatedAt time.Time
    UpdatedAt time.Time
}

// CRUD
db.Create(&user)
db.First(&user, 1)
db.Model(&user).Update("name", "Bob")
db.Delete(&user)
```

### ORM vs 原生 SQL 选择矩阵

| 场景 | 推荐 | 理由 |
|------|------|------|
| 简单 CRUD | GORM | 开发效率高 |
| 复杂查询 JOIN | sqlx | SQL 更直观 |
| 批量操作 | sqlx | 性能更好 |
| 迁移管理 | GORM | AutoMigrate 方便 |

## 推荐阅读

- [gorm-tutorial](/dev/backend/golang/gorm-tutorial)
- [go-database-sql](/dev/backend/golang/go-database-sql)
