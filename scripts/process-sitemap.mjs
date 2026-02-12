import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Sitemap 文件路径
const sitemapPath = path.resolve(__dirname, '../docs/.vitepress/dist/sitemap.xml')

console.log('🔄 Processing sitemap...')

if (!fs.existsSync(sitemapPath)) {
  console.error('❌ Sitemap not found:', sitemapPath)
  process.exit(1)
}

// 读取原始 sitemap
const content = fs.readFileSync(sitemapPath, 'utf-8')

// 提取 URL 信息
const urlRegex = /<url>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<lastmod>(.*?)<\/lastmod>[\s\S]*?<\/url>/g
const urls = []

let match
while ((match = urlRegex.exec(content)) !== null) {
  const loc = match[1]
  const lastmod = match[2]
  
  // 严格过滤：排除所有不应该索引的 URL
  
  // 1. 排除 404 页面
  if (loc.includes('/404') || loc.endsWith('/404')) {
    continue
  }
  
  // 2. 排除 XML 文件（包括 sitemap.xml 本身）
  if (loc.endsWith('.xml') || loc.includes('/sitemap')) {
    continue
  }
  
  // 3. 排除带 .html 后缀的 URL（应使用 clean URLs）
  if (loc.endsWith('.html') || loc.match(/\.html\?/)) {
    continue
  }
  
  // 4. 排除子域名 URL
  if (loc.includes('pnav.friday-go.icu') || 
      loc.includes('nav.friday-go.icu') || 
      loc.includes('game.friday-go.icu') || 
      loc.includes('miao.friday-go.icu')) {
    continue
  }
  
  // 5. 排除带查询参数的 URL
  if (loc.includes('?tag=') || 
      loc.includes('?type=') || 
      loc.includes('?category=') || 
      loc.includes('?')) {
    continue
  }
  
  // 6. 排除 HTTP 协议的 URL（应全部使用 HTTPS）
  if (loc.startsWith('http://')) {
    continue
  }
  
  // 7. 确保 URL 使用 HTTPS
  const cleanLoc = loc.replace(/^http:\/\//, 'https://')
  
  // 8. 计算 priority 和 changefreq（SEO 优化：首页 > 专题索引 > 文章）
  const pathOnly = (cleanLoc.replace('https://friday-go.icu', '') || '/').replace(/\/$/, '') || '/'
  const pathNorm = pathOnly === '/' ? '' : pathOnly.replace(/^\//, '')
  const indexPaths = [
    'dev', 'dev/backend', 'dev/backend/golang', 'dev/backend/php', 'dev/backend/python',
    'dev/system', 'dev/system/database',
    'security/engineering', 'security/offensive',
    'data/automation',
    'thinking/method', 'thinking/notes',
    'Tools/online-tools', 'tools/online-tools'
  ]
  let priority = 0.8
  let changefreq = 'weekly'

  if (pathNorm === '') {
    priority = 1.0
    changefreq = 'daily'
  } else if (indexPaths.includes(pathNorm)) {
    priority = 0.9
    changefreq = 'weekly'
  }
  
  urls.push({ loc: cleanLoc, lastmod, priority, changefreq })
}

// 生成简洁的 sitemap XML
const simpleSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `<url>
<loc>${url.loc}</loc>
<lastmod>${url.lastmod}</lastmod>
<changefreq>${url.changefreq}</changefreq>
<priority>${url.priority}</priority>
</url>`).join('\n')}
</urlset>
`

// 写入新的 sitemap
fs.writeFileSync(sitemapPath, simpleSitemap, 'utf-8')

const originalCount = (content.match(/<url>/g) || []).length
const removedCount = originalCount - urls.length

console.log(`✅ Processed sitemap successfully!`)
console.log(`📊 Total URLs: ${urls.length}`)
console.log(`🗑️  Removed: ${removedCount} entries (404, .html, subdomains, query params, HTTP, XML files)`)

