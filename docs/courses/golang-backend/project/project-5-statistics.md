---
title: "Project 5: 统计模块"
description: "阅读量、PV/UV、数据可视化"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, project, statistics, analytics, lesson]
---

# Project 5: 统计模块

## 学习目标

- 实现 PV/UV 统计
- 用 ClickHouse 做数据洞察

---

## 统计方案

| 数据类型 | 存储 | 更新频率 | 说明 |
|----------|------|----------|------|
| PV | Redis + MySQL | 实时 | `INCR article:pv:{id}` |
| UV | Redis HyperLogLog | 实时 | `PFADD article:uv:{id} {user_id}` |
| 阅读日志 | ClickHouse | 批量导入 | 分析趋势、热门文章 |
| 用户行为 | Kafka → ClickHouse | 流式 | 留存分析、转化率 |

## Redis + HyperLogLog UV 统计

```go
func RecordUV(ctx context.Context, articleID string, userID string) error {
    key := fmt.Sprintf("article:uv:%s", articleID)
    _, err := redis.PFAdd(ctx, key, userID).Result()
    return err
}

func GetUV(ctx context.Context, articleID string) (int64, error) {
    key := fmt.Sprintf("article:uv:%s", articleID)
    return redis.PFCount(ctx, key).Result()
}
```
