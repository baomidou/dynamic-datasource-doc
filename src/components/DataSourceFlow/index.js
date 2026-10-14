import {useEffect, useId, useState} from 'react';
import clsx from 'clsx';
import Translate, {translate} from '@docusaurus/Translate';

import styles from './styles.module.css';

/* 一轮「请求 → 路由 → 响应」的时长，需与下面的 keyTimes 保持一致 */
const CYCLE_MS = 2400;

/* ---------------- 画布几何（viewBox: 0 0 960 460） ---------------- */
const VIEW = {w: 960, h: 460};
const CENTER_Y = 230;
const CLIENT = {x: 20, y: 178, w: 172, h: 104};
const HUB = {cx: 430, cy: CENTER_Y, r: 66};
const NODE = {x: 760, w: 180, h: 62};
const NODE_TOP = 86;
const NODE_GAP = 96;
const PILL = {cx: (CLIENT.x + CLIENT.w + HUB.cx - HUB.r) / 2, cy: CENTER_Y - 22, w: 140, h: 26};

const nodeCenterY = (index) => NODE_TOP + index * NODE_GAP;

/* 路由中枢 → 数据源：S 形贝塞尔曲线 */
const routePath = (cy) =>
  `M ${HUB.cx + HUB.r} ${CENTER_Y} C ${HUB.cx + HUB.r + 118} ${CENTER_Y}, ${
    NODE.x - 118
  } ${cy}, ${NODE.x} ${cy}`;

/* 应用 → 路由中枢：入口连接 */
const INTAKE_PATH = `M ${CLIENT.x + CLIENT.w} ${CENTER_Y} L ${HUB.cx - HUB.r} ${CENTER_Y}`;

/**
 * 循环演示的四个数据源。
 * cls 用于给当前命中的数据源注入专属主色（--flow / --glow）。
 */
const TARGETS = [
  {
    id: 'master',
    cls: 'tMaster',
    name: 'master',
    roleId: 'homepage.flow.role.master',
    role: 'MySQL · 主库',
    dsKey: 'master',
    noteId: 'homepage.flow.note.master',
    note: '写请求直连主库',
    cost: '8 ms',
  },
  {
    id: 'slave_1',
    cls: 'tSlave1',
    name: 'slave_1',
    roleId: 'homepage.flow.role.slave',
    role: 'MySQL · 从库',
    dsKey: 'slave',
    noteId: 'homepage.flow.note.slave',
    note: 'slave 组内负载均衡',
    cost: '5 ms',
  },
  {
    id: 'slave_2',
    cls: 'tSlave2',
    name: 'slave_2',
    roleId: 'homepage.flow.role.slave',
    role: 'MySQL · 从库',
    dsKey: 'slave',
    noteId: 'homepage.flow.note.slave',
    note: 'slave 组内负载均衡',
    cost: '6 ms',
  },
  {
    id: 'oracle_1',
    cls: 'tOracle',
    name: 'oracle_1',
    roleId: 'homepage.flow.role.oracle',
    role: 'Oracle · 异构库',
    dsKey: 'oracle',
    noteId: 'homepage.flow.note.oracle',
    note: '异构数据源按注解精确路由',
    cost: '12 ms',
  },
];

function Node({target, index, active}) {
  const cy = nodeCenterY(index);
  const role = translate({id: target.roleId, message: target.role});

  return (
    <g
      className={clsx(styles.node, styles[target.cls], active && styles.nodeActive)}
      aria-hidden="true">
      <rect
        className={styles.nodeBox}
        x={NODE.x}
        y={cy - NODE.h / 2}
        width={NODE.w}
        height={NODE.h}
        rx={12}
      />
      {/* 数据库圆柱图标 */}
      <g className={styles.dbIcon}>
        <ellipse cx={786} cy={cy - 9} rx={12} ry={4.5} />
        <path d={`M 774 ${cy - 9} V ${cy + 9} M 798 ${cy - 9} V ${cy + 9}`} />
        <ellipse cx={786} cy={cy + 9} rx={12} ry={4.5} />
      </g>
      <text className={styles.nodeName} x={812} y={cy - 3}>
        {target.name}
      </text>
      <text className={styles.nodeRole} x={812} y={cy + 17}>
        {role}
      </text>
      {active && (
        <g className={styles.nodeBadge}>
          <rect x={NODE.x + NODE.w - 40} y={cy - 35} width={40} height={17} rx={8.5} />
          <text x={NODE.x + NODE.w - 20} y={cy - 22.5} textAnchor="middle">
            {translate({id: 'homepage.flow.hit', message: '命中'})}
          </text>
        </g>
      )}
    </g>
  );
}

