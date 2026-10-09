---
title: "区块链 C2 崛起：从 EtherHiding 看供应链攻击如何劫持 npm、Terraform 与 Go Modules"
date: 2026-10-09
tags:
  - security
  - supply-chain
  - npm
  - golang
  - blockchain
  - malware
keywords:
  - security
  - EtherHiding
  - 区块链C2
  - 供应链攻击
  - npm恶意包
  - Go modules安全
  - Terraform provider
category: security/offensive
description: "2026 年 10 月朝鲜关联组织将供应链攻击推向新高度：恶意代码藏在运行时逻辑里，C2 地址写在以太坊智能合约中。本文深度拆解 EtherHiding 区块链 C2 技术原理、indexed-btree 案例与 Go modules 攻击面，并给出开发者可落地的检测与防御方案。"
recommend: 安全工程
---

> 2026 年 10 月，多份威胁情报同时指向同一个趋势：供应链攻击的 C2（Command & Control）基础设施正在"上链"。攻击者把 payload 藏进以太坊测试网智能合约、用 Solana 交易传递 C2 地址，并把恶意逻辑从 `postinstall` 钩子转移到运行时才会执行的业务函数中。传统的安装期扫描和生命周期脚本拦截，在这类攻击面前基本失效。

## 一、事件全景：三条攻击链同时曝光

2026 年 10 月前后，三个独立但技术路线高度趋同的供应链攻击活动被披露：

| 攻击活动 | 时间 | 目标生态 | C2 载体 | 关键技术 |
|---------|------|---------|---------|---------|
| Graphalgo / PolinRider（朝鲜关联） | 2026-09 披露，10-06 情报更新 | npm、Terraform、Go modules | 以太坊 Sepolia 测试网合约 + Slack/Telegram 双通道 | EtherHiding、运行时触发 |
| MALFEX | 2026-10-07 披露 | npm（8 个恶意包，4 万+ 下载） | Solana 区块链交易 | Overlord RAT、区块链动态 C2 |
| Shai-Hulud 新变体（Tensorlake 事件） | 2026-10-08 | npm（tensorlake@0.5.144） | 以太坊主网合约 `0xb614...091B9` | 自传播蠕虫、dead-man's switch |

三条链的共同点不是"又一个 npm 恶意包"，而是**基础设施的去中心化**：当 C2 地址写在区块链上，任何单一厂商的封禁、域名接管、sinkhole 操作都变成了按下葫芦浮起瓢。

```
传统供应链攻击 vs 区块链 C2 供应链攻击（文字架构图）

【传统模式】
恶意包 → postinstall 钩子执行 → 连接硬编码 C2 域名/IP
                                    ↑
                     域名可被封禁、IP 可被 sinkhole
                     安装期扫描即可拦截（钩子可见）

【区块链 C2 模式】
恶意包 → 运行时业务函数触发（无钩子）
              │
              ├─→ 读以太坊智能合约（公共 RPC：llamarpc/ankr/publicnode）
              │        └─→ 合约返回加密的 C2 地址/备用域名
              │             （合约可被攻击者钱包随时更新，需私钥才能改）
              │
              ├─→ Solana 交易备注字段 → 动态解析 Overlord RAT C2
              │
              └─→ Slack Bot Token / Telegram Bot → 命令下发通道
                       （企业域名白名单内的"合法"流量）
```

## 二、EtherHiding：为什么区块链成了理想的 C2

EtherHiding 最早在 2023 年作为概念验证出现，2026 年已完全实战化。它的核心思路：

1. **把 payload 或 C2 配置写入智能合约存储**。合约数据一旦上链，就复制在全网数千个节点上，没有"中央服务器"可打。
2. **受害者通过公共 RPC 端点读取**。`eth.llamarpc.com`、`rpc.ankr.com`、`ethereum.publicnode.com` 这些都是区块链开发者的日常基础设施，出站流量完全合法。
3. **攻击者用钱包私钥更新合约内容**。即使某条 C2 被封，攻击者发一笔交易就能换上新的——**封禁成本与更换成本严重不对称**。

在 Tensorlake 事件中，恶意合约 `0xb614155Fd88114d40549b259457Bcf921Df091B9` 由钱包 `0x779f...1040` 在 9 月 21 日更新，返回备用 C2 域名 `iseekaigogo[.]com`。在朝鲜关联的 indexed-btree 案例中，恶意代码同样通过 Sepolia 测试网合约取回加密 payload。

用伪代码表示这条链路：

```text
1. 恶意代码在受害者机器上初始化
2. 构造 JSON-RPC 请求：
   eth_call → 合约地址 0xb614...091B9
   调用 readString() 之类的方法读取存储槽
3. 解密合约返回的字符串 → 得到 C2 域名
4. 如果域名失效，攻击者更新合约，下次读取即拿到新地址
```

**为什么这条链路难以拦截？**

- 公共 RPC 端点不能封——封了等于切断区块链开发者的正常工作流
- 合约数据读取是只读操作，不产生可疑交易
- 恶意合约看起来就是一堆正常的存储数据
- 唯一稳定的 IOC 是"合约地址 + 调用模式"，而合约可以随时换

