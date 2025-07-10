---
title: Crawler JS Reverse Engineering Webpack Tips
date: 2023-05-15 10:14:02
tags:
  - crawler
  - python
  - Webpack
description: Crawler JS reverse engineering Webpack tips
author: PFinal南尧
keywords: Crawler JS Reverse Engineering Webpack Tips, crawler, JS, Webpack
---
# Crawler JS Reverse Engineering Webpack Tips

## Concept:
  
  Webpack is a static module bundler for modern JavaScript applications. When webpack processes an application, it internally builds a dependency graph from one or more entry points and then combines every module your project needs into one or more bundles. All resources are rendered via JavaScript.

## Identification:

1. As shown below:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305151419884.png)

> Viewing the page source code, most are constructed by script tags

2. As shown:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305160910831.png)

> Most webpack projects can find this webpack JS file

## Structure:

The structure of JS after webpack packaging is basically a self-executing function used as a loader to load modules. Common structures are as follows:

### Type 1:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305160951192.png)

As shown:

```js
!function('param'){"loader";}(["module"]) // Modules are stored as arrays, each element is a function
```

```js
  function d(n) {.....} // This function is called the loader or distributor. All modules are loaded and executed from this function.
  d(0)  // Use the loader to call the first module
```

### Type 2

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305160944584.png)

As shown:

```js
!function('param'){"loader";}({"module"}) // Modules are stored as objects, elements are function objects
```

```js
  function d(n) {.....} // This function is called the loader or distributor. All modules are loaded and executed from this function.
  d('1x2y')  // Use the loader to call 1x2y for execution
```

### Type 3

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305161006212.png)

**As shown above, the third type is also the most common. If there are many modules, they will be packaged into a JS file, then a global variable window["webpackJsonp"] = [ ] is defined to store modules that need to be dynamically imported, then the push() method of window["webpackJsonp"] is rewritten as webpackJsonpCallback(). That is, window["webpackJsonp"].push() actually executes webpackJsonpCallback(). window["webpackJsonp"].push() receives three parameters: the first is the module ID, the second is an array or object defining many functions, and the third is the function to call (optional).**

Each JS module file starts with

```js
(window.webpackJsonp = window.webpackJsonp || []).push([[2],{}]) // 2 is the module id, {} contains the function object to call
```

## Reverse Extraction JS Ideas (1)

1. First, find the encryption parameter entry

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305161020050.png)

As shown above, the encryption parameter is *sign*

2. Find the loader function

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305161035140.png)

> As shown above, find a function call like **n('xx')** to load the module, then set a breakpoint and refresh the page. Move the mouse over and you can basically find the loader function, as shown below:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305161038581.png)

3. Set a breakpoint on the call() or apply() method in the loader function, extract the module containing the encryption function and related modules together.

4. Export the encryption parameter as a global variable

## Reverse Extraction JS Ideas (2)

1. Find the encryption parameter function entry, determine which module contains the encryption function.

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305161044042.png)

2. Find the encryption module and extract it

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305161050194.png)

As shown above, after loading the m function's module, continue to find other modules, and finally find the encryption module as shown below

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202305161052841.png)

3. Locally extract the code upwards, then fix any missing functions or parameters as needed

After extracting the above encryption module, start to fix other missing functions and parameters, then you can try it out

> Note: Set two breakpoints after the encryption function (method), after the breakpoint in the encryption function (method), step into the loader function, then set a breakpoint after the loader (like return e[n].call(r.exports, r, r.exports, d)), jump to the breakpoint after the loader, in the console input the Hook function (depending on the loader function, modify the Hook function code), remove the breakpoint after the loader, jump to the breakpoint after the encryption function (method), in the console input window._wbpk to get all module code related to the encryption function.

### Other ideas are being updated... 