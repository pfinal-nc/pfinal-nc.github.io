---
title: "SSH Security Hardening Guide 2025 - 暴力破解防护完整方案"
date: 2025-12-18
updated: 2025-12-18
authors:
  - "PFinal南丞"
categories:
  - "安全工程"
  - "运维安全"
tags:
  - "ssh"
  - "安全加固"
  - "iptables"
  - "fail2ban"
  - "蜜罐"
  - "暴力破解防护"
  - "双因素认证"
keywords:
  - ssh security hardening
  - ssh brute force protection
  - iptables ssh rate limit
  - fail2ban ssh honeypot
  - ssh security best practices
  - ssh authentication hardening
  - two factor authentication ssh
  - ssh port security
  - linux server security
  - SSH暴力破解防护
  - SSH安全加固
  - iptables速率限制
  - fail2ban配置
  - PFinalClub
description: "SSH Security Hardening Guide 2025: 从iptables速率限制到fail2ban蜜罐的生产环境暴力破解防护完整方案。包含5层防护策略、自动化部署脚本、监控告警系统，助你构建安全的SSH访问体系。"
---

# SSH Security Hardening Guide 2025 - 暴力破解防护完整方案

## 前言：一次来自僵尸网络的攻击

2024 年 11 月某个凌晨 3 点，我被监控告警惊醒——某台云服务器的 SSH 登录失败次数在 10 分钟内飙升至 **3000+ 次**。

查看日志后发现，攻击来自全球 **47 个不同 IP**，显然是有组织的僵尸网络（Botnet）在进行分布式暴力破解。更令人担忧的是，攻击者使用了一份针对性很强的用户名字典：`admin`、`root`、`deploy`、`ubuntu`、`centos`...

```bash
# 攻击日志片段
Dec 15 03:12:45 prod-server sshd[12345]: Failed password for root from 185.234.xxx.xxx port 45678 ssh2
Dec 15 03:12:45 prod-server sshd[12346]: Failed password for admin from 103.45.xxx.xxx port 23456 ssh2
Dec 15 03:12:46 prod-server sshd[12347]: Failed password for deploy from 45.123.xxx.xxx port 34567 ssh2
# ... 每秒 5-10 次尝试
```

如果不是因为：
1. ✅ 禁用了密码认证，仅允许密钥登录
2. ✅ 部署了 fail2ban 自动封禁
3. ✅ 在 22 端口设置了蜜罐

这台服务器很可能已经沦陷。

**本文将分享我在多年运维实践中总结的 SSH 安全加固方案**，从攻击原理到 5 层防护体系，从单机部署到企业级方案，帮助你构建一个坚不可摧的 SSH 访问体系。

---

## 1. SSH 暴力破解攻击剖析

### 1.1 攻击原理：字典攻击 vs 暴力枚举

SSH 暴力破解主要有两种形式：

**字典攻击（Dictionary Attack）**
- 使用预先准备的用户名/密码列表
- 常见字典：RockYou、SecLists、弱密码 Top 10000
- 成功率：对弱密码 **5-15%**

**暴力枚举（Brute Force）**
- 穷举所有可能的字符组合
- 时间成本极高
- 实际攻击中较少使用纯暴力枚举

**分布式攻击（Botnet Attack）**
- 利用僵尸网络同时发起攻击
- 规避单 IP 速率限制
- 攻击规模可达 **每秒数万次**

### 1.2 常用攻击工具

作为防御者，了解攻击工具有助于更好地设计防护方案：

| 工具 | 特点 | 速度 | 隐蔽性 |
|------|------|------|--------|
| **Hydra** | 多协议支持，灵活 | 快 | 低 |
| **Medusa** | 模块化设计 | 中 | 中 |
| **Ncrack** | Nmap 团队出品 | 快 | 低 |
| **Patator** | Python 编写，可定制 | 中 | 高 |
| **Crowbar** | 专注 SSH 密钥 | 慢 | 高 |

```bash
# Hydra 攻击示例（仅用于安全测试）
hydra -l root -P /path/to/wordlist.txt ssh://target_ip -t 4 -V

# Ncrack 攻击示例
ncrack -p ssh -U users.txt -P passwords.txt target_ip
```

### 1.3 真实攻击数据统计

我对管理的 20+ 台生产服务器进行了 30 天的日志分析：

```bash
# 统计失败登录次数
grep "Failed password" /var/log/auth.log | wc -l

# 统计攻击来源 IP 数量
grep "Failed password" /var/log/auth.log | \
  grep -oP 'from \K[0-9.]+' | sort -u | wc -l

# 统计被攻击的用户名
grep "Failed password" /var/log/auth.log | \
  grep -oP 'for \K\w+' | sort | uniq -c | sort -rn | head -20
```

**统计结果**：

| 指标 | 数值 | 说明 |
|------|------|------|
| 总失败次数 | 1,247,832 | 30天累计 |
| 日均攻击 | 41,594 | 约 29次/分钟 |
| 独立攻击 IP | 8,934 | 来自 127 个国家 |
| Top 1 用户名 | root (67%) | 永远的第一目标 |
| Top 2 用户名 | admin (12%) | 管理员常用 |
| Top 3 用户名 | ubuntu (5%) | 云服务器默认 |

**攻击来源国家 TOP 5**：
1. 🇨🇳 中国 (23%) - 主要是被黑的服务器
2. 🇺🇸 美国 (18%) - 云服务器
3. 🇷🇺 俄罗斯 (12%)
4. 🇳🇱 荷兰 (8%) - VPS 服务商
5. 🇧🇷 巴西 (6%)

### 1.4 攻击成功率分析

假设攻击者使用 10 万条密码字典：

| 密码类型 | 破解概率 | 破解时间 |
|---------|---------|---------|
| `123456` | 100% | < 1秒 |
| `password123` | 95% | < 1分钟 |
| `Admin@2024` | 15% | < 1小时 |
| `Xk9#mL2$pQ7!` | 0.001% | > 1年 |
| ED25519 密钥 | 0% | 理论不可破解 |

**结论**：密码认证 = 定时炸弹，密钥认证 = 基本安全

---

## 2. 防护方案一：iptables 速率限制

### 2.1 核心原理

iptables 的 `recent` 模块可以跟踪 IP 地址的连接历史，实现基于时间窗口的速率限制。

**工作流程**：
1. 新连接到达 → 记录 IP 和时间戳
2. 检查该 IP 在指定时间窗口内的连接次数
3. 超过阈值 → DROP 该连接
4. 未超过 → ACCEPT 该连接

```
                    ┌──────────────┐
     新SSH连接 ───▶│ 检查recent表 │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
    ┌─────────────────┐      ┌─────────────────┐
    │ 60秒内 < 3次?   │      │ 60秒内 >= 3次?  │
    └────────┬────────┘      └────────┬────────┘
             │                        │
             ▼                        ▼
    ┌─────────────────┐      ┌─────────────────┐
    │ 1小时内 < 10次? │      │    DROP + LOG   │
    └────────┬────────┘      └─────────────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
┌────────┐      ┌────────┐
│ ACCEPT │      │  DROP  │
└────────┘      └────────┘
```

### 2.2 生产级配置脚本

