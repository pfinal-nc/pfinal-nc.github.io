<template>
  <Transition name="cookie-fade">
    <div v-if="!accepted" class="cookie-consent-wrapper">
      <div class="cookie-consent">
        <div class="cookie-content">
          <div class="cookie-icon">🍪</div>
          <div class="cookie-text">
            <p class="cookie-title">Cookie 使用说明 / Cookie Notice</p>
            <p class="cookie-desc">
              本站使用 Cookie 来改善用户体验和提供个性化广告服务。继续使用本站即表示您同意我们的
              <a href="/privacy-policy" target="_blank">隐私政策</a>和Cookie使用政策。
            </p>
            <p class="cookie-desc-en">
              We use cookies to improve user experience and serve personalized ads. By continuing to use this site, you agree to our 
              <a href="/privacy-policy" target="_blank">Privacy Policy</a> and Cookie Policy.
            </p>
          </div>
          <div class="cookie-actions">
            <button @click="accept" class="cookie-btn cookie-btn-accept">
              同意 / Accept
            </button>
            <button @click="decline" class="cookie-btn cookie-btn-decline">
              拒绝 / Decline
            </button>
          </div>
        </div>
        <button @click="accept" class="cookie-close" aria-label="Close">
          ✕
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const accepted = ref(true)

onMounted(() => {
  // 检查本地存储
  const consent = localStorage.getItem('cookie-consent')
  if (!consent) {
    // 延迟显示，提供更好的用户体验
    setTimeout(() => {
      accepted.value = false
    }, 1000)
  }
})

const accept = () => {
  localStorage.setItem('cookie-consent', 'accepted')
  localStorage.setItem('cookie-consent-date', new Date().toISOString())
  accepted.value = true
  
  // 触发 GA4 同意事件（如果你想跟踪）
  if (typeof gtag !== 'undefined') {
    gtag('consent', 'update', {
      'analytics_storage': 'granted',
      'ad_storage': 'granted'
    })
  }
}

const decline = () => {
  localStorage.setItem('cookie-consent', 'declined')
  localStorage.setItem('cookie-consent-date', new Date().toISOString())
  accepted.value = true
  
  // 禁用 Google Analytics 和 AdSense Cookie
  if (typeof gtag !== 'undefined') {
    gtag('consent', 'update', {
      'analytics_storage': 'denied',
      'ad_storage': 'denied'
    })
  }
}
</script>

<style scoped>
.cookie-consent-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  padding: 0 16px 16px;
  pointer-events: none;
}

.cookie-consent {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  background: linear-gradient(135deg, rgba(26, 26, 46, 0.98) 0%, rgba(20, 20, 36, 0.98) 100%);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
              0 2px 8px rgba(0, 0, 0, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
  pointer-events: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.cookie-content {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.cookie-icon {
  font-size: 48px;
  flex-shrink: 0;
  animation: rotate 3s linear infinite;
}

@keyframes rotate {
  0%, 90%, 100% { transform: rotate(0deg); }
  92%, 98% { transform: rotate(15deg); }
  94%, 96% { transform: rotate(-15deg); }
}

.cookie-text {
  flex: 1;
  min-width: 280px;
}

.cookie-title {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 12px 0;
  letter-spacing: 0.3px;
}

.cookie-desc,
.cookie-desc-en {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 8px 0;
}

.cookie-desc-en {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0;
}

.cookie-text a {
  color: #4a9eff;
  text-decoration: underline;
  font-weight: 600;
  transition: color 0.2s ease;
}

.cookie-text a:hover {
  color: #66b3ff;
}

.cookie-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.cookie-btn {
  padding: 12px 28px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  letter-spacing: 0.3px;
}

.cookie-btn-accept {
  background: linear-gradient(135deg, #4a9eff 0%, #3a8eef 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
}

.cookie-btn-accept:hover {
  background: linear-gradient(135deg, #5aafff 0%, #4a9eff 100%);
  box-shadow: 0 6px 20px rgba(74, 158, 255, 0.4);
  transform: translateY(-2px);
}

.cookie-btn-accept:active {
  transform: translateY(0);
}

.cookie-btn-decline {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.cookie-btn-decline:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.cookie-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.7);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s ease;
}

.cookie-close:hover {
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
  transform: rotate(90deg);
}

/* 动画效果 */
.cookie-fade-enter-active,
.cookie-fade-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.cookie-fade-enter-from {
  opacity: 0;
  transform: translateY(100%);
}

.cookie-fade-leave-to {
  opacity: 0;
  transform: translateY(50px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .cookie-consent-wrapper {
    padding: 0 12px 12px;
  }
  
  .cookie-consent {
    padding: 20px;
    border-radius: 12px;
  }
  
  .cookie-content {
    gap: 16px;
  }
  
  .cookie-icon {
    font-size: 36px;
  }
  
  .cookie-title {
    font-size: 16px;
  }
  
  .cookie-desc,
  .cookie-desc-en {
    font-size: 13px;
  }
  
  .cookie-actions {
    width: 100%;
    flex-direction: column;
  }
  
  .cookie-btn {
    width: 100%;
    padding: 14px;
  }
  
  .cookie-close {
    width: 28px;
    height: 28px;
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .cookie-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .cookie-icon {
    font-size: 32px;
  }
  
  .cookie-title {
    font-size: 15px;
    margin-bottom: 8px;
  }
  
  .cookie-desc,
  .cookie-desc-en {
    font-size: 12px;
  }
}

/* 暗色模式适配 */
@media (prefers-color-scheme: light) {
  .cookie-consent {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 245, 250, 0.98) 100%);
    border-color: rgba(0, 0, 0, 0.1);
  }
  
  .cookie-title {
    color: #1a1a2e;
  }
  
  .cookie-desc,
  .cookie-desc-en {
    color: rgba(26, 26, 46, 0.8);
  }
  
  .cookie-btn-decline {
    background: rgba(0, 0, 0, 0.05);
    color: rgba(26, 26, 46, 0.9);
    border-color: rgba(0, 0, 0, 0.1);
  }
  
  .cookie-btn-decline:hover {
    background: rgba(0, 0, 0, 0.1);
  }
  
  .cookie-close {
    background: rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.1);
    color: rgba(26, 26, 46, 0.7);
  }
  
  .cookie-close:hover {
    background: rgba(0, 0, 0, 0.1);
    color: rgba(26, 26, 46, 0.9);
  }
}
</style>

