#!/usr/bin/env node

/**
 * 查找缺失 SEO 配置的文章
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docsDir = path.resolve(__dirname, '../docs');

function findMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.vitepress') {
        findMarkdownFiles(filePath, fileList);
      }
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function extractFrontmatter(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return null;
    
    const frontmatter = {};
    const lines = frontmatterMatch[1].split('\n');
    
    let currentKey = null;
    let currentValue = [];
    let inArray = false;
    
    for (const line of lines) {
      const keyMatch = line.match(/^(\w+):\s*(.*)$/);
      if (keyMatch) {
        if (currentKey) {
          if (inArray) {
            frontmatter[currentKey] = currentValue;
          } else {
            frontmatter[currentKey] = currentValue.join('\n').trim();
          }
        }
        
        currentKey = keyMatch[1];
        const value = keyMatch[2].trim();
        
        if (value.startsWith('-') || value === '') {
          inArray = value.startsWith('-');
          currentValue = value.startsWith('-') ? [value.replace(/^-\s*/, '')] : [];
        } else {
          inArray = false;
          currentValue = [value];
        }
      } else if (line.match(/^-\s*(.+)$/)) {
        if (inArray && currentKey) {
          currentValue.push(line.replace(/^-\s*/, ''));
        }
      } else if (line.trim() && currentKey) {
        currentValue.push(line.trim());
      }
    }
    
    if (currentKey) {
      if (inArray) {
        frontmatter[currentKey] = currentValue;
      } else {
        frontmatter[currentKey] = currentValue.join('\n').trim();
      }
    }
    
    return frontmatter;
  } catch (error) {
    return null;
  }
}

function main() {
  const files = findMarkdownFiles(docsDir);
  const issues = {
    missingTitle: [],
    missingDescription: [],
    missingKeywords: [],
    lowKeywords: []
  };
  
  const skipFiles = ['index.md', '404.md', 'about.md', 'contact.md', 'privacy-policy.md'];
  
  for (const file of files) {
    const relativePath = path.relative(docsDir, file);
    const fileName = path.basename(file);
    
    if (skipFiles.includes(fileName)) continue;
    
    const frontmatter = extractFrontmatter(file);
    if (!frontmatter) continue;
    
    if (!frontmatter.title) {
      issues.missingTitle.push(relativePath);
    }
    
    if (!frontmatter.description) {
      issues.missingDescription.push(relativePath);
    }
    
    const keywords = frontmatter.keywords;
    const keywordCount = Array.isArray(keywords) ? keywords.length : (keywords ? 1 : 0);
    
    if (keywordCount === 0) {
      issues.missingKeywords.push(relativePath);
    } else if (keywordCount < 3) {
      issues.lowKeywords.push({ path: relativePath, count: keywordCount });
    }
  }
  
  console.log('🔍 SEO 配置问题分析:\n');
  console.log(`缺少标题: ${issues.missingTitle.length} 篇`);
  if (issues.missingTitle.length > 0) {
    issues.missingTitle.slice(0, 5).forEach(p => console.log(`  - ${p}`));
  }
  
  console.log(`\n缺少描述: ${issues.missingDescription.length} 篇`);
  if (issues.missingDescription.length > 0) {
    issues.missingDescription.slice(0, 5).forEach(p => console.log(`  - ${p}`));
  }
  
  console.log(`\n缺少关键词: ${issues.missingKeywords.length} 篇`);
  if (issues.missingKeywords.length > 0) {
    issues.missingKeywords.slice(0, 5).forEach(p => console.log(`  - ${p}`));
  }
  
  console.log(`\n关键词不足(少于3个): ${issues.lowKeywords.length} 篇`);
  if (issues.lowKeywords.length > 0) {
    issues.lowKeywords.slice(0, 5).forEach(({ path: p, count }) => console.log(`  - ${p} (${count} 个)`));
  }
  
  const totalIssues = issues.missingTitle.length + issues.missingDescription.length + 
                      issues.missingKeywords.length + issues.lowKeywords.length;
  console.log(`\n总计需要优化: ${totalIssues} 篇文章`);
}

main();