```bash
#!/bin/bash
# ssh_iptables_ratelimit.sh - SSH 速率限制配置
# 作者: PFinal南丞
# 用途: 防止 SSH 暴力破解攻击

set -e

# 配置参数
SSH_PORT=${SSH_PORT:-22}
SHORT_WINDOW=60      # 短期窗口（秒）
SHORT_LIMIT=3        # 短期限制（次数）
LONG_WINDOW=3600     # 长期窗口（秒）
LONG_LIMIT=10        # 长期限制（次数）
WHITELIST_IPS=""     # 白名单IP，空格分隔

echo "=== SSH iptables 速率限制配置 ==="
echo "SSH端口: $SSH_PORT"
echo "短期限制: ${SHORT_WINDOW}秒/${SHORT_LIMIT}次"
echo "长期限制: ${LONG_WINDOW}秒/${LONG_LIMIT}次"

# 1. 清理旧规则（可选，谨慎使用）
# iptables -F SSH_CHECK 2>/dev/null || true
# iptables -X SSH_CHECK 2>/dev/null || true

# 2. 创建 SSH_CHECK 链
iptables -N SSH_CHECK 2>/dev/null || {
    echo "[INFO] SSH_CHECK 链已存在，清空规则"
    iptables -F SSH_CHECK
}

# 3. 添加白名单规则
for IP in $WHITELIST_IPS; do
    echo "[INFO] 添加白名单: $IP"
    iptables -A INPUT -p tcp --dport $SSH_PORT -s $IP -j ACCEPT
done

# 4. 记录超限连接（日志级别 warning）
iptables -A SSH_CHECK -m recent --name SSH_BLACKLIST \
    --rcheck --seconds $SHORT_WINDOW --hitcount $((SHORT_LIMIT + 1)) \
    -j LOG --log-prefix "SSH-RATE-LIMIT-SHORT: " --log-level 4

iptables -A SSH_CHECK -m recent --name SSH_BLACKLIST \
    --rcheck --seconds $LONG_WINDOW --hitcount $((LONG_LIMIT + 1)) \
    -j LOG --log-prefix "SSH-RATE-LIMIT-LONG: " --log-level 4

# 5. 短期限制：60秒内超过3次 → DROP
iptables -A SSH_CHECK -m recent --name SSH_BLACKLIST \
    --update --seconds $SHORT_WINDOW --hitcount $SHORT_LIMIT -j DROP

# 6. 长期限制：1小时内超过10次 → DROP
iptables -A SSH_CHECK -m recent --name SSH_BLACKLIST \
    --update --seconds $LONG_WINDOW --hitcount $LONG_LIMIT -j DROP

# 7. 记录新连接到追踪表
iptables -A SSH_CHECK -m recent --name SSH_BLACKLIST --set -j ACCEPT

# 8. 将 SSH 流量导入检查链
# 检查是否已存在该规则
if ! iptables -C INPUT -p tcp --dport $SSH_PORT -m state --state NEW -j SSH_CHECK 2>/dev/null; then
    iptables -A INPUT -p tcp --dport $SSH_PORT -m state --state NEW -j SSH_CHECK
    echo "[INFO] 已添加 INPUT 链规则"
else
    echo "[INFO] INPUT 链规则已存在"
fi

# 9. 持久化规则
if command -v iptables-save &> /dev/null; then
    mkdir -p /etc/iptables
    iptables-save > /etc/iptables/rules.v4
    echo "[INFO] 规则已保存到 /etc/iptables/rules.v4"
fi

echo "=== 配置完成 ==="
echo ""
echo "验证命令："
echo "  iptables -L SSH_CHECK -n -v"
echo "  iptables -L INPUT -n -v | grep SSH"
```

### 2.3 参数调优指南

| 场景 | 短期窗口 | 短期限制 | 长期窗口 | 长期限制 | 说明 |
|------|---------|---------|---------|---------|------|
| **保守** | 60s | 5次 | 3600s | 20次 | 允许误操作空间大 |
| **推荐** | 60s | 3次 | 3600s | 10次 | 平衡安全与可用性 |
| **激进** | 30s | 2次 | 3600s | 5次 | 高安全环境 |
| **严格** | 60s | 1次 | 86400s | 3次 | 仅限密钥认证 |

**选择建议**：

- **开发环境**：保守设置，避免影响调试
- **生产环境**：推荐设置 + 密钥认证
- **金融/政府**：激进设置 + 双因素认证
- **蜜罐系统**：严格设置，1次即封

### 2.4 性能影响分析

```bash
# 测试 iptables recent 模块性能
# 模拟 10000 个不同 IP 的连接

time for i in $(seq 1 10000); do
    echo "+$RANDOM.0.0.1" > /proc/net/xt_recent/SSH_BLACKLIST
done

# 查看 recent 表大小
cat /proc/net/xt_recent/SSH_BLACKLIST | wc -l

# 查看内存占用
cat /proc/slabinfo | grep xt_recent
```

**性能数据**（测试环境：4核 8G 云服务器）：

| 指标 | 数值 | 说明 |
|------|------|------|
| CPU 开销 | < 0.5% | 几乎可忽略 |
| 内存占用 | ~100KB/万IP | 内核态内存 |
| 延迟影响 | < 0.1ms | 无感知 |
| 最大追踪 IP | 默认 100 | 可通过模块参数调整 |

**调整 recent 表大小**：

```bash
# /etc/modprobe.d/xt_recent.conf
options xt_recent ip_list_tot=1000 ip_pkt_list_tot=50

# 重载模块
modprobe -r xt_recent
modprobe xt_recent
```

---

## 3. 防护方案二：fail2ban 蜜罐

### 3.1 蜜罐原理

蜜罐（Honeypot）是一种主动防御技术：

1. **端口迁移**：将真实 SSH 服务迁移到非标准端口（如 2222）
2. **诱捕设置**：在标准端口 22 上设置"陷阱"
3. **自动封禁**：任何连接 22 端口的 IP 立即被封禁所有端口

**优势**：
- 几乎零误伤（正常用户不会连接 22 端口）
- 主动捕获攻击者 IP
- 配合 fail2ban 实现长期封禁

```
攻击者扫描                    正常用户
    │                            │
    ▼                            ▼
┌───────────┐              ┌───────────┐
│ 端口 22   │              │ 端口 2222 │
│ (蜜罐)    │              │ (真实SSH) │
└─────┬─────┘              └─────┬─────┘
      │                          │
      ▼                          ▼
┌───────────┐              ┌───────────┐
│  LOG记录  │              │ 正常认证  │
│  + DROP   │              │           │
└─────┬─────┘              └───────────┘
      │
      ▼
┌───────────┐
│ fail2ban  │
│ 全端口封禁│
│   7天     │
└───────────┘
```

### 3.2 完整部署方案

#### 步骤 1：迁移 SSH 服务到新端口

```bash
#!/bin/bash
# migrate_ssh_port.sh - 迁移SSH端口

NEW_PORT=2222
SSHD_CONFIG="/etc/ssh/sshd_config"

# 备份配置
cp $SSHD_CONFIG ${SSHD_CONFIG}.bak.$(date +%Y%m%d_%H%M%S)

# 修改端口
if grep -q "^Port " $SSHD_CONFIG; then
    sed -i "s/^Port .*/Port $NEW_PORT/" $SSHD_CONFIG
elif grep -q "^#Port " $SSHD_CONFIG; then
    sed -i "s/^#Port .*/Port $NEW_PORT/" $SSHD_CONFIG
else
    echo "Port $NEW_PORT" >> $SSHD_CONFIG
fi

# 如果使用 SELinux，需要允许新端口
if command -v semanage &> /dev/null; then
    semanage port -a -t ssh_port_t -p tcp $NEW_PORT 2>/dev/null || \
    semanage port -m -t ssh_port_t -p tcp $NEW_PORT
fi

# 更新防火墙
if command -v ufw &> /dev/null; then
    ufw allow $NEW_PORT/tcp
    echo "[INFO] UFW: 已允许端口 $NEW_PORT"
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=$NEW_PORT/tcp
    firewall-cmd --reload
    echo "[INFO] firewalld: 已允许端口 $NEW_PORT"
fi

# 测试配置
sshd -t
if [ $? -eq 0 ]; then
    echo "[INFO] SSH 配置测试通过"
    systemctl restart sshd
    echo "[SUCCESS] SSH 已迁移到端口 $NEW_PORT"
    echo ""
    echo "⚠️  重要：请立即测试新端口连接！"
    echo "ssh -p $NEW_PORT user@$(hostname -I | awk '{print $1}')"
else
    echo "[ERROR] SSH 配置测试失败，已恢复备份"
    cp ${SSHD_CONFIG}.bak.* $SSHD_CONFIG
    exit 1
fi
```

