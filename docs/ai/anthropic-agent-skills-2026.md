---
title: "Anthropic Agent Skills 实战：让 AI Agent 掌握专业技能的标准化方案"
date: 2026-06-25T09:00:00+08:00
tags: [AI, MCP, Agent, Anthropic, Claude, Skills, 工具]
keywords: [AI Agent, MCP, Anthropic, Skills, SKILL.md, Claude, Agent 工具]
category: ai
description: "Anthropic 官方开源的 Agent Skills 仓库 138k stars 爆红,本文从 SKILL.md 规范、17 个示例 skill 的设计模式、到自建专业 Skill 全流程实战,系统拆解 2026 年 AI Agent 技能标准化的工程化路径。"
---

# Anthropic Agent Skills 实战：让 AI Agent 掌握专业技能的标准化方案

2026 年 5 月,Anthropic 在 GitHub 开源了官方 Agent Skills 仓库 `anthropics/skills`,短短 3 天斩获 **138k Star**,成为 GitHub 趋势榜冠军。一时间,"Agent Skills"成为 AI 工程领域最火热的概念——它是 MCP 协议的下一块拼图,是 Agent 从"工具调用"走向"专业能力"的关键基础设施。

本文从 SKILL.md 规范、17 个示例 skill 的设计模式、到自建一个生产级 Skill,系统拆解 Agent Skills 标准化方案。

## 一、为什么需要 Agent Skills?

MCP(Model Context Protocol)解决了 Agent 与外部工具/数据源的标准化接入,但它只暴露"原始能力"(如 `read_file`、`query_db`)。真实业务中,Agent 需要的是**结构化的专业技能**:

- 资深渗透测试工程师知道"先做资产发现 → 漏洞扫描 → 手工验证 → 报告输出"
- 优秀代码审查者知道"先看测试覆盖 → 看 commit message → 看边界条件 → 看安全"
- 资深数据分析师知道"先看 schema → 看数据分布 → 看异常值 → 画图"

把这类"know-how"封装成可被 Agent 动态加载的 Skill 包,就是 Agent Skills 的核心价值。

**类比理解**:
- LLM = 大脑
- Tools(MCP) = 手脚
- Skills = 工作经验/方法论

没有 Skills 的 Agent 是"力大无穷但不懂业务的实习生",有 Skills 之后才是"有方法论的高级工程师"。

## 二、SKILL.md 规范详解

每个 Skill 由一个目录构成,核心文件是 `SKILL.md`,带 YAML frontmatter:

```markdown
---
name: pdf-processing
description: 从 PDF 提取文本、表格和元数据。当用户需要处理 PDF 文档时使用。
---

# PDF 处理 Skill

## 何时使用
- 用户上传 PDF 并询问内容
- 用户需要从 PDF 提取表格数据
- 用户需要合并/拆分 PDF

## 工作流
1. 调用 `scripts/extract_text.py` 提取纯文本
2. 如有表格,调用 `scripts/extract_tables.py`
3. 用 LLM 总结并返回结构化结果
```

**frontmatter 关键字段**:

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | ✅ | 唯一标识,小写+连字符 |
| `description` | ✅ | Agent 用来判断是否加载该 skill,**最多 1024 字符** |
| `when_to_use` | ❌ | 触发条件的详细描述,辅助 LLM 决策 |
| `version` | ❌ | 语义化版本 |
| `allowed-tools` | ❌ | 该 skill 允许调用的工具白名单 |

**description 写作黄金法则**:
- 第一句说明"这个 skill 做什么"
- 第二句说明"在什么场景下使用"
- 关键词要丰富(让 LLM 能精准匹配)
- 避免抽象词(具体动词优先)

**对比示例**:

```yaml
# ❌ 不好的描述
description: 处理 PDF 相关的任务

# ✅ 好的描述
description: 从 PDF 中提取文本、表格、图像和元数据。当用户提供 PDF 文档、需要解析合同发票、抽取论文数据、或者需要 PDF 合并/拆分/转换格式时使用。
```

## 三、官方 17 个示例 Skill 设计模式剖析

`anthropics/skills` 仓库内置 17 个高质量 Skill,涵盖艺术创作、开发、文档处理、企业协作等领域。我按"设计模式"归类:

### 3.1 单文件工作流型(最简单)

以 `brand-guidelines` 为例,整个 skill 就是一份"品牌规范"文档:

```markdown
# Brand Guidelines

## 配色
- 主色: #FF6B35
- 辅色: #004E89

## 字体
- 标题: Inter Bold 24px
- 正文: Inter Regular 16px
```

Agent 加载后,所有输出都自动遵循该规范。**适用于"约束类"技能**。

### 3.2 工具链集成型(中等复杂度)

`pdf-processing`、`docx-processing` 都属于此类。SKILL.md 描述工作流,`scripts/` 提供实际可执行脚本:

```
pdf-skill/
├── SKILL.md           # 工作流说明
├── scripts/
│   ├── extract_text.py
│   ├── extract_tables.py
│   └── merge_pdfs.py
└── examples/
    └── invoice.pdf
```

