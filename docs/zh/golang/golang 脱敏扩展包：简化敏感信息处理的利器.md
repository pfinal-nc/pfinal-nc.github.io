---
title: Golang 脱敏扩展包：简化敏感信息处理的利器
date: 2024-08-16 22:10:20
tags: 
    - golang
    - 工具
description: 详细介绍golang脱敏扩展包，包括安装配置、使用方法、常见问题等核心功能，帮助开发者轻松管理多个Python版本。
author: PFinal南丞
keywords: golang, 脱敏扩展包：简化敏感信息处理的利器, 工具, golang扩展包, golang脱敏, golang脱敏工具
---

# Golang 脱敏扩展包：简化敏感信息处理的利器



### 背景

在数据处理或清洗项目中，我们经常需要对敏感信息进行脱敏处理。这些敏感信息包括但不限于身份证号、手机号、邮箱地址和银行卡号等。为了简化这类任务，可以编写一个 golang 的脱敏扩展包。该包封装了一些常用的脱敏方法，以便在未来的开发中能更方便地进行敏感信息的处理，确保数据的安全和隐私保护。


### 包地址

该脱敏扩展包的代码托管在 `GitHub` 上，可以通过以下链接访问和下载：

```
https://github.com/GoFinalPack/pf_util

```

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202409021605246.png)

### 使用

#### 安装 

要使用这个脱敏扩展包，使用 go get 命令来安装最新版本的包

```
go get github.com/GoFinalPack/pf_util

```

PS: 目前更新到 v1.0.0 版本

### 使用示例

#### 默认的脱敏

以下是一些使用默认脱敏方法的示例代码：

```go

import (
	"fmt"
	"pf_util"
	"testing"
)

/**
 * @Author: PFinal南丞
 * @Author: lampxiezi@163.com
 * @Date: 2024/9/2
 * @Desc:
 * @Project: pf_util
 */

func TestDesensitizedUtilUserId(T *testing.T) {
	d := pf_util.DesensitizedUtil{}
	res := d.SetType(0).Desensitized("10000") // 0 不暴露
	fmt.Println(res)
}

func TestDesensitizedUtilName(T *testing.T) {
	d := pf_util.DesensitizedUtil{}
	res := d.SetType(1).Desensitized("黄宗泽") // 0 不暴露
	fmt.Println(res)
}

func TestDesensitizedUtilIDcard(T *testing.T) {
	d := pf_util.DesensitizedUtil{}
	res := d.SetType(2).Desensitized("51343620000320711X") // 5***************1X
	fmt.Println(res)
}

```

`Desensitized` 方法提供了默认的脱敏功能，其中 SetType 方法用于设置脱敏类型。以下是支持的脱敏类型：

```css
0	 不暴露  直接返回 0
1	ChineseName 姓名脱敏
2	IdCard 身份证脱敏
3	FixedPhone 固定电话脱敏
4	MobilePhone 手机号脱敏
5	ADDRESS 地址脱敏
6	EMAIL 邮箱脱敏
7	PASSWORD 密码脱敏
8	CarLicense 车牌号脱敏
9	BankCard 银行卡脱敏
10	IPV4 IPV4脱敏
11	IPV6 IPV6脱敏
12	FirstMask 前几位脱敏
13	ClearToNull 清空
14	ClearToEmpty 清空

```

#### 自定义脱敏

还可以使用 Method 方法进行自定义脱敏。以下是自定义脱敏的示例代码

```go
func TestCustomerIDcard(T *testing.T) {
	d := pf_util.DesensitizedUtil{}
	res := d.Method("idCardNum", "51343620000320711X", 4, 2) // 5134************1X
	fmt.Println(res)
}

```

**PS:** 

`Method` 方法允许你进行更灵活的脱敏处理。第一个参数指定脱敏类型，第二个参数是需要脱敏的内容，第三个参数是脱敏的长度，第四个参数是脱敏的位置。例如

```go

	d.Method("idCardNum", "51343620000320711X", 4, 2) // 5134************1X
	d.Method("address", "四川省成都市高新区天府三街", 8) // 四川省成都市*******

```

### 包结构

该包的结构如下所示：

```
├── README.md
├── go.mod
├── pf_util.go
├── tests
│   └── pf_utile_test.go
└── utils
    └── DesensitizedUtil.go

```

其中，`DesensitizedUtil.go` 文件提供了默认的脱敏方法和自定义脱敏方法。这些方法帮助你在开发中轻松实现敏感信息的脱敏处理。

