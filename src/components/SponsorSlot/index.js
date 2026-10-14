import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';

import {CONTACT, SPONSORS} from './sponsors';
import styles from './styles.module.css';

// 没有赞助商时展示的虚位卡片数量
const PLACEHOLDER_COUNT = 3;

function contactHref() {
  if (CONTACT.email) {
    return `mailto:${CONTACT.email}?subject=${encodeURIComponent(
      'dynamic-datasource 文档赞助合作咨询',
    )}`;
  }
  return CONTACT.issueUrl;
}

function SponsorCard({sponsor}) {
  return (
    <Link className={styles.card} href={sponsor.href}>
      {sponsor.logo ? (
        <img className={styles.logo} src={sponsor.logo} alt={sponsor.name} />
      ) : (
        <span className={styles.logoFallback}>{sponsor.name.slice(0, 1)}</span>
      )}
      <span className={styles.cardBody}>
        <span className={styles.cardName}>{sponsor.name}</span>
        {sponsor.desc && <span className={styles.cardDesc}>{sponsor.desc}</span>}
      </span>
    </Link>
  );
}

function PlaceholderCard() {
  return (
    <Link
      className={clsx(styles.card, styles.placeholder)}
      href={contactHref()}>
      <span className={styles.logoFallback}>＋</span>
      <span className={styles.cardBody}>
        <span className={styles.cardName}>
          <Translate id="sponsor.slot.rent">广告位招租</Translate>
        </span>
        <span className={styles.cardDesc}>
          <Translate id="sponsor.slot.rentDesc">虚位以待，欢迎联系</Translate>
        </span>
      </span>
    </Link>
  );
}

/**
 * 赞助合作 / 广告位招租板块。
 * 可放在文档页底部或首页区块中，内容由 sponsors.js 驱动。
 */
export default function SponsorSlot({className}) {
  const placeholders = SPONSORS.length
    ? []
    : Array.from({length: PLACEHOLDER_COUNT});

  return (
    <aside className={clsx(styles.slot, className)}>
      <div className={styles.header}>
        <span className={styles.badge}>Sponsors</span>
        <div className={styles.headerText}>
          <h3 className={styles.title}>
            <Translate id="sponsor.title">赞助合作 · 广告位招租</Translate>
          </h3>
          <p className={styles.subtitle}>
            <Translate id="sponsor.subtitle">
              本站面向 Spring Boot / 多数据源开发者。欢迎在这里展示你的产品、开源项目或招聘信息。
            </Translate>
            {CONTACT.wechat && (
              <span className={styles.wechat}>{CONTACT.wechat}</span>
            )}
          </p>
        </div>
        <Link className={styles.cta} href={contactHref()}>
          <Translate id="sponsor.cta">成为赞助商</Translate>
        </Link>
      </div>
      <div className={styles.grid}>
        {SPONSORS.map((sponsor) => (
          <SponsorCard key={sponsor.name} sponsor={sponsor} />
        ))}
        {placeholders.map((_, index) => (
          <PlaceholderCard key={index} />
        ))}
      </div>
    </aside>
  );
}
