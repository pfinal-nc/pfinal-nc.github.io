---
title: "Lesson 3.3: Redis 缓存设计"
description: "数据结构、持久化、集群、缓存策略实战"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, redis, caching, lesson]
---

# Lesson 3.3: Redis 缓存设计

## 学习目标

- 掌握 Redis 核心数据结构和应用场景
- 设计高效的缓存策略

---

## 1. 数据结构与应用

| 类型 | 底层实现 | 典型场景 |
|------|----------|----------|
| String | SDS | 缓存、计数器、分布式锁 |
| Hash | dict + ziplist | 对象存储（用户信息） |
| List | quicklist | 消息队列、最新消息 |
| Set | intset + dict | 标签、去重、交集/并集 |
| ZSet | ziplist + skiplist | 排行榜、延迟队列 |

## 2. 缓存策略

```go
// Cache-Aside 模式（最常用）
func GetUser(ctx context.Context, id string) (*User, error) {
    // 1. 查缓存
    val, err := redis.Get(ctx, "user:"+id).Result()
    if err == nil {
        user := &User{}
        json.Unmarshal([]byte(val), user)
        return user, nil
    }

    // 2. 未命中，查数据库
    user, err := db.GetUser(id)
    if err != nil {
        return nil, err
    }

    // 3. 写入缓存（设置过期时间）
    data, _ := json.Marshal(user)
    redis.Set(ctx, "user:"+id, data, 30*time.Minute)

    return user, nil
}
```

## 3. 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 缓存穿透 | 查不存在的数据 | 布隆过滤器 / 缓存空值 |
| 缓存雪崩 | 大量 key 同时过期 | 过期时间加随机值 |
| 缓存击穿 | 热点 key 过期 | 互斥锁 / 永不过期 |

## 推荐阅读

- [go-redis-practice](/dev/backend/golang/go-redis-practice)
