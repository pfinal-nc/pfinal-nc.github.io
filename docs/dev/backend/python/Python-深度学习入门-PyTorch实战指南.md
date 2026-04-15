---
title: Python 深度学习入门：PyTorch 实战指南
date: 2026-03-11 00:00:00
description: 从零开始学习 PyTorch 深度学习框架，掌握神经网络、CNN、RNN 等核心技术
keywords:
  - Python
  - PyTorch
  - 深度学习
  - 神经网络
  - AI
  - Python 深度学习入门：PyTorch 实战指南
  - PFinalClub
  - 技术博客
tags: [Python, PyTorch, 深度学习, 神经网络, AI]
difficulty: 🟡 进阶
category: dev/backend/python
---

# Python 深度学习入门：PyTorch 实战指南

PyTorch 是目前最流行的深度学习框架之一，以其动态计算图和简洁的 API 深受开发者喜爱。本文将带你从零开始，系统地掌握 PyTorch 的核心技术。

## 🔥 PyTorch 简介

### 1. 为什么选择 PyTorch

```python
"""
PyTorch vs TensorFlow vs Keras

PyTorch 优势：
- 动态计算图：灵活调试，易于理解
- Pythonic API：简洁直观，学习曲线平缓
- 强大的社区支持：丰富的预训练模型和工具
- 研究友好：快速原型开发和实验

适用场景：
- 研究和学术项目
- 需要灵活性的项目
- 快速原型开发
- 教学和学习
"""
```

### 2. 安装 PyTorch

```bash
# CPU 版本
pip install torch torchvision torchaudio

# GPU 版本（CUDA 11.8）
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# 验证安装
python -c "import torch; print(torch.__version__); print(torch.cuda.is_available())"
```

## 🧮 张量基础

### 1. 创建张量

```python
import torch
import numpy as np

# 从列表创建
tensor1 = torch.tensor([1, 2, 3, 4])
tensor2 = torch.tensor([[1, 2], [3, 4]])

# 从 NumPy 数组创建
np_array = np.array([1, 2, 3])
tensor_np = torch.from_numpy(np_array)

# 创建特定张量
zeros = torch.zeros(3, 4)           # 全零张量
ones = torch.ones(2, 3)             # 全一张量
random_tensor = torch.randn(3, 3)   # 正态分布随机张量
arange_tensor = torch.arange(0, 10, 2)  # [0, 2, 4, 6, 8]

# 创建指定值的张量
filled_tensor = torch.full((2, 3), 7)  # 填充7

# 创建单位矩阵
identity_tensor = torch.eye(3)       # 3x3 单位矩阵

# 查看张量信息
print(f"张量形状: {tensor2.shape}")
print(f"张量维度: {tensor2.dim()}")
print(f"张量数据类型: {tensor2.dtype}")
print(f"张量设备: {tensor2.device}")
```

### 2. 张量操作

```python
# 基本运算
a = torch.tensor([1, 2, 3])
b = torch.tensor([4, 5, 6])

# 逐元素运算
print(a + b)      # [5, 7, 9]
print(a - b)      # [-3, -3, -3]
print(a * b)      # [4, 10, 18]
print(a / b)      # [0.25, 0.4, 0.5]
print(a ** 2)     # [1, 4, 9]

# 矩阵运算
A = torch.tensor([[1, 2], [3, 4]])
B = torch.tensor([[5, 6], [7, 8]])

# 矩阵乘法
print(torch.matmul(A, B))      # 或 A @ B
print(torch.mm(A, B))

# 逐元素乘法（Hadamard 积）
print(A * B)

# 转置
print(A.T)

# 广播机制
tensor = torch.tensor([[1, 2, 3], [4, 5, 6]])
result = tensor + 10  # 每个元素加10
print(result)
```

### 3. 张量索引和切片

```python
import torch

tensor = torch.tensor([[1, 2, 3, 4],
                       [5, 6, 7, 8],
                       [9, 10, 11, 12]])

# 基本索引
print(tensor[0, 1])      # 2
print(tensor[1, :])      # [5, 6, 7, 8]
print(tensor[:, 2])      # [3, 7, 11]

# 切片
print(tensor[0:2, 1:3])  # [[2, 3], [6, 7]]

# 步长切片
print(tensor[::2, ::2])  # [[1, 3], [9, 11]]

# 索引数组
indices = torch.tensor([0, 2])
print(tensor[:, indices])  # [[1, 3], [5, 7], [9, 11]]

# 布尔索引
mask = tensor > 5
print(tensor[mask])  # 所有大于5的元素
```

