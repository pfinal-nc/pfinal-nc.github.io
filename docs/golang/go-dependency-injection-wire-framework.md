---
title: Go Dependency Injection with Wire Framework - A Practical Guide
date: 2025-08-18
tags:
  - golang
  - dependency injection
  - wire
  - clean architecture
  - software design
author: PFinal南丞
keywords: golang, dependency injection, wire, clean architecture, software design patterns, google wire, inversion of control, unit testing, code maintainability
description: A comprehensive guide to using Google's Wire framework for dependency injection in Go applications. Covers setup, basic usage, advanced features, testing, and best practices for building maintainable and testable Go code.
---

# Go Dependency Injection with Wire Framework - A Practical Guide

Dependency Injection (DI) is a design pattern that allows us to remove hard-coded dependencies and make our applications more modular, testable, and maintainable. While Go doesn't have built-in dependency injection like some other languages, the community has developed excellent tools to fill this gap. One of the most popular and effective tools is Google's **Wire**.

Wire is a code generation tool that provides compile-time dependency injection for Go. Unlike reflection-based DI containers, Wire analyzes your code statically and generates the necessary wiring code, resulting in fast startup times and low memory usage. This article will guide you through setting up Wire, understanding its core concepts, and applying it to build clean, testable Go applications.

## 1. Understanding Dependency Injection

Before diving into Wire, let's understand the core concept of dependency injection and why it's beneficial.

### 1.1. What is Dependency Injection?

Dependency injection is a technique where an object receives other objects that it depends on, rather than creating them itself. These dependencies are \"injected\" from the outside, typically by a framework or, in Wire's case, by generated code.

Consider a simple example without DI:

```go
// Without DI - Tight Coupling
type UserRepository struct {
    // Direct dependency on a concrete database implementation
    db *sql.DB 
}

func NewUserRepository() *UserRepository {
    // The repository creates its own database connection
    db, _ := sql.Open(\"mysql\", \"user:password@/dbname\")
    return &UserRepository{db: db}
}

type UserService struct {
    repo *UserRepository
}

func NewUserService() *UserService {
    // The service creates its own repository
    return &UserService{repo: NewUserRepository()}
}
```

This approach leads to tight coupling, making the code difficult to test and maintain.

### 1.2. Benefits of Dependency Injection

1.  **Loose Coupling**: Components depend on abstractions (interfaces) rather than concrete implementations.
2.  **Testability**: Dependencies can be easily mocked or stubbed for unit testing.
3.  **Flexibility**: Easy to swap implementations (e.g., switching from MySQL to Postgres).
4.  **Maintainability**: Changes in one component have minimal impact on others.

### 1.3. Refactoring with DI

```go
// With DI - Loose Coupling
type UserStorer interface {
    GetUser(id int) (*User, error)
    CreateUser(user *User) error
}

type DBUserRepository struct {
    db *sql.DB
}

func (r *DBUserRepository) GetUser(id int) (*User, error) {
    // ... implementation ...
    return &User{}, nil
}

func (r *DBUserRepository) CreateUser(user *User) error {
    // ... implementation ...
    return nil
}

// UserRepository now depends on an interface
type UserService struct {
    repo UserStorer
}

// Dependencies are injected via the constructor
func NewUserService(repo UserStorer) *UserService {
    return &UserService{repo: repo}
}
```

## 2. Introducing Wire

Wire is a flexible, code-generating dependency injection framework for Go. It's designed to be easy to use and fast to run. Here's why Wire stands out:

*   **Compile-Time Safety**: Dependencies are resolved at compile time, catching errors early.
*   **No Runtime Reflection**: Unlike some DI frameworks, Wire doesn't use reflection, leading to better performance.
*   **Explicit Configuration**: Dependencies are wired together explicitly, making the code easy to understand.
*   **IDE Friendly**: Generated code is standard Go code, fully compatible with IDE features like auto-completion and refactoring.

## 3. Setting Up Wire

### 3.1. Installation

To install Wire, you need Go 1.19 or later.

```bash
go install github.com/google/wire/cmd/wire@latest
```

Ensure `$GOPATH/bin` (or `$HOME/go/bin`) is in your `$PATH` so you can run the `wire` command.

### 3.2. Project Structure

A typical project using Wire might look like this:

