---
title: "Docker部署Go项目实践指南"
date: 2022-07-06 15:35:40
author: "PFinal南丞"
tags:
  - 工具
  - Docker
description: "Docker部署Go项目实践指南"
keywords: Docker, Go部署, 容器化, Dockerfile, 多阶段构建, Go项目部署, 镜像优化, DevOps
---

# Docker部署Go项目实践指南

### 准备 GoWeb 代码

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
		_, _ = fmt.Fprintf(w, "请传递参数")
		return
	}
	_, _ = fmt.Fprintf(w, "获取对应的配置:" + appId)
}

func main() {
	http.HandleFunc("/", sayHello) //注册URI路径与相应的处理函数
	http.HandleFunc("/get_config", getConfig) //注册URI路径与相应的处理函数
	log.Println("【默认项目】服务启动成功 监听端口 8989")
	er := http.ListenAndServe("0.0.0.0:8989", nil)
	if er != nil {
		log.Fatal("ListenAndServe: ", er)
	}
}

```
> 上面的代码通过8989端口对外提供服务。

### 编写 Dockerfile

> 分阶段构建,通过仅保留二进制文件来减小镜像大小.使用分阶段构建技术，剥离了使用golang:alpine作为编译镜像来编译得到二进制可执行文件的过程，并基于scratch生成一个简单的、非常小的新镜像

```Dockerfile
FROM golang:alpine AS builder

# 为我们的镜像设置必要的环境变量
ENV GO111MODULE=on \
    CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64

# 移动到工作目录：/build
WORKDIR /build

# 将代码复制到容器中
COPY . .

RUN go mod init app && go mod tidy

# 将我们的代码编译成二进制可执行文件app
RUN go build -o app .

# 移动到用于存放生成的二进制文件的 /dist 目录
WORKDIR /dist

# 将二进制文件从 /build 目录复制到这里
RUN cp /build/app .

## 声明服务端口
#EXPOSE 8989
#
## 启动容器时运行的命令
#CMD ["/dist/app"]

###################
# 接下来创建一个小镜像
###################
FROM scratch
# 从builder镜像中把/dist/app 拷贝到当前目录
COPY --from=builder /build/app /
EXPOSE 8989
# 需要运行的命令
ENTRYPOINT ["/app"]

```

### 构建镜像 

```shell
docker build . -t web
```
构建完成后,本地运行,然后 测试一下:

```shell
docker run -p 8989:8989 web

```

```
curl http://172.31.1.40:8989 

```
输出: *Hello PFinal*

### 给镜像打标签 然后上传到 私有镜像仓库

```
docker tag web:latest 172.31.1.40:5000/pfinalclub/web:v1

docker push 172.31.1.40:5000/pfinalclub/web:v1

```

> 172.31.1.40:5000  是私有仓库地址

[Docker 搭建私有化](https://yeasy.gitbook.io/docker_practice/repository/registry)


### 查看仓库是否有镜像

```
curl http://172.31.1.40:5000/v2/_catalog
```
输出:

```
{"repositories":["pfinalclub/web"]}
```

### 服务器拉取镜像运行

- 拉取镜像

```
docker pull 172.31.1.40:5000/pfinalclub/web:v1

```
- 运行镜像容器

```
docker run -p 8981:8981 127.0.0.1:5000/pfinalclub/web

docker run -p 8981:8982 127.0.0.1:5000/pfinalclub/web

```

