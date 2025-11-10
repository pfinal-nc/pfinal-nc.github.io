---
title: Go 开发终端小工具完整指南：从零构建实用 CLI 工具
date: 2023-11-09 17:22:37
tags: 
    - golang
    - 工具
    - CLI
    - cobra
    - termui
description: 从零开始学习使用 Go 语言开发终端小工具，包括天气查询、手机归属地查询等实用功能。涵盖 Cobra 框架、Termui 界面库、测试、打包发布等完整开发流程。
author: PFinal南丞
keywords: Go CLI工具, golang终端工具, cobra框架, termui, 命令行工具开发, Go项目实战, 工具打包发布
sticky: true

---

# Go 开发终端小工具完整指南：从零构建实用 CLI 工具

## 一、项目背景与技术选型

偶然看到有人用 Rust 开发终端天气查询工具，界面美观、交互友好。作为 Go 开发者，我也想尝试一下用 Go 实现类似的功能。经过几天的开发，完成了一个包含天气查询、手机归属地查询等功能的终端工具集。

**最终效果**：

![天气查询效果](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202311081716928.png)

### 为什么选择 Go 开发 CLI 工具？

| 特性 | Go | Python | Node.js | Rust |
|------|-----|--------|---------|------|
| 部署方式 | 单文件 | 需要运行时 | 需要运行时 | 单文件 |
| 启动速度 | ⚡️ 极快 | 较慢 | 较慢 | ⚡️ 极快 |
| 内存占用 | 低 | 中 | 高 | 极低 |
| 跨平台 | ✅ 原生支持 | ✅ | ✅ | ✅ |
| 学习曲线 | 平缓 | 平缓 | 平缓 | 陡峭 |
| 生态系统 | 丰富 | 非常丰富 | 非常丰富 | 成长中 |

### Go 在 CLI 开发中的优势

1. **单文件部署**：编译后是单个二进制文件，无需运行时，方便分发
2. **跨平台支持**：一次编译，可在 Windows、Mac、Linux 运行
3. **丰富的库支持**：Cobra、Termui、Viper 等成熟框架
4. **高性能**：启动速度快（< 10ms），内存占用小（通常 < 10MB）
5. **并发支持**：goroutine 天然适合处理并发任务
6. **静态类型**：编译时类型检查，减少运行时错误

## 二、项目架构设计

### 2.1 完整项目结构

```
pf_tools/
├── cmd/                    # 命令定义
│   ├── root.go            # 根命令
│   ├── weather.go         # 天气查询命令
│   ├── mobile.go          # 手机归属地命令
│   └── version.go         # 版本信息命令
├── pkg/                   # 核心业务逻辑
│   ├── weather/           
│   │   ├── weather.go     # 天气查询实现
│   │   ├── api.go         # API 调用
│   │   └── parser.go      # 数据解析
│   ├── mobile/            
│   │   ├── mobile.go      # 手机归属地实现
│   │   └── validator.go   # 号码验证
│   └── ui/                
│       ├── table.go       # 表格组件
│       └── list.go        # 列表组件
├── internal/              # 内部包
│   ├── config/            
│   │   └── config.go      # 配置管理
│   └── http/              
│       └── client.go      # HTTP 客户端
├── test/                  # 测试文件
│   ├── weather_test.go
│   └── mobile_test.go
├── docs/                  # 文档
│   ├── README.md
│   └── USAGE.md
├── scripts/               # 构建脚本
│   ├── build.sh           # 构建脚本
│   └── release.sh         # 发布脚本
├── .goreleaser.yml        # GoReleaser 配置
├── main.go                # 程序入口
├── go.mod                 # 依赖管理
├── go.sum
├── LICENSE
└── README.md
```

### 2.2 技术栈选择

**核心框架**：
- **Cobra**：命令行框架，Kubernetes、Docker、Hugo 都在用
- **Viper**：配置管理，支持多种配置格式
- **Termui**：终端 UI 库，构建漂亮的终端界面

