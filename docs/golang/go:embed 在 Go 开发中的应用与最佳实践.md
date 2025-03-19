---
title: go:embed 在 Go 开发中的应用与最佳实践
date: 2024-08-24 09:32:24
tags:
  - golang
description: go:embed 在 Go 开发中的应用与最佳实践
author: PFinal南丞
keywords: go:embed 在 Go 开发中的应用与最佳实践, golang, 项目创建, 快速创建, 工具, 项目, 快速, 工具
---
# go:embed 在 Go 开发中的应用与最佳实践

## 背景

在使用 Go 开发命令行工具或桌面软件时，将配置文件、模板，甚至整个前端应用直接嵌入到 Go 二进制文件中是一种提高应用部署效率和简化操作的有效方法。这种方法可以减少外部依赖，让应用在没有额外资源文件的情况下也能独立运行，特别适合需要便捷分发和部署的场景。自 Go 1.16 版本起，Go 语言官方引入了 //go:embed 指令，使得嵌入静态资源变得异常简单而直接。这一新特性大大简化了开发流程，使开发者能够更加专注于核心功能的实现。

## `go:embed` 介绍

`go:embed` 是一个编译器指令，能够在程序编译时期将任意文件和目录嵌入到 Go 的二进制文件中。通过这种方式，开发者可以在不依赖外部文件的情况下，直接在代码中访问这些资源，从而实现了高效、灵活的文件管理。

#### 特点

- 文件嵌入类型：对于单个文件，go:embed 支持将其嵌入为字符串 (string) 或字节切片 ([]byte)；对于多个文件或目录，支持将其嵌入为新的文件系统 (embed.FS)。

- 灵活性：即使嵌入文件的变量未被显式使用，只要导入了 "embed" 包，文件仍然会被嵌入。

- 语法要求：go:embed 指令必须紧跟在要嵌入文件的变量声明之前，并且只能嵌入为 string、[]byte 或 embed.FS 三种类型的变量，其他别名或自定义类型（如 type S string）则不支持。

## 使用方法

`go:embed` 的使用非常简单，以下是几种常见的用法：

```go
import "embed"

//go:embed mobile.txt
var mobile string

//go:embed hello.txt
var contentBytes []byte

//go:embed hello.txt
var fileFS embed.FS
var data, _ = fileFS.ReadFile("hello.txt")

```

如上所示，直接在注释中使用 go:embed 指令，就可以将文件嵌入到程序中。


#### 嵌入为字符串

将文件内容嵌入为字符串的方式适合处理文本数据，如配置文件、模板或其他小型文件。

```go
package main
import (
	_ "embed"
	"fmt"
)
//go:embed pfinalclub.txt
var pfinal string
func main() {
	fmt.Println(pfinal)
}
```

#### 嵌入为 byte slice

将文件内容嵌入为字节切片适合处理二进制数据，如图片、字体或其他非文本数据。

```go
package main
import (
	_ "embed"
	"fmt"
)
//go:embed pfinalclub.txt
var pfinal []byte
func main() {
	fmt.Println(pfinal)
}
```

#### 嵌入为 embed.FS

将多个文件或整个目录嵌入为文件系统 (embed.FS) 适合需要访问多个文件的场景，如嵌入静态网站的所有资源。

```go
package main
import (
	_ "embed"
	"embed"
	"fmt"
)
//go:embed pfinalclub.txt
var pfinal embed.FS
func main() {
data, _ := pfinal.ReadFile("pfinalclub.txt")
	fmt.Println(string(data))
}
```

#### 多文件嵌入

有时候,要嵌入多个文件,go:embed 支持同一个变量上多个go:embed指令(嵌入为string或者byte slice是不能有多个go:embed指令的):

```go
//go:embed pfinal.txt
//go:embed pfinalclub.txt
var pfinal embed.FS
func main() {
	data, _ := f.ReadFile("pfinal.txt")
	fmt.Println(string(data))
	data, _ = f.ReadFile("pfinalclub.txt")
    fmt.Println(string(data))
}
```


根据不同的需求，可以选择最适合的嵌入方式：

- 对于第 1 种用法，将文件嵌入到 string 中，适合嵌入单个文件（如配置数据、模板文件或一段文本）。
- 对于第 2 种用法，将文件嵌入到 []byte 中，适合嵌入单个文件（如二进制文件：图片、字体或其他非文本数据）。
- 对于第 3 种用法，将文件嵌入到 embed.FS 中，适合嵌入多个文件或整个目录（embed.FS 是一个只读的虚拟文件系统）。

## 注意事项

#### 只读限制

嵌入的内容在运行时是只读的，即在编译期嵌入文件的内容是什么，运行时读取到的内容也将保持不变。embed.FS 提供了文件系统相关的基本操作，如打开和读取文件，但不支持写操作，这使得其在多线程环境中是安全的，多个 goroutine 可以并发访问 embed.FS 实例而不会产生竞争条件。

```go
type FS
    func (f FS) Open(name string) (fs.File, error)
    func (f FS) ReadDir(name string) ([]fs.DirEntry, error)
    func (f FS) ReadFile(name string) ([]byte, error)

```

#### 文件模式匹配

在 `go:embed` 指令中，可以只写文件夹名，此时该文件夹中除了以 . 和 _ 开头的文件和文件夹外，其他文件都会被嵌入，并且子文件夹也会被递归嵌入，形成一个完整的文件系统。

如果需要嵌入以 . 和 _ 开头的文件或文件夹（如 .hello.txt），则需要使用通配符 *，如 go:embed p/*。但请注意，* 不具有递归性，子文件夹下的 . 和 _ 开头的文件不会被嵌入，除非在子文件夹中单独使用通配符进行嵌入。


```go
//go:embed pfinal/*
var pfinal embed.FS
func main() {
	data, _ := f.ReadFile("pfinal/.pfinal.txt")
	fmt.Println(string(data))
	data, _ = f.ReadFile("pfinal/q/.pf.txt") // 没有嵌入 pfinal/q/.hi.txt
	fmt.Println(string(data))
}
```

此外，嵌入模式不支持绝对路径，也不支持路径中包含 . 和 ..。如果想嵌入当前 Go 源文件所在路径的文件，可以使用通配符 *：

```go

package main
import (
	"embed"
	"fmt"
)
//go:embed "he llo.txt" `hello-2.txt`
var f embed.FS
func main() {
	data, _ := f.ReadFile("he llo.txt")
	fmt.Println(string(data))
}

```

## 参考

```go

/**
 * @Author: PFinal南丞
 * @Author: lampxiezi@163.com
 * @Date: 2023/11/9
 * @Desc:示例伪代码
 * @Project: pf_tools
 */
const (
	IntLen           = 4
	CharLen          = 1
	PhoneIndexLength = 9
	CHUNK            = 100
	PhoneDat         = "phone.dat"
)

//go:embed phone.dat
var fsContent embed.FS

type PhoneRecord struct {
	PhoneNum string
	Province string
	City     string
	ZipCode  string
	AreaZone string
	CardType string
}

var content []byte

func init() {
	var err error
	content, err = fsContent.ReadFile(PhoneDat)
	if err != nil {
		panic(err)
	}
}

....

```

通过这些示例，可以看到 go:embed 指令在嵌入静态资源方面的强大功能和灵活性。开发者可以根据实际需求，选择最适合的嵌入方式，提高程序的可移植性和部署效率。




