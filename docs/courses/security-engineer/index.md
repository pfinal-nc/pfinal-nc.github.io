---
title: "安全工程师成长路线 - 完整课程大纲 | 2025"
description: "系统学习网络安全与工程安全，从 SSH 加固到 Web 应用防护，从 Go 安全开发到攻防研究，打造攻防一体的安全工程能力。"
keywords:
  - 安全工程师
  - 网络安全课程
  - Web 安全
  - 安全工程
  - SSH 加固
  - Go 安全开发
  - 渗透测试
  - 2025 安全课程
author: PFinal 南丞
category: 课程
tags:
  - course
  - security
  - cybersecurity
  - devsecops
  - penetration-testing
course:
  name: 安全工程师成长路线
  level: 入门→高级
  duration: 8-10 周
  lessons: 15
  status: building
  project: 安全加固实战、渗透测试报告
---

# 🛡️ 安全工程师成长路线

> 从防御加固到攻防研究，打造攻防一体的安全工程能力

<div class="course-info">

| 课程信息 | 说明 |
|----------|------|
| **难度** | 🟢 入门 → 🔴 高级 |
| **预计时长** | 8-10 周 |
| **课程模块** | 5 大核心模块 |
| **课时数量** | 15 课时 |
| **实战项目** | 安全加固实战、渗透测试报告 |
| **前置知识** | Linux 基础、网络基础、任意一门编程语言 |

</div>

---

## 🎯 课程目标

完成本课程后，你将能够：

- ✅ **服务器安全加固** - SSH、防火墙、入侵检测、蜜罐体系
- ✅ **Web 应用防护** - OWASP Top 10、输入验证、认证授权、XSS/SQL 注入防护
- ✅ **安全开发实践** - Go/PHP/Python安全编码、依赖管理、代码审计
- ✅ **攻防技术研究** - 渗透测试方法论、漏洞分析、WAF 绕过
- ✅ **应急响应能力** - 日志取证、溯源分析、安全事件处理

---

## 📚 课程大纲

### 🔹 模块 1：服务器安全基础（2 周）

<div class="module">

**目标：** 掌握 Linux 服务器安全加固的核心技能

| 课时 | 主题 | 内容 | 状态 |
|------|------|------|------|
| 1.1 | 安全基线 | 最小化安装、用户权限、文件权限 | 📝 |
| 1.2 | SSH 安全加固 | 密钥认证、失败限制、速率限制 | ✅ |
| 1.3 | 防火墙配置 | iptables、UFW、端口管理 | 📝 |
| 1.4 | 入侵检测 | fail2ban、日志监控、告警通知 | ✅ |
| 1.5 | 蜜罐技术 | 蜜罐部署、攻击者行为分析 | ✅ |
| 1.6 | 安全更新 | 自动更新、漏洞扫描、补丁管理 | 📝 |

**推荐文章：**
- [SSH Security Hardening Guide 2025 - 暴力破解防护完整方案](/security/engineering/SSH-Security-Hardening-Guide-2025.md)
  - 5 层防护体系
  - 失败密钥分析
  - 蜜罐部署
  - 一键脚本

**实战练习：**
- 配置 SSH 密钥认证，禁用密码登录
- 部署 fail2ban 防护暴力破解
- 搭建简易蜜罐捕获攻击者行为

</div>

---

### 🔹 模块 2：Web 应用安全（2-3 周）

<div class="module">

**目标：** 掌握 Web 应用常见漏洞与防护方案

| 课时 | 主题 | 内容 | 状态 |
|------|------|------|------|
| 2.1 | OWASP Top 10 | 十大安全风险详解 | 📝 |
| 2.2 | SQL 注入 | 原理、检测、防护（预编译、ORM） | 📝 |
| 2.3 | XSS 攻击 | 反射型、存储型、DOM 型 XSS 防护 | 📝 |
| 2.4 | CSRF 攻击 | 原理、Token 防护、SameSite Cookie | 📝 |
| 2.5 | 文件上传漏洞 | 类型校验、病毒扫描、隔离存储 | 📝 |
| 2.6 | 认证与授权 | JWT、OAuth2、RBAC、会话管理 | 📝 |
| 2.7 | 输入验证 | 白名单验证、数据清洗、参数化查询 | 📝 |
| 2.8 | 安全响应头 | CSP、HSTS、X-Frame-Options | 📝 |

**推荐文章：**
- [10 个 Golang 安全陷阱及真正有效的修复方案](/security/engineering/10 个 Golang 安全陷阱及真正有效的修复方案.md)
- [Golang Web 应用完整安全指南](/security/engineering/golang%20Web 应用完整安全指南.md)
- [MySQL Production Security Hardening Guide 2025](/dev/system/database/MySQL-Production-Security-Hardening-Guide-2025.md)
- [PostgreSQL Security Best Practices 2025](/dev/system/database/PostgreSQL-Security-Best-Practices-2025.md)

**漏洞防护速查表：**

