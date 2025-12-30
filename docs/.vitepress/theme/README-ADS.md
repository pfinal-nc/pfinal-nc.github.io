# Monetag 广告集成说明

## 概述

博客已集成 Monetag 广告平台，支持多种广告类型和位置。

## 广告位置规划

### 1. 文章中间广告（Article Middle）
- **位置**: 文章内容中间插入
- **类型**: In-Page Push
- **Zone ID**: 9114535 (Bright tag)
- **特点**: 在用户阅读过程中自然展示，不影响阅读体验

### 2. 文章底部广告（Article Bottom）
- **位置**: 文章末尾，评论组件之前
- **类型**: Native Banner (Interstitial)
- **Zone ID**: 9154483 (The best tag)
- **特点**: 用户阅读完文章后展示，转化率较高

### 3. 侧边栏广告（Sidebar）
- **位置**: 侧边栏（如果主题支持）
- **类型**: Direct Link
- **Zone ID**: 9899685 (Pleasant tag)
- **状态**: 默认禁用（博客可能没有侧边栏）

### 4. 页面头部广告（Header）
- **位置**: 页面顶部
- **类型**: Direct Link
- **Zone ID**: 9894528 (Immortal tag)
- **状态**: 默认禁用

### 5. OnClick Popunder
- **类型**: OnClick (Popunder)
- **Zone ID**: 9114325 (Hot tag)
- **状态**: 默认禁用（可能影响用户体验）

## 配置文件

广告配置位于：`docs/.vitepress/theme/config/ad-config.ts`

### 修改广告配置

```typescript
export const adConfig: AdPositions = {
  articleMiddle: {
    zoneId: '9114535',  // 修改 Zone ID
    adType: 'inpage-push',
    enabled: true  // 启用/禁用
  },
  // ... 其他配置
}
```

## 组件使用

### 在布局中使用

广告已自动集成到博客布局中，会在文章页面自动显示。

### 手动使用组件

```vue
<template>
  <MonetagAd
    position="article-bottom"
    zone-id="9154483"
    ad-type="native-banner"
    :enabled="true"
  />
</template>

<script setup>
import MonetagAd from './components/MonetagAd.vue'
</script>
```

## 广告类型说明

- **inpage-push**: 页面内推送广告，适合文章中间
- **native-banner**: 原生横幅广告，适合文章底部
- **direct-link**: 直接链接广告，适合侧边栏
- **onclick-popunder**: 点击弹窗广告，谨慎使用

## 注意事项

1. **用户体验**: 广告不应过多，建议只启用 1-2 个位置
2. **移动端适配**: 所有广告已包含响应式设计
3. **性能**: 广告脚本异步加载，不影响页面性能
4. **隐私**: 遵守 GDPR 和隐私政策要求

## 测试

1. 本地开发环境测试广告显示
2. 检查控制台是否有错误
3. 验证不同设备上的显示效果
4. 确认广告统计正常

## 更新 Zone ID

如果需要更换广告 Zone：

1. 登录 Monetag 后台：https://publishers.monetag.com
2. 进入网站管理页面
3. 选择对应的广告区域
4. 复制 Zone ID
5. 更新 `ad-config.ts` 中的配置

## 技术支持

- Monetag 文档: https://help.monetag.com
- 问题反馈: 检查浏览器控制台错误信息

