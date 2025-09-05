---
title: 每次登录都要翻记事本找密码-我写了个Alfred插件来管理密码
date: 2025-01-27 10:30:00
tags:
  - 工具
  - Python
  - Alfred
  - 密码管理
  - 效率
description: 作为一个注册了无数网站的程序员，密码管理一直是我的痛点。为了解决这个问题，我开发了一个简单的Alfred插件来管理密码，今天分享给大家。
author: PFinal南丞
keywords: Alfred插件, 密码管理器, Python, 工具开发, 效率提升, 密码管理
---

# 因为密码太多记不住，我写了个Alfred插件来管理密码

> 作为一个注册了无数网站的程序员，密码管理一直是我的痛点。每次登录都要想半天密码，或者点击"忘记密码"重置。为了解决这个问题，我决定自己写一个工具。

## 我的密码管理血泪史

作为一个程序员，我注册的网站实在是太多了：

- GitHub、GitLab、各种云服务
- 各种开发工具和IDE的账号
- 社交媒体、购物网站、银行APP
- 各种在线学习平台和技术社区

结果就是，我的密码管理彻底乱套了：

- 有些网站用"123456"，有些用"password"
- 有些用生日+姓名，有些用手机号
- 有些用公司名+数字，有些用随机字符串
- 最要命的是，我经常忘记自己到底用了什么密码

每次登录都要经历这样的痛苦循环：
1. 输入密码 → 错误
2. 再试一次 → 还是错误  
3. 点击"忘记密码" → 收邮件重置
4. 设置新密码 → 三个月后又忘记

终于有一天，我受够了这种日子，决定自己写个工具来解决这个问题。

## 我的解决方案：写个Alfred插件

既然我是Mac用户，而且每天都在用Alfred，那为什么不写个Alfred插件来管理密码呢？这样我就可以通过快捷键快速查找和复制密码了。

### 为什么选择Alfred插件？

1. **快速访问**：按个快捷键就能调出密码管理器
2. **无缝集成**：和我的工作流程完美结合
3. **本地存储**：数据完全在我自己的电脑上，不用担心泄露
4. **简单易用**：不需要打开额外的应用

### 核心功能设计

我的插件需要实现这些功能：

- ✅ **添加密码**：快速添加新的密码记录
- ✅ **搜索密码**：通过网站名或用户名快速找到密码
- ✅ **复制密码**：一键复制密码到剪贴板
- ✅ **删除密码**：清理不需要的密码记录
- ✅ **本地存储**：用SQLite数据库，数据安全可控

## 技术选型：为什么用Python + SQLite

### 我考虑过的其他方案

1. **1Password**：功能强大，但是要钱，而且界面复杂得像火箭控制台
2. **LastPass**：曾经免费，现在也开始收费，而且经常被黑客光顾
3. **浏览器自带的**：方便是方便，但是换浏览器就完蛋了
4. **自己写个桌面应用**：太复杂，而且跨平台兼容性不好

### 最终选择Python + SQLite的原因

```python
# 简单到爆的安装和使用
pip install -r requirements.txt
python pass.py
```

选择这个技术栈的原因：

1. **Python简单易学**：我本来就会Python，写起来很快
2. **SQLite零配置**：不需要安装数据库服务器，一个文件搞定
3. **跨平台支持**：Windows、Mac、Linux都能用
4. **Alfred插件支持**：Python写Alfred插件很简单

## 开发过程：从想法到实现

### 第一步：设计数据库结构

首先我需要设计一个简单的数据库结构来存储密码：

```python
# 密码表结构
CREATE TABLE passwords (
    id INTEGER PRIMARY KEY,
    website TEXT NOT NULL,
    username TEXT,
    password TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 第二步：写核心功能

然后我开始写核心的密码管理功能：

```python
import sqlite3
import os
from datetime import datetime

