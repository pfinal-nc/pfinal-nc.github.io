---
title: "Lesson 1.1: 安全基线"
description: "最小化安装、用户权限、文件权限"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [course, security, linux, hardening, lesson]
---

# Lesson 1.1: 安全基线

## 学习目标

- 掌握 Linux 服务器安全基线配置

---

## 1. 最小化安装原则

| 原则 | 操作 | 说明 |
|------|------|------|
| 最小服务 | 只安装必需包 | 减少攻击面 |
| 最小用户 | 只创建必要用户 | Redis、Nginx 用独立用户 |
| 最小权限 | 遵循 least privilege | root 不是默认用户 |
| 最小暴露 | 关闭不用的端口 | 默认 deny |

## 2. 文件权限

```bash
# 配置文件权限
chmod 600 /etc/ssh/sshd_config  # 只有 root 可读写
chmod 700 /etc/ssl/private       # 私钥目录
find / -perm -4000 2>/dev/null   # 查找所有 SUID 文件

# umask 设置（防止新建文件权限过大）
echo "umask 027" >> /etc/profile
```

## 相关文章

- [linux-security-hardening](/security/engineering/linux-security-hardening)
- [SSH 安全加固完全指南](/security/engineering/SSH安全加固完全指南)
