import{_ as s,c as n,o as p,a6 as l}from"./chunks/framework.B5rgnJXo.js";const g=JSON.parse('{"title":"使用扣子AI打造公众号机器人","description":"使用扣子AI打造公众号机器人","frontmatter":{"title":"使用扣子AI打造公众号机器人","date":"2024-06-21T09:32:24.000Z","tags":["工具"],"description":"使用扣子AI打造公众号机器人","author":"PFinal南丞","keywords":"使用扣子AI打造公众号机器人, AI,机器人 , 公众号"},"headers":[],"relativePath":"工具/使用扣子AI打造公众号机器人.md","filePath":"工具/使用扣子AI打造公众号机器人.md","lastUpdated":1742353061000}'),t={name:"工具/使用扣子AI打造公众号机器人.md"};function e(i,a,r,c,o,h){return p(),n("div",{"data-pagefind-body":!0},a[0]||(a[0]=[l(`<h1 id="使用扣子ai打造公众号机器人" tabindex="-1">使用扣子AI打造公众号机器人 <a class="header-anchor" href="#使用扣子ai打造公众号机器人" aria-label="Permalink to &quot;使用扣子AI打造公众号机器人&quot;">​</a></h1><p>刷掘金的时候,看到了扣子AI,支持公众号接入,好多公众号主都已接入,实现了好多好玩的功能.于是作为一个能偷懒就上的原则.也接入一下试试. 毕竟 每次遇到编程问题,不是打开 chatgpt,就是打开谷歌.相对于每天登录微信而言,是有点麻烦,所以开搞.</p><h3 id="搭建机器人" tabindex="-1">搭建机器人 <a class="header-anchor" href="#搭建机器人" aria-label="Permalink to &quot;搭建机器人&quot;">​</a></h3><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202406211035539.png" alt=""></p><p>如上图所示:</p><ol><li>点击创建bot</li></ol><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202406211036569.png" alt=""></p><ol start="2"><li><p>如上图所示.重点来了,之前尝试搭建过,一直以为模型选的好,效果才能杠杠滴.后来多玩了几次后.发现 人设与回复逻辑写的好,出来的效果更好.</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span># 角色</span></span>
<span class="line"><span>你是一位资深的软件开发工作者，精通多种编程语言，如 Java、Python、Go、Shell、h5、js、ts 等，同时还拥有丰富的运维和 DBA 从业经验。</span></span>
<span class="line"><span></span></span>
<span class="line"><span>## 技能</span></span>
<span class="line"><span>### 技能 1: 解答研发过程中的问题</span></span>
<span class="line"><span>1. 当用户在研发过程中遇到问题时，你需要使用相关工具搜索解决方案。</span></span>
<span class="line"><span>2. 如果你不确定如何解决问题，可以使用工具搜索相关的技术文章或论坛帖子，以获取更多的信息。</span></span>
<span class="line"><span>3. 根据搜索结果，提供详细的解决方案，帮助用户解决问题。</span></span>
<span class="line"><span></span></span>
<span class="line"><span>### 技能 2: 提供软件设计解决方案</span></span>
<span class="line"><span>1. 当用户需要软件设计解决方案时，你需要先了解用户的需求和目标。</span></span>
<span class="line"><span>2. 根据用户的需求和目标，提供可行的软件设计方案。</span></span>
<span class="line"><span>3. 与用户沟通，确保设计方案符合用户的需求和期望。</span></span>
<span class="line"><span></span></span>
<span class="line"><span>## 限制</span></span>
<span class="line"><span>- 只讨论与软件开发相关的内容，拒绝回答与软件开发无关的话题。</span></span>
<span class="line"><span>- 所输出的内容必须按照给定的格式进行组织，不能偏离框架要求。</span></span>
<span class="line"><span>- 总结部分不能超过 100 字。</span></span>
<span class="line"><span>- 只会输出知识库中已有内容, 不在知识库中的书籍, 通过 工具去了解。</span></span></code></pre></div><p>上面是大神的 人设 与提示语.复制过来就可以用了</p></li><li><p>后面选择插件, 很多人跟我一样,不知道选啥插件的时候,就如下图所示:</p><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202406211040393.png" alt=""></p></li></ol><p>​ 根据提示语自动选插件,然后后期慢慢调试.</p><ol start="4"><li><p>调试一下机器人试试,效果还不错 <img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202406211041366.png" alt=""></p></li><li><p>发布到公众号,公众号后台 拿到 AppID 一填写,点击发布.就可以在公众号下 愉快的玩耍嘞</p></li></ol><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202406211055281.png" alt=""></p><h3 id="公众号下尝试" tabindex="-1">公众号下尝试 <a class="header-anchor" href="#公众号下尝试" aria-label="Permalink to &quot;公众号下尝试&quot;">​</a></h3><p>由于我的公众号之前设置了自动回复,于是 先 去掉了自动回复,然后重新授权.进行了测试.效果如下:</p><p><img src="https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202406211048888.png" alt=""></p><p>这样就可以愉快的玩耍起来了, 注意这个值回答 编程之内的问题昂</p>`,15)]))}const _=s(t,[["render",e]]);export{g as __pageData,_ as default};
