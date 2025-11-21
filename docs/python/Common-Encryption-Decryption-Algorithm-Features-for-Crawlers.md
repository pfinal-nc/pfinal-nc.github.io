---
title: A Crawler Developer's Guide to Identifying Encryption Algorithms
date: 2023-09-05 22:10:20
tags:
    - python
    - crawler
    - security
    - reverse-engineering
description: A practical guide for web crawler developers on how to identify common encryption, hashing, and encoding algorithms found in website JavaScript code.
author: PFinal南丞
keywords: crawler, encryption, decryption, reverse-engineering, javascript, cryptojs, aes, rsa, md5, sha, base64
---

# A Crawler Developer's Guide to Identifying Encryption Algorithms

## Introduction

When developing web crawlers, you will inevitably encounter websites that protect their data or API requests with encryption. A login password might be RSA encrypted, an API request might require an MD5-based signature, or the data returned from an API might be an AES-encrypted blob.

Before you can replicate this logic in Python, your first and most critical task is to **identify** which algorithm is being used. This guide provides a set of "fingerprints" and common features to help you quickly spot these algorithms in obfuscated or minified JavaScript code.

---

## Quick Identification Cheat Sheet

| Algorithm | Common JS Keywords / Libraries | Key Variables to Find | Tell-Tale Signs & Output |
| :--- | :--- | :--- | :--- |
| **AES** | `CryptoJS.AES`, `encrypt`, `decrypt` | `key`, `iv`, `mode` (e.g., `CBC`), `padding` (e.g., `Pkcs7`) | Encrypted output is often Base64 encoded. |
| **DES** | `CryptoJS.DES`, `CryptoJS.TripleDES` | `key`, `iv`, `mode`, `padding` | Similar to AES but less common now. |
| **RSA** | `JSEncrypt`, `setPublicKey`, `encrypt` | Public Key (Modulus `n`, Exponent `e`) | A very long hexadecimal string for the public key. |
| **MD5** | `CryptoJS.MD5`, `hex_md5`, `md5()` | (None, it's a hash) | A 32-character hexadecimal string. |
| **SHA** | `CryptoJS.SHA1`, `CryptoJS.SHA256`, etc. | (None, it's a hash) | SHA1: 40 hex chars. SHA256: 64 hex chars. |
| **Base64**| `btoa()`, `atob()` | (None, it's encoding) | Output uses `A-Z`, `a-z`, `0-9`, `+`, `/` and may have `=` padding. |

---

## 1. Symmetric Encryption: AES & DES

In symmetric encryption, the same key is used for both encryption and decryption. `CryptoJS` is by far the most common library for this in web development.

### How to Identify AES/DES

Look for these patterns in the JavaScript code:

1.  **Library Keywords**: The most obvious sign is the use of the `CryptoJS` library. Search for:
    - `CryptoJS.AES.encrypt(...)`
    - `CryptoJS.AES.decrypt(...)`
    - `CryptoJS.DES.encrypt(...)`
    - `CryptoJS.TripleDES.encrypt(...)`

2.  **Configuration Objects**: Encryption calls are almost always accompanied by a configuration object that specifies the mode, padding, and initialization vector (IV).

    ```javascript
    // A typical CryptoJS AES encryption call
    var encrypted = CryptoJS.AES.encrypt(plainText, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,       // <-- Characteristic Mode
        padding: CryptoJS.pad.Pkcs7    // <-- Characteristic Padding
    });
    ```

3.  **Key Variables**:
    - **`key`**: The secret key. This is what you need most. It might be hardcoded, derived from other data, or fetched from an API.
    - **`iv`**: The initialization vector. It's often a fixed string or derived similarly to the key.
    - **`mode`**: The block cipher mode of operation. Common values are `CryptoJS.mode.CBC` and `CryptoJS.mode.ECB`.
    - **`padding`**: The padding scheme. Common values are `CryptoJS.pad.Pkcs7` and `CryptoJS.pad.AnsiX923`.

### What to Do After Identification

Once you've identified an AES/DES implementation, your goal is to find the **key**, **IV**, **mode**, and **padding**. With these, you can replicate the logic in Python using a library like `pycryptodome`.

---

## 2. Asymmetric Encryption: RSA

RSA is used when the client needs to encrypt data that only the server can decrypt (e.g., passwords during login). The client uses a public key to encrypt, and the server uses a private key to decrypt.

### How to Identify RSA

1.  **Library Keywords**: `JSEncrypt` is a very popular library for RSA in the frontend.
    - `new JSEncrypt()`
    - `.setPublicKey(...)` or `.setPrivateKey(...)`
    - `.encrypt(...)` or `.decrypt(...)`

2.  **Key Components**: RSA relies on a public key, which consists of a modulus (n) and a public exponent (e). In JavaScript, you'll often find these as very long hexadecimal strings.

    ```javascript
    // A typical JSEncrypt usage pattern
    var encrypt = new JSEncrypt();
    
    // The public key is often a long hex string, or fetched from an API
    var publicKey = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC... (long string) ...AQAB";
    
    encrypt.setPublicKey(publicKey);
    var encrypted = encrypt.encrypt(password);
    ```

3.  **Characteristic Variables**: Look for variables named `modulus`, `exponent`, `publicKey`, or `privateKey`.

### What to Do After Identification

Your goal is to extract the **public key** (specifically the modulus and exponent). Once you have it, you can use Python's `rsa` or `pycryptodome` library to perform the same encryption.

---

## 3. Hashing Algorithms: MD5 & SHA

Hashes are one-way functions used to create a fixed-size "fingerprint" of data. They are commonly used for generating request signatures, not for encrypting data that needs to be recovered.

### How to Identify MD5/SHA

1.  **Library Keywords**: Again, `CryptoJS` is common.
    - `CryptoJS.MD5(...)`
    - `CryptoJS.SHA1(...)`, `CryptoJS.SHA256(...)`
    - Sometimes you'll see custom or older functions like `hex_md5()` or `sha1()`.

2.  **Output Length**: The length of the output is a dead giveaway.
    - **MD5**: Produces a 32-character hexadecimal string.
    - **SHA-1**: Produces a 40-character hexadecimal string.
    - **SHA-256**: Produces a 64-character hexadecimal string.

    ```javascript
    // Example of generating a signature
    var timestamp = Date.now();
    var data = "some-data" + timestamp;
    var sign = CryptoJS.MD5(data + "my-secret-salt").toString(); 
    // sign will be a 32-character hex string
    ```

### What to Do After Identification

For hashes, you don't need a "key" for decryption. Instead, you need to identify the **exact input data** being hashed. This often includes a combination of request parameters, a timestamp, and sometimes a hardcoded "salt" or secret string. Your task is to find all these components and replicate the hashing process in the same order.

---

## 4. Encoding: Base64

Base64 is an **encoding** scheme, not an encryption algorithm. It's used to represent binary data in an ASCII string format. It's often used to encode the output of an encryption algorithm, so you'll frequently see it used alongside AES or RSA.

### How to Identify Base64

1.  **Native JavaScript Functions**:
    - `btoa()`: Encodes a string to Base64.
    - `atob()`: Decodes a Base64 string.

2.  **Characteristic Character Set**: The output string will only contain uppercase letters (`A-Z`), lowercase letters (`a-z`), numbers (`0-9`), and the `+` and `/` symbols. It may also be padded at the end with one or two `=` characters.

    ```javascript
    // A common pattern: encrypt and then Base64 encode
    var encrypted = CryptoJS.AES.encrypt(data, key, config);
    var finalOutput = encrypted.toString(CryptoJS.enc.Base64); // or sometimes just .toString()
    ```

### What to Do After Identification

If you see Base64, it's usually the final step in an encryption chain. When replicating in Python, remember to perform the same Base64 encoding/decoding step after you've handled the core encryption/decryption. Python's `base64` standard library is perfect for this.

## Conclusion

Identifying the encryption or hashing algorithm is the first and most important step in reverse-engineering a website's data protection measures. By looking for characteristic library calls, function names, constants, and output formats, you can quickly narrow down the possibilities. Once the algorithm is identified, your focus can shift to finding the necessary inputs—keys, IVs, and data—to replicate the process in your own crawler.