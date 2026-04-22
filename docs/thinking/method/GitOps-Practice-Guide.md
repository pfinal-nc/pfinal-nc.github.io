---
title: "GitOps 实战：从应用部署到全生命周期管理"
description: "全面讲解 GitOps 核心理念、工具链和实践方法，包括 ArgoCD、Flux 等工具的使用，帮助你实现声明式持续交付。"
keywords:
  - GitOps
  - ArgoCD
  - Flux
  - 持续交付
  - Kubernetes
author: PFinal南丞
date: 2026-04-22
tags:
  - gitops
  - devops
  - kubernetes
  - cicd
---

# GitOps 实战：从应用部署到全生命周期管理

> GitOps 是一种实现云原生应用持续交付的声明式方式。本文带你从理论到实践全面掌握 GitOps。

## 一、GitOps 基础

### 1.1 什么是 GitOps

GitOps 是一种运维模型，核心思想是：
- **声明式**：系统状态在 Git 中声明
- **版本化**：所有变更都有版本记录
- **自动同步**：自动将 Git 状态同步到系统
- **可审计**：完整的变更历史

### 1.2 GitOps 原则

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│   Git   │────▶│  Sync   │────▶│   K8s   │
│(Source) │     │ (Agent) │     │(Target) │
└─────────┘     └─────────┘     └─────────┘
```

**核心原则：**
1. 整个系统以声明方式描述
2. 系统状态版本化在 Git 中
3. 批准的变更自动应用到系统
4. 软件代理确保一致性

## 二、GitOps 工具链

### 2.1 ArgoCD

```yaml
# ArgoCD Application 配置
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/repo.git
    targetRevision: HEAD
    path: k8s/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

### 2.2 Flux

```yaml
# Flux GitRepository
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/org/repo
  ref:
    branch: main
---
# Flux Kustomization
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./k8s/overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: my-app
```

## 三、目录结构设计

```
my-app/
├── apps/
│   ├── base/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── kustomization.yaml
│   └── overlays/
│       ├── development/
│       │   ├── kustomization.yaml
│       │   └── patches.yaml
│       ├── staging/
│       │   ├── kustomization.yaml
│       │   └── patches.yaml
│       └── production/
│           ├── kustomization.yaml
│           └── patches.yaml
├── infra/
│   ├── namespaces/
│   ├── monitoring/
│   └── networking/
└── docs/
```

## 四、实战部署

### 4.1 安装 ArgoCD

```bash
# 安装 ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 获取初始密码
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# 端口转发
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

### 4.2 创建应用

```yaml
# application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: frontend
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/company/frontend.git
    targetRevision: v1.2.3
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: frontend
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### 4.3 多环境管理

```yaml
# k8s/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production

resources:
  - ../../base

patches:
  - target:
      kind: Deployment
      name: app
    patch: |
      - op: replace
        path: /spec/replicas
        value: 5
      - op: replace
        path: /spec/template/spec/containers/0/resources/limits/memory
        value: 2Gi

images:
  - name: app
    newTag: v1.2.3
```

## 五、高级特性

### 5.1 渐进式交付

```yaml
# Argo Rollout
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-app
spec:
  replicas: 5
  strategy:
    canary:
      steps:
        - setWeight: 20
        - pause: {duration: 10m}
        - setWeight: 40
        - pause: {duration: 10m}
        - setWeight: 60
        - pause: {duration: 10m}
        - setWeight: 80
        - pause: {duration: 10m}
      analysis:
        templates:
          - templateName: success-rate
```

### 5.2 密钥管理

```yaml
# External Secrets
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: vault-backend
  target:
    name: db-credentials
    creationPolicy: Owner
  data:
    - secretKey: username
      remoteRef:
        key: secret/data/db
        property: username
    - secretKey: password
      remoteRef:
        key: secret/data/db
        property: password
```

## 六、最佳实践

### 6.1 分支策略

```
main (生产环境)
  ↑
staging (预发布)
  ↑
develop (开发)
  ↑
feature/* (功能分支)
```

### 6.2 提交规范

```
feat: 添加新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

### 6.3 监控告警

```yaml
# PrometheusRule
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: gitops-alerts
spec:
  groups:
    - name: argocd
      rules:
        - alert: ArgoCDAppOutOfSync
          expr: |
            argocd_app_info{sync_status="OutOfSync"} == 1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD Application Out of Sync"
```

## 七、总结

| 方面 | 建议 |
|------|------|
| 工具选择 | 小团队 ArgoCD，大团队 Flux |
| 目录结构 | 使用 Kustomize 管理多环境 |
| 安全 | 配合 External Secrets 管理密钥 |
| 交付 | 结合 Argo Rollouts 实现渐进式发布 |

GitOps 让部署更简单、更可靠、更可审计，是现代云原生应用的首选部署方式。
