import { describe, expect, test } from "bun:test";

import {
  USER_PREFERENCE_NAMES,
  buildAuthorityHomePreferenceRegisterRecord,
  buildDefaultAgentPreferenceRegisterRecord,
  buildUserPreferenceRegisterRecord,
  readUserPreferenceRegisterValue,
} from "./userPreferenceRegister";

describe("userPreferenceRegister helpers", () => {
  test("buildUserPreferenceRegisterRecord creates a parseable agent-default register", () => {
    const record = buildUserPreferenceRegisterRecord({
      userId: "abc123",
      preferenceName: USER_PREFERENCE_NAMES.DEFAULT_AGENT,
      value: "agent-1",
    });

    expect(record.registerType).toBe("user_preference");
    expect(record.preferenceName).toBe("agent_default");
    expect(record.value).toBe("agent-1");
    expect(record.userId).toBe("abc123");
    expect(record.schemaVersion).toBe(1);
    expect(typeof record.opId).toBe("string");
    expect(typeof record.updatedAt).toBe("number");
  });

  test("readUserPreferenceRegisterValue returns the register-backed default agent", () => {
    const registerRecord = buildUserPreferenceRegisterRecord({
      userId: "abc123",
      preferenceName: USER_PREFERENCE_NAMES.DEFAULT_AGENT,
      value: "agent-1",
    });

    expect(
      readUserPreferenceRegisterValue<string>(
        registerRecord,
        USER_PREFERENCE_NAMES.DEFAULT_AGENT
      )
    ).toBe("agent-1");
  });

  test("buildDefaultAgentPreferenceRegisterRecord creates an agent-default register", () => {
    const record = buildDefaultAgentPreferenceRegisterRecord({
      userId: "abc123",
      defaultAgentId: "agent-1",
    });

    expect(record.preferenceName).toBe(USER_PREFERENCE_NAMES.DEFAULT_AGENT);
    expect(record.value).toBe("agent-1");
    expect(record.schemaVersion).toBe(1);
  });

  test("buildAuthorityHomePreferenceRegisterRecord creates an authority-home register", () => {
    const record = buildAuthorityHomePreferenceRegisterRecord({
      userId: "abc123",
      authorityServer: "https://self.example.com/",
    });

    expect(record.preferenceName).toBe(USER_PREFERENCE_NAMES.AUTHORITY_HOME);
    expect(record.value).toBe("https://self.example.com");
    expect(record.userId).toBe("abc123");
    expect(record.schemaVersion).toBe(1);
  });
});
