---
title: Python 时间序列分析：从基础到实战
date: 2026-03-11 00:00:00
description: 深入掌握时间序列分析的核心方法，包括趋势分析、季节性分解、预测建模等实用技术
keywords:
  - Python
  - 时间序列
  - 数据分析
  - Pandas
  - Prophet
  - 机器学习
  - Python 时间序列分析：从基础到实战
  - PFinalClub
  - 技术博客
tags: [Python, 时间序列, 数据分析, Pandas, Prophet, 机器学习]
difficulty: 🟡 进阶
category: dev/backend/python
---

# Python 时间序列分析：从基础到实战

时间序列分析是数据科学中的重要领域，广泛应用于金融、电商、物联网等场景。本文将带你从零开始，系统地掌握时间序列分析的核心方法。

## 📊 时间序列基础

### 1. 时间序列类型

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# 创建时间序列数据
dates = pd.date_range(start='2023-01-01', end='2023-12-31', freq='D')
ts_data = pd.Series(np.random.randn(len(dates)).cumsum(), index=dates)

# 不同频率的时间序列
# 日频率
daily = pd.date_range('2023-01-01', periods=10, freq='D')

# 周频率
weekly = pd.date_range('2023-01-01', periods=10, freq='W')

# 月频率
monthly = pd.date_range('2023-01-01', periods=10, freq='M')

# 季度频率
quarterly = pd.date_range('2023-01-01', periods=4, freq='Q')

# 年频率
yearly = pd.date_range('2023-01-01', periods=5, freq='Y')

# 商业日（排除周末）
business_days = pd.date_range('2023-01-01', periods=10, freq='B')
```

### 2. Pandas 时间序列操作

```python
# 创建时间序列 DataFrame
df = pd.DataFrame({
    'date': pd.date_range('2023-01-01', periods=100, freq='D'),
    'value': np.random.randn(100).cumsum(),
    'category': np.random.choice(['A', 'B', 'C'], 100)
})
df.set_index('date', inplace=True)

# 基础操作
print(df.head())                    # 查看前几行
print(df.index.min())               # 最小日期
print(df.index.max())               # 最大日期
print(df.index.freq)                # 频率信息

# 时间切片
print(df['2023-01'])                # 2023年1月
print(df['2023-01-15':'2023-02-15']) # 日期范围
print(df.loc['2023-01-15'])         # 特定日期

# 时间属性
df['year'] = df.index.year
df['month'] = df.index.month
df['day'] = df.index.day
df['weekday'] = df.index.weekday
df['hour'] = df.index.hour
df['quarter'] = df.index.quarter

# 重新采样
daily_mean = df.resample('D').mean()      # 日均值
weekly_mean = df.resample('W').mean()     # 周均值
monthly_sum = df.resample('M').sum()      # 月总和
quarterly_std = df.resample('Q').std()    # 季度标准差

# 滚动窗口
df['rolling_mean_7'] = df['value'].rolling(window=7).mean()
df['rolling_std_30'] = df['value'].rolling(window=30).std()
df['rolling_max_14'] = df['value'].rolling(window=14).max()

# 扩展窗口
df['expanding_mean'] = df['value'].expanding().mean()
df['expanding_sum'] = df['value'].expanding().sum()

# 时间平移
df['shifted_1'] = df['value'].shift(1)     # 向后平移1天
df['shifted_-1'] = df['value'].shift(-1)   # 向前平移1天

# 时间差分
df['diff_1'] = df['value'].diff(1)        # 一阶差分
df['diff_2'] = df['value'].diff(2)        # 二阶差分

# 百分比变化
df['pct_change'] = df['value'].pct_change()
```

## 🔍 时间序列分解

### 1. 时间序列组成部分

```python
from statsmodels.tsa.seasonal import seasonal_decompose

# 创建带趋势和季节性的时间序列
np.random.seed(42)
dates = pd.date_range('2020-01-01', '2022-12-31', freq='M')
trend = np.linspace(100, 200, len(dates))
seasonal = 20 * np.sin(np.linspace(0, 6*np.pi, len(dates)))
noise = np.random.normal(0, 10, len(dates))
ts_data = trend + seasonal + noise

# 创建 Series
ts = pd.Series(ts_data, index=dates, name='value')

