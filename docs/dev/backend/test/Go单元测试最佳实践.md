---
title: "Go 单元测试最佳实践：从基础到 Table-Driven 测试"
date: 2026-05-11 08:30:00
author: PFinal南丞
description: "深入讲解 Go 语言单元测试的最佳实践，涵盖基础测试写法、Table-Driven 测试模式、Mock 接口技巧、覆盖率分析与优化、以及如何在 CI/CD 中集成测试。结合实际项目案例，帮助开发者写出高质量的可测试代码。"
keywords:
  - Go测试
  - 单元测试
  - Table-Driven测试
  - Mock
  - 测试覆盖率
  - TDD
tags:
  - golang
  - 测试
  - 后端开发
  - 质量保障
recommend: 后端工程
---

# Go 单元测试最佳实践：从基础到 Table-Driven 测试

## 一、Go 测试基础

### 1.1 测试文件命名与组织

```go
// 文件命名规范
// source.go → source_test.go

// 包组织方式
// 方式一：同包测试（可访问私有函数）
package mypackage

// 方式二：外部测试（黑盒测试）
package mypackage_test  // 添加 _test 后缀
```

### 1.2 基本测试函数

```go
// calc.go
func Add(a, b int) int {
    return a + b
}

// calc_test.go
package mypackage

import "testing"

func TestAdd(t *testing.T) {
    result := Add(1, 2)
    expected := 3
    
    if result != expected {
        t.Errorf("Add(1, 2) = %d; want %d", result, expected)
    }
}
```

**常用方法**：

| 方法 | 用途 |
|------|------|
| `t.Error()` | 报错后继续执行 |
| `t.Errorf()` | 格式化报错，继续执行 |
| `t.Fatal()` | 报错后立即终止 |
| `t.Fatalf()` | 格式化报错，立即终止 |
| `t.Log()` | 打印日志 (-v 时显示) |

### 1.3 Subtest 分组

```go
func TestUserValidation(t *testing.T) {
    t.Run("empty name", func(t *testing.T) {
        err := ValidateUser(User{Name: "", Email: "test@example.com"})
        if err == nil {
            t.Error("expected error for empty name")
        }
    })
    
    t.Run("invalid email", func(t *testing.T) {
        err := ValidateUser(User{Name: "Alice", Email: "invalid"})
        if err == nil {
            t.Error("expected error for invalid email")
        }
    })
}
```

## 二、Table-Driven 测试

### 2.1 标准模式

Table-Driven 测试是 Go 社区的标配模式：

```go
func TestDivide(t *testing.T) {
    tests := []struct {
        name     string
        a, b     float64
        expected float64
        wantErr  bool
    }{
        {
            name:     "正常除法",
            a:        10,
            b:        2,
            expected: 5,
            wantErr:  false,
        },
        {
            name:     "除数为零",
            a:        10,
            b:        0,
            expected: 0,
            wantErr:  true,
        },
        {
            name:     "负数除法",
            a:        -10,
            b:        2,
            expected: -5,
            wantErr:  false,
        },
        {
            name:     "小数结果",
            a:        7,
            b:        2,
            expected: 3.5,
            wantErr:  false,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result, err := Divide(tt.a, tt.b)
            
            if tt.wantErr {
                if err == nil {
                    t.Error("expected an error")
                }
                return
            }
            
            if err != nil {
                t.Errorf("unexpected error: %v", err)
            }
            
            if result != tt.expected {
                t.Errorf("Divide(%v, %v) = %v; want %v",
                    tt.a, tt.b, result, tt.expected)
            }
        })
    }
}
```

### 2.2 HTTP Handler 测试

