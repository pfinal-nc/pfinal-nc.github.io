---
title: "Kubernetes 1.37 正式发布：静态 Pod 禁引 Secret、SELinuxMount 默认开启、IPVS 退场——升级前必做 4 项检查"
date: 2026-08-26
tags:
  - Kubernetes
  - DevOps
  - k8s-1.37
  - upgrade
  - selinux
  - security
keywords:
  - Kubernetes 1.37
  - K8s 1.37 GA
  - SELinuxMount
  - 静态 Pod
  - IPVS 弃用
  - 升级检查清单
  - 容器编排
category: devops
description: "Kubernetes 1.37 于 2026-08-26 正式 GA。本文聚焦真正会在升级时断裂的变更：静态 Pod 禁止引用 Secret/ConfigMap、SELinuxMount 默认开启、kube-proxy IPVS 模式弃用，并给出升级前检查清单与可复制命令。"
recommend: DevOps
---

# Kubernetes 1.37 正式发布：静态 Pod 禁引 Secret、SELinuxMount 默认开启、IPVS 退场

Kubernetes **v1.37** 于 **2026 年 8 月 26 日（周三）**正式 GA。本周期从 5 月 18 日启动，7 月 22–23 日代码冻结，8 月 5 日 RC0、8 月 19 日 RC1，最终如期发布。整轮共 **67 项增强**：16 项毕业到 Stable、23 项推进到 Beta、27 项为全新 Alpha、1 项废弃。

与往期不同，1.37 的"看点"不在一堆花哨新特性，而在**几处会真实打断升级的变更**。如果你负责维护生产集群，本文把最该提前处理的三处"断裂项"和一组升级前检查命令整理出来，并澄清哪些常被误传为 1.37 新断裂、其实早在 1.35/1.36 就已落地。

> 注：站点内已有《[Kubernetes 1.37 深度预览](/devops/kubernetes-1-37-deep-preview-hpa-scale-to-zero-ipvs-deprecation-dra-2026)》覆盖 HPA 原生缩零、DRA 设备污点等前瞻内容；本文聚焦 **GA 落地 + 升级实战**，二者互补。

---

## 一、真正会在升级时"断裂"的三处变更

下面三项是 1.37 升级里最容易被忽视、又最难回滚的部分。优先级：**先把集群里有没有静态 Pod 引用 Secret/ConfigMap 查清楚**。

### 1.1 静态 Pod 不再能引用 Secret / ConfigMap

`PreventStaticPodAPIReferences` 特性门控在 1.37 被**彻底移除**，没有等价回退开关。从 1.37 起，静态 Pod（即 `/etc/kubernetes/manifests/` 下由 kubelet 直接管理的 Pod）的 spec 中，以下字段不再允许引用集群内的 Secret 或 ConfigMap：

- `volumes[].configMap`
- `volumes[].secret`
- `volumes[].projected` 内嵌的 `configMap` / `secret`
- `imagePullSecrets`
- `env` / `envFrom` 中的 `configMapRef` / `secretRef`

**为什么这条最危险**：静态 Pod 大多承载控制面组件（kube-apiserver、etcd、kube-controller-manager 等），一旦被这条规则拦下，控制面可能起不来，而且 **kubeadm 升级前并不会替你改掉这些 manifest**。升级后 kubelet 直接拒绝，节点"假死"。

**升级前先扫一遍**（在每台控制面节点执行）：

```bash
# 检查本节点静态 Pod manifest 是否引用了 Secret/ConfigMap
grep -rEl "configMapRef|secretRef|imagePullSecrets|configMap:|secret:" \
  /etc/kubernetes/manifests/ 2>/dev/null

# 想看具体命中哪一行
grep -rnE "configMapRef|secretRef|imagePullSecrets" \
  /etc/kubernetes/manifests/ 2>/dev/null
```

**修复方向**（二选一）：

1. **内联化**：把 Secret/ConfigMap 的内容直接写进 manifest（仅适合非敏感、低频变更的配置）。
2. **改为 API 管理的 Pod**：把控制面组件交给 kubeadm/静态清单之外的方式管理（如 DaemonSet 或迁移到托管控制面），由 API Server 正常注入 Secret/ConfigMap。

> 经验法则：能走 API Server 注入的就别塞进静态 Pod。这条规则本质是"静态 Pod 不应依赖 API Server 已经可用"的安全约束——但控制面组件恰好反过来，所以历史上一堆人踩坑。

### 1.2 SELinuxMount 毕业并默认开启

SELinux 卷重打标（`SELinuxMount`）在 1.37 **毕业为 GA 并默认启用**。这是本版本**最容易被忽略的行为变更**：

- **旧行为**：Pod 挂载卷后，kubelet 对卷做**递归** `chcon` 重新打 SELinux 标签（影响性能，且对 `rshared` 挂载有副作用）。
- **新行为（1.37 默认）**：改用 `MountOption "context="` 进行**按挂载点**的标签隔离，不再递归扫描整个卷。结果是——**单个挂载点同一时刻只能有一个 SELinux context**。

