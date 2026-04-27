---
title: Go database/sql 实战：连接池、事务与最佳实践
date: 2026-04-27
tags: [Golang, 数据库, SQL, 连接池]
description: 深入讲解 Go 标准库 database/sql 的正确用法：连接池配置、CRUD 操作、事务管理、预处理语句、防 SQL 注入，以及生产环境的优化策略。
---

# Go database/sql 实战：连接池、事务与最佳实践

`database/sql` 是 Go 标准库提供的数据库访问接口层，所有 Go 数据库驱动都基于此实现。本文以 MySQL 为例，系统讲解其正确使用方式。

## 一、初始化与连接池

```go
import (
    "database/sql"
    "time"
    
    _ "github.com/go-sql-driver/mysql" // 注册驱动
)

func NewDB(dsn string) (*sql.DB, error) {
    // sql.Open 不会真正连接，只是验证参数
    db, err := sql.Open("mysql", dsn)
    if err != nil {
        return nil, fmt.Errorf("open db: %w", err)
    }
    
    // 连接池配置
    db.SetMaxOpenConns(25)           // 最大连接数（根据数据库配置调整）
    db.SetMaxIdleConns(10)           // 最大空闲连接数
    db.SetConnMaxLifetime(5 * time.Minute)   // 连接最大生存时间
    db.SetConnMaxIdleTime(1 * time.Minute)   // 空闲连接最大等待时间
    
    // Ping 验证真实连接
    if err := db.Ping(); err != nil {
        return nil, fmt.Errorf("ping db: %w", err)
    }
    
    return db, nil
}

// DSN 格式
// "user:password@tcp(host:3306)/dbname?charset=utf8mb4&parseTime=True&loc=Local"
```

### 连接池参数说明

| 参数 | 建议值 | 说明 |
|------|--------|------|
| `MaxOpenConns` | CPU 核数 × 2 ~ 25 | 超过则阻塞等待 |
| `MaxIdleConns` | MaxOpenConns / 2 | 太高浪费资源 |
| `ConnMaxLifetime` | 5 分钟 | 防止数据库侧关闭的僵尸连接 |
| `ConnMaxIdleTime` | 1 分钟 | 释放长期不用的空闲连接 |

## 二、基础 CRUD 操作

```go
type User struct {
    ID        int
    Name      string
    Email     string
    CreatedAt time.Time
}

type UserRepository struct {
    db *sql.DB
}

// ===================== 查询单行 =====================

func (r *UserRepository) GetByID(ctx context.Context, id int) (*User, error) {
    const query = `SELECT id, name, email, created_at FROM users WHERE id = ?`
    
    var user User
    err := r.db.QueryRowContext(ctx, query, id).Scan(
        &user.ID, &user.Name, &user.Email, &user.CreatedAt,
    )
    
    if err == sql.ErrNoRows {
        return nil, ErrNotFound
    }
    if err != nil {
        return nil, fmt.Errorf("GetByID(%d): %w", id, err)
    }
    
    return &user, nil
}

// ===================== 查询多行 =====================

func (r *UserRepository) List(ctx context.Context, limit, offset int) ([]*User, error) {
    const query = `SELECT id, name, email, created_at FROM users LIMIT ? OFFSET ?`
    
    rows, err := r.db.QueryContext(ctx, query, limit, offset)
    if err != nil {
        return nil, fmt.Errorf("List: %w", err)
    }
    defer rows.Close() // 关键！必须 defer Close
    
    var users []*User
    for rows.Next() {
        var u User
        if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.CreatedAt); err != nil {
            return nil, fmt.Errorf("List scan: %w", err)
        }
        users = append(users, &u)
    }
    
    // 检查迭代过程中是否有错误
    if err := rows.Err(); err != nil {
        return nil, fmt.Errorf("List rows: %w", err)
    }
    
    return users, nil
}

// ===================== 插入 =====================

func (r *UserRepository) Create(ctx context.Context, user *User) error {
    const query = `INSERT INTO users(name, email) VALUES(?, ?)`
    
    result, err := r.db.ExecContext(ctx, query, user.Name, user.Email)
    if err != nil {
        return fmt.Errorf("Create: %w", err)
    }
    
    // 获取自增 ID
    id, err := result.LastInsertId()
    if err != nil {
        return fmt.Errorf("Create LastInsertId: %w", err)
    }
    
    user.ID = int(id)
    return nil
}

// ===================== 更新 =====================

func (r *UserRepository) Update(ctx context.Context, user *User) error {
    const query = `UPDATE users SET name = ?, email = ? WHERE id = ?`
    
    result, err := r.db.ExecContext(ctx, query, user.Name, user.Email, user.ID)
    if err != nil {
        return fmt.Errorf("Update: %w", err)
    }
    
    rows, err := result.RowsAffected()
    if err != nil {
        return fmt.Errorf("Update RowsAffected: %w", err)
    }
    
    if rows == 0 {
        return ErrNotFound // 没有行被更新，说明记录不存在
    }
    
    return nil
}

// ===================== 删除 =====================

func (r *UserRepository) Delete(ctx context.Context, id int) error {
    const query = `DELETE FROM users WHERE id = ?`
    
    result, err := r.db.ExecContext(ctx, query, id)
    if err != nil {
        return fmt.Errorf("Delete: %w", err)
    }
    
    rows, _ := result.RowsAffected()
    if rows == 0 {
        return ErrNotFound
    }
    
    return nil
}
```

