import { describe, expect, test } from "bun:test";

import {
  buildUserAuthorityMoveDryRunUrl,
  parseVerifyUserAuthorityMoveDryRunArgs,
  resolveUserAuthorityMoveDryRunSecret,
  runVerifyUserAuthorityMoveDryRun,
} from "./verifyUserAuthorityMoveDryRun";

describe("verifyUserAuthorityMoveDryRun", () => {
  test("parses source, target, user, and json args", () => {
    const parsed = parseVerifyUserAuthorityMoveDryRunArgs([
      "--source-url",
      "https://source.example.com/",
      "--target-url",
      "https://target.example.com/",
      "--user",
      "user-1",
      "--json",
    ]);

    expect(parsed).toEqual({
      sourceUrl: "https://source.example.com",
      targetUrl: "https://target.example.com",
      userId: "user-1",
      moveId: undefined,
      movedAt: undefined,
      allowManualReview: false,
      wantJson: true,
      help: false,
    });
  });

  test("builds the dry-run export URL without putting secrets in query params", () => {
    const url = buildUserAuthorityMoveDryRunUrl({
      sourceUrl: "https://source.example.com/",
      targetUrl: "https://target.example.com/",
      userId: "user-1",
      moveId: "move-1",
      movedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(url.toString()).toBe(
      "https://source.example.com/api/admin/user-authority/move/export?userId=user-1&sourceServer=https%3A%2F%2Fsource.example.com&targetServer=https%3A%2F%2Ftarget.example.com&moveId=move-1&movedAt=2026-05-31T00%3A00%3A00.000Z"
    );
    expect(url.searchParams.has("secret")).toBe(false);
  });

  test("resolves source dry-run secret from source or shared env", () => {
    expect(
      resolveUserAuthorityMoveDryRunSecret({
        USER_AUTHORITY_MOVE_SOURCE_SECRET: "source-secret",
      })
    ).toBe("source-secret");

    expect(
      resolveUserAuthorityMoveDryRunSecret({
        USER_AUTHORITY_MOVE_SECRET: "shared-secret",
      })
    ).toBe("shared-secret");
  });

  test("probes unauthed access and then performs only source export", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      if (!init?.headers) {
        return new Response("Unauthorized", { status: 401 });
      }
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            userId: "user-1",
            moveId: "move-1",
            movedAt: "2026-05-31T00:00:00.000Z",
            sourceServer: "https://source.example.com",
            targetServer: "https://target.example.com",
            moveableCount: 1,
            manualReviewCount: 0,
            skippedRecordCount: 0,
            moveableRecordKeys: ["page-user-1-doc-1"],
            manualReviewRecordKeys: [],
          },
          records: [
            {
              dbKey: "page-user-1-doc-1",
              record: { dbKey: "page-user-1-doc-1", userId: "user-1" },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    };

    const report = await runVerifyUserAuthorityMoveDryRun({
      args: parseVerifyUserAuthorityMoveDryRunArgs([
        "--source-url",
        "https://source.example.com",
        "--target-url",
        "https://target.example.com",
        "--user",
        "user-1",
        "--move-id",
        "move-1",
        "--moved-at",
        "2026-05-31T00:00:00.000Z",
      ]),
      env: { USER_AUTHORITY_MOVE_SOURCE_SECRET: "source-secret" },
      fetchImpl,
    });

    expect(report.ok).toBe(true);
    expect(calls).toHaveLength(2);
    expect(calls.every((call) => call.url.includes("/api/admin/user-authority/move/export"))).toBe(
      true
    );
    expect(calls.some((call) => call.url.includes("/import"))).toBe(false);
    expect(calls.some((call) => call.url.includes("/cutover"))).toBe(false);
    expect((calls[1].init?.headers as Record<string, string>)["x-user-authority-move-secret"]).toBe(
      "source-secret"
    );
  });

  test("fails when unauthed access unexpectedly succeeds", async () => {
    await expect(
      runVerifyUserAuthorityMoveDryRun({
        args: parseVerifyUserAuthorityMoveDryRunArgs([
          "--source-url",
          "https://source.example.com",
          "--target-url",
          "https://target.example.com",
          "--user",
          "user-1",
        ]),
        env: { USER_AUTHORITY_MOVE_SECRET: "secret-1" },
        fetchImpl: async () => new Response(JSON.stringify({ success: true }), { status: 200 }),
      })
    ).rejects.toThrow("unauthed dry-run endpoint unexpectedly returned HTTP 200");
  });

  test("fails manual-review dry-run unless explicitly allowed", async () => {
    const fetchImpl = async (_url: string | URL | Request, init?: RequestInit) => {
      if (!init?.headers) return new Response("Unauthorized", { status: 401 });
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            userId: "user-1",
            manualReviewCount: 1,
            manualReviewRecordKeys: ["share-public-token"],
          },
          records: [],
        }),
        { status: 200 }
      );
    };

    await expect(
      runVerifyUserAuthorityMoveDryRun({
        args: parseVerifyUserAuthorityMoveDryRunArgs([
          "--source-url",
          "https://source.example.com",
          "--target-url",
          "https://target.example.com",
          "--user",
          "user-1",
        ]),
        env: { USER_AUTHORITY_MOVE_SECRET: "secret-1" },
        fetchImpl,
      })
    ).rejects.toThrow("manual-review records exist");
  });
});