# 时间序列分解
result = seasonal_decompose(ts, model='additive', period=12)

# 可视化分解结果
fig, axes = plt.subplots(4, 1, figsize=(12, 10))

result.observed.plot(ax=axes[0], title='原始数据')
result.trend.plot(ax=axes[1], title='趋势')
result.seasonal.plot(ax=axes[2], title='季节性')
result.resid.plot(ax=axes[3], title='残差')

plt.tight_layout()
plt.show()

# 获取分解结果
trend_component = result.trend
seasonal_component = result.seasonal
residual_component = result.resid

# 乘法模型分解
result_mul = seasonal_decompose(ts, model='multiplicative', period=12)
```

### 2. 季节性分析

```python
# 按季节性周期聚合
df['month'] = df.index.month
monthly_avg = df.groupby('month')['value'].mean()

fig, axes = plt.subplots(1, 2, figsize=(14, 6))

# 月度平均值
monthly_avg.plot(kind='bar', ax=axes[0])
axes[0].set_title('月度平均值')
axes[0].set_xlabel('月份')
axes[0].set_ylabel('平均值')

# 季度箱线图
df['quarter'] = df.index.quarter
import seaborn as sns
sns.boxplot(data=df, x='quarter', y='value', ax=axes[1])
axes[1].set_title('季度分布')
axes[1].set_xlabel('季度')
axes[1].set_ylabel('数值')

plt.tight_layout()
plt.show()
```

## 📈 平稳性检验

### 1. 可视化检验

```python
# 创建平稳和非平稳时间序列
np.random.seed(42)
dates = pd.date_range('2020-01-01', '2022-12-31', freq='M')

# 平稳时间序列（白噪声）
stationary_ts = pd.Series(np.random.normal(0, 1, len(dates)), index=dates)

# 非平稳时间序列（带趋势）
non_stationary_ts = pd.Series(np.linspace(0, 50, len(dates)) + np.random.normal(0, 1, len(dates)), 
                               index=dates)

# 可视化对比
fig, axes = plt.subplots(2, 2, figsize=(14, 10))

stationary_ts.plot(ax=axes[0, 0], title='平稳时间序列')
non_stationary_ts.plot(ax=axes[0, 1], title='非平稳时间序列（带趋势）')

# 自相关图
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf

plot_acf(stationary_ts, lags=20, ax=axes[1, 0])
axes[1, 0].set_title('平稳序列自相关图')

plot_acf(non_stationary_ts, lags=20, ax=axes[1, 1])
axes[1, 1].set_title('非平稳序列自相关图')

plt.tight_layout()
plt.show()
```

### 2. 统计检验

```python
from statsmodels.tsa.stattools import adfuller, kpss

# ADF 检验（Augmented Dickey-Fuller）
def adf_test(series):
    result = adfuller(series)
    print('ADF 统计量:', result[0])
    print('p值:', result[1])
    print('临界值:', result[4])
    print('结论: 平稳' if result[1] < 0.05 else '结论: 非平稳')
    return result

print('平稳序列 ADF 检验:')
adf_test(stationary_ts)

print('\n非平稳序列 ADF 检验:')
adf_test(non_stationary_ts)

# KPSS 检验（Kwiatkowski-Phillips-Schmidt-Shin）
def kpss_test(series):
    result = kpss(series)
    print('KPSS 统计量:', result[0])
    print('p值:', result[1])
    print('临界值:', result[3])
    print('结论: 非平稳' if result[1] < 0.05 else '结论: 平稳')
    return result

print('\n平稳序列 KPSS 检验:')
kpss_test(stationary_ts)
```

## 🎯 时间序列预测模型

### 1. 移动平均和指数平滑

```python
from statsmodels.tsa.holtwinters import SimpleExpSmoothing, ExponentialSmoothing

# 创建销售数据
np.random.seed(42)
dates = pd.date_range('2020-01-01', '2023-12-31', freq='M')
trend = np.linspace(100, 200, len(dates))
seasonal = 20 * np.sin(np.linspace(0, 4*np.pi, len(dates)))
sales = trend + seasonal + np.random.normal(0, 10, len(dates))
sales = pd.Series(sales, index=dates, name='sales')

