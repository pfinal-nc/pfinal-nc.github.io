---
title: Python 3.15 新特性深度解析：延迟导入、frozendict、Tachyon 采样器与 2026 年最大更新
date: 2026-07-07
tags:
  - python
  - python3.15
  - 性能优化
  - 新特性
  - 开发工具
keywords:
  - Python 3.15
  - 延迟导入
  - frozendict
  - Tachyon
  - 采样分析器
  - PEP 810
  - PEP 814
  - PEP 799
  - JIT 编译器
  - 推导式解包
category: dev/backend/python
description: Python 3.15 预计 2026 年 10 月正式发布，当前已进入 Beta 2 阶段。这个版本带来了延迟导入 (PEP 810)、frozendict 内置类型 (PEP 814)、Tachyon 百万赫兹采样分析器 (PEP 799)、推导式解包操作 (PEP 798)、延迟注解求值 (PEP 649/749) 等颠覆性特性。本文从实战角度全面解析这些变化如何影响你的 Python 代码。
---

# Python 3.15 新特性深度解析：延迟导入、frozendict、Tachyon 采样器与 2026 年最大更新

## 引言：Python 3.15——从"快一点"到"快很多"

Python 3.15 是 Python 语言发展的又一重要里程碑，预计于 **2026 年 10 月**正式发布。根据 [PEP 745](https://peps.python.org/pep-0745/) 发布计划，当前版本已进入 **Beta 2 阶段**（2026 年 6 月发布）。

这个版本可以用三个关键词概括：**更快、更安全、更函数式**。延迟导入直接解决 Python 臭名昭著的启动慢问题；frozendict 填补了"不可变字典"这个多年的空白；Tachyon 采样分析器让性能调优从玄学变成科学。加上推导式解包、延迟注解求值、UTF-8 默认编码等一大批实用改进，Python 3.15 可能是 3.10 以来最重要的版本。

## 一、五大核心新特性速览

| 特性 | PEP | 解决的问题 | 影响范围 |
|------|-----|-----------|---------|
| **延迟导入** | PEP 810 | 应用启动慢 | 全部项目 |
| **frozendict** | PEP 814 | 不可变字典缺失 | 缓存、配置、哈希 |
| **Tachyon 采样器** | PEP 799 | 性能分析成本高 | 性能调优 |
| **推导式解包** | PEP 798 | 嵌套列表扁平化啰嗦 | 日常编码 |
| **UTF-8 默认编码** | PEP 686 | 跨平台编码不一致 | 部署运维 |

## 二、延迟导入（Lazy Imports）— PEP 810

### 2.1 问题：Python 启动为什么慢

每个 Python 开发者都经历过这种痛苦：一个 CLI 工具的 `--help` 都要等 2 秒，因为 `import` 语句在模块加载时就会立即执行，即使你这次运行根本用不到某些导入的模块。

```python
# 即使你只跑 --help，这些模块也全部加载了
import numpy as np         # ~300ms
import pandas as pd        # ~500ms
import matplotlib.pyplot   # ~400ms
from transformers import pipeline  # ~2000ms
# 总计：启动 3+ 秒

def main():
    parser = argparse.ArgumentParser()
    # ...
```

### 2.2 解决方案：`lazy` 软关键字

PEP 810 引入了 `lazy` 软关键字，模块在**首次使用时才被加载**：

```python
# 声明延迟导入——模块不会被立即加载
lazy import numpy as np
lazy import pandas as pd
lazy from transformers import pipeline

print("应用启动中...")  # numpy、pandas、transformers 都还没加载

def process_data():
    # 此时才真正加载 numpy 和 pandas
    df = pd.DataFrame(np.random.randn(100, 4))
    return df.describe()
```

启动时间从 3+ 秒降到近乎瞬时。

### 2.3 全局控制：三种模式

除了逐个声明，Python 3.15 还提供了全局控制：

```bash
# 模式 1：所有模块延迟加载
python -X lazy_imports=all app.py

# 模式 2：仅显式声明的模块延迟加载（推荐）
python -X lazy_imports=normal app.py

# 模式 3：禁用延迟导入（默认）
python -X lazy_imports=none app.py
```

也可以使用环境变量：

```bash
PYTHON_LAZY_IMPORTS=all python app.py
```

三种模式对比：

| 模式 | 行为 | 适用场景 |
|------|------|---------|
| `all` | 所有导入延迟 | 快速原型，启动优化最大化 |
| `normal` | 仅 `lazy import` 延迟 | **生产推荐**，渐进迁移 |
| `none` | 无延迟导入 | 向后兼容，默认行为 |

### 2.4 运行时 API

可以在运行时动态控制延迟导入行为：

```python
import sys

# 查询当前状态
state = sys.get_lazy_imports()
print(state)  # 'normal'

# 运行时设置
sys.set_lazy_imports("normal")

# 设置过滤器：排除特定模块
sys.set_lazy_imports_filter(lambda name: name.startswith("myapp."))
```

### 2.5 限制条件（必须了解）

```python
# ❌ 仅在模块作用域有效，不能在函数内使用
def my_func():
    lazy import json  # SyntaxError!

# ❌ 不支持星号导入
lazy from module import *  # SyntaxError!

# ❌ 不支持 __future__ 导入
lazy from __future__ import annotations  # SyntaxError!

# ✅ 正确使用场景
# 文件顶层，显式导入
lazy import json
lazy from pathlib import Path
lazy from sqlalchemy import create_engine
```

### 2.6 实战：Django / Flask 应用优化

```python
# Django settings.py 优化
lazy import django_redis
lazy import celery
lazy from storages.backends.s3boto3 import S3Boto3Storage

# 只有实际处理请求时才加载这些重量级模块
# manage.py runserver 启动速度提升 40-60%

# Flask 应用
from flask import Flask

app = Flask(__name__)

# 延迟导入重量级扩展
lazy from flask_sqlalchemy import SQLAlchemy
lazy from flask_caching import Cache
lazy from flask_limiter import Limiter

# 扩展在首次访问时才初始化
db = None  # 延迟初始化
def get_db():
    global db
    if db is None:
        from flask_sqlalchemy import SQLAlchemy
        db = SQLAlchemy(app)
    return db
```

### 2.7 跨版本兼容检测

```python
# 检查是否支持延迟导入
import sys

HAS_LAZY_IMPORTS = hasattr(sys, 'get_lazy_imports')

if HAS_LAZY_IMPORTS:
    sys.set_lazy_imports("normal")
```

## 三、frozendict 内置类型 — PEP 814

### 3.1 问题：Python 缺一个不可变字典

"为什么 Python 有 `frozenset` 但没有 `frozendict`？"——这是 Python 社区被问过最多的问题之一。

在 Python 3.15 之前，如果你需要一个不可变字典，你需要：
- 使用 `types.MappingProxyType` — 只能包装已有字典，自身不可构造
- 使用第三方库 `frozendict` — 额外依赖
- 自己实现 `__hash__` — 容易出错

### 3.2 基础使用

```python
>>> from builtins import frozendict

>>> fd = frozendict(x=1, y=2, z=3)
>>> print(fd)
frozendict({'x': 1, 'y': 2, 'z': 3})

# 不可变
>>> fd['w'] = 4
TypeError: 'frozendict' object does not support item assignment

>>> del fd['x']
TypeError: 'frozendict' object does not support item deletion

# 可哈希——可用作字典键或集合元素
>>> hash(fd)
-3849271047234521
>>> cache = {fd: "cached_result"}
>>> set_of_configs = {frozendict(host='a'), frozendict(host='b')}

# 保持插入顺序
>>> list(fd.keys())
['x', 'y', 'z']
```

### 3.3 核心特性详解

| 特性 | 说明 |
|------|------|
| **不可变性** | 创建后无法修改，所有修改操作抛出 `TypeError` |
| **可哈希性** | 当所有键和值均可哈希时，自身也可哈希 |
| **非 dict 子类** | 继承自 `object`，与 `dict` 平行（设计选择） |
| **顺序无关比较** | `frozendict(a=1, b=2) == frozendict(b=2, a=1)` 为 `True` |
| **插入顺序保留** | 迭代顺序与创建时一致 |

### 3.4 实战模式

#### 模式一：函数缓存键

```python
from functools import lru_cache
from builtins import frozendict

@lru_cache(maxsize=1024)
def get_user_permissions(config: frozendict) -> set[str]:
    """以不可变配置作为缓存键"""
    # 复杂权限计算
    ...

# 调用
perms = get_user_permissions(frozendict(role='admin', tenant='org-123'))
```

#### 模式二：多级缓存

```python
# 之前：需要把 dict 序列化成字符串
cache_key = json.dumps({'user_id': uid, 'filters': filters}, sort_keys=True)
result = cache.get(cache_key)

# 现在：直接使用 frozendict
config = frozendict(user_id=uid, filters=frozendict(status='active', since=date))
result = cache.get(config)  # hashable natively!
```

#### 模式三：应用不可变配置

```python
class AppConfig:
    def __init__(self):
        self._config = frozendict({
            'database': frozendict(
                host='localhost',
                port=5432,
                name='myapp'
            ),
            'redis': frozendict(
                host='localhost',
                port=6379,
                db=0
            )
        })

    @property
    def config(self) -> frozendict:
        return self._config

# 配置不可被意外修改
config = AppConfig().config
# config['database']['host'] = 'evil.com'  # TypeError 保证安全
```

#### 模式四：GraphQL / API 响应冻结

```python
# 冻结 API 响应防止意外修改
def get_api_response(endpoint: str) -> frozendict:
    response = requests.get(endpoint).json()
    return freeze_recursive(response)

def freeze_recursive(obj):
    """递归将 dict 转为 frozendict"""
    if isinstance(obj, dict):
        return frozendict({k: freeze_recursive(v) for k, v in obj.items()})
    elif isinstance(obj, list):
        return tuple(freeze_recursive(i) for i in obj)
    return obj

# 使用时保证数据不会被意外修改
data = get_api_response('https://api.example.com/users')
# data['results'][0]['name'] = 'hacked'  # TypeError
```

### 3.5 标准库集成

以下模块已在 Python 3.15 中更新以支持 `frozendict`：

```python
import json
import pickle
import copy
from pprint import pprint

# JSON 序列化
fd = frozendict(name="Alice", age=30)
json_str = json.dumps(fd)
fd_back = json.loads(json_str)  # 注意：返回的是普通 dict

# pickle 序列化（保留类型）
import pickle
data = pickle.dumps(fd)
fd_restored = pickle.loads(data)  # frozendict

# 拷贝支持
import copy
fd_copy = copy.deepcopy(fd)  # frozendict

# 美观输出
pprint(fd)  # frozendict({'name': 'Alice', 'age': 30})
```

## 四、Tachyon 采样分析器 — PEP 799

### 4.1 问题：cProfile 的开销太高

`cProfile` 是确定性的函数调用跟踪器，在处理高频函数调用时会产生 50-200% 的性能开销——你分析的代码和你运行的代码不是同一个东西。

### 4.2 Tachyon：百万赫兹采样，几乎零开销

Tachyon 使用**统计采样**而非确定性跟踪，采样频率高达 1,000,000 Hz（100 万次/秒），性能开销仅 1-2%：

```bash
# 以 100 万赫兹采样率分析脚本
python -m profiling.sampling --freq 1000000 my_script.py

# 三种采样模式
python -m profiling.sampling --mode wall my_script.py    # 挂钟时间（默认）
python -m profiling.sampling --mode cpu my_script.py     # CPU 时间
python -m profiling.sampling --mode gil my_script.py     # GIL 感知模式

# 附加到运行中的进程——不需要重启！
python -m profiling.sampling attach --pid 12345
```

### 4.3 输出格式

Tachyon 支持多种输出格式，兼容现有工具链：

```bash
# 火焰图（交互式 HTML，基于 D3.js）
python -m profiling.sampling --flamegraph my_script.py

# pstats 格式（兼容 cProfile 查看器）
python -m profiling.sampling --pstats my_script.py

# 折叠格式（兼容 Brendan Gregg 的 FlameGraph 工具链）
python -m profiling.sampling --collapsed my_script.py

# Firefox Profiler 格式
python -m profiling.sampling --gecko my_script.py
```

### 4.4 高级功能介绍

| 功能 | 参数 | 说明 |
|------|------|------|
| 实时 TUI | `--live` | 终端实时界面显示性能热点 |
| 异步感知 | `--async-aware` | 正确归属协程执行时间 |
| 操作码精度 | `--opcodes` | 精确到字节码指令级别 |
| 线程感知 | `-a` | 包含所有线程的采样 |
| 进程附加 | `attach --pid` | 无需重启即可附加分析 |

### 4.5 实战：分析 FastAPI 应用

```bash
# 启动 FastAPI 应用并采样
python -m profiling.sampling --freq 1000000 --async-aware --flamegraph \
    -m uvicorn app:app --host 0.0.0.0 --port 8000

# 或者附加到运行中的进程
python -m profiling.sampling attach --pid $(pgrep -f uvicorn) \
    --duration 30 --flamegraph
```

### 4.6 架构变化：新的 profiling 包

Python 3.15 重构了性能分析模块：

```
profiling/
├── tracing.py      # 确定性函数调用跟踪（从 cProfile 迁移）
├── sampling.py     # 统计采样分析器（Tachyon，全新）
└── ...

# 废弃项
- profile 模块 → 废弃（Python 3.17 移除）
- cProfile → 保留为 profiling.tracing 的兼容别名
```

迁移指南：

```python
# Python 3.14
import cProfile
cProfile.run('my_function()')

# Python 3.15
from profiling.tracing import run
run('my_function()')

# 或使用 Tachyon 采样
from profiling.sampling import Tachyon
profiler = Tachyon(freq=1_000_000, mode='wall')
profiler.start()
my_function()
profiler.stop()
profiler.write_flamegraph('output.html')
```

## 五、推导式中的解包操作 — PEP 798

### 5.1 之前：啰嗦的扁平化

```python
# Python 3.14：嵌套列表扁平化
lists = [[1, 2], [3, 4], [5]]
result = [item for sublist in lists for item in sublist]
# [1, 2, 3, 4, 5]

# 嵌套 for 的阅读顺序让人困惑——第二个 for 先执行
```

### 5.2 现在：`*` 和 `**` 在推导式中

```python
# Python 3.15：使用 * 解包
lists = [[1, 2], [3, 4], [5]]
result = [*L for L in lists]
# [1, 2, 3, 4, 5]

# 字典推导式解包
dicts = [{'a': 1}, {'b': 2}, {'a': 3}]
merged = {**d for d in dicts}
# {'a': 3, 'b': 2}  # 后出现的键覆盖先前的值

# 集合推导式
sets = [{1, 2}, {3, 4}, {2, 3}]
union = {*s for s in sets}
# {1, 2, 3, 4}

# 生成器表达式也支持
flattened = (*x for x in [(1, 2), (3, 4)])
list(flattened)  # [1, 2, 3, 4]
```

### 5.3 实战：数据处理

```python
# 将嵌套的 API 响应扁平化
api_responses = [
    [{'id': 1, 'name': 'Alice'}, {'id': 2, 'name': 'Bob'}],
    [{'id': 3, 'name': 'Charlie'}],
    [{'id': 4, 'name': 'Diana'}, {'id': 5, 'name': 'Eve'}],
]
all_users = [*page for page in api_responses]

# 多级字典合并
configs = [
    {'host': 'localhost', 'port': 5432},
    {'user': 'admin'},
    {'host': 'db.example.com'},  # 覆盖前面的 host
]
final_config = {**cfg for cfg in configs}
# {'host': 'db.example.com', 'port': 5432, 'user': 'admin'}
```

## 六、延迟注解求值 — PEP 649 / PEP 749

### 6.1 之前：前向引用问题

```python
# Python 3.14：NameError!
def process(data: MyClass) -> MyClass:  # MyClass 尚未定义！
    ...

class MyClass:
    pass

# 绕行方案
from __future__ import annotations  # 把注解变成字符串
```

### 6.2 现在：注解在访问时才求值

```python
# Python 3.15：直接工作
def process(data: MyClass) -> MyClass:
    ...

class MyClass:  # 在函数定义之后才定义
    pass

# 注解在运行时访问时才求值
import typing
hints = typing.get_type_hints(process)  # 此时才触发求值
```

### 6.3 关键行为变化

```python
# Python 3.14：__annotations__ 包含立即求值的对象
def foo(x: int) -> str: ...
print(foo.__annotations__)  # {'x': <class 'int'>, 'return': <class 'str'>}

# Python 3.15：__annotations__ 包含延迟求值的"承诺"
def foo(x: int) -> str: ...
print(foo.__annotations__)  # {'x': <deferred annotation>, 'return': <deferred annotation>}

# 使用 typing.get_type_hints() 触发求值
import typing
print(typing.get_type_hints(foo))  # {'x': <class 'int'>, 'return': <class 'str'>}
```

## 七、UTF-8 成为默认编码 — PEP 686

### 7.1 问题的根源

Python 历史上在不同平台使用不同的默认编码：
- **Linux/macOS**：UTF-8
- **Windows**：系统区域设置（如 GBK / Cp936）

这意味着同一段代码在 Linux 上能跑，在 Windows 上可能直接 UnicodeDecodeError。

### 7.2 Python 3.15 的解决

```python
# Python 3.14：编码依赖平台
with open('file.txt') as f:   # Windows 可能是 GBK
    content = f.read()

# Python 3.15：默认 UTF-8，跨平台一致
with open('file.txt') as f:   # 始终 UTF-8
    content = f.read()

# 需要平台特定编码时显式指定
with open('file.txt', encoding='locale') as f:  # 恢复旧行为
    content = f.read()
```

### 7.3 控制选项

```bash
# 禁用 UTF-8 模式
python -X utf8=0 app.py

# 强制 UTF-8（即使在旧版 Python 中也生效）
python -X utf8=1 app.py
```

## 八、其他值得关注的新特性

### 8.1 智能错误消息

Python 3.15 的错误提示变得异常聪明：

```python
# 嵌套属性建议
>>> container.area
AttributeError: 'Container' object has no attribute 'area'.
Did you mean '.inner.area'?

# 跨语言方法建议
>>> my_list.push(42)
AttributeError: 'list' object has no attribute 'push'.
Did you mean '.append()'?

>>> my_str.toUpperCase()
AttributeError: 'str' object has no attribute 'toUpperCase'.
Did you mean '.upper()'?

# 可变/不可变类型提示
>>> (1, 2, 3).append(4)
AttributeError: 'tuple' object has no attribute 'append'.
Did you mean to use a 'list' object?

# delattr 拼写检查
>>> delattr(obj, 'nmae')
AttributeError: 'MyClass' object has no attribute 'nmae'.
Did you mean 'name'?
```

### 8.2 asyncio.TaskGroup.cancel()

```python
async def process_with_timeout():
    async with asyncio.TaskGroup() as tg:
        task1 = tg.create_task(long_running_op())
        task2 = tg.create_task(another_op())

        # 在特定条件下取消所有任务
        if some_condition:
            tg.cancel()  # Python 3.15 新增！
```

### 8.3 re.prefixmatch() — `re.match()` 的语义清洗

```python
import re

# Python 3.14
result = re.match(r'\d+', '123abc')

# Python 3.15（推荐，语义更清晰）
result = re.prefixmatch(r'\d+', '123abc')
# 名字更精确地表达了"前缀匹配"的语义
```

### 8.4 彩色终端体验

Python 3.15 全面拥抱终端彩色输出：

- **交互式 shell** — 彩色制表符补全（按对象类型着色）
- **ast 模块** — 语法高亮的 AST dump
- **calendar** — 命令行彩色日历
- **difflib** — unified_diff() 支持 color 参数
- **http.server** — 彩色日志输出
- **timeit** — 彩色性能结果

```bash
# 禁用彩色输出
export NO_COLOR=1
python -X no_color=1 app.py
```

### 8.5 typing 模块增强

```python
from typing import TypeForm, TypedDict, disjoint_base

# TypeForm：标注类型表达式本身
def create_validator(tp: TypeForm) -> Callable:
    """接受一个类型并返回验证器"""
    ...

# TypedDict 支持闭合类型和额外项
class Config(TypedDict, closed=True):
    name: str
    version: str
    extra_items=int  # 允许额外的整数值

# disjoint_base 装饰器
@disjoint_base
class Shape: ...

@disjoint_base
class Serializable: ...
```

### 8.6 其他模块更新速览

```python
# math 模块新增
import math
math.isnormal(1.0)     # 检查是否正常浮点数
math.issubnormal(1e-320)  # 检查是否次正常数
math.fmax(1.0, 2.0)    # 最大值（忽略 NaN）
math.signbit(-0.0)     # 检查符号位

# Counter 新增 XOR 操作
from collections import Counter
c1 = Counter('ab')
c2 = Counter('bc')
c3 = c1 ^ c2  # 对称差：Counter({'a': 1, 'c': 1})

# json 新增 array_hook
import json
data = json.loads('[1, 2, 3]', array_hook=tuple)
# (1, 2, 3) 而不是 [1, 2, 3]

# subprocess 事件驱动等待
import subprocess
proc = subprocess.Popen(['long_running_command'])
proc.wait(timeout=30)  # Linux 上使用 pidfd，不再轮询
```

## 九、性能与底层优化

### 9.1 JIT 编译器重大升级

Python 3.15 的 JIT 编译器经历了自 3.13 引入以来最大的一次升级，整体执行效率进一步提升。加上以下优化：

- **Windows 64 位官方二进制**启用尾调用解释器（Tail-Calling Interpreter）
- **GC 优化**：从 3.13 的增量 GC 回退到分代 GC，减少内存管理开销

### 9.2 帧指针默认启用（PEP 831）

CPython 构建时默认启用帧指针，使原生分析工具能高效遍历调用栈：

```bash
# 这些工具现在开箱即用
perf record -g python my_script.py        # Linux perf
bpftrace -e '...'                          # eBPF 工具
py-spy record -o profile.svg -- python ... # 第三方采样器
```

### 9.3 C API 改进

对于维护 C 扩展的开发者，Python 3.15 带来了重要更新：

- **PEP 803**：Free-Threaded 构建的稳定 ABI（`abi3t`）
- **PEP 697**：新的类型数据访问 API（替代负 basicsize）
- **PEP 788**：解释器终结保护，防止 use-after-free

## 十、迁移指南

### 10.1 立即可以做的事

```bash
# 1. 使用 pyupgrade 自动更新代码
pip install pyupgrade
pyupgrade --py315-plus **/*.py

# 2. 使用 ruff 检查废弃 API
pip install ruff
ruff check --select UP --target-version py315 .

# 3. 测试延迟导入的启动性能提升
python -X lazy_imports=normal -c "import your_app"
```

### 10.2 需要注意的 Breaking Changes

```python
# 1. 编码行为变化
# 如果你的代码依赖平台默认编码：
# open('file.txt') 现在始终是 UTF-8
# 需要旧行为？显式指定 encoding='locale'

# 2. GC 行为变化
# 从增量 GC 回退到分代 GC，内存使用模式可能不同

# 3. profile 模块废弃
# import profile → from profiling import tracing
# 或使用新的 Tachyon 采样器

# 4. 注解求值时机变化
# 依赖 __annotations__ 立即求值的代码需要调整
# 使用 typing.get_type_hints() 替代直接访问
```

### 10.3 发布时间线

| 里程碑 | 日期 | 状态 |
|--------|------|------|
| Beta 1 | 2026 年 5 月 | ✅ 已发布 |
| **Beta 2** | **2026 年 6 月** | ✅ **当前版本** |
| RC 1 | 2026 年 9 月 | 🔜 即将发布 |
| Final Release | 2026 年 10 月 | 📅 计划中 |
| End of Life | 2032 年 10 月 | — |

## 十一、总结

Python 3.15 是 Python 3.10 以来最重要的版本更新。**延迟导入**解决了 Python 应用的启动性能痛点；**frozendict** 填补了类型系统的长期空白；**Tachyon** 让性能分析从高开销变成零负担；**推导式解包**和延迟注解求值让日常编码更愉悦。

如果你的项目还没有开始测试 Python 3.15 Beta，现在是时候了。**立即行动清单：**

1. 在 CI 中添加 Python 3.15 Beta 测试矩阵
2. 使用 `pyupgrade --py315-plus` 扫描代码
3. 评估延迟导入对应用启动性能的提升
4. 将 `profile` 模块迁移到 `profiling`
5. 检查 `__annotations__` 的直接访问并替换为 `typing.get_type_hints()`

Python 3.15 不是终点——它是 Python 迈向更快、更安全、更函数式的又一坚实步伐。

## 参考资料

- [Python 3.15 What's New](https://docs.python.org/3.15/whatsnew/3.15.html)
- [PEP 745 — Python 3.15 Release Schedule](https://peps.python.org/pep-0745/)
- [PEP 810 — Explicit Lazy Imports](https://peps.python.org/pep-0810/)
- [PEP 814 — frozendict](https://peps.python.org/pep-0814/)
- [PEP 799 — Dedicated Profiling Package (Tachyon)](https://peps.python.org/pep-0799/)
- [PEP 798 — Unpacking in Comprehensions](https://peps.python.org/pep-0798/)
- [PEP 649 / 749 — Deferred Evaluation of Annotations](https://peps.python.org/pep-0649/)
- [PEP 686 — UTF-8 Default Encoding](https://peps.python.org/pep-0686/)
- [PEP 831 — Frame Pointers](https://peps.python.org/pep-0831/)
- [PEP 745 — Release Schedule](https://peps.python.org/pep-0745/)
