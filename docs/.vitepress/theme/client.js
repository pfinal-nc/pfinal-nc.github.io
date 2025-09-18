// 客户端增强文件
export default {
  enhanceApp({ app, router }) {
    // 创建添加广告框的函数
    const addAdBanner = () => {
      // 检查是否已经存在广告框
      if (document.getElementById('ad-container')) {
        return;
      }
      
      // 检查cookie，如果用户已关闭广告，则不显示
      if (document.cookie.indexOf('adClosed=true') !== -1) {
        return;
      }
      
      // 创建广告容器
      const adContainer = document.createElement('div');
      adContainer.id = 'ad-container';
      adContainer.style.position = 'fixed';
      adContainer.style.bottom = '0';
      adContainer.style.left = '0';
      adContainer.style.width = '100%';
      adContainer.style.backgroundImage = 'linear-gradient(to right, #f6d365 0%, #fda085 100%)';
      adContainer.style.boxShadow = '0 -2px 10px rgba(0, 0, 0, 0.1)';
      adContainer.style.zIndex = '9999';
      adContainer.style.textAlign = 'center';
      adContainer.style.padding = '10px 0';
      
      // 创建iframe元素
      const adFrame = document.createElement('iframe');
      adFrame.src = 'https://otieu.com/4/9894528';
      adFrame.style.border = 'none';
      adFrame.style.width = '100%';
      adFrame.style.maxWidth = '728px';
      adFrame.style.height = '90px';
      adFrame.style.margin = '0 auto';
      adFrame.style.display = 'block';
      
      // 创建关闭按钮
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '×';
      closeButton.style.position = 'absolute';
      closeButton.style.top = '5px';
      closeButton.style.right = '5px';
      closeButton.style.background = 'transparent';
      closeButton.style.border = 'none';
      closeButton.style.fontSize = '20px';
      closeButton.style.cursor = 'pointer';
      closeButton.style.color = '#666';
      closeButton.onclick = function() {
        adContainer.style.display = 'none';
        // 设置cookie，24小时内不再显示
        document.cookie = 'adClosed=true; max-age=86400; path=/';
      };
      
      // 添加元素到页面
      adContainer.appendChild(adFrame);
      adContainer.appendChild(closeButton);
      document.body.appendChild(adContainer);
    };

    // 在客户端环境中执行
    if (typeof window !== 'undefined') {
      // 使用MutationObserver监听DOM变化，确保在DOM准备好后添加广告框
      const observer = new MutationObserver((mutations, obs) => {
        if (document.body) {
          addAdBanner();
          obs.disconnect(); // 停止观察
        }
      });
      
      // 开始观察document，等待body元素出现
      observer.observe(document, {
        childList: true,
        subtree: true
      });
      
      // 在路由变化后添加广告框
      if (router) {
        router.onAfterRouteChanged = addAdBanner;
      }
      
      // 作为备份，也在window加载完成后尝试添加
      window.addEventListener('load', addAdBanner);
    }
  }
};