---
title: "MCP 服务器开发实战：构建 AI 编程助手扩展"
date: 2026-04-21 10:00:00
author: PFinal南丞
description: "深入讲解 Model Context Protocol (MCP) 协议、服务器开发、工具定义与 AI 助手集成，包含完整实战项目"
keywords:
  - MCP
  - Model Context Protocol
  - AI 编程助手
  - Claude
  - 工具调用
  - Function Calling
tags:
  - ai
  - mcp
  - llm
  - claude
  - tools
---

# MCP 服务器开发实战：构建 AI 编程助手扩展

Model Context Protocol (MCP) 是 Anthropic 推出的开放协议，旨在标准化 AI 助手与外部工具、数据源的集成方式。通过 MCP，开发者可以为 Claude 等 AI 助手扩展无限能力。

**AI 开发系列文章：**
- [向量数据库实战](./vector-database-guide.md) - RAG 应用基础
- [Golang 实现 RAG 系统](../../dev/backend/golang/Golang实现RAG系统-从OpenAI到向量数据库.md) - RAG 系统完整实战
- [Prompt Engineering 实战技巧](../../security/engineering/prompt-engineering.md) - 提示工程技巧
- [Go 基础语法速通](../../dev/backend/golang/go-basic-syntax.md) - Go 语言基础
- [gRPC 与 Protobuf 实战](../../dev/backend/golang/grpc-protobuf-guide.md) - 服务间通信

## 什么是 MCP？

### MCP 架构

```
┌─────────────────────────────────────────────────────────────┐
│                     MCP 架构图                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         JSON-RPC          ┌────────────┐ │
│  │   AI 助手     │ ◄──────────────────────► │ MCP 服务器 │ │
│  │  (Claude)    │      over stdio/SSE      │            │ │
│  └──────────────┘                           └─────┬──────┘ │
│        ▲                                          │        │
│        │                                          │        │
│        │  1. 发现工具                               │        │
│        │  2. 调用工具                               │        │
│        │  3. 获取资源                               │        │
│        │                                          ▼        │
│        │                                   ┌────────────┐ │
│        └───────────────────────────────────│ 外部服务/数据 │ │
│                                            │  - API      │ │
│                                            │  - 数据库    │ │
│                                            │  - 文件系统  │ │
│                                            └────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### MCP 核心概念

| 概念 | 说明 | 示例 |
|------|------|------|
| **Tools** | AI 可调用的函数 | 查询数据库、发送邮件 |
| **Resources** | AI 可读取的数据 | 文件内容、API 响应 |
| **Prompts** | 预定义的提示模板 | 代码审查模板 |
| **Sampling** | AI 请求用户确认 | 执行危险操作前确认 |

## MCP 服务器基础

### 1. 快速开始

```python
# server.py - 基础 MCP 服务器
from mcp.server import Server
from mcp.types import TextContent, Tool
import json

# 创建服务器
app = Server("my-mcp-server")

# 定义工具
@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="calculate",
            description="执行数学计算",
            inputSchema={
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "数学表达式，如 '2 + 2'"
                    }
                },
                "required": ["expression"]
            }
        ),
        Tool(
            name="get_current_time",
            description="获取当前时间",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        )
    ]

# 实现工具逻辑
@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "calculate":
        expression = arguments["expression"]
        try:
            # 安全计算
            result = eval(expression, {"__builtins__": {}}, {})
            return [TextContent(type="text", text=str(result))]
        except Exception as e:
            return [TextContent(type="text", text=f"计算错误: {str(e)}")]
    
    elif name == "get_current_time":
        from datetime import datetime
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return [TextContent(type="text", text=f"当前时间: {now}")]
    
    else:
        return [TextContent(type="text", text=f"未知工具: {name}")]

# 运行服务器
if __name__ == "__main__":
    import asyncio
    from mcp.server.stdio import stdio_server
    
    async def main():
        async with stdio_server() as (read_stream, write_stream):
            await app.run(
                read_stream,
                write_stream,
                app.create_initialization_options()
            )
    
    asyncio.run(main())
```

### 2. 配置文件

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "my-server": {
      "command": "python",
      "args": ["/path/to/server.py"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

## 实战项目：数据库查询助手

### 完整 MCP 服务器

```python
# db_mcp_server.py
from mcp.server import Server
from mcp.types import TextContent, Tool, Resource
import asyncio
import json
import sqlite3
from contextlib import contextmanager
from typing import AsyncIterator
from datetime import datetime

