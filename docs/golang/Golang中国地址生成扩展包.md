---
title: golang中国地址生成扩展包
date: 2024-08-16 14:42:04
tags:
  - golang
description: 详细介绍golang中国地址生成扩展包，包括安装配置、使用方法、示例代码等，帮助开发者快速生成中国地址数据。
author: PFinal南丞
keywords: golang, 地址生成, 扩展包, 地理位置, 中国地址, 地址生成工具, 地址数据, 地址库

---

# golang中国地址生成扩展包

### 背景

在开发项目的过程中，经常会需要生成一些国内的地址数据。在之前使用 PHP 和 Node.js 开发时，我曾经使用过一些中国地址生成的扩展包，帮助快速生成符合规范的地址数据。然而，在转向 golang 进行项目开发时，却没有找到合适的地址生成工具。因此，我决定自己编写一个 golang 的中国地址生成包，以便在今后的开发中可以方便地使用。

### 包地址

```shell
https://github.com/GoFinalPack/chinese-address-generator

```

### 使用

#### 安装依赖

```
go get github.com/GoFinalPack/chinese-address-generator@v1.0.0

```

**PS:** 目前更新到 v1.0.0 版本

#### 代码中使用

1. 生成一级地址

```go
 g := chineseaddressgenerator.Generator{}
 g.Init()
level1 := g.GenerateLevel1()  // 一级地址
fmt.Println(level1)          // {"code": "230000", "region": "黑龙江省"}

```

2. 生成二级地址

```go
 g := chineseaddressgenerator.Generator{}
 g.Init()
level2 := g.GenerateLevel2() // 二级地址
fmt.Println(level2)          // {"code": "620100", "region": "甘肃省兰州市"}

```

3. 生成三级地址

```go
    g := chineseaddressgenerator.Generator{}
    g.Init()
	level3 := g.GenerateLevel3() // 三级地址
    fmt.Println(level3)          // {"code": "350205", "region": "福建省厦门市海沧区"}
```

4. 生成四级地址

```go
    g := chineseaddressgenerator.Generator{}
    g.Init()
    level4 := g.GenerateLevel4() // 四级地址 
    fmt.Println(level4)          // {"code": "310113111000", "region": "上海市市辖区宝山区高境镇"}

```

5. 生成完整的地址

```go
    g := chineseaddressgenerator.Generator{}
    g.Init()
	fullAddress := g.FabricateFullAddress()  // 生成完整地址
    fmt.Println(fullAddress)     // {"code": "622926209000", "region": "甘肃省临夏回族自治州东乡族自治县五家乡1115号182室", "buildNo": 1115, "roomNo": 182}

```

**PS:** 上面的地址纯属编造, 如有雷同,纯属巧合,生成规则:(001-1400)号(101-909)室



### 包结构

```
.
├── README.md
├── generator.go
├── go.mod
├── tests
│   ├── generator_test.go
│   └── readLeave_test.go
└── utils
    ├── data
    │   ├── level3.json
    │   └── level4.txt
    └── utils.go

```

level3.json 文件中 存储的是 省 市 区 

level4.txt 文件中 存储的是 街道乡镇 等数据, 已打包到了 扩展包中 



### 其他语言的扩展包

```

https://github.com/NiZerin/chinese-address-generator/tree/main   PHP

https://github.com/moonrailgun/chinese-address-generator     Node

```

这些扩展包提供了类似的功能，可以在不同的开发环境中使用，帮助你生成符合中国地址规范的数据.