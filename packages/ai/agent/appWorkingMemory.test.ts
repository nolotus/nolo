import { describe, expect, it } from "bun:test";
import { buildRecentAppToolMemory } from "./appWorkingMemory";

describe("buildRecentAppToolMemory", () => {
  it("builds app memory from recent app tool runs without editing context", () => {
    const memory = buildRecentAppToolMemory(
      [
        {
          id: "msg-list",
          dbKey: "dialog-1-msg-list",
          role: "tool",
          toolName: "appList",
          content:
            "📋 已部署的应用 (2 个):\n- **Demo App** (appId: 01APPDEMO): https://nolo.chat/apps/01APPDEMO/\n- **Map App** (appId: 01APPMAP): https://nolo.chat/apps/01APPMAP/",
        } as any,
        {
          id: "msg-read",
          dbKey: "dialog-1-msg-read",
          role: "tool",
          toolName: "appRead",
          content:
            '📄 应用 "Map App" 当前代码：\n- appId: 01APPMAP\n- 访问地址: https://nolo.chat/apps/01APPMAP/\n',
        } as any,
        {
          id: "msg-deploy",
          dbKey: "dialog-1-msg-deploy",
          role: "tool",
          toolName: "appDeploy",
          content:
            "🚀 应用部署成功！\n- 名称: Map App\n- appId: 01APPMAP\n- 访问地址: https://nolo.chat/apps/01APPMAP/\n- 更新时间: 刚刚",
        } as any,
      ],
      [
        {
          id: "run-list",
          messageId: "msg-list",
          toolName: "appList",
          status: "succeeded",
          startedAt: 1,
        },
        {
          id: "run-read",
          messageId: "msg-read",
          toolName: "appRead",
          status: "succeeded",
          startedAt: 2,
          input: { appId: "01APPMAP" },
        },
        {
          id: "run-deploy",
          messageId: "msg-deploy",
          toolName: "appDeploy",
          status: "succeeded",
          startedAt: 3,
          input: { appId: "01APPMAP", framework: "react-spa" },
        },
      ] as any,
    );

    expect(memory).toContain("最近一次关键 app 操作: appDeploy");
    expect(memory).toContain("appId=01APPMAP");
    expect(memory).toContain("framework=react-spa");
    expect(memory).toContain("最近一次 appList 结果");
    expect(memory).toContain("**Demo App** (appId: 01APPDEMO)");
    expect(memory).toContain("最近一次 appRead 真值");
    expect(memory).toContain("最近一次 appDeploy 结果");
    expect(memory).toContain("如果用户说“刚才那个 app / 那个网站”");
  });

  it("returns null when there are no recent app tool runs", () => {
    expect(buildRecentAppToolMemory([], [])).toBeNull();
  });
});
