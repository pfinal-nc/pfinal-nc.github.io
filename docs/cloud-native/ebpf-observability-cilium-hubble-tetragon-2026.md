---
title: "eBPF 可观测性 2026：Cilium Hubble、Tetragon、Pixie 与零代码自动插桩实战"
description: "深入解析 eBPF 原理与 CO-RE、Cilium Hubble 网络观测、Tetragon 运行时安全、Pixie 自动插桩与 Grafana Beyla，给出 K8s 生产环境三守护进程架构落地与内核版本适配实战"
date: 2026-04-05
tags: [eBPF, 可观测性, Cilium, Hubble, Tetragon, Pixie, Kubernetes, OpenTelemetry]
category: [云原生]
---

# eBPF 可观测性 2026：Cilium Hubble、Tetragon、Pixie 与零代码自动插桩实战

## 可观测性的"为什么"难题

传统可观测性只能回答"什么挂了"，回答不了"为什么"。metrics 告诉你 5xx 飙升，logs 告诉你报错，trace 告诉你慢在哪。但"为什么这个请求昨天 5ms、今天 500ms"——这需要内核级的视野：谁打开的哪个文件、哪个进程发了什么包、一次系统调用停在哪个内核函数。

eBPF（extended Berkeley Packet Filter）就是撬开这层视野的工具。它让可信的代码安全地跑进 Linux 内核，2026 年已经成为 K8s 可观测性的默认技术底座。

## eBPF 为什么能"安全地"改内核

内核模块很强大，但一个 bug 就能 panic 整个内核。eBPF 的答案是**在加载前用一个验证器（verifier）检查每个程序**：

- **没有无限循环**——所有向后跳转必须有界（bounded loops，Linux 5.3+）
- **只有合法内存访问**——指针追踪、范围检查
- **保证终止**——单程序指令上限（Linux 5.2+ 是 100 万条）
- **只能调用白名单 helper**——不能随意调内核函数

验证器通过后，JIT 编译成原生代码挂到 hook 上（kprobe / tracepoint / XDP / TC / uprobe）。结果：**你能写"跑在内核里但搞不挂内核"的代码**。这就是 eBPF 的魔法。

```
用户态                       内核态
 [C 源码]                      [eBPF VM]
    │                             ▲
    ▼                             │
 [Clang/LLVM] ──▶ [eBPF 字节码] ──▶ [Verifier 验证器]
                                  │
                                  ▼
                               [JIT 编译]
                                  │
                                  ▼
                           [kprobe/tracepoint/XDP...]
```

### CO-RE：一份代码到处跑

早期 eBPF 最大的痛点是**内核版本兼容**：内核结构体字段在不同版本偏移不同，`task_struct` 的某个字段在 5.4 是 offset 200、5.10 是 224、6.5 是 248。

老方案（BCC）是在每台机器上用 Clang 现场编译——每个节点要装几百 MB 的 clang + 内核头文件，启动要几秒到几十秒，生产里跑编译器简直是运维噩梦。

CO-RE（Compile Once, Run Everywhere）用 **BTF**（BPF Type Format）解决：编译时把结构体字段引用信息写进字节码，运行时对照当前内核的 `/sys/kernel/btf/vmlinux` 重新计算偏移。**一份字节码，所有内核都能运行**，不用在节点上装编译器。

**前置条件：内核 5.8+ 且开了 BTF。** 检查方法：

```bash
uname -r              # Linux 5.8+
ls /sys/kernel/btf/vmlinux   # 有 BTF 信息
```

## eBPF 可观测性的四件套

### 1. Cilium Hubble：K8s 网络观测

Cilium 用 eBPF 替代了 kube-proxy，Hubble 是它的网络观测层。它能看到**实时服务依赖图**和 **L7 层协议**（HTTP status、method、DNS 流）：

```bash
# 装 Cilium + Hubble
helm install cilium cilium/cilium \
  --version 1.16.0 \
  --namespace kube-system \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true \
  --set hubble.metrics.enableOpenMetrics=true \
  --set hubble.metrics.enabled="{dns,drop,tcp,flow,http}"

# 实时观察流量
cilium hubble port-forward &
hubble observe --namespace prod --follow

# 只看 500 错误
hubble observe --http-status 500 --since 5m --output table
```

Hubble 最大的价值：**不用改任何代码**，就能看到集群里谁在跟谁通信、什么协议、有没有被拒（含 DENY 原因）。配上 Cilium 的 L7 网络策略（HTTP method + path 级），从观测直接到强制。

### 2. Tetragon：运行时安全观测

Tetragon（Cilium 团队，Isovalent 出品）是 **eBPF 安全观测 + 运行时强制**。它和 Falco 的关键区别：Falco 大多基于规则比对日志，Tetragon 基于进程血缘（process ancestry）和同步执行策略。

比如定义一个策略：**阻止任何非 `secure=true` 标签的 pod 执行 `/tmp/*.sh`**：

```yaml
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: block-tmp-script-exec
spec:
  kprobes:
    - call: "execve"
      syscall: true
      args:
        - index: 0
          type: "string"
      selectors:
        - matchArgs:
            - index: 0
              operator: "Equal"
              values: ["/tmp/*.sh"]
```

```bash
# 看事件
kubectl exec -n kube-system ds/tetragon -c tetragon -- \
  tetra getevents -o compact --pods nginx
```

