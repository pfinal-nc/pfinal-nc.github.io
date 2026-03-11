---
title: Python 推荐系统实战：从算法到应用
date: 2026-03-11
description: 全面掌握推荐系统技术，从协同过滤到深度学习，构建个性化推荐引擎
tags: [Python, 推荐系统, 机器学习, 深度学习, 协同过滤]
difficulty: 🟡 进阶
category: dev/backend/python
---

# Python 推荐系统实战：从算法到应用

推荐系统是现代互联网应用的核心技术，为用户提供个性化内容推荐。本文将带你从零开始，系统地掌握推荐系统的核心技术和实践方法。

## 🎯 推荐系统概述

### 1. 推荐系统类型

```python
"""
推荐系统主要类型：

1. 协同过滤（Collaborative Filtering）
   - 基于用户（User-based）
   - 基于物品（Item-based）
   - 矩阵分解（Matrix Factorization）

2. 基于内容（Content-based）
   - 基于物品属性
   - 基于用户画像
   - 混合方法

3. 深度学习推荐
   - 神经协同过滤
   - 深度兴趣网络
   - Wide & Deep 模型

4. 其他方法
   - 关联规则（Association Rules）
   - 基于图（Graph-based）
   - 强化学习（Reinforcement Learning）
"""
```

### 2. 推荐系统评估指标

```python
"""
关键评估指标：

1. 离线评估
   - 准确率（Accuracy）
   - 召回率（Recall）
   - F1 分数（F1-Score）
   - AUC
   - NDCG（Normalized Discounted Cumulative Gain）
   - MAP（Mean Average Precision）

2. 在线评估
   - 点击率（CTR）
   - 转化率（CVR）
   - 停留时长（Dwell Time）
   - GMV（Gross Merchandise Volume）

3. 多样性指标
   - 覆盖率（Coverage）
   - 多样性（Diversity）
   - 新颖性（Novelty）
"""
```

## 📊 数据准备

### 1. 创建模拟数据

```python
import pandas as pd
import numpy as np

# 创建用户-物品评分矩阵
np.random.seed(42)

# 模拟参数
n_users = 1000
n_items = 500
n_ratings = 10000

# 生成随机数据
user_ids = np.random.randint(0, n_users, n_ratings)
item_ids = np.random.randint(0, n_items, n_ratings)
ratings = np.random.randint(1, 6, n_ratings)  # 1-5 星评分
timestamps = np.random.randint(1609459200, 1640995200, n_ratings)  # 2021年的时间戳

# 创建 DataFrame
ratings_df = pd.DataFrame({
    'user_id': user_ids,
    'item_id': item_ids,
    'rating': ratings,
    'timestamp': timestamps
})

# 创建物品元数据
items_df = pd.DataFrame({
    'item_id': range(n_items),
    'category': np.random.choice(['Electronics', 'Books', 'Clothing', 'Home', 'Sports'], n_items),
    'price': np.random.uniform(10, 200, n_items),
    'brand': np.random.choice(['BrandA', 'BrandB', 'BrandC'], n_items)
})

# 创建用户元数据
users_df = pd.DataFrame({
    'user_id': range(n_users),
    'age': np.random.randint(18, 70, n_users),
    'gender': np.random.choice(['M', 'F'], n_users),
    'location': np.random.choice(['NY', 'LA', 'SF', 'Chicago'], n_users)
})

print("评分数据样例:")
print(ratings_df.head())
print("\n物品元数据样例:")
print(items_df.head())
print("\n用户元数据样例:")
print(users_df.head())
```

### 2. 数据预处理

```python
from sklearn.model_selection import train_test_split

# 分割训练集和测试集
train_df, test_df = train_test_split(
    ratings_df,
    test_size=0.2,
    random_state=42,
    stratify=ratings_df['user_id']
)

print(f"训练集大小: {len(train_df)}")
print(f"测试集大小: {len(test_df)}")

# 创建用户-物品矩阵
def create_user_item_matrix(df):
    """创建用户-物品评分矩阵"""
    matrix = df.pivot(
        index='user_id',
        columns='item_id',
        values='rating'
    ).fillna(0)
    
    return matrix

train_matrix = create_user_item_matrix(train_df)
test_matrix = create_user_item_matrix(test_df)

print(f"\n训练矩阵形状: {train_matrix.shape}")
print(f"测试矩阵形状: {test_matrix.shape}")

# 计算稀疏度
sparsity = 1.0 - len(ratings_df) / (n_users * n_items)
print(f"数据稀疏度: {sparsity:.2%}")
```

## 👥 协同过滤

### 1. 基于用户的协同过滤

