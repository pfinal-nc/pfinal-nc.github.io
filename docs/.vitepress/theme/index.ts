import BlogTheme from '@sugarat/theme'
import type { Theme } from 'vitepress'
import { h } from 'vue'

// 导入客户端增强文件
import clientEnhance from './client'

// 导入Giscus评论组件
import GiscusComment from './components/GiscusComment.vue'

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
      // 在文档底部插入评论组件
      'doc-after': () => h(GiscusComment)
    })
  }
}


export default theme