---
title: "Lesson 2.6: gRPC 入门"
description: "Protocol Buffers、服务定义、客户端/服务端实现"
date: 2026-05-26
author: PFinal南丞
category: 课程
tags: [golang, course, grpc, protobuf, lesson]
---

# Lesson 2.6: gRPC 入门

## 学习目标

- 理解 gRPC 的通信模型
- 掌握 Protocol Buffers 的定义

---

## 1. Protocol Buffers

```protobuf
syntax = "proto3";

package user;

option go_package = "./pb;pb";

service UserService {
    rpc GetUser (GetUserRequest) returns (User);
    rpc ListUsers (ListUsersRequest) returns (ListUsersResponse);
    rpc CreateUser (CreateUserRequest) returns (User);
}

message User {
    string id = 1;
    string name = 2;
    string email = 3;
    int32 age = 4;
}

message GetUserRequest {
    string id = 1;
}
```

```bash
# 生成 Go 代码
protoc --go_out=. --go-grpc_out=. user.proto
```

## 2. 服务端实现

```go
type userServer struct {
    pb.UnimplementedUserServiceServer
}

func (s *userServer) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.User, error) {
    // 业务逻辑
    return &pb.User{
        Id:    req.Id,
        Name:  "Alice",
        Email: "alice@example.com",
    }, nil
}

func main() {
    lis, _ := net.Listen("tcp", ":50051")
    s := grpc.NewServer()
    pb.RegisterUserServiceServer(s, &userServer{})
    s.Serve(lis)
}
```

## 3. 客户端调用

```go
func main() {
    conn, _ := grpc.Dial("localhost:50051", grpc.WithTransportCredentials(insecure.NewCredentials()))
    defer conn.Close()

    client := pb.NewUserServiceClient(conn)
    user, _ := client.GetUser(context.Background(), &pb.GetUserRequest{Id: "1"})
    fmt.Printf("User: %+v\n", user)
}
```

## 推荐阅读

- [grpc-in-go](/dev/backend/golang/grpc-in-go)
- [grpc-protobuf-guide](/dev/backend/golang/grpc-protobuf-guide)