class PasswordManager:
    def __init__(self, db_path="passwords.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """初始化数据库"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS passwords (
                id INTEGER PRIMARY KEY,
                website TEXT NOT NULL,
                username TEXT,
                password TEXT NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        conn.close()
    
    def add_password(self, website, username, password, notes=""):
        """添加密码"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO passwords (website, username, password, notes)
            VALUES (?, ?, ?, ?)
        ''', (website, username, password, notes))
        conn.commit()
        conn.close()
        print(f"密码已保存：{website}")
    
    def search_passwords(self, keyword):
        """搜索密码"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM passwords 
            WHERE website LIKE ? OR username LIKE ?
        ''', (f'%{keyword}%', f'%{keyword}%'))
        results = cursor.fetchall()
        conn.close()
        return results
```

### 第三步：集成Alfred

最后，我把这个功能集成到Alfred插件中：

```python
import sys
import json
from password_manager import PasswordManager

def main():
    query = sys.argv[1] if len(sys.argv) > 1 else ""
    pm = PasswordManager()
    
    if query.startswith("add "):
        # 添加密码的逻辑
        pass
    elif query:
        # 搜索密码的逻辑
        results = pm.search_passwords(query)
        items = []
        for result in results:
            items.append({
                "title": f"{result[1]} - {result[2]}",
                "subtitle": "点击复制密码",
                "arg": result[3],  # 密码
                "icon": {"path": "icon.png"}
            })
        print(json.dumps({"items": items}))
    else:
        # 显示所有密码
        pass

if __name__ == "__main__":
    main()
```

## 使用体验：从混乱到有序

### 使用前：我的密码管理地狱

```
我的密码记录本：
- GitHub：123456
- GitLab：123456  
- 支付宝：123456
- 银行：123456
- 邮箱：123456
- 工作系统：123456
- 各种网站：123456

（别笑，我真的这样干过！）
```

### 使用后：密码管理的天堂

```
我的Alfred密码管理器：
- GitHub：Kj8#mN2$pL9@
- GitLab：X7&vB4!qR6%
- 支付宝：M3*nH8#sT1$
- 银行：P9@wE5&kY2!
- 邮箱：F6%jL3*nQ8#
- 工作系统：D2!bV7@mX4#
- 各种网站：每个都不一样！

现在只需要按个快捷键，输入网站名，密码就自动复制到剪贴板了！
```

## 安全考虑：虽然简单，但也要安全

虽然我的插件很简单，但安全问题还是要考虑的：

### 我发现的潜在问题
1. **密码是明文存储的**：SQLite文件里直接能看到密码
2. **没有加密**：数据库文件被偷了，密码就全暴露了
3. **没有访问控制**：谁都能打开这个文件

### 我的改进方案

后来我给插件加了个简单的加密功能：

```python
import hashlib
from cryptography.fernet import Fernet
import base64

class SimpleEncryption:
    def __init__(self, master_password):
        # 用主密码生成加密密钥
        key = hashlib.sha256(master_password.encode()).digest()
        self.cipher = Fernet(base64.urlsafe_b64encode(key))
    
    def encrypt(self, text):
        return self.cipher.encrypt(text.encode())
    
    def decrypt(self, encrypted_text):
        return self.cipher.decrypt(encrypted_text).decode()

# 在PasswordManager中使用加密
class SecurePasswordManager(PasswordManager):
    def __init__(self, db_path="passwords.db", master_password=""):
        super().__init__(db_path)
        self.encryption = SimpleEncryption(master_password)
    
    def add_password(self, website, username, password, notes=""):
        # 加密密码后存储
        encrypted_password = self.encryption.encrypt(password)
        # ... 存储到数据库
```

## 实际使用场景

### 场景一：管理开发环境的凭据

作为程序员，我经常需要管理各种服务的API密钥：

```
我的API密钥管理：
- GitHub：ghp_xxxxxxxxxxxx
- AWS：AKIAIOSFODNN7EXAMPLE
- 数据库：root:password123
- 服务器：admin:admin123

现在这些都可以通过Alfred快速查找和复制了！
```

### 场景二：日常网站登录

以前登录网站是这样的：
1. 打开网站
2. 点击登录
3. 输入用户名
4. 想半天密码是什么
5. 输入错误
6. 点击"忘记密码"
7. 收邮件重置

现在登录网站是这样的：
1. 打开网站
2. 按Alfred快捷键
3. 输入网站名
4. 选择对应的账号
5. 密码自动复制到剪贴板
6. 粘贴密码
7. 登录成功！

效率提升了至少10倍！

## 我的使用技巧

### 1. 密码生成策略

我给我的插件加了个密码生成功能：

```python
import secrets
import string

def generate_password(length=16):
    """生成一个连我自己都记不住的强密码"""
    characters = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(characters) for _ in range(length))
    print(f"新密码：{password}")
    print("建议：立即保存到Alfred插件中，因为你马上就会忘记！")
    return password
```

### 2. 数据备份策略

我每周都会备份一次密码数据库：

```python
import shutil
from datetime import datetime

def backup_passwords():
    """备份我的密码数据库"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"passwords_backup_{timestamp}.db"
    shutil.copy2("passwords.db", backup_name)
    print(f"密码已备份到：{backup_name}")
    print("建议：把备份文件放到云盘里，但记得加密！")
```

### 3. 密码强度检测

我还加了个密码强度检测功能：

```python
def check_password_strength(password):
    """检测我的密码有多强"""
    score = 0
    if len(password) >= 8:
        score += 1
    if any(c.islower() for c in password):
        score += 1
    if any(c.isupper() for c in password):
        score += 1
    if any(c.isdigit() for c in password):
        score += 1
    if any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        score += 1
    
    strength_levels = {
        0: "弱到爆",
        1: "还是很弱",
        2: "一般般",
        3: "还不错",
        4: "很强",
        5: "强到没朋友"
    }
    
    return {
        'score': score,
        'level': strength_levels.get(score, "未知")
    }

# 测试一下我之前的密码
test_password = "123456"
result = check_password_strength(test_password)
print(f"密码强度：{result['level']} (得分：{result['score']}/5)")
```

## 常见问题解答

### Q1：这个Alfred插件安全吗？
A：基础功能是安全的，但我建议加上加密功能。毕竟，把密码存在一个没有加密的文件里，就像把钥匙放在门垫下面一样。

### Q2：能跨设备使用吗？
A：目前不能，因为数据是本地存储的。但我可以把数据库文件复制到其他设备上使用。

### Q3：支持导入其他密码管理器吗？
A：目前不支持，但我可以手动添加。或者，写个脚本批量导入，这也是学习Python的好机会！

### Q4：忘记主密码怎么办？
A：这个问题很严重！我建议设置一个绝对不会忘记的主密码，比如我初恋的名字+生日。

## 我计划添加的功能

### 1. 密码过期提醒

我打算给我的插件加个密码过期提醒功能：

```python
from datetime import datetime, timedelta

def check_password_age():
    """检查哪些密码该换了"""
    # 实现密码年龄检查
    print("以下密码建议更换：")
    print("- 微信密码：已使用365天")
    print("- QQ密码：已使用730天")
    print("- 银行密码：已使用1095天（这个必须换！）")
```

### 2. 密码重复检测

我还想加个密码重复检测功能：

```python
def find_duplicate_passwords():
    """找出重复使用的密码"""
    # 实现重复密码检测
    print("发现重复密码：")
    print("- 密码 '123456' 被用于 15 个网站")
    print("- 密码 'password' 被用于 8 个网站")
    print("建议：立即更换这些密码！")
```

### 3. 浏览器集成

我还想加个浏览器集成功能：

```python
def sync_with_browser():
    """与浏览器密码管理器同步"""
    print("正在同步浏览器密码...")
    print("发现 50 个保存的密码")
    print("是否导入到我的Alfred插件？(y/n)")
    # 实现浏览器集成逻辑
```

## 分享给其他开发者

### 创建Alfred插件包

我把我的插件打包成了Alfred插件包，方便其他开发者使用：

```bash
# 创建插件包
mkdir PasswordManager.alfredworkflow
# 复制Python脚本和配置文件
cp password_manager.py PasswordManager.alfredworkflow/
cp info.plist PasswordManager.alfredworkflow/
```

### 发布到GitHub

我把代码发布到了GitHub上，方便其他开发者参考和改进：

```bash
git init
git add .
git commit -m "Initial commit: Alfred密码管理器插件"
git remote add origin https://github.com/yourusername/alfred-password-manager.git
git push -u origin main
```

## 安全提醒：重要的事情说三遍

### 1. 主密码很重要
- 不要用"123456"作为主密码
- 不要用我的生日作为主密码
- 不要用"password"作为主密码

### 2. 定期备份
- 我每周备份一次数据库文件
- 把备份文件放到安全的地方
- 不要忘记备份文件的密码

### 3. 不要分享
- 不要把我的密码数据库发给别人
- 不要在网上分享我的密码
- 不要用公共电脑管理密码

## 总结：从混乱到有序的密码管理

我的Alfred密码管理器插件虽然简单，但它解决了一个真实的问题。在这个密码泄露频发的时代，有一个可靠的密码管理器比什么都重要。

### 使用前后的对比

**使用前：**
- 密码：123456
- 状态：每天都在忘记密码
- 心情：焦虑、烦躁、想砸电脑

**使用后：**
- 密码：每个都不一样，强到没朋友
- 状态：再也不用担心忘记密码
- 心情：轻松、愉快、感觉自己很专业

### 给其他开发者的建议

1. **从简单开始**：先学会基本功能，再考虑高级特性
2. **重视安全**：密码管理器的核心就是安全
3. **养成习惯**：每天使用，让它成为你的习惯
4. **持续改进**：根据使用体验不断优化

### 最后的感想

记住，最好的密码管理器不是功能最复杂的，而是最适合你的。我的Alfred插件虽然简单，但它帮我建立了良好的密码管理习惯。

从今天开始，告别"123456"时代，拥抱安全的密码管理吧！我的未来会感谢现在的我。

如果你也有类似的痛点，不妨试试自己写个工具来解决。毕竟，程序员最大的优势就是能够用代码解决自己的问题！

---

*本文分享了我开发Alfred密码管理器插件的经历，旨在为其他程序员提供一个简单实用的密码管理解决方案。记住，安全无小事，密码管理要重视！*
