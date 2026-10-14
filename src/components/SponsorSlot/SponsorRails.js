import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';

import {CONTACT, contactHref} from './sponsors';
import styles from './styles.module.css';

function RailCard() {
  return (
    <Link className={styles.railCard} href={contactHref()}>
      <span className={styles.railBadge}>Sponsors</span>
      <span className={styles.railSlot}>＋</span>
      <span className={styles.railTitle}>
        <Translate id="sponsor.slot.rent">广告位招租</Translate>
      </span>
      <span className={styles.railDesc}>
        <Translate id="sponsor.rail.desc">
          面向 Spring Boot / 多数据源开发者
        </Translate>
      </span>
      {CONTACT.email && (
        <span className={styles.railMail}>{CONTACT.email}</span>
      )}
    </Link>
  );
}

/**
 * 首页左右两侧的固定招租位。
 * 仅在宽屏（>=1600px，此时正文容器左右留白足够）显示，随视口固定，无需滚动即可看到。
 */
export default function SponsorRails() {
  return (
    <>
      <aside
        className={clsx(styles.rail, styles.railLeft)}
        aria-label="广告位招租">
        <RailCard />
      </aside>
      <aside
        className={clsx(styles.rail, styles.railRight)}
        aria-label="广告位招租">
        <RailCard />
      </aside>
    </>
  );
}