### 4. 张量形状操作

```python
# Reshape
tensor = torch.arange(12)
reshaped = tensor.reshape(3, 4)
print(reshaped)

# View（共享内存）
viewed = tensor.view(3, 4)
print(viewed)

# Squeeze 和 Unsqueeze
tensor = torch.ones(1, 3, 1)
squeezed = tensor.squeeze()      # 移除大小为1的维度
unsqueezed = squeezed.unsqueeze(0)  # 在指定位置添加维度

# Transpose
tensor = torch.randn(2, 3)
transposed = tensor.T

# Permute（多维度转置）
tensor = torch.randn(2, 3, 4)
permuted = tensor.permute(2, 0, 1)  # 维度从(2,3,4)变为(4,2,1)

# Flatten
tensor = torch.randn(2, 3, 4)
flattened = tensor.flatten()  # 展平为一维

# Stack 和 Concat
a = torch.tensor([1, 2, 3])
b = torch.tensor([4, 5, 6])

stacked = torch.stack([a, b])      # 堆叠，增加新维度
concatenated = torch.cat([a, b])    # 拼接，不增加维度
```

## 🧠 神经网络基础

### 1. 构建简单神经网络

```python
import torch
import torch.nn as nn
import torch.optim as optim

# 定义神经网络
class SimpleNet(nn.Module):
    def __init__(self, input_size, hidden_size, output_size):
        super(SimpleNet, self).__init__()
        
        # 定义层
        self.fc1 = nn.Linear(input_size, hidden_size)
        self.fc2 = nn.Linear(hidden_size, output_size)
        
        # 定义激活函数
        self.relu = nn.ReLU()
        
    def forward(self, x):
        # 前向传播
        x = self.fc1(x)
        x = self.relu(x)
        x = self.fc2(x)
        return x

# 创建模型
model = SimpleNet(input_size=784, hidden_size=128, output_size=10)

# 打印模型结构
print(model)

# 查看参数数量
total_params = sum(p.numel() for p in model.parameters())
print(f"总参数数量: {total_params}")
```

### 2. 损失函数和优化器

```python
# 损失函数
criterion = nn.CrossEntropyLoss()  # 分类任务
# criterion = nn.MSELoss()         # 回归任务
# criterion = nn.BCELoss()         # 二分类任务

# 优化器
optimizer = optim.SGD(model.parameters(), lr=0.01)
# optimizer = optim.Adam(model.parameters(), lr=0.001)
# optimizer = optim.AdamW(model.parameters(), lr=0.001, weight_decay=0.01)

# 学习率调度器
scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=10, gamma=0.1)
# scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.1)
```

### 3. 训练循环

```python
import torch
from torch.utils.data import DataLoader, TensorDataset

# 创建模拟数据
X_train = torch.randn(1000, 784)
y_train = torch.randint(0, 10, (1000,))

# 创建数据集和数据加载器
dataset = TensorDataset(X_train, y_train)
dataloader = DataLoader(dataset, batch_size=32, shuffle=True)

# 训练模型
num_epochs = 10

for epoch in range(num_epochs):
    model.train()
    total_loss = 0
    
    for batch_idx, (data, target) in enumerate(dataloader):
        # 清零梯度
        optimizer.zero_grad()
        
        # 前向传播
        output = model(data)
        
        # 计算损失
        loss = criterion(output, target)
        
        # 反向传播
        loss.backward()
        
        # 更新参数
        optimizer.step()
        
        total_loss += loss.item()
    
    # 更新学习率
    scheduler.step()
    
    # 打印训练信息
    avg_loss = total_loss / len(dataloader)
    print(f"Epoch [{epoch+1}/{num_epochs}], Loss: {avg_loss:.4f}")
```

## 🖼️ 卷积神经网络（CNN）

### 1. 构建 CNN

