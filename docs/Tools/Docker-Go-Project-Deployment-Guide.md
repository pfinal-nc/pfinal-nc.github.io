---
title: Docker Go Project Deployment Practice Guide
date: 2022-07-06 15:35:40
author: PFinal南丞
tags:
  - tools
  - Docker
description: Docker Go project deployment practice guide
keywords: Docker, deployment, Go, project, practice, guide, AI, ai
---

# Docker Go Project Deployment Practice Guide

### Prepare Go Web Code

```Go
package main

import (
	"fmt"
	"log"
	"net/http"
)

func sayHello(w http.ResponseWriter, r *http.Request) {
	_, _ = fmt.Fprintf(w, "Hello PFinal")
}
func getConfig(w http.ResponseWriter, r *http.Request) {
	appId := r.FormValue("app_id")
	if appId == "" {
		_, _ = fmt.Fprintf(w, "Please provide a parameter")
		return
	}
	_, _ = fmt.Fprintf(w, "Get corresponding config: " + appId)
}

func main() {
	http.HandleFunc("/", sayHello)
	http.HandleFunc("/get_config", getConfig)
	log.Println("[Default Project] Service started successfully, listening on port 8989")
	er := http.ListenAndServe("0.0.0.0:8989", nil)
	if er != nil {
		log.Fatal("ListenAndServe: ", er)
	}
}
```
> The above code provides services externally via port 8989.

### Write Dockerfile

> Multi-stage build, only keeping the binary file to reduce image size. Use golang:alpine as the build image to compile the binary, then use scratch to generate a simple and very small new image.

```Dockerfile
FROM golang:alpine AS builder

# Set necessary environment variables for our image
ENV GO111MODULE=on \
    CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64

WORKDIR /build

COPY . .

RUN go mod init app && go mod tidy

RUN go build -o app .

WORKDIR /dist

RUN cp /build/app .

# EXPOSE 8989
# CMD ["/dist/app"]

###################
# Create a small image
###################
FROM scratch
COPY --from=builder /build/app /
EXPOSE 8989
ENTRYPOINT ["/app"]
```

### Build Image

```shell
docker build . -t web
```
After building, run locally and test:

```shell
docker run -p 8989:8989 web
```

```
curl http://172.31.1.40:8989 
```
Output: *Hello PFinal*

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