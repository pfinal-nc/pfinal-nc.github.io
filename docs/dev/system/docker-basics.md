---
title: "Docker 基础入门：从零开始掌握容器化技术"
date: 2026-04-21 10:00:00
author: PFinal南丞
description: "全面讲解 Docker 核心概念：镜像、容器、Dockerfile、网络、数据卷，以及 Docker Compose 多容器编排，带你从零掌握现代容器化开发。"
keywords:
  - Docker 入门
  - Docker 教程
  - Dockerfile
  - Docker Compose
  - 容器化技术
tags:
  - devops
  - docker
  - tutorial
---

# Docker 基础入门：从零开始掌握容器化技术

> Docker 让"在我本地好好的"成为历史。通过容器技术，你可以确保应用在开发、测试、生产环境中完全一致地运行。

**DevOps 学习路径：**
- [Kubernetes 基础入门](./kubernetes-basics.md) - 容器编排进阶
- [Docker 部署 Go 项目实践指南](../../tools/Docker部署Go项目实践指南.md) - Go 项目容器化
- [GitOps 实战：从应用部署到全生命周期管理](../backend/golang/GitOps实战：从应用部署到全生命周期管理.md) - 现代化部署流程
- [Nginx 配置文件详解](../../tools/Nginx配置文件详解.md) - 反向代理配置

## 一、核心概念

```
Docker 生态三要素：

  镜像 (Image)          容器 (Container)         仓库 (Registry)
  ┌─────────────┐       ┌─────────────────┐      ┌───────────────┐
  │  只读模板    │  run  │  镜像的运行实例  │ push │  存储分发镜像  │
  │  类似类定义  │──────▶│  类似类的实例   │──────▶│  Docker Hub  │
  └─────────────┘       └─────────────────┘      └───────────────┘
```

---

## 二、安装 Docker

```bash
# macOS
brew install --cask docker

# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 验证安装
docker --version
docker run hello-world
```

---

## 三、常用命令速查

### 镜像管理

```bash
# 拉取镜像
docker pull nginx:1.25
docker pull golang:1.24-alpine

# 查看本地镜像
docker images
docker image ls

# 删除镜像
docker rmi nginx:1.25
docker image rm nginx:1.25

# 构建镜像
docker build -t myapp:1.0 .
docker build -t myapp:1.0 -f Dockerfile.prod .

# 镜像标签
docker tag myapp:1.0 registry.example.com/myapp:1.0

# 推送到仓库
docker push registry.example.com/myapp:1.0

# 查看镜像详情
docker inspect nginx:1.25

# 查看镜像层
docker history nginx:1.25
```

### 容器管理

```bash
# 运行容器
docker run nginx                         # 前台运行
docker run -d nginx                      # 后台运行（detach）
docker run -d -p 8080:80 nginx          # 端口映射 宿主:容器
docker run -d --name my-nginx nginx     # 指定容器名
docker run --rm nginx                    # 运行完自动删除

# 交互式运行
docker run -it ubuntu:22.04 /bin/bash

# 查看运行中的容器
docker ps
docker container ls

# 查看所有容器（包括停止的）
docker ps -a

# 停止/启动/重启容器
docker stop my-nginx
docker start my-nginx
docker restart my-nginx

# 删除容器
docker rm my-nginx
docker rm -f my-nginx         # 强制删除运行中的容器

# 进入运行中的容器
docker exec -it my-nginx /bin/bash
docker exec -it my-nginx sh   # alpine 用 sh

# 查看容器日志
docker logs my-nginx
docker logs -f my-nginx       # 实时跟踪
docker logs --tail 100 my-nginx

# 查看容器资源使用
docker stats
docker stats my-nginx

# 复制文件
docker cp my-nginx:/etc/nginx/nginx.conf ./nginx.conf
docker cp ./nginx.conf my-nginx:/etc/nginx/nginx.conf
```

---

## 四、Dockerfile 编写

### 常用指令

```dockerfile
# 基础镜像
FROM golang:1.24-alpine AS builder

# 维护者信息
LABEL maintainer="pfinal@example.com"

# 设置工作目录
WORKDIR /app

# 复制文件（优先复制 go.mod 利用缓存）
COPY go.mod go.sum ./
RUN go mod download

# 复制源码
COPY . .

# 执行命令
RUN go build -o server ./cmd/server

# 设置环境变量
ENV GIN_MODE=release
ENV PORT=8080

# 暴露端口（文档说明，不实际绑定）
EXPOSE 8080

# 挂载点
VOLUME ["/app/logs", "/app/uploads"]

# 容器启动命令
CMD ["./server"]

# 或者使用 ENTRYPOINT（更推荐）
ENTRYPOINT ["./server"]
CMD ["--config", "/app/config.yaml"]
```

### 多阶段构建（推荐）

