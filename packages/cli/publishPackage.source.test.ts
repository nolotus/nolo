import { describe, expect, test } from "bun:test";
import { buildPublishManifest } from "./publishPackage";

describe("buildPublishManifest", () => {
  test("removes workspace dependencies from the manifest", () => {
    const inputManifest = {
      name: "nolo-cli",
      version: "0.1.8",
      dependencies: {
        "ai": "workspace:*",
        "connector-experimental": "workspace:*",
        "lodash": "^4.17.21",
      },
    };

    const result = buildPublishManifest(inputManifest);

    expect(result.dependencies).not.toHaveProperty("ai");
    expect(result.dependencies).not.toHaveProperty("connector-experimental");
    expect(result.dependencies).toHaveProperty("lodash");
  });

  test("preserves non-workspace dependencies", () => {
    const inputManifest = {
      name: "nolo-cli",
      version: "0.1.8",
      dependencies: {
        "lodash": "^4.17.21",
        "chalk": "^5.0.0",
      },
    };

    const result = buildPublishManifest(inputManifest);

    expect(result.dependencies).toHaveProperty("lodash", "^4.17.21");
    expect(result.dependencies).toHaveProperty("chalk", "^5.0.0");
  });

  test("handles missing dependencies field gracefully", () => {
    const inputManifest = {
      name: "nolo-cli",
      version: "0.1.8",
    };

    const result = buildPublishManifest(inputManifest);

    expect(result.dependencies).toBeUndefined();
  });

  test("preserves other manifest fields", () => {
    const inputManifest = {
      name: "nolo-cli",
      version: "0.1.8",
      description: "Agent-first terminal workspace",
      bin: {
        nolo: "index.ts",
      },
      dependencies: {
        "ai": "workspace:*",
      },
    };

    const result = buildPublishManifest(inputManifest);

    expect(result.name).toBe("nolo-cli");
    expect(result.version).toBe("0.1.8");
    expect(result.description).toBe("Agent-first terminal workspace");
    expect(result.bin).toEqual({ nolo: "index.ts" });
  });

  test("removes workspace dependencies from devDependencies", () => {
    const inputManifest = {
      name: "nolo-cli",
      version: "0.1.8",
      devDependencies: {
        "ai": "workspace:*",
        "database": "workspace:*",
        "@types/node": "^20.0.0",
      },
    };

    const result = buildPublishManifest(inputManifest);

    expect(result.devDependencies).not.toHaveProperty("ai");
    expect(result.devDependencies).not.toHaveProperty("database");
    expect(result.devDependencies).toHaveProperty("@types/node");
  });

  test("removes workspace dependencies from peerDependencies", () => {
    const inputManifest = {
      name: "nolo-cli",
      version: "0.1.8",
      peerDependencies: {
        "connector-experimental": "workspace:*",
        "react": "^18.0.0",
      },
    };

    const result = buildPublishManifest(inputManifest);

    expect(result.peerDependencies).not.toHaveProperty("connector-experimental");
    expect(result.peerDependencies).toHaveProperty("react");
  });

  test("deletes devDependencies field if all deps are workspace deps", () => {
    const inputManifest = {
      name: "nolo-cli",
      version: "0.1.8",
      devDependencies: {
        "ai": "workspace:*",
        "database": "workspace:*",
      },
    };

    const result = buildPublishManifest(inputManifest);

    expect(result.devDependencies).toBeUndefined();
  });

  test("deletes peerDependencies field if all deps are workspace deps", () => {
    const inputManifest = {
      name: "nolo-cli",
      version: "0.1.8",
      peerDependencies: {
        "connector-experimental": "workspace:*",
      },
    };

    const result = buildPublishManifest(inputManifest);

    expect(result.peerDependencies).toBeUndefined();
  });

  test("handles all dependency fields simultaneously", () => {
    const inputManifest = {
      name: "nolo-cli",
      version: "0.1.8",
      dependencies: {
        "ai": "workspace:*",
        "lodash": "^4.17.21",
      },
      devDependencies: {
        "database": "workspace:*",
        "@types/node": "^20.0.0",
      },
      peerDependencies: {
        "connector-experimental": "workspace:*",
        "react": "^18.0.0",
      },
    };

    const result = buildPublishManifest(inputManifest);

    // dependencies
    expect(result.dependencies).not.toHaveProperty("ai");
    expect(result.dependencies).toHaveProperty("lodash");
    
    // devDependencies
    expect(result.devDependencies).not.toHaveProperty("database");
    expect(result.devDependencies).toHaveProperty("@types/node");
    
    // peerDependencies
    expect(result.peerDependencies).not.toHaveProperty("connector-experimental");
    expect(result.peerDependencies).toHaveProperty("react");
  });
});
