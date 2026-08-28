import { describe, expect, it, mock } from "bun:test";

import {
  buildWereadGatewayRequestBody,
  runWereadGatewayRequest,
  WEREAD_DEFAULT_SKILL_VERSION,
} from "./wereadGatewayTool";

describe("wereadGatewayTool", () => {
  it("flattens params at the top level and injects the default skill version", () => {
    expect(
      buildWereadGatewayRequestBody({
        api_name: "/store/search",
        params: { keyword: "三体", count: 10 },
      })
    ).toEqual({
      api_name: "/store/search",
      keyword: "三体",
      count: 10,
      skill_version: WEREAD_DEFAULT_SKILL_VERSION,
    });
  });

  it("uses the user's WeRead API key without exposing it in the result", async () => {
    const fetchImpl = mock(async (_url: string, init?: RequestInit) => {
      expect(init?.headers).toEqual({
        Authorization: "Bearer wrk-secret",
        "Content-Type": "application/json",
      });
      expect(JSON.parse(String(init?.body))).toEqual({
        api_name: "/_list",
        skill_version: WEREAD_DEFAULT_SKILL_VERSION,
      });
      return new Response(JSON.stringify({ errcode: 0, apis: ["/store/search"] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const result = await runWereadGatewayRequest(
      { api_name: "/_list" },
      { apiKey: "wrk-secret", fetchImpl: fetchImpl as any }
    );

    expect(result.rawData).toEqual({ errcode: 0, apis: ["/store/search"] });
    expect(result.displayData).toContain("/_list");
    expect(result.displayData).not.toContain("wrk-secret");
  });

  it("stops when WeRead asks the skill to upgrade", async () => {
    const fetchImpl = mock(async () =>
      new Response(
        JSON.stringify({
          errcode: 0,
          upgrade_info: { message: "请升级到 1.0.4" },
        }),
        { status: 200 }
      )
    );

    await expect(
      runWereadGatewayRequest(
        { api_name: "/shelf/sync" },
        { apiKey: "wrk-secret", fetchImpl }
      )
    ).rejects.toThrow("请升级到 1.0.4");
  });

  it("turns non-zero errcode responses into clear errors", async () => {
    const fetchImpl = mock(async () =>
      new Response(JSON.stringify({ errcode: 1001, errmsg: "invalid api key" }), {
        status: 200,
      })
    );

    await expect(
      runWereadGatewayRequest(
        { api_name: "/shelf/sync" },
        { apiKey: "wrk-secret", fetchImpl }
      )
    ).rejects.toThrow("invalid api key");
  });
});
