---
title: Python Web 爬虫实战：从入门到精通
date: 2026-03-11 00:00:00
description: 系统学习 Python Web 爬虫技术，掌握 Requests、BeautifulSoup、Scrapy 等核心库，构建高性能爬虫系统
keywords:
  - Python
  - Web爬虫
  - Scrapy
  - BeautifulSoup
  - 数据采集
  - Python Web 爬虫实战：从入门到精通
  - PFinalClub
  - 技术博客
tags: [Python, Web爬虫, Scrapy, BeautifulSoup, 数据采集]
difficulty: 🟡 进阶
category: dev/backend/python
---

# Python Web 爬虫实战：从入门到精通

Web 爬虫是自动获取互联网数据的重要技术。本文将带你从零开始，系统地掌握 Python Web 爬虫的核心技术，从简单的页面抓取到复杂的分布式爬虫系统。

## 🕷️ 爬虫基础概念

### 1. 什么是 Web 爬虫

```python
"""
Web 爬虫（Web Scraper / Web Crawler）是一种自动访问网站并提取数据的程序。

核心流程：
1. 发送 HTTP 请求
2. 获取网页内容（HTML）
3. 解析网页内容
4. 提取所需数据
5. 保存数据

应用场景：
- 数据采集和分析
- 价格监控
- 新闻聚合
- 搜索引擎索引
- 社交媒体分析
"""
```

### 2. HTTP 基础

```python
import requests

# HTTP 方法
# GET: 获取资源
response = requests.get('https://example.com')

# POST: 提交数据
data = {'username': 'user', 'password': 'pass'}
response = requests.post('https://example.com/login', data=data)

# PUT: 更新资源
response = requests.put('https://example.com/api/user/1', json={'name': 'new_name'})

# DELETE: 删除资源
response = requests.delete('https://example.com/api/user/1')

# HTTP 状态码
# 200: 成功
# 301/302: 重定向
# 404: 未找到
# 500: 服务器错误

# 请求头（Headers）
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
}

response = requests.get('https://example.com', headers=headers)
```

## 🚀 基础爬虫：Requests + BeautifulSoup

### 1. 发送 HTTP 请求

```python
import requests
from bs4 import BeautifulSoup
import time

# 基础 GET 请求
url = 'https://example.com'
response = requests.get(url)

# 检查请求状态
print(f"状态码: {response.status_code}")
print(f"响应头: {response.headers}")
print(f"内容长度: {len(response.content)}")

# 获取响应内容
html_text = response.text  # 文本格式
html_content = response.content  # 字节格式

# 添加请求头
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

response = requests.get(url, headers=headers)

# 添加延迟（避免被封）
time.sleep(2)  # 延迟2秒

# 处理重定向
response = requests.get(url, allow_redirects=False)
if response.status_code in [301, 302]:
    print(f"重定向到: {response.headers['Location']}")

# 超时设置
try:
    response = requests.get(url, timeout=5)  # 5秒超时
except requests.Timeout:
    print("请求超时")

# 会话管理（保持 Cookie）
session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0'
})

# 登录示例
login_data = {
    'username': 'your_username',
    'password': 'your_password'
}
session.post('https://example.com/login', data=login_data)
response = session.get('https://example.com/dashboard')
```

### 2. 解析 HTML 内容

