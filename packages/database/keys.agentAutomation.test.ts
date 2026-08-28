import { describe, expect, it } from "bun:test";
import { DataType } from "create/types";
import {
  AGENT_AUTOMATION_OWNER_INDEX_PREFIX,
  buildAgentAutomationOwnerIndexDeleteOps,
  buildAgentAutomationOwnerIndexValue,
  createAgentAutomationKey,
  createAgentAutomationOwnerIndexKey,
  isAgentAutomationKey,
  isAgentAutomationOwnerIndexKey,
} from "./keys";

describe("agent automation keys", () => {
  it("creates and recognizes agent-automation user-scoped keys", () => {
    expect(String(DataType.AGENT_AUTOMATION)).toBe("agent-automation");

    const key = createAgentAutomationKey("user-a");
    expect(key).toStartWith("agent-automation-user-a-");
    expect(isAgentAutomationKey(key)).toBe(true);
    expect(isAgentAutomationKey("agent-user-a-01AGENT")).toBe(false);
    expect(key.slice("agent-automation-user-a-".length)).not.toContain("user-a-");

    const range = createAgentAutomationKey.rangeOfUser("user-a");
    expect(range).toEqual({
      start: "agent-automation-user-a-",
      end: "agent-automation-user-a-\uffff",
    });
  });

  it("builds ownerAgentKey secondary index keys and ranges", () => {
    const ownerAgentKey = "agent-user-a-pm";
    const automationId = "01MATCH";
    const indexKey = createAgentAutomationOwnerIndexKey(
      "user-a",
      ownerAgentKey,
      automationId,
    );
    expect(indexKey).toBe(
      `${AGENT_AUTOMATION_OWNER_INDEX_PREFIX}-user-a-${ownerAgentKey}-${automationId}`,
    );
    expect(isAgentAutomationOwnerIndexKey(indexKey)).toBe(true);
    expect(isAgentAutomationOwnerIndexKey("agent-automation-user-a-01X")).toBe(
      false,
    );

    const range = createAgentAutomationOwnerIndexKey.rangeOfAgent(
      "user-a",
      ownerAgentKey,
    );
    expect(range.start).toBe(
      `${AGENT_AUTOMATION_OWNER_INDEX_PREFIX}-user-a-${ownerAgentKey}-`,
    );
    expect(range.end).toBe(`${range.start}\uffff`);
    expect(indexKey >= range.start && indexKey <= range.end).toBe(true);

    // Other agents stay outside the range.
    const other = createAgentAutomationOwnerIndexKey(
      "user-a",
      "agent-user-a-reviewer",
      automationId,
    );
    expect(other >= range.start && other <= range.end).toBe(false);

    // Other users stay outside the range.
    const otherUser = createAgentAutomationOwnerIndexKey(
      "user-b",
      ownerAgentKey,
      automationId,
    );
    expect(otherUser >= range.start && otherUser <= range.end).toBe(false);

    const value = buildAgentAutomationOwnerIndexValue({
      userId: "user-a",
      ownerAgentKey,
      automationId,
      automationKey: "agent-automation-user-a-01MATCH",
    });
    expect(value).toEqual({
      automationKey: "agent-automation-user-a-01MATCH",
      automationId,
      userId: "user-a",
      ownerAgentKey,
    });
  });

  it("buildAgentAutomationOwnerIndexDeleteOps drops the owner index key", () => {
    const automationKey = "agent-automation-user-a-01MATCH";
    const dels = buildAgentAutomationOwnerIndexDeleteOps({
      userId: "user-a",
      automationKey,
      record: {
        id: "01MATCH",
        ownerAgentKey: "agent-user-a-pm",
        createdBy: "user-a",
      },
    });
    expect(dels).toEqual([
      {
        type: "del",
        key: createAgentAutomationOwnerIndexKey(
          "user-a",
          "agent-user-a-pm",
          "01MATCH",
        ),
      },
    ]);
  });
});
