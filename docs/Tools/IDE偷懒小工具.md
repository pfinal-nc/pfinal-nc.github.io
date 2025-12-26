---
title: "如何开发和使用 IDE偷懒小工具 - 完整实战指南"
date: 2024-05-31 13:59:31
tags:
    - 工具
description: 收集一些开发过程中常用的小工具
author: PFinal南丞
keywords: IDE插件, 开发工具, Layui插件, 代码补全, 效率工具, VSCode插件, PHPStorm插件, 编程效率
---

# IDE偷懒小工具

俗话说，不会"偷懒"的程序员不是好程序员。程序员的偷懒方式多种多样，我的偷懒方式就是搞IDE 插件,用起来爽歪歪。

## Layui 补全插件

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202405311410117.png)


#### 使用

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202405311412384.png)

如上图所示:

1. 输入`lay.` 然后按`tab`键, 即可补全`layui` 中的所一些组件
2. 如下,在class 中输入 lay然后按tab 能够输出一些 layui 常用的 css

```
<div class="lay-">
    
</div>
```

#### 版本
目前更新到版本 1.0.8 后续会持续更新

#### 下载


[Layui 补全插件](https://plugins.jetbrains.com/plugin/download?rel=true&amp;updateId=208393)


<iframe width="384px" height="319px" src="https://plugins.jetbrains.com/embeddable/card/15814"></iframe>


## 开发小工具插件

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202406030937519.png)

如上图所示, 在开发的过程中,需要经常性的写一些注释,比如:

1. 重复性的字符串
```php
#========== Task start ===========
# ......
#========== Task end ===========
```

比如上面这种,一个手敲等号 很麻烦 而且还不统一 有的 敲的 多了 有的敲的少了, 使用插件就方便多了,

**#*10** 选择 然后 按`tab`键 即可自动生成 10个#号 方便多了

2.时间戳

开发测试的时候,经常性的需要获取当前的时间戳, 有时候打开网页获取,有时候需要使用另外的工具 获取一下,比较的麻烦,所以也做到了插件里,就可以直接获取,如下图所示:

![](https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202406030942550.png)

3. 随机生成用户信息

```
常纯 13602962851 l3ewz@0355.net

```

插件也提供了个随机生成用户星系的功能. 方便用来进行开发的测试, 目前插件就提供了这些功能.后续一点一点的添加


#### 版本
目前更新到版本 1.0.2 后续会持续更新

#### 下载

[开发小工具插件](https://plugins.jetbrains.com/plugin/download?rel=true&amp;updateId=543972)

