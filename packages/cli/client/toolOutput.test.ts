import { beforeEach, describe, expect, test } from "bun:test";
import type { LocalAgentToolEvent } from "../../agent-runtime/localLoop";
import { setCliLocale, toolLabel } from "../tui/i18n";
import { detectCodeLangFromPath } from "./assistantOutput";
import { clipPathAware } from "./formatReadPathTree";
import {
  createSseToolEventAdapter,
  createToolEventFormatter,
  formatConservativeActiveToolLabel,
} from "./toolOutput";

/**
 * Render one event through the single display-mode formatter. A fresh
 * formatter per call is fine: only tool-result events are rendered here.
 */
function render(event: LocalAgentToolEvent, colorEnabled = false): string {
  return createToolEventFormatter(colorEnabled)(event);
}

function toolEvent(
  partial: Partial<LocalAgentToolEvent> & Pick<LocalAgentToolEvent, "type" | "toolName">
): LocalAgentToolEvent {
  return {
    round: 0,
    toolCallId: "call-1",
    ...partial,
  };
}

describe("toolOutput", () => {
  // Tool labels and status hints are localized, so the trace assertions below
  // would otherwise depend on the machine's LANG. Pin to en for the shared
  // cases; the locale-specific test flips it explicitly.
  beforeEach(() => {
    setCliLocale("en");
  });

  test("normal mode dims successful trace lines but keeps failures vivid", () => {
    const format = createToolEventFormatter(true);
    format(toolEvent({ type: "tool-call", toolName: "execShell", argumentsPreview: "bun test" }));
    const ok = format(
      toolEvent({
        type: "tool-result",
        toolName: "execShell",
        metadata: { exitCode: 0, command: "bun test" },
      }),
    );
    expect(ok).toContain("\x1b[2m");

    const failed = format(
      toolEvent({ type: "tool-error", toolName: "execShell" }),
    );
    expect(failed).not.toContain("\x1b[2m");
  });

  test("normal mode shows the full command including cd / echo segments", () => {
    const format = createToolEventFormatter(false);
    format(toolEvent({
      type: "tool-call",
      toolName: "execShell",
      argumentsPreview: "cd /secret/work && echo token && bun test",
    }));
    const output = format(toolEvent({
      type: "tool-result",
      toolName: "execShell",
      argumentsPreview: "cd /secret/work && echo token && bun test",
      metadata: { exitCode: 0, command: "cd /secret/work && echo token && bun test" },
    }));
    expect(output).toContain(toolLabel("execShell"));
    expect(output).toContain("✓");
    // 2026-09-02 owner 定调：Run 行 = 全量安全投影。整条命令上屏（脱敏后），
    // 参数与路径不再回避——它们在展开的 Run 树里本来可见。
    expect(output).toContain("cd /secret/work && echo token && bun test");
  });

  test("normal mode shows the full command with compound skeleton intact", () => {
    const format = createToolEventFormatter(false);
    const cases: Array<[string, string]> = [
      ["cd /Users/nolotus/bun-nolo && git status", "cd /Users/nolotus/bun-nolo && git status"],
      ["NOLO=1 bun test", "NOLO=1 bun test"],
      ["env NOLO=1 bun test", "env NOLO=1 bun test"],
      ["git log --oneline -5 | head -3", "git log --oneline -5 | head -3"],
      ["git status || git log", "git status || git log"],
      ["git status; git log", "git status; git log"],
      ["git status\ngit log", "git status git log"],
      ["echo hello && git status && git log", "echo hello && git status && git log"],
    ];
    for (const [command, want] of cases) {
      const output = format(toolEvent({
        type: "tool-result",
        toolName: "execShell",
        metadata: { exitCode: 0, command },
      }));
      expect(output).toContain(`▸ Run · ${want}  ✓`);
    }
  });

  test("normal mode shows quoted arguments verbatim", () => {
    const format = createToolEventFormatter(false);
    const output = format(toolEvent({
      type: "tool-result",
      toolName: "execShell",
      metadata: { exitCode: 0, command: 'git commit -m "fix: update"' },
    }));
    expect(output).toContain('▸ Run · git commit -m "fix: update"  ✓');

    const chained = format(toolEvent({
      type: "tool-result",
      toolName: "execShell",
      metadata: { exitCode: 0, command: 'echo "hello; git status" && git status' },
    }));
    expect(chained).toContain('▸ Run · echo "hello; git status" && git status  ✓');
  });

  test("normal mode redacts secret-shaped values and drops unredactable ones", () => {
    const format = createToolEventFormatter(false);
    const keyed = format(toolEvent({
      type: "tool-result",
      toolName: "execShell",
      metadata: { exitCode: 0, command: "bunx claude --api-key sk-ant-api03-abcdef1234567890" },
    }));
    expect(keyed).toContain("▸ Run · bunx claude --api-key ⟨redacted⟩  ✓");
    expect(keyed).not.toContain("sk-ant-api03");

    const bearer = format(toolEvent({
      type: "tool-result",
      toolName: "execShell",
      metadata: { exitCode: 0, command: "curl -H 'Authorization: Bearer abcdef1234567890' https://api.example.com" },
    }));
    expect(bearer).toContain("Bearer ⟨redacted⟩");
    expect(bearer).not.toContain("abcdef1234567890");

    // redactSecrets 不认识、但 gist 护栏（withholdIfSecretLike）认识的形态：
    // 整行放弃，宁少勿泄。
    const dropped = format(toolEvent({
      type: "tool-result",
      toolName: "execShell",
      metadata: { exitCode: 0, command: "git push https://x:ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456@github.com/o/r.git" },
    }));
    expect(dropped).toBe("▸ Run  ✓\n");
  });

  test("normal mode keeps plain commands fully visible and empty commands bare", () => {
    const format = createToolEventFormatter(false);
    const cat = format(toolEvent({
      type: "tool-result",
      toolName: "execShell",
      metadata: { exitCode: 0, command: "cat /etc/passwd" },
    }));
    expect(cat).toContain("▸ Run · cat /etc/passwd  ✓");

    const empty = format(toolEvent({
      type: "tool-result",
      toolName: "execShell",
      metadata: { exitCode: 0, command: "   " },
    }));
    expect(empty).toBe("▸ Run  ✓\n");
  });

  test("normal mode shows flags and paths in commands (already visible in Run tree)", () => {
    const format = createToolEventFormatter(false);
    const output = format(toolEvent({
      type: "tool-result",
      toolName: "execShell",
      metadata: { exitCode: 0, command: "git --git-dir=/secret status" },
    }));
    expect(output).toContain("▸ Run · git --git-dir=/secret status  ✓");
  });

  test("normal mode shows the full command detail for Run", () => {
    const format = createToolEventFormatter(false);
    const output = format(toolEvent({
      type: "tool-result",
      toolName: "execShell",
      argumentsPreview: "bun test packages/cli/tui packages/cli/client",
      metadata: { exitCode: 0, command: "bun test packages/cli/tui packages/cli/client" },
    }));
    expect(output).toContain("▸ Run · bun test packages/cli/tui packages/cli/client  ✓");
    // argumentsPreview（模型可控原始参数文本）仍绝不进 normal 行，gist 只取
    // runtime 投影的 metadata.command。
    expect(output).not.toContain("argumentsPreview");
  });

  test("normal mode clips long commands to the pinned width budget", () => {
    const format = createToolEventFormatter(false);
    const prev = process.env.NOLO_TEST_RUN_GIST_WIDTH;
    process.env.NOLO_TEST_RUN_GIST_WIDTH = "60";
    try {
      const output = format(toolEvent({
        type: "tool-result",
        toolName: "execShell",
        metadata: {
          exitCode: 0,
          command: "bun test packages/cli/client/toolOutput.test.ts packages/cli/tui/i18n.test.ts",
        },
      }));
      expect(output).toContain("▸ Run · bun test packages");
      expect(output).toContain("…  ✓");
      expect(output).not.toContain("i18n.test.ts");
    } finally {
      if (prev === undefined) delete process.env.NOLO_TEST_RUN_GIST_WIDTH;
      else process.env.NOLO_TEST_RUN_GIST_WIDTH = prev;
    }
  });

  test("normal mode clips very long commands even on wide terminals", () => {
    const format = createToolEventFormatter(false);
    const long = "echo " + "x".repeat(300);
    const output = format(toolEvent({
      type: "tool-result",
      toolName: "execShell",
      metadata: { exitCode: 0, command: long },
    }));
    expect(output).toContain("…  ✓");
    expect(output).not.toContain("x".repeat(300));
  });

  test("normal mode shows Read path with the requested line range", () => {
    const format = createToolEventFormatter(false);
    const output = format(toolEvent({
      type: "tool-result",
      toolName: "readFile",
      metadata: { path: "packages/cli/tui/sessionTypes.ts", startLine: 2, endLine: 49, totalLines: 120, truncated: true },
    }));
    expect(output).toContain("▸ Read · packages/cli/tui/sessionTypes.ts:2-49  ✓");
  });

  test("normal mode shows Fetch URL detail", () => {
    const format = createToolEventFormatter(false);
    const output = format(toolEvent({
      type: "tool-result",
      toolName: "fetchWebpage",
      metadata: { url: "https://example.com/docs/start" },
    }));
    expect(output).toContain("▸ Fetch · https://example.com/docs/start  ✓");
  });

  test("normal mode shows web search query detail", () => {
    const format = createToolEventFormatter(false);
    const output = format(toolEvent({
      type: "tool-result",
      toolName: "exa_search",
      metadata: { query: "最新的 TypeScript 发布信息" },
    }));
    expect(output).toContain("▸ Web search · 最新的 TypeScript 发布信息  ✓");
  });

  test("normal mode shows editFile as a readable line diff with the file path", () => {
    const format = createToolEventFormatter(false);
    const output = format(toolEvent({
      type: "tool-result",
      toolName: "editFile",
      metadata: {
        path: "src/server.ts",
        oldSnippet: "const port = 3000;\nconst host = \\\"localhost\\\";",
        newSnippet: "const port = 38123;\nconst host = \\\"localhost\\\";",
      },
    }));
    expect(output).toContain("server.ts");
    expect(output).toContain("- const port = 3000;");
    expect(output).toContain("+ const port = 38123;");
    expect(output).toContain("(+1, -1)");
  });

  test("normal mode shows search and memory subjects instead of bare tool labels", () => {
    const format = createToolEventFormatter(false);
    const search = format(toolEvent({
      type: "tool-result",
      toolName: "exa_search",
      metadata: { query: "StyleX migration pitfalls" },
    }));
    const memory = format(toolEvent({
      type: "tool-result",
      toolName: "rememberMemory",
      metadata: { content: "用户偏好显示工具详情" },
    }));
    expect(search).toContain("StyleX migration pitfalls");
    expect(memory).toContain("用户偏好显示工具详情");
  });

  test("normal mode shows the touched file basename as gist, never the full path", () => {
    const format = createToolEventFormatter(false);
    const output = format(toolEvent({
      type: "tool-result",
      toolName: "editFile",
      argumentsPreview: "src/server.ts",
      metadata: { exitCode: 0, path: "src/server.ts" },
    }));
    expect(output).toContain("▸ Edit · server.ts  ✓");
    expect(output).not.toContain("src/server.ts");
  });

  test("normal mode falls back to bare label when no gist metadata exists", () => {
    const format = createToolEventFormatter(false);
    const output = format(toolEvent({
      type: "tool-result",
      toolName: "listSpaces",
    }));
    expect(output).toContain(`▸ ${toolLabel("listSpaces")}  ✓`);
    expect(output).not.toContain("· ");
  });

  test("normal mode gist clips overlong basenames", () => {
    const format = createToolEventFormatter(false);
    const longName = "a-very-long-generated-test-snapshot-filename-that-keeps-going.ts";
    const output = format(toolEvent({
      type: "tool-result",
      toolName: "readFile",
      argumentsPreview: `deep/nested/dir/${longName}`,
      metadata: { path: `deep/nested/dir/${longName}` },
    }));
    expect(output).toContain("· ");
    expect(output).not.toContain(longName);
    expect(output.endsWith("…  ✓\n") || output.includes("…  ✓")).toBe(true);
  });

  test("normal mode keeps the headless ask_user menu interactive", () => {
    const line = render(
      toolEvent({
        type: "tool-result",
        toolName: "ask_user",
        content: JSON.stringify({
          type: "ask_user",
          question: "接下来做哪件事？",
          choices: [
            { id: "a", label: "生成本周周报", userMessage: "帮我生成本周周报" },
            { id: "b", label: "整理待办事项", userMessage: "帮我整理待办事项" },
          ],
          blocking: true,
        }),
        metadata: { uiAskChoice: true },
      })
    );
    expect(line).toContain("接下来做哪件事？");
    expect(line).toContain("1. 生成本周周报");
    expect(line).toContain("2. 整理待办事项");
  });

  test("normal mode keeps run cards and skill cards as product content", () => {
    const runCard = render(
      toolEvent({
        type: "tool-result",
        toolName: "controlAgentRun",
        metadata: { displayData: "Run status / ✅ done\n child-helper" },
      })
    );
    expect(runCard).toContain("Run status");
    expect(runCard).not.toContain(`▸ controlAgentRun`);

    const skillCard = render(
      toolEvent({
        type: "tool-result",
        toolName: "loadSkill",
        content: "skill body",
      })
    );
    expect(skillCard).toContain("Used Skill");
  });

  test("normal mode reports failure and needs-action without the command", () => {
    const format = createToolEventFormatter(false);
    format(
      toolEvent({
        type: "tool-call",
        toolName: "execShell",
        argumentsPreview: "bun run scripts/leaky.sh",
      })
    );
    const failed = format(
      toolEvent({
        type: "tool-result",
        toolName: "execShell",
        argumentsPreview: "bun run scripts/leaky.sh",
        metadata: { exitCode: 1, command: "bun run scripts/leaky.sh" },
      })
    );
    expect(failed).toContain(toolLabel("execShell"));
    expect(failed).toContain("✗");
    expect(failed).not.toContain("leaky");

    const gated = render(
      toolEvent({
        type: "tool-result",
        toolName: "execShell",
        metadata: {
          actionGate: {
            id: "gate-1",
            kind: "handoff",
            title: "run external command",
            status: "pending",
          },
        },
      })
    );
    expect(gated).toContain("! needs action");
    expect(gated).not.toContain("execShell echo");
  });

  test("normal mode failed run card keeps outcome/counts and the redacted error row, drops log tail", () => {
    const rawError = "Error: Anthropic API key expired: sk-ant-api03-SECRET-VALUE";
    const secretCommand = "$ curl -H 'Authorization: Bearer sk-live-SECRET' https://api.example.com";
    const event = toolEvent({
      type: "tool-result",
      toolName: "controlAgentRun",
      content: JSON.stringify({
        status: "failed",
        runId: "run-2026-abcd1234",
        agentName: "child-helper",
        toolCallCount: 3,
        errorMessage: rawError,
        logLines: [secretCommand, "DATA_CLONE_ERR: 25 DOMException"],
      }),
    });

    const normal = render(event);
    // Status/outcome and counts stay visible...
    expect(normal).toContain("failed");
    expect(normal).toContain("child-helper");
    expect(normal).toContain("3");
    // ...with the error row itself: the reason must be readable (2026-09-01
    // owner: 失败要知道具体的), secret-bearing shapes redacted in place.
    expect(normal).toContain("Anthropic API key expired");
    // The key never surfaces even though the reason does.
    expect(normal).not.toContain("sk-ant-api03-SECRET-VALUE");
    // Unbounded log lines never surface.
    expect(normal).not.toContain("sk-live-SECRET");
    expect(normal).not.toContain("curl");
    expect(normal).not.toContain("DATA_CLONE_ERR");

  });

  // P2b：版本偏斜 baked 卡（server 烘焙的旧格式 displayData/content，非 JSON）
  // —— :694 lines 路径 + sanitizeRunCardForNormal 直接覆盖。状态轮询的失败
  // run 是「成功 tool-result」携带失败快照（无 failed 标记），不得因缺少
  // 失败短路而漏出多行续行与 Log tail 段。
  const bakedLegacyCard =
    "Agent run card (legacy build)\n  Run status\n    ⏳ failed\n  agent   child-helper\n  error   Error: DATA_CLONE_ERR: 25\n    at callAnthropic (api.ts:42:9)\n    Authorization: Bearer sk-ant-api03-CONTINUATION-LEAK\n\n  Log tail:\n    $ curl -H 'Authorization: Bearer sk-live-PROBE-SECRET' https://api.example.com/x";
  const bakedCardVariants: Array<[string, Record<string, unknown>]> = [
    ["without failed marker", { displayData: bakedLegacyCard }],
    ["with failed marker", { failed: true, displayData: bakedLegacyCard }],
  ];
  for (const [variant, metadata] of bakedCardVariants) {
    test(`normal mode baked status-poll card keeps the error row, drops continuations and log tail (${variant})`, () => {
      const event = toolEvent({
        type: "tool-result",
        toolName: "controlAgentRun",
        metadata,
        content: bakedLegacyCard,
      });

      // 保密契约（2026-09-01 起 error 首行本体允许上屏，但密钥/续行/Log tail
      // 无论哪条渲染路径都不得出现）：error 行要说为什么（DATA_CLONE_ERR 可见），
      // 缩进续行（堆栈帧 / Authorization 头）与无界进程输出仍然吞掉。
      const normal = render(event);
      expect(normal).not.toContain("callAnthropic");
      expect(normal).not.toContain("sk-ant-api03-CONTINUATION-LEAK");
      expect(normal).not.toContain("sk-ant-api03-SKEWSECRET");
      expect(normal).not.toContain("sk-live-PROBE-SECRET");
      expect(normal).not.toContain("Log tail");
      if (variant === "without failed marker") {
        // 卡片投影路径：error 行本体保留（首行），失败要说为什么。
        expect(normal).toContain("DATA_CLONE_ERR");
      }

    });
  }

  test("normal mode failed orchestration result shows the redacted failure first line", () => {
    const rawError = "Error: spawn ENOENT: /opt/secret-tools/agent-runner --token sk-secret-token";
    const event = toolEvent({
      type: "tool-result",
      toolName: "startAgentRun",
      content: `${rawError}\n    at spawnAgent (child.js:12:5)`,
    });

    const normal = render(event);
    expect(normal).toContain("✗");
    // The reason itself is readable: errno + path explain what went wrong.
    expect(normal).toContain("spawn ENOENT");
    // Token-bearing shape redacted; the stack continuation never surfaces.
    expect(normal).not.toContain("sk-secret-token");
    expect(normal).not.toContain("child.js");

  });

  test("normal mode loadSkill failure is localized", () => {
    const event = toolEvent({
      type: "tool-result",
      toolName: "loadSkill",
      metadata: { name: "deploy-helper", exitCode: 1 },
      content:
        'Skill "deploy-helper" not found: ENOENT: no such file or directory, scandir \'/Users/dev/.nolo/skills/deploy-helper\'',
    });

    const normal = render(event);
    expect(normal).toContain("✗");
    expect(normal).toContain("deploy-helper");
    expect(normal).not.toContain("ENOENT");
    expect(normal).not.toContain("scandir");

  });

  test("normal mode keeps one summary line per command, in order", () => {
    const format = createToolEventFormatter(false);
    const emit = (id: string) => {
      format(
        toolEvent({
          type: "tool-call",
          toolCallId: id,
          toolName: "execShell",
          argumentsPreview: `cmd-${id}`,
        })
      );
      return format(
        toolEvent({
          type: "tool-result",
          toolCallId: id,
          toolName: "execShell",
          argumentsPreview: `cmd-${id}`,
          metadata: { exitCode: 0, command: `cmd-${id}` },
        })
      );
    };
    const first = emit("a");
    const second = emit("b");
    // One summary line per event, in order. Simple command heads are product
    // feedback since 2026-08-31 (derived gist); anything past the head tokens
    // still never surfaces.
    expect(first).toContain(`▸ ${toolLabel("execShell")} · cmd-a  ✓`);
    expect(second).toContain(`▸ ${toolLabel("execShell")} · cmd-b  ✓`);
    expect(first.trim().length).toBeGreaterThan(0);
    expect(second.trim().length).toBeGreaterThan(0);
  });

  test("normal spinner/activity label carries the verb only, never the command", () => {
    const label = formatConservativeActiveToolLabel({
      toolName: "execShell",
      argumentsPreview: "cd /srv/app && echo deploy-token | tee log",
    });
    expect(label).toBe(toolLabel("execShell"));
    expect(label).not.toContain("deploy-token");
    expect(label).not.toContain("echo");
  });

  test("renders setTodoList as a readable task list", () => {
    const format = createToolEventFormatter(false);
    const output = format(
      toolEvent({
        type: "tool-result",
        toolName: "setTodoList",
        content: JSON.stringify({
          todos: [
            { title: "Inspect runtime", status: "done" },
            { title: "Add toggle", status: "in_progress" },
            { title: "Add tests", status: "pending" },
          ],
        }),
      }),
    );
    expect(output).toContain("Todo (3)");
    expect(output).toContain("✓ Inspect runtime");
    expect(output).toContain("◐ Add toggle");
    expect(output).toContain("○ Add tests");
  });

  test("malformed setTodoList output is not reported as an empty Todo", () => {
    const format = createToolEventFormatter(false);
    const output = format(
      toolEvent({
        type: "tool-result",
        toolName: "setTodoList",
        content: "not-json",
      }),
    );
    expect(output).not.toContain("(empty)");
    expect(output).toContain("setTodoList");
  });

  test("renders ask_user as a question + numbered choices", () => {
    const line = render(
      toolEvent({
        type: "tool-result",
        toolName: "ask_user",
        content: JSON.stringify({
          type: "ask_user",
          question: "接下来你希望我帮你做哪件事？",
          choices: [
            { id: "a", label: "生成本周周报", userMessage: "帮我生成本周周报" },
            { id: "b", label: "整理待办事项", userMessage: "帮我整理待办事项" },
          ],
          blocking: true,
        }),
        metadata: { uiAskChoice: true },
      })
    );
    // Should NOT be the generic compact trace line.
    expect(line).not.toContain("✓");
    // Should render the question and numbered options.
    expect(line).toContain("接下来你希望我帮你做哪件事？");
    expect(line).toContain("1. 生成本周周报");
    expect(line).toContain("2. 整理待办事项");
  });

  test("renders a resolved ask_user as question + selected", () => {
    const line = render(
      toolEvent({
        type: "tool-result",
        toolName: "ask_user",
        content: JSON.stringify({
          type: "ask_user",
          question: "选哪个？",
          choices: [
            { id: "a", label: "选项 A", userMessage: "我选 A" },
            { id: "b", label: "选项 B", userMessage: "我选 B" },
          ],
          blocking: true,
          selected: { label: "选项 A", userMessage: "我选 A" },
        }),
        metadata: { uiAskChoice: true, resolved: true },
      })
    );
    expect(line).toContain("选哪个？");
    expect(line).toContain("选项 A");
    // Resolved history must NOT re-print the interactive menu / type-a-number hint.
    expect(line).not.toContain("1. 选项 A");
    expect(line).not.toContain("请输入序号");
    expect(line).not.toContain("Type a number");
  });

  test("keeps resolved ask_user out of the menu when selected label is empty", () => {
    const line = render(
      toolEvent({
        type: "tool-result",
        toolName: "ask_user",
        content: JSON.stringify({
          type: "ask_user",
          question: "选哪个？",
          choices: [
            { id: "a", label: "选项 A", userMessage: "我选 A" },
            { id: "b", label: "选项 B", userMessage: "我选 B" },
          ],
          blocking: true,
          selected: { label: "", userMessage: "" },
        }),
        metadata: { uiAskChoice: true, resolved: true },
      })
    );
    expect(line).toContain("选哪个？");
    expect(line).toContain("✓");
    expect(line).not.toContain("1. 选项 A");
    expect(line).not.toContain("请输入序号");
    expect(line).not.toContain("Type a number");
  });

  test("renders a cancelled ask_user without the menu", () => {
    const line = render(
      toolEvent({
        type: "tool-result",
        toolName: "ask_user",
        content: JSON.stringify({
          type: "ask_user",
          question: "选哪个？",
          choices: [{ id: "a", label: "选项 A" }],
          blocking: true,
          selected: { label: "", userMessage: "" },
          cancelled: true,
        }),
        metadata: { uiAskChoice: true, resolved: true, cancelled: true },
      })
    );
    expect(line).toContain("选哪个？");
    expect(line).not.toContain("1. 选项 A");
    expect(line).not.toContain("请输入序号");
  });

  test("falls back to the generic line when ask_user content is missing", () => {
    const line = render(
      toolEvent({
        type: "tool-result",
        toolName: "ask_user",
        content: "",
        metadata: { uiAskChoice: true },
      })
    );
    // No parseable content → falls through to the generic compact trace.
    expect(line).toContain("✓");
  });

  test("createSseToolEventAdapter maps SSE tool payloads to LocalAgentToolEvent", () => {
    const events: LocalAgentToolEvent[] = [];
    const adapter = createSseToolEventAdapter((evt) => events.push(evt));

    // tool_start with calls
    adapter.onToolStart(["readFile"]);
    expect(events.length).toBe(1);
    expect(events[0]).toEqual({
      type: "tool-call",
      toolCallId: "sse-call-1",
      toolName: "readFile",
      round: 0,
    });

    // tool_result with content truncation (<= 120 chars) and metadata passthrough
    const longContent = "a".repeat(150);
    const resultEvt = adapter.onToolResult({
      toolName: "readFile",
      content: longContent,
      metadata: { ok: true },
    });
    expect(resultEvt.type).toBe("tool-result");
    expect(resultEvt.summary?.length).toBeLessThanOrEqual(120);
    expect(resultEvt.summary?.endsWith("…")).toBe(true);
    expect(resultEvt.metadata).toEqual({ ok: true });
    expect(resultEvt.round).toBe(0);

    // tool_end increments round
    adapter.onToolEnd();

    adapter.onToolStart(["execShell"]);
    expect(events[events.length - 1]).toEqual({
      type: "tool-call",
      toolCallId: "sse-call-2",
      toolName: "execShell",
      round: 1,
    });
  });

  test("createSseToolEventAdapter preserves provider tool ids for unusual parallel calls", () => {
    const events: LocalAgentToolEvent[] = [];
    const adapter = createSseToolEventAdapter((evt) => events.push(evt));

    adapter.onToolStart({
      calls: [
        { toolCallId: "fc_weather_beijing", toolName: "get_weather" },
        { toolCallId: "fc_weather_shanghai", toolName: "get_weather" },
      ],
    });

    expect(events.map((event) => event.toolCallId)).toEqual([
      "fc_weather_beijing",
      "fc_weather_shanghai",
    ]);

    const secondResult = adapter.onToolResult({
      toolCallId: "fc_weather_shanghai",
      toolName: "get_weather",
      content: "Shanghai: 31C",
    });
    const firstResult = adapter.onToolResult({
      toolCallId: "fc_weather_beijing",
      toolName: "get_weather",
      content: "Beijing: 29C",
    });

    expect(secondResult.toolCallId).toBe("fc_weather_shanghai");
    expect(firstResult.toolCallId).toBe("fc_weather_beijing");
    expect(secondResult.toolName).toBe("get_weather");
    expect(firstResult.toolName).toBe("get_weather");
  });

  test("detectCodeLangFromPath recognizes supported file extensions", () => {
    expect(detectCodeLangFromPath("file.ts")).toBe("js");
    expect(detectCodeLangFromPath("file.tsx")).toBe("js");
    expect(detectCodeLangFromPath("file.js")).toBe("js");
    expect(detectCodeLangFromPath("file.mjs")).toBe("js");
    expect(detectCodeLangFromPath("file.cjs")).toBe("js");
    expect(detectCodeLangFromPath("script.py")).toBe("py");
    expect(detectCodeLangFromPath("build.sh")).toBe("sh");
    expect(detectCodeLangFromPath("data.json")).toBe("json");
    expect(detectCodeLangFromPath("notes.txt")).toBe("unknown");
    expect(detectCodeLangFromPath(undefined)).toBe("unknown");
  });

  test("clipPathAware elides the middle of a long path, keeping leading dirs and the filename", () => {
    // > 72 chars: a deep path whose tail (filename) is the most identifying part.
    const longPath =
      "packages/cli/tui/readlineWorkspacePromptBuffer/module/deepNest/readlineWorkspace.ts";
    const out = clipPathAware(longPath);
    expect(out.length).toBeLessThanOrEqual(72);
    expect(out).toContain("…");
    // Full filename survives — that is the whole point of eliding the middle.
    expect(out.endsWith("readlineWorkspace.ts")).toBe(true);
    // More than the first segment survives when the budget allows it. Keeping
    // only "packages/…" would be nearly useless in a monorepo where every path
    // starts with the same top-level directory.
    expect(out.startsWith("packages/cli/tui/")).toBe(true);
  });

  test("clipPathAware keeps the leading slash of an absolute path", () => {
    // An absolute path splits into an empty first segment. Accumulator-style
    // prefix building treats that empty string as falsy and drops the leading
    // "/", rendering an absolute path as a relative-looking one.
    const absolute =
      "/Users/nolotus/bun-nolo/packages/cli/tui/deeply/nested/readlineWorkspace.ts";
    const out = clipPathAware(absolute);
    expect(out.length).toBeLessThanOrEqual(72);
    expect(out).toContain("…");
    expect(out.startsWith("/Users/nolotus/")).toBe(true);
    expect(out.endsWith("readlineWorkspace.ts")).toBe(true);
  });

  test("clipPathAware drops leading dirs that do not fit the budget", () => {
    // Deep enough that the greedy prefix cannot keep every leading segment.
    const deeper =
      "packages/agent-runtime/deeply/nested/module/tree/with/many/levels/localWorkspaceToolExecutors.ts";
    const out = clipPathAware(deeper);
    expect(out.length).toBeLessThanOrEqual(72);
    expect(out.endsWith("localWorkspaceToolExecutors.ts")).toBe(true);
    expect(out.startsWith("packages/agent-runtime/")).toBe(true);
    // The segments that did not fit are gone, replaced by the elision.
    expect(out).toContain("…");
    expect(out).not.toContain("/levels/");
  });

  test("clipPathAware leaves a short path untouched", () => {
    const shortPath = "packages/cli/tui/theme.ts";
    const out = clipPathAware(shortPath);
    expect(out).toBe(shortPath);
    expect(out).not.toContain("…");
  });

  test("clipPathAware falls back to tail clip for non-path (spaced) values", () => {
    // Contains a space → not a path → shared tail clip, ends with ellipsis.
    // Must exceed max (72) so clipping actually triggers.
    const cmd = "bun test packages/cli/tui packages/cli/client --filter some-very-long-tag-name-that-pushes-past-limit-xyz";
    expect(cmd.length).toBeGreaterThan(72);
    const out = clipPathAware(cmd);
    expect(out.endsWith("…")).toBe(true);
    // Should not be a middle elision (no "/…/" pattern).
    expect(out).not.toContain("/…/");
  });

  test("clipPathAware falls back to tail clip when the filename alone meets the budget", () => {
    // A single segment (no slash) is not a path; a single-segment filename
    // that itself exceeds max must fall back to the shared tail clip.
    const hugeFile = "x".repeat(100);
    const out = clipPathAware(hugeFile);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(72);
  });

  test("renders loadSkill as single-line i18n badge (no color)", () => {
    const line = render(
      toolEvent({
        type: "tool-result",
        toolName: "loadSkill",
        argumentsPreview: "nolo-plan",
        content: 'Skill "nolo-plan" loaded inline. Follow its instructions.',
      })
    );
    expect(line).toBe("✦ Used Skill: nolo-plan\n");
  });

  test("loadSkill prefers metadata.name and falls back to content parsing", () => {
    // metadata.name takes precedence over argumentsPreview.
    const line = render(
      toolEvent({
        type: "tool-result",
        toolName: "loadSkill",
        argumentsPreview: '{ "name": "ignored" }',
        metadata: { name: "search-first" },
        content: 'Skill "search-first" loaded inline. Follow its instructions.',
      })
    );
    expect(line).toBe("✦ Used Skill: search-first\n");
    // No-color path must not emit ANSI escapes.
    expect(line).not.toContain("\x1b");
  });

  test("loadSkill with color emits single-line success star and badge", () => {
    const line = render(
      toolEvent({
        type: "tool-result",
        toolName: "loadSkill",
        argumentsPreview: "nolo-plan",
        content: 'Skill "nolo-plan" loaded inline. Follow its instructions.',
      }),
      true
    );
    expect(line).toContain("Used Skill");
    expect(line).toContain("nolo-plan");
    expect(line).toContain("✦");
    // Single line output
    expect(line.split("\n").filter(Boolean)).toHaveLength(1);
    // ANSI present (color enabled).
    expect(line).toContain("\x1b");
  });

  test("loadSkill tool-error falls through to the generic ✗ line", () => {
    const line = render(
      toolEvent({
        type: "tool-error",
        toolName: "loadSkill",
        argumentsPreview: "nolo-plan",
        message: "skill not found",
      })
    );
    // tool-error keeps the existing ✗ convention; no Used Skill block.
    expect(line).toContain(toolLabel("loadSkill"));
    expect(line).toContain("✗");
    // The reason is on the line now (2026-09-01: 失败要说为什么).
    expect(line).toContain("skill not found");
    // The inline-loaded detail line must not appear on a failure.
    expect(line).not.toContain("loaded inline");
    // Single trace line, not the two-line success block.
    expect(line.split("\n").filter(Boolean)).toHaveLength(1);
  });

  test("loadSkill not-found result renders ✗ instead of success block", () => {
    // not-found is a plain tool-result (executors return text, never throw):
    // it must render as failure, consistent with the web/RN renderers.
    const line = render(
      toolEvent({
        type: "tool-result",
        toolName: "loadSkill",
        argumentsPreview: "ghost",
        content:
          'Skill "ghost" not found in this workspace\'s skill directory (.agents/skills/<name>/SKILL.md).\n\nAvailable skills: nolo-plan',
      })
    );
    expect(line).toContain("✗");
    expect(line).toContain("Used Skill (ghost)");
    // Safe projection: the raw diagnostic (paths, available-skill list) stays hidden.
    expect(line).not.toContain("not found");
    expect(line).not.toContain("loaded inline");
    expect(line).not.toContain("●");
    expect(line.split("\n").filter(Boolean)).toHaveLength(1);
  });

  test("loadSkill chip is localized in zh (single-line i18n badge)", () => {
    setCliLocale("zh");
    try {
      const line = render(
        toolEvent({
          type: "tool-result",
          toolName: "loadSkill",
          argumentsPreview: "search-all-spaces",
          content: 'Skill "search-all-spaces" loaded inline. Follow its instructions.',
        })
      );
      // 单行简洁 chip，与截图一致：✦ 已加载技能: <skillName>
      expect(line).toBe("✦ 已加载技能: search-all-spaces\n");
      expect(line).not.toContain("\x1b");
    } finally {
      setCliLocale("en");
    }
  });

  test("renders listAgents / startAgentRun / controlAgentRun as formatted cards (no color)", () => {
    const listLine = render(
      toolEvent({
        type: "tool-result",
        toolName: "listAgents",
        metadata: {
          displayData: "Agents (2)\n★ Agent A  model-x  platform\n  Agent B  model-y  custom",
        },
      })
    );
    expect(listLine).toBe("● listAgents\n  Agents (2)\n  ★ Agent A  model-x  platform\n    Agent B  model-y  custom\n");

    const startLine = render(
      toolEvent({
        type: "tool-result",
        toolName: "startAgentRun",
        metadata: {
          displayData: "Run started\n  agent   agent-a\n  runId   run-123\n  pid     999",
        },
      })
    );
    expect(startLine).toBe("● startAgentRun\n  Run started\n    agent   agent-a\n    runId   run-123\n    pid     999\n");

    const controlLine = render(
      toolEvent({
        type: "tool-result",
        toolName: "controlAgentRun",
        metadata: {
          displayData: "Run stopped\n  🛑 killed\n  runId   run-123",
        },
      })
    );
    expect(controlLine).toBe("● controlAgentRun\n  Run stopped\n    🛑 killed\n    runId   run-123\n");
  });

  test("orchestration card recovers readable card from JSON content when displayData missing", () => {
    const listLine = render(
      toolEvent({
        type: "tool-result",
        toolName: "listAgents",
        content: JSON.stringify({
          success: true,
          total: 1,
          agents: [
            {
              name: "Agent A",
              model: "model-x",
              apiSource: "platform",
              isFavorite: true,
              agentKey: "agent-pub-a",
              publicKey: "agent-pub-a",
            },
          ],
        }),
      })
    );
    expect(listLine).toBe(
      "● listAgents\n  Agents (1)\n  ★  Agent A  model-x  platform  agent-pub-a\n"
    );

    const startLine = render(
      toolEvent({
        type: "tool-result",
        toolName: "startAgentRun",
        content: JSON.stringify({ runId: "run-9", status: "pending" }),
      })
    );
    expect(startLine).toContain("● startAgentRun");
    expect(startLine).toContain("Run started");
    expect(startLine).not.toContain("runId");
    expect(startLine).not.toContain('{"runId"');
  });

  test("orchestration card renders failure line with ✗ and shows the readable reason", () => {
    const failLine = render(
      toolEvent({
        type: "tool-result",
        toolName: "startAgentRun",
        content: "Error: missing agentKey",
        metadata: { failed: true },
      })
    );
    expect(failLine).toContain("✗ startAgentRun");
    // 失败原因现在直接显示，便于定位问题。
    expect(failLine).toContain("missing agentKey");
  });

  test("controlAgentRun status without agentName does not render agent   agent", () => {
    const line = render(
      toolEvent({
        type: "tool-result",
        toolName: "controlAgentRun",
        content: JSON.stringify({
          runId: "run-x",
          status: "running",
          logLines: ["hello"],
        }),
      })
    );
    expect(line).toContain("● controlAgentRun");
    expect(line).toContain("⏳ running");
    expect(line).not.toContain("agent   agent");
    expect(line.split("\n").some((l) => /^\s*agent\s+agent\s*$/.test(l))).toBe(false);
  });
});

