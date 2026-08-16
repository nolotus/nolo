import { describe, expect, test } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LuTable } from "react-icons/lu";
import ContentIcon, { normalizeContentIcon } from "./ContentIcon";

describe("ContentIcon", () => {
  test("renders emoji icons from content records", () => {
    const html = renderToStaticMarkup(
      <ContentIcon icon={{ kind: "emoji", value: "📊" }} fallback={LuTable} />
    );
    expect(html).toContain("📊");
  });

  test("rejects unknown icon payloads", () => {
    expect(normalizeContentIcon({ kind: "lucide", value: "unknown" })).toBeNull();
  });

  test("accepts expanded lucide icon options", () => {
    expect(normalizeContentIcon({ kind: "lucide", value: "folder-kanban" })).toEqual({
      kind: "lucide",
      value: "folder-kanban",
    });
    expect(normalizeContentIcon({ kind: "lucide", value: "message-square" })).toEqual({
      kind: "lucide",
      value: "message-square",
    });
    expect(normalizeContentIcon({ kind: "lucide", value: "sprout" })).toEqual({
      kind: "lucide",
      value: "sprout",
    });
    expect(normalizeContentIcon({ kind: "lucide", value: "workflow" })).toEqual({
      kind: "lucide",
      value: "workflow",
    });
    expect(normalizeContentIcon({ kind: "lucide", value: "wifi" })).toEqual({
      kind: "lucide",
      value: "wifi",
    });
  });
});
