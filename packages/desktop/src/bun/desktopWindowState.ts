import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type DesktopWindowFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DesktopWorkArea = DesktopWindowFrame;

export type PersistedDesktopWindowState = {
  frame: DesktopWindowFrame;
};

export const DESKTOP_WINDOW_STATE_FILE = "window-state.json";

export const isValidWindowFrame = (frame?: unknown): frame is DesktopWindowFrame => {
  if (!frame || typeof frame !== "object") return false;
  const { x, y, width, height } = frame as Record<string, unknown>;
  return (
    typeof x === "number" && Number.isFinite(x) &&
    typeof y === "number" && Number.isFinite(y) &&
    typeof width === "number" && Number.isFinite(width) && width >= 640 &&
    typeof height === "number" && Number.isFinite(height) && height >= 480
  );
};

export const readPersistedWindowState = (
  channelDir: string
): PersistedDesktopWindowState | null => {
  try {
    const statePath = join(channelDir, DESKTOP_WINDOW_STATE_FILE);
    if (!existsSync(statePath)) return null;
    const raw = JSON.parse(readFileSync(statePath, "utf8")) as unknown;
    if (!raw || typeof raw !== "object") return null;
    const { frame } = raw as Record<string, unknown>;
    return isValidWindowFrame(frame) ? { frame } : null;
  } catch (error) {
    console.warn("[desktop] failed to read persisted window state", error);
    return null;
  }
};

export const savePersistedWindowState = (
  channelDir: string,
  frame?: DesktopWindowFrame
) => {
  if (!isValidWindowFrame(frame)) return;
  try {
    mkdirSync(channelDir, { recursive: true });
    writeFileSync(
      join(channelDir, DESKTOP_WINDOW_STATE_FILE),
      JSON.stringify({ frame }, null, 2),
      "utf8"
    );
  } catch (error) {
    console.warn("[desktop] failed to save window state", error);
  }
};

export const computeDefaultCenteredFrame = (
  workArea?: DesktopWorkArea
): DesktopWindowFrame => {
  if (!isValidWindowFrame(workArea)) {
    return { width: 1680, height: 1020, x: 120, y: 60 };
  }

  const targetWidth = Math.min(
    Math.max(640, Math.round(workArea.width * 0.85)),
    workArea.width
  );
  const targetHeight = Math.min(
    Math.max(480, Math.round(workArea.height * 0.85)),
    workArea.height
  );
  return {
    width: targetWidth,
    height: targetHeight,
    x: workArea.x + Math.max(0, Math.floor((workArea.width - targetWidth) / 2)),
    y: workArea.y + Math.max(0, Math.floor((workArea.height - targetHeight) / 2)),
  };
};

const frameIsVisible = (
  frame: DesktopWindowFrame,
  workAreas: DesktopWorkArea[]
): boolean => workAreas.some((area) => {
  if (!isValidWindowFrame(area)) return false;
  const overlapWidth = Math.min(frame.x + frame.width, area.x + area.width) -
    Math.max(frame.x, area.x);
  const overlapHeight = Math.min(frame.y + frame.height, area.y + area.height) -
    Math.max(frame.y, area.y);
  return overlapWidth >= 80 && overlapHeight >= 80;
});

export const resolveInitialWindowFrame = ({
  channelDir,
  screen,
}: {
  channelDir: string;
  screen?: {
    getPrimaryDisplay?: () => { workArea?: DesktopWorkArea };
    getAllDisplays?: () => Array<{ workArea?: DesktopWorkArea }>;
  };
}): DesktopWindowFrame => {
  let workAreas: DesktopWorkArea[] = [];
  let primaryWorkArea: DesktopWorkArea | undefined;
  try {
    primaryWorkArea = screen?.getPrimaryDisplay?.()?.workArea;
    workAreas = (screen?.getAllDisplays?.() ?? [])
      .map((display) => display.workArea)
      .filter(isValidWindowFrame);
    if (isValidWindowFrame(primaryWorkArea) && workAreas.length === 0) {
      workAreas = [primaryWorkArea];
    }
  } catch (error) {
    console.warn("[desktop] failed to query display work areas", error);
  }

  const persisted = readPersistedWindowState(channelDir);
  if (
    persisted &&
    (workAreas.length === 0 || frameIsVisible(persisted.frame, workAreas))
  ) {
    console.log(
      `[desktop] restoring window state: ${persisted.frame.width}x${persisted.frame.height} at ${persisted.frame.x},${persisted.frame.y}`
    );
    return persisted.frame;
  }

  const computed = computeDefaultCenteredFrame(primaryWorkArea);
  console.log(
    `[desktop] computed default centered frame ${computed.width}x${computed.height} at ${computed.x},${computed.y}`
  );
  return computed;
};
