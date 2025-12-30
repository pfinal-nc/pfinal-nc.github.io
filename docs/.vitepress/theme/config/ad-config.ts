/**
 * Monetag 广告配置
 * 根据不同的广告位置配置对应的 Zone ID
 */

export interface AdConfig {
  zoneId: string
  adType: 'inpage-push' | 'native-banner' | 'direct-link' | 'onclick-popunder'
  enabled: boolean
}

export interface AdPositions {
  // 文章中间广告（在文章内容中间插入）
  articleMiddle: AdConfig
  // 文章底部广告（在评论之前）
  articleBottom: AdConfig
  // 侧边栏广告（如果有侧边栏）
  sidebar: AdConfig
  // 页面头部广告
  header: AdConfig
  // OnClick Popunder（页面加载时触发，不需要容器）
  onclickPopunder: AdConfig
}

// 全局广告开关 - 如果 Monetag SDK 无法加载，可以临时设置为 false
export const AD_ENABLED = true

// 广告配置 - 使用你的 Monetag Zone ID
export const adConfig: AdPositions = {
  // 文章中间广告 - 使用 In-Page Push（弹窗类型，但可以正常工作）
  // Direct Link 类型不是用于容器中显示广告的，会导致 CORS 和 404 错误
  articleMiddle: {
    zoneId: '9114535', // Bright tag - In-Page Push
    adType: 'inpage-push',
    enabled: AD_ENABLED && true // 受全局开关控制
  },
  
  // 文章底部广告 - 使用 Native Banner（全屏类型，但可以正常工作）
  // Direct Link 类型不是用于容器中显示广告的，会导致 CORS 和 404 错误
  articleBottom: {
    zoneId: '9154483', // The best tag - Native Banner (Interstitial)
    adType: 'native-banner',
    enabled: AD_ENABLED && true // 受全局开关控制
  },
  
  // 侧边栏广告 - 使用 Direct Link
  sidebar: {
    zoneId: '9899685', // Pleasant tag - Direct link
    adType: 'direct-link',
    enabled: false // 如果博客没有侧边栏，可以禁用
  },
  
  // 页面头部广告
  header: {
    zoneId: '9894528', // Immortal tag - Direct link
    adType: 'direct-link',
    enabled: false // 根据需求启用
  },
  
  // OnClick Popunder - 页面加载时触发
  onclickPopunder: {
    zoneId: '9114325', // Hot tag - OnClick (Popunder)
    adType: 'onclick-popunder',
    enabled: false // 谨慎使用，可能影响用户体验
  }
}

// 导出默认配置
export default adConfig

