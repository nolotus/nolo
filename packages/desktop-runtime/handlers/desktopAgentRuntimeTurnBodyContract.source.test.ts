import { describe, expect, it } from "bun:test";

/**
 * D4: turn body field contract.
 *
 * `buildDesktopAgentRuntimeTurnBody` (client) and `parseDesktopAgentRuntimeTurnBody`
 * (host handler) are the two ends of the `/api/desktop/agent-runtime/turn` body
 * contract. This test builds a body carrying every optional field the client
 * can emit, runs it through the handler parser, and asserts that every field
 * the client sent is preserved by the parser (field-set equality + value
 * semantic equality). If either side adds a field and forgets the other, this
 * test goes red.
 */

import { buildDesktopAgentRuntimeTurnBody } from "../../app/utils/desktopAgentRuntimeTurnClient";
import {
  parseDesktopAgentRuntimeTurnBody,
  type DesktopAgentRuntimeTurnBody,
} from "./desktopAgentRuntimeTurnHandler";
import type {
  DesktopAgentRuntimeAgentConfigSnapshot,
  DesktopAgentRuntimeDialogHistorySnapshot,
} from "../../agent-runtime/desktopRequestSnapshot";

const AGENT_REF = "agent-local-contract";
const CONTINUE_DIALOG_ID = "dlg-contract-1";

const baseAgentRecord = (): Record<string, unknown> => ({
  dbKey: AGENT_REF,
  name: "Contract Agent",
  prompt: "You are a contract agent.",
  provider: "openai",
  model: "gpt-4o-mini",
  tools: ["read", "writeFile"],
});

describe("desktopAgentRuntimeTurn body contract (client builder ↔ handler parser)", () => {
  it("preserves every optional field the client emits (full-field parity)", () => {
    const agentConfigSnapshot = buildDesktopAgentRuntimeTurnBody({
      agentRef: AGENT_REF,
      input: "contract turn",
      continueDialogId: CONTINUE_DIALOG_ID,
      dialogKey: `dialog-user-1-${CONTINUE_DIALOG_ID}`,
      cwd: "/workspace/contract",
      restrictShellToWorkspace: true,
      workspaceToolsHint: true,
      runtimeContext: { subjectRefs: [{ kind: "table-row", id: "row-1", role: "task" }] },
      agentConfigSnapshot: baseAgentRecord(),
      dialogMessages: [
        { role: "user", content: "earlier turn" },
        { role: "assistant", content: "earlier reply" },
      ],
    });

    const parsed = parseDesktopAgentRuntimeTurnBody(agentConfigSnapshot);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const body: DesktopAgentRuntimeTurnBody = parsed.body;

    // Required fields
    expect(body.agentRef).toBe(AGENT_REF);
    expect(body.input).toBe("contract turn");

    // Optional fields preserved with semantic equality
    expect(body.continueDialogId).toBe(CONTINUE_DIALOG_ID);
    expect(body.dialogKey).toBe(`dialog-user-1-${CONTINUE_DIALOG_ID}`);
    expect(body.cwd).toBe("/workspace/contract");
    expect(body.restrictShellToWorkspace).toBe(true);
    expect(body.workspaceToolsHint).toBe(true);
    expect(body.runtimeContext).toEqual({
      subjectRefs: [{ kind: "table-row", id: "row-1", role: "task" }],
    });

    // Snapshots are preserved (dbKey + structural fields)
    expect(body.agentConfigSnapshot).toBeDefined();
    const snapshot = body.agentConfigSnapshot as DesktopAgentRuntimeAgentConfigSnapshot;
    expect(snapshot.dbKey).toBe(AGENT_REF);
    expect(snapshot.name).toBe("Contract Agent");
    expect(snapshot.provider).toBe("openai");
    expect(snapshot.model).toBe("gpt-4o-mini");
    expect(snapshot.tools).toEqual(["read", "writeFile"]);

    expect(body.dialogHistorySnapshot).toBeDefined();
    const history = body.dialogHistorySnapshot as DesktopAgentRuntimeDialogHistorySnapshot;
    expect(history.dialogId).toBe(CONTINUE_DIALOG_ID);
    expect(history.messages.length).toBeGreaterThan(0);
  });

  it("field set emitted by client equals field set preserved by handler (no silent drops/adds)", () => {
    const body = buildDesktopAgentRuntimeTurnBody({
      agentRef: AGENT_REF,
      input: "field-set parity",
      continueDialogId: CONTINUE_DIALOG_ID,
      dialogKey: `dialog-user-1-${CONTINUE_DIALOG_ID}`,
      cwd: "/workspace/fieldset",
      restrictShellToWorkspace: true,
      workspaceToolsHint: true,
      runtimeContext: { foo: "bar" },
      agentConfigSnapshot: baseAgentRecord(),
      dialogMessages: [{ role: "user", content: "x" }],
    });

    const clientFieldSet = new Set(Object.keys(body).filter((k) => body[k as keyof typeof body] !== undefined));

    const parsed = parseDesktopAgentRuntimeTurnBody(body);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const handlerFieldSet = new Set(Object.keys(parsed.body).filter((k) => parsed.body[k as keyof DesktopAgentRuntimeTurnBody] !== undefined));

    // Every field the client sent must be preserved by the handler.
    for (const field of clientFieldSet) {
      expect(handlerFieldSet.has(field)).toBe(true);
    }
    // The handler must not invent fields the client did not send.
    for (const field of handlerFieldSet) {
      expect(clientFieldSet.has(field)).toBe(true);
    }
  });

  it("dialogKey is only emitted when continueDialogId is present (client guard matches handler guard)", () => {
    // Without continueDialogId, the client omits dialogKey and the handler must
    // not synthesize it.
    const body = buildDesktopAgentRuntimeTurnBody({
      agentRef: AGENT_REF,
      input: "no continue",
      dialogKey: "dialog-user-1-orphan",
    });
    expect(body).not.toHaveProperty("dialogKey");

    const parsed = parseDesktopAgentRuntimeTurnBody(body);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.body.dialogKey).toBeUndefined();
  });

  it("rejects a body missing required agentRef/input (handler enforces the contract)", () => {
    const parsed = parseDesktopAgentRuntimeTurnBody({ input: "no agentRef" });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.status).toBe(400);
  });
});