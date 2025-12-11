#!/usr/bin/env node

/**
 * 博客 SEO 数据分析脚本
 * 分析文章数量、主题分布、关键词覆盖等
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
      // 跳过 .vitepress 和 node_modules
      if (!file.startsWith('.') && file !== 'node_modules') {
        findMarkdownFiles(filePath, fileList);
      }
    } else if (file.endsWith('.md') && file !== '404.md') {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * 分析文章数据
 */
function analyzeArticles() {
  const files = findMarkdownFiles(docsDir);
  const articles = [];
  const categories = {};
  const tags = {};
  const keywords = {};
  const topics = {
    golang: 0,
    php: 0,
    python: 0,
    tools: 0,
    database: 0,
    other: 0
  };
  
  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const { data } = matter(content);
      
      if (data.title && !data.layout) {
        const relativePath = path.relative(docsDir, file);
        const category = data.category || '';
        const fileTags = Array.isArray(data.tags) ? data.tags : [];
        const fileKeywords = Array.isArray(data.keywords) ? data.keywords : (data.keywords ? [data.keywords] : []);
        
        // 统计分类
        if (category) {
          categories[category] = (categories[category] || 0) + 1;
        }
        
        // 统计标签
        fileTags.forEach(tag => {
          tags[tag] = (tags[tag] || 0) + 1;
        });
        
        // 统计关键词
        fileKeywords.forEach(kw => {
          keywords[kw] = (keywords[kw] || 0) + 1;
        });
        
        // 统计主题
        if (relativePath.includes('golang') || relativePath.includes('Golang')) {
          topics.golang++;
        } else if (relativePath.includes('PHP') || relativePath.includes('php')) {
          topics.php++;
        } else if (relativePath.includes('python') || relativePath.includes('Python')) {
          topics.python++;
        } else if (relativePath.includes('Tools') || relativePath.includes('工具')) {
          topics.tools++;
        } else if (relativePath.includes('database') || relativePath.includes('数据库')) {
          topics.database++;
        } else {
          topics.other++;
        }
        
        articles.push({
          title: data.title,
          path: relativePath,
          category: category,
          tags: fileTags,
          keywords: fileKeywords,
          date: data.date,
          description: data.description || ''
        });
      }
    } catch (error) {
      console.warn(`⚠️  解析文件失败: ${file}`, error.message);
    }
  });
  
  return {
    total: articles.length,
    articles,
    categories,
    tags,
    keywords,
    topics
  };
}

/**
 * 分析 SEO 指标
 */
function analyzeSEO(data) {
  const seoMetrics = {
    articlesWithDescription: 0,
    articlesWithKeywords: 0,
    articlesWithTags: 0,
    articlesWithDate: 0,
    taskOrientedTitles: 0,
    titlesWithHowTo: 0,
    titlesWithGuide: 0
  };
  
  data.articles.forEach(article => {
    if (article.description) seoMetrics.articlesWithDescription++;
    if (article.keywords.length > 0) seoMetrics.articlesWithKeywords++;
    if (article.tags.length > 0) seoMetrics.articlesWithTags++;
    if (article.date) seoMetrics.articlesWithDate++;
    
    const title = article.title.toLowerCase();
    if (title.includes('如何') || title.includes('how to') || title.includes('guide') || title.includes('指南')) {
      seoMetrics.taskOrientedTitles++;
    }
    if (title.includes('如何') || title.includes('how to')) {
      seoMetrics.titlesWithHowTo++;
    }
    if (title.includes('guide') || title.includes('指南') || title.includes('完整')) {
      seoMetrics.titlesWithGuide++;
    }
  });
  
  return seoMetrics;
}

/**
 * 生成分析报告
 */
function generateReport(data, seoMetrics) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalArticles: data.total,
      topics: data.topics,
      categories: Object.keys(data.categories).length,
      uniqueTags: Object.keys(data.tags).length,
      uniqueKeywords: Object.keys(data.keywords).length
    },
    seoMetrics: {
      ...seoMetrics,
      descriptionCoverage: ((seoMetrics.articlesWithDescription / data.total) * 100).toFixed(1) + '%',
      keywordsCoverage: ((seoMetrics.articlesWithKeywords / data.total) * 100).toFixed(1) + '%',
      tagsCoverage: ((seoMetrics.articlesWithTags / data.total) * 100).toFixed(1) + '%',
      taskOrientedCoverage: ((seoMetrics.taskOrientedTitles / data.total) * 100).toFixed(1) + '%'
    },
    topTags: Object.entries(data.tags)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count })),
    topKeywords: Object.entries(data.keywords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([keyword, count]) => ({ keyword, count })),
    topCategories: Object.entries(data.categories)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }))
  };
  
  return report;
}

/**
 * 主函数
 */
function main() {
  console.log('📊 开始分析博客数据...\n');
  
  const data = analyzeArticles();
  const seoMetrics = analyzeSEO(data);
  const report = generateReport(data, seoMetrics);
  
  // 输出报告
  console.log('📈 博客数据总览:');
  console.log(`   总文章数: ${report.summary.totalArticles}`);
  console.log(`   主题分布:`);
  Object.entries(report.summary.topics).forEach(([topic, count]) => {
    console.log(`     - ${topic}: ${count} 篇`);
  });
  console.log(`   分类数: ${report.summary.categories}`);
  console.log(`   标签数: ${report.summary.uniqueTags}`);
  console.log(`   关键词数: ${report.summary.uniqueKeywords}\n`);
  
  console.log('🔍 SEO 指标:');
  console.log(`   描述覆盖率: ${report.seoMetrics.descriptionCoverage}`);
  console.log(`   关键词覆盖率: ${report.seoMetrics.keywordsCoverage}`);
  console.log(`   标签覆盖率: ${report.seoMetrics.tagsCoverage}`);
  console.log(`   任务型标题覆盖率: ${report.seoMetrics.taskOrientedCoverage}`);
  console.log(`   包含"如何"的标题: ${report.seoMetrics.titlesWithHowTo} 篇`);
  console.log(`   包含"指南"的标题: ${report.seoMetrics.titlesWithGuide} 篇\n`);
  
  console.log('🏷️  热门标签 (Top 20):');
  report.topTags.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.tag}: ${item.count} 篇`);
  });
  console.log();
  
  console.log('🔑 热门关键词 (Top 30):');
  report.topKeywords.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.keyword}: ${item.count} 次`);
  });
  console.log();
  
  // 保存报告到文件
  const reportPath = path.resolve(__dirname, '../docs/blog-seo-analysis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`✅ 详细报告已保存到: ${reportPath}\n`);
  
  return report;
}

main();
