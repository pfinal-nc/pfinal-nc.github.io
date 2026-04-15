---
title: "FastAPI 测试与部署：生产环境最佳实践"
date: 2026-03-11 00:00:00
author: PFinal南丞
description: "学习如何测试和部署 FastAPI 应用到生产环境。包括单元测试、集成测试、Docker 部署、Kubernetes 部署、CI/CD 流程等生产环境最佳实践。"
keywords:
  - FastAPI
  - 测试
  - 部署
  - 生产环境
  - Docker
  - Kubernetes
  - CI/CD
  - 最佳实践
tags:
  - python
  - fastapi
  - testing
  - deployment
  - docker
  - kubernetes
  - cicd
  - production
difficulty: 进阶
---

# FastAPI 测试与部署：生产环境最佳实践

> 学习如何测试和部署 FastAPI 应用到生产环境。包括单元测试、集成测试、Docker 部署、Kubernetes 部署、CI/CD 流程等生产环境最佳实践。

---

## 🧪 测试 FastAPI 应用

### 测试工具

FastAPI 官方推荐使用 `httpx` 进行测试：

```bash
pip install pytest pytest-asyncio httpx
```

### 单元测试

#### 测试配置

创建 `tests/conftest.py`：

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    """
    创建测试客户端
    """
    return TestClient(app)

@pytest.fixture
def test_user():
    """
    创建测试用户数据
    """
    return {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpassword123"
    }
```

#### 测试 API 端点

创建 `tests/test_api.py`：

```python
from fastapi import status
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_root():
    """
    测试根端点
    """
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"}

def test_create_user(client: TestClient, test_user: dict):
    """
    测试创建用户
    """
    response = client.post("/users/", json=test_user)
    assert response.status_code == status.HTTP_201_CREATED

    data = response.json()
    assert data["username"] == test_user["username"]
    assert data["email"] == test_user["email"]
    assert "id" in data
    assert "password" not in data  # 密码不应返回

def test_read_user(client: TestClient, test_user: dict):
    """
    测试获取用户
    """
    # 先创建用户
    create_response = client.post("/users/", json=test_user)
    user_id = create_response.json()["id"]

    # 获取用户
    response = client.get(f"/users/{user_id}")
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == user_id
    assert data["username"] == test_user["username"]

def test_read_nonexistent_user(client: TestClient):
    """
    测试获取不存在的用户
    """
    response = client.get("/users/99999")
    assert response.status_code == 404
    assert "detail" in response.json()
```

#### 测试认证端点

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_login_success(test_user: dict):
    """
    测试成功登录
    """
    # 先创建用户
    client.post("/users/", json=test_user)

    # 登录
    response = client.post(
        "/token",
        data={
            "username": test_user["username"],
            "password": test_user["password"]
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_credentials(test_user: dict):
    """
    测试无效凭证登录
    """
    response = client.post(
        "/token",
        data={
            "username": test_user["username"],
            "password": "wrongpassword"
        }
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "detail" in response.json()

def test_protected_route():
    """
    测试需要认证的路由
    """
    # 未认证访问
    response = client.get("/users/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

    # 认证后访问
    login_response = client.post("/token", data={
        "username": "testuser",
        "password": "testpassword123"
    })
    token = login_response.json()["access_token"]

    response = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
```

### 集成测试

#### 使用测试数据库

创建 `tests/test_integration.py`：

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db, Base

