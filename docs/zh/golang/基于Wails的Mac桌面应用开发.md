---
title: 基于Wails的Mac桌面应用开发
date: 2023-10-18 11:06:22
tags:
    - golang
    - Wails
description: 基于Wails的Mac桌面应用开发
author: PFinal南丞
keywords: 基于Wails的Mac桌面应用开发, golang, Wails, 桌面应用, 开发
---
# 基于Wails的Mac桌面应用开发


​	最近在学习 go-wails开发, 于是基于go-wails 和 html,javascript 开发了一个Mac的桌面小应用,记录一下过程.



#### go-wails 介绍



> Wails 是一个可让您使用 Go 和 Web 技术编写桌面应用的项目。将它看作为 Go 的快并且轻量的 Electron 替代品。Wails 带有许多预配置的模板，可让您快速启动和运行应用程序。 有以下框架的模板：Svelte、React、Vue、Preact、Lit 和 Vanilla。 每个模板都有 JavaScript 和 TypeScript 版本。

 

[wails官方介绍](https://wails.io/)





#### 项目效果

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202310181123657.png)

#### 创建项目



```shell
wails init -n wails_demo -t https://github.com/KiddoV/wails-pure-js-template
```

​	

 **wails init ** 初始化项目命令

 **-n** 	参数指定项目的名称 *wails_demo* 是项目名称

**-t** 	参数指定使用的模板	可以 是 **vue**	等官方提供的 这里使用的 **https://github.com/KiddoV/wails-pure-js-template** 是一套 html和js的模板



#### 项目结构

```shell
├── README.md
├── app.go
├── build
│   ├── README.md
│   ├── appicon.png
│   ├── bin
│   │   └── pf_tools.app
│   │       └── Contents
│   │           ├── Info.plist
│   │           ├── MacOS
│   │           └── Resources
│   │               └── iconfile.icns
│   ├── darwin
│   │   ├── Info.dev.plist
│   │   └── Info.plist
│   └── windows
│       ├── icon.ico
│       ├── info.json
│       ├── installer
│       │   ├── project.nsi
│       │   └── wails_tools.nsh
│       └── wails.exe.manifest
├── frontend
│   ├── src
│   │   ├── assets
│   │   │   ├── fonts
│   │   │   │   ├── OFL.txt
│   │   │   │   └── nunito-v16-latin-regular.woff2
│   │   │   └── images
│   │   │       ├── 066-disk.png
│   │   │       ├── CPU.png
│   │   │       ├── host.png
│   │   │       └── memory.png
│   │   ├── index.html
│   │   ├── libs
│   │   │   ├── echarts
│   │   │   │   └── echarts.min.js
│   │   │   ├── jquery-3.4.1
│   │   │   │   └── jquery-3.4.1.min.js
│   │   │   ├── layui
│   │   │   │   ├── css
│   │   │   │   │   └── layui.css
│   │   │   │   ├── font
│   │   │   │   │   ├── iconfont.eot
│   │   │   │   │   ├── iconfont.svg
│   │   │   │   │   ├── iconfont.ttf
│   │   │   │   │   ├── iconfont.woff
│   │   │   │   │   └── iconfont.woff2
│   │   │   │   └── layui.js
│   │   │   └── live2d
│   │   │       ├── LICENSE
│   │   │       ├── README.md
│   │   │       ├── assets
│   │   │       │   ├── autoload.js
│   │   │       │   ├── flat-ui-icons-regular.eot
│   │   │       │   ├── flat-ui-icons-regular.svg
│   │   │       │   ├── flat-ui-icons-regular.ttf
│   │   │       │   ├── flat-ui-icons-regular.woff
│   │   │       │   ├── live2d.js
│   │   │       │   ├── waifu-tips.js
│   │   │       │   ├── waifu-tips.json
│   │   │       │   └── waifu.css
│   │   │       ├── demo1-default.html
│   │   │       ├── demo2-autoload.html
│   │   │       └── demo3-waifu-tips.html
│   │   ├── main.css
│   │   └── main.js
│   └── wailsjs
│       ├── go
│       │   ├── main
│       │   │   ├── App.d.ts
│       │   │   └── App.js
│       │   └── models.ts
│       └── runtime
│           ├── package.json
│           ├── runtime.d.ts
│           └── runtime.js
├── go.mod
├── go.sum
├── main.go
├── pkg
│   └── sys
│       └── sys.go
├── test
│   └── sys_test.go
└── wails.json
```



