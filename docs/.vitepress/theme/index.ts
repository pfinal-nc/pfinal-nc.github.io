import BlogTheme from '@sugarat/theme'
import type { Theme } from 'vitepress'

// 导入客户端增强文件
import clientEnhance from './client'

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
    
  }
}


export default theme