---
title: "Kubernetes 配置管理：ConfigMap、Secret 与生产最佳实践"
description: "掌握 Kubernetes 配置管理的完整方案：ConfigMap 管理非敏感配置、Secret 管理密钥，以及 Vault、External Secrets Operator 等生产级密钥管理方案，含 Go 应用实战示例。"
date: 2026-04-17 12:00:00
keywords:
  - Kubernetes ConfigMap
  - Kubernetes Secret
  - K8s 配置管理
  - 密钥管理
  - Vault
  - External Secrets
  - 环境变量
  - 配置热更新
author: PFinal 南丞
category: DevOps
tags:
  - kubernetes
  - k8s
  - devops
  - configmap
  - secret
  - 配置管理
  - 安全
---

# Kubernetes 配置管理：ConfigMap、Secret 与生产最佳实践

> 把配置硬编码进镜像是 K8s 使用的大忌，正确的做法是用 ConfigMap 管非敏感配置，用 Secret 管密钥，再配上生产级密钥管理工具。本文一步步讲清楚。

---

## 为什么需要配置管理？

容器化最核心的原则之一：**同一镜像，不同环境只需修改配置**。

```
同一镜像 go-api:v1.3.0
    ├── 开发环境：DB_HOST=localhost, LOG_LEVEL=debug
    ├── 测试环境：DB_HOST=mysql-test, LOG_LEVEL=info
    └── 生产环境：DB_HOST=mysql-prod, LOG_LEVEL=warn
```

K8s 提供两种原生配置资源：

| 资源 | 用途 | 是否加密 |
|------|-----|---------|
| **ConfigMap** | 非敏感配置（端口、日志级别、特性开关等） | 否（明文存储） |
| **Secret** | 敏感配置（密码、API 密钥、TLS 证书等） | Base64 编码（默认不加密！） |

---

## ConfigMap 详解

### 创建 ConfigMap

**方式一：命令行创建**

```bash
# 从字面值创建
kubectl create configmap app-config \
  --from-literal=LOG_LEVEL=info \
  --from-literal=APP_PORT=8080 \
  --from-literal=MAX_CONNECTIONS=100

# 从文件创建
kubectl create configmap nginx-config --from-file=nginx.conf

# 从目录创建（目录下所有文件）
kubectl create configmap app-configs --from-file=./configs/
```

**方式二：YAML 文件（推荐，便于版本控制）**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  # 简单键值对
  LOG_LEVEL: "info"
  APP_PORT: "8080"
  MAX_CONNECTIONS: "100"
  ENABLE_METRICS: "true"
  
  # 多行配置文件（用 | 保留换行）
  app.yaml: |
    server:
      port: 8080
      timeout: 30s
    database:
      max_connections: 100
      idle_timeout: 10m
    log:
      level: info
      format: json
  
  # Nginx 配置
  nginx.conf: |
    upstream backend {
      server go-api-svc:80;
    }
    server {
      listen 80;
      location / {
        proxy_pass http://backend;
      }
    }
```

### 使用 ConfigMap

**方式一：注入为环境变量**

```yaml
spec:
  containers:
    - name: go-api
      image: go-api:v1.3.0
      
      # 方式1a：注入单个键
      env:
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: LOG_LEVEL
        - name: APP_PORT
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: APP_PORT
      
      # 方式1b：注入全部键（作为环境变量）
      envFrom:
        - configMapRef:
            name: app-config
```

**方式二：挂载为文件（推荐复杂配置）**

```yaml
spec:
  containers:
    - name: go-api
      image: go-api:v1.3.0
      volumeMounts:
        - name: config-volume
          mountPath: /app/config        # ConfigMap 中的文件挂载到此目录
          readOnly: true
        - name: nginx-config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf           # 只挂载单个文件，不覆盖整个目录
  
  volumes:
    - name: config-volume
      configMap:
        name: app-config
        items:                          # 只挂载指定的键
          - key: app.yaml
            path: app.yaml             # 文件名
    - name: nginx-config
      configMap:
        name: app-config
```

**ConfigMap 热更新：**

当 ConfigMap 通过 Volume 挂载时，K8s 会**自动同步更新**（通常 1-2 分钟内），应用需要自行监听文件变化并重新加载配置。

通过环境变量注入的方式**不支持热更新**，需要重启 Pod。

Go 应用监听配置文件变化示例（使用 `fsnotify`）：

```go
import (
    "github.com/fsnotify/fsnotify"
    "github.com/spf13/viper"
)

