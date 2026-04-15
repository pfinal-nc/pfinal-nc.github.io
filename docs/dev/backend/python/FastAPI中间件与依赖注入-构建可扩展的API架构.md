---
title: "FastAPI 中间件与依赖注入：构建可扩展的 API 架构"
date: 2026-03-11 00:00:00
author: PFinal南丞
description: "深入理解 FastAPI 的中间件和依赖注入机制，学习如何构建可扩展、可维护的 API 架构。包括自定义中间件、依赖注入、数据库连接、认证授权等高级主题。"
keywords:
  - FastAPI
  - 中间件
  - 依赖注入
  - API架构
  - 可扩展性
  - 数据库连接
  - 认证授权
  - Python
tags:
  - python
  - fastapi
  - middleware
  - dependency-injection
  - architecture
  - advanced
difficulty: 进阶
---

# FastAPI 中间件与依赖注入：构建可扩展的 API 架构

> 深入理解 FastAPI 的中间件和依赖注入机制，学习如何构建可扩展、可维护的 API 架构。包括自定义中间件、依赖注入、数据库连接、认证授权等高级主题。

---

## 📖 什么是中间件？

### 中间件的概念

中间件（Middleware）是位于客户端和应用程序之间的软件层，它可以：

- **拦截请求**：在请求到达路由处理函数之前处理
- **修改请求**：添加或修改请求头、查询参数等
- **记录日志**：记录请求和响应信息
- **处理异常**：全局异常处理
- **修改响应**：添加响应头、CORS 等

### FastAPI 中间件执行流程

```
客户端请求
    ↓
中间件 1
    ↓
中间件 2
    ↓
...
    ↓
路由处理函数
    ↓
...
    ↓
中间件 2
    ↓
中间件 1
    ↓
客户端响应
```

---

## 🚀 自定义中间件

### 基础中间件

```python
from fastapi import FastAPI, Request
import time

app = FastAPI()

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """
    添加请求处理时间到响应头
    """
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    response.headers["X-Process-Time"] = str(process_time)
    return response

@app.get("/")
async def root():
    return {"message": "Hello World"}
```

**测试**：

```bash
curl -I http://localhost:8000/
```

**响应头**：

```
X-Process-Time: 2.45
```

### 请求日志中间件

```python
from fastapi import FastAPI, Request
import time
import logging

app = FastAPI()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    记录所有请求的详细信息
    """
    start_time = time.time()

    # 记录请求信息
    logger.info(f"Request: {request.method} {request.url}")
    logger.info(f"Client: {request.client.host if request.client else 'unknown'}")
    logger.info(f"Headers: {dict(request.headers)}")

    # 处理请求
    response = await call_next(request)

    # 记录响应信息
    process_time = time.time() - start_time
    logger.info(f"Response: {response.status_code}")
    logger.info(f"Process Time: {process_time:.4f}s")

    return response
```

### 错误处理中间件

```python
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
import logging

app = FastAPI()

logging.basicConfig(level=logging.ERROR)
logger = logging.getLogger(__name__)

@app.middleware("http")
async def catch_exceptions(request: Request, call_next):
    """
    全局异常处理中间件
    """
    try:
        return await call_next(request)
    except Exception as exc:
        logger.error(f"Error occurred: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal Server Error"}
        )
```

### API 限流中间件

```python
from fastapi import FastAPI, Request, HTTPException, status
from collections import defaultdict
from time import time

app = FastAPI()

# 限流存储：{ip: [timestamps]}
rate_limiter = defaultdict(list)
RATE_LIMIT = 100  # 每分钟最多100个请求
TIME_WINDOW = 60  # 时间窗口（秒）

@app.middleware("http")
async def rate_limiter_middleware(request: Request, call_next):
    """
    API 限流中间件
    """
    client_ip = request.client.host if request.client else "unknown"
    current_time = time()

    # 清理过期时间戳
    rate_limiter[client_ip] = [
        ts for ts in rate_limiter[client_ip]
        if current_time - ts < TIME_WINDOW
    ]

    # 检查是否超过限制
    if len(rate_limiter[client_ip]) >= RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded"
        )

    # 记录请求时间
    rate_limiter[client_ip].append(current_time)

    # 处理请求
    return await call_next(request)

@app.get("/")
async def root():
    return {"message": "Hello World"}
```

---

## 🔐 认证授权中间件

### JWT 认证中间件

