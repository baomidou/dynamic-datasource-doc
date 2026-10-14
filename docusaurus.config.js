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
            href: 'https://github.com/baomidou/dynamic-datasource/wiki',
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
            title: '社区',
            items: [
              {
                label: 'FAQ 排查（Wiki）',
                href: 'https://github.com/baomidou/dynamic-datasource/wiki',
              },
              {
                label: 'GitHub Issues',
                href: 'https://github.com/baomidou/dynamic-datasource/issues',
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
