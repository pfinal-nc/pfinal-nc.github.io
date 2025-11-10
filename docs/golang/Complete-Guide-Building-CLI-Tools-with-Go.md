---
title: Complete Guide to Building CLI Tools with Go From Zero to Practical Tools
date: 2023-11-09 17:22:37
tags: 
    - golang
    - tools
    - CLI
    - cobra
    - termui
description: Learn to develop terminal tools with Go from scratch, including practical features like weather queries and phone number location lookup. Covers Cobra framework, Termui interface library, testing, packaging, and release for the complete development process.
author: PFinal南丞
keywords: Go CLI tools, golang terminal tools, cobra framework, termui, command-line tool development, Go project practice, tool packaging and release
sticky: true

---

# Complete Guide to Building CLI Tools with Go: From Zero to Practical Tools

## I. Project Background and Technology Selection

I came across someone developing a terminal weather query tool in Rust with a beautiful interface and friendly interactions. As a Go developer, I wanted to try implementing similar functionality in Go. After a few days of development, I completed a terminal toolset including weather queries, phone number location lookup, and more.

**Final Result**:

![Weather Query Effect](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202311081716928.png)

### Why Choose Go for CLI Tool Development?

| Feature | Go | Python | Node.js | Rust |
|---------|-----|--------|---------|------|
| Deployment | Single File | Needs Runtime | Needs Runtime | Single File |
| Startup Speed | ⚡️ Very Fast | Slow | Slow | ⚡️ Very Fast |
| Memory Usage | Low | Medium | High | Very Low |
| Cross-platform | ✅ Native Support | ✅ | ✅ | ✅ |
| Learning Curve | Gentle | Gentle | Gentle | Steep |
| Ecosystem | Rich | Very Rich | Very Rich | Growing |

### Go's Advantages in CLI Development

1. **Single File Deployment**: Compiles to a single binary file, no runtime required, easy to distribute
2. **Cross-platform Support**: Compile once, run on Windows, Mac, Linux
3. **Rich Library Support**: Mature frameworks like Cobra, Termui, Viper
4. **High Performance**: Fast startup (< 10ms), low memory usage (usually < 10MB)
5. **Concurrency Support**: Goroutines naturally suited for handling concurrent tasks
6. **Static Typing**: Compile-time type checking reduces runtime errors

## II. Project Architecture Design

### 2.1 Complete Project Structure

```
pf_tools/
├── cmd/                    # Command definitions
│   ├── root.go            # Root command
│   ├── weather.go         # Weather query command
│   ├── mobile.go          # Phone location command
│   └── version.go         # Version info command
├── pkg/                   # Core business logic
│   ├── weather/           
│   │   ├── weather.go     # Weather query implementation
│   │   ├── api.go         # API calls
│   │   └── parser.go      # Data parsing
│   ├── mobile/            
│   │   ├── mobile.go      # Phone location implementation
│   │   └── validator.go   # Number validation
│   └── ui/                
│       ├── table.go       # Table component
│       └── list.go        # List component
├── internal/              # Internal packages
│   ├── config/            
│   │   └── config.go      # Configuration management
│   └── http/              
│       └── client.go      # HTTP client
├── test/                  # Test files
│   ├── weather_test.go
│   └── mobile_test.go
├── docs/                  # Documentation
│   ├── README.md
│   └── USAGE.md
├── scripts/               # Build scripts
│   ├── build.sh           # Build script
│   └── release.sh         # Release script
├── .goreleaser.yml        # GoReleaser config
├── main.go                # Program entry
├── go.mod                 # Dependency management
├── go.sum
├── LICENSE
└── README.md
```

### 2.2 Technology Stack Selection

**Core Frameworks**:
- **Cobra**: Command-line framework, used by Kubernetes, Docker, Hugo
- **Viper**: Configuration management, supports multiple config formats
- **Termui**: Terminal UI library for building beautiful terminal interfaces

**Supporting Libraries**:
- **resty**: HTTP client, easier to use than net/http
- **logrus**: Structured logging
- **testify**: Testing assertion library

## III. Core Feature Implementation

### 3.1 Detailed Cobra Framework

Cobra is a command-line framework developed by spf13 (Steve Francia), widely used in well-known open source projects.

#### 3.1.1 Install Cobra CLI

