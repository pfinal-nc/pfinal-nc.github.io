(() => {
  // 广告配置
  const config = {
    zoneId: 9114325,
    domain: 'madurird.com',
    async: true,
    cfasync: false
  };
  
  // 加载广告脚本
  function loadAdScript() {
    const script = document.createElement('script');
    script.src = `//${config.domain}/tag.min.js`;
    script.setAttribute('data-zone', config.zoneId);
    script.setAttribute('data-cfasync', config.cfasync);
    script.async = config.async;
    script.onerror = () => _qtobc();
    script.onload = () => _ajdgqjqb();
    document.head.appendChild(script);
  }

  // 初始化广告
  function initAd() {
    loadAdScript();
  }

  // 启动
  initAd();
})();