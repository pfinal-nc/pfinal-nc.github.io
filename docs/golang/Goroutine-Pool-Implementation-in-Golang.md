---
title: Goroutine Pool Implementation in Golang
date: 2024-11-09 11:31:32
tags:
    - golang
description: Detailed introduction to implementing goroutine pools in Golang, including concepts, application scenarios, implementation methods, and best practices to help developers better utilize goroutine pool features and improve program performance and responsiveness.
author: PFinal南丞
keywords: Golang, goroutine pool, implementation, method, goroutine, pool, concept, application, scenario, implementation method, goroutine pool feature, performance, responsiveness
---

# High-Performance Goroutine Pool Implementation and Principle Analysis in Go

## 1. Preface

In Go, although the cost of creating goroutines is relatively low, in high-concurrency scenarios, unlimited creation of goroutines may still exhaust system resources. Goroutine pools reuse a set of pre-created goroutines to handle tasks, effectively controlling the number of goroutines and improving system performance and stability.

## 2. Core Principles of Goroutine Pool

The core idea of a goroutine pool is to maintain a fixed-size queue of goroutines, which continuously fetch and execute tasks from the task queue. The main components include:

- Task queue: stores pending tasks
- Worker goroutines: execute specific tasks
- Task dispatcher: assigns tasks to idle worker goroutines

## 3. Basic Implementation

Below is a basic implementation of a goroutine pool:

```go
type Task struct {
    Handler func() error    // Task handler function
    Result  chan error      // Result channel
}

type Pool struct {
    capacity    int             // Pool capacity
    active      int             // Number of active goroutines
    tasks       chan *Task      // Task queue
    quit        chan bool       // Shutdown signal
    workerQueue chan *worker    // Worker goroutine queue
    mutex       sync.Mutex      // Mutex
}

type worker struct {
    pool *Pool
}

func NewPool(capacity int) *Pool {
    if capacity <= 0 {
        capacity = 1
    }
    
    return &Pool{
        capacity:    capacity,
        tasks:       make(chan *Task, capacity*2),
        quit:        make(chan bool),
        workerQueue: make(chan *worker, capacity),
    }
}

func (p *Pool) Start() {
    for i := 0; i < p.capacity; i++ {
        w := &worker{pool: p}
        p.workerQueue <- w
        p.active++
        go w.run()
    }
}

func (w *worker) run() {
    for {
        select {
        case task := <-w.pool.tasks:
            if err := task.Handler(); err != nil {
                task.Result <- err
            } else {
                task.Result <- nil
            }
            // After completing the work, put itself back into the queue
            w.pool.workerQueue <- w
            
        case <-w.pool.quit:
            return
        }
    }
}

func (p *Pool) Submit(handler func() error) error {
    task := &Task{
        Handler: handler,
        Result:  make(chan error, 1),
    }
    
    // Put the task into the queue
    p.tasks <- task
    
    return <-task.Result
}

func (p *Pool) Stop() {
    p.mutex.Lock()
    defer p.mutex.Unlock()
    
    if p.active > 0 {
        close(p.quit)
        p.active = 0
    }
}
```

## 4. Performance Optimization

To improve the performance of the goroutine pool, we can add the following optimizations on top of the basic implementation:

### 4.1 Batch Task Processing

```go
type BatchPool struct {
    *Pool
    batchSize int
    batchChan chan []*Task
}

func (bp *BatchPool) processBatch() {
    batch := make([]*Task, 0, bp.batchSize)
    timer := time.NewTimer(100 * time.Millisecond)
    
    for {
        select {
        case task := <-bp.tasks:
            batch = append(batch, task)
            if len(batch) >= bp.batchSize {
                bp.batchChan <- batch
                batch = make([]*Task, 0, bp.batchSize)
            }
            
        case <-timer.C:
            if len(batch) > 0 {
                bp.batchChan <- batch
                batch = make([]*Task, 0, bp.batchSize)
            }
            timer.Reset(100 * time.Millisecond)
        }
    }
}
``` 