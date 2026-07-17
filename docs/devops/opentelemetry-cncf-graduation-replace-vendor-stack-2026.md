---
title: "OpenTelemetry CNCF 毕业 90 天替代 Datadog / NewRelic / Splunk 老栈：可观测性实操指南"
date: 2026-07-17
tags:
  - opentelemetry
  - observability
  - cncf
  - devops
  - monitoring
  - otel-collector
  - datadog
  - prometheus
keywords:
  - OpenTelemetry
  - CNCF 毕业
  - 可观测性
  - OTel Collector
  - Datadog
  - New Relic
  - Splunk
  - 替代
  - 迁移
category: devops
description: "2026 年 5 月 21 日，OpenTelemetry 在 CNCF Observability Summit 正式毕业，成为继 Kubernetes、Prometheus、Envoy 之后第 7 个顶级 CNCF 项目。本文从'为什么退休老 vendor agent'到'90 天迁移清单'，完整拆解可观测性栈替换实操。"
---

# OpenTelemetry CNCF 毕业 90 天替代 Datadog / NewRelic / Splunk 老栈：可观测性实操指南

2026 年 5 月 21 日，在明尼阿波利斯的 Observability Summit 上，CNCF CTO Chris Aniszczyk 宣布 **OpenTelemetry 正式毕业**。过去 7 年，OpenTelemetry 整合了 OpenTracing 和 OpenCensus 两条路线，成为云原生可观测性事实标准。毕业当天的关键数据是：12,000 名贡献者、2,800 家公司、CNCF 项目速度排名第二（仅次于 Kubernetes）、OpenTelemetry-JS npm 包过去 12 个月下载 13.6 亿次、OpenTelemetry-Python PyPI 包下载 13 亿次。

毕业这件事**不只是给 OpenTelemetry 发了一张证书**。它直接改变了你 2026 年下半年的可观测性预算逻辑：在毕业之前，你说"等 OTel 再成熟一点"，安全团队、平台团队、财务团队都会同意；毕业之后，这个论据正式失效。OpenTelemetry 现在和 Kubernetes、Prometheus、Envoy、Istio、Dapr、etcd 并列，都是 CNCF 顶级项目。

更大的现实是：traces、metrics、logs 三个核心信号已经全部 production-ready，profiling 推进到 alpha。Datadog Agent、New Relic Infrastructure Agent、Splunk Universal Forwarder、Dynatrace OneAgent、AWS X-Ray Daemon——这些**专有 agent 都有 1:1 的 OTel 替代品**。一主机三 agent 的时代，2026 年下半年开始应该被一主机一 Collector 替代。

这篇文章不讲 OpenTelemetry 是什么（官方文档写得很清楚），我们要解决的是**真实生产问题**：

1. 哪些老 agent 真的可以退休，哪些要保留？
2. 90 天迁移的 4 阶段怎么落地？
3. OTLP 数据进 Datadog / New Relic / Splunk / Grafana Cloud / Tempo / Mimir / Loki，怎么选 backend？
4. 语言 SDK 的兼容性矩阵——哪些场景下 OTel auto-instrumentation 还没追上专有 agent？
5. 迁移成本怎么算 ROI？

## 一、毕业到底解锁了什么

### 1.1 CNCF 毕业不是技术里程碑，是**组织里程碑**

技术层面，OpenTelemetry 在 1.x 时代（2023 年）就已经 production-ready 了。毕业需要满足的硬性条件是：

- **生产环境被多组织采用**——GitHub、Farfetch、Alibaba、Anthropic、Bloomberg、Capital One、eBay、FICO、Heroku 都在跑 OpenTelemetry
- **稳健的治理模型**——有明确的角色定义、选举/退出流程、透明的决策机制
- **社区健康度**——多组织持续贡献、PR review 响应快、问题处理及时
- **通过了独立安全审计**——OpenTelemetry Collector 核心组件的第三方审计已通过
- **API 稳定性**——proper versioned、向后兼容、定期发布
- **文档完整**——架构总览、用户/运维/贡献者指南齐全
- **TOC 审查通过**——CNCF Technical Oversight Committee 走完了完整审查

毕业意味着你的 CISO、你的财务、你的采购部门都没办法再说"等 OTel 再成熟一点"。这是**合规层面**的解锁。

