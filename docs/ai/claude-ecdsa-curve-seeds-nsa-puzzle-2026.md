---
title: "Claude 30 分钟破解 NIST ECDSA 曲线种子之谜：25 年悬案终结于 drand48 与 1997 年的 Unix 时间戳"
date: 2026-10-19 10:00:00
tags:
  - ai
  - cryptography
  - security
  - ecdsa
  - claude
keywords:
  - Claude
  - ECDSA
  - NIST 椭圆曲线
  - P-256
  - lrand48
  - drand48
  - srand48
  - 曲线种子
  - LLL 格基约简
  - NSA 后门
  - FIPS 186-2
  - Anthropic
category: ai
description: "2026 年 10 月，Anthropic 的内部研究模型在 30 分钟内推理出困扰密码学界 25 年的 NIST ECDSA 曲线种子来源：它们不是神秘哈希，而是 srand48() + 1997 年的 Unix 时间戳。本文逐层还原 Claude 的破案路径——31 位 PRNG 指纹、LLL 格基约简、状态倒推——并给出我自己跑通、能精确复现 P-256 种子的 20 行 Python 代码。"
author: PFinal南丞
recommend: 密码学
---

# Claude 30 分钟破解 NIST ECDSA 曲线种子之谜：25 年悬案终结于 drand48 与 1997 年的 Unix 时间戳

2026 年 10 月 16 日，Anthropic 的 Frontier Red Team 发了一篇标题相当克制的文章——《Claude reveals ECDSA curve origins》。它讲的事情却一点也不克制：一个内部研究模型在**不到半小时**里，推理出了 NIST 五条素数域椭圆曲线（P-192、P-224、P-256、P-384、P-521）的"种子"来源，而这个问题——用密码学家的话说——已经悬了**大约 25 年**。

关键结论一句话：这些种子**不是**任何一个密码学哈希函数的输出，而是 **C 标准库 `lrand48`（POSIX `drand48` 家族）随机数生成器的输出，用当时的 Unix 时间戳做初始化**。

这不是攻破加密，也不是发现新漏洞。恰恰相反，它是**排除了**一桩持续了四分之一世纪的后门嫌疑。本文按工程视角把它拆开：种子到底是什么、Claude 是怎么找到的、以及我亲手复现的那段能精确算出 `c49d3608…` 的代码。

---

## 一、30 分钟 vs 25 年：这次 AI 到底做了什么

先把事实钉死（均来自 Anthropic 官方文章与 Filippo Valsorda 的确认）：

| 事实 | 内容 |
|------|------|
| 事件时间 | 2026 年 10 月，Anthropic 一名员工口头提问内部研究模型 |
| 耗时 | 不到半小时（in under half an hour） |
| 对象 | NIST P-192 / P-224 / P-256 / P-384 / P-521 的 seed |
| 结论 | 来自 `lrand48`，用 1997–1998 年的 Unix 时间戳初始化 |
| 独立验证 | 密码学家 Filippo Valsorda 用 Go 重新实现算法并确认 |
| 悬赏 | 2023 年 Valsorda 设立的 NIST Elliptic Curves Seeds Bounty |
| 归属 | Anthropic 团队于 2026-10-15 01:07:51 UTC 领取，捐赠三倍金额 $36,864 给 ISRG（Let's Encrypt 的运营方） |

参与这项工作的 Anthropic 研究者是：John Wood、Henry de Valence、Ava Howell、Zack Voase、Lucy Sweet、Amir Omidi、Paul Crowley、Iain McGinniss、Nicholas Carlini、Steve Weis。

值得强调的一点：**这不是"AI 找到了新数学"**。Anthropic 自己承认，这不是一个需要新数学的难题，而是一个需要"在海量可能性里耐心穷举"的**搜索问题**。Claude 之所以能成，是因为模型被放到了一个恰好是它强项的位置上——不是替代推理，而是把"穷举"变得便宜到值得一试。

---

## 二、先搞清楚：ECDSA "种子"到底是什么

要理解这件事为什么重要，得先理解 NIST 曲线参数是怎么被"生成"的。

