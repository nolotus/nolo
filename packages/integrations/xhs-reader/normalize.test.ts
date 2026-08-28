import { describe, expect, test } from "bun:test";
import {
  normalizeProfileState,
  normalizeProfileNote,
  normalizeNoteDetail,
  normalizeComment,
  normalizeCommentPage,
} from "./normalize";

describe("normalizeProfileState", () => {
  test("normalizes camelCase __INITIAL_STATE__ profile", () => {
    const raw = {
      userPageData: {
        basicInfo: {
          nickname: "测试用户",
          userid: "5d2be8720000000010007556",
          redId: "12345678",
          imageb: "https://img.example.com/avatar.jpg",
          desc: "这是描述",
          ipLocation: "上海",
          gender: "1",
        },
        interactions: [
          { name: "关注", count: 100 },
          { name: "粉丝", countText: "1.2万" },
          { name: "赞藏", countText: "3.4万" },
        ],
      },
    };

    const result = normalizeProfileState(raw, "5d2be8720000000010007556");
    expect(result.userId).toBe("5d2be8720000000010007556");
    expect(result.nickname).toBe("测试用户");
    expect(result.redId).toBe("12345678");
    expect(result.avatarUrl).toBe("https://img.example.com/avatar.jpg");
    expect(result.desc).toBe("这是描述");
    expect(result.ipLocation).toBe("上海");
    expect(result.gender).toBe("1");
    expect(result.interactionCounts?.follows).toBe(100);
    expect(result.interactionCounts?.fans).toBe(12000);
    expect(result.interactionCounts?.likesAndCollects).toBe(34000);
  });

  test("handles missing fields gracefully", () => {
    const raw = { userPageData: {} };
    const result = normalizeProfileState(raw, "abc123");
    expect(result.userId).toBe("abc123");
    expect(result.nickname).toBe("");
    expect(result.interactionCounts?.follows).toBeUndefined();
  });

  test("handles snake_case red_id", () => {
    const raw = {
      userPageData: {
        basicInfo: {
          red_id: "snake_case_id",
          ip_location: "北京",
        },
      },
    };
    const result = normalizeProfileState(raw, "abc123");
    expect(result.redId).toBe("snake_case_id");
    expect(result.ipLocation).toBe("北京");
  });

  test("normalizes real XHS interaction shape with type + string count + 获赞与收藏", () => {
    // This is the exact shape observed from real XHS profile API responses
    const raw = {
      userPageData: {
        basicInfo: {
          nickname: "真实用户",
          userid: "abc123def456abc123def456",
          imageb: "https://sns-avatar.xhscdn.com/avatar.jpg",
          desc: "A real user",
          ipLocation: "广东",
        },
        interactions: [
          { type: "follows", name: "关注", count: "777", i18nCount: "777" },
          { type: "fans", name: "粉丝", count: "38", i18nCount: "38" },
          { type: "interaction", name: "获赞与收藏", count: "62", i18nCount: "62" },
        ],
      },
    };

    const result = normalizeProfileState(raw, "abc123def456abc123def456");
    expect(result.nickname).toBe("真实用户");
    expect(result.interactionCounts?.follows).toBe(777);
    expect(result.interactionCounts?.fans).toBe(38);
    expect(result.interactionCounts?.likesAndCollects).toBe(62);
  });

  test("falls back to name matching when type field is absent", () => {
    const raw = {
      userPageData: {
        interactions: [
          { name: "关注", count: 10 },
          { name: "粉丝", count: 20 },
          { name: "赞藏", count: 30 },
        ],
      },
    };
    const result = normalizeProfileState(raw, "abc");
    expect(result.interactionCounts?.follows).toBe(10);
    expect(result.interactionCounts?.fans).toBe(20);
    expect(result.interactionCounts?.likesAndCollects).toBe(30);
  });

  test("handles interaction count as number (not string)", () => {
    const raw = {
      userPageData: {
        interactions: [
          { type: "follows", name: "关注", count: 100 },
          { type: "fans", name: "粉丝", count: 200 },
          { type: "interaction", name: "获赞与收藏", count: 300 },
        ],
      },
    };
    const result = normalizeProfileState(raw, "abc");
    expect(result.interactionCounts?.follows).toBe(100);
    expect(result.interactionCounts?.fans).toBe(200);
    expect(result.interactionCounts?.likesAndCollects).toBe(300);
  });
});

