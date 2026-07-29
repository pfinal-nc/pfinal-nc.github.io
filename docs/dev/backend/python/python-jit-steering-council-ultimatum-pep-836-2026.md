---
title: Python JIT 的生死六个月：Steering Council 最后通牒与 PEP 836 的自救之路
date: 2026-07-28
tags:
  - python
  - jit
  - cpython
  - pep-836
  - governance
  - performance
keywords:
  - Python JIT
  - Steering Council
  - PEP 744
  - PEP 836
  - CPython performance
  - free-threading
  - PyPy
  - Ken Jin
category: dev/backend/python
description: Python Steering Council 给 JIT 编译器项目下达 6 个月最后通牒：提交 Standards Track PEP 或从主干移除。PEP 836 "JIT Go Brrr" 如何回应？当前 8-9% 提速是否足够？与 PyPy 的差距、free-threading 冲突、Mark Shannon 的担忧、以及 Python 性能治理的深层博弈。
---

# Python JIT 的生死六个月：Steering Council 最后通牒与 PEP 836 的自救之路

## 一场不太常见的"内部刹车"

2026 年 6 月 5 日，Python 指导委员会（Steering Council）在 discuss.python.org 发布了一则让很多人意外的公告：**暂停 JIT 编译器项目在 CPython 主分支上的全部新功能开发**。

这意味着什么？Python 3.13 引入的实验性 JIT 编译器，虽然已经带来了 8-9% 的几何平均性能提升（x86-64 Linux），现在却被要求"停摆"——直到开发者提交一份正式的 Standards Track PEP 并获得社区批准。如果 6 个月内没有 PEP 被接受，**JIT 代码将从 CPython 主干中移除**。

这不是一个技术问题，而是一个治理问题。

## 事件全貌：从 PEP 744 到"最后通牒"

### 背景：JIT 的非正式状态

CPython 的 JIT 编译器在 Python 3.13 发布周期中被合并到主分支。当时唯一相关的文档是 **PEP 744**，由 Brandt Bucher 和 Savannah Ostrowski 编写。但 PEP 744 的状态是 **Informational**（信息性）——它解释了 JIT 的初始设计，甚至勾画了 JIT 成为永久特性需要满足的条件，但它不是一份 Standards Track 提案。

PEP 744 明确留下的未解决问题包括：

1. 是否有**长期维护者**
2. **安全审查**
3. **调试与进程外工具支持**
4. **运行时保证的边界**
5. 对**发行版和下游打包者**的影响

这些问题多年来始终没有形成社区规范。

### Steering Council 的公告

指导委员会成员 Pablo Galindo Salgado 在公告中写道：

> "对于如此复杂、影响范围如此广的变更，我们（指导委员会）在流程执行上的把控不够严格。"

公告的核心要求：

- **暂停**：在 Standards Track PEP 被接受之前，不得向主分支合并任何新的 JIT 功能、优化或性能改进
- **例外**：Bug 修复和安全修复可以继续
- **期限**：6 个月内提交并解决 PEP
- **后果**：如果逾期未通过，JIT 代码从主分支移除，开发转移到 Python 仓库之外

指导委员会还提出了一个架构层面的建议：PEP 应描述一个**支持多种实现策略的 JIT 基础设施**，而不是与单一策略高度耦合。

### PEP 836：JIT 团队的回应

2026 年 7 月 3 日，JIT 核心开发者 **Ken Jin** 提交了 **PEP 836**——"JIT Go Brrr: The Path to a Supported JIT Compiler for CPython"。

PEP 836 设定了一个分层的、约 2.5 年的性能路线图：

| 里程碑 | 目标 | 基准 |
|---|---|---|
| Python 3.16 beta | JIT + GIL ≥ 5% 提速 | vs GIL 解释器 |
| Python 3.17 beta | JIT + free-threading ≥ 20% 提速 | vs free-threading 解释器 |

20% 的目标是什么概念？JIT 负责人 Ken Jin 自己的说法是——**"PyPy 的四分之一到一半"**。

## 性能现状：诚实的数字

### 当前 JIT 性能

| 平台 | 几何平均提速 | 个体基准范围 |
|---|---|---|
| x86-64 Linux | 8-9% | -15% 到 +100%+ |
| AArch64 macOS | 12-13% | 类似波动 |

### PyPy 对比

| 平台 | PyPy vs CPython 3.15 |
|---|---|
| macOS | ~50% 更快 |
| x86-64 Linux | 80-90% 更快 |

