---
title: Python 数据分析入门：Pandas 与 NumPy 基础
date: 2026-03-11
description: 深入理解 Pandas 和 NumPy 的核心概念，掌握数据分析的基础技能，从数据处理到可视化完整流程
tags: [Python, Pandas, NumPy, 数据分析, 数据科学]
difficulty: 🟢 入门
category: dev/backend/python
---

# Python 数据分析入门：Pandas 与 NumPy 基础

数据分析是 Python 最重要的应用领域之一，而 Pandas 和 NumPy 是数据分析的两大基石。本文将带你从零开始，系统地掌握这两大核心库的使用方法。

## 📊 为什么选择 Pandas 和 NumPy？

### Pandas vs NumPy

| 特性 | Pandas | NumPy |
|------|--------|-------|
| **核心数据结构** | DataFrame（二维表格） | ndarray（多维数组） |
| **适用场景** | 结构化数据分析、表格处理 | 数值计算、线性代数 |
| **索引系统** | 强大的标签索引 | 基于位置的索引 |
| **缺失值处理** | 自动处理 | 需要手动处理 |
| **性能** | 较慢（但易用） | 极快（底层 C 实现） |

### 两者协同工作

```python
import pandas as pd
import numpy as np

# NumPy 提供底层计算能力
arr = np.random.randn(10000, 3)

# Pandas 提供友好的数据接口
df = pd.DataFrame(arr, columns=['A', 'B', 'C'])
```

## 🚀 快速开始：环境搭建

### 安装必要的库

```bash
# 基础数据分析三剑客
pip install pandas numpy matplotlib

# 可选：Jupyter 环境（推荐）
pip install jupyterlab

# 可选：高级可视化
pip install seaborn plotly
```

### 推荐的开发环境

- **Jupyter Notebook**：适合探索性数据分析
- **JupyterLab**：功能更强大，支持多文件编辑
- **VS Code + Python 扩展**：适合开发完整项目
- **PyCharm**：适合大型项目

## 🔢 NumPy 基础

### 1. 创建数组

```python
import numpy as np

# 从列表创建
arr = np.array([1, 2, 3, 4, 5])

# 创建全零数组
zeros = np.zeros((3, 4))  # 3行4列

# 创建全一数组
ones = np.ones((2, 3))

# 创建单位矩阵
identity = np.eye(3)

# 创建范围数组
range_arr = np.arange(0, 10, 2)  # [0, 2, 4, 6, 8]

# 创建等差数组
linspace = np.linspace(0, 10, 5)  # [0, 2.5, 5, 7.5, 10]

# 创建随机数组
random = np.random.randn(2, 3)  # 标准正态分布
```

### 2. 数组操作

```python
# 数组运算
a = np.array([1, 2, 3])
b = np.array([4, 5, 6])

# 逐元素运算
print(a + b)    # [5, 7, 9]
print(a * b)    # [4, 10, 18]
print(a ** 2)   # [1, 4, 9]

# 矩阵乘法
A = np.array([[1, 2], [3, 4]])
B = np.array([[5, 6], [7, 8]])
print(A @ B)   # 矩阵乘法

# 广播机制
arr = np.array([[1, 2, 3], [4, 5, 6]])
print(arr + 10)  # 每个元素加10
```

### 3. 数组切片与索引

```python
arr = np.array([[1, 2, 3, 4],
                [5, 6, 7, 8],
                [9, 10, 11, 12]])

# 基本切片
print(arr[0, 1])       # 2
print(arr[:, 0])       # [1, 5, 9]
print(arr[1:, 1:3])    # [[6, 7], [10, 11]]

# 布尔索引
mask = arr > 5
print(arr[mask])       # 所有大于5的元素

# 高级索引
print(arr[[0, 2], [1, 3]])  # [2, 12]
```

### 4. 数组统计函数

```python
arr = np.random.randn(5, 3)

# 基本统计
print(arr.mean())      # 平均值
print(arr.std())       # 标准差
print(arr.var())       # 方差
print(arr.sum())       # 求和
print(arr.min())       # 最小值
print(arr.max())       # 最大值

# 沿轴统计
print(arr.mean(axis=0))    # 每列的平均值
print(arr.mean(axis=1))    # 每行的平均值

# 累计操作
print(arr.cumsum())   # 累计和
print(arr.cumprod())  # 累计积
```

## 📊 Pandas 基础

### 1. 数据结构：Series

```python
import pandas as pd

# 创建 Series
s = pd.Series([1, 3, 5, np.nan, 6, 8])

# 带索引的 Series
s = pd.Series([10, 20, 30], 
              index=['a', 'b', 'c'],
              name='values')

# Series 操作
print(s[0])        # 按位置索引
print(s['a'])      # 按标签索引
print(s.mean())    # 统计操作
print(s.describe())# 描述统计
```

### 2. 数据结构：DataFrame

