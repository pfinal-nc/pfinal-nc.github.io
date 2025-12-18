import BlogTheme from '@sugarat/theme'
import type { Theme } from 'vitepress'
import { h } from 'vue'

// 导入客户端增强文件
import clientEnhance from './client'

// 导入Giscus评论组件
import GiscusComment from './components/GiscusComment.vue'

// 导入Cookie同意横幅组件
import CookieConsent from './components/CookieConsent.vue'

// 导入阅读进度条组件
import ReadingProgress from './components/ReadingProgress.vue'

// 导入面包屑导航组件
import Breadcrumb from './components/Breadcrumb.vue'

// 导入自定义 404 页面组件
import NotFound from './components/NotFound.vue'

// 自定义样式重载
import './style.scss'


// 自定义主题色
// import './user-theme.css'

// 扩展默认主题
const theme: Theme = {
  ...BlogTheme,
  enhanceApp(ctx) {
    // 应用客户端增强
    clientEnhance.enhanceApp(ctx)
    
    // 注册Giscus评论组件
    ctx.app.component('GiscusComment', GiscusComment)
  },
  Layout: () => {
    return h(BlogTheme.Layout, null, {
      // 在页面顶部插入阅读进度条
      'layout-top': () => h(ReadingProgress),
      // 在文档顶部插入面包屑导航
      'doc-top': () => h(Breadcrumb),
      // 在文档底部插入评论组件
      'doc-after': () => h(GiscusComment),
      // 在页面底部插入Cookie同意横幅
      'layout-bottom': () => h(CookieConsent),
      // 使用自定义 404 页面（带智能重定向）
      'not-found': () => h(NotFound)
    })
  }
}


export default theme