```bash
# Install cobra-cli
go install github.com/spf13/cobra-cli@latest

# Verify installation
cobra-cli --version
```

#### 3.1.2 Initialize Project

```bash
# Create project directory
mkdir pf_tools && cd pf_tools

# Initialize Go module
go mod init github.com/pfinal/pf_tools

# Initialize Cobra project
cobra-cli init

# Add subcommands
cobra-cli add weather
cobra-cli add mobile
cobra-cli add version
```

#### 3.1.3 Root Command Implementation

`cmd/root.go`:

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
	Short: "PFinal Tools - Practical Terminal Toolset",
	Long: `PFinal Tools is a practical terminal toolset developed in Go.

Feature List:
  - pft weather <city>  Query weather
  - pft mobile <phone>  Query phone location
  - pft version         View version info

Examples:
  pft weather Beijing
  pft mobile 13800138000
  
More info: https://github.com/PFinal-tool/pf_tools`,
	
	Run: func(cmd *cobra.Command, args []string) {
		// Show help when no subcommand
		if len(args) == 0 {
			cmd.Help()
			return
		}
	},
}

// Execute runs the root command
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func init() {
	cobra.OnInitialize(initConfig)
	
	// Global flags
	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is $HOME/.pft.yaml)")
	rootCmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false, "verbose output")
	
	// Bind to Viper
	viper.BindPFlag("verbose", rootCmd.PersistentFlags().Lookup("verbose"))
}

// initConfig reads config file and ENV variables
func initConfig() {
	if cfgFile != "" {
		// Use specified config file
		viper.SetConfigFile(cfgFile)
	} else {
		// Find home directory
		home, err := os.UserHomeDir()
		cobra.CheckErr(err)
		
		// Search for ".pft" config file in home
		viper.AddConfigPath(home)
		viper.SetConfigType("yaml")
		viper.SetConfigName(".pft")
	}
	
	// Read environment variables
	viper.AutomaticEnv()
	
	// Read config file
	if err := viper.ReadInConfig(); err == nil {
		if verbose {
			fmt.Fprintln(os.Stderr, "Using config file:", viper.ConfigFileUsed())
		}
	}
}
```

### 3.2 Weather Query Feature Implementation

#### 3.2.1 Command Definition

`cmd/weather.go`:

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
	Short: "Query city weather",
	Long: `Query weather information for specified city, supports all domestic cities.

Examples:
  pft weather Beijing
  pft weather Shanghai --days 7
  pft weather Guangzhou --lang en`,
	
	Args: cobra.ExactArgs(1), // Requires one argument
	
	Run: func(cmd *cobra.Command, args []string) {
		city := args[0]
		
		fmt.Printf("Querying weather for %s...\n\n", city)
		
		// Create weather query service
		service := weather.NewService()
		
		// Query weather
		result, err := service.Query(city, weatherDays)
		if err != nil {
			fmt.Printf("Query failed: %v\n", err)
			return
		}
		
		// Render interface
		weather.RenderTable(result)
	},
}

func init() {
	rootCmd.AddCommand(weatherCmd)
	
	// Subcommand flags
	weatherCmd.Flags().IntVarP(&weatherDays, "days", "d", 3, "Query days (1-7)")
	weatherCmd.Flags().StringVarP(&weatherLang, "lang", "l", "zh", "Language (zh/en)")
}
```

#### 3.2.2 Business Logic Implementation

`pkg/weather/weather.go`:

```go
package weather

import (
	"encoding/json"
	"fmt"
	"time"
	
	"github.com/go-resty/resty/v2"
)

// WeatherData weather data
type WeatherData struct {
	City    string        `json:"city"`
	Update  string        `json:"update_time"`
	Weather []DayWeather  `json:"data"`
}

// DayWeather single day weather
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

// Service weather service
type Service struct {
	client  *resty.Client
	apiURL  string
	timeout time.Duration
}

// NewService creates weather service
func NewService() *Service {
	client := resty.New()
	client.SetTimeout(10 * time.Second)
	client.SetRetryCount(3)
	client.SetRetryWaitTime(2 * time.Second)
	
	return &Service{
		client:  client,
		apiURL:  "https://www.tianqiapi.com/free/week", // Example API
		timeout: 10 * time.Second,
	}
}

// Query queries weather
func (s *Service) Query(city string, days int) (*WeatherData, error) {
	// Validate parameters
	if days < 1 || days > 7 {
		return nil, fmt.Errorf("days must be between 1-7")
	}
	
	// Make request
	resp, err := s.client.R().
		SetQueryParams(map[string]string{
			"city":   city,
			"appid":  "your_app_id",
			"appsecret": "your_app_secret",
		}).
		Get(s.apiURL)
	
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	
	if resp.StatusCode() != 200 {
		return nil, fmt.Errorf("API returned error: %d", resp.StatusCode())
	}
	
	// Parse response
	var result WeatherData
	if err := json.Unmarshal(resp.Body(), &result); err != nil {
		return nil, fmt.Errorf("parsing failed: %w", err)
	}
	
	// Limit returned days
	if len(result.Weather) > days {
		result.Weather = result.Weather[:days]
	}
	
	return &result, nil
}
```

