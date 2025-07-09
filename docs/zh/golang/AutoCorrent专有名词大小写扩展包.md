---
title: AutoCorrent专有名词大小写扩展包
date: 2024-08-23 17:15:27
tags:
    - golang
description: 介绍一款快速创建golang项目的工具
author: PFinal南丞
keywords: AutoCorrent专有名词大小写扩展包, golang, 项目创建, 快速创建, 工具, 项目, 快速, 工具
---

# AutoCorrent专有名词大小写扩展包

## 背景

在编写文档时，经常会因为手误或习惯性输入，而不小心将一些技术术语写成不太规范的形式。例如，将 "php"、"mysql" 或 "go" 写成小写形式。虽然这些单词的写法并不会影响内容的可读性，但对于一些追求细节的开发者，尤其是有强迫症倾向的朋友来说，看到这些不规范的单词总会感到有些不舒服。

之前在使用 Learnku 网站时，我注意到无论是在评论还是文档中，这些非标准形式的单词都会在短时间内自动纠正为正确的形式，比如 "PHP"、"MySQL"、"Go"。这种功能不仅提高了文档的专业性，也让阅读体验更加愉悦。因此，我决定利用 golang 开发一个自动纠正单词的包，帮助在编写技术文档时自动修正这些常见的拼写问题。

所以就写了一个 golang 的包来自动纠正这些单词。

## 包地址

可以在以下链接中找到这个包的代码：

``` 
    https://github.com/GoFinalPack/auto-correct

```

## 使用指南

#### 安装

可以通过以下命令安装这个包：

``` 
    go get github.com/GoFinalPack/auto-correct

```
目前，该包已经更新到 v1.0.0 版本，包含了核心功能的实现和一些常见问题的修复。

#### 包结构

这个包的结构非常简单明了，便于扩展和维护：

```

├── README.md
├── autocorrect.go
├── dicts.txt
├── go.mod
└── tests
    └── autocorrect_test.go

```

其中，**dicts.txt** 是内置的字典文件，包含了一些常见的技术术语及其正确的大小写形式。例如：

```
ruby:Ruby
mri:MRI
rails:Rails
gem:Gem
rubygems:RubyGems
rubyonrails:Ruby on Rails
ror:Ruby on Rails
rubyconf:RubyConf
railsconf:RailsConf
rubytuesday:Ruby Tuesday
coffeescript:CoffeeScript
scss:SCSS
sass:Sass
railscasts:RailsCasts
....

```

可以根据自己的需求，自行添加或修改这些词条

#### 自定义字典

为了适应不同项目的需求，包中还支持自定义字典功能。你可以通过设置环境变量 **DICTPATH** 来指定自定义字典文件的路径。例如：

```shell

    export DICTPATH=/Users/pfinal/dicts.txt
```

这样，程序在运行时会优先使用你指定的字典文件，从而实现更加灵活的词条管理。

#### 使用示例

下面是一个简单的使用示例，展示了如何利用该包来自动纠正文档中的技术术语：

```go
package main

import (
	"fmt"
	"github.com/GoFinalPack/auto-correct"
)

func main() {
	a := auto_correct.AutoCorrect{}
	a.Init()

	text := "golang 使用中文测试"
	fmt.Println(a.Correct(text))  // 输出: golang 使用中文测试

	text = "pfinalclub测试"
	fmt.Println(a.Correct(text))  // 输出: Pfinalclub 测试

	text = "json测试"
	fmt.Println(a.Correct(text))  // 输出: JSON 测试

	text = "Mysql 测试一下"
	fmt.Println(a.Correct(text))  // 输出: MySQL 测试一下
}


```

注意： 在进行纠正时，所有的专业名词之间会自动添加空格，以确保正确匹配和替换为指定的单词。



## 总结

开发这个包的初衷是为了提升文档的专业性和可读性。随着包的完善，可以将其集成到更多的开发工具中，为团队或个人项目提供自动纠正单词的功能，减少手动调整的工作量，从而让开发者专注于更重要的任务。希望这个小工具能为你的文档编写过程带来便利。