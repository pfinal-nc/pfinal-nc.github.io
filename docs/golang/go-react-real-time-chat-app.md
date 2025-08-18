---
title: Building a Real-Time Chat Application with Go and React
date: 2025-08-18
tags:
  - golang
  - react
  - websocket
  - real-time
  - chat application
  - full-stack
author: PFinal南丞
keywords: golang, react, websocket, real-time chat, full-stack application, gorilla websocket, concurrent connections, user authentication, message broadcasting
description: A step-by-step guide to building a full-stack real-time chat application using Go for the backend with WebSockets and React for the frontend. Covers user authentication, message handling, and deployment considerations.
---

# Building a Real-Time Chat Application with Go and React

Real-time communication is at the heart of many modern web applications, from collaborative tools to social platforms. A chat application is a quintessential example of real-time functionality. This guide will walk you through building a full-stack real-time chat application using Go for the backend and React for the frontend, powered by WebSockets for instant messaging.

## 1. Project Overview and Architecture

Our chat application will feature:
- User authentication (registration and login)
- Real-time messaging between users
- Persistent chat history
- Online user presence
- A responsive and intuitive user interface

### 1.1. Technology Stack

**Backend (Go):**
- **Gin Web Framework**: For building the REST API and serving static files.
- **Gorilla WebSocket**: For handling WebSocket connections.
- **GORM**: As the ORM for database interactions.
- **SQLite**: As the database for simplicity (can be replaced with PostgreSQL/MySQL).
- **JWT**: For stateless user authentication.

**Frontend (React):**
- **React**: For building the user interface.
- **React Router**: For client-side routing.
- **Axios**: For making HTTP requests to the backend API.
- **Tailwind CSS**: For styling and responsive design.

### 1.2. Architecture Diagram

```
┌─────────────────┐         ┌────────────────────┐
│   React Frontend│◄───────►│   Go Backend API   │
│   (WebSocket)   │         │   (Gin + Gorilla)  │
└─────────────────┘         └────────────────────┘
                                      │
                                      ▼
                              ┌────────────────────┐
                              │     Database       │
                              │     (SQLite)       │
                              └────────────────────┘
```

## 2. Setting Up the Backend

### 2.1. Project Initialization

Create the project directory and initialize the Go module:

```bash
mkdir go-react-chat
cd go-react-chat
go mod init go-react-chat
```

### 2.2. Installing Dependencies

```bash
# Web framework and utilities
go get -u github.com/gin-gonic/gin
go get -u github.com/gorilla/websocket
go get -u github.com/golang-jwt/jwt/v5
go get -u gorm.io/gorm
go get -u gorm.io/driver/sqlite
go get -u golang.org/x/crypto/bcrypt
```

### 2.3. Project Structure

```
go-react-chat/
├── go.mod
├── go.sum
├── main.go
├── internal/
│   ├── auth/
│   │   ├── auth.go
│   │   └── middleware.go
│   ├── chat/
│   │   ├── hub.go
│   │   ├── client.go
│   │   └── message.go
│   ├── database/
│   │   └── database.go
│   ├── models/
│   │   ├── user.go
│   │   └── message.go
│   └── routes/
│       └── routes.go
└── client/ # This will be our React frontend
```

### 2.4. Database Models

Let's start by defining our data models.

```go
// internal/models/user.go
package models

import (
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type User struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	Username string `gorm:"uniqueIndex;not null" json:"username"`
	Email    string `gorm:"uniqueIndex;not null" json:"email"`
	Password string `gorm:"not null" json:"-"` // Don't serialize password
}

// BeforeCreate hashes the user's password before saving to the database
func (u *User) BeforeCreate(tx *gorm.DB) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.Password = string(hashedPassword)
	return nil
}

// CheckPassword compares a plain text password with the hashed password
func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
	return err == nil
}
```

```go
// internal/models/message.go
package models

import "time"

type Message struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Content   string    `gorm:"not null" json:"content"`
	UserID    uint      `json:"user_id"`
	User      User      `json:"user"` // Preload user information
	CreatedAt time.Time `json:"created_at"`
}
```

### 2.5. Database Connection