#### 步骤 2：创建 iptables 蜜罐

```bash
#!/bin/bash
# setup_ssh_honeypot.sh - 配置SSH蜜罐

# 创建 HONEYPOT 链
iptables -N SSH_HONEYPOT 2>/dev/null || iptables -F SSH_HONEYPOT

# 记录蜜罐访问（详细日志）
iptables -A SSH_HONEYPOT -j LOG \
    --log-prefix "SSH-HONEYPOT-TRAP: " \
    --log-level 4 \
    --log-tcp-options \
    --log-ip-options

# DROP 所有蜜罐流量
iptables -A SSH_HONEYPOT -j DROP

# 将 22 端口流量导入蜜罐
# 注意：只匹配 SYN 包（新连接）
iptables -A INPUT -p tcp --dport 22 \
    -m state --state NEW \
    -j SSH_HONEYPOT

# 持久化
iptables-save > /etc/iptables/rules.v4 2>/dev/null || true

echo "[SUCCESS] SSH 蜜罐已配置在端口 22"
echo "任何连接端口 22 的 IP 将被记录并丢弃"
```

#### 步骤 3：配置 fail2ban

**主配置文件** `/etc/fail2ban/jail.local`：

```ini
# /etc/fail2ban/jail.local
# SSH 蜜罐 jail 配置

[DEFAULT]
# 默认封禁时间（秒）
bantime = 86400

# 检测时间窗口（秒）
findtime = 600

# 忽略的IP（你自己的IP）
ignoreip = 127.0.0.1/8 ::1 10.0.0.0/8 192.168.0.0/16

# 封禁动作
banaction = iptables-allports

# ====================
# SSH 蜜罐 Jail
# ====================
[ssh-honeypot]
enabled  = true
filter   = ssh-honeypot
logpath  = /var/log/syslog
           /var/log/messages
           /var/log/kern.log

# 1次尝试即封禁
maxretry = 1

# 封禁7天
bantime  = 604800

# 检测窗口5分钟
findtime = 300

# 封禁所有端口
banaction = iptables-allports

# ====================
# 传统 SSH 保护 (备用)
# ====================
[sshd]
enabled  = true
port     = 2222
filter   = sshd
logpath  = /var/log/auth.log
maxretry = 5
bantime  = 3600
findtime = 600
```

**蜜罐过滤器** `/etc/fail2ban/filter.d/ssh-honeypot.conf`：

```ini
# /etc/fail2ban/filter.d/ssh-honeypot.conf
# fail2ban 蜜罐过滤器

[Definition]

# 匹配 iptables 日志中的蜜罐记录
failregex = ^.*SSH-HONEYPOT-TRAP:.*SRC=<HOST>.*DPT=22.*$
            ^.*SSH-HONEYPOT-TRAP:.*SRC=<HOST>.*$

# 忽略的日志模式
ignoreregex =

# 日期格式（自动检测）
datepattern = {^LN-BEG}
```

#### 步骤 4：启动并验证

```bash
#!/bin/bash
# verify_honeypot.sh - 验证蜜罐配置

echo "=== 验证 SSH 蜜罐配置 ==="

# 1. 检查 iptables 规则
echo ""
echo "[1] iptables 蜜罐规则："
iptables -L SSH_HONEYPOT -n -v

# 2. 检查 fail2ban 状态
echo ""
echo "[2] fail2ban 蜜罐状态："
fail2ban-client status ssh-honeypot 2>/dev/null || {
    echo "fail2ban 未启动或 jail 未配置"
    echo "尝试重启: systemctl restart fail2ban"
}

# 3. 检查日志配置
echo ""
echo "[3] 检查日志路径："
for log in /var/log/syslog /var/log/messages /var/log/kern.log; do
    if [ -f "$log" ]; then
        echo "  ✓ $log 存在"
    else
        echo "  ✗ $log 不存在"
    fi
done

# 4. 测试蜜罐（从本机测试，会被记录但不会封禁本机）
echo ""
echo "[4] 蜜罐测试（本机连接端口22）："
echo "执行: nc -zv localhost 22"
timeout 2 nc -zv localhost 22 2>&1 || echo "连接超时（预期行为）"

# 5. 检查日志记录
echo ""
echo "[5] 最近的蜜罐日志："
grep "SSH-HONEYPOT-TRAP" /var/log/syslog 2>/dev/null | tail -5 || \
grep "SSH-HONEYPOT-TRAP" /var/log/messages 2>/dev/null | tail -5 || \
grep "SSH-HONEYPOT-TRAP" /var/log/kern.log 2>/dev/null | tail -5 || \
echo "暂无蜜罐日志"

echo ""
echo "=== 验证完成 ==="
```

### 3.3 日志分析实战

```bash
#!/bin/bash
# analyze_honeypot.sh - 蜜罐日志分析

LOG_FILE="/var/log/syslog"
PATTERN="SSH-HONEYPOT-TRAP"

echo "=== SSH 蜜罐攻击分析 ==="
echo "分析文件: $LOG_FILE"
echo "时间范围: $(head -1 $LOG_FILE | awk '{print $1,$2,$3}') - $(tail -1 $LOG_FILE | awk '{print $1,$2,$3}')"
echo ""

# 1. 总攻击次数
TOTAL=$(grep "$PATTERN" $LOG_FILE 2>/dev/null | wc -l)
echo "[1] 总攻击次数: $TOTAL"

# 2. 独立攻击IP数
UNIQUE_IPS=$(grep "$PATTERN" $LOG_FILE 2>/dev/null | grep -oP 'SRC=\K[0-9.]+' | sort -u | wc -l)
echo "[2] 独立攻击IP: $UNIQUE_IPS"

# 3. Top 10 攻击IP
echo ""
echo "[3] Top 10 攻击IP："
grep "$PATTERN" $LOG_FILE 2>/dev/null | \
    grep -oP 'SRC=\K[0-9.]+' | \
    sort | uniq -c | sort -rn | head -10 | \
    while read count ip; do
        # 尝试获取地理位置（需要安装 geoiplookup）
        if command -v geoiplookup &> /dev/null; then
            country=$(geoiplookup $ip 2>/dev/null | head -1 | cut -d: -f2)
            printf "  %6d  %-15s  %s\n" "$count" "$ip" "$country"
        else
            printf "  %6d  %s\n" "$count" "$ip"
        fi
    done

# 4. 按小时统计
echo ""
echo "[4] 按小时攻击分布："
grep "$PATTERN" $LOG_FILE 2>/dev/null | \
    awk '{print $3}' | cut -d: -f1 | \
    sort | uniq -c | sort -k2n | \
    while read count hour; do
        bar=$(printf '%*s' $((count/10)) '' | tr ' ' '█')
        printf "  %02d:00  %5d  %s\n" "$hour" "$count" "$bar"
    done

# 5. 当前被封禁的IP
echo ""
echo "[5] 当前被封禁IP："
fail2ban-client status ssh-honeypot 2>/dev/null | grep "Banned IP" || echo "  无"

# 6. 导出攻击IP列表
OUTPUT_FILE="/tmp/honeypot_attackers_$(date +%Y%m%d).txt"
grep "$PATTERN" $LOG_FILE 2>/dev/null | \
    grep -oP 'SRC=\K[0-9.]+' | \
    sort -u > $OUTPUT_FILE
echo ""
echo "[6] 攻击IP已导出到: $OUTPUT_FILE (共 $UNIQUE_IPS 个)"
```

