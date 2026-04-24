---
title: Python 自动化脚本实战：从数据处理到任务调度
date: 2026-04-24
category: dev/backend/python
tags:
  - Python
  - 自动化
  - 数据处理
  - 任务调度
description: 全面讲解 Python 自动化脚本开发，涵盖文件处理、数据清洗、HTTP 请求、任务调度、日志管理等实战场景。
---

# Python 自动化脚本实战：从数据处理到任务调度

Python 是自动化脚本的首选语言。本文从真实场景出发，讲解如何用 Python 高效解决自动化问题。

## 文件与目录操作

### pathlib：现代文件路径处理

```python
from pathlib import Path
import shutil

# 基础操作
base = Path("/data/projects")
config_file = base / "config" / "app.yaml"

# 检查文件
if config_file.exists():
    print(f"文件大小: {config_file.stat().st_size} bytes")
    print(f"修改时间: {config_file.stat().st_mtime}")

# 读写文件
content = config_file.read_text(encoding="utf-8")
config_file.write_text(content, encoding="utf-8")

# 遍历目录
for py_file in base.rglob("*.py"):
    print(py_file.relative_to(base))

# 批量重命名
for i, img in enumerate(sorted(base.glob("*.jpg"))):
    new_name = img.parent / f"photo_{i:04d}.jpg"
    img.rename(new_name)

# 创建目录（不存在则创建，存在不报错）
(base / "output" / "reports").mkdir(parents=True, exist_ok=True)

# 复制和移动
shutil.copy2(config_file, base / "config.bak")  # 保留元数据
shutil.move(str(config_file), str(base / "archive"))
```

### 批量文件处理

```python
import hashlib
from pathlib import Path
from typing import Generator

def find_duplicate_files(directory: str) -> dict[str, list[Path]]:
    """找出目录中的重复文件"""
    hash_map: dict[str, list[Path]] = {}
    
    for file_path in Path(directory).rglob("*"):
        if not file_path.is_file():
            continue
        
        # 计算文件 MD5
        file_hash = compute_md5(file_path)
        hash_map.setdefault(file_hash, []).append(file_path)
    
    # 只返回有重复的
    return {k: v for k, v in hash_map.items() if len(v) > 1}


def compute_md5(file_path: Path) -> str:
    """计算文件 MD5，支持大文件"""
    md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            md5.update(chunk)
    return md5.hexdigest()


# 使用
duplicates = find_duplicate_files("/data/photos")
for hash_val, files in duplicates.items():
    print(f"\n重复文件（MD5: {hash_val[:8]}...）:")
    for f in files:
        print(f"  {f} ({f.stat().st_size} bytes)")
```

## 数据处理

### pandas 数据清洗

```python
import pandas as pd
import numpy as np

# 读取数据
df = pd.read_csv("data.csv", encoding="utf-8")

print(f"数据形状: {df.shape}")
print(f"\n缺失值统计:\n{df.isnull().sum()}")
print(f"\n数据类型:\n{df.dtypes}")

# 数据清洗流水线
def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """数据清洗流水线"""
    # 1. 删除完全重复的行
    df = df.drop_duplicates()
    
    # 2. 处理缺失值
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())
    
    string_cols = df.select_dtypes(include=["object"]).columns
    df[string_cols] = df[string_cols].fillna("未知")
    
    # 3. 清理字符串
    for col in string_cols:
        df[col] = df[col].str.strip()  # 去除首尾空格
        df[col] = df[col].str.replace(r'\s+', ' ', regex=True)  # 合并多余空格
    
    # 4. 处理异常值（IQR 方法）
    for col in numeric_cols:
        Q1 = df[col].quantile(0.25)
        Q3 = df[col].quantile(0.75)
        IQR = Q3 - Q1
        lower = Q1 - 1.5 * IQR
        upper = Q3 + 1.5 * IQR
        df[col] = df[col].clip(lower, upper)
    
    return df

df_clean = clean_data(df)
df_clean.to_csv("data_clean.csv", index=False, encoding="utf-8")
print(f"清洗完成，保存 {len(df_clean)} 行数据")
```

### CSV/Excel 批量处理

```python
import pandas as pd
from pathlib import Path

def merge_excel_files(input_dir: str, output_file: str) -> None:
    """合并目录下所有 Excel 文件"""
    dfs = []
    
    for excel_file in Path(input_dir).glob("*.xlsx"):
        df = pd.read_excel(excel_file)
        df["来源文件"] = excel_file.name
        dfs.append(df)
        print(f"读取 {excel_file.name}: {len(df)} 行")
    
    if not dfs:
        print("没有找到 Excel 文件")
        return
    
    result = pd.concat(dfs, ignore_index=True)
    result.to_excel(output_file, index=False)
    print(f"\n合并完成: {len(result)} 行 → {output_file}")


def split_csv_by_column(input_file: str, column: str, output_dir: str) -> None:
    """按某列的值拆分 CSV 文件"""
    df = pd.read_csv(input_file)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    for value, group in df.groupby(column):
        filename = output_path / f"{value}.csv"
        group.to_csv(filename, index=False)
        print(f"  {filename}: {len(group)} 行")
```

## HTTP 请求与 API 调用

### requests：HTTP 请求

