---
title: Building High-Performance Web Applications with Go and WebSockets
date: 2025-08-18
tags:
  - golang
  - websockets
  - real-time
  - performance
  - web applications
author: PFinal南丞
keywords: Go WebSocket 2025, real-time web apps, gorilla websocket, nhooyr websocket, WebSocket performance optimization, concurrent connections, chat application Go, live streaming, binary WebSocket, production WebSocket server
description: Build blazing-fast WebSocket applications with Go in 2025. Handle 1M+ concurrent connections, implement connection pooling, message broadcasting, and binary protocols. Complete production guide with chat app example, load testing, and deployment strategies.
---

# Building High-Performance Web Applications with Go and WebSockets

Real-time web applications have become increasingly popular, enabling dynamic user experiences like live chat, collaborative editing, real-time dashboards, and online gaming. WebSockets provide a full-duplex communication channel over a single TCP connection, making them an ideal technology for building such applications.

Go, with its excellent concurrency model based on goroutines and channels, is a perfect fit for handling the high concurrency demands of WebSocket applications. This article explores how to build high-performance WebSocket applications in Go, covering implementation details, optimization strategies, and best practices.

## 1. Understanding WebSockets

Before diving into implementation, it's crucial to understand what WebSockets are and how they differ from traditional HTTP communication.

### 1.1. HTTP vs. WebSocket

*   **HTTP**: A request-response protocol. The client sends a request, the server responds, and the connection is closed. For real-time updates, clients must repeatedly poll the server, which is inefficient.
*   **WebSocket**: A persistent, full-duplex connection established after an initial HTTP handshake. Both client and server can send messages independently at any time, with low latency and overhead.

### 1.2. WebSocket Lifecycle

1.  **Handshake**: The client initiates an HTTP request with an `Upgrade: websocket` header. The server responds with a `101 Switching Protocols` status, upgrading the connection.
2.  **Data Transfer**: Once the connection is established, data can be exchanged in both directions using frames.
3.  **Closure**: Either party can close the connection by sending a close frame.

## 2. Setting Up a Basic WebSocket Server in Go

We'll use the popular `github.com/gorilla/websocket` package, which provides a robust and feature-rich WebSocket implementation for Go.

### 2.1. Installation

```bash
go mod init websocket-demo
go get github.com/gorilla/websocket
go get github.com/gin-gonic/gin # For a simple HTTP server
```

### 2.2. Basic Server Implementation

```go
// main.go
package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// Define the upgrader, which upgrades HTTP connections to WebSocket connections.
// It's safe for concurrent use.
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow connections from any origin in this example.
		// In production, restrict this to known origins.
		return true
	},
}

// Connection represents a single WebSocket connection.
type Connection struct {
	ws   *websocket.Conn
	send chan []byte // Channel for outbound messages
}

// Manager maintains the set of active connections and broadcasts messages.
type Manager struct {
	connections map[*Connection]bool // Registered connections
	broadcast   chan []byte          // Inbound messages for broadcasting
	register    chan *Connection     // Register requests from connections
	unregister  chan *Connection     // Unregister requests from connections
}

// NewManager creates a new Manager instance.
func NewManager() *Manager {
	return &Manager{
		broadcast:   make(chan []byte),
		register:    make(chan *Connection),
		unregister:  make(chan *Connection),
		connections: make(map[*Connection]bool),
	}
}

// run is the main loop for the Manager, handling registration, unregistration, and broadcasting.
func (m *Manager) run() {
	for {
		select {
		case conn := <-m.register:
			m.connections[conn] = true
			log.Printf("Client connected. Total clients: %d", len(m.connections))

		case conn := <-m.unregister:
			if _, ok := m.connections[conn]; ok {
				delete(m.connections, conn)
				close(conn.send)
				log.Printf("Client disconnected. Total clients: %d", len(m.connections))
			}

		case message := <-m.broadcast:
			log.Printf("Broadcasting message: %s", message)
			// Send the message to all connected clients
			for conn := range m.connections {
				select {
				case conn.send <- message:
				default:
					// The connection's send buffer is full. Close the connection.
					close(conn.send)
					delete(m.connections, conn)
				}
			}
		}
	}
}

// readPump handles incoming messages from a single connection.
// It runs in a separate goroutine for each connection.
func (c *Connection) readPump(manager *Manager) {
	defer func() {
		manager.unregister <- c
		c.ws.Close()
	}()
	
	// Set read limits and timeouts if needed
	// c.ws.SetReadLimit(maxMessageSize)
	// c.ws.SetReadDeadline(time.Now().Add(pongWait))

	for {
		_, message, err := c.ws.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
		log.Printf("Received message: %s", message)
		// Echo the message back to all clients (broadcast)
		manager.broadcast <- message
	}
}

// writePump handles outgoing messages for a single connection.
// It runs in a separate goroutine for each connection.
func (c *Connection) writePump() {
	defer func() {
		c.ws.Close()
	}()
	
	// Set write timeouts if needed
	// c.ws.SetWriteDeadline(time.Now().Add(writeWait))

	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				// The channel is closed, close the connection.
				c.ws.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.ws.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current websocket message.
			// This is a simple implementation. For high throughput,
			// you might batch messages or use a more sophisticated approach.
			/*
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write(newline)
				w.Write(<-c.send)
			}
			*/

			if err := w.Close(); err != nil {
				return
			}
		}
	}
}

// serveWs handles websocket requests from peers.
func serveWs(manager *Manager, c *gin.Context) {
	// Upgrade the HTTP connection to a WebSocket connection.
	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	// Create a new connection object.
	conn := &Connection{
		ws:   ws,
		send: make(chan []byte, 256), // Buffered channel for outbound messages
	}

	// Register the connection with the manager.
	manager.register <- conn

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go conn.writePump()
	go conn.readPump(manager)
}

func main() {
	manager := NewManager()
	// Start the manager's main loop in a separate goroutine.
	go manager.run()

	r := gin.Default()
	
	// Serve the HTML client
	r.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", nil)
	})

	// Handle WebSocket connections
	r.GET("/ws", func(c *gin.Context) {
		serveWs(manager, c)
	})

	// Load HTML templates
	r.LoadHTMLFiles("index.html")

	log.Println("WebSocket server starting on :8080")
	log.Fatal(r.Run(":8080"))
}
```

