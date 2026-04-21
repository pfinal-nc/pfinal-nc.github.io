---
title: "GORM 实战教程：Go 语言 ORM 从入门到高级"
date: 2026-04-21 10:30:00
author: PFinal南丞
description: "全面讲解 GORM v2 的使用：模型定义、CRUD、关联查询、事务、软删除、钩子、性能优化，以及与 MySQL/PostgreSQL 的最佳实践。"
keywords:
  - GORM
  - Go ORM
  - GORM v2
  - Go 数据库
  - GORM 关联查询
tags:
  - golang
  - gorm
  - database
  - tutorial
---

# GORM 实战教程：Go 语言 ORM 从入门到高级

> GORM 是 Go 生态中最流行的 ORM 库，星标 38k+。GORM v2 支持 MySQL、PostgreSQL、SQLite、SQL Server，提供了链式 API、关联预加载、软删除等强大特性。

## 一、安装与连接

```bash
go get -u gorm.io/gorm
go get -u gorm.io/driver/mysql
go get -u gorm.io/driver/postgres
```

```go
import (
    "gorm.io/driver/mysql"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

// MySQL 连接
func NewMySQL() *gorm.DB {
    dsn := "user:pass@tcp(127.0.0.1:3306)/dbname?charset=utf8mb4&parseTime=True&loc=Local"
    db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
        Logger: logger.Default.LogMode(logger.Info),  // 开发模式打印 SQL
        NowFunc: func() time.Time {
            return time.Now().Local()
        },
    })
    if err != nil {
        panic("数据库连接失败: " + err.Error())
    }

    // 连接池配置
    sqlDB, _ := db.DB()
    sqlDB.SetMaxIdleConns(10)
    sqlDB.SetMaxOpenConns(100)
    sqlDB.SetConnMaxLifetime(time.Hour)

    return db
}

// PostgreSQL 连接
func NewPostgres() *gorm.DB {
    dsn := "host=localhost user=postgres password=pass dbname=mydb port=5432 sslmode=disable"
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        panic(err)
    }
    return db
}
```

---

## 二、模型定义

```go
// 嵌入 gorm.Model（包含 ID, CreatedAt, UpdatedAt, DeletedAt）
type User struct {
    gorm.Model
    Name     string `gorm:"type:varchar(100);not null"`
    Email    string `gorm:"type:varchar(200);uniqueIndex;not null"`
    Password string `gorm:"type:varchar(255);not null"`
    Age      int    `gorm:"check:age > 0"`
    Role     string `gorm:"type:varchar(20);default:'user'"`
    IsActive bool   `gorm:"default:true"`

    // 关联
    Profile  Profile   `gorm:"foreignKey:UserID"`
    Articles []Article `gorm:"foreignKey:AuthorID"`
}

// 自定义表名
func (User) TableName() string {
    return "tbl_users"
}

// 文章模型
type Article struct {
    gorm.Model
    Title    string `gorm:"type:varchar(200);not null"`
    Content  string `gorm:"type:text"`
    AuthorID uint
    Author   User       `gorm:"foreignKey:AuthorID"`
    Tags     []Tag      `gorm:"many2many:article_tags;"`
    Category Category   `gorm:"foreignKey:CategoryID"`
    CategoryID uint
}

// 标签模型
type Tag struct {
    gorm.Model
    Name     string    `gorm:"uniqueIndex"`
    Articles []Article `gorm:"many2many:article_tags;"`
}

// 自动迁移
db.AutoMigrate(&User{}, &Article{}, &Tag{})
```

### GORM Tag 速查

| Tag | 说明 |
|-----|------|
| `column:name` | 列名 |
| `type:varchar(100)` | 列类型 |
| `primaryKey` | 主键 |
| `unique` | 唯一约束 |
| `uniqueIndex` | 唯一索引 |
| `index` | 普通索引 |
| `not null` | 非空 |
| `default:'value'` | 默认值 |
| `autoIncrement` | 自增 |
| `size:255` | 字段大小 |
| `-` | 忽略此字段 |

---

## 三、CRUD 操作

### 3.1 创建

```go
// 创建单条记录
user := User{Name: "张三", Email: "zhangsan@example.com"}
result := db.Create(&user)
fmt.Println(user.ID)          // 自动填充 ID
fmt.Println(result.Error)     // 错误信息
fmt.Println(result.RowsAffected) // 影响行数

// 批量创建（高性能）
users := []User{
    {Name: "用户1", Email: "user1@example.com"},
    {Name: "用户2", Email: "user2@example.com"},
    {Name: "用户3", Email: "user3@example.com"},
}
db.CreateInBatches(users, 100) // 每批 100 条

// 忽略某些字段
db.Omit("CreatedAt").Create(&user)

// 只保存指定字段
db.Select("Name", "Email").Create(&user)
```

