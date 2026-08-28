import { describe, expect, it, mock } from "bun:test";
import type { Agent } from "app/types";
import {
  looksLikeFullAgentRecord,
  resolveAgentDbKey,
  seedAgentPreviewInStore,
} from "./seedAgentPreview";

const baseAgent = {
  id: "agent-pub-01SEED",
  dbKey: "agent-pub-01SEED",
  name: "Seed",
  provider: "openai",
  model: "gpt-5",
  userId: "u1",
  useServerProxy: true,
  isPublic: true,
  updatedAt: "t",
  createdAt: 1,
} as Agent;

describe("seedAgentPreview", () => {
  it("resolves dbKey and detects full records by prompt", () => {
    expect(resolveAgentDbKey(baseAgent as { dbKey?: unknown; id?: unknown })).toBe("agent-pub-01SEED");
    expect(looksLikeFullAgentRecord({ prompt: "  hi  " })).toBe(true);
    expect(looksLikeFullAgentRecord({ prompt: "" })).toBe(false);
    expect(looksLikeFullAgentRecord(null)).toBe(false);
  });

  it("skips upsert when a full agent already exists", () => {
    const dispatch = mock(() => undefined);
    const getState = () =>
      ({
        db: {
          entities: {
            "agent-pub-01SEED": { dbKey: "agent-pub-01SEED", prompt: "full" },
          },
          ids: ["agent-pub-01SEED"],
        },
      }) as any;

    seedAgentPreviewInStore(dispatch as any, getState, baseAgent);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("upserts a lightweight preview when store is empty", () => {
    const dispatch = mock(() => undefined);
    const getState = () =>
      ({
        db: { entities: {}, ids: [] },
      }) as any;

    seedAgentPreviewInStore(dispatch as any, getState, baseAgent);
    expect(dispatch).toHaveBeenCalledTimes(1);
    const action = (dispatch.mock.calls[0] as any[])[0];
    expect(action.type).toBe("db/upsertSSREntity");
    expect(action.payload.dbKey).toBe("agent-pub-01SEED");
    expect(action.payload.name).toBe("Seed");
  });
});
