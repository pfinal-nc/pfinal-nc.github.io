---
title: Gheist 复盘：GitHub Actions 日志变外泄通道，CI 凭证加固实战
date: 2026-11-16 07:30:00
author: PFinal南丞
tags:
  - devops
  - ci/cd
  - github-actions
  - 供应链安全
description: 一条 workflow 就能搬走整仓库密钥——Gheist 在 13,500 个分支植入 sync-check，把 secrets 用 base32 打进 Actions 日志再删记录。本文拆解攻击链、复现 base32 绕过脱敏，给出排查命令与 OIDC 加固 YAML。
keywords:
  - GitHub Actions 安全
  - CI/CD 供应链
  - secrets 泄漏
  - base32 绕过
  - OIDC 联邦
  - environment 审批
  - 自托管 runner
  - workflow 权限
  - GITHUB_TOKEN
  - 凭证轮换
---

> TL;DR：Gheist 不需要往你的机器里放马，也不需要自己的服务器。它只用一枚偷来的 token 建个新分支、提交一个 12 行的 workflow，让 secrets 以 base32 形式打印进 Actions 日志，几秒后用 API 把日志拉走、把 run 删掉。13,500 个分支、850+ 账号被波及，公开仓库被 GitHub 的审批拦截挡住，**私有仓库则没有这层保护**——而生产凭证几乎都在私有仓库里。

## 一、事件：一条 workflow 就是一个外泄通道

Wiz Research 从 2026-09-15 开始追踪这组活动，因为其工具在 API 请求里带着 `gheist` 这个 user-agent 而得名。CSA 在 10-29 发布的速报把关键数字与机制都写清楚了：

| 维度 | 公开信息 | 备注 |
|---|---|---|
| 活动周期 | 2026-09-15 起，截至 10-24 仍在变化 | 工具在六周内改版多次 |
| 规模 | 13,500+ 个植入分支、850+ 个账号 | 从个人项目到企业私有仓库 |
| 实际落地 | 集中在私有仓库；公开仓库的运行被审批挂起 | GitHub 7-28 上线的 hold 只覆盖 github.com 公开仓库 |
| 取证线索 | AWS CloudTrail 中出现攻击分支上的角色扮演记录 | 说明凭证真的被用起来了 |
| 前序关系 | 首批 57 个账号也是 5 月 Megalodon 事件的受害者 | 凭证复用形成链条 |

链条值得警惕：2026-03 的 Trivy 供应链事件（tag 被强制指向恶意代码）洗出一批 CI 凭证，5 月的 Megalodon 用 5,718 次提交污染 5,561 个仓库，10-08 的 GhostAction 又推了 345 个仓库。**一次事件的产出，成为下一次事件的输入**，这是当前 CI 供应链风险的基本形态。

## 二、五步攻击链：每一步都留了痕，但都很轻

| 步骤 | 具体动作 | 留下的痕迹 |
|---|---|---|
| 1. 拿到可写 workflow 的 token | 经典 PAT 带 `workflow` scope，或对 workflows 有写权限的细粒度 token / App | 令牌归属人的设备上可能装了信息窃取木马 |
| 2. 建分支 | `ci-sync-` + 6 位随机小写字母数字 | 分支名正则高度固定 |
| 3. 提交工作流 | 单文件 `.github/workflows/sync-check.yml`，提交信息 `ci: sync config`，未签名，作者显示为 token 主人 | 新分支的唯一改动就是 workflow |
| 4. 打印密钥 | `toJSON(secrets)` 与整个环境变量经 `base32 -w 120` 输出到日志 | 日志里出现超长 base32 串 |
| 5. 取走并抹除 | 通过 GitHub API 下载日志，数秒内删除该次 run | 审计日志里有"完成即删"的时间差 |

第三步为什么能绕过代码评审？因为**默认分支保护管不到新建分支**：新分支上的 workflow 是第一方代码，`push` 触发时直接拿到仓库级、组织级 secrets，不需要 fork、不需要 PR 审批。这是整套手法的地基。

