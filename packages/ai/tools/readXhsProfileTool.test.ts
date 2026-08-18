import { describe, expect, test } from "bun:test";
import {
  normalizeXhsProfileReadArgs,
  readXhsProfileFunc,
} from "./readXhsProfileTool";

describe("normalizeXhsProfileReadArgs", () => {
  test("clamps extended collection options without explicit consent", () => {
    const normalized = normalizeXhsProfileReadArgs({
      url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      maxScrollPages: 5,
      includeComments: true,
      maxCommentPagesPerNote: 3,
      minLikesForDetail: 100,
      minCommentsForCollect: 10,
    });

    expect(normalized).toMatchObject({
      maxScrollPages: 0,
      includeComments: false,
      maxCommentPagesPerNote: 1,
      extendedCollectionConsent: false,
      collectionMode: "conservative",
      assistedAction: "snapshot",
      maxAssistedSteps: 1,
    });
    expect(normalized.minLikesForDetail).toBeUndefined();
    expect(normalized.minCommentsForCollect).toBeUndefined();
  });

  test("keeps conservative mode bounded even with explicit consent", () => {
    const normalized = normalizeXhsProfileReadArgs({
      url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      maxScrollPages: 2,
      includeComments: true,
      maxCommentPagesPerNote: 1,
      minLikesForDetail: 100,
      minCommentsForCollect: 10,
      extendedCollectionConsent: true,
    });

    expect(normalized).toMatchObject({
      maxScrollPages: 0,
      includeComments: false,
      maxCommentPagesPerNote: 1,
      extendedCollectionConsent: true,
      collectionMode: "conservative",
      assistedAction: "snapshot",
    });
    expect(normalized.minLikesForDetail).toBeUndefined();
    expect(normalized.minCommentsForCollect).toBeUndefined();
  });

  test("assisted mode read_more_notes clamps scroll pages to one visible step", () => {
    const normalized = normalizeXhsProfileReadArgs({
      url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      extendedCollectionConsent: true,
      collectionMode: "assisted",
      assistedAction: "read_more_notes",
      maxAssistedSteps: 2,
    });

    expect(normalized).toMatchObject({
      collectionMode: "assisted",
      assistedAction: "read_more_notes",
      maxAssistedSteps: 1,
      maxScrollPages: 1,
      includeComments: false,
    });
  });

  test("assisted mode snapshot disables scroll and comments", () => {
    const normalized = normalizeXhsProfileReadArgs({
      url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      extendedCollectionConsent: true,
      collectionMode: "assisted",
      assistedAction: "snapshot",
      maxScrollPages: 5,
      includeComments: true,
    });

    expect(normalized).toMatchObject({
      collectionMode: "assisted",
      assistedAction: "snapshot",
      maxScrollPages: 0,
      includeComments: false,
      maxCommentPagesPerNote: 1,
    });
  });

  test("assisted mode read_visible_details enables visible details and first-screen comments", () => {
    const normalized = normalizeXhsProfileReadArgs({
      url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      extendedCollectionConsent: true,
      collectionMode: "assisted",
      assistedAction: "read_visible_details",
      maxScrollPages: 5,
      includeComments: false,
      maxCommentPagesPerNote: 99,
    });

    expect(normalized).toMatchObject({
      collectionMode: "assisted",
      assistedAction: "read_visible_details",
      maxScrollPages: 0,
      includeComments: true,
      maxCommentPagesPerNote: 3,
      maxAssistedSteps: 1,
    });
  });

  test("assisted mode discover_indexed_notes clamps to external public note URLs", () => {
    const normalized = normalizeXhsProfileReadArgs({
      url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      extendedCollectionConsent: true,
      collectionMode: "assisted",
      assistedAction: "discover_indexed_notes",
      maxScrollPages: 5,
      includeComments: false,
      maxCommentPagesPerNote: 99,
      indexedNoteUrls: [
        "https://www.xiaohongshu.com/explore/aaaaaaaaaaaaaaaaaaaaaaaa",
        "https://www.xiaohongshu.com/explore/bbbbbbbbbbbbbbbbbbbbbbbb",
        "https://www.xiaohongshu.com/discovery/item/cccccccccccccccccccccccc",
        "https://www.xiaohongshu.com/explore/dddddddddddddddddddddddd",
      ],
    });

    expect(normalized).toMatchObject({
      collectionMode: "assisted",
      assistedAction: "discover_indexed_notes",
      maxScrollPages: 0,
      includeComments: true,
      maxCommentPagesPerNote: 3,
      maxAssistedSteps: 1,
    });
    expect(normalized.indexedNoteUrls).toEqual([
      "https://www.xiaohongshu.com/explore/aaaaaaaaaaaaaaaaaaaaaaaa",
      "https://www.xiaohongshu.com/explore/bbbbbbbbbbbbbbbbbbbbbbbb",
      "https://www.xiaohongshu.com/discovery/item/cccccccccccccccccccccccc",
    ]);
  });

  test("clamps maxAssistedSteps to one visible step", () => {
    const tooLow = normalizeXhsProfileReadArgs({
      url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      extendedCollectionConsent: true,
      collectionMode: "assisted",
      assistedAction: "read_more_notes",
      maxAssistedSteps: 0,
    });
    expect(tooLow.maxAssistedSteps).toBe(1);

    const tooHigh = normalizeXhsProfileReadArgs({
      url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      extendedCollectionConsent: true,
      collectionMode: "assisted",
      assistedAction: "read_more_notes",
      maxAssistedSteps: 10,
    });
    expect(tooHigh.maxAssistedSteps).toBe(1);
  });

  test("consent without collectionMode defaults to bounded conservative", () => {
    const normalized = normalizeXhsProfileReadArgs({
      url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      extendedCollectionConsent: true,
      maxScrollPages: 2,
    });

    expect(normalized).toMatchObject({
      collectionMode: "conservative",
      assistedAction: "snapshot",
      maxScrollPages: 0,
      extendedCollectionConsent: true,
    });
  });

  test("assisted mode without explicit maxAssistedSteps defaults to 1", () => {
    const normalized = normalizeXhsProfileReadArgs({
      url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      extendedCollectionConsent: true,
      collectionMode: "assisted",
      assistedAction: "read_more_notes",
    });

    expect(normalized.maxAssistedSteps).toBe(1);
    expect(normalized.maxScrollPages).toBe(1);
  });
});

