// @ts-check
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

// ---------------------------------------------------------------------------
// 站点统计
//
// 百度统计（推荐，域名已备案后国内最稳）：
//   1. https://tongji.baidu.com 注册站点，拿到 hm.js 后面的 ID
//   2. 把 ID 填到下面的 BAIDU_TONGJI_ID 即可生效
//
// Microsoft Clarity（免费无限量，附带热图 / 会话录屏，可选）：
//   1. https://clarity.microsoft.com 新建项目，拿到项目 ID
//   2. 填到下面的 CLARITY_ID
//
// 留空则不会注入任何统计脚本。
//
// 统计脚本只在 ANALYTICS_HOSTS 列出的域名下加载。本地 `docusaurus start` /
// `docusaurus serve` 预览（localhost / 127.0.0.1 / IDE 内置预览）不会再请求这些
// 第三方脚本：既避免 Clarity 在非部署域名下抛错刷控制台，也避免本地调试污染线上
// 统计后台。需要临时放开时设置环境变量 DOC_ANALYTICS_HOSTS（逗号分隔）。
// ---------------------------------------------------------------------------
const BAIDU_TONGJI_ID = 'f721154f6983ef53284f27c3bf7a40d4';
const CLARITY_ID = 'yxnf8b5c40';

const ANALYTICS_HOSTS = (process.env.DOC_ANALYTICS_HOSTS ?? 'doc.xiuceyun.cn')
  .split(',')
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);

const ANALYTICS_SOURCES = [
  BAIDU_TONGJI_ID && `https://hm.baidu.com/hm.js?${BAIDU_TONGJI_ID}`,
  CLARITY_ID && `https://www.clarity.ms/tag/${CLARITY_ID}`,
].filter(Boolean);

/**
 * Docusaurus 的 `scripts` 配置无法做条件判断，因此改为注入一段引导脚本：
 * 只有当前 hostname 命中白名单时，才动态插入统计脚本。
 */
const analyticsBootstrap =
  ANALYTICS_SOURCES.length > 0
    ? {
        tagName: 'script',
        attributes: {},
        innerHTML: `(function(){var h=${JSON.stringify(
          ANALYTICS_HOSTS,
        )};if(h.indexOf(location.hostname.toLowerCase())===-1){return;}[${ANALYTICS_SOURCES.map(
          (src) => JSON.stringify(src),
        ).join(
          ',',
        )}].forEach(function(s){var e=document.createElement('script');e.src=s;e.async=true;document.head.appendChild(e);});})();`,
      }
    : null;

/** @type {import('@docusaurus/types').Config} */
const config = {
  headTags: analyticsBootstrap ? [analyticsBootstrap] : [],

  title: 'dynamic-datasource',
  tagline: 'Spring Boot 多数据源框架 — 一行 @DS 注解切换数据源 · 本地多库事务 · 动态增删数据源 · 读写分离',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  url: 'https://doc.xiuceyun.cn',
  // The site is served from the custom-domain root; DOC_BASE can override
  // it (e.g. DOC_BASE=/dynamic-datasource-doc/ for a project-subpath preview).
  baseUrl: process.env.DOC_BASE ?? '/',

  organizationName: 'baomidou',
  projectName: 'dynamic-datasource-doc',

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans', 'en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          editUrl:
            'https://github.com/baomidou/dynamic-datasource-doc/edit/main/',

          // 多版本文档：
          //   current  -> docs/                     dev 分支内容，路由 /docs/next/
          //   4.6      -> versioned_docs/version-4.6  最新稳定版，路由 /docs/（默认）
          //   4.5      -> versioned_docs/version-4.5  上一稳定版，路由 /docs/4.5/
          //
          // 版本名就是 versioned_docs 目录名的后缀，比补丁号（4.5.0 / 4.6.0）短，
          // 这样同一个 tag 线上发布多个补丁时不需要新建快照目录。
          // 新增快照见 README「维护约定」。
          versions: {
            current: {
              label: 'Next',
              badge: false, // 不在侧边栏头部重复显示版本名
              banner: 'none', // Next 不显示「非最新版」横幅
            },
            '4.6': {
              label: '4.6.0',
              badge: true,
              banner: 'none', // 默认版本文档，无需横幅
            },
            '4.5': {
              label: '4.5.0',
              badge: true,
              banner: 'unmaintained', // 提示这是旧版本，引导升级
            },
          },
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        language: ['zh', 'en'],
        indexBlog: false,
        docsRouteBasePath: '/docs',
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // 全站顶部招租公告条；文案由 src/theme/AnnouncementBar/Content 接管（支持中英切换）
      announcementBar: {
        id: 'sponsor-slots',
        content: '本站文档提供广告位，欢迎赞助合作',
        backgroundColor: '#0d9488',
        textColor: '#ffffff',
        isCloseable: true,
      },
      navbar: {
        title: 'dynamic-datasource',
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docs',
            position: 'left',
            label: '文档',
          },
          {
            type: 'docsVersionDropdown',
            position: 'left',
          },
          {
            to: '/sponsor',
            label: '赞助合作',
            position: 'right',
          },
          {
            to: '/docs/faq',
            label: 'FAQ 排查',
            position: 'right',
          },
          {
            href: 'https://github.com/baomidou/dynamic-datasource',
            label: 'GitHub',
            position: 'right',
          },
          {
            type: 'localeDropdown',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: '文档',
            items: [
              {label: '快速开始', to: '/docs/guide/basics'},
              {label: '事务专栏', to: '/docs/tx/concepts'},
              {label: '排查「切换失败」', to: '/docs/guide/switching-failure'},
            ],
          },
          {
            title: '版本',
            items: [
              {label: '版本记录', to: '/docs/guide/version-history'},
              {label: '4.6.0 文档（最新）', to: '/docs/guide/basics'},
              {label: '4.5.0 文档', to: '/docs/4.5/guide/basics'},
              {
                label: '更新日志（GitHub Releases）',
                href: 'https://github.com/baomidou/dynamic-datasource/releases',
              },
            ],
          },
          {
            title: '社区',
            items: [
              {
                label: 'FAQ 速查',
                to: '/docs/faq',
              },
              {
                label: 'GitHub Issues',
                href: 'https://github.com/baomidou/dynamic-datasource/issues',
              },
              {
                label: 'Discussions',
                href: 'https://github.com/baomidou/dynamic-datasource/discussions',
              },
            ],
          },
          {
            title: '更多',
            items: [
              {
                label: '主仓库',
                href: 'https://github.com/baomidou/dynamic-datasource',
              },
              {
                label: '示例工程',
                href: 'https://github.com/dynamic-datasource/dynamic-datasource-samples',
              },
            ],
          },
        ],
        copyright: `Copyright © 2018-present baomidou. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['java', 'properties', 'groovy', 'sql'],
      },
    }),
};

export default config;
