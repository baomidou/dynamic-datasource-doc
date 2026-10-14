import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import CodeBlock from '@theme/CodeBlock';
import Translate from '@docusaurus/Translate';

import DataSourceFlow from '../components/DataSourceFlow';
import {SponsorStrip} from '../components/SponsorSlot';
import SponsorRails from '../components/SponsorSlot/SponsorRails';

import styles from './index.module.css';

const FEATURES = [
  {
    icon: '🔀',
    titleId: 'homepage.feature.switch.title',
    title: '一行注解切换数据源',
    descId: 'homepage.feature.switch.desc',
    desc: 'Service 方法上标注 @DS("slave") 即路由到目标库或组；支持 SpEL 动态 key、无注解方案与读写分离插件。',
  },
  {
    icon: '🧩',
    titleId: 'homepage.feature.pool.title',
    title: '连接池无侵入集成',
    descId: 'homepage.feature.pool.desc',
    desc: '原生适配 Druid / HikariCP / BeeCP / DBCP2 / JNDI，全局与单库两级配置，创建即接管。',
  },
  {
    icon: '🧾',
    titleId: 'homepage.feature.tx.title',
    title: '本地多库事务',
    descId: 'homepage.feature.tx.desc',
    desc: '@DSTransactional 在一个事务中绑定多个库的连接统一提交/回滚；另提供 Seata AT/XA 与 Atomikos 集成方案。',
  },
  {
    icon: '🧵',
    titleId: 'homepage.feature.dynamic.title',
    title: '动态数据源管理',
    descId: 'homepage.feature.dynamic.desc',
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

const SKILL_COMMAND = 'npx skills add baomidou/dynamic-datasource';

function Hero() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <p className={styles.kicker}>
          <Translate id="homepage.kicker">
            Spring Boot 多数据源框架 · Apache-2.0 · 始于 2018
          </Translate>
        </p>
        <h1 className={styles.heroTitle}>dynamic-datasource</h1>
        <p className={styles.heroSubtitle}>
          <Translate id="homepage.hero.before">一行</Translate>{' '}
          <code className={styles.heroCode}>@DS</code>{' '}
          <Translate id="homepage.hero.after">
            注解切换数据源 · 本地多库事务 · 动态增删数据源 · 读写分离
          </Translate>
        </p>
        <div className={styles.heroActions}>
          <Link className={styles.btnPrimary} to="/docs/guide/basics">
            <Translate id="homepage.hero.quickstart">快速开始</Translate>
          </Link>
          <Link className={styles.btnGhost} to="/docs/guide/switching-failure">
            <Translate id="homepage.hero.troubleshooting">
              排查「切换失败」
            </Translate>
          </Link>
          <Link
            className={styles.btnGhost}
            href="https://github.com/baomidou/dynamic-datasource">
            GitHub
          </Link>
        </div>
      </div>
      <SponsorStrip />
    </header>
  );
}

function Features() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <div className={styles.featureCard} key={f.titleId}>
              <div className={styles.featureIcon}>{f.icon}</div>
              <h3 className={styles.featureTitle}>
                <Translate id={f.titleId}>{f.title}</Translate>
              </h3>
              <p className={styles.featureDesc}>
                <Translate id={f.descId}>{f.desc}</Translate>
              </p>
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
        <h2 className={styles.sectionTitle}>
          <Translate id="homepage.quickstart.title">30 秒上手</Translate>
        </h2>
        <p className={styles.sectionDesc}>
          <Translate id="homepage.quickstart.desc">
            引入 starter、配置多个库、在 Service 上标注解 —— 完成。
          </Translate>
        </p>
        <div className={styles.quickstartGrid}>
          <div>
            <h3 className={styles.stepTitle}>
              <Translate id="homepage.quickstart.step1">
                1. 配置数据源（第一个 _ 之前是组名）
              </Translate>
            </h3>
            <CodeBlock language="yaml">{YAML_SNIPPET}</CodeBlock>
          </div>
          <div>
            <h3 className={styles.stepTitle}>
              <Translate id="homepage.quickstart.step2">2. 用 @DS 切换</Translate>
            </h3>
            <CodeBlock language="java">{JAVA_SNIPPET}</CodeBlock>
          </div>
        </div>
        <p className={styles.quickstartMore}>
          <Translate id="homepage.quickstart.more">
            依赖坐标（按 Spring Boot 版本三选一）及完整配置说明见
          </Translate>{' '}
          <Link to="/docs/guide/basics">
            <Translate id="homepage.quickstart.moreLink">基础必读</Translate>
          </Link>
        </p>
      </div>
    </section>
  );
}

function SkillSection() {
  return (
    <section className={styles.skill}>
      <div className="container">
        <div className={styles.skillCard}>
          <div className={styles.skillText}>
            <h2 className={styles.skillTitle}>
              <Translate id="homepage.skill.title">
                AI 时代：把本站知识装进你的 AI 助手
              </Translate>
            </h2>
            <p className={styles.skillDesc}>
              <Translate id="homepage.skill.desc">
                本仓库提供开放格式的 Agent Skill。安装后，AI
                编程助手在你的项目里可直接回答「为什么数据源切换失败」等常见问题——安装、配置、排障全链路。
              </Translate>
            </p>
            <code className={styles.skillCommand}>{SKILL_COMMAND}</code>
            <div className={styles.skillActions}>
              <Link
                className={styles.btnPrimary}
                href="https://github.com/baomidou/dynamic-datasource/blob/master/skills/dynamic-datasource/SKILL.md">
                <Translate id="homepage.skill.view">查看 SKILL.md</Translate>
              </Link>
              <Link
                className={styles.btnGhost}
                href="https://github.com/baomidou/dynamic-datasource/tree/master/skills">
                <Translate id="homepage.skill.install">安装说明</Translate>
              </Link>
            </div>
          </div>
          <div className={styles.skillBadge}>🤖</div>
        </div>
      </div>
    </section>
  );
}

function BottomCta() {
  return (
    <section className={clsx(styles.section, styles.cta)}>
      <div className="container">
        <h2 className={styles.ctaTitle}>
          <Translate id="homepage.cta.title">遇到问题了？</Translate>
        </h2>
        <p className={styles.sectionDesc}>
          <Translate id="homepage.cta.desc">
            「@DS 不生效」「启动报错」「事务内不切换」等历史高频问题，已整理成排查清单。
          </Translate>
        </p>
        <div className={styles.heroActions}>
          <Link
            className={styles.btnPrimary}
            href="https://github.com/baomidou/dynamic-datasource/wiki">
            <Translate id="homepage.cta.wiki">Wiki FAQ 排查</Translate>
          </Link>
          <Link
            className={styles.btnGhost}
            href="https://github.com/baomidou/dynamic-datasource/issues">
            <Translate id="homepage.cta.issue">提交 Issue</Translate>
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
      <SponsorRails />
      <Hero />
      <DataSourceFlow />
      <main>
        <Features />
        <QuickStart />
        <SkillSection />
        <BottomCta />
      </main>
    </Layout>
  );
}