```python
from bs4 import BeautifulSoup

# 解析 HTML
html = """
<html>
    <head>
        <title>示例页面</title>
    </head>
    <body>
        <div id="content">
            <h1 class="title">欢迎来到示例网站</h1>
            <div class="article">
                <h2>第一篇文章</h2>
                <p class="text">这是第一篇文章的内容。</p>
                <a href="https://example.com/article1" class="link">阅读更多</a>
            </div>
            <div class="article">
                <h2>第二篇文章</h2>
                <p class="text">这是第二篇文章的内容。</p>
                <a href="https://example.com/article2" class="link">阅读更多</a>
            </div>
        </div>
        <ul class="list">
            <li>项目 1</li>
            <li>项目 2</li>
            <li>项目 3</li>
        </ul>
    </body>
</html>
"""

# 创建 BeautifulSoup 对象
soup = BeautifulSoup(html, 'html.parser')  # 或 'lxml'（需安装 lxml）

# 基本操作
print(soup.title.string)  # 获取标题
print(soup.h1.string)     # 获取 h1 标签内容

# 查找元素
# 根据标签名
title = soup.find('h1')
print(title.string)

# 根据类名
articles = soup.find_all('div', class_='article')
for article in articles:
    print(article.h2.string)

# 根据 ID
content_div = soup.find('div', id='content')

# 使用 CSS 选择器
links = soup.select('a.link')  # 选择所有 class="link" 的 a 标签
for link in links:
    print(link['href'], link.string)

# 复杂选择器
elements = soup.select('div#content > div.article > h2')
for element in elements:
    print(element.string)

# 获取元素属性
link = soup.find('a', class_='link')
if link:
    print(link.get('href'))    # 获取 href 属性
    print(link['href'])        # 另一种方式

# 获取所有属性
print(link.attrs)

# 获取多个元素
list_items = soup.find_all('li')
for item in list_items:
    print(item.string)

# 遍历元素
for article in soup.find_all('div', class_='article'):
    title = article.h2.string
    content = article.p.string
    link = article.a['href']
    print(f"标题: {title}")
    print(f"内容: {content}")
    print(f"链接: {link}")
    print("-" * 50)
```

### 3. 实战：爬取新闻标题

```python
import requests
from bs4 import BeautifulSoup
import time
import csv

def scrape_news_titles(url):
    """爬取新闻网站标题"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        # 发送请求
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()  # 检查请求是否成功
        
        # 解析 HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 提取新闻标题（根据实际网站结构调整选择器）
        news_items = []
        
        # 示例选择器（需要根据目标网站调整）
        articles = soup.find_all('div', class_='news-item')
        
        for article in articles:
            try:
                title = article.find('h3', class_='title')
                if title:
                    news_data = {
                        'title': title.string.strip(),
                        'link': article.find('a')['href'],
                        'time': article.find('span', class_='time').string,
                    }
                    news_items.append(news_data)
            except Exception as e:
                print(f"解析文章时出错: {e}")
                continue
        
        return news_items
    
    except requests.RequestException as e:
        print(f"请求错误: {e}")
        return []
    except Exception as e:
        print(f"解析错误: {e}")
        return []

# 保存数据到 CSV
def save_to_csv(data, filename):
    """保存数据到 CSV 文件"""
    if not data:
        print("没有数据可保存")
        return
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
    
    print(f"已保存 {len(data)} 条数据到 {filename}")

# 示例使用
if __name__ == '__main__':
    # 替换为实际的目标 URL
    target_url = 'https://example.com/news'
    
    # 爬取数据
    print(f"正在爬取: {target_url}")
    news_data = scrape_news_titles(target_url)
    
    # 打印结果
    for i, news in enumerate(news_data, 1):
        print(f"{i}. {news['title']}")
        print(f"   链接: {news['link']}")
        print(f"   时间: {news['time']}")
        print()
    
    # 保存数据
    save_to_csv(news_data, 'news_data.csv')
    
    # 添加延迟，礼貌爬取
    time.sleep(2)
```

## 🕷️ 进阶爬虫：Scrapy 框架

### 1. Scrapy 基础

```python
# 创建 Scrapy 项目
# scrapy startproject myproject
# cd myproject

# items.py - 定义数据结构
import scrapy

class ArticleItem(scrapy.Item):
    title = scrapy.Field()
    link = scrapy.Field()
    content = scrapy.Field()
    author = scrapy.Field()
    publish_date = scrapy.Field()
    tags = scrapy.Field()

# spiders/example_spider.py - 创建爬虫
import scrapy
from myproject.items import ArticleItem

class ExampleSpider(scrapy.Spider):
    name = 'example'
    allowed_domains = ['example.com']
    start_urls = ['https://example.com/articles']
    
    def parse(self, response):
        """解析列表页"""
        # 提取文章链接
        article_links = response.css('div.article h2 a::attr(href)').getall()
        
        for link in article_links:
            # 跟踪链接，解析详情页
            yield response.follow(link, callback=self.parse_article)
        
        # 提取下一页链接
        next_page = response.css('a.next-page::attr(href)').get()
        if next_page:
            yield response.follow(next_page, callback=self.parse)
    
    def parse_article(self, response):
        """解析文章详情页"""
        item = ArticleItem()
        
        item['title'] = response.css('h1.article-title::text').get().strip()
        item['link'] = response.url
        item['content'] = '\n'.join(
            response.css('div.article-content p::text').getall()
        )
        item['author'] = response.css('span.author::text').get()
        item['publish_date'] = response.css('span.date::text').get()
        item['tags'] = response.css('div.tags a::text').getall()
        
        yield item

# 运行爬虫
# scrapy crawl example -o output.json
# scrapy crawl example -o output.csv
```

