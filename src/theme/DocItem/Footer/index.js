import React from 'react';
import Footer from '@theme-original/DocItem/Footer';

import SponsorSlot from '../../../components/SponsorSlot';

// 在每篇文档底部追加「赞助合作 · 广告位招租」板块
export default function DocItemFooterWrapper(props) {
  return (
    <>
      <Footer {...props} />
      <SponsorSlot className="margin-top--lg" />
    </>
  );
}
