#!/usr/bin/env node

/**
 * 优化文章标题：将"日记型"标题改为"任务型"标题
 * 同时移除特殊字符（冒号等）
 * 
 * 优化规则：
 * 1. "在 X 中使用 Y" -> "Y 全指南：如何在 X 中获取/实现/使用..."
 * 2. "X 的使用" -> "X 完整使用指南：如何..."
 * 3. "使用 X" -> "X 完整指南：如何使用..."
 * 4. 移除所有冒号（:）和中文冒号（：）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docsDir = path.resolve(__dirname, '../docs');

/**
 * 提取并更新 frontmatter 中的 title
 */
function updateTitle(filePath, newTitle) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/^(---\s*\n)([\s\S]*?)(\n---)/);
    if (!match) {
      console.warn(`⚠️  ${filePath}: 没有找到 frontmatter`);
      return false;
    }
    
    const frontmatter = match[2];
    const titleRegex = /^title:\s*(.+)$/m;
    const titleMatch = frontmatter.match(titleRegex);
    
    if (!titleMatch) {
      console.warn(`⚠️  ${filePath}: 没有找到 title 字段`);
      return false;
    }
    
    // 替换标题
    const newFrontmatter = frontmatter.replace(
      titleRegex,
      `title: "${newTitle}"`
    );
    
    const newContent = content.replace(
      /^(---\s*\n)([\s\S]*?)(\n---)/,
      `$1${newFrontmatter}$3`
    );
    
    fs.writeFileSync(filePath, newContent, 'utf-8');
    return true;
  } catch (error) {
    console.error(`❌ 更新 ${filePath} 失败:`, error.message);
    return false;
  }
}

/**
 * 优化标题：将日记型改为任务型
 */
function optimizeTitle(title, filePath) {
  let optimized = title;
  
  // 1. 移除特殊字符（冒号），替换为破折号
  optimized = optimized.replace(/[:：]/g, ' - ');
  
  // 2. 处理常见的日记型模式
  const patterns = [
    {
      // "在 X 中使用 Y" -> "Y 全指南 - 如何在 X 中使用并获取完整功能"
      pattern: /^在\s+(.+?)\s+中\s+使用\s+(.+)$/,
      replacement: (match, x, y) => {
        // 根据 Y 的类型生成更具体的描述
        if (y.includes('库') || y.includes('包') || y.includes('工具')) {
          return `${y} 完整使用指南 - 如何在 ${x} 中集成并掌握核心功能`;
        }
        return `${y} 全指南 - 如何在 ${x} 中使用并获取完整功能`;
      }
    },
    {
      // "使用 X" -> "X 完整使用指南 - 如何快速上手并掌握核心功能"
      pattern: /^使用\s+(.+)$/,
      replacement: (match, x) => {
        // 如果标题已经包含"完整"、"指南"等关键词，避免重复
        if (x.includes('完整') || x.includes('指南') || x.includes('实战')) {
          return x; // 保持原样，只移除"使用"前缀
        }
        if (x.includes('Go') || x.includes('golang')) {
          return `${x} 完整开发指南 - 如何快速上手并构建生产级应用`;
        }
        return `${x} 完整使用指南 - 如何快速上手并掌握核心功能`;
      }
    },
    {
      // "X 的使用" -> "X 完整使用指南 - 如何快速上手并掌握核心功能"
      pattern: /^(.+?)\s+的\s+使用$/,
      replacement: (match, x) => `${x} 完整使用指南 - 如何快速上手并掌握核心功能`
    },
    {
      // "X 介绍" -> "X 完整指南 - 从入门到精通"
      pattern: /^(.+?)\s+介绍$/,
      replacement: (match, x) => `${x} 完整指南 - 从入门到精通`
    },
    {
      // "关于 X" -> "X 完整指南 - 全面了解核心功能与最佳实践"
      pattern: /^关于\s+(.+)$/,
      replacement: (match, x) => `${x} 完整指南 - 全面了解核心功能与最佳实践`
    },
    {
      // "X 教程" (太简单) -> "X 完整教程 - 从零开始掌握核心技能"
      pattern: /^(.+?)\s+教程$/,
      replacement: (match, x) => `${x} 完整教程 - 从零开始掌握核心技能`
    },
    {
      // "X 实现 Y" -> "如何用 X 实现 Y - 完整实战指南"
      pattern: /^(.+?)\s+实现\s+(.+)$/,
      replacement: (match, x, y) => `如何用 ${x} 实现 ${y} - 完整实战指南`
    },
    {
      // "X 开发 Y" -> "如何用 X 开发 Y - 从零到生产完整指南"
      pattern: /^(.+?)\s+开发\s+(.+)$/,
      replacement: (match, x, y) => `如何用 ${x} 开发 ${y} - 从零到生产完整指南`
    },
  ];
  
  // 应用模式匹配
  let matched = false;
  for (const { pattern, replacement } of patterns) {
    if (pattern.test(optimized)) {
      optimized = optimized.replace(pattern, replacement);
      matched = true;
      break;
    }
  }
  
  // 3. 如果标题很短且没有任务型关键词，添加指南类后缀
  const taskKeywords = ['如何', '指南', '实战', '完整', '全指南', '最佳实践', '详解', '深入', '教程', 'guide', 'tutorial', 'how to'];
  const hasTaskKeyword = taskKeywords.some(kw => optimized.toLowerCase().includes(kw.toLowerCase()));
  
  // 如果标题很短且没有任务型关键词，需要更智能地添加
  if (!matched && optimized.length < 25 && !hasTaskKeyword) {
    // 根据文件路径和标题内容判断主题
    const fileName = path.basename(filePath, '.md');
    
    // 提取关键词
    let mainTopic = optimized;
    if (optimized.includes('库') || optimized.includes('包')) {
      // 保留完整的库/包名称
      if (optimized.endsWith('库') || optimized.endsWith('包')) {
        optimized = `${optimized}完整使用指南 - 如何集成并掌握核心功能`;
      } else {
        mainTopic = optimized.replace(/\s*(库|包).*$/, '');
        optimized = `${mainTopic}完整使用指南 - 如何集成并掌握核心功能`;
      }
    } else if (optimized.includes('工具')) {
      // 保留完整的工具名称
      if (optimized.endsWith('工具')) {
        optimized = `如何开发和使用 ${optimized} - 完整实战指南`;
      } else {
        mainTopic = optimized.replace(/\s*工具.*$/, '');
        optimized = `如何开发和使用 ${mainTopic}工具 - 完整实战指南`;
      }
    } else {
      // 根据文件路径判断主题
      if (filePath.includes('golang') || filePath.includes('Go')) {
        optimized = `如何掌握 ${optimized} - Go 开发完整指南`;
      } else if (filePath.includes('php') || filePath.includes('PHP')) {
        optimized = `如何掌握 ${optimized} - PHP 开发完整指南`;
      } else if (filePath.includes('python') || filePath.includes('Python')) {
        optimized = `如何掌握 ${optimized} - Python 开发完整指南`;
      } else {
        optimized = `${optimized} - 完整使用指南`;
      }
    }
  }
  
  // 4. 清理多余的空格和破折号
  optimized = optimized.replace(/\s*-\s*-\s*/g, ' - ').trim();
  
  // 修复单词中间的多余空格（如"小 工具" -> "小工具"）
  // 匹配中文词之间的多余空格
  optimized = optimized.replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2');
  // 匹配英文单词之间的多余空格（但保留破折号前后的空格）
  optimized = optimized.replace(/([a-zA-Z0-9])\s{2,}([a-zA-Z0-9])/g, '$1 $2');
  
  // 清理连续的空格（但保留破折号前后的单个空格）
  optimized = optimized.replace(/([^-])\s{2,}([^-])/g, '$1 $2');
  
  // 如果标题中有多个破折号，简化它
  const dashCount = (optimized.match(/\s-\s/g) || []).length;
  if (dashCount > 2) {
    // 保留前两个破折号，移除多余的
    const parts = optimized.split(/\s-\s/);
    if (parts.length > 3) {
      optimized = `${parts[0]} - ${parts.slice(1, 3).join(' - ')}`;
    }
  }
  
  optimized = optimized.trim();
  
  return optimized;
}

