---
name: docusaurus-site
description: 维护 dynamic-datasource-doc 文档站（Docusaurus 3.10 + pnpm + GitHub Pages，域名 doc.xiuceyun.cn）：新增/修改文档页与侧边栏、切文档版本（docs:version）、英文翻译（i18n）、MDX 清洗脚本、本地预览构建与部署排查。当在该文档站仓库工作，或用户提到"文档站/在线文档/Docusaurus/切版本/翻译文档/发布文档"时使用。
---

# dynamic-datasource-doc 文档站维护

## 站点概况

- 仓库 `baomidou/dynamic-datasource-doc`，**只有 main 一条分支**：日常改动直接提交 main，push 即触发 `deploy.yml` 构建并发布 GitHub Pages（与主仓库的 main/dev 双分支模型不同）。
- 生产域名 <https://doc.xiuceyun.cn>（`static/CNAME` + Pages 自定义域名；原 github.io 子路径已 301 过来）。`url='https://doc.xiuceyun.cn'`、`baseUrl='/'`（可用环境变量 `DOC_BASE` 覆盖，做子路径预览）。
- 技术栈：Docusaurus 3.10.2（classic preset，所有 `@docusaurus/*` 同一版本）+ `@docusaurus/faster`（config 中 `future.v4: true` 已启用 v4 兼容与构建加速开关）+ pnpm 11.5（`packageManager` 声明）+ Node ≥ 22。
- 本地搜索：`@easyops-cn/docusaurus-search-local`（hashed、zh+en、`docsRouteBasePath: /docs`、indexBlog false）；索引随 `pnpm build` 生成。
- 版本方案：`versions.json = ["4.6"]`。`docs/`（current，标签 Next）→ `/docs/next/*`；`versioned_docs/version-4.6` → `/docs/*`（默认落地版本，lastVersion = versions.json 第一项）。
- i18n：zh-Hans 默认 + en 部分翻译（详见下文）。
- 内容源头：docpay GitBook 迁移（见 README）；与主仓库 GitHub Wiki（FAQ 速查）互为补充。

## 常用命令

```bash
pnpm install
pnpm start                  # dev server :3000（baseUrl /）
pnpm start --locale en      # 预览英文站点（同一时刻只能跑一个 locale）
pnpm build                  # 生产构建 = CI 同款校验，push 前必须过
pnpm serve                  # 本地预览 build 产物
pnpm clear                  # 清 .docusaurus 缓存（构建诡异失败先做这个）
pnpm write-translations --locale en   # 重新提取英文 JSON 翻译片段
pnpm run docusaurus docs:version X.Y  # 给文档切版本（见下文）
DOC_BASE=/dynamic-datasource-doc/ pnpm build && pnpm serve   # 子路径形态预览
```

## 日常编辑

### 新增 / 修改文档页

1. 在 `docs/<分组>/<name>.md` 新建（H1 即页面标题；**本仓库不使用 front matter**，doc id = 文件路径，URL = `/docs/<路径>`）。
2. 在 `sidebars.js` 对应分类的 `items` 里加入 doc id（如 `'guide/basics'`）——**侧边栏全手写**，不加就进不了导航。
3. 若是新分类：同步补 i18n 分类标签（见"英文翻译"）。
4. 站内互链用相对 `.md` 路径（构建时自动改写为当前版本的正确 URL）；全站共享图片放 `static/`。
5. 本地 `pnpm build` 过一遍再提交。

docs/ 现有分组：guide / pool / integration / advanced / custom / no-annotation / tx。

### MDX 严格模式（最常见的构建失败）

Docusaurus v3 对所有 .md 用 MDX 编译，`<...>` 会被当成 JSX：

- `<https://url>` 角括号 autolink 必须改写成 `[url](url)`；void 标签（如 `<img ...>`）必须自闭合。
- 迁移遗留问题可用清洗脚本批量处理（幂等，默认扫描 `docs/`，可传目录参数）：
  - `python3 scripts/fix-mdx.py`：角括号 autolink、未自闭合 void 标签
  - `python3 scripts/fix-badges.py`：HTML 徽章块 `<a><img /></a>` → Markdown
  - `python3 scripts/fix-sample-links.py`：示例仓库目录重构后的链接修正
- 代码围栏与行内代码不会被误伤。

## 版本化（发新版文档时）

