#!/usr/bin/env python3
"""
标签规范化脚本 —— 统一大小写不一致的标签 + 合并碎片化标签。

版本 2.0: 增加 PHP 碎片标签合并 + 正则模式匹配
"""

import re
import sys
from pathlib import Path

# ---- 精确匹配映射 ----
EXACT_MAP = {
    # 大小写规范化
    "go": "golang",
    "Go": "golang",
    "Golang": "golang",
    "Go语言": "golang",
    "PHP": "php",
    "python": "Python",
    "wails": "Wails",
    "devops": "DevOps",
    "docker": "Docker",
    "fastapi": "FastAPI",
    "Security": "security",
    "kubernetes": "Kubernetes",
    "performance": "Performance",
    "observability": "Observability",
    "tutorial": "Tutorial",
    # 明确重复标签合并
    "Wails v2": "Wails",
    "Wails教程": "Wails",
    "Go GUI": "golang",
    "Go桌面应用": "golang",
    # PHP 碎片合并
    "php钩子": "PHP钩子",
    "php钩子的实现": "PHP钩子",
    "php钩子应用": "PHP钩子",
    "php协程": "PHP协程",
    "php异步处理": "PHP异步",
    "php异步协程": "PHP协程",
    "php-fpm配置文件详解": "PHP-FPM",
    "php-fpm配置文件解析": "PHP-FPM",
    "php-fpm配置文件": "PHP-FPM",
    "php84": "PHP8",
    # 内部清理：无意义的 tag
    "PFinal南丞": "PFinalClub",
    "Backend": "后端开发",
    "Frontend": "前端开发",
}

# ---- 正则模式匹配 (用于批量合并) ----
# 匹配后替换为对应值。按顺序匹配，先匹配先生效。
REGEX_RULES = [
    # PHP-FPM 所有变体 → PHP-FPM
    (r'^PHP-FPM.*$', 'PHP-FPM'),
    # PHP钩子 所有变体 → PHP钩子
    (r'^PHP钩子.*$', 'PHP钩子'),
    # PHP生成器 所有变体 → PHP生成器
    (r'^PHP生成器.*$', 'PHP生成器'),
    # PHP异步 所有变体 → PHP异步
    (r'^PHP异步.*$', 'PHP异步'),
    # PHP协程 所有变体 → PHP协程
    (r'^PHP协程.*$', 'PHP协程'),
    # PHP错误 所有变体 → PHP错误处理
    (r'^PHP错误.*$', 'PHP错误处理'),
    (r'^PHP异常.*$', 'PHP错误处理'),
    # PHP配置 所有变体 → PHP配置
    (r'^PHP配置.*$', 'PHP配置'),
    # PHP性能 所有变体 → PHP性能
    (r'^PHP性能.*$', 'PHP性能'),
    # PHP进程 所有变体 → PHP进程
    (r'^PHP进程.*$', 'PHP进程'),
    # PHP线程 所有变体 → PHP线程
    (r'^PHP线程.*$', 'PHP线程'),
    # PHP8 系列 → PHP8
    (r'^PHP8\..*$', 'PHP8'),
    (r'^PHP 8\..*$', 'PHP8'),
    (r'^PHP 8\.\d.*$', 'PHP8'),
    # PHP并发
    (r'^PHP并发.*$', 'PHP并发'),
    # PHP安全
    (r'^PHP安全.*$', 'PHP安全'),
    # PHP会话
    (r'^PHP会话.*$', 'PHP会话'),
    # PHP服务器
    (r'^PHP服务器.*$', 'PHP服务器'),
    # PHP调试
    (r'^PHP调试.*$', 'PHP调试'),
    # PHP框架
    (r'^PHP框架.*$', 'PHP框架'),
    # PHP插件 (钩子相关)
    (r'^PHP插件.*$', 'PHP钩子'),
    # PHP编程 → php (太泛)
    (r'^PHP编程.*$', 'php'),
    (r'^PHP开发.*$', 'php'),
    (r'^PHP教程.*$', 'php'),
    (r'^PHP学习.*$', 'php'),
    # PHP部署 / 环境
    (r'^PHP部署.*$', 'php'),
    (r'^PHP环境.*$', 'php'),
    # PHP代码
    (r'^PHP代码.*$', 'php'),
    # PHP生态/开源
    (r'^PHP生态.*$', 'php'),
    (r'^PHP开源.*$', 'php'),
    # PHP最佳实践
    (r'^PHP最佳实践.*$', 'PHP最佳实践'),
    # PHP新技术
    (r'^PHP新特性.*$', 'PHP8'),
    # PHP web
    (r'^PHP Web.*$', 'php'),
    # PHP消息队列
    (r'^PHP消息.*$', 'PHP消息队列'),
    # PHP Redis
    (r'^PHP Redis.*$', 'PHP-Redis'),
    # PHP文件
    (r'^PHP文件.*$', 'php'),
    # PHP数据库
    (r'^PHP数据库.*$', 'PHP数据库'),
    # PHP MVC
    (r'^PHP MVC.*$', 'PHP框架'),
    # PHP 事件
    (r'^PHP事件.*$', 'php'),
    # PHP 依赖
    (r'^PHP依赖.*$', 'php'),
    # PHP 内存
    (r'^PHP内存.*$', 'php'),
    # PHP 信号
    (r'^PHP信号.*$', 'php'),
    # PHP属性
    (r'^PHP属性.*$', 'php'),
    # PHP正则
    (r'^PHP正则.*$', 'php'),
    # PHP yield
    (r'^PHP yield.*$', 'PHP生成器'),
    # PHP 返回值
    (r'^PHP返回值.*$', 'php'),
    # PHP 请求
    (r'^PHP请求.*$', 'php'),
    # PHP 程序
    (r'^PHP程序.*$', 'php'),
    # PHP 多进程
    (r'^PHP多进程.*$', 'PHP进程'),
    # PHP 守护进程
    (r'^PHP守护进程.*$', 'PHP进程'),
    # PHP 大杀器
    (r'^PHP 大杀器.*$', 'PHP生成器'),
    # PHPStorm
    (r'^PHPStorm.*$', 'PHPStorm'),
    # PHP 重构
    (r'^PHP重构.*$', 'php'),
    # PHP API
    (r'^PHP API.*$', 'PHP-API'),
    # PHP AI
    (r'^PHP AI.*$', 'php'),
    # PHP Laravel → keep as is? no, merge to Laravel
    # Actually Laravel is already a tag, PHP with Laravel context → php
]

