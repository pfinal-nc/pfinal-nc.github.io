---
title: "Terraform plan 全绿 apply 炸：AWS Emulator 本地预演实测"
date: 2026-11-24 07:00:00
author: PFinal南丞
tags: [terraform, devops, aws, iac, testing]
description: "Terraform plan 通过、apply 报错的断层无法靠静态检查填平。本文用 Go 自建 mock 端点与 AWS Emulator 两条路线实测：关掉账号探测后 plan 0 次服务端请求，apply 每资源 6 次、10 个资源 60 次，并给出 PR 阶段预演 apply 的流水线改造与踩坑。"
keywords:
  - terraform
  - terraform plan apply 不一致
  - AWS Emulator
  - 本地 mock AWS
  - IaC 测试
  - terraform CI
  - DynamoDB 校验
  - 基础设施即代码
  - plan 与 apply 差异
  - 云资源预演
---

## 一、那条反复踩到的断层

如果你写过半年以上的 Terraform，大概率经历过这种循环：PR 里 `plan` 全绿，17 个资源待创建、0 变更、0 销毁，评审通过、合并、CI 里 `apply` 跑到第 9 个资源时红了一行 —— 某个名字太长、某个配额超了、某个资源其实已经存在。于是开新分支、改一行、再走一遍流程。一轮下来半小时没了，而真正的问题从来不在代码里，在于**plan 从来没有被真实 API 校验过**。

2026 年 11 月 11 日，AWS 放出了 AWS Emulator：把 SDK / CLI 的调用打到本机，返回和 AWS 同形状的成功响应与错误响应，未支持的 API 返回 501。官方描述里那句关键话是：「对它能支持的操作，合法调用返回与 AWS 相同的结果，非法调用返回与 AWS 相同的错误」。这意味着 `apply` 可以第一次被"预演"。

这篇文章不复述公告，而是把两件事做实：**一、用一个 200 行不到的 Go mock 端点，在本机复现"plan 绿、apply 炸"，并量化 plan 到底做了多少次 API 调用；二、把 AWS Emulator 的接入方式和 CI 写法拆到可抄。** 全部数据来自本机真实运行，不做估算。

---

## 二、为什么 plan 结构上不可能发现这类问题

先把责任归位：不是 Terraform 不努力，是阶段不同、信息量不同。

`plan` 阶段 provider 只做三件事：读 schema 校验必填项与类型、解析变量与引用图、对比 state 算出 diff。它没有、也不该有真实 API 的写权限调用 —— 否则 plan 就不再是只读的。于是所有"只有服务端才知道"的约束全部漏过：名字长度与字符集、单表 GSI 数量上限、资源是否已存在、账号级配额、IAM 是否真的允许。

为了证明这一点，我在本机跑了一个最小的 DynamoDB 资源，并让 Go mock 端点记录每一次请求：

```bash
$ terraform plan -input=false -var=table_name=ok-table
Plan: 1 to add, 0 to change, 0 to destroy.
# 耗时 6541ms，mock 侧收到 0 次请求（skip_* 全开；默认配置下 plan 还会做一次 STS 探测）

$ terraform apply -auto-approve -input=false -var=table_name=ok-table
Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
# 耗时 8816ms，mock 侧收到 6 次请求
```

这 6 次请求的构成也值得记住：`CreateTable` 1 次，`DescribeTable` 2 次（等状态变 ACTIVE），`DescribeContinuousBackups`、`DescribeTimeToLive`、`ListTagsOfResource` 各 1 次 —— 也就是说**一个资源落地至少 6 次往返**，其中 4 次是 provider 为了补齐读回属性而做的额外查询。这个数字后面算 CI 预算要用到。

把三层校验的边界摆在一起，责任就清楚了：

| 阶段 | 真正检查什么 | 结构上查不到什么 |
|---|---|---|
| `terraform validate` | HCL 语法、变量引用、类型能否推导 | 任何取值合法性与服务端约束 |
| `terraform plan` | provider schema 必填项、引用图、与 state 的 diff | 名字/配额/已存在/权限，全部要真实 API 才知道 |
| `terraform apply` | 以上全部 + 服务端逐条校验 | 只有它知道，但失败时资源可能已半落地 |

所以"加一条 lint 规则避免 apply 失败"这件事，上限很低：你能 lint 的规则，provider 的 schema 大多已经拦了；provider 拦不住的，恰恰是它拿不到的信息。

