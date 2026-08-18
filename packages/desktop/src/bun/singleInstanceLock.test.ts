import { describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  acquireDesktopInstanceLock,
  DESKTOP_SECOND_INSTANCE_EXIT_CODE,
} from "./singleInstanceLock";

function tempChannelDir() {
  return mkdtempSync(join(tmpdir(), "nolo-desktop-lock-"));
}

describe("acquireDesktopInstanceLock", () => {
  it("documents second-instance exit code as 0 (intentional no-op, not a crash)", () => {
    expect(DESKTOP_SECOND_INSTANCE_EXIT_CODE).toBe(0);
  });

  it("acquires and releases a per-channel desktop lock", () => {
    const channelDir = tempChannelDir();
    const lock = acquireDesktopInstanceLock({
      channelDir,
      pid: 123,
      port: 3233,
      now: () => new Date("2026-06-04T00:00:00.000Z"),
      pidAlive: () => false,
    });

    expect(lock.acquired).toBe(true);
    expect(lock.reason).toBe("acquired");
    expect(existsSync(lock.lockPath)).toBe(true);
    expect(JSON.parse(readFileSync(lock.lockPath, "utf8"))).toEqual({
      pid: 123,
      port: 3233,
      startedAt: "2026-06-04T00:00:00.000Z",
    });

    lock.release();
    expect(existsSync(lock.lockPath)).toBe(false);

    // release is idempotent
    lock.release();
    expect(existsSync(lock.lockPath)).toBe(false);
  });

  it("refuses to acquire when an existing process is still alive", () => {
    const channelDir = tempChannelDir();
    writeFileSync(
      join(channelDir, "desktop-instance.lock.json"),
      JSON.stringify({ pid: 456, port: 3233 }),
    );

    const lock = acquireDesktopInstanceLock({
      channelDir,
      pid: 789,
      pidAlive: (pid) => pid === 456,
    });

    expect(lock.acquired).toBe(false);
    expect(lock.reason).toBe("live-instance");
    expect(lock.existingPid).toBe(456);
    expect(lock.existingPort).toBe(3233);
    expect(JSON.parse(readFileSync(lock.lockPath, "utf8")).pid).toBe(456);
  });

  it("treats a live pid as held even when the recorded port is missing or invalid", () => {
    const channelDir = tempChannelDir();
    writeFileSync(
      join(channelDir, "desktop-instance.lock.json"),
      JSON.stringify({ pid: 456, port: "not-a-port" }),
    );

    const lock = acquireDesktopInstanceLock({
      channelDir,
      pid: 789,
      pidAlive: (pid) => pid === 456,
    });

    expect(lock.acquired).toBe(false);
    expect(lock.reason).toBe("live-instance");
    expect(lock.existingPid).toBe(456);
    expect(lock.existingPort).toBeUndefined();
  });

  it("removes a stale lock (dead pid) and acquires a fresh one", () => {
    const channelDir = tempChannelDir();
    writeFileSync(
      join(channelDir, "desktop-instance.lock.json"),
      JSON.stringify({ pid: 456, port: 3233 }),
    );

    const lock = acquireDesktopInstanceLock({
      channelDir,
      pid: 789,
      port: 3234,
      pidAlive: () => false,
    });

    expect(lock.acquired).toBe(true);
    expect(lock.reason).toBe("acquired");
    expect(JSON.parse(readFileSync(lock.lockPath, "utf8")).pid).toBe(789);
    expect(JSON.parse(readFileSync(lock.lockPath, "utf8")).port).toBe(3234);
  });

  it("treats corrupt JSON lock files as stale and takes over", () => {
    const channelDir = tempChannelDir();
    writeFileSync(join(channelDir, "desktop-instance.lock.json"), "{not-json");

    const lock = acquireDesktopInstanceLock({
      channelDir,
      pid: 101,
      port: 4000,
      pidAlive: () => true, // must not matter when record is unreadable
    });

    expect(lock.acquired).toBe(true);
    expect(JSON.parse(readFileSync(lock.lockPath, "utf8"))).toMatchObject({
      pid: 101,
      port: 4000,
    });
  });

  it("treats non-object JSON as stale and takes over", () => {
    const channelDir = tempChannelDir();
    writeFileSync(join(channelDir, "desktop-instance.lock.json"), '"string-lock"');

    const lock = acquireDesktopInstanceLock({
      channelDir,
      pid: 202,
      port: 4001,
      pidAlive: () => true,
    });

    expect(lock.acquired).toBe(true);
    expect(JSON.parse(readFileSync(lock.lockPath, "utf8")).pid).toBe(202);
  });

  it("treats lock records with invalid pid as stale", () => {
    const channelDir = tempChannelDir();
    writeFileSync(
      join(channelDir, "desktop-instance.lock.json"),
      JSON.stringify({ pid: -1, port: 1 }),
    );

    const lock = acquireDesktopInstanceLock({
      channelDir,
      pid: 303,
      pidAlive: () => true,
    });

    expect(lock.acquired).toBe(true);
    expect(JSON.parse(readFileSync(lock.lockPath, "utf8")).pid).toBe(303);
  });

  it("double acquire: second caller loses while first holder is alive", () => {
    const channelDir = tempChannelDir();
    const first = acquireDesktopInstanceLock({
      channelDir,
      pid: 111,
      port: 5000,
      pidAlive: () => false,
    });
    expect(first.acquired).toBe(true);

    const second = acquireDesktopInstanceLock({
      channelDir,
      pid: 222,
      port: 5001,
      pidAlive: (pid) => pid === 111,
    });

    expect(second.acquired).toBe(false);
    expect(second.reason).toBe("live-instance");
    expect(second.existingPid).toBe(111);
    expect(second.existingPort).toBe(5000);
    // First lock file unchanged
    expect(JSON.parse(readFileSync(first.lockPath, "utf8")).pid).toBe(111);

    first.release();
    const third = acquireDesktopInstanceLock({
      channelDir,
      pid: 333,
      port: 5002,
      pidAlive: () => false,
    });
    expect(third.acquired).toBe(true);
    expect(JSON.parse(readFileSync(third.lockPath, "utf8")).pid).toBe(333);
    third.release();
  });

  it("returns acquire-race when attempts are exhausted without a live holder", () => {
    const channelDir = tempChannelDir();
    // Empty record is not a live holder. maxAttempts=1: EEXIST → rm → no retry create.
    writeFileSync(join(channelDir, "desktop-instance.lock.json"), JSON.stringify({}));

    const lock = acquireDesktopInstanceLock({
      channelDir,
      pid: 404,
      pidAlive: () => false,
      maxAttempts: 1,
    });

    expect(lock.acquired).toBe(false);
    expect(lock.reason).toBe("acquire-race");
  });
});