```python
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

class UserBasedCF:
    def __init__(self, user_item_matrix, n_neighbors=10):
        self.matrix = user_item_matrix
        self.n_neighbors = n_neighbors
        self.user_similarity = None
    
    def fit(self):
        """计算用户相似度"""
        # 使用余弦相似度
        self.user_similarity = cosine_similarity(self.matrix)
        return self
    
    def predict(self, user_id, item_id):
        """预测用户对物品的评分"""
        if user_id >= len(self.matrix) or item_id not in self.matrix.columns:
            return self.matrix.mean().mean()  # 返回全局平均值
        
        # 获取相似用户
        user_similarities = self.user_similarity[user_id]
        
        # 找到评分过该物品的用户
        rated_users = self.matrix[item_id] > 0
        
        # 计算加权平均
        numerator = 0
        denominator = 0
        
        for other_user in range(len(self.matrix)):
            if rated_users[other_user] and other_user != user_id:
                similarity = user_similarities[other_user]
                rating = self.matrix.iloc[other_user][item_id]
                user_mean = self.matrix.iloc[other_user].mean()
                
                numerator += similarity * (rating - user_mean)
                denominator += abs(similarity)
        
        if denominator == 0:
            return self.matrix.iloc[user_id].mean()
        
        predicted_rating = self.matrix.iloc[user_id].mean() + numerator / denominator
        return predicted_rating
    
    def recommend(self, user_id, n_recommendations=10):
        """为用户推荐物品"""
        # 获取用户未评分的物品
        user_ratings = self.matrix.iloc[user_id]
        unrated_items = user_ratings[user_ratings == 0].index
        
        # 预测评分
        predictions = []
        for item_id in unrated_items:
            pred = self.predict(user_id, item_id)
            predictions.append((item_id, pred))
        
        # 排序并返回前 N 个
        predictions.sort(key=lambda x: x[1], reverse=True)
        return predictions[:n_recommendations]

# 使用示例
ucf = UserBasedCF(train_matrix, n_neighbors=10)
ucf.fit()

# 为用户 0 推荐
recommendations = ucf.recommend(0, n_recommendations=5)
print("基于用户的协同过滤推荐:")
for item_id, pred_rating in recommendations:
    print(f"物品 {item_id}: 预测评分 {pred_rating:.2f}")
```

### 2. 基于物品的协同过滤

```python
class ItemBasedCF:
    def __init__(self, user_item_matrix, n_neighbors=10):
        self.matrix = user_item_matrix
        self.n_neighbors = n_neighbors
        self.item_similarity = None
    
    def fit(self):
        """计算物品相似度"""
        # 转置矩阵，计算物品之间的相似度
        item_user_matrix = self.matrix.T
        self.item_similarity = cosine_similarity(item_user_matrix)
        return self
    
    def predict(self, user_id, item_id):
        """预测用户对物品的评分"""
        if user_id >= len(self.matrix) or item_id not in self.matrix.columns:
            return self.matrix.mean().mean()
        
        # 获取用户评分过的物品
        user_ratings = self.matrix.iloc[user_id]
        rated_items = user_ratings[user_ratings > 0].index
        
        # 找到相似物品
        item_index = list(self.matrix.columns).index(item_id)
        item_similarities = self.item_similarity[item_index]
        
        # 计算加权平均
        numerator = 0
        denominator = 0
        
        for rated_item in rated_items:
            rated_index = list(self.matrix.columns).index(rated_item)
            similarity = item_similarities[rated_index]
            rating = user_ratings[rated_item]
            
            numerator += similarity * rating
            denominator += abs(similarity)
        
        if denominator == 0:
            return self.matrix.mean().mean()
        
        predicted_rating = numerator / denominator
        return predicted_rating
    
    def recommend(self, user_id, n_recommendations=10):
        """为用户推荐物品"""
        user_ratings = self.matrix.iloc[user_id]
        unrated_items = user_ratings[user_ratings == 0].index
        
        predictions = []
        for item_id in unrated_items:
            pred = self.predict(user_id, item_id)
            predictions.append((item_id, pred))
        
        predictions.sort(key=lambda x: x[1], reverse=True)
        return predictions[:n_recommendations]

# 使用示例
icf = ItemBasedCF(train_matrix, n_neighbors=10)
icf.fit()

# 为用户 0 推荐
recommendations = icf.recommend(0, n_recommendations=5)
print("\n基于物品的协同过滤推荐:")
for item_id, pred_rating in recommendations:
    print(f"物品 {item_id}: 预测评分 {pred_rating:.2f}")
```

### 3. 矩阵分解（SVD）

