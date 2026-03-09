/**
 * 广告配置
 * 支持 Monetag 和 Ezoic 两个广告平台
 */

export interface MonetagAdConfig {
  zoneId: string
  adType: 'inpage-push' | 'native-banner' | 'direct-link' | 'onclick-popunder'
  enabled: boolean
}

export interface EzoicAdConfig {
  placementId: string | number
  enabled: boolean
}

export type AdConfig = MonetagAdConfig | EzoicAdConfig

export interface AdPositions {
  // 文章中间广告（在文章内容中间插入）
  articleMiddle: {
    monetag?: MonetagAdConfig
    ezoic?: EzoicAdConfig
  }
  // 文章底部广告（在评论之前）
  articleBottom: {
    monetag?: MonetagAdConfig
    ezoic?: EzoicAdConfig
  }
  // 侧边栏广告（如果有侧边栏）
  sidebar: {
    monetag?: MonetagAdConfig
    ezoic?: EzoicAdConfig
  }
  // 页面头部广告
  header: {
    monetag?: MonetagAdConfig
    ezoic?: EzoicAdConfig
  }
  // OnClick Popunder（页面加载时触发，不需要容器）
  onclickPopunder: {
    monetag?: MonetagAdConfig
    ezoic?: EzoicAdConfig
  }
}

// 全局广告开关（AdSense 审核期间关闭所有广告）
export const AD_ENABLED = false
// Ezoic 广告开关（AdSense 审核期间禁用）
export const EZOIC_ENABLED = false

// 广告配置
export const adConfig: AdPositions = {
  // 文章中间广告
  articleMiddle: {
    // Monetag - In-Page Push（弹窗类型）
    monetag: {
      zoneId: '9114535',
      adType: 'inpage-push',
      enabled: false
    },
    // Ezoic - AdSense 审核期间禁用
    ezoic: {
      placementId: '118',
      enabled: false
    }
  },
  
  // 文章底部广告
  articleBottom: {
    // Monetag - Native Banner（全屏类型）
    monetag: {
      zoneId: '9154483',
      adType: 'native-banner',
      enabled: false
    },
    // Ezoic - AdSense 审核期间禁用
    ezoic: {
      placementId: '119',
      enabled: false
    }
  },
  
  // 侧边栏广告
  sidebar: {
    monetag: {
      zoneId: '9899685', // Pleasant tag - Direct link
      adType: 'direct-link',
      enabled: false
    },
    ezoic: {
      placementId: '103', // TODO: 替换为实际的 Ezoic Placement ID
      enabled: false
    }
  },
  
  // 页面头部广告
  header: {
    monetag: {
      zoneId: '9894528', // Immortal tag - Direct link
      adType: 'direct-link',
      enabled: false
    },
    ezoic: {
      placementId: '104', // TODO: 替换为实际的 Ezoic Placement ID
      enabled: false
    }
  },
  
  // OnClick Popunder
  onclickPopunder: {
    monetag: {
      zoneId: '9114325', // Hot tag - OnClick (Popunder)
      adType: 'onclick-popunder',
      enabled: false
    },
    ezoic: {
      placementId: '', // Ezoic 不支持 Popunder
      enabled: false
    }
  }
}

// 导出默认配置
export default adConfig

