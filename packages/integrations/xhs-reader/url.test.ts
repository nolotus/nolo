import { describe, expect, test } from "bun:test";
import {
  parseXhsProfileUrl,
  parseXhsNoteUrl,
  isValidXhsId,
} from "./url";

describe("parseXhsProfileUrl", () => {
  test("parses full HTTPS profile URL", () => {
    const result = parseXhsProfileUrl(
      "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
    );
    expect(result.userId).toBe("5d2be8720000000010007556");
    expect(result.canonicalUrl).toBe(
      "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
    );
  });

  test("parses URL with query params", () => {
    const result = parseXhsProfileUrl(
      "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556?xsec_token=abc123&xsec_source=pc_user",
    );
    expect(result.userId).toBe("5d2be8720000000010007556");
    expect(result.canonicalUrl).toBe(
      "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556",
    );
    expect(result.xsecToken).toBe("abc123");
    expect(result.xsecSource).toBe("pc_user");
    expect(result.navigationUrl).toBe(
      "https://www.xiaohongshu.com/user/profile/5d2be8720000000010007556?xsec_token=abc123&xsec_source=pc_user",
    );
    expect(result.canonicalUrl).not.toContain("xsec_token");
  });

  test("parses URL without www prefix", () => {
    const result = parseXhsProfileUrl(
      "https://xiaohongshu.com/user/profile/5d2be8720000000010007556",
    );
    expect(result.userId).toBe("5d2be8720000000010007556");
  });

  test("parses path-only input", () => {
    const result = parseXhsProfileUrl(
      "/user/profile/5d2be8720000000010007556",
    );
    expect(result.userId).toBe("5d2be8720000000010007556");
  });

  test("throws on invalid URL", () => {
    expect(() => parseXhsProfileUrl("https://google.com")).toThrow(
      "Invalid XHS profile URL",
    );
  });

  test("throws on URL with invalid userId format", () => {
    expect(() =>
      parseXhsProfileUrl(
        "https://www.xiaohongshu.com/user/profile/short",
      ),
    ).toThrow("Invalid XHS profile URL");
  });
});

describe("parseXhsNoteUrl", () => {
  test("parses explore URL", () => {
    const result = parseXhsNoteUrl(
      "https://www.xiaohongshu.com/explore/693e1c35000000000d00cf94",
    );
    expect(result.noteId).toBe("693e1c35000000000d00cf94");
    expect(result.canonicalUrl).toBe(
      "https://www.xiaohongshu.com/explore/693e1c35000000000d00cf94",
    );
    expect(result.xsecToken).toBeUndefined();
  });

  test("parses discovery/item URL", () => {
    const result = parseXhsNoteUrl(
      "https://www.xiaohongshu.com/discovery/item/693e1c35000000000d00cf94",
    );
    expect(result.noteId).toBe("693e1c35000000000d00cf94");
  });

  test("preserves xsec_token internally", () => {
    const result = parseXhsNoteUrl(
      "https://www.xiaohongshu.com/explore/693e1c35000000000d00cf94?xsec_token=secret123&xsec_source=pc_user",
    );
    expect(result.noteId).toBe("693e1c35000000000d00cf94");
    expect(result.xsecToken).toBe("secret123");
    // The canonical URL should NOT contain xsec_token
    expect(result.canonicalUrl).not.toContain("xsec_token");
  });

  test("throws on invalid note URL", () => {
    expect(() => parseXhsNoteUrl("https://www.xiaohongshu.com/")).toThrow(
      "Invalid XHS note URL",
    );
  });
});

describe("isValidXhsId", () => {
  test("accepts valid 24-char hex", () => {
    expect(isValidXhsId("5d2be8720000000010007556")).toBe(true);
    expect(isValidXhsId("693e1c35000000000d00cf94")).toBe(true);
    expect(isValidXhsId("ABCDEF1234567890abcdef12")).toBe(true);
  });

  test("rejects invalid IDs", () => {
    expect(isValidXhsId("short")).toBe(false);
    expect(isValidXhsId("")).toBe(false);
    expect(isValidXhsId("5d2be872000000001000755g")).toBe(false); // 'g' is not hex
    expect(isValidXhsId("5d2be87200000000100075561")).toBe(false); // 25 chars
  });
});
