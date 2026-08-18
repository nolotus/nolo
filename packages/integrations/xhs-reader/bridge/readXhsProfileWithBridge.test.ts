import { describe, expect, test } from "bun:test";
import {
  isXhsLoginCookieName,
  readXhsProfileWithBridge,
  resolveXhsAnonymousUserDataDir,
  resolveXhsDesktopBrowserChannel,
  resolveXhsBridgeProfileUrl,
  sanitizeXhsBridgeOptions,
} from "./readXhsProfileWithBridge";

describe("resolveXhsBridgeProfileUrl", () => {
  test("returns profileUrl when provided", () => {
    expect(
      resolveXhsBridgeProfileUrl({ profileUrl: "https://xhs.com/user/profile/abc" }),
    ).toBe("https://xhs.com/user/profile/abc");
  });

  test("returns url alias when profileUrl is absent", () => {
    expect(
      resolveXhsBridgeProfileUrl({ url: "https://xhs.com/user/profile/def" }),
    ).toBe("https://xhs.com/user/profile/def");
  });

  test("preserves pasted pc_feed profile URL query for anonymous navigation", () => {
    const pastedUrl =
      "https://www.xiaohongshu.com/user/profile/5b587d1de8ac2b7572f0d9b0?xsec_token=secret-profile-token&xsec_source=pc_feed";

    expect(resolveXhsBridgeProfileUrl({ url: pastedUrl })).toBe(pastedUrl);
  });

  test("prefers profileUrl over url when both provided", () => {
    expect(
      resolveXhsBridgeProfileUrl({
        profileUrl: "https://xhs.com/user/profile/priority",
        url: "https://xhs.com/user/profile/ignored",
      }),
    ).toBe("https://xhs.com/user/profile/priority");
  });

  test("returns undefined when neither provided", () => {
    expect(resolveXhsBridgeProfileUrl({})).toBeUndefined();
  });
});

describe("resolveXhsDesktopBrowserChannel", () => {
  test("defaults stable desktop channel to Chrome", () => {
    expect(resolveXhsDesktopBrowserChannel(undefined)).toBe("chrome");
    expect(resolveXhsDesktopBrowserChannel("stable")).toBe("chrome");
    expect(resolveXhsDesktopBrowserChannel("google-chrome")).toBe("chrome");
  });

  test("allows bundled Chromium fallback channel", () => {
    expect(resolveXhsDesktopBrowserChannel("chromium")).toBeUndefined();
    expect(resolveXhsDesktopBrowserChannel("bundled")).toBeUndefined();
  });
});

describe("resolveXhsAnonymousUserDataDir", () => {
  test("uses a tool-owned anonymous visitor directory, not a caller-supplied profile", () => {
    const dir = resolveXhsAnonymousUserDataDir("/tmp/nolo-home");

    expect(dir).toBe("/tmp/nolo-home/xhs-anonymous-visitor");
  });
});

describe("isXhsLoginCookieName", () => {
  test("treats auth session cookies as login state but allows anonymous visitor ids", () => {
    expect(isXhsLoginCookieName("web_session")).toBe(true);
    expect(isXhsLoginCookieName("access_token")).toBe(true);
    expect(isXhsLoginCookieName("gid")).toBe(false);
    expect(isXhsLoginCookieName("customerClientId")).toBe(false);
    expect(isXhsLoginCookieName("a1")).toBe(false);
    expect(isXhsLoginCookieName("webId")).toBe(false);
  });
});

describe("readXhsProfileWithBridge — early parse_error", () => {
  test("returns parse_error when neither url nor profileUrl provided", async () => {
    const result = await readXhsProfileWithBridge({} as any);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("parse_error");
      expect(result.message).toContain("profile URL");
    }
  });
});