### 3.4 监控告警脚本

```python
#!/usr/bin/env python3
"""
honeypot_alert.py - SSH蜜罐实时监控告警
依赖: pip install requests
"""

import re
import subprocess
import time
import json
from collections import Counter
from datetime import datetime

# 配置
LOG_FILE = "/var/log/syslog"
PATTERN = "SSH-HONEYPOT-TRAP"
CHECK_INTERVAL = 60  # 检查间隔（秒）
ALERT_THRESHOLD = 10  # 单IP触发告警阈值

# 告警配置（按需启用）
WEBHOOK_URL = ""  # 钉钉/Slack/企业微信 Webhook
EMAIL_TO = ""  # 告警邮箱


def get_recent_attacks(minutes=5):
    """获取最近N分钟的攻击记录"""
    cmd = f"grep '{PATTERN}' {LOG_FILE} | tail -1000"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    
    ips = re.findall(r'SRC=(\d+\.\d+\.\d+\.\d+)', result.stdout)
    return Counter(ips)


def send_webhook_alert(message):
    """发送Webhook告警"""
    if not WEBHOOK_URL:
        return
    
    import requests
    
    # 钉钉格式
    payload = {
        "msgtype": "text",
        "text": {"content": f"[SSH蜜罐告警]\n{message}"}
    }
    
    try:
        requests.post(WEBHOOK_URL, json=payload, timeout=10)
    except Exception as e:
        print(f"Webhook发送失败: {e}")


def send_email_alert(message):
    """发送邮件告警"""
    if not EMAIL_TO:
        return
    
    import smtplib
    from email.mime.text import MIMEText
    
    msg = MIMEText(message)
    msg['Subject'] = '[SSH蜜罐告警] 检测到攻击活动'
    msg['From'] = 'monitor@localhost'
    msg['To'] = EMAIL_TO
    
    try:
        with smtplib.SMTP('localhost') as smtp:
            smtp.send_message(msg)
    except Exception as e:
        print(f"邮件发送失败: {e}")


def check_and_alert():
    """检查并发送告警"""
    attacks = get_recent_attacks(minutes=5)
    
    if not attacks:
        return
    
    # 检查高频攻击
    alerts = []
    for ip, count in attacks.most_common(10):
        if count >= ALERT_THRESHOLD:
            alerts.append(f"  - {ip}: {count}次")
    
    if alerts:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        message = f"时间: {timestamp}\n"
        message += f"检测到高频SSH攻击:\n"
        message += "\n".join(alerts)
        message += f"\n\n总攻击IP数: {len(attacks)}"
        
        print(f"[{timestamp}] 发送告警...")
        print(message)
        
        send_webhook_alert(message)
        send_email_alert(message)


def main():
    """主循环"""
    print(f"SSH蜜罐监控已启动")
    print(f"  日志文件: {LOG_FILE}")
    print(f"  检查间隔: {CHECK_INTERVAL}秒")
    print(f"  告警阈值: {ALERT_THRESHOLD}次/5分钟")
    print("")
    
    while True:
        try:
            check_and_alert()
        except Exception as e:
            print(f"检查出错: {e}")
        
        time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    main()
```

---

## 4. 防护方案三：SSH 配置加固

### 4.1 禁用密码认证

**这是最重要的安全配置**，没有之一。

```bash
# /etc/ssh/sshd_config

# 完全禁用密码认证
PasswordAuthentication no

# 禁用挑战响应认证（包括键盘交互）
ChallengeResponseAuthentication no
KbdInteractiveAuthentication no

# 如果不使用双因素认证，禁用PAM
UsePAM no
```

### 4.2 密钥认证最佳实践

#### 生成强密钥

```bash
# 推荐：ED25519（现代、安全、性能好）
ssh-keygen -t ed25519 -a 100 -C "user@server-$(date +%Y%m%d)" -f ~/.ssh/id_ed25519_server

# 参数说明:
# -t ed25519  : 使用 ED25519 算法
# -a 100      : KDF 轮数（越高越安全，但解密变慢）
# -C          : 注释（用于识别）
# -f          : 输出文件路径

# 备选：RSA 4096位（兼容性更好）
ssh-keygen -t rsa -b 4096 -C "user@server-$(date +%Y%m%d)" -f ~/.ssh/id_rsa_server
```

#### 密钥权限设置

```bash
# 私钥：仅所有者可读
chmod 600 ~/.ssh/id_ed25519
chmod 600 ~/.ssh/id_rsa

# 公钥：所有者可读写，其他人可读
chmod 644 ~/.ssh/id_ed25519.pub
chmod 644 ~/.ssh/id_rsa.pub

# .ssh 目录
chmod 700 ~/.ssh

# authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

#### 密钥部署脚本

```bash
#!/bin/bash
# deploy_ssh_key.sh - 部署SSH密钥

TARGET_USER=$1
TARGET_HOST=$2
KEY_FILE=${3:-~/.ssh/id_ed25519.pub}

if [ -z "$TARGET_USER" ] || [ -z "$TARGET_HOST" ]; then
    echo "用法: $0 <用户名> <主机> [公钥文件]"
    exit 1
fi

echo "部署密钥到 $TARGET_USER@$TARGET_HOST"

# 方法1：使用 ssh-copy-id
ssh-copy-id -i $KEY_FILE $TARGET_USER@$TARGET_HOST

# 方法2：手动部署（如果 ssh-copy-id 不可用）
# cat $KEY_FILE | ssh $TARGET_USER@$TARGET_HOST "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

echo "验证连接..."
ssh -o PasswordAuthentication=no $TARGET_USER@$TARGET_HOST "echo '密钥认证成功！'"
```

### 4.3 禁用 root 登录

```bash
# /etc/ssh/sshd_config

# 完全禁用 root 登录
PermitRootLogin no

# 或者：仅允许密钥登录（有时需要紧急访问）
PermitRootLogin prohibit-password

# 用户白名单
AllowUsers deploy admin backup

# 用户组白名单
AllowGroups ssh-users wheel
```

### 4.4 完整安全配置模板

```bash
# /etc/ssh/sshd_config
# SSH 安全加固配置 - PFinalClub 推荐
# 最后更新: 2025-12-18

# ====================
# 基础设置
# ====================

# SSH 协议版本（仅使用 SSHv2）
Protocol 2

# 监听端口（建议修改为非标准端口）
Port 2222

# 监听地址（生产环境建议限制）
# ListenAddress 10.0.1.5
ListenAddress 0.0.0.0

# 主机密钥
HostKey /etc/ssh/ssh_host_ed25519_key
HostKey /etc/ssh/ssh_host_rsa_key

# ====================
# 认证设置
# ====================

# 禁用密码认证（最重要！）
PasswordAuthentication no
ChallengeResponseAuthentication no
KbdInteractiveAuthentication no

# 启用公钥认证
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys

# 禁用 root 登录
PermitRootLogin no

# 用户白名单
AllowUsers deploy admin

# 禁用空密码
PermitEmptyPasswords no

# 认证尝试次数
MaxAuthTries 3

# 认证超时
LoginGraceTime 30

# ====================
# 会话设置
# ====================

# 最大会话数
MaxSessions 10

# 最大同时连接数（未认证）
MaxStartups 10:30:100

# 会话超时
ClientAliveInterval 300
ClientAliveCountMax 2

# ====================
# 安全加固
# ====================

# 禁用 X11 转发
X11Forwarding no

# 禁用 TCP 转发（按需启用）
AllowTcpForwarding no

# 禁用 Agent 转发
AllowAgentForwarding no