# 去重：如果正则规则会产生重复（一个文件中两个不同的标签合并后变成同一个），需要去重


def normalize_tag(tag: str) -> str | None:
    """Normalize a single tag value. Returns new value, or None if unchanged."""
    original = tag

    # 1. Exact match first
    if tag in EXACT_MAP:
        return EXACT_MAP[tag]

    # 2. Regex match
    for pattern, replacement in REGEX_RULES:
        if re.match(pattern, tag):
            if replacement != tag:
                return replacement
            return None  # matched but no change needed

    return None


# 需要处理的 list 字段: tags 和 keywords
LIST_FIELDS = {'tags:', 'tags :', 'keywords:', 'keywords :'}


def process_file(filepath: str) -> int:
    """Process a single markdown file. Returns number of changes."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    in_frontmatter = False
    in_list_section = False  # inside tags: or keywords:
    changed = 0

    new_lines = []
    for i, line in enumerate(lines):
        stripped = line.strip()

        # Track frontmatter boundaries
        if stripped == '---':
            if not in_frontmatter:
                in_frontmatter = True
            else:
                in_frontmatter = False
                in_list_section = False
            new_lines.append(line)
            continue

        if not in_frontmatter:
            new_lines.append(line)
            continue

        # Inside frontmatter: detect list field
        if stripped in LIST_FIELDS:
            in_list_section = True
            new_lines.append(line)
            continue

        if in_list_section and re.match(r'^\s*-\s+', line):
            tag_match = re.match(r'^(\s*-\s+)(.*?)$', line)
            if tag_match:
                prefix = tag_match.group(1)
                value = tag_match.group(2).strip()
                quoted = False
                if (value.startswith('"') and value.endswith('"')) or \
                   (value.startswith("'") and value.endswith("'")):
                    value = value[1:-1]
                    quoted = True

                new_val = normalize_tag(value)
                if new_val is not None and new_val != value:
                    if quoted:
                        new_line = f'{prefix}"{new_val}"'
                    else:
                        new_line = f'{prefix}{new_val}'
                    changed += 1
                    new_lines.append(new_line)
                    continue

            new_lines.append(line)
            continue

        # Exit list section on next frontmatter key
        if in_list_section and re.match(r'^\w[\w\s]*:', stripped):
            in_list_section = False

        new_lines.append(line)

    if changed > 0:
        # Post-process: deduplicate within each list section
        new_content = '\n'.join(new_lines)
        new_content = deduplicate_lists(new_content)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return changed

    return 0


def deduplicate_lists(content: str) -> str:
    """Remove duplicate entries within each tags:/keywords: section."""
    lines = content.split('\n')
    in_frontmatter = False
    in_list_section = False
    seen = set()
    new_lines = []

    for line in lines:
        stripped = line.strip()

        if stripped == '---':
            in_frontmatter = not in_frontmatter
            if not in_frontmatter:
                in_list_section = False
                seen = set()
            new_lines.append(line)
            continue

        if not in_frontmatter:
            new_lines.append(line)
            continue

        if stripped in LIST_FIELDS:
            in_list_section = True
            seen = set()
            new_lines.append(line)
            continue

        if in_list_section and re.match(r'^\s*-\s+', line):
            tag_match = re.match(r'^\s*-\s+(.*)', line)
            if tag_match:
                value = tag_match.group(1).strip().strip('"').strip("'")
                if value in seen:
                    continue  # skip duplicate
                seen.add(value)
            new_lines.append(line)
            continue

        if in_list_section and re.match(r'^\w[\w\s]*:', stripped):
            in_list_section = False

        new_lines.append(line)

    return '\n'.join(new_lines)


def main():
    docs_dir = Path(__file__).parent.parent / 'docs'
    if not docs_dir.exists():
        print(f"Error: docs directory not found at {docs_dir}")
        sys.exit(1)

    total_files = 0
    total_changes = 0

    for md_file in sorted(docs_dir.rglob('*.md')):
        if '.vitepress' in str(md_file):
            continue

        changes = process_file(str(md_file))
        if changes > 0:
            rel = md_file.relative_to(docs_dir)
            print(f"  [{changes:>2} tags] {rel}")
            total_files += 1
            total_changes += changes

    print(f"\n{'='*60}")
    print(f"总计: {total_files} 个文件, {total_changes} 个标签变更")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
