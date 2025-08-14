---
title: Go CLI Utility Development Practice
date: 2023-11-09 17:22:37
tags:
    - golang
    - tools
author: PFinal南丞
keywords: Go CLI Utility, golang, tools, development, programming, terminal, weather query, mobile phone attribution query, cobra library, command-line utility, termui
description: A detailed guide to developing Go CLI utilities, focusing on building a weather query and mobile phone attribution tool using the Cobra library and enhancing the terminal UI with TermUI.
---

# Go CLI Utility Development Practice

## Preface

Inspired by a Rust-based terminal weather query tool, I explored creating a similar utility in Go. The result is a functional and visually appealing command-line tool.

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202311081716928.png)

Go's simplicity and rich ecosystem make it an excellent choice for building powerful CLI utilities.

## The Cobra Library

[Cobra](https://github.com/spf13/cobra) is the de facto standard library for creating powerful modern CLI applications in Go. It's used by major projects like Kubernetes, Hugo, and etcd. Cobra provides a simple interface to create commands, subcommands, and flags.

### Installation

To get the Cobra CLI tool for scaffolding projects:

```shell
go install github.com/spf13/cobra-cli@latest
```

> **Note**: After installation, ensure the command is available in your `PATH` (often `go/bin`).

### Usage: Initializing a Project

Create a new project directory and initialize it with Cobra:

```shell
mkdir pf_tools && cd pf_tools
cobra-cli init
```

This generates a basic project structure:

```
├── LICENSE
├── README.md
├── cmd
│   └── root.go
├── go.mod
├── go.sum
├── main.go
└── pkg (renamed from 'pak' for convention)
    ├── mobile.go
    └── weather.go
```

**Explanation of Generated Files:**

- **`main.go`**: The entry point of the application. It typically just calls `cmd.Execute()`.
- **`cmd/root.go`**: Defines the root command of your CLI application.
- **`pkg/`**: A directory for your application's core logic (using `pkg` is a common Go convention).

**Anatomy of `cmd/root.go`:**

```go
package cmd

import (
    "fmt"
    "os"
    "github.com/spf13/cobra"
    // Add your application's package imports here, e.g.:
    // "pf_tools/pkg"
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
    Use:   "pf_tools", // The name of the executable
    Short: "A brief description of your application",
    Long: `A longer description that spans multiple lines and likely contains
examples and usage of using your application.`,
    // Uncomment the following line if your root command doesn't require any arguments
    // Args: cobra.NoArgs,
    Run: func(cmd *cobra.Command, args []string) {
        // This is where the logic for the root command (if it does anything by itself) goes.
        // Often, the root command just displays help if no subcommand is given.
        fmt.Println("Welcome to pf_tools!")
        // _ = cmd.Help() // Uncomment to show help by default
    },
}

// Execute adds all child commands to the root command and sets flags appropriately.
// This is called by main.main(). It only needs to happen once to the rootCmd.
func Execute() {
    err := rootCmd.Execute()
    if err != nil {
        os.Exit(1)
    }
}

func init() {
    // Here you will define your flags and configuration settings.
    // Cobra supports persistent flags, which, if defined here, will be global for your application.
    // rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is $HOME/.pf_tools.yaml)")

    // Cobra also supports local flags, which will only run when this action is called directly.
    // rootCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
}
```

**Key `cobra.Command` Properties:**

- **`Use`**: The command name as it appears in the CLI (e.g., `myapp start`).
- **`Short`**: A brief description for the command, used in help output.
- **`Long`**: A more detailed description.
- **`Run`**: The function executed when the command is called.
- **`Args`**: A function to validate the number and nature of arguments.

### Adding Subcommands

For utilities with multiple functions, subcommands are essential.

Add a new subcommand for mobile phone attribution lookup:

```shell
cobra-cli add pf_m
```

This creates `cmd/pf_m.go`:

```go
package cmd

import (
    "fmt"
    "github.com/spf13/cobra"
)

// pfMCmd represents the pf_m command
var pfMCmd = &cobra.Command{
    Use:   "pf_m",
    Short: "A brief description of your command",
    Long: `A longer description that spans multiple lines and likely contains examples
and usage of your command.`,
    Run: func(cmd *cobra.Command, args []string) {
        fmt.Println("pf_m called")
        // Implement the mobile query logic here
        // Example:
        // if len(args) < 1 {
        //     fmt.Println("Please provide a phone number")
        //     return
        // }
        // number := args[0]
        // result := pkg.QueryMobile(number)
        // fmt.Println(result)
    },
}

func init() {
    rootCmd.AddCommand(pfMCmd)

    // Here you can define local flags for the pf_m command.
    // pfMCmd.Flags().StringP("format", "f", "json", "Output format")
}
```

Similarly, add a subcommand for weather:

```shell
cobra-cli add pf_wt
```

**Registering Subcommands:**

Each new subcommand file (e.g., `pf_m.go`, `pf_wt.go`) must register itself with the root command in its `init` function:

```go
func init() {
    rootCmd.AddCommand(pfMCmd) // This line is crucial
    // Add local flags if needed
}
```

---

## The TermUI Library

To create a more engaging user experience, [TermUI](https://github.com/gizak/termui/v3) is an excellent choice. It provides a set of widgets (lists, tables, graphs) to build dynamic terminal dashboards.

### Installation

With Go modules, installation is straightforward:

```shell
go get github.com/gizak/termui/v3
```

Import the necessary packages in your command files:

```go
import (
    ui "github.com/gizak/termui/v3"
    "github.com/gizak/termui/v3/widgets"
)
```

Then run `go mod tidy` to update `go.mod` and `go.sum`.

### Implementing UI Layouts

#### Weather Query with Table Widget

Here's how to use the `Table` widget for displaying weather data:

```go
// In cmd/pf_wt.go Run function
func runWeatherCmd(cmd *cobra.Command, args []string) {
    // ... logic to fetch weather data into a struct, e.g., weatherData ...
    
    if err := ui.Init(); err != nil {
        log.Fatalf("failed to initialize termui: %v", err)
    }
    defer ui.Close()

    table := widgets.NewTable()
    table.Title = weatherData.City + " Weather Forecast"
    table.BorderStyle = ui.NewStyle(ui.ColorBlue)
    
    // Populate rows
    table.Rows = [][]string{
        {"Date", "Condition", "High (°C)", "Low (°C)"},
    }
    for _, day := range weatherData.Forecast {
        table.Rows = append(table.Rows, []string{day.Date, day.Condition, day.High, day.Low})
    }

    table.TextStyle = ui.NewStyle(ui.ColorWhite)
    table.TitleStyle = ui.NewStyle(ui.ColorWhite, ui.ColorBlue, ui.ModifierBold)
    // Set the dimensions (x, y, width, height)
    table.SetRect(0, 0, 50, 10)

    ui.Render(table)

    // Event loop to keep the UI running until 'q' or Ctrl+C is pressed
    uiEvents := ui.PollEvents()
    for {
        e := <-uiEvents
        switch e.ID {
        case "q", "<C-c>":
            return // Exit the command
        }
    }
}
```

#### Mobile Query with List Widget

Using the `List` widget for mobile information:

```go
// In cmd/pf_m.go Run function
func runMobileCmd(cmd *cobra.Command, args []string) {
    if len(args) < 1 {
        fmt.Println("Please provide a phone number")
        return
    }
    number := args[0]
    // ... logic to fetch mobile data into a struct, e.g., mobileInfo ...

    if err := ui.Init(); err != nil {
        log.Fatalf("failed to initialize termui: %v", err)
    }
    defer ui.Close()

    l := widgets.NewList()
    l.Title = "Mobile Number Information"
    l.Rows = []string{
        fmt.Sprintf("[0] Number: %s", mobileInfo.Number),
        fmt.Sprintf("[1] Carrier: %s", mobileInfo.Carrier),
        fmt.Sprintf("[2] Province: %s", mobileInfo.Province),
        fmt.Sprintf("[3] City: %s", mobileInfo.City),
        fmt.Sprintf("[4] Zip Code: %s", mobileInfo.ZipCode),
    }
    l.TextStyle = ui.NewStyle(ui.ColorGreen)
    l.TitleStyle = ui.NewStyle(ui.ColorWhite, ui.ColorGreen, ui.ModifierBold)
    l.WrapText = false
    // Set the dimensions
    l.SetRect(0, 0, 40, 8)

    ui.Render(l)

    uiEvents := ui.PollEvents()
    for {
        e := <-uiEvents
        switch e.ID {
        case "q", "<C-c>":
            return
        }
    }
}
```

**Tips for TermUI:**

- Always call `ui.Init()` at the start and `defer ui.Close()` to clean up.
- Use `ui.Render(widget)` to display a widget.
- Implement an event loop (`ui.PollEvents()`) to keep the UI responsive and allow exit.
- Experiment with `Style` properties (color, modifier) to customize appearance.
- Set widget dimensions with `SetRect(x, y, width, height)`.

---

## Core Logic Implementation

The `pkg` directory houses the core business logic, separate from the CLI framework.

**Example `pkg/weather.go`:**

```go
package pkg

import (
    "encoding/json"
    "fmt"
    "net/http"
    // Consider using a more robust HTTP client library if needed
)

type WeatherData struct {
    City     string `json:"city"`
    Forecast []Day  `json:"forecast"`
}

type Day struct {
    Date      string `json:"date"`
    Condition string `json:"condition"`
    High      string `json:"high"`
    Low       string `json:"low"`
}

// FetchWeather fetches weather data for a given city (example using a mock API call).
func FetchWeather(city string) (*WeatherData, error) {
    // In a real application, you would call an actual weather API here.
    // This is a placeholder.
    url := fmt.Sprintf("https://api.example.com/weather?city=%s", city)
    resp, err := http.Get(url)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("API request failed with status: %d", resp.StatusCode)
    }

    var data WeatherData
    if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
        return nil, err
    }
    return &data, nil
}
```

**Example `pkg/mobile.go`:**

```go
package pkg

import (
    "regexp"
    "fmt"
)

type MobileInfo struct {
    Number   string
    Carrier  string
    Province string
    City     string
    ZipCode  string
}

// IsValidNumber checks if the phone number format is valid.
func IsValidNumber(number string) bool {
    matched, _ := regexp.MatchString(`^1[3-9]\d{9}$`, number)
    return matched
}

// QueryMobile queries the attribution information for a phone number.
func QueryMobile(number string) (*MobileInfo, error) {
    if !IsValidNumber(number) {
        return nil, fmt.Errorf("invalid phone number format")
    }
    // In a real application, you would query a database or an API.
    // This is a mock implementation.
    info := &MobileInfo{
        Number:   number,
        Carrier:  "China Mobile", // Mock data
        Province: "Beijing",      // Mock data
        City:     "Beijing",      // Mock data
        ZipCode:  "100000",       // Mock data
    }
    return info, nil
}
```

---

## Code Address

The complete source code for this project can be found at:

[https://github.com/PFinal-tool/pf_tools](https://github.com/PFinal-tool/pf_tools)

---

## Conclusion

Building CLI utilities in Go with Cobra and enhancing them with TermUI is a powerful way to create developer tools. Cobra simplifies command structure and argument parsing, while TermUI adds a professional touch to the terminal interface. This guide provided a walkthrough of setting up the project, adding commands, and implementing a basic UI, laying the groundwork for more complex and feature-rich CLI applications.

Have fun building your own Go-powered tools!