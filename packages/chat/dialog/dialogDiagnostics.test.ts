import { describe, expect, it } from "bun:test";
import {
  buildDialogDiagnosticsPayload,
  buildDialogDiagnosticsText,
  sanitizeSearchParams,
} from "./dialogDiagnostics";

describe("dialog diagnostics", () => {
  it("builds a minimal diagnostics payload without user-authored content", () => {
    const payload = buildDialogDiagnosticsPayload({
      runtime: "desktop",
      generatedAt: "2026-06-05T00:00:00.000Z",
      currentServer: "http://localhost:3011",
      currentSpaceId: "space-live",
      route: {
        origin: "http://localhost:5173",
        pathname: "/dialog/dialog-local",
        search: "?token=secret&panel=agent",
      },
      dialog: {
        dbKey: "dialog-local",
        id: "dialog-server",
        title: "private conversation title",
        summary: "private summary",
        taskPrompt: "private prompt",
        spaceId: "space-dialog",
        cybots: ["agent-a", "agent-b"],
        status: "active",
        createdAt: "2026-06-04T00:00:00.000Z",
        updatedAt: "2026-06-05T00:00:00.000Z",
        compressionCount: 2,
      },
    });

    expect(payload).toEqual({
      generatedAt: "2026-06-05T00:00:00.000Z",
      runtime: "desktop",
      serverOrigin: "http://localhost:3011",
      route: {
        origin: "http://localhost:5173",
        pathname: "/dialog/dialog-local",
        search: "?token=%5BREDACTED%5D&panel=agent",
      },
      dialogKey: "dialog-local",
      pageKey: "dialog-local",
      dialogId: "dialog-server",
      spaceId: "space-live",
      agentKeys: ["agent-a", "agent-b"],
      status: "active",
      createdAt: "2026-06-04T00:00:00.000Z",
      updatedAt: "2026-06-05T00:00:00.000Z",
      compressionCount: 2,
    });

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("private conversation title");
    expect(serialized).not.toContain("private summary");
    expect(serialized).not.toContain("private prompt");
    expect(serialized).not.toContain("secret");
  });

  it("falls back to dialog space when current space is missing", () => {
    const payload = buildDialogDiagnosticsPayload({
      runtime: "web",
      generatedAt: "2026-06-05T00:00:00.000Z",
      dialog: {
        dbKey: "dialog-local",
        spaceId: "space-dialog",
      },
    });

    expect(payload.spaceId).toBe("space-dialog");
  });

  it("formats copy text with a stable header and json body", () => {
    const text = buildDialogDiagnosticsText({
      runtime: "web",
      generatedAt: "2026-06-05T00:00:00.000Z",
      dialogKey: "dialog-local",
    });

    expect(text).toStartWith("=== NOLO DIALOG DIAGNOSTICS ===\n");
    expect(text).toContain('"dialogKey": "dialog-local"');
    expect(text).not.toContain("undefined");
  });

  it("redacts sensitive query values while preserving useful params", () => {
    expect(sanitizeSearchParams("?token=abc&view=chat&apiKey=xyz")).toBe(
      "?token=%5BREDACTED%5D&view=chat&apiKey=%5BREDACTED%5D",
    );
  });
});
