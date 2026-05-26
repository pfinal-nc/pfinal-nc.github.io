---
title: "Project 4: 互动模块"
description: "评论、点赞、收藏"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, project, interaction, comment, like, lesson]
---

# Project 4: 互动模块

## 学习目标

- 实现评论系统和点赞功能

---

## 数据库设计

```sql
-- 评论表（支持嵌套回复）
CREATE TABLE comments (
    id         BIGINT PRIMARY KEY AUTO_INCREMENT,
    article_id BIGINT NOT NULL,
    user_id    BIGINT NOT NULL,
    parent_id  BIGINT DEFAULT NULL,  -- 回复的评论 ID
    content    TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_article (article_id),
    INDEX idx_user (user_id)
);

-- 点赞表
CREATE TABLE likes (
    id         BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id    BIGINT NOT NULL,
    target_id  BIGINT NOT NULL,      -- 被点赞对象 ID
    target_type VARCHAR(20) NOT NULL, -- 'article' 或 'comment'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_target (user_id, target_id, target_type)
);
```

## 实现要点

- **评论**：支持无限嵌套回复（前端控制层级显示）
- **点赞**：唯一约束防止重复点赞；用 Redis 缓存点赞数
- **收藏**：类似点赞设计，区分收藏/取消收藏
- **计数器**：阅读量用 Redis INCR，定期回写 MySQL
