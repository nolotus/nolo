import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "bun:test";

const engineDir = import.meta.dir;

// database-engine 包（公开存储引擎）不得 import database/server/routes/ 私有路由层。
// routes/ = HTTP 路由 + token 校验 + 计费钩子 + admin handler，私有；
// database-engine = 存储引擎 + Store + 纯授权逻辑，公开。
// 公开集若 import 私有路由，抽到公开仓库时会拖私有件，破坏开源解耦边界。

const FORBIDDEN_IMPORTS = [
  /from\s+["']database\/server\/routes\//,
  /from\s+["']\.\.\/server\/routes\//,
  /from\s+["']\.\/routes\//,
];

const IS_TEST_FILE = /\.(test|spec|source\.test)\.tsx?$/;

function collectEngineFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return [];
    if (!entry.endsWith(".ts")) return [];
    return [full];
  });
}

const engineFiles = collectEngineFiles(engineDir)
  .filter((f) => !IS_TEST_FILE.test(f))
  .map((file) => ({ file, source: readFileSync(file, "utf8") }));

describe("database-engine 公开包不得 import database/server/routes 私有路由", () => {
  it("engine 所有源文件都不 import server/routes", () => {
    const violators: string[] = [];
    for (const { file, source } of engineFiles) {
      for (const pattern of FORBIDDEN_IMPORTS) {
        if (pattern.test(source)) {
          violators.push(`${file.replace(engineDir + "/", "")} matches ${pattern}`);
        }
      }
    }
    expect(violators).toEqual([]);
  });

  it("engine 文件集合非空（守卫自身未因目录结构变更而失配）", () => {
    expect(engineFiles.length).toBeGreaterThan(0);
  });
});