## 三、案例深拆：indexed-btree 如何绕过安装期扫描

这个 npm 包是理解"运行时触发"范式的最佳教材。它伪装成合法的 `sorted-btree` 工具库，实现了完整的 B 树数据结构——**代码本身是能正常工作的**。

### 攻击设计的三层规避

**第一层：不用生命周期钩子。** 2025 年以来 npm 收紧了 `preinstall`/`postinstall` 的限制（`--ignore-scripts` 的普及也倒逼攻击者进化），这个包的 `package.json` 里干干净净，没有任何安装脚本。

**第二层：把 loader 藏在 API 方法里。** 恶意逻辑写在 `BTree.prototype.set()` 中——只有当受害者的业务代码真正调用"往 B 树里写数据"这个最基础的操作时，loader 才执行。静态扫描看到的是一棵正常的 B 树；沙箱如果只 install 不使用，也触发不了。

**第三层：指纹 + 双通道 C2。** 触发后先指纹识别宿主环境，然后同时向硬编码的 Slack 频道和 Telegram bot 发信标，再通过 EtherHiding 取回加密 payload。Slack/Telegram 是企业环境里几乎不会被拦截的域名。

```
indexed-btree 感染链（文字时序图）

npm install indexed-btree        ← 安装期：无钩子，扫描干净
        │
        ▼
业务代码: tree.set(key, value)   ← 运行时：首次调用才触发
        │
        ▼
BTree.prototype.set() 内嵌 loader
        │
        ├─→ 指纹识别主机环境
        ├─→ Beacon → Slack 频道 + Telegram bot（硬编码 token）
        └─→ eth_call → Sepolia 合约 → 取回加密 payload
                │
                ▼
        解密执行 → 完整后门驻留
```

### 同一活动的横向扩展

更值得警惕的是，同一批攻击者没有止步于 npm：

- **Terraform Registry 恶意 provider**：通过 HashiCorp Registry 分发，直接进入基础设施即代码（IaC）流水线
- **Go modules 恶意模块**：伪装成常用工具库，利用 `go get` 的拉取信任

这意味着攻击面从"前端/Node 开发者的笔记本"扩展到了"整个 DevOps 工具链"。你的 Terraform apply 和 go build 流水线，现在也在射程之内。

## 四、Go Modules 的供应链防线：Go 开发者需要做什么

Go 生态的模块校验机制相对完善，但前提是**你没有主动绕过它**。回顾 Go modules 的三层防线：

### 1. GOSUMDB 校验（默认开启）

```bash
# 默认配置，所有模块下载后通过 sum.golang.org 校验
go env GOSUMDB
# sum.golang.org

# 确认没有全局关闭校验——这两行如果出现，风险敞口巨大
go env GOFLAGS GONOSUMCHECK
```

### 2. go.sum 锁定 + GOFLAGS 严格模式

```bash
# CI 中强制校验，发现 go.sum 不一致直接失败
go mod verify

# 新增依赖时用 -mod=readonly 防止意外写入
go build -mod=readonly ./...
```

`go mod verify` 会验证本地模块缓存中的依赖是否仍与 `go.sum` 记录一致。对于恶意 Go 模块，攻击者必须先骗过 sum.golang.org 或诱导你配置 `GONOSUMDB`/`GONOSUMCHECK`，攻击门槛显著高于 npm。

### 3. 私有依赖的边界配置

```go
// go env -w 配置私有模块边界，避免私有模块泄漏到公共校验服务
// （这不是安全问题，是配置正确性问题，但配置错误常导致团队"顺手"关闭全局校验）
```

```bash
go env -w GOPRIVATE=corp.example.com/*
go env -w GONOSUMDB=corp.example.com/*
```

**关键原则：公共模块的校验一条都不能关。** 2026 年这批针对 Go modules 的攻击，本质上赌的就是某些 CI 配置里的 `GOFLAGS=-insecure` 或 `GONOSUMCHECK=*`。

## 五、开发者侧检测：三个可落地的脚本

### 5.1 审计 npm 项目的生命周期钩子

```javascript
// audit-hooks.mjs — 扫描 node_modules 中所有包的 package.json 钩子
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const HOOKS = ['preinstall', 'install', 'postinstall', 'prepublish', 'prepare'];
const suspicious = [];

for (const scope of readdirSync('node_modules')) {
  const base = scope.startsWith('@')
    ? readdirSync(join('node_modules', scope)).map(s => join(scope, s))
    : [scope];

  for (const pkg of base) {
    const pj = join('node_modules', pkg, 'package.json');
    if (!existsSync(pj)) continue;
    const manifest = JSON.parse(readFileSync(pj, 'utf8'));
    const scripts = manifest.scripts ?? {};
    for (const hook of HOOKS) {
      if (scripts[hook]) {
        suspicious.push({ pkg, hook, cmd: scripts[hook] });
      }
    }
  }
}

console.log(`发现 ${suspicious.length} 个生命周期钩子：`);
for (const s of suspicious) {
  console.log(`  [${s.pkg}] ${s.hook}: ${s.cmd}`);
}
```

