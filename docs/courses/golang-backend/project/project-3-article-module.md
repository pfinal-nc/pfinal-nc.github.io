---
title: "Project 3: 文章模块"
description: "CRUD、标签分类、全文搜索"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, project, article, crud, lesson]
---

# Project 3: 文章模块

## 学习目标

- 实现文章 CRUD 和搜索功能

---

## 核心技术点

| 功能 | 技术方案 |
|------|----------|
| 文章存储 | GORM + MySQL/PostgreSQL |
| 全文搜索 | Elasticsearch / PostgreSQL tsvector |
| 标签系统 | 多对多关联表 |
| 分页 | 游标分页（cursor-based）|

## 游标分页实现

```go
type CursorPage struct {
    Cursor  string `json:"cursor" form:"cursor"`
    Limit   int    `json:"limit" form:"limit" binding:"max=100"`
}

func (r *ArticleRepository) List(ctx context.Context, cursor string, limit int) ([]model.Article, string, error) {
    var articles []model.Article
    query := r.db.WithContext(ctx).
        Model(&model.Article{}).
        Order("id DESC").
        Limit(limit + 1)

    if cursor != "" {
        query = query.Where("id < ?", cursor)
    }

    result := query.Find(&articles)

    var nextCursor string
    if len(articles) > limit {
        nextCursor = strconv.Itoa(articles[limit-1].ID)
        articles = articles[:limit]
    }

    return articles, nextCursor, result.Error
}
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/articles | 文章列表（分页） |
| POST | /api/v1/articles | 创建文章 |
| GET | /api/v1/articles/:id | 文章详情 |
| PUT | /api/v1/articles/:id | 更新文章 |
| DELETE | /api/v1/articles/:id | 删除文章 |
| GET | /api/v1/articles/search | 全文搜索 |