反过来，plan 的 6.5 秒里几乎全是本地开销：加载 707 MB 的 provider 二进制（v5.100.0）+ 构建 diff，与资源数量几乎无关 —— 10 个资源的 plan 只用了 6748ms，多了 0.2 秒。所以"多写资源会让 plan 变慢"是错觉，"让 plan 变靠谱"也是错觉。

---

## 三、路线 A：自建 Go mock 端点，把断层复现出来

不需要真 AWS 账号，一个只会说 DynamoDB JSON 协议的 HTTP 服务就够了。关键点是 provider 的 `endpoints` 块可以把某个服务的所有请求重定向到任意地址，`skip_*` 系列开关则让它不去问真实 AWS 和元数据服务。

`main.tf` 里最要紧的几行：

```hcl
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  skip_region_validation      = true

  endpoints {
    dynamodb = "http://127.0.0.1:18080"
  }
}
```

mock 侧只实现四个动作：`CreateTable` 做校验，`DescribeTable` 返回 ACTIVE，`DeleteTable` 从内存表里删掉，其余一律 200 空对象。校验逻辑照抄 AWS 的真实约束与真实报错文案：

```go
switch short {
case "CreateTable":
    if exists[name] {
        fail(w, "ResourceInUseException", "Table already exists: "+name)
        return
    }
    if len(name) < 3 {
        fail(w, "ValidationException",
            "1 validation error detected: Value '"+name+"' at 'tableName' failed to satisfy constraint: Member must have length greater than or equal to 3")
        return
    }
    if !nameRe.MatchString(name) { // ^[a-zA-Z0-9_.-]+$
        fail(w, "ValidationException", "Member must satisfy regular expression pattern: [a-zA-Z0-9_.-]+")
        return
    }
    if len(req.GlobalSecondaryIndexes) > 20 {
        fail(w, "ValidationException", "Value at 'globalSecondaryIndexes' failed to satisfy constraint: Member must have length less than or equal to 20")
        return
    }
    exists[name] = true
    json.NewEncoder(w).Encode(map[string]any{"TableDescription": desc})
}
```

有了这层"假 AWS"，四个场景可以在 30 秒内跑完，而且每个都是真实 terraform 进程、真实 provider、真实 HTTP：

| 场景 | plan 结果 | apply 结果 | apply 耗时 | 失败请求数 |
|---|---|---|---|---|
| 表名 `ab`（短于 3 字符） | Plan: 1 to add，rc=0 | rc=1，ValidationException 长度约束 | 9086ms | 1 |
| 表名 `my-table!`（含非法字符） | Plan: 1 to add，rc=0 | rc=1，ValidationException 字符集约束 | 8914ms | 1 |
| 先建表、删掉 state 再 apply | Plan: 1 to add，rc=0 | rc=1，ResourceInUseException 已存在 | 9009ms | 1 |
| 合法表名 | Plan: 1 to add，rc=0 | rc=0，1 added | 8816ms | 6 |

四行数据说明一件事：**失败的 apply 在第 1 次请求就被拒，但代价是完整的 9 秒启动与 provider 初始化**。把它放进 PR 流水线是完全可接受的成本，前提是你别指望 `plan` 自己发现它。

这里有个容易被忽略的坑：mock 必须**有状态**。我第一版 `DescribeTable` 永远返回 ACTIVE，`DeleteTable` 也不真的删，结果 `terraform destroy` 卡在等待表消失，一直轮询到超时。destroy 阶段 provider 会反复 `DescribeTable` 直到收到 `ResourceNotFoundException`，任何"永远成功"的 mock 都会让销毁永远不结束。同理，`CreateTable` 若不记状态，就复现不出"重复 apply"这类最常见的线上事故。

---

## 四、路线 B：AWS Emulator 官方路线

自建 mock 的优点是可控，缺点是只覆盖你抄下来的那几条规则。官方 Emulator 的价值在于它是**从 AWS 发布 API 模型生成的**，错误形状不用你维护；代价是覆盖面仍在补齐，未支持操作返回 501。

本地起一个（官方文档建议给容器限内存，避免它把开发机吃满）：

```bash
$ docker build -t aws-emulator .
$ docker run --rm -d -p 9297:9297 --memory=2g --memory-swap=2g aws-emulator
$ curl -sk https://127.0.0.1:9297/__admin/health
ok
```

拿到 `ok` 就说明端点活着。此时 Terraform 侧只需把每个服务的 endpoint 指过去，并关掉证书校验（自签）与 path-style 之外的花样：

