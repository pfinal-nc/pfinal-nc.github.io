---
title: Python 自然语言处理（NLP）实战指南
date: 2026-03-11
description: 深入掌握 NLP 技术，使用 NLTK、spaCy、Transformers 等工具处理文本数据
tags: [Python, NLP, 自然语言处理, Transformers, 深度学习]
difficulty: 🟡 进阶
category: dev/backend/python
---

# Python 自然语言处理（NLP）实战指南

自然语言处理（NLP）是人工智能的重要分支，让计算机能够理解和处理人类语言。本文将带你全面掌握 NLP 的核心技术和实践方法。

## 🌐 NLP 简介

### 1. NLP 应用场景

```python
"""
自然语言处理（NLP）核心应用：

1. 文本分析
   - 情感分析
   - 文本分类
   - 关键词提取
   - 主题建模

2. 信息提取
   - 命名实体识别（NER）
   - 关系抽取
   - 事件抽取

3. 机器翻译
   - 多语言翻译
   - 代码翻译

4. 对话系统
   - 聊天机器人
   - 问答系统
   - 语音助手

5. 文本生成
   - 文本摘要
   - 内容生成
   - 代码生成
"""
```

### 2. NLP 技术栈

```python
"""
NLP 技术栈分层：

1. 基础层
   - NLTK: 教学和研究
   - spaCy: 工业级 NLP
   - TextBlob: 简单易用

2. 深度学习层
   - Keras/TensorFlow: 端到端模型
   - PyTorch: 研究和实验
   - FastAI: 快速原型

3. 预训练模型层
   - Hugging Face Transformers: BERT、GPT 等
   - spaCy: 预训练管道
   - Sentence-Transformers: 句子嵌入

4. 应用层
   - LangChain: LLM 应用框架
   - Gradio: 快速构建演示
   - Streamlit: Web 应用
"""
```

## 📚 基础 NLP 工具

### 1. NLTK 基础

```python
import nltk
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer, WordNetLemmatizer
from nltk.tag import pos_tag

# 下载 NLTK 数据（首次使用）
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('wordnet')
nltk.download('averaged_perceptron_tagger')

# 文本预处理
text = "Natural Language Processing (NLP) is a branch of artificial intelligence!"

# 分词
words = word_tokenize(text)
sentences = sent_tokenize(text)

print("词元:", words)
print("句子:", sentences)

# 去除停用词
stop_words = set(stopwords.words('english'))
filtered_words = [word for word in words if word.lower() not in stop_words]
print("去除停用词后:", filtered_words)

# 词干提取
stemmer = PorterStemmer()
stemmed_words = [stemmer.stem(word) for word in words]
print("词干提取:", stemmed_words)

# 词形还原
lemmatizer = WordNetLemmatizer()
lemmatized_words = [lemmatizer.lemmatize(word) for word in words]
print("词形还原:", lemmatized_words)

# 词性标注
pos_tags = pos_tag(words)
print("词性标注:", pos_tags)
```

### 2. spaCy 基础

```python
import spacy

# 加载模型（需要先安装：python -m spacy download en_core_web_sm）
nlp = spacy.load("en_core_web_sm")

# 处理文本
text = "Apple is looking at buying U.K. startup for $1 billion."
doc = nlp(text)

# 分词和词性标注
for token in doc:
    print(f"{token.text}: {token.pos_} ({spacy.explain(token.pos_)})")

# 命名实体识别
for ent in doc.ents:
    print(f"{ent.text}: {ent.label_} ({spacy.explain(ent.label_)})")

# 依存句法分析
for token in doc:
    print(f"{token.text} -> {token.head.text} ({token.dep_})")

# 词形还原和词性过滤
lemmatized = [token.lemma_ for token in doc 
              if not token.is_stop and not token.is_punct]

print("过滤后的词形:", lemmatized)

# 相似度计算
doc1 = nlp("The quick brown fox jumps over the lazy dog.")
doc2 = nlp("A fast brown fox leaps over a tired dog.")
similarity = doc1.similarity(doc2)
print(f"相似度: {similarity:.4f}")
```

### 3. TextBlob 简易工具

```python
from textblob import TextBlob

# 创建 TextBlob 对象
text = "I love programming in Python! It's amazing and powerful."
blob = TextBlob(text)

# 情感分析
sentiment = blob.sentiment
print(f"极性: {sentiment.polarity:.4f}")  # -1(负面) 到 1(正面)
print(f"主观性: {sentiment.subjectivity:.4f}")  # 0(客观) 到 1(主观)

# 语言检测
blob = TextBlob("Bonjour le monde")
print(f"检测到的语言: {blob.detect_language()}")

# 翻译
blob.translate(from_lang='fr', to='en')

# 拼写纠正
blob = TextBlob("I havv a gud idia")
corrected = blob.correct()
print(f"纠正后: {corrected}")

# 单数复数
blob = TextBlob("cat")
print(f"复数: {blob.pluralize()}")

blob = TextBlob("cats")
print(f"单数: {blob.singularize()}")

# 名词短语提取
blob = TextBlob("The quick brown fox jumps over the lazy dog.")
print("名词短语:", blob.noun_phrases)
```

