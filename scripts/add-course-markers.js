#!/usr/bin/env node

/**
 * 为课程相关文章批量添加 course frontmatter 标记
 * 使用方法：node scripts/add-course-markers.js
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const glob = require('fast-glob');

// 课程文章映射配置
const courseMappings = {
  // Wails 课程
  'docs/dev/backend/wails-tutorial-series/00-webkit-and-lifecycle.md': {
    name: 'Wails 跨平台桌面开发实战',
    module: 1,
    lesson: 1.1
  },
  'docs/dev/backend/wails-tutorial-series/01-installation.md': {
    name: 'Wails 跨平台桌面开发实战',
    module: 1,
    lesson: 1.2
  },
  'docs/dev/backend/wails-tutorial-series/02-first-app.md': {
    name: 'Wails 跨平台桌面开发实战',
    module: 1,
    lesson: 1.3
  },
  'docs/dev/backend/wails-tutorial-series/03-core-concepts.md': {
    name: 'Wails 跨平台桌面开发实战',
    module: 2,
    lesson: 2.1
  },
  'docs/dev/backend/wails-tutorial-series/04-frontend-development.md': {
    name: 'Wails 跨平台桌面开发实战',
    module: 2,
    lesson: 2.2
  },
  'docs/dev/backend/wails-tutorial-series/05-backend-development.md': {
    name: 'Wails 跨平台桌面开发实战',
    module: 2,
    lesson: 2.3
  },
  
  // Wails 相关文章
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
  'docs/dev/backend/golang/使用-Go-systray-构建智能系统托盘应用-Wails-v2-集成实战.md': {
    name: 'Wails 跨平台桌面开发实战',
    module: 3,
    lesson: 3.1
  },
  'docs/dev/backend/golang/提升 Wails 应用性能：探索 Go-Cache 的高效内存缓存方案.md': {
    name: 'Wails 跨平台桌面开发实战',
    module: 4,
    lesson: 4.2
  },
  
  // Go 后端工程师课程 - 模块 1
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
  'docs/dev/backend/golang/Go 零拷贝读取器实战与原理解析.md': {
    name: 'Go 后端工程师成长路线',
    module: 1,
    lesson: 1.5
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
  'docs/thinking/method/Go 语言并发模式实战指南.md': {
    name: 'Go 后端工程师成长路线',
    module: 1,
    lesson: 1.3
  },
  
  // Go 后端工程师课程 - 模块 2
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
  
  // Go 后端工程师课程 - 模块 3
  'docs/dev/backend/golang/ClickHouse 实战：从入门到高性能 OLAP 查询.md': {
    name: 'Go 后端工程师成长路线',
    module: 3,
    lesson: 3.4
  },
  'docs/dev/system/database/MySQL-Production-Security-Hardening-Guide-2025.md': {
    name: 'Go 后端工程师成长路线',
    module: 3,
    lesson: 3.1
  },
  'docs/dev/system/database/PostgreSQL-Performance-Optimization-Guide.md': {
    name: 'Go 后端工程师成长路线',
    module: 3,
    lesson: 3.2
  },
  'docs/dev/system/database/PostgreSQL-Security-Best-Practices-2025.md': {
    name: 'Go 后端工程师成长路线',
    module: 3,
    lesson: 3.2
  },
  
  // Go 后端工程师课程 - 模块 5
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
  
  // DevOps 课程
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
  
  // 安全工程师课程
  'docs/security/engineering/SSH-Security-Hardening-Guide-2025.md': {
    name: '安全工程师成长路线',
    module: 1,
    lesson: 1.2
  },
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
};

function addCourseMarker(filePath, courseInfo) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  文件不存在：${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const fileMatter = matter(content);
  
  // 检查是否已有 course 标记
  if (fileMatter.data.course) {
    console.log(`✅ 已标记：${filePath} -> ${fileMatter.data.course.name}`);
    return false;
  }
  
  // 添加 course 标记
  const newMatter = {
    ...fileMatter.data,
    course: courseInfo
  };
  
  const newContent = matter.stringify(fileMatter.content, newMatter);
  fs.writeFileSync(fullPath, newContent, 'utf8');
  console.log(`✅ 已标记：${filePath} -> ${courseInfo.name} (模块${courseInfo.module}, 课时${courseInfo.lesson})`);
  return true;
}

function main() {
  console.log('🚀 开始为课程文章添加标记...\n');
  
  let successCount = 0;
  let skipCount = 0;
  let notFoundCount = 0;
  
  for (const [filePath, courseInfo] of Object.entries(courseMappings)) {
    const result = addCourseMarker(filePath, courseInfo);
    if (result === true) {
      successCount++;
    } else if (result === false) {
      skipCount++;
    } else {
      notFoundCount++;
    }
  }
  
  console.log('\n=====================');
  console.log(`✅ 新增标记：${successCount} 篇`);
  console.log(`⏭️  已存在/跳过：${skipCount} 篇`);
  console.log(`❌ 文件不存在：${notFoundCount} 篇`);
  console.log(`📊 总计处理：${Object.keys(courseMappings).length} 篇`);
}

// 如果没有直接运行，则导出函数供其他模块使用
if (require.main === module) {
  main();
}

module.exports = { addCourseMarker, courseMappings };
