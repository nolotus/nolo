/**
 * Source contract: guest boot hydrates memberships with effective actor local.
 * Offline membership remote-unavailable is recoverable for boot + foreground.
 * Sticky default space boot path has been removed.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

describe("App space boot device-local (slice B1)", () => {
  test("guest/account space init uses decideSpaceInitialization + effective actor", () => {
    const source = readSource("packages/app/web/App.tsx");

    expect(source).toContain("decideSpaceInitialization");
    expect(source).toContain("resolveSpaceBootActorId");
    expect(source).toContain("fetchUserSpaceMemberships(spaceActorId)");
    expect(source).not.toContain("loadDefaultSpace");
    // Must not gate boot solely on account userId (guest would never hydrate).
    expect(source).not.toMatch(
      /if\s*\(\s*!userId\s*\)\s*\{\s*readyForegroundSyncUserRef\.current\s*=\s*null/
    );
  });

  test("boot/foreground treat only membership remote-unavailable as recoverable", () => {
    const source = readSource("packages/app/web/App.tsx");

    expect(source).toContain("isSpaceMembershipRemoteUnavailableError");
    expect(source).toContain("Promise.allSettled");
    expect(source).not.toContain("loadDefaultSpace");
    // Foreground must not stamp success cooldown while membership is offline.
    expect(source).toContain("if (!membershipOffline)");
    expect(source).toContain("lastCompletedSyncAt.current = Date.now()");
    // Settings / other membership errors must still abort (throw reason).
    expect(source).toContain("throw settingsResult.reason");
    expect(source).toContain("throw membershipResult.reason");
  });

  test("spaceInitGuard maps blank account to local actor", () => {
    const source = readSource("packages/app/web/spaceInitGuard.ts");
    expect(source).toContain("resolveEffectiveSpaceActorId");
    expect(source).toContain("DEVICE_LOCAL_OWNER_ID");
  });
});
