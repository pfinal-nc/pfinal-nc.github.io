#!/bin/bash

# VitePress Frontmatter 检查脚本
# 检查所有Markdown文件的frontmatter格式和内容

BASE_DIR="/Users/pfinal/Documents/pfinal-vue-blog/docs"
REPORT_FILE="/Users/pfinal/Documents/pfinal-vue-blog/frontmatter-analysis-report.md"

echo "# VitePress Frontmatter 检查报告" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "生成时间: $(date '+%Y-%m-%d %H:%M:%S')" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 统计信息
total_files=0
valid_files=0
invalid_files=0
missing_files=0
files_with_keywords=0
files_with_description=0

echo "## 📊 总体统计" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 遍历所有Markdown文件
while IFS= read -r -d '' file; do
    ((total_files++))
    
    # 检查是否包含frontmatter分隔符
    if grep -q "^---$" "$file"; then
        ((valid_files++))
        
        # 提取frontmatter内容
        frontmatter=$(sed -n '/^---$/,/^---$/{/^---$/d; /^---$/d; p;}' "$file" | head -1)
        
        # 检查是否有title
        if grep -q "^title:" "$file"; then
            title=$(grep "^title:" "$file" | head -1 | cut -d':' -f2- | sed 's/^[[:space:]]*//' | sed 's/"//g')
            
            # 检查是否有keywords
            if grep -q "^keywords:" "$file"; then
                ((files_with_keywords++))
            fi
            
            # 检查是否有description
            if grep -q "^description:" "$file"; then
                ((files_with_description++))
            fi
        fi
    else
        ((missing_files++))
        echo "⚠️ 缺少frontmatter: $file" >> "$REPORT_FILE"
    fi
done < <(find "$BASE_DIR" -type f -name "*.md" -print0)

echo "- 总文件数: $total_files" >> "$REPORT_FILE"
echo "- 有效frontmatter: $valid_files" >> "$REPORT_FILE"
echo "- 缺少frontmatter: $missing_files" >> "$REPORT_FILE"
echo "- 包含keywords: $files_with_keywords" >> "$REPORT_FILE"
echo "- 包含description: $files_with_description" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## 🔍 详细检查" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 检查特定问题
echo "### 1. 缺少title的文章" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
find "$BASE_DIR" -type f -name "*.md" -print0 | while IFS= read -r -d '' file; do
    if ! grep -q "^title:" "$file"; then
        echo "- $file" >> "$REPORT_FILE"
    fi
done

echo "" >> "$REPORT_FILE"
echo "### 2. 缺少description的文章" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
find "$BASE_DIR" -type f -name "*.md" -print0 | while IFS= read -r -d '' file; do
    if ! grep -q "^description:" "$file"; then
        echo "- $file" >> "$REPORT_FILE"
    fi
done

echo "" >> "$REPORT_FILE"
echo "### 3. 缺少keywords的文章" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
find "$BASE_DIR" -type f -name "*.md" -print0 | while IFS= read -r -d '' file; do
    if ! grep -q "^keywords:" "$file"; then
        echo "- $file" >> "$REPORT_FILE"
    fi
done

echo "" >> "$REPORT_FILE"
echo "### 4. Frontmatter格式示例" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
find "$BASE_DIR" -type f -name "*.md" | head -5 | while read -r file; do
    echo "**文件**: $(basename "$file")" >> "$REPORT_FILE"
    echo "\`\`\`" >> "$REPORT_FILE"
    head -20 "$file" >> "$REPORT_FILE"
    echo "\`\`\`" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
done

echo "✅ 检查完成！报告已保存到: $REPORT_FILE"
