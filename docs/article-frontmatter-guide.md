# 文章元信息（Front Matter）统一规范

## 🎯 核心目标

1. **搜索引擎精准识别** - 让每篇文章被搜索引擎准确理解和索引
2. **专题自动归档** - 让专题导航能够自动分类和组织内容
3. **自动化处理** - 方便后续的脚本批处理和内容管理
4. **品牌一致性** - 统一视觉与结构，增强"PFinalClub"站点品牌感

## 📋 元信息字段规范

### 必填字段（Required）

```yaml
---
title: "文章标题（明确主题 + 场景）"
categories: 
  - "主分类1"
  - "主分类2（可选）"
tags:
  - "标签1"
  - "标签2"
  - "标签3"
summary: "30-60字摘要，明确说明文章解决的问题和价值"
status: "published"
---
```

### 推荐字段（Recommended）

```yaml
---
slug: "go-rag-engineering-tutorial"
date: 2025-02-02
updated: 2025-02-02
authors:
  - "PFinal南丞"
keywords:
  - "go rag教程"
  - "向量检索实战"
readingTime: 12
cover: "/images/article-cover.png"
toc: true
---
```

## 🎨 字段详解与最佳实践

### 1. title（标题）
**格式要求**：
- 使用"主题 + 场景/问题"格式
- 长度控制在30-60字符之间
- 避免使用过于简单或冗长的标题

**优秀示例**：
- ✅ "用Go实现轻量级RAG系统（完整工程化流程）"
- ✅ "Python异步编程深度解析（从基础到高级应用）"
- ✅ "WAF规则编写实战指南（从基础到高级防护）"

**避免示例**：
- ❌ "Golang RAG"（过于简单）
- ❌ "一个关于如何使用Go语言构建RAG系统的详细教程"（过于冗长）

### 2. slug（URL标识）
**格式要求**：
- 全小写字母
- 使用中横线连接单词
- 避免中文和特殊字符
- 保持简洁且具有描述性

**示例**：
- `"go-concurrency-patterns"`
- `"python-webpack-reverse"`
- `"waf-rules-best-practices"`

### 3. categories（分类）
**使用规则**：
- 只使用1-2个主分类
- 从博客现有的6大分类体系中选择
- 保持分类的一致性

**可用分类**：
- 开发与系统
- 安全工程
- 数据与自动化
- 攻防研究
- 思考/方法论
- 独立开发

### 4. tags（标签）
**使用规则**：
- 使用3-8个细粒度标签
- 用于站内搜索和内容关联
- 可以包含技术栈、工具、概念等

**标签分类建议**：
- **技术栈**：go, python, php, javascript
- **工具**：docker, kubernetes, vscode, git
- **概念**：微服务, 并发, 安全, 自动化
- **领域**：后端, 前端, 运维, 数据科学

### 5. keywords（SEO关键词）
**使用规则**：
- 使用5-10个用户实际会搜索的词组
- 包含主关键字和长尾关键字
- 避免关键词堆砌，保持自然

**示例**：
- `["go并发模式", "高并发编程", "goroutine实战", "channel使用"]`

### 6. summary（摘要）
**重要性**：整站专业感的灵魂
**要求**：
- 30-60字，简洁有力
- 明确说明文章解决的问题
- 突出文章的核心价值
- 吸引读者继续阅读

**优秀示例**：
> "深入解析Go语言7种核心并发模式，包含实际应用场景和性能对比，帮助开发者掌握高并发编程最佳实践。"

### 7. 其他字段说明

**date/updated**：
- 使用ISO格式：YYYY-MM-DD
- updated字段在文章有重大更新时修改

**authors**：
- 统一使用"PFinal南丞"
- 为多作者合作预留扩展空间

**readingTime**：
- 估算文章阅读时间（分钟）
- 帮助用户预估阅读成本

**cover**：
- 使用统一的图片路径格式
- 图片存放在`/public/images/`目录

**status**：
- published：已发布文章
- draft：草稿状态

## 📊 分类专属模板

### 开发与系统类文章
```yaml
---
title: "Go语言高并发编程实战（7种核心模式详解）"
slug: "go-concurrency-patterns-guide"
categories: ["开发与系统", "Go实战"]
tags: ["go", "并发编程", "高性能", "goroutine", "channel"]
keywords: ["go并发模式", "高并发编程", "goroutine实战", "channel使用"]
summary: "深入解析Go语言7种核心并发模式，包含实际应用场景和性能对比，帮助开发者掌握高并发编程最佳实践。"
readingTime: 15
cover: "/images/go-concurrency-patterns.png"
status: "published"
toc: true
---
```

### 安全工程类文章
```yaml
---
title: "WAF规则编写实战指南（从基础到高级防护）"
slug: "waf-rules-writing-guide"
categories: ["安全工程", "Web安全"]
tags: ["waf", "web安全", "防火墙", "安全规则", "防护"]
keywords: ["waf配置教程", "web安全防护", "防火墙规则编写"]
summary: "全面讲解WAF规则编写技巧，涵盖常见攻击防护、性能优化和实战案例，提升网站安全防护能力。"
readingTime: 12
cover: "/images/waf-rules-guide.png"
status: "published"
toc: true
---
```

### 数据与自动化类文章
```yaml
---
title: "Python爬虫JS逆向实战（Webpack加密破解）"
slug: "python-js-reverse-webpack"
categories: ["数据与自动化", "爬虫技术"]
tags: ["python", "爬虫", "js逆向", "webpack", "加密破解"]
keywords: ["python爬虫教程", "js逆向技巧", "webpack破解"]
summary: "详细讲解Python爬虫中的JS逆向技术，重点分析Webpack加密机制和破解方法，提升数据采集效率。"
readingTime: 18
cover: "/images/python-js-reverse.png"
status: "published"
toc: true
---
```

## 🛠 实施指南

### 新文章创作流程
1. 根据文章主题选择合适的分类模板
2. 填写必填字段（title, categories, tags, summary）
3. 补充推荐字段（slug, keywords等）
4. 验证字段格式和内容质量

### 现有文章优化流程
1. 备份原始文件
2. 按照规范模板更新元信息
3. 重点优化title和summary字段
4. 统一categories和tags分类体系
5. 验证优化效果

### 质量检查清单
- [ ] title格式符合"主题 + 场景"要求
- [ ] summary在30-60字之间，内容明确
- [ ] categories数量为1-2个，分类准确
- [ ] tags数量3-8个，覆盖文章核心内容
- [ ] keywords包含用户实际搜索词
- [ ] slug格式正确，无中文和特殊字符
- [ ] 所有字段拼写和格式正确

## 📈 预期效果

实施这套规范后，您的博客将实现：

1. **SEO优化**：搜索引擎对文章主题的理解更加准确
2. **用户体验**：统一的专业风格提升品牌形象
3. **内容管理**：自动化归档和搜索更加高效
4. **扩展性**：为未来的自动化工具和功能扩展奠定基础

---

*最后更新：2025-12-12*  
*文档版本：v1.0*