### 2. Scrapy 中间件

```python
# middlewares.py

# 随机 User-Agent 中间件
import random
from scrapy import signals

class RandomUserAgentMiddleware:
    """随机 User-Agent 中间件"""
    
    def __init__(self, user_agents):
        self.user_agents = user_agents
    
    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            user_agents=crawler.settings.getlist('USER_AGENTS')
        )
    
    def process_request(self, request, spider):
        request.headers['User-Agent'] = random.choice(self.user_agents)

# 代理中间件
class ProxyMiddleware:
    """代理 IP 中间件"""
    
    def __init__(self, proxy_list):
        self.proxy_list = proxy_list
        self.current_proxy = None
    
    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            proxy_list=crawler.settings.getlist('PROXY_LIST')
        )
    
    def process_request(self, request, spider):
        if self.proxy_list:
            self.current_proxy = random.choice(self.proxy_list)
            request.meta['proxy'] = self.current_proxy
    
    def process_exception(self, request, exception, spider):
        if isinstance(exception, scrapy.exceptions.TimeoutException):
            # 代理超时，移除该代理
            if self.current_proxy and self.current_proxy in self.proxy_list:
                self.proxy_list.remove(self.current_proxy)
                spider.logger.info(f"移除失效代理: {self.current_proxy}")

# 重试中间件
class RetryMiddleware:
    """重试中间件"""
    
    def __init__(self, max_retry_times, retry_http_codes):
        self.max_retry_times = max_retry_times
        self.retry_http_codes = retry_http_codes
    
    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            max_retry_times=crawler.settings.getint('RETRY_TIMES'),
            retry_http_codes=crawler.settings.getlist('RETRY_HTTP_CODES')
        )
    
    def process_response(self, request, response, spider):
        if response.status in self.retry_http_codes:
            reason = f"Status {response.status}"
            return self._retry(request, reason, spider) or response
        return response
    
    def process_exception(self, request, exception, spider):
        if isinstance(exception, scrapy.exceptions.TimeoutException):
            return self._retry(request, exception, spider)
    
    def _retry(self, request, reason, spider):
        retries = request.meta.get('retry_times', 0) + 1
        if retries <= self.max_retry_times:
            spider.logger.debug(f"重试 {retries} 次: {request.url} (原因: {reason})")
            retryreq = request.copy()
            retryreq.meta['retry_times'] = retries
            return retryreq
        else:
            spider.logger.error(f"放弃请求: {request.url} (重试 {retries} 次后仍失败)")
```

### 3. Scrapy 管道

