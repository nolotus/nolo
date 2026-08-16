import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  ALWAYS_EXCLUDED_GLOBS,
  dropAlwaysExcludedLines,
  buildLocalWorkspaceOpenAiTools,
  buildLocalWorkspacePolicyToolNames,
  buildLocalWorkspaceToolset,
  createLocalWorkspaceToolExecutors,
  resolveLocalWorkspaceToolPath,
} from "./localWorkspaceTools.ts";
import { getProcessRegistry } from "./processRegistry";

function createWorkspace() {
  return mkdtempSync(join(tmpdir(), "nolo-workspace-tools-"));
}

function warningsOf(result: { metadata?: Record<string, unknown> }) {
  return (result.metadata?.warnings ?? []) as string[];
}

  test("resolves relative paths inside the workspace root", async () => {
    const root = createWorkspace();

    expect(await resolveLocalWorkspaceToolPath({
      workspaceRoot: root,
      requestedPath: "src/app.ts",
    })).toBe(join(root, "src/app.ts"));
  });

  test("rejects external paths when the user declines confirmation", async () => {
    const root = createWorkspace();

    await expect(resolveLocalWorkspaceToolPath({
      workspaceRoot: root,
      requestedPath: "../outside.ts",
      confirmExternalFileAccess: async () => false,
    })).rejects.toThrow("external file access blocked");
  });

  test("allows external paths when no confirmation callback is wired (non-interactive)", async () => {
    // No confirmExternalFileAccess = non-interactive path. Hard-blocking here
    // would only stall the turn while the model retries the same path (same
    // contract as the destructive-shell guard).
    const root = createWorkspace();

    expect(await resolveLocalWorkspaceToolPath({
      workspaceRoot: root,
      requestedPath: "../outside.ts",
    })).toBe(join(root, "..", "outside.ts"));
  });

  test("allows external paths when the user confirms access", async () => {
    const root = createWorkspace();
    const seen: any[] = [];

    expect(await resolveLocalWorkspaceToolPath({
      workspaceRoot: root,
      requestedPath: "../screenshot.png",
      confirmExternalFileAccess: async (req) => {
        seen.push(req);
        return true;
      },
    })).toBe(join(root, "..", "screenshot.png"));
    expect(seen[0]).toMatchObject({
      id: "permission-file-external-access",
      action: "external_file_access",
      command: "../screenshot.png",
    });
  });

  test("reads, writes, and lists workspace files through registered executors", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "README.md"), "hello");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    await expect(executors.writeFile({
      id: "call-1",
      name: "writeFile",
      arguments: JSON.stringify({
        path: "src/app.ts",
        content: "export const value = 1;\n",
      }),
    })).resolves.toMatchObject({
      content: `wrote ${join("src", "app.ts")}`,
      metadata: {
        path: join("src", "app.ts"),
        bytes: 24,
      },
    });

    await expect(executors.readFile({
      id: "call-2",
      name: "readFile",
      arguments: JSON.stringify({ path: "src/app.ts" }),
    })).resolves.toMatchObject({
      content: "export const value = 1;\n",
      metadata: { path: join("src", "app.ts"), bytes: 24 },
    });

    await expect(executors.listFiles({
      id: "call-3",
      name: "listFiles",
      arguments: JSON.stringify({ path: "." }),
    })).resolves.toMatchObject({
      content: "README.md\nsrc/",
      metadata: { path: ".", count: 2 },
    });

    await expect(executors.readFile({
      id: "call-4",
      name: "readFile",
      arguments: JSON.stringify({ path: "README.md" }),
    })).resolves.toMatchObject({
      content: "hello",
      metadata: { path: "README.md", bytes: 5 },
    });
  });

  test("path-based workspace tools accept common model path argument aliases", async () => {
    const root = createWorkspace();
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "src", "app.ts"), "const value = 1;\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    await expect(executors.readFile({
      id: "call-read-file-path-alias",
      name: "readFile",
      arguments: JSON.stringify({ file_path: "src/app.ts" }),
    })).resolves.toMatchObject({
      content: "const value = 1;\n",
      metadata: { path: join("src", "app.ts") },
    });

    await expect(executors.writeFile({
      id: "call-write-file-path-alias",
      name: "writeFile",
      arguments: JSON.stringify({
        filePath: "src/generated.ts",
        content: "export const generated = true;\n",
      }),
    })).resolves.toMatchObject({
      content: `wrote ${join("src", "generated.ts")}`,
      metadata: { path: join("src", "generated.ts") },
    });
    expect(readFileSync(join(root, "src", "generated.ts"), "utf8")).toBe(
      "export const generated = true;\n"
    );

    await expect(executors.editFile({
      id: "call-edit-file-path-alias",
      name: "editFile",
      arguments: JSON.stringify({
        filename: "src/app.ts",
        oldText: "value = 1",
        newText: "value = 2",
      }),
    })).resolves.toMatchObject({
      metadata: { path: join("src", "app.ts"), replacements: 1 },
    });

    await expect(executors.listFiles({
      id: "call-list-file-path-alias",
      name: "listFiles",
      arguments: JSON.stringify({ file: "src" }),
    })).resolves.toMatchObject({
      metadata: { path: "src" },
    });
  });

  test("listFiles can limit directory overview results", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "a.txt"), "a");
    writeFileSync(join(root, "b.txt"), "b");
    writeFileSync(join(root, "c.txt"), "c");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.listFiles({
      id: "call-list-limit",
      name: "listFiles",
      arguments: JSON.stringify({ path: ".", maxResults: 2 }),
    });

    expect(result.content.split("\n")).toEqual(["a.txt", "b.txt"]);
    expect(result.metadata).toMatchObject({
      path: ".",
      count: 2,
      truncated: true,
      maxResults: 2,
      limitedByMaxResults: true,
      limitedByMaxDepth: false,
      visitedEntries: 2,
    });
  });

  test("listFiles can return a shallow recursive directory overview", async () => {
    const root = createWorkspace();
    mkdirSync(join(root, "docs", "drafts"), { recursive: true });
    writeFileSync(join(root, "docs", "guide.md"), "# Guide\n");
    writeFileSync(join(root, "docs", "drafts", "old.md"), "# Old\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.listFiles({
      id: "call-list-depth",
      name: "listFiles",
      arguments: JSON.stringify({ path: ".", maxDepth: 2 }),
    });

    expect(result.content.split("\n")).toEqual([
      "docs/",
      join("docs", "drafts") + "/",
      join("docs", "guide.md"),
    ]);
    expect(result.content).not.toContain("old.md");
    expect(result.metadata).toMatchObject({
      path: ".",
      maxDepth: 2,
      truncated: false,
      limitedByMaxDepth: true,
      visitedEntries: 3,
    });
  });

  test("listFiles reports filtered and depth-bounded overview metadata", async () => {
    const root = createWorkspace();
    mkdirSync(join(root, "docs", "drafts"), { recursive: true });
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "README.md"), "# Readme\n");
    writeFileSync(join(root, "docs", "guide.md"), "# Guide\n");
    writeFileSync(join(root, "docs", "drafts", "old.md"), "# Old\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.listFiles({
      id: "call-list-metadata",
      name: "listFiles",
      arguments: JSON.stringify({ path: ".", maxDepth: 1, entryType: "directories" }),
    });

    expect(result.content.split("\n")).toEqual(["docs/", "src/"]);
    expect(result.metadata).toMatchObject({
      path: ".",
      count: 2,
      entryType: "directories",
      maxDepth: 1,
      truncated: false,
      limitedByMaxResults: false,
      limitedByMaxDepth: true,
      visitedEntries: 3,
    });
  });

  test("listFiles can filter to directories or files", async () => {
    const root = createWorkspace();
    mkdirSync(join(root, "docs"), { recursive: true });
    writeFileSync(join(root, "README.md"), "# Readme\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const directories = await executors.listFiles({
      id: "call-list-dirs",
      name: "listFiles",
      arguments: JSON.stringify({ path: ".", entryType: "directories" }),
    });
    const files = await executors.listFiles({
      id: "call-list-files",
      name: "listFiles",
      arguments: JSON.stringify({ path: ".", entryType: "files" }),
    });

    expect(directories.content).toBe("docs/");
    expect(files.content).toBe("README.md");
  });

  test("listFiles falls back to defaults for invalid overview arguments", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "a.md"), "# A\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const badDepth = await executors.listFiles({
      id: "call-list-bad-depth",
      name: "listFiles",
      arguments: JSON.stringify({ maxDepth: 0 }),
    });
    expect(badDepth.content).toContain("a.md");
    expect(badDepth.metadata).toMatchObject({ maxDepth: 1 });
    expect(warningsOf(badDepth)).toEqual([
      "Ignored maxDepth: expected a positive integer, received 0. Using 1 instead.",
    ]);

    const badType = await executors.listFiles({
      id: "call-list-bad-type",
      name: "listFiles",
      arguments: JSON.stringify({ entryType: "images" }),
    });
    expect(badType.metadata).toMatchObject({ entryType: "all" });
    expect(warningsOf(badType)).toEqual([
      'Ignored entryType: expected one of all, files, directories, received "images". Using all instead.',
    ]);
  });

  test("readFile can return a focused line range without reading the whole visible file", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "notes.md"), [
      "line one",
      "line two",
      "line three",
      "line four",
      "",
    ].join("\n"));
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.readFile({
      id: "call-read-range",
      name: "readFile",
      arguments: JSON.stringify({ path: "notes.md", lines: "2-3" }),
    });

    expect(result.content).toBe("line two\nline three");
    expect(result.metadata).toMatchObject({
      path: "notes.md",
      startLine: 2,
      endLine: 3,
      totalLines: 4,
      truncated: true,
    });
    expect(Number(result.metadata?.bytes)).toBeLessThan(Number(result.metadata?.totalBytes));

    const openEnded = await executors.readFile({
      id: "call-read-open-range",
      name: "readFile",
      arguments: JSON.stringify({ path: "notes.md", lines: "3-" }),
    });
    expect(openEnded.content).toBe("line three\nline four");

    const count = await executors.readFile({
      id: "call-read-count",
      name: "readFile",
      arguments: JSON.stringify({ path: "notes.md", lines: "2" }),
    });
    expect(count.content).toBe("line one\nline two");
  });

  test("readFile automatically truncates massive files exceeding char limit with slice guidance", async () => {
    const root = createWorkspace();
    const largeLines = Array.from({ length: 1500 }, (_, i) => `line ${i + 1}: ${"x".repeat(30)}`);
    writeFileSync(join(root, "huge.txt"), largeLines.join("\n"));
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.readFile({
      id: "call-read-huge",
      name: "readFile",
      arguments: JSON.stringify({ path: "huge.txt" }),
    });

    expect(result.content).toContain("[... Omitted");
    expect(result.content).toContain("File exceeds safety limit");
    expect(result.content).toContain("Use lines=");
    expect(result.content.length).toBeLessThan(largeLines.join("\n").length);
    expect(result.metadata).toMatchObject({
      path: "huge.txt",
      totalLines: 1500,
      truncated: true,
      truncatedByCharLimit: true,
    });
  });

  test("readFile strictly caps character budget when file has multi-line ultra-long lines", async () => {
    const root = createWorkspace();
    // 150 lines, each line 1,000 chars = 150,000 chars total
    const giantLines = Array.from({ length: 150 }, (_, i) => `line ${i + 1}: ${"y".repeat(1000)}`);
    writeFileSync(join(root, "giant-lines.txt"), giantLines.join("\n"));
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.readFile({
      id: "call-read-giant-lines",
      name: "readFile",
      arguments: JSON.stringify({ path: "giant-lines.txt" }),
    });

    expect(result.content).toContain("[... Omitted");
    expect(result.content.length).toBeLessThanOrEqual(32_000);
    expect(result.metadata).toMatchObject({
      path: "giant-lines.txt",
      totalLines: 150,
      truncated: true,
      truncatedByCharLimit: true,
    });
  });

  test("readFile can return tail lines for logs and generated text", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "run.log"), [
      "boot",
      "load",
      "ready",
      "done",
      "",
    ].join("\n"));
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.readFile({
      id: "call-read-tail",
      name: "readFile",
      arguments: JSON.stringify({ path: "run.log", lines: "-2" }),
    });

    expect(result.content).toBe("ready\ndone");
    expect(result.metadata).toMatchObject({
      path: "run.log",
      startLine: 3,
      endLine: 4,
      totalLines: 4,
      truncated: true,
      tailLines: 2,
    });
  });

  test("readFile still honours the legacy integer arguments, with a deprecation warning", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "notes.md"), "one\ntwo\nthree\nfour\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    // In-flight callers keep working; the warning points them at `lines`.
    const legacy = await executors.readFile({
      id: "call-read-legacy",
      name: "readFile",
      arguments: JSON.stringify({ path: "notes.md", startLine: 2, endLine: 3 }),
    });
    expect(legacy.content).toBe("two\nthree");
    expect(warningsOf(legacy)[0]).toBe(
      'startLine, endLine are deprecated; use lines instead ("40-120", "120-", "-50", or "50").',
    );

    // `lines` wins outright rather than being merged with the legacy arguments.
    const both = await executors.readFile({
      id: "call-read-both",
      name: "readFile",
      arguments: JSON.stringify({ path: "notes.md", lines: "1-2", tailLines: 1 }),
    });
    expect(both.content).toBe("one\ntwo");
    expect(warningsOf(both)[0]).toBe("Ignored tailLines: superseded by lines.");
  });

  test("readFile drops an unusable lines argument and reports it instead of failing", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "notes.md"), "one\ntwo\nthree\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const garbage = await executors.readFile({
      id: "call-read-bad-lines",
      name: "readFile",
      arguments: JSON.stringify({ path: "notes.md", lines: "second half" }),
    });
    expect(garbage.content).toBe("one\ntwo\nthree");
    expect(warningsOf(garbage)[0]).toBe(
      'Ignored lines: expected "40-120", "120-", "-50", or "50", received "second half".',
    );
    expect(warningsOf(garbage)[1]).toContain("returned the first 200 lines");
    expect(warningsOf(garbage).at(-1)).toContain("File has 3 lines.");

    // An inverted range is reported as such rather than as bad syntax.
    const inverted = await executors.readFile({
      id: "call-read-inverted",
      name: "readFile",
      arguments: JSON.stringify({ path: "notes.md", lines: "3-1" }),
    });
    expect(warningsOf(inverted)[0]).toBe(
      'Ignored lines "3-1": the end line must be greater than or equal to the start line.',
    );

    const wrongType = await executors.readFile({
      id: "call-read-lines-number",
      name: "readFile",
      arguments: JSON.stringify({ path: "notes.md", lines: 40 }),
    });
    expect(warningsOf(wrongType)[0]).toBe(
      'Ignored lines: expected "40-120", "120-", "-50", or "50", received 40.',
    );
  });

  test("readFile drops invalid legacy arguments and reports them instead of failing", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "notes.md"), "one\ntwo\nthree\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const badStart = await executors.readFile({
      id: "call-read-bad-start",
      name: "readFile",
      arguments: JSON.stringify({ path: "notes.md", startLine: 0 }),
    });
    expect(badStart.content).toBe("one\ntwo\nthree");
    expect(warningsOf(badStart)[1]).toBe(
      "Ignored startLine: expected a positive integer, received 0.",
    );
    expect(warningsOf(badStart)[2]).toContain("returned the first 200 lines");

    // endLine < startLine drops only endLine; the startLine hit is kept.
    const badEnd = await executors.readFile({
      id: "call-read-bad-end",
      name: "readFile",
      arguments: JSON.stringify({ path: "notes.md", startLine: 2, endLine: 1, force: true }),
    });
    expect(badEnd.content).toBe("two\nthree");
    expect(warningsOf(badEnd)[1]).toBe(
      "Ignored endLine (1): endLine must be greater than or equal to startLine (2).",
    );

    // The explicit range wins over the tail; tailLines is the one dropped.
    const badCombo = await executors.readFile({
      id: "call-read-bad-combo",
      name: "readFile",
      arguments: JSON.stringify({ path: "notes.md", startLine: 2, tailLines: 1, force: true }),
    });
    expect(badCombo.content).toBe("two\nthree");
    expect(warningsOf(badCombo)[1]).toBe(
      "Ignored tailLines (1): tailLines cannot be combined with startLine or endLine.",
    );

    // Non-numeric legacy input reaches readIntegerArg through the deprecation
    // branch, not the `lines` parser. Drop this with LEGACY_SLICE_ARG_NAMES.
    const badTail = await executors.readFile({
      id: "call-read-bad-tail",
      name: "readFile",
      arguments: JSON.stringify({ path: "notes.md", tailLines: "not-a-number", force: true }),
    });
    expect(badTail.content).toBe("one\ntwo\nthree");
    expect(warningsOf(badTail)[1]).toBe(
      'Ignored tailLines: expected a positive integer, received "not-a-number".',
    );
    expect(warningsOf(badTail)[2]).toContain("returned the first 200 lines");
  });

  test("readFile treats null slice arguments as not provided", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "notes.md"), "one\ntwo\nthree\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    // Models emitting JSON arguments routinely null out optional fields they
    // are not using; that must not shrink the read or raise warnings.
    const result = await executors.readFile({
      id: "call-read-nulls",
      name: "readFile",
      arguments: JSON.stringify({
        path: "notes.md",
        startLine: null,
        endLine: null,
        maxLines: null,
        tailLines: null,
      }),
    });

    // Verbatim content, trailing newline included: an all-absent call takes the
    // untouched whole-file path, not the line-rejoining slice path.
    expect(result.content).toBe("one\ntwo\nthree\n");
    expect(result.metadata).not.toHaveProperty("warnings");
    expect(result.metadata).toMatchObject({ truncated: false, totalLines: 3 });
  });

  test("readFile leaves valid reads free of warnings", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "notes.md"), "one\ntwo\nthree\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.readFile({
      id: "call-read-clean",
      name: "readFile",
      arguments: JSON.stringify({ path: "notes.md", lines: "2-" }),
    });

    expect(result.content).toBe("two\nthree");
    expect(result.metadata).not.toHaveProperty("warnings");
  });

  test("readFile answers repeated reads of unchanged delivered ranges with a notice", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "notes.md"), "one\ntwo\nthree\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const first = await executors.readFile({
      id: "call-dedup-first",
      name: "readFile",
      arguments: JSON.stringify({ path: "notes.md" }),
    });
    expect(first.content).toBe("one\ntwo\nthree\n");
    expect(first.metadata).not.toHaveProperty("deduped");

    const repeat = await executors.readFile({
      id: "call-dedup-repeat",
      name: "readFile",
      arguments: JSON.stringify({ path: "notes.md" }),
    });
    expect(repeat.metadata).toMatchObject({ deduped: true, path: "notes.md" });
    expect(repeat.content).toContain("not resending");
    expect(repeat.content).not.toContain("one\ntwo\nthree");

    const subset = await executors.readFile({
      id: "call-dedup-subset",
      name: "readFile",
      arguments: JSON.stringify({ path: "notes.md", lines: "2-3" }),
    });
    expect(subset.metadata).toMatchObject({ deduped: true });

    const forced = await executors.readFile({
      id: "call-dedup-forced",
      name: "readFile",
      arguments: JSON.stringify({ path: "notes.md", lines: "2-3", force: true }),
    });
    expect(forced.content).toBe("two\nthree");
    expect(forced.metadata).not.toHaveProperty("deduped");

    // A changed file invalidates the ledger fingerprint.
    writeFileSync(join(root, "notes.md"), "one\ntwo\nfour\n");
    const afterEdit = await executors.readFile({
      id: "call-dedup-after-edit",
      name: "readFile",
      arguments: JSON.stringify({ path: "notes.md" }),
    });
    expect(afterEdit.content).toBe("one\ntwo\nfour\n");
    expect(afterEdit.metadata).not.toHaveProperty("deduped");
  });

  test("readFile dedup gate measures the persisted message including metadata", async () => {
    // The durable tool message embeds the metadata JSON for readFile, so a
    // bare content length just under the cap can persist above it — such a
    // read must stay re-readable.
    const root = createWorkspace();
    writeFileSync(join(root, "edge-over.md"), "o".repeat(4700));
    writeFileSync(join(root, "edge-under.md"), "u".repeat(4500));
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    await executors.readFile({ id: "call-edge-over-1", name: "readFile", arguments: JSON.stringify({ path: "edge-over.md" }) });
    const over = await executors.readFile({ id: "call-edge-over-2", name: "readFile", arguments: JSON.stringify({ path: "edge-over.md" }) });
    expect(over.metadata).not.toHaveProperty("deduped");

    await executors.readFile({ id: "call-edge-under-1", name: "readFile", arguments: JSON.stringify({ path: "edge-under.md" }) });
    const under = await executors.readFile({ id: "call-edge-under-2", name: "readFile", arguments: JSON.stringify({ path: "edge-under.md" }) });
    expect(under.metadata).toMatchObject({ deduped: true });
  });

  test("readFile keeps re-reading files too large to stay intact in history", async () => {
    const root = createWorkspace();
    const big = Array.from({ length: 80 }, (_, i) => `line ${i + 1}: ${"z".repeat(80)}`).join("\n");
    writeFileSync(join(root, "big.md"), big);
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const first = await executors.readFile({
      id: "call-big-first",
      name: "readFile",
      arguments: JSON.stringify({ path: "big.md" }),
    });
    expect(first.metadata).not.toHaveProperty("deduped");

    const second = await executors.readFile({
      id: "call-big-second",
      name: "readFile",
      arguments: JSON.stringify({ path: "big.md" }),
    });
    expect(second.metadata).not.toHaveProperty("deduped");
    expect(second.content).toBe(big);
  });

  test("echoes phase/action activity metadata without affecting execution", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "README.md"), "hello");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    await expect(executors.readFile({
      id: "call-activity",
      name: "readFile",
      arguments: JSON.stringify({
        path: "README.md",
        _activity: {
          phase: {
            id: "inspect-docs",
            title: "检查项目文档",
            index: 1,
            total: 3,
          },
          action: {
            title: "查看 README",
            kind: "read",
            refs: [{ type: "file", path: "README.md" }],
          },
          plan: {
            title: "任务进度",
            phases: [
              { id: "inspect-docs", title: "检查项目文档" },
              { id: "summarize", title: "总结发现" },
            ],
          },
        },
      }),
    })).resolves.toMatchObject({
      content: "hello",
      metadata: {
        activity: {
          phase: {
            id: "inspect-docs",
            title: "检查项目文档",
            index: 1,
            total: 3,
          },
          action: {
            title: "查看 README",
            kind: "read",
            refs: [{ type: "file", path: "README.md" }],
          },
          plan: {
            title: "任务进度",
            phases: [
              { id: "inspect-docs", title: "检查项目文档" },
              { id: "summarize", title: "总结发现" },
            ],
          },
        },
      },
    });
  });

  test("echoes plan-only activity metadata without requiring an action", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "README.md"), "hello");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    await expect(executors.readFile({
      id: "call-plan-only",
      name: "readFile",
      arguments: JSON.stringify({
        path: "README.md",
        _activity: {
          plan: {
            phases: [
              { id: "inspect", title: "检查输入" },
              { id: "report", title: "汇报结果" },
            ],
          },
        },
      }),
    })).resolves.toMatchObject({
      metadata: {
        activity: {
          plan: {
            phases: [
              { id: "inspect", title: "检查输入", index: 1 },
              { id: "report", title: "汇报结果", index: 2 },
            ],
          },
        },
      },
    });
  });

  test("replaces exact workspace text without requiring a patch", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "src.css"), [
      ".panel {",
      "  display: flex;",
      "  flex-wrap: nowrap;",
      "}",
      "",
    ].join("\n"));
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    await expect(executors.editFile({
      id: "call-replace",
      name: "editFile",
      arguments: JSON.stringify({
        path: "src.css",
        oldText: "  flex-wrap: nowrap;",
        newText: "  flex-wrap: wrap;",
      }),
    })).resolves.toMatchObject({
      content: "replaced 1 occurrence in src.css",
      metadata: { path: "src.css", replacements: 1 },
    });

    await expect(executors.readFile({
      id: "call-read",
      name: "readFile",
      arguments: JSON.stringify({ path: "src.css" }),
    })).resolves.toMatchObject({
      content: expect.stringContaining("flex-wrap: wrap;"),
    });
  });

  test("supports editFile as a structured exact-text edit tool", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "src.ts"), "export const value = 1;\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    await expect(executors.editFile({
      id: "call-edit",
      name: "editFile",
      arguments: JSON.stringify({
        path: "src.ts",
        oldText: "value = 1",
        newText: "value = 2",
      }),
    })).resolves.toMatchObject({
      content: "replaced 1 occurrence in src.ts",
      metadata: { path: "src.ts", replacements: 1 },
    });
    // editFile exposes old/new snippets so the TUI trace can show what changed.
    const result = await executors.editFile({
      id: "call-edit-snippet",
      name: "editFile",
      arguments: JSON.stringify({
        path: "src.ts",
        oldText: "value = 2",
        newText: "value = 3",
      }),
    });
    expect(result.metadata).toMatchObject({
      oldSnippet: "value = 2",
      newSnippet: "value = 3",
    });
  });

  test("rejects ambiguous workspace text replacements", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "src.css"), "color: red;\ncolor: red;\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    await expect(executors.editFile({
      id: "call-replace",
      name: "editFile",
      arguments: JSON.stringify({
        path: "src.css",
        oldText: "color: red;",
        newText: "color: blue;",
      }),
    })).rejects.toThrow("expected 1 replacement but found 2");
  });

  test("editFile matches LF oldText against a CRLF file and preserves CRLF", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "win.ts"), "const a = 1;\r\nconst b = 2;\r\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    await expect(executors.editFile({
      id: "call-crlf-lf",
      name: "editFile",
      arguments: JSON.stringify({
        path: "win.ts",
        oldText: "const a = 1;\nconst b = 2;",
        newText: "const a = 10;\nconst b = 20;",
      }),
    })).resolves.toMatchObject({
      content: "replaced 1 occurrence in win.ts",
      metadata: { path: "win.ts", replacements: 1 },
    });
    // File must remain CRLF after the edit.
    expect(readFileSync(join(root, "win.ts"), "utf8")).toBe(
      "const a = 10;\r\nconst b = 20;\r\n"
    );
  });

  test("editFile on a pure LF file behaves identically (no regression)", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "unix.ts"), "const a = 1;\nconst b = 2;\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    await expect(executors.editFile({
      id: "call-lf-lf",
      name: "editFile",
      arguments: JSON.stringify({
        path: "unix.ts",
        oldText: "const a = 1;\nconst b = 2;",
        newText: "const a = 10;\nconst b = 20;",
      }),
    })).resolves.toMatchObject({
      content: "replaced 1 occurrence in unix.ts",
      metadata: { path: "unix.ts", replacements: 1 },
    });
    expect(readFileSync(join(root, "unix.ts"), "utf8")).toBe(
      "const a = 10;\nconst b = 20;\n"
    );
  });

  test("editFile matches CRLF oldText against a CRLF file", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "win2.ts"), "const x = 1;\r\nconst y = 2;\r\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    await expect(executors.editFile({
      id: "call-crlf-crlf",
      name: "editFile",
      arguments: JSON.stringify({
        path: "win2.ts",
        oldText: "const x = 1;\r\nconst y = 2;",
        newText: "const x = 10;\r\nconst y = 20;",
      }),
    })).resolves.toMatchObject({
      content: "replaced 1 occurrence in win2.ts",
      metadata: { path: "win2.ts", replacements: 1 },
    });
    expect(readFileSync(join(root, "win2.ts"), "utf8")).toBe(
      "const x = 10;\r\nconst y = 20;\r\n"
    );
  });

  test("editFile still rejects when expectedReplacements mismatches after normalization", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "dup.ts"), "line\r\nline\r\nline\r\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    await expect(executors.editFile({
      id: "call-crlf-mismatch",
      name: "editFile",
      arguments: JSON.stringify({
        path: "dup.ts",
        oldText: "line",
        newText: "row",
      }),
    })).rejects.toThrow("expected 1 replacement but found 3");
  });

  test("editFile mixed-EOL file: reported count equals actual replacements, unmatched EOL preserved", async () => {
    const root = createWorkspace();
    // 3 LF + 1 CRLF → dominant is LF, but the CRLF occurrence must still match.
    writeFileSync(join(root, "m.ts"), "a\nTARGET\r\nb\nTARGET\nc\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    await expect(executors.editFile({
      id: "call-mixed-eol",
      name: "editFile",
      arguments: JSON.stringify({
        path: "m.ts",
        oldText: "TARGET\n",
        newText: "DONE\n",
        expectedReplacements: 2,
      }),
    })).resolves.toMatchObject({
      content: "replaced 2 occurrences in m.ts",
      metadata: { path: "m.ts", replacements: 2 },
    });
    // Both TARGETs replaced; the CRLF at the first match site is preserved
    // as CRLF in the output, the LF at the second stays LF.
    expect(readFileSync(join(root, "m.ts"), "utf8")).toBe(
      "a\nDONE\r\nb\nDONE\nc\n"
    );
  });

  test("editFile mixed-EOL file: expectedReplacements mismatch still throws", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "m2.ts"), "a\nTARGET\r\nb\nTARGET\nc\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    await expect(executors.editFile({
      id: "call-mixed-eol-mismatch",
      name: "editFile",
      arguments: JSON.stringify({
        path: "m2.ts",
        oldText: "TARGET\n",
        newText: "DONE\n",
        expectedReplacements: 1,
      }),
    })).rejects.toThrow("expected 1 replacement but found 2");
  });

  test("subprocess-backed workspace tools preserve command output", () => {
    const proc = Bun.spawnSync(["bun", "packages/agent-runtime/localWorkspaceTools.subprocessProbe.ts"], {
      stdout: "inherit",
      stderr: "inherit",
    });
    expect(proc.exitCode).toBe(0);
  });

  test("detached execShell child is cleaned up when the host receives SIGHUP", () => {
    // Reproduces the TUI-close scenario: execShell spawns a detached child in its
    // own process group so timeout cleanup can kill the whole tree. Without
    // forwarding the host's SIGHUP, that child survives terminal close and
    // keeps running in the background. The probe issues execShell then SIGHUPs
    // itself; a survivor writes a proof file, a killed child does not.
    const proc = Bun.spawnSync(["bun", "packages/agent-runtime/localWorkspaceTools.signalProbe.ts"], {
      stdout: "inherit",
      stderr: "inherit",
    });
    expect(proc.exitCode).toBe(0);
  }, 15000);

  test("globFiles finds files by glob pattern without reading file contents", async () => {
    const root = createWorkspace();
    mkdirSync(join(root, "src"), { recursive: true });
    mkdirSync(join(root, "test-results"), { recursive: true });
    writeFileSync(join(root, "src", "alpha.ts"), "export const alpha = 1;\n");
    writeFileSync(join(root, "src", "beta.js"), "export const beta = 2;\n");
    writeFileSync(join(root, "test-results", "hidden.ts"), "export const hidden = 3;\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.globFiles({
      id: "call-glob",
      name: "globFiles",
      arguments: JSON.stringify({ pattern: "**/*.ts", path: "src" }),
    });

    expect(result.content).toBe(join("src", "alpha.ts"));
    expect(result.content).not.toContain("beta.js");
    expect(result.content).not.toContain("hidden.ts");
    expect(result.metadata).toMatchObject({
      pattern: "**/*.ts",
      path: "src",
      count: 1,
      exitCode: 0,
    });
  });

  test("globFiles can limit file discovery results", async () => {
    const root = createWorkspace();
    mkdirSync(join(root, "aaa"), { recursive: true });
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "aaa", "outside-one.ts"), "export const outsideOne = 1;\n");
    writeFileSync(join(root, "aaa", "outside-two.ts"), "export const outsideTwo = 2;\n");
    writeFileSync(join(root, "src", "alpha.ts"), "export const alpha = 1;\n");
    writeFileSync(join(root, "src", "beta.ts"), "export const beta = 2;\n");
    writeFileSync(join(root, "src", "gamma.ts"), "export const gamma = 3;\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.globFiles({
      id: "call-glob-limit",
      name: "globFiles",
      arguments: JSON.stringify({ pattern: "**/*.ts", path: "src", maxResults: 2 }),
    });

    expect(result.content.split("\n")).toHaveLength(2);
    expect(result.content).toContain(join("src", "alpha.ts"));
    expect(result.content).not.toContain("outside");
    expect(result.metadata).toMatchObject({
      pattern: "**/*.ts",
      path: "src",
      effectivePattern: "src/**/*.ts",
      searchedPath: "src",
      count: 2,
      truncated: true,
      limitedByMaxResults: true,
      maxResults: 2,
    });
  });

  test("globFiles can exclude matching paths across general workspace files", async () => {
    const root = createWorkspace();
    mkdirSync(join(root, "docs"), { recursive: true });
    mkdirSync(join(root, "exports"), { recursive: true });
    mkdirSync(join(root, "assets"), { recursive: true });
    writeFileSync(join(root, "docs", "guide.md"), "# Guide\n");
    writeFileSync(join(root, "exports", "report.md"), "# Report\n");
    writeFileSync(join(root, "assets", "caption.md"), "# Caption\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.globFiles({
      id: "call-glob-exclude",
      name: "globFiles",
      arguments: JSON.stringify({
        pattern: "**/*.md",
        exclude: ["exports/**", "assets/**"],
      }),
    });

    expect(result.content).toBe(join("docs", "guide.md"));
    expect(result.metadata).toMatchObject({
      pattern: "**/*.md",
      effectivePattern: "**/*.md",
      searchedPath: ".",
      exclude: ["exports/**", "assets/**"],
      count: 1,
      totalCount: 1,
      truncated: false,
      limitedByMaxResults: false,
    });
  });

  test("globFiles accepts a single exclude glob string", async () => {
    const root = createWorkspace();
    mkdirSync(join(root, "docs"), { recursive: true });
    mkdirSync(join(root, "archive"), { recursive: true });
    writeFileSync(join(root, "docs", "guide.md"), "# Guide\n");
    writeFileSync(join(root, "archive", "old.md"), "# Old\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.globFiles({
      id: "call-glob-exclude-string",
      name: "globFiles",
      arguments: JSON.stringify({ pattern: "**/*.md", exclude: "archive/**" }),
    });

    expect(result.content).toBe(join("docs", "guide.md"));
    expect(result.metadata).toMatchObject({
      exclude: ["archive/**"],
      count: 1,
    });
  });

  test("globFiles combines path, exclude, and maxResults", async () => {
    const root = createWorkspace();
    mkdirSync(join(root, "docs", "drafts"), { recursive: true });
    writeFileSync(join(root, "docs", "alpha.md"), "# Alpha\n");
    writeFileSync(join(root, "docs", "beta.md"), "# Beta\n");
    writeFileSync(join(root, "docs", "drafts", "gamma.md"), "# Gamma\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.globFiles({
      id: "call-glob-combo",
      name: "globFiles",
      arguments: JSON.stringify({
        pattern: "**/*.md",
        path: "docs",
        exclude: ["docs/drafts/**"],
        maxResults: 1,
      }),
    });

    expect(result.content).toBe(join("docs", "alpha.md"));
    expect(result.content).not.toContain("drafts");
    expect(result.metadata).toMatchObject({
      path: "docs",
      exclude: ["docs/drafts/**"],
      count: 1,
      truncated: true,
      maxResults: 1,
    });
  });

  test("globFiles validates exclude and maxResults arguments", async () => {
    const root = createWorkspace();
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    await expect(executors.globFiles({
      id: "call-bad-exclude",
      name: "globFiles",
      arguments: JSON.stringify({ pattern: "**/*.md", exclude: 42 }),
    })).rejects.toThrow("exclude must be a glob string or an array of glob strings");

    // An unusable maxResults drops the cap rather than the whole search.
    const badMax = await executors.globFiles({
      id: "call-bad-max",
      name: "globFiles",
      arguments: JSON.stringify({ pattern: "**/*.md", maxResults: 0 }),
    });
    expect(warningsOf(badMax)).toEqual([
      "Ignored maxResults: expected a positive integer, received 0.",
    ]);
  });

  test("globFiles respects gitignore unless includeIgnored is true", async () => {
    const root = createWorkspace();
    mkdirSync(join(root, ".tmp"), { recursive: true });
    writeFileSync(join(root, ".gitignore"), ".tmp/\n");
    writeFileSync(join(root, ".tmp", "hidden.md"), "# Hidden\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const defaultResult = await executors.globFiles({
      id: "call-ignored-default",
      name: "globFiles",
      arguments: JSON.stringify({ pattern: ".tmp/**/*.md" }),
    });
    const includedResult = await executors.globFiles({
      id: "call-ignored-included",
      name: "globFiles",
      arguments: JSON.stringify({ pattern: ".tmp/**/*.md", includeIgnored: true }),
    });

    expect(defaultResult.content).toBe("");
    expect(defaultResult.metadata).toMatchObject({ count: 0 });
    expect(includedResult.content).toBe(join(".tmp", "hidden.md"));
    expect(includedResult.metadata).toMatchObject({
      count: 1,
      includeIgnored: true,
    });
  });

  test("searchFiles can exclude paths and limit content matches across general files", async () => {
    const root = createWorkspace();
    mkdirSync(join(root, "docs"), { recursive: true });
    mkdirSync(join(root, "exports"), { recursive: true });
    mkdirSync(join(root, "logs"), { recursive: true });
    writeFileSync(join(root, "docs", "alpha.md"), "release note: alpha\n");
    writeFileSync(join(root, "docs", "beta.md"), "release note: beta\n");
    writeFileSync(join(root, "exports", "old.md"), "release note: old\n");
    writeFileSync(join(root, "logs", "run.log"), "release note: log\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.searchFiles({
      id: "call-search-limit",
      name: "searchFiles",
      arguments: JSON.stringify({
        query: "release note",
        exclude: ["exports/**", "logs/**"],
        maxResults: 1,
      }),
    });

    expect(result.content).toMatch(/docs\/(alpha|beta)\.md:1:release note: (alpha|beta)/);
    expect(result.content.split("\n")).toHaveLength(1);
    expect(result.content).not.toContain("exports");
    expect(result.content).not.toContain("logs");
    expect(result.metadata).toMatchObject({
      query: "release note",
      path: ".",
      searchedPath: ".",
      exclude: ["exports/**", "logs/**"],
      count: 1,
      matchCount: 1,
      truncated: true,
      limitedByMaxResults: true,
      maxResults: 1,
    });
    expect(result.metadata?.matchedFiles).toHaveLength(1);
    expect(String((result.metadata?.matchedFiles as string[])[0])).toMatch(/docs\/(alpha|beta)\.md/);
  });

  test("searchFiles supports literal, case-insensitive, and context searches", async () => {
    const root = createWorkspace();
    mkdirSync(join(root, "notes"), { recursive: true });
    writeFileSync(join(root, "notes", "meeting.md"), [
      "before",
      "TODO: use a+b literally",
      "after",
      "",
    ].join("\n"));
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.searchFiles({
      id: "call-search-literal",
      name: "searchFiles",
      arguments: JSON.stringify({
        query: "todo: use a+b",
        path: "notes",
        literal: true,
        caseSensitive: false,
        contextLines: 1,
      }),
    });

    expect(result.content).toContain(`${join("notes", "meeting.md")}-1-before`);
    expect(result.content).toContain(`${join("notes", "meeting.md")}:2:TODO: use a+b literally`);
    expect(result.content).toContain(`${join("notes", "meeting.md")}-3-after`);
    expect(result.metadata).toMatchObject({
      path: "notes",
      searchedPath: "notes",
      literal: true,
      caseSensitive: false,
      contextLines: 1,
      count: 3,
      matchCount: 1,
      matchedFiles: [join("notes", "meeting.md")],
      truncated: false,
      limitedByMaxResults: false,
    });
  });

  test("searchFiles maxResults with context keeps the matching line", async () => {
    const root = createWorkspace();
    mkdirSync(join(root, "notes"), { recursive: true });
    writeFileSync(join(root, "notes", "one.md"), [
      "before one",
      "TARGET first",
      "after one",
      "",
    ].join("\n"));
    writeFileSync(join(root, "notes", "two.md"), [
      "before two",
      "TARGET second",
      "after two",
      "",
    ].join("\n"));
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.searchFiles({
      id: "call-search-context-limit",
      name: "searchFiles",
      arguments: JSON.stringify({
        query: "TARGET",
        path: "notes",
        contextLines: 1,
        maxResults: 1,
      }),
    });

    expect(result.content).toContain(":2:TARGET");
    expect(result.content).toMatch(/notes\/(one|two)\.md-1-before/);
    expect(result.content).toMatch(/notes\/(one|two)\.md-3-after/);
    expect(result.content.match(/:2:TARGET/g)).toHaveLength(1);
    expect(result.metadata).toMatchObject({
      maxResults: 1,
      truncated: true,
    });
  });

  test("searchFiles validates exclude, maxResults, and context arguments", async () => {
    const root = createWorkspace();
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    await expect(executors.searchFiles({
      id: "call-bad-search-exclude",
      name: "searchFiles",
      arguments: JSON.stringify({ query: "needle", exclude: 42 }),
    })).rejects.toThrow("exclude must be a glob string or an array of glob strings");

    // maxResults falls back to the search default; contextLines just drops.
    const badMax = await executors.searchFiles({
      id: "call-bad-search-max",
      name: "searchFiles",
      arguments: JSON.stringify({ query: "needle", maxResults: 0 }),
    });
    expect(warningsOf(badMax)).toEqual([
      "Ignored maxResults: expected a positive integer, received 0. Using 200 instead.",
    ]);
    expect(badMax.metadata).toMatchObject({ maxResults: 200 });

    const badContext = await executors.searchFiles({
      id: "call-bad-search-context",
      name: "searchFiles",
      arguments: JSON.stringify({ query: "needle", contextLines: -1 }),
    });
    expect(warningsOf(badContext)).toEqual([
      "Ignored contextLines: expected a non-negative integer, received -1.",
    ]);
    expect(badContext.metadata).not.toHaveProperty("contextLines");
  });

  test("searchFiles excludes build artifacts even with includeIgnored: true", async () => {
    const root = createWorkspace();
    mkdirSync(join(root, "public", "assets"), { recursive: true });
    writeFileSync(join(root, "tsconfig.tsbuildinfo"), '{"needle": true}\n');
    writeFileSync(join(root, "public", "assets", "style.css"), ".needle { color: red; }\n");
    writeFileSync(join(root, "src.ts"), "const needle = 1;\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.searchFiles({
      id: "call-always-exclude",
      name: "searchFiles",
      arguments: JSON.stringify({ query: "needle", includeIgnored: true }),
    });

    const content = String(result.content);
    expect(content).toContain("src.ts");
    expect(content).not.toContain("tsbuildinfo");
    expect(content).not.toContain("public/assets");
    expect(ALWAYS_EXCLUDED_GLOBS).toContain("*.tsbuildinfo");
    expect(ALWAYS_EXCLUDED_GLOBS).toContain("public/assets/**");
  });

  test("searchFiles applies default maxResults=200 when not specified", async () => {
    const root = createWorkspace();
    mkdirSync(join(root, "src"), { recursive: true });
    const lines = Array.from({ length: 250 }, (_, i) => `needle line ${i}`);
    writeFileSync(join(root, "src", "many.txt"), lines.join("\n") + "\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.searchFiles({
      id: "call-default-max",
      name: "searchFiles",
      arguments: JSON.stringify({ query: "needle" }),
    });

    expect(result.metadata?.limitedByMaxResults).toBe(true);
    expect(result.metadata?.truncated).toBe(true);
    expect(result.metadata?.maxResults).toBe(200);
    const matchLines = String(result.content).split("\n").filter((l: string) => /:\d+:/.test(l));
    expect(matchLines.length).toBeLessThanOrEqual(200);
  });

  test("searchFiles explicit maxResults still takes effect", async () => {
    const root = createWorkspace();
    mkdirSync(join(root, "src"), { recursive: true });
    const lines = Array.from({ length: 50 }, (_, i) => `needle line ${i}`);
    writeFileSync(join(root, "src", "many.txt"), lines.join("\n") + "\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.searchFiles({
      id: "call-explicit-max",
      name: "searchFiles",
      arguments: JSON.stringify({ query: "needle", maxResults: 5 }),
    });

    expect(result.metadata?.limitedByMaxResults).toBe(true);
    expect(result.metadata?.maxResults).toBe(5);
    const matchLines = String(result.content).split("\n").filter((l: string) => /:\d+:/.test(l));
    expect(matchLines.length).toBeLessThanOrEqual(5);
  });

  test("searchFiles truncates single long match exceeding byte limit", async () => {
    const root = createWorkspace();
    mkdirSync(join(root, "src"), { recursive: true });
    const longLine = `needle ${"x".repeat(30_000)}`;
    writeFileSync(join(root, "src", "huge.css"), longLine + "\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.searchFiles({
      id: "call-byte-limit",
      name: "searchFiles",
      arguments: JSON.stringify({ query: "needle", maxResults: 10 }),
    });

    expect(String(result.content).length).toBeLessThanOrEqual(20_000);
    expect(result.metadata?.truncatedByByteLimit).toBe(true);
    expect(result.metadata?.truncated).toBe(true);
  });

  test("searchFiles normal small result set is unchanged (regression)", async () => {
    const root = createWorkspace();
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "src", "app.ts"), "const x = 1;\nconst y = 2;\n");
    writeFileSync(join(root, "src", "util.ts"), "export const z = 3;\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.searchFiles({
      id: "call-normal",
      name: "searchFiles",
      arguments: JSON.stringify({ query: "export const" }),
    });

    expect(result.metadata?.limitedByMaxResults).toBe(false);
    expect(result.metadata?.truncated).toBe(false);
    expect(result.metadata?.matchCount).toBe(1);
    expect(String(result.content)).toContain("src/util.ts:1:export const z = 3;");
  });

  test("searchFiles falls back to JS when rg and grep are unavailable even with .gitignore", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, ".gitignore"), "node_modules/\n");
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "src", "needle.ts"), "const winSearchFallbackNeedle = 42;\n");
    const executors = createLocalWorkspaceToolExecutors({
      workspaceRoot: root,
      resolveRipgrepBinary: () => null,
      resolveGrepBinary: () => null,
    });
    const result = await executors.searchFiles({
      id: "call-js-fallback-gitignore",
      name: "searchFiles",
      arguments: JSON.stringify({ query: "winSearchFallbackNeedle" }),
    });

    expect(String(result.content)).toContain("winSearchFallbackNeedle");
    expect(result.metadata).toMatchObject({
      matchCount: 1,
      searchEngine: "js",
      truncated: false,
    });
    expect(String((result.metadata?.matchedFiles as string[])[0])).toContain("needle.ts");
  });

  test("globFiles falls back to JS when rg is unavailable without throwing ENOENT", async () => {
    const root = createWorkspace();
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "src", "alpha.ts"), "export const a = 1;\n");
    writeFileSync(join(root, "src", "beta.ts"), "export const b = 2;\n");
    const executors = createLocalWorkspaceToolExecutors({
      workspaceRoot: root,
      resolveRipgrepBinary: () => null,
    });
    const result = await executors.globFiles({
      id: "call-glob-js-fallback",
      name: "globFiles",
      arguments: JSON.stringify({ pattern: "src/**/*.ts" }),
    });

    expect(result.content.split("\n").sort()).toEqual([
      join("src", "alpha.ts"),
      join("src", "beta.ts"),
    ].sort());
    expect(result.metadata).toMatchObject({
      count: 2,
      searchEngine: "js",
      truncated: false,
    });
  });

  test("does not register removed semantic git and patch/script executors", () => {
    const root = createWorkspace();
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const removedPatchTool = "apply" + "Patch";
    const removedScriptTool = "runPackage" + "Script";
    for (const toolName of [
      removedPatchTool,
      removedScriptTool,
      "gitStatus",
      "gitDiff",
      "gitCreateBranch",
      "gitAdd",
      "gitCommit",
      "commitWorkspace",
    ]) {
      expect(executors).not.toHaveProperty(toolName);
    }
  });

  test("builds and exposes a semantic visual state capture tool", () => {
    const toolNames = buildLocalWorkspaceToolset({
      declaredToolNames: ["captureVisualState"],
    }).toolNames;
    expect(toolNames).toContain("captureVisualState");

    const tools = buildLocalWorkspaceOpenAiTools({
      toolNames: ["captureVisualState"],
    });
    expect(tools).toHaveLength(1);
    expect((tools[0].function as any).name).toBe("captureVisualState");
    expect((tools[0].function as any).parameters.required).toEqual(["waitSelector"]);
    expect((tools[0].function as any).parameters.properties).toHaveProperty("focusSelector");
    expect((tools[0].function as any).parameters.properties).toHaveProperty("expectText");
    expect((tools[0].function as any).parameters.properties).toHaveProperty("screenshotPath");
    expect((tools[0].function as any).parameters.properties).toHaveProperty("metricsPath");
  });

  test("builds OpenAI-compatible tool definitions for declared workspace tools", () => {
    const tools = buildLocalWorkspaceOpenAiTools({
      toolNames: [
        "listFiles",
        "readFile",
        "writeFile",
        "editFile",
        "globFiles",
        "execShell",
        "searchFiles",
      ],
      exposeShellTools: true,
    });
    expect(tools.map((tool) => (tool.function as any).name)).toEqual([
      "listFiles",
      "readFile",
      "writeFile",
      "editFile",
      "globFiles",
      "searchFiles",
      "execShell",
    ]);
    const readFile = tools.find((tool) => (tool.function as any).name === "readFile");
    expect((readFile?.function as any).description).toContain(
      "Read a UTF-8 text file",
    );
    expect((readFile?.function as any).description).toContain(
      "Use lines for focused range reads",
    );
    const writeFile = tools.find((tool) => (tool.function as any).name === "writeFile");
    expect((writeFile?.function as any).description).toContain(
      "Write full UTF-8 file content",
    );
    expect((writeFile?.function as any).description).toContain(
      "Prefer editFile for targeted edits",
    );
    const replaceText = tools.find((tool) => (tool.function as any).name === "editFile");
    expect((replaceText?.function as any).description).toContain(
      "Replace exact text occurrences",
    );
    expect((replaceText?.function as any).description).toContain(
      "report the error instead of falling back to a whole-file rewrite",
    );
    const globFiles = tools.find((tool) => (tool.function as any).name === "globFiles");
    expect((globFiles?.function as any).description).toContain(
      "Find file paths by glob pattern",
    );
    expect((globFiles?.function as any).description).toContain(
      "Use brace groups",
    );
    const searchFiles = tools.find((tool) => (tool.function as any).name === "searchFiles");
    expect((searchFiles?.function as any).description).toContain(
      "Search file contents inside the workspace",
    );
    expect((searchFiles?.function as any).description).toContain(
      "Prefer globFiles",
    );
    const execShell = tools.find((tool) => (tool.function as any).name === "execShell");
    expect((execShell?.function as any).description).toContain(
      "Execute a shell command from the workspace root",
    );
    expect((execShell?.function as any).description).toContain(
      "Prefer one compound command",
    );
    expect((execShell?.function as any).description).toContain(
      "git status && git diff --stat",
    );
    expect((execShell?.function as any).description).toContain(
      "launchProcess",
    );
    expect((execShell?.function as any).description).toContain(
      "detached: true",
    );
  });

  test("can vary globFiles description and parameters for tool-surface experiments", () => {
    const tools = buildLocalWorkspaceOpenAiTools({
      toolNames: ["globFiles"],
      globFilesDescriptionVariant: "antiShell",
      globFilesParameterVariant: "rich",
    });
    const globFiles = tools[0]?.function as any;

    expect(globFiles.description).toContain("Prefer globFiles over shell find/ls commands");
    expect(globFiles.parameters.required).toEqual(["pattern"]);
    expect(Object.keys(globFiles.parameters.properties)).toEqual([
      "pattern",
      "path",
      "exclude",
      "includeIgnored",
      "maxResults",
    ]);
    expect(globFiles.parameters.properties.maxResults.description).toContain("Max file paths to return");
    expect(globFiles.parameters.properties.pattern.description).toContain("**/*.{ts,tsx}");
    expect(globFiles.parameters.properties).not.toHaveProperty("_activity");
  });

  test("can vary searchFiles description and parameters for tool-surface experiments", () => {
    const tools = buildLocalWorkspaceOpenAiTools({
      toolNames: ["searchFiles"],
      searchFilesDescriptionVariant: "antiShell",
      searchFilesParameterVariant: "rich",
    });

    const searchFiles = tools[0]?.function as any;
    expect(searchFiles.description).toContain("Prefer searchFiles over shell grep");
    expect(searchFiles.parameters.required).toEqual(["query"]);
    expect(Object.keys(searchFiles.parameters.properties)).toEqual([
      "query",
      "path",
      "exclude",
      "includeIgnored",
      "maxResults",
      "literal",
      "caseSensitive",
      "contextLines",
    ]);
    expect(searchFiles.parameters.properties.maxResults.description).toContain("Max matching output lines");
    expect(searchFiles.parameters.properties.literal.description).toContain("literal text");
    expect(searchFiles.parameters.properties).not.toHaveProperty("_activity");
  });

  test("default readFile schema exposes one slice argument and no legacy integers", () => {
    const tools = buildLocalWorkspaceOpenAiTools({ toolNames: ["readFile"] });

    const readFile = tools[0]?.function as any;
    expect(Object.keys(readFile.parameters.properties)).toEqual(["path", "lines", "force"]);
    // The legacy integers stay readable at runtime for in-flight callers, but
    // must not be advertised — a declared argument is one models will reach for.
    expect(readFile.parameters.properties).not.toHaveProperty("startLine");
    expect(readFile.parameters.properties).not.toHaveProperty("tailLines");
    expect(readFile.parameters.properties.lines.type).toBe("string");
  });

  test("can vary readFile description and parameters for tool-surface experiments", () => {
    const tools = buildLocalWorkspaceOpenAiTools({
      toolNames: ["readFile"],
      readFileDescriptionVariant: "strategy",
      readFileParameterVariant: "rich",
    });

    const readFile = tools[0]?.function as any;
    expect(readFile.description).toContain("Use lines for focused range reads");
    expect(readFile.parameters.properties.lines.description).toContain("40-120");
    expect(readFile.parameters.required).toEqual(["path"]);
    expect(Object.keys(readFile.parameters.properties)).toEqual(["path", "lines", "force"]);
    expect(readFile.parameters.properties).not.toHaveProperty("_activity");
  });

  test("can vary listFiles description and parameters for tool-surface experiments", () => {
    const tools = buildLocalWorkspaceOpenAiTools({
      toolNames: ["listFiles"],
      listFilesDescriptionVariant: "antiShell",
      listFilesParameterVariant: "rich",
    });

    const listFiles = tools[0]?.function as any;
    expect(listFiles.description).toContain("directory overview");
    expect(Object.keys(listFiles.parameters.properties)).toEqual([
      "path",
      "maxDepth",
      "maxResults",
      "entryType",
    ]);
    expect(listFiles.parameters.properties).not.toHaveProperty("_activity");
  });

  test("can use workflow descriptions without changing rich parameter schemas", () => {
    const tools = buildLocalWorkspaceOpenAiTools({
      toolNames: ["listFiles", "globFiles", "searchFiles", "readFile"],
      listFilesDescriptionVariant: "workflow",
      globFilesDescriptionVariant: "workflow",
      searchFilesDescriptionVariant: "workflow",
      readFileDescriptionVariant: "workflow",
      listFilesParameterVariant: "rich",
      globFilesParameterVariant: "rich",
      searchFilesParameterVariant: "rich",
      readFileParameterVariant: "rich",
    });

    const byName = new Map(tools.map((tool) => [(tool.function as any).name, tool.function as any]));
    expect(byName.get("listFiles").description).toContain("Then use globFiles");
    expect(byName.get("globFiles").description).toContain("Use searchFiles");
    expect(byName.get("searchFiles").description).toContain("use readFile");
    expect(byName.get("readFile").description).toContain("range from searchFiles");
    expect(Object.keys(byName.get("listFiles").parameters.properties)).toEqual([
      "path",
      "maxDepth",
      "maxResults",
      "entryType",
    ]);
    expect(Object.keys(byName.get("globFiles").parameters.properties)).toEqual([
      "pattern",
      "path",
      "exclude",
      "includeIgnored",
      "maxResults",
    ]);
    expect(Object.keys(byName.get("searchFiles").parameters.properties)).toEqual([
      "query",
      "path",
      "exclude",
      "includeIgnored",
      "maxResults",
      "literal",
      "caseSensitive",
      "contextLines",
    ]);
    expect(Object.keys(byName.get("readFile").parameters.properties)).toEqual(["path", "lines", "force"]);
    for (const name of ["listFiles", "globFiles", "searchFiles", "readFile"]) {
      expect(byName.get(name).parameters.properties).not.toHaveProperty("_activity");
    }
  });

  test("searchFiles scoped schema keeps advanced matching controls out of the medium variant", () => {
    const tools = buildLocalWorkspaceOpenAiTools({
      toolNames: ["searchFiles"],
      searchFilesParameterVariant: "scoped",
    });

    const searchFiles = tools[0]?.function as any;
    expect(Object.keys(searchFiles.parameters.properties)).toEqual([
      "query",
      "path",
      "includeIgnored",
      "maxResults",
    ]);
    expect(searchFiles.parameters.properties).not.toHaveProperty("_activity");
  });

  test("builds a semantic local coding toolset from declared names only (no baseline)", () => {
    // 兜底已删除：只返回 declared 里匹配 WORKSPACE_TOOL_NAMES 的。
    // createDoc 不是 workspace 工具被过滤；execShell 在 exposeShellTools=false 时被过滤。
    expect(buildLocalWorkspaceToolset({
      declaredToolNames: ["readFile", "writeFile", "execShell", "createDoc"],
    })).toEqual({
      toolNames: [
        "readFile",
        "writeFile",
      ],
      exposeShellTools: false,
    });
  });

  test("adds shell only when the local coding toolset explicitly exposes shell tools", () => {
    // 兜底已删除：SHELL_TOOL_NAMES（exposeShellTools=true）+ declared 匹配的 workspace 工具。
    expect(buildLocalWorkspaceToolset({
      declaredToolNames: ["readFile", "writeFile", "execShell"],
      exposeShellTools: true,
    })).toEqual({
      toolNames: [
        "execShell",
        "launchProcess",
        "listProcesses",
        "readFile",
        "writeFile",
      ],
      exposeShellTools: true,
    });
  });

  test("adds optional workspace tools only when the agent declares them", () => {
    // 兜底已删除：captureVisualState 是 workspace 工具，声明了才出现；
    // 不再有 listFiles/readFile/writeFile 等兜底全集。
    expect(buildLocalWorkspaceToolset({
      declaredToolNames: [
        "captureVisualState",
      ],
      exposeShellTools: true,
    })).toEqual({
      toolNames: [
        "execShell",
        "launchProcess",
        "listProcesses",
        "captureVisualState",
      ],
      exposeShellTools: true,
    });
  });

  test("ignores unknown legacy tool names for local policy checks", () => {
    // 兜底已删除：legacyReadFile/legacyWriteFile 不是 workspace 真名，
    // 非 declared-only 时返回 SHELL_TOOL_NAMES（exposeShellTools 默认 false → 空）∪ declared 匹配（空）。
    expect(buildLocalWorkspacePolicyToolNames({
      declaredToolNames: ["legacyReadFile", "legacyWriteFile"],
    })).toEqual([]);
  });

  test("can build an ablation toolset from declared tool names only", () => {
    expect(buildLocalWorkspaceToolset({
      declaredToolNames: ["listFiles", "readFile", "execShell"],
      exposeShellTools: true,
      useDeclaredToolNamesOnly: true,
    })).toEqual({
      toolNames: ["listFiles", "readFile", "execShell"],
      exposeShellTools: true,
    });

    expect(buildLocalWorkspacePolicyToolNames({
      declaredToolNames: ["listFiles", "readFile"],
      useDeclaredToolNamesOnly: true,
    })).toEqual(["listFiles", "readFile"]);
  });

  test("does not carry removed semantic git tools into local policy tool names", () => {
    expect(buildLocalWorkspacePolicyToolNames({
      declaredToolNames: [
        "gitStatus",
        "gitDiff",
        "gitCreateBranch",
        "gitAdd",
        "gitCommit",
        "commitWorkspace",
      ],
      exposeShellTools: true,
    })).not.toEqual(expect.arrayContaining([
      "gitStatus",
      "gitDiff",
      "gitCreateBranch",
      "gitAdd",
      "gitCommit",
      "commitWorkspace",
    ]));
  });

  test("hides shell tools from model schemas unless explicitly exposed", () => {
    expect(buildLocalWorkspaceOpenAiTools({
      toolNames: ["readFile", "execShell"],
    }).map((tool) => (tool.function as any).name)).toEqual([
      "readFile",
    ]);
  });

  test("exposes shell tools in model schemas and policy names when exposed", () => {
    expect(buildLocalWorkspaceOpenAiTools({
      toolNames: ["execShell", "launchProcess", "listProcesses"],
      exposeShellTools: true,
    }).map((tool) => (tool.function as any).name)).toEqual([
      "execShell",
      "launchProcess",
      "listProcesses",
    ]);

    // 兜底已删除：policy 只含 SHELL_TOOL_NAMES（exposeShellTools=true）∪ declared 匹配。
    // 不再有 listFiles/readFile/writeFile 等兜底全集。
    expect(buildLocalWorkspacePolicyToolNames({
      declaredToolNames: ["execShell"],
      exposeShellTools: true,
    })).toEqual(["execShell", "launchProcess", "listProcesses"]);
  });

  test("ignores unknown legacy file aliases when canonical workspace tools are declared", () => {
    expect(buildLocalWorkspaceOpenAiTools({
      toolNames: [
        "legacyListFiles",
        "listFiles",
        "legacyReadFile",
        "readFile",
        "legacyWriteFile",
        "legacyEditFile",
        "legacyApplyEdit",
        "legacyApplyLineEdits",
        "writeFile",
        "editFile",
      ],
    }).map((tool) => (tool.function as any).name)).toEqual([
      "listFiles",
      "readFile",
      "writeFile",
      "editFile",
    ]);
  });

  test("does not expose removed semantic git tools in model schemas", () => {
    expect(buildLocalWorkspaceOpenAiTools({
      toolNames: [
        "gitStatus",
        "gitDiff",
        "gitCreateBranch",
        "gitAdd",
        "gitCommit",
        "commitWorkspace",
      ],
      exposeShellTools: true,
    }).map((tool) => (tool.function as any).name)).toEqual([]);
  });

  test("readFile executor passes _activity through to result metadata", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "src.ts"), "const x = 1;\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.readFile({
      id: "call-activity-read",
      name: "readFile",
      arguments: JSON.stringify({
        path: "src.ts",
        _activity: { title: "查看配置文件", detail: "读取 src.ts 了解当前配置", refs: [{ type: "file", path: "src.ts" }] },
      }),
    });

    expect(result.metadata).toMatchObject({
      path: "src.ts",
      activity: {
        title: "查看配置文件",
        detail: "读取 src.ts 了解当前配置",
        refs: [{ type: "file", path: "src.ts" }],
      },
    });
  });

  test("writeFile executor passes _activity through to result metadata", async () => {
    const root = createWorkspace();
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.writeFile({
      id: "call-activity-write",
      name: "writeFile",
      arguments: JSON.stringify({
        path: "config.json",
        content: "{}",
        _activity: { title: "写入配置" },
      }),
    });

    expect(result.metadata).toMatchObject({
      path: "config.json",
      activity: { title: "写入配置" },
    });
  });

  test("editFile executor passes _activity through to result metadata", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "app.ts"), "const a = 1;\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.editFile({
      id: "call-activity-edit",
      name: "editFile",
      arguments: JSON.stringify({
        path: "app.ts",
        oldText: "a = 1",
        newText: "a = 2",
        _activity: { title: "修改变量值", refs: [{ type: "file", path: "app.ts" }] },
      }),
    });

    expect(result.metadata).toMatchObject({
      path: "app.ts",
      replacements: 1,
      activity: {
        title: "修改变量值",
        refs: [{ type: "file", path: "app.ts" }],
      },
    });
  });

  test("execShell executor passes _activity through to result metadata", async () => {
    const root = createWorkspace();
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.execShell({
      id: "call-activity-shell",
      name: "execShell",
      arguments: JSON.stringify({
        cmd: "echo hello",
        _activity: { title: "检查环境", detail: "运行 echo 验证 shell 可用" },
      }),
    });

    expect(result.metadata).toMatchObject({
      activity: {
        title: "检查环境",
        detail: "运行 echo 验证 shell 可用",
      },
    });
  });

  test("executor results omit activity metadata when _activity is not provided", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "x.ts"), "ok\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const readResult = await executors.readFile({
      id: "call-no-activity",
      name: "readFile",
      arguments: JSON.stringify({ path: "x.ts" }),
    });
    expect(readResult.metadata).not.toHaveProperty("activity");

    const shellResult = await executors.execShell({
      id: "call-no-activity-shell",
      name: "execShell",
      arguments: JSON.stringify({ cmd: "echo ok" }),
    });
    expect(shellResult.metadata).not.toHaveProperty("activity");
  });

  test("_activity with missing title is silently ignored", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "x.ts"), "ok\n");
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.readFile({
      id: "call-bad-activity",
      name: "readFile",
      arguments: JSON.stringify({
        path: "x.ts",
        _activity: { title: "", detail: "no title" },
      }),
    });
    expect(result.metadata).not.toHaveProperty("activity");
  });

  test("workspace file tools omit _activity from OpenAI schema", () => {
    const tools = buildLocalWorkspaceOpenAiTools({
      toolNames: ["readFile", "writeFile", "editFile", "globFiles", "searchFiles", "execShell", "launchProcess", "listProcesses"],
      exposeShellTools: true,
    });
    for (const tool of tools) {
      if (!tool.function) continue;
      // tool.function.parameters is typed loosely by the OpenAI helper; narrow to read .properties
      const props = (tool.function.parameters as Record<string, Record<string, unknown>>)?.properties ?? {};
      expect("_activity" in props ? props._activity : undefined).toBeUndefined();
    }
  });

  test("launchProcess and listProcesses executors work as expected", async () => {
    const root = createWorkspace();
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const openAiTools = buildLocalWorkspaceOpenAiTools({
      toolNames: ["launchProcess", "listProcesses"],
      exposeShellTools: true,
    });
    const launchSchema = openAiTools.find((t) => t.function.name === "launchProcess");
    const launchProps = (launchSchema?.function.parameters as Record<string, Record<string, unknown>>)?.properties;
    expect(launchProps).toHaveProperty("persist");

    const launchRes = await executors.launchProcess({
      id: "call-launch",
      name: "launchProcess",
      arguments: JSON.stringify({ command: "sleep 10", label: "my-sleep", persist: true }),
    });

    const parsedLaunch = JSON.parse(launchRes.content);
    expect(parsedLaunch.status).toBe("running");
    expect(parsedLaunch.label).toBe("my-sleep");
    expect(typeof parsedLaunch.pid).toBe("number");

    const listRes = await executors.listProcesses({
      id: "call-list",
      name: "listProcesses",
      arguments: "{}",
    });

    const list = JSON.parse(listRes.content);
    expect(Array.isArray(list)).toBe(true);
    const procItem = list.find((p: any) => p.pid === parsedLaunch.pid);
    expect(procItem).toBeDefined();
    expect(procItem.persist).toBe(true);

    const reg = getProcessRegistry();
    reg.kill(parsedLaunch.pid);
  });

  test("execShell aborts promptly when AbortSignal is already aborted and reports metadata.aborted", async () => {
    const root = createWorkspace();
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const ac = new AbortController();
    ac.abort();

    const result = await executors.execShell(
      {
        id: "call-abort",
        name: "execShell",
        arguments: JSON.stringify({ cmd: "sleep 30" }),
      },
      { abortSignal: ac.signal },
    );

    expect(result.metadata?.aborted).toBe(true);
    expect(result.metadata?.exitCode).toBe(130);
    expect(result.metadata?.timedOut).toBe(false);
  });

  test("execShell auto-detaches to background after detachMs and reports metadata.detached", async () => {
    const root = createWorkspace();
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.execShell(
      {
        id: "call-detach",
        name: "execShell",
        arguments: JSON.stringify({ cmd: "sleep 30" }),
      },
      { detachMs: 200 },
    );

    expect(result.metadata?.detached).toBe(true);
    expect(typeof result.metadata?.pid).toBe("number");
    expect(result.metadata?.status).toBe("running");

    const reg = getProcessRegistry();
    const pid = result.metadata?.pid as number;
    // The process may already be cleaned up by the time we check (registry is
    // a shared singleton across tests); only assert it was registered.
    expect(typeof reg.get(pid)).toBe("object");
    reg.kill(pid);
  });

  test("execShell smart-detaches obviously long-running commands immediately (no detachMs needed)", async () => {
    const root = createWorkspace();
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const startedAt = Date.now();
    const result = await executors.execShell({
      id: "call-smart-detach",
      name: "execShell",
      arguments: JSON.stringify({ cmd: "sleep 30" }),
    });
    const duration = Date.now() - startedAt;

    // Smart detach must return almost immediately, not after the sleep.
    expect(duration).toBeLessThan(5000);
    expect(result.metadata?.detached).toBe(true);
    expect(typeof result.metadata?.pid).toBe("number");
    expect(result.metadata?.status).toBe("running");

    const reg = getProcessRegistry();
    const pid = result.metadata?.pid as number;
    expect(typeof reg.get(pid)).toBe("object");
    reg.kill(pid);
  });

  test("execShell keeps short sleeps inline (no smart detach below threshold)", async () => {
    const root = createWorkspace();
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });

    const result = await executors.execShell({
      id: "call-short-sleep",
      name: "execShell",
      arguments: JSON.stringify({ cmd: "sleep 0.2" }),
    });

    expect(result.metadata?.detached).toBeFalsy();
    expect(result.metadata?.exitCode).toBe(0);
  });

