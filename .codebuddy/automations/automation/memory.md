# 验证广告生效 - 自动化记忆

## 2026-04-17 10:27 执行

### 任务
访问 friday-go.icu 首页和文章页，验证 Monetag 广告是否正常显示。

### 结果概要
**部分生效，文章页广告组件未渲染。**

### 详细发现

**✅ 已生效的广告（两个页面均有）：**
1. Google AdSense 脚本加载成功（`adsbygoogle.js`）
2. Monetag 全局广告 tag 加载成功（`al5sm.com/tag.min.js`, Zone 9182859）— 来自 client.js

**❌ 未生效的广告：**
1. ArticleAds 组件未被任何布局/页面引用 → 文章中间和底部无广告容器
2. MonetagAd 组件（nap5k.com 域名）未在页面中出现
3. 头部/侧边栏无广告容器

**根本原因：**
- `ArticleAds.vue` 和 `MonetagAd.vue` 虽然存在于源码中，但没有被集成到任何布局或全局组件中
- `index.ts` 只注册了 `CookieConsent` 全局组件
- `client.js` 中的广告只有 `al5sm.com/tag.min.js`（全局 tag）和 AdSense
- 源码修改时间（ad-config.ts: 4月17日, client.js: 4月17日）晚于构建产物（3月9日），说明代码修改后未重新构建部署
