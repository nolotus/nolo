/**
 * Deterministic profile analyzer for XHS collected data.
 * No LLM calls. Uses keyword-bucket heuristics for comment categorization.
 */

import type {
  XhsNoteSummary,
  XhsNoteDetail,
  XhsComment,
  XhsProfileAnalysis,
  XhsTopNote,
  XhsCommentBucket,
} from "../types";

// --- Comment keyword buckets ---

const BUCKET_DEFINITIONS: Array<{
  label: string;
  keywords: string[];
}> = [
  {
    label: "询问求链接/教程",
    keywords: ["链接", "求链接", "怎么买", "在哪买", "哪里买", "怎么弄", "教程", "怎么做的", "求分享", "私", "私信"],
  },
  {
    label: "建议/攻略",
    keywords: ["建议", "攻略", "推荐", "避雷", "踩雷", "注意", "tips", "经验", "分享", "干货"],
  },
  {
    label: "赞美/鼓励",
    keywords: ["好看", "太美", "太好看了", "好棒", "真棒", "厉害", "赞", "优秀", "绝了", "太绝", "爱了", "心动", "种草", "好爱"],
  },
  {
    label: "提问/互动",
    keywords: ["？", "?", "吗", "多少钱", "什么", "怎么", "为什么", "哪个", "什么时候"],
  },
  {
    label: "搞笑/段子",
    keywords: ["哈哈", "笑死", "哈哈哈", "笑死我", "绝绝子", "笑不活", "救命", "破防"],
  },
  {
    label: "个人经历",
    keywords: ["我也", "我之前", "我当时", "我是", "我用过", "我去过", "我觉得", "我也买", "我的"],
  },
];

/**
 * Classify a comment into one or more buckets by keyword matching.
 * Returns bucket indices.
 */
function classifyComment(content: string): number[] {
  const lower = content.toLowerCase();
  const matched: number[] = [];
  for (let i = 0; i < BUCKET_DEFINITIONS.length; i++) {
    const bucket = BUCKET_DEFINITIONS[i];
    if (bucket.keywords.some((kw) => lower.includes(kw))) {
      matched.push(i);
    }
  }
  return matched;
}

/**
 * Find the note with the highest value for a given metric accessor.
 */
function findTopNote(
  details: XhsNoteDetail[],
  accessor: (d: XhsNoteDetail) => number,
): XhsTopNote | null {
  if (details.length === 0) return null;
  let best: XhsNoteDetail | null = null;
  let bestValue = -1;
  for (const d of details) {
    const v = accessor(d);
    if (v > bestValue) {
      bestValue = v;
      best = d;
    }
  }
  if (!best) return null;
  return {
    noteId: best.noteId,
    title: best.title,
    count: bestValue,
  };
}

/**
 * Analyze a collection of normalized notes and comments.
 *
 * @param notes - Note summaries (from profile listing).
 * @param details - Note details (if enriched).
 * @param commentsByNote - Map of noteId -> top-level comments.
 */
export function analyzeProfile(
  notes: XhsNoteSummary[],
  details: XhsNoteDetail[],
  commentsByNote: Record<string, XhsComment[]>,
): XhsProfileAnalysis {
  // Use details when available, fall back to note summaries
  const hasDetails = details.length > 0;

  const highestLikedNote = hasDetails
    ? findTopNote(details, (d) => d.metrics.likedCount)
    : findTopNoteFromSummaries(notes, (n) => n.likedCount ?? 0);

  const highestCommentedNote = hasDetails
    ? findTopNote(details, (d) => d.metrics.commentCount)
    : findTopNoteFromCollectedComments(notes, commentsByNote);

  const highestCollectedNote = hasDetails
    ? findTopNote(details, (d) => d.metrics.collectedCount)
    : null;

  const highestSharedNote = hasDetails
    ? findTopNote(details, (d) => d.metrics.shareCount)
    : null;

  // Aggregate all comments
  const allComments: XhsComment[] = [];
  for (const noteId of Object.keys(commentsByNote)) {
    allComments.push(...commentsByNote[noteId]);
  }

  // Classify comments into buckets
  const bucketCounts = BUCKET_DEFINITIONS.map(() => 0);
  const bucketSamples = BUCKET_DEFINITIONS.map((): string[] => []);

  for (const comment of allComments) {
    const indices = classifyComment(comment.content);
    for (const idx of indices) {
      bucketCounts[idx]++;
      if (bucketSamples[idx].length < 3) {
        bucketSamples[idx].push(comment.commentId);
      }
    }
  }

  const commentBuckets: XhsCommentBucket[] = BUCKET_DEFINITIONS.map(
    (def, i) => ({
      label: def.label,
      count: bucketCounts[i],
      sampleCommentIds: bucketSamples[i],
    }),
  ).filter((b) => b.count > 0);

  // Top liked comments
  const topLikedComments = [...allComments]
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, 10);

  return {
    totalNotes: notes.length,
    highestLikedNote,
    highestCommentedNote,
    highestCollectedNote,
    highestSharedNote,
    commentBuckets,
    topLikedComments,
  };
}

function findTopNoteFromSummaries(
  notes: XhsNoteSummary[],
  accessor: (n: XhsNoteSummary) => number,
): XhsTopNote | null {
  if (notes.length === 0) return null;
  let best: XhsNoteSummary | null = null;
  let bestValue = -1;
  for (const n of notes) {
    const v = accessor(n);
    if (v > bestValue) {
      bestValue = v;
      best = n;
    }
  }
  if (!best) return null;
  return {
    noteId: best.noteId,
    title: best.title,
    count: bestValue,
  };
}

function findTopNoteFromCollectedComments(
  notes: XhsNoteSummary[],
  commentsByNote: Record<string, XhsComment[]>,
): XhsTopNote | null {
  if (notes.length === 0) return null;
  let best: XhsNoteSummary | null = null;
  let bestValue = -1;
  for (const note of notes) {
    const value = commentsByNote[note.noteId]?.length ?? 0;
    if (value > bestValue) {
      bestValue = value;
      best = note;
    }
  }
  if (!best || bestValue <= 0) return null;
  return {
    noteId: best.noteId,
    title: best.title,
    count: bestValue,
  };
}
