import { describe, expect, test, afterAll } from "bun:test";
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildPublishArtifactBundled,
  CLI_PUBLISH_DEPENDENCY_ALLOWLIST,
  CLI_PUBLISH_DEPENDENCY_DENYLIST,
  filterDeniedCliDependencies,
  isDeniedCliDependency,
} from "./buildPublish";

const TEST_DIST_DIR = join(import.meta.dir, "../../.nolo-tmp/test-cli-publish-deps");
const CLI_SOURCE_DIR = import.meta.dir;
const REPO_ROOT = join(import.meta.dir, "../..");

afterAll(() => {
  if (existsSync(TEST_DIST_DIR)) {
    rmSync(TEST_DIST_DIR, { recursive: true, force: true });
  }
});

describe("CLI publish dependencies detachment", () => {
  test("published package.json dependencies contain no React Native packages", async () => {
    await buildPublishArtifactBundled(CLI_SOURCE_DIR, TEST_DIST_DIR);

    const manifestPath = join(TEST_DIST_DIR, "package.json");
    expect(existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const dependencies = manifest.dependencies || {};
    const depNames = Object.keys(dependencies);

    const badDeps = depNames.filter((dep) =>
      CLI_PUBLISH_DEPENDENCY_DENYLIST.some((pattern) => pattern.test(dep))
    );

    expect(badDeps).toEqual([]);
  }, 30000);

  test("published Node bundle resolves ulid through its external package entry", async () => {
    await buildPublishArtifactBundled(CLI_SOURCE_DIR, TEST_DIST_DIR);

    const manifest = JSON.parse(
      readFileSync(join(TEST_DIST_DIR, "package.json"), "utf8")
    );
    expect(manifest.dependencies?.ulid).toBe("^2.3.0");

    const ulidImportChunks = readdirSync(TEST_DIST_DIR)
      .filter((entry) => entry.endsWith(".js") && entry !== "index.js")
      .map((entry) => join(TEST_DIST_DIR, entry))
      .filter((filePath) => /from ["']ulid["']/.test(readFileSync(filePath, "utf8")))
      .sort(
        (left, right) =>
          readFileSync(left, "utf8").length - readFileSync(right, "utf8").length
      );

    expect(ulidImportChunks.length).toBeGreaterThan(0);
    const smallestUlidImportChunk = ulidImportChunks[0];
    const result = spawnSync(
      "node",
      [
        "--input-type=module",
        "-e",
        `import(${JSON.stringify(pathToFileURL(smallestUlidImportChunk).href)}).then(() => process.exit(0), (error) => { console.error(error); process.exit(1); });`,
      ],
      {
        cwd: TEST_DIST_DIR,
        encoding: "utf8",
        timeout: 30000,
      }
    );

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).not.toContain(
      "secure crypto unusable"
    );
  }, 30000);

  test("published Node bundle has no pino runtime dependency", async () => {
    await buildPublishArtifactBundled(CLI_SOURCE_DIR, TEST_DIST_DIR);

    const manifest = JSON.parse(
      readFileSync(join(TEST_DIST_DIR, "package.json"), "utf8")
    );
    expect(manifest.dependencies?.pino).toBeUndefined();

    const pinoImportChunks = readdirSync(TEST_DIST_DIR)
      .filter((entry) => entry.endsWith(".js") && entry !== "index.js")
      .map((entry) => join(TEST_DIST_DIR, entry))
      .filter((filePath) =>
        /from ["']pino["']/.test(readFileSync(filePath, "utf8"))
      );
    expect(pinoImportChunks).toEqual([]);
  }, 30000);

  test("published Node bundle resolves tweetnacl through its external package entry", async () => {
    await buildPublishArtifactBundled(CLI_SOURCE_DIR, TEST_DIST_DIR);

    const manifest = JSON.parse(
      readFileSync(join(TEST_DIST_DIR, "package.json"), "utf8")
    );

    // tweetnacl 版本必须由构建从 manifest 解析进发布依赖（不硬编码），与 root manifest 一致。
    const rootManifest = JSON.parse(
      readFileSync(join(REPO_ROOT, "package.json"), "utf8")
    );
    const expectedTweetnaclVersion =
      rootManifest.dependencies?.tweetnacl ??
      rootManifest.devDependencies?.tweetnacl ??
      rootManifest.peerDependencies?.tweetnacl;
    expect(typeof expectedTweetnaclVersion).toBe("string");
    expect(manifest.dependencies?.tweetnacl).toBe(expectedTweetnaclVersion);

    // tweetnacl 保持 external 时，bundle 会留下 from "tweetnacl" 的 chunk；旧实现把
    // tweetnacl 的 CJS 内联进 ESM chunk，不会产生这样的外部导入 chunk。
    const tweetnaclImportChunks = readdirSync(TEST_DIST_DIR)
      .filter((entry) => entry.endsWith(".js") && entry !== "index.js")
      .map((entry) => join(TEST_DIST_DIR, entry))
      .filter((filePath) => /from ["']tweetnacl["']/.test(readFileSync(filePath, "utf8")))
      .sort(
        (left, right) =>
          readFileSync(left, "utf8").length - readFileSync(right, "utf8").length
      );

    expect(tweetnaclImportChunks.length).toBeGreaterThan(0);

    const smallestTweetnaclImportChunk = tweetnaclImportChunks[0];
    const result = spawnSync(
      "node",
      [
        "--input-type=module",
        "-e",
        `import(${JSON.stringify(pathToFileURL(smallestTweetnaclImportChunk).href)}).then(() => process.exit(0), (error) => { console.error(error); process.exit(1); });`,
      ],
      {
        cwd: TEST_DIST_DIR,
        encoding: "utf8",
        timeout: 30000,
      }
    );

    const output = `${result.stdout}\n${result.stderr}`;
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(output).not.toContain("Dynamic require");
    expect(output).not.toContain("crypto");
  }, 30000);

  test("bundled index.js does not contain React Native module import specifiers", async () => {
    const bundledJsPath = join(TEST_DIST_DIR, "index.js");
    expect(existsSync(bundledJsPath)).toBe(true);

    const content = readFileSync(bundledJsPath, "utf8");

    expect(content).not.toContain("react-native-blob-util");
    expect(content).not.toContain("@react-native-community/netinfo");
  }, 30000);

  test("denylist filters injected React Native dependencies", () => {
    expect(isDeniedCliDependency("react-native")).toBe(true);
    expect(isDeniedCliDependency("react-native-blob-util")).toBe(true);
    expect(isDeniedCliDependency("@react-native-community/netinfo")).toBe(true);
    expect(isDeniedCliDependency("@react-native/metro-config")).toBe(true);
    expect(isDeniedCliDependency("level")).toBe(false);

    const filtered = filterDeniedCliDependencies({
      "react-native": "0.85.3",
      "react-native-blob-util": "^0.24.7",
      "@react-native-community/netinfo": "^11.5.0",
      "@react-native/metro-config": "0.85.3",
      level: "^10.0.0",
    });

    expect(Object.keys(filtered)).toEqual(["level"]);
  });

  test("published dependencies are a subset of CLI_PUBLISH_DEPENDENCY_ALLOWLIST", async () => {
    const manifestPath = join(TEST_DIST_DIR, "package.json");
    if (!existsSync(manifestPath)) {
      await buildPublishArtifactBundled(CLI_SOURCE_DIR, TEST_DIST_DIR);
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const dependencies = manifest.dependencies || {};
    const depNames = Object.keys(dependencies);

    for (const dep of depNames) {
      expect(CLI_PUBLISH_DEPENDENCY_ALLOWLIST).toContain(dep);
    }
  });

  test("published dependencies do not include React/Redux/Web UI/integration packages", async () => {
    const manifestPath = join(TEST_DIST_DIR, "package.json");
    if (!existsSync(manifestPath)) {
      await buildPublishArtifactBundled(CLI_SOURCE_DIR, TEST_DIST_DIR);
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const dependencies = manifest.dependencies || {};
    const depNames = Object.keys(dependencies);

    const forbidden = [
      "react",
      "react-dom",
      "react-redux",
      "react-i18next",
      "@reduxjs/toolkit",
      "slate",
      "browser-image-compression",
      "yahoo-finance2",
      "serpapi",
      "fast-xml-parser",
      "iztro",
      "croner",
      "date-fns",
      "i18next",
    ];

    const foundForbidden = depNames.filter((dep) => forbidden.includes(dep));
    expect(foundForbidden).toEqual([]);
  });

  test("bundled index.js does not contain import specifiers for web/redux/integration packages", async () => {
    const bundledJsPath = join(TEST_DIST_DIR, "index.js");
    if (!existsSync(bundledJsPath)) {
      await buildPublishArtifactBundled(CLI_SOURCE_DIR, TEST_DIST_DIR);
    }
    const content = readFileSync(bundledJsPath, "utf8");

    const forbiddenImports = [
      "@reduxjs/toolkit",
      "react-dom",
      "react/jsx-runtime",
      "browser-image-compression",
      "yahoo-finance2",
      "serpapi",
      "fast-xml-parser",
    ];

    for (const pkg of forbiddenImports) {
      expect(content).not.toContain(`from "${pkg}"`);
      expect(content).not.toContain(`from '${pkg}'`);
    }
  });

  test("source-contract assertions", () => {
    const agentRuntimeIndex = readFileSync(
      join(REPO_ROOT, "packages/agent-runtime/index.ts"),
      "utf8"
    );
    expect(agentRuntimeIndex).not.toContain('export * from "./externalTools"');

    const dialogPicker = readFileSync(
      join(REPO_ROOT, "packages/cli/tui/dialogPicker.ts"),
      "utf8"
    );
    expect(dialogPicker).not.toContain('chat/messages/messageContent"');
    expect(dialogPicker).toContain('core/chat/messageContentSerialize"');

    const writeAction = readFileSync(
      join(REPO_ROOT, "packages/database/actions/write.ts"),
      "utf8"
    );
    expect(writeAction).not.toContain('app/utils/toast"');

    const patchAction = readFileSync(
      join(REPO_ROOT, "packages/database/actions/patch.ts"),
      "utf8"
    );
    expect(patchAction).not.toContain('app/utils/toast"');

    const upsertAction = readFileSync(
      join(REPO_ROOT, "packages/database/actions/upsert.ts"),
      "utf8"
    );
    expect(upsertAction).not.toContain('app/utils/toast"');
  });
});
