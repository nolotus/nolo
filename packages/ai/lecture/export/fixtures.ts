/**
 * 导出器测试用 fixture：一节 90 分钟俄语数学课（ru → zh），
 * 含 lecture / chatter / break 段、两层大纲、重点、术语表、截取建议。
 * 数据为手写样本，仅用于导出契约测试（不触网、不读文件）。
 */
import type { LectureResult } from "../types";

const SEGMENTS: LectureResult["segments"] = [
  {
    id: "seg-0001",
    startSec: 0,
    endSec: 42,
    text: "Здравствуйте, сегодня разберём определённый интеграл.",
    translation: "大家好，今天我们来讲定积分。",
    label: "lecture",
    excluded: false,
  },
  {
    id: "seg-0002",
    startSec: 42,
    endSec: 95,
    text: "Начнём с площади под кривой и с понятием первообразной.",
    translation: "我们从曲线下面积和原函数的概念开始。",
    label: "lecture",
    excluded: false,
  },
  {
    id: "seg-0003",
    startSec: 95,
    endSec: 128,
    text: "А кто идёт в столовую в перерыв?",
    translation: "谁休息的时候去食堂？",
    label: "chatter",
    excluded: true,
  },
  {
    id: "seg-0004",
    startSec: 128,
    endSec: 205,
    text: "Первообразная для f(x) — это функция F, у которой F'(x) = f(x).",
    translation: "f(x) 的原函数是满足 F'(x) = f(x) 的函数 F。",
    label: "lecture",
    excluded: false,
  },
  {
    id: "seg-0005",
    startSec: 205,
    endSec: 262,
    text: "Теорема Ньютона-Лейбница связывает интеграл и первообразную.",
    translation: "牛顿-莱布尼茨定理把积分和原函数联系起来。",
    label: "lecture",
    excluded: false,
  },
  {
    id: "seg-0006",
    startSec: 262,
    endSec: 274,
    text: "Перерыв пять минут.",
    translation: "休息五分钟。",
    label: "break",
    excluded: true,
  },
  {
    id: "seg-0007",
    startSec: 274,
    endSec: 331,
    text: "Пример: интеграл x dx от нуля до двух равен двум.",
    translation: "例子：x dx 从 0 到 2 的积分等于 2。",
    label: "lecture",
    excluded: false,
  },
  {
    id: "seg-0008",
    startSec: 331,
    endSec: 366,
    text: "Домашнее задание: номера двенадцать и тринадцать.",
    translation: "作业：第十二题和第十三题。",
    label: "lecture",
    excluded: false,
  },
];

/** 每次调用返回深拷贝，测试之间互不影响。 */
export function sampleLectureResult(): LectureResult {
  return {
    version: 1,
    jobId: "job-lecture-fixture-0001",
    source: {
      fileId: "file-0001",
      name: "Лекция 5. Определённый интеграл.m4a",
      mimeType: "audio/mp4",
      durationSec: 5400,
      kind: "audio",
    },
    scope: { fromSec: 0, toSec: 5400 },
    sourceLang: "ru",
    targetLang: "zh",
    segments: SEGMENTS.map((segment) => ({ ...segment })),
    trimSuggestions: [
      {
        fromSec: 366,
        toSec: 5400,
        reason: "尾部 84 分钟无人声",
        signal: "silence",
        confidence: 0.97,
      },
    ],
    outline: [
      {
        title: "Введение",
        startSec: 0,
        endSec: 95,
        children: [
          { title: "Площадь под кривой", startSec: 0, endSec: 42 },
          { title: "Понятие первообразной", startSec: 42, endSec: 95 },
        ],
      },
      {
        title: "Определение и теорема",
        startSec: 128,
        endSec: 262,
        children: [{ title: "Теорема Ньютона-Лейбница", startSec: 205, endSec: 262 }],
      },
      { title: "Пример и домашнее задание", startSec: 274, endSec: 366 },
    ],
    keyPoints: [
      { text: "Первообразная F удовлетворяет F'(x) = f(x).", segmentIds: ["seg-0004"] },
      { text: "Теорема Ньютона-Лейбница считает интеграл через первообразную.", segmentIds: ["seg-0005"] },
      { text: "Пример: интеграл x dx от нуля до двух равен двум.", segmentIds: ["seg-0007"] },
    ],
    glossary: [
      { source: "интеграл", target: "积分", note: "Определённый и неопределённый" },
      { source: "первообразная", target: "原函数" },
      { source: "теорема Ньютона-Лейбница", target: "牛顿-莱布尼茨定理", note: "Связывает интеграл и производную" },
    ],
    edits: { updatedAt: 1_760_000_000_000 },
  };
}

/** 不含译文的 fixture（验证无翻译时 lang 回退 src）。 */
export function sampleLectureResultWithoutTranslation(): LectureResult {
  const result = sampleLectureResult();
  result.targetLang = undefined;
  result.segments = result.segments.map((segment) => {
    const { translation: _translation, ...rest } = segment;
    return rest;
  });
  return result;
}

/** 非法文件名的 fixture（验证文件名清洗）。 */
export function sampleLectureResultWithUnsafeName(): LectureResult {
  const result = sampleLectureResult();
  result.source = { ...result.source, name: 'лек/ция:"05"?<x>.mp4' };
  return result;
}