```go
func TestUserHandler(t *testing.T) {
    tests := []struct {
        name       string
        userID     string
        mockUser   *User
        mockErr    error
        statusCode int
        wantBody   string
    }{
        {
            name:       "获取用户成功",
            userID:     "123",
            mockUser:   &User{ID: "123", Name: "Alice"},
            statusCode: http.StatusOK,
            wantBody:   `{"id":"123","name":"Alice"}`,
        },
        {
            name:       "用户不存在",
            userID:     "999",
            mockErr:    ErrUserNotFound,
            statusCode: http.StatusNotFound,
            wantBody:   `{"error":"user not found"}`,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // 创建 mock 服务
            svc := &mockUserService{
                getUserFunc: func(id string) (*User, error) {
                    if id != tt.userID {
                        t.Errorf("got userID %s; want %s", id, tt.userID)
                    }
                    return tt.mockUser, tt.mockErr
                },
            }
            
            handler := NewUserHandler(svc)
            req := httptest.NewRequest("GET", "/users/"+tt.userID, nil)
            rec := httptest.NewRecorder()
            
            handler.ServeHTTP(rec, req)
            
            if rec.Code != tt.statusCode {
                t.Errorf("status = %d; want %d", rec.Code, tt.statusCode)
            }
            
            body := strings.TrimSpace(rec.Body.String())
            if body != tt.wantBody {
                t.Errorf("body = %s; want %s", body, tt.wantBody)
            }
        })
    }
}
```

## 三、Mock 与接口隔离

### 3.1 面向接口编程

```go
// 定义接口（生产代码）
type UserRepository interface {
    GetByID(id string) (*User, error)
    Save(user *User) error
}

// 生产实现
type postgresUserRepo struct {
    db *sql.DB
}

func (r *postgresUserRepo) GetByID(id string) (*User, error) {
    // 实际数据库查询
}

// 测试实现
type mockUserRepo struct {
    getUserByIDFunc func(id string) (*User, error)
    saveFunc        func(user *User) error
}

func (m *mockUserRepo) GetByID(id string) (*User, error) {
    return m.getUserByIDFunc(id)
}

func (m *mockUserRepo) Save(user *User) error {
    return m.saveFunc(user)
}
```

### 3.2 使用 testify/mock

```go
import "github.com/stretchr/testify/mock"

// 使用 testify 的 mock
type MockUserRepo struct {
    mock.Mock
}

func (m *MockUserRepo) GetByID(id string) (*User, error) {
    args := m.Called(id)
    return args.Get(0).(*User), args.Error(1)
}

func (m *MockUserRepo) Save(user *User) error {
    args := m.Called(user)
    return args.Error(0)
}

// 测试中使用
func TestUserService_Get(t *testing.T) {
    mockRepo := new(MockUserRepo)
    mockRepo.On("GetByID", "123").Return(&User{ID: "123", Name: "Alice"}, nil)
    
    svc := NewUserService(mockRepo)
    user, err := svc.Get("123")
    
    assert.NoError(t, err)
    assert.Equal(t, "Alice", user.Name)
    mockRepo.AssertExpectations(t)
}
```

## 四、测试覆盖率

### 4.1 生成覆盖率报告

```bash
# 运行测试并生成覆盖率文件
go test -coverprofile=coverage.out ./...

# 查看覆盖率概览
go tool cover -func=coverage.out

# 生成 HTML 覆盖率报告
go tool cover -html=coverage.out -o coverage.html

# 按包查看
go test -coverprofile=coverage.out -coverpkg=./... ./...
```

### 4.2 设置覆盖率门槛

```makefile
# Makefile 示例
.PHONY: test-coverage
test-coverage:
    @go test -coverprofile=coverage.out ./...
    @go tool cover -func=coverage.out | tail -1 | awk '{print $$NF}'
    @go tool cover -func=coverage.out | grep -v "100.0%" || true
```

### 4.3 CI 集成

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'
      - run: go test -race -coverprofile=coverage.out -covermode=atomic ./...
      - uses: codecov/codecov-action@v4
        with:
          file: ./coverage.out
```

## 五、代码组织与可测试性

### 5.1 依赖注入

```go
// ❌ 硬编码依赖（不可测试）
type UserService struct {
    db *sql.DB
}

func NewUserService() *UserService {
    db, _ := sql.Open("postgres", "connection-string")
    return &UserService{db: db}
}

// ✅ 依赖注入（可测试）
type UserService struct {
    repo UserRepository
}

func NewUserService(repo UserRepository) *UserService {
    return &UserService{repo: repo}
}
```

### 5.2 避免全局状态

```go
// ❌ 全局变量（测试间互相影响）
var globalConfig = loadConfig()

// ✅ 显式传递
type Service struct {
    config Config
}

func (s *Service) DoSomething() {
    // 使用 s.config
}
```

### 5.3 测试辅助函数

```go
// helper_test.go
package myapp

import (
    "testing"
    "reflect"
)

