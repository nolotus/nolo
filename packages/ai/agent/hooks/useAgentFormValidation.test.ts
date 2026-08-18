import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { extractAgentId, resolveAgentEditIdentity } from "./useAgentFormValidation";

const source = readFileSync(join(import.meta.dir, "useAgentFormValidation.ts"), "utf8");

describe("useAgentFormValidation identity helpers", () => {
  it("extracts bare agent id from full private/public keys", () => {
    expect(extractAgentId("agent-user-01ARZ3NDEKTSV4RRFFQ69G5FAV")).toBe(
      "01ARZ3NDEKTSV4RRFFQ69G5FAV"
    );
  });

  it("preserves hyphenated handles when extracting agent id", () => {
    expect(extractAgentId("agent-user-kimi-code")).toBe("kimi-code");
  });

  it("treats dbKey-only agent payloads as edit mode", () => {
    expect(
      resolveAgentEditIdentity({
        dbKey: "agent-user1-01ARZ3NDEKTSV4RRFFQ69G5FAV",
      })
    ).toEqual({
      agentKey: "agent-user1-01ARZ3NDEKTSV4RRFFQ69G5FAV",
      agentId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      isEditing: true,
    });
  });

  it("falls back to contentKey when id/dbKey are absent", () => {
    expect(
      resolveAgentEditIdentity({
        contentKey: "agent-user1-01ARZ3NDEKTSV4RRFFQ69G5FAV",
      })
    ).toEqual({
      agentKey: "agent-user1-01ARZ3NDEKTSV4RRFFQ69G5FAV",
      agentId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      isEditing: true,
    });
  });

  it("uses DEFAULT_MODEL for new agent form defaults", () => {
    expect(source).toContain('provider: DEFAULT_MODEL.provider');
    expect(source).toContain('model: DEFAULT_MODEL.name');
  });
});
