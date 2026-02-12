---
title: "MySQL 生产环境安全配置 2025 - 企业级安全加固完整指南"
date: 2025-12-22
updated: 2025-12-22
authors:
  - "PFinal南丞"
categories:
  - "开发与系统"
  - "数据库"
  - "安全"
tags:
  - "mysql"
  - "安全"
  - "数据库安全"
  - "最佳实践"
  - "生产环境"
  - "安全加固"
  - "数据加密"
keywords:
  - mysql security best practices
  - mysql authentication configuration
  - mysql ssl setup
  - mysql encryption
  - mysql security hardening
  - database security 2025
  - mysql安全配置
  - 数据库安全加固
  - MySQL用户权限管理
  - MySQL SSL/TLS加密配置
  - MySQL审计日志
  - PFinalClub
description: "MySQL 生产环境安全配置与加固完整指南 2025：从认证安全到数据加密的企业级安全加固方案。包含用户权限管理、SSL/TLS 加密、审计日志、SQL注入防护、备份安全等实战案例，助你构建安全的 MySQL 数据库系统。"
# AI 搜索优化：大家还在问 → FAQPage Schema
faq:
  - question: MySQL 生产环境如何做用户权限管理？
    answer: 遵循最小权限原则，为应用创建专用账号并只授权指定库表；使用 MySQL 8.0+ 的 caching_sha2_password 认证插件，配合 validate_password 组件强制强密码策略。
  - question: MySQL 如何配置 SSL/TLS 加密？
    answer: 在 my.cnf 中配置 ssl_ca、ssl_cert、ssl_key 指向 CA 与服务器证书，设置 require_secure_transport=ON 强制远程连接使用 SSL，并禁用旧版 SSL 协议。
  - question: MySQL 审计日志怎么开启和配置？
    answer: 可使用 MySQL Enterprise Audit 或开源审计插件（如 Percona Audit Log）；在 my.cnf 中配置审计插件并指定日志路径与格式，按需过滤用户或语句类型。
  - question: 如何防护 MySQL SQL 注入？
    answer: 应用层使用预编译语句（Prepared Statement）并严格校验输入；数据库侧限制用户权限、关闭不必要的存储过程/文件权限，配合 WAF 与审计日志做行为分析。
  - question: MySQL 备份如何加密存储？
    answer: 使用 mysqldump 配合 openssl 或 gpg 加密输出，或使用 XtraBackup 的加密选项；密钥单独保管，备份与密钥分离存储。
# AI 搜索优化：步骤型指南 → HowTo Schema
howTo:
  name: MySQL生产环境安全配置企业级加固步骤
  description: 从认证、网络、加密到审计与备份的完整安全加固流程
  steps:
    - name: 认证安全
      text: 配置 caching_sha2_password、validate_password 强密码策略，禁用不安全认证方式。
    - name: 网络安全与访问控制
      text: 绑定内网或本地地址、防火墙限制来源 IP、可选 SSH 隧道或改端口。
    - name: 数据加密（传输与存储）
      text: 启用 SSL/TLS 传输加密，表空间加密与备份加密。
    - name: 审计日志与监控
      text: 启用审计插件、配置慢查询与错误日志，对接监控告警。
    - name: SQL 注入防护
      text: 预编译语句、最小权限、关闭危险功能与 WAF。
    - name: 备份与恢复安全
      text: 加密备份、异地存储、定期恢复演练。
    - name: 系统级安全加固
      text: 文件权限、进程用户、内核参数与补丁管理。
    - name: 高级防护与配置清单
      text: 资源限制、连接限流、安全配置清单与定期巡检。
---

# MySQL生产环境安全配置：企业级安全加固完整指南

## 1. 认证安全：第一道防线

### 1.1 MySQL 8.0+ 认证插件：选择正确的认证方式

MySQL 8.0 引入了全新的认证插件 `caching_sha2_password`，这是 MySQL 5.7 中 `mysql_native_password` 的安全升级版本。

#### 认证插件对比

| 认证插件 | MySQL 版本 | 安全等级 | 性能 | 推荐场景 |
|---------|-----------|---------|------|---------|
| `mysql_native_password` | 5.7 及以下 | ⚠️ 中等 | ✅ 高 | 兼容旧应用 |
| `caching_sha2_password` | 8.0+ | ✅ 高 | ✅ 高 | **生产推荐** |
| `sha256_password` | 5.6+ | ✅ 高 | ⚠️ 中等 | 需要 SSL |

#### 配置安全的认证插件

```sql
-- 1. 查看当前认证插件配置
SELECT plugin, COUNT(*) as user_count 
FROM mysql.user 
GROUP BY plugin;

-- 2. 创建新用户时使用 caching_sha2_password（MySQL 8.0+）
CREATE USER 'app_user'@'10.0.1.%' 
IDENTIFIED WITH caching_sha2_password 
BY 'Secure@Pass2025!#$';

-- 3. 修改现有用户认证插件（MySQL 8.0+）
ALTER USER 'legacy_user'@'%' 
IDENTIFIED WITH caching_sha2_password 
BY 'NewStrong@Pass2025!';

-- 4. 对于需要兼容旧客户端的场景，可以临时使用 mysql_native_password
-- 但强烈建议升级客户端库
CREATE USER 'compat_user'@'10.0.1.%' 
IDENTIFIED WITH mysql_native_password 
BY 'Secure@Pass2025!#$';
```

#### 认证插件配置文件设置

```ini
# /etc/my.cnf 或 /etc/mysql/my.cnf

[mysqld]
# MySQL 8.0+ 默认认证插件
default_authentication_plugin=caching_sha2_password

# 禁用不安全的认证方法
# 注意：这会阻止使用旧认证插件的客户端连接
# skip-grant-tables  # 生产环境绝对不要启用
```

### 1.2 强密码策略：validate_password 组件

MySQL 8.0+ 内置了 `validate_password` 组件，可以强制实施密码复杂度策略。

#### 安装和配置密码验证组件

```sql
-- 1. 安装 validate_password 组件
INSTALL COMPONENT 'file://component_validate_password';

-- 2. 查看密码策略配置
SHOW VARIABLES LIKE 'validate_password%';

-- 3. 配置强密码策略
SET GLOBAL validate_password.policy = STRONG;  -- 策略：LOW, MEDIUM, STRONG
SET GLOBAL validate_password.length = 16;      -- 最小长度
SET GLOBAL validate_password.mixed_case_count = 2;  -- 至少2个大写字母
SET GLOBAL validate_password.lower_case_count = 2;  -- 至少2个小写字母
SET GLOBAL validate_password.number_count = 2;      -- 至少2个数字
SET GLOBAL validate_password.special_char_count = 2; -- 至少2个特殊字符
SET GLOBAL validate_password.check_user_name = ON;   -- 密码不能包含用户名

-- 4. 持久化配置到配置文件
```

#### my.cnf 中的密码策略配置

```ini
[mysqld]
# 密码验证组件配置
validate_password.policy = STRONG
validate_password.length = 16
validate_password.mixed_case_count = 2
validate_password.lower_case_count = 2
validate_password.number_count = 2
validate_password.special_char_count = 2
validate_password.check_user_name = ON
```

#### 密码管理最佳实践

```sql
-- 1. 创建用户时设置密码过期策略
CREATE USER 'app_user'@'10.0.1.%' 
IDENTIFIED WITH caching_sha2_password 
BY 'Secure@Pass2025!#$'
PASSWORD EXPIRE INTERVAL 90 DAY
FAILED_LOGIN_ATTEMPTS 5
PASSWORD_LOCK_TIME 1;

-- 2. 设置密码历史（防止重复使用最近5个密码）
ALTER USER 'app_user'@'10.0.1.%' 
PASSWORD HISTORY 5;

-- 3. 查看即将过期的密码
SELECT 
  user,
  host,
  password_last_changed,
  password_lifetime,
  password_last_changed + INTERVAL password_lifetime DAY as password_expires
FROM mysql.user
WHERE password_lifetime IS NOT NULL
  AND password_last_changed + INTERVAL password_lifetime DAY < DATE_ADD(NOW(), INTERVAL 30 DAY)
ORDER BY password_expires;

-- 4. 强制用户首次登录时修改密码
ALTER USER 'new_user'@'%' PASSWORD EXPIRE;

-- 5. 使用密码生成工具（避免在命令行直接输入密码）
-- 推荐使用：openssl rand -base64 32
```

### 1.3 用户权限管理：最小权限原则

#### 权限管理核心原则

1. **最小权限原则**：用户只获得完成工作所需的最小权限
2. **分离职责**：应用账号、只读账号、管理账号分离
3. **定期审计**：定期检查用户权限，删除不必要的权限

#### 创建最小权限用户

