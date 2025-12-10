#!/usr/bin/env node

/**
 * 验证部署后的关键功能
 * 1. 检查主题中心页是否存在
 * 2. 验证标题优化是否生效
 * 3. 检查死链接配置
 * 4. 验证 Schema.org 结构化数据配置
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docsDir = path.resolve(__dirname, '../docs');

/**
 * 检查文件是否存在
 */
function fileExists(filePath) {
  return fs.existsSync(path.join(docsDir, filePath));
}

/**
 * 提取 frontmatter 中的 title
 */
function extractTitle(filePath) {
  try {
    const content = fs.readFileSync(path.join(docsDir, filePath), 'utf-8');
    const match = content.match(/^title:\s*(.+)$/m);
    if (!match) return null;
    let title = match[1].trim();
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
 * 检查标题是否包含特殊字符
 */
function hasSpecialChars(title) {
  return /[:：]/.test(title);
}

/**
 * 检查标题是否是任务型
 */
function isTaskTypeTitle(title) {
  const taskKeywords = ['如何', '指南', '实战', '完整', '全指南', '最佳实践', '详解', '深入', '教程', 'guide', 'tutorial', 'how to', 'complete'];
  return taskKeywords.some(kw => title.toLowerCase().includes(kw.toLowerCase()));
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 开始验证部署...\n');
  
  const results = {
    topicHubs: [],
    titleOptimization: { total: 0, optimized: 0, hasSpecialChars: 0 },
    deadLinks: { configured: false },
    schema: { configured: false }
  };
  
  // 1. 检查主题中心页
  console.log('📋 1. 检查主题中心页...');
  const topicHubs = [
    { name: 'PHP (英文)', path: 'PHP/index.md' },
    { name: 'Python (英文)', path: 'python/index.md' },
    { name: 'Tools (英文)', path: 'Tools/index.md' },
    { name: 'Database (英文)', path: 'database/index.md' },
    { name: 'PHP (中文)', path: 'zh/php/index.md' },
    { name: 'Python (中文)', path: 'zh/python/index.md' },
    { name: '工具 (中文)', path: 'zh/工具/index.md' },
    { name: '数据库 (中文)', path: 'zh/数据库/index.md' },
  ];
  
  topicHubs.forEach(hub => {
    const exists = fileExists(hub.path);
    if (exists) {
      const content = fs.readFileSync(path.join(docsDir, hub.path), 'utf-8');
      const hasLayout = content.includes('layout: page');
      const hasTitle = /^title:/.test(content);
      const hasDescription = /^description:/.test(content);
      const hasKeywords = /^keywords:/.test(content);
      results.topicHubs.push({ ...hub, exists, hasLayout, hasTitle, hasDescription, hasKeywords });
      console.log(`   ${exists ? '✓' : '✗'} ${hub.name}: ${exists ? '存在' : '缺失'} ${hasLayout ? '(layout: page)' : ''} ${hasTitle ? '(title)' : ''} ${hasDescription ? '(description)' : ''} ${hasKeywords ? '(keywords)' : ''}`);
    } else {
      results.topicHubs.push({ ...hub, exists, hasLayout: false });
      console.log(`   ${exists ? '✓' : '✗'} ${hub.name}: ${exists ? '存在' : '缺失'}`);
    }
  });
  
  // 2. 检查标题优化
  console.log('\n📝 2. 检查标题优化...');
  const sampleFiles = [
    'golang/golang系统库之gopsutil.md',
    'golang/GO语言开发终端小工具后续.md',
    'PHP/ThinkPHP-20-Years-of-Chinese-Web-Development.md',
    'Tools/Vibe-Coding-ChatGPT-5.1.md',
  ];
  
  sampleFiles.forEach(file => {
    if (fileExists(file)) {
      const title = extractTitle(file);
      if (title) {
        results.titleOptimization.total++;
        const hasSpecial = hasSpecialChars(title);
        const isTask = isTaskTypeTitle(title);
        if (hasSpecial) results.titleOptimization.hasSpecialChars++;
        if (isTask) results.titleOptimization.optimized++;
        console.log(`   ${file}`);
        console.log(`     标题: "${title}"`);
        console.log(`     特殊字符: ${hasSpecial ? '❌ 有' : '✅ 无'}`);
        console.log(`     任务型: ${isTask ? '✅ 是' : '❌ 否'}`);
      }
    }
  });
  
  // 3. 检查死链接配置
  console.log('\n🔗 3. 检查死链接配置...');
  const configPath = path.join(docsDir, '.vitepress/config.mts');
  const config = fs.readFileSync(configPath, 'utf-8');
  const hasPHPIgnore = /\/PHP\//.test(config);
  const hasToolsIgnore = /The-Command-Line-Tool-That-Makes-File-Navigation-Effortles/.test(config);
  results.deadLinks.configured = hasPHPIgnore && hasToolsIgnore;
  console.log(`   PHP 链接忽略: ${hasPHPIgnore ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`   Tools 链接忽略: ${hasToolsIgnore ? '✅ 已配置' : '❌ 未配置'}`);
  
  // 4. 检查 Schema.org 配置
  console.log('\n📊 4. 检查 Schema.org 结构化数据配置...');
  const hasCollectionPage = config.includes('CollectionPage');
  const hasTechArticle = config.includes('TechArticle');
  results.schema.configured = hasCollectionPage && hasTechArticle;
  console.log(`   CollectionPage: ${hasCollectionPage ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`   TechArticle: ${hasTechArticle ? '✅ 已配置' : '❌ 未配置'}`);
  
  // 总结
  console.log('\n📊 验证总结:');
  console.log(`   主题中心页: ${results.topicHubs.filter(h => h.exists).length}/${results.topicHubs.length} 个存在`);
  console.log(`   标题优化: ${results.titleOptimization.optimized}/${results.titleOptimization.total} 个是任务型`);
  console.log(`   特殊字符: ${results.titleOptimization.hasSpecialChars} 个标题包含特殊字符`);
  console.log(`   死链接配置: ${results.deadLinks.configured ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`   Schema.org: ${results.schema.configured ? '✅ 已配置' : '❌ 未配置'}`);
  
  const allPassed = 
    results.topicHubs.every(h => h.exists) &&
    results.titleOptimization.hasSpecialChars === 0 &&
    results.deadLinks.configured &&
    results.schema.configured;
  
  console.log(`\n${allPassed ? '✅ 所有验证通过！' : '⚠️  部分验证未通过，请检查上述问题'}\n`);
}

main();
