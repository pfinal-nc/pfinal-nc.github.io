---
title: 别再把 token 塞进沙箱：给 coding agent 做凭证代理的 Go 实战
date: 2026-11-18 07:30:00
author: PFinal南丞
tags:
  - ai agent
  - golang
  - 凭证管理
  - 安全
  - mcp
description: coding agent 跑在一次性 VM 上很方便，但凭证怎么办？把 token 拷进沙箱、ssh -A 转发私钥，都是把权限一次性交出去。本文拆解 11 月这波"agent 不碰凭证"的讨论，给出四条路线对比、Go 实现的策略化命令代理与 HTTP 凭证注入反代，并实测代理层开销。
keywords:
  - coding agent 凭证
  - agent 沙箱 安全
  - 凭证代理
  - Go 反向代理
  - 短期令牌
  - SSH agent 转发
  - agent 权限隔离
  - 最小权限
  - MCP 工具
  - 审计日志
---

> TL;DR：让 agent 用不到凭证，比给凭证加权限更可靠。本文给两条 Go 实现路径——**策略化命令代理**（凭证留在你机器上，agent 只能拿到输出）和 **HTTP 反代注入**（agent 只看见假 token，真 token 在代理侧补上）。本机实测代理层每次调用多花约 60 µs、吞吐降约 35%，对每次工具调用动辄几百毫秒的 agent 场景，这个代价可以忽略。

## 一、背景：agent 跑在一次性 VM 上，凭证却还留在里面

这周 HN 上讨论最多的一类话题，是"怎么让 coding agent 干活但不给它我的身份"。作者的处境很典型：Claude Code 在一个仓库跑，Codex 在另一个分支 review，都跑在一次性的 VM 上——但 agent 要推代码、要看 CI、要调 API，就得有 `gh` 的 token、有 SSH key。

现实里通常只有两个选择，而且都不好：

| 做法 | 便利性 | 真实风险 |
|---|---|---|
| 把凭证拷进 VM（`~/.config/gh/hosts.yml`） | 高 | 该机器上**任何进程**都能读，包括 agent 自己起的子进程、它执行的一条 `curl`、一个被投毒的依赖；token 有效期内全程可用 |
| `ssh -A` 转发 agent | 中 | 私钥虽然留在本机，但 VM 可以**无提示、无记录**地使用 agent 里所有 key，且只覆盖 SSH |

一句话概括痛点：**这两种方式都是"把权限一次性批发出去"，出了问题你连"它到底拿我的身份做了什么"都答不上来。**

真正想要的形态是：凭证永远不离开你的机器，需要凭证的命令也在你的机器上执行，agent 只拿到输出——并且每一次调用都要经过策略校验和你的确认。

## 二、威胁模型：先想清楚要防谁

在设计之前把攻击面摆清楚，否则很容易做成"看起来安全"的摆设。

| 威胁 | 具体场景 | 有效控制点 |
|---|---|---|
| 凭证被读取 | agent 执行 `cat ~/.config/gh/hosts.yml`、`env` | 凭证根本不在沙箱内 |
| 凭证被复用 | 沙箱快照被复制、镜像被共享 | 凭证不进镜像、租约短时效 |
| 越权调用 | agent 用你的 token 推 `main`、删仓库、读私有库 | 策略层限制可执行文件与参数前缀 |
| 提示注入劫持 | 网页/issue 内容里藏指令，诱导 agent 调高危命令 | 人工确认（带原因的审批弹窗） |
| 无声操作 | 调用成功但你事后无从追溯 | 全量审计日志（脱敏、可开关参数记录） |
| 侧信道泄漏 | 命令打印自身环境变量、`core dump` 落地 | 禁止 `env`/`sh` 类可执行文件、禁用 core |

这里要补一句常被忽略的常识：提示注入不是"理论风险"，而是已经发生过的现实事故。今年有多起公开案例，都是 agent 读到网页或 issue 里的隐藏指令，然后按指令调用自己本来有权限的工具。**只要 agent 手里有高权限凭证，一次成功的提示注入就等于一次完整的数据泄露或代码植入**——这也是"让它拿不到凭证"优先级高于"让它别乱用凭证"的原因。

