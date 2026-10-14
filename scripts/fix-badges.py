#!/usr/bin/env python3
"""Convert leftover HTML badge blocks (<a ...><img .../></a>) to Markdown.

MDX treats multi-line JSX-ish HTML blocks inconsistently (especially after
list items), so the classic GitBook badge pattern is rewritten as
[![alt](img)](href), which is plain Markdown and works everywhere.

Fenced code blocks are left untouched.
"""
import re
import sys
from pathlib import Path

DOCS = Path(sys.argv[1] if len(sys.argv) > 1 else "docs")

FENCE_RE = re.compile(r"^\s*(```|~~~)")
BADGE_RE = re.compile(
    r'<a\s+href="([^"]+)"[^>]*>\s*'      # <a href="link" ...>
    r'<img\s+src="([^"]+)"[^>]*?/>\s*'   # <img src="img" ... />
    r'</a>',                              # </a>
)

changed = []
for p in sorted(DOCS.rglob("*.md")):
    text = p.read_text(encoding="utf-8")
    lines = text.split("\n")
    in_fence = False
    out = []
    seg_start = 0
    # collect non-fence segments and run the badge regex on them
    i = 0
    while i < len(lines):
        if FENCE_RE.match(lines[i]):
            # flush accumulated plain lines (rebuild only if something changed,
            # so empty/blank segments round-trip losslessly)
            segment = "\n".join(out[seg_start:])
            fixed = BADGE_RE.sub(lambda m: f"[![]({m.group(2)})]({m.group(1)})", segment)
            if fixed != segment:
                out = out[:seg_start] + fixed.split("\n")
            in_fence = not in_fence
            out.append(lines[i])
            seg_start = len(out)
            i += 1
            continue
        if in_fence:
            out.append(lines[i])
            seg_start = len(out)
            i += 1
            continue
        out.append(lines[i])
        i += 1
    # flush tail (same rebuild-only-if-changed rule)
    segment = "\n".join(out[seg_start:])
    fixed = BADGE_RE.sub(lambda m: f"[![]({m.group(2)})]({m.group(1)})", segment)
    if fixed != segment:
        out = out[:seg_start] + fixed.split("\n")

    new = "\n".join(out)
    if new != text:
        p.write_text(new, encoding="utf-8")
        changed.append(str(p))

print(f"badge-fixed {len(changed)} files")
for c in changed:
    print(" -", c)