```
myapp/
├── go.mod
├── go.sum
├── main.go
├── wire.go          # Wire configuration and injector functions
├── wire_gen.go      # Generated file (ignored by version control)
├── internal/
│   ├── config/
│   │   └── config.go
│   ├── user/
│   │   ├── user.go        # Domain types
│   │   ├── repository.go  # Data access layer
│   │   └── service.go     # Business logic layer
│   └── server/
│       └── server.go      # HTTP server setup
└── cmd/
    └── myapp/
        └── main.go        # Application entry point
```

## 4. Basic Wire Usage

### 4.1. Defining Components

Let's start by defining our components. We'll build a simple user management service.

```go
// internal/config/config.go
package config

type Config struct {
    DatabaseURL string
    Port        string
}

func Load() (*Config, error) {
    // In a real application, load from environment variables, files, etc.
    return &Config{
        DatabaseURL: \"user:pass@tcp(localhost:3306)/mydb\",
        Port:        \"8080\",
    }, nil
}
```

```go
// internal/user/user.go
package user

type User struct {
    ID   int
    Name string
    Email string
}
```

```go
// internal/user/repository.go
package user

import (
    \"database/sql\"
    \"fmt\"
)

// UserStorer defines the interface for user data operations.
type UserStorer interface {
    GetByID(id int) (*User, error)
    Create(user *User) error
}

// DBRepository implements UserStorer using a database.
type DBRepository struct {
    db *sql.DB
}

// NewDBRepository creates a new DBRepository.
// This is a provider function for Wire.
func NewDBRepository(dbURL string) (*DBRepository, error) {
    // Simplified database connection for example
    db, err := sql.Open(\"mysql\", dbURL)
    if err != nil {
        return nil, fmt.Errorf(\"failed to open database: %w\", err)
    }
    // In a real app, you'd also handle db.Ping() and connection pooling
    return &DBRepository{db: db}, nil
}

func (r *DBRepository) GetByID(id int) (*User, error) {
    // Simulate database query
    return &User{ID: id, Name: \"Alice\", Email: \"alice@example.com\"}, nil
}

func (r *DBRepository) Create(user *User) error {
    // Simulate database insert
    fmt.Printf(\"Creating user: %+v\\n\", user)
    return nil
}
```

```go
// internal/user/service.go
package user

import \"context\"

// UserService provides business logic for user operations.
type UserService struct {
    repo UserStorer
}

// NewUserService creates a new UserService.
// This is a provider function that depends on UserStorer.
func NewUserService(repo UserStorer) *UserService {
    return &UserService{repo: repo}
}

func (s *UserService) GetUser(ctx context.Context, id int) (*User, error) {
    return s.repo.GetByID(id)
}

func (s *UserService) CreateUser(ctx context.Context, user *User) error {
    return s.repo.Create(user)
}
```

```go
// internal/server/server.go
package server

import (
    \"context\"
    \"fmt\"
    \"net/http\"
    
    \"myapp/internal/user\" // Adjust import path as needed
)

// Server wraps the HTTP server and user service.
type Server struct {
    userService *user.UserService
    port        string
}

// NewServer creates a new Server.
func NewServer(userService *user.UserService, port string) *Server {
    return &Server{
        userService: userService,
        port:        port,
    }
}

func (s *Server) Start(ctx context.Context) error {
    mux := http.NewServeMux()
    // Add handlers that use s.userService
    mux.HandleFunc(\"/health\", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintln(w, \"OK\")
    })
    
    server := &http.Server{
        Addr:    \":\" + s.port,
        Handler: mux,
    }
    
    fmt.Printf(\"Server starting on port %s\\n\", s.port)
    // In a real app, you'd handle graceful shutdown with ctx
    return server.ListenAndServe()
}
```

### 4.2. Wire Configuration

Now we create the Wire configuration file where we define how components are wired together.

```go
// wire.go
//go:build wireinject
// +build wireinject

package main

import (
    \"github.com/google/wire\"
    
    \"myapp/internal/config\"
    \"myapp/internal/user\"
    \"myapp/internal/server\"
)

// InitializeServer is the injector function.
// It tells Wire what we want to create and what dependencies are needed.
func InitializeServer() (*server.Server, error) {
    // Wire will generate the implementation for this function
    panic(wire.Build(
        config.Load,           // Provider: *config.Config
        user.NewDBRepository,  // Provider: *user.DBRepository (which implements user.UserStorer)
        user.NewUserService,   // Provider: *user.UserService
        server.NewServer,      // Provider: *server.Server
    ))
}
```

