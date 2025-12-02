---
title: "Building Production-Ready Go Microservices Complete Architecture Guide 2025"
description: "Learn how to build production-ready Go microservices from scratch. This comprehensive guide covers service design, gRPC & REST APIs, database patterns, observability, deployment, and real-world architecture decisions used by companies like Uber, Netflix, and Google."
date: 2025-12-01
author: PFinal南丞
category: golang
tags:
  - golang
  - microservices
  - architecture
  - grpc
  - kubernetes
  - production
  - backend
keywords:
  - go microservices architecture
  - golang microservices tutorial
  - go microservices best practices
  - go grpc microservices
  - go microservices kubernetes
  - production go microservices
  - go service mesh
  - go microservices patterns
  - golang distributed systems
  - go backend architecture 2025
  - go 微服务 架构
  - golang 微服务 教程
  - go 微服务 实战
  - go grpc 微服务
  - go 分布式系统
---

# Building Production-Ready Go Microservices: Complete Architecture Guide 2025

> **TL;DR**: This guide walks you through building production-grade Go microservices — from initial design decisions to deployment. You'll learn the patterns used by Uber, Netflix, and Google, with real code examples you can use today.

---

## Why Go for Microservices?

Go has become the de facto language for building microservices. Here's why:

| Feature | Why It Matters for Microservices |
|---------|----------------------------------|
| **Fast compilation** | Rapid iteration, quick CI/CD pipelines |
| **Small binaries** | Tiny Docker images (10-20MB), fast container startup |
| **Built-in concurrency** | Handle thousands of concurrent requests with goroutines |
| **Static typing** | Catch errors at compile time, not in production |
| **Standard library** | HTTP, JSON, crypto — all built-in, no dependencies |
| **Cross-compilation** | Build for any platform from any platform |

Companies using Go for microservices: **Uber, Netflix, Google, Dropbox, Cloudflare, Twitch, Shopify, and thousands more.**

If you're new to Go, start with our [Go Error Handling Best Practices 2025](/golang/Go-Error-Handling-Best-Practices-2025-Complete-Guide) guide first.

---

## Table of Contents

