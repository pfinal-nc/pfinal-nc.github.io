---
title: "SSH 安全加固完全指南 - 服务器防护与 fail2ban 实战"
description: "全面的 SSH 安全加固指南，涵盖基础配置优化、密钥认证、fail2ban 自动防护、双因素认证等实战方案，帮助构建企业级服务器安全防护体系"
date: 2026-04-15 13:30:00
author: PFinal南丞
tags:
  - SSH
  - 安全加固
  - 服务器安全
  - fail2ban
  - Linux
  - 运维
keywords:
  - SSH 安全加固
  - fail2ban 配置
  - SSH 密钥认证
  - 服务器防护
  - 暴力破解防护
  - SSH 端口安全
  - 双因素认证
  - Linux 安全
---

# SSH 安全加固完全指南

> 从基础配置到企业级防护，构建完整的 SSH 安全体系

SSH（Secure Shell）是服务器远程管理的核心协议，也是攻击者的首要目标。据统计，互联网上每秒都有数千次 SSH 暴力破解尝试。本文将从**基础加固**、**自动防护**、**高级认证**三个层面，提供完整的 SSH 安全加固方案。

---

## 一、基础配置加固

### 1.1 修改默认端口

默认 22 端口是扫描器的首要目标，修改端口可减少 90% 以上的自动化攻击。

```bash
# 编辑 SSH 配置文件
sudo vim /etc/ssh/sshd_config

# 修改端口（建议选择 10000-65535 之间的高位端口）
Port 22222

# 重启 SSH 服务
sudo systemctl restart sshd
```

⚠️ **注意**：修改端口前确保防火墙已放行新端口，避免将自己锁在服务器外。

```bash
# 防火墙配置示例（UFW）
sudo ufw allow 22222/tcp
sudo ufw delete allow 22/tcp
```

### 1.2 禁用 Root 直接登录

Root 账户是攻击者的重点目标，应禁止使用密码直接登录。

```bash
# /etc/ssh/sshd_config
PermitRootLogin no

# 或仅允许密钥登录（更严格）
PermitRootLogin prohibit-password
```

### 1.3 启用密钥认证，禁用密码登录

密钥认证比密码安全得多，建议生产环境完全禁用密码登录。

**客户端生成密钥对：**

```bash
# 生成 ED25519 密钥（推荐，更安全）
ssh-keygen -t ed25519 -C "your_email@example.com"

# 或生成 RSA 密钥（兼容性更好）
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 密钥保存位置（默认）
~/.ssh/id_ed25519      # 私钥
~/.ssh/id_ed25519.pub  # 公钥
```

**上传公钥到服务器：**

```bash
# 使用 ssh-copy-id（推荐）
ssh-copy-id -p 22222 user@server_ip

# 或手动复制
ssh -p 22222 user@server_ip "mkdir -p ~/.ssh && chmod 700 ~/.ssh"
cat ~/.ssh/id_ed25519.pub | ssh -p 22222 user@server_ip "cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

**服务器端禁用密码登录：**

```bash
# /etc/ssh/sshd_config
PasswordAuthentication no
PubkeyAuthentication yes

# 重启服务
sudo systemctl restart sshd
```

### 1.4 限制登录用户

明确允许登录的用户，减少攻击面。

```bash
# /etc/ssh/sshd_config

# 仅允许特定用户
AllowUsers deploy admin

# 或允许特定用户组
AllowGroups ssh-users

# 禁止特定用户
DenyUsers guest test
```

### 1.5 空闲连接管理

防止空闲连接被劫持，自动断开长时间无操作的会话。

```bash
# /etc/ssh/sshd_config

# 客户端每 60 秒发送心跳包
ClientAliveInterval 60

# 连续 3 次无响应则断开
ClientAliveCountMax 3

# 总空闲时间 = 60 * 3 = 180 秒
```

### 1.6 基础加固完整配置

```bash
# /etc/ssh/sshd_config

# 网络配置
Port 22222
AddressFamily inet          # 仅 IPv4，如需 IPv6 改为 any
ListenAddress 0.0.0.0

# 认证配置
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthenticationMethods publickey

# 用户限制
AllowUsers deploy
MaxAuthTries 3
MaxSessions 2

# 连接管理
ClientAliveInterval 60
ClientAliveCountMax 3
LoginGraceTime 30

# 安全增强
X11Forwarding no
AllowTcpForwarding no
PermitTunnel no
Banner /etc/ssh/banner      # 法律声明

# 日志
SyslogFacility AUTH
LogLevel VERBOSE
```

---

## 二、fail2ban 自动防护

fail2ban 是 Linux 下著名的入侵防御工具，可自动检测暴力破解并封禁 IP。

### 2.1 安装 fail2ban

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install fail2ban

# CentOS/RHEL
sudo yum install epel-release
sudo yum install fail2ban

# 启动服务
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 2.2 SSH 防护配置

创建自定义配置文件：

```bash
sudo vim /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
# 封禁时间（秒）- 1小时
bantime = 3600

