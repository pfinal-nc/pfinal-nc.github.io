#!/usr/bin/env node

/**
 * 批量为文章添加课程标记 - 第二轮整理
 * 为更多文章添加课程关联
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// 课程文章映射配置 - 第二轮
const courseMappings = {
  // ==================== Go 后端工程师课程 ====================
  // 模块 1: Go 核心进阶
  'docs/dev/backend/golang/Go 语言并发模式实战指南.md': {
    name: 'Go 后端工程师成长路线',
    module: 1,
    lesson: 1.3
  },
  'docs/dev/backend/golang/Go 1.26 SIMD 编程实战：从入门到高性能优化.md': {
    name: 'Go 后端工程师成长路线',
    module: 1,
    lesson: 1.6
  },
  'docs/dev/backend/golang/深入理解 Go Channel 批量读取与实际应用.md': {
    name: 'Go 后端工程师成长路线',
    module: 1,
    lesson: 1.2
  },
  'docs/dev/backend/golang/runtime.free 打破 Go GC 性能瓶颈的秘密武器.md': {
    name: 'Go 后端工程师成长路线',
    module: 1,
    lesson: 1.4
  },
  'docs/dev/backend/golang/Stop-The-World 其实没停下-Go-GC-的微暂停真相.md': {
    name: 'Go 后端工程师成长路线',
    module: 1,
    lesson: 1.4
  },
  'docs/dev/backend/golang/Deep-Dive-Go-Memory-Allocation.md': {
    name: 'Go 后端工程师成长路线',
    module: 1,
    lesson: 1.1
  },
  'docs/dev/backend/golang/Go 零拷贝读取器实战与原理解析.md': {
    name: 'Go 后端工程师成长路线',
    module: 1,
    lesson: 1.5
  },
  
  // 模块 2: Web 框架实战
  'docs/dev/backend/golang/2025 年最佳 Go Web 框架深度解析：资深开发者的选择指南.md': {
    name: 'Go 后端工程师成长路线',
    module: 2,
    lesson: 2.1
  },
  'docs/thinking/method/2025 年最佳 Go-Web 框架深度解析：资深开发者的选择指南.md': {
    name: 'Go 后端工程师成长路线',
    module: 2,
    lesson: 2.1
  },
  'docs/dev/backend/golang/如何实现 RESTful API 版本控制.md': {
    name: 'Go 后端工程师成长路线',
    module: 2,
    lesson: 2.3
  },
  'docs/dev/backend/golang/接口参数设计 - 多场景复用的优雅之道.md': {
    name: 'Go 后端工程师成长路线',
    module: 2,
    lesson: 2.3
  },
  'docs/thinking/method/基于 golang 的高性能游戏接口设计.md': {
    name: 'Go 后端工程师成长路线',
    module: 2,
    lesson: 2.2
  },
  'docs/thinking/method/Golang Socket 通信架构分析与实现 - 构建高性能游戏服务器.md': {
    name: 'Go 后端工程师成长路线',
    module: 2,
    lesson: 2.2
  },
  
  // 模块 3: 数据库设计与优化
  'docs/dev/backend/golang/ClickHouse 实战：从入门到高性能 OLAP 查询.md': {
    name: 'Go 后端工程师成长路线',
    module: 3,
    lesson: 3.4
  },
  'docs/dev/system/database/MySQL-Configuration-Analysis.md': {
    name: 'Go 后端工程师成长路线',
    module: 3,
    lesson: 3.1
  },
  'docs/dev/system/database/PostgreSQL-10 个鲜为人知的强大功能.md': {
    name: 'Go 后端工程师成长路线',
    module: 3,
    lesson: 3.2
  },
  
  // 模块 4: 微服务与工程化
  'docs/thinking/method/高质量 Golang 后端的现代软件工程原则.md': {
    name: 'Go 后端工程师成长路线',
    module: 4,
    lesson: 4.1
  },
  'docs/thinking/method/GitOps 实战 - 从应用部署到全生命周期管理.md': {
    name: 'Go 后端工程师成长路线',
    module: 4,
    lesson: 4.7
  },
  'docs/dev/backend/golang/GitOps 实战：从应用部署到全生命周期管理.md': {
    name: 'Go 后端工程师成长路线',
    module: 4,
    lesson: 4.7
  },
  
  // 模块 5: 可观测性
  'docs/thinking/method/从 trace 到洞察：Go 项目的可观测性闭环实践.md': {
    name: 'Go 后端工程师成长路线',
    module: 5,
    lesson: 5.5
  },
  'docs/thinking/method/别再盲接 OTel：Go 可观察性接入的 8 个大坑.md': {
    name: 'Go 后端工程师成长路线',
    module: 5,
    lesson: 5.5
  },
  'docs/tools/使用 Devslog 结构化日志处理.md': {
    name: 'Go 后端工程师成长路线',
    module: 5,
    lesson: 5.2
  },
  
  // ==================== Wails 课程 ====================
  'docs/dev/backend/golang/基于 Wails 的抖音直播工具.md': {
    name: 'Wails 跨平台桌面开发实战',
    module: 3,
    lesson: 3.2
  },
  'docs/dev/backend/golang/基于 wails 和 Tailwindcss 的应用开发.md': {
    name: 'Wails 跨平台桌面开发实战',
    module: 3,
    lesson: 3.3
  },
  'docs/dev/backend/golang/基于 Wails 和 Vue.js 打造跨平台桌面应用.md': {
    name: 'Wails 跨平台桌面开发实战',
    module: 3,
    lesson: 3.3
  },
  'docs/dev/backend/golang/基于 Wails 的 Mac 桌面应用开发.md': {
    name: 'Wails 跨平台桌面开发实战',
    module: 3,
    lesson: 3.3
  },
  'docs/dev/backend/golang/提升 Wails 应用性能：探索 Go-Cache 的高效内存缓存方案.md': {
    name: 'Wails 跨平台桌面开发实战',
    module: 4,
    lesson: 4.2
  },
  'docs/thinking/method/Fyne-深度技术解析 - 面向资深 Go 开发者的架构设计分析.md': {
    name: 'Wails 跨平台桌面开发实战',
    module: 1,
    lesson: 1.1
  },
  'docs/thinking/method/Fyne 与 Wails 深度对比 - 选择最适合你的 Go 桌面应用框架.md': {
    name: 'Wails 跨平台桌面开发实战',
    module: 1,
    lesson: 1.1
  },
  
  // ==================== RxJS 课程 ====================
  'docs/dev/backend/rxjs/introduction/introduction.md': {
    name: 'RxJS 响应式编程实战手册',
    module: 1,
    lesson: 1.1
  },
  'docs/dev/backend/rxjs/core-concepts/observables.md': {
    name: 'RxJS 响应式编程实战手册',
    module: 1,
    lesson: 1.2
  },
  'docs/dev/backend/rxjs/core-concepts/observers.md': {
    name: 'RxJS 响应式编程实战手册',
    module: 1,
    lesson: 1.3
  },
  'docs/dev/backend/rxjs/core-concepts/subjects.md': {
    name: 'RxJS 响应式编程实战手册',
    module: 1,
    lesson: 1.5
  },
  'docs/dev/backend/rxjs/core-concepts/operators.md': {
    name: 'RxJS 响应式编程实战手册',
    module: 1,
    lesson: 1.6
  },
  
  // ==================== PHP 相关课程 ====================
  'docs/thinking/method/PHP 8.x 企业级开发实战指南 从语言特性到生产部署.md': {
    name: 'PHP 企业级开发实战',
    module: 1,
    lesson: 1.1
  },
  'docs/dev/backend/php/现代 PHP 开发实战.md': {
    name: 'PHP 企业级开发实战',
    module: 1,
    lesson: 1.1
  },
  'docs/dev/backend/php/PHP 旧项目重构实战：从单体到微服务.md': {
    name: 'PHP 企业级开发实战',
    module: 2,
    lesson: 2.1
  },
  
  // ==================== Python 相关课程 ====================
  'docs/dev/backend/python/FastAPI 现代化 Web 开发 - 异步开发、自动 API 文档生成.md': {
    name: 'Python Web 开发实战',
    module: 1,
    lesson: 1.1
  },
  'docs/dev/backend/python/Flask 轻量级应用构建 - 扩展开发、蓝图设计.md': {
    name: 'Python Web 开发实战',
    module: 1,
    lesson: 1.2
  },
  'docs/dev/backend/python/Python-Asyncio-Advanced-Patterns.md': {
    name: 'Python 异步编程',
    module: 1,
    lesson: 1.1
  },
  'docs/dev/backend/python/Python-Data-Visualization-Guide.md': {
    name: 'Python 数据可视化',
    module: 1,
    lesson: 1.1
  },
  
  // ==================== DevOps 课程 ====================
  'docs/tools/Docker 部署 Go 项目实践指南.md': {
    name: 'DevOps 工程实践',
    module: 1,
    lesson: 1.5
  },
  'docs/tools/单文件代码部署工具.md': {
    name: 'DevOps 工程实践',
    module: 1,
    lesson: 1.5
  },
  'docs/thinking/method/GitOps 实战 - 从应用部署到全生命周期管理.md': {
    name: 'DevOps 工程实践',
    module: 3,
    lesson: 3.7
  },
  
  // ==================== 安全工程师课程 ====================
  'docs/security/engineering/10 个 Golang 安全陷阱及真正有效的修复方案.md': {
    name: '安全工程师成长路线',
    module: 2,
    lesson: 2.2
  },
  'docs/security/engineering/golang Web 应用完整安全指南.md': {
    name: '安全工程师成长路线',
    module: 2,
    lesson: 2.2
  },
  'docs/security/engineering/golang 中的网络安全 TLS SSL 的实现.md': {
    name: '安全工程师成长路线',
    module: 3,
    lesson: 3.3
  },
  'docs/security/engineering/Go 语言主流安全库使用指南.md': {
    name: '安全工程师成长路线',
    module: 3,
    lesson: 3.6
  },
  'docs/tools/从手动到自动-Go 语言助力快速识别代码中的安全隐患.md': {
    name: '安全工程师成长路线',
    module: 3,
    lesson: 3.7
  },
  
  // ==================== 工具类文章 ====================
  'docs/tools/Git 基本操作.md': {
    name: '开发者工具集',
    module: 1,
    lesson: 1.1
  },
  'docs/tools/Git 高级命令教程.md': {
    name: '开发者工具集',
    module: 1,
    lesson: 1.2
  },
  'docs/tools/VSCode 快捷键.md': {
    name: '开发者工具集',
    module: 1,
    lesson: 1.3
  },
  'docs/tools/PHPStorm 快捷键.md': {
    name: '开发者工具集',
    module: 1,
    lesson: 1.3
  },
  'docs/tools/Tmux 常用快捷键.md': {
    name: '开发者工具集',
    module: 1,
    lesson: 1.4
  },
  'docs/tools/IDE 偷懒小工具.md': {
    name: '开发者工具集',
    module: 1,
    lesson: 1.5
  },
  
  // ==================== 数据与自动化课程 ====================
  'docs/data/automation/Go 构建远程存储 MCP 服务器实战.md': {
    name: 'AI 工程与自动化',
    module: 1,
    lesson: 1.1
  },
  'docs/data/automation/MCP 服务器精选：提升 AI 编程效率的 5 大神器.md': {
    name: 'AI 工程与自动化',
    module: 1,
    lesson: 1.2
  },
  'docs/data/automation/MCP 提示语管理工具.md': {
    name: 'AI 工程与自动化',
    module: 1,
    lesson: 1.3
  },
  'docs/data/automation/autogen-financial-analysis.md': {
    name: 'AI 工程与自动化',
    module: 2,
    lesson: 2.1
  },
  'docs/data/automation/爬虫 JS 逆向 Webpack 技巧记录.md': {
    name: '数据采集工程',
    module: 1,
    lesson: 1.1
  },
  'docs/data/automation/爬虫常见的加密解密算法.md': {
    name: '数据采集工程',
    module: 1,
    lesson: 1.2
  },
  'docs/data/automation/爬虫常见的加密解密算法特征收集.md': {
    name: '数据采集工程',
    module: 1,
    lesson: 1.2
  },
  'docs/data/automation/Python 协程.md': {
    name: 'Python 异步编程',
    module: 1,
    lesson: 1.1
  },
  
  // ==================== 思考/方法论 ====================
  'docs/thinking/method/从 0 到 1 构建自己的思考体系.md': {
    name: '技术思考与方法论',
    module: 1,
    lesson: 1.1
  },
  'docs/thinking/notes/Qwen Code 30 个使用小技巧.md': {
    name: 'AI 编程效率提升',
    module: 1,
    lesson: 1.1
  },
  'docs/thinking/notes/Vibe-Coding-时代的开发者：如何跟-ChatGPT-5.1-一起写代码，而不是被替代.md': {
    name: 'AI 编程效率提升',
    module: 1,
    lesson: 1.2
  },
  'docs/thinking/notes/使用扣子 AI 打造公众号机器人.md': {
    name: 'AI 工程与自动化',
    module: 3,
    lesson: 3.1
  },
};

function addCourseMarker(filePath, courseInfo) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    return { status: 'not_found', path: filePath };
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const fileMatter = matter(content);
  
  // 检查是否已有 course 标记
  if (fileMatter.data.course) {
    return { status: 'exists', path: filePath, course: fileMatter.data.course };
  }
  
  // 添加 course 标记
  const newMatter = {
    ...fileMatter.data,
    course: courseInfo
  };
  
  const newContent = matter.stringify(fileMatter.content, newMatter);
  fs.writeFileSync(fullPath, newContent, 'utf8');
  return { status: 'added', path: filePath, course: courseInfo };
}

function main() {
  console.log('🚀 开始第二轮课程文章标记...\n');
  
  let added = 0;
  let exists = 0;
  let notFound = 0;
  
  const results = {
    added: [],
    exists: [],
    notFound: []
  };
  
  for (const [filePath, courseInfo] of Object.entries(courseMappings)) {
    const result = addCourseMarker(filePath, courseInfo);
    
    if (result.status === 'added') {
      added++;
      results.added.push(result);
      console.log(`✅ ${filePath} -> ${courseInfo.name}`);
    } else if (result.status === 'exists') {
      exists++;
      results.exists.push(result);
    } else {
      notFound++;
      results.notFound.push(result);
    }
  }
  
  console.log('\n=====================');
  console.log(`✅ 新增标记：${added} 篇`);
  console.log(`⏭️  已存在：${exists} 篇`);
  console.log(`❌ 文件不存在：${notFound} 篇`);
  console.log(`📊 总计处理：${Object.keys(courseMappings).length} 篇`);
  
  // 保存结果
  fs.writeFileSync(
    'docs/courses/marker-results.json',
    JSON.stringify(results, null, 2),
    'utf8'
  );
  console.log(`\n💾 详细结果已保存到：docs/courses/marker-results.json`);
}

if (require.main === module) {
  main();
}

module.exports = { addCourseMarker, courseMappings };