### 1.2 三个核心信号全生产就绪，Profiling 升到 Alpha

毕业公告里，CNCF 明确标注了四个信号的状态：

| 信号 | 状态 | GA 时间 |
|---|---|---|
| Traces | **Production-ready** | 2023 |
| Metrics | **Production-ready** | 2023 late |
| Logs | **Production-ready** | 2026 |
| Profiles | **Alpha** | 2026 Q2 |

Traces 是最早稳定的信号，OTel Java / Python / Node.js / .NET 的 auto-instrumentation 已经和 Datadog APM / New Relic APM 在绝大多数框架上**性能持平**。Metrics 和 Logs 的 SDK/Collector 在过去 12 个月都达到了生产可用——之前 metrics 还有 cardinality 处理的边界 case、logs 的 otelcol 组件对高吞吐日志流还有内存问题，这些在 1.32+ 都已经修复。

Profiles 是新晋 Alpha。OTel Profiling 基于 eBPF + 周期性采样（parca、pixie 类似思路），目前覆盖的语言是 Go、Python、Java、Node.js、Ruby、Rust。对比 Continuous Profiling 领域的两家头部——Datadog Continuous Profiler 和 Polar Signals Cloud——OTel Profiling 的 UI 体验还差一截，但**数据模型和采集器已经稳定**。

### 1.3 CNCF 项目速度第二意味着什么

CNCF 公布的 OpenTelemetry 贡献者画像是：12,000+ 贡献者、2,800+ 公司、数百名 SIG 维护者。在 CNCF 240+ 项目里，OpenTelemetry 的 commit / PR / issue 速度仅次于 Kubernetes。这不是营销话术——它直接影响**长期可维护性**：

- **bug 修复快**——你遇到一个 otelcol 接收器的问题，48 小时内有 maintainer 响应
- **新语言/新框架支持快**——OTel JavaScript 2026 上半年新支持了 Next.js 15 的 App Router instrumentation
- **生态集成广**——Spring Boot、Express、Gin、FastAPI、Django、gRPC 都有 contrib 库

相比之下，专有 agent 的"roadmap 取决于 vendor 的优先级"，你没法控制。

## 二、哪些专有 agent 可以退休，哪些要保留

OTel 不是"全包全替"，要按场景分。下面是 2026 年下半年的真实状态。

### 2.1 立即可以退休的（5 类）

**Datadog Agent 的 Infrastructure 部分**——主机指标（CPU / 内存 / 磁盘 / 网络）和容器指标。OTel Collector 配 `hostmetrics` receiver（之前叫 `receiver/hostmetrics`）+ `k8scluster` receiver，可以完全替代。Datadog 的"自定义 metrics"和"APM 业务标签"也已经通过 OTLP/HTTP 直接支持。

**New Relic Infrastructure Agent**——同上，OTel Collector 的 hostmetrics + k8scluster receiver 完全替代。New Relic 的 NRQL 查询引擎对 OTLP 数据是 native 支持的。

**Splunk Universal Forwarder（仅 logs + metrics）**——如果只用 Splunk 接 logs / metrics，OTel Collector 配 `filelog` receiver + `splunk_hec` exporter 是 1:1 替代。Splunk 9.0+ 的 SFD（Splunk Forwarding Data）模式甚至直接接 OTLP。

**FluentBit / FluentD 单独的日志路径**——如果只是为了把日志推到 Elasticsearch / Loki / Splunk / S3，OTel Collector 的 `filelog` receiver 比 FluentBit 更稳定（特别是高吞吐场景，OTel 的 batching + memory limiter 调优更精细）。

**Prometheus node_exporter 抓取管道**——如果你的 Prometheus 还在用 node_exporter 抓主机指标，可以把 node_exporter 换成 OTel Collector 的 hostmetrics receiver，配置和 alert rule 都不动。

### 2.2 应该保留的（4 类）

**Vendor APM auto-instrumentation 语言补集**——OTel contrib 的 auto-instrumentation 在以下场景还有 gap：
- Ruby on Rails 边缘版本（7.2+ 还没完全覆盖）
- 旧 PHP（PHP 7.4 之前的 Laravel / Symfony 版本）
- Erlang / Elixir 的 BEAM 内部 trace

如果你的栈是这些语言，**保留 vendor agent 6-12 个月**，等 OTel contrib 追上。