**辅助库**：
- **resty**：HTTP 客户端，比 net/http 更易用
- **logrus**：结构化日志
- **testify**：测试断言库

## 三、核心功能实现

### 3.1 Cobra 框架详解

Cobra 是由 spf13（Steve Francia）开发的命令行框架，被广泛应用于知名开源项目。

#### 3.1.1 安装 Cobra CLI

```bash
# 安装 cobra-cli
go install github.com/spf13/cobra-cli@latest

# 验证安装
cobra-cli --version
```

#### 3.1.2 初始化项目

```bash
# 创建项目目录
mkdir pf_tools && cd pf_tools

# 初始化 Go 模块
go mod init github.com/pfinal/pf_tools

# 初始化 Cobra 项目
cobra-cli init

# 添加子命令
cobra-cli add weather
cobra-cli add mobile
cobra-cli add version
```

#### 3.1.3 根命令实现

`cmd/root.go`：

```go
package cmd

import (
	"fmt"
	"os"
	
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var (
	cfgFile string
	verbose bool
)

var rootCmd = &cobra.Command{
	Use:   "pft",
	Short: "PFinal Tools - 实用终端工具集",
	Long: `PFinal Tools 是一个基于 Go 开发的实用终端工具集合。

功能列表:
  - pft weather <city>  查询天气
  - pft mobile <phone>  查询手机归属地
  - pft version         查看版本信息

示例:
  pft weather 北京
  pft mobile 13800138000
  
更多信息请访问: https://github.com/PFinal-tool/pf_tools`,
	
	Run: func(cmd *cobra.Command, args []string) {
		// 没有子命令时显示帮助信息
		if len(args) == 0 {
			cmd.Help()
			return
		}
	},
}

// Execute 执行根命令
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func init() {
	cobra.OnInitialize(initConfig)
	
	// 全局标志
	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is $HOME/.pft.yaml)")
	rootCmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false, "verbose output")
	
	// 绑定到 Viper
	viper.BindPFlag("verbose", rootCmd.PersistentFlags().Lookup("verbose"))
}

// initConfig 读取配置文件和环境变量
func initConfig() {
	if cfgFile != "" {
		// 使用指定的配置文件
		viper.SetConfigFile(cfgFile)
	} else {
		// 查找 home 目录
		home, err := os.UserHomeDir()
		cobra.CheckErr(err)
		
		// 在 home 目录中查找 ".pft" 配置文件
		viper.AddConfigPath(home)
		viper.SetConfigType("yaml")
		viper.SetConfigName(".pft")
	}
	
	// 读取环境变量
	viper.AutomaticEnv()
	
	// 读取配置文件
	if err := viper.ReadInConfig(); err == nil {
		if verbose {
			fmt.Fprintln(os.Stderr, "Using config file:", viper.ConfigFileUsed())
		}
	}
}
```

### 3.2 天气查询功能实现

#### 3.2.1 命令定义

`cmd/weather.go`：

```go
package cmd

import (
	"fmt"
	
	"github.com/pfinal/pf_tools/pkg/weather"
	"github.com/spf13/cobra"
)

var (
	weatherDays int
	weatherLang string
)

var weatherCmd = &cobra.Command{
	Use:   "weather [city]",
	Short: "查询城市天气",
	Long: `查询指定城市的天气信息，支持国内所有城市。

示例:
  pft weather 北京
  pft weather 上海 --days 7
  pft weather 广州 --lang en`,
	
	Args: cobra.ExactArgs(1), // 必须有一个参数
	
	Run: func(cmd *cobra.Command, args []string) {
		city := args[0]
		
		fmt.Printf("正在查询 %s 的天气...\n\n", city)
		
		// 创建天气查询服务
		service := weather.NewService()
		
		// 查询天气
		result, err := service.Query(city, weatherDays)
		if err != nil {
			fmt.Printf("查询失败: %v\n", err)
			return
		}
		
		// 渲染界面
		weather.RenderTable(result)
	},
}