NIST 在 2000 年通过 **FIPS 186-2** 发布了这批曲线。标准里对素数域曲线的参数不是"直接给出一个 `b` 系数"，而是给了一个 **seed**（种子），并用一条可复现的规则从它推导出系数 `b`：

```text
        seed (20 字节, 160 bit)
              │
              ▼
        SHA-1(seed)                ← ANSI X9.62 规定的推导
              │
              ▼
        取哈希输出的一段 bit
              │
              ▼
        曲线上参数 b   ← 所谓 "nothing-up-my-sleeve" 手法
```

这套设计的本意是"防我把后门藏进常数里"：如果你给出一个明显随机的 hash 值，别人就能相信 `b` 不是被精心挑出来的。这类常数在密码学里叫 **nothing-up-my-sleeve numbers**（"袖子里没藏东西"的数）——你没法事后挑一个能开后门的 `b` 再倒推出好看的哈希，因为哈希是单向的。

问题出在**源头**：NIST 的 seed 是由 **NSA** 提供的，却**没有给任何解释**。以 P-256 为例，标准里只写了这么一个值：

```text
SEED = C49D3608 86E70493 6A6678E1 139D26B7 819F7E90
```

没有说明它是怎么来的。Koblitz 和 Menezes 在 2015 年那篇著名的《A Riddle Wrapped in an Enigma》里系统整理了这段争议。更微妙的是：即便 seed 来自一个"看似随机"的方法，**如果你能自由挑选 seed**，你也可能搜出一些特殊属性——这就给了"故意选一条弱曲线"留了想象空间。于是各种说法在社区里流传了很多年。

流传最广的版本是：NSA 数学家 **Jerry Solinas** 在 1997 年把某个**俏皮英文句子**做了哈希。Solinas 本人 2015 年说过一段话：

> "I believe there was a counter rather than multiple hashing, but I don't know details. The message was along the lines of 'Give Bob and Jerry a raise' or 'Bob and Jerry rule' or something like that. … Nor were we able to find archives from so long ago."

Solinas 已于 2023 年去世，这个"哈希了一个俏皮话"的传说就此再无当事人可问。

---

## 三、Claude 的破案路径（技术还原）

Anthropic 公开的思路非常工程化，可以分成四步。我按"换一个正常人会怎么想"的顺序还原。

### 3.1 先否掉"哈希一个俏皮话"

第一件事是**排除**。Anthropic 内部不少人早就在追这个线索——顺着"俏皮话哈希"的方向去找——但一无所获。Claude 换了个角度：不去猜句子，而是**反推"生成曲线的那个程序"大概长什么样**。

这是一个很关键的思维转折：与其猜数据（句子），不如猜**程序的形状**。

### 3.2 找到 1990 年代 PRNG 的指纹

Claude 的假设是：生成曲线的软件用的是 1990 年代 C 标准库里**自带的伪随机数生成器（PRNG）**。这些老 PRNG 的特征是——**太弱，弱到输出本身可以被识别**。

于是它写了一个扫描器：把每个已发布的 seed 当作比特流，**一位一位地滑动**，检查相邻的若干块是否是某个特定老式生成器的连续输出。扫描覆盖了 **34 种"生成器 × 输出切片"组合**。

很快，它注意到一个肉眼可见的规律：**有些 seed 的高位比特全是 0**。把 seed 写成 5 个 32 位字，10 个 seed 里有 4 个的**每个字最高位都是 0**。这事纯随机发生的概率大约是 **1/5810**——不是巧合，是签名。

这个签名指向 **`lrand48`**：它内部是 48 位状态，但**只返回高 31 位**，所以最高位永远为 0。

### 3.3 用 LLL 格基约简从"被截断的输出"里恢复状态

谜底初现，但还有硬骨头。素数域曲线的 seed 是**每个输出只保留了一小部分 bit** 拼起来的，也就是说你只看到了生成器状态的**碎片**。

"从一个被截断的线性同余生成器（LCG）里恢复内部状态"——这在密码学里是一个**教科书级的格问题（lattice problem）**，标准解法是 **LLL（Lenstra–Lenstra–Lovász）基约简算法**。

