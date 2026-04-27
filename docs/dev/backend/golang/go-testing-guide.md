---
title: Go 单元测试实战：表驱动测试、Mock 与基准测试
date: 2026-04-27
tags: [Golang, 测试, 单元测试, TDD]
description: 系统讲解 Go 测试体系：testing 包基础、表驱动测试范式、testify 断言库、接口 Mock、HTTP Handler 测试、基准测试（Benchmark）与模糊测试（Fuzz）。
---

# Go 单元测试实战：表驱动测试、Mock 与基准测试

良好的测试是工程质量的保证。Go 内置了完善的测试工具链，本文带你系统掌握 Go 测试最佳实践。

## 一、testing 包基础

```go
// calculator.go
package calc

func Add(a, b int) int   { return a + b }
func Sub(a, b int) int   { return a - b }
func Mul(a, b int) int   { return a * b }
func Div(a, b int) (int, error) {
    if b == 0 {
        return 0, errors.New("除数不能为 0")
    }
    return a / b, nil
}
```

```go
// calculator_test.go
package calc

import "testing"

// 测试函数必须以 Test 开头，接收 *testing.T
func TestAdd(t *testing.T) {
    result := Add(2, 3)
    if result != 5 {
        t.Errorf("Add(2, 3) = %d, 期望 5", result)
    }
}

// t.Fatal 失败后立即停止当前测试
func TestDiv(t *testing.T) {
    _, err := Div(10, 0)
    if err == nil {
        t.Fatal("期望返回错误，但得到 nil")
    }
    
    result, err := Div(10, 2)
    if err != nil {
        t.Fatalf("意外错误: %v", err)
    }
    if result != 5 {
        t.Errorf("Div(10, 2) = %d, 期望 5", result)
    }
}
```

运行测试：

```bash
# 当前包
go test ./...

# 显示详细输出
go test -v ./...

# 运行特定测试
go test -run TestAdd ./...

# 显示覆盖率
go test -cover ./...

# 生成覆盖率报告
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

## 二、表驱动测试（Table-Driven Tests）

表驱动测试是 Go 社区最推荐的测试范式，将多个测试用例组织为数据表：

```go
func TestAdd(t *testing.T) {
    // 定义测试用例表
    tests := []struct {
        name     string // 测试用例名称
        a, b     int
        expected int
    }{
        {"正数相加", 2, 3, 5},
        {"负数相加", -1, -2, -3},
        {"正负混合", 5, -3, 2},
        {"零值", 0, 0, 0},
    }
    
    for _, tt := range tests {
        // t.Run 创建子测试，方便单独运行
        t.Run(tt.name, func(t *testing.T) {
            result := Add(tt.a, tt.b)
            if result != tt.expected {
                t.Errorf("Add(%d, %d) = %d, 期望 %d",
                    tt.a, tt.b, result, tt.expected)
            }
        })
    }
}

