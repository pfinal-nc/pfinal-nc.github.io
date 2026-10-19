---
title: "commit 之后响应丢了：重试为什么造出第二个订单，以及'先查再插'为什么不够"
date: 2026-10-19 16:40:00
tags:
  - backend
  - database
  - idempotency
  - sqlite
  - api-design
keywords:
  - 幂等
  - idempotency key
  - 请求重复
  - 重复下单
  - 重试
  - ON CONFLICT
  - 唯一约束
  - 事务
  - outbox 模式
  - 恰好一次
  - 分布式一致性
  - SQLite
category: dev/backend/database
description: "客户端下单，服务端 commit 成功，但在响应到达客户端之前连接断了——客户端看到报错去重试，数据库里却多出一个订单。这个 bug 既不是慢查询也不是事务出错，它藏在 commit 和响应之间的那道缝里。本文用一个只依赖标准库的 Python + SQLite 小程序把这道缝照出来，讲清为什么'先 SELECT 再 INSERT'在并发下不成立、唯一约束为什么才是决定性保护，以及外部副作用为什么让'恰好一次'变成设计问题。"
author: PFinal南丞
recommend: 后端开发
---

# commit 之后响应丢了：重试为什么造出第二个订单，以及"先查再插"为什么不够

设想一个客户端提交订单：

1. 服务端把这一行插进数据库；
2. **事务 commit 成功**；
3. 就在响应即将到达客户端的那一刻，**连接断了**。

客户端看到的是一个**错误**。而数据库里，躺着一个**完好无损的订单**。

现在客户端该做什么？

**从它的角度看，重试是合理的**——它根本看不到那次 commit。但如果服务端把这个重试当成一个**新操作**，那现在就有**两个订单**了。

这个故障**跟慢数据库无关，也跟事务出错无关**。事务完全按它该做的方式执行了。**歧义就夹在 commit 和响应之间。**

这篇文章用一个最小程序把这道缝照出来——它或许能解释，为什么你的订单系统在线上偶发地多出一单。

---

## 一、那道缝在哪里

先把"缝"画出来：

```text
   客户端                                服务端
     │                                     │
     │──── POST /orders ──────────────────▶│
     │                                     │  INSERT + COMMIT  ✅ 成功
     │                                     │
     │        ✗  连接在此断开  ✗           │  准备发送 201 + order_id
     │◀───────────────────────────────────✗
     │
     │  客户端收到 NetworkError
     │
     │──── POST /orders (重试) ───────────▶│
     │                                     │  ← 若当作新操作 = 第 2 个订单 ❌
     │                                     │  ← 若识别为重复   = 返回原订单 ✅
```

关键在于：**报错返回给调用方，并不证明"没有写入发生"。** 反过来，**数据库 commit 成功，也不证明"调用方收到确认了"。** 这是同一枚硬币的两面，只记 HTTP 结果，就丢掉了其中一面。

---

## 二、用最小程序把这道缝照出来

下面这段程序用 **SQLite 当作订单库的替身**，并在 **commit 之后立刻抛出一个连接错误**。程序里没有 HTTP 服务器——返回的状态码代表 API 会发出的响应。这样能把实验聚焦在**数据库状态**和**客户端的未知**上。

第一个版本**存了请求 key，但不强制它唯一**；第二个版本**加上唯一约束，并让重试复用同一个 key**。只需要 Python 标准库：