# 简单指数平滑
ses_model = SimpleExpSmoothing(sales).fit(smoothing_level=0.2)
ses_forecast = ses_model.forecast(12)

# Holt 线性趋势
holt_model = ExponentialSmoothing(sales, trend='add').fit()
holt_forecast = holt_model.forecast(12)

# Holt-Winters 季节性模型
hw_model = ExponentialSmoothing(sales, 
                                 trend='add', 
                                 seasonal='add', 
                                 seasonal_periods=12).fit()
hw_forecast = hw_model.forecast(12)

# 可视化预测结果
fig, ax = plt.subplots(figsize=(12, 6))

# 历史数据
ax.plot(sales.index, sales.values, label='历史数据', linewidth=2)

# 预测数据
forecast_dates = pd.date_range(sales.index[-1] + pd.Timedelta(days=1), 
                                periods=12, freq='M')
ax.plot(forecast_dates, ses_forecast, label='简单指数平滑', linestyle='--')
ax.plot(forecast_dates, holt_forecast, label='Holt 模型', linestyle='--')
ax.plot(forecast_dates, hw_forecast, label='Holt-Winters 模型', linestyle='--')

ax.set_title('时间序列预测对比')
ax.set_xlabel('日期')
ax.set_ylabel('销售额')
ax.legend()
ax.grid(True, alpha=0.3)

plt.tight_layout()
plt.show()
```

### 2. ARIMA 模型

```python
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX

# 使用 Box-Cox 变换使数据更平稳
from scipy.stats import boxcox

# 检查平稳性，进行差分
sales_diff = sales.diff().dropna()

# 确定 ARIMA 参数
# ACF 和 PACF 图用于确定 p 和 q
fig, axes = plt.subplots(1, 2, figsize=(14, 4))

plot_acf(sales_diff, lags=20, ax=axes[0])
axes[0].set_title('ACF 图')

plot_pacf(sales_diff, lags=20, ax=axes[1])
axes[1].set_title('PACF 图')

plt.tight_layout()
plt.show()

# ARIMA 模型
# p: 自回归阶数
# d: 差分阶数
# q: 移动平均阶数
arima_model = ARIMA(sales, order=(2, 1, 2)).fit()
arima_forecast = arima_model.forecast(12)

# SARIMA 模型（带季节性）
sarima_model = SARIMAX(sales, 
                       order=(1, 1, 1),
                       seasonal_order=(1, 1, 1, 12)).fit()
sarima_forecast = sarima_model.forecast(12)

# 模型诊断
print(arima_model.summary())

# 模型评估
def evaluate_forecast(actual, predicted):
    errors = actual - predicted
    mse = np.mean(errors**2)
    rmse = np.sqrt(mse)
    mae = np.mean(np.abs(errors))
    mape = np.mean(np.abs(errors / actual)) * 100
    
    print(f'MSE: {mse:.2f}')
    print(f'RMSE: {rmse:.2f}')
    print(f'MAE: {mae:.2f}')
    print(f'MAPE: {mape:.2f}%')
    
    return {'MSE': mse, 'RMSE': rmse, 'MAE': mae, 'MAPE': mape}

# 使用历史数据进行交叉验证
train_size = int(len(sales) * 0.8)
train, test = sales[:train_size], sales[train_size:]

arima_model_train = ARIMA(train, order=(2, 1, 2)).fit()
arima_forecast_train = arima_model_train.forecast(len(test))

print('ARIMA 模型评估:')
evaluate_forecast(test.values, arima_forecast_train.values)
```

### 3. Prophet 模型

```python
from prophet import Prophet

# Prophet 要求数据列名为 ds 和 y
prophet_df = pd.DataFrame({
    'ds': sales.index,
    'y': sales.values
})

# 创建 Prophet 模型
model = Prophet(
    yearly_seasonality=True,
    weekly_seasonality=True,
    daily_seasonality=False,
    seasonality_mode='additive',
    interval_width=0.95  # 预测区间宽度
)

# 添加自定义季节性
model.add_seasonality(name='monthly', period=30.5, fourier_order=5)

# 拟合模型
model.fit(prophet_df)

# 创建未来日期
future_dates = model.make_future_dataframe(periods=12, freq='M')

# 预测
forecast = model.predict(future_dates)

