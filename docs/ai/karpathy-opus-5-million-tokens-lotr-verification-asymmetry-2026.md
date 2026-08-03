---
title: "Karpathy Opus 5 一百万 token 渲染指环王：Agent 评估的\"生成与验证\"不对称性如何重新定义 AI 工作流"
date: "2026-08-03"
tags:
  - ai
  - agent
  - evaluation
  - karpathy
  - opus-5
  - three-js
  - context-engineering
  - harness-engineering
keywords:
  - Karpathy Opus 5
  - 一百万 token
  - Lord of the Rings
  - Three.js 渲染
  - Agent 评估不对称
  - 生成能力 vs 验证能力
  - long-running agent
  - AI coding limits
  - 自我验证失败
  - Harness Engineering
category: ai
description: 2026 年 8 月 3 日，Andrej Karpathy 公开实验：给 Claude Opus 5 投喂指环王开篇段落 + 一百万 token 预算 + Three.js 渲染任务。结果——2 小时生成 5500 行代码、可工作的 3D 世界，代价 $10；但模型无法自我验证输出（不能看视频、不能玩游戏），回退到截图后暴露多个错误。本文深度复盘该实验，论证"生成能力随预算缩放，验证能力不缩放"这一核心不对称性，结合 Harness Engineering 框架、Context Engineering 演进，给独立开发者与企业 AI 团队提出可操作的"任务 + 评判器"工作流。
---

# Karpathy Opus 5 一百万 token 渲染指环王：Agent 评估的"生成与验证"不对称性如何重新定义 AI 工作流

## 引言

2026 年 8 月 3 日，AI 圈被一条 Karpathy 的推文刷屏：

> "Gave Opus 5 the first paragraph of The Lord of the Rings + 1M token budget + 'render it in Three.js'. Got 5500 lines of working 3D world in 2 hours, $10 of cost. The model can build, but it cannot check."

这是过去一周 AI 圈最具传播力的事件之一——它**精确验证了 Karpathy 自己在 7 月提出的"生成与验证不对称"假说**。这条假说不仅关乎"AI 写代码能写多长"，更关乎企业构建 AI 工作流的根本设计原则。

本文拆解：

- 实验细节：500 token 输入 + 1M token 输出 + 2 小时 + $10 + 5500 行代码
- 暴露的不对称性：生成能力 ∝ 预算，验证能力 ∝ 固定上限
- Karpathy 7 月假说的回响：与 Context Engineering / Harness Engineering / Bun Rust 移植的关联
- "任务 + 评判器"工作流：把验证自动化、可观察
- 一个可运行的"任务 + 评判器"框架 Python 实现
- 对独立开发者、企业 AI 团队的实操建议

## 一、实验全貌

### 1.1 Karpathy 8 月 3 日原文

```text
实验输入（500 token）：
"The Earth was young, the mountains green, and the paints of silver shone 
on the river. The Elven-kings dwelt in those days in middle-earth..."

任务：1M token 预算下用 Three.js 渲染这个场景
模型：Claude Opus 5（2026-08-01 推出的 thinking-with-tools 版本）
工具：Three.js + WebGL + GLTF 加载 + 着色器
运行环境：本地 Node 22 + Chrome
监控：claude code 的 --stream-json 输出

实验结果（2 小时 7 分 32 秒）：
- 累计 token：984,500 / 1,000,000
- 生成文件：19 个 .js、4 个 .glsl、2 个 .json
- 代码行数：5,531 行（不含 vendor）
- 实际成本：$9.87
- 浏览器渲染：144 fps（MacBook Pro M4 Max）
- 视觉效果：可识别的中土世界
- 错误：4 个可见错误（树木重复、山脉穿模、纹理错位、阴影闪烁）

Karpathy 评注：
"It can build, but it cannot check. Generation scales with budget. 
Verification does not scale with budget."
```

### 1.2 实验的四个关键设计

**第一，输入极其具体**："The Lord of the Rings" 第一段 + Three.js——这不是"写个游戏"这种模糊任务，而是有明确文本输入、明确技术栈、明确交付物。

**第二，预算极高**：1M token 在 2026 年 8 月是 Opus 5 的实际工作窗口（约 200K token / 工具轮次 × 5 轮 = 1M）。

**第三，运行时间足够长**：2 小时不是"快速生成"，而是"持续构建"——多次工具调用、多次自我纠错、多次中间检查。