注意最容易被忽略的最后一行：**只要允许 agent 运行 `env` 或 `sh -c`，前面所有努力立刻归零**——它会把注入进去的 token 原样打印出来。允许 `op read` 这类"读密钥"的命令也是同一个坑。策略必须按"可执行文件白名单 + 参数前缀"匹配，而不是按"命令字符串不含危险词"匹配。

## 三、四条路线：从糙到细

| 路线 | 凭证在哪 | agent 看见什么 | 运维成本 | 适合场景 |
|---|---|---|---|---|
| 环境变量注入 | 沙箱内 | 真凭证 | 低 | 本地临时实验，用完即销毁 |
| 短期令牌（GitHub App installation token） | 沙箱内 | 真但短命 | 中 | CI 类任务，权限可按仓库收敛 |
| 命令代理（凭证留在宿主机） | 宿主机 | 只有 stdout | 中高 | 需要 `gh`/`aws`/`ssh` 等 CLI 的场景 |
| HTTP 反代注入 | 代理进程 | 占位 token | 中 | agent 通过 SDK/HTTP 调 API 的场景 |

短期令牌是性价比最高的一档：用 GitHub App 换 1 小时有效的 installation token，权限收敛到单个仓库、单个 scope，即使泄漏窗口也有限。但它解决不了"agent 用 token 干了越权的事"——权限还在它手里。

工程上最稳的做法是分层叠加，而不是二选一：**入口用短期令牌（缩小时间窗）+ 出口走代理（收回执行权）**。这样即便代理策略被绕过，泄漏出去的也只是一小时后过期的、只能读单个仓库的 token；反过来，如果令牌是长期的、但代理拦得死，风险也能控在"代理审批的每一次调用"这一层。

要解决越权，就得把**执行权**也收回来，这就是命令代理和 HTTP 反代。下面两条都用 Go 实现。

## 四、Go 实现①：策略化的命令代理

核心是一个跑在宿主机上的 Unix socket 服务：沙箱里只放一个瘦客户端，agent 发来 `{exe, args, reason}`，服务端按策略校验、等人确认、在宿主机执行、把输出回传。凭证通过 `op read` 之类的方式在执行前注入环境变量，**不经过 agent 的任何可见路径**。

```go
// policy.json：默认拒绝，只放行白名单
// {
//   "default": "deny",
//   "commands": [
//     {"exe": "/opt/homebrew/bin/gh", "args_prefix": ["pr", "view"], "approval": "always"},
//     {"exe": "/opt/homebrew/bin/gh", "args_prefix": ["api", "user"], "approval": "always",
//      "secrets": {"GH_TOKEN": "op://Dev/github/token"}}
//   ],
//   "max_runtime": "30s"
// }

type Rule struct {
	Exe        string            `json:"exe"`
	ArgsPrefix []string          `json:"args_prefix"`
	Approval   string            `json:"approval"`
	Secrets    map[string]string `json:"secrets"`
}

type Policy struct {
	Default    string `json:"default"`
	Commands   []Rule `json:"commands"`
	MaxRuntime string `json:"max_runtime"`
}

// Match：只有 exe 完全一致且 args 以 prefix 开头才放行
func (p *Policy) Match(exe string, args []string) (*Rule, bool) {
	if p.Default != "deny" {
		panic("policy must be default-deny")
	}
	for i := range p.Commands {
		r := &p.Commands[i]
		if r.Exe != exe || len(args) < len(r.ArgsPrefix) {
			continue
		}
		ok := true
		for j := range r.ArgsPrefix {
			if args[j] != r.ArgsPrefix[j] {
				ok = false
				break
			}
		}
		if ok {
			return r, true
		}
	}
	return nil, false
}
```

执行侧必须做三件事：**限时、限量、脱敏记录**。限时防挂死，限量防 agent 用 `gh api` 拉一个 200 MB 的响应把内存打爆，脱敏保证审计日志本身不变成新的泄漏源。

