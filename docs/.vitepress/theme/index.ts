import DefaultTheme from "@sugarat/theme"
import clientEnhance from "./client.js"

import "./user-theme.css"
import "./style.scss"

export default {
  extends: DefaultTheme,
  enhanceApp(ctx) {
    // 调用 client.js 的 enhanceApp（404 重定向、标签隐藏、统计等）
    clientEnhance.enhanceApp?.(ctx)
  }
}
