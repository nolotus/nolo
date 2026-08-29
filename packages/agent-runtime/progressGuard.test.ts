import { describe, expect, it } from "bun:test";
import {
  DEFAULT_MAX_CONSECUTIVE_IDENTICAL_ROUNDS,
  DEFAULT_MAX_CONSECUTIVE_STAGNANT_TOOL_ROUNDS,
  LocalLoopProgressGuard,
  buildAssistantActionFingerprint,
  buildToolCallsSignature,
  buildToolResultsSignature,
  createLocalLoopProgressGuard,
  normalizeToolArguments,
  resolveProgressGuardConfig,
} from "./progressGuard";

describe("progressGuard standalone logic", () => {
  describe("normalization & signatures", () => {
    it("normalizes tool arguments with different key order to identical signature", () => {
      const args1 = JSON.stringify({ path: "foo.ts", flag: true, count: 1 });
      const args2 = JSON.stringify({ count: 1, flag: true, path: "foo.ts" });
      expect(normalizeToolArguments(args1)).toBe(normalizeToolArguments(args2));
    });

    it("builds consistent tool call signatures", () => {
      const sig1 = buildToolCallsSignature([
        {
          id: "call-1",
          type: "function",
          function: { name: "readFile", arguments: '{"path":"a.ts"}' },
        },
      ]);
      const sig2 = buildToolCallsSignature([
        {
          id: "call-2",
          type: "function",
          function: { name: "readFile", arguments: '{"path":"a.ts"}' },
        },
      ]);
      const sig3 = buildToolCallsSignature([
        {
          id: "call-3",
          type: "function",
          function: { name: "readFile", arguments: '{"path":"b.ts"}' },
        },
      ]);
      expect(sig1).toBe(sig2);
      expect(sig1).not.toBe(sig3);
    });

    it("builds consistent assistant action fingerprints", () => {
      const fp1 = buildAssistantActionFingerprint({
        content: "I will check the file now.",
        reasoning_content: "let me think",
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: { name: "readFile", arguments: '{"path":"a.ts"}' },
          },
        ],
      });
      const fp2 = buildAssistantActionFingerprint({
        content: "  I will check the file now.  ",
        reasoning_content: " let me think ",
        tool_calls: [
          {
            id: "call-2",
            type: "function",
            function: { name: "readFile", arguments: '{"path":"a.ts"}' },
          },
        ],
      });
      expect(fp1.fingerprint).toBe(fp2.fingerprint);
      expect(fp1.hasNonEmptyText).toBe(true);
      expect(fp1.hasToolCalls).toBe(true);
      expect(fp1).toEqual(fp2);
    });
  });

  describe("circuit breaker for pure text repetition loops (no tool calls)", () => {
    it("trips circuit breaker when assistant repeats the exact same text without tools", () => {
      const guard = createLocalLoopProgressGuard({
        maxConsecutiveIdenticalRounds: 3,
      });

      const response = {
        content: "I am repeating this exact text 20+ times without calling any tools...",
      };

      // Round 1
      expect(guard.observeAssistantResponse(response)).toEqual({
        action: "continue",
      });
      // Round 2
      expect(guard.observeAssistantResponse(response)).toEqual({
        action: "continue",
      });
      // Round 3 -> Trips immediately on text repetition
      const verdict = guard.observeAssistantResponse(response);
      expect(verdict.action).toBe("stall");
      if (verdict.action === "stall") {
        expect(verdict.reason).toBe("repetition_loop");
        expect(verdict.consecutiveRounds).toBe(3);
      }
    });

    it("resets text repetition streak when assistant text changes", () => {
      const guard = createLocalLoopProgressGuard({
        maxConsecutiveIdenticalRounds: 3,
      });

      expect(
        guard.observeAssistantResponse({ content: "Thinking step 1" }),
      ).toEqual({ action: "continue" });
      expect(
        guard.observeAssistantResponse({ content: "Thinking step 1" }),
      ).toEqual({ action: "continue" });
      expect(
        guard.observeAssistantResponse({ content: "Thinking step 2 (changed)" }),
      ).toEqual({ action: "continue" });
      expect(
        guard.observeAssistantResponse({ content: "Thinking step 2 (changed)" }),
      ).toEqual({ action: "continue" });
    });
  });

  describe("tightened repetition guard with tool calls (avoids killing legitimate polling)", () => {
    it("never trips repetition guard when assistant narrative is identical but tool results keep changing (legitimate polling 12 rounds)", () => {
      const guard = createLocalLoopProgressGuard({
        maxConsecutiveIdenticalRounds: 5,
        maxConsecutiveStagnantToolRounds: 8,
      });

      const toolCalls = [
        {
          id: "call-1",
          type: "function" as const,
          function: { name: "execShell", arguments: '{"command":"check-build"}' },
        },
      ];

      // 12 rounds of polling with identical narration and identical command, but changing results
      for (let round = 1; round <= 12; round++) {
        // Assistant says the exact same narration every round: "Checking build progress..."
        const assistantVerdict = guard.observeAssistantResponse({
          content: "Checking build progress, let me inspect again...",
          tool_calls: toolCalls,
        });
        expect(assistantVerdict.action).toBe("continue");

        // Tool output changes every round: 10% -> 20% -> 30% ...
        const toolVerdict = guard.observeToolExecution(toolCalls, [
          {
            toolName: "execShell",
            content: `Build in progress: ${round * 8}% completed`,
          },
        ]);
        expect(toolVerdict.action).toBe("continue");
      }
    });

    it("trips repetition guard when assistant narrative AND tool calls AND tool results are ALL unchanged", () => {
      const guard = createLocalLoopProgressGuard({
        maxConsecutiveIdenticalRounds: 4,
      });

      const toolCalls = [
        {
          id: "call-1",
          type: "function" as const,
          function: { name: "readFile", arguments: '{"path":"target.ts"}' },
        },
      ];
      const toolResults = [
        { toolName: "readFile", content: "const x = 1;" },
      ];

      for (let round = 1; round <= 3; round++) {
        expect(
          guard.observeAssistantResponse({
            content: "Looking at target.ts",
            tool_calls: toolCalls,
          }),
        ).toEqual({ action: "continue" });

        expect(guard.observeToolExecution(toolCalls, toolResults)).toEqual({
          action: "continue",
        });
      }

      // Round 4: assistant same
      expect(
        guard.observeAssistantResponse({
          content: "Looking at target.ts",
          tool_calls: toolCalls,
        }),
      ).toEqual({ action: "continue" });

      // Round 4 tool execution: tool result still unchanged -> trips repetition_loop
      const verdict = guard.observeToolExecution(toolCalls, toolResults);
      expect(verdict.action).toBe("stall");
      if (verdict.action === "stall") {
        expect(verdict.reason).toBe("repetition_loop");
        expect(verdict.consecutiveRounds).toBe(4);
      }
    });
  });

  describe("circuit breaker for stagnant tool loops (unchanged calls & results regardless of minor narration edits)", () => {
    it("trips circuit breaker after consecutive stagnant tool calls reach threshold", () => {
      const guard = createLocalLoopProgressGuard({
        maxConsecutiveStagnantToolRounds: 4,
      });

      const toolCalls = [
        {
          id: "call-1",
          type: "function" as const,
          function: { name: "readFile", arguments: '{"path":"target.ts"}' },
        },
      ];
      const toolResults = [
        {
          toolName: "readFile",
          content: "export const x = 1;",
          metadata: { size: 20 },
        },
      ];

      // Rounds 1-3 continue (even if assistant narrative changes slightly)
      for (let round = 1; round <= 3; round++) {
        expect(
          guard.observeAssistantResponse({
            content: `Trying step ${round}`,
            tool_calls: toolCalls,
          }),
        ).toEqual({ action: "continue" });
        expect(guard.observeToolExecution(toolCalls, toolResults)).toEqual({
          action: "continue",
        });
      }

      // Round 4 tool execution trips
      guard.observeAssistantResponse({
        content: "Trying step 4",
        tool_calls: toolCalls,
      });
      const verdict = guard.observeToolExecution(toolCalls, toolResults);
      expect(verdict.action).toBe("stall");
      if (verdict.action === "stall") {
        expect(verdict.reason).toBe("stagnant_tool_calls");
        expect(verdict.consecutiveRounds).toBe(4);
      }
    });

    it("resets stagnant tool streak when tool outputs change", () => {
      const guard = createLocalLoopProgressGuard({
        maxConsecutiveStagnantToolRounds: 3,
      });

      const toolCalls = [
        {
          id: "call-1",
          type: "function" as const,
          function: { name: "execShell", arguments: '{"command":"check"}' },
        },
      ];

      // Round 1: pending
      expect(
        guard.observeToolExecution(toolCalls, [
          { toolName: "execShell", content: "status: pending" },
        ]),
      ).toEqual({ action: "continue" });

      // Round 2: pending (streak = 2)
      expect(
        guard.observeToolExecution(toolCalls, [
          { toolName: "execShell", content: "status: pending" },
        ]),
      ).toEqual({ action: "continue" });

      // Round 3: done (streak resets to 1)
      expect(
        guard.observeToolExecution(toolCalls, [
          { toolName: "execShell", content: "status: done" },
        ]),
      ).toEqual({ action: "continue" });

      // Round 4: done (streak = 2, below 3)
      expect(
        guard.observeToolExecution(toolCalls, [
          { toolName: "execShell", content: "status: done" },
        ]),
      ).toEqual({ action: "continue" });
    });
  });

  describe("safety & legitimate multi-round tasks guarantee", () => {
    it("never trips guard on legitimate 25-round coding task with varying files and commands", () => {
      const guard = createLocalLoopProgressGuard({
        maxConsecutiveIdenticalRounds: 5,
        maxConsecutiveStagnantToolRounds: 8,
      });

      for (let round = 1; round <= 25; round++) {
        // Assistant says different things or calls different tools
        const assistantVerdict = guard.observeAssistantResponse({
          content: `Working on step ${round}`,
          tool_calls: [
            {
              id: `call-${round}`,
              type: "function",
              function: {
                name: round % 2 === 0 ? "editFile" : "readFile",
                arguments: JSON.stringify({ path: `file_${round}.ts` }),
              },
            },
          ],
        });
        expect(assistantVerdict.action).toBe("continue");

        // Tool results vary
        const toolVerdict = guard.observeToolExecution(
          [
            {
              id: `call-${round}`,
              type: "function",
              function: {
                name: round % 2 === 0 ? "editFile" : "readFile",
                arguments: JSON.stringify({ path: `file_${round}.ts` }),
              },
            },
          ],
          [
            {
              toolName: round % 2 === 0 ? "editFile" : "readFile",
              content: `Content of file_${round}.ts at version ${round}`,
            },
          ],
        );
        expect(toolVerdict.action).toBe("continue");
      }
    });
  });

  describe("config & env resolution", () => {
    it("defaults to 5 identical and 8 stagnant rounds", () => {
      const config = resolveProgressGuardConfig({}, {});
      expect(config.disabled).toBe(false);
      expect(config.maxConsecutiveIdenticalRounds).toBe(
        DEFAULT_MAX_CONSECUTIVE_IDENTICAL_ROUNDS,
      );
      expect(config.maxConsecutiveStagnantToolRounds).toBe(
        DEFAULT_MAX_CONSECUTIVE_STAGNANT_TOOL_ROUNDS,
      );
    });

    it("respects env variables when options not specified", () => {
      const config = resolveProgressGuardConfig(
        {},
        {
          NOLO_LOOP_MAX_IDENTICAL_ROUNDS: "10",
          NOLO_LOOP_MAX_STAGNANT_TOOL_ROUNDS: "15",
          NOLO_LOOP_PROGRESS_GUARD_DISABLED: "true",
        },
      );
      expect(config.disabled).toBe(true);
      expect(config.maxConsecutiveIdenticalRounds).toBe(10);
      expect(config.maxConsecutiveStagnantToolRounds).toBe(15);
    });

    it("options take precedence over env variables", () => {
      const config = resolveProgressGuardConfig(
        {
          disabled: false,
          maxConsecutiveIdenticalRounds: 4,
        },
        {
          NOLO_LOOP_MAX_IDENTICAL_ROUNDS: "10",
          NOLO_LOOP_PROGRESS_GUARD_DISABLED: "true",
        },
      );
      expect(config.disabled).toBe(false);
      expect(config.maxConsecutiveIdenticalRounds).toBe(4);
    });
  });
});
