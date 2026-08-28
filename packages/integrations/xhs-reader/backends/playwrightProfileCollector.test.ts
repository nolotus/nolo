import { describe, expect, test } from "bun:test";
import {
  collectProfilePage,
  collectVisibleNoteDetails,
} from "./playwrightProfileCollector";
import type { XhsPageLike } from "./playwrightProfileCollector";

/**
 * Helper to create a minimal mock page with url() and title() for diagnostics.
 */
function makeBasePage(overrides: Partial<XhsPageLike> = {}): XhsPageLike {
  return {
    goto: async () => {},
    url: () => "https://www.xiaohongshu.com/user/profile/mock",
    title: async () => "mock",
    evaluate: (async () => null) as XhsPageLike["evaluate"],
    waitForResponse: (async () => {
      throw new Error("Timeout");
    }) as XhsPageLike["waitForResponse"],
    on: () => {},
    close: async () => {},
    ...overrides,
  };
}

describe("collectProfilePage", () => {
  test("collects profile and notes from __INITIAL_STATE__", async () => {
    const mockPage = makeBasePage({
      evaluate: (async () => ({
        userPageData: {
          basicInfo: {
            nickname: "测试用户",
            userid: "5d2be8720000000010007556",
            redId: "1234567",
            ipLocation: "上海",
          },
          interactions: [
            { name: "关注", count: 100 },
            { name: "粉丝", count: 5000 },
          ],
          notes: [
            {
              noteId: "note001",
              displayTitle: "First Note",
              cover: { url: "https://img.example.com/1.jpg" },
              type: "normal",
              likedCount: 42,
              xsecToken: "secret_token_value",
            },
            {
              noteId: "note002",
              displayTitle: "Second Note",
              type: "video",
              likedCount: 100,
            },
          ],
        },
      })) as XhsPageLike["evaluate"],
    });

    const result = await collectProfilePage(
      mockPage,
      "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      1,
    );

    expect(result.profile.userId).toBe("5d2be8720000000010007556");
    expect(result.profile.nickname).toBe("测试用户");
    expect(result.profile.interactionCounts?.follows).toBe(100);
    expect(result.profile.interactionCounts?.fans).toBe(5000);

    expect(result.notes).toHaveLength(2);
    expect(result.notes[0].noteId).toBe("note001");
    expect(result.notes[0].title).toBe("First Note");
    expect(result.notes[0].likedCount).toBe(42);
    expect(result.notes[0].xsecToken).toBe("secret_token_value");
    expect(result.notes[1].noteId).toBe("note002");
    // No diagnostic when notes are present
    expect(result.diagnostic).toBeUndefined();
  });

  test("collects paginated notes from user_posted responses", async () => {
    let responseIdx = 0;
    const pages = [
      {
        data: {
          notes: [
            { noteId: "page1_note1", displayTitle: "P1N1" },
            { noteId: "page1_note2", displayTitle: "P1N2" },
          ],
        },
      },
      {
        data: {
          notes: [
            { noteId: "page2_note1", displayTitle: "P2N1" },
          ],
        },
      },
    ];

    const mockPage = makeBasePage({
      evaluate: (async () => ({
        userPageData: {
          basicInfo: { userid: "user123", nickname: "Test" },
          notes: [
            { noteId: "initial1", displayTitle: "Init1" },
          ],
        },
      })) as XhsPageLike["evaluate"],
      waitForResponse: (async () => {
        if (responseIdx < pages.length) {
          const body = pages[responseIdx];
          responseIdx++;
          return { json: async () => body };
        }
        throw new Error("Timeout");
      }) as XhsPageLike["waitForResponse"],
    });

    const result = await collectProfilePage(
      mockPage,
      "https://www.xiaohongshu.com/user/profile/user123",
      3,
    );

    expect(result.notes).toHaveLength(4);
    expect(result.notes.map((n) => n.noteId).sort()).toEqual([
      "initial1",
      "page1_note1",
      "page1_note2",
      "page2_note1",
    ].sort());
  });

  test("deduplicates notes across pages", async () => {
    let responseIdx = 0;
    const pages = [
      {
        data: {
          notes: [
            { noteId: "note1", displayTitle: "N1" },
            { noteId: "note2", displayTitle: "N2" },
          ],
        },
      },
      {
        data: {
          notes: [
            { noteId: "note2", displayTitle: "N2 dup" },
            { noteId: "note3", displayTitle: "N3" },
          ],
        },
      },
    ];

    const mockPage = makeBasePage({
      evaluate: (async () => ({
        userPageData: {
          basicInfo: { userid: "user1", nickname: "" },
          notes: [],
        },
      })) as XhsPageLike["evaluate"],
      waitForResponse: (async () => {
        if (responseIdx < pages.length) {
          return { json: async () => pages[responseIdx++] };
        }
        throw new Error("Timeout");
      }) as XhsPageLike["waitForResponse"],
    });

    const result = await collectProfilePage(
      mockPage,
      "https://www.xiaohongshu.com/user/profile/user1",
      3,
    );

    expect(result.notes).toHaveLength(3);
    expect(result.notes.map((n) => n.noteId).sort()).toEqual([
      "note1",
      "note2",
      "note3",
    ]);
  });

  test("handles empty __INITIAL_STATE__ with diagnostic", async () => {
    const mockPage = makeBasePage({
      url: () => "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      title: async () => "用户主页 - 小红书",
      evaluate: (async (fn: any) => {
        // The collector calls page.evaluate twice:
        // 1. For __INITIAL_STATE__ -> return null
        // 2. For login check -> return { hasLoginText: false, ... }
        // We use a closure to distinguish
        return null;
      }) as XhsPageLike["evaluate"],
    });

    const result = await collectProfilePage(
      mockPage,
      "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      1,
    );

    expect(result.profile.userId).toBe("5d2be8720000000010007556");
    expect(result.profile.nickname).toBe("");
    expect(result.notes).toHaveLength(0);
    // Should have a diagnostic
    expect(result.diagnostic).toBeDefined();
    expect(result.diagnostic!.code).toBe("empty_profile_state");
  });

  test("includes page visibility probe in empty diagnostics", async () => {
    const mockPage = makeBasePage({
      evaluate: (async (fn: any) => {
        const source = String(fn);
        if (source.includes("visibleNoteLinkCount")) {
          return {
            bodyTextLength: 128,
            visibleCloseCandidateCount: 1,
            visibleNoteLinkCount: 2,
          };
        }
        return null;
      }) as XhsPageLike["evaluate"],
    });

    const result = await collectProfilePage(
      mockPage,
      "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      0,
    );

    expect(result.diagnostic?.bodyTextLength).toBe(128);
    expect(result.diagnostic?.visibleCloseCandidateCount).toBe(1);
    expect(result.diagnostic?.visibleNoteLinkCount).toBe(2);
  });

  test("parses real XHS INITIAL_STATE shape: state.user.userPageData + state.user.notes[0]", async () => {
    const mockPage = makeBasePage({
      url: () => "https://www.xiaohongshu.com/user/profile/5d33c1460000000010009484",
      evaluate: (async () => ({
        user: {
          userPageData: {
            basicInfo: {
              nickname: "真实用户",
              userid: "5d33c1460000000010009484",
              redId: "9876543210",
              imageb: "https://sns-avatar-qc.xhscdn.com/avatar/real.jpg",
              desc: "A real user bio",
              ipLocation: "广东",
              gender: "1",
            },
            interactions: [
              { name: "关注", count: 320 },
              { name: "粉丝", countText: "2.3万" },
              { name: "赞藏", countText: "15.8万" },
            ],
          },
          notes: [
            [
              {
                noteId: "real_note_001",
                displayTitle: "Real First Note",
                cover: { urlDefault: "https://sns-img-bd.xhscdn.com/real1.jpg" },
                type: "normal",
                xsecToken: "xsec_real_token_1",
                interactInfo: { likedCount: 1234 },
              },
              {
                noteId: "real_note_002",
                displayTitle: "Real Video Note",
                cover: { urlDefault: "https://sns-img-bd.xhscdn.com/real2.jpg" },
                type: "video",
                xsecToken: "xsec_real_token_2",
                interactInfo: { likedCount: 5678 },
              },
            ],
          ],
          noteQueries: [{ cursor: "", hasMore: true, userId: "5d33c1460000000010009484", page: 0 }],
        },
      })) as XhsPageLike["evaluate"],
    });

    const result = await collectProfilePage(
      mockPage,
      "https://www.xiaohongshu.com/user/profile/5d33c1460000000010009484",
      1,
    );

    expect(result.profile.userId).toBe("5d33c1460000000010009484");
    expect(result.profile.nickname).toBe("真实用户");
    expect(result.profile.redId).toBe("9876543210");
    expect(result.profile.interactionCounts?.follows).toBe(320);
    expect(result.profile.interactionCounts?.fans).toBe(23000);
    expect(result.profile.interactionCounts?.likesAndCollects).toBe(158000);

    expect(result.notes).toHaveLength(2);
    expect(result.notes[0].noteId).toBe("real_note_001");
    expect(result.notes[0].title).toBe("Real First Note");
    expect(result.notes[0].likedCount).toBe(1234);
    expect(result.notes[0].xsecToken).toBe("xsec_real_token_1");
    expect(result.notes[0].coverUrl).toBe("https://sns-img-bd.xhscdn.com/real1.jpg");
    expect(result.notes[1].noteId).toBe("real_note_002");
    expect(result.notes[1].type).toBe("video");
    expect(result.notes[1].likedCount).toBe(5678);
    expect(result.notes[1].xsecToken).toBe("xsec_real_token_2");
  });

  test("keeps anonymous-visible profile cards even when XHS hides noteId", async () => {
    const mockPage = makeBasePage({
      url: () => "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      title: async () => "22 soul - 小红书",
      evaluate: (async () => ({
        user: {
          userPageData: {
            basicInfo: {
              nickname: "22 soul",
              userid: "5d2be8720000000010007556",
              redId: "927732348",
              ipLocation: "四川",
            },
            interactions: [],
          },
          notes: [
            [
              {
                id: "",
                index: 0,
                noteCard: {
                  noteId: "",
                  displayTitle: "谁家小狗走丢了",
                  type: "normal",
                  cover: {
                    urlDefault: "http://sns-webpic-qc.xhscdn.com/cover-1!nc_n_webp_mw_1",
                    infoList: [
                      {
                        imageScene: "WB_DFT",
                        url: "http://sns-webpic-qc.xhscdn.com/cover-1-info!nc_n_webp_mw_1",
                      },
                    ],
                  },
                  user: {
                    userId: "5d2be8720000000010007556",
                    nickname: "22 soul",
                  },
                  interactInfo: { likedCount: "11" },
                  xsecToken: "public-visible-token",
                },
                xsecToken: "public-visible-token",
              },
              {
                id: "",
                index: 1,
                noteCard: {
                  noteId: "",
                  displayTitle: "俺终于要去上班咯",
                  type: "normal",
                  cover: {
                    urlPre: "http://sns-webpic-qc.xhscdn.com/cover-2!nc_n_webp_prv_1",
                  },
                  interactInfo: { likedCount: "3" },
                  xsecToken: "public-visible-token",
                },
              },
            ],
          ],
        },
      })) as XhsPageLike["evaluate"],
    });

    const result = await collectProfilePage(
      mockPage,
      "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      0,
    );

    expect(result.profile.nickname).toBe("22 soul");
    expect(result.notes).toHaveLength(2);
    expect(result.notes[0]).toMatchObject({
      noteId: "visible-profile-card-0",
      title: "谁家小狗走丢了",
      coverUrl: "http://sns-webpic-qc.xhscdn.com/cover-1!nc_n_webp_mw_1",
      likedCount: 11,
      xsecToken: "public-visible-token",
    });
    expect(result.notes[1]).toMatchObject({
      noteId: "visible-profile-card-1",
      title: "俺终于要去上班咯",
      coverUrl: "http://sns-webpic-qc.xhscdn.com/cover-2!nc_n_webp_prv_1",
      likedCount: 3,
    });
    expect(result.diagnostic).toBeUndefined();
  });

  test("reads visible profile interaction counts from anonymous DOM text", async () => {
    const mockPage = makeBasePage({
      url: () => "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      title: async () => "22 soul - 小红书",
      evaluate: (async (fn: any) => {
        const src = typeof fn === "function" ? fn.toString() : "";
        if (src.includes("xhs-visible-profile-counts-v1") || src.includes("parseVisibleCount")) {
          return {
            follows: 10,
            fans: 10,
            likesAndCollects: 10,
          };
        }
        return {
          user: {
            userPageData: {
              basicInfo: {
                nickname: "22 soul",
                userid: "5d2be8720000000010007556",
              },
              interactions: [],
            },
            notes: [
              [
                {
                  index: 0,
                  noteCard: {
                    displayTitle: "公开卡片",
                    interactInfo: { likedCount: "5" },
                  },
                },
              ],
            ],
          },
        };
      }) as XhsPageLike["evaluate"],
    });

    const result = await collectProfilePage(
      mockPage,
      "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      0,
    );

    expect(result.profile.interactionCounts).toEqual({
      follows: 10,
      fans: 10,
      likesAndCollects: 10,
    });
  });

  test("normalizes snake_case paginated user_posted response", async () => {
    const paginatedResponse = {
      data: {
        notes: [
          {
            note_id: "snake_note_001",
            display_title: "Snake Case Title",
            cover: { url_default: "https://sns-img-bd.xhscdn.com/snake1.jpg" },
            type: "normal",
            xsec_token: "xsec_snake_page_token",
            interact_info: { liked_count: 4321 },
          },
          {
            note_id: "snake_note_002",
            display_title: "Another Snake Note",
            cover: { url_pre: "https://sns-img-bd.xhscdn.com/snake2_pre.jpg" },
            type: "video",
            xsec_token: "xsec_snake_page_token_2",
            interact_info: { liked_count: 8765 },
          },
        ],
      },
    };

    let responseIdx = 0;
    const mockPage = makeBasePage({
      evaluate: (async () => ({
        user: {
          userPageData: {
            basicInfo: { userid: "user_snake", nickname: "Snake User" },
          },
          notes: [[]],
        },
      })) as XhsPageLike["evaluate"],
      waitForResponse: (async () => {
        if (responseIdx === 0) {
          responseIdx++;
          return { json: async () => paginatedResponse };
        }
        throw new Error("Timeout");
      }) as XhsPageLike["waitForResponse"],
    });

    const result = await collectProfilePage(
      mockPage,
      "https://www.xiaohongshu.com/user/profile/user_snake",
      2,
    );

    expect(result.notes).toHaveLength(2);
    expect(result.notes[0].noteId).toBe("snake_note_001");
    expect(result.notes[0].title).toBe("Snake Case Title");
    expect(result.notes[0].likedCount).toBe(4321);
    expect(result.notes[0].xsecToken).toBe("xsec_snake_page_token");
    expect(result.notes[0].coverUrl).toBe("https://sns-img-bd.xhscdn.com/snake1.jpg");
    expect(result.notes[1].noteId).toBe("snake_note_002");
    expect(result.notes[1].likedCount).toBe(8765);
    expect(result.notes[1].xsecToken).toBe("xsec_snake_page_token_2");
    expect(result.notes[1].coverUrl).toBe("https://sns-img-bd.xhscdn.com/snake2_pre.jpg");
  });

  test("detects login redirect URL", async () => {
    const mockPage = makeBasePage({
      url: () => "https://passport.xiaohongshu.com/login?next=/user/profile/test",
      title: async () => "登录 - 小红书",
      evaluate: (async (fn: any) => {
        if (typeof fn === "function") {
          try { return fn(); } catch { return null; }
        }
        return null;
      }) as unknown as XhsPageLike["evaluate"],
    });

    const result = await collectProfilePage(
      mockPage,
      "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      1,
    );

    expect(result.notes).toHaveLength(0);
    expect(result.diagnostic).toBeDefined();
    expect(result.diagnostic!.code).toBe("login_required");
  });

  test("does not abort on login-looking chrome when visible initial state is present", async () => {
    const mockPage = makeBasePage({
      url: () => "https://www.xiaohongshu.com/login?redirectPath=/user/profile/5d2be8720000000010007556",
      title: async () => "登录 - 小红书",
      evaluate: (async (fn: any) => {
        const source = String(fn);
        if (source.includes("xhs-login-dismiss-v1")) return false;
        if (source.includes("window.__INITIAL_STATE__")) {
          return {
            user: {
              userPageData: {
                basicInfo: {
                  nickname: "仍然可见的用户",
                  userid: "5d2be8720000000010007556",
                },
              },
              notes: [[
                {
                  noteId: "visible001",
                  displayTitle: "登录提示后面的人能看到内容",
                  likedCount: 7,
                },
              ]],
            },
          };
        }
        return { hasLoginText: true, hasLoginModal: true };
      }) as XhsPageLike["evaluate"],
    });

    const result = await collectProfilePage(
      mockPage,
      "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      0,
    );

    expect(result.profile.nickname).toBe("仍然可见的用户");
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].title).toBe("登录提示后面的人能看到内容");
    expect(result.diagnostic).toBeUndefined();
  });

  test("dismisses visible login prompt before reading anonymous page state", async () => {
    let dismissed = false;
    let evaluateCount = 0;
    const visibleState = {
      userPageData: {
        basicInfo: {
          nickname: "弹窗后可见",
          userid: "5d2be8720000000010007556",
          redId: "927732348",
        },
        notes: [
          {
            noteId: "note_after_close",
            displayTitle: "关闭弹窗后看到的笔记",
            likedCount: 12,
          },
        ],
      },
    };
    const mockPage = makeBasePage({
      title: async () => "小红书",
      evaluate: (async () => {
        evaluateCount += 1;
        if (evaluateCount === 1) {
          dismissed = true;
          return true;
        }
        if (!dismissed) return null;
        return visibleState;
      }) as XhsPageLike["evaluate"],
    });

    const result = await collectProfilePage(
      mockPage,
      "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      0,
    );

    expect(result.profile.nickname).toBe("弹窗后可见");
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].noteId).toBe("note_after_close");
    expect(result.diagnostic).toBeUndefined();
  });

  test("dismisses textless top-right SVG login close icon learned from human diff", async () => {
    let dismissed = false;
    let evaluateCount = 0;
    const visibleState = {
      userPageData: {
        basicInfo: {
          nickname: "点 SVG 叉后可见",
          userid: "5d2be8720000000010007556",
        },
        notes: [
          {
            noteId: "note_after_svg_close",
            displayTitle: "无文本 SVG 关闭后看到的笔记",
            likedCount: 21,
          },
        ],
      },
    };
    const mockPage = makeBasePage({
      title: async () => "小红书",
      evaluate: (async (fn: any) => {
        evaluateCount += 1;
        const source = String(fn);
        if (
          evaluateCount === 1 &&
          source.includes("pageLooksLikeLogin") &&
          source.includes("textlessTopRightLoginIcon")
        ) {
          dismissed = true;
          return true;
        }
        if (source.includes("visibleNoteLinkCount")) {
          return {
            bodyTextLength: 1200,
            visibleCloseCandidateCount: dismissed ? 0 : 1,
            visibleNoteLinkCount: dismissed ? 3 : 0,
          };
        }
        return dismissed ? visibleState : null;
      }) as XhsPageLike["evaluate"],
    });

    const result = await collectProfilePage(
      mockPage,
      "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      0,
    );

    expect(result.profile.nickname).toBe("点 SVG 叉后可见");
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].noteId).toBe("note_after_svg_close");
    expect(result.diagnostic).toBeUndefined();
  });

  test("detects captcha/verification title", async () => {
    const mockPage = makeBasePage({
      url: () => "https://www.xiaohongshu.com/user/profile/test",
      title: async () => "安全验证 - 小红书",
      evaluate: (async (fn: any) => {
        if (typeof fn === "function") {
          try { return fn(); } catch { return null; }
        }
        return null;
      }) as unknown as XhsPageLike["evaluate"],
    });

    const result = await collectProfilePage(
      mockPage,
      "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      1,
    );

    expect(result.notes).toHaveLength(0);
    expect(result.diagnostic).toBeDefined();
    expect(result.diagnostic!.code).toBe("blocked");
  });

  test("classifies website-login security restriction as blocked, not login required", async () => {
    const mockPage = makeBasePage({
      url: () => "https://www.xiaohongshu.com/website-login/error?error_code=300012",
      title: async () => "安全限制",
      evaluate: (async (fn: any) => {
        if (typeof fn === "function") {
          try { return fn(); } catch { return null; }
        }
        return null;
      }) as unknown as XhsPageLike["evaluate"],
    });

    const result = await collectProfilePage(
      mockPage,
      "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      1,
    );

    expect(result.notes).toHaveLength(0);
    expect(result.diagnostic).toBeDefined();
    expect(result.diagnostic!.code).toBe("blocked");
  });

  test("unwraps note_card (snake_case) in user_posted items", async () => {
    const paginatedResponse = {
      data: {
        items: [
          {
            note_card: {
              note_id: "nc_note_001",
              display_title: "Snake NoteCard Title",
              interact_info: { liked_count: 5555 },
              xsec_token: "xsec_nc_token_1",
              cover: { url_default: "https://sns-img-bd.xhscdn.com/nc1.jpg" },
            },
          },
          {
            note_card: {
              note_id: "nc_note_002",
              display_title: "Another NoteCard",
              interact_info: { liked_count: 888 },
              xsec_token: "xsec_nc_token_2",
              cover: { url_pre: "https://sns-img-bd.xhscdn.com/nc2_pre.jpg" },
            },
          },
        ],
      },
    };

    let responseIdx = 0;
    const mockPage = makeBasePage({
      evaluate: (async () => ({
        user: {
          userPageData: {
            basicInfo: { userid: "user_nc", nickname: "NC User" },
          },
          notes: [[]],
        },
      })) as XhsPageLike["evaluate"],
      waitForResponse: (async () => {
        if (responseIdx === 0) {
          responseIdx++;
          return { json: async () => paginatedResponse };
        }
        throw new Error("Timeout");
      }) as XhsPageLike["waitForResponse"],
    });

    const result = await collectProfilePage(
      mockPage,
      "https://www.xiaohongshu.com/user/profile/user_nc",
      2,
    );

    expect(result.notes).toHaveLength(2);
    expect(result.notes[0].noteId).toBe("nc_note_001");
    expect(result.notes[0].title).toBe("Snake NoteCard Title");
    expect(result.notes[0].likedCount).toBe(5555);
    expect(result.notes[0].xsecToken).toBe("xsec_nc_token_1");
    expect(result.notes[0].coverUrl).toBe("https://sns-img-bd.xhscdn.com/nc1.jpg");
    expect(result.notes[1].noteId).toBe("nc_note_002");
    expect(result.notes[1].likedCount).toBe(888);
    expect(result.notes[1].xsecToken).toBe("xsec_nc_token_2");
    expect(result.notes[1].coverUrl).toBe("https://sns-img-bd.xhscdn.com/nc2_pre.jpg");
  });

  test("unwraps noteCard (camelCase) in user_posted items", async () => {
    const paginatedResponse = {
      data: {
        items: [
          {
            noteCard: {
              noteId: "cc_note_001",
              displayTitle: "Camel NoteCard Title",
              interactInfo: { likedCount: 7777 },
              xsecToken: "xsec_cc_token_1",
              cover: { urlDefault: "https://sns-img-bd.xhscdn.com/cc1.jpg" },
            },
          },
          {
            noteCard: {
              noteId: "cc_note_002",
              displayTitle: "Second Camel Card",
              interactInfo: { likedCount: 321 },
              xsecToken: "xsec_cc_token_2",
              cover: { url: "https://sns-img-bd.xhscdn.com/cc2.jpg" },
            },
          },
        ],
      },
    };

    let responseIdx = 0;
    const mockPage = makeBasePage({
      evaluate: (async () => ({
        user: {
          userPageData: {
            basicInfo: { userid: "user_cc", nickname: "CC User" },
          },
          notes: [[]],
        },
      })) as XhsPageLike["evaluate"],
      waitForResponse: (async () => {
        if (responseIdx === 0) {
          responseIdx++;
          return { json: async () => paginatedResponse };
        }
        throw new Error("Timeout");
      }) as XhsPageLike["waitForResponse"],
    });

    const result = await collectProfilePage(
      mockPage,
      "https://www.xiaohongshu.com/user/profile/user_cc",
      2,
    );

    expect(result.notes).toHaveLength(2);
    expect(result.notes[0].noteId).toBe("cc_note_001");
    expect(result.notes[0].title).toBe("Camel NoteCard Title");
    expect(result.notes[0].likedCount).toBe(7777);
    expect(result.notes[0].xsecToken).toBe("xsec_cc_token_1");
    expect(result.notes[0].coverUrl).toBe("https://sns-img-bd.xhscdn.com/cc1.jpg");
    expect(result.notes[1].noteId).toBe("cc_note_002");
    expect(result.notes[1].likedCount).toBe(321);
    expect(result.notes[1].xsecToken).toBe("xsec_cc_token_2");
    expect(result.notes[1].coverUrl).toBe("https://sns-img-bd.xhscdn.com/cc2.jpg");
  });

  test("unwraps doubly-nested note_card.note_card in user_posted items", async () => {
    const paginatedResponse = {
      data: {
        items: [
          {
            note_card: {
              note_card: {
                note_id: "double_note_001",
                display_title: "Double Nested Title",
                interact_info: { liked_count: 9999 },
                xsec_token: "xsec_double_token_1",
                cover: { url_default: "https://sns-img-bd.xhscdn.com/double1.jpg" },
              },
            },
          },
        ],
      },
    };

    let responseIdx = 0;
    const mockPage = makeBasePage({
      evaluate: (async () => ({
        user: {
          userPageData: {
            basicInfo: { userid: "user_double", nickname: "Double User" },
          },
          notes: [[]],
        },
      })) as XhsPageLike["evaluate"],
      waitForResponse: (async () => {
        if (responseIdx === 0) {
          responseIdx++;
          return { json: async () => paginatedResponse };
        }
        throw new Error("Timeout");
      }) as XhsPageLike["waitForResponse"],
    });

    const result = await collectProfilePage(
      mockPage,
      "https://www.xiaohongshu.com/user/profile/user_double",
      2,
    );

    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].noteId).toBe("double_note_001");
    expect(result.notes[0].title).toBe("Double Nested Title");
    expect(result.notes[0].likedCount).toBe(9999);
    expect(result.notes[0].xsecToken).toBe("xsec_double_token_1");
    expect(result.notes[0].coverUrl).toBe("https://sns-img-bd.xhscdn.com/double1.jpg");
  });

  test("unwraps current XHS Vue ref INITIAL_STATE shape", async () => {
    const mockPage = makeBasePage({
      evaluate: (async () => ({
        user: {
          userPageData: {
            _value: {
              basicInfo: {
                userid: "user_ref",
                nickname: "Ref User",
                redId: "927732348",
                ipLocation: "四川",
              },
              interactions: [
                { type: "follows", name: "关注", count: "777" },
                { type: "fans", name: "粉丝", count: "38" },
                { type: "interaction", name: "获赞与收藏", count: "62" },
              ],
            },
          },
          notes: {
            _value: [
              [
                {
                  id: "ref_note_001",
                  xsecToken: "xsec_ref_token_1",
                  noteCard: {
                    displayTitle: "Ref Note One",
                    interactInfo: { likedCount: 29 },
                    cover: { urlDefault: "https://sns-img-bd.xhscdn.com/ref1.jpg" },
                  },
                },
                {
                  id: "ref_note_002",
                  xsecToken: "xsec_ref_token_2",
                  noteCard: {
                    displayTitle: "Ref Note Two",
                    interactInfo: { likedCount: 3 },
                  },
                },
              ],
            ],
          },
        },
      })) as XhsPageLike["evaluate"],
    });

    const result = await collectProfilePage(
      mockPage,
      "https://www.xiaohongshu.com/user/profile/user_ref",
      1,
    );

    expect(result.profile.nickname).toBe("Ref User");
    expect(result.profile.redId).toBe("927732348");
    expect(result.profile.ipLocation).toBe("四川");
    expect(result.profile.interactionCounts?.fans).toBe(38);
    expect(result.notes).toHaveLength(2);
    expect(result.notes[0].noteId).toBe("ref_note_001");
    expect(result.notes[0].title).toBe("Ref Note One");
    expect(result.notes[0].likedCount).toBe(29);
    expect(result.notes[0].xsecToken).toBe("xsec_ref_token_1");
    expect(result.notes[0].coverUrl).toBe("https://sns-img-bd.xhscdn.com/ref1.jpg");
    expect(result.diagnostic).toBeUndefined();
  });

});