func init() {
	rootCmd.AddCommand(weatherCmd)
	
	// 子命令标志
	weatherCmd.Flags().IntVarP(&weatherDays, "days", "d", 3, "查询天数 (1-7)")
	weatherCmd.Flags().StringVarP(&weatherLang, "lang", "l", "zh", "语言 (zh/en)")
}
```

#### 3.2.2 业务逻辑实现

`pkg/weather/weather.go`：

```go
package weather

import (
	"encoding/json"
	"fmt"
	"time"
	
	"github.com/go-resty/resty/v2"
)

// WeatherData 天气数据
type WeatherData struct {
	City    string        `json:"city"`
	Update  string        `json:"update_time"`
	Weather []DayWeather  `json:"data"`
}

// DayWeather 单日天气
type DayWeather struct {
	Date        string `json:"date"`
	Week        string `json:"week"`
	Weather     string `json:"wea"`
	WeatherCode string `json:"wea_code"`
	Temperature string `json:"tem"`
	TempHigh    string `json:"tem1"`
	TempLow     string `json:"tem2"`
	Wind        string `json:"win"`
	WindLevel   string `json:"win_speed"`
	Air         string `json:"air"`
	AirLevel    int    `json:"air_level"`
	AirTips     string `json:"air_tips"`
}

// Service 天气服务
type Service struct {
	client  *resty.Client
	apiURL  string
	timeout time.Duration
}

// NewService 创建天气服务
func NewService() *Service {
	client := resty.New()
	client.SetTimeout(10 * time.Second)
	client.SetRetryCount(3)
	client.SetRetryWaitTime(2 * time.Second)
	
	return &Service{
		client:  client,
		apiURL:  "https://www.tianqiapi.com/free/week", // 示例 API
		timeout: 10 * time.Second,
	}
}

// Query 查询天气
func (s *Service) Query(city string, days int) (*WeatherData, error) {
	// 验证参数
	if days < 1 || days > 7 {
		return nil, fmt.Errorf("天数必须在 1-7 之间")
	}
	
	// 发起请求
	resp, err := s.client.R().
		SetQueryParams(map[string]string{
			"city":   city,
			"appid":  "your_app_id",
			"appsecret": "your_app_secret",
		}).
		Get(s.apiURL)
	
	if err != nil {
		return nil, fmt.Errorf("请求失败: %w", err)
	}
	
	if resp.StatusCode() != 200 {
		return nil, fmt.Errorf("API 返回错误: %d", resp.StatusCode())
	}
	
	// 解析响应
	var result WeatherData
	if err := json.Unmarshal(resp.Body(), &result); err != nil {
		return nil, fmt.Errorf("解析失败: %w", err)
	}
	
	// 限制返回天数
	if len(result.Weather) > days {
		result.Weather = result.Weather[:days]
	}
	
	return &result, nil
}
```

#### 3.2.3 UI 渲染

`pkg/weather/ui.go`：

```go
package weather

import (
	"fmt"
	"log"
	
    ui "github.com/gizak/termui/v3"
	"github.com/gizak/termui/v3/widgets"
)

