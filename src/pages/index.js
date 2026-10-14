import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import CodeBlock from '@theme/CodeBlock';

import styles from './index.module.css';

const FEATURES = [
  {
    icon: '🔀',
    title: '一行注解切换数据源',
    desc: 'Service 方法上标注 @DS("slave") 即路由到目标库或组；支持 SpEL 动态 key、无注解方案与读写分离插件。',
  },
  {
    icon: '🧩',
    title: '连接池无侵入集成',
    desc: '原生适配 Druid / HikariCP / BeeCP / DBCP2 / JNDI，全局与单库两级配置，创建即接管。',
  },
  {
    icon: '🧾',
    title: '本地多库事务',
    desc: '@DSTransactional 在一个事务中绑定多个库的连接统一提交/回滚；另提供 Seata AT/XA 与 Atomikos 集成方案。',
  },
  {
    icon: '🧵',
    title: '动态数据源管理',
    desc: '运行时增删数据源、懒启动、无数据源启动、数据源清单来自引导库，多租户场景的基石。',
  },
];

const YAML_SNIPPET = `spring:
  datasource:
    dynamic:
      primary: master
      datasource:
        master:
          url: jdbc:mysql://host1:3306/db
          username: root
          password: ENC(...)
        slave_1:
          url: jdbc:mysql://host2:3306/db
          username: root
          password: ENC(...)`;

const JAVA_SNIPPET = `@Service
public class UserServiceImpl implements UserService {

    @DS("master")
    public void save(User user) {
        // 走主库
    }

    @DS("slave") // slave_1 / slave_2 组内负载均衡
    public List<User> listUsers() {
        // 走从库组
    }
}`;

function Hero() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <p className={styles.kicker}>
          Spring Boot 多数据源框架 · Apache-2.0 · 始于 2018
        </p>
        <h1 className={styles.heroTitle}>dynamic-datasource</h1>
        <p className={styles.heroSubtitle}>
          一行 <code className={styles.heroCode}>@DS</code> 注解切换数据源
          <span className={styles.heroDivider}>·</span>
          本地多库事务
          <span className={styles.heroDivider}>·</span>
          动态增删数据源
          <span className={styles.heroDivider}>·</span>
          读写分离
        </p>
        <div className={styles.heroActions}>
          <Link className={styles.btnPrimary} to="/docs/guide/basics">
            快速开始
          </Link>
          <Link className={styles.btnGhost} to="/docs/guide/switching-failure">
            排查「切换失败」
          </Link>
          <Link
            className={styles.btnGhost}
            href="https://github.com/baomidou/dynamic-datasource">
            GitHub
          </Link>
        </div>
      </div>
    </header>
  );
}

function Features() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <div className={styles.featureCard} key={f.title}>
              <div className={styles.featureIcon}>{f.icon}</div>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickStart() {
  return (
    <section className={clsx(styles.section, styles.quickstart)}>
      <div className="container">
        <h2 className={styles.sectionTitle}>30 秒上手</h2>
        <p className={styles.sectionDesc}>
          引入 starter、配置多个库、在 Service 上标注解 —— 完成。
        </p>
        <div className={styles.quickstartGrid}>
          <div>
            <h3 className={styles.stepTitle}>
              1. 配置数据源（第一个 <code>_</code> 之前是组名）
            </h3>
            <CodeBlock language="yaml">{YAML_SNIPPET}</CodeBlock>
          </div>
          <div>
            <h3 className={styles.stepTitle}>
              2. 用 <code>@DS</code> 切换
            </h3>
            <CodeBlock language="java">{JAVA_SNIPPET}</CodeBlock>
          </div>
        </div>
        <p className={styles.quickstartMore}>
          依赖坐标（按 Spring Boot 版本三选一）及完整配置说明见{' '}
          <Link to="/docs/guide/basics">基础必读</Link>。
        </p>
      </div>
    </section>
  );
}

function BottomCta() {
  return (
    <section className={clsx(styles.section, styles.cta)}>
      <div className="container">
        <h2 className={styles.ctaTitle}>遇到问题了？</h2>
        <p className={styles.sectionDesc}>
          「@DS 不生效」「启动报错」「事务内不切换」等历史高频问题，已整理成排查清单。
        </p>
        <div className={styles.heroActions}>
          <Link
            className={styles.btnPrimary}
            href="https://github.com/baomidou/dynamic-datasource/wiki">
            Wiki FAQ 排查
          </Link>
          <Link
            className={styles.btnGhost}
            href="https://github.com/baomidou/dynamic-datasource/issues">
            提交 Issue
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <Layout
      title="dynamic-datasource — Spring Boot 多数据源框架文档"
      description="dynamic-datasource：@DS 注解切换数据源、本地多库事务、动态增删数据源、读写分离与连接池集成的完整文档。">
      <Hero />
      <main>
        <Features />
        <QuickStart />
        <BottomCta />
      </main>
    </Layout>
  );
}
