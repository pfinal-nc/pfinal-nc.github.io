<template>
  <div v-if="showAd" class="ad-container">
    <iframe class="ad-iframe" src="https://otieu.com/4/9894528" frameborder="0"></iframe>
    <button class="ad-close-btn" @click="closeAd">×</button>
  </div>
</template>

<script>
export default {
  name: 'AdBanner',
  data() {
    return {
      showAd: true
    }
  },
  mounted() {
    // 检查cookie，如果用户已关闭广告，则不显示
    if (document.cookie.indexOf('adClosed=true') !== -1) {
      this.showAd = false
    }
  },
  methods: {
    closeAd() {
      this.showAd = false
      // 设置cookie，24小时内不再显示
      document.cookie = 'adClosed=true; max-age=86400; path=/'
    }
  }
}
</script>

<style scoped>
.ad-container {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background-image: linear-gradient(to right, #f6d365 0%, #fda085 100%);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 9999;
  text-align: center;
  padding: 10px 0;
}

.ad-iframe {
  border: none;
  width: 100%;
  max-width: 728px;
  height: 90px;
  margin: 0 auto;
  display: block;
}

.ad-close-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  background: transparent;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
}

/* 适配移动端 */
@media (max-width: 768px) {
  .ad-iframe {
    max-width: 100%;
    height: 60px;
  }
}
</style>