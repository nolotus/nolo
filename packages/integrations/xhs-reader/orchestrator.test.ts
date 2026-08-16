import { describe, expect, test } from "bun:test";
import { collectXhsProfile } from "./orchestrator";
import type { XhsPageLike } from "./backends/playwrightProfileCollector";
import { containsSensitiveValue } from "./redaction";

/**
 * Create a mock page using the REAL XHS INITIAL_STATE shape.
 */
function createSimpleMockPage(): XhsPageLike {
  return {
    goto: async () => {},
    url: () => "https://www.xiaohongshu.com/user/profile/testuser123456789012345",
    title: async () => "Test Author - 小红书",
    evaluate: (async () => ({
      user: {
        userPageData: {
          basicInfo: {
            userid: "testuser123456789012345",
            nickname: "Test Author",
            redId: "9876543",
            ipLocation: "北京",
          },
          interactions: [
            { name: "关注", count: 50 },
            { name: "粉丝", count: 2000 },
          ],
        },
        notes: [
          [
            {
              noteId: "note00000000000000000001",
              displayTitle: "First Post",
              cover: { url: "https://img.example.com/1.jpg" },
              type: "normal",
              xsecToken: "super_secret_xsec_value",
              interactInfo: { likedCount: 100 },
            },
            {
              noteId: "note00000000000000000002",
              displayTitle: "Second Post",
              type: "video",
              interactInfo: { likedCount: 500 },
            },
            {
              noteId: "note00000000000000000003",
              displayTitle: "Third Post",
              type: "normal",
              interactInfo: { likedCount: 200 },
            },
          ],
        ],
      },
    })) as XhsPageLike["evaluate"],
    waitForResponse: (async () => {
      throw new Error("Timeout");
    }) as XhsPageLike["waitForResponse"],
    on: () => {},
    close: async () => {},
  };
}