/**
 * 递归查找所有 markdown 文件
 */
function findMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (file !== '.vitepress') {
        findMarkdownFiles(filePath, fileList);
      }
    } else if (file.endsWith('.md')) {
      if (!['index.md', '404.md', 'about.md', 'contact.md', 'privacy-policy.md'].includes(file)) {
        fileList.push(filePath);
      }
    }
  }
  
  return fileList;
}

/**
 * 提取 frontmatter 中的 title
 */
function extractTitle(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!match) return null;
    
    const frontmatter = match[1];
    const titleMatch = frontmatter.match(/^title:\s*(.+)$/m);
    if (!titleMatch) return null;
    
    let title = titleMatch[1].trim();
    if ((title.startsWith('"') && title.endsWith('"')) || 
        (title.startsWith("'") && title.endsWith("'"))) {
      title = title.slice(1, -1);
    }
    
    return title;
  } catch (error) {
    return null;
  }
}

/**
 * 主函数
 */
function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  
  console.log('🔧 开始优化文章标题...\n');
  if (dryRun) {
    console.log('🔍 干运行模式（不会实际修改文件）\n');
  }
  
  const files = findMarkdownFiles(docsDir);
  const changes = [];
  
  for (const file of files) {
    const title = extractTitle(file);
    if (!title) continue;
    
    // 检查是否需要优化
    const hasSpecialChars = /[:：]/.test(title);
    const needsOptimization = hasSpecialChars || 
      /^在\s+.+\s+中\s+(使用|应用)/.test(title) ||
      /^使用\s+.+$/.test(title) ||
      /^.+\s+的\s+(使用|介绍)$/.test(title) ||
      /^关于\s+.+$/.test(title) ||
      (title.length < 20 && !/如何|指南|实战|完整|详解/.test(title));
    
    if (needsOptimization) {
      const optimized = optimizeTitle(title, file);
      if (optimized !== title) {
        changes.push({
          file: path.relative(docsDir, file),
          oldTitle: title,
          newTitle: optimized
        });
        
        if (!dryRun) {
          updateTitle(file, optimized);
        }
      }
    }
  }
  
  // 输出结果
  console.log(`📊 总共扫描 ${files.length} 篇文章\n`);
  console.log(`✨ 优化了 ${changes.length} 个标题：\n`);
  
  changes.forEach(({ file, oldTitle, newTitle }) => {
    console.log(`📝 ${file}`);
    console.log(`   旧: "${oldTitle}"`);
    console.log(`   新: "${newTitle}"`);
    console.log();
  });
  
  if (dryRun) {
    console.log('\n💡 这是干运行结果。要实际应用更改，请运行:');
    console.log('   node scripts/optimize-titles.mjs\n');
  } else {
    console.log(`\n✅ 已成功更新 ${changes.length} 个标题！\n`);
  }
}

main();
