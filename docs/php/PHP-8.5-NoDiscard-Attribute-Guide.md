---
title: PHP 8.5 NoDiscard Attribute - The Ultimate Guide to Eliminating Silent Errors
date: 2025-07-19 10:30:00
tags:
    - PHP
    - PHP8.5
    - Attributes
keywords:
  - php 8.5 nodiscard attribute
  - php 8.5 新特性
  - php attributes 完整指南
  - php return value checking
  - php code quality 2025
  - php programming best practices
  - php 8.5 属性详解
  - php silent errors prevention
  - php modern features
  - php 8.5 tutorial
description: Comprehensive guide to PHP 8.5's new #[\NoDiscard] attribute, including its purpose, usage methods, practical examples, and best practices to help developers improve code quality and avoid silent errors.
author: PFinal南丞
---

# PHP 8.5 NoDiscard Attribute: The Ultimate Guide to Eliminating Silent Errors

> In PHP 8.5, a seemingly simple but profoundly impactful feature quietly debuted—the `#[\NoDiscard]` attribute. While this attribute may appear unassuming, it helps us avoid "silent errors" in our code, making our applications more robust and reliable.

## Introduction: Why Do We Need #[\NoDiscard]?

In daily development, have you ever encountered scenarios like this:

```php
// A common mistake: forgetting to handle return values
$result = validateUserInput($data);
// Forgetting to check $result, proceeding directly
processData($data);
```

If `validateUserInput()` returns error information but we don't check it, the program continues execution, potentially leading to subsequent logic errors. This is what we call "silent errors"—the program doesn't crash, but its behavior doesn't meet expectations.

The `#[\NoDiscard]` attribute introduced in PHP 8.5 was born to solve this problem.

## What is the #[\NoDiscard] Attribute?

`#[\NoDiscard]` is a new built-in attribute in PHP 8.5 used to mark that the return value of a function or method must be used. If developers don't use the return value, PHP will issue a warning.

### Basic Syntax

```php
#[\NoDiscard]
function validateUserInput(array $data): ValidationResult
{
    // Validation logic
    return new ValidationResult($isValid, $errors);
}
```

### Usage Scenarios

```php
// Correct usage
$result = validateUserInput($data);
if (!$result->isValid()) {
    throw new InvalidArgumentException($result->getErrors());
}

// Incorrect usage - will trigger warning
validateUserInput($data); // Warning: Return value not used
```

## Practical Application Examples

### Example 1: Database Operation Validation

```php
class DatabaseManager
{
    #[\NoDiscard]
    public function executeQuery(string $sql, array $params = []): QueryResult
    {
        $stmt = $this->pdo->prepare($sql);
        $success = $stmt->execute($params);
        
        if (!$success) {
            throw new DatabaseException("Query execution failed: " . implode(", ", $stmt->errorInfo()));
        }
        
        return new QueryResult($stmt);
    }
}

// Usage example
$db = new DatabaseManager();

// Correct usage
$result = $db->executeQuery("SELECT * FROM users WHERE id = ?", [1]);
$users = $result->fetchAll();

// Incorrect usage - will trigger warning
$db->executeQuery("SELECT * FROM users WHERE id = ?", [1]); // Warning!
```

### Example 2: API Response Handling

```php
class ApiClient
{
    #[\NoDiscard]
    public function makeRequest(string $endpoint, array $data = []): ApiResponse
    {
        $response = $this->httpClient->post($endpoint, $data);
        
        if ($response->getStatusCode() >= 400) {
            throw new ApiException("API request failed: " . $response->getBody());
        }
        
        return new ApiResponse($response);
    }
}

// Usage example
$api = new ApiClient();

// Correct usage
$response = $api->makeRequest('/users', ['name' => 'John']);
$userData = $response->getData();

// Incorrect usage - will trigger warning
$api->makeRequest('/users', ['name' => 'John']); // Warning!
```

### Example 3: Configuration Validation

```php
class ConfigValidator
{
    #[\NoDiscard]
    public function validateConfig(array $config): ValidationResult
    {
        $errors = [];
        
        if (!isset($config['database'])) {
            $errors[] = 'Database configuration missing';
        }
        
        if (!isset($config['api_key'])) {
            $errors[] = 'API key missing';
        }
        
        return new ValidationResult(empty($errors), $errors);
    }
}

// Usage example
$validator = new ConfigValidator();

// Correct usage
$result = $validator->validateConfig($config);
if (!$result->isValid()) {
    throw new ConfigurationException("Configuration error: " . implode(", ", $result->getErrors()));
}

// Incorrect usage - will trigger warning
$validator->validateConfig($config); // Warning!
```