**eBPF profiler**——Datadog / New Relic / Polar Signals 的 eBPF profiler 依赖 vendor 自己的 kernel module 或者商业 eBPF 库。OTel Profiling 还在 alpha，eBPF 兼容性、采样频率、内核版本支持（5.4+ vs 5.10+）都还差一截。

**专有的 RUM / Synthetics**——Datadog RUM、New Relic Browser、Datadog Synthetics 这类"前端 + 合成监控"产品 OTel 没有直接对应。OTel 浏览器 SDK 只覆盖 RUM 部分，合成监控没有规范。

**APM 业务分析面板**——Datadog Service Map、New Relic Navigator 这类"基于 trace 的业务拓扑图"是 vendor 商业产品的护城河。OTel 数据可以进这些平台（Datadog / New Relic 都支持 OTLP ingestion），但**业务面板的 UI 体验还是 vendor 的好**。

### 2.3 推荐架构：单 Collector + 多 backend

最终目标架构是**一主机一个 OTel Collector，通过 OTLP / HTTP / gRPC 把数据推给多个 backend**：

```yaml
# /etc/otelcol/config.yaml
receivers:
  hostmetrics:
    collection_interval: 30s
    scrapers:
      cpu: {}
      memory: {}
      disk: {}
      network: {}
      load: {}
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
  filelog:
    include:
      - /var/log/pods/*/*/*.log
    operators:
      - type: json_parser

processors:
  batch:
    timeout: 5s
    send_batch_size: 1000
  memory_limiter:
    check_interval: 1s
    limit_percentage: 80
    spike_limit_percentage: 20
  resourcedetection:
    detectors: [env, system, k8s, gcp, ec2]
    timeout: 5s
  attributes/masking:
    actions:
      - key: http.request.header.authorization
        action: delete
      - key: db.statement
        action: hash

exporters:
  otlp/datadog:
    endpoint: https://trace.agent.datadoghq.com:443
    headers:
      DD-API-KEY: ${env:DD_API_KEY}
  prometheusremotewrite/grafana:
    endpoint: https://prometheus-prod-10-prod-us-central-0.grafana.net/api/prom/push
    auth:
      authenticator: basicauth/grafana
  loki/grafana:
    endpoint: https://logs-prod-eu-west-0.grafana.net
  s3/backup:
    endpoint: s3://my-otel-backup
    storage_class: STANDARD_IA

service:
  pipelines:
    metrics:
      receivers: [hostmetrics, otlp]
      processors: [memory_limiter, resourcedetection, batch]
      exporters: [otlp/datadog, prometheusremotewrite/grafana]
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, batch, attributes/masking]
      exporters: [otlp/datadog]
    logs:
      receivers: [filelog, otlp]
      processors: [memory_limiter, batch]
      exporters: [loki/grafana, s3/backup]
```

**关键点**：

- 同一份 traces 推到 Datadog（保留 vendor 商业产品的 UI），同时可以推到 Tempo / Jaeger（开源备份）
- 同一份 metrics 推到 Datadog 和 Grafana Cloud（双 backend 互为冗余）
- 同一份 logs 推到 Loki 和 S3（冷存储 + 查询分离）

这就是毕业带来的**架构范式转变**：从"一个 agent 服务一个 vendor"变成"一个 Collector 服务多个 backend"。vendor 锁定被打破，谈判筹码直接转移到你手里。

## 三、90 天迁移路线图

### 阶段 1：第 1-30 天，Shadow Mode（影子模式）

**目标**：OTel Collector 与专有 agent 并行运行，验证数据完整性。

```bash
# 在 1 个 staging 集群的 1 个 node 上部署 OTel Collector
$ kubectl apply -f otelcol-daemonset.yaml

# 配置只接收、不影响生产
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
exporters:
  debug:
    verbosity: detailed
  # 临时 disable 真实 backend，先看本地的 data
service:
  pipelines:
    metrics:
      receivers: [hostmetrics]
      exporters: [debug]
```

**验证清单**：

