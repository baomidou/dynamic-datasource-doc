import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';

import {CONTACT, SPONSORS, contactHref} from './sponsors';
import styles from './styles.module.css';

// 没有赞助商时展示的虚位卡片数量
const PLACEHOLDER_COUNT = 3;
// 首屏位置条上预留的广告位数量
const STRIP_SLOT_COUNT = 4;

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
          {CONTACT.email || (
            <Translate id="sponsor.slot.rentDesc">虚位以待，欢迎联系</Translate>
          )}
        </span>
      </span>
    </Link>
  );
}

function ContactMail({className}) {
  if (!CONTACT.email) {
    return null;
  }
  return (
    <a className={className} href={contactHref()}>
      {CONTACT.email}
    </a>
  );
}

/**
 * 完整的赞助合作 / 广告位招租板块（用于文档页底部等宽松位置）。
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
        <div className={styles.actions}>
          <Link className={styles.cta} to="/sponsor">
            <Translate id="sponsor.cta">成为赞助商</Translate>
          </Link>
          {CONTACT.email && (
            <span className={styles.contact}>
              <Translate id="sponsor.contact">联系邮箱</Translate>{' '}
              <ContactMail className={styles.contactMail} />
            </span>
          )}
        </div>
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

/**
 * 首屏位置条：紧贴首页 Hero 展示，无需滚动即可看到。
 */
export function SponsorStrip({className}) {
  const hasSponsors = SPONSORS.length > 0;
  const slots = hasSponsors
    ? []
    : Array.from({length: STRIP_SLOT_COUNT});

  return (
    <div className={clsx(styles.strip, className)}>
      <span className={styles.stripLabel}>
        <Translate id="sponsor.strip.label">赞助商</Translate>
      </span>
      <div className={styles.stripSlots}>
        {SPONSORS.map((sponsor) => (
          <Link
            key={sponsor.name}
            className={styles.stripSlot}
            href={sponsor.href}
            title={sponsor.name}>
            {sponsor.logo ? (
              <img className={styles.stripLogo} src={sponsor.logo} alt={sponsor.name} />
            ) : (
              sponsor.name
            )}
          </Link>
        ))}
        {slots.map((_, index) => (
          <Link key={index} className={styles.stripSlot} href={contactHref()}>
            <Translate id="sponsor.slot.rent">广告位招租</Translate>
          </Link>
        ))}
      </div>
      <span className={styles.stripContact}>
        <Translate id="sponsor.strip.contact">欢迎赞助合作</Translate>
        <ContactMail className={styles.stripMail} />
      </span>
    </div>
  );
}

/**
 * 紧凑招租卡：挂在文档页右侧 TOC 下方，阅读过程中即可看到。
 */
export function SponsorTocSlot({className}) {
  return (
    <aside className={clsx(styles.tocSlot, className)}>
      <span className={styles.tocBadge}>Sponsors</span>
      <span className={styles.tocTitle}>
        <Translate id="sponsor.slot.rent">广告位招租</Translate>
      </span>
      <span className={styles.tocDesc}>
        <Translate id="sponsor.toc.desc">
          面向 Spring Boot 开发者，欢迎赞助合作
        </Translate>
      </span>
      <ContactMail className={styles.tocMail} />
    </aside>
  );
}