# 使用内存 SQLite 数据库进行测试
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db_session():
    """
    创建测试数据库会话
    """
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(db_session):
    """
    创建使用测试数据库的客户端
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
```

#### 测试数据库操作

```python
def test_create_user_in_db(client: TestClient):
    """
    测试在数据库中创建用户
    """
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpassword123"
    }

    response = client.post("/users/", json=user_data)
    assert response.status_code == 201

    # 验证数据已存储
    from app.models import User
    db = TestingSessionLocal()
    user = db.query(User).filter(User.username == "testuser").first()
    assert user is not None
    assert user.email == "test@example.com"
    db.close()
```

### 运行测试

```bash
# 运行所有测试
pytest

# 运行特定文件
pytest tests/test_api.py

# 运行特定测试
pytest tests/test_api.py::test_read_root

# 显示详细输出
pytest -v

# 显示覆盖率
pytest --cov=app --cov-report=html
```

---

## 🐳 Docker 部署

### 创建 Dockerfile

```dockerfile
# 使用官方 Python 镜像作为基础镜像
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 复制依赖文件
COPY requirements.txt .

# 安装依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 创建非 root 用户
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# 暴露端口
EXPOSE 8000

# 启动应用
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 多阶段构建（生产环境优化）

```dockerfile
# 构建阶段
FROM python:3.11-slim as builder

WORKDIR /app

# 安装构建依赖
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# 运行阶段
FROM python:3.11-slim

WORKDIR /app

# 从构建阶段复制依赖
COPY --from=builder /root/.local /root/.local

# 复制应用代码
COPY . .

# 更新 PATH
ENV PATH=/root/.local/bin:$PATH

# 创建非 root 用户
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 启动应用（使用 gunicorn）
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "app.main:app"]
```

### Docker Compose

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/mydb
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./app:/app/app  # 开发时挂载代码
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d mydb"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl  # SSL 证书
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
```

### 构建和运行

```bash
# 构建镜像
docker build -t fastapi-app .

# 运行容器
docker run -p 8000:8000 fastapi-app

# 使用 Docker Compose
docker-compose up -d

# 查看日志
docker-compose logs -f api

# 停止容器
docker-compose down
```

---

## ☸️ Kubernetes 部署

### 创建部署配置

创建 `k8s/deployment.yaml`：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fastapi-app
  labels:
    app: fastapi-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fastapi-app
  template:
    metadata:
      labels:
        app: fastapi-app
    spec:
      containers:
      - name: fastapi-app
        image: fastapi-app:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: secret-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 创建服务配置

创建 `k8s/service.yaml`：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: fastapi-app-service
spec:
  selector:
    app: fastapi-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  name: fastapi-app-loadbalancer
spec:
  selector:
    app: fastapi-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: LoadBalancer
```

### 创建 ConfigMap 和 Secret

创建 `k8s/configmap.yaml`：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  APP_NAME: "FastAPI App"
  DEBUG: "false"
```

创建 `k8s/secret.yaml`：

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  secret-key: BASE64_ENCODED_SECRET_KEY
---
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
data:
  url: BASE64_ENCODED_DATABASE_URL
```

### 部署到 Kubernetes

```bash
# 创建命名空间
kubectl create namespace fastapi

# 应用配置
kubectl apply -f k8s/configmap.yaml -n fastapi
kubectl apply -f k8s/secret.yaml -n fastapi
kubectl apply -f k8s/deployment.yaml -n fastapi
kubectl apply -f k8s/service.yaml -n fastapi

# 查看部署状态
kubectl get pods -n fastapi
kubectl get services -n fastapi

# 查看日志
kubectl logs -f deployment/fastapi-app -n fastapi

# 扩缩容
kubectl scale deployment fastapi-app --replicas=5 -n fastapi
```

---

## 🔄 CI/CD 流程

### GitHub Actions

创建 `.github/workflows/deploy.yml`：

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'

    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt

    - name: Run tests
      run: |
        pip install pytest pytest-cov
        pytest --cov=app --cov-report=xml

    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage.xml

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2

    - name: Login to Docker Hub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}

    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          yourusername/fastapi-app:latest
          yourusername/fastapi-app:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Set up kubectl
      uses: azure/setup-kubectl@v3

    - name: Configure kubectl
      run: |
        echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig

    - name: Deploy to Kubernetes
      run: |
        kubectl apply -f k8s/ -n fastapi
        kubectl rollout restart deployment/fastapi-app -n fastapi

    - name: Verify deployment
      run: |
        kubectl get pods -n fastapi
        kubectl get services -n fastapi
```

---

## 🔐 安全最佳实践

### 环境变量管理

```python
from pydantic import BaseSettings

class Settings(BaseSettings):
    # 数据库配置
    DATABASE_URL: str

    # JWT 配置
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Redis 配置
    REDIS_URL: str

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

### HTTPS 配置

使用 Nginx 反向代理：

```nginx
# nginx.conf
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://fastapi-app:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 安全头中间件

```python
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

app = FastAPI()

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# 受信任主机中间件
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["yourdomain.com", "*.yourdomain.com"]
)

# 安全头中间件
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response
```

---

## 📊 监控与日志

### 日志配置

```python
import logging
from fastapi import FastAPI

app = FastAPI()

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)

logger = logging.getLogger(__name__)

@app.get("/")
async def root():
    logger.info("Root endpoint called")
    return {"message": "Hello World"}
```

### Prometheus 监控

```python
from prometheus_client import Counter, Histogram, make_asgi_app
from fastapi import FastAPI

app = FastAPI()

# Prometheus 指标
request_count = Counter(
    'fastapi_requests_total',
    'Total FastAPI requests',
    ['method', 'endpoint', 'status']
)

request_duration = Histogram(
    'fastapi_request_duration_seconds',
    'FastAPI request duration',
    ['method', 'endpoint']
)

# 挂载 Prometheus 端点
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

@app.middleware("http")
async def prometheus_middleware(request, call_next):
    # 记录请求开始时间
    import time
    start_time = time.time()

    # 处理请求
    response = await call_next(request)

    # 记录指标
    request_duration.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(time.time() - start_time)

    request_count.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()

    return response
```

---

## 📚 学习资源

- **FastAPI 测试文档**：https://fastapi.tiangolo.com/tutorial/testing/
- **Docker 文档**：https://docs.docker.com/
- **Kubernetes 文档**：https://kubernetes.io/docs/
- **GitHub Actions 文档**：https://docs.github.com/actions

---

## 🎉 总结

通过本文，你学习了：

1. **测试 FastAPI**：单元测试、集成测试
2. **Docker 部署**：Dockerfile、Docker Compose
3. **Kubernetes 部署**：Deployment、Service、ConfigMap
4. **CI/CD 流程**：GitHub Actions 自动化
5. **安全最佳实践**：HTTPS、安全头、环境变量
6. **监控与日志**：Prometheus、日志配置

掌握这些技能，你将能够将 FastAPI 应用安全、可靠地部署到生产环境！

---

*最后更新：2026年3月11日*