```sql
-- 1. 应用账号：只有特定数据库的读写权限
CREATE USER 'app_user'@'10.0.1.%' 
IDENTIFIED WITH caching_sha2_password 
BY 'Secure@Pass2025!#$';

-- 只授予必要的权限
GRANT SELECT, INSERT, UPDATE, DELETE 
ON production_db.* 
TO 'app_user'@'10.0.1.%';

-- 禁止危险操作
-- 不授予：DROP, CREATE, ALTER, GRANT, FILE, PROCESS, SUPER 等

-- 2. 只读账号：用于报表和数据分析
CREATE USER 'readonly_user'@'10.0.2.%' 
IDENTIFIED WITH caching_sha2_password 
BY 'ReadOnly@Pass2025!#$';

GRANT SELECT 
ON production_db.* 
TO 'readonly_user'@'10.0.2.%';

-- 3. 备份账号：只有备份所需权限
CREATE USER 'backup_user'@'localhost' 
IDENTIFIED WITH caching_sha2_password 
BY 'Backup@Pass2025!#$';

GRANT SELECT, RELOAD, LOCK TABLES, REPLICATION CLIENT, PROCESS 
ON *.* 
TO 'backup_user'@'localhost';

-- 4. 查看用户权限
SHOW GRANTS FOR 'app_user'@'10.0.1.%';

-- 5. 查看所有用户的权限概览
SELECT 
  user,
  host,
  Select_priv,
  Insert_priv,
  Update_priv,
  Delete_priv,
  Create_priv,
  Drop_priv,
  Alter_priv,
  Grant_priv,
  Super_priv
FROM mysql.user
WHERE user != 'mysql.sys'
ORDER BY user, host;
```

#### 权限审计脚本

```sql
-- 查找拥有危险权限的用户
SELECT 
  user,
  host,
  CONCAT_WS(',',
    IF(Super_priv='Y', 'SUPER', NULL),
    IF(File_priv='Y', 'FILE', NULL),
    IF(Process_priv='Y', 'PROCESS', NULL),
    IF(Grant_priv='Y', 'GRANT', NULL),
    IF(Reload_priv='Y', 'RELOAD', NULL),
    IF(Shutdown_priv='Y', 'SHUTDOWN', NULL)
  ) as dangerous_privileges
FROM mysql.user
WHERE Super_priv='Y' 
   OR File_priv='Y' 
   OR Process_priv='Y'
   OR (Grant_priv='Y' AND user != 'root')
ORDER BY user;

-- 查找拥有所有数据库权限的用户
SELECT 
  user,
  host,
  db,
  CONCAT_WS(',',
    IF(Select_priv='Y', 'SELECT', NULL),
    IF(Insert_priv='Y', 'INSERT', NULL),
    IF(Update_priv='Y', 'UPDATE', NULL),
    IF(Delete_priv='Y', 'DELETE', NULL),
    IF(Create_priv='Y', 'CREATE', NULL),
    IF(Drop_priv='Y', 'DROP', NULL),
    IF(Alter_priv='Y', 'ALTER', NULL)
  ) as privileges
FROM mysql.db
WHERE db = '*'
ORDER BY user;
```

### 1.4 账号安全审计：清理默认账号

#### 删除匿名用户和测试数据库

```sql
-- 1. 查看所有用户（包括匿名用户）
SELECT user, host FROM mysql.user;

-- 2. 删除匿名用户（空用户名）
DELETE FROM mysql.user WHERE user = '';

-- 3. 删除测试数据库（如果存在）
DROP DATABASE IF EXISTS test;
DROP DATABASE IF EXISTS information_schema;  -- 注意：不要删除这个！

-- 4. 删除 test 数据库的访问权限
DELETE FROM mysql.db WHERE db LIKE 'test%';

-- 5. 刷新权限表
FLUSH PRIVILEGES;

-- 6. 验证清理结果
SELECT user, host FROM mysql.user WHERE user = '';
SELECT db FROM mysql.db WHERE db LIKE 'test%';
```

#### 保护 root 账号

```sql
-- 1. 重命名 root 账号（增加攻击难度）
RENAME USER 'root'@'localhost' TO 'dba_admin'@'localhost';
RENAME USER 'root'@'127.0.0.1' TO 'dba_admin'@'127.0.0.1';

-- 2. 为 root 设置强密码
ALTER USER 'dba_admin'@'localhost' 
IDENTIFIED WITH caching_sha2_password 
BY 'SuperSecure@Root2025!#$';

-- 3. 限制 root 只能从本地连接
-- 删除所有远程 root 连接
DELETE FROM mysql.user WHERE user = 'root' AND host != 'localhost' AND host != '127.0.0.1';

-- 4. 创建专用的远程管理账号（如果需要）
CREATE USER 'dba_remote'@'203.0.113.5' 
IDENTIFIED WITH caching_sha2_password 
BY 'RemoteDBA@Pass2025!#$'
REQUIRE SSL;

GRANT ALL PRIVILEGES ON *.* 
TO 'dba_remote'@'203.0.113.5' 
WITH GRANT OPTION;

-- 5. 刷新权限
FLUSH PRIVILEGES;
```

### 1.5 双因素认证集成方案

MySQL 8.0.27+ 支持双因素认证（2FA），可以进一步提升账号安全。

```sql
-- 1. 安装认证插件（如果使用第三方2FA）
-- 示例：使用 Google Authenticator

-- 2. 为用户启用双因素认证
ALTER USER 'app_user'@'10.0.1.%' 
IDENTIFIED WITH caching_sha2_password 
BY 'Password123!'
AND IDENTIFIED WITH authentication_fido;  -- 第二因素

-- 3. 查看用户的认证方法
SELECT user, host, plugin, authentication_string 
FROM mysql.user 
WHERE user = 'app_user';
```

## 2. 网络安全与访问控制

### 2.1 bind-address 配置：禁止监听所有接口

#### 危险配置示例（❌ 绝对不要这样做）

```ini
# ❌ 致命错误：监听所有网络接口
bind-address = 0.0.0.0

# ❌ 危险：监听所有 IPv6 接口
bind-address = ::
```

#### 安全配置最佳实践（✅ 推荐）

```ini
# /etc/my.cnf

[mysqld]
# 1. 只监听本地回环接口（最安全）
bind-address = 127.0.0.1

# 2. 如果需要内网访问，只监听内网接口
# bind-address = 10.0.1.100  # 内网 IP

# 3. 如果必须监听多个接口，使用 skip-networking 禁用 TCP/IP
# 然后通过 Unix socket 连接（仅本地）
# skip-networking
```

#### 验证配置

```bash
# 1. 检查 MySQL 监听的端口和接口
sudo netstat -tlnp | grep mysql
# 或
sudo ss -tlnp | grep mysql

# 2. 应该只看到 127.0.0.1:3306，而不是 0.0.0.0:3306

# 3. 测试远程连接（应该失败）
mysql -h <server_ip> -u root -p
# 应该返回：ERROR 2003 (HY000): Can't connect to MySQL server
```

### 2.2 防火墙规则设置

#### UFW（Ubuntu/Debian）配置

```bash
# 1. 允许本地连接（默认允许）
# 不需要额外配置

# 2. 允许特定内网 IP 访问 MySQL
sudo ufw allow from 10.0.1.0/24 to any port 3306

# 3. 允许特定管理 IP 访问
sudo ufw allow from 203.0.113.5 to any port 3306

# 4. 拒绝所有其他 MySQL 连接（默认策略）
sudo ufw deny 3306

# 5. 查看防火墙规则
sudo ufw status numbered | grep 3306

# 6. 启用防火墙
sudo ufw enable
```

#### iptables（CentOS/RHEL）配置

```bash
# 1. 允许本地回环
iptables -A INPUT -i lo -j ACCEPT

# 2. 允许特定内网访问 MySQL
iptables -A INPUT -p tcp -s 10.0.1.0/24 --dport 3306 -j ACCEPT

# 3. 允许特定管理 IP
iptables -A INPUT -p tcp -s 203.0.113.5 --dport 3306 -j ACCEPT

# 4. 拒绝所有其他 MySQL 连接
iptables -A INPUT -p tcp --dport 3306 -j DROP

# 5. 保存规则（CentOS/RHEL 7+）
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="10.0.1.0/24" port protocol="tcp" port="3306" accept'
sudo firewall-cmd --reload

# 6. 查看规则
sudo iptables -L -n -v | grep 3306
```

### 2.3 白名单访问控制

#### MySQL 用户白名单配置

```sql
-- 1. 创建只允许特定 IP 段的用户
CREATE USER 'app_user'@'10.0.1.100' 
IDENTIFIED WITH caching_sha2_password 
BY 'Secure@Pass2025!#$';

-- 2. 创建允许 IP 段的用户
CREATE USER 'app_user'@'10.0.1.%' 
IDENTIFIED WITH caching_sha2_password 
BY 'Secure@Pass2025!#$';

-- 3. 创建只允许特定 IP 的用户（最安全）
CREATE USER 'dba_user'@'203.0.113.5' 
IDENTIFIED WITH caching_sha2_password 
BY 'DBA@Pass2025!#$'
REQUIRE SSL;

-- 4. 拒绝所有 '%' 通配符用户（除了必要的）
-- 查看所有使用 '%' 的用户
SELECT user, host FROM mysql.user WHERE host = '%';

-- 5. 删除危险的 '%' 用户
-- DELETE FROM mysql.user WHERE user = 'some_user' AND host = '%';
-- FLUSH PRIVILEGES;
```