func initConfig() {
    viper.SetConfigFile("/app/config/app.yaml")
    viper.ReadInConfig()
    
    // 监听配置文件变化
    viper.WatchConfig()
    viper.OnConfigChange(func(e fsnotify.Event) {
        log.Printf("Config file changed: %s", e.Name)
        // 重新加载配置...
    })
}
```

---

## Secret 详解

### Secret 的类型

| 类型 | 说明 |
|------|------|
| `Opaque` | 默认类型，任意键值（密码、API Key 等） |
| `kubernetes.io/tls` | TLS 证书（cert + key） |
| `kubernetes.io/dockerconfigjson` | 镜像仓库认证凭据 |
| `kubernetes.io/service-account-token` | ServiceAccount Token |
| `kubernetes.io/basic-auth` | Basic Auth 凭据 |

### 创建 Secret

**方式一：命令行（最安全，不留历史记录）**

```bash
# 创建数据库密码 Secret
kubectl create secret generic db-secret \
  --from-literal=DB_HOST=mysql.production:3306 \
  --from-literal=DB_USER=app_user \
  --from-literal=DB_PASSWORD='S3cur3P@ssword!' \
  --from-literal=DB_NAME=myapp \
  -n production

# 从文件创建（适合证书等二进制内容）
kubectl create secret tls api-tls \
  --cert=./tls.crt \
  --key=./tls.key \
  -n production

# Docker Registry 认证
kubectl create secret docker-registry regcred \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password=mypassword \
  -n production
```

**方式二：YAML 文件**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
  namespace: production
type: Opaque
# data 中的值必须 Base64 编码
data:
  DB_HOST: bXlzcWwucHJvZHVjdGlvbjoMzMzA2    # echo -n "mysql.production:3306" | base64
  DB_USER: YXBwX3VzZXI=                       # echo -n "app_user" | base64
  DB_PASSWORD: UzNjdXIzUEBzc3dvcmQh           # echo -n "S3cur3P@ssword!" | base64
# stringData 直接用明文（K8s 自动编码，不会存入 git 明文）
stringData:
  DB_NAME: myapp                              # 推荐用 stringData 写 YAML
```

> ⚠️ **绝对不要把包含真实密码的 Secret YAML 提交到 Git！** 这是最常见的泄露方式。正确做法见下方"生产级密钥管理"章节。

### 使用 Secret

```yaml
spec:
  containers:
    - name: go-api
      image: go-api:v1.3.0
      
      # 环境变量方式
      env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: DB_PASSWORD
      
      # 全部注入
      envFrom:
        - secretRef:
            name: db-secret
      
      # 挂载为文件（更安全，不出现在进程环境变量中）
      volumeMounts:
        - name: db-credentials
          mountPath: /app/secrets
          readOnly: true
  
  volumes:
    - name: db-credentials
      secret:
        secretName: db-secret
  
  # 拉取私有镜像仓库
  imagePullSecrets:
    - name: regcred
```

---

## ⚠️ Secret 的安全误区

K8s Secret 的本质是**Base64 编码，不是加密**：

```bash
# 任何有 kubectl 权限的人都能解码
kubectl get secret db-secret -o jsonpath='{.data.DB_PASSWORD}' | base64 -d
```

**默认情况下 etcd 也是明文存储 Secret**。生产环境必须：

1. **启用 etcd 加密**（KMS 提供商）
2. **使用外部密钥管理工具**（Vault / AWS Secrets Manager / GCP Secret Manager）
3. **严格的 RBAC**，限制 Secret 读取权限

---

## 生产级密钥管理方案

### 方案一：HashiCorp Vault + Vault Agent

Vault 是目前最流行的密钥管理工具，K8s 里的集成方案：

```bash
# 安装 Vault（Helm）
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault hashicorp/vault \
  --set "server.ha.enabled=true" \
  --set "server.ha.replicas=3"
```

Vault Agent 作为 Sidecar 自动注入密钥到应用：

