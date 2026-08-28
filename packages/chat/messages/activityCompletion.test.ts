import { describe, expect, it } from "bun:test";

import { inferAssistantActivityCompletionMetadata } from "./activityCompletion";

const plan = {
  phases: [
    { id: "inspect", title: "查找 World Bank DataBank API 文档与接口" },
    { id: "fetch", title: "调用 API 获取互联网用户数据" },
    { id: "analyze", title: "分析数据，找出增长最快的国家" },
    { id: "report", title: "生成可视化图表并向用户汇报结果" },
  ],
};

describe("inferAssistantActivityCompletionMetadata", () => {
  it("marks the final report phase complete when prior planned phases succeeded", () => {
    const metadata = inferAssistantActivityCompletionMetadata({
      finalContent: "结论：以下是增长最快国家的表格和可视化图表。",
      messages: [
        {
          id: "tool-inspect",
          role: "tool",
          metadata: {
            activity: {
              plan,
              phase: { id: "inspect", title: "查找 World Bank DataBank API 文档与接口" },
              action: { title: "查找 API 文档入口" },
            },
          },
        },
        {
          id: "tool-fetch",
          role: "tool",
          metadata: {
            activity: {
              phase: { id: "fetch", title: "调用 API 获取互联网用户数据" },
              action: { title: "执行数据获取脚本" },
            },
          },
        },
        {
          id: "tool-analyze",
          role: "tool",
          metadata: {
            activity: {
              phase: { id: "analyze", title: "分析数据，找出增长最快的国家" },
              action: { title: "计算增长率" },
            },
          },
        },
      ] as any[],
    });

    expect(metadata).toEqual({
      activity: {
        phase: {
          id: "report",
          title: "生成可视化图表并向用户汇报结果",
          index: 4,
          total: 4,
          status: "success",
        },
      },
    });
  });

  it("does not infer completion when an earlier planned phase is still pending", () => {
    const metadata = inferAssistantActivityCompletionMetadata({
      finalContent: "我先给出当前结论。",
      messages: [
        {
          id: "tool-inspect",
          role: "tool",
          metadata: {
            activity: {
              plan,
              phase: { id: "inspect", title: "查找 World Bank DataBank API 文档与接口" },
              action: { title: "查找 API 文档入口" },
            },
          },
        },
      ] as any[],
    });

    expect(metadata).toBeUndefined();
  });

  it("does not infer completion for a non-report final phase", () => {
    const metadata = inferAssistantActivityCompletionMetadata({
      finalContent: "下一步我会继续处理。",
      messages: [
        {
          id: "tool-setup",
          role: "tool",
          metadata: {
            activity: {
              plan: {
                phases: [
                  { id: "setup", title: "准备环境" },
                  { id: "fetch", title: "获取更多数据" },
                ],
              },
              phase: { id: "setup", title: "准备环境" },
              action: { title: "安装依赖" },
            },
          },
        },
      ] as any[],
    });

    expect(metadata).toBeUndefined();
  });

  it("does not infer completion from failed final content", () => {
    const metadata = inferAssistantActivityCompletionMetadata({
      finalContent: "抱歉，无法生成可视化图表。",
      messages: [
        {
          id: "tool-inspect",
          role: "tool",
          metadata: {
            activity: {
              plan: {
                phases: [
                  { id: "inspect", title: "查找数据源" },
                  { id: "report", title: "生成可视化图表并向用户汇报结果" },
                ],
              },
              phase: { id: "inspect", title: "查找数据源" },
              action: { title: "查找 API 文档入口" },
            },
          },
        },
      ] as any[],
    });

    expect(metadata).toBeUndefined();
  });
});
