---
title: Wails 教程系列 - 环境搭建与安装
date: 2025-08-22T00:00:00.000Z
author: PFinalClub
description: 详细介绍如何为 Wails 开发准备环境，包括 Go、Node.js 的安装以及 Wails CLI 的获取。
recommend: 后端工程
---

# Wails 教程系列 - 环境搭建与安装

在开始用 Wails 写桌面应用之前，我们需要先把开发环境搭起来。说白了就是装 Go 语言、Node.js 和 Wails 命令行工具。

这个教程会一步步带你搞定这些，最后还会验证一下是不是都装对了。

## 支持的平台

根据 [官方文档](https://wails.golang.ac.cn/docs/gettingstarted/installation/)，Wails 支持这些平台：

- **Windows**: 10/11 AMD64/ARM64
- **macOS**: 10.13+ AMD64, 11.0+ ARM64  
- **Linux**: AMD64/ARM64

## 1. 安装 Go 语言 (1.20+)

Wails 是用 Go 写的，所以第一步就是装 Go。

### 下载与安装

去 [Go 官网](https://golang.org/dl/) 下载适合你系统的版本。

- macOS 用户：用 `.pkg` 安装包
- Windows 用户：用 `.msi` 安装包  
- Linux 用户：下载 `.tar.gz` 包解压到 `/usr/local`

### 验证安装

打开终端，运行这个命令看看 Go 装好了没：

```bash
go version
```

应该能看到类似这样的输出：

```
go version go1.22.5 darwin/arm64
```

如果显示 `command not found` 或版本太低，说明安装有问题或者 PATH 没配好。

### 配置 GOPATH 和 PATH

默认情况下，Go 会把你的工作区放在 `$HOME/go` (Linux/macOS) 或 `%USERPROFILE%\go` (Windows)。Go 的二进制文件在 `$GOROOT/bin`，通过 `go install` 装的工具在 `$GOPATH/bin` 或 `$HOME/go/bin`。

你得确保 `$HOME/go/bin` 已经加到 `PATH` 环境变量里，这样你才能在任何地方用 `go` 命令和装的各种工具。

用这个命令检查一下：

```bash
echo $PATH | grep go/bin
```

如果啥都没输出，说明需要添加。编辑你的 shell 配置文件（比如 `~/.bashrc`, `~/.zshrc`, `~/.profile` 等），加上这行：

```bash
export PATH=$PATH:$(go env GOPATH)/bin
```

然后重新加载配置文件或者重启终端。

## 2. 安装 Node.js 和 NPM (Node 15+)

虽然 Wails 后端是用 Go 写的，但前端部分通常会用现代 Web 技术，这就需要 Node.js 和 NPM 来管理依赖和构建工具。

### 下载与安装

去 [Node.js 官网](https://nodejs.org/) 下载最新的 LTS 版本。

### 验证安装

装完后，在终端运行这些命令验证一下：

```bash
node --version
npm --version
```

应该能看到 Node.js 和 NPM 的版本号。

## 3. 平台特定依赖项

根据官方文档，不同平台需要装特定的依赖：

### Windows

**WebView2 Runtime**: Windows 10/11 需要装 Microsoft Edge WebView2 Runtime。有些 Windows 系统已经包含了。你可以用 `wails doctor` 命令检查一下。

如果没装，可以去 [WebView2 Runtime 下载页面](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) 下载安装。

### macOS

**Xcode Command Line Tools**: 需要装 Xcode 命令行工具。打开终端运行：

```bash
xcode-select --install
```

然后按提示完成安装。

### Linux

Linux 需要标准的 `gcc` 构建工具以及 `libgtk3` 和 `libwebkit`。为了避免列出太多针对不同发行版的命令，Wails 会尝试确定针对你特定发行版的安装命令。

**Ubuntu/Debian**:
```bash
sudo apt-get update
sudo apt-get install build-essential libgtk-3-dev libwebkit2gtk-4.0-dev
```

**Fedora**:
```bash
sudo dnf install gcc gcc-c++ gtk3-devel webkit2gtk4.0-devel
```

**重要提示**: 如果你用的是最新版本的 Linux（比如 Ubuntu 24.04），而且它不支持 `libwebkit2gtk-4.0-dev`，那你可能会在 `wails doctor` 中遇到问题：`libwebkit` 未找到。为了解决这个问题，你可以装 `libwebkit2gtk-4.1-dev`，并在构建时用标签 `-tags webkit2_41`。

## 4. 安装 Wails CLI

现在万事俱备，可以装 Wails CLI 工具了。Wails CLI 是个命令行工具，用来创建、开发和构建 Wails 项目。

### 使用 `go install` 安装

打开终端，运行这个命令：

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

这个命令会下载最新版本的 Wails CLI 并装到你的 `$GOPATH/bin` 目录下。

### 验证安装

装完后，运行这个命令验证一下 Wails CLI 是不是装成功了：

```bash
wails version
```

应该能看到 Wails 的版本信息。

如果提示 `command not found`，请再次确认 `$GOPATH/bin` 已经正确加到 `PATH` 环境变量里，并重启终端。

### 常见问题

#### 1. 模板文件错误

如果你遇到类似这样的错误：

```
....\Go\pkg\mod\github.com\wailsapp\wails\[email protected]\pkg\templates\templates.go:28:12: pattern all:ides/*: no matching files found
```

请检查你是不是已经装了 Go 1.18+：

```bash
go version
```

#### 2. 网络连接问题

如果你在运行 `go install github.com/wailsapp/wails/v2/cmd/wails@latest` 时遇到网络连接错误：

```
https://proxy.golang.org/github.com/wailsapp/wails/cmd/wails/@v/list": dial tcp 172.217.163.49:443: connectex: A connection attempt failed because the connected party did not properly respond after a period of time, or established connection failed because connected host has failed to respond.
```

这通常是因为网络问题或 Go 代理设置导致的。解决方案：

```bash
# 设置 Go 模块模式
go env -w GO111MODULE=on

# 设置国内代理
go env -w GOPROXY=https://goproxy.cn,direct

# 然后重新安装
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

**其他可用的代理选项：**
- `https://goproxy.cn,direct` (推荐，国内)
- `https://goproxy.io,direct`
- `https://mirrors.aliyun.com/goproxy/,direct`

如果还是有问题，可以试试：
```bash
# 清理模块缓存
go clean -modcache

# 重新安装
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

#### 3. wails dev 卡在 idealTree:frontend

如果你运行 `wails dev` 时一直卡在 `idealTree:frontend: sill idealTree buildDeps`，这通常是 `npm install` 失败导致的。

**解决步骤：**

1. **手动检查 npm install**
   ```bash
   # 进入前端目录
   cd frontend
   
   # 手动运行 npm install
   npm install
   ```

2. **如果 npm install 失败，检查错误信息**
   - 查看具体的错误信息
   - 可能是网络问题、依赖冲突或权限问题

3. **常见解决方案：**
   ```bash
   # 清理 npm 缓存
   npm cache clean --force
   
   # 删除 node_modules 和 package-lock.json
   rm -rf node_modules package-lock.json
   
   # 重新安装依赖
   npm install
   ```

4. **如果还是有问题，试试用国内镜像：**
   ```bash
   # 设置 npm 镜像
   npm config set registry https://registry.npmmirror.com
   
   # 或者用 yarn
   npm install -g yarn
   yarn install
   ```

5. **检查 Node.js 版本兼容性：**
   ```bash
   # 检查 Node.js 版本
   node --version
   
   # 确保版本 >= 15
   ```

6. **重新启动 wails dev：**
   ```bash
   # 回到项目根目录
   cd ..
   
   # 重新启动开发服务器
   wails dev
   ```

#### 4. macOS 特有错误

如果你在 macOS 上遇到这些错误：

**错误：`xcrun: error: invalid active developer path`**
- **原因**：Xcode Command Line Tools 没装或坏了
- **解决**：
  ```bash
  xcode-select --install
  ```

**错误：`ld: library not found for -lSystem`**
- **原因**：macOS SDK 缺失
- **解决**：重新装 Xcode 或 Command Line Tools
  ```bash
  # 重置 Xcode 路径
  sudo xcode-select --reset
  
  # 或者重新装 Command Line Tools
  xcode-select --install
  ```

**如果上面的方法没用，可以试试：**
```bash
# 完全删除并重新装 Command Line Tools
sudo rm -rf /Library/Developer/CommandLineTools
xcode-select --install
```

#### 5. Windows 特有错误

如果你在 Windows 上遇到这些错误：

**错误：`MSBuild not found`**
- **原因**：缺少 MSVC 构建工具
- **解决**：装 Visual Studio 2022 Desktop development with C++ 工作负载

**错误：`link.exe not found`**
- **原因**：环境变量没配置
- **解决**：
  ```cmd
  # 在 VS 安装目录运行
  "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat"
  
  # 或者重启后用 Developer Command Prompt
  ```

**错误：`wails: syscall/js is only available on GOARCH=wasm`**
- **原因**：Windows 上 Go 配置有问题
- **解决**：检查 Go 版本，确保为 amd64/arm64，且不是 WebAssembly 模式
  ```cmd
  # 检查 Go 架构
  go env GOARCH
  
  # 应该显示 amd64 或 arm64，而不是 wasm
  ```

#### 6. Linux (Ubuntu/Debian) 特有错误

如果你在 Linux 上遇到这些错误：

**错误：`pkg-config: command not found`**
- **原因**：缺少系统依赖
- **解决**：
  ```bash
  sudo apt install pkg-config build-essential libgtk-3-dev libwebkit2gtk-4.0-dev
  ```

**错误：`cannot find -lgtk-3` 或 `cannot find -lwebkit2gtk-4.0`**
- **原因**：缺少 GTK/WebKit 库
- **解决**：装对应依赖
  ```bash
  sudo apt install libgtk-3-dev libwebkit2gtk-4.0-dev
  ```

**对于其他 Linux 发行版：**
```bash
# Fedora/CentOS/RHEL
sudo dnf install gcc gcc-c++ gtk3-devel webkit2gtk4.0-devel pkg-config

# Arch Linux
sudo pacman -S gcc gtk3 webkit2gtk pkg-config

# OpenSUSE
sudo zypper install gcc gcc-c++ gtk3-devel webkit2gtk4-devel pkg-config
```

## 5. 可选依赖项

- **UPX**: 用来压缩你的应用
- **NSIS**: 用来生成 Windows 安装程序

这些是可选的，但能让你构建更专业的应用。

## 6. 用 `wails doctor` 检查环境

Wails 提供了一个方便的命令 `wails doctor` 来检查你的开发环境是不是满足所有要求。

在终端运行：

```bash
wails doctor
```

这个命令会输出一个检查报告，列出所有必需和可选的依赖项及其状态。如果所有必需项都显示为 `[✓]` 或 `OK`，那你的环境就准备好了。

如果发现任何问题，请根据报告中的提示修复。

## 7. 故障排除

### `wails` 命令似乎不见了？

如果系统报告 `wails` 命令丢失，请确保你已经正确遵循 Go 安装指南。通常，这意味着你用户主目录中的 `go/bin` 目录不在 `PATH` 环境变量中。

你需要：
1. 检查 `echo $PATH | grep go/bin` 是否有输出
2. 如果没有，添加 `export PATH=$PATH:$(go env GOPATH)/bin` 到你的 shell 配置文件
3. 关闭并重新打开终端，让环境变量生效

## 验证安装

完成所有安装后，运行这些命令验证环境：

```bash
# 检查 Go
go version

# 检查 Node.js
node --version
npm --version

# 检查 Wails
wails version

# 全面检查环境
wails doctor
```

如果所有命令都正常输出，恭喜你！开发环境已经配置完毕。

## 高级安装选项

### 从源码安装（开发版本）

如果你需要最新的开发版本或特定分支，可以从源码安装：

```bash
# 克隆仓库
git clone https://github.com/wailsapp/wails

# 进入 CLI 目录
cd wails/v2/cmd/wails

# 安装开发版本
go install
```

### 安装特定分支

```bash
# 克隆仓库
git clone https://github.com/wailsapp/wails
cd wails

# 切换到特定分支
git checkout -b branch-to-test --track origin/branch-to-test

# 安装该分支版本
cd v2/cmd/wails
go install
```

### 回退到稳定版本

如果你装了开发版本想要回退到稳定版本：

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### 使用本地 Wails 版本

如果你在开发 Wails 本身，可以让项目使用本地的 Wails 版本：

在项目的 `go.mod` 文件中添加：
```go
replace github.com/wailsapp/wails/v2 => <你的本地路径>
```

例如：
- Windows: `replace github.com/wailsapp/wails/v2 => C:\Users\username\Documents\wails\v2`
- Linux/macOS: `replace github.com/wailsapp/wails/v2 => /home/username/projects/wails/v2`

## 环境变量配置

### Go 环境变量

确保这些环境变量正确配置：

```bash
# 检查 Go 环境
go env GOPATH
go env GOROOT
go env GO111MODULE

# 设置 Go 代理（如果需要）
go env -w GOPROXY=https://goproxy.cn,direct
go env -w GO111MODULE=on
```

### PATH 环境变量

确保 Go 二进制目录在 PATH 中：

```bash
# Linux/macOS
export PATH=$PATH:$(go env GOPATH)/bin

# Windows (在系统环境变量中添加)
# %GOPATH%\bin 或 %USERPROFILE%\go\bin
```

### 验证环境变量

```bash
# 验证 PATH 配置
echo $PATH | grep go/bin

# 验证 Go 配置
go env GOPATH
go env GOPROXY
```

---

现在你的开发环境已经配置完毕，可以开始创建你的第一个 Wails 应用了。在下一篇文章中，我们将学习如何用 `wails init` 命令来创建一个新项目。
