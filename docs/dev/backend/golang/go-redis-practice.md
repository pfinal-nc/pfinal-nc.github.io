---
title: "Go Redis 实践指南"
date: 2026-04-22 00:00:00
author: PFinal南丞
description: "深入学习 Go 语言操作 Redis，掌握连接池、常用数据结构、分布式锁、缓存模式等核心技能，构建高性能缓存系统。"
keywords:
  - Go
  - Redis
  - 缓存
  - 分布式锁
  - go-redis
  - 连接池
tags:
  - golang
  - redis
  - caching
  - distributed-lock
---

# Go Redis 实践指南

Redis 是一个高性能的键值存储系统，常用于缓存、消息队列、实时统计等场景。本文将介绍如何在 Go 项目中高效使用 Redis。

## Redis 基础

### 核心特性

| 特性 | 说明 |
|------|------|
| 内存存储 | 数据存储在内存，读写速度快 |
| 持久化 | 支持 RDB 和 AOF 持久化 |
| 数据结构 | 支持 String、Hash、List、Set、ZSet 等 |
| 高可用 | 支持主从复制、Sentinel、Cluster |
| 原子操作 | 所有操作都是原子性的 |

### 安装 go-redis

```bash
go get github.com/redis/go-redis/v9
```

## 基础操作

### 连接配置

```go
package main

import (
    "context"
    "fmt"
    "time"
    
    "github.com/redis/go-redis/v9"
)

// 创建 Redis 客户端
func NewRedisClient() *redis.Client {
    client := redis.NewClient(&redis.Options{
        Addr:         "localhost:6379",
        Password:     "", // 无密码
        DB:           0,  // 默认数据库
        PoolSize:     100,           // 连接池大小
        MinIdleConns: 10,            // 最小空闲连接
        MaxRetries:   3,             // 最大重试次数
        DialTimeout:  5 * time.Second,
        ReadTimeout:  3 * time.Second,
        WriteTimeout: 3 * time.Second,
        PoolTimeout:  4 * time.Second,
    })
    
    return client
}

// 测试连接
func TestConnection(client *redis.Client) error {
    ctx := context.Background()
    pong, err := client.Ping(ctx).Result()
    if err != nil {
        return err
    }
    fmt.Println("Redis 连接成功:", pong)
    return nil
}
```

### String 操作

```go
package main

import (
    "context"
    "fmt"
    "time"
    
    "github.com/redis/go-redis/v9"
)

func StringOperations(client *redis.Client) {
    ctx := context.Background()
    
    // 设置值
    err := client.Set(ctx, "key", "value", 0).Err()
    if err != nil {
        panic(err)
    }
    
    // 设置带过期时间的值
    err = client.Set(ctx, "temp_key", "temp_value", 10*time.Second).Err()
    
    // 获取值
    val, err := client.Get(ctx, "key").Result()
    if err == redis.Nil {
        fmt.Println("key 不存在")
    } else if err != nil {
        panic(err)
    } else {
        fmt.Println("key:", val)
    }
    
    // 批量设置
    err = client.MSet(ctx, "key1", "value1", "key2", "value2").Err()
    
    // 批量获取
    vals, err := client.MGet(ctx, "key1", "key2").Result()
    
    // 自增
    client.Incr(ctx, "counter")
    client.IncrBy(ctx, "counter", 10)
    client.Decr(ctx, "counter")
    
    // 设置过期时间
    client.Expire(ctx, "key", 5*time.Minute)
    
    // 删除
    client.Del(ctx, "key")
}
```

### Hash 操作

```go
func HashOperations(client *redis.Client) {
    ctx := context.Background()
    
    // 设置单个字段
    client.HSet(ctx, "user:1000", "name", "Alice")
    client.HSet(ctx, "user:1000", "age", "25")
    
    // 批量设置
    client.HMSet(ctx, "user:1001", map[string]interface{}{
        "name": "Bob",
        "age":  30,
        "city": "Beijing",
    })
    
    // 获取单个字段
    name, _ := client.HGet(ctx, "user:1000", "name").Result()
    
    // 获取所有字段
    user, _ := client.HGetAll(ctx, "user:1000").Result()
    fmt.Println(user) // map[name:Alice age:25]
    
    // 判断字段是否存在
    exists, _ := client.HExists(ctx, "user:1000", "name").Result()
    
    // 删除字段
    client.HDel(ctx, "user:1000", "age")
    
    // 获取所有字段名
    fields, _ := client.HKeys(ctx, "user:1000").Result()
    
    // 获取字段数量
    count, _ := client.HLen(ctx, "user:1000").Result()
}
```

### List 操作