#### 使用 MySQL 8.0 的连接限制功能

```sql
-- 1. 限制用户的最大连接数
CREATE USER 'app_user'@'10.0.1.%' 
IDENTIFIED WITH caching_sha2_password 
BY 'Secure@Pass2025!#$'
WITH MAX_CONNECTIONS_PER_HOUR 100
     MAX_QUERIES_PER_HOUR 1000
     MAX_UPDATES_PER_HOUR 500
     MAX_USER_CONNECTIONS 10;

-- 2. 修改现有用户的连接限制
ALTER USER 'app_user'@'10.0.1.%' 
WITH MAX_CONNECTIONS_PER_HOUR 200;

-- 3. 查看用户的连接限制
SELECT 
  user,
  host,
  max_connections,
  max_user_connections,
  max_questions,
  max_updates
FROM mysql.user
WHERE user = 'app_user';
```

### 2.4 跳板机/堡垒机架构

对于生产环境，强烈建议使用跳板机（Bastion Host）或堡垒机来访问数据库。

#### 架构设计

```
应用服务器 → 跳板机（SSH隧道） → MySQL服务器（只监听127.0.0.1）
```

#### SSH 隧道配置

```bash
# 1. 在跳板机上建立 SSH 隧道
ssh -L 3306:127.0.0.1:3306 -N -f user@mysql-server

# 2. 从本地通过隧道连接 MySQL
mysql -h 127.0.0.1 -P 3306 -u app_user -p

# 3. 使用 autossh 保持隧道稳定（推荐）
autossh -M 20000 -L 3306:127.0.0.1:3306 -N -f user@mysql-server

# 4. 配置 SSH config 简化连接
# ~/.ssh/config
Host mysql-tunnel
    HostName mysql-server-ip
    User deploy
    LocalForward 3306 127.0.0.1:3306
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

### 2.5 端口安全与伪装

#### 修改默认端口

```ini
# /etc/my.cnf

[mysqld]
# 使用非标准端口（增加扫描难度）
port = 33060

# 注意：这不是真正的安全措施，只是增加攻击成本
# 真正的安全来自防火墙和访问控制
```

#### 端口扫描防护

```bash
# 1. 使用 fail2ban 防止端口扫描
# /etc/fail2ban/jail.local
[mysql]
enabled = true
port = 3306
filter = mysql
logpath = /var/log/mysql/error.log
maxretry = 3
bantime = 3600

# 2. 使用端口敲门（port knocking）
# 需要安装 knockd
# 只有按正确顺序访问特定端口，才开放 MySQL 端口
```

## 3. 数据加密：传输与存储

### 3.1 SSL/TLS 传输加密配置

#### 生成 SSL 证书

```bash
# 1. 创建证书目录
sudo mkdir -p /etc/mysql/ssl
sudo chmod 700 /etc/mysql/ssl
cd /etc/mysql/ssl

# 2. 生成 CA 私钥
openssl genrsa -out ca-key.pem 2048

# 3. 生成 CA 证书
openssl req -new -x509 -nodes -days 3650 \
  -key ca-key.pem \
  -out ca.pem \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=Company/CN=MySQL-CA"

# 4. 生成服务器私钥
openssl genrsa -out server-key.pem 2048

# 5. 生成服务器证书请求
openssl req -new -key server-key.pem \
  -out server-req.pem \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=Company/CN=mysql-server"

# 6. 使用 CA 签名服务器证书
openssl x509 -req -in server-req.pem -days 3650 \
  -CA ca.pem -CAkey ca-key.pem \
  -CAcreateserial -out server-cert.pem

# 7. 验证证书
openssl verify -CAfile ca.pem server-cert.pem

