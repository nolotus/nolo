// packages/cli/client/clientVersionTooOldFailure.test.ts
//
// CLIENT_VERSION_TOO_OLD 三层贯通的第 3 层（CLI 渲染）+ 第 2→3 层透传行为。
//
// 三层钉死：
//   L1 Error.detail（server: ClientVersionTooOldError / 本地: providerResolution
//      self-check 抛错）→
//   L2 SSE error 帧带 code + detail（loop.test.ts 的同主题用例钉死）→
//   L3 CLI 渲染可操作升级文案（本文件：共享渲染器 + readStreamingAgentRun
//      端到端吃帧 + agentRun.ts describeLocalRunFailure 委托 source contract）。

import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  attachStreamFrameErrorFields,
  describeClientVersionTooOldFailure,
  isClientVersionTooOldFailure,
} from "./clientVersionTooOldFailure";

const structuredGateError = () => {
  const error = new Error(
    "模型「kimi-k3」需要 nolo-cli ≥ 0.38.0-alpha.4（当前 0.38.0-alpha.3）。" +
      "请升级客户端（npx nolo-cli@latest，或桌面端应用内更新）后重试；也可以先换用其他模型。",
  ) as Error & { code?: string; detail?: Record<string, unknown> };
  error.code = "CLIENT_VERSION_TOO_OLD";
  error.detail = {
    reason: "CLIENT_VERSION_TOO_OLD",
    model: "kimi-k3",
    minClientVersion: "0.38.0-alpha.4",
    clientVersion: "0.38.0-alpha.3",
    upgradeCommand: "npx nolo-cli@latest",
    retryable: false,
  };
  return error;
};

describe("CLIENT_VERSION_TOO_OLD CLI rendering (three-layer detail, layer 3)", () => {
  it("detects the failure via code / detail.reason / message", () => {
    const error = structuredGateError();
    expect(isClientVersionTooOldFailure(error.message, error)).toBe(true);
    // server run：SSE error 帧只有 code（detail 也挂上了，双保险都能认）
    expect(
      isClientVersionTooOldFailure("some message", {
        code: "CLIENT_VERSION_TOO_OLD",
      }),
    ).toBe(true);
    // 兼容 detail.code / detail.reason 两种键名
    expect(
      isClientVersionTooOldFailure("plain failure", {
        detail: { code: "CLIENT_VERSION_TOO_OLD" },
      }),
    ).toBe(true);
    // message 兜底（老版本本地 self-check 只有一句话也认得出）
    expect(
      isClientVersionTooOldFailure("LLM API error (CLIENT_VERSION_TOO_OLD)"),
    ).toBe(true);
    // 非闸门失败：无 code、无 detail、message 不含 code → 不劫持
    const plainError = new Error("LLM API error (502): bad gateway");
    expect(isClientVersionTooOldFailure(plainError.message, plainError)).toBe(false);
    expect(isClientVersionTooOldFailure("server busy", { code: "PLATFORM_LLM_BUSY", detail: { reason: "busy" } })).toBe(false);
  });

  it("renders actionable upgrade text from structured detail", () => {
    const error = structuredGateError();
    const text = describeClientVersionTooOldFailure(error.message, error);
    expect(text).toContain("CLIENT_VERSION_TOO_OLD");
    expect(text).toContain("kimi-k3");
    expect(text).toContain("nolo-cli ≥ 0.38.0-alpha.4");
    expect(text).toContain("当前 0.38.0-alpha.3");
    expect(text).toContain("npx nolo-cli@latest");
    expect(text).toContain("未产生费用");
  });

  it("falls back to the raw message when detail is missing (message itself carries upgrade guidance)", () => {
    const text = describeClientVersionTooOldFailure(
      "模型「kimi-k3」需要 nolo-cli ≥ 0.38.0-alpha.4。请升级客户端后重试。",
    );
    expect(text).toContain("模型「kimi-k3」需要 nolo-cli ≥ 0.38.0-alpha.4");
    expect(text).toContain("请升级客户端后重试");
  });

  it("server-run layers 2→3: SSE error frame code+detail -> Error -> renderable upgrade text", () => {
    const error = structuredGateError();
    // 模拟 agentRunStream.handlePayload 收到的 server error 帧
    const frame = {
      type: "error",
      code: error.code,
      message: error.message,
      detail: error.detail,
    };
    const streamError = attachStreamFrameErrorFields(
      new Error(String(frame.message)),
      frame,
    );
    expect(streamError.code).toBe("CLIENT_VERSION_TOO_OLD");
    expect(streamError.detail).toMatchObject({
      reason: "CLIENT_VERSION_TOO_OLD",
      model: "kimi-k3",
    });

    // 渲染分支用同一判定与同一渲染器（readStreamingAgentRun 的接线由下方
    // source contract 钉住；agentRunStream 自身的依赖链含 tui/theme，测试
    // 环境裸跑会挂，故用纯函数 + contract 组合钉死行为）。
    expect(isClientVersionTooOldFailure(streamError.message, streamError)).toBe(true);
    const text = describeClientVersionTooOldFailure(streamError.message, streamError);
    expect(text).toContain("CLIENT_VERSION_TOO_OLD");
    expect(text).toContain("kimi-k3");
    expect(text).toContain("nolo-cli ≥ 0.38.0-alpha.4");
    expect(text).toContain("npx nolo-cli@latest");
  });

  it("wires the shared renderer into describeLocalRunFailure and the server-run stream catch", () => {
    const agentRunSource = readFileSync(join(import.meta.dir, "agentRun.ts"), "utf-8");
    expect(agentRunSource).toContain("isClientVersionTooOldFailure(message, rawError)");
    expect(agentRunSource).toContain(
      "return describeClientVersionTooOldFailure(message, rawError);",
    );
    const streamSource = readFileSync(
      join(import.meta.dir, "agentRunStream.ts"),
      "utf-8",
    );
    expect(streamSource).toContain("isClientVersionTooOldFailure(message, error)");
    expect(streamSource).toContain("describeClientVersionTooOldFailure(message, error)");
    // 透传点：handlePayload 抛错前把帧上的 code/detail 挂到 Error（共享纯函数）
    expect(streamSource).toContain("attachStreamFrameErrorFields(");
  });
});