## 🔤 文本预处理

### 1. 完整预处理流程

```python
import re
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tag import pos_tag
from textblob import TextBlob

def preprocess_text(text, language='english'):
    """完整的文本预处理流程"""
    
    # 1. 转换为小写
    text = text.lower()
    
    # 2. 移除特殊字符和数字
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    
    # 3. 移除多余的空格
    text = re.sub(r'\s+', ' ', text).strip()
    
    # 4. 分词
    tokens = word_tokenize(text)
    
    # 5. 移除停用词
    stop_words = set(stopwords.words(language))
    tokens = [token for token in tokens if token not in stop_words]
    
    # 6. 词形还原（可选：基于词性）
    lemmatizer = WordNetLemmatizer()
    # 词性映射
    pos_tags = pos_tag(tokens)
    wordnet_pos = {'J': 'a', 'N': 'n', 'V': 'v', 'R': 'r'}
    tokens = [lemmatizer.lemmatize(token, wordnet_pos.get(pos[0], 'n')) 
              for token, pos in pos_tags]
    
    # 7. 移除短词
    tokens = [token for token in tokens if len(token) > 2]
    
    return tokens

# 示例使用
text = """
Machine learning is a subset of artificial intelligence (AI) 
that provides systems the ability to automatically learn and 
improve from experience without being explicitly programmed.
"""

tokens = preprocess_text(text)
print("预处理后的词元:", tokens)
print("处理后的文本:", " ".join(tokens))
```

### 2. 高级文本清洗

```python
import re

def advanced_text_cleaning(text):
    """高级文本清洗"""
    
    # 移除 HTML 标签
    text = re.sub(r'<[^>]+>', '', text)
    
    # 移除 URL
    text = re.sub(r'http\S+|www\S+|https\S+', '', text)
    
    # 移除邮箱
    text = re.sub(r'\S+@\S+', '', text)
    
    # 移除电话号码
    text = re.sub(r'\d{3}[-.]?\d{3}[-.]?\d{4}', '', text)
    
    # 移除表情符号
    emoji_pattern = re.compile("["
                           u"\U0001F600-\U0001F64F"  # emoticons
                           u"\U0001F300-\U0001F5FF"  # symbols & pictographs
                           u"\U0001F680-\U0001F6FF"  # transport & map symbols
                           u"\U0001F1E0-\U0001F1FF"  # flags
                           u"\U00002702-\U000027B0"
                           u"\U000024C2-\U0001F251"
                           "]+", flags=re.UNICODE)
    text = emoji_pattern.sub(r'', text)
    
    # 标准化引号
    text = text.replace('"', '"').replace('"', '"')
    text = text.replace(''', "'").replace(''', "'")
    
    # 移除特殊字符但保留句号
    text = re.sub(r'[^a-zA-Z0-9\s.,!?]', '', text)
    
    return text

# 示例
text = """
Hello! 😊 Check out our website at https://example.com 
Contact us at info@example.com or call 555-123-4567.
"""

cleaned = advanced_text_cleaning(text)
print("清洗后:", cleaned)
```

## 🧠 特征工程

### 1. 词袋模型（Bag of Words）

```python
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.feature_extraction.text import TfidfVectorizer
import pandas as pd

# 示例文档
documents = [
    "The cat sat on the mat",
    "The dog sat on the log",
    "The cat chased the dog",
    "The dog ran quickly"
]

# 词袋模型
count_vectorizer = CountVectorizer(
    max_features=10,      # 最多保留10个词
    stop_words='english',  # 移除停用词
    ngram_range=(1, 1)    # 1-gram
)

bow_matrix = count_vectorizer.fit_transform(documents)
feature_names = count_vectorizer.get_feature_names_out()

# 转换为 DataFrame
bow_df = pd.DataFrame(bow_matrix.toarray(), columns=feature_names)
print("词袋模型矩阵:")
print(bow_df)

# TF-IDF
tfidf_vectorizer = TfidfVectorizer(
    max_features=10,
    stop_words='english',
    ngram_range=(1, 2)  # 1-gram 和 2-gram
)

tfidf_matrix = tfidf_vectorizer.fit_transform(documents)
feature_names = tfidf_vectorizer.get_feature_names_out()

tfidf_df = pd.DataFrame(tfidf_matrix.toarray(), columns=feature_names)
print("\nTF-IDF 矩阵:")
print(tfidf_df)
```