describe("collectXhsProfile", () => {
  test("fails without a page injection", async () => {
    const result = await collectXhsProfile({
      profileUrl:
        "https://www.xiaohongshu.com/user/profile/testuser123456789012345",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("page must be provided");
    }
  });

  test("collects profile and notes from mock page", async () => {
    const result = await collectXhsProfile({
      profileUrl:
        "https://www.xiaohongshu.com/user/profile/testuser123456789012345",
      page: createSimpleMockPage(),
      enrichDetails: false,
      includeComments: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const { profile, notes, analysis } = result.data;
      expect(profile.nickname).toBe("Test Author");
      expect(profile.interactionCounts?.fans).toBe(2000);

      expect(notes).toHaveLength(3);
      // xsecToken should NOT appear in the public notes
      for (const note of notes) {
        expect((note as any).xsecToken).toBeUndefined();
      }

      expect(analysis.totalNotes).toBe(3);
      expect(analysis.highestLikedNote?.noteId).toBe(
        "note00000000000000000002",
      );
      expect(analysis.highestLikedNote?.count).toBe(500);
    }
  });

  test("redacts sensitive values in output", async () => {
    const result = await collectXhsProfile({
      profileUrl:
        "https://www.xiaohongshu.com/user/profile/testuser123456789012345",
      page: createSimpleMockPage(),
      enrichDetails: false,
    });

    const resultStr = JSON.stringify(result);
    // Should not contain the xsecToken value
    expect(resultStr).not.toContain("super_secret_xsec_value");
    expect(resultStr).not.toContain("xsecToken");
    expect(containsSensitiveValue(resultStr)).toBe(false);
  });

  test("collects visible detail enrichment without cookie", async () => {
    const result = await collectXhsProfile({
      profileUrl:
        "https://www.xiaohongshu.com/user/profile/testuser123456789012345",
      page: createSimpleMockPage(),
      enrichDetails: true, // requested but no cookie
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.noteDetails.length).toBeGreaterThan(0);
    }
  });

  test("uses visible page enrichment, not direct XHS API, even when cookie and extended options are provided", async () => {
    const fetchCalls: string[] = [];
    const mockFetch = async (
      input: string | URL | Request,
    ): Promise<Response> => {
      fetchCalls.push(typeof input === "string" ? input : input.toString());
      return new Response("{}", { status: 200 });
    };

    const result = await collectXhsProfile({
      profileUrl:
        "https://www.xiaohongshu.com/user/profile/testuser123456789012345",
      page: createSimpleMockPage(),
      cookie: "a1=secret",
      fetchImpl: mockFetch as unknown as typeof fetch,
      enrichDetails: true,
      includeComments: true,
      maxCommentPagesPerNote: 3,
    });

    expect(result.ok).toBe(true);
    expect(fetchCalls).toEqual([]);
    if (result.ok) {
      expect(result.data.noteDetails.length).toBeGreaterThan(0);
      expect(result.data.commentsByNote).toEqual({});
    }
  });

  test("collects visible note details and first-screen comments from anonymous note pages", async () => {
    let currentUrl = "";
    const page: XhsPageLike = {
      goto: async (url) => {
        currentUrl = url;
      },
      url: () => currentUrl,
      title: async () => "公开笔记 - 小红书",
      evaluate: (async () => {
        if (currentUrl.includes("/explore/note00000000000000000001")) {
          return {
            note: {
              currentNote: {
                noteId: "note00000000000000000001",
                title: "First Post",
                desc: "公开正文",
                type: "normal",
                user: {
                  userId: "testuser123456789012345",
                  nickname: "Test Author",
                },
                interactInfo: {
                  likedCount: 100,
                  collectedCount: 12,
                  commentCount: 2,
                  shareCount: 3,
                },
              },
            },
            comments: {
              list: [
                {
                  id: "comment-1",
                  content: "公开首屏评论",
                  likeCount: 7,
                  user: { userId: "commenter-1", nickname: "评论用户" },
                },
              ],
            },
          };
        }
        return {
          user: {
            userPageData: {
              basicInfo: {
                userid: "testuser123456789012345",
                nickname: "Test Author",
              },
              interactions: [],
            },
            notes: [
              [
                {
                  noteId: "note00000000000000000001",
                  displayTitle: "First Post",
                  type: "normal",
                  interactInfo: { likedCount: 100 },
                },
              ],
            ],
          },
        };
      }) as XhsPageLike["evaluate"],
      waitForResponse: (async () => {
        throw new Error("Timeout");
      }) as XhsPageLike["waitForResponse"],
      on: () => {},
      close: async () => {},
    };

    const result = await collectXhsProfile({
      profileUrl:
        "https://www.xiaohongshu.com/user/profile/testuser123456789012345",
      page,
      enrichDetails: true,
      includeComments: true,
      maxCommentPagesPerNote: 1,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.noteDetails).toHaveLength(1);
      expect(result.data.noteDetails[0].desc).toBe("公开正文");
      expect(result.data.noteDetails[0].metrics.commentCount).toBe(2);
      expect(result.data.commentsByNote.note00000000000000000001).toHaveLength(1);
      expect(result.data.commentsByNote.note00000000000000000001[0].content).toBe(
        "公开首屏评论",
      );
      expect(result.data.analysis.topLikedComments[0].content).toBe("公开首屏评论");
    }
  });

  test("returns failure with diagnostic when both profile and notes are empty", async () => {
    const emptyMockPage: XhsPageLike = {
      goto: async () => {},
      url: () => "https://www.xiaohongshu.com/user/profile/empty00000000000000000",
      title: async () => "登录 - 小红书",
      evaluate: (async (fn: any) => {
        // For __INITIAL_STATE__ call (checks window.__INITIAL_STATE__) return null
        // For login hint call (checks document.body) return login state
        if (typeof fn === "function") {
          const src = fn.toString();
          if (src.includes("__INITIAL_STATE__")) return null;
          // Login check function
          return { hasLoginText: true, hasLoginModal: true, bodyLength: 100 };
        }
        return null;
      }) as unknown as XhsPageLike["evaluate"],
      waitForResponse: (async () => {
        throw new Error("Timeout");
      }) as XhsPageLike["waitForResponse"],
      on: () => {},
      close: async () => {},
    };

    const result = await collectXhsProfile({
      profileUrl:
        "https://www.xiaohongshu.com/user/profile/empty00000000000000000",
      page: emptyMockPage,
      enrichDetails: false,
      includeComments: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Should be login_required or empty_profile_state, not silent success
      expect(["login_required", "empty_profile_state"]).toContain(result.code);
      expect(result.message).toBeTruthy();
      expect(result.message.length).toBeGreaterThan(10);
    }
  });

  test("returns success with diagnostic when profile exists but notes are empty", async () => {
    const profileOnlyMockPage: XhsPageLike = {
      goto: async () => {},
      url: () => "https://www.xiaohongshu.com/user/profile/testuser123456789012345",
      title: async () => "Test Author - 小红书",
      evaluate: (async () => ({
        user: {
          userPageData: {
            basicInfo: {
              userid: "testuser123456789012345",
              nickname: "Test Author",
            },
            interactions: [],
          },
          notes: [],
        },
      })) as XhsPageLike["evaluate"],
      waitForResponse: (async () => {
        throw new Error("Timeout");
      }) as XhsPageLike["waitForResponse"],
      on: () => {},
      close: async () => {},
    };

    const result = await collectXhsProfile({
      profileUrl:
        "https://www.xiaohongshu.com/user/profile/testuser123456789012345",
      page: profileOnlyMockPage,
      enrichDetails: false,
      includeComments: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.profile.nickname).toBe("Test Author");
      expect(result.data.notes).toHaveLength(0);
      expect(result.data.diagnostic).toBeDefined();
      expect(result.data.diagnostic!.code).toBe("empty_profile_state");
      expect(result.data.diagnostic!.message).toBeTruthy();
    }
  });

  test("uses external-index public note URLs when anonymous profile has no notes", async () => {
    let currentUrl = "";
    const gotoUrls: string[] = [];
    const indexedNoteId = "aaaaaaaaaaaaaaaaaaaaaaaa";
    const page: XhsPageLike = {
      goto: async (url) => {
        currentUrl = url;
        gotoUrls.push(url);
      },
      url: () => currentUrl || "https://www.xiaohongshu.com/user/profile/testuser123456789012345",
      title: async () =>
        currentUrl.includes(`/explore/${indexedNoteId}`)
          ? "Indexed Public Note - 小红书"
          : "Test Author - 小红书",
      evaluate: (async () => {
        if (currentUrl.includes(`/explore/${indexedNoteId}`)) {
          return {
            note: {
              currentNote: {
                noteId: indexedNoteId,
                title: "Indexed Public Note",
                desc: "外部索引发现的公开正文",
                type: "normal",
                user: {
                  userId: "testuser123456789012345",
                  nickname: "Test Author",
                },
                interactInfo: {
                  likedCount: 321,
                  collectedCount: 22,
                  commentCount: 1,
                  shareCount: 4,
                },
              },
            },
            comments: {
              list: [
                {
                  id: "indexed-comment-1",
                  content: "公开索引笔记首屏评论",
                  likeCount: 9,
                  user: { userId: "commenter-1", nickname: "评论用户" },
                },
              ],
            },
          };
        }
        return {
          user: {
            userPageData: {
              basicInfo: {
                userid: "testuser123456789012345",
                nickname: "Test Author",
                redId: "9876543",
              },
              interactions: [],
            },
            notes: [],
          },
        };
      }) as XhsPageLike["evaluate"],
      waitForResponse: (async () => {
        throw new Error("Timeout");
      }) as XhsPageLike["waitForResponse"],
      on: () => {},
      close: async () => {},
    };

    const result = await collectXhsProfile({
      profileUrl:
        "https://www.xiaohongshu.com/user/profile/testuser123456789012345",
      page,
      enrichDetails: true,
      includeComments: true,
      maxCommentPagesPerNote: 3,
      indexedNoteUrls: [
        `https://www.xiaohongshu.com/explore/${indexedNoteId}?xsec_token=public-token-for-navigation&xsec_source=pc_feed`,
        `https://www.xiaohongshu.com/explore/${indexedNoteId}`,
        "https://www.xiaohongshu.com/search_result?keyword=test",
        "https://www.xiaohongshu.com/explore/bbbbbbbbbbbbbbbbbbbbbbbb",
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.profile.nickname).toBe("Test Author");
      expect(result.data.indexedDiscovery).toEqual({
        source: "external_index",
        requestedNoteUrls: [
          `https://www.xiaohongshu.com/explore/${indexedNoteId}?xsec_token=[REDACTED]&xsec_source=pc_feed`,
          `https://www.xiaohongshu.com/explore/${indexedNoteId}`,
          "https://www.xiaohongshu.com/search_result?keyword=test",
          "https://www.xiaohongshu.com/explore/bbbbbbbbbbbbbbbbbbbbbbbb",
        ],
        acceptedNoteUrls: [
          `https://www.xiaohongshu.com/explore/${indexedNoteId}`,
          "https://www.xiaohongshu.com/explore/bbbbbbbbbbbbbbbbbbbbbbbb",
        ],
        verifiedNoteUrls: [
          `https://www.xiaohongshu.com/explore/${indexedNoteId}`,
        ],
      });
      expect(result.data.notes.map((note) => note.noteId)).toContain(indexedNoteId);
      expect(result.data.notes.map((note) => note.noteId)).not.toContain(
        "bbbbbbbbbbbbbbbbbbbbbbbb",
      );
      expect(result.data.notes.find((note) => note.noteId === indexedNoteId)?.title).toBe(
        "Indexed Public Note",
      );
      expect(result.data.noteDetails[0].desc).toBe("外部索引发现的公开正文");
      expect(result.data.commentsByNote[indexedNoteId][0].content).toBe(
        "公开索引笔记首屏评论",
      );
      expect(result.data.analysis.highestLikedNote?.noteId).toBe(indexedNoteId);
      expect(gotoUrls).toContain(
        `https://www.xiaohongshu.com/explore/${indexedNoteId}?xsec_token=public-token-for-navigation&xsec_source=pc_feed`,
      );
      expect(JSON.stringify(result.data)).not.toContain("public-token-for-navigation");
      expect(JSON.stringify(result.data)).not.toContain("xsecToken");
      expect(JSON.stringify(result.data)).not.toContain("xsecSource");
    }
  });

  test("detects login redirect and returns login_required", async () => {
    const loginRedirectMockPage: XhsPageLike = {
      goto: async () => {},
      url: () => "https://passport.xiaohongshu.com/login",
      title: async () => "登录 - 小红书",
      evaluate: (async (fn: any) => {
        if (typeof fn === "function") {
          try { return fn(); } catch { return null; }
        }
        return null;
      }) as unknown as XhsPageLike["evaluate"],
      waitForResponse: (async () => {
        throw new Error("Timeout");
      }) as XhsPageLike["waitForResponse"],
      on: () => {},
      close: async () => {},
    };

    const result = await collectXhsProfile({
      profileUrl:
        "https://www.xiaohongshu.com/user/profile/login000000000000000000",
      page: loginRedirectMockPage,
      enrichDetails: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("login_required");
      expect(result.diagnostic?.redirectedToLogin).toBe(true);
    }
  });
});