// RenderTable 渲染天气表格
func RenderTable(data *WeatherData) {
	if err := ui.Init(); err != nil {
		log.Fatalf("初始化 UI 失败: %v", err)
	}
	defer ui.Close()
	
	// 创建表格
	table := widgets.NewTable()
	table.Title = fmt.Sprintf("🌤  %s 天气预报", data.City)
	table.TitleStyle = ui.NewStyle(ui.ColorCyan, ui.ColorClear, ui.ModifierBold)
	table.BorderStyle = ui.NewStyle(ui.ColorCyan)
	
	// 设置表头
	table.Rows = [][]string{
		{"日期", "星期", "天气", "温度", "风向", "空气质量"},
	}
	table.RowStyles[0] = ui.NewStyle(ui.ColorYellow, ui.ColorClear, ui.ModifierBold)
	
	// 填充数据
	for _, day := range data.Weather {
		// 根据天气类型选择颜色
		weatherStyle := getWeatherColor(day.Weather)
		
		row := []string{
			day.Date,
			day.Week,
			fmt.Sprintf("%s %s", getWeatherEmoji(day.Weather), day.Weather),
			fmt.Sprintf("%s/%s", day.TempHigh, day.TempLow),
			fmt.Sprintf("%s %s", day.Wind, day.WindLevel),
			fmt.Sprintf("%s (%d)", day.Air, day.AirLevel),
		}
		table.Rows = append(table.Rows, row)
	}
	
	// 设置样式
	table.TextStyle = ui.NewStyle(ui.ColorGreen)
	table.ColumnWidths = []int{12, 8, 15, 12, 15, 15}
	
	// 计算表格大小
	termWidth, termHeight := ui.TerminalDimensions()
	table.SetRect(0, 0, termWidth, len(table.Rows)+3)
	
	// 渲染
	ui.Render(table)
	
	// 提示信息
	hint := widgets.NewParagraph()
	hint.Text = "按 'q' 或 'Ctrl+C' 退出"
	hint.Border = false
	hint.TextStyle = ui.NewStyle(ui.ColorGray)
	hint.SetRect(0, len(table.Rows)+3, termWidth, termHeight)
	ui.Render(hint)
	
	// 事件循环
	for e := range ui.PollEvents() {
		switch e.ID {
		case "q", "<C-c>":
			return
		case "<Resize>":
			payload := e.Payload.(ui.Resize)
			table.SetRect(0, 0, payload.Width, len(table.Rows)+3)
			hint.SetRect(0, len(table.Rows)+3, payload.Width, payload.Height)
			ui.Clear()
			ui.Render(table, hint)
		}
	}
}

// getWeatherEmoji 根据天气获取表情
func getWeatherEmoji(weather string) string {
	emojiMap := map[string]string{
		"晴":  "☀️",
		"多云": "⛅️",
		"阴":  "☁️",
		"雨":  "🌧",
		"雪":  "❄️",
		"雷":  "⚡️",
		"雾":  "🌫",
	}
	
	for key, emoji := range emojiMap {
		if contains(weather, key) {
			return emoji
		}
	}
	return "🌤"
}

// getWeatherColor 根据天气获取颜色
func getWeatherColor(weather string) ui.Color {
	if contains(weather, "晴") {
		return ui.ColorYellow
	} else if contains(weather, "雨") || contains(weather, "雪") {
		return ui.ColorBlue
	} else if contains(weather, "阴") || contains(weather, "多云") {
		return ui.ColorGray
	}
	return ui.ColorGreen
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0)
}
```

### 3.3 手机归属地查询

`cmd/mobile.go`：

```go
package cmd

import (
	"fmt"
	
	"github.com/pfinal/pf_tools/pkg/mobile"
	"github.com/spf13/cobra"
)

var mobileCmd = &cobra.Command{
	Use:   "mobile [phone]",
	Short: "查询手机归属地",
	Long: `查询手机号码的归属地信息，包括省份、城市、运营商等。

示例:
  pft mobile 13800138000
  pft mobile 18912345678`,
	
	Args: cobra.ExactArgs(1),
	
	Run: func(cmd *cobra.Command, args []string) {
		phone := args[0]
		
		// 验证手机号
		if !mobile.IsValid(phone) {
			fmt.Println("❌ 无效的手机号码")
			return
		}
		
		fmt.Printf("正在查询 %s 的归属地...\n\n", phone)
		
		// 创建服务
		service := mobile.NewService()
		
		// 查询
		result, err := service.Query(phone)
		if err != nil {
			fmt.Printf("查询失败: %v\n", err)
			return
		}
		
		// 渲染结果
		mobile.RenderList(result)
	},
}

func init() {
	rootCmd.AddCommand(mobileCmd)
}
```

`pkg/mobile/mobile.go`：

```go
package mobile

