import { describe, expect, test } from "bun:test";
import { isInternalHostname } from "./internalHostname";

/** Mirrors how callers get a hostname: parse the URL, take `.hostname`. */
const hostOf = (url: string) => new URL(url).hostname;

describe("isInternalHostname", () => {
  test("IPv4 loopback, private, link-local and unspecified", () => {
    for (const url of [
      "http://127.0.0.1/",
      "http://127.1.2.3:8080/",
      "http://10.0.0.5/",
      "http://172.16.0.1/",
      "http://172.31.255.254/",
      "http://192.168.1.5/",
      "http://169.254.169.254/",
      "http://0.0.0.0/",
      "http://localhost:13882/",
    ]) {
      expect(isInternalHostname(hostOf(url))).toBe(true);
    }
  });

  test("bracketed IPv6 — the form URL.hostname actually produces", () => {
    // Regression: the previous regex tested for a bare `::1`, but WHATWG
    // URL.hostname always keeps the brackets, so the branch was dead code and
    // http://[::1]:6379/ reached the server's fetch.
    expect(hostOf("http://[::1]:6379/")).toBe("[::1]");
    expect(isInternalHostname(hostOf("http://[::1]:6379/"))).toBe(true);
    expect(isInternalHostname(hostOf("http://[fc00::1]/"))).toBe(true);
    expect(isInternalHostname(hostOf("http://[fd12:3456::1]/"))).toBe(true);
    expect(isInternalHostname(hostOf("http://[fe80::1]/"))).toBe(true);
  });

  test("IPv4-mapped IPv6 in both dotted and normalized hex form", () => {
    // Bun normalizes ::ffff:127.0.0.1 to ::ffff:7f00:1, so matching the dotted
    // spelling alone is not enough.
    expect(isInternalHostname(hostOf("http://[::ffff:127.0.0.1]/"))).toBe(true);
    expect(isInternalHostname("::ffff:127.0.0.1")).toBe(true);
    expect(isInternalHostname("::ffff:7f00:1")).toBe(true);
    expect(isInternalHostname("::ffff:c0a8:105")).toBe(true); // 192.168.1.5
    expect(isInternalHostname("::ffff:a9fe:a9fe")).toBe(true); // 169.254.169.254
  });

  test("bare-decimal IPv4", () => {
    expect(isInternalHostname("2130706433")).toBe(true); // 127.0.0.1
    expect(isInternalHostname("3232235781")).toBe(true); // 192.168.1.5
    expect(isInternalHostname("134744072")).toBe(false); // 8.8.8.8
  });

  test("trailing dot and case do not bypass", () => {
    expect(isInternalHostname("LOCALHOST")).toBe(true);
    expect(isInternalHostname("localhost.")).toBe(true);
    expect(isInternalHostname("[::1]")).toBe(true);
  });

  test("public hostnames stay external", () => {
    for (const host of [
      "example.com",
      "nolo.chat",
      "8.8.8.8",
      "172.32.0.1", // just outside 172.16/12
      "172.15.0.1", // just below 172.16/12
      "11.0.0.1",
      "192.169.1.1",
      "2001:4860:4860::8888",
    ]) {
      expect(isInternalHostname(host)).toBe(false);
    }
  });

  test("public IPv4-mapped IPv6 stays external", () => {
    // Regression: an unanchored `^::` branch matched every `::ffff:*`, so
    // 8.8.8.8 mapped into IPv6 read as internal and the server refused it.
    expect(isInternalHostname(hostOf("http://[::ffff:8.8.8.8]/"))).toBe(false);
    expect(isInternalHostname(hostOf("http://[::ffff:1.1.1.1]/"))).toBe(false);
    expect(isInternalHostname("::ffff:ffff:ffff")).toBe(false);
    // …while the mapped-internal cases still resolve through the mapped logic.
    expect(isInternalHostname("::ffff:7f00:1")).toBe(true);
  });

  test("loopback and unspecified match whole, including expanded form", () => {
    expect(isInternalHostname("::1")).toBe(true);
    expect(isInternalHostname("::")).toBe(true);
    expect(isInternalHostname("0:0:0:0:0:0:0:1")).toBe(true);
  });

  test("all of 0.0.0.0/8 is internal, not just the literal 0.0.0.0", () => {
    // Inherited from the old server regex, which matched only the literal.
    expect(isInternalHostname("0.0.0.1")).toBe(true);
    expect(isInternalHostname("0.255.255.255")).toBe(true);
  });

  test("empty hostname is treated as internal (fail closed)", () => {
    expect(isInternalHostname("")).toBe(true);
    expect(isInternalHostname("   ")).toBe(true);
  });
});