describe("readXhsProfileFunc", () => {
  test("reads an XHS profile through an injected reader", async () => {
    let readerArgs: any = null;
    const result = await readXhsProfileFunc(
      {
        url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
        maxScrollPages: 3,
        includeComments: false,
        extendedCollectionConsent: true,
        collectionMode: "assisted",
        assistedAction: "read_more_notes",
        maxAssistedSteps: 3,
        headless: false,
      },
      {},
      {
        reader: async (args) => {
          readerArgs = args;
          return {
            ok: true,
            fetchedAt: "2026-06-02T10:00:00.000Z",
            data: {
              profile: {
                userId: "5d2be8720000000010007556",
                nickname: "测试用户",
                redId: "123456",
                ipLocation: "上海",
                interactionCounts: {
                  follows: 100,
                  fans: 5000,
                  likesAndCollects: 12000,
                },
              },
              notes: [
                {
                  noteId: "note001",
                  title: "测试笔记",
                  likedCount: 500,
                },
              ],
              noteDetails: [
                {
                  noteId: "note001",
                  title: "测试笔记",
                  desc: "笔记描述",
                  type: "normal",
                  userId: "5d2be8720000000010007556",
                  nickname: "测试用户",
                  metrics: {
                    likedCount: 500,
                    collectedCount: 200,
                    commentCount: 50,
                    shareCount: 30,
                  },
                },
              ],
              commentsByNote: {},
              analysis: {
                totalNotes: 1,
                highestLikedNote: {
                  noteId: "note001",
                  title: "测试笔记",
                  count: 500,
                },
                highestCommentedNote: null,
                highestCollectedNote: null,
                highestSharedNote: null,
                commentBuckets: [],
                topLikedComments: [],
              },
            },
          };
        },
      },
    );

    expect(readerArgs).toEqual({
      url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      maxScrollPages: 1,
      includeComments: false,
      extendedCollectionConsent: true,
      headless: false,
      collectionMode: "assisted",
      assistedAction: "read_more_notes",
      maxAssistedSteps: 1,
    });
    expect(result.rawData.ok).toBe(true);
    if (result.rawData.ok) {
      expect(result.rawData.data.profile.nickname).toBe("测试用户");
      expect(result.rawData.data.analysis.totalNotes).toBe(1);
      // collectionStatus should be present
      expect(result.rawData.data.collectionStatus).toBeDefined();
      expect(result.rawData.data.collectionStatus!.mode).toBe("assisted");
      expect(result.rawData.data.collectionStatus!.extendedCollectionConsent).toBe(true);
    }
    expect(result.displayData).toContain("测试用户");
    expect(result.displayData).toContain("123456");
    expect(result.displayData).toContain("粉丝 5000");
    expect(result.displayData).toContain("最高点赞");
    expect(result.displayData).toContain("辅助采集");
  });

  test("assisted read_visible_details produces detail/comment collectionStatus", async () => {
    let readerArgs: any = null;
    const result = await readXhsProfileFunc(
      {
        url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
        extendedCollectionConsent: true,
        collectionMode: "assisted",
        assistedAction: "read_visible_details",
      },
      {},
      {
        reader: async (args) => {
          readerArgs = args;
          return {
            ok: true,
            fetchedAt: "2026-06-02T10:00:00.000Z",
            data: {
              profile: { userId: "5d2be8720000000010007556", nickname: "测试用户" },
              notes: [{ noteId: "note001", title: "测试笔记", likedCount: 1 }],
              noteDetails: [
                {
                  noteId: "note001",
                  title: "测试笔记",
                  desc: "公开正文",
                  type: "normal",
                  userId: "5d2be8720000000010007556",
                  nickname: "测试用户",
                  metrics: {
                    likedCount: 1,
                    collectedCount: 0,
                    commentCount: 1,
                    shareCount: 0,
                  },
                },
              ],
              commentsByNote: {
                note001: [
                  {
                    commentId: "comment-1",
                    userId: "commenter-1",
                    nickname: "评论用户",
                    content: "公开评论",
                    likeCount: 1,
                    subCommentCount: 0,
                  },
                ],
              },
              analysis: {
                totalNotes: 1,
                highestLikedNote: null,
                highestCommentedNote: { noteId: "note001", title: "测试笔记", count: 1 },
                highestCollectedNote: null,
                highestSharedNote: null,
                commentBuckets: [],
                topLikedComments: [],
              },
            },
          };
        },
      },
    );

    expect(readerArgs).toMatchObject({
      assistedAction: "read_visible_details",
      maxScrollPages: 0,
      includeComments: true,
      maxCommentPagesPerNote: 3,
    });
    expect(result.rawData.ok).toBe(true);
    if (result.rawData.ok) {
      expect(result.rawData.data.collectionStatus!.action).toBe("read_visible_details");
      expect(result.rawData.data.collectionStatus!.limits.includeComments).toBe(true);
    }
    expect(result.displayData).toContain("读取公开详情与首屏评论");
  });

  test("rejects non-XHS profile URLs", async () => {
    await expect(
      readXhsProfileFunc({ url: "https://example.com/user/123" }, {}, {}),
    ).rejects.toThrow("小红书用户主页 URL");
  });

  test("rejects XHS explore (note) URLs", async () => {
    await expect(
      readXhsProfileFunc(
        { url: "https://www.xiaohongshu.com/explore/abc123def456abc123def456" },
        {},
        {},
      ),
    ).rejects.toThrow("小红书用户主页 URL");
  });

  test("formats failure display with error details", async () => {
    const result = await readXhsProfileFunc(
      { url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556" },
      {},
      {
        reader: async () => ({
          ok: false,
          code: "not_logged_in",
          message: "需要登录才能访问该用户主页",
          fetchedAt: "2026-06-02T10:00:00.000Z",
        }),
      },
    );

    expect(result.rawData.ok).toBe(false);
    expect(result.displayData).toContain("读取小红书用户主页失败");
    expect(result.displayData).toContain("not_logged_in");
    expect(result.displayData).toContain("匿名模式无法读取");
  });

  test("formats login_required failure with specific hint", async () => {
    const result = await readXhsProfileFunc(
      { url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556" },
      {},
      {
        reader: async () => ({
          ok: false,
          code: "login_required",
          message: "页面检测到登录提示，未获取到笔记。",
          fetchedAt: "2026-06-02T10:00:00.000Z",
        }),
      },
    );

    expect(result.rawData.ok).toBe(false);
    expect(result.displayData).toContain("login_required");
    expect(result.displayData).toContain("匿名公开访问遇到登录墙");
  });

  test("formats empty_profile_state failure with diagnostic hint", async () => {
    const result = await readXhsProfileFunc(
      { url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556" },
      {},
      {
        reader: async () => ({
          ok: false,
          code: "empty_profile_state",
          message: "__INITIAL_STATE__ 存在但未发现笔记数据。",
          fetchedAt: "2026-06-02T10:00:00.000Z",
        }),
      },
    );

    expect(result.rawData.ok).toBe(false);
    expect(result.displayData).toContain("empty_profile_state");
    expect(result.displayData).toContain("未获取到笔记");
  });

  test("displays diagnostic info when profile succeeded with empty notes", async () => {
    const result = await readXhsProfileFunc(
      { url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556" },
      {},
      {
        reader: async () => ({
          ok: true,
          fetchedAt: "2026-06-02T10:00:00.000Z",
          data: {
            profile: {
              userId: "5d2be8720000000010007556",
              nickname: "测试用户",
            },
            notes: [],
            noteDetails: [],
            commentsByNote: {},
            analysis: {
              totalNotes: 0,
              highestLikedNote: null,
              highestCommentedNote: null,
              highestCollectedNote: null,
              highestSharedNote: null,
              commentBuckets: [],
              topLikedComments: [],
            },
            diagnostic: {
              code: "empty_profile_state",
              message: "页面加载但未获取到笔记数据。",
              loginDetected: true,
              initialStatePresent: true,
              initialStateNoteCount: 0,
              capturedApiResponseCount: 0,
            },
          },
        }),
      },
    );

    expect(result.rawData.ok).toBe(true);
    expect(result.displayData).toContain("测试用户");
    expect(result.displayData).toContain("采集诊断");
    expect(result.displayData).toContain("empty_profile_state");
    expect(result.displayData).toContain("登录提示");
  });

  test("does not expose cookies or xsecToken in display", async () => {
    const result = await readXhsProfileFunc(
      { url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556" },
      {},
      {
        reader: async () => ({
          ok: true,
          fetchedAt: "2026-06-02T10:00:00.000Z",
          data: {
            profile: {
              userId: "5d2be8720000000010007556",
              nickname: "用户",
            },
            notes: [],
            noteDetails: [],
            commentsByNote: {},
            analysis: {
              totalNotes: 0,
              highestLikedNote: null,
              highestCommentedNote: null,
              highestCollectedNote: null,
              highestSharedNote: null,
              commentBuckets: [],
              topLikedComments: [],
            },
          },
        }),
      },
    );

    const displayStr = JSON.stringify(result);
    expect(displayStr).not.toContain("xsecToken");
    expect(displayStr).not.toContain("xsec_token");
    expect(displayStr).not.toContain("cookie");
    expect(displayStr).not.toContain("web_session");
  });

  test("preserves pasted profile xsec URL internally and redacts tool output", async () => {
    let readerArgs: any = null;
    const pastedUrl =
      "https://www.xiaohongshu.com/user/profile/5b587d1de8ac2b7572f0d9b0?xsec_token=secret-profile-token&xsec_source=pc_feed";

    const result = await readXhsProfileFunc(
      { url: pastedUrl },
      {},
      {
        reader: async (args): Promise<any> => {
          readerArgs = args;
          return {
            ok: true,
            fetchedAt: "2026-06-06T10:00:00.000Z",
            data: {
              profile: {
                userId: "5b587d1de8ac2b7572f0d9b0",
                nickname: "匿名可见用户",
              },
              notes: [],
              noteDetails: [],
              commentsByNote: {},
              analysis: {
                totalNotes: 0,
                highestLikedNote: null,
                highestCommentedNote: null,
                highestCollectedNote: null,
                highestSharedNote: null,
                commentBuckets: [],
                topLikedComments: [],
              },
              diagnostic: {
                code: "OK",
                message: "匿名公开读取完成",
                finalUrl: pastedUrl,
                loginDetected: false,
                redirectedToLogin: false,
              },
            },
          };
        },
      },
    );

    expect(readerArgs.url).toContain("xsec_token=secret-profile-token");
    expect(readerArgs.url).toContain("xsec_source=pc_feed");
    const resultText = JSON.stringify(result);
    expect(resultText).not.toContain("secret-profile-token");
    expect(resultText).toContain("xsec_token=[REDACTED]");
  });

  test("displays comment buckets when available", async () => {
    const result = await readXhsProfileFunc(
      { url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556" },
      {},
      {
        reader: async () => ({
          ok: true,
          fetchedAt: "2026-06-02T10:00:00.000Z",
          data: {
            profile: {
              userId: "5d2be8720000000010007556",
              nickname: "用户",
            },
            notes: [],
            noteDetails: [],
            commentsByNote: {},
            analysis: {
              totalNotes: 5,
              highestLikedNote: {
                noteId: "n1",
                title: "热门笔记",
                count: 1000,
              },
              highestCommentedNote: null,
              highestCollectedNote: null,
              highestSharedNote: null,
              commentBuckets: [
                { label: "询问求链接/教程", count: 15, sampleCommentIds: [] },
                { label: "赞美/鼓励", count: 30, sampleCommentIds: [] },
              ],
              topLikedComments: [],
            },
          },
        }),
      },
    );

    expect(result.displayData).toContain("评论主题分布");
    expect(result.displayData).toContain("询问求链接/教程: 15");
    expect(result.displayData).toContain("赞美/鼓励: 30");
  });

  test("conservative URL-only call produces conservative collectionStatus", async () => {
    const result = await readXhsProfileFunc(
      { url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556" },
      {},
      {
        reader: async () => ({
          ok: true,
          fetchedAt: "2026-06-02T10:00:00.000Z",
          data: {
            profile: { userId: "5d2be8720000000010007556", nickname: "U" },
            notes: [{ noteId: "n1", title: "T" }],
            noteDetails: [],
            commentsByNote: {},
            analysis: {
              totalNotes: 1,
              highestLikedNote: null,
              highestCommentedNote: null,
              highestCollectedNote: null,
              highestSharedNote: null,
              commentBuckets: [],
              topLikedComments: [],
            },
          },
        }),
      },
    );

    expect(result.rawData.ok).toBe(true);
    if (result.rawData.ok) {
      const cs = result.rawData.data.collectionStatus!;
      expect(cs.mode).toBe("conservative");
      expect(cs.action).toBe("snapshot");
      expect(cs.extendedCollectionConsent).toBe(false);
      expect(cs.assistedStepCount).toBe(0);
      expect(cs.limits.maxScrollPages).toBe(0);
      expect(cs.limits.includeComments).toBe(false);
      expect(cs.nextSuggestedAction).toBeDefined();
      expect(cs.nextSuggestedAction!.action).toBe("read_more_notes");
    }
  });

  test("assisted read_more_notes produces correct collectionStatus", async () => {
    const result = await readXhsProfileFunc(
      {
        url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
        extendedCollectionConsent: true,
        collectionMode: "assisted",
        assistedAction: "read_more_notes",
        maxAssistedSteps: 2,
      },
      {},
      {
        reader: async () => ({
          ok: true,
          fetchedAt: "2026-06-02T10:00:00.000Z",
          data: {
            profile: { userId: "5d2be8720000000010007556", nickname: "U" },
            notes: [
              { noteId: "n1", title: "T1" },
              { noteId: "n2", title: "T2" },
              { noteId: "n3", title: "T3" },
              { noteId: "n4", title: "T4" },
              { noteId: "n5", title: "T5" },
            ],
            noteDetails: [],
            commentsByNote: {},
            analysis: {
              totalNotes: 5,
              highestLikedNote: null,
              highestCommentedNote: null,
              highestCollectedNote: null,
              highestSharedNote: null,
              commentBuckets: [],
              topLikedComments: [],
            },
          },
        }),
      },
    );

    expect(result.rawData.ok).toBe(true);
    if (result.rawData.ok) {
      const cs = result.rawData.data.collectionStatus!;
      expect(cs.mode).toBe("assisted");
      expect(cs.action).toBe("read_more_notes");
      expect(cs.extendedCollectionConsent).toBe(true);
      expect(cs.assistedStepCount).toBe(1);
      expect(cs.limits.maxAssistedSteps).toBe(1);
      expect(cs.limits.maxScrollPages).toBe(1);
      expect(cs.limits.includeComments).toBe(false);
    }
    expect(result.displayData).toContain("辅助采集");
    expect(result.displayData).toContain("读取更多笔记");
  });

  test("login diagnostic first suggests external indexed public notes", async () => {
    const result = await readXhsProfileFunc(
      { url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556" },
      {},
      {
        reader: async () => ({
          ok: true,
          fetchedAt: "2026-06-02T10:00:00.000Z",
          data: {
            profile: { userId: "5d2be8720000000010007556", nickname: "" },
            notes: [],
            noteDetails: [],
            commentsByNote: {},
            analysis: {
              totalNotes: 0,
              highestLikedNote: null,
              highestCommentedNote: null,
              highestCollectedNote: null,
              highestSharedNote: null,
              commentBuckets: [],
              topLikedComments: [],
            },
            diagnostic: {
              code: "login_required",
              message: "需要登录",
              loginDetected: true,
            },
          },
        }),
      },
    );

    expect(result.rawData.ok).toBe(true);
    if (result.rawData.ok) {
      const cs = result.rawData.data.collectionStatus!;
      expect(cs.nextSuggestedAction).toBeDefined();
      expect(cs.nextSuggestedAction!.action).toBe("discover_indexed_notes");
      expect(cs.nextSuggestedAction!.reason).toContain("外部索引");
    }
  });

  test("empty anonymous profile state suggests external indexed public notes", async () => {
    const result = await readXhsProfileFunc(
      { url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556" },
      {},
      {
        reader: async () => ({
          ok: true,
          fetchedAt: "2026-06-02T10:00:00.000Z",
          data: {
            profile: {
              userId: "5d2be8720000000010007556",
              nickname: "22 soul",
            },
            notes: [],
            noteDetails: [],
            commentsByNote: {},
            analysis: {
              totalNotes: 0,
              highestLikedNote: null,
              highestCommentedNote: null,
              highestCollectedNote: null,
              highestSharedNote: null,
              commentBuckets: [],
              topLikedComments: [],
            },
            diagnostic: {
              code: "empty_profile_state",
              message: "匿名状态未发现笔记",
            },
          },
        }),
      },
    );

    expect(result.rawData.ok).toBe(true);
    if (result.rawData.ok) {
      const cs = result.rawData.data.collectionStatus!;
      expect(cs.nextSuggestedAction).toBeDefined();
      expect(cs.nextSuggestedAction!.action).toBe("discover_indexed_notes");
      expect(cs.nextSuggestedAction!.reason).toContain("外部索引");
    }
  });

  test("login diagnostic after indexed discovery stops anonymous collection", async () => {
    const result = await readXhsProfileFunc(
      {
        url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
        extendedCollectionConsent: true,
        collectionMode: "assisted",
        assistedAction: "discover_indexed_notes",
        indexedNoteUrls: [
          "https://www.xiaohongshu.com/explore/aaaaaaaaaaaaaaaaaaaaaaaa",
        ],
      },
      {},
      {
        reader: async () => ({
          ok: true,
          fetchedAt: "2026-06-02T10:00:00.000Z",
          data: {
            profile: { userId: "5d2be8720000000010007556", nickname: "" },
            notes: [],
            noteDetails: [],
            commentsByNote: {},
            analysis: {
              totalNotes: 0,
              highestLikedNote: null,
              highestCommentedNote: null,
              highestCollectedNote: null,
              highestSharedNote: null,
              commentBuckets: [],
              topLikedComments: [],
            },
            diagnostic: {
              code: "login_required",
              message: "需要登录",
              loginDetected: true,
            },
          },
        }),
      },
    );

    expect(result.rawData.ok).toBe(true);
    if (result.rawData.ok) {
      const cs = result.rawData.data.collectionStatus!;
      expect(cs.nextSuggestedAction).toBeDefined();
      expect(cs.nextSuggestedAction!.action).toBe("stop_anonymous_unavailable");
      expect(cs.nextSuggestedAction!.reason).toContain("不会登录");
    }
  });
});
