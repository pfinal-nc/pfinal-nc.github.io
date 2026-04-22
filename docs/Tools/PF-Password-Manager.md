---
title: "程序员必备神器：PF-password 密码管理器"
description: "介绍 PF-password 密码管理器的功能特点、技术实现和使用方法，一款专为程序员设计的开源密码管理工具。"
keywords:
  - 密码管理器
  - PF-password
  - 密码安全
  - 开源工具
  - Wails
author: PFinal南丞
date: 2026-04-22
tags:
  - tools
  - password-manager
  - security
  - wails
---

# 程序员必备神器：PF-password 密码管理器

> PF-password 是一款专为程序员设计的开源密码管理器，使用 Go + Wails 构建，安全、高效、跨平台。

## 一、功能特点

### 1.1 核心功能

- **端到端加密**：使用 AES-256-GCM 加密算法
- **本地存储**：数据完全存储在本地，不上传云端
- **密码生成**：支持自定义规则的强密码生成
- **自动填充**：支持浏览器扩展自动填充
- **跨平台**：支持 Windows、macOS、Linux

### 1.2 界面预览

```
┌─────────────────────────────────────┐
│  PF-password              [+] [⚙️]  │
├─────────────────────────────────────┤
│  🔍 Search...                       │
├─────────────────────────────────────┤
│  📁 Categories                      │
│  ├── 💼 Work (12)                   │
│  ├── 🏠 Personal (8)                │
│  └── 🎮 Gaming (3)                  │
├─────────────────────────────────────┤
│  📋 Recent                          │
│  ├── GitHub ••••••••••••            │
│  ├── AWS    ••••••••••••            │
│  └── Docker ••••••••••••            │
└─────────────────────────────────────┘
```

## 二、技术实现

### 2.1 加密方案

```go
// 主密钥派生
func deriveMasterKey(password string, salt []byte) []byte {
    key := argon2.IDKey(
        []byte(password),
        salt,
        3,          // 迭代次数
        64*1024,    // 内存 (64MB)
        4,          // 并行度
        32,         // 密钥长度
    )
    return key
}

// 数据加密
func encrypt(data []byte, key []byte) ([]byte, error) {
    block, err := aes.NewCipher(key)
    if err != nil {
        return nil, err
    }
    
    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, err
    }
    
    nonce := make([]byte, gcm.NonceSize())
    if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
        return nil, err
    }
    
    return gcm.Seal(nonce, nonce, data, nil), nil
}
```

### 2.2 数据存储

```go
type PasswordEntry struct {
    ID        string    `json:"id"`
    Title     string    `json:"title"`
    Username  string    `json:"username"`
    Password  []byte    `json:"password"` // 加密存储
    URL       string    `json:"url"`
    Notes     string    `json:"notes"`
    Category  string    `json:"category"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

type Vault struct {
    Salt    []byte            `json:"salt"`
    Entries []PasswordEntry   `json:"entries"`
}
```

## 三、使用方法

### 3.1 安装

```bash
# macOS
brew install pf-password

# Windows
winget install PF-password

# Linux
snap install pf-password
```

### 3.2 基本操作

```go
// 创建新密码项
func (a *App) CreateEntry(title, username, password, url, category string) error {
    entry := PasswordEntry{
        ID:        uuid.New().String(),
        Title:     title,
        Username:  username,
        Password:  a.encryptPassword(password),
        URL:       url,
        Category:  category,
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    }
    
    a.vault.Entries = append(a.vault.Entries, entry)
    return a.saveVault()
}

// 生成强密码
func (a *App) GeneratePassword(length int, useUpper, useLower, useNumbers, useSymbols bool) string {
    var charset string
    
    if useLower {
        charset += "abcdefghijklmnopqrstuvwxyz"
    }
    if useUpper {
        charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    }
    if useNumbers {
        charset += "0123456789"
    }
    if useSymbols {
        charset += "!@#$%^&*()_+-=[]{}|;:,.<>?"
    }
    
    password := make([]byte, length)
    for i := range password {
        password[i] = charset[rand.Intn(len(charset))]
    }
    
    return string(password)
}
```

## 四、总结

PF-password 是一款安全、易用的密码管理器，适合程序员日常使用。开源免费，欢迎贡献代码。
