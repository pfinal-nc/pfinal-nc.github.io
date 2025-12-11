#!/usr/bin/env node

/**
 * SEO 关键词分析工具
 * 分析博客文章的关键词配置情况，生成优化建议
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docsDir = path.resolve(__dirname, '../docs');

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
      if (line.match(/^(\w+):\s*(.*)$/)) {
        // 保存上一个字段
        if (currentKey) {
          if (inArray) {
            frontmatter[currentKey] = currentValue;
          } else {
            frontmatter[currentKey] = currentValue.join('\n').trim();
          }
        }
        
        const match = line.match(/^(\w+):\s*(.*)$/);
        currentKey = match[1];
        const value = match[2].trim();
        
        if (value.startsWith('-')) {
          inArray = true;
          currentValue = [value.replace(/^-\s*/, '')];
        } else if (value === '') {
          inArray = false;
          currentValue = [];
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
 * 分析关键词
 */
function analyzeKeywords(keywords) {
  if (!keywords) return { count: 0, keywords: [] };
  
  const keywordList = Array.isArray(keywords) ? keywords : [keywords];
  const cleanKeywords = keywordList
    .map(k => k.trim())
    .filter(k => k && k !== '');
  
  return {
    count: cleanKeywords.length,
    keywords: cleanKeywords
  };
}

/**
 * 主函数
 */
async function main() {
  console.log('🔍 开始 SEO 关键词分析...\n');
  
  const files = await glob('**/*.md', {
    cwd: docsDir,
    ignore: ['**/node_modules/**', '**/dist/**', '**/.vitepress/**']
  });
  
  const stats = {
    total: files.length,
    withTitle: 0,
    withDescription: 0,
    withKeywords: 0,
    totalKeywords: 0,
    articles: []
  };
  
  for (const file of files) {
    const filePath = path.join(docsDir, file);
    const frontmatter = extractFrontmatter(filePath);
    
    if (!frontmatter) continue;
    
    const article = {
      path: file,
      title: frontmatter.title || null,
      description: frontmatter.description || null,
      keywords: frontmatter.keywords || null,
      layout: frontmatter.layout || null
    };
    
    if (article.title) stats.withTitle++;
    if (article.description) stats.withDescription++;
    
    const keywordAnalysis = analyzeKeywords(article.keywords);
    if (keywordAnalysis.count > 0) {
      stats.withKeywords++;
      stats.totalKeywords += keywordAnalysis.count;
    }
    
    article.keywordCount = keywordAnalysis.count;
    article.keywordList = keywordAnalysis.keywords;
    
    stats.articles.push(article);
  }
  
  // 输出统计
  console.log('📊 SEO 配置统计:');
  console.log(`  总文件数: ${stats.total}`);
  console.log(`  有标题: ${stats.withTitle} (${Math.round(stats.withTitle/stats.total*100)}%)`);
  console.log(`  有描述: ${stats.withDescription} (${Math.round(stats.withDescription/stats.total*100)}%)`);
  console.log(`  有关键词: ${stats.withKeywords} (${Math.round(stats.withKeywords/stats.total*100)}%)`);
  console.log(`  总关键词数: ${stats.totalKeywords}`);
  console.log(`  平均每篇文章关键词数: ${stats.withKeywords > 0 ? Math.round(stats.totalKeywords/stats.withKeywords*10)/10 : 0}`);
  
  // 找出需要优化的文章
  console.log('\n⚠️  需要优化的文章:');
  const needsOptimization = stats.articles.filter(a => 
    !a.title || !a.description || !a.keywords || a.keywordCount < 3
  );
  
  console.log(`  需要优化的文章数: ${needsOptimization.length}`);
  
  if (needsOptimization.length > 0) {
    console.log('\n  前 10 篇需要优化的文章:');
    needsOptimization.slice(0, 10).forEach((article, index) => {
      const issues = [];
      if (!article.title) issues.push('缺少标题');
      if (!article.description) issues.push('缺少描述');
      if (!article.keywords || article.keywordCount < 3) issues.push(`关键词不足(${article.keywordCount})`);
      console.log(`    ${index + 1}. ${article.path}`);
      console.log(`       问题: ${issues.join(', ')}`);
    });
  }
  
  // 关键词分布分析
  console.log('\n📈 关键词分布分析:');
  const keywordDistribution = {};
  stats.articles.forEach(article => {
    if (article.keywordList) {
      article.keywordList.forEach(kw => {
        keywordDistribution[kw] = (keywordDistribution[kw] || 0) + 1;
      });
    }
  });
  
  const topKeywords = Object.entries(keywordDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  
  console.log('  热门关键词（前 20）:');
  topKeywords.forEach(([keyword, count], index) => {
    console.log(`    ${index + 1}. ${keyword} (${count} 次)`);
  });
  
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
    needsOptimization: needsOptimization.length,
    topKeywords: topKeywords.map(([keyword, count]) => ({ keyword, count })),
    articles: stats.articles.map(a => ({
      path: a.path,
      hasTitle: !!a.title,
      hasDescription: !!a.description,
      keywordCount: a.keywordCount
    }))
  };
  
  fs.writeFileSync(
    path.join(__dirname, '../docs/seo-keyword-analysis.json'),
    JSON.stringify(report, null, 2),
    'utf-8'
  );
  
  console.log('\n✅ 分析完成！详细报告已保存到: docs/seo-keyword-analysis.json');
}

main().catch(console.error);