// 通用的结构体比较
func assertEqual(t *testing.T, got, want interface{}) {
    t.Helper()  // 标记为辅助函数，报错时显示调用者行号
    if !reflect.DeepEqual(got, want) {
        t.Errorf("got %v; want %v", got, want)
    }
}

// 通用错误断言
func assertError(t *testing.T, err error, wantMsg string) {
    t.Helper()
    if err == nil {
        t.Error("expected an error")
        return
    }
    if err.Error() != wantMsg {
        t.Errorf("error = %q; want %q", err.Error(), wantMsg)
    }
}
```

## 六、高级技巧

### 6.1 Golden Files

```go
func TestGenerateReport(t *testing.T) {
    // 使用 golden 文件替代硬编码的期望值
    result := GenerateReport(testData)
    
    golden := filepath.Join("testdata", t.Name()+".golden")
    if *update {  // go test -update
        os.WriteFile(golden, result, 0644)
    }
    
    expected, _ := os.ReadFile(golden)
    if !bytes.Equal(result, expected) {
        t.Errorf("got %s; want %s", result, expected)
    }
}
```

### 6.2 Fuzz Testing

```go
func FuzzParsePhone(f *testing.F) {
    // 种子语料
    f.Add("13800138000")
    f.Add("+86 13800138000")
    f.Add("010-12345678")
    
    f.Fuzz(func(t *testing.T, input string) {
        result := ParsePhone(input)
        // 确保不会 panic
        if result != nil && result.Valid {
            if len(result.Digits) != 11 {
                t.Errorf("invalid digits count: %d", len(result.Digits))
            }
        }
    })
}
```

### 6.3 Race Condition 检测

```go
func TestConcurrentAccess(t *testing.T) {
    cache := NewCache()
    
    // 并发读写测试
    t.Run("concurrent read write", func(t *testing.T) {
        done := make(chan bool)
        
        // 10 个 goroutine 并发写入
        for i := 0; i < 10; i++ {
            go func(val int) {
                cache.Set(fmt.Sprintf("key-%d", val), val)
                done <- true
            }(i)
        }
        
        // 10 个 goroutine 并发读取
        for i := 0; i < 10; i++ {
            go func(val int) {
                cache.Get(fmt.Sprintf("key-%d", val))
                done <- true
            }(i)
        }
        
        // 等待所有 goroutine 完成
        for i := 0; i < 20; i++ {
            <-done
        }
    })
}
```

```bash
# 用 -race 检测竞态条件
go test -race ./...
```

## 七、CI/CD 中的测试

### 7.1 测试分层策略

```yaml
# 本地运行：快速单元测试
# CI 运行：全部测试

make test-unit        # 快速单元测试（秒级）
make test-integration # 集成测试（需要数据库）
make test-e2e        # 端到端测试（需要完整环境）
make test-all        # 全部测试
```

### 7.2 测试跳过

```go
func TestIntegration(t *testing.T) {
    if testing.Short() {
        t.Skip("跳过集成测试")
    }
    // 集成测试代码
}

// go test -short ./...    # 跳过集成测试
// go test ./...           # 运行全部
```

## 八、最佳实践总结

### DO ✅

- ✅ 使用 Table-Driven 测试覆盖多场景
- ✅ 面向接口编程，使代码可 mock
- ✅ 使用 `t.Helper()` 标记辅助函数
- ✅ 使用 `-race` 检测竞态条件
- ✅ 把测试文件和源码放在同目录
- ✅ 使用 `t.Run` 组织子测试
- ✅ 追求**有意义的覆盖率**而非 100%

### DON'T ❌

- ❌ 测试依赖全局状态
- ❌ 在测试中依赖执行顺序
- ❌ 使用 `time.Sleep` 等脆弱等待
- ❌ 测试生产环境（用 mock/testcontainers）
- ❌ 为了 100% 覆盖率写无意义的测试

---

*本文是 Go 质量保障系列的一部分，后续将覆盖集成测试、性能测试、Fuzz testing 等主题。*

## 相关阅读

- [Go 零拷贝读取器实战与原理解析](/dev/backend/golang/Go 零拷贝读取器实战与原理解析)
- [Go 并发模式进阶：高级并发编程技巧](/dev/backend/golang/go-concurrency-patterns-advanced)
- [Go 内存管理与垃圾回收：深入理解 GC 机制](/dev/backend/golang/go-memory-management-gc)
