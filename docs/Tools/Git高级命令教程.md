---
title: "Git Advanced Commands 2025 - 12个提升效率的高级命令完整指南"
date: 2025-01-15 10:00:00
author: PFinal南丞
description: "Git 高级命令完整教程：worktree 多工作目录、reflog 找回丢失提交、bisect 二分查找 Bug、stash 进阶、cherry-pick 选择性合并等 12 个实用命令详解，附实战示例。"
keywords:
  - git advanced commands
  - git worktree tutorial
  - git reflog recovery
  - git bisect bug finding
  - git stash advanced
  - git cherry-pick
  - git submodule
  - git filter-repo
  - Git高级命令
  - Git教程
  - 版本控制
  - PFinalClub
tags:
  - Git
  - 版本控制
  - 开发工具
  - DevOps
faq:
  - question: Git 如何找回误删或丢失的提交？
    answer: 使用 git reflog 查看所有 HEAD 变动记录，找到目标 commit hash 后用 git reset --hard 或 git cherry-pick 恢复。
  - question: Git 如何快速定位引入 Bug 的提交？
    answer: 使用 git bisect 二分查找：先标记一个已知坏版本和一个已知好版本，Git 会自动切到中间版本，你标记好/坏后继续二分直到定位单次提交。
  - question: Git 如何同时开发多个分支不切换？
    answer: 使用 git worktree add 为同一仓库创建多个工作目录，每个目录可检出不同分支，互不干扰，共享同一 .git。
  - question: Git 如何暂存当前修改去修别的分支？
    answer: 使用 git stash 暂存工作区与暂存区，切分支修完后再切回用 git stash pop；可用 stash list、stash show 管理多条暂存。
howTo:
  name: Git 高级命令 12 个实用技巧
  description: 从 worktree、reflog、bisect 到 stash、cherry-pick、submodule 等完整指南
  steps:
    - git worktree 多工作目录
    - git reflog 找回丢失提交
    - git bisect 二分找 Bug
    - git stash 进阶
    - git cherry-pick 选择性合并
    - git submodule 子模块
    - git filter-repo 重写历史
    - git blame 责任追踪
    - git log 高级用法
    - git clean 清理未跟踪文件
    - git rerere 复用冲突解决
    - git notes 提交注释
---

# Git 高级命令教程：12 个提升开发效率的实用命令

## 前言

在日常开发中，我们经常使用 `git add`、`git commit`、`git push` 等基础命令。但 Git 还提供了许多强大而实用的命令，虽然不太常用，但在特定场景下能极大提升工作效率。

本文将介绍 **12 个高级 Git 命令**，帮助你更好地利用 Git 的强大功能。

## 📋 命令速查表

| 命令 | 用途 | 推荐指数 |
|------|------|---------|
| `git worktree` | 多工作目录并行开发 | ⭐⭐⭐⭐⭐ |
| `git reflog` | 找回"丢失"的提交 | ⭐⭐⭐⭐⭐ |
| `git bisect` | 二分查找定位 Bug | ⭐⭐⭐⭐ |
| `git stash` | 暂存更改的进阶用法 | ⭐⭐⭐⭐⭐ |
| `git cherry-pick` | 选择性应用提交 | ⭐⭐⭐⭐ |
| `git submodule` | 子模块管理 | ⭐⭐⭐ |
| `git filter-repo` | 重写历史 | ⭐⭐⭐ |
| `git blame` | 代码责任追踪 | ⭐⭐⭐⭐ |
| `git log` | 高级日志查询 | ⭐⭐⭐⭐⭐ |
| `git clean` | 清理未跟踪文件 | ⭐⭐⭐⭐ |
| `git rerere` | 重用已解决的冲突 | ⭐⭐⭐ |
| `git notes` | 为提交添加注释 | ⭐⭐⭐ |

---

## 1. git worktree - 多工作目录管理

### 什么是 git worktree？

`git worktree` 允许你在同一个仓库中创建多个工作目录，每个工作目录可以检出不同的分支。这对于需要同时处理多个分支的场景非常有用。

