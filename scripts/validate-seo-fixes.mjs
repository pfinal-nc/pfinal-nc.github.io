#!/usr/bin/env node
/**
 * SEO 修复验证脚本
 * 用于验证 Sitemap 和 HTML 文件是否符合 SEO 最佳实践
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const distDir = path.resolve(__dirname, '../docs/.vitepress/dist')
const sitemapPath = path.join(distDir, 'sitemap.xml')

console.log('🔍 开始 SEO 修复验证...\n')

let errors = []
let warnings = []
let passed = []

// ===== 1. 检查 Sitemap =====
console.log('📄 检查 Sitemap...')

if (!fs.existsSync(sitemapPath)) {
  errors.push('❌ Sitemap 文件不存在！请先运行 pnpm build')
  console.log('❌ Sitemap 文件不存在\n')
} else {
  const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8')
  
  // 检查 index.html
  if (sitemapContent.includes('/index.html')) {
    errors.push('❌ Sitemap 中仍包含 /index.html')
    console.log('❌ Sitemap 中仍包含 /index.html')
  } else {
    passed.push('✅ Sitemap 已排除 /index.html')
    console.log('✅ Sitemap 已排除 /index.html')
  }
  
  // 检查子域名
  const subdomains = ['nav.friday-go.icu', 'game.friday-go.icu', 'miao.friday-go.icu', 'pnav.friday-go.icu']
  let hasSubdomain = false
  subdomains.forEach(subdomain => {
    if (sitemapContent.includes(subdomain)) {
      errors.push(`❌ Sitemap 中包含子域名: ${subdomain}`)
      console.log(`❌ Sitemap 中包含子域名: ${subdomain}`)
      hasSubdomain = true
    }
  })
  if (!hasSubdomain) {
    passed.push('✅ Sitemap 已排除所有子域名')
    console.log('✅ Sitemap 已排除所有子域名')
  }
  
  // 检查 HTTP URL
  if (sitemapContent.includes('<loc>http://')) {
    errors.push('❌ Sitemap 中包含 HTTP URL')
    console.log('❌ Sitemap 中包含 HTTP URL')
  } else {
    passed.push('✅ Sitemap 只包含 HTTPS URL')
    console.log('✅ Sitemap 只包含 HTTPS URL')
  }
  
  // 统计 URL 数量
  const urlCount = (sitemapContent.match(/<loc>/g) || []).length
  console.log(`📊 Sitemap 包含 ${urlCount} 个 URL`)
  passed.push(`✅ Sitemap 包含 ${urlCount} 个 URL`)
}

console.log('')

// ===== 2. 检查 HTML 文件 =====
console.log('📄 检查 HTML 文件...')

// 检查首页
const indexHtmlPath = path.join(distDir, 'index.html')
if (fs.existsSync(indexHtmlPath)) {
  const indexContent = fs.readFileSync(indexHtmlPath, 'utf-8')
  
  // 检查 canonical 标签
  if (indexContent.includes('<link rel="canonical"')) {
    const canonicalMatch = indexContent.match(/<link rel="canonical" href="([^"]+)"/)
    if (canonicalMatch) {
      const canonicalUrl = canonicalMatch[1]
      if (canonicalUrl === 'https://friday-go.icu' || canonicalUrl === 'https://friday-go.icu/') {
        passed.push(`✅ 首页 canonical 标签正确: ${canonicalUrl}`)
        console.log(`✅ 首页 canonical 标签正确: ${canonicalUrl}`)
      } else {
        errors.push(`❌ 首页 canonical 标签错误: ${canonicalUrl}`)
        console.log(`❌ 首页 canonical 标签错误: ${canonicalUrl}`)
      }
    }
  } else {
    errors.push('❌ 首页缺少 canonical 标签')
    console.log('❌ 首页缺少 canonical 标签')
  }
  
  // 检查 hreflang 标签
  if (indexContent.includes('rel="alternate" hreflang=')) {
    passed.push('✅ 首页包含 hreflang 标签')
    console.log('✅ 首页包含 hreflang 标签')
  } else {
    warnings.push('⚠️ 首页缺少 hreflang 标签')
    console.log('⚠️ 首页缺少 hreflang 标签')
  }
} else {
  errors.push('❌ index.html 不存在')
  console.log('❌ index.html 不存在')
}

console.log('')

// 检查一个示例文章页
const sampleArticlePath = path.join(distDir, 'zh/index.html')
if (fs.existsSync(sampleArticlePath)) {
  const articleContent = fs.readFileSync(sampleArticlePath, 'utf-8')
  
  if (articleContent.includes('<link rel="canonical"')) {
    passed.push('✅ 中文首页包含 canonical 标签')
    console.log('✅ 中文首页包含 canonical 标签')
  } else {
    errors.push('❌ 中文首页缺少 canonical 标签')
    console.log('❌ 中文首页缺少 canonical 标签')
  }
}

console.log('')

// ===== 3. 生成报告 =====
console.log('=' .repeat(60))
console.log('📊 验证报告')
console.log('=' .repeat(60))

console.log(`\n✅ 通过: ${passed.length} 项`)
passed.forEach(item => console.log(`   ${item}`))

if (warnings.length > 0) {
  console.log(`\n⚠️  警告: ${warnings.length} 项`)
  warnings.forEach(item => console.log(`   ${item}`))
}

if (errors.length > 0) {
  console.log(`\n❌ 错误: ${errors.length} 项`)
  errors.forEach(item => console.log(`   ${item}`))
  console.log('\n💡 请修复以上错误后重新构建')
  process.exit(1)
} else {
  console.log('\n🎉 所有检查通过！SEO 配置正确。')
  console.log('\n下一步：')
  console.log('1. 部署到生产环境')
  console.log('2. 在 Google Search Console 重新提交 Sitemap')
  console.log('3. 等待 1-2 周查看索引变化')
  process.exit(0)
}