Key points about `wire.go`:

1.  **Build Tags**: The `//go:build wireinject` (and the older `// +build wireinject`) tells Go's toolchain to ignore this file during normal builds. Wire uses this file as input.
2.  **Injector Function**: `InitializeServer` is the injector function. Its signature defines what we want Wire to create. The body is a `panic` call containing a `wire.Build` directive.
3.  **`wire.Build`**: This lists the provider functions and the types that Wire should use to resolve dependencies.

### 4.3. Generating the Wiring Code

With our components and configuration defined, we can now generate the dependency injection code.

Run the following command in your project root:

```bash
wire
```

This command will:

1.  Analyze `wire.go`.
2.  Generate `wire_gen.go` containing the implementation for `InitializeServer`.
3.  Report any errors if dependencies cannot be resolved.

After running `wire`, you'll have a `wire_gen.go` file that looks something like this (simplified):

```go
// Code generated by Wire. DO NOT EDIT.
//go:build !wireinject
// +build !wireinject

package main

import (
    \"myapp/internal/config\"
    \"myapp/internal/server\"
    \"myapp/internal/user\"
)

// Injectors from wire.go:
func InitializeServer() (*server.Server, error) {
    configConfig, err := config.Load()
    if err != nil {
        return nil, err
    }
    dbRepository, err := user.NewDBRepository(configConfig.DatabaseURL)
    if err != nil {
        return nil, err
    }
    userService := user.NewUserService(dbRepository)
    serverServer := server.NewServer(userService, configConfig.Port)
    return serverServer, nil
}
```

### 4.4. Using the Injector

Finally, we use the generated injector in our main function.

```go
// cmd/myapp/main.go
package main

import (
    \"context\"
    \"log\"
)

func main() {
    server, err := InitializeServer()
    if err != nil {
        log.Fatalf(\"Failed to initialize server: %v\", err)
    }

    if err := server.Start(context.Background()); err != nil {
        log.Fatalf(\"Server failed to start: %v\", err)
    }
}
```

To run the application:

```bash
go run cmd/myapp/main.go
```

## 5. Advanced Wire Features

### 5.1. Binding Interfaces

Often, you'll want to inject an interface implementation. Wire handles this through binding.

```go
// Update wire.go
func InitializeServer() (*server.Server, error) {
    panic(wire.Build(
        config.Load,
        user.NewDBRepository,
        // Bind the concrete type to the interface
        wire.Bind(new(user.UserStorer), new(*user.DBRepository)),
        user.NewUserService,
        server.NewServer,
    ))
}
```

This tells Wire that whenever a `user.UserStorer` is needed, it should provide a `*user.DBRepository`.

### 5.2. Provider Sets

For larger applications, you can group related providers into provider sets to keep your injector functions clean.

```go
// internal/user/wire.go
package user

import \"github.com/google/wire\"

// UserSet is a provider set for user-related components.
var UserSet = wire.NewSet(
    NewDBRepository,
    wire.Bind(new(UserStorer), new(*DBRepository)),
    NewUserService,
)
```

```go
// wire.go (main)
func InitializeServer() (*server.Server, error) {
    panic(wire.Build(
        config.Load,
        user.UserSet, // Use the provider set
        server.NewServer,
    ))
}
```

### 5.3. Struct Providers

You can instruct Wire to create structs directly by providing field values.

```go
type ServerConfig struct {
    Port string
    Host string
}

// In wire.go, you can provide a struct like this:
func InitializeServer() (*server.Server, error) {
    panic(wire.Build(
        provideServerConfig, // A function that returns *ServerConfig
        server.NewServerUsingConfig, // A constructor that takes *ServerConfig
    ))
}

func provideServerConfig() *ServerConfig {
    return &ServerConfig{
        Port: \"8080\",
        Host: \"localhost\",
    }
}
```

### 5.4. Value Providers

For injecting simple values or variables.

```go
func InitializeServer() (*server.Server, error) {
    panic(wire.Build(
        config.Load,
        user.NewDBRepository,
        wire.Bind(new(user.UserStorer), new(*user.DBRepository)),
        user.NewUserService,
        providePort, // Value provider
        server.NewServer,
    ))
}

func providePort(cfg *config.Config) string {
    return cfg.Port
}
```

