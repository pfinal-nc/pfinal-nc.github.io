---
title: kube-proxy IPVS 后端 1.40 移除：迁移 nftables 实战清单
date: 2026-11-20 07:30:00
author: PFinal南丞
tags:
  - devops
  - kubernetes
  - kube-proxy
  - nftables
  - 网络
description: kube-proxy 的 ipvs 后端自 1.35 弃用、1.40 移除，仍在用的集群必须在这个窗口内迁到 nftables 或 iptables。本文拆清 IPVS 与 Service API 的结构性错配，给出模式识别脚本、kubeadm 切换步骤与验证清单，并列出六个迁移坑。
keywords:
  - kube-proxy
  - IPVS
  - nftables
  - Kubernetes 1.40
  - Service 代理
  - kubeadm 迁移
  - conntrack
  - 集群网络
  - KEP-5495
---

> TL;DR：`ipvs` 后端自 **Kubernetes 1.35 起正式弃用**（kube-proxy 启动会打 warning），**1.40 移除**。仍在跑的集群现在就该排期：1.36+ 且内核 ≥5.13 直接切 `nftables`；条件不够就退回 `iptables`——但**回退必须重启节点，不是只重启 kube-proxy**。本文给你先辨认模式、再切换、最后验证的完整清单。

## 一、时间线：两个版本窗口，一次架构清理

11 月 16 日，SIG Network 的 Dan Winship 在 Kubernetes 官方博客给出明确排期：`ipvs` 后端弃用、`nftables` 接棒。这不是临时决定，而是五年前就开始铺垫的收尾动作。站内的 [K8s 1.37 预览](/devops/kubernetes-1-37-deep-preview-hpa-scale-to-zero-ipvs-deprecation-dra-2026) 与 [1.37 正式发布解读](/devops/kubernetes-1-37-release-highlights-2026) 都提过 IPVS 退场，这次等来的是确定的版本号——1.35 弃用、1.40 移除，倒计时正式进入读秒。

| 时间 | 版本 | 事件 |
|---|---|---|
| 2017 | — | 引入 `ipvs` 后端，定位是"修 iptables 的性能问题" |
| 2024 | 1.29 | 引入 `nftables` 后端（Beta） |
| — | 1.33 | `nftables` 后端 GA |
| — | 1.35 | `ipvs` 后端**正式弃用**，运行时输出 deprecation warning |
| — | 1.40 | `ipvs` 后端**移除** |
| 待定 | — | RHEL 计划移除 iptables API，依赖它的 `ipvs` 后端在 RHEL 上会先行消失 |

对运维来说只有两件事要记：**你的集群现在用哪种 proxyMode**；**你的 Kubernetes 版本和内核版本够不够上 nftables**。这两条决定你到底走哪条迁移路。

## 二、为什么当年选它，为什么现在放弃

理解这段历史，才知道迁移时哪些"功能依赖"是假的。

**iptables 当年的两处硬伤**。数据面上，kube-proxy 为每个 Service IP 写一条匹配规则，新建连接要沿规则链线性匹配，复杂度随 Service 数量线性增长；控制面上更糟——任何一个 Service 或 Endpoint 变动，kube-proxy 都要**重写整个规则集**，处理耗时、内存、CPU 的增长比规则数量本身更快。在超大集群里，kube-proxy 能长期占满一个核只为同步规则。作者的原话说得很直白：控制面问题严重到大多数用户根本撑不到数据面问题显现的规模。

**ipvs 的解法是有效的，但埋了后患**。内核 IPVS 用哈希表查找，数据面自然变快；又因为 IPVS API 本身**没有批量更新接口**，kube-proxy 只能改成增量操作，顺手绕开了"全量重写"。问题恰恰出在这里：没有批量更新，意味着**大规模同时变更时 ipvs 反而更慢**；而 IPVS 能力有限，Service 的大量语义要靠 iptables 兜底，于是又绕回了 iptables 的 O(n) 问题；用 ipset 缓解同样撞上"没有批量更新"这道墙。

