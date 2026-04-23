#!/usr/bin/env python3
"""
检查整个 docs 目录中缺失的文章链接
"""

import os
import re
from pathlib import Path
from collections import defaultdict

def find_all_md_files(base_path):
    """查找所有 markdown 文件"""
    md_files = set()
    for root, dirs, files in os.walk(base_path):
        # 跳过 .vitepress 目录
        if '.vitepress' in root:
            continue
        for file in files:
            if file.endswith('.md'):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, base_path)
                md_files.add(rel_path)
    return md_files

def extract_links_from_file(file_path):
    """从文件中提取所有 Markdown 链接"""
    links = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 匹配 Markdown 链接: [text](path)
        # 也匹配没有 .md 扩展名的链接
        pattern = r'\[([^\]]+)\]\(([^)]+)\)'
        matches = re.findall(pattern, content)
        
        for text, path in matches:
            # 跳过外部链接和锚点
            if path.startswith('http') or path.startswith('#') or path.startswith('mailto'):
                continue
            # 跳过图片
            if text.startswith('!'):
                continue
            links.append((text, path))
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    
    return links

def resolve_link(link_path, current_file, base_path):
    """解析链接对应的实际文件路径"""
    # 移除锚点
    if '#' in link_path:
        link_path = link_path.split('#')[0]
    
    # 如果链接以 / 开头，表示从 docs 根目录开始
    if link_path.startswith('/'):
        # 移除开头的 /
        link_path = link_path[1:]
        # 添加 .md 扩展名（如果没有）
        if not link_path.endswith('.md'):
            # 可能是目录，尝试 index.md
            if link_path.endswith('/'):
                link_path = link_path + 'index.md'
            else:
                link_path = link_path + '.md'
        return link_path
    
    # 相对路径
    current_dir = os.path.dirname(current_file)
    resolved = os.path.normpath(os.path.join(current_dir, link_path))
    
    # 添加 .md 扩展名（如果没有）
    if not resolved.endswith('.md'):
        # 可能是目录，尝试 index.md
        resolved_md = resolved + '.md'
        resolved_index = os.path.join(resolved, 'index.md')
        # 返回两种可能性，后面会检查
        return [resolved_md, resolved_index]
    
    return resolved

def main():
    base_path = Path("/Users/pfinal/Documents/pfinal-vue-blog/docs")
    
    # 获取所有 markdown 文件
    print("正在扫描所有 markdown 文件...")
    md_files = find_all_md_files(base_path)
    print(f"找到 {len(md_files)} 个 markdown 文件")
    
    # 收集所有链接
    print("\n正在检查链接...")
    missing_links = defaultdict(list)
    
    for md_file in sorted(md_files):
        file_path = base_path / md_file
        links = extract_links_from_file(file_path)
        
        for text, link_path in links:
            resolved = resolve_link(link_path, md_file, base_path)
            
            # 处理返回列表的情况（相对路径可能有两种解析方式）
            if isinstance(resolved, list):
                if not any(r in md_files for r in resolved):
                    # 都不存在，记录第一个作为缺失
                    missing_links[md_file].append((text, link_path, resolved[0]))
            else:
                if resolved not in md_files:
                    missing_links[md_file].append((text, link_path, resolved))
    
    # 输出结果
    print("\n" + "="*70)
    print("缺失的文章链接报告")
    print("="*70)
    
    if not missing_links:
        print("\n✅ 所有链接都有效！")
        return
    
    total_missing = 0
    for source_file, links in sorted(missing_links.items()):
        print(f"\n📄 {source_file}")
        print("-" * 50)
        for text, original_link, resolved in links:
            print(f"  ❌ [{text}]({original_link})")
            print(f"     期望文件: {resolved}")
            total_missing += 1
    
    print("\n" + "="*70)
    print(f"\n❌ 总共发现 {total_missing} 个缺失的链接")
    print("="*70)

if __name__ == "__main__":
    main()
