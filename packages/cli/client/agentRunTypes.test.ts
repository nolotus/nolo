import { describe, expect, test } from "bun:test";
import { resolveFileWriteGateEnabled } from "./agentRunTypes";

/**
 * NOLO_CLI_WRITE_GATE escape hatch (docs/plans/2026-08-31-write-gate-escape-hatch.md).
 * Mirrors resolveThinkingDisplayMode's contract: hidden env fallback, takes
 * effect on restart, not surfaced in --help. Fail-safe: only an explicit
 * off/0/false disables the gate — anything else (unset, garbage, "true",
 * whitespace-only) must resolve to the gate staying enabled, matching
 * today's default behavior byte-for-byte.
 */
describe("resolveFileWriteGateEnabled", () => {
  test("unset env keeps the gate enabled (default, unchanged behavior)", () => {
    expect(resolveFileWriteGateEnabled({})).toBe(true);
  });

  test("'off' disables the gate", () => {
    expect(resolveFileWriteGateEnabled({ NOLO_CLI_WRITE_GATE: "off" })).toBe(false);
  });

  test("'0' disables the gate", () => {
    expect(resolveFileWriteGateEnabled({ NOLO_CLI_WRITE_GATE: "0" })).toBe(false);
  });

  test("'false' disables the gate", () => {
    expect(resolveFileWriteGateEnabled({ NOLO_CLI_WRITE_GATE: "false" })).toBe(false);
  });

  test("is case-insensitive and trims whitespace", () => {
    expect(resolveFileWriteGateEnabled({ NOLO_CLI_WRITE_GATE: " OFF " })).toBe(false);
    expect(resolveFileWriteGateEnabled({ NOLO_CLI_WRITE_GATE: "False" })).toBe(false);
  });

  test("a garbage/unparsable value fails safe — gate stays enabled", () => {
    expect(resolveFileWriteGateEnabled({ NOLO_CLI_WRITE_GATE: "nope" })).toBe(true);
    expect(resolveFileWriteGateEnabled({ NOLO_CLI_WRITE_GATE: "1" })).toBe(true);
    expect(resolveFileWriteGateEnabled({ NOLO_CLI_WRITE_GATE: "true" })).toBe(true);
    expect(resolveFileWriteGateEnabled({ NOLO_CLI_WRITE_GATE: "" })).toBe(true);
  });
});