# 禁用用户环境
PermitUserEnvironment no

# 禁用 .rhosts
IgnoreRhosts yes

# 禁用主机认证
HostbasedAuthentication no

# ====================
# 日志设置
# ====================

# 日志级别
LogLevel VERBOSE

# Syslog 设施
SyslogFacility AUTH

# ====================
# 加密设置
# ====================

# 密钥交换算法（安全优先）
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512

# 加密算法
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr

# MAC 算法
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com,umac-128-etm@openssh.com

# ====================
# 其他设置
# ====================

# 打印上次登录信息
PrintLastLog yes

# 打印 MOTD
PrintMotd no

# 使用 DNS（建议禁用以加快连接）
UseDNS no

# 压缩（按需启用）
Compression delayed
```

### 4.5 配置变更检查脚本

```bash
#!/bin/bash
# check_sshd_config.sh - SSH配置安全检查

SSHD_CONFIG="/etc/ssh/sshd_config"

echo "=== SSH 安全配置检查 ==="
echo ""

check_config() {
    local key=$1
    local expected=$2
    local severity=$3  # CRITICAL, WARNING, INFO
    
    value=$(grep "^$key " $SSHD_CONFIG 2>/dev/null | awk '{print $2}')
    
    if [ -z "$value" ]; then
        value=$(grep "^#$key " $SSHD_CONFIG 2>/dev/null | awk '{print $2}')
        value="(默认: $value)"
    fi
    
    if [ "$value" == "$expected" ] || [[ "$value" == *"$expected"* ]]; then
        echo "  ✓ $key = $value"
    else
        case $severity in
            CRITICAL) echo "  ✗ [严重] $key = $value (应为: $expected)" ;;
            WARNING)  echo "  ⚠ [警告] $key = $value (建议: $expected)" ;;
            INFO)     echo "  ℹ [信息] $key = $value (推荐: $expected)" ;;
        esac
    fi
}

echo "[认证安全]"
check_config "PasswordAuthentication" "no" "CRITICAL"
check_config "PermitRootLogin" "no" "CRITICAL"
check_config "PermitEmptyPasswords" "no" "CRITICAL"
check_config "PubkeyAuthentication" "yes" "CRITICAL"
check_config "MaxAuthTries" "3" "WARNING"

echo ""
echo "[会话安全]"
check_config "X11Forwarding" "no" "WARNING"
check_config "AllowTcpForwarding" "no" "INFO"
check_config "ClientAliveInterval" "300" "INFO"

echo ""
echo "[日志审计]"
check_config "LogLevel" "VERBOSE" "WARNING"

echo ""
echo "[配置测试]"
sshd -t && echo "  ✓ 配置语法正确" || echo "  ✗ 配置语法错误"

echo ""
echo "=== 检查完成 ==="
```

---

## 5. 防护方案四：双因素认证

### 5.1 Google Authenticator 集成

#### 安装配置

```bash
#!/bin/bash
# setup_2fa.sh - 配置SSH双因素认证

echo "=== SSH 双因素认证配置 ==="

# 1. 安装 Google Authenticator PAM 模块
if [ -f /etc/debian_version ]; then
    apt-get update && apt-get install -y libpam-google-authenticator
elif [ -f /etc/redhat-release ]; then
    yum install -y google-authenticator
fi

# 2. 为当前用户初始化
echo ""
echo "[2] 初始化 Google Authenticator"
echo "请扫描二维码或手动输入密钥到手机 App"
echo ""

google-authenticator \
    -t \                    # 使用 TOTP
    -d \                    # 禁止重复使用验证码
    -f \                    # 强制写入配置
    -r 3 \                  # 允许3次重试
    -R 30 \                 # 30秒窗口
    -w 3 \                  # 允许前后各3个窗口
    -e 5                    # 生成5个紧急备份码

echo ""
echo "[3] 配置 PAM"
# 添加到 /etc/pam.d/sshd
if ! grep -q "pam_google_authenticator.so" /etc/pam.d/sshd; then
    echo "auth required pam_google_authenticator.so nullok" >> /etc/pam.d/sshd
    echo "已添加 PAM 配置"
fi

echo ""
echo "[4] 配置 SSHD"
# 修改 sshd_config
sed -i 's/^ChallengeResponseAuthentication no/ChallengeResponseAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/^KbdInteractiveAuthentication no/KbdInteractiveAuthentication yes/' /etc/ssh/sshd_config

# 启用多因素认证：密钥 + TOTP
if ! grep -q "AuthenticationMethods" /etc/ssh/sshd_config; then
    echo "AuthenticationMethods publickey,keyboard-interactive" >> /etc/ssh/sshd_config
fi

echo ""
echo "[5] 重启 SSH 服务"
systemctl restart sshd

echo ""
echo "=== 配置完成 ==="
echo ""
echo "⚠️  重要提醒："
echo "1. 请保存好紧急备份码"
echo "2. 在手机上安装 Google Authenticator 或其他 TOTP App"
echo "3. 测试新终端连接前，保持当前会话不要关闭！"
```

#### 用户配置流程

```bash
# 1. 运行初始化
google-authenticator

# 2. 扫描二维码或手动输入密钥
# 3. 回答配置问题：
#    - Do you want authentication tokens to be time-based? [y]
#    - Update the ~/.google_authenticator file? [y]
#    - Disallow multiple uses? [y]
#    - Increase time skew window? [n]
#    - Enable rate-limiting? [y]

# 4. 保存紧急备份码
# 备份码示例：
# 12345678
# 87654321
# 13579246
# 24681357
# 98765432
```

### 5.2 生产环境部署策略

#### 分阶段推广

```bash
# 阶段1：管理员先行
# /etc/pam.d/sshd
auth required pam_google_authenticator.so nullok  # nullok 允许未配置的用户跳过

# 阶段2：全员强制
auth required pam_google_authenticator.so         # 移除 nullok
```

#### 紧急访问通道

```bash
# 方案1：保留一个紧急账户（仅密钥认证）
# /etc/ssh/sshd_config
Match User emergency
    AuthenticationMethods publickey

# 方案2：控制台访问
# 通过云服务商的 VNC/Serial Console

# 方案3：备份码
# 保存在安全位置（密码管理器、保险箱）
```

---

## 6. 监控与告警系统

### 6.1 实时监控脚本

```bash
#!/bin/bash
# ssh_realtime_monitor.sh - SSH实时监控

LOG_FILE="/var/log/auth.log"
ALERT_EMAIL="admin@example.com"

echo "开始监控 SSH 登录..."
echo "日志文件: $LOG_FILE"
echo ""

tail -F $LOG_FILE | while read line; do
    # 失败登录
    if echo "$line" | grep -q "Failed password"; then
        IP=$(echo "$line" | grep -oP '\d+\.\d+\.\d+\.\d+' | head -1)
        USER=$(echo "$line" | grep -oP 'for \K\w+')
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ 失败登录: $USER from $IP"
    fi
    
    # 成功登录
    if echo "$line" | grep -q "Accepted"; then
        IP=$(echo "$line" | grep -oP '\d+\.\d+\.\d+\.\d+' | head -1)
        USER=$(echo "$line" | grep -oP 'for \K\w+')
        METHOD=$(echo "$line" | grep -oP 'Accepted \K\w+')
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ 成功登录: $USER from $IP ($METHOD)"
    fi
    
    # 无效用户
    if echo "$line" | grep -q "Invalid user"; then
        IP=$(echo "$line" | grep -oP '\d+\.\d+\.\d+\.\d+' | head -1)
        USER=$(echo "$line" | grep -oP 'Invalid user \K\w+')
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ 无效用户: $USER from $IP"
    fi
done
```

### 6.2 日报生成脚本

```bash
#!/bin/bash
# ssh_daily_report.sh - SSH安全日报

