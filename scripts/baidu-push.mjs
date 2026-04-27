#!/usr/bin/env node
/**
 * 百度主动推送脚本
 * 
 * 使用百度站长平台的 API 主动推送新 URL，加速百度收录。
 * 需要在百度站长平台 (https://ziyuan.baidu.com) 获取站点 Token。
 * 
 * 用法：
 *   # 设置环境变量后使用
 *   export BAIDU_SITE_TOKEN="your_token_here"
 *   node scripts/baidu-push.mjs
 *   
 *   # 或直接从 sitemap 推送（每日限额：普通站 10条/天，VIP 10万条/天）
 *   node scripts/baidu-push.mjs --from-sitemap
 * 
 * 百度 API 文档: https://ziyuan.baidu.com/college/courseinfo?id=267&page=2
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ========== 配置 ==========
const HOSTNAME = 'https://friday-go.icu';

/**
 * 从 sitemap.xml 提取 URL 列表
 */
function extractUrlsFromSitemap() {
  const sitemapPath = join(ROOT, 'docs/public/sitemap.xml');
  
  if (!existsSync(sitemapPath)) {
    console.error(`❌ Sitemap not found: ${sitemapPath}`);
    process.exit(1);
  }

  const xml = readFileSync(sitemapPath, 'utf-8');
  const urlRegex = /<loc>(.*?)<\/loc>/g;
  const urls = [];
  let match;

  while ((match = urlRegex.exec(xml)) !== null) {
    urls.push(match[1].trim());
  }

  return urls.filter(u => u.startsWith(HOSTNAME) && !u.includes('?'));
}

/**
 * 推送 URL 到百度
 * @param {string[]} urls - 要推送的 URL 列表
 * @param {string} token - 百度站长平台的推送 Token
 */
async function pushToBaidu(urls, token) {
  // 百度每次最多推 2000 条，但普通站每天只限 10 条
  // 新接口支持批量推送，每批最多 2000 条
  const BATCH_SIZE = 2000;
  const batches = [];

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    batches.push(urls.slice(i, i + BATCH_SIZE));
  }

  console.log(`📤 Pushing ${urls.length} URLs to Baidu in ${batches.length} batch(es)...`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const body = batch.join('\n');

    try {
      const response = await fetch(
        `http://data.zz.baidu.com/urls?site=${HOSTNAME.replace('https://', '')}&token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: body,
        }
      );

      const result = await response.json();

      if (result.success > 0 || result.success_remain >= 0) {
        console.log(`  ✅ Batch ${i + 1}/${batches.length}: ${result.success} pushed, ${result.success_remain} remaining today`);
        if (result.not_same_site?.length) {
          console.log(`     ⚠️ Not same site: ${result.not_same_site.length} URLs`);
        }
        if (result.not_valid?.length) {
          console.log(`     ⚠️ Invalid URLs: ${result.not_valid.length}`);
        }
      } else {
        console.log(`  ⚠️ Batch ${i + 1}/${batches.length}:`, JSON.stringify(result));
      }

      // 避免请求过快
      if (i < batches.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err) {
      console.error(`  ❌ Batch ${i + 1}/${batches.length} failed:`, err.message);
    }
  }
}

// ========== CLI 入口 ==========
async function main() {
  const args = process.argv.slice(2);

  // 获取 Token（环境变量优先）
  let token = process.env.BAIDU_SITE_TOKEN;

  // 检查是否提供了 token 参数
  const tokenIdx = args.indexOf('--token');
  if (tokenIdx !== -1 && args[tokenIdx + 1]) {
    token = args[tokenIdx + 1];
  }

  if (!token) {
    console.error('⚠️ BAIDU_SITE_TOKEN not set.');
    console.error('');
    console.error('To use Baidu push, you need a site token from:');
    console.error('  https://ziyuan.baidu.com/site/index#/');
    console.error('');
    console.error('Set it via:');
    console.error('  export BAIDU_SITE_TOKEN="your_token_here"');
    console.error('  # or:');
    console.error('  node scripts/baidu-push.mjs --token YOUR_TOKEN');
    
    // 创建 indexnow-key.txt 文件供 IndexNow 验证使用
    const keyFilePath = join(ROOT, 'docs/public/indexnow-key.txt');
    if (!existsSync(keyFilePath)) {
      console.log('\n💡 Tip: You should also set up IndexNow (free, no token needed):');
      console.log('  node scripts/indexnow-push.mjs');
    }
    
    process.exit(1);
  }

  let urls = [];

  if (args.includes('--urls')) {
    const urlsIdx = args.indexOf('--urls');
    urls = args[urlsIdx + 1].split(',').map(u => u.trim()).filter(Boolean);
  } else {
    urls = extractUrlsFromSitemap();
  }

  await pushToBaidu(urls, token);

  console.log('\n🎉 Baidu push complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
