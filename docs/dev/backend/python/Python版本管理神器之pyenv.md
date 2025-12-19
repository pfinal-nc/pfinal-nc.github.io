---
title: 如何掌握Python版本管理神器之pyenv - Python 开发完整指南
date: 2023-04-27T22:10:20.000Z
author: PFinal南丞
tags:
  - python
keywords:
  - Python版本管理
  - pyenv教程
  - Python环境配置
  - pyenv使用指南
  - Python虚拟环境
  - pyenv安装配置
  - Python多版本管理
  - 开发环境管理
  - Python工具推荐
  - pyenv最佳实践
description: 详细介绍pyenv这款强大的Python版本管理工具，包括安装配置、版本切换、虚拟环境管理等核心功能，帮助开发者轻松管理多个Python版本。
recommend: 后端工程
---

# Python版本管理神器之pyenv - 最佳Python版本管理工具

### 前言

之前一直在用 virtualenv 和 virtualenvwrapper 这两个工具管理 Python 虚拟环境，但是有个问题，就是想要创建指定版本的虚拟环境就必须先安装指定的 Python 版本，比如我想创建一个基于 Python3.6 的虚拟环境，那么我首先得安装 Python3.6（不管是直接安装还是源码安装，总之比较麻烦），然后在基于安装好的版本去创建虚拟环境，自从知道了 pyenv 这个神器之后，就几乎不用上述工具了。 ～ pyenv 好像对 Windows 平台不太友好。

### 介绍

> GitHub https://github.com/pyenv/pyenv

### Ubuntu安装

#### 下载

- 方式一（速度慢）：

```
    git clone https://github.com/yyuu/pyenv.git ~/.pyenv
```

- 方式二（速度快）：

```
    curl -L https://raw.githubusercontent.com/pyenv/pyenv-installer/master/bin/pyenv-installer | bash
```

执行上述操作之后，会将 pyenv 安装到当前用户的 ～/.pyenv 目录下


#### 编辑 .bashrc 文件

1. 打开 .bascrc 文件

```
vim ~/.bashrc
```

2 .将一下内容复制到末尾
```
export PYENV_ROOT=/root/.pyenv
export PATH=$PYENV_ROOT/bin:$PATH
export PATH=$PYENV_ROOT/shims:$PATH
eval "$(pyenv init -)"
```
3.更新 .bashrc 文件
```
source ~/.bashrc
```


#### 安装 Python 依赖

```
sudo apt-get install make build-essential libssl-dev zlib1g-dev
sudo apt-get install libbz2-dev libreadline-dev libsqlite3-dev wget curl
sudo apt-get install llvm libncurses5-dev libncursesw5-dev
sudo apt-get update

```
#### 测试使用

查看是否安装成功

- 查看当前安装版本

```
IN:
	pyenv --version
OUT:
	pyenv 1.2.27-34-gbba1289e
```
- 查看当前所有 Python 版本
```
IN:
	pyenv versions
OUT:
	* system (set by /root/.pyenv/version)
```
> 表示当前只有系统默认的版本

#### 安装 Python 指定版本

- 查看当前所有可安装版本
```
    pyenv install --list
``` 
- 安装想要安装的版本（这里选择 Python3.6.5）

```
IN:
	pyenv install 3.6.5
OUT:
  Downloading Python-3.6.5.tar.xz...
  -> https://www.python.org/ftp/python/3.6.5/Python-3.6.5.tar.xz
  Installing Python-3.6.5...
  Installed Python-3.6.5 to /root/.pyenv/versions/3.6.5
```
- 再次查看所有 Python 版本

```
IN:
	pyenv versions
OUT:
  * system (set by /root/.pyenv/version)
    3.6.5
```
- 切换 Python 版本

    有三种切换方式 glocal local shell*

    glocal 全局环境，在未再次使用 glocal切换环境之前，一直使用此环境。

    local 本次登录环境，重启后，则环境失效，并返回当前glocal的环境。

    shell 局部（临时）环境。关闭命令行窗口，则环境失效，并返回当前glocal的环境。

    pyenv glocal 3.6.5

- 卸载指定版本

```
    pyenv uninstall 3.6.5
```

### 安装 virtualenv

- 下载

> pyenv 已经帮我们以 plugin 的形式安装好了，如果未安装，则需要我们手动安装一下

```
    git clone https://github.com/pyenv/pyenv-virtualenv.git $(pyenv root)/plugins/pyenv-virtualenv
```

- 编辑 .bashrc 文件

```
    vim ~/.bashrc
```
- 将以下内容复制到末尾
```
    eval "$(pyenv virtualenv-init -)"
```
- 更新 .bashrc 文件

```
    source ~/.bashrc
```

### 创建虚拟环境

- 使用说明： pyenv virtualenv 3.6.5 virtual_name(自定义虚拟环境名)

- 实际使用：pyenv virtualenv 3.6.5 test

- 进入虚拟环境

```
   pyenv activate test
```
- 退出虚拟环境
```
   pyenv deactivate
```
- 删除虚拟环境

```
    pyenv uninstall test
```
输入yes即可

### 常用命令

使用方式: pyenv <命令> [<参数>]

```
命令:
  commands    查看所有命令
  local       设置或显示本地的 Python 版本（当前目录及其子目录）
  global      设置或显示全局 Python 版本
  shell       设置或显示 shell 指定的 Python 版本（本次会话）
  install     安装指定 Python 版本
  uninstall   卸载指定 Python 版本
  version     显示当前的 Python 版本及其本地路径
  versions    查看所有已经安装的版本
  which       显示安装路径
```
### 问题

1.切换不成功
如果遇到切换之后，Python版本还是系统的默认版本的话，就需要配置一下环境变量，在 ~/.zshrc 或 ~/.bash_profile 文件最后写入：

```
if which pyenv > /dev/null;
  then eval "$(pyenv init -)";
fi
```

----
