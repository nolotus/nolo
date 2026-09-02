import { describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, normalize, relative } from "node:path";

/**
 * RN-only 豁免清单（必须显式维护并附带具体排除理由）
 */
export const RN_EXEMPTIONS: Array<{
  prefix: string;
  reason: string;
}> = [
  {
    prefix: "packages/chat/screens/",
    reason: "React Native mobile chat screens (ChatBotList, DialogDetail, DialogList, MessageInput), target mobile navigation runtime",
  },
  {
    prefix: "packages/chat/messages/rn/",
    reason: "React Native specific message bubble components, excluded from web bundle compiler target",
  },
];

/**
 * Production Web 目录列表
 */
export const PROD_WEB_ROOTS = [
  "packages/chat",
  "packages/app",
  "packages/render",
  "packages/auth",
  "packages/identity",
  "packages/life",
  "packages/ai/agent/web",
  "packages/ai/llm/web",
  "packages/create",
  "packages/web",
  "packages/share",
];

const SERVER_EXCLUDE = ["/server/"];

function walkProdWebFiles(dir: string): string[] {
  let results: string[] = [];
  try {
    const list = readdirSync(dir);
    for (const f of list) {
      const full = join(dir, f);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        results = results.concat(walkProdWebFiles(full));
      } else if (
        /\.(ts|tsx)$/.test(f) &&
        !/\.(test|spec)\.(ts|tsx)$/.test(f) &&
        !f.endsWith(".d.ts")
      ) {
        results.push(full);
      }
    }
  } catch {}
  return results;
}

export function getTscWebProgramFiles(rootDir = process.cwd()): Set<string> {
  const stdout = execSync("tsc --listFilesOnly -p tsconfig.typecheck.web.json", {
    cwd: rootDir,
    encoding: "utf8",
  });
  return new Set(
    stdout
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => normalize(relative(rootDir, p)))
  );
}

export function collectProductionWebFiles(rootDir = process.cwd()): {
  evaluatedFiles: string[];
  exemptFiles: Array<{ file: string; reason: string }>;
} {
  const evaluatedFiles: string[] = [];
  const exemptFiles: Array<{ file: string; reason: string }> = [];

  for (const root of PROD_WEB_ROOTS) {
    const fullRoot = join(rootDir, root);
    if (!existsSync(fullRoot)) continue;

    const files = walkProdWebFiles(fullRoot);
    for (const file of files) {
      const rel = normalize(relative(rootDir, file));
      if (SERVER_EXCLUDE.some((s) => rel.includes(s))) continue;

      const matchedExemption = RN_EXEMPTIONS.find((e) => rel.startsWith(e.prefix));
      if (matchedExemption) {
        exemptFiles.push({ file: rel, reason: matchedExemption.reason });
      } else {
        evaluatedFiles.push(rel);
      }
    }
  }

  return { evaluatedFiles, exemptFiles };
}

describe("typecheck:web coverage gate", () => {
  it("includes all production web files in tsconfig.typecheck.web.json program with 0 missing files", () => {
    const programFiles = getTscWebProgramFiles();
    const { evaluatedFiles, exemptFiles } = collectProductionWebFiles();

    expect(evaluatedFiles.length).toBeGreaterThan(500);
    expect(exemptFiles.length).toBeGreaterThan(0);

    const missing: string[] = [];
    for (const file of evaluatedFiles) {
      if (!programFiles.has(file)) {
        missing.push(file);
      }
    }

    if (missing.length > 0) {
      console.error("Missing production web files in typecheck:web:", missing);
    }

    expect(missing).toEqual([]);
  });

  it("explicitly includes key production web modules flagged by review", () => {
    const programFiles = getTscWebProgramFiles();

    // Reviewer flagged files
    expect(programFiles.has("packages/ai/llm/web/AgentNameChip.tsx")).toBe(true);
    expect(programFiles.has("packages/identity/RequireSignedIn.cloud.tsx")).toBe(true);
    expect(programFiles.has("packages/identity/RequireSignedIn.local.tsx")).toBe(true);
    expect(programFiles.has("packages/identity/useDeleteOwnAccountFlow.cloud.ts")).toBe(true);
  });

  it("explicitly tracks RN-only exempted files with documented rationale", () => {
    const { exemptFiles } = collectProductionWebFiles();
    const tsconfigJson = JSON.parse(
      readFileSync(join(process.cwd(), "tsconfig.typecheck.web.json"), "utf8")
    );
    const excludePatterns: string[] = tsconfigJson.exclude || [];

    // Ensure RN exemptions are explicitly declared in tsconfig.typecheck.web.json exclude
    for (const exemption of RN_EXEMPTIONS) {
      expect(exemption.reason.length).toBeGreaterThan(10);
      const isExplicitlyExcluded = excludePatterns.some(
        (pat) => pat.startsWith(exemption.prefix) || exemption.prefix.startsWith(pat.replace(/\*\*$/, ""))
      );
      expect(isExplicitlyExcluded).toBe(true);
    }

    // Verify chat screens are recognized as exempt
    const chatScreenExempt = exemptFiles.some((f) => f.file.includes("packages/chat/screens/MessageInput.tsx"));
    expect(chatScreenExempt).toBe(true);
  });

  it("fails when a new packages/**/web directory is not registered in PROD_WEB_ROOTS", () => {
    const discovered: string[] = [];
    const walk = (dir: string, depth: number) => {
      if (depth > 4) return;
      for (const entryName of readdirSync(dir)) {
        const full = join(dir, entryName);
        let stat;
        try {
          stat = statSync(full);
        } catch {
          continue;
        }
        if (!stat.isDirectory()) continue;
        if (entryName === "node_modules" || entryName.startsWith(".")) continue;
        if (entryName === "web") {
          discovered.push(normalize(relative(process.cwd(), full)));
          continue;
        }
        walk(full, depth + 1);
      }
    };
    walk(join(process.cwd(), "packages"), 1);

    const unregistered = discovered.filter(
      (dir) => !PROD_WEB_ROOTS.some((root) => dir === root || dir.startsWith(`${root}/`))
    );

    if (unregistered.length > 0) {
      console.error(
        "Unregistered web directories found — add them to PROD_WEB_ROOTS (or a documented exemption):",
        unregistered
      );
    }
    expect(unregistered).toEqual([]);
  });
});
