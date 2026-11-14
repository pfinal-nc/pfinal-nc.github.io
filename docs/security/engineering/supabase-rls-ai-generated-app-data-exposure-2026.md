---
title: Supabase RLS 实战：AI 生成应用为何默认裸奔，20 万条数据泄露复盘
date: 2026-11-15 07:30:00
author: PFinal南丞
tags:
  - 安全
  - 数据库
  - supabase
  - rls
description: 安全团队扫描 15.9 万个 AI 生成项目，发现数千个站点的 Supabase 数据库与存储桶对匿名访问完全开放，泄露护照信息与 20 万条私聊。本文从 anon key 设计讲起，给出三行 curl 的裸奔自检、正确的 RLS 策略写法，以及可接进 CI 的自动探测脚本。
keywords:
  - Supabase RLS
  - 行级安全
  - AI 生成应用
  - 数据泄露
  - PostgREST
  - anon key
  - 数据库越权
  - 存储桶 ACL
  - 安全基线
  - vibe coding 安全
---

> TL;DR：德国安全团队 Crissy Field 扫描了 **159,041 个**用 AI 应用生成器创建的项目，发现其中数千个站点的数据库和存储桶对匿名访问完全开放——**1,000+ 条含护照号、有效期、国籍的身份记录，20 万+ 条私聊消息，全部可被任何人从浏览器直接读走**。没有人入侵，只是门没锁。根因是 Supabase 的两件事叠加：anon key 天生公开，而 AI 生成器默认不写 RLS 策略。

## 一、事件还原：不是被黑，是门没锁

这次事件最值得警惕的地方，是攻击成本几乎为零。研究者没有利用 0day、没有绕过认证，只是拿着每个前端页面里都能看到的 anon key，去请求默认打开的 REST 接口。

| 维度 | 公开信息 | 说明 |
|---|---|---|
| 扫描规模 | 159,041 个项目 | 覆盖用该平台生成的站点 |
| 受影响站点 | 约 7,000+ 个可直接读到个人数据 | 另有报道给出 24,664 个应用的更高估计，两个口径的判定阈值不同 |
| 身份数据 | 1,000+ 条含护照号、签发有效期、国籍 | 上传的身份扫描件存放在公共可读的存储桶里 |
| 通信数据 | 200,000+ 条私聊消息 | 来自一个德国生活方式论坛的直接集成 |
| 其他 | 支付信息、用户档案 | 部分站点的订单/资料表可匿名全表读取 |
| 成因 | 数据库未启用行级安全（RLS）、存储桶缺 ACL | 属于配置缺陷，不是代码漏洞 |

一句判断：**这类事故的根因不在"AI 写得不好"，而在"默认配置对公网友好、对隐私不友好"**。生成器为了让你"三分钟跑通"，把最难的一步——授权模型——留空了。

## 二、为什么 Supabase 项目天生容易裸奔

要理解这件事为什么大面积发生，得先接受三个设计事实。

**第一，anon key 本来就是公开的。** Supabase 的 JS 客户端要直连数据库，anon key 必然被打进前端产物，任何人打开 DevTools 都能拿到。这不是泄漏，这是它的工作方式。所以"用 anon key 能访问到什么"完全取决于数据库策略，而不是取决于 key 的保密程度。

**第二，PostgREST 把表直接映射成 HTTP 端点。** `https://<project>.supabase.co/rest/v1/<table>?select=*` 就是一条查询。表建好、权限给到 `anon` 角色，这个端点立刻可用；反之，只要 RLS 没开，`anon` 角色对这张表就是全表可读写。

**第三，新建表的默认状态是"RLS 关闭"。** 在 Postgres 里，RLS 需要显式 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`。Supabase 的表编辑器会提示你开启，但脚本建表（尤其 AI 生成的 migration）很容易漏。而一旦开启了 RLS 却没写任何 policy，效果是"全拒"——这反而安全；最危险的是中间态：**RLS 没开，或者开了但 policy 写成 `USING (true)`**。

| 配置状态 | anon 角色能做什么 | 风险 |
|---|---|---|
| 未启用 RLS | 全表读写（含 `DELETE`） | 极高，本次事件的主因 |
| 启用 RLS，无 policy | 全部拒绝 | 安全，但业务会 403 |
| 启用 RLS，`USING (true)` | 全表可读 | 高，等于没开 |
| 启用 RLS，按 `auth.uid()` 过滤 | 只能读自己的行 | 正确 |
| `service_role` key 打进前端 | 绕过 RLS 全权限 | 灾难级，比前者更严重 |

这里还有一个常被误解的点值得说清：**anon key 本身是一枚签名过的 JWT**，payload 里写着 `role: anon`，而 PostgREST 正是拿这个 claim 去切 Postgres 角色。你没法把它改成 `authenticated` 来提权——签名校验会直接拒绝。所以风险从来不是"伪造身份"，而是"**这个角色本来就拥有过大的表级权限**"。换句话说，安全边界不在 key 的保密，而在 `anon` 这个数据库角色被授予了什么，以及 RLS 是否把它限制在"只能看到该看的那几行"。理解这一点，才不会把精力花在"如何隐藏 key"这种注定失败的方向上。

这也解释了为什么这次能一次扫出几千个站点：同一代平台生成的站点，域名模式、接口路径、默认表名高度一致，一个扫描器就能批量适配。**默认配置的风险从来不只属于某一个用户，而是属于整个平台生态。**

## 三、三行 curl：先确认你是不是那个"门没锁"的

不用装任何工具，拿你前端产物里的 anon key，直接打自己的项目。判定逻辑很简单：**任何你预期"只有登录用户能看"的表，如果匿名请求返回了数据行，就是裸奔**。

```bash
# 1. 列出所有暴露的表（PostgREST 的 OpenAPI 根路径）
curl -s "https://<project-ref>.supabase.co/rest/v1/" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  | jq -r '.definitions | keys[]'