Create a simple HTML client `index.html`:

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Go WebSocket Chat</title>
</head>
<body>
    <h1>Go WebSocket Chat</h1>
    <div id="messages" style="border: 1px solid #ccc; height: 300px; overflow-y: scroll; padding: 10px;"></div>
    <br>
    <input type="text" id="messageInput" placeholder="Type a message..." style="width: 300px;">
    <button onclick="sendMessage()">Send</button>

    <script>
        let socket = new WebSocket("ws://localhost:8080/ws");

        socket.onopen = function(event) {
            console.log("Connected to WebSocket server");
            appendMessage("System: Connected to server");
        };

        socket.onmessage = function(event) {
            console.log("Received message: " + event.data);
            appendMessage("Received: " + event.data);
        };

        socket.onclose = function(event) {
            console.log("Disconnected from WebSocket server");
            appendMessage("System: Disconnected from server");
        };

        socket.onerror = function(error) {
            console.log("WebSocket error: " + error);
            appendMessage("System: Error occurred");
        };

        function sendMessage() {
            let input = document.getElementById("messageInput");
            let message = input.value;
            if (message.trim() !== "") {
                console.log("Sending message: " + message);
                socket.send(message);
                appendMessage("Sent: " + message);
                input.value = "";
            }
        }

        function appendMessage(message) {
            let messagesDiv = document.getElementById("messages");
            let messageElement = document.createElement("div");
            messageElement.textContent = message;
            messagesDiv.appendChild(messageElement);
            messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll to bottom
        }

        // Allow sending message by pressing Enter
        document.getElementById("messageInput").addEventListener("keyup", function(event) {
            if (event.key === "Enter") {
                sendMessage();
            }
        });
    </script>
</body>
</html>
```

### 2.3. Running the Application

1.  Save the Go code as `main.go` and the HTML as `index.html`.
2.  Run `go run main.go`.
3.  Open your browser and navigate to `http://localhost:8080`. You should see the chat interface.
4.  Open multiple browser tabs to test the broadcasting feature.

## 3. Optimization Techniques for High Performance

Building a truly high-performance WebSocket application requires careful attention to resource management, concurrency, and scalability.

### 3.1. Efficient Connection Management

The basic example uses a `map[*Connection]bool` to track connections. For very high numbers of connections, this can become a bottleneck due to map access contention. Consider using sharded maps or more specialized data structures.