### 2. 词嵌入（Word Embeddings）

```python
import numpy as np
from gensim.models import Word2Vec, FastText

# 示例语料库
sentences = [
    ['the', 'cat', 'sat', 'on', 'the', 'mat'],
    ['the', 'dog', 'sat', 'on', 'the', 'log'],
    ['the', 'cat', 'chased', 'the', 'dog'],
    ['the', 'dog', 'ran', 'quickly']
]

# Word2Vec
word2vec_model = Word2Vec(
    sentences=sentences,
    vector_size=100,      # 词向量维度
    window=5,             # 上下文窗口大小
    min_count=1,          # 最小词频
    workers=4             # 使用4个线程
)

# 获取词向量
vector_cat = word2vec_model.wv['cat']
print("'cat' 的词向量:", vector_cat[:10])  # 只显示前10维

# 找相似词
similar_words = word2vec_model.wv.most_similar('cat', topn=3)
print("\n与 'cat' 最相似的词:")
for word, similarity in similar_words:
    print(f"{word}: {similarity:.4f}")

# 计算词向量相似度
similarity = word2vec_model.wv.similarity('cat', 'dog')
print(f"\n'cat' 和 'dog' 的相似度: {similarity:.4f}")

# FastText（处理词形变化）
fasttext_model = FastText(
    sentences=sentences,
    vector_size=100,
    window=5,
    min_count=1,
    workers=4
)

# FastText 可以处理未知词
unknown_vector = fasttext_model.wv['kitten']  # 'kitten' 不在词汇表中
print("\n'kitten' 的向量（通过子词）:", unknown_vector[:10])
```

### 3. 预训练嵌入（GloVe）

```python
# 加载预训练的 GloVe 嵌入
# 下载地址：https://nlp.stanford.edu/projects/glove/

def load_glove_embeddings(glove_file):
    """加载 GloVe 嵌入"""
    embeddings_index = {}
    
    with open(glove_file, 'r', encoding='utf-8') as f:
        for line in f:
            values = line.split()
            word = values[0]
            coefs = np.asarray(values[1:], dtype='float32')
            embeddings_index[word] = coefs
    
    return embeddings_index

# 使用示例
# embeddings = load_glove_embeddings('glove.6B.100d.txt')
# vector = embeddings['python']
```

## 🤖 使用预训练模型

### 1. Hugging Face Transformers

```python
from transformers import AutoTokenizer, AutoModel
import torch

# 加载预训练模型和分词器
model_name = "bert-base-uncased"

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModel.from_pretrained(model_name)

# 处理文本
text = "Natural language processing is fascinating!"
inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True)

# 获取嵌入
with torch.no_grad():
    outputs = model(**inputs)
    last_hidden_states = outputs.last_hidden_state

# 获取句子嵌入（CLS token）
sentence_embedding = last_hidden_states[:, 0, :]
print("句子嵌入:", sentence_embedding.shape)

# 批量处理
texts = [
    "I love programming!",
    "Python is amazing.",
    "Machine learning is cool."
]

inputs = tokenizer(texts, return_tensors="pt", padding=True, truncation=True)
with torch.no_grad():
    outputs = model(**inputs)
    embeddings = outputs.last_hidden_states[:, 0, :]

print("批量嵌入:", embeddings.shape)
```

### 2. 情感分析

```python
from transformers import pipeline

# 使用预训练的情感分析管道
sentiment_pipeline = pipeline(
    "sentiment-analysis",
    model="distilbert-base-uncased-finetuned-sst-2-english"
)

# 分析单条文本
text = "I absolutely love this product! It's amazing."
result = sentiment_pipeline(text)
print(result)
# [{'label': 'POSITIVE', 'score': 0.9998}]

# 批量分析
texts = [
    "This movie is terrible!",
    "What a wonderful day!",
    "I'm not sure about this."
]

results = sentiment_pipeline(texts)
for text, result in zip(texts, results):
    print(f"文本: {text}")
    print(f"情感: {result['label']}")
    print(f"置信度: {result['score']:.4f}")
    print()
```

### 3. 命名实体识别（NER）

```python
from transformers import pipeline

# 使用预训练的 NER 模型
ner_pipeline = pipeline(
    "ner",
    model="dbmdz/bert-large-cased-finetuned-conll03-english",
    aggregation_strategy="simple"
)

text = "Apple Inc. was founded by Steve Jobs in Cupertino, California in 1976."
entities = ner_pipeline(text)

print("命名实体:")
for entity in entities:
    print(f"实体: {entity['word']}")
    print(f"类型: {entity['entity_group']}")
    print(f"置信度: {entity['score']:.4f}")
    print(f"位置: {entity['start']}-{entity['end']}")
    print()
```