// 回归：grep 回退分支曾把 "public/assets/**" 压成 --exclude-dir=assets，
// 于是任何叫 assets 的目录（含 src/assets）都被排掉。过度排除比不排除更危险：
// 模型会以为那里没有匹配。三条搜索路径（rg / grep / JS 兜底）现在统一在
// 输出侧按完整 glob 过滤，语义必须一致。
test("dropAlwaysExcludedLines 排除 public/assets 但保留同名的 src/assets", () => {
  const lines = [
    "src/assets/icon.ts:3:export const icon = 1;",
    "public/assets/entry.css:24511:.foo {}",
    "src/app.ts:1:import './x';",
  ];
  expect(dropAlwaysExcludedLines(lines)).toEqual([
    "src/assets/icon.ts:3:export const icon = 1;",
    "src/app.ts:1:import './x';",
  ]);
});

test("dropAlwaysExcludedLines 排除构建产物并保留普通源码", () => {
  const lines = [
    "packages/chat/tsconfig.tsbuildinfo:1:{}",
    "dist/bundle.js:1:x",
    "packages/chat/index.ts:5:export {};",
  ];
  expect(dropAlwaysExcludedLines(lines)).toEqual([
    "packages/chat/index.ts:5:export {};",
  ]);
});

test("dropAlwaysExcludedLines 保留无法解析出路径的行", () => {
  const lines = ["-- some grep separator --"];
  expect(dropAlwaysExcludedLines(lines)).toEqual(lines);
});
