---
title: gRPC 在 Go 中的实战应用
date: 2026-04-24
category: dev/backend/golang
tags:
  - Go
  - gRPC
  - Protocol Buffers
  - 微服务
description: 从零开始学习 gRPC 在 Go 中的应用，包括 Protocol Buffers 定义、服务实现、拦截器、流式通信等核心内容。
---

# gRPC 在 Go 中的实战应用

gRPC 是 Google 开源的高性能 RPC 框架，使用 Protocol Buffers 作为接口描述语言，是微服务间通信的优秀选择。

## 为什么选择 gRPC？

| 特性 | gRPC | REST |
|------|------|------|
| 协议 | HTTP/2 | HTTP/1.1 |
| 序列化 | Protocol Buffers（二进制）| JSON（文本）|
| 性能 | 高（更小的消息体）| 较低 |
| 流式支持 | 原生支持 | 需要 WebSocket |
| 类型安全 | 强类型（代码生成）| 弱类型 |
| 适用场景 | 内部服务通信 | 公开 API |

## 环境准备

```bash
# 安装 protoc 编译器
brew install protobuf  # macOS

# 安装 Go 插件
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# 确保 PATH 包含 GOPATH/bin
export PATH="$PATH:$(go env GOPATH)/bin"
```

## 定义 Proto 文件

创建 `proto/user.proto`：

```protobuf
syntax = "proto3";

package user;
option go_package = "github.com/yourname/myapp/proto/user";

// 用户服务
service UserService {
  // 获取用户信息（一元调用）
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
  
  // 创建用户
  rpc CreateUser(CreateUserRequest) returns (CreateUserResponse);
  
  // 批量获取用户（服务端流式）
  rpc ListUsers(ListUsersRequest) returns (stream User);
  
  // 上传用户数据（客户端流式）
  rpc UploadUsers(stream User) returns (UploadResponse);
  
  // 双向流式
  rpc Chat(stream ChatMessage) returns (stream ChatMessage);
}

message User {
  int64 id = 1;
  string name = 2;
  string email = 3;
  int32 age = 4;
  UserStatus status = 5;
  repeated string tags = 6;
}

enum UserStatus {
  UNKNOWN = 0;
  ACTIVE = 1;
  INACTIVE = 2;
  BANNED = 3;
}

message GetUserRequest {
  int64 id = 1;
}

message GetUserResponse {
  User user = 1;
}

message CreateUserRequest {
  string name = 1;
  string email = 2;
  int32 age = 3;
}

message CreateUserResponse {
  User user = 1;
  string message = 2;
}

message ListUsersRequest {
  int32 page_size = 1;
  string page_token = 2;
  UserStatus status_filter = 3;
}

message UploadResponse {
  int32 total_uploaded = 1;
  int32 success_count = 2;
  repeated string errors = 3;
}

message ChatMessage {
  int64 user_id = 1;
  string content = 2;
  int64 timestamp = 3;
}
```

## 生成代码

```bash
protoc --go_out=. --go_opt=paths=source_relative \
       --go-grpc_out=. --go-grpc_opt=paths=source_relative \
       proto/user.proto
```

## 实现服务端