### 5.2 检测出站流量中的区块链 C2 特征

针对 EtherHiding 类攻击，在网络侧监控对公共 RPC 端点的异常访问：

```bash
#!/usr/bin/env bash
# detect-btc2.sh — 检查项目依赖源码中的区块链 RPC 端点特征
# 用法: ./detect-btc2.sh ./node_modules

TARGET=${1:-./node_modules}
PATTERNS=(
  'eth.llamarpc.com'
  'rpc.ankr.com'
  'ethereum.publicnode.com'
  'sepolia'
  '0x[a-fA-F0-9]{40}'   # 以太坊地址模式（需人工复核）
  'devnet|mainnet-beta'  # Solana 集群标识
)

echo "扫描 $TARGET 中的区块链 C2 特征..."
for p in "${PATTERNS[@]}"; do
  hits=$(grep -rEl "$p" "$TARGET" --include='*.js' --include='*.mjs' \
    --include='*.cjs' --include='*.ts' 2>/dev/null)
  if [ -n "$hits" ]; then
    echo "⚠️  特征 [${p}] 命中以下文件："
    echo "$hits"
  fi
done
echo "扫描完成。命中≠恶意，但需要人工复核上下文。"
```

注意：命中特征不代表一定是恶意的——Web3 项目本身就会调用这些端点。这个脚本的定位是**缩小人工复核范围**，不是自动判决。

### 5.3 CI 中使用 ignore-scripts + 依赖白名单

```yaml
# .github/workflows/ci-hardened.yml 片段
- name: Install dependencies (scripts disabled)
  run: |
    npm config set ignore-scripts true
    npm ci

- name: Run lifecycle hooks audit
  run: node ./scripts/audit-hooks.mjs

- name: Verify Go module checksums (Go 项目加这一步)
  run: go mod verify
```

`npm config set ignore-scripts true` 直接让 Shai-Hulud 类依赖 `preinstall` 钩子的蠕虫失效。代价是某些包（如 `esbuild`、`node-gyp` 类原生模块）需要手动触发编译脚本——在受控环境里单独放行，比全局裸奔好得多。

## 六、防御体系升级：从"安装期扫描"到"运行时行为分析"

这次攻击潮暴露的核心问题是：**行业防线仍然押注在安装期**。SBOM、`npm audit`、SCA 扫描都工作在"依赖清单"层面，而攻击者已经转移到"运行时行为"层面。

组织级防御清单（按优先级）：

1. **凭证最小化与快速轮换**：Tensorlake 事件的教训——CI 里的 npm token、GitHub token、云凭证泄露后 20 小时内就被武器化。CI 环境用 OIDC 短时凭证替代长期 token。
2. **开发者终端当作生产环境对待**：恶意包窃取的是 `~/.npmrc`、`~/.ssh`、`~/.kube/config`、AWS 凭证。EDR 覆盖开发者工作站不再是可选项。
3. **网络出口管控**：对开发者终端的出站流量建立基线，Slack/Telegram bot API 的异常 beacon 值得告警。
4. **区块链端点监控**：把公共 RPC 端点访问加入 DevOps 网络审计清单。
5. **发布流水线加固**：Tensorlake 的恶意版本带着"有效构建 provenance"发布的——**provenance 证明构建来源，不证明源码干净**。维护者账号启用硬件 2FA、npm 发布加 provenance + 双人复核。

> **一句话总结防线**：假设任何一天，你 `npm install` 的某个包会在运行时给以太坊合约发一笔 `eth_call`——你的监控、凭证、网络策略能不能接得住？接不住，就是下一个受害者。

## 七、参考资料

1. [QPulse 情报简报：North Korean-Linked Supply Chain Campaign Targets npm, Terraform, and Go Modules via Runtime Execution](https://qpulse.quasarcybertech.com/news/5892/north-korean-linked-supply-chain-campaign-targets-npm-terraform-and-go-modules-via-runtime-execution)（2026-10-06）
2. [Honeynet Mexico Lab：Eight Malicious npm Packages Deliver Overlord RAT（MALFEX）](https://honeynet.org.mx/posts/eight-malicious-npm-packages-downloaded-40-767-times-deliver-overlord-rat-and-stealer-en)（2026-10-07）
3. [ThreatCluster：Tensorlake npm package compromised by Shai-Hulud](https://threatcluster.io/article/tensorlake-npm-package-compromised-by-shai-hulud-in-latest-s-201b438a)（2026-10-08）
4. [Go 官方文档：Go Modules Reference — Authentication](https://go.dev/ref/mod#authenticating)
5. 本站相关文章：[Miasma 供应链蠕虫攻击深度分析](/security/offensive/miasma-supply-chain-worm-attack-2026)、[Go SBOM 与供应链安全实践](/dev/backend/golang/go-sbom-supply-chain-security)、[llms.txt 供应链安全](/security/offensive/llms-txt-supply-chain-2026)