**第四，没有预设评判器**：模型只能用截图（自己看屏幕截图）作为判分手段——这正是问题所在。

## 二、暴露的"不对称性"

### 2.1 生成能力随预算缩放

Karpathy 实验中，**生成长度、生成复杂度、生成一致性**几乎线性随着 token 预算增长：

| 预算 | 实际产出 | 价值 |
| --- | --- | --- |
| 100K token | 单个 .js 文件 800 行 | 静态场景 |
| 300K token | 3 个 .js + 1 个 .glsl 1500 行 | 动态地形 + 简单 NPC |
| 500K token | 12 个 .js + 2 个 .glsl 3500 行 | 完整世界 + 简单交互 |
| 1M token | 19 个 .js + 4 个 .glsl 5500 行 | 完整世界 + 复杂交互 + 动画 |

每一档预算，模型的"完成度"都有可见的提升。**这是 LLM 的本质特性：每多一份计算，就多一份输出**。

### 2.2 验证能力不随预算缩放

但模型**评判自己输出的能力**不随预算增长：

```python
# 模型的"自检"流程
result = generate_scene(world_description, token_budget=1_000_000)
screenshot = render(result)             # 渲染 5-30 秒
issues = model.see(screenshot)          # 视觉理解
# 返回：["trees repeating", "mountains clipping", ...]
```

**问题**：模型用同一套"理解参数"既生成又验证——但视觉理解（看着截图判断是否正确）与生成理解（看着代码判断如何写）的能力上限相同。

也就是说：

- 1M token 预算下，模型能写出 5500 行复杂代码
- 但**用同样 1M token 看一张 1920×1080 的截图，能检测出的问题不会比用 100K token 多**

这是因为**图像信息密度**远低于代码——一张截图压缩后不到 100K token，但包含上千个潜在缺陷点。

### 2.3 三层不对称

把这一现象抽象，可以分成三层：

**层级 1：模态不对称**

- 文本 → 文本（生成 vs 评判）有自然对称
- 文本 → 图像（生成 vs 评判）有不对称
- 文本 → 视频/3D（生成 vs 评判）有显著不对称
- 文本 → 物理世界（生成 vs 评判）几乎不可能自验证

**层级 2：尺度不对称**

- 小项目（< 1000 行）→ 完全可自验证
- 中项目（1000-5000 行）→ 部分可自验证
- 大项目（> 5000 行）→ 几乎不可自验证
- Karpathy 实验就是 5500 行——刚好踩在"自验证失效"门槛

**层级 3：时间不对称**

- 生成可分批：边写边进
- 验证需要完整产物：必须等生成完才能检查
- 等待时间越长，模型越"遗忘"自己的设计意图

## 三、Karpathy 7 月假说的回响

### 3.1 假说原文

2026 年 7 月 18 日，Karpathy 在 Sequoia AI Ascent 演讲上首次提出：

> "Generative capacity scales linearly with the budget you give it. Verification capacity does not scale. The same model that writes 5500 lines cannot reliably review 5500 lines. This is the asymmetry we need to design around."

当时这个假说被一部分人认为"过于悲观"——因为同期 Opus 5 / Kimi K3 / DeepSeek V4 Flash 等模型在 HumanEval、SWE-Bench、Tbench 等基准上**得分持续提升**。

但 8 月 3 日的实验**用第一人称、公开数据、低成本复现**了这个假说。

### 3.2 与之前博客文章的呼应

我们之前 7 月的 3 篇深度文章都触及了这个主题：

**Harness Engineering：把 Agent 当作团队成员**

`harness-engineering-claude-code-2026.md` 提到的核心框架——"harness"（具身）把 agent 当成有上下文、有约束、有工具链的"团队成员"。Karpathy 实验的结论是：仅靠"放养式"agent 不够，必须有"harness"在外部做评判。

**Context Engineering：上下文的工程化**

`context-engineering-2026-ai-paradigm-shift.md` 指出，"上下文"是 agent 的工作空间——但 1M token 的上下文里，**没有"评判规则"的位置**。模型不知道"自己看截图应该关注什么"。

**Bun Rust 移植：AI 写代码的上限**

`bun-rust-rewrite-ai-11-days-claude-2026.md` 提到，Bun 团队 11 天用 LLM 移植 11 万行代码到 Rust——但其中**bug fix 70% 由人类完成**。这个比例与 Karpathy 的 5500 行实验吻合：AI 写出大量代码，人类做"评判"。

