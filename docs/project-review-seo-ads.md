# 项目阅读报告：博客与 SEO / 广告 / 代码整理

> 基于当前 VitePress 博客（friday-go.icu）的阅读与梳理，针对「访问量、AI 搜索」「废代码整理」「Google AdSense 申请」三个方向给出结论与可执行建议。  
> 本文档仅作内部参考，不参与站点导航与构建。

---

## 一、访问量不多 & AI 搜索需要更新

### 1.1 当前做得好的地方

- **结构化数据**：站点级已有 `WebSite`、`Organization`、`Blog`；文章页有 `TechArticle`；主题中心页有 `CollectionPage`；工具页有 `ItemList`。对 Google 和 AI 摘要都很重要。
- **Canonical**：`transformPageData` 里按页动态写入 canonical，有利于集中权重、减少重复。
- **多 feed**：RSS / Atom / JSON Feed 已配置，有利于抓取与 AI 引用。
- **Sitemap**：有过滤逻辑，排除 404、子站、旧路径，并设置 `changefreq`/`priority`。
- **多搜索引擎验证**：Google / 360 / Yandex 的 site verification 已配置。
- **Clean URLs**：`cleanUrls: true`，无 `.html` 后缀，对 SEO 友好。

### 1.2 AI 搜索 / 抓取可加强的点

1. **文章级结构化数据再补强（推荐）**
   - 在 `config.mts` 的 `transformPageData` 里，对文章页的 `TechArticle` 可考虑：
     - 若有正文摘要：增加 `articleBody` 或短摘要，便于 AI 总结。
     - 若有清晰章节：可增加 `speakable` 或 `mainEntity` 的 Section 列表（按需，不强制）。
   - 保持 `datePublished` / `dateModified` 准确（你已用 frontmatter + lastUpdated），有利于「新鲜度」与 AI 引用时间。

2. **FAQ / HowTo Schema（可选）**
   - 教程类文章可针对「常见问题」或「步骤」增加 `FAQPage` / `HowTo` 的 JSON-LD，能提升在 AI 回答中的引用概率。可在部分重点文章 frontmatter 或自定义组件里按需注入。

3. **robots.txt 与真实 URL 一致**
   - 你已启用 `cleanUrls`，线上若不再提供 `.html` 地址，`Disallow: /*.html$` 是合理的；若仍有历史 `.html` 跳转，保留该规则可避免重复索引。

4. **内容与关键词**
   - 保持每篇的 `description`、`keywords`（含长尾）与正文一致，有利于传统 SEO 和 AI 理解主题。你已有 `find-missing-seo.mjs`、`seo-content-analyzer.mjs` 等脚本，可定期跑一遍查缺补漏。

5. **性能与可抓取性**
   - 首屏尽量少依赖第三方脚本；广告相关错误静默处理（你已在做）有助于控制控制台噪音，对「可访问性」和爬虫体验也有帮助。

**小结**：基础 SEO 和 AI 友好度已经不错；优先做「文章结构化数据补强 + 重点文章 FAQ/HowTo」，再配合定期 SEO 脚本检查即可。

---

## 二、项目中的废代码与整理建议

### 2.1 已确认可删或可合并

| 类型 | 位置 | 说明 |
|------|------|------|
| 空文件 | `docs/public/js/ad.js` | 无内容、无引用，可删除。 |
| 重复逻辑 | `config.mts` 内约 126~284 行 | 与 `client.js` 中 `window.onerror` / `unhandledrejection` / `console.error|warn` 的静默处理高度重复，建议只保留一处（推荐保留在 `client.js`，config 仅保留 Ezoic/Monetag 等必要 head 脚本）。 |
| 注释块 | `config.mts` 约 399~419 行 | 大段已注释的 performance.measure、Monetag 延迟脚本等，可删除以减少噪音。 |

### 2.2 脚本（scripts）用途与是否保留

- **构建/部署链在用**：`fix-preload.js`、`process-sitemap.mjs`、`copy-redirects.mjs`、`generate-rss.mjs`、`create-clean-url-redirects.mjs` → 保留。
- **package.json 已挂脚本**：`check-titles.mjs`、`fix:titles`、`report:golang-gap`、`validate:seo`、`generate:rss` → 保留。
- **未在 package.json 或 CI 中引用**：`analyze-titles.mjs`、`blog-seo-analysis.mjs`、`find-missing-seo.mjs`、`seo-content-analyzer.mjs`、`seo-keyword-analyzer.mjs`、`optimize-titles.mjs`、`add-recommend-to-backend-articles.mjs` 等 → 若长期不用可归档或删；若偶尔做 SEO 分析，可保留并加一条 `"analyze:seo": "node scripts/blog-seo-analysis.mjs"` 之类的脚本方便调用。

### 2.3 广告相关