- 切快照：`pnpm run docusaurus docs:version 4.7` → 复制 `docs/` 为 `versioned_docs/version-4.7/`、生成 `versioned_sidebars/version-4.7-sidebars.json`、`versions.json` 顶部插入 `"4.7"`（它即成为 /docs/* 默认版本；Next 仍挂 /docs/next/*）。
- 切版前先把 docs/ 定稿；切版后新内容继续写 docs/（Next）。
- 修改已发布版本：直接编辑 `versioned_docs/version-4.6/**`；**侧边栏是 `versioned_sidebars/version-4.6-sidebars.json`（JSON，不是 sidebars.js）**。
- 删除旧版本三步：versions.json 移除 → 删 `versioned_docs/version-X` → 删 `versioned_sidebars/version-X-sidebars.json`。（官方建议同时保留的版本数尽量少。）
- 切版联动 i18n（否则新版本英文回落中文）：
  1. 把 `i18n/en/docusaurus-plugin-content-docs/current/` 下已翻译的 `*.md` 复制到 `version-4.7/` 同名路径；
  2. 复制 `current.json` → `version-4.7.json`，把 `version.label` 改为 `4.7`。
- 导航栏版本下拉（docsVersionDropdown）自动展示 versions.json 全部版本。

## 英文翻译（i18n）

`i18n/en/` 结构（路径与 docs/ 镜像，**只放已翻译的文件，缺失即回落中文**）：

| 路径 | 内容 |
|---|---|
| `docusaurus-plugin-content-docs/current/<路径>.md` | current 版整页翻译（现覆盖 guide/basics、guide/switching-failure、tx/local-tx） |
| `docusaurus-plugin-content-docs/version-4.6/<路径>.md` | 4.6 版整页翻译（现覆盖 guide/basics、guide/switching-failure、tx/local-tx） |
| `docusaurus-plugin-content-docs/current.json` / `version-4.6.json` | 侧边栏分类标签（`sidebar.docs.category.<中文label>`）+ `version.label` |
| `docusaurus-theme-classic/navbar.json` / `footer.json` | 导航 / 页脚文案 |
| `code.json` | React 文案（首页 `<Translate id="...">`，FEATURES 的 titleId/descId 即对应 key） |

实测现状（2026-10）：`/en/docs/*`（4.6 版）与 `/en/docs/next/*` 均显示英文（3 篇翻译已同步到 `version-4.6/` 目录）。

规则：

- 整页翻译保留原 Markdown 结构（徽章、代码块），翻译 H1 与正文；文件路径必须与源文件一致（doc id 由路径决定，翻译才能对上）。
- 新增/修改 sidebar 分类 label、navbar/footer 文案后，用 `pnpm write-translations --locale en` 提取缺失 key，再补 `message`。
- 新增翻译文件后重启 dev（`pnpm start --locale en`）。

## 配置与首页

- `docusaurus.config.js`：navbar、footer、搜索插件、prism、i18n、editUrl；注意 `onBrokenLinks: 'throw'`、`markdown.hooks.onBrokenMarkdownLinks: 'warn'`。
- `sidebars.js`：current 版侧边栏（8 个分类，全手写、collapsed:false）——与 `versioned_sidebars/*.json` 相互独立。
- `src/pages/index.js` + `index.module.css`：定制首页（hero / 4 特性卡 / 30 秒上手 / AI skill 区 / CTA）；`src/css/custom.css` 主题样式。
- 改 navbar/footer/分类文案 → 必须同步 i18n JSON（否则切英文显示中文）。

## 构建门禁与部署

- `onBrokenLinks: 'throw'`：站内死链直接让构建失败——重命名/删除页面前先全局搜索旧链接。
- push main → `deploy.yml`：pnpm install --frozen-lockfile → pnpm build → upload Pages artifact → deploy Pages；actions 全部 pin SHA。推完用 `gh run list` / `gh run watch <id> --exit-status` 跟踪结果。
- `.qoder/` 已被 .gitignore（本地 agent 工具目录，不进版本库）。

## 已知坑

- 构建怪异失败：先 `pnpm clear` 再 `pnpm build`。
- 分类 label 重名会触发 i18n key 冲突错误：给 sidebars.js 中对应分类加 `key` 区分。
- docs 里不要用相对路径 import 组件（切版本后失效），用 `@site/` 别名。
- Node 20 跑 pnpm 11 会报 `ERR_UNKNOWN_BUILTIN_MODULE`（CI 用 Node 22）。不要删 `pnpm-workspace.yaml` 的 `allowBuilds: {'@swc/core': true}`（Docusaurus Faster/SWC 需要）。
- 升级 Docusaurus 时：所有 `@docusaurus/*` 保持同一版本；升级到 v4 时移除 `future.v4` 开关。

## 官方文档速查

- 版本化：<https://docusaurus.io/docs/versioning> ；i18n：<https://docusaurus.io/docs/i18n/introduction> 与教程 <https://docusaurus.io/docs/i18n/tutorial>
- 文档插件 API（front matter、版本选项、i18n 目录）：<https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-content-docs>
- 站点配置：<https://docusaurus.io/docs/api/docusaurus-config> ；CLI：<https://docusaurus.io/docs/cli> ；Markdown/MDX：<https://docusaurus.io/docs/markdown-features>
- 侧边栏：<https://docusaurus.io/docs/sidebar> ；部署：<https://docusaurus.io/docs/deployment>
