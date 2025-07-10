---
title: Common Encryption and Decryption Algorithms for Crawlers
date: 2023-09-05 22:10:20
tags:
    - crawler
    - python
description: Collection of common encryption and decryption algorithm features for crawlers
author: PFinal南丞
keywords: crawler, encryption, decryption, algorithm, features, collection
---

# Common Encryption and Decryption Algorithms for Crawlers

## Introduction

This document collects various commonly used encryption algorithms, the principles of encoding algorithms, and basic implementation methods in both JS and Python. When encountering JS encryption, you can quickly restore the encryption process. Some websites may have additional processing during encryption, but the general methods are similar:

Common encryption algorithms:

1. Symmetric encryption (same key for encryption and decryption): DES, 3DES, AES, RC4, RABBIT
2. Asymmetric encryption (distinguishes between public and private keys): RSA, DSA, ECC
3. Message digest/signature algorithms: MD5, SHA, HMAC, PBKDF2
4. Common encoding algorithms: Base64

## JS Encryption/Decryption Modules

**Crypto-JS**

crypto-js supports MD5, SHA, RIPEMD-160, HMAC, PBKDF2, AES, DES, 3DES, Rabbit, RC4, etc. (does not support SA, ECC). It is a widely used encryption module. Install with npm install crypto-js.