```
┌─────────────────┬──────────────────┬─────────────────┐
│     漏洞类型     │     攻击方式      │     防护方案     │
├─────────────────┼──────────────────┼─────────────────┤
│ SQL 注入         │ 恶意 SQL 语句      │ 预编译、ORM      │
│ XSS             │ 恶意脚本注入      │ 转义、CSP        │
│ CSRF            │ 伪造请求          │ Token、SameSite  │
│ 文件上传         │ WebShell 上传     │ 类型校验、隔离    │
│ 越权访问         │ ID 遍历、水平越权  │ RBAC、权限校验    │
│ 暴力破解         │ 密码猜解          │ 限流、验证码      │
└─────────────────┴──────────────────┴─────────────────┘
```

</div>

---

### 🔹 模块 3：Go 安全开发实践（2 周）

<div class="module">

**目标：** 掌握 Go 语言安全编码规范与安全库使用

| 课时 | 主题 | 内容 | 状态 |
|------|------|------|------|
| 3.1 | Go 安全陷阱 | 10 大常见安全隐患与修复 | ✅ |
| 3.2 | 密码学基础 | 哈希、加密、签名、密钥管理 | ✅ |
| 3.3 | TLS/SSL实现 | HTTPS、证书管理、双向认证 | ✅ |
| 3.4 | 安全随机数 | crypto/rand vs math/rand | 📝 |
| 3.5 | 依赖安全 | 漏洞扫描、版本锁定、SBOM | 📝 |
| 3.6 | 安全库使用 | bcrypt、argon2、ed25519 | ✅ |
| 3.7 | 代码审计 | 静态分析、模糊测试、漏洞扫描 | 📝 |

**推荐文章：**
- [Golang 中的网络安全 TLS/SSL 的实现](/security/engineering/golang%20 中的网络安全 TLS%20SSL 的实现.md)
- [Go 语言主流安全库使用指南](/security/engineering/Go 语言主流安全库使用指南.md)

**Go 安全代码示例：**

```go
// ✅ 安全：使用 crypto/rand 生成随机数
import "crypto/rand"

func generateToken() (string, error) {
    bytes := make([]byte, 32)
    _, err := rand.Read(bytes)
    if err != nil {
        return "", err
    }
    return hex.EncodeToString(bytes), nil
}

// ✅ 安全：使用 bcrypt 哈希密码
import "golang.org/x/crypto/bcrypt"

func hashPassword(password string) (string, error) {
    hashed, err := bcrypt.GenerateFromPassword([]byte(password), 12)
    if err != nil {
        return "", err
    }
    return string(hashed), nil
}

func checkPassword(hashed, password string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hashed), []byte(password))
    return err == nil
}

// ✅ 安全：使用预编译语句防止 SQL 注入
db.Prepare("SELECT * FROM users WHERE email = ?")
```

</div>

---

### 🔹 模块 4：攻防研究（2-3 周）

<div class="module">

**目标：** 从攻击者视角理解系统弱点，更好地防御

| 课时 | 主题 | 内容 | 状态 |
|------|------|------|------|
| 4.1 | 渗透测试方法论 | 信息收集、漏洞扫描、利用、后渗透 | 📝 |
| 4.2 | 信息收集 | 域名枚举、端口扫描、指纹识别 | 📝 |
| 4.3 | 漏洞扫描 | Nmap、Nikto、Dirb、自动化扫描 | 📝 |
| 4.4 | Web 漏洞利用 | SQLMap、XSS 注入、文件包含 | 📝 |
| 4.5 | 内网渗透 | 域渗透、横向移动、权限维持 | 📝 |
| 4.6 | WAF 绕过 | 编码、分块、协议层绕过 | 📝 |
| 4.7 | 漏洞分析 | CVE 分析、PoC 编写、修复验证 | 📝 |

**实战环境：**
- DVWA (Damn Vulnerable Web Application)
- OWASP Juice Shop
- HackTheBox / TryHackMe

> ⚠️ **法律提示**：所有攻防技术仅限学习和授权测试使用，未经授权的渗透测试是违法行为。

</div>

---

### 🔹 模块 5：应急响应与安全运营（1-2 周）

<div class="module">

**目标：** 建立安全事件应急响应能力

| 课时 | 主题 | 内容 | 状态 |
|------|------|------|------|
| 5.1 | 应急响应流程 | 准备、检测、遏制、根除、恢复、总结 | 📝 |
| 5.2 | 日志取证 | 日志收集、分析、时间线重建 | 📝 |
| 5.3 | 入侵溯源 | IP 追踪、攻击者画像、威胁情报 | 📝 |
| 5.4 | 安全运营 | 安全监控、告警分级、值班流程 | 📝 |
| 5.5 | 合规与审计 | 等保 2.0、ISO27001、安全文档 | 📝 |

**应急响应检查清单：**

```
□ 1. 确认安全事件类型和范围
□ 2. 隔离受影响的系统
□ 3. 保存现场证据（日志、镜像）
□ 4. 分析攻击路径和漏洞原因
□ 5. 修复漏洞并验证
□ 6. 恢复系统和服务
□ 7. 编写事件报告
□ 8. 更新安全策略和监控规则
```

</div>

---