describe("toolOutput normal-mode duration & secret guard", () => {
  const normal = (event: LocalAgentToolEvent) => createToolEventFormatter(false)(event);

  test("duration shows only above 500ms", () => {
    const base = { type: "tool-result" as const, toolName: "customTool" };
    expect(normal(toolEvent({ ...base, elapsedMs: 120 }))).not.toContain("120ms");
    expect(normal(toolEvent({ ...base, elapsedMs: 500 }))).not.toContain("500ms");
    expect(normal(toolEvent({ ...base, elapsedMs: 900 }))).toContain("900ms");
    expect(normal(toolEvent({ ...base, elapsedMs: 1000 }))).toContain("1.0s");
    expect(normal(toolEvent({ ...base, elapsedMs: 2000 }))).toContain("2.0s");
  });

  test("collapsed tree leaves go through the same secret guard", () => {
    const treeFormatter = createToolEventFormatter(false, { tuiTrees: true });
    const fetchOk = (url: string) =>
      toolEvent({ type: "tool-result" as const, toolName: "fetchWebpage", metadata: { url } });
    treeFormatter(fetchOk("https://example.com/a"));
    const second = treeFormatter(fetchOk("https://api.example.com/v1?key=sk-ant-api03-abcdef0123456789"));
    expect(second).not.toContain("sk-ant");
    expect(second).not.toContain("api.example.com");
    expect(second).toContain("example.com/a");
  });

  test("gist withheld when secret-like strings reach runtime projections", () => {
    const leakyUrl = "https://api.example.com/v1/data?api_key=sk-ant-api03-abcdef0123456789";
    const fetchLine = normal(
      toolEvent({ type: "tool-result", toolName: "fetchWebpage", metadata: { url: leakyUrl } }),
    );
    expect(fetchLine).not.toContain("sk-ant");
    expect(fetchLine).not.toContain("api.example.com");

    const bearerQuery = normal(
      toolEvent({
        type: "tool-result",
        toolName: "exa_search",
        metadata: { query: "Authorization: Bearer sk-live-abcdef0123456789 docs" },
      }),
    );
    expect(bearerQuery).not.toContain("Bearer");
    expect(bearerQuery).not.toContain("sk-live");

    const ghpQuery = normal(
      toolEvent({
        type: "tool-result",
        toolName: "exa_search",
        metadata: { query: "github token ghp_0123456789abcdef usage" },
      }),
    );
    expect(ghpQuery).not.toContain("ghp_0123456789");
  });

  test("benign gists survive the guard", () => {
    const runLine = normal(
      toolEvent({
        type: "tool-result",
        toolName: "execShell",
        metadata: { command: "bun run typecheck" },
        elapsedMs: 1200,
      }),
    );
    expect(runLine).toContain("bun");
    expect(runLine).toContain("✓");
    expect(runLine).toContain("1.2s");
  });
});
