import { describe, expect, it } from "bun:test";
import { isLevelLockError } from "./levelLockError";

describe("isLevelLockError pure seam", () => {
  it("returns false for empty and unrelated values", () => {
    expect(isLevelLockError(undefined)).toBe(false);
    expect(isLevelLockError(null)).toBe(false);
    expect(isLevelLockError("")).toBe(false);
    expect(isLevelLockError("open failed")).toBe(false);
    expect(isLevelLockError(new Error("EIO"))).toBe(false);
    expect(isLevelLockError({ code: "LEVEL_NOT_FOUND" })).toBe(false);
    expect(isLevelLockError({ code: "LEVEL_DATABASE_NOT_OPEN" })).toBe(false);
    expect(isLevelLockError({})).toBe(false);
  });

  it("detects LEVEL_LOCKED code", () => {
    expect(isLevelLockError({ code: "LEVEL_LOCKED" })).toBe(true);
  });

  it("detects LEVEL_LOCKED and resource-busy messages", () => {
    expect(isLevelLockError(new Error("LEVEL_LOCKED"))).toBe(true);
    expect(
      isLevelLockError(new Error("Resource temporarily unavailable")),
    ).toBe(true);
  });

  it("detects LOCK path and LOCK: prefix shapes", () => {
    expect(isLevelLockError(new Error("cannot open /data/leveldb/LOCK"))).toBe(
      true,
    );
    expect(isLevelLockError(new Error("LOCK: already held"))).toBe(true);
  });

  it("detects plain string lock signals", () => {
    expect(isLevelLockError("LEVEL_LOCKED")).toBe(true);
    expect(isLevelLockError("Resource temporarily unavailable")).toBe(true);
  });
});
