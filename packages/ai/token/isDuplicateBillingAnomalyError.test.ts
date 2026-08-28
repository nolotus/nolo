import { describe, expect, it } from "bun:test";
import {
  isAlreadyExistsRecordError,
  isDuplicateBillingAnomalyError,
} from "./isDuplicateBillingAnomalyError";

describe("isDuplicateBillingAnomalyError pure seam", () => {
  it("returns false for non-Error values", () => {
    expect(isDuplicateBillingAnomalyError(undefined)).toBe(false);
    expect(isDuplicateBillingAnomalyError(null)).toBe(false);
    expect(isDuplicateBillingAnomalyError("billing anomaly already exists: k")).toBe(
      false,
    );
    expect(
      isDuplicateBillingAnomalyError({
        message: "billing anomaly already exists: k",
      }),
    ).toBe(false);
  });

  it("detects billing-anomaly duplicate writer errors", () => {
    expect(
      isDuplicateBillingAnomalyError(
        new Error("billing anomaly already exists: billing-anomaly-anom_01"),
      ),
    ).toBe(true);
  });

  it("rejects other already-exists kinds and unrelated errors", () => {
    expect(
      isDuplicateBillingAnomalyError(
        new Error("provider reconciliation bucket already exists: recon_1"),
      ),
    ).toBe(false);
    expect(
      isDuplicateBillingAnomalyError(new Error("billing anomaly missing")),
    ).toBe(false);
    expect(isDuplicateBillingAnomalyError(new Error("EIO"))).toBe(false);
  });
});

describe("isAlreadyExistsRecordError pure seam", () => {
  it("returns false for non-Error values", () => {
    expect(isAlreadyExistsRecordError(undefined)).toBe(false);
    expect(isAlreadyExistsRecordError(null)).toBe(false);
    expect(isAlreadyExistsRecordError("already exists: k")).toBe(false);
    expect(isAlreadyExistsRecordError({ message: "already exists: k" })).toBe(
      false,
    );
  });

  it("detects shared writer already-exists suffix across kinds", () => {
    expect(
      isAlreadyExistsRecordError(
        new Error("billing anomaly already exists: billing-anomaly-anom_01"),
      ),
    ).toBe(true);
    expect(
      isAlreadyExistsRecordError(
        new Error("provider reconciliation bucket already exists: recon_1"),
      ),
    ).toBe(true);
  });

  it("rejects messages without the shared suffix", () => {
    expect(
      isAlreadyExistsRecordError(new Error("billing anomaly already exists")),
    ).toBe(false);
    expect(isAlreadyExistsRecordError(new Error("already exists"))).toBe(false);
    expect(isAlreadyExistsRecordError(new Error("EIO"))).toBe(false);
  });
});
