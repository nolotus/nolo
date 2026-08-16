// scripts/verify/verifyServerImports.test.ts
// verifyServerImports 的验收测试：正例（默认清单通过）+ 负例（坏路径必须 exit 1）。
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "bun:test";

const REPO = process.cwd();

function runScript(args: string[]): { status: number; stdout: string; stderr: string } {
  const r = spawnSync("bun", ["scripts/verify/verifyServerImports.ts", ...args], {
    cwd: REPO,
    encoding: "utf8",
    timeout: 180_000,
  });
  return { status: r.status ?? -1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

test("正例：默认 server 入口清单全部解析通过", () => {
  const r = runScript([]);
  expect(r.status).toBe(0);
  expect(r.stdout).toContain("resolve cleanly");
});

test("负例：不存在的入口模块必须失败", () => {
  const r = runScript(["--modules", "./packages/server/handlers/DOES_NOT_EXIST.ts"]);
  expect(r.status).toBe(1);
  expect(r.stdout + r.stderr).toContain("import problem");
});

test("负例：真实故障场景（静态 from 指向不存在相对路径）必须失败", () => {
  const dir = mkdtempSync(join(process.env.TMPDIR ?? "/tmp", "vsi-bad-"));
  try {
    mkdirSync(join(dir, "src"));
    // 模拟 chatHandler 漏 ../ 的坏 import：src/entry.ts from "./agentAvailability/agentAvailability"
    writeFileSync(
      join(dir, "src", "entry.ts"),
      `import { x } from "./agentAvailability/agentAvailability";\nexport const v = x;\n`
    );
    const r = runScript(["--scan-dir", dir]);
    expect(r.status).toBe(1);
    expect(r.stdout + r.stderr).toContain("agentAvailability");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("负例：模板字符串内嵌 import 不应误报（回归：noloReactSsrAppBuilder.test.ts）", () => {
  const dir = mkdtempSync(join(process.env.TMPDIR ?? "/tmp", "vsi-ok-"));
  try {
    mkdirSync(join(dir, "src"));
    writeFileSync(
      join(dir, "src", "sample.test.ts"),
      `const code = \`import App from "./App"; export function render(){ return <App />; }\`;\n` +
        `expect(x).toContain('import("../../../../packages/server/entry.ts")');\n`
    );
    const r = runScript(["--scan-dir", dir]);
    expect(r.status).toBe(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
