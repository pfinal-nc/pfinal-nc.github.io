import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://friday-go.icu';
const DOCS_DIR = path.join(process.cwd(), 'docs');

function extractFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = match[1];
  const titleMatch = fm.match(/title:\s*["']?(.*?)["']?\n/);
  const descMatch = fm.match(/description:\s*["']?(.*?)["']?\n/);
  const dateMatch = fm.match(/date:\s*["']?(.*?)["']?\n/);
  const tagsMatch = fm.match(/tags:\s*\n([\s\S]*?)(?:\n(?:keywords|category|description|date|author|faq|howTo|updated)|\n---)/);

  const title = titleMatch ? titleMatch[1].trim() : '';
  const description = descMatch ? descMatch[1].trim() : '';
  const date = dateMatch ? dateMatch[1].trim() : '';

  let tags = [];
  if (tagsMatch) {
    const tagLines = tagsMatch[1].trim().split('\n');
    tags = tagLines
      .map(l => l.replace(/^\s*-\s*/, '').trim().replace(/["']/g, ''))
      .filter(t => t && t !== '>-');
  }

  // Skip pages without meaningful content
  if (!title || title === '') return null;
  if (description === '>-') return null; // placeholder description

  return { title, description, date, tags };
}

function walkDir(dir, results = []) {
  const fullDir = path.join(DOCS_DIR, dir);
  if (!fs.existsSync(fullDir)) return results;

  const items = fs.readdirSync(fullDir);
  for (const item of items) {
    const fp = path.join(fullDir, item);
    if (fs.statSync(fp).isDirectory()) {
      walkDir(dir + item + '/', results);
    } else if (item.endsWith('.md') && item !== 'index.md') {
      const fm = extractFrontmatter(fp);
      if (!fm) continue;
      const urlPath = '/' + dir + item.replace('.md', '');
      results.push({
        url: SITE_URL + urlPath,
        title: fm.title,
        description: fm.description,
        date: fm.date,
        tags: fm.tags,
        category: dir.replace(/\/$/, '')
      });
    }
  }
  return results;
}

// Collect articles from key directories
const categories = [
  { dir: 'dev/backend/golang/', label: 'Golang 系列（110+篇）' },
  { dir: 'ai/', label: 'AI Agent 系列' },
  { dir: 'security/offensive/', label: '安全渗透系列' },
  { dir: 'security/engineering/', label: '安全工程系列' },
  { dir: 'devops/', label: 'DevOps / 云原生系列' },
  { dir: 'dev/backend/python/', label: 'Python 系列' },
  { dir: 'dev/backend/php/', label: 'PHP 系列' },
  { dir: 'dev/backend/rust/', label: 'Rust 系列' },
  { dir: 'tools/', label: '开发工具系列' },
  { dir: 'Tools/', label: '开发工具系列' },
  { dir: 'dev/system/', label: '系统运维系列' },
  { dir: 'thinking/method/', label: '技术思考系列' },
  { dir: 'indie/', label: '独立开发系列' },
  { dir: 'data/', label: '数据与自动化系列' },
  { dir: 'courses/', label: '技术课程系列' },
];

let llmsContent = `# ${SITE_URL}/llms.txt

# PFinalClub 技术深度博客
# 专注 Golang、Python、PHP、安全渗透、AI Agent、DevOps、独立开发
# 作者: PFinal南丞 | URL: ${SITE_URL}

`;

const allArticles = [];
for (const cat of categories) {
  const articles = walkDir(cat.dir);
  if (articles.length === 0) continue;

  // Sort by date descending (newest first)
  articles.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });

  allArticles.push(...articles);
  llmsContent += `## ${cat.label}\n`;
  for (const a of articles) {
    const descSnippet = a.description ? ` — ${a.description.substring(0, 120)}` : '';
    llmsContent += `- ${a.url}: ${a.title}${descSnippet}\n`;
  }
  llmsContent += '\n';
}

// Add special pages
llmsContent += `## 站点信息\n`;
llmsContent += `- ${SITE_URL}/: 博客首页\n`;
llmsContent += `- ${SITE_URL}/about: 关于作者\n`;
llmsContent += `- ${SITE_URL}/learning-roadmap: 学习路线图\n`;
llmsContent += `\n`;
llmsContent += `# 总计 ${allArticles.length} 篇技术文章\n`;

// Write to docs/public/llms.txt
const outputPath = path.join(DOCS_DIR, 'public', 'llms.txt');
fs.writeFileSync(outputPath, llmsContent, 'utf-8');
console.log(`✅ llms.txt generated: ${outputPath}`);
console.log(`📊 Total articles: ${allArticles.length}`);
console.log(`📏 File size: ${Buffer.byteLength(llmsContent, 'utf-8')} bytes`);