# 8. 设置正确的权限
sudo chown mysql:mysql /etc/mysql/ssl/*
sudo chmod 600 /etc/mysql/ssl/*
```

#### 配置 MySQL 使用 SSL

```ini
# /etc/my.cnf

[mysqld]
# SSL 配置
ssl-ca = /etc/mysql/ssl/ca.pem
ssl-cert = /etc/mysql/ssl/server-cert.pem
ssl-key = /etc/mysql/ssl/server-key.pem

# 要求所有远程连接使用 SSL
require_secure_transport = ON

# SSL 版本（禁用旧的不安全版本）
tls_version = TLSv1.2,TLSv1.3
```

#### 验证 SSL 配置

```sql
-- 1. 检查 SSL 是否启用
SHOW VARIABLES LIKE '%ssl%';

-- 2. 检查当前连接的 SSL 状态
\s
-- 或
STATUS;

-- 3. 查看 SSL 变量
SHOW STATUS LIKE 'Ssl%';

-- 4. 测试强制 SSL 连接
-- 应该失败（如果 require_secure_transport = ON）
mysql -h 127.0.0.1 -u app_user -p --ssl-mode=DISABLED

-- 5. 使用 SSL 连接（应该成功）
mysql -h 127.0.0.1 -u app_user -p --ssl-mode=REQUIRED
```

#### 客户端 SSL 配置

```ini
# ~/.my.cnf 或应用配置文件

[client]
ssl-ca = /etc/mysql/ssl/ca.pem
ssl-cert = /etc/mysql/ssl/client-cert.pem
ssl-key = /etc/mysql/ssl/client-key.pem
ssl-mode = REQUIRED
```

#### 为用户要求 SSL 连接

```sql
-- 1. 创建要求 SSL 的用户
CREATE USER 'app_user'@'10.0.1.%' 
IDENTIFIED WITH caching_sha2_password 
BY 'Secure@Pass2025!#$'
REQUIRE SSL;

-- 2. 要求 SSL 和特定证书
CREATE USER 'secure_user'@'10.0.1.%' 
IDENTIFIED WITH caching_sha2_password 
BY 'Secure@Pass2025!#$'
REQUIRE X509;  -- 要求客户端证书

-- 3. 要求 SSL 和特定证书主题
CREATE USER 'vip_user'@'%' 
IDENTIFIED WITH caching_sha2_password 
BY 'Secure@Pass2025!#$'
REQUIRE SUBJECT '/C=CN/ST=Beijing/O=Company/CN=client-cert'
REQUIRE ISSUER '/C=CN/ST=Beijing/O=Company/CN=MySQL-CA';

-- 4. 修改现有用户要求 SSL
ALTER USER 'app_user'@'10.0.1.%' REQUIRE SSL;

-- 5. 查看用户的 SSL 要求
SELECT user, host, ssl_type, ssl_cipher, x509_issuer, x509_subject 
FROM mysql.user 
WHERE ssl_type != '';
```

### 3.2 InnoDB 数据静态加密（Transparent Data Encryption）

MySQL 5.7.11+ 和 8.0+ 支持 InnoDB 表空间加密（TDE），可以对数据文件进行透明加密。

#### 安装密钥环插件

```sql
-- 1. MySQL 8.0+ 使用 component_keyring_file
INSTALL COMPONENT 'file://component_keyring_file';

-- 2. 或使用 keyring_file 插件（MySQL 5.7）
-- INSTALL PLUGIN keyring_file SONAME 'keyring_file.so';

-- 3. 验证插件安装
SELECT * FROM mysql.component WHERE component_id = 'file://component_keyring_file';
```

#### 配置文件设置

```ini
# /etc/my.cnf

[mysqld]
# 密钥环文件路径
early-plugin-load=keyring_file.so
keyring_file_data=/var/lib/mysql-keyring/keyring

# 确保目录存在且权限正确
# sudo mkdir -p /var/lib/mysql-keyring
# sudo chown mysql:mysql /var/lib/mysql-keyring
# sudo chmod 700 /var/lib/mysql-keyring
```

#### 加密表空间

```sql
-- 1. 创建加密表
CREATE TABLE sensitive_data (
  id INT PRIMARY KEY AUTO_INCREMENT,
  credit_card VARCHAR(19),
  ssn VARCHAR(11),
  data TEXT
) ENGINE=InnoDB 
ENCRYPTION='Y';

-- 2. 加密现有表
ALTER TABLE existing_table ENCRYPTION='Y';

-- 3. 加密整个数据库的所有表
SELECT CONCAT('ALTER TABLE ', table_schema, '.', table_name, ' ENCRYPTION=\'Y\';')
FROM information_schema.tables
WHERE table_schema = 'production_db'
  AND engine = 'InnoDB';

-- 4. 查看表的加密状态
SELECT 
  table_schema,
  table_name,
  create_options
FROM information_schema.tables
WHERE table_schema = 'production_db'
  AND create_options LIKE '%ENCRYPTION%';

-- 5. 解密表（如果需要）
ALTER TABLE sensitive_data ENCRYPTION='N';
```

#### 加密系统表空间

```sql
-- 1. 加密系统表空间（需要重启）
-- 在配置文件中设置
-- [mysqld]
-- innodb_sys_tablespace_encrypt = ON

-- 2. 加密重做日志
-- [mysqld]
-- innodb_redo_log_encrypt = ON

-- 3. 加密撤销日志
-- [mysqld]
-- innodb_undo_log_encrypt = ON
```

### 3.3 二进制日志加密

MySQL 8.0.14+ 支持二进制日志加密。

```sql
-- 1. 设置二进制日志加密密钥
SET GLOBAL binlog_encryption = ON;

-- 2. 查看加密状态
SHOW VARIABLES LIKE 'binlog_encryption';

-- 3. 配置文件设置
-- [mysqld]
-- binlog_encryption = ON
```

### 3.4 备份文件加密

#### mysqldump 加密备份

```bash
# 1. 使用 openssl 加密备份
mysqldump -u backup_user -p production_db | \
  openssl enc -aes-256-cbc -salt -pbkdf2 \
  -out backup_$(date +%Y%m%d).sql.enc \
  -pass pass:YourEncryptionPassword

# 2. 解密备份
openssl enc -aes-256-cbc -d -pbkdf2 \
  -in backup_20251222.sql.enc \
  -out backup_20251222.sql \
  -pass pass:YourEncryptionPassword

# 3. 使用 gpg 加密备份
mysqldump -u backup_user -p production_db | \
  gpg --encrypt --recipient backup@company.com \
  --output backup_$(date +%Y%m%d).sql.gpg

# 4. 解密 gpg 备份
gpg --decrypt backup_20251222.sql.gpg > backup_20251222.sql
```

#### Percona XtraBackup 加密备份

```bash
# 1. 使用 XtraBackup 加密备份
xtrabackup --backup \
  --target-dir=/backup/encrypted \
  --encrypt=AES256 \
  --encrypt-key="32字节密钥" \
  --user=backup_user \
  --password=Backup@Pass2025!

# 2. 解密备份
xtrabackup --decrypt=AES256 \
  --encrypt-key="32字节密钥" \
  --target-dir=/backup/encrypted \
  --remove-original

# 3. 准备备份
xtrabackup --prepare --target-dir=/backup/encrypted
```

## 4. 审计日志与监控

### 4.1 MySQL Enterprise Audit 插件

MySQL Enterprise Edition 提供了官方的审计插件，但需要商业许可。对于开源方案，可以使用 MariaDB Audit Plugin。

#### 安装 MariaDB Audit Plugin

```sql
-- 1. 下载 MariaDB Audit Plugin（与 MySQL 兼容）
-- 从 MariaDB 官网下载对应版本的 audit_log.so

-- 2. 安装插件
INSTALL PLUGIN server_audit SONAME 'server_audit.so';

-- 3. 配置审计日志
SET GLOBAL server_audit_events = 'CONNECT,QUERY,TABLE';
SET GLOBAL server_audit_logging = ON;
SET GLOBAL server_audit_file_path = '/var/log/mysql/audit.log';
SET GLOBAL server_audit_file_rotate_size = 100000000;  -- 100MB
SET GLOBAL server_audit_file_rotations = 10;

-- 4. 查看插件状态
SHOW VARIABLES LIKE 'server_audit%';
SHOW STATUS LIKE 'server_audit%';
```

#### 配置文件设置

```ini
# /etc/my.cnf

[mysqld]
# 审计插件配置
plugin-load = server_audit=server_audit.so
server_audit_events = CONNECT,QUERY,TABLE
server_audit_logging = ON
server_audit_file_path = /var/log/mysql/audit.log
server_audit_file_rotate_size = 100000000
server_audit_file_rotations = 10
server_audit_excl_users = 'backup_user@localhost'
```

#### 审计敏感操作

```sql
-- 1. 审计所有 DDL 操作
SET GLOBAL server_audit_events = 'CONNECT,QUERY_DDL';

-- 2. 审计所有数据修改操作
SET GLOBAL server_audit_events = 'CONNECT,QUERY_DML';

-- 3. 审计特定表的操作
SET GLOBAL server_audit_incl_users = 'app_user';
SET GLOBAL server_audit_excl_users = 'monitoring_user';

-- 4. 查看审计日志
sudo tail -f /var/log/mysql/audit.log
```

### 4.2 通用日志与慢查询日志安全配置

#### 启用通用查询日志

```ini
# /etc/my.cnf

[mysqld]
# 通用查询日志（谨慎使用，会产生大量日志）
general_log = ON
general_log_file = /var/log/mysql/general.log
log_output = FILE

# 注意：生产环境通常只启用慢查询日志，不启用通用日志
```

#### 慢查询日志配置

```ini
# /etc/my.cnf

[mysqld]
# 慢查询日志
slow_query_log = ON
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2  # 超过2秒的查询记录
log_queries_not_using_indexes = ON  # 记录未使用索引的查询
log_slow_admin_statements = ON  # 记录慢管理语句
min_examined_row_limit = 1000  # 至少扫描1000行才记录
```

#### 日志文件权限设置

```bash
# 1. 设置日志目录权限
sudo chown mysql:mysql /var/log/mysql
sudo chmod 750 /var/log/mysql

# 2. 设置日志文件权限
sudo chmod 640 /var/log/mysql/*.log

# 3. 配置 logrotate 轮转日志
# /etc/logrotate.d/mysql
/var/log/mysql/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 640 mysql mysql
    sharedscripts
    postrotate
        /usr/bin/mysqladmin flush-logs
    endscript
}
```

### 4.3 敏感操作追踪

#### 创建审计触发器

```sql
-- 1. 创建审计表
CREATE TABLE audit_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  table_name VARCHAR(64),
  operation VARCHAR(10),
  old_data JSON,
  new_data JSON,
  user_name VARCHAR(64),
  host VARCHAR(64),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_table_time (table_name, timestamp),
  INDEX idx_user_time (user_name, timestamp)
) ENGINE=InnoDB;

-- 2. 为敏感表创建审计触发器
DELIMITER $$

CREATE TRIGGER audit_users_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
  INSERT INTO audit_log (table_name, operation, new_data, user_name, host)
  VALUES ('users', 'INSERT', JSON_OBJECT(
    'id', NEW.id,
    'email', NEW.email,
    'created_at', NEW.created_at
  ), USER(), @@hostname);
END$$

CREATE TRIGGER audit_users_update
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  INSERT INTO audit_log (table_name, operation, old_data, new_data, user_name, host)
  VALUES ('users', 'UPDATE', 
    JSON_OBJECT('id', OLD.id, 'email', OLD.email),
    JSON_OBJECT('id', NEW.id, 'email', NEW.email),
    USER(), @@hostname);
END$$

CREATE TRIGGER audit_users_delete
AFTER DELETE ON users
FOR EACH ROW
BEGIN
  INSERT INTO audit_log (table_name, operation, old_data, user_name, host)
  VALUES ('users', 'DELETE', 
    JSON_OBJECT('id', OLD.id, 'email', OLD.email),
    USER(), @@hostname);
END$$

DELIMITER ;
```

### 4.4 审计日志分析与告警

#### 分析审计日志脚本

```bash
#!/bin/bash
# analyze_audit_log.sh

AUDIT_LOG="/var/log/mysql/audit.log"
ALERT_EMAIL="security@company.com"

# 1. 检测失败的登录尝试
echo "=== 失败的登录尝试 ==="
grep "CONNECT.*FAILED" $AUDIT_LOG | tail -20

# 2. 检测敏感操作
echo "=== 敏感操作（DROP, TRUNCATE） ==="
grep -E "(DROP|TRUNCATE)" $AUDIT_LOG | tail -20

# 3. 检测大量数据删除
echo "=== 大量 DELETE 操作 ==="
grep "DELETE" $AUDIT_LOG | awk '{print $NF}' | sort | uniq -c | sort -rn | head -10

# 4. 检测异常用户行为
echo "=== 异常用户活动 ==="
awk '{print $3}' $AUDIT_LOG | sort | uniq -c | sort -rn | head -10

# 5. 发送告警（如果有异常）
if grep -q "DROP TABLE" $AUDIT_LOG; then
  echo "警告：检测到 DROP TABLE 操作" | mail -s "MySQL 安全告警" $ALERT_EMAIL
fi
```

#### 实时监控脚本

```bash
#!/bin/bash
# monitor_mysql_security.sh

tail -f /var/log/mysql/audit.log | while read line; do
  # 检测危险操作
  if echo "$line" | grep -qE "(DROP|TRUNCATE|ALTER.*DROP)"; then
    echo "[ALERT] $(date): $line" >> /var/log/mysql/security_alerts.log
    # 发送告警
    echo "$line" | mail -s "MySQL 危险操作告警" security@company.com
  fi
  
  # 检测大量删除
  if echo "$line" | grep -q "DELETE.*WHERE.*1=1"; then
    echo "[WARNING] $(date): 可能的批量删除操作: $line" >> /var/log/mysql/security_alerts.log
  fi
done
```

### 4.5 合规性要求（GDPR、等保 2.0）

#### GDPR 合规检查清单

```sql
-- 1. 数据访问审计（谁访问了什么数据）
SELECT 
  user,
  host,
  db,
  command,
  time,
  state
FROM information_schema.processlist
WHERE db = 'production_db'
  AND user != 'system_user';

-- 2. 数据修改审计（记录所有数据变更）
-- 使用前面创建的 audit_log 表

-- 3. 数据删除审计
SELECT * FROM audit_log 
WHERE operation = 'DELETE' 
  AND table_name = 'users'
ORDER BY timestamp DESC;

-- 4. 数据导出审计
-- 监控 FILE 权限的使用
SELECT * FROM mysql.general_log 
WHERE command_type = 'Query' 
  AND argument LIKE '%INTO OUTFILE%';
```

#### 等保 2.0 三级要求

```sql
-- 1. 身份鉴别
-- - 强制密码复杂度（validate_password）
-- - 密码定期更换
-- - 登录失败处理（FAILED_LOGIN_ATTEMPTS）

-- 2. 访问控制
-- - 最小权限原则
-- - 权限分离
-- - 定期权限审计

-- 3. 安全审计
-- - 启用审计日志
-- - 日志保护（权限、备份）
-- - 日志分析

-- 4. 数据完整性
-- - SSL/TLS 传输加密
-- - 数据加密存储
-- - 备份加密

-- 5. 数据保密性
-- - 敏感数据加密
-- - 访问控制
-- - 数据脱敏
```

## 5. SQL 注入防护

### 5.1 预处理语句最佳实践

#### 使用预处理语句（推荐）

```python
# Python 示例（使用 pymysql）
import pymysql

conn = pymysql.connect(
    host='127.0.0.1',
    user='app_user',
    password='Secure@Pass2025!',
    db='production_db',
    cursorclass=pymysql.cursors.DictCursor
)

# ✅ 正确：使用预处理语句
def get_user_by_id(user_id):
    with conn.cursor() as cursor:
        sql = "SELECT * FROM users WHERE id = %s"
        cursor.execute(sql, (user_id,))  # 参数化查询
        return cursor.fetchone()

# ❌ 错误：字符串拼接（容易 SQL 注入）
def get_user_by_id_unsafe(user_id):
    with conn.cursor() as cursor:
        sql = f"SELECT * FROM users WHERE id = {user_id}"  # 危险！
        cursor.execute(sql)
        return cursor.fetchone()
```

```php
// PHP 示例（使用 PDO）
$pdo = new PDO(
    "mysql:host=127.0.0.1;dbname=production_db",
    "app_user",
    "Secure@Pass2025!"
);

// ✅ 正确：使用预处理语句
function getUserById($userId) {
    global $pdo;
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    return $stmt->fetch();
}

// ❌ 错误：字符串拼接
function getUserByIdUnsafe($userId) {
    global $pdo;
    $sql = "SELECT * FROM users WHERE id = " . $userId;  // 危险！
    return $pdo->query($sql)->fetch();
}
```

```go
// Go 示例（使用 database/sql）
import (
    "database/sql"
    _ "github.com/go-sql-driver/mysql"
)

// ✅ 正确：使用预处理语句
func GetUserByID(db *sql.DB, userID int) (*User, error) {
    stmt, err := db.Prepare("SELECT * FROM users WHERE id = ?")
    if err != nil {
        return nil, err
    }
    defer stmt.Close()
    
    var user User
    err = stmt.QueryRow(userID).Scan(&user.ID, &user.Email)
    return &user, err
}

// ❌ 错误：字符串拼接
func GetUserByIDUnsafe(db *sql.DB, userID int) (*User, error) {
    query := fmt.Sprintf("SELECT * FROM users WHERE id = %d", userID)  // 危险！
    var user User
    err := db.QueryRow(query).Scan(&user.ID, &user.Email)
    return &user, err
}
```

### 5.2 输入验证与过滤

#### 白名单验证

```python
# ✅ 正确：白名单验证
def get_user_by_status(status):
    allowed_statuses = ['active', 'inactive', 'pending']
    if status not in allowed_statuses:
        raise ValueError("Invalid status")
    
    with conn.cursor() as cursor:
        sql = "SELECT * FROM users WHERE status = %s"
        cursor.execute(sql, (status,))
        return cursor.fetchall()
```

#### 类型转换验证

```python
# ✅ 正确：类型验证
def get_user_by_id(user_id):
    try:
        user_id = int(user_id)  # 确保是整数
    except ValueError:
        raise ValueError("Invalid user ID")
    
    with conn.cursor() as cursor:
        sql = "SELECT * FROM users WHERE id = %s"
        cursor.execute(sql, (user_id,))
        return cursor.fetchone()
```

### 5.3 应用层防护

#### 使用 ORM 框架

```python
# Django ORM 示例
from django.db import models

class User(models.Model):
    email = models.EmailField()
    status = models.CharField(max_length=20)

# ✅ ORM 自动使用预处理语句
users = User.objects.filter(id=user_id)  # 安全
users = User.objects.filter(email__contains=search_term)  # 安全
```

```python
# SQLAlchemy 示例
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import sessionmaker

# ✅ SQLAlchemy 自动使用预处理语句
session.query(User).filter(User.id == user_id).first()  # 安全
```

### 5.4 WAF（Web Application Firewall）集成

#### ModSecurity 规则示例

```apache
# Apache ModSecurity 规则
SecRule ARGS "@detectSQLi" \
    "id:1001,\
    phase:2,\
    block,\
    msg:'SQL Injection Attack Detected',\
    logdata:'Matched Data: %{MATCHED_VAR} found within %{MATCHED_VAR_NAME}',\
    tag:'application-multi',\
    tag:'language-multi',\
    tag:'platform-multi',\
    tag:'attack-sqli',\
    severity:'CRITICAL'"
```

#### Nginx + ModSecurity

```nginx
# nginx.conf
location / {
    ModSecurityEnabled on;
    ModSecurityConfig /etc/nginx/modsec/main.conf;
    proxy_pass http://backend;
}
```

### 5.5 实战案例分析

#### 案例 1：典型的 SQL 注入攻击

```sql
-- 攻击者输入：1' OR '1'='1
-- 原始查询：
SELECT * FROM users WHERE id = '1' OR '1'='1'

-- 如果使用字符串拼接，会返回所有用户
-- 使用预处理语句可以防止这种攻击
```

#### 案例 2：UNION 注入攻击

```sql
-- 攻击者输入：1' UNION SELECT password FROM users--
-- 原始查询：
SELECT * FROM products WHERE id = '1' UNION SELECT password FROM users--'

-- 防护：使用预处理语句 + 限制查询结果列数
```

#### 案例 3：盲注攻击

```sql
-- 攻击者通过时间延迟判断
-- 输入：1' AND SLEEP(5)--
-- 如果查询延迟5秒，说明注入成功

-- 防护：
-- 1. 使用预处理语句
-- 2. 限制查询超时时间
SET GLOBAL max_execution_time = 5000;  -- 5秒超时
```

## 6. 备份与恢复安全

### 6.1 mysqldump 安全备份策略

#### 基本安全备份

```bash
#!/bin/bash
# secure_backup.sh

BACKUP_DIR="/backup/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="production_db"
BACKUP_USER="backup_user"
BACKUP_PASS="Backup@Pass2025!#$"

# 1. 创建备份目录
mkdir -p $BACKUP_DIR

# 2. 执行备份（使用专用备份账号）
mysqldump \
  -u $BACKUP_USER \
  -p"$BACKUP_PASS" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --master-data=2 \
  --flush-logs \
  $DB_NAME | \
  gzip > $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz

# 3. 加密备份
openssl enc -aes-256-cbc -salt -pbkdf2 \
  -in $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz \
  -out $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz.enc \
  -pass file:/etc/mysql/backup_key.txt

# 4. 删除未加密的备份
rm $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz

# 5. 设置备份文件权限
chmod 600 $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz.enc
chown mysql:mysql $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz.enc

# 6. 删除旧备份（保留30天）
find $BACKUP_DIR -name "*.sql.gz.enc" -mtime +30 -delete

# 7. 验证备份完整性
# 可以添加备份验证步骤
```

#### 增量备份策略

```bash
#!/bin/bash
# incremental_backup.sh

# 1. 全量备份（每周日）
if [ $(date +%u) -eq 7 ]; then
    mysqldump --all-databases --master-data=2 --single-transaction > full_backup.sql
fi

# 2. 增量备份（每天）
# 基于二进制日志的增量备份
mysqlbinlog --read-from-remote-server \
  --host=127.0.0.1 \
  --user=backup_user \
  --password=Backup@Pass2025! \
  --raw \
  --stop-never \
  /var/log/mysql/binlog.* > incremental_backup_$(date +%Y%m%d).log
```

### 6.2 Percona XtraBackup 加密备份

#### 完整备份流程

```bash
#!/bin/bash
# xtrabackup_secure.sh

BACKUP_DIR="/backup/xtrabackup"
DATE=$(date +%Y%m%d_%H%M%S)
ENCRYPT_KEY="$(openssl rand -hex 32)"  # 32字节密钥

# 1. 创建备份目录
mkdir -p $BACKUP_DIR/$DATE

# 2. 执行加密备份
xtrabackup \
  --backup \
  --target-dir=$BACKUP_DIR/$DATE \
  --user=backup_user \
  --password=Backup@Pass2025! \
  --encrypt=AES256 \
  --encrypt-key=$ENCRYPT_KEY \
  --encrypt-threads=4

# 3. 准备备份
xtrabackup \
  --prepare \
  --target-dir=$BACKUP_DIR/$DATE \
  --decrypt=AES256 \
  --encrypt-key=$ENCRYPT_KEY

# 4. 压缩备份
tar -czf $BACKUP_DIR/${DATE}.tar.gz -C $BACKUP_DIR $DATE

# 5. 再次加密压缩文件
openssl enc -aes-256-cbc -salt -pbkdf2 \
  -in $BACKUP_DIR/${DATE}.tar.gz \
  -out $BACKUP_DIR/${DATE}.tar.gz.enc \
  -pass file:/etc/mysql/backup_key.txt

# 6. 安全存储加密密钥（分离存储）
echo $ENCRYPT_KEY | gpg --encrypt --recipient backup@company.com > $BACKUP_DIR/${DATE}.key.gpg

# 7. 清理临时文件
rm -rf $BACKUP_DIR/$DATE
rm $BACKUP_DIR/${DATE}.tar.gz
```

### 6.3 备份文件权限管理

```bash
# 1. 设置备份目录权限
sudo chown root:mysql /backup/mysql
sudo chmod 750 /backup/mysql

# 2. 设置备份文件权限
sudo chmod 600 /backup/mysql/*.sql.gz.enc
sudo chown mysql:mysql /backup/mysql/*.sql.gz.enc

# 3. 使用 ACL 进一步限制访问
sudo setfacl -m u:backup_user:r /backup/mysql
sudo setfacl -m u:backup_user:x /backup/mysql
```

### 6.4 异地容灾方案

#### 备份同步到远程

```bash
#!/bin/bash
# remote_backup_sync.sh

LOCAL_BACKUP="/backup/mysql"
REMOTE_HOST="backup-server.company.com"
REMOTE_USER="backup"
REMOTE_DIR="/backup/remote"

# 1. 使用 rsync 同步备份（加密传输）
rsync -avz --progress \
  -e "ssh -i /etc/mysql/backup_rsa_key" \
  $LOCAL_BACKUP/ \
  $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/

# 2. 使用 s3cmd 同步到 S3（加密）
s3cmd put \
  --encrypt \
  --server-side-encryption \
  $LOCAL_BACKUP/*.sql.gz.enc \
  s3://mysql-backups/

# 3. 验证远程备份
ssh -i /etc/mysql/backup_rsa_key $REMOTE_USER@$REMOTE_HOST \
  "ls -lh $REMOTE_DIR | tail -5"
```

### 6.5 恢复演练流程

#### 恢复测试脚本

```bash
#!/bin/bash
# restore_test.sh

BACKUP_FILE="/backup/mysql/production_db_20251222.sql.gz.enc"
TEST_DB="production_db_test"
DECRYPT_KEY="/etc/mysql/backup_key.txt"

# 1. 解密备份
openssl enc -aes-256-cbc -d -pbkdf2 \
  -in $BACKUP_FILE \
  -out /tmp/restore_test.sql.gz \
  -pass file:$DECRYPT_KEY

# 2. 解压
gunzip /tmp/restore_test.sql.gz

# 3. 创建测试数据库
mysql -u root -p <<EOF
CREATE DATABASE IF NOT EXISTS $TEST_DB;
EOF

# 4. 恢复数据
mysql -u root -p $TEST_DB < /tmp/restore_test.sql

# 5. 验证数据完整性
mysql -u root -p <<EOF
USE $TEST_DB;
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_schema = '$TEST_DB';
SELECT COUNT(*) as user_count FROM users;
EOF

# 6. 清理测试数据
mysql -u root -p <<EOF
DROP DATABASE IF EXISTS $TEST_DB;
EOF

# 7. 清理临时文件
rm /tmp/restore_test.sql
```

## 7. 系统级安全加固

### 7.1 MySQL 运行用户权限最小化

#### 创建专用 MySQL 用户

```bash
# 1. 创建 mysql 系统用户（通常安装时已创建）
sudo groupadd -r mysql
sudo useradd -r -g mysql -s /bin/false -d /var/lib/mysql mysql

# 2. 设置数据目录所有权
sudo chown -R mysql:mysql /var/lib/mysql
sudo chown -R mysql:mysql /var/log/mysql
sudo chown -R mysql:mysql /etc/mysql

# 3. 确保 MySQL 用户没有 shell 访问权限
sudo usermod -s /bin/false mysql

# 4. 验证用户配置
id mysql
# 应该显示：uid=xxx(mysql) gid=xxx(mysql) groups=xxx(mysql)
```

### 7.2 my.cnf 文件权限设置

```bash
# 1. 设置配置文件权限（只有 root 和 mysql 用户可以读取）
sudo chown root:mysql /etc/mysql/my.cnf
sudo chmod 640 /etc/mysql/my.cnf

# 2. 检查配置文件中的敏感信息
sudo grep -E "(password|passwd)" /etc/mysql/my.cnf
# 如果发现明文密码，应该移除并使用其他方式（如 .my.cnf）

# 3. 保护 .my.cnf 文件（如果存在）
sudo chmod 600 ~/.my.cnf
sudo chown $USER:$USER ~/.my.cnf
```

### 7.3 数据目录权限加固

```bash
# 1. 设置数据目录权限
sudo chown -R mysql:mysql /var/lib/mysql
sudo chmod 750 /var/lib/mysql

# 2. 设置日志目录权限
sudo chown -R mysql:mysql /var/log/mysql
sudo chmod 750 /var/log/mysql

# 3. 保护二进制日志
sudo chmod 640 /var/lib/mysql/binlog.*
sudo chown mysql:mysql /var/lib/mysql/binlog.*

# 4. 保护错误日志
sudo chmod 640 /var/log/mysql/error.log
sudo chown mysql:mysql /var/log/mysql/error.log

# 5. 使用 find 检查权限
sudo find /var/lib/mysql -type f ! -perm 640 -ls
sudo find /var/lib/mysql -type d ! -perm 750 -ls
```

### 7.4 SELinux/AppArmor 配置

#### SELinux 配置（CentOS/RHEL）

```bash
# 1. 检查 SELinux 状态
getenforce
# 应该显示：Enforcing

# 2. 设置 MySQL SELinux 上下文
sudo semanage fcontext -a -t mysqld_db_t "/var/lib/mysql(/.*)?"
sudo restorecon -R /var/lib/mysql

# 3. 允许 MySQL 网络连接
sudo setsebool -P mysql_connect_any on

# 4. 查看 MySQL 相关的 SELinux 布尔值
getsebool -a | grep mysql
```

#### AppArmor 配置（Ubuntu/Debian）

```bash
# 1. 检查 AppArmor 状态
sudo aa-status | grep mysql

# 2. MySQL AppArmor 配置文件通常位于：
# /etc/apparmor.d/usr.sbin.mysqld

# 3. 编辑配置文件（如果需要自定义）
sudo vim /etc/apparmor.d/usr.sbin.mysqld

# 4. 重新加载 AppArmor 配置
sudo systemctl reload apparmor
```

### 7.5 关键参数安全配置

#### 禁用危险功能

```ini
# /etc/my.cnf

[mysqld]
# 1. 禁用 LOAD DATA LOCAL INFILE（防止读取客户端文件）
local_infile = OFF

# 2. 限制文件操作目录
secure_file_priv = /var/lib/mysql-files/
# 注意：需要创建目录并设置权限
# sudo mkdir -p /var/lib/mysql-files
# sudo chown mysql:mysql /var/lib/mysql-files
# sudo chmod 750 /var/lib/mysql-files

# 3. 禁用符号链接（防止目录遍历攻击）
symbolic-links = 0

# 4. 禁用旧密码哈希（MySQL 8.0+）
# old_passwords = 0  # 已废弃

# 5. 限制用户连接数
max_connections = 500
max_user_connections = 20

# 6. 查询超时控制
max_execution_time = 30000  # 30秒（毫秒）
wait_timeout = 600
interactive_timeout = 600

# 7. 禁用不安全的函数
# 注意：某些函数可能被应用使用，需要谨慎禁用
# disable_functions = LOAD_FILE,INTO OUTFILE
```

#### 验证配置

```sql
-- 1. 检查 local_infile 状态
SHOW VARIABLES LIKE 'local_infile';
-- 应该显示：OFF

-- 2. 检查 secure_file_priv
SHOW VARIABLES LIKE 'secure_file_priv';
-- 应该显示：/var/lib/mysql-files/

-- 3. 检查符号链接
SHOW VARIABLES LIKE 'symbolic_links';
-- 应该显示：OFF

-- 4. 检查连接限制
SHOW VARIABLES LIKE 'max_connections';
SHOW VARIABLES LIKE 'max_user_connections';

-- 5. 检查超时设置
SHOW VARIABLES LIKE '%timeout%';
```

## 8. 高级防护技术

### 8.1 连接限制与 DDoS 防护

#### 连接限制配置

```ini
# /etc/my.cnf

[mysqld]
# 1. 全局连接限制
max_connections = 500
max_connect_errors = 10  # 超过10次错误连接后拒绝

# 2. 连接超时
connect_timeout = 10
wait_timeout = 600
interactive_timeout = 600

# 3. 线程缓存
thread_cache_size = 50
```

#### 使用 fail2ban 防护

```ini
# /etc/fail2ban/jail.local

[mysql]
enabled = true
port = 3306
filter = mysql
logpath = /var/log/mysql/error.log
maxretry = 3
bantime = 3600
findtime = 600

[mysql-auth]
enabled = true
port = 3306
filter = mysql-auth
logpath = /var/log/mysql/error.log
maxretry = 5
bantime = 86400
```

```ini
# /etc/fail2ban/filter.d/mysql.conf

[Definition]
failregex = ^.*Access denied for user.*from <HOST>.*$
            ^.*Failed password for.*from <HOST>.*$
ignoreregex =
```

### 8.2 查询超时控制

```sql
-- 1. 设置全局查询超时（MySQL 5.7.8+）
SET GLOBAL max_execution_time = 30000;  -- 30秒

-- 2. 设置会话级查询超时
SET SESSION max_execution_time = 10000;  -- 10秒

-- 3. 在查询中指定超时
SELECT /*+ MAX_EXECUTION_TIME(5000) */ * FROM large_table;

