---
title: "Tailscale 自建 DERP 中继服务器实战 2026"
description: "Tailscale 国内自建 DERP 中继服务器完整部署，1 核 1G 云主机 + Docker + 反向代理，延迟从 250ms 降到 20ms"
date: 2026-06-23
category: devops
tags: [tailscale, derp, wireguard, vpn, 自建]
---

# Tailscale 自建 DERP 中继服务器实战 2026

> TL;DR：Tailscale 默认 DERP 服务器在境外，国内访问延迟 200-300ms。自建国内 DERP 后延迟降至 20ms。本文给出 1 核 1G 云主机 + Docker 完整部署方案，附 Headscale 对比。

## 一、为什么需要自建 DERP

### 1.1 Tailscale 的连接策略

```
1. 节点间直接 P2P（最优，延迟 < 5ms）
2. 通过 DERP 中继（兜底，走 UDP 443）
```

国内 P2P 打洞成功率约 30-60%，多数情况下走 DERP。官方 DERP 服务器在境外，丢包和延迟都很高。

### 1.2 自建 DERP 收益

| 场景 | 官方 DERP | 自建 DERP |
|------|---------|----------|
| 国内节点 P50 延迟 | 250ms | **20ms** |
| 视频会议卡顿率 | 8% | 0.5% |
| 月度带宽成本（10 节点） | $0 | ¥30 云主机 |

## 二、准备工作

- 一台国内云主机（阿里云/腾讯云 1 核 1G 即可）
- 公网 IP + 域名（推荐）
- Tailscale account（免费版即可）

## 三、Docker 部署 DERP

### 3.1 docker-compose.yml

```yaml
version: "3.8"
services:
  derper:
    image: ghcr.io/tailscale/derper:latest
    container_name: tailscale-derper
    restart: always
    ports:
      - "443:443"        # HTTPS + STUN
      - "3478:3478/udp"  # STUN
    volumes:
      - ./certs:/var/lib/derper/certs
    environment:
      - DERP_DOMAIN=derp.your-domain.com
      - DERP_CERT_DIR=/var/lib/derper/certs
      - DERP_VERIFY_CLIENTS=true
    command: /derper --hostname=derp.your-domain.com --certmode=letsencrypt --certdir=/var/lib/derper/certs --verify-clients=true
```

### 3.2 启动

docker compose up -d

### 3.3 防火墙

放通 TCP 443 + UDP 3478 + UDP 443（QUIC 模式需要）

## 四、域名 + 证书

### 4.1 自动 Let's Encrypt

DERP 自动通过 Let's Encrypt 申请证书（前提：域名解析到云主机公网 IP 且 80 端口可达）。

### 4.2 自带证书

```bash
mkdir -p certs
cp your-cert.pem certs/derp.your-domain.com.crt
cp your-key.pem certs/derp.your-domain.com.key
```

修改 docker-compose 中 certmode=manual。

## 五、客户端配置

### 5.1 macOS / Windows

默认会同时用官方 DERP + 自定义 DERP，无需额外配置。

### 5.2 Linux / 路由器（OpenWrt）

在 `/etc/tailscale/tailscaled.state` 或 ACL 中指定：

```json
{
  "derpMap": {
    "Regions": {
      "900": {
        "RegionID": 900,
        "RegionCode": "selfhost",
        "RegionName": "My DERP",
        "Nodes": [
          {
            "Name": "derp-1",
            "RegionID": 900,
            "HostName": "derp.your-domain.com"
          }
        ]
      }
    }
  }
}
```

也可通过 `tailscale set --derp-map=path/to/derp-map.json` 动态加载。

### 5.3 Headscale 用户

Headscale 自带 DERP map 配置，在 `config.yaml`：

```yaml
derp:
  server:
    enabled: true
    region_id: 900
    stun_listen_addr: "0.0.0.0:3478"
  urls: []
  paths:
    - /etc/headscale/derp.yaml
  auto_update_enabled: true
```

## 六、监控与维护

### 6.1 关键指标

- DERP 连接数：tailscale status 看 active connections
- STUN 打洞成功率：headscale 日志
- 延迟：tailscale ping 节点

### 6.2 限流配置

Docker 命令加 `--ratelimit=10000` 限制每秒中继流量。

### 6.3 多 DERP 高可用

部署 2-3 台跨区域 DERP，自动负载均衡。Tailscale 客户端会基于延迟选最近节点。

## 七、与 Headscale 对比

| 维度 | Tailscale SaaS | Headscale + 自建 DERP |
|------|---------------|---------------------|
| 价格 | 免费 100 设备 | 完全免费（自建） |
| 控制面板 | Web UI | 命令行 + 自建 UI |
| Magic DNS | 内置 | 需自配 CoreDNS |
| 自定义 DERP | 支持 | 必配 |
| 国内访问 | 慢 | 快 |

**推荐**：5 设备以下用 Tailscale SaaS，5 设备以上或国内为主用 Headscale。

## 八、常见问题

Q：自建 DERP 会被官方屏蔽吗？
A：不会。自建 DERP 不影响官方 DERP，两者并存。

Q：是否需要打开 P2P 端口？
A：不需要。自建 DERP 用 443/3478 端口即可。

Q：跨云厂商可以互通吗？
A：可以。只要 DERP 公网可达，所有 Tailscale 节点都能用。

Q：带宽和 CPU 占用？
A：1 核 1G 可支撑 50 个中继节点，10Mbps 带宽足够。

## 九、参考

- Tailscale 官方 DERP 文档
- Headscale GitHub
- 腾讯云 DERP 部署教程 2026-06-14

系列导航：零信任 SPIFFE → HTTP/3 QUIC → 本篇
