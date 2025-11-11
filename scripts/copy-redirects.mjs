import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 源文件和目标文件路径
const sourcePath = path.resolve(__dirname, '../docs/public/_redirects')
const targetPath = path.resolve(__dirname, '../docs/.vitepress/dist/_redirects')

console.log('🔄 Copying _redirects file...')

if (!fs.existsSync(sourcePath)) {
  console.error('❌ Source _redirects file not found:', sourcePath)
  process.exit(1)
}

// 确保目标目录存在
const targetDir = path.dirname(targetPath)
if (!fs.existsSync(targetDir)) {
  console.error('❌ Build directory not found:', targetDir)
  process.exit(1)
}

// 复制文件
fs.copyFileSync(sourcePath, targetPath)

// 验证文件内容
const sourceContent = fs.readFileSync(sourcePath, 'utf-8')
const targetContent = fs.readFileSync(targetPath, 'utf-8')

if (sourceContent === targetContent) {
  const lineCount = sourceContent.split('\n').length
  console.log(`✅ _redirects file copied successfully!`)
  console.log(`📊 Total lines: ${lineCount}`)
  console.log(`📁 Source: ${sourcePath}`)
  console.log(`📁 Target: ${targetPath}`)
} else {
  console.error('❌ File content mismatch after copy!')
  process.exit(1)
}

