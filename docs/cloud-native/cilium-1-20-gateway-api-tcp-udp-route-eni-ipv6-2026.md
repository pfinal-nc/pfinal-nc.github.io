---
title: "Cilium 1.20 发布：Gateway API 一统南北向流量，ENI IPAM 补齐 IPv6"
date: 2026-09-15
tags:
  - cilium
  - kubernetes
  - ebpf
  - gateway-api
  - cloud-native
keywords:
  - Cilium 1.20
  - Gateway API ExternalAuth
  - TCPRoute UDPRoute
  - ENI IPAM IPv6
  - eBPF 网络
  - netkit
category: devops
description: "Cilium 1.20（2026-09-14 发布，2026 年第二大版本）三大主题：Gateway API 从 v1.4 跃升至 v1.6（ExternalAuth 认证过滤器、TCPRoute/UDPRoute、ListenerSets、CORS）、Datapath Plugins 让云厂商扩展 eBPF 数据平面、ENI IPAM IPv6 Beta 补齐 AWS 双栈。附配置示例与 1.19 对比表。"
recommend: 云原生
---
# Cilium 1.20 发布：Gateway API 一统南北向流量，ENI IPAM 补齐 IPv6

> TL;DR：Cilium 1.20（2026-09-14）是 2026 年第二个大版本，三大主题：**Gateway API 从 v1.4 直接跳到 v1.6**（ExternalAuth 外部认证过滤器、TCPRoute/UDPRoute 原生 L4 路由、ListenerSets、CORS）；**Datapath Plugins（Beta）** 把 Cilium 从"封闭网络设备"变成可扩展的"网络操作系统"；**ENI IPAM IPv6（Beta）** 补上 AWS 双栈四年的功能缺口。另有 CNI 二进制从 76MB 瘦身到 16MB、netkit 自动选择、MCS API 转正等运维友好改进。

## 一、主题一：Gateway API 成为更广义的流量管理层

Cilium 1.19 支持 Gateway API v1.4，1.20 直接跃升至 **v1.6**，一次拿下四个毕业特性。核心叙事是：**南北向流量的认证、路由、协议覆盖，统一收敛到同一个 API 模型里**。

### 1.1 ExternalAuth：网关层的原生认证钩子