## 三、事务管理

```go
// 简单事务
func (r *UserRepository) TransferCredit(
    ctx context.Context,
    fromID, toID int,
    amount float64,
) error {
    tx, err := r.db.BeginTx(ctx, &sql.TxOptions{
        Isolation: sql.LevelReadCommitted,
    })
    if err != nil {
        return fmt.Errorf("begin tx: %w", err)
    }
    
    // defer Rollback：如果 Commit 了，Rollback 是 no-op
    defer tx.Rollback()
    
    // 扣款
    if _, err := tx.ExecContext(ctx,
        "UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?",
        amount, fromID, amount,
    ); err != nil {
        return fmt.Errorf("deduct: %w", err)
    }
    
    // 加款
    if _, err := tx.ExecContext(ctx,
        "UPDATE accounts SET balance = balance + ? WHERE id = ?",
        amount, toID,
    ); err != nil {
        return fmt.Errorf("add: %w", err)
    }
    
    // 记录流水
    if _, err := tx.ExecContext(ctx,
        "INSERT INTO transactions(from_id, to_id, amount) VALUES(?, ?, ?)",
        fromID, toID, amount,
    ); err != nil {
        return fmt.Errorf("record: %w", err)
    }
    
    return tx.Commit()
}

// 通用事务包装函数
func WithTransaction(ctx context.Context, db *sql.DB, fn func(*sql.Tx) error) error {
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return fmt.Errorf("begin transaction: %w", err)
    }
    
    defer func() {
        if p := recover(); p != nil {
            tx.Rollback()
            panic(p) // 重新抛出 panic
        }
    }()
    
    if err := fn(tx); err != nil {
        if rbErr := tx.Rollback(); rbErr != nil {
            return fmt.Errorf("rollback failed: %v (original: %w)", rbErr, err)
        }
        return err
    }
    
    return tx.Commit()
}

// 使用
err := WithTransaction(ctx, db, func(tx *sql.Tx) error {
    if _, err := tx.ExecContext(ctx, "INSERT INTO ..."); err != nil {
        return err
    }
    if _, err := tx.ExecContext(ctx, "UPDATE ..."); err != nil {
        return err
    }
    return nil
})
```

## 四、预处理语句（Prepared Statements）

```go
type UserRepo struct {
    db         *sql.DB
    stmtGet    *sql.Stmt
    stmtCreate *sql.Stmt
}

// 应用启动时预编译
func NewUserRepo(db *sql.DB) (*UserRepo, error) {
    stmtGet, err := db.Prepare("SELECT id, name FROM users WHERE id = ?")
    if err != nil {
        return nil, fmt.Errorf("prepare get: %w", err)
    }
    
    stmtCreate, err := db.Prepare("INSERT INTO users(name, email) VALUES(?, ?)")
    if err != nil {
        stmtGet.Close()
        return nil, fmt.Errorf("prepare create: %w", err)
    }
    
    return &UserRepo{
        db:         db,
        stmtGet:    stmtGet,
        stmtCreate: stmtCreate,
    }, nil
}

func (r *UserRepo) Close() {
    r.stmtGet.Close()
    r.stmtCreate.Close()
}

func (r *UserRepo) Get(ctx context.Context, id int) (*User, error) {
    var user User
    err := r.stmtGet.QueryRowContext(ctx, id).Scan(&user.ID, &user.Name)
    if err == sql.ErrNoRows {
        return nil, ErrNotFound
    }
    return &user, err
}
```

## 五、处理 NULL 值

```go
type Profile struct {
    UserID int
    Bio    sql.NullString  // 可能为 NULL
    Age    sql.NullInt64
    Score  sql.NullFloat64
}

func (r *UserRepo) GetProfile(ctx context.Context, userID int) (*Profile, error) {
    var p Profile
    err := r.db.QueryRowContext(ctx,
        "SELECT user_id, bio, age, score FROM profiles WHERE user_id = ?",
        userID,
    ).Scan(&p.UserID, &p.Bio, &p.Age, &p.Score)
    
    if err != nil {
        return nil, err
    }
    
    return &p, nil
}

// 使用 NullString
func printProfile(p *Profile) {
    if p.Bio.Valid {
        fmt.Println("Bio:", p.Bio.String)
    } else {
        fmt.Println("Bio: 未填写")
    }
}

// 或者使用指针类型（更符合 Go 惯例）
type ProfileV2 struct {
    UserID int
    Bio    *string  // nil 表示 NULL
    Age    *int
}
```