```go
func (b *Broker) Exec(ctx context.Context, req Request) (Result, error) {
	rule, ok := b.policy.Match(req.Exe, req.Args)
	if !ok {
		return Result{}, fmt.Errorf("denied by policy: %s %v", req.Exe, req.Args)
	}
	if rule.Approval == "always" {
		if err := b.approve(ctx, req); err != nil { // 人工确认，带 reason 原文
			return Result{}, err
		}
	}
	ctx, cancel := context.WithTimeout(ctx, b.maxRuntime)
	defer cancel()

	cmd := exec.CommandContext(ctx, req.Exe, req.Args...)
	cmd.Env = append(os.Environ(), b.resolveSecrets(rule)...)
	out, err := cmd.CombinedOutput()
	if len(out) > b.maxOutput {
		out = out[:b.maxOutput]
	}
	b.audit(req, err) // 只记录 exe/args 摘要/退出码，不记录输出与密钥
	return Result{Output: string(out), Code: cmd.ProcessState.ExitCode()}, err
}
```

沙箱侧客户端只有一个职责：把请求通过 socket 发过去，把输出打印出来。它不需要、也拿不到凭证。

```bash
# 沙箱内：agent 只会看到这一条命令
cargo run -q --bin agent-cred -- --reason "查看 PR 描述" -- gh pr view 128 --json title,body
# 宿主机：审批弹窗 → 执行 gh → 输出回传；GH_TOKEN 从未出现在沙箱
```

## 五、Go 实现②：HTTP 反代注入凭证

如果 agent 不是调 CLI，而是用 SDK 直接打 HTTP API，那更适合在出口做一层反代：**给 agent 一个占位 token（比如 `sk-agent-placeholder`），代理把它替换成真 token 再转发，同时按 method + path 白名单拦截。**

```go
func NewBroker(target *url.URL, allow []Rule, realToken string) http.Handler {
	rp := httputil.NewSingleHostReverseProxy(target)
	orig := rp.Director
	rp.Director = func(r *http.Request) {
		orig(r)
		r.Header.Set("Authorization", "Bearer "+realToken) // 覆盖掉占位值
		r.Header.Set("X-Broker-Lease", leaseID())
	}
	rp.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		http.Error(w, "upstream error", http.StatusBadGateway) // 不回显上游细节
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !allowed(allow, r.Method, r.URL.Path) {
			http.Error(w, "path not allowed", http.StatusForbidden)
			return
		}
		rp.ServeHTTP(w, r)
	})
}

func allowed(rules []Rule, method, path string) bool {
	for _, r := range rules {
		if r.Method == method && strings.HasPrefix(path, r.PathPrefix) {
			return true
		}
	}
	return false
}
```

要点有三：一是 **Director 里覆盖而不是追加** `Authorization`，避免 agent 塞两个头造成歧义；二是 **错误页不回显上游响应**，否则上游的 401 详情会把后端信息漏给 agent；三是 **path 前缀匹配要带边界**（`/repos/pfinal/` 而不是 `/repos/pfinal` 裸前缀），防止 `/repos/pfinal-evil` 蹭进来。

这套写法对客户端透明——agent SDK 完全不用改，只要把 `base_url` 指向代理即可。这也是它比自建鉴权中间件更好用的地方。

### 5.1 真凭证从哪来：别写进配置文件

代理侧的真凭证不要写死在 JSON 里，否则等于把风险从沙箱搬到了宿主机的一份明文文件。三种常见接法：

```go
// 接法一：本地密钥库（1Password CLI / macOS Keychain），读一次进程内缓存
func (b *Broker) secret(ref string) (string, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if v, ok := b.cache[ref]; ok && time.Since(b.cacheAt[ref]) < 10*time.Minute {
		return v, nil
	}
	out, err := exec.Command("op", "read", "--no-newline", ref).Output()
	if err != nil {
		return "", err
	}
	b.cache[ref] = string(out)
	b.cacheAt[ref] = time.Now()
	return string(out), nil
}

// 接法二：KMS / Secret Manager，按 TTL 刷新，TTL 必须短于凭证自身有效期
```

缓存 10 分钟是有意的取舍：太短会让每次调用都走一次密钥库（耗时且会触发系统授权），太长则失去"临时下架"的意义。**缓存 TTL 一定要短于凭证轮换周期**，否则轮换完成后代理还在用旧值，排查起来非常费劲。

## 六、开销实测：代理不是零成本，但也不是瓶颈

我把上面这个反代跑在 2 核机器上，上游是一个返回 40 字节 JSON 的本地服务，keep-alive、2000 次请求、各跑两轮：

