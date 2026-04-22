---
title: "Linux 系统安全加固：构建安全的生产环境"
date: 2026-04-22
author: PFinal南丞
description: "全面讲解 Linux 系统安全加固的核心措施，包括用户管理、权限控制、网络安全、日志审计等内容，帮助构建安全的生产环境。"
keywords:
  - Linux
  - 安全加固
  - 系统安全
  - 生产环境
  - 安全基线
  - 安全运维
tags:
  - Linux
  - Security
  - Hardening
  - System
---

# Linux 系统安全加固：构建安全的生产环境

## 概述

Linux 系统安全加固是保护服务器免受攻击的关键措施。本文将从多个维度介绍如何构建安全的 Linux 生产环境。

## 1. 用户与权限管理

### 最小权限原则

```bash
# 创建普通用户（避免使用 root）
useradd -m -s /bin/bash deploy
passwd deploy

# 添加到 sudo 组
usermod -aG sudo deploy

# 限制 sudo 权限（推荐）
visudo
# 添加：deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx
```

### 密码策略

```bash
# 安装密码策略工具
apt-get install libpam-pwquality

# 配置密码复杂度（/etc/security/pwquality.conf）
cat > /etc/security/pwquality.conf << 'EOF'
minlen = 12
minclass = 3
maxrepeat = 2
dcredit = -1
ucredit = -1
ocredit = -1
lcredit = -1
EOF

# 配置密码过期策略（/etc/login.defs）
PASS_MAX_DAYS   90
PASS_MIN_DAYS   7
PASS_WARN_AGE   7
```

### 账户锁定

```bash
# 配置失败登录锁定（/etc/pam.d/common-auth）
auth required pam_tally2.so onerr=fail deny=5 unlock_time=900

# 查看锁定状态
pam_tally2 --user=username

# 解锁账户
pam_tally2 --user=username --reset
```

## 2. SSH 安全加固

### 基础配置

```bash
# 编辑 /etc/ssh/sshd_config

# 禁用 root 登录
PermitRootLogin no

# 禁用密码认证（使用密钥）
PasswordAuthentication no
PubkeyAuthentication yes

# 更改默认端口
Port 2222

# 限制用户
AllowUsers deploy admin

# 使用协议 2
Protocol 2

# 空闲超时
ClientAliveInterval 300
ClientAliveCountMax 2

# 限制认证尝试
MaxAuthTries 3

# 重启 SSH
systemctl restart sshd
```

### 密钥管理

```bash
# 生成强密钥
ssh-keygen -t ed25519 -a 100 -C "user@hostname"

# 或 RSA（至少 4096 位）
ssh-keygen -t rsa -b 4096 -C "user@hostname"

# 配置 authorized_keys
mkdir -p ~/.ssh
chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## 3. 网络安全

### 防火墙配置（iptables/nftables）

```bash
# 使用 ufw 简化配置
apt-get install ufw

# 默认策略
ufw default deny incoming
ufw default allow outgoing

# 允许 SSH（修改后的端口）
ufw allow 2222/tcp

# 允许 HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# 限制连接速率（防暴力破解）
ufw limit 2222/tcp

# 启用防火墙
ufw enable
```

### 使用 Fail2ban

```bash
# 安装
apt-get install fail2ban

# 配置（/etc/fail2ban/jail.local）
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = systemd

[sshd]
enabled = true
port = 2222
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
EOF

# 启动
systemctl enable fail2ban
systemctl start fail2ban

# 查看状态
fail2ban-client status
fail2ban-client status sshd
```

### TCP Wrappers

```bash
# 配置 /etc/hosts.allow
sshd: 10.0.0.0/24, 192.168.1.0/24

# 配置 /etc/hosts.deny
ALL: ALL
```

## 4. 文件系统安全

### 权限检查

```bash
# 查找 SUID/SGID 文件
find / -perm -4000 -type f 2>/dev/null
find / -perm -2000 -type f 2>/dev/null

# 查找无属主文件
find / -nouser -o -nogroup 2>/dev/null

