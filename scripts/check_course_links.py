#!/usr/bin/env python3
"""
检查课程页面中引用的文章链接是否存在
"""
import os
import re
from pathlib import Path

def extract_links_from_file(filepath):
    """从 markdown 文件中提取所有链接"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 匹配 markdown 链接 [text](path)
    pattern = r'\[([^\]]+)\]\(([^)]+)\)'
    links = re.findall(pattern, content)
    return links

def check_link_exists(link_path, docs_dir):
    """检查链接指向的文件是否存在"""
    # 移除 .md 扩展名（如果有）
    if link_path.endswith('.md'):
        link_path = link_path[:-3]
    
    # 移除开头的 /
    if link_path.startswith('/'):
        link_path = link_path[1:]
    
    # 构建可能的文件路径
    possible_paths = [
        docs_dir / f"{link_path}.md",
        docs_dir / link_path / "index.md",
    ]
    
    for path in possible_paths:
        if path.exists():
            return True, str(path.relative_to(docs_dir))
    
    return False, link_path

def main():
    docs_dir = Path('/Users/pfinal/Documents/pfinal-vue-blog/docs')
    courses_dir = docs_dir / 'courses'
    
    if not courses_dir.exists():
        print(f"课程目录不存在: {courses_dir}")
        return
    
    all_missing = []
    
    # 遍历所有课程页面
    for course_file in courses_dir.rglob('*.md'):
        print(f"\n{'='*60}")
        print(f"检查课程: {course_file.relative_to(docs_dir)}")
        print('='*60)
        
        links = extract_links_from_file(course_file)
        
        missing = []
        found = []
        
        for text, link in links:
            # 跳过外部链接
            if link.startswith('http://') or link.startswith('https://') or link.startswith('#'):
                continue
            
            exists, actual_path = check_link_exists(link, docs_dir)
            
            if exists:
                found.append((text, link, actual_path))
            else:
                missing.append((text, link))
        
        if found:
            print(f"\n✅ 存在的链接 ({len(found)}个):")
            for text, link, actual in found[:10]:  # 只显示前10个
                print(f"  - [{text}]({link}) -> {actual}")
            if len(found) > 10:
                print(f"  ... 还有 {len(found) - 10} 个")
        
        if missing:
            print(f"\n❌ 缺失的链接 ({len(missing)}个):")
            for text, link in missing:
                print(f"  - [{text}]({link})")
            all_missing.extend([(str(course_file.relative_to(docs_dir)), text, link) for text, link in missing])
        else:
            print("\n✅ 所有链接都有效！")
    
    # 汇总
    print(f"\n{'='*60}")
    print("汇总报告")
    print('='*60)
    
    if all_missing:
        print(f"\n❌ 总共发现 {len(all_missing)} 个缺失的链接:\n")
        
        # 按课程分组
        by_course = {}
        for course, text, link in all_missing:
            if course not in by_course:
                by_course[course] = []
            by_course[course].append((text, link))
        
        for course, links in by_course.items():
            print(f"\n{course}:")
            for text, link in links:
                print(f"  - [{text}]({link})")
    else:
        print("\n✅ 所有课程页面的链接都有效！")

if __name__ == '__main__':
    main()
