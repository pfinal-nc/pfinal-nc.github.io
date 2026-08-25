---
title: Fastjson2 ≤2.0.62 AutoType RCE 深度分析：SeeAlso 链如何绕过白名单直达类加载器
date: 2026-08-04
tags:
  - security
  - java
  - fastjson2
  - rce
  - deserialization
  - autotype
  - seealso
  - alibaba
keywords:
  - Fastjson2 RCE
  - SeeAlso 链
  - AutoType 绕过
  - CVE-2026-16723
  - fastjson 2.0.62
  - 反序列化漏洞
  - FNV-1a 哈希碰撞
  - 长亭科技
  - SafeMode
  - 2.0.63 修复
category: security/offensive
description: 2026 年 8 月初，国内 Java 生态核心组件 Fastjson2（≤2.0.62）曝出严重 AutoType 反序列化漏洞：SeeAlso 利用链在多态反序列化场景下无需 FNV-1a 哈希碰撞即可强制开启 SupportAutoType，绕过白名单直达类加载器实现远程类加载。本文基于官方 issue #7702 与维护方确认信息，拆解两条利用路径（FNV 碰撞与 SeeAlso）、JDK 版本差异、修复版本 2.0.63 的加固措施与 SafeMode 缓解方案。
recommend: 安全工程
---
# Fastjson2 ≤2.0.62 AutoType RCE 深度分析：SeeAlso 链如何绕过白名单直达类加载器

> 官方维护方已确认（issue #7702）| 修复版本 2.0.63 已发布 | CVSS 9.8 | 暂无正式 CVE 编号

## 引言

2026 年 8 月，国内 Java 生态的核心组件 **Fastjson2** 经历了一场震动：多个团队（长亭科技、安天 CERT 等）披露了 Fastjson2 的严重 AutoType 反序列化漏洞，利用链 PoC 在互联网上公开。作为阿里巴巴开源、国内企业级后端/微服务网关/政企平台中部署基数极大的高性能 JSON 库，这一事件的波及面可以用"百万级暴露"来形容。

与 Fastjson 历史上多次 AutoType 漏洞不同，本次事件有两个关键新信号：

1. **SeeAlso 链的出现**：早期分析认为利用前提是构造 FNV-1a 哈希碰撞命中 AutoType 白名单；而 SeeAlso 链表明——**在存在多态反序列化场景的应用中，无需任何哈希碰撞即可绕过白名单**，直接让恶意类名抵达类加载器
2. **官方确认与修复节奏**：Fastjson2 维护方在 **GitHub issue #7702** 中逐条确认了漏洞存在，澄清 PR #7695 并未合并，随后**提前发布修复版本 2.0.63**（原计划 8 月 2 日，实际提前）

本文基于官方 issue、维护方回复、长亭披露与社区实验分析，完整拆解漏洞原理、两条利用路径、JDK 版本差异与防护方案。**注意：该漏洞暂无官方 CVE 编号**（Fastjson 1.x 对应 CVE-2026-16723 已有编号）。

## 漏洞速览

| 项目 | 详情 |
|------|------|
| 影响组件 | Fastjson2（阿里巴巴开源 Java JSON 库） |
| 影响版本 | **≤ 2.0.62**（含 2.0.62） |
| 修复版本 | **2.0.63**（官方提前发布）；fastjson 1.x 对应 1.2.84 |
| 漏洞类型 | 远程代码执行（RCE）/ 反序列化 AutoType 白名单绕过 |
| CVSS | 9.8（严重） |
| CVE 编号 | 暂无（Fastjson 1.x 关联 CVE-2026-16723） |
| 利用条件 | 存在多态反序列化场景（SeeAlso 链）；或可构造 FNV-1a 哈希碰撞（经典链） |
| PoC 状态 | **已公开**（含完整利用代码与一键复现脚本） |
| 在野利用 | 未发现大规模在野利用 |
| 修复方式 | 升级 2.0.63+ / 开启 SafeMode / 出向管控 / WAF 拦截 @type |

## 背景：AutoType 与 Fastjson 家族的"老对手"

Fastjson2 的 **AutoType** 机制允许在 JSON 中通过 `@type` 字段指定反序列化的目标类。为防御恶意类加载，Fastjson2 使用白名单（acceptHashCodes）限制可加载的类。

这条安全边界在过去几年被反复挑战：

```
Fastjson 1.x：多轮 AutoType 绕过漏洞（1.2.24 → 1.2.83 系列补丁）
   ↓
Fastjson2 设计目标：更严格的安全默认
   ↓
2026-08：SeeAlso 链 + FNV 碰撞双路径，白名单机制再次失守
```

## 漏洞根因：白名单校验的三个缺陷

维护方与社区分析共同确认，Fastjson2 ≤2.0.62 的 AutoType 校验存在三个核心缺陷：

### 缺陷一：FNV-1a 哈希碰撞绕过白名单

白名单校验**仅依赖 FNV-1a 64 位哈希值匹配，不验证实际类名文本**：