-- 4. 查看长时间运行的查询
SELECT 
  id,
  user,
  host,
  db,
  command,
  time,
  state,
  LEFT(info, 100) as query
FROM information_schema.processlist
WHERE time > 30
  AND command != 'Sleep'
ORDER BY time DESC;

-- 5. 杀死长时间运行的查询
KILL QUERY <process_id>;
```

### 8.3 资源组管理（MySQL 8.0+）

```sql
-- 1. 创建资源组
CREATE RESOURCE GROUP app_group
  TYPE = USER
  VCPU = 0-3
  THREAD_PRIORITY = 5;

CREATE RESOURCE GROUP report_group
  TYPE = USER
  VCPU = 4-7
  THREAD_PRIORITY = 10;

-- 2. 将用户分配到资源组
ALTER USER 'app_user'@'%' RESOURCE GROUP app_group;
ALTER USER 'report_user'@'%' RESOURCE GROUP report_group;

-- 3. 在查询中使用资源组
SELECT /*+ RESOURCE_GROUP(app_group) */ * FROM users;

-- 4. 查看资源组配置
SELECT * FROM information_schema.RESOURCE_GROUPS;
```

### 8.4 读写分离安全架构

#### 主从复制安全配置

```ini
# 主服务器配置
[mysqld]
server-id = 1
log-bin = /var/log/mysql/binlog
binlog-format = ROW
binlog-row-image = FULL

