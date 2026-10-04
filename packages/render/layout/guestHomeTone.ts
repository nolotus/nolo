import { useEffect, useState } from "react";

// Guest home color story (2026-10-04 redesign): an evening sky at the top,
// warm paper in the middle, warm horizon light at the end. Night variant
// (2026-10-05): deep indigo night sky, warm ink paper, a faint pre-dawn glow.
// The landing paints these bands; the topbar follows the band currently under
// it so it never reads as a separate bar. Single source for both. Flat colors
// (paper etc.) for plain CSS live in naturePalette.css — keep them in sync.

type Stop = readonly [position: number, color: string];

export type GuestHomeTonePalette = {
  sky: readonly Stop[];
  paper: string;
  closing: readonly Stop[];
};

const DAY_PAPER = "#f7f3ec";
const NIGHT_PAPER = "#1c1b20";

export const GUEST_HOME_DAY: GuestHomeTonePalette = {
  sky: [
    [0, "#d3dfeb"],
    [0.48, "#e9e4df"],
    [0.82, "#f1d2b4"],
    [1, "#eebf98"],
  ],
  paper: DAY_PAPER,
  closing: [
    [0, DAY_PAPER],
    [1, "#f3e3d0"],
  ],
};

export const GUEST_HOME_NIGHT: GuestHomeTonePalette = {
  sky: [
    [0, "#0f1626"],
    [0.48, "#1a2238"],
    [0.82, "#2a2536"],
    [1, NIGHT_PAPER],
  ],
  paper: NIGHT_PAPER,
  closing: [
    [0, NIGHT_PAPER],
    [1, "#262338"],
  ],
};

const toGradient = (stops: readonly Stop[]) =>
  `linear-gradient(180deg, ${stops.map(([p, c]) => `${c} ${Math.round(p * 100)}%`).join(", ")})`;

/**
 * Inline custom properties for the landing. Both themes are emitted and CSS
 * picks one by [data-theme], so server HTML is identical for both and the
 * bootstrap script's data-theme decides the first paint (no flash, no
 * hydration mismatch).
 */
export const guestHomeBandVars = (): Record<string, string> => ({
  "--hl-sky-day": toGradient(GUEST_HOME_DAY.sky),
  "--hl-sky-night": toGradient(GUEST_HOME_NIGHT.sky),
  "--hl-closing-day": toGradient(GUEST_HOME_DAY.closing),
  "--hl-closing-night": toGradient(GUEST_HOME_NIGHT.closing),
});

const hexToRgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const sample = (stops: readonly Stop[], t: number): string => {
  const x = Math.min(1, Math.max(0, t));
  for (let i = 1; i < stops.length; i++) {
    const [p1, c1] = stops[i];
    if (x <= p1) {
      const [p0, c0] = stops[i - 1];
      const k = p1 === p0 ? 1 : (x - p0) / (p1 - p0);
      const a = hexToRgb(c0);
      const b = hexToRgb(c1);
      const mix = a.map((v, j) => Math.round(v + (b[j] - v) * k));
      return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
    }
  }
  const [r, g, b] = hexToRgb(stops[stops.length - 1][1]);
  return `rgb(${r}, ${g}, ${b})`;
};

export type GuestHomeBands = {
  heroTop: number;
  heroHeight: number;
  closingTop: number;
  closingHeight: number;
};

/** Color of the landing at content offset `y` (the band right under the topbar). */
export function guestHomeToneAt(
  y: number,
  bands: GuestHomeBands,
  palette: GuestHomeTonePalette = GUEST_HOME_DAY,
): string {
  const { heroTop, heroHeight, closingTop, closingHeight } = bands;
  if (heroHeight > 0 && y < heroTop + heroHeight) {
    return sample(palette.sky, (y - heroTop) / heroHeight);
  }
  if (closingHeight > 0 && y >= closingTop) {
    return sample(palette.closing, (y - closingTop) / closingHeight);
  }
  return sample([[0, palette.paper]], 0);
}

/**
 * Topbar background for the guest home. The page scrolls inside
 * .MainLayout__main (not window), so listen there; rAF-throttled.
 * Undefined until measured: CSS paints var(--hl-sky-top) for the first frame.
 */
export function useGuestHomeTopbarTone(enabled: boolean, isDark: boolean): string | undefined {
  const [tone, setTone] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!enabled) {
      setTone(undefined);
      return;
    }
    const main = document.querySelector<HTMLElement>(".MainLayout__main");
    if (!main) return;
    const palette = isDark ? GUEST_HOME_NIGHT : GUEST_HOME_DAY;
    let frame = 0;
    const offsetIn = (el: HTMLElement | null) =>
      el ? el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop : 0;
    const update = () => {
      frame = 0;
      const hero = main.querySelector<HTMLElement>(".hl-hero");
      const closing = main.querySelector<HTMLElement>(".hl-closing");
      setTone(
        guestHomeToneAt(main.scrollTop, {
          heroTop: offsetIn(hero),
          heroHeight: hero?.offsetHeight ?? 0,
          closingTop: closing ? offsetIn(closing) : Number.POSITIVE_INFINITY,
          closingHeight: closing?.offsetHeight ?? 0,
        }, palette),
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    main.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      main.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [enabled, isDark]);

  return tone;
}