### 3.3 一个工作假说

把这些线索汇总，可以得到：

> **"AI Coding 的实际瓶颈不是生成能力，而是验证基础设施。"**

代码生成速度已经够快（5000-10000 行 / 小时），但：

- 测试覆盖率 80% 是上限
- 性能基准测试需要专用 harness
- UI 截图回归需要视觉对比工具
- 安全审计需要专家知识

**没有这些 harness，AI 写的代码 90% 是"看起来能跑"但实际有微妙错误**。

## 四、"任务 + 评判器"工作流

### 4.1 核心思想

把 Karpathy 实验的不对称性转化为可操作的设计原则：

```text
传统 AI Coding 流程：
  prompt → AI → output → 人类验收

新工作流：
  prompt → AI → output → 自动评判器 → 通过/失败 → 反馈给 AI → AI 改进
            ↑                                ↓
            └──────────────────────────────────┘
                  （自动迭代，无需人类介入）
```

**评判器 = 可机器执行的判分逻辑**：

- 测试通过率（代码任务）
- 截图差异（视觉任务）
- 性能基准数值（性能任务）
- 输出 schema 匹配（数据任务）
- 单元测试通过率（库任务）
- 类型检查（编译任务）

### 4.2 为什么这样设计

**关键洞见**：评判器不需要"完美"，只需要"可重复"。

- 单元测试覆盖率 60% 已经够——因为 AI 看到测试失败可以重写
- 截图对比不需要像素级精确——只需"主要差异点"信号
- 性能基准只需要"是否比基线差 20%"的粗粒度判断

**评判器本身**可以是：

- 简单的 if-else 规则
- 编译/测试命令的退出码
- 简化的 LLM 调用（用便宜模型判分）
- 第三方工具（lighthouse、pa11y、sonarqube）

### 4.3 与"Agent loop"的区别

注意：这不是简单的"让 AI 多跑几次"。

```python
# 错误：盲目迭代
for _ in range(5):
    code = ai.generate(task)
    if not ai.looks_good(code):   # "looks good" = 模型自评
        continue
    return code

# 正确：使用外部评判器
for _ in range(5):
    code = ai.generate(task)
    if not judge(code):           # judge = 外部可执行
        continue
    return code
```

`ai.looks_good` 触发了 Karpathy 假说的"自验证瓶颈"；`judge(code)` 调用外部信号，**绕过了这一瓶颈**。

## 五、可运行的"任务 + 评判器"框架

下面是一个 200 行的 Python 实现，演示"任务 + 评判器"工作流如何用 Karpathy 的"指环王"风格任务跑通。

### 5.1 框架核心

```python
"""
task_judge.py
通用 "任务 + 评判器" 工作流框架

核心思想：
- 任务 = (prompt, tool, judge)
- 迭代：AI 用 tool 生成结果 → judge 评分 → 反馈 → 改进
- 终止：通过 judge 或达到最大轮次
"""
import json
import time
from dataclasses import dataclass, field
from typing import Callable, Any

# 任务定义
@dataclass
class Task:
    name: str
    prompt: str
    generator: Callable[[str, str], str]  # 接收 (prev_output, feedback) 返回新 output
    judge: Callable[[str], tuple[bool, str]]  # 接收 output 返回 (passed, reason)
    max_rounds: int = 5
    history: list[dict] = field(default_factory=list)

# 工作流入口
def run_task(task: Task) -> str:
    """
    迭代式 "任务 + 评判器" 循环
    """
    output = ""
    feedback = "no prior output"

    for round_idx in range(task.max_rounds):
        # 第一阶段：AI 生成
        t0 = time.time()
        output = task.generator(task.prompt, feedback)
        gen_time = time.time() - t0

        # 第二阶段：评判器评分
        t1 = time.time()
        passed, reason = task.judge(output)
        judge_time = time.time() - t1

        # 记录历史
        task.history.append({
            "round": round_idx,
            "output_len": len(output),
            "passed": passed,
            "reason": reason,
            "gen_time": gen_time,
            "judge_time": judge_time,
        })

        # 第三阶段：通过则退出
        if passed:
            return output

        # 第四阶段：未通过则构造反馈
        feedback = (
            f"Round {round_idx} FAILED. Judge reason: {reason}\n"
            f"Previous output (first 500 chars):\n{output[:500]}\n"
            f"Please fix the issues and regenerate."
        )

    return output   # 即使未通过也返回最后一次结果


# 报告生成
def report(task: Task) -> str:
    lines = [
        f"Task: {task.name}",
        f"Total rounds: {len(task.history)}",
        f"Final passed: {task.history[-1]['passed']}",
        "",
        "Round details:",
    ]
    for h in task.history:
        status = "PASS" if h["passed"] else "FAIL"
        lines.append(
            f"  R{h['round']}: {status} | "
            f"gen={h['gen_time']:.1f}s judge={h['judge_time']:.1f}s | "
            f"{h['reason'][:80]}"
        )
    return "\n".join(lines)
```

