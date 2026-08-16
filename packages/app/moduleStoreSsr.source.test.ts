import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Module-store hooks used from SSR-rendered trees must pass getServerSnapshot
 * (React: "Missing getServerSnapshot, which is required for server-rendered content").
 * Working reference: shareStore / publicAgentsSSRStore.
 */
const STORE_FILES = [
  "./favorite/favoriteStore.ts",
  "./notifications/notificationStore.ts",
  "./appInspector/appInspectorStore.ts",
  "../ai/tools/toolRunStore.ts",
  "../share/shareStore.ts",
  "../ai/agent/publicAgentsSSRStore.ts",
  "../chat/dialog/dialogRuntimeStore.ts",
  "../chat/messages/messageSessionStore.ts",
  "../render/page/docStore.ts",
  "../render/web/ui/Toast.tsx",
] as const;

/** 顶层实参个数（忽略嵌套括号内的逗号与末尾空参）。 */
function countTopLevelArgs(call: string): number {
  const open = call.indexOf("(");
  let depth = 0;
  const args: string[] = [];
  let current = "";
  for (let i = open; i < call.length; i++) {
    const c = call[i];
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") {
      depth--;
      if (depth === 0) break;
    }
    if (depth === 1 && c === ",") {
      args.push(current);
      current = "";
      continue;
    }
    if (depth >= 1) current += c;
  }
  args.push(current);
  return args.filter((arg) => arg.replace(/\/\/.*$/gm, "").trim().length > 0)
    .length;
}

describe("module store SSR getServerSnapshot contract", () => {
  for (const relativePath of STORE_FILES) {
    it(`${relativePath} passes getServerSnapshot to useSyncExternalStore`, () => {
      const source = readFileSync(join(import.meta.dir, relativePath), "utf-8");
      const calls = source.match(/useSyncExternalStore\([^;]+\)/g) ?? [];
      expect(calls.length).toBeGreaterThan(0);
      for (const call of calls) {
        expect(call).not.toMatch(
          /useSyncExternalStore\(\s*subscribe\s*,\s*getSnapshot\s*\)/
        );
        expect(countTopLevelArgs(call)).toBeGreaterThanOrEqual(3);
      }
    });
  }
});