```hcl
provider "aws" {
  access_key = var.access_key
  secret_key = var.secret_key
  region     = var.region

  insecure            = true   # 自签证书，跳过校验
  s3_use_path_style   = true   # 单 IP 端点，桶名放 path

  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  skip_region_validation      = true

  endpoints {
    ec2        = var.emulator_endpoint
    lambda     = var.emulator_endpoint
    dynamodb   = var.emulator_endpoint
    iam        = var.emulator_endpoint
    sts        = var.emulator_endpoint
    cloudwatch = var.emulator_endpoint
    logs       = var.emulator_endpoint
    events     = var.emulator_endpoint
    sns        = var.emulator_endpoint
  }
}
```

真正卡人的不是 endpoint，而是**凭证与证书从哪来**。Emulator 自己会生成一套 credentials 文件和 CA 证书，CI 里的正确姿势是把它们写进环境变量，而不是塞进 provider 块：

```yaml
- name: Point Terraform at the emulator credentials and certificate
  run: |
    DIR="$HOME/.aws/emulator/${EMULATOR_PORT}"
    {
      echo "AWS_SHARED_CREDENTIALS_FILE=$DIR/emulator_credentials"
      echo "AWS_CONFIG_FILE=$DIR/config"
      echo "AWS_CA_BUNDLE=$DIR/ca.pem"
      echo "AWS_REGION=us-east-1"
      echo "AWS_EC2_METADATA_DISABLED=true"
      echo "AWS_DISABLE_HOST_PREFIX_INJECTION=true"
    } >> "$GITHUB_ENV"
```

配套的两个细节：启动后要**等健康检查通**再跑 terraform（官方实现里那段 30 次 × 1 秒的循环不是冗余），以及生产环境不要用 `-a off`。关闭签名校验会让任何能访问该端口的人都能调你的"云"，本机玩可以，CI 上必须开签名。

原作者给出的完整流水线实测是 **1 分 25 秒**，其中 apply 从真 AWS 的约 20 分钟压到 2 分钟级别 —— 这个量级和我在本机 mock 上测到的 8.8 秒/资源是同一套逻辑：把"网络与真实资源创建"的等待换成了本地往返。

---

## 五、生态对比：别默认只有官方一个选项

LocalStack 社区版在 2026 年 3 月被收进需要账号与 token 的付费镜像之后，这块地长出好几个分支。选型时真正要看的是"错误保真度"和"启动成本"两项：

| 方案 | 服务覆盖 | 启动/体积 | 许可 | 适合场景 |
|---|---|---|---|---|
| AWS Emulator（官方） | 由 API 模型生成，未支持返 501 | 容器镜像约 1.24 GB | CC0 1.0 | 需要与 AWS 同形状的错误、CI 里跑 apply 预演 |
| LocalEmu | 133 个服务 | 单容器，Apache 2.0 | 从 LocalStack CE 分叉 | 原来用 LocalStack 的团队平迁 |
| Floci | 45 个服务 | 原生二进制，约 24ms 启动、约 13 MiB 空闲 | MIT | 想把 mock 塞进单测、要求启动极快 |
| fakecloud | 107 个服务 | 约 130 MB 二进制、约 300ms 启动、无需 Docker | AGPL-3.0 | 需要 Smithy 级一致性断言 |
| 自建 Go mock | 你写多少算多少 | 一个进程，毫秒级 | 自定 | 只针对自家那几条规则做门禁 |

我这次的结论是**两条路线不冲突**：官方/第三方 Emulator 负责"广度"，用来跑完整 stack 的 `apply` 预演；自建 mock 负责"深度"，把你们团队踩过的那些具体规则（名字长度、配额、命名规范）固化成 PR 门禁，几十行代码、毫秒级响应，不依赖任何外部镜像。

---

## 六、落到流水线上的三步改造

第一步，把 `apply` 从"合并后"提前到"PR 内"，但只打在 mock 上。顺序是 `init → validate → plan → apply(mock)`，最后一步失败即阻断，并且要求 `destroy(mock)` 也绿 —— 后者能抓住"创建成功但删不掉"的资源，这类 bug 在真 AWS 上要花钱才能发现。

第二步，把 mock apply 归类成可读的失败原因。这一层不要只贴原始报错，按错误类型分流：`ValidationException` 指向代码里的取值问题，`ResourceInUseException` 指向 state 漂移，`501` 指向"该服务 Emulator 还不支持，跳过而不是失败"。第三类如果不单独处理，会让人误以为自己的配置错了。

