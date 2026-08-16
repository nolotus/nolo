import { closeSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { isRecord } from "core/isRecord";

/**
 * Exit code when a second desktop launch detects a live peer instance.
 *
 * Policy: exit **0** (success / intentional no-op), not 1.
 * Launchers and OS "open" handlers should not treat a duplicate launch as a crash.
 * The first instance keeps the port and UI; the second only logs and exits.
 */
export const DESKTOP_SECOND_INSTANCE_EXIT_CODE = 0 as const;

export type DesktopInstanceLockReason =
  | "acquired"
  | "live-instance"
  | "acquire-race";

export type DesktopInstanceLock = {
  acquired: boolean;
  lockPath: string;
  /** Pid recorded in an existing lock when we did not acquire. */
  existingPid?: number;
  /** Port recorded in an existing lock (for user-facing hints only). */
  existingPort?: number;
  reason: DesktopInstanceLockReason;
  release: () => void;
};

type LockRecord = {
  pid?: number;
  port?: number;
  startedAt?: string;
};

type LockOptions = {
  channelDir: string;
  port?: number;
  pid?: number;
  now?: () => Date;
  /** Injectable for tests. Default uses `process.kill(pid, 0)`. */
  pidAlive?: (pid: number) => boolean;
  /** How many create attempts (including after stale-lock removal). Default 3. */
  maxAttempts?: number;
};

const noop = () => {};

function defaultPidAlive(pid: number) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    // Signal 0: existence check only; does not kill.
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readLockRecord(lockPath: string): LockRecord | null {
  try {
    const raw = readFileSync(lockPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }
    return parsed as LockRecord;
  } catch {
    // Missing file, corrupt JSON, or unreadable → treat as stale.
    return null;
  }
}

function normalizePort(value: unknown): number | undefined {
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0) return undefined;
  return port;
}

function liveHolderFromLock(
  lockPath: string,
  pidAlive: (pid: number) => boolean,
): { existingPid: number; existingPort?: number } | null {
  const existing = readLockRecord(lockPath);
  const existingPid = Number(existing?.pid);
  if (!Number.isInteger(existingPid) || existingPid <= 0) return null;
  if (!pidAlive(existingPid)) return null;
  // Default policy: pid alive ⇒ instance is running, even if port is not
  // connectable yet (startup race) or temporarily unreachable. Do not steal.
  return {
    existingPid,
    existingPort: normalizePort(existing?.port),
  };
}

/**
 * Per-channel desktop single-instance lock (`desktop-instance.lock.json`).
 *
 * - Creates the lock file atomically with `O_EXCL` (`wx`).
 * - If the file exists and records a live pid → refuse (do not start a second server).
 * - If the file exists but pid is dead / corrupt / missing → remove and retry.
 * - Call `release()` on normal exit so the next launch can acquire cleanly.
 */
export function acquireDesktopInstanceLock({
  channelDir,
  port,
  pid = process.pid,
  now = () => new Date(),
  pidAlive = defaultPidAlive,
  maxAttempts = 3,
}: LockOptions): DesktopInstanceLock {
  const lockPath = join(channelDir, "desktop-instance.lock.json");
  mkdirSync(dirname(lockPath), { recursive: true });

  const attempts = Math.max(1, maxAttempts);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const fd = openSync(lockPath, "wx");
      try {
        writeFileSync(
          fd,
          JSON.stringify({
            pid,
            port,
            startedAt: now().toISOString(),
          }),
        );
      } finally {
        closeSync(fd);
      }

      let released = false;
      return {
        acquired: true,
        lockPath,
        reason: "acquired",
        release: () => {
          if (released) return;
          released = true;
          try {
            rmSync(lockPath, { force: true });
          } catch {
            // Best-effort; next launch will treat a dead pid as stale.
          }
        },
      };
    } catch (error: any) {
      if (error?.code !== "EEXIST") throw error;

      const live = liveHolderFromLock(lockPath, pidAlive);
      if (live) {
        return {
          acquired: false,
          lockPath,
          existingPid: live.existingPid,
          existingPort: live.existingPort,
          reason: "live-instance",
          release: noop,
        };
      }

      // Stale, corrupt, or empty lock — remove and retry atomic create.
      try {
        rmSync(lockPath, { force: true });
      } catch {
        // Another process may have already removed it.
      }
    }
  }

  // Lost a create race after exhausting retries. Re-check for a live holder.
  const live = liveHolderFromLock(lockPath, pidAlive);
  if (live) {
    return {
      acquired: false,
      lockPath,
      existingPid: live.existingPid,
      existingPort: live.existingPort,
      reason: "live-instance",
      release: noop,
    };
  }

  return {
    acquired: false,
    lockPath,
    reason: "acquire-race",
    release: noop,
  };
}
