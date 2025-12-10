#!/usr/bin/env node

/**
 * 修复标题中的多余空格问题
 * 1. 修复破折号后的双空格（` -  ` -> ` - `）
 * 2. 修复"如何掌握"后的多余空格
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docsDir = path.resolve(__dirname, '../docs');

/**
 * 修复文件中的标题
 */
function fixTitleInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/^(---\s*\n)([\s\S]*?)(\n---)/);
    if (!match) return false;
    
    let frontmatter = match[2];
    const titleMatch = frontmatter.match(/^title:\s*(.+)$/m);
    if (!titleMatch) return false;
    
    let title = titleMatch[1].trim();
    // 移除引号
    if ((title.startsWith('"') && title.endsWith('"')) || 
        (title.startsWith("'") && title.endsWith("'"))) {
      title = title.slice(1, -1);
    }
    
    let fixed = false;
    let newTitle = title;
    
    // 修复破折号后的双空格
    if (newTitle.includes(' -  ')) {
      newTitle = newTitle.replace(/\s-\s{2,}/g, ' - ');
      fixed = true;
    }
    
    // 修复"如何掌握"后的多余空格（多个空格改为一个空格）
    if (newTitle.includes('如何掌握')) {
      newTitle = newTitle.replace(/如何掌握\s{2,}/g, '如何掌握 ');
      fixed = true;
    }
    
    if (!fixed || newTitle === title) return false;
    
    // 更新 frontmatter
    const newFrontmatter = frontmatter.replace(
      /^title:\s*(.+)$/m,
      `title: "${newTitle}"`
    );
    
    const newContent = content.replace(
      /^(---\s*\n)([\s\S]*?)(\n---)/,
      `$1${newFrontmatter}$3`
    );
    
    fs.writeFileSync(filePath, newContent, 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
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
 * 主函数
 */
function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  
  console.log('🔧 开始修复标题中的多余空格...\n');
  if (dryRun) {
    console.log('🔍 干运行模式（不会实际修改文件）\n');
  }
  
  const files = findMarkdownFiles(docsDir);
  const fixed = [];
  
  for (const file of files) {
    if (dryRun) {
      const content = fs.readFileSync(file, 'utf-8');
      const match = content.match(/^title:\s*(.+)$/m);
      if (match) {
        let title = match[1].trim();
        if ((title.startsWith('"') && title.endsWith('"')) || 
            (title.startsWith("'") && title.endsWith("'"))) {
          title = title.slice(1, -1);
        }
        
        if (title.includes(' -  ') || title.includes('如何掌握 ')) {
          let newTitle = title;
          if (newTitle.includes(' -  ')) {
            newTitle = newTitle.replace(/\s-\s{2,}/g, ' - ');
          }
          if (newTitle.includes('如何掌握 ')) {
            newTitle = newTitle.replace(/如何掌握\s+/g, '如何掌握');
          }
          
          if (newTitle !== title) {
            fixed.push({
              file: path.relative(docsDir, file),
              old: title,
              new: newTitle
            });
          }
        }
      }
    } else {
      if (fixTitleInFile(file)) {
        fixed.push(path.relative(docsDir, file));
      }
    }
  }
  
  if (dryRun) {
    console.log(`📊 总共扫描 ${files.length} 篇文章\n`);
    console.log(`✨ 发现 ${fixed.length} 个需要修复的标题：\n`);
    fixed.forEach(({ file, old, new: newTitle }) => {
      console.log(`📝 ${file}`);
      console.log(`   旧: "${old}"`);
      console.log(`   新: "${newTitle}"`);
      console.log();
    });
    console.log('\n💡 这是干运行结果。要实际应用更改，请运行:');
    console.log('   node scripts/fix-title-spacing.mjs\n');
  } else {
    console.log(`📊 总共扫描 ${files.length} 篇文章\n`);
    console.log(`✅ 已修复 ${fixed.length} 个标题：\n`);
    fixed.forEach(file => {
      console.log(`   ✓ ${file}`);
    });
    console.log();
  }
}

main();
