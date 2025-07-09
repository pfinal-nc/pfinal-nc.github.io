---
title: Reverse Engineering JS Webpack Tips for Crawlers
date: 2023-05-15 10:14:02
tags:
  - crawler
  - python
  - Webpack
description: Tips for reverse engineering JS Webpack for crawlers
author: PFinal Nancheng
keywords: Reverse Engineering JS Webpack Tips for Crawlers, crawler, JS, Webpack
---
# Reverse Engineering JS Webpack Tips for Crawlers

## Concept:
  
webpack is a static module bundler for modern JavaScript applications. When webpack processes an application, it internally builds a dependency graph from one or more entry points and then combines every module your project needs into one or more bundles. All resources are rendered via JavaScript.

## Identification:

1. As shown below:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305151419884.png)

> When viewing the page source code, most are constructed by script tags

2. As shown:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305160910831.png)

> Most webpack builds can find the webpack JS file

## Structure:

The structure of JS after webpack packaging is basically as follows:

### First type:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305160951192.png)

As shown:

```js
!function('param'){"loader";}(["module"]) // Modules are stored as arrays, each element is a function
```

```js
  function d(n) {.....} // This function is called the loader or distributor, all modules are loaded and executed from this function.
  d(0)  // Use the loader to call the first module
```

### Second type

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305160944584.png)

As shown:

```js
!function('param'){"loader";}({"module"}) // Modules are stored as objects, elements are function objects
```

```js
  function d(n) {.....} // This function is called the loader or distributor, all modules are loaded and executed from this function.
  d('1x2y')  // Use the loader to execute 1x2y
```

### Third type

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305161006212.png)

**As shown above, the third type is also the most common. If there are many modules, they will be packaged into JS files, then a global variable window["webpackJsonp"] = [ ] is defined, which is used to store modules that need to be dynamically imported, then the push() method of window["webpackJsonp"] is rewritten as webpackJsonpCallback(), that is, window["webpackJsonp"].push() actually executes webpackJsonpCallback(). window["webpackJsonp"].push() receives three parameters, the first is the module ID, the second is an array or object defining many functions, and the third is the function to call (optional).**

Each JS module file starts with

```js
(window.webpackJsonp = window.webpackJsonp || []).push([[2],{}]) // 2 is the module id, {} contains the function object to call
```

## Reverse Engineering JS Extraction Ideas (1)

1. First, find the encryption parameter entry

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305161020050.png)

As shown above, the encryption parameter is *sign*

2. Find the loader function

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305161035140.png)

> As shown above, find a call like **n('xx')** to load the module, then set a breakpoint and refresh the page. When the mouse moves over, you can basically find the loader function, as shown below:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305161038581.png)

3. Set a breakpoint on the call() or apply() method in the loader function, extract the module containing the encryption function and related modules together.

4. Export the encryption parameter as a global variable

## Reverse Engineering JS Extraction Ideas (2)

1. Find the encryption parameter function entry and determine which module the encryption function is in.

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305161044042.png)

2. Find the encryption module and extract it

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305161050194.png)

As shown above, the m function's module loads other modules in turn, and you can find the encryption module as shown below

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305161052841.png)

3. Iteratively extract code locally, then fix any missing functions or parameters as needed

After extracting the above encryption module, start to fix other missing functions and parameters, then you can try it out

> Note: Set two breakpoints after the encryption function (method), after the encryption function (method) is paused, step into the loader function, then set a breakpoint after the loader (similar to return e[n].call(r.exports, r, r.exports, d)), jump to the breakpoint after the loader, enter the HooK function in the console (modify the HooK function code according to different loader functions), remove the breakpoint after the loader, jump to the breakpoint after the encryption function (method), and enter window._wbpk in the console to get all module code related to the encryption function.

### Other ideas are being updated... 