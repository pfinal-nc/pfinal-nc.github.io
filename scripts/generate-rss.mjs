import { Feed } from 'feed'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import fg from 'fast-glob'
import matter from 'gray-matter'
import { readFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const baseUrl = 'https://friday-go.icu'

const feedOptions = {
  title: 'PFinalClub Tech Blog',
  description: 'PFinalClub - 专注于 Golang, PHP, Python 的技术博客，分享微服务、云原生、架构设计等实战经验',
  id: baseUrl,
  link: baseUrl,
  language: 'zh-CN',
  image: `${baseUrl}/logo.png`,
  favicon: `${baseUrl}/favicon.ico`,
  copyright: 'Copyright (c) 2024-present, PFinalClub',
  feedLinks: {
    rss: `${baseUrl}/feed.xml`,
    atom: `${baseUrl}/feed.atom`,
    json: `${baseUrl}/feed.json`,
  },
  author: {
    name: 'PFinal南丞',
    email: 'pfinal@friday-go.icu',
    link: baseUrl
  }
}

async function generateRSS() {
  console.log('🔄 Generating RSS feeds...')
  
  const feed = new Feed(feedOptions)
  const distPath = resolve(__dirname, '../docs/.vitepress/dist')

  // 查找所有markdown文件
  const files = await fg('docs/**/*.md', {
    ignore: ['**/node_modules/**', '**/dist/**'],
    absolute: true
  })

  const posts = []
  
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8')
      const { data, excerpt, content: mdContent } = matter(content, { excerpt: true })
      
      // 生成URL路径
      let url = file
        .replace(/\\/g, '/')
        .replace(resolve(__dirname, '../docs').replace(/\\/g, '/'), '')
        .replace(/\.md$/, '')
        .replace(/\/index$/, '')
        .replace(/^\//, '')
      
      // 跳过特殊页面
      if (url.includes('404') || url === '' || url === 'index') continue
      if (!data.title) continue // 必须有标题
      if (data.layout === 'home') continue // 跳过首页
      
      posts.push({
        title: data.title,
        url: `/${url}`,
        description: data.description || excerpt || '',
        date: data.date ? new Date(data.date) : new Date(),
        author: data.author || 'PFinal南丞',
        tags: data.tags || [],
        category: data.category || '',
        content: mdContent.slice(0, 500) // 摘要
      })
    } catch (error) {
      console.warn(`⚠️  Failed to parse ${file}:`, error.message)
    }
  }

  // 按日期排序
  posts.sort((a, b) => b.date - a.date)

  // 只取最新的50篇
  const topPosts = posts.slice(0, 50)
  
  console.log(`📊 Found ${posts.length} articles, adding ${topPosts.length} to RSS`)

  for (const post of topPosts) {
    feed.addItem({
      title: post.title,
      id: `${baseUrl}${post.url}`,
      link: `${baseUrl}${post.url}`,
      description: post.description,
      content: post.description,
      author: [{
        name: post.author,
        link: baseUrl
      }],
      date: post.date,
      category: post.tags.map(tag => ({ name: tag }))
    })
  }

  // 确保dist目录存在
  try {
    mkdirSync(distPath, { recursive: true })
  } catch (e) {
    // 目录已存在
  }

  // 生成RSS文件
  try {
    writeFileSync(resolve(distPath, 'feed.xml'), feed.rss2())
    console.log('✅ Generated: feed.xml')
  } catch (e) {
    console.error('❌ Failed to generate feed.xml:', e.message)
  }

  try {
    writeFileSync(resolve(distPath, 'feed.atom'), feed.atom1())
    console.log('✅ Generated: feed.atom')
  } catch (e) {
    console.error('❌ Failed to generate feed.atom:', e.message)
  }

  try {
    writeFileSync(resolve(distPath, 'feed.json'), feed.json1())
    console.log('✅ Generated: feed.json')
  } catch (e) {
    console.error('❌ Failed to generate feed.json:', e.message)
  }

  console.log('\n✅ RSS feeds generated successfully!')
  console.log(`   📝 ${topPosts.length} articles included`)
  console.log(`   🔗 Feed URL: ${baseUrl}/feed.xml`)
}

generateRSS().catch(error => {
  console.error('❌ RSS generation failed:', error)
  process.exit(1)
})