```python
# 一个展示 JIT 波动性的简单基准
import timeit
import sys

def benchmark_jit_impact():
    """对比 JIT 开启/关闭下的性能差异"""
    results = {}

    # 测试 1: 纯计算密集
    code_compute = """
total = 0
for i in range(1000000):
    total += i * i
"""

    # 测试 2: 字符串操作
    code_string = """
s = ""
for i in range(10000):
    s += str(i)
"""

    # 测试 3: 字典操作
    code_dict = """
d = {}
for i in range(100000):
    d[i] = i * 2
    _ = d.get(i)
"""

    for name, code in [("compute", code_compute),
                       ("string", code_string),
                       ("dict", code_dict)]:
        time = timeit.timeit(code, number=10)
        results[name] = time

    return results

# 运行前检查 JIT 状态
import os
jit_enabled = os.environ.get("PYTHON_JIT", "0") == "1"
print(f"JIT enabled: {jit_enabled}")
print(f"Python version: {sys.version}")

results = benchmark_jit_impact()
for name, time in results.items():
    print(f"  {name}: {time:.3f}s")
```

### JIT 的致命短板：与 free-threading 不兼容

这是 PEP 836 必须解决的最大问题——**JIT 在启动线程时会自动禁用自己**。

```python
# 演示 JIT 与 free-threading 的冲突
import threading
import os

print(f"PYTHON_JIT={os.environ.get('PYTHON_JIT', '0')}")
print(f"GIL status: {sys._is_gil_enabled() if hasattr(sys, '_is_gil_enabled') else 'GIL enabled'}")

# 当 free-threading 启用时，JIT 会自动关闭
# 这意味着 free-threaded Python + JIT = 无法同时使用
# 两个旗舰项目目前互斥
```

两个 Python 的旗舰项目——free-threading（PEP 703）和 JIT——目前无法协同工作。这正是指导委员会要求新 PEP 必须明确回答的核心问题之一。

## 核心争议：为什么是现在？

### Mark Shannon 的担忧

JIT 的核心贡献者 **Mark Shannon**（Python 性能优化的长期推动者）对暂停决定表达了担忧：

> "在 PEP 被接受之前停止所有开发，让我们处于一个尴尬的位置。"

他指出了两个风险：

1. **压力**：6 个月的时间限制迫使 JIT 团队快速产出 PEP，但社区没有足够时间讨论
2. **势头**："暂停可能导致失去动力和新贡献者"

Shannon 请求了 1-2 个月的宽限期继续工作，但被拒绝。他还指出，在 fork 中继续开发并不现实——因为优化代码的生成方式会导致非常大的代码差异，难以管理。

### 指导委员会的立场

Thomas Wouters 的回应代表了委员会的态度：

> "我们不是不讲道理的，但我们确实希望这件事被认真对待。"

委员会的核心理由可以归纳为：

1. **流程债**：一个复杂度和影响范围如此大的变更，不应该在主分支上以"实验"状态存在 3 年
2. **承诺缺失**：没有长期维护者承诺、没有安全审查、没有调试工具支持
3. **替代方案**：不应与单一策略耦合，应该支持多种 JIT 策略的可插拔架构
4. **前例**："实验不应该在 CPython 主分支上进行，除非有 PEP 支撑"

### Donghee Na 的补充

另一位指导委员会成员 Donghee Na 补充道：

> "当前的实验性 JIT 项目需要一份正式 PEP。现在是审查不同可能方案的好时机。"

这暗示委员会并不满足于"接受现有 JIT 设计"——他们希望看到更广泛的方案讨论。

## PEP 836 需要回答的关键问题

指导委员会列出了新 PEP 必须至少回答的问题清单：

### 1. 维护计划

JIT 是一个大型复杂子系统，PEP 需要明确：
- 谁负责长期维护？
- 如何影响不直接贡献 JIT 的维护者和贡献者？
- 如果核心维护者离开怎么办？

### 2. 兼容性保证

JIT 如何与 CPython 已有的功能共存：
- **free-threading**（PEP 703）：两个项目能否同时启用？
- **profiler**：`cProfile` 和新的 `profiling.sampling`（Tachyon）能否在 JIT 下工作？
- **debugger**：`pdb` 和第三方调试器能否步进 JIT 编译的代码？
- **gc**：JIT 编译的代码如何与垃圾回收器交互？

### 3. 成功指标

| 指标 | 当前值 | 3.16 目标 | 3.17 目标 |
|---|---|---|---|
| GIL + JIT 提速 | 8-9% | ≥ 5% | — |
| free-threading + JIT 提速 | 不兼容 | — | ≥ 20% |
| 平台覆盖 | x86-64, AArch64 | 扩展 | 扩展 |
| 内存开销 | 未量化 | 需量化 | 需量化 |

### 4. 与第三方 JIT 的关系

PEP 需要回答 JIT 基础设施是否设计为可被其他项目复用：
- **CinderX**（Meta 的 Python JIT）
- **Numba**（数值计算 JIT）
- **PyTorch** 的 JIT 编译路径