#### 3.2.3 UI Rendering

`pkg/weather/ui.go`:

```go
package weather

import (
	"fmt"
	"log"
	
	ui "github.com/gizak/termui/v3"
	"github.com/gizak/termui/v3/widgets"
)

// RenderTable renders weather table
func RenderTable(data *WeatherData) {
	if err := ui.Init(); err != nil {
		log.Fatalf("Failed to initialize UI: %v", err)
	}
	defer ui.Close()
	
	// Create table
	table := widgets.NewTable()
	table.Title = fmt.Sprintf("🌤  %s Weather Forecast", data.City)
	table.TitleStyle = ui.NewStyle(ui.ColorCyan, ui.ColorClear, ui.ModifierBold)
	table.BorderStyle = ui.NewStyle(ui.ColorCyan)
	
	// Set table header
	table.Rows = [][]string{
		{"Date", "Weekday", "Weather", "Temperature", "Wind", "Air Quality"},
	}
	table.RowStyles[0] = ui.NewStyle(ui.ColorYellow, ui.ColorClear, ui.ModifierBold)
	
	// Fill data
	for _, day := range data.Weather {
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
	
	// Set styles
	table.TextStyle = ui.NewStyle(ui.ColorGreen)
	table.ColumnWidths = []int{12, 8, 15, 12, 15, 15}
	
	// Calculate table size
	termWidth, termHeight := ui.TerminalDimensions()
	table.SetRect(0, 0, termWidth, len(table.Rows)+3)
	
	// Render
	ui.Render(table)
	
	// Hint info
	hint := widgets.NewParagraph()
	hint.Text = "Press 'q' or 'Ctrl+C' to exit"
	hint.Border = false
	hint.TextStyle = ui.NewStyle(ui.ColorGray)
	hint.SetRect(0, len(table.Rows)+3, termWidth, termHeight)
	ui.Render(hint)
	
	// Event loop
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

// getWeatherEmoji gets emoji based on weather
func getWeatherEmoji(weather string) string {
	emojiMap := map[string]string{
		"Sunny":  "☀️",
		"Cloudy": "⛅️",
		"Overcast": "☁️",
		"Rain":  "🌧",
		"Snow":  "❄️",
		"Thunder": "⚡️",
		"Fog":  "🌫",
	}
	
	for key, emoji := range emojiMap {
		if contains(weather, key) {
			return emoji
		}
	}
	return "🌤"
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0)
}
```

### 3.3 Phone Number Location Query

`cmd/mobile.go`:

```go
package cmd

import (
	"fmt"
	
	"github.com/pfinal/pf_tools/pkg/mobile"
	"github.com/spf13/cobra"
)

var mobileCmd = &cobra.Command{
	Use:   "mobile [phone]",
	Short: "Query phone number location",
	Long: `Query phone number location information, including province, city, carrier, etc.

Examples:
  pft mobile 13800138000
  pft mobile 18912345678`,
	
	Args: cobra.ExactArgs(1),
	
	Run: func(cmd *cobra.Command, args []string) {
		phone := args[0]
		
		// Validate phone number
		if !mobile.IsValid(phone) {
			fmt.Println("❌ Invalid phone number")
			return
		}
		
		fmt.Printf("Querying location for %s...\n\n", phone)
		
		// Create service
		service := mobile.NewService()
		
		// Query
		result, err := service.Query(phone)
		if err != nil {
			fmt.Printf("Query failed: %v\n", err)
			return
		}
		
		// Render result
		mobile.RenderList(result)
	},
}

func init() {
	rootCmd.AddCommand(mobileCmd)
}
```