```python
from scipy.sparse.linalg import svds
from sklearn.metrics import mean_squared_error

class MatrixFactorization:
    def __init__(self, n_factors=50):
        self.n_factors = n_factors
        self.user_factors = None
        self.item_factors = None
    
    def fit(self, matrix):
        """使用 SVD 进行矩阵分解"""
        # 转换为 numpy 数组
        matrix_array = matrix.values
        
        # 奇异值分解
        U, sigma, Vt = svds(matrix_array, k=self.n_factors)
        
        sigma = np.diag(sigma)
        
        # 用户和物品的潜在因子矩阵
        self.user_factors = U.dot(sigma)
        self.item_factors = Vt.T
        
        return self
    
    def predict(self, user_id, item_id):
        """预测评分"""
        if user_id >= self.user_factors.shape[0]:
            return 3.0  # 默认评分
        
        if item_id >= self.item_factors.shape[0]:
            return 3.0
        
        # 点积
        predicted = np.dot(self.user_factors[user_id], self.item_factors[item_id])
        
        # 限制在 1-5 范围内
        predicted = max(1, min(5, predicted))
        
        return predicted
    
    def recommend(self, user_id, n_recommendations=10):
        """推荐物品"""
        # 计算所有物品的预测评分
        all_predictions = np.dot(self.user_factors[user_id], self.item_factors.T)
        
        # 创建 (item_id, rating) 对
        predictions = [(i, rating) for i, rating in enumerate(all_predictions)]
        
        # 排序
        predictions.sort(key=lambda x: x[1], reverse=True)
        
        return predictions[:n_recommendations]

# 使用示例
mf = MatrixFactorization(n_factors=50)
mf.fit(train_matrix)

# 为用户 0 推荐
recommendations = mf.recommend(0, n_recommendations=5)
print("\n矩阵分解推荐:")
for item_id, pred_rating in recommendations:
    print(f"物品 {item_id}: 预测评分 {pred_rating:.2f}")
```

## 🎨 基于内容的推荐

### 1. 基于物品内容的推荐

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

def create_item_features(items_df):
    """创建物品特征"""
    # 合并类别和品牌作为文本特征
    items_df['features'] = items_df['category'] + ' ' + items_df['brand']
    
    # TF-IDF 向量化
    tfidf = TfidfVectorizer(max_features=100)
    item_features = tfidf.fit_transform(items_df['features'])
    
    return item_features, tfidf

# 创建物品特征
item_features, tfidf = create_item_features(items_df)

# 计算物品相似度
item_similarity = cosine_similarity(item_features)

def content_based_recommend(user_id, user_item_matrix, item_similarity, n_recommendations=10):
    """基于内容的推荐"""
    # 获取用户喜欢的物品（评分 >= 4）
    user_ratings = user_item_matrix.iloc[user_id]
    liked_items = user_ratings[user_ratings >= 4].index
    
    if len(liked_items) == 0:
        return []
    
    # 计算所有物品的相似度得分
    scores = np.zeros(user_item_matrix.shape[1])
    
    for liked_item in liked_items:
        liked_index = list(user_item_matrix.columns).index(liked_item)
        scores += item_similarity[liked_index]
    
    # 排除已评分的物品
    rated_items = user_ratings[user_ratings > 0].index
    for rated_item in rated_items:
        rated_index = list(user_item_matrix.columns).index(rated_item)
        scores[rated_index] = 0
    
    # 排序
    item_indices = scores.argsort()[::-1][:n_recommendations]
    
    recommendations = [
        (user_item_matrix.columns[i], scores[i]) 
        for i in item_indices if scores[i] > 0
    ]
    
    return recommendations

# 使用示例
recommendations = content_based_recommend(0, train_matrix, item_similarity)
print("\n基于内容的推荐:")
for item_id, score in recommendations:
    print(f"物品 {item_id}: 相似度得分 {score:.2f}")
```

## 🤖 深度学习推荐

### 1. 神经协同过滤

```python
import tensorflow as tf
from tensorflow.keras import layers, models, optimizers

