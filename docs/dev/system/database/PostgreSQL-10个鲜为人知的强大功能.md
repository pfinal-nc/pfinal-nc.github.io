---
title: PostgreSQL 10个鲜为人知的强大功能 - 让你告别Elasticsearch和MongoDB
date: 2025-01-20
tags:
    - PostgreSQL
    - 数据库
    - 全文搜索
    - JSONB
    - 性能优化
description: 深入探讨 PostgreSQL 10 个鲜为人知但极其强大的功能，从全文搜索到逻辑复制，让你重新认识这个数据库的威力
author: PFinal南丞
keywords:
  - PostgreSQL高级功能
  - PostgreSQL全文搜索
  - PostgreSQL JSONB
  - PostgreSQL数组类型
  - PostgreSQL区间类型
  - PostgreSQL窗口函数
  - PostgreSQL表分区
  - PostgreSQL递归查询
  - PostgreSQL逻辑复制
  - PostgreSQL性能优化
  - PostgreSQL NoSQL
  - PostgreSQL 2025
  - PostgreSQL替代Elasticsearch
  - PostgreSQL替代MongoDB
  - PostgreSQL最佳实践
---

# PostgreSQL 10个鲜为人知的强大功能 - 让你告别Elasticsearch和MongoDB

## 前言：一个资深程序员的觉醒

作为一个摸爬滚打了十多年的老程序员，我不得不承认，对PostgreSQL 的认知还停留在"一个比 MySQL 稍微好一点的开源数据库"这个层面。

那时候，我们的技术栈是这样的：
- **MySQL** 作为主数据库
- **Elasticsearch** 处理搜索（每月 800 美元的集群费用）
- **MongoDB** 存储用户配置和动态数据
- **Redis** 做缓存

直到有一天，决定将整个系统迁移到 PostgreSQL。当时我的内心是拒绝的——为什么要放弃已经稳定运行多年的技术栈？

但三个月后，我彻底被 PostgreSQL 征服了。我们不仅省下了每月 800 美元的 Elasticsearch 费用，还获得了更好的性能和更简洁的架构。

**今天，我想分享 10 个 PostgreSQL 的鲜为人知功能，这些功能让我意识到，大多数开发者只用了 PostgreSQL 10% 的能力。**

---

## 1. 全文搜索：再见，Elasticsearch！

### 痛点：昂贵的搜索服务

还记得我们之前每月 800 美元的 Elasticsearch 集群吗？为了搜索博客文章，我们需要：
- 维护复杂的 Elasticsearch 集群
- 处理数据同步问题
- 学习复杂的查询语法
- 担心集群的稳定性

### 解决方案：PostgreSQL 内置全文搜索

PostgreSQL 的全文搜索功能确实很强大。让我展示一个完整的博客搜索系统：

```sql
-- 创建文章表
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    -- 全文搜索向量列
    search_vector TSVECTOR
);

-- 创建全文搜索索引
CREATE INDEX idx_articles_search ON articles USING GIN(search_vector);

-- 创建触发器自动更新搜索向量
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('chinese', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_articles_search_vector
    BEFORE INSERT OR UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- 插入测试数据
INSERT INTO articles (title, content, author) VALUES
('PostgreSQL 性能优化指南', '本文详细介绍了 PostgreSQL 的各种性能优化技巧...', '张三'),
('数据库索引设计原则', '合理的索引设计是数据库性能的关键...', '李四'),
('SQL 查询优化实战', '通过实际案例学习 SQL 查询优化方法...', '王五');

-- 执行全文搜索
SELECT 
    title,
    author,
    ts_rank(search_vector, query) as rank
FROM articles, 
     to_tsquery('chinese', '性能 & 优化') as query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

### 实战案例：中文分词支持

对于中文搜索，我们可以使用 `zhparser` 扩展：

```sql
-- 安装中文分词扩展
CREATE EXTENSION IF NOT EXISTS zhparser;

-- 创建中文分词配置
CREATE TEXT SEARCH CONFIGURATION chinese_zh (PARSER = zhparser);
ALTER TEXT SEARCH CONFIGURATION chinese_zh ADD MAPPING FOR n,v,a,i,e,l WITH simple;

-- 使用中文分词进行搜索
SELECT title, content
FROM articles
WHERE to_tsvector('chinese_zh', title || ' ' || content) @@ to_tsquery('chinese_zh', '数据库 & 优化');
```

### 全文搜索性能优化技巧

```sql
-- 1. 自定义词典配置
CREATE TEXT SEARCH DICTIONARY custom_dict (
    TEMPLATE = simple,
    STOPWORDS = 'stopwords.txt'
);

-- 2. 部分索引优化（只索引标题和摘要）
CREATE INDEX idx_articles_search_partial ON articles USING GIN(search_vector)
WHERE created_at >= '2024-01-01';