- [ ] OTel Collector 的 hostmetrics 跟 Datadog Agent 抓的 CPU / 内存数据**误差 < 5%**
- [ ] OTel Collector 启动后内存占用 < 200MB（不要超过 Datadog Agent 的 2 倍）
- [ ] 在 24 小时内没有 OOM 或者 high restart count
- [ ] 接收 OTLP 的应用 trace 跟 vendor agent 的 trace 数量**误差 < 10%**
- [ ] 抓的 log 数量跟 vendor agent 抓的**误差 < 5%**（注意去重规则差异）

**坑点**：

- OTel hostmetrics 的 `system.cpu` 指标和 Datadog 的 `system.cpu` 计算方式略有不同（idle / iowait / steal 的归类），前期不要直接对比绝对值，对比 delta
- OTel 的 k8scluster receiver 需要 service account 有 `get/list/watch` pods/nodes 的权限，记得配 RBAC
- 内存限制一定要配 `memory_limiter` processor，否则高并发场景会 OOM

### 阶段 2：第 31-60 天，Signal-by-Signal 切换

**目标**：一个一个 signal 切，不要一次性全切。

**先切 metrics**（最简单）：

```yaml
# 让应用的 Prometheus client 直接 emit OTLP（不经过 prom2otel bridge）
# Go 应用
import "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
# 把 prometheus.NewRegistry() 替换为 otelmetric.NewMeterProvider()
```

```python
# Python 应用
from opentelemetry import metrics
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
exporter = OTLPMetricExporter(endpoint="otelcol:4317", insecure=True)
```

**再切 logs**（中等）：

```yaml
# OTel Collector 替换 FluentBit
receivers:
  filelog:
    include:
      - /var/log/containers/*/*.log
    operators:
      - type: regex_parser
        regex: '^(?P<time>\S+) (?P<stream>\S+) (?P<log>.*)$'
        timestamp:
          parse_from: attributes.time
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'
```

**最后切 traces**（最复杂）：

```go
// Go 应用的 OTel auto-instrumentation
import (
    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
    "go.opentelemetry.io/otel/sdk/trace"
)

func main() {
    tp := trace.NewTracerProvider(trace.WithBatcher(otlpgrpc.New(...)))
    otel.SetTracerProvider(tp)
    // 替换 http.DefaultTransport
    http.DefaultTransport = otelhttp.NewTransport(http.DefaultTransport)
}
```

每个 signal 切完之后，保留老 agent **至少 2 周 shadow mode**，确认无数据丢失再继续。

### 阶段 3：第 61-80 天，关闭老 agent

**目标**：移除专有 agent。

```bash
# 在 k8s 里卸载 Datadog Agent
$ kubectl delete daemonset datadog-agent -n datadog
$ kubectl delete clusterrolebinding datadog-agent
$ helm uninstall datadog-operator

# 卸载 New Relic Infrastructure Agent
$ kubectl delete daemonset newrelic-infra -n newrelic
$ helm uninstall newrelic-infrastructure
```

**关键**：在卸载前 1 周，把所有 vendor 提供的 alert rule、dashboard、runbook 全部迁移到 OTel 数据上。不要"卸载 agent 之后才发现 alert 没接"。

**坑点**：

- 有些 vendor agent 提供了**额外的 side-effect 能力**，比如 Datadog Agent 的 `dd-autoscaler`、New Relic 的 `nri-kubernetes`，OTel 替代品没有。提前确认业务依赖。
- agent 卸载后，**日志的 stdout / stderr 路径**可能变化。OTel Collector 通常挂 `/var/log/pods/`，vendor agent 通常挂 `/var/log/containers/`。kubectl logs 行为可能变化。

### 阶段 4：第 81-90 天，优化与归档

**目标**：从"功能替代"升级到"成本优化"。

**优化点 1：Tail-based sampling**——不是所有 trace 都值得存。OTel Collector 的 tail-based sampling processor 可以按"trace 是否包含 error / 是否 p99 异常"动态决定存不存：

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 50000
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: latency
        type: latency
        latency:
          threshold_ms: 1000
      - name: probabilistic
        type: probabilistic
        probabilistic:
          sampling_percentage: 5
```

这样可以把 trace 存储成本降到原来的 1/20（5% 概率采样 + 1% 错误 + 1% 慢请求）。

**优化点 2：Multi-backend 拆分**——把 hot data（7 天内）推到 Grafana Cloud / Datadog，把 cold data（>7 天）推到 S3 / GCS：

```yaml
exporters:
  otlp/grafana_hot:
    endpoint: https://tempo-prod-10-prod-us-central-0.grafana.net:443
  s3/cold:
    endpoint: s3://my-otel-cold-archive
    storage_class: GLACIER
