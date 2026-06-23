/**
 * CTR 优化脚本 — 批量优化 title + description
 * 2026-06-23 第 2 批（10 篇）
 */

import { readFileSync, writeFileSync } from 'fs';

const optimizations = [
  {
    file: 'docs/dev/backend/golang/go-channel-guide.md',
    old_title: '"Go 通道（Channel）详解"',
    new_title: '"Go Channel 通道详解 2026：从基础到高级的 15 个并发模式实战"',
    old_desc: '"深入讲解 Go 语言通道（Channel）的概念、使用方法和高级技巧，帮助你掌握 Go 并发编程的核心机制。"',
    new_desc: '"Go Channel 通道完全指南 2026：涵盖无缓冲/有缓冲/Select/超时控制等 15 种并发模式，附带可运行代码示例和性能对比，从入门到 goroutine 泄漏排查全覆盖。"',
  },
  {
    file: 'docs/dev/backend/golang/go-jwt-auth.md',
    old_title: '"Go JWT 认证与授权实战"',
    new_title: '"Go JWT 认证与授权实战 2026：Token 生成 + RBAC 权限 + 刷新机制全解析"',
    old_desc: '"深入学习 Go 语言 JWT 认证实现，掌握 Token 生成、验证、刷新机制，以及 RBAC 权限控制，构建安全的 API 认证系统。"',
    new_desc: '"Go JWT 认证完整实战 2026：Access Token + Refresh Token 双 Token 机制、HMAC/RSA 签名选择、RBAC 角色权限模型、黑名单与主动失效策略，附带 gin + jwt-go 可运行代码。"',
  },
  {
    file: 'docs/dev/backend/golang/go-memory-management-gc.md',
    old_title: '"Go 内存管理与垃圾回收：深入理解 GC 机制"',
    new_title: '"Go 内存管理与 GC 垃圾回收深度解析 2026：逃逸分析 + 三色标记 + 调优实战"',
    old_desc: '"深入讲解 Go 语言的内存管理机制和垃圾回收器（GC）的工作原理，包括内存分配、GC 算法、调优技巧等内容。"',
    new_desc: '"Go GC 机制深度拆解 2026：栈 vs 堆分配策略、逃逸分析实战、三色标记+混合写屏障原理、GOGC 调优与内存泄漏排查，附带 pprof 性能分析案例。"',
  },
  {
    file: 'docs/security/engineering/honeypot-deployment.md',
    old_title: '"蜜罐部署实战：构建主动防御体系"',
    new_title: '"蜜罐部署实战 2026：SSH + Web + 数据库蜜罐搭建与主动防御体系构建"',
    old_desc: '"深入讲解蜜罐技术原理、分类、部署方案与实战，包含 SSH 蜜罐、Web 蜜罐、数据库蜜罐的搭建与联动防御"',
    new_desc: '"蜜罐技术全栈实战 2026：Cowrie SSH 蜜罐、Glastopf Web 蜜罐、ElasticHoney 数据库蜜罐从零搭建，结合 ELK 日志分析 + 威胁情报联动，构建主动欺骗防御体系。附带 Docker Compose 一键部署方案。"',
  },
  {
    file: 'docs/security/offensive/penetration-testing-methodology.md',
    old_title: '"渗透测试方法论"',
    new_title: '"渗透测试方法论完整指南 2026：信息收集 → 漏洞扫描 → 提权 → 后渗透全流程"',
    old_desc: '"系统学习渗透测试方法论，掌握信息收集、漏洞扫描、权限提升、后渗透等核心阶段的技术和工具，建立规范的渗透测试流程。"',
    new_desc: '"渗透测试 6 阶段完整方法论 2026：PTES 标准详解、信息收集（被动+主动）、漏洞扫描（Nessus/OpenVAS）、权限提升（Linux/Windows）、横向移动与持久化、报告撰写规范。附 Kali Linux 工具链实战。"',
  },
  {
    file: 'docs/dev/backend/golang/Go-Channel-Batch-Read.md',
    old_title: '"深入理解 Go Channel 批量读取与实际应用"',
    new_title: '"Go Channel 批量读取进阶 2026：扇入扇出 + Worker Pool + 背压控制实战"',
    old_desc: '"详细讲解 Go Channel 批量读取技术，包括性能优化、实际应用场景和最佳实践，帮助你掌握高效的数据处理模式。"',
    new_desc: '"Go Channel 批量读取高级实战 2026：扇入扇出模式、动态 Worker Pool、背压控制与限流、批量超时处理，配合 benchmark 性能对比和 goroutine 泄漏排查技巧。"',
  },
  {
    file: 'docs/thinking/method/GitOps实战-从应用部署到全生命周期管理.md',
    old_title: '"GitOps实战：从应用部署到全生命周期管理"',
    new_title: '"GitOps 生产实战 2026：ArgoCD + Kustomize 从 Jenkins 迁移到全生命周期管理"',
    old_desc: '"记录我们团队从Jenkins迁移到GitOps的完整过程，分享ArgoCD生产环境配置、踩坑经验，以及多集群管理的实践方案。不是理论教程，是实打实的经验总结。"',
    new_desc: '"GitOps 生产级实战 2026：Jenkins → ArgoCD 迁移全记录，涵盖 Kustomize 环境分层、多集群 ApplicationSet、Sealed Secrets 密钥管理、PR 预览环境、回滚策略。真实踩坑经验总结，非理论教程。"',
  },
  {
    file: 'docs/dev/backend/python/python-automation-scripts.md',
    old_title: 'Python 自动化脚本实战：从数据处理到任务调度',
    new_title: '"Python 自动化脚本实战 2026：10 个场景从文件处理到定时任务调度"',
    old_desc: '全面讲解 Python 自动化脚本开发，涵盖文件处理、数据清洗、HTTP 请求、任务调度、日志管理等实战场景。',
    new_desc: '"Python 自动化脚本 10 大实战场景 2026：批量文件重命名、CSV/JSON 数据清洗、requests 爬虫、crontab/APScheduler 定时调度、logging 日志系统、Click 命令行工具。每个场景附带可运行代码和常见坑点。"',
  },
  {
    file: 'docs/security/engineering/linux-security-hardening.md',
    old_title: '"Linux 系统安全加固：构建安全的生产环境"',
    new_title: '"Linux 安全加固实战 2026：12 项生产级硬核配置从 SSH 到审计日志"',
    old_desc: '"全面讲解 Linux 系统安全加固的核心措施，包括用户管理、权限控制、网络安全、日志审计等内容，帮助构建安全的生产环境。"',
    new_desc: '"Linux 服务器安全加固 12 项必做清单 2026：SSH 密钥认证+Fail2Ban、sudo 权限最小化、firewalld/iptables 规则、SELinux/AppArmor、auditd 审计日志、自动安全更新、内核参数调优。附 CIS Benchmark 对照检查表。"',
  },
  {
    file: 'docs/dev/backend/python/Python版本管理神器之pyenv.md',
    old_title: '"pyenv - Python 版本管理指南"',
    new_title: '"pyenv 完全指南 2026：Python 多版本管理 + 虚拟环境 + 项目级自动切换"',
    old_desc: '详细介绍pyenv这款强大的Python版本管理工具，包括安装配置、版本切换、虚拟环境管理等核心功能，帮助开发者轻松管理多个Python版本。',
    new_desc: '"pyenv 从入门到精通 2026：macOS/Linux 安装避坑、Python 版本编译安装、global/local/shell 三级切换、pyenv-virtualenv 虚拟环境管理、.python-version 项目级自动切换、与 Poetry/pipenv 配合使用。附常见错误排查。"',
  },
];

let changed = 0;

for (const opt of optimizations) {
  let content = readFileSync(opt.file, 'utf-8');
  let modified = false;

  if (content.includes(opt.old_title)) {
    content = content.replace(opt.old_title, opt.new_title);
    modified = true;
  } else {
    console.warn(`[WARN] Title not found in ${opt.file}`);
    console.warn(`  Expected: ${opt.old_title}`);
  }

  if (content.includes(opt.old_desc)) {
    content = content.replace(opt.old_desc, opt.new_desc);
    modified = true;
  } else {
    console.warn(`[WARN] Description not found in ${opt.file}`);
    console.warn(`  Expected: ${opt.old_desc.substring(0, 60)}...`);
  }

  if (modified) {
    writeFileSync(opt.file, content, 'utf-8');
    console.log(`[OK] ${opt.file}`);
    changed++;
  }
}

console.log(`\nDone. ${changed} files updated.`);