### 3.2 查询

```go
// 根据主键查询
var user User
db.First(&user, 1)                // SELECT * FROM users WHERE id = 1 LIMIT 1
db.First(&user, "id = ?", 1)     // 等同
db.Take(&user, 1)                 // 不排序，更快

// 条件查询
db.Where("name = ?", "张三").First(&user)
db.Where("name = ? AND email = ?", "张三", "zhangsan@example.com").First(&user)

// 结构体条件（零值字段不作为条件）
db.Where(&User{Name: "张三", Role: "admin"}).Find(&users)

// Map 条件（零值也作为条件）
db.Where(map[string]interface{}{"name": "张三", "age": 0}).Find(&users)

// IN 查询
db.Where("id IN ?", []int{1, 2, 3}).Find(&users)

// LIKE 查询
db.Where("name LIKE ?", "%张%").Find(&users)

// 范围查询
db.Where("age BETWEEN ? AND ?", 18, 30).Find(&users)

// 查询所有
var allUsers []User
db.Find(&allUsers)

// 计数
var count int64
db.Model(&User{}).Where("is_active = ?", true).Count(&count)

// 分页
db.Offset(20).Limit(10).Find(&users)

// 排序
db.Order("created_at DESC, name ASC").Find(&users)

// 选择字段
db.Select("id", "name", "email").Find(&users)

// 查询到 Map
var result map[string]interface{}
db.Model(&User{}).Where("id = ?", 1).Take(&result)
```

### 3.3 更新

```go
// 保存（全字段更新，包括零值）
db.Save(&user)

// 更新单个字段
db.Model(&user).Update("name", "新名字")

// 更新多个字段（结构体，零值不更新）
db.Model(&user).Updates(User{Name: "新名字", Age: 30})

// 更新多个字段（Map，零值也更新）
db.Model(&user).Updates(map[string]interface{}{
    "name":      "新名字",
    "age":       0,
    "is_active": false,
})

// 条件更新
db.Model(&User{}).Where("age < ?", 18).Update("role", "minor")

// 更新指定列（避免更新 hook 误触发）
db.Model(&user).UpdateColumn("login_count", gorm.Expr("login_count + ?", 1))

// Select 指定字段更新
db.Model(&user).Select("Name", "Age").Updates(User{Name: "新名字", Age: 0})
```

### 3.4 删除

```go
// 软删除（模型包含 DeletedAt）
db.Delete(&user)
// UPDATE users SET deleted_at = NOW() WHERE id = ?

// 永久删除
db.Unscoped().Delete(&user)

// 批量删除
db.Where("is_active = ?", false).Delete(&User{})

// 查询时包含软删除的记录
db.Unscoped().Find(&users)
```

---

## 四、关联查询

### 4.1 预加载（Preload）

```go
// 预加载关联（避免 N+1 问题）
var articles []Article
db.Preload("Author").Preload("Tags").Find(&articles)

// 条件预加载
db.Preload("Articles", "published = ?", true).Find(&users)

// 嵌套预加载
db.Preload("Author.Profile").Find(&articles)

// 全部关联
db.Preload(clause.Associations).Find(&articles)
```

### 4.2 Joins

```go
// JOIN 查询
var results []struct {
    ArticleID uint
    Title     string
    AuthorName string
}
db.Table("articles").
    Select("articles.id AS article_id, articles.title, users.name AS author_name").
    Joins("LEFT JOIN users ON users.id = articles.author_id").
    Where("articles.deleted_at IS NULL").
    Scan(&results)
```

### 4.3 关联操作

```go
// 添加标签（多对多）
db.Model(&article).Association("Tags").Append([]Tag{
    {Name: "Golang"},
    {Name: "教程"},
})

// 替换关联
db.Model(&article).Association("Tags").Replace(newTags)

// 删除关联（仅删除关联，不删除 Tag 本身）
db.Model(&article).Association("Tags").Delete(tag)

// 清空关联
db.Model(&article).Association("Tags").Clear()

// 统计关联数量
count := db.Model(&article).Association("Tags").Count()
```

---

## 五、事务

