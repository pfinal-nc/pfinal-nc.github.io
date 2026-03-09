---
title: "DevOps 工程实践 - 完整课程大纲 | 2025"
description: "系统学习 DevOps 工程实践，从 Docker 容器化到 Kubernetes 编排，从 CI/CD 流水线到监控告警体系，打造现代化工程能力。"
keywords:
  - DevOps 教程
  - Docker 容器化
  - Kubernetes
  - CI/CD
  - GitHub Actions
  - Prometheus
  - Grafana
  - 监控告警
  - 2025 DevOps 课程
author: PFinal 南丞
category: 课程
tags:
  - course
  - devops
  - docker
  - kubernetes
  - ci-cd
  - monitoring
course:
  name: DevOps 工程实践
  level: 中级
  duration: 6-8 周
  lessons: 10
  status: planning
  project: 完整 CI/CD 流水线、监控告警体系
---

# 🚀 DevOps 工程实践

> 从容器化到监控告警，打造现代化工程能力

<div class="course-info">

| 课程信息 | 说明 |
|----------|------|
| **难度** | 🟡 中级 |
| **预计时长** | 6-8 周 |
| **课程模块** | 4 大核心模块 |
| **课时数量** | 10 课时 |
| **实战项目** | 完整 CI/CD 流水线、监控告警体系 |
| **前置知识** | Linux 基础、Go/Python 任意一门语言 |

</div>

---

## 🎯 课程目标

完成本课程后，你将能够：

- ✅ **容器化应用** - Docker 镜像构建、优化、最佳实践
- ✅ **编排与管理** - Kubernetes 部署、服务发现、自动扩缩容
- ✅ **自动化流水线** - CI/CD 设计、GitHub Actions、自动化测试
- ✅ **监控与告警** - Prometheus、Grafana、日志收集、告警规则
- ✅ **可观测性体系** - 日志、指标、Trace 三位一体

---

## 📚 课程大纲

### 🔹 模块 1：Docker 容器化（2 周）

<div class="module">

**目标：** 掌握 Docker 核心概念、镜像构建优化、容器编排基础

| 课时 | 主题 | 内容 | 状态 |
|------|------|------|------|
| 1.1 | Docker 基础 | 容器 vs 虚拟机、镜像与容器、仓库 | 📝 |
| 1.2 | Dockerfile 编写 | 指令详解、多阶段构建、最佳实践 | 📝 |
| 1.3 | 镜像优化 | 层缓存、体积优化、安全扫描 | 📝 |
| 1.4 | Docker Compose | 多容器编排、网络、数据卷 | 📝 |
| 1.5 | Go 应用容器化 | 静态编译、最小镜像、健康检查 | ✅ |
| 1.6 | 容器安全 | 非 root 运行、镜像签名、漏洞扫描 | 📝 |

**推荐文章：**
- [Docker 部署 Go 项目实践指南](/tools/Docker 部署 Go 项目实践指南.md)
- [单文件代码部署工具](/tools/单文件代码部署工具.md)

**实战练习：**
- 将现有 Go 应用容器化
- 编写多阶段 Dockerfile
- 使用 Docker Compose 运行完整应用栈

</div>

---

### 🔹 模块 2：Kubernetes 编排（2 周）

<div class="module">

**目标：** 掌握 K8s 核心概念、工作负载、服务发现、配置管理

| 课时 | 主题 | 内容 | 状态 |
|------|------|------|------|
| 2.1 | K8s 架构与概念 | Master/Node、Pod、Namespace | 📝 |
| 2.2 | 工作负载 | Deployment、StatefulSet、DaemonSet | 📝 |
| 2.3 | 服务发现 | Service、Ingress、DNS | 📝 |
| 2.4 | 配置管理 | ConfigMap、Secret、环境变量 | 📝 |
| 2.5 | 存储管理 | Volume、PVC、StorageClass | 📝 |
| 2.6 | 自动扩缩容 | HPA、VPA、Cluster Autoscaler | 📝 |
| 2.7 | Helm 包管理 | Chart 结构、模板、依赖管理 | 📝 |

