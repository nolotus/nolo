import * as stylex from "@stylexjs/stylex";
import React, { memo, useMemo } from "react";
import { orbActivityIndicatorStyles as styles } from "./orbActivityIndicatorStyles";

/**
 * OrbActivityIndicator —— 代理活动指示器（Orbs）
 *
 * 设计手法学自 AICSS (aicss.dev) Orbs 组件（MIT）：
 * - Lattice：3×3 点阵，S1 中心扩散波 / S3 周长顺时针彗星
 * - Ring：8 点圆环，C1 追逐 / C3 单点彗星流
 * - 每点用「负动画延时播种」形成相位差（一条关键帧 → 多种效果）
 * - 几何在 28px 舞台创作，glyph 占位盒跟随 size（内联 width/height），
 *   内部用 --orbK 按 size/28 缩放，任意尺寸下几何居中于占位盒
 * - prefers-reduced-motion 时动画关闭，落为静态中心点亮
 *
 * 与 StreamingPendingIndicator（三点脉冲）同族，但更细腻：
 * 适用于 thinking / working / loading 等不同语义，且可缩放。
 */
export type OrbVariant = "s1-thinking" | "s3-working" | "c1-loading" | "c3-streaming";
// 注：当前已接线 s1-thinking（ThinkingSection/AssistantReplyPending）；
// s3-working / c1-loading / c3-streaming 为 AICSS 手法移植的预留 API，尚未接线。

const STAGE = 28; // 几何创作舞台（px），与样式文件一致
const DEFAULT_SIZE = 20; // 默认渲染尺寸

/* ---- Lattice 几何 ---- */
const N = 3; // 3×3
const PITCH = 6; // 点中心间距（舞台 px）
const MID = (N - 1) / 2;

/** S1：中心向外圆形波前（圆心点领先一拍） */
function s1WaveDelays(grid: { x: number; y: number }[]): number[] {
  return grid.map(({ x, y }) => {
    const dx = x - MID;
    const dy = y - MID;
    // 圆心点提前 180ms 起跳，避免下一个波前被外圈淡出挡住
    const rad = Math.hypot(dx, dy);
    return rad * 700 - (dx === 0 && dy === 0 ? 180 : 0);
  });
}

const RING_PATH: [number, number][] = (() => {
  const ring: [number, number][] = [];
  for (let x = 0; x < N; x++) ring.push([x, 0]);
  for (let y = 1; y < N; y++) ring.push([N - 1, y]);
  for (let x = N - 2; x >= 0; x--) ring.push([x, N - 1]);
  for (let y = N - 2; y >= 1; y--) ring.push([0, y]);
  return ring;
})();

const RING_INDEX = new Map(RING_PATH.map(([x, y], i) => [`${x},${y}`, i]));

/** S3：周长顺时针彗星（负延时播种 = 一条动画扫过 8 格） */
function s3CometDelays(grid: { x: number; y: number }[]): (number | null)[] {
  return grid.map(({ x, y }) => {
    if (x === MID && y === MID) return null; // 中心格静止
    const i = RING_INDEX.get(`${x},${y}`);
    if (i === undefined) return null;
    return -(((RING_PATH.length - i) % RING_PATH.length) / RING_PATH.length) * 1700;
  });
}

const latticeGrid = (() => {
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) cells.push({ x, y });
  return cells;
})();

/* ---- Ring 几何 ---- */
const RING_R = 8; // 轨道半径（舞台 px）
const RING_N = 8;

function ringDots(variant: "c1-loading" | "c3-streaming") {
  const dots: { rx: number; ry: number; delay: number }[] = [];
  const duration = variant === "c1-loading" ? 1600 : 1800;
  for (let i = 0; i < RING_N; i++) {
    const angle = (i / RING_N) * Math.PI * 2 - Math.PI / 2;
    dots.push({
      rx: Math.cos(angle) * RING_R,
      ry: Math.sin(angle) * RING_R,
      delay: -(i / RING_N) * duration,
    });
  }
  return dots;
}

interface OrbActivityIndicatorProps {
  /** 语义变体 */
  variant?: OrbVariant;
  /** 渲染尺寸（px，等比缩放 20px 基准） */
  size?: number;
  className?: string;
}

export const OrbActivityIndicator = memo(function OrbActivityIndicator({
  variant = "s1-thinking",
  size = DEFAULT_SIZE,
  className,
}: OrbActivityIndicatorProps) {
  // 缩放基准统一用 28px 创作舞台：glyph 占位盒跟随 size（内联 width/height），
  // 内部几何按 k = size/28 缩放，任意 size 下点阵/圆环都居中于占位盒。
  const k = size / STAGE;

  const latticeCells = useMemo(() => {
    if (variant === "s1-thinking") {
      const delays = s1WaveDelays(latticeGrid);
      return latticeGrid.map(({ x, y }, i) => ({
        key: `${x},${y}`,
        left: x * PITCH,
        top: y * PITCH,
        delay: delays[i],
        still: false,
      }));
    }
    if (variant === "s3-working") {
      const delays = s3CometDelays(latticeGrid);
      return latticeGrid.map(({ x, y }, i) => ({
        key: `${x},${y}`,
        left: x * PITCH,
        top: y * PITCH,
        delay: delays[i] ?? 0,
        still: delays[i] === null,
      }));
    }
    return [];
  }, [variant]);

  const ringCells = useMemo(() => {
    if (variant === "c1-loading" || variant === "c3-streaming") {
      return ringDots(variant).map((d, i) => ({
        key: i,
        rx: d.rx,
        ry: d.ry,
        delay: d.delay,
      }));
    }
    return [];
  }, [variant]);

  return (
    <span
      className={`orb-activity-indicator${className ? ` ${className}` : ""}`}
      aria-hidden="true"
      {...stylex.props(styles.root)}
    >
      <span
        className="orb-activity-indicator__glyph"
        style={{ width: size, height: size }}
        {...stylex.props(styles.glyph)}
      >
        {latticeCells.length > 0 && (
          <span
            className="orb-activity-indicator__lattice"
            style={{ ["--orbK" as string]: k }}
            {...stylex.props(styles.lattice)}
          >
            {latticeCells.map((c) => (
              <span
                key={c.key}
                className="orb-activity-indicator__cell"
                style={
                  c.still
                    ? { left: c.left, top: c.top }
                    : { left: c.left, top: c.top, animationDelay: `${c.delay}ms` }
                }
                {...stylex.props(
                  styles.cell,
                  c.still
                    ? styles.cellStill
                    : variant === "s1-thinking"
                      ? styles.cellWave
                      : styles.cellComet
                )}
              />
            ))}
          </span>
        )}
        {ringCells.length > 0 && (
          <span
            className="orb-activity-indicator__ring"
            style={{ ["--orbK" as string]: k }}
            {...stylex.props(styles.ring)}
          >
            {ringCells.map((c) => (
              <span
                key={c.key}
                className="orb-activity-indicator__ring-dot"
                style={{
                  transform: `translate(${c.rx}px, ${c.ry}px)`,
                  animationDelay: `${c.delay}ms`,
                }}
                {...stylex.props(
                  styles.ringDot,
                  variant === "c1-loading" ? styles.ringDotChase : styles.ringDotComet
                )}
              />
            ))}
          </span>
        )}
      </span>
    </span>
  );
});

export default OrbActivityIndicator;
