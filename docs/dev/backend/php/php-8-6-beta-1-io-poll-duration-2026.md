---
title: "PHP 8.6.0 Beta 1 深度解析：Io\\Poll 原生轮询、Time\\Duration 与升级必读的会话安全默认值"
date: "2026-08-19"
tags:
  - php
  - php-8.6
  - io-polling
  - duration
  - session-security
  - upgrade-guide
keywords:
  - PHP 8.6 Beta 1
  - Io\Poll
  - 轮询 API
  - epoll
  - Time\Duration
  - 会话安全默认值
  - mbregex 弃用
  - PHP 8.6 新特性
  - 特性冻结
category: PHP
description: 2026 年 8 月 13 日 PHP 8.6.0 Beta 1 发布，宣告 8.6 特性冻结。本文深度解析相对 Alpha 系列的新增重磅特性：Io\Poll 原生 I/O 轮询 API（epoll/kqueue 支持，替代 stream_select）、Time\Duration 纳秒级时间间隔类，以及升级必读的会话安全默认值变更与 mbregex 弃用。
recommend: 后端工程
---
# PHP 8.6.0 Beta 1 深度解析：Io\Poll 原生轮询、Time\Duration 与升级必读的会话安全默认值

## 引言

2026 年 8 月 13 日，PHP 团队发布了 **PHP 8.6.0 Beta 1**。Beta 1 在 PHP 发布周期中有着特殊意义：**它是"特性冻结"（Feature Freeze）的节点**——所有面向 8.6 的 RFC 已在 8 月 11 日截止合并，从此刻起功能清单不再变动，剩下的时间只用于修 bug。换句话说，**Beta 1 里看到的功能，就是 11 月 19 日 GA 时你将得到的功能**。

我们此前在 [PHP 8.6 Alpha 1 深度解析](/dev/backend/php/php-8-6-alpha-pfa-new-features-2026) 中拆解过 PFA 部分函数应用、clamp()、Closure 优化、JSON 错误定位等特性。本文聚焦 **Alpha 之后才合并的增量内容**——它们同样是 8.6 的核心资产：

- **`Io\Poll`**：PHP 首个内置原生 I/O 轮询 API，直接对接 epoll/kqueue/WSAPoll，弥补 `stream_select()` 二十年的性能短板；
- **`Time\Duration`**：纳秒级精度的时间间隔值对象，`Time` 命名空间的基石；
- **会话安全默认值**：三个 INI 默认值翻转，升级后"悄悄登出用户"的头号嫌疑；
- **mbregex 全族弃用**：Oniguruma 停止维护引发的连锁反应；
- 以及 `#[\Override]` 类常量、`enum` 的 `__debugInfo()`、流错误 API、TLS Session Resumption 等一批实用特性。

> **警告**：PHP 8.6.0 Beta 1 **不可用于生产环境**。它是测试版本，但功能已锁定，非常适合在 CI 和 staging 环境跑测试套件。

## 一、Io\Poll：PHP 首个原生 I/O 轮询 API

### 1.1 为什么需要它：stream_select() 的两大历史短板

`stream_select()` 是 PHP 长久以来唯一的 I/O 多路复用入口，其底层是 POSIX 的 `select()` 系统调用。随着 PHP 越来越频繁地被用于长连接服务（WebSocket、消息队列、异步框架），它的问题愈发突出（RFC: Polling API）：

| 限制 | 说明 |
| --- | --- |
| **FD 数量上限** | `select()` 有文件描述符上限（常见 1024），高并发连接直接触顶 |
| **O(n) 复杂度** | 每次调用都要线性扫描全部 FD，连接数上去后性能急剧恶化 |
| **无法使用现代机制** | 用不了 Linux 的 epoll、BSD/macOS 的 kqueue |
| **无高级特性** | 不支持边沿触发（edge-triggered）、一次性（one-shot）模式 |
| **内部无统一 API** | PHP 内核和扩展（FPM、sockets、curl）各自为政，甚至依赖 libuv/libevent 这类外部库 |

