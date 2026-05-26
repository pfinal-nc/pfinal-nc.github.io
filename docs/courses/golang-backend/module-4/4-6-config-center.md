---
title: "Lesson 4.6: 配置中心"
description: "环境变量、ConfigMap、Apollo、Viper 实践"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, microservices, config, lesson]
---

# Lesson 4.6: 配置中心

## 学习目标

- 理解配置管理的最佳实践

---

## 1. 配置分层

| 层次 | 方法 | 适用场景 |
|------|------|----------|
| 编译配置 | 常量 | 基础设施相关 |
| 环境变量 | os.Getenv | 部署配置 |
| 配置文件 | Viper | 业务配置 |
| 配置中心 | Apollo/etcd | 动态配置 |

### Viper 使用

```go
// 支持 YAML/JSON/TOML，支持远程配置
v := viper.New()
v.SetConfigName("config")
v.AddConfigPath(".")
v.AutomaticEnv()
v.ReadInConfig()

dbHost := v.GetString("database.host")
dbPort := v.GetInt("database.port")
```

## 配置原则

- 代码与配置分离
- 敏感信息用环境变量或 Secret
- 配置变更可追溯
