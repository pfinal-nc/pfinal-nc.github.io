---
title: Quick Start to MCP Server Development in VS Code
date: 2025-07-02 13:00:00
tags:
    - vscode
    - MCP
    - golang
    - programming technology
description: Combining practical cases, this article details how to efficiently develop MCP servers in the VS Code environment, covering environment setup, debugging tips, common issues, and best practices.
author: PFinal南丞
keywords: VS Code, MCP, server, development, quick start, golang, practice, technology, experience sharing
sticky: true
---

# Quick Start to MCP Server Development in VS Code (Advanced Guide)

> "Choosing the right development environment can greatly improve your efficiency."
> — A passionate developer

## Preface: Why Use VS Code for MCP Server Development?

In modern development workflows, choosing a handy IDE can double your efficiency. VS Code, with its lightweight nature, rich plugins, and cross-platform advantages, has become the first choice for many Go developers. For MCP (Mock Cloud Platform) server development, VS Code not only makes coding smoother but also streamlines debugging, testing, and deployment.

---

## Table of Contents

1. [Environment Preparation and Plugin Recommendations](#environment-preparation-and-plugin-recommendations)
2. [Project Structure and Core Files](#project-structure-and-core-files)
3. [Detailed Development Process and Code Examples](#detailed-development-process-and-code-examples)
4. [Debugging and Testing Tips](#debugging-and-testing-tips)
5. [Common Issues and Solutions](#common-issues-and-solutions)
6. [Practical Advice and Best Practices](#practical-advice-and-best-practices)
7. [Summary and Outlook](#summary-and-outlook)

---

## Environment Preparation and Plugin Recommendations

### 1. Install VS Code

Download the latest version of VS Code from the official website, available for Windows, macOS, and Linux. The installation process is straightforward.

### 2. Essential Plugin Configuration

- **Go** (Official by Google):
  After installation, it is recommended to run `Go: Install/Update Tools` as prompted, select all tools for installation, covering debugging, linting, code completion, and refactoring.
- **REST Client**:
  Create `.http` files in VS Code to test HTTP APIs, supporting variables, environments, and history.
- **GitLens**:
  View code history, authors, branches, and blame at a glance, essential for team collaboration.
- **Error Lens**:
  Highlights errors and warnings directly in the code line, greatly improving bug fixing efficiency.
- **Docker**:
  Visual management of containers, images, and networks, suitable for local development and deployment.
- **Path Intellisense**, **Bracket Pair Colorizer 2**, **Markdown All in One**:
  Improve code navigation, bracket coloring, and documentation writing experience.

> "With the right plugins, development is hassle-free."
> — From "Golang Productivity Tools.md"

---

## Project Structure and Core Files

A typical Go MCP server project structure:

```
mcp-server/
├── cmd/
│   └── main.go
├── internal/
│   ├── api/
│   │   └── handler.go
│   ├── storage/
│   │   └── file.go
│   └── service/
│       └── mcp.go
├── configs/
│   └── config.yaml
├── scripts/
│   └── dev.sh
├── go.mod
├── go.sum
└── README.md
```

- **cmd/**: Main program entry (main.go)
- **internal/api/**: HTTP routes and handlers
- **internal/storage/**: Storage logic (e.g., local files, cloud storage)
- **internal/service/**: Business logic
- **configs/**: Configuration files (e.g., port, storage path)
- **scripts/**: Common scripts (e.g., one-click start, testing, deployment)
- **go.mod/go.sum**: Dependency management

---

## Detailed Development Process and Code Examples

### 1. Initialize Go Project

```shell
go mod init github.com/yourname/mcp-server
go get github.com/gin-gonic/gin
```

### 2. Write Main Program Entry

**cmd/main.go**

```go
package main

import (
    "github.com/gin-gonic/gin"
    "mcp-server/internal/api"
)

func main() {
    r := gin.Default()
    api.RegisterRoutes(r)
    r.Run(":8080") // Configurable port
}
```

### 3. Routes and Handlers

**internal/api/handler.go**

```go
package api

import (
    "github.com/gin-gonic/gin"
    "mcp-server/internal/service"
    "net/http"
)

func RegisterRoutes(r *gin.Engine) {
    r.POST("/upload", uploadHandler)
    r.GET("/download/:filename", downloadHandler)
}

func uploadHandler(c *gin.Context) {
    file, err := c.FormFile("file")
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "File upload failed"})
        return
    }
    if err := service.SaveFile(file); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Upload successful"})
}

func downloadHandler(c *gin.Context) {
    filename := c.Param("filename")
    c.File("./data/" + filename)
}
```

### 4. Business Logic and Storage Implementation

**internal/service/mcp.go**

```go
package service

import (
    "mime/multipart"
    "os"
    "io"
)

func SaveFile(file *multipart.FileHeader) error {
    dst := "./data/" + file.Filename
    return saveUploadedFile(file, dst)
}

func saveUploadedFile(file *multipart.FileHeader, dst string) error {
    src, err := file.Open()
    if err != nil {
        return err
    }
    defer src.Close()

    out, err := os.Create(dst)
    if err != nil {
        return err
    }
    defer out.Close()

    _, err = io.Copy(out, src)
    return err
}
```

### 5. Configuration File Example

**configs/config.yaml**

```yaml
server:
  port: 8080
storage:
  path: ./data
```

### 6. Startup Script

**scripts/dev.sh**

```bash
#!/bin/bash
go run cmd/main.go
```

---

## Debugging and Testing Tips

### 1. Breakpoint Debugging

- Set breakpoints in `main.go` or `handler.go` by clicking the red dot on the left.
- Press F5 or click "Run and Debug" and select the Go environment.
- The debug panel allows you to view variables, call stacks, goroutines, etc.

### 2. Unit Testing

**internal/service/mcp_test.go**

```go
package service

import (
    "os"
    "testing"
)

func TestSaveFile(t *testing.T) {
    // Mock a file header, omitted
    // Call SaveFile and assert the result
}
```

Run in terminal:

```shell
# ... 