# dynamic-datasource 文档站

<https://doc.xiuceyun.cn/>

dynamic-datasource 的完整文档（原秀策云付费文档，现已免费开放），基于 [Docusaurus 3](https://docusaurus.io) 构建，使用 pnpm 管理依赖，部署在 GitHub Pages。

## 内容结构

```
docs/                          Next（开发中），路由 /docs/next/
├── guide/          入门与速查（基础必读、@DS 语义、完整配置参考、不在范围内、版本记录…）
├── pool/           连接池集成（总览 / 必读 / Druid / HikariCP / BeeCP / DBCP2 / JNDI）
├── integration/    第三方集成（总览 / MyBatis-Plus / P6spy / Quartz / ShardingJDBC）
├── tx/             事务专栏（选型指南 / 概念 / 切换原理 / 常见问题 / 本地事务 / Seata）
├── advanced/       进阶使用（动态增删、运维端点、优雅关闭、加密、懒启动、手动注入…）
├── custom/         自定义（注解 / 数据源来源 / 负载均衡策略）
├── no-annotation/  无注解方案（总览 / Filter / Interceptor / AOP / MyBatis 读写分离）
└── faq/            FAQ 速查（@DS 不生效排查总表、MyBatis-Plus 调用姿势、线程、SpEL、事务内不切换、启动报错）

versioned_docs/
├── version-4.6/    4.6.0 文档（最新稳定版，默认），路由 /docs/
└── version-4.5/    4.5.0 文档（上一稳定版），路由 /docs/4.5/
```

路由前缀为 `/docs/`（如 `/docs/tx/local-tx`），侧边栏定义见 [`sidebars.js`](./sidebars.js) 与 [`versioned_sidebars/`](./versioned_sidebars)。

**多版本是怎么做的、成本多大、什么时候该建快照**——见下文[维护约定 § 1](#1-多版本文档机制与成本)。

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

### 1. 多版本文档：机制与成本

**Docusaurus 的版本化没有「只存差异」的机制。** `versioned_docs/version-X/` 是某个时刻的**完整副本**，包含当时的所有页面。

```
docs/                          ← Next：开发中的内容，路由 /docs/next/
versioned_docs/version-4.6/    ← 最新稳定版，路由 /docs/（默认）
versioned_docs/version-4.5/    ← 上一稳定版，路由 /docs/4.5/
```

版本名取 `x.y`（**不是** `x.y.z`）：同一个 tag 线上发 4.5.0 / 4.5.1 时不必新建目录。

**但维护成本没有想象中大**——关键在「快照是冻结的」：

| 动作 | 频率 |
| :--- | :--- |
| 全量拷贝建快照 | 每次决定「为某个版本单独建站」时做一次 |
| 同步日常改动到旧版本 | **不需要**。旧版本默认不动 |
| 把某个修正回移到旧版本 | 只在确实有必要时手动做 |

所以真实成本 ≈「每次建快照拷一次」+「零星回移」，而不是「每改一个字同步 N 份」。

:::tip[什么时候**不该**建快照]
判断标准不是「发了新版本」，而是「**上一个版本的用户照着新文档做会不会出错**」。

如果两版差异只是增量（多了几个配置项），更划算的做法是**只在一份文档里做版本标注**，省下一整套副本。本站的 4.5 快照就是因为差异确实存在（Actuator 端点、SpEL 开关、`No suitable driver`）才建的。
:::

### 2. 建一个新版本

```bash
# X.Y = 新版本号
rsync -a --delete docs/ versioned_docs/version-X.Y/
cp versioned_sidebars/version-4.6-sidebars.json \
   versioned_sidebars/version-X.Y-sidebars.json

# 登记版本：versions.json 里的顺序 = 下拉顺序，**排第一的是默认版本**
cat versions.json

# i18n 同步
rsync -a --delete i18n/en/docusaurus-plugin-content-docs/current/ \
                  i18n/en/docusaurus-plugin-content-docs/version-X.Y/
```

然后在 `docusaurus.config.js` 的 `presets.docs.versions` 里补该版本的 `label` / `badge` / `banner`：

- `banner: 'none'` —— 默认版本，不显示横幅
- `banner: 'unmaintained'` —— 旧版本，Docusaurus 自动在页面顶部显示「本文档对应 X，该版本已不再维护」并给出最新版链接

### 3. 标注版本差异

快照是从**当前**文档复制的（不是从历史 tag 里挖出来的），所以凡是「该版本还没有 / 行为不同」的内容**必须显式标注**，否则用户会照着文档去找不存在的功能。

已用过的三种标注形式：

- 整页都不适用 → 页面顶部 `:::warning[本文档对应 4.5.0]`
- 只有一个章节不适用 → `:::info[4.6.0 新增]`
- 只是一个配置项 → 表格单元格里写「**4.6.0 新增，4.5.0 上该配置项不存在**」

**当前 4.5 快照与 4.6 的全部差异只有这 5 个文件**（其余 45 个页面完全相同，靠 `diff -rq versioned_docs/version-4.5 versioned_docs/version-4.6` 一查便知）：

| 文件 | 差异 |
| :--- | :--- |
| `advanced/observability.md` | Actuator 端点整节标注为 4.6.0 新增 |
| `guide/basics.md` | 特性表里端点标「4.6.0 起」 |
| `guide/configuration.md` | `aop.allowed-spel-type-access` 标「4.6.0 新增」 |
| `guide/ds-semantics.md` | 安全告警换成「4.5.0 存在 SpEL 注入漏洞」 |
| `guide/native-image.md` | `Automatic-Module-Name` 标「4.6.0 才补齐」 |

回移修正时**只改这 5 个文件之外**的内容才需要重新 diff，改到它们时注意别把版本标注删掉。

### 4. 新增页面要同步的位置

`next` 与最新稳定版（当前是 4.6）内容保持镜像，因此改 `docs/` 时要一起同步：

| 位置 | 作用 |
| :--- | :--- |
| `docs/` + `sidebars.js` | Next（开发中） |
| `versioned_docs/version-4.6/` + `versioned_sidebars/version-4.6-sidebars.json` | 最新稳定版，**与 `docs/` 一致** |
| `i18n/en/…/version-4.6/` | 英文（默认版本 57 页已全文翻译） |

```bash
rsync -a --delete docs/ versioned_docs/version-4.6/
```

英文版各目录**页数不同**（见下文 §7），不要用 `--delete` 在它们之间互相 `rsync`，否则会误删默认版本的完整翻译。

:::warning
`docs/`（Next）与 `version-4.6` 是**字节级镜像**关系，只改一边会让两个版本内容漂移。

`version-4.5` 是**冻结快照**：日常改动不要动它，只有在回移某个修正时才手动改。
:::

### 5. 内部链接统一用绝对路径

写 `/docs/tx/local-tx`，不要写 `./local-tx.md`。

原因：未翻译的页面在英文站由中文内容**回退渲染**，此时相对 `.md` 链接不会被解析成路由，会原样输出导致死链。绝对路径在两种 locale 下都能解析。

```bash
python3 scripts/fix-doc-links.py --dry-run   # 检查
python3 scripts/fix-doc-links.py             # 批量改写
```

### 6. 代码块必须标注语言

```bash
python3 scripts/fix-code-fences.py --dry-run
python3 scripts/fix-code-fences.py
```

### 7. 国际化的现状

`i18n/en/` 的翻译状态分三档：

| 目录 | 英文页数 | 说明 |
| :--- | :--- | :--- |
| `…/version-4.6/` | 57 页（全文） | 默认版本，已完整翻译 |
| `…/current/` | 3 页 | Next，仅 `guide/basics`、`guide/switching-failure`、`tx/local-tx` |
| `…/version-4.5/` | 3 页 | 旧版本，同上 3 页 |

未翻译的页面在英文站会回退显示中文原文——能正常访问，不会 404，但也没有英文内容。

**当前策略**：默认版本（4.6）追求全文翻译；Next 与旧版本只保证这 3 个入口页与中文版同步。修改这 3 个中文页时请一并更新对应的英文文件（`current`、`version-4.6`、`version-4.5` 三个目录各一份），避免同一个入口出现中英不一致。

## 部署

push 到 `main` 后，GitHub Actions（[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)）自动以 pnpm 构建并发布到 GitHub Pages（自定义域名 `doc.xiuceyun.cn`）。所有 actions 均 pin 到 SHA。

## 内容来源与维护脚本

- 内容来自 docpay 中的 GitBook 风格文档，最初的 Markdown 结构化迁移（中文文件名 → 英文 slug、互链/图片改写）见 git 历史中的 `scripts/migrate.py`；
- 适配 Docusaurus 严格 MDX（`<url>` autolink、HTML 徽章块等）的清洗脚本：[`scripts/fix-mdx.py`](./scripts/fix-mdx.py)、[`scripts/fix-badges.py`](./scripts/fix-badges.py)；
- 链接与代码块规范化：[`scripts/fix-doc-links.py`](./scripts/fix-doc-links.py)、[`scripts/fix-code-fences.py`](./scripts/fix-code-fences.py)（均支持 `--dry-run`）；
- 历史高频问题的排查清单见 [`docs/faq/`](./docs/faq)（路由 `/docs/faq`），由主仓库的 FAQ 页迁移而来，现统一在本站维护；
- 欢迎直接提 PR 修正文档。

## 相关链接

- 主仓库：<https://github.com/baomidou/dynamic-datasource>
- 示例工程：<https://github.com/dynamic-datasource/dynamic-datasource-samples>