## 🛠️ 安全工具栈

```
安全工具链
├── 服务器加固
│   ├── fail2ban (入侵检测)
│   ├── UFW/iptables (防火墙)
│   └── OSSEC (HIDS)
├── 漏洞扫描
│   ├── Nmap (端口扫描)
│   ├── Nikto (Web 扫描)
│   ├── SQLMap (SQL 注入)
│   └── Gosec (Go 代码扫描)
├── 渗透测试
│   ├── Burp Suite (Web 代理)
│   ├── Metasploit (漏洞框架)
│   └── Hydra (暴力破解)
├── 监控响应
│   ├── Wazuh (SIEM)
│   ├── ELK Stack (日志分析)
│   └── Velociraptor (取证)
└── 开发安全
    ├── Snyk (依赖扫描)
    ├── Trivy (容器扫描)
    └── Semgrep (代码审计)
```

---

## 🏆 实战项目

### 项目 1：服务器安全加固

**目标：** 对一台 Linux 服务器进行完整安全加固

**检查清单：**
- [ ] SSH 密钥认证，禁用密码登录
- [ ] 配置 fail2ban 防护暴力破解
- [ ] 防火墙只开放必要端口
- [ ] 禁用不必要的服务
- [ ] 配置自动安全更新
- [ ] 部署日志监控和告警
- [ ] 配置审计日志（auditd）

---

### 项目 2：Web 应用安全审计

**目标：** 对一个 Go Web 应用进行安全审计

**审计内容：**
- [ ] SQL 注入风险检查
- [ ] XSS 漏洞检查
- [ ] 认证授权逻辑检查
- [ ] 文件上传安全检查
- [ ] 依赖漏洞扫描
- [ ] 安全配置检查
- [ ] 输出完整审计报告

---

### 项目 3：渗透测试实战

**目标：** 在合法环境中进行完整渗透测试

**测试流程：**
1. 信息收集（域名、IP、端口、服务）
2. 漏洞扫描（自动化 + 手动）
3. 漏洞利用（获取权限）
4. 权限提升（本地提权）
5. 横向移动（内网渗透）
6. 编写渗透测试报告

---

## 📖 学习资源

### 官方文档
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE 常见弱点](https://cwe.mitre.org/)
- [CVE 漏洞库](https://cve.mitre.org/)

### 实践平台
- [HackTheBox](https://www.hackthebox.com/)
- [TryHackMe](https://tryhackme.com/)
- [DVWA](https://github.com/digininja/DVWA)
- [OWASP Juice Shop](https://owasp.org/www-project-juice-shop/)

### 安全资讯
- [安全客](https://www.anquanke.com/)
- [FreeBuf](https://www.freebuf.com/)
- [Hacker News](https://thehackernews.com/)

---

## 🎓 学习建议

### 1️⃣ 合法合规
- 所有技术仅限学习和授权测试
- 不要对未授权系统进行测试
- 遵守当地法律法规

### 2️⃣ 攻防一体
- 既要学习防御加固
- 也要理解攻击手法
- 知己知彼，百战不殆

### 3️⃣ 实践为主
- 搭建实验环境
- 参与 CTF 比赛
- 在合法平台练习

### 4️⃣ 持续学习
- 安全领域更新快
- 关注最新漏洞动态
- 持续学习新技术

---

## 📊 课程进度

<div class="progress-tracker">

| 模块 | 进度 | 状态 |
|------|------|------|
| 模块 1：服务器安全基础 | 3/6 | 🚧 进行中 |
| 模块 2：Web 应用安全 | 0/8 | 📝 规划中 |
| 模块 3：Go 安全开发实践 | 4/7 | 🚧 进行中 |
| 模块 4：攻防研究 | 0/7 | 📝 规划中 |
| 模块 5：应急响应与安全运营 | 0/5 | 📝 规划中 |

**总体进度：** 7/33 (21%)

</div>

---

## 💡 常见问题

### Q: 安全工程师需要掌握编程吗？
**A:** 需要。自动化脚本、工具开发、代码审计都需要编程能力。建议掌握 Python 或 Go。

### Q: 如何入门网络安全？
**A:** 从基础开始：Linux → 网络 → Web 技术 → 安全基础 → 实践平台。

### Q: 渗透测试和安服有什么区别？
**A:** 渗透测试侧重攻击模拟，安服（安全服务）包括评估、加固、培训等更全面的服务。

### Q: 女生适合学安全吗？
**A:** 非常适合！安全领域需要多元化视角，细心、耐心、逻辑思维都是优势。

---

## 🤝 参与贡献

本课程正在建设中，欢迎参与：

- 📝 **编写课时**：认领任意未完成的课时
- 🐛 **报告问题**：发现错误或不清晰的地方
- 💡 **提出建议**：新的实战案例或工具推荐

[GitHub 仓库](https://github.com/pfinal-nc) | [联系作者](/contact)

---

> ⚠️ **法律免责声明**：本课程涉及的攻防技术仅限学习和授权的安全测试使用。未经授权的渗透测试是违法行为，后果自负。

[返回课程总览 →](/courses/)