进程血缘的价值在事故分析：你能立刻看到"这次小违规是从哪个进程一路衍生出来的"——Tetragon 在 eBPF 里沿着 `task_struct->real_parent` 构建完整血缘。

### 3. Pixie：零代码 APM 自动插桩

Pixie 是无缝自动插桩的标杆。它**不用改一行代码**就能看到请求级 trace。特色是连 **TLS 加密流量都能看到明文**——通过 hook OpenSSL/Go TLS 函数在加解密前后抓取。用 PxL 语言查询：

```
?// 查看 HTTP 请求的 p50/p95/p99
px.display(px.agg(
  px.http        // HTTP 流量表
    |> px.groupby(px.req_path)
    |> px.p50(px.duration_ns),
  px.col('req_path'),
))
```

### 4. Parca：持续性能剖析

Parca 做**持续剖析**（continuous profiling）——每节点周期采样栈，把整集群的火焰图串起来。它能回答"CPU 到底烧在哪个函数"。本地的 CPU 采样对每个节点做了，Parca 把它整合成可跨节点/跨进程聚合的视图，对排查"某个库拖垮全集群"类问题极有用。

## OpenTelemetry eBPF + Grafana Beyla：把自动插桩标准化

2025-2026 年，eBPF 自动插桩沿着两条路标准化：

- **OpenTelemetry eBPF Collector**：官方组件，自动采集网络流、DNS/TCP/UDP 统计，输出 OTLP，任何后端（Tempo/Jaeger/Honeycomb/Datadog）都能消费
- **Grafana Beyla**：Go 写的 eBPF 自动插桩 agent（2024 GA），通过 uprobes 自动识别 HTTP/gRPC/SQL/Redis 流量，自动生成 OpenTelemetry span，无需 SDK

```yaml
# Beyla Helm 部署
helm repo add grafana https://grafana.github.io/helm-charts
helm install beyla grafana/beyla   # 指向 Tempo 后端即可
```

## 生产落地：三守护进程架构（2026 默认）

2026 年 CNCF 可观测性栈的默认分工：

| 守护进程 | 职责 | 数据层 |
|---|---|---|
| **OBI / Beyla** | L7 应用 trace + RED 指标 + SQL + GenAI | HTTP/gRPC 载荷，OTLP |
| **Cilium Hubble** | L3/L4 网络流 + 服务依赖图 | 网络包，L3/L4 |
| **Tetragon** | 运行时安全 + 强制 | 系统调用/进程血缘 |

分工明确：**Beyla 管应用层 trace，Hubble 管网络流，Tetragon 管安全。** 三者的资源预算合计约 `cpu: 800m / memory: 1.5Gi` 每节点——这个成本换来的是"零代码插桩 + 内核级视野"，非常划算。

### 生产检查清单

```
① 内核：所有节点 5.8+，BTF 开启        → uname -r, ls /sys/kernel/btf/vmlinux
② CNI 冲突：审计 Cilium/Calico eBPF 模式  → cilium status
③ 权限：DaemonSet 有 CAP_BPF+CAP_PERFMON+CAP_SYS_PTRACE
④ OTLP 管线：OTel Collector 已接入后端
⑤ 服务发现：限定 namespace/label，别全集群瞎挂
⑥ 头部脱敏：obfuscate authorization/cookie/api-key，防 PII 泄露
⑦ 资源调优：高流量节点（10k RPS+）调 CPU/内存
⑧ 版本锁定：eBPF 工具 v0 阶段可能破坏性变更，钉住版本
```

## bpftrace：事故现场的瑞士军刀

那些常驻 daemon 是你日常的"生产监控"，而 BCC/bpftrace 是**事故发生时工程师 SSH 上去直接跑**的工具。

```bash
# 哪个进程打开了哪个文件（3 秒）
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_openat { printf("%s opens %s\n", comm, str(args->filename)); }'

# 磁盘 I/O 延迟直方图
sudo bpftrace -e 'kprobe:blk_start_request { @start[pid] = nsecs; } kretprobe:blk_complete_request /@start[pid]/ { @usecs = hist((nsecs - @start[pid])/1000); delete(@start[pid]); }'

# TCP 重传统计
sudo bpftrace -e 'kprobe:tcp_retransmit_skb { @retrans[comm, pid] = count(); }'
```

BCC 有 200+ 现成工具（opensnoop、execsnoop、biolatency、tcplife…），bpftrace 是 awk 风格的一行 DSL。**两者都要有**：daemon 处理"每天"，bpftrace 处理"这一秒钟"。

## 结论

eBPF 在 2026 年已经从"内核黑科技"变成**可观测性的默认底座**。它带来的范式转变是：**不用改代码、不用加 SDK、不用装 agent 到应用里，就能获得 L7 应用行为 + 网络流 + 系统调用 + 持续剖析的完整视野**。

对落地：

- **先上 Cilium Hubble**——网络观测立刻有，改一行 Helm values 的事
- **再加 Tetragon**——如果你对运行时安全有要求，同步执行策略是加分项
- **用 Beyla/OBI**——要 trace 又不想侵入代码时
- **记住三守护进程分工**——各司其职别叠床架屋

::: tip
eBPF 工具不是装完就完事。先确认内核 ≥5.8 且开了 BTF，再把 Hetzner 那类老内核节点排掉——很多"装不上/不工作"的坑，根源就是内核版本没达标。
:::