Claude 并不知道 seed 精确对应到状态的哪一段，所以它**把求解器在所有可能的窗口上各跑一遍**。结果是：NIST 的五条素数曲线 seed，加上 ANSI X9.62 标准里的另外五条，全都是同一个规律——**`lrand48() >> 23`**（只取高 8 位）。每一个被恢复出来的 48 位状态，都能**完整再生成它那 160 bit 的 seed**——这种吻合不可能是偶然。

### 3.4 把状态"倒着走"回 srand48 的初始化形态

LCG 的好处是**正着走、倒着走一样容易**。于是对每个 seed，Claude 把状态**往回退**，一直退到 `srand48` 初始化时会形成的那种形态：低 16 位等于 `0x330E`（这是 glibc `srand48` 的标志）。

单个 `srand48` 形态**平均每 65,536 步才出现一次**，所以"退到一个合法形态"本身不算证据。真正的证据是：**十条素数曲线 seed，退回到的每一个 `srand48` 初始化值，都恰好是一个代表 1997 年 5 月到 1998 年 4 月之间的 Unix 时间戳**。

谜底彻底合上了：**就是拿当时的时间戳喂给 `srand48()`**。

下面是 Valsorda 在确认文里贴出的完整对应表（我加了曲线名）：

| `srand48(seed)` | 时间戳 (UTC) | 被采纳的候选(序数) → 曲线 |
|---|---|---|
| 863711343 | 1997-05-15 15:49:03 | 36, 1562…, **2185 → prime239v1**, **2320 → prime239v2**, …, **3048 → prime239v3** |
| 863966734 | 1997-05-18 14:45:34 | **139 → P-192 (prime192v1)**, …, **6013 → prime192v2** |
| 871002724 | 1997-08-08 01:12:04 | **1136 → P-521** |
| 871696354 | 1997-08-16 01:52:34 | 876（未发布）, **1842 → P-256 (prime256v1)** |
| 872952608 | 1997-08-30 14:50:08 | **2688 → P-384** |
| 891607927 | 1998-04-03 12:52:07 | 777, 1485, 5736, **7026 → P-224** |

注意 P-256 那一行：同一次运行里，第 876 个候选和最终发布的第 1842 个候选**都是**合法的素数阶曲线，但只发布了后者。这就是后面"开放问题"的伏笔。

Claude 当时自己的推理记录也很有人味：

> "This is astonishing: it solves the 25-year-old mystery. Hmm wait. Let me be skeptical: am I in some sort of simulated/test environment? … All top bits clear—20 bits, chance 1e-6. So indeed real-world. Wow, it's a real discovery."

---

## 四、我自己复现了一遍：20 行 Python 算出 `c49d3608…`

拒绝"听别人说"。Valsorda 用 Go 重写了算法做验证；我按 Anthropic / Valsorda 描述的规则，用 Python 重写了一份**最小可复现**版本。

规则拆解：

1. `srand48(t)`：把 48 位状态设为 `(t << 16) | 0x330E`；
2. 每步做一次 glibc 的 LCG 递推：`state = (0x5DEECE66D × state + 0xB) mod 2⁴⁸`；
3. `lrand48()` 返回 `state >> 17`（31 位）；素数曲线种子用 `lrand48() >> 23`（高 8 位）；
4. 每 **20 个字节**拼成一个候选 seed，按 ANSI X9.62 校验，合法则采纳，否则继续。

```python
A = 0x5DEECE66D
C = 0xB
MASK = (1 << 48) - 1

class LCG:
    def __init__(self, seed):
        self.x = ((seed << 16) | 0x330E) & MASK   # srand48
    def lrand48(self):
        self.x = (A * self.x + C) & MASK
        return self.x >> 17                       # 只取高 31 位

def seed_at(ts, n, shift=23):
    """从时间戳 ts 出发，取第 n 个 20 字节候选 seed"""
    g = LCG(ts)
    buf = bytearray()
    for _ in range(n * 20):
        buf.append((g.lrand48() >> shift) & 0xFF)  # 每个输出贡献 8 bit
    return bytes(buf[(n - 1) * 20: n * 20])

print(seed_at(871696354, 1842).hex())  # P-256: srand48(871696354), 第 1842 个
```

