import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";

const repoRoot = join(import.meta.dir, "..", "..", "..");

function read(path: string) {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("wereadGateway tool wiring", () => {
  it("registers the tool and routes calls through the authenticated server gateway", () => {
    const toolSource = read("packages/ai/tools/wereadGatewayTool.ts");
    const indexSource = read("packages/ai/tools/index.ts");
    const routesSource = read("packages/server/coreRoutes.ts");

    expect(toolSource).toContain('name: "wereadGateway"');
    expect(toolSource).toContain('"/api/weread/gateway"');
    expect(toolSource).toContain("withAuth: true");
    expect(toolSource).toContain("WEREAD_GATEWAY_URL");
    expect(indexSource).toContain('id: "wereadGateway"');
    expect(indexSource).toContain("wereadGatewayFunctionSchema");
    expect(indexSource).toContain("wereadGatewayFunc");
    expect(routesSource).toContain('"/api/weread/gateway"');
    expect(routesSource).toContain("handleWereadGateway");
  });

  it("keeps the WeRead API key server-side and returns actionable setup errors", () => {
    const toolSource = read("packages/ai/tools/wereadGatewayTool.ts");
    const handlerSource = read("packages/server/handlers/wereadGatewayHandler.ts");

    expect(toolSource).toContain("https://i.weread.qq.com/api/agent/gateway");
    expect(toolSource).toContain("Authorization: `Bearer ${apiKey}`");
    expect(toolSource).toContain("buildWereadGatewayRequestBody");
    expect(handlerSource).toContain('getUserSecret(auth.userId, "WEREAD_API_KEY")');
    expect(handlerSource).toContain("runWereadGatewayRequest(body, { apiKey })");
    expect(handlerSource).toContain("/setting/secrets?key=WEREAD_API_KEY&source=weread");
    expect(handlerSource).not.toContain("/settings/secrets?key=WEREAD_API_KEY&source=weread");
    expect(handlerSource).toContain("MISSING_WEREAD_API_KEY");
    expect(handlerSource).not.toContain("console.log(apiKey");
    expect(handlerSource).not.toContain("details: { apiKey");
  });
});