**实战练习：**
- 在本地使用 Minikube/Kind 搭建 K8s 环境
- 部署多微服务应用
- 配置 HPA 自动扩缩容

</div>

---

### 🔹 模块 3：CI/CD 流水线（2 周）

<div class="module">

**目标：** 设计并实现完整的持续集成与持续部署流水线

| 课时 | 主题 | 内容 | 状态 |
|------|------|------|------|
| 3.1 | CI/CD 基础 | 持续集成、持续交付、持续部署 | 📝 |
| 3.2 | GitHub Actions | Workflow 语法、Actions、Secrets | ✅ |
| 3.3 | 自动化测试 | 单元测试、集成测试、E2E 测试 | 📝 |
| 3.4 | 代码质量 | Lint、格式化、覆盖率、SonarQube | 📝 |
| 3.5 | 构建与发布 | 自动化构建、版本管理、Release | 📝 |
| 3.6 | 自动化部署 | 蓝绿部署、金丝雀发布、回滚策略 | 📝 |
| 3.7 | GitOps 实践 | ArgoCD、Flux、声明式部署 | ✅ |

**推荐文章：**
- [GitOps 实战：从应用部署到全生命周期管理](/thinking/method/GitOps 实战 - 从应用部署到全生命周期管理.md)

**GitHub Actions 示例：**

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      - run: go test -race -coverprofile=coverage.out ./...
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage.out

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/build-push-action@v4
        with:
          push: true
          tags: myapp:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: azure/k8s-deploy@v4
        with:
          manifests: k8s/deployment.yaml
          images: myapp:${{ github.sha }}
```

</div>

---

### 🔹 模块 4：监控与可观测性（2 周）

<div class="module">

**目标：** 建立完整的监控、日志、告警体系

| 课时 | 主题 | 内容 | 状态 |
|------|------|------|------|
| 4.1 | 可观测性基础 | 日志、指标、Trace 三大支柱 | 📝 |
| 4.2 | Prometheus 监控 | 架构、数据模型、PromQL | 📝 |
| 4.3 | Grafana 可视化 | Dashboard、数据源、告警 | 📝 |
| 4.4 | 日志收集 | Loki/ELK、Fluentd、日志结构化 | ✅ |
| 4.5 | 分布式追踪 | OpenTelemetry、Jaeger、SkyWalking | ✅ |
| 4.6 | 告警管理 | Alertmanager、告警规则、降噪 | 📝 |
| 4.7 | Go 应用监控 | 指标暴露、健康检查、pprof | ✅ |

**推荐文章：**
- [从 trace 到洞察：Go 项目的可观测性闭环实践](/thinking/method/从%20trace%20 到洞察：Go%20 项目的可观测性闭环实践.md)
- [别再盲接 OTel：Go 可观察性接入的 8 个大坑](/thinking/method/别再盲接%20OTel：Go%20 可观察性接入的%208%20 个大坑.md)
- [使用 Devslog 结构化日志处理](/tools/使用 Devslog 结构化日志处理.md)

**监控体系架构图：**

```
┌─────────────────────────────────────────────────────┐
│                    应用层                            │
│  Go App ──> Prometheus Metrics (端口 9090)          │
│  Go App ──> Structured Logs ──> Loki               │
│  Go App ──> OpenTelemetry Trace ──> Jaeger         │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                    收集层                            │
│  Prometheus Server ──> TSDB                         │
│  Loki ──> 日志索引                                   │
│  Jaeger ──> Trace 存储                               │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                    展示层                            │
│  Grafana Dashboard                                  │
│  ├─ 应用指标面板                                     │
│  ├─ 日志查询面板                                     │
│  └─ Trace 分析面板                                   │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                    告警层                            │
│  Alertmanager ──> 通知渠道                           │
│  ├─ Email                                             │
│  ├─ Slack/Discord                                    │
│  └─ 钉钉/企业微信                                     │
└─────────────────────────────────────────────────────┘
```

</div>

---

## 🛠️ 技术栈

```
DevOps 工具链
├── 容器化
│   ├── Docker
│   ├── Docker Compose
│   └── Container Registry
├── 编排
│   ├── Kubernetes
│   ├── Helm
│   └── Kustomize
├── CI/CD
│   ├── GitHub Actions
│   ├── GitLab CI
│   └── ArgoCD (GitOps)
├── 监控
│   ├── Prometheus (指标)
│   ├── Grafana (可视化)
│   └── Alertmanager (告警)
├── 日志
│   ├── Loki (轻量级)
│   ├── ELK Stack (完整方案)
│   └── Fluentd (收集器)
└── 追踪
    ├── OpenTelemetry (标准)
    ├── Jaeger
    └── SkyWalking