```go
// internal/database/database.go
package database

import (
	"fmt"
	"log"
	"go-react-chat/internal/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	var err error
	DB, err = gorm.Open(sqlite.Open("chat.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to the database:", err)
	}

	// Auto Migrate the schema
	err = DB.AutoMigrate(&models.User{}, &models.Message{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	fmt.Println("Database connected and migrated!")
}
```

### 2.6. Authentication System

```go
// internal/auth/auth.go
package auth

import (
	"errors"
	"time"
	"os"
	"go-react-chat/internal/database"
	"go-react-chat/internal/models"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var jwtKey = []byte(os.Getenv("JWT_SECRET"))
if len(jwtKey) == 0 {
	jwtKey = []byte("my_secret_key") // Fallback for development
}

type Claims struct {
	UserID uint `json:"user_id"`
	jwt.RegisteredClaims
}

// Signup creates a new user
func Signup(username, email, password string) (*models.User, error) {
	// Check if user already exists
	var existingUser models.User
	if err := database.DB.Where("username = ? OR email = ?", username, email).First(&existingUser).Error; err == nil {
		return nil, errors.New("user already exists with this username or email")
	}

	user := models.User{
		Username: username,
		Email:    email,
		Password: password, // This will be hashed by the BeforeCreate hook
	}

	if err := database.DB.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

// Login authenticates a user and returns a JWT token
func Login(username, password string) (string, error) {
	var user models.User
	if err := database.DB.Where("username = ?", username).First(&user).Error; err != nil {
		return "", errors.New("invalid credentials")
	}

	if !user.CheckPassword(password) {
		return "", errors.New("invalid credentials")
	}

	// Create JWT token
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID: user.ID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// GetUserFromToken retrieves the user ID from a JWT token
func GetUserFromToken(tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}
```

```go
// internal/auth/middleware.go
package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware checks for a valid JWT token in the Authorization header
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Expected format: "Bearer <token>"
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Bearer token required"})
			c.Abort()
			return
		}

		claims, err := GetUserFromToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Set user ID in context for use in handlers
		c.Set("userID", claims.UserID)
		c.Next()
	}
}
```

### 2.7. WebSocket Chat Hub

The chat hub is the core of our real-time functionality, managing all connected clients and broadcasting messages.

```go
// internal/chat/hub.go
package chat

import (
	"log"
	"go-react-chat/internal/database"
	"go-react-chat/internal/models"
)

// Hub maintains the set of active clients and broadcasts messages.
type Hub struct {
	// Registered clients.
	clients map[*Client]bool

	// Inbound messages from the clients.
	broadcast chan *Message

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client
}

func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan *Message),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			// Send list of online users to the new client
			h.sendOnlineUsers(client)

		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				// Notify other clients that this user is offline
				h.broadcastUserStatus(client, false)
			}

		case message := <-h.broadcast:
			// Save message to database
			dbMessage := models.Message{
				Content: message.Content,
				UserID:  message.UserID,
			}
			database.DB.Create(&dbMessage)
			
			// Load user information for the message
			var user models.User
			database.DB.First(&user, dbMessage.UserID)
			dbMessage.User = user

			// Broadcast message to all clients
			for client := range h.clients {
				select {
				case client.send <- &Message{
					Type:      "chat",
					Content:   dbMessage.Content,
					Username:  dbMessage.User.Username,
					UserID:    dbMessage.UserID,
					Timestamp: dbMessage.CreatedAt,
				}:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}

// sendOnlineUsers sends a list of online users to a specific client
func (h *Hub) sendOnlineUsers(client *Client) {
	var onlineUsers []string
	for c := range h.clients {
		onlineUsers = append(onlineUsers, c.username)
	}
	
	select {
	case client.send <- &Message{Type: "online_users", Users: onlineUsers}:
	default:
		// Handle failed send if necessary
	}
}

// broadcastUserStatus notifies all clients about a user's online/offline status
func (h *Hub) broadcastUserStatus(client *Client, isOnline bool) {
	status := "offline"
	if isOnline {
		status = "online"
	}
	
	message := &Message{
		Type:     "user_status",
		Username: client.username,
		Status:   status,
	}
	
	for c := range h.clients {
		select {
		case c.send <- message:
		default:
			// Handle failed send
		}
	}
}
```