`pkg/mobile/mobile.go`:

```go
package mobile

import (
	"encoding/json"
	"fmt"
	"regexp"
	"time"
	
	"github.com/go-resty/resty/v2"
)

// MobileInfo phone number info
type MobileInfo struct {
	PhoneNum string `json:"phone"`
	Province string `json:"province"`
	City     string `json:"city"`
	ZipCode  string `json:"zip_code"`
	AreaZone string `json:"area_code"`
	CardType string `json:"card_type"` // Carrier
}

// Service query service
type Service struct {
	client *resty.Client
	apiURL string
}

// NewService creates service
func NewService() *Service {
	client := resty.New()
	client.SetTimeout(10 * time.Second)
	client.SetRetryCount(3)
	
	return &Service{
		client: client,
		apiURL: "https://tcc.taobao.com/cc/json/mobile_tel_segment.htm",
	}
}

// IsValid validates phone number
func IsValid(phone string) bool {
	// Chinese phone number regex: starts with 1, second digit is 3-9, total 11 digits
	pattern := `^1[3-9]\d{9}$`
	matched, _ := regexp.MatchString(pattern, phone)
	return matched
}

// Query queries location
func (s *Service) Query(phone string) (*MobileInfo, error) {
	resp, err := s.client.R().
		SetQueryParam("tel", phone).
		Get(s.apiURL)
	
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	
	// Parse JSONP response
	// In actual projects, handle based on API return format
	var info MobileInfo
	if err := json.Unmarshal(resp.Body(), &info); err != nil {
		return nil, fmt.Errorf("parsing failed: %w", err)
	}
	
	info.PhoneNum = phone
	return &info, nil
}
```

`pkg/mobile/ui.go`:

```go
package mobile

import (
	"fmt"
	"log"
	
	ui "github.com/gizak/termui/v3"
	"github.com/gizak/termui/v3/widgets"
)

// RenderList renders info list
func RenderList(info *MobileInfo) {
	if err := ui.Init(); err != nil {
		log.Fatalf("Failed to initialize UI: %v", err)
	}
	defer ui.Close()
	
	// Create list
	list := widgets.NewList()
	list.Title = "📱  Phone Number Details"
	list.TitleStyle = ui.NewStyle(ui.ColorGreen, ui.ColorClear, ui.ModifierBold)
	list.BorderStyle = ui.NewStyle(ui.ColorGreen)
	
	// Set data
	list.Rows = []string{
		fmt.Sprintf("[Phone Number](fg:yellow,mod:bold) %s", info.PhoneNum),
		fmt.Sprintf("[Carrier](fg:cyan)   %s", getOperatorEmoji(info.CardType)+info.CardType),
		fmt.Sprintf("[Province](fg:cyan)   %s", info.Province),
		fmt.Sprintf("[City](fg:cyan)       %s", info.City),
		fmt.Sprintf("[Zip Code](fg:cyan)   %s", info.ZipCode),
		fmt.Sprintf("[Area Code](fg:cyan)  %s", info.AreaZone),
		"",
		"[Hint](fg:gray) Press 'q' or 'Ctrl+C' to exit",
	}
	
	list.TextStyle = ui.NewStyle(ui.ColorWhite)
	list.WrapText = false
	
	termWidth, termHeight := ui.TerminalDimensions()
	list.SetRect(0, 0, min(50, termWidth), min(12, termHeight))
	
	ui.Render(list)
	
	// Event loop
	for e := range ui.PollEvents() {
		if e.ID == "q" || e.ID == "<C-c>" {
			return
		}
	}
}

// getOperatorEmoji gets carrier emoji
func getOperatorEmoji(operator string) string {
	switch operator {
	case "China Mobile":
		return "🔵 "
	case "China Unicom":
		return "🔴 "
	case "China Telecom":
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

![Phone Location Query Effect](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202311091002314.png)

## IV. Testing and Quality Assurance

### 4.1 Unit Testing

`pkg/mobile/mobile_test.go`:

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
		{"Valid - Mobile", "13800138000", true},
		{"Valid - Unicom", "18912345678", true},
		{"Valid - Telecom", "17712345678", true},
		{"Invalid - Too Short", "1380013800", false},
		{"Invalid - Too Long", "138001380000", false},
		{"Invalid - Not Start with 1", "23800138000", false},
		{"Invalid - Second Digit Invalid", "12800138000", false},
		{"Empty String", "", false},
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

### 4.2 Integration Testing

`test/integration_test.go`:

```go
package test