```

---

## 🏆 实战项目

### 项目：完整 DevOps 流水线

**目标：** 为一个 Go Web 应用构建完整的 DevOps 体系

**要求：**
1. **容器化** - 编写优化的 Dockerfile
2. **K8s 部署** - 编写 Deployment、Service、Ingress
3. **CI/CD** - GitHub Actions 自动测试、构建、部署
4. **监控** - Prometheus 指标 + Grafana Dashboard
5. **日志** - 结构化日志 + Loki 收集
6. **告警** - CPU/内存/错误率告警规则

**技术栈：**
- Go 1.21+ (Gin 框架)
- Docker + Docker Compose
- Kubernetes (Minikube/Kind)
- GitHub Actions
- Prometheus + Grafana
- Loki + Promtail

---

## 📖 学习资源

### 官方文档
- [Docker 官方文档](https://docs.docker.com/)
- [Kubernetes 官方文档](https://kubernetes.io/docs/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Prometheus 官方文档](https://prometheus.io/docs/)

### 实践指南
- [Kubernetes 最佳实践](https://kubernetes.io/docs/concepts/)
- [Docker 安全指南](https://docs.docker.com/engine/security/)
- [GitOps 白皮书](https://opengitops.dev/)

### 工具推荐
- **本地 K8s**: Minikube, Kind, Rancher Desktop
- **IDE**: VS Code + Kubernetes 插件
- **CLI**: kubectl, helm, k9s

---

## 🎓 学习建议

### 1️⃣ 环境准备
- 准备一台 Linux 虚拟机或使用 WSL2
- 安装 Docker Desktop
- 搭建本地 K8s 环境（Minikube/Kind）

### 2️⃣ 循序渐进
- 先掌握 Docker 基础
- 再学习 K8s 核心概念
- 最后实现完整流水线

### 3️⃣ 动手实践
- 每个课时都要动手操作
- 将现有项目容器化
- 搭建完整的监控体系

### 4️⃣ 持续学习
- DevOps 工具更新快
- 关注云原生社区动态
- 参与开源项目

---

## 📊 课程进度

<div class="progress-tracker">

| 模块 | 进度 | 状态 |
|------|------|------|
| 模块 1：Docker 容器化 | 1/6 | 🚧 进行中 |
| 模块 2：Kubernetes 编排 | 0/7 | 📝 规划中 |
| 模块 3：CI/CD流水线 | 2/7 | 🚧 进行中 |
| 模块 4：监控与可观测性 | 3/7 | 🚧 进行中 |

**总体进度：** 6/27 (22%)

</div>

---

## 💡 常见问题

### Q: DevOps 需要掌握所有工具吗？
**A:** 不需要。掌握核心概念后，工具可以按需学习。建议先精通一个工具链。

### Q: 小团队需要 DevOps 吗？
**A:** 需要。自动化可以节省大量时间，即使是单人团队也能受益。

### Q: 如何说服团队采用 DevOps？
**A:** 从小处着手，先解决一个痛点（如自动化测试），展示价值后再推广。

---

## 🤝 参与贡献

本课程正在建设中，欢迎参与：

- 📝 **编写课时**：认领任意未完成的课时
- 🐛 **报告问题**：发现错误或不清晰的地方
- 💡 **提出建议**：新的实战案例或工具推荐

[GitHub 仓库](https://github.com/pfinal-nc) | [联系作者](/contact)

---

> 💡 **提示**：DevOps 不仅是工具，更是一种文化。自动化、协作、持续改进是核心理念。

[返回课程总览 →](/courses/)
