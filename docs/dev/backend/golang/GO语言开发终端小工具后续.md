---
title: Go 终端小工具进阶 - 天气/归属地/MD5 等实用命令开发实战
date: 2024-03-05T11:46:43.000Z
tags:
  - golang
  - 工具
description: 在 Go 终端小工具基础上新增天气查询、手机归属地、MD5/Base64、网络词汇、时间戳等子命令的开发与迭代记录，以及遇到的问题与解决方式。
author: PFinal南丞
keywords: 'Go语言开发终端小工具后续, Go, 工具, 终端, 小工具, 开发, 编程, 命令, 工具开发, 代码实现, 运行命令'
top: 1
sticky: true
recommend: 后端工程
---

# Go 终端小工具后续：天气、归属地、MD5 等实用命令开发

前面有一篇文章记录了使用 Go 的 *cobra/cobra* 库来开发 终端的小工具, 在前面的基础上又更新了一些小的工具.内容如下:

```shell 
   - pf_tools pf_wt 查询天气
   - pf_tools pf_m 手机归属地查询
   - pf_tools pf_md5 md5 小工具
   - pf_tools pf_b64 base64 小工具
   - pf_tools pf_s 查询网络词汇
   - pf_tools pf_t  获取当前时间戳
```

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202312150919993.png)

其中 **pf_wt**, **pf_s** 使用了 网络的接口.其他的都是没有使用网络的接口.在更新迭代的过程中,遇到嘞些问题,这里记录一下.

## 显示与复制的问题

#### 1. 复制问题

在开发 **pf_b64**,**pf_t**,**pf_md5** 的时候, 显示都没啥问题, 但是在使用的过程中发现, 由于使用了 **termui** 终端 UI 库导致复制的时候, 复制的内容是乱的。 
于是做了如下修改:

```go
    uiEvents := ui.PollEvents()
	for {
		e := <-uiEvents
		switch e.ID {
		case "q":
			return
		case "c":
			_ = clipboard.WriteAll(enStr)
			return
		}
	}

```
使用了**github.com/atotto/clipboard**库, 增加了 按键 **c** 的时候, 直接复制到 剪贴板。这样就方便多了。

#### 2. 显示问题

**pf_b64** 终端显示的时候,由于前期测试的是比较短的内容, 后来加入比较长的内容的时候 导致显示的内容被截断, 于是做了如下修改:

```go
    func splitStringByLength(s string, length int) []string {
	var result []string
	for i := 0; i < len(s); i += length {
		if i+length > len(s) {
			result = append(result, s[i:])
		} else {
			result = append(result, s[i:i+length])
		}
	}
	return result
}

    sEncList := splitStringByLength(sprintf, 100)
	// fmt.Println(strings.Join(sEncList, "\n"))
	p := widgets.NewParagraph()
	p.Title = "加密结果"
	p.Text = strings.Join(sEncList, "\n")
	// p.Text = sprintf
	p.TextStyle.Fg = ui.ColorGreen
	p.TextStyle.Modifier = ui.ModifierBold
	p.BorderStyle.Fg = ui.ColorGreen
	p.WrapText = true
	p.SetRect(0, 0, 105, len(sEncList)+2)
```
对 结果 的长度进行了动态计算, 然后进行了动态的显示,出来的效果就是可以换行显示了,效果如下:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202312150934936.png)

> 注意: 这里按 c 复制


## 打包问题

在 **go build** 以后丢到 linux 系统上 发现 无法运行, 因为 在 开发 **pf_m** 命令的时候使用了,第三方的库 **github.com/zheng-ji/gophone**, 这个库中有一个 **.dat**的静态文件, 在 **go build** 以后没有打包进程序中去, 于是 开启 google 大法, 发现还是没有啥好的解决办法. 

最后, 翻了翻 **github.com/zheng-ji/gophone** 这个包中的源码, 发现代码不多, 直接复制过来, 然后吧 **.bat** 的数据库文件也复制过来, 然后去**go build** 发现还是没有打包进去, 于是 继续 google 大法, 最后修改了一下 包含文件的代码:

```go
// 修改前
func init() {
	_, fulleFilename, _, _ := runtime.Caller(0)
	var err error
	content, err = ioutil.ReadFile(path.Join(path.Dir(fulleFilename), PHONE_DAT))
	if err != nil {
		panic(err)
	}
}

// 修改后
//go:embed phone.dat
var fsContent embed.FS

func init() {
	var err error
	content, err = fsContent.ReadFile(PhoneDat)
	if err != nil {
		panic(err)
	}
}

```
使用了 **embed** 来进行导入. 然后顺利打包,在 linux 系统上 运行正常.

**上面这种 复制代码的解决办法,估计是个大坑,等后续看到解决办法,再来更新记录**


## Windows 显示问题

由于解决了运行的问题, 以为万事大吉了 但是在 windows 系统上 发现 显示有问题 如下:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202312150948727.png)

搜索发现 **termui** 在 windows 下不支持中文, 所以只能 放弃 win了


## 最后

小工具持续更新中...
