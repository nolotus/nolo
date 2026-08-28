/**
 * Source + Metro resolution contract for RN Keychain credential broker.
 * Confirms Metro platform resolution prefers `.native` over the Node file broker.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(DIR, "../..");

const nativePath = join(DIR, "fileCredentialBroker.native.ts");
const nodePath = join(DIR, "fileCredentialBroker.ts");
const browserStubPath = join(DIR, "fileCredentialBroker.browser.stub.ts");
const agentSlicePath = join(DIR, "../ai/agent/agentSlice.ts");

describe("fileCredentialBroker.native source contract", () => {
  it("native + node + browser stub modules all exist (platform forks)", () => {
    expect(existsSync(nativePath)).toBe(true);
    expect(existsSync(nodePath)).toBe(true);
    expect(existsSync(browserStubPath)).toBe(true);
  });

  it("native module is Keychain-backed and matches CredentialBroker surface", () => {
    const source = readFileSync(nativePath, "utf8");
    expect(source).toContain('require("react-native-keychain")');
    expect(source).toContain("export function createFileCredentialBroker");
    expect(source).toContain("RN_CREDENTIAL_KEYCHAIN_SERVICE_PREFIX");
    expect(source).toContain("nolo.credentials.keys");
    expect(source).toContain("credentialRefToKeychainService");
    // Hard failure paths — stable codes only (no ref/path/native echo).
    expect(source).toContain("credential_broker_put_failed");
    expect(source).toContain("invalid_ref");
    expect(source).not.toMatch(/Keychain put failed for ref/);
    expect(source).toMatch(/async get\(/);
    expect(source).toMatch(/async put\(/);
    expect(source).toMatch(/async delete\(/);
    expect(source).toMatch(/async has\(/);
    // Must not depend on node:fs or import AsyncStorage as a store.
    expect(source).not.toContain("node:fs");
    expect(source).not.toMatch(/from ["']@react-native-async-storage/);
    expect(source).not.toMatch(/require\(["']@react-native-async-storage/);
    // Must not hard-code login token service ops.
    expect(source).not.toMatch(/service:\s*["']app_tokens["']/);
  });

  it("agentSlice imports bare fileCredentialBroker so Metro can pick .native", () => {
    const slice = readFileSync(agentSlicePath, "utf8");
    expect(slice).toContain(
      'from "../../agent-runtime/fileCredentialBroker"',
    );
    // Must not hard-pin Node-only or browser stub paths.
    expect(slice).not.toContain("fileCredentialBroker.ts");
    expect(slice).not.toContain("fileCredentialBroker.browser.stub");
    expect(slice).not.toContain("fileCredentialBroker.native");
  });
});

describe("Metro platform resolution prefers .native for fileCredentialBroker", () => {
  it("resolves fileCredentialBroker to .native.ts for ios/android platforms", () => {
    // Use Metro's own resolver so we don't just document hope.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const metroResolver = require("metro-resolver") as {
      resolve: (
        context: Record<string, unknown>,
        moduleName: string,
        platform: string | null,
      ) => { type: string; filePath?: string };
    };

    const context = {
      originModulePath: join(DIR, "index.ts"),
      allowHaste: false,
      nodeModulesPaths: [join(REPO_ROOT, "node_modules")],
      sourceExts: ["ts", "tsx", "js", "jsx", "json"],
      mainFields: ["react-native", "browser", "main"],
      resolveRequest: null,
      isESMImport: true,
      preferNativePlatform: true,
      resolveAsset: () => null,
      getPackage: () => null,
      getPackageForModule: () => null,
      redirectModulePath: (modulePath: string) => modulePath,
      getPackageMainFromPackageJSON: (pkg: { main?: string }) =>
        pkg.main ?? "index.js",
      disableHierarchicalLookup: false,
      doesFileExist: (filePath: string) => existsSync(filePath),
      isAssetFile: () => false,
      getUnsafeExtraFileExtension: () => null,
      unstable_conditionNames: ["require", "react-native", "import"],
      unstable_conditionsByPlatform: {},
      unstable_enablePackageExports: false,
      unstable_fileSystemLookup: (path: string) => {
        if (!existsSync(path)) return { exists: false as const, type: "f" as const };
        return { exists: true as const, type: "f" as const, realPath: path };
      },
      fileSystemLookup: (path: string) => {
        if (!existsSync(path)) return { exists: false as const, type: "f" as const };
        return { exists: true as const, type: "f" as const, realPath: path };
      },
    };

    for (const platform of ["ios", "android"] as const) {
      const result = metroResolver.resolve(
        context,
        "./fileCredentialBroker",
        platform,
      );
      expect(result.type).toBe("sourceFile");
      expect(result.filePath?.replace(/\\/g, "/")).toMatch(
        /fileCredentialBroker\.native\.ts$/,
      );
      expect(result.filePath).not.toMatch(/fileCredentialBroker\.ts$/);
    }
  });

  it("resolves fileCredentialBroker to Node implementation when platform is null/web-like", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const metroResolver = require("metro-resolver") as {
      resolve: (
        context: Record<string, unknown>,
        moduleName: string,
        platform: string | null,
      ) => { type: string; filePath?: string };
    };

    const context = {
      originModulePath: join(DIR, "index.ts"),
      allowHaste: false,
      nodeModulesPaths: [join(REPO_ROOT, "node_modules")],
      sourceExts: ["ts", "tsx", "js", "jsx", "json"],
      mainFields: ["react-native", "browser", "main"],
      resolveRequest: null,
      isESMImport: true,
      preferNativePlatform: false,
      resolveAsset: () => null,
      getPackage: () => null,
      getPackageForModule: () => null,
      redirectModulePath: (modulePath: string) => modulePath,
      getPackageMainFromPackageJSON: (pkg: { main?: string }) =>
        pkg.main ?? "index.js",
      disableHierarchicalLookup: false,
      doesFileExist: (filePath: string) => existsSync(filePath),
      isAssetFile: () => false,
      getUnsafeExtraFileExtension: () => null,
      unstable_conditionNames: ["require", "import"],
      unstable_conditionsByPlatform: {},
      unstable_enablePackageExports: false,
      unstable_fileSystemLookup: (path: string) => {
        if (!existsSync(path)) return { exists: false as const, type: "f" as const };
        return { exists: true as const, type: "f" as const, realPath: path };
      },
      fileSystemLookup: (path: string) => {
        if (!existsSync(path)) return { exists: false as const, type: "f" as const };
        return { exists: true as const, type: "f" as const, realPath: path };
      },
    };

    // Without a native platform, Metro should not pick `.native` solely via preferNativePlatform false.
    // Node path still exists as the generic candidate.
    const result = metroResolver.resolve(
      context,
      "./fileCredentialBroker",
      null,
    );
    expect(result.type).toBe("sourceFile");
    // When platform is null, default is non-native file (not .native).
    expect(result.filePath?.replace(/\\/g, "/")).toMatch(
      /fileCredentialBroker\.ts$/,
    );
    expect(result.filePath).not.toMatch(/\.native\.ts$/);
  });
});
