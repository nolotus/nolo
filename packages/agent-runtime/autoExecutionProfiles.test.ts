import { describe, expect, test } from "bun:test";
import {
  DEFAULT_AUTO_EXECUTION_PROFILE,
  resolveAutoExecutionProfile,
} from "./autoExecutionProfiles";

describe("auto execution profiles", () => {
  test("uses a complete code-owned default profile", () => {
    expect(DEFAULT_AUTO_EXECUTION_PROFILE).toMatchObject({
      id: "builtin:auto:deepseek-v4-flash",
      tier: "flash",
      provider: "nolo",
      model: "deepseek-v4-flash",
      apiSource: "platform",
      useServerProxy: true,
    });
  });

  test("shares the current flash runtime for balanced and quality", () => {
    expect(resolveAutoExecutionProfile("balanced").model).toBe("deepseek-v4-flash");
    expect(resolveAutoExecutionProfile("quality").model).toBe("deepseek-v4-flash");
  });

  test("maps image tier to flash (preprocessing pipeline handles images)", () => {
    const imageProfile = resolveAutoExecutionProfile("image");
    expect(imageProfile.tier).toBe("image");
    expect(imageProfile.model).toBe("deepseek-v4-flash");
    expect(imageProfile.provider).toBe("nolo");
  });
});
