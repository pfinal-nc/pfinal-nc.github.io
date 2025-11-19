---
title: Python Coroutines
date: 2023-04-07 09:28:47
tags:
    - python
description: Learning Python coroutines
author: PFinal南丞
keywords: Python, coroutine, concurrency, programming, asyncio, async IO, Future, Task
---

# Python Coroutines

## Coroutine

A coroutine, also known as a microthread, is a lightweight user-level thread. Coroutines have their own context and stack. When switching, the context and stack are saved elsewhere, and when switching back, the previously saved context and stack are restored. Therefore, coroutines can retain the state of the last call, i.e., a specific combination of all local states. Each time the process re-enters, it is equivalent to entering the state of the last call.

A simple coroutine implementation:

```python
def coroutine_example(name):
    print('start coroutine...name:', name)
    x = yield name # When next() is called, yield on the right produces a value and pauses; when send() is called, the value is assigned to x and continues execution
    print('send value:', x)

coro = coroutine_example('PFinal')
print('Return value of next:', next(coro))
print('Return value of send:', coro.send(6))
```
When using coroutines, you need to prime (activate) them with next() before you can use send() to send values. (a = yield b): next will produce the value on the right of yield (b), send will receive the value on the left of yield (a).

Python implements coroutines mainly using the asyncio module for async IO.

Async IO in asyncio uses an event loop to drive coroutine-based concurrency. Users can actively control the program and add await (yield from) at time-consuming IO points. In the asyncio library, coroutines are decorated with @asyncio.coroutine and driven with yield from. @asyncio.coroutine -> async, yield from -> await

#### Important Concepts in asyncio

1. Event Loop

> Manages all events, continuously loops and executes during the program's runtime, tracks the order of events, puts them in a queue, and calls the corresponding event handler when idle.

2. Future

> A Future object represents a computation that has not yet completed, an unfinished result.

3. Task

> A subclass of Future, used to run multiple tasks concurrently. asyncio.Task is used to implement cooperative multitasking. Task objects cannot be instantiated by the user, but are created via two functions: asyncio.async(), loop.create_task(), or asyncio.ensure_future().

Define a coroutine as follows:

```python
# -*- coding: utf-8 -*-
# @Time    : 2023/4/7 09:02
# @Author  : PFinal南尧
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
> In the above code, async defines a function execute, which is called directly, but execute does not execute immediately, instead returns a coroutine object. Then, get_event_loop creates an event loop, and run_until_complete registers the coroutine to the event loop and starts it. Finally, execute prints the output result.

Previously, we also mentioned task, which is a further encapsulation of the coroutine object, adding running states such as running, finished, etc., which can be used to get the execution status of the coroutine object. The code is as follows:

```python
# -*- coding: utf-8 -*-
# @Time    : 2023/4/7 09:02
# @Author  : PFinal南尧
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
Running result:

```shell
Task <Task pending name='Task-1' >
Executing PFinal
Task <Task finished name='Task-1'>

Process finished, exit code 0
```
> In the above code, after defining the loop object, create_task is called to convert the coroutine object into a task object. Print it, and you will find it is in the pending state. Then, add the task object to the event loop for execution, print the task object again, and you will find its state has changed to finished. You can also see its result has become 1, which is the return result of the execute function. 