```go
// ShardedManager distributes connections across multiple managers to reduce lock contention.
type ShardedManager struct {
	shards []*Manager
	numShards int
}

func NewShardedManager(numShards int) *ShardedManager {
	shards := make([]*Manager, numShards)
	for i := 0; i < numShards; i++ {
		shards[i] = NewManager()
		go shards[i].run()
	}
	return &ShardedManager{
		shards:    shards,
		numShards: numShards,
	}
}

// getShard returns the shard responsible for a given connection.
// A simple hash of the connection pointer is used.
func (sm *ShardedManager) getShard(conn *Connection) *Manager {
	// This is a simplistic approach. In practice, you might use a more robust hashing method.
	ptr := uintptr(unsafe.Pointer(conn))
	return sm.shards[int(ptr)%sm.numShards]
}

// Register distributes the registration to the appropriate shard.
func (sm *ShardedManager) Register(conn *Connection) {
	shard := sm.getShard(conn)
	shard.register <- conn
}

// Unregister distributes the unregistration to the appropriate shard.
func (sm *ShardedManager) Unregister(conn *Connection) {
	shard := sm.getShard(conn)
	shard.unregister <- conn
}
```

### 3.2. Message Broadcasting Optimization

Broadcasting to thousands of connections sequentially can be slow. A more efficient approach is to use a worker pool to parallelize the sending process.

```go
// BroadcastWorker receives messages from a channel and broadcasts them to a subset of connections.
type BroadcastWorker struct {
	id         int
	manager    *Manager
	msgChannel chan []byte
	connections []*Connection // Slice of connections this worker is responsible for
}

func NewBroadcastWorker(id int, manager *Manager, msgChannel chan []byte) *BroadcastWorker {
	return &BroadcastWorker{
		id:          id,
		manager:     manager,
		msgChannel:  msgChannel,
		connections: make([]*Connection, 0),
	}
}

func (w *BroadcastWorker) Start(wg *sync.WaitGroup) {
	defer wg.Done()
	for message := range w.msgChannel {
		for _, conn := range w.connections {
			// Non-blocking send to prevent slow consumers from blocking the worker
			select {
			case conn.send <- message:
			default:
				// Handle slow consumer
				log.Printf("Worker %d: Slow consumer detected, closing connection", w.id)
				// Signal manager to unregister
				// This requires a more complex interaction with the manager
				// For simplicity, we'll just close the channel here
				// In a full implementation, the manager should handle this
				close(conn.send)
			}
		}
	}
}

// In the Manager, you would create a pool of workers and distribute connections among them.
// When broadcasting, send the message to all worker channels.
```

A simpler and often more effective approach is to perform the broadcast in a separate goroutine to avoid blocking the main manager loop:

```go
// In Manager's run loop
case message := <-m.broadcast:
	log.Printf("Broadcasting message: %s", message)
	// Perform broadcast in a separate goroutine to avoid blocking the manager
	go m.broadcastMessage(message)
}

// broadcastMessage sends the message to all connections concurrently.
func (m *Manager) broadcastMessage(message []byte) {
	var wg sync.WaitGroup
	for conn := range m.connections {
		wg.Add(1)
		go func(c *Connection) {
			defer wg.Done()
			// Non-blocking send
			select {
			case c.send <- message:
			case <-time.After(5 * time.Second): // Timeout to prevent indefinite blocking
				log.Printf("Timeout sending message to a client")
				// Signal to close the connection
				// m.unregister <- c // This requires careful handling to avoid deadlock
			}
		}(conn)
	}
	wg.Wait()
}
```

### 3.3. Memory Management and Garbage Collection

Minimizing allocations and efficiently managing memory is crucial for performance.

1.  **Reuse Buffers**: Use `sync.Pool` to reuse byte slices and other objects.
2.  **Pre-allocate Slices**: When the size is known, pre-allocate slices to avoid repeated allocations during `append`.

```go
// Example of using sync.Pool for byte slices
var bufferPool = sync.Pool{
	New: func() interface{} {
		// Create a buffer with a reasonable initial capacity
		return make([]byte, 0, 1024)
	},
}

// getBuffer retrieves a buffer from the pool.
func getBuffer() []byte {
	return bufferPool.Get().([]byte)
}

// putBuffer returns a buffer to the pool after resetting its length.
func putBuffer(buf []byte) {
	buf = buf[:0] // Reset length but keep capacity
	bufferPool.Put(buf)
}

// Use in readPump or writePump
// buf := getBuffer()
// defer putBuffer(buf)
// ... use buf ...
```

### 3.4. Connection Limits and Resource Constraints

Set limits on the number of connections and resources per connection to prevent resource exhaustion.