```python
import torch
import torch.nn as nn
import torch.nn.functional as F

class CNN(nn.Module):
    def __init__(self, num_classes=10):
        super(CNN, self).__init__()
        
        # 卷积层
        self.conv1 = nn.Conv2d(in_channels=1, out_channels=32, kernel_size=3, stride=1, padding=1)
        self.conv2 = nn.Conv2d(in_channels=32, out_channels=64, kernel_size=3, stride=1, padding=1)
        self.conv3 = nn.Conv2d(in_channels=64, out_channels=128, kernel_size=3, stride=1, padding=1)
        
        # 池化层
        self.pool = nn.MaxPool2d(kernel_size=2, stride=2)
        
        # 全连接层
        self.fc1 = nn.Linear(128 * 3 * 3, 512)
        self.fc2 = nn.Linear(512, num_classes)
        
        # Dropout
        self.dropout = nn.Dropout(0.5)
        
        # 批归一化
        self.bn1 = nn.BatchNorm2d(32)
        self.bn2 = nn.BatchNorm2d(64)
        self.bn3 = nn.BatchNorm2d(128)
    
    def forward(self, x):
        # 卷积块1
        x = self.conv1(x)
        x = self.bn1(x)
        x = F.relu(x)
        x = self.pool(x)
        
        # 卷积块2
        x = self.conv2(x)
        x = self.bn2(x)
        x = F.relu(x)
        x = self.pool(x)
        
        # 卷积块3
        x = self.conv3(x)
        x = self.bn3(x)
        x = F.relu(x)
        x = self.pool(x)
        
        # 展平
        x = x.view(x.size(0), -1)
        
        # 全连接层
        x = self.fc1(x)
        x = F.relu(x)
        x = self.dropout(x)
        
        x = self.fc2(x)
        
        return x

# 创建模型
cnn_model = CNN(num_classes=10)
print(cnn_model)
```

### 2. CNN 训练示例

```python
import torch
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader

# 数据预处理
transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize((0.1307,), (0.3081,))  # MNIST 标准化
])

# 加载数据集
train_dataset = datasets.MNIST('./data', train=True, download=True, transform=transform)
test_dataset = datasets.MNIST('./data', train=False, download=True, transform=transform)

train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)
test_loader = DataLoader(test_dataset, batch_size=64, shuffle=False)

# 创建模型、损失函数和优化器
model = CNN(num_classes=10).to('cuda' if torch.cuda.is_available() else 'cpu')
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

# 训练函数
def train(model, device, train_loader, optimizer, epoch):
    model.train()
    train_loss = 0
    correct = 0
    
    for batch_idx, (data, target) in enumerate(train_loader):
        data, target = data.to(device), target.to(device)
        
        optimizer.zero_grad()
        output = model(data)
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()
        
        train_loss += loss.item()
        pred = output.argmax(dim=1, keepdim=True)
        correct += pred.eq(target.view_as(pred)).sum().item()
    
    avg_loss = train_loss / len(train_loader)
    accuracy = 100. * correct / len(train_loader.dataset)
    
    print(f'Epoch: {epoch}, Loss: {avg_loss:.4f}, Accuracy: {accuracy:.2f}%')

# 测试函数
def test(model, device, test_loader):
    model.eval()
    test_loss = 0
    correct = 0
    
    with torch.no_grad():
        for data, target in test_loader:
            data, target = data.to(device), target.to(device)
            output = model(data)
            test_loss += criterion(output, target).item()
            pred = output.argmax(dim=1, keepdim=True)
            correct += pred.eq(target.view_as(pred)).sum().item()
    
    test_loss /= len(test_loader)
    accuracy = 100. * correct / len(test_loader.dataset)
    
    print(f'Test set: Average loss: {test_loss:.4f}, Accuracy: {accuracy:.2f}%')
    
    return accuracy

# 训练模型
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
best_accuracy = 0

for epoch in range(1, 11):
    train(model, device, train_loader, optimizer, epoch)
    accuracy = test(model, device, test_loader)
    
    # 保存最佳模型
    if accuracy > best_accuracy:
        best_accuracy = accuracy
        torch.save(model.state_dict(), 'best_cnn_model.pth')
        print(f'Saved best model with accuracy: {accuracy:.2f}%')
```

## 🔄 循环神经网络（RNN）

### 1. 构建 RNN