```python
from fastapi import FastAPI, Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from typing import Optional

app = FastAPI()

# JWT 配置
SECRET_KEY = "your-secret-key-here"
ALGORITHM = "HS256"

security = HTTPBearer()

async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    验证 JWT Token
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """
    JWT 认证中间件
    """
    # 跳过公开路由
    if request.url.path in ["/docs", "/redoc", "/openapi.json", "/login"]:
        return await call_next(request)

    # 检查 Authorization 头
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    # 验证 Token
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        request.state.user = payload
    except (IndexError, JWTError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

    return await call_next(request)

@app.get("/protected")
async def protected_route(request: Request):
    """
    需要认证的路由
    """
    user = request.state.user
    return {"message": "Access granted", "user": user}

@app.get("/public")
async def public_route():
    """
    公开路由
    """
    return {"message": "Public route"}
```

---

## 📦 依赖注入系统

### 什么是依赖注入？

依赖注入（Dependency Injection）是一种设计模式，它允许你：

- **解耦代码**：降低模块之间的耦合度
- **提高可测试性**：轻松注入 mock 对象
- **复用代码**：避免重复代码
- **简化配置**：集中管理配置

### FastAPI 依赖注入

FastAPI 的依赖注入系统非常强大且灵活：

```python
from fastapi import FastAPI, Depends
from typing import Optional

app = FastAPI()

# 定义依赖项
def common_parameters(
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    return {"q": q, "skip": skip, "limit": limit}

# 使用依赖项
@app.get("/items/")
async def read_items(commons: dict = Depends(common_parameters)):
    return commons

# 嵌套依赖
def query_extractor(q: Optional[str] = None):
    return q

def query_or_cookie_extractor(
    q: str = Depends(query_extractor),
    last_query: Optional[str] = None
):
    if not q:
        return last_query
    return q

@app.get("/items2/")
async def read_items2(
    query_or_default: str = Depends(query_or_cookie_extractor)
):
    return {"query_or_default": query_or_default}
```

---

## 🗄️ 数据库依赖注入

### SQLAlchemy 依赖

```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Generator, List
import uvicorn

from pydantic import BaseModel

app = FastAPI()

# OAuth2 配置
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# 数据库配置（使用 SQLite 示例）
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 定义数据库模型
class User(Base):
    __tablename__ = "users"

    id = int | None
    username = str
    email = str
    full_name = str | None
    hashed_password = str

Base.metadata.create_all(bind=engine)

# Pydantic 模型
class UserBase(BaseModel):
    email: str
    full_name: str | None = None

class UserCreate(UserBase):
    username: str
    password: str

class User(UserBase):
    id: int
    username: str

    class Config:
        from_attributes = True

# 数据库依赖
def get_db() -> Generator[Session, None, None]:
    """
    数据库会话依赖
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# CRUD 操作
def get_user(db: Session, user_id: int):
    """
    根据 ID 获取用户
    """
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    """
    根据邮箱获取用户
    """
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, user: UserCreate):
    """
    创建新用户
    """
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    fake_hashed_password = pwd_context.hash(user.password)

    db_user = User(
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        hashed_password=fake_hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# 路由
@app.post("/users/", response_model=User, status_code=status.HTTP_201_CREATED)
def create_user_route(user: UserCreate, db: Session = Depends(get_db)):
    """
    创建用户
    """
    db_user = get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    return create_user(db=db, user=user)

@app.get("/users/", response_model=List[User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    获取用户列表
    """
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@app.get("/users/{user_id}", response_model=User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    """
    根据 ID 获取用户
    """
    db_user = get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user
```

### AsyncPG 依赖（异步 PostgreSQL）

```python
from fastapi import FastAPI, Depends, HTTPException, status
from typing import Generator, Optional
import asyncpg
import uvicorn

app = FastAPI()

# 数据库连接池
class Database:
    def __init__(self, dsn: str):
        self.dsn = dsn
        self.pool = None

    async def connect(self):
        self.pool = await asyncpg.create_pool(self.dsn)

    async def disconnect(self):
        if self.pool:
            await self.pool.close()

# 全局数据库实例
db = Database(
    dsn="postgresql://user:password@localhost/mydb"
)

# 启动和关闭事件
@app.on_event("startup")
async def startup():
    await db.connect()

@app.on_event("shutdown")
async def shutdown():
    await db.disconnect()

# 数据库依赖
async def get_db():
    """
    异步数据库依赖
    """
    async with db.pool.acquire() as connection:
        yield connection

# 路由
@app.get("/users/{user_id}")
async def get_user(user_id: int, db=Depends(get_db)):
    """
    获取用户
    """
    user = await db.fetchrow(
        "SELECT id, username, email FROM users WHERE id = $1",
        user_id
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return dict(user)
```