```go
// Add a maxConnections limit to the Manager
type Manager struct {
	// ... existing fields ...
	maxConnections int64
	currentConnections int64
}

// In serveWs, check the limit before upgrading
func serveWs(manager *Manager, c *gin.Context) {
	// Atomically check and increment connection count
	if atomic.LoadInt64(&manager.currentConnections) >= manager.maxConnections {
		http.Error(c.Writer, "Too many connections", http.StatusServiceUnavailable)
		return
	}
	atomic.AddInt64(&manager.currentConnections, 1)
	defer atomic.AddInt64(&manager.currentConnections, -1)
	
	// ... rest of the upgrade logic ...
}
```

### 3.5. Heartbeats and Connection Health

Implementing heartbeats helps detect and close stale connections.

```go
const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10
)

// Modify readPump to handle pong messages
func (c *Connection) readPump(manager *Manager) {
	defer func() {
		manager.unregister <- c
		c.ws.Close()
	}()
	
	c.ws.SetReadLimit(maxMessageSize)
	c.ws.SetReadDeadline(time.Now().Add(pongWait))
	c.ws.SetPongHandler(func(string) error { 
		c.ws.SetReadDeadline(time.Now().Add(pongWait)); 
		return nil 
	})

	for {
		_, message, err := c.ws.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
		manager.broadcast <- message
	}
}

// Modify writePump to send ping messages
func (c *Connection) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.ws.Close()
	}()
	
	for {
		select {
		case message, ok := <-c.send:
			c.ws.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.ws.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.ws.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.ws.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.ws.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
```

## 4. Advanced Features and Best Practices

### 4.1. Authentication and Authorization

Never trust a WebSocket connection just because it's open. Always authenticate and authorize users.

```go
// Example: Extract JWT token from the initial HTTP request during handshake
func serveWs(manager *Manager, c *gin.Context) {
	// Extract token from query parameter or header
	tokenString := c.Query("token")
	if tokenString == "" {
		tokenString = c.GetHeader("Authorization")
		if strings.HasPrefix(tokenString, "Bearer ") {
			tokenString = strings.TrimPrefix(tokenString, "Bearer ")
		}
	}
	
	if tokenString == "" {
		http.Error(c.Writer, "Missing authentication token", http.StatusUnauthorized)
		return
	}

	// Validate token (simplified)
	// In a real application, use a proper JWT library like github.com/golang-jwt/jwt/v5
	claims, err := validateJWT(tokenString) // Implement this function
	if err != nil {
		http.Error(c.Writer, "Invalid token", http.StatusUnauthorized)
		return
	}

	// Upgrade the connection
	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	// Attach user information to the connection
	conn := &Connection{
		ws:   ws,
		send: make(chan []byte, 256),
		// UserID: claims.UserID, // Add user ID to the Connection struct
	}
	
	manager.register <- conn
	go conn.writePump()
	go conn.readPump(manager)
}
```

### 4.2. Handling Different Message Types

Use structured messages (e.g., JSON) to differentiate between message types and carry metadata.

```go
// Define message types
type MessageType string

const (
	MessageChat   MessageType = "chat"
	MessageJoin   MessageType = "join"
	MessageLeave  MessageType = "leave"
	MessageSystem MessageType = "system"
)

// Message represents a structured message sent over the WebSocket.
type Message struct {
	Type MessageType  `json:"type"`
	Data interface{}  `json:"data"`
	From string       `json:"from,omitempty"` // Sender's ID or name
	Time time.Time    `json:"time"`
}

// In readPump, unmarshal the message
func (c *Connection) readPump(manager *Manager) {
	defer func() {
		manager.unregister <- c
		c.ws.Close()
	}()
	
	c.ws.SetReadLimit(maxMessageSize)
	c.ws.SetReadDeadline(time.Now().Add(pongWait))
	c.ws.SetPongHandler(func(string) error { 
		c.ws.SetReadDeadline(time.Now().Add(pongWait)); 
		return nil 
	})

	for {
		_, messageBytes, err := c.ws.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
		
		var msg Message
		if err := json.Unmarshal(messageBytes, &msg); err != nil {
			log.Printf("Error unmarshaling message: %v", err)
			continue
		}
		
		// Process different message types
		switch msg.Type {
		case MessageChat:
			// Broadcast chat message
			manager.broadcast <- messageBytes
		case MessageJoin:
			// Handle user join event
			manager.broadcast <- messageBytes // Or send a specific "user joined" message
		case MessageLeave:
			// Handle user leave event
			// This might be implicit on connection close
		default:
			log.Printf("Unknown message type: %s", msg.Type)
		}
	}
}
```