// 运行特定子测试
// go test -run TestAdd/正数相加
```

### 更复杂的表驱动测试

```go
func TestDivision(t *testing.T) {
    tests := []struct {
        name        string
        a, b        int
        expected    int
        expectError bool
        errMsg      string
    }{
        {
            name:     "正常除法",
            a: 10, b: 2,
            expected: 5,
        },
        {
            name:        "除以零",
            a: 10, b: 0,
            expectError: true,
            errMsg:      "除数不能为 0",
        },
        {
            name:     "整除",
            a: 9, b: 3,
            expected: 3,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result, err := Div(tt.a, tt.b)
            
            if tt.expectError {
                if err == nil {
                    t.Error("期望返回错误，但得到 nil")
                    return
                }
                if tt.errMsg != "" && err.Error() != tt.errMsg {
                    t.Errorf("错误信息 = %q, 期望 %q", err.Error(), tt.errMsg)
                }
                return
            }
            
            if err != nil {
                t.Fatalf("意外错误: %v", err)
            }
            if result != tt.expected {
                t.Errorf("Div(%d, %d) = %d, 期望 %d",
                    tt.a, tt.b, result, tt.expected)
            }
        })
    }
}
```

## 三、testify 断言库

标准库的 `t.Errorf` 需要手写断言，推荐使用 `github.com/stretchr/testify`：

```bash
go get github.com/stretchr/testify
```

```go
import (
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestWithTestify(t *testing.T) {
    // assert：失败后继续执行
    assert.Equal(t, 5, Add(2, 3))
    assert.NotEqual(t, 0, Add(1, 1))
    assert.Nil(t, nil)
    assert.NotNil(t, "value")
    assert.True(t, 1 < 2)
    assert.Contains(t, "hello world", "world")
    assert.Len(t, []int{1, 2, 3}, 3)
    
    // require：失败后立即停止（Fatal）
    user, err := getUser(1)
    require.NoError(t, err)  // 等价于 t.Fatal
    require.NotNil(t, user)
    
    // 带格式化消息
    assert.Equal(t, 5, Add(2, 3), "Add 函数结果不正确，参数: %d, %d", 2, 3)
    
    // 错误断言
    _, err = Div(10, 0)
    assert.Error(t, err)
    assert.EqualError(t, err, "除数不能为 0")
    assert.ErrorIs(t, err, ErrDivByZero)
}
```

### testify suite（测试套件）

```go
import (
    "testing"
    "github.com/stretchr/testify/suite"
)

type UserServiceSuite struct {
    suite.Suite
    service *UserService
    db      *sql.DB
}

// 整个套件运行前执行一次
func (s *UserServiceSuite) SetupSuite() {
    s.db = setupTestDB()
}

// 整个套件运行后执行一次
func (s *UserServiceSuite) TearDownSuite() {
    s.db.Close()
}

// 每个测试前执行
func (s *UserServiceSuite) SetupTest() {
    s.service = NewUserService(s.db)
    clearTestData(s.db)
}

func (s *UserServiceSuite) TestCreateUser() {
    user, err := s.service.Create("Alice", "alice@example.com")
    s.Require().NoError(err)
    s.Equal("Alice", user.Name)
    s.NotEmpty(user.ID)
}

func (s *UserServiceSuite) TestGetUser_NotFound() {
    _, err := s.service.Get(99999)
    s.ErrorIs(err, ErrNotFound)
}

// 入口
func TestUserService(t *testing.T) {
    suite.Run(t, new(UserServiceSuite))
}
```

## 四、Mock 测试

### 4.1 接口 + 手写 Mock

```go
// 定义接口（方便 Mock）
type UserRepository interface {
    GetByID(ctx context.Context, id int) (*User, error)
    Create(ctx context.Context, user *User) error
    Delete(ctx context.Context, id int) error
}

// Service 依赖接口
type UserService struct {
    repo UserRepository
}

func NewUserService(repo UserRepository) *UserService {
    return &UserService{repo: repo}
}

func (s *UserService) GetUser(ctx context.Context, id int) (*User, error) {
    user, err := s.repo.GetByID(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("GetUser: %w", err)
    }
    return user, nil
}
```

```go
// 手写 Mock
type MockUserRepository struct {
    users  map[int]*User
    errors map[int]error
}

func NewMockRepo() *MockUserRepository {
    return &MockUserRepository{
        users:  make(map[int]*User),
        errors: make(map[int]error),
    }
}

func (m *MockUserRepository) GetByID(_ context.Context, id int) (*User, error) {
    if err, ok := m.errors[id]; ok {
        return nil, err
    }
    if user, ok := m.users[id]; ok {
        return user, nil
    }
    return nil, ErrNotFound
}

func (m *MockUserRepository) Create(_ context.Context, user *User) error {
    m.users[user.ID] = user
    return nil
}

func (m *MockUserRepository) Delete(_ context.Context, id int) error {
    delete(m.users, id)
    return nil
}

// 测试
func TestGetUser(t *testing.T) {
    mock := NewMockRepo()
    mock.users[1] = &User{ID: 1, Name: "Alice"}
    mock.errors[2] = ErrNotFound
    
    svc := NewUserService(mock)
    
    t.Run("正常获取", func(t *testing.T) {
        user, err := svc.GetUser(context.Background(), 1)
        require.NoError(t, err)
        assert.Equal(t, "Alice", user.Name)
    })
    
    t.Run("用户不存在", func(t *testing.T) {
        _, err := svc.GetUser(context.Background(), 2)
        assert.ErrorIs(t, err, ErrNotFound)
    })
}
```

### 4.2 使用 mockery 自动生成 Mock

```bash
# 安装
go install github.com/vektra/mockery/v2@latest

# 生成 Mock（根据接口自动生成）
mockery --name=UserRepository --output=./mocks
```

生成的 Mock 支持更强大的断言：

```go
import "github.com/stretchr/testify/mock"

func TestGetUserWithMockery(t *testing.T) {
    mockRepo := mocks.NewUserRepository(t)
    
    // 设置期望
    mockRepo.On("GetByID", mock.Anything, 1).
        Return(&User{ID: 1, Name: "Alice"}, nil)
    
    svc := NewUserService(mockRepo)
    user, err := svc.GetUser(context.Background(), 1)
    
    require.NoError(t, err)
    assert.Equal(t, "Alice", user.Name)
    
    // 验证 Mock 被调用
    mockRepo.AssertExpectations(t)
    mockRepo.AssertNumberOfCalls(t, "GetByID", 1)
}
```

## 五、HTTP Handler 测试

```go
import (
    "net/http"
    "net/http/httptest"
    "testing"
)

func TestGetUserHandler(t *testing.T) {
    mockRepo := NewMockRepo()
    mockRepo.users[1] = &User{ID: 1, Name: "Alice", Email: "alice@example.com"}
    
    handler := NewUserHandler(NewUserService(mockRepo))
    router := setupRouter(handler)
    
    tests := []struct {
        name       string
        url        string
        wantStatus int
        wantBody   string
    }{
        {
            name:       "正常获取",
            url:        "/users/1",
            wantStatus: http.StatusOK,
            wantBody:   `"name":"Alice"`,
        },
        {
            name:       "用户不存在",
            url:        "/users/999",
            wantStatus: http.StatusNotFound,
        },
        {
            name:       "无效 ID",
            url:        "/users/abc",
            wantStatus: http.StatusBadRequest,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            req := httptest.NewRequest(http.MethodGet, tt.url, nil)
            w := httptest.NewRecorder()
            
            router.ServeHTTP(w, req)
            
            resp := w.Result()
            assert.Equal(t, tt.wantStatus, resp.StatusCode)
            
            if tt.wantBody != "" {
                body, _ := io.ReadAll(resp.Body)
                assert.Contains(t, string(body), tt.wantBody)
            }
        })
    }
}