- **Ezoic + Monetag**：当前 ArticleAds 使用 Ezoic 为主、Monetag 备用，配置在 `ad-config.ts`，结构清晰。
- **config.mts head**：同时挂了 Ezoic 脚本、Gatekeeper 同意脚本、Google AdSense 脚本、以及一大段内联的「错误静默」脚本；与 `client.js` 重复部分可合并到 client，head 只保留必要第三方脚本与初始化。

**小结**：先删 `docs/public/js/ad.js`、删 config 中重复/注释块，再视需要合并错误处理到 `client.js`，脚本按「常用 / 偶尔用」决定保留或归档。

---

## 三、Google AdSense 申请不过去

### 3.1 常见原因与对应检查

- **内容与质量**
  - 要求：原创、对用户有价值、非纯采集。你的站点是原创技术博客，方向没问题。
  - 建议：确保关于页、联系页、隐私政策页完整且可访问（你已有 `/about`、`/contact`、`/privacy-policy`）；首页和列表页有清晰导航与介绍。

- **内容数量与更新**
  - 没有硬性篇数，但「过少」或「长期不更新」容易被拒。你已有较多文章且近期有更新，保持定期更新即可。

- **导航与用户体验**
  - 顶部/底部导航清晰、移动端可读、无大面积遮挡或误导点击。你已用主题 + 自定义布局，注意广告位不要遮挡主要内容或造成误点。

- **政策合规**
  - 成人、暴力、侵权、违禁品、误导性内容等一律不能有。技术博客一般不涉及，但需确保没有「诱导点击广告」的文案或样式。
  - 隐私政策需明确说明使用 Cookie/广告/第三方服务（你已有 Cookie 同意与隐私页，可再核对是否提到 AdSense/数据收集）。

- **域名与身份**
  - 使用自有域名、网站信息真实。friday-go.icu 已绑定，保持 whois/关于页信息一致。
  - 若曾用其他域名或子域名申请过并被拒，用当前主站再申请时，确保该主站内容最完整、最规范。

- **技术问题**
  - 申请前确保站点可被正常访问、无大量 404、无「建设中」的占位页。你已有 404 重定向和 sitemap，保持即可。
  - ads.txt：根目录可访问且包含 Google 发布商 ID。你已有 `docs/public/ads.txt`（`google.com, pub-2154665617309406, DIRECT, f08c47fec0942fa0`），部署后需能通过 `https://friday-go.icu/ads.txt` 访问。

### 3.2 申请前后可做的几件事

1. **在申请前暂时拿掉或明显弱化第三方广告**
   - 若当前 Ezoic/Monetag 已上线，部分审核员可能认为「已与其他广告网络合作」而更严格。若你希望优先过 AdSense，可暂时关闭 Ezoic/Monetag 展示，只保留 AdSense 代码（或仅保留申请用单元），过审后再逐步恢复其他广告。

2. **确保 AdSense 代码已正确放置且无报错**
   - 你已在 head 中放入 `adsbygoogle.js` 和 client id；若页面上有自动广告或广告单元，确保没有因 CSP/脚本顺序导致的报错（你已有错误静默，但不要影响 AdSense 脚本本身执行）。

3. **隐私与 Cookie 说明**
   - 在隐私政策中明确写清：使用 Google AdSense、可能收集 Cookie 与设备信息、用于个性化广告等，并指向 Google 政策链接。

4. **被拒后的操作**
   - 根据邮件中的拒绝理由逐条改（内容不足、导航不清晰、政策问题等），改完后在 AdSense 后台用「请求审核」再次提交，不要频繁重复提交未做修改的站点。

**小结**：你站内容与结构具备过审基础；重点核对隐私政策、ads.txt 可访问性、以及是否暂时弱化其他广告以突出主站与 AdSense；被拒后按邮件理由针对性改进再申请。

---

## 四、建议执行顺序（简要）

1. **立刻可做**：删除 `docs/public/js/ad.js`；删除 `config.mts` 中已注释的大段代码（约 399~419 行）；视需要将 config 中与 `client.js` 重复的错误静默逻辑移除或改为「仅 client.js 处理」。
2. **短期**：在文章页结构化数据中补强描述/摘要；在 1–2 篇重点教程中试点 FAQ/HowTo Schema；检查 `https://friday-go.icu/ads.txt` 与隐私政策文案。
3. **中期**：若 AdSense 仍未过审，临时关闭或弱化 Ezoic/Monetag 后再申请一次；定期跑 `validate:seo`、`find-missing-seo` 等脚本，保持标题与描述质量。
4. **脚本**：不用的分析类脚本可归档到 `scripts/archive/` 或从仓库移除；常用的在 `package.json` 里留一条命令方便使用。

以上为本次阅读与建议，可按优先级分批落地。
