// packages/core/clientVersionGate.test.ts
import { describe, expect, test } from "bun:test";

import {
  buildClientVersionUpgradeMessage,
  CLIENT_VERSION_TOO_OLD_CODE,
  compareSemver,
  isClientVersionBelow,
  NOLO_CLIENT_VERSION_HEADER,
  parseSemver,
  readClientVersionHeader,
} from "./clientVersionGate";

describe("parseSemver", () => {
  test("parses core triples and normalises the optional v prefix", () => {
    expect(parseSemver("1.2.3")).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: [],
    });
    expect(parseSemver("v0.38.0")).toEqual({
      major: 0,
      minor: 38,
      patch: 0,
      prerelease: [],
    });
    // 两段式补 patch=0（历史 CLI 版本里出现过）
    expect(parseSemver("0.38")).toEqual({
      major: 0,
      minor: 38,
      patch: 0,
      prerelease: [],
    });
  });

  test("splits prerelease identifiers, numeric ones staying numeric", () => {
    expect(parseSemver("0.38.0-alpha.4")).toEqual({
      major: 0,
      minor: 38,
      patch: 0,
      prerelease: ["alpha", 4],
    });
  });

  test("drops build metadata (not part of semver precedence)", () => {
    expect(parseSemver("0.38.0-alpha.4+deadbeef")).toEqual({
      major: 0,
      minor: 38,
      patch: 0,
      prerelease: ["alpha", 4],
    });
    expect(parseSemver("1.0.0+build.9")).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
      prerelease: [],
    });
  });

  test("rejects garbage instead of guessing", () => {
    for (const bad of [
      "",
      "   ",
      "latest",
      "1.2.3.4",
      "1.x.3",
      "1.2.3-",
      "1.2.3-alpha..1",
      "-1.2.3",
      null,
      undefined,
    ]) {
      expect(parseSemver(bad as any)).toBeNull();
    }
  });
});

describe("compareSemver", () => {
  test("compares major / minor / patch positionally", () => {
    expect(compareSemver("1.0.0", "2.0.0")).toBe(-1);
    expect(compareSemver("2.0.0", "1.0.0")).toBe(1);
    expect(compareSemver("0.31.9", "0.32.0")).toBe(-1);
    expect(compareSemver("0.38.1", "0.38.0")).toBe(1);
    expect(compareSemver("0.38.0", "0.38.0")).toBe(0);
    // 数值比较，不是字典序：0.9.0 < 0.10.0
    expect(compareSemver("0.9.0", "0.10.0")).toBe(-1);
    expect(compareSemver("0.32.0", "0.32.10")).toBe(-1);
  });

  test("a prerelease ranks below the identical release", () => {
    expect(compareSemver("0.38.0-alpha.4", "0.38.0")).toBe(-1);
    expect(compareSemver("0.38.0", "0.38.0-alpha.4")).toBe(1);
  });

  test("numeric prerelease identifiers compare numerically", () => {
    expect(compareSemver("0.38.0-alpha.4", "0.38.0-alpha.5")).toBe(-1);
    expect(compareSemver("0.38.0-alpha.5", "0.38.0-alpha.4")).toBe(1);
    expect(compareSemver("0.38.0-alpha.4", "0.38.0-alpha.4")).toBe(0);
    // 关键边界：字典序会说 "10" < "9"，semver 说 alpha.9 < alpha.10
    expect(compareSemver("0.38.0-alpha.9", "0.38.0-alpha.10")).toBe(-1);
    expect(compareSemver("0.38.0-alpha.10", "0.38.0-alpha.9")).toBe(1);
  });

  test("numeric identifiers rank below alphanumeric ones", () => {
    expect(compareSemver("1.0.0-1", "1.0.0-alpha")).toBe(-1);
    expect(compareSemver("1.0.0-alpha", "1.0.0-1")).toBe(1);
  });

  test("alphanumeric identifiers compare in ASCII order", () => {
    expect(compareSemver("1.0.0-alpha", "1.0.0-beta")).toBe(-1);
    expect(compareSemver("1.0.0-beta", "1.0.0-rc")).toBe(-1);
  });

  test("a shorter identifier set ranks below its own prefix extension", () => {
    expect(compareSemver("1.0.0-alpha", "1.0.0-alpha.1")).toBe(-1);
    expect(compareSemver("1.0.0-alpha.1", "1.0.0-alpha")).toBe(1);
  });

  test("the semver 11.4 reference precedence chain holds end to end", () => {
    const chain = [
      "1.0.0-alpha",
      "1.0.0-alpha.1",
      "1.0.0-alpha.beta",
      "1.0.0-beta",
      "1.0.0-beta.2",
      "1.0.0-beta.11",
      "1.0.0-rc.1",
      "1.0.0",
    ];
    for (let i = 0; i < chain.length - 1; i += 1) {
      expect(compareSemver(chain[i], chain[i + 1])).toBe(-1);
      expect(compareSemver(chain[i + 1], chain[i])).toBe(1);
    }
  });

  test("returns null when either side is unparsable", () => {
    expect(compareSemver("nope", "1.0.0")).toBeNull();
    expect(compareSemver("1.0.0", "nope")).toBeNull();
    expect(compareSemver(undefined, "1.0.0")).toBeNull();
  });
});

