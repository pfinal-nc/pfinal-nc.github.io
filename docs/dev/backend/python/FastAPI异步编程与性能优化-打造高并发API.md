---
title: "FastAPI 异步编程与性能优化：打造高并发 API"
date: 2026-03-11 00:00:00
author: PFinal南丞
description: "深入理解 FastAPI 的异步编程机制和性能优化技巧，学习如何打造高并发的 API。包括异步 I/O、数据库优化、缓存策略、并发控制等高级主题。"
keywords:
  - FastAPI
  - 异步编程
  - 性能优化
  - 高并发
  - async/await
  - 数据库优化
  - 缓存
  - 并发控制
tags:
  - python
  - fastapi
  - async
  - performance
  - optimization
  - high-concurrency
difficulty: 高级
---

# FastAPI 异步编程与性能优化：打造高并发 API

> 深入理解 FastAPI 的异步编程机制和性能优化技巧，学习如何打造高并发的 API。包括异步 I/O、数据库优化、缓存策略、并发控制等高级主题。

---

## 📖 异步编程基础

### 同步 vs 异步

#### 同步编程

```python
import time
from fastapi import FastAPI

app = FastAPI()

@app.get("/sync")
async def sync_endpoint():
    """
    同步端点
    """
    # 阻塞操作
    time.sleep(2)  # 阻塞 2 秒
    return {"message": "sync completed"}
```

**问题**：
- `time.sleep(2)` 会阻塞整个事件循环
- 无法处理其他请求
- 并发性能差

#### 异步编程

```python
import asyncio
from fastapi import FastAPI

app = FastAPI()

@app.get("/async")
async def async_endpoint():
    """
    异步端点
    """
    # 非阻塞操作
    await asyncio.sleep(2)  # 非阻塞 2 秒
    return {"message": "async completed"}
```

**优势**：
- `asyncio.sleep(2)` 不会阻塞事件循环
- 可以处理其他请求
- 并发性能好

---

## 🚀 异步 I/O 操作

### 异步 HTTP 请求

使用 `httpx`（异步 HTTP 客户端）：

```python
import httpx
from fastapi import FastAPI
from typing import List

app = FastAPI()

@app.get("/fetch-multiple")
async def fetch_multiple_urls():
    """
    并发请求多个 URL
    """
    urls = [
        "https://api.example.com/users/1",
        "https://api.example.com/users/2",
        "https://api.example.com/users/3",
    ]

    async with httpx.AsyncClient() as client:
        # 并发请求
        responses = await asyncio.gather(*[
            client.get(url) for url in urls
        ])

        return [
            {"url": url, "status": response.status_code}
            for url, response in zip(urls, responses)
        ]
```

### 异步文件操作

使用 `aiofiles`（异步文件操作）：

```python
import aiofiles
from fastapi import FastAPI, UploadFile, File

app = FastAPI()

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    异步上传文件
    """
    # 异步写入文件
    async with aiofiles.open(f"uploads/{file.filename}", "wb") as f:
        content = await file.read()
        await f.write(content)

    return {"filename": file.filename, "status": "uploaded"}

@app.get("/files/{filename}")
async def read_file(filename: str):
    """
    异步读取文件
    """
    async with aiofiles.open(f"uploads/{filename}", "rb") as f:
        content = await f.read()

    return {"filename": filename, "size": len(content)}
```

---

## 🗄️ 异步数据库操作

### AsyncPG（PostgreSQL）

