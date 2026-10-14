#!/usr/bin/env python3
"""为文档中未标注语言的围栏代码块补上语言标记。

历史文档大量使用 ``~~~`` 围栏且不带语言，Docusaurus 因此不做任何语法高亮。
本脚本把它们统一成 ``` 围栏，并按内容推断语言。

用法::

    python3 scripts/fix-code-fences.py --dry-run   # 只报告，不改文件
    python3 scripts/fix-code-fences.py             # 实际写入

推断不出语言时标注为 ``text``（高亮效果与现在一致，但语义明确）。
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

DOC_ROOTS = ("docs", "versioned_docs", "i18n")
FENCE_RE = re.compile(r"^(?P<indent>[ \t]*)(?P<fence>~~~+|```+)(?P<lang>[^\s`~]*)\s*$")

JAVA_HINTS = (
    "public ",
    "private ",
    "protected ",
    "@Override",
    "@DS",
    "@Autowired",
    "import java",
    "import org",
    "import com.",
    "class ",
    "interface ",
    "void ",
    "return ",
)
SHELL_PREFIXES = (
    "docker ",
    "curl ",
    "npm ",
    "npx ",
    "pnpm ",
    "./gradlew",
    "gradlew ",
    "git ",
    "mvn ",
    "export ",
)
SQL_RE = re.compile(
    r"^\s*(CREATE|INSERT|UPDATE|DELETE|SELECT|ALTER|DROP|TRUNCATE)\b",
    re.IGNORECASE,
)


def guess_language(block: list[str]) -> str:
    """按内容推断代码块语言。保守优先：宁可判成 text，也不要判错。"""
    body = "\n".join(block).strip()
    if not body:
        return "text"

    first = body.lstrip()

    if first.startswith("<?xml") or "<dependency>" in body or "<bean " in body:
        return "xml"
    if SQL_RE.match(first):
        return "sql"
    if any(first.startswith(prefix) for prefix in SHELL_PREFIXES):
        return "bash"

    if any(hint in body for hint in JAVA_HINTS):
        return "java"

    # 参与判断时忽略空行与纯注释行（yaml / properties 里很常见）
    lines = [
        line for line in body.splitlines() if line.strip() and not line.lstrip().startswith("#")
    ]
    if not lines:
        return "text"

    if lines[0].lstrip().startswith(("{", "[")) and lines[-1].rstrip().endswith(("}", "]")):
        return "json"

    # key=value → properties
    if all(re.match(r"^[^:\s]+\s*=", line.strip()) for line in lines):
        return "properties"

    # key: value / 列表项 → yaml
    if all(re.match(r'^(-\s+\S|[\w."-]+:(\s|$))', line.strip()) for line in lines):
        return "yaml"

    return "text"


def process(path: Path, dry_run: bool) -> list[tuple[int, str, str]]:
    """返回 [(行号, 原围栏, 推断语言)]。"""
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines(keepends=True)

    changes: list[tuple[int, str, str]] = []
    out: list[str] = []
    index = 0
    while index < len(lines):
        match = FENCE_RE.match(lines[index].rstrip("\n"))
        if not match:
            out.append(lines[index])
            index += 1
            continue

        opener = match.group("fence")
        closer_marker = opener[0] * 3
        lang = match.group("lang")

        # 收集到对应的闭合围栏
        block: list[str] = []
        cursor = index + 1
        while cursor < len(lines):
            closing = FENCE_RE.match(lines[cursor].rstrip("\n"))
            if closing and closing.group("fence")[0] == closer_marker[0]:
                break
            block.append(lines[cursor].rstrip("\n"))
            cursor += 1

        resolved = lang or guess_language(block)
        new_opener = f'{match.group("indent")}```{resolved}\n'

        if lines[index] != new_opener:
            changes.append((index + 1, lines[index].strip(), resolved))

        out.append(new_opener)
        out.extend(line + "\n" for line in block)
        if cursor < len(lines):
            out.append(f'{match.group("indent")}```\n')
        index = cursor + 1

    if changes and not dry_run:
        path.write_text("".join(out), encoding="utf-8")
    return changes


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="只报告，不写入")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    total = 0
    for doc_root in DOC_ROOTS:
        base = root / doc_root
        if not base.exists():
            continue
        for path in sorted(base.rglob("*.md")):
            for lineno, old, lang in process(path, args.dry_run):
                total += 1
                print(f"{path.relative_to(root)}:{lineno}: {old!r} -> {lang}")
    print(f"\n共处理 {total} 个代码块{'（dry-run，未写入）' if args.dry_run else ''}")


if __name__ == "__main__":
    main()