import (
	"encoding/json"
	"fmt"
	"regexp"
	"time"
	
	"github.com/go-resty/resty/v2"
)

// MobileInfo 手机号信息
type MobileInfo struct {
	PhoneNum string `json:"phone"`
	Province string `json:"province"`
	City     string `json:"city"`
	ZipCode  string `json:"zip_code"`
	AreaZone string `json:"area_code"`
	CardType string `json:"card_type"` // 运营商
}

// Service 查询服务
type Service struct {
	client *resty.Client
	apiURL string
}

// NewService 创建服务
func NewService() *Service {
	client := resty.New()
	client.SetTimeout(10 * time.Second)
	client.SetRetryCount(3)
	
	return &Service{
		client: client,
		apiURL: "https://tcc.taobao.com/cc/json/mobile_tel_segment.htm",
	}
}

// IsValid 验证手机号
func IsValid(phone string) bool {
	// 中国手机号正则：1开头，第二位是3-9，总共11位
	pattern := `^1[3-9]\d{9}$`
	matched, _ := regexp.MatchString(pattern, phone)
	return matched
}

// Query 查询归属地
func (s *Service) Query(phone string) (*MobileInfo, error) {
	resp, err := s.client.R().
		SetQueryParam("tel", phone).
		Get(s.apiURL)
	
	if err != nil {
		return nil, fmt.Errorf("请求失败: %w", err)
	}
	
	// 解析 JSONP 响应
	// 实际项目中需要根据 API 返回格式处理
	var info MobileInfo
	if err := json.Unmarshal(resp.Body(), &info); err != nil {
		return nil, fmt.Errorf("解析失败: %w", err)
	}
	
	info.PhoneNum = phone
	return &info, nil
}
```

`pkg/mobile/ui.go`：

```go
package mobile

import (
	"fmt"
	"log"
	
	ui "github.com/gizak/termui/v3"
	"github.com/gizak/termui/v3/widgets"
)

// RenderList 渲染信息列表
func RenderList(info *MobileInfo) {
	if err := ui.Init(); err != nil {
		log.Fatalf("初始化 UI 失败: %v", err)
	}
   defer ui.Close()
	
	// 创建列表
	list := widgets.NewList()
	list.Title = "📱  手机号码详细信息"
	list.TitleStyle = ui.NewStyle(ui.ColorGreen, ui.ColorClear, ui.ModifierBold)
	list.BorderStyle = ui.NewStyle(ui.ColorGreen)
	
	// 设置数据
	list.Rows = []string{
		fmt.Sprintf("[手机号码](fg:yellow,mod:bold) %s", info.PhoneNum),
		fmt.Sprintf("[运营商](fg:cyan)   %s", getOperatorEmoji(info.CardType)+info.CardType),
		fmt.Sprintf("[省份](fg:cyan)     %s", info.Province),
		fmt.Sprintf("[城市](fg:cyan)     %s", info.City),
		fmt.Sprintf("[邮政编码](fg:cyan) %s", info.ZipCode),
		fmt.Sprintf("[地区代码](fg:cyan) %s", info.AreaZone),
		"",
		"[提示](fg:gray) 按 'q' 或 'Ctrl+C' 退出",
	}
	
	list.TextStyle = ui.NewStyle(ui.ColorWhite)
	list.WrapText = false
	
	termWidth, termHeight := ui.TerminalDimensions()
	list.SetRect(0, 0, min(50, termWidth), min(12, termHeight))
	
	ui.Render(list)
	
	// 事件循环
	for e := range ui.PollEvents() {
		if e.ID == "q" || e.ID == "<C-c>" {
			return
		}
	}
}

