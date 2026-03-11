#!/bin/bash

# PFinalClub 博客目录结构优化脚本
# 执行日期: 2026-03-11
# 目的: 清理重复内容,重组目录结构

set -e  # 遇到错误立即退出

BASE_DIR="/Users/pfinal/Documents/pfinal-vue-blog/docs"
BACKUP_DIR="/Users/pfinal/Documents/pfinal-vue-blog/backup-$(date +%Y%m%d-%H%M%S)"

echo "======================================"
echo "PFinalClub 博客目录优化脚本"
echo "======================================"
echo ""

# 创建备份目录
echo "📦 创建备份目录: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# 步骤1: 备份并删除重复的 Tools/ 目录
echo ""
echo "步骤1: 处理重复的 Tools/ 目录"
echo "--------------------------------"
if [ -d "$BASE_DIR/Tools" ]; then
    echo "✓ 备份 Tools/ 目录..."
    cp -r "$BASE_DIR/Tools" "$BACKUP_DIR/"
    echo "✓ 删除 Tools/ 目录..."
    rm -rf "$BASE_DIR/Tools"
    echo "✅ 已删除重复的 Tools/ 目录"
else
    echo "⚠️  Tools/ 目录不存在"
fi

# 步骤2: 删除重复的 courses/rxjs/ 目录
echo ""
echo "步骤2: 处理重复的 courses/rxjs/ 目录"
echo "--------------------------------"
if [ -d "$BASE_DIR/courses/rxjs" ]; then
    echo "✓ 备份 courses/rxjs/ 目录..."
    cp -r "$BASE_DIR/courses/rxjs" "$BACKUP_DIR/"
    echo "✓ 删除 courses/rxjs/ 目录..."
    rm -rf "$BASE_DIR/courses/rxjs"
    echo "✅ 已删除重复的 courses/rxjs/ 目录"
else
    echo "⚠️  courses/rxjs/ 目录不存在"
fi

# 步骤3: 移动分类错误的文件
echo ""
echo "步骤3: 移动分类错误的文件"
echo "--------------------------------"

# 移动安全相关文件
if [ -f "$BASE_DIR/tools/从手动到自动-Go语言助力快速识别代码中的安全隐患.md" ]; then
    mkdir -p "$BASE_DIR/security/engineering"
    mv "$BASE_DIR/tools/从手动到自动-Go语言助力快速识别代码中的安全隐患.md" \
       "$BASE_DIR/security/engineering/"
    echo "✓ 已移动安全检测工具到 security/engineering/"
fi

# 移动方法论文件
if [ -f "$BASE_DIR/tools/测试驱动开发 以测试为引擎的软件工程实践.md" ]; then
    mkdir -p "$BASE_DIR/thinking/method"
    mv "$BASE_DIR/tools/测试驱动开发 以测试为引擎的软件工程实践.md" \
       "$BASE_DIR/thinking/method/"
    echo "✓ 已移动方法论文章到 thinking/method/"
fi

# 移动Go开发相关文件
if [ -f "$BASE_DIR/tools/让CLI工具焕然一新！用golang与Color库打造多彩命令行体验.md" ]; then
    mkdir -p "$BASE_DIR/dev/backend/golang"
    mv "$BASE_DIR/tools/让CLI工具焕然一新！用golang与Color库打造多彩命令行体验.md" \
       "$BASE_DIR/dev/backend/golang/"
    echo "✓ 已移动Go CLI开发文章到 dev/backend/golang/"
fi

# 步骤4: 移动thinking/notes/下的AI工具文章到tools/
echo ""
echo "步骤4: 移动 AI 工具文章到 tools/"
echo "--------------------------------"

if [ -f "$BASE_DIR/thinking/notes/Vibe-Coding-时代的开发者：如何跟-ChatGPT-5.1-一起写代码，而不是被替代.md" ]; then
    mv "$BASE_DIR/thinking/notes/Vibe-Coding-时代的开发者：如何跟-ChatGPT-5.1-一起写代码，而不是被替代.md" \
       "$BASE_DIR/tools/"
    echo "✓ 已移动 Vibe Coding 文章到 tools/"
fi

if [ -f "$BASE_DIR/thinking/notes/Qwen Code 30个使用小技巧.md" ]; then
    mv "$BASE_DIR/thinking/notes/Qwen Code 30个使用小技巧.md" "$BASE_DIR/tools/"
    echo "✓ 已移动 Qwen Code 文章到 tools/"
fi

if [ -f "$BASE_DIR/thinking/notes/使用扣子AI打造公众号机器人.md" ]; then
    mkdir -p "$BASE_DIR/data/automation"
    mv "$BASE_DIR/thinking/notes/使用扣子AI打造公众号机器人.md" "$BASE_DIR/data/automation/"
    echo "✓ 已移动扣子AI文章到 data/automation/"
fi

# 步骤5: 移动根目录的文章
echo ""
echo "步骤5: 移动根目录的孤立文章"
echo "--------------------------------"

if [ -f "$BASE_DIR/wails-gonavi-practice.md" ]; then
    mkdir -p "$BASE_DIR/thinking/notes"
    mv "$BASE_DIR/wails-gonavi-practice.md" "$BASE_DIR/thinking/notes/"
    echo "✓ 已移动 Wails 实践文章到 thinking/notes/"
fi

if [ -f "$BASE_DIR/thinking/现代Web系统开发 与 传统Web系统开发 的差异.md" ]; then
    mkdir -p "$BASE_DIR/thinking/method"
    mv "$BASE_DIR/thinking/现代Web系统开发 与 传统Web系统开发 的差异.md" \
       "$BASE_DIR/thinking/method/"
    echo "✓ 已移动Web系统开发对比文章到 thinking/method/"
fi

# 完成
echo ""
echo "======================================"
echo "✅ 优化完成！"
echo "======================================"
echo ""
echo "📊 操作摘要:"
echo "  - 已删除 2 个重复目录"
echo "  - 已移动 8 个文件到正确位置"
echo "  - 备份位置: $BACKUP_DIR"
echo ""
echo "⚠️  如需回滚,请使用备份目录恢复文件"