是兼容、竞争还是互补？

### 5. 架构稳定性

当前 JIT 架构是否被视为稳定？还是可能进一步重新设计？JIT 已经经历了多次重大架构变更（从 copy-and-patch 到 tail-calling 到当前方案），委员会想知道"这次是否是终态"。

## 对 Python 生态的影响

### 对 3.15 的影响

Python 3.15 的功能集已经冻结，JIT 的当前版本（8-9% 提速）会随 3.15 正式发布。暂停令不影响 3.15 的 JIT——它影响的是 **3.16 及之后**的新 JIT 开发。

### 对发行版的影响

Linux 发行版（Ubuntu、Fedora、Debian）需要知道：
- JIT 是否默认启用？（目前默认关闭，需 `PYTHON_JIT=1`）
- 是否需要额外构建依赖？
- 安全更新频率如何保证？
- 如果 JIT 在 6 个月后被移除，发行版如何平滑过渡？

### 对企业用户的影响

```
当前状态：JIT 是实验性、默认关闭、不推荐生产使用
↓
PEP 836 被接受：JIT 获得正式地位，但仍可能默认关闭
↓
Python 3.16：如果达到 5% 目标，可能默认开启 GIL+JIT
↓
Python 3.17：如果达到 20% 目标，可能支持 free-threading+JIT
↓
最坏情况：6 个月无 PEP → JIT 从主干移除 → 3.16 无 JIT
```

## 这件事为什么重要

FortiBleed 式的安全漏洞让你立刻行动，但 Python JIT 的治理危机是一种**慢性风险**——它不会在今天炸掉你的系统，但它决定了 Python 性能的十年走向。

### Python 性能治理的悖论

Python 社区面临一个根本矛盾：

1. **用户期望**：Python 应该更快，与 Go/Rust/JavaScript 竞争
2. **现实约束**：CPython 的核心设计（引用计数、GIL、C API ABI 兼容）使得深度优化极其困难
3. **治理文化**：Python 社区重视共识和流程，"快速迭代打破常规"不是 Python 的风格
4. **人才瓶颈**：能维护 CPython JIT 的人在全球屈指可数

JIT 暂停事件本质上是这四个力量碰撞的结果。指导委员会不是在否定 JIT 的技术价值，而是在要求它**通过正式流程获得社区授权**。

### 对比其他语言

| 语言 | JIT 策略 | 治理方式 |
|---|---|---|
| Go | 不使用 JIT，编译器优化（PGO） | 核心团队主导 |
| Java (HotSpot) | 世界级 JIT，30 年投入 | 商业公司支持 |
| JavaScript (V8) | 多层 JIT（Sparkplug + Maglev + TurboFan） | 商业公司支持 |
| Ruby (YJIT) | 基于 CRuby 的 JIT，采用率增长中 | 核心团队 + Shopify 支持 |
| Python (CPython JIT) | 实验性，8-9% 提速，治理中 | 社区驱动，志愿者维护 |

Python 是唯一一个试图在社区驱动模式下构建 JIT 的主流语言。这既是优势（没有商业锁定），也是挑战（没有商业级资源投入）。

## 6 个月倒计时

截至 2026 年 7 月底，距离截止日还有约 **5 个月**。PEP 836 已经提交，但需要：

1. 社区讨论（通常数周到数月）
2. 可能的修订和迭代
3. 指导委员会正式接受或拒绝

如果一切顺利，JIT 将在 Python 3.16 周期中获得正式身份。如果不顺利——CPython 将回退到纯解释器模式，而追求性能的 Python 用户将继续依赖 PyPy、Cython 或 C 扩展。

无论结果如何，这场讨论本身就是 Python 社区治理成熟度的证明——一个愿意在投入数年开发后仍然叫停、要求正式审查的社区，比一个"先上线再迭代"的社区更值得信任。

## 参考资料

- [Steering Council 公告原文](https://discuss.python.org/t/107638)
- [PEP 744: JIT Compiler (Informational)](https://peps.python.org/pep-0744/)
- [PEP 836: JIT Go Brrr](https://peps.python.org/pep-0836/)
- [Real Python: Python's JIT Faces Some Challenges](https://realpython.com/python-news-july-2026/)
- [The Register: Python JIT compiler project under threat](https://www.theregister.com/devops/2026/06/08/python-jit-compiler-may-be-removed/)
- [Machine Herald: PEP 836 Analysis](https://machineherald.io/article/2026-07/11-cpython-community-answers-steering-councils-six-month-jit-ultimatum-with-pep-836-a-path-to-a-supported-compiler)
- [Python 3.15 What's New](https://docs.python.org/3.15/whatsnew/3.15.html)