**影响面**：在同节点上、多个 Pod 用**不同 SELinux 标签**共享同一卷（典型如 OpenShift/SCC 启用了多级标签、或某些多租户共享 PVC 场景）时，Pod 可能挂载失败或拒绝启动。

**先确认你的集群是否会受影响**：

```bash
# 查看哪些 CSI 驱动开启了 seLinuxMount（true 表示走新的按挂载标签）
kubectl get csidriver -o custom-columns=NAME:.metadata.name,SELINUX:.spec.seLinuxMount

# 查看 Pod 是否在 securityContext 里指定了 seLinuxOptions.level
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.securityContext.seLinuxOptions.level}{"\n"}{end}'
```

如果确实因新行为导致共享卷 Pod 起不来，可在 **Pod spec** 显式恢复旧的递归重打标：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: shared-selinux-pod
spec:
  # 恢复 1.37 之前递归 chcon 的兼容行为
  seLinuxChangePolicy: Recursive
  securityContext:
    seLinuxOptions:
      level: "s0:c123,c456"
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: shared-pvc
```

驱动侧若支持，也可以在 `CSIDriver` 上显式 opt-in（新行为由驱动声明）：

```yaml
apiVersion: storage.k8s.io/v1
kind: CSIDriver
metadata:
  name: ebs.csi.aws.com
spec:
  seLinuxMount: true
```

> 这条是"行为变更"而非"删除 API"，所以 `kubectl` 不会报错提示，出问题只会在 Pod `FailedMount` 时暴露。生产集群升级前建议先在灰度节点验证。

### 1.3 kube-proxy IPVS 模式弃用

`kube-proxy` 的 **IPVS 模式**在 1.37 被正式**弃用（deprecated）**。开启 IPVS 时，kube-proxy 启动会打印弃用告警：

```text
Flag --mode=ipvs is deprecated and will be removed in a future release.
```

**移除时间线**（按官方规划，非 1.37 立即删除）：

- **v1.40**：`--mode` 默认值改为 `nftables`，IPVS 默认关闭。
- **v1.43**：IPVS 模式彻底移除，届时只能用 `iptables`、`nftables` 或 `none`。

**推荐迁移方向**：优先切到 **nftables**（性能优于 iptables，且是未来的默认），或评估直接用 `kube-proxy` 的 `none` 模式 + 外部数据面（Cilium eBPF 等）。

**先确认当前模式**：

```bash
kubectl get configmap kube-proxy -n kube-system -o yaml | grep -A1 "mode:"

# 或直接看 kube-proxy 启动参数
kubectl -n kube-system get pods -l k8s-app=kube-proxy -o jsonpath='{range .items[*]}{.spec.containers[0].args}{"\n"}{end}'
```

> 顺带提一句：1.37 起若 `kube-proxy` 的 `mode` 字段**留空**，会被当作 `iptables` 并打印告警——这是为 nftables 默认切换做铺垫。别再把 mode 留空当"默认"。

---

## 二、升级前还需留意的其他变更（非断裂，但易踩）

下面这些不会让控制面直接起不来，但会在升级后被你"突然发现不对劲"。

| 变更 | 影响 | 动作 |
|---|---|---|
| 弃用的 cAdvisor flags 现在致命 | 在 kubelet 配置里残留 `--cadvisor-*`（如 `--cadvisor-port`）会导致 **kubelet 启动失败** | 升级前 `grep cadvisor /var/lib/kubelet/config.yaml`，删掉 |
| 部分 cAdvisor metrics 移除 | `container_cpu_load_average_10s`、`container_vm_*`、`container_memory_swap` 等不再导出 | 检查 Prometheus 规则 / 看板是否引用 |
| `eventRecordQPS: 0` 语义反转 | 旧版 `0` = 使用默认值；1.37 起 `0` = **真正无限** | 需限速就显式写正数，如 `eventRecordQPS: 50` |
| `kubectl run --filename/-f` 弃用 | 用 `kubectl run -f x.yaml` 生成 Pod 会告警 | 改用 `kubectl create -f` / `kubectl apply -f` |
| kubeadm `v1beta3` API 移除 | 仍用 `v1beta3` 的 `kubeadm-config` 会失败 | 迁移到 `v1beta4` |
| 多组 API 版本移除 | `IPAddress v1beta1`、`ServiceCIDR v1beta1`、`VolumeAttributesClass v1beta1`、`ClusterTrustBundles v1alpha1` | `kubectl get` 改用 `v1` / `v1beta2` |
| `NodeSwap` 特性门控移除 | 自 1.34 GA，1.37 永久锁定为开启，**纯清理** | 无需动作，但确认 swap 行为符合预期 |

**两个常被误传为"1.37 新断裂"的点，澄清一下**：

- **`containerd 2.0` 要求**：这是 **1.36** 的事（v1.35 是最后一个支持 containerd 1.x 的版本），**不是 1.37 新增**。1.37 不因为你用 containerd 1.x 直接挂。
- **cgroup v1 倒计时**：`failCgroupV1` 默认值 `true` 从 **1.35** 起就已生效，1.37 仍可用 override 兜底，但属于明确的"退役倒计时"，应借这次升级把节点迁到 **cgroup v2**。

---

## 三、值得采纳的 GA / Beta 进展（向后兼容，无需紧急动作）

1.37 也带来了不少"毕业"信号，对绝大多数集群是**免费增强**，可按需启用：

- **`metrics.k8s.io` 毕业为 GA（`v1`）**：养了快 9 年的 Beta 终于转正，`kubectl top` 和 HPA 的底层指标 API 稳定性拉满。
- **`KYAML`（`kubectl -o kyaml`）GA**：比 `yaml` 更易脚本解析的 YAML 变体，管道处理更顺手。
- **Pod 级 `resources` GA**：在 Pod 层级声明总资源，不再每个容器重复写。
- **DRA 设备污点与容忍（Device Taints & Tolerations）GA**：GPU/加速器的精细调度更稳。
- **ClusterTrustBundle / Pod 证书 GA**：Pod 内信任锚注入进入稳定版。
- **Kubelet in UserNS（Rootless）→ Beta**：无 root 跑 kubelet 的安全隔离更进一步。
- **StorageVersionMigration GA**：存储版本迁移成为一等能力。
- **默认 etcd 升至 `3.7.0`**，`EtcdRangeStream`（Beta）默认开启，大范围 List 的流式读取更省内存。

---

## 四、升级前检查清单（Pre-flight Checklist）

把下面 8 条在**升级前**跑一遍，能拦掉 90% 的 1.37 升级事故：

```bash
# 1) 静态 Pod 是否引用 Secret/ConfigMap（最致命）
grep -rEn "configMapRef|secretRef|imagePullSecrets" /etc/kubernetes/manifests/ 2>/dev/null

