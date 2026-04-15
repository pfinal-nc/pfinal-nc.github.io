#!/usr/bin/env python3
"""
normalize-frontmatter.py
批量规范化 docs/ 下所有 Markdown 文件的 frontmatter：
  1. date: ISO 8601 (含 T/Z) → YYYY-MM-DD HH:MM:SS
  2. keywords: 逗号分隔字符串 → YAML 数组
  3. 缺少 keywords 的文件：根据 tags / title 自动补全
"""

import os
import re
import sys
from pathlib import Path
from datetime import datetime, timezone

# ── 配置 ────────────────────────────────────────────────────────────────────
DOCS_DIR = Path(__file__).parent.parent / "docs"
DRY_RUN  = "--dry-run" in sys.argv   # 加 --dry-run 参数仅预览，不写文件
# ─────────────────────────────────────────────────────────────────────────────

changed_files = []
skipped_files = []


def convert_date(date_str: str) -> str:
    """将各种日期格式统一为 YYYY-MM-DD HH:MM:SS"""
    date_str = date_str.strip().strip('"\'')

    # 已经是目标格式
    if re.match(r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$', date_str):
        return date_str

    # 已经是 YYYY-MM-DD，补 00:00:00
    if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
        return date_str + " 00:00:00"

    # ISO 8601 with T and optional Z or +offset
    for fmt in (
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S.%f+00:00",
        "%Y-%m-%dT%H:%M:%S+00:00",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
    ):
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        except ValueError:
            continue

    # YYYY/MM/DD → YYYY-MM-DD 00:00:00
    m = re.match(r'^(\d{4})/(\d{2})/(\d{2})', date_str)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)} 00:00:00"

    # 实在无法解析，原样返回
    return date_str


def keywords_str_to_array(kw_str: str) -> list[str]:
    """将逗号分隔字符串转换为清洗后的关键词列表"""
    # 分割并清理
    items = [k.strip().strip('"\'') for k in re.split(r'[，,]', kw_str)]
    return [k for k in items if k]


def make_keywords_yaml(keywords: list[str], indent: int = 2) -> str:
    """将列表转为 YAML 数组块格式"""
    pad = " " * indent
    lines = "\n".join(f"{pad}- {k}" for k in keywords)
    return f"keywords:\n{lines}"


def infer_keywords_from_fm(fm_raw: str, filename: str) -> list[str]:
    """根据 tags / title 为没有 keywords 的文件生成初始关键词"""
    keywords = []

    # 从 tags 提取
    tags_block = re.search(
        r'^tags:\s*\n((?:\s+[-\s]*\S.*\n?)+)', fm_raw, re.MULTILINE
    )
    if tags_block:
        for line in tags_block.group(1).splitlines():
            tag = re.sub(r'^\s*[-\s]*', '', line).strip()
            if tag:
                keywords.append(tag)
    else:
        # inline tags: tags: [A, B]
        inline_tags = re.search(r'^tags:\s*\[(.+)\]', fm_raw, re.MULTILINE)
        if inline_tags:
            for t in inline_tags.group(1).split(','):
                keywords.append(t.strip().strip('"\''))

    # 从 title 提取
    title_m = re.search(r'^title:\s*["\']?(.+?)["\']?\s*$', fm_raw, re.MULTILINE)
    if title_m:
        title = title_m.group(1).strip()
        if title not in keywords:
            keywords.append(title)

    # 加上站点品牌词
    for brand in ("PFinalClub", "技术博客"):
        if brand not in keywords:
            keywords.append(brand)

    return keywords


