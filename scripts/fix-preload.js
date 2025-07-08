/*
 * @Author: pfinal liuxuzhu@smm.cn
 * @Date: 2025-07-08 17:16:32
 * @LastEditors: pfinal liuxuzhu@smm.cn
 * @LastEditTime: 2025-07-08 17:21:59
 * @FilePath: /pfinal-vue-blog/scripts/fix-preload.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// scripts/fix-preload.js
const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../docs/.vitepress/dist');

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, callback);
    } else if (stat.isFile() && file.endsWith('.html')) {
      callback(fullPath);
    }
  }
}

if (fs.existsSync(distDir)) {
  walk(distDir, (filePath) => {
    let html = fs.readFileSync(filePath, 'utf-8');
    // 1. 移除纯 preload（不带 stylesheet 的）
    html = html.replace(/<link[^>]+rel=["'](?:module)?preload["'][^>]*>/gi, m => /stylesheet/i.test(m) ? m : '');
    // 2. 替换 preload+stylesheet 为标准 stylesheet
    html = html.replace(/<link([^>]+)rel=["']preload stylesheet["']([^>]*)>/gi, '<link$1rel="stylesheet"$2>');
    fs.writeFileSync(filePath, html, 'utf-8');
  });
}