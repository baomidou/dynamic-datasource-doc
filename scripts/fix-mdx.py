#!/usr/bin/env python3
"""Fix MDX-incompatible constructs left over from the Markdown sources.

MDX (used by Docusaurus) parses `<...>` as JSX, so:
1. `<https://...>` angle-bracket autolinks must become [url](url);
2. void HTML tags such as <img ...> must be self-closed (<img ... />).

Code fences and inline code are left untouched.
"""
import re
import sys
from pathlib import Path

DOCS = Path(sys.argv[1] if len(sys.argv) > 1 else "docs")

FENCE_RE = re.compile(r"^\s*(```|~~~)")
AUTOLINK_RE = re.compile(r"<((?:https?://)[^>\s]+)>")
IMG_RE = re.compile(r"<img(\s[^>]*?)(?<!/)>")


def fix_segment(seg: str) -> str:
    seg = AUTOLINK_RE.sub(r"[\1](\1)", seg)
    seg = IMG_RE.sub(r"<img\1 />", seg)
    return seg


def fix_line(line: str) -> str:
    # odd indexes are inside inline code spans
    parts = line.split("`")
    for i in range(0, len(parts), 2):
        parts[i] = fix_segment(parts[i])
    return "`".join(parts)


changed = []
for p in sorted(DOCS.rglob("*.md")):
    lines = p.read_text(encoding="utf-8").split("\n")
    in_fence = False
    out = []
    touched = False
    for line in lines:
        if FENCE_RE.match(line):
            in_fence = not in_fence
            out.append(line)
            continue
        if in_fence:
            out.append(line)
            continue
        new = fix_line(line)
        if new != line:
            touched = True
        out.append(new)
    if touched:
        p.write_text("\n".join(out), encoding="utf-8")
        changed.append(str(p))

print(f"fixed {len(changed)} files")
for c in changed:
    print(" -", c)
