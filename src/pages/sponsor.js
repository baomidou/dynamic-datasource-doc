import clsx from 'clsx';
import Layout from '@theme/Layout';
import Translate from '@docusaurus/Translate';

import {CONTACT, contactHref} from '../components/SponsorSlot/sponsors';
import styles from './sponsor.module.css';

// 站内可用的广告位清单
const SLOTS = [
  {
    id: 'announce',
    tagId: 'sponsor.page.tag.site',
    tag: '全站',
    nameId: 'sponsor.page.slot.announce.name',
    name: '顶部公告条',
    descId: 'sponsor.page.slot.announce.desc',
    desc: '所有页面顶部常驻，适合一句话品牌曝光或活动推广。',
  },
  {
    id: 'hero',
    tagId: 'sponsor.page.tag.home',
    tag: '首页',
    nameId: 'sponsor.page.slot.hero.name',
    name: '首屏位置条',
    descId: 'sponsor.page.slot.hero.desc',
    desc: '紧贴首页上半屏，打开首页即可看到，无需滚动。',
  },
  {
    id: 'rail',
    tagId: 'sponsor.page.tag.home',
    tag: '首页',
    nameId: 'sponsor.page.slot.rail.name',
    name: '左右侧栏（固定悬浮）',
    descId: 'sponsor.page.slot.rail.desc',
    desc: '宽屏下固定在正文两侧，随页面滚动始终可见。',
  },
  {
    id: 'toc',
    tagId: 'sponsor.page.tag.docs',
    tag: '文档页',
    nameId: 'sponsor.page.slot.toc.name',
    name: '右侧目录下方',
    descId: 'sponsor.page.slot.toc.desc',
    desc: '开发者在文档页阅读时可见，停留时间长。',
  },
  {
    id: 'docFooter',
    tagId: 'sponsor.page.tag.docs',
    tag: '文档页',
    nameId: 'sponsor.page.slot.footer.name',
    name: '正文底部横幅',
    descId: 'sponsor.page.slot.footer.desc',
    desc: '读完正文之后的高意图位置，可放产品卡片或招聘信息。',
  },
];

function SlotCard({slot}) {
  return (
    <div className={styles.slotCard}>
      <span className={styles.slotTag}>
        <Translate id={slot.tagId}>{slot.tag}</Translate>
      </span>
      <h3 className={styles.slotName}>
        <Translate id={slot.nameId}>{slot.name}</Translate>
      </h3>
      <p className={styles.slotDesc}>
        <Translate id={slot.descId}>{slot.desc}</Translate>
      </p>
    </div>
  );
}

export default function SponsorPage() {
  return (
    <Layout
      title="赞助合作 · dynamic-datasource"
      description="dynamic-datasource 文档站广告位招租：面向 Java / Spring Boot 后端开发者，欢迎赞助合作。">
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.kicker}>
            <Translate id="sponsor.page.kicker">Sponsors</Translate>
          </p>
          <h1 className={styles.title}>
            <Translate id="sponsor.page.title">赞助合作 · 广告位招租</Translate>
          </h1>
          <p className={styles.lead}>
            <Translate id="sponsor.page.lead">
              本站是 dynamic-datasource 官方文档，读者以 Java / Spring Boot
              后端开发者为主。欢迎在这里展示你的产品、开源项目或招聘信息。
            </Translate>
          </p>
        </div>
      </header>

      <main className="container">
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Translate id="sponsor.page.slotsTitle">可投放位置</Translate>
          </h2>
          <div className={styles.slotGrid}>
            {SLOTS.map((slot) => (
              <SlotCard key={slot.id} slot={slot} />
            ))}
          </div>
        </section>

        <section className={clsx(styles.section, styles.contactSection)}>
          <div className={styles.contactCard}>
            <h2 className={styles.sectionTitle}>
              <Translate id="sponsor.page.contactTitle">联系合作</Translate>
            </h2>
            <p className={styles.contactDesc}>
              <Translate id="sponsor.page.contactDesc">
                位置、形式、周期都可以按需定制，也可以在赞助位上放产品卡片、招聘信息或开源项目介绍。直接邮件联系即可。
              </Translate>
            </p>
            {CONTACT.email && (
              <a className={styles.mail} href={contactHref()}>
                {CONTACT.email}
              </a>
            )}
            <p className={styles.note}>
              <Translate id="sponsor.page.note">
                邮件请简单说明：想投放的产品 / 期望的位置 / 预算。会尽快回复。
              </Translate>
            </p>
          </div>
        </section>
      </main>
    </Layout>
  );
}