# 可视化预测结果
fig1 = model.plot(forecast)
plt.title('Prophet 预测结果')
plt.show()

# 可视化组件
fig2 = model.plot_components(forecast)
plt.tight_layout()
plt.show()

# 提取预测数据
forecast_data = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]
print(forecast_data.tail(12))
```

## 🔧 实战案例：电商销售预测

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from prophet import Prophet
from statsmodels.tsa.statespace.sarimax import SARIMAX
from sklearn.metrics import mean_absolute_error, mean_squared_error

# 1. 数据准备
np.random.seed(42)
dates = pd.date_range('2020-01-01', '2023-12-31', freq='D')

# 创建更真实的销售数据
base_trend = np.linspace(100, 300, len(dates))
weekly_seasonality = 30 * np.sin(2 * np.pi * np.arange(len(dates)) / 7)
yearly_seasonality = 50 * np.sin(2 * np.pi * np.arange(len(dates)) / 365)
holiday_effect = np.random.choice([0, 50], len(dates), p=[0.9, 0.1])
noise = np.random.normal(0, 20, len(dates))

sales = base_trend + weekly_seasonality + yearly_seasonality + holiday_effect + noise
sales = np.maximum(sales, 0)  # 确保销售额为正

df = pd.DataFrame({
    'date': dates,
    'sales': sales
})
df.set_index('date', inplace=True)

# 2. 数据探索
fig, axes = plt.subplots(3, 1, figsize=(14, 12))

# 销售趋势
axes[0].plot(df.index, df['sales'], linewidth=1)
axes[0].set_title('每日销售额趋势')
axes[0].set_ylabel('销售额')
axes[0].grid(True, alpha=0.3)

# 月度销售
monthly_sales = df.resample('M').sum()
axes[1].plot(monthly_sales.index, monthly_sales['sales'], 
              marker='o', linewidth=2)
axes[1].set_title('月度销售额')
axes[1].set_ylabel('销售额')
axes[1].grid(True, alpha=0.3)

# 季节性分解
from statsmodels.tsa.seasonal import seasonal_decompose
result = seasonal_decompose(df['sales'], model='additive', period=365)
result.seasonal[:365].plot(ax=axes[2])
axes[2].set_title('季节性成分（365天）')
axes[2].set_ylabel('季节性')
axes[2].grid(True, alpha=0.3)

plt.tight_layout()
plt.show()

# 3. 数据预处理
# 处理异常值
q1 = df['sales'].quantile(0.25)
q3 = df['sales'].quantile(0.75)
iqr = q3 - q1
lower_bound = q1 - 1.5 * iqr
upper_bound = q3 + 1.5 * iqr

df['sales_cleaned'] = df['sales'].clip(lower_bound, upper_bound)

# 4. 模型训练
# 划分训练集和测试集
train_size = int(len(df) * 0.8)
train_df = df[:train_size]
test_df = df[train_size:]

# Prophet 模型
prophet_train = pd.DataFrame({
    'ds': train_df.index,
    'y': train_df['sales_cleaned']
})

prophet_model = Prophet(
    yearly_seasonality=True,
    weekly_seasonality=True,
    daily_seasonality=False,
    seasonality_mode='additive'
)
prophet_model.fit(prophet_train)

# 预测
future_dates = prophet_model.make_future_dataframe(periods=len(test_df), freq='D')
prophet_forecast = prophet_model.predict(future_dates)

# SARIMA 模型
sarima_model = SARIMAX(train_df['sales_cleaned'],
                       order=(1, 1, 1),
                       seasonal_order=(1, 1, 1, 7)).fit()
sarima_forecast = sarima_model.forecast(len(test_df))

# 5. 模型评估
def evaluate_model(y_true, y_pred):
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100
    
    return {
        'MAE': mae,
        'RMSE': rmse,
        'MAPE': mape
    }

# Prophet 评估
prophet_test_pred = prophet_forecast.loc[test_df.index, 'yhat']
prophet_metrics = evaluate_model(test_df['sales_cleaned'], prophet_test_pred)

# SARIMA 评估
sarima_metrics = evaluate_model(test_df['sales_cleaned'], sarima_forecast)

print('Prophet 模型评估:')
print(prophet_metrics)

print('\nSARIMA 模型评估:')
print(sarima_metrics)

# 6. 可视化预测结果
fig, ax = plt.subplots(figsize=(14, 6))

# 历史数据
ax.plot(train_df.index, train_df['sales_cleaned'], 
        label='训练集', alpha=0.7, linewidth=1)
ax.plot(test_df.index, test_df['sales_cleaned'], 
        label='测试集', alpha=0.7, linewidth=1)

# Prophet 预测
ax.plot(test_df.index, prophet_test_pred, 
        label='Prophet 预测', linewidth=2, linestyle='--')

# SARIMA 预测
ax.plot(test_df.index, sarima_forecast, 
        label='SARIMA 预测', linewidth=2, linestyle='--')

ax.set_title('销售预测模型对比')
ax.set_xlabel('日期')
ax.set_ylabel('销售额')
ax.legend()
ax.grid(True, alpha=0.3)

plt.tight_layout()
plt.show()

# 7. 未来预测
# 使用最佳模型预测未来30天
best_model = prophet_model
future_30d = best_model.make_future_dataframe(periods=30, freq='D')
forecast_30d = best_model.predict(future_30d)

# 提取预测数据
forecast_data = forecast_30d[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]
print('\n未来30天预测:')
print(forecast_data.tail(30).to_string())
```