**"功能不完整"最终变成了运维成本**。IPVS 只擅长"把连接分发到某个 endpoint"这一件事，而 Service 语义里还有一批不属于负载均衡的内容：健康检查带来的 endpoint 剔除、会话保持、以及节点本地转发相关的判断。这些能力 IPVS API 给不了，kube-proxy 只能一层层用 iptables 和 ipset 补回去。补得越多，同步时要做的事越多，"ipvs 更快"这个前提就越站不住。

**scheduler 的优势基本是幻觉**。很多人用 ipvs 是为了 `rr`/`wrr`/`mh` 这类调度器。但 kube-proxy 是分布式进程，各节点的 IPVS 调度状态**互不共享**，每个节点独立选 endpoint，任何"全局感知"的调度器在这里都退化得和随机差不多。连 Maglev 的 `mh` 也只能在特定两层负载均衡架构里发挥效率，而 kube-proxy 的架构不适合充当那两层中的任何一层。

把三者放在一起看，结构差异一目了然：

| 维度 | iptables（2026 版） | ipvs | nftables |
|---|---|---|---|
| 数据面查找 | 规则链匹配，已做大量精简优化 | 哈希表，快 | 哈希 + 集合，与 ipvs 持平略优 |
| 控制面更新 | 支持增量更新（KEP-3453） | 只能逐条，无批量 | 支持批量与增量 |
| 功能完整性 | 完整（基准实现） | **不完整**，部分语义回落 iptables | 完整（1.33 GA） |
| 大集群同步 | 已明显改善，仍有上限 | 大量变更时反而变慢 | 最好 |
| 外部依赖 | iptables 工具链（RHEL 将移除） | iptables + IPVS + ipset | 内核 nf_tables（5.13+） |
| 长期命运 | 保留 | **1.40 移除** | 官方推荐方向 |

官方对比图给的是新建连接 p50 延迟：nftables 与 ipvs 基本持平（nftables 略低一点点），iptables 明显更高。作者的表述很克制——重点不是"nftables 更快"，而是"**它不比 ipvs 慢**"，这就够了。

## 三、先搞清楚你集群到底跑的是哪种模式

迁移第一步不是改配置，是盘点。三种模式在节点上的痕迹完全不同，别只看 ConfigMap 就下结论（老集群常有"配置写 ipvs、实际早被人临时改过"的情况）。

```bash
# 1) 看 kube-proxy 的配置（kubeadm 集群）
kubectl -n kube-system get cm kube-proxy -o jsonpath='{.data.config\.conf}' \
  | grep -E "mode|scheduler|strictARP|ipvs"

# 2) 看 kube-proxy 日志里有没有弃用告警（1.35+ 才会出现）
kubectl -n kube-system logs ds/kube-proxy --tail=50 \
  | grep -iE "ipvs.*deprecat|deprecated.*ipvs"

# 3) 看节点上的真实痕迹
ipvsadm -Ln | head -20                      # 有输出 → ipvs 在用
iptables-save | grep -c "KUBE-"             # 计数偏高 → iptables 模式
nft list ruleset | grep -c "kube-proxy"     # 非 0 → nftables 模式

# 4) 看版本与内核是否够格切 nftables
kubectl version --short | grep Server
uname -r                                    # 需要 >= 5.13
lsmod | grep -E "^nf_tables"                # 模块是否加载
```

还有两种情况会让排查结论失真，得提前想到：一是**托管控制面**（多数云厂商的托管 K8s）根本不给你看 kube-proxy 的 ConfigMap，只能从节点上的规则痕迹反推；二是**集群早就换成了 eBPF 数据面**（Cilium、Calico eBPF 模式等），kube-proxy 被旁路甚至根本没部署，这类集群压根不在本次变更的影响范围内——先确认"有没有 kube-proxy"，再谈它用什么模式。

盘完建议落一张表：节点名、proxyMode、k8s 版本、内核版本、是否满足 nftables 前提。**混合模式（一部分节点 ipvs、一部分 nftables）在功能上能跑，但排障时会把两套规则语义搅在一起**，盘点时务必标出来。

