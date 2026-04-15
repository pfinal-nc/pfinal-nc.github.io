---
title: "FastAPI 实战案例：从零构建企业级 API"
date: 2026-03-11 00:00:00
author: PFinal南丞
description: "通过一个完整的实战案例，学习如何从零开始构建企业级 FastAPI 应用。包括项目架构、数据库设计、认证授权、API 文档、部署上线等完整流程。"
keywords:
  - FastAPI
  - 企业级API
  - 实战案例
  - 项目架构
  - 数据库设计
  - 认证授权
  - API文档
  - 完整流程
tags:
  - python
  - fastapi
  - case-study
  - enterprise
  - architecture
  - full-stack
  - production
difficulty: 高级
---

# FastAPI 实战案例：从零构建企业级 API

> 通过一个完整的实战案例，学习如何从零开始构建企业级 FastAPI 应用。包括项目架构、数据库设计、认证授权、API 文档、部署上线等完整流程。

---

## 📋 项目概述

### 项目目标

我们将构建一个**博客管理系统 API**，包含以下功能：

- ✅ 用户认证与授权
- ✅ 文章 CRUD 操作
- ✅ 评论系统
- ✅ 标签分类
- ✅ 权限管理
- ✅ API 文档
- ✅ 数据验证
- ✅ 异常处理

### 技术栈

- **后端框架**：FastAPI 0.104+
- **数据库**：PostgreSQL 15
- **ORM**：SQLAlchemy 2.0
- **异步驱动**：AsyncPG
- **认证**：JWT (python-jose)
- **数据验证**：Pydantic v2
- **API 文档**：Swagger UI / ReDoc
- **部署**：Docker + Nginx

---

## 🏗️ 项目架构

### 目录结构

```
blog-api/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 应用入口
│   ├── config.py            # 配置管理
│   ├── database.py          # 数据库连接
│   ├── models.py            # SQLAlchemy 模型
│   ├── schemas.py           # Pydantic 模式
│   ├── crud.py              # CRUD 操作
│   ├── api/                 # API 路由
│   │   ├── __init__.py
│   │   ├── deps.py          # 依赖注入
│   │   ├── auth.py          # 认证路由
│   │   ├── users.py         # 用户路由
│   │   ├── posts.py         # 文章路由
│   │   └── comments.py      # 评论路由
│   ├── core/                # 核心功能
│   │   ├── __init__.py
│   │   ├── security.py      # 安全相关
│   │   └── deps.py          # 公共依赖
│   └── utils/               # 工具函数
│       ├── __init__.py
│       └── helpers.py
├── alembic/                 # 数据库迁移
│   ├── versions/
│   └── env.py
├── tests/                   # 测试
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_users.py
│   ├── test_posts.py
│   └── test_comments.py
├── docker/                  # Docker 配置
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── nginx.conf
├── docs/                    # 文档
│   └── api.md
├── .env                     # 环境变量
├── .env.example             # 环境变量示例
├── alembic.ini               # Alembic 配置
├── requirements.txt         # 依赖列表
├── Dockerfile
├── docker-compose.yml
└── README.md
```

### 依赖文件

创建 `requirements.txt`：

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
asyncpg==0.29.0
alembic==1.13.0
pydantic==2.5.0
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
email-validator==2.1.0
python-dotenv==1.0.0
pytest==7.4.3
pytest-asyncio==0.21.1
httpx==0.25.2
```

---

## ⚙️ 配置管理

### 环境变量

创建 `.env` 文件：

```env
# 应用配置
APP_NAME=Blog API
APP_VERSION=1.0.0
DEBUG=True

# 数据库配置
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/blog_db

# JWT 配置
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Redis 配置
REDIS_URL=redis://localhost:6379/0

