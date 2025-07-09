// 主题独有配置
import { getThemeConfig } from '@sugarat/theme/node'


const friend_zh = [
  { nickname: 'PHP武器库', des: '你的指尖用于改变世界的力量', avatar: 'https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202503140939616.jpg', url: 'https://phpreturn.com' },
  { nickname: '技术胖', des: '技术胖的个人博客', avatar: 'https://jspang.com/img/avatar.jpg', url: 'https://jspang.com' },
  { nickname: '满江风雪', des: '时光漫漫，何妨扬眉淡笑，心境从容？', avatar: 'https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202503140939616.jpg', url: 'https://forever.run' },
  { nickname: '廖雪峰', des: '廖雪峰的官方网站 (liaoxuefeng.com) 研究互联网产品和技术，提供原创中文精品教程', avatar: 'https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202503140939616.jpg', url: 'https://liaoxuefeng.com' },
  { nickname: 'so1n-python', des: 'so1n 研究互联网产品和技术，提供原创中文精品教程', avatar: 'https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202503140939616.jpg', url: 'https://so1n.me' },
  { nickname: 'LuLublog', des: 'lulublog记录php工作和学习笔记', avatar: 'https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202503140939616.jpg', url: 'https://lulublog.cn' }
]
const friend_en = [
  { nickname: 'PHP Arsenal', des: 'The power at your fingertips to change the world', avatar: 'https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202503140939616.jpg', url: 'https://phpreturn.com' },
  { nickname: 'JSPang', des: 'JSPang Personal Blog', avatar: 'https://jspang.com/img/avatar.jpg', url: 'https://jspang.com' },
  { nickname: 'Manjiang Snow', des: 'Time flows, keep a calm mind and a gentle smile', avatar: 'https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202503140939616.jpg', url: 'https://forever.run' },
  { nickname: 'Liao Xuefeng', des: 'Official site with original Chinese tech tutorials', avatar: 'https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202503140939616.jpg', url: 'https://liaoxuefeng.com' },
  { nickname: 'so1n-python', des: 'so1n: Original Chinese tech tutorials', avatar: 'https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202503140939616.jpg', url: 'https://so1n.me' },
  { nickname: 'LuLublog', des: 'LuLublog: PHP work and study notes', avatar: 'https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202503140939616.jpg', url: 'https://lulublog.cn' }
]

function getFriendByLocale(locale) {
  return locale === 'zh-CN' ? friend_zh : friend_en
}

const blogTheme = getThemeConfig({
  // 开启RSS支持
  // RSS,

  // 搜索
  // 默认开启pagefind离线的全文搜索支持（如使用其它的可以设置为false）
  // search: false,

  // markdown 图表支持（会增加一定的构建耗时）
  // mermaid: trues

  // 页脚
  footer: {
    // message 字段支持配置为HTML内容，配置多条可以配置为数组
    // message: '下面 的内容和图标都是可以修改的噢（当然本条内容也是可以隐藏的）',
    copyright: 'MIT License | PFinalClub',
    // icpRecord: {
    //   name: '蜀ICP备19011724号',
    //   link: 'https://beian.miit.gov.cn/'
    // },
    // securityRecord: {
    //   name: '公网安备xxxxx',
    //   link: 'https://www.beian.gov.cn/portal/index.do'
    // },
    version: false,
    
  },
  // 主题色修改
  themeColor: 'el-blue',

  // 文章默认作者
  author: 'PFinal南丞',

  // 文章过滤
  recommend: {
    // 文章过滤
    filter: (page) => {
      return page.meta.hidden !== true
    },
  },
  friend: getFriendByLocale('en'),
  // 公告
  popover: {
    title: '公告',
    body: [
      { type: 'text', content: '👇公众号👇' },
      {
        type: 'image',
        src: 'https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202503140949946.png',
      },
      {
        type: 'text',
        content: '欢迎大家加群&私信交流'
      },
      {
        type: 'text',
        content: '文章首/文尾二维码',
        style: 'padding-top:0'
      },
      {
        type: 'button',
        content: '作者博客',
        link: 'https://friday-go.icu'
      },
    ],
    duration: 0
  },
})

export { blogTheme }