---

## 🔧 配置管理

### 环境变量依赖

```python
from fastapi import FastAPI, Depends
from pydantic import BaseSettings
from typing import Optional

app = FastAPI()

# 配置类
class Settings(BaseSettings):
    # 数据库配置
    DATABASE_URL: str = "sqlite:///./test.db"
    DB_POOL_SIZE: int = 5

    # Redis 配置
    REDIS_URL: str = "redis://localhost:6379"

    # JWT 配置
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # 应用配置
    APP_NAME: str = "FastAPI Application"
    DEBUG: bool = True

    class Config:
        env_file = ".env"

# 创建配置实例
settings = Settings()

# 配置依赖
def get_settings() -> Settings:
    return settings

# 路由
@app.get("/config")
async def read_config(settings: Settings = Depends(get_settings)):
    return {
        "app_name": settings.APP_NAME,
        "debug": settings.DEBUG,
        "database_url": settings.DATABASE_URL
    }
```

**.env 文件**：

```env
DATABASE_URL=postgresql://user:password@localhost/mydb
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30
APP_NAME=My API
DEBUG=False
```

---

## 🧪 可复用的依赖

### 缓存依赖

```python
from fastapi import FastAPI, Depends, Request
from functools import wraps
import time
import json
from typing import Optional

app = FastAPI()

# 内存缓存
cache = {}

def cache_response(ttl: int = 60):
    """
    缓存装饰器依赖
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = kwargs.get('request')

            # 生成缓存键
            cache_key = f"{request.url.path}:{request.url.query}"

            # 检查缓存
            if cache_key in cache:
                cached_data, cached_time = cache[cache_key]
                if time.time() - cached_time < ttl:
                    return cached_data

            # 执行函数
            result = await func(*args, **kwargs)

            # 缓存结果
            cache[cache_key] = (result, time.time())

            return result
        return wrapper
    return decorator

@app.get("/data")
@cache_response(ttl=60)
async def get_data():
    """
    获取数据（带缓存）
    """
    # 模拟耗时操作
    import asyncio
    await asyncio.sleep(2)

    return {"data": "some data", "timestamp": time.time()}
```

---

## 🎯 最佳实践

### 1. 依赖注入最佳实践

```python
from fastapi import FastAPI, Depends
from typing import Generator

app = FastAPI()

# ✅ 好的做法：使用生成器
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ❌ 不好的做法：直接返回
def get_db_bad() -> Session:
    return SessionLocal()  # 资源泄漏
```

### 2. 中间件顺序

```python
app = FastAPI()

# 按顺序添加中间件
app.add_middleware(CORSMiddleware, ...)  # 第一个执行
app.add_middleware(SessionMiddleware, ...)  # 第二个执行
app.add_middleware(AuthenticationMiddleware, ...)  # 第三个执行

# 请求流程：
# CORSMiddleware → SessionMiddleware → AuthenticationMiddleware → 路由处理
```

### 3. 依赖缓存

```python
from fastapi import FastAPI, Depends

app = FastAPI()

class Settings:
    def __init__(self):
        self.config = {"key": "value"}

# 使用 use_cache=False 每次都创建新实例
def get_settings_no_cache() -> Settings:
    return Settings()

# 使用 use_cache=True（默认）每次返回同一个实例
def get_settings_cached() -> Settings:
    return Settings()

@app.get("/config1")
async def config1(settings1: Settings = Depends(get_settings_no_cache)):
    settings1.config["key"] = "modified1"
    return settings1

@app.get("/config2")
async def config2(settings2: Settings = Depends(get_settings_no_cache)):
    # settings2 是新实例，不会影响 config1
    return settings2
```

---

## 📚 学习资源

- **FastAPI 官方文档**：https://fastapi.tiangolo.com/tutorial/dependencies/
- **中间件文档**：https://fastapi.tiangolo.com/tutorial/middleware/
- **依赖注入文档**：https://fastapi.tiangolo.com/tutorial/dependencies/

---

## 🎉 总结

通过本文，你学习了：

1. **中间件机制**：如何创建和使用自定义中间件
2. **依赖注入**：如何使用 FastAPI 的依赖注入系统
3. **数据库连接**：如何注入数据库会话
4. **认证授权**：如何实现 JWT 认证
5. **配置管理**：如何管理应用配置
6. **最佳实践**：如何编写可维护的代码

掌握这些概念，你将能够构建可扩展、可维护的高性能 API 架构！

---

*最后更新：2026年3月11日*