describe("normalizeProfileNote", () => {
  test("normalizes camelCase note", () => {
    const raw = {
      noteId: "693e1c35000000000d00cf94",
      displayTitle: "Test Title",
      cover: { url: "https://img.example.com/cover.jpg" },
      type: "normal",
      likedCount: 42,
      xsecToken: "secret_token",
    };

    const result = normalizeProfileNote(raw);
    expect(result.noteId).toBe("693e1c35000000000d00cf94");
    expect(result.title).toBe("Test Title");
    expect(result.coverUrl).toBe("https://img.example.com/cover.jpg");
    expect(result.type).toBe("normal");
    expect(result.likedCount).toBe(42);
    // xsecToken should be preserved internally
    expect(result.xsecToken).toBe("secret_token");
  });

  test("normalizes snake_case note", () => {
    const raw = {
      note_id: "abc123def456abc123def456",
      title: "Snake Title",
      cover: { urlDefault: "https://img.example.com/cover2.jpg" },
      type: "video",
      liked_count: 100,
      xsec_token: "secret",
    };

    const result = normalizeProfileNote(raw);
    expect(result.noteId).toBe("abc123def456abc123def456");
    expect(result.title).toBe("Snake Title");
    expect(result.type).toBe("video");
    expect(result.likedCount).toBe(100);
    expect(result.xsecToken).toBe("secret");
  });

  test("handles string likedCount", () => {
    const raw = { noteId: "abc", likedCount: "999" };
    const result = normalizeProfileNote(raw);
    expect(result.likedCount).toBe(999);
  });

  test("reads likedCount from interactInfo (camelCase)", () => {
    const raw = {
      noteId: "abc",
      displayTitle: "Test",
      interactInfo: { likedCount: 42 },
    };
    const result = normalizeProfileNote(raw);
    expect(result.likedCount).toBe(42);
  });

  test("reads liked_count from interact_info (snake_case)", () => {
    const raw = {
      note_id: "abc123def456abc123def456",
      display_title: "Snake Detail",
      interact_info: { liked_count: 88 },
      xsec_token: "per_note_token",
      cover: { url_default: "https://img.example.com/default.jpg" },
    };
    const result = normalizeProfileNote(raw);
    expect(result.noteId).toBe("abc123def456abc123def456");
    expect(result.title).toBe("Snake Detail");
    expect(result.likedCount).toBe(88);
    expect(result.xsecToken).toBe("per_note_token");
    expect(result.coverUrl).toBe("https://img.example.com/default.jpg");
  });

  test("reads note fields from nested noteCard", () => {
    const raw = {
      noteCard: {
        noteId: "nested-note-1",
        displayTitle: "Nested Card",
        type: "video",
        xsecToken: "nested-token",
        cover: { urlDefault: "https://img.example.com/nested.jpg" },
        interactInfo: { likedCount: 77 },
      },
    };
    const result = normalizeProfileNote(raw);
    expect(result.noteId).toBe("nested-note-1");
    expect(result.title).toBe("Nested Card");
    expect(result.type).toBe("video");
    expect(result.xsecToken).toBe("nested-token");
    expect(result.likedCount).toBe(77);
    expect(result.coverUrl).toBe("https://img.example.com/nested.jpg");
  });

  test("prefers top-level likedCount over nested interactInfo", () => {
    const raw = {
      noteId: "abc",
      likedCount: 100,
      interactInfo: { likedCount: 42 },
    };
    const result = normalizeProfileNote(raw);
    expect(result.likedCount).toBe(100);
  });
});

