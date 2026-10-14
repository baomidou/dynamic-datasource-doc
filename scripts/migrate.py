#!/usr/bin/env python3
"""Migrate the GitBook-style docs from docpay into this VitePress site.

Usage: python3 scripts/migrate.py [source_dir]

- source_dir defaults to the docpay content directory.
- Chinese file names are mapped to English slugs (see MAPPING).
- Cross-file `*.md` links become site-absolute links (e.g. /tx/local-tx).
- Images are collected under docs/public/images and referenced as /images/<name>.
- The paid-only pages (付费/*) and SUMMARY.md are intentionally not migrated.
"""
import posixpath
import re
import shutil
import sys
from pathlib import Path

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else
           "/Users/taoyu/projects/docpay/content/dynamic-datasource")
REPO = Path(__file__).resolve().parent.parent
DST = REPO / "docs"

MAPPING = {
    # 入门
    "基础必读.md": "guide/basics.md",
    "DS详细解析.md": "guide/how-it-works.md",
    # 连接池
    "连接池集成.md": "pool/index.md",
    "连接池/连接池公共必读.md": "pool/common.md",
    "连接池/集成Druid.md": "pool/druid.md",
    "连接池/集成HikariCP.md": "pool/hikaricp.md",
    "连接池/集成BeeCp.md": "pool/beecp.md",
    "连接池/集成DBCP2.md": "pool/dbcp2.md",
    "连接池/集成Jndi.md": "pool/jndi.md",
    # 第三方集成
    "第三方集成.md": "integration/index.md",
    "第三方/集成MybatisPlus.md": "integration/mybatis-plus.md",
    "第三方/集成P6spy.md": "integration/p6spy.md",
    "第三方/集成Quartz.md": "integration/quartz.md",
    "第三方/集成ShardingJdbc.md": "integration/sharding-jdbc.md",
    # 进阶使用
    "进阶使用.md": "advanced/index.md",
    "高级/动态添加移除数据源.md": "advanced/add-remove-datasource.md",
    "高级/动态解析数据源.md": "advanced/dynamic-datasource-resolution.md",
    "高级/数据库加密.md": "advanced/encryption.md",
    "高级/启动初始化执行脚本.md": "advanced/init-scripts.md",
    "高级/懒启动数据源.md": "advanced/lazy-datasource.md",
    "高级/无数据源启动.md": "advanced/no-datasource-startup.md",
    "高级/手动切换数据源.md": "advanced/manual-switching.md",
    "高级/手动注入多数据源.md": "advanced/manual-injection.md",
    # 自定义
    "自定义.md": "custom/index.md",
    "自定义/自定义注解.md": "custom/annotation.md",
    "自定义/自定义数据源来源.md": "custom/datasource-provider.md",
    "自定义/自定义负载均衡策略.md": "custom/load-balance-strategy.md",
    # 无注解方案
    "无注解/无注解必读.md": "no-annotation/readme.md",
    "无注解/filter切换.md": "no-annotation/filter.md",
    "无注解/intercepror切换.md": "no-annotation/interceptor.md",
    "无注解/AOP切面切换.md": "no-annotation/aop.md",
    "无注解/mybatis下读写分离.md": "no-annotation/mybatis-read-write.md",
    # 事务专栏
    "事务专栏.md": "tx/index.md",
    "事务/事务概念.md": "tx/concepts.md",
    "事务/基础知识.md": "tx/basics.md",
    "事务/本地事务.md": "tx/local-tx.md",
    "事务/seata事务.md": "tx/seata.md",
    "事务/事务常见问题.md": "tx/faq.md",
    # 更多
    "调试源码.md": "guide/debugging-source.md",
    "切换数据源失败.md": "guide/switching-failure.md",
    "不可用版本.md": "guide/unavailable-versions.md",
    "版本记录.md": "guide/version-history.md",
    "知识库.md": "guide/knowledge-base.md",
    "多租户最佳实践.md": "guide/multi-tenant.md",
}

SKIP_DIRS = ("付费",)
SKIP_FILES = {"SUMMARY.md"}

# H1 titles inserted when a page has no top-level heading (kept identical to the sidebar labels).
TITLES = {
    "guide/basics.md": "基础必读",
    "guide/how-it-works.md": "DS 详细解析",
    "guide/debugging-source.md": "调试源码",
    "guide/switching-failure.md": "常见问题：切换数据源失败",
    "guide/unavailable-versions.md": "不可用版本",
    "guide/version-history.md": "版本记录与选择建议",
    "guide/knowledge-base.md": "知识库",
    "guide/multi-tenant.md": "多租户最佳实践",
    "pool/index.md": "连接池集成",
    "pool/common.md": "连接池必读",
    "pool/druid.md": "集成 Druid",
    "pool/hikaricp.md": "集成 HikariCP",
    "pool/beecp.md": "集成 BeeCP",
    "pool/dbcp2.md": "集成 DBCP2",
    "pool/jndi.md": "集成 JNDI",
    "integration/index.md": "第三方集成",
    "integration/mybatis-plus.md": "集成 MyBatis-Plus",
    "integration/p6spy.md": "集成 P6spy",
    "integration/quartz.md": "集成 Quartz",
    "integration/sharding-jdbc.md": "集成 ShardingJDBC",
    "advanced/index.md": "进阶使用",
    "advanced/add-remove-datasource.md": "动态添加/移除数据源",
    "advanced/dynamic-datasource-resolution.md": "动态解析数据源",
    "advanced/encryption.md": "数据库加密",
    "advanced/init-scripts.md": "启动初始化执行脚本",
    "advanced/lazy-datasource.md": "懒启动数据源",
    "advanced/no-datasource-startup.md": "无数据源启动",
    "advanced/manual-switching.md": "手动切换数据源",
    "advanced/manual-injection.md": "手动注入多数据源",
    "custom/index.md": "自定义",
    "custom/annotation.md": "自定义注解",
    "custom/datasource-provider.md": "自定义数据源来源",
    "custom/load-balance-strategy.md": "自定义负载均衡策略",
    "no-annotation/readme.md": "无注解方案必读",
    "no-annotation/filter.md": "Filter 切换数据源",
    "no-annotation/interceptor.md": "Interceptor 切换数据源",
    "no-annotation/aop.md": "AOP 切面切换数据源",
    "no-annotation/mybatis-read-write.md": "MyBatis 下读写分离",
    "tx/index.md": "事务专栏",
    "tx/concepts.md": "事务概念",
    "tx/basics.md": "事务基础知识",
    "tx/local-tx.md": "本地事务",
    "tx/seata.md": "Seata 事务",
    "tx/faq.md": "事务常见问题",
}

