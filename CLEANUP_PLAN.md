# 博客目录结构优化计划

## 📋 待执行的操作清单

### ✅ 已完成
- [x] 创建备份目录: `backup-20260311-113601/`
- [x] 备份 `Tools/` 目录
- [x] 备份 `courses/rxjs/` 目录

### ⏳ 待确认执行

#### 步骤 1: 删除重复目录
```bash
# 删除重复的 Tools/ 目录 (22个文件)
rm -rf docs/Tools/

# 删除重复的 courses/rxjs/ 目录 (29个文件,内容与 dev/backend/rxjs/ 完全相同)
rm -rf docs/courses/rxjs/
```

#### 步骤 2: 移动分类错误的文件
```bash
# 安全相关 → security/engineering/
mv docs/tools/从手动到自动-Go语言助力快速识别代码中的安全隐患.md \
   docs/security/engineering/

# 方法论 → thinking/method/
mv docs/tools/测试驱动开发\ 以测试为引擎的软件工程实践.md \
   docs/thinking/method/

# Go开发相关 → dev/backend/golang/
mv docs/tools/让CLI工具焕然一新！用golang与Color库打造多彩命令行体验.md \
   docs/dev/backend/golang/
```

#### 步骤 3: 移动 AI 工具文章
```bash
# AI工具 → tools/
mv docs/thinking/notes/Vibe-Coding-时代的开发者：如何跟-ChatGPT-5.1-一起写代码，而不是被替代.md \
   docs/tools/
mv docs/thinking/notes/Qwen\ Code\ 30个使用小技巧.md \
   docs/tools/

# 自动化 → data/automation/
mv docs/thinking/notes/使用扣子AI打造公众号机器人.md \
   docs/data/automation/
```

#### 步骤 4: 移动根目录孤立文章
```bash
# Wails 实践 → thinking/notes/
mv docs/wails-gonavi-practice.md \
   docs/thinking/notes/

# Web系统开发对比 → thinking/method/
mv docs/thinking/现代Web系统开发\ 与\ 传统Web系统开发\ 的差异.md \
   docs/thinking/method/
```

## 📊 影响范围统计

| 操作类型 | 文件/目录数量 | 说明 |
|---------|--------------|------|
| 删除重复目录 | 2 | Tools/, courses/rxjs/ |
| 移动文件 | 8 | 分类调整 |
| 保留内容 | 100% | 所有内容均在备份中 |

## 🔒 安全保障

- ✅ 所有删除操作前已备份
- ✅ 备份位置: `backup-20260311-113601/`
- ✅ 如需回滚,可从备份恢复

## ⚠️ 注意事项

1. 删除操作不可逆,请确认备份成功
2. 移动文件后需要检查导航链接是否正常
3. 建议在测试环境先验证

---

**请确认是否继续执行以上操作？**
