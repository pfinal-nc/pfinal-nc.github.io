#!/usr/bin/env node
/**
 * IndexNow 推送脚本
 * 
 * 通过 IndexNow 协议自动通知 Bing、Yandex、Seznam 等搜索引擎
 * 网站有新内容更新或 URL 变更，加速收录。
 * 
 * 用法：
 *   node scripts/indexnow-push.mjs              # 推送 sitemap 中的所有 URL
 *   node scripts/indexnow-push.mjs --urls url1,url2,url3  # 指定推送特定 URL
 *   node scripts indexnow-push.mjs --key <key>    # 自定义 API Key（默认使用配置中的）
 * 
 * IndexNow 文档: https://www.indexnow.org/protocol
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ========== 配置 ==========
const HOSTNAME = 'https://friday-go.icu';
// IndexNow API Key（可在 /indexnow-key.txt 或robots.txt中声明）
const API_KEY = process.env.INDEXNOW_KEY || 'pfinalclub-2026-indexnow';

/**
 * 从 sitemap.xml 中提取所有 URL 列表
 */
function extractUrlsFromSitemap(sitemapPath) {
  if (!existsSync(sitemapPath)) {
    console.error(`❌ Sitemap not found: ${sitemapPath}`);
    process.exit(1);
  }

  const xml = readFileSync(sitemapPath, 'utf-8');
  const urlRegex = /<loc>(.*?)<\/loc>/g;
  const urls = [];
  let match;

  while ((match = urlRegex.exec(xml)) !== null) {
    const url = match[1].trim();
    // 过滤掉非目标域名和非标准页面
    if (url.startsWith(HOSTNAME) && !url.includes('?')) {
      urls.push(url);
    }
  }

  return urls;
}

/**
 * 调用 IndexNow API 推送 URL 列表
 * IndexNow 支持一次最多 10,000 个 URL
 */
async function pushToIndexNow(urls) {
  if (urls.length === 0) {
    console.log('⚠️ No URLs to push');
    return;
  }

  // IndexNow 要求每次最多推送 10000 个 URL
  const BATCH_SIZE = 10000;
  const batches = [];

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    batches.push(urls.slice(i, i + BATCH_SIZE));
  }

  console.log(`📤 Pushing ${urls.length} URLs to IndexNow in ${batches.length} batch(es)...`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    try {
      // 同时推送到 Bing 和 Yandex（它们都支持 IndexNow 协议）
      const endpoints = [
        'https://api.indexnow.org/indexnow',     // 通用分发端点（会同时通知 Bing/Yandex/Seznam）
        'https://www.bing.com/IndexNow',          // Bing 直接端点
      ];

      for (const endpoint of endpoints) {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: HOSTNAME,
            key: API_KEY,
            keyLocation: `${HOSTNAME}/indexnow-key.txt`,
            urlList: batch,
          }),
        });

        if (response.ok) {
          console.log(`  ✅ Batch ${i + 1}/${batches.length} → ${endpoint.split('/')[2]}: ${batch.length} URLs accepted`);
        } else {
          const text = await response.text();
          console.log(`  ⚠️ Batch ${i + 1}/${batches.length} → ${endpoint.split('/')[2]}: ${response.status} ${text}`);
        }
      }
    } catch (err) {
      console.error(`  ❌ Batch ${i + 1}/${batches.length} failed:`, err.message);
    }
  }
}

// ========== CLI 入口 ==========
async function main() {
  const args = process.argv.slice(2);

  let urls = [];

  if (args.includes('--urls')) {
    const urlsIdx = args.indexOf('--urls');
    const urlsArg = args[urlsIdx + 1];
    if (!urlsArg) {
      console.error('❌ --urls requires a comma-separated list of URLs');
      process.exit(1);
    }
    urls = urlsArg.split(',').map(u => u.trim()).filter(Boolean);
  } else {
    // 默认从 sitemap.xml 提取
    const sitemapPath = join(ROOT, 'docs/public/sitemap.xml');
    urls = extractUrlsFromSitemap(sitemapPath);
  }

  await pushToIndexNow(urls);

  console.log('\n🎉 IndexNow push complete!');
  console.log(`   Total URLs pushed: ${urls.length}`);
  console.log(`   Search engines notified: Bing, Yandex (via IndexNow)`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
