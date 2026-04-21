---
title: "Wails 生态巡礼：两款让我惊艳的桌面应用（GoNavi & TinyRDM）"
date: 2025-03-10 14:30:00
tags:
  - Wails
  - Go
  - 桌面应用
  - 工具推荐
description: 介绍两款基于 Wails 构建的优秀开源工具：GoNavi 多数据库管理工具和 TinyRDM Redis 桌面管理器，分享 Wails 框架的优势和生态发展。
author: PFinal南丞
keywords:
  - Wails
  - GoNavi
  - TinyRDM
  - 桌面应用开发
  - Go
  - WebView
  - Electron 替代品
  - Redis 客户端
  - 数据库工具
---

# Wails 生态巡礼：两款让我惊艳的桌面应用（GoNavi & TinyRDM）

> 作为 Wails 的忠实粉丝，今天想和大家分享两款让我眼前一亮的开源项目。

---

关注 Wails 框架已经有一段时间了，从一开始的"又一个 Electron 替代品"到现在的"桌面开发首选方案"，我的心态经历了一个完整的转变过程。

最近，我在 GitHub 上发现了两款基于 Wails 构建的优秀工具：

- **[GoNavi](https://github.com/Syngnat/GoNavi)** —— 现代化的多数据库管理工具
- **[TinyRDM](https://github.com/tiny-craft/tiny-rdm)** —— 轻量级 Redis 桌面管理器（12k+ stars）

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/20260309182440547.png)
![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/20260309182516572.png)


作为一个 Wails 的忠实支持者，看到这样的项目，我真的很兴奋。今天就想以**使用者和分享者**的身份，和大家聊聊这两个项目，以及我为什么看好 Wails 生态。

> ⚠️ **声明**：我不是这两个项目的开发者，只是一个被它们圈粉的 Wails 爱好者。

---

## 我为什么成为 Wails 的忠实支持者

在遇到 Wails 之前，我和很多人一样，认为桌面应用 = Electron。直到我开始关注**性能**和**用户体验**，才发现 Wails 的魅力所在。

### Wails 打动我的几个点

| 痛点 | Electron 方案 | Wails 方案 |
|------|--------------|-----------|
| **安装包体积** | 动辄 150MB+ | 通常 20-30MB |
| **内存占用** | 每个窗口一个 Chromium | 共享系统 WebView |
| **启动速度** | 2-3 秒 | 1 秒以内 |
| **后端能力** | Node.js | Go（原生性能 + 并发） |

**核心差异**：Wails 使用操作系统原生的 WebView，而不是捆绑整个 Chromium。这就是体积和内存优势的根本来源。

### 技术栈的优雅结合

```
┌─────────────────────────────────────┐
│         你的桌面应用                │
├─────────────────────────────────────┤
│  前端：React/Vue + TypeScript       │
│  （你熟悉的 Web 技术）               │
├─────────────────────────────────────┤
│  后端：Go                           │
│  （高性能、强类型、并发友好）        │
├─────────────────────────────────────┤
│  运行时：系统原生 WebView            │
│  （macOS: WebKit, Windows: Edge,   │
│   Linux: WebKitGTK）                │
└─────────────────────────────────────┘
```

这种设计让我可以用最熟悉的 Web 技术写 UI，同时享受 Go 带来的后端性能优势。

---

## 主角登场：两款 Wails 应用对比

在深入介绍之前，先来个快速对比：

| 维度 | GoNavi | TinyRDM |
|------|--------|---------|
| **定位** | 多数据库管理工具 | Redis 专用管理器 |
| **前端框架** | React 18 + Ant Design 5 | Vue 3 + Naive UI |
| **GitHub Stars** | 新兴项目 | 12.6k+ |
| **支持数据库** | 15+ 种（MySQL/PG/Redis 等） | Redis（全功能支持） |
| **特色功能** | 多数据库统一界面、SQL 编辑器 | Docker 部署、自定义编解码器 |
| **开源协议** | Apache 2.0 | GPL-3.0 |
| **共同点** | 🎯 Wails v2 + Go + Monaco Editor + 跨平台 |

这两个项目代表了 Wails 生态的两种典型应用：

- **GoNavi**：通用型数据库工具，追求**广度**和**统一体验**
- **TinyRDM**：垂直领域工具，追求**深度**和**专业性**

---

## GoNavi：多数据库管理的轻量之选

### 初印象

第一次在 GitHub 上看到 [GoNavi](https://github.com/Syngnat/GoNavi) 时，我被几个数据吸引了：

- 📦 **不到 2 个月发布 29 个版本** —— 开发节奏非常快
- 🌟 **Apache 2.0 开源协议** —— 对社区友好
- 🚀 **专注轻量高效** —— 明确的产品定位

### GoNavi 是什么？

用一句话概括：**GoNavi 是一个现代化的跨平台数据库管理工具**，专为开发者和 DBA 设计。

它的目标很明确：在保持功能丰富的同时，提供比 Electron 应用更轻量的体验。

### 技术栈

```yaml
后端:
  - Go 1.23+
  - Wails v2

前端:
  - React 18+ + TypeScript
  - Vite 5+
  - Ant Design 5
  - Zustand (状态管理)
  - Monaco Editor (SQL 编辑器)
```

### 核心功能（用户视角）

#### 1. 多数据库支持

这是我最看重的特性之一。GoNavi 支持 **15+ 种数据源**：

**内置驱动（开箱即用）**
- MySQL
- PostgreSQL
- Oracle
- Redis

**可选驱动（按需启用）**
- MariaDB, Doris, SQL Server, SQLite, DuckDB
- 达梦、人大金仓、高斯、Vastbase（国产数据库支持好评！）
- MongoDB, TDengine, ClickHouse, Sphinx

> 💡 **设计亮点**：常用驱动内置，其他驱动按需下载。这样既保证了核心体验，又控制了初始体积。

#### 2. 数据编辑体验

- ✅ 所见即所得的单元格编辑
- ✅ 批量操作 + 事务支持（可以回滚，安心）
- ✅ 大字段弹窗编辑
- ✅ 右键菜单快捷操作（设为 NULL、复制、导出）
- ✅ 导出格式丰富：CSV / XLSX / JSON / Markdown

#### 3. SQL 编辑器

基于 **Monaco Editor**（VS Code 同款）：
- 上下文感知的自动补全
- 多标签页工作流
- 语法高亮和错误提示

#### 4. 连接管理

- URI 生成与解析
- SSH 隧道支持
- 代理配置
- 连接配置导出为 JSON（方便团队共享）

#### 5. 性能优化

- **虚拟滚动**：处理大量数据不卡顿
- **DataGrid 优化**：列宽调整、批量编辑都流畅
- **低内存占用**：长时间使用不会吃掉所有内存

---

## TinyRDM：Redis 专用管理器的轻量标杆

### 第一印象

看到 [TinyRDM](https://github.com/tiny-craft/tiny-rdm) 的 **12.6k+ stars** 时，我就知道这个项目不简单。它是目前 GitHub 上最受欢迎的 Wails 应用之一。

### TinyRDM 是什么？

**TinyRDM**（Tiny Redis Desktop Manager）是一个现代化、轻量级的跨平台 Redis 桌面管理器。

它的特别之处在于：
- 提供 **桌面应用**（Mac/Windows/Linux）
- 提供 **Web 版本**（Docker 一键部署）
- 体积极小（~25MB vs Electron 的 150MB+）

### 技术栈

```yaml
后端:
  - Go
  - Wails v2

前端:
  - Vue 3
  - Naive UI
  - IconPark (图标)
  - Monaco Editor

部署:
  - 桌面应用（原生可执行文件）
  - Docker 容器（Web 版本）
```

### 核心功能（用户视角）

#### 1. 全面的 Redis 支持

- Standalone Redis
- Redis Cluster（集群模式）
- Redis Sentinel（哨兵模式）
- 所有 Redis 数据类型：Lists, Hashes, Strings, Sets, Sorted Sets, Streams

#### 2. 连接管理

- SSH Tunnel
- SSL/TLS
- HTTP Proxy / SOCKS5 Proxy
- 连接配置导入/导出

#### 3. 数据操作

- 可视化 CRUD 操作
- 多种数据查看格式（原始文本/UTF-8/十六进制）
- **SCAN 分段加载**（轻松处理百万级 Key）
- 自定义编解码器（支持特殊格式的数据）

#### 4. 开发者工具

- **Monaco Editor** 命令行模式
- 实时命令监控
- 慢查询日志
- 操作历史记录
- 导入/导出数据
- 发布/订阅支持

#### 5. 性能亮点

这是 TinyRDM 最让我印象深刻的地方：

| 对比项 | TinyRDM | RedisInsight (Electron) | Another Redis Desktop Manager |
|--------|---------|------------------------|------------------------------|
| **框架** | Wails | Electron | Electron |
| **体积** | ~25MB | ~150MB+ | ~100MB+ |
| **内存占用** | 低 | 高 | 中高 |
| **Web 版本** | ✅ (Docker) | ❌ | ❌ |

> 💡 **关键优势**：TinyRDM 是**唯一提供官方 Docker Web 版本**的 Redis GUI 客户端，这意味着你可以在服务器上部署，通过浏览器访问。

### Docker 部署（这个功能太实用了）

```bash
# 一行命令启动 Web 版 TinyRDM
docker run -d --name tinyrdm \
  -p 8086:8086 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=tinyrdm \
  -v ./data:/app/tinyrdm \
  ghcr.io/tiny-craft/tiny-rdm:latest

# 访问 http://localhost:8086
```

这个功能对于团队共享 Redis 管理权限非常有用。

---

## 两款工具的对比与选择建议

### 功能对比

| 需求场景 | 推荐工具 | 理由 |
|---------|---------|------|
| **多数据库管理** | GoNavi | 支持 15+ 种数据库，统一界面 |
| **Redis 专用** | TinyRDM | 功能更深、社区更成熟 |
| **需要 Web 部署** | TinyRDM | 唯一支持 Docker 部署 |
| **SQL 编辑需求** | GoNavi | Monaco Editor + 多标签页查询 |
| **国产数据库** | GoNavi | 支持达梦、人大金仓等 |
| **自定义编解码** | TinyRDM | 支持自定义值编码器 |

### 技术对比

| 维度 | GoNavi | TinyRDM |
|------|--------|---------|
| **前端偏好** | React 开发者 | Vue 开发者 |
| **UI 风格** | Ant Design 5（企业风） | Naive UI（清新风） |
| **社区规模** | 新兴项目（快速增长） | 成熟项目（12k+ stars） |
| **更新频率** | 高（2 个月 29 版本） | 稳定（定期更新） |
| **开源协议** | Apache 2.0（更宽松） | GPL-3.0 |

### 我的选择建议

**如果你需要：**
- 管理多种数据库（MySQL + PostgreSQL + Redis...）→ 选 **GoNavi**
- 专注 Redis，需要深度功能 → 选 **TinyRDM**
- 团队共享 Redis 管理权限 → 选 **TinyRDM**（Docker 部署）
- 需要连接国产数据库 → 选 **GoNavi**

**如果你像我一样：**
两个都装上！反正都不占地方（各 20-30MB）😄

---

## 快速开始指南

### 环境准备（两者通用）

```bash
# 需要安装
# - Go 1.21+
# - Node.js 18+ (TinyRDM 建议 20+)
# - Wails CLI

go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### 获取 GoNavi

```bash
# 克隆项目
git clone https://github.com/Syngnat/GoNavi.git
cd GoNavi

# 开发模式
wails dev

# 构建
wails build
```

**下载已编译版本**：[GoNavi Releases](https://github.com/Syngnat/GoNavi/releases)

### 获取 TinyRDM

```bash
# 克隆项目
git clone https://github.com/tiny-craft/tiny-rdm --depth=1
cd tiny-rdm

# 安装依赖
npm install --prefix ./frontend

# 开发模式
wails dev
```

**下载已编译版本**：[TinyRDM Releases](https://github.com/tiny-craft/tiny-rdm/releases)

**Docker 部署**：
```bash
docker run -d --name tinyrdm \
  -p 8086:8086 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=tinyrdm \
  ghcr.io/tiny-craft/tiny-rdm:latest
```

### 如果你想用 Wails 创建自己的项目

```bash
# 官方模板初始化
wails init -n myapp -t react
# 或
wails init -n myapp -t vue

# 生成的项目结构
myapp/
├── main.go           # Go 入口文件
├── wails.json        # Wails 配置
├── frontend/         # 前端代码（React/Vue 等）
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
└── ...
```

---

## 我为什么看好 Wails 生态

通过 GoNavi 和 TinyRDM 这两个项目，我看到了 Wails 生态的几个特点：

### 1. 技术选型决定产品体验

两个项目都选择 Wails，原因很明确：

| 需求 | Wails 优势 |
|------|-----------|
| 快速启动 | 原生 WebView，秒开 |
| 低内存占用 | 不捆绑 Chromium |
| 稳定后端连接 | Go 的并发和网络能力 |
| 灵活 UI | Web 技术栈 |

### 2. 开源生态正在成熟

- **GoNavi**：2 个月 29 个版本，快速响应社区反馈
- **TinyRDM**：12k+ stars，稳定的更新节奏
- **跨平台构建自动化**：GitHub Actions 自动构建多平台版本
- **多样化的开源协议**：Apache 2.0 / GPL-3.0，满足不同需求

### 3. 给开发者的启示

如果你正在考虑：

- 开发一个内部工具给团队用
- 做一个跨平台的桌面应用
- 对现有 Electron 应用的性能不满意
- 想用 Go + React/Vue 技术栈

那么 Wails + 这两个项目的实践值得参考。

---

## 适用场景建议（个人看法）

### ✅ 我推荐用 Wails 的场景

- 需要跨平台的桌面工具
- 对启动速度和内存占用敏感
- 团队熟悉 Go + Web 前端
- 需要后端高性能计算或并发处理
- 希望分发体积小（<50MB）

### ❌ 可能需要谨慎评估的场景

- 需要支持很老的操作系统（WebView 版本可能不够）
- 团队只熟悉纯 Web 技术，不愿意学 Go
- 需要高度定制 WebView 底层行为
- 应用完全不需要后端逻辑

---

## 总结：一个 Wails 爱好者的真心推荐

作为 Wails 的忠实支持者，看到 GoNavi 和 TinyRDM 这样的项目涌现，我真的很开心。它们证明了：

1. **Wails 不是玩具** —— 可以构建功能完整的生产级应用
2. **轻量不等于简陋** —— 两个项目功能都很丰富
3. **生态多样性** —— 通用工具（GoNavi）+ 垂直工具（TinyRDM）
4. **开源社区在成长** —— 快速迭代、跨平台支持、用户友好

**我的建议：**

| 你的需求 | 推荐 |
|---------|------|
| 想看看 Wails 能做什么 | 两个项目都看看 |
| 需要数据库管理工具 | GoNavi（多数据库）或 TinyRDM（Redis 专用） |
| 想学习 Wails 开发 | 两个项目的源码都值得参考 |
| 对 Wails 感兴趣 | 关注这两个项目的更新 |

---

## 相关链接

### 项目地址
- 🌐 [Wails 官方文档](https://wails.io/)
- 📦 [GoNavi GitHub](https://github.com/Syngnat/GoNavi)
- 📖 [GoNavi 中文文档](https://github.com/Syngnat/GoNavi/blob/dev/README.zh-CN.md)
- 🔴 [TinyRDM GitHub](https://github.com/tiny-craft/tiny-rdm)
- 🌍 [TinyRDM 官网](https://tinyrdm.com)

### 下载与文档
- 🚀 [Wails 入门教程](https://wails.io/docs/gettingstarted/installation)
- 📦 [GoNavi 下载](https://github.com/Syngnat/GoNavi/releases)
- 📦 [TinyRDM 下载](https://github.com/tiny-craft/tiny-rdm/releases)

---

**写在最后**：我不是这两个项目的开发者，只是一个被 Wails 圈粉、被它们惊艳的普通开发者。如果你也看好 Wails 生态，或者正在使用 GoNavi/TinyRDM，欢迎在评论区交流你的体验。

*本文基于公开资料整理，如有不准确之处欢迎指正。*

*最后更新：2026 年 3 月 9 日*
