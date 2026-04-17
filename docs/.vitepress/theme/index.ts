import DefaultTheme from "@sugarat/theme"
import clientEnhance from "./client.js"
import CookieConsent from "./components/CookieConsent.vue"
import ArticleAds from "./components/ArticleAds.vue"
import MonetagAd from "./components/MonetagAd.vue"
import EzoicAd from "./components/EzoicAd.vue"

import "./user-theme.css"
import "./style.scss"

export default {
  extends: DefaultTheme,
  enhanceApp(ctx) {
    clientEnhance.enhanceApp?.(ctx)
  },
  globalComponents: {
    CookieConsent,
    ArticleAds,
    MonetagAd,
    EzoicAd
  }
}
