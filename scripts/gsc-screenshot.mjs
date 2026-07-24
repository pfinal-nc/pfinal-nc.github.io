import { chromium } from '/Users/pfinal/.workbuddy/binaries/node/workspace/node_modules/playwright/index.mjs';

const CDP_URL = 'http://127.0.0.1:9223';
const GSC_URL = 'https://search.google.com/search-console?resource_id=sc-domain%3Afriday-go.icu';
const DIR = '/Users/pfinal/Documents/pfinal-vue-blog/.workbuddy';

async function extractCardValues(page, labels) {
  // Get the full text content to parse
  const text = await page.innerText('body');
  const result = {};
  for (const [key, patterns] of Object.entries(labels)) {
    for (const p of patterns) {
      const regex = new RegExp(p.source + '\\s*\\n?\\s*([0-9,]+(?:\\.[0-9]+)?)\\s*\\n?', 'i');
      const m = text.match(regex);
      if (m) {
        result[key] = m[1].replace(/,/g, '');
        break;
      }
    }
  }
  return result;
}

async function extractAllNumbers(text, filter = '') {
  // Extract all number-like values with nearby context
  const patterns = [
    /总点击次数[^\d]*([\d,]+)/gi,
    /点击次数[^\d]*([\d,]+)/gi,
    /总展示次数[^\d]*([\d,]+)/gi,
    /展示次数[^\d]*([\d,]+)/gi,
    /平均\s*CTR[^\d]*([\d.]+)%/gi,
    /CTR[^\d]*([\d.]+)%/gi,
    /平均排名[^\d]*([\d.]+)/gi,
    /排名[^\d]*([\d.]+)/gi,
    /([\d,]+)[^\n]*点击/gi,
    /([\d,]+)[^\n]*展示/gi,
  ];
  const results = [];
  for (const p of patterns) {
    let m;
    p.lastIndex = 0;
    while ((m = p.exec(text)) !== null) {
      results.push({ match: m[0], value: m[1] });
    }
  }
  return results;
}

async function main() {
  console.log('[1] Connecting to Chrome via CDP on port 9223...');
  const browser = await chromium.connectOverCDP(CDP_URL);
  console.log('[2] Connected successfully!');
  
  const contexts = browser.contexts();
  const context = contexts[0];
  const pages = context.pages();
  
  // Find or create GSC page
  let page = pages.find(p => p.url().includes('search.google.com/search-console'));
  if (!page) {
    page = await context.newPage();
    console.log('[3] Created new page for GSC');
  } else {
    console.log(`[3] Reusing existing GSC page: ${await page.title()}`);
  }

  console.log('[4] Navigating to GSC overview...');
  await page.goto(GSC_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(8000); // Wait for charts to load

  const currentUrl = page.url();
  console.log(`[5] Current URL: ${currentUrl}`);
  console.log(`[6] Page title: ${await page.title()}`);

  // Take overview screenshot
  await page.screenshot({ path: `${DIR}/gsc-overview-2026-07-24.png`, fullPage: true });
  console.log('[7] Overview screenshot saved.');

  // Get full page text
  const overviewText = await page.innerText('body');
  
  // Try to find the performance summary card
  // GSC uses a specific structure with material design components
  const allNumbers = await extractAllNumbers(overviewText);
  console.log('\n[8] Extracted number patterns from overview:');
  allNumbers.forEach(n => console.log(`  "${n.match}" => ${n.value}`));

  // Write overview text to file for analysis
  const fs = await import('fs');
  fs.writeFileSync(`${DIR}/gsc-overview-text-2026-07-24.txt`, overviewText, 'utf-8');
  console.log('[9] Overview text saved to file');

  // Now go to Performance report
  console.log('\n[10] Navigating to Performance report...');
  const perfUrl = 'https://search.google.com/search-console/performance/search-analytics?resource_id=sc-domain%3Afriday-go.icu';
  await page.goto(perfUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(8000);
  
  console.log(`[11] Performance URL: ${page.url()}`);
  await page.screenshot({ path: `${DIR}/gsc-performance-2026-07-24.png`, fullPage: true });
  console.log('[12] Performance screenshot saved.');
  
  const perfText = await page.innerText('body');
  fs.writeFileSync(`${DIR}/gsc-performance-text-2026-07-24.txt`, perfText, 'utf-8');
  console.log('[13] Performance text saved to file');

  // Extract performance metrics more carefully
  const perfNumbers = await extractAllNumbers(perfText);
  console.log('\n[14] Performance number patterns:');
  perfNumbers.forEach(n => console.log(`  "${n.match}" => ${n.value}`));

  // Go to Pages/Index coverage
  console.log('\n[15] Navigating to Pages (index coverage)...');
  const indexUrl = 'https://search.google.com/search-console/index?resource_id=sc-domain%3Afriday-go.icu';
  await page.goto(indexUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(8000);
  
  console.log(`[16] Index URL: ${page.url()}`);
  await page.screenshot({ path: `${DIR}/gsc-index-2026-07-24.png`, fullPage: true });
  console.log('[17] Index screenshot saved.');
  
  const indexText = await page.innerText('body');
  fs.writeFileSync(`${DIR}/gsc-index-text-2026-07-24.txt`, indexText, 'utf-8');
  console.log('[18] Index text saved to file');

  const indexNumbers = await extractAllNumbers(indexText);
  console.log('\n[19] Index number patterns:');
  indexNumbers.forEach(n => console.log(`  "${n.match}" => ${n.value}`));

  browser.close();
  console.log('\n[20] Done! All data extracted.');
}

main().catch(err => {
  console.error('FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