RFC 的首要动机正是**内部 API**：PHP-FPM 的事件处理、FrankenPHP 的 goroutine 式 TSRM 信号处理、跨平台定时器，都需要一个不依赖外部库的统一轮询层。

### 1.2 核心设计：后端自动选择 + Handle 抽象

`Io\Poll` 位于新的 `Io` 命名空间下，自动选择当前平台最优后端：

```php
// 后端自动选择（Backend::Auto 默认）
// Linux    -> epoll
// BSD/macOS-> kqueue
// Solaris  -> event ports
// Windows  -> WSAPoll
// 其他 POSIX -> poll（兜底）
```

关键抽象是 **`Io\Poll\Handle`** 标记接口：它本身不定义任何方法，只负责"标记一个可轮询的资源"。文件描述符的提取和有效性校验由 C 层的操作表（`php_poll_handle_ops`）完成。**用户态类无法实现该接口**（会直接 Fatal error），首批实现只有 `StreamPollHandle`（包装 stream 资源），sockets/curl 句柄留待后续版本。

### 1.3 用户态 API：Context + Watcher

```php
<?php

use Io\Poll\{Context, Event, StreamPollHandle};

// 1. 创建轮询上下文（可指定后端，默认 Auto）
$ctx = new Context();

// 2. 把 stream 包装为可轮询句柄
$server = stream_socket_server('tcp://0.0.0.0:8080', $errno, $errstr);
$handle = new StreamPollHandle($server);

// 3. 注册监听：关注"可读"事件，附带用户数据
$watcher = $ctx->add($handle, [Event::Read], data: 'server');

// 4. 阻塞等待事件（超时语义与 stream_select() 一致）
//    null = 无限等待；0 + 0 微秒 = 非阻塞
$ready = $ctx->wait(null);

foreach ($ready as $w) {
    $h = $w->getHandle();
    if ($w->hasTriggered(Event::Read)) {
        $conn = stream_socket_accept($h->getStream());
        // 处理新连接...
    }
    // 处理完后可移除：$w->remove();
}
```

`Watcher` 由 `Context::add()` 创建（构造函数私有，不可直接 new），支持运行时修改：

```php
// 动态修改关注的事件与数据（事件循环中切换读写关注的常用操作）
$w->modify([Event::Read, Event::Write], data: 'read-then-write');
$w->modifyEvents([Event::Write]);   // 只改事件
$w->modifyData('other');            // 只改数据
$w->getTriggeredEvents();           // 最近一次 wait() 触发的事件
$w->isActive();                     // 是否仍在上下文中
$w->remove();                       // 移除（移除后不可复用）
```

### 1.4 Event 枚举：从基础的读写到高级模式

```php
enum Io\Poll\Event
{
    case Read;          // 可读
    case Write;         // 可写
    case Error;         // 错误（自动监控，无需显式注册）
    case HangUp;        // 对端挂断（自动监控）
    case ReadHangUp;    // 对端关闭写半端（仅 Linux epoll，需显式注册）
    case OneShot;       // 一次性：触发一次后自动移除 watcher
    case EdgeTriggered; // 边沿触发：只报告状态变化（epoll/kqueue 支持）
}
```

`Backend` 枚举提供平台能力查询：`Backend::getAvailableBackends()`、`Backend::Epoll->isAvailable()`、`Backend::Kqueue->supportsEdgeTriggering()`——框架开发者可以用它做能力探测。

### 1.5 对生态的意义

`Io\Poll` 提供的是**轮询原语而非完整事件循环**，但它足以让 ReactPHP、AmpPHP、Revolt 等异步框架用**一个统一后端**替代各自维护的多套轮询实现，而无需依赖 libuv/libevent 外部扩展。对普通开发者，它也是 `stream_select()` 的现代化替代品——尤其是超过 1024 连接或需要边沿触发的高性能场景。

## 二、Time\Duration：纳秒级时间间隔值对象