```go
func ListOperations(client *redis.Client) {
    ctx := context.Background()
    
    // 从左侧插入
    client.LPush(ctx, "queue", "task1")
    client.LPush(ctx, "queue", "task2")
    
    // 从右侧插入
    client.RPush(ctx, "queue", "task3")
    
    // 从左侧弹出
    task, _ := client.LPop(ctx, "queue").Result()
    
    // 从右侧弹出
    task, _ = client.RPop(ctx, "queue").Result()
    
    // 获取列表范围
    tasks, _ := client.LRange(ctx, "queue", 0, -1).Result()
    
    // 获取列表长度
    length, _ := client.LLen(ctx, "queue").Result()
    
    // 阻塞弹出（用于消息队列）
    result, _ := client.BLPop(ctx, 0, "queue").Result()
}
```

### Set 和 ZSet 操作

```go
func SetOperations(client *redis.Client) {
    ctx := context.Background()
    
    // Set 操作
    client.SAdd(ctx, "tags", "go", "redis", "cache")
    
    // 获取所有成员
    tags, _ := client.SMembers(ctx, "tags").Result()
    
    // 判断成员是否存在
    isMember, _ := client.SIsMember(ctx, "tags", "go").Result()
    
    // 获取集合基数
    count, _ := client.SCard(ctx, "tags").Result()
    
    // 集合运算
    client.SInter(ctx, "set1", "set2")      // 交集
    client.SUnion(ctx, "set1", "set2")      // 并集
    client.SDiff(ctx, "set1", "set2")       // 差集
    
    // ZSet 操作
    client.ZAdd(ctx, "rank", redis.Z{
        Score:  100,
        Member: "player1",
    }, redis.Z{
        Score:  200,
        Member: "player2",
    })
    
    // 获取排名范围
    players, _ := client.ZRangeWithScores(ctx, "rank", 0, -1).Result()
    
    // 获取成员排名
    rank, _ := client.ZRank(ctx, "rank", "player1").Result()
    
    // 增加分数
    client.ZIncrBy(ctx, "rank", 50, "player1")
}
```

## 高级应用

### 分布式锁

```go
package main

import (
    "context"
    "fmt"
    "time"
    
    "github.com/redis/go-redis/v9"
)

// DistributedLock 分布式锁
type DistributedLock struct {
    client *redis.Client
    key    string
    value  string
    ttl    time.Duration
}

// NewDistributedLock 创建分布式锁
func NewDistributedLock(client *redis.Client, key string, ttl time.Duration) *DistributedLock {
    return &DistributedLock{
        client: client,
        key:    key,
        value:  fmt.Sprintf("%d", time.Now().UnixNano()),
        ttl:    ttl,
    }
}

// Lock 获取锁
func (l *DistributedLock) Lock(ctx context.Context) (bool, error) {
    // 使用 SET NX EX 原子操作
    result, err := l.client.SetNX(ctx, l.key, l.value, l.ttl).Result()
    if err != nil {
        return false, err
    }
    return result, nil
}

// Unlock 释放锁
func (l *DistributedLock) Unlock(ctx context.Context) error {
    // 使用 Lua 脚本确保原子性
    script := `
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
    `
    
    _, err := l.client.Eval(ctx, script, []string{l.key}, l.value).Result()
    return err
}

// TryLock 尝试获取锁，带重试
func (l *DistributedLock) TryLock(ctx context.Context, retry int, interval time.Duration) (bool, error) {
    for i := 0; i < retry; i++ {
        locked, err := l.Lock(ctx)
        if err != nil {
            return false, err
        }
        if locked {
            return true, nil
        }
        time.Sleep(interval)
    }
    return false, nil
}

// 使用示例
func main() {
    client := NewRedisClient()
    ctx := context.Background()
    
    lock := NewDistributedLock(client, "lock:order:123", 10*time.Second)
    
    // 获取锁
    locked, err := lock.Lock(ctx)
    if err != nil || !locked {
        fmt.Println("获取锁失败")
        return
    }
    
    // 确保释放锁
    defer lock.Unlock(ctx)
    
    // 执行业务逻辑
    fmt.Println("获取锁成功，执行业务逻辑")
}
```

### 缓存模式

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "time"
    
    "github.com/redis/go-redis/v9"
)

// CacheAside 旁路缓存模式
type CacheAside struct {
    client *redis.Client
    ttl    time.Duration
}

func NewCacheAside(client *redis.Client, ttl time.Duration) *CacheAside {
    return &CacheAside{
        client: client,
        ttl:    ttl,
    }
}

