---
title: "软件供应链安全 2026：SBOM、SLSA、Sigstore 签名与 AI 时代的信任链加固"
description: "实操 SBOM 生成、SLSA 分级构建、Sigstore keyless 签名与 Cosign 验证，结合 in-toto 溯源、Kyverno 准入控制和 AI 编码 Agent 带来的新型供应链攻击面，给出 CI 可落地加固方案"
date: 2026-06-01
tags: [供应链安全, SBOM, SLSA, Sigstore, Cosign, 容器安全, DevSecOps, AI安全]
category: [安全]
---

# 软件供应链安全 2026：SBOM、SLSA、Sigstore 签名与 AI 时代的信任链加固

## 你的代码有一半不是你的

问开发团队"生产环境跑着什么"，你能得到一个对自家应用的自信回答。但再问"那层之下呢——日志库、日期解析器、它依赖的那四个包、那四个包底下的十一个包"，自信就消失了。

典型现代应用里，**团队自己写的代码只是薄薄一层，底下是几百个别人写的组件。** 供应链攻击正是冲着这层来的——SolarWinds（2020）、Log4Shell、XZ utils，一次次证明：攻破一个被信任的构建管道或依赖，比攻破目标本身容易得多。有统计称 2019-2022 年供应链攻击增长超 730%。

2026 年的核心转变：**把"信任依赖"换成"验证依赖"**。这靠三层——SBOM（里面有什么）、Sigstore（谁签的）、SLSA（怎么构建的）。

## 三层信任栈：各自解决什么问题

| 层 | 工具/标准 | 回答的问题 |
|---|---|---|
| **SBOM** | CycloneDX / SPDX，Syft 生成 | 制品里**有什么**组件和版本？ |
| **Sigstore** | cosign keyless、gitsign、Rekor | 制品**谁签的**？有没有被篡改？ |
| **SLSA** | 4 级框架，slsa-github-generator | **构建过程**本身可不可信？ |
| **in-toto** | 溯源声明 | 每个步骤怎么**串联**起来的？ |

一句话：**SBOM 告诉你里面有什么，不代表它是从你以为的代码构建的，也不代表构建过程没被攻破。** 三层合起来，才能断言"生产跑的就是被批准的"。

## 第一层：SBOM——清单不是信任

2021 年美国行政令强制了 SBOM，这推得不错——它至少逼每个组织搞清楚自己到底在发什么。SBOM 列出组件、版本、来源元数据，用 CycloneDX 或 SPDX 格式。

用 Syft 在构建时生成：

```bash
# 对镜像生成 CycloneDX SBOM
syft ghcr.io/myorg/myapp:v1.2.3 -o cyclonedx-json > sbom.cyclonedx.json

# 或用 GitHub Action
- name: Generate SBOM
  uses: anchore/sbom-action@v0
  with:
    image: ghcr.io/myorg/myapp@${{ steps.build.outputs.digest }}
    format: cyclonedx-json
    output-file: sbom.cyclonedx.json
```

但记住：**清单本身不代表信任**。SBOM 可以被篡改、可以过时，所以清单必须是"签名过的声明"的一部分——这就是下一层。

## 第二层：Sigstore——keyless 签名

传统签名要管私钥，密钥管理本身就是负担。Sigstore 的杀手锏是 **keyless 签名**：用 OIDC 身份（如 GitHub Actions 的 OIDC token）临时签发证书，不用长期私钥。签名和证书存进 Rekor 透明日志，任何人可验证。

**Cosign 是 Sigstore 的镜像签名工具**，签名存在同一个 OCI registry，用单独 tag 存：

```bash
# keyless 签名（用 OIDC 身份，无密钥管理）
cosign sign --yes ghcr.io/myorg/myapp:v1.2.3

# 验证（校验身份 + 颁证方）
cosign verify \
  --certificate-identity-regexp="https://github.com/myorg/myapp" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
  ghcr.io/myorg/myapp:v1.2.3

# 附加自定义声明（比如 SBOM）
cosign attest --predicate sbom.json --type spdxjson \
  ghcr.io/myorg/myapp:v1.2.3

# 验证声明
cosign verify-attestation \
  --type spdxjson \
  --certificate-identity-regexp="https://github.com/myorg/myapp" \
  ghcr.io/myorg/myapp:v1.2.3
```

**开发者提交也能签**：用 `gitsign`（Sigstore 用于 git 提交，OIDC 认证），让"这行代码确实是提交者写的"也能被验证。

**还有谁在用**：PyPI 开始 rollout Sigstore-based provenance，GitHub 在 Actions 里集成了 Sigstore，GitHub npm registry 也跟进了。从这些 registry 拉包，验证"包确实是从声明的源码构建的"正在成为预期基线。

## 第三层：SLSA——构建过程可信吗

SLSA（Supply-chain Levels for Software Artifacts，读"salsa"）由 Google 提出、OpenSSF 维护，定义四级构建完整性：

