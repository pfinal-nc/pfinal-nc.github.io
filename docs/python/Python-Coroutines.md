---
title: A Practical Guide to Python Coroutines with asyncio
date: 2023-04-07 09:28:47
tags:
    - python
    - asyncio
    - concurrency
description: A practical guide to understanding and using Python coroutines with the asyncio library for high-performance I/O-bound tasks.
author: PFinal南丞
keywords: Python, coroutine, concurrency, programming, asyncio, async, await, aiohttp
---

# A Practical Guide to Python Coroutines with asyncio

In modern programming, especially for web services and network applications, handling many tasks concurrently is a common requirement. Python's `asyncio` library, combined with `async`/`await` syntax, provides a powerful way to write concurrent code that is both efficient and readable. This guide will walk you through the core concepts of Python coroutines and demonstrate their power with a practical example.

## What are Coroutines and Why Use Them?

A **coroutine** is a special type of function that can pause its execution before it has returned, and can implicitly transfer control to another coroutine for a while. This makes them ideal for **I/O-bound** tasks, where the program spends most of its time waiting for external resources like network responses, database queries, or disk reads/writes.

Instead of blocking a whole thread while waiting, a coroutine yields control to an **event loop**, which can then run other tasks. When the waiting operation is complete, the event loop resumes the paused coroutine. This model of cooperative multitasking can handle thousands of concurrent operations on a single thread with minimal overhead.

**Key takeaway**: Use `asyncio` for I/O-bound tasks, not for CPU-bound tasks (for which `multiprocessing` is better suited).

## Core Concepts: `async`, `await`, and the Event Loop

Since Python 3.5, the `async` and `await` keywords have become the standard way to work with coroutines.

1.  **`async def`**: This syntax is used to declare a function as a **coroutine**. When you call a coroutine function, it doesn't execute immediately; instead, it returns a coroutine object.

    ```python
    async def my_coroutine():
        print("Hello from a coroutine!")
    
    # Calling it returns a coroutine object, it doesn't print anything yet.
    coro = my_coroutine() 
    ```

2.  **`await`**: This keyword is used inside a coroutine to pause its execution and wait for an "awaitable" object (like another coroutine) to complete. While it's waiting, the event loop is free to run other tasks.

    ```python
    async def main():
        print("Start waiting...")
        # Pause main() and wait for another_coroutine() to finish
        await another_coroutine() 
        print("...finished waiting.")
    ```
    **Rule**: `await` can only be used inside an `async def` function.

3.  **The Event Loop**: This is the heart of `asyncio`. It's the scheduler that manages and runs all the coroutines. The simplest way to start the event loop and run a coroutine is with `asyncio.run()`.

    ```python
    import asyncio

    async def main():
        print("Running in the event loop!")

    # This starts the event loop, runs the main coroutine until it completes,
    # and then closes the loop.
    asyncio.run(main())
    ```

## Practical Example: Synchronous vs. Asynchronous Web Requests

Let's see the power of `asyncio` in action. We'll write two scripts to fetch the status of several websites: one synchronously (one by one) and one asynchronously (concurrently).

### The Synchronous (Slow) Way

This script uses the popular `requests` library to fetch URLs sequentially.

```python
# sync_fetch.py
import requests
import time

urls = [
    "https://www.python.org",
    "https://www.google.com",
    "https://www.github.com",
    "https://www.microsoft.com",
    "https://www.apple.com",
]

def fetch_sync(url):
    print(f"Fetching {url}...")
    requests.get(url)
    print(f"Fetched {url}")

start_time = time.time()

for url in urls:
    fetch_sync(url)

duration = time.time() - start_time
print(f"Synchronous fetching took {duration:.2f} seconds.")
```

When you run this, you'll see that it fetches each URL one after the other. The total time will be the sum of all individual request times.
**Typical Output**: `Synchronous fetching took 5.31 seconds.`

### The Asynchronous (Fast) Way

This version uses the `aiohttp` library (an async-compatible alternative to `requests`) and `asyncio` to fetch all URLs concurrently.

First, install `aiohttp`:
```bash
pip install aiohttp
```

Now, the async code:
```python
# async_fetch.py
import aiohttp
import asyncio
import time

urls = [
    "https://www.python.org",
    "https://www.google.com",
    "https://www.github.com",
    "https://www.microsoft.com",
    "https://www.apple.com",
]

async def fetch_async(session, url):
    print(f"Fetching {url}...")
    async with session.get(url) as response:
        # We just need the status, so we don't need to read the body
        print(f"Fetched {url} with status: {response.status}")
        return response.status

async def main():
    async with aiohttp.ClientSession() as session:
        # Create a list of tasks to run concurrently
        tasks = [fetch_async(session, url) for url in urls]
        # Wait for all tasks to complete
        await asyncio.gather(*tasks)

start_time = time.time()

# Run the main coroutine
asyncio.run(main())

duration = time.time() - start_time
print(f"Asynchronous fetching took {duration:.2f} seconds.")
```

When you run this, you'll see that all the "Fetching..." messages appear almost at once. The total time will be roughly the time it takes for the *slowest* single request to complete.
**Typical Output**: `Asynchronous fetching took 1.12 seconds.`

The performance improvement is dramatic!

## Key `asyncio` Patterns

- **`asyncio.run(coro)`**: The main entry point to run a top-level coroutine.
- **`await asyncio.gather(*coroutines)`**: A crucial function for running multiple coroutines concurrently and waiting for all of them to finish.
- **`await asyncio.sleep(seconds)`**: The non-blocking version of `time.sleep()`. It pauses the current coroutine without blocking the entire event loop.

## Important Rules and Pitfalls

1.  **"Async All the Way"**: Once you use `await` in a function, that function must be declared with `async def`. This "async" nature tends to propagate up your call stack. You can't simply call an `async` function from a regular synchronous function without using an entry point like `asyncio.run()`.

2.  **Don't Block the Event Loop**: The biggest mistake you can make is to use a blocking I/O call inside a coroutine. For example, using `requests.get()` or `time.sleep()` will freeze your entire application, as it blocks the single thread the event loop is running on.

3.  **Use Async-Compatible Libraries**: Always use libraries designed for `asyncio` when performing I/O operations.
    - For HTTP requests, use `aiohttp` or `httpx`.
    - For database access, use libraries like `asyncpg` (for PostgreSQL) or `aiomysql` (for MySQL).

## Conclusion

Python's coroutines and the `asyncio` library provide a powerful and efficient way to handle concurrent I/O-bound tasks. By understanding the `async`/`await` syntax and the role of the event loop, you can write code that performs significantly better than traditional synchronous code for tasks involving network requests, database queries, and other operations where the program spends time waiting. The key is to embrace the asynchronous mindset and use the right set of async-compatible libraries to keep the event loop running smoothly.