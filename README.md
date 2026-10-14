# dynamic-datasource 文档站

<https://baomidou.github.io/dynamic-datasource-doc/>

dynamic-datasource 的完整文档（原秀策云付费文档，现已免费开放），基于 [Docusaurus 3](https://docusaurus.io) 构建，使用 pnpm 管理依赖，部署在 GitHub Pages。

## 内容结构

```
docs/
├── guide/          入门与 FAQ（基础必读、DS 详细解析、调试源码、切换失败排查…）
├── pool/           连接池集成（Druid / HikariCP / BeeCP / DBCP2 / JNDI）
├── integration/    第三方集成（MyBatis-Plus / P6spy / Quartz / ShardingJDBC）
├── advanced/       进阶使用（动态增删、加密、懒启动、手动注入…）
├── custom/         自定义（注解 / 数据源来源 / 负载均衡策略）
├── no-annotation/  无注解方案（Filter / Interceptor / AOP / MyBatis 读写分离）
└── tx/             事务专栏（概念 / 本地事务 / Seata / 常见问题）
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

## 部署

push 到 `main` 后，GitHub Actions（[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)）自动以 pnpm 构建并发布到 GitHub Pages；workflow 中通过 `DOC_BASE` 注入子路径。所有 actions 均 pin 到 SHA。

## 内容来源与迁移脚本

- 内容来自 docpay 中的 GitBook 风格文档，最初的 Markdown 结构化迁移（中文文件名 → 英文 slug、互链/图片改写）见 git 历史中的 `scripts/migrate.py`；
- 适配 Docusaurus 严格 MDX（`<url>` autolink、HTML 徽章块等）的清洗脚本：[`scripts/fix-mdx.py`](./scripts/fix-mdx.py)、[`scripts/fix-badges.py`](./scripts/fix-badges.py)；
- 历史高频问题的排查清单另见主仓库 Wiki：<https://github.com/baomidou/dynamic-datasource/wiki>（FAQ 速查），本站与 Wiki 互为补充；
- 欢迎直接提 PR 修正文档。

## 相关链接

- 主仓库：<https://github.com/baomidou/dynamic-datasource>
- 示例工程：<https://github.com/dynamic-datasource/dynamic-datasource-samples>
