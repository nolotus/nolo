import { describe, expect, it } from "bun:test";
import { summarizeEndpoint } from "./summarizeEndpoint";

describe("summarizeEndpoint pure seam", () => {
  it("returns undefined for missing, blank, or non-string values", () => {
    expect(summarizeEndpoint(null)).toBeUndefined();
    expect(summarizeEndpoint(undefined)).toBeUndefined();
    expect(summarizeEndpoint("")).toBeUndefined();
    expect(summarizeEndpoint("   ")).toBeUndefined();
    expect(summarizeEndpoint(42)).toBeUndefined();
    expect(summarizeEndpoint({ href: "https://example.com" })).toBeUndefined();
  });

  it("keeps protocol, host, and pathname only", () => {
    expect(summarizeEndpoint("https://api.example.com/v1/chat")).toBe(
      "https://api.example.com/v1/chat",
    );
    expect(
      summarizeEndpoint("https://user:pass@api.example.com:8443/v1?key=secret#frag"),
    ).toBe("https://api.example.com:8443/v1");
    expect(summarizeEndpoint("  http://127.0.0.1:38123/rpc  ")).toBe(
      "http://127.0.0.1:38123/rpc",
    );
  });

  it("maps unparseable strings to invalid-url", () => {
    expect(summarizeEndpoint("not a url")).toBe("invalid-url");
    expect(summarizeEndpoint("://missing-scheme")).toBe("invalid-url");
  });
});