| 级别 | 含义 |
|---|---|
| **L1** | 构建有文档记录（有 provenance） |
| **L2** | 构建托管 + 签名 provenance |
| **L3** | 通过非入站构建服务产出，隔离 + 无网络 | 构建环境 |
| **L4** | 可重现构建 + 双人评审 |

生成 SLSA provenance 的上手方式（GitHub）：

```yaml
# 用 slsa-github-generator 生成已签名的 provenance
uses: slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@v1
```

今天上手比两年前轻松太多：GitHub 内建 attestation 支持 + cosign/slsa-github-generator 成熟，**多数制品类型一个下午就能到 SLSA L2**。两年前这还是个几周的项目。

::: tip
构建时用 `docker buildx` 加 `provenance: mode=max` 和 `sbom: true`，就能在构建同时产出 SLSA-compatible provenance + 内建 SBOM，作为 attestation 挂到 registry。
:::

## in-toto：把链条串起来

in-toto 把"源码链接 → 构建链接 → SBOM → 漏洞扫描 → 签名 → 部署"这些**独立步骤串成一条可验证的链**。本质上是个类 Merkle 的 attestation 图——消费者能从一个运行的容器，一路回溯到"哪个 commit、哪个构建、哪次扫描"，并验证每一步的签名。

Cosign 的 `cosign attest` 家族产出的就是 in-toto-compatible attestation。

## 端到端落地：CI 加固 + 集群准入

### CI 链条（构建侧）

```yaml
# 完整链条：构建 → SBOM → 签名 → 漏洞扫描 → SLSA provenance
- name: Build (with provenance + SBOM)
  uses: docker/build-push-action@v6
  with:
    provenance: mode=max
    sbom: true

- name: Sign image (keyless)
  run: cosign sign --yes ${{ steps.build.outputs.digest }}

- name: Vulnerability scan (fail on CRITICAL/HIGH)
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ steps.build.outputs.digest }}
    severity: CRITICAL,HIGH
    exit-code: 1

- name: Attest vuln scan
  run: cosign attest --yes --predicate trivy-report.json \
        --type vuln ${{ steps.build.outputs.digest }}

- name: SLSA L3 provenance
  uses: slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@v1
```

### 集群准入（消费侧）

在集群里用 **Kyverno 准入策略 + Sigstore Policy Controller**，拒绝任何"未签名、无法验证、含高危漏洞"的镜像：

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-images
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-signature-and-no-high-cve
      match:
        any:
          - resources:
              kinds: [Pod]
      verifyImages:
        - imageReferences: ["ghcr.io/myorg/*"]
          attestors:
            - count: 1
              entries:
                - keyless:
                    issuer: "https://token.actions.githubusercontent.com"
                    subject: "https://github.com/myorg/myapp"
          mutateDigest: true
```

**准入策略是把关的地方**——签名/SBOM/扫描在 CI 里做了，但如果没有准入强制，"做了"只是表演（theatre）。策略控制器才是让它从"合规展示"变成"实际拦截"的那道闸。

## AI 时代的供应链新攻击面

2026 年供应链攻击面多了一块：**AI / 编码 Agent**。

攻击路径已经从"改装构建工具/依赖/CI runner/开发者笔记本"扩展到 **agentic coding tool 本身**——一个被投毒的 prompt、一个恶意代码补全、一个伪装成合法库的名字（typosquatting）、一个被污染的训练/上下文，都能让"AI 写的代码"带上后门。这就是为什么 **LLM 供应链风险**（模型被投毒、微调数据被污染、RAG 知识库被污染、依赖库被投毒）成了独立防线。

应对思路没变：**把 AI 输出当不可信输入**，同样走签名 + 扫描 + 双人评审。AI 加快了写代码的速度，也加快了引入漏洞的速度——工艺上要更严格，而不是更宽松。

## 结论：从"信任"到"验证"

供应链安全不是"装个工具"就完事，是一次思维转变：

1. **SBOM** 让你知道里面有什么（清单）
2. **Sigstore / Cosign** 让你知道谁签的（签名）
3. **SLSA** 让你知道怎么构建的（过程）
4. **in-toto** 把步骤串成可验证的链
5. **Kyverno / Policy Controller** 在集群准入拦截（强制）
6. **AI 时代**把 AI 输出当不可信输入，同样验证

**先易后难的上手路径**：先从 GitHub 内建 attestation + SBOM 做到 SLSA L2（一个下午），再加集群准入强制。别把精力浪费在"完美的钥基础设施"上——keyless 签名就是为了让你跳过那部分。

::: tip
别再问"要不要做"，问"从哪一级开始"。2026 年的工具链已经把门槛压到"一个下午到 SLSA L2"。真正的差别不在工具，在于你有没有在**准入**里真正强制，而不是只生成一堆没人验证的报告。
:::
