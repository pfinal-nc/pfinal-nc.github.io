---
title: "Wails + Tailwindcss 应用开发 - 实战指南"
date: 2023-12-07T09:18:22.000Z
tags:
  - golang
  - Wails
description: 基于wails的应用尝试开发
author: PFinal南丞
keywords: 'Wails, 应用, 开发, 尝试, 桌面应用, Go, Web开发, Tailwindcss, sqlite'
recommend: 后端工程
---

# 基于wails的应用尝试开发

​	最近一直在基于 go-wails 开发尝试开发一些Mac的桌面小应用,前面做了一个简单的 桌面时钟的小应用.功能比较单一,没有做一些数据的操作等.于是又重新开发了一个新的小应用做了一些新的尝试,废话不多说,做一个介绍与记录

#### go-wails 介绍

> Wails 是一个可让您使用 Go 和 Web 技术编写桌面应用的项目。将它看作为 Go 的快并且轻量的 Electron 替代品。Wails 带有许多预配置的模板，可让您快速启动和运行应用程序。 有以下框架的模板：Svelte、React、Vue、Preact、Lit 和 Vanilla。 每个模板都有 JavaScript 和 TypeScript 版本。

[wails官方介绍](https://wails.io/)


#### 项目效果

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202312041834484.png)

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202312041835444.png)


#### 项目介绍

项目结构与前面的项目 [wails_pf](https://github.com/pfinal-nc/wails_pf) 类似,但这次我采用了前端框架 **tailwindcss** 来设计界面，并使用了 sqlite 数据库来存储数据。

该项目的主要目的是记录日常生活中的密码等信息。在开发的过程中，我遇到了一些问题，将它们记录下来，以备将来参考。

#### Tailwindcss

> Tailwind CSS 是一个功能类优先的 CSS 框架，它集成了最流行的 CSS 工具集

由于前段使用的是 Tailwindcss, 在开发的时候 不得不开 使用 tmux 开2个窗口,来进行开发,
效果如下:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202312070933222.png)


于是找**官方文档** 发现有配置的地方, 但是配置后没有达到想要的结果.在目录中的 wails.json 文件进行的配置:

```json
 "build:dir": "",
  // 前端目录的相对路径。默认为“frontend”
  "frontend:dir": "",
  // 安装 Node 依赖的命令，在前端目录运行 - 通常是`npm install`
  "frontend:install": "",
  // 构建资产的命令，在前端目录中运行 - 通常是 `npm run build`
  "frontend:build": "",
  // 此命令已被 frontend:dev:build 取代。如果未指定 frontend:dev:build 将回退到此命令。
  // 如果此命令也未指定，将回退到 frontend:build
  "frontend:dev": "",
  // 此命令是 frontend:build 的 dev 等价物。
  // 如果未指定回退到 frontend:dev
  "frontend:dev:build": "",
  // 此命令是 frontend:install 的 dev 等价物。如果未指定回退到 frontend:install
  "frontend:dev:install": "",
  // 此命令在 `wails dev`上的单独进程中运行。用于第 3 方观察者或启动 3d 方开发服务器
  "frontend:dev:watcher": "",
  // 用于服务资产的第 3 方开发服务器的 URL，比如 Vite。
  // 如果设置为 'auto' 那么 devServerUrl 将从 Vite 输出中推断出来
```
只能等待项目的后续了.


#### 项目的登录

由于项目涉及到登录，按照惯例我使用了 session 会话管理，但在 Mac 下发现不太支持，最终我只能放弃了 session 并使用了 localStorage 进行存储，以解决登录问题。

在官方仓库中搜索了一番，发现有其他开发者也遇到了类似的问题，于是我也将方案切换至 localStorage。如果有大佬解决了这个问题，请分享一下经验。

#### 项目的数据存储

刚开始设计项目的时候是准备离线使用的, 所以选了个 sqllite 数据库, 但是在开发的过程中涉及到 数据库存储的路径问题, 于是搞了个 install 的界面, 用来在程序安装的时候配置数据存储路径.最后发现这玩意有点坑,由于权限问题,配置的路径会出现权限问题.于是乎, 看好多的应用 默认直接在 /tmp 下搞.于是也写死,在 /tmp下来做


----

目前开发遇到这些问题,后续更新有问题再做记录