第二步还有一个最容易被误判的细节：payload 里写了 `permissions: {}`。很多人看到这一行就放心了，但它限制的是**自动签发的 `GITHUB_TOKEN`**，完全管不到 `secrets` 上下文。

| 资源 | `permissions: {}` 是否限制 |
|---|---|
| `GITHUB_TOKEN` 的 API 权限 | 是，全部收窄为只读/不可用 |
| 仓库级 / 组织级 `secrets` | **否**，仍全部可读 |
| environment 级 `secrets` | 否，但需要环境没有配置保护规则 |
| OIDC 联邦凭证 | 否，`id-token: write` 一开就能换云凭证 |

更麻烦的是工具还在进化：Tool B 加了 6 分钟超时和**枚举部署环境的 job matrix**——环境级密钥通常是生产凭证，矩阵一铺开，没配保护规则的环境就全被摸了一遍。10-19 又加了 `sync-host` job，专门盯自托管 runner：在宿主机上找 31 种 token 格式（Anthropic、Hugging Face、Groq、NVIDIA 的 key）、私钥、`.env`、Terraform state、shell history，还顺带探云元数据服务、Docker socket 和 K8s ServiceAccount token。

## 三、为什么 base32 能绕过日志脱敏

GitHub 会对日志里出现的密钥做掩码，但匹配方式是**字面比对**，而官方文档自己也写明：一个值可能被多种方式变换，"这种脱敏不被保证"。所以只要在打印前做一次编码，掩码就失效了。本地一分钟就能复现：

```bash
SECRET="ghp_ExampleTokenValue1234567890"
# 模拟攻击者的输出方式：编码后打印
echo "$SECRET" | base32 -w 120
# => MFRGGZDFMZTWQ2LKNNWG23TPOIYHGZLQNJQXG3BOMNXW2===
# 日志里看不到 ghp_ 前缀，掩码规则不再命中
```

反过来看，这个原理也直接给出了检测思路：**防守方要扫的是"高熵长串"，不是密钥字面量**。一条简单的日志巡检脚本就能覆盖大部分变体：

```bash
# 拉取最近一次运行的日志，找出疑似 base32 编码的超长串
gh run view "$RUN_ID" --log > /tmp/run.log
grep -nE '[A-Z2-7]{60,}={0,6}' /tmp/run.log | head -20

# 高熵判断（大于 4.5 bit/char 的串值得人工看一眼）
python3 - <<'PY'
import re, math, collections
s = open('/tmp/run.log', errors='ignore').read()
for m in re.findall(r'[A-Z2-7]{60,}={0,6}', s):
    p = collections.Counter(m); h = -sum(c/len(m)*math.log2(c/len(m)) for c in p.values())
    if h > 4.5: print(round(h,2), m[:48] + '...')
PY
```

## 四、四条可跑的排查命令：先确认自己在不在名单里

痕迹虽然轻，但都是可枚举的。下面四条按"分支 → 提交 → 运行记录 → 云侧"逐层收口：

```bash
OWNER=your-org; REPO=your-repo

# 1. 有没有 ci-sync-xxxxxx 分支（正则来自公开 IOC）
gh api "repos/$OWNER/$REPO/branches?per_page=100" \
  --jq '.[].name' | grep -E '^ci-sync-[0-9a-z]{6}$'

# 2. 有没有那条固定提交信息（跨仓库用 search）
gh search commits --owner "$OWNER" "ci: sync config" --limit 50

# 3. 有没有"完成即删"的 run（组织审计日志是主要证据源）
gh api "/orgs/$OWNER/audit-log?phrase=action:workflows.delete&per_page=100" \
  --jq '.[] | [.created_at, .actor, .repo] | @tsv'

# 4. 云侧：OIDC 主体里带 ci-sync- 分支的角色扮演
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=AssumeRoleWithWebIdentity \
  --max-results 50
```

四个注意点：