### 2.1 定位：不是"时刻"，是"时长"

PHP 的时间处理一直缺一块拼图：`DateTime` 表示"某个时刻"，`DateInterval` 表示"年/月/日式的日历间隔"，但日常代码中大量需要的是**纯粹的、与日历无关的时间间隔**——"500 毫秒"、"超时 30 秒"、"限流 1 分钟"。过去只能用裸 int + 变量名约定（`$timeout_ms`），单位全靠自觉，极易出错。

`Time\Duration`（RFC: Duration class）填补了这个空白：

```php
<?php

use Time\Duration;

// 工厂方法：从各时间单位创建（参数均不可为负）
$d1 = Duration::fromMilliseconds(500);
$d2 = Duration::fromSeconds(30);
$d3 = Duration::fromMinutes(2);
$d4 = Duration::fromHours(1);
$d5 = Duration::fromNanoseconds(1_000_000_000); // 1 秒

// 内部表示：秒 + 纳秒 + 符号位（纳秒精度，范围约 ±292 年）
$d1->seconds;       // 0
$d1->nanoseconds;   // 500_000_000
$d1->negative;      // false
```

### 2.2 运算与比较

```php
<?php

use Time\Duration;

// 算术（返回新对象，Duration 是 final readonly）
$sum = Duration::fromSeconds(1)->add(Duration::fromMilliseconds(500));
$diff = Duration::fromSeconds(10)->sub(Duration::fromSeconds(3));
$tripled = Duration::fromSeconds(2)->multiplyBy(3);
$half = Duration::fromSeconds(5)->divideBy(2); // 2 秒（纳秒截断）

// 负向操作
$neg = Duration::fromSeconds(5)->negate();     // -5 秒
$abs = $neg->absolute();                        // 5 秒

// 比较：实现了比较处理句柄，< > 直接可用
Duration::fromSeconds(2) < Duration::fromSeconds(3); // true
Duration::compare(Duration::fromSeconds(1), Duration::fromSeconds(1)); // 0

// 溢出会抛 Time\TimeException
$huge = Duration::fromSeconds(PHP_INT_MAX)->add(Duration::fromSeconds(1));
// Time\TimeException: 溢出
```

注意：**`+` 运算符不会重载**（PHP 运算符重载仍不可行），加法必须用 `add()`。另外 `fromIso8601DurationString()` 可以解析 ISO-8601 时长串（如 `"PT1M30S"`），但只接受时间分量（`H` 为最大单位），带日期分量的会被拒绝。

### 2.3 为什么值得关注

RFC 明确把 `Time` 命名空间定位为**未来日期时间体系重构的地基**——`Instant`、`CalendarInterval` 预计将在此基础上构建。`Time\Duration` 之于 PHP，相当于 Rust 的 `std::time::Duration`：让"时长"成为一等公民，从源头消灭单位混乱。

## 三、升级必读：会话安全默认值（Beta 1 最"痛"的变更）

### 3.1 三个 INI 默认值翻转

这是 RFC: Session Security Defaults 的落地——三个长期饱受诟病的默认值在 8.6 一次性修正：

| INI 设置 | 旧默认值 | 8.6 新默认值 | 影响 |
| --- | --- | --- | --- |
| `session.use_strict_mode` | `0` | `1` | 拒绝未初始化的会话 ID，缓解会话固定攻击 |
| `session.cookie_httponly` | `0` | `1` | 会话 Cookie 无法被 `document.cookie` 读取 |
| `session.cookie_samesite` | 未设置 | `Lax` | 跨站请求不再携带会话 Cookie |

**安全性上是正确的、迟到的修正**；但对升级者而言，这三个默认值正是"用户悄悄被登出"的三大来源：

### 3.2 谁会被影响

**① `use_strict_mode = 1`：子域共享会话会失效**