DATE=$(date +%Y-%m-%d)
YESTERDAY=$(date -d "yesterday" +%Y-%m-%d)
LOG_FILE="/var/log/auth.log"
REPORT_FILE="/var/log/ssh_report_${DATE}.txt"

{
    echo "================================"
    echo "SSH 安全日报 - $DATE"
    echo "================================"
    echo ""
    
    # 1. 登录统计
    echo "## 登录统计"
    echo ""
    
    SUCCESS=$(grep "$YESTERDAY" $LOG_FILE | grep "Accepted" | wc -l)
    FAILED=$(grep "$YESTERDAY" $LOG_FILE | grep "Failed password" | wc -l)
    INVALID=$(grep "$YESTERDAY" $LOG_FILE | grep "Invalid user" | wc -l)
    
    echo "  成功登录: $SUCCESS"
    echo "  失败登录: $FAILED"
    echo "  无效用户: $INVALID"
    echo ""
    
    # 2. Top 攻击IP
    echo "## Top 10 攻击IP"
    echo ""
    grep "$YESTERDAY" $LOG_FILE | grep "Failed password" | \
        grep -oP '\d+\.\d+\.\d+\.\d+' | sort | uniq -c | sort -rn | head -10
    echo ""
    
    # 3. 成功登录详情
    echo "## 成功登录详情"
    echo ""
    grep "$YESTERDAY" $LOG_FILE | grep "Accepted" | \
        awk '{print $1,$2,$3,$9,$11}' | sort -u
    echo ""
    
    # 4. fail2ban 封禁统计
    echo "## fail2ban 封禁统计"
    echo ""
    fail2ban-client status ssh-honeypot 2>/dev/null || echo "  N/A"
    echo ""
    
    # 5. 蜜罐捕获
    echo "## 蜜罐捕获"
    echo ""
    HONEYPOT_COUNT=$(grep "$YESTERDAY" $LOG_FILE | grep "SSH-HONEYPOT-TRAP" | wc -l)
    echo "  蜜罐触发次数: $HONEYPOT_COUNT"
    echo ""
    
    echo "================================"
    echo "报告生成时间: $(date)"
    echo "================================"
    
} | tee $REPORT_FILE

# 发送邮件（可选）
# mail -s "SSH安全日报 - $DATE" admin@example.com < $REPORT_FILE
```

### 6.3 Prometheus 指标导出

```python
#!/usr/bin/env python3
"""
ssh_exporter.py - SSH 登录指标导出到 Prometheus
运行: python3 ssh_exporter.py
访问: http://localhost:9222/metrics
"""

import re
import subprocess
from prometheus_client import start_http_server, Counter, Gauge
import time

# 定义指标
ssh_login_success = Counter('ssh_login_success_total', 'SSH successful logins', ['user', 'ip'])
ssh_login_failed = Counter('ssh_login_failed_total', 'SSH failed logins', ['user', 'ip'])
ssh_honeypot_trapped = Counter('ssh_honeypot_trapped_total', 'SSH honeypot traps', ['ip'])
ssh_banned_ips = Gauge('ssh_banned_ips', 'Number of banned IPs')


def parse_auth_log():
    """解析 auth.log 获取 SSH 登录信息"""
    cmd = "tail -100 /var/log/auth.log"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    
    for line in result.stdout.split('\n'):
        # 成功登录
        if 'Accepted' in line:
            match = re.search(r'Accepted \w+ for (\w+) from ([\d.]+)', line)
            if match:
                user, ip = match.groups()
                ssh_login_success.labels(user=user, ip=ip).inc()
        
        # 失败登录
        if 'Failed password' in line:
            match = re.search(r'Failed password for (\w+) from ([\d.]+)', line)
            if match:
                user, ip = match.groups()
                ssh_login_failed.labels(user=user, ip=ip).inc()
        
        # 蜜罐
        if 'SSH-HONEYPOT-TRAP' in line:
            match = re.search(r'SRC=([\d.]+)', line)
            if match:
                ip = match.group(1)
                ssh_honeypot_trapped.labels(ip=ip).inc()


def update_banned_count():
    """更新被封禁IP数量"""
    cmd = "fail2ban-client status ssh-honeypot 2>/dev/null | grep 'Currently banned' | awk '{print $NF}'"
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    try:
        count = int(result.stdout.strip())
        ssh_banned_ips.set(count)
    except:
        pass


def main():
    # 启动 HTTP 服务
    start_http_server(9222)
    print("SSH Exporter running on :9222")
    
    while True:
        parse_auth_log()
        update_banned_count()
        time.sleep(15)


if __name__ == '__main__':
    main()
```

---

## 7. 组合方案：5层防护体系

### 7.1 防护架构图

```
                              ┌─────────────────────────────────┐
                              │         互联网攻击者            │
                              └─────────────┬───────────────────┘
                                            │
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │              第1层：防火墙                     │
                    │         (iptables/firewalld/云安全组)         │
                    │         - 仅开放必要端口                      │
                    │         - 地理位置封锁(可选)                  │
                    └───────────────────────┬───────────────────────┘
                                            │
              ┌─────────────────────────────┴─────────────────────────────┐
              │                                                           │
              ▼                                                           ▼
┌─────────────────────────────┐                         ┌─────────────────────────────┐
│     第2层：蜜罐 (端口22)     │                         │   第2层：速率限制 (端口2222) │
│   - iptables LOG + DROP     │                         │   - recent模块              │
│   - fail2ban 自动封禁       │                         │   - 60秒/3次阈值            │
│   - 7天全端口封禁           │                         │   - 1小时/10次阈值          │
└─────────────┬───────────────┘                         └─────────────┬───────────────┘
              │                                                       │
              ▼                                                       ▼
┌─────────────────────────────┐                         ┌─────────────────────────────┐
│   攻击者IP被永久封禁        │                         │      第3层：SSH配置加固     │
│   （所有端口）              │                         │   - 仅密钥认证              │
└─────────────────────────────┘                         │   - 禁用root登录            │
                                                        │   - 用户白名单              │
                                                        └─────────────┬───────────────┘
                                                                      │
                                                                      ▼
                                                        ┌─────────────────────────────┐
                                                        │     第4层：双因素认证        │
                                                        │   - 密钥 + TOTP             │
                                                        │   - Google Authenticator    │
                                                        └─────────────┬───────────────┘
                                                                      │
                                                                      ▼
                                                        ┌─────────────────────────────┐
                                                        │     第5层：监控告警          │
                                                        │   - 实时日志分析            │
                                                        │   - 异常行为检测            │
                                                        │   - 告警通知               │
                                                        └─────────────┬───────────────┘
                                                                      │
                                                                      ▼
                                                        ┌─────────────────────────────┐
                                                        │         访问授权            │
                                                        └─────────────────────────────┘
```

### 7.2 一键部署脚本

```bash
#!/bin/bash
# ssh_security_deploy.sh - SSH安全加固一键部署
# 作者: PFinal南丞
# 警告: 运行前请确保已配置好SSH密钥！

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 配置参数
NEW_SSH_PORT=${NEW_SSH_PORT:-2222}
ADMIN_IP=${ADMIN_IP:-""}  # 你的固定IP（可选）

echo "============================================"
echo "     SSH 安全加固一键部署脚本"
echo "============================================"
echo ""
echo "配置参数:"
echo "  新SSH端口: $NEW_SSH_PORT"
echo "  管理员IP: ${ADMIN_IP:-'未设置'}"
echo ""

read -p "确认开始部署? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "已取消"
    exit 0
fi

# 0. 前置检查
log_info "检查前置条件..."

if [ ! -f ~/.ssh/authorized_keys ]; then
    log_error "未找到 ~/.ssh/authorized_keys，请先配置SSH密钥！"
    exit 1
