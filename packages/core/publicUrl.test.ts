import { describe, expect, it } from "bun:test";
import { joinPublicUrl, normalizePublicUrl } from "./publicUrl";

describe("normalizePublicUrl pure seam", () => {
  it("rejects empty and non-http(s) URLs", () => {
    expect(normalizePublicUrl("")).toBe("");
    expect(normalizePublicUrl("ftp://example.com")).toBe("");
    expect(normalizePublicUrl("file:///tmp/x")).toBe("");
    expect(normalizePublicUrl("not a url")).toBe("");
    expect(normalizePublicUrl("://missing-scheme")).toBe("");
  });

  it("keeps valid http(s) absolute URLs via URL.toString()", () => {
    expect(normalizePublicUrl("https://nolo.chat")).toBe("https://nolo.chat/");
    expect(normalizePublicUrl("http://127.0.0.1:38123/app")).toBe(
      "http://127.0.0.1:38123/app",
    );
    expect(normalizePublicUrl("https://nolo.chat/path?x=1#y")).toBe(
      "https://nolo.chat/path?x=1#y",
    );
  });
});

describe("joinPublicUrl pure seam", () => {
  it("returns empty when base is empty or invalid", () => {
    expect(joinPublicUrl("", "/account")).toBe("");
    expect(joinPublicUrl("not-a-base", "/account")).toBe("");
  });

  it("joins relative paths onto a valid base URL", () => {
    expect(joinPublicUrl("https://nolo.chat", "/account")).toBe(
      "https://nolo.chat/account",
    );
    expect(joinPublicUrl("https://nolo.chat/", "settings")).toBe(
      "https://nolo.chat/settings",
    );
    expect(joinPublicUrl("https://nolo.chat/app/", "/recharge")).toBe(
      "https://nolo.chat/recharge",
    );
  });
});
