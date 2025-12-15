import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const distPath = join(__dirname, '../docs/.vitepress/dist')

// 需要创建重定向的页面列表
const redirectPages = [
  'tools/online-tools'
]

function createRedirect(fromPath, toPath) {
  const redirectDir = join(distPath, fromPath)
  const redirectFile = join(redirectDir, 'index.html')
  
  // 创建目录
  if (!existsSync(redirectDir)) {
    mkdirSync(redirectDir, { recursive: true })
  }
  
  // 创建重定向 HTML 文件
  const relativePath = fromPath.split('/').length > 1 
    ? '../' + toPath.split('/').pop() + '.html'
    : './' + toPath.split('/').pop() + '.html'
  
  const redirectHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=${relativePath}">
  <link rel="canonical" href="/${toPath}.html">
  <title>Redirecting...</title>
</head>
<body>
  <script>window.location.replace("${relativePath}");</script>
  <p>正在重定向到 <a href="${relativePath}">目标页面</a>...</p>
</body>
</html>`
  
  writeFileSync(redirectFile, redirectHTML, 'utf-8')
  console.log(`✅ Created redirect: ${fromPath} -> ${toPath}.html`)
}

console.log('🔄 Creating clean URL redirects...')

for (const page of redirectPages) {
  try {
    createRedirect(page, page)
  } catch (error) {
    console.error(`❌ Failed to create redirect for ${page}:`, error.message)
  }
}

console.log('✅ Clean URL redirects created successfully!')