## 四、迁到 nftables：改一行配置，但验证要按清单来

官方给的前提很明确：**Kubernetes 1.36 及以上 + 内核 5.13 及以上**。为什么卡 1.36 而不是 GA 的 1.33？因为 1.33 之后还有若干性能与规模相关的修复没回移到 1.36 之前。版本不够就别硬上，走 iptables 路线。

内核这条门槛在混合操作系统的集群里最容易踩空：同一个集群里 CentOS 7 系的节点内核还在 3.10，Debian 12 的节点早过了 5.13。建议按内核版本**把节点分池**——够格的池先切 nftables，不够格的池走 iptables，两边各自验证通过后再考虑统一。硬要全集群一次性切到 nftables，等于赌所有节点的内核都达标。

切换本身确实只是改配置。以 kubeadm 集群为例：

```bash
# 编辑 kube-proxy ConfigMap：mode: ipvs → mode: nftables
kubectl -n kube-system edit cm kube-proxy

# 关键：把 ipvs 专属参数一并清掉/替换，否则新后端会忽略或报错
#   scheduler、minSyncPeriod、syncPeriod、strictARP、excludeCIDRs 等旧字段
kubectl -n kube-system get cm kube-proxy -o yaml \
  | sed -n '/ipvs:/,/^ *[a-z]/p'      # 先看清楚有哪些自定义项

# 逐个节点滚动生效（不要一次性全量重启）
kubectl -n kube-system rollout restart ds/kube-proxy
kubectl -n kube-system rollout status ds/kube-proxy --timeout=180s
```

滚动时一次动一个节点，或至少一个可用区，每批之间跑一遍下面的验证。切换后必须确认四件事，缺一件都可能在生产上炸：

```bash
# A. 规则确实由 nftables 生成
sudo nft list ruleset | grep -c "kube-proxy"

# B. ClusterIP 可达（含 headless 与 ExternalName 之外的全部类型）
kubectl run netcheck --rm -it --image=busybox:1.36 --restart=Never -- \
  sh -c 'wget -qO- --timeout=3 http://<clusterip>:<port>/healthz'

# C. NodePort 与 ExternalTrafficPolicy
curl -s -o /dev/null -w "%{http_code}\n" http://<nodeIP>:<nodePort>/
kubectl get svc <name> -o jsonpath='{.spec.externalTrafficPolicy}{"\n"}'

# D. conntrack 是否在增长（连接没被静默丢弃）
sudo conntrack -C   # 或 cat /proc/sys/net/netfilter/nf_conntrack_count
```

## 五、退回 iptables：2026 的 iptables 不是 2017 的 iptables

版本或内核不满足 nftables 前提时，官方建议直接退回 `iptables`。这篇公告里最有价值的一句话大概是标题式的：**"它没你想的那么慢"**。过去几年 iptables 后端做了四类优化：

- 生成规则集时剔除冗余与无意义规则，直接降低数据面延迟；
- 生成代码减少内存分配、避免重复计算同一信息，降低 resync 时的 CPU 与内存；
- 把"先读现状再改成目标状态"换成"**假定现状正确、直接改、失败才回读**"，因为在大集群里**连读取规则集本身都极慢**；
- 在 iptables API 允许范围内只更新发生变化的 Service/Endpoint（KEP-3453）。

回退的操作差异只有一个关键点，但很容易被忽略：

```bash
# 改回 mode: iptables，然后——官方明确建议重启节点，而不是只重启 kube-proxy
kubectl -n kube-system edit cm kube-proxy    # mode: iptables
# 逐节点执行（示例为 kubeadm 场景）
sudo kubeadm upgrade node phase kubelet-config  # 如涉及 kubelet 配置变更
sudo reboot

# 重启后确认没有 IPVS 残留（残留会让"以为切了、其实还在用"）
sudo ipvsadm -Ln | grep -c "TCP"    # 期望 0
sudo ipvsadm --clear                # 仍有残留时清理（务必确认无业务依赖后再执行）
```

