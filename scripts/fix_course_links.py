#!/usr/bin/env python3
"""
修复课程页面中的链接格式
将 .md 扩展名去掉，并映射到正确的文件路径
"""

import os
import re
from pathlib import Path

# 课程页面文件路径
course_files = [
    "docs/courses/golang-backend/index.md",
    "docs/courses/security-engineer/index.md",
    "docs/courses/wails-desktop/index.md",
    "docs/courses/devops-practice/index.md",
    "docs/courses/rxjs/index.md",
]

# 文件名映射表（中文/原始文件名 -> 实际文件名）
file_mapping = {
    # Go 后端工程师课程
    "Go 语言并发模式实战指南.md": "Go-Concurrency-Patterns-Guide.md",
    "Go 1.26 SIMD 编程实战：从入门到高性能优化.md": "Go-SIMD-Programming.md",
    "深入理解 Go Channel 批量读取与实际应用.md": "Go-Channel-Batch-Read.md",
    "Go 零拷贝读取器实战与原理解析.md": "Go-Zero-Copy-Reader.md",
    "runtime.free 打破 Go GC 性能瓶颈的秘密武器.md": "Go-runtime-free-GC-Optimization.md",
    "Stop-The-World 其实没停下-Go-GC-的微暂停真相.md": "Go-STW-Truth.md",
    "2025 年最佳 Go-Web 框架深度解析：资深开发者的选择指南.md": "Go-Web-Framework-2025.md",
    "如何实现 RESTful API  版本控制.md": "Go-RESTful-API-Versioning.md",
    "接口参数设计 - 多场景复用的优雅之道.md": "Go-Interface-Parameter-Design.md",
    "基于 golang  的高性能游戏接口设计.md": "High-Performance-Go-Game-API.md",
    "ClickHouse 实战：从入门到高性能 OLAP 查询.md": "ClickHouse-OLAP-Guide.md",
    "GitOps 实战 - 从应用部署到全生命周期管理.md": "GitOps-Practice-Guide.md",
    "高质量 Golang 后端的现代软件工程原则.md": "Modern-Go-Backend-Engineering.md",
    "从 trace 到洞察：Go 项目的可观测性闭环实践.md": "Go-Observability-Practice.md",
    "别再盲接 OTel：Go 可观察性接入的 8 个大坑.md": "Go-OTel-Pitfalls.md",
    "使用 Devslog 结构化日志处理.md": "Devslog-Structured-Logging.md",
    
    # 安全工程师课程
    "10 个 Golang 安全陷阱及真正有效的修复方案.md": "Go-Security-Pitfalls.md",
    "golang Web 应用完整安全指南.md": "Go-Web-Security-Guide.md",
    "golang 中的网络安全 TLS SSL 的实现.md": "Go-TLS-SSL-Guide.md",
    "Go 语言主流安全库使用指南.md": "Go-Security-Libraries.md",
    
    # Wails 桌面开发课程
    "程序员必备神器：PF-password 密码管理器.md": "PF-Password-Manager.md",
    "基于 Wails 的抖音直播工具.md": "Wails-Douyin-Live-Tool.md",
    "GO 语言开发终端小工具后续.md": "Go-Terminal-Tool-Advanced.md",
    "基于 wails 和 Tailwindcss 的应用开发.md": "Wails-Tailwind-Development.md",
    "基于 Wails 和 Vue.js 打造跨平台桌面应用.md": "Wails-Vue-Desktop-App.md",
    "基于 Wails 的 Mac 桌面应用开发.md": "Wails-Mac-Development.md",
    "提升 Wails 应用性能：探索 Go-Cache 的高效内存缓存方案.md": "Wails-Go-Cache-Performance.md",
    
    # DevOps 工程实践课程
    "Docker 部署 Go 项目实践指南.md": "Docker-Go-Deployment.md",
}

def fix_links_in_file(file_path):
    """修复单个文件中的链接"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 匹配 Markdown 链接: [text](path)
    link_pattern = r'\[([^\]]+)\]\(([^)]+\.md)\)'
    
    def replace_link(match):
        text = match.group(1)
        path = match.group(2)
        
        # 提取文件名部分
        filename = os.path.basename(path)
        
        # 如果文件名在映射表中，替换为正确的文件名
        if filename in file_mapping:
            new_filename = file_mapping[filename]
            # 替换文件名，去掉 .md 扩展名
            new_path = path.replace(filename, new_filename.replace('.md', ''))
            return f'[{text}]({new_path})'
        else:
            # 如果不在映射表中，只去掉 .md 扩展名
            new_path = path.replace('.md', '')
            return f'[{text}]({new_path})'
    
    content = re.sub(link_pattern, replace_link, content)
    
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ 已修复: {file_path}")
        return True
    else:
        print(f"⏭️ 无需修改: {file_path}")
        return False

def main():
    base_dir = Path("/Users/pfinal/Documents/pfinal-vue-blog")
    fixed_count = 0
    
    for file_path in course_files:
        full_path = base_dir / file_path
        if full_path.exists():
            if fix_links_in_file(full_path):
                fixed_count += 1
        else:
            print(f"⚠️ 文件不存在: {file_path}")
    
    print(f"\n📊 总结: 修复了 {fixed_count} 个文件")

if __name__ == "__main__":
    main()
