#!/usr/bin/env python3
"""
分析短内容文章，生成合并/扩充计划
"""
import os
import re
from collections import defaultdict

def get_content_length(file_path):
    """获取 Markdown 内容的实际长度（不含 frontmatter）"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 移除 frontmatter
        if content.startswith('---'):
            parts = content.split('---', 2)
            if len(parts) >= 3:
                content = parts[2]
        
        # 清理空白
        content = content.strip()
        
        # 移除代码块标记，保留代码内容
        content = re.sub(r'```[\w]*\n', '', content)
        content = content.replace('```', '')
        
        return len(content)
    except:
        return 0

def extract_title(file_path):
    """从 frontmatter 提取 title"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        match = re.search(r'title:\s*["\']?([^"\'\n]+)["\']?', content)
        return match.group(1) if match else os.path.basename(file_path)
    except:
        return os.path.basename(file_path)

def extract_tags(file_path):
    """从 frontmatter 提取 tags"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        match = re.search(r'tags:\s*\n((?:\s+-\s*[^\n]+\n?)*)', content)
        if match:
            tags_text = match.group(1)
            tags = re.findall(r'-\s*([^\n]+)', tags_text)
            return [t.strip() for t in tags]
        return []
    except:
        return []

def main():
    # 扫描所有 Markdown 文件
    short_articles = []
    base_path = 'docs'
    
    for root, dirs, files in os.walk(base_path):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        for file in files:
            if file.endswith('.md'):
                file_path = os.path.join(root, file)
                content_len = get_content_length(file_path)
                
                if content_len < 1000:
                    title = extract_title(file_path)
                    tags = extract_tags(file_path)
                    short_articles.append({
                        'path': file_path,
                        'title': title,
                        'length': content_len,
                        'tags': tags
                    })
    
    # 按长度排序
    short_articles.sort(key=lambda x: x['length'])
    
    # 分类
    very_short = [a for a in short_articles if a['length'] < 500]
    short = [a for a in short_articles if 500 <= a['length'] < 1000]
    
    print(f"=== 极短内容分析 (<1000字符) ===\n")
    print(f"总计: {len(short_articles)} 篇")
    print(f"  - 极短 (<500字符): {len(very_short)} 篇")
    print(f"  - 短文 (500-1000字符): {len(short)} 篇\n")
    
    print("=== 极短内容详情 (<500字符) ===\n")
    for i, article in enumerate(very_short[:30], 1):
        print(f"{i}. {article['title']}")
        print(f"   路径: {article['path']}")
        print(f"   长度: {article['length']} 字符")
        print(f"   标签: {', '.join(article['tags']) if article['tags'] else '无'}")
        print()
    
    print("\n=== 短文内容详情 (500-1000字符) ===\n")
    for i, article in enumerate(short[:20], 1):
        print(f"{i}. {article['title']}")
        print(f"   路径: {article['path']}")
        print(f"   长度: {article['length']} 字符")
        print(f"   标签: {', '.join(article['tags']) if article['tags'] else '无'}")
        print()
    
    # 按目录分组
    by_dir = defaultdict(list)
    for article in short_articles:
        dir_name = os.path.dirname(article['path']).replace('docs/', '')
        by_dir[dir_name].append(article)
    
    print("\n=== 按目录分布 ===\n")
    for dir_name, articles in sorted(by_dir.items(), key=lambda x: -len(x[1])):
        print(f"{dir_name}: {len(articles)} 篇")

if __name__ == '__main__':
    main()
