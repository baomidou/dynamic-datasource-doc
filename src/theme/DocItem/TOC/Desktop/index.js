import React from 'react';
import TOCDesktop from '@theme-original/DocItem/TOC/Desktop';

import {SponsorTocSlot} from '../../../../components/SponsorSlot';

// 在文档页右侧 TOC 下方追加一个紧凑的招租卡
export default function DocItemTOCDesktopWrapper(props) {
  return (
    <>
      <TOCDesktop {...props} />
      <SponsorTocSlot />
    </>
  );
}