```python
import sqlite3
import tempfile
from pathlib import Path


def create_order(path, key, payload, safe, lose_reply=False):
    db = sqlite3.connect(path)
    try:
        if safe:
            cursor = db.execute(
                "INSERT INTO orders(request_key, payload) VALUES (?, ?) "
                "ON CONFLICT(request_key) DO NOTHING",
                (key, payload),
            )
            inserted = cursor.rowcount == 1
            order_id, stored_payload = db.execute(
                "SELECT id, payload FROM orders WHERE request_key = ?",
                (key,),
            ).fetchone()
        else:
            cursor = db.execute(
                "INSERT INTO orders(request_key, payload) VALUES (?, ?)",
                (key, payload),
            )
            inserted = True
            order_id, stored_payload = cursor.lastrowid, payload

        db.commit()
        if lose_reply:
            raise ConnectionError("response lost after commit")
        if stored_payload != payload:
            return 409, None
        return (201 if inserted else 200), order_id
    finally:
        db.close()


def run(safe):
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "orders.db"
        db = sqlite3.connect(path)
        try:
            unique = " UNIQUE" if safe else ""
            db.execute(
                "CREATE TABLE orders (id INTEGER PRIMARY KEY, "
                f"request_key TEXT{unique}, payload TEXT NOT NULL)"
            )
            db.commit()
        finally:
            db.close()

        try:
            create_order(path, "checkout-42", "one book", safe, lose_reply=True)
        except ConnectionError as error:
            print(f"safe={safe}: first={error}")

        print(f"safe={safe}: retry={create_order(path, 'checkout-42', 'one book', safe)}")
        db = sqlite3.connect(path)
        try:
            ids = [row[0] for row in db.execute("SELECT id FROM orders ORDER BY id")]
        finally:
            db.close()
        print(f"safe={safe}: stored_ids={ids}")
        if safe:
            print(
                "safe=True: changed_payload="
                f"{create_order(path, 'checkout-42', 'two books', safe)}"
            )


run(False)
run(True)
```

跑出来的结果：

```text
safe=False: first=response lost after commit
safe=False: retry=(201, 2)
safe=False: stored_ids=[1, 2]
safe=True: first=response lost after commit
safe=True: retry=(200, 1)
safe=True: stored_ids=[1]
safe=True: changed_payload=(409, None)
```

**两种情况下，第一次调用都 commit 了订单 1，然后报出"响应丢失"。** 差别在重试：

- **无约束的版本**：重试**插入了订单 2**。客户端收到了一个成功响应，但数据库里**一次意图对应两条记录**——这就是线上那个"多出一单"。
- **有请求 key 的版本**：重试**找到了订单 1**，返回**原始标识符**，而不是新建一行。

注意客户端的行为其实**没变**：它从第一次错误里，**依然无法知道**原请求到底提交没有。**它不需要在重试前知道——只要服务端能识别出这是一个"重复的意图"。**

再看最后一行：**同一个 key 带着不同 payload 到达时，示例返回 409。** 如果对一个被改过的订单**默默返回订单 1**，就会**掩盖客户端的 bug**。一个 request key 标识的是**一次意图操作，包含它有意义的那部分输入**。

---

## 三、"先 SELECT 再 INSERT"为什么不够

最诱人的补丁是：**在 insert 之前先跑一个 SELECT**。key 存在就返回它的订单，不存在就插一行。这在**顺序执行的演示里能用**，但它**不是一条完整的并发规则**。

问题在于：**两个 handler 可以在任何一方 insert 之前，先后都查到"不存在"。** 两边都看到没有行，两边都继续往下走，**于是两边都插**。

```text
  Handler A                     Handler B
     │                             │
  SELECT → 无行                  SELECT → 无行
     │                             │
   INSERT ──────────┐            INSERT ────────┐
     │              │              │            │
     └──────────────┴──────────────┴─────▶ 两行都写进去了 ❌
```

**决定性的保护是数据库里的唯一约束**——竞争性的插入会在**写入**层面被仲裁，而不是在**进程内的锁**上。`ON CONFLICT(request_key) DO NOTHING` 让"输掉的那次尝试"去**读取那个已经拥有该 key 的行**。这样代码**不依赖一个进程本地、另一个服务器实例根本看不见的锁**。

一句话：

> **幂等不能建立在"读到的状态"上，只能建立在"写入时的约束"上。**

---

## 四、真实 API 里，request key 还要补齐什么

那个玩具 schema 只留了一个字符串 payload，为的是让冲突可见。真实 API 里至少要补上这些：

| 补什么 | 为什么 |
|--------|--------|
| **把 key 限定到调用方/租户** | 不同调用方的 `checkout-42` 不该互相冲突；key 的作用域必须明确 |
| **定义 key 的有效期** | 否则记过的 key 会无限堆积，一张表越写越大 |
| **存足够信息去比对请求的关键部分** | 才能在"同 key 不同 payload"时返回 409，而不是静默复用 |
| **若一次操作写多行，key 记录必须与那些行在同一个事务里** | 否则崩溃会留下"记住了 key 却没有完成操作"，或者"操作完成却没有可用的重试记录" |

