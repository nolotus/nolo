import { describe, expect, it } from "bun:test";
import {
  buildUnderstandingDialogText,
  extractUnderstandingMemoryCandidates,
  parseUnderstandingResponse,
} from "./understandingLlm";

describe("parseUnderstandingResponse", () => {
  it("keeps valid facets and attaches the tags the greeting layer filters on", () => {
    const candidates = parseUnderstandingResponse(
      JSON.stringify([
        { facet: "preference", content: "更在意信任感，不想一上来就很促销" },
        { facet: "style", content: "更喜欢先看结论再看推理过程" },
      ])
    );

    expect(candidates).toHaveLength(2);
    expect(candidates[0].facet).toBe("preference");
    // understandingGreeting.ts 按这个 tag 挑开场白锚点——换掉抽取方式不能改契约。
    expect(candidates[0].tags).toContain("understanding-memory");
    expect(candidates[0].tags).toContain("memory-facet:preference");
    expect(candidates[0].patternKey).toStartWith("understanding:preference:");
    // tension/unfinished 之外的 facet 用较低置信度
    expect(candidates[1].confidence).toBe(0.72);
  });

  it("scores unfinished and tension above preference and style", () => {
    const [unfinished] = parseUnderstandingResponse(
      JSON.stringify([{ facet: "unfinished", content: "还没决定要不要上 marketing 分组" }])
    );
    const [style] = parseUnderstandingResponse(
      JSON.stringify([{ facet: "style", content: "更喜欢先看结论再看推理过程" }])
    );
    expect(unfinished.importance).toBeGreaterThan(style.importance);
    expect(unfinished.confidence).toBeGreaterThan(style.confidence);
  });

  it("drops unknown facets, empty content, and over-long extractions", () => {
    const candidates = parseUnderstandingResponse(
      JSON.stringify([
        { facet: "vibes", content: "这个用户很酷" },
        { facet: "preference", content: "" },
        { facet: "preference", content: "短" },
        { facet: "goal", content: "长".repeat(201) },
        { facet: "goal", content: "想先把第一封欢迎邮件的体验做稳" },
      ])
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0].facet).toBe("goal");
  });

  it("dedupes identical facet+content pairs", () => {
    const candidates = parseUnderstandingResponse(
      JSON.stringify([
        { facet: "style", content: "更喜欢先看结论再看推理过程" },
        { facet: "style", content: "更喜欢先看结论再看推理过程" },
      ])
    );
    expect(candidates).toHaveLength(1);
  });

  it("recovers a JSON array embedded in chatty model output", () => {
    const candidates = parseUnderstandingResponse(
      '好的，提取结果如下：\n[{"facet":"goal","content":"想先把第一封欢迎邮件的体验做稳"}]\n希望有帮助。'
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0].facet).toBe("goal");
  });

  it("returns empty for malformed or non-array output instead of throwing", () => {
    expect(parseUnderstandingResponse("")).toEqual([]);
    expect(parseUnderstandingResponse("[]")).toEqual([]);
    expect(parseUnderstandingResponse("不好意思，我无法完成")).toEqual([]);
    expect(parseUnderstandingResponse('{"facet":"goal"}')).toEqual([]);
    expect(parseUnderstandingResponse("[{broken")).toEqual([]);
  });
});

describe("buildUnderstandingDialogText", () => {
  it("puts the current user input first and labels roles", () => {
    const text = buildUnderstandingDialogText({
      userInput: "我更在意信任感。",
      trace: [
        { role: "assistant", content: "明白，你不想一上来就很促销。" },
        { role: "tool", content: "should be dropped" },
      ],
    });
    expect(text).toBe("U: 我更在意信任感。\nA: 明白，你不想一上来就很促销。");
  });

  it("flattens structured content parts", () => {
    const text = buildUnderstandingDialogText({
      userInput: "看看这个",
      trace: [
        {
          role: "assistant",
          content: [
            { type: "text", text: "第一段" },
            { type: "image_url", image_url: { url: "x" } },
            { type: "text", text: "第二段" },
          ],
        },
      ],
    });
    expect(text).toContain("A: 第一段\n第二段");
  });
});

describe("extractUnderstandingMemoryCandidates", () => {
  it("degrades to no candidates when the LLM call throws", async () => {
    const candidates = await extractUnderstandingMemoryCandidates({
      userInput: "我更在意信任感，不想一上来就很促销。",
      llmCall: async () => {
        throw new Error("upstream 503");
      },
    });
    // 漏记一条远好过让整轮对话失败。
    expect(candidates).toEqual([]);
  });

  it("passes the dialog text to the model and returns parsed candidates", async () => {
    let seen = "";
    const candidates = await extractUnderstandingMemoryCandidates({
      userInput: "我更喜欢先看结论再看推理过程。",
      llmCall: async (_system, content) => {
        seen = content;
        return JSON.stringify([
          { facet: "style", content: "更喜欢先看结论再看推理过程" },
        ]);
      },
    });
    expect(seen).toContain("我更喜欢先看结论再看推理过程。");
    expect(candidates).toHaveLength(1);
    expect(candidates[0].facet).toBe("style");
  });
});

describe("parseUnderstandingResponse hostile input", () => {
  it("rejects oversized arrays outright rather than looping over them", () => {
    const flood = Array.from({ length: 51 }, (_, i) => ({
      facet: "preference",
      content: `这是第 ${i} 条足够长的偏好描述`,
    }));
    expect(parseUnderstandingResponse(JSON.stringify(flood))).toEqual([]);

    // 边界内仍正常处理
    const ok = Array.from({ length: 50 }, (_, i) => ({
      facet: "preference",
      content: `这是第 ${i} 条足够长的偏好描述`,
    }));
    expect(parseUnderstandingResponse(JSON.stringify(ok)).length).toBe(50);
  });
});