// 测试带 JSON Body 的 POST 请求
func TestCreateUserHandler(t *testing.T) {
    payload := `{"name":"Bob","email":"bob@example.com"}`
    
    req := httptest.NewRequest(
        http.MethodPost,
        "/users",
        strings.NewReader(payload),
    )
    req.Header.Set("Content-Type", "application/json")
    
    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)
    
    assert.Equal(t, http.StatusCreated, w.Code)
}
```

## 六、基准测试（Benchmark）

```go
// 基准测试以 Benchmark 开头
func BenchmarkAdd(b *testing.B) {
    // b.N 是框架自动调整的迭代次数
    for i := 0; i < b.N; i++ {
        Add(100, 200)
    }
}

// 比较两种实现的性能
func BenchmarkStringConcat(b *testing.B) {
    b.Run("加号拼接", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            s := ""
            for j := 0; j < 100; j++ {
                s += "x"
            }
            _ = s
        }
    })
    
    b.Run("Builder", func(b *testing.B) {
        for i := 0; i < b.N; i++ {
            var sb strings.Builder
            for j := 0; j < 100; j++ {
                sb.WriteString("x")
            }
            _ = sb.String()
        }
    })
}

// 重置计时器（排除 Setup 时间）
func BenchmarkHeavy(b *testing.B) {
    data := prepareTestData() // 这部分不计入基准
    
    b.ResetTimer() // 从这里开始计时
    
    for i := 0; i < b.N; i++ {
        processData(data)
    }
}

