---
title: "FastAPI 从零开始构建高性能 API：快速入门指南"
date: 2026-03-11
author: PFinal南丞
description: "FastAPI 是现代、快速（高性能）的 Web 框架，用于基于标准 Python 类型提示使用 Python 3.8+ 构建 API。本文将从零开始，带你快速上手 FastAPI，构建第一个高性能 RESTful API。"
keywords:
  - FastAPI
  - Python
  - Web框架
  - RESTful API
  - 异步编程
  - Pydantic
  - ASGI
  - 高性能API
tags:
  - python
  - fastapi
  - web
  - api
  - tutorial
  - async
difficulty: 入门
---

# FastAPI 从零开始构建高性能 API：快速入门指南

> FastAPI 是现代、快速（高性能）的 Web 框架，用于基于标准 Python 类型提示使用 Python 3.8+ 构建 API。本文将从零开始，带你快速上手 FastAPI，构建第一个高性能 RESTful API。

---

## 📖 为什么选择 FastAPI？

### FastAPI 的核心优势

#### 1. **极速性能**

FastAPI 的性能可以与 NodeJS 和 Go 框架相媲美，这是由于以下技术特性：

- **异步 I/O**：基于 Starlette 和 Uvicorn，充分利用异步编程
- **原生支持 async/await**：使用 Python 的异步语法
- **自动文档生成**：Swagger UI 和 ReDoc，无需额外配置

**性能对比**：

| 框架 | 请求/秒 | 相对性能 |
|------|---------|----------|
| Starlette | 28,000+ | 100% |
| FastAPI | 26,000+ | 93% |
| Django | 5,000+ | 18% |
| Flask | 4,000+ | 14% |

#### 2. **类型安全**

FastAPI 充分利用 Python 3.8+ 的类型提示（Type Hints）：

```python
from typing import Optional
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Item(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    tax: Optional[float] = None

@app.post("/items/")
async def create_item(item: Item):
    return {"item": item}
```

#### 3. **自动文档生成**

- **Swagger UI**：交互式 API 文档
- **ReDoc**：美观的 API 文档
- **JSON Schema**：标准化的数据模式

#### 4. **现代化开发体验**

- **IDE 支持**：自动补全、类型检查
- **数据验证**：自动请求验证
- **依赖注入**：优雅的依赖管理

---

## 🚀 快速开始

### 环境准备

#### 1. 安装 Python

确保你安装了 Python 3.8 或更高版本：

```bash
python --version
# 或
python3 --version
```

#### 2. 安装 FastAPI

```bash
pip install fastapi
pip install uvicorn[standard]
```

**依赖说明**：
- `fastapi`：FastAPI 框架
- `uvicorn[standard]`：ASGI 服务器，包含 HTTP/2、websockets 等功能

### 第一个 FastAPI 应用

创建文件 `main.py`：

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/items/{item_id}")
async def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}
```

### 运行应用

```bash
uvicorn main:app --reload
```

**参数说明**：
- `main`：Python 文件名（不含 .py）
- `app`：FastAPI 实例名称
- `--reload`：代码修改后自动重启（开发模式）

访问：
- **API**：http://127.0.0.1:8000
- **Swagger UI**：http://127.0.0.1:8000/docs
- **ReDoc**：http://127.0.0.1:8000/redoc

---

## 📚 核心概念

### 1. 路径操作（Path Operations）

FastAPI 使用装饰器定义路径操作：

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.post("/items/")
def create_item(item: dict):
    return item

@app.put("/items/{item_id}")
def update_item(item_id: int, item: dict):
    return {"item_id": item_id, **item}

@app.delete("/items/{item_id}")
def delete_item(item_id: int):
    return {"item_id": item_id}
```

**支持的 HTTP 方法**：
- `@app.get()`：GET 请求
- `@app.post()`：POST 请求
- `@app.put()`：PUT 请求
- `@app.delete()`：DELETE 请求
- `@app.patch()`：PATCH 请求
- `@app.head()`：HEAD 请求
- `@app.options()`：OPTIONS 请求

