---
title: "Lesson 3.4: 安全随机数"
description: "crypto/rand vs math/rand 的正确使用"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [course, security, golang, cryptography, random, lesson]
---

# Lesson 3.4: 安全随机数

## 学习目标

- 区分安全与非安全随机数

---

## 对比

```go
// ❌ 不安全：math/rand（伪随机、可预测）
import "math/rand"
token := rand.Int63()  // 线性同余生成器，不适合安全场景

// ✅ 安全：crypto/rand（真随机、不可预测）
import "crypto/rand"
func generateToken() (string, error) {
    bytes := make([]byte, 32)
    _, err := rand.Read(bytes)
    if err != nil {
        return "", err
    }
    return hex.EncodeToString(bytes), nil
}
```

| 特性 | math/rand | crypto/rand |
|------|-----------|-------------|
| 随机性 | 伪随机 | 密码学安全 |
| 可预测性 | 已知种子可预测 | 不可预测 |
| 性能 | 快 | 较慢 |
| 用途 | 模拟、游戏 | Token、密钥、密码 |