/**
 * 首页动态示意图：一个连接进来，@DS 解析目标库/组，路由到对应数据源并返回结果。
 * 每 2.4s 轮换一次命中目标，直观展示「多数据源切换」。
 */
export default function DataSourceFlow() {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  /* 尊重系统的「减少动态效果」偏好 */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  /* 轮换命中的数据源 */
  useEffect(() => {
    if (reduced || paused) {
      return undefined;
    }
    const timer = window.setInterval(
      () => setIndex((prev) => (prev + 1) % TARGETS.length),
      CYCLE_MS,
    );
    return () => window.clearInterval(timer);
  }, [reduced, paused]);

  const active = TARGETS[index];
  const activePath = routePath(nodeCenterY(index));
  const label = translate({
    id: 'homepage.flow.figureLabel',
    message: 'dynamic-datasource 请求路由示意',
  });

  return (
    <section className={styles.flow} id="routing-flow">
      <div className="container">
        <h2 className={styles.title}>
          <Translate id="homepage.flow.title">
            一次请求，如何落到正确的库？
          </Translate>
        </h2>
        <p className={styles.desc}>
          <Translate id="homepage.flow.desc">
            连接进入后，@DS 解析出目标库或组名，动态路由把语句交给对应的数据源执行，再把结果原路返回
            —— 业务代码里看不到任何路由逻辑。
          </Translate>
        </p>

        <figure className={styles.figure}>
          <span className={styles.badge}>
            <Translate id="homepage.flow.badge">实时路由示意</Translate>
          </span>

          <div
            className={styles.canvas}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            title={translate({
              id: 'homepage.flow.pauseHint',
              message: '悬停可暂停轮播',
            })}>
            <svg
              className={styles.svg}
              viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
              role="img"
              aria-label={label}>
              <title>{label}</title>
              <defs>
                <pattern
                  id={`${uid}-grid`}
                  width="24"
                  height="24"
                  patternUnits="userSpaceOnUse">
                  <circle className={styles.gridDot} cx="1.5" cy="1.5" r="1" />
                </pattern>
                <linearGradient id={`${uid}-hub`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0.06" />
                </linearGradient>
              </defs>

              <rect
                className={styles.grid}
                x="0"
                y="0"
                width={VIEW.w}
                height={VIEW.h}
                fill={`url(#${uid}-grid)`}
              />

              {/* 中枢脉冲与旋转轨道 */}
              <g className={styles.hubDeco}>
                <circle className={styles.hubRing} cx={HUB.cx} cy={HUB.cy} r={80} />
                <circle className={styles.hubPulse} cx={HUB.cx} cy={HUB.cy} r={HUB.r} />
              </g>

              {/* 所有数据源的常驻连线（待命态） */}
              {TARGETS.map((target, i) => (
                <path
                  key={target.id}
                  className={styles.linkBase}
                  d={routePath(nodeCenterY(i))}
                />
              ))}

              {/* 入口连接：持续有请求流入 */}
              <path className={styles.linkIntake} d={INTAKE_PATH} />
              <path className={styles.intakeFlow} d={INTAKE_PATH} />

              {/* 当前命中的路由：按 index 重新挂载，动画从中枢重新出发 */}
              <g
                key={`route-${active.id}`}
                className={clsx(styles.route, styles[active.cls])}>
                <path className={styles.linkActive} d={activePath} />
                <path className={styles.linkFlow} d={activePath} />
                {!reduced && (
                  <>
                    <circle className={styles.dotOut} r={5.5}>
                      <animateMotion
                        dur={`${CYCLE_MS}ms`}
                        repeatCount="indefinite"
                        calcMode="linear"
                        path={activePath}
                        keyPoints="0;1;1"
                        keyTimes="0;0.36;1"
                      />
                      <animate
                        attributeName="opacity"
                        dur={`${CYCLE_MS}ms`}
                        repeatCount="indefinite"
                        values="1;1;0;0"
                        keyTimes="0;0.36;0.44;1"
                      />
                    </circle>
                    <circle className={styles.dotBack} r={5.5}>
                      <animateMotion
                        dur={`${CYCLE_MS}ms`}
                        repeatCount="indefinite"
                        calcMode="linear"
                        path={activePath}
                        keyPoints="1;1;0;0"
                        keyTimes="0;0.46;0.84;1"
                      />
                      <animate
                        attributeName="opacity"
                        dur={`${CYCLE_MS}ms`}
                        repeatCount="indefinite"
                        values="0;1;1;0"
                        keyTimes="0;0.46;0.84;1"
                      />
                    </circle>
                  </>
                )}
              </g>

              {!reduced && (
                <>
                  <circle className={styles.dotIntake} r={4.5}>
                    <animateMotion
                      dur="1.2s"
                      repeatCount="indefinite"
                      path={INTAKE_PATH}
                    />
                  </circle>
                  <circle className={styles.dotIntake} r={4.5}>
                    <animateMotion
                      dur="1.2s"
                      begin="-0.6s"
                      repeatCount="indefinite"
                      path={INTAKE_PATH}
                    />
                  </circle>
                </>
              )}

              {/* 应用（业务侧） */}
              <rect
                className={styles.clientBox}
                x={CLIENT.x}
                y={CLIENT.y}
                width={CLIENT.w}
                height={CLIENT.h}
                rx={14}
              />
              <text
                className={styles.clientTitle}
                x={CLIENT.x + CLIENT.w / 2}
                y={CENTER_Y - 4}
                textAnchor="middle">
                {translate({
                  id: 'homepage.flow.client.title',
                  message: 'Spring Boot 应用',
                })}
              </text>
              <text
                className={styles.clientSub}
                x={CLIENT.x + CLIENT.w / 2}
                y={CENTER_Y + 18}
                textAnchor="middle">
                {translate({
                  id: 'homepage.flow.client.sub',
                  message: 'Service 方法',
                })}
              </text>

              {/* 动态路由中枢 */}
              <circle
                className={styles.hubBox}
                cx={HUB.cx}
                cy={HUB.cy}
                r={HUB.r}
                fill={`url(#${uid}-hub)`}
              />
              <text
                className={styles.hubTitle}
                x={HUB.cx}
                y={CENTER_Y - 2}
                textAnchor="middle">
                {translate({
                  id: 'homepage.flow.hub.title',
                  message: '动态路由',
                })}
              </text>
              <text
                className={styles.hubSub}
                x={HUB.cx}
                y={CENTER_Y + 16}
                textAnchor="middle">
                RoutingDataSource
              </text>

              {/* 请求携带的注解 */}
              <g
                className={clsx(styles.pill, styles[active.cls])}
                transform={`translate(${PILL.cx} ${PILL.cy})`}>
                <rect
                  className={styles.pillBg}
                  x={-PILL.w / 2}
                  y={-PILL.h / 2}
                  width={PILL.w}
                  height={PILL.h}
                  rx={PILL.h / 2}
                />
                <text className={styles.pillText} x={0} y={4} textAnchor="middle">
                  {`@DS("${active.dsKey}")`}
                </text>
              </g>

              {/* 四个数据源 */}
              {TARGETS.map((target, i) => (
                <Node
                  key={target.id}
                  target={target}
                  index={i}
                  active={i === index}
                />
              ))}
            </svg>
          </div>

          <div className={styles.footer}>
            <div className={styles.status} key={active.id}>
              <code className={styles.statusKey}>{`@DS("${active.dsKey}")`}</code>
              <span className={styles.statusArrow} aria-hidden="true">
                →
              </span>
              <strong className={styles.statusTarget}>{active.name}</strong>
              <span className={styles.statusNote}>
                <Translate id={active.noteId}>{active.note}</Translate>
              </span>
              <span className={styles.statusCost}>{active.cost}</span>
            </div>

            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <i className={clsx(styles.legendDot, styles.legendDotOut)} />
                <Translate id="homepage.flow.legend.request">请求</Translate>
              </span>
              <span className={styles.legendItem}>
                <i className={clsx(styles.legendDot, styles.legendDotBack)} />
                <Translate id="homepage.flow.legend.response">响应</Translate>
              </span>
              <span className={styles.legendItem}>
                <i className={styles.legendDash} />
                <Translate id="homepage.flow.legend.idle">待命数据源</Translate>
              </span>
              <span className={clsx(styles.legendItem, styles.scrollHint)}>
                <Translate id="homepage.flow.scrollHint">
                  ← 左右滑动查看完整拓扑 →
                </Translate>
              </span>
            </div>
          </div>
        </figure>
      </div>
    </section>
  );
}
