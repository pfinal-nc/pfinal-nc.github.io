---
title: "如何掌握Python协程 - Python 开发完整指南"
date: 2023-04-07 09:28:47
tags:
    - python
description: Python协程学习
author: PFinal南丞
keywords:
  - Python协程
  - Python异步编程
  - asyncio教程
  - Python并发编程
  - 异步IO
  - Python Future
  - Python Task
  - 协程实现原理
  - Python异步框架
  - 高并发Python
---

# Python协程

## 协程

协程,又叫做微线程,他是一种用户态的轻量级线程.协程拥有自己的寄存器上下文和栈.调度切换时候,将寄存器上下文和栈保存在其他地方,在切换回来的时候,恢复先前保存的寄存器上下文和栈,因此 协程能保留上一次调用时的状态,即所有局部状态的一个特定组合,每次过程重入时,就相当于进入上一次调用的状态.

简单的协程实现:

```python
def coroutine_example(name):
    print('start coroutine...name:', name)
    x = yield name #调用next()时，产出yield右边的值后暂停；调用send()时，产出值赋给x，并往下运行
    print('send值:', x)

coro = coroutine_example('PFinal')
print('next的返回值:', next(coro))
print('send的返回值:', coro.send(6))

```
使用协程时需要预激活（next函数）后才能使用send发送值。(a = yield b)，next时会产出yield右边的值b，send时接收值的是yield左边的值a

Python 实现协主要是使用asyncio模块做异步IO

异步IO的asyncio库使用事件循环驱动的协程实现并发。用户可主动控制程序，在认为耗时IO处添加await（yield from）。在asyncio库中，协程使用@asyncio.coroutine装饰，使用yield from来驱动，@asyncio.coroutine -> asyncyield from -> await


#### asyncio中重要概念

1. 事件循环

> 管理所有的事件，在整个程序运行过程中不断循环执行并追踪事件发生的顺序将它们放在队列中，空闲时调用相应的事件处理者来处理这些事件

2. Future

> Future对象表示尚未完成的计算，还未完成的结果

3. Task

> 是Future的子类，作用是在运行某个任务的同时可以并发的运行多个任务。asyncio.Task用于实现协作式多任务的库，且Task对象不能用户手动实例化，通过2个函数创建：asyncio.async(), loop.create_task() 或 asyncio.ensure_future()

如下定义一个协程:

```python
# -*- coding: utf-8 -*-
# @Time    : 2023/4/7 09:02
# @Author  : PFinal南丞
# @Email   : lampxiezi@163.com
# @File    : coroutine.py
# @Software: PyCharm
import asyncio


async def execute():
    print("Executing PFinal", )


coro = execute()
loop = asyncio.get_event_loop()
loop.run_until_complete(coro)
loop.close()


```
> 上面的代码中,使用 async 定义了一个 execute函数,直接调用了execute函数，然而execute函数并没有执行，而是返回了一个 coroutine 协程对象.随后使用 get_event_loop 方法创建了一个事件循环 loop,并调用了 loop 对象的 run_until_complete 方法将协程注册到事件循环 loop 中，然后启动.最后，才看到 execute 方法打印了输出结果。

前面还提到了 task，它是对 coroutine 对象的进一步封装，比 coroutine 对象多了运行状态，比如 running、finished 等，可以用这些状态来获取协程对象的执行情况。代码如下:

```python
# -*- coding: utf-8 -*-
# @Time    : 2023/4/7 09:02
# @Author  : PFinal南丞
# @Email   : lampxiezi@163.com
# @File    : coroutine.py
# @Software: PyCharm
import asyncio


async def execute():
    print("Executing PFinal", )


coro = execute()
loop = asyncio.get_event_loop()
task = loop.create_task(coro)
print("Task", task)
loop.run_until_complete(task)
print("Task", task)
# loop.close()

```
运行结果:

```shell
Task <Task pending name='Task-1' >
Executing PFinal
Task <Task finished name='Task-1'>

进程已结束,退出代码0
```
> 上面代码,定义了 loop 对象之后，接着调用了它的 create_task 方法将 coroutine 对象转化为 task 对象，打印输出一下，发现它是 pending 状态。接着，将 task 对象添加到事件循环中执行，随后打印输出 task 对象，发现它的状态变成了 finished，同时还可以看到其 result 变成了 1，也就是定义的 execute 方法的返回结果。







        