describe("collectVisibleNoteDetails", () => {
  test("reads a currently visible feed card before navigating away", async () => {
    const gotoUrls: string[] = [];
    const noteId = "cccccccccccccccccccccccc";
    let clickedFeedCard = false;
    const mockPage = makeBasePage({
      url: () => "https://www.xiaohongshu.com/explore",
      title: async () => "小红书 - 你的生活兴趣社区",
      goto: async (url) => {
        gotoUrls.push(url);
      },
      evaluate: (async (fn: any, arg?: any) => {
        const src = typeof fn === "function" ? fn.toString() : "";
        if (src.includes("target.dispatchEvent")) {
          expect(arg).toBe(noteId);
          clickedFeedCard = true;
          return true;
        }
        if (src.includes("cleanLines")) {
          expect(arg).toBe(noteId);
          return {
            title: "当前 feed 可见标题",
            nickname: "当前作者",
            userId: "bbbbbbbbbbbbbbbbbbbbbbbb",
            coverUrl: "https://sns-webpic-qc.xhscdn.com/cover-current.jpg",
            likedText: "4706",
          };
        }
        if (src.includes("window.__INITIAL_STATE__")) return null;
        return null;
      }) as XhsPageLike["evaluate"],
    });

    const result = await collectVisibleNoteDetails(
      mockPage,
      [{ noteId }],
      { includeComments: true, maxNotes: 1 },
    );

    expect(clickedFeedCard).toBe(true);
    expect(gotoUrls).toEqual([]);
    expect(result.noteDetails).toHaveLength(1);
    expect(result.noteDetails[0]).toMatchObject({
      noteId,
      title: "当前 feed 可见标题",
      userId: "bbbbbbbbbbbbbbbbbbbbbbbb",
      nickname: "当前作者",
      imageUrls: ["https://sns-webpic-qc.xhscdn.com/cover-current.jpg"],
      metrics: {
        likedCount: 4706,
        collectedCount: 0,
        commentCount: 0,
        shareCount: 0,
      },
    });
  });

  test("falls back to visible feed-card click when direct note URL redirects to login", async () => {
    const gotoUrls: string[] = [];
    let currentUrl = "";
    let clickedFeedCard = false;
    const noteId = "aaaaaaaaaaaaaaaaaaaaaaaa";
    const mockPage = makeBasePage({
      goto: async (url) => {
        gotoUrls.push(url);
        currentUrl = url.includes("/explore/") && !url.endsWith("/explore")
          ? "https://www.xiaohongshu.com/login?redirectPath=note"
          : url;
      },
      url: () => currentUrl,
      title: async () =>
        currentUrl.includes("/login")
          ? "小红书 - 你的生活兴趣社区"
          : "小红书 - 你的生活兴趣社区",
      evaluate: (async (fn: any, arg?: any) => {
        const src = typeof fn === "function" ? fn.toString() : "";
        if (src.includes("xhs-login-dismiss-v1")) return false;
        if (src.includes("target.dispatchEvent")) {
          expect(arg).toBe(noteId);
          if (currentUrl !== "https://www.xiaohongshu.com/explore") return false;
          clickedFeedCard = true;
          return true;
        }
        if (src.includes("cleanLines")) {
          expect(arg).toBe(noteId);
          return {
            title: "人眼可见卡片标题",
            nickname: "公开作者",
            userId: "dddddddddddddddddddddddd",
            coverUrl: "https://sns-webpic-qc.xhscdn.com/cover-fallback.jpg",
            likedText: "7.9万",
          };
        }
        if (src.includes("window.__INITIAL_STATE__")) return null;
        if (src.includes("window.scrollBy")) return undefined;
        return null;
      }) as XhsPageLike["evaluate"],
    });

    const result = await collectVisibleNoteDetails(
      mockPage,
      [
        {
          noteId,
          xsecToken: "public-token",
          xsecSource: "pc_feed",
        },
      ],
      { includeComments: true, maxNotes: 1 },
    );

    expect(gotoUrls).toContain(
      `https://www.xiaohongshu.com/explore/${noteId}?xsec_token=public-token&xsec_source=pc_feed`,
    );
    expect(gotoUrls).toContain("https://www.xiaohongshu.com/explore");
    expect(clickedFeedCard).toBe(true);
    expect(result.diagnostic).toBeUndefined();
    expect(result.noteDetails).toHaveLength(1);
    expect(result.noteDetails[0]).toMatchObject({
      noteId,
      title: "人眼可见卡片标题",
      userId: "dddddddddddddddddddddddd",
      nickname: "公开作者",
      imageUrls: ["https://sns-webpic-qc.xhscdn.com/cover-fallback.jpg"],
      metrics: {
        likedCount: 79000,
        collectedCount: 0,
        commentCount: 0,
        shareCount: 0,
      },
    });
  });
});
