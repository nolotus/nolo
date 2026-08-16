import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildPublishArtifact } from "./buildPublish";

type TestFixture = {
  rootDir: string;
  packagesDir: string;
  sourceDir: string;
  distDir: string;
  rootPackageJson: string;
};

const fixtureRoots: string[] = [];

function createFixture(): TestFixture {
  const rootDir = mkdtempSync(join(tmpdir(), "nolo-cli-build-publish-"));
  const packagesDir = join(rootDir, "packages");
  const sourceDir = join(packagesDir, "cli");
  const distDir = join(sourceDir, "dist");
  fixtureRoots.push(rootDir);
  mkdirSync(sourceDir, { recursive: true });
  // 真实的 CLI 包总有入口文件，而 buildPublish 的依赖发现
  // (discoverCliBundleExternalNames) 对缺失入口是硬抛错——那对真实构建是对的。
  // 夹具早于这个功能，只建目录不写入口，于是 12 个用例全部在
  // "CLI entry not found for dependency discovery" 上失败。补齐入口，让夹具
  // 反映真实包结构；需要特定入口内容的用例会自行覆盖它。
  writeFileSync(join(sourceDir, "index.ts"), "#!/usr/bin/env bun\nexport {};\n");
  return {
    rootDir,
    packagesDir,
    sourceDir,
    distDir,
    rootPackageJson: join(rootDir, "package.json"),
  };
}

afterEach(() => {
  while (fixtureRoots.length > 0) {
    rmSync(fixtureRoots.pop()!, { recursive: true, force: true });
  }
});