**main.go**   入口文件

**app.go** 	项目初始化文件

**pkg/sys.go**	项目文件

**frontend**  主要是前台的一些展示 文件 





#### 前端布局

- **main.go**

```go
		Title:             "PF_tools",
		Width:             1280,
		Height:            320,
		MinWidth:          1280,
		MinHeight:         320,
		DisableResize:     true,
		Fullscreen:        false,
		Frameless:         false,
		StartHidden:       false,
		HideWindowOnClose: true,
		BackgroundColour:  &options.RGBA{R: 16, G: 12, B: 42, A: 255},
		AlwaysOnTop:       true,
		Menu:              nil,
		Logger:            nil,
		LogLevel:          logger.DEBUG,
		OnStartup:         app.startup,
		OnDomReady:        app.domReady,
		OnBeforeClose:     app.beforeClose,
		OnShutdown:        app.shutdown,
		WindowStartState:  options.Normal,
		Bind: []interface{}{
			app,
		},
```

刚开始 是想做一个  8.8寸的 副屏幕所以在配置的 的时候  **width** 与 **height** 还有 **MinWidht** 选项写成相同的了, 然后 **DisableResize** 选项设置为 **false** 不允许改变大小



- **frontend/src/index.html**



```html
<!DOCTYPE html>
<html>

<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <meta http-equiv="X-UA-Compatible" content="IE=Edge, Chrome=1">
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <link rel="icon" type="image/png" href="data:image/png;base64,iVBORw0KGgo=">
    <!-- Main Source Files -->
    <link rel="stylesheet" href="../libs/layui/css/layui.css"/>
    <link rel="stylesheet" href="../libs/live2d/assets/waifu.css"/>
    <link rel="stylesheet" href="main.css"/>
    <script src="../libs/jquery-3.4.1/jquery-3.4.1.min.js"></script>
    <script src="../libs/echarts/echarts.min.js"></script>
    <script src="../libs/layui/layui.js"></script>
    <script src="../libs/live2d/assets/waifu-tips.js"></script>
    <script src="../libs/live2d/assets/live2d.js"></script>
    <script src="main.js"></script>
</head>

<body id="app" class="app" style="--wails-draggable:drag">
```



*注意:*  

 1. CSS文件引入的时候 这个路径 **../libs/layui/layui.js**	

 2. body 中 **style="--wails-draggable:drag"**  是可以基于 css元素拖动 程序

    

- **frontend/src/main.js**



```js
function event_cpu_on() {
    layui.use(function () {
        runtime.EventsOn("cpu_usage", function (cpu_usage) {
            // element.progress('demo-filter-progress', cpu_usage.avg + '%'); // 设置 50% 的进度
            document.getElementById("used").textContent = cpu_usage.avg + '% '
        })
    })

    window.go.main.App.CpuInfo().then(result => {
        //Display result from Go
        res = JSON.parse(result)
        document.getElementById("cpu_num").textContent = res.cpu_number
    }).catch(err => {
        console.log(err);
    }).finally(() => {
        console.log("finished!")
    });
}
```



1. 其中 **runtime.EventsOn("cpu_usage"** 是监听了 **app.go** 中 定时监听发送的 cpu_usage 使用率

2. ** window.go.main.App.CpuInfo()** 是直接在js中调用 **App.CpuInfo()** 的go代码 其中 **app** 是在** main.go ** 中绑定的,代码如下:

   ```go
   	Bind: []interface{}{
   			app,
   		},
   ```





需要注意的介绍完毕





完整的代码在:[https://github.com/pfinal-nc/wails_pf](https://github.com/pfinal-nc/wails_pf)



```shell

git clone git@github.com:pfinal-nc/wails_pf.git

cd wails_pf

wails build
```

打包完以后 可以在 **build/bin/** 目录下找打打包的文件。
