/**
 * 广告配置
 * 仅支持 Monetag 广告平台
 */

export interface MonetagAdConfig {
  zoneId: string
  adType: 'inpage-push' | 'native-banner' | 'direct-link' | 'onclick-popunder'
  enabled: boolean
}

export interface AdPositions {
  // 文章中间广告（在文章内容中间插入）
  articleMiddle: {
    monetag?: MonetagAdConfig
  }
  // 文章底部广告（在评论之前）
  articleBottom: {
    monetag?: MonetagAdConfig
  }
  // 侧边栏广告（如果有侧边栏）
  sidebar: {
    monetag?: MonetagAdConfig
  }
  // 页面头部广告
  header: {
    monetag?: MonetagAdConfig
  }
  // 全局横幅（head 中加载的全局 Monetag 脚本）
  global: MonetagAdConfig
  // OnClick Popunder（页面加载时触发，不需要容器）
  onclickPopunder: {
    monetag?: MonetagAdConfig
  }
}

// 全局广告开关
export const AD_ENABLED = true

// 广告配置
export const adConfig: AdPositions = {
  // 文章中间广告
  articleMiddle: {
    // Monetag - In-Page Push（弹窗类型）
    monetag: {
      zoneId: '9114535',
      adType: 'inpage-push',
      enabled: true
    }
  },

  // 文章底部广告
  articleBottom: {
    // Monetag - Native Banner（全屏类型）
    monetag: {
      zoneId: '9154483',
      adType: 'native-banner',
      enabled: true
    }
  },

  // 侧边栏广告
  sidebar: {
    monetag: {
      zoneId: '9899685', // Pleasant tag - Direct link
      adType: 'direct-link',
      enabled: true
    }
  },

  // 页面头部广告
  header: {
    monetag: {
      zoneId: '9894528', // Immortal tag - Direct link
      adType: 'direct-link',
      enabled: true
    }
  },

  // 全局横幅（通过 <head> 注入，加载一次）
  global: {
    zoneId: '11120977',
    adType: 'direct-link',
    enabled: true
  },

  // OnClick Popunder
  onclickPopunder: {
    monetag: {
      zoneId: '9114325', // Hot tag - OnClick (Popunder)
      adType: 'onclick-popunder',
      enabled: true
    }
  }
}

// 导出默认配置
export default adConfig
