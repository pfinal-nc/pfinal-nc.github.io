---
title: "使用 Devslog 结构化日志处理"
description: "介绍 Devslog 结构化日志库的使用方法，包括日志格式化、级别控制、性能优化等实战技巧。"
keywords:
  - Devslog
  - 结构化日志
  - 日志处理
  - Go 日志
  - 日志库
author: PFinal南丞
date: 2026-04-22
tags:
  - golang
  - logging
  - devslog
  - structured-logging
---

# 使用 Devslog 结构化日志处理

> Devslog 是一个高性能的 Go 结构化日志库，提供丰富的日志格式化和处理功能。

## 一、Devslog 简介

### 1.1 特点

- 高性能异步日志写入
- 结构化 JSON 日志
- 多级日志级别
- 日志轮转和压缩
- 自定义字段和标签

### 1.2 安装

```bash
go get github.com/pfinal/devslog
```

## 二、基础使用

### 2.1 快速开始

```go
package main

import (
    "github.com/pfinal/devslog"
)

func main() {
    // 创建 logger
    logger := devslog.New(devslog.Config{
        Level:      devslog.InfoLevel,
        Output:     "stdout",
        Format:     "json",
        TimeFormat: "2006-01-02 15:04:05",
    })
    
    // 使用 logger
    logger.Info("application started",
        devslog.String("version", "1.0.0"),
        devslog.String("env", "production"),
    )
    
    logger.Error("database connection failed",
        devslog.Error(err),
        devslog.String("host", "localhost"),
        devslog.Int("port", 5432),
    )
}
```

### 2.2 日志级别

```go
const (
    DebugLevel Level = iota
    InfoLevel
    WarnLevel
    ErrorLevel
    FatalLevel
)

// 使用不同级别
logger.Debug("debug information", devslog.String("detail", "..."))
logger.Info("normal operation")
logger.Warn("potential issue", devslog.String("reason", "..."))
logger.Error("operation failed", devslog.Error(err))
logger.Fatal("critical error", devslog.Error(err)) // 会退出程序
```

## 三、高级配置

### 3.1 文件输出

```go
logger := devslog.New(devslog.Config{
    Level:  devslog.InfoLevel,
    Output: "file",
    FileConfig: &devslog.FileConfig{
        Filename:   "./logs/app.log",
        MaxSize:    100, // MB
        MaxBackups: 10,
        MaxAge:     30, // days
        Compress:   true,
    },
})
```

### 3.2 多输出

```go
logger := devslog.New(devslog.Config{
    Level: devslog.InfoLevel,
    Outputs: []devslog.Output{
        {
            Type: "stdout",
            Format: "console",
        },
        {
            Type: "file",
            Format: "json",
            FileConfig: &devslog.FileConfig{
                Filename: "./logs/app.json",
            },
        },
    },
})
```

### 3.3 自定义字段

```go
// 创建带默认字段的 logger
logger := devslog.New(devslog.Config{
    Level: devslog.InfoLevel,
    DefaultFields: []devslog.Field{
        devslog.String("service", "user-service"),
        devslog.String("version", "1.0.0"),
    },
})

// 所有日志都会包含这些字段
logger.Info("request processed") 
// 输出: {"service":"user-service","version":"1.0.0","msg":"request processed"}
```

## 四、上下文集成

### 4.1 从 Context 获取 Logger

```go
func init() {
    // 设置全局 logger
    devslog.SetDefault(devslog.New(devslog.Config{
        Level:  devslog.InfoLevel,
        Output: "stdout",
    }))
}

func handler(ctx context.Context) {
    // 从 context 获取 logger
    logger := devslog.FromContext(ctx)
    
    logger.Info("handling request",
        devslog.String("trace_id", trace.GetTraceID(ctx)),
    )
}
```

### 4.2 添加 Context 字段

```go
func middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()
        
        // 添加字段到 context
        ctx = devslog.WithFields(ctx,
            devslog.String("request_id", generateRequestID()),
            devslog.String("user_id", getUserID(r)),
        )
        
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

## 五、性能优化

### 5.1 异步写入

```go
logger := devslog.New(devslog.Config{
    Level:      devslog.InfoLevel,
    AsyncWrite: true,
    BufferSize: 10000, // 缓冲区大小
})

// 确保优雅关闭
defer logger.Flush()
```

### 5.2 采样

```go
logger := devslog.New(devslog.Config{
    Level: devslog.DebugLevel,
    Sampler: &devslog.RateSampler{
        Rate: 0.1, // 10% 采样
    },
})
```

### 5.3 条件日志

```go
// 只在特定条件下记录
if logger.IsDebugEnabled() {
    // 昂贵的操作只在 debug 级别执行
    logger.Debug("detailed info",
        devslog.String("data", expensiveOperation()),
    )
}
```

## 六、集成示例

### 6.1 Gin 中间件

```go
func LoggerMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        
        logger := devslog.New(devslog.Config{
            Level:  devslog.InfoLevel,
            Output: "stdout",
        })
        
        c.Next()
        
        logger.Info("http request",
            devslog.String("method", c.Request.Method),
            devslog.String("path", c.Request.URL.Path),
            devslog.Int("status", c.Writer.Status()),
            devslog.Duration("latency", time.Since(start)),
            devslog.String("client_ip", c.ClientIP()),
        )
    }
}
```

### 6.2 错误处理

```go
func handleError(err error, logger *devslog.Logger) {
    var appErr *AppError
    if errors.As(err, &appErr) {
        logger.Error("application error",
            devslog.Error(err),
            devslog.String("code", appErr.Code),
            devslog.String("message", appErr.Message),
            devslog.Stack(appErr.Stack),
        )
    } else {
        logger.Error("unexpected error",
            devslog.Error(err),
            devslog.Stack(debug.Stack()),
        )
    }
}
```

## 七、总结

| 特性 | 说明 |
|------|------|
| 结构化 | JSON 格式，便于解析 |
| 高性能 | 异步写入，缓冲机制 |
| 灵活 | 多输出，自定义字段 |
| 易用 | 简洁 API，上下文集成 |

Devslog 是 Go 项目中处理结构化日志的优秀选择。