# 从服务器配置
[mysqld]
server-id = 2
relay-log = /var/log/mysql/relaylog
read-only = ON
super-read-only = ON  # MySQL 5.7.8+
```

```sql
-- 1. 创建复制用户（主服务器）
CREATE USER 'repl_user'@'10.0.2.%' 
IDENTIFIED WITH caching_sha2_password 
BY 'Repl@Pass2025!#$'
REQUIRE SSL;

GRANT REPLICATION SLAVE ON *.* 
TO 'repl_user'@'10.0.2.%';

-- 2. 配置从服务器
CHANGE MASTER TO
  MASTER_HOST='10.0.1.100',
  MASTER_USER='repl_user',
  MASTER_PASSWORD='Repl@Pass2025!#$',
  MASTER_SSL=1,
  MASTER_SSL_CA='/etc/mysql/ssl/ca.pem',
  MASTER_SSL_CERT='/etc/mysql/ssl/client-cert.pem',
  MASTER_SSL_KEY='/etc/mysql/ssl/client-key.pem';

START SLAVE;

-- 3. 检查复制状态
SHOW SLAVE STATUS\G
```

### 8.5 数据库审计自动化

#### 自动化安全检查脚本

```bash
#!/bin/bash
# mysql_security_audit.sh

echo "=== MySQL 安全审计报告 ==="
echo "生成时间: $(date)"
echo ""