def build_ncf_model(num_users, num_items, embedding_dim=64):
    """构建神经协同过滤模型"""
    
    # 用户输入
    user_input = layers.Input(shape=(1,), name='user_input')
    user_embedding = layers.Embedding(num_users, embedding_dim)(user_input)
    user_embedding = layers.Flatten()(user_embedding)
    
    # 物品输入
    item_input = layers.Input(shape=(1,), name='item_input')
    item_embedding = layers.Embedding(num_items, embedding_dim)(item_input)
    item_embedding = layers.Flatten()(item_embedding)
    
    # GMF（广义矩阵分解）分支
    gmf = layers.Multiply()([user_embedding, item_embedding])
    gmf = layers.Dense(64, activation='relu')(gmf)
    
    # MLP 分支
    concat = layers.Concatenate()([user_embedding, item_embedding])
    mlp = layers.Dense(128, activation='relu')(concat)
    mlp = layers.Dropout(0.2)(mlp)
    mlp = layers.Dense(64, activation='relu')(mlp)
    mlp = layers.Dropout(0.2)(mlp)
    
    # 合并
    combined = layers.Concatenate()([gmf, mlp])
    combined = layers.Dense(32, activation='relu')(combined)
    
    # 输出
    output = layers.Dense(1, activation='sigmoid')(combined)
    
    model = models.Model(inputs=[user_input, item_input], outputs=output)
    return model

# 准备训练数据
def prepare_training_data(train_df):
    """准备训练数据"""
    user_ids = train_df['user_id'].values
    item_ids = train_df['item_id'].values
    ratings = train_df['rating'].values / 5.0  # 归一化到 0-1
    
    return (user_ids, item_ids), ratings

# 构建和训练模型
num_users = n_users
num_items = n_items

ncf_model = build_ncf_model(num_users, num_items, embedding_dim=64)

ncf_model.compile(
    optimizer=optimizers.Adam(learning_rate=0.001),
    loss='mse',
    metrics=['mae']
)

ncf_model.summary()

# 训练
(X_train, y_train) = prepare_training_data(train_df)
(X_test, y_test) = prepare_training_data(test_df)

history = ncf_model.fit(
    [X_train[0], X_train[1]], y_train,
    validation_data=([X_test[0], X_test[1]], y_test),
    epochs=10,
    batch_size=64,
    callbacks=[
        tf.keras.callbacks.EarlyStopping(patience=3, restore_best_weights=True)
    ]
)

# 预测和推荐
def ncf_recommend(model, user_id, item_ids, n_recommendations=10):
    """使用 NCF 模型推荐"""
    # 为用户和所有物品创建输入
    user_input = np.full(len(item_ids), user_id)
    
    # 预测
    predictions = model.predict([user_input, item_ids])
    
    # 创建 (item_id, prediction) 对
    results = list(zip(item_ids, predictions.flatten()))
    
    # 排序
    results.sort(key=lambda x: x[1], reverse=True)
    
    return results[:n_recommendations]

# 为用户 0 推荐
user_id = 0
item_ids = np.arange(num_items)
recommendations = ncf_recommend(ncf_model, user_id, item_ids)

print("\n神经协同过滤推荐:")
for item_id, pred in recommendations[:5]:
    print(f"物品 {item_id}: 预测评分 {pred*5:.2f}")
```

### 2. Wide & Deep 模型

```python
def build_wide_deep_model(num_users, num_items, num_categories, embedding_dim=32):
    """构建 Wide & Deep 模型"""
    
    # 输入
    user_input = layers.Input(shape=(1,), name='user_input')
    item_input = layers.Input(shape=(1,), name='item_input')
    category_input = layers.Input(shape=(1,), name='category_input')
    
    # Wide 部分：线性模型
    wide = layers.Concatenate()([user_input, item_input, category_input])
    
    # Deep 部分：嵌入和神经网络
    user_emb = layers.Embedding(num_users, embedding_dim)(user_input)
    user_emb = layers.Flatten()(user_emb)
    
    item_emb = layers.Embedding(num_items, embedding_dim)(item_input)
    item_emb = layers.Flatten()(item_emb)
    
    category_emb = layers.Embedding(num_categories, embedding_dim)(category_input)
    category_emb = layers.Flatten()(category_emb)
    
    # 合并嵌入
    deep = layers.Concatenate()([user_emb, item_emb, category_emb])
    
    # 深层网络
    deep = layers.Dense(128, activation='relu')(deep)
    deep = layers.Dropout(0.3)(deep)
    deep = layers.Dense(64, activation='relu')(deep)
    deep = layers.Dropout(0.3)(deep)
    
    # 合并 Wide 和 Deep
    combined = layers.Concatenate()([wide, deep])
    output = layers.Dense(1, activation='sigmoid')(combined)
    
    model = models.Model(
        inputs=[user_input, item_input, category_input],
        outputs=output
    )
    
    return model

# 准备带有类别信息的训练数据
def prepare_wide_deep_data(train_df, items_df):
    """准备 Wide & Deep 训练数据"""
    # 合并物品类别信息
    merged = train_df.merge(items_df[['item_id', 'category']], on='item_id')
    
    # 对类别进行编码
    merged['category_encoded'] = merged['category'].astype('category').cat.codes
    
    user_ids = merged['user_id'].values
    item_ids = merged['item_id'].values
    categories = merged['category_encoded'].values
    ratings = merged['rating'].values / 5.0
    
    return (user_ids, item_ids, categories), ratings