```go
// internal/chat/client.go
package chat

import (
	"bytes"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"go-react-chat/internal/database"
	"go-react-chat/internal/models"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512
)

var (
	newline = []byte{'\n'}
	space   = []byte{' '}
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow connections from any origin in development
		// In production, restrict this to known origins
		return true
	},
}

// Client is a middleman between the websocket connection and the hub.
type Client struct {
	hub *Hub

	// The websocket connection.
	conn *websocket.Conn

	// Buffered channel of outbound messages.
	send chan *Message

	// User information
	userID   uint
	username string
}

// ServeWs handles websocket requests from the peer.
func ServeWs(hub *Hub, w http.ResponseWriter, r *http.Request, userID uint) {
	// Get user information
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		http.Error(w, "User not found", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	
	client := &Client{
		hub:      hub,
		conn:     conn,
		send:     make(chan *Message, 256),
		userID:   userID,
		username: user.Username,
	}
	
	client.hub.register <- client

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.writePump()
	go client.readPump()
}

// readPump pumps messages from the websocket connection to the hub.
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error { 
		c.conn.SetReadDeadline(time.Now().Add(pongWait)); 
		return nil 
	})
	
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}
		
		message = bytes.TrimSpace(bytes.Replace(message, newline, space, -1))
		
		// Create and broadcast the message
		msg := &Message{
			Content: string(message),
			UserID:  c.userID,
		}
		c.hub.broadcast <- msg
	}
}

// writePump pumps messages from the hub to the websocket connection.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			
			// Serialize the message to JSON
			jsonMessage, err := message.ToJSON()
			if err != nil {
				log.Printf("Error serializing message: %v", err)
				continue
			}
			
			w.Write(jsonMessage)

			// Add queued chat messages to the current websocket message.
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write(newline)
				jsonMessage, err := (<-c.send).ToJSON()
				if err != nil {
					log.Printf("Error serializing queued message: %v", err)
					continue
				}
				w.Write(jsonMessage)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
```

```go
// internal/chat/message.go
package chat

import (
	"encoding/json"
	"time"
)

type Message struct {
	Type      string    `json:"type"` // "chat", "user_status", "online_users"
	Content   string    `json:"content,omitempty"`
	Username  string    `json:"username,omitempty"`
	UserID    uint      `json:"user_id,omitempty"`
	Timestamp time.Time `json:"timestamp,omitempty"`
	Status    string    `json:"status,omitempty"` // "online", "offline"
	Users     []string  `json:"users,omitempty"`  // For online_users message
}

func (m *Message) ToJSON() ([]byte, error) {
	return json.Marshal(m)
}
```

### 2.8. API Routes

```go
// internal/routes/routes.go
package routes

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go-react-chat/internal/auth"
	"go-react-chat/internal/chat"
	"go-react-chat/internal/database"
	"go-react-chat/internal/models"
)

func SetupRoutes(router *gin.Engine, hub *chat.Hub) {
	// Public routes
	public := router.Group("/api")
	{
		public.POST("/signup", signup)
		public.POST("/login", login)
	}

	// Protected routes
	protected := router.Group("/api")
	protected.Use(auth.AuthMiddleware())
	{
		protected.GET("/ws", func(c *gin.Context) {
			userID, _ := c.Get("userID")
			chat.ServeWs(hub, c.Writer, c.Request, userID.(uint))
		})
		protected.GET("/messages", getMessages)
		protected.GET("/users", getUsers)
	}
}

type SignupRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

func signup(c *gin.Context) {
	var req SignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := auth.Signup(req.Username, req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"user": user})
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token, err := auth.Login(req.Username, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token})
}

func getMessages(c *gin.Context) {
	var messages []models.Message
	database.DB.Preload("User").Order("created_at asc").Find(&messages)
	c.JSON(http.StatusOK, gin.H{"messages": messages})
}

func getUsers(c *gin.Context) {
	var users []models.User
	database.DB.Select("id, username").Find(&users)
	c.JSON(http.StatusOK, gin.H{"users": users})
}
```

### 2.9. Main Application Entry Point

