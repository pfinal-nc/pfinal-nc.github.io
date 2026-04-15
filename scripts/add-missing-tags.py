#!/usr/bin/env python3
"""
批量为缺少 tags 的文章添加 tags
基于标题、内容和目录自动推断合适的标签
"""

import os
import re
from pathlib import Path

def parse_frontmatter(content):
    """解析 frontmatter"""
    if not content.startswith('---'):
        return None, None, content
    
    parts = content.split('---', 2)
    if len(parts) < 3:
        return None, None, content
    
    return parts[0], parts[1], parts[2]

def extract_tags_from_context(filepath, title, content):
    """基于文件路径、标题和内容提取合适的 tags"""
    tags = set()
    filepath_lower = filepath.lower()
    title_lower = title.lower() if title else ''
    content_lower = content.lower()[:3000]  # 只检查前3000字符
    
    # 1. 基于目录的强关联标签
    dir_tags = {
        '/golang/': ['Golang', 'Backend'],
        '/wails/': ['Wails', 'Golang', 'Desktop'],
        '/php/': ['PHP', 'Backend'],
        '/python/': ['Python', 'Backend'],
        '/rxjs/': ['RxJS', 'JavaScript', 'Frontend'],
        '/security/': ['Security'],
        '/tools/': ['Tools'],
        '/thinking/': ['方法论'],
        '/data/': ['Data'],
    }
    
    for dir_path, dir_tag_list in dir_tags.items():
        if dir_path in filepath_lower:
            tags.update(dir_tag_list)
    
    # 2. 基于标题关键词的标签
    title_keywords = {
        'Golang': ['golang', 'go语言', 'go '],
        'PHP': ['php', 'laravel', 'thinkphp'],
        'Python': ['python', 'django', 'flask'],
        'JavaScript': ['javascript', 'js', 'nodejs'],
        'Vue': ['vue', 'vue.js'],
        'React': ['react'],
        'Rust': ['rust'],
        'AI': ['ai', '人工智能', 'llm', 'chatgpt', 'openai', 'rag', 'mcp', '大模型', 'coze'],
        'Wails': ['wails', '桌面应用'],
        'RxJS': ['rxjs', 'observable', 'reactive'],
        'Database': ['mysql', 'postgresql', 'redis', 'mongodb', '数据库'],
        'Docker': ['docker', '容器'],
        'K8s': ['kubernetes', 'k8s'],
        'Security': ['安全', '渗透', '攻防', 'xss', 'sql注入', '漏洞'],
        'Performance': ['性能', '优化', '并发', '缓存'],
        'Testing': ['测试', 'unittest', 'pytest'],
        'Git': ['git', 'github'],
        'HTTP': ['http', 'api', 'rest', 'grpc'],
        'Crawler': ['爬虫', 'scrapy'],
        'Algorithm': ['算法', '数据结构', 'leetcode'],
        'Architecture': ['架构', '设计模式', '微服务'],
        'Tutorial': ['教程', '入门', '指南'],
        'Tools': ['工具', 'cli'],
        'Linux': ['linux', 'shell', 'bash'],
    }
    
    for tag, keywords in title_keywords.items():
        for kw in keywords:
            if kw in title_lower or kw in content_lower:
                tags.add(tag)
                break
    
    # 3. RxJS 特定标签
    if 'rxjs' in filepath_lower:
        tags.add('RxJS')
        tags.add('JavaScript')
        
        # 根据文件名判断具体类型
        if 'operators' in filepath_lower:
            tags.add('Operators')
        if 'scheduler' in filepath_lower:
            tags.add('Performance')
        if 'testing' in filepath_lower:
            tags.add('Testing')
        if 'subject' in filepath_lower:
            tags.add('Reactive')
    
    # 4. Wails 特定标签
    if 'wails' in filepath_lower:
        tags.add('Wails')
        tags.add('Golang')
        tags.add('Desktop')
        if 'install' in title_lower or 'setup' in title_lower:
            tags.add('Tutorial')
        if 'lifecycle' in title_lower or 'webkit' in title_lower:
            tags.add('Architecture')
    
    # 确保至少有 3-5 个标签
    if len(tags) < 3:
        # 添加通用标签
        if 'backend' in filepath_lower or 'golang' in filepath_lower or 'php' in filepath_lower or 'python' in filepath_lower:
            tags.add('Backend')
        if 'frontend' in filepath_lower or 'javascript' in filepath_lower or 'vue' in filepath_lower:
            tags.add('Frontend')
        if len(tags) < 3:
            tags.add('Tutorial')
    
    # 限制最多 6 个标签
    return sorted(list(tags))[:6]

def add_tags_to_file(filepath):
    """为单个文件添加 tags"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if not content.startswith('---'):
            return False, "No frontmatter"
        
        prefix, fm_text, body = parse_frontmatter(content)
        if fm_text is None:
            return False, "Parse error"
        
        # 检查是否已有非空 tags
        if 'tags:' in fm_text:
            # 检查是否有实际的 tag 项
            tags_match = re.search(r'tags:\s*\n((?:\s+-\s*\S+\n?)*)', fm_text)
            if tags_match:
                tags_text = tags_match.group(1)
                existing_tags = re.findall(r'-\s*(\S+)', tags_text)
                if existing_tags:
                    return False, f"Already has tags: {existing_tags}"
            # 检查 tags: [] 格式
            if re.search(r'tags:\s*\[\s*[^\]]+\]', fm_text):
                return False, "Already has tags array"
        
        # 提取标题
        title_match = re.search(r'^title:\s*(.+)$', fm_text, re.MULTILINE)
        title = title_match.group(1).strip().strip('"\'') if title_match else ''
        
        # 生成 tags
        new_tags = extract_tags_from_context(filepath, title, body)
        
        if not new_tags:
            return False, "Could not generate tags"
        
        # 构建新的 frontmatter
        tags_yaml = '\n'.join([f'  - {tag}' for tag in new_tags])
        
        # 检查是否已有空的 tags 行
        if 'tags:' in fm_text:
            # 替换现有的空 tags
            new_fm = re.sub(
                r'tags:\s*(?:\n\s*-[^\n]*)*|tags:\s*\[\s*\]',
                f'tags:\n{tags_yaml}',
                fm_text
            )
        else:
            # 在 frontmatter 末尾添加 tags
            new_fm = fm_text.rstrip() + f'\ntags:\n{tags_yaml}\n'
        
        # 重建文件内容
        new_content = f'---{new_fm}---{body}'
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        return True, new_tags
        
    except Exception as e:
        return False, str(e)

def main():
    docs_dir = Path('docs')
    processed = 0
    failed = 0
    skipped = 0
    
    print("=" * 70)
    print("开始批量添加 tags...")
    print("=" * 70)
    
    for md_file in docs_dir.rglob('*.md'):
        if md_file.name == 'index.md' or md_file.name.startswith('_'):
            continue
        
        success, result = add_tags_to_file(str(md_file))
        
        if success:
            print(f"✅ {md_file}")
            print(f"   Tags: {', '.join(result)}")
            processed += 1
        elif "Already has tags" in result:
            skipped += 1
        else:
            print(f"❌ {md_file}: {result}")
            failed += 1
    
    print("=" * 70)
    print(f"处理完成: {processed} 成功, {skipped} 跳过, {failed} 失败")
    print("=" * 70)

if __name__ == '__main__':
    main()