# 检测时间窗口（秒）- 10分钟
findtime = 600

# 最大失败次数
maxretry = 3

# 忽略本地网络
ignoreip = 127.0.0.1/8 ::1 192.168.0.0/16 10.0.0.0/8

# 封禁动作
banaction = iptables-multiport

# 通知邮箱（可选）
destemail = admin@yourdomain.com
sendername = Fail2Ban

[ssh]
enabled = true
port = 22222              # 与 SSH 端口一致
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

# 更严格的配置（可选）
[ssh-aggressive]
enabled = true
port = 22222
filter = sshd
logpath = /var/log/auth.log
maxretry = 2
bantime = 86400           # 封禁 24 小时
findtime = 300            # 5 分钟内 2 次失败即封禁
```

### 2.3 高级规则配置

**自定义过滤规则**，检测更复杂的攻击模式：

```bash
sudo vim /etc/fail2ban/filter.d/sshd-custom.conf
```

```ini
[Definition]
failregex = ^%(__prefix_line)sFailed password for .* from <HOST> port \d+.*$
            ^%(__prefix_line)sInvalid user .* from <HOST> port \d+.*$
            ^%(__prefix_line)sConnection closed by authenticating user .* <HOST> port \d+.*$
            ^%(__prefix_line)sReceived disconnect from <HOST> port \d+.*: Bye Bye.*$
            ^%(__prefix_line)sDisconnected from authenticating user .* <HOST> port \d+.*$

ignoreregex = ^%(__prefix_line)sAccepted publickey for .* from <HOST> port \d+.*$
```

### 2.4 fail2ban 管理命令

```bash
# 查看状态
sudo fail2ban-client status

# 查看 SSH 防护状态
sudo fail2ban-client status ssh

# 查看被封禁的 IP
sudo fail2ban-client status ssh | grep "Banned IP list"

# 手动封禁 IP
sudo fail2ban-client set ssh banip 192.168.1.100

# 手动解封 IP
sudo fail2ban-client set ssh unbanip 192.168.1.100

# 重启服务
sudo systemctl restart fail2ban

# 查看日志
sudo tail -f /var/log/fail2ban.log
```

### 2.5 与防火墙集成

fail2ban 支持多种防火墙后端：

```ini
# 使用 nftables（现代系统推荐）
banaction = nftables-multiport

# 使用 firewalld（CentOS/RHEL）
banaction = firewallcmd-multiport

# 使用 ufw（Ubuntu 简单防火墙）
banaction = ufw
```

---

## 三、双因素认证（2FA）

即使密钥泄露，双因素认证仍能提供额外保护。

### 3.1 Google Authenticator 配置

**安装：**

```bash
# Ubuntu/Debian
sudo apt install libpam-google-authenticator

# CentOS/RHEL
sudo yum install google-authenticator
```

**用户初始化：**

```bash
# 以普通用户身份运行
google-authenticator

# 交互式配置：
# - 生成二维码/密钥
# - 是否基于时间（选 yes）
# - 是否更新 ~/.google_authenticator（选 yes）
# - 是否禁止多用户使用（选 yes）
# - 是否启用速率限制（选 yes）
```

**配置 SSH 使用 2FA：**

```bash
sudo vim /etc/pam.d/sshd
```

在文件顶部添加：

```
# 添加这一行
auth required pam_google_authenticator.so
```

修改 SSH 配置：

```bash
sudo vim /etc/ssh/sshd_config
```

```
ChallengeResponseAuthentication yes
AuthenticationMethods publickey,keyboard-interactive:pam
```

重启服务：

```bash
sudo systemctl restart sshd
```

### 3.2 YubiKey 硬件密钥

更高安全级别的硬件认证方案：

```bash
# 安装 YubiKey 工具
sudo apt install libpam-u2f

# 注册 YubiKey
mkdir -p ~/.config/Yubico
pamu2fcfg > ~/.config/Yubico/u2f_keys

# 配置 PAM
sudo vim /etc/pam.d/sshd
# 添加：auth required pam_u2f.so cue
```

---

## 四、监控与审计

### 4.1 SSH 登录监控脚本

```bash
#!/bin/bash
# /usr/local/bin/ssh-monitor.sh

LOG_FILE="/var/log/ssh-login-monitor.log"
ALERT_EMAIL="admin@yourdomain.com"