// Get 获取缓存
func (c *CacheAside) Get(ctx context.Context, key string, dest interface{}) (bool, error) {
    data, err := c.client.Get(ctx, key).Result()
    if err == redis.Nil {
        return false, nil // 缓存未命中
    }
    if err != nil {
        return false, err
    }
    
    // 反序列化
    err = json.Unmarshal([]byte(data), dest)
    if err != nil {
        return false, err
    }
    return true, nil
}

// Set 设置缓存
func (c *CacheAside) Set(ctx context.Context, key string, value interface{}) error {
    data, err := json.Marshal(value)
    if err != nil {
        return err
    }
    return c.client.Set(ctx, key, data, c.ttl).Err()
}

// Delete 删除缓存
func (c *CacheAside) Delete(ctx context.Context, key string) error {
    return c.client.Del(ctx, key).Err()
}

// UserService 用户服务
type UserService struct {
    cache *CacheAside
    // db    *gorm.DB // 数据库连接
}

type User struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
    Age  int    `json:"age"`
}

// GetUser 获取用户（带缓存）
func (s *UserService) GetUser(ctx context.Context, userID int) (*User, error) {
    key := fmt.Sprintf("user:%d", userID)
    
    var user User
    // 1. 先查缓存
    found, err := s.cache.Get(ctx, key, &user)
    if err != nil {
        return nil, err
    }
    if found {
        return &user, nil
    }
    
    // 2. 缓存未命中，查数据库
    // user, err = s.db.GetUser(userID)
    user = &User{ID: userID, Name: "Alice", Age: 25} // 模拟
    
    // 3. 写入缓存
    err = s.cache.Set(ctx, key, user)
    if err != nil {
        // 记录日志，不影响主流程
        fmt.Println("缓存写入失败:", err)
    }
    
    return user, nil
}

// UpdateUser 更新用户（更新数据库后删除缓存）
func (s *UserService) UpdateUser(ctx context.Context, user *User) error {
    // 1. 更新数据库
    // err := s.db.UpdateUser(user)
    
    // 2. 删除缓存
    key := fmt.Sprintf("user:%d", user.ID)
    err := s.cache.Delete(ctx, key)
    if err != nil {
        return err
    }
    
    return nil
}
```

### Pipeline 和事务

```go
func PipelineExample(client *redis.Client) {
    ctx := context.Background()
    
    // Pipeline 批量操作
    pipe := client.Pipeline()
    
    pipe.Set(ctx, "key1", "value1", 0)
    pipe.Get(ctx, "key1")
    pipe.Incr(ctx, "counter")
    
    // 执行
    results, err := pipe.Exec(ctx)
    if err != nil {
        panic(err)
    }
    
    // 获取结果
    for _, result := range results {
        fmt.Println(result)
    }
}

func TransactionExample(client *redis.Client) {
    ctx := context.Background()
    
    // 使用 Watch 实现乐观锁
    key := "counter"
    
    err := client.Watch(ctx, func(tx *redis.Tx) error {
        // 获取当前值
        n, err := tx.Get(ctx, key).Int()
        if err != nil && err != redis.Nil {
            return err
        }
        
        // 业务逻辑
        n += 10
        
        // 事务执行
        _, err = tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
            pipe.Set(ctx, key, n, 0)
            return nil
        })
        return err
    }, key)
    
    if err != nil {
        panic(err)
    }
}
```

## 生产环境配置

### 集群模式

```go
func NewRedisCluster() *redis.ClusterClient {
    client := redis.NewClusterClient(&redis.ClusterOptions{
        Addrs: []string{
            "localhost:7000",
            "localhost:7001",
            "localhost:7002",
        },
        Password:     "",
        PoolSize:     100,
        MinIdleConns: 10,
    })
    
    return client
}
```

### Sentinel 模式

```go
func NewRedisSentinel() *redis.Client {
    client := redis.NewFailoverClient(&redis.FailoverOptions{
        MasterName:    "mymaster",
        SentinelAddrs: []string{"localhost:26379", "localhost:26380", "localhost:26381"},
        Password:      "",
        PoolSize:      100,
    })
    
    return client
}
```

## 最佳实践

1. **使用连接池**：合理配置 PoolSize 和 MinIdleConns
2. **设置超时**：配置 DialTimeout、ReadTimeout、WriteTimeout
3. **处理错误**：区分 redis.Nil 和其他错误
4. **使用 Pipeline**：批量操作减少网络往返
5. **合理设置 TTL**：避免缓存雪崩和穿透
6. **分布式锁**：使用 Lua 脚本确保原子性

## 总结

Redis 是构建高性能应用的重要组件，通过 go-redis 客户端可以方便地在 Go 项目中使用 Redis 的各种功能。

---

**参考资源：**
- [go-redis 文档](https://redis.uptrace.dev/)
- [Redis 官方文档](https://redis.io/documentation)
