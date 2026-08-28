import { describe, expect, it } from "bun:test";
import {
  canonicalizeNoloServerUrl,
  isNoloChatHostname,
} from "./noloServerUrl";

describe("isNoloChatHostname pure seam", () => {
  it("matches apex and subdomains case-insensitively", () => {
    expect(isNoloChatHostname("nolo.chat")).toBe(true);
    expect(isNoloChatHostname("us.nolo.chat")).toBe(true);
    expect(isNoloChatHostname("preview-slot.us.nolo.chat")).toBe(true);
    expect(isNoloChatHostname("Nolo.Chat")).toBe(true);
    expect(isNoloChatHostname("  us.nolo.chat  ")).toBe(true);
  });

  it("rejects non-nolo hosts and lookalikes", () => {
    expect(isNoloChatHostname("example.com")).toBe(false);
    expect(isNoloChatHostname("nolo.chat.evil.example")).toBe(false);
    expect(isNoloChatHostname("notnolo.chat")).toBe(false);
    expect(isNoloChatHostname("evilnolo.chat")).toBe(false);
    expect(isNoloChatHostname("localhost")).toBe(false);
    expect(isNoloChatHostname("127.0.0.1")).toBe(false);
    expect(isNoloChatHostname("")).toBe(false);
    expect(isNoloChatHostname("   ")).toBe(false);
    expect(isNoloChatHostname(null)).toBe(false);
    expect(isNoloChatHostname(undefined)).toBe(false);
  });
});

describe("canonicalizeNoloServerUrl pure seam", () => {
  it("upgrades http nolo.chat hosts to https and strips trailing slashes", () => {
    expect(canonicalizeNoloServerUrl("http://nolo.chat")).toBe("https://nolo.chat");
    expect(canonicalizeNoloServerUrl("http://us.nolo.chat/")).toBe(
      "https://us.nolo.chat",
    );
    expect(canonicalizeNoloServerUrl("  http://nolo.chat///  ")).toBe(
      "https://nolo.chat",
    );
    expect(canonicalizeNoloServerUrl("http://APP.Nolo.Chat")).toBe(
      "https://app.nolo.chat",
    );
  });

  it("preserves already-https nolo hosts and non-nolo bases", () => {
    expect(canonicalizeNoloServerUrl("https://nolo.chat")).toBe("https://nolo.chat");
    expect(canonicalizeNoloServerUrl("https://nolo.chat/")).toBe("https://nolo.chat");
    expect(canonicalizeNoloServerUrl("http://127.0.0.1:38123")).toBe(
      "http://127.0.0.1:38123",
    );
    expect(canonicalizeNoloServerUrl("http://localhost:38123/")).toBe(
      "http://localhost:38123",
    );
    expect(canonicalizeNoloServerUrl("http://example.com")).toBe(
      "http://example.com",
    );
  });

  it("returns trimmed empty / invalid input without inventing a host", () => {
    expect(canonicalizeNoloServerUrl("")).toBe("");
    expect(canonicalizeNoloServerUrl("   ")).toBe("");
    expect(canonicalizeNoloServerUrl("not a url")).toBe("not a url");
    expect(canonicalizeNoloServerUrl("  bare-host  ")).toBe("bare-host");
  });
});
