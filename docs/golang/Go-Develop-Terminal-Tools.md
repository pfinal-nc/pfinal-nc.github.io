---
title: Building Terminal Tools with Go
date: 2023-11-09 17:22:37
tags:
  - golang
  - tools
description: A comprehensive guide to developing terminal utilities with Golang, featuring weather and mobile number lookup tools, and leveraging the Cobra library for CLI development.
author: PFinal南丞
keywords: Go terminal tools, golang, CLI, development, programming, terminal, weather query, mobile lookup, cobra, command-line
sticky: true

---

# Building Terminal Tools with Go

## Introduction

While browsing documentation, I noticed someone had built a terminal weather query tool in Rust. Inspired by this, I decided to create a similar command-line utility using Golang. The result? A powerful, flexible CLI tool that’s both fun and practical:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202311081716928.png)

Golang makes building such tools a breeze, thanks to its rich ecosystem and robust libraries.

## The Cobra Library: Your CLI Foundation

[Cobra](https://github.com/spf13/cobra) is a popular library for building command-line applications in Go. It provides both a powerful API and a scaffolding tool to quickly bootstrap CLI projects. Many renowned open-source projects, including Kubernetes, Hugo, and etcd, rely on Cobra for their CLI interfaces.

### Installation

```shell
go get github.com/spf13/cobra/cobra
```

> **Tip:** After installation, check your **go/bin/** directory to ensure the command is available.

### Getting Started

Create a new project folder named **pf_tools**, then initialize your CLI project:

```shell
cobra-cli init
```

This sets up a project structure like this:

```
├── LICENSE
├── README.md
├── cmd
│   ├── pfM.go
│   ├── pfWt.go
│   └── root.go
├── go.mod
├── go.sum
├── main.go
└── pak
    ├── mobile.go
    └── weather.go
```

By default, the `cmd` directory contains `root.go`, which serves as the entry point for your CLI. Here’s a simplified example:

```go
package cmd

import (
    "os"
    "github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
    Use:   "pf_tools",
    Short: "A collection of handy Go CLI tools",
    Long: `A suite of small utilities built with Go:
   - pft pf_wt: Query weather
   - pft pf_m: Lookup mobile number location
`,
    Run: func(cmd *cobra.Command, args []string) {
        if len(args) == 0 {
            _ = cmd.Help()
        }
    },
}

func Execute() {
    if err := rootCmd.Execute(); err != nil {
        os.Exit(1)
    }
}

func init() {
    rootCmd.Flags().BoolP("version", "v", false, "Show version information")
}
```

**Key properties of `cobra.Command`:**
- `Use`: Command name
- `Short`: Brief description
- `Long`: Detailed description
- `Run`: Function executed when the command is called

The `Execute()` function is the CLI’s entry point, parsing arguments and dispatching to the appropriate command.

### Adding Subcommands

To extend your CLI with more features, simply add subcommands. For example, to add a mobile number lookup:

```shell
cobra-cli add pf_m
```

The `pf_m` command lets users query mobile number information. Here’s a code snippet:

```go
package cmd

import (
    "github.com/pfinal/pf_tools/pak"
    "github.com/spf13/cobra"
)

var pfMCmd = &cobra.Command{
    Use:   "pf_m",
    Short: "Mobile number lookup",
    Long:  `Query the location and details of a mobile number`,
    Run: func(cmd *cobra.Command, args []string) {
        if len(args) == 0 || !pak.CheckMobile(args[0]) {
            _ = cmd.Help()
            return
        }
        m := pak.Mobile{}
        m.GetInfo(args[0])
    },
}

func init() {
    rootCmd.AddCommand(pfMCmd)
}
```

Just like that, you can add as many subcommands as your tool needs.

## Beautiful Terminals with Termui

To enhance the visual experience, I used [termui](https://github.com/gizak/termui), a fully customizable, cross-platform terminal dashboard and widget library built on top of termbox-go.

### Installation

With Go modules, simply import the packages and run `go mod tidy`:

```go
import (
    ui "github.com/gizak/termui/v3"
    "github.com/gizak/termui/v3/widgets"
)
```

### Layout Examples

**Weather Query Table:**

```go
    defer ui.Close()
    table := widgets.NewTable()
    table.Title = res.City + " Weather"
    table.BorderStyle = ui.NewStyle(ui.ColorRed)
    table.Rows = [][]string{
        {"Date", "Weather", "Wind", "Feels Like"},
    }
    for _, v := range res.Weather {
        table.Rows = append(table.Rows, []string{v.Date, v.Weather, v.Wind, v.Temp})
    }
    table.TextStyle = ui.NewStyle(ui.ColorGreen)
    table.TitleStyle = ui.NewStyle(ui.ColorGreen)
    table.SetRect(0, 0, 60, 10)
    ui.Render(table)
    uiEvents := ui.PollEvents()
    for {
        e := <-uiEvents
        switch e.ID {
        case "q", "<C-c>":
            return
        }
    }
```

**Mobile Number Lookup List:**

```go
    defer ui.Close()
    l := widgets.NewList()
    l.Title = "Number Details"
    l.Rows = []string{
        "[0] Queried Number: " + pr.PhoneNum,
        "[1] Carrier: " + pr.CardType,
        "[2] Province: " + pr.Province,
        "[3] City: " + pr.City,
        "[4] City Zip Code: " + pr.ZipCode,
        "[5] Area Code: " + pr.AreaZone,
    }
    l.TextStyle = ui.NewStyle(ui.ColorGreen)
    l.TitleStyle = ui.NewStyle(ui.ColorGreen)
    l.WrapText = false
    l.SetRect(0, 0, 40, 8)
    ui.Render(l)
    uiEvents := ui.PollEvents()
```

The official termui GitHub repository has more examples. Some properties, like `table.Title` and `l.TitleStyle`, may not be used in the official docs, so feel free to experiment!

---

## Source Code

You can find the complete project here:

https://github.com/PFinal-tool/pf_tools

---

Happy coding and enjoy building your own Go-powered terminal tools! 