1. **第 3 条是唯一不会随攻击者改工具而失效的证据**。run 被删后 UI 里什么都不剩，只有审计日志和云侧记录还在，前提是你确实采集了它们。
2. **第 4 条有坑**：OIDC 的 `sub` 只有在 job 没绑定 environment 时才包含分支名；绑了 environment 会变成 `repo:org/repo:environment:prod`。所以按分支名搜可能漏掉，要同时按仓库、workflow 和时间窗关联。
3. 公开的 IOC（user-agent、四个 workflow blob 哈希、`.gdmp_pat` 等文件）价值会衰减——六周内工具已经改版多次。**行为特征更耐久**：完成一分钟内被删除的 run、新分支唯一改动是 workflow。
4. 命中任何一条，处理原则是"假定全暴露"。删分支、删 run 都不等于止损，密钥已经离开过。

## 五、根治：让"任意分支"拿不到生产凭证

排查是止血，加固才是根治。核心思路只有一句：**生产凭证不能出现在不受保护的分支上下文里**。

```yaml
name: release
on:
  push:
    branches: [main]          # 只允许默认分支触发
permissions: {}                # 默认全关，按 job 单独开
concurrency:
  group: release
  cancel-in-progress: false
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production    # 环境级 secret + 必需审批人
    permissions:
      id-token: write           # 只为 OIDC 换云凭证
      contents: read
      attestations: write
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # 固定到完整 SHA
      - uses: aws-actions/configure-aws-credentials@e3dd6a429d7300a6a4c196c26e071d42e0345131
        with:
          role-to-assume: arn:aws:iam::123456789012:role/deploy-prod
          role-session-name: ${{ github.run_id }}
```

这份 YAML 里，每一行都在堵第二章那个洞：`branches: [main]` 让新分支上的 workflow 无法触发生产流水线；`environment: production` 让密钥只有在审批通过后才可读；`id-token: write` 用短期凭证替代长期 AK/SK；固定完整 SHA 防止 tag 被指向恶意提交。

这里要特别强调 GitHub 7-28 上线的审批拦截：它确实把公开仓库里的每一次 Gheist 运行都挂住了，Wiz 的判断是"控件生效、恶意 payload 从未执行"。但官方说明写得很清楚——**仅覆盖 github.com 上的公开仓库，GitHub Enterprise Server 当前不在范围内**。企业代码通常放在私有仓库或自建实例里，恰好是这层保护没盖到的地方。所以把"平台会替我挡"当成防御策略的一部分，是这次事件里最危险的误判。

### 5.1 演练：用一条假密钥验证策略是否真生效

加固完不能只靠读配置来确认，得真的试一次。做法是建一个临时分支，提交一份试图打印 secrets 的 workflow，观察它到底能不能跑到：

```yaml
# .github/workflows/secrets-canary.yml（只放在测试分支，验完即删）
name: secrets-canary
on: push
permissions: {}
jobs:
  probe:
    runs-on: ubuntu-latest
    steps:
      - name: would-exfiltrate
        run: |
          if [ -n "${CANARY_SECRET:-}" ]; then
            echo "CANARY_VISIBLE: $(echo -n "$CANARY_SECRET" | base32 -w 120)"
          else
            echo "CANARY_BLOCKED: secrets context is empty here"
          fi
```

判断标准很干脆：**在非受保护分支上推出 `CANARY_BLOCKED` 才算合格**。如果打印出了 `CANARY_VISIBLE`，说明这枚 canary 落在仓库级 secret 或未加保护的环境里，攻击者拿到写权限就同样能读到。canary 的值随便填一串可识别的假值（例如 `canary-do-not-use-123`），它不承载任何真实权限，用完删分支、删 secret 即可。这个演练每季度做一次，比读十遍配置更可靠。

| 错误做法 | 正确做法 | 堵住的路径 |
|---|---|---|
| 长期 PAT 存在 secrets 里 | GitHub App 或短期细粒度 token | token 被偷后长期可用 |
| 仓库级 secret 存生产密钥 | environment 级 + required reviewers | 任意分支都能读 |
| OIDC `sub: repo:org/repo:*` | 限定 branch 或 environment | 攻击分支能换云角色 |
| `uses: some/action@v3` | 固定完整 commit SHA | tag 重定向投毒 |
| 用 `pull_request_target` 再 checkout PR 代码 | 拆成两段，禁止在特权上下文跑 PR 代码 | pwn request（TanStack 就是这么中的） |
| 自托管 runner 长驻共享 | 每次任务新实例，任务后销毁 | 落盘凭证被下次复用 |

