import { describe, expect, test } from "bun:test";

import {
  normalizeAgentRuntimeToolPolicy,
  resolveCurrentRunRuntimeToolPolicy,
  resolveRequestedRuntimeToolNames,
  resolveEffectiveRuntimeToolPolicy,
  resolveLocalRuntimeEnvFromPolicy,
  resolveLocalWorkspaceExecutorOptionsFromPolicy,
} from "./runtimeToolPolicy";

describe("runtime tool policy", () => {
  test("normalizes only the generic runtime policy fields", () => {
    expect(normalizeAgentRuntimeToolPolicy({
      agentTools: ["queryTableRows", "queryTableRows"],
      runtimeTools: ["execShell"],
      workspace: { mode: "current" },
      shell: { enabled: true },
      ignored: true,
    })).toEqual({
      version: 1,
      agentTools: ["queryTableRows"],
      runtimeTools: ["execShell"],
      workspace: { mode: "current" },
      shell: { enabled: true },
    });
  });

  test("reads requested runtime tools from agent policy and runtime binding snapshots", () => {
    expect(resolveRequestedRuntimeToolNames({
      agentConfig: {
        toolNames: ["queryTableRows"],
        runtimeToolPolicy: {
          version: 1,
          runtimeTools: ["execShell"],
        },
        runtimeBinding: {
          runtimeToolPolicy: {
            runtimeTools: ["captureVisualState"],
          },
          runtimeToolPolicySnapshot: {
            runtimeTools: ["captureVisualState"],
          },
        },
      },
    })).toEqual(["queryTableRows", "execShell", "captureVisualState"]);
  });

  test("prefers current run snapshot over agent default policy", () => {
    expect(resolveCurrentRunRuntimeToolPolicy({
      runtimeToolPolicy: {
        runtimeTools: ["execShell"],
        shell: { enabled: true, mode: "worktree", maxOutputBytes: 6000 },
      },
      runtimeBinding: {
        runtimeToolPolicySnapshot: {
          runtimeTools: ["execShell"],
          shell: { enabled: true, mode: "worktree", maxOutputBytes: 12000 },
        },
      },
    })).toMatchObject({
      shell: { maxOutputBytes: 12000 },
    });
  });

  test("maps runtime policy to local runtime env and executor options", () => {
    const policy = normalizeAgentRuntimeToolPolicy({
      runtimeTools: ["execShell"],
      shell: {
        enabled: true,
        mode: "worktree",
        maxOutputBytes: 120,
      },
    });

    expect(resolveLocalRuntimeEnvFromPolicy({ BASE_URL: "https://nolo.chat" }, policy)).toEqual({
      BASE_URL: "https://nolo.chat",
    });
    expect(resolveLocalWorkspaceExecutorOptionsFromPolicy(policy)).toEqual({
      commandOutputLimit: 120,
    });
  });

  test("ignores unknown external control policy payloads", () => {
    expect(resolveEffectiveRuntimeToolPolicy(({
      agentConfig: {
        runtimeToolPolicy: {
          version: 1,
          runtimeTools: ["execShell"],
          workspace: { mode: "current", writableRoots: ["/repo"] },
          shell: { enabled: true, mode: "worktree" },
          git: { canCommit: true, canPushAlpha: true },
        },
      },
      externalControl: {
        runtimeToolPolicy: {
          workspace: { mode: "current", writableRoots: ["/repo/.worktrees/task"] },
          shell: { networkPolicy: "default-deny" },
          git: { canPushAlpha: false, canMergeMain: false },
        },
      },
    }) as any)).toEqual({
      version: 1,
      agentTools: [],
      runtimeTools: ["execShell"],
      workspace: {
        mode: "current",
        writableRoots: ["/repo"],
      },
      shell: {
        enabled: true,
        mode: "worktree",
      },
      git: {
        canCommit: true,
        canPushAlpha: true,
      },
      budget: undefined,
      audit: undefined,
    });
  });

  test("reads older policy placement under runtimeBinding", () => {
    expect(resolveEffectiveRuntimeToolPolicy({
      agentConfig: {
        runtimeBinding: {
          runtimeToolPolicy: {
            runtimeTools: ["execShell"],
            workspace: { mode: "lease" },
          },
        },
      },
    })).toMatchObject({
      runtimeTools: ["execShell"],
      workspace: { mode: "lease" },
    });
  });

  test("hardens web workspace shell policies with the minimum hosted sandbox baseline", () => {
    expect(resolveEffectiveRuntimeToolPolicy({
      host: "web",
      agentConfig: {
        runtimeToolPolicy: {
          runtimeTools: ["execShell"],
          workspace: { mode: "lease", writableRoots: ["/workspaces/user-1"] },
          shell: { enabled: true, mode: "worktree" },
        },
      },
    })).toMatchObject({
      runtimeTools: ["execShell"],
      workspace: { mode: "lease", writableRoots: ["/workspaces/user-1"] },
      shell: {
        enabled: true,
        mode: "worktree",
        commandPolicy: "approval",
        networkPolicy: "default-deny",
      },
      isolation: {
        mode: "os-sandbox",
      },
      audit: {
        logToolCalls: true,
        logShellCommands: true,
        writeToDialog: true,
      },
    });
  });

  test("does not let web workspace policies weaken the hosted sandbox baseline", () => {
    expect(resolveEffectiveRuntimeToolPolicy({
      host: "web",
      agentConfig: {
        runtimeToolPolicy: {
          runtimeTools: ["execShell"],
          workspace: { mode: "lease" },
          shell: {
            enabled: true,
            mode: "worktree",
            commandPolicy: "denylist",
            networkPolicy: "allowed",
          },
          isolation: { mode: "none" },
        },
      },
    })).toMatchObject({
      shell: {
        commandPolicy: "approval",
        networkPolicy: "default-deny",
      },
      isolation: { mode: "os-sandbox" },
    });
  });
});