TOC_RE = re.compile(r"(?m)^\s*\[TOC\]\s*\n+")
FENCE_RE = re.compile(r"^\s*(```|~~~)")
H1_LINE_RE = re.compile(r"^# \S")

LINK_RE = re.compile(r"\]\(([^)\s]+)\)")
IMG_EXT_RE = re.compile(r"\.(png|jpe?g|gif|svg|webp)$", re.I)


def norm(src_rel: str, link: str) -> str:
    return posixpath.normpath(posixpath.join(posixpath.dirname(src_rel), link))


def to_site_path(dst_rel: str) -> str:
    """guide/basics.md -> /guide/basics ; pool/index.md -> /pool/"""
    p = "/" + dst_rel[:-3]  # strip .md
    if p.endswith("/index"):
        p = p[: -len("index")]
    return p


def convert(src_rel: str, text: str, warnings: list) -> str:
    def repl(m):
        target = m.group(1)
        if target.startswith(("http://", "https://", "mailto:", "#", "<")):
            return m.group(0)
        anchor = ""
        if "#" in target:
            target, anchor = target.split("#", 1)
            anchor = "#" + anchor
        if IMG_EXT_RE.search(target):
            return "](" + f"/images/{posixpath.basename(target)}" + ")"
        if target.endswith(".md"):
            key = norm(src_rel, target)
            if key in MAPPING:
                return "](" + to_site_path(MAPPING[key]) + anchor + ")"
            warnings.append(f"{src_rel}: unmapped md link -> {target}")
            return m.group(0)
        warnings.append(f"{src_rel}: non-md relative link -> {target}")
        return m.group(0)

    return LINK_RE.sub(repl, text)


def outside_h1_indexes(lines: list) -> list:
    """Indexes of top-level headings that are outside fenced code blocks."""
    in_fence = False
    out = []
    for i, line in enumerate(lines):
        if FENCE_RE.match(line):
            in_fence = not in_fence
            continue
        if not in_fence and H1_LINE_RE.match(line):
            out.append(i)
    return out


def postprocess(dst_rel: str, text: str) -> str:
    """Normalise heading structure for VitePress: exactly one page-level H1 at the top.

    - Drop GitBook [TOC] markers.
    - When there is no H1 (or several body H1s, or the only H1 is not at the very top),
      prepend the canonical title and demote all body H1s to H2.
    """
    text = TOC_RE.sub("", text)
    lines = text.split("\n")
    h1_idx = outside_h1_indexes(lines)
    first_content = next((i for i, l in enumerate(lines) if l.strip()), None)
    title = TITLES.get(dst_rel)

    if first_content is None:
        return text
    single_ok = len(h1_idx) == 1 and h1_idx[0] == first_content
    if single_ok:
        return text

    if not title:
        return text
    for i in h1_idx:
        lines[i] = "#" + lines[i]
    text = "\n".join(lines)
    return f"# {title}\n\n" + text.lstrip("\n")


def main() -> int:
    src_mds = sorted(p.relative_to(SRC).as_posix() for p in SRC.rglob("*.md"))
    unmapped = [m for m in src_mds
                if m not in MAPPING and m not in SKIP_FILES
                and not m.startswith(SKIP_DIRS)]
    if unmapped:
        print("ERROR unmapped source files:", unmapped)
        return 1

    warnings: list = []
    for src_rel, dst_rel in MAPPING.items():
        text = (SRC / src_rel).read_text(encoding="utf-8")
        text = convert(src_rel, text, warnings)
        text = postprocess(dst_rel, text)
        dp = DST / dst_rel
        dp.parent.mkdir(parents=True, exist_ok=True)
        dp.write_text(text, encoding="utf-8")
        print(f"OK {src_rel} -> docs/{dst_rel}")

    img_dst = DST / "public" / "images"
    img_dst.mkdir(parents=True, exist_ok=True)
    for img in (SRC / "images").iterdir():
        if img.is_file():
            shutil.copy2(img, img_dst / img.name)
    print(f"OK images -> docs/public/images ({len(list(img_dst.iterdir()))} files)")

    # 校验：站内绝对链接是否都指向存在的页面
    pages = {to_site_path(v) for v in MAPPING.values()} | {"/"}
    dead = []
    for dst_rel in MAPPING.values():
        text = (DST / dst_rel).read_text(encoding="utf-8")
        for m in re.finditer(r"\]\((/[^)\s#]+)(#[^)]*)?\)", text):
            p = m.group(1)
            if not p.startswith("/images/") and p not in pages:
                dead.append(f"{dst_rel}: dead link -> {p}")
    if warnings:
        print("\n--- warnings ---")
        for w in warnings:
            print("WARN", w)
    if dead:
        print("\n--- dead links ---")
        for d in dead:
            print("DEAD", d)
        return 1
    print("\nAll internal links resolve. Migration complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