**关键设计原则**:
- 脚本要"可独立运行"(Agent 可单独调用)
- 输出结构化(JSON/CSV),便于 LLM 解析
- 错误信息要"对 LLM 友好"(返回可操作的提示)

### 3.3 多文件协作型(复杂场景)

`theme-factory`(主题工厂)是一个 9 步的复杂 Skill,涉及资产生成、视觉验证、文档输出:

```markdown
# Theme Factory Skill

## 工作流
1. 读取 `assets/base-theme.json`
2. 调用 `scripts/extract_color.py` 分析参考图主色
3. 调用 `scripts/generate_palette.py` 生成配色方案
4. 调用 `scripts/apply_theme.py` 应用到 HTML 模板
5. 用 `scripts/screenshot.py` 渲染截图
6. 调用 LLM 视觉评估,迭代调整
7. 输出 `output/theme-{timestamp}.json`
8. 生成使用文档
9. 提交到版本控制
```

**核心模式**:Skill 内部就是一个"小型 Agent 团队",有自己的工作流引擎。

### 3.4 领域知识型(纯 RAG)

`canvas-design`、`algorithmic-art` 是"知识+约束"型,SKILL.md 本身就是 prompt 模板:

```markdown
# Canvas Design

## 核心原则
1. 留白>填充
2. 单一视觉焦点
3. 字体层级不超过 3 级
4. 配色不超过 5 种

## 输出格式
- 800x600 PNG
- 主标题 48px 居中
- 副标题 24px 居中
- 描述 16px 居左
```

## 四、自建一个 Skill:从 0 到生产

我们以**"Go 代码审查 Skill"**为例,演示完整流程。

### 4.1 目录结构

```
go-code-review/
├── SKILL.md
├── scripts/
│   ├── run_linters.sh
│   ├── check_tests.sh
│   └── parse_output.py
├── rules/
│   ├── go-style.md
│   └── security-checklist.md
└── examples/
    └── bad-code.go
```

### 4.2 SKILL.md

```markdown
---
name: go-code-review
description: 对 Go 代码进行专业代码审查。检查代码风格、潜在 bug、安全漏洞、测试覆盖、性能问题。当用户提交 Go 代码、要求 review、或者需要代码质量评估时使用。
when_to_use: |
  - 用户说"帮我 review 一下这段 Go 代码"
  - 用户提交 PR 并要求审查
  - 用户询问"这段代码有没有问题"
allowed-tools: [Bash, Read, Grep]
version: 1.0.0
---

# Go 代码审查 Skill

## 审查清单(按优先级)

### P0 - 安全漏洞
- [ ] SQL 注入: 使用参数化查询?
- [ ] 命令注入: 避免 `exec.Command(userInput)`
- [ ] 路径遍历: 验证文件路径
- [ ] 密钥泄露: 检查硬编码 secret
- [ ] 不安全随机: crypto/rand vs math/rand

### P1 - 并发安全
- [ ] goroutine 泄漏: 有 defer cancel()?
- [ ] race condition: go test -race
- [ ] 死锁: 多个 mutex 顺序
- [ ] channel 关闭: 由发送方关闭

### P2 - 性能
- [ ] 频繁分配: 对象池?
- [ ] 字符串拼接: strings.Builder?
- [ ] 锁粒度: sync.RWMutex?

### P3 - 代码风格
- [ ] 错误处理: 包装 error
- [ ] 命名: 驼峰、包名小写
- [ ] 注释: 导出函数必须注释

## 工作流

1. 调用 `scripts/run_linters.sh` 跑 golangci-lint,捕获静态分析结果
2. 调用 `scripts/check_tests.sh` 检查测试覆盖率和边界用例
3. 阅读 `rules/go-style.md` 和 `rules/security-checklist.md` 加载领域知识
4. 用 Read 工具查看用户提交的代码
5. 按 P0 → P3 顺序逐项检查
6. 输出结构化报告(JSON 格式)
```

### 4.3 scripts/run_linters.sh

```bash
#!/bin/bash
# 运行 Go 静态分析,输出结构化结果
set -e

TARGET_DIR=${1:-.}

echo "=== Running golangci-lint ==="
golangci-lint run --out-format=json "$TARGET_DIR" 2>&1 | head -200

echo "=== Running go vet ==="
go vet "$TARGET_DIR/..." 2>&1

echo "=== Running staticcheck ==="
staticcheck "$TARGET_DIR/..." 2>&1
```

### 4.4 scripts/check_tests.sh

```bash
#!/bin/bash
# 检查测试覆盖率和质量
set -e

TARGET_PKG=${1:-./...}

echo "=== Coverage ==="
go test -cover "$TARGET_PKG" 2>&1

echo "=== Race Detector ==="
go test -race -short "$TARGET_PKG" 2>&1

echo "=== Test Functions ==="
go test -list '.*' "$TARGET_PKG" 2>&1 | grep -c '^Test'
```

### 4.5 rules/security-checklist.md