如果你的应用故意跨子域传递会话 ID（比如 `a.example.com` 生成 ID，跳到 `b.example.com` 消费，使用 files 保存处理器），严格模式下首个请求会因为"找不到对应会话文件"而拒绝 ID。正确姿势是在源侧先 `session_write_close()` 再跳转。使用 Redis/Memcached 保存处理器且 `validateId()` 未实现（默认返回 true）的应用**不受影响**。

**② `cookie_httponly = 1`：读 `document.cookie` 的 JS 挂掉**

任何依赖从 JS 读取会话 Cookie（例如嵌入自定义请求头做关联）的代码都会失效。会话 ID 本质是服务端凭证，本就不该暴露给客户端；需要客户端 token 的场景应使用独立的、非 HttpOnly 的 CSRF token。

**③ `cookie_samesite = Lax`：跨站 POST 不再带 Cookie**

依赖跨站 POST 携带会话 Cookie 的场景（SP 发起的 SAML SSO 流程、遗留跨域表单提交、部分支付网关回调）会断。这些端点需显式设置 `SameSite=None; Secure`，或迁移到 token 方案。

**好消息**：Chrome（80 起）和 Firefox（103 起）早已对无 SameSite 属性的 Cookie 隐式应用 Lax，而 Safari 一直未应用——这个变更只是把行为显式化并统一了所有浏览器。Laravel 等框架在 `config/session.php` 中显式设置了这些值，显式设置会覆盖新默认值，**框架用户基本无感**；裸 PHP 用户需要重点检查。

## 四、mbregex 全族弃用：Oniguruma 的终章

### 4.1 背景

`mb_ereg` 系列（多字节正则）底层依赖 **Oniguruma** 库，而该库**已停止维护**（RFC: EOL Oniguruma）。继续捆绑一个无人维护的正则引擎，安全风险只会累积。PHP 8.6 的决定：**弃用整个 mbregex API 家族**。

### 4.2 被弃用的 14 个函数

```php
mb_ereg, mb_ereg_match, mb_ereg_replace, mb_ereg_replace_callback,
mb_ereg_search, mb_ereg_search_getpos, mb_ereg_search_getregs,
mb_ereg_search_init, mb_ereg_search_pos, mb_ereg_search_regs,
mb_ereg_search_setpos, mb_eregi, mb_eregi_replace, mb_split
```

同时移除的还有 `MB_ONIGURUMA_VERSION` 常量以及 `mbstring.regex_retry_limit` / `mbstring.regex_stack_limit` 两个 INI 选项。这些函数**将在 PHP 9.0 中移除**。

### 4.3 迁移路径

绝大多数 `mb_ereg*` 用法都可以迁移到 **PCRE（`preg_*`）+ `/u` 修饰符**：

```php
// 旧：mb_ereg（正则本身是 POSIX ERE 风格）
if (mb_ereg('^[a-z]+$', $str)) { /* ... */ }

// 新：preg_match + /u（注意 PCRE 使用 \d \w 等转义与 ^$ 语义需核对）
if (preg_match('/^[a-z]+$/u', $str)) { /* ... */ }
```

注意 ERE 与 PCRE 语法差异（如 `\(` `\)` 的转义规则相反），批量迁移后必须用测试套件核对。已确认无法迁移的边界场景，可使用 `mb_onig` PECL 扩展作为临时方案。

## 五、Beta 1 更多新特性速览

### 5.1 `#[\Override]` 扩展到类常量与 enum case

8.3 引入的 `#[\Override]` 属性现在可以标注类常量（含 enum case），声明"我确实在覆盖父类定义"——写错常量名会立即报错，而不是静默新增：

```php
interface HttpStatus { public const OK = 200; }

class MyResponse implements HttpStatus {
    #[\Override]
    public const OK = 200; // ✅ 正确，覆盖父接口常量

    #[\Override]
    public const CREATED = 201; // ❌ 编译错误：父类没有 CREATED
}
```

### 5.2 enum 支持 `__debugInfo()`

枚举此前禁止定义 `__debugInfo()`（`var_dump()` 时无法定制输出）。8.6 解除该限制，调试敏感枚举（如含密钥字段的枚举）时可以定制展示。

