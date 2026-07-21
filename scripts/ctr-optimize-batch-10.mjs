#!/usr/bin/env node
/**
 * P2-2 CTR 优化第 10 批 — 批量更新 10 篇高展示低点击文章的 title + description
 * 策略：加年份 2026、具体技术栈、量化收益词（10倍/完全指南/实战/全流程）
 */

import { readFileSync, writeFileSync } from 'fs';

const patches = [
  {
    file: 'docs/dev/system/loki-logging.md',
    oldTitle: 'Loki 日志系统实战指南',
    newTitle: 'Loki 日志系统实战 2026：Grafana 可观测性栈部署与 LogQL 查询完全指南',
    oldDesc: '深入学习 Grafana Loki 日志聚合系统，掌握与 Prometheus 类似的标签索引机制，实现轻量级、低成本的日志收集和查询。',
    newDesc: 'Loki 日志系统实战 2026 完全指南：从 Promtail 日志采集到 Grafana 可视化看板，掌握 LogQL 查询语法、标签索引优化、生产级部署最佳实践，构建轻量级可观测性日志平台。',
  },
  {
    file: 'docs/dev/system/elk-stack-guide.md',
    oldTitle: 'ELK 日志系统实战指南',
    newTitle: 'ELK 日志系统实战 2026：Elasticsearch + Logstash + Kibana 企业级日志平台全栈部署',
    oldDesc: '深入学习 ELK Stack（Elasticsearch、Logstash、Kibana）日志系统，掌握日志收集、处理、存储和可视化的完整流程，构建企业级日志分析平台。',
    newDesc: 'ELK Stack 实战 2026 全栈指南：Filebeat 日志采集 + Logstash 管道处理 + Elasticsearch 全文检索 + Kibana 可视化看板，从单机部署到集群扩容的完整企业级日志平台方案。',
  },
  {
    file: 'docs/dev/backend/golang/go-redis-practice.md',
    oldTitle: 'Go Redis 实践指南',
    newTitle: 'Go Redis 实战 2026：缓存策略 + 分布式锁 + Pipeline 性能优化完全指南',
    oldDesc: '深入学习 Go 语言操作 Redis，掌握连接池、常用数据结构、分布式锁、缓存模式等核心技能，构建高性能缓存系统。',
    newDesc: 'Go Redis 实战 2026 完全指南：go-redis 客户端最佳实践，涵盖连接池调优、Pipeline 批量操作、分布式锁 Redlock、缓存穿透/击穿/雪崩防护策略，附带完整可运行代码与性能基准。',
  },
  {
    file: 'docs/dev/system/database/MySQL-Configuration-Analysis.md',
    oldTitle: 'MySQL配置文件解析 - 完整使用指南',
    newTitle: 'MySQL 8.0 配置优化完全指南 2026：InnoDB + 查询缓存 + 连接池性能调优实战',
    oldDesc: '详细介绍MySQL配置文件的解析，包括配置文件的位置、常用配置项、优化建议等，帮助开发者更好地管理和优化MySQL数据库。',
    newDesc: 'MySQL 8.0 配置优化完全指南 2026：从 my.cnf 文件详解到 InnoDB 缓冲池、查询缓存、连接池、慢查询日志等核心参数调优，附带生产环境配置模板与性能压测对比数据。',
  },
  {
    file: 'docs/dev/backend/python/Python-推荐系统实战-从算法到应用.md',
    oldTitle: 'Python 推荐系统实战：从算法到应用',
    newTitle: 'Python 推荐系统实战 2026：协同过滤 + 深度学习从算法到大规模生产部署',
    oldDesc: '全面掌握推荐系统技术，从协同过滤到深度学习，构建个性化推荐引擎',
    newDesc: 'Python 推荐系统实战 2026 完全指南：从协同过滤、矩阵分解到深度学习召回与排序，涵盖召回-粗排-精排-重排全链路设计，附带大规模生产部署经验与 A/B 实验评估方案。',
  },
  {
    file: 'docs/dev/backend/python/FastAPI实战案例-从零构建企业级API.md',
    oldTitle: 'FastAPI 实战案例：从零构建企业级 API',
    newTitle: 'FastAPI 企业级 API 实战 2026：异步 ORM + JWT 认证 + Docker 部署全流程指南',
    oldDesc: '通过一个完整的实战案例，学习如何从零开始构建企业级 FastAPI 应用。包括项目架构、数据库设计、认证授权、API 文档、部署上线等完整流程。',
    newDesc: 'FastAPI 企业级 API 实战 2026 全流程指南：从项目架构设计、SQLAlchemy 异步 ORM、JWT OAuth2 认证授权、自动生成的 OpenAPI 文档，到 Docker Compose 容器化部署的完整可运行案例。',
  },
  {
    file: 'docs/dev/backend/python/Flask轻量级应用构建 - 扩展开发、蓝图设计.md',
    oldTitle: 'Flask轻量级应用构建 - 扩展开发、蓝图设计',
    newTitle: 'Flask 模块化开发实战 2026：蓝图设计 + 扩展集成 + 生产部署完整指南',
    oldDesc: '深入探讨Flask轻量级Web框架的模块化开发实践，涵盖蓝图（Blueprint）的核心机制、扩展开发集成、配置管理策略以及生产环境部署优化，为有经验的开发者提供实战指导',
    newDesc: 'Flask 模块化开发实战 2026 完全指南：从 Blueprint 蓝图拆分大型应用、Flask 扩展生态集成（SQLAlchemy / Migrate / RESTful）、多环境配置管理，到 Gunicorn + Nginx 生产部署的完整实战教程。',
  },
  {
    file: 'docs/dev/backend/golang/gin-framework-guide.md',
    oldTitle: 'Gin 框架实战指南',
    newTitle: 'Gin 框架实战指南 2026：Go HTTP 路由 + 中间件链 + 参数验证完整教程',
    oldDesc: '全面讲解 Go 语言最流行的 Web 框架 Gin，包括路由、中间件、参数绑定、验证等核心功能，帮助你快速构建高性能 Web 应用。',
    newDesc: 'Gin 框架实战指南 2026 完全教程：从路由分组与中间件链设计、请求参数绑定与验证、自定义错误处理、JWT 认证中间件，到构建 RESTful API 的完整 Go Web 开发指南。',
  },
  {
    file: 'docs/dev/backend/golang/Go 1.26 SIMD编程实战：从入门到高性能优化.md',
    oldTitle: 'Go 1.26 SIMD编程实战：从入门到高性能优化',
    newTitle: 'Go SIMD 向量化编程实战 2026：AVX2 + SSE 指令集实现 10 倍性能提升',
    oldDesc: '深入探讨Go 1.26中的SIMD（单指令多数据）编程，涵盖向量化指令集基础、编译器自动优化、手动内联汇编实践，以及如何在实际项目中应用SIMD实现2-10倍的性能提升。面向有经验的Go开发者，提供完整代码示例与benchmark对比。',
    newDesc: 'Go SIMD 向量化编程实战 2026 完全指南：从 AVX2/SSE 指令集基础到 Go 1.26 编译器自动向量化，手写 Plan9 汇编实现批量数据处理 10 倍性能提升，附带完整 benchmark 对比与生产落地经验。',
  },
  {
    file: 'docs/dev/backend/golang/ClickHouse实战：从入门到高性能OLAP查询.md',
    oldTitle: 'ClickHouse实战：从入门到高性能OLAP查询',
    newTitle: 'ClickHouse 实战 2026：列式 OLAP 从入门到百亿级实时数据分析与 Go 集成',
    oldDesc: '深入探索ClickHouse列式OLAP数据库的核心特性与实战应用，涵盖架构设计、Go语言集成、性能优化策略，助力开发者构建高效数据分析系统',
    newDesc: 'ClickHouse 实战 2026 完全指南：从列式存储原理与 MergeTree 引擎详解、Go 语言客户端集成（clickhouse-go v2）、分区键与排序键优化策略，到百亿级数据实时聚合查询的完整实践方案。',
  },
];

let updated = 0;
for (const p of patches) {
  const absPath = `/Users/pfinal/Documents/pfinal-vue-blog/${p.file}`;
  let content = readFileSync(absPath, 'utf-8');

  // Replace title
  const titleRegex = new RegExp(`^title:\\s*"${escapeRegex(p.oldTitle)}"`, 'm');
  if (!titleRegex.test(content)) {
    console.error(`❌ Title not found in ${p.file}`);
    continue;
  }
  content = content.replace(titleRegex, `title: "${p.newTitle}"`);

  // Replace description
  const descRegex = new RegExp(`^description:\\s*"${escapeRegex(p.oldDesc)}"`, 'm');
  if (!descRegex.test(content)) {
    console.error(`❌ Description not found in ${p.file}`);
    continue;
  }
  content = content.replace(descRegex, `description: "${p.newDesc}"`);

  writeFileSync(absPath, content);
  console.log(`✅ ${p.file}`);
  updated++;
}

console.log(`\n🎉 Updated ${updated}/${patches.length} articles`);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