```java
// 缺陷示意：哈希命中即放行，无文本回验
if (Arrays.binarySearch(acceptHashCodes, hash) >= 0) {
    // 只验证了哈希，未验证完整类型名
    clazz = loadClass(typeName);
}
```

攻击者可以构造一个恶意类型名，使其 FNV-1a 哈希与白名单中的合法条目碰撞，从而通过校验。由于 FNV-1a 算法公开固定，**本地碰撞计算完全可行**——社区使用 5 位 unicode + z3 求解器可秒级碰撞。

### 缺陷二：URL 特殊字符未过滤

`TypeUtils.loadClass()` 与 `checkAutoType()` **未拒绝包含 `:` 和 `!` 的类型名**，允许 `jar:` 协议 URL 到达类加载器：

```java
// 缺陷示意：jar:http://...!/Evil 这类类型名未被拦截
// 修复版（2.0.63）增加：
if (typeName.indexOf(':') >= 0 || typeName.indexOf('!') >= 0) {
    throw new JSONException("autoType is not support. " + typeName);
}
```

### 缺陷三：SeeAlso 链——无需碰撞的强制开启

这是本次事件的核心。在**多态反序列化场景**下（目标类标注 `@JSONType(seeAlso=...)`，或 Jackson 风格的 `@JsonSubTypes/@JsonTypeInfo`、sealed types）：

```
外部 JSON
    ↓
JSON.parseObject(body, BaseType.class)
    ↓
ObjectReaderSeeAlso（构造时强制开启 SupportAutoType）
    ↓
checkAutoType(typeName, BaseType, features) → 直接进入"已开启"分支
    ↓
TypeUtils.loadClass(typeName)
    ↓
线程上下文类加载器（从远程拉取恶意类字节码）
    ↓
恶意类实例化 → 构造函数/setter 执行任意命令 → RCE
```

**关键点**：`ObjectReaderSeeAlso` 在构造时强制开启 SupportAutoType，使 AutoType 校验直接进入"已开启"分支。攻击者**无需构造任何哈希碰撞**，即可让恶意类名绕过白名单校验直达类加载器。

## 两条利用路径对比

| 维度 | FNV-1a 碰撞链（经典） | SeeAlso 链（新披露） |
|------|----------------------|---------------------|
| 触发前提 | 白名单哈希碰撞（可本地计算） | 业务接口使用带 `seeAlso` 的基类 |
| 是否需要碰撞 | **是**（FNV-1a 哈希碰撞） | **否**（强制开启 SupportAutoType） |
| 难点转移 | 哈希碰撞计算 | 远程类需继承业务基类 + 通过 `isAssignableFrom()` 检查 |
| 触发写法 | `JSON.parseObject(json, Object.class)` + SupportAutoType | `JSON.parseObject(body, BaseType.class)`（基类带 seeAlso） |
| JDK 8 | 可完整利用 | 可完整利用 |
| JDK 21 | 可部分利用（类名校验拦截） | 同左 |

### SeeAlso 链的实际限制

社区实验（CN-SEC 复核）表明，SeeAlso 公开链并非"任意 Fastjson2 接口都能直接套用"：

```
SeeAlso 链成功需要：
- 基类完整包名
- 基类是否配置 @JSONType(seeAlso=...)
- 接口是否按这个具体类型解析请求体
- 基类是否允许外部子类继承
- 生成类能否通过 isAssignableFrom() 检查
```

且远程 JAR 形式**明显依赖 Spring Boot 可执行 JAR 的类加载环境**（LaunchedURLClassLoader）。非 Spring、外置 WAR、Solon/Jersey/RESTEasy 等对照组均停在类查找阶段，远程 HTTP 请求计数为 0。

## JDK 版本差异：不是"不修也能躲"的理由

社区实验揭示了 JDK 版本的显著差异，但**任何版本都不是安全版本**：

- **JDK 8**：远程 JAR 下载 → 类定义 → 静态初始化 → RCE，全链路打通
- **JDK 21**：远程 JAR 能下载，但 HotSpot 校验 class 文件内部名称时，`jar:http://...!/Marker` 中的连续斜杠触发 `ClassFormatError: Illegal class name`，**一阶段类定义失败**

但 JDK 21 的攻击并未因此终结——攻击者利用 `/proc/self/fd/N` 文件描述符续接技术：

```
第二阶段：利用 JVM 仍持有的已删除缓存文件 FD
  - 一阶段下载并打开远程 JAR（类加载器异常后仍持有缓存 FD）
  - 二阶段从 FD 重新打开 JAR，使用不带 http:// 的内部名称
  - 避开一阶段的连续斜杠问题 → 类加载成功
```

**结论**：JDK 版本仅影响利用方式选择，不能阻止漏洞被利用。只要目标应用依赖 Spring、MyBatis、Commons 等常见框架，攻击者仍可通过 classpath 内的 gadget 实现 RCE。

## 官方确认与修复（issue #7702）

### 维护方的确认与澄清（关键时间线）