### 为什么需要 git worktree？

**传统方式的痛点：**
- 需要频繁切换分支时，会丢失未提交的更改
- 无法同时查看和编辑不同分支的代码
- 切换分支时可能需要重新构建项目，耗时较长

**git worktree 的优势：**
- 可以在不同目录同时工作于不同分支
- 每个工作树独立，互不干扰
- 共享同一个 `.git` 仓库，节省磁盘空间

### 基本用法

#### 创建新的工作树

```bash
# 在指定目录创建新的工作树，并检出指定分支
git worktree add <path> <branch>

# 示例：在 ../myproject-feature 目录创建新工作树，检出 feature/new-ui 分支
git worktree add ../myproject-feature feature/new-ui

# 如果分支不存在，可以创建新分支
git worktree add ../myproject-hotfix -b hotfix/critical-bug
```

#### 列出所有工作树

```bash
git worktree list
```

输出示例：
```
/Users/pfinal/myproject                 abc1234 [main]
/Users/pfinal/myproject-feature         def5678 [feature/new-ui]
/Users/pfinal/myproject-hotfix          ghi9012 [hotfix/critical-bug]
```

#### 删除工作树

```bash
# 删除工作树（需要先删除工作目录）
rm -rf ../myproject-feature
git worktree remove ../myproject-feature

# 或者使用 prune 自动清理无效的工作树
git worktree prune
```

#### 移动工作树

```bash
git worktree move <old-path> <new-path>
```

### 实际应用场景

**场景 1：同时开发新功能和修复 Bug**

```bash
# 主目录用于开发新功能
cd /path/to/project
git checkout feature/new-feature

# 创建新工作树用于修复紧急 Bug
git worktree add ../project-hotfix hotfix/urgent-fix
cd ../project-hotfix
# 现在可以同时编辑两个分支的代码
```

**场景 2：代码审查时对比不同版本**

```bash
# 主目录保持当前开发分支
# 创建工作树查看 PR 分支
git worktree add ../project-pr origin/feature/pr-branch
```

**场景 3：长期维护多个版本**

```bash
# 主目录：最新开发版本
# 工作树 1：生产版本
git worktree add ../project-prod v1.0.0

# 工作树 2：测试版本
git worktree add ../project-test v1.1.0-beta
```

### 注意事项

- 每个工作树必须检出不同的分支
- 不能删除包含未提交更改的工作树
- 所有工作树共享同一个 `.git` 仓库
- 删除工作树时，需要先删除目录再运行 `git worktree remove`

---

## 2. git reflog - 找回"丢失"的提交

### 什么是 reflog？

`reflog` 记录了 HEAD 和分支引用的所有变更历史，即使提交已经被"删除"，也能通过 reflog 找回。

### 使用场景

**场景：误删分支或重置提交**

```bash
# 查看 reflog 历史
git reflog

# 输出示例：
# abc1234 HEAD@{0}: checkout: moving from main to feature
# def5678 HEAD@{1}: commit: Add new feature
# ghi9012 HEAD@{2}: reset: moving to HEAD~1
# jkl3456 HEAD@{3}: commit: Fix bug

# 恢复到之前的某个状态
git checkout HEAD@{2}  # 恢复到 reset 之前的状态

# 或者恢复已删除的分支
git branch recovered-branch HEAD@{1}
```

### 高级用法

```bash
# 查看特定分支的 reflog
git reflog show <branch-name>

# 查看最近 10 条记录
git reflog -10

# 查看特定时间范围的记录
git reflog --since="2 days ago"
```

---

## 3. git bisect - 二分查找定位 Bug

### 什么是 git bisect？

`git bisect` 使用二分查找算法，帮助你快速定位引入 Bug 的提交。

### 使用流程

```bash
# 1. 开始二分查找
git bisect start

# 2. 标记当前版本为"坏"的（有 Bug）
git bisect bad

# 3. 标记某个已知好的版本（没有 Bug）
git bisect good <commit-hash>
# 或者
git bisect good v1.0.0

# 4. Git 会自动检出中间的提交，你测试后标记好坏
git bisect good  # 如果这个版本没问题
git bisect bad   # 如果这个版本有问题

# 5. 重复步骤 4，直到找到引入 Bug 的提交

# 6. 结束二分查找，返回原分支
git bisect reset
```