此前在 Cilium 里做请求级用户认证，得去定制内置 Envoy。1.20 支持 [GEP-1494](https://gateway-api.sigs.k8s.io/geps/gep-1494/) 的 ExternalAuth filter，直接附加在 HTTPRoute 上：每个匹配请求先送外部授权服务裁决——

- `200` → 转发到后端（可注入 `Remote-User` 等身份头）；
- `302` → 重定向（比如 SSO 登录页）；
- `401/403` → 网关直接拦截。

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
spec:
  rules:
    - filters:
        - type: ExternalAuth
          externalAuth:
            protocol: HTTP
            backendRef:
              name: authelia
              port: 80
```

一个 filter 覆盖三类调用方：浏览器用户（重定向到 Authelia/Duo）、CI 脚本（JWT 交 oauth2-proxy 验证）、AI Agent（服务账号客户端认证）。最后这一类是 2026 年的新常态——Agent 流量的认证边界正在成为每个网关的必答题。

### 1.2 TCPRoute / UDPRoute：L4 服务不再"退出模型"

数据库、消息队列、DNS、游戏服务器这些纯 TCP/UDP 服务，此前在 Gateway API 体系里没有位置，只能退回裸 LoadBalancer/NodePort，认证、策略、可观测全部另起炉灶。1.20 支持 [GEP-2644](https://gateway-api.sigs.k8s.io/geps/gep-2644/) TCPRoute 与 [GEP-2645](https://gateway-api.sigs.k8s.io/geps/gep-2645/) UDPRoute 后，**HTTP、TCP、UDP 路由可以挂同一个 Gateway**（比如 80/27017/53 三个端口共用一个入口地址），L4 流量第一次进入统一管理平面。

### 1.3 ListenerSets 与 CORS

- **ListenerSets**：应用团队从自己的命名空间附加额外 Listener，共享父 Gateway 的地址与基础设施；平台团队用标签控制哪些命名空间可扩展——多租户下"平台管入口、团队管路由"的分工有了标准解法；
- **CORS filter**：允许源、方法、头部、凭证、缓存时间直接在 HTTPRoute 声明，不用再写 EnvoyConfig。

## 二、主题二：Datapath Plugins——从设备到操作系统

由 Google 贡献的 **Datapath Plugins（Beta）** 是本版最有想象空间的变化：第三方可以用 `CiliumDatapathPlugin` CRD 注册自己的 eBPF 数据平面插件，**以独立进程/镜像运行，崩溃不影响 Cilium agent，也不需要 fork Cilium**。

定位变化很清晰：Cilium 核心数据平面保持稳定，扩展能力外置——云厂商可以带自己的 eBPF 程序进来，且按自己的节奏发布。这是"网络设备"到"网络操作系统"的转变。

配套的运维甜点：

- **netkit auto**（`bpf.datapathMode=auto`）：agent 启动时探测内核，≥6.8 自动用 netkit，否则回退 veth——混合内核版本集群不再需要按节点配数据路径；
- **cilium-cni 二进制 76MB → 16MB**（-79%），节点初始化和镜像分发明显变轻。

## 三、主题三：ENI IPAM IPv6——AWS 双栈补课

AWS ENI IPAM 模式（Pod 拿真实 VPC 地址）此前只支持 IPv4，这是提了四年的已知缺口。1.20 以 **Beta** 补齐：operator 通过 Prefix Delegation 给每个节点的 ENI 附加 IPv6 `/80` 前缀，agent 从中给 Pod 分配地址（由 Datadog 构建）：

```yaml
ipam:
  mode: eni
eni:
  enabled: true
ipv6:
  enabled: true
```

启用后 EKS 上的 Pod 直接双栈启动（如 `192.168.128.71, 2a05:d01c:38d:4c02:909e::e771`）。

## 四、1.19 → 1.20 速览

| 维度 | 变化 |
|------|------|
| Gateway API | v1.4 → v1.6：ExternalAuth / TCPRoute / UDPRoute / ListenerSets / CORS |
| ENI IPAM | 仅 IPv4 → IPv6 Beta（双栈） |
| ztunnel mTLS | CA 可配 `internal`/`spire`，新增指标；**legacy Mutual Authentication 标记弃用** |
| MCS API | Beta → **Stable**（`multicluster.x-k8s.io/v1beta1`，CRD 自动安装） |
| Multi-pool IPAM | 新增 cluster-pool **原地迁移**路径（operator 选项），不再强制重建集群 |
| ClusterNetworkPolicy | 新增 KCNP 支持（Admin/Baseline 分层） |
| CNI 二进制 | 76MB → 16MB |

## 五、升级视角

- **ztunnel 用户**：如果还在用 legacy Mutual Authentication，1.20 已弃用，规划切到 ztunnel（1.19 引入的无 sidecar mTLS）；
- **cluster-pool 用户**：想迁 multi-pool 的，原地迁移选项终于来了，先在预发验证；
- **Gateway API 用户**：v1.4 → v1.6 是跨两个版本的大跳，HTTPRoute 现有配置向后兼容，但建议对照 v1.6 变更日志过一遍 CRD；
- **多租户平台**：ListenerSets + KCNP 组合值得评估，入口基础设施共享 + 集群级策略分层的架构可以简化不少。

我们在[eBPF 可观测性实战](/cloud-native/ebpf-observability-cilium-hubble-tetragon-2026)里讨论过 Cilium/Hubble/Tetragon 的观测三板斧——1.20 之后，"网络策略 + 认证 + L4 路由"也开始在同一张牌桌上打。

## 相关阅读

- [eBPF + Go 云原生可观测性零侵入监控实战](/cloud-native/ebpf-observability-cilium-hubble-tetragon-2026)
- [Kubernetes 1.37 正式发布要点](/devops/kubernetes-1-37-release-highlights-2026)
- [Kubernetes Agent Sandbox 深度实战](/devops/kubernetes-agent-sandbox-crd-2026)
- [KYAML 实战：KEP-5295 新配置方言](/devops/kyaml-kubernetes-yaml-dialect-kep-5295-2026)
- [Platform Engineering 2026：Backstage IDP 实战](/devops/platform-engineering-backstage-idp-2026)

---

*参考：[Cilium 1.20 发布博客（CNCF，2026-09-14）](https://www.cncf.io/blog/2026/09/14/cilium-1-20-gateway-api-externalauth-tcproute-udproute-eni-ipam-for-ipv6-and-more/)，作者 Nico Vibert、Donia Chaiehloudj。*