## 📚 最佳实践

### 1. 数据预处理

```python
# 缺失值处理
df['sales'] = df['sales'].interpolate()  # 线性插值
# 或
df['sales'] = df['sales'].fillna(method='ffill')  # 前向填充

# 异常值处理
from scipy import stats
z_scores = stats.zscore(df['sales'])
df_clean = df[abs(z_scores) < 3]  # 移除3倍标准差外的数据

# 数据变换
df['log_sales'] = np.log(df['sales'])  # 对数变换
df['boxcox_sales'], _ = boxcox(df['sales'])  # Box-Cox 变换
```

### 2. 特征工程

```python
# 创建时间特征
df['year'] = df.index.year
df['month'] = df.index.month
df['day'] = df.index.day
df['dayofweek'] = df.index.dayofweek
df['is_weekend'] = df.index.dayofweek >= 5

# 滞后特征
for lag in [1, 2, 3, 7, 30]:
    df[f'sales_lag_{lag}'] = df['sales'].shift(lag)

# 滚动窗口特征
df['rolling_mean_7'] = df['sales'].rolling(window=7).mean()
df['rolling_std_7'] = df['sales'].rolling(window=7).std()

# 百分比变化
df['pct_change'] = df['sales'].pct_change()

# 扩展窗口特征
df['expanding_mean'] = df['sales'].expanding().mean()
```

### 3. 模型选择建议

```python
# 根据数据特征选择模型
# 短期预测（< 30天）：简单模型如移动平均、指数平滑
# 中期预测（1-3个月）：ARIMA、SARIMA
# 长期预测（> 3个月）：Prophet、机器学习模型

# 季节性明显：SARIMA、Prophet
# 趋势明显：Holt-Winters、Prophet
# 数据量大：Prophet、深度学习模型
# 需要解释性：ARIMA、Prophet
```

## 🎓 学习路径

1. **时间序列基础**（2周）
   - 时间序列类型和操作
   - 时间序列分解
   - 平稳性检验

2. **传统预测模型**（3周）
   - 移动平均和指数平滑
   - ARIMA 模型
   - SARIMA 模型

3. **现代预测模型**（3周）
   - Prophet 模型
   - 深度学习模型（LSTM、GRU）
   - 集成方法

4. **实战项目**（4周）
   - 销售预测
   - 股价预测
   - 需求预测

## 📖 推荐资源

- **官方文档**
  - [Pandas 时间序列文档](https://pandas.pydata.org/pandas-docs/stable/user_guide/timeseries.html)
  - [Statsmodels 时间序列文档](https://www.statsmodels.org/stable/tsa.html)
  - [Prophet 文档](https://facebook.github.io/prophet/)

- **推荐书籍**
  - 《Forecasting: Principles and Practice》- Rob J Hyndman
  - 《Time Series Analysis and Its Applications》- Robert H. Shumway

- **在线课程**
  - Coursera - Practical Time Series Analysis
  - Kaggle - Time Series forecasting

掌握时间序列分析，为业务决策提供强有力的数据支持！
