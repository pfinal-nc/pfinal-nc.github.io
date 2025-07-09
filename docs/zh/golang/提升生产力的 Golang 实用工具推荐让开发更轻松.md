---
title: 提升生产力的-Golang-实用工具推荐让开发更轻松
date: 2024-09-04 10:36:30
tags:
  - golang
description: 介绍一款快速创建golang项目的工具  
author: PFinal南丞
keywords: golang, 工具, 提升生产力, 开发, golang, Go开发, Go工具, Go扩展包
---

# 提升生产力的-Golang-实用工具推荐让开发更轻松

在开发 `golang`的项目过程中,断断续续的写了一些常用的  扩展包, 简化日常开发任务，从地址生成到数据脱敏，再到时间和数组处理等各个方面.下面是对每个扩展包的详细介绍和使用示例的补充

###  [chinese-address-generator]

`chinese-address-generator` 包专注于生成中国地区的地址信息，非常适合用于测试数据生成或表单预填充等场景。该包借鉴了 PHP 和 Node.js 中类似功能的实现，并进行了优化以满足 golang 项目的需求。

**地址如下:**

```
https://github.com/GoFinalPack/chinese-address-generator
```

**特性**

- 支持生成省、市、区、县四级地址。
- 提供完整的虚拟地址生成方法，方便开发者在模拟数据时使用。

**安装:**

```shell
go get github.com/GoFinalPack/chinese-address-generator@v1.0.0
```


**使用如下:**

```go
    g := chineseaddressgenerator.Generator{}
    g.Init()
    level1 := g.GenerateLevel1()  // 一级地址
    fmt.Println(level1)          // {"code": "230000", "region": "黑龙江省"}
    level2 := g.GenerateLevel2() // 二级地址
    fmt.Println(level2)          // {"code": "620100", "region": "甘肃省兰州市"}
	level3 := g.GenerateLevel3() // 三级地址
    fmt.Println(level3)          // {"code": "350205", "region": "福建省厦门市海沧区"}
    level4 := g.GenerateLevel4() // 四级地址
    fmt.Println(level4)          // {"code": "310113111000", "region": "上海市市辖区宝山区高境镇"}
	fullAddress := g.FabricateFullAddress()  // 生成完整地址
    fmt.Println(fullAddress)     // {"code": "622926209000", "region": "甘肃省临夏回族自治州东乡族自治县五家乡1115号182室", "buildNo": 1115, "roomNo": 182}
```

###  **[pf_util]**

`pf_util`是一个专注于信息脱敏的工具包，主要用于对敏感信息（如身份证号、手机号、邮箱地址、银行卡号等）进行处理。我在多个项目中都遇到过类似的需求，因此开发了这个扩展包，以便在不同场景中复用。

**特性**

- 支持多种类型的脱敏，例如身份证号、手机号码等。
- 提供自定义脱敏方法，用户可以根据项目需求灵活定义脱敏规则。

**地址如下:**

```
https://github.com/GoFinalPack/pf_util
```

**安装:**

```shell
go get github.com/GoFinalPack/pf_util@v1.0.0
```

**使用如下:**

```go

package tests

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

func TestCustomerIDcard(T *testing.T) {
	d := pf_util.DesensitizedUtil{}
	res := d.Method("idCardNum", "51343620000320711X", 4, 2) // 5134************1X
	fmt.Println(res)
}

func TestCustomerChineseName(t *testing.T) {
	d := pf_util.DesensitizedUtil{}
	result := d.Method("chineseName", "黄老板")
	fmt.Println(result)
}


```


### **[auto-correct]**

`auto-correct` 包是一个用于自动调整中英文之间的空格，并纠正专有名词大小写的工具。它允许开发者自定义字典以替换文本中的特定词汇，从而确保文本的一致性和专业性。

**地址如下:**

```
https://github.com/GoFinalPack/auto-correct
```

**特性**

- 自动在中英文之间添加适当的空格。
- 纠正专有名词的大小写，以保持文档的一致性。
- 支持自定义字典，用户可以根据实际需求进行配置。

**PS:** 默认使用的是封装好的字典,可以通过 `env`来加载自定义的字典:

`默认字典:`

```
...

app:App
ios:iOS
iphone:iPhone
ipad:iPad
android:Android
osx:OS X
mac:Mac
imac:iMac
macbookpro:MacBook Pro
macbook:MacBook
rmbp:rMBP
wi-fi:Wi-Fi
wifi:Wi-Fi
vps:VPS
vpn:VPN
arm:ARM
cpu:CPU
pdf:PDF
pfinal:PFinal
pfinalclub:PFinal Club

....

```

**安装:**

```shell
go get -u https://github.com/GoFinalPack/auto-correct@v1.0.0

```

**使用如下:**

```go
	a := auto_correct.AutoCorrect{}
	a.Init()
	text := "golang 使用中文测试"   // golang 使用中文测试
	fmt.Println(a.Correct(text))

	text = "pfinalclub测试"     //  PFinal Club 测试
	fmt.Println(a.Correct(text))

```


### [unique]

`unique` 是一个用于生成唯一字符串的小型扩展包，主要用于创建唯一键、锁、标识符等场景，确保在高并发环境下的数据唯一性。

**地址如下:**

```
https://github.com/GoFinalPack/unique
```

**特性**

- 生成基于时间戳的唯一 ID。
- 基于雪花算法生成唯一 ID。

**安装:**

```shell
go get github.com/GoFinalPack/unique@v1.0
```

**使用如下:**

