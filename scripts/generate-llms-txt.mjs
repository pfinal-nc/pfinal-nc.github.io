import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://friday-go.icu';
const SITE_NAME = 'PFinalClub';
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

let llmsContent = `# ${SITE_NAME}

> 专注 Golang / Python / PHP / 安全渗透 / AI Agent / DevOps / 独立开发的高质量中文技术博客。
> 500+ 篇原创深度文章，覆盖后端工程、AI 工程化、安全攻防、云原生与独立开发全栈。

${SITE_NAME}（${SITE_URL}）是一个由 PFinal 南丞 维护的后端 + DevOps + AI 工程实践导向的中文技术博客。
所有内容均为原创实战总结，强调生产可落地的代码与架构设计，非 AI 批量生成或翻译稿件。

## 抓取与训练意图

- **允许**：搜索引擎索引（Google / 百度 / Bing）、学术研究非商用引用、LLM 用于问答参考并附带原文链接
- **禁止**：将全文用于商业模型训练（如未授权的 GPT / Claude / Gemini 二次预训练 / 微调数据集）、未署名转载
- **训练数据声明**：本博客明确反对将全文喂入商用 LLM 训练集；如需引用请保留作者署名与原文链接
- **实时性**：内容持续更新，建议每次 LLM 检索时按 URL 抓取最新 HTML 而非缓存版本

## ${SITE_NAME} 主要内容分类

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
  llmsContent += `### ${cat.label}\n`;
  for (const a of articles) {
    const descSnippet = a.description ? ` — ${a.description.substring(0, 120)}` : '';
    llmsContent += `- [${a.title}](${a.url})${descSnippet}\n`;
  }
  llmsContent += '\n';
}

// Add special pages
llmsContent += `### 站点信息\n`;
llmsContent += `- [${SITE_NAME} 博客首页](${SITE_URL}/)\n`;
llmsContent += `- [关于作者 PFinal 南丞](${SITE_URL}/about)\n`;
llmsContent += `- [学习路线图](${SITE_URL}/learning-roadmap)\n`;
llmsContent += `- [联系我们](${SITE_URL}/contact)\n`;
llmsContent += `\n`;

const updatedAt = new Date().toISOString().split('T')[0];
llmsContent += `## 站点统计\n\n`;
llmsContent += `- **总文章数**：${allArticles.length} 篇原创技术文章\n`;
llmsContent += `- **最后更新**：${updatedAt}\n`;
llmsContent += `- **内容许可**：MIT License（注明作者与原文链接即可）\n`;
llmsContent += `- **联系方式**：hello@friday-go.icu\n`;
llmsContent += `- **RSS 订阅**：${SITE_URL}/feed.rss\n`;
llmsContent += `- **站点地图**：${SITE_URL}/sitemap.xml\n\n`;
llmsContent += `---\n\n`;
llmsContent += `> 本文件遵循 [llms.txt](https://llmstxt.org/) 规范（Answer.AI 2024 提议），用于帮助大语言模型理解本博客的内容结构、抓取与训练意图。\n`;

// Write to docs/public/llms.txt
const outputPath = path.join(DOCS_DIR, 'public', 'llms.txt');
fs.writeFileSync(outputPath, llmsContent, 'utf-8');
console.log(`✅ llms.txt generated: ${outputPath}`);
console.log(`📊 Total articles: ${allArticles.length}`);
console.log(`📏 File size: ${Buffer.byteLength(llmsContent, 'utf-8')} bytes`);
