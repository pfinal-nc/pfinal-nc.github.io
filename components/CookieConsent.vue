<template>
  <div v-if="showBanner" class="cookie-consent">
    <div class="cookie-content">
      <p>
        <strong>🍪 Cookie Notice</strong><br>
        We use cookies to enhance your experience and analyze site traffic. 
        By continuing to use this site, you agree to our use of cookies.
        <a href="/privacy-policy" target="_blank">Learn more</a>
      </p>
      <div class="cookie-actions">
        <button @click="acceptCookies" class="btn-accept">Accept All</button>
        <button @click="declineCookies" class="btn-decline">Decline</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const showBanner = ref(false)

onMounted(() => {
  const consent = localStorage.getItem('cookie-consent')
  if (!consent) {
    showBanner.value = true
  }
})

const acceptCookies = () => {
  localStorage.setItem('cookie-consent', 'accepted')
  showBanner.value = false
  // 如果接受，可以启用 Google Analytics 等
}

const declineCookies = () => {
  localStorage.setItem('cookie-consent', 'declined')
  showBanner.value = false
}
</script>

<style scoped>
.cookie-consent {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.95);
  color: white;
  padding: 20px;
  z-index: 9999;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
}

.cookie-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.cookie-content p {
  margin: 0;
  flex: 1;
  font-size: 14px;
  line-height: 1.6;
}

.cookie-content a {
  color: #42b983;
  text-decoration: underline;
}

.cookie-actions {
  display: flex;
  gap: 10px;
}

.btn-accept,
.btn-decline {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-accept {
  background: #42b983;
  color: white;
}

.btn-accept:hover {
  background: #35a372;
}

.btn-decline {
  background: #666;
  color: white;
}

.btn-decline:hover {
  background: #555;
}

@media (max-width: 768px) {
  .cookie-content {
    flex-direction: column;
    text-align: center;
  }
  
  .cookie-actions {
    width: 100%;
    justify-content: center;
  }
}
</style>