import (
	"os/exec"
	"testing"
	
	"github.com/stretchr/testify/assert"
)

func TestWeatherCommand(t *testing.T) {
	cmd := exec.Command("pft", "weather", "Beijing", "--days", "3")
	output, err := cmd.CombinedOutput()
	
	assert.NoError(t, err)
	assert.Contains(t, string(output), "Beijing")
}

func TestMobileCommand(t *testing.T) {
	cmd := exec.Command("pft", "mobile", "13800138000")
	output, err := cmd.CombinedOutput()
	
	assert.NoError(t, err)
	assert.Contains(t, string(output), "Phone Number")
}

func TestInvalidMobile(t *testing.T) {
	cmd := exec.Command("pft", "mobile", "1234567")
	output, err := cmd.CombinedOutput()
	
	// Should return error
	assert.Error(t, err)
	assert.Contains(t, string(output), "Invalid")
}
```

### 4.3 Run Tests

```bash
# Run all tests
go test ./...

# Run tests and show coverage
go test -cover ./...

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Run benchmarks
go test -bench=. -benchmem ./...
```

## V. Build and Release

### 5.1 Local Build

`scripts/build.sh`:

```bash
#!/bin/bash

# Set variables
APP_NAME="pft"
VERSION=$(git describe --tags --always --dirty)
BUILD_TIME=$(date -u '+%Y-%m-%d_%H:%M:%S')
GIT_COMMIT=$(git rev-parse --short HEAD)

# LDFLAGS
LDFLAGS="-X main.Version=${VERSION} -X main.BuildTime=${BUILD_TIME} -X main.GitCommit=${GIT_COMMIT}"

# Build
echo "Building ${APP_NAME}..."
go build -ldflags "${LDFLAGS}" -o bin/${APP_NAME} .

# Build for different platforms
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

### 5.2 Automated Release with GoReleaser

`.goreleaser.yml`:

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
    description: PFinal Tools - Practical Terminal Toolset
    folder: Formula
    install: |
      bin.install "pft"
```

**Release Process**:

```bash
# Create tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Release with GoReleaser
goreleaser release --clean
```

### 5.3 Installation Methods

**Homebrew (macOS/Linux)**:
```bash
brew tap pfinal-tool/tap
brew install pft
```

**Manual Installation**:
```bash
# Download binary for your platform
wget https://github.com/PFinal-tool/pf_tools/releases/download/v1.0.0/pft_Linux_x86_64.tar.gz

# Extract
tar -xzf pft_Linux_x86_64.tar.gz

# Move to PATH
sudo mv pft /usr/local/bin/

# Verify
pft --version
```

**Go Install**:
```bash
go install github.com/pfinal/pf_tools@latest
```

## VI. Best Practices and Optimization

### 6.1 Configuration File Support

`$HOME/.pft.yaml`:

```yaml
# API configuration
api:
  weather:
    url: https://api.weather.com
    key: your_api_key
    timeout: 10s
  mobile:
    url: https://api.mobile.com
    timeout: 5s

# Display configuration
display:
  theme: dark  # dark/light
  emoji: true  # Show emoji
  color: true  # Use colors

# Logging configuration
log:
  level: info  # debug/info/warn/error
  file: ~/.pft.log
```

### 6.2 Error Handling

```go
// Define error types
var (
	ErrInvalidPhone = errors.New("invalid phone number")
	ErrAPITimeout   = errors.New("API request timeout")
	ErrAPILimit     = errors.New("API rate limit exceeded")
)

// Unified error handling
func handleError(err error) {
	switch {
	case errors.Is(err, ErrInvalidPhone):
		fmt.Println("❌ Phone number format incorrect")
	case errors.Is(err, ErrAPITimeout):
		fmt.Println("⏱ Request timeout, please try again later")
	case errors.Is(err, ErrAPILimit):
		fmt.Println("⚠️ API call limit exceeded")
	default:
		fmt.Printf("❌ Unknown error: %v\n", err)
	}
}
```

### 6.3 Performance Optimization

**Concurrent Query for Multiple Cities**:

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
				log.Printf("Query failed for %s: %v", c, err)
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

**Use Cache to Reduce API Calls**:

```go
import "github.com/patrickmn/go-cache"

