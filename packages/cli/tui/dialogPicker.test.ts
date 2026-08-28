import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  fetchRecentDialogs,
  formatDialogTimestamp,
  loadDialogHistoryForDisplay,
  renderDialogList,
  toDialogPickerItems,
} from "./dialogPicker";
import type { ListedDialog } from "../dialogCommands";
import { createInitialTuiState, handleTuiInput } from "./session";
import { getCliLocale, setCliLocale } from "./i18n";

// String assertions target the English strings; pin the locale for machines
// whose LANG resolves to zh.
const originalLocale = getCliLocale();
beforeAll(() => setCliLocale("en"));
afterAll(() => setCliLocale(originalLocale));

const makeDialog = (overrides: Partial<ListedDialog> = {}): ListedDialog => ({
  id: "01JZZZZZZZZZZZZZZZZZZZZZZZ",
  dbKey: "dialog-user-01JZZZZZZZZZZZZZZZZZZZZZZZ",
  title: "Fix cursor drift",
  status: null,
  updatedAt: null,
  createdAt: null,
  spaceId: null,
  triggerType: null,
  primaryAgentKey: null,
  cybots: [],
  ...overrides,
});

describe("formatDialogTimestamp", () => {
  const now = Date.parse("2026-07-18T12:00:00Z");

  test("renders relative stamps for recent times", () => {
    expect(formatDialogTimestamp(now - 30 * 1000, now)).toBe("just now");
    expect(formatDialogTimestamp(now - 5 * 60 * 1000, now)).toBe("5m ago");
    expect(formatDialogTimestamp(now - 3 * 3600 * 1000, now)).toBe("3h ago");
    expect(formatDialogTimestamp(now - 6 * 86400 * 1000, now)).toBe("6d ago");
  });

  test("falls back to an absolute date after a month", () => {
    expect(formatDialogTimestamp(now - 90 * 86400 * 1000, now)).toBe("2026-04-19");
  });

  test("handles null and junk values", () => {
    expect(formatDialogTimestamp(null, now)).toBe("");
    expect(formatDialogTimestamp("not-a-date", now)).toBe("");
  });
});

describe("toDialogPickerItems", () => {
  test("maps dialogs to select items with clipped titles", () => {
    const items = toDialogPickerItems([
      makeDialog({ title: "t".repeat(80), updatedAt: Date.now() - 60_000 }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].label.length).toBeLessThanOrEqual(48);
    expect(items[0].detail).toBe("1m ago");
    expect(items[0].dialog.id).toBe("01JZZZZZZZZZZZZZZZZZZZZZZZ");
  });
});

describe("renderDialogList", () => {
  test("renders ids so they can be pasted into /resume", () => {
    const text = renderDialogList([makeDialog()]);
    expect(text).toContain("Fix cursor drift");
    expect(text).toContain("id=01JZZZZZZZZZZZZZZZZZZZZZZZ");
  });

  test("handles the empty state", () => {
    expect(renderDialogList([])).toBe("No dialogs yet.");
  });
});

describe("fetchRecentDialogs error messages", () => {
  test("returns a localized message when there is no auth token", async () => {
    const result = await fetchRecentDialogs({ env: {} });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toBe("History requires an auth token. Run `nolo login` or set AUTH_TOKEN.");
    }
  });

  test("returns a localized message when the token has no user id", async () => {
    // A non-empty token that parseUserIdFromAuthToken cannot read.
    const result = await fetchRecentDialogs({ env: { AUTH_TOKEN: "not-a-jwt" } });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toBe("Could not read a user id from AUTH_TOKEN. Run `nolo login` again.");
    }
  });

  test("error string follows the active locale (zh)", async () => {
    setCliLocale("zh");
    try {
      const result = await fetchRecentDialogs({ env: {} });
      if ("error" in result) {
        expect(result.error).toBe("查看历史对话需要登录凭证。请运行 `nolo login` 或设置 AUTH_TOKEN。");
      }
    } finally {
      setCliLocale("en");
    }
  });
});

