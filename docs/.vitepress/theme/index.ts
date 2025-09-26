import BlogTheme from '@sugarat/theme'
import type { Theme } from 'vitepress'

// 导入客户端增强文件
import clientEnhance from './client'

// 自定义样式重载
import './style.scss'

// 导入广告框样式
import './ad-banner.css'

// 自定义主题色
// import './user-theme.css'

// 扩展默认主题
const theme: Theme = {
  ...BlogTheme,
  enhanceApp(ctx) {
    // 应用客户端增强
    clientEnhance.enhanceApp(ctx)
    
    // 在客户端添加广告框
    if (typeof window !== 'undefined') {
      window.addEventListener('DOMContentLoaded', () => {
        addAdBanner();
      });
    }
  }
}

// 添加广告框函数
function addAdBanner() {
  if (typeof window === 'undefined') return;
  
  // 检查cookie，如果用户已关闭广告，则不显示
  if (document.cookie.indexOf('adClosed=true') !== -1) return;
  
  // 检查是否已存在广告框
  if (document.getElementById('ad-container')) return;
  
  // 创建广告容器
  // const adContainer = document.createElement('div');
  // adContainer.id = 'ad-container';
  // adContainer.className = 'ad-container';
  
  // 创建iframe
  // const adIframe = document.createElement('iframe');
  // adIframe.className = 'ad-iframe';
  // adIframe.src = 'https://otieu.com/4/9894528';
  // adIframe.frameBorder = '0';
  
  // // 创建关闭按钮
  // const closeBtn = document.createElement('button');
  // closeBtn.className = 'ad-close-btn';
  // closeBtn.innerHTML = '×';
  // closeBtn.onclick = function() {
  //   adContainer.style.display = 'none';
  //   // 设置cookie，24小时内不再显示
  //   document.cookie = 'adClosed=true; max-age=86400; path=/';
  // };
  
  // // 组装广告框
  // adContainer.appendChild(adIframe);
  // adContainer.appendChild(closeBtn);
  
  // // 添加到页面
  // document.body.appendChild(adContainer);
}

export default theme