## 六、批量插入

```go
// 方式 1：逐条插入（性能差，不推荐）
for _, user := range users {
    db.ExecContext(ctx, "INSERT INTO users(name) VALUES(?)", user.Name)
}

// 方式 2：构建多值 INSERT
func BatchInsert(ctx context.Context, db *sql.DB, users []*User) error {
    if len(users) == 0 {
        return nil
    }
    
    // 构建 SQL: INSERT INTO users(name, email) VALUES(?,?),(?,?),...
    placeholders := make([]string, len(users))
    args := make([]interface{}, 0, len(users)*2)
    
    for i, u := range users {
        placeholders[i] = "(?, ?)"
        args = append(args, u.Name, u.Email)
    }
    
    query := "INSERT INTO users(name, email) VALUES " + strings.Join(placeholders, ",")
    
    _, err := db.ExecContext(ctx, query, args...)
    return err
}

// 方式 3：事务批量（适合大量数据，分批提交）
func BatchInsertWithTx(ctx context.Context, db *sql.DB, users []*User, batchSize int) error {
    for i := 0; i < len(users); i += batchSize {
        end := i + batchSize
        if end > len(users) {
            end = len(users)
        }
        batch := users[i:end]
        
        if err := BatchInsert(ctx, db, batch); err != nil {
            return fmt.Errorf("batch %d-%d: %w", i, end, err)
        }
    }
    return nil
}
```

## 七、生产环境最佳实践

### 7.1 健康检查

```go
func (db *DB) Ping(ctx context.Context) error {
    pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
    defer cancel()
    return db.db.PingContext(pingCtx)
}

// HTTP 健康检查接口
func healthHandler(db *DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        if err := db.Ping(r.Context()); err != nil {
            http.Error(w, "database unhealthy", http.StatusServiceUnavailable)
            return
        }
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
    }
}
```

### 7.2 监控连接池指标

```go
import "github.com/prometheus/client_golang/prometheus"

func RecordDBStats(db *sql.DB, dbName string) {
    go func() {
        for range time.Tick(15 * time.Second) {
            stats := db.Stats()
            
            prometheus.MustRegister(prometheus.NewGaugeFunc(
                prometheus.GaugeOpts{
                    Name:        "db_open_connections",
                    ConstLabels: prometheus.Labels{"db": dbName},
                },
                func() float64 { return float64(stats.OpenConnections) },
            ))
            // 同理监控 InUse、Idle、WaitCount、WaitDuration
        }
    }()
}
```

### 7.3 SQL 注入防护

```go
// ❌ 永远不要字符串拼接 SQL（SQL 注入漏洞）
name := "'; DROP TABLE users; --"
query := "SELECT * FROM users WHERE name = '" + name + "'"
db.Query(query) // 危险！

// ✅ 永远使用参数化查询
db.QueryContext(ctx, "SELECT * FROM users WHERE name = ?", name) // 安全
```

## 八、database/sql vs ORM 选择

| | `database/sql` | GORM |
|---|---|---|
| **性能** | 极高 | 略低（反射开销）|
| **控制力** | 完全掌控 SQL | 自动生成 SQL |
| **学习曲线** | 需要写 SQL | 较平缓 |
| **复杂查询** | 灵活 | 有时需要 Raw SQL |
| **适用场景** | 高性能、复杂 SQL | 快速开发、标准 CRUD |

**建议**：
- 新项目 CRUD 为主 → GORM
- 高并发、复杂报表查询 → `database/sql`
- 两者可以共存：GORM 做简单 CRUD，`database/sql` 做复杂查询

## 九、完整示例：Repository 模式

```go
// 完整的 Repository 实现
type SQLUserRepository struct {
    db *sql.DB
}

func (r *SQLUserRepository) FindByEmail(ctx context.Context, email string) (*User, error) {
    var user User
    err := r.db.QueryRowContext(ctx,
        "SELECT id, name, email, created_at FROM users WHERE email = ?",
        email,
    ).Scan(&user.ID, &user.Name, &user.Email, &user.CreatedAt)
    
    if errors.Is(err, sql.ErrNoRows) {
        return nil, ErrNotFound
    }
    if err != nil {
        return nil, fmt.Errorf("FindByEmail: %w", err)
    }
    return &user, nil
}

func (r *SQLUserRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
    var count int
    err := r.db.QueryRowContext(ctx,
        "SELECT COUNT(*) FROM users WHERE email = ?", email,
    ).Scan(&count)
    
    if err != nil {
        return false, fmt.Errorf("ExistsByEmail: %w", err)
    }
    return count > 0, nil
}
```

掌握 `database/sql` 的精髓在于理解连接池、善用 Context 控制超时、正确处理事务和错误，以及始终使用参数化查询。这些基础做好了，你的数据库层代码就已经超越了大多数生产代码。