# CORS 配置
CORS_ORIGINS=["http://localhost:3000","http://localhost:8080"]
```

### 配置类

创建 `app/config.py`：

```python
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """应用配置"""

    # 应用配置
    app_name: str = "Blog API"
    app_version: str = "1.0.0"
    debug: bool = True

    # 数据库配置
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/blog_db"

    # JWT 配置
    secret_key: str = "your-secret-key-here"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Redis 配置
    redis_url: str = "redis://localhost:6379/0"

    # CORS 配置
    cors_origins: List[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
```

---

## 🗄️ 数据库设计

### 模型定义

创建 `app/models.py`：

```python
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()

# 多对多关系表
post_tags = Table(
    'post_tags',
    Base.metadata,
    Column('post_id', Integer, ForeignKey('posts.id'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id'), primary_key=True)
)


class User(Base):
    """用户模型"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    full_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关系
    posts = relationship("Post", back_populates="author")
    comments = relationship("Comment", back_populates="author")


class Post(Base):
    """文章模型"""
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(String(500))
    published = Column(Boolean, default=False)
    view_count = Column(Integer, default=0)
    author_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关系
    author = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary=post_tags, back_populates="posts")


class Comment(Base):
    """评论模型"""
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"))
    post_id = Column(Integer, ForeignKey("posts.id"))
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    author = relationship("User", back_populates="comments")
    post = relationship("Post", back_populates="comments")
    parent = relationship("Comment", remote_side=[id])


class Tag(Base):
    """标签模型"""
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    slug = Column(String(50), unique=True, index=True, nullable=False)

    # 关系
    posts = relationship("Post", secondary=post_tags, back_populates="tags")
```

### 数据库连接

创建 `app/database.py`：

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# 创建异步引擎
engine = create_async_engine(settings.database_url, echo=settings.debug)

# 创建异步会话工厂
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# 依赖注入
async def get_db() -> AsyncSession:
    """获取数据库会话"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """初始化数据库"""
    from app.models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

---

## 🔐 认证与授权

### JWT 工具

创建 `app/core/security.py`：

```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings

# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """生成密码哈希"""
    return pwd_context.hash(password)


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
) -> str:
    """创建访问令牌"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.access_token_expire_minutes
        )

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.secret_key,
        algorithm=settings.algorithm
    )

    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """解码访问令牌"""
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm]
        )
        return payload
    except JWTError:
        return None
```

### Pydantic 模式

创建 `app/schemas.py`：

```python
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """用户基础模型"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """用户创建模型"""
    password: str = Field(..., min_length=8, max_length=100)


class UserUpdate(BaseModel):
    """用户更新模型"""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None


class User(UserBase):
    """用户响应模型"""
    id: int
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    """用户登录模型"""
    username: str
    password: str


class Token(BaseModel):
    """令牌响应模型"""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """令牌数据模型"""
    username: Optional[str] = None


class PostBase(BaseModel):
    """文章基础模型"""
    title: str = Field(..., min_length=1, max_length=200)
    content: str
    summary: Optional[str] = None
    published: bool = False


class PostCreate(PostBase):
    """文章创建模型"""
    tags: Optional[list[int]] = []


class PostUpdate(BaseModel):
    """文章更新模型"""
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    published: Optional[bool] = None
    tags: Optional[list[int]] = None


class Post(PostBase):
    """文章响应模型"""
    id: int
    author_id: int
    view_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CommentBase(BaseModel):
    """评论基础模型"""
    content: str = Field(..., min_length=1)


class CommentCreate(CommentBase):
    """评论创建模型"""
    parent_id: Optional[int] = None


class Comment(CommentBase):
    """评论响应模型"""
    id: int
    author_id: int
    post_id: int
    parent_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True
```

### 认证依赖

创建 `app/api/deps.py`：

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.core.security import decode_access_token
from app.models import User
from app.schemas import TokenData

# OAuth2 密码流
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """获取当前用户"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 解码令牌
    token_data = decode_access_token(token)
    if token_data is None:
        raise credentials_exception

    # 获取用户
    username = token_data.get("sub")
    if username is None:
        raise credentials_exception

    result = await db.execute(
        select(User).where(User.username == username)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """获取当前激活用户"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="用户未激活")
    return current_user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """获取当前管理员用户"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="权限不足"
        )
    return current_user
```

---

## 🔌 API 路由

### 认证路由

创建 `app/api/auth.py`：

```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta

from app.database import get_db
from app.models import User
from app.schemas import UserCreate, User, Token
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token
)
from app.config import settings

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """注册新用户"""

    # 检查用户名是否已存在
    result = await db.execute(
        select(User).where(User.username == user_in.username)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="用户名已被使用"
        )

    # 检查邮箱是否已存在
    result = await db.execute(
        select(User).where(User.email == user_in.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="邮箱已被使用"
        )

    # 创建用户
    user = User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password)
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """用户登录"""

    # 查找用户
    result = await db.execute(
        select(User).where(User.username == form_data.username)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 创建访问令牌
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}
```

### 文章路由

创建 `app/api/posts.py`：

```python
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional, List

from app.database import get_db
from app.models import Post, User, Tag
from app.schemas import PostCreate, PostUpdate, Post
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/posts", tags=["文章"])


