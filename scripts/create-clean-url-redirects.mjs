import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const distPath = join(__dirname, '../docs/.vitepress/dist')

// 重定向规则列表：from 是相对 dist 的路径（无首 /），to 是站点绝对路径（有首 /）
// 新增于 2026-08-24：修复 GSC 报告的 92 个 404 URL（取前 10 个抽样 + 历史已知）
const redirectPages = [
  // ⚠️ 铁律：绝不为「已存在真实文章」的路径建重定向——脚本在 vitepress build 之后运行，
  //    生成的 X.html 会直接覆盖 VitePress 渲染出的同名文章页，导致文章线上不可访问。
  //
  // 2026-09-10 移除 Tools/online-tools 规则：
  //   docs/Tools/online-tools.md 是真实文章，原规则生成 /Tools/online-tools.html 覆盖了它，
  //   并造成 /Tools/online-tools → /Tools/online-tools/ → /tools/online-tools 循环跳转。

  // 2026-08-24 新增：GSC 报告的 404 URL 修复
  // 1. wails-tutorial-series（连续 2 周 404，旧系列合并遗留）
  { from: 'wails-tutorial-series', to: '/dev/backend/golang/wails/' },
  { from: 'wails-tutorial-series/index', to: '/dev/backend/golang/wails/' },

  // 2. thinking 孤岛目录（6 个）—— 源目录里只有 method/ 和 notes/，没有 system/ 或 backend/
  { from: 'thinking/system', to: '/thinking/method/' },
  { from: 'thinking/system/index', to: '/thinking/method/' },
  { from: 'thinking/system/database', to: '/thinking/method/' },
  { from: 'thinking/system/database/index', to: '/thinking/method/' },
  { from: 'thinking/backend', to: '/thinking/method/' },
  { from: 'thinking/backend/index', to: '/thinking/method/' },
  { from: 'thinking/backend/golang', to: '/thinking/method/' },
  { from: 'thinking/backend/golang/index', to: '/thinking/method/' },
  { from: 'thinking/backend/php', to: '/thinking/method/' },
  { from: 'thinking/backend/php/index', to: '/thinking/method/' },
  { from: 'thinking/backend/python', to: '/thinking/method/' },
  { from: 'thinking/backend/python/index', to: '/thinking/method/' },

  // 3. zh 双路径异常
  { from: 'zh/zh', to: '/' },
  { from: 'zh/zh/index', to: '/' },

  // 4. 旧 zh 路径 + RAG 文章迁移
  // 2026-09-10 修正死链：原 to 指向 /dev/backend/golang/Golang实现RAG系统-...html（不存在），
  // 改指站内真实的 RAG 架构长文 /ai/rag-system-architecture
  { from: 'zh/golang/Building-RAG-System-with-Golang-OpenAI-Vector-Database', to: '/ai/rag-system-architecture' },
  { from: 'zh/golang/Building-RAG-System-with-Golang-OpenAI-Vector-Database/index', to: '/ai/rag-system-architecture' },

  // 5. 中文 slug 路径迁移：原文已下线，回落到 Go 分类 hub（原 to 目标是死链）
  { from: 'golang/2025年最佳Go-Web框架深度解析：资深开发者的选择指南', to: '/dev/backend/golang/' },
  { from: 'golang/2025年最佳Go-Web框架深度解析：资深开发者的选择指南/index', to: '/dev/backend/golang/' },

  // 6. 历史已知 404（来自 8/7 GSC 报告）
  { from: 'zh/golang/Cleaner-Go-Code-in-2025-Compact-Error-Handling', to: '/dev/backend/golang/' },
  // 2026-09-10 移除 tools/Git高级命令教程 规则：macOS 大小写不敏感文件系统下
  // from='tools/Git高级命令教程' 实际写入 Tools/Git高级命令教程.html，覆盖真实文章 docs/Tools/Git高级命令教程.md
  { from: '工具', to: '/Tools/' },
  { from: '工具/index', to: '/Tools/' },
  { from: 'dev/backend/php/PHP设计模式', to: '/dev/backend/php/' },
  { from: 'dev/backend/php/PHP性能优化', to: '/dev/backend/php/' },
  { from: 'dev/backend/golang/Go微服务架构设计', to: '/dev/backend/golang/' },
]

function createRedirect(fromPath, toPath) {
  // 支持两种形式：
  // 1. fromPath 是目录名（如 'wails-tutorial-series'）→ 生成 dist/wails-tutorial-series/index.html
  // 2. fromPath 是文件名（如 'wails-tutorial-series/index'）→ 生成 dist/wails-tutorial-series/index.html
  const redirectFile = join(distPath, fromPath + '.html')
  const redirectDir = dirname(redirectFile)

  // 如果 fromPath 是纯目录（无 / 分隔），则用 index.html
  const finalFile = fromPath.includes('/')
    ? redirectFile
    : join(distPath, fromPath, 'index.html')
  const finalDir = dirname(finalFile)

  // 创建目录
  if (!existsSync(finalDir)) {
    mkdirSync(finalDir, { recursive: true })
  }

  // 生成重定向 HTML（使用绝对路径，避免相对路径计算错误）
  //
  // ⚠️ 2026-09-10 关键修复：不能加 <meta name="robots" content="noindex">
  // 原因：Google 官方规则中 noindex 优先级高于 meta refresh 重定向——
  //   1) GSC 会报「被 noindex 标记排除」，产生大量无效警告
  //   2) noindex 会阻止 Google 跟随 meta refresh，重定向信号与 canonical 全部失效
  //   3) 旧 URL 永远无法通过重定向传递权重
  // 正确做法：只保留 meta refresh + canonical，Google 会跟随并把它当作重定向处理。
  const redirectHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=${toPath}">
  <link rel="canonical" href="${toPath}">
  <title>重定向到 ${toPath}</title>
</head>
<body>
  <script>window.location.replace("${toPath}");</script>
  <p>正在重定向到 <a href="${toPath}">${toPath}</a>...</p>
</body>
</html>`

  writeFileSync(finalFile, redirectHTML, 'utf-8')
  console.log(`✅ Created redirect: /${fromPath} -> ${toPath}`)
}

console.log('🔄 Creating clean URL redirects...')

let success = 0
let failed = 0
for (const { from, to } of redirectPages) {
  try {
    createRedirect(from, to)
    success++
  } catch (error) {
    console.error(`❌ Failed to create redirect for ${from}:`, error.message)
    failed++
  }
}

console.log(`\n📊 Summary: ${success} created, ${failed} failed (total ${redirectPages.length} rules)`)
console.log('✅ Clean URL redirects created successfully!')
