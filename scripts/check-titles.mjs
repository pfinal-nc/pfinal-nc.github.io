import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Recursively walk a directory and return all file paths.
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      // Skip hidden/system folders that may appear
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.DS_Store') {
        return [];
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walk(fullPath);
      }
      return [fullPath];
    })
  );
  return files.flat();
}

/**
 * Extract YAML front matter block at the top of a Markdown file.
 * Returns null if not found.
 * @param {string} content
 */
function extractFrontMatter(content) {
  const lines = content.split(/\r?\n/);
  if (lines.length === 0 || lines[0].trim() !== '---') return null;
  let endLine = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endLine = i;
      break;
    }
  }
  if (endLine === -1) return null;
  const fmLines = lines.slice(1, endLine);
  return { fm: fmLines.join('\n'), startLine: 0, endLine };
}

/**
 * Parse title line from YAML-like front matter using a simple regex.
 * Returns the raw value (may be quoted or unquoted) or null if absent.
 * @param {string} fm
 */
function parseTitle(fm) {
  // Match beginning-of-line title: <value> (case-insensitive)
  const m = fm.match(/^title\s*:\s*(.+)\s*$/mi);
  if (!m) return null;
  return m[1].trim();
}

function findTitleLineIndex(fm) {
  const lines = fm.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (/^title\s*:/i.test(lines[i])) return i;
  }
  return -1;
}

/**
 * Determine if value is wrapped entirely in single or double quotes.
 * @param {string} value
 */
function isQuoted(value) {
  if (value.length < 2) return false;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === '\'' && last === '\'')) return true;
  return false;
}

/**
 * Main check routine
 */
async function main() {
  const argv = process.argv.slice(2);
  const fixQuote = argv.includes('--fix=quote');
  const targetArg = argv.find((a) => !a.startsWith('--'));
  const docsDir = path.resolve(targetArg || path.join(process.cwd(), 'docs'));
  const allFiles = (await walk(docsDir)).filter((f) => f.endsWith('.md'));

  const issues = [];
  let fixed = 0;

  for (const file of allFiles) {
    const content = await fs.readFile(file, 'utf8');
    const fmBlock = extractFrontMatter(content);
    if (!fmBlock) {
      issues.push({ file, type: 'MissingFrontMatter', message: '缺少 front matter 块' });
      continue;
    }
    // Skip strict title requirement for home layout pages
    const isHomeLayout = /\n?layout\s*:\s*home\b/i.test(`\n${fmBlock.fm}`);
    const rawTitle = parseTitle(fmBlock.fm);
    if (!rawTitle) {
      if (!isHomeLayout) {
        issues.push({ file, type: 'MissingTitle', message: '缺少 title 字段' });
      }
      continue;
    }
    // Remove surrounding quotes only for evaluation purposes
    const quoted = isQuoted(rawTitle);
    const value = quoted ? rawTitle.slice(1, -1) : rawTitle;

    if (value.trim().length === 0) {
      issues.push({ file, type: 'EmptyTitle', message: 'title 为空' });
    }

    // Check for any ASCII colon in unquoted titles which may break YAML
    if (!quoted && /:/.test(value)) {
      issues.push({
        file,
        type: 'UnquotedColon',
        message: '未加引号且包含英文冒号 ":"，可能导致 YAML 解析问题（建议加引号或改为中文冒号：）',
      });

      // Autofix when requested
      if (fixQuote) {
        const lines = content.split(/\r?\n/);
        const fmLines = fmBlock.fm.split(/\r?\n/);
        const titleIdx = findTitleLineIndex(fmBlock.fm);
        if (titleIdx >= 0) {
          const titleLine = fmLines[titleIdx];
          const replaced = titleLine.replace(/^(title\s*:\s*)(.+)$/,
            (m, p1, p2) => {
              const inner = isQuoted(p2.trim()) ? p2.trim().slice(1, -1) : p2.trim();
              return `${p1}"${inner}"`;
            }
          );
          fmLines[titleIdx] = replaced;
          // Reconstruct file content
          const newContent = [
            '---',
            ...fmLines,
            '---',
            ...lines.slice(fmBlock.endLine + 1)
          ].join('\n');
          await fs.writeFile(file, newContent, 'utf8');
          fixed += 1;
        }
      }
    }

    // Warn if mismatched quotes
    if (/^["']/.test(rawTitle) && !isQuoted(rawTitle)) {
      issues.push({ file, type: 'MismatchedQuotes', message: 'title 引号不成对' });
    }
  }

  if (issues.length > 0) {
    console.log(`共发现 ${issues.length} 个问题:\n`);
    for (const it of issues) {
      const rel = path.relative(process.cwd(), it.file);
      console.log(`- [${it.type}] ${rel} -> ${it.message}`);
    }
    if (fixed > 0) {
      console.log(`\n已自动修复 ${fixed} 个未加引号且包含英文冒号的 title。`);
    }
    process.exitCode = 1;
  } else {
    if (fixed > 0) {
      console.log(`所有 Markdown 文件通过检查，且已自动修复 ${fixed} 处。`);
    } else {
      console.log('所有 Markdown 文件的 title 检查通过。');
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});


