import DefaultTheme from "@sugarat/theme"
import clientEnhance from "./client.js"
import CookieConsent from "./components/CookieConsent.vue"

import "./user-theme.css"
import "./style.scss"

export default {
  extends: DefaultTheme,
  enhanceApp(ctx) {
    clientEnhance.enhanceApp?.(ctx)
  },
  globalComponents: {
    CookieConsent
  }
}