```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import time

def create_session(retries: int = 3, backoff: float = 0.5) -> requests.Session:
    """创建带重试机制的 Session"""
    session = requests.Session()
    
    retry_strategy = Retry(
        total=retries,
        backoff_factor=backoff,
        status_forcelist=[429, 500, 502, 503, 504],
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    
    return session


def fetch_with_rate_limit(urls: list[str], delay: float = 0.5) -> list[dict]:
    """批量请求，带频率限制"""
    session = create_session()
    results = []
    
    for i, url in enumerate(urls):
        try:
            resp = session.get(url, timeout=10)
            resp.raise_for_status()
            results.append({
                "url": url,
                "status": resp.status_code,
                "data": resp.json(),
            })
        except requests.RequestException as e:
            results.append({
                "url": url,
                "error": str(e),
            })
        
        # 频率限制
        if i < len(urls) - 1:
            time.sleep(delay)
        
        if (i + 1) % 10 == 0:
            print(f"进度: {i + 1}/{len(urls)}")
    
    return results
```

### aiohttp：异步 HTTP 请求

```python
import asyncio
import aiohttp
from typing import Any

async def fetch_url(session: aiohttp.ClientSession, url: str) -> dict[str, Any]:
    """异步获取单个 URL"""
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            data = await resp.json()
            return {"url": url, "status": resp.status, "data": data}
    except Exception as e:
        return {"url": url, "error": str(e)}


async def fetch_all(urls: list[str], max_concurrent: int = 10) -> list[dict]:
    """并发获取多个 URL"""
    semaphore = asyncio.Semaphore(max_concurrent)  # 限制并发数
    
    async def bounded_fetch(session, url):
        async with semaphore:
            return await fetch_url(session, url)
    
    async with aiohttp.ClientSession() as session:
        tasks = [bounded_fetch(session, url) for url in urls]
        results = await asyncio.gather(*tasks)
    
    return list(results)


# 运行
urls = [f"https://api.example.com/user/{i}" for i in range(100)]
results = asyncio.run(fetch_all(urls, max_concurrent=20))
print(f"完成 {len(results)} 个请求")
```

## 任务调度

### APScheduler：任务调度

```python
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import logging

logging.basicConfig(level=logging.INFO)

def daily_report():
    """每日报告任务"""
    print("生成每日报告...")

def hourly_sync():
    """每小时同步任务"""
    print("同步数据...")

def cleanup_old_files():
    """清理旧文件"""
    print("清理过期文件...")

# 后台调度器
scheduler = BackgroundScheduler()

# 每天早上 8 点执行
scheduler.add_job(
    daily_report,
    trigger=CronTrigger(hour=8, minute=0),
    id="daily_report",
    name="每日报告",
    misfire_grace_time=3600,  # 错过执行允许延迟 1 小时
)

# 每小时执行
scheduler.add_job(
    hourly_sync,
    trigger="interval",
    hours=1,
    id="hourly_sync",
)

# 每周一凌晨 2 点执行
scheduler.add_job(
    cleanup_old_files,
    trigger=CronTrigger(day_of_week="mon", hour=2),
    id="weekly_cleanup",
)

scheduler.start()
print("调度器已启动")
```

## 日志管理

```python
import logging
import logging.handlers
from pathlib import Path

def setup_logger(
    name: str,
    log_file: str,
    level: int = logging.INFO,
    max_bytes: int = 10 * 1024 * 1024,  # 10 MB
    backup_count: int = 5,
) -> logging.Logger:
    """创建支持轮转的日志记录器"""
    logger = logging.getLogger(name)
    logger.setLevel(level)

    # 避免重复添加 handler
    if logger.handlers:
        return logger

    # 文件 handler（按大小轮转）
    Path(log_file).parent.mkdir(parents=True, exist_ok=True)
    file_handler = logging.handlers.RotatingFileHandler(
        log_file,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
    file_handler.setLevel(level)

    # 控制台 handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.WARNING)

    # 格式
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger


# 使用
logger = setup_logger("myapp", "logs/app.log")
logger.info("应用启动")
logger.warning("磁盘空间不足")
logger.error("连接失败", exc_info=True)
```

## 命令行工具

```python
import argparse
import sys

def create_cli() -> argparse.ArgumentParser:
    """创建命令行界面"""
    parser = argparse.ArgumentParser(
        description="数据处理工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s process --input data.csv --output result.csv
  %(prog)s report --date 2024-01-01 --format html
        """,
    )
    
    subparsers = parser.add_subparsers(dest="command", help="子命令")
    
    # process 子命令
    process_parser = subparsers.add_parser("process", help="处理数据")
    process_parser.add_argument("--input", "-i", required=True, help="输入文件")
    process_parser.add_argument("--output", "-o", required=True, help="输出文件")
    process_parser.add_argument("--verbose", "-v", action="store_true", help="详细输出")
    
    # report 子命令
    report_parser = subparsers.add_parser("report", help="生成报告")
    report_parser.add_argument("--date", required=True, help="报告日期 (YYYY-MM-DD)")
    report_parser.add_argument(
        "--format", choices=["html", "pdf", "csv"], default="html", help="输出格式"
    )
    
    return parser


def main():
    parser = create_cli()
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    if args.command == "process":
        print(f"处理 {args.input} → {args.output}")
    elif args.command == "report":
        print(f"生成 {args.date} 的 {args.format} 报告")


if __name__ == "__main__":
    main()
```

## 总结

Python 自动化脚本的最佳实践：

1. **使用 pathlib** 替代 os.path，代码更清晰
2. **异步处理 IO** - 大量网络请求用 aiohttp
3. **pandas 数据清洗** - 建立标准流水线
4. **日志记录** - 使用轮转日志，便于排查问题
5. **命令行界面** - 用 argparse 让脚本更易用
6. **错误处理** - 捕获异常，记录日志，保证脚本健壮性
