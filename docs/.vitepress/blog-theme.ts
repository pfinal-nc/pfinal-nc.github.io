// 主题独有配置
import { getThemeConfig } from '@sugarat/theme/node'


const friend_zh = [
  { nickname: 'PHP武器库', des: '你的指尖用于改变世界的力量', avatar: 'https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202503140939616.jpg', url: 'https://phpreturn.com' },
  { nickname: 'Guangzheng Li', des: 'Guangzheng Li个人博客', avatar: 'https://guangzhengli.com/favicon.png', url: 'https://jspang.com' },
  { nickname: '满江风雪', des: '时光漫漫，何妨扬眉淡笑，心境从容？', avatar: 'https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202503140939616.jpg', url: 'https://forever.run' },
  { nickname: '廖雪峰', des: '廖雪峰的官方网站 (liaoxuefeng.com) 研究互联网产品和技术，提供原创中文精品教程', avatar: 'https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202503140939616.jpg', url: 'https://liaoxuefeng.com' },
  { nickname: 'so1n-python', des: 'so1n 研究互联网产品和技术，提供原创中文精品教程', avatar: 'https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202503140939616.jpg', url: 'https://so1n.me' },
  { nickname: 'LuLublog', des: 'lulublog记录php工作和学习笔记', avatar: 'https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202503140939616.jpg', url: 'https://lulublog.cn' }
]
const friend_en = [
  { nickname: 'PHP Arsenal', des: 'The power at your fingertips to change the world', avatar: 'https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202503140939616.jpg', url: 'https://phpreturn.com' },
  { nickname: 'Guangzheng Li', des: 'Guangzheng Li', avatar: 'https://guangzhengli.com/favicon.png', url: 'https://guangzhengli.com/' },
  { nickname: 'Manjiang Snow', des: 'Time flows, keep a calm mind and a gentle smile', avatar: 'https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202503140939616.jpg', url: 'https://forever.run' },
  { nickname: 'Liao Xuefeng', des: 'Official site with original Chinese tech tutorials', avatar: 'https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202503140939616.jpg', url: 'https://liaoxuefeng.com' },
  { nickname: 'so1n-python', des: 'so1n: Original Chinese tech tutorials', avatar: 'https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202503140939616.jpg', url: 'https://so1n.me' },
  { nickname: 'LuLublog', des: 'LuLublog: PHP work and study notes', avatar: 'https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202503140939616.jpg', url: 'https://lulublog.cn' }
]

function getFriendByLocale(locale) {
  return locale === 'zh-CN' ? friend_zh : friend_en
}

const blogTheme = getThemeConfig({
  // 开启RSS支持（暂时注释，解决构建错误后再启用）
  // RSS: {
  //   title: 'PFinalClub Tech Blog',
  //   baseUrl: 'https://friday-go.icu',
  //   copyright: 'Copyright (c) 2024-present, PFinalClub',
  //   description: 'PFinalClub - 专注于 Golang, PHP, Python 的技术博客',
  //   language: 'zh-CN',
  //   filename: 'feed.xml',
  //   log: true,
  //   limit: 50
  // },

  // 搜索
  // 默认开启pagefind离线的全文搜索支持（如使用其它的可以设置为false）
  // search: false,

  // markdown 图表支持（会增加一定的构建耗时）
  // mermaid: trues
  darkTransition: true,
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
    // 文章过滤 - 支持子目录匹配
    filter: (page) => {
      // 排除隐藏的文章
      if (page.meta.hidden === true) {
        return false
      }
      
      // 获取当前页面的路径（从 route 中提取）
      // 注意：这里无法直接获取当前页面路径，但可以通过检查 page.route 来判断
      // 如果文章路径以 /dev/backend/ 开头（但不等于 /dev/backend/），则允许推荐
      const pageRoute = page.route || ''
      
      // 对于 /dev/backend/ 目录下的所有文章（包括子目录），都允许推荐
      // 这样当访问 /dev/backend/index.md 时，可以匹配到子目录下的文章
      if (pageRoute.startsWith('/dev/backend/')) {
        return true
      }
      
      // 其他文章按原逻辑处理
      return true
    },
  },
  friend: getFriendByLocale('en'),
  // 公告
  popover: {
    title: 'Announcement',
    body: [
      { type: 'text', content: '👇Official Account👇' },
      {
        type: 'image',
        src: 'https://raw.githubusercontent.com/pfinal-nc/iGallery/master/blog/202503140949946.png',
      },
      {
        type: 'text',
        content: 'Welcome to join the group & private message'
      },
      {
        type: 'text',
        content: 'Article first/tail QR code',
        style: 'padding-top:0'
      },
      {
        type: 'button',
        content: 'Author Blog',
        link: 'https://friday-go.icu'
      },
    ],
    duration: 0
  },
})

export { blogTheme }