```python
import asyncpg
from fastapi import FastAPI, Depends
from typing import List, Optional

app = FastAPI()

# 数据库连接池
class Database:
    def __init__(self, dsn: str):
        self.dsn = dsn
        self.pool = None

    async def connect(self):
        self.pool = await asyncpg.create_pool(
            self.dsn,
            min_size=5,
            max_size=20
        )

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
    async with db.pool.acquire() as connection:
        yield connection

# 用户模型
class User:
    def __init__(self, id, username, email):
        self.id = id
        self.username = username
        self.email = email

# CRUD 操作
@app.get("/users/", response_model=List[dict])
async def get_users(
    skip: int = 0,
    limit: int = 10,
    db=Depends(get_db)
):
    """
    获取用户列表
    """
    users = await db.fetch(
        "SELECT * FROM users OFFSET $1 LIMIT $2",
        skip,
        limit
    )
    return [dict(user) for user in users]

@app.get("/users/{user_id}")
async def get_user(user_id: int, db=Depends(get_db)):
    """
    获取单个用户
    """
    user = await db.fetchrow(
        "SELECT * FROM users WHERE id = $1",
        user_id
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return dict(user)

@app.post("/users/")
async def create_user(
    username: str,
    email: str,
    db=Depends(get_db)
):
    """
    创建用户
    """
    user_id = await db.fetchval(
        "INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id",
        username,
        email
    )

    return {"id": user_id, "username": username, "email": email}
```

### Motor（MongoDB）

```python
import motor.motor_asyncio
from fastapi import FastAPI, Depends, HTTPException
from typing import List

app = FastAPI()

# MongoDB 客户端
client = motor.motor_asyncio.AsyncIOMotorClient(
    "mongodb://localhost:27017"
)
db = client.mydb

# 数据库依赖
async def get_db():
    yield db

# 用户模型
class User:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

# CRUD 操作
@app.get("/users/", response_model=List[dict])
async def get_users(
    skip: int = 0,
    limit: int = 10,
    db=Depends(get_db)
):
    """
    获取用户列表
    """
    cursor = db.users.find().skip(skip).limit(limit)
    users = await cursor.to_list(length=limit)
    return users

@app.get("/users/{user_id}")
async def get_user(user_id: str, db=Depends(get_db)):
    """
    获取单个用户
    """
    user = await db.users.find_one({"_id": user_id})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user

@app.post("/users/")
async def create_user(
    username: str,
    email: str,
    db=Depends(get_db)
):
    """
    创建用户
    """
    user = {
        "username": username,
        "email": email
    }
    result = await db.users.insert_one(user)

    user["_id"] = str(result.inserted_id)
    return user
```

---

## ⚡ 性能优化技巧

### 1. 连接池优化

```python
import asyncpg
from fastapi import FastAPI

app = FastAPI()

# 优化连接池配置
db = await asyncpg.create_pool(
    "postgresql://user:password@localhost/mydb",
    min_size=5,      # 最小连接数
    max_size=20,     # 最大连接数
    max_queries=50000,  # 单个连接最大查询数
    max_inactive_connection_lifetime=300.0,  # 连接最大空闲时间（秒）
    command_timeout=60  # 命令超时时间（秒）
)
```

### 2. 批量查询

```python
import asyncpg
from fastapi import FastAPI, Depends

app = FastAPI()

@app.get("/users/batch")
async def get_users_batch(user_ids: List[int], db=Depends(get_db)):
    """
    批量获取用户（比多次单独查询快得多）
    """
    # 使用 IN 子句批量查询
    users = await db.fetch(
        "SELECT * FROM users WHERE id = ANY($1)",
        user_ids
    )

    return [dict(user) for user in users]
```

### 3. 数据库索引

```sql
-- 为常用查询字段创建索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- 复合索引
CREATE INDEX idx_users_status_created ON users(status, created_at);
```

### 4. 查询优化

```python
import asyncpg
from fastapi import FastAPI, Depends

app = FastAPI()

@app.get("/users/search")
async def search_users(
    username: str | None = None,
    email: str | None = None,
    limit: int = 10,
    db=Depends(get_db)
):
    """
    优化的用户搜索
    """
    # 只查询需要的字段
    query = "SELECT id, username, email FROM users WHERE 1=1"
    params = []
    param_index = 1

    if username:
        query += f" AND username LIKE ${param_index}"
        params.append(f"%{username}%")
        param_index += 1

    if email:
        query += f" AND email LIKE ${param_index}"
        params.append(f"%{email}%")
        param_index += 1

    query += f" LIMIT ${param_index}"
    params.append(limit)

    users = await db.fetch(query, *params)
    return [dict(user) for user in users]
```

