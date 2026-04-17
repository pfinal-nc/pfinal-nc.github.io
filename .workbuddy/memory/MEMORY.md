# 项目长期记忆

## 项目概况
- **项目名称**: PFinalClub 技术博客
- **技术栈**: VitePress 1.6.4 + @sugarat/theme 0.5.4 + Vue 3.5.12
- **作者**: PFinal南丞（8年+后端经验）
- **网站域名**: https://friday-go.icu
- **GitHub**: https://github.com/pfinal-nc

## 内容定位
以**后端 + DevOps + AI 工程实践**为核心的小众高质量技术博客，全部原创。
主要方向：Golang、PHP、Python、微服务、DevOps、AI工程（RAG、Function Calling）。

## 目录结构

```
docs/
├── dev/backend/
│   ├── golang/        # ~67篇文章，含 wails/ 子目录（16篇 Wails 桌面开发）
│   ├── php/           # ~26篇文章（Laravel/现代PHP）
│   ├── python/        # ~23篇文章（FastAPI/爬虫/数据分析）
│   ├── rxjs/          # ~29篇文章
│   └── index.md
├── data/automation/   # ~9篇文章（数据自动化）
├── security/          # 安全工程 + 攻防研究
├── thinking/method/   # ~17篇方法论文章
├── tools/             # ~19篇工具类文章
├── indie/             # 独立开发相关
└── courses/           # 课程目录
```

## 构建脚本（build 命令）
`vitepress build docs` 之后依次执行：
1. `scripts/process-sitemap.mjs` - 处理 sitemap
2. `scripts/copy-redirects.mjs` - 复制重定向配置
3. `scripts/generate-rss.mjs` - 生成 RSS（XML/Atom/JSON）
4. `scripts/create-clean-url-redirects.mjs` - 创建 clean URL 重定向

## SEO 配置
- 开启了 `cleanUrls: true`（去掉 .html 后缀）
- 动态添加 canonical 标签（在 `transformPageData` 中）
- 为文章页添加 TechArticle + BreadcrumbList JSON-LD
- 为专题页添加 CollectionPage JSON-LD
- 支持 FAQPage / HowTo Schema（通过 frontmatter.faq / frontmatter.howTo）
- 注册了 Google/360/Yandex 站长验证 meta

## 已完成的优化（2026-03-11）
- 整合 Wails 相关文章到 `docs/dev/backend/golang/wails/`
- 移动分类错误文件 8 篇
- 完善了 thinking、indie、tools、golang 等导航页
- 分析了 221 个 Markdown 文件的 frontmatter
- 备份目录：`backup-20260311-113601/`（51 个重复文件待确认删除）

## 待执行操作
- 删除重复目录：`docs/Tools/`（22个文件）和 `docs/courses/rxjs/`（29个文件）（已备份）
- 为缺少 tags 的 65 个文件补全 tags（可选，按需处理）

## 已完成的优化（2026-04-15）
- **frontmatter 规范化**（`scripts/normalize-frontmatter.py`，共修改 203 个文件）
  - 日期格式：213 个文件全部统一为 `YYYY-MM-DD HH:MM:SS`
  - keywords：234 个文件全部为 YAML 数组格式（0 个字符串，0 个缺失）

## 用户偏好
- 作者称呼：PFinal南丞
- 文章质量标准：最少 2000 字，多个代码示例，清晰结构