describe("normalizeNoteDetail", () => {
  test("normalizes feed API response", () => {
    const raw = {
      note: {
        noteId: "693e1c35000000000d00cf94",
        noteCard: {
          title: "Note Title",
          desc: "Note description",
          type: "normal",
          user: {
            userId: "user123",
            nickname: "Author",
          },
          interactInfo: {
            likedCount: 1000,
            collectedCount: 500,
            commentCount: 200,
            shareCount: 100,
          },
          imageList: [
            { urlDefault: "https://img.example.com/1.jpg" },
            { urlDefault: "https://img.example.com/2.jpg" },
          ],
          tagList: [{ name: "旅行" }, { name: "攻略" }],
          ipLocation: "广东",
        },
      },
    };

    const result = normalizeNoteDetail(raw);
    expect(result.noteId).toBe("693e1c35000000000d00cf94");
    expect(result.title).toBe("Note Title");
    expect(result.desc).toBe("Note description");
    expect(result.type).toBe("normal");
    expect(result.userId).toBe("user123");
    expect(result.nickname).toBe("Author");
    expect(result.metrics.likedCount).toBe(1000);
    expect(result.metrics.collectedCount).toBe(500);
    expect(result.metrics.commentCount).toBe(200);
    expect(result.metrics.shareCount).toBe(100);
    expect(result.imageUrls).toHaveLength(2);
    expect(result.tagList).toEqual(["旅行", "攻略"]);
    expect(result.ipLocation).toBe("广东");
  });

  test("normalizes snake_case API response", () => {
    const raw = {
      note: {
        noteId: "abc123",
        noteCard: {
          title: "Title",
          desc: "Desc",
          type: "video",
          user: {
            user_id: "uid",
            nickname: "Nick",
          },
          interactInfo: {
            liked_count: 50,
            collected_count: 30,
            comment_count: 10,
            share_count: 5,
          },
          imageList: [],
        },
      },
    };

    const result = normalizeNoteDetail(raw);
    expect(result.type).toBe("video");
    expect(result.userId).toBe("uid");
    expect(result.metrics.likedCount).toBe(50);
  });

  test("normalizes real XHS detail item shape with note_card + interact_info", () => {
    // This is the exact shape observed from the real /api/sns/web/v1/feed response:
    // { id: '...', note_card: { title, desc, type, user, interact_info, image_list, ... }, model_type: '...' }
    const raw = {
      id: "n1",
      note_card: {
        title: "T",
        desc: "D",
        type: "normal",
        user: { user_id: "u", nickname: "N" },
        interact_info: {
          liked_count: "9",
          comment_count: "8",
          collected_count: "7",
          share_count: "6",
        },
        image_list: [
          { url_default: "https://img.xhs.com/1.jpg" },
          { url_default: "https://img.xhs.com/2.jpg" },
        ],
        tag_list: [{ name: "旅行" }, { name: "美食" }],
        ip_location: "上海",
      },
      model_type: "note",
    };

    const result = normalizeNoteDetail(raw);
    expect(result.noteId).toBe("n1");
    expect(result.title).toBe("T");
    expect(result.desc).toBe("D");
    expect(result.type).toBe("normal");
    expect(result.userId).toBe("u");
    expect(result.nickname).toBe("N");
    expect(result.metrics.likedCount).toBe(9);
    expect(result.metrics.commentCount).toBe(8);
    expect(result.metrics.collectedCount).toBe(7);
    expect(result.metrics.shareCount).toBe(6);
    expect(result.imageUrls).toEqual([
      "https://img.xhs.com/1.jpg",
      "https://img.xhs.com/2.jpg",
    ]);
    expect(result.tagList).toEqual(["旅行", "美食"]);
    expect(result.ipLocation).toBe("上海");
  });

  test("normalizes note detail from items[0] in feed response", () => {
    // Simulates what the orchestrator passes after extracting items[0]
    const raw = {
      note: {
        noteId: "feed_item_1",
        note_card: {
          title: "Feed Item Title",
          desc: "Feed Description",
          type: "video",
          user: { user_id: "feed_user", nickname: "FeedAuthor" },
          interact_info: {
            liked_count: 500,
            collected_count: 200,
            comment_count: 100,
            shared_count: 50,
          },
          image_list: [],
          video: {
            media: {
              stream: {
                h264: [{ masterUrl: "https://video.xhs.com/master.mp4" }],
              },
            },
          },
        },
      },
    };

    const result = normalizeNoteDetail(raw);
    expect(result.noteId).toBe("feed_item_1");
    expect(result.title).toBe("Feed Item Title");
    expect(result.type).toBe("video");
    expect(result.userId).toBe("feed_user");
    expect(result.metrics.likedCount).toBe(500);
    expect(result.metrics.shareCount).toBe(50);
    expect(result.videoUrl).toBe("https://video.xhs.com/master.mp4");
  });
});

describe("normalizeComment", () => {
  test("normalizes a comment", () => {
    const raw = {
      id: "comment123",
      user: {
        user_id: "user456",
        nickname: "Commenter",
        image: "https://img.example.com/avatar.jpg",
      },
      content: "Great post!",
      like_count: 42,
      sub_comment_count: 3,
      ip_location: "浙江",
      create_time: 1700000000,
    };

    const result = normalizeComment(raw);
    expect(result.commentId).toBe("comment123");
    expect(result.userId).toBe("user456");
    expect(result.nickname).toBe("Commenter");
    expect(result.content).toBe("Great post!");
    expect(result.likeCount).toBe(42);
    expect(result.subCommentCount).toBe(3);
    expect(result.ipLocation).toBe("浙江");
  });

  test("normalizes nested sub-comments", () => {
    const raw = {
      id: "top1",
      user: { user_id: "u1", nickname: "User1" },
      content: "Top comment",
      like_count: 10,
      sub_comment_count: 1,
      sub_comments: [
        {
          id: "sub1",
          user: { user_id: "u2", nickname: "User2" },
          content: "Reply",
          like_count: 2,
          sub_comment_count: 0,
        },
      ],
    };

    const result = normalizeComment(raw);
    expect(result.subComments).toHaveLength(1);
    expect(result.subComments![0].commentId).toBe("sub1");
    expect(result.subComments![0].content).toBe("Reply");
  });
});

describe("normalizeCommentPage", () => {
  test("normalizes a comment page response", () => {
    const raw = {
      data: {
        comments: [
          {
            id: "c1",
            user: { user_id: "u1", nickname: "User1" },
            content: "Comment 1",
            like_count: 5,
            sub_comment_count: 0,
          },
          {
            id: "c2",
            user: { user_id: "u2", nickname: "User2" },
            content: "Comment 2",
            like_count: 3,
            sub_comment_count: 2,
          },
        ],
        has_more: true,
        cursor: "next_cursor_abc",
      },
    };

    const result = normalizeCommentPage(raw);
    expect(result.comments).toHaveLength(2);
    expect(result.comments[0].commentId).toBe("c1");
    expect(result.hasMore).toBe(true);
    expect(result.cursor).toBe("next_cursor_abc");
  });

  test("handles missing data wrapper", () => {
    const raw = {
      comments: [],
      has_more: false,
    };
    const result = normalizeCommentPage(raw);
    expect(result.comments).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });
});
