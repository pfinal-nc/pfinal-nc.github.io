#!/usr/bin/env node

/**
 * 分析文章标题，识别"日记型"标题并生成优化建议
 * 
 * 日记型标题特征：
 * - "在 X 中使用 Y"
 * - "X 的使用"
 * - "X 介绍"
 * - "关于 X"
 * - 缺少"如何"、"指南"、"实战"等任务型关键词
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docsDir = path.resolve(__dirname, '../docs');

// 日记型标题模式
const diaryPatterns = [
  /^在\s+.+\s+中\s+(使用|应用|实现)/,  // "在 Go 中使用 gopsutil"
  /^使用\s+.+$/,  // "使用 gopsutil"
  /^.+\s+的\s+(使用|介绍|应用|实现)$/,  // "gopsutil 的使用"
  /^关于\s+.+$/,  // "关于 gopsutil"
  /^.+\s+教程$/,  // "gopsutil 教程" (太简单)
  /^介绍\s+.+$/,  // "介绍 gopsutil"
];

// 任务型关键词（好的标题应该包含这些）
const taskKeywords = [
  '如何', '指南', '实战', '完整', '全指南', '最佳实践',
  'how to', 'guide', 'complete', 'tutorial', 'best practices',
  '实战', '实践', '详解', '深入', '全面'
];

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
    // 移除引号
    if ((title.startsWith('"') && title.endsWith('"')) || 
        (title.startsWith("'") && title.endsWith("'"))) {
      title = title.slice(1, -1);
    }
    
    return title;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * 检查是否是日记型标题
 */
function isDiaryTypeTitle(title) {
  // 检查是否匹配日记型模式
  for (const pattern of diaryPatterns) {
    if (pattern.test(title)) {
      return true;
    }
  }
  
  // 检查是否缺少任务型关键词
  const hasTaskKeyword = taskKeywords.some(keyword => 
    title.toLowerCase().includes(keyword.toLowerCase())
  );
  
  // 如果标题很短且没有任务型关键词，可能是日记型
  if (title.length < 20 && !hasTaskKeyword) {
    return true;
  }
  
  return false;
}

/**
 * 检查标题是否包含特殊字符（冒号等）
 */
function hasSpecialChars(title) {
  // VitePress 不支持的字符
  return /[:：]/.test(title);
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
      // 跳过 .vitepress 目录
      if (file !== '.vitepress') {
        findMarkdownFiles(filePath, fileList);
      }
    } else if (file.endsWith('.md')) {
      // 跳过特殊页面
      if (!['index.md', '404.md', 'about.md', 'contact.md', 'privacy-policy.md'].includes(file)) {
        fileList.push(filePath);
      }
    }
  }
  
  return fileList;
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 开始分析文章标题...\n');
  
  const files = findMarkdownFiles(docsDir);
  const issues = [];
  
  for (const file of files) {
    const title = extractTitle(file);
    if (!title) continue;
    
    const relativePath = path.relative(docsDir, file);
    const hasSpecial = hasSpecialChars(title);
    const isDiary = isDiaryTypeTitle(title);
    
    if (isDiary || hasSpecial) {
      issues.push({
        file: relativePath,
        title,
        isDiary,
        hasSpecial
      });
    }
  }
  
  // 输出结果
  console.log(`📊 总共扫描 ${files.length} 篇文章\n`);
  console.log(`⚠️  发现 ${issues.length} 个需要优化的标题：\n`);
  
  // 按问题类型分组
  const diaryOnly = issues.filter(i => i.isDiary && !i.hasSpecial);
  const specialOnly = issues.filter(i => !i.isDiary && i.hasSpecial);
  const both = issues.filter(i => i.isDiary && i.hasSpecial);
  
  if (diaryOnly.length > 0) {
    console.log(`📝 日记型标题 (${diaryOnly.length} 个):`);
    diaryOnly.forEach(({ file, title }) => {
      console.log(`   - ${file}`);
      console.log(`     标题: "${title}"`);
    });
    console.log();
  }
  
  if (specialOnly.length > 0) {
    console.log(`🚫 包含特殊字符的标题 (${specialOnly.length} 个):`);
    specialOnly.forEach(({ file, title }) => {
      console.log(`   - ${file}`);
      console.log(`     标题: "${title}"`);
    });
    console.log();
  }
  
  if (both.length > 0) {
    console.log(`⚠️  同时存在两个问题的标题 (${both.length} 个):`);
    both.forEach(({ file, title }) => {
      console.log(`   - ${file}`);
      console.log(`     标题: "${title}"`);
    });
    console.log();
  }
  
  // 生成 JSON 报告
  const reportPath = path.resolve(__dirname, '../title-analysis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(issues, null, 2), 'utf-8');
  console.log(`\n✅ 详细报告已保存到: ${reportPath}`);
}

main();