### 自动化 bisect

```bash
# 使用脚本自动测试
git bisect start HEAD v1.0.0
git bisect run npm test

# Git 会自动运行测试脚本，根据退出码判断好坏
# 退出码 0 = good，非 0 = bad
```

### 实际示例

```bash
# 假设 Bug 在最近 100 个提交中引入
git bisect start
git bisect bad                    # 当前版本有 Bug
git bisect good HEAD~100          # 100 个提交前是好的

# Git 检出第 50 个提交，你测试后发现没问题
git bisect good

# Git 检出第 75 个提交，你测试后发现有问题
git bisect bad

# 继续这个过程，通常只需 log2(n) 次测试就能找到问题提交
```

---

## 4. git stash - 暂存更改的进阶用法

### 基础用法回顾

```bash
# 暂存当前更改
git stash

# 恢复暂存的更改
git stash pop

# 查看所有暂存
git stash list
```

### 进阶用法

#### 给暂存添加描述

```bash
git stash save "WIP: 正在开发登录功能"
```

#### 暂存特定文件

```bash
# 只暂存部分文件
git stash push -m "保存 UI 更改" -- src/components/Button.tsx src/styles/
```

#### 暂存时保留未跟踪的文件

```bash
# 默认不暂存未跟踪的文件，使用 -u 包含它们
git stash -u
# 或者
git stash --include-untracked
```

#### 暂存时保留索引（已 add 的文件）

```bash
# 保留已暂存的文件在索引中
git stash --keep-index
```

#### 应用特定的暂存

```bash
# 查看暂存列表
git stash list
# stash@{0}: WIP on main: abc1234 Fix bug
# stash@{1}: WIP on feature: def5678 Add feature

# 应用特定的暂存（不删除）
git stash apply stash@{1}

# 应用并删除
git stash pop stash@{1}
```

#### 创建暂存分支

```bash
# 从暂存创建新分支
git stash branch new-feature-branch
```

---

## 5. git cherry-pick - 选择性应用提交

### 基本用法

```bash
# 将其他分支的提交应用到当前分支
git cherry-pick <commit-hash>

# 应用多个提交
git cherry-pick <commit1> <commit2> <commit3>

# 应用一个范围的提交
git cherry-pick <start-commit>..<end-commit>
# 注意：不包含 start-commit，只包含 end-commit

# 包含起始提交
git cherry-pick <start-commit>^..<end-commit>
```

### 实际场景

**场景：将 hotfix 分支的修复应用到 main 分支**

```bash
# 在 hotfix 分支找到修复提交的 hash
git log hotfix/bug-fix
# commit abc1234: Fix critical security issue

# 切换到 main 分支
git checkout main

# 应用这个提交
git cherry-pick abc1234
```

### 高级选项

```bash
# 只应用更改，不自动提交
git cherry-pick -n <commit-hash>
# 或者
git cherry-pick --no-commit <commit-hash>

# 编辑提交信息
git cherry-pick -e <commit-hash>

# 如果遇到冲突，继续 cherry-pick
git cherry-pick --continue

# 放弃 cherry-pick
git cherry-pick --abort
```

---

## 6. git submodule - 子模块管理

### 什么是 submodule？

Submodule 允许你将一个 Git 仓库作为另一个 Git 仓库的子目录，常用于管理项目依赖。

### 基本操作

#### 添加子模块

```bash
git submodule add <repository-url> <path>

# 示例
git submodule add https://github.com/user/library.git libs/external-library
```

#### 克隆包含子模块的项目

```bash
# 方法 1：递归克隆
git clone --recursive <repository-url>

# 方法 2：先克隆，再初始化子模块
git clone <repository-url>
git submodule init
git submodule update

# 或者合并执行
git submodule update --init --recursive
```

#### 更新子模块

