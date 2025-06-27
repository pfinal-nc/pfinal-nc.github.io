---
title: Go 开发终端小工具
date: 2023-11-09 17:22:37
tags: 
    - golang
    - 工具
description: 详细介绍golang开发终端小工具,包括天气查询和手机归属地查询等功能,使用cobra库来开发命令行小工具。
author: PFinal南丞
keywords: Go 开发终端小工具, golang, 工具, 开发, 编程, 终端, 天气查询, 手机归属地查询, cobra库, 命令行小工具
sticky: true

---

# Go 开发终端小工具

## 前言

在搜索文档的时候,看到有人在用 Rust写终端 天气查询小工具, 于是一时兴起,也尝试用 golang 来搞了个命令行小工具,效果图如下:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202311081716928.png)

其实用golang 来写 还是很方便的,有许多可用的库.


## Cobra 库

cobra是一个命令行程序库，可以用来编写命令行程序。同时，它也提供了一个脚手架， 用于生成基于 cobra 的应用程序框架。非常多知名的开源项目使用了 cobra 库构建命令行，如Kubernetes、Hugo、etcd等等等等。

#### 安装

```shell
go get github.com/spf13/cobra/cobra
```

> 注意: 安装完成以后,先去 **go/bin/** 下找找 看是否有这个命令

#### 使用

新建一个项目文件夹 **pf_tools** 然后进入项目中 执行:

```shell
cobra-cli init
```

就会初始化一个命令项目,结构如下:

```
├── LICENSE
├── README.md
├── cmd
│   ├── pfM.go
│   ├── pfWt.go
│   └── root.go
├── go.mod
├── go.sum
├── main.go
└── pak
    ├── mobile.go
    └── weather.go
```

其中, cmd 目录中默认生成 root.go 文件,代码如下:

```go
package cmd

import (
	"os"
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "pf_tools",
	Short: "pft",
	Long: `基于go开发的 小工具集合
   - pft pf_wt 查询天气
   - pft pf_m 手机归属地查询
`,
	Run: func(cmd *cobra.Command, args []string) {
		if len(args) == 0 {
			err := cmd.Help()
			if err != nil {
				return
			}
			return
		}
	},
}

func Execute() {
	err := rootCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}

func init() {
	rootCmd.Flags().BoolP("version", "v", false, "")
}

```

cobra.Command 代表一个命令，其各个属性含义如下：

 - Use 是命令的名称。
 - Short 代表当前命令的简短描述。
 - Long 表示当前命令的完整描述。
 - Run 属性是一个函数，当执行命令时会调用此函数。

rootCmd.Execute() 是命令的执行入口，其内部会解析 os.Args[1:] 参数列表（默认情况下是这样，也可以通过 Command.SetArgs 方法设置参数），然后遍历命令树，为命令找到合适的匹配项和对应的标志。

#### 添加子命令

因为小工具不止一个功能,所以需要添加子命令,如:

```shell
cobra-cli add pf_m
```

**pf_m** 用来查询手机归属地,效果如下:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202311091002314.png)

代码和 root.go 中的代码相似,也是那几步, 

```go
package cmd

import (
	"github.com/pfinal/pf_tools/pak"
	"github.com/spf13/cobra"
)

// pfMCmd represents the pfM command
var pfMCmd = &cobra.Command{
	Use:   "pf_m",
	Short: "pfm",
	Long:  `查询对应手机的归属地`,
	Run: func(cmd *cobra.Command, args []string) {
		if len(args) == 0 {
			_ = cmd.Help()
			return
		}
		if pak.CheckMobile(args[0]) == false {
			_ = cmd.Help()
			return
		}
		m := pak.Mobile{}
		m.GetInfo(args[0])
	},
}

func init() {
	rootCmd.AddCommand(pfMCmd)
}

```

没啥特殊的, 就是添加一个命令, 然后初始化一下,然后实现功能.

## Termui 库

为了能够在终端显示的好看, 就使用了 termui 的库, termui是构建在termbox-go之上的一个跨平台的完全可自定义的终端dashboard 以及widget 库

#### 安装

因为使用了 go mod 来管理,所以这里就不用 go get 了,直接使用 go mod 即可.

代码中导入:

```go
    ui "github.com/gizak/termui/v3"
	"github.com/gizak/termui/v3/widgets"
```

然后 **go mod tidy** 然后mod 自己下载去吧

#### 布局

前面天气查询的 使用了 Table 小组件, 代码如下:

```go 
    defer ui.Close()
	table := widgets.NewTable()
	table.Title = res.City + "天气"
	table.BorderStyle = ui.NewStyle(ui.ColorRed)
	table.Rows = [][]string{
		[]string{"日期", "天气", "风向", "体感温度"},
	}
	for _, v := range res.Weather {
		table.Rows = append(table.Rows, []string{v.Date, v.Weather, v.Wind, v.Temp})
	}
	table.TextStyle = ui.NewStyle(ui.ColorGreen)
	table.TitleStyle = ui.NewStyle(ui.ColorGreen)
	table.SetRect(0, 0, 60, 10)
	ui.Render(table)
	uiEvents := ui.PollEvents()
	for {
		e := <-uiEvents
		switch e.ID {
		case "q", "<C-c>":
			return
		case "c":

		}
	}
```

手机查询的使用了 List 小组件,代码如下:

```go
   defer ui.Close()
	l := widgets.NewList()
	l.Title = "号码详细信息"
	l.Rows = []string{
		"[0] 查询的号码:" + pr.PhoneNum,
		"[1] 号码运营商:" + pr.CardType,
		"[2] 号码所在省份:" + pr.Province,
		"[3] 号码所在城市:" + pr.City,
		"[4] 所在城市邮编:" + pr.ZipCode,
		"[5] 所在地区编码:" + pr.AreaZone,
	}
	l.TextStyle = ui.NewStyle(ui.ColorGreen)
	l.TitleStyle = ui.NewStyle(ui.ColorGreen)
	l.WrapText = false
	l.SetRect(0, 0, 40, 8)
	ui.Render(l)
	previousKey := ""
	uiEvents := ui.PollEvents()
```

结构没有大的变化, Termui 官方的 github 仓库中有例子, 但是 官方的例子中,有些 属性没有使用, 比如 **table.Title**, **l.TitleStyle** 这种,需要自己尝试去写


### 代码地址

https://github.com/PFinal-tool/pf_tools

#### 最后愉快的玩耍吧