```go
// main.go
package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"go-react-chat/internal/chat"
	"go-react-chat/internal/database"
	"go-react-chat/internal/routes"
)

func main() {
	// Set Gin to release mode in production
	if os.Getenv("GIN_MODE") != "debug" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Connect to the database
	database.Connect()

	// Create the chat hub
	hub := chat.NewHub()
	go hub.Run() // Run the hub in a separate goroutine

	// Create Gin router
	router := gin.Default()

	// Serve React frontend (to be built later)
	router.Static("/", "./client/build")

	// Setup API routes
	routes.SetupRoutes(router, hub)

	// Get port from environment variable or default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(router.Run(":" + port))
}
```

## 3. Setting Up the Frontend with React

### 3.1. Creating the React Application

We'll create the React application inside the `client` directory.

```bash
npx create-react-app client
cd client
npm install axios react-router-dom
```

### 3.2. Project Structure

```
client/
├── public/
├── src/
│   ├── components/
│   │   ├── Chat.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   └── Navbar.jsx
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── hooks/
│   │   └── useChat.js
│   ├── services/
│   │   └── api.js
│   ├── App.js
│   ├── App.css
│   └── index.js
├── package.json
└── ...
```

### 3.3. Authentication Context

```jsx
// client/src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({
    token: localStorage.getItem('token'),
    isAuthenticated: null,
    loading: true,
    user: null
  });

  useEffect(() => {
    if (auth.token) {
      setAuth(prev => ({ ...prev, isAuthenticated: true, loading: false }));
    } else {
      setAuth(prev => ({ ...prev, isAuthenticated: false, loading: false }));
    }
  }, [auth.token]);

  const login = (token) => {
    localStorage.setItem('token', token);
    setAuth({
      token,
      isAuthenticated: true,
      loading: false,
      user: null
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setAuth({
      token: null,
      isAuthenticated: false,
      loading: false,
      user: null
    });
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
```

### 3.4. API Service

