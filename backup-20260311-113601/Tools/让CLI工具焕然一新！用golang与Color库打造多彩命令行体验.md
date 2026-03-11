---
title: 让CLI工具焕然一新！用golang与Color库打造多彩命令行体验
date: 2024-09-25 17:15:27
tags:
    - golang
    - 工具
description: 用 Golang 与 Color 库打造多彩命令行体验，让 CLI 工具焕然一新
author: PFinal南丞
keywords: Golang, Color库, CLI工具, 命令行美化, 终端彩色输出, fatih/color, 开发工具, 终端体验优化
sticky: true
---
# 让CLI工具焕然一新！用golang与Color库打造多彩命令行体验


前段时间一直在使用 `golang` 打造`CLI`小工具, 方便开发的时候使用, 如下图所示:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202408211037928.png)

这些工具用起来确实非常好用，但是随着工具的增多，输出内容在使用过程中变得难以区分。为了解决这个问题，我开始使用第三方库`Color`，对工具的输出进行了彩色化改造。对于习惯在命令行工具中输出日志或调试信息的开发者来说，彩色输出无疑是一种提升用户体验的方式，能够更直观地呈现信息。

### fatih/color

![](https://user-images.githubusercontent.com/438920/96832689-03b3e000-13f4-11eb-9803-46f4c4de3406.jpg)

`fatih/color`是一个轻量级的Go语言库，允许开发者通过ANSI转义码在终端上输出带颜色的文字。
它不仅可以让你的文本有不同的前景色、背景色，还能让文字有不同的样式，比如粗体、下划线甚至斜体。最棒的是，这个库还支持Windows平台.

相比传统的单一颜色输出，彩色文本可以帮助用户快速定位问题，尤其在调试或查看日志时，能够大大提升效率。

**安装**

要使用`fatih/color`，首先需要安装它，安装命令如下：

```shell
go get github.com/fatih/color
```

**基本使用**

接下来是一个简单的示例代码，展示如何使用`fatih/color`库：

```go
package main  
  
import "github.com/fatih/color"  
  
/**  
 * @Author: PFinal南丞  
 * @Author: lampxiezi@163.com * @Date: 2024/9/25 * @Desc: * @Project: 2024 */  
func main() {  
    color.Cyan("PFinalClub")  
    color.Blue("PFinal %s", "Club")  
    color.Red("PFinalClub")  
    color.Magenta("PFinalClub")  
    c := color.New(color.FgCyan).Add(color.Underline)  
    _, _ = c.Println("PFinalClub")  
    d := color.New(color.FgCyan, color.Bold)  
    _, _ = d.Printf("PFinalClub %s\n", "too!.")  
    red := color.New(color.FgRed)  
  
    boldRed := red.Add(color.Bold)  
    _, _ = boldRed.Println("PFinalClub")  
  
    whiteBackground := red.Add(color.BgWhite)  
    _, _ = whiteBackground.Println("PFinalClub")  
}

```

运行后效果如下：

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202409251017544.png)

这个库还提供了许多有趣的功能，可以用于各种场景。比如，下面的代码创建了带有多种样式的彩色输出：

```go

// 实例化一个新的color对象，设置前景色为红色，背景色为绿色，文字斜体
colorPrint := color.New()
colorPrint.Add(color.Italic) // 设置文字为斜体
colorPrint.Add(color.FgRed) // 设置前景色为红色
colorPrint.Add(color.BgGreen) // 设置背景色为绿色
colorPrint.Println("Hello, World!") // 输出带样式的文字]


red := color.New(color.FgRed).PrintfFunc()
red("warning")
red("error: %s", err)

notice := color.New(color.Bold, color.FgGreen).PrintlnFunc()
notice("don't forget this...")

```


### 改造PF_tools

现在我们来看看如何将这个库应用于我们开发的小工具`pf_tools`。

**修改`main.go`**

首先，我们在`main.go`中加入`Color`库的支持，并添加一个工具Logo：

```go

package main  
  
import (  
    "github.com/fatih/color"  
    "github.com/pfinal/pf_tools/cmd")  
  
var Logo = `  
欢迎使用pf_tools， 请按照下面的指示操作  
`  
  
func main() {  
    // 实例化一个新的color对象，设置前景色为红色，背景色为绿色，文字斜体  
    colorPrint := color.New(color.Bold)  
    colorPrint.Add(color.FgGreen)  
    _, _ = colorPrint.Println(Logo)  
    cmd.Execute()  
}

```

这段代码为工具加了一个启动时显示的`Logo`，并且使用绿色加粗的样式输出。

**修改`pf_cd`命令**

接下来，对`pf_cd`命令进行颜色输出的改造：


```go

var pfCdCmd = &cobra.Command{  
    Use:   "pf_cd",  
    Short: "清除目录中的.DS_Store 文件",  
    Long:  `清除mac 目录中生成的.DS_Store 文件`,  
    Run: func(cmd *cobra.Command, args []string) {  
       colorPrint := color.New(color.Bold)  
       colorPrint.Add(color.FgGreen)  
       _, _ = colorPrint.Println("执行清除目录中的.DS_Store 文件 >>>>>>>")  
       var path string  
       if len(args) > 0 {  
          path = args[0]  
       } else {  
          path, _ = os.Getwd()  
       }       colorPrint.Add(color.FgRed)  
       _, _ = colorPrint.Printf("清除目录的.DS_Store 文件: %s\n", path)  
       clearPath := pak.ClearPath{Path: path}  
       clearPath.ClearDotDSStore()  
       colorPrint.Add(color.FgGreen)  
       _, _ = colorPrint.Println("结束清除目录中的.DS_Store 文件 >>>>>>>")  
    },}

```

通过这段代码，我们不仅可以让命令行输出变得更加美观，还能通过不同颜色快速区分输出的不同阶段或内容。

效果如下 :

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202409251034711.png)

彩色的输出就是 不一样,好看整齐

### 总结

彩色化输出不仅可以提升CLI工具的视觉效果，还可以帮助用户更快速地识别关键信息。`fatih/color`库提供了一个简单而强大的方式来实现这一点，无论是简单的颜色设置还是复杂的样式组合，都能轻易达成。通过将色彩融入你的CLI工具中，你不仅可以让用户的体验得到改善，同时也能让你的工具从众多同类产品中脱颖而出