```markdown
# Go 安全审查清单

## 1. 加密与密钥
- 不要用 MD5/SHA1(已不安全)
- 密钥用 `crypto/rand` 生成,不用 `math/rand`
- 不要硬编码密钥,使用环境变量或 KMS
- TLS 配置检查(不要禁用证书验证)

## 2. 输入验证
- SQL: 100% 使用 prepared statement
- Shell: 不用 `sh -c`,用 `exec.Command` 直接传参
- 文件路径: 检查 `..` 和符号链接
- JSON: 限制最大深度,防 DoS

## 3. 网络
- HTTP client 必须设置 timeout
- Listen 时绑定具体地址,不用 0.0.0.0
- CORS 严格白名单

## 4. 并发
- context.Context 传递
- defer 关闭资源
- 共享变量加锁或用 channel
```

### 4.6 注册与使用

通过 Claude Code 注册:

```bash
# 在 ~/.claude/skills/ 目录下创建软链接
ln -s /path/to/go-code-review ~/.claude/skills/go-code-review

# 重启 Claude Code,Agent 会自动发现该 skill
# 当用户请求"review Go 代码"时,自动加载
```

或者在 MCP server 中动态暴露:

```python
# mcp_server.py
from mcp.server import Server
from mcp.types import Tool, TextContent

app = Server("skills-registry")

SKILLS_DIR = "/Users/me/.claude/skills"

@app.list_tools()
async def list_tools() -> list[Tool]:
    skills = []
    for skill_dir in Path(SKILLS_DIR).iterdir():
        skill_md = skill_dir / "SKILL.md"
        if skill_md.exists():
            frontmatter = parse_frontmatter(skill_md.read_text())
            skills.append(Tool(
                name=f"skill_{frontmatter['name']}",
                description=frontmatter['description'],
                inputSchema={
                    "type": "object",
                    "properties": {
                        "input": {"type": "string"}
                    }
                }
            ))
    return skills
```

## 五、生产级 Skill 最佳实践

### 5.1 description 的"三段式"黄金模板

```yaml
description: |
  [功能一句话] + [输入是什么] + [输出是什么] +
  [触发场景列表,用 "当...时使用" 开头]。
```

### 5.2 错误信息必须"对 LLM 友好"

```python
# ❌ 不友好
raise Exception("Invalid input")

# ✅ 友好
raise ValueError("""
输入格式错误:期望 JSON 数组格式(如 ["a", "b", "c"]),
但收到的是字符串。请要求用户重新输入或转换格式。
""")
```

### 5.3 Skill 版本管理与回滚

```bash
# 每次更新增加版本号
git tag -a go-code-review/v1.1.0 -m "支持 generics 类型检查"

# Claude Code 支持指定版本加载
claude --skill=go-code-review@1.0.0
```

### 5.4 安全边界:避免 Skill 越权

```yaml
# 显式声明允许的工具
allowed-tools: [Read, Grep]
# 不允许: Bash(避免执行任意命令)
# 不允许: Write(避免修改文件)
```

## 六、与 MCP 的协同关系

```
┌─────────────────────────────────────┐
│  User Request                       │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Claude Agent                       │
│  ┌─────────────┐  ┌──────────────┐ │
│  │ Skill Router│  │  Tool Calls  │ │
│  │  (LLM 决策) │  │  (MCP 协议)  │ │
│  └──────┬──────┘  └──────┬───────┘ │
└─────────┼────────────────┼─────────┘
          ↓                ↓
   ┌──────────────┐  ┌──────────┐
   │ Loaded Skill │  │ MCP Tools│
   │ - workflow   │  │ - read   │
   │ - rules      │  │ - query  │
   │ - scripts    │  │ - write  │
   └──────────────┘  └──────────┘
```

**关键差异**:
- **MCP**: 暴露"原子能力"(读写数据库、调用 API)
- **Skills**: 暴露"复合工作流"(审查代码、生成报告)

Skills 内部可以调用 MCP 工具,反之不行。

## 七、未来趋势:从 Skills 到 Skills Marketplace

2026 年下半年,我们可以预见:

1. **Skills Marketplace**: 类似 npm 的 Skill 包管理,官方 + 社区双向贡献
2. **Skill 组合**: 一个 Agent 同时加载多个 Skill,支持技能编排
3. **Skill 评估**: 用 SWE-bench 类基准测试 Skill 的有效性
4. **Skill 权限治理**: 不同 Skill 拥有不同安全级别,防止恶意 Skill 越权

## 八、参考资源

- **官方仓库**: https://github.com/anthropics/skills (138k stars)
- **SKILL.md 规范**: https://docs.anthropic.com/skills/spec
- **MCP 协议**: https://modelcontextprotocol.io
- **Claude Code 文档**: https://docs.claude.com/claude-code/skills

## 总结

Agent Skills 不是简单的"prompt 模板",而是**结构化的、可执行的、版本化的领域知识包**。掌握 SKILL.md 规范 + 工作流设计 + 安全边界三大要素,你就能为 Agent 团队打造专业级的"培训手册",让 LLM 真正成为"有方法论的工程师"。

> **下一步行动**: 选一个你熟悉的领域(代码审查、日志分析、SQL 优化、PPT 制作...),尝试写一个 SKILL.md,看 Agent 的输出质量提升多少。