```python
# 从字典创建
data = {
    'Name': ['Alice', 'Bob', 'Charlie'],
    'Age': [25, 30, 35],
    'City': ['New York', 'London', 'Paris']
}
df = pd.DataFrame(data)

# 从 NumPy 数组创建
arr = np.random.randn(4, 3)
df = pd.DataFrame(arr, 
                  columns=['A', 'B', 'C'],
                  index=['row1', 'row2', 'row3', 'row4'])

# 从 CSV 文件读取
# df = pd.read_csv('data.csv')

# 查看数据
print(df.head())      # 前5行
print(df.tail())      # 后5行
print(df.info())      # 数据类型信息
print(df.describe())  # 描述统计
print(df.shape)       # (4, 3) 形状
print(df.columns)     # 列名
print(df.index)       # 索引
```

### 3. 数据选择与过滤

```python
# 创建示例数据
df = pd.DataFrame({
    'A': [1, 2, 3, 4, 5],
    'B': [10, 20, 30, 40, 50],
    'C': ['a', 'b', 'c', 'd', 'e']
}, index=['row1', 'row2', 'row3', 'row4', 'row5'])

# 选择列
print(df['A'])              # 单列（Series）
print(df[['A', 'B']])       # 多列（DataFrame）

# 选择行（按标签）
print(df.loc['row1'])           # 单行
print(df.loc[['row1', 'row2']]) # 多行

# 选择行（按位置）
print(df.iloc[0])              # 第1行
print(df.iloc[0:2])            # 前两行

# 混合选择
print(df.loc['row1':'row3', 'A':'B'])  # 切片

# 条件过滤
print(df[df['A'] > 2])                  # A > 2 的行
print(df[(df['A'] > 2) & (df['B'] < 50)])  # 多条件
print(df[df['C'].isin(['a', 'c'])])    # 成员判断
```

### 4. 数据清洗

```python
# 创建带缺失值的数据
df = pd.DataFrame({
    'A': [1, 2, np.nan, 4, 5],
    'B': [10, np.nan, np.nan, 40, 50],
    'C': [100, 200, 300, 400, 500]
})

# 检测缺失值
print(df.isnull())
print(df.isnull().sum())  # 每列缺失值数量

# 处理缺失值
df_drop = df.dropna()           # 删除包含缺失值的行
df_fill = df.fillna(0)          # 用0填充
df_fill_mean = df.fillna(df.mean())  # 用平均值填充
df_forward = df.fillna(method='ffill')  # 前向填充

# 删除重复行
df_dup = pd.DataFrame({
    'A': [1, 1, 2, 2, 3],
    'B': [10, 10, 20, 20, 30]
})
df_no_dup = df_dup.drop_duplicates()

# 数据类型转换
df['A'] = df['A'].astype(int)
df['B'] = df['B'].astype(float)
df['C'] = df['C'].astype(str)
```

### 5. 数据操作

```python
# 添加列
df['D'] = df['A'] + df['B']

# 删除列
df = df.drop('D', axis=1)

# 排序
df_sorted = df.sort_values('A')         # 按A列排序
df_sorted = df.sort_values(['A', 'B']) # 多列排序
df_sorted = df.sort_index()             # 按索引排序

# 分组聚合
df = pd.DataFrame({
    'Category': ['A', 'A', 'B', 'B', 'A'],
    'Value': [10, 20, 30, 40, 50]
})
grouped = df.groupby('Category')
print(grouped.mean())      # 每组的平均值
print(grouped.sum())       # 每组的和
print(grouped.count())    # 每组的计数

# 合并数据
df1 = pd.DataFrame({'key': ['A', 'B'], 'value1': [1, 2]})
df2 = pd.DataFrame({'key': ['A', 'B'], 'value2': [3, 4]})

# 内连接
merged = pd.merge(df1, df2, on='key')

# 左连接
merged_left = pd.merge(df1, df2, on='key', how='left')

# 外连接
merged_outer = pd.merge(df1, df2, on='key', how='outer')

# 拼接数据
concatenated = pd.concat([df1, df2], axis=0)  # 纵向拼接
concatenated = pd.concat([df1, df2], axis=1)  # 横向拼接
```

## 📈 数据可视化

### 基础可视化

```python
import matplotlib.pyplot as plt

# 创建示例数据
df = pd.DataFrame({
    'Year': [2018, 2019, 2020, 2021, 2022],
    'Revenue': [100, 120, 150, 180, 200],
    'Profit': [20, 30, 40, 50, 60]
})

# 折线图
plt.figure(figsize=(10, 6))
plt.plot(df['Year'], df['Revenue'], label='Revenue')
plt.plot(df['Year'], df['Profit'], label='Profit')
plt.xlabel('Year')
plt.ylabel('Amount')
plt.title('Company Performance')
plt.legend()
plt.show()

# 柱状图
plt.figure(figsize=(10, 6))
df.plot(kind='bar', x='Year', y=['Revenue', 'Profit'])
plt.title('Company Performance by Year')
plt.show()

# 散点图
plt.figure(figsize=(10, 6))
plt.scatter(df['Revenue'], df['Profit'])
plt.xlabel('Revenue')
plt.ylabel('Profit')
plt.title('Revenue vs Profit')
plt.show()
```

### Seaborn 高级可视化

