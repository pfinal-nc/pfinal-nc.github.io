---
title: "PFinalClub - 后端开发 + DevOps + AI 工程实践技术博客"
description: "PFinalClub：以后端 + DevOps + AI 工程实践为核心的小众高质量技术博客。涵盖 Golang、PHP、Python 后端开发、容器化部署、CI/CD、RAG 系统、可观测性、AI 工程化等实战教程。"
keywords:
  - 后端开发
  - DevOps
  - AI 工程实践
  - golang 教程
  - php 开发
  - python 爬虫
  - 容器化部署
  - CI/CD
  - 微服务架构
  - 技术博客
  - 工程实践
layout: home
blog:
 title: 'PFianlClub'
 logo: /logo.png
 author: PFinal南丞
 name: 'PFianlClub'
 motto: 后端+DevOps+AI工程实践的小众高质量博客
 inspiring:
  - 千万不要因为走得太久，而忘记了我们为什么出发
  - 人生就像一场修行，你不可能一开始就修成正果
  - 无论多么沉重的负担，也不要忘记微笑；无论多么漫长的路程，也不要忘记坚持
  - 生活的真谛不在繁华，而在于淡泊
 inspiringTimeout: 3000
 pageSize: 15
 minScreenAvatar: true
---

<div class="home-nav-section">

## 🚀 快速导航

<div class="nav-grid">
  <a href="/security/offensive/" class="nav-card">
    <span class="nav-icon">🔐</span>
    <span class="nav-title">攻防研究</span>
    <span class="nav-desc">Web安全 · 渗透测试</span>
  </a>
  <a href="/security/engineering/" class="nav-card">
    <span class="nav-icon">🛡️</span>
    <span class="nav-title">安全工程</span>
    <span class="nav-desc">WAF · 安全基建</span>
  </a>
  <a href="/dev/" class="nav-card">
    <span class="nav-icon">💻</span>
    <span class="nav-title">开发与系统</span>
    <span class="nav-desc">Go · PHP · Python</span>
  </a>
  <a href="/data/automation/" class="nav-card">
    <span class="nav-icon">🤖</span>
    <span class="nav-title">数据与自动化</span>
    <span class="nav-desc">爬虫 · AI工程</span>
  </a>
  <a href="/indie/" class="nav-card">
    <span class="nav-icon">🚀</span>
    <span class="nav-title">独立开发</span>
    <span class="nav-desc">产品 · 技术创业</span>
  </a>
  <a href="/thinking/method/" class="nav-card">
    <span class="nav-icon">💡</span>
    <span class="nav-title">思考/方法论</span>
    <span class="nav-desc">架构 · 技术哲学</span>
  </a>
</div>

</div>

<div class="home-tools-section">

## 🛠️ 在线工具

<div class="tools-grid">
  <a href="https://pwd.friday-go.icu/" class="tool-card" target="_blank">
    <span class="tool-icon">🔑</span>
    <span class="tool-name">密码生成器</span>
  </a>
  <a href="https://nav.friday-go.icu/" class="tool-card" target="_blank">
    <span class="tool-icon">🌟</span>
    <span class="tool-name">AI工具导航</span>
  </a>
  <a href="https://pnav.friday-go.icu/" class="tool-card" target="_blank">
    <span class="tool-icon">📝</span>
    <span class="tool-name">Prompts导航</span>
  </a>
  <a href="https://miao.friday-go.icu/" class="tool-card" target="_blank">
    <span class="tool-icon">📆</span>
    <span class="tool-name">营销日历</span>
  </a>
  <a href="https://game.friday-go.icu/" class="tool-card" target="_blank">
    <span class="tool-icon">🎮</span>
    <span class="tool-name">在线游戏</span>
  </a>
  <a href="https://bmicalculator.friday-go.icu/" class="tool-card" target="_blank">
    <span class="tool-icon">📊</span>
    <span class="tool-name">BMI计算器</span>
  </a>
  <a href="https://card.friday-go.icu/" class="tool-card" target="_blank">
    <span class="tool-icon">✒️</span>
    <span class="tool-name">淬墨台</span>
  </a>
</div>

<div class="tools-more">
  <a href="/Tools/online-tools">查看全部工具 →</a>
</div>

</div>

<style>
.home-nav-section,
.home-tools-section {
  margin: 2rem 0;
  padding: 1.5rem;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
}

.home-nav-section h2,
.home-tools-section h2 {
  margin-top: 0 !important;
  margin-bottom: 1rem !important;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--vp-c-brand);
  font-size: 1.25rem !important;
}

.nav-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.nav-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: var(--vp-c-bg);
  border-radius: 8px;
  text-decoration: none !important;
  transition: all 0.3s ease;
  border: 1px solid var(--vp-c-divider);
}

.nav-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--vp-c-brand);
}

.nav-icon {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.nav-title {
  font-weight: 600;
  color: var(--vp-c-text-1);
  font-size: 0.95rem;
}

.nav-desc {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  margin-top: 0.25rem;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.75rem;
}

.tool-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 0.5rem;
  background: var(--vp-c-bg);
  border-radius: 8px;
  text-decoration: none !important;
  transition: all 0.3s ease;
  border: 1px solid var(--vp-c-divider);
}

.tool-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: var(--vp-c-brand);
}

.tool-icon {
  font-size: 1.25rem;
  margin-bottom: 0.25rem;
}

.tool-name {
  font-size: 0.75rem;
  color: var(--vp-c-text-1);
  text-align: center;
  white-space: nowrap;
}

.tools-more {
  text-align: center;
  margin-top: 1rem;
}

.tools-more a {
  color: var(--vp-c-brand);
  font-size: 0.875rem;
  text-decoration: none;
}

.tools-more a:hover {
  text-decoration: underline;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .nav-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .tools-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 480px) {
  .nav-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }
  
  .tools-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .nav-card,
  .tool-card {
    padding: 0.75rem 0.5rem;
  }
  
  .nav-icon {
    font-size: 1.25rem;
  }
  
  .nav-title {
    font-size: 0.85rem;
  }
  
  .nav-desc {
    font-size: 0.7rem;
  }
}
</style>
