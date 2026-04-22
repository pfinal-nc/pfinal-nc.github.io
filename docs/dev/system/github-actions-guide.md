---
title: "GitHub Actions 实战指南"
date: 2026-04-22 00:00:00
author: PFinal南丞
description: "从零开始学习 GitHub Actions，掌握 CI/CD 自动化工作流的配置与最佳实践，包括工作流触发、矩阵构建、缓存优化、多环境部署等核心技能。"
keywords:
  - GitHub Actions
  - CI/CD
  - 自动化部署
  - DevOps
  - 工作流
tags:
  - github-actions
  - cicd
  - devops
  - automation
---

# GitHub Actions 实战指南

GitHub Actions 是 GitHub 提供的 CI/CD 平台，允许你自动化构建、测试和部署流程。本文将带你从零开始掌握 GitHub Actions 的核心概念和实战技巧。

## 什么是 GitHub Actions

GitHub Actions 让你能够在 GitHub 仓库中直接创建自定义软件开发生命周期工作流。你可以配置工作流在特定事件发生时自动运行，例如：

- 代码推送到仓库
- 创建 Pull Request
- 发布 Release
- 定时触发（Cron 任务）

## 核心概念

### 1. Workflow（工作流）

工作流是可配置的自动化流程，由 YAML 文件定义，存储在 `.github/workflows/` 目录下。

```yaml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: echo "Hello, GitHub Actions!"
```

### 2. Event（事件）

触发工作流运行的特定活动：

| 事件 | 说明 |
|------|------|
| `push` | 代码推送时触发 |
| `pull_request` | PR 创建或更新时触发 |
| `schedule` | 定时触发（Cron 语法） |
| `workflow_dispatch` | 手动触发 |
| `release` | 发布时触发 |

### 3. Job（任务）

工作流由多个任务组成，任务可以串行或并行执行。

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
  test:
    needs: build  # 依赖 build 任务完成后执行
    runs-on: ubuntu-latest
    steps:
      - run: go test ./...
```

### 4. Step（步骤）

任务是步骤的集合，每个步骤执行一个具体的操作。

```yaml
steps:
  - name: Checkout code
    uses: actions/checkout@v4
    
  - name: Setup Go
    uses: actions/setup-go@v5
    with:
      go-version: '1.22'
      
  - name: Run tests
    run: go test -v ./...
```

## 实战配置

### Go 项目 CI/CD 工作流

```yaml
name: Go CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        go-version: ['1.21', '1.22']
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Go ${{ matrix.go-version }}
        uses: actions/setup-go@v5
        with:
          go-version: ${{ matrix.go-version }}
      
      - name: Cache Go modules
        uses: actions/cache@v4
        with:
          path: ~/go/pkg/mod
          key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
          restore-keys: |
            ${{ runner.os }}-go-
      
      - name: Download dependencies
        run: go mod download
      
      - name: Run linter
        uses: golangci/golangci-lint-action@v6
        with:
          version: latest
      
      - name: Run tests
        run: go test -race -coverprofile=coverage.out ./...
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage.out

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'
      
      - name: Build
        run: go build -v ./...
      
      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to production
        run: |
          echo "Deploying to production..."
          # 实际部署命令
```

### Node.js 项目工作流

```yaml
name: Node.js CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
```

### Docker 镜像构建与推送

```yaml
name: Docker Build and Push

on:
  push:
    tags:
      - 'v*'

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=tag
            type=semver,pattern={{version}}
            type=sha
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## 高级技巧

### 1. 环境变量与 Secrets

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - name: Deploy
        env:
          API_KEY: ${{ secrets.API_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          echo "Deploying with API key..."
          ./deploy.sh
```

### 2. 条件执行

```yaml
jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploy to staging"

  deploy-production:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploy to production"
```

### 3. 矩阵构建

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [16, 18, 20]
        exclude:
          - os: windows-latest
            node: 16
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm test
```

### 4. 复用工作流

```yaml
# .github/workflows/reusable-workflow.yml
name: Reusable Workflow

on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
    secrets:
      token:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - run: echo "Deploying to ${{ inputs.environment }}"

# 调用方
jobs:
  call-workflow:
    uses: ./.github/workflows/reusable-workflow.yml
    with:
      environment: production
    secrets:
      token: ${{ secrets.TOKEN }}
```

## 常用 Actions 推荐

| Action | 用途 |
|--------|------|
| `actions/checkout` | 检出代码 |
| `actions/setup-go` | 设置 Go 环境 |
| `actions/setup-node` | 设置 Node.js 环境 |
| `actions/setup-python` | 设置 Python 环境 |
| `actions/cache` | 缓存依赖 |
| `actions/upload-artifact` | 上传构建产物 |
| `actions/download-artifact` | 下载构建产物 |
| `docker/login-action` | Docker 登录 |
| `docker/build-push-action` | 构建推送镜像 |
| `codecov/codecov-action` | 上传测试覆盖率 |

## 最佳实践

1. **使用缓存**：缓存依赖可以显著减少构建时间
2. **最小权限原则**：只授予工作流必要的权限
3. **使用 Secrets**：敏感信息不要硬编码在配置中
4. **测试矩阵**：在多个环境和版本上测试
5. **并行执行**：充分利用并行任务提高效率
6. **失败快速**：使用 `fail-fast: true` 快速发现问题

## 总结

GitHub Actions 是一个强大的 CI/CD 平台，通过合理配置可以大大提高开发效率。本文介绍了核心概念和实战配置，帮助你快速上手 GitHub Actions。

---

**参考资源：**
- [GitHub Actions 官方文档](https://docs.github.com/en/actions)
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)