// 并行基准测试
func BenchmarkParallel(b *testing.B) {
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            Add(1, 2)
        }
    })
}
```

```bash
# 运行基准测试
go test -bench=. ./...

# 指定运行时间
go test -bench=. -benchtime=5s ./...

# 显示内存分配
go test -bench=. -benchmem ./...

# 输出示例
# BenchmarkAdd-8      1000000000    0.3ns/op
# BenchmarkStringConcat/加号拼接-8   100000    15432 ns/op   26208 B/op   99 allocs/op
# BenchmarkStringConcat/Builder-8    500000     2891 ns/op     568 B/op    2 allocs/op
```

## 七、模糊测试（Fuzz，Go 1.18+）

```go
// 模糊测试会自动生成随机输入
func FuzzReverse(f *testing.F) {
    // 提供种子语料库
    f.Add("hello")
    f.Add("world")
    f.Add("")
    
    f.Fuzz(func(t *testing.T, s string) {
        // 性质：翻转两次等于原字符串
        result := Reverse(Reverse(s))
        if result != s {
            t.Errorf("Reverse(Reverse(%q)) = %q, 期望 %q", s, result, s)
        }
    })
}

// 运行模糊测试（持续生成输入，找崩溃）
// go test -fuzz=FuzzReverse -fuzztime=30s
```

## 八、测试辅助工具

### 8.1 TestMain — 全局测试设置

```go
func TestMain(m *testing.M) {
    // 所有测试运行前的全局设置
    db = setupTestDB()
    
    // 运行测试
    code := m.Run()
    
    // 所有测试运行后的清理
    db.Close()
    
    os.Exit(code)
}
```

### 8.2 t.Helper() — 改善错误提示

```go
// 使用 t.Helper() 标记辅助函数，错误会指向调用方而非辅助函数内部
func assertUserEqual(t *testing.T, got, want *User) {
    t.Helper() // 关键！
    if got.Name != want.Name {
        t.Errorf("Name: got %q, want %q", got.Name, want.Name)
    }
    if got.Email != want.Email {
        t.Errorf("Email: got %q, want %q", got.Email, want.Email)
    }
}
```

### 8.3 t.Parallel() — 并行测试

```go
func TestConcurrent(t *testing.T) {
    tests := []struct {
        name string
        id   int
    }{
        {"user1", 1},
        {"user2", 2},
        {"user3", 3},
    }
    
    for _, tt := range tests {
        tt := tt // 关键！捕获循环变量
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel() // 标记为可并行运行
            
            user, err := getUser(tt.id)
            require.NoError(t, err)
            assert.NotNil(t, user)
        })
    }
}
```

## 九、最佳实践总结

| 实践 | 建议 |
|------|------|
| 测试文件命名 | `xxx_test.go`，同包（白盒）或 `xxx_test` 包（黑盒）|
| 测试函数命名 | `Test[Function]_[Scenario]`，如 `TestGetUser_NotFound` |
| 首选表驱动 | 多个用例用 `tests []struct{...}` |
| 用 testify | `require.NoError` + `assert.Equal` 替代手写断言 |
| 接口隔离 | 依赖注入 + 接口 → 方便 Mock |
| 覆盖率目标 | 核心业务逻辑 > 80%，边界条件全覆盖 |
| 避免过度 Mock | 集成测试 > 单元测试 Mock 一切 |

良好的测试不只是保证代码正确，更是**活文档**和**设计反馈**。难以测试的代码往往是设计出了问题。