```python
import seaborn as sns

# 创建示例数据
tips = sns.load_dataset('tips')

# 箱线图
plt.figure(figsize=(10, 6))
sns.boxplot(x='day', y='total_bill', data=tips)
plt.title('Total Bill by Day')
plt.show()

# 小提琴图
plt.figure(figsize=(10, 6))
sns.violinplot(x='day', y='total_bill', data=tips)
plt.title('Total Bill Distribution by Day')
plt.show()

# 热力图
plt.figure(figsize=(10, 6))
numeric_df = tips.select_dtypes(include=[np.number])
sns.heatmap(numeric_df.corr(), annot=True, cmap='coolwarm')
plt.title('Correlation Matrix')
plt.show()

# 分布图
plt.figure(figsize=(10, 6))
sns.histplot(tips['total_bill'], kde=True)
plt.title('Distribution of Total Bill')
plt.show()
```

## 🎯 实战案例：电商数据分析

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# 模拟电商数据
np.random.seed(42)
dates = pd.date_range(start='2023-01-01', end='2023-12-31', freq='D')
df = pd.DataFrame({
    'date': dates,
    'sales': np.random.randint(100, 500, len(dates)),
    'visitors': np.random.randint(1000, 5000, len(dates)),
    'conversion_rate': np.random.uniform(0.02, 0.08, len(dates))
})

# 添加月份和星期
df['month'] = df['date'].dt.month
df['weekday'] = df['date'].dt.day_name()

# 按月统计
monthly_sales = df.groupby('month')['sales'].sum()
print("Monthly Sales:")
print(monthly_sales)

# 按星期统计
weekday_sales = df.groupby('weekday')['sales'].mean()
print("\nAverage Sales by Weekday:")
print(weekday_sales)

# 可视化月度销售
plt.figure(figsize=(12, 6))
monthly_sales.plot(kind='bar')
plt.title('Monthly Sales in 2023')
plt.xlabel('Month')
plt.ylabel('Total Sales')
plt.xticks(range(12), ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])
plt.show()

# 销售与访客量的关系
plt.figure(figsize=(10, 6))
plt.scatter(df['visitors'], df['sales'])
plt.xlabel('Visitors')
plt.ylabel('Sales')
plt.title('Sales vs Visitors')
plt.show()

# 计算相关性
correlation = df[['sales', 'visitors', 'conversion_rate']].corr()
print("\nCorrelation Matrix:")
print(correlation)
```

## 📚 最佳实践

### 1. 性能优化

```python
# 使用向量化操作而不是循环
# 慢
for i in range(len(df)):
    df.loc[i, 'C'] = df.loc[i, 'A'] + df.loc[i, 'B']

# 快
df['C'] = df['A'] + df['B']

# 使用 NumPy 数组进行数值计算
arr = df['A'].values
result = np.log(arr)  # 比用 Pandas 快得多
```

### 2. 内存优化

```python
# 查看内存使用
print(df.info(memory_usage='deep'))

# 优化数据类型
df['category_col'] = df['category_col'].astype('category')  # 分类数据
df['int_col'] = df['int_col'].astype('int32')              # 减少整数类型
df['float_col'] = df['float_col'].astype('float32')        # 减少浮点类型

# 分块读取大文件
chunk_size = 10000
for chunk in pd.read_csv('large_file.csv', chunksize=chunk_size):
    process(chunk)
```

### 3. 代码风格

```python
# 使用链式操作
result = (df
    .groupby('category')
    .agg({'sales': 'sum', 'profit': 'mean'})
    .sort_values('sales', ascending=False)
    .head(10)
)

# 给列和索引起有意义的名字
df = df.rename(columns={
    'A': 'total_sales',
    'B': 'total_profit'
})
```

## 🎓 学习路径

1. **NumPy 基础**（1-2周）
   - 数组创建和操作
   - 切片和索引
   - 统计函数

2. **Pandas 基础**（2-3周）
   - Series 和 DataFrame
   - 数据选择和过滤
   - 数据清洗

3. **数据操作**（2-3周）
   - 分组聚合
   - 数据合并
   - 时间序列处理

4. **数据可视化**（2-3周）
   - Matplotlib 基础
   - Seaborn 高级图表
   - 交互式可视化（Plotly）

## 📖 推荐资源

- **官方文档**
  - [NumPy 官方文档](https://numpy.org/doc/)
  - [Pandas 官方文档](https://pandas.pydata.org/docs/)

- **推荐书籍**
  - 《Python for Data Analysis》- Wes McKinney
  - 《Hands-On Machine Learning》- Aurélien Géron

- **在线课程**
  - Kaggle Learn - Pandas 和 NumPy
  - Coursera - Applied Data Science with Python

## 🚀 下一步

掌握了 Pandas 和 NumPy 基础后，你可以学习：
- 数据清洗和特征工程
- 时间序列分析
- 机器学习基础
- 大数据处理（Dask、PySpark）

数据分析是数据科学的基础，打好基础将为后续学习机器学习、深度学习等高级主题奠定坚实基础。持续练习，多看实战案例，你将很快成为一名优秀的数据分析师！
