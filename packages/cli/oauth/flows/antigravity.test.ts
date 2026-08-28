// packages/cli/oauth/flows/antigravity.test.ts
//
// Antigravity OAuth flow regression tests:
// 1. `discoverProject` must hit the Antigravity subscription host
//    (`daily-cloudcode-pa`) and send the Antigravity client User-Agent —
//    the generic `cloudcode-pa` host 429s paid users and Google rejects
//    requests without the UA (both fixed against oh-my-pi parity).
import { describe, expect, test } from "bun:test";

import { discoverProject, fetchAntigravityAvailableModels } from "./antigravity";
import { getAntigravityUserAgent } from "../../../agent-runtime/antigravityOAuth";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Antigravity OAuth model discovery", () => {
  test("discovers the tiered Gemini 3.7 Flash wire model", async () => {
    let capturedBody: string | undefined;
    const models = await fetchAntigravityAvailableModels(
      (async (url: string | URL | Request, init?: RequestInit) => {
        expect(String(url)).toContain("/v1internal:fetchAvailableModels");
        capturedBody = String(init?.body);
        return jsonResponse({ models: {
          "gemini-3.7-flash-tiered": {
            displayName: "Gemini 3.7 Flash (Medium)",
            supportsThinking: true,
            maxOutputTokens: 65536,
            model: "MODEL_PLACEHOLDER_M301",
          },
        } });
      }) as unknown as typeof fetch,
      "access-token-models",
    );
    expect(capturedBody).toBe("{}");
    expect(models["gemini-3.7-flash-tiered"]?.model).toBe("MODEL_PLACEHOLDER_M301");
  });
});

describe("Antigravity OAuth discoverProject", () => {
  test("loadCodeAssist hits daily-cloudcode-pa with the Antigravity User-Agent", async () => {
    let capturedUrl: string | undefined;
    let capturedHeaders: Record<string, string> | undefined;

    const projectId = await discoverProject(
      (async (url: string | URL | Request, init?: RequestInit) => {
        capturedUrl = String(url);
        capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
        return jsonResponse({
          cloudaicompanionProject: { id: "projects/antigravity-proj-1" },
        });
      }) as unknown as typeof fetch,
      "access-token-1",
    );

    expect(capturedUrl).toBe(
      "https://daily-cloudcode-pa.googleapis.com/v1internal:loadCodeAssist"
    );
    expect(capturedHeaders?.["User-Agent"]).toBe(getAntigravityUserAgent());
    expect(capturedHeaders?.["Authorization"]).toBe("Bearer access-token-1");
    expect(projectId).toBe("projects/antigravity-proj-1");
  });

  test("onboardUser retries also carry the Antigravity User-Agent and use the daily host", async () => {
    let loadCount = 0;
    let onboardCount = 0;
    let onboardHeaders: Record<string, string> | undefined;
    let onboardUrl: string | undefined;

    const projectId = await discoverProject(
      (async (url: string | URL | Request, init?: RequestInit) => {
        const href = String(url);
        if (href.includes("/v1internal:loadCodeAssist")) {
          loadCount += 1;
          // No existing project, but a provisionable tier is allowed.
          return jsonResponse({
            cloudaicompanionProject: undefined,
            allowedTiers: [{ id: "pro-tier", isDefault: true }],
          });
        }
        if (href.includes("/v1internal:onboardUser")) {
          onboardCount += 1;
          onboardUrl = href;
          onboardHeaders = (init?.headers ?? {}) as Record<string, string>;
          return jsonResponse({
            done: true,
            response: { cloudaicompanionProject: { id: "projects/provisioned-1" } },
          });
        }
        return jsonResponse({}, 404);
      }) as unknown as typeof fetch,
      "access-token-2",
    );

    expect(loadCount).toBe(1);
    expect(onboardCount).toBe(1);
    expect(onboardUrl).toBe(
      "https://daily-cloudcode-pa.googleapis.com/v1internal:onboardUser"
    );
    expect(onboardHeaders?.["User-Agent"]).toBe(getAntigravityUserAgent());
    expect(onboardHeaders?.["Authorization"]).toBe("Bearer access-token-2");
    expect(projectId).toBe("projects/provisioned-1");
  });
});
