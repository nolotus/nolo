import { afterEach, beforeAll, afterAll, describe, expect, test } from "bun:test";
import { PassThrough } from "node:stream";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { startTuiWorkspace } from "./tui/readlineWorkspace";
import { t } from "./tui/i18n";

function toPlainUint8Array(chunk: string | Uint8Array) {
  return typeof chunk === "string"
    ? Uint8Array.from(Buffer.from(chunk))
    : Uint8Array.from(chunk);
}

function tokenForUser(userId: string) {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode({ userId })}.sig`;
}

type SpawnCapture = {
  stdout?: "pipe" | "inherit";
  stderr?: "pipe" | "inherit";
};

type SpawnObjectCapture = SpawnCapture & {
  cmd?: string[];
};

function createFakeTtyPair(options?: { rows?: number; columns?: number }) {
  const input = new PassThrough() as PassThrough & {
    isTTY?: boolean;
    isRaw?: boolean;
    setRawMode?: (mode: boolean) => void;
  };
  const output = new PassThrough() as PassThrough & {
    isTTY?: boolean;
    rows?: number;
    columns?: number;
  };
  const rawModes: boolean[] = [];
  input.isTTY = true;
  output.isTTY = true;
  output.rows = options?.rows ?? 24;
  output.columns = options?.columns ?? 80;
  input.setRawMode = (mode: boolean) => {
    rawModes.push(mode);
    input.isRaw = mode;
  };
  return { input, output, rawModes };
}

describe("cli tui workspace process", () => {
  let tempNoloHome: string;
  let originalNoloHome: string | undefined;

  beforeAll(() => {
    originalNoloHome = process.env.NOLO_HOME;
    tempNoloHome = mkdtempSync(join(tmpdir(), "nolo-test-home-"));
    process.env.NOLO_HOME = tempNoloHome;
  });

  afterAll(() => {
    if (originalNoloHome === undefined) {
      delete process.env.NOLO_HOME;
    } else {
      process.env.NOLO_HOME = originalNoloHome;
    }
    try {
      rmSync(tempNoloHome, { recursive: true, force: true });
    } catch {}
  });
  const originalSpawn = Bun.spawn;

  afterEach(() => {
    Bun.spawn = originalSpawn;
  });

  test("exits cleanly when piped slash commands include /exit", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const chunks: Uint8Array[] = [];
    output.on("data", (chunk) => chunks.push(toPlainUint8Array(chunk)));

    input.write("/help\n/doc attach product-plan\n/exit\n");
    input.end();

    const result = await Promise.race([
      startTuiWorkspace({
        scriptDir: "",
        input,
        output,
        env: {},
      }).then(() => "done"),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 3000)),
    ]);
    const stdout = Buffer.concat(chunks).toString("utf8");

    expect(result).toBe("done");
    expect(stdout).toContain("/customize");
    expect(stdout).toContain("Attached doc: product-plan");
    expect(stdout).toMatch(/Bye\.|再见。/);
  });

  test("persists the returned dialog id and continues the next chat turn", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const chunks: Uint8Array[] = [];
    const calls: any[] = [];
    output.on("data", (chunk) => chunks.push(toPlainUint8Array(chunk)));

    input.write("hi\n/context\n继续\n/exit\n");
    input.end();

    const result = await Promise.race([
      startTuiWorkspace({
        scriptDir: "",
        input,
        output,
        env: { AUTH_TOKEN: tokenForUser("user-1"), NOLO_LANG: "en" },
        agentRunner: async (options) => {
          calls.push(options);
          output.write(`\n${options.agentName}\nok\n`);
          return {
            exitCode: 0,
            dialogId: calls.length === 1 ? "01KQHZ56KKMA7G2F755QXFA3QX" : "01KQHZ56KKMA7G2F755QXFA3QX",
          };
        },
      }).then(() => "done"),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 3000)),
    ]);
    const stdout = Buffer.concat(chunks).toString("utf8");

    expect(result).toBe("done");
    expect(calls).toHaveLength(2);
    expect(calls[0].continueDialogId).toBeUndefined();
    expect(calls[1].continueDialogId).toBe("01KQHZ56KKMA7G2F755QXFA3QX");
    expect(stdout).toContain(
      "dialog   dialog-user-1-01KQHZ56KKMA7G2F755QXFA3QX"
    );
  });

  test("/lang updates the response language used by the next real turn", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const calls: any[] = [];

    input.write("/lang zh\nhello\n/exit\n");
    input.end();

    const result = await Promise.race([
      startTuiWorkspace({
        scriptDir: "",
        input,
        output,
        env: { NOLO_LANG: "en" },
        agentRunner: async (options) => {
          calls.push(options);
          return { exitCode: 0, dialogId: "test-dialog" };
        },
      }).then(() => "done"),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 3000)),
    ]);

    expect(result).toBe("done");
    expect(calls).toHaveLength(1);
    expect(calls[0].userLanguage).toBe("zh");
    expect(calls[0].env.NOLO_LANG).toBe("zh");
  });

  test("passes runtime mode from TUI state into chat runner", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const chunks: Uint8Array[] = [];
    const calls: any[] = [];
    output.on("data", (chunk) => chunks.push(toPlainUint8Array(chunk)));

    input.write("/runtime local\nhi\n/exit\n");
    input.end();

    const result = await Promise.race([
      startTuiWorkspace({
        scriptDir: "",
        input,
        output,
        env: {},
        agentRunner: async (options) => {
          calls.push(options);
          output.write("ok\n");
          return { exitCode: 0, dialogId: "dialog-local" };
        },
      }).then(() => "done"),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 3000)),
    ]);

    expect(result).toBe("done");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.runtimeMode).toBe("local");
  });

  test("raw TTY input submits the typed buffer and keeps listening", async () => {
    const { input, output, rawModes } = createFakeTtyPair();
    const calls: any[] = [];

    setTimeout(() => input.write("abc\r"), 10);

    const result = await Promise.race([
      startTuiWorkspace({
        scriptDir: "",
        input,
        output,
        env: {},
        agentRunner: async (options) => {
          calls.push(options);
          output.write("ok\n");
          setTimeout(() => input.write("/exit\r"), 10);
          return { exitCode: 0, dialogId: "dialog-raw" };
        },
      }).then(() => "done"),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 3000)),
    ]);

    expect(result).toBe("done");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.message).toBe("abc");
    expect(rawModes).toContain(true);
    expect(rawModes.at(-1)).toBe(false);
  });

  test("selecting /history loads persisted messages into the TUI transcript", async () => {
    const { input, output } = createFakeTtyPair({ rows: 10, columns: 70 });
    const chunks: Uint8Array[] = [];
    const selectedDialog = {
      id: "01JZZZZZZZZZZZZZZZZZZZZZZZ",
      dbKey: "dialog-user-1-01JZZZZZZZZZZZZZZZZZZZZZZZ",
      title: "Loaded conversation",
      status: "done",
      updatedAt: null,
      createdAt: null,
      spaceId: null,
      triggerType: null,
      primaryAgentKey: null,
      cybots: [],
    };
    const loads: string[] = [];
    output.on("data", (chunk) => chunks.push(toPlainUint8Array(chunk)));

    setTimeout(() => input.write("/history\r"), 10);
    setTimeout(() => input.write("/exit\r"), 80);

    const result = await Promise.race([
      startTuiWorkspace({
        scriptDir: "",
        input,
        output,
        env: { AUTH_TOKEN: tokenForUser("user-1"), NOLO_LANG: "en" },
        dialogPickerRunner: async () => ({
          kind: "selected" as const,
          dialog: selectedDialog,
        }),
        dialogHistoryLoader: async ({ dialog }) => {
          loads.push(dialog.dbKey);
          return [
            { role: "user" as const, content: "persisted question" },
            { role: "assistant" as const, content: "persisted answer" },
          ];
        },
      }).then(() => "done"),
      new Promise<"timeout">((resolve) =>
        setTimeout(() => resolve("timeout"), 3000)
      ),
    ]);
    const stdout = Buffer.concat(chunks).toString("utf8");

    expect(result).toBe("done");
    expect(loads).toEqual([selectedDialog.dbKey]);
    expect(stdout).toContain("persisted question");
    expect(stdout).toContain("persisted answer");
    expect(stdout).toContain("Loaded conversation");
  });

  test("raw TTY action gate ignores random keys, runs on Enter, then resumes", async () => {
    const { input, output } = createFakeTtyPair();
    const spawnCalls: any[] = [];
    const gateResults: any[] = [];
    let gateRequested = false;

    output.on("data", (chunk) => {
      const text = chunk.toString();
      if (!gateRequested && text.includes(t("actionGateEnterHint"))) {
        gateRequested = true;
        setTimeout(() => input.write("x"), 10);
        setTimeout(() => input.write("\r"), 30);
      }
    });

    setTimeout(() => input.write("delete repo\r"), 10);

    const result = await Promise.race([
      startTuiWorkspace({
        scriptDir: "",
        input,
        output,
        env: {},
        spawnRunner: (options) => {
          spawnCalls.push(options);
          return { exited: Promise.resolve(0), stdout: null, stderr: null, stdin: null } as any;
        },
        agentRunner: async (options) => {
          const replacement = await options.actionGateHandler?.({
            id: "gate-auth",
            kind: "handoff",
            title: "This command requires an interactive terminal.",
            toolName: "execShell",
            toolCallId: "call-auth",
            payload: {
              command: ["gh", "auth", "refresh"],
              displayCommand: "gh auth refresh",
            },
          });
          gateResults.push(replacement);
          setTimeout(() => {
            input.write("/exit\r");
          }, 30);
          return { exitCode: 0, dialogId: "dialog-after-action" };
        },
      }).then(() => "done"),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 3000)),
    ]);

    expect(result).toBe("done");
    expect(spawnCalls).toHaveLength(1);
    expect(gateResults[0]?.metadata).toMatchObject({
      actionGateResult: { gateId: "gate-auth", status: "completed" },
    });
  });

  test("pauses for manual terminal action and resumes after Enter", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const chunks: Uint8Array[] = [];
    const gateResults: any[] = [];
    let stdout = "";
    let answered = false;
    output.on("data", (chunk) => {
      chunks.push(toPlainUint8Array(chunk));
      stdout = Buffer.concat(chunks).toString("utf8");
      if (!answered && stdout.includes(t("actionGateEnterHint"))) {
        answered = true;
        setTimeout(() => {
          input.write("\n");
          setTimeout(() => {
            input.write("/exit\n");
            input.end();
          }, 10);
        }, 10);
      }
    });

    input.write("delete repo\n");

    const result = await Promise.race([
      startTuiWorkspace({
        scriptDir: "",
        input,
        output,
        env: {},
        spawnRunner: () => ({ exited: Promise.resolve(0), stdout: null, stderr: null }) as any,
        agentRunner: async (options) => {
          const replacement = await options.actionGateHandler?.({
            id: "gate-auth",
            kind: "handoff",
            title: "This command requires an interactive terminal.",
            toolName: "execShell",
            toolCallId: "call-auth",
            payload: {
              command: ["gh", "auth", "refresh", "-h", "github.com", "-s", "delete_repo"],
              displayCommand: "gh auth refresh -h github.com -s delete_repo",
            },
          });
          gateResults.push(replacement);
          output.write("continued\n");
          return { exitCode: 0, dialogId: "dialog-after-action" };
        },
      }).then(() => "done"),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 3000)),
    ]);
    stdout = Buffer.concat(chunks).toString("utf8");

    expect(result).toBe("done");
    expect(stdout).toContain(t("actionGateNeeded"));
    expect(stdout).toContain("gh auth refresh -h github.com -s delete_repo");
    expect(stdout).toContain(t("actionGateEnterHint"));
    expect(gateResults[0]?.content).toContain("action gate completed");
  });

  test("runs manual terminal action through the TUI before resuming", async () => {
    const input = new PassThrough() as PassThrough & { isRaw?: boolean; setRawMode?: (mode: boolean) => void };
    const output = new PassThrough();
    const chunks: Uint8Array[] = [];
    const spawnCalls: any[] = [];
    const gateResults: any[] = [];
    const rawModeTransitions: boolean[] = [];
    input.isRaw = true;
    input.setRawMode = (mode: boolean) => {
      rawModeTransitions.push(mode);
      input.isRaw = mode;
    };
    let stdout = "";
    let answered = false;
    output.on("data", (chunk) => {
      chunks.push(toPlainUint8Array(chunk));
      stdout = Buffer.concat(chunks).toString("utf8");
      if (!answered && stdout.includes(t("actionGateEnterHint"))) {
        answered = true;
        setTimeout(() => {
          input.write("\n");
          setTimeout(() => {
            input.write("/exit\n");
            input.end();
          }, 10);
        }, 10);
      }
    });

    input.write("delete repo\n");

    const result = await Promise.race([
      startTuiWorkspace({
        scriptDir: "",
        input,
        output,
        env: {},
        spawnRunner: (options) => {
          spawnCalls.push(options);
          return { exited: Promise.resolve(0), stdout: null, stderr: null, stdin: null } as any;
        },
        agentRunner: async (options) => {
          const replacement = await options.actionGateHandler?.({
            id: "gate-auth",
            kind: "handoff",
            title: "This command requires an interactive terminal.",
            toolName: "execShell",
            toolCallId: "call-auth",
            payload: {
              command: ["gh", "auth", "refresh", "-h", "github.com", "-s", "delete_repo"],
              displayCommand: "gh auth refresh -h github.com -s delete_repo",
            },
          });
          gateResults.push(replacement);
          output.write("continued\n");
          return { exitCode: 0, dialogId: "dialog-after-action" };
        },
      }).then(() => "done"),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 3000)),
    ]);
    stdout = Buffer.concat(chunks).toString("utf8");

    expect(result).toBe("done");
    expect(stdout).toContain(t("actionGateEnterHint"));
    expect(spawnCalls[0]).toMatchObject({
      cmd: ["gh", "auth", "refresh", "-h", "github.com", "-s", "delete_repo"],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    expect(rawModeTransitions).toEqual([false, true]);
    expect(gateResults[0]?.metadata).toMatchObject({
      exitCode: 0,
      actionGateResult: { gateId: "gate-auth", status: "completed" },
    });
  });

  test("ask_choice popup keys are ignored by the global handler: Esc cancels without aborting the turn or polluting the draft", async () => {
    const { input, output } = createFakeTtyPair();
    const chunks: Uint8Array[] = [];
    output.on("data", (chunk) => chunks.push(toPlainUint8Array(chunk)));

    let choiceResult: any;
    let abortSignal: AbortSignal | undefined;

    // Start a turn. agentRunner opens the ask_choice popup, then we send:
    //  1. a printable `x` — the popup ignores it (single-select, Other not
    //     focused → no-op), but without the keyboard guard the global
    //     handleInputToken would pollute the composer draft buffer with `x`.
    //     After the popup cancels and the turn ends, that leaked `x` prefixes
    //     the next `/exit` → `x/exit` (unrecognized) → the harness never exits
    //     → timeout. With the guard, `x` is dropped and `/exit` works.
    //  2. Esc (\x1b) to cancel the popup.
    //  3. /exit to finish the session.
    setTimeout(() => input.write("hi\r"), 5);

    const result = await Promise.race([
      startTuiWorkspace({
        scriptDir: "",
        input,
        output,
        env: { AUTH_TOKEN: tokenForUser("user-ask-choice"), NOLO_LANG: "en" },
        agentRunner: async (options) => {
          abortSignal = options.abortSignal;
          if (options.requestUserChoice) {
            // Give the dialog a tick to register its raw-key reader and
            // paint, then pollute + cancel.
            setTimeout(() => input.write("x"), 40);
            setTimeout(() => input.write("\x1b"), 80);
            choiceResult = await options.requestUserChoice({
              question: "pick one",
              choices: [
                { id: "a", label: "A" },
                { id: "b", label: "B" },
              ],
              blocking: true,
            });
          }
          // After the popup resolves (cancelled), finish the turn and exit.
          setTimeout(() => input.write("/exit\r"), 20);
          return { exitCode: 0, dialogId: "dialog-after-choice" };
        },
      }).then(() => "done"),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 4000)),
    ]);
    const stdout = Buffer.concat(chunks).toString("utf8");

    expect(result).toBe("done");
    // Proof the popup actually opened and was cancelled by Esc.
    expect(choiceResult).toBeDefined();
    expect(choiceResult.kind).toBe("cancelled");
    // The running turn must NOT have been aborted by the global Esc handler.
    expect(abortSignal?.aborted).toBe(false);
    expect(stdout).not.toContain("Stopped this reply.");
  });

  test("returns a failed gate result when terminal handoff throws", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const chunks: Uint8Array[] = [];
    const gateResults: any[] = [];
    let answered = false;
    output.on("data", (chunk) => {
      chunks.push(toPlainUint8Array(chunk));
      const stdout = Buffer.concat(chunks).toString("utf8");
      if (!answered && stdout.includes(t("actionGateEnterHint"))) {
        answered = true;
        input.write("\n");
        setTimeout(() => {
          input.write("/exit\n");
          input.end();
        }, 10);
      }
    });

    input.write("delete repo\n");

    const result = await Promise.race([
      startTuiWorkspace({
        scriptDir: "",
        input,
        output,
        env: {},
        spawnRunner: () => {
          throw new Error("spawn failed");
        },
        agentRunner: async (options) => {
          const replacement = await options.actionGateHandler?.({
            id: "gate-auth",
            kind: "handoff",
            title: "This command requires an interactive terminal.",
            toolName: "execShell",
            toolCallId: "call-auth",
            payload: {
              command: ["gh", "auth", "refresh", "-h", "github.com", "-s", "delete_repo"],
              displayCommand: "gh auth refresh -h github.com -s delete_repo",
            },
          });
          gateResults.push(replacement);
          return { exitCode: 0, dialogId: "dialog-after-action" };
        },
      }).then(() => "done"),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 3000)),
    ]);

    expect(result).toBe("done");
    expect(gateResults[0]?.metadata).toMatchObject({
      actionGateResult: { gateId: "gate-auth", status: "failed", output: "spawn failed" },
    });
  });

  test("updates TUI state to new dialog after compact succeeds", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const chunks: Buffer[] = [];
    output.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

    input.write("/compact\n/context\n/exit\n");
    input.end();

    const result = await Promise.race([
      startTuiWorkspace({
        scriptDir: "",
        input,
        output,
        env: { AUTH_TOKEN: "token", NOLO_DIALOG_ID: "01OLD", NOLO_DIALOG: "01OLD" },
        compactRunner: async () => ({
          dialogId: "01NEW",
          dialogKey: "dialog-01NEW",
          summaryGenerated: true,
          compactedMessageCount: 7,
        }) as any,
      }).then(() => "done"),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 3000)),
    ]);
    const stdout = Buffer.concat(chunks).toString("utf8");

    expect(result).toBe("done");
    expect(stdout).toContain("Compacting current dialog");
    expect(stdout).toContain("01OLD");
    expect(stdout).toContain("01NEW");
    // Compression took real wall-clock time — assert the elapsed-seconds
    // suffix is present so users see how long compaction took.
    expect(stdout).toMatch(/\d+\.\d+s/);
    // Explicit success marker rather than the old silent fork line.
    expect(stdout).toContain("\u2713");
    // When a summary was generated with a message count, the feedback
    // narrates how many messages were compressed.
    expect(stdout).toContain("7");
    // Match the label from the active locale rather than the English one: the
    // context panel's labels are localized, and the padding between label and
    // value is computed from the label's display width, so neither is fixed.
    expect(stdout).toMatch(
      new RegExp(`${t("contextFieldDialog")}\\s+dialog-01NEW`),
    );
  });

  test("/update invokes shared updater and prints restart guidance on success", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const chunks: Uint8Array[] = [];
    output.on("data", (chunk) => chunks.push(toPlainUint8Array(chunk)));

    input.write("/update\n/exit\n");
    input.end();

    const result = await Promise.race([
      startTuiWorkspace({
        scriptDir: "",
        input,
        output,
        env: {},
        selfUpdater: async (out) => {
          out.write("npm output: installing nolo-cli@latest...\n");
          return 0;
        },
      }).then(() => "done"),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 3000)),
    ]);
    const stdout = Buffer.concat(chunks).toString("utf8");

    expect(result).toBe("done");
    expect(stdout).toContain("Starting self-update...");
    expect(stdout).toContain("npm output: installing nolo-cli@latest...");
    expect(stdout).toContain("Update finished. Restart nolo to use the new version.");
    expect(stdout).toMatch(/Bye\.|再见。/);
  });

  test("/update uses the explicit shared updater output contract on the real TUI path", async () => {
    const input = new PassThrough();
    const output = new PassThrough() as PassThrough & { output?: undefined };
    const chunks: Uint8Array[] = [];
    const spawnCalls: SpawnCapture[] = [];
    output.output = undefined;
    output.on("data", (chunk) => chunks.push(toPlainUint8Array(chunk)));
    Bun.spawn = ((options: SpawnObjectCapture) => {
      spawnCalls.push({
        stdout: options.stdout,
        stderr: options.stderr,
      });
      return {
        stdout: PassThrough.from(["npm notice using latest\n"]),
        stderr: PassThrough.from(["npm warn deprecated flag\n"]),
        exited: Promise.resolve(0),
      } as unknown as ReturnType<typeof Bun.spawn>;
    }) as unknown as typeof Bun.spawn;

    input.write("/update\n/exit\n");
    input.end();

    const result = await Promise.race([
      startTuiWorkspace({
        scriptDir: "",
        input,
        output,
        env: {},
      }).then(() => "done"),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 3000)),
    ]);
    const stdout = Buffer.concat(chunks).toString("utf8");

    expect(result).toBe("done");
    expect(spawnCalls).toHaveLength(1);
    expect(spawnCalls[0]?.stdout).toBe("pipe");
    expect(spawnCalls[0]?.stderr).toBe("pipe");
    expect(stdout).toContain("Nolo Agent CLI Installer & Updater");
    expect(stdout).toContain("npm notice using latest");
    expect(stdout).toContain("npm warn deprecated flag");
    expect(stdout).toContain("Update finished. Restart nolo to use the new version.");
  });

  test("/update prints retry hint on failure", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const chunks: Uint8Array[] = [];
    output.on("data", (chunk) => chunks.push(toPlainUint8Array(chunk)));

    input.write("/update\n/exit\n");
    input.end();

    const result = await Promise.race([
      startTuiWorkspace({
        scriptDir: "",
        input,
        output,
        env: {},
        selfUpdater: async (out) => {
          out.write("npm ERR! permission denied\n");
          return 1;
        },
      }).then(() => "done"),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 3000)),
    ]);
    const stdout = Buffer.concat(chunks).toString("utf8");

    expect(result).toBe("done");
    expect(stdout).toContain("Starting self-update...");
    expect(stdout).toContain("npm ERR! permission denied");
    expect(stdout).toContain("Update failed. Check the error above, then run /update again or use nolo update.");
    expect(stdout).toMatch(/Bye\.|再见。/);
  });

  test("/update keeps the session alive when the updater throws", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const chunks: Uint8Array[] = [];
    output.on("data", (chunk) => chunks.push(toPlainUint8Array(chunk)));

    input.write("/update\n/exit\n");
    input.end();

    const result = await Promise.race([
      startTuiWorkspace({
        scriptDir: "",
        input,
        output,
        env: {},
        selfUpdater: async () => {
          throw new Error("spawn npm ENOENT");
        },
      }).then(() => "done"),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 3000)),
    ]);
    const stdout = Buffer.concat(chunks).toString("utf8");

    expect(result).toBe("done");
    expect(stdout).toContain("Starting self-update...");
    expect(stdout).toContain("spawn npm ENOENT");
    expect(stdout).toContain("Update failed. Check the error above, then run /update again or use nolo update.");
    expect(stdout).toMatch(/Bye\.|再见。/);
  });

  test("runs natural-language dialog commands by calling the agent instead of routing to raw CLI commands", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const chunks: Uint8Array[] = [];
    const agentCalls: any[] = [];
    output.on("data", (chunk) => chunks.push(toPlainUint8Array(chunk)));

    input.write("查最近 3 个对话\n/exit\n");
    input.end();

    const result = await Promise.race([
      startTuiWorkspace({
        scriptDir: "/tmp/scripts",
        input,
        output,
        env: {},
        agentRunner: async (options) => {
          agentCalls.push(options);
          return { exitCode: 0 };
        },
      }).then(() => "done"),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 3000)),
    ]);

    expect(result).toBe("done");
    expect(agentCalls.length).toBe(1);
    expect(agentCalls[0].message).toBe("查最近 3 个对话");
  });

  // Real timers are required here: the TUI loop reads raw terminal input
  // asynchronously and has no exposed promise to await for each keystroke.
  test("raw TTY scroll keys page through long assistant output", async () => {
    const { input, output } = createFakeTtyPair({ rows: 10, columns: 40 });
    const chunks: (string | Uint8Array)[] = [];
    output.on("data", (chunk) => chunks.push(chunk));

    const lines: string[] = [];
    for (let i = 0; i < 30; i++) {
      lines.push(`line ${String(i).padStart(2, "0")}`);
    }

    setTimeout(() => input.write("show me a long list\r"), 10);

    const result = await Promise.race([
      startTuiWorkspace({
        scriptDir: "",
        input,
        output,
        env: {},
        agentRunner: async (options) => {
          options.output.write(lines.join("\n") + "\n");
          setTimeout(() => input.write("\x1b[5~"), 50);
          setTimeout(() => input.write("\x1b[5~"), 100);
          setTimeout(() => input.write("\x1b[F"), 150);
          setTimeout(() => input.write("/exit\r"), 200);
          return { exitCode: 0, dialogId: "dialog-scroll" };
        },
      }).then(() => "done"),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 3000)),
    ]);

    expect(result).toBe("done");
    const stdout = Buffer.concat(chunks.map((c) => Buffer.from(typeof c === "string" ? c : c))).toString("utf8");
    expect(stdout).toContain("█");
    expect(stdout).toContain("line 29");
    expect(stdout).toContain("line 29");
  });

  test("readline fallback path wires confirmDestructiveAction for destructive shell commands", async () => {
    // Non-raw input (no isTTY / setRawMode) routes through the readline fallback
    // branch. This test locks in that the fallback passes confirmDestructiveAction
    // into runSubmittedLine, so destructive commands surface a confirm callback
    // rather than being silently hard-rejected.
    const input = new PassThrough();
    const output = new PassThrough();
    const confirmCalls: any[] = [];

    input.write("delete the cache\n");
    input.end();

    const result = await Promise.race([
      startTuiWorkspace({
        scriptDir: "",
        input,
        output,
        env: {},
        agentRunner: async (options) => {
          // The fallback branch must wire confirmDestructiveAction; if it is
          // undefined the regression has returned.
          expect(typeof options.confirmDestructiveAction).toBe("function");
          const confirmed = await options.confirmDestructiveAction!({
            id: "permission-shell-destructive-action",
            tool: "execShell",
            action: "destructive_shell_command",
            title: "confirm",
            body: "destructive command",
          });
          confirmCalls.push(confirmed);
          return { exitCode: 0, dialogId: "dialog-destructive" };
        },
      }).then(() => "done"),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 3000)),
    ]);

    expect(result).toBe("done");
    expect(confirmCalls).toHaveLength(1);
    // Non-TTY runConfirmDialog returns false (no way to interact); the callback
    // must still be invoked so the adapter can decide, not silently drop.
  });
});