实测输出（我在本机跑过）：

```text
c49d360886e704936a6678e1139d26b7819f7e90
```

和标准里 P-256 的 `SEED = C49D3608 86E70493 6A6678E1 139D26B7 819F7E90` **逐字节一致**。同样代入另外几条：

```text
P-192  cand  139 : 3045ae6fc8422f64ed579528d38120eae12196d5
P-384  cand 2688 : a335926aa319a27a1d00896a6773a4827acdac73
P-521  cand 1136 : d09e8800291cb85396cc6717393284aaa0da64ba
P-224  cand 7026 : bd71344799d5c7fcdc45b59fa3b9ab8f6a948bc5
```

也就是说：**任何人今天都能用一段标准 LCG 代码，把 NSA 在 1997 年"提交"的那些常数原样重算出来**。这一条，本身就是这件事最震撼的地方——所谓"秘密"，从来就不是密码学意义上的秘密，它只是**没被记录**而已。

> 补充一个工程细节：`drand48` / `lrand48` 是 POSIX 标准的一部分。正因为如此，**持有的不是"某个 NSA 私藏算法"，而是一段公开、可复现的代码**——这是它为什么能被逆向出来的根本原因。

---

## 五、不止种子：松开的还有 base point

查 seed 的同时，Claude 顺手解开了一部分 **base point（基点 G）** 的来源。

每条 ECDSA 曲线都有一个固定的基点 `G`，所有公钥都是 `G` 的某个倍数。即使你知道 seed，seed 也**不决定** `G`。而历史上，**NIST 的基点是怎么选的，同样没人解释过**。

Claude 发现：1997 年 5 月生成的那六条曲线（P-192 以及 ANSI X9.62 的 prime192v2、prime192v3、prime239v1~v3）的基点，来自 **Arjen Lenstra 的长整数运算库 FreeLIP** 里的随机数生成器（早期版本的 Victor Shoup 的 NTL 库里也带了同一段代码）。

生成配方相当朴素：

```text
1. 用一个小整数给生成器做种子
2. 丢弃前 7 个输出
3. 从 26 bit 的输出里取候选 x 坐标，对 p 取模
4. 重复第 3 步，直到 x 落在曲线上
```

Claude 反推出的生成器种子是：

| 曲线 | FreeLIP 生成器种子 |
|------|-------------------|
| P-192 | 20000 |
| prime239v1 / v2 / v3 | 20420 / 20507 / 20509 |
| prime192v2 / v3 | 20512 / 20517 |

据 Anthropic 称，**在此之前，没有任何一个 NIST 基点被解释过**。

---

## 六、还没解释的部分（开放问题）

Anthropic 很诚实地列了没搞定的地方——这些恰恰说明结论没有被"过度包装"：

- **B-163 的 seed 仍然无解**（第五条二进制域曲线的种子）；
- **P-224 / P-256 / P-384 / P-521 的基点、以及 NIST 二进制曲线的基点**没有被这套配方解释；
- **"被跳过的候选"**：同一次运行里，有些其实满足大小和素数阶条件的候选被略过了。P-256 的第 876 个候选就是一例；P-224 的运行里跳过了 3 个；ANSI 两条示例曲线的两次运行里共跳过 7 个。**为什么跳过、依据什么标准，目前不知道**。

Valsorda 补充了一条**较清晰**的未公开判据：**如果曲线的阶 `n` 的位长大于基域 `p` 的位长，则种子被拒绝**（注意不是更严格的 `n < p`，因为 prime239v2 满足 `p < n < 2²³⁹`）。即便如此，能通过的合法 seed 依然**大约是已发布数量的两倍**，多出来的那批为什么没发布，他和 Anthropic 都没能给出令人信服的解释——猜测的方向是"验证过程本身消耗了 RNG 输出"或者"1997 年代码里有个大约一半概率返回错误结果的 bug"。

---

## 七、这意味着什么：从"可能的后门"到"仅仅 30 比特自由"

这才是整件事的分量所在。