References:
- Crypto-JS Docs: (https://cryptojs.gitbook.io/docs/)[https://cryptojs.gitbook.io/docs/]

**Node-RSA**

Node-RSA provides support for the RSA algorithm. Install with npm install node-rsa.

References:
- Node-RSA Github: https://github.com/rzcoder/node-rsa

**JSEncrypt**

JSEncrypt provides more comprehensive support for the RSA algorithm. Install with npm install jsencrypt.

References:
- JSEncrypt Docs: http://travistidwell.com/jsencrypt/
- JSEncrypt Github: https://github.com/travist/jsencrypt

## Python Encryption/Decryption Libraries

**Cryptodome & Crypto**

In Python, many algorithms are implemented via third-party libraries Cryptodome or Crypto. Cryptodome is almost a replacement for Crypto.

Cryptodome supports almost all mainstream encryption algorithms, including MD5, SHA, BLAKE2b, BLAKE2s, HMAC, PBKDF2, AES, DES, 3DES (Triple DES), ECC, RSA, RC4, etc.

Install Cryptodome with pip install pycryptodome, and Crypto with pip install pycrypto.

References:
- Cryptodome Library: https://www.pycryptodome.org/en/latest/

**Hashlib**

Python's standard library hashlib provides common digest algorithms such as MD5, SHA, BLAKE2b, BLAKE2s, etc.

References:
- hashlib Library: https://docs.python.org/3/library/hashlib.html
- Liao Xuefeng's hashlib: https://www.liaoxuefeng.com/wiki/1016959663602400/1017686752491744

**HMAC**

Python's standard library hmac provides support for the HMAC algorithm.

References:
- hmac Library: https://docs.python.org/3/library/hmac.html
- Liao Xuefeng's hmac: https://www.liaoxuefeng.com/wiki/1016959663602400/1183198304823296

**pyDes**

The third-party library pyDes provides support for the DES algorithm. Install with pip install pydes.

References:
- pyDes Library: https://github.com/twhiteman/pyDes

**RSA**

The third-party library rsa provides support for the RSA algorithm. Install with pip install rsa.

References:
- rsa Library: https://stuvel.eu/python-rsa-doc/

## Basic Parameters for Encryption/Decryption

In some symmetric and asymmetric encryption algorithms, the following three parameters are often used: initialization vector (iv), encryption mode (mode), and padding method (padding).

**Initialization Vector (iv)**

In cryptography, the initialization vector (iv) is used together with the key as a means of encrypting data. It is a fixed-length value, and its length depends on the encryption method, usually matching the length of the key or cipher block. Generally, it is required to be a random or pseudo-random number to achieve semantic security, making it difficult for attackers to break the ciphertext generated with the same key.

**Encryption Mode (mode)**

Currently, popular encryption and digital authentication algorithms use block encryption, which divides the plaintext to be encrypted into fixed-size data blocks and then applies the encryption algorithm to obtain the ciphertext. The block size usually matches the key length. Encryption modes are developed based on encryption algorithms and can also exist independently. The encryption mode defines how to use the encryption algorithm repeatedly to convert plaintext larger than a block size into ciphertext, describing the process for each data block. Common encryption modes include:

- ECB: Electronic Code Book, a basic encryption mode where ciphertext is divided into blocks of equal length (padded if necessary), and each block is encrypted independently.
- CBC: Cipher Block Chaining, a feedback mode where the previous block's ciphertext is XORed with the current block's plaintext before encryption, increasing the difficulty of decryption.
- CFB: Cipher Feedback, turns block ciphers into self-synchronizing stream ciphers, similar to CBC. The decryption process is almost the reverse of CBC encryption.
- OFB: Output Feedback, turns block ciphers into synchronous stream ciphers, generating key stream blocks that are XORed with plaintext blocks to get ciphertext.
- CTR: Counter mode, also known as ICM (Integer Counter Mode) or SIC (Segmented Integer Counter). In CTR mode, a counter is encrypted with the key, and the output is XORed with the plaintext to get the ciphertext. This method is simple, fast, secure, and supports parallel encryption, but the key can only be used once if the counter cannot be maintained for long.

**Padding Method (padding)**

Block ciphers can only process data blocks of a certain length, but message lengths are usually variable. Therefore, the last block of data needs to be padded before encryption. Common padding methods include:

- PKCS7: The number of padding bytes = block size - (data length % block size). All padding bytes are set to the value of the number of padding bytes.
- PKCS5: A subset of PKCS7, with a fixed block size of 8 bytes.
- ZeroPadding: All padding bytes are set to 0.
- ISO10126: The last padding byte is the number of padding bytes, and the rest are random values.
- ANSIX923: The last padding byte is the number of padding bytes, and the rest are zeros. 

## MD5

Full name: MD5 Message-Digest Algorithm, also known as the hash algorithm. The ciphertext of MD5 is 32 bits, while SHA-1 is 40 bits. The stronger the version, the longer the ciphertext, but the slower the speed.

JS Implementation:

```javascript
let CryptoJS = require('crypto-js')

function MD5Test() {
    let text = 'hello world'
    return new CryptoJS.MD5(text).toString()
}

console.log(MD5Test()) // Output: 5eb63bbbe01eeed093cb22bb8f5acdc3
```

Python Implementation:

```python
# -*- coding: utf-8 -*-
# @Time    : 2023/5/8 13:56
# @Author  : PFinal Nancheng
# @Email   : lampxiezi@163.com
# @File    : md5.py
# @Software: PyCharm
import hashlib

def md5_test1():
    """md5 test"""
    md5 = hashlib.new('md5', 'I love python!'.encode('utf-8'))
    print(md5.hexdigest())

def md5_test2():
    """md5 test"""
    md5 = hashlib.md5()
    md5.update('I love '.encode('utf-8'))
    md5.update('python!'.encode('utf-8'))
    print(md5.hexdigest())

if __name__ == '__main__':
    md5_test1()  # 21169ee3acd4a24e1fcb4322cfd9a2b8
    md5_test2()  # 21169ee3acd4a24e1fcb4322cfd9a2b8
```

## PBKDF2

PBKDF2 is a public key encryption standard from RSA Laboratories. PBKDF2 uses a pseudorandom function (such as HMAC), takes plaintext and a salt as input parameters, and performs repeated operations to finally produce a key. If the number of iterations is large enough, the cost of cracking becomes very high.

JS Implementation:

```javascript
let CryptoJS = require('crypto-js')

function pbkdf2Encrypt() {
    let text = 'I lov Python'
    let salt = '12345d'
    let encryptedData = CryptoJS.PBKDF2(text, salt, {keySize: 128 / 32, iterations: 10})
    return encryptedData.toString()
}

console.log(pbkdf2Encrypt()) // 22192e6ab76569b73bf0c3e20a9e03df
```

Python Implementation:

```python
# -*- coding: utf-8 -*-
# @Time    : 2023/5/8 14:08
# @Author  : PFinal Nancheng
# @Email   : lampxiezi@163.com
# @File    : pbkdf2.py
# @Software: PyCharm
import binascii
from Cryptodome.Hash import SHA1
from Cryptodome.Protocol.KDF import PBKDF2

text = 'I lov Python'
salt = b'12345d'

result = PBKDF2(text, salt, count=10, hmac_hash_module=SHA1)
result = binascii.hexlify(result)
print(result)  # 22192e6ab76569b73bf0c3e20a9e03df
```

## SHA

SHA stands for Secure Hash Algorithm. SHA is a more secure digest algorithm than MD5. MD5 ciphertext is 32 bits, while SHA-1 is 40 bits. The stronger the version, the longer the ciphertext, but the slower the speed.

JS Implementation:

```javascript
let CryptoJS = require('crypto-js')

function SHA1Encrypt() {
    var text = "I love python!"
    return CryptoJS.SHA1(text).toString();
}

console.log(SHA1Encrypt())  // 23c02b203bd2e2ca19da911f1d270a06d86719fb
```

Python Implementation:

```python
# -*- coding: utf-8 -*-
# @Time    : 2023/5/8 14:27
# @Author  : PFinal Nancheng
# @Email   : lampxiezi@163.com
# @File    : sha.py
# @Software: PyCharm
import hashlib

def sha1_test1():
    """sha1 test1"""
    sha1 = hashlib.new('sha1', 'I love python!'.encode('utf-8'))
    print(sha1.hexdigest())

def sha1_test2():
    """sha1 test2"""
    sha1 = hashlib.sha1()
    sha1.update('I love python!'.encode('utf-8'))
    print(sha1.hexdigest())

if __name__ == '__main__':
    sha1_test1()
    sha1_test2()
```

## HMAC

HMAC stands for Hash-based Message Authentication Code. It is a secure message authentication protocol based on a hash function and a shared key. Both parties share a key, agree on an algorithm, and perform a hash operation on the message to form a fixed-length authentication code. The legitimacy of the message is determined by verifying the authentication code.

JS Implementation:

```javascript
let CryptoJS = require('crypto-js')

function HMACEncrypt() {
    let text = "I love python!"
    let key = "secret"
    return CryptoJS.HmacMD5(text, key).toString();
}

console.log(HMACEncrypt())
```

Python Implementation:

```python
# -*- coding: utf-8 -*-
# @Time    : 2023/5/8 17:52
# @Author  : PFinal Nancheng
# @Email   : lampxiezi@163.com
# @File    : hmac_demo.py
# @Software: PyCharm
import hmac

def hamc_test1():
    """hamc_test"""
    message = b'I love python!'
    key = b'secret'
    md5 = hmac.new(key, message, digestmod='MD5')
    print(md5.hexdigest())

def hamc_test2():
    """hamc_test"""
    key = 'secret'.encode('utf8')
    sha1 = hmac.new(key, digestmod='sha1')
    sha1.update('I love '.encode('utf8'))
    sha1.update('Python!'.encode('utf8'))
    print(sha1.hexdigest())

if __name__ == '__main__':
    hamc_test2()
    hamc_test1()
```

## DES

DES stands for Data Encryption Standard. Encryption and decryption use the same key, which is a symmetric encryption algorithm. DES is a block cipher algorithm that uses a 56-bit key (usually considered 64 bits, but every 8th bit is a parity bit, so the effective key length is 56 bits). Due to the short key length, DES is considered insecure and has been replaced by more advanced standards like AES.

JS Implementation:

```javascript
/**
 * Created by PFinal Nancheng.
 * @Author :PFinal Nancheng<lampxiezi@163.com>
 * @Date   :2023/5/8 19:25
 * @File    : des.js
 * @Software: PyCharm
 */

let CryptoJS = require('crypto-js')

function desEncrypt() {
    var key = CryptoJS.enc.Utf8.parse(desKey),
        iv = CryptoJS.enc.Utf8.parse(desIv),
        srcs = CryptoJS.enc.Utf8.parse(text),
        // CBC encryption mode, Pkcs7 padding
        encrypted = CryptoJS.DES.encrypt(srcs, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
    return encrypted.toString();
}

function desDecrypt() {
    var key = CryptoJS.enc.Utf8.parse(desKey),
        iv = CryptoJS.enc.Utf8.parse(desIv),
        srcs = encryptedData,
        // CBC encryption mode, Pkcs7 padding
        decrypted = CryptoJS.DES.decrypt(srcs, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
    return decrypted.toString(CryptoJS.enc.Utf8);
}

var text = "I love Python!"       // Text to encrypt
var desKey = "6f726c64f2c2057"    // Key
var desIv = "0123456789ABCDEF"    // Initialization vector

var encryptedData = desEncrypt()
var decryptedData = desDecrypt()

console.log("Encrypted string: ", encryptedData)
console.log("Decrypted string: ", decryptedData)
// Encrypted string:  +ndbEkWNw2QAfIYQtwC14w==
// Decrypted string:  I love Python!
```

Python Implementation:

```python
# -*- coding: utf-8 -*-
# @Time    : 2023/5/9 09:00
# @Author  : PFinal Nancheng <lampxiezi@163.com
# @File    : des.py
# @Software: PyCharm
# Encryption mode CBC, padding PAD_PKCS5
import binascii
from pyDes import des, CBC, PAD_PKCS5

def des_encrypt(key, text, iv):
    k = des(key, CBC, iv, pad=None, padmode=PAD_PKCS5)
    de = k.encrypt(text, padmode=PAD_PKCS5)
    return binascii.b2a_hex(de)

def des_decrypt(key, text, iv): 
```

### RC4

RC4 is a popular stream cipher algorithm with a variable key length. It uses the same key for encryption and decryption, so it is also a symmetric encryption algorithm. RC4 was used in WEP (Wired Equivalent Privacy) and was once an option for TLS.

JS Implementation:

```javascript
/**
 * Created by PFinal Nancheng.
 * @Author :PFinal Nancheng<lampxiezi@163.com>
 * @Date   :2023/5/9 09:45
 * @File    : rc4.js
 * @Software: PyCharm
 */

let CryptoJS = require('crypto-js')

function RC4Encrypt() {
    return CryptoJS.RC4.encrypt(text, key).toString();
}

function RC4Decrypt() {
    return CryptoJS.RC4.decrypt(encryptedData, key).toString(CryptoJS.enc.Utf8);
}

var text = "I love Python!"
var key = "6f726c64f2c2057c"

var encryptedData = RC4Encrypt()
var decryptedData = RC4Decrypt()

console.log("Encrypted string: ", encryptedData)
console.log("Decrypted string: ", decryptedData)
```

Python Implementation:

```python
# -*- coding: utf-8 -*-
# @Time    : 2023/5/9 09:51
# @Author  : PFinal Nancheng <lampxiezi@163.com
# @File    : rc4.py
# @Software: PyCharm
import base64
from Cryptodome.Cipher import ARC4

def rc4_encrypt(key, t):
    """Encrypt"""
    enc = ARC4.new(key.encode('utf8'))
    res = enc.encrypt(t.encode('utf-8'))
    res = base64.b64encode(res)
    return res

def rc4_decrypt(key, t):
    """Decrypt"""
    data = base64.b64encode(t)
    enc = ARC4.new(key.encode('utf8'))
    res = enc.decrypt(data)
    return res

if __name__ == '__main__':
    secret_key = '12345678'  # Key
    text = 'I love Python!'  # Text to encrypt
    encrypted_str = rc4_encrypt(secret_key, text)
    print('Encrypted string:', encrypted_str)
    decrypted_str = rc4_decrypt(secret_key, encrypted_str)
    print('Decrypted string:', decrypted_str)
```

### RSA

The RSA encryption algorithm is an asymmetric encryption algorithm. RSA is widely used in public key encryption and e-commerce. It is generally considered one of the best public key schemes available. RSA is the first algorithm that can be used for both encryption and digital signatures, and it can resist all known cryptographic attacks so far.

JS Implementation:

```javascript
/**
 * Created by PFinal Nancheng.
 * @Author :PFinal Nancheng<lampxiezi@163.com>
 * @Date   :2023/5/9 10:03
 * @File    : rsa.js
 * @Software: PyCharm
 */

let NodeRSA = require('node-rsa');

function rsaEncrypt() {
    pubKey = new NodeRSA(publicKey, 'pkcs8-public');
    var encryptedData = pubKey.encrypt(text, 'base64');
    return encryptedData
}

function rsaDecrypt() {
    priKey = new NodeRSA(privatekey,'pkcs8-private');
    var decryptedData = priKey.decrypt(encryptedData, 'utf8');
    return decryptedData
}

var key = new NodeRSA({b: 512});                    // Generate 512-bit key
var publicKey = key.exportKey('pkcs8-public');    // Export public key
var privatekey = key.exportKey('pkcs8-private');  // Export private key
var text = "I love Python!"

var encryptedData = rsaEncrypt()
var decryptedData = rsaDecrypt()

console.log("Public Key:\n", publicKey)
console.log("Private Key:\n", privatekey)
console.log("Encrypted string: ", encryptedData)
console.log("Decrypted string: ", decryptedData)
```

Python Implementation:

```python
# -*- coding: utf-8 -*-
# @Time    : 2023/5/9 10:09
# @Author  : PFinal Nancheng <lampxiezi@163.com
# @File    : rsa_demo.py.py
# @Software: PyCharm
import rsa as rsa

def rsa_encrypt(pu_key, t):
    """Encrypt"""
    return rsa.encrypt(t.encode("utf-8"), pu_key)

def rsa_decrypt(pr_key, t):
    """Decrypt with private key"""
    return rsa.decrypt(t, pr_key).decode("utf-8")

if __name__ == "__main__":
    public_key, private_key = rsa.newkeys(512)  # Generate public and private keys
    print('Public Key:', public_key)
    print('Private Key:', private_key)
    text = 'I love Python!'  # Text to encrypt
    encrypted_str = rsa_encrypt(public_key, text)
    print('Encrypted string:', encrypted_str)
    decrypted_str = rsa_decrypt(private_key, encrypted_str)
    print('Decrypted string:', decrypted_str)
``` 