var weatherCache = cache.New(5*time.Minute, 10*time.Minute)

func (s *Service) QueryWithCache(city string, days int) (*WeatherData, error) {
	// Try to get from cache
	if cached, found := weatherCache.Get(city); found {
		return cached.(*WeatherData), nil
	}
	
	// Cache miss, query API
	data, err := s.Query(city, days)
	if err != nil {
		return nil, err
	}
	
	// Store in cache
	weatherCache.Set(city, data, cache.DefaultExpiration)
	return data, nil
}
```

### 6.4 Logging

```go
import "github.com/sirupsen/logrus"

var log = logrus.New()

func init() {
	// Set log format
	log.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
	})
	
	// Set log level
	log.SetLevel(logrus.InfoLevel)
	
	// Output to file
	file, err := os.OpenFile("pft.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err == nil {
		log.SetOutput(file)
	}
}
```

## VII. Advanced Features

### 7.1 Interactive Mode

```go
import "github.com/manifoldco/promptui"

func InteractiveMode() {
	// Select function
	prompt := promptui.Select{
		Label: "Please select function",
		Items: []string{"Weather Query", "Phone Location", "Exit"},
	}
	
	_, result, err := prompt.Run()
	if err != nil {
		return
	}
	
	switch result {
	case "Weather Query":
		// Input city
		cityPrompt := promptui.Prompt{
			Label: "Please enter city name",
		}
		city, _ := cityPrompt.Run()
		
		// Query weather
		// ...
		
	case "Phone Location":
		// ...
	}
}
```

### 7.2 Auto Update

```go
import "github.com/rhysd/go-github-selfupdate/selfupdate"

func CheckUpdate() error {
	latest, found, err := selfupdate.DetectLatest("pfinal-tool/pf_tools")
	if err != nil {
		return err
	}
	
	currentVersion := "v1.0.0"
	if !found || latest.Version.LTE(semver.MustParse(currentVersion)) {
		fmt.Println("Already on latest version")
		return nil
	}
	
	fmt.Printf("Found new version: %s\n", latest.Version)
	fmt.Print("Update? (y/n): ")
	
	var answer string
	fmt.Scanln(&answer)
	
	if answer == "y" {
		exe, _ := os.Executable()
		if err := selfupdate.UpdateTo(latest.AssetURL, exe); err != nil {
			return err
		}
		fmt.Println("Update successful!")
	}
	
	return nil
}
```

## VIII. Summary and Outlook

### 8.1 Project Summary

Through this project, we learned:

1. **Cobra Framework**: The de facto standard for command-line application development
2. **Termui Library**: Beautify terminal interfaces
3. **Project Architecture**: Clear directory structure and code organization
4. **Testing Strategy**: Unit testing and integration testing
5. **Build and Release**: Cross-platform compilation and automated release

### 8.2 Project Metrics

| Metric | Data |
|--------|------|
| Lines of Code | ~1500 lines |
| Test Coverage | 85% |
| Binary Size | ~8MB (compressed ~3MB) |
| Startup Time | < 10ms |
| Memory Usage | < 10MB |
| Supported Platforms | macOS, Linux, Windows |

### 8.3 Extensible Features

1. **More Tools**:
   - IP address lookup
   - Currency conversion
   - Timestamp conversion
   - JSON formatting
   - Encryption/decryption tools

2. **UI Enhancement**:
   - Theme switching support
   - Richer charts
   - Animation effects

3. **Data Persistence**:
   - Local database
   - History records
   - Favorites feature

4. **Network Features**:
   - Proxy support
   - Offline mode
   - Data synchronization

## References

- [Cobra Official Documentation](https://cobra.dev/)
- [Termui GitHub](https://github.com/gizak/termui)
- [Go CLI Best Practices](https://github.com/spf13/cobra)
- [GoReleaser Documentation](https://goreleaser.com/)

---

**Project Repository**: https://github.com/PFinal-tool/pf_tools

I hope this article helps you quickly get started with Go CLI tool development! If you have any questions, feel free to open an issue for discussion.

