---
title: "Go 语言主流安全库使用指南"
description: "介绍 Go 语言中主流的安全库，包括密码学、认证、授权、输入验证等方面的优秀库及其使用方法。"
keywords:
  - Go 安全库
  - 密码学
  - 认证
  - 授权
  - 安全工具
author: PFinal南丞
date: 2026-04-22
tags:
  - golang
  - security
  - libraries
  - cryptography
---

# Go 语言主流安全库使用指南

> Go 生态有丰富的安全库。本文介绍主流安全库及其最佳实践。

## 一、密码学库

### 1.1 标准库 crypto

```go
package main

import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
    "crypto/sha256"
    "encoding/hex"
    "io"
)

// AES-GCM 加密
func encrypt(plaintext []byte, key []byte) ([]byte, error) {
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
    
    ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
    return ciphertext, nil
}

// SHA-256 哈希
func hash(data []byte) string {
    h := sha256.Sum256(data)
    return hex.EncodeToString(h[:])
}
```

### 1.2 bcrypt 密码哈希

```go
import "golang.org/x/crypto/bcrypt"

// 密码哈希
func hashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    return string(bytes), err
}

// 密码验证
func checkPassword(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}
```

## 二、JWT 库

### 2.1 golang-jwt/jwt

```go
import "github.com/golang-jwt/jwt/v5"

// 生成 JWT
type Claims struct {
    UserID int64 `json:"user_id"`
    jwt.RegisteredClaims
}

func generateJWT(userID int64, secret []byte) (string, error) {
    claims := Claims{
        UserID: userID,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
        },
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(secret)
}
```

## 三、验证库

### 3.1 go-playground/validator

```go
import "github.com/go-playground/validator/v10"

var validate = validator.New()

type User struct {
    Name  string `validate:"required,min=2,max=50"`
    Email string `validate:"required,email"`
    Age   int    `validate:"gte=0,lte=130"`
}

func validateUser(user *User) error {
    return validate.Struct(user)
}
```

## 四、总结

| 类别 | 推荐库 | 用途 |
|------|--------|------|
| 密码学 | crypto/* | 加密/哈希 |
| 密码哈希 | golang.org/x/crypto/bcrypt | 密码存储 |
| JWT | golang-jwt/jwt | 认证令牌 |
| 验证 | go-playground/validator | 输入验证 |

选择合适的安全库，能让你的应用更加安全可靠。