```

**优化点 3：成本归因**——OTel 的 resource attribute 可以加 `team`、`cost_center`、`project`，让每个 backend 的账单都能按业务拆分。

## 四、ROI 计算：什么时候值

假设一家中等规模公司，2026 年可观测性年度预算如下：

| 项目 | 旧栈（Datadog） | 新栈（OTel + Grafana Cloud） |
|---|---|---|
| 主机 / 容器基础监控 | $0（Datadog Agent） | $0（OTel Collector） |
| APM（应用 trace） | $40/host/月 × 200 host = $96,000/年 | $0（OTel SDK）+ Grafana Cloud Trace $5/百万 spans |
| Infrastructure 指标 | $15/host/月 × 200 host = $36,000/年 | $0（OTel Collector）+ Grafana Cloud Metrics $8/百万 series |
| Logs | $0.10/GB × 5 TB/月 = $6,000/月 = $72,000/年 | $0.50/GB（Grafana Cloud Loki）= $30,000/年 |
| RUM / Synthetics | $1,500/月 = $18,000/年 | 保留 Datadog（无 OTel 替代）= $18,000/年 |
| **总计** | **$222,000/年** | **$48,000/年**（仅 logs）+ traces/metrics $0（自建） |

**节省 $174,000/年**，主要是 logs 和 metrics 的存储成本。Traces 因为有 vendor 商业 UI（Service Map、Continuous Profiler）保留，预算不变。

**关键假设**：

- 团队有能力维护 OTel Collector（~0.5 FTE 的 SRE 时间）
- 业务没有重度依赖 Datadog RUM / Synthetics
- 现有 alert / dashboard 能迁移到 Grafana（或者保留 vendor backend 消费 OTLP）

**什么时候不值**：

- 公司 < 50 个 host，Datadog / New Relic 的小套餐可能比自建便宜
- 团队完全没有 OTel / Prometheus 经验
- 业务在 6 个月内会大规模迁移到云，迁移期的复杂度已经够高

## 五、语言 SDK 兼容性矩阵（2026 年 7 月）

| 语言 | Traces | Metrics | Logs | Auto-Instrumentation | Profiles | 备注 |
|---|---|---|---|---|---|---|
| Go | ✅ Stable | ✅ Stable | ✅ Stable | ✅ gin/grpc/database/sql | ✅ Alpha | 最成熟 |
| Java | ✅ Stable | ✅ Stable | ✅ Stable | ✅ Spring/Tomcat/Kafka | ✅ Alpha | agent 模式最稳 |
| Python | ✅ Stable | ✅ Stable | ✅ Stable | ✅ Django/Flask/FastAPI | ✅ Alpha | 性能比 Java 略差 |
| Node.js | ✅ Stable | ✅ Stable | ✅ Stable | ✅ Express/NestJS/Next.js | ⚠️ Beta | 浏览器集成好 |
| .NET | ✅ Stable | ✅ Stable | ✅ Stable | ✅ ASP.NET/EntityFramework | ✅ Alpha | |
| Ruby | ✅ Stable | ✅ Stable | ⚠️ Beta | ⚠️ Rails 7.0+ 覆盖 | ❌ TODO | 比 vendor 略弱 |
| PHP | ✅ Stable | ✅ Stable | ✅ Stable | ⚠️ Laravel 10+ / Symfony 6+ | ❌ TODO | OTel 0.30+ |
| Rust | ✅ Stable | ✅ Stable | ✅ Stable | ✅ tokio/axum | ❌ TODO | tracing crate 生态好 |
| Erlang / Elixir | ⚠️ Beta | ⚠️ Beta | ❌ TODO | ❌ TODO | ❌ TODO | 保留 vendor agent |

**关键洞察**：

- Go / Java / Python / Node.js / .NET 这 5 个语言，OTel 已经能完全替代 vendor agent
- Ruby / PHP 还有 6-12 个月的 gap
- Erlang / Elixir 短期（12-18 个月）建议继续用 vendor agent

## 六、生产配置范例

下面是一个生产可用的 OTel Collector DaemonSet，配合 Kubernetes 部署。

### 6.1 DaemonSet 配置

```yaml
# otelcol-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otelcol
  namespace: observability
