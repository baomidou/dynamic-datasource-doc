import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'dynamic-datasource',
  description: 'Spring Boot 多数据源框架 — @DS 注解切换数据源、本地多库事务、动态增删数据源、读写分离',
  // GitHub Pages project site by default; override with DOC_BASE=/ for local
  // preview at the root or when moving to a custom domain.
  base: process.env.DOC_BASE ?? '/dynamic-datasource-doc/',
  cleanUrls: true,
  lastUpdated: true,
  markdown: {
    lineNumbers: true
  },
  head: [
    ['meta', { name: 'theme-color', content: '#3c8772' }]
  ],
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/basics' },
      { text: '连接池', link: '/pool/common' },
      { text: '事务专栏', link: '/tx/concepts' },
      { text: 'FAQ 排查', link: 'https://github.com/baomidou/dynamic-datasource/wiki' }
    ],
    sidebar: [
      {
        text: '入门',
        collapsed: false,
        items: [
          { text: '基础必读', link: '/guide/basics' },
          { text: 'DS 详细解析', link: '/guide/how-it-works' }
        ]
      },
      {
        text: '连接池集成',
        collapsed: false,
        items: [
          { text: '连接池必读', link: '/pool/common' },
          { text: '集成 Druid', link: '/pool/druid' },
          { text: '集成 HikariCP', link: '/pool/hikaricp' },
          { text: '集成 BeeCP', link: '/pool/beecp' },
          { text: '集成 DBCP2', link: '/pool/dbcp2' },
          { text: '集成 JNDI', link: '/pool/jndi' }
        ]
      },
      {
        text: '第三方集成',
        collapsed: false,
        items: [
          { text: '概览', link: '/integration/' },
          { text: 'MyBatis-Plus', link: '/integration/mybatis-plus' },
          { text: 'P6spy', link: '/integration/p6spy' },
          { text: 'Quartz', link: '/integration/quartz' },
          { text: 'ShardingJDBC', link: '/integration/sharding-jdbc' }
        ]
      },
      {
        text: '进阶使用',
        collapsed: false,
        items: [
          { text: '概览', link: '/advanced/' },
          { text: '动态添加/移除数据源', link: '/advanced/add-remove-datasource' },
          { text: '动态解析数据源', link: '/advanced/dynamic-datasource-resolution' },
          { text: '数据库加密', link: '/advanced/encryption' },
          { text: '启动初始化执行脚本', link: '/advanced/init-scripts' },
          { text: '懒启动数据源', link: '/advanced/lazy-datasource' },
          { text: '无数据源启动', link: '/advanced/no-datasource-startup' },
          { text: '手动切换数据源', link: '/advanced/manual-switching' },
          { text: '手动注入多数据源', link: '/advanced/manual-injection' }
        ]
      },
      {
        text: '自定义',
        collapsed: false,
        items: [
          { text: '概览', link: '/custom/' },
          { text: '自定义注解', link: '/custom/annotation' },
          { text: '自定义数据源来源', link: '/custom/datasource-provider' },
          { text: '自定义负载均衡策略', link: '/custom/load-balance-strategy' }
        ]
      },
      {
        text: '无注解方案',
        collapsed: false,
        items: [
          { text: '必读', link: '/no-annotation/readme' },
          { text: 'Filter 切换', link: '/no-annotation/filter' },
          { text: 'Interceptor 切换', link: '/no-annotation/interceptor' },
          { text: 'AOP 切面切换', link: '/no-annotation/aop' },
          { text: 'MyBatis 下读写分离', link: '/no-annotation/mybatis-read-write' }
        ]
      },
      {
        text: '事务专栏',
        collapsed: false,
        items: [
          { text: '概览', link: '/tx/' },
          { text: '事务概念', link: '/tx/concepts' },
          { text: '基础知识', link: '/tx/basics' },
          { text: '本地事务', link: '/tx/local-tx' },
          { text: 'Seata 事务', link: '/tx/seata' },
          { text: '事务常见问题', link: '/tx/faq' }
        ]
      },
      {
        text: '更多',
        collapsed: false,
        items: [
          { text: '调试源码', link: '/guide/debugging-source' },
          { text: '常见问题：切换数据源失败', link: '/guide/switching-failure' },
          { text: '不可用版本', link: '/guide/unavailable-versions' },
          { text: '版本记录与选择建议', link: '/guide/version-history' },
          { text: '知识库', link: '/guide/knowledge-base' },
          { text: '多租户最佳实践', link: '/guide/multi-tenant' }
        ]
      }
    ],
    search: {
      provider: 'local'
    },
    outline: {
      level: [2, 3],
      label: '本页目录'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/baomidou/dynamic-datasource' }
    ],
    editLink: {
      pattern: 'https://github.com/baomidou/dynamic-datasource-doc/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页'
    },
    lastUpdated: {
      text: '最后更新于',
      formatOptions: { dateStyle: 'short', timeStyle: 'short' }
    },
    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },
    sidebarMenuLabel: '目录',
    returnToTopLabel: '回到顶部',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
    footer: {
      message: '以 Apache License 2.0 许可发布',
      copyright: 'Copyright © 2018-present baomidou'
    }
  }
})
