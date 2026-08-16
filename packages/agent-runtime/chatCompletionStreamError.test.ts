/**
 * 回归：nolo chat 代理把上游故障编码成 HTTP 200 + 一个 SSE 错误帧
 * （`data: {"error":{"msg":"服务器紧张","code":"PLATFORM_LLM_BUSY"}}`），
 * 该帧没有 `choices`，一旦被当成「无可用 delta」丢弃，读流函数就返回
 * content: ""——故障伪装成模型空回答：不重试、不 fallback、退出码 0，
 * 那条空轮次还会被当成正常回答写进对话历史。
 *
 * 这里锁定两条读流路径都必须抛出，且抛出的是上游真实原因。
 */
import { describe, expect, test } from "bun:test";
import { readOpenAiCompatibleSseCompletion } from "./openAiCompatibleProvider";
import { readPlatformChatSseCompletion } from "./platformChatProvider";
import { extractChatCompletionStreamError } from "./processChatCompletionDelta";

const encoder = new TextEncoder();

function sseResponse(...frames: string[]): Response {
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const frame of frames) controller.enqueue(encoder.encode(frame));
        controller.close();
      },
    }),
    { status: 200, headers: { "content-type": "text/event-stream" } },
  );
}

const WARMUP = ": nolo-chat-proxy-ready\n\n";
/** 代理实际发的帧带尾随空格，格式必须照抄，不能"整理"成规范形状。 */
const busyFrame = `data: ${JSON.stringify({
  error: { msg: "服务器紧张", code: "PLATFORM_LLM_BUSY" },
})} \n\n`;
const idleFrame = `data: ${JSON.stringify({
  error: { msg: "idle 60 s", code: "IDLE" },
})} \n\n`;
const textFrame = (content: string) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;

describe("extractChatCompletionStreamError", () => {
  test("认代理的 msg/code 形状", () => {
    expect(
      extractChatCompletionStreamError({
        error: { msg: "服务器紧张", code: "PLATFORM_LLM_BUSY" },
      }),
    ).toEqual({ message: "服务器紧张", code: "PLATFORM_LLM_BUSY" });
  });

  test("认 OpenAI/Ollama 的 message/type 形状", () => {
    expect(
      extractChatCompletionStreamError({
        error: { message: "model is overloaded", type: "server_error" },
      }),
    ).toEqual({ message: "model is overloaded", code: "server_error" });
  });

  test("认裸字符串 error", () => {
    expect(extractChatCompletionStreamError({ error: "boom" })).toEqual({
      message: "boom",
    });
  });

  test("正常 delta 帧不误判为错误", () => {
    expect(
      extractChatCompletionStreamError({ choices: [{ delta: { content: "hi" } }] }),
    ).toBeNull();
    expect(extractChatCompletionStreamError({ error: null })).toBeNull();
  });
});

describe("readOpenAiCompatibleSseCompletion", () => {
  test("busy 错误帧必须抛出，不能返回空内容", async () => {
    await expect(
      readOpenAiCompatibleSseCompletion({
        response: sseResponse(WARMUP, busyFrame),
        onTextDelta: () => {},
      }),
    ).rejects.toThrow("服务器紧张");
  });

  test("已流出部分内容后的 idle 截断同样抛出，不能把半截当完整答案", async () => {
    await expect(
      readOpenAiCompatibleSseCompletion({
        response: sseResponse(WARMUP, textFrame("前半段回答"), idleFrame),
        onTextDelta: () => {},
      }),
    ).rejects.toThrow("idle 60 s");
  });

  test("健康流不受影响", async () => {
    const result = await readOpenAiCompatibleSseCompletion({
      response: sseResponse(WARMUP, textFrame("你好"), "data: [DONE]\n\n"),
    });
    expect(result.content).toBe("你好");
  });
});

describe("readPlatformChatSseCompletion", () => {
  test("chat.completions 分支抛出上游原因与错误码", async () => {
    const promise = readPlatformChatSseCompletion({
      response: sseResponse(WARMUP, busyFrame),
      usesResponsesApi: false,
    });
    await expect(promise).rejects.toThrow("服务器紧张");
    await expect(promise).rejects.toThrow("PLATFORM_LLM_BUSY");
  });

  test("Responses 分支也看得见错误帧", async () => {
    await expect(
      readPlatformChatSseCompletion({
        response: sseResponse(WARMUP, busyFrame),
        usesResponsesApi: true,
      }),
    ).rejects.toThrow("服务器紧张");
  });

  test("健康流不受影响", async () => {
    const result = await readPlatformChatSseCompletion({
      response: sseResponse(WARMUP, textFrame("你好"), "data: [DONE]\n\n"),
      usesResponsesApi: false,
    });
    expect(result.content).toBe("你好");
  });
});
