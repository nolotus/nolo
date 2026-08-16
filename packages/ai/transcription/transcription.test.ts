import { describe, it, expect } from "bun:test";
import type { Word, WhisperVerboseResponse } from "./types";
import { alignPunctuatedText, lcsMatch } from "./align";
import { splitCue, splitCues } from "./split";
import { formatSrtTime, formatSRT } from "./srt";
import { buildSubtitles } from "./index";

describe("Transcription Module Tests", () => {
  // 1. 正常路径：标点文本对齐后 cue 数量、边界时间戳正确。
  it("1. 正常路径：标点文本对齐后 cue 数量、边界时间戳正确", () => {
    const words: Word[] = [
      { word: "大家好", start: 0.0, end: 0.5 },
      { word: "今天", start: 0.6, end: 1.0 },
      { word: "天气", start: 1.1, end: 1.5 },
      { word: "很好", start: 1.6, end: 2.0 },
    ];
    const punctuatedText = "大家好，今天天气很好。";

    const res = alignPunctuatedText(words, punctuatedText);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.cues.length).toBe(1);
      expect(res.cues[0].start).toBe(0.0);
      expect(res.cues[0].end).toBe(2.0);
      expect(res.cues[0].text).toBe("大家好，今天天气很好。");
    }
  });

  // 2. 句末标点切分：。！？ 各自能正确闭合 cue。
  it("2. 句末标点切分：。！？ 各自能正确闭合 cue", () => {
    const words: Word[] = [
      { word: "真的", start: 0.0, end: 0.5 },
      { word: "吗", start: 0.5, end: 0.8 },
      { word: "太棒", start: 1.0, end: 1.5 },
      { word: "了", start: 1.5, end: 1.8 },
      { word: "确实", start: 2.0, end: 2.5 },
    ];
    const punctuatedText = "真的吗？太棒了！确实。";

    const res = alignPunctuatedText(words, punctuatedText);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.cues.length).toBe(3);
      expect(res.cues[0].text).toBe("真的吗？");
      expect(res.cues[0].start).toBe(0.0);
      expect(res.cues[0].end).toBe(0.8);

      expect(res.cues[1].text).toBe("太棒了！");
      expect(res.cues[1].start).toBe(1.0);
      expect(res.cues[1].end).toBe(1.8);

      expect(res.cues[2].text).toBe("确实。");
      expect(res.cues[2].start).toBe(2.0);
      expect(res.cues[2].end).toBe(2.5);
    }
  });

  // 3. 字符失配：标点文本多一个字 → 返回 ok: false，且 reason 含差异下标。
  it("3. 字符失配：标点文本多一个字 → 返回 ok: false，且 reason 含差异下标", () => {
    const words: Word[] = [
      { word: "内容", start: 0.0, end: 0.5 },
      { word: "分析", start: 0.5, end: 1.0 },
    ];
    const punctuatedText = "内容分析好。"; // 多了一个“好”字

    const res = alignPunctuatedText(words, punctuatedText);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason.toLowerCase()).toContain("mismatch");
      expect(res.reason).toContain("4"); // 差异下标 4
    }
  });

  // 4. 超长切分：单句超过 24 字符 → 在 ， 处二次切分。
  it("4. 超长切分：单句超过 24 字符 → 在 ， 处二次切分", () => {
    const cue = {
      start: 0.0,
      end: 5.0,
      text: "大家好今天我们来聊一聊短视频的内容分析，第一点是选题的方向。",
    };
    expect(cue.text.length).toBeGreaterThan(24);

    const split = splitCue(cue, { maxChars: 24, maxDuration: 6.0 });
    expect(split.length).toBe(2);
    expect(split[0].text).toBe("大家好今天我们来聊一聊短视频的内容分析，");
    expect(split[1].text).toBe("第一点是选题的方向。");
    expect(split[0].end).toBe(split[1].start);
    expect(split[0].start).toBe(0.0);
    expect(split[1].end).toBe(5.0);
  });

  // 5. 超时长切分：单句跨度超过 6 秒 → 被切分。
  it("5. 超时长切分：单句跨度超过 6 秒 → 被切分", () => {
    const cue = {
      start: 0.0,
      end: 10.0,
      text: "这是一段说话非常缓慢的文字，中间有明显的停顿感。",
    };

    const split = splitCue(cue, { maxChars: 24, maxDuration: 6.0 });
    expect(split.length).toBeGreaterThanOrEqual(2);
    for (const c of split) {
      expect(c.end - c.start).toBeLessThanOrEqual(6.0);
    }
  });

  // 6. 混合内容：含英文单词与阿拉伯数字的 words 能正确对齐（如 webcoding、3）。
  it("6. 混合内容：含英文单词与阿拉伯数字的 words 能正确对齐", () => {
    const words: Word[] = [
      { word: "会玩", start: 0.0, end: 0.5 },
      { word: "webcoding", start: 0.5, end: 1.2 },
      { word: "的", start: 1.2, end: 1.4 },
      { word: "第", start: 1.4, end: 1.6 },
      { word: "3", start: 1.6, end: 1.8 },
      { word: "天", start: 1.8, end: 2.0 },
    ];
    const punctuatedText = "会玩 webcoding 的第 3 天！";

    const res = alignPunctuatedText(words, punctuatedText);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.cues.length).toBe(1);
      expect(res.cues[0].start).toBe(0.0);
      expect(res.cues[0].end).toBe(2.0);
      expect(res.cues[0].text).toBe("会玩 webcoding 的第 3 天！");
    }
  });

  // 7. SRT 格式：时间戳形如 00:00:01,230；跨 1 小时的时间戳正确（如 01:02:03,456）。
  it("7. SRT 格式：时间戳形如 00:00:01,230；跨 1 小时的时间戳正确", () => {
    expect(formatSrtTime(1.23)).toBe("00:00:01,230");
    expect(formatSrtTime(3723.456)).toBe("01:02:03,456");

    const cues = [
      { start: 1.23, end: 4.56, text: "第一句" },
      { start: 3723.456, end: 3728.9, text: "跨小时第二句" },
    ];
    const srt = formatSRT(cues);
    expect(srt).toContain("1\n00:00:01,230 --> 00:00:04,560\n第一句");
    expect(srt).toContain("2\n01:02:03,456 --> 01:02:08,900\n跨小时第二句");
  });

  // 8. 空输入：words: [] 不抛异常。
  it("8. 空输入：words: [] 不抛异常", async () => {
    const emptyResp: WhisperVerboseResponse = {
      text: "",
      words: [],
    };
    const res = await buildSubtitles(emptyResp);
    expect(res.cues).toEqual([]);
    expect(res.srt).toBe("");
    expect(res.text).toBe("");
    expect(res.degradedChunks).toBe(0);

    const alignRes = alignPunctuatedText([], "");
    expect(alignRes.ok).toBe(true);
  });

  // 9. LCS 单测: 验证 lcsMatch
  it("9. LCS 单测: 验证 lcsMatch 导出函数", () => {
    const res = lcsMatch("abcde", "ace");
    expect(res.lcsLength).toBe(3);
    expect(res.matches).toEqual([
      { aIndex: 0, bIndex: 0 },
      { aIndex: 2, bIndex: 1 },
      { aIndex: 4, bIndex: 2 },
    ]);
  });

  // 10. LCS 新增 1: 纯插入
  it("10. 纯插入：标点文本比原文多字符 -> ok: true, 时间戳落在前后邻居之间单调不减", () => {
    const words: Word[] = [
      { word: "大家好", start: 0.0, end: 0.6 },
      { word: "今天", start: 0.6, end: 1.0 },
      { word: "天气", start: 1.0, end: 1.4 },
      { word: "好", start: 1.4, end: 1.8 },
    ];
    const punctuatedText = "大家好啊！今天天气非常好。";

    const res = alignPunctuatedText(words, punctuatedText, { minMatchRatio: 0.7 });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.cues.length).toBe(2);
      expect(res.cues[0].start).toBe(0.0);
      expect(res.cues[0].end).toBeGreaterThanOrEqual(0.6);
      expect(res.cues[0].end).toBeLessThanOrEqual(1.0);
      expect(res.cues[1].start).toBe(0.6);
      expect(res.cues[1].end).toBe(1.8);
    }
  });

  // 11. LCS 新增 2: 纯删除
  it("11. 纯删除：标点文本少字符 -> ok: true, 时间戳仍正确", () => {
    const words: Word[] = [
      { word: "心理", start: 0.0, end: 0.4 },
      { word: "门槛", start: 0.4, end: 0.8 },
      { word: "更低", start: 0.8, end: 1.2 },
      { word: "的的", start: 1.2, end: 1.6 },
      { word: "感觉", start: 1.6, end: 2.0 },
    ];
    const punctuatedText = "心理门槛更低的感觉。";

    const res = alignPunctuatedText(words, punctuatedText);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.cues.length).toBe(1);
      expect(res.cues[0].start).toBe(0.0);
      expect(res.cues[0].end).toBe(2.0);
      expect(res.cues[0].text).toBe("心理门槛更低的感觉。");
    }
  });

  // 12. LCS 新增 3: 替换
  it("12. 替换：等长或近似替换 -> ok: true", () => {
    const words: Word[] = [
      { word: "大家好", start: 0.0, end: 0.6 },
      { word: "今天", start: 0.6, end: 1.0 },
      { word: "天气", start: 1.0, end: 1.4 },
      { word: "很好", start: 1.4, end: 1.8 },
    ];
    const punctuatedText = "大家好！今天天气真棒。";

    const res = alignPunctuatedText(words, punctuatedText, { minMatchRatio: 0.7 });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.cues.length).toBe(2);
      expect(res.cues[0].start).toBe(0.0);
      expect(res.cues[0].end).toBe(0.6);
      expect(res.cues[1].start).toBe(0.6);
      expect(res.cues[1].end).toBe(1.4);
    }
  });

  // 13. LCS 新增 4: 低于阈值
  it("13. 低于阈值：整段被改写 matchRatio < 0.9 -> ok: false, reason 含 matchRatio 数值", () => {
    const words: Word[] = [
      { word: "完全", start: 0.0, end: 0.5 },
      { word: "不一样", start: 0.5, end: 1.2 },
      { word: "的", start: 1.2, end: 1.4 },
      { word: "文本", start: 1.4, end: 1.8 },
    ];
    const punctuatedText = "彻底改写成其他毫不相关的长句子了。";

    const res = alignPunctuatedText(words, punctuatedText, { minMatchRatio: 0.9 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toMatch(/matchRatio|Match ratio/i);
      expect(res.reason).toMatch(/0\.\d+/);
    }
  });

  // 14. LCS 新增 5: 开头未匹配
  it("14. 开头未匹配：B 开头插入字符 -> 用后继匹配字符 start 兜底，不产生 NaN 或负数", () => {
    const words: Word[] = [
      { word: "今天", start: 1.0, end: 1.5 },
      { word: "天气", start: 1.5, end: 2.0 },
      { word: "很好", start: 2.0, end: 2.5 },
    ];
    const punctuatedText = "听说今天天气很好。";

    const res = alignPunctuatedText(words, punctuatedText, { minMatchRatio: 0.6 });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.cues[0].start).toBe(1.0);
      expect(res.cues[0].start).not.toBeNaN();
      expect(res.cues[0].start).toBeGreaterThanOrEqual(0);
    }
  });

  // 15. LCS 新增 6: 结尾未匹配
  it("15. 结尾未匹配：B 结尾插入字符 -> 用前驱匹配字符 end 兜底", () => {
    const words: Word[] = [
      { word: "今天", start: 1.0, end: 1.5 },
      { word: "天气", start: 1.5, end: 2.0 },
      { word: "很好", start: 2.0, end: 2.5 },
    ];
    const punctuatedText = "今天天气很好对吧。";

    const res = alignPunctuatedText(words, punctuatedText, { minMatchRatio: 0.6 });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.cues[0].end).toBe(2.5);
    }
  });

  // 16. LCS 新增 7: 时间戳不倒退
  it("16. 时间戳不倒退：产出的 cues 满足 start <= end 且相邻 cue 不倒退", () => {
    const words: Word[] = [
      { word: "第一个", start: 0.0, end: 0.5 },
      { word: "是", start: 0.5, end: 0.7 },
      { word: "多一阵", start: 0.7, end: 1.3 },
      { word: "是什么", start: 1.3, end: 1.8 },
      { word: "太好", start: 1.8, end: 2.2 },
      { word: "了", start: 2.2, end: 2.5 },
    ];
    const punctuatedText = "第一个是多agent是什么？太好了！";

    const res = alignPunctuatedText(words, punctuatedText, { minMatchRatio: 0.5 });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.cues.length).toBe(2);
      for (let i = 0; i < res.cues.length; i++) {
        const cue = res.cues[i];
        expect(cue.start).toBeLessThanOrEqual(cue.end);
        if (i > 0) {
          expect(cue.start).toBeGreaterThanOrEqual(res.cues[i - 1].end);
        }
      }
    }
  });

  // 17. LCS 新增 8: 复用真实错误样本做回归
  it("17. 复用真实错误样本回归：「第一个是多一阵是什么」->「第一个是多agent是什么」", () => {
    const words: Word[] = [
      { word: "第一个", start: 0.0, end: 0.6 },
      { word: "是", start: 0.6, end: 0.8 },
      { word: "多", start: 0.8, end: 1.0 },
      { word: "一阵", start: 1.0, end: 1.5 },
      { word: "是", start: 1.5, end: 1.7 },
      { word: "什么", start: 1.7, end: 2.0 },
    ];
    const punctuatedText = "第一个是多agent是什么？";

    const res = alignPunctuatedText(words, punctuatedText, { minMatchRatio: 0.6 });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.cues.length).toBe(1);
      expect(res.cues[0].text).toBe("第一个是多agent是什么？");
      expect(res.cues[0].start).toBe(0.0);
      expect(res.cues[0].end).toBe(2.0);
    }
  });
});
