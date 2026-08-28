import { afterEach, describe, expect, it, mock } from "bun:test";
import { ToolApiError } from "./toolApiClient";

const callToolApiMock = mock(async (..._args: any[]): Promise<any> => ({
  success: true,
}));
const originalFetch = globalThis.fetch;

mock.module("./toolApiClient", () => ({
  callToolApi: callToolApiMock,
  getRequestConfig: () => ({
    headers: {},
    currentServer: "http://localhost",
    token: "test-token",
  }),
}));

mock.module("app/actions/syncAppRecord", () => ({
  syncAppRecord: () => async () => {},
}));

mock.module("app/hooks/deleteDbKey", () => ({
  deleteDbKey: () => async () => true,
}));

mock.module("./toolRunStore", () => ({
  toolRunStarted: (payload: any) => payload,
  toolRunSetPending: (payload: any) => payload,
  toolRunSucceeded: (payload: any) => payload,
  toolRunUpdated: (payload: any) => payload,
  toolRunFailed: (payload: any) => payload,
  createToolRunId: () => "tool-run-test",
  getAllToolRuns: () => [],
}));

const {
  decideAppDeploySpaceId,
  resolveAppDeploySpaceId,
  appPreflightFunc,
  appDeployFunc,
} = await import("./appTools");

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("appDeploy space binding", () => {
  it("uses current space for new apps when caller does not pass spaceId", () => {
    expect(
      decideAppDeploySpaceId({
        currentSpaceId: "space-current",
      })
    ).toBe("space-current");
  });

  it("does not request a move when the existing app already has a space", () => {
    expect(
      decideAppDeploySpaceId({
        explicitSpaceId: "space-other",
        currentSpaceId: "space-current",
        existingAppSpaceId: "space-bound",
      })
    ).toBeUndefined();
  });

  it("binds legacy apps without spaceId to the current space on redeploy", async () => {
    callToolApiMock.mockClear();
    callToolApiMock.mockResolvedValueOnce({
      success: true,
      spaceId: null,
    });

    const resolved = await resolveAppDeploySpaceId(
      { appId: "app-legacy" },
      {
        getState: () => ({
          space: {
            currentSpaceId: "space-current",
          },
        }),
      } as any
    );

    expect(callToolApiMock).toHaveBeenCalledWith(
      expect.anything(),
      "/api/app/get",
      { appId: "app-legacy" },
      { withAuth: true }
    );
    expect(resolved).toBe("space-current");
  });

  it("returns repair plan in appPreflight rawData when preflight fails", async () => {
    callToolApiMock.mockClear();
    callToolApiMock.mockResolvedValueOnce({
      success: true,
      ok: false,
      framework: "react-spa",
      summary: "发现 2 个预检问题",
      issues: [
        {
          code: "invalid-icon-import",
          message: "LuCode2 不存在",
          file: "App.tsx",
          suggestion: "LuCode",
        },
        {
          code: "missing-entry-file",
          message: "缺少 React 入口文件",
        },
      ],
      warnings: [],
      externalImports: ["react-icons/lu"],
    });

    const result = await appPreflightFunc(
      {
        name: "demo-app",
        framework: "react-spa",
        files: [{ name: "App.tsx", code: "export default function App(){ return null; }" }],
      },
      {
        getState: () => ({
          space: {
            currentSpaceId: "space-current",
          },
        }),
      } as any
    );

    expect(result.rawData?.error).toBe(true);
    expect(result.rawData?.repairPlan?.strategy).toBe("targeted-repair");
    expect(result.rawData?.repairPlan?.issueCodes).toEqual(
      expect.arrayContaining(["invalid-icon-import", "missing-entry-file"])
    );
    expect(result.displayData).toContain("修复建议");
  });

  it("throws repairable structured payload when appDeploy preflight fails", async () => {
    callToolApiMock.mockClear();
    callToolApiMock.mockResolvedValueOnce({
      success: true,
      ok: false,
      framework: "react-spa",
      summary: "预检失败",
      issues: [
        {
          code: "css-import-disallowed",
          message: "暂不支持 CSS 文件导入",
          file: "App.tsx",
          importSpecifier: "./styles.css",
        },
      ],
      warnings: [],
    });

    await expect(
      appDeployFunc(
        {
          name: "demo-app",
          framework: "react-spa",
          files: [
            { name: "main.tsx", code: "console.log('main')" },
            { name: "App.tsx", code: "import './styles.css'" },
          ],
        },
        {
          dispatch: () => {},
          getState: () => ({
            space: {
              currentSpaceId: "space-current",
            },
          }),
        } as any,
        { toolRunId: "toolrun-1", parentMessageId: "msg-1" }
      )
    ).rejects.toMatchObject({
      code: "PREFLIGHT_FAILED",
      rawData: {
        error: true,
        repairPlan: {
          strategy: "targeted-repair",
        },
      },
    });
  });

  it("stops auto-repair when deploy transport returns html/non-json response", async () => {
    callToolApiMock.mockClear();
    callToolApiMock.mockRejectedValueOnce(
      new ToolApiError("服务端返回了无法解析的非 JSON 响应", {
        code: "HTML_RESPONSE",
        details: {
          responsePreview: "<!DOCTYPE html><html>502 Bad Gateway</html>",
        },
      })
    );

    await expect(
      appDeployFunc(
        {
          name: "demo-app",
          framework: "react-spa",
          files: [
            { name: "main.tsx", code: "console.log('main')" },
            { name: "App.tsx", code: "export default function App(){ return null; }" },
          ],
        },
        {
          dispatch: () => {},
          getState: () => ({
            space: {
              currentSpaceId: "space-current",
            },
          }),
        } as any,
        { toolRunId: "toolrun-1", parentMessageId: "msg-1" }
      )
    ).rejects.toMatchObject({
      code: "PREFLIGHT_TRANSPORT_FAILURE",
      rawData: {
        retryable: false,
        stopReason: "html-response",
      },
    });
  });

  it("allows appId-only redeploy so App Builder can publish workspace file edits", async () => {
    callToolApiMock.mockClear();
    callToolApiMock
      .mockResolvedValueOnce({
        success: true,
        spaceId: "space-current",
      })
      .mockResolvedValueOnce({
        success: true,
        ok: true,
        framework: "nolo-react",
        renderMode: "ssr",
        summary: "预检通过",
        issues: [],
        warnings: [],
      })
      .mockResolvedValueOnce({
        success: true,
        jobId: "job-workspace-redeploy",
        status: "running",
        summary: "部署开始",
        steps: [{ id: "build", label: "打包应用", status: "running" }],
      })
      .mockResolvedValueOnce({
        success: true,
        jobId: "job-workspace-redeploy",
        status: "succeeded",
        summary: "部署完成",
        result: {
          success: true,
          appId: "app-ssr",
          userFriendlyName: "Nolotus",
          url: "https://nolo.chat/apps/app-ssr/",
          customUrl: "https://nolotus.com",
          framework: "nolo-react",
          renderMode: "ssr",
        },
        steps: [{ id: "verify", label: "验证访问", status: "succeeded" }],
      });

    const result = await appDeployFunc(
      {
        appId: "app-ssr",
        framework: "nolo-react",
      },
      {
        dispatch: () => {},
        getState: () => ({
          space: {
            currentSpaceId: "space-current",
          },
        }),
      } as any,
      { toolRunId: "toolrun-1", parentMessageId: "msg-1" }
    );

    expect(callToolApiMock.mock.calls.map((call) => call[1])).toEqual([
      "/api/app/get",
      "/api/app/preflight",
      "/api/app/deploy",
      "/api/app/deploy/status",
    ]);
    expect(callToolApiMock.mock.calls[2]?.[2]).toEqual({
      name: undefined,
      code: undefined,
      files: undefined,
      appId: "app-ssr",
      framework: "nolo-react",
    });
    expect(result.rawData.appId).toBe("app-ssr");
    expect(result.rawData.appUrl).toBe("https://nolotus.com");
  });

  it("stops auto-repair when deploy status polling returns html/non-json response", async () => {
    callToolApiMock.mockClear();
    callToolApiMock
      .mockResolvedValueOnce({
        success: true,
        ok: true,
        framework: "react-spa",
        summary: "预检通过",
        issues: [],
        warnings: [],
      })
      .mockResolvedValueOnce({
        success: true,
        jobId: "job-1",
        status: "running",
        summary: "部署开始",
        steps: [{ id: "build", label: "打包应用", status: "running" }],
      })
      .mockResolvedValueOnce({
        success: true,
        jobId: "job-1",
        status: "failed",
        summary: "Unexpected token '<'",
        steps: [{ id: "deploy", label: "发布站点", status: "failed" }],
        error: {
          code: "HTML_ERROR_RESPONSE",
          message: "Unexpected token '<'",
          details: {
            responsePreview: "<!DOCTYPE html><html>502 Bad Gateway</html>",
          },
        },
      });

    await expect(
      appDeployFunc(
        {
          name: "demo-app",
          framework: "react-spa",
          files: [
            { name: "main.tsx", code: "console.log('main')" },
            { name: "App.tsx", code: "export default function App(){ return null; }" },
          ],
        },
        {
          dispatch: () => {},
          getState: () => ({
            space: {
              currentSpaceId: "space-current",
            },
          }),
        } as any,
        { toolRunId: "toolrun-1", parentMessageId: "msg-1" }
      )
    ).rejects.toMatchObject({
      code: "DEPLOY_TRANSPORT_FAILURE",
      rawData: {
        retryable: false,
        stopReason: "html-response",
      },
    });
  });

  it("keeps structured stoploss payload when deploy SSE stream returns html/non-json response", async () => {
    callToolApiMock.mockClear();
    callToolApiMock
      .mockResolvedValueOnce({
        success: true,
        ok: true,
        framework: "react-spa",
        summary: "预检通过",
        issues: [],
        warnings: [],
      })
      .mockResolvedValueOnce({
        success: true,
        jobId: "job-sse",
        eventChannel: "channel-sse",
        status: "running",
        summary: "部署开始",
        steps: [{ id: "build", label: "打包应用", status: "running" }],
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  jobId: "job-sse",
                  status: "pending",
                  summary: "等待事件流更新",
                  steps: [{ id: "deploy", label: "发布站点", status: "running" }],
                }),
              20
            )
          )
      );

    const encoder = new TextEncoder();
    globalThis.fetch = mock(async () => ({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "app-deploy-progress",
                jobId: "job-sse",
                status: "failed",
                summary: "Unexpected token '<'",
                error: {
                  code: "HTML_RESPONSE",
                  message: "Unexpected token '<'",
                  details: {
                    responsePreview: "<!DOCTYPE html><html>502 Bad Gateway</html>",
                  },
                },
                steps: [{ id: "deploy", label: "发布站点", status: "failed" }],
              })}\n\n`
            )
          );
          controller.close();
        },
      }),
    })) as any;

    await expect(
      appDeployFunc(
        {
          name: "demo-app",
          framework: "react-spa",
          files: [
            { name: "main.tsx", code: "console.log('main')" },
            { name: "App.tsx", code: "export default function App(){ return null; }" },
          ],
        },
        {
          dispatch: () => {},
          getState: () => ({
            space: {
              currentSpaceId: "space-current",
            },
          }),
        } as any,
        { toolRunId: "toolrun-1", parentMessageId: "msg-1" }
      )
    ).rejects.toMatchObject({
      code: "DEPLOY_TRANSPORT_FAILURE",
      rawData: {
        retryable: false,
        stopReason: "html-response",
      },
    });
  });

  it("blocks small visual edits that drift into broad rewrites before deploy", async () => {
    callToolApiMock.mockClear();
    callToolApiMock.mockResolvedValueOnce({
      success: true,
      spaceId: null,
    });
    callToolApiMock.mockResolvedValueOnce({
      success: true,
      appId: "app-legacy",
      files: [
        {
          name: "App.tsx",
          code: "export default function App(){return <main><h1>Title</h1><button style={{fontSize:'14px'}}>go</button></main>;}",
        },
      ],
    });

    await expect(
      appDeployFunc(
        {
          appId: "app-legacy",
          framework: "react-spa",
          files: [
            {
              name: "App.tsx",
              code: "import { useEffect, useState } from 'react'; export default function App(){const [open,setOpen]=useState(false);useEffect(()=>{fetch('/api/data')},[]);return <section><header><h1>Title</h1></header><div><button onClick={()=>setOpen(!open)} style={{fontSize:'18px'}}>go</button><aside>{open?'open':'closed'}</aside></div></section>;}",
            },
            {
              name: "Dashboard.tsx",
              code: "export default function Dashboard(){ return <div>new</div>; }",
            },
          ],
        },
        {
          dispatch: () => {},
          getState: () => ({
            space: { currentSpaceId: "space-current" },
            message: { dialogStateById: {} },
          }),
        } as any,
        {
          toolRunId: "toolrun-1",
          parentMessageId: "msg-1",
          userInput: "把按钮字体大一点，不要改别的",
        }
      )
    ).rejects.toMatchObject({
      code: "SMALL_VISUAL_SCOPE_EXCEEDED",
      rawData: {
        requestType: "small-visual-edit",
        retryable: true,
      },
    });

    expect(callToolApiMock.mock.calls.map((call) => call[1])).toEqual([
      "/api/app/get",
      "/api/app/prepare-edit",
    ]);
  });
});