# 2. 逐表试探：返回 200 且有数据行 = 匿名可读
curl -s -o /tmp/out.json -w "%{http_code}\n" \
  "https://<project-ref>.supabase.co/rest/v1/orders?select=*&limit=1" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"

# 3. 存储桶：public bucket 可以直接拼对象 URL
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://<project-ref>.supabase.co/storage/v1/object/public/ids/passport-001.jpg"
```

三条命令分别对应三种泄漏面：**表结构暴露、行数据暴露、文件对象暴露**。第三条特别容易被忽略——`storage` 里 bucket 一旦设为 public，文件路径就是可枚举的，护照扫描件就是这么流出去的。

## 四、正确的写法：RLS 策略怎么落地

修复的核心只有一句话：**每张表都开 RLS，并且每条 policy 都基于 `auth.uid()` 做行级过滤**。下面是一个最小可用的模板。

```sql
-- 1. 所有面向用户的表，先开启 RLS
alter table public.orders enable row level security;
alter table public.profiles enable row level security;
alter table public.messages enable row level security;

-- 2. 读：只能读自己的行
create policy "own rows read"
  on public.orders for select
  to authenticated
  using (user_id = (select auth.uid()));

-- 3. 写：插入时必须带上自己的 uid（with check 管住写入）
create policy "own rows insert"
  on public.orders for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- 4. 改/删：using 管"能不能碰这行"，with check 管"改完还是不是自己的"
create policy "own rows update"
  on public.orders for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 5. 明确拒绝匿名角色（默认没有 policy 就已经拒绝，这里是显式兜底）
revoke all on public.orders from anon;
```

四个细节决定策略是否真的有效：

1. **要写 `to authenticated`**。不写角色限定，policy 会对 `anon` 也生效——而 `anon` 的 `auth.uid()` 是 `null`，`user_id = null` 恒为假，看起来"安全"，但换成别的写法（比如 `USING (true)`）就直接失守。
2. **`using` 和 `with check` 是两个方向**。只写 `using` 能防住读，但防不住 `INSERT` 塞进一条 `user_id` 是别人的记录——这是最常被漏掉的一环。
3. **`auth.uid()` 建议包一层子查询** `(select auth.uid())`，让 Postgres 把它当常量而不是逐行求值，大表上能省一个数量级的开销。
4. **`service_role` key 绝不能出现在前端**。它绕过所有 RLS，一旦泄漏等于数据库管理员权限。需要服务端特权操作就放到 Edge Function 里，用环境变量注入。

存储侧同理，public bucket 只放"本来就该公开"的资源（头像、商品图），身份证明、发票、合同一律私有 + 签名 URL：

```sql
-- 私有桶 + 按用户目录隔离的对象策略
insert into storage.buckets (id, name, public) values ('ids', 'ids', false);

create policy "own files read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'ids' and owner_id = (select auth.uid())::text);
```

## 五、把它变成 CI 门禁：一条脚本扫全部表

上面三步靠人工检查只能覆盖一次，工程上应该做成可重复的断言。下面这个脚本只依赖标准库，遍历 OpenAPI 里的所有表，用 anon key 逐个试探，把"匿名能读到行"的表列出来。

```python
import json, os, urllib.request, urllib.error

REF, KEY = os.environ["SB_REF"], os.environ["SB_ANON_KEY"]
BASE = f"https://{REF}.supabase.co/rest/v1"