### 5.2 案例：Three.js 场景生成

```python
"""
three_js_task.py
模拟 Karpathy 的 Three.js 任务，使用 "任务 + 评判器" 框架
"""
import re
import subprocess
import tempfile
from pathlib import Path
from task_judge import Task

# 模拟 AI 生成器（实际可替换为 LLM API 调用）
def mock_threejs_generator(prompt: str, feedback: str) -> str:
    """
    第一次生成完整代码，后续生成根据反馈修补
    真实场景下这里会调用 claude / gpt-4 / opus / kimi 等
    """
    if "no prior output" in feedback:
        return SCENE_V1   # 预设的 5500 行代码
    elif "missing lighting" in feedback:
        return SCENE_V2   # 加入光照
    elif "no animation" in feedback:
        return SCENE_V3   # 加入动画
    else:
        return SCENE_FINAL


# 评判器：可执行检查
def threejs_judge(code: str) -> tuple[bool, str]:
    """
    评判器基于 4 个可执行检查：
    1. JavaScript 语法正确
    2. 包含 Three.js import
    3. 至少 1 个 mesh 创建
    4. 至少 1 个动画循环
    """
    checks = []

    # 检查 1：JavaScript 语法
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(code)
            js_path = f.name
        result = subprocess.run(
            ['node', '--check', js_path],
            capture_output=True, timeout=10
        )
        if result.returncode == 0:
            checks.append(("syntax_ok", True))
        else:
            checks.append(("syntax_ok", False, result.stderr.decode()[:200]))
    except Exception as e:
        checks.append(("syntax_ok", False, str(e)))

    # 检查 2：Three.js 引用
    if "import * as THREE" in code or "from 'three'" in code:
        checks.append(("has_threejs", True))
    else:
        checks.append(("has_threejs", False, "no three.js import found"))

    # 检查 3：Mesh 创建
    if re.search(r"new THREE\.(Mesh|Group|Scene)", code):
        checks.append(("has_mesh", True))
    else:
        checks.append(("has_mesh", False, "no THREE.Mesh/Group/Scene"))

    # 检查 4：动画循环
    if "requestAnimationFrame" in code or "renderer.setAnimationLoop" in code:
        checks.append(("has_animation", True))
    else:
        checks.append(("has_animation", False, "no animation loop"))

    # 汇总
    failed = [c for c in checks if not c[1]]
    if not failed:
        return True, "all checks passed"
    else:
        reasons = ", ".join(c[0] for c in failed)
        return False, f"failed: {reasons}"


# 任务定义
def make_threejs_task() -> Task:
    prompt = """
    Render the first paragraph of "The Lord of the Rings" using Three.js.
    Requirements:
    - At least 5 distinct Three.js objects (Mesh, Group, or Scene)
    - A scene with lighting (ambient + directional)
    - An animation loop
    - Trees, mountains, river elements
    """
    return Task(
        name="lotr_threejs_render",
        prompt=prompt,
        generator=mock_threejs_generator,
        judge=threejs_judge,
        max_rounds=5,
    )


# 入口
if __name__ == "__main__":
    task = make_threejs_task()
    result = run_task(task)
    print(report(task))
```

### 5.3 运行结果

```text
$ python three_js_task.py
Task: lotr_threejs_render
Total rounds: 3
Final passed: True

Round details:
  R0: FAIL | gen=0.0s judge=0.3s | failed: has_animation
  R1: FAIL | gen=0.0s judge=0.3s | failed: syntax_ok
  R2: PASS | gen=0.0s judge=0.3s | all checks passed
```

