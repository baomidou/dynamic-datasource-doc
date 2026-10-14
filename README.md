# dynamic-datasource 文档站

<https://doc.xiuceyun.cn/>

dynamic-datasource 的完整文档（原秀策云付费文档，现已免费开放），基于 [Docusaurus 3](https://docusaurus.io) 构建，使用 pnpm 管理依赖，部署在 GitHub Pages。

## 内容结构

```
docs/
├── guide/          入门与速查（基础必读、@DS 语义、完整配置参考、不在范围内、调试源码、切换失败排查…）
├── pool/           连接池集成（总览 / 必读 / Druid / HikariCP / BeeCP / DBCP2 / JNDI）
├── integration/    第三方集成（总览 / MyBatis-Plus / P6spy / Quartz / ShardingJDBC）
├── tx/             事务专栏（选型指南 / 概念 / 切换原理 / 常见问题 / 本地事务 / Seata）
├── advanced/       进阶使用（动态增删、运维端点、优雅关闭、加密、懒启动、手动注入…）
├── custom/         自定义（注解 / 数据源来源 / 负载均衡策略）
└── no-annotation/  无注解方案（总览 / Filter / Interceptor / AOP / MyBatis 读写分离）
```

路由前缀为 `/docs/`（如 `/docs/tx/local-tx`），侧边栏定义见 [`sidebars.js`](./sidebars.js)。

## 本地开发

```bash
pnpm install
pnpm start          # 开发服务器，默认 http://localhost:3000（baseUrl 为 /）

# 预览部署形态（GitHub Pages 子路径）
DOC_BASE=/dynamic-datasource-doc/ pnpm build && pnpm serve
```

要求 Node 20+ 与 pnpm 11（`packageManager` 字段已声明版本）。

## 维护约定

改文档时请遵守下面几条，否则构建会因为 `onBrokenLinks: 'throw'` 直接失败。

### 1. 新增页面要同步四处

本站同时维护「当前版本」和 `4.6` 版本快照，两者内容保持镜像：

| 位置 | 作用 |
| :--- | :--- |
| `docs/` | 当前（未发布）文档 |
| `versioned_docs/version-4.6/` | 4.6 版本快照，**与 `docs/` 保持一致** |
| `sidebars.js` | 当前版本侧边栏 |
| `versioned_sidebars/version-4.6-sidebars.json` | 4.6 版本侧边栏 |

```bash
# 内容同步
rsync -a --delete docs/ versioned_docs/version-4.6/
```

:::warning
`versioned_docs/version-4.6` 与 `docs/` 是**字节级镜像**关系。只改一边会导致两个版本的侧边栏与页面不一致。
:::

### 2. 内部链接统一用绝对路径

写 `/docs/tx/local-tx`，不要写 `./local-tx.md`。

原因：未翻译的页面在英文站由中文内容**回退渲染**，此时相对 `.md` 链接不会被解析成路由，会原样输出导致死链。绝对路径在两种 locale 下都能解析。

```bash
python3 scripts/fix-doc-links.py --dry-run   # 检查
python3 scripts/fix-doc-links.py             # 批量改写
```

### 3. 代码块必须标注语言

```bash
python3 scripts/fix-code-fences.py --dry-run
python3 scripts/fix-code-fences.py
```

### 4. 国际化的现状

`i18n/en/` 目前只翻译了 3 个页面（`guide/basics`、`guide/switching-failure`、`tx/local-tx`），其余页面在英文站会回退显示中文原文——能正常访问，不会 404，但也没有英文内容。

**当前策略**：不追求全覆盖，优先保证这 3 个入口页与中文版同步。修改这 3 个中文页时请一并更新对应的英文文件，避免同一个入口出现中英不一致。

## 部署

push 到 `main` 后，GitHub Actions（[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)）自动以 pnpm 构建并发布到 GitHub Pages（自定义域名 `doc.xiuceyun.cn`）。所有 actions 均 pin 到 SHA。

## 内容来源与维护脚本

- 内容来自 docpay 中的 GitBook 风格文档，最初的 Markdown 结构化迁移（中文文件名 → 英文 slug、互链/图片改写）见 git 历史中的 `scripts/migrate.py`；
- 适配 Docusaurus 严格 MDX（`<url>` autolink、HTML 徽章块等）的清洗脚本：[`scripts/fix-mdx.py`](./scripts/fix-mdx.py)、[`scripts/fix-badges.py`](./scripts/fix-badges.py)；
- 链接与代码块规范化：[`scripts/fix-doc-links.py`](./scripts/fix-doc-links.py)、[`scripts/fix-code-fences.py`](./scripts/fix-code-fences.py)（均支持 `--dry-run`）；
- 历史高频问题的排查清单另见主仓库 Wiki：<https://github.com/baomidou/dynamic-datasource/wiki>（FAQ 速查），本站与 Wiki 互为补充；
- 欢迎直接提 PR 修正文档。

## 相关链接

- 主仓库：<https://github.com/baomidou/dynamic-datasource>
- 示例工程：<https://github.com/dynamic-datasource/dynamic-datasource-samples>