### 4. 文本生成

```python
from transformers import pipeline

# 使用 GPT-2 进行文本生成
generator = pipeline("text-generation", model="gpt2")

prompt = "Once upon a time in a distant galaxy,"
generated_text = generator(
    prompt,
    max_length=100,
    num_return_sequences=1,
    temperature=0.7  # 控制随机性（0-1）
)

print("生成的文本:")
print(generated_text[0]['generated_text'])
```

## 🎯 实战案例：文本分类

```python
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
import torch
from torch.utils.data import Dataset

# 创建模拟数据集
data = {
    'text': [
        "I love this product! Best purchase ever.",
        "Terrible experience, would not recommend.",
        "Amazing quality, fast shipping.",
        "Poor customer service, very disappointed.",
        "Great value for money.",
        "Worst product I've ever bought.",
        "Excellent, exceeded expectations!",
        "Not worth the price.",
        "Highly recommended to everyone.",
        "Complete waste of money.",
    ],
    'label': [1, 0, 1, 0, 1, 0, 1, 0, 1, 0]  # 1: 正面, 0: 负面
}

df = pd.DataFrame(data)

# 分割数据集
train_df, test_df = train_test_split(df, test_size=0.2, random_state=42)

# 自定义数据集类
class TextClassificationDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_len=128):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_len = max_len
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = self.labels[idx]
        
        encoding = self.tokenizer(
            text,
            truncation=True,
            padding='max_length',
            max_length=self.max_len,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'labels': torch.tensor(label, dtype=torch.long)
        }

# 加载预训练模型和分词器
model_name = "distilbert-base-uncased"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=2)

# 创建数据集
train_dataset = TextClassificationDataset(
    train_df['text'].values,
    train_df['label'].values,
    tokenizer
)

test_dataset = TextClassificationDataset(
    test_df['text'].values,
    test_df['label'].values,
    tokenizer
)

# 训练参数
training_args = TrainingArguments(
    output_dir='./results',
    num_train_epochs=3,
    per_device_train_batch_size=8,
    per_device_eval_batch_size=8,
    warmup_steps=500,
    weight_decay=0.01,
    logging_dir='./logs',
    logging_steps=10,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
)

# 创建训练器
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=test_dataset,
)

# 训练模型
trainer.train()

# 评估模型
predictions = trainer.predict(test_dataset)
preds = np.argmax(predictions.predictions, axis=-1)

print("分类报告:")
print(classification_report(test_df['label'].values, preds))

# 保存模型
model.save_pretrained("./text_classifier")
tokenizer.save_pretrained("./text_classifier")
```

## 📚 最佳实践

### 1. 性能优化

```python
# 批量处理
texts = ["text1", "text2", "text3", ...]
inputs = tokenizer(texts, padding=True, truncation=True, return_tensors="pt")

# 使用 GPU
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = model.to(device)
inputs = inputs.to(device)

# 混合精度训练
from torch.cuda.amp import autocast, GradScaler
scaler = GradScaler()

with autocast():
    outputs = model(**inputs)
```

### 2. 处理长文本

```python
# 分块处理长文本
def chunk_text(text, tokenizer, max_length=512, overlap=50):
    """将长文本分块"""
    tokens = tokenizer.encode(text, add_special_tokens=False)
    chunks = []
    
    for i in range(0, len(tokens), max_length - overlap):
        chunk = tokens[i:i + max_length]
        chunks.append(chunk)
    
    return chunks

# 或者使用滑窗
inputs = tokenizer(
    text,
    max_length=512,
    truncation=True,
    return_overflowing_tokens=True,
    stride=128
)
```

### 3. 部署为 API

```python
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline
import uvicorn

app = FastAPI()

# 加载模型
sentiment_pipeline = pipeline("sentiment-analysis")

class TextRequest(BaseModel):
    text: str

@app.post("/sentiment")
def analyze_sentiment(request: TextRequest):
    result = sentiment_pipeline(request.text)
    return {"label": result[0]["label"], "score": result[0]["score"]}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## 🎓 学习路径

1. **NLP 基础**（2周）
   - 文本预处理
   - NLTK 和 spaCy
   - 基础特征工程

2. **传统 NLP**（3-4周）
   - 词袋模型
   - TF-IDF
   - 主题建模

3. **深度学习 NLP**（4-6周）
   - 词嵌入
   - CNN/RNN for NLP
   - 注意力机制

4. **预训练模型**（4-6周）
   - BERT 家族
   - GPT 家族
   - 实战项目

## 📖 掌握 NLP，让机器理解人类语言！