---

## 🧠 缓存策略

### Redis 缓存

```python
import aioredis
from fastapi import FastAPI, Depends
import json
from typing import Optional

app = FastAPI()

# Redis 客户端
redis = aioredis.from_url("redis://localhost")

# 缓存依赖
async def get_cache():
    yield redis

# 缓存装饰器
def cache_key(prefix: str, *args, **kwargs):
    """生成缓存键"""
    key_parts = [prefix]
    key_parts.extend(str(arg) for arg in args)
    key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
    return ":".join(key_parts)

@app.get("/users/{user_id}")
async def get_user(
    user_id: int,
    cache=Depends(get_cache),
    db=Depends(get_db)
):
    """
    带缓存的用户查询
    """
    # 尝试从缓存获取
    cache_key = f"user:{user_id}"
    cached_user = await cache.get(cache_key)

    if cached_user:
        return json.loads(cached_user)

    # 从数据库查询
    user = await db.fetchrow(
        "SELECT * FROM users WHERE id = $1",
        user_id
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_dict = dict(user)

    # 存入缓存（过期时间 1 小时）
    await cache.setex(
        cache_key,
        3600,  # 1 小时
        json.dumps(user_dict)
    )

    return user_dict

@app.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    cache=Depends(get_cache),
    db=Depends(get_db)
):
    """
    删除用户并清除缓存
    """
    # 删除数据库记录
    await db.execute("DELETE FROM users WHERE id = $1", user_id)

    # 清除缓存
    cache_key = f"user:{user_id}"
    await cache.delete(cache_key)

    return {"message": "User deleted"}
```

### 响应缓存

```python
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
import hashlib
import json

app = FastAPI()

@app.get("/data")
async def get_data(request: Request):
    """
    使用 ETag 进行响应缓存
    """
    # 模拟数据
    data = {"message": "Hello", "timestamp": time.time()}

    # 生成 ETag
    etag = hashlib.md5(json.dumps(data).encode()).hexdigest()

    # 检查客户端缓存
    if_none_match = request.headers.get("If-None-Match")
    if if_none_match == etag:
        return Response(status_code=304)  # Not Modified

    # 返回数据和 ETag
    response = JSONResponse(content=data)
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "public, max-age=3600"

    return response
```

---

## 🔢 并发控制

### 信号量限制

```python
import asyncio
from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool

app = FastAPI()

# 创建信号量（限制同时进行的数据库操作数量）
db_semaphore = asyncio.Semaphore(10)

async def limited_db_operation(operation, *args, **kwargs):
    """
    限制并发的数据库操作
    """
    async with db_semaphore:
        return await operation(*args, **kwargs)

@app.get("/heavy-operation")
async def heavy_operation():
    """
    耗时操作（受并发限制）
    """
    def sync_heavy_task():
        # 模拟 CPU 密集型任务
        import time
        time.sleep(2)
        return {"result": "completed"}

    # 在线程池中执行同步任务
    result = await limited_db_operation(
        run_in_threadpool,
        sync_heavy_task
    )

    return result
```

### 背景任务

```python
from fastapi import FastAPI, BackgroundTasks
import asyncio

app = FastAPI()

def send_email(email: str, message: str):
    """
    发送邮件（后台任务）
    """
    # 模拟发送邮件
    import time
    time.sleep(3)
    print(f"Email sent to {email}: {message}")

@app.post("/send-email")
async def send_email_endpoint(
    email: str,
    message: str,
    background_tasks: BackgroundTasks
):
    """
    发送邮件（异步后台任务）
    """
    background_tasks.add_task(send_email, email, message)
    return {"message": "Email will be sent in background"}

# 使用 Celery 处理长时间运行的任务
@app.post("/long-task")
async def long_task(background_tasks: BackgroundTasks):
    """
    长时间运行的任务
    """
    def long_running_task():
        import time
        for i in range(10):
            time.sleep(1)
            print(f"Task progress: {i+1}/10")

    background_tasks.add_task(long_running_task)
    return {"message": "Task started"}
```