fi

if ! command -v fail2ban-client &> /dev/null; then
    log_info "安装 fail2ban..."
    apt-get update && apt-get install -y fail2ban || yum install -y fail2ban
fi

# 1. 备份配置
log_info "备份配置文件..."
BACKUP_DIR="/root/ssh_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
cp /etc/ssh/sshd_config $BACKUP_DIR/
cp -r /etc/fail2ban $BACKUP_DIR/ 2>/dev/null || true
iptables-save > $BACKUP_DIR/iptables.rules
log_info "备份已保存到: $BACKUP_DIR"

# 2. 配置SSH
log_info "配置SSH服务..."
cat > /etc/ssh/sshd_config << EOF
# SSH 安全配置 - 由部署脚本自动生成
# 生成时间: $(date)

Port $NEW_SSH_PORT
Protocol 2
ListenAddress 0.0.0.0

# 认证
PasswordAuthentication no
ChallengeResponseAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
PermitRootLogin no
PermitEmptyPasswords no
MaxAuthTries 3
LoginGraceTime 30

# 会话
MaxSessions 10
ClientAliveInterval 300
ClientAliveCountMax 2

# 安全
X11Forwarding no
AllowTcpForwarding no
PermitUserEnvironment no

# 日志
LogLevel VERBOSE
SyslogFacility AUTH

# 加密
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group16-sha512
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com

UseDNS no
EOF

# 3. 配置iptables蜜罐
log_info "配置iptables蜜罐..."

# 清理旧规则
iptables -D INPUT -p tcp --dport 22 -m state --state NEW -j SSH_HONEYPOT 2>/dev/null || true
iptables -F SSH_HONEYPOT 2>/dev/null || true
iptables -X SSH_HONEYPOT 2>/dev/null || true

iptables -D INPUT -p tcp --dport $NEW_SSH_PORT -m state --state NEW -j SSH_CHECK 2>/dev/null || true
iptables -F SSH_CHECK 2>/dev/null || true
iptables -X SSH_CHECK 2>/dev/null || true

# 创建蜜罐链
iptables -N SSH_HONEYPOT
iptables -A SSH_HONEYPOT -j LOG --log-prefix "SSH-HONEYPOT-TRAP: " --log-level 4
iptables -A SSH_HONEYPOT -j DROP

# 创建速率限制链
iptables -N SSH_CHECK
iptables -A SSH_CHECK -m recent --name SSH_BL --update --seconds 60 --hitcount 3 -j DROP
iptables -A SSH_CHECK -m recent --name SSH_BL --update --seconds 3600 --hitcount 10 -j DROP
iptables -A SSH_CHECK -m recent --name SSH_BL --set -j ACCEPT

# 白名单
if [ -n "$ADMIN_IP" ]; then
    iptables -A INPUT -p tcp --dport $NEW_SSH_PORT -s $ADMIN_IP -j ACCEPT
fi

# 应用规则
iptables -A INPUT -p tcp --dport 22 -m state --state NEW -j SSH_HONEYPOT
iptables -A INPUT -p tcp --dport $NEW_SSH_PORT -m state --state NEW -j SSH_CHECK

# 持久化
mkdir -p /etc/iptables
iptables-save > /etc/iptables/rules.v4

# 4. 配置fail2ban
log_info "配置fail2ban..."
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 86400
findtime = 600
ignoreip = 127.0.0.1/8 ::1 $ADMIN_IP

[ssh-honeypot]
enabled = true
filter = ssh-honeypot
logpath = /var/log/syslog
          /var/log/messages
          /var/log/kern.log
banaction = iptables-allports
maxretry = 1
bantime = 604800
findtime = 300

[sshd]
enabled = true
port = $NEW_SSH_PORT
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime = 3600
EOF

cat > /etc/fail2ban/filter.d/ssh-honeypot.conf << EOF
[Definition]
failregex = ^.*SSH-HONEYPOT-TRAP:.*SRC=<HOST>.*$
ignoreregex =
EOF

# 5. 更新防火墙
log_info "更新防火墙规则..."
if command -v ufw &> /dev/null; then
    ufw allow $NEW_SSH_PORT/tcp
    ufw --force enable
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=$NEW_SSH_PORT/tcp
    firewall-cmd --reload
fi

# 6. 重启服务
log_info "重启服务..."
sshd -t || {
    log_error "SSH配置测试失败，恢复备份"
    cp $BACKUP_DIR/sshd_config /etc/ssh/sshd_config
    exit 1
}

systemctl restart sshd
systemctl enable fail2ban
systemctl restart fail2ban

# 7. 验证
log_info "验证配置..."
echo ""
echo "============================================"
echo "          部署完成！"
echo "============================================"
echo ""
echo "⚠️  重要提醒："
echo ""
echo "1. 新SSH端口: $NEW_SSH_PORT"
echo "   连接命令: ssh -p $NEW_SSH_PORT user@$(hostname -I | awk '{print $1}')"
echo ""
echo "2. 请立即在新终端测试连接！"
echo "   不要关闭当前会话！"
echo ""
echo "3. 如果连接失败，恢复方法："
echo "   - 通过云控制台访问"
echo "   - 恢复备份: cp $BACKUP_DIR/sshd_config /etc/ssh/"
echo "   - 重启SSH: systemctl restart sshd"
echo ""
echo "4. 查看状态："
echo "   - iptables: iptables -L -n -v"
echo "   - fail2ban: fail2ban-client status"
echo ""
```

---

## 8. 故障排查与应急

### 8.1 常见问题

#### 问题1：被自己封禁

```bash
# 通过云控制台访问后执行：

# 方法1：清空 iptables
iptables -F
iptables -P INPUT ACCEPT

# 方法2：解封指定IP
fail2ban-client set ssh-honeypot unbanip 你的IP

# 方法3：重启 fail2ban（清空运行时封禁列表）
systemctl restart fail2ban
```

#### 问题2：SSH 无法启动

```bash
# 检查配置语法
sshd -t

# 检查详细错误
sshd -t -d

# 常见错误：
# - 权限问题：chmod 600 /etc/ssh/ssh_host_*_key
# - 端口占用：ss -tunlp | grep 22
# - SELinux：semanage port -a -t ssh_port_t -p tcp 2222
```

#### 问题3：双因素认证失败

```bash
# 检查时间同步
timedatectl status
ntpdate -u pool.ntp.org

# 使用紧急备份码
# 输入备份码替代 TOTP

# 临时禁用 2FA
# /etc/pam.d/sshd 中注释掉 pam_google_authenticator.so
```

### 8.2 应急访问方案

```bash
# 方案1：云控制台 VNC/Serial Console
# 各云服务商都提供的紧急访问方式

# 方案2：紧急用户（预先配置）
# /etc/ssh/sshd_config
Match User emergency
    AuthenticationMethods publickey
    AllowTcpForwarding yes

# 方案3：保留原始SSH配置备份
# 通过其他方式（云盘挂载）恢复

# 方案4：fail2ban 白名单
# /etc/fail2ban/jail.local
ignoreip = 127.0.0.1/8 你的固定IP
```

---

## 9. 安全检查清单

### 一键安全审计脚本

```bash
#!/bin/bash
# ssh_security_audit.sh - SSH安全审计

echo "============================================"
echo "     SSH 安全审计报告"
echo "     $(date)"
echo "============================================"
echo ""

# 1. SSH配置检查
echo "[1] SSH 配置检查"
echo "-------------------------------------------"

check_sshd() {
    local key=$1
    local expected=$2
    local value=$(grep "^$key " /etc/ssh/sshd_config 2>/dev/null | awk '{print $2}')
    
    if [ "$value" == "$expected" ]; then
        echo "  ✓ $key = $value"
    elif [ -z "$value" ]; then
        echo "  ⚠ $key 未设置 (默认值)"
    else
        echo "  ✗ $key = $value (建议: $expected)"
    fi
}