**在结果出来之前**，最有力的后门担忧来自 Bernstein 和 Tanja Lange 在 2017 年向 Koblitz、Menezes 描述的一种技术：如果 NSA 能自由挑选 seed，理论上可以动用约 **70 bit 的自由度**，去命中一类假设的、规模约 `2⁶¹` 的**弱素数阶曲线**。（Bernstein 本人正是竞品曲线 Curve25519 的设计者。）

**结果出来之后**，Valsorda 的结论是：这项技术被**彻底排除**。因为即便假设 NSA 能任意挑选 1997–1998 年的任意时间戳、并且还能在前 16 个素数阶候选里随便挑（这已经"慷慨地"把上面那些未解释的跳过都算进去了），它可用的自由度也只有**勉强 30 比特**——**不足以定向命中那类弱曲线，也不足以植入任何 NOBUS（只有 NSA 自己能利用）后门**。

一句话对比：

| | 后门需要的自由度 | 实际可用自由度 | 结论 |
|---|---|---|---|
| Bernstein–Lange 攻击设想 | ~70 bit（命中 2⁶¹ 弱曲线） | — | 需要自由选 seed |
| 本案例实测 | — | ~30 bit | **不足以下毒手** |

Valsorda 甚至把这个发现放进了 NIST 曲线密码学的"**平反弧线**"（rehabilitation arc）里——和确定性/对冲式 ECDSA 签名、经过形式化验证的域实现、以及 Renes–Costello–Batina 在 2015 年提出的完备加法公式并列。他写道：

> "…which I would now personally recommend over Curve25519/Ed25519/X25519. Just in time for them to be retired in favor of post-quantum signatures."

翻译一下：**我如今个人推荐 NIST 曲线，胜过 Curve25519/Ed25519/X25519**——只不过恰好在它们要被后量子签名淘汰的前夕。

---

## 八、这次事件真正值得记住的三件事

1. **"溯源"不等于"破解"**。Claude 做的不是攻破 ECDSA，而是回答了一个考古式的问题是"这个数从哪来"。把这两件事混为一谈，是这次新闻里最常见的误读。

2. **AI 在这种问题上的优势，是"耐力"而不是"洞察"**。Valsorda 和 Anthropic 都指出：这不是需要新数学的难题，是没有哪个研究者会为了一个猜想，去把几十年的档案和可能性**全都读一遍**的问题。模型把它变成了"读得起"的搜索。

3. **它反而提升了信任**。一颗悬了 25 年的心，落地的姿势是"哦，原来只是 1997 年的 `srand48()` 加时间戳"。这提醒我们：**对密码学的信任，很多时候是"可解释性"问题，而不是"强度"问题**。

顺带一提，比特币不受影响——它用的是 **secp256k1**，是另一套参数，不在这次讨论的 NIST 曲线之列。而随着后量子签名的推进，P-256/P-384 这类曲线本身也即将进入"退役倒计时"。相关背景可以看站内的 [后量子密码迁移笔记](/security/offensive/post-quantum-cryptography-go-migration-2026)。

---

## 参考资料

- [Claude reveals ECDSA curve origins — Anthropic（2026-10-16）](https://www.anthropic.com/news/ecdsa-curve-origins)
- [The NIST Elliptic Curves Seeds Bounty Has Been Claimed — Filippo Valsorda](https://words.filippo.io/seeds-solved/)
- [Announcing the $12k NIST Elliptic Curves Seeds Bounty — Filippo Valsorda（2023-10-05）](https://words.filippo.io/)
- [A Riddle Wrapped in an Enigma — Neal Koblitz, Alfred Menezes（2015）](https://eprint.iacr.org/2015/1018)
- [FIPS 186-2 Digital Signature Standard — NIST](https://csrc.nist.gov/publications/detail/fips/186/2/archive)
- [Anthropic's Claude cracks a 25-year NSA curve mystery — CoinDesk（2026-10-17）](https://www.coindesk.com/tech/2026/10/17/wow-it-s-a-real-discovery-claude-cracks-a-25-year-nsa-number-mystery)
- 站内相关：[后量子密码迁移：Go 生态的现在与下一步](/security/offensive/post-quantum-cryptography-go-migration-2026)