1. [Microservices Architecture Fundamentals](#1-microservices-architecture-fundamentals)
2. [Project Structure That Scales](#2-project-structure-that-scales)
3. [API Design: gRPC vs REST vs GraphQL](#3-api-design-grpc-vs-rest-vs-graphql)
4. [Database Patterns for Microservices](#4-database-patterns-for-microservices)
5. [Service Communication Patterns](#5-service-communication-patterns)
6. [Observability: Logs, Metrics, Traces](#6-observability-logs-metrics-traces)
7. [Error Handling in Distributed Systems](#7-error-handling-in-distributed-systems)
8. [Security Best Practices](#8-security-best-practices)
9. [Deployment & Kubernetes](#9-deployment--kubernetes)
10. [Real-World Architecture Example](#10-real-world-architecture-example)

---

## 1. Microservices Architecture Fundamentals

### What Makes a Good Microservice?

A well-designed microservice follows these principles:

```
┌─────────────────────────────────────────────────────────────┐
│                    GOOD MICROSERVICE                        │
├─────────────────────────────────────────────────────────────┤
│  ✅ Single Responsibility    — Does one thing well          │
│  ✅ Independently Deployable — No coordination required      │
│  ✅ Owns Its Data            — Has its own database          │
│  ✅ API Contract             — Clear, versioned interface    │
│  ✅ Observable               — Logs, metrics, traces         │
│  ✅ Resilient                — Handles failures gracefully   │
└─────────────────────────────────────────────────────────────┘
```

### When NOT to Use Microservices

Before diving in, ask yourself:

- **Do you have a small team?** → Start with a modular monolith
- **Is your domain unclear?** → Premature decomposition is worse than a monolith
- **Do you lack DevOps maturity?** → Microservices require solid CI/CD, monitoring, and orchestration

> **Rule of thumb**: If you can't deploy a monolith reliably, you can't deploy microservices.

### Domain-Driven Design (DDD) for Service Boundaries

The hardest part of microservices is **finding the right boundaries**. Use DDD concepts:

```
┌─────────────────────────────────────────────────────────────┐
│                    E-COMMERCE DOMAIN                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│   │   Order     │    │   Catalog   │    │   Payment   │     │
│   │   Context   │    │   Context   │    │   Context   │     │
│   ├─────────────┤    ├─────────────┤    ├─────────────┤     │
│   │ - Order     │    │ - Product   │    │ - Payment   │     │
│   │ - LineItem  │    │ - Category  │    │ - Refund    │     │
│   │ - Shipping  │    │ - Inventory │    │ - Invoice   │     │
│   └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                    Integration Events                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

Each **Bounded Context** becomes a microservice (or a group of closely related services).

---

## 2. Project Structure That Scales

### The Standard Go Project Layout

Here's a battle-tested structure for Go microservices:

```
my-service/
├── cmd/
│   └── server/
│       └── main.go           # Entry point
├── internal/
│   ├── config/
│   │   └── config.go         # Configuration loading
│   ├── domain/
│   │   ├── order.go          # Domain entities
│   │   └── errors.go         # Domain errors
│   ├── repository/
│   │   ├── order_repo.go     # Repository interface
│   │   └── postgres/
│   │       └── order.go      # PostgreSQL implementation
│   ├── service/
│   │   └── order_service.go  # Business logic
│   └── transport/
│       ├── grpc/
│       │   └── server.go     # gRPC handlers
│       └── http/
│           └── server.go     # HTTP handlers
├── pkg/
│   └── logger/
│       └── logger.go         # Shared logging utilities
├── api/
│   └── proto/
│       └── order.proto       # gRPC definitions
├── migrations/
│   └── 001_create_orders.sql # Database migrations
├── deployments/
│   ├── Dockerfile
│   └── k8s/
│       └── deployment.yaml
├── go.mod
├── go.sum
└── Makefile
```

### Key Principles

1. **`cmd/`** — Application entry points
2. **`internal/`** — Private code (Go enforces this)
3. **`pkg/`** — Public libraries (use sparingly)
4. **`api/`** — API definitions (proto files, OpenAPI specs)

### Configuration Management

```go
// internal/config/config.go
package config

import (
    "os"
    "time"

    "github.com/kelseyhightower/envconfig"
)

type Config struct {
    // Server
    ServerPort    int           `envconfig:"SERVER_PORT" default:"8080"`
    GRPCPort      int           `envconfig:"GRPC_PORT" default:"9090"`
    ReadTimeout   time.Duration `envconfig:"READ_TIMEOUT" default:"5s"`
    WriteTimeout  time.Duration `envconfig:"WRITE_TIMEOUT" default:"10s"`

    // Database
    DatabaseURL   string        `envconfig:"DATABASE_URL" required:"true"`
    MaxOpenConns  int           `envconfig:"DB_MAX_OPEN_CONNS" default:"25"`
    MaxIdleConns  int           `envconfig:"DB_MAX_IDLE_CONNS" default:"5"`

    // Observability
    JaegerEndpoint string       `envconfig:"JAEGER_ENDPOINT"`
    LogLevel       string       `envconfig:"LOG_LEVEL" default:"info"`

    // Feature Flags
    EnableNewCheckout bool      `envconfig:"ENABLE_NEW_CHECKOUT" default:"false"`
}

func Load() (*Config, error) {
    var cfg Config
    if err := envconfig.Process("", &cfg); err != nil {
        return nil, err
    }
    return &cfg, nil
}
```

---

## 3. API Design: gRPC vs REST vs GraphQL

### Comparison Table

| Aspect | gRPC | REST | GraphQL |
|--------|------|------|---------|
| **Performance** | ⭐⭐⭐⭐⭐ (Protobuf binary) | ⭐⭐⭐ (JSON) | ⭐⭐⭐ (JSON) |
| **Type Safety** | ⭐⭐⭐⭐⭐ (Schema enforced) | ⭐⭐ (OpenAPI optional) | ⭐⭐⭐⭐ (Schema enforced) |
| **Browser Support** | ⭐⭐ (gRPC-Web needed) | ⭐⭐⭐⭐⭐ (Native) | ⭐⭐⭐⭐⭐ (Native) |
| **Streaming** | ⭐⭐⭐⭐⭐ (Bidirectional) | ⭐⭐ (SSE, WebSocket) | ⭐⭐⭐ (Subscriptions) |
| **Learning Curve** | ⭐⭐⭐ (Protobuf, tooling) | ⭐⭐⭐⭐⭐ (Everyone knows it) | ⭐⭐⭐ (Query language) |

### When to Use What

- **gRPC**: Service-to-service communication, high-performance internal APIs
- **REST**: Public APIs, mobile clients, simple CRUD
- **GraphQL**: Complex data requirements, mobile apps with varying needs

### gRPC Service Definition

```protobuf
// api/proto/order.proto
syntax = "proto3";

package order.v1;

option go_package = "github.com/yourorg/order-service/api/proto/order/v1";

service OrderService {
    // Create a new order
    rpc CreateOrder(CreateOrderRequest) returns (CreateOrderResponse);
    
    // Get order by ID
    rpc GetOrder(GetOrderRequest) returns (Order);
    
    // Stream order updates
    rpc WatchOrder(WatchOrderRequest) returns (stream OrderUpdate);
}

message CreateOrderRequest {
    string customer_id = 1;
    repeated LineItem items = 2;
    Address shipping_address = 3;
}

message CreateOrderResponse {
    string order_id = 1;
    OrderStatus status = 2;
}

message Order {
    string id = 1;
    string customer_id = 2;
    repeated LineItem items = 3;
    OrderStatus status = 4;
    google.protobuf.Timestamp created_at = 5;
}

message LineItem {
    string product_id = 1;
    int32 quantity = 2;
    int64 price_cents = 3;
}

enum OrderStatus {
    ORDER_STATUS_UNSPECIFIED = 0;
    ORDER_STATUS_PENDING = 1;
    ORDER_STATUS_CONFIRMED = 2;
    ORDER_STATUS_SHIPPED = 3;
    ORDER_STATUS_DELIVERED = 4;
    ORDER_STATUS_CANCELLED = 5;
}
```

### gRPC Server Implementation

```go
// internal/transport/grpc/server.go
package grpc

import (
    "context"

    pb "github.com/yourorg/order-service/api/proto/order/v1"
    "github.com/yourorg/order-service/internal/service"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

type OrderServer struct {
    pb.UnimplementedOrderServiceServer
    orderService *service.OrderService
}

func NewOrderServer(svc *service.OrderService) *OrderServer {
    return &OrderServer{orderService: svc}
}

func (s *OrderServer) CreateOrder(
    ctx context.Context,
    req *pb.CreateOrderRequest,
) (*pb.CreateOrderResponse, error) {
    // Validate request
    if req.CustomerId == "" {
        return nil, status.Error(codes.InvalidArgument, "customer_id is required")
    }
    if len(req.Items) == 0 {
        return nil, status.Error(codes.InvalidArgument, "at least one item is required")
    }

    // Convert to domain model
    order, err := s.orderService.CreateOrder(ctx, service.CreateOrderInput{
        CustomerID: req.CustomerId,
        Items:      convertLineItems(req.Items),
        Address:    convertAddress(req.ShippingAddress),
    })
    if err != nil {
        return nil, mapDomainError(err)
    }

    return &pb.CreateOrderResponse{
        OrderId: order.ID,
        Status:  pb.OrderStatus(order.Status),
    }, nil
}

func (s *OrderServer) GetOrder(
    ctx context.Context,
    req *pb.GetOrderRequest,
) (*pb.Order, error) {
    order, err := s.orderService.GetOrder(ctx, req.OrderId)
    if err != nil {
        return nil, mapDomainError(err)
    }
    return convertToProto(order), nil
}

// mapDomainError converts domain errors to gRPC status codes
func mapDomainError(err error) error {
    switch {
    case errors.Is(err, domain.ErrOrderNotFound):
        return status.Error(codes.NotFound, "order not found")
    case errors.Is(err, domain.ErrInvalidOrder):
        return status.Error(codes.InvalidArgument, err.Error())
    default:
        return status.Error(codes.Internal, "internal error")
    }
}
```

---

## 4. Database Patterns for Microservices

### Database Per Service

Each microservice owns its data. **Never share databases between services.**

```
┌─────────────────────────────────────────────────────────────┐
│                    ❌ WRONG: Shared Database                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐                 │
│   │ Order   │    │ Catalog │    │ Payment │                 │
│   │ Service │    │ Service │    │ Service │                 │
│   └────┬────┘    └────┬────┘    └────┬────┘                 │
│        │              │              │                       │
│        └──────────────┼──────────────┘                       │
│                       │                                      │
│                ┌──────┴──────┐                               │
│                │  Shared DB  │  ← Coupling, schema changes   │
│                └─────────────┘    break everything           │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    ✅ RIGHT: Database Per Service            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐                 │
│   │ Order   │    │ Catalog │    │ Payment │                 │
│   │ Service │    │ Service │    │ Service │                 │
│   └────┬────┘    └────┬────┘    └────┬────┘                 │
│        │              │              │                       │
│   ┌────┴────┐    ┌────┴────┐    ┌────┴────┐                 │
│   │Order DB │    │Catalog  │    │Payment  │                 │
│   │(Postgres)│   │DB (Mongo)│   │DB (Postgres)│              │
│   └─────────┘    └─────────┘    └─────────┘                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Repository Pattern

```go
// internal/repository/order_repo.go
package repository

import (
    "context"
    "github.com/yourorg/order-service/internal/domain"
)

// OrderRepository defines the interface for order persistence
type OrderRepository interface {
    Create(ctx context.Context, order *domain.Order) error
    GetByID(ctx context.Context, id string) (*domain.Order, error)
    Update(ctx context.Context, order *domain.Order) error
    Delete(ctx context.Context, id string) error
    ListByCustomer(ctx context.Context, customerID string, opts ListOptions) ([]*domain.Order, error)
}

type ListOptions struct {
    Limit  int
    Offset int
    Status *domain.OrderStatus
}
```

### PostgreSQL Implementation

```go
// internal/repository/postgres/order.go
package postgres

import (
    "context"
    "database/sql"
    "errors"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/yourorg/order-service/internal/domain"
    "github.com/yourorg/order-service/internal/repository"
)

type OrderRepository struct {
    pool *pgxpool.Pool
}

func NewOrderRepository(pool *pgxpool.Pool) *OrderRepository {
    return &OrderRepository{pool: pool}
}

func (r *OrderRepository) Create(ctx context.Context, order *domain.Order) error {
    query := `
        INSERT INTO orders (id, customer_id, status, total_cents, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
    `
    _, err := r.pool.Exec(ctx, query,
        order.ID,
        order.CustomerID,
        order.Status,
        order.TotalCents,
        order.CreatedAt,
        order.UpdatedAt,
    )
    if err != nil {
        return fmt.Errorf("failed to create order: %w", err)
    }

    // Insert line items
    for _, item := range order.Items {
        if err := r.createLineItem(ctx, order.ID, item); err != nil {
            return err
        }
    }

    return nil
}

func (r *OrderRepository) GetByID(ctx context.Context, id string) (*domain.Order, error) {
    query := `
        SELECT id, customer_id, status, total_cents, created_at, updated_at
        FROM orders
        WHERE id = $1
    `
    var order domain.Order
    err := r.pool.QueryRow(ctx, query, id).Scan(
        &order.ID,
        &order.CustomerID,
        &order.Status,
        &order.TotalCents,
        &order.CreatedAt,
        &order.UpdatedAt,
    )
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return nil, domain.ErrOrderNotFound
        }
        return nil, fmt.Errorf("failed to get order: %w", err)
    }

    // Load line items
    items, err := r.getLineItems(ctx, id)
    if err != nil {
        return nil, err
    }
    order.Items = items

    return &order, nil
}
```

### Transaction Outbox Pattern

For reliable event publishing, use the **Outbox Pattern**:

```go
// internal/repository/postgres/order.go

func (r *OrderRepository) CreateWithOutbox(ctx context.Context, order *domain.Order) error {
    tx, err := r.pool.Begin(ctx)
    if err != nil {
        return err
    }
    defer tx.Rollback(ctx)

    // 1. Insert order
    if err := r.createOrderTx(ctx, tx, order); err != nil {
        return err
    }

    // 2. Insert outbox event (same transaction!)
    event := domain.OrderCreatedEvent{
        OrderID:    order.ID,
        CustomerID: order.CustomerID,
        TotalCents: order.TotalCents,
        CreatedAt:  order.CreatedAt,
    }
    if err := r.insertOutboxEvent(ctx, tx, "order.created", event); err != nil {
        return err
    }

    return tx.Commit(ctx)
}

func (r *OrderRepository) insertOutboxEvent(
    ctx context.Context,
    tx pgx.Tx,
    eventType string,
    payload any,
) error {
    data, err := json.Marshal(payload)
    if err != nil {
        return err
    }

    query := `
        INSERT INTO outbox (id, event_type, payload, created_at)
        VALUES ($1, $2, $3, $4)
    `
    _, err = tx.Exec(ctx, query,
        uuid.New().String(),
        eventType,
        data,
        time.Now(),
    )
    return err
}
```

---

## 5. Service Communication Patterns

### Synchronous vs Asynchronous

| Pattern | Use When | Example |
|---------|----------|---------|
| **Sync (gRPC/REST)** | Need immediate response | Get user profile, validate payment |
| **Async (Events)** | Fire-and-forget, eventual consistency | Order placed → send email, update inventory |

### Event-Driven Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Event-Driven Flow                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────┐     order.created      ┌─────────────┐        │
│   │ Order   │ ──────────────────────▶│  Message    │        │
│   │ Service │                        │  Broker     │        │
│   └─────────┘                        │  (Kafka)    │        │
│                                      └──────┬──────┘        │
│                                             │               │
│              ┌──────────────────────────────┼───────┐       │
│              │                              │       │       │
│              ▼                              ▼       ▼       │
│   ┌──────────────┐              ┌─────────┐ ┌───────────┐   │
│   │ Notification │              │Inventory│ │  Payment  │   │
│   │   Service    │              │ Service │ │  Service  │   │
│   └──────────────┘              └─────────┘ └───────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Kafka Consumer in Go

```go
// internal/consumer/order_consumer.go
package consumer

import (
    "context"
    "encoding/json"

    "github.com/segmentio/kafka-go"
    "go.uber.org/zap"
)

type OrderEventConsumer struct {
    reader  *kafka.Reader
    logger  *zap.Logger
    handler OrderEventHandler
}

type OrderEventHandler interface {
    HandleOrderCreated(ctx context.Context, event OrderCreatedEvent) error
    HandleOrderCancelled(ctx context.Context, event OrderCancelledEvent) error
}

func NewOrderEventConsumer(
    brokers []string,
    groupID string,
    handler OrderEventHandler,
    logger *zap.Logger,
) *OrderEventConsumer {
    reader := kafka.NewReader(kafka.ReaderConfig{
        Brokers:  brokers,
        GroupID:  groupID,
        Topic:    "orders",
        MinBytes: 10e3, // 10KB
        MaxBytes: 10e6, // 10MB
    })

    return &OrderEventConsumer{
        reader:  reader,
        logger:  logger,
        handler: handler,
    }
}

func (c *OrderEventConsumer) Start(ctx context.Context) error {
    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
            msg, err := c.reader.FetchMessage(ctx)
            if err != nil {
                c.logger.Error("failed to fetch message", zap.Error(err))
                continue
            }

            if err := c.processMessage(ctx, msg); err != nil {
                c.logger.Error("failed to process message",
                    zap.Error(err),
                    zap.String("topic", msg.Topic),
                    zap.Int64("offset", msg.Offset),
                )
                // Don't commit — will retry
                continue
            }

            if err := c.reader.CommitMessages(ctx, msg); err != nil {
                c.logger.Error("failed to commit message", zap.Error(err))
            }
        }
    }
}

func (c *OrderEventConsumer) processMessage(ctx context.Context, msg kafka.Message) error {
    var envelope EventEnvelope
    if err := json.Unmarshal(msg.Value, &envelope); err != nil {
        return fmt.Errorf("failed to unmarshal envelope: %w", err)
    }

    switch envelope.Type {
    case "order.created":
        var event OrderCreatedEvent
        if err := json.Unmarshal(envelope.Data, &event); err != nil {
            return err
        }
        return c.handler.HandleOrderCreated(ctx, event)

    case "order.cancelled":
        var event OrderCancelledEvent
        if err := json.Unmarshal(envelope.Data, &event); err != nil {
            return err
        }
        return c.handler.HandleOrderCancelled(ctx, event)

    default:
        c.logger.Warn("unknown event type", zap.String("type", envelope.Type))
        return nil // Don't fail on unknown events
    }
}
```

### Circuit Breaker Pattern

Prevent cascading failures with circuit breakers:

```go
// pkg/circuitbreaker/breaker.go
package circuitbreaker

import (
    "context"
    "errors"
    "sync"
    "time"
)

var ErrCircuitOpen = errors.New("circuit breaker is open")

type State int

const (
    StateClosed State = iota
    StateOpen
    StateHalfOpen
)

type CircuitBreaker struct {
    mu sync.RWMutex

    state          State
    failures       int
    successes      int
    lastFailure    time.Time

    maxFailures    int
    timeout        time.Duration
    halfOpenMax    int
}

func New(maxFailures int, timeout time.Duration) *CircuitBreaker {
    return &CircuitBreaker{
        state:       StateClosed,
        maxFailures: maxFailures,
        timeout:     timeout,
        halfOpenMax: 3,
    }
}

func (cb *CircuitBreaker) Execute(ctx context.Context, fn func() error) error {
    if !cb.canExecute() {
        return ErrCircuitOpen
    }

    err := fn()

    cb.recordResult(err)

    return err
}

func (cb *CircuitBreaker) canExecute() bool {
    cb.mu.RLock()
    defer cb.mu.RUnlock()

    switch cb.state {
    case StateClosed:
        return true
    case StateOpen:
        if time.Since(cb.lastFailure) > cb.timeout {
            cb.mu.RUnlock()
            cb.mu.Lock()
            cb.state = StateHalfOpen
            cb.successes = 0
            cb.mu.Unlock()
            cb.mu.RLock()
            return true
        }
        return false
    case StateHalfOpen:
        return true
    }
    return false
}

func (cb *CircuitBreaker) recordResult(err error) {
    cb.mu.Lock()
    defer cb.mu.Unlock()

    if err != nil {
        cb.failures++
        cb.lastFailure = time.Now()

        if cb.state == StateHalfOpen || cb.failures >= cb.maxFailures {
            cb.state = StateOpen
        }
    } else {
        if cb.state == StateHalfOpen {
            cb.successes++
            if cb.successes >= cb.halfOpenMax {
                cb.state = StateClosed
                cb.failures = 0
            }
        } else {
            cb.failures = 0
        }
    }
}
```

---

## 6. Observability: Logs, Metrics, Traces

### The Three Pillars

```
┌─────────────────────────────────────────────────────────────┐
│                    Observability Stack                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   LOGS              METRICS           TRACES                 │
│   ────              ───────           ──────                 │
│   What happened?    How much?         Where?                 │
│                                                              │
│   • Error details   • Request rate    • Request flow         │
│   • Debug info      • Latency p99     • Service deps         │
│   • Audit trail     • Error rate      • Bottlenecks          │
│                                                              │
│   ┌─────────┐       ┌─────────┐       ┌─────────┐           │
│   │  Loki   │       │Prometheus│      │  Jaeger │           │
│   │  (ELK)  │       │(InfluxDB)│      │ (Zipkin)│           │
│   └─────────┘       └─────────┘       └─────────┘           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Structured Logging with Zap

```go
// pkg/logger/logger.go
package logger

import (
    "context"
    "os"

    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

type ctxKey struct{}

func New(level string) (*zap.Logger, error) {
    var lvl zapcore.Level
    if err := lvl.UnmarshalText([]byte(level)); err != nil {
        lvl = zapcore.InfoLevel
    }

    config := zap.Config{
        Level:       zap.NewAtomicLevelAt(lvl),
        Development: false,
        Encoding:    "json",
        EncoderConfig: zapcore.EncoderConfig{
            TimeKey:        "timestamp",
            LevelKey:       "level",
            NameKey:        "logger",
            CallerKey:      "caller",
            FunctionKey:    zapcore.OmitKey,
            MessageKey:     "message",
            StacktraceKey:  "stacktrace",
            LineEnding:     zapcore.DefaultLineEnding,
            EncodeLevel:    zapcore.LowercaseLevelEncoder,
            EncodeTime:     zapcore.ISO8601TimeEncoder,
            EncodeDuration: zapcore.MillisDurationEncoder,
            EncodeCaller:   zapcore.ShortCallerEncoder,
        },
        OutputPaths:      []string{"stdout"},
        ErrorOutputPaths: []string{"stderr"},
    }

    return config.Build()
}

// WithContext adds logger to context
func WithContext(ctx context.Context, logger *zap.Logger) context.Context {
    return context.WithValue(ctx, ctxKey{}, logger)
}

// FromContext retrieves logger from context
func FromContext(ctx context.Context) *zap.Logger {
    if logger, ok := ctx.Value(ctxKey{}).(*zap.Logger); ok {
        return logger
    }
    return zap.NewNop()
}

// WithFields adds fields to the logger in context
func WithFields(ctx context.Context, fields ...zap.Field) context.Context {
    return WithContext(ctx, FromContext(ctx).With(fields...))
}
```

### OpenTelemetry Integration

```go
// pkg/telemetry/tracer.go
package telemetry

import (
    "context"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
)

func InitTracer(ctx context.Context, serviceName, endpoint string) (*sdktrace.TracerProvider, error) {
    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint(endpoint),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName(serviceName),
            semconv.ServiceVersion("1.0.0"),
        ),
    )
    if err != nil {
        return nil, err
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(res),
        sdktrace.WithSampler(sdktrace.AlwaysSample()),
    )

    otel.SetTracerProvider(tp)
    otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
        propagation.TraceContext{},
        propagation.Baggage{},
    ))

    return tp, nil
}
```

For a deep dive, read our [From Trace to Insight: A Closed-Loop Observability Practice for Go Projects](/golang/From-Trace-to-Insight-A-Closed-Loop-Observability-Practice-for-Go-Projects).

---

## 7. Error Handling in Distributed Systems

### Domain Errors

```go
// internal/domain/errors.go
package domain

import "errors"

// Sentinel errors for common cases
var (
    ErrOrderNotFound     = errors.New("order not found")
    ErrInvalidOrder      = errors.New("invalid order")
    ErrInsufficientStock = errors.New("insufficient stock")
    ErrPaymentFailed     = errors.New("payment failed")
)

// OrderError wraps errors with order context
type OrderError struct {
    OrderID string
    Op      string // Operation that failed
    Err     error
}

func (e *OrderError) Error() string {
    return fmt.Sprintf("order %s: %s: %v", e.OrderID, e.Op, e.Err)
}

func (e *OrderError) Unwrap() error {
    return e.Err
}

// NewOrderError creates a new order error
func NewOrderError(orderID, op string, err error) *OrderError {
    return &OrderError{
        OrderID: orderID,
        Op:      op,
        Err:     err,
    }
}
```

### Retry with Exponential Backoff

```go
// pkg/retry/retry.go
package retry

import (
    "context"
    "math"
    "math/rand"
    "time"
)

type Config struct {
    MaxRetries  int
    InitialWait time.Duration
    MaxWait     time.Duration
    Multiplier  float64
}

func DefaultConfig() Config {
    return Config{
        MaxRetries:  3,
        InitialWait: 100 * time.Millisecond,
        MaxWait:     10 * time.Second,
        Multiplier:  2.0,
    }
}

func Do(ctx context.Context, cfg Config, fn func() error) error {
    var lastErr error

    for attempt := 0; attempt <= cfg.MaxRetries; attempt++ {
        if err := fn(); err == nil {
            return nil
        } else {
            lastErr = err
        }

        if attempt == cfg.MaxRetries {
            break
        }

        // Calculate wait time with jitter
        wait := float64(cfg.InitialWait) * math.Pow(cfg.Multiplier, float64(attempt))
        wait = math.Min(wait, float64(cfg.MaxWait))
        jitter := rand.Float64() * 0.3 * wait // 30% jitter
        waitDuration := time.Duration(wait + jitter)

        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-time.After(waitDuration):
        }
    }

    return fmt.Errorf("max retries exceeded: %w", lastErr)
}
```

For more on error handling, see [Go Error Handling Best Practices 2025](/golang/Go-Error-Handling-Best-Practices-2025-Complete-Guide).

---

## 8. Security Best Practices

### Authentication with JWT

```go
// pkg/auth/jwt.go
package auth

import (
    "context"
    "errors"
    "time"

    "github.com/golang-jwt/jwt/v5"
)

var (
    ErrInvalidToken = errors.New("invalid token")
    ErrExpiredToken = errors.New("token expired")
)

type Claims struct {
    UserID string   `json:"user_id"`
    Roles  []string `json:"roles"`
    jwt.RegisteredClaims
}

type JWTAuth struct {
    secretKey []byte
    issuer    string
    ttl       time.Duration
}

func NewJWTAuth(secretKey string, issuer string, ttl time.Duration) *JWTAuth {
    return &JWTAuth{
        secretKey: []byte(secretKey),
        issuer:    issuer,
        ttl:       ttl,
    }
}

func (a *JWTAuth) GenerateToken(userID string, roles []string) (string, error) {
    now := time.Now()
    claims := Claims{
        UserID: userID,
        Roles:  roles,
        RegisteredClaims: jwt.RegisteredClaims{
            Issuer:    a.issuer,
            Subject:   userID,
            IssuedAt:  jwt.NewNumericDate(now),
            ExpiresAt: jwt.NewNumericDate(now.Add(a.ttl)),
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(a.secretKey)
}

func (a *JWTAuth) ValidateToken(tokenString string) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, ErrInvalidToken
        }
        return a.secretKey, nil
    })

    if err != nil {
        if errors.Is(err, jwt.ErrTokenExpired) {
            return nil, ErrExpiredToken
        }
        return nil, ErrInvalidToken
    }

    claims, ok := token.Claims.(*Claims)
    if !ok || !token.Valid {
        return nil, ErrInvalidToken
    }

    return claims, nil
}
```

### gRPC Interceptor for Auth

```go
// internal/transport/grpc/interceptor.go
package grpc

import (
    "context"
    "strings"

    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/metadata"
    "google.golang.org/grpc/status"

    "github.com/yourorg/order-service/pkg/auth"
)

func AuthInterceptor(jwtAuth *auth.JWTAuth) grpc.UnaryServerInterceptor {
    return func(
        ctx context.Context,
        req interface{},
        info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler,
    ) (interface{}, error) {
        // Skip auth for health checks
        if info.FullMethod == "/grpc.health.v1.Health/Check" {
            return handler(ctx, req)
        }

        // Extract token from metadata
        md, ok := metadata.FromIncomingContext(ctx)
        if !ok {
            return nil, status.Error(codes.Unauthenticated, "missing metadata")
        }

        authHeader := md.Get("authorization")
        if len(authHeader) == 0 {
            return nil, status.Error(codes.Unauthenticated, "missing authorization header")
        }

        token := strings.TrimPrefix(authHeader[0], "Bearer ")
        claims, err := jwtAuth.ValidateToken(token)
        if err != nil {
            return nil, status.Error(codes.Unauthenticated, "invalid token")
        }

        // Add claims to context
        ctx = auth.WithClaims(ctx, claims)

        return handler(ctx, req)
    }
}
```

For more security patterns, see [10 Golang Security Gotchas — And the Fixes That Actually Work](/golang/10-Golang-Security-Gotchas-And-the-Fixes-That-Actually-Work-en).

---

## 9. Deployment & Kubernetes

### Optimized Dockerfile

```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /server ./cmd/server

# Runtime stage
FROM alpine:3.18

# Security: non-root user
RUN adduser -D -g '' appuser

WORKDIR /app

# Copy binary
COPY --from=builder /server .

# Use non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

EXPOSE 8080 9090

ENTRYPOINT ["./server"]
```

### Kubernetes Deployment

```yaml
# deployments/k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  labels:
    app: order-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: order-service
          image: yourorg/order-service:latest
          ports:
            - containerPort: 8080
              name: http
            - containerPort: 9090
              name: grpc
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: order-service-secrets
                  key: database-url
            - name: JAEGER_ENDPOINT
              value: "jaeger-collector.observability:14268"
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
          securityContext:
            runAsNonRoot: true
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
---
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  selector:
    app: order-service
  ports:
    - name: http
      port: 80
      targetPort: 8080
    - name: grpc
      port: 9090
      targetPort: 9090
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

For container optimization, see [Go Containerization Best Practices: From 800MB to 10MB Docker Images](/golang/Go-Containerization-Best-Practices-Docker-Optimization).

---

## 10. Real-World Architecture Example

### E-Commerce Platform Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         E-Commerce Microservices                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         API Gateway (Kong/Envoy)                     │   │
│   │                    • Rate Limiting • Auth • Routing                  │   │
│   └───────────────────────────────┬─────────────────────────────────────┘   │
│                                   │                                          │
│   ┌───────────────────────────────┼───────────────────────────────────┐     │
│   │                               │                                    │     │
│   ▼                               ▼                                    ▼     │
│ ┌─────────────┐            ┌─────────────┐                    ┌─────────────┐│
│ │   User      │            │   Order     │                    │   Catalog   ││
│ │   Service   │            │   Service   │                    │   Service   ││
│ │   (Go)      │            │   (Go)      │                    │   (Go)      ││
│ └──────┬──────┘            └──────┬──────┘                    └──────┬──────┘│
│        │                          │                                  │       │
│   ┌────┴────┐                ┌────┴────┐                        ┌────┴────┐  │
│   │PostgreSQL│               │PostgreSQL│                       │  MongoDB │  │
│   └─────────┘                └─────────┘                        └─────────┘  │
│                                   │                                          │
│                                   │ Events                                   │
│                                   ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         Kafka / NATS                                 │   │
│   └───────────────────────────────┬─────────────────────────────────────┘   │
│                                   │                                          │
│   ┌───────────────────────────────┼───────────────────────────────────┐     │
│   │                               │                                    │     │
│   ▼                               ▼                                    ▼     │
│ ┌─────────────┐            ┌─────────────┐                    ┌─────────────┐│
│ │   Payment   │            │  Inventory  │                    │Notification ││
│ │   Service   │            │   Service   │                    │   Service   ││
│ │   (Go)      │            │   (Go)      │                    │   (Go)      ││
│ └──────┬──────┘            └──────┬──────┘                    └─────────────┘│
│        │                          │                                          │
│   ┌────┴────┐                ┌────┴────┐                                     │
│   │PostgreSQL│               │  Redis   │                                    │
│   └─────────┘                └─────────┘                                     │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     Observability Stack                              │   │
│   │              Prometheus + Grafana + Jaeger + Loki                    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **API Gateway** | Kong/Envoy | Centralized auth, rate limiting, observability |
| **Service Communication** | gRPC (internal), REST (external) | Performance + compatibility |
| **Event Bus** | Kafka | Durability, replay, high throughput |
| **Database** | PostgreSQL (transactional), MongoDB (catalog), Redis (cache) | Right tool for each job |
| **Observability** | OpenTelemetry → Jaeger/Prometheus/Loki | Unified instrumentation |

---

## Summary: Your Go Microservices Checklist

Before deploying your microservice to production, ensure you have:

### ✅ Architecture
- [ ] Clear service boundaries (DDD)
- [ ] Database per service
- [ ] API versioning strategy

### ✅ Code Quality
- [ ] Structured project layout
- [ ] Repository pattern for data access
- [ ] Domain errors with proper wrapping

### ✅ Communication
- [ ] gRPC for internal, REST for external
- [ ] Event-driven for async workflows
- [ ] Circuit breakers for resilience

### ✅ Observability
- [ ] Structured logging (JSON)
- [ ] Metrics (Prometheus)
- [ ] Distributed tracing (OpenTelemetry)

### ✅ Security
- [ ] JWT authentication
- [ ] Input validation
- [ ] Secret management (not in code!)

### ✅ Deployment
- [ ] Multi-stage Dockerfile
- [ ] Health checks (liveness + readiness)
- [ ] Resource limits
- [ ] Horizontal Pod Autoscaler

---

## Further Reading

- [Go Error Handling Best Practices 2025](/golang/Go-Error-Handling-Best-Practices-2025-Complete-Guide)
- [10 Golang Security Gotchas](/golang/10-Golang-Security-Gotchas-And-the-Fixes-That-Actually-Work-en)
- [From Trace to Insight: Observability for Go Projects](/golang/From-Trace-to-Insight-A-Closed-Loop-Observability-Practice-for-Go-Projects)
- [Go Containerization Best Practices](/golang/Go-Containerization-Best-Practices-Docker-Optimization)
- [Best Go Web Frameworks 2025](/golang/Best-Go-Web-Frameworks-2025-Comprehensive-Developers-Guide)
- [Building RAG System with Golang](/golang/Building-RAG-System-with-Golang-OpenAI-Vector-Database)

---

**Have questions?** Check out our [Golang Technical Hub](/golang/) for more production-ready Go content.

