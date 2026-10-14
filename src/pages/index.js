import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';

import styles from './index.module.css';

function HomepageHeader() {
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">dynamic-datasource</h1>
        <p className="hero__subtitle">
          Spring Boot 多数据源框架 — 一行 @DS 注解切换数据源 · 本地多库事务 ·
          动态增删数据源 · 读写分离
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/guide/basics">
            快速开始
          </Link>
          <Link
            className="button button--secondary button--lg"
            style={{marginLeft: '1rem'}}
            to="/docs/guide/switching-failure">
            排查「切换失败」
          </Link>
          <Link
            className="button button--secondary button--lg"
            style={{marginLeft: '1rem'}}
            to="https://github.com/baomidou/dynamic-datasource">
            GitHub
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  return (
    <Layout
      title="首页"
      description="dynamic-datasource — Spring Boot 多数据源框架完整文档">
      <HomepageHeader />
      <main />
    </Layout>
  );
}
