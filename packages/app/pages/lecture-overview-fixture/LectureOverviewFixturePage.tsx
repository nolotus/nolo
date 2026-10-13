import React, { useState } from "react";
import { LectureOverview } from "render/web/lecture/LectureOverview";
import type { LectureResult } from "ai/lecture/types";

const result: LectureResult = {
  version: 1,
  jobId: "fixture-lecture",
  source: { fileId: "fixture", name: "俄语课程示例", mimeType: "audio/mp3", durationSec: 1200, kind: "audio" },
  scope: { fromSec: 0, toSec: 1200 },
  sourceLang: "ru",
  segments: [
    { id: "s1", startSec: 30, endSec: 300, text: "基础语法", label: "lecture", excluded: false },
    { id: "s2", startSec: 300, endSec: 420, text: "课间交谈", label: "chatter", excluded: true },
    { id: "s3", startSec: 420, endSec: 900, text: "动词变位", label: "lecture", excluded: false },
  ],
  trimSuggestions: [{ fromSec: 300, toSec: 420, reason: "课间", signal: "density", confidence: 0.9 }],
  outline: [{ title: "语法", startSec: 30, endSec: 900, children: [{ title: "基础变格", startSec: 60, endSec: 300 }, { title: "动词变位", startSec: 420, endSec: 900 }] }],
  keyPoints: [{ text: "名词有六种变格", segmentIds: ["s1"] }, { text: "动词按人称变位", segmentIds: ["s3"] }],
  glossary: [],
};

export default function LectureOverviewFixturePage() {
  const [currentSec, setCurrentSec] = useState(0);
  return <main style={{ padding: 16 }}>
    <h1>课程概览可视预览</h1>
    <p>currentSec: <span data-testid="current-sec">{currentSec}</span></p>
    <LectureOverview result={result} onSeek={setCurrentSec} />
  </main>;
}
