---
title: Docker 容器化最佳实践：从开发到生产
date: 2026-04-24
category: devops
tags:
  - Docker
  - 容器化
  - DevOps
  - 最佳实践
description: 全面讲解 Docker 容器化最佳实践，涵盖镜像构建优化、多阶段构建、安全加固、编排部署等生产级应用场景。
---

# Docker 容器化最佳实践：从开发到生产

Docker 已经成为现代软件部署的标准。本文从实际工程出发，讲解如何正确使用 Docker 构建生产级容器。

## Dockerfile 最佳实践

### 多阶段构建（Multi-stage Build）

```dockerfile
# Go 应用多阶段构建
# 阶段 1：构建
FROM golang:1.22-alpine AS builder

WORKDIR /app

# 先复制依赖文件（利用缓存层）
COPY go.mod go.sum ./
RUN go mod download

# 再复制源码
COPY . .

# 构建静态二进制
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-w -s" \
    -o /app/server \
    ./cmd/server

# 阶段 2：运行时（最小镜像）
FROM scratch

# 复制证书（HTTPS 请求需要）
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# 复制二进制
COPY --from=builder /app/server /server

# 设置非 root 用户
USER 65534:65534

EXPOSE 8080

ENTRYPOINT ["/server"]
```

```dockerfile
# Node.js 应用多阶段构建
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules

USER nextjs
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### 镜像层优化

```dockerfile
# ❌ 不好的做法：每条 RUN 创建一个层
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y git
RUN rm -rf /var/lib/apt/lists/*

# ✅ 合并 RUN 命令，减少层数
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        git && \
    rm -rf /var/lib/apt/lists/*

# ✅ 充分利用构建缓存：变化少的放前面
FROM python:3.11-slim

WORKDIR /app

# 依赖先复制（变化少，缓存命中率高）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 源码后复制（变化频繁）
COPY . .

CMD ["python", "app.py"]
```

### .dockerignore

```dockerignore
# 版本控制
.git
.gitignore

# 文档
*.md
docs/

# 开发工具
.env
.env.*
*.log

# 测试
*_test.go
test/
__tests__/
coverage/

# 构建产物
dist/
build/
node_modules/
vendor/

# IDE
.vscode/
.idea/
*.swp

# Docker 本身
Dockerfile*
docker-compose*
```

## docker-compose 生产配置

```yaml
# docker-compose.prod.yml
version: "3.9"

services:
  app:
    image: myapp:${VERSION:-latest}
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_URL=redis://redis:6379
    env_file:
      - .env.prod
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 128M
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    networks:
      - app-network

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
      - nginx-logs:/var/log/nginx
    depends_on:
      - app
    networks:
      - app-network

volumes:
  postgres-data:
  redis-data:
  nginx-logs:

networks:
  app-network:
    driver: bridge
```

## 安全加固

### 使用非 root 用户

```dockerfile
FROM ubuntu:22.04

# 创建专用用户
RUN groupadd -r appgroup && \
    useradd -r -g appgroup -d /app -s /sbin/nologin appuser

WORKDIR /app

COPY --chown=appuser:appgroup . .

# 切换到非 root 用户
USER appuser

CMD ["./app"]
```

### 镜像安全扫描

```bash
# 使用 Trivy 扫描镜像漏洞
trivy image myapp:latest

# 只报告 HIGH 和 CRITICAL 级别漏洞
trivy image --severity HIGH,CRITICAL myapp:latest

# 在 CI 中失败
trivy image --exit-code 1 --severity CRITICAL myapp:latest
```

### 最小化攻击面

```dockerfile
# 使用 distroless 镜像（没有 shell）
FROM gcr.io/distroless/base-debian11

COPY --from=builder /app/server /server

USER nonroot:nonroot

ENTRYPOINT ["/server"]
```

## 常用运维命令

```bash
# 查看容器资源使用
docker stats

# 查看容器日志（最近 100 行，实时跟踪）
docker logs -f --tail 100 container_name

# 进入运行中的容器
docker exec -it container_name sh

# 查看容器详情
docker inspect container_name

# 清理未使用的资源
docker system prune -af --volumes

# 强制重建（不使用缓存）
docker-compose build --no-cache

# 滚动更新
docker-compose up -d --no-deps --build app
```

## 健康检查与优雅停机

```go
// Go 应用：实现健康检查和优雅停机
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    mux := http.NewServeMux()
    
    // 健康检查端点
    mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusOK)
        w.Write([]byte(`{"status":"ok"}`))
    })
    
    srv := &http.Server{
        Addr:    ":8080",
        Handler: mux,
    }
    
    // 启动服务器
    go func() {
        if err := srv.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatalf("服务启动失败: %v", err)
        }
    }()
    
    log.Println("服务启动，监听 :8080")
    
    // 等待停止信号
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit
    
    log.Println("开始优雅停机...")
    
    // 给 30 秒处理剩余请求
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    
    if err := srv.Shutdown(ctx); err != nil {
        log.Fatalf("强制停机: %v", err)
    }
    
    log.Println("服务已停止")
}
```

## 总结

Docker 生产最佳实践：

| 实践 | 说明 |
|------|------|
| 多阶段构建 | 减小镜像体积，分离构建和运行环境 |
| 非 root 用户 | 降低安全风险 |
| 健康检查 | 确保容器真正就绪后才接受流量 |
| 资源限制 | 防止单个容器耗尽主机资源 |
| 日志管理 | 配置日志轮转，避免磁盘撑满 |
| 镜像扫描 | CI/CD 中集成安全扫描 |
| 优雅停机 | 处理完在途请求后再停止 |
