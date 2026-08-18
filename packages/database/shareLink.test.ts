import { describe, expect, it } from "bun:test";
import {
  createWebSharePath,
  createShareLink,
  getShareDbKeyFromInput,
  isShareImportInput,
} from "share/link";

describe("shareLink helpers", () => {
  it("createShareLink should prefix token with share scheme", () => {
    expect(createShareLink("abc123")).toBe("share:abc123");
  });

  it("createWebSharePath should create url-safe web path", () => {
    expect(createWebSharePath("abc123")).toBe("/share/abc123");
    expect(createWebSharePath("a b/c")).toBe("/share/a%20b%2Fc");
  });

  it("getShareDbKeyFromInput should convert share link to db key", () => {
    expect(getShareDbKeyFromInput("share:abc123")).toBe("share-abc123");
    expect(getShareDbKeyFromInput("  share:abc123  ")).toBe("share-abc123");
  });

  it("getShareDbKeyFromInput should pass through existing share db key", () => {
    expect(getShareDbKeyFromInput("share-abc123")).toBe("share-abc123");
  });

  it("getShareDbKeyFromInput should return empty string for invalid value", () => {
    expect(getShareDbKeyFromInput("")).toBe("");
    expect(getShareDbKeyFromInput("share:")).toBe("");
    expect(getShareDbKeyFromInput("share abc123")).toBe("");
  });

  it("isShareImportInput should only match share link formats", () => {
    expect(isShareImportInput("share:abc123")).toBe(true);
    expect(isShareImportInput("share-abc123")).toBe(true);
    expect(isShareImportInput("share abc123")).toBe(false);
    expect(isShareImportInput("/share hello")).toBe(false);
  });
});