```bash
# 更新所有子模块到最新提交
git submodule update --remote

# 更新特定子模块
git submodule update --remote libs/external-library
```

#### 删除子模块

```bash
# 1. 删除 .gitmodules 中的条目
git rm --cached libs/external-library

# 2. 删除 .git/modules 中的目录
rm -rf .git/modules/libs/external-library

# 3. 删除工作目录
rm -rf libs/external-library

# 4. 提交更改
git commit -m "Remove submodule"
```

---

## 7. git filter-branch / git filter-repo - 重写历史

### git filter-branch（已弃用，但仍有参考价值）

```bash
# 从所有提交中删除某个文件
git filter-branch --tree-filter 'rm -f passwords.txt' HEAD

# 修改所有提交的邮箱
git filter-branch --env-filter '
OLD_EMAIL="old@example.com"
CORRECT_NAME="Your Name"
CORRECT_EMAIL="new@example.com"

if [ "$GIT_COMMITTER_EMAIL" = "$OLD_EMAIL" ]
then
    export GIT_COMMITTER_NAME="$CORRECT_NAME"
    export GIT_COMMITTER_EMAIL="$CORRECT_EMAIL"
fi
if [ "$GIT_AUTHOR_EMAIL" = "$OLD_EMAIL" ]
then
    export GIT_AUTHOR_NAME="$CORRECT_NAME"
    export GIT_AUTHOR_EMAIL="$CORRECT_EMAIL"
fi
' --tag-name-filter cat -- --branches --tags
```

### git filter-repo（推荐使用）

`git filter-repo` 是 `git filter-branch` 的现代替代品，更快更安全。

```bash
# 安装（需要单独安装）
pip install git-filter-repo

# 删除文件
git filter-repo --path passwords.txt --invert-paths

# 重写路径
git filter-repo --path-rename old/path:new/path

# 修改提交信息
git filter-repo --message-callback 'return message.replace(b"old", b"new")'
```

**⚠️ 警告：** 这些命令会重写 Git 历史，使用前请备份仓库！

---

## 8. git blame - 代码责任追踪

### 基本用法

```bash
# 查看文件的每一行是谁修改的
git blame <file>

# 查看特定行的详细信息
git blame -L <start-line>,<end-line> <file>

# 示例：查看第 10-20 行
git blame -L 10,20 src/utils.js
```

### 高级选项

```bash
# 忽略空白更改
git blame -w <file>

# 显示更详细的信息
git blame -C -C -C <file>  # 检测代码移动和复制

# 查看特定版本的 blame
git blame <commit> -- <file>
```

### 实际应用

```bash
# 找出谁引入了某个 Bug
git blame -L 42,42 src/buggy-file.js

# 查看代码的演变历史
git log -p -L 42,42:src/buggy-file.js
```

---

## 9. git log 的高级用法

### 图形化显示

```bash
# 显示分支图
git log --oneline --graph --all

# 更美观的图形
git log --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit --all
```

### 搜索提交

```bash
# 按作者搜索
git log --author="John"

# 按提交信息搜索
git log --grep="bug fix"

# 按文件搜索
git log -- <file-path>

# 按代码内容搜索（pickaxe）
git log -S "functionName"  # 查找添加或删除该字符串的提交
git log -G "regex"         # 使用正则表达式
```

### 时间范围

```bash
# 最近一周的提交
git log --since="1 week ago"

# 特定日期范围
git log --since="2024-01-01" --until="2024-01-31"

# 最近 N 个提交
git log -10
```

### 统计信息

```bash
# 显示每个文件的更改统计
git log --stat

# 显示详细的代码更改
git log -p

# 显示简短的统计
git log --shortstat
```

---

## 10. git clean - 清理未跟踪的文件

### 基本用法

```bash
# 预览将要删除的文件（干运行）
git clean -n

# 删除未跟踪的文件
git clean -f

# 删除未跟踪的文件和目录
git clean -fd

# 交互式删除
git clean -i
```

### 高级选项

