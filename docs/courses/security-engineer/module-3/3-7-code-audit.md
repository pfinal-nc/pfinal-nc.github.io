---
title: "Lesson 3.7: 代码审计"
description: "静态分析、模糊测试、漏洞扫描"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [course, security, code-audit, gosec, semgrep, lesson]
---

# Lesson 3.7: 代码审计

## 学习目标

- 掌握 Go 代码审计工具链

---

## 1. 静态分析工具

```bash
# gosec（Go 安全静态分析）
go install github.com/securego/gosec/v2/cmd/gosec@latest
gosec ./...

# 检测示例
# [CWE-798] - Hardcoded credentials
# [CWE-89] - SQL injection
# [CWE-295] - Bad TLS settings

# semgrep（跨语言规则引擎）
semgrep --config=auto .
```

## 2. 模糊测试（Go 1.18+）

```go
func FuzzParseRequest(f *testing.F) {
    f.Add("GET /api/users HTTP/1.1")
    f.Fuzz(func(t *testing.T, data string) {
        req, err := http.ReadRequest(bufio.NewReader(
            strings.NewReader(data),
        ))
        if err == nil {
            // 验证解析结果不会导致安全问题
            if req.URL.Path == "//admin" {
                t.Skip("path normalization needed")
            }
        }
    })
}
```

## 推荐阅读

- [从手动到自动 - Go 语言助力快速识别代码中的安全隐患](/security/engineering/从手动到自动-Go语言助力快速识别代码中的安全隐患)