```go
package server

import (
    "context"
    "fmt"
    "io"
    "log"
    "net"
    "time"

    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
    
    pb "github.com/yourname/myapp/proto/user"
)

// UserServer 实现 UserService 接口
type UserServer struct {
    pb.UnimplementedUserServiceServer
    users map[int64]*pb.User
}

func NewUserServer() *UserServer {
    return &UserServer{
        users: make(map[int64]*pb.User),
    }
}

// GetUser 一元调用
func (s *UserServer) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.GetUserResponse, error) {
    user, ok := s.users[req.Id]
    if !ok {
        return nil, status.Errorf(codes.NotFound, "用户 %d 不存在", req.Id)
    }
    return &pb.GetUserResponse{User: user}, nil
}

// CreateUser 创建用户
func (s *UserServer) CreateUser(ctx context.Context, req *pb.CreateUserRequest) (*pb.CreateUserResponse, error) {
    // 参数验证
    if req.Name == "" {
        return nil, status.Error(codes.InvalidArgument, "用户名不能为空")
    }
    if req.Email == "" {
        return nil, status.Error(codes.InvalidArgument, "邮箱不能为空")
    }

    // 创建用户
    id := int64(len(s.users) + 1)
    user := &pb.User{
        Id:     id,
        Name:   req.Name,
        Email:  req.Email,
        Age:    req.Age,
        Status: pb.UserStatus_ACTIVE,
    }
    s.users[id] = user

    return &pb.CreateUserResponse{
        User:    user,
        Message: "用户创建成功",
    }, nil
}

// ListUsers 服务端流式
func (s *UserServer) ListUsers(req *pb.ListUsersRequest, stream pb.UserService_ListUsersServer) error {
    for _, user := range s.users {
        // 检查 context 是否已取消
        if err := stream.Context().Err(); err != nil {
            return status.Error(codes.Canceled, "请求已取消")
        }

        // 过滤
        if req.StatusFilter != pb.UserStatus_UNKNOWN && user.Status != req.StatusFilter {
            continue
        }

        // 发送用户数据
        if err := stream.Send(user); err != nil {
            return fmt.Errorf("发送数据失败: %w", err)
        }
        
        time.Sleep(10 * time.Millisecond) // 模拟处理时间
    }
    return nil
}

// UploadUsers 客户端流式
func (s *UserServer) UploadUsers(stream pb.UserService_UploadUsersServer) error {
    var totalUploaded, successCount int32
    var errors []string

    for {
        user, err := stream.Recv()
        if err == io.EOF {
            // 客户端发完了，返回汇总结果
            return stream.SendAndClose(&pb.UploadResponse{
                TotalUploaded: totalUploaded,
                SuccessCount:  successCount,
                Errors:        errors,
            })
        }
        if err != nil {
            return fmt.Errorf("接收数据失败: %w", err)
        }

        totalUploaded++
        
        // 保存用户
        if user.Name != "" && user.Email != "" {
            s.users[user.Id] = user
            successCount++
        } else {
            errors = append(errors, fmt.Sprintf("用户 %d 数据不完整", user.Id))
        }
    }
}

// Chat 双向流式
func (s *UserServer) Chat(stream pb.UserService_ChatServer) error {
    for {
        msg, err := stream.Recv()
        if err == io.EOF {
            return nil
        }
        if err != nil {
            return err
        }

        log.Printf("收到来自用户 %d 的消息: %s", msg.UserId, msg.Content)

        // 回复消息
        reply := &pb.ChatMessage{
            UserId:    0, // 服务器 ID
            Content:   fmt.Sprintf("已收到: %s", msg.Content),
            Timestamp: time.Now().Unix(),
        }
        if err := stream.Send(reply); err != nil {
            return err
        }
    }
}

// StartServer 启动 gRPC 服务器
func StartServer(addr string) error {
    lis, err := net.Listen("tcp", addr)
    if err != nil {
        return fmt.Errorf("监听失败: %w", err)
    }

    // 创建 gRPC 服务器，添加拦截器
    s := grpc.NewServer(
        grpc.UnaryInterceptor(loggingInterceptor),
        grpc.StreamInterceptor(streamLoggingInterceptor),
    )

    pb.RegisterUserServiceServer(s, NewUserServer())

    log.Printf("gRPC 服务器启动，监听 %s", addr)
    return s.Serve(lis)
}
```

## 拦截器（Interceptor）

```go
package server

import (
    "context"
    "log"
    "time"

    "google.golang.org/grpc"
)

// 一元调用日志拦截器
func loggingInterceptor(
    ctx context.Context,
    req interface{},
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler,
) (interface{}, error) {
    start := time.Now()
    
    log.Printf("开始调用: %s", info.FullMethod)
    
    resp, err := handler(ctx, req)
    
    duration := time.Since(start)
    if err != nil {
        log.Printf("调用失败: %s, 耗时: %v, 错误: %v", info.FullMethod, duration, err)
    } else {
        log.Printf("调用成功: %s, 耗时: %v", info.FullMethod, duration)
    }
    
    return resp, err
}

// 流式调用日志拦截器
func streamLoggingInterceptor(
    srv interface{},
    ss grpc.ServerStream,
    info *grpc.StreamServerInfo,
    handler grpc.StreamHandler,
) error {
    start := time.Now()
    log.Printf("流开始: %s", info.FullMethod)
    
    err := handler(srv, ss)
    
    log.Printf("流结束: %s, 耗时: %v, 错误: %v", info.FullMethod, time.Since(start), err)
    return err
}

// 认证拦截器
func authInterceptor(
    ctx context.Context,
    req interface{},
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler,
) (interface{}, error) {
    // 从 metadata 中获取 token
    md, ok := metadata.FromIncomingContext(ctx)
    if !ok {
        return nil, status.Error(codes.Unauthenticated, "缺少认证信息")
    }
    
    tokens := md.Get("authorization")
    if len(tokens) == 0 {
        return nil, status.Error(codes.Unauthenticated, "缺少 token")
    }
    
    // 验证 token
    if !validateToken(tokens[0]) {
        return nil, status.Error(codes.PermissionDenied, "token 无效")
    }
    
    return handler(ctx, req)
}
```