```bash
# 只删除特定类型的文件
git clean -f "*.log"

# 排除某些文件
git clean -fd --exclude="*.tmp"

# 删除被忽略的文件（.gitignore 中的文件）
git clean -fX

# 删除所有未跟踪的文件，包括被忽略的
git clean -fx
```

---

## 11. git rerere - 重用已解决的冲突

### 什么是 rerere？

`rerere` (Reuse Recorded Resolution) 可以记住你如何解决冲突，当相同冲突再次出现时自动应用之前的解决方案。

### 启用 rerere

```bash
# 全局启用
git config --global rerere.enabled true

# 或者只对当前仓库启用
git config rerere.enabled true
```

### 使用场景

**场景：长期分支合并**

```bash
# 1. 启用 rerere
git config rerere.enabled true

# 2. 合并分支，解决冲突
git merge feature-branch
# 手动解决冲突...

# 3. 提交
git commit

# 4. 如果之后再次遇到相同的冲突，Git 会自动应用之前的解决方案
```

---

## 12. git notes - 为提交添加注释

### 基本用法

```bash
# 为提交添加注释
git notes add <commit-hash>

# 查看注释
git notes show <commit-hash>

# 编辑注释
git notes edit <commit-hash>

# 删除注释
git notes remove <commit-hash>
```

### 实际应用

```bash
# 为提交添加代码审查注释
git notes add -m "Reviewed by John, approved" abc1234

# 添加性能测试结果
git notes add -m "Performance: 1000 req/s" def5678

# 查看带注释的日志
git log --show-notes=*
```

---

## 总结

这些 Git 命令虽然不常用，但在特定场景下能显著提升工作效率：

| 场景 | 推荐命令 | 说明 |
|------|---------|------|
| 🔀 多分支并行开发 | `git worktree` | 同时编辑多个分支 |
| 🔍 找回丢失的提交 | `git reflog` | 恢复误删的分支或提交 |
| 🐛 快速定位 Bug | `git bisect` | 二分查找问题提交 |
| 💾 灵活暂存管理 | `git stash` | 保存工作进度 |
| 🍒 选择性合并 | `git cherry-pick` | 跨分支应用提交 |
| 📦 管理依赖 | `git submodule` | 引入外部仓库 |
| ✏️ 重写历史 | `git filter-repo` | 清理敏感信息 |
| 👤 代码追踪 | `git blame` | 查找代码责任人 |
| 📊 日志查询 | `git log` | 高级搜索和统计 |
| 🧹 清理工作区 | `git clean` | 删除未跟踪文件 |
| 🔄 解决冲突 | `git rerere` | 自动重用解决方案 |
| 📝 添加注释 | `git notes` | 为提交添加元数据 |

> 💡 **学习建议**：不要试图一次掌握所有命令，建议在实际项目中遇到具体场景时逐步尝试使用。

---

## 常见问题 FAQ

### Q1: git worktree 和 git clone 有什么区别？

`git worktree` 创建的工作目录共享同一个 `.git` 仓库，节省磁盘空间且分支状态同步。`git clone` 会创建完全独立的仓库副本。

### Q2: git reflog 的记录会保留多久？

默认保留 90 天（可配置），超过时间的记录会被垃圾回收清理。

### Q3: git bisect 能自动化运行测试吗？

可以！使用 `git bisect run <test-script>` 可以自动执行测试脚本，根据退出码自动判断好坏。

### Q4: git stash 的内容存在哪里？

存储在 `.git/refs/stash` 中，可以使用 `git stash list` 查看所有暂存。

---

## 延伸阅读

- 📚 [Git 官方文档](https://git-scm.com/doc)
- 📖 [Pro Git 中文版](https://git-scm.com/book/zh/v2)
- 🔗 [Git Worktree 官方文档](https://git-scm.com/docs/git-worktree)
- 🛠️ [git-filter-repo GitHub](https://github.com/newren/git-filter-repo)

---

## 相关文章

- [Git 基本操作](/Tools/Git 基本操作) - Git 入门基础
- [VSCode 快捷键](/Tools/VSCode快捷键) - 提升编辑效率

---

*最后更新：2025年12月*

