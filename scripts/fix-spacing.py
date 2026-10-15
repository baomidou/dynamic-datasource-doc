#!/usr/bin/env python3
"""为中文文档在中英文/数字之间补空格。

规则：汉字与英文、数字之间若缺少空格则补一个半角空格。
跳过代码块、内联代码（`` ` ``）与 URL，避免破坏代码与链接。

用法::

    python3 scripts/fix-spacing.py --dry-run   # 只报告，不改文件
    python3 scripts/fix-spacing.py             # 实际写入
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

# 只处理中文目录（英文文档不适用该规则）
DOC_ROOTS = ("docs", "versioned_docs/version-4.6", "versioned_docs/version-4.5")

CJK = r"\u4e00-\u9fff"

INLINE_CODE_RE = re.compile(r"`[^`]*`")
URL_RE = re.compile(r"https?://[^\s)\]]+")


def add_spaces(line: str) -> str:
    """对单行文本补中英文空格，保护内联代码与 URL。"""
    protected: list[str] = []

    def protect(match: re.Match[str]) -> str:
        protected.append(match.group(0))
        return f"\x00{len(protected) - 1}\x00"

    line = INLINE_CODE_RE.sub(protect, line)
    line = URL_RE.sub(protect, line)

    line = re.sub(f"([{CJK}])([A-Za-z0-9])", r"\1 \2", line)
    line = re.sub(f"([A-Za-z0-9])([{CJK}])", r"\1 \2", line)
    line = re.sub(f"([{CJK}])(@[A-Za-z])", r"\1 \2", line)

    def restore(match: re.Match[str]) -> str:
        return protected[int(match.group(1))]

    return re.sub(r"\x00(\d+)\x00", restore, line)


def process(path: Path, dry_run: bool) -> int:
    """返回该文件被改动的行数。"""
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines(keepends=True)

    out: list[str] = []
    in_code = False
    changed = 0

    for line in lines:
        raw = line.rstrip("\n")
        stripped = raw.strip()
        if stripped.startswith("```"):
            in_code = not in_code
            out.append(line)
            continue
        if in_code:
            out.append(line)
            continue
        new_line = add_spaces(raw)
        if new_line != raw:
            changed += 1
        out.append(new_line + ("\n" if line.endswith("\n") else ""))

    if changed and not dry_run:
        path.write_text("".join(out), encoding="utf-8")
    return changed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="只报告，不写入")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    total_files = 0
    total_lines = 0
    for doc_root in DOC_ROOTS:
        base = root / doc_root
        if not base.exists():
            continue
        for path in sorted(base.rglob("*.md")):
            changed = process(path, args.dry_run)
            if changed:
                total_files += 1
                total_lines += changed
                print(f"{path.relative_to(root)}: {changed} 行")
    print(f"\n共改写 {total_files} 个文件、{total_lines} 行{'（dry-run，未写入）' if args.dry_run else ''}")


if __name__ == "__main__":
    main()
