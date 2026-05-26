---
title: "Lesson 4.1: 微服务架构设计"
description: "单体 vs 微服务、拆分原则、DDD 入门"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, microservices, ddd, architecture, lesson]
---

# Lesson 4.1: 微服务架构设计

## 学习目标

- 理解微服务架构的优缺点
- 掌握服务拆分的原则

---

## 1. 何时拆分微服务

| 场景 | 建议 |
|------|------|
| 团队 < 10 人 | 保持单体，先做模块化 |
| 频繁独立部署需求 | 拆分独立服务 |
| 不同模块资源需求差异大 | 按资源需求拆分 |
| 技术栈异构 | 自然边界拆分 |

## 2. 拆分原则（DDD 限界上下文）

```
用户上下文 → User Service
订单上下文 → Order Service
支付上下文 → Payment Service
库存上下文 → Inventory Service
通知上下文 → Notification Service
```

## 推荐阅读

- [高质量 Golang 后端的现代软件工程原则](/thinking/method/Modern-Go-Backend-Engineering)
- [microservices-architecture](/dev/backend/golang/microservices-architecture)