# 2) cAdvisor 弃用 flag 是否残留（会让 kubelet 起不来）
grep -i cadvisor /var/lib/kubelet/config.yaml 2>/dev/null || echo "OK: no cadvisor flags"

# 3) SELinux 共享卷场景（多 level 标签）
kubectl get csidriver -o custom-columns=NAME:.metadata.name,SELINUX:.spec.seLinuxMount
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.securityContext.seLinuxOptions.level}{"\n"}{end}'

# 4) kube-proxy 模式
kubectl get configmap kube-proxy -n kube-system -o yaml | grep -A1 "mode:"

# 5) cgroup v2 是否已就绪（避免 cgroup v1 倒计时踩雷）
stat -fc %T /sys/fs/cgroup/   # 输出 cgroup2fs 即 v2；tmpfs 即 v1/hybrid

# 6) containerd 版本（1.37 不强制 2.0，但顺手确认）
kubectl get nodes -o wide | awk '{print $1, $6}'   # CONTAINER-RUNTIME 列
# 节点上： containerd --version

# 7) kubeadm 配置 API 版本（需 v1beta4）
kubectl get cm kubeadm-config -n kube-system -o yaml | grep -m1 "apiVersion"

# 8) 被移除 API 版本是否还在用（留意自定义控制器 / CRD）
kubectl api-resources | grep -E "ipaddress|servicecidr|volumeattributesclass" || echo "OK: not in use"
```

**最小可行升级顺序建议**：先升级控制面节点（重点盯 1.1 静态 Pod 引用）→ 确认 `kube-apiserver`/`etcd` 正常 → 再灰度 worker（重点盯 1.2 SELinuxMount 与 1.3 kube-proxy 模式）→ 最后全量。

---

## 五、小结

Kubernetes 1.37 的"重量"集中在**稳定性与退役旧路径**，而不是堆新功能：

1. **静态 Pod 禁引 Secret/ConfigMap**——升级前必须扫 manifest，否则控制面可能起不来。
2. **SELinuxMount 默认开启**——共享卷多 SELinux 标签的 Pod 需提前验证，必要时 `seLinuxChangePolicy: Recursive` 兜底。
3. **kube-proxy IPVS 弃用**——规划向 nftables / 外部数据面迁移，1.40 起默认切换。
4. **cAdvisor 弃用 flag 变致命 + 若干 API 移除**——用上面清单逐条核对。

至于 `containerd 2.0` 与 cgroup v1 这类"老生常谈"，本质是 1.35/1.36 的延续，借这次升级一并清掉即可，不必恐慌。

把第四节的检查清单跑通，1.37 升级基本就是一次"安静的版本跃迁"。

---

## 参考来源

- Kubernetes 官方博客：《Kubernetes v1.37: Sneak Peek》（2026-07-31）— `https://kubernetes.io/blog/2026/07/31/kubernetes-v1-37-sneak-peek/`
- SIG Release 讨论（v1.37.0 发布协调）— `https://github.com/kubernetes/sig-release/discussions`
- 1.37 升级指南与断裂项拆解（byteiota / devoriales / Cloudsmith / Palark 等社区技术博客，2026-08）
- 本站《[Kubernetes 1.37 深度预览：HPA 原生缩零、IPVS 退场倒计时、DRA 设备污点毕业](/devops/kubernetes-1-37-deep-preview-hpa-scale-to-zero-ipvs-deprecation-dra-2026)》
- 本站《[Kubernetes v1.36 Haru 深度实战：70 项增强全解读](/devops/kubernetes-v1-36-haru-deep-dive-2026)》