```go


import "testing"

/**
 * @Author: PFinal南丞
 * @Author: lampxiezi@163.com
 * @Date: 2022/6/10 11:14
 * @Desc:
 */

func TestUnique_Time64(t *testing.T) {
	u := &Unique{}
	t.Log(u.Time64())
}

func TestUnique_Time32(t *testing.T) {
	u := &Unique{}
	t.Log(u.Time32())
}

func TestGetUniqueCodeByTime(t *testing.T) {
	u := &Unique{}
	t.Log(u.GetUniqueCodeByTime())
}

func TestUnique_GetUniqueCodeBySnowflake(t *testing.T) {
	u := &Unique{}
	t.Log(u.GetUniqueCodeBySnowflake().String())
}

```


### **[sectioning]**

`sectioning` 包提供了对数组和切片的常用操作功能，方便开发者在处理复杂数据结构时更加高效。虽然这个包是较早开发的，但它仍然在一些旧项目中发挥着作用。

**地址如下:**

```
https://github.com/GoFinalPack/sectioning
```

**特性：**

- 提供诸如 `Index`、`Delete`、`Unique` 等常用数组操作。
- 支持对数组或切片进行排序、筛选、打乱等操作。

```
sectioning 提供了针对数组和切片的功能

- `Index` 查找符合条件元素在数组中的位置
- `Delete` 删除符合条件的切片元素
- `Unique` 提取数组中的唯一元素
- `Count` 统计数组或切片中包含指定什的数量
- `Cut` Cut 去除 slice 中符合 eq 的元素
- `Each` 遍历 slice，并对每个元素执行 fn
- `Filter` 遍历 slice，并对每个元素执行 fn，返回符合 fn 的元素
- `First` 返回 slice 中第一个元素
- `IsEmpty` 判断 slice 是否为空
- `Pop` 删除 slice 中的最后一个元素，并返回该元素
- `Push` 在 slice 的末尾添加元素
- `Shuffle` 打乱 slice
- `Sort` 排序 slice
- `MinOrMax` 返回 slice 中最小或者最大的元素
```


**安装:**

```shell
go get github.com/GoFinalPack/sectioning@v1.0
```

**使用如下:**

```go

func TestShuffle(t *testing.T) {
	intSlice := []int{1, 2, 3, 7, 0, 4, 7}
	b := Shuffle(intSlice)
	t.Log(b)

	c := Shuffle(objSlice)
	t.Log(c)
}

func TestSort(t *testing.T) {
	intSlice := []int{1, 2, 3, 7, 0, 4, 7}
	b := Sort(intSlice, func(i, j int) bool {
		return i > j
	})
	t.Log(b)

	c := Sort(objSlice, func(i, j *obj) bool {
		return i.ID > j.ID
	})
	t.Log(c)
}

```

**[carbon]**

`carbon` 是一个类 Laravel Carbon 的时间处理包，专门为 golang 开发。虽然这个包开发于三年前，现在可能有更好的替代方案，但它依然在一些项目中使用。

**地址如下:**

```
https://github.com/GoFinalPack/carbon
```

**安装:**

```shell
go get github.com/GoFinalPack/carbon@v1.0
```

**使用如下:**

```go


    t := &carbon.Carbon{}
	fmt.Println(t.Now()) // 获取当前时间
	fmt.Println(t.Now("UTC")) // 获取UTC 时间
	fmt.Println(t.Timestamp()) //  获取当前的时间戳
	fmt.Println(t.TimestampToDate(1640844203, "Ymd")) //时间戳转 年-月-日
	fmt.Println(t.TimestampToDate(1640844203, "Ymd/")) // 时间戳 转 年/月/日
	fmt.Println(t.TimestampToDate(1640844203, "Ymdh")) 
	fmt.Println(t.Parse("yesterday").Format("-"))    // 获取昨天 时间
	fmt.Println(t.Parse("tomorrow").Format("-"))    //  获取明天 时间
	fmt.Println(t.Parse("+2 days").Format("-"))    // 获取2天后时间
	fmt.Println(t.Parse("+1 weeks").Format("-"))   // 获取一周后时间
	fmt.Println(t.Parse("+1 months").Format("-"))
	fmt.Println(t.Parse("+1 year").Format("-"))

	fmt.Println(t.Parse("-2 days").Format("-"))
	fmt.Println(t.Parse("-2 weeks").Format("-"))
	fmt.Println(t.Parse("next monday").Format("-"))
	fmt.Println(t.Parse("next tuesday").Format("-"))
	fmt.Println(t.Parse("next wednesday").Format("-"))
	fmt.Println(t.Parse("next thursday").Format("-"))
	fmt.Println(t.Parse("next friday").Format("-"))
	fmt.Println(t.Parse("next saturday").Format("-"))
	fmt.Println(t.Parse("next sunday").Format("-"))

	fmt.Println(t.Parse("last monday").Format("-"))
	fmt.Println(t.Parse("last sunday").Format("-"))
	fmt.Println(t.Parse("last tuesday").Format("-"))

	fmt.Println(t.Parse("next sunday").IsWeekday())
	fmt.Println(t.Ymd())
	fmt.Println(t.Format("/"))
	fmt.Println(t.Ymd("/"))
	fmt.Println(t.StartOfDay())
	fmt.Println(t.EndOfDay())
	fmt.Println(t.StartOfWeek())
	fmt.Println(t.EndOfWeek())

	c := carbon.Create("2012-01-02", "PRC")
	fmt.Println(c.StartOfDay())

```

### 总结

上面的扩展包,是在工作中,写的一些常用的扩展, 所有的包里面 都有 `test` 使用例子,如果有在项目中用到,就可以直接来用. 不喜勿喷哈. 