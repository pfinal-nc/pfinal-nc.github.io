#!/usr/bin/env node

/**
 * SEO 内容分析工具
 * 分析博客文章的 SEO 配置情况
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docsDir = path.resolve(__dirname, '../docs');

/**
 * 递归查找所有 Markdown 文件
 */
function findMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // 跳过 node_modules 和 dist 目录
      if (file !== 'node_modules' && file !== 'dist' && file !== '.vitepress') {
        findMarkdownFiles(filePath, fileList);
      }
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * 提取 frontmatter 字段
 */
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
        // 保存上一个字段
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
    
    // 保存最后一个字段
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

/**
 * 主函数
 */
function main() {
  console.log('🔍 开始 SEO 内容分析...\n');
  
  const files = findMarkdownFiles(docsDir);
  
  const stats = {
    total: files.length,
    withTitle: 0,
    withDescription: 0,
    withKeywords: 0,
    totalKeywords: 0,
    byCategory: {
      golang: 0,
      php: 0,
      python: 0,
      tools: 0,
      database: 0,
      other: 0
    },
    needsOptimization: []
  };
  
  for (const file of files) {
    const relativePath = path.relative(docsDir, file);
    const frontmatter = extractFrontmatter(file);
    
    if (!frontmatter) continue;
    
    const hasTitle = !!frontmatter.title;
    const hasDescription = !!frontmatter.description;
    const keywords = frontmatter.keywords;
    const keywordCount = Array.isArray(keywords) ? keywords.length : (keywords ? 1 : 0);
    
    if (hasTitle) stats.withTitle++;
    if (hasDescription) stats.withDescription++;
    if (keywordCount > 0) {
      stats.withKeywords++;
      stats.totalKeywords += keywordCount;
    }
    
    // 分类统计
    if (relativePath.includes('/golang/')) {
      stats.byCategory.golang++;
    } else if (relativePath.includes('/PHP/') || relativePath.includes('/php/')) {
      stats.byCategory.php++;
    } else if (relativePath.includes('/python/')) {
      stats.byCategory.python++;
    } else if (relativePath.includes('/Tools/') || relativePath.includes('/工具/')) {
      stats.byCategory.tools++;
    } else if (relativePath.includes('/database/') || relativePath.includes('/数据库/')) {
      stats.byCategory.database++;
    } else if (!relativePath.includes('index.md') && !relativePath.includes('404.md') && 
               !relativePath.includes('about.md') && !relativePath.includes('contact.md')) {
      stats.byCategory.other++;
    }
    
    // 需要优化的文章
    if (!hasTitle || !hasDescription || keywordCount < 3) {
      stats.needsOptimization.push({
        path: relativePath,
        missing: {
          title: !hasTitle,
          description: !hasDescription,
          keywords: keywordCount < 3
        },
        keywordCount
      });
    }
  }
  
  // 输出统计
  console.log('📊 SEO 配置统计:');
  console.log(`  总文件数: ${stats.total}`);
  console.log(`  有标题: ${stats.withTitle} (${Math.round(stats.withTitle/stats.total*100)}%)`);
  console.log(`  有描述: ${stats.withDescription} (${Math.round(stats.withDescription/stats.total*100)}%)`);
  console.log(`  有关键词: ${stats.withKeywords} (${Math.round(stats.withKeywords/stats.total*100)}%)`);
  console.log(`  总关键词数: ${stats.totalKeywords}`);
  console.log(`  平均每篇文章关键词数: ${stats.withKeywords > 0 ? Math.round(stats.totalKeywords/stats.withKeywords*10)/10 : 0}`);
  
  console.log('\n📁 主题分布:');
  console.log(`  Golang: ${stats.byCategory.golang} 篇`);
  console.log(`  PHP: ${stats.byCategory.php} 篇`);
  console.log(`  Python: ${stats.byCategory.python} 篇`);
  console.log(`  Tools: ${stats.byCategory.tools} 篇`);
  console.log(`  Database: ${stats.byCategory.database} 篇`);
  console.log(`  其他: ${stats.byCategory.other} 篇`);
  
  console.log(`\n⚠️  需要优化的文章: ${stats.needsOptimization.length}`);
  if (stats.needsOptimization.length > 0 && stats.needsOptimization.length <= 20) {
    console.log('\n  需要优化的文章列表:');
    stats.needsOptimization.forEach((article, index) => {
      const issues = [];
      if (article.missing.title) issues.push('缺少标题');
      if (article.missing.description) issues.push('缺少描述');
      if (article.missing.keywords) issues.push(`关键词不足(${article.keywordCount})`);
      console.log(`    ${index + 1}. ${article.path}`);
      console.log(`       问题: ${issues.join(', ')}`);
    });
  } else if (stats.needsOptimization.length > 20) {
    console.log('\n  前 10 篇需要优化的文章:');
    stats.needsOptimization.slice(0, 10).forEach((article, index) => {
      const issues = [];
      if (article.missing.title) issues.push('缺少标题');
      if (article.missing.description) issues.push('缺少描述');
      if (article.missing.keywords) issues.push(`关键词不足(${article.keywordCount})`);
      console.log(`    ${index + 1}. ${article.path}`);
      console.log(`       问题: ${issues.join(', ')}`);
    });
  }
  
  // 生成报告
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalFiles: stats.total,
      withTitle: stats.withTitle,
      withDescription: stats.withDescription,
      withKeywords: stats.withKeywords,
      totalKeywords: stats.totalKeywords,
      averageKeywordsPerArticle: stats.withKeywords > 0 ? Math.round(stats.totalKeywords/stats.withKeywords*10)/10 : 0
    },
    byCategory: stats.byCategory,
    needsOptimization: stats.needsOptimization.length,
    optimizationList: stats.needsOptimization.slice(0, 50)
  };
  
  fs.writeFileSync(
    path.join(__dirname, '../docs/seo-content-analysis.json'),
    JSON.stringify(report, null, 2),
    'utf-8'
  );
  
  console.log('\n✅ 分析完成！详细报告已保存到: docs/seo-content-analysis.json');
}

main();
