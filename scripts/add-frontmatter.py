#!/usr/bin/env python3
"""为文档页面补 frontmatter（title / description）。

从每个页面提取 H1 作为 title，提取第一段正文作为 description，
插入到文件开头的 YAML frontmatter 中。已存在 frontmatter 的文件会跳过。

用法::

    python3 scripts/add-frontmatter.py --dry-run   # 只报告，不改文件
    python3 scripts/add-frontmatter.py             # 实际写入
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

DOC_ROOTS = (
    "docs",
    "versioned_docs/version-4.6",
    "versioned_docs/version-4.5",
    "i18n/en/docusaurus-plugin-content-docs/current",
    "i18n/en/docusaurus-plugin-content-docs/version-4.6",
    "i18n/en/docusaurus-plugin-content-docs/version-4.5",
)

H1_RE = re.compile(r"^#\s+(.*)$")
FRONTMATTER_RE = re.compile(r"^---\s*$")

# 内联 markdown 标记清理
MD_IMG_RE = re.compile(r"!\[[^\]]*\]\([^)]*\)")
MD_LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]*\)")
MD_BOLD_RE = re.compile(r"\*\*(.+?)\*\*")
MD_CODE_RE = re.compile(r"`+([^`]+)`+")
WS_RE = re.compile(r"\s+")

# 跳过作为 description 候选的行
SKIP_PREFIXES = ("|", ":::", "![", "[!", "```", "~", "<", ">")

# 列表项（有序 / 无序）不作为描述；`\d+[.、]\s+` 要求点号后必须有空白，
# 避免把 `3.5.0` 这类版本号误判成有序列表
LIST_RE = re.compile(r"^([-*+]\s+|\d+[.、]\s+)")


def clean_inline(text: str) -> str:
    text = MD_IMG_RE.sub("", text)
    text = MD_LINK_RE.sub(r"\1", text)
    text = MD_BOLD_RE.sub(r"\1", text)
    text = MD_CODE_RE.sub(r"\1", text)
    return WS_RE.sub(" ", text).strip()


def extract_title(lines: list[str]) -> str:
    for line in lines:
        m = H1_RE.match(line)
        if m:
            return m.group(1).strip()
    return ""


def extract_description(lines: list[str]) -> str:
    in_code = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue
        if not stripped:
            continue
        if stripped.startswith("#"):
            continue
        if any(stripped.startswith(p) for p in SKIP_PREFIXES):
            continue
        # 跳过列表项
        if LIST_RE.match(stripped):
            continue
        # 跳过以图片开头的行（无 `[` 包裹的裸图片）
        if stripped.startswith("!"):
            continue
        desc = clean_inline(stripped)
        if desc:
            # 跳过以裸 URL 为主的引用行（如「数据源创建器 https://...」）
            if "http://" in desc or "https://" in desc:
                continue
            return desc
    return ""


def build_frontmatter(title: str, description: str) -> str:
    def quote(value: str) -> str:
        return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'

    return f"---\ntitle: {quote(title)}\ndescription: {quote(description)}\n---\n\n"


def strip_frontmatter(text: str) -> str:
    """删除文件开头的 YAML frontmatter（如果有），返回剩余正文。"""
    lines = text.splitlines()
    if not lines or not FRONTMATTER_RE.match(lines[0].strip()):
        return text
    for i in range(1, len(lines)):
        if FRONTMATTER_RE.match(lines[i].strip()):
            return "\n".join(lines[i + 1 :]).lstrip("\n")
    return text


def process(path: Path, dry_run: bool, force: bool = False) -> tuple[str, str] | None:
    """返回 (旧标题, 新标题) 表示需要写入，否则 None。"""
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()

    has_fm = bool(lines) and FRONTMATTER_RE.match(lines[0].strip())
    if has_fm and not force:
        return None
    if has_fm and force:
        text = strip_frontmatter(text)
        lines = text.splitlines()

    title = extract_title(lines)
    if not title:
        return None

    # description 从 H1 之后的正文提取
    body_start = 0
    for i, line in enumerate(lines):
        if H1_RE.match(line):
            body_start = i + 1
            break
    description = extract_description(lines[body_start:])
    if not description:
        description = title

    frontmatter = build_frontmatter(title, description)
    new_text = frontmatter + text
    if not dry_run:
        path.write_text(new_text, encoding="utf-8")
    return title, description


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="只报告，不写入")
    parser.add_argument("--force", action="store_true", help="重新生成已有的 frontmatter")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    total = 0
    for doc_root in DOC_ROOTS:
        base = root / doc_root
        if not base.exists():
            continue
        for path in sorted(base.rglob("*.md")):
            result = process(path, args.dry_run, force=args.force)
            if result is None:
                continue
            title, description = result
            total += 1
            print(f"{path.relative_to(root)}")
            print(f"  title:       {title}")
            print(f"  description: {description[:80]}{'…' if len(description) > 80 else ''}")
    print(f"\n共处理 {total} 个页面{'（dry-run，未写入）' if args.dry_run else ''}")


if __name__ == "__main__":
    main()