echo "1. 检查匿名用户"
mysql -u root -p -e "SELECT user, host FROM mysql.user WHERE user = '';" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "❌ 发现匿名用户"
else
    echo "✅ 无匿名用户"
fi

echo ""
echo "2. 检查 root 远程访问"
mysql -u root -p -e "SELECT user, host FROM mysql.user WHERE user = 'root' AND host != 'localhost' AND host != '127.0.0.1';" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "❌ root 用户可以远程访问"
else
    echo "✅ root 用户只能本地访问"
fi

echo ""
echo "3. 检查弱密码用户"
mysql -u root -p -e "SELECT user, host, password_expired FROM mysql.user WHERE password_expired = 'N' OR password_expired IS NULL;" 2>/dev/null

echo ""
echo "4. 检查危险权限"
mysql -u root -p -e "SELECT user, host, Super_priv, File_priv, Process_priv FROM mysql.user WHERE Super_priv='Y' OR File_priv='Y' OR Process_priv='Y';" 2>/dev/null

echo ""
echo "5. 检查 SSL 配置"
mysql -u root -p -e "SHOW VARIABLES LIKE '%ssl%';" 2>/dev/null

echo ""
echo "6. 检查审计日志"
if [ -f /var/log/mysql/audit.log ]; then
    echo "✅ 审计日志已启用"
    echo "最近10条记录:"
    tail -10 /var/log/mysql/audit.log
else
    echo "❌ 审计日志未启用"
fi

echo ""
echo "=== 审计完成 ==="
```

## 9. 生产环境安全配置清单

### 9.1 完整 my.cnf 安全模板

```ini
# /etc/mysql/my.cnf
# MySQL 生产环境安全配置模板

[mysqld]
# ========== 基本配置 ==========
port = 3306
bind-address = 127.0.0.1  # 只监听本地，通过跳板机访问
datadir = /var/lib/mysql
socket = /var/run/mysqld/mysqld.sock
pid-file = /var/run/mysqld/mysqld.pid

# ========== 认证安全 ==========
default_authentication_plugin = caching_sha2_password
validate_password.policy = STRONG
validate_password.length = 16
validate_password.mixed_case_count = 2
validate_password.lower_case_count = 2
validate_password.number_count = 2
validate_password.special_char_count = 2

# ========== SSL/TLS 加密 ==========
ssl-ca = /etc/mysql/ssl/ca.pem
ssl-cert = /etc/mysql/ssl/server-cert.pem
ssl-key = /etc/mysql/ssl/server-key.pem
require_secure_transport = ON
tls_version = TLSv1.2,TLSv1.3

# ========== 数据加密 ==========
early-plugin-load = keyring_file.so
keyring_file_data = /var/lib/mysql-keyring/keyring

# ========== 连接限制 ==========
max_connections = 500
max_connect_errors = 10
max_user_connections = 20
connect_timeout = 10
wait_timeout = 600
interactive_timeout = 600

# ========== 查询超时 ==========
max_execution_time = 30000

# ========== 文件安全 ==========
local_infile = OFF
secure_file_priv = /var/lib/mysql-files/
symbolic-links = 0

# ========== 日志配置 ==========
# 通用日志（生产环境通常关闭）
general_log = OFF
general_log_file = /var/log/mysql/general.log

# 慢查询日志
slow_query_log = ON
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
log_queries_not_using_indexes = ON
log_slow_admin_statements = ON

# 错误日志
log_error = /var/log/mysql/error.log
log_error_verbosity = 2

# 二进制日志
log-bin = /var/log/mysql/binlog
binlog-format = ROW
binlog-row-image = FULL
expire_logs_days = 7
max_binlog_size = 100M

# ========== 审计日志 ==========
plugin-load = server_audit=server_audit.so
server_audit_events = CONNECT,QUERY,TABLE
server_audit_logging = ON
server_audit_file_path = /var/log/mysql/audit.log
server_audit_file_rotate_size = 100000000
server_audit_file_rotations = 10

# ========== 性能优化 ==========
innodb_buffer_pool_size = 4G
innodb_log_file_size = 512M
innodb_flush_log_at_trx_commit = 1
innodb_file_per_table = ON

# ========== 字符集 ==========
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

[client]
default-character-set = utf8mb4
ssl-mode = REQUIRED
```

### 9.2 安全检查脚本

```bash
#!/bin/bash
# comprehensive_security_check.sh

MYSQL_USER="root"
MYSQL_PASS=""
REPORT_FILE="/tmp/mysql_security_report_$(date +%Y%m%d).txt"