---

## 📊 监控与性能分析

### 请求时间记录

```python
import time
from fastapi import FastAPI, Request
import logging

app = FastAPI()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    记录请求时间
    """
    start_time = time.time()

    # 处理请求
    response = await call_next(request)

    # 计算处理时间
    process_time = (time.time() - start_time) * 1000

    # 记录日志
    logger.info(
        f"Method: {request.method} | "
        f"Path: {request.url.path} | "
        f"Status: {response.status_code} | "
        f"Time: {process_time:.2f}ms"
    )

    # 添加响应头
    response.headers["X-Process-Time"] = f"{process_time:.2f}ms"

    return response
```

### Prometheus 指标

```python
from fastapi import FastAPI, Request
from prometheus_client import Counter, Histogram, generate_latest
from prometheus_client import CONTENT_TYPE_LATEST
import time

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

@app.middleware("http")
async def prometheus_metrics(request: Request, call_next):
    """
    Prometheus 指标中间件
    """
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

@app.get("/metrics")
async def metrics():
    """
    Prometheus 指标端点
    """
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )
```

---

## 🎯 性能基准测试

### 使用 Locust 进行压力测试

```python
# locustfile.py
from locust import HttpUser, task, between
import random

class FastAPIUser(HttpUser):
    wait_time = between(1, 3)  # 请求间隔 1-3 秒

    @task(3)
    def get_users(self):
        """获取用户列表（权重 3）"""
        self.client.get("/users/")

    @task(2)
    def get_user(self):
        """获取单个用户（权重 2）"""
        user_id = random.randint(1, 100)
        self.client.get(f"/users/{user_id}")

    @task(1)
    def create_user(self):
        """创建用户（权重 1）"""
        self.client.post("/users/", json={
            "username": f"user_{random.randint(1, 10000)}",
            "email": f"user{random.randint(1, 10000)}@example.com"
        })
```

**运行 Locust**：

```bash
locust -f locustfile.py --host=http://localhost:8000
```

---

## 💡 性能优化清单

### 数据库优化

- ✅ 使用连接池
- ✅ 创建合适的索引
- ✅ 优化 SQL 查询
- ✅ 使用批量操作
- ✅ 只查询需要的字段

### 缓存优化

- ✅ 使用 Redis 缓存热点数据
- ✅ 使用 ETag 进行响应缓存
- ✅ 设置合理的缓存过期时间
- ✅ 缓存失效策略

### 并发优化

- ✅ 使用异步 I/O
- ✅ 限制并发连接数
- ✅ 使用后台任务处理耗时操作
- ✅ 使用连接池

### 监控优化

- ✅ 记录请求时间
- ✅ 监控资源使用
- ✅ 收集性能指标
- ✅ 定期进行压力测试

---

## 📚 学习资源

- **FastAPI 官方文档**：https://fastapi.tiangolo.com/async/
- **AsyncPG 文档**：https://magicstack.github.io/asyncpg/
- **Motor 文档**：https://motor.readthedocs.io/
- **Locust 文档**：https://locust.io/

---

## 🎉 总结

通过本文，你学习了：

1. **异步编程基础**：同步 vs 异步，async/await
2. **异步 I/O**：HTTP 请求、文件操作
3. **异步数据库**：AsyncPG、Motor
4. **性能优化**：连接池、批量查询、索引
5. **缓存策略**：Redis 缓存、响应缓存
6. **并发控制**：信号量、后台任务
7. **监控分析**：Prometheus、Locust

掌握这些技巧，你将能够打造高性能、高并发的 FastAPI 应用！

---

*最后更新：2026年3月11日*