1. 长亭科技披露漏洞后，Fastjson2 维护方确认 **AutoType 类型解析路径确实存在安全问题**
2. **澄清**：社区热议的 **PR #7695 并未合并**，所有已发布版本均不含修复
3. 临时缓解：`-Dfastjson2.parser.safeMode=true`（兼容旧属性名 `-Dfastjson.parser.safeMode=true`）
4. 修复版本 **2.0.63 提前发布**（比原计划 8 月 2 日提前）

### 修复版本 2.0.63 的加固内容

| 加固项 | 说明 |
|--------|------|
| AutoType 类型名校验 | 含 `:`/`!` 等 URL 特殊字符的类型名在到达类加载器前即被拒绝 |
| 白名单文本回验 | 白名单 hash 命中后回验完整类名文本，哈希碰撞不再能绕过 |
| 危险基类黑名单 | `accept` 前缀不再覆盖 ClassLoader / DataSource / RowSet 等危险基类，仅完整类名条目视为显式放行 |
| 附带修复 | JSONB 声明长度、超长数字字面量触发的 OOM / DoS 问题 |

**配套版本**：fastjson2 Android（2.0.63.android5 / 2.0.63.android8）、fastjson 1.x（1.2.84，同款加固回移）。

## 修复与缓解方案

### P0：开启 SafeMode（立即可行）

```bash
# JVM 启动参数（推荐，早于 fastjson2 首次类加载）
-Dfastjson2.parser.safeMode=true

# 兼容旧属性名
-Dfastjson.parser.safeMode=true
```

SafeMode 下 `@type` 完全禁用——不报错，而是**退化为普通字段**，JSON 照常解析为 Map/JSONObject。验证是否生效：用一个 classpath 上真实存在的 POJO 做 `@type`，SafeMode 下应退化为 Map 而非该 POJO。

**注意**：使用 `AutoTypeFilter`（`JSONReader.autoTypeFilter` / `ContextAutoTypeBeforeHandler`）的用户，**SafeMode 单独不够**——filter 是开发者显式声明的可信白名单，在 SafeMode 检查之前生效。这类用户请直接升级 2.0.63。

### P1：WAF / 网关拦截

```
- 拦截请求体 / URL 参数中 key 包含 @type 字段的 JSON 载荷
- 覆盖 POST 请求体与 URL 拼接参数
- 兼容 URL 编码、Unicode 编码、"..." 点号变形等绕过方式
```

### P2：出向管控

SeeAlso 链完成 RCE 的必要环节是目标服务器向攻击者控制的地址发起 HTTP 请求拉取远程类字节码：

```
- 主机防火墙 / 安全组 / 出口网关收敛出向访问策略
- 仅放行必要域名与端口
- 重点监控：目标以 .class、.jar 结尾的出向连接
```

### P3：资产排查

```bash
# 排查 fastjson2 seeAlso 多态注解
grep -rn "seeAlso" --include="*.java" .

# 排查 Jackson 多态注解（fastjson2 默认兼容）
grep -rn "@JsonSubTypes\|@JsonTypeInfo" --include="*.java" .

# 排查 fastjson2 版本
mvn dependency:tree | grep fastjson
```

### 升级建议

```
- fastjson2 用户：立即升级 2.0.63+（Maven Central 已同步）
- fastjson 1.x 用户：升级 1.2.84（注意 1.x 关联 CVE-2026-16723）
- 已开启 SafeMode 的用户：升级后可保留（纵深防御），也可评估后关闭
- 兼容包用户：fastjson2-extension-spring6 的 2.0.63 曾漏发，若使用请显式锁定
  com.alibaba.fastjson2:fastjson2:2.0.63，避免传递依赖把 core 降回旧版
```

## 结语

Fastjson2 事件再次印证了反序列化安全的一条铁律：**任何依赖"白名单哈希 + 类名黑名单"的防护，在类型系统层面都存在结构性缺口。** SeeAlso 链的意义在于——它把过去需要高超哈希碰撞技巧的攻击，降维成了"业务代码里恰好多态用了 seeAlso 就能打"的低门槛利用。

对中国 Java 生态而言，这不是第一次也不会是最后一次 Fastjson 安全事件。**SafeMode 应当成为默认基线配置，AutoType 应视为遗留功能逐步迁移**——这是本次事件最重要的长期教训。

## 参考来源

- Fastjson2 官方 GitHub issue：[#7702](https://github.com/alibaba/fastjson2/issues/7702)（维护方逐条确认与修复公告）
- Fastjson2 Release：[2.0.63](https://github.com/alibaba/fastjson2/releases/tag/2.0.63)
- fastjson 1.x 安全公告：[Remote Code Execution in fastjson 1.2.68–1.2.83](https://github.com/alibaba/fastjson2/wiki/Security-Advisory:-Remote-Code-Execution-in-fastjson-1.2.68%E2%80%931.2.83)
- 安天 CERT：[Fastjson2.x SeeAlso 链 RCE 漏洞 PoC 验证](https://www.gm7.org/archives/135773)
- CN-SEC 复核实验：[Fastjson2 AutoType 安全问题确认](http://cn-sec.com/archives/5371829.html)