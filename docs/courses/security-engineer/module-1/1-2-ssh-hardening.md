---
title: "Lesson 1.2: SSH 安全加固"
description: "密钥认证、暴力破解防护、fail2ban"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [course, security, ssh, hardening, lesson]
---

# Lesson 1.2: SSH 安全加固

## 学习目标

- 实现 SSH 多层次安全防护

---

## 推荐配置

```bash
# /etc/ssh/sshd_config
Port 2222                          # 修改默认端口
PermitRootLogin no                 # 禁止 root 登录
PasswordAuthentication no          # 禁用密码，仅密钥
PubkeyAuthentication yes
MaxAuthTries 3                     # 最大认证尝试
ClientAliveInterval 300            # 客户端保活检测
ClientAliveCountMax 2
AllowUsers alice bob               # 白名单用户
```

```bash
# fail2ban 保护 SSH
# /etc/fail2ban/jail.local
[sshd]
enabled = true
port = 2222
maxretry = 3
bantime = 3600
findtime = 600
```

## 推荐阅读

- [SSH Security Hardening Guide 2025](/security/engineering/SSH-Security-Hardening-Guide-2025)
