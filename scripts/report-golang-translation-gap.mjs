import fs from 'node:fs/promises';
import path from 'node:path';

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (e) => {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === '.DS_Store') return [];
      const full = path.join(dir, e.name);
      if (e.isDirectory()) return walk(full);
      return [full];
    })
  );
  return files.flat();
}

function extractFrontMatter(content) {
  const lines = content.split(/\r?\n/);
  if (lines.length === 0 || lines[0].trim() !== '---') return null;
  let endLine = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { endLine = i; break; }
  }
  if (endLine === -1) return null;
  const fm = lines.slice(1, endLine).join('\n');
  return { fm };
}

function parseTitle(fm) {
  if (!fm) return null;
  const m = fm.fm.match(/^title\s*:\s*(.+)\s*$/mi);
  return m ? m[1].trim() : null;
}

function normalizeTitle(raw, fallback) {
  let value = raw ?? fallback ?? '';
  // strip quotes if present
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value.trim().toLowerCase();
}

function filenameTitle(p) {
  return path.basename(p, path.extname(p));
}

async function loadTitleMap(dir) {
  const files = (await walk(dir)).filter((f) => f.endsWith('.md'));
  const map = new Map(); // key -> { title, path }
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const fm = extractFrontMatter(content);
    const rawTitle = parseTitle(fm);
    const fallback = filenameTitle(file);
    const key = normalizeTitle(rawTitle, fallback);
    map.set(key, { title: rawTitle ?? fallback, path: file });
  }
  return map;
}

async function main() {
  const root = process.cwd();
  const argv = process.argv.slice(2);
  const outputArg = argv.find((a) => a.startsWith('--output='));
  const outputMode = outputArg ? outputArg.split('=')[1] : 'zh'; // 'zh' | 'en'
  const directionArg = argv.find((a) => a.startsWith('--direction='));
  const direction = directionArg ? directionArg.split('=')[1] : 'en2zh'; // 'en2zh' | 'zh2en'
  const enDir = path.resolve(root, 'docs/golang');
  const zhDir = path.resolve(root, 'docs/zh/golang');

  const [enMap, zhMap] = await Promise.all([loadTitleMap(enDir), loadTitleMap(zhDir)]);

  const missing = [];
  if (direction === 'en2zh') {
    for (const [key, info] of enMap) {
      if (!zhMap.has(key)) missing.push(info);
    }
    console.log(`英文文章总数: ${enMap.size}`);
    console.log(`中文文章总数: ${zhMap.size}`);
    console.log(`未翻译到中文的数量: ${missing.length}`);
    if (missing.length) {
      console.log('\n未翻译清单:');
      for (const m of missing) {
        if (outputMode === 'zh') {
          const zhTarget = path.resolve(root, 'docs/zh/golang', path.basename(m.path));
          console.log(`- ${zhTarget}`);
        } else {
          console.log(`- ${m.path}`);
        }
      }
    }
  } else {
    for (const [key, info] of zhMap) {
      if (!enMap.has(key)) missing.push(info);
    }
    console.log(`中文文章总数: ${zhMap.size}`);
    console.log(`英文文章总数: ${enMap.size}`);
    console.log(`未翻译到英文的数量: ${missing.length}`);
    if (missing.length) {
      console.log('\n未翻译清单:');
      for (const m of missing) {
        if (outputMode === 'en') {
          const enTarget = path.resolve(root, 'docs/golang', path.basename(m.path));
          console.log(`- ${enTarget}`);
        } else {
          console.log(`- ${m.path}`);
        }
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