# 查找全局可写文件
find / -type f -perm -002 2>/dev/null
```

### 挂载选项

```bash
# 编辑 /etc/fstab
# /tmp 目录加固
tmpfs /tmp tmpfs defaults,nosuid,nodev,noexec,mode=1777 0 0

# /home 目录加固
/dev/sda3 /home ext4 defaults,nosuid,nodev 0 2
```

### 文件完整性检查

```bash
# 安装 AIDE
apt-get install aide

# 初始化数据库
aideinit

# 定期检查
cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db
aide --check

# 更新数据库
aide --update
```

## 5. 内核安全

### Sysctl 配置

```bash
# 编辑 /etc/sysctl.conf 或 /etc/sysctl.d/99-security.conf

# 禁用 IP 源路由
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# 禁用 ICMP 重定向
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0

# 禁用 IPv6（如不需要）
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1

# 启用 SYN Cookie（防 SYN Flood）
net.ipv4.tcp_syncookies = 1

# 禁用 IPv4 转发（非路由器）
net.ipv4.ip_forward = 0

# 启用 ASLR
kernel.randomize_va_space = 2

# 限制核心转储
fs.suid_dumpable = 0

# 增加 PID 最大值
kernel.pid_max = 65536

# 应用配置
sysctl -p
```

### 禁用不必要的服务

```bash
# 查看运行中的服务
systemctl list-units --type=service --state=running

# 禁用不必要的服务
systemctl disable cups
systemctl disable bluetooth
systemctl disable avahi-daemon

# 使用 systemd 掩码彻底禁用
systemctl mask telnet
```

## 6. 日志与审计

### Rsyslog 配置

```bash
# 编辑 /etc/rsyslog.conf

# 启用远程日志（可选）
*.* @log-server:514

# 分离安全日志
auth,authpriv.* /var/log/security.log

# 重启
systemctl restart rsyslog
```

### Auditd 审计

```bash
# 安装
apt-get install auditd

# 配置规则（/etc/audit/rules.d/audit.rules）
# 监控密码文件
-w /etc/passwd -p wa -k identity
-w /etc/group -p wa -k identity

# 监控 SSH 配置
-w /etc/ssh/sshd_config -p wa -k ssh-config

# 监控 sudoers
-w /etc/sudoers -p wa -k sudoers
-w /etc/sudoers.d/ -p wa -k sudoers

# 监控命令执行
-a always,exit -F arch=b64 -S execve -k command-execution

# 重启
service auditd restart

# 查看日志
ausearch -k identity
ausearch -ts today -k ssh-config
```

### Logrotate 配置

```bash
# 编辑 /etc/logrotate.d/custom
/var/log/security.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0600 root root
}
```

## 7. 应用安全

### Web 服务器安全（Nginx）

```nginx
# 隐藏版本号
server_tokens off;

# 限制请求方法
if ($request_method !~ ^(GET|HEAD|POST)$) {
    return 444;
}

# 限制请求体大小
client_max_body_size 10m;

# 超时设置
client_body_timeout 12;
client_header_timeout 12;
keepalive_timeout 15;
send_timeout 10;

# 安全响应头
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self';" always;

# 限制连接数
limit_conn_zone $binary_remote_addr zone=addr:10m;
limit_conn addr 10;

# 限制请求速率
limit_req_zone $binary_remote_addr zone=one:10m rate=10r/s;
limit_req zone=one burst=20 nodelay;
```

### 数据库安全（MySQL/PostgreSQL）

```bash
# MySQL 安全初始化
mysql_secure_installation

# 删除匿名用户
DELETE FROM mysql.user WHERE User='';

# 删除远程 root 访问
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');

# 删除测试数据库
DROP DATABASE IF EXISTS test;

# 刷新权限
FLUSH PRIVILEGES;
```

## 8. 容器安全

### Docker 安全

```bash
# 使用非 root 用户运行容器
docker run --user 1000:1000 nginx

# 限制容器资源
docker run --memory=512m --cpus=1.0 nginx

# 禁用特权模式
docker run --security-opt=no-new-privileges nginx