### 5.5. Cleanup Functions

Wire supports cleanup functions that are called when the injector function returns, useful for closing resources.

```go
func InitializeServer() (*server.Server, func(), error) {
    panic(wire.Build(
        // ... providers ...
    ))
}

// In main.go
func main() {
    server, cleanup, err := InitializeServer()
    if err != nil {
        log.Fatalf(\"Failed to initialize server: %v\", err)
    }
    defer cleanup() // This will be called when main returns

    // ... use server ...
}
```

## 6. Testing with Wire

One of the biggest advantages of DI is improved testability. Wire makes it easy to create test-specific injectors.

### 6.1. Test Provider Sets

Create provider sets for your tests that inject mock implementations.

```go
// internal/user/service_test.go
package user_test

import (
    \"context\"
    \"testing\"
    
    \"github.com/google/wire\"
    \"github.com/stretchr/testify/assert\"
    \"github.com/stretchr/testify/mock\"
    
    \"myapp/internal/user\"
)

// MockUserStorer is a mock implementation of UserStorer.
type MockUserStorer struct {
    mock.Mock
}

func (m *MockUserStorer) GetByID(id int) (*user.User, error) {
    args := m.Called(id)
    u, _ := args.Get(0).(*user.User)
    return u, args.Error(1)
}

func (m *MockUserStorer) Create(u *user.User) error {
    args := m.Called(u)
    return args.Error(0)
}

// TestUserSet is a provider set for testing.
var TestUserSet = wire.NewSet(
    wire.Struct(new(MockUserStorer), \"*\"), // Create struct directly
    wire.Bind(new(user.UserStorer), new(*MockUserStorer)),
    user.NewUserService,
)

// Test injector function for tests
func initializeUserService() (*user.UserService, func(), error) {
    panic(wire.Build(TestUserSet))
}

func TestUserService_GetUser(t *testing.T) {
    // This approach requires a separate wire injector file for tests
    // which is a bit cumbersome. Let's look at a simpler approach.
    
    // Simpler approach: Manually wire dependencies for tests
    mockRepo := new(MockUserStorer)
    service := user.NewUserService(mockRepo)
    
    mockRepo.On(\"GetByID\", 1).Return(&user.User{ID: 1, Name: \"Alice\"}, nil)
    
    u, err := service.GetUser(context.Background(), 1)
    
    assert.NoError(t, err)
    assert.Equal(t, \"Alice\", u.Name)
    mockRepo.AssertExpectations(t)
}
```

### 6.2. Simpler Test Approach

For unit tests, it's often simpler and more idiomatic to manually wire dependencies:

```go
// internal/user/service_test.go
package user_test

import (
    \"context\"
    \"testing\"
    
    \"github.com/stretchr/testify/assert\"
    \"github.com/stretchr/testify/mock\"
    
    \"myapp/internal/user\"
)

// MockUserStorer as defined above...

func TestUserService_GetUser(t *testing.T) {
    mockRepo := new(MockUserStorer)
    service := user.NewUserService(mockRepo) // Manual wiring
    
    expectedUser := &user.User{ID: 1, Name: \"Alice\"}
    mockRepo.On(\"GetByID\", 1).Return(expectedUser, nil)
    
    u, err := service.GetUser(context.Background(), 1)
    
    assert.NoError(t, err)
    assert.Equal(t, expectedUser, u)
    mockRepo.AssertExpectations(t)
}
```

Use Wire-generated injectors primarily for integration tests or when setting up complex application contexts.

## 7. Best Practices and Tips

### 7.1. Keep Provider Functions Pure

Provider functions should be pure functions without side effects, making them predictable and easier for Wire to analyze.

### 7.2. Return Concrete Types, Accept Interfaces

Your constructors should return concrete types but accept interfaces for their dependencies. This makes binding straightforward.

```go
// Good
func NewUserService(repo UserStorer) *UserService { ... }

// Less ideal for Wire
func NewUserService(repo *DBRepository) *UserService { ... }
```

### 7.3. Handle Errors Gracefully

Provider functions can return an error as their last return value. Wire will propagate these errors.

### 7.4. Use Provider Sets for Organization

Group related providers into provider sets to keep your `wire.Build` calls clean and maintainable.

### 7.5. Don't Over-Engineer