第三步，给 mock 阶段设预算。按本次实测，1 个资源 9 秒、10 个资源 9.2 秒（并发创建，请求数 60 次但时间几乎不变），真正的时间大头是 provider 加载的 6.5 秒。所以缓存 `~/.terraform.d` 与 provider 目录收益最大，比优化资源数量更明显。

几个必须写进团队文档的坑：

- **状态必须有**：没有 `ResourceNotFoundException` 的 mock 一定让 destroy 挂死，`describe` 永远 ACTIVE 是最常见的自坑。
- **别信 IAM**：AWS Emulator 明确不支持权限校验，mock apply 绿了不代表线上 IAM 能过；权限问题仍要靠 `plan` 之外的人工评审或专门的策略检查（如 IAM Access Analyzer）。
- **内存态是优点也是坑**：每个 Emulator 实例的状态只在内存里，重启即清空。CI 里每个 job 一份实例是对的，但本地调试时别指望"上次建的表"还在。
- **遥测要显式表态**：官方 Emulator 默认开遥测，可用 `EMULATOR_TELEMETRY=off` 关掉；如果在意，源码是 CC0，可以自建。
- **证书别写死路径**：`AWS_CA_BUNDLE` 指向 Emulator 生成的文件，端口不同路径不同，写死会在换端口时静默失败。

和上个月那篇 [kube-proxy IPVS 退场迁移](/devops/kube-proxy-ipvs-backend-removal-nftables-migration-2026) 是同一类问题：**配置层看起来永远正确，只有真实执行才暴露差异**。也建议配套读一下 [Gheist 复盘](/devops/gheist-github-actions-log-exfiltration-ci-hardening-2026)，那篇讲的是 CI 里凭证怎么泄露，这篇讲的是 CI 里凭证怎么被安全地"借给"本地 mock —— 两边合起来才是完整的 CI 凭证观。平台工程侧的配套阅读见 [Backstage IDP 实战](/devops/platform-engineering-backstage-idp-2026)，更多云原生实践见 [DevOps 专栏总览](/devops/)。

## 七、把成本算清楚，再决定投不投

先算失败一次的账。按本文实测：mock 侧 plan 6.5 秒、apply 9 秒，一次"预演失败"约 15 秒；同一套代码打到真 AWS，原作者的量级是 apply 20 分钟。也就是说，一次本可以在 PR 内用 15 秒发现的问题，被推到合并后要用 20 分钟 + 一次回滚分支来发现。团队一天合并 10 个 IaC PR、其中 1 个会踩到服务端校验，一个月就是 20 次 × 20 分钟 ≈ 6.7 小时的纯等待，还不含被打断的上下文切换。

再算预演本身的开销。10 个资源 9.2 秒、60 次请求，说明时间并不随资源数线性增长 —— 因为 provider 是并发创建的，真正固定的是那 6.5 秒的 provider 加载。因此想压时间，优先做三件事：缓存 provider 目录、把 plan 与 apply 合并成一次进程内调用（`-out` 存 plan 再 `apply` 该 plan 文件）、以及用 `-target` 把 mock 阶段限制在本次改动涉及的模块上，而不是每次全栈重放。

还有一个并行度上的坑：Emulator 每个实例自带端口、密钥与内存状态，这既是隔离的优点，也意味着**CI 矩阵里每个并行 job 必须各起一份**。共用一份会立刻出现"隔壁 job 建的表在我这里已存在"的假失败。端口要随机化而不是写死 9297，否则同机多 job 直接抢端口。

最后是取舍：如果你们的栈以托管服务为主、变更频率低，`plan` + 人工评审足够；如果是每周多次改基础设施、又经常被 apply 打回来，那这套预演在第一周就能把投入赚回来。判断标准不是"要不要上工具"，而是"服务端校验类失败，一个月发生几次"。

## 参考资料

- [AWS Emulator is now available for building and testing AWS applications locally（AWS What's New，2026-11-11）](https://aws.amazon.com/about-aws/whats-new/2026/11/aws-emulator-now-available/)
- [Testing Terraform with AWS Emulator（notes.hatedabamboo.me，2026-11-12）](https://notes.hatedabamboo.me/terraform-tests-with-aws-emulator/)
- [AWS Emulator in practice：test AWS on your machine（AWS Builder Center，2026-11-13）](https://builder.aws.com/content/3M3qSo4KH3KNMJdJ6SExYVuylnA/aws-emulator-in-practice-test-aws-on-your-machine-with-no-account-and-no-cost)
- [Floci：MIT 许可的本地 AWS 模拟器（Amazon ECR Public Gallery）](https://gallery.ecr.aws/floci/floci)