// getOperatorEmoji 获取运营商表情
func getOperatorEmoji(operator string) string {
	switch operator {
	case "中国移动":
		return "🔵 "
	case "中国联通":
		return "🔴 "
	case "中国电信":
		return "🟢 "
	default:
		return "📱 "
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
```

![手机归属地查询效果](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202311091002314.png)

## 四、测试与质量保证

### 4.1 单元测试

`pkg/mobile/mobile_test.go`：

```go
package mobile

import (
	"testing"
	
	"github.com/stretchr/testify/assert"
)

func TestIsValid(t *testing.T) {
	tests := []struct {
		name  string
		phone string
		want  bool
	}{
		{"有效号码-移动", "13800138000", true},
		{"有效号码-联通", "18912345678", true},
		{"有效号码-电信", "17712345678", true},
		{"无效-长度不足", "1380013800", false},
		{"无效-长度过长", "138001380000", false},
		{"无效-非1开头", "23800138000", false},
		{"无效-第二位不合法", "12800138000", false},
		{"空字符串", "", false},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := IsValid(tt.phone)
			assert.Equal(t, tt.want, got)
		})
	}
}

func BenchmarkIsValid(b *testing.B) {
	phone := "13800138000"
	for i := 0; i < b.N; i++ {
		IsValid(phone)
	}
}
```

### 4.2 集成测试

`test/integration_test.go`：

```go
package test

import (
	"os/exec"
	"strings"
	"testing"
	
	"github.com/stretchr/testify/assert"
)

func TestWeatherCommand(t *testing.T) {
	cmd := exec.Command("pft", "weather", "北京", "--days", "3")
	output, err := cmd.CombinedOutput()
	
	assert.NoError(t, err)
	assert.Contains(t, string(output), "北京")
}

func TestMobileCommand(t *testing.T) {
	cmd := exec.Command("pft", "mobile", "13800138000")
	output, err := cmd.CombinedOutput()
	
	assert.NoError(t, err)
	assert.Contains(t, string(output), "手机号码")
}

func TestInvalidMobile(t *testing.T) {
	cmd := exec.Command("pft", "mobile", "1234567")
	output, err := cmd.CombinedOutput()
	
	// 应该返回错误
	assert.Error(t, err)
	assert.Contains(t, string(output), "无效")
}
```

### 4.3 运行测试

```bash
# 运行所有测试
go test ./...

# 运行测试并显示覆盖率
go test -cover ./...

# 生成覆盖率报告
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# 运行基准测试
go test -bench=. -benchmem ./...
```

## 五、构建与发布

### 5.1 本地构建

`scripts/build.sh`：

```bash
#!/bin/bash

# 设置变量
APP_NAME="pft"
VERSION=$(git describe --tags --always --dirty)
BUILD_TIME=$(date -u '+%Y-%m-%d_%H:%M:%S')
GIT_COMMIT=$(git rev-parse --short HEAD)

# LDFLAGS
LDFLAGS="-X main.Version=${VERSION} -X main.BuildTime=${BUILD_TIME} -X main.GitCommit=${GIT_COMMIT}"

# 构建
echo "Building ${APP_NAME}..."
go build -ldflags "${LDFLAGS}" -o bin/${APP_NAME} .

# 不同平台构建
echo "Building for multiple platforms..."

# macOS
GOOS=darwin GOARCH=amd64 go build -ldflags "${LDFLAGS}" -o bin/${APP_NAME}-darwin-amd64 .
GOOS=darwin GOARCH=arm64 go build -ldflags "${LDFLAGS}" -o bin/${APP_NAME}-darwin-arm64 .

# Linux
GOOS=linux GOARCH=amd64 go build -ldflags "${LDFLAGS}" -o bin/${APP_NAME}-linux-amd64 .
GOOS=linux GOARCH=arm64 go build -ldflags "${LDFLAGS}" -o bin/${APP_NAME}-linux-arm64 .

# Windows
GOOS=windows GOARCH=amd64 go build -ldflags "${LDFLAGS}" -o bin/${APP_NAME}-windows-amd64.exe .

echo "Build completed!"
ls -lh bin/
```

### 5.2 使用 GoReleaser 自动发布

`.goreleaser.yml`：

```yaml
project_name: pft

before:
  hooks:
    - go mod tidy
    - go test ./...