def get(path, key):
    req = urllib.request.Request(
        f"{BASE}/{path}",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, b""

status, body = get("", KEY)
tables = list(json.loads(body).get("definitions", {}).keys())

leaks = []
for t in tables:
    code, data = get(f"{t}?select=*&limit=1", KEY)
    rows = json.loads(data) if code == 200 and data else []
    if code == 200 and rows:
        leaks.append(t)

print("匿名可读表:", leaks)
raise SystemExit(1 if leaks else 0)
```

接进 CI 就是一条 `python scripts/rls_audit.py`，返回码非 0 直接阻断发布。这个脚本同时解决了一个常见争论：**"我开了 RLS 吗"**——不用看控制台，跑一遍就知道。它也有局限：policy 写成 `USING (true)` 时脚本只能发现"可读"，判断不了"是否被过度授权"，所以策略审查还得靠 code review。

### 5.1 再加一道 SQL 断言：查策略覆盖率

接口探测只能发现"现在能读"，查不出"哪些表压根没开 RLS"。这两条 SQL 直接问系统目录，比翻控制台可靠：

```sql
-- A. public schema 下没启用 RLS 的表（每一张都是潜在裸奔点）
select c.relname
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false;

-- B. 开了 RLS 但一条 policy 都没有的表（等于全拒，业务会莫名 403）
select t.tablename
from pg_tables t
where t.schemaname = 'public' and t.rowsecurity
  and not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = t.tablename
  );
```

把这两条查询的结果当成发布门禁：A 为空、B 为空，才允许上线。它们和 5 节的接口探测是互补的——**SQL 查配置，脚本验行为**，一个看"有没有设防"，一个看"设防是否真的生效"。很多事故的教训恰恰是两边只做了其中一边。

## 六、生产落地清单与踩坑

| 阶段 | 动作 | 验收标准 |
|---|---|---|
| 上线前 | 每张表 `ENABLE ROW LEVEL SECURITY` | `select relname from pg_class where relrowsecurity = false` 为空 |
| 上线前 | 每条 policy 限定角色与 `auth.uid()` | 匿名请求业务表返回 401 / 空结果 |
| 上线前 | 存储桶 public 标志逐个确认 | 仅公开资源为 public |
| 上线前 | 前端产物 grep `service_role` | 0 命中 |
| 上线后 | RLS 审计脚本进 CI | 每次发布自动跑 |
| 持续 | 新表/新 migration 纳入同一套策略模板 | 建表 checklist 有 RLS 项 |

四个真实会踩的坑：

1. **关联表泄漏**。`orders` 锁住了，但 `order_items` 没锁，攻击者从明细反推订单内容。**策略要按"数据图"而不是按"表"来审**。
2. **视图绕过**。视图默认以定义者权限运行，`anon` 查视图可能拿到基表数据。要么给视图加 `security_invoker = true`，要么不放给 anon。
3. **Edge Function 里的越权**。函数内部用 `service_role` 连接时，用户身份校验必须在函数入口自己做，否则前端传个 `user_id` 就能读别人的数据。
4. **默认权限与列级暴露**。`profiles` 表里混放了手机号、身份证号这类高敏列，就算 RLS 正确，只要该用户能看到自己的行，就能看到自己的全部列——敏感列建议拆表或用列权限控制。

如果已经泄漏了，顺序是：先轮换 anon key（注意 key 会随前端产物重建）、关掉 public bucket、补 RLS 策略，然后按日志评估影响面并在必要时履行告知义务。**先关门，再清点**——顺序反了，等于一边调查一边继续泄漏。

## 七、结论

这起事件给 AI 生成应用提了个醒：**"能跑"和"能公开"之间隔着一整套授权模型**。

- 对个人开发者：三行 curl 就能知道自己是不是下一个案例，成本比任何安全工具都低；
- 对团队：把 RLS 审计脚本接进 CI，比每月做一次手工检查靠谱；
- 对平台方：默认关闭 RLS 是"体验优先"的必然结果，但默认配置应该记住一件事——**用户不会替你想到授权，你必须在第一次建表时就替他想到**。

同一类问题在数据库层还有更经典的版本，可以对照 [PostgreSQL 安全最佳实践](/dev/system/database/PostgreSQL-Security-Best-Practices-2025) 一起看；供应链侧的投毒路径见 [EtherHiding 与 Go Module 劫持](/security/offensive/blockchain-c2-etherhiding-supply-chain-go-modules-2026)；如果你在用 AI 生成应用做前置判断（比如自动判定数据是否敏感），昨天那篇 [Gemini Decisions API 实战](/ai/gemini-decisions-api-rag-routing-agent-guardrails-2026) 里正好有一节讲护栏；更多安全工程文章在 [安全工程专栏](/security/engineering/) 汇总。

## 参考资料

- [Apps built on Lovable AI expose passport details and 200,000 chat messages](https://cybernews.com/security/lovable-ai-apps-exposed-sensitive-data/) — Cybernews，2026-11-04，含 159,041 项目扫描口径
- [Lovable Apps Data Exposure: What's Fixed and What Isn't](https://www.privacyaffairs.com/lovable-apps-data-exposure/) — Privacy Affairs，2026-11-14
- [Lovable Leak Exposes Passports and 200K User Messages](https://techbytes.app/posts/lovable-backend-leak-exposes-passports-and-user-messages/) — Tech Bytes，2026-11-15
- [Supabase Docs: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS 与 policy 的官方定义
- [PostgREST: Tables and Views](https://postgrest.org/en/stable/references/api/tables_views.html) — 表到 HTTP 端点的映射规则
- [Supabase Docs: Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) — bucket 与对象策略