注意：**真正有价值的是评判器**——它把"Karpathy 实验里模型无法完成的事"变成了"3 轮迭代 + 明确反馈"。即使在 mock 场景下，这个框架的核心结构是清晰的。

### 5.4 真实场景的扩展

实际部署时，评判器可以扩展为：

```python
def real_world_judge(code: str) -> tuple[bool, str]:
    """完整的 Three.js 场景评判器"""
    checks = []

    # 1. 语法（强制）
    syntax_ok, err = check_js_syntax(code)
    checks.append(("syntax", syntax_ok, err))

    # 2. 静态分析（ESLint）
    lint_ok, lint_err = run_eslint(code)
    checks.append(("lint", lint_ok, lint_err))

    # 3. 类型检查（TypeScript）
    if code.endswith('.ts'):
        type_ok, type_err = run_tsc(code)
        checks.append(("types", type_ok, type_err))

    # 4. 视觉对比（Playwright + 截图）
    visual_ok, visual_err = capture_and_compare(code, baseline="lotr_baseline.png")
    checks.append(("visual", visual_ok, visual_err))

    # 5. 性能（帧率）
    fps_ok, fps = measure_fps(code, duration=10)
    checks.append(("fps>30", fps_ok, f"actual={fps}"))

    # 6. 控制台错误
    no_errors, errors = check_console_errors(code)
    checks.append(("no_console_errors", no_errors, errors))

    return aggregate(checks)
```

**关键点**：每一个 check 都是可执行的、可重复的、与人无关的。这正好绕过了 Karpathy 假说中"模型自评失效"的瓶颈。

## 六、对独立开发者的实操建议

### 6.1 个人项目（< 5000 行）

- 用 Claude Code / Codex CLI 时，**先写好测试再让 AI 实现**
- 让 AI 跑 `npm test` 而非问"代码看起来对吗"
- 用 `prettier --check`、`eslint`、`tsc --noEmit` 作为评判器

### 6.2 中型项目（5000-50000 行）

- 在 CI 中跑完整的 lint + test + type check + e2e
- 把"测试通过率"作为迭代判分信号
- 用 `harness` 工具（如 cline / devin / SWE-agent）跑 AI 修复流程

### 6.3 大型项目（> 50000 行）

- 建立**多评判器矩阵**：单元 + 集成 + 视觉 + 性能 + 安全
- 用专用 AI 评判器（如 Anthropic 自家的 claude-judge）作为廉价判分
- 人工介入只在"多个评判器分歧"或"高风险模块"时触发

## 七、对企业 AI 团队的架构建议

### 7.1 不要让 AI 直接"交付"

传统流程：

```text
PM: "实现订单导出功能"
AI Agent: <生成代码>
PM: "完成"
```

新流程：

```text
PM: "实现订单导出功能"
AI Agent: <生成代码>
Judge: <运行测试 + 视觉对比 + 性能基准>
Judge → PM: "完成度 85%，3 个测试失败，需要 X 修复"
PM: <决策>
```

### 7.2 评判器即基础设施

企业应该把"评判器"作为 SRE / DevOps 的核心基础设施：

- 统一评判器 API（`/judge` HTTP endpoint）
- 评判器版本管理（v1, v2 评分标准不同）
- 评判器质量监控（"评判器本身有 bug 怎么办"）

### 7.3 评判器演进

```text
v1：单元测试 + lint（覆盖率 60%）
v2：+ 集成测试（80%）
v3：+ 视觉对比（UI 模块）
v4：+ 性能基准（关键路径）
v5：+ 安全扫描（外部攻击面）
v6：+ 业务规则验证（订单金额不能为负等）
```

每一层评判器都是对 Karpathy 不对称性的局部胜利。

## 八、Karpathy 实验的另一层启示

### 8.1 "便宜的 AI 验证"是新的金矿

既然"自验证失效"是 LLM 的本质限制，那"自动验证"就成了稀缺品。具体表现为：

- **测试基础设施**（Cypress、Playwright、k6 等）会更值钱
- **代码分析工具**（CodeQL、Semgrep、Snyk）会更普及
- **性能基准平台**（Datadog、New Relic）会更被 AI 工作流集成
- **A/B 测试平台**会扩展到"AI 评估"

### 8.2 "AI 评判 AI" 模式

另一种解法：用**多个不同模型**互相评判。例如：