## 实现客户端

```go
package client

import (
    "context"
    "io"
    "log"
    "time"

    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    
    pb "github.com/yourname/myapp/proto/user"
)

type UserClient struct {
    client pb.UserServiceClient
    conn   *grpc.ClientConn
}

func NewUserClient(addr string) (*UserClient, error) {
    conn, err := grpc.Dial(addr,
        grpc.WithTransportCredentials(insecure.NewCredentials()),
        grpc.WithUnaryInterceptor(clientLoggingInterceptor),
    )
    if err != nil {
        return nil, err
    }

    return &UserClient{
        client: pb.NewUserServiceClient(conn),
        conn:   conn,
    }, nil
}

func (c *UserClient) Close() {
    c.conn.Close()
}

// 一元调用示例
func (c *UserClient) GetUser(id int64) (*pb.User, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    resp, err := c.client.GetUser(ctx, &pb.GetUserRequest{Id: id})
    if err != nil {
        return nil, err
    }
    return resp.User, nil
}

// 服务端流式示例
func (c *UserClient) ListAllUsers() ([]*pb.User, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    stream, err := c.client.ListUsers(ctx, &pb.ListUsersRequest{
        StatusFilter: pb.UserStatus_ACTIVE,
    })
    if err != nil {
        return nil, err
    }

    var users []*pb.User
    for {
        user, err := stream.Recv()
        if err == io.EOF {
            break
        }
        if err != nil {
            return nil, err
        }
        users = append(users, user)
    }
    return users, nil
}

// 客户端流式示例
func (c *UserClient) UploadUsers(users []*pb.User) (*pb.UploadResponse, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
    defer cancel()

    stream, err := c.client.UploadUsers(ctx)
    if err != nil {
        return nil, err
    }

    for _, user := range users {
        if err := stream.Send(user); err != nil {
            return nil, err
        }
    }

    return stream.CloseAndRecv()
}
```

## TLS 安全通信

```go
import "google.golang.org/grpc/credentials"

// 服务端 TLS
func startTLSServer(addr, certFile, keyFile string) error {
    creds, err := credentials.NewServerTLSFromFile(certFile, keyFile)
    if err != nil {
        return err
    }

    s := grpc.NewServer(grpc.Creds(creds))
    // ... 注册服务
    return s.Serve(lis)
}

// 客户端 TLS
func dialTLS(addr, caFile string) (*grpc.ClientConn, error) {
    creds, err := credentials.NewClientTLSFromFile(caFile, "")
    if err != nil {
        return nil, err
    }

    return grpc.Dial(addr, grpc.WithTransportCredentials(creds))
}
```

## 错误处理最佳实践

```go
import (
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

// 服务端：返回带详细信息的错误
func (s *UserServer) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.GetUserResponse, error) {
    if req.Id <= 0 {
        return nil, status.Errorf(codes.InvalidArgument, "无效的用户 ID: %d", req.Id)
    }
    
    user, ok := s.users[req.Id]
    if !ok {
        return nil, status.Errorf(codes.NotFound, "用户 %d 不存在", req.Id)
    }
    
    return &pb.GetUserResponse{User: user}, nil
}

// 客户端：解析 gRPC 错误
func handleGRPCError(err error) {
    s, ok := status.FromError(err)
    if !ok {
        log.Printf("非 gRPC 错误: %v", err)
        return
    }
    
    switch s.Code() {
    case codes.NotFound:
        log.Printf("资源不存在: %s", s.Message())
    case codes.InvalidArgument:
        log.Printf("参数错误: %s", s.Message())
    case codes.Unauthenticated:
        log.Printf("认证失败: %s", s.Message())
    case codes.Unavailable:
        log.Printf("服务不可用，请重试: %s", s.Message())
    default:
        log.Printf("未知错误 [%s]: %s", s.Code(), s.Message())
    }
}
```

## 总结

gRPC 的核心优势：
- **高性能**：二进制序列化 + HTTP/2 多路复用
- **强类型**：Proto 定义自动生成代码，减少运行时错误
- **流式支持**：原生支持四种通信模式
- **跨语言**：支持几乎所有主流语言

最佳使用场景：
- 内部微服务间的高频通信
- 需要双向流式传输的场景（如实时聊天、监控数据推送）
- 对延迟和吞吐量要求高的系统