# 只读文件系统
docker run --read-only --tmpfs /tmp:rw,noexec,nosuid,size=100m nginx

# 删除容器能力
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE nginx
```

### Docker Daemon 配置

```json
{
  "userns-remap": "default",
  "live-restore": true,
  "no-new-privileges": true,
  "selinux-enabled": true,
  "apparmor-default": "docker-default",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

## 9. 自动化加固脚本

```bash
#!/bin/bash
# security-hardening.sh

set -e

echo "=== Linux Security Hardening Script ==="

# 更新系统
echo "[1/10] Updating system..."
apt-get update && apt-get upgrade -y

# 安装安全工具
echo "[2/10] Installing security tools..."
apt-get install -y fail2ban aide auditd rsyslog ufw

# 配置 SSH
echo "[3/10] Configuring SSH..."
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# 配置防火墙
echo "[4/10] Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 2222/tcp
ufw --force enable

# 配置 sysctl
echo "[5/10] Configuring kernel parameters..."
cat >> /etc/sysctl.conf << 'EOF'
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.tcp_syncookies = 1
kernel.randomize_va_space = 2
EOF
sysctl -p

# 配置密码策略
echo "[6/10] Configuring password policy..."
apt-get install -y libpam-pwquality
sed -i 's/^PASS_MAX_DAYS.*/PASS_MAX_DAYS   90/' /etc/login.defs
sed -i 's/^PASS_MIN_DAYS.*/PASS_MIN_DAYS   7/' /etc/login.defs

# 初始化 AIDE
echo "[7/10] Initializing AIDE..."
aideinit || true
cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# 配置审计
echo "[8/10] Configuring audit rules..."
cat > /etc/audit/rules.d/audit.rules << 'EOF'
-w /etc/passwd -p wa -k identity
-w /etc/ssh/sshd_config -p wa -k ssh-config
-a always,exit -F arch=b64 -S execve -k command-execution
EOF
service auditd restart

# 禁用不必要的服务
echo "[9/10] Disabling unnecessary services..."
systemctl disable cups 2>/dev/null || true
systemctl disable bluetooth 2>/dev/null || true

# 设置文件权限
echo "[10/10] Setting file permissions..."
chmod 700 /root
chmod 600 /etc/shadow

echo "=== Hardening Complete ==="
echo "Please review the changes and reboot the system."
```

## 10. 安全检查清单

### 部署前检查

- [ ] 系统已更新到最新补丁
- [ ] 默认账户已禁用或修改
- [ ] SSH 已禁用 root 登录和密码认证
- [ ] 防火墙已启用并配置正确
- [ ] 不必要的服务已禁用
- [ ] 日志审计已启用
- [ ] 文件完整性检查已配置
- [ ] 备份策略已实施
- [ ] 监控告警已配置
- [ ] 应急响应计划已准备

### 定期维护

```bash
# 每日检查
aide --check

# 每周检查
# - 审查日志
# - 检查用户账户
# - 验证备份

# 每月检查
# - 更新系统
# - 审查权限
# - 安全扫描
```

## 总结

Linux 系统安全加固是一个持续的过程：

| 层面 | 关键措施 |
|------|---------|
| 身份认证 | 强密码、密钥认证、多因素认证 |
| 访问控制 | 最小权限、sudo 审计、账户锁定 |
| 网络安全 | 防火墙、Fail2ban、网络隔离 |
| 主机安全 | 补丁管理、服务最小化、内核加固 |
| 数据安全 | 加密、备份、完整性检查 |
| 审计监控 | 日志集中、行为审计、异常检测 |

**安全原则：**
1. 最小权限原则
2. 纵深防御
3. 安全默认配置
4. 持续监控
5. 及时响应

---

**相关文章推荐：**
- [SSH 安全加固指南 2025](/security/engineering/SSH-Security-Hardening-Guide-2025) - SSH 专项加固
- [蜜罐部署实战](/security/engineering/honeypot-deployment) - 主动防御
- [Web 安全三大漏洞攻防实战](/security/engineering/sql-injection-xss-csrf) - 应用安全