spec:
  selector:
    matchLabels:
      app: otelcol
  template:
    metadata:
      labels:
        app: otelcol
    spec:
      serviceAccountName: otelcol
      containers:
      - name: otelcol
        image: otel/opentelemetry-collector-contrib:0.108.0
        args:
          - --config=/etc/otelcol/config.yaml
        ports:
        - containerPort: 4317  # OTLP gRPC
          hostPort: 4317
        - containerPort: 4318  # OTLP HTTP
          hostPort: 4318
        - containerPort: 8888  # Prometheus exporter (self-metrics)
        resources:
          requests:
            memory: 256Mi
            cpu: 100m
          limits:
            memory: 512Mi
            cpu: 500m
        volumeMounts:
        - name: config
          mountPath: /etc/otelcol
        - name: varlog
          mountPath: /var/log
          readOnly: true
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: otelcol-config
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
```

### 6.2 完整 config.yaml（生产级）

```yaml
receivers:
  hostmetrics:
    collection_interval: 30s
    scrapers:
      cpu:
        metrics:
          system.cpu.utilization:
            enabled: true
      memory: {}
      disk: {}
      filesystem: {}
      network: {}
      load: {}
      processes: {}
      paging: {}

  k8scluster:
    auth_type: serviceAccount
    collection_interval: 30s
    node_conditions_to_report: [Ready, MemoryPressure, DiskPressure]
    allocatable_types_to_report: [cpu, memory, ephemeral-storage, pods]

  kubeletstats:
    auth_type: serviceAccount
    endpoint: ${env:K8S_NODE_NAME}
    collection_interval: 30s

  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 16
      http:
        endpoint: 0.0.0.0:4318

  filelog:
    include:
      - /var/log/pods/*/*/*.log
    exclude:
      - /var/log/pods/*/otc-*/*.log
    operators:
      - type: regex_parser
        regex: '^(?P<time>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(?P<stream>stdout|stderr)\s+(?P<log>.*)$'
        timestamp:
          parse_from: attributes.time
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'
        severity:
          parse_from: attributes.stream
          mapping:
            stderr: ERROR

processors:
  # 必须最先加，防止高负载 OOM
  memory_limiter:
    check_interval: 1s
    limit_percentage: 80
    spike_limit_percentage: 20

  # 自动给数据加 k8s pod/node/namespace 标签
  resourcedetection:
    detectors: [env, system, k8s]
    timeout: 5s
    override: false

  # K8s metadata enrichment
  k8sattributes:
    auth_type: serviceAccount
    passthrough: false
    extract:
      metadata:
        - k8s.pod.name
        - k8s.pod.uid
        - k8s.deployment.name
        - k8s.namespace.name
        - k8s.node.name
        - k8s.pod.start_time
      labels:
        - tag_name: app.kubernetes.io/component
          key: app.kubernetes.io/component
          from: pod

  # 采样策略
  tail_sampling:
    decision_wait: 10s
    num_traces: 50000
    expected_new_traces_per_sec: 100
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: slow-traces
        type: latency
        latency:
          threshold_ms: 2000
      - name: probabilistic
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

  # 删除敏感字段
  attributes/masking:
    actions:
      - key: http.request.header.authorization
        action: delete
      - key: http.request.header.cookie
        action: delete
      - key: db.statement
        action: hash

  # 批处理 + 压缩
  batch:
    timeout: 5s
    send_batch_size: 8192
    send_batch_max_size: 10000

exporters:
  # Trace 推 Datadog（保留 vendor 商业 UI）
  otlp/datadog:
    endpoint: https://trace.agent.datadoghq.com:443
    headers:
      DD-API-KEY: ${env:DD_API_KEY}
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s

  # Metrics 推 Grafana Cloud
  prometheusremotewrite/grafana:
    endpoint: https://prometheus-prod-10-prod-us-central-0.grafana.net/api/prom/push
    auth:
      authenticator: basicauth/grafana
    resource_to_telemetry_conversion:
      enabled: true

  # Logs 推 Loki
  loki:
    endpoint: https://logs-prod-eu-west-0.grafana.net:443/loki/api/v1/push
    auth:
      authenticator: basicauth/grafana

  # 自监控 metrics 推 Prometheus
  prometheus/self:
    endpoint: 0.0.0.0:8889
    const_labels:
      service: otelcol
    resource_to_telemetry_conversion:
      enabled: true

  debug/sample:
    verbosity: basic
    sampling_initial: 5
    sampling_thereafter: 200