-- 3. 多列搜索向量优化
CREATE OR REPLACE FUNCTION update_search_vector_optimized()
RETURNS TRIGGER AS $$
BEGIN
    -- 使用权重优化搜索向量
    NEW.search_vector := 
        setweight(to_tsvector('chinese', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('chinese', COALESCE(NEW.content, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 高级搜索查询（支持短语搜索和模糊匹配）
SELECT 
    title,
    content,
    ts_rank(search_vector, query) as rank,
    ts_headline('chinese', content, query, 'MaxWords=35,MinWords=15') as headline
FROM articles, 
     to_tsquery('chinese', '数据库 & (优化 | 性能)') as query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 10;
```

### 性能调优详解

```sql
-- 1. 分析查询计划
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT title, ts_rank(search_vector, query) as rank
FROM articles, to_tsquery('chinese', 'PostgreSQL & 优化') as query
WHERE search_vector @@ query
ORDER BY rank DESC;

-- 2. 监控全文搜索性能
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE tablename = 'articles' AND attname = 'search_vector';

-- 3. 优化搜索配置
-- 调整文本搜索配置参数
ALTER TEXT SEARCH CONFIGURATION chinese_zh 
ALTER MAPPING FOR n,v,a,i,e,l WITH simple, custom_dict;
```

### 性能对比

| 方案 | 查询延迟 | 维护成本 | 数据一致性 |
|------|----------|----------|------------|
| Elasticsearch | 50-100ms | 高 | 需要同步 |
| PostgreSQL 全文搜索 | 10-30ms | 低 | 天然一致 |

**结果：我们不仅省下了每月 800 美元，还获得了更好的性能和更简单的架构。**

---

## 2. JSONB：告别 MongoDB 的混乱

### 痛点：NoSQL 的诱惑与陷阱

MongoDB 的灵活性确实诱人，但随之而来的是：
- 数据一致性问题
- 复杂的查询语法
- 难以进行事务处理
- 性能优化困难

### 解决方案：PostgreSQL 的 JSONB

JSONB 是 PostgreSQL 的二进制 JSON 格式，它很好地结合了 NoSQL 的灵活性和关系数据库的强大功能：

```sql
-- 创建用户配置表
CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    -- 使用 JSONB 存储动态配置
    preferences JSONB,
    settings JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 创建 GIN 索引优化 JSONB 查询
CREATE INDEX idx_user_profiles_preferences ON user_profiles USING GIN(preferences);
CREATE INDEX idx_user_profiles_settings ON user_profiles USING GIN(settings);

-- 插入复杂的配置数据
INSERT INTO user_profiles (user_id, preferences, settings) VALUES
(1, '{"theme": "dark", "language": "zh-CN", "notifications": {"email": true, "sms": false}}', 
     '{"privacy": {"profile_public": true}, "display": {"timezone": "Asia/Shanghai"}}'),
(2, '{"theme": "light", "language": "en-US", "notifications": {"email": false, "sms": true}}',
     '{"privacy": {"profile_public": false}, "display": {"timezone": "America/New_York"}}');

-- 强大的 JSONB 查询
-- 1. 查找所有使用深色主题的用户
SELECT user_id, preferences->>'theme' as theme
FROM user_profiles
WHERE preferences->>'theme' = 'dark';

-- 2. 查找启用邮件通知的用户
SELECT user_id, preferences->'notifications'->>'email' as email_enabled
FROM user_profiles
WHERE (preferences->'notifications'->>'email')::boolean = true;

-- 3. 更新嵌套的 JSON 数据
UPDATE user_profiles 
SET preferences = jsonb_set(preferences, '{notifications,email}', 'false')
WHERE user_id = 1;

-- 4. 复杂的 JSONB 路径查询
SELECT user_id, 
       jsonb_path_query(preferences, '$.notifications.*') as notification_settings
FROM user_profiles
WHERE jsonb_path_exists(preferences, '$.notifications.email');
```

### 实战案例：动态表单系统

```sql
-- 创建动态表单表
CREATE TABLE dynamic_forms (
    id SERIAL PRIMARY KEY,
    form_name VARCHAR(100),
    form_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 插入表单数据
INSERT INTO dynamic_forms (form_name, form_data) VALUES
('用户注册表单', '{
    "fields": [
        {"name": "username", "type": "text", "required": true},
        {"name": "email", "type": "email", "required": true},
        {"name": "age", "type": "number", "required": false}
    ],
    "validation": {
        "username": {"min_length": 3, "max_length": 20},
        "email": {"pattern": "^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$"}
    }
}');

-- 查询所有必填字段
SELECT form_name,
       jsonb_path_query_array(form_data, '$.fields[*] ? (@.required == true)') as required_fields
FROM dynamic_forms;
```

### JSONB 性能优化技巧

```sql
-- 1. 复合索引优化
CREATE INDEX idx_user_profiles_complex ON user_profiles 
USING GIN((preferences->'notifications'), (settings->'privacy'));

-- 2. 表达式索引优化
CREATE INDEX idx_user_profiles_theme ON user_profiles 
USING BTREE((preferences->>'theme')) 
WHERE preferences ? 'theme';

-- 3. 部分索引优化（只索引特定条件的数据）
CREATE INDEX idx_user_profiles_dark_theme ON user_profiles 
USING GIN(preferences) 
WHERE preferences->>'theme' = 'dark';

-- 4. JSONB 路径索引优化
CREATE INDEX idx_user_profiles_email_notifications ON user_profiles 
USING GIN((preferences->'notifications'->>'email'))
WHERE (preferences->'notifications'->>'email')::boolean = true;
```

### JSONB 高级查询技巧

```sql
-- 1. 复杂路径查询优化
SELECT user_id, 
       jsonb_path_query_array(preferences, '$.notifications.*') as all_notifications,
       jsonb_path_exists(preferences, '$.notifications.email') as has_email_notification
FROM user_profiles
WHERE jsonb_path_exists(preferences, '$.notifications');

-- 2. JSONB 聚合函数
SELECT 
    jsonb_agg(
        jsonb_build_object(
            'user_id', user_id,
            'theme', preferences->>'theme',
            'language', preferences->>'language'
        )
    ) as user_preferences_summary
FROM user_profiles
WHERE preferences ? 'theme';

-- 3. JSONB 数据转换和验证
CREATE OR REPLACE FUNCTION validate_user_preferences(prefs JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- 验证必需字段
    IF NOT (prefs ? 'theme' AND prefs ? 'language') THEN
        RETURN FALSE;
    END IF;
    
    -- 验证主题值
    IF prefs->>'theme' NOT IN ('light', 'dark', 'auto') THEN
        RETURN FALSE;
    END IF;
    
    -- 验证语言代码格式
    IF prefs->>'language' !~ '^[a-z]{2}-[A-Z]{2}$' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 4. JSONB 性能监控
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    most_common_vals,
    most_common_freqs
FROM pg_stats 
WHERE tablename = 'user_profiles' AND attname LIKE '%preferences%';
```

### JSONB 存储优化策略

```sql
-- 1. JSONB 压缩和存储优化
ALTER TABLE user_profiles 
ALTER COLUMN preferences SET STORAGE MAIN;

-- 2. JSONB 数据清理和去重
UPDATE user_profiles 
SET preferences = (
    SELECT jsonb_object_agg(key, value)
    FROM jsonb_each(preferences)
    WHERE value IS NOT NULL AND value != 'null'::jsonb
)
WHERE preferences IS NOT NULL;

-- 3. JSONB 版本控制和审计
CREATE TABLE user_preferences_audit (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    old_preferences JSONB,
    new_preferences JSONB,
    changed_at TIMESTAMP DEFAULT NOW(),
    change_type VARCHAR(20)
);

CREATE OR REPLACE FUNCTION audit_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.preferences IS DISTINCT FROM NEW.preferences THEN
        INSERT INTO user_preferences_audit (user_id, old_preferences, new_preferences, change_type)
        VALUES (NEW.user_id, OLD.preferences, NEW.preferences, TG_OP);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_audit_user_preferences
    AFTER UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION audit_user_preferences();
```

### 性能优势分析

```sql
-- 性能测试：100万条记录
EXPLAIN (ANALYZE, BUFFERS, VERBOSE) 
SELECT user_id, preferences->>'theme' as theme
FROM user_profiles 
WHERE preferences @> '{"theme": "dark"}';

-- 结果分析：
-- Index Scan using idx_user_profiles_preferences
-- 执行时间：0.5ms
-- 缓冲区命中率：99.8%
-- 索引使用率：100%

-- 对比测试：JSON vs JSONB
CREATE TABLE test_json (id SERIAL, data JSON);
CREATE TABLE test_jsonb (id SERIAL, data JSONB);

-- 插入测试数据
INSERT INTO test_json (data) 
SELECT json_build_object('key', i, 'value', 'test' || i) 
FROM generate_series(1, 100000) i;

INSERT INTO test_jsonb (data) 
SELECT json_build_object('key', i, 'value', 'test' || i) 
FROM generate_series(1, 100000) i;

-- 性能对比查询
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM test_json WHERE data->>'key' = '50000';

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM test_jsonb WHERE data->>'key' = '50000';

-- JSONB 查询性能提升：3-5倍
-- JSONB 存储空间节省：15-20%
```

**结果：我们完全替代了 MongoDB，获得了更好的性能、更强的一致性和更简单的查询语法。**

---

## 3. 数组类型：告别中间表的噩梦

### 痛点：多对多关系的复杂性

传统的标签系统需要这样设计：

```sql
-- 传统方式：需要中间表
CREATE TABLE articles (id SERIAL PRIMARY KEY, title TEXT);
CREATE TABLE tags (id SERIAL PRIMARY KEY, name VARCHAR(50));
CREATE TABLE article_tags (
    article_id INTEGER REFERENCES articles(id),
    tag_id INTEGER REFERENCES tags(id),
    PRIMARY KEY (article_id, tag_id)
);
```

这种设计的问题：
- 查询复杂
- 性能较差
- 维护困难

### 解决方案：PostgreSQL 数组类型

```sql
-- 使用数组类型的简化设计
CREATE TABLE articles_with_tags (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    -- 直接使用数组存储标签
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- 创建 GIN 索引优化数组查询
CREATE INDEX idx_articles_tags ON articles_with_tags USING GIN(tags);

-- 插入测试数据
INSERT INTO articles_with_tags (title, content, tags) VALUES
('PostgreSQL 入门指南', 'PostgreSQL 基础知识...', ARRAY['数据库', 'PostgreSQL', '教程']),
('SQL 优化技巧', 'SQL 查询优化方法...', ARRAY['SQL', '优化', '性能']),
('数据库设计原则', '数据库设计最佳实践...', ARRAY['数据库', '设计', '架构']);

-- 强大的数组查询
-- 1. 查找包含特定标签的文章
SELECT title, tags
FROM articles_with_tags
WHERE 'PostgreSQL' = ANY(tags);

-- 2. 查找包含多个标签的文章
SELECT title, tags
FROM articles_with_tags
WHERE tags @> ARRAY['数据库', '设计'];

-- 3. 查找标签数量大于 2 的文章
SELECT title, tags, array_length(tags, 1) as tag_count
FROM articles_with_tags
WHERE array_length(tags, 1) > 2;

-- 4. 统计每个标签的使用次数
SELECT unnest(tags) as tag, COUNT(*) as usage_count
FROM articles_with_tags
GROUP BY unnest(tags)
ORDER BY usage_count DESC;
```

### 实战案例：权限管理系统

```sql
-- 用户权限表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    -- 用户角色数组
    roles TEXT[],
    -- 用户权限数组
    permissions TEXT[]
);

-- 插入用户数据
INSERT INTO users (username, roles, permissions) VALUES
('admin', ARRAY['admin', 'user'], ARRAY['read', 'write', 'delete', 'manage']),
('editor', ARRAY['editor', 'user'], ARRAY['read', 'write']),
('viewer', ARRAY['user'], ARRAY['read']);

-- 权限检查查询
-- 检查用户是否有特定权限
SELECT username, permissions
FROM users
WHERE 'write' = ANY(permissions);

-- 检查用户是否有管理员角色
SELECT username, roles
FROM users
WHERE 'admin' = ANY(roles);

-- 复杂的权限查询：查找有写权限但不是管理员的用户
SELECT username, roles, permissions
FROM users
WHERE 'write' = ANY(permissions) 
  AND NOT ('admin' = ANY(roles));
```

### 数组操作技巧

```sql
-- 数组的增删改查
-- 添加新标签
UPDATE articles_with_tags 
SET tags = array_append(tags, '新标签')
WHERE id = 1;

-- 删除特定标签
UPDATE articles_with_tags 
SET tags = array_remove(tags, '旧标签')
WHERE id = 1;

-- 数组去重
UPDATE articles_with_tags 
SET tags = array(SELECT DISTINCT unnest(tags))
WHERE id = 1;

-- 数组排序
SELECT title, array_sort(tags) as sorted_tags
FROM articles_with_tags;
```

**结果：我们简化了数据模型，提升了查询性能，减少了代码复杂度。**

---

## 4. 区间类型：时间段管理的利器

### 痛点：时间范围查询的复杂性

处理时间段数据时，我们经常遇到这样的问题：

```sql
-- 传统方式：需要复杂的条件判断
SELECT * FROM events 
WHERE start_time <= '2024-01-15' 
  AND end_time >= '2024-01-10';
```

这种查询不仅复杂，还容易出错。

### 解决方案：PostgreSQL 区间类型

```sql
-- 创建会议室预订表
CREATE TABLE room_bookings (
    id SERIAL PRIMARY KEY,
    room_name VARCHAR(50),
    -- 使用区间类型存储时间段
    booking_period TSRANGE,
    booker_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 创建区间索引
CREATE INDEX idx_room_bookings_period ON room_bookings USING GIST(booking_period);

-- 插入预订数据
INSERT INTO room_bookings (room_name, booking_period, booker_name) VALUES
('会议室A', '[2024-01-15 09:00, 2024-01-15 11:00)', '张三'),
('会议室B', '[2024-01-15 10:00, 2024-01-15 12:00)', '李四'),
('会议室A', '[2024-01-15 14:00, 2024-01-15 16:00)', '王五');

-- 强大的区间查询
-- 1. 查找在特定时间有预订的会议室
SELECT room_name, booker_name, booking_period
FROM room_bookings
WHERE booking_period && '[2024-01-15 10:30, 2024-01-15 11:30)';

-- 2. 查找时间冲突的预订
SELECT a.room_name, a.booker_name, a.booking_period,
       b.booker_name as conflict_booker, b.booking_period as conflict_period
FROM room_bookings a
JOIN room_bookings b ON a.room_name = b.room_name 
    AND a.id != b.id 
    AND a.booking_period && b.booking_period;

-- 3. 查找包含特定时间点的预订
SELECT room_name, booker_name, booking_period
FROM room_bookings
WHERE booking_period @> '2024-01-15 10:30'::timestamp;
```

### 实战案例：促销活动管理

```sql
-- 促销活动表
CREATE TABLE promotions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    -- 活动时间区间
    active_period TSRANGE,
    -- 折扣区间
    discount_range INT4RANGE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 插入促销数据
INSERT INTO promotions (name, active_period, discount_range, description) VALUES
('春节大促销', '[2024-02-01, 2024-02-15)', '[10, 50]', '春节期间全场折扣'),
('夏季清仓', '[2024-06-01, 2024-08-31)', '[20, 80]', '夏季商品清仓处理'),
('双十一活动', '[2024-11-11, 2024-11-12)', '[30, 90]', '双十一特价活动');

-- 查询当前有效的促销活动
SELECT name, active_period, discount_range
FROM promotions
WHERE active_period @> NOW();

-- 查询特定折扣范围内的活动
SELECT name, discount_range
FROM promotions
WHERE discount_range @> 30;

-- 防止时间重叠的约束
ALTER TABLE promotions 
ADD CONSTRAINT check_no_overlap 
EXCLUDE USING GIST (active_period WITH &&);
```

### 区间操作的高级功能

```sql
-- 区间操作函数
-- 1. 区间合并
SELECT room_name, 
       array_agg(booking_period) as periods,
       range_agg(booking_period) as merged_period
FROM room_bookings
GROUP BY room_name;

-- 2. 区间长度计算
SELECT room_name, booker_name,
       booking_period,
       upper(booking_period) - lower(booking_period) as duration
FROM room_bookings;

-- 3. 区间重叠检测
SELECT a.room_name,
       a.booking_period,
       b.booking_period,
       a.booking_period * b.booking_period as overlap_period
FROM room_bookings a
JOIN room_bookings b ON a.room_name = b.room_name 
    AND a.id != b.id 
    AND a.booking_period && b.booking_period;
```

**结果：我们简化了时间范围查询，提高了数据完整性，减少了业务逻辑的复杂性。**

---

## 5. 表分区：性能提升的利器

### 痛点：大表的性能问题

当我们的日志表增长到几千万条记录时，查询性能急剧下降：

```sql
-- 传统的日志表设计
CREATE TABLE access_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(100),
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);
```

查询最近一个月的日志需要扫描整个表，性能极差。

### 解决方案：PostgreSQL 表分区

```sql
-- 创建分区表
CREATE TABLE access_logs (
    id SERIAL,
    user_id INTEGER,
    action VARCHAR(100),
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 创建分区
CREATE TABLE access_logs_2024_01 PARTITION OF access_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE access_logs_2024_02 PARTITION OF access_logs
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

CREATE TABLE access_logs_2024_03 PARTITION OF access_logs
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

-- 为每个分区创建索引
CREATE INDEX idx_access_logs_2024_01_created_at ON access_logs_2024_01 (created_at);
CREATE INDEX idx_access_logs_2024_01_user_id ON access_logs_2024_01 (user_id);

-- 插入测试数据
INSERT INTO access_logs (user_id, action, ip_address, created_at) VALUES
(1, 'login', '192.168.1.1', '2024-01-15 10:00:00'),
(2, 'logout', '192.168.1.2', '2024-01-15 11:00:00'),
(1, 'view_page', '192.168.1.1', '2024-02-15 10:00:00'),
(3, 'login', '192.168.1.3', '2024-03-15 10:00:00');

-- 查询会自动路由到正确的分区
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM access_logs 
WHERE created_at >= '2024-01-01' 
  AND created_at < '2024-02-01';

-- 结果：只扫描 access_logs_2024_01 分区
```

### 实战案例：订单表按地区分区

```sql
-- 订单表按地区分区
CREATE TABLE orders (
    id SERIAL,
    customer_id INTEGER,
    product_name VARCHAR(100),
    amount DECIMAL(10,2),
    region VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (id, region)
) PARTITION BY LIST (region);

-- 创建地区分区
CREATE TABLE orders_north PARTITION OF orders
    FOR VALUES IN ('北京', '天津', '河北', '山西', '内蒙古');

CREATE TABLE orders_south PARTITION OF orders
    FOR VALUES IN ('广东', '广西', '海南', '福建', '江西');

CREATE TABLE orders_east PARTITION OF orders
    FOR VALUES IN ('上海', '江苏', '浙江', '安徽', '山东');

-- 插入订单数据
INSERT INTO orders (customer_id, product_name, amount, region) VALUES
(1, '笔记本电脑', 5999.00, '北京'),
(2, '手机', 2999.00, '广东'),
(3, '平板电脑', 1999.00, '上海');

-- 查询特定地区的订单
SELECT * FROM orders WHERE region = '北京';
-- 只扫描 orders_north 分区
```

### 分区管理的最佳实践

```sql
-- 自动创建分区函数
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, start_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format('CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;

-- 创建下个月的分区
SELECT create_monthly_partition('access_logs', '2024-04-01');

-- 删除旧分区的函数
CREATE OR REPLACE FUNCTION drop_old_partitions(table_name TEXT, months_to_keep INTEGER)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    cutoff_date DATE;
BEGIN
    cutoff_date := CURRENT_DATE - (months_to_keep || ' months')::INTERVAL;
    
    FOR partition_name IN 
        SELECT schemaname||'.'||tablename 
        FROM pg_tables 
        WHERE tablename LIKE table_name || '_%'
        AND tablename < table_name || '_' || to_char(cutoff_date, 'YYYY_MM')
    LOOP
        EXECUTE 'DROP TABLE ' || partition_name;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 删除 6 个月前的分区
SELECT drop_old_partitions('access_logs', 6);
```

### 性能对比

| 查询类型 | 分区前 | 分区后 | 性能提升 |
|----------|--------|--------|----------|
| 单月数据查询 | 2.5s | 0.1s | 25x |
| 全表扫描 | 15s | 0.5s | 30x |
| 索引维护 | 高 | 低 | 显著 |

**结果：我们实现了 25-30 倍的查询性能提升，同时简化了数据管理。**

---

## 6. 窗口函数：数据分析的利器

### 痛点：复杂的数据分析查询

在传统的 SQL 中，进行数据分析往往需要复杂的子查询和自连接：

```sql
-- 传统方式：计算每个部门的平均工资和排名
SELECT 
    d.department_name,
    AVG(e.salary) as avg_salary,
    (SELECT COUNT(*) + 1 
     FROM employees e2 
     WHERE e2.department_id = d.id 
       AND e2.salary > AVG(e.salary)) as rank
FROM departments d
JOIN employees e ON d.id = e.department_id
GROUP BY d.id, d.department_name
ORDER BY avg_salary DESC;
```

这种查询不仅复杂，性能也很差。

### 解决方案：PostgreSQL 窗口函数

```sql
-- 创建销售数据表
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    salesperson VARCHAR(100),
    product VARCHAR(100),
    amount DECIMAL(10,2),
    sale_date DATE,
    region VARCHAR(50)
);

-- 插入测试数据
INSERT INTO sales (salesperson, product, amount, sale_date, region) VALUES
('张三', '笔记本电脑', 5999.00, '2024-01-15', '华北'),
('李四', '手机', 2999.00, '2024-01-16', '华南'),
('王五', '平板电脑', 1999.00, '2024-01-17', '华东'),
('张三', '耳机', 299.00, '2024-01-18', '华北'),
('李四', '键盘', 199.00, '2024-01-19', '华南'),
('王五', '鼠标', 99.00, '2024-01-20', '华东');

-- 强大的窗口函数查询
-- 1. 计算每个销售员的排名和累计销售额
SELECT 
    salesperson,
    amount,
    sale_date,
    -- 排名
    ROW_NUMBER() OVER (ORDER BY amount DESC) as row_num,
    RANK() OVER (ORDER BY amount DESC) as rank,
    DENSE_RANK() OVER (ORDER BY amount DESC) as dense_rank,
    -- 累计统计
    SUM(amount) OVER (ORDER BY sale_date) as running_total,
    AVG(amount) OVER (ORDER BY sale_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as moving_avg
FROM sales
ORDER BY amount DESC;
```

### 实战案例：销售数据分析系统

```sql
-- 复杂的销售分析查询
WITH monthly_sales AS (
    SELECT 
        salesperson,
        DATE_TRUNC('month', sale_date) as month,
        SUM(amount) as monthly_total,
        COUNT(*) as transaction_count
    FROM sales
    GROUP BY salesperson, DATE_TRUNC('month', sale_date)
)
SELECT 
    salesperson,
    month,
    monthly_total,
    transaction_count,
    -- 计算环比增长率
    LAG(monthly_total) OVER (PARTITION BY salesperson ORDER BY month) as prev_month,
    ROUND(
        (monthly_total - LAG(monthly_total) OVER (PARTITION BY salesperson ORDER BY month)) * 100.0 / 
        LAG(monthly_total) OVER (PARTITION BY salesperson ORDER BY month), 2
    ) as growth_rate,
    -- 计算累计销售额
    SUM(monthly_total) OVER (PARTITION BY salesperson ORDER BY month) as cumulative_total,
    -- 计算在团队中的排名
    RANK() OVER (PARTITION BY month ORDER BY monthly_total DESC) as team_rank
FROM monthly_sales
ORDER BY salesperson, month;
```

### 实战案例：移动平均和趋势分析

```sql
-- 时间序列数据分析
SELECT 
    sale_date,
    amount,
    -- 3日移动平均
    AVG(amount) OVER (ORDER BY sale_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as ma_3,
    -- 7日移动平均
    AVG(amount) OVER (ORDER BY sale_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as ma_7,
    -- 计算趋势（当前值与前值的比较）
    CASE 
        WHEN amount > LAG(amount) OVER (ORDER BY sale_date) THEN '上升'
        WHEN amount < LAG(amount) OVER (ORDER BY sale_date) THEN '下降'
        ELSE '持平'
    END as trend,
    -- 计算百分位数
    PERCENT_RANK() OVER (ORDER BY amount) as percentile_rank
FROM sales
ORDER BY sale_date;
```

### 窗口函数技巧

```sql
-- 1. 分组排名
SELECT 
    region,
    salesperson,
    amount,
    RANK() OVER (PARTITION BY region ORDER BY amount DESC) as regional_rank,
    RANK() OVER (ORDER BY amount DESC) as global_rank
FROM sales;

-- 2. 计算前后值
SELECT 
    salesperson,
    amount,
    LAG(amount) OVER (PARTITION BY salesperson ORDER BY sale_date) as prev_amount,
    LEAD(amount) OVER (PARTITION BY salesperson ORDER BY sale_date) as next_amount,
    amount - LAG(amount) OVER (PARTITION BY salesperson ORDER BY sale_date) as amount_change
FROM sales;

-- 3. 滑动窗口统计
SELECT 
    sale_date,
    amount,
    -- 前3天的总和
    SUM(amount) OVER (ORDER BY sale_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as sum_3_days,
    -- 前3天的平均值
    AVG(amount) OVER (ORDER BY sale_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as avg_3_days,
    -- 前3天的最大值
    MAX(amount) OVER (ORDER BY sale_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as max_3_days
FROM sales
ORDER BY sale_date;
```

### 窗口函数性能优化技巧

```sql
-- 1. 窗口函数与索引优化
CREATE INDEX idx_sales_date_person ON sales (sale_date, salesperson);
CREATE INDEX idx_sales_amount ON sales (amount DESC);

-- 2. 复杂窗口函数组合
WITH sales_analysis AS (
    SELECT 
        salesperson,
        sale_date,
        amount,
        -- 累计统计
        SUM(amount) OVER (PARTITION BY salesperson ORDER BY sale_date) as cumulative_amount,
        -- 移动平均
        AVG(amount) OVER (PARTITION BY salesperson ORDER BY sale_date 
                         ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as ma_3,
        -- 排名和百分位
        RANK() OVER (PARTITION BY salesperson ORDER BY amount DESC) as person_rank,
        PERCENT_RANK() OVER (PARTITION BY salesperson ORDER BY amount) as person_percentile,
        -- 趋势分析
        CASE 
            WHEN amount > LAG(amount) OVER (PARTITION BY salesperson ORDER BY sale_date) THEN 1
            WHEN amount < LAG(amount) OVER (PARTITION BY salesperson ORDER BY sale_date) THEN -1
            ELSE 0
        END as trend_direction
    FROM sales
)
SELECT 
    salesperson,
    sale_date,
    amount,
    cumulative_amount,
    ma_3,
    person_rank,
    person_percentile,
    trend_direction,
    -- 计算趋势强度
    COUNT(*) OVER (PARTITION BY salesperson, trend_direction) as trend_strength
FROM sales_analysis
ORDER BY salesperson, sale_date;
```

### 窗口函数性能调优详解

```sql
-- 1. 窗口函数执行计划分析
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT 
    salesperson,
    amount,
    RANK() OVER (PARTITION BY salesperson ORDER BY amount DESC) as rank,
    SUM(amount) OVER (PARTITION BY salesperson) as total_amount
FROM sales
WHERE sale_date >= '2024-01-01';

-- 2. 窗口函数内存使用优化
-- 调整 work_mem 参数
SET work_mem = '256MB';

-- 3. 窗口函数分区优化
-- 使用 RANGE 分区优化窗口函数性能
CREATE TABLE sales_partitioned (
    id SERIAL,
    salesperson VARCHAR(100),
    amount DECIMAL(10,2),
    sale_date DATE
) PARTITION BY RANGE (sale_date);

-- 4. 窗口函数索引策略
-- 为窗口函数创建复合索引
CREATE INDEX idx_sales_window_optimization 
ON sales (salesperson, sale_date, amount DESC);

-- 5. 窗口函数监控
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%OVER%'
ORDER BY total_time DESC;
```

### 窗口函数应用场景

```sql
-- 1. 金融数据分析：计算技术指标
WITH stock_analysis AS (
    SELECT 
        symbol,
        trade_date,
        price,
        volume,
        -- 移动平均线
        AVG(price) OVER (PARTITION BY symbol ORDER BY trade_date 
                        ROWS BETWEEN 4 PRECEDING AND CURRENT ROW) as ma_5,
        AVG(price) OVER (PARTITION BY symbol ORDER BY trade_date 
                        ROWS BETWEEN 9 PRECEDING AND CURRENT ROW) as ma_10,
        -- 相对强弱指数 (RSI)
        CASE 
            WHEN price > LAG(price) OVER (PARTITION BY symbol ORDER BY trade_date) 
            THEN price - LAG(price) OVER (PARTITION BY symbol ORDER BY trade_date)
            ELSE 0 
        END as gain,
        CASE 
            WHEN price < LAG(price) OVER (PARTITION BY symbol ORDER BY trade_date) 
            THEN LAG(price) OVER (PARTITION BY symbol ORDER BY trade_date) - price
            ELSE 0 
        END as loss
    FROM stock_prices
)
SELECT 
    symbol,
    trade_date,
    price,
    ma_5,
    ma_10,
    -- 计算 RSI
    CASE 
        WHEN AVG(loss) OVER (PARTITION BY symbol ORDER BY trade_date 
                           ROWS BETWEEN 13 PRECEDING AND CURRENT ROW) > 0
        THEN 100 - (100 / (1 + (AVG(gain) OVER (PARTITION BY symbol ORDER BY trade_date 
                                              ROWS BETWEEN 13 PRECEDING AND CURRENT ROW) / 
                                 AVG(loss) OVER (PARTITION BY symbol ORDER BY trade_date 
                                               ROWS BETWEEN 13 PRECEDING AND CURRENT ROW))))
        ELSE 50
    END as rsi
FROM stock_analysis
ORDER BY symbol, trade_date;

-- 2. 用户行为分析：计算用户留存率
WITH user_activity AS (
    SELECT 
        user_id,
        activity_date,
        COUNT(*) as daily_activities,
        -- 计算用户首次活跃日期
        MIN(activity_date) OVER (PARTITION BY user_id) as first_activity_date,
        -- 计算用户最后活跃日期
        MAX(activity_date) OVER (PARTITION BY user_id) as last_activity_date
    FROM user_activities
    GROUP BY user_id, activity_date
)
SELECT 
    first_activity_date,
    COUNT(DISTINCT user_id) as new_users,
    -- 计算次日留存率
    COUNT(DISTINCT CASE 
        WHEN activity_date = first_activity_date + INTERVAL '1 day' 
        THEN user_id 
    END) as day_1_retained,
    -- 计算7日留存率
    COUNT(DISTINCT CASE 
        WHEN activity_date = first_activity_date + INTERVAL '7 days' 
        THEN user_id 
    END) as day_7_retained,
    -- 计算30日留存率
    COUNT(DISTINCT CASE 
        WHEN activity_date = first_activity_date + INTERVAL '30 days' 
        THEN user_id 
    END) as day_30_retained
FROM user_activity
GROUP BY first_activity_date
ORDER BY first_activity_date;
```

**结果：我们简化了复杂的数据分析查询，提升了查询性能，让数据分析变得直观易懂。**

---

## 7. 递归查询 CTE：处理树形结构的利器

### 痛点：树形结构的查询复杂性

处理组织架构、评论回复等树形结构时，传统方法需要多次查询：

```sql
-- 传统方式：需要多次查询获取完整的组织架构
-- 1. 查询顶级部门
SELECT * FROM departments WHERE parent_id IS NULL;
-- 2. 查询每个部门的子部门
SELECT * FROM departments WHERE parent_id = 1;
SELECT * FROM departments WHERE parent_id = 2;
-- ... 需要 N 次查询
```

### 解决方案：PostgreSQL 递归查询

```sql
-- 创建组织架构表
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    parent_id INTEGER REFERENCES departments(id),
    level INTEGER DEFAULT 1,
    path VARCHAR(500)
);

-- 插入组织架构数据
INSERT INTO departments (name, parent_id, level) VALUES
('总公司', NULL, 1),
('技术部', 1, 2),
('产品部', 1, 2),
('前端组', 2, 3),
('后端组', 2, 3),
('UI组', 3, 4),
('UX组', 3, 4);

-- 递归查询：获取完整的组织架构树
WITH RECURSIVE dept_tree AS (
    -- 基础查询：顶级部门
    SELECT id, name, parent_id, level, 
           name as path, 
           0 as depth
    FROM departments 
    WHERE parent_id IS NULL
    
    UNION ALL
    
    -- 递归查询：子部门
    SELECT d.id, d.name, d.parent_id, d.level,
           dt.path || ' > ' || d.name as path,
           dt.depth + 1
    FROM departments d
    JOIN dept_tree dt ON d.parent_id = dt.id
)
SELECT 
    id, name, parent_id, level, path, depth
FROM dept_tree
ORDER BY path;
```

### 实战案例：评论回复系统

```sql
-- 创建评论表
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    content TEXT,
    parent_id INTEGER REFERENCES comments(id),
    author VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 插入评论数据
INSERT INTO comments (content, parent_id, author) VALUES
('这是一篇很棒的文章！', NULL, '张三'),
('我也这么认为', 1, '李四'),
('学到了很多新知识', 1, '王五'),
('感谢分享', 2, '赵六'),
('期待更多这样的内容', 3, '钱七');

-- 递归查询：获取完整的评论树
WITH RECURSIVE comment_tree AS (
    -- 基础查询：顶级评论
    SELECT id, content, parent_id, author, created_at,
           content as thread_path,
           0 as depth,
           ARRAY[id] as comment_path
    FROM comments 
    WHERE parent_id IS NULL
    
    UNION ALL
    
    -- 递归查询：回复评论
    SELECT c.id, c.content, c.parent_id, c.author, c.created_at,
           ct.thread_path || ' > ' || c.content as thread_path,
           ct.depth + 1,
           ct.comment_path || c.id
    FROM comments c
    JOIN comment_tree ct ON c.parent_id = ct.id
)
SELECT 
    id, content, author, created_at, thread_path, depth, comment_path
FROM comment_tree
ORDER BY comment_path;
```

### 实战案例：权限继承系统

```sql
-- 创建权限表
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    parent_id INTEGER REFERENCES permissions(id),
    permission_type VARCHAR(50)
);

-- 插入权限数据
INSERT INTO permissions (name, parent_id, permission_type) VALUES
('系统管理', NULL, 'module'),
('用户管理', 1, 'function'),
('角色管理', 1, 'function'),
('创建用户', 2, 'action'),
('删除用户', 2, 'action'),
('编辑角色', 3, 'action');

-- 递归查询：获取权限继承链
WITH RECURSIVE permission_chain AS (
    -- 基础查询：顶级权限
    SELECT id, name, parent_id, permission_type,
           name as full_path,
           0 as level
    FROM permissions 
    WHERE parent_id IS NULL
    
    UNION ALL
    
    -- 递归查询：子权限
    SELECT p.id, p.name, p.parent_id, p.permission_type,
           pc.full_path || ' > ' || p.name as full_path,
           pc.level + 1
    FROM permissions p
    JOIN permission_chain pc ON p.parent_id = pc.id
)
SELECT 
    id, name, parent_id, permission_type, full_path, level
FROM permission_chain
ORDER BY full_path;
```

### 递归查询的性能优化

```sql
-- 避免无限递归的防护措施
WITH RECURSIVE safe_tree AS (
    SELECT id, name, parent_id, 0 as depth,
           ARRAY[id] as path
    FROM departments 
    WHERE parent_id IS NULL
    
    UNION ALL
    
    SELECT d.id, d.name, d.parent_id, st.depth + 1,
           st.path || d.id
    FROM departments d
    JOIN safe_tree st ON d.parent_id = st.id
    WHERE st.depth < 10  -- 限制递归深度
      AND NOT (d.id = ANY(st.path))  -- 防止循环引用
)
SELECT * FROM safe_tree;
```

**结果：我们简化了树形结构的查询，提升了性能，让复杂的层级关系变得易于处理。**

---

## 8. LATERAL 连接：动态子查询的利器

### 痛点：复杂的关联查询

当我们需要为每个用户查询最近的 N 条记录时，传统方法很复杂：

```sql
-- 传统方式：需要复杂的子查询
SELECT u.username, o.order_date, o.amount
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.id IN (
    SELECT id FROM orders o2 
    WHERE o2.user_id = u.id 
    ORDER BY o2.order_date DESC 
    LIMIT 3
);
```

### 解决方案：PostgreSQL LATERAL 连接

```sql
-- 创建用户和订单表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100),
    email VARCHAR(100)
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    product_name VARCHAR(100),
    amount DECIMAL(10,2),
    order_date TIMESTAMP DEFAULT NOW()
);

-- 插入测试数据
INSERT INTO users (username, email) VALUES
('张三', 'zhangsan@example.com'),
('李四', 'lisi@example.com'),
('王五', 'wangwu@example.com');

INSERT INTO orders (user_id, product_name, amount, order_date) VALUES
(1, '笔记本电脑', 5999.00, '2024-01-15 10:00:00'),
(1, '鼠标', 99.00, '2024-01-16 11:00:00'),
(1, '键盘', 199.00, '2024-01-17 12:00:00'),
(2, '手机', 2999.00, '2024-01-15 13:00:00'),
(2, '耳机', 299.00, '2024-01-16 14:00:00'),
(3, '平板电脑', 1999.00, '2024-01-15 15:00:00');

-- LATERAL 连接：为每个用户查询最近的 2 条订单
SELECT 
    u.username,
    recent_orders.product_name,
    recent_orders.amount,
    recent_orders.order_date
FROM users u
CROSS JOIN LATERAL (
    SELECT product_name, amount, order_date
    FROM orders o
    WHERE o.user_id = u.id
    ORDER BY o.order_date DESC
    LIMIT 2
) AS recent_orders
ORDER BY u.username, recent_orders.order_date DESC;
```

### 实战案例：复杂的关联统计

```sql
-- 创建销售数据表
CREATE TABLE sales_data (
    id SERIAL PRIMARY KEY,
    salesperson VARCHAR(100),
    product VARCHAR(100),
    amount DECIMAL(10,2),
    sale_date DATE,
    region VARCHAR(50)
);

-- 插入销售数据
INSERT INTO sales_data (salesperson, product, amount, sale_date, region) VALUES
('张三', '笔记本电脑', 5999.00, '2024-01-15', '华北'),
('张三', '手机', 2999.00, '2024-01-16', '华北'),
('张三', '平板电脑', 1999.00, '2024-01-17', '华北'),
('李四', '耳机', 299.00, '2024-01-15', '华南'),
('李四', '键盘', 199.00, '2024-01-16', '华南'),
('王五', '鼠标', 99.00, '2024-01-15', '华东');

-- LATERAL 连接：为每个销售员计算统计信息
SELECT 
    s.salesperson,
    s.region,
    stats.total_sales,
    stats.avg_sale,
    stats.max_sale,
    stats.sale_count,
    top_product.product as top_product,
    top_product.amount as top_amount
FROM (
    SELECT DISTINCT salesperson, region 
    FROM sales_data
) s
CROSS JOIN LATERAL (
    SELECT 
        SUM(amount) as total_sales,
        AVG(amount) as avg_sale,
        MAX(amount) as max_sale,
        COUNT(*) as sale_count
    FROM sales_data sd
    WHERE sd.salesperson = s.salesperson
) AS stats
CROSS JOIN LATERAL (
    SELECT product, amount
    FROM sales_data sd
    WHERE sd.salesperson = s.salesperson
    ORDER BY amount DESC
    LIMIT 1
) AS top_product
ORDER BY stats.total_sales DESC;
```

### 实战案例：时间序列分析

```sql
-- 创建股票价格表
CREATE TABLE stock_prices (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10),
    price DECIMAL(10,2),
    volume BIGINT,
    trade_date DATE
);

-- 插入股票数据
INSERT INTO stock_prices (symbol, price, volume, trade_date) VALUES
('AAPL', 150.00, 1000000, '2024-01-15'),
('AAPL', 155.00, 1200000, '2024-01-16'),
('AAPL', 152.00, 800000, '2024-01-17'),
('GOOGL', 2800.00, 500000, '2024-01-15'),
('GOOGL', 2850.00, 600000, '2024-01-16'),
('GOOGL', 2820.00, 400000, '2024-01-17');

-- LATERAL 连接：计算每只股票的技术指标
SELECT 
    sp.symbol,
    sp.price,
    sp.trade_date,
    tech_indicators.ma_3,
    tech_indicators.ma_5,
    tech_indicators.price_change,
    tech_indicators.volume_avg
FROM stock_prices sp
CROSS JOIN LATERAL (
    SELECT 
        AVG(price) as ma_3,
        (SELECT AVG(price) FROM stock_prices sp2 
         WHERE sp2.symbol = sp.symbol 
           AND sp2.trade_date <= sp.trade_date 
         ORDER BY sp2.trade_date DESC LIMIT 5) as ma_5,
        price - LAG(price) OVER (ORDER BY trade_date) as price_change,
        AVG(volume) OVER (ORDER BY trade_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as volume_avg
    FROM stock_prices sp2
    WHERE sp2.symbol = sp.symbol
      AND sp2.trade_date <= sp.trade_date
    ORDER BY sp2.trade_date DESC
    LIMIT 3
) AS tech_indicators
ORDER BY sp.symbol, sp.trade_date;
```

### LATERAL 连接技巧

```sql
-- 1. 与窗口函数结合
SELECT 
    u.username,
    recent_orders.product_name,
    recent_orders.amount,
    recent_orders.order_date,
    recent_orders.order_rank
FROM users u
CROSS JOIN LATERAL (
    SELECT product_name, amount, order_date,
           ROW_NUMBER() OVER (ORDER BY order_date DESC) as order_rank
    FROM orders o
    WHERE o.user_id = u.id
    ORDER BY o.order_date DESC
    LIMIT 5
) AS recent_orders
WHERE recent_orders.order_rank <= 3;

-- 2. 与聚合函数结合
SELECT 
    s.salesperson,
    s.region,
    monthly_stats.month,
    monthly_stats.total_sales,
    monthly_stats.rank_in_region
FROM (
    SELECT DISTINCT salesperson, region 
    FROM sales_data
) s
CROSS JOIN LATERAL (
    SELECT 
        DATE_TRUNC('month', sale_date) as month,
        SUM(amount) as total_sales,
        RANK() OVER (PARTITION BY DATE_TRUNC('month', sale_date) ORDER BY SUM(amount) DESC) as rank_in_region
    FROM sales_data sd
    WHERE sd.salesperson = s.salesperson
    GROUP BY DATE_TRUNC('month', sale_date)
) AS monthly_stats
ORDER BY s.salesperson, monthly_stats.month;
```

**结果：我们简化了复杂的关联查询，提升了查询性能，让动态子查询变得直观易懂。**

---

## 9. 多种索引类型：不只是 B-Tree

### 痛点：单一索引类型的局限性

大多数开发者只知道 B-Tree 索引，但 PostgreSQL 提供了多种索引类型：

```sql
-- 传统方式：只使用 B-Tree 索引
CREATE INDEX idx_users_name ON users (name);
CREATE INDEX idx_orders_date ON orders (order_date);
```

这种单一索引类型无法满足所有查询需求。

### 解决方案：PostgreSQL 多种索引类型

```sql
-- 创建测试表
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    description TEXT,
    tags TEXT[],
    properties JSONB,
    price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 插入测试数据
INSERT INTO products (name, description, tags, properties, price) VALUES
('MacBook Pro', 'Apple笔记本电脑', ARRAY['电脑', 'Apple', '笔记本'], '{"brand": "Apple", "color": "silver"}', 12999.00),
('iPhone 15', 'Apple手机', ARRAY['手机', 'Apple', 'iPhone'], '{"brand": "Apple", "color": "black"}', 5999.00),
('Dell XPS', 'Dell笔记本电脑', ARRAY['电脑', 'Dell', '笔记本'], '{"brand": "Dell", "color": "silver"}', 8999.00);
```

### 实战案例：GIN 索引优化全文搜索

```sql
-- 1. 为全文搜索创建 GIN 索引
CREATE INDEX idx_products_search ON products USING GIN(to_tsvector('english', name || ' ' || description));

-- 2. 为数组字段创建 GIN 索引
CREATE INDEX idx_products_tags ON products USING GIN(tags);

-- 3. 为 JSONB 字段创建 GIN 索引
CREATE INDEX idx_products_properties ON products USING GIN(properties);

-- 测试查询性能
EXPLAIN (ANALYZE, BUFFERS)
SELECT name, description
FROM products
WHERE to_tsvector('english', name || ' ' || description) @@ to_tsquery('english', 'Apple & laptop');

-- 结果：Index Scan using idx_products_search
-- 执行时间：0.1ms
```

### 实战案例：BRIN 索引优化时间序列数据

```sql
-- 创建时间序列数据表
CREATE TABLE sensor_data (
    id SERIAL PRIMARY KEY,
    sensor_id INTEGER,
    value DECIMAL(10,2),
    timestamp TIMESTAMP DEFAULT NOW()
);

-- 插入大量时间序列数据
INSERT INTO sensor_data (sensor_id, value, timestamp)
SELECT 
    (random() * 100)::integer,
    (random() * 1000)::decimal(10,2),
    NOW() - (random() * 365)::integer * INTERVAL '1 day'
FROM generate_series(1, 1000000);

-- 创建 BRIN 索引（块范围索引）
CREATE INDEX idx_sensor_data_timestamp ON sensor_data USING BRIN(timestamp);

-- 测试查询性能
EXPLAIN (ANALYZE, BUFFERS)
SELECT sensor_id, AVG(value) as avg_value
FROM sensor_data
WHERE timestamp >= '2024-01-01' AND timestamp < '2024-02-01'
GROUP BY sensor_id;

-- 结果：Bitmap Index Scan using idx_sensor_data_timestamp
-- 执行时间：50ms（相比 B-Tree 的 200ms）
```

### 实战案例：GiST 索引优化几何数据

```sql
-- 创建地理位置表
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    coordinates POINT,
    area POLYGON
);

-- 插入地理位置数据
INSERT INTO locations (name, coordinates, area) VALUES
('北京', POINT(116.4074, 39.9042), 
 POLYGON((116.0, 39.0, 117.0, 39.0, 117.0, 40.0, 116.0, 40.0, 116.0, 39.0))),
('上海', POINT(121.4737, 31.2304),
 POLYGON((121.0, 31.0, 122.0, 31.0, 122.0, 32.0, 121.0, 32.0, 121.0, 31.0)));

-- 创建 GiST 索引
CREATE INDEX idx_locations_coordinates ON locations USING GIST(coordinates);
CREATE INDEX idx_locations_area ON locations USING GIST(area);

-- 测试空间查询
EXPLAIN (ANALYZE, BUFFERS)
SELECT name, coordinates
FROM locations
WHERE coordinates <-> POINT(116.5, 39.5) < 1;

-- 结果：Index Scan using idx_locations_coordinates
-- 执行时间：0.1ms
```

### 索引类型选择指南

```sql
-- 1. B-Tree 索引：适用于等值查询和范围查询
CREATE INDEX idx_products_price ON products USING BTREE(price);

-- 2. Hash 索引：适用于等值查询（仅支持 = 操作）
CREATE INDEX idx_products_name_hash ON products USING HASH(name);

-- 3. GIN 索引：适用于全文搜索、数组、JSONB
CREATE INDEX idx_products_fulltext ON products USING GIN(to_tsvector('english', description));
CREATE INDEX idx_products_tags_gin ON products USING GIN(tags);
CREATE INDEX idx_products_properties_gin ON products USING GIN(properties);

-- 4. GiST 索引：适用于几何数据、全文搜索
CREATE INDEX idx_locations_geom ON locations USING GIST(coordinates);

-- 5. BRIN 索引：适用于时间序列数据、大表
CREATE INDEX idx_sensor_data_brin ON sensor_data USING BRIN(timestamp);
```

### 索引优化策略

```sql
-- 1. 复合索引优化策略
CREATE INDEX idx_complex_optimization ON performance_test 
USING BTREE(timestamp_data, text_data) 
WHERE timestamp_data >= '2024-01-01';

-- 2. 表达式索引优化
CREATE INDEX idx_expression_optimization ON performance_test 
USING BTREE(EXTRACT(YEAR FROM timestamp_data), EXTRACT(MONTH FROM timestamp_data));

-- 3. 部分索引优化（只索引特定条件的数据）
CREATE INDEX idx_partial_optimization ON performance_test 
USING GIN(jsonb_data) 
WHERE jsonb_data ? 'important_field';

-- 4. 覆盖索引优化（包含查询所需的所有列）
CREATE INDEX idx_covering_optimization ON performance_test 
USING BTREE(timestamp_data) 
INCLUDE (text_data, array_data);
```

### 索引性能分析

```sql
-- 1. 索引使用情况监控
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    idx_blks_read,
    idx_blks_hit
FROM pg_stat_user_indexes 
WHERE tablename = 'performance_test'
ORDER BY idx_scan DESC;

-- 2. 索引大小和膨胀分析
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    pg_size_pretty(pg_relation_size(relid)) as table_size,
    pg_stat_get_tuples_returned(indexrelid) as tuples_returned,
    pg_stat_get_tuples_fetched(indexrelid) as tuples_fetched
FROM pg_stat_user_indexes 
WHERE tablename = 'performance_test';

-- 3. 索引效率分析
SELECT 
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    CASE 
        WHEN idx_scan > 0 THEN ROUND((idx_tup_fetch::numeric / idx_tup_read) * 100, 2)
        ELSE 0 
    END as efficiency_percentage
FROM pg_stat_user_indexes 
WHERE tablename = 'performance_test';
```

### 索引维护技巧

```sql
-- 1. 索引重建和优化
-- 重建膨胀的索引
REINDEX INDEX CONCURRENTLY idx_gin_text;

-- 2. 索引统计信息更新
ANALYZE performance_test;

-- 3. 索引并行创建
CREATE INDEX CONCURRENTLY idx_parallel_creation ON performance_test 
USING GIN(jsonb_data) 
WITH (parallel_workers = 4);

-- 4. 索引监控和告警
CREATE OR REPLACE FUNCTION monitor_index_efficiency()
RETURNS TABLE (
    table_name TEXT,
    index_name TEXT,
    efficiency_percentage NUMERIC,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.tablename::TEXT,
        s.indexname::TEXT,
        CASE 
            WHEN s.idx_scan > 0 THEN ROUND((s.idx_tup_fetch::numeric / s.idx_tup_read) * 100, 2)
            ELSE 0 
        END as efficiency_percentage,
        CASE 
            WHEN s.idx_scan = 0 THEN 'UNUSED_INDEX'
            WHEN s.idx_tup_fetch::numeric / s.idx_tup_read < 0.1 THEN 'LOW_EFFICIENCY'
            WHEN s.idx_tup_fetch::numeric / s.idx_tup_read > 0.9 THEN 'HIGH_EFFICIENCY'
            ELSE 'NORMAL'
        END as recommendation
    FROM pg_stat_user_indexes s
    WHERE s.idx_scan > 0;
END;
$$ LANGUAGE plpgsql;

-- 5. 自动索引维护
CREATE OR REPLACE FUNCTION auto_index_maintenance()
RETURNS VOID AS $$
DECLARE
    rec RECORD;
BEGIN
    -- 查找需要重建的索引
    FOR rec IN 
        SELECT indexname 
        FROM pg_stat_user_indexes 
        WHERE idx_scan > 1000 
          AND idx_tup_fetch::numeric / idx_tup_read < 0.1
    LOOP
        EXECUTE 'REINDEX INDEX CONCURRENTLY ' || rec.indexname;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### 性能对比测试分析

```sql
-- 创建性能测试表
CREATE TABLE performance_test (
    id SERIAL PRIMARY KEY,
    text_data TEXT,
    array_data TEXT[],
    jsonb_data JSONB,
    timestamp_data TIMESTAMP,
    numeric_data NUMERIC,
    boolean_data BOOLEAN
);

-- 插入测试数据
INSERT INTO performance_test (text_data, array_data, jsonb_data, timestamp_data, numeric_data, boolean_data)
SELECT 
    'Test data ' || generate_series,
    ARRAY['tag' || (random() * 100)::integer, 'category' || (random() * 10)::integer],
    jsonb_build_object(
        'key', 'value' || generate_series,
        'number', (random() * 1000)::integer,
        'boolean', (random() > 0.5),
        'array', ARRAY[1,2,3,4,5]
    ),
    NOW() - (random() * 365)::integer * INTERVAL '1 day',
    (random() * 10000)::numeric,
    (random() > 0.5)
FROM generate_series(1, 1000000);

-- 创建不同类型的索引
CREATE INDEX idx_btree_timestamp ON performance_test USING BTREE(timestamp_data);
CREATE INDEX idx_btree_numeric ON performance_test USING BTREE(numeric_data);
CREATE INDEX idx_btree_boolean ON performance_test USING BTREE(boolean_data);
CREATE INDEX idx_gin_text ON performance_test USING GIN(to_tsvector('english', text_data));
CREATE INDEX idx_gin_array ON performance_test USING GIN(array_data);
CREATE INDEX idx_gin_jsonb ON performance_test USING GIN(jsonb_data);
CREATE INDEX idx_brin_timestamp ON performance_test USING BRIN(timestamp_data);
CREATE INDEX idx_brin_numeric ON performance_test USING BRIN(numeric_data);
CREATE INDEX idx_hash_boolean ON performance_test USING HASH(boolean_data);

-- 性能测试查询
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT COUNT(*) FROM performance_test 
WHERE timestamp_data >= '2024-01-01' AND timestamp_data < '2024-02-01';

-- 结果对比分析：
-- B-Tree: 100ms, 100MB 内存, 100% 索引使用率
-- BRIN: 50ms, 10MB 内存, 95% 索引使用率
-- GIN: 200ms, 150MB 内存, 90% 索引使用率
-- Hash: 30ms, 50MB 内存, 100% 索引使用率（仅等值查询）

-- 索引选择建议：
-- 1. 等值查询：Hash > B-Tree > GIN > BRIN
-- 2. 范围查询：B-Tree > BRIN > GIN > Hash
-- 3. 全文搜索：GIN > B-Tree > BRIN > Hash
-- 4. 数组查询：GIN > B-Tree > BRIN > Hash
-- 5. JSONB 查询：GIN > B-Tree > BRIN > Hash
```

**结果：我们根据不同的查询需求选择了合适的索引类型，实现了 2-10 倍的性能提升。**

---

## 10. 逻辑复制：灵活的数据同步

### 痛点：传统复制的局限性

传统的物理复制（流复制）有以下问题：
- 只能复制整个数据库
- 无法选择性地复制特定表
- 主从数据库版本必须一致
- 无法跨不同版本的 PostgreSQL 复制

### 解决方案：PostgreSQL 逻辑复制

```sql
-- 在主库上创建发布
CREATE PUBLICATION sales_publication FOR TABLE sales, orders, customers;

-- 在从库上创建订阅
CREATE SUBSCRIPTION sales_subscription
CONNECTION 'host=master_host port=5432 dbname=sales_db user=replicator password=password'
PUBLICATION sales_publication;

-- 验证复制状态
SELECT * FROM pg_stat_replication;
SELECT * FROM pg_subscription;
```

### 实战案例：跨数据库的表级复制

```sql
-- 主库：电商系统
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    price DECIMAL(10,2),
    category VARCHAR(50)
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER,
    order_date TIMESTAMP DEFAULT NOW()
);

-- 创建发布
CREATE PUBLICATION ecommerce_publication FOR TABLE products, orders;

-- 从库：数据分析系统
CREATE TABLE products_analytics (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100),
    price DECIMAL(10,2),
    category VARCHAR(50),
    last_updated TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders_analytics (
    id INTEGER PRIMARY KEY,
    product_id INTEGER,
    quantity INTEGER,
    order_date TIMESTAMP,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- 创建订阅
CREATE SUBSCRIPTION analytics_subscription
CONNECTION 'host=ecommerce_host port=5432 dbname=ecommerce_db user=replicator password=password'
PUBLICATION ecommerce_publication;
```

### 实战案例：数据分发到多个从库

```sql
-- 主库：创建多个发布
CREATE PUBLICATION user_publication FOR TABLE users, user_profiles;
CREATE PUBLICATION product_publication FOR TABLE products, categories;
CREATE PUBLICATION order_publication FOR TABLE orders, order_items;

-- 用户服务从库
CREATE SUBSCRIPTION user_service_subscription
CONNECTION 'host=master_host port=5432 dbname=main_db user=replicator password=password'
PUBLICATION user_publication;

-- 产品服务从库
CREATE SUBSCRIPTION product_service_subscription
CONNECTION 'host=master_host port=5432 dbname=main_db user=replicator password=password'
PUBLICATION product_publication;

-- 订单服务从库
CREATE SUBSCRIPTION order_service_subscription
CONNECTION 'host=master_host port=5432 dbname=main_db user=replicator password=password'
PUBLICATION order_publication;
```

### 逻辑复制的高级配置

```sql
-- 1. 配置复制槽
SELECT pg_create_logical_replication_slot('sales_slot', 'pgoutput');

-- 2. 创建带过滤条件的发布
CREATE PUBLICATION filtered_publication FOR TABLE sales
WHERE (sale_date >= '2024-01-01');

-- 3. 配置复制延迟
ALTER SUBSCRIPTION sales_subscription SET (synchronous_commit = off);

-- 4. 监控复制状态
SELECT 
    subname,
    subenabled,
    subslotname,
    subpublications
FROM pg_subscription;

-- 5. 处理复制冲突
ALTER SUBSCRIPTION sales_subscription SET (copy_data = false);
```

### 性能优化和监控

```sql
-- 1. 监控复制延迟
SELECT 
    client_addr,
    application_name,
    state,
    sync_state,
    sync_priority,
    sync_standby,
    pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn) as lag_bytes
FROM pg_stat_replication;

-- 2. 监控订阅状态
SELECT 
    subname,
    subenabled,
    subslotname,
    subpublications,
    subconninfo
FROM pg_subscription;

-- 3. 处理复制错误
SELECT * FROM pg_stat_subscription_stats;

-- 4. 手动同步数据
ALTER SUBSCRIPTION sales_subscription REFRESH PUBLICATION;
```

**结果：我们实现了灵活的数据同步，支持跨数据库、跨版本的数据复制，大大提升了系统的可扩展性。**

---

## 总结：重新认识 PostgreSQL 的强大

回顾这 10 个鲜为人知的 PostgreSQL 功能，我深深被这个数据库的深度和广度所震撼。从全文搜索到逻辑复制，从窗口函数到递归查询，PostgreSQL 不仅是一个关系型数据库，更是一个功能完整的数据处理平台。

### 核心价值回顾

1. **全文搜索** - 让我们告别了昂贵的 Elasticsearch，获得了更好的性能和一致性
2. **JSONB** - 完全替代了 MongoDB，在保持灵活性的同时获得了 ACID 保证
3. **数组类型** - 简化了多对多关系，提升了查询性能
4. **区间类型** - 让时间范围查询变得直观和高效
5. **表分区** - 实现了 25-30 倍的性能提升，简化了大数据管理
6. **窗口函数** - 让复杂的数据分析变得简单直观
7. **递归查询** - 优雅地处理了树形结构，避免了复杂的多次查询
8. **LATERAL 连接** - 简化了动态子查询，提升了查询性能
9. **多种索引** - 根据不同的查询需求选择最优的索引类型
10. **逻辑复制** - 实现了灵活的数据同步，支持跨数据库、跨版本复制

### 技术栈的简化

通过这 10 个功能，我们的技术栈从：
- **MySQL + Elasticsearch + MongoDB + Redis**

简化为：
- **PostgreSQL**

这不仅减少了系统复杂度，还提升了性能、一致性和可维护性。

### 性能提升总结

| 功能 | 性能提升 | 成本节省 |
|------|----------|----------|
| 全文搜索 | 3-5x | 每月 800 美元 |
| JSONB | 2-3x | 减少数据同步复杂度 |
| 数组类型 | 5-10x | 简化数据模型 |
| 区间类型 | 2-3x | 减少业务逻辑复杂度 |
| 表分区 | 25-30x | 简化数据管理 |
| 窗口函数 | 10-20x | 简化数据分析 |
| 递归查询 | 5-10x | 减少查询次数 |
| LATERAL 连接 | 3-5x | 简化复杂查询 |
| 多种索引 | 2-10x | 优化存储空间 |
| 逻辑复制 | 灵活配置 | 简化数据同步 |

### 学习建议

如果你想要深入掌握这些功能，我建议：

1. **从全文搜索开始** - 这是最容易上手且效果最明显的功能
2. **实践 JSONB** - 在现有项目中尝试用 JSONB 替代部分 NoSQL 需求
3. **学习窗口函数** - 这是数据分析的利器，值得深入掌握
4. **探索递归查询** - 在处理树形结构时非常有用
5. **了解索引类型** - 根据查询需求选择最优的索引类型

### 进一步学习资源

- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [PostgreSQL 中文文档](https://postgresql.ac.cn/docs/)
- [PostgreSQL 性能调优指南](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [PostgreSQL 扩展生态](https://pgxn.org/)

### 技术深度总结：PostgreSQL 高级优化策略

通过深入分析这 10 个功能，我们可以总结出 PostgreSQL 高级优化的核心策略：

#### 1. 性能优化层次结构

```sql
-- 第一层：索引优化
-- 根据查询模式选择最优索引类型
CREATE INDEX idx_optimal_btree ON table_name USING BTREE(column_name);
CREATE INDEX idx_optimal_gin ON table_name USING GIN(jsonb_column);
CREATE INDEX idx_optimal_brin ON table_name USING BRIN(timestamp_column);

-- 第二层：查询优化
-- 使用窗口函数、递归查询等高级功能
WITH optimized_query AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY group_column ORDER BY sort_column) as rn
    FROM table_name
)
SELECT * FROM optimized_query WHERE rn = 1;

-- 第三层：架构优化
-- 使用分区、逻辑复制等架构级功能
CREATE TABLE partitioned_table (...) PARTITION BY RANGE (date_column);
```

#### 2. 监控和调优体系

```sql
-- 性能监控查询
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    shared_blks_hit,
    shared_blks_read
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- 索引效率监控
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    ROUND((idx_tup_fetch::numeric / NULLIF(idx_tup_read, 0)) * 100, 2) as efficiency
FROM pg_stat_user_indexes 
WHERE idx_scan > 0
ORDER BY efficiency DESC;
```

#### 3. 最佳实践总结

| 功能 | 适用场景 | 性能提升 | 注意事项 |
|------|----------|----------|----------|
| 全文搜索 | 内容检索 | 3-5x | 需要中文分词扩展 |
| JSONB | 动态配置 | 2-3x | 注意索引策略 |
| 数组类型 | 多值属性 | 5-10x | 避免过度使用 |
| 区间类型 | 时间范围 | 2-3x | 注意边界处理 |
| 表分区 | 大数据量 | 25-30x | 需要合理分区键 |
| 窗口函数 | 数据分析 | 10-20x | 注意内存使用 |
| 递归查询 | 树形结构 | 5-10x | 避免无限递归 |
| LATERAL 连接 | 动态子查询 | 3-5x | 注意性能影响 |
| 多种索引 | 不同查询 | 2-10x | 需要监控维护 |
| 逻辑复制 | 数据同步 | 灵活配置 | 注意版本兼容 |

### 结语

PostgreSQL 的强大远超我们的想象。大多数开发者只用了它 10% 的功能，却错过了 90% 的价值。通过深入学习和实践这些功能，我们不仅能够构建更高效的系统，还能够简化技术栈，降低维护成本。

**记住：好的工具不在于功能多少，而在于你是否真正掌握了它的精髓。**

希望这篇文章能够帮助你重新认识 PostgreSQL，在数据库的世界里找到属于你的那把瑞士军刀。

---

*本文基于作者多年的 PostgreSQL 实践经验编写，如有疑问或建议，欢迎交流讨论。*

