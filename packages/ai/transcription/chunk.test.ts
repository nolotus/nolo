import { describe, it, expect } from "bun:test";
import type { Word } from "./types";
import { chunkWords } from "./chunk";
import { buildSubtitles } from "./index";

describe("Chunking and Integration Tests", () => {
  it("chunkWords 按 word 边界切分且不损坏 word 完整性", () => {
    const words: Word[] = [
      { word: "一二三", start: 0, end: 1 },
      { word: "四五六", start: 1, end: 2 },
      { word: "七八九", start: 2, end: 3 },
    ];
    // maxCharsPerChunk = 4
    const chunks = chunkWords(words, 4);
    expect(chunks.length).toBe(3);
    expect(chunks[0].text).toBe("一二三");
    expect(chunks[1].text).toBe("四五六");
    expect(chunks[2].text).toBe("七八九");
  });

  it("buildSubtitles 支持校验失败仅降级当前块（已定结论3）", async () => {
    const words1: Word[] = [
      { word: "第一块", start: 0, end: 1 },
      { word: "文本", start: 1, end: 2 },
    ];
    const words2: Word[] = [
      { word: "第二块", start: 2, end: 3 },
      { word: "文本", start: 3, end: 4 },
    ];

    const resp = {
      text: "第一块文本第二块文本",
      words: [...words1, ...words2],
    };

    // 模拟第一个 chunk 模型擅自修改了文字（破坏字符守恒），导致校验失败；第二个 chunk 正常加标点
    const mockPunctuateFn = async (text: string) => {
      if (text.includes("第一块")) {
        return "第一块非法更改文本！"; // 篡改了文字，校验应失败并降级
      }
      return "第二块文本！";
    };

    const res = await buildSubtitles(resp, {
      chunkMaxChars: 5, // 拆成两个 chunks
      punctuateFn: mockPunctuateFn,
    });

    expect(res.degradedChunks).toBe(1); // 只有第 1 块降级
    expect(res.cues.length).toBe(2);
    expect(res.cues[0].text).toBe("第一块文本"); // 回退原始无标点文本
    expect(res.cues[1].text).toBe("第二块文本！"); // 正常处理
  });
});