# 监控成功登录
tail -Fn0 /var/log/auth.log | while read line; do
    if echo "$line" | grep -q "Accepted publickey"; then
        echo "$(date): $line" >> $LOG_FILE
        
        # 提取 IP 和用户名
        IP=$(echo "$line" | grep -oP 'from \K[\d.]+')
        USER=$(echo "$line" | grep -oP 'for \K\w+')
        
        # 发送通知（可选）
        # echo "SSH login: $USER from $IP" | mail -s "SSH Alert" $ALERT_EMAIL
    fi
done
```

### 4.2 登录失败分析

```bash
# 查看最近的失败登录
sudo grep "Failed password" /var/log/auth.log | tail -20

# 统计攻击来源 IP
sudo grep "Failed password" /var/log/auth.log | grep -oP 'from \K[\d.]+' | sort | uniq -c | sort -rn | head -20

# 查看成功登录
sudo grep "Accepted" /var/log/auth.log | tail -20
```

### 4.3 使用 auditd 审计

```bash
# 安装 auditd
sudo apt install auditd

# 监控 SSH 配置变更
sudo auditctl -w /etc/ssh/sshd_config -p wa -k ssh-config-changes

# 查看审计日志
sudo ausearch -k ssh-config-changes
```

---

## 五、企业级方案

### 5.1 跳板机（Bastion Host）架构

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   管理员     │ ──────> │   跳板机      │ ──────> │  生产服务器  │
│  (本地密钥)  │         │ (严格审计)    │         │ (内网隔离)   │
└─────────────┘         └──────────────┘         └─────────────┘
                              │
                              v
                        ┌──────────────┐
                        │  会话录像/审计  │
                        └──────────────┘
```

**跳板机关键配置：**

```bash
# 强制使用跳板机登录
Match Address !10.0.0.0/8
    AllowUsers jump-user

# 内网服务器仅允许跳板机访问
Match Address 10.0.0.0/8
    AllowUsers deploy
```

### 5.2 会话录像

使用 `script` 或专业工具记录所有 SSH 会话：

```bash
# /etc/profile.d/record-session.sh
if [ -z "$SCRIPT_RECORDING" ]; then
    export SCRIPT_RECORDING=1
    script -q -f /var/log/sessions/$(date +%Y%m%d-%H%M%S)-$(whoami).log
fi
```

### 5.3 集中认证（LDAP/AD）

大型企业建议使用 LDAP 或 Active Directory 集中管理用户：

```bash
# 安装 LDAP 客户端
sudo apt install libnss-ldap libpam-ldap ldap-utils

# 配置 /etc/ldap.conf
# 配置 /etc/nsswitch.conf
# 配置 PAM 模块
```

---

## 六、检查清单

### 部署前检查

- [ ] 修改默认 SSH 端口
- [ ] 禁用 Root 密码登录
- [ ] 启用密钥认证
- [ ] 配置允许登录的用户列表
- [ ] 设置空闲超时
- [ ] 安装并配置 fail2ban
- [ ] 配置防火墙规则
- [ ] 测试新配置（保留一个会话防止被锁）

### 安全加固后验证

```bash
# 检查 SSH 配置语法
sudo sshd -t

# 查看当前监听端口
sudo ss -tlnp | grep ssh

# 测试密钥登录（新终端）
ssh -p 22222 -i ~/.ssh/id_ed25519 deploy@server_ip

# 验证 fail2ban 运行状态
sudo fail2ban-client status

# 检查日志
sudo tail -f /var/log/auth.log
```

---

## 七、常见问题

**Q: 修改端口后无法连接？**
A: 检查防火墙是否放行新端口，云服务安全组是否配置。

**Q: 密钥登录失败？**
A: 检查密钥权限（`chmod 600 ~/.ssh/id_*`），确认 `~/.ssh/authorized_keys` 权限为 600。

**Q: fail2ban 不生效？**
A: 检查日志路径配置是否正确，使用 `fail2ban-regex` 测试规则。

**Q: 如何批量管理多台服务器？**
A: 使用 Ansible、SaltStack 等配置管理工具，或使用 SSH 证书颁发（CA）。

---

## 总结

SSH 安全加固是服务器安全的第一道防线。本文方案覆盖了：

1. **基础加固**：端口、密钥、用户限制
2. **自动防护**：fail2ban 实时封禁攻击
3. **高级认证**：双因素认证、硬件密钥
4. **监控审计**：登录监控、会话录像
5. **企业方案**：跳板机、集中认证

建议按**检查清单**逐步实施，每步都进行测试验证，确保既能提升安全性，又不会影响正常运维工作。

---

*参考文档：*
- [OpenSSH 官方文档](https://www.openssh.com/manual.html)
- [fail2ban 官方 Wiki](https://www.fail2ban.org/wiki/index.php/Main_Page)
- [NIST SSH 安全指南](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-77r1.pdf)
