#!/usr/bin/env python3
"""把文档之间的相对 ``.md`` 链接统一改写成绝对站点路径。

为什么需要这一步
----------------
Docusaurus 只会重写**实际存在于当前 locale 内容目录**里的文件的 markdown 链接。
未翻译的页面在其它 locale 下由默认语言内容「回退渲染」，此时 ``./foo.md`` 不会被
解析成路由，而是原样输出成 ``<a href="./foo.md">``，构建时判定为死链
（``onBrokenLinks: 'throw'`` 会直接失败）。

改成 ``/docs/xxx`` 之后，两种 locale 下都能解析到真实路由。

用法::

    python3 scripts/fix-doc-links.py --dry-run
    python3 scripts/fix-doc-links.py
"""

from __future__ import annotations

import argparse
import posixpath
import re
from pathlib import Path

# 这些目录下的 .md 都对应 /docs/<相对路径> 路由。
# 新增版本文档时记得把对应的 versioned_docs / i18n 目录补进来。
DOC_ROOTS = (
    "docs",
    "versioned_docs/version-4.6",
    "versioned_docs/version-4.5",
    "i18n/en/docusaurus-plugin-content-docs/current",
    "i18n/en/docusaurus-plugin-content-docs/version-4.6",
    "i18n/en/docusaurus-plugin-content-docs/version-4.5",
)

LINK_RE = re.compile(r"\]\((?P<target>\.{1,2}/[^)\s]*?\.md)(?P<anchor>#[^)]*)?\)")
# index / readme 是目录首页，路由是 /docs/<dir>/ 而不是 /docs/<dir>/index
INDEX_RE = re.compile(r"\]\((?P<target>/docs/(?:[^)\s]*/)?(?:index|readme))(?P<anchor>#[^)]*)?\)")
# 路由不能以 .md 结尾
MD_SUFFIX_RE = re.compile(r"\]\((?P<target>/docs/[^)\s]*?)\.md(?P<anchor>#[^)]*)?\)")


def _to_route(doc_path: str) -> str:
    """把文档相对路径（不含 .md）转成站点路由。"""
    if doc_path in ("index", "readme"):
        return "/docs/"
    for suffix in ("/index", "/readme"):
        if doc_path.endswith(suffix):
            doc_path = doc_path[: -len(suffix)]
            break
    return f"/docs/{doc_path}"


def rewrite(text: str, doc_dir: str) -> tuple[str, list[tuple[str, str]]]:
    """把相对 .md 链接换成 /docs/... 绝对路径。"""
    changes: list[tuple[str, str]] = []

    def record(old: str, new: str) -> str:
        if old != new:
            changes.append((old, new))
        return new

    def replace_relative(match: re.Match[str]) -> str:
        anchor = match.group("anchor") or ""
        resolved = posixpath.normpath(
            posixpath.join(doc_dir, match.group("target"))
        )
        if resolved.endswith(".md"):
            resolved = resolved[: -len(".md")]
        return record(match.group(0), f"]({_to_route(resolved)}{anchor})")

    def replace_index(match: re.Match[str]) -> str:
        anchor = match.group("anchor") or ""
        route = _to_route(match.group("target").removeprefix("/docs/"))
        return record(match.group(0), f"]({route}{anchor})")

    def replace_md_suffix(match: re.Match[str]) -> str:
        anchor = match.group("anchor") or ""
        return record(match.group(0), f"]({match.group('target')}{anchor})")

    text = LINK_RE.sub(replace_relative, text)
    text = INDEX_RE.sub(replace_index, text)
    return MD_SUFFIX_RE.sub(replace_md_suffix, text), changes


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
            text = path.read_text(encoding="utf-8")
            doc_dir = path.parent.relative_to(base).as_posix()
            doc_dir = "" if doc_dir == "." else doc_dir
            updated, changes = rewrite(text, doc_dir)
            if not changes:
                continue
            for old, new in changes:
                total += 1
                print(f"{path.relative_to(root)}: {old} -> {new}")
            if not args.dry_run:
                path.write_text(updated, encoding="utf-8")

    print(f"\n共改写 {total} 条链接{'（dry-run，未写入）' if args.dry_run else ''}")


if __name__ == "__main__":
    main()
