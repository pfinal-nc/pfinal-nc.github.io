---
title: Docker Go Project Deployment Practice Guide - Complete Containerization Tutorial
date: 2022-07-06 15:35:40
author: PFinal南丞
tags:
  - tools
  - Docker
  - Go
  - deployment
  - containerization
description: Complete guide to containerizing and deploying Go web applications with Docker. Learn multi-stage builds, image optimization, private registry setup, and production deployment best practices.
keywords: Docker, deployment, Go, project, practice, guide, containerization, multi-stage build, Dockerfile, Go deployment, production deployment, Docker best practices
---

# Docker Go Project Deployment Practice Guide - Complete Containerization Tutorial

## Introduction

Docker has become the de facto standard for containerizing applications, and Go's single binary output makes it an ideal candidate for containerization. This comprehensive guide will walk you through the entire process of containerizing a Go web application, from writing the code to deploying it in production.

By the end of this guide, you'll understand:
- How to write a Go web application
- How to create optimized Docker images using multi-stage builds
- How to set up and use a private Docker registry
- How to deploy containers in production environments
- Best practices for Go containerization

---

## Prerequisites

Before starting, ensure you have:
- Go 1.16+ installed
- Docker installed and running
- Basic knowledge of Go and Docker
- A Linux server (for production deployment)

---

## Step 1: Prepare Go Web Application

### Basic Go Web Server

Let's start with a simple Go web application that we'll containerize:

```go
package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func sayHello(w http.ResponseWriter, r *http.Request) {
	hostname, _ := os.Hostname()
	response := fmt.Sprintf("Hello from PFinalClub! Running on: %s", hostname)
	fmt.Fprintf(w, response)
}

func getConfig(w http.ResponseWriter, r *http.Request) {
	appId := r.FormValue("app_id")
	if appId == "" {
		http.Error(w, "Please provide app_id parameter", http.StatusBadRequest)
		return
	}
	response := fmt.Sprintf("Configuration for app_id: %s", appId)
	fmt.Fprintf(w, response)
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, "OK")
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8989"
	}

	http.HandleFunc("/", sayHello)
	http.HandleFunc("/get_config", getConfig)
	http.HandleFunc("/health", healthCheck)
	
	log.Printf("[Go Web Server] Starting on port %s", port)
	if err := http.ListenAndServe("0.0.0.0:"+port, nil); err != nil {
		log.Fatal("ListenAndServe failed: ", err)
	}
}
```

### Project Structure

Create the following project structure:

```
go-web-app/
├── main.go
├── go.mod
├── Dockerfile
└── .dockerignore
```

### Initialize Go Module

```bash
go mod init go-web-app
go mod tidy
```

### Create .dockerignore

```dockerfile
# .dockerignore
*.md
.git
.gitignore
.env
*.log
.DS_Store
```

This prevents unnecessary files from being copied into the Docker image, reducing build time and image size.

## Step 2: Create Optimized Dockerfile

### Multi-Stage Build Strategy

Multi-stage builds are essential for Go applications because they allow us to:
- Use a full Go environment for building
- Create a minimal final image with only the binary
- Reduce image size by 90%+ compared to using golang:alpine directly

### Complete Dockerfile

```dockerfile
# Stage 1: Build stage
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Set working directory
WORKDIR /build

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies (cached layer)
RUN go mod download

# Copy source code
COPY . .

# Set build arguments
ARG CGO_ENABLED=0
ARG GOOS=linux
ARG GOARCH=amd64

# Build the application
RUN CGO_ENABLED=${CGO_ENABLED} GOOS=${GOOS} GOARCH=${GOARCH} \
    go build -a -installsuffix cgo -ldflags="-w -s" -o app .

# Stage 2: Runtime stage
FROM scratch

# Copy CA certificates for HTTPS
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy timezone data
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy the binary
COPY --from=builder /build/app /app

# Expose port
EXPOSE 8989

# Set entrypoint
ENTRYPOINT ["/app"]
```

### Dockerfile Explanation

**Stage 1 (Builder)**:
- Uses `golang:1.21-alpine` for building (smaller than full golang image)
- Installs git and certificates needed for dependencies
- Downloads dependencies separately (cached layer for faster rebuilds)
- Builds with optimizations: `-ldflags="-w -s"` removes debug info

**Stage 2 (Runtime)**:
- Uses `scratch` (empty image, ~0MB)
- Only copies the binary and essential files
- Results in ~10-15MB final image (vs 300MB+ with golang:alpine)

### Alternative: Using distroless

For better security while keeping small size:

```dockerfile
# Stage 2 alternative
FROM gcr.io/distroless/static-debian11:nonroot

COPY --from=builder /build/app /app

EXPOSE 8989

ENTRYPOINT ["/app"]
```

**Benefits of distroless**:
- No shell or package manager (reduces attack surface)
- Still very small (~20MB)
- Better security than scratch (has some base libraries)

## Step 3: Build and Test Docker Image

### Build the Image

```bash
# Basic build
docker build -t go-web-app:latest .

# Build with tags
docker build -t go-web-app:v1.0.0 -t go-web-app:latest .

# Build with build arguments
docker build --build-arg GOARCH=arm64 -t go-web-app:arm64 .
```

### Verify Image Size

```bash
docker images go-web-app
```

You should see a very small image (10-20MB) compared to using golang:alpine directly (300MB+).

### Run Container Locally

```bash
# Run in foreground
docker run -p 8989:8989 go-web-app:latest

# Run in background (detached)
docker run -d -p 8989:8989 --name go-web-app go-web-app:latest

# Run with environment variables
docker run -d -p 8989:8989 -e PORT=8989 --name go-web-app go-web-app:latest
```

### Test the Application

```bash
# Test hello endpoint
curl http://localhost:8989

# Test config endpoint
curl "http://localhost:8989/get_config?app_id=test123"

# Test health check
curl http://localhost:8989/health
```

### View Container Logs

```bash
docker logs go-web-app
docker logs -f go-web-app  # Follow logs
```

### Stop and Remove Container

```bash
docker stop go-web-app
docker rm go-web-app
```

### Tag the Image and Push to Private Registry

```
docker tag web:latest 172.31.1.40:5000/pfinalclub/web:v1

docker push 172.31.1.40:5000/pfinalclub/web:v1
```

> 172.31.1.40:5000 is the private registry address

[Docker Private Registry Setup](https://yeasy.gitbook.io/docker_practice/repository/registry)

### Check if the Registry Has the Image

```
curl http://172.31.1.40:5000/v2/_catalog
```
Output:

```
{"repositories":["pfinalclub/web"]}
```

### Pull and Run the Image on the Server

- Pull the image

```
docker pull 172.31.1.40:5000/pfinalclub/web:v1
```
- Run the image container

```
docker run -p 8981:8981 127.0.0.1:5000/pfinalclub/web

docker run -p 8981:8982 127.0.0.1:5000/pfinalclub/web
``` 