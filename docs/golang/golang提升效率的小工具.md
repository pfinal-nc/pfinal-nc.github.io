---
title: Golang提升效率的小工具
date: 2024-11-09 11:31:32
tags:
    - golang
    - 工具
description: 介绍一些可以提升Golang开发效率的小工具，包括gofumpt、goimports、gopls等，帮助开发者更好地编写高质量的Go代码。
author: PFinal南丞
keywords: Golang, 工具, 效率, 提升, 小工具, 代码质量, 开发, 编程, 工具, 自动格式化, 自动导入, 代码补全
top: 1
sticky: true
---

# Golang提升效率的小工具

年底了,在急速的修复一些老项目的Bug, 更新迭代的次数较多, 由于之前的老项目没有使用 Git 来部署, 还是使用的 原始的 FTP拖追那一套, 由于本地开发使用的是 mac, 每次代码上线需要把更新的代码 打包成 .zip 发给运维, 由于每次发给运维的压缩文件中都有 .DS_Store 文件, 运维每次解压之后还要手动删除,被吐槽了N多次, 然后 每次发送之前都得 *ls -a* 然后手动删除 .DS_Store 文件有点麻烦, 于是 写了一个小工具, 用来删除 .DS_Store 文件, 提升效率.

#### 效果如下

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202401250948067.png)


#### 实现思路

实现思路很简单, 就是 变量项目下的所有目录, 找到 .DS_Store 文件, 然后删除

```golang

type ClearPath struct {
	Path string
}

func (c *ClearPath) removeAllFilesWithFilename(dirPath, filename string) error {
	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && info.Name() == filename {
			err := os.Remove(path)
			if err != nil {
				return err
			}
			fmt.Println("Deleted:", path)
		}
		return nil
	})
	return err
}

func (c *ClearPath) ClearDotDSStore() {
	filename := ".DS_Store"
	err := c.removeAllFilesWithFilename(c.Path, filename)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
}

```

使用了 *filepath.Walk* 来遍历 指定的目录 然后 删除 .DS_Store 文件


前面也介绍了使用 *开发终端小工具* 这里就直接集成进去了

运行*cobra-cli add*:

```shell
cobra-cli add pf_cd  # 添加一个 pf_cd 命令进去 
```

生成指定的 *pfCd.go* 文件, 然后对文件进行修改:

```golang
/*
Copyright © 2024 NAME HERE <EMAIL ADDRESS>
*/
package cmd

import (
	"fmt"
	"github.com/pfinal/pf_tools/pak"
	"github.com/spf13/cobra"
	"os"
)

// pfCdCmd represents the pfCd command
var pfCdCmd = &cobra.Command{
	Use:   "pf_cd",
	Short: "清除目录中的.DS_Store 文件",
	Long:  `清除mac 目录中生成的.DS_Store 文件`,
	Run: func(cmd *cobra.Command, args []string) {
		var path string
		if len(args) > 0 {
			path = args[0]
		} else {
			path, _ = os.Getwd()
		}
		fmt.Printf("清除目录的.DS_Store 文件: %s\n", path)
		clearPath := pak.ClearPath{Path: path}
		clearPath.ClearDotDSStore()
	},
}

func init() {
	rootCmd.AddCommand(pfCdCmd)
}

```
**Run** 的时候判断了一下 是否指定 目录 如果没有指定 则使用当前目录, 这里没有做路径的判断, 需要根据实际情况进行修改

然后 整完这些以后 就可以运行:

```shell
go install
```

安装到本地愉快的玩耍嘞, 顺带给工具 加上一个 help 的介绍,把 pf_cd 命令也添加到 pf_tools 的help 介绍里面去,如下:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202401251059984.png)


#### 最后

这里只是简单的介绍了一下 具体的实现可以查看源码:

https://github.com/PFinal-tool/pf_tools