### 5.3 readonly 属性支持默认值

```php
class Config {
    public readonly int $timeout = 30; // ✅ 8.6 允许默认值
}
```

此前 readonly 属性不能声明默认值，只能用构造函数初始化，这个限制在 8.6 解除。

### 5.4 常量对象属性直接写入

存储在常量中的对象可以直接修改其属性：`OBJ->prop = $val`（此前需要 `clone` 后修改再赋回）。

### 5.5 流错误 API 与 TLS Session Resumption

- **流错误 API**（RFC: Stream Errors）：新增 `StreamError`、`StreamException` 类与 `stream_last_errors()` / `stream_clear_errors()` 函数，流操作错误从"吞掉/警告"变为可编程捕获；
- **TLS 会话恢复**（RFC: TLS Session Resumption）：stream context 新增 `session_data`、`session_cache`、`num_tickets` 等 9 个选项，客户端可跨请求复用 TLS 会话，服务端可自定义会话存储；配套新增 `Openssl\Session`、`Openssl\Psk` 类；
- **TLS 1.3 0-RTT**：客户端 `early_data` 选项 + 服务端 `max_early_data` / `early_data_cb`，握手往返再减一次。

### 5.6 GMP 与 Intl 增强

- `gmp_powm_sec()`：**侧信道安全的**模幂运算（GNU MP ≥ 5.0.0），常量时间实现，密码学场景利好；
- `gmp_prevprime()`：小于给定数的最大的素数，`$definitely_prime` 输出参数区分"确定素数/概率素数"（GNU MP ≥ 6.3.0）；
- `grapheme_strrev()`：按字素簇反转字符串——`strrev()` 会拆坏 emoji 和组合字符，这个不会；
- `IntlNumberRangeFormatter`：数字区间格式化（"3–5 个"），`SpoofChecker` 新增双向混淆检测方法。

## 六、性能改进与平台变化

### 6.1 编译期优化（零改动收益）

- **printf() 快速路径**：只含 `%s` 和 `%d` 的 `printf()` 会被编译为等价字符串插值，省去函数调用和格式串解析开销；
- **array_map + 回调编译为 foreach**：当回调是一等 callable 或 PFA 时，`array_map()` 会被编译成等价 foreach 循环，避免创建中间 Closure 和内部函数回调开销，且对 JIT 更友好；
- **无状态闭包缓存**：static、无捕获、无静态变量的闭包只创建一次（配合 5.1 的静态推断），闭包密集场景内存与时间双重下降（详见 Alpha 1 文章）；
- **TAILCALL VM 性能提升**，且 Windows 上 Clang ≥ 19 x86_64 编译时默认启用；
- ZTS 线程安全构建的整体性能提升。

### 6.2 平台与其他

- 官方 Windows 构建升级到 **Visual Studio 2026（VS18）** 与 **OpenSSL 4**；libxml2 升级到 2.15.3；
- **OOM 行为变更**：硬性内存耗尽时 `abort()` 替代 `exit(1)`，退出码变为 134（可产生 core dump，便于排查）。

## 七、Beta 1 升级检查清单

Beta 1 功能已冻结，现在正是跑测试的最佳时机。以下是本次升级的检查重点：