# 构建 Wide & Deep 模型
num_categories = len(items_df['category'].unique())
wd_model = build_wide_deep_model(n_users, n_items, num_categories)

wd_model.compile(
    optimizer=optimizers.Adam(learning_rate=0.001),
    loss='mse',
    metrics=['mae']
)

# 训练
(X_train, y_train) = prepare_wide_deep_data(train_df, items_df)
(X_test, y_test) = prepare_wide_deep_data(test_df, items_df)

history = wd_model.fit(
    [X_train[0], X_train[1], X_train[2]], y_train,
    validation_data=([X_test[0], X_test[1], X_test[2]], y_test),
    epochs=10,
    batch_size=64
)
```

## 🎯 评估推荐系统

```python
from sklearn.metrics import mean_squared_error, mean_absolute_error

def evaluate_model(model, test_df, n_users, n_items):
    """评估推荐系统"""
    predictions = []
    actuals = []
    
    for _, row in test_df.iterrows():
        user_id = int(row['user_id'])
        item_id = int(row['item_id'])
        actual = row['rating']
        
        try:
            if hasattr(model, 'predict'):
                # 传统方法
                pred = model.predict(user_id, item_id)
            else:
                # 深度学习模型
                pred = model.predict([np.array([user_id]), np.array([item_id])])[0][0] * 5
            
            predictions.append(pred)
            actuals.append(actual)
        except:
            continue
    
    # 计算指标
    mse = mean_squared_error(actuals, predictions)
    rmse = np.sqrt(mse)
    mae = mean_absolute_error(actuals, predictions)
    
    print(f"RMSE: {rmse:.4f}")
    print(f"MAE: {mae:.4f}")
    
    return {'RMSE': rmse, 'MAE': mae}

# 评估不同模型
print("评估基于用户的协同过滤:")
ucf_metrics = evaluate_model(ucf, test_df, n_users, n_items)

print("\n评估基于物品的协同过滤:")
icf_metrics = evaluate_model(icf, test_df, n_users, n_items)

print("\n评估矩阵分解:")
mf_metrics = evaluate_model(mf, test_df, n_users, n_items)

# 比较模型
metrics_comparison = pd.DataFrame({
    'User-based CF': ucf_metrics,
    'Item-based CF': icf_metrics,
    'Matrix Factorization': mf_metrics
}).T

print("\n模型性能比较:")
print(metrics_comparison)
```

## 📚 最佳实践

### 1. 冷启动问题处理

```python
def handle_cold_start(new_user, item_features):
    """处理新用户的冷启动问题"""
    # 基于物品特征推荐热门物品
    # 或使用人口统计学信息
    pass
```

### 2. A/B 测试

```python
"""
推荐系统 A/B 测试：

1. 设计实验
   - 控制组：当前推荐系统
   - 实验组：新推荐系统
   - 指标：CTR、转化率、留存率

2. 样本分配
   - 随机分配用户
   - 确保统计显著性
   - 运行足够长时间

3. 结果分析
   - 统计检验
   - 计算置信区间
   - 评估业务影响
"""
```

### 3. 实时推荐

```python
from collections import defaultdict
import numpy as np

class RealTimeRecommender:
    def __init__(self, model):
        self.model = model
        self.user_history = defaultdict(list)
        self.item_popularity = defaultdict(int)
    
    def update_user_history(self, user_id, item_id, rating):
        """更新用户历史"""
        self.user_history[user_id].append((item_id, rating))
        self.item_popularity[item_id] += 1
    
    def get_real_time_recommendations(self, user_id, n=10):
        """获取实时推荐"""
        # 结合用户历史和热门物品
        if user_id in self.user_history:
            # 使用模型推荐
            pass
        else:
            # 返回热门物品
            popular_items = sorted(
                self.item_popularity.items(),
                key=lambda x: x[1],
                reverse=True
            )[:n]
            return popular_items
```

## 🎓 学习路径

1. **基础推荐算法**（2-3周）
   - 协同过滤
   - 矩阵分解
   - 基于内容推荐

2. **进阶技术**（3-4周）
   - 深度学习推荐
   - 混合推荐系统
   - 序列推荐

3. **系统设计**（2-3周）
   - 架构设计
   - 性能优化
   - A/B 测试

4. **实战项目**（4-6周）
   - 电商推荐系统
   - 视频推荐系统
   - 音乐推荐系统

掌握推荐系统技术，打造个性化用户体验！
