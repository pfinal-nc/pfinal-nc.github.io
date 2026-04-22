---
title: "GO 语言开发终端小工具后续"
description: "在 Go 终端小工具基础上新增天气查询、手机归属地、MD5/Base64、网络词汇、时间戳等子命令的开发与迭代记录，以及遇到的问题与解决方式。"
keywords:
  - Go
  - 终端工具
  - CLI
  - Cobra
  - 命令行工具
author: PFinal南丞
date: 2026-04-22
tags:
  - golang
  - cli
  - terminal
  - tools
---

# GO 语言开发终端小工具后续

> 在基础 CLI 工具之上，添加更多实用功能，打造全能终端助手。

## 一、新增功能概览

### 1.1 功能列表

| 命令 | 功能 | 示例 |
|------|------|------|
| `weather` | 天气查询 | `tool weather 北京` |
| `phone` | 手机归属地 | `tool phone 13800138000` |
| `hash` | MD5/SHA256 | `tool hash -t md5 "text"` |
| `base64` | Base64 编解码 | `tool base64 encode "text"` |
| `timestamp` | 时间戳转换 | `tool timestamp now` |
| `dict` | 网络词典 | `tool dict hello` |

## 二、天气查询

```go
package cmd

import (
    "encoding/json"
    "fmt"
    "net/http"
    "github.com/spf13/cobra"
)

var weatherCmd = &cobra.Command{
    Use:   "weather [city]",
    Short: "查询城市天气",
    Args:  cobra.ExactArgs(1),
    Run: func(cmd *cobra.Command, args []string) {
        city := args[0]
        weather, err := getWeather(city)
        if err != nil {
            fmt.Printf("查询失败: %v\n", err)
            return
        }
        
        fmt.Printf("📍 %s\n", weather.City)
        fmt.Printf("🌡️ 温度: %s°C\n", weather.Temperature)
        fmt.Printf("🌤️ 天气: %s\n", weather.Condition)
        fmt.Printf("💧 湿度: %s%%\n", weather.Humidity)
        fmt.Printf("🌬️ 风向: %s\n", weather.Wind)
    },
}

type Weather struct {
    City        string `json:"city"`
    Temperature string `json:"temperature"`
    Condition   string `json:"condition"`
    Humidity    string `json:"humidity"`
    Wind        string `json:"wind"`
}

func getWeather(city string) (*Weather, error) {
    url := fmt.Sprintf("https://api.weather.com/v1/current?city=%s", url.QueryEscape(city))
    
    resp, err := http.Get(url)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    var weather Weather
    if err := json.NewDecoder(resp.Body).Decode(&weather); err != nil {
        return nil, err
    }
    
    return &weather, nil
}
```

## 三、手机归属地查询

```go
var phoneCmd = &cobra.Command{
    Use:   "phone [number]",
    Short: "查询手机号归属地",
    Args:  cobra.ExactArgs(1),
    Run: func(cmd *cobra.Command, args []string) {
        phone := args[0]
        info, err := getPhoneInfo(phone)
        if err != nil {
            fmt.Printf("查询失败: %v\n", err)
            return
        }
        
        fmt.Printf("📱 手机号: %s\n", phone)
        fmt.Printf("🏢 运营商: %s\n", info.Carrier)
        fmt.Printf("📍 归属地: %s %s\n", info.Province, info.City)
    },
}

type PhoneInfo struct {
    Phone     string `json:"phone"`
    Province  string `json:"province"`
    City      string `json:"city"`
    Carrier   string `json:"carrier"`
    ZipCode   string `json:"zip_code"`
    AreaCode  string `json:"area_code"`
}
```

## 四、哈希计算

```go
var hashCmd = &cobra.Command{
    Use:   "hash [text]",
    Short: "计算文本哈希值",
    Args:  cobra.ExactArgs(1),
    Run: func(cmd *cobra.Command, args []string) {
        text := args[0]
        hashType, _ := cmd.Flags().GetString("type")
        
        var result string
        switch hashType {
        case "md5":
            result = calculateMD5(text)
        case "sha256":
            result = calculateSHA256(text)
        default:
            fmt.Println("不支持的哈希类型")
            return
        }
        
        fmt.Printf("%s: %s\n", strings.ToUpper(hashType), result)
    },
}

func init() {
    hashCmd.Flags().StringP("type", "t", "md5", "哈希类型 (md5, sha256)")
}

func calculateMD5(text string) string {
    hash := md5.Sum([]byte(text))
    return hex.EncodeToString(hash[:])
}

func calculateSHA256(text string) string {
    hash := sha256.Sum256([]byte(text))
    return hex.EncodeToString(hash[:])
}
```

