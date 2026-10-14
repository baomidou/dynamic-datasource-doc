// @ts-check
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
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