**响应也值得同样的谨慎。** 当回复里**只有一个 order ID** 时，复用已存在的 ID 很容易。但真实的端点可能包含**价格快照、确认号，或第一次尝试中生成的其它值**。这时应该**持久化或重建一份一致的结果**，而**不是每次重试都重新生成一个新的确认号**——否则同一个幂等请求会返回两份互相矛盾的"事实"。

---

## 五、commit 的两侧：前失败与后失败

**注入错误的位置很关键。** 同样是"客户端收到网络错误"，背后可能是两种完全不同的状态：

| 失败位置 | 数据库状态 | 重试应该做什么 |
|----------|-----------|---------------|
| **commit 之前** | 事务回滚 | 重试**新建**订单 |
| **commit 之后** | 订单已持久化 | 重试必须**找到已存在的订单** |

**客户端在两种情况下可能收到一模一样的网络错误。** 这正是不该把"HTTP 报错"当作"没有写入"的原因。所以实践中：

- 把 **request key 和操作结果一起记下来，并让它在日志里可搜索**；
- 事故复盘时要能回答：某次重试**复用了已有操作、新建了操作、还是因为 payload 变了被拒**；
- **一个笼统的 "500 计数" 回答不了这个问题。**

---

## 六、唯一键证明不了什么：外部副作用

必须承认**唯一约束的边界**：这个程序**只守护了一行 SQLite 记录**。

如果"创建订单"还要**向支付服务扣款、或向外发布一条消息**，那么**单靠一条数据库约束，无法让那些外部效应恰好发生一次**。此时设计要回答的是：

- **每个副作用各自归谁所有，它的重试行为是什么？**
- **数据库变更**可以用 **outbox 模式**与后续的消息投递协调——但**消费者依然要能处理重复投递**（至少一次投递 + 幂等消费）；
- **支付调用**需要**支付方自己的幂等能力**，或者一条**精心设计的恢复路径**。

这个小脚本**解决不了**上面这些。它隔离出的是**第一道边界**——数据库提交了，然后程序模拟了一次丢失的响应。

但它足以说清一件事：

> 最初，重试把**一次意图订单**变成了**两行**；
> 一旦 request key 变成**数据库约束**，**同一个重试**就恢复了**已存在的结果**。
> **两次运行里注入的故障一模一样**——区别只在于，**服务端能不能识别出一个被重复表达的意图。**

---

## 七、小结

- **"响应丢失"是一类独立故障**：它既不慢、事务也没坏，只是 commit 和确认之间出现了歧义；客户端重试是合理行为，服务端必须准备好**识别重复意图**。
- **幂等靠写入约束，不靠读-改-写**：`SELECT` 再 `INSERT` 在并发下会漏；`UNIQUE` + `ON CONFLICT` 才是决定性保护，且它天然跨进程、跨实例。
- **key 要带作用域、有效期和关键输入**：同 key 不同 payload 要显式拒绝（409），而不是静默复用。
- **别把"恰好一次"当成数据库一个问题**：它是一组副作用的所有权与重试行为的设计问题。

相关阅读：站内的 [Go database/sql 实战](/dev/backend/golang/go-database-sql)（连接、事务与重试的工程细节）、[PostgreSQL 17 + pgvector 做 RAG](/dev/backend/database/postgresql-17-pgvector-rag-2026)。

---

## 参考资料

- [I Simulated a Lost Response After Commit. The Retry Created a Second Order — Nik, Habr（2026-10-08）](https://habr.com/en/articles/1092170/)
- [SQLite — UPSERT（`ON CONFLICT`）官方文档](https://www.sqlite.org/lang_upsert.html)
- [Stripe API — Idempotent requests（幂等键设计参考）](https://docs.stripe.com/api/idempotent_requests)
- [AWS Builders' Library — Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
- [microservices.io — Transactional Outbox 模式](https://microservices.io/patterns/data/transactional-outbox.html)
- 站内相关：[Go database/sql](/dev/backend/golang/go-database-sql)、[PostgreSQL 17 + pgvector](/dev/backend/database/postgresql-17-pgvector-rag-2026)
