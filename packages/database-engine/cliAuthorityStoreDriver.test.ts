import { describe, expect, test, afterEach } from "bun:test";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  resolveCliAuthorityBrokerHealthPath,
  resolveCliAuthorityBrokerMetadataPath,
} from "./cliAuthorityStoreDriver";

describe("broker run-dir location", () => {
  // Regression: the run dir resolved against an empty env, so a caller that
  // passed no env landed in the developer's real ~/.nolo/run and overwrote the
  // pid/endpoint a live session was using — even from a test process with an
  // isolated NOLO_HOME.
  const prev = process.env.NOLO_HOME;

  afterEach(() => {
    if (prev === undefined) delete process.env.NOLO_HOME;
    else process.env.NOLO_HOME = prev;
  });

  test("falls back to the ambient NOLO_HOME when no env is passed", () => {
    process.env.NOLO_HOME = "/tmp/nolo-home-probe";
    expect(resolveCliAuthorityBrokerMetadataPath({ transport: "tcp" })).toBe(
      "/tmp/nolo-home-probe/run/authority-store-broker.json",
    );
    expect(resolveCliAuthorityBrokerHealthPath({ transport: "tcp" })).toBe(
      "/tmp/nolo-home-probe/run/authority-store-broker.health.json",
    );
  });

  test("an explicitly passed env still wins", () => {
    process.env.NOLO_HOME = "/tmp/nolo-home-probe";
    expect(
      resolveCliAuthorityBrokerMetadataPath({
        transport: "tcp",
        env: { NOLO_HOME: "/tmp/explicit" },
      }),
    ).toBe("/tmp/explicit/run/authority-store-broker.json");
  });

  test("an env without NOLO_HOME still means the real home, as production expects", () => {
    // Asserted through an explicit empty env rather than by deleting the
    // ambient one: `bun test` runs files concurrently in a shared process, so
    // unsetting NOLO_HOME here would drop *other* files' isolation for the
    // duration of this test — which is how this very suite once wrote the
    // developer's real ~/.nolo/agent-selection.log.
    expect(
      resolveCliAuthorityBrokerMetadataPath({ transport: "tcp", env: {} }),
    ).toBe(join(homedir(), ".nolo", "run", "authority-store-broker.json"));
  });
});