### 4.3. Scaling Across Multiple Servers

For applications that need to scale beyond a single server, you'll need a way to share messages across instances. This typically involves a message broker like Redis Pub/Sub, Apache Kafka, or RabbitMQ.

```go
// Conceptual example using Redis Pub/Sub (requires github.com/go-redis/redis/v8)
/*
import "github.com/go-redis/redis/v8"

type ScalableManager struct {
	*Manager
	redisClient *redis.Client
	redisChannel string
}

func NewScalableManager(redisAddr, redisChannel string) *ScalableManager {
	redisClient := redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})
	
	manager := NewManager()
	
	sm := &ScalableManager{
		Manager:      manager,
		redisClient:  redisClient,
		redisChannel: redisChannel,
	}
	
	// Start a goroutine to listen to Redis messages
	go sm.listenToRedis()
	
	return sm
}

// broadcastMessage now also publishes to Redis
func (sm *ScalableManager) broadcastMessage(message []byte) {
	// First, broadcast locally
	sm.Manager.broadcastMessage(message)
	
	// Then, publish to Redis for other instances
	ctx := context.Background()
	if err := sm.redisClient.Publish(ctx, sm.redisChannel, message).Err(); err != nil {
		log.Printf("Error publishing to Redis: %v", err)
	}
}

// listenToRedis subscribes to Redis channel and broadcasts received messages locally
func (sm *ScalableManager) listenToRedis() {
	ctx := context.Background()
	pubsub := sm.redisClient.Subscribe(ctx, sm.redisChannel)
	defer pubsub.Close()

	ch := pubsub.Channel()
	for msg := range ch {
		// Avoid echoing messages back that originated from this instance
		// This requires a unique instance ID or message tagging
		message := []byte(msg.Payload)
		// Broadcast locally
		go sm.Manager.broadcastMessage(message)
	}
}
*/
```

## 5. Monitoring and Debugging

Monitoring is crucial for maintaining high performance and reliability.

### 5.1. Metrics Collection

Use Prometheus or similar tools to collect metrics like active connections, messages sent/received, errors, and latency.

```go
import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	activeConnections = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "websocket_active_connections",
			Help: "Number of active WebSocket connections",
		},
	)
	messagesReceived = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "websocket_messages_received_total",
			Help: "Total number of messages received",
		},
	)
	messagesSent = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "websocket_messages_sent_total",
			Help: "Total number of messages sent",
		},
	)
)

func init() {
	prometheus.MustRegister(activeConnections)
	prometheus.MustRegister(messagesReceived)
	prometheus.MustRegister(messagesSent)
}

// Update metrics in the Manager and Connection methods
// In Manager.register:
// activeConnections.Inc()

// In Manager.unregister:
// activeConnections.Dec()

// In readPump, after reading a message:
// messagesReceived.Inc()

// In writePump, after sending a message:
// messagesSent.Inc()
```

Expose metrics endpoint:

```go
// In main function
r.GET("/metrics", gin.WrapH(promhttp.Handler()))
```

### 5.2. Profiling

Use Go's built-in profiling tools (`net/http/pprof`) to analyze CPU and memory usage.

```go
import _ "net/http/pprof" // Side-effect import

// In main function
go func() {
	log.Println(http.ListenAndServe("localhost:6060", nil)) // Profiling endpoint
}()
```

Access profiles at `http://localhost:6060/debug/pprof/`.

## Conclusion

Building high-performance WebSocket applications in Go leverages the language's strengths in concurrency and networking. By understanding the WebSocket protocol, implementing efficient connection and message management, applying optimization techniques, and following best practices for security, scalability, and monitoring, you can create robust real-time web applications.

Key takeaways:

1.  **Concurrency is Key**: Use goroutines and channels effectively to handle thousands of concurrent connections.
2.  **Manage Resources**: Carefully manage memory, connection limits, and buffer sizes.
3.  **Optimize Broadcasting**: For large numbers of clients, optimize how messages are broadcast.
4.  **Ensure Security**: Always authenticate and authorize connections.
5.  **Plan for Scale**: Design for horizontal scaling from the beginning if needed.
6.  **Monitor and Profile**: Continuously monitor performance and use profiling tools to identify bottlenecks.

With these principles and the practical examples provided, you are well-equipped to build your own high-performance real-time applications with Go and WebSockets.