```python
import torch
import torch.nn as nn

class SimpleRNN(nn.Module):
    def __init__(self, input_size, hidden_size, output_size, num_layers=1):
        super(SimpleRNN, self).__init__()
        
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        # RNN 层
        self.rnn = nn.RNN(input_size, hidden_size, num_layers, batch_first=True)
        
        # 全连接层
        self.fc = nn.Linear(hidden_size, output_size)
    
    def forward(self, x):
        # 初始化隐藏状态
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        
        # 前向传播 RNN
        out, _ = self.rnn(x, h0)
        
        # 使用最后一个时间步的输出
        out = self.fc(out[:, -1, :])
        
        return out

# LSTM
class LSTM(nn.Module):
    def __init__(self, input_size, hidden_size, output_size, num_layers=1):
        super(LSTM, self).__init__()
        
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        # LSTM 层
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        
        # 全连接层
        self.fc = nn.Linear(hidden_size, output_size)
    
    def forward(self, x):
        # 初始化隐藏状态和细胞状态
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        
        # 前向传播 LSTM
        out, _ = self.lstm(x, (h0, c0))
        
        # 使用最后一个时间步的输出
        out = self.fc(out[:, -1, :])
        
        return out
```

### 2. 序列数据训练示例

```python
import torch
import torch.nn as nn
import numpy as np

# 创建模拟序列数据
def create_sequence_data(n_samples, seq_length, input_size=1):
    X = []
    y = []
    
    for i in range(n_samples):
        # 生成正弦波序列
        start = np.random.uniform(0, 2*np.pi)
        x = np.sin(np.linspace(start, start + seq_length/10, seq_length))
        y.append(np.sin(start + (seq_length+1)/10))
        
        X.append(x.reshape(seq_length, input_size))
    
    return torch.FloatTensor(X), torch.FloatTensor(y).reshape(-1, 1)

# 创建数据
X_train, y_train = create_sequence_data(1000, 50)
X_test, y_test = create_sequence_data(200, 50)

# 创建模型
model = LSTM(input_size=1, hidden_size=64, output_size=1)
criterion = nn.MSELoss()
optimizer = optim.Adam(model.parameters(), lr=0.01)

# 训练
num_epochs = 100
for epoch in range(num_epochs):
    model.train()
    optimizer.zero_grad()
    
    output = model(X_train)
    loss = criterion(output, y_train)
    
    loss.backward()
    optimizer.step()
    
    if (epoch + 1) % 10 == 0:
        model.eval()
        with torch.no_grad():
            test_output = model(X_test)
            test_loss = criterion(test_output, y_test)
            print(f'Epoch [{epoch+1}/{num_epochs}], Train Loss: {loss.item():.6f}, Test Loss: {test_loss.item():.6f}')
```

## 🎯 实战案例：图像分类

```python
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader
import matplotlib.pyplot as plt

# 使用预训练的 ResNet
def train_image_classifier():
    # 数据预处理
    transform = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                           std=[0.229, 0.224, 0.225])
    ])
    
    # 加载数据集（这里使用 CIFAR-10 作为示例）
    train_dataset = datasets.CIFAR10('./data', train=True, download=True, transform=transform)
    test_dataset = datasets.CIFAR10('./data', train=False, download=True, transform=transform)
    
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False)
    
    # 加载预训练模型
    model = models.resnet18(pretrained=True)
    
    # 修改最后的全连接层以适应 CIFAR-10 的 10 个类别
    num_features = model.fc.in_features
    model.fc = nn.Linear(num_features, 10)
    
    # 冻结大部分参数，只训练最后几层
    for param in model.parameters():
        param.requires_grad = False
    
    # 解冻最后几层
    for param in model.layer4.parameters():
        param.requires_grad = True
    
    model.fc.requires_grad = True
    
    # 定义损失函数和优化器
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=0.001)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=7, gamma=0.1)
    
    # 训练
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = model.to(device)
    
    num_epochs = 10
    train_losses = []
    test_accuracies = []
    
    for epoch in range(num_epochs):
        model.train()
        running_loss = 0.0
        
        for inputs, labels in train_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item()
        
        # 测试
        model.eval()
        correct = 0
        total = 0
        
        with torch.no_grad():
            for inputs, labels in test_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                _, predicted = torch.max(outputs.data, 1)
                total += labels.size(0)
                correct += (predicted == labels).sum().item()
        
        epoch_loss = running_loss / len(train_loader)
        accuracy = 100 * correct / total
        
        train_losses.append(epoch_loss)
        test_accuracies.append(accuracy)
        
        scheduler.step()
        
        print(f'Epoch [{epoch+1}/{num_epochs}], Loss: {epoch_loss:.4f}, Accuracy: {accuracy:.2f}%')
    
    # 绘制训练曲线
    plt.figure(figsize=(12, 5))
    
    plt.subplot(1, 2, 1)
    plt.plot(train_losses, label='Training Loss')
    plt.title('Training Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    
    plt.subplot(1, 2, 2)
    plt.plot(test_accuracies, label='Test Accuracy')
    plt.title('Test Accuracy')
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy (%)')
    
    plt.tight_layout()
    plt.show()
    
    return model

# 运行训练
model = train_image_classifier()
```

