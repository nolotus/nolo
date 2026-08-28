import { describe, expect, it } from "bun:test";
import { isStoreUnavailableError } from "./storeUnavailableError";

describe("isStoreUnavailableError", () => {
  it("treats LevelDB lifecycle errors as unavailable", () => {
    expect(
      isStoreUnavailableError({ code: "LEVEL_DATABASE_NOT_OPEN" })
    ).toBe(true);
    expect(isStoreUnavailableError({ code: "LEVEL_ITERATOR_NOT_OPEN" })).toBe(
      true
    );
  });

  it("treats lock contention as unavailable", () => {
    expect(isStoreUnavailableError({ code: "LEVEL_LOCKED" })).toBe(true);
    expect(
      isStoreUnavailableError(
        new Error("IO error: lock LOCK: Resource temporarily unavailable")
      )
    ).toBe(true);
  });

  it("treats the blue-green shutdown marker as unavailable", () => {
    expect(isStoreUnavailableError({ code: "SERVER_DB_SHUTTING_DOWN" })).toBe(
      true
    );
  });

  it("walks cause and AggregateError chains", () => {
    const wrapped = new Error("store read failed", {
      cause: { code: "LEVEL_DATABASE_NOT_OPEN" },
    });
    expect(isStoreUnavailableError(wrapped)).toBe(true);
    expect(
      isStoreUnavailableError(
        new AggregateError([new Error("nope"), { code: "LEVEL_LOCKED" }])
      )
    ).toBe(true);
  });

  it("does not classify business failures as unavailable", () => {
    expect(isStoreUnavailableError({ code: "LEVEL_NOT_FOUND" })).toBe(false);
    expect(isStoreUnavailableError(new Error("NotFound"))).toBe(false);
    expect(isStoreUnavailableError(null)).toBe(false);
  });
});
