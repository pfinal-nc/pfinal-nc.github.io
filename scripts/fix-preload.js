/*
 * @Author: pfinal liuxuzhu@smm.cn
 * @Date: 2025-07-08 17:16:32
 * @LastEditors: pfinal liuxuzhu@smm.cn
 * @LastEditTime: 2025-07-08 17:16:41
 * @FilePath: /pfinal-vue-blog/scripts/fix-preload.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// scripts/fix-preload.js
const fs = require('fs')
const path = require('path')

const distDir = path.resolve(__dirname, '../docs/.vitepress/dist')
if (!fs.existsSync(distDir)) process.exit(0)
const files = fs.readdirSync(distDir).filter(f => f.endsWith('.html'))

for (const file of files) {
  const filePath = path.join(distDir, file)
  let html = fs.readFileSync(filePath, 'utf-8')
  // 1. 移除纯 preload（不带 stylesheet 的）
  html = html.replace(/<link[^>]+rel=["'](?:module)?preload["'][^>]*>/gi, m => /stylesheet/i.test(m) ? m : '')
  // 2. 替换 preload+stylesheet 为标准 stylesheet
  html = html.replace(/<link([^>]+)rel=["']preload stylesheet["']([^>]*)>/gi, '<link$1rel="stylesheet"$2>')
  fs.writeFileSync(filePath, html, 'utf-8')
}