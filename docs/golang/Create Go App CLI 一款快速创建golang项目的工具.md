---
title: Create Go App CLI 一款快速创建golang项目的工具
date: 2024-08-20 17:15:27
tags:
    - golang
description: 介绍一款快速创建golang项目的工具
author: PFinal南丞
keywords: Create Go App CLI, golang, 项目创建, 快速创建, 工具, 项目, 快速, 工具
---

# Create Go App CLI 一款快速创建golang项目的工具

### 背景

如果你和我一样有丰富的 PHP 项目经验，可能已经习惯了使用命令行工具来快速创建项目，比如用 laravel new example-app 这个命令几秒钟就能生成一个完整的 Laravel 项目。然而，当你转向 golang 开发时，可能会觉得起步稍显繁琐，需要自己手动整理目录结构和配置文件。这种时候，我会想：要是 golang 也有类似的工具该多好啊！于是，我翻遍了 GitHub，最终找到了一个可以解决这个问题的工具，它就是——Create Go App CLI。

### 工具介绍

Create Go App CLI 是一个极其方便的工具，只需要运行一个简单的命令，就可以生成一个包括后端（golang）、前端（JavaScript、TypeScript）以及自动化部署（Ansible、Docker）配置的生产就绪项目。你不再需要为设置项目基础架构而发愁，Create Go App CLI 已经为你做好了这一切。


####  创建项目的效果展示

选择后端框架时，你可以看到类似下图的选项界面：

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202408201333737.png)

接着，你可以选择前端框架或库的扩展：

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202408201333650.png)

最后，还可以选择 Web 服务器或代理服务器：

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202408201335809.png)


#### 项目结构:

假设我们选择了 chi 作为后端框架，生成的项目目录结构大致如下：

```shell
├── Makefile
├── backend
│   ├── Dockerfile
│   ├── LICENSE
│   ├── Makefile
│   ├── README.md
│   ├── api_test.http
│   ├── cmd
│   │   └── run.go
│   ├── go.mod
│   ├── go.sum
│   ├── internal
│   │   ├── config
│   │   │   └── config.go
│   │   └── router
│   │       ├── healthcheck
│   │       │   ├── handlers.go
│   │       │   └── routes.go
│   │       └── router.go
│   └── main.go
├── frontend
│   ├── README.md
│   ├── index.html
│   ├── package.json
│   ├── public
│   │   └── vite.svg
│   ├── src
│   │   ├── App.vue
│   │   ├── assets
│   │   │   └── vue.svg
│   │   ├── components
│   │   │   └── HelloWorld.vue
│   │   ├── main.js
│   │   └── style.css
│   └── vite.config.js
├── hosts.ini
├── playbook.yml
└── roles
    ├── backend
    │   └── tasks
    │       └── main.yml
    ├── docker
    │   └── tasks
    │       └── main.yml
    ├── postgres
    │   └── tasks
    │       └── main.yml
    └── redis
        └── tasks
            └── main.yml

```

可以看到，生成的项目不仅包含了后端的 golang 代码，还集成了前端框架的配置文件和自动化部署的脚本，几乎涵盖了一个生产环境中所需的所有内容。

### 安装方法

- go install 安装

```shell
go install github.com/create-go-app/cli/v4/cmd/cgapp@latest
```

- homebrew 安装:

```shell
# Tap a new formula:
brew tap create-go-app/tap

# Installation:
brew install create-go-app/tap/cgapp

```

### 使用指南

安装完成后，你就可以在命令行里直接创建项目了。以下是一个简单的使用示例：


```shell

mkdir web # 创建一个项目的目录
cd web 
cgapp create  # 就可以在web目录夏创建了

```

在生成的项目目录中，你会发现一个 hosts.ini 文件，稍作修改后，你就可以直接将项目部署到服务器上了。


#### 支持的后端框架

Create Go App CLI 提供了三种 golang 后端框架的支持：

- net/http: 使用 golang 内置的 net/http 包创建的后端模板，适合简单的 REST API 项目，支持 CRUD 和 JWT 身份验证  (https://github.com/create-go-app/net_http-go-template)

- fiber: 功能更为强大的框架，支持 CRUD、JWT 身份验证、令牌刷新、数据库和缓存操作等复杂功能 (https://gofiber.io)

- chi: 支持几乎所有的 Web 开发需求，是一个功能全面的 Go Web 框架  (https://go-chi.io/#/)


#### 支持的前端框架

CLI 工具支持多种前端框架或库，如下所示:

```
[?] Choose a frontend framework/library:  [Use arrows to move, type to filter, ? for more help]
> none
  vanilla
  vanilla-ts
  react
  react-ts
  react-swc
  react-swc-ts
  preact
  preact-ts
  next
  next-ts
  nuxt
  vue
  vue-ts
  svelte
  svelte-ts
  solid
  solid-ts
  lit
  lit-ts
  qwik

```

个人建议：Vue 是个不错的选择，尤其适合构建现代化的 Web 应用。

### 项目配置

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202408201428436.png)

生成的项目自带 .env.example 配置文件。你只需要把这个文件复制并重命名为 .env，然后稍作配置就可以直接运行项目了。

### 总结 

Create Go App CLI 是一个为 golang 项目开发者量身定制的利器，不仅简化了项目的创建过程，还提供了多种选择和配置，使得从后端到前端、从开发到部署都变得更加高效。如果你希望快速构建一个功能全面的 golang 项目，这个工具绝对值得一试。

更多功能和详细使用说明，可以参考官方的 Wiki，里面有更丰富的内容供你探索。

```
wiki 地址:

https://github.com/create-go-app/cli

```