def process_file(md_file: Path) -> bool:
    """处理单个文件，返回是否有修改"""
    try:
        original = md_file.read_text(encoding="utf-8")
    except Exception as e:
        print(f"  [ERROR] 读取失败 {md_file}: {e}")
        return False

    content = original.lstrip()
    if not content.startswith("---"):
        return False

    # 找到 frontmatter 结束位置
    end_idx = content.find("\n---", 3)
    if end_idx == -1:
        return False

    fm_raw  = content[3:end_idx]          # frontmatter 内容（去掉前后 ---）
    body    = content[end_idx + 4:]        # 正文（包含换行）
    modified = fm_raw

    # ── 1. 修正 date 格式 ─────────────────────────────────────────────────
    def replace_date(m):
        raw_val = m.group(1)
        new_val = convert_date(raw_val)
        return f"date: {new_val}"

    modified = re.sub(
        r'^date:\s*(.+)$',
        replace_date,
        modified,
        flags=re.MULTILINE
    )

    # ── 2. keywords 字符串 → 数组 ─────────────────────────────────────────
    kw_match = re.search(
        r'^(keywords:\s*)(.+?)(?=\n\S|\Z)',
        modified,
        re.MULTILINE | re.DOTALL
    )
    if kw_match:
        kw_val = kw_match.group(2).strip()
        # 已经是数组（以 \n 开头 或 内含 "- "）则跳过
        is_array = (
            kw_val.startswith("\n")
            or "\n  -" in kw_val
            or "\n- " in kw_val
            or re.match(r'^\s*-\s+', kw_val)
        )
        if not is_array:
            kw_list = keywords_str_to_array(kw_val)
            if kw_list:
                new_kw_yaml = make_keywords_yaml(kw_list)
                # 替换原有 keywords 行
                modified = re.sub(
                    r'^keywords:\s*.+?(?=\n\S|\Z)',
                    new_kw_yaml,
                    modified,
                    flags=re.MULTILINE | re.DOTALL
                )

    # ── 3. 缺少 keywords → 自动补全 ───────────────────────────────────────
    elif "keywords:" not in modified:
        inferred = infer_keywords_from_fm(modified, md_file.name)
        if inferred:
            new_kw_yaml = make_keywords_yaml(inferred)
            # 插在 description 后面，如果没有 description 则追加到末尾
            if "description:" in modified:
                desc_end = re.search(
                    r'(^description:\s*.+?(?=\n\S))',
                    modified,
                    re.MULTILINE | re.DOTALL
                )
                if desc_end:
                    insert_pos = desc_end.end()
                    modified = modified[:insert_pos] + "\n" + new_kw_yaml + modified[insert_pos:]
                else:
                    modified = modified.rstrip("\n") + "\n" + new_kw_yaml + "\n"
            else:
                modified = modified.rstrip("\n") + "\n" + new_kw_yaml + "\n"

    # ── 判断是否有变化 ────────────────────────────────────────────────────
    if modified == fm_raw:
        return False

    # 重建文件内容（保留 leading whitespace 原始前缀）
    prefix = original[: len(original) - len(content)]  # 处理文件开头的 BOM / 空行
    new_content = prefix + "---" + modified + "\n---" + body

    if DRY_RUN:
        print(f"  [DRY-RUN] Would modify: {md_file}")
        return True

    try:
        md_file.write_text(new_content, encoding="utf-8")
        return True
    except Exception as e:
        print(f"  [ERROR] 写入失败 {md_file}: {e}")
        return False


# ── 主流程 ───────────────────────────────────────────────────────────────────
def main():
    print(f"{'[DRY-RUN] ' if DRY_RUN else ''}开始规范化 frontmatter ...")
    print(f"扫描目录: {DOCS_DIR.resolve()}\n")

    all_md = sorted(DOCS_DIR.rglob("*.md"))
    total  = len(all_md)
    changed = 0

    for md_file in all_md:
        # 跳过 .vitepress 内的工具文件
        if ".vitepress" in md_file.parts:
            continue
        if process_file(md_file):
            changed += 1
            changed_files.append(str(md_file.relative_to(DOCS_DIR)))
            if not DRY_RUN:
                print(f"  ✅ {md_file.relative_to(DOCS_DIR)}")

    print(f"\n{'='*60}")
    print(f"扫描: {total} 个文件 | 修改: {changed} 个")
    if DRY_RUN:
        print("（DRY-RUN 模式，未实际写入）")
    else:
        print("所有修改已写入。")

    if changed_files:
        print(f"\n修改列表（共 {len(changed_files)} 个）:")
        for f in changed_files:
            print(f"  - {f}")


if __name__ == "__main__":
    main()