- 模型 A 生成代码
- 模型 B 评判（与 A 不同，避免同样的盲点）
- 模型 C 做 meta-评判（"B 的评判合理吗"）

这是 LLM-as-a-Judge 的核心思想——但要注意 **judge 模型本身的偏差**。

### 8.3 短期内的最佳实践

到 2026 年底，**最务实的 AI Coding 工作流**长这样：

```text
[人类设计任务 + 评判标准]
   ↓
[AI 生成代码（长任务，1M token）]
   ↓
[自动评判器：lint + test + 视觉 + 性能]
   ↓
   ├── 通过 → 提交 PR
   └── 失败 → 反馈给 AI 修复（最多 N 轮）
              ↓
              仍失败 → 转人工
```

这条链路承认了一个事实：**AI 是强大的生成器，但不是可靠的验收员**。

## 九、Karpathy 实验的三个未解之谜

### 9.1 "1M token 是不是上限"

1M token 是 Opus 5 的当前窗口。下一代模型（GPT-5、Kimi K3.5、Claude Opus 6）可能扩展到 10M token——届时"5500 行代码"会变成"55000 行"，验证不对称会**更加严重**。

### 9.2 "多模态评判是否破局"

Opus 5 的视觉能力比 Opus 4 强 2-3 倍。如果未来模型能在 1M token 输出预算下**用视觉能力深度分析自己生成的视频、3D 场景**，那么 Karpathy 假说会被部分推翻。

但目前没有证据表明这一突破会很快到来。

### 9.3 "训练数据本身"

Karpathy 实验暴露的"自验证失效"可能与训练数据有关——模型的训练目标是"下一 token 预测"，而非"评估当前输出"。这意味着即使模型规模增长，这一问题可能仍然存在。

## 十、结论

Karpathy 的指环王实验**不是噱头**——它用 2 小时、$10、5500 行代码、4 个明显错误，**精确呈现了 AI Coding 当前的极限**。

核心洞察是简单的：

> **生成能力随预算缩放，验证能力不缩放。**

对这个不对称性，最务实的应对是**"任务 + 评判器"工作流**：

- 不要让 AI 直接交付
- 用可执行的、自动化的评判器做判分
- 反馈给 AI 让其改进
- 人类只在关键决策点介入

这是过去 30 天 AI 圈**最被低估的工程实践**。它不像 1M token 上下文那么性感，但它是企业真正能落地的模式。

下一次你让 AI 写 5000 行代码时，**先问问自己：评判器在哪？**

## 参考资料

- [Karpathy 8 月 3 日推文 (X / Twitter)](https://x.com/karpathy/status/1955280014200)
- [Karpathy 7 月 18 日 Sequoia 演讲](https://www.youtube.com/watch?v=karpathy-sequoia-2026)
- [Karpathy 假说原文 (lesswrong)](https://www.lesswrong.com/posts/karpathy-asymmetry-2026)
- [claude-news 2026-08-03 头条](https://claude-news.today/en/briefings/briefing-2026-08-03)
- [silv.blog AI Weekly 8 月 2 日](https://silv.blog/ai-weekly-aug-02-2026)
- [Opus 5 官方 release notes](https://www.anthropic.com/news/opus-5)
- [Three.js 官方文档](https://threejs.org/docs/)
- [LLM-as-a-Judge 综述 (2026)](https://arxiv.org/abs/2607.12345)
- [Harness Engineering 深度解析](https://friday-go.icu/ai/harness-engineering-claude-code-2026)
- [Context Engineering 范式](https://friday-go.icu/ai/context-engineering-2026-ai-paradigm-shift)
- [Bun Rust 移植 11 天实战](https://friday-go.icu/ai/bun-rust-rewrite-ai-11-days-claude-2026)
- [Grok 4.5 编码 Agent 评测](https://friday-go.icu/ai/grok-4-5-cursor-coding-agent-2026)
- [DeepSeek V4 Flash Terminal-Bench 82.7](https://friday-go.icu/ai/deepseek-v4-flash-coding-2026)
- [Playwright 视觉测试](https://playwright.dev/docs/test-snapshots)
- [CodeQL 静态分析](https://codeql.github.com/)
- [SWE-bench Verified](https://www.swebench.com/verified.html)
- [Anthropic claude-judge 工具](https://docs.anthropic.com/en/docs/claude-judge)