describe("sanitizeXhsBridgeOptions", () => {
  test("hard clamps unsafe direct bridge options", () => {
    const result = sanitizeXhsBridgeOptions({
      url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      extendedCollectionConsent: true,
      maxScrollPages: 999,
      includeComments: true,
      maxCommentPagesPerNote: 99,
      minLikesForDetail: 1,
      minCommentsForCollect: 1,
      profileDir: "/tmp/should-be-ignored",
      anonymousSessionMode: "user_profile",
      accessPattern: "stealth_deep_link",
      assistedAction: ["read", "comments"].join("_") as any,
      maxAssistedSteps: 99,
      headless: Boolean("unsafe"),
      keepOpen: true,
    } as any);

    expect(result).toMatchObject({
      anonymousSessionMode: "persistent",
      accessPattern: "homepage_warmup_then_profile",
      maxScrollPages: 0,
      includeComments: false,
      maxCommentPagesPerNote: 1,
      minLikesForDetail: undefined,
      minCommentsForCollect: undefined,
      assistedAction: "snapshot",
      maxAssistedSteps: 1,
      headless: false,
    });
    expect("profileDir" in result).toBe(false);
    expect("keepOpen" in result).toBe(false);
  });

  test("allows explicit direct profile access for differential matrix probes", () => {
    const result = sanitizeXhsBridgeOptions({
      url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      accessPattern: "direct_profile",
      anonymousSessionMode: "ephemeral",
    });

    expect(result.accessPattern).toBe("direct_profile");
    expect(result.anonymousSessionMode).toBe("ephemeral");
  });

  test("allows one visible scroll only for explicit read_more_notes consent", () => {
    const result = sanitizeXhsBridgeOptions({
      url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      extendedCollectionConsent: true,
      collectionMode: "assisted",
      assistedAction: "read_more_notes",
      maxScrollPages: 10,
      maxAssistedSteps: 10,
    });

    expect(result.maxScrollPages).toBe(1);
    expect(result.maxAssistedSteps).toBe(1);
    expect(result.includeComments).toBe(false);
  });

  test("allows visible detail/comment collection only for explicit read_visible_details consent", () => {
    const result = sanitizeXhsBridgeOptions({
      url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      extendedCollectionConsent: true,
      collectionMode: "assisted",
      assistedAction: "read_visible_details",
      maxScrollPages: 10,
      includeComments: false,
      maxCommentPagesPerNote: 99,
    });

    expect(result.maxScrollPages).toBe(0);
    expect(result.enrichDetails).toBe(true);
    expect(result.includeComments).toBe(true);
    expect(result.maxCommentPagesPerNote).toBe(3);
    expect(result.assistedAction).toBe("read_visible_details");
  });

  test("allows indexed public-note discovery only for explicit discover_indexed_notes consent", () => {
    const result = sanitizeXhsBridgeOptions({
      url: "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
      extendedCollectionConsent: true,
      collectionMode: "assisted",
      assistedAction: "discover_indexed_notes",
      maxScrollPages: 10,
      includeComments: false,
      maxCommentPagesPerNote: 99,
      indexedNoteUrls: [
        "https://www.xiaohongshu.com/explore/aaaaaaaaaaaaaaaaaaaaaaaa",
        "https://www.xiaohongshu.com/explore/bbbbbbbbbbbbbbbbbbbbbbbb",
        "https://www.xiaohongshu.com/discovery/item/cccccccccccccccccccccccc",
        "https://www.xiaohongshu.com/explore/dddddddddddddddddddddddd",
      ],
    });

    expect(result.maxScrollPages).toBe(0);
    expect(result.enrichDetails).toBe(true);
    expect(result.includeComments).toBe(true);
    expect(result.maxCommentPagesPerNote).toBe(3);
    expect(result.assistedAction).toBe("discover_indexed_notes");
    expect(result.indexedNoteUrls).toEqual([
      "https://www.xiaohongshu.com/explore/aaaaaaaaaaaaaaaaaaaaaaaa",
      "https://www.xiaohongshu.com/explore/bbbbbbbbbbbbbbbbbbbbbbbb",
      "https://www.xiaohongshu.com/discovery/item/cccccccccccccccccccccccc",
    ]);
  });
});