```jsx
// client/src/services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

// Create an axios instance
const api = axios.create({
  baseURL: API_BASE_URL
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token is invalid, remove it and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 3.5. Authentication Components

```jsx
// client/src/components/Register.jsx
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import api from '../services/api';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const { username, email, password } = formData;

  const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault();
    
    try {
      const res = await api.post('/signup', formData);
      console.log('Registration successful', res.data);
      navigate('/login');
    } catch (err) {
      console.error('Registration error:', err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Registration failed. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create a new account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={onSubmit}>
          {error && <div className="text-red-500 text-center">{error}</div>}
          <input type="hidden" name="remember" value="true" />
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={onChange}
              />
            </div>
            <div>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={onChange}
              />
            </div>
            <div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={onChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
```

```jsx
// client/src/components/Login.jsx
import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import api from '../services/api';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const { username, password } = formData;

  const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault();
    
    try {
      const res = await api.post('/login', formData);
      login(res.data.token);
      navigate('/chat');
    } catch (err) {
      console.error('Login error:', err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={onSubmit}>
          {error && <div className="text-red-500 text-center">{error}</div>}
          <input type="hidden" name="remember" value="true" />
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={onChange}
              />
            </div>
            <div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={onChange}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                Don't have an account? Sign up
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
```

### 3.6. Chat Component with WebSocket

```jsx
// client/src/hooks/useChat.js
import { useState, useEffect, useRef } from 'react';

const useChat = (token) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const ws = useRef(null);

  useEffect(() => {
    if (!token) return;

    // Create WebSocket connection
    const wsUrl = process.env.REACT_APP_WS_URL || `ws://localhost:8080/api/ws`;
    ws.current = new WebSocket(`${wsUrl}?token=${token}`);

    ws.current.onopen = () => {
      console.log('Connected to WebSocket');
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'chat':
          setMessages(prev => [...prev, {
            id: Date.now(), // Simple ID for frontend
            content: data.content,
            username: data.username,
            timestamp: data.timestamp
          }]);
          break;
          
        case 'online_users':
          setUsers(data.users);
          break;
          
        case 'user_status':
          if (data.status === 'online') {
            setUsers(prev => [...new Set([...prev, data.username])]);
          } else {
            setUsers(prev => prev.filter(user => user !== data.username));
          }
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    };

    ws.current.onclose = () => {
      console.log('Disconnected from WebSocket');
    };

    // Fetch initial messages
    fetchInitialMessages();

    // Cleanup function
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [token]);

  const fetchInitialMessages = async () => {
    try {
      const response = await fetch('/api/messages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error fetching initial messages:', error);
    }
  };

  const sendMessage = () => {
    if (inputMessage.trim() && ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(inputMessage);
      setInputMessage('');
    }
  };

  return {
    messages,
    users,
    inputMessage,
    setInputMessage,
    sendMessage
  };
};

export default useChat;
```

```jsx
// client/src/components/Chat.jsx
import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import useChat from '../hooks/useChat';

const Chat = () => {
  const { auth, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  const {
    messages,
    users,
    inputMessage,
    setInputMessage,
    sendMessage
  } = useChat(token);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-300 flex flex-col">
        <div className="p-4 border-b border-gray-300">
          <h1 className="text-xl font-bold">Chat App</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-2">Online Users</h2>
            <ul>
              {users.map((user, index) => (
                <li key={index} className="py-2 px-4 hover:bg-gray-100 rounded">
                  {user}
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-300">
          <button
            onClick={handleLogout}
            className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="bg-white p-4 rounded shadow">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-indigo-600">{msg.username}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p>{msg.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-300 bg-white">
          <div className="flex">
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded-l py-2 px-4 focus:outline-none"
              placeholder="Type a message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-r"
              onClick={sendMessage}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
```

### 3.7. Main Application Component

```jsx
// client/src/App.js
import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthContext from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';

const App = () => {
  const { auth } = useContext(AuthContext);

  // Show loading spinner while checking auth status
  if (auth.loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={auth.isAuthenticated ? <Navigate to="/chat" /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/login" 
          element={!auth.isAuthenticated ? <Login /> : <Navigate to="/chat" />} 
        />
        <Route 
          path="/register" 
          element={!auth.isAuthenticated ? <Register /> : <Navigate to="/chat" />} 
        />
        <Route 
          path="/chat" 
          element={auth.isAuthenticated ? <Chat /> : <Navigate to="/login" />} 
        />
      </Routes>
    </Router>
  );
};

export default App;
```

### 3.8. Update Index.js

```jsx
// client/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

## 4. Running the Application

### 4.1. Backend

In the root project directory (`go-react-chat`):

1.  Make sure you have SQLite installed.
2.  Run the Go application:
    ```bash
    go run main.go
    ```
    This will start the backend server on `http://localhost:8080`.

### 4.2. Frontend

In the `client` directory:

1.  Install dependencies (if not already done):
    ```bash
    npm install
    ```
2.  Start the React development server:
    ```bash
    npm start
    ```
    This will start the frontend on `http://localhost:3000` and automatically open it in your browser.

## 5. Deployment Considerations

### 5.1. Building for Production

For the frontend, create a production build:

```bash
cd client
npm run build
```

This will create a `build` folder with optimized static files.

For the backend, you can build the Go binary:

```bash
cd ..
go build -o chat-app
```

### 5.2. Environment Variables

Set the following environment variables for production:

-   `GIN_MODE=release`
-   `PORT=8080` (or your desired port)
-   `JWT_SECRET=your_super_secret_key`

### 5.3. Database

For production, consider using a more robust database like PostgreSQL or MySQL instead of SQLite, and set up proper connection pooling.

### 5.4. Reverse Proxy

Use a reverse proxy like Nginx to serve the React frontend and proxy API requests to the Go backend. This also helps with SSL termination.

## 6. Conclusion

This guide has walked you through building a full-stack real-time chat application with Go and React. We've covered:

1.  **Backend Development**: Creating a REST API with Gin, implementing user authentication with JWT, and building a WebSocket-based real-time chat system.
2.  **Frontend Development**: Building a React application with user authentication, real-time messaging via WebSockets, and a responsive UI with Tailwind CSS.
3.  **Database Integration**: Using GORM with SQLite for data persistence.
4.  **Deployment**: Considerations for deploying the application to a production environment.

This application provides a solid foundation that you can extend with features like:
-   Private messaging
-   Chat rooms or channels
-   Message reactions
-   File sharing
-   Push notifications
-   End-to-end encryption

By understanding the principles and patterns demonstrated in this project, you can build more complex and feature-rich real-time applications.