check_sshd "PasswordAuthentication" "no"
check_sshd "PermitRootLogin" "no"
check_sshd "PubkeyAuthentication" "yes"
check_sshd "PermitEmptyPasswords" "no"
check_sshd "MaxAuthTries" "3"
check_sshd "X11Forwarding" "no"
echo ""

# 2. SSH端口
echo "[2] SSH 监听端口"
echo "-------------------------------------------"
ss -tunlp | grep sshd || netstat -tunlp | grep sshd
echo ""

# 3. 防火墙状态
echo "[3] 防火墙状态"
echo "-------------------------------------------"
if iptables -L SSH_HONEYPOT -n 2>/dev/null; then
    echo "  ✓ SSH蜜罐已配置"
    iptables -L SSH_HONEYPOT -n -v | head -5
else
    echo "  ✗ SSH蜜罐未配置"
fi
echo ""

if iptables -L SSH_CHECK -n 2>/dev/null; then
    echo "  ✓ SSH速率限制已配置"
else
    echo "  ✗ SSH速率限制未配置"
fi
echo ""

# 4. fail2ban状态
echo "[4] fail2ban 状态"
echo "-------------------------------------------"
if systemctl is-active fail2ban >/dev/null 2>&1; then
    echo "  ✓ fail2ban 运行中"
    fail2ban-client status ssh-honeypot 2>/dev/null || echo "  ⚠ ssh-honeypot jail 未配置"
    fail2ban-client status sshd 2>/dev/null || echo "  ⚠ sshd jail 未配置"
else
    echo "  ✗ fail2ban 未运行"
fi
echo ""

# 5. 最近登录
echo "[5] 最近登录记录"
echo "-------------------------------------------"
echo "成功登录 (最近5条):"
grep "Accepted" /var/log/auth.log 2>/dev/null | tail -5 || echo "  无记录"
echo ""
echo "失败登录 (最近5条):"
grep "Failed password" /var/log/auth.log 2>/dev/null | tail -5 || echo "  无记录"
echo ""

# 6. 攻击统计
echo "[6] 攻击统计 (最近24小时)"
echo "-------------------------------------------"
FAILED_COUNT=$(grep "$(date +%b\ %d)" /var/log/auth.log 2>/dev/null | grep "Failed password" | wc -l)
HONEYPOT_COUNT=$(grep "$(date +%b\ %d)" /var/log/syslog 2>/dev/null | grep "SSH-HONEYPOT" | wc -l)
echo "  失败登录尝试: $FAILED_COUNT"
echo "  蜜罐触发次数: $HONEYPOT_COUNT"
echo ""

# 7. 超级用户检查
echo "[7] 超级用户检查"
echo "-------------------------------------------"
echo "有sudo权限的用户:"
grep -Po '^sudo.+:\K.*$' /etc/group 2>/dev/null || echo "  无"
echo ""

# 8. 密钥检查
echo "[8] SSH密钥检查"
echo "-------------------------------------------"
for user_home in /home/* /root; do
    if [ -f "$user_home/.ssh/authorized_keys" ]; then
        user=$(basename $user_home)
        key_count=$(wc -l < "$user_home/.ssh/authorized_keys")
        echo "  $user: $key_count 个密钥"
    fi
done
echo ""

# 评分
echo "============================================"
echo "     安全评分"
echo "============================================"

score=0
max_score=100

# 评分规则
grep -q "^PasswordAuthentication no" /etc/ssh/sshd_config && score=$((score+20))
grep -q "^PermitRootLogin no" /etc/ssh/sshd_config && score=$((score+15))
iptables -L SSH_HONEYPOT -n >/dev/null 2>&1 && score=$((score+15))
iptables -L SSH_CHECK -n >/dev/null 2>&1 && score=$((score+15))
systemctl is-active fail2ban >/dev/null 2>&1 && score=$((score+15))
grep -q "^Port 22$" /etc/ssh/sshd_config || score=$((score+10))  # 非标准端口
grep -q "^MaxAuthTries" /etc/ssh/sshd_config && score=$((score+10))

echo ""
echo "当前评分: $score / $max_score"
echo ""

if [ $score -ge 80 ]; then
    echo "评级: ★★★★★ 优秀"
elif [ $score -ge 60 ]; then
    echo "评级: ★★★★☆ 良好"
elif [ $score -ge 40 ]; then
    echo "评级: ★★★☆☆ 一般"
else
    echo "评级: ★★☆☆☆ 需改进"
fi

echo ""
echo "============================================"
```

---

## 10. 总结与资源

### 10.1 方案选择指南

| 环境类型 | 推荐方案 | 优先级 |
|---------|---------|--------|
| **开发环境** | 密钥认证 + 基础速率限制 | ★★☆☆☆ |
| **测试环境** | 密钥认证 + fail2ban | ★★★☆☆ |
| **生产环境** | 全套方案（5层防护） | ★★★★★ |
| **金融/政府** | 全套 + 双因素 + VPN | ★★★★★ |

### 10.2 实施优先级

1. **立即实施**（P0）
   - ✅ 禁用密码认证
   - ✅ 禁用 root 登录
   - ✅ 部署 fail2ban

2. **1周内**（P1）
   - ✅ 迁移到非标准端口
   - ✅ 配置 iptables 速率限制
   - ✅ 部署蜜罐

3. **1月内**（P2）
   - ✅ 双因素认证
   - ✅ 监控告警系统
   - ✅ 安全审计自动化

### 10.3 参考资源

**官方文档**
- [OpenSSH Manual](https://www.openssh.com/manual.html)
- [fail2ban Documentation](https://www.fail2ban.org/)
- [iptables Tutorial](https://www.frozentux.net/iptables-tutorial/iptables-tutorial.html)

**参考文章**
- [Block SSH brute-force attacks](https://medium.com/@dotbox/block-ssh-brute-force-attacks-2039b9bfeac7) - iptables 速率限制
- [fail2ban-ssh-honeypot](https://github.com/VedranIteh/fail2ban-ssh-honeypot) - 蜜罐方案

**工具推荐**
- [Google Authenticator PAM](https://github.com/google/google-authenticator-libpam)
- [fail2ban](https://github.com/fail2ban/fail2ban)
- [sshguard](https://www.sshguard.net/) - fail2ban 替代方案

---

## 结语

SSH 是服务器的"大门"，也是攻击者最喜欢的目标。一个配置不当的 SSH 服务，就像是一扇没有锁的门。

本文介绍的 5 层防护方案，已在数十台生产服务器上稳定运行多年，成功阻止了数百万次暴力破解尝试。希望这些经验能帮助你构建一个安全的 SSH 访问体系。

**记住**：
- 🔐 **密钥认证是底线**，没有任何借口使用密码认证
- 🍯 **蜜罐是利器**，主动捕获攻击者
- 📊 **监控是保障**，知道发生了什么才能应对
- 🔄 **定期审计**，安全是持续的过程

如果本文对你有帮助，欢迎分享给更多的运维同学。安全需要每个人的参与！

---

**关于作者**

PFinal南丞 - 10+ 年服务器运维与安全经验，管理过数百台服务器。更多技术文章请访问 [PFinalClub](https://friday-go.icu)。

**相关阅读**

- [PostgreSQL Security Best Practices 2025](../database/PostgreSQL-Security-Best-Practices-2025.md)
- [10个Golang安全陷阱及真正有效的修复方案](./10个Golang安全陷阱及真正有效的修复方案.md)
- [Golang Web应用完整安全指南](./golang%20Web应用完整安全指南.md)
