# dynamic-datasource 文档站

<https://baomidou.github.io/dynamic-datasource-doc/>

dynamic-datasource 的完整文档（原秀策云付费文档，现已免费开放），基于 [VitePress](https://vitepress.dev) 构建，部署在 GitHub Pages。

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

## 本地开发

```bash
npm install
npm run docs:dev      # 本地开发服务器（默认 base: /dynamic-datasource-doc/）

# 预览根路径部署（例如未来换自定义域名时）
DOC_BASE=/ npm run docs:build && npm run docs:preview
```

## 部署

push 到 `main` 分支后，GitHub Actions（`.github/workflows/deploy.yml`）自动构建并发布到 GitHub Pages。workflow 中的 actions 均 pin 到 SHA。

## 内容来源

- 内容迁移自 docpay 中的 GitBook 风格文档，迁移脚本见 [`scripts/migrate.py`](./scripts/migrate.py)（一次性，可重复执行）；
- 历史高频问题的排查清单另见主仓库 Wiki：<https://github.com/baomidou/dynamic-datasource/wiki>（FAQ 速查），站点与 Wiki 互为补充；
- 欢迎直接提 PR 修正文档。

## 相关链接

- 主仓库：<https://github.com/baomidou/dynamic-datasource>
- 示例工程：<https://github.com/dynamic-datasource/dynamic-datasource-samples>
