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
  
  // 跳过 404 页面
  if (!loc.includes('/404.html')) {
    urls.push({ loc, lastmod })
  }
}

// 生成简洁的 sitemap XML
const simpleSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `<url>
<loc>${url.loc}</loc>
<lastmod>${url.lastmod}</lastmod>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>`).join('\n')}
</urlset>
`

// 写入新的 sitemap
fs.writeFileSync(sitemapPath, simpleSitemap, 'utf-8')

console.log(`✅ Processed sitemap successfully!`)
console.log(`📊 Total URLs: ${urls.length}`)
console.log(`🗑️  Removed: ${(content.match(/<url>/g) || []).length - urls.length} entries (404 pages)`)