## 六、自托管 runner 与 AI Key：新的高价值目标

这两年 CI 里最值钱的东西变了。以前是云 AK/SK，现在还要加上一批模型厂商的 API key——Gheist 的 `sync-host` job 明确在找 Anthropic、Hugging Face、Groq、NVIDIA 四家的 key，10 月的 GhostAction 则盯 OpenAI、OpenRouter 和 Anthropic。原因很直接：模型 key 能直接消耗付费额度，能访问私有微调模型，还可能读到含敏感内容的提示词日志。

| 面 | 加固动作 | 验收方式 |
|---|---|---|
| 宿主文件 | 不把 `.env`、Terraform state 落盘；任务结束即销毁实例 | 实例生命周期 < 单次 job |
| 云元数据 | 阻断 169.254.169.254，或强制 IMDSv2 + 最小角色 | 容器内 curl 应超时 |
| Docker socket | 不挂载 `/var/run/docker.sock` 给业务 job | `docker ps` 在 job 内失败 |
| K8s 凭证 | `automountServiceAccountToken: false`，RBAC 最小化 | Pod 内无 token 文件 |
| 模型 key | 与云凭证同级轮换；按项目/环境隔离 | 泄漏演练能定位到具体 key |
| 出网 | 默认拒绝，按需白名单；CI 不应能直连任意公网地址 | 任务内 `curl` 外部域名失败 |

出网限制值得单独说一句：Gheist 的通道是 GitHub 自己的 API，所以网络层看不到任何异常外联，但这并不代表 egress 控制没用——恰恰相反，正因为主要通道走的是合法域名，你更需要在 runner 侧收紧默认出网，把"只能访问声明的依赖源与制品库"这条基线立起来，异常通道才无处可藏。

## 七、结论

这次事件最值得记住的不是 13,500 这个数字，而是它揭出的一个结构性事实：**CI 是唯一同时握有源码写权限与生产密钥的自动化系统，而它的信任边界常常只是"能 push 就行"**。

- `permissions: {}` 不是安全带，它只管 `GITHUB_TOKEN`；
- 日志脱敏不是安全带，它只做字面匹配；
- 分支保护不是安全带，它只保护默认分支。

真正管用的三件事：environment 审批把密钥锁在受控上下文里、OIDC 把长期凭证换成短期凭证、固定 SHA 把依赖锁死在确定的字节上。这三件都不需要额外产品，改配置文件就能做到。

顺带说一句，本站的 CI 也是 GitHub Actions——每次 `push master` 后构建 VitePress 再部署 gh-pages。这篇里的加固项，我自己也得照着过一遍。

同方向的延伸阅读：[ChainDrop npm 蠕虫复盘](/devops/chaindrop-npm-supply-chain-worm-2026) 讲了供应链控件集体失灵的那次；[安全工程专栏](/security/engineering/) 里有更多密钥与权限治理的实践；数据库侧的同类问题见 [Supabase RLS 实战](/security/engineering/supabase-rls-ai-generated-app-data-exposure-2026)。

## 参考资料

- [Gheist: Stolen GitHub Tokens Turn Actions Logs into Exfiltration Channels](https://labs.cloudsecurityalliance.org/wp-content/uploads/2026/10/CSA_research_note_gheist_github_token_actions_secret_theft_20261029-csa-styled.pdf) — Cloud Security Alliance，2026-10-29，汇总 Wiz Research 的机制、IOC 与处置建议
- [GitHub Docs: Using secrets in GitHub Actions（含脱敏不保证的说明）](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)
- [GitHub Docs: About security hardening with OpenID Connect](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [TanStack 供应链事件：利用 GitHub Actions 在六分钟内发布 84 个恶意 npm 包](https://based.info/tanstack-supply-chain-attack-exploited-github-actions-to-publish-84-malicious-npm-packages-in-six-minutes/)
- [Gheist 如何用 GitHub 令牌搬走仓库密钥（中文报道，含规模数字）](https://news.sohu.com/a/1094995587_122661108)