为什么要整机重启：kube-proxy 进程重启后，上一套后端写的规则不一定被完全回收，两套规则并存时流量路径会变得难以预测。**重启是最省事的清理手段**，也是官方给的建议。

## 六、迁移期观测与六个坑

迁移不是"改完就完"，要盯住三条指标：Service 新建连接延迟的 p50/p99、kube-proxy 自身的 CPU、以及 `kubeproxy_sync_proxy_rules_duration_seconds`（同步耗时）。在大集群里这条指标比 CPU 更能提前暴露问题。

迁移当天建议留一个明确的观测窗口：切换后 30 分钟内每 5 分钟采样一次，之后放宽到每小时，持续 24 小时。同时把回滚动作写进变更单——**回滚到 ipvs 只需要改回配置加重启**，但要提前想清楚"重启窗口谁来批"，否则真出问题时会被流程卡住。

| 坑 | 表现 | 对策 |
|---|---|---|
| 只改 mode，不清 ipvs 专属参数 | 新后端忽略配置或启动报错 | 逐项对照清理 scheduler/strictARP 等 |
| 版本够 1.33 就切 nftables | 规模化场景下退化 | 必须 1.36+，内核 5.13+ |
| 回退只重启 kube-proxy | 旧 IPVS 规则残留，路径混乱 | 整机重启，重启后 `ipvsadm -Ln` 复核 |
| 一次性全量重启 kube-proxy | 全网瞬时黑洞 | 逐节点或逐可用区滚动 |
| 指望 IPVS scheduler 做全局均衡 | 各节点各自为政，效果等于随机 | 放弃该预期，用外部 LB/服务网格 |
| 忽略 RHEL 的 iptables 退役 | 未来升级后 ipvs 直接不可用 | 提前把 RHEL 节点排到 nftables 路线 |

前两条是"看文档不仔细"造成的，第三条是"以为重启进程等于重启节点"造成的，最后一条是时间维度上的坑——**RHEL 移除 iptables API 这件事，会让 ipvs 后端在 RHEL 上比 1.40 更早消失**。

## 七、结论

- `ipvs` 自 1.35 弃用、1.40 移除，现在是"还有时间但不多了"的窗口期；
- 迁移首选 `nftables`（1.36+ / 内核 5.13+），性能与 ipvs 持平、功能完整、维护成本低；
- 条件不满足就回 `iptables`，它这些年被优化过一轮，且**回退要重启节点**；
- 别再把 IPVS scheduler 当作选型理由，分布式 kube-proxy 下它拿不到全局视图；
- 先把模式盘清楚、把版本和内核核一遍，再谈切换。

站内相关：[Gheist Actions 日志泄露复盘](/devops/gheist-github-actions-log-exfiltration-ci-hardening-2026) 讲的是流水线侧的凭证治理；节点侧可观测性见 [OTel Go SDK 1.32 与 eBPF 注入](/devops/otel-go-sdk-1-32-ebpf-injection-2026)；自建网络入口的另一种思路见 [Tailscale 自建 DERP 中继](/devops/tailscale-selfhost-derp-server-2026)。

## 参考资料

- [Kubernetes Blog: Scheduling the removal of the kube-proxy IPVS backend](https://kubernetes.io/blog/2026/11/16/ipvs-removal/) — Dan Winship（Red Hat），2026-11-16，含时间线、选型分析与两条迁移路径
- [KEP-5495: kube-proxy IPVS deprecation plan](https://kep.k8s.io/5495) — 完整弃用与移除计划
- [Kubernetes 文档：NFTables 模式 for kube-proxy](https://kubernetes.io/docs/reference/networking/virtual-ips/) — 各 proxyMode 的行为差异与配置项
- [Kubernetes 文档：重新配置 kubeadm 集群](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-reconfigure/) — 修改 kube-proxy ConfigMap 与滚动生效方式
- [KEP-3453: Minimize iptables-restore input size](https://kep.k8s.io/3453) — iptables 后端增量更新的设计依据