app = Server("database-assistant")

# 数据库连接管理
@contextmanager
def get_db_connection(db_path: str = "data.db"):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

# 初始化示例数据
def init_sample_data():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # 用户表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 订单表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY,
                user_id INTEGER,
                amount REAL,
                status TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')
        
        # 插入示例数据
        cursor.execute('''
            INSERT OR IGNORE INTO users (id, name, email) VALUES
            (1, '张三', 'zhangsan@example.com'),
            (2, '李四', 'lisi@example.com'),
            (3, '王五', 'wangwu@example.com')
        ''')
        
        cursor.execute('''
            INSERT OR IGNORE INTO orders (id, user_id, amount, status) VALUES
            (1, 1, 199.99, 'completed'),
            (2, 1, 299.99, 'pending'),
            (3, 2, 99.99, 'completed'),
            (4, 3, 599.99, 'cancelled')
        ''')
        
        conn.commit()

# 工具定义
@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="query_database",
            description="执行 SQL 查询并返回结果",
            inputSchema={
                "type": "object",
                "properties": {
                    "sql": {
                        "type": "string",
                        "description": "SQL 查询语句"
                    }
                },
                "required": ["sql"]
            }
        ),
        Tool(
            name="get_table_schema",
            description="获取数据库表结构",
            inputSchema={
                "type": "object",
                "properties": {
                    "table_name": {
                        "type": "string",
                        "description": "表名，为空则返回所有表"
                    }
                }
            }
        ),
        Tool(
            name="execute_update",
            description="执行 INSERT/UPDATE/DELETE 操作",
            inputSchema={
                "type": "object",
                "properties": {
                    "sql": {
                        "type": "string",
                        "description": "SQL 更新语句"
                    }
                },
                "required": ["sql"]
            }
        ),
        Tool(
            name="analyze_data",
            description="分析表数据统计信息",
            inputSchema={
                "type": "object",
                "properties": {
                    "table_name": {
                        "type": "string",
                        "description": "要分析的表名"
                    }
                },
                "required": ["table_name"]
            }
        )
    ]

# 工具实现
@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    try:
        if name == "query_database":
            sql = arguments["sql"]
            
            # 安全检查：只允许 SELECT
            if not sql.strip().upper().startswith("SELECT"):
                return [TextContent(
                    type="text",
                    text="错误：只允许 SELECT 查询，请使用 execute_update 执行修改操作"
                )]
            
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(sql)
                rows = cursor.fetchall()
                
                if not rows:
                    return [TextContent(type="text", text="查询结果为空")]
                
                # 格式化结果
                headers = rows[0].keys()
                result_lines = [" | ".join(headers), "-" * 50]
                
                for row in rows:
                    values = [str(row[col]) for col in headers]
                    result_lines.append(" | ".join(values))
                
                return [TextContent(type="text", text="\n".join(result_lines))]
        
        elif name == "get_table_schema":
            table_name = arguments.get("table_name")
            
            with get_db_connection() as conn:
                cursor = conn.cursor()
                
                if table_name:
                    # 获取指定表结构
                    cursor.execute(
                        "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
                        (table_name,)
                    )
                    result = cursor.fetchone()
                    if result:
                        return [TextContent(type="text", text=result["sql"])]
                    else:
                        return [TextContent(type="text", text=f"表 {table_name} 不存在")]
                else:
                    # 获取所有表
                    cursor.execute(
                        "SELECT name FROM sqlite_master WHERE type='table'"
                    )
                    tables = [row["name"] for row in cursor.fetchall()]
                    return [TextContent(
                        type="text",
                        text=f"数据库中的表：\n" + "\n".join(f"- {t}" for t in tables)
                    )]
        
        elif name == "execute_update":
            sql = arguments["sql"]
            
            # 安全检查
            forbidden = ["DROP", "DELETE", "TRUNCATE"]
            sql_upper = sql.upper()
            for word in forbidden:
                if word in sql_upper:
                    return [TextContent(
                        type="text",
                        text=f"错误：禁止执行包含 {word} 的操作"
                    )]
            
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(sql)
                conn.commit()
                
                return [TextContent(
                    type="text",
                    text=f"执行成功，影响行数：{cursor.rowcount}"
                )]
        
        elif name == "analyze_data":
            table_name = arguments["table_name"]
            
            with get_db_connection() as conn:
                cursor = conn.cursor()
                
                # 获取行数
                cursor.execute(f"SELECT COUNT(*) as count FROM {table_name}")
                count = cursor.fetchone()["count"]
                
                # 获取列信息
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = cursor.fetchall()
                
                analysis = f"表 {table_name} 分析结果：\n\n"
                analysis += f"总行数：{count}\n\n"
                analysis += "列信息：\n"
                
                for col in columns:
                    analysis += f"- {col['name']}: {col['type']}\n"
                
                return [TextContent(type="text", text=analysis)]
        
        else:
            return [TextContent(type="text", text=f"未知工具: {name}")]
    
    except Exception as e:
        return [TextContent(type="text", text=f"错误: {str(e)}")]