extensions:
  basicauth/grafana:
    client_auth:
      username: ${env:GRAFANA_USERNAME}
      password: ${env:GRAFANA_API_KEY}
  health_check:
    endpoint: 0.0.0.0:13133
  pprof:
    endpoint: 0.0.0.0:1777
  zpages:
    endpoint: 0.0.0.0:55679

service:
  extensions: [basicauth/grafana, health_check, pprof, zpages]
  pipelines:
    metrics/infra:
      receivers: [hostmetrics, k8scluster, kubeletstats]
      processors: [memory_limiter, resourcedetection, k8sattributes, batch]
      exporters: [prometheusremotewrite/grafana, prometheus/self]
    metrics/app:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, k8sattributes, attributes/masking, batch]
      exporters: [prometheusremotewrite/grafana, otlp/datadog]
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, k8sattributes, attributes/masking, tail_sampling, batch]
      exporters: [otlp/datadog]
    logs:
      receivers: [filelog, otlp]
      processors: [memory_limiter, k8sattributes, batch]
      exporters: [loki, debug/sample]

  telemetry:
    metrics:
      address: 0.0.0.0:8888
    logs:
      level: info
```

### 6.3 部署 + 验证

```bash
# 部署
$ kubectl apply -f otelcol-rbac.yaml
$ kubectl apply -f otelcol-configmap.yaml
$ kubectl apply -f otelcol-daemonset.yaml

# 检查健康
$ kubectl exec -it otelcol-xxxxx -- wget -qO- http://localhost:13133/status
{"status":"Server available","upSince":"2026-07-17T09:01:23Z","uptime":"5m23s"}

# 查看 self-metrics（otelcol_ 开头）
$ kubectl exec -it otelcol-xxxxx -- wget -qO- http://localhost:8888/metrics | grep otelcol
otelcol_exporter_sent_spans_total{exporter="otlp/datadog"} 1234
otelcol_receiver_accepted_spans_total{receiver="otlp"} 5678
otelcol_processor_batch_batch_send_size_bucket{le="100"} 89

# 查看 tail sampling 的 trace 分布
$ kubectl exec -it otelcol-xxxxx -- wget -qO- http://localhost:55679/debug/tracez
```

## 七、与 Grafana 栈的端到端整合

如果你完全自建 backend（最便宜的方案），下面是 Prometheus + Loki + Tempo 的最小配置。

### 7.1 Prometheus（metrics）

```yaml
# prometheus.yaml
global:
  scrape_interval: 30s
scrape_configs:
  - job_name: 'otelcol'
    static_configs:
      - targets: ['otelcol:8889']
```

### 7.2 Loki（logs）

```yaml
# loki-config.yaml
auth_enabled: false
server:
  http_listen_port: 3100
common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
schema_config:
  configs:
    - from: 2026-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h
```

### 7.3 Tempo（traces）

```yaml
# tempo.yaml
server:
  http_listen_port: 3200
distributor:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
ingester:
  trace_idle_period: 10s
  max_block_duration: 5m
compactor:
  compaction:
    block_retention: 48h
storage:
  trace:
    backend: local
    local:
      path: /tmp/tempo/traces
