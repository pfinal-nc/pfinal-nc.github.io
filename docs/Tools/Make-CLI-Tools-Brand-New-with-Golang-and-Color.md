---
title: Make CLI Tools Brand New! Create Colorful Command Line Experiences with Golang and the Color Library
date: 2024-09-25 17:15:27
tags:
    - golang
    - tools
description: Introduction to a tool for quickly creating Golang projects and enhancing CLI output with colors.
author: PFinal Nancheng
keywords: Make CLI Tools Brand New, golang, tools, project, quick, AI, color
sticky: true
---
# Make CLI Tools Brand New! Create Colorful Command Line Experiences with Golang and the Color Library

Recently, I've been using Golang to build small CLI tools for development convenience, as shown below:

![CLI Example](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202408211037928.png)

These tools are indeed very handy, but as the number of tools increases, the output becomes hard to distinguish during use. To solve this problem, I started using the third-party library `Color` to add color to the tool's output. For developers who are used to outputting logs or debug information in command-line tools, colored output is undoubtedly a way to enhance user experience, making information more visually accessible.

### fatih/color

![fatih/color](https://user-images.githubusercontent.com/438920/96832689-03b3e000-13f4-11eb-9803-46f4c4de3406.jpg)

`fatih/color` is a lightweight Go library that allows developers to output colored text in the terminal via ANSI escape codes. It not only lets you set different foreground and background colors for your text, but also supports various styles like bold, underline, and even italic. Best of all, it supports Windows platforms.

Compared to traditional single-color output, colored text helps users quickly locate issues, especially when debugging or viewing logs, greatly improving efficiency.

**Installation**

To use `fatih/color`, first install it with the following command:

```shell
go get github.com/fatih/color
```

**Basic Usage**

Here's a simple example demonstrating how to use the `fatih/color` library:

```go
package main

import "github.com/fatih/color"

func main() {
    color.Cyan("PFinalClub")
    color.Blue("PFinal %s", "Club")
    color.Red("PFinalClub")
    color.Magenta("PFinalClub")
    c := color.New(color.FgCyan).Add(color.Underline)
    _, _ = c.Println("PFinalClub")
    d := color.New(color.FgCyan, color.Bold)
    _, _ = d.Printf("PFinalClub %s\n", "too!.")
    red := color.New(color.FgRed)
    boldRed := red.Add(color.Bold)
    _, _ = boldRed.Println("PFinalClub")
    whiteBackground := red.Add(color.BgWhite)
    _, _ = whiteBackground.Println("PFinalClub")
}
```

The output looks like this:

![Output Example](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202409251017544.png)

This library also provides many interesting features for various scenarios. For example, the following code creates colorful output with multiple styles:

```go
// Instantiate a new color object, set foreground to red, background to green, and italic text
colorPrint := color.New()
colorPrint.Add(color.Italic)
colorPrint.Add(color.FgRed)
colorPrint.Add(color.BgGreen)
colorPrint.Println("Hello, World!")

red := color.New(color.FgRed).PrintfFunc()
red("warning")
red("error: %s", err)

notice := color.New(color.Bold, color.FgGreen).PrintlnFunc()
notice("don't forget this...")
```

### Refactoring PF_tools

Now let's see how to apply this library to our small tool `pf_tools`.

**Modify `main.go`**

First, add Color library support in `main.go` and add a tool logo:

```go
package main

import (
    "github.com/fatih/color"
    "github.com/pfinal/pf_tools/cmd"
)

var Logo = `
Welcome to pf_tools, please follow the instructions below
`

func main() {
    colorPrint := color.New(color.Bold)
    colorPrint.Add(color.FgGreen)
    _, _ = colorPrint.Println(Logo)
    cmd.Execute()
}
```

This code adds a startup logo to the tool and outputs it in bold green.

**Modify `pf_cd` Command**

Next, refactor the `pf_cd` command for colored output:

```go
var pfCdCmd = &cobra.Command{
    Use:   "pf_cd",
    Short: "Clear .DS_Store files in the directory",
    Long:  `Clear .DS_Store files generated in Mac directories`,
    Run: func(cmd *cobra.Command, args []string) {
       colorPrint := color.New(color.Bold)
       colorPrint.Add(color.FgGreen)
       _, _ = colorPrint.Println("Executing cleanup of .DS_Store files in the directory >>>>>>>")
       var path string
       if len(args) > 0 {
          path = args[0]
       } else {
          path, _ = os.Getwd()
       }
       colorPrint.Add(color.FgRed)
       _, _ = colorPrint.Printf("Cleaning .DS_Store files in directory: %s\n", path)
       clearPath := pak.ClearPath{Path: path}
       clearPath.ClearDotDSStore()
       colorPrint.Add(color.FgGreen)
       _, _ = colorPrint.Println("Finished cleaning .DS_Store files in the directory >>>>>>>")
    },
}
```

With this code, not only does the command line output become more visually appealing, but you can also quickly distinguish different stages or content by color.

The effect is as follows:

![Colored Output](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202409251034711.png)

Colorful output is just different—neat and good-looking!

### Summary

Colorful output not only improves the visual effect of CLI tools, but also helps users quickly identify key information. The `fatih/color` library provides a simple yet powerful way to achieve this, whether it's simple color settings or complex style combinations. By integrating colors into your CLI tools, you not only improve user experience, but also make your tools stand out from the crowd. 