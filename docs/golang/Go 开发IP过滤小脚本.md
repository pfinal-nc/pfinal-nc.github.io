---
title: Go 开发IP过滤小脚本
date: 2023-12-22 15:35:02
tags: 
    - golang
    - 工具
description: 详细介绍GO开发IP过滤小脚本，包括IP过滤的原理、应用场景、实现方式等，帮助开发者更好地利用IP过滤功能，提高程序的安全性和稳定性。
author: PFinal南丞
keywords: GO开发IP过滤小脚本, go, 工具, go开发ip过滤, go ip过滤脚本, go ip过滤
---

# Go 开发IP过滤小脚本

### 背景

最近在处理数据时，发现线上某个接口的访问量异常高。在初次设计时，并未对流量和访问量进行限制，因此对具体情况并不太清楚。为了解决这一问题，搞了一个简单的IP过滤脚本，并进行了记录。

之前搞IP过滤的时候, 使用了 PHP 的 workerman 来搞的 其实思路差不多一样:

```php

$worker = new Worker('tcp:0.0.0.0:8080');
// 监听一个端口
$worker->count = 2;
// 设置多进程
$worker->onConnect = function (TcpConnection $connection) {
    $list_ip = []; // ip 白名单 
    $remote_ip = $connection->getRemoteIp();
    // 拦截IP
    if (!in_array($remote_ip, $list_ip)) {
        $connection->close();
    }
    // 放行连接，连接内部目标端口
    $to_connection = new AsyncTcpConnection('tcp:127.0.0.1:80');
    // 互相转发流量
    $connection->pipe($to_connection);
    $to_connection->pipe($connection);
    $to_connection->connect();
}

```

以上PHP代码创建了一个TCP监听器，在连接时进行IP过滤，并将流量转发到目标端口。

### Go实现客户端

```go
func main() {
	listener, err := net.Listen("tcp", "127.0.0.1:8080")
	if err != nil {
		fmt.Println("Listen() failed, err: ", err)
		return
	}
	defer func(listener net.Listener) {
		_ = listener.Close()
	}(listener)

	for {
		conn, err := listener.Accept()
		if err != nil {
			fmt.Println("Accept() failed, err: ", err)
			continue
		}

		ip, _, _ := net.SplitHostPort(conn.RemoteAddr().String())
		if !isIPAllowed(ip) {
			fmt.Println("IP: ", ip, " is not allowed")
			_ = conn.Close()
			// TODO 对非白名单IP的连接，应该进行一些处理，比如记录日志
			continue
		}

		fmt.Println("IP: ", ip, " is allowed")
		go handleConn(conn)  // 转发到固定的目标端口
	}
}
func handleConn(conn net.Conn) {
	defer func(conn net.Conn) {
		_ = conn.Close()
	}(conn)

	target, err := net.Dial("tcp", "127.0.0.1:80")
	if err != nil {
		fmt.Println("Dial() failed, err: ", err)
		return
	}
	defer func(target net.Conn) {
		_ = target.Close()
	}(target)

	// 使用 copyAndCount 的并发执行版本（同时处理流向）
	go copyAndCount(target, conn, &inTraffic)
	copyAndCount(conn, target, &outTraffic) // Block until this copy is done
}

```

上面的代码，整个流程是:

1. 启动一个 TCP 监听器，等待客户端的连接请求。
2. 当收到连接请求时，检查连接的 IP 是否在白名单中。
3. 如果 IP 在白名单中，则开始处理连接，将连接的流量从输入流量和输出流量分别计入相应的计数器中。
4. 处理连接时，使用 copyAndCount 函数并发地处理两个方向的流量。
5. 处理完成后，关闭连接。
6. 循环等待新的连接请求。


### Go 实现管理面板

刚开始准备写这个IP过滤的时候,没有考虑太多,直接就写了,后来发现,这个东西,其实可以写一个管理面板,这样就方便管理了. 然后就 使用 Gin 来整了个面板

主要功能如下:

1. IP 白名单管理, 并且提供了一个接口, 给上面的 转发客户端来用

2. 拦截统计,提供了一个接口, 给上面的客户端来上报拦截日志

3. 流量统计, 包括输入流量和输出流量

4. 流量限制, 包括输入流量限制和输出流量限制

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202312221601868.png)

### 后续完善

1. 目前这个脚本只支持了一个端口的转发,没有实现多个端口的同时绑定转发

2. 目前这个脚本没有实现对客户端的流量进行限制, 也没有实现对服务器的流量进行限制

### 总结

最后的最后,我也不知道我这玩意儿该叫啥, 因为, 其实, 它就是一个转发代理, 只不过, 它对流量进行了限制, 并且对流量进行了统计, 并且提供了管理面板.
