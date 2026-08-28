import { describe, expect, it } from "bun:test";
import {
  createAgentAutomationFunctionSchema,
  notifyUserFunctionSchema,
  queryUserGrowthReportFunctionSchema,
  queryModelUsageFunctionSchema,
} from "./modelUsageTools";

describe("model usage agent tools", () => {
  it("exposes a permission-aware model usage query schema", () => {
    expect(queryModelUsageFunctionSchema.name).toBe("queryModelUsage");
    expect(queryModelUsageFunctionSchema.parameters.properties.scope.enum).toEqual([
      "user",
      "all",
      "space",
    ]);
    expect(queryModelUsageFunctionSchema.parameters.properties.currency).toBeTruthy();
    expect(queryModelUsageFunctionSchema.parameters.properties.thresholdCredits).toBeTruthy();
    expect(queryModelUsageFunctionSchema.parameters.properties.thresholdUsd).toBeTruthy();
  });

  it("exposes agent automation creation with an immediate dry run option", () => {
    expect(createAgentAutomationFunctionSchema.name).toBe("createAgentAutomation");
    expect(createAgentAutomationFunctionSchema.parameters.required).toContain("trigger");
    expect(createAgentAutomationFunctionSchema.parameters.required).toContain("instruction");
    expect(createAgentAutomationFunctionSchema.parameters.properties.runOnceNow).toBeTruthy();
  });

  it("exposes a no-argument growth report query schema", () => {
    expect(queryUserGrowthReportFunctionSchema.name).toBe("queryUserGrowthReport");
    expect(queryUserGrowthReportFunctionSchema.parameters).toEqual({
      type: "object",
      properties: {},
      additionalProperties: false,
    });
  });

  it("exposes station notification for the first alert channel", () => {
    expect(notifyUserFunctionSchema.name).toBe("notifyUser");
    expect(notifyUserFunctionSchema.parameters.required).toEqual(["title", "message"]);
    expect(notifyUserFunctionSchema.description).toContain("站内通知");
  });
});
