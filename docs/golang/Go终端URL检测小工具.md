---
title: Go终端URL检测小工具
date: 2024-03-05 11:46:43
tags:
  - golang
  - 工具
description: 详细介绍Go终端URL检测小工具的开发过程，包括功能实现、代码实现、运行命令等方面，帮助开发者快速开发终端命令小工具。
author: PFinal南丞
keywords: Go, URL检测, 工具, 编程, 终端命令, 开发, 检测, 小工具, 终端命令小工具, Go终端命令小工具
top: 1
sticky: true
---
# Go终端URL检测小工具

#### 背景

前面一直在折腾 Go 开发终端命令小工具,在开发的过程中使用效果还不错。

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202312150919993.png)

经常使用,被运营小姐姐看到, 然后问说有没有什么小工具,可以检测推广的URL 是否被微信给屏蔽了, 于是接着更新 终端命令小工具, 增加 URL 检测功能。


#### 效果如图
![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202403050921393.png)


#### 运行命令

```shell
pf_tools pf_cwx [urlstring]
```

#### 代码实现

```golang
func GetWxUrlInfo(urlString string) {
	api := "https://cgi.urlsec.qq.com/index.php?m=url&a=validUrl&url=" + urlString
	resp, err := http.Get(api)
	if err != nil {
		fmt.Println("请求失败:", err)
		return
	}
	defer func(Body io.ReadCloser) {
		_ = Body.Close()
	}(resp.Body)

	out, _ := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("读取响应失败:", err)
		return
	}
	if err := ui.Init(); err != nil {
		log.Fatalf("failed to initialize termui: %v", err)
	}
	defer ui.Close()
	table := widgets.NewTable()
	table.Title = "微信URL安全检测"
	// table.BorderStyle = ui.NewStyle(ui.ColorRed)
	table.Rows = [][]string{
		[]string{"网址", "检测结果      "},
	}
	//fmt.Println(string(out))
	urlResponse := &WxUrlInfo{}
	if err := json.Unmarshal(out, &urlResponse); err != nil {
		fmt.Println("解析json失败:", err)
		return
	}
	enStr := "网址未被微信屏蔽"
	if urlResponse.ReCode == 0 {
		enStr = "网址被微信屏蔽"
	}
	table.Rows = append(table.Rows, []string{urlString, enStr})
	table.TextStyle = ui.NewStyle(ui.ColorGreen)
	table.TitleStyle = ui.NewStyle(ui.ColorGreen)
	table.SetRect(0, 0, 80, 5)
	ui.Render(table)
	uiEvents := ui.PollEvents()
	for {
		e := <-uiEvents
		switch e.ID {
		case "q":
			return
		}
	}
}


```

核心 其实就是 使用 golang 调用 https://cgi.urlsec.qq.com/index.php  这个接口 用来检测 是否被 屏蔽, 目前来说 检测效果还不错. 至少满足 小姐姐的需求, 再啰嗦一下, golang 的 **cobra** 确实不错, 值得一试.

#### 开发过程

因为前面已经,整好了 cobra-cli的环境, 所以在 小工具的开发过程中, 只需要 敲入

```shell
cobra-cli add pf_cwx_url
```
直接会在项目的 cmd 目录中 生成 文件 pfCwxUrl.go,代码如下:

```go
/*
Copyright 2024 NAME HERE EMAIL ADDRESS

*/
package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
)

// pfTestCmd represents the pfTest command
var pfCwxUrlCmd = &cobra.Command{
	Use:   "pfCwxUrlCmd",
	Short: "A brief description of your command",
	Long: `A longer description that spans multiple lines and likely contains examples
and usage of using your command. For example:

Cobra is a CLI library for Go that empowers applications.
This application is a tool to generate the needed files
to quickly create a Cobra application.`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("pfCwxUrlCmd called")
	},
}

func init() {
	rootCmd.AddCommand(pfCwxUrlCmd)

	// Here you will define your flags and configuration settings.

	// Cobra supports Persistent Flags which will work for this command
	// and all subcommands, e.g.:
	// pfTestCmd.PersistentFlags().String("foo", "", "A help for foo")

	// Cobra supports local flags which will only run when this command
	// is called directly, e.g.:
	// pfTestCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
}

```
然后直接修改 代码中的:

```go
	Use:   "pf_cwx",
	Short: "微信域名拦截检测",
	Long:  `检测域名是否被微信拦截`,
```

Run 方法下就是 应对的业务逻辑, 我这里的结构是如下:

```
├── LICENSE
├── README.md
├── cmd
│   ├── pfB64.go
│   ├── pfCd.go
│   ├── pfCwxUrl.go
│   ├── pfM.go
│   ├── pfMd5.go
│   ├── pfS.go
│   ├── pfT.go
│   ├── pfTest.go
│   ├── pfWt.go
│   └── root.go
├── go.mod
├── go.sum
├── main.go
├── pak
│   ├── base64_cry.go
│   ├── clear.go
│   ├── md5.go
│   ├── mobile.go
│   ├── phone.dat
│   ├── speak.go
│   ├── stime.go
│   ├── weather.go
│   └── wxurl.go

```
所有的 业务流程代码是放在 pak 的 所以 Run的代码修改成了下面的:

```golang

	Run: func(cmd *cobra.Command, args []string) {
		if len(args) == 0 {
			_ = cmd.Help()
			return
		}
		if pak.CheckUrl(args[0]) == false {
			_ = cmd.Help()
			return
		}
		pak.GetWxUrlInfo(args[0])
	},
```

然后 运行

```
go run main.go pf_cwx https://www.baidu.com
```
测试没有问题以后直接

```
go install

```
本地就可以用命令来愉快的玩耍了 

```
pf_tools pf_cwx "https://www.baidu.com"
```

### 最后,附上 项目地址:

https://github.com/PFinal-tool/pf_tools
