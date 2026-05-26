---
title: "Lesson 3.5: 依赖安全"
description: "漏洞扫描、版本锁定、SBOM"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [course, security, dependencies, snyk, sbom, lesson]
---

# Lesson 3.5: 依赖安全

## 学习目标

- 掌握 Go 依赖安全管理

---

## 1. 漏洞扫描工具

```bash
# govulncheck（官方推荐）
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck ./...

# 扫描结果示例
# Vulnerability: GO-2025-XXXX
#   Package: golang.org/x/crypto
#   Risk: HIGH - 存在已知远程代码执行漏洞
#   Fix: 升级至 v0.28.0 或更高版本
```

## 2. 依赖锁定

```go
// go.sum 自动锁定依赖版本（SHA-256 校验）
// 不要手动修改 go.sum

// 定期更新依赖
go get -u ./...        # 更新到最新次要版本
go mod tidy            # 清理未使用的依赖
```

## 最佳实践

- 将 `govulncheck` 集成到 CI/CD
- 订阅 Go 安全公告（security@golang.org）
- 使用 Dependabot 或 Renovate 自动更新
