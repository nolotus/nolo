import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "bun:test";
import {
  DATABASE_BOUNDARY_CONTRACT,
  isForbiddenDatabaseFile,
  isForbiddenDatabaseImport,
  isForbiddenDatabasePath,
} from "./databaseBoundaryContract";

const root = join(import.meta.dir, "../..");

const IS_TEST_FILE = /\.(test|spec|source\.test)\.(ts|tsx)$/;

// 递归收集某个目录下所有 ts/tsx 源码文件
function collectSourceFiles(dir: string): string[] {
  try {
    return readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        if (entry === "node_modules" || entry === "dist" || entry === "build") {
          return [];
        }
        return collectSourceFiles(full);
      }
      return /\.(ts|tsx)$/.test(entry) ? [full] : [];
    });
  } catch {
    return [];
  }
}

// 提取 import/export/require specifiers
function extractImportSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const staticImportExport = /(?:import|export)\s+(?:[\s\S]*?from\s+)?["']([^"']+)["']/g;
  for (const m of source.matchAll(staticImportExport)) {
    specifiers.push(m[1]);
  }
  const dynamicImportRequire = /(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g;
  for (const m of source.matchAll(dynamicImportRequire)) {
    specifiers.push(m[1]);
  }
  return specifiers;
}

describe("Database Boundary Contract (Wave 1)", () => {
  it("exports valid and versioned boundary contract configuration", () => {
    expect(DATABASE_BOUNDARY_CONTRACT.version).toBe(1);
    expect(DATABASE_BOUNDARY_CONTRACT.packages).toContain("database");
    expect(DATABASE_BOUNDARY_CONTRACT.packages).toContain("database-engine");
    expect(DATABASE_BOUNDARY_CONTRACT.forbiddenSubtrees.length).toBeGreaterThan(0);
    expect(DATABASE_BOUNDARY_CONTRACT.forbiddenFiles).toContain("serverStoreFactory.ts");
    expect(DATABASE_BOUNDARY_CONTRACT.allowedPublicCapabilities.length).toBeGreaterThan(0);
  });

  it("isForbiddenDatabaseImport correctly classifies forbidden and allowed imports", () => {
    // 违规导入测试
    const forbiddenExamples = [
      "database/server",
      "database/server/routes",
      "database/server/routes/read",
      "packages/database/server",
      "packages/database/server/actorAccess",
      "@nolo/database/server",
      "database-engine/serverStoreFactory",
      "packages/database-engine/serverStoreFactory",
      "../../database/server/routes/read",
    ];

    for (const specifier of forbiddenExamples) {
      const result = isForbiddenDatabaseImport(specifier);
      expect(result.forbidden).toBe(true);
      expect(result.rule).toBeDefined();
    }

    // 合法公开导入测试
    const allowedExamples = [
      "database/actions/read",
      "database/actions/write",
      "database/authority/recordAuthority",
      "database/authority/deviceLocal",
      "database/keys",
      "database/types",
      "database-engine/db",
      "database-engine/authorityStoreTypes",
      "database-engine/levelAuthorityStore",
      "database-engine/sqliteAuthorityStore",
      "database-engine/memoryAuthorityStore",
      "database-engine/cliAuthorityBrokerClient",
      "database-engine/storeOps",
    ];

    for (const specifier of allowedExamples) {
      const result = isForbiddenDatabaseImport(specifier);
      expect(result.forbidden).toBe(false);
    }
  });

  it("isForbiddenDatabasePath and isForbiddenDatabaseFile correctly flag forbidden resources", () => {
    expect(isForbiddenDatabasePath("packages/database/server").forbidden).toBe(true);
    expect(isForbiddenDatabasePath("packages/database/server/routes/read.ts").forbidden).toBe(true);
    expect(isForbiddenDatabasePath("packages/database-engine/serverStoreFactory.ts").forbidden).toBe(true);

    expect(isForbiddenDatabasePath("packages/database/actions/read.ts").forbidden).toBe(false);
    expect(isForbiddenDatabasePath("packages/database-engine/db.ts").forbidden).toBe(false);

    expect(isForbiddenDatabaseFile("serverStoreFactory.ts")).toBe(true);
    expect(isForbiddenDatabaseFile("serverStoreFactory.test.ts")).toBe(true);
    expect(isForbiddenDatabaseFile("db.ts")).toBe(false);
  });

  it("non-test source in public packages does not import forbidden database private subtrees", () => {
    // 检查所有公开客户端与支撑包（排除 server / auth / billing 等私有包，以及 database/server 自身和 database-engine 自身）
    const publicClientPackageNames = [
      "desktop",
      "web",
      "shared",
      "cli",
      "client",
      "app",
      "chat",
      "core",
      "agent-runtime",
      "integrations",
      "create",
      "ai",
      "render",
      "connector-experimental",
      "share",
      "identity",
      "lab",
      "life",
      "oauth",
      "tui",
    ];

    const violations: { file: string; specifier: string; rule?: string }[] = [];

    for (const pkg of publicClientPackageNames) {
      const pkgDir = join(root, "packages", pkg);
      const files = collectSourceFiles(pkgDir).filter((f) => !IS_TEST_FILE.test(f));

      for (const file of files) {
        const relPath = file.slice(root.length + 1);
        const source = readFileSync(file, "utf8");
        const specifiers = extractImportSpecifiers(source);

        for (const spec of specifiers) {
          const { forbidden, rule } = isForbiddenDatabaseImport(spec);
          if (forbidden) {
            violations.push({ file: relPath, specifier: spec, rule });
          }
        }
      }
    }

    // 检查 database 包内除 server/ 外的公开源文件
    const dbDir = join(root, "packages/database");
    const dbFiles = collectSourceFiles(dbDir)
      .filter((f) => !IS_TEST_FILE.test(f))
      .filter((f) => !f.includes("/packages/database/server/"));

    for (const file of dbFiles) {
      const relPath = file.slice(root.length + 1);
      const source = readFileSync(file, "utf8");
      const specifiers = extractImportSpecifiers(source);

      for (const spec of specifiers) {
        const { forbidden, rule } = isForbiddenDatabaseImport(spec);
        if (forbidden) {
          violations.push({ file: relPath, specifier: spec, rule });
        }
      }
    }

    // 检查 database-engine 包内非测试文件（除 db.ts 内部对同级 serverStoreFactory 的加载外）不得从外部或间接引入 database/server
    const engineDir = join(root, "packages/database-engine");
    const engineFiles = collectSourceFiles(engineDir).filter((f) => !IS_TEST_FILE.test(f));
    for (const file of engineFiles) {
      const relPath = file.slice(root.length + 1);
      const source = readFileSync(file, "utf8");
      const specifiers = extractImportSpecifiers(source);

      for (const spec of specifiers) {
        if (
          spec === "database/server" ||
          spec.startsWith("database/server/") ||
          spec === "packages/database/server" ||
          spec.startsWith("packages/database/server/") ||
          spec.includes("/server/routes")
        ) {
          violations.push({ file: relPath, specifier: spec, rule: "packages/database/server" });
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
