import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';

import styles from './styles.module.css';

// 覆盖主题默认实现：默认实现直接注入 themeConfig.announcementBar.content，
// 不支持按语言切换，这里改用 Translate，便于中英站点各自展示。
export default function AnnouncementBarContent(props) {
  return (
    <div {...props} className={clsx(styles.content, props.className)}>
      <span className={styles.text}>
        <Translate id="announce.sponsor">
          📣 本站文档提供广告位，欢迎赞助合作
        </Translate>
      </span>
      <Link className={styles.link} to="/sponsor">
        <Translate id="announce.sponsor.link">了解详情</Translate>
      </Link>
    </div>
  );
}