## 五、Base64 编解码

```go
var base64Cmd = &cobra.Command{
    Use:   "base64",
    Short: "Base64 编解码工具",
}

var base64EncodeCmd = &cobra.Command{
    Use:   "encode [text]",
    Short: "Base64 编码",
    Args:  cobra.ExactArgs(1),
    Run: func(cmd *cobra.Command, args []string) {
        text := args[0]
        encoded := base64.StdEncoding.EncodeToString([]byte(text))
        fmt.Println(encoded)
    },
}

var base64DecodeCmd = &cobra.Command{
    Use:   "decode [text]",
    Short: "Base64 解码",
    Args:  cobra.ExactArgs(1),
    Run: func(cmd *cobra.Command, args []string) {
        text := args[0]
        decoded, err := base64.StdEncoding.DecodeString(text)
        if err != nil {
            fmt.Printf("解码失败: %v\n", err)
            return
        }
        fmt.Println(string(decoded))
    },
}

func init() {
    base64Cmd.AddCommand(base64EncodeCmd)
    base64Cmd.AddCommand(base64DecodeCmd)
}
```

## 六、时间戳转换

```go
var timestampCmd = &cobra.Command{
    Use:   "timestamp",
    Short: "时间戳转换工具",
}

var timestampNowCmd = &cobra.Command{
    Use:   "now",
    Short: "获取当前时间戳",
    Run: func(cmd *cobra.Command, args []string) {
        now := time.Now()
        fmt.Printf("秒级时间戳: %d\n", now.Unix())
        fmt.Printf("毫秒级时间戳: %d\n", now.UnixMilli())
        fmt.Printf("微秒级时间戳: %d\n", now.UnixMicro())
        fmt.Printf("纳秒级时间戳: %d\n", now.UnixNano())
        fmt.Printf("格式化时间: %s\n", now.Format("2006-01-02 15:04:05"))
    },
}

var timestampConvertCmd = &cobra.Command{
    Use:   "convert [timestamp]",
    Short: "时间戳转日期",
    Args:  cobra.ExactArgs(1),
    Run: func(cmd *cobra.Command, args []string) {
        ts, _ := strconv.ParseInt(args[0], 10, 64)
        
        // 自动判断时间戳精度
        var t time.Time
        switch len(args[0]) {
        case 10:
            t = time.Unix(ts, 0)
        case 13:
            t = time.UnixMilli(ts)
        case 16:
            t = time.UnixMicro(ts)
        default:
            fmt.Println("无法识别的时间戳格式")
            return
        }
        
        fmt.Printf("本地时间: %s\n", t.Format("2006-01-02 15:04:05"))
        fmt.Printf("UTC 时间: %s\n", t.UTC().Format("2006-01-02 15:04:05"))
    },
}
```

## 七、遇到的问题与解决

### 7.1 API 限流问题

```go
// 使用速率限制器
import "golang.org/x/time/rate"

var limiter = rate.NewLimiter(rate.Every(time.Second), 10)

func makeAPIRequest(url string) (*http.Response, error) {
    if err := limiter.Wait(context.Background()); err != nil {
        return nil, err
    }
    return http.Get(url)
}
```

### 7.2 配置文件管理

```go
// 使用 Viper 管理配置
import "github.com/spf13/viper"

func initConfig() {
    viper.SetConfigName("config")
    viper.SetConfigType("yaml")
    viper.AddConfigPath("$HOME/.tool")
    viper.AddConfigPath(".")
    
    viper.SetDefault("weather.api_key", "")
    viper.SetDefault("phone.api_key", "")
    
    viper.ReadInConfig()
}
```

## 八、总结

通过不断迭代，这个终端小工具已经成为日常开发的好帮手。使用 Cobra 框架让命令组织更加清晰，每个子命令都可以独立开发和测试。