```python
# pipelines.py

import json
import csv
from scrapy.exceptions import DropItem

class FilterEmptyPipeline:
    """过滤空数据"""
    
    def process_item(self, item, spider):
        if not item.get('title') or not item.get('link'):
            raise DropItem(f"空数据: {item}")
        return item

class DuplicatesPipeline:
    """去重"""
    
    def __init__(self):
        self.seen = set()
    
    def process_item(self, item, spider):
        link = item.get('link')
        if link in self.seen:
            raise DropItem(f"重复链接: {link}")
        self.seen.add(link)
        return item

class JsonPipeline:
    """保存为 JSON"""
    
    def __init__(self, filename):
        self.filename = filename
        self.file = None
    
    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            filename=crawler.settings.get('JSON_OUTPUT_FILE', 'output.json')
        )
    
    def open_spider(self, spider):
        self.file = open(self.filename, 'w', encoding='utf-8')
        self.file.write('[\n')
    
    def close_spider(self, spider):
        self.file.write('\n]')
        self.file.close()
    
    def process_item(self, item, spider):
        line = json.dumps(dict(item), ensure_ascii=False, indent=2)
        if self.file.tell() > len('[\n'):
            self.file.write(',\n')
        self.file.write(line)
        return item

class CsvPipeline:
    """保存为 CSV"""
    
    def __init__(self, filename):
        self.filename = filename
        self.file = None
        self.writer = None
    
    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            filename=crawler.settings.get('CSV_OUTPUT_FILE', 'output.csv')
        )
    
    def open_spider(self, spider):
        self.file = open(self.filename, 'w', newline='', encoding='utf-8')
        # 这里需要根据实际字段设置
        fieldnames = ['title', 'link', 'content', 'author', 'publish_date']
        self.writer = csv.DictWriter(self.file, fieldnames=fieldnames)
        self.writer.writeheader()
    
    def close_spider(self, spider):
        self.file.close()
    
    def process_item(self, item, spider):
        self.writer.writerow(dict(item))
        return item

class DatabasePipeline:
    """保存到数据库"""
    
    def __init__(self, db_uri):
        self.db_uri = db_uri
    
    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            db_uri=crawler.settings.get('DATABASE_URI')
        )
    
    def open_spider(self, spider):
        # 初始化数据库连接
        # self.engine = create_engine(self.db_uri)
        pass
    
    def close_spider(self, spider):
        # 关闭数据库连接
        pass
    
    def process_item(self, item, spider):
        # 保存到数据库
        # insert_data(dict(item))
        return item
```

### 4. Scrapy 配置

```python
# settings.py

# User-Agent 列表
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
]

# 代理列表
PROXY_LIST = [
    'http://proxy1.example.com:8080',
    'http://proxy2.example.com:8080',
]

# 并发设置
CONCURRENT_REQUESTS = 16  # 并发请求数
CONCURRENT_REQUESTS_PER_DOMAIN = 8  # 每个域名的并发请求数
DOWNLOAD_DELAY = 2  # 下载延迟（秒）

# 重试设置
RETRY_ENABLED = True
RETRY_TIMES = 3
RETRY_HTTP_CODES = [500, 502, 503, 504, 408, 429]

# 机器人协议
ROBOTSTXT_OBEY = False  # 是否遵守 robots.txt

# 中间件
DOWNLOADER_MIDDLEWARES = {
    'myproject.middlewares.RandomUserAgentMiddleware': 400,
    'myproject.middlewares.ProxyMiddleware': 410,
    'myproject.middlewares.RetryMiddleware': 500,
    'scrapy.downloadermiddlewares.useragent.UserAgentMiddleware': None,
}

# 管道
ITEM_PIPELINES = {
    'myproject.pipelines.FilterEmptyPipeline': 100,
    'myproject.pipelines.DuplicatesPipeline': 200,
    'myproject.pipelines.JsonPipeline': 300,
    'myproject.pipelines.CsvPipeline': 400,
    'myproject.pipelines.DatabasePipeline': 500,
}

# 输出设置
JSON_OUTPUT_FILE = 'output.json'
CSV_OUTPUT_FILE = 'output.csv'
DATABASE_URI = 'mysql://user:password@localhost/dbname'

# 日志设置
LOG_LEVEL = 'INFO'
LOG_FILE = 'scrapy.log'
```

## 🌐 动态网页爬取

### 1. Selenium 自动化

```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

# 创建浏览器驱动
options = webdriver.ChromeOptions()
options.add_argument('--headless')  # 无头模式
options.add_argument('--disable-gpu')
options.add_argument('--no-sandbox')

driver = webdriver.Chrome(options=options)

try:
    # 访问网页
    driver.get('https://example.com')
    
    # 等待页面加载
    wait = WebDriverWait(driver, 10)
    
    # 等待元素出现
    element = wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, 'div.content'))
    )
    
    # 滚动页面（加载更多内容）
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(2)
    
    # 点击按钮
    load_more = driver.find_element(By.CSS_SELECTOR, 'button.load-more')
    load_more.click()
    
    # 等待新内容加载
    wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, 'div.new-content'))
    )
    
    # 提取数据
    articles = driver.find_elements(By.CSS_SELECTOR, 'div.article')
    for article in articles:
        title = article.find_element(By.CSS_SELECTOR, 'h2.title').text
        content = article.find_element(By.CSS_SELECTOR, 'p.content').text
        print(title, content)
    
    # 处理动态加载的更多数据
    for i in range(5):  # 加载5页
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)
        
        load_more = driver.find_elements(By.CSS_SELECTOR, 'button.load-more')
        if load_more:
            load_more[0].click()
            wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'div.new-content'))
            )
        else:
            break

finally:
    driver.quit()
```