```dockerfile
# 阶段1：构建
FROM golang:1.24-alpine AS builder

RUN apk add --no-cache git ca-certificates
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server

# 阶段2：运行（极小镜像）
FROM scratch

# 复制 SSL 证书（HTTPS 请求需要）
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# 只复制编译好的二进制文件
COPY --from=builder /app/server /server

EXPOSE 8080
ENTRYPOINT ["/server"]
```

镜像大小对比：
- `golang:1.24` → **约 800MB**
- 多阶段构建后 → **约 15MB**（小 50 倍！）

### .dockerignore

```
.git
.gitignore
*.md
.env
.env.*
docker-compose*.yml
Makefile
*.log
/tmp
/uploads
node_modules
```

---

## 五、数据卷（Volumes）

```bash
# 创建具名卷
docker volume create mydata

# 挂载具名卷
docker run -d -v mydata:/var/lib/mysql mysql:8.0

# 挂载宿主目录（绑定挂载）
docker run -d -v $(pwd)/data:/var/lib/mysql mysql:8.0

# 只读挂载
docker run -d -v $(pwd)/config:/app/config:ro nginx

# 查看卷
docker volume ls
docker volume inspect mydata

# 删除卷
docker volume rm mydata
docker volume prune  # 删除未使用的卷
```

---

## 六、网络

```bash
# 查看网络
docker network ls

# 创建自定义网络
docker network create mynet

# 将容器加入网络（同网络的容器可以用容器名通信）
docker run -d --network mynet --name mysql mysql:8.0
docker run -d --network mynet --name api myapp:1.0

# 容器间通信（通过容器名）
# api 容器可以直接访问 mysql:3306

# 查看网络详情
docker network inspect mynet
```

---

## 七、Docker Compose（多容器编排）

### docker-compose.yml 示例（Go + MySQL + Redis + Nginx）

```yaml
version: '3.9'

services:
  # Go API 服务
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: myapp-api
    restart: unless-stopped
    environment:
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_USER=root
      - DB_PASSWORD=secret
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    ports:
      - "8080:8080"
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    networks:
      - backend

  # MySQL 数据库
  mysql:
    image: mysql:8.0
    container_name: myapp-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: secret
      MYSQL_DATABASE: myapp
      MYSQL_CHARACTER_SET_SERVER: utf8mb4
      MYSQL_COLLATION_SERVER: utf8mb4_unicode_ci
    volumes:
      - mysql-data:/var/lib/mysql
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend

  # Redis 缓存
  redis:
    image: redis:7.2-alpine
    container_name: myapp-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass "redispass"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - backend

  # Nginx 反向代理
  nginx:
    image: nginx:1.25-alpine
    container_name: myapp-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./uploads:/usr/share/nginx/uploads:ro
    depends_on:
      - api
    networks:
      - backend

volumes:
  mysql-data:
  redis-data:

networks:
  backend:
    driver: bridge
```

### Compose 常用命令

```bash
# 启动所有服务（后台）
docker compose up -d

# 构建并启动
docker compose up -d --build

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f api

# 停止服务
docker compose stop

# 停止并删除容器（保留数据卷）
docker compose down

# 停止并删除所有（包括数据卷）
docker compose down -v

# 重启某个服务
docker compose restart api

# 进入服务容器
docker compose exec api sh

# 扩容（启动多个实例）
docker compose up -d --scale api=3
```

---

## 八、常用 Nginx 配置（反向代理 Go 服务）

```nginx
upstream go_api {
    server api:8080;
    # 多实例时
    # server api_1:8080;
    # server api_2:8080;
}

server {
    listen 80;
    server_name example.com;

    # 静态文件
    location /uploads/ {
        alias /usr/share/nginx/uploads/;
        expires 30d;
    }

    # API 代理
    location /api/ {
        proxy_pass http://go_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时设置
        proxy_connect_timeout 30s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
```

---

## 九、Docker 最佳实践

1. **使用多阶段构建**减小镜像大小
2. **非 root 用户运行**（安全）：
   ```dockerfile
   RUN adduser -D -g '' appuser
   USER appuser
   ```
3. **合并 RUN 指令**减少层数：
   ```dockerfile
   # ❌ 多层
   RUN apt-get update
   RUN apt-get install -y curl
   
   # ✅ 合并
   RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
   ```
4. **善用构建缓存**：频繁变化的文件放后面 COPY
5. **使用 .dockerignore** 排除不必要文件
6. **为镜像打版本标签**，不要只用 `latest`

---

## 总结

Docker 的核心价值：

| 解决的问题 | 方案 |
|-----------|------|
| 环境一致性 | 容器化，开发=生产 |
| 快速部署 | `docker pull && docker run` |
| 服务隔离 | 每个服务独立容器 |
| 资源效率 | 比虚拟机轻量 10-100 倍 |
| 版本管理 | 镜像 Tag 追踪版本 |

---

*作者：PFinal南丞 | 更新时间：2026-04-21*