```

**总成本**：3 个 Pod（Prometheus 2GB RAM + Loki 4GB RAM + Tempo 2GB RAM）+ 100GB SSD，**自建成本 < $100/月**。对比 Datadog 同等规模（200 host + 5TB logs/月）$222,000/年，**节省 95%+**。

## 八、迁移失败的 5 个常见原因

### 8.1 Profile 漂移类比：OTel 漂移

不是 profile 漂移，是**配置漂移**。OTel Collector 的 config.yaml 里有 100+ 字段，OTel 团队每 2 周发一个 minor 版本。`otel/opentelemetry-collector-contrib:0.108.0` 升到 0.109.0 可能有 5 个字段改名、3 个 processor 行为变化、2 个 receiver 标记为 deprecated。

**对策**：用 `otelcol --config` 加 `--feature-gates` 锁定行为，CI 里跑 config validator（`otelcol validate`）。

### 8.2 数据量爆炸

OTel 默认的**批处理 + 内存限制**配置是偏保守的，碰到高 QPS 服务会内存爆炸。

**对策**：

- `memory_limiter` 必须配，limit_percentage 设在 75-80%
- `batch` 的 send_batch_size 不要超过 10000，否则下游 backend 容易被 spike 打死
- 给每个 exporter 配 `sending_queue` 的 queue_size，典型值 5000

### 8.3 团队抗拒

SRE 团队不熟悉 OTel。vendor agent 的"装上就跑"心智模型根深蒂固。

**对策**：

- 前 3 个月用 vendor agent + OTel 双跑，让 SRE 团队用 OTel 数据做 1-2 次事故复盘，亲身感受
- 找一个 sponsor（CTO / VP Engineering）从预算角度 push
- 培训：内部开 4 次 OTel 101 workshop

### 8.4 Tail Sampling 失灵

tail_sampling processor 需要**所有 trace 的 span 都到同一个 Collector 实例**才能做决策。在 K8s 里，一个 trace 的 span 散在多个 Pod 上，Daemonset 模式会丢决策。

**对策**：

- 用 `loadbalancing` exporter 把同一 trace ID 的 span 路由到同一个 Collector
- 或者放弃 tail sampling，用 head sampling（client-side 概率采样）替代

### 8.5 告警延迟

OTel 的 batch + retry 机制会让告警**晚 30-60 秒**触发。对实时性要求高的告警不友好。

**对策**：

- 把"实时告警"和"事后分析"分开：实时告警走 Prometheus，OTel 数据进 Loki/Tempo
- 不要让 OTel 成为唯一告警源

## 九、参考资料

- [OpenTelemetry CNCF Graduation Announcement — cncf.io](https://www.cncf.io/announcements/2026/05/21/cloud-native-computing-foundation-announces-opentelemetrys-graduation-solidifying-status-as-the-de-facto-observability-standard/) — 官方毕业公告，2026-05-21
- [OpenTelemetry Has Graduated, Now What? — opentelemetry.netlify.app](https://opentelemetry.netlify.app/blog/2026/otel-grad-now-what) — 毕业带来的工程影响深度分析
- [OpenTelemetry is a CNCF Graduated Project — opentelemetry.io/blog](https://opentelemetry.io/blog/2026/otel-graduates/) — 官方博客，治理委员会声明
- [OpenTelemetry Graduates to CNCF's Highest Maturity — infoq.com](https://www.infoq.com/news/2026/07/opentelemetry-cncf-maturity/) — InfoQ 深度报道，AI 时代的 OTel 意义
- [What to Retire from Your Stack This Quarter — devops-daily.com](https://devops-daily.com/posts/opentelemetry-graduated-what-to-retire-this-quarter) — 90 天替代老栈实操清单
- [OTel Collector Configuration — github.com/open-telemetry/opentelemetry-collector](https://github.com/open-telemetry/opentelemetry-collector) — 官方配置文档
- [OTel Operator for Kubernetes — github.com/open-telemetry/opentelemetry-operator](https://github.com/open-telemetry/opentelemetry-operator) — K8s 部署 operator
- [Datadog Saves up to 14% CPU with Go PGO — docs.datadoghq.com](https://docs.datadoghq.com/profiler/guide/save-cpu-in-production-with-go-pgo/) — OTel 与 vendor 共存的桥梁

## 十、结语

OpenTelemetry 毕业不是终点，而是云原生可观测性范式的真正起点。过去 7 年，OpenTelemetry 解决了"采集标准化"；未来 3 年，它的下一个战场是"**基于 telemetry 的 AI 推理**"——从收集遥测数据升级到基于遥测数据的根因分析、异常检测、自动修复。Honecomb、Datadog、Splunk 都已经在这个方向投入重兵，但它们的 AI 训练数据**100% 都基于 OpenTelemetry 标准采集**。

对工程团队来说，2026 年下半年最务实的策略是：**OTel 统一采集层 + 多 backend 推送**。Vendor 商业产品的 UI 体验短期内还值得付费，但采集层的话语权必须拿回来。毕业之后的 OpenTelemetry 给了你**制度保障**——这是过去 5 年都没有的。
