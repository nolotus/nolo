import { describe, expect, test } from "bun:test";
import { analyzeProfile } from "./profileAnalyzer";
import type {
  XhsNoteSummary,
  XhsNoteDetail,
  XhsComment,
} from "../types";

describe("analyzeProfile", () => {
  const makeNoteDetail = (
    overrides: Partial<XhsNoteDetail> & { noteId: string },
  ): XhsNoteDetail => ({
    title: `Note ${overrides.noteId}`,
    desc: "",
    type: "normal",
    userId: "user1",
    nickname: "Author",
    metrics: {
      likedCount: 0,
      collectedCount: 0,
      commentCount: 0,
      shareCount: 0,
    },
    ...overrides,
  });

  const makeComment = (
    overrides: Partial<XhsComment> & { commentId: string; content: string },
  ): XhsComment => ({
    userId: "u1",
    nickname: "Commenter",
    likeCount: 0,
    subCommentCount: 0,
    ...overrides,
  });

  test("returns empty analysis for no data", () => {
    const result = analyzeProfile([], [], {});
    expect(result.totalNotes).toBe(0);
    expect(result.highestLikedNote).toBeNull();
    expect(result.highestCommentedNote).toBeNull();
    expect(result.highestCollectedNote).toBeNull();
    expect(result.highestSharedNote).toBeNull();
    expect(result.commentBuckets).toEqual([]);
    expect(result.topLikedComments).toEqual([]);
  });

  test("finds highest liked note from details", () => {
    const details = [
      makeNoteDetail({
        noteId: "n1",
        title: "Low likes",
        metrics: { likedCount: 10, collectedCount: 5, commentCount: 2, shareCount: 1 },
      }),
      makeNoteDetail({
        noteId: "n2",
        title: "High likes",
        metrics: { likedCount: 1000, collectedCount: 200, commentCount: 50, shareCount: 30 },
      }),
      makeNoteDetail({
        noteId: "n3",
        metrics: { likedCount: 500, collectedCount: 100, commentCount: 100, shareCount: 50 },
      }),
    ];

    const result = analyzeProfile([], details, {});
    expect(result.highestLikedNote?.noteId).toBe("n2");
    expect(result.highestLikedNote?.count).toBe(1000);
    expect(result.highestCommentedNote?.noteId).toBe("n3");
    expect(result.highestCommentedNote?.count).toBe(100);
    expect(result.highestCollectedNote?.noteId).toBe("n2");
    expect(result.highestSharedNote?.noteId).toBe("n3");
  });

  test("falls back to note summaries when no details", () => {
    const notes: XhsNoteSummary[] = [
      { noteId: "n1", title: "Low", likedCount: 10 },
      { noteId: "n2", title: "High", likedCount: 999 },
      { noteId: "n3", likedCount: 500 },
    ];

    const result = analyzeProfile(notes, [], {});
    expect(result.totalNotes).toBe(3);
    expect(result.highestLikedNote?.noteId).toBe("n2");
    expect(result.highestLikedNote?.count).toBe(999);
    // Cannot determine commented/collected/shared from summaries alone.
    expect(result.highestCommentedNote).toBeNull();
  });

  test("falls back to collected comment counts when details are unavailable", () => {
    const notes: XhsNoteSummary[] = [
      { noteId: "n1", title: "Few comments", likedCount: 10 },
      { noteId: "n2", title: "Many comments", likedCount: 20 },
    ];

    const result = analyzeProfile(notes, [], {
      n1: [
        makeComment({ commentId: "c1", content: "one" }),
      ],
      n2: [
        makeComment({ commentId: "c2", content: "two" }),
        makeComment({ commentId: "c3", content: "three" }),
      ],
    });

    expect(result.highestCommentedNote).toEqual({
      noteId: "n2",
      title: "Many comments",
      count: 2,
    });
  });

  test("classifies comments into keyword buckets", () => {
    const commentsByNote: Record<string, XhsComment[]> = {
      n1: [
        makeComment({
          commentId: "c1",
          content: "求链接，想买",
          likeCount: 10,
        }),
        makeComment({
          commentId: "c2",
          content: "太好看了，爱了",
          likeCount: 20,
        }),
        makeComment({
          commentId: "c3",
          content: "我也去过，超美的",
          likeCount: 5,
        }),
        makeComment({
          commentId: "c4",
          content: "哈哈哈哈哈笑死",
          likeCount: 3,
        }),
        makeComment({
          commentId: "c5",
          content: "攻略写得好详细，干货满满",
          likeCount: 15,
        }),
        makeComment({
          commentId: "c6",
          content: "这是哪里啊？",
          likeCount: 1,
        }),
      ],
    };

    const result = analyzeProfile([], [], commentsByNote);

    const bucketMap = new Map(
      result.commentBuckets.map((b) => [b.label, b]),
    );

    expect(bucketMap.has("询问求链接/教程")).toBe(true);
    expect(bucketMap.has("赞美/鼓励")).toBe(true);
    expect(bucketMap.has("个人经历")).toBe(true);
    expect(bucketMap.has("搞笑/段子")).toBe(true);
    expect(bucketMap.has("建议/攻略")).toBe(true);
    expect(bucketMap.has("提问/互动")).toBe(true);

    // Check sample comment IDs are present
    expect(
      bucketMap.get("赞美/鼓励")?.sampleCommentIds,
    ).toContain("c2");
  });

  test("topLikedComments returns sorted top 10", () => {
    const comments: XhsComment[] = Array.from({ length: 15 }, (_, i) =>
      makeComment({
        commentId: `c${i}`,
        content: `Comment ${i}`,
        likeCount: (15 - i) * 10,
      }),
    );

    const result = analyzeProfile([], [], { n1: comments });
    expect(result.topLikedComments).toHaveLength(10);
    expect(result.topLikedComments[0].commentId).toBe("c0");
    expect(result.topLikedComments[0].likeCount).toBe(150);
    expect(result.topLikedComments[9].commentId).toBe("c9");
    expect(result.topLikedComments[9].likeCount).toBe(60);
  });

  test("handles empty comments gracefully", () => {
    const result = analyzeProfile(
      [{ noteId: "n1", likedCount: 10 }],
      [],
      { n1: [] },
    );
    expect(result.commentBuckets).toEqual([]);
    expect(result.topLikedComments).toEqual([]);
  });

  test("counts notes from summaries", () => {
    const notes: XhsNoteSummary[] = [
      { noteId: "n1" },
      { noteId: "n2" },
      { noteId: "n3" },
      { noteId: "n4" },
    ];
    const result = analyzeProfile(notes, [], {});
    expect(result.totalNotes).toBe(4);
  });
});
