#!/usr/bin/env python3
"""Fix broken sample links after the dynamic-datasource-samples restructure.

Old layout (tx-samples/... , datasource-samples/... , orm-samples/... ) was
reorganised into spring-boot-2 / spring-boot-3 / spring-boot-4 groups.
The removed all-datasource-sample and the versioned shardingsphere sample
now point to the samples repository root instead.
"""
import re
from pathlib import Path

DOCS = Path("docs")
ROOT = "https://github.com/dynamic-datasource/dynamic-datasource-samples"

# Whole-URL special cases (samples that no longer exist as single directories)
SPECIAL = [
    (
        r"https://github\.com/dynamic-datasource/dynamic-datasource-samples/tree/master/all-datasource-sample",
        ROOT,
    ),
    (
        r"https://github\.com/dynamic-datasource/dynamic-datasource-samples/tree/master/third-part-samples/shardingsphere-sample",
        ROOT,
    ),
]

SUBS = [
    ("tx-samples/tx-local-sample", "spring-boot-4/tx-local-sample"),
    ("tx-samples/tx-seata-sample", "spring-boot-4/tx-seata-sample"),
    ("datasource-samples/druid-sample", "spring-boot-4/druid-sample"),
    ("third-part-samples/quartz-sample", "spring-boot-4/quartz-sample"),
    ("orm-samples/mybatisplus3-sample", "spring-boot-4/mybatisplus3-sample"),
    (
        "features-samples/add-remove-datasource-sample",
        "spring-boot-4/add-remove-datasource-sample",
    ),
    ("tree/master/name-pattern-sample", "tree/master/spring-boot-4/name-pattern-sample"),
    (
        "https://gitee.com/baomidou/dynamic-datasource-samples",
        ROOT,
    ),
]

changed = []
for p in sorted(DOCS.rglob("*.md")):
    text = original = p.read_text(encoding="utf-8")
    for pattern, repl in SPECIAL:
        text = re.sub(pattern, repl, text)
    for old, new in SUBS:
        text = text.replace(old, new)
    # The two "对应源码" lines now point at the repository root, not source files.
    if "all-datasource-sample" not in original:
        pass
    if text != original:
        p.write_text(text, encoding="utf-8")
        changed.append(str(p))

print(f"fixed {len(changed)} files")
for c in changed:
    print(" -", c)