```yaml
spec:
  template:
    metadata:
      annotations:
        # Vault Agent Injector 注解
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "go-api"
        vault.hashicorp.com/agent-inject-secret-db: "database/creds/myapp"
        vault.hashicorp.com/agent-inject-template-db: |
          {{- with secret "database/creds/myapp" -}}
          DB_USER={{ .Data.username }}
          DB_PASSWORD={{ .Data.password }}
          {{- end -}}
    spec:
      serviceAccountName: go-api
      containers:
        - name: go-api
          # 密钥自动写入 /vault/secrets/db 文件
          command: ["/bin/sh", "-c", "source /vault/secrets/db && ./go-api"]
```

### 方案二：External Secrets Operator（ESO）

ESO 将云厂商密钥服务（AWS Secrets Manager、GCP Secret Manager、阿里云 KMS）同步到 K8s Secret：

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace
```

```yaml
# ExternalSecret：声明从哪里拉取密钥
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
  namespace: production
spec:
  refreshInterval: 1h               # 每小时同步一次
  secretStoreRef:
    name: aws-secrets-manager        # 关联的 SecretStore
    kind: ClusterSecretStore
  target:
    name: db-secret                  # 同步到哪个 K8s Secret
  data:
    - secretKey: DB_PASSWORD          # K8s Secret 中的 key
      remoteRef:
        key: production/myapp/db      # AWS Secrets Manager 中的路径
        property: password
---
# SecretStore：定义如何连接外部密钥服务
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: ap-northeast-1
      auth:
        serviceAccount:
          name: external-secrets-sa
          namespace: external-secrets
```

### 方案三：Sealed Secrets（适合 GitOps）

Sealed Secrets 允许将加密后的 Secret 安全地提交到 Git：

```bash
# 安装 sealed-secrets controller
helm install sealed-secrets-controller sealed-secrets/sealed-secrets -n kube-system

# 安装 kubeseal CLI
brew install kubeseal

# 加密 Secret
kubectl create secret generic db-secret \
  --from-literal=DB_PASSWORD='S3cur3P@ssword!' \
  --dry-run=client -o yaml | \
  kubeseal --format yaml > sealed-db-secret.yaml

# 现在可以安全地提交 sealed-db-secret.yaml 到 Git
```

---

## 完整实战：Go 应用配置管理

### 项目配置结构

```
k8s/
├── configmap.yaml        # 非敏感配置
├── sealed-secret.yaml    # 加密后的 Secret（可以提交 Git）
├── deployment.yaml
└── service.yaml
```

### configmap.yaml

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: go-api-config
  namespace: production
data:
  APP_PORT: "8080"
  LOG_LEVEL: "info"
  LOG_FORMAT: "json"
  MAX_CONNECTIONS: "100"
  CACHE_TTL: "300"
  ENABLE_METRICS: "true"
  METRICS_PORT: "9090"
  
  config.yaml: |
    server:
      port: 8080
      read_timeout: 30s
      write_timeout: 30s
      idle_timeout: 120s
    
    cache:
      ttl: 300
      max_size: 10000
    
    ratelimit:
      enabled: true
      rps: 1000
      burst: 2000
```

### deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: go-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: go-api
  template:
    metadata:
      labels:
        app: go-api
    spec:
      containers:
        - name: go-api
          image: registry.example.com/go-api:v1.3.0
          ports:
            - containerPort: 8080
              name: http
            - containerPort: 9090
              name: metrics
          
          # 从 ConfigMap 注入通用配置
          envFrom:
            - configMapRef:
                name: go-api-config
          
          # 从 Secret 注入敏感配置
          env:
            - name: DB_DSN
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: DSN
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: redis-secret
                  key: URL
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: jwt-secret
                  key: SECRET
          
          # 挂载配置文件
          volumeMounts:
            - name: app-config
              mountPath: /app/config
              readOnly: true
          
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
          
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 20
      
      volumes:
        - name: app-config
          configMap:
            name: go-api-config
            items:
              - key: config.yaml
                path: config.yaml
```

### Go 应用读取配置

```go
package config

import (
    "fmt"
    "os"
    "strconv"
    
    "github.com/spf13/viper"
)

type Config struct {
    Server   ServerConfig
    Database DatabaseConfig
    Redis    RedisConfig
    JWT      JWTConfig
}

type ServerConfig struct {
    Port         int
    LogLevel     string
    EnableMetrics bool
    MetricsPort  int
}