### 2. 处理 JavaScript 渲染

```python
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
import time

# 设置 Chrome 选项
chrome_options = Options()
chrome_options.add_argument('--headless')
chrome_options.add_argument('--disable-blink-features=AutomationControlled')
chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
chrome_options.add_experimental_option('useAutomationExtension', False)

# 设置浏览器驱动
service = Service('/path/to/chromedriver')
driver = webdriver.Chrome(service=service, options=chrome_options)

# 执行 JavaScript 脚本
driver.get('https://example.com')

# 等待 JavaScript 执行完成
time.sleep(3)

# 执行自定义 JavaScript
result = driver.execute_script('return document.title')
print(result)

# 获取渲染后的 HTML
html = driver.page_source
driver.quit()
```

## 🛡️ 反爬虫应对策略

### 1. User-Agent 伪装

```python
import random

# User-Agent 池
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
]

def get_random_user_agent():
    return random.choice(USER_AGENTS)

# 使用
headers = {
    'User-Agent': get_random_user_agent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
}

response = requests.get(url, headers=headers)
```

### 2. 代理 IP 使用

```python
import requests

# 代理列表
proxies = {
    'http': 'http://proxy1.example.com:8080',
    'https': 'https://proxy1.example.com:8080',
}

# 使用代理
response = requests.get('https://example.com', proxies=proxies)

# 轮换代理
import itertools

proxy_pool = [
    'http://proxy1.example.com:8080',
    'http://proxy2.example.com:8080',
    'http://proxy3.example.com:8080',
]

proxy_cycle = itertools.cycle(proxy_pool)

for i in range(10):
    proxy = next(proxy_cycle)
    proxies = {
        'http': proxy,
        'https': proxy,
    }
    response = requests.get('https://example.com', proxies=proxies)
    print(f"使用代理 {proxy}: {response.status_code}")
```

### 3. Cookie 管理

```python
import requests

# 会话管理
session = requests.Session()

# 自动处理 Cookie
response = session.get('https://example.com')
print(response.cookies.get_dict())

# 手动设置 Cookie
cookies = {
    'session_id': 'your_session_id',
    'user_token': 'your_token',
}

response = requests.get('https://example.com', cookies=cookies)

# Cookie 持久化
import pickle

# 保存 Cookie
with open('cookies.pkl', 'wb') as f:
    pickle.dump(session.cookies, f)

# 加载 Cookie
with open('cookies.pkl', 'rb') as f:
    cookies = pickle.load(f)

session = requests.Session()
session.cookies.update(cookies)
```

### 4. 验证码处理

```python
from PIL import Image
import pytesseract
import requests

# 下载验证码图片
def download_captcha(url, filename):
    response = requests.get(url)
    with open(filename, 'wb') as f:
        f.write(response.content)

# 识别验证码（简单验证码）
def recognize_captcha(filename):
    image = Image.open(filename)
    # 转换为灰度图像
    image = image.convert('L')
    # 二值化
    threshold = 127
    image = image.point(lambda x: 0 if x < threshold else 255, '1')
    # OCR 识别
    text = pytesseract.image_to_string(image)
    return text.strip()

# 使用
captcha_url = 'https://example.com/captcha'
download_captcha(captcha_url, 'captcha.png')
captcha_text = recognize_captcha('captcha.png')
print(f"识别结果: {captcha_text}")

# 提交表单
form_data = {
    'username': 'your_username',
    'password': 'your_password',
    'captcha': captcha_text,
}
response = requests.post('https://example.com/login', data=form_data)
```

## 📊 数据存储

### 1. 文件存储

```python
import json
import csv
import pickle

# JSON 存储
def save_json(data, filename):
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def load_json(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        return json.load(f)

# CSV 存储
def save_csv(data, filename):
    if not data:
        return
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)

# Pickle 存储（Python 对象）
def save_pickle(data, filename):
    with open(filename, 'wb') as f:
        pickle.dump(data, f)

def load_pickle(filename):
    with open(filename, 'rb') as f:
        return pickle.load(f)
```

### 2. 数据库存储

```python
import sqlite3
import pymongo

# SQLite 存储
def save_to_sqlite(data, db_path, table_name):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 创建表
    cursor.execute(f'''
        CREATE TABLE IF NOT EXISTS {table_name} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            link TEXT UNIQUE,
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 插入数据
    for item in data:
        try:
            cursor.execute(f'''
                INSERT OR IGNORE INTO {table_name} (title, link, content)
                VALUES (?, ?, ?)
            ''', (item['title'], item['link'], item['content']))
        except Exception as e:
            print(f"插入失败: {e}")
    
    conn.commit()
    conn.close()

# MongoDB 存储
def save_to_mongodb(data, connection_string, db_name, collection_name):
    client = pymongo.MongoClient(connection_string)
    db = client[db_name]
    collection = db[collection_name]
    
    for item in data:
        try:
            collection.update_one(
                {'link': item['link']},  # 查询条件
                {'$set': item},           # 更新数据
                upsert=True               # 不存在则插入
            )
        except Exception as e:
            print(f"插入失败: {e}")
    
    client.close()
```

## 🎯 实战案例：构建完整的爬虫系统

```python
import requests
from bs4 import BeautifulSoup
import time
import random
import csv
from datetime import datetime
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scraper.log'),
        logging.StreamHandler()
    ]
)

class NewsSpider:
    """新闻爬虫"""
    
    def __init__(self):
        self.session = requests.Session()
        self.visited_urls = set()
        self.failed_urls = set()
        
    def get_headers(self):
        """获取随机请求头"""
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
        ]
        return {
            'User-Agent': random.choice(user_agents),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
    
    def fetch_page(self, url, max_retries=3):
        """获取页面内容"""
        for attempt in range(max_retries):
            try:
                response = self.session.get(
                    url,
                    headers=self.get_headers(),
                    timeout=10
                )
                response.raise_for_status()
                return response.text
            except requests.RequestException as e:
                logging.warning(f"请求失败 (尝试 {attempt + 1}/{max_retries}): {url} - {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # 指数退避
                else:
                    self.failed_urls.add(url)
                    return None
    
    def parse_article(self, url, html):
        """解析文章内容"""
        soup = BeautifulSoup(html, 'html.parser')
        
        article = {
            'url': url,
            'title': '',
            'content': '',
            'author': '',
            'publish_date': '',
            'tags': [],
            'scraped_at': datetime.now().isoformat(),
        }
        
        # 标题（根据实际网站结构调整）
        title = soup.find('h1', class_='article-title')
        if title:
            article['title'] = title.get_text().strip()
        
        # 内容
        content = soup.find('div', class_='article-content')
        if content:
            article['content'] = content.get_text().strip()
        
        # 作者
        author = soup.find('span', class_='author')
        if author:
            article['author'] = author.get_text().strip()
        
        # 发布日期
        date = soup.find('time', class_='publish-date')
        if date:
            article['publish_date'] = date.get('datetime')
        
        # 标签
        tags = soup.find_all('a', class_='tag')
        article['tags'] = [tag.get_text().strip() for tag in tags]
        
        return article
    
    def crawl_news_list(self, start_url):
        """爬取新闻列表"""
        logging.info(f"开始爬取列表页: {start_url}")
        
        html = self.fetch_page(start_url)
        if not html:
            return []
        
        soup = BeautifulSoup(html, 'html.parser')
        
        # 提取文章链接
        article_links = []
        for link in soup.find_all('a', class_='article-link'):
            href = link.get('href')
            if href and href not in self.visited_urls:
                article_links.append(href)
        
        logging.info(f"发现 {len(article_links)} 篇文章")
        return article_links
    
    def crawl_articles(self, article_links):
        """爬取文章详情"""
        articles = []
        
        for i, url in enumerate(article_links, 1):
            if url in self.visited_urls:
                continue
            
            logging.info(f"正在爬取 ({i}/{len(article_links)}): {url}")
            
            html = self.fetch_page(url)
            if html:
                article = self.parse_article(url, html)
                if article['title']:  # 验证数据有效性
                    articles.append(article)
                    self.visited_urls.add(url)
            
            # 礼貌延迟
            delay = random.uniform(1, 3)
            time.sleep(delay)
        
        return articles
    
    def save_results(self, articles, filename):
        """保存结果"""
        if not articles:
            logging.warning("没有数据可保存")
            return
        
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=articles[0].keys())
            writer.writeheader()
            writer.writerows(articles)
        
        logging.info(f"已保存 {len(articles)} 条数据到 {filename}")
    
    def run(self, start_url, output_file):
        """运行爬虫"""
        logging.info("=" * 50)
        logging.info("新闻爬虫启动")
        logging.info("=" * 50)
        
        # 爬取文章列表
        article_links = self.crawl_news_list(start_url)
        
        # 爬取文章详情
        articles = self.crawl_articles(article_links)
        
        # 保存结果
        self.save_results(articles, output_file)
        
        # 统计信息
        logging.info("=" * 50)
        logging.info("爬虫完成统计:")
        logging.info(f"成功爬取: {len(articles)} 篇")
        logging.info(f"失败 URL: {len(self.failed_urls)} 个")
        logging.info("=" * 50)

# 使用示例
if __name__ == '__main__':
    spider = NewsSpider()
    spider.run(
        start_url='https://example.com/news',
        output_file='news_data.csv'
    )
```

## 📚 最佳实践

### 1. 爬虫道德规范

```python
"""
1. 遵守 robots.txt
2. 设置合理的请求频率
3. 标识爬虫身份
4. 不影响网站正常运行
5. 仅采集公开数据
6. 尊重网站服务条款
7. 避免对服务器造成负担
"""

# 礼貌延迟设置
import time
import random

# 随机延迟 1-3 秒
time.sleep(random.uniform(1, 3))

# 或者使用固定延迟
time.sleep(2)
```

### 2. 错误处理

```python
import logging
from requests.exceptions import RequestException

# 配置日志
logging.basicConfig(level=logging.INFO)

def robust_request(url, max_retries=3):
    """健壮的请求函数"""
    for attempt in range(max_retries):
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return response
        except RequestException as e:
            logging.warning(f"请求失败 (尝试 {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # 指数退避
            else:
                logging.error(f"放弃请求: {url}")
                raise
    return None
```

### 3. 数据验证

```python
def validate_article(article):
    """验证文章数据"""
    required_fields = ['title', 'link', 'content']
    
    for field in required_fields:
        if not article.get(field):
            return False
    
    # 验证链接格式
    if not article['link'].startswith('http'):
        return False
    
    # 验证标题长度
    if len(article['title']) < 5:
        return False
    
    return True

# 使用
if validate_article(article):
    # 保存数据
    pass
```

## 🎓 学习路径

1. **基础爬虫**（2周）
   - HTTP 基础
   - Requests 库
   - BeautifulSoup 解析

2. **进阶爬虫**（3-4周）
   - Scrapy 框架
   - 中间件和管道
   - 动态网页爬取

3. **反爬虫应对**（2-3周）
   - User-Agent 伪装
   - 代理 IP 使用
   - Cookie 管理

4. **实战项目**（4-6周）
   - 新闻聚合爬虫
   - 电商价格监控
   - 社交媒体分析

## 📖 推荐资源

- **官方文档**
  - [Requests 文档](https://requests.readthedocs.io/)
  - [BeautifulSoup 文档](https://www.crummy.com/software/BeautifulSoup/bs4/doc/)
  - [Scrapy 文档](https://docs.scrapy.org/)

- **推荐书籍**
  - 《Python 网络数据采集》- Ryan Mitchell
  - 《Python3 网络爬虫开发实战》- 崔庆才

- **在线课程**
  - Scrapy 官方教程
  - Real Python - Web Scraping

掌握 Web 爬虫技术，轻松获取海量数据！
