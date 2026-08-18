import { describe, expect, it } from "bun:test";
import { isFsNotFoundError } from "./fsNotFoundError";

describe("isFsNotFoundError pure seam", () => {
  it("rejects non-objects and unrelated errors", () => {
    expect(isFsNotFoundError(undefined)).toBe(false);
    expect(isFsNotFoundError(null)).toBe(false);
    expect(isFsNotFoundError("ENOENT")).toBe(false);
    expect(isFsNotFoundError(new Error("permission denied"))).toBe(false);
    expect(isFsNotFoundError({ code: "EACCES" })).toBe(false);
    expect(isFsNotFoundError({})).toBe(false);
  });

  it("detects ENOENT on code, errno, or name", () => {
    expect(isFsNotFoundError({ code: "ENOENT" })).toBe(true);
    expect(isFsNotFoundError({ errno: "ENOENT" })).toBe(true);
    expect(isFsNotFoundError({ name: "ENOENT" })).toBe(true);
  });

  it("detects missing-path message shapes", () => {
    expect(isFsNotFoundError({ message: "ENOENT: no such file or directory" })).toBe(
      true
    );
    expect(isFsNotFoundError(new Error("no such file or directory"))).toBe(true);
    expect(isFsNotFoundError({ message: "path does not exist" })).toBe(true);
  });
});
