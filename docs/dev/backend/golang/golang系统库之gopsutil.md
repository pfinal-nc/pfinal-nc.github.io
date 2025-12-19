---
title: gopsutil完整使用指南 - 如何在Go中获取CPU内存磁盘网络指标
date: 2024-09-09T15:13:09.000Z
tags:
  - 工具
  - golang
description: 详细介绍golang系统库之gopsutil，包括安装配置、进程监控、系统信息获取等核心功能，帮助开发者轻松获取系统信息。
author: PFinal南丞
keywords:
  - gopsutil 完整使用指南
  - golang 系统监控库
  - go 获取 CPU 内存指标
  - golang 系统信息获取
  - gopsutil 实战教程
  - go 进程监控库
  - golang 磁盘网络监控
  - go 系统指标获取
  - gopsutil 最佳实践
  - golang 系统库使用
sticky: true
top: 1
recommend: 后端工程
---

# Golang系统库之gopsutil


使用 `wails` 开发系统小工具的时候, 需要获取一些 `系统的信息`,比如 CPU信息,内存信息等. `psutil` 是一个跨平台的进程与系统监控库，主要用于 Python 语言，而 `gopsutil` 则是其在 Go 语言中的实现版本,`gopsutil` 的基础用法做一个记录. 

要做的 小工具. 如下图所示:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202409091529547.png)

## gopsutil 介绍

`gopsutil` 是 `psutil`（一个常用于 Python 的系统和进程监控库）的 Go 实现版本。通过它，我们能够跨平台地获取系统相关的信息，且其 API 设计非常简洁易用，支持多种系统监控需求。

##### 安装

首先，通过以下命令安装 `gopsutil`：

```shell
go get github.com/shirou/gopsutil
```

#### 基本使用

**CPU 信息**

通过 `gopsutil`，方便地获取 CPU 的相关信息。

```go

import "github.com/shirou/gopsutil/cpu" 
// 获取CPU信息 
func getCpuInfo() { 
	cpuInfos, err := cpu.Info() 
	if err != nil { 
		fmt.Printf("获取 CPU 信息失败: %v", err) 
		return 
	} 
	for _, ci := range cpuInfos { 
		fmt.Println(ci) 
	} 
	// 实时获取CPU使用率 
	for { 
		percent, _ := cpu.Percent(time.Second, false) 
		fmt.Printf("CPU 使用率: %v%%\n", percent) 
	} 
}
```

此外, 还可以通过 `gopsutil/load` 获取 CPU 的负载信息：

```go

import "github.com/shirou/gopsutil/load"

// 获取CPU负载
func getCpuLoad() {
	loadInfo, _ := load.Avg()
	fmt.Printf("CPU 负载: %v\n", loadInfo)
}

```
\
**PS**: `gopsutil` 将不同的功能划分到不同的子包中：

- `cpu`: CPU 相关
- `disk`: 磁盘相关
- `mem`: 内存相关
- `host`: 主机相关
- 其他还有 `docker`, `net`, `process`, `winservices` 等


**内存信息**

通过 `gopsutil/mem`  可以获取系统的内存使用情况

```go

import "github.com/shirou/gopsutil/mem"

// 获取内存信息
func getMemInfo() {
	memInfo, _ := mem.VirtualMemory()
	fmt.Printf("内存信息: %v\n", memInfo)
}

```

**主机信息**

主机相关的信息也可以通过 `gopsutil/host` 进行查询，比如系统的启动时间、运行时间等。

```go
import "github.com/shirou/gopsutil/host"

// 获取主机信息
func getHostInfo() {
	hostInfo, _ := host.Info()
	fmt.Printf("主机信息: %v\n系统运行时间: %v 秒\n系统启动时间: %v\n", hostInfo, hostInfo.Uptime, hostInfo.BootTime)
}

```

**磁盘信息**

获取磁盘分区和使用情况。

```go

import "github.com/shirou/gopsutil/disk"

// 获取磁盘信息
func getDiskInfo() {
	partitions, err := disk.Partitions(true)
	if err != nil {
		fmt.Printf("获取分区信息失败: %v\n", err)
		return
	}
	for _, partition := range partitions {
		fmt.Printf("分区: %v\n", partition)
		diskUsage, _ := disk.Usage(partition.Mountpoint)
		fmt.Printf("磁盘使用情况: 已用: %.2f%% 空闲: %v\n", diskUsage.UsedPercent, diskUsage.Free)
	}

	ioCounters, _ := disk.IOCounters()
	for device, counter := range ioCounters {
		fmt.Printf("%v: %v\n", device, counter)
	}
}
```

**网络信息:**

使用 `gopsutil` 获取网络 I/O 统计信息。

```go
import "github.com/shirou/gopsutil/net"

// 获取网络I/O信息
func getNetInfo() {
	netInfos, _ := net.IOCounters(true)
	for idx, netInfo := range netInfos {
		fmt.Printf("网络接口 %v: 发送字节: %v 接收字节: %v\n", idx, netInfo.BytesSent, netInfo.BytesRecv)
	}
}
```

**获取本地 IP:**

```go
import "github.com/shirou/gopsutil/net"

func GetLocalIP() (string, error) {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "", err
	}
	for _, addr := range addrs {
		ipNet, ok := addr.(*net.IPNet)
		if !ok || ipNet.IP.IsLoopback() {
			continue
		}
		if ipNet.IP.IsGlobalUnicast() {
			return ipNet.IP.String(), nil
		}
	}
	return "", fmt.Errorf("未找到本地IP")
}

```


## Wails 托盘功能

由于 `wails v2`版本没有支持 `托盘的功能`, 所以 使用了 第三方的 库来做.

第三方库的地址是:

```
https://github.com/getlantern/systray/tree/master
```


由于 2个 框架 不互通, 都调用了 系统的 扩展,尝试直接调用就会 报错,所以  在这里只能做一个 `子程序运行`:

```go

package main

import (
    "fmt"
    "os/exec"
)

func main() {
    cmd := exec.Command("echo", "子程序运行")
    output, err := cmd.Output()

    if err != nil {
        fmt.Println("执行子程序时出错:", err)
        return
    }

    fmt.Println("子程序输出:", string(output))
}

```



效果图如下:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202409100931063.png)



## 最后

看到 `walis v3` 版本支持了 托盘功能, 就是不知道啥时候发布,希望尽快发布,这样就方便多了. 上面使用 `systray` 与 `wails` 需要解决很多的地方, 子程序与主程序之间的通信,这些.需要随时监控。等等