describe("buildPublishArtifact", () => {
  test("keeps publish CLI entrypoints free of repo-level script helper imports", () => {
    const source = readFileSync(join(import.meta.dir, "docCreateCommands.ts"), "utf8");
    expect(source).not.toContain("../../scripts/helpers/");
  });

  test("creates dist directory", async () => {
    const { sourceDir, distDir } = createFixture();
    writeFileSync(
      join(sourceDir, "package.json"),
      JSON.stringify({ name: "nolo-cli", version: "0.1.8", files: [] })
    );

    await buildPublishArtifact(sourceDir, distDir);
    expect(existsSync(distDir)).toBe(true);
  });

  test("copies package.json with workspace deps stripped", async () => {
    const { packagesDir, sourceDir, distDir } = createFixture();
    const aiDir = join(packagesDir, "ai");
    mkdirSync(aiDir, { recursive: true });
    writeFileSync(join(aiDir, "package.json"), JSON.stringify({ name: "ai" }));
    writeFileSync(join(aiDir, "index.ts"), "export const test = 1;");
    writeFileSync(
      join(sourceDir, "package.json"),
      JSON.stringify({
        name: "nolo-cli",
        version: "0.1.8",
        bin: { nolo: "index.ts" },
        dependencies: { ai: "workspace:*" },
      })
    );

    await buildPublishArtifact(sourceDir, distDir);

    const publishedPkg = JSON.parse(readFileSync(join(distDir, "package.json"), "utf8"));
    expect(publishedPkg.name).toBe("nolo-cli");
    expect(publishedPkg.version).toBe("0.1.8");
    expect(publishedPkg.dependencies).toBeUndefined();
  });

  test("updates bin path to point at dist files", async () => {
    const { sourceDir, distDir } = createFixture();
    writeFileSync(
      join(sourceDir, "package.json"),
      JSON.stringify({
        name: "nolo-cli",
        version: "0.1.8",
        bin: { nolo: "index.ts" },
      })
    );

    await buildPublishArtifact(sourceDir, distDir);

    const publishedPkg = JSON.parse(readFileSync(join(distDir, "package.json"), "utf8"));
    expect(publishedPkg.bin.nolo).toBe("index.ts");
  });

  test("copies source files to dist", async () => {
    const { sourceDir, distDir } = createFixture();
    writeFileSync(
      join(sourceDir, "package.json"),
      JSON.stringify({
        name: "nolo-cli",
        version: "0.1.8",
        files: ["index.ts", "README.md"],
      })
    );
    writeFileSync(join(sourceDir, "index.ts"), "#!/usr/bin/env bun\nconsole.log('hello');");
    writeFileSync(join(sourceDir, "README.md"), "# Test");

    await buildPublishArtifact(sourceDir, distDir);

    expect(existsSync(join(distDir, "index.ts"))).toBe(true);
    expect(existsSync(join(distDir, "README.md"))).toBe(true);
    expect(readFileSync(join(distDir, "index.ts"), "utf8")).toContain("#!/usr/bin/env bun");
  });

  test("preserves directory structure for nested files", async () => {
    const { sourceDir, distDir } = createFixture();
    mkdirSync(join(sourceDir, "client"), { recursive: true });
    mkdirSync(join(sourceDir, "tui"), { recursive: true });
    writeFileSync(
      join(sourceDir, "package.json"),
      JSON.stringify({
        name: "nolo-cli",
        version: "0.1.8",
        files: ["client/agentRun.ts", "tui/session.ts"],
      })
    );
    writeFileSync(join(sourceDir, "client/agentRun.ts"), "export const run = () => {};");
    writeFileSync(join(sourceDir, "tui/session.ts"), "export const session = () => {};");

    await buildPublishArtifact(sourceDir, distDir);

    expect(existsSync(join(distDir, "client/agentRun.ts"))).toBe(true);
    expect(existsSync(join(distDir, "tui/session.ts"))).toBe(true);
  });

  test("includes compactDialog.ts in client directory", async () => {
    const { sourceDir, distDir } = createFixture();
    mkdirSync(join(sourceDir, "client"), { recursive: true });
    mkdirSync(join(sourceDir, "tui"), { recursive: true });
    writeFileSync(
      join(sourceDir, "package.json"),
      JSON.stringify({
        name: "nolo-cli",
        version: "0.1.8",
        files: ["client/agentRun.ts", "client/compactDialog.ts", "tui/readlineWorkspace.ts"],
      })
    );
    writeFileSync(join(sourceDir, "client/agentRun.ts"), "export const run = () => {};");
    writeFileSync(join(sourceDir, "client/compactDialog.ts"), "export const compactDialog = () => {};");
    writeFileSync(
      join(sourceDir, "tui/readlineWorkspace.ts"),
      'import { compactDialog } from "../client/compactDialog";\n'
    );

    await buildPublishArtifact(sourceDir, distDir);

    expect(existsSync(join(distDir, "client/compactDialog.ts"))).toBe(true);
    expect(existsSync(join(distDir, "tui/readlineWorkspace.ts"))).toBe(true);
  });

  test("includes CLI command router runtime files needed by the real package", async () => {
    const distDir = join(mkdtempSync(join(tmpdir(), "nolo-cli-real-dist-")), "dist");
    fixtureRoots.push(join(distDir, ".."));

    await buildPublishArtifact(import.meta.dir, distDir);

    expect(existsSync(join(distDir, "commandRegistry.ts"))).toBe(true);
    expect(existsSync(join(distDir, "cliCommandAdapters.ts"))).toBe(true);
    expect(existsSync(join(distDir, "cliCommandFactories.ts"))).toBe(true);
    expect(existsSync(join(distDir, "cliCommandDispatch.ts"))).toBe(true);
    expect(existsSync(join(distDir, "cliCommandTypes.ts"))).toBe(true);
    expect(existsSync(join(distDir, "agentInternalCommandEntries.ts"))).toBe(true);
    expect(existsSync(join(distDir, "internalCommandEntries.ts"))).toBe(true);
    expect(existsSync(join(distDir, "agentCommandSupport.ts"))).toBe(true);
    expect(existsSync(join(distDir, "agentListCommands.ts"))).toBe(true);
    expect(existsSync(join(distDir, "agentMachineCommands.ts"))).toBe(true);
    expect(existsSync(join(distDir, "agentRecordCommands.ts"))).toBe(true);
    expect(existsSync(join(distDir, "agentRecordHelpers.ts"))).toBe(true);
    expect(existsSync(join(distDir, "cliAuthorityBrokerHealth.ts"))).toBe(true);
    expect(existsSync(join(distDir, "cliEnvHelpers.ts"))).toBe(true);
    expect(existsSync(join(distDir, "cliSpaceHelpers.ts"))).toBe(true);
    expect(existsSync(join(distDir, "dialogCommands.ts"))).toBe(true);
    expect(existsSync(join(distDir, "dialogInternalCommandEntries.ts"))).toBe(true);
    expect(existsSync(join(distDir, "globalRecordOperations.ts"))).toBe(true);
    expect(existsSync(join(distDir, "runtimeDoctorCommands.ts"))).toBe(true);
    expect(existsSync(join(distDir, "systemInternalCommandEntries.ts"))).toBe(true);
    expect(existsSync(join(distDir, "workflowInternalCommandEntries.ts"))).toBe(true);
  });

  test("bundles connector-experimental files inline", async () => {
    const { packagesDir, sourceDir, distDir } = createFixture();
    const connectorDir = join(packagesDir, "connector-experimental");
    mkdirSync(connectorDir, { recursive: true });
    writeFileSync(join(connectorDir, "package.json"), JSON.stringify({ name: "connector-experimental" }));
    writeFileSync(join(connectorDir, "protocol.ts"), "export type MachineHeartbeat = { id: string };");
    writeFileSync(join(connectorDir, "machineInfo.ts"), "export const detectMachineInfo = () => ({});");
    writeFileSync(
      join(sourceDir, "package.json"),
      JSON.stringify({
        name: "nolo-cli",
        version: "0.1.8",
        files: ["machineCommands.ts"],
        dependencies: { "connector-experimental": "workspace:*" },
      })
    );
    writeFileSync(
      join(sourceDir, "machineCommands.ts"),
      'import type { MachineHeartbeat } from "connector-experimental/protocol";\n' +
        'import { detectMachineInfo } from "connector-experimental/machineInfo";\n'
    );

    await buildPublishArtifact(sourceDir, distDir);

    expect(existsSync(join(distDir, "connector-experimental/protocol.ts"))).toBe(true);
    expect(existsSync(join(distDir, "connector-experimental/machineInfo.ts"))).toBe(true);
  });

  test("discovers workspace packages from source imports even without workspace deps in package.json", async () => {
    const { packagesDir, sourceDir, distDir } = createFixture();
    const aiDir = join(packagesDir, "ai");
    const connectorDir = join(packagesDir, "connector-experimental");
    mkdirSync(join(aiDir, "agent"), { recursive: true });
    writeFileSync(
      join(aiDir, "agent", "machineRunPermissions.ts"),
      "export const resolveMachineRunPermissionPolicy = () => 'ok';"
    );
    writeFileSync(join(aiDir, "package.json"), JSON.stringify({ name: "ai" }));
    mkdirSync(connectorDir, { recursive: true });
    writeFileSync(join(connectorDir, "protocol.ts"), "export type MachineHeartbeat = { id: string };");
    writeFileSync(join(connectorDir, "package.json"), JSON.stringify({ name: "connector-experimental" }));
    writeFileSync(
      join(sourceDir, "package.json"),
      JSON.stringify({ name: "nolo-cli", version: "0.1.8", files: ["index.ts"] })
    );
    writeFileSync(
      join(sourceDir, "index.ts"),
      'import { resolveMachineRunPermissionPolicy } from "../ai/agent/machineRunPermissions";\n' +
        'export const run = async () => import("connector-experimental/protocol");\n' +
        "export { resolveMachineRunPermissionPolicy };\n"
    );

    await buildPublishArtifact(sourceDir, distDir);

    expect(existsSync(join(distDir, "ai/agent/machineRunPermissions.ts"))).toBe(true);
    expect(existsSync(join(distDir, "connector-experimental/protocol.ts"))).toBe(true);
    const indexContent = readFileSync(join(distDir, "index.ts"), "utf8");
    expect(indexContent).toContain("./ai/agent/machineRunPermissions");
    expect(indexContent).toContain("./connector-experimental/protocol");
  });

  test("does not copy unrelated files from discovered workspace packages", async () => {
    const { packagesDir, sourceDir, distDir } = createFixture();
    const aiDir = join(packagesDir, "ai");
    mkdirSync(join(aiDir, "agent"), { recursive: true });
    mkdirSync(join(aiDir, "editor"), { recursive: true });
    writeFileSync(join(aiDir, "package.json"), JSON.stringify({ name: "ai" }));
    writeFileSync(join(aiDir, "agent", "agentSlice.ts"), "export const createAgent = () => 'ok';\n");
    writeFileSync(join(aiDir, "editor", "debugPanel.ts"), "export const debugPanel = () => 'nope';\n");
    writeFileSync(
      join(sourceDir, "package.json"),
      JSON.stringify({ name: "nolo-cli", version: "0.1.8", files: ["index.ts"] })
    );
    writeFileSync(
      join(sourceDir, "index.ts"),
      'import { createAgent } from "../ai/agent/agentSlice";\nexport { createAgent };\n'
    );

    await buildPublishArtifact(sourceDir, distDir);

    expect(existsSync(join(distDir, "ai", "agent", "agentSlice.ts"))).toBe(true);
    expect(existsSync(join(distDir, "ai", "editor", "debugPanel.ts"))).toBe(false);
  });

  test("does not include dependencies used only by unreachable workspace files", async () => {
    const { packagesDir, sourceDir, distDir } = createFixture();
    const aiDir = join(packagesDir, "ai");
    mkdirSync(join(aiDir, "agent"), { recursive: true });
    mkdirSync(join(aiDir, "editor"), { recursive: true });
    writeFileSync(
      join(aiDir, "package.json"),
      JSON.stringify({ name: "ai", dependencies: { react: "^19.2.1" } })
    );
    writeFileSync(join(aiDir, "agent", "agentSlice.ts"), "export const createAgent = () => 'ok';\n");
    writeFileSync(
      join(aiDir, "editor", "debugPanel.ts"),
      'import { useEffect } from "react";\nexport const debugPanel = () => useEffect;\n'
    );
    writeFileSync(
      join(sourceDir, "package.json"),
      JSON.stringify({ name: "nolo-cli", version: "0.1.8", files: ["index.ts"] })
    );
    writeFileSync(
      join(sourceDir, "index.ts"),
      'import { createAgent } from "../ai/agent/agentSlice";\nexport { createAgent };\n'
    );

    await buildPublishArtifact(sourceDir, distDir);

    const publishedPkg = JSON.parse(readFileSync(join(distDir, "package.json"), "utf8"));
    expect(publishedPkg.dependencies?.react).toBeUndefined();
  });

  test("includes external runtime dependencies from inlined workspace packages", async () => {
    const { packagesDir, sourceDir, distDir } = createFixture();
    const aiDir = join(packagesDir, "ai");
    mkdirSync(join(aiDir, "agent"), { recursive: true });
    writeFileSync(join(aiDir, "package.json"), JSON.stringify({ name: "ai", dependencies: { ulid: "^2.3.0" } }));
    writeFileSync(
      join(aiDir, "agent/agentSlice.ts"),
      'import { ulid } from "ulid";\nexport const createAgent = () => ({ id: ulid() });'
    );
    writeFileSync(
      join(sourceDir, "package.json"),
      JSON.stringify({
        name: "nolo-cli",
        version: "0.1.8",
        files: ["machineCommands.ts"],
        dependencies: { ai: "workspace:*" },
      })
    );
    writeFileSync(join(sourceDir, "machineCommands.ts"), 'import { createAgent } from "../ai/agent/agentSlice";\n');

    await buildPublishArtifact(sourceDir, distDir);

    const publishedPkg = JSON.parse(readFileSync(join(distDir, "package.json"), "utf8"));
    expect(publishedPkg.dependencies.ulid).toBe("^2.3.0");
  });

  test("merges external dependencies from multiple inlined workspace packages", async () => {
    const { packagesDir, sourceDir, distDir } = createFixture();
    const aiDir = join(packagesDir, "ai");
    const connectorDir = join(packagesDir, "connector-experimental");
    mkdirSync(aiDir, { recursive: true });
    mkdirSync(connectorDir, { recursive: true });
    writeFileSync(
      join(aiDir, "package.json"),
      JSON.stringify({ name: "ai", dependencies: { ulid: "^2.3.0", zod: "^3.25.0" } })
    );
    writeFileSync(join(aiDir, "agent.ts"), 'import { ulid } from "ulid";\nexport const createAgent = () => ({ id: ulid() });');
    writeFileSync(
      join(connectorDir, "package.json"),
      JSON.stringify({ name: "connector-experimental", dependencies: { ws: "^8.0.0" } })
    );
    writeFileSync(
      join(connectorDir, "protocol.ts"),
      'import WebSocket from "ws";\nexport type MachineHeartbeat = { id: string };'
    );
    writeFileSync(
      join(sourceDir, "package.json"),
      JSON.stringify({
        name: "nolo-cli",
        version: "0.1.8",
        files: ["index.ts"],
        dependencies: { ai: "workspace:*", "connector-experimental": "workspace:*" },
      })
    );
    writeFileSync(
      join(sourceDir, "index.ts"),
      'import { createAgent } from "../ai/agent";\nimport type { MachineHeartbeat } from "../connector-experimental/protocol";\n'
    );

    await buildPublishArtifact(sourceDir, distDir);

    const publishedPkg = JSON.parse(readFileSync(join(distDir, "package.json"), "utf8"));
    expect(publishedPkg.dependencies.ulid).toBe("^2.3.0");
    expect(publishedPkg.dependencies.zod).toBeUndefined();
    expect(publishedPkg.dependencies.ws).toBe("^8.0.0");
  });

  test("includes external dependencies from CLI source files", async () => {
    const { sourceDir, distDir } = createFixture();
    mkdirSync(join(sourceDir, "client"), { recursive: true });
    writeFileSync(
      join(sourceDir, "package.json"),
      JSON.stringify({
        name: "nolo-cli",
        version: "0.1.8",
        files: ["client/compactDialog.ts"],
        dependencies: { ulid: "^2.3.0" },
      })
    );
    writeFileSync(
      join(sourceDir, "client/compactDialog.ts"),
      'import { ulid } from "ulid";\nexport const createDialog = () => ({ id: ulid() });'
    );

    await buildPublishArtifact(sourceDir, distDir);

    const publishedPkg = JSON.parse(readFileSync(join(distDir, "package.json"), "utf8"));
    expect(publishedPkg.dependencies.ulid).toBe("^2.3.0");
  });

  test("discovers external dependencies from CLI source files when declared only at repo root", async () => {
    const { sourceDir, distDir, rootPackageJson } = createFixture();
    mkdirSync(join(sourceDir, "client"), { recursive: true });
    writeFileSync(
      join(sourceDir, "package.json"),
      JSON.stringify({ name: "nolo-cli", version: "0.1.8", files: ["client/compactDialog.ts"] })
    );
    writeFileSync(rootPackageJson, JSON.stringify({ dependencies: { ulid: "^2.3.0" } }));
    writeFileSync(
      join(sourceDir, "client/compactDialog.ts"),
      'import { ulid } from "ulid";\nexport const createDialog = () => ({ id: ulid() });'
    );

    await buildPublishArtifact(sourceDir, distDir);

    const publishedPkg = JSON.parse(readFileSync(join(distDir, "package.json"), "utf8"));
    expect(publishedPkg.dependencies.ulid).toBe("^2.3.0");
  });

  test("includes reachable workspace imports declared as root dev dependencies", async () => {
    const { packagesDir, sourceDir, distDir, rootPackageJson } = createFixture();
    const renderDir = join(packagesDir, "render");
    mkdirSync(join(renderDir, "table"), { recursive: true });
    writeFileSync(join(renderDir, "package.json"), JSON.stringify({ name: "render" }));
    writeFileSync(rootPackageJson, JSON.stringify({ devDependencies: { "date-fns": "^2.30.0" } }));
    writeFileSync(
      join(renderDir, "table/tableSlice.ts"),
      'import { formatISO } from "date-fns";\nexport const formatNow = () => formatISO(new Date());'
    );
    writeFileSync(
      join(sourceDir, "package.json"),
      JSON.stringify({
        name: "nolo-cli",
        version: "0.1.8",
        files: ["tableCommands.ts"],
      })
    );
    writeFileSync(join(sourceDir, "tableCommands.ts"), 'import { formatNow } from "../render/table/tableSlice";\n');

    await buildPublishArtifact(sourceDir, distDir);

    const publishedPkg = JSON.parse(readFileSync(join(distDir, "package.json"), "utf8"));
    expect(publishedPkg.dependencies["date-fns"]).toBe("^2.30.0");
  });

  test("CLI package dependencies take precedence over inlined workspace package dependencies", async () => {
    const { packagesDir, sourceDir, distDir } = createFixture();
    const aiDir = join(packagesDir, "ai");
    mkdirSync(aiDir, { recursive: true });
    writeFileSync(
      join(aiDir, "package.json"),
      JSON.stringify({ name: "ai", dependencies: { ulid: "^2.0.0", zod: "^3.20.0" } })
    );
    writeFileSync(join(aiDir, "agent.ts"), 'import { ulid } from "ulid";\nexport const createAgent = () => ({ id: ulid() });');
    writeFileSync(
      join(sourceDir, "package.json"),
      JSON.stringify({
        name: "nolo-cli",
        version: "0.1.8",
        files: ["index.ts"],
        dependencies: { ai: "workspace:*", ulid: "^2.3.0" },
      })
    );
    writeFileSync(
      join(sourceDir, "index.ts"),
      'import { createAgent } from "../ai/agent";\nimport { ulid } from "ulid";\n'
    );

    await buildPublishArtifact(sourceDir, distDir);

    const publishedPkg = JSON.parse(readFileSync(join(distDir, "package.json"), "utf8"));
    expect(publishedPkg.dependencies.ulid).toBe("^2.3.0");
    expect(publishedPkg.dependencies.zod).toBeUndefined();
  });
});