# 资源定义
@app.list_resources()
async def list_resources() -> list[Resource]:
    return [
        Resource(
            uri="db://users",
            name="用户数据",
            mimeType="application/json",
            description="所有用户记录"
        ),
        Resource(
            uri="db://orders",
            name="订单数据",
            mimeType="application/json",
            description="所有订单记录"
        )
    ]

@app.read_resource()
async def read_resource(uri: str) -> str:
    if uri == "db://users":
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users")
            rows = [dict(row) for row in cursor.fetchall()]
            return json.dumps(rows, ensure_ascii=False, indent=2)
    
    elif uri == "db://orders":
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM orders")
            rows = [dict(row) for row in cursor.fetchall()]
            return json.dumps(rows, ensure_ascii=False, indent=2)
    
    else:
        raise ValueError(f"未知资源: {uri}")

# 运行服务器
async def main():
    init_sample_data()
    
    from mcp.server.stdio import stdio_server
    
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())
```

## 高级功能：文件系统助手

```python
# filesystem_mcp_server.py
from mcp.server import Server
from mcp.types import TextContent, Tool
import os
import json
from pathlib import Path

app = Server("filesystem-assistant")

# 允许访问的根目录
ALLOWED_ROOTS = [
    os.path.expanduser("~/projects"),
    os.path.expanduser("~/documents")
]

def validate_path(path: str) -> Path:
    """验证路径是否在允许范围内"""
    target = Path(path).resolve()
    
    for root in ALLOWED_ROOTS:
        root_path = Path(root).resolve()
        try:
            target.relative_to(root_path)
            return target
        except ValueError:
            continue
    
    raise ValueError(f"路径 {path} 不在允许范围内")