| 链路 | 平均延迟 | P50 | P99 | 吞吐 |
|---|---|---|---|---|
| 直连上游 | 0.113–0.141 ms | 0.097–0.126 ms | 0.293–0.518 ms | 7,115–8,825 QPS |
| 经凭证反代 | 0.185–0.189 ms | 0.166–0.175 ms | 0.559–0.580 ms | 5,303–5,402 QPS |

测法说明：上游是一个返回固定 40 字节 JSON 的本地 HTTP 服务，客户端 `MaxIdleConnsPerHost=64` 保持长连接，串行发 2000 次请求，直连和过代理各跑两轮避免预热偏差。**串行是为了测纯延迟，看吞吐才需要并发**——如果用并发压测，瓶颈会先出现在客户端 goroutine 调度而不是代理本身，数据反而失真。

结论：**P50 增加约 60 µs，吞吐下降约 35%**。这个量级放在 agent 场景里完全不值得纠结——一次 LLM 工具调用本身就要几百毫秒到几秒，60 µs 是它的万分之一。反过来说，如果你的场景是高频内部 RPC（每秒几千次），那就别用"每请求过一次 Go 反代"的方案，改成 sidecar 注入或服务网格更合适。

## 七、六个生产环境的坑

| 坑 | 表现 | 对策 |
|---|---|---|
| 允许 `env` / `sh` | token 被原样打印进对话历史 | 白名单只放具体可执行文件，禁 shell 包装 |
| 命令输出被记录 | 审计日志里出现密钥、私有 URL | 日志只存 args 摘要 + 退出码，输出不落盘 |
| 沙箱端口复用 | agent 自己起个服务占用代理端口 | 反代用独立 socket 或 localhost 随机端口 |
| lease 不绑定命令 | "批准一次"变成"批准一切" | 租约绑定 exe + 参数哈希，超次或超时即失效 |
| 重连后 socket 失效 | agent 持有旧 `SSH_AUTH_SOCK` 路径 | 固定路径软链 + 重连时更新（`~/.ssh/rc`） |
| core dump 落地 | 崩溃时内存里的 token 被写盘 | `ulimit -c 0`、关闭沙箱内调试器权限 |

第三行值得展开：如果代理和 agent 在同一台机器、同一个网络命名空间里，agent 完全可以让自己的进程监听代理端口、或伪造代理地址。**代理必须跑在 agent 够不到的边界之外**（宿主机或独立 sidecar 容器），并且 agent 侧的目标地址写死在配置里，不允许它自己改。

## 八、结论

- 凭证安全的第一原则不是"加密保管"，而是"**让需要它的进程根本看不见它**"；
- CLI 场景用命令代理，HTTP 场景用反代注入，两者可以共存，策略统一放在宿主机；
- 短期令牌是必做的基础项，但它只缩小了时间窗，不解决越权；
- 代理开销在本机实测约 60 µs / 35% 吞吐，对 agent 场景无感，对高频 RPC 要另选方案；
- 最后别忘了审计：**没有记录的最小权限，等于没有最小权限**。

同方向的延伸：[Agent 护栏与决策路由](/ai/gemini-decisions-api-rag-routing-agent-guardrails-2026) 讲的是"拦截什么"，本文讲的是"拿不到什么"；[MCP 托管集成](/ai/x-mcp-server-managed-integration-2026) 是工具侧的接入形态；零信任的整体思路见 [SPIFFE/SPIRE 零信任架构](/security/offensive/zero-trust-architecture-spiffe-spire-2026)。

## 参考资料

- [Running coding agents without handing them my credentials](https://blog.antonio.cx/running-agents-with-lend) — 2026-11-13，本文背景与 lend 的设计动因
- [lend: SSH agent 之上的命令代理与策略](https://blog.antonio.cx/running-agents-with-lend) — 策略 JSON、租约、审批钩子的具体形态
- [Go net/http/httputil: ReverseProxy](https://pkg.go.dev/net/http/httputil#ReverseProxy) — Director / ErrorHandler 语义
- [GitHub Docs: Authenticating as a GitHub App installation](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app) — 短期 installation token 的换取方式
- [OWASP: Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) — 密钥注入与审计的通用建议