describe("fetchRecentDialogs success path (oversample + scheduled filter)", () => {
  function jwtFor(userId: string): string {
    const payload = Buffer.from(JSON.stringify({ userId })).toString("base64");
    return `${payload}.sig`;
  }

  test("requests an oversampled server limit and excludes scheduled after filtering", async () => {
    const rec = (id: string, title: string, triggerType?: string) => ({
      id,
      dbKey: `dialog-user-1-${id}`,
      title,
      ...(triggerType ? { triggerType } : {}),
    });
    const records = [
      rec("01A1", "sched1", "automation_run"),
      rec("01A2", "sched2", "scheduled_run"),
      rec("01A3", "sched3", "automation_run"),
      rec("01B1", "normal1"),
      rec("01B2", "normal2"),
      rec("01B3", "normal3"),
      rec("01B4", "normal4"),
      rec("01B5", "normal5"),
    ];
    const requests: Array<{ url: string }> = [];
    const fetchImpl = (async (url: string | URL | Request) => {
      const value = String(url);
      requests.push({ url: value });
      if (value.includes("/api/v1/db/query/")) {
        return Response.json({ data: { data: records } });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    const result = await fetchRecentDialogs({ env: { AUTH_TOKEN: jwtFor("user-1") }, limit: 5, fetchImpl });
    // server gets an oversampled limit (5 * PICKER_OVERSAMPLE_FACTOR = 25)
    const queryUrl = requests.find((r) => r.url.includes("/api/v1/db/query/"))?.url ?? "";
    expect(queryUrl).toContain("?limit=25");
    // after client-side scheduled filtering, we still get the full picker limit
    expect("dialogs" in result).toBe(true);
    if ("dialogs" in result) {
      expect(result.dialogs).toHaveLength(5);
      expect(
        result.dialogs.every(
          (d) => d.triggerType !== "automation_run" && d.triggerType !== "scheduled_run",
        ),
      ).toBe(true);
    }
  });
});

describe("loadDialogHistoryForDisplay", () => {
  test("reads persisted messages oldest-first and keeps only visible chat turns", async () => {
    const dialog = makeDialog();
    const seenUrls: string[] = [];
    const result = await loadDialogHistoryForDisplay({
      dialog,
      env: {
        AUTH_TOKEN: `${Buffer.from(JSON.stringify({ userId: "user" })).toString("base64")}.sig`,
        NOLO_SERVER: "https://history.test",
      },
      fetchImpl: (async (url: string | URL | Request) => {
        const value = String(url);
        seenUrls.push(value);
        if (value.endsWith(`/api/v1/db/read/${dialog.dbKey}`)) {
          return Response.json({ title: dialog.title });
        }
        if (value.endsWith("/rpc/getConvMsgs")) {
          return Response.json([
            {
              role: "assistant",
              content: [
                { type: "text", text: "persisted answer" },
                { type: "image_url", image_url: { url: "https://image.test/a.png" } },
              ],
            },
            { role: "tool", content: "tool trace" },
            { role: "system", content: "system prompt" },
            { role: "user", content: "persisted question" },
          ]);
        }
        return new Response("not found", { status: 404 });
      }) as typeof fetch,
    });

    // Guard: restoring history must skip the redundant meta GET (messagesOnly path).
    expect(seenUrls.some((u) => u.includes("/api/v1/db/read/"))).toBe(false);
    expect(seenUrls.some((u) => u.endsWith("/rpc/getConvMsgs"))).toBe(true);

    expect(result).toEqual([
      { role: "user", content: "persisted question" },
      { role: "assistant", content: "persisted answer\n[image]" },
    ]);
  });
});

describe("/history and /resume TUI commands", () => {
  const state = createInitialTuiState({});

  test("/history requests the interactive picker", () => {
    const result = handleTuiInput("/history", state);
    expect(result.action).toEqual({ type: "pick-dialog" });
  });

  test("/resume without id also opens the picker", () => {
    const result = handleTuiInput("/resume", state);
    expect(result.action).toEqual({ type: "pick-dialog" });
  });

  test("/resume with a dialog id switches the dialog directly", () => {
    const result = handleTuiInput("/resume 01JZZZZZZZZZZZZZZZZZZZZZZZ", state);
    expect(result.action).toBeUndefined();
    expect(result.nextState.dialogId).toBe("01JZZZZZZZZZZZZZZZZZZZZZZZ");
    expect(result.output).toContain("Resumed dialog");
  });

  test("/resume rejects values that are not dialog ids", () => {
    const result = handleTuiInput("/resume not-an-id", state);
    expect(result.nextState.dialogId).toBe(state.dialogId);
    expect(result.output).toContain("does not look like a dialog id");
  });
});
