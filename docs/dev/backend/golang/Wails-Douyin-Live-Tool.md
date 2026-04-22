---
title: "基于 Wails 的抖音直播工具"
description: "介绍如何使用 Wails 框架开发抖音直播助手工具，包括弹幕获取、礼物统计、自动回复等功能实现。"
keywords:
  - Wails
  - 抖音直播
  - 直播工具
  - 桌面应用
  - Go
author: PFinal南丞
date: 2026-04-22
tags:
  - golang
  - wails
  - live-streaming
  - douyin
---

# 基于 Wails 的抖音直播工具

> 使用 Wails + Go 开发跨平台抖音直播助手，支持弹幕获取、礼物统计、自动回复等功能。

## 一、功能介绍

### 1.1 主要功能

- **实时弹幕**：获取直播间弹幕消息
- **礼物统计**：记录和分析礼物数据
- **自动回复**：关键词自动回复
- **数据导出**：支持 Excel/CSV 导出
- **多直播间**：同时监控多个直播间

### 1.2 技术栈

- **后端**：Go + Wails v2
- **前端**：Vue 3 + Element Plus
- **通信**：WebSocket
- **存储**：SQLite

## 二、项目结构

```
douyin-live-tool/
├── backend/
│   ├── app.go              # Wails 应用入口
│   ├── live/
│   │   ├── client.go       # 直播客户端
│   │   ├── message.go      # 消息处理
│   │   └── room.go         # 房间管理
│   ├── database/
│   │   └── db.go           # 数据库操作
│   └── service/
│       └── live_service.go # 业务逻辑
├── frontend/
│   ├── src/
│   │   ├── components/     # Vue 组件
│   │   ├── views/          # 页面视图
│   │   └── App.vue
│   └── package.json
├── go.mod
└── wails.json
```

## 三、核心实现

### 3.1 直播客户端

```go
package live

import (
    "github.com/gorilla/websocket"
)

type Client struct {
    conn      *websocket.Conn
    roomID    string
    messages  chan Message
    stopChan  chan struct{}
}

type Message struct {
    Type     string `json:"type"`
    User     string `json:"user"`
    Content  string `json:"content"`
    GiftName string `json:"gift_name,omitempty"`
    GiftCount int   `json:"gift_count,omitempty"`
}

func NewClient(roomID string) *Client {
    return &Client{
        roomID:   roomID,
        messages: make(chan Message, 100),
        stopChan: make(chan struct{}),
    }
}

func (c *Client) Connect() error {
    // 连接抖音直播 WebSocket
    url := fmt.Sprintf("wss://webcast.douyin.com/webcast/im/push/v2/?room_id=%s", c.roomID)
    
    conn, _, err := websocket.DefaultDialer.Dial(url, nil)
    if err != nil {
        return err
    }
    
    c.conn = conn
    go c.readLoop()
    
    return nil
}

func (c *Client) readLoop() {
    for {
        select {
        case <-c.stopChan:
            return
        default:
            _, data, err := c.conn.ReadMessage()
            if err != nil {
                log.Printf("read error: %v", err)
                return
            }
            
            c.handleMessage(data)
        }
    }
}

func (c *Client) handleMessage(data []byte) {
    // 解析抖音消息格式
    var msg Message
    if err := json.Unmarshal(data, &msg); err != nil {
        return
    }
    
    select {
    case c.messages <- msg:
    default:
        // 通道满，丢弃消息
    }
}
```

### 3.2 自动回复

```go
type AutoReply struct {
    Keywords []string
    Response string
}

type ReplyManager struct {
    rules []AutoReply
}

func (rm *ReplyManager) CheckAndReply(msg Message) (string, bool) {
    for _, rule := range rm.rules {
        for _, keyword := range rule.Keywords {
            if strings.Contains(msg.Content, keyword) {
                return rule.Response, true
            }
        }
    }
    return "", false
}

func (rm *ReplyManager) AddRule(keywords []string, response string) {
    rm.rules = append(rm.rules, AutoReply{
        Keywords: keywords,
        Response: response,
    })
}
```

## 四、前端界面

```vue
<template>
  <div class="live-tool">
    <el-card>
      <div slot="header">
        <span>抖音直播助手</span>
      </div>
      
      <el-form :model="form">
        <el-form-item label="直播间ID">
          <el-input v-model="form.roomID" placeholder="输入直播间ID" />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="connect">连接</el-button>
          <el-button @click="disconnect">断开</el-button>
        </el-form-item>
      </el-form>
      
      <el-divider />
      
      <div class="messages">
        <div v-for="msg in messages" :key="msg.id" class="message">
          <span class="user">{{ msg.user }}:</span>
          <span class="content">{{ msg.content }}</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  data() {
    return {
      form: {
        roomID: ''
      },
      messages: []
    }
  },
  methods: {
    async connect() {
      await window.go.backend.App.Connect(this.form.roomID)
    },
    async disconnect() {
      await window.go.backend.App.Disconnect()
    }
  },
  mounted() {
    // 监听消息
    window.runtime.EventsOn('message', (msg) => {
      this.messages.push(msg)
    })
  }
}
</script>
```

## 五、总结

使用 Wails 开发桌面应用，可以快速构建跨平台的直播工具。Go 处理后端逻辑，Vue 构建界面，开发体验非常好。
