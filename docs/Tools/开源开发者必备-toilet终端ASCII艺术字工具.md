---
title: 开源开发者必备 toilet - 让终端"上厕所"的艺术
date: 2024-10-22 09:08:02
tags:
  - 工具
description: toilet 是一个用于在终端中生成大型 ASCII 艺术字的命令行工具
author: PFinal南丞
keywords: ASCII 艺术字的命令行工具, 工具,toilet,开源
---
# 开源开发者必备 toilet - 让终端"上厕所"的艺术

> 作者：pfinalclub | 一个在代码海洋里摸鱼的开发者

大家好，我是 pfinalclub，一个在开源世界里摸爬滚打多年的"码农"。今天想和大家聊聊一个名字听起来有点"味道"但功能却相当有趣的命令行工具——`toilet`。

说实话，第一次听到这个名字的时候，我内心是拒绝的。什么？让我在终端里"上厕所"？这听起来也太奇怪了吧！但是，当我真正使用过这个工具之后，我只能说：真香！

## 什么是 toilet？

`toilet` 是一个用于在终端中生成大型 ASCII 艺术字的命令行工具。简单来说，它能把普通的文字转换成各种炫酷的 ASCII 艺术字，让你的终端瞬间变得"高大上"。

想象一下，当你的朋友看到你的终端里显示着这样的文字：

```
  #     #  ######  #       #        #####   ###### 
  #     #  #       #       #       #     #  #      
  #     #  #####   #       #       #     #  #####  
   #   #   #       #       #       #     #  #      
    # #    #       #       #       #     #  #      
     #     ######  ######  ######   #####   ###### 
```

是不是比普通的 `echo "Hello"` 要酷炫得多？

作为开源开发者，我们经常需要：
- 制作项目文档的炫酷标题
- 在演示时吸引观众注意力
- 为终端环境增添趣味性
- 创建醒目的 README 文件

`toilet` 正是解决这些需求的最佳工具！

## 安装方法

### Linux 系统

```bash
# Ubuntu/Debian
sudo apt-get install toilet

# CentOS/RHEL/Fedora
sudo yum install toilet
# 或者
sudo dnf install toilet

# Arch Linux
sudo pacman -S toilet
```

### macOS

```bash
# 使用 Homebrew
brew install toilet
```

### 验证安装

```bash
toilet --version
```

如果看到版本信息，说明安装成功！如果没看到，那...你可能需要检查一下你的网络连接，或者考虑换个系统（开玩笑的）。

不过说实话，安装过程比我想象的要顺利，至少没有像某些工具那样需要编译半天。

## 基本用法示例

### 1. 最简单的使用

```bash
toilet "Hello World"
```

输出效果：
```
 _   _      _ _        __        __         _     _ _ 
| | | | ___| | | ___   \ \      / /__  _ __| | __| | |
| |_| |/ _ \ | |/ _ \   \ \ /\ / / _ \| '__| |/ _` | |
|  _  |  __/ | | (_) |   \ V  V / (_) | |  | | (_| |_|
|_| |_|\___|_|_|\___/     \_/\_/ \___/|_|  |_|\__,_(_)
```

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202510221046871.png)

注意: 如果输出我这样,那就是默认字体指定的问题,换个字体就可以了

### 2. 指定字体

`toilet` 提供了多种字体，让我们看看不同字体的效果：

#### big 字体
```bash
toilet -f big "GitHub"
```

输出效果：
```
  ____ _ _   _ _   _ _   _ 
 / ___(_) |_| | | | | | | |
| |  _| | __| |_| | | |_| |
| |_| | | |_|  _  | |  _  |
 \____|_|\__|_| |_| |_| |_|
```

#### mono12 字体
```bash
toilet -f mono12 "Docker"
```

输出效果：
```
  ____             _             
 |  _ \  ___   ___| | _____ _ __ 
 | | | |/ _ \ / __| |/ / _ \ '__|
 | |_| | (_) | (__|   <  __/ |   
 |____/ \___/ \___|_|\_\___|_|   
```

#### future 字体
```bash
toilet -f future "React"
```

输出效果：
```
 ____       _        _   
|  _ \ ___ | |_ __ _| |_ 
| |_) / _ \| __/ _` | __|
|  _ < (_) | || (_| | |_ 
|_| \_\___/ \__\__,_|\__|
```

### 3. 添加特效

#### 金属质感
```bash
toilet -f big -F metal "Kubernetes"
```

输出效果（带金属光泽）：
```
 _  __           _                      _             
| |/ /___ _   _| |__  _ __ ___  ___ ___| |_ ___  _ __ 
| ' // _ \ | | | '_ \| '__/ _ \/ __/ __| __/ _ \| '__|
| . \  __/ |_| | |_) | | |  __/\__ \__ \ || (_) | |   
|_|\_\___|\__,_|_.__/|_|  \___||___/___/\__\___/|_|   
```

#### 彩虹色
```bash
toilet -f big -F rainbow "Open Source"
```

输出效果（彩色显示）：
```
  ___                   _   ____                      
 / _ \ _ __   ___ _ __ | |_/ ___|  ___  __ _ _ __ ___ 
| | | | '_ \ / _ \ '_ \| __\___ \ / _ \/ _` | '__/ _ \
| |_| | |_) |  __/ | | | |_ ___) |  __/ (_| | | |  __/
 \___/| .__/ \___|_| |_|\__|____/ \___|\__,_|_|  \___|
      |_|                                             
```

#### 彩虹金属质感
```bash
toilet -f future -F rainbow:metal "DevOps"
```

输出效果（彩虹金属质感）：
```
 ____            ____  ____  
|  _ \  _____   _/ ___||  _ \ 
| | | |/ _ \ \ / /\___ \| |_) |
| |_| |  __/\ V /  ___) |  __/ 
|____/ \___| \_/  |____/|_|    
```

## 高级用法

### 1. 组合使用

```bash
# 组合字体和特效
toilet -f future -F metal "Welcome to My Terminal"
```

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202510221042856.png)

### 2. 输出到文件

```bash
# 将艺术字保存到文件
toilet -f big "Hello" > hello.txt

# 查看文件内容
cat hello.txt
```

### 3. 管道操作

```bash
# 与其他命令结合使用
echo "Hello World" | toilet -f big -F metal

# 从文件读取并转换
cat README.md | head -1 | toilet -f big
```

## 实际应用场景

### 1. 制作项目欢迎横幅

在你的 `.bashrc` 或 `.zshrc` 中添加：

```bash
# 每次打开终端时显示欢迎信息
toilet -f big -F metal "Welcome Back!"
```

### 2. 制作项目标题

在项目文档或 README 中：

```bash
toilet -f future "My Awesome Project"
```

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202510221041744.png)

### 3. 制作 ASCII 艺术

```bash
# 制作一个炫酷的标题
toilet -f big -F rainbow "GitHub"
```

### 4. 在 Git hooks 中使用

创建 `.git/hooks/pre-commit`：

```bash
#!/bin/bash
echo "提交前检查..."
toilet -f mono12 "Code Quality Check"
# 你的检查逻辑
```

## 常用字体和特效列表

### 字体对比示例

让我们看看不同字体的效果：

#### big 字体
```bash
toilet -f big "BIG"
```

#### mono12 字体
```bash
toilet -f mono12 "MONO"
```

#### future 字体
```bash
toilet -f future "FUTURE"
```

#### slant 字体
```bash
toilet -f slant "SLANT"
```

#### block 字体
```bash
toilet -f block "BLOCK"
```

### 特效对比示例

#### metal 特效
```bash
toilet -f big -F metal "METAL"
```

#### rainbow 特效
```bash
toilet -f big -F rainbow "RAINBOW"
```

#### gay 特效
```bash
toilet -f big -F gay "GAY"
```

#### flip 特效
```bash
toilet -f big -F flip "FLIP"
```

## 开发者实用技巧

### 1. 与 Git hooks 结合

创建 `.git/hooks/post-commit`：

```bash
#!/bin/bash
toilet -f mono12 -F metal "Commit Successful!"
```

### 2. 在 CI/CD 中使用

在 GitHub Actions 中：

```yaml
- name: Display Success Message
  run: |
    toilet -f big -F rainbow "Build Successful!"
```

### 3. 项目文档美化

在 README.md 中：

```bash
# 生成项目标题
toilet -f future "My Project" > title.txt
```

### 4. 终端启动提示

在 `.bashrc` 中：

```bash
# 显示系统信息
toilet -f mono12 -F metal "System Ready"
```

## 小技巧和注意事项

### 1. 字体选择
不同的字体适合不同的场景：
- `big` 适合做标题（让你的项目看起来不那么业余）
- `mono12` 适合代码注释（让代码看起来更专业）
- `future` 适合科幻主题（让同事觉得你很前卫）
- `slant` 适合斜体效果（让文字看起来不那么死板）
- `block` 适合方块风格（让终端看起来像游戏界面）

### 2. 颜色搭配
- `metal` 适合深色背景（让文字看起来像金属一样闪亮）
- `rainbow` 适合浅色背景（让文字看起来像彩虹一样绚丽）
- 组合使用可以创造独特效果（让你的终端看起来像夜店一样炫酷）

### 3. 性能考虑
虽然 `toilet` 很酷，但在生产环境中要谨慎使用，因为它会消耗一定的终端资源。想象一下，如果你的服务器日志里突然出现一堆 ASCII 艺术字，运维同事可能会以为系统被黑客攻击了。

### 4. 字体文件位置
`toilet` 的字体文件通常位于：
- Linux: `/usr/share/figlet/`
- macOS: `/usr/local/share/figlet/`

## 结语

`toilet` 虽然名字听起来有点奇怪，但它确实是一个很有趣的工具。它不仅能让你在终端中创建炫酷的艺术字，还能为你的开发环境增添一些乐趣。

作为一个开源开发者，我经常使用 `toilet` 来：
- 制作项目文档的标题（让我的项目看起来不那么业余）
- 在演示时吸引观众的注意力（毕竟没人想看无聊的代码）
- 为终端环境增添趣味性（让同事觉得我很厉害）
- 创建醒目的 README 文件（让项目看起来更专业）

虽然它不是什么"重量级"工具，但正是这些小巧而有趣的工具，让我们的开发生活变得更加丰富多彩。

所以，下次当你在终端中感到无聊时，不妨试试 `toilet`，让普通的文字变得"艺术"起来！相信我，一旦你开始使用，你就会爱上这个"奇怪"的工具。

最后，如果你觉得这篇文章有用，记得给我点个赞（虽然这里没有点赞按钮，但你可以去 GitHub 关注我）。如果你觉得没用，那...那我也没办法，毕竟我已经尽力了。

---

**相关链接：**
- [toilet 官方文档](https://github.com/cacalabs/toilet)
- [figlet 字体库](http://www.figlet.org/)
- [ASCII 艺术字生成器](https://www.asciiart.eu/)