@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="read_file",
            description="读取文件内容",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "文件路径"},
                    "offset": {"type": "number", "description": "起始行号"},
                    "limit": {"type": "number", "description": "读取行数"}
                },
                "required": ["path"]
            }
        ),
        Tool(
            name="write_file",
            description="写入文件内容",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "文件路径"},
                    "content": {"type": "string", "description": "文件内容"}
                },
                "required": ["path", "content"]
            }
        ),
        Tool(
            name="list_directory",
            description="列出目录内容",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "目录路径"},
                    "recursive": {"type": "boolean", "description": "是否递归"}
                },
                "required": ["path"]
            }
        ),
        Tool(
            name="search_files",
            description="搜索文件内容",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "搜索路径"},
                    "pattern": {"type": "string", "description": "搜索模式"},
                    "file_pattern": {"type": "string", "description": "文件匹配模式"}
                },
                "required": ["path", "pattern"]
            }
        ),
        Tool(
            name="get_file_info",
            description="获取文件信息",
            inputSchema={
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "文件路径"}
                },
                "required": ["path"]
            }
        )
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    try:
        if name == "read_file":
            path = validate_path(arguments["path"])
            offset = arguments.get("offset", 0)
            limit = arguments.get("limit")
            
            with open(path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            start = offset
            end = offset + limit if limit else len(lines)
            content = "".join(lines[start:end])
            
            return [TextContent(type="text", text=content)]
        
        elif name == "write_file":
            path = validate_path(arguments["path"])
            content = arguments["content"]
            
            # 创建目录
            path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return [TextContent(type="text", text=f"文件已写入: {path}")]
        
        elif name == "list_directory":
            path = validate_path(arguments["path"])
            recursive = arguments.get("recursive", False)
            
            result = []
            
            if recursive:
                for root, dirs, files in os.walk(path):
                    level = root.replace(str(path), '').count(os.sep)
                    indent = ' ' * 2 * level
                    result.append(f"{indent}{os.path.basename(root)}/")
                    subindent = ' ' * 2 * (level + 1)
                    for file in files:
                        result.append(f"{subindent}{file}")
            else:
                for item in sorted(path.iterdir()):
                    item_type = "📁" if item.is_dir() else "📄"
                    result.append(f"{item_type} {item.name}")
            
            return [TextContent(type="text", text="\n".join(result))]
        
        elif name == "search_files":
            path = validate_path(arguments["path"])
            pattern = arguments["pattern"]
            file_pattern = arguments.get("file_pattern", "*")
            
            import fnmatch
            import re
            
            matches = []
            regex = re.compile(pattern)
            
            for root, dirs, files in os.walk(path):
                for filename in files:
                    if fnmatch.fnmatch(filename, file_pattern):
                        filepath = Path(root) / filename
                        try:
                            with open(filepath, 'r', encoding='utf-8') as f:
                                for i, line in enumerate(f, 1):
                                    if regex.search(line):
                                        matches.append(
                                            f"{filepath}:{i}: {line.strip()}"
                                        )
                        except:
                            pass
            
            if matches:
                return [TextContent(
                    type="text",
                    text=f"找到 {len(matches)} 处匹配：\n\n" + "\n".join(matches[:50])
                )]
            else:
                return [TextContent(type="text", text="未找到匹配")]
        
        elif name == "get_file_info":
            path = validate_path(arguments["path"])
            stat = path.stat()
            
            info = {
                "name": path.name,
                "path": str(path),
                "size": stat.st_size,
                "created": stat.st_ctime,
                "modified": stat.st_mtime,
                "is_file": path.is_file(),
                "is_dir": path.is_dir(),
            }
            
            return [TextContent(
                type="text",
                text=json.dumps(info, indent=2, ensure_ascii=False)
            )]
        
        else:
            return [TextContent(type="text", text=f"未知工具: {name}")]
    
    except Exception as e:
        return [TextContent(type="text", text=f"错误: {str(e)}")]

# 运行服务器
if __name__ == "__main__":
    import asyncio
    from mcp.server.stdio import stdio_server
    
    async def main():
        async with stdio_server() as (read_stream, write_stream):
            await app.run(
                read_stream,
                write_stream,
                app.create_initialization_options()
            )
    
    asyncio.run(main())
```

## 配置与部署

### Claude Desktop 配置

```json
{
  "mcpServers": {
    "database": {
      "command": "python3",
      "args": ["/path/to/db_mcp_server.py"],
      "env": {
        "DB_PATH": "/path/to/data.db"
      }
    },
    "filesystem": {
      "command": "python3",
      "args": ["/path/to/filesystem_mcp_server.py"]
    },
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"]
    }
  }
}
```

### 使用示例

```
用户: 帮我查询一下张三的订单

Claude: 我来帮您查询张三的订单信息。

[调用 query_database]
SQL: SELECT u.name, o.id, o.amount, o.status 
     FROM users u 
     JOIN orders o ON u.id = o.user_id 
     WHERE u.name = '张三'

结果:
name | id | amount | status
张三 | 1 | 199.99 | completed
张三 | 2 | 299.99 | pending

张三有 2 个订单：
1. 订单 #1：¥199.99，已完成
2. 订单 #2：¥299.99，待处理
```

## 最佳实践

1. **安全第一**：严格验证用户输入，防止注入攻击
2. **错误处理**：提供清晰的错误信息，便于调试
3. **权限控制**：限制服务器可访问的资源范围
4. **日志记录**：记录工具调用，便于审计
5. **文档完善**：为每个工具提供清晰的描述和示例

## 总结

通过本文的实战示例，你已经掌握了：

- MCP 协议核心概念与架构
- MCP 服务器的基础开发
- 数据库查询助手的完整实现
- 文件系统助手的安全设计
- 配置与部署流程

MCP 让 AI 助手的能力边界无限扩展，是构建 AI 应用的重要基础设施。

---

**参考资源：**
- [MCP 官方文档](https://modelcontextprotocol.io/)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [MCP 服务器示例](https://github.com/modelcontextprotocol/servers)
