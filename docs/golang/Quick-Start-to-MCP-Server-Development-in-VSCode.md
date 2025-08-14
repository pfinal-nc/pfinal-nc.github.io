---
title: Quick Start to MCP Server Development in VS Code
date: 2025-07-02 13:00:00
tags:
    - vscode
    - MCP
    - golang
    - programming technology
author: PFinal南丞
keywords: VS Code, MCP, server, development, quick start, golang, practice, technology, experience sharing, Go extension, debugging, testing
description: A practical guide to efficiently developing MCP servers in VS Code, covering environment setup, debugging, testing, and best practices for a streamlined Go development workflow.
---

# Quick Start to MCP Server Development in VS Code

> "Choosing the right development environment can greatly improve your efficiency."
> — A passionate developer

## Preface

Visual Studio Code (VS Code) has become a dominant IDE for Go development due to its speed, extensibility, and excellent Go language support. For building MCP (Mock Cloud Platform) servers, VS Code provides a powerful, integrated environment that simplifies coding, debugging, testing, and even deployment workflows.

This guide walks you through setting up an efficient VS Code environment for Go, structuring your MCP server project, and leveraging VS Code's features for a smooth development experience.

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

### 1. Install Go and VS Code

- **Install Go**: Download and install the latest stable Go version from [https://golang.org/dl/](https://golang.org/dl/). Ensure `go` is in your system's PATH.
- **Install VS Code**: Download VS Code for your OS from [https://code.visualstudio.com/](https://code.visualstudio.com/).

### 2. Essential VS Code Extensions

The Go ecosystem in VS Code is powered by the official **Go extension**.

- **[Go](https://marketplace.visualstudio.com/items?itemName=golang.Go)** (ID: `golang.Go`):
  - **Installation**: Search for "Go" in the VS Code Extensions marketplace and install it.
  - **Post-Installation Setup**: Open any `.go` file. The extension will likely prompt you to install essential tools (like `gopls` for language server, `dlv` for debugging, `gofumpt` for formatting, etc.). Click "Install All" or run the command `Go: Install/Update Tools` from the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and select the tools you need.

- **[REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)** (ID: `humao.rest-client`):
  - Allows you to send HTTP requests and view responses directly within VS Code using `.http` or `.rest` files. Extremely useful for testing APIs.

- **[GitLens](https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens)** (ID: `eamodio.gitlens`):
  - Supercharges Git capabilities within VS Code, providing detailed blame annotations, history exploration, and more.

- **[Docker](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker)** (ID: `ms-azuretools.vscode-docker`):
  - For containerized development and deployment, this extension provides Dockerfile and docker-compose.yml IntelliSense, image/container management, and debugging support for containers.

**Highly Recommended Additional Extensions:**

- **[Error Lens](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens)** (ID: `usernamehw.errorlens`): Displays diagnostics (errors/warnings) inline with the code.
- **[Path Intellisense](https://marketplace.visualstudio.com/items?itemName=christian-kohler.path-intellisense)** (ID: `christian-kohler.path-intellisense`): Autocompletes filenames in string literals.
- **[Bracket Pair Colorizer](https://marketplace.visualstudio.com/items?itemName=CoenraadS.bracket-pair-colorizer)** (ID: `CoenraadS.bracket-pair-colorizer`): Colorizes matching brackets for easier reading.
- **[Markdown All in One](https://marketplace.visualstudio.com/items?itemName=yzane.markdown-all-in-one)** (ID: `yzane.markdown-all-in-one`): Enhances Markdown authoring experience.

---

## Project Structure and Core Files

A well-organized project structure is crucial for maintainability. Here's a recommended layout for a Go MCP server:

```
mcp-server/
├── cmd/
│   └── mcpd/           # Main application directory (e.g., 'mcpd' for MCP Daemon)
│       └── main.go     # Entry point
├── internal/            # Private application code
│   ├── api/            # HTTP handlers and routes
│   │   ├── handler.go
│   │   └── routes.go
│   ├── service/        # Business logic
│   │   └── mcp.go
│   └── storage/        # Data access layer (files, DB, cloud)
│       └── file.go
├── configs/
│   └── config.yaml     # Configuration file
├── scripts/
│   └── dev.sh          # Development scripts
├── api/                # API definitions (e.g., OpenAPI/Swagger)
│   └── swagger.yaml
├── go.mod
├── go.sum
├── README.md
└── .vscode/            # VS Code specific settings (optional but useful)
    ├── settings.json
    ├── launch.json     # Debug configurations
    └── tasks.json      # Custom tasks (e.g., build, run)
```

**Explanation:**

- **`cmd/`**: Contains the main application executable(s). The directory name often matches the binary name.
- **`internal/`**: Packages inside `internal` are private to the module and cannot be imported by external projects. This is a Go convention.
- **`api/`**: HTTP layer, defining routes and request/response handling.
- **`service/`**: Core business logic, independent of transport (HTTP).
- **`storage/`**: Data persistence logic.
- **`configs/`**: Application configuration files.
- **`scripts/`**: Utility scripts for development, building, or deployment.
- **`api/`** (root level): External API definitions.
- **`go.mod`/`go.sum`**: Go module files for dependency management.
- **`.vscode/`**: Contains VS Code specific configurations, making the setup reproducible for other developers.

---

## Detailed Development Process and Code Examples

### 1. Initialize Go Project

Open your terminal, navigate to your desired project directory, and initialize the module:

```bash
mkdir mcp-server && cd mcp-server
go mod init github.com/yourname/mcp-server # Use your actual module path
go get github.com/gin-gonic/gin # Example framework
go get gopkg.in/yaml.v3        # For YAML config
```

### 2. Write Main Program Entry (`cmd/mcpd/main.go`)

This is the application's entry point.

```go
package main

import (
    "log"
    "github.com/gin-gonic/gin"
    "github.com/yourname/mcp-server/internal/api" // Adjust import path
    "github.com/yourname/mcp-server/internal/storage"
)

func main() {
    // 1. Initialize dependencies (e.g., storage)
    // For simplicity, using a basic file storage
    fileStore := storage.NewFileStorage("./data")
    
    // 2. Initialize the API handler with dependencies
    handler := api.NewHandler(fileStore)
    
    // 3. Set up Gin router
    r := gin.Default() // Use gin.New() + middleware for production
    handler.RegisterRoutes(r)
    
    // 4. Load configuration (optional, for port)
    port := "8080" // Default or from config
    
    log.Printf("MCP Server starting on port %s...", port)
    if err := r.Run(":" + port); err != nil {
        log.Fatalf("Failed to start server: %v", err)
    }
}
```

### 3. Define Storage Interface and Implementation (`internal/storage/file.go`)

Decoupling storage logic improves testability.

```go
package storage

import (
    "io"
    "mime/multipart"
    "os"
    "path/filepath"
)

// Storage defines the interface for file storage operations.
type Storage interface {
    SaveFile(file *multipart.FileHeader) error
    GetFile(filename string) (io.ReadCloser, error)
    DeleteFile(filename string) error
}

// FileStorage implements Storage using the local filesystem.
type FileStorage struct {
    basePath string
}

// NewFileStorage creates a new FileStorage instance.
func NewFileStorage(basePath string) *FileStorage {
    // Ensure base path exists
    os.MkdirAll(basePath, 0755) // Read/Write/Execute for user, Read/Execute for group/others
    return &FileStorage{basePath: basePath}
}

// SaveFile saves an uploaded file to the filesystem.
func (fs *FileStorage) SaveFile(file *multipart.FileHeader) error {
    src, err := file.Open()
    if err != nil {
        return err
    }
    defer src.Close()

    dstPath := filepath.Join(fs.basePath, file.Filename)
    dst, err := os.Create(dstPath)
    if err != nil {
        return err
    }
    defer dst.Close()

    _, err = io.Copy(dst, src)
    return err
}

// GetFile retrieves a file for reading.
func (fs *FileStorage) GetFile(filename string) (io.ReadCloser, error) {
    path := filepath.Join(fs.basePath, filename)
    return os.Open(path)
}

// DeleteFile removes a file from the filesystem.
func (fs *FileStorage) DeleteFile(filename string) error {
    path := filepath.Join(fs.basePath, filename)
    return os.Remove(path)
}
```

### 4. Create API Handler (`internal/api/handler.go`)

This layer handles HTTP requests and interacts with services/storage.

```go
package api

import (
    "net/http"
    "github.com/gin-gonic/gin"
    "github.com/yourname/mcp-server/internal/storage"
)

// Handler wraps dependencies for HTTP handlers.
type Handler struct {
    store storage.Storage
}

// NewHandler creates a new Handler instance.
func NewHandler(store storage.Storage) *Handler {
    return &Handler{store: store}
}

// RegisterRoutes sets up the Gin routes.
func (h *Handler) RegisterRoutes(r *gin.Engine) {
    r.POST("/upload", h.uploadHandler)
    r.GET("/download/:filename", h.downloadHandler)
    r.DELETE("/delete/:filename", h.deleteHandler)
}

// --- Handler Functions ---

func (h *Handler) uploadHandler(c *gin.Context) {
    file, err := c.FormFile("file")
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "File is required"})
        return
    }
    if err := h.store.SaveFile(file); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Upload successful", "filename": file.Filename})
}

func (h *Handler) downloadHandler(c *gin.Context) {
    filename := c.Param("filename")
    fileReader, err := h.store.GetFile(filename)
    if err != nil {
        if os.IsNotExist(err) {
            c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
        } else {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve file"})
        }
        return
    }
    defer fileReader.Close()

    c.Header("Content-Description", "File Transfer")
    c.Header("Content-Type", "application/octet-stream")
    c.Header("Content-Disposition", "attachment; filename="+filename)
    c.Header("Content-Transfer-Encoding", "binary")
    // Consider adding Content-Length if known

    // Stream the file to the response
    _, err = io.Copy(c.Writer, fileReader)
    if err != nil {
        // Note: Headers might already be sent, logging is often the only recourse
        // In production, consider a more robust error handling middleware
        // log.Printf("Error sending file %s: %v", filename, err)
    }
}

func (h *Handler) deleteHandler(c *gin.Context) {
    filename := c.Param("filename")
    if err := h.store.DeleteFile(filename); err != nil {
        if os.IsNotExist(err) {
            c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
        } else {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file"})
        }
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "File deleted successfully"})
}
```

### 5. Configuration (Basic Example - `configs/config.yaml`)

```yaml
server:
  port: "8080"
storage:
  path: "./data"
```

### 6. Development Script (`scripts/dev.sh`)

Make it executable (`chmod +x scripts/dev.sh`).

```bash
#!/bin/bash
# Simple development run script
echo "Starting MCP Server in development mode..."
go run cmd/mcpd/main.go
```

---

## Debugging and Testing Tips

### 1. Breakpoint Debugging

VS Code's Go debugger (Delve) is powerful and easy to use.

- **Set Breakpoints**: Click in the gutter to the left of line numbers.
- **Start Debugging**:
  - **Method 1**: Press `F5`. VS Code will try to run the currently open Go file. For a project, it's better to configure `launch.json`.
  - **Method 2**: Create a `.vscode/launch.json` file for precise control:

    ```json
    {
        "version": "0.2.0",
        "configurations": [
            {
                "name": "Launch MCP Server",
                "type": "go",
                "request": "launch",
                "mode": "auto",
                "program": "${workspaceFolder}/cmd/mcpd",
                "env": {},
                "args": []
            }
        ]
    }
    ```
  - **Method 3**: Use the "Run and Debug" view in the Activity Bar, select your configuration, and click the green "Start Debugging" arrow.
- **Debug Panel**: Use the Debug view to inspect variables, call stacks, breakpoints, and goroutines.

### 2. Unit Testing

Go's built-in testing capabilities integrate seamlessly with VS Code.

- **Write Tests** (`internal/storage/file_test.go`):

    ```go
    package storage

    import (
        "testing"
        "os"
        "io/ioutil"
    )

    func TestFileStorage_SaveAndRetrieve(t *testing.T) {
        // Setup: Create a temporary directory for testing
        tmpDir, err := ioutil.TempDir("", "mcp_test")
        if err != nil {
            t.Fatal(err)
        }
        defer os.RemoveAll(tmpDir) // Cleanup

        store := NewFileStorage(tmpDir)

        // Create a temporary file to simulate upload
        content := []byte("Hello, Test World!")
        tmpFile, err := ioutil.TempFile("", "upload_test")
        if err != nil {
            t.Fatal(err)
        }
        defer os.Remove(tmpFile.Name())
        if _, err := tmpFile.Write(content); err != nil {
            t.Fatal(err)
        }
        tmpFile.Close()

        // Mock a multipart.FileHeader (simplified for example)
        fileHeader := &multipart.FileHeader{
            Filename: "testfile.txt",
            Size:     int64(len(content)),
            // Note: Opening the real file is complex in a test without an HTTP request.
            // A more thorough test would use httptest.
        }
        // This test is conceptual. Testing SaveFile directly requires more setup
        // or mocking the *multipart.FileHeader's Open method.
        // Let's test GetFile after manually placing a file.
        
        // Manually place a file for GetFile test
        err = ioutil.WriteFile(tmpDir+"/manual_test.txt", content, 0644)
        if err != nil {
            t.Fatal(err)
        }
        
        reader, err := store.GetFile("manual_test.txt")
        if err != nil {
            t.Fatalf("GetFile failed: %v", err)
        }
        defer reader.Close()

        data, err := ioutil.ReadAll(reader)
        if err != nil {
            t.Fatalf("ReadAll failed: %v", err)
        }

        if string(data) != string(content) {
            t.Errorf("Expected %s, got %s", content, data)
        }
    }
    ```

- **Run Tests**:
  - **In Terminal**: `go test ./...` runs all tests.
  - **In VS Code**:
    - Click the "Testing" icon in the Activity Bar.
    - Or, above any `func TestXxx(t *testing.T)` function, you'll see inline "run test" and "debug test" links. Click them.
    - Use Command Palette (`Ctrl+Shift+P`): `Go: Test All Packages in Workspace`.

---

## Common Issues and Solutions

1.  **Extension Tools Not Installing**: If the Go extension fails to install tools, try installing them manually via the terminal: `go install github.com/go-delve/delve/cmd/dlv@latest`.
2.  **Import Path Issues**: Ensure your `go.mod` module path matches your import paths. Use `go mod tidy` frequently.
3.  **Debugger Not Stopping**: Make sure you're building/running the correct file/package. Check your `launch.json` configuration.
4.  **Formatting/Linting Not Working**: Ensure `gofumpt` or `goimports` is installed and selected as the formatter in VS Code settings (`go.formatTool`).

---

## Practical Advice and Best Practices

1.  **Use Go Modules**: Always use `go mod init` for dependency management.
2.  **Leverage `internal/`**: Use the `internal` directory to prevent unintended external imports of your private packages.
3.  **Interface Dependencies**: Define interfaces for dependencies (like `storage.Storage`) to make your code more modular and testable.
4.  **Configuration Management**: Use libraries like `viper` for more complex configuration needs (env vars, multiple formats).
5.  **Structured Logging**: Replace `fmt.Println` with structured logging libraries like `log/slog` (Go 1.21+) or `uber-go/zap`.
6.  **Error Handling**: Implement consistent error handling and consider using `errors.Is` and `errors.As` for checking error types.
7.  **VS Code Settings**: Customize your `.vscode/settings.json` for project-specific settings (e.g., formatting on save, linter options).

    ```json
    // .vscode/settings.json
    {
        "go.formatTool": "gofumpt",
        "go.lintTool": "golangci-lint", // Requires installation
        "go.lintOnSave": "package",
        "go.buildOnSave": "package",
        "go.testOnSave": false, // Or true, based on preference
        "editor.formatOnSave": true,
        "[go]": {
            "editor.codeActionsOnSave": {
                "source.organizeImports": true
            }
        }
    }
    ```

8.  **REST Client for API Testing**: Create `.http` files to test your endpoints.

    ```http
    ### Upload a file
    POST http://localhost:8080/upload
    Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

    ------WebKitFormBoundary7MA4YWxkTrZu0gW
    Content-Disposition: form-data; name="file"; filename="test.txt"
    Content-Type: text/plain

    Hello, MCP Server!

    ------WebKitFormBoundary7MA4YWxkTrZu0gW--
    ```

---

## Summary and Outlook

Setting up VS Code for Go MCP server development creates a powerful and efficient workflow. By leveraging the Go extension's features, organizing your project well, and integrating debugging and testing tools, you can significantly accelerate your development cycle.

As you advance, consider incorporating more sophisticated tools like `golangci-lint` for code quality, `pprof` for performance profiling, and containerization with Docker for deployment. VS Code's ecosystem and Go's toolchain make this a smooth process.

> "With the right tools, development is hassle-free."
> — From "Golang Productivity Tools.md"

Happy coding and efficient MCP server building!