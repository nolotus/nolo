import { describe, expect, test } from "bun:test";

import {
  buildAgentRuntimeAgentLookupKeys,
  shouldFetchAgentRuntimeRecordRemotely,
} from "./agentRecordKeys";

describe("agent runtime record keys", () => {
  test("builds user-scoped + public lookup keys for aliases", () => {
    expect(buildAgentRuntimeAgentLookupKeys({
      agentRef: "frontend",
      userId: "user-1",
    })).toEqual([
      "agent-user-1-frontend",
      "agent-pub-frontend",
    ]);
  });

  test("keeps concrete agent keys direct", () => {
    expect(buildAgentRuntimeAgentLookupKeys({
      agentRef: "agent-user-1-frontend",
      userId: "user-1",
    })).toEqual(["agent-user-1-frontend"]);
  });

  test("allows remote reads only for concrete agent records", () => {
    expect(shouldFetchAgentRuntimeRecordRemotely("frontend")).toBe(false);
    expect(shouldFetchAgentRuntimeRecordRemotely("dialog-user-1-dialog-1")).toBe(false);
    expect(shouldFetchAgentRuntimeRecordRemotely("agent-user-1-frontend")).toBe(true);
    expect(shouldFetchAgentRuntimeRecordRemotely("agent-pub-frontend")).toBe(true);
  });
});
