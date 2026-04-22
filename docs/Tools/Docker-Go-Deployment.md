---
title: "Docker 部署 Go 项目实践指南"
description: "详细介绍如何使用 Docker 容器化部署 Go 项目，包括多阶段构建、镜像优化、Compose 配置等最佳实践。"
keywords:
  - Docker
  - Go
  - 容器化
  - 部署
  - 多阶段构建
author: PFinal南丞
date: 2026-04-22
tags:
  - docker
  - golang
  - deployment
  - container
---

# Docker 部署 Go 项目实践指南

> Docker 让 Go 应用部署变得简单可靠。本文介绍容器化部署的完整流程。

## 一、基础 Dockerfile

### 1.1 多阶段构建

```dockerfile
# 构建阶段
FROM golang:1.24-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装依赖
RUN apk add --no-cache git

# 复制依赖文件
COPY go.mod go.sum ./
RUN go mod download

# 复制源代码
COPY . .

# 构建应用
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# 运行阶段
FROM alpine:latest

# 安装 CA 证书
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# 从构建阶段复制二进制文件
COPY --from=builder /app/main .

# 暴露端口
EXPOSE 8080

# 运行应用
CMD ["./main"]
```

### 1.2 镜像优化

```dockerfile
# 使用更小的基础镜像
FROM gcr.io/distroless/static:nonroot

# 复制二进制文件
COPY --from=builder /app/main /main

# 使用非 root 用户
USER nonroot:nonroot

EXPOSE 8080

ENTRYPOINT ["/main"]
```

## 二、Docker Compose 配置

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=postgres
      - DB_PASSWORD=secret
      - DB_NAME=myapp
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - postgres
      - redis
    networks:
      - app-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - app-network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - app-network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

## 三、构建与部署

### 3.1 构建镜像

```bash
# 构建
docker build -t myapp:latest .

# 多平台构建
docker buildx build --platform linux/amd64,linux/arm64 -t myapp:latest .

# 使用 BuildKit
DOCKER_BUILDKIT=1 docker build -t myapp:latest .
```

### 3.2 运行容器

```bash
# 运行
docker run -d -p 8080:8080 --name myapp myapp:latest

# 使用环境变量
docker run -d -p 8080:8080 \
  -e DB_HOST=localhost \
  -e DB_PORT=5432 \
  --name myapp myapp:latest

# 挂载配置
docker run -d -p 8080:8080 \
  -v $(pwd)/config.yaml:/app/config.yaml \
  --name myapp myapp:latest
```

### 3.3 Docker Compose 部署

```bash
# 启动
docker-compose up -d

# 重建
docker-compose up -d --build

# 停止
docker-compose down

# 查看日志
docker-compose logs -f app
```

## 四、生产环境优化

### 4.1 安全配置

```dockerfile
# 使用非 root 用户
RUN adduser -D -u 1000 appuser
USER appuser

# 只读文件系统
read_only: true

# 限制资源
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 512M
    reservations:
      cpus: '0.5'
      memory: 256M
```

### 4.2 健康检查

```go
// health.go
package main

import (
    "net/http"
    "github.com/gin-gonic/gin"
)

func healthCheck(c *gin.Context) {
    // 检查数据库连接
    if err := db.Ping(); err != nil {
        c.JSON(503, gin.H{"status": "unhealthy", "error": err.Error()})
        return
    }
    
    c.JSON(200, gin.H{"status": "healthy"})
}
```

## 五、CI/CD 集成

```yaml
# .github/workflows/docker.yml
name: Docker Build

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Docker Hub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          ${{ secrets.DOCKER_USERNAME }}/myapp:latest
          ${{ secrets.DOCKER_USERNAME }}/myapp:${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
```

## 六、总结

| 优化点 | 策略 |
|--------|------|
| 镜像大小 | 多阶段构建 + distroless |
| 安全性 | 非 root 用户 + 只读文件系统 |
| 性能 | 资源限制 + 健康检查 |
| 部署 | Docker Compose + CI/CD |

Docker 让 Go 应用部署标准化，提高开发运维效率。
