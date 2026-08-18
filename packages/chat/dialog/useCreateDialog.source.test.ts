import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "useCreateDialog.ts"), "utf8");

describe("useCreateDialog source contract", () => {
  it("rethrows dialog creation failures after local cleanup", () => {
    expect(source).toContain("} catch (error) {");
    expect(source).toContain("throw error;");
    expect(source).not.toContain("// 错误处理");
  });
});
