---
title: 提升Wails应用性能-探索Go-Cache的高效内存缓存方案
date: 2023-09-30 17:22:37
tags:
    - golang
description: 介绍如何使用Go-Cache库来提升Wails应用程序的性能，包括缓存策略、内存管理和性能优化技巧。
author: PFinal南丞
keywords: Go-Cache, Wails, 内存缓存, 性能优化, 缓存策略, 内存管理, 应用程序性能
---

# 提升Wails应用性能：探索Go-Cache的高效内存缓存方案

在开发基于 `Wails` 的小工具时，遇到了一些常见的存储需求。比如，网络请求拉取数据后，需要临时存储处理的情况。起初，我采用了临时文件和 `SqlLite` 这种方式，但逐渐发现这种方式比较繁琐，特别是当处理的数据量并不大时，这样做有点"杀鸡用牛刀"。后来偶然发现了 `go-cache` 这个库，简单高效，非常适合这种场景。

## Go-cahce

**官方介绍**

`go-cache` 是一种内存中的键值存储/缓存，类似于 memcached，适用于在单台机器上运行的应用程序。它的主要优点是，本质上是一个具有到期时间的线程安全 `map[string]interface{}`，它不需要序列化或通过网络传输其内容。任何对象都可以存储一段时间或永​​久存储，并且缓存可以安全地由多个 goroutine 使用。

**一句话总结：** `go-cache` 是一种基于内存的键值对存储/缓存工具，适用于单机应用，类似于 `Memcached`。

**Go-cache 的优缺点**

**优点**

- **灵活存储**：它允许存储任何类型的对象，并支持设置对象的过期时间或永久存储。
- **线程安全**：可以在多 `goroutine` 环境下安全使用，无需担心并发读写问题。
- **无需网络传输**：在单机环境中，`go-cache` 免除了网络传输的开销，非常适合快速访问缓存数据。


**缺点**

- **锁竞争**：当缓存中的键值对过多时，可能会导致较为严重的锁竞争问题，因为底层使用读写锁来保证数据的安全性。
- **数据持久性**：一旦进程终止，所有存储在 `go-cache` 中的数据都将丢失，因此不适合需要长期保存的数据。



**核心存储结构解析**

下面是 `go-cache` 核心存储结构的简化版源码。

```go

package cache

// Item 每一个具体缓存值
type Item struct {
	Object     interface{}
	Expiration int64 // 过期时间:设置时间+缓存时长
}

// Cache 整体缓存
type Cache struct {
	*cache
}

// cache 整体缓存
type cache struct {
	defaultExpiration time.Duration // 默认超时时间
	items             map[string]Item // KV对
	mu                sync.RWMutex // 读写锁，在操作（增加，删除）缓存时使用
	onEvicted         func(string, interface{}) // 删除KEY时的CallBack函数
	janitor           *janitor // 定时清空缓存的结构
}

// janitor  定时清空缓存的结构
type janitor struct {
	Interval time.Duration // 多长时间扫描一次缓存
	stop     chan bool // 是否需要停止
}


```

可以看到，`go-cache` 的核心结构设计非常简洁明了，采用了 `RWMutex` 来确保并发操作的安全性，并且提供了一个定时清理过期缓存的机制，确保缓存不会无限增长。

**基本使用**

`go-cache` 的 API 非常直观且易于使用，基本操作可以归结为三件套：`Set`、`Get` 和 `Delete`。

**Set 方法源码解析**

```go
package cache

func (c *cache) Set(k string, x interface{}, d time.Duration) {
	var e int64
	if d == DefaultExpiration {
		d = c.defaultExpiration
	}
	if d > 0 {
		e = time.Now().Add(d).UnixNano()
	}
	c.mu.Lock()
	c.items[k] = Item{
		Object:     x, // 存储的数据
		Expiration: e, // 过期时间
	}
	c.mu.Unlock()
}

```

通过 `Set` 方法可以将任意对象存入缓存，设置自定义的过期时间。缓存的键值对存储在 `map[string]Item` 中，并通过 `RWMutex` 锁保证了线程安全。

**Set 使用示例**

```go

import (
	"fmt"
	"github.com/patrickmn/go-cache"
	"time"
)

func main() {
	// 创建一个默认过期时间为5分钟的缓存，并且 每 10 分钟清除一次过期的key
	c := cache.New(5*time.Minute, 10*time.Minute)

	// 存储一个 pf为键 pfinalclub 为值缓存,过期时间为默认的
	c.Set("pf", "pfinalclub", cache.DefaultExpiration)

	// 存储一个 pfinal 为键 永不过期的缓存
	c.Set("pfinal", 35, cache.NoExpiration)

	// 从缓存中获取 
	pfinal, found := c.Get("pfinal")
	if found {
		fmt.Println(pfinal)
	}
	
}

```

**Get 方法源码解析**

`Get` 方法的主要作用就是从缓存中获取对应键的值，若键存在且未过期，则返回值，否则返回 `nil`。

```go

package cache

func (c *cache) Get(k string) (interface{}, bool) {
	c.mu.RLock()
	item, found := c.items[k]
	if !found {
		c.mu.RUnlock()
		return nil, false
	}
	if item.Expiration > 0 && time.Now().UnixNano() > item.Expiration {
		c.mu.RUnlock()
		return nil, false
	}
	c.mu.RUnlock()
	return item.Object, true
}



```

**Delete 方法源码解析**

`Delete` 方法用于从缓存中移除指定键值对，并支持在删除时触发回调函数。

```go

package cache

func (c *cache) Delete(k string) {
	c.mu.Lock()
	v, evicted := c.delete(k)
	c.mu.Unlock()
	if evicted {
		c.onEvicted(k, v)
	}
}

func (c *cache) delete(k string) (interface{}, bool) {
	if c.onEvicted != nil {
		if v, found := c.items[k]; found {
			delete(c.items, k)
			return v.Object, true
		}
	}
	delete(c.items, k)
	return nil, false
}


```


**完整使用示例**

下面是一个完整的使用 `go-cache` 的示例，包括设置、获取和删除缓存内容。

```go
package main

import (
	"fmt"
	"time"
	"github.com/patrickmn/go-cache"
)

type MyStruct struct {
	Name string
}

func main() {
	// 创建缓存，设置默认过期时间为 5 分钟，清理周期为 10 分钟
	c := cache.New(5*time.Minute, 10*time.Minute)

	// 设置一个键值对，使用默认的过期时间
	c.Set("pfinalclub", "friday-go.icu", cache.DefaultExpiration)

	// 设置一个永久有效的键值对
	c.Set("pfinal", 35, cache.NoExpiration)

	// 获取缓存中的值
	if foo, found := c.Get("pfinal"); found {
		fmt.Println(foo)
	}

	// 对结构体对象进行缓存
	c.Set("pfinal", &MyStruct{Name: "NameName"}, cache.DefaultExpiration)
	if my, found := c.Get("pfinal"); found {
		fmt.Println(my.(*MyStruct).Name)
	}
}

```


通过这个例子，我们可以看到 `go-cache` 的使用是多么简单高效。它不仅可以缓存基本数据类型，还支持复杂的结构体类型，并且线程安全。

#### 总结

对于那些正在构建基于 Wails 或其他 Go 语言框架的应用程序，并且希望简化临时数据存储流程的开发者来说，`go-cache` 提供了一个理想的解决方案。它不仅减少了对外部存储系统的依赖，还提升了应用的整体响应速度。如果你正在寻找一种简便的方法来提升你的 Go 应用程序的性能，不妨试试 `go-cache`。