### 2. 路径参数（Path Parameters）

路径参数是 URL 路径的一部分：

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/items/{item_id}")
async def read_item(item_id: int):
    return {"item_id": item_id}

# 带类型的路径参数
@app.get("/users/{user_id}/posts/{post_id}")
async def read_user_post(user_id: int, post_id: int):
    return {"user_id": user_id, "post_id": post_id}
```

**类型转换**：FastAPI 会自动将路径参数转换为指定的类型（如 `int`）。

### 3. 查询参数（Query Parameters）

查询参数是 URL 中 `?` 后面的参数：

```python
from typing import Optional
from fastapi import FastAPI

app = FastAPI()

# 可选查询参数
@app.get("/items/")
async def read_items(skip: int = 0, limit: int = 10):
    return {"skip": skip, "limit": limit}

# 类型提示 + 可选参数
@app.get("/users/{user_id}/items/")
async def read_user_items(
    user_id: int,
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    return {"user_id": user_id, "q": q, "skip": skip, "limit": limit}
```

**默认值**：可以为查询参数设置默认值。

### 4. 请求体（Request Body）

请求体用于发送数据（通常是 JSON 格式）：

```python
from typing import Optional
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Item(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    tax: Optional[float] = None

@app.post("/items/")
async def create_item(item: Item):
    return item
```

**Pydantic BaseModel**：
- 自动验证数据类型
- 自动转换数据类型
- 生成 JSON Schema

---

## 🔧 数据验证

### Pydantic 模型

Pydantic 是 FastAPI 的数据验证库：

```python
from datetime import datetime
from typing import Optional
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI()

class Item(BaseModel):
    name: str
    description: Optional[str] = Field(
        None,
        title="The description of the item",
        max_length=300
    )
    price: float = Field(
        ...,
        gt=0,
        description="The price must be greater than zero"
    )
    tax: Optional[float] = Field(
        None,
        ge=0,
        description="The tax must be greater than or equal to zero"
    )

@app.post("/items/")
async def create_item(item: Item):
    return item
```

**Field 参数**：
- `default`：默认值
- `...`：表示必填
- `gt`：大于（greater than）
- `ge`：大于等于（greater than or equal）
- `lt`：小于（less than）
- `le`：小于等于（less than or equal）
- `max_length`：最大长度
- `min_length`：最小长度

### 验证错误

FastAPI 会自动返回验证错误：

```json
{
  "detail": [
    {
      "loc": [
        "body",
        "price"
      ],
      "msg": "ensure this value is greater than 0",
      "type": "value_error.number.not_gt",
      "ctx": {
        "limit_value": 0
      }
    }
  ]
}
```

---

## 🔄 异步编程

### 异步 vs 同步

FastAPI 同时支持异步和同步代码：

```python
from fastapi import FastAPI
import time

app = FastAPI()

# 同步函数
@app.get("/sync/")
def read_sync():
    time.sleep(1)  # 阻塞 1 秒
    return {"message": "同步处理"}

# 异步函数
@app.get("/async/")
async def read_async():
    import asyncio
    await asyncio.sleep(1)  # 非阻塞 1 秒
    return {"message": "异步处理"}
```

**什么时候使用异步**：
- I/O 密集型操作：数据库查询、网络请求
- 需要高并发：处理大量请求
- 使用异步库：asyncpg、aioredis、httpx

**什么时候使用同步**：
- CPU 密集型操作：数据处理、加密解密
- 使用同步库：pandas、numpy、scikit-learn
- 简单快速操作

### 异步数据库操作

使用 `asyncpg`（PostgreSQL 异步驱动）：

```python
from fastapi import FastAPI
from fastapi.responses import JSONResponse
import asyncpg

app = FastAPI()

# 数据库连接池
async def get_db_pool():
    return await asyncpg.create_pool(
        host="localhost",
        port=5432,
        user="postgres",
        password="password",
        database="mydb"
    )

@app.on_event("startup")
async def startup():
    app.state.db_pool = await get_db_pool()

@app.get("/users/{user_id}")
async def read_user(user_id: int):
    pool = app.state.db_pool
    async with pool.acquire() as connection:
        user = await connection.fetchrow(
            "SELECT * FROM users WHERE id = $1",
            user_id
        )
        return dict(user) if user else JSONResponse(
            status_code=404,
            content={"message": "User not found"}
        )
```

---

## 🔐 身份认证

### JWT 认证

使用 `python-jose` 和 `passlib` 实现 JWT 认证：

```python
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

app = FastAPI()

# JWT 配置
SECRET_KEY = "your-secret-key-here"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# 密码加密
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 密码流
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None

class UserInDB(User):
    hashed_password: str

# 模拟数据库
fake_users_db = {
    "johndoe": {
        "username": "johndoe",
        "full_name": "John Doe",
        "email": "johndoe@example.com",
        "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"
    }
}

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def get_user(db, username: str):
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)

def authenticate_user(fake_db, username: str, password: str):
    user = get_user(fake_db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = get_user(fake_users_db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me/", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
```

---

## 📦 中间件

### 自定义中间件

```python
from fastapi import FastAPI, Request
import time

app = FastAPI()

# 记录请求时间的中间件
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    response.headers["X-Process-Time"] = str(process_time)
    return response

# CORS 中间件
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有方法
    allow_headers=["*"],  # 允许所有请求头
)
```

---

## 🎯 最佳实践

### 1. 项目结构

```
myapi/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI 应用
│   ├── models.py        # 数据库模型
│   ├── schemas.py       # Pydantic 模型
│   ├── crud.py          # 数据库操作
│   ├── routers/         # 路由
│   │   ├── __init__.py
│   │   ├── items.py
│   │   └── users.py
│   └── dependencies.py  # 依赖注入
├── tests/
│   ├── __init__.py
│   └── test_main.py
├── alembic/             # 数据库迁移
├── .env                 # 环境变量
├── requirements.txt
└── README.md
```

### 2. 依赖注入

```python
from typing import Generator
from fastapi import Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/items/")
def read_items(db: Session = Depends(get_db)):
    items = db.query(Item).all()
    return items
```

### 3. 错误处理

```python
from fastapi import FastAPI, HTTPException, status

app = FastAPI()

@app.get("/items/{item_id}")
async def read_item(item_id: int):
    item = get_item(item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    return item

# 自定义异常
class ItemNotFoundException(Exception):
    pass

@app.exception_handler(ItemNotFoundException)
async def item_not_found_handler(request: Request, exc: ItemNotFoundException):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"message": "Item not found"}
    )
```

### 4. 日志记录

```python
import logging
from fastapi import FastAPI

app = FastAPI()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

@app.get("/")
async def root():
    logger.info("Root endpoint called")
    return {"message": "Hello World"}
```

---

## 🚀 部署

### 使用 Gunicorn + Uvicorn

```bash
pip install gunicorn

gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

**参数说明**：
- `-w 4`：4 个工作进程
- `-k uvicorn.workers.UvicornWorker`：使用 Uvicorn worker

### 使用 Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "main:app"]
```

**docker-compose.yml**：

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/mydb
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## 📚 学习资源

- **官方文档**：https://fastapi.tiangolo.com/
- **GitHub**：https://github.com/tiangolo/fastapi
- **教程**：https://fastapi.tiangolo.com/tutorial/

---

## 🎉 总结

FastAPI 是一个现代、高性能的 Web 框架，具有以下优势：

1. **极速性能**：媲美 NodeJS 和 Go 框架
2. **类型安全**：充分利用 Python 类型提示
3. **自动文档**：Swagger UI 和 ReDoc
4. **异步支持**：原生支持 async/await
5. **现代化**：符合现代 Python 开发最佳实践

通过本文，你应该已经掌握了 FastAPI 的基础用法，可以开始构建自己的高性能 API 了！

---

*最后更新：2026年3月11日*