describe("isClientVersionBelow", () => {
  const MIN = "0.38.0-alpha.4";

  test("blocks the versions that predate the required fix", () => {
    expect(isClientVersionBelow("0.32.0-alpha.4", MIN)).toBe(true);
    expect(isClientVersionBelow("0.31.7", MIN)).toBe(true);
    expect(isClientVersionBelow("0.38.0-alpha.3", MIN)).toBe(true);
  });

  test("passes the required version and anything newer", () => {
    expect(isClientVersionBelow("0.38.0-alpha.4", MIN)).toBe(false);
    expect(isClientVersionBelow("0.38.0-alpha.5", MIN)).toBe(false);
    expect(isClientVersionBelow("0.38.0", MIN)).toBe(false);
    expect(isClientVersionBelow("1.0.0", MIN)).toBe(false);
  });

  test("fail-open: no version, unparsable version, or no minimum all pass", () => {
    expect(isClientVersionBelow(undefined, MIN)).toBe(false);
    expect(isClientVersionBelow(null, MIN)).toBe(false);
    expect(isClientVersionBelow("", MIN)).toBe(false);
    expect(isClientVersionBelow("who-knows", MIN)).toBe(false);
    expect(isClientVersionBelow("0.1.0", undefined)).toBe(false);
    expect(isClientVersionBelow("0.1.0", "")).toBe(false);
  });
});

describe("readClientVersionHeader", () => {
  test("reads from a Headers-like container", () => {
    const headers = new Headers({ [NOLO_CLIENT_VERSION_HEADER]: "0.31.2" });
    expect(readClientVersionHeader(headers)).toBe("0.31.2");
  });

  test("reads from a plain record in both casings", () => {
    expect(
      readClientVersionHeader({ [NOLO_CLIENT_VERSION_HEADER]: " 0.38.0 " }),
    ).toBe("0.38.0");
    expect(
      readClientVersionHeader({ "X-Nolo-Client-Version": "0.38.0" }),
    ).toBe("0.38.0");
  });

  test("treats missing / empty / absurdly long values as absent", () => {
    expect(readClientVersionHeader(null)).toBeUndefined();
    expect(readClientVersionHeader(new Headers())).toBeUndefined();
    expect(readClientVersionHeader({ [NOLO_CLIENT_VERSION_HEADER]: "  " })).toBeUndefined();
    expect(
      readClientVersionHeader({ [NOLO_CLIENT_VERSION_HEADER]: "9".repeat(65) }),
    ).toBeUndefined();
  });
});

describe("buildClientVersionUpgradeMessage", () => {
  test("names the model, the required version and the upgrade command", () => {
    const message = buildClientVersionUpgradeMessage({
      model: "kimi-k3",
      minClientVersion: "0.38.0-alpha.4",
      clientVersion: "0.31.2",
    });
    expect(message).toContain("kimi-k3");
    expect(message).toContain("nolo-cli ≥ 0.38.0-alpha.4");
    expect(message).toContain("0.31.2");
    expect(message).toContain("npx nolo-cli@latest");
  });

  test("still renders without a known client version", () => {
    const message = buildClientVersionUpgradeMessage({
      model: "kimi-k3",
      minClientVersion: "0.38.0-alpha.4",
    });
    expect(message).toContain("nolo-cli ≥ 0.38.0-alpha.4");
    expect(message).toContain("npx nolo-cli@latest");
  });

  test("the structured error code is stable", () => {
    expect(CLIENT_VERSION_TOO_OLD_CODE).toBe("CLIENT_VERSION_TOO_OLD");
    expect(NOLO_CLIENT_VERSION_HEADER).toBe("x-nolo-client-version");
  });
});
