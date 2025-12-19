import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const docsDir = path.resolve(__dirname, '../docs')

// 需要添加 recommend 的目录
const targetDirs = [
  'dev/backend/golang',
  'dev/backend/php',
  'dev/backend/python',
  'dev/backend/wails-tutorial-series'
]

// 递归查找所有 markdown 文件
function findMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)
  
  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      findMarkdownFiles(filePath, fileList)
    } else if (file.endsWith('.md') && file !== 'index.md') {
      fileList.push(filePath)
    }
  })
  
  return fileList
}

// 处理单个文件
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const { data, content: body } = matter(content)
    
    // 如果已经有 recommend 字段，跳过
    if (data.recommend) {
      console.log(`⏭️  跳过（已有 recommend）: ${filePath}`)
      return false
    }
    
    // 添加 recommend 字段
    data.recommend = '后端工程'
    
    // 重新组合 frontmatter 和内容
    const newContent = matter.stringify(body, data, {
      delimiters: '---',
      language: 'yaml'
    })
    
    // 写回文件
    fs.writeFileSync(filePath, newContent, 'utf-8')
    console.log(`✅ 已添加 recommend: ${filePath}`)
    return true
  } catch (error) {
    console.error(`❌ 处理文件失败: ${filePath}`, error.message)
    return false
  }
}

// 主函数
function main() {
  console.log('🚀 开始批量添加 recommend 字段...\n')
  
  let totalFiles = 0
  let processedFiles = 0
  
  targetDirs.forEach(dir => {
    const fullPath = path.join(docsDir, dir)
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  目录不存在: ${fullPath}`)
      return
    }
    
    const files = findMarkdownFiles(fullPath)
    totalFiles += files.length
    
    console.log(`\n📁 处理目录: ${dir} (${files.length} 个文件)`)
    
    files.forEach(file => {
      if (processFile(file)) {
        processedFiles++
      }
    })
  })
  
  console.log(`\n✨ 完成！共处理 ${totalFiles} 个文件，成功添加 ${processedFiles} 个 recommend 字段`)
}

main()