```go
// 自动事务
err := db.Transaction(func(tx *gorm.DB) error {
    // 在事务中使用 tx 而不是 db
    if err := tx.Create(&user).Error; err != nil {
        return err  // 返回错误，自动回滚
    }
    if err := tx.Create(&profile).Error; err != nil {
        return err
    }
    return nil  // 返回 nil，自动提交
})

// 手动事务
tx := db.Begin()
defer func() {
    if r := recover(); r != nil {
        tx.Rollback()
    }
}()

if err := tx.Create(&user).Error; err != nil {
    tx.Rollback()
    return err
}

if err := tx.Create(&profile).Error; err != nil {
    tx.Rollback()
    return err
}

return tx.Commit().Error

// 嵌套事务（SavePoint）
db.Transaction(func(tx *gorm.DB) error {
    tx.Create(&user1)

    tx.Transaction(func(tx2 *gorm.DB) error {
        tx2.Create(&user2)
        return errors.New("回滚 user2")  // 只回滚 user2
    })

    return nil  // user1 提交
})
```

---

## 六、钩子（Hooks）

```go
// BeforeCreate：创建前执行
func (u *User) BeforeCreate(tx *gorm.DB) error {
    // 密码哈希
    hashed, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
    if err != nil {
        return err
    }
    u.Password = string(hashed)
    return nil
}

// AfterCreate：创建后执行
func (u *User) AfterCreate(tx *gorm.DB) error {
    // 发送欢迎邮件、初始化用户配置等
    return sendWelcomeEmail(u.Email)
}

// BeforeUpdate：更新前执行
func (u *User) BeforeUpdate(tx *gorm.DB) error {
    if tx.Statement.Changed("Password") {
        hashed, _ := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
        tx.Statement.SetColumn("Password", string(hashed))
    }
    return nil
}

// BeforeDelete：软删除前执行
func (u *User) BeforeDelete(tx *gorm.DB) error {
    if u.Role == "admin" {
        return errors.New("管理员账号不能删除")
    }
    return nil
}
```

---

## 七、性能优化

### 7.1 避免 N+1 问题

```go
// ❌ N+1 问题（查询 N 篇文章，再查 N 次作者）
var articles []Article
db.Find(&articles)
for _, a := range articles {
    db.First(&a.Author, a.AuthorID)
}

// ✅ 使用 Preload（1+1 次查询）
db.Preload("Author").Find(&articles)

// ✅ 使用 Joins（1次查询）
db.Joins("Author").Find(&articles)
```

### 7.2 批量操作

```go
// 批量插入（比逐条插入快 10 倍以上）
db.CreateInBatches(users, 100)

// 使用 FindInBatches 处理大量数据
db.Where("is_active = ?", true).FindInBatches(&users, 100, func(tx *gorm.DB, batch int) error {
    for _, user := range users {
        processUser(user)
    }
    return nil
})
```

### 7.3 索引优化

```go
// 复合索引
type Article struct {
    gorm.Model
    AuthorID   uint   `gorm:"index:idx_author_status"`
    Status     string `gorm:"index:idx_author_status"`
    PublishedAt time.Time `gorm:"index"`
}

// 手动创建索引
db.Exec("CREATE INDEX idx_users_email ON users(email)")
```

---

## 八、常见问题解决

```go
// 1. 查询不到数据时返回默认值
var user User
result := db.First(&user, id)
if errors.Is(result.Error, gorm.ErrRecordNotFound) {
    // 处理未找到的情况
}

// 2. 防止 SQL 注入（始终使用参数化查询）
// ❌ 危险
db.Where("name = '" + name + "'").Find(&users)

// ✅ 安全
db.Where("name = ?", name).Find(&users)

// 3. 调试：打印 SQL
db.Debug().Where("name = ?", "张三").Find(&users)

// 4. 原生 SQL
db.Raw("SELECT * FROM users WHERE age > ?", 18).Scan(&users)
db.Exec("UPDATE users SET status = ? WHERE id = ?", "active", 1)
```

---

## 总结

GORM 的最佳实践：

1. **始终使用参数化查询**，防止 SQL 注入
2. **Preload 解决 N+1**，大数据量用 Joins
3. **批量操作**代替循环单条，性能提升显著
4. **事务保障数据一致性**，记得错误时回滚
5. **钩子处理业务逻辑**（密码哈希、审计日志等）
6. **AutoMigrate 仅用于开发**，生产环境用迁移脚本

---

*作者：PFinal南丞 | 更新时间：2026-04-21*