type DatabaseConfig struct {
    DSN            string
    MaxConnections int
}

func Load() (*Config, error) {
    // 从文件加载（ConfigMap 挂载）
    viper.SetConfigFile("/app/config/config.yaml")
    viper.SetConfigType("yaml")
    
    // 允许环境变量覆盖（ConfigMap/Secret 注入）
    viper.AutomaticEnv()
    
    if err := viper.ReadInConfig(); err != nil {
        // 文件不存在时只使用环境变量
        if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
            return nil, fmt.Errorf("read config: %w", err)
        }
    }
    
    return &Config{
        Server: ServerConfig{
            Port:          viper.GetInt("APP_PORT"),
            LogLevel:      viper.GetString("LOG_LEVEL"),
            EnableMetrics: viper.GetBool("ENABLE_METRICS"),
            MetricsPort:   viper.GetInt("METRICS_PORT"),
        },
        Database: DatabaseConfig{
            // 敏感配置只从环境变量读取
            DSN:            mustEnv("DB_DSN"),
            MaxConnections: viper.GetInt("MAX_CONNECTIONS"),
        },
    }, nil
}

func mustEnv(key string) string {
    v := os.Getenv(key)
    if v == "" {
        panic(fmt.Sprintf("required environment variable %s is not set", key))
    }
    return v
}
```

---

## RBAC：限制 Secret 访问权限

生产环境必须限制谁可以读取 Secret：

```yaml
# 创建只读 Secret 的 Role
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get"]
    resourceNames: ["db-secret", "redis-secret"]   # 只允许访问指定 Secret
---
# 绑定到 ServiceAccount
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: go-api-secret-reader
  namespace: production
subjects:
  - kind: ServiceAccount
    name: go-api
    namespace: production
roleRef:
  kind: Role
  name: secret-reader
  apiGroup: rbac.authorization.k8s.io
---
# 应用使用的 ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: go-api
  namespace: production
automountServiceAccountToken: false    # 不自动挂载 SA Token（最小权限原则）
```

---

## 配置管理最佳实践总结

| 场景 | 推荐方案 |
|------|---------|
| 非敏感配置（端口、日志级别） | ConfigMap |
| 复杂配置文件（YAML/TOML/JSON） | ConfigMap + Volume 挂载 |
| 需要热更新的配置 | ConfigMap + Volume（应用监听文件变化） |
| 密码、API Key（小团队/测试） | K8s Secret（命令行创建，不提交 YAML） |
| 密码、API Key（需要 GitOps） | Sealed Secrets |
| 密码、API Key（企业级） | Vault 或 External Secrets Operator |
| 镜像仓库凭据 | `imagePullSecrets` + docker-registry Secret |
| TLS 证书 | cert-manager 自动管理 |

**核心原则：**

1. 🔐 **Secret 不进 Git**（明文 YAML 永远不提交）
2. 📁 **配置与代码分离**（12-Factor App 原则）
3. 🔒 **最小权限**（RBAC 精确控制 Secret 访问）
4. 🔄 **配置版本化**（ConfigMap 和 Sealed Secrets 可以 git 管理）
5. 🌍 **环境隔离**（dev/staging/prod 使用不同 Namespace 和配置）

---

## 小结

本文覆盖了 K8s 配置管理的完整方案：

- **ConfigMap**：管理非敏感配置，支持环境变量注入和文件挂载
- **Secret**：管理敏感配置，Base64 不等于加密
- **生产方案**：Vault / External Secrets / Sealed Secrets
- **RBAC**：精细控制 Secret 访问权限
- **Go 应用实战**：Viper 统一读取环境变量和配置文件

至此 Kubernetes 核心四篇文章完成：

1. [K8s 架构与核心概念](/courses/devops-practice/k8s-architecture) ✅
2. [K8s 工作负载](/courses/devops-practice/k8s-workloads) ✅
3. [K8s 服务发现与网络](/courses/devops-practice/k8s-networking) ✅
4. [K8s 配置管理（本文）](/courses/devops-practice/k8s-config) ✅

后续计划：存储管理（PVC/StorageClass）、HPA 自动扩缩容、Helm 包管理。

---

[← K8s 服务发现与网络](/courses/devops-practice/k8s-networking) | [返回 DevOps 课程 →](/courses/devops-practice/)
