import{_ as i,c as l,o as a,a6 as t}from"./chunks/framework.B5rgnJXo.js";const h=JSON.parse('{"title":"Redis基本知识总结","description":"Redis 是一个开源的使用 ANSI C 语言编写、支持网络、可基于内存亦可持久化的日志型、Key-Value 数据库，并提供多种语言的 API。","frontmatter":{"title":"Redis基本知识总结","date":"2022-11-24T22:47:02.000Z","tags":["Redis"],"description":"Redis 是一个开源的使用 ANSI C 语言编写、支持网络、可基于内存亦可持久化的日志型、Key-Value 数据库，并提供多种语言的 API。","author":"PFinal南丞","keywords":"Redis, 基本知识, 总结, 数据库, NoSQL, 缓存, 计数器, 排行榜, 社交网络, 消息队列, 分布式锁","head":[["meta",{"name":"keywords","content":"Redis, 基本知识, 总结, 数据库, NoSQL, 缓存, 计数器, 排行榜, 社交网络, 消息队列, 分布式锁,pfinalclub, git, gitsite, javascript, node, jquery, python, php, laravel, sql, database, linux, operating system, os, cpu, verilog, risc-v, bitcoin, ethereum, ai, 教程, 软件, 编程, 开发, 运维, 云计算, 网络, 互联网, 比特币, 以太坊, 操作系统, 智能合约, 数字货币, 爬虫, 逆向"}]]},"headers":[],"relativePath":"php/Redis基本知识总结.md","filePath":"php/Redis基本知识总结.md","lastUpdated":1741944848000}'),p={name:"php/Redis基本知识总结.md"};function s(o,e,d,r,u,n){return a(),l("div",{"data-pagefind-body":!0},e[0]||(e[0]=[t('<h1 id="redis基本知识总结" tabindex="-1">Redis基本知识总结 <a class="header-anchor" href="#redis基本知识总结" aria-label="Permalink to &quot;Redis基本知识总结&quot;">​</a></h1><h4 id="redis-概念" tabindex="-1">Redis 概念 <a class="header-anchor" href="#redis-概念" aria-label="Permalink to &quot;Redis 概念&quot;">​</a></h4><p>Redis是一种基于键值对（key-value）的NoSQL数据库。比一般键值对数据库强大的地方，Redis中的value支持string（字符串）、hash（哈希）、 list（列表）、set（集合）、zset（有序集合）、Bitmaps（位图）、 HyperLogLog、GEO（地理信息定位）等多种数据结构，因此 Redis可以满足很多的应用场景。</p><h4 id="redis-常用场景" tabindex="-1">Redis 常用场景 <a class="header-anchor" href="#redis-常用场景" aria-label="Permalink to &quot;Redis 常用场景&quot;">​</a></h4><ul><li><p>缓存</p><blockquote><p>redis 应用最广泛地方, 基本所有的Web应用都会使用Redis 作为缓存, 提高响应速度</p></blockquote></li><li><p>计数器</p><blockquote><p>Redis支持计数功能 经常用来记录浏览量,点赞量等等</p></blockquote></li><li><p>排行榜</p><blockquote><p>利用Redis 的 列表和有序集合数据结构, 合理地使用可以方便构建各种排行榜系统</p></blockquote></li><li><p>社交网络</p><blockquote><p>社交网络的 粉丝 点赞 踩 共同好友 喜好 推送 下拉刷新等</p></blockquote></li><li><p>消息队列</p><blockquote><p>消息队列 Redis提供了发布订阅功能和阻塞队列的功能，可以满足一般消息队列功能</p></blockquote></li><li><p>分布式锁</p><blockquote><p>分布式锁 分布式环境下，利用Redis实现分布式锁，也是Redis常见的应用</p></blockquote></li><li><p>......</p></li></ul><h4 id="redis-数据结构" tabindex="-1">Redis 数据结构 <a class="header-anchor" href="#redis-数据结构" aria-label="Permalink to &quot;Redis 数据结构&quot;">​</a></h4><p><em>String</em></p><p>字符串主要有以下几个典型使用场景:</p><ul><li>缓存功能</li><li>计数</li><li>共享session</li><li>限速</li></ul><ul><li>字符串类型的值实际可以是字符串,数字 二进制 不能超过521MB</li></ul><p><em>Hash</em></p><p>哈希类型是指键值本身又是一个键值对结构. 哈希主要有一下典型应用场景:</p><ul><li>缓存用户信息</li><li>缓存对象</li></ul><p><em>List</em></p><p>列表类型是用来存储多个有序的字符串,列表是一种比较灵活的数据结构,它可以充当栈和队列的角色</p><p>列表主要有一下几种使用场景:</p><ul><li>消息队列</li><li>文章列表</li></ul><p><em>Set</em></p><p>集合 类型也是用来保存多个字符串元素, 但和列表类型不一样的是, 集合中不允许有重复元素,并且集合中的元素是无序的.</p><p>集合主要使用场景:</p><ul><li>标签(tag)</li><li>共同关注</li></ul><p><em>sorted set</em></p><p>有序集合中的元素可以排序, 但是它和列表使用索引下标作为排序依据不同的是, 她给每个元素设置一个权重(score)作为排序的依据。</p><p>有序集合主要应用场景:</p><ul><li>用户点赞统计</li><li>用户排序</li></ul><p><em>Bitmap</em></p><p>Bitmap 底层存储的是一种二进制格式的数据,在一些特定场景下，用该类型能够极大的减少存储空间，因为存储的数据只能是0和1。</p><p>主要应用场景:</p><ul><li>签到记录</li></ul>',29)]))}const m=i(p,[["render",s]]);export{h as __pageData,m as default};
