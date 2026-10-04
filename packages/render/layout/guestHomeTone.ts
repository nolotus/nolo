import { useEffect, useState } from "react";

// Guest home color story (2026-10-04 redesign): an evening sky at the top,
// warm paper in the middle, warm horizon light at the end. The landing paints
// these bands; the topbar follows the band currently under it so it never
// reads as a separate bar. Single source for both.

type Stop = readonly [position: number, color: string];

export const GUEST_HOME_SKY_STOPS: readonly Stop[] = [
  [0, "#d3dfeb"],
  [0.48, "#e9e4df"],
  [0.82, "#f1d2b4"],
  [1, "#eebf98"],
];
export const GUEST_HOME_PAPER = "#f7f3ec";
export const GUEST_HOME_EVENING = "#f3e3d0";

const CLOSING_STOPS: readonly Stop[] = [
  [0, GUEST_HOME_PAPER],
  [1, GUEST_HOME_EVENING],
];

const toGradient = (stops: readonly Stop[]) =>
  `linear-gradient(180deg, ${stops.map(([p, c]) => `${c} ${Math.round(p * 100)}%`).join(", ")})`;

export const guestHomeSkyGradient = () => toGradient(GUEST_HOME_SKY_STOPS);
export const guestHomeClosingGradient = () => toGradient(CLOSING_STOPS);

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
export function guestHomeToneAt(y: number, bands: GuestHomeBands): string {
  const { heroTop, heroHeight, closingTop, closingHeight } = bands;
  if (heroHeight > 0 && y < heroTop + heroHeight) {
    return sample(GUEST_HOME_SKY_STOPS, (y - heroTop) / heroHeight);
  }
  if (closingHeight > 0 && y >= closingTop) {
    return sample(CLOSING_STOPS, (y - closingTop) / closingHeight);
  }
  return sample([[0, GUEST_HOME_PAPER]], 0);
}

/**
 * Topbar background for the guest home. The page scrolls inside
 * .MainLayout__main (not window), so listen there; rAF-throttled.
 */
export function useGuestHomeTopbarTone(enabled: boolean): string | undefined {
  const [tone, setTone] = useState<string | undefined>(
    enabled ? GUEST_HOME_SKY_STOPS[0][1] : undefined,
  );

  useEffect(() => {
    if (!enabled) {
      setTone(undefined);
      return;
    }
    const main = document.querySelector<HTMLElement>(".MainLayout__main");
    if (!main) return;
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
        }),
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
  }, [enabled]);

  return tone;
}