Wire is a powerful tool, but don't use it for every single dependency. For simple cases, manual wiring is perfectly fine and often clearer.

### 7.6. Regenerate Code When Needed

Remember to run `wire` whenever you change your provider functions or `wire.Build` directives.

### 7.7. Version Control

Always add `wire_gen.go` to your `.gitignore`. It's a generated file and should not be committed.

```
# .gitignore
wire_gen.go
```

## 8. Common Patterns and Use Cases

### 8.1. Application Configuration

Loading and injecting application configuration is a common use case.

```go
// internal/config/config.go
type Config struct {
    DBHost     string
    DBPort     int
    HTTPPort   string
    LogLevel   string
}

func Load() (*Config, error) {
    // Load from environment variables, files, etc.
    return &Config{
        DBHost:   getEnv(\"DB_HOST\", \"localhost\"),
        DBPort:   getEnvAsInt(\"DB_PORT\", 5432),
        HTTPPort: getEnv(\"HTTP_PORT\", \"8080\"),
        LogLevel: getEnv(\"LOG_LEVEL\", \"info\"),
    }, nil
}

// internal/app/app.go
type Application struct {
    Config *config.Config
    // ... other dependencies
}

func NewApplication(cfg *config.Config) *Application {
    return &Application{Config: cfg}
}
```

### 8.2. Database Connection Management

Properly managing database connections with connection pooling.

```go
// internal/db/db.go
import (
    \"database/sql\"
    \"fmt\"
    
    _ \"github.com/lib/pq\" // PostgreSQL driver
)

type Database struct {
    *sql.DB
}

func NewDatabase(cfg *config.Config) (*Database, error) {
    connStr := fmt.Sprintf(\"host=%s port=%d ...\", cfg.DBHost, cfg.DBPort)
    db, err := sql.Open(\"postgres\", connStr)
    if err != nil {
        return nil, err
    }
    
    // Configure connection pool
    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(25)
    db.SetConnMaxLifetime(5 * time.Minute)
    
    if err := db.Ping(); err != nil {
        db.Close()
        return nil, fmt.Errorf(\"failed to ping database: %w\", err)
    }
    
    return &Database{DB: db}, nil
}
```

### 8.3. Logging

Injecting a configured logger instance.

```go
// internal/logger/logger.go
import \"go.uber.org/zap\"

type Logger struct {
    *zap.Logger
}

func NewLogger(cfg *config.Config) (*Logger, error) {
    var zapLogger *zap.Logger
    var err error
    
    if cfg.LogLevel == \"debug\" {
        zapLogger, err = zap.NewDevelopment()
    } else {
        zapLogger, err = zap.NewProduction()
    }
    
    if err != nil {
        return nil, err
    }
    
    return &Logger{Logger: zapLogger}, nil
}
```

## 9. Troubleshooting Common Issues

### 9.1. \"no provider found\" Error

This error occurs when Wire cannot find a provider for a required type.

**Solution**: Ensure you have a provider function for the missing type and that it's included in your `wire.Build` or provider set.

### 9.2. \"multiple providers\" Error

This happens when there are multiple providers for the same type, and Wire doesn't know which one to use.

**Solution**: Use `wire.Bind` to specify which concrete type should be used for an interface, or remove the conflicting provider.

### 9.3. Circular Dependencies

Wire will detect circular dependencies and report an error.

**Solution**: Refactor your code to eliminate circular dependencies. This often involves rethinking your architecture or introducing interfaces to break the cycle.

## Conclusion

Google's Wire framework provides a powerful yet simple way to implement dependency injection in Go applications. By generating code at compile time, it offers the benefits of DI without the runtime overhead of reflection-based approaches.

Key takeaways:

1.  **Explicit Wiring**: Wire makes dependencies explicit and easy to understand.
2.  **Compile-Time Safety**: Errors are caught at compile time, not runtime.
3.  **Performance**: No runtime reflection means fast startup and execution.
4.  **Testability**: Makes it easy to inject mocks and stubs for testing.
5.  **Maintainability**: Leads to more modular and loosely coupled code.

By following the practices outlined in this guide, you can leverage Wire to build robust, testable, and maintainable Go applications. Remember that Wire is a tool to help you achieve good design principles; use it thoughtfully and don't over-complicate your dependency graph. Start simple and add complexity only when needed.