---
title: "Project 6: 部署上线"
description: "Docker 镜像、K8s 部署、CI/CD"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, project, deployment, docker, kubernetes, lesson]
---

# Project 6: 部署上线

## 学习目标

- 构建优化的 Docker 镜像
- 编写 K8s 部署清单

---

## 1. Docker 多阶段构建

```dockerfile
# Build stage
FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

# Run stage
FROM alpine:3.20
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=builder /app/server .
COPY config.yaml .
EXPOSE 8080
CMD ["./server"]
```

## 2. Kubernetes 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blog-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: blog-api
  template:
    metadata:
      labels:
        app: blog-api
    spec:
      containers:
      - name: api
        image: pfinal/blog-api:latest
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet: { path: /health, port: 8080 }
        resources:
          requests: { cpu: "200m", memory: "256Mi" }
          limits:   { cpu: "1000m", memory: "512Mi" }
```

## 推荐资料

- [Docker 部署 Go 项目实践指南](/Tools/Docker-Go-Deployment)
- [docker-basics](/dev/system/docker-basics)
- [kubernetes-basics](/dev/system/kubernetes-basics)
- [GitOps 实战](/thinking/method/GitOps-Practice-Guide)
