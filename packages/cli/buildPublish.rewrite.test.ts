import { describe, expect, test } from "bun:test";
import { rewriteCrossPackageImports } from "./buildPublish";

describe("rewriteCrossPackageImports", () => {
  const workspaceDeps = ["ai", "connector-experimental"];

  test("rewrites single-quoted imports from ../ai/", () => {
    const input = `import { foo } from '../ai/agent/bar';`;
    const expected = `import { foo } from './ai/agent/bar';`;
    expect(rewriteCrossPackageImports(input, workspaceDeps)).toBe(expected);
  });

  test("rewrites double-quoted imports from ../ai/", () => {
    const input = `import { foo } from "../ai/agent/bar";`;
    const expected = `import { foo } from "./ai/agent/bar";`;
    expect(rewriteCrossPackageImports(input, workspaceDeps)).toBe(expected);
  });

  test("rewrites imports from ../connector-experimental/", () => {
    const input = `import { foo } from "../connector-experimental/protocol";`;
    const expected = `import { foo } from "./connector-experimental/protocol";`;
    expect(rewriteCrossPackageImports(input, workspaceDeps)).toBe(expected);
  });

  test("rewrites multiple imports in same file", () => {
    const input = `
import { foo } from "../ai/agent/bar";
import { baz } from "../connector-experimental/protocol";
import type { Qux } from "../ai/types";
`;
    const expected = `
import { foo } from "./ai/agent/bar";
import { baz } from "./connector-experimental/protocol";
import type { Qux } from "./ai/types";
`;
    expect(rewriteCrossPackageImports(input, workspaceDeps)).toBe(expected);
  });

  test("does not rewrite imports from other relative paths", () => {
    const input = `
import { foo } from "./local";
import { bar } from "../someOtherPackage";
import { baz } from "../../../ai/not-a-sibling";
import { baz } from "external-package";
`;
    expect(rewriteCrossPackageImports(input, workspaceDeps)).toBe(input);
  });

  test("does not rewrite if workspace deps list is empty", () => {
    const input = `import { foo } from "../ai/agent/bar";`;
    expect(rewriteCrossPackageImports(input, [])).toBe(input);
  });

  test("handles imports with subpaths correctly", () => {
    const input = `import { foo } from "../ai/agent/machine/deep/path";`;
    const expected = `import { foo } from "./ai/agent/machine/deep/path";`;
    expect(rewriteCrossPackageImports(input, workspaceDeps)).toBe(expected);
  });

  test("handles type-only imports", () => {
    const input = `import type { MachineHeartbeat } from "../connector-experimental/protocol";`;
    const expected = `import type { MachineHeartbeat } from "./connector-experimental/protocol";`;
    expect(rewriteCrossPackageImports(input, workspaceDeps)).toBe(expected);
  });

  test("handles imports with whitespace variations", () => {
    const input = `import   {  foo  }   from   "../ai/bar"  ;`;
    const expected = `import   {  foo  }   from   "./ai/bar"  ;`;
    expect(rewriteCrossPackageImports(input, workspaceDeps)).toBe(expected);
  });

  test("real-world example: machineCommands.ts", () => {
    const input = `
import type { MachineHeartbeat } from "connector-experimental/protocol";
import { detectMachineInfo } from "connector-experimental/machineInfo";
import {
  assertMachineRunAllowed,
  buildMachinePermissionPromptBlock,
  resolveMachineRunPermissionPolicy,
} from "../ai/agent/machineRunPermissions";
import { resolveConnectorWebSocketTarget } from "./connectorWebSocketTarget";
`;
    const expected = `
import type { MachineHeartbeat } from "./connector-experimental/protocol";
import { detectMachineInfo } from "./connector-experimental/machineInfo";
import {
  assertMachineRunAllowed,
  buildMachinePermissionPromptBlock,
  resolveMachineRunPermissionPolicy,
} from "./ai/agent/machineRunPermissions";
import { resolveConnectorWebSocketTarget } from "./connectorWebSocketTarget";
`;
    expect(rewriteCrossPackageImports(input, workspaceDeps)).toBe(expected);
  });

  test("real-world example: agentRuntimeCommands.ts", () => {
    const input = `
import { foo } from "./local";
import { bar } from "../ai/agent/machineRunPermissions";
`;
    const expected = `
import { foo } from "./local";
import { bar } from "./ai/agent/machineRunPermissions";
`;
    expect(rewriteCrossPackageImports(input, workspaceDeps)).toBe(expected);
  });

  // TDD regression test: bare workspace imports must be rewritten
  test("rewrites bare workspace package imports to relative paths", () => {
    const input = `import type { MachineHeartbeat } from "connector-experimental/protocol";`;
    const expected = `import type { MachineHeartbeat } from "./connector-experimental/protocol";`;
    expect(rewriteCrossPackageImports(input, workspaceDeps)).toBe(expected);
  });

  test("rewrites bare workspace imports with subpaths", () => {
    const input = `import { detectMachineInfo } from "connector-experimental/machineInfo";`;
    const expected = `import { detectMachineInfo } from "./connector-experimental/machineInfo";`;
    expect(rewriteCrossPackageImports(input, workspaceDeps)).toBe(expected);
  });

  test("rewrites bare ai package imports", () => {
    const input = `import { foo } from "ai/agent/bar";`;
    const expected = `import { foo } from "./ai/agent/bar";`;
    expect(rewriteCrossPackageImports(input, workspaceDeps)).toBe(expected);
  });

  test("rewrites bare dynamic workspace imports", () => {
    const input = `const loadCli = () => import("ai/agent/cliExecutor");`;
    const expected = `const loadCli = () => import("./ai/agent/cliExecutor");`;
    expect(rewriteCrossPackageImports(input, workspaceDeps)).toBe(expected);
  });

  test("rewrites relative dynamic workspace imports", () => {
    const input = `const loadPermissions = () => import("../ai/agent/machineRunPermissions");`;
    const expected = `const loadPermissions = () => import("./ai/agent/machineRunPermissions");`;
    expect(rewriteCrossPackageImports(input, workspaceDeps)).toBe(expected);
  });

  test("rewrites nested bare workspace imports back to the dist root", () => {
    const input = `import { runLocalAgentTurn } from "agent-runtime/localLoop";`;
    const expected = `import { runLocalAgentTurn } from "../agent-runtime/localLoop";`;
    expect(rewriteCrossPackageImports(input, ["agent-runtime"], "client/agentRun.ts")).toBe(expected);
  });

  test("real-world machineCommands.ts with bare imports", () => {
    const input = `
import type { MachineHeartbeat } from "connector-experimental/protocol";
import { detectMachineInfo } from "connector-experimental/machineInfo";
import {
  assertMachineRunAllowed,
  buildMachinePermissionPromptBlock,
  resolveMachineRunPermissionPolicy,
} from "../ai/agent/machineRunPermissions";
`;
    const expected = `
import type { MachineHeartbeat } from "./connector-experimental/protocol";
import { detectMachineInfo } from "./connector-experimental/machineInfo";
import {
  assertMachineRunAllowed,
  buildMachinePermissionPromptBlock,
  resolveMachineRunPermissionPolicy,
} from "./ai/agent/machineRunPermissions";
`;
    expect(rewriteCrossPackageImports(input, workspaceDeps)).toBe(expected);
  });

  test("does not rewrite external package imports", () => {
    const input = `
import { foo } from "react";
import { bar } from "node:fs";
import { baz } from "@babel/core";
`;
    expect(rewriteCrossPackageImports(input, workspaceDeps)).toBe(input);
  });
});
