// 文件路径: render/web/ui/NumberFlip.tsx
//
// Number Flip —— 数值变化时只滚动「发生变化的数位」（参考 Morph UI 的 Number Flip）。
//
// 结构：每个数位 = 一个视口（.nf-col）+ 一条 0-9 纵向轨道（.nf-track）。
// 轨道用 transform + transition 滚到目标数字；未变化的数位 transform 不变，
// 因此天然静止。视口用 clip-path 而不是 overflow: hidden —— overflow 非
// visible 会把盒子基线改成底边，数字无法与周边文字对齐；clip-path 不影响
// 基线计算，而隐藏的 .nf-sizer（一个「0」）负责提供列宽与行盒基线。
//
// 降级：prefers-reduced-motion 时关掉 transition（CSS 媒体查询 + JS 读取
// app/viewTransitions.prefersReducedMotion() 后的 data-reduced-motion 双保险），
// 直接即时跳变。组件是纯展示：不持有数据，一切都来自 props。

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes } from "react";
import { prefersReducedMotion } from "app/viewTransitions";
import "./NumberFlip.css";

/** 轨道内容固定 0-9：SSR 与客户端渲染一致，可直接 hydrate。 */
const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/** 默认滚动时长 / 错峰步长（ms）。 */
const DEFAULT_DURATION_MS = 480;
const DEFAULT_STAGGER_MS = 45;
/** 错峰最多累计到第几位：位数多时不把 delay 尾巴拖太长。 */
const MAX_STAGGER_STEPS = 6;

export interface NumberFlipProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** 目标数值。值的变化由调用方驱动，组件不持有数据。 */
  value: number;
  /**
   * 固定小数位（toFixed 口径）。缺省时按 JS 数字默认字符串渲染，
   * 与现有余额文案（`{{balance}}` / `formatCredits` 之外的原样输出）一致。
   */
  decimals?: number;
  /** 单个数位滚动时长（ms），默认 480。 */
  duration?: number;
  /** 相邻数位错峰步长（ms），0 = 同时滚；默认 45。 */
  stagger?: number;
  /**
   * 传入时改用 Intl.NumberFormat（本地化千分位/小数点）；
   * 缺省走 String / toFixed，SSR 结果与 locale 环境无关。
   */
  locale?: string | string[];
}

export interface FlipToken {
  /** 从右往左的位置（0 = 最右字符）。 */
  index: number;
  /** React key：按位置（而不是字符）定位，位数变化时右侧数位保持同一元素。 */
  key: string;
  char: string;
  /** 0-9 时为对应数字，其余（分隔符 / 负号 / NaN）为 null。 */
  digit: number | null;
}

/** 把数值格式化成待展示字符串（纯函数，供测试与调用方复用）。 */
export const formatNumberForFlip = (
  value: number,
  decimals?: number,
  locale?: string | string[]
): string => {
  // -0 会被 Intl 渲染成 "-0"，先规范化。
  const safeValue = Object.is(value, -0) ? 0 : value;
  const fixedDigits =
    typeof decimals === "number" && Number.isInteger(decimals) && decimals >= 0
      ? Math.min(decimals, 100)
      : undefined;

  if (locale) {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: fixedDigits ?? 0,
      maximumFractionDigits: fixedDigits ?? 3,
    }).format(safeValue);
  }

  return fixedDigits === undefined ? String(safeValue) : safeValue.toFixed(fixedDigits);
};

/**
 * 把格式化字符串切成「数位 / 静态字符」token，key 与 index 都按
 * 「从右往左」的位置编号：9.99 → 12.50 时右侧数位保持同一 React 元素，
 * 只有左侧新增的数位是新元素（可以从上方落入）。
 */
export const tokenizeFormattedNumber = (formatted: string): FlipToken[] => {
  const chars = Array.from(formatted);
  return chars.map((char, position) => {
    const index = chars.length - 1 - position;
    return {
      index,
      key: `nf-${index}`,
      char,
      digit: char >= "0" && char <= "9" ? Number(char) : null,
    };
  });
};

const clampMs = (value: number, fallback: number): number =>
  Number.isFinite(value) ? Math.max(0, value) : fallback;

export function NumberFlip({
  value,
  decimals,
  duration = DEFAULT_DURATION_MS,
  stagger = DEFAULT_STAGGER_MS,
  locale,
  className,
  style,
  ...rest
}: NumberFlipProps) {
  const formatted = formatNumberForFlip(value, decimals, locale);
  const tokens = useMemo(() => tokenizeFormattedNumber(formatted), [formatted]);

  // reduced-motion：SSR 与客户端首帧都渲染 false（结果确定、可 hydrate），
  // 挂载后再读取真实偏好。真正的动画降级由 CSS 媒体查询兜底（含运行中切换
  // 系统偏好的场景），这里的 data-reduced-motion 用于样式与测试断言。
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    setReducedMotion(prefersReducedMotion());
  }, []);

  // 与上一次「内容变化」时的 token 对比：只有真正变化的数位与新增的数位带标记。
  // 用 useMemo 锁在 tokens 变化的那一刻，避免无关 re-render 把标记（以及正在
  // 播放的新增数位动画）清掉。
  const previousTokensRef = useRef<FlipToken[] | null>(null);
  const previousChars = useMemo(() => {
    const map = new Map<string, string>();
    for (const token of previousTokensRef.current ?? []) {
      map.set(token.key, token.char);
    }
    return map;
    // 仅在待展示内容变化时重新快照上一轮 token。
  }, [tokens]);
  useEffect(() => {
    previousTokensRef.current = tokens;
  }, [tokens]);

  const durationMs = clampMs(duration, DEFAULT_DURATION_MS);
  const staggerMs = clampMs(stagger, DEFAULT_STAGGER_MS);
  const hasPrevious = previousChars.size > 0;

  const rootClassName = className ? `nf-root ${className}` : "nf-root";
  const rootStyle = {
    ...style,
    "--nf-duration": `${durationMs}ms`,
  } as CSSProperties;

  return (
    <span
      {...rest}
      className={rootClassName}
      style={rootStyle}
      data-reduced-motion={reducedMotion ? "true" : undefined}
      data-number-flip=""
    >
      {tokens.map((token) => {
        if (token.digit === null) {
          return (
            <span key={token.key} className="nf-static" data-index={token.index}>
              {token.char}
            </span>
          );
        }

        const previousChar = previousChars.get(token.key);
        const isNew = hasPrevious && previousChar === undefined;
        const changed = !isNew && previousChar !== undefined && previousChar !== token.char;

        return (
          <span
            key={token.key}
            className="nf-col"
            data-digit={token.digit}
            data-index={token.index}
            data-changed={changed ? "true" : undefined}
            data-new={isNew ? "true" : undefined}
            style={{
              "--nf-digit": String(token.digit),
              "--nf-delay": `${Math.min(token.index, MAX_STAGGER_STEPS) * staggerMs}ms`,
            } as CSSProperties}
          >
            {/* 隐藏的「0」：只占位——提供列宽与行盒基线（轨道绝对定位，不参与布局）。 */}
            <span className="nf-sizer" aria-hidden="true">
              0
            </span>
            <span className="nf-track" aria-hidden="true">
              {DIGITS.map((digit) => (
                <span key={digit} className="nf-cell">
                  {digit}
                </span>
              ))}
            </span>
          </span>
        );
      })}
      {/* 读屏与复制用：视觉数位已 aria-hidden，这里给出完整数值文本。 */}
      <span className="nf-sr-only">{formatted}</span>
    </span>
  );
}

export default NumberFlip;