@router.get("/", response_model=List[Post])
async def get_posts(
    skip: int = 0,
    limit: int = 10,
    published: Optional[bool] = None,
    tag_id: Optional[int] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """获取文章列表"""

    # 构建查询
    query = select(Post).options(selectinload(Post.tags))

    # 过滤条件
    if published is not None:
        query = query.where(Post.published == published)

    if tag_id is not None:
        query = query.join(Post.tags).where(Tag.id == tag_id)

    if search:
        query = query.where(Post.title.ilike(f"%{search}%"))

    # 分页
    query = query.offset(skip).limit(limit)
    query = query.order_by(Post.created_at.desc())

    # 执行查询
    result = await db.execute(query)
    posts = result.scalars().all()

    return posts


@router.get("/{post_id}", response_model=Post)
async def get_post(
    post_id: int,
    db: AsyncSession = Depends(get_db)
):
    """获取单个文章"""

    result = await db.execute(
        select(Post)
        .options(selectinload(Post.tags))
        .where(Post.id == post_id)
    )
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=404, detail="文章不存在")

    # 增加浏览量
    post.view_count += 1
    await db.commit()

    return post


@router.post("/", response_model=Post, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_in: PostCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """创建文章"""

    # 创建文章
    post = Post(
        title=post_in.title,
        content=post_in.content,
        summary=post_in.summary,
        published=post_in.published,
        author_id=current_user.id
    )

    # 添加标签
    if post_in.tags:
        result = await db.execute(
            select(Tag).where(Tag.id.in_(post_in.tags))
        )
        tags = result.scalars().all()
        post.tags = tags

    db.add(post)
    await db.commit()
    await db.refresh(post)

    return post


@router.put("/{post_id}", response_model=Post)
async def update_post(
    post_id: int,
    post_in: PostUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """更新文章"""

    # 查找文章
    result = await db.execute(
        select(Post).where(Post.id == post_id)
    )
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=404, detail="文章不存在")

    # 检查权限
    if post.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="无权限操作")

    # 更新字段
    update_data = post_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field != "tags":
            setattr(post, field, value)

    # 更新标签
    if "tags" in update_data and post_in.tags is not None:
        result = await db.execute(
            select(Tag).where(Tag.id.in_(post_in.tags))
        )
        tags = result.scalars().all()
        post.tags = tags

    await db.commit()
    await db.refresh(post)

    return post


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """删除文章"""

    # 查找文章
    result = await db.execute(
        select(Post).where(Post.id == post_id)
    )
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=404, detail="文章不存在")

    # 检查权限
    if post.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="无权限操作")

    # 删除文章
    await db.delete(post)
    await db.commit()

    return None
```

---

## 🚀 主应用入口

创建 `app/main.py`：

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import auth, posts
from app.database import init_db

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="基于 FastAPI 的博客管理系统 API"
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth.router, prefix="/api")
app.include_router(posts.router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    """应用启动事件"""
    await init_db()


@app.get("/")
async def root():
    """根端点"""
    return {
        "message": "欢迎使用博客 API",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
async def health():
    """健康检查"""
    return {"status": "healthy"}
```

---

## 📚 API 文档

FastAPI 自动生成 API 文档：

- **Swagger UI**：http://localhost:8000/docs
- **ReDoc**：http://localhost:8000/redoc
- **OpenAPI JSON**：http://localhost:8000/openapi.json

### 自定义文档

```python
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

app = FastAPI()

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=settings.app_name,
        version=settings.app_version,
        description="基于 FastAPI 的博客管理系统 API",
        routes=app.routes,
    )

    # 添加自定义信息
    openapi_schema["info"]["x-logo"] = {
        "url": "https://fastapi.tiangolo.com/img/logo-margin/logo-teal.png"
    }

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
```

---

## 🐳 Docker 部署

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 创建非 root 用户
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 启动应用
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://user:password@db:5432/blog_db
      - SECRET_KEY=your-secret-key-here
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=blog_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## 🎯 测试

### 运行测试

```bash
# 运行所有测试
pytest

# 运行特定文件
pytest tests/test_auth.py

# 显示详细输出
pytest -v

# 显示覆盖率
pytest --cov=app --cov-report=html
```

---

## 📚 学习资源

- **FastAPI 官方文档**：https://fastapi.tiangolo.com/
- **SQLAlchemy 文档**：https://docs.sqlalchemy.org/
- **Alembic 文档**：https://alembic.sqlalchemy.org/

---

## 🎉 总结

通过这个完整的实战案例，我们构建了一个功能齐全的企业级 FastAPI 应用，包括：

1. ✅ **项目架构**：清晰的目录结构
2. ✅ **数据库设计**：用户、文章、评论、标签
3. ✅ **认证授权**：JWT 认证、权限管理
4. ✅ **API 路由**：CRUD 操作
5. ✅ **数据验证**：Pydantic 模式
6. ✅ **异常处理**：统一的错误响应
7. ✅ **API 文档**：Swagger UI / ReDoc
8. ✅ **Docker 部署**：容器化部署

这个项目可以作为你构建企业级 API 的参考模板！

---

*最后更新：2026年3月11日*