## Best Practices and Considerations

### 1. When to Use #[\NoDiscard]

**Recommended scenarios:**
- Validation functions (input validation, configuration validation)
- Database operation results
- API call results
- File operation results
- Any function that may return error information

**Not recommended scenarios:**
- Simple calculation functions
- Logging functions
- Side-effect functions (sending emails, writing logs)

### 2. Using with Other Attributes

```php
#[\NoDiscard]
#[\Pure] // Indicates the function has no side effects
function calculateTax(float $amount, float $rate): float
{
    return $amount * $rate;
}

#[\NoDiscard]
#[\Throws(DatabaseException::class)] // Possible exceptions
public function saveUser(User $user): SaveResult
{
    // Save logic
    return new SaveResult($success, $id);
}
```

### 3. Using in Class Methods

```php
class UserService
{
    #[\NoDiscard]
    public function createUser(array $userData): UserCreationResult
    {
        // Validate data
        $validationResult = $this->validateUserData($userData);
        if (!$validationResult->isValid()) {
            return UserCreationResult::failure($validationResult->getErrors());
        }
        
        // Create user
        $user = new User($userData);
        $this->repository->save($user);
        
        return UserCreationResult::success($user);
    }
    
    #[\NoDiscard]
    private function validateUserData(array $data): ValidationResult
    {
        $errors = [];
        
        if (empty($data['email'])) {
            $errors[] = 'Email cannot be empty';
        }
        
        if (empty($data['password'])) {
            $errors[] = 'Password cannot be empty';
        }
        
        return new ValidationResult(empty($errors), $errors);
    }
}
```

## Migration Strategy

### Migrating from Older Versions

If you're migrating from PHP 8.4 or earlier to PHP 8.5, follow these steps:

1. **Identify candidate functions**: Find all functions that may return important information
2. **Add attributes gradually**: Add a few at a time to avoid making too many changes at once
3. **Fix warnings**: Handle all warnings caused by unused return values
4. **Test and verify**: Ensure the modified code behaves correctly

### Example Migration Process

```php
// Before migration
function validateEmail(string $email): bool
{
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

// After migration
#[\NoDiscard]
function validateEmail(string $email): ValidationResult
{
    $isValid = filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    $errors = $isValid ? [] : ['Invalid email format'];
    
    return new ValidationResult($isValid, $errors);
}
```

## Performance Considerations

The `#[\NoDiscard]` attribute is checked at compile time and has no runtime performance overhead. It only helps us discover potential issues during development.

## Comparison with Other Languages

### Rust's #[must_use]

```rust
#[must_use]
fn validate_input(input: &str) -> Result<(), String> {
    if input.is_empty() {
        return Err("Input cannot be empty".to_string());
    }
    Ok(())
}
```

### TypeScript's @returns

```typescript
/**
 * @returns {ValidationResult} Validation result
 */
function validateInput(input: string): ValidationResult {
    // Validation logic
    return new ValidationResult(isValid, errors);
}
```

PHP's `#[\NoDiscard]` is similar to these language features, all designed to ensure return values are properly handled.

## Common Issues and Solutions

### Issue 1: False Warnings

Sometimes we genuinely don't need to use return values, such as in test code:

```php
// Solution: Use @ to suppress warnings
@validateUserInput($data);

// Or better solution: Refactor the function
validateUserInputWithoutReturn($data);
```

### Issue 2: Method Chaining

```php
// Problem: Method chaining may ignore return values
$result = $db->executeQuery("SELECT * FROM users")
    ->fetchAll(); // If fetchAll() is also marked with #[\NoDiscard]

// Solution: Ensure each step is properly handled
$queryResult = $db->executeQuery("SELECT * FROM users");
$users = $queryResult->fetchAll();
```

## Summary

The `#[\NoDiscard]` attribute is a seemingly simple but very practical feature in PHP 8.5. It helps us:

1. **Improve code quality**: Avoid silent errors
2. **Enhance maintainability**: Force developers to handle important return values
3. **Improve development experience**: Discover issues during development
4. **Increase code robustness**: Reduce runtime errors

While this attribute isn't a panacea, it's an excellent tool that can help us write more robust and reliable code. When used appropriately, it can significantly improve your code quality.

Remember, good programming habits aren't just about writing code that works, but about writing code that's less likely to fail. The `#[\NoDiscard]` attribute is a powerful tool that helps us achieve this goal.

---

*"Code quality is not accidental, but achieved through continuous effort and the right tools."* — This statement is perfectly embodied in PHP 8.5's `#[\NoDiscard]` attribute. 