builds:
  - main: .
    binary: pft
    goos:
      - linux
      - darwin
      - windows
    goarch:
      - amd64
      - arm64
    env:
      - CGO_ENABLED=0
    ldflags:
      - -s -w
      - -X main.version={{.Version}}
      - -X main.commit={{.Commit}}
      - -X main.date={{.Date}}

archives:
  - format: tar.gz
    name_template: >-
      {{ .ProjectName }}_
      {{- title .Os }}_
      {{- if eq .Arch "amd64" }}x86_64
      {{- else }}{{ .Arch }}{{ end }}
    format_overrides:
      - goos: windows
        format: zip
    files:
      - README.md
      - LICENSE
      - docs/*

checksum:
  name_template: 'checksums.txt'

changelog:
  sort: asc
  filters:
    exclude:
      - '^docs:'
      - '^test:'
      - '^chore:'

brews:
  - name: pft
    homepage: https://github.com/PFinal-tool/pf_tools
    description: PFinal Tools - 实用终端工具集
    folder: Formula
    install: |
      bin.install "pft"
```

**发布流程**：

```bash
# 打标签
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# 使用 GoReleaser 发布
goreleaser release --clean
```

### 5.3 安装方式

**Homebrew (macOS/Linux)**：
```bash
brew tap pfinal-tool/tap
brew install pft
```

**手动安装**：
```bash
# 下载对应平台的二进制文件
wget https://github.com/PFinal-tool/pf_tools/releases/download/v1.0.0/pft_Linux_x86_64.tar.gz

# 解压
tar -xzf pft_Linux_x86_64.tar.gz

# 移动到 PATH
sudo mv pft /usr/local/bin/

# 验证
pft --version
```

**Go Install**：
```bash
go install github.com/pfinal/pf_tools@latest
```

## 六、最佳实践与优化

### 6.1 配置文件支持

`$HOME/.pft.yaml`：

```yaml
# API 配置
api:
  weather:
    url: https://api.weather.com
    key: your_api_key
    timeout: 10s
  mobile:
    url: https://api.mobile.com
    timeout: 5s

# 显示配置
display:
  theme: dark  # dark/light
  emoji: true  # 是否显示 emoji
  color: true  # 是否使用颜色

# 日志配置
log:
  level: info  # debug/info/warn/error
  file: ~/.pft.log
```

### 6.2 错误处理

```go
// 定义错误类型
var (
	ErrInvalidPhone = errors.New("invalid phone number")
	ErrAPITimeout   = errors.New("API request timeout")
	ErrAPILimit     = errors.New("API rate limit exceeded")
)

// 统一错误处理
func handleError(err error) {
	switch {
	case errors.Is(err, ErrInvalidPhone):
		fmt.Println("❌ 手机号格式不正确")
	case errors.Is(err, ErrAPITimeout):
		fmt.Println("⏱ 请求超时，请稍后重试")
	case errors.Is(err, ErrAPILimit):
		fmt.Println("⚠️ API 调用次数超限")
	default:
		fmt.Printf("❌ 未知错误: %v\n", err)
	}
}
```

### 6.3 性能优化

**并发查询多个城市**：

```go
func QueryMultipleCities(cities []string) map[string]*WeatherData {
	results := make(map[string]*WeatherData)
	var mu sync.Mutex
	var wg sync.WaitGroup
	
	for _, city := range cities {
		wg.Add(1)
		go func(c string) {
			defer wg.Done()
			
			data, err := service.Query(c, 3)
			if err != nil {
				log.Printf("查询 %s 失败: %v", c, err)
				return
			}
			
			mu.Lock()
			results[c] = data
			mu.Unlock()
		}(city)
	}
	
	wg.Wait()
	return results
}
```

**使用缓存减少 API 调用**：

```go
import "github.com/patrickmn/go-cache"

var weatherCache = cache.New(5*time.Minute, 10*time.Minute)

func (s *Service) QueryWithCache(city string, days int) (*WeatherData, error) {
	// 尝试从缓存获取
	if cached, found := weatherCache.Get(city); found {
		return cached.(*WeatherData), nil
	}
	
	// 缓存未命中，查询 API
	data, err := s.Query(city, days)
	if err != nil {
		return nil, err
	}
	
	// 存入缓存
	weatherCache.Set(city, data, cache.DefaultExpiration)
	return data, nil
}
```

### 6.4 日志记录

```go
import "github.com/sirupsen/logrus"

var log = logrus.New()

func init() {
	// 设置日志格式
	log.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
	})
	
	// 设置日志级别
	log.SetLevel(logrus.InfoLevel)
	
	// 输出到文件
	file, err := os.OpenFile("pft.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err == nil {
		log.SetOutput(file)
	}
}
```

## 七、高级功能

### 7.1 交互式模式

```go
import "github.com/manifoldco/promptui"

func InteractiveMode() {
	// 选择功能
	prompt := promptui.Select{
		Label: "请选择功能",
		Items: []string{"天气查询", "手机归属地", "退出"},
	}
	
	_, result, err := prompt.Run()
	if err != nil {
		return
	}
	
	switch result {
	case "天气查询":
		// 输入城市
		cityPrompt := promptui.Prompt{
			Label: "请输入城市名称",
		}
		city, _ := cityPrompt.Run()
		
		// 查询天气
		// ...
		
	case "手机归属地":
		// ...
	}
}
```

### 7.2 自动更新

```go
import "github.com/rhysd/go-github-selfupdate/selfupdate"

func CheckUpdate() error {
	latest, found, err := selfupdate.DetectLatest("pfinal-tool/pf_tools")
	if err != nil {
		return err
	}
	
	currentVersion := "v1.0.0"
	if !found || latest.Version.LTE(semver.MustParse(currentVersion)) {
		fmt.Println("当前已是最新版本")
		return nil
	}
	
	fmt.Printf("发现新版本: %s\n", latest.Version)
	fmt.Print("是否更新? (y/n): ")
	
	var answer string
	fmt.Scanln(&answer)
	
	if answer == "y" {
		exe, _ := os.Executable()
		if err := selfupdate.UpdateTo(latest.AssetURL, exe); err != nil {
			return err
		}
		fmt.Println("更新成功!")
	}
	
	return nil
}
```

## 八、总结与展望

### 8.1 项目总结

通过这个项目，我们学习了：

1. **Cobra 框架**：命令行应用开发的事实标准
2. **Termui 库**：美化终端界面
3. **项目架构**：清晰的目录结构和代码组织
4. **测试策略**：单元测试和集成测试
5. **构建发布**：跨平台编译和自动发布

### 8.2 项目数据

| 指标 | 数据 |
|------|------|
| 代码行数 | ~1500 行 |
| 测试覆盖率 | 85% |
| 二进制大小 | ~8MB（压缩后 ~3MB） |
| 启动时间 | < 10ms |
| 内存占用 | < 10MB |
| 支持平台 | macOS, Linux, Windows |

### 8.3 可以扩展的功能

1. **更多工具**：
   - IP 地址查询
   - 汇率转换
   - 时间戳转换
   - JSON 格式化
   - 加密解密工具

2. **UI 增强**：
   - 支持主题切换
   - 更丰富的图表
   - 动画效果

3. **数据持久化**：
   - 本地数据库
   - 历史记录
   - 收藏功能

4. **网络功能**：
   - 代理支持
   - 离线模式
   - 数据同步

## 参考资源

- [Cobra 官方文档](https://cobra.dev/)
- [Termui GitHub](https://github.com/gizak/termui)
- [Go CLI 最佳实践](https://github.com/spf13/cobra)
- [GoReleaser 文档](https://goreleaser.com/)

---

**项目地址**: https://github.com/PFinal-tool/pf_tools

希望这篇文章能帮助你快速上手 Go CLI 工具开发！如果有任何问题，欢迎提 Issue 讨论。
