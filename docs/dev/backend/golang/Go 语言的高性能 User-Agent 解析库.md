---
title: Go 语言的高性能 User-Agent 解析库
date: 2024-09-03 21:31:32
tags:
    - golang
description: 详细介绍Go语言的高性能User-Agent解析库，包括安装配置、使用方法、性能测试等核心功能，帮助开发者轻松解析User-Agent信息。
author: PFinal南丞
keywords: Go语言的高性能User-Agent解析库, golang, 工具, User-Agent解析, 性能测试, 解析库
---

# Go 语言的高性能 User-Agent 解析库

在开发的时候，`User-Agent` 字符串是浏览器发送给服务器的一串信息，用于标识浏览器的类型、版本、操作系统以及设备类型等。解析 User-Agent 字符串可以帮助开发者获取用户的设备信息，从而提供更精准的服务，例如页面适配、内容推荐等。

以下是我常用的两个 `User-Agent` 解析库，这些工具可以帮助简化设备识别过程。

## mssola/useragent

`mssola/useragent` 是一个小巧简洁的 `User-Agent` 解析库，它的使用非常便捷。

**安装**

通过下面的命令来安装此库：

```shell

go get -u github.com/mssola/useragent

```

**使用**

下面是一个简单的示例代码，展示了如何解析 `User-Agent` 字符串并提取其中的信息：

```go
package main

import (
    "fmt"

    "github.com/mssola/useragent"
)

func main() {
    // The "New" function will create a new UserAgent object and it will parse
    // the given string. If you need to parse more strings, you can re-use
    // this object and call: ua.Parse("another string")
    ua := useragent.New("Mozilla/5.0 (Linux; U; Android 2.3.7; en-us; Nexus One Build/FRF91) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1")

    fmt.Printf("%v\n", ua.Mobile())   // => true  
    fmt.Printf("%v\n", ua.Bot())      // => false
    fmt.Printf("%v\n", ua.Mozilla())  // => "5.0"
    fmt.Printf("%v\n", ua.Model())    // => "Nexus One"

    fmt.Printf("%v\n", ua.Platform()) // => "Linux"
    fmt.Printf("%v\n", ua.OS())       // => "Android 2.3.7"

    name, version := ua.Engine()
    fmt.Printf("%v\n", name)          // => "AppleWebKit"
    fmt.Printf("%v\n", version)       // => "533.1"

    name, version = ua.Browser()
    fmt.Printf("%v\n", name)          // => "Android"
    fmt.Printf("%v\n", version)       // => "4.0"

    // Let's see an example with a bot.

    ua.Parse("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")

    fmt.Printf("%v\n", ua.Bot())      // => true

    name, version = ua.Browser()
    fmt.Printf("%v\n", name)          // => Googlebot
    fmt.Printf("%v\n", version)       // => 2.1
}

```

通过以上代码，可以方便地检测常用信息，如是否是移动设备、是否是机器人等。此外，它还能提取操作系统、平台、浏览器引擎等信息。


## go-useragent


`go-useragent` 是另一款高效的 `User-Agent` 解析库，相较于其他库，它具有以下显著优势：

- **高性能**：`go-useragent` 使用 Trie 树结构来匹配 `User-Agent` 字符串，解析速度极快，能够达到亚微秒级别。
- **轻量级**：此库的代码简洁易懂，依赖较少，非常适合集成到各种 Go 项目中。
- **高准确性**：`go-useragent` 的规则库定期更新，保证解析结果的准确性。


**安装**

安装 `go-useragent` 的命令如下：

```shell

go get github.com/medama-io/go-useragent

```

**使用**
以下是一个示例，展示如何使用该库解析 `User-Agent`：

```go
package main

import (
	"fmt"
	"github.com/medama-io/go-useragent"
)

func main() {
	// Create a new parser. Initialize only once during application startup.
	ua := useragent.NewParser()

	// Example user-agent string.
	str := "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"

	agent := ua.Parse(str)

	fmt.Println(agent.GetBrowser())  // Chrome
	fmt.Println(agent.GetOS())       // Windows
	fmt.Println(agent.GetVersion())  // 118.0.0.0
	fmt.Println(agent.IsDesktop())  // true
	fmt.Println(agent.IsMobile())   // false
	fmt.Println(agent.IsTablet())   // false
	fmt.Println(agent.IsTV())       // false
	fmt.Println(agent.IsBot())      // false

	// Helper functions.
	fmt.Println(agent.GetMajorVersion())  // 118
}

```


### 总结

这两个 `User-Agent` 解析库都非常实用，适合不同的开发需求。`mssola/useragent` 更加小巧简洁，提供了常见的检测功能，而 `go-useragent` 则在性能和准确性方面表现突出，适合需要高性能解析的场景。在选择解析库时，建议根据具体的项目需求进行选择。