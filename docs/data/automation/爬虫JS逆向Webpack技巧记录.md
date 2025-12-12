---
title: "Python爬虫JS逆向实战指南（Webpack加密破解与数据采集）"
slug: "python-js-reverse-webpack"
date: 2023-05-15
updated: 2023-05-15
authors:
  - "PFinal南丞"
categories:
  - "数据与自动化"
  - "爬虫技术"
tags:
  - "python"
  - "爬虫"
  - "js逆向"
  - "webpack"
  - "加密破解"
  - "数据采集"
keywords:
  - "python爬虫教程"
  - "js逆向技巧"
  - "webpack破解方法"
  - "数据采集实战"
  - "加密网站爬取"
summary: "详细讲解Python爬虫中的JS逆向技术，重点分析Webpack加密机制和破解方法，提供完整的数据采集解决方案和实战案例。"
readingTime: 12
cover: "/images/python-js-reverse.png"
status: "published"
toc: true
---
# 爬虫JS逆向Webpack技巧记录

## 概念:
  
  webpack 是一个用于现代 JavaScript 应用程序的 静态模块打包工具。当 webpack 处理应用程序时，它会在内部从一个或多个入口点构建一个 依赖图(dependency sgraph)，然后将你项目中所需的每一个模块组合成一个或多个 bundles。所有的资源都是通过JavaScript渲染出来的。

## 识别:

1. 如下图所示: 

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305151419884.png)


> 查看 网页源代码,大部分都是由script标签构成

2. 如图:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305160910831.png)

> 大部分的webpack 都是可以找到 webpack这个js文件的


## 结构:

webpack 打包后的js 结构基本上都是 有一个自执行函数用来做加载器 加载模块的,常见的结构如下:

### 第一种:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305160951192.png)


如图所示:

```js

!funcion('形参'){"加载器";}(["模块"]) // 模块以数组的形式存储,数组中每个元素都是函数

```

```js
  function d(n) {.....} // 这个函数叫做加载器,也可以叫做分发器,所有的模块都是从这个函数加载并执行.
  d(0)  // 使用加载器调用第一个模块

```

### 第二种

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305160944584.png)

如图所示:

```js

!funcion('形参'){"加载器";}({"模块"}) // 模块以对象的形式存储,元素都为函数对象

```

```js
  function d(n) {.....} // 这个函数叫做加载器,也可以叫做分发器,所有的模块都是从这个函数加载并执行.
  d('1x2y')  // 使用加载器调用1x2y执行

```

### 第三种

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305161006212.png)

**如上图所示,第三种也是最常见的一种.如果模块比较多，就会将模块打包成JS文件, 然后定义一个全局变量 window["webpackJsonp"] = [ ]，它的作用是存储需要动态导入的模块，然后重写 window["webpackJsonp"] 数组的 push( ) 方法为 webpackJsonpCallback( ),也就是说 window["webpackJsonp"].push( ) 其实执行的是 webpackJsonpCallback( ),window["webpackJsonp"].push( )接收三个参数,第一个参数是模块的ID,第二个参数是 一个数组或者对象,里面定义大量的函数,第三个参数是要调用的函数(可选)。**

每一个JS模块文件开头都是

```js
(window.webpackJsonp = window.webpackJsonp || []).push([[2],{}]) // 其中 2 是模块的id  {} 中是要调用的函数对象

```

## 逆向扣取JS思路(一)

1. 首先找加密参数入口

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305161020050.png)

如上图所示,加密参数 *sign*

2. 找到加载器函数

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305161035140.png)

> 如上图所示 找到类似这种**n('xx')** 调用加载模块的函数然后打断点刷新网页,鼠标移动上去就基本能够找到加载器函数，如下图所示:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305161038581.png)


3. 在加载器函数中的call()方法或者apply()方法打上断点，将加密函数所在的模块和与其相关的模块一起扣取下来。


4. 将加密参数升为全局变量导出


## 逆向扣取JS思路(一)

1. 找到加密参数函数入口,确定加密函数所在的模块。

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305161044042.png)

2. 找到加密模块 扣下来

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305161050194.png)

如上图的所示,m函数所在的模块加载了其他模块依次找一下,找到如下图所示的加密模块

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305161052841.png)

3. 在本地依次往上扣取代码,然后报错 缺啥补啥

扣下上面的加密模块以后 然后开始补齐其他所缺的函数及其一些参数就可以试试看了


> 注意: 在加密函数(方法)和加密函数(方法)后打上两个断点，断点在加密函数(方法)断住后，追入到加载器函数,然后在加载器后面下断点(类似 return e[n].call(r.exports, r, r.exports, d) )，跳转到加载器后面的断点，在控制台输入HooK函数(根据不同的加载器函数改变HooK函数代码),取消加载器后面的断点,跳转到加密函数(方法)后的断点,在控制台输入window._wbpk
后得到所有与加密函数有关的模块代码。


### 其他思路持续更新中...