```text
PHP 8.6 升级检查清单（Beta 1 阶段）：

□ 1. 会话行为
   □ 确认 session.use_strict_mode / cookie_httponly / cookie_samesite
     是否被框架显式设置（Laravel 等已显式设置，无感）
   □ 检查 JS 是否读取 document.cookie 中的会话 ID
   □ 检查跨站 POST 支付回调 / SAML SSO 是否依赖会话 Cookie
   □ 子域共享会话的，确认有 session_write_close() 流程

□ 2. mbregex
   □ 全局搜索 mb_ereg / mb_split / mb_eregi 使用点
   □ 规划迁移到 preg_* + /u，注意 ERE/PCRE 语法差异
   □ 边界场景评估 mb_onig PECL

□ 3. 弃用告警（E_ALL 下逐个清零）
   □ __construct()/__destruct() 返回值与 Generator 化
   □ metaphone() / is_double() / is_long() / is_integer() / doubleval() / strcoll()
   □ spl_classes() / spl_object_hash()
   □ ArrayIterator 的 10 个方法（getFlags/sort 系列/serialize...）
   □ mysqli_get_charset() / mysqli_stmt_init()
   □ finally 块中的 return；define() 第 3 参数；函数命名 readonly
   □ mb_convert_variables 传对象；array_walk 传对象

□ 4. 行为变化
   □ ??/empty() 作用于魔法属性：__isset() 已物化时不再触发 __get()
   □ trim/ltrim/rtrim 默认剥离换页符 \f
   □ array_filter() 无效 $mode 抛 ValueError
   □ NUL 字节参数全面 ValueError 化（session/GMP/SimpleXML/文件函数等）

□ 5. 新特性尝鲜
   □ Io\Poll：异步框架（ReactPHP/AMPHP）后端适配进度
   □ Time\Duration：替换裸 int 时长
```

## 八、总结

| 特性 | 影响级别 | 说明 |
| --- | --- | --- |
| **Io\Poll 轮询 API** | ★★★★★ | PHP 首个原生轮询层，epoll/kqueue 直接可用，框架地基 |
| **Time\Duration** | ★★★★☆ | 纳秒精度时长值对象，Time 命名空间基石 |
| **会话安全默认值** | ★★★★☆ | 安全正确，但升级最痛的兼容点 |
| **mbregex 弃用** | ★★★★☆ | Oniguruma 停维护，14 函数两年内移除 |
| **printf/array_map 编译优化** | ★★★☆☆ | 零改动性能收益 |
| **#[\Override] 常量 / enum __debugInfo** | ★★★☆☆ | 类型安全与调试体验提升 |
| **TLS Session Resumption / 0-RTT** | ★★★☆☆ | 长连接与 HTTP/3 场景的握手优化 |

PHP 8.6 不是"革命性"的版本，而是一个**补齐短板**的版本：`Io\Poll` 补上了 I/O 轮询这块二十年短板，`Time\Duration` 让时间间隔成为一等公民，会话安全默认值把十年来的安全建议终于变成默认行为。PFA、clamp、Closure 优化等已在 Alpha 1 文章详述的特性，加上本文的增量，共同构成了 PHP 8.6 的完整面貌。

**行动建议**：Beta 1 是功能冻结版——现在就把 8.6.0-beta1 加进 CI 测试矩阵，重点跑上面清单里的会话、mbregex、弃用告警三类检查。等到 11 月 19 日 GA 时，你的代码就已经准备好了。

---

## 参考资料

- [PHP 8.6.0 Beta 1 发布公告（php.net）](https://www.php.net/index.php#2026-08-13-1)
- [PHP 8.6 UPGRADE NOTES（php-src master）](https://github.com/php/php-src/blob/master/UPGRADING)
- [PHP RFC: Polling API](https://wiki.php.net/rfc/poll_api)
- [PHP RFC: Duration class](https://wiki.php.net/rfc/duration_class)
- [PHP RFC: Session Security Defaults](https://wiki.php.net/rfc/session_security_defaults)
- [PHP RFC: EOL Oniguruma（mbregex 弃用）](https://wiki.php.net/rfc/eol-oniguruma)
- [PHP RFC: Override Constants](https://wiki.php.net/rfc/override_constants)
- [PHP RFC: Stream Errors](https://wiki.php.net/rfc/stream_errors)
- [PHP RFC: TLS Session Resumption](https://wiki.php.net/rfc/tls_session_resumption)
- [PHP 8.6 特性追踪（PHP.Watch）](https://php.watch/versions/8.6)
- [PHP 8.6 Alpha 1 深度解析（本站）](/dev/backend/php/php-8-6-alpha-pfa-new-features-2026)
