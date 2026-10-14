// 赞助 / 广告位招租 配置
//
// 1) 想让「联系合作」按钮走邮箱，填上 CONTACT.email 即可；留空则回退到 CONTACT.issueUrl。
// 2) 有赞助商入驻后，往 SPONSORS 里加一项（logo 可省略，省略时展示首字母方块）。
// 3) SPONSORS 为空时，组件会展示「广告位招租」的虚位卡片，用于招商。

export const CONTACT = {
  // 商务邮箱：填写后「成为赞助商」按钮变成 mailto 链接
  email: '332309254@qq.com',
  // 兜底入口：邮箱为空时使用（GitHub Issue 模板）
  issueUrl:
    'https://github.com/baomidou/dynamic-datasource/issues/new?title=%5B%E8%B5%9E%E5%8A%A9%5D%20%E5%B9%BF%E5%91%8A%E4%BD%8D%E5%90%88%E4%BD%9C%E5%92%A8%E8%AF%A2',
  // 可选：展示在招租文案里，例如 'wechat: your-wechat'。留空则不展示
  wechat: '',
};

// 「成为赞助商」/ 招租卡片统一的跳转地址：优先邮箱，否则回退到 Issue 入口
export function contactHref() {
  if (CONTACT.email) {
    return `mailto:${CONTACT.email}?subject=${encodeURIComponent(
      'dynamic-datasource 文档赞助合作咨询',
    )}`;
  }
  return CONTACT.issueUrl;
}

export const SPONSORS = [
  // {
  //   name: 'YourProduct',
  //   desc: '一句话介绍你的产品 / 开源项目',
  //   href: 'https://example.com',
  //   logo: '/img/sponsors/yourproduct.svg',
  // },
];