## 📚 最佳实践

### 1. 模型保存和加载

```python
# 保存模型
torch.save(model.state_dict(), 'model.pth')

# 加载模型
model = SimpleNet(input_size=784, hidden_size=128, output_size=10)
model.load_state_dict(torch.load('model.pth'))
model.eval()

# 保存整个模型
torch.save(model, 'entire_model.pth')

# 保存检查点（包含优化器状态等）
torch.save({
    'epoch': epoch,
    'model_state_dict': model.state_dict(),
    'optimizer_state_dict': optimizer.state_dict(),
    'loss': loss,
}, 'checkpoint.pth')

# 加载检查点
checkpoint = torch.load('checkpoint.pth')
model.load_state_dict(checkpoint['model_state_dict'])
optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
epoch = checkpoint['epoch']
loss = checkpoint['loss']
```

### 2. GPU 加速

```python
# 检查 GPU 可用性
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f'使用设备: {device}')

# 将模型和数据移到 GPU
model = model.to(device)
data = data.to(device)
target = target.to(device)

# 多 GPU 训练（如果有多个 GPU）
if torch.cuda.device_count() > 1:
    model = nn.DataParallel(model)
```

### 3. 防止过拟合

```python
# 1. Dropout
self.dropout = nn.Dropout(0.5)

# 2. 批归一化
self.bn = nn.BatchNorm2d(num_features)

# 3. L2 正则化（权重衰减）
optimizer = optim.Adam(model.parameters(), lr=0.001, weight_decay=0.0001)

# 4. 早停法
class EarlyStopping:
    def __init__(self, patience=7, min_delta=0):
        self.patience = patience
        self.min_delta = min_delta
        self.counter = 0
        self.best_loss = None
        self.early_stop = False
    
    def __call__(self, val_loss):
        if self.best_loss is None:
            self.best_loss = val_loss
        elif val_loss > self.best_loss - self.min_delta:
            self.counter += 1
            if self.counter >= self.patience:
                self.early_stop = True
        else:
            self.best_loss = val_loss
            self.counter = 0

# 使用早停法
early_stopping = EarlyStopping(patience=5)

for epoch in range(num_epochs):
    # ... 训练代码 ...
    val_loss = validate()
    early_stopping(val_loss)
    if early_stopping.early_stop:
        print("早停触发")
        break
```

### 4. 混合精度训练

```python
from torch.cuda.amp import autocast, GradScaler

# 创建 GradScaler
scaler = GradScaler()

for data, target in dataloader:
    optimizer.zero_grad()
    
    # 使用自动混合精度
    with autocast():
        output = model(data)
        loss = criterion(output, target)
    
    # 反向传播
    scaler.scale(loss).backward()
    
    # 更新参数
    scaler.step(optimizer)
    scaler.update()
```

## 🎓 学习路径

1. **PyTorch 基础**（2周）
   - 张量操作
   - 自动微分
   - 简单神经网络

2. **深度学习模型**（3-4周）
   - CNN
   - RNN/LSTM
   - Transformer

3. **高级技术**（3-4周）
   - 迁移学习
   - 数据增强
   - 模型优化

4. **实战项目**（4-6周）
   - 图像分类
   - 目标检测
   - 自然语言处理

## 📖 推荐资源

- **官方文档**
  - [PyTorch 官方文档](https://pytorch.org/docs/)
  - [PyTorch 教程](https://pytorch.org/tutorials/)

- **推荐书籍**
  - 《Deep Learning with PyTorch》- Stevens et al.
  - 《Programming PyTorch for Deep Learning》- Ian Pointer

- **在线课程**
  - Fast.ai - Practical Deep Learning for Coders
  - Coursera - Deep Learning Specialization

掌握 PyTorch，开启深度学习之旅！