echo "MySQL 安全配置全面检查报告" > $REPORT_FILE
echo "生成时间: $(date)" >> $REPORT_FILE
echo "========================================" >> $REPORT_FILE
echo ""

# 1. 检查匿名用户
echo "1. 匿名用户检查" >> $REPORT_FILE
mysql -u $MYSQL_USER -p$MYSQL_PASS -e "SELECT COUNT(*) as anonymous_users FROM mysql.user WHERE user = '';" >> $REPORT_FILE 2>&1

# 2. 检查 root 远程访问
echo "" >> $REPORT_FILE
echo "2. Root 远程访问检查" >> $REPORT_FILE
mysql -u $MYSQL_USER -p$MYSQL_PASS -e "SELECT user, host FROM mysql.user WHERE user = 'root' AND host != 'localhost' AND host != '127.0.0.1';" >> $REPORT_FILE 2>&1

# 3. 检查密码策略
echo "" >> $REPORT_FILE
echo "3. 密码策略检查" >> $REPORT_FILE
mysql -u $MYSQL_USER -p$MYSQL_PASS -e "SHOW VARIABLES LIKE 'validate_password%';" >> $REPORT_FILE 2>&1

# 4. 检查 SSL 配置
echo "" >> $REPORT_FILE
echo "4. SSL 配置检查" >> $REPORT_FILE
mysql -u $MYSQL_USER -p$MYSQL_PASS -e "SHOW VARIABLES LIKE '%ssl%'; SHOW STATUS LIKE 'Ssl%';" >> $REPORT_FILE 2>&1

# 5. 检查危险权限
echo "" >> $REPORT_FILE
echo "5. 危险权限检查" >> $REPORT_FILE
mysql -u $MYSQL_USER -p$MYSQL_PASS -e "SELECT user, host, Super_priv, File_priv, Process_priv, Grant_priv FROM mysql.user WHERE Super_priv='Y' OR File_priv='Y' OR Process_priv='Y';" >> $REPORT_FILE 2>&1

# 6. 检查文件权限
echo "" >> $REPORT_FILE
echo "6. 文件权限检查" >> $REPORT_FILE
mysql -u $MYSQL_USER -p$MYSQL_PASS -e "SHOW VARIABLES LIKE 'local_infile'; SHOW VARIABLES LIKE 'secure_file_priv';" >> $REPORT_FILE 2>&1

# 7. 检查审计日志
echo "" >> $REPORT_FILE
echo "7. 审计日志检查" >> $REPORT_FILE
mysql -u $MYSQL_USER -p$MYSQL_PASS -e "SHOW VARIABLES LIKE 'server_audit%';" >> $REPORT_FILE 2>&1

# 8. 检查连接限制
echo "" >> $REPORT_FILE
echo "8. 连接限制检查" >> $REPORT_FILE
mysql -u $MYSQL_USER -p$MYSQL_PASS -e "SHOW VARIABLES LIKE 'max_connections'; SHOW VARIABLES LIKE 'max_connect_errors';" >> $REPORT_FILE 2>&1

echo "" >> $REPORT_FILE
echo "========================================" >> $REPORT_FILE
echo "检查完成，报告保存在: $REPORT_FILE" >> $REPORT_FILE

cat $REPORT_FILE
```

### 9.3 应急响应流程

#### 安全事件响应清单

```bash
#!/bin/bash
# incident_response.sh

# MySQL 安全事件应急响应脚本

INCIDENT_LOG="/var/log/mysql/incident_$(date +%Y%m%d_%H%M%S).log"

echo "=== MySQL 安全事件应急响应 ===" | tee $INCIDENT_LOG
echo "时间: $(date)" | tee -a $INCIDENT_LOG
echo ""

# 1. 立即断开可疑连接
echo "1. 断开所有活动连接（除了当前会话）" | tee -a $INCIDENT_LOG
mysql -u root -p <<EOF | tee -a $INCIDENT_LOG
SELECT CONCAT('KILL ', id, ';') as kill_commands
FROM information_schema.processlist
WHERE user != 'system_user'
  AND id != CONNECTION_ID();
EOF

# 2. 启用详细日志
echo "" | tee -a $INCIDENT_LOG
echo "2. 启用详细日志" | tee -a $INCIDENT_LOG
mysql -u root -p <<EOF | tee -a $INCIDENT_LOG
SET GLOBAL general_log = ON;
SET GLOBAL log_queries_not_using_indexes = ON;
SET GLOBAL long_query_time = 0;
EOF

# 3. 备份当前状态
echo "" | tee -a $INCIDENT_LOG
echo "3. 备份当前用户和权限" | tee -a $INCIDENT_LOG
mysqldump -u root -p mysql user db tables_priv columns_priv procs_priv > /backup/mysql_privileges_$(date +%Y%m%d_%H%M%S).sql

# 4. 检查异常活动
echo "" | tee -a $INCIDENT_LOG
echo "4. 检查异常活动" | tee -a $INCIDENT_LOG
mysql -u root -p <<EOF | tee -a $INCIDENT_LOG
SELECT * FROM information_schema.processlist 
WHERE command != 'Sleep' 
ORDER BY time DESC;
EOF

# 5. 检查最近修改
echo "" | tee -a $INCIDENT_LOG
echo "5. 检查最近创建的用户" | tee -a $INCIDENT_LOG
mysql -u root -p <<EOF | tee -a $INCIDENT_LOG
SELECT user, host, password_last_changed, account_locked 
FROM mysql.user 
WHERE password_last_changed > DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY password_last_changed DESC;
EOF

echo "" | tee -a $INCIDENT_LOG
echo "=== 应急响应完成 ===" | tee -a $INCIDENT_LOG
echo "日志保存在: $INCIDENT_LOG" | tee -a $INCIDENT_LOG
```

## 10. 总结与最佳实践

### 10.1 安全配置核心要点

1. **认证安全**
   - 使用 `caching_sha2_password` 认证插件
   - 启用强密码策略
   - 删除匿名用户和测试数据库
   - 限制 root 用户只能本地访问

2. **网络安全**
   - 只监听本地接口（127.0.0.1）
   - 使用防火墙限制访问
   - 通过跳板机访问数据库
   - 使用 SSL/TLS 加密传输

3. **数据加密**
   - 启用 SSL/TLS 传输加密
   - 使用 InnoDB 表空间加密
   - 加密备份文件
   - 加密二进制日志

4. **审计与监控**
   - 启用审计日志
   - 配置慢查询日志
   - 监控异常活动
   - 定期审计用户权限

5. **应用安全**
   - 使用预处理语句防止 SQL 注入
   - 实施最小权限原则
   - 输入验证和过滤
   - WAF 集成

6. **备份安全**
   - 加密备份文件
   - 安全的备份存储
   - 定期恢复演练
   - 异地容灾

7. **系统加固**
   - 最小化 MySQL 用户权限
   - 保护配置文件和日志
   - 禁用危险功能
   - SELinux/AppArmor 配置

### 10.2 常见安全误区

1. **误区 1：修改端口就是安全**
   - 事实：端口扫描很容易发现非标准端口
   - 正确做法：使用防火墙和访问控制

2. **误区 2：内网就是安全的**
   - 事实：内网攻击同样危险
   - 正确做法：实施纵深防御策略

3. **误区 3：SSL 配置复杂就不用了**
   - 事实：SSL 配置只需要 30 分钟
   - 正确做法：必须启用 SSL/TLS

4. **误区 4：备份不需要加密**
   - 事实：备份文件泄露同样危险
   - 正确做法：所有备份必须加密

5. **误区 5：一次配置终身安全**
   - 事实：安全需要持续维护
   - 正确做法：定期安全审计和更新

### 10.3 安全配置检查清单

- [ ] 删除匿名用户
- [ ] 删除测试数据库
- [ ] root 用户只能本地访问
- [ ] 所有用户使用强密码
- [ ] 启用密码策略验证
- [ ] 使用 caching_sha2_password
- [ ] 只监听 127.0.0.1
- [ ] 配置防火墙规则
- [ ] 启用 SSL/TLS
- [ ] 要求所有连接使用 SSL
- [ ] 启用审计日志
- [ ] 配置慢查询日志
- [ ] 禁用 local_infile
- [ ] 设置 secure_file_priv
- [ ] 限制用户权限（最小权限）
- [ ] 加密敏感表
- [ ] 加密备份文件
- [ ] 设置连接限制
- [ ] 配置查询超时
- [ ] 定期安全审计

### 10.4 延伸阅读资源

- [MySQL 官方安全指南](https://dev.mysql.com/doc/refman/8.0/en/security.html)
- [OWASP 数据库安全](https://owasp.org/www-community/vulnerabilities/Insecure_Database)
- [CIS MySQL Benchmark](https://www.cisecurity.org/benchmark/mysql)
- [MySQL 安全最佳实践白皮书](https://www.mysql.com/why-mysql/white-papers/)

---

**作者**: PFinal南丞  
**最后更新**: 2025-12-22  
**许可**: 本文遵循 CC BY-NC-SA 4.0 许可协议

