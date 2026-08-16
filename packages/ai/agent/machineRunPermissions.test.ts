import { describe, expect, it } from "bun:test";

import {
  assertMachineRunAllowed,
  buildMachinePermissionPromptBlock,
  resolveMachineRunPermissionPolicy,
} from "./machineRunPermissions";

describe("machine run permissions", () => {
  it("defaults bound machine runs to read-only file awareness", () => {
    expect(resolveMachineRunPermissionPolicy({})).toEqual({
      mode: "read_only",
      allowFilesystemRead: true,
      allowFilesystemWrite: false,
      allowShell: false,
      writableRoots: [],
    });
  });

  it("rejects obvious write and shell tasks when write and shell are not allowed", () => {
    const policy = resolveMachineRunPermissionPolicy({});

    expect(() => assertMachineRunAllowed("delete ~/.ssh/config", policy)).toThrow(
      "Machine permission denied"
    );
    expect(() => assertMachineRunAllowed("运行 rm -rf /tmp/nolo-test", policy)).toThrow(
      "Machine permission denied"
    );
    expect(() => assertMachineRunAllowed("list files in the current folder", policy)).not.toThrow();
    expect(() => assertMachineRunAllowed("看看桌面有哪些文件", policy)).not.toThrow();
  });

  it("does not treat explicit non-goals as write or shell requests", () => {
    const policy = resolveMachineRunPermissionPolicy({});

    expect(() =>
      assertMachineRunAllowed(
        "Review the evidence only.\n非目标：不要执行代码修改，不要关闭任务。",
        policy
      )
    ).not.toThrow();
    expect(() =>
      assertMachineRunAllowed("Do not run tests or edit files; inspect the provided summary only.", policy)
    ).not.toThrow();
    expect(() =>
      assertMachineRunAllowed("Do not ask questions. Delete temp.txt.", policy)
    ).toThrow("Machine permission denied");
  });

  it("does not block Chinese review wording that merely mentions changes or improvement", () => {
    const policy = resolveMachineRunPermissionPolicy({});

    expect(() =>
      assertMachineRunAllowed(
        "请复核证据是否改善。交接摘要：执行总结：改动文件：无。只基于可读持久证据审查。",
        policy
      )
    ).not.toThrow();
    expect(() => assertMachineRunAllowed("请修改 README.md", policy)).toThrow(
      "Machine permission denied"
    );
    expect(() => assertMachineRunAllowed("请运行命令 bun test", policy)).toThrow(
      "Machine permission denied"
    );
    expect(() =>
      assertMachineRunAllowed(
        "Evidence mentions workspace=/root/bun-nolo/.worktrees/demo and task evidence context.",
        policy
      )
    ).not.toThrow();
    expect(() =>
      assertMachineRunAllowed("Historical blocker mentioned bun scripts/readDialog.ts failed.", policy)
    ).not.toThrow();
    expect(() => assertMachineRunAllowed("run bun test", policy)).toThrow(
      "Machine permission denied"
    );
  });

  it("allows explicit full access policies", () => {
    const policy = resolveMachineRunPermissionPolicy({
      runtimeBinding: {
        permissions: {
          mode: "full_access",
          writableRoots: ["C:\\Users\\nolot\\project"],
        },
      },
    });

    expect(policy).toMatchObject({
      mode: "full_access",
      allowFilesystemRead: true,
      allowFilesystemWrite: true,
      allowShell: true,
      writableRoots: ["C:\\Users\\nolot\\project"],
    });
    expect(() => assertMachineRunAllowed("delete temp.txt", policy)).not.toThrow();
  });

  it("adds a clear prompt guard for non-sandboxed CLI providers", () => {
    expect(buildMachinePermissionPromptBlock(resolveMachineRunPermissionPolicy({}))).toContain(
      "File writes